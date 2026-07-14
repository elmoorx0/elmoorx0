/**
 * @elmoorx/templates — Production starter templates
 * ============================================
 * Scaffold production-ready apps with one command.
 *
 *   elmoorx create my-blog --template=blog
 *   elmoorx create my-dashboard --template=dashboard
 *   elmoorx create my-shop --template=ecommerce
 */

export interface Template {
  name: string;
  description: string;
  files: { path: string; content: string }[];
  dependencies: string[];
  features: string[];
}

// ============ BLOG TEMPLATE ============

export const blogTemplate: Template = {
  name: "blog",
  description: "Markdown blog with SSG, RSS feed, and syntax highlighting",
  features: ["SSG", "Markdown", "RSS", "Syntax highlighting", "Tags", "Search"],
  dependencies: ["@elmoorx/runtime", "@elmoorx/router", "@elmoorx/head", "@elmoorx/server"],
  files: [
    {
      path: "src/index.elmoorx.tsx",
      content: `import { h } from "@elmoorx/runtime";
import { Link } from "@elmoorx/router";
import { Title, Meta } from "@elmoorx/head";
import { getAllPosts } from "../lib/posts";

export default function Home({ posts }) {
  return h("main", null,
    h(Title, null, "My Elmoorx Blog"),
    h(Meta, { name: "description", content: "A blog built with Elmoorx" }),
    h("h1", null, "Latest Posts"),
    h("ul", null,
      ...posts.map(post =>
        h("li", { key: post.slug },
          h(Link, { to: \`/posts/\${post.slug}\` }, post.title),
          h("time", null, post.date),
        )
      )
    )
  );
}

export async function getStaticProps() {
  const posts = await getAllPosts();
  return { props: { posts } };
}`,
    },
    {
      path: "src/posts/[slug].elmoorx.tsx",
      content: `import { h } from "@elmoorx/runtime";
import { Title, Meta, OpenGraph } from "@elmoorx/head";
import { getPost, getAllSlugs } from "../../lib/posts";

export default function Post({ post }) {
  return h("article", null,
    h(Title, null, post.title),
    h(Meta, { name: "description", content: post.excerpt }),
    h(OpenGraph, { title: post.title, description: post.excerpt, type: "article" }),
    h("h1", null, post.title),
    h("time", null, post.date),
    h("div", { class: "content" }, post.html),
  );
}

export async function getStaticPaths() {
  const slugs = await getAllSlugs();
  return { paths: slugs.map(slug => ({ params: { slug } })) };
}

export async function getStaticProps({ params }) {
  const post = await getPost(params.slug);
  return { props: { post } };
}`,
    },
    {
      path: "lib/posts.ts",
      content: `import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const POSTS_DIR = join(process.cwd(), "content");

export async function getAllPosts() {
  const files = await readdir(POSTS_DIR);
  const posts = await Promise.all(
    files.filter(f => f.endsWith(".md")).map(async file => {
      const content = await readFile(join(POSTS_DIR, file), "utf-8");
      const { frontmatter, body } = parseFrontmatter(content);
      return { ...frontmatter, slug: file.replace(".md", ""), body };
    })
  );
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPost(slug: string) {
  const content = await readFile(join(POSTS_DIR, \`\${slug}.md\`), "utf-8");
  const { frontmatter, body } = parseFrontmatter(content);
  return { ...frontmatter, slug, html: renderMarkdown(body) };
}

export async function getAllSlugs() {
  const files = await readdir(POSTS_DIR);
  return files.filter(f => f.endsWith(".md")).map(f => f.replace(".md", ""));
}

function parseFrontmatter(content: string) {
  const match = content.match(/^---\\n([\\s\\S]*?)\\n---\\n([\\s\\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };
  const [, yaml, body] = match;
  const frontmatter = Object.fromEntries(
    yaml.split("\\n").map(line => {
      const [key, ...value] = line.split(":");
      return [key.trim(), value.join(":").trim()];
    })
  );
  return { frontmatter, body };
}

function renderMarkdown(md: string): string {
  // Simplified — use a real markdown parser in production
  return md
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/\\*\\*(.+?)\\*\\*/g, "<strong>$1</strong>")
    .replace(/\\[(.+?)\\]\\((.+?)\\)/g, '<a href="$2">$1</a>')
    .replace(/\\n/g, "<br>");
}`,
    },
    {
      path: "content/hello-world.md",
      content: `---
title: Hello World
date: 2026-07-10
excerpt: My first post on Elmoorx
---

# Welcome to my blog!

This is my first post built with **Elmoorx Framework**. It's fast, secure, and edge-ready.

[Visit Elmoorx](https://elmoorx.dev)`,
    },
  ],
};

// ============ DASHBOARD TEMPLATE ============

export const dashboardTemplate: Template = {
  name: "dashboard",
  description: "Admin dashboard with charts, tables, and auth",
  features: ["Auth", "Charts", "Data tables", "Dark mode", "Real-time", "CRUD"],
  dependencies: ["@elmoorx/runtime", "@elmoorx/router", "@elmoorx/ui", "@elmoorx/realtime", "@elmoorx/edge-db"],
  files: [
    {
      path: "src/index.elmoorx.tsx",
      content: `import { h, $store } from "@elmoorx/runtime";
import { Stat, Card, Progress, Badge } from "@elmoorx/ui";
import { useFetch } from "@elmoorx/runtime";

export default function Dashboard() {
  const { data: stats } = useFetch("/api/stats");

  return h("div", { class: "dashboard" },
    h("h1", null, "Dashboard"),
    h("div", { class: "stats-grid" },
      h(Stat, { label: "Revenue", value: "$12,345", trend: { value: 12, positive: true } }),
      h(Stat, { label: "Users", value: "1,234", trend: { value: 8, positive: true } }),
      h(Stat, { label: "Orders", value: "89", trend: { value: 3, positive: false } }),
      h(Stat, { label: "Churn", value: "2.1%", trend: { value: 0.5, positive: false } }),
    ),
    h(Card, { title: "Monthly Revenue" },
      h(Progress, { value: 75, showLabel: true }),
    ),
  );
}`,
    },
    {
      path: "src/api/stats.ts",
      content: `import { json } from "@elmoorx/server/api";

export async function GET() {
  return json({
    revenue: 12345,
    users: 1234,
    orders: 89,
    churn: 2.1,
  });
}`,
    },
  ],
};

// ============ E-COMMERCE TEMPLATE ============

export const ecommerceTemplate: Template = {
  name: "ecommerce",
  description: "Online store with cart, checkout, and product management",
  features: ["Cart", "Checkout", "Products", "Search", "Stripe", "Inventory"],
  dependencies: ["@elmoorx/runtime", "@elmoorx/router", "@elmoorx/ui", "@elmoorx/forms", "@elmoorx/edge-db"],
  files: [
    {
      path: "src/index.elmoorx.tsx",
      content: `import { h, $store, island } from "@elmoorx/runtime";
import { Button, Card, Badge } from "@elmoorx/ui";

const cart = $store({ items: [], total: 0 });

const ProductCard = island((props: { product: any }) => {
  const addToCart = () => {
    cart.items.push({ ...props.product, qty: 1 });
    cart.total = cart.items.reduce((s, i) => s + i.price * i.qty, 0);
  };

  return h(Card, { title: props.product.name, hover: true },
    h("img", { src: props.product.image, alt: props.product.name, style: "width:100%;height:200px;object-fit:cover;" }),
    h("p", null, props.product.description),
    h("div", { style: "display:flex;justify-content:space-between;align-items:center" },
      h("span", { style: "font-size:20px;font-weight:700" }, \`$\${props.product.price}\`),
      h(Badge, { variant: props.product.inStock ? "success" : "danger" },
        props.product.inStock ? "In Stock" : "Sold Out"
      ),
    ),
    h(Button, { onClick: addToCart, fullWidth: true, disabled: !props.product.inStock },
      "Add to Cart"
    ),
  );
});

export default function Store({ products }) {
  return h("main", null,
    h("h1", null, "My Store"),
    h("div", { class: "products-grid" },
      ...products.map(p => h(ProductCard, { key: p.id, product: p }))
    )
  );
}`,
    },
    {
      path: "src/cart.elmoorx.tsx",
      content: `import { h } from "@elmoorx/runtime";
import { Button, Card } from "@elmoorx/ui";

export default function Cart({ cart }) {
  return h(Card, { title: "Shopping Cart" },
    h("ul", null,
      ...cart.items.map(item =>
        h("li", { key: item.id },
          h("span", null, item.name),
          h("span", null, \`$\${item.price} × \${item.qty}\`),
        )
      )
    ),
    h("div", { style: "margin-top:16px;padding-top:16px;border-top:1px solid #ccc" },
      h("strong", null, \`Total: $\${cart.total}\`),
    ),
    h(Button, { variant: "primary", fullWidth: true }, "Checkout"),
  );
}`,
    },
  ],
};

// ============ PORTFOLIO TEMPLATE ============

export const portfolioTemplate: Template = {
  name: "portfolio",
  description: "Personal portfolio with projects, blog, and contact form",
  features: ["Projects", "Blog", "Contact form", "Dark mode", "SEO"],
  dependencies: ["@elmoorx/runtime", "@elmoorx/router", "@elmoorx/head", "@elmoorx/forms", "@elmoorx/ui"],
  files: [
    {
      path: "src/index.elmoorx.tsx",
      content: `import { h } from "@elmoorx/runtime";
import { Title, Meta, OpenGraph } from "@elmoorx/head";
import { Card, Button, Badge } from "@elmoorx/ui";

export default function Home() {
  return h("main", null,
    h(Title, null, "Amir Helal — Full Stack Developer"),
    h(Meta, { name: "description", content: "Portfolio of Amir Helal" }),
    h(OpenGraph, { title: "Amir Helal", type: "profile" }),

    h("section", { id: "hero" },
      h("h1", null, "Hi, I'm Amir 👋"),
      h("p", null, "Full stack developer specializing in Elmoorx, Edge computing, and AI."),
      h(Button, { variant: "primary" }, "Get in touch"),
    ),

    h("section", { id: "projects" },
      h("h2", null, "Projects"),
      h("div", { class: "grid" },
        h(Card, { title: "Elmoorx Framework", hover: true },
          h(Badge, { variant: "primary" }, "Open Source"),
          h("p", null, "A 4kb frontend framework"),
        ),
      ),
    ),
  );
}`,
    },
  ],
};

// ============ SAAS TEMPLATE ============

export const saasTemplate: Template = {
  name: "saas",
  description: "SaaS app with multi-tenancy, billing, and team management",
  features: ["Multi-tenant", "Billing", "Teams", "Auth", "API keys", "Webhooks"],
  dependencies: ["@elmoorx/runtime", "@elmoorx/router", "@elmoorx/server", "@elmoorx/edge-db", "@elmoorx/ui", "@elmoorx/forms"],
  files: [
    {
      path: "src/index.elmoorx.tsx",
      content: `import { h } from "@elmoorx/runtime";
import { useNavigation } from "@elmoorx/router";
import { Card, Button, Badge } from "@elmoorx/ui";

export default function SaaSApp() {
  return h("div", { class: "app" },
    h("nav", null,
      h("a", { href: "/dashboard" }, "Dashboard"),
      h("a", { href: "/team" }, "Team"),
      h("a", { href: "/billing" }, "Billing"),
      h("a", { href: "/settings" }, "Settings"),
    ),
    h("main", null,
      h("h1", null, "Welcome to your SaaS"),
      h(Card, { title: "Your Plan" },
        h(Badge, { variant: "success" }, "Pro"),
        h("p", null, "Next billing: Aug 10, 2026"),
        h(Button, { variant: "outline" }, "Upgrade"),
      ),
    ),
  );
}`,
    },
  ],
};

// ============ ALL TEMPLATES ============

export const templates: Record<string, Template> = {
  blog: blogTemplate,
  dashboard: dashboardTemplate,
  ecommerce: ecommerceTemplate,
  portfolio: portfolioTemplate,
  saas: saasTemplate,
};

export const templateList = Object.values(templates);

/**
 * Get a template by name.
 */
export function getTemplate(name: string): Template | null {
  return templates[name] || null;
}

/**
 * List all available templates.
 */
export function listTemplates(): { name: string; description: string; features: string[] }[] {
  return templateList.map(t => ({ name: t.name, description: t.description, features: t.features }));
}
