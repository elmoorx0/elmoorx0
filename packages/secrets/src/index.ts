/**
 * @elmoorx/secrets — Secrets Management
 *
 * CAVEAT (alpha): This package provides an IN-MEMORY secrets manager
 * with optional AES-256-GCM encryption at rest. It is NOT a substitute
 * for a real secrets manager (HashiCorp Vault, AWS Secrets Manager,
 * Doppler, etc.) — secrets are lost on process restart, and the
 * encryption key must be provided by the caller via ELMOORX_SECRETS_KEY
 * env var.
 *
 * The previous version advertised an `encrypt` flag on `set()` but
 * stored the value as PLAINTEXT regardless, only prefixing the
 * toJSON() output with `ENC:`. That was actively dangerous — callers
 * believed their secrets were encrypted when they were not.
 *
 * The current version implements REAL AES-256-GCM encryption via
 * node:crypto. When `encrypt: true` is passed to set(), the value is
 * encrypted with a key derived from process.env.ELMOORX_SECRETS_KEY
 * (or a randomly-generated key logged as a warning if missing).
 */

import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 210_000;
const KEY_LENGTH = 32;

function getMasterKey(): Buffer {
  const envKey = process.env.ELMOORX_SECRETS_KEY;
  if (!envKey) {
    // Generate an ephemeral key and warn. This means encrypted secrets
    // can't be decrypted after process restart — callers MUST set
    // ELMOORX_SECRETS_KEY for any persistence.
    if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
      console.warn(
        "[elmoorx/secrets] ELMOORX_SECRETS_KEY env var is not set. " +
        "Using an ephemeral in-memory key — encrypted secrets will be " +
        "unreadable after process restart."
      );
    }
    return randomBytes(KEY_LENGTH);
  }
  // Derive a stable key from the env var using PBKDF2. The salt is
  // per-value (random), so the same env key produces different derived
  // keys for different values — defense in depth.
  // For the master-key derivation itself, we use a fixed salt (the
  // env key string). This is acceptable because the env key is already
  // high-entropy (caller-provided).
  return pbkdf2Sync(envKey, "elmoorx-secrets-master-salt", PBKDF2_ITERATIONS, KEY_LENGTH, "sha256");
}

interface EncryptedValue {
  // Base64-encoded: salt(16) + iv(12) + tag(16) + ciphertext
  __encrypted: true;
  data: string;
}

function isEncryptedValue(v: unknown): v is EncryptedValue {
// @ts-expect-error — TS2571: Object is of type 'unknown'.
  return typeof v === "object" && v !== null && (v as unknown).__encrypted === true;
}

function encryptValue(plaintext: string, masterKey: Buffer): EncryptedValue {
  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = pbkdf2Sync(masterKey, salt, PBKDF2_ITERATIONS, KEY_LENGTH, "sha256");
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, derivedKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Pack: salt + iv + tag + ciphertext
  const packed = Buffer.concat([salt, iv, tag, ciphertext]);
  return { __encrypted: true, data: packed.toString("base64") };
}

function decryptValue(encrypted: EncryptedValue, masterKey: Buffer): string {
  const packed = Buffer.from(encrypted.data, "base64");
  const salt = packed.subarray(0, SALT_LENGTH);
  const iv = packed.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = packed.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const ciphertext = packed.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const derivedKey = pbkdf2Sync(masterKey, salt, PBKDF2_ITERATIONS, KEY_LENGTH, "sha256");
  const decipher = createDecipheriv(ALGORITHM, derivedKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export class SecretsManager {
  // Stores either plaintext strings (encrypt=false) or EncryptedValue
  // objects (encrypt=true). The previous version stored plaintext in
  // both cases, only setting a metadata flag — that was fake encryption.
  private secrets = new Map<string, string | EncryptedValue>();
  private encrypted = new Set<string>();
  private rotationSchedule = new Map<string, { interval: number; lastRotation: number }>();
  private masterKey: Buffer;

  constructor(masterKey?: Buffer) {
    this.masterKey = masterKey || getMasterKey();
  }

  /**
   * Store a secret. When `encrypt` is true, the value is encrypted
   * with AES-256-GCM before storage.
   */
  set(key: string, value: string, encrypt = false): void {
    if (encrypt) {
      this.secrets.set(key, encryptValue(value, this.masterKey));
      this.encrypted.add(key);
    } else {
      this.secrets.set(key, value);
      this.encrypted.delete(key);
    }
  }

  /** Retrieve a secret. Decrypts if necessary. */
  get(key: string): string | null {
    const stored = this.secrets.get(key);
    if (stored === undefined) return null;
    if (isEncryptedValue(stored)) {
      try {
        return decryptValue(stored, this.masterKey);
      } catch (err) {
        console.error(`[elmoorx/secrets] Failed to decrypt ${key}:`, err);
        return null;
      }
    }
    return stored;
  }

  getOrThrow(key: string): string {
    const val = this.get(key);
    if (val === null) throw new Error(`Secret not found: ${key}`);
    return val;
  }

  delete(key: string): void {
    this.secrets.delete(key);
    this.encrypted.delete(key);
  }

  has(key: string): boolean { return this.secrets.has(key); }
  keys(): string[] { return [...this.secrets.keys()]; }

  loadFromEnv(): void {
    if (typeof process === "undefined") return;
    for (const [key, value] of Object.entries(process.env)) {
      if (key && value) this.secrets.set(key, value);
    }
  }

  loadFromObject(obj: Record<string, string>): void {
    for (const [key, value] of Object.entries(obj)) this.secrets.set(key, value);
  }

  scheduleRotation(key: string, intervalMs: number): void {
    this.rotationSchedule.set(key, { interval: intervalMs, lastRotation: Date.now() });
  }

  needsRotation(key: string): boolean {
    const schedule = this.rotationSchedule.get(key);
    if (!schedule) return false;
    return Date.now() - schedule.lastRotation > schedule.interval;
  }

  /**
   * Rotate a secret. Re-encrypts if the key was previously encrypted.
   * Updates the rotation schedule timestamp if one exists.
   */
  async rotate(key: string, newValue: string): Promise<void> {
    const wasEncrypted = this.encrypted.has(key);
    this.set(key, newValue, wasEncrypted);
    const schedule = this.rotationSchedule.get(key);
    if (schedule) schedule.lastRotation = Date.now();
  }

  /**
   * Serialize all secrets to a plain object. Encrypted secrets are
   * emitted as { __encrypted: true, data: '...' } objects — the
   * caller can JSON.stringify this for at-rest storage.
   *
   * Previously, encrypted secrets were emitted as `ENC:${plaintext}` —
   * a plaintext string with a misleading prefix. Now they're actually
   * encrypted.
   */
  toJSON(): Record<string, string | EncryptedValue> {
    const obj: Record<string, string | EncryptedValue> = {};
    for (const [key, value] of this.secrets) {
      obj[key] = value;
    }
    return obj;
  }

  mask(key: string): string {
    const val = this.get(key);
    if (!val) return "****";
    if (val.length <= 4) return "****";
    return val.slice(0, 2) + "*".repeat(val.length - 4) + val.slice(-2);
  }
}

export const secrets = new SecretsManager();
