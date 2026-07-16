/**
 * @elmoorx/head — SEO head tag tests
 *
 * Verifies:
 *   - Title/Meta/Link/Script collect server-side tags
 *   - resetHeadTags clears state between requests
 *   - OpenGraph + TwitterCard emit expected meta tags
 *   - JsonLd wraps data in a script tag
 *
 * Run: npx tsx --test packages/head/tests/head.test.ts
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

let mod: typeof import("../src/index.ts");
let skip = false;
try {
  mod = await import("../src/index.ts");
} catch (err) {
  skip = true;
  console.warn("Skipping head tests:", (err as Error).message);
}

const testIfLoaded = skip ? test.skip : test;

describe("head: server-side tag collection", () => {
  testIfLoaded("Title registers a title tag on the server", () => {
    mod.resetHeadTags();
    mod.Title({ children: "My Page" });
    const tags = mod.getServerHeadTags();
    assert.equal(tags.length, 1);
    assert.equal(tags[0].tag, "title");
    assert.equal(tags[0].content, "My Page");
  });

  testIfLoaded("Meta registers a meta tag with attrs", () => {
    mod.resetHeadTags();
    mod.Meta({ name: "description", content: "hello world" });
    const tags = mod.getServerHeadTags();
    assert.equal(tags.length, 1);
    assert.equal(tags[0].tag, "meta");
    assert.equal(tags[0].attrs.name, "description");
    assert.equal(tags[0].attrs.content, "hello world");
  });

  testIfLoaded("Link registers a link tag", () => {
    mod.resetHeadTags();
    mod.Link({ rel: "canonical", href: "https://example.com/x" });
    const tags = mod.getServerHeadTags();
    assert.equal(tags[0].tag, "link");
    assert.equal(tags[0].attrs.rel, "canonical");
    assert.equal(tags[0].attrs.href, "https://example.com/x");
  });

  testIfLoaded("Script with src registers a script tag", () => {
    mod.resetHeadTags();
    mod.Script({ src: "/app.js" });
    const tags = mod.getServerHeadTags();
    assert.equal(tags[0].tag, "script");
    assert.equal(tags[0].attrs.src, "/app.js");
  });

  testIfLoaded("Script with inline content stores it", () => {
    mod.resetHeadTags();
    mod.Script({ children: "console.log('hi')" });
    const tags = mod.getServerHeadTags();
    assert.equal(tags[0].tag, "script");
    assert.equal(tags[0].content, "console.log('hi')");
  });
});

describe("head: reset + accumulation", () => {
  testIfLoaded("resetHeadTags empties the buffer", () => {
    mod.resetHeadTags();
    mod.Meta({ name: "a", content: "1" });
    mod.Meta({ name: "b", content: "2" });
    assert.equal(mod.getServerHeadTags().length, 2);
    mod.resetHeadTags();
    assert.equal(mod.getServerHeadTags().length, 0);
  });

  testIfLoaded("tags accumulate across calls", () => {
    mod.resetHeadTags();
    mod.Title({ children: "X" });
    mod.Meta({ name: "y", content: "z" });
    mod.Link({ rel: "stylesheet", href: "/a.css" });
    assert.equal(mod.getServerHeadTags().length, 3);
  });
});

describe("head: structured data helpers", () => {
  testIfLoaded("OpenGraph registers og:* meta tags", () => {
    mod.resetHeadTags();
    mod.OpenGraph({
      title: "My Page",
      description: "desc",
      image: "/img.png",
      url: "https://example.com",
      type: "article",
      siteName: "Example",
    });
    const tags = mod.getServerHeadTags();
    const props = tags.map(t => t.attrs.property).filter(Boolean);
    assert.ok(props.includes("og:title"));
    assert.ok(props.includes("og:description"));
    assert.ok(props.includes("og:image"));
    assert.ok(props.includes("og:url"));
    assert.ok(props.includes("og:type"));
    assert.ok(props.includes("og:site_name"));
  });

  testIfLoaded("OpenGraph skips optional fields when not provided", () => {
    mod.resetHeadTags();
    mod.OpenGraph({ title: "Only Title" });
    const tags = mod.getServerHeadTags();
    assert.equal(tags.length, 1);
    assert.equal(tags[0].attrs.property, "og:title");
  });

  testIfLoaded("TwitterCard defaults to 'summary' card type", () => {
    mod.resetHeadTags();
    mod.TwitterCard({ title: "X" });
    const tags = mod.getServerHeadTags();
    const cardTag = tags.find(t => t.attrs.name === "twitter:card");
    assert.ok(cardTag);
    assert.equal(cardTag?.attrs.content, "summary");
  });

  testIfLoaded("JsonLd wraps data in a script tag with content", () => {
    mod.resetHeadTags();
    mod.JsonLd({ "@type": "Article", headline: "Hello" });
    const tags = mod.getServerHeadTags();
    assert.equal(tags[0].tag, "script");
    const parsed = JSON.parse(tags[0].content || "{}");
    assert.equal(parsed["@type"], "Article");
    assert.equal(parsed.headline, "Hello");
  });
});

describe("head: side-effect components return null ElmoorxNode", () => {
  // The Head/Title/Meta/Link/Script components produce only side-effects
  // (registering tags for SSR). Their return value must be null (a valid
  // ElmoorxNode) so the renderer doesn't try to mount anything in the body.
  testIfLoaded("Head returns null", () => {
    mod.resetHeadTags();
    const out = mod.Head({ children: [] });
    assert.equal(out, null);
  });

  testIfLoaded("Title returns null", () => {
    mod.resetHeadTags();
    const out = mod.Title({ children: "X" });
    assert.equal(out, null);
  });

  testIfLoaded("Meta returns null", () => {
    mod.resetHeadTags();
    const out = mod.Meta({ name: "x", content: "y" });
    assert.equal(out, null);
  });

  testIfLoaded("Link returns null", () => {
    mod.resetHeadTags();
    const out = mod.Link({ rel: "x", href: "y" });
    assert.equal(out, null);
  });

  testIfLoaded("Script returns null", () => {
    mod.resetHeadTags();
    const out = mod.Script({ src: "/a.js" });
    assert.equal(out, null);
  });
});
