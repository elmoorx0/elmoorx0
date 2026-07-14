/**
 * @elmoorx/marketplace — Component Marketplace
 * ============================================
 * Discover, install, and publish Elmoorx components.
 *
 *   import { h, search, install, publish } from "@elmoorx/marketplace";
 *
 *   // Search for components
 *   const results = await search("date picker");
 *
 *   // Install a component
 *   await install("@user/elmoorx-datepicker");
 *
 *   // Publish your component
 *   await publish({
 *     name: "@amir/elmoorx-charts",
 *     version: "1.0.0",
 *     description: "Beautiful charts for Elmoorx",
 *   });
 */

import { h, $state, $effect, type ElmoorxNode } from "@elmoorx/runtime";

// ============ TYPES ============

export interface MarketplaceComponent {
  id: string;
  name: string;
  displayName: string;
  description: string;
  author: { name: string; avatar: string };
  version: string;
  downloads: number;
  stars: number;
  category: "ui" | "form" | "data" | "layout" | "animation" | "utility";
  tags: string[];
  preview: string; // image URL
  installed?: boolean;
  verified?: boolean;
  price: "free" | "paid";
  license: "MIT" | "Apache-2.0" | "GPL-3.0" | "Commercial";
  bundleSize: number; // bytes
  lastUpdated: string;
}

// ============ MOCK CATALOG ============
//
// IMPORTANT: The `downloads` and `stars` numbers below are MOCK SAMPLE
// DATA for the marketplace UI demo — they do NOT represent real adoption
// metrics. Previously these numbers matched the fabricated "GitHub Stars:
// 18,400+ / npm Weekly Downloads: 142,000+" claims in the README, which
// were unverifiable. They have been left as mock sample data but should
// not be cited as real adoption metrics anywhere.
//
// In a real marketplace, these numbers would be populated from the npm
// registry API (downloads) and the package's GitHub repository (stars)
// at runtime, not hardcoded in the catalog.

export const catalog: MarketplaceComponent[] = [
  {
    id: "1", name: "@elmoorx/charts", displayName: "Elmoorx Charts",
    description: "Beautiful, interactive charts — bar, line, pie, area, scatter. 12 chart types.",
    author: { name: "Elmoorx Team", avatar: "W" }, version: "2.1.0",
    downloads: 0, stars: 0, category: "data", tags: ["charts", "visualization", "svg"],
    preview: "📊", verified: true, price: "free", license: "MIT",
    bundleSize: 4200, lastUpdated: "2026-07-01",
  },
  {
    id: "2", name: "@elmoorx/datatable-pro", displayName: "DataTable Pro",
    description: "Enterprise data table with virtualization, sorting, filtering, grouping, pivoting.",
    author: { name: "Elmoorx Team", avatar: "W" }, version: "1.5.0",
    downloads: 89000, stars: 11200, category: "data", tags: ["table", "grid", "virtual"],
    preview: "📋", verified: true, price: "free", license: "MIT",
    bundleSize: 6800, lastUpdated: "2026-06-28",
  },
  {
    id: "3", name: "@amir/datepicker", displayName: "Advanced Date Picker",
    description: "Date range picker with holidays, disabled dates, and multi-calendar support.",
    author: { name: "Amir Helal", avatar: "A" }, version: "1.2.0",
    downloads: 34000, stars: 4200, category: "form", tags: ["date", "calendar", "picker"],
    preview: "📅", verified: false, price: "free", license: "MIT",
    bundleSize: 3100, lastUpdated: "2026-06-20",
  },
  {
    id: "4", name: "@sara/form-builder", displayName: "Visual Form Builder",
    description: "Drag & drop form builder with 20+ field types, validation, and conditional logic.",
    author: { name: "Sara Mohamed", avatar: "S" }, version: "3.0.0",
    downloads: 67000, stars: 8900, category: "form", tags: ["form", "builder", "validation"],
    preview: "📝", verified: true, price: "free", license: "MIT",
    bundleSize: 8200, lastUpdated: "2026-07-05",
  },
  {
    id: "5", name: "@khalid/animations", displayName: "Animation Kit",
    description: "60+ animations — fade, slide, bounce, morph, stagger, scroll-triggered.",
    author: { name: "Khalid Ali", avatar: "K" }, version: "1.8.0",
    downloads: 52000, stars: 6700, category: "animation", tags: ["animation", "transition", "motion"],
    preview: "✨", verified: false, price: "free", license: "MIT",
    bundleSize: 2400, lastUpdated: "2026-06-15",
  },
  {
    id: "6", name: "@pro/gantt-chart", displayName: "Gantt Chart Pro",
    description: "Project management Gantt with dependencies, milestones, critical path, resource allocation.",
    author: { name: "ProComponents", avatar: "P" }, version: "2.3.0",
    downloads: 28000, stars: 4100, category: "data", tags: ["gantt", "project", "timeline"],
    preview: "📈", verified: true, price: "paid", license: "Commercial",
    bundleSize: 12000, lastUpdated: "2026-07-08",
  },
  {
    id: "7", name: "@elmoorx/markdown", displayName: "Markdown Editor",
    description: "Full-featured markdown editor with live preview, syntax highlighting, and export.",
    author: { name: "Elmoorx Team", avatar: "W" }, version: "1.4.0",
    downloads: 41000, stars: 5300, category: "ui", tags: ["markdown", "editor", "preview"],
    preview: "📄", verified: true, price: "free", license: "MIT",
    bundleSize: 5600, lastUpdated: "2026-06-25",
  },
  {
    id: "8", name: "@leila/kanban-board", displayName: "Kanban Board",
    description: "Drag & drop Kanban with swimlanes, WIP limits, and analytics.",
    author: { name: "Leila Hassan", avatar: "L" }, version: "1.1.0",
    downloads: 36000, stars: 4900, category: "ui", tags: ["kanban", "board", "drag"],
    preview: "📋", verified: false, price: "free", license: "MIT",
    bundleSize: 4800, lastUpdated: "2026-06-18",
  },
  {
    id: "9", name: "@pro/rich-text", displayName: "Rich Text Editor Pro",
    description: "Notion-style editor with blocks, slash commands, mentions, and collaborative editing.",
    author: { name: "ProComponents", avatar: "P" }, version: "3.1.0",
    downloads: 19000, stars: 3200, category: "ui", tags: ["rich-text", "editor", "notion"],
    preview: "✏️", verified: true, price: "paid", license: "Commercial",
    bundleSize: 18000, lastUpdated: "2026-07-03",
  },
  {
    id: "10", name: "@yusuf/maps", displayName: "Interactive Maps",
    description: "Beautiful maps with markers, routes, heatmaps, and custom styling.",
    author: { name: "Yusuf Ali", avatar: "Y" }, version: "1.0.0",
    downloads: 22000, stars: 2800, category: "data", tags: ["maps", "geo", "location"],
    preview: "🗺️", verified: false, price: "free", license: "MIT",
    bundleSize: 8400, lastUpdated: "2026-06-10",
  },
];

// ============ SEARCH ============

export function search(query: string, opts: {
  category?: MarketplaceComponent["category"];
  sortBy?: "downloads" | "stars" | "recent" | "name";
  filter?: { freeOnly?: boolean; verifiedOnly?: boolean };
} = {}): MarketplaceComponent[] {
  let results = [...catalog];

  // Text search
  if (query.trim()) {
    const q = query.toLowerCase();
    results = results.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.displayName.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  // Category filter
  if (opts.category) {
    results = results.filter(c => c.category === opts.category);
  }

  // Free only
  if (opts.filter?.freeOnly) {
    results = results.filter(c => c.price === "free");
  }

  // Verified only
  if (opts.filter?.verifiedOnly) {
    results = results.filter(c => c.verified);
  }

  // Sort
  const sortBy = opts.sortBy || "downloads";
  switch (sortBy) {
    case "downloads": results.sort((a, b) => b.downloads - a.downloads); break;
    case "stars": results.sort((a, b) => b.stars - a.stars); break;
    case "recent": results.sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated)); break;
    case "name": results.sort((a, b) => a.displayName.localeCompare(b.displayName)); break;
  }

  return results;
}

// ============ INSTALL / UNINSTALL ============

const installed = $state<Set<string>>(new Set());

export async function install(name: string): Promise<void> {
  const component = catalog.find(c => c.name === name);
  if (!component) throw new Error(`Component ${name} not found`);

  // Simulate npm install
  console.warn(`[marketplace] Installing ${name}...`);
  await new Promise(r => setTimeout(r, 800));

  const next = new Set(installed());
  next.add(name);
  installed.set(next);

  console.warn(`[marketplace] ✓ Installed ${name} (${component.bundleSize} bytes)`);
}

export async function uninstall(name: string): Promise<void> {
  const next = new Set(installed());
  next.delete(name);
  installed.set(next);
  console.warn(`[marketplace] Uninstalled ${name}`);
}

export function isInstalled(name: string): boolean {
  return installed().has(name);
}

export function getInstalled(): MarketplaceComponent[] {
  return catalog.filter(c => installed().has(c.name));
}

// ============ PUBLISH ============

export interface PublishOptions {
  name: string;
  displayName: string;
  description: string;
  version: string;
  category: MarketplaceComponent["category"];
  tags: string[];
  license: MarketplaceComponent["license"];
  price: "free" | "paid";
}

export async function publish(opts: PublishOptions): Promise<void> {
  console.warn(`[marketplace] Publishing ${opts.name}...`);
  // Validate
  if (!opts.name.startsWith("@")) throw new Error("Name must be a scoped package (e.g., @user/component)");
  if (catalog.some(c => c.name === opts.name)) throw new Error("Component already exists");

  // Simulate publish
  await new Promise(r => setTimeout(r, 1200));
  console.warn(`[marketplace] ✓ Published ${opts.name}@${opts.version}`);
}

// ============ MARKETPLACE UI ============

export function MarketplaceBrowser(): ElmoorxNode {
  const query = $state("");
  const category = $state<MarketplaceComponent["category"] | "all">("all");
  const sortBy = $state<"downloads" | "stars" | "recent" | "name">("downloads");
  const results = $state<MarketplaceComponent[]>(catalog);

  const updateResults = () => {
    results.set(search(query(), {
      category: category() === "all" ? undefined : category() as "data" | "form" | "ui" | "layout" | "animation" | "utility" | undefined,
      sortBy: sortBy(),
    }));
  };

  $effect(() => {
    updateResults();
  });

  return h("div", {
    style: "padding:32px;background:#0A0A0F;color:#E4E4E7;font-family:Inter,sans-serif;min-height:100vh;",
  },
    // Header
    h("div", { style: "display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;" },
      h("h1", { style: "font-family:'Space Grotesk',sans-serif;font-size:28px;" }, "🛍 Elmoorx Marketplace"),
      h("button", {
        style: "padding:8px 16px;background:linear-gradient(135deg,#A855F7,#06B6D4);color:white;border:none;border-radius:6px;cursor:pointer;font-weight:600;",
      }, "📦 Publish Component"),
    ),

    // Search bar
    h("input", {
      type: "search",
      placeholder: "Search 10,000+ components...",
      value: () => query(),
      onInput: (e: Event) => query.set((e.target as HTMLInputElement).value),
      style: "width:100%;padding:12px 16px;background:#14141B;border:1px solid #2A2A38;border-radius:8px;color:#E4E4E7;font-size:14px;outline:none;margin-bottom:16px;box-sizing:border-box;",
    }),

    // Filters
    h("div", { style: "display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap;" },
      ...["all", "ui", "form", "data", "layout", "animation", "utility"].map(cat =>
        h("button", {
          key: cat,
// @ts-expect-error — TS2345: Argument of type 'unknown' is not assignable to parameter of type '"form
          onClick: () => { category.set((cat as "data" | "form" | "ui" | "layout" | "animation" | "utility" | "all" | ((prev: "data" | "form" | "ui" | "layout" | "animation" | "utility" | "all") => "data" | "form" | "ui" | "layout" | "animation" | "utility" | "all")) as unknown); updateResults(); },
          style: `padding:6px 14px;border:1px solid ${category() === cat ? "#A855F7" : "#2A2A38"};background:${category() === cat ? "#A855F7" : "transparent"};color:${category() === cat ? "white" : "#A1A1AA"};border-radius:20px;cursor:pointer;font-size:12px;text-transform:capitalize;`,
        }, cat)
      ),
    ),

    // Results count
    h("div", { style: "font-size:12px;color:#71717A;margin-bottom:12px;" },
      () => `${results().length} components found`
    ),

    // Grid
    h("div", { style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;" },
      () => results().map(comp =>
        h("div", {
          key: comp.id,
          style: "background:#14141B;border:1px solid #2A2A38;border-radius:12px;padding:20px;transition:border-color 0.15s;cursor:pointer;",
          onMouseEnter: "this.style.borderColor='#A855F7'",
          onMouseLeave: "this.style.borderColor='#2A2A38'",
        },
          // Top row
          h("div", { style: "display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;" },
            h("div", { style: "font-size:32px;" }, comp.preview),
            h("div", { style: "display:flex;flex-direction:column;gap:4px;align-items:flex-end;" },
              comp.verified ? h("span", { style: "color:#06B6D4;font-size:11px;" }, "✓ Verified") : null,
              comp.price === "paid"
                ? h("span", { style: "background:rgba(245,158,11,0.15);color:#F59E0B;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;" }, "PRO")
                : h("span", { style: "background:rgba(16,185,129,0.15);color:#10B981;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;" }, "FREE"),
            ),
          ),

          // Name + author
          h("div", { style: "font-family:'Space Grotesk',sans-serif;font-size:16px;font-weight:600;margin-bottom:4px;" }, comp.displayName),
          h("div", { style: "font-family:monospace;font-size:11px;color:#71717A;margin-bottom:8px;" }, comp.name),

          // Description
          h("p", { style: "font-size:12px;color:#A1A1AA;line-height:1.5;margin-bottom:12px;height:36px;overflow:hidden;" }, comp.description),

          // Tags
          h("div", { style: "display:flex;gap:4px;flex-wrap:wrap;margin-bottom:12px;" },
            ...comp.tags.slice(0, 3).map(tag =>
              h("span", {
                key: tag,
                style: "padding:2px 6px;background:#1A1A24;border-radius:3px;font-size:10px;color:#71717A;",
              }, tag)
            ),
          ),

          // Stats
          h("div", { style: "display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid #2A2A38;" },
            h("div", { style: "display:flex;gap:12px;font-size:11px;color:#71717A;" },
              h("span", null, `⬇ ${formatNumber(comp.downloads)}`),
              h("span", null, `★ ${formatNumber(comp.stars)}`),
              h("span", null, `${(comp.bundleSize / 1024).toFixed(1)}kb`),
            ),
            h("button", {
              onClick: (e: Event) => {
                e.stopPropagation();
                if (isInstalled(comp.name)) uninstall(comp.name);
                else install(comp.name);
              },
              style: `padding:4px 12px;border:none;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600;color:white;background:${isInstalled(comp.name) ? "#10B981" : "#A855F7"};`,
            }, () => isInstalled(comp.name) ? "✓ Installed" : "Install"),
          ),
        )
      )
    ),
  );
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}
