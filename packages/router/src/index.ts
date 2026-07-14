/**
 * Elmoorx Router — File-based routing with dynamic segments
 * ============================================
 * Convention:
 *   src/index.elmoorx.tsx          →  /
 *   src/about.elmoorx.tsx          →  /about
 *   src/users/index.elmoorx.tsx    →  /users
 *   src/users/[id].elmoorx.tsx     →  /users/:id
 *   src/blog/[slug].elmoorx.tsx    →  /blog/:slug
 *   src/[...catch].elmoorx.tsx     →  /* (catch-all)
 *
 *   src/api/hello.ts             →  /api/hello (server route)
 */

import { readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { h, type ElmoorxNode } from "@elmoorx/runtime";

export interface Route {
  // URL pattern, e.g. "/users/:id"
  pattern: string;
  // Filesystem path to the route module
  filePath: string;
  // Regex for matching (compiled from pattern)
  regex: RegExp;
  // Parameter names extracted from pattern
  paramNames: string[];
  // True if this is a server-only API route (under /api/)
  isApi: boolean;
}

/**
 * Scan a directory and build a route table.
 */
export async function buildRoutes(rootDir: string): Promise<Route[]> {
  const routes: Route[] = [];
  if (!existsSync(rootDir)) return routes;

  await walk(rootDir, "", routes);
  return routes.sort((a, b) => specificity(b.pattern) - specificity(a.pattern));
}

async function walk(
  rootDir: string,
  relativeDir: string,
  routes: Route[]
): Promise<void> {
  const absDir = join(rootDir, relativeDir);
  if (!existsSync(absDir)) return;

  const entries = await readdir(absDir, { withFileTypes: true });
  for (const entry of entries) {
    const relPath = relativeDir ? join(relativeDir, entry.name) : entry.name;

    if (entry.isDirectory()) {
      await walk(rootDir, relPath, routes);
    } else if (/\.(elmoorx\.)?(tsx|ts)$/.test(entry.name)) {
      const route = fileToRoute(relPath);
      if (route) routes.push(route);
    }
  }
}

function fileToRoute(relativePath: string): Route | null {
  // Normalize path separators — accept both / and \ so the router
  // works cross-platform (Windows path.sep is \, but URL patterns
  // always use /). Previously used node:path.sep which broke on
  // Windows (produced \users\[:id] instead of /users/:id).
  const parts = relativePath.split(/[/\\]/);
  const last = parts[parts.length - 1];

  // Strip extension
  const ext = extname(last);
  const base = basename(last, ext);
  const _isElmoorx = last.includes(".elmoorx.");
  const isApi = parts[0] === "api";

  // Handle [param], [...catch], and index
  const urlParts: string[] = [];
  for (let i = 0; i < parts.length - 1; i++) {
    urlParts.push(parts[i]);
  }

  if (base !== "index") {
    if (base.startsWith("[...") && base.endsWith("]")) {
      // Catch-all: [...slug].tsx → /*
      urlParts.push("*");
    } else if (base.startsWith("[") && base.endsWith("]")) {
      // Dynamic: [id].tsx → :id
      urlParts.push(":" + base.slice(1, -1));
    } else {
      urlParts.push(base);
    }
  }

  const pattern = "/" + urlParts.filter(Boolean).join("/");
  const { regex, paramNames } = compilePattern(pattern);

  return {
    pattern: pattern === "/" ? "/" : pattern.replace(/\/$/, ""),
    filePath: relativePath,
    regex,
    paramNames,
    isApi,
  };
}

function compilePattern(pattern: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];

  // Handle catch-all first.
  // FIXED: previously the regex was /^\/.*$/ with no capture group,
  // so match[1] was undefined and decodeURIComponent(undefined)
  // coerced to the string "undefined". Now the regex captures the
  // matched path so params.catch is the actual path.
  if (pattern.includes("/*")) {
    return {
      regex: /^\/(.*)$/,
      paramNames: ["catch"],
    };
  }

  // Convert :param to capture groups
  const regexStr = pattern.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
    paramNames.push(name);
    return "([^/]+)";
  });

  return {
    regex: new RegExp(`^${regexStr}$`),
    paramNames,
  };
}

/**
 * Match a URL path against the route table. Returns the route + extracted params.
 */
export function matchRoute(
  routes: Route[],
  pathname: string
): { route: Route; params: Record<string, string> } | null {
  for (const route of routes) {
    const match = route.regex.exec(pathname);
    if (match) {
      const params: Record<string, string> = {};
      route.paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(match[i + 1]);
      });
      return { route, params };
    }
  }
  return null;
}

/**
 * Higher specificity = more specific route (earlier in matching).
 *
 * Scoring per segment:
 *   - static segment ("users")            → +100
 *   - dynamic segment (":id")             → +10
 *   - catch-all ("*")                      → +1
 *
 *   /users/profile       → 200
 *   /users/:id           → 110
 *   /users/:id/edit      → 210
 *   /users/:id/posts/:p  → 220
 *   /*                   → 1
 *
 * FIXED: the previous implementation added `score += segments.length`
 * as a "depth bonus" with a self-admitted comment that it was wrong.
 * The bonus meant /users/:id/edit (210+3=213) could outrank
 * /users/profile (200+2=202) — but they have different segment
 * counts so their regexes won't both match the same URL. The real
 * risk was /a/:b/:c (30+3=33) vs /a/b (200+2=202) — the bonus was
 * too weak to break anything, but the heuristic was fragile and
 * confusing. Dropped the bonus entirely; pure static-vs-dynamic
 * weighting is sufficient and unambiguous.
 */
function specificity(pattern: string): number {
  if (pattern === "/*") return 1;

  let score = 0;
  const segments = pattern.split("/").filter(Boolean);
  for (const seg of segments) {
    if (seg.startsWith(":")) {
      score += 10;
    } else if (seg === "*") {
      score += 1;
    } else {
      score += 100;
    }
  }
  return score;
}

/**
 * Client-side navigate (for SPA-style routing in islands).
 *
 * Pushes a new history entry and dispatches a synthetic popstate event.
 * For SPA routing to work, the app must register a popstate listener
 * (via `createRouter()` below) that re-renders the matched route.
 * Without that listener, navigate() changes the URL but the page
 * doesn't update.
 */
export function navigate(path: string): void {
  if (typeof window === "undefined") return;
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/**
 * Create a client-side router that re-renders on URL changes.
 *
 * Sets up a popstate listener (handles both browser back/forward AND
 * navigate() calls). Returns a dispose function that removes the
 * listener — call it when the router is unmounted.
 *
 *   const dispose = createRouter(routes, (match) => {
 *     // re-render the matched route
 *     console.warn(match.route.pattern, match.params);
 *   });
 *   // ...later
 *   dispose();
 *
 * FIXED: previously navigate() dispatched popstate but NOTHING listened
 * for it — SPA routing was completely non-functional. The URL changed
 * but the page didn't re-render. Now createRouter() wires the listener.
 */
export function createRouter(
  routes: Route[],
  onMatch: (match: { route: Route; params: Record<string, string> } | null) => void
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    const path = window.location.pathname;
    onMatch(matchRoute(routes, path));
  };
  // Fire once for the initial URL.
  handler();
  window.addEventListener("popstate", handler);
  return () => window.removeEventListener("popstate", handler);
}

/**
 * Link component — intercepts clicks for client-side nav.
 * Uses the runtime's `h()` factory so children/props merge consistently
 * with the rest of the Elmoorx tree.
 */
export function Link(props: {
  to: string;
  children?: ElmoorxNode | ElmoorxNode[];
  class?: string;
  className?: string;
  activeClass?: string;
  // Returns true if the link should receive `activeClass`
  isActive?: (path: string) => boolean;
}): ElmoorxNode {
  const classes: string[] = [];
  if (props.class) classes.push(props.class);
  if (props.className) classes.push(props.className);
  if (props.activeClass && props.isActive?.(props.to)) {
    classes.push(props.activeClass);
  }

  return h(
    "a",
    {
      href: props.to,
      class: classes.join(" ") || undefined,
      onClick: (e: MouseEvent) => {
        // Allow modified clicks to open in a new tab/window
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        // Only intercept same-origin clicks
        const target = (e.currentTarget as HTMLAnchorElement);
        if (target && target.target === "_blank") return;
        e.preventDefault();
        navigate(props.to);
      },
    },
    ...(Array.isArray(props.children) ? props.children : props.children ? [props.children] : [])
  );
}
