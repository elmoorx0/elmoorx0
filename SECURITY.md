# Security Policy — Elmoorx Framework

## 🛡️ Supported Versions

Elmoorx is currently in alpha. We provide security updates for the
latest release only.

| Version | Supported          |
|---------|--------------------|
| 3.0.0-alpha.3 | ✅ Latest        |
| 3.0.0-alpha.2 | ⚠️ Critical fixes only |
| < 3.0.0-alpha.2 | ❌ Not supported |

## 🔍 Security Features

Elmoorx is designed with defense-in-depth from the ground up:

### Auto-Security (default-on)
- **HTML sanitization** — `sanitize()` strips script tags, event handlers, dangerous protocols (javascript:, vbscript:, data:), and conditional comments. Throughput: ~1.98M ops/s.
- **Auto-escaping** — all values passed to `h()` are HTML-escaped by default. There is no `dangerouslySetInnerHTML` to forget.
- **Explicit trusted HTML** — `$html()` is the only way to inject raw HTML, and it auto-sanitizes its input.
- **CSP headers** — auto-applied by the dev server and edge runtime (`Content-Security-Policy: default-src 'self'; ...`).
- **HSTS** — `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- **X-Frame-Options: DENY** — clickjacking protection
- **X-Content-Type-Options: nosniff** — MIME-type sniffing protection
- **Referrer-Policy: strict-origin-when-cross-origin**
- **Permissions-Policy** — geolocation, microphone, camera all disabled by default

### CSRF Protection
- **Double-submit cookie pattern** — `csrf_token` cookie + `X-CSRF-Token` header must match.
- **Constant-time comparison** via `node:crypto.timingSafeEqual` to prevent timing attacks.
- **Safe-method optimization** — cookies only issued on GET/HEAD/OPTIONS, not on mutations (avoids invalidating in-flight tokens).
- **Per-route exemption** — `csrfMiddleware({ exemptPaths: ['/webhooks/'] })` for third-party integrations.

### Password Hashing
- **PBKDF2-SHA256** with 210,000 iterations (OWASP 2023 recommendation).
- **16-byte per-password random salt** via `crypto.getRandomValues`.
- **Self-describing format** (`pbkdf2$<iter>$<saltB64>$<hashB64>`) — supports future migration to Argon2.
- **Constant-time comparison** on the derived bits (not the encoded string).

### JWT
- **HMAC-SHA256 signature** via Web Crypto.
- **Fail-fast secret loading** — `AuthManager` throws if `ELMOORX_JWT_SECRET` is missing or shorter than 32 bytes. Never falls back to a default.

### Rate Limiting
- **Per-IP in-memory counter** with configurable window (default 60s) and max requests (default 100).
- **Periodic sweep** of expired entries to prevent unbounded memory growth under attack.
- **Trust-proxy option** — defaults to `false` (ignores `X-Forwarded-For`) to prevent spoofing; set to `true` only behind a trusted reverse proxy.
- **Validates IP format** via `node:net.isIP` (rejects `999.999.999.999` and other malformed values).

### Path Traversal Protection
- **`safeJoin()`** in `@elmoorx/server` — uses `realpathSync` after `existsSync` to resolve symlinks and verify the resolved path stays inside the base directory.
- **Applied to static file serving, API routes, and SSR page routes.**

### Secrets Management (`@elmoorx/secrets`)
- **AES-256-GCM encryption at rest** via `node:crypto`.
- **Per-value random salt + IV + auth tag** — even the same plaintext produces different ciphertexts.
- **PBKDF2 key derivation** (210k iterations) from `ELMOORX_SECRETS_KEY` env var.
- **Ephemeral key warning** — if the env var is missing, an ephemeral in-memory key is used with a clear console warning.

## 🚨 Reporting a Vulnerability

**Please DO NOT open a public GitHub issue for security vulnerabilities.**

Instead, report vulnerabilities privately:

1. **Preferred:** Go to https://github.com/elmoorx0/elmoorx0/security/advisories/new and click "Report a vulnerability".
2. **Alternative:** Email security@elmoorx.dev with:
   - A description of the vulnerability
   - Steps to reproduce (PoC if possible)
   - Affected versions
   - Suggested fix (if any)

### Response Timeline
- **Acknowledgment:** within 48 hours
- **Initial assessment:** within 7 days
- **Fix or mitigation:** within 30 days for high-severity, 90 days for low-severity
- **Public disclosure:** after a fix is released, with credit to the reporter (unless they prefer to remain anonymous)

### Scope
The following are **in scope** for security reports:
- XSS bypasses in `sanitize()` or `$html()`
- CSRF token bypass
- Path traversal in `safeJoin()` or route handlers
- Auth/JWT secret leakage or token forgery
- SQL injection in `@elmoorx/postgres` query builder
- Any default-on security control that can be disabled by untrusted input

The following are **out of scope**:
- Theoretical attacks without a concrete PoC
- Self-XSS (user attacks their own account)
- Attacks requiring physical access to the server
- Attacks on dependencies — report those to the upstream package
- Social engineering of maintainers

## 🔐 Disclosure Policy

- We follow **coordinated disclosure** — we'll work with you to publish a fix before the vulnerability is made public.
- We may request a 90-day embargo to allow users to upgrade.
- After the fix is released, we'll publish a GitHub Security Advisory with full details and CVE assignment (if applicable).

## 📋 Security Checklist for Production Deployments

Before going to production with Elmoorx, verify:

- [ ] `ELMOORX_JWT_SECRET` is set to a 32+ byte random string
- [ ] `ELMOORX_SECRETS_KEY` is set (otherwise secrets won't survive restart)
- [ ] HTTPS is enforced (the framework sets HSTS, but you need TLS termination)
- [ ] `rateLimitMiddleware({ trustProxy: true })` is only enabled if you're behind a trusted reverse proxy
- [ ] `csrfMiddleware` is added to your middleware stack (it's added by default if you use `startServer()`)
- [ ] Webhook routes are added to `csrfMiddleware({ exemptPaths: [...] })` if they receive third-party POSTs
- [ ] Static file serving uses `startServer()` (which uses `safeJoin()` for path traversal protection)
- [ ] Dependencies are up to date (`npm audit --audit-level=high`)

## 📞 Contact

- Security advisories: https://github.com/elmoorx0/elmoorx0/security/advisories
- Security email: security@elmoorx.dev
- General issues: https://github.com/elmoorx0/elmoorx0/issues
