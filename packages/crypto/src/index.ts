/**
 * @elmoorx/crypto — Encryption Utilities
 * AES-GCM, RSA-OAEP, SHA-256/384/512, HMAC, random, UUID.
 * Uses Web Crypto API — works in browser + Node 18+.
 *
 *   import { aes, rsa, hash, random } from "@elmoorx/crypto";
 *   const encrypted = await aes.encrypt("secret", key);
 *   const decrypted = await aes.decrypt(encrypted, key);
 */

// ============ AES-GCM ============

export const aes = {
  async generateKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  },

  async encrypt(data: string, key: CryptoKey): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(data);
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
    return btoa(String.fromCharCode(...iv, ...new Uint8Array(ciphertext)));
  },

  async decrypt(encrypted: string, key: CryptoKey): Promise<string> {
    const bytes = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const iv = bytes.slice(0, 12);
    const ciphertext = bytes.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return new TextDecoder().decode(decrypted);
  },

  async exportKey(key: CryptoKey): Promise<string> {
    const raw = await crypto.subtle.exportKey("raw", key);
    return btoa(String.fromCharCode(...new Uint8Array(raw)));
  },

  async importKey(rawKey: string): Promise<CryptoKey> {
    const bytes = Uint8Array.from(atob(rawKey), c => c.charCodeAt(0));
    return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
  },
};

// ============ RSA-OAEP ============

export const rsa = {
  async generateKeyPair(bits: number = 2048): Promise<CryptoKeyPair> {
    return crypto.subtle.generateKey(
      { name: "RSA-OAEP", modulusLength: bits, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
      true, ["encrypt", "decrypt"]
    );
  },

  async encrypt(data: string, publicKey: CryptoKey): Promise<string> {
    const encoded = new TextEncoder().encode(data);
    const ciphertext = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, encoded);
    return btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
  },

  async decrypt(encrypted: string, privateKey: CryptoKey): Promise<string> {
    const bytes = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const decrypted = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, bytes);
    return new TextDecoder().decode(decrypted);
  },
};

// ============ HASHING ============

export const hash = {
  async sha256(data: string): Promise<string> {
    const bytes = new TextEncoder().encode(data);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
  },

  async sha384(data: string): Promise<string> {
    const bytes = new TextEncoder().encode(data);
    const digest = await crypto.subtle.digest("SHA-384", bytes);
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
  },

  async sha512(data: string): Promise<string> {
    const bytes = new TextEncoder().encode(data);
    const digest = await crypto.subtle.digest("SHA-512", bytes);
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
  },

  /**
   * @deprecated Use {@link pbkdf2} instead. This method is retained for
   * backward compatibility but is implemented as a thin wrapper around
   * pbkdf2(). The name `bcryptLike` was misleading — it never actually
   * implemented the bcrypt algorithm. New code should call `pbkdf2()`
   * directly.
   */
  async bcryptLike(password: string, salt: string): Promise<string> {
    return hash.pbkdf2(password, salt, 210_000, 32);
  },

  /**
   * PBKDF2-SHA256 key derivation. Returns the derived bits as a hex string.
   *
   * @param password  The user's password.
   * @param salt      A per-password random salt (use {@link generateSalt}).
   * @param iterations OWASP 2023 recommends ≥ 600,000 for PBKDF2-SHA256.
   *                   Default 210,000 matches the auth package.
   * @param keyBytes  Length of the derived key in bytes (default 32).
   */
  async pbkdf2(
    password: string,
    salt: string,
    iterations: number = 210_000,
    keyBytes: number = 32
  ): Promise<string> {
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );
    const derived = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: new TextEncoder().encode(salt),
        iterations,
        hash: "SHA-256",
      },
      keyMaterial,
      keyBytes * 8
    );
    return [...new Uint8Array(derived)].map(b => b.toString(16).padStart(2, "0")).join("");
  },

  /**
   * Verify a password against a PBKDF2 hash in constant time.
   * @param password  The plaintext password to check.
   * @param salt      The salt that was used to derive `hashValue`.
   * @param hashValue The stored PBKDF2 hex string.
   * @param iterations The iteration count that was used (must match what produced `hashValue`).
   * @param keyBytes  The key length in bytes (must match).
   */
  async verify(
    password: string,
    salt: string,
    hashValue: string,
    iterations: number = 210_000,
    keyBytes: number = 32
  ): Promise<boolean> {
    const computed = await hash.pbkdf2(password, salt, iterations, keyBytes);
    return constantTimeCompare(computed, hashValue);
  },
};

// ============ HMAC ============

export const hmac = {
  async generateKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey({ name: "HMAC", hash: "SHA-256" }, true, ["sign", "verify"]);
  },

  async sign(data: string, key: CryptoKey): Promise<string> {
    const bytes = new TextEncoder().encode(data);
    const signature = await crypto.subtle.sign("HMAC", key, bytes);
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  },

  async verify(data: string, signature: string, key: CryptoKey): Promise<boolean> {
    const bytes = new TextEncoder().encode(data);
    const sigBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    return crypto.subtle.verify("HMAC", key, sigBytes, bytes);
  },
};

// ============ RANDOM ============

export const random = {
  bytes(length: number): Uint8Array {
    const arr = new Uint8Array(length);
    crypto.getRandomValues(arr);
    return arr;
  },

  string(length: number = 32): string {
    const arr = this.bytes(length);
    return [...arr].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, length);
  },

  number(min: number, max: number): number {
    const arr = this.bytes(4);
    const val = new Uint32Array(arr.buffer)[0];
    return min + (val % (max - min + 1));
  },

  uuid(): string {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
    const arr = this.bytes(16);
    arr[6] = (arr[6] & 0x0f) | 0x40;
    arr[8] = (arr[8] & 0x3f) | 0x80;
    return [...arr].map((b, i) => (i === 4 || i === 6 || i === 8 || i === 10 ? "-" : "") + b.toString(16).padStart(2, "0")).join("");
  },

  token(bytes: number = 32): string {
    return btoa(String.fromCharCode(...this.bytes(bytes)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  },
};

// ============ UTILITIES ============

export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

export function generateSalt(length: number = 16): string {
  return random.string(length);
}
