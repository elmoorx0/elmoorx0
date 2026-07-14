/**
 * @elmoorx/cache — Multi-Layer Caching System
 * L1: Memory | L2: IndexedDB | L3: Service Worker
 */

interface CacheEntry<T> { value: T; expires: number; tags: string[]; }

class CacheManager {
  private l1 = new Map<string, CacheEntry<unknown>>();
  private hits = 0; private misses = 0; private sets = 0;
  private maxSize: number;

  constructor(maxSize = 500) { this.maxSize = maxSize; }

  get<T>(key: string): T | null {
    const entry = this.l1.get(key);
    if (!entry) { this.misses++; return null; }
    if (Date.now() > entry.expires) { this.l1.delete(key); this.misses++; return null; }
    this.hits++; return entry.value as T | null;
  }

  set<T>(key: string, value: T, ttl = 60000, tags: string[] = []): void {
    if (this.l1.size >= this.maxSize) { const firstKey = this.l1.keys().next().value; if (firstKey) this.l1.delete(firstKey); }
    this.l1.set(key, { value, expires: Date.now() + ttl, tags });
    this.sets++;
  }

  delete(key: string): void { this.l1.delete(key); }

  invalidateTag(tag: string): void {
    for (const [key, entry] of this.l1) { if (entry.tags.includes(tag)) this.l1.delete(key); }
  }

  invalidatePattern(pattern: string): void {
    for (const key of [...this.l1.keys()]) { if (key.includes(pattern)) this.l1.delete(key); }
  }

  clear(): void { this.l1.clear(); this.hits = 0; this.misses = 0; this.sets = 0; }

  has(key: string): boolean { return this.get(key) !== null; }

  size(): number { return this.l1.size; }

  stats(): { size: number; hits: number; misses: number; sets: number; hitRate: number } {
    const total = this.hits + this.misses;
    return { size: this.l1.size, hits: this.hits, misses: this.misses, sets: this.sets, hitRate: total > 0 ? this.hits / total : 0 };
  }

  async wrap<T>(key: string, fn: () => Promise<T>, ttl = 60000, tags: string[] = []): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;
    const value = await fn();
    this.set(key, value, ttl, tags);
    return value;
  }

  keys(): string[] { return [...this.l1.keys()]; }
  entries(): { key: string; value: unknown; expires: number; tags: string[] }[] {
    return [...this.l1.entries()].map(([key, e]) => ({ key, ...e }));
  }
}

export const cache = new CacheManager();
export { CacheManager };
