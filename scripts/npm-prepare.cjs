#!/usr/bin/env node
/**
 * Elmoorx npm Package Preparation
 * Generates proper package.json, README.md, LICENSE for every package.
 * Outputs a manifest of all packages ready for `npm publish`.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT, 'packages');

// Master metadata
const ELMOORX_VERSION = '3.0.0-alpha.2';
const LICENSE_TEXT = `MIT License

Copyright (c) 2026 Elmoorx Framework

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

// Package descriptions
const PACKAGE_DESCRIPTIONS = {
  runtime: 'Core runtime: signals, store, islands, security, context, lifecycle, refs, portal, transitions',
  compiler: 'JSX-to-Elmoorx compiler with esbuild integration, SSR, HMR',
  cli: 'Command-line interface for Elmoorx projects (init, dev, build, deploy)',
  'cli-pro': 'Advanced CLI with code generation, scaffolding, deployment automation',
  adapters: 'Platform adapters: Node.js, Cloudflare Workers, Deno, Bun, Vercel Edge',
  router: 'File-system router with dynamic routes, layouts, loaders, code-splitting',
  server: 'Full-stack HTTP server with middleware, static files, API routes, WebSocket',
  css: 'Zero-runtime CSS system with atomic classes, theming, RTL support',
  head: 'SEO head manager: meta tags, Open Graph, Twitter Cards, JSON-LD, favicons',
  image: 'Image optimizer: AVIF/WebP, blur placeholder, responsive srcset',
  forms: 'Form library with validation, schemas, async validation, field arrays',
  i18n: 'Internationalization: locale switching, RTL support, pluralization, calendars',
  testing: 'Test utilities: component testing, snapshot, signal assertions, mocking',
  devtools: 'Browser DevTools extension: signal inspector, time-travel, profiler',
  ui: 'UI component library (forms, layout, nav, data, feedback, media, pro)',
  postgres: 'PostgreSQL adapter: connection pooling, transactions, query builder, migrations',
  monitoring: 'Real-time metrics, alerting, distributed tracing, Prometheus export',
  cache: 'Multi-tier cache: memory, Redis, with TTL, LRU, tags, invalidation',
  auth: 'Authentication: sessions, JWT, OAuth (Google, GitHub), 2FA, RBAC',
  email: 'Email service: SMTP, templates, queue, attachments, tracking',
  analytics: 'Privacy-first analytics: page views, events, funnels, retention cohorts',
  'feature-flags': 'Feature flags: gradual rollout, A/B testing, user targeting, instant rollback',
  graphql: 'GraphQL: schema-first, resolvers, subscriptions, DataLoader, federation',
  'edge-functions': 'Edge functions: run serverless at 300+ POPs, sub-50ms cold starts',
  'edge-db': 'Edge database: global replication, eventual consistency, low latency reads',
  blog: 'Blog system: markdown, frontmatter, RSS, Atom, SEO structured data',
  seo: 'SEO suite: meta tags, sitemaps, robots.txt, hreflang, structured data',
  sitemap: 'Sitemap generator: XML, news, image, video sitemaps; auto-ping search engines',
  rss: 'RSS 2.0 + Atom 1.0 feed generator with custom namespaces',
  ai: 'AI integration: streaming completions, embeddings, RAG, function calling',
  'ai-chat': 'AI chat: streaming UI, message history, citations, multimodal',
  'ai-copilot': 'AI copilot: inline code suggestions, refactoring, doc generation',
  'ai-dev': 'AI dev tools: test generation, bug detection, code review, performance analysis',
  ar: 'Augmented reality: WebXR, marker tracking, 3D models, AR sessions',
  blockchain: 'Blockchain: Web3 wallet connect, smart contracts, NFT mint, verify',
  collab: 'Real-time collaboration: CRDT, presence, cursors, conflict resolution',
  cron: 'Cron scheduler: recurring jobs, queues, retries, observability',
  crypto: 'Cryptography: hashing, encryption, signing, JWT, secure random',
  eslint: 'ESLint plugin: Elmoorx-specific rules, best practices, security checks',
  experiments: 'A/B experiments: variant assignment, metrics, statistical significance',
  gesture: 'Gestures: swipe, pinch, rotate, pan, multi-touch, haptics',
  'auto-test': 'AI-powered test generation: unit, integration, E2E from code analysis',
  'code-review': 'AI code review: PR analysis, security scan, performance suggestions',
  websocket: 'WebSocket server: rooms, presence, channels, reconnection, heartbeat',
  validator: 'Schema validation: JSON Schema, Zod-like, custom rules, async',
  logger: 'Structured logger: levels, transports, child loggers, redaction, JSON',
  'error-reporting': 'Error reporting: capture, breadcrumbs, release tracking, source maps',
  queue: 'Job queue: Redis-backed, priorities, delays, cron, retries, dead-letter',
  search: 'Full-text search: indexing, ranking, facets, highlighting, fuzzy',
  storage: 'Storage abstraction: S3, GCS, Azure, local; multipart uploads, presigned URLs',
  migration: 'Migration tools: React/Vue/Svelte → Elmoorx codemods, audit, transforms',
  cli: 'CLI tool: init, dev, build, deploy, generate, doctor',
  notification: 'Notifications: email, push, SMS, in-app, webhooks; channels, templates',
  webhook: 'Webhook system: outgoing, incoming, signing, retries, dead-letter',
  stripe: 'Stripe payments: checkout, subscriptions, webhooks, customer portal',
  'oauth-pro': 'OAuth: 20+ providers, PKCE, token refresh, multi-account',
  scheduler: 'Task scheduler: cron, intervals, one-time, distributed locks',
  'rate-limit': 'Rate limiting: token bucket, sliding window, fixed window, distributed',
  'cdn': 'CDN helpers: cache headers, purge, signed URLs, image transform',
  bundle: 'Bundle analyzer: size, deps, tree-shake, duplicates, budgets',
  // NOTE: The following 15 entries were for packages that were NEVER
  // created. They've been removed to avoid dead code. If any of these
  // packages are added in the future, re-add their descriptions here.
  // Removed: security, types, config, ssr, hydration, design-tokens,
  // icons, animations, pdf, excel, markdown, parser, worker,
  // service-worker, pwa
};

// Generate README for a package
function generateReadme(name, description) {
  return `# @elmoorx/${name}

> ${description}

Part of the [Elmoorx Framework](https://github.com/elmoorx0/elmoorx0) — Build fast. Run anywhere. Stay secure.

## Installation

\`\`\`bash
npm install @elmoorx/${name}
\`\`\`

## Quick Start

\`\`\`typescript
import { /* exports */ } from '@elmoorx/${name}';
\`\`\`

## Features

- Zero external dependencies
- Full TypeScript support
- Tree-shakeable
- Edge-runtime compatible
- Arabic/RTL friendly

## Documentation

See [https://elmoorx.dev/docs/${name}](https://elmoorx.dev/docs/${name})

## License

MIT © Elmoorx Framework
`;
}

// Process all packages
function prepareAllPackages() {
  const packages = fs.readdirSync(PACKAGES_DIR).filter(d =>
    fs.statSync(path.join(PACKAGES_DIR, d)).isDirectory()
  );

  const manifest = [];

  for (const pkg of packages) {
    const pkgDir = path.join(PACKAGES_DIR, pkg);
    const description = PACKAGE_DESCRIPTIONS[pkg] || `Elmoorx ${pkg} package`;

    // Write/update package.json
    const pkgJsonPath = path.join(pkgDir, 'package.json');
    let pkgJson = {};
    if (fs.existsSync(pkgJsonPath)) {
      pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    }
    pkgJson.name = `@elmoorx/${pkg}`;
    pkgJson.version = ELMOORX_VERSION;
    pkgJson.description = description;
    pkgJson.license = 'MIT';
    pkgJson.author = 'Elmoorx Framework';
    pkgJson.homepage = `https://elmoorx.dev/packages/${pkg}`;
    pkgJson.repository = { type: 'git', url: 'https://github.com/elmoorx0/elmoorx0', directory: `packages/${pkg}` };
    pkgJson.bugs = { url: 'https://github.com/elmoorx0/elmoorx0/issues' };
    pkgJson.keywords = ['elmoorx', 'framework', pkg];
    pkgJson.sideEffects = false;

    // Find source files
    const srcDir = path.join(pkgDir, 'src');
    if (fs.existsSync(srcDir)) {
      const mainFile = fs.existsSync(path.join(srcDir, 'index.ts'))
        ? './src/index.ts'
        : './src/index.js';
      pkgJson.main = mainFile;
      pkgJson.types = mainFile;
      pkgJson.exports = { '.': mainFile };
    }

    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');

    // Write README.md
    const readmePath = path.join(pkgDir, 'README.md');
    if (!fs.existsSync(readmePath)) {
      fs.writeFileSync(readmePath, generateReadme(pkg, description));
    }

    // Write LICENSE
    const licensePath = path.join(pkgDir, 'LICENSE');
    fs.writeFileSync(licensePath, LICENSE_TEXT);

    manifest.push({
      name: `@elmoorx/${pkg}`,
      version: ELMOORX_VERSION,
      description,
      path: pkgDir,
      hasReadme: fs.existsSync(readmePath),
      hasLicense: true,
      hasPackageJson: true,
    });
  }

  return manifest;
}

const manifest = prepareAllPackages();

// Write manifest
const manifestPath = path.join(ROOT, 'npm-manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  version: ELMOORX_VERSION,
  totalPackages: manifest.length,
  packages: manifest,
}, null, 2));

// Generate publish script
const publishScript = `#!/bin/bash
# Elmoorx npm Publish Script
# Publishes all ${manifest.length} packages to npm registry
#
# Usage:
#   ./scripts/npm-publish.sh --dry-run   # Test without publishing
#   ./scripts/npm-publish.sh             # Actually publish

set -e
echo "🚀 Publishing ${manifest.length} Elmoorx packages to npm..."
echo ""

DRY_RUN=""
if [ "$1" = "--dry-run" ]; then
  DRY_RUN="--dry-run"
  echo "⚠️  DRY RUN MODE — no packages will actually be published"
  echo ""
fi

cd "$(dirname "$0")/.."

PUBLISHED=0
FAILED=0

${manifest.map(m => `
# ${m.name}
echo "📦 Publishing ${m.name}..."
cd "${path.relative(ROOT, m.path)}"
npm publish $DRY_RUN --access public && {
  echo "  ✓ ${m.name}"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ ${m.name} failed"
  FAILED=$((FAILED + 1))
}
cd -`).join('')}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Published: $PUBLISHED / ${manifest.length}"
echo "  Failed:    $FAILED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
`;

fs.writeFileSync(path.join(ROOT, 'scripts/npm-publish.sh'), publishScript);
fs.chmodSync(path.join(ROOT, 'scripts/npm-publish.sh'), '755');

console.log(`\n✅ Prepared ${manifest.length} packages for npm publish`);
console.log(`   Manifest: ${path.relative(ROOT, manifestPath)}`);
console.log(`   Publish script: scripts/npm-publish.sh`);
console.log(`\nSample packages:`);
manifest.slice(0, 5).forEach(p => console.log(`   • ${p.name}@${p.version} — ${p.description.slice(0, 50)}...`));
console.log(`   ... and ${manifest.length - 5} more`);
