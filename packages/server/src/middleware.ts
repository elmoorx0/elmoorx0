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
import { gzipSync, deflateSync, brotliCompressSync, constants as zlibConstants } from "node:zlib";
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

  /**
   * Number of middlewares in the stack. Read-only — to mutate the
   * stack, use add().
   */
  get size(): number {
    return this.middlewares.length;
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
 * Built-in: Compression (gzip / deflate / brotli)
 *
 * Buffers the response body, compresses it according to the client's
 * Accept-Encoding header, and sets Content-Encoding + Vary headers.
 * If the response is already encoded, the body is too small, or the
 * client doesn't accept a supported encoding, the response passes
 * through unchanged.
 *
 * For very large streaming responses (e.g. server-rendered video),
 * prefer enabling compression at the reverse proxy layer (nginx,
 * Caddy, Cloudflare). This middleware is best suited for typical
 * JSON/HTML API responses under a few MB.
 *
 * Supported encodings (in priority order):
 *   - br        (Brotli, Node ≥11.7.0)
 *   - gzip      (universal)
 *   - deflate   (universal, less efficient than gzip)
 *
 * Threshold: responses smaller than `opts.threshold` bytes (default
 * 1024) are not compressed — the overhead exceeds the savings.
 */
export const compressionMiddleware = (
  opts: {
    /** Minimum response size in bytes to compress. Default: 1024 */
    threshold?: number;
    /** Compression level (1-9). Default: 6 (good balance) */
    level?: number;
    /** Explicit list of supported encodings. Default: br, gzip, deflate */
    encodings?: ("br" | "gzip" | "deflate")[];
  } = {}
): Middleware => {
  const threshold = opts.threshold ?? 1024;
  const level = opts.level ?? 6;
  const supported = opts.encodings ?? ["br", "gzip", "deflate"];

  return async (ctx, next) => {
    // Intercept res.writeHead + res.end so we can rewrite the body.
    // We monkey-patch the response methods for the lifetime of this
    // request, then restore them after `next()` finishes.
    const originalWriteHead = ctx.res.writeHead.bind(ctx.res);
    const originalEnd = ctx.res.end.bind(ctx.res);
    const originalSetHeader = ctx.res.setHeader.bind(ctx.res);

    // bufferedBody and capturedHeaders are mutated (not reassigned) inside
    // the monkey-patched writeHead/end below, so const is appropriate.
    // capturedStatus IS reassigned via the monkey-patch, so it stays let.
    const bufferedBody: Buffer | null = null;
    const capturedHeaders: Record<string, string | string[]> = {};
    let capturedStatus = 200;

    // Choose encoding based on Accept-Encoding
    const acceptEncoding = String(ctx.headers["accept-encoding"] || "").toLowerCase();
    let chosenEncoding: "br" | "gzip" | "deflate" | null = null;
    for (const enc of supported) {
      if (acceptEncoding.includes(enc)) {
        chosenEncoding = enc;
        break;
      }
    }

    // Stash headers as they're set so we can decide whether to compress
    // after we know the body size.
    ctx.res.setHeader = function (name: string, value: string | string[]): typeof ctx.res {
      capturedHeaders[name.toLowerCase()] = value;
      return ctx.res;
    } as typeof ctx.res.setHeader;

    ctx.res.writeHead = function (
      statusCode: number,
      headersOrStatusMessage?: Record<string, string | string[]> | string | number,
      maybeHeaders?: Record<string, string | string[]>
    ): typeof ctx.res {
      capturedStatus = statusCode;
      // Normalize the two overloads of writeHead
      if (typeof headersOrStatusMessage === "object" && headersOrStatusMessage !== null) {
        for (const [k, v] of Object.entries(headersOrStatusMessage)) {
          capturedHeaders[k.toLowerCase()] = v;
        }
      }
      if (maybeHeaders && typeof maybeHeaders === "object") {
        for (const [k, v] of Object.entries(maybeHeaders)) {
          capturedHeaders[k.toLowerCase()] = v;
        }
      }
      return ctx.res;
    } as typeof ctx.res.writeHead;

    ctx.res.end = function (
      chunk?: unknown | string | Buffer | null,
      encodingOrStatus?: string | number | null
    ): typeof ctx.res {
      // Build the body buffer
      let body: Buffer | null = null;
      if (typeof chunk === "string") {
        const enc = typeof encodingOrStatus === "string" ? (encodingOrStatus as BufferEncoding) : "utf-8";
        body = Buffer.from(chunk, enc);
      } else if (Buffer.isBuffer(chunk)) {
        body = chunk;
      } else if (chunk == null) {
        body = bufferedBody;
      }

      // Restore originals before deciding what to write — we want to
      // call the real methods now.
      ctx.res.setHeader = originalSetHeader;
      ctx.res.writeHead = originalWriteHead;
      ctx.res.end = originalEnd;

      // Decide whether to compress:
      //   - Already encoded?
      //   - Body too small?
      //   - No supported encoding?
      const alreadyEncoded = "content-encoding" in capturedHeaders;
      const shouldCompress =
        body !== null &&
        body.length >= threshold &&
        chosenEncoding !== null &&
        !alreadyEncoded;

      // Set all captured headers (lowercased → original case via setHeader)
      for (const [k, v] of Object.entries(capturedHeaders)) {
        // Skip Content-Length — we'll set it after compression
        if (k === "content-length") continue;
        // setHeader normalizes case internally
        ctx.res.setHeader(k, v as string | string[]);
      }

      if (!shouldCompress || body === null) {
        if (body !== null) {
          ctx.res.setHeader("Content-Length", String(body.length));
        }
        ctx.res.writeHead(capturedStatus);
        if (body !== null) {
          (ctx.res.end as typeof ctx.res.end)(body);
        } else {
          (ctx.res.end as typeof ctx.res.end)();
        }
        return ctx.res;
      }

      // Compress the body — chosenEncoding is guaranteed non-null here
      // because shouldCompress requires chosenEncoding !== null.
      const enc = chosenEncoding as "br" | "gzip" | "deflate";
      const compressed = compressBody(body, enc, level);

      ctx.res.setHeader("Content-Encoding", enc);
      ctx.res.setHeader("Content-Length", String(compressed.length));
      // Vary: Accept-Encoding so caches don't serve compressed to clients
      // that don't accept it
      const existingVary = typeof capturedHeaders["vary"] === "string"
        ? capturedHeaders["vary"]
        : "";
      const varyParts = existingVary
        .split(",")
        .map((s: string) => s.trim().toLowerCase())
        .filter(Boolean);
      if (!varyParts.includes("accept-encoding")) {
        varyParts.push("accept-encoding");
      }
      ctx.res.setHeader("Vary", varyParts.join(", "));

      ctx.res.writeHead(capturedStatus);
      (ctx.res.end as typeof ctx.res.end)(compressed);
      return ctx.res;
    } as typeof ctx.res.end;

    try {
      await next();
    } finally {
      // Restore originals in case next() threw before res.end was called
      ctx.res.setHeader = originalSetHeader;
      ctx.res.writeHead = originalWriteHead;
      ctx.res.end = originalEnd;
    }
  };
};

/**
 * Compress a Buffer using the given encoding. Returns the compressed
 * bytes. Throws if the encoding is unsupported (shouldn't happen —
 * callers filter by Accept-Encoding first).
 */
function compressBody(body: Buffer, encoding: "br" | "gzip" | "deflate", level: number): Buffer {
  if (encoding === "br") {
    // Brotli uses `params` map with BROTLI_PARAM_QUALITY constant (0-11).
    // Quality level is conceptually similar to gzip's `level` (1-9), so
    // we map 1-9 → 1-9 directly (both ranges are valid for brotli).
    return brotliCompressSync(body, {
      params: { [zlibConstants.BROTLI_PARAM_QUALITY]: level },
    });
  }
  if (encoding === "gzip") {
    return gzipSync(body, { level });
  }
  if (encoding === "deflate") {
    return deflateSync(body, { level });
  }
  throw new Error(`Unsupported encoding: ${encoding}`);
}

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
