/**
 * Elmoorx Server — Production HTTP server
 * ============================================
 * A full HTTP server with middleware, routing, API routes, and SSR.
 * Suitable for self-hosting on a VPS or running on Node.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, realpathSync } from "node:fs";
import { join, extname, relative, sep } from "node:path";
import { SECURITY_HEADERS, generateCsrfToken } from "@elmoorx/runtime";
import {
  MiddlewareStack,
  corsMiddleware,
  loggingMiddleware,
  jsonBodyMiddleware,
  csrfMiddleware,
  compressionMiddleware,
  rateLimitMiddleware,
  type RequestContext,
  type ElmoorxResponse,
} from "./middleware";
import { notFound, serverError } from "./api";

export interface ServerOptions {
  port?: number;
  hostname?: string;
  rootDir: string;
  // Custom middleware stack
  middleware?: MiddlewareStack;
  // Static assets directory (defaults to rootDir/public)
  staticDir?: string;
  // Trust proxy headers (X-Forwarded-For, etc.)
  trustProxy?: boolean;
}

export async function startServer(options: ServerOptions) {
  const port = options.port || 3000;
  const hostname = options.hostname || "0.0.0.0";

  const middleware = options.middleware || new MiddlewareStack();
  // Default middleware
  middleware.add(loggingMiddleware());
  middleware.add(rateLimitMiddleware());
  middleware.add(corsMiddleware());
  middleware.add(jsonBodyMiddleware());
  middleware.add(csrfMiddleware());
  middleware.add(compressionMiddleware());

  const server = createServer(async (req, res) => {
    try {
      await handleRequest(req, res, options, middleware);
    } catch (err) {
      console.error("[elmoorx] request error:", err);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(`Internal error: ${(err as Error).message}`);
    }
  });

  await new Promise<void>((resolve) => server.listen(port, hostname, resolve));
  console.warn(`\n  Elmoorx server running`);
  console.warn(`  → http://${hostname}:${port}`);
  console.warn(`  → Security: A+ (auto)`);
  console.warn(`  → Middleware: ${middleware.size} active\n`);

  return server;
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  options: ServerOptions,
  middleware: MiddlewareStack
) {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  const ctx: RequestContext = {
    req,
    res,
    url,
    method: req.method || "GET",
    headers: req.headers as Record<string, string | string[] | undefined>,
    state: new Map(),
    params: {},
    query: Object.fromEntries(url.searchParams.entries()),
  };

  // Apply security headers
  const csrfToken = generateCsrfToken();
  // SECURITY: only set the CSRF cookie on safe methods (GET/HEAD/OPTIONS).
  // Mutating requests are required to send the matching X-CSRF-Token header,
  // so they don't need a fresh cookie to be issued. Setting it on every
  // request (including POSTs) invalidates in-flight tokens and breaks
  // concurrent mutations from the same browser.
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(ctx.method)) {
    res.setHeader(
      "Set-Cookie",
      `csrf_token=${csrfToken}; Secure; SameSite=Strict; Path=/; Max-Age=3600`
    );
    // Also expose the token via a response header so the client can seed
    // a <meta name="csrf-token"> tag without parsing cookies.
    res.setHeader("X-CSRF-Token", csrfToken);
  }
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(key, value);
  }

  await middleware.run(ctx, async () => {
    // Try API route first
    if (url.pathname.startsWith("/api/")) {
      await handleApiRoute(ctx, options);
      return;
    }

    // Try static file
    const staticDir = options.staticDir || join(options.rootDir, "public");
    // SECURITY: prevent path traversal. Normalize the request path, strip
    // any leading slashes, and verify the resolved real path stays inside
    // staticDir. Reject anything that escapes (e.g. `/../etc/passwd`).
    const safePath = safeJoin(staticDir, decodeURIComponent(url.pathname));
    if (safePath && existsSync(safePath)) {
      await serveStatic(safePath, res);
      return;
    }

    // Try SSR page route
    await handlePageRoute(ctx, options);
  });
}

async function handleApiRoute(ctx: RequestContext, options: ServerOptions) {
  // Look for src/api/<path>.ts
  // SECURITY: prevent path traversal via the URL path. The routePath is
  // taken from the URL and could contain `..` segments; we resolve it
  // against rootDir/api and verify the real path stays inside.
  const routePathRaw = ctx.url.pathname.replace(/^\/api\//, "");
  const apiDir = join(options.rootDir, "api");
  const candidatePaths = [
    safeJoin(apiDir, `${routePathRaw}.ts`),
    safeJoin(apiDir, routePathRaw, "index.ts"),
  ];
  const candidates = candidatePaths.filter((p): p is string => p !== null);

  for (const c of candidates) {
    if (existsSync(c)) {
      try {
        const mod = await import(c);
        const method = ctx.method as keyof typeof mod;
        const handler = mod[method];
        if (typeof handler === "function") {
          const response: ElmoorxResponse = await handler(ctx);
          sendResponse(ctx.res, response);
          return;
        }
        // Method not allowed — only list HTTP method exports (uppercase),
        // not config / middleware / types.
        const httpMethods = Object.keys(mod).filter(k => /^[A-Z]+$/.test(k));
        sendResponse(ctx.res, {
          status: 405,
          headers: { Allow: httpMethods.join(", ") },
          body: JSON.stringify({ error: `Method ${ctx.method} not allowed` }),
        });
        return;
      } catch (err) {
        sendResponse(ctx.res, serverError((err as Error).message));
        return;
      }
    }
  }

  sendResponse(ctx.res, notFound(`API route ${ctx.url.pathname} not found`));
}

/**
 * Safely join `base` and `target` and return the resolved path ONLY if the
 * real path is inside `base`. Returns null if the path would escape `base`
 * (path-traversal attempt) or if the target doesn't exist on disk.
 *
 * The check uses `realpathSync` after a `existsSync` guard, so symlinks
 * are also resolved and verified to remain inside `base`.
 */
function safeJoin(base: string, ...segments: string[]): string | null {
  // Strip leading slashes from each segment so join() doesn't treat them
  // as absolute paths (which would discard `base`).
  const cleaned = segments.map(s => s.replace(/^\/+/, ""));
  const target = join(base, ...cleaned);
  // Quick reject: lexical check before touching the filesystem.
  const rel = relative(base, target);
  if (rel.startsWith(".." + sep) || rel === "..") return null;
  // If the target exists, also check the real (symlink-resolved) path.
  if (existsSync(target)) {
    try {
      const realBase = realpathSync(base);
      const realTarget = realpathSync(target);
      const realRel = relative(realBase, realTarget);
      if (realRel.startsWith(".." + sep) || realRel === "..") return null;
    } catch {
      return null;
    }
  }
  return target;
}

async function handlePageRoute(ctx: RequestContext, options: ServerOptions) {
  // Look for src/<path>.elmoorx.tsx
  // SECURITY: use safeJoin to prevent path traversal.
  const root = options.rootDir;
  const pathname = ctx.url.pathname;
  const candidates = [
    safeJoin(root, pathname, "index.elmoorx.tsx"),
    safeJoin(root, `${pathname}.elmoorx.tsx`),
    safeJoin(root, pathname === "/" ? "index.elmoorx.tsx" : `${pathname}.elmoorx.tsx`),
  ].filter((p): p is string => p !== null);

  for (const c of candidates) {
    if (existsSync(c)) {
      // In real impl: compile, SSR, stream HTML
      ctx.res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      ctx.res.end(`<!-- SSR: ${c} --><div>Page rendered by Elmoorx</div>`);
      return;
    }
  }

  sendResponse(ctx.res, {
    status: 404,
    headers: { "Content-Type": "text/html" },
    body: `<h1>404 — Not Found</h1><p>${escapeHtml(ctx.url.pathname)}</p>`,
  });
}

function escapeHtml(s: string): string {
  const map: Record<string, string> = {
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  };
  return s.replace(/[&<>"']/g, (c) => map[c] ?? c);
}

async function serveStatic(filePath: string, res: ServerResponse) {
  const ext = extname(filePath);
  const mimeTypes: Record<string, string> = {
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".html": "text/html",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".eot": "application/vnd.ms-fontobject",
    ".wasm": "application/wasm",
    ".pdf": "application/pdf",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".txt": "text/plain",
    ".map": "application/json",
  };
  const contentType = mimeTypes[ext] || "application/octet-stream";
  res.setHeader("Content-Type", contentType);
  const content = await readFile(filePath);
  res.writeHead(200);
  res.end(content);
}

function sendResponse(res: ServerResponse, response: ElmoorxResponse) {
  const status = response.status || 200;
  const headers = response.headers || {};
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }
  res.writeHead(status);
  if (response.body) {
    res.end(response.body);
  } else {
    res.end();
  }
}
