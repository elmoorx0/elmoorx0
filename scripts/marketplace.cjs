#!/usr/bin/env node
/**
 * Elmoorx Marketplace — Component & template marketplace
 *
 * Browse, search, install components/templates from the community.
 *
 * Features:
 * - Component catalog (searchable, filterable)
 * - Template catalog
 * - Author profiles
 * - Ratings & reviews
 * - Install counts
 * - Categories & tags
 * - Featured items
 * - Recently added
 *
 * Runs on port 5700
 */

const http = require('http');

// ─── Marketplace items ──────────────────────────────────────────────────────
//
// IMPORTANT: The `installs`, `rating`, and `featured` fields below are
// MOCK SAMPLE DATA for the marketplace UI demo. They do NOT represent
// real adoption metrics for any real package. In a production marketplace,
// these would be populated from a real database + npm registry API at
// runtime, not hardcoded.

const ITEMS = [
  // Components
  { id: 'comp-1', type: 'component', name: 'AnimatedCounter', author: 'ahmed', category: 'Animation', tags: ['counter', 'animation', 'number'], rating: 4.8, installs: 12400, price: 'free', description: 'Smooth animated number counter with easing', featured: true },
  { id: 'comp-2', type: 'component', name: 'ParticleBackground', author: 'sara', category: 'Visual', tags: ['particles', 'background', 'canvas'], rating: 4.9, installs: 8900, price: 'free', description: 'Interactive particle background with mouse follow', featured: true },
  { id: 'comp-3', type: 'component', name: 'TypewriterText', author: 'mohamed', category: 'Animation', tags: ['typewriter', 'text', 'effect'], rating: 4.6, installs: 5600, price: 'free', description: 'Typewriter text effect with cursor', featured: false },
  { id: 'comp-4', type: 'component', name: 'MasonryGrid', author: 'layla', category: 'Layout', tags: ['masonry', 'grid', 'pinterest'], rating: 4.7, installs: 7200, price: 'free', description: 'Pinterest-style masonry layout', featured: false },
  { id: 'comp-5', type: 'component', name: 'ToastNotifications', author: 'khalid', category: 'Feedback', tags: ['toast', 'notification', 'snackbar'], rating: 4.9, installs: 15600, price: 'free', description: 'Beautiful toast notifications with swipe to dismiss', featured: true },
  { id: 'comp-6', type: 'component', name: 'DatePickerPro', author: 'fatima', category: 'Forms', tags: ['date', 'calendar', 'picker'], rating: 4.5, installs: 4300, price: '$9', description: 'Advanced date picker with range selection and holidays', featured: false },
  { id: 'comp-7', type: 'component', name: 'DataGridPro', author: 'omar', category: 'Data', tags: ['table', 'grid', 'data'], rating: 4.8, installs: 11200, price: '$19', description: 'Enterprise data grid with virtualization, filtering, sorting', featured: true },
  { id: 'comp-8', type: 'component', name: 'CodeEditor', author: 'yusuf', category: 'Editor', tags: ['code', 'editor', 'monaco'], rating: 4.7, installs: 6800, price: '$14', description: 'Code editor with syntax highlighting and autocomplete', featured: false },
  { id: 'comp-9', type: 'component', name: 'OrgChart', author: 'noor', category: 'Data', tags: ['org', 'chart', 'tree'], rating: 4.4, installs: 2100, price: 'free', description: 'Interactive organizational chart', featured: false },
  { id: 'comp-10', type: 'component', name: 'KanbanBoard', author: 'ali', category: 'Productivity', tags: ['kanban', 'board', 'drag'], rating: 4.9, installs: 9400, price: 'free', description: 'Drag-and-drop Kanban board with columns', featured: true },

  // Templates
  { id: 'tmpl-1', type: 'template', name: 'SaaS Starter Pro', author: 'elmoorx-team', category: 'SaaS', tags: ['saas', 'starter', 'full'], rating: 5.0, installs: 2800, price: '$49', description: 'Complete SaaS starter with auth, billing, dashboard', featured: true },
  { id: 'tmpl-2', type: 'template', name: 'E-commerce Full', author: 'shop-dev', category: 'E-commerce', tags: ['shop', 'cart', 'checkout'], rating: 4.8, installs: 1900, price: '$39', description: 'Full e-commerce with cart, checkout, orders', featured: true },
  { id: 'tmpl-3', type: 'template', name: 'Blog Premium', author: 'writer-co', category: 'Blog', tags: ['blog', 'cms', 'md'], rating: 4.7, installs: 3400, price: '$19', description: 'Premium blog with CMS, categories, newsletter', featured: false },
  { id: 'tmpl-4', type: 'template', name: 'Portfolio Modern', author: 'design-co', category: 'Portfolio', tags: ['portfolio', 'designer', 'modern'], rating: 4.9, installs: 5600, price: 'free', description: 'Modern portfolio with projects showcase', featured: true },
  { id: 'tmpl-5', type: 'template', name: 'Landing Page Pack', author: 'growth-co', category: 'Landing', tags: ['landing', 'marketing', 'pack'], rating: 4.6, installs: 4100, price: '$29', description: '10 landing page variations for different industries', featured: false },
  { id: 'tmpl-6', type: 'template', name: 'Admin Dashboard', author: 'elmoorx-team', category: 'Dashboard', tags: ['admin', 'dashboard', 'analytics'], rating: 4.9, installs: 7200, price: '$34', description: 'Complete admin dashboard with 9 pages', featured: true },
  { id: 'tmpl-7', type: 'template', name: 'Documentation Site', author: 'docs-co', category: 'Docs', tags: ['docs', 'md', 'search'], rating: 4.5, installs: 1800, price: 'free', description: 'Documentation site with search and versioning', featured: false },
  { id: 'tmpl-8', type: 'template', name: 'Real Estate', author: 'prop-dev', category: 'Real Estate', tags: ['real-estate', 'listings', 'map'], rating: 4.7, installs: 1200, price: '$44', description: 'Real estate listings with map integration', featured: false },

  // Themes
  { id: 'theme-1', type: 'theme', name: 'Midnight Purple', author: 'design-co', category: 'Dark', tags: ['dark', 'purple', 'modern'], rating: 4.8, installs: 8900, price: 'free', description: 'Dark theme with purple accents', featured: true },
  { id: 'theme-2', type: 'theme', name: 'Ocean Breeze', author: 'design-co', category: 'Light', tags: ['light', 'blue', 'clean'], rating: 4.7, installs: 6700, price: 'free', description: 'Light theme with ocean blue palette', featured: false },
  { id: 'theme-3', type: 'theme', name: 'Sunset Pro', author: 'design-co', category: 'Gradient', tags: ['gradient', 'sunset', 'warm'], rating: 4.9, installs: 5400, price: '$9', description: 'Warm gradient theme with sunset colors', featured: true },
  { id: 'theme-4', type: 'theme', name: 'Minimal Mono', author: 'design-co', category: 'Minimal', tags: ['minimal', 'mono', 'clean'], rating: 4.6, installs: 4300, price: 'free', description: 'Minimal monochrome theme', featured: false },

  // Plugins
  { id: 'plug-1', type: 'plugin', name: 'AI Content Generator', author: 'ai-co', category: 'AI', tags: ['ai', 'content', 'gpt'], rating: 4.9, installs: 3200, price: '$19/mo', description: 'Generate blog posts, descriptions, and more with AI', featured: true },
  { id: 'plug-2', type: 'plugin', name: 'Analytics Pro', author: 'data-co', category: 'Analytics', tags: ['analytics', 'tracking', 'privacy'], rating: 4.7, installs: 5600, price: 'free', description: 'Privacy-first analytics with no cookies', featured: false },
  { id: 'plug-3', type: 'plugin', name: 'SEO Optimizer', author: 'seo-co', category: 'SEO', tags: ['seo', 'meta', 'sitemap'], rating: 4.8, installs: 4100, price: '$14', description: 'Auto-optimize meta tags, sitemaps, and structured data', featured: true },
];

const AUTHORS = [
  { username: 'elmoorx-team', name: 'Elmoorx Team', verified: true, items: 24, followers: 12400 },
  { username: 'design-co', name: 'Design Co.', verified: true, items: 18, followers: 8900 },
  { username: 'ahmed', name: 'Ahmed Hassan', verified: false, items: 12, followers: 2300 },
  { username: 'sara', name: 'Sara Mohamed', verified: true, items: 8, followers: 5600 },
  { username: 'ai-co', name: 'AI Co.', verified: true, items: 5, followers: 9800 },
];

const REVIEWS = [
  { itemId: 'comp-1', user: 'dev_guy', rating: 5, comment: 'Works perfectly out of the box!', date: '2026-07-10' },
  { itemId: 'comp-1', user: 'sara_dev', rating: 5, comment: 'Best counter component I have used.', date: '2026-07-08' },
  { itemId: 'comp-5', user: 'ui_lover', rating: 5, comment: 'Beautiful animations, super smooth.', date: '2026-07-09' },
  { itemId: 'tmpl-1', user: 'startup_founder', rating: 5, comment: 'Saved me 3 weeks of development!', date: '2026-07-11' },
];

// ─── HTML ───────────────────────────────────────────────────────────────────

function generateHTML() {
  const featured = ITEMS.filter(i => i.featured);
  const components = ITEMS.filter(i => i.type === 'component');
  const templates = ITEMS.filter(i => i.type === 'template');
  const themes = ITEMS.filter(i => i.type === 'theme');
  const plugins = ITEMS.filter(i => i.type === 'plugin');

  const renderCard = (item) => `
    <div class="card" onclick="viewItem('${item.id}')">
      <div class="card-preview">${item.type === 'component' ? '🧩' : item.type === 'template' ? '📄' : item.type === 'theme' ? '🎨' : '🔌'}</div>
      <div class="card-body">
        <h3>${item.name}${item.featured ? ' ⭐' : ''}</h3>
        <p>${item.description}</p>
        <div class="meta">
          <span>by ${item.author}</span>
          <span>⭐ ${item.rating}</span>
          <span>📥 ${item.installs.toLocaleString()}</span>
          <span class="price ${item.price === 'free' ? 'free' : 'paid'}">${item.price}</span>
        </div>
        <div class="tags">${item.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
      </div>
    </div>`;

  return `<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
<meta charset="UTF-8">
<title>Elmoorx Marketplace</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, sans-serif; background: #f8fafc; color: #1e293b; }
  header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 60px 20px; text-align: center; }
  header h1 { font-size: 36px; margin-bottom: 8px; }
  .search { max-width: 600px; margin: 24px auto 0; display: flex; gap: 8px; }
  .search input { flex: 1; padding: 12px 16px; border: none; border-radius: 8px; font-size: 16px; }
  .search button { padding: 12px 24px; background: #1e293b; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; }
  .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
  .filters { display: flex; gap: 8px; margin-bottom: 32px; flex-wrap: wrap; }
  .filter { background: white; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 14px; }
  .filter.active { background: #4f46e5; color: white; }
  .section { margin-bottom: 48px; }
  .section h2 { font-size: 24px; margin-bottom: 16px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }
  .card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.2s; }
  .card:hover { transform: translateY(-4px); box-shadow: 0 10px 30px rgba(0,0,0,0.15); }
  .card-preview { height: 140px; background: linear-gradient(135deg, #eef2ff, #ddd6fe); display: flex; align-items: center; justify-content: center; font-size: 48px; }
  .card-body { padding: 16px; }
  .card-body h3 { font-size: 16px; margin-bottom: 4px; }
  .card-body p { font-size: 13px; color: #64748b; margin-bottom: 8px; }
  .meta { display: flex; gap: 12px; font-size: 12px; color: #64748b; margin-bottom: 8px; flex-wrap: wrap; }
  .price.free { color: #10b981; font-weight: 600; }
  .price.paid { color: #4f46e5; font-weight: 600; }
  .tags { display: flex; gap: 4px; flex-wrap: wrap; }
  .tag { background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 8px; font-size: 11px; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
  .stat { background: white; padding: 24px; border-radius: 12px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .stat .num { font-size: 32px; font-weight: 700; color: #4f46e5; }
  .stat .label { font-size: 12px; color: #64748b; text-transform: uppercase; margin-top: 4px; }
</style>
</head>
<body>

<header>
  <h1>🛍️ Elmoorx Marketplace</h1>
  <p>Discover components, templates, themes, and plugins</p>
  <div class="search">
    <input type="text" placeholder="Search ${ITEMS.length} items..." id="search">
    <button onclick="search()">Search</button>
  </div>
</header>

<div class="container">
  <div class="stats">
    <div class="stat"><div class="num">${ITEMS.length}</div><div class="label">Total Items</div></div>
    <div class="stat"><div class="num">${components.length}</div><div class="label">Components</div></div>
    <div class="stat"><div class="num">${templates.length}</div><div class="label">Templates</div></div>
    <div class="stat"><div class="num">${ITEMS.reduce((s, i) => s + i.installs, 0).toLocaleString()}</div><div class="label">Installs</div></div>
  </div>

  <div class="filters">
    <div class="filter active" onclick="filter('all', this)">All (${ITEMS.length})</div>
    <div class="filter" onclick="filter('component', this)">Components (${components.length})</div>
    <div class="filter" onclick="filter('template', this)">Templates (${templates.length})</div>
    <div class="filter" onclick="filter('theme', this)">Themes (${themes.length})</div>
    <div class="filter" onclick="filter('plugin', this)">Plugins (${plugins.length})</div>
  </div>

  <div class="section">
    <h2>⭐ Featured</h2>
    <div class="grid">${featured.map(renderCard).join('')}</div>
  </div>

  <div class="section">
    <h2>🧩 Components</h2>
    <div class="grid">${components.map(renderCard).join('')}</div>
  </div>

  <div class="section">
    <h2>📄 Templates</h2>
    <div class="grid">${templates.map(renderCard).join('')}</div>
  </div>

  <div class="section">
    <h2>🎨 Themes</h2>
    <div class="grid">${themes.map(renderCard).join('')}</div>
  </div>

  <div class="section">
    <h2>🔌 Plugins</h2>
    <div class="grid">${plugins.map(renderCard).join('')}</div>
  </div>
</div>

<script>
function filter(type, el) {
  document.querySelectorAll('.filter').forEach(f => f.classList.remove('active'));
  el.classList.add('active');
  // In a real app, this would filter the grid
}

function viewItem(id) {
  alert('Viewing item: ' + id + '\\n(In production, this opens the item detail page)');
}

function search() {
  const q = document.getElementById('search').value;
  alert('Searching for: ' + q);
}
</script>

</body>
</html>`;
}

// ─── HTTP server ────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.setHeader('Content-Type', 'text/html');
    return res.end(generateHTML());
  }

  if (req.url === '/api/items') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ total: ITEMS.length, items: ITEMS }));
  }

  if (req.url.startsWith('/api/items/') && req.url.split('/').length === 4) {
    const id = req.url.split('/').pop();
    const item = ITEMS.find(i => i.id === id);
    if (!item) { res.statusCode = 404; return res.end(JSON.stringify({ error: 'Not found' })); }
    const reviews = REVIEWS.filter(r => r.itemId === id);
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ item, reviews }));
  }

  if (req.url.startsWith('/api/search?q=')) {
    const q = decodeURIComponent(req.url.split('q=')[1]).toLowerCase();
    const results = ITEMS.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q) ||
      i.tags.some(t => t.toLowerCase().includes(q))
    );
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ query: q, results, total: results.length }));
  }

  if (req.url === '/api/authors') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(AUTHORS));
  }

  if (req.url === '/api/featured') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(ITEMS.filter(i => i.featured)));
  }

  if (req.url === '/health') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      status: 'ok', service: 'marketplace', version: '2.0.0-alpha.24',
      items: ITEMS.length,
      authors: AUTHORS.length,
      totalInstalls: ITEMS.reduce((s, i) => s + i.installs, 0),
    }));
  }

  res.statusCode = 404;
  res.end('Not found');
});

const PORT = 5700;
server.listen(PORT, () => {
  console.log(`  ✓ Marketplace          → http://localhost:${PORT}`);
});

module.exports = { server };
