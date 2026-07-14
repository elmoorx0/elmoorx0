/**
 * @elmoorx/docs-gen — Documentation Site Generator
 * ============================================
 * Auto-generates documentation from TypeScript source code.
 * Parses JSDoc comments, extracts types, builds HTML.
 *
 *   node scripts/generate-docs.js
 *   → docs/index.html with all API docs
 */

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname, basename, dirname } from "node:path";

// ============ TYPES ============

export interface DocEntry {
  name: string;
  type: "function" | "class" | "interface" | "type" | "variable" | "const" | "export";
  description: string;
  params: { name: string; type: string; description: string }[];
  returns: { type: string; description: string };
  examples: string[];
  deprecated: boolean;
  since: string;
  category: string;
  filePath: string;
  lineNumber: number;
}

export interface DocModule {
  name: string;
  description: string;
  entries: DocEntry[];
  fileCount: number;
}

// ============ PARSER ============

export class DocParser {
  parse(source: string, filePath: string): DocEntry[] {
    const entries: DocEntry[] = [];
    const lines = source.split("\n");

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      // Look for JSDoc comment start
      if (line.includes("/**")) {
        const jsdoc = this.extractJSDoc(lines, i);
        if (jsdoc) {
          const entry = this.parseJSDoc(jsdoc.text, lines, jsdoc.endLine + 1, filePath);
          if (entry) entries.push(entry);
          i = jsdoc.endLine + 1;
          continue;
        }
      }
      i++;
    }

    return entries;
  }

  private extractJSDoc(lines: string[], startLine: number): { text: string; endLine: number } | null {
    let text = "";
    let i = startLine;

    while (i < lines.length) {
      const line = lines[i];
      text += line + "\n";

      if (line.includes("*/")) {
        return { text, endLine: i };
      }
      i++;
    }

    return null;
  }

  private parseJSDoc(jsdoc: string, lines: string[], nextLine: number, filePath: string): DocEntry | null {
    // Extract description
    const descMatch = jsdoc.match(/\*\s+(.*?)(?=\* @|\*\/)/s);
    const description = descMatch ? descMatch[1].replace(/\s*\*\s*/g, " ").trim() : "";

    // Extract params
    const params: { name: string; type: string; description: string }[] = [];
    const paramMatches = jsdoc.matchAll(/@param\s+(?:\{(\w+)\})?\s+(\w+)\s*(.*)/g);
    for (const match of paramMatches) {
      params.push({ type: match[1] || "unknown", name: match[2], description: match[3].trim() });
    }

    // Extract returns
    const returnMatch = jsdoc.match(/@returns?\s+(?:\{(\w+)\})?\s*(.*)/);
    const returns = { type: returnMatch?.[1] || "void", description: returnMatch?.[2]?.trim() || "" };

    // Extract examples
    const examples: string[] = [];
    const exampleMatches = jsdoc.matchAll(/@example\s+([\s\S]*?)(?=\* @|\*\/)/g);
    for (const match of exampleMatches) {
      examples.push(match[1].replace(/\s*\*\s*/g, "").trim());
    }

    // Check deprecated
    const deprecated = jsdoc.includes("@deprecated");

    // Extract since
    const sinceMatch = jsdoc.match(/@since\s+(\S+)/);
    const since = sinceMatch?.[1] || "1.0.0";

    // Get the declaration on the next line
    const declLine = lines[nextLine] || "";
    const { name, type } = this.parseDeclaration(declLine);

    if (!name) return null;

    return {
      name,
      type,
      description,
      params,
      returns,
      examples,
      deprecated,
      since,
      category: this.categorize(name, type),
      filePath,
      lineNumber: nextLine + 1,
    };
  }

  private parseDeclaration(line: string): { name: string; type: DocEntry["type"] } {
    // export function name
    let match = line.match(/export\s+function\s+(\w+)/);
    if (match) return { name: match[1], type: "function" };

    // export const name = 
    match = line.match(/export\s+const\s+(\w+)/);
    if (match) return { name: match[1], type: "const" };

    // export class name
    match = line.match(/export\s+class\s+(\w+)/);
    if (match) return { name: match[1], type: "class" };

    // export interface name
    match = line.match(/export\s+interface\s+(\w+)/);
    if (match) return { name: match[1], type: "interface" };

    // export type name
    match = line.match(/export\s+type\s+(\w+)/);
    if (match) return { name: match[1], type: "type" };

    // function name (without export)
    match = line.match(/^\s*function\s+(\w+)/);
    if (match) return { name: match[1], type: "function" };

    return { name: "", type: "export" };
  }

  private categorize(name: string, type: DocEntry["type"]): string {
    if (name.startsWith("$")) return "Reactive";
    if (type === "class") return "Classes";
    if (type === "interface") return "Types";
    if (type === "function") return "Functions";
    return "Exports";
  }
}

// ============ HTML GENERATOR ============

export class DocGenerator {
  private parser = new DocParser();

  async generate(packagesDir: string, outDir: string): Promise<void> {
    const modules: DocModule[] = [];

    // Walk all packages
    const packages = await readdir(packagesDir, { withFileTypes: true });
    for (const pkg of packages) {
      if (!pkg.isDirectory()) continue;
      const pkgDir = join(packagesDir, pkg.name, "src");
      if (!existsSync(pkgDir)) continue;

      const entries: DocEntry[] = [];
      await this.walkDir(pkgDir, async (filePath) => {
        const ext = extname(filePath);
        if (![".ts", ".tsx"].includes(ext)) return;
        const source = await readFile(filePath, "utf-8");
        const parsed = this.parser.parse(source, filePath);
        entries.push(...parsed);
      });

      if (entries.length > 0) {
        modules.push({
          name: `@elmoorx/${pkg.name}`,
          description: `${entries.length} exports`,
          entries,
          fileCount: entries.length,
        });
      }
    }

    // Generate HTML
    const html = this.renderHTML(modules);

    // Write output
    if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, "index.html"), html);

    console.log(`  📚 Generated docs: ${modules.length} modules, ${modules.reduce((s, m) => s + m.entries.length, 0)} entries`);
  }

  private async walkDir(dir: string, fn: (path: string) => Promise<void>): Promise<void> {
    if (!existsSync(dir)) return;
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.walkDir(fullPath, fn);
      } else {
        await fn(fullPath);
      }
    }
  }

  private renderHTML(modules: DocModule[]): string {
    const totalEntries = modules.reduce((s, m) => s + m.entries.length, 0);

    const moduleCards = modules.map(m => {
      const entries = m.entries.map(e => `
        <div class="entry">
          <div class="entry-header">
            <span class="entry-type ${e.type}">${e.type}</span>
            <span class="entry-name">${e.name}</span>
            ${e.deprecated ? '<span class="deprecated">DEPRECATED</span>' : ""}
            <span class="entry-since">since v${e.since}</span>
          </div>
          <p class="entry-desc">${e.description || "No description."}</p>
          ${e.params.length > 0 ? `
            <div class="entry-params">
              <span class="params-label">Parameters:</span>
              ${e.params.map(p => `<div class="param"><code>${p.name}</code>: <span class="param-type">${p.type}</span> — ${p.description}</div>`).join("")}
            </div>
          ` : ""}
          ${e.returns.description ? `<div class="entry-returns"><span class="returns-label">Returns:</span> <span class="returns-type">${e.returns.type}</span> — ${e.returns.description}</div>` : ""}
          ${e.examples.length > 0 ? `
            <div class="entry-examples">
              ${e.examples.map(ex => `<pre class="example"><code>${this.escapeHtml(ex)}</code></pre>`).join("")}
            </div>
          ` : ""}
        </div>
      `).join("");

      return `
        <section class="module" id="${m.name.replace(/[@/]/g, "")}">
          <h2 class="module-name">${m.name}</h2>
          <p class="module-desc">${m.description}</p>
          ${entries}
        </section>
      `;
    }).join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Elmoorx API Documentation — ${totalEntries} exports across ${modules.length} modules</title>
<meta name="description" content="Complete API documentation for Elmoorx Framework v2.0 — 73 packages, ${totalEntries} documented exports." />
<meta name="keywords" content="elmoorx docs, api reference, frontend framework documentation, typescript" />
<link rel="canonical" href="https://elmoorx.dev/docs" />
<meta property="og:type" content="website" />
<meta property="og:title" content="Elmoorx API Documentation" />
<meta property="og:description" content="${totalEntries} exports across ${modules.length} modules" />
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Elmoorx API Documentation",
  "description": "Complete API documentation for Elmoorx Framework v2.0",
  "author": { "@type": "Organization", "name": "Elmoorx Foundation" }
}
</script>
<style>
:root{--bg:#0A0A0F;--bg-elev:#14141B;--bg-card:#1A1A24;--border:#2A2A38;--text:#E4E4E7;--dim:#A1A1AA;--faint:#71717A;--accent:#A855F7;--accent2:#06B6D4;--success:#10B981;--warning:#F59E0B;--danger:#EF4444}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Inter,-apple-system,sans-serif;background:var(--bg);color:var(--text);font-size:15px;line-height:1.7}
.layout{display:grid;grid-template-columns:280px 1fr;min-height:100vh}
.sidebar{background:var(--bg-elev);border-right:1px solid var(--border);padding:24px 16px;position:sticky;top:0;height:100vh;overflow-y:auto}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:18px;margin-bottom:24px}
.orb{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#A855F7,#06B6D4);position:relative}
.orb::after{content:'';position:absolute;inset:6px;border-radius:4px;background:var(--bg-elev)}
.search{width:100%;padding:8px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;outline:none;margin-bottom:16px}
.search:focus{border-color:var(--accent)}
.nav-h{font-family:monospace;font-size:9px;letter-spacing:0.2em;color:var(--faint);text-transform:uppercase;margin:16px 0 8px;padding-left:12px}
.nav-link{display:block;padding:6px 12px;color:var(--dim);font-size:13px;text-decoration:none;border-radius:6px;cursor:pointer;transition:all .1s}
.nav-link:hover{color:var(--text);background:var(--bg-card)}
.nav-link.active{color:var(--accent);background:rgba(168,85,247,0.1)}
.main{padding:40px 48px;max-width:900px}
h1{font-size:32px;margin-bottom:8px}
.subtitle{color:var(--dim);margin-bottom:32px;font-size:15px}
.module{margin-bottom:48px}
.module-name{font-size:24px;font-weight:600;margin-bottom:8px;padding-bottom:8px;border-bottom:2px solid var(--accent)}
.module-desc{color:var(--dim);margin-bottom:16px}
.entry{background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:12px}
.entry-header{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.entry-type{font-family:monospace;font-size:10px;padding:2px 8px;border-radius:4px;font-weight:600;text-transform:uppercase}
.entry-type.function{background:rgba(168,85,247,0.15);color:var(--accent)}
.entry-type.const{background:rgba(6,182,212,0.15);color:var(--accent2)}
.entry-type.class{background:rgba(245,158,11,0.15);color:var(--warning)}
.entry-type.interface{background:rgba(16,185,129,0.15);color:var(--success)}
.entry-type.type{background:rgba(239,68,68,0.15);color:var(--danger)}
.entry-name{font-family:monospace;font-size:16px;font-weight:600;color:var(--text)}
.deprecated{background:rgba(239,68,68,0.15);color:var(--danger);padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600}
.entry-since{margin-left:auto;font-family:monospace;font-size:10px;color:var(--faint)}
.entry-desc{color:var(--dim);font-size:14px;margin-bottom:8px}
.entry-params,.entry-returns{font-size:13px;margin-bottom:8px}
.params-label,.returns-label{font-weight:600;color:var(--text)}
.param{margin-left:16px;color:var(--dim)}
.param code,.returns-type{font-family:monospace;color:var(--accent2);background:var(--bg-elev);padding:1px 6px;border-radius:3px}
.example{background:#0F0F17;border:1px solid var(--border);border-radius:6px;padding:12px;overflow-x:auto;font-family:monospace;font-size:12px;color:var(--text);margin-top:8px}
@media(max-width:900px){.layout{grid-template-columns:1fr}.sidebar{display:none}}
</style>
</head>
<body>
<div class="layout">
  <aside class="sidebar">
    <div class="brand"><div class="orb"></div>Elmoorx Docs</div>
    <input class="search" placeholder="Search API..." id="search" />
    ${modules.map(m => `
      <div class="nav-h">${m.name}</div>
      ${m.entries.map(e => `<a class="nav-link" href="#${e.name}">${e.name}</a>`).join("")}
    `).join("")}
  </aside>
  <main class="main">
    <h1>API Documentation</h1>
    <p class="subtitle">${totalEntries} exports across ${modules.length} modules — Elmoorx Framework v2.0</p>
    ${moduleCards}
  </main>
</div>
<script>
document.getElementById('search').addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('.entry').forEach(el => {
    const name = el.querySelector('.entry-name')?.textContent.toLowerCase() || '';
    const desc = el.querySelector('.entry-desc')?.textContent.toLowerCase() || '';
    el.style.display = (name.includes(q) || desc.includes(q)) ? '' : 'none';
  });
});
</script>
</body>
</html>`;
  }

  private escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}
