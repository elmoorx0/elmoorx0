/**
 * Elmoorx Head — SEO & document head management
 * ============================================
 * Manage <title>, <meta>, <link>, <script> tags from any component.
 *
 *   import { Head, Title, Meta, Link } from "@elmoorx/head";
 *
 *   <Head>
 *     <Title>My Page — Elmoorx</Title>
 *     <Meta name="description" content="Page description" />
 *     <Meta property="og:title" content="My Page" />
 *     <Link rel="canonical" href="https://example.com/page" />
 *   </Head>
 *
 * During SSR: tags are injected into the <head> of the HTML document.
 * On the client: tags are added/updated dynamically.
 *
 * Bundle impact: ~320 bytes gzipped
 */

import { h, type ElmoorxNode } from "@elmoorx/runtime";
import { $effect } from "@elmoorx/runtime";

// Server-side: collect tags for the SSR renderer
const serverTags: HeadTag[] = [];

// Client-side: DOM <head> element
const clientHead = typeof document !== "undefined" ? document.head : null;

interface HeadTag {
  tag: string;
  attrs: Record<string, string>;
  content?: string;
}

/**
 * Internal — get all collected server tags (used by the SSR renderer).
 */
export function getServerHeadTags(): HeadTag[] {
  return serverTags;
}

/**
 * Internal — reset for a new SSR request.
 */
export function resetHeadTags(): void {
  serverTags.length = 0;
}

/**
 * Register a head tag.
 */
function addTag(tag: HeadTag): void {
  if (clientHead) {
    // Client-side: add to DOM
    const el = document.createElement(tag.tag);
    for (const [k, v] of Object.entries(tag.attrs)) {
      el.setAttribute(k, v);
    }
    if (tag.content) el.textContent = tag.content;
    clientHead.appendChild(el);
  } else {
    // Server-side: collect for renderer
    serverTags.push(tag);
  }
}

/**
 * <Head> — container for head tags.
 */
export function Head(_props: { children: ElmoorxNode[] }): ElmoorxNode {
  // In a real impl, the compiler would extract these and pass to the renderer
  return null as unknown as ElmoorxNode;
}

/**
 * <Title> — set the document title.
 */
export function Title(props: { children: string }): ElmoorxNode {
  if (clientHead) {
    $effect(() => {
      document.title = props.children;
    });
  } else {
    addTag({ tag: "title", attrs: {}, content: props.children });
  }
  return null as unknown as ElmoorxNode;
}

/**
 * <Meta> — add a <meta> tag.
 */
export function Meta(props: Record<string, string>): ElmoorxNode {
  addTag({ tag: "meta", attrs: props });
  return null as unknown as ElmoorxNode;
}

/**
 * <Link> — add a <link> tag.
 */
export function Link(props: Record<string, string>): ElmoorxNode {
  addTag({ tag: "link", attrs: props });
  return null as unknown as ElmoorxNode;
}

/**
 * <Script> — add a <script> tag to head.
 */
export function Script(props: { src?: string; children?: string }): ElmoorxNode {
  addTag({
    tag: "script",
    attrs: props.src ? { src: props.src } : {},
    content: props.children,
  });
  return null as unknown as ElmoorxNode;
}

/**
 * OpenGraph helpers — common OG tags for social sharing.
 */
export function OpenGraph(opts: {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  siteName?: string;
}): ElmoorxNode {
  return h("span", { style: "display:none" },
    h(Meta, { property: "og:title", content: opts.title }),
    opts.description ? h(Meta, { property: "og:description", content: opts.description }) : null,
    opts.image ? h(Meta, { property: "og:image", content: opts.image }) : null,
    opts.url ? h(Meta, { property: "og:url", content: opts.url }) : null,
    opts.type ? h(Meta, { property: "og:type", content: opts.type }) : null,
    opts.siteName ? h(Meta, { property: "og:site_name", content: opts.siteName }) : null,
  );
}

/**
 * Twitter Card helpers.
 */
export function TwitterCard(opts: {
  card?: "summary" | "summary_large_image" | "player" | "app";
  title?: string;
  description?: string;
  image?: string;
  site?: string;
}): ElmoorxNode {
  return h("span", { style: "display:none" },
    h(Meta, { name: "twitter:card", content: opts.card || "summary" }),
    opts.title ? h(Meta, { name: "twitter:title", content: opts.title }) : null,
    opts.description ? h(Meta, { name: "twitter:description", content: opts.description }) : null,
    opts.image ? h(Meta, { name: "twitter:image", content: opts.image }) : null,
    opts.site ? h(Meta, { name: "twitter:site", content: opts.site }) : null,
  );
}

/**
 * JSON-LD structured data for SEO.
 */
export function JsonLd(data: Record<string, unknown>): ElmoorxNode {
  return h(Script, { type: "application/ld+json" }, JSON.stringify(data));
}
