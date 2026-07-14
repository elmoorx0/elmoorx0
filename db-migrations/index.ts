/**
 * @elmoorx/db-migrations — Database Schema Migration System
 * ============================================
 * Version-controlled schema migrations for the JSON DB.
 *
 *   import { MigrationRunner } from "@elmoorx/db-migrations";
 *   const runner = new MigrationRunner({ dataDir: "./data" });
 *   runner.add({ id: "001", name: "create_users", up: async (db) => { ... } });
 *   await runner.runPending();
 */

export interface Migration {
  id: string;
  name: string;
  up: (db: MigrationContext) => Promise<void>;
  down?: (db: MigrationContext) => Promise<void>;
}

export interface MigrationContext {
  createCollection(name: string): Promise<void>;
  dropCollection(name: string): Promise<void>;
  insert(collection: string, record: Record<string, unknown>): Promise<void>;
  update(collection: string, id: string, updates: Record<string, unknown>): Promise<void>;
  delete(collection: string, id: string): Promise<void>;
  query(collection: string, predicate?: (record: any) => boolean): Promise<any[]>;
  exec(sql: string): Promise<unknown>;
}

export interface MigrationRecord {
  id: string;
  name: string;
  executedAt: number;
}

export class MigrationRunner {
  private migrations: Migration[] = [];
  private executed: MigrationRecord[] = [];
  private dataDir: string;

  constructor(opts: { dataDir: string }) {
    this.dataDir = opts.dataDir;
  }

  add(migration: Migration): this {
    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.id.localeCompare(b.id));
    return this;
  }

  async runPending(): Promise<{ executed: number; skipped: number }> {
    await this.loadExecuted();

    let execCount = 0;
    let skipCount = 0;

    const ctx = await this.createContext();

    for (const migration of this.migrations) {
      if (this.executed.some(r => r.id === migration.id)) {
        skipCount++;
        continue;
      }

      console.log(`  📋 Running migration: ${migration.id} — ${migration.name}`);
      await migration.up(ctx);
      await this.recordExecution(migration);
      execCount++;
      console.log(`  ✓ Migration ${migration.id} complete`);
    }

    console.log(`  Migrations: ${execCount} executed, ${skipCount} skipped`);
    return { executed: execCount, skipped: skipCount };
  }

  async rollback(steps: number = 1): Promise<{ rolledBack: number }> {
    await this.loadExecuted();

    let rolledBack = 0;
    const ctx = await this.createContext();

    const toRollback = this.executed.slice(-steps).reverse();
    for (const record of toRollback) {
      const migration = this.migrations.find(m => m.id === record.id);
      if (!migration?.down) {
        console.log(`  ⚠ No down migration for ${record.id}`);
        continue;
      }

      console.log(`  ↩ Rolling back: ${record.id}`);
      await migration.down(ctx);
      await this.removeExecution(record.id);
      rolledBack++;
    }

    return { rolledBack };
  }

  async status(): Promise<{ pending: Migration[]; executed: MigrationRecord[] }> {
    await this.loadExecuted();
    const pending = this.migrations.filter(
      m => !this.executed.some(r => r.id === m.id)
    );
    return { pending, executed: this.executed };
  }

  private async createContext(): Promise<MigrationContext> {
    const { readFile, writeFile, mkdir } = await import("node:fs/promises");
    const { existsSync } = await import("node:fs");
    const { join } = await import("node:path");

    const readCol = async (name: string): Promise<any[]> => {
      const fp = join(this.dataDir, `${name}.json`);
      if (!existsSync(fp)) return [];
      try { return JSON.parse(await readFile(fp, "utf-8")); } catch { return []; }
    };

    const writeCol = async (name: string, data: any[]): Promise<void> => {
      await writeFile(join(this.dataDir, `${name}.json`), JSON.stringify(data, null, 2));
    };

    return {
      async createCollection(name: string) {
        if (!existsSync(join(this.dataDir, `${name}.json`))) {
          await writeCol(name, []);
          console.log(`    + Created collection: ${name}`);
        }
      },
      async dropCollection(name: string) {
        const fp = join(this.dataDir, `${name}.json`);
        if (existsSync(fp)) {
          const { unlink } = await import("node:fs/promises");
          await unlink(fp);
          console.log(`    - Dropped collection: ${name}`);
        }
      },
      async insert(collection: string, record: Record<string, unknown>) {
        const data = await readCol(collection);
        data.push({ ...record, id: record.id || `${collection}_${Date.now()}`, createdAt: Date.now() });
        await writeCol(collection, data);
      },
      async update(collection: string, id: string, updates: Record<string, unknown>) {
        const data = await readCol(collection);
        const item = data.find(d => d.id === id);
        if (item) Object.assign(item, updates, { updatedAt: Date.now() });
        await writeCol(collection, data);
      },
      async delete(collection: string, id: string) {
        const data = await readCol(collection);
        await writeCol(collection, data.filter(d => d.id !== id));
      },
      async query(collection: string, predicate?: (record: any) => boolean) {
        const data = await readCol(collection);
        return predicate ? data.filter(predicate) : data;
      },
      async exec(sql: string) {
        // For SQL-compatible databases (future)
        console.log(`    SQL: ${sql}`);
      },
    };
  }

  private async loadExecuted(): Promise<void> {
    const { readFile } = await import("node:fs/promises");
    const { existsSync } = await import("node:fs");
    const { join } = await import("node:path");

    const fp = join(this.dataDir, "_migrations.json");
    if (existsSync(fp)) {
      try { this.executed = JSON.parse(await readFile(fp, "utf-8")); } catch { this.executed = []; }
    }
  }

  private async recordExecution(migration: Migration): Promise<void> {
    const { writeFile } = await import("node:fs/promises");
    const { join } = await import("node:path");

    this.executed.push({
      id: migration.id,
      name: migration.name,
      executedAt: Date.now(),
    });
    await writeFile(join(this.dataDir, "_migrations.json"), JSON.stringify(this.executed, null, 2));
  }

  private async removeExecution(id: string): Promise<void> {
    const { writeFile } = await import("node:fs/promises");
    const { join } = await import("node:path");

    this.executed = this.executed.filter(r => r.id !== id);
    await writeFile(join(this.dataDir, "_migrations.json"), JSON.stringify(this.executed, null, 2));
  }
}

// ============ BUILT-IN MIGRATIONS ============

export const builtinMigrations: Migration[] = [
  {
    id: "001",
    name: "create_users_collection",
    async up(db) {
      await db.createCollection("users");
    },
    async down(db) {
      await db.dropCollection("users");
    },
  },
  {
    id: "002",
    name: "create_emails_collection",
    async up(db) {
      await db.createCollection("emails");
    },
    async down(db) {
      await db.dropCollection("emails");
    },
  },
  {
    id: "003",
    name: "create_payments_collection",
    async up(db) {
      await db.createCollection("payments");
    },
    async down(db) {
      await db.dropCollection("payments");
    },
  },
  {
    id: "004",
    name: "create_files_collection",
    async up(db) {
      await db.createCollection("files");
    },
    async down(db) {
      await db.dropCollection("files");
    },
  },
  {
    id: "005",
    name: "create_subscriptions_collection",
    async up(db) {
      await db.createCollection("subscriptions");
    },
    async down(db) {
      await db.dropCollection("subscriptions");
    },
  },
  {
    id: "006",
    name: "create_audit_logs_collection",
    async up(db) {
      await db.createCollection("audit_logs");
    },
    async down(db) {
      await db.dropCollection("audit_logs");
    },
  },
  {
    id: "007",
    name: "add_user_fields",
    async up(db) {
      const users = await db.query("users");
      for (const user of users) {
        if (!user.oauthProvider) {
          await db.update("users", user.id, {
            oauthProvider: null,
            avatar: null,
            oauthId: null,
          });
        }
      }
    },
  },
  {
    id: "008",
    name: "create_webhooks_collection",
    async up(db) {
      await db.createCollection("webhooks");
    },
    async down(db) {
      await db.dropCollection("webhooks");
    },
  },
];
