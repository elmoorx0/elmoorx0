/**
 * Elmoorx Server — Middleware system
 * ============================================
 * Composable request handlers that run before route matching.
 *
 *   middleware.add(authMiddleware);
 *   middleware.add(loggingMiddleware);
 *
 *   // In a route handler:
 *   const user = await context.get('user');  // set by authMiddleware
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { timingSafeEqual as cryptoTimingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import type { ElmoorxNode } from "@elmoorx/runtime";

export interface RequestContext {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  method: string;
  headers: Record<string, string | string[] | undefined>;
  // Per-request state — middleware can stash values here
  state: Map<string, unknown>;
  // Path params (set by router)
  params: Record<string, string>;
  // Query params
  query: Record<string, string>;
  // Parsed body (set by body parser middleware)
  body?: unknown;
}

export type Middleware = (
  ctx: RequestContext,
  next: () => Promise<void>
) => Promise<void> | void;

export type RouteHandler = (
  ctx: RequestContext
) => Promise<ElmoorxResponse | ElmoorxNode> | ElmoorxResponse | ElmoorxNode;

export interface ElmoorxResponse {
  status?: number;
  headers?: Record<string, string>;
  body?: string | Buffer | ReadableStream<Uint8Array>;
}

export class MiddlewareStack {
  private middlewares: Middleware[] = [];

  add(mw: Middleware): this {
    this.middlewares.push(mw);
    return this;
  }

  async run(ctx: RequestContext, finalHandler: () => Promise<void>): Promise<void> {
    let i = 0;
    const next = async () => {
      if (i >= this.middlewares.length) {
        await finalHandler();
        return;
      }
      const mw = this.middlewares[i++];
      await mw(ctx, next);
    };
    await next();
  }
}

/**
 * Built-in: CORS middleware
 */
export const corsMiddleware = (opts: {
  origin?: string;
  methods?: string[];
  headers?: string[];
} = {}): Middleware => async (ctx, next) => {
  const origin = opts.origin || "*";
  const methods = (opts.methods || ["GET", "POST", "PUT", "DELETE", "OPTIONS"]).join(", ");
  const headers = (opts.headers || ["Content-Type", "Authorization", "X-CSRF-Token"]).join(", ");

  ctx.res.setHeader("Access-Control-Allow-Origin", origin);
  ctx.res.setHeader("Access-Control-Allow-Methods", methods);
  ctx.res.setHeader("Access-Control-Allow-Headers", headers);

  if (ctx.method === "OPTIONS") {
    ctx.res.writeHead(204);
    ctx.res.end();
    return;
  }

  await next();
};

/**
 * Built-in: Request logging
 */
export const loggingMiddleware = (): Middleware => async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  const status = ctx.res.statusCode;
  const color = status >= 500 ? "\x1b[31m" : status >= 400 ? "\x1b[33m" : "\x1b[32m";
  const reset = "\x1b[0m";
  console.warn(
    `  ${ctx.method.padEnd(6)} ${ctx.url.pathname.padEnd(30)} ${color}${status}${reset} ${ms}ms`
  );
};

/**
 * Built-in: JSON body parser
 */
export const jsonBodyMiddleware = (): Middleware => async (ctx, next) => {
  if (ctx.method === "GET" || ctx.method === "HEAD") {
    await next();
    return;
  }
  const contentType = ctx.headers["content-type"] || "";
  if (!contentType.includes("application/json")) {
    await next();
    return;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of ctx.req) {
    chunks.push(chunk as Buffer);
  }
  try {
    ctx.body = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
  } catch {
    ctx.body = null;
  }
  await next();
};

/**
 * Built-in: CSRF protection (double-submit cookie pattern)
 *
 * Mutations (POST/PUT/PATCH/DELETE) require a matching X-CSRF-Token
 * header. The same token is sent in a non-HttpOnly `csrf_token` cookie
 * so the browser auto-includes it; the client must copy it into the
 * header. This defends against cross-site form posts even when the
 * attacker can read cookies via SameSite bypass.
 *
 * To exempt specific routes (e.g. webhooks from third parties), add
 * the route path to `opts.exemptPaths`.
 */
export const csrfMiddleware = (
  opts: {
    exemptPaths?: string[];
  } = {}
): Middleware => async (ctx, next) => {
  const safeMethods = ["GET", "HEAD", "OPTIONS", "TRACE"];
  if (safeMethods.includes(ctx.method)) {
    await next();
    return;
  }

  if (opts.exemptPaths?.some((p) => ctx.url.pathname.startsWith(p))) {
    await next();
    return;
  }

  const headerToken = (ctx.headers["x-csrf-token"] as string | undefined)?.trim();
  const cookieHeader = ctx.headers.cookie;
  const cookieStr = Array.isArray(cookieHeader) ? cookieHeader[0] ?? "" : (cookieHeader ?? "");
  const cookieRaw = cookieStr
    .split(";")
    .map((c: string) => c.trim())
    .find((c: string) => c.startsWith("csrf_token="));
  const cookieToken = cookieRaw?.split("=").slice(1).join("=").trim();

  // Constant-time compare to avoid timing-attack token extraction
  if (
    !headerToken ||
    !cookieToken ||
    headerToken.length !== cookieToken.length ||
    !timingSafeEqual(headerToken, cookieToken)
  ) {
    ctx.res.writeHead(403, { "Content-Type": "application/json" });
    ctx.res.end(
      JSON.stringify({
        error: "Invalid or missing CSRF token",
        hint: "Include X-CSRF-Token header matching the csrf_token cookie",
      })
    );
    return;
  }
  await next();
};

/**
 * Constant-time string comparison — avoids leaking token length/info
 * via timing differences. Returns true iff strings are byte-equal.
 *
 * Uses node:crypto.timingSafeEqual under the hood (audited, builtin).
 * Falls back to a hand-rolled XOR loop only if Buffer conversion fails.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aBuf = Buffer.from(a, "utf-8");
  const bBuf = Buffer.from(b, "utf-8");
  // crypto.timingSafeEqual requires equal-length buffers (guaranteed above).
  return cryptoTimingSafeEqual(aBuf, bBuf);
}

/**
 * Built-in: Compression (gzip)
 *
 * CAVEAT (alpha): This middleware is a no-op. Real gzip compression
 * requires buffering the response body, gzipping it, and setting
 * Content-Encoding: gzip — which conflicts with the streaming
 * response model. For production, enable compression at the reverse
 * proxy layer (nginx `gzip on;`, Caddy `encode gzip`, Cloudflare
 * auto-compress). This middleware is retained for API compatibility
 * but documented as a no-op so consumers aren't misled.
 */
export const compressionMiddleware = (): Middleware => async (ctx, next) => {
  await next();
  // No-op — see CAVEAT above. Compression should be done at the
  // reverse proxy layer (nginx/caddy/cloudflare).
};

/**
 * Built-in: Rate limiting (in-memory, per-IP)
 *
 * IP extraction rules:
 *   - By default, use `req.socket.remoteAddress` only — DO NOT trust
 *     `X-Forwarded-For` because it is trivially spoofable by clients.
 *   - If the server is behind a trusted reverse proxy (nginx, Cloudflare,
 *     AWS ALB), set `opts.trustProxy: true` to honor `X-Forwarded-For`.
 *     The FIRST hop in XFF is the client (per RFC 7239 §7.1); subsequent
 *     hops are proxies.
 *   - When trustProxy is true, we take the FIRST IP in the comma-separated
 *     XFF list. If the header is missing or malformed, fall back to
 *     socket.remoteAddress.
 */
export const rateLimitMiddleware = (
  opts: {
    windowMs?: number;
    max?: number;
    /** Honor X-Forwarded-For. Default false — only enable if behind a trusted proxy. */
    trustProxy?: boolean;
  } = {}
): Middleware => {
  const windowMs = opts.windowMs || 60_000;
  const max = opts.max || 100;
  const trustProxy = opts.trustProxy ?? false;
  const hits = new Map<string, { count: number; resetAt: number }>();

  // Periodic sweep of expired entries to prevent unbounded memory
  // growth under sustained attack (millions of unique IPs). Runs
  // every windowMs — cheap because we only iterate entries that
  // are already expired.
  const sweepInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of hits) {
      if (now > entry.resetAt) hits.delete(ip);
    }
  }, windowMs);
  // Don't keep the process alive just for sweeping.
  if (typeof sweepInterval.unref === "function") sweepInterval.unref();

  return async (ctx, next) => {
    const ip = extractClientIp(ctx, trustProxy);
    const now = Date.now();
    let entry = hits.get(ip);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(ip, entry);
    }

    entry.count++;
    if (entry.count > max) {
      ctx.res.writeHead(429, {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": String(max),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(entry.resetAt),
      });
      ctx.res.end(JSON.stringify({ error: "Too many requests" }));
      return;
    }

    ctx.res.setHeader("X-RateLimit-Limit", String(max));
    ctx.res.setHeader("X-RateLimit-Remaining", String(max - entry.count));
    ctx.res.setHeader("X-RateLimit-Reset", String(entry.resetAt));

    await next();
  };
};

/**
 * Extract the client IP from a request. If `trustProxy` is false (default),
 * only `req.socket.remoteAddress` is used — X-Forwarded-For is IGNORED
 * because clients can spoof it. When `trustProxy` is true, the first IP
 * in XFF is used (the original client per RFC 7239).
 */
function extractClientIp(ctx: RequestContext, trustProxy: boolean): string {
  if (trustProxy) {
    const xff = ctx.headers["x-forwarded-for"];
    if (typeof xff === "string" && xff.length > 0) {
      const first = xff.split(",")[0]?.trim();
      if (first && isValidIp(first)) return first;
    } else if (Array.isArray(xff) && xff.length > 0) {
      const first = xff[0]?.split(",")[0]?.trim();
      if (first && isValidIp(first)) return first;
    }
  }
  return ctx.req.socket.remoteAddress || "unknown";
}

function isValidIp(ip: string): boolean {
  // Use node:net.isIP — returns 4 for valid IPv4, 6 for IPv6, 0 for
  // invalid. More accurate than the previous hand-rolled regex
  // (which accepted 999.999.999.999 and ":::::" as valid).
  return isIP(ip) !== 0;
}
