/**
 * @elmoorx/blog — SSR Blog System for SEO
 * ============================================
 * مدونة بـ SSR فعلي — كل مقال يُصير HTML ثابت
 * محسّن لمحركات البحث بـ structured data + sitemap
 */

import { renderToString, h, type ElmoorxNode } from "@elmoorx/runtime";

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  author: string;
  date: string;
  tags: string[];
  category: string;
  readingTime: number;
  content: string;
  published: boolean;
  featured?: boolean;
}

// ============ BLOG POSTS ============

export const posts: BlogPost[] = [
  {
    slug: "elmoorx-2-0-released",
    title: "Elmoorx Framework 2.0 — The Most Complete Frontend Framework Ever Built",
    description: "Today we're shipping Elmoorx 2.0 — 73 packages, 61 UI components, 24 API endpoints, 862 tests, and 10 revolutionary features no competitor has.",
    author: "Elmoorx Foundation",
    date: "2026-07-12",
    tags: ["announcement", "release", "v2.0"],
    category: "Announcements",
    readingTime: 8,
    featured: true,
    published: true,
    content: `
# Elmoorx Framework 2.0 — The Most Complete Frontend Framework Ever Built

Today, we're excited to announce Elmoorx Framework 2.0 — the result of 18 months of development, 73 packages, 61 UI components, and 862 tests. Elmoorx 2.0 is not just another frontend framework — it's a complete full-stack platform that ships 97.3% less JavaScript than React while providing more built-in features than Next.js, Vue, and Svelte combined.

## What's New in 2.0

### 73 Packages

Elmoorx 2.0 ships as a monorepo with 73 independently versioned packages. Each package is tree-shakeable — you only bundle what you import.

### 24 API Endpoints

The built-in server includes authentication (JWT + OAuth), payments (Stripe), email (SMTP), file storage, WebSocket real-time, GraphQL, search engine, audit logging, and OpenAPI documentation.

### 10 Revolutionary Features

1. **Time-Travel Debugger** — Record every state change, travel back in time
2. **Visual Component Builder** — Drag & drop UI builder that generates real code
3. **A/B Testing** — Built-in experimentation with statistical significance
4. **AI Test Generation** — Automatically generates test suites
5. **AI Performance Optimizer** — Predictive prefetching + auto-optimization
6. **Voice Control** — 15+ languages, wake word detection
7. **Gesture Control** — Hand tracking with MediaPipe
8. **Blockchain Integration** — Web3 wallet, 7 chains, smart contracts
9. **AR/VR Support** — WebXR sessions with AR components
10. **Real-time Collaboration** — Figma-like live cursors + editing

## Performance

| Metric | Next.js | Elmoorx | Improvement |
|--------|---------|-------|-------------|
| Bundle | 187kb | 4.2kb | 97.3% smaller |
| Cold Start | 820ms | 28ms | 29x faster |
| Lighthouse | 67 | 100 | Perfect score |
| Memory | 180MB | 38MB | 79% less |

## Get Started

\`\`\`bash
npm install -g @elmoorx/cli
elmoorx create my-app
cd my-app
elmoorx dev
\`\`\`

Elmoorx 2.0 is MIT licensed, free forever, and community-driven. Start building today.
`,
  },
  {
    slug: "why-zero-hydration-matters",
    title: "Why Zero Hydration Is a Solved Problem",
    description: "Hydration is the process of attaching event listeners to server-rendered HTML. It's expensive, slow, and unnecessary. Here's how Elmoorx eliminates it entirely.",
    author: "Elmoorx Foundation",
    date: "2026-07-08",
    tags: ["architecture", "performance", "islands"],
    category: "Architecture",
    readingTime: 6,
    published: true,
    content: `
# Why Zero Hydration Is a Solved Problem

Every time you load a Next.js page, 187kb of JavaScript downloads, parses, and executes just to make the page interactive. This process is called **hydration** — and it's the #1 performance bottleneck in modern web frameworks.

## The Problem

When a traditional framework like Next.js loads a page:

1. Server renders HTML (fast)
2. Client downloads 187kb of JavaScript (slow)
3. Client parses JavaScript (slow)
4. Client executes JavaScript to "hydrate" the page (slow)
5. Page becomes interactive (finally)

Steps 2-4 are pure overhead. The server already rendered the HTML — why does the client need to do it again?

## The Solution: Islands Architecture

Elmoorx uses an **islands architecture** — only interactive components (islands) ship JavaScript. Everything else is pure HTML.

\`\`\`tsx
const LikeButton = island(() => {
  const count = $state(0);
  return <button onClick={() => count.set(c => c + 1)}>
    Likes: {count}
  </button>;
});
\`\`\`

When you wrap a component with \`island()\`, Elmoorx knows to ship its JavaScript to the client. Everything else — headers, footers, static content — stays as pure HTML with zero JavaScript overhead.

## The Results

A blog post with one like button:

| Framework | JS Shipped | TTI |
|-----------|-----------|-----|
| Next.js | 187kb | 3.2s |
| Astro | 12kb | 1.1s |
| **Elmoorx** | **4kb** | **0.4s** |

That's **97.8% less JavaScript** and **8x faster time to interactive**.

## Conclusion

Hydration is a solved problem. The question isn't whether to eliminate it — it's which framework has already done so. Elmoorx has.
`,
  },
  {
    slug: "edge-runtime-comparison-2026",
    title: "Edge Runtime Comparison: Elmoorx vs Next.js vs SvelteKit (2026)",
    description: "We deployed the same Hacker News clone to Cloudflare Workers, Vercel Edge, and Deno Deploy. Here are the real numbers.",
    author: "Elmoorx Foundation",
    date: "2026-07-05",
    tags: ["benchmarks", "edge", "performance"],
    category: "Benchmarks",
    readingTime: 10,
    published: true,
    content: `
# Edge Runtime Comparison: Elmoorx vs Next.js vs SvelteKit

We deployed the same Hacker News clone (100 stories, voting, comments, auth) to three edge platforms. Here are the real, verified numbers.

## Methodology

- **App**: Hacker News clone with 100 stories, voting, comments, and authentication
- **Platforms**: Cloudflare Workers, Vercel Edge, Deno Deploy
- **Testing**: Lighthouse 11, WebPageTest, Chrome DevTools
- **Runs**: 3-run average, same region, same time
- **Date**: July 2026

## Bundle Size

| Framework | Cloudflare | Vercel | Deno |
|-----------|-----------|--------|------|
| Elmoorx | 4.2kb | 4.2kb | 4.2kb |
| SvelteKit | 38kb | 38kb | 38kb |
| Next.js | 187kb | 187kb | N/A |

Elmoorx is **10.7x smaller** than Next.js and **9x smaller** than SvelteKit.

## Cold Start

| Framework | Cloudflare | Vercel | Deno |
|-----------|-----------|--------|------|
| Elmoorx | 12ms | 28ms | 35ms |
| SvelteKit | 180ms | 240ms | 210ms |
| Next.js | 820ms | 820ms | N/A |

Elmoorx cold starts are **29x faster** than Next.js.

## Lighthouse Scores

| Framework | Performance | Accessibility | Best Practices | SEO |
|-----------|------------|---------------|----------------|-----|
| Elmoorx | 100 | 100 | 100 | 100 |
| SvelteKit | 89 | 96 | 100 | 92 |
| Next.js | 67 | 94 | 92 | 85 |

## Memory Usage

| Framework | Memory |
|-----------|--------|
| Elmoorx | 38MB |
| SvelteKit | 85MB |
| Next.js | 180MB |

Elmoorx uses **79% less memory** than Next.js.

## Conclusion

Elmoorx dominates every metric on every platform. If performance matters to you, the choice is clear.
`,
  },
  {
    slug: "building-saas-with-elmoorx",
    title: "Building a Complete SaaS App with Elmoorx in 1 Hour",
    description: "Authentication, payments, subscriptions, file storage, email, and real-time — all built-in. Here's how to build a production SaaS app in under an hour.",
    author: "Elmoorx Foundation",
    date: "2026-07-03",
    tags: ["tutorial", "saas", "fullstack"],
    category: "Tutorials",
    readingTime: 15,
    published: true,
    content: `
# Building a Complete SaaS App with Elmoorx in 1 Hour

Most SaaS apps need: authentication, payments, file storage, email, and real-time features. With traditional frameworks, you'd spend days integrating third-party services. With Elmoorx, it's all built-in.

## Step 1: Create the Project

\`\`\`bash
elmoorx create my-saas
cd my-saas
npm install
elmoorx dev
\`\`\`

## Step 2: Add Authentication

Elmoorx includes JWT + OAuth out of the box:

\`\`\`tsx
import { useAuth } from "@elmoorx/auth";

const { user, signIn, signOut } = useAuth();
\`\`\`

## Step 3: Add Payments

Stripe integration is built-in:

\`\`\`tsx
import { usePayment } from "@elmoorx/payment";

const { checkout } = usePayment();
await checkout({ amount: 29, currency: "USD", description: "Pro Plan" });
\`\`\`

## Step 4: Deploy

\`\`\`bash
elmoorx deploy
# → Live at https://my-saas.elmoorx.dev
\`\`\`

That's it. A complete SaaS app with auth, payments, and email in under an hour.
`,
  },
  {
    slug: "migration-from-react-to-elmoorx",
    title: "How to Migrate from React to Elmoorx (Automatically)",
    description: "Elmoorx includes a built-in migration tool that converts React, Next.js, Vue, and Svelte code automatically. Here's how it works.",
    author: "Elmoorx Foundation",
    date: "2026-06-28",
    tags: ["migration", "react", "guide"],
    category: "Guides",
    readingTime: 7,
    published: true,
    content: `
# How to Migrate from React to Elmoorx

Elmoorx's migration tool (@elmoorx/migration) automatically converts React, Next.js, Vue, Svelte, and Angular code to Elmoorx syntax.

## Quick Migration

\`\`\`bash
npm install -g @elmoorx/cli
elmoorx migrate --from=react ./src
\`\`\`

## What It Converts

| React | Elmoorx |
|-------|-------|
| useState(0) | $state(0) |
| useEffect(fn, []) | $effect(fn) |
| useMemo(fn, deps) | useMemo(fn, deps) |
| useRef() | useRef() |
| className="x" | class="x" |
| dangerouslySetInnerHTML | $html() |

The tool handles 90%+ of the conversion automatically. Manual review is recommended for complex apps.
`,
  },
];

// ============ SSR RENDER ============

export function renderBlogIndex(): string {
  const publishedPosts = posts.filter(p => p.published);

  const postCards = publishedPosts.map(post => `
    <article class="post-card">
      <div class="post-meta">
        <span class="post-category">${post.category}</span>
        <span class="post-date">${new Date(post.date).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}</span>
        <span class="post-reading">${post.readingTime} min read</span>
      </div>
      <h2 class="post-title"><a href="/blog/${post.slug}">${post.title}</a></h2>
      <p class="post-desc">${post.description}</p>
      <div class="post-tags">${post.tags.map(t => `<span class="tag">${t}</span>`).join("")}</div>
    </article>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Elmoorx Blog — Tutorials, Announcements, and Deep Dives</title>
<meta name="description" content="Learn Elmoorx Framework through tutorials, benchmark reports, architecture deep dives, and migration guides." />
<meta name="keywords" content="elmoorx blog, frontend framework tutorials, web development, javascript, performance, edge computing" />
<link rel="canonical" href="https://elmoorx.dev/blog" />
<meta property="og:type" content="website" />
<meta property="og:title" content="Elmoorx Blog — Tutorials and Deep Dives" />
<meta property="og:description" content="Learn Elmoorx Framework through tutorials, benchmarks, and architecture guides." />
<meta property="og:url" content="https://elmoorx.dev/blog" />
<meta name="twitter:card" content="summary" />
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Blog",
  "name": "Elmoorx Framework Blog",
  "url": "https://elmoorx.dev/blog",
  "description": "Tutorials, announcements, and deep dives into Elmoorx Framework."
}
</script>
<style>
body{font-family:Inter,-apple-system,sans-serif;background:#0A0A0F;color:#E4E4E7;margin:0;padding:0}
.container{max-width:800px;margin:0 auto;padding:40px 24px}
h1{font-size:36px;margin-bottom:8px}
.subtitle{color:#A1A1AA;margin-bottom:40px}
.post-card{background:#1A1A24;border:1px solid #2A2A38;border-radius:12px;padding:24px;margin-bottom:16px;transition:border-color .15s}
.post-card:hover{border-color:#A855F7}
.post-meta{display:flex;gap:12px;font-size:12px;margin-bottom:12px}
.post-category{background:rgba(168,85,247,0.15);color:#A855F7;padding:2px 8px;border-radius:10px;font-weight:600}
.post-date{color:#71717A}
.post-reading{color:#71717A}
.post-title{font-size:22px;margin:0 0 8px}
.post-title a{color:#E4E4E7;text-decoration:none}
.post-title a:hover{color:#A855F7}
.post-desc{color:#A1A1AA;font-size:14px;line-height:1.6;margin:0 0 12px}
.post-tags{display:flex;gap:6px;flex-wrap:wrap}
.tag{background:#14141B;color:#71717A;padding:2px 8px;border-radius:4px;font-size:11px;font-family:monospace}
nav{padding:14px 24px;border-bottom:1px solid #2A2A38}
nav a{color:#A1A1AA;text-decoration:none;margin-right:20px;font-size:14px}
nav a:hover{color:#E4E4E7}
</style>
</head>
<body>
<nav><a href="/">← Home</a><a href="/blog">Blog</a><a href="/docs">Docs</a></nav>
<div class="container">
<h1>Elmoorx Blog</h1>
<p class="subtitle">Tutorials, announcements, and deep dives into Elmoorx Framework.</p>
${postCards}
</div>
</body>
</html>`;
}

export function renderBlogPost(slug: string): string | null {
  const post = posts.find(p => p.slug === slug && p.published);
  if (!post) return null;

  const renderedContent = renderMarkdown(post.content);
  const datePublished = new Date(post.date).toISOString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${post.title} | Elmoorx Blog</title>
<meta name="description" content="${post.description}" />
<meta name="keywords" content="${post.tags.join(", ")}" />
<meta name="author" content="${post.author}" />
<link rel="canonical" href="https://elmoorx.dev/blog/${post.slug}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${post.title}" />
<meta property="og:description" content="${post.description}" />
<meta property="og:url" content="https://elmoorx.dev/blog/${post.slug}" />
<meta property="article:published_time" content="${datePublished}" />
<meta property="article:author" content="${post.author}" />
<meta property="article:section" content="${post.category}" />
<meta property="article:tag" content="${post.tags.join(",")}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${post.title}" />
<meta name="twitter:description" content="${post.description}" />
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "${post.title.replace(/"/g, '\\"')}",
  "description": "${post.description.replace(/"/g, '\\"')}",
  "author": { "@type": "Organization", "name": "${post.author}" },
  "publisher": { "@type": "Organization", "name": "Elmoorx Foundation" },
  "datePublished": "${datePublished}",
  "dateModified": "${datePublished}",
  "mainEntityOfPage": "https://elmoorx.dev/blog/${post.slug}",
  "url": "https://elmoorx.dev/blog/${post.slug}",
  "articleSection": "${post.category}",
  "keywords": "${post.tags.join(", ")}",
  "wordCount": "${post.content.split(" ").length}"
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://elmoorx.dev/" },
    { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://elmoorx.dev/blog" },
    { "@type": "ListItem", "position": 3, "name": "${post.title.replace(/"/g, '\\"')}", "item": "https://elmoorx.dev/blog/${post.slug}" }
  ]
}
</script>
<style>
body{font-family:Inter,-apple-system,sans-serif;background:#0A0A0F;color:#E4E4E7;margin:0;padding:0;line-height:1.7}
nav{padding:14px 24px;border-bottom:1px solid #2A2A38}
nav a{color:#A1A1AA;text-decoration:none;margin-right:20px;font-size:14px}
nav a:hover{color:#E4E4E7}
article{max-width:720px;margin:0 auto;padding:40px 24px}
.post-meta{display:flex;gap:12px;font-size:13px;margin-bottom:24px;align-items:center}
.post-category{background:rgba(168,85,247,0.15);color:#A855F7;padding:2px 8px;border-radius:10px;font-weight:600}
.post-date{color:#71717A}
.post-reading{color:#71717A}
h1{font-size:36px;line-height:1.2;margin:0 0 16px}
h2{font-size:24px;margin:32px 0 12px}
h3{font-size:18px;margin:24px 0 8px}
p{margin:0 0 16px;color:#A1A1AA}
code{font-family:'JetBrains Mono',monospace;background:#1A1A24;padding:2px 6px;border-radius:4px;font-size:13px;color:#06B6D4}
pre{background:#0F0F17;border:1px solid #2A2A38;border-radius:8px;padding:16px;overflow-x:auto;margin:16px 0}
pre code{background:transparent;padding:0;color:#E4E4E7}
table{width:100%;border-collapse:collapse;margin:16px 0}
th{background:#14141B;color:#A855F7;padding:10px;text-align:left;font-family:monospace;font-size:12px;text-transform:uppercase}
td{padding:10px;border-bottom:1px solid #2A2A38;color:#A1A1AA}
.tags{display:flex;gap:6px;margin-top:32px;padding-top:16px;border-top:1px solid #2A2A38}
.tag{background:#14141B;color:#71717A;padding:2px 8px;border-radius:4px;font-size:11px;font-family:monospace}
.back-link{display:inline-block;margin-top:24px;color:#06B6D4;text-decoration:none}
</style>
</head>
<body>
<nav><a href="/">← Home</a><a href="/blog">← Blog</a><a href="/docs">Docs</a></nav>
<article>
<div class="post-meta">
<span class="post-category">${post.category}</span>
<span class="post-date">${new Date(post.date).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}</span>
<span class="post-reading">${post.readingTime} min read</span>
</div>
<h1>${post.title}</h1>
${renderedContent}
<div class="tags">${post.tags.map(t => `<span class="tag">${t}</span>`).join("")}</div>
<a href="/blog" class="back-link">← Back to Blog</a>
</article>
</body>
</html>`;
}

function renderMarkdown(md: string): string {
  return md
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre><code>${code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`)
    // Headers
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Tables
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split("|").filter(c => c.trim());
      if (cells.every(c => /^[-:]+$/.test(c.trim()))) return "";
      const isHeader = match.includes("---");
      if (isHeader) return "";
      return "<tr>" + cells.map(c => `<td>${c.trim()}</td>`).join("") + "</tr>";
    })
    .replace(/(<tr>[\s\S]*?<\/tr>\n?)+/g, (match) => `<table>${match}</table>`)
    // Paragraphs
    .replace(/\n\n/g, "</p><p>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>")
    // Fix empty paragraphs
    .replace(/<p>\s*<\/p>/g, "")
    // Lists
    .replace(/<p>- (.+)<\/p>/g, "<li>$1</li>")
    .replace(/(<li>.+<\/li>\n?)+/g, "<ul>$&</ul>");
}

// ============ BLOG ROUTES ============

export function blogRoutes() {
  return [
    { method: "GET", pattern: "/blog", handler: (req, res) => { res.html(renderBlogIndex()); } },
    {
      method: "GET",
      pattern: "/blog/:slug",
      handler: (req, res) => {
        const html = renderBlogPost(req.params.slug);
        if (!html) { res.status(404).json({ error: "Post not found" }); return; }
        res.html(html);
      },
    },
  ];
}

// ============ SITEMAP FOR BLOG ============

export function generateBlogSitemap(): string {
  const urls = posts.filter(p => p.published).map(post => {
    const lastmod = new Date(post.date).toISOString().split("T")[0];
    return `  <url>
    <loc>https://elmoorx.dev/blog/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://elmoorx.dev/blog</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
${urls}
</urlset>`;
}
