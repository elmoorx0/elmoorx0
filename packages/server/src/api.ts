/**
 * Elmoorx Server — API Routes
 * ============================================
 * File-based API routes under src/api/.
 *
 *   src/api/hello.ts          →  GET  /api/hello
 *   src/api/users/[id].ts     →  GET  /api/users/:id
 *
 * Each file exports handlers by HTTP method:
 *
 *   export async function GET(ctx) {
 *     return { status: 200, body: JSON.stringify({ hello: 'world' }) };
 *   }
 *
 *   export async function POST(ctx) {
 *     const data = ctx.body;  // parsed JSON
 *     return { status: 201, body: JSON.stringify({ created: true }) };
 *   }
 */

import type { RequestContext, ElmoorxResponse, RouteHandler } from "./middleware";

export type ApiHandler = (ctx: RequestContext) => Promise<ElmoorxResponse> | ElmoorxResponse;

export interface ApiModule {
  GET?: ApiHandler;
  POST?: ApiHandler;
  PUT?: ApiHandler;
  PATCH?: ApiHandler;
  DELETE?: ApiHandler;
  HEAD?: ApiHandler;
  OPTIONS?: ApiHandler;
}

/**
 * Convert an ApiModule (with method exports) to a single RouteHandler.
 *
 * FIXED:
 * - Uppercases ctx.method before lookup (HTTP/2 proxies may send
 *   lowercase method names; Node's http module uppercases but we
 *   shouldn't rely on that).
 * - Allow header now only lists valid HTTP methods (was including
 *   every export name like 'default', 'config', 'middleware').
 * - HEAD requests now fall back to GET per RFC 7231 §4.3.2
 *   ("If a resource supports GET, it MUST also support HEAD").
 *   Returns the GET response with the body stripped.
 */
const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;
type HttpMethod = typeof HTTP_METHODS[number];

export function apiModuleToHandler(mod: ApiModule): RouteHandler {
  return async (ctx) => {
    const method = ctx.method.toUpperCase() as HttpMethod;
    let handler = mod[method as keyof ApiModule];

    // HEAD fallback: if only GET is defined, HEAD returns GET's
    // response with the body stripped (per RFC 7231 §4.3.2).
    let stripBody = false;
    if (!handler && method === "HEAD" && mod.GET) {
      handler = mod.GET;
      stripBody = true;
    }

    if (!handler) {
      // Build Allow header from only the HTTP methods actually exported.
      const allowed = HTTP_METHODS.filter(
        (m) => typeof mod[m as keyof ApiModule] === "function"
      );
      // If GET is defined, HEAD is implicitly allowed too.
      if (mod.GET && !allowed.includes("HEAD")) allowed.push("HEAD");
      return {
        status: 405,
        headers: {
          Allow: allowed.join(", "),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ error: `Method ${method} not allowed` }),
      };
    }

    const response = await handler(ctx);
    if (stripBody) {
      return { ...response, body: undefined };
    }
    return response;
  };
}

/**
 * Helper — return JSON easily.
 *
 *   export async function GET() {
 *     return json({ hello: 'world' });
 *   }
 */
export function json(data: unknown, status = 200): ElmoorxResponse {
  return {
    status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

/**
 * Helper — return text.
 */
export function text(data: string, status = 200): ElmoorxResponse {
  return {
    status,
    headers: { "Content-Type": "text/plain" },
    body: data,
  };
}

/**
 * Helper — return HTML.
 */
export function html(data: string, status = 200): ElmoorxResponse {
  return {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
    body: data,
  };
}

/**
 * Helper — redirect.
 */
export function redirect(to: string, status = 302): ElmoorxResponse {
  return {
    status,
    headers: { Location: to },
    body: "",
  };
}

/**
 * Helper — 404.
 */
export function notFound(message = "Not found"): ElmoorxResponse {
  return json({ error: message }, 404);
}

/**
 * Helper — 401 Unauthorized.
 */
export function unauthorized(message = "Unauthorized"): ElmoorxResponse {
  return json({ error: message }, 401);
}

/**
 * Helper — 403 Forbidden.
 */
export function forbidden(message = "Forbidden"): ElmoorxResponse {
  return json({ error: message }, 403);
}

/**
 * Helper — 500 Internal Server Error.
 */
export function serverError(message = "Internal server error"): ElmoorxResponse {
  return json({ error: message }, 500);
}
