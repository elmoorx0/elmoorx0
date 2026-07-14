/**
 * Elmoorx Blog Example
 * ============================================
 * Markdown-powered blog with post list, post detail view,
 * and SSR-ready rendering. Demonstrates routing + $store.
 */

import { $store, $state, h } from "@elmoorx/runtime";

interface Post {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  tags: string[];
  readTime: number;
}

const POSTS: Post[] = [
  {
    id: "getting-started",
    title: "Getting Started with Elmoorx",
    excerpt: "Learn how to build your first Elmoorx app — from installation to deployment.",
    content: "# Getting Started\n\nWelcome to Elmoorx! This guide will walk you through...",
    author: "Ahmed Hassan",
    date: "2026-07-10",
    tags: ["tutorial", "beginner"],
    readTime: 5,
  },
  {
    id: "signals-explained",
    title: "Signals Explained: How Elmoorx Achieves Surgical Updates",
    excerpt: "Deep dive into the signal-based reactivity system that powers Elmoorx.",
    content: "# Signals Explained\n\nSignals are the foundation of Elmoorx reactivity...",
    author: "Sara Mohamed",
    date: "2026-07-08",
    tags: ["deep-dive", "reactivity"],
    readTime: 8,
  },
  {
    id: "zero-hydration",
    title: "Zero-Hydration Islands: Ship Less JavaScript",
    excerpt: "How islands architecture reduces JS payload by 97% compared to Next.js.",
    content: "# Zero-Hydration Islands\n\nThe key insight: most pages are static...",
    author: "Khalid Al-Rashid",
    date: "2026-07-05",
    tags: ["performance", "architecture"],
    readTime: 6,
  },
];

const blogStore = $store<{ currentPost: Post | null; searchQuery: string }>({
  currentPost: null,
  searchQuery: "",
});

function selectPost(post: Post) {
  blogStore.currentPost = post;
}

function backToList() {
  blogStore.currentPost = null;
}

function filteredPosts(): Post[] {
  const q = blogStore.searchQuery.toLowerCase();
  if (!q) return POSTS;
  return POSTS.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.excerpt.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
  );
}

function PostCard(post: Post): any {
  return h("article", {
    style: "background:white; border:1px solid #e2e8f0; border-radius:8px; padding:24px; cursor:pointer; transition:all 0.2s;",
    onClick: () => selectPost(post),
  },
    h("div", { style: "display:flex; gap:8px; margin-bottom:8px;" },
      ...post.tags.map((tag) =>
        h("span", {
          style: "padding:2px 8px; background:#ede9fe; color:#6366f1; border-radius:4px; font-size:12px;",
        }, tag)
      )
    ),
    h("h2", { style: "margin:0 0 8px; color:#1e293b;" }, post.title),
    h("p", { style: "color:#64748b; margin:0 0 16px;" }, post.excerpt),
    h("div", { style: "display:flex; justify-content:space-between; color:#94a3b8; font-size:14px;" },
      h("span", null, `By ${post.author}`),
      h("span", null, `${post.readTime} min read · ${post.date}`)
    )
  );
}

function PostDetail(post: Post): any {
  return h("article", { style: "max-width:720px; margin:0 auto; padding:24px; font-family:sans-serif;" },
    h("button", {
      onClick: backToList,
      style: "background:none; border:none; color:#6366f1; cursor:pointer; margin-bottom:24px; font-size:14px;",
    }, "← Back to all posts"),
    h("h1", { style: "color:#1e293b; margin-bottom:8px;" }, post.title),
    h("div", { style: "color:#94a3b8; margin-bottom:32px;" },
      `By ${post.author} · ${post.date} · ${post.readTime} min read`
    ),
    h("div", { style: "color:#334155; line-height:1.8;" },
      // Simplified markdown rendering — split by lines
      ...post.content.split("\n").map((line) =>
        line.startsWith("# ")
          ? h("h2", { style: "color:#1e293b; margin:24px 0 12px;" }, line.slice(2))
          : h("p", { style: "margin:8px 0;" }, line)
      )
    )
  );
}

function Blog(): any {
  return h("div", { style: "min-height:100vh; background:#f8fafc;" },
    // Header
    h("header", {
      style: "background:white; border-bottom:1px solid #e2e8f0; padding:16px 24px; position:sticky; top:0; z-index:10;",
    },
      h("div", { style: "max-width:960px; margin:0 auto; display:flex; justify-content:space-between; align-items:center;" },
        h("h1", {
          style: "margin:0; color:#6366f1; cursor:pointer;",
          onClick: backToList,
        }, "📝 Elmoorx Blog"),
        h("input", {
          type: "search",
          placeholder: "Search posts...",
          value: blogStore.searchQuery,
          onInput: (e: Event) => {
            blogStore.searchQuery = (e.target as HTMLInputElement).value;
          },
          style: "padding:8px 16px; border:1px solid #e2e8f0; border-radius:6px; width:300px;",
        })
      )
    ),
    // Content
    h("main", { style: "padding:32px 24px;" },
      () => blogStore.currentPost
        ? h(PostDetail, { post: blogStore.currentPost })
        : h("div", { style: "max-width:960px; margin:0 auto; display:grid; gap:16px;" },
            ...filteredPosts().map((post) => h(PostCard, { post }))
          )
    )
  );
}

export { Blog };
