/**
 * @elmoorx/storage — File Storage Abstraction
 * ============================================
 * Unified API for local, S3, CDN, and in-memory storage.
 *
 *   import { createStorage } from "@elmoorx/storage";
 *   const storage = createStorage("s3", { bucket: "my-bucket" });
 *   await storage.upload("file.txt", buffer);
 *   const file = await storage.download("file.txt");
 *   await storage.delete("file.txt");
 *   const url = await storage.getSignedUrl("file.txt", 3600);
 */

export type StorageDriver = "local" | "s3" | "cdn" | "memory";

export interface StorageConfig {
  driver: StorageDriver;
  bucket?: string;
  region?: string;
  accessKey?: string;
  secretKey?: string;
  endpoint?: string;
  basePath?: string;
  cdnUrl?: string;
}

export interface FileMetadata {
  key: string;
  size: number;
  contentType: string;
  lastModified: number;
  etag?: string;
  metadata?: Record<string, string>;
}

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
  acl?: "public-read" | "private";
}

// ============ STORAGE INTERFACE ============

export interface Storage {
  upload(key: string, data: Buffer | string | Blob, opts?: UploadOptions): Promise<FileMetadata>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getMetadata(key: string): Promise<FileMetadata | null>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  getPublicUrl(key: string): string;
  list(prefix?: string): Promise<FileMetadata[]>;
  copy(src: string, dest: string): Promise<void>;
  move(src: string, dest: string): Promise<void>;
}

// ============ MEMORY DRIVER ============

class MemoryStorage implements Storage {
  private files = new Map<string, { data: Buffer; metadata: FileMetadata }>();

  async upload(key: string, data: Buffer | string | Blob, opts: UploadOptions = {}): Promise<FileMetadata> {
    const buffer = typeof data === "string" ? Buffer.from(data) : data as Buffer;
    const metadata: FileMetadata = {
      key,
      size: buffer.length,
      contentType: opts.contentType || "application/octet-stream",
      lastModified: Date.now(),
      etag: Math.random().toString(36).slice(2),
      metadata: opts.metadata,
    };
    this.files.set(key, { data: buffer, metadata });
    return metadata;
  }

  async download(key: string): Promise<Buffer> {
    const file = this.files.get(key);
    if (!file) throw new Error(`File not found: ${key}`);
    return file.data;
  }

  async delete(key: string): Promise<void> {
    this.files.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.files.has(key);
  }

  async getMetadata(key: string): Promise<FileMetadata | null> {
    return this.files.get(key)?.metadata || null;
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const token = Math.random().toString(36).slice(2);
    return `memory://${key}?token=${token}&expires=${Date.now() + expiresIn * 1000}`;
  }

  getPublicUrl(key: string): string {
    return `memory://${key}`;
  }

  async list(prefix?: string): Promise<FileMetadata[]> {
    const all = [...this.files.values()].map(f => f.metadata);
    return prefix ? all.filter(m => m.key.startsWith(prefix)) : all;
  }

  async copy(src: string, dest: string): Promise<void> {
    const file = this.files.get(src);
    if (!file) throw new Error(`Source not found: ${src}`);
    this.files.set(dest, { ...file, metadata: { ...file.metadata, key: dest, lastModified: Date.now() } });
  }

  async move(src: string, dest: string): Promise<void> {
    await this.copy(src, dest);
    this.files.delete(src);
  }

  size(): number { return this.files.size; }
  clear(): void { this.files.clear(); }
}

// ============ LOCAL DRIVER ============

class LocalStorage implements Storage {
  private basePath: string;
  private files = new Map<string, { data: Buffer; metadata: FileMetadata }>();

  constructor(config: StorageConfig) {
    this.basePath = config.basePath || "./storage";
  }

  async upload(key: string, data: Buffer | string | Blob, opts: UploadOptions = {}): Promise<FileMetadata> {
    const buffer = typeof data === "string" ? Buffer.from(data) : data as Buffer;
    const metadata: FileMetadata = {
      key: `${this.basePath}/${key}`,
      size: buffer.length,
      contentType: opts.contentType || "application/octet-stream",
      lastModified: Date.now(),
      metadata: opts.metadata,
    };
    this.files.set(key, { data: buffer, metadata });
    return metadata;
  }

  async download(key: string): Promise<Buffer> {
    const file = this.files.get(key);
    if (!file) throw new Error(`File not found: ${key}`);
    return file.data;
  }

  async delete(key: string): Promise<void> { this.files.delete(key); }
  async exists(key: string): Promise<boolean> { return this.files.has(key); }
  async getMetadata(key: string): Promise<FileMetadata | null> { return this.files.get(key)?.metadata || null; }
  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> { return `${this.basePath}/${key}?expires=${Date.now() + expiresIn * 1000}`; }
  getPublicUrl(key: string): string { return `${this.basePath}/${key}`; }
  async list(prefix?: string): Promise<FileMetadata[]> {
    const all = [...this.files.values()].map(f => f.metadata);
    return prefix ? all.filter(m => m.key.includes(prefix)) : all;
  }
  async copy(src: string, dest: string): Promise<void> { const f = this.files.get(src); if (f) this.files.set(dest, { ...f }); }
  async move(src: string, dest: string): Promise<void> { await this.copy(src, dest); this.files.delete(src); }
}

// ============ S3 DRIVER (simulated) ============

class S3Storage implements Storage {
  private bucket: string;
  private region: string;
  private files = new Map<string, { data: Buffer; metadata: FileMetadata }>();

  constructor(config: StorageConfig) {
    this.bucket = config.bucket || "default";
    this.region = config.region || "us-east-1";
  }

  async upload(key: string, data: Buffer | string | Blob, opts: UploadOptions = {}): Promise<FileMetadata> {
    const buffer = typeof data === "string" ? Buffer.from(data) : data as Buffer;
    const metadata: FileMetadata = {
      key,
      size: buffer.length,
      contentType: opts.contentType || "application/octet-stream",
      lastModified: Date.now(),
      etag: `"${Math.random().toString(36).slice(2)}"`,
      metadata: opts.metadata,
    };
    this.files.set(key, { data: buffer, metadata });
    return metadata;
  }

  async download(key: string): Promise<Buffer> {
    const file = this.files.get(key);
    if (!file) throw new Error(`S3 object not found: ${this.bucket}/${key}`);
    return file.data;
  }

  async delete(key: string): Promise<void> { this.files.delete(key); }
  async exists(key: string): Promise<boolean> { return this.files.has(key); }
  async getMetadata(key: string): Promise<FileMetadata | null> { return this.files.get(key)?.metadata || null; }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}?expires=${Date.now() + expiresIn * 1000}`;
  }

  getPublicUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async list(prefix?: string): Promise<FileMetadata[]> {
    const all = [...this.files.values()].map(f => f.metadata);
    return prefix ? all.filter(m => m.key.startsWith(prefix)) : all;
  }

  async copy(src: string, dest: string): Promise<void> {
    const f = this.files.get(src); if (f) this.files.set(dest, { ...f, metadata: { ...f.metadata, key: dest } });
  }

  async move(src: string, dest: string): Promise<void> { await this.copy(src, dest); this.files.delete(src); }

  getBucket(): string { return this.bucket; }
  getRegion(): string { return this.region; }
}

// ============ CDN DRIVER ============

class CDNStorage implements Storage {
  private cdnUrl: string;
  private origin: Storage;

  constructor(config: StorageConfig) {
    this.cdnUrl = config.cdnUrl || "https://cdn.elmoorx.dev";
    this.origin = new S3Storage(config);
  }

  async upload(key: string, data: Buffer | string | Blob, opts?: UploadOptions): Promise<FileMetadata> {
    return this.origin.upload(key, data, { ...opts, acl: "public-read" });
  }
  async download(key: string): Promise<Buffer> { return this.origin.download(key); }
  async delete(key: string): Promise<void> { return this.origin.delete(key); }
  async exists(key: string): Promise<boolean> { return this.origin.exists(key); }
  async getMetadata(key: string): Promise<FileMetadata | null> { return this.origin.getMetadata(key); }
  async getSignedUrl(key: string, expiresIn?: number): Promise<string> { return this.origin.getSignedUrl(key, expiresIn); }

  getPublicUrl(key: string): string {
    return `${this.cdnUrl}/${key}`;
  }

  async list(prefix?: string): Promise<FileMetadata[]> { return this.origin.list(prefix); }
  async copy(src: string, dest: string): Promise<void> { return this.origin.copy(src, dest); }
  async move(src: string, dest: string): Promise<void> { return this.origin.move(src, dest); }

  purgeCache(keys?: string[]): void {
    console.warn(`[storage:cdn] Purging ${keys?.length || "all"} keys from ${this.cdnUrl}`);
  }
}

// ============ FACTORY ============

export function createStorage(driver: StorageDriver, config: Omit<StorageConfig, "driver"> = {}): Storage {
  const fullConfig: StorageConfig = { ...config, driver };

  switch (driver) {
    case "memory": return new MemoryStorage();
    case "local": return new LocalStorage(fullConfig);
    case "s3": return new S3Storage(fullConfig);
    case "cdn": return new CDNStorage(fullConfig);
    default: throw new Error(`Unknown storage driver: ${driver}`);
  }
}

// ============ HELPER: IMAGE PROCESSING ============

export async function resizeImage(data: Buffer, _width: number, _height: number): Promise<Buffer> {
  // Simplified — real impl would use sharp/jimp
  return data;
}

export async function generateThumbnail(data: Buffer, size: number = 200): Promise<Buffer> {
  return resizeImage(data, size, size);
}

export function getContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const types: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
    svg: "image/svg+xml", webp: "image/webp", avif: "image/avif",
    pdf: "application/pdf", json: "application/json", txt: "text/plain",
    html: "text/html", css: "text/css", js: "text/javascript",
    mp4: "video/mp4", webm: "video/webm", mp3: "audio/mpeg",
    zip: "application/zip", wasm: "application/wasm",
  };
  return types[ext || ""] || "application/octet-stream";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
  return (bytes / 1073741824).toFixed(1) + " GB";
}
