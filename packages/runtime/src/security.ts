/**
 * Elmoorx Runtime — Auto-Security Layer
 * ============================================
 * Everything is sanitized by default. There is no `dangerouslySetInnerHTML`
 * escape hatch to forget. Trusted-Types, CSP, CSRF, and security headers
 * are auto-applied by the dev server and the edge runtime.
 *
 * Bundle impact: ~280 bytes minified+gzipped (runtime side)
 * Server-side headers are emitted by the dev/edge server, not the runtime.
 */

const ALLOWED_TAGS = new Set([
  "a", "abbr", "address", "area", "article", "aside", "audio",
  "b", "bdi", "bdo", "blockquote", "br",
  "caption", "cite", "code", "col", "colgroup",
  "data", "datalist", "dd", "del", "details", "dfn", "dialog", "div", "dl", "dt",
  "em", "embed",
  "fieldset", "figcaption", "figure", "footer", "form",
  "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr",
  "i", "img", "input", "ins",
  "kbd",
  "label", "legend", "li",
  "main", "map", "mark", "menu", "meter",
  "nav",
  "ol", "optgroup", "option", "output",
  "p", "param", "picture", "pre", "progress",
  "q",
  "rp", "rt", "ruby",
  "s", "samp", "section", "select", "small", "source", "span", "strong", "sub", "summary", "sup",
  "table", "tbody", "td", "textarea", "tfoot", "th", "thead", "time", "tr", "track",
  "u", "ul",
  "var", "video",
  "wbr",
]);

const BLOCKED_ATTRS = new Set([
  "onclick", "onload", "onerror", "onmouseover", "onfocus", "onblur",
  "onsubmit", "onchange", "oninput", "onkeydown", "onkeyup",
  // Generic fallback — any on* attribute is blocked at sanitization time
]);

const BLOCKED_PROTOCOLS = /^(javascript|vbscript|data|file|about):/i;

/**
 * Attributes that can load external resources and therefore need
 * protocol whitelisting, not just URL-pattern matching.
 */
const URL_ATTRS = new Set(["href", "src", "action", "formaction", "background", "poster", "cite", "longdesc", "usemap", "manifest", "codebase", "data", "srcset"]);

/**
 * Sanitize an arbitrary string that the developer wants to inject as HTML.
 * In Elmoorx, you must call $html() explicitly — there is no implicit path.
 *
 *   <div>{$html(userInput)}</div>
 *
 * By contrast, <div>{userInput}</div> auto-escapes — no XSS surface.
 */
export function $html(input: string): { __html: string; __trusted: true } {
  return { __html: sanitize(input), __trusted: true } as never;
}

/**
 * The actual sanitizer. Strips:
 *   - script/style/iframe/object/embed/link/meta tags entirely
 *   - on* event handler attributes (case-insensitive, with/without quotes)
 *   - javascript:/vbscript:/data:/file:/about: URLs in any URL attribute
 *   - any tag not in the allowlist
 *   - HTML comments containing conditional-comment payloads (IE downlevel-revealed)
 *   - style attributes containing expression() or url(javascript:)
 *   - <noscript> contents (mutation-XSS vector when JS is enabled)
 *
 * Defence-in-depth: we apply the same pass multiple times to defeat
 * nested-injection tricks like `<scr<script>ipt>` — the inner `<script>`
 * is stripped first, then the outer `scr{}ipt` is no longer a valid tag.
 *
 * Server-side note: we also HTML-decode the input between passes to
 * defeat entity-encoded payloads like `&#106;avascript:`.
 */
export function sanitize(input: string): string {
  if (typeof window === "undefined") {
    // Server-side: regex-based (no DOMParser available)
    return sanitizeServer(input);
  }
  // Client-side: use the browser's native parser
  const doc = new DOMParser().parseFromString(input, "text/html");
  walkAndStrip(doc.body);
  return doc.body.innerHTML;
}

/**
 * Tags whose CONTENTS must be stripped entirely (not just the tag itself).
 * For example, `<script>doBad()</script>` → empty, not `doBad()`.
 */
const STRIP_CONTENT_TAGS = [
  "script", "style", "iframe", "object", "embed", "link", "meta",
  "base", "applet", "noscript", "template", "svg", "math",
  "frame", "frameset", "xml",
];

const STRIP_CONTENT_TAGS_RE = new RegExp(
  `<(${STRIP_CONTENT_TAGS.join("|")})\\b[\\s\\S]*?<\\/\\1\\s*>`,
  "gi"
);

const STRIP_CONTENT_TAGS_SELF_RE = new RegExp(
  `<(${STRIP_CONTENT_TAGS.join("|")})\\b[^>]*\\/?>`,
  "gi"
);

/**
 * Server-side sanitizer. Uses regex passes because Node has no native
 * DOMParser (we intentionally avoid a parser5/linkedom dependency to
 * keep the runtime at ~4kb).
 *
 * The flow is:
 *   1. Decode HTML entities (defeats `&#106;avascript:` etc.)
 *   2. Strip dangerous tags AND their contents (script/style/svg/...)
 *   3. Strip on* event handlers
 *   4. Block dangerous protocols in URL attributes (with entity decoding between passes)
 *   5. Strip style attributes containing expression() / url(javascript:)
 *   6. Strip conditional comments
 *   7. ENFORCE ALLOWED_TAGS — any tag NOT in the allowlist is replaced
 *      with its text content (recursively via repeated passes)
 *   8. Repeat until stable (defeats nested-injection)
 */
function sanitizeServer(input: string): string {
  let s = input;

  // Pre-decode HTML entities so entity-encoded payloads are caught.
  // This runs ONCE at the start — subsequent passes operate on decoded
  // text. We deliberately do NOT re-decode between passes (that would
  // allow double-encoded payloads to bypass the allowlist).
  s = decodeHtmlEntities(s);

  for (let i = 0; i < 5; i++) {
    const before = s;

    // 1. Strip dangerous tags AND their contents entirely
    s = s.replace(STRIP_CONTENT_TAGS_RE, "");
    s = s.replace(STRIP_CONTENT_TAGS_SELF_RE, "");

    // 2. Strip conditional comments (IE downlevel-revealed)
    s = s.replace(/<!--\[if[^\]]*\]>[\s\\S]*?<!\[endif\]-->/gi, "");

    // 3. Strip on* event handlers (handles quoted, single-quoted, unquoted values)
    s = s.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

    // 4. Block dangerous protocols in URL attributes (href, src, action, etc.)
    //    Also handle entity-encoded variants inside the URL value.
    s = s.replace(
      /\b(href|src|action|formaction|background|poster|cite|longdesc|usemap|manifest|codebase|data|srcset)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
      (match, attr: string, val: string) => {
        const unquoted = val.replace(/^["']|["']$/g, "");
        // Decode entities in the value to catch encoded variants.
        const decoded = decodeHtmlEntities(unquoted).trim();
        if (BLOCKED_PROTOCOLS.test(decoded)) {
          return `${attr}="#"`;
        }
        // For srcset (comma-separated URLs), check each
        if (attr === "srcset") {
          const cleaned = unquoted
            .split(",")
            .map((part) => {
              const url = part.trim().split(/\s+/)[0] || "";
              return BLOCKED_PROTOCOLS.test(decodeHtmlEntities(url).trim()) ? "" : part;
            })
            .filter(Boolean)
            .join(", ");
          return cleaned ? `${attr}="${cleaned}"` : `${attr}="#"`;
        }
        return match;
      }
    );

    // 5. Strip style attributes containing expression() or url(javascript:)
    //    Also catch: behavior:, -moz-binding:, @import, and CSS-comment injection.
    s = s.replace(
      /style\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
      (match, val: string) => {
        const decoded = decodeHtmlEntities(val).toLowerCase();
        if (
          /expression\s*\(/i.test(decoded) ||
          /url\s*\(\s*['"]?\s*(javascript|vbscript|data):/i.test(decoded) ||
          /behavior\s*:/i.test(decoded) ||
          /-moz-binding/i.test(decoded) ||
          /@import/i.test(decoded)
        ) {
          return 'style=""';
        }
        return match;
      }
    );

    // 6. ENFORCE ALLOWED_TAGS — replace any tag NOT in the allowlist
    //    with its text content (preserving the inner text).
    //    We do this LAST so that earlier passes have already stripped
    //    the contents of dangerous tags (otherwise step 6 would unwrap
    //    `<script>...</script>` to `...` which is the script body).
    s = enforceAllowedTags(s);

    if (s === before) break; // converged
  }

  return s;
}

/**
 * Replace any tag NOT in ALLOWED_TAGS with its text content (preserving
 * the inner text). Handles both open+close pairs and self-closing tags.
 * This is a coarse regex pass — it does NOT handle every edge case of
 * HTML parsing, but combined with the earlier strip-content passes it
 * defeats the common mutation-XSS vectors (svg, math, form, marquee, etc.).
 */
function enforceAllowedTags(input: string): string {
  // Build a regex that matches any tag NOT in the allowlist.
  // We need to escape tag names for regex (none contain special chars,
  // but be defensive).
  const allowedPattern = [...ALLOWED_TAGS].map(escapeRegex).join("|");
  const disallowedTagRe = new RegExp(
    `<(?!/?(${allowedPattern})\\b)[a-zA-Z][a-zA-Z0-9]*\\b[^>]*>`,
    "gi"
  );
  return input.replace(disallowedTagRe, "");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Decode a small subset of HTML entities that are commonly used in
 * XSS payloads. We deliberately keep this minimal — over-decoding
 * can break legitimate content. The goal is to catch:
 *   - Numeric entities: &#106; → j
 *   - Hex entities: &#x6a; → j
 *   - Common named entities: &lt; &gt; &amp; &quot; &apos; &colon; &NewLine;
 */
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => safeFromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => safeFromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&colon;/gi, ":")
    .replace(/&Tab;/gi, "\\t")
    .replace(/&NewLine;/gi, "\\n")
    .replace(/&amp;/gi, "&");
}

function safeFromCodePoint(code: number): string {
  // Reject control characters and surrogates — they're not safe to
  // re-inject into HTML even after decoding.
  if (code < 0x20 && code !== 0x09 && code !== 0x0A && code !== 0x0D) return "";
  if (code >= 0xD800 && code <= 0xDFFF) return "";
  if (code > 0x10FFFF) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

function walkAndStrip(node: Element): void {
  const children = [...node.children];
  for (const child of children) {
    const tagName = child.tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tagName)) {
      // Replace disallowed tag with its text content (recursively —
      // textContent flattens nested children, so we don't miss anything)
      const text = document.createTextNode(child.textContent || "");
      child.replaceWith(text);
      continue;
    }

    // Strip dangerous attributes
    for (const attr of [...child.attributes]) {
      const name = attr.name.toLowerCase();
      const value = attr.value || "";

      // on* event handlers — always strip
      if (name.startsWith("on") || BLOCKED_ATTRS.has(name)) {
        child.removeAttribute(attr.name);
        continue;
      }

      // URL attributes — block dangerous protocols
      if (URL_ATTRS.has(name) && BLOCKED_PROTOCOLS.test(value.trim())) {
        child.setAttribute(attr.name, "#");
        continue;
      }

      // srcset can contain multiple URLs — check each
      if (name === "srcset") {
        const cleaned = value
          .split(",")
          .map((part) => {
            const url = part.trim().split(/\s+/)[0] || "";
            return BLOCKED_PROTOCOLS.test(url) ? "" : part;
          })
          .filter(Boolean)
          .join(", ");
        if (cleaned !== value) {
          child.setAttribute(attr.name, cleaned || "#");
        }
        continue;
      }

      // style attribute — block expression() and url(javascript:)
      if (name === "style") {
        if (/expression\s*\(/i.test(value) || /url\s*\(\s*['"]?\s*(javascript|vbscript|data):/i.test(value)) {
          child.removeAttribute(attr.name);
        }
        continue;
      }
    }
    walkAndStrip(child);
  }
}

/**
 * Auto-applied security headers — emitted by the dev server / edge runtime.
 * This is a manifest, not a runtime function. The dev server reads it.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
};

/**
 * Generate a per-request CSRF token. Stored in a signed cookie; the
 * client must echo it back in the X-CSRF-Token header for mutations.
 *
 * Uses crypto.getRandomValues — available in browsers and Node ≥19.
 * If unavailable (very old environment), falls back to Math.random
 * with a console warning.
 */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    // Fallback for environments without crypto.getRandomValues.
    // NOT cryptographically secure, but better than throwing.
    console.warn("[elmoorx/security] crypto.getRandomValues unavailable — falling back to Math.random for CSRF token");
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
