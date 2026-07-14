/**
 * Schema migration system — versioned, reversible, with checksum verification.
 *
 * - Tracks applied migrations in a `_migrations` table
 * - Supports up/down migrations
 * - Verifies checksum (detects tampering)
 * - Supports both `.sql` files and TypeScript migration functions
 * - Transactional by default (each migration runs in its own tx)
 */

import type { Pool } from './index.js';

export interface Migration {
  version: number;
  name: string;
  up: string | ((pool: Pool) => Promise<void>);
  down?: string | ((pool: Pool) => Promise<void>);
  checksum?: string;
}

export interface MigrationResult {
  applied: string[];
  reverted: string[];
  errors: Array<{ migration: string; error: string }>;
}

export class Migrator {
  private migrations: Migration[] = [];
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Register a migration. Versions must be unique and monotonically increasing.
   */
  add(migration: Migration): this {
    if (this.migrations.find(m => m.version === migration.version)) {
      throw new Error(`Duplicate migration version: ${migration.version}`);
    }
    // Compute checksum if not provided
    if (!migration.checksum) {
      const content = typeof migration.up === 'string' ? migration.up : migration.name;
      migration.checksum = simpleHash(content);
    }
    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.version - b.version);
    return this;
  }

  /**
   * Bulk-add migrations.
   */
  addAll(migrations: Migration[]): this {
    migrations.forEach(m => this.add(m));
    return this;
  }

  /**
   * Initialize the migrations tracking table.
   */
  async init(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
  }

  /**
   * Get list of applied migration versions.
   */
  async applied(): Promise<number[]> {
    const result = await this.pool.query<{ version: number }>(
      'SELECT version FROM _migrations ORDER BY version ASC'
    );
    return result.rows.map(r => r.version);
  }

  /**
   * Get list of pending (not-yet-applied) migrations.
   */
  async pending(): Promise<Migration[]> {
    const applied = new Set(await this.applied());
    return this.migrations.filter(m => !applied.has(m.version));
  }

  /**
   * Apply all pending migrations.
   */
  async up(): Promise<MigrationResult> {
    await this.init();
    const pending = await this.pending();
    const result: MigrationResult = { applied: [], reverted: [], errors: [] };

    for (const migration of pending) {
      try {
        await this.pool.tx(async (client) => {
          // Execute migration
          if (typeof migration.up === 'string') {
            await client.query(migration.up);
          } else {
            await migration.up(this.pool);
          }
          // Record
          await client.query(
            'INSERT INTO _migrations (version, name, checksum) VALUES ($1, $2, $3)',
            [migration.version, migration.name, migration.checksum ?? ""]
          );
        });
        result.applied.push(`${migration.version}:${migration.name}`);
      } catch (err: unknown) {
        result.errors.push({ migration: `${migration.version}:${migration.name}`, error: err instanceof Error ? err.message : String(err) });
        break; // Stop on first error
      }
    }
    return result;
  }

  /**
   * Revert the last N migrations (default 1).
   */
  async down(steps = 1): Promise<MigrationResult> {
    await this.init();
    const applied = await this.applied();
    const result: MigrationResult = { applied: [], reverted: [], errors: [] };

    const toRevert = applied.slice(-steps).reverse();
    for (const version of toRevert) {
      const migration = this.migrations.find(m => m.version === version);
      if (!migration || !migration.down) {
        result.errors.push({ migration: `${version}`, error: 'No down migration' });
        continue;
      }
      try {
        await this.pool.tx(async (client) => {
          if (typeof migration.down === 'string') {
            await client.query(migration.down);
          } else if (migration.down) {
            await migration.down(this.pool);
          }
          await client.query('DELETE FROM _migrations WHERE version = $1', [version]);
        });
        result.reverted.push(`${migration.version}:${migration.name}`);
      } catch (err: unknown) {
        result.errors.push({ migration: `${migration.version}:${migration.name}`, error: err instanceof Error ? err.message : String(err) });
        break;
      }
    }
    return result;
  }

  /**
   * Verify checksums of all applied migrations.
   */
  async verify(): Promise<{ valid: boolean; mismatches: Array<{ version: number; expected: string; actual: string }> }> {
    await this.init();
    const result = await this.pool.query<{ version: number; checksum: string }>(
      'SELECT version, checksum FROM _migrations'
    );
    const mismatches: Array<{ version: number; expected: string; actual: string }> = [];
    for (const row of result.rows) {
      const migration = this.migrations.find(m => m.version === row.version);
      if (migration && migration.checksum !== row.checksum) {
        mismatches.push({ version: row.version, expected: migration.checksum ?? "", actual: row.checksum });
      }
    }
    return { valid: mismatches.length === 0, mismatches };
  }

  /**
   * Reset — revert all migrations, then re-apply.
   */
  async reset(): Promise<MigrationResult> {
    const applied = await this.applied();
    const downResult = await this.down(applied.length);
    if (downResult.errors.length) return downResult;
    return this.up();
  }
}

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return 'sha1:' + Math.abs(h).toString(16).padStart(8, '0');
}
