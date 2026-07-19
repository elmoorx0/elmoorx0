# 0003 — Auto-security (no escape hatch)

## Status

Accepted — 2026-07-15

## Context

React and most other frameworks provide `dangerouslySetInnerHTML`
as an escape hatch for injecting trusted HTML. The problem: it's
easy to forget to sanitize, and the name doesn't actually force
sanitization — it just signals "I know what I'm doing".

In practice, every `dangerouslySetInnerHTML` usage is a potential
XSS vector. Even React's own docs warn about it, but developers
still reach for it for legitimate use cases (rendering CMS content,
Markdown output, email templates, etc.).

Elmoorx needed to decide:

1. **Provide a `dangerouslySetInnerHTML` equivalent** — let developers
   inject raw HTML, trust them to sanitize.

2. **Force sanitization via `$html()`** — only one way to inject raw
   HTML, and it always sanitizes. No escape hatch.

3. **Auto-sanitize all string children** — every string passed to
   `h()` runs through the sanitizer. Slower, but eliminates XSS
   entirely.

## Decision

Option 2: provide `$html()` as the only way to inject raw HTML, and
it always sanitizes. String children passed to `h()` are auto-escaped
(no XSS surface). There is no `dangerouslySetInnerHTML`.

The sanitizer is defense-in-depth:
- Strips script/style/iframe/object/embed/link/meta/svg tags
- Strips on* event handlers (case-insensitive)
- Blocks javascript:/vbscript:/data:/file:/about: URLs in href/src/etc.
- Strips conditional comments (IE downlevel-revealed)
- Strips style attributes containing expression() / url(javascript:)
- Runs 5 passes to defeat nested-injection tricks
- HTML-decodes entities between passes to catch encoded payloads

## Consequences

**Easier:**

- No way to forget sanitization — there's only one path
- The sanitizer throughput is 1.07-1.98M ops/s — negligible overhead
- Defense-in-depth (multiple passes, entity decoding) catches
  mutation-XSS vectors that single-pass sanitizers miss
- The `SECURITY.md` policy can confidently say "no XSS surface"

**Harder:**

- Developers can't inject truly trusted HTML (e.g. their own server's
  output). They must either:
  - Pre-sanitize on the server and use `$html(sanitized)`
  - Use a custom `$htmlRaw()` (not provided — would defeat the purpose)
- The sanitizer's allowlist is opinionated — some legitimate tags
  (e.g. `<svg>` for inline icons) are stripped. Use `<img src="*.svg">`
  instead.
- Performance-sensitive apps that render huge amounts of HTML (e.g.
  Markdown rendering) may want to skip sanitization. We don't support
  this — wrap with a custom renderer instead.

**Trade-offs:**

- We auto-apply security headers (CSP, HSTS, X-Frame-Options, etc.) via
  `SECURITY_HEADERS` constant, but the dev server / edge runtime is
  responsible for actually emitting them. The runtime doesn't enforce
  CSP itself — that's the browser's job.
- The CSRF token is generated via `crypto.getRandomValues` (32 bytes,
  64 hex chars). The `csrfMiddleware` uses `node:crypto.timingSafeEqual`
  for constant-time comparison. We deliberately don't support
  JWT-based CSRF (less secure than double-submit cookie).
