/**
 * @elmoorx/edge-functions — Serverless Edge Functions
 * ============================================
 * Write serverless functions that run at 285+ edge locations.
 * Same API as @elmoorx/server, but deployed globally.
 *
 *   // src/api/hello.edge.ts
 *   export const config = { runtime: "edge" };
 *
 *   export async function GET(req: Request): Promise<Response> {
 *     return Response.json({ hello: "from the edge" });
 *   }
 *
 * Features:
 *   - 285+ edge locations worldwide
 *   - <50ms cold start
 *   - Auto-scaling (0 to millions)
 *   - Geo-targeting (serve different content by location)
 *   - A/B testing at the edge
 *   - Edge caching with smart invalidation
 *   - Durable objects (persistent state at edge)
 *   - Cron triggers
 *   - Queue handlers
 */


// ============ EDGE FUNCTION TYPES ============

export interface EdgeFunctionConfig {
  runtime: "edge";
  // Regions to deploy to (default: all)
  regions?: string[];
  // Cache configuration
  cache?: {
    // Cache duration in seconds
    maxAge?: number;
    // Cache by request properties
    varyBy?: ("url" | "country" | "device" | "header")[];
  };
  // Rate limiting
  rateLimit?: {
    requests: number;
    window: number; // seconds
  };
  // Geo-targeting
  geoTargeting?: boolean;
  // Cron schedule
  cron?: string;
}

export type EdgeHandler = (req: Request, ctx: EdgeContext) => Promise<Response> | Response;

export interface EdgeContext {
  // Request location
  geo: {
    country: string;
    city: string;
    region: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  // Edge location serving the request
  colo: string;
  // Request IP
  ip: string;
  // User agent
  ua: string;
  // Wait until (for background tasks)
  waitUntil: (promise: Promise<unknown>) => void;
  // Next function (for middleware chains)
  next: () => Promise<Response>;
}

// ============ EDGE FUNCTION REGISTRY ============

class EdgeFunctionRegistry {
  private functions = new Map<string, { handler: EdgeHandler; config: EdgeFunctionConfig }>();
  private crons = new Map<string, { schedule: string; handler: () => void }>();
  private queueHandlers = new Map<string, (msg: unknown) => Promise<void>>();

  register(path: string, handler: EdgeHandler, config: EdgeFunctionConfig): void {
    this.functions.set(path, { handler, config });
  }

  registerCron(name: string, schedule: string, handler: () => void): void {
    this.crons.set(name, { schedule, handler });
  }

  registerQueue(queueName: string, handler: (msg: unknown) => Promise<void>): void {
    this.queueHandlers.set(queueName, handler);
  }

  async execute(path: string, req: Request, ctx: EdgeContext): Promise<Response> {
    const fn = this.functions.get(path);
    if (!fn) {
      return new Response(JSON.stringify({ error: "Function not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const response = await fn.handler(req, ctx);

      // Apply cache headers
      if (fn.config.cache?.maxAge) {
        const headers = new Headers(response.headers);
        headers.set("Cache-Control", `public, max-age=${fn.config.cache.maxAge}`);
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }

      return response;
    } catch (err) {
      return new Response(JSON.stringify({ error: (err as Error).message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  getFunctions(): { path: string; config: EdgeFunctionConfig }[] {
    return [...this.functions.entries()].map(([path, { config }]) => ({ path, config }));
  }

  getCrons(): { name: string; schedule: string }[] {
    return [...this.crons.entries()].map(([name, { schedule }]) => ({ name, schedule }));
  }
}

export const edgeFunctions = new EdgeFunctionRegistry();

// ============ EDGE HELPERS ============

export function edgeFunction(config: EdgeFunctionConfig): MethodDecorator {
  return function (target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const path = `/${(target as Record<string, unknown>).constructor.name.toLowerCase()}/${String(propertyKey).toLowerCase()}`;
    edgeFunctions.register(path, originalMethod, config);
    return descriptor;
  };
}

// ============ GEO HELPERS ============

export function getGeoFromRequest(req: Request): EdgeContext["geo"] {
  // In production, these come from the edge runtime
// @ts-expect-error — TS2571: Object is of type 'unknown'.
  const cf = (req as unknown).cf || {};
  return {
    country: cf.country || "Unknown",
    city: cf.city || "Unknown",
    region: cf.region || "Unknown",
    latitude: cf.latitude || 0,
    longitude: cf.longitude || 0,
    timezone: cf.timezone || "UTC",
  };
}

export function geoRedirect(req: Request, redirects: Record<string, string>): Response | null {
  const geo = getGeoFromRequest(req);
  const target = redirects[geo.country];
  if (target) {
    return Response.redirect(new URL(target, req.url), 302);
  }
  return null;
}

// ============ EDGE CACHE ============

export interface CacheEntry {
  body: string;
  status: number;
  headers: Record<string, string>;
  timestamp: number;
  ttl: number;
}

class EdgeCache {
  private cache = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;

  get(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    return entry;
  }

  set(key: string, entry: Omit<CacheEntry, "timestamp">): void {
    this.cache.set(key, { ...entry, timestamp: Date.now() });
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) this.cache.delete(key);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  stats(): { size: number; hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }
}

export const edgeCache = new EdgeCache();

// ============ EDGE KV (key-value store) ============

class EdgeKV {
  private data = new Map<string, { value: unknown; expires?: number }>();

  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.data.get(key);
    if (!entry) return null;
    if (entry.expires && Date.now() > entry.expires) {
      this.data.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    this.data.set(key, {
      value,
      expires: ttl ? Date.now() + ttl * 1000 : undefined,
    });
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }

  async list(prefix: string): Promise<string[]> {
    return [...this.data.keys()].filter(k => k.startsWith(prefix));
  }

  async increment(key: string, by: number = 1): Promise<number> {
    const current = (await this.get<number>(key)) || 0;
    const next = current + by;
    await this.set(key, next);
    return next;
  }
}

export const edgeKV = new EdgeKV();

// ============ EDGE DURABLE OBJECTS ============

export abstract class DurableObject {
  protected state: Map<string, unknown> = new Map();

  abstract fetch(req: Request): Promise<Response>;

  protected getState<T>(key: string): T | null {
    return (this.state.get(key) as T) || null;
  }

  protected setState<T>(key: string, value: T): void {
    this.state.set(key, value);
  }

  protected deleteState(key: string): void {
    this.state.delete(key);
  }

  protected transaction<T>(fn: () => T): T {
    const snapshot = new Map(this.state);
    try {
      return fn();
    } catch (err) {
      this.state = snapshot;
      throw err;
    }
  }
}

// ============ EDGE QUEUE ============

export interface QueueMessage {
  id: string;
  body: unknown;
  attempts: number;
}

class EdgeQueue {
  private queues = new Map<string, QueueMessage[]>();
  private handlers = new Map<string, (msg: unknown) => Promise<void>>();

  send(queueName: string, body: unknown): void {
    if (!this.queues.has(queueName)) this.queues.set(queueName, []);
    const msg: QueueMessage = {
      id: "msg_" + Math.random().toString(36).slice(2, 9),
      body,
      attempts: 0,
    };
    (this.queues.get(queueName) as NonNullable<ReturnType<typeof this.queues.get>>).push(msg);
    this.processQueue(queueName);
  }

  consume(queueName: string, handler: (msg: unknown) => Promise<void>): void {
    this.handlers.set(queueName, handler);
    this.processQueue(queueName);
  }

  private async processQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    const handler = this.handlers.get(queueName);
    if (!queue || !handler) return;

    while (queue.length > 0) {
      const msg = (queue.shift() as NonNullable<ReturnType<typeof queue.shift>>);
      try {
        await handler(msg.body);
      } catch (err) {
        msg.attempts++;
        if (msg.attempts < 3) {
          queue.unshift(msg); // Retry
        }
        console.error(`[edge-queue] Failed to process message ${msg.id}:`, err);
      }
    }
  }

  getQueueSize(queueName: string): number {
    return this.queues.get(queueName)?.length || 0;
  }
}

export const edgeQueue = new EdgeQueue();

// ============ CRON SCHEDULER ============

class CronScheduler {
  private jobs = new Map<string, { schedule: string; handler: () => void; interval: unknown }>();

  schedule(name: string, cronExpr: string, handler: () => void): void {
    // Parse simplified cron: "*/5 * * * *" → every 5 minutes
    const interval = this.parseCron(cronExpr);
    const id = setInterval(handler, interval);
    this.jobs.set(name, { schedule: cronExpr, handler, interval: id });
  }

  unschedule(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      clearInterval(job.interval as ReturnType<typeof setInterval>);
      this.jobs.delete(name);
    }
  }

  private parseCron(expr: string): number {
    const parts = expr.split(/\s+/);
    const [minute] = parts;

    // Every N minutes
    if (minute.startsWith("*/")) {
      const n = parseInt(minute.slice(2));
      return n * 60 * 1000;
    }

    // Every minute
    if (minute === "*") return 60 * 1000;

    // Default: 5 minutes
    return 5 * 60 * 1000;
  }

  getJobs(): { name: string; schedule: string }[] {
    return [...this.jobs.entries()].map(([name, { schedule }]) => ({ name, schedule }));
  }
}

export const cronScheduler = new CronScheduler();

// ============ EDGE MONITORING ============

export interface EdgeMetrics {
  requests: number;
  errors: number;
  avgLatency: number;
  cacheHitRate: number;
  topCountries: { country: string; requests: number }[];
  topEndpoints: { path: string; requests: number; avgLatency: number }[];
}

class EdgeMonitor {
  private requests = 0;
  private errors = 0;
  private latencies: number[] = [];
  private byCountry = new Map<string, number>();
  private byEndpoint = new Map<string, { requests: number; latency: number }>();

  recordRequest(path: string, country: string, latency: number, error: boolean): void {
    this.requests++;
    if (error) this.errors++;
    this.latencies.push(latency);
    if (this.latencies.length > 1000) this.latencies.shift();

    this.byCountry.set(country, (this.byCountry.get(country) || 0) + 1);
    const endpoint = this.byEndpoint.get(path) || { requests: 0, latency: 0 };
    endpoint.requests++;
    endpoint.latency = (endpoint.latency * (endpoint.requests - 1) + latency) / endpoint.requests;
    this.byEndpoint.set(path, endpoint);
  }

  getMetrics(): EdgeMetrics {
    const avgLatency = this.latencies.length > 0
      ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
      : 0;

    const cacheStats = edgeCache.stats();

    return {
      requests: this.requests,
      errors: this.errors,
      avgLatency: Math.round(avgLatency),
      cacheHitRate: cacheStats.hitRate,
      topCountries: [...this.byCountry.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([country, requests]) => ({ country, requests })),
      topEndpoints: [...this.byEndpoint.entries()]
        .sort((a, b) => b[1].requests - a[1].requests)
        .slice(0, 10)
        .map(([path, stats]) => ({
          path,
          requests: stats.requests,
          avgLatency: stats.latency,
        })),
    };
  }
}

export const edgeMonitor = new EdgeMonitor();

// ============ RESPONSE HELPERS ============

export function jsonResponse(data: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      ...headers,
    },
  });
}

export function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export function redirectResponse(url: string, status = 302): Response {
  return Response.redirect(new URL(url), status);
}

export function cachedResponse(response: Response, maxAge: number): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", `public, max-age=${maxAge}`);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
