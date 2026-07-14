/**
 * Elmoorx SSG — Static Site Generation
 * ============================================
 * Pre-renders pages to static HTML at build time.
 * Perfect for blogs, docs, marketing sites — zero server cost.
 *
 *   elmoorx build --static
 *
 * Output:
 *   dist/
 *     index.html         (pre-rendered)
 *     about/index.html
 *     blog/
 *       post-1/index.html
 *       post-2/index.html
 *     _assets/
 *       client.js        (island hydration bundle)
 */

import { writeFile, mkdir, readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { pathToFileURL } from "node:url";

export interface SSGOptions {
  rootDir: string;
  outDir: string;
  // Routes to pre-render (defaults to all .elmoorx.tsx files)
  routes?: string[];
  // Follow dynamic links — crawl the site
  crawl?: boolean;
  // Custom layout wrapper
  layout?: (pageHtml: string, opts: { title: string }) => string;
}

export interface SSGResult {
  pagesGenerated: number;
  routes: string[];
  durationMs: number;
  errors: { route: string; error: string }[];
}

/**
 * Build a static site from src/ pages.
 */
export async function buildStaticSite(options: SSGOptions): Promise<SSGResult> {
  const t0 = Date.now();
  const errors: { route: string; error: string }[] = [];
  const generated: string[] = [];

  console.warn("\n  Elmoorx SSG — Building static site\n");

  // Discover routes
  let routes: string[];
  if (options.routes) {
    routes = options.routes;
  } else {
    routes = await discoverRoutes(options.rootDir);
  }

  // Crawl mode — start with / and follow links
  if (options.crawl && routes.length === 0) {
    routes = ["/"];
    const visited = new Set<string>();
    while (routes.length > 0) {
      const route = (routes.shift() as NonNullable<ReturnType<typeof routes.shift>>);
      if (visited.has(route)) continue;
      visited.add(route);
      const links = await crawlRoute(route, options);
      for (const link of links) {
        if (!visited.has(link)) routes.push(link);
      }
    }
    routes = [...visited];
  }

  await mkdir(options.outDir, { recursive: true });

  for (const route of routes) {
    try {
      await generatePage(route, options);
      generated.push(route);
      console.warn(`  ✓ ${route}`);
    } catch (err) {
      errors.push({ route, error: (err as Error).message });
      console.warn(`  ✗ ${route} — ${(err as Error).message}`);
    }
  }

  // Copy static assets
  const staticDir = join(options.rootDir, "public");
  if (existsSync(staticDir)) {
    await copyDir(staticDir, join(options.outDir, "_assets"));
    console.warn("  ✓ static assets copied");
  }

  // Emit client hydration bundle
  await emitClientBundle(options.outDir);
  console.warn("  ✓ client bundle emitted");

  const durationMs = Date.now() - t0;
  console.warn(`\n  ${generated.length} pages generated in ${durationMs}ms\n`);

  return {
    pagesGenerated: generated.length,
    routes: generated,
    durationMs,
    errors,
  };
}

/**
 * Discover all .elmoorx.tsx files and convert to routes.
 */
async function discoverRoutes(rootDir: string): Promise<string[]> {
  const routes: string[] = [];
  await walk(rootDir, "", routes);
  return routes.sort();
}

async function walk(rootDir: string, relativeDir: string, routes: string[]) {
  const absDir = join(rootDir, relativeDir);
  if (!existsSync(absDir)) return;
  const entries = await readdir(absDir, { withFileTypes: true });
  for (const entry of entries) {
    const relPath = relativeDir ? join(relativeDir, entry.name) : entry.name;
    if (entry.isDirectory()) {
      await walk(rootDir, relPath, routes);
    } else if (entry.name === "index.elmoorx.tsx") {
      routes.push(relativeDir ? `/${relativeDir}` : "/");
    } else if (entry.name.endsWith(".elmoorx.tsx")) {
      const _base = entry.name.replace(/\.elmoorx\.tsx$/, "");
      routes.push(`/${relPath.replace(/\.elmoorx\.tsx$/, "")}`);
    }
  }
}

/**
 * Render a single route to static HTML.
 */
async function generatePage(route: string, options: SSGOptions) {
  // Resolve route to file
  const filePath = resolveRouteFile(route, options.rootDir);
  if (!filePath) throw new Error(`No file found for route ${route}`);

  // Dynamic import the page module.
  //
  // IMPORTANT: .elmoorx.tsx / .tsx files contain JSX + TypeScript syntax
  // that Node cannot parse natively. The SSG pipeline assumes the
  // caller has either:
  //   (a) pre-compiled the .tsx files to .js using `compile()` from
  //       @elmoorx/compiler (recommended), OR
  //   (b) registered tsx/esbuild-register as a require hook so Node
  //       can import .tsx directly.
  // Without one of these, this import() will throw SyntaxError on the
  // first JSX token.
  const mod = await import(pathToFileURL(filePath).href);
  const Component = mod.default;
  if (typeof Component !== "function") {
    throw new Error(`No default export in ${filePath}`);
  }

  // Call getStaticProps if exported
  let props: Record<string, unknown> = {};
  if (typeof mod.getStaticProps === "function") {
    const result = await mod.getStaticProps({ params: extractParams(route, filePath) });
    props = result.props || {};
  }

  // Render to HTML
  const { renderToString } = await import("@elmoorx/runtime");
  const node = Component(props);
  const pageHtml = renderToString(node);

  // Wrap in layout
  const layout = options.layout || defaultLayout;
  const fullHtml = layout(pageHtml, { title: typeof mod.title === "string" ? mod.title : "Elmoorx" });

  // Write to dist/<route>/index.html
  const outPath = route === "/"
    ? join(options.outDir, "index.html")
    : join(options.outDir, route, "index.html");

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, fullHtml);
}

function resolveRouteFile(route: string, rootDir: string): string | null {
  const candidates = [
    join(rootDir, route, "index.elmoorx.tsx"),
    join(rootDir, `${route}.elmoorx.tsx`),
    join(rootDir, route === "/" ? "index.elmoorx.tsx" : `${route}.elmoorx.tsx`),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

/**
 * Extract path params from a route by matching against the file path.
 *
 * For a file `/blog/[slug].elmoorx.tsx` and route `/blog/hello-world`,
 * returns `{ slug: 'hello-world' }`.
 *
 * Previously this returned `{}` — breaking all dynamic routes.
 * getStaticProps received no params, so any data fetching keyed on
 * the param returned null/undefined and pages rendered empty.
 */
function extractParams(route: string, filePath: string): Record<string, string> {
  const params: Record<string, string> = {};
  // Get the file's base name without extension: e.g. '[slug].elmoorx.tsx' → '[slug]'
  const base = filePath.split('/').pop() || '';
  const fileStem = base.replace(/\.elmoorx\.tsx$/, '').replace(/\.tsx$/, '');
  // If the file is a dynamic segment like '[slug]', extract the param.
  const dynamicMatch = fileStem.match(/^\[(.+)\]$/);
  if (!dynamicMatch) return params;
  const paramName = dynamicMatch[1];
  // The route's last segment is the param value.
  // e.g. route '/blog/hello-world' → segments ['blog', 'hello-world']
  // → param 'slug' = 'hello-world' (assuming file is /blog/[slug].elmoorx.tsx).
  const routeSegments = route.split('/').filter(Boolean);
  const paramValue = routeSegments[routeSegments.length - 1];
  if (paramValue) {
    params[paramName] = decodeURIComponent(paramValue);
  }
  return params;
}

async function crawlRoute(_route: string, _options: SSGOptions): Promise<string[]> {
  // CAVEAT (alpha): crawl mode is a no-op. A full implementation would:
  //   1. Import the route module
  //   2. renderToString the page
  //   3. Regex/parse <a href="..."> tags
  //   4. Filter to same-origin internal links
  //   5. Normalize, dedupe against visited, return
  // Currently returns [] — only the seed route '/' is generated in crawl mode.
  return [];
}

/**
 * Escape HTML special characters in a string. Used to prevent XSS in
 * the default layout's <title> interpolation — previously a title
 * containing `</title><script>alert(1)</script>` would inject script.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function defaultLayout(pageHtml: string, opts: { title: string }): string {
  // SECURITY: escape opts.title before interpolation. Previously a
  // title containing `</title><script>...` would inject script.
  const safeTitle = escapeHtml(opts.title);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <script type="module" src="/_assets/client.js"></script>
</head>
<body>
  <div id="app">${pageHtml}</div>
</body>
</html>`;
}

/**
 * Emit the client bundle for hydration.
 *
 * CAVEAT (alpha): The registry is empty because the alpha SSG pipeline
 * doesn't yet pass island metadata from compile() through to here.
 * As a result, hydrateIslands({}) is a no-op — no islands hydrate on
 * SSG-generated pages. The fix requires:
 *   1. compile() exposing per-island metadata (componentName, modulePath) — DONE in Priority 7
 *   2. SSG collecting that metadata across all route modules
 *   3. This function emitting `import Counter from './Counter.elmoorx.js';
 *      const registry = { island_abc123: Counter, ... };`
 * Step 2 + 3 are pending; the current stub is documented accordingly.
 */
async function emitClientBundle(outDir: string) {
  const clientJs = `// Elmoorx client bundle — auto-generated by SSG
// CAVEAT (alpha): registry is empty — island hydration is a no-op.
// See emitClientBundle() docstring in ssg.ts for the roadmap.
import { hydrateIslands } from "@elmoorx/runtime";
const registry = {};
hydrateIslands(registry);
`;
  await mkdir(join(outDir, "_assets"), { recursive: true });
  await writeFile(join(outDir, "_assets", "client.js"), clientJs);
}

async function copyDir(src: string, dest: string) {
  if (!existsSync(src)) return;
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      const content = await readFile(srcPath);
      await writeFile(destPath, content);
    }
  }
}
