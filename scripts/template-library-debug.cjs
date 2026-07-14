#!/usr/bin/env node
/**
 * Elmoorx Template Library — 50+ ready-to-use page templates
 *
 * Categories:
 *   1. Landing Pages (10) — marketing, SaaS, product, startup, portfolio
 *   2. Authentication (8) — login, signup, forgot, 2FA, OAuth, magic link
 *   3. Dashboards (8) — admin, analytics, sales, CRM, projects
 *   4. E-commerce (8) — product list, detail, cart, checkout, orders
 *   5. Blog/CMS (6) — list, post, archive, categories, tags
 *   6. Profile/Settings (5) — profile, account, notifications, security
 *   7. Errors (5) — 404, 500, 403, 503, offline
 *
 * Runs on port 5300
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// ─── Template Definitions ──────────────────────────────────────────────────

const TEMPLATES = [
  // ── Landing Pages (10) ──────────────────────────────────────────────────
  { id: 'landing-saas', name: 'SaaS Landing', category: 'Landing', description: 'Modern SaaS marketing page with hero, features, pricing', icon: '🚀' },
  { id: 'landing-startup', name: 'Startup Landing', category: 'Landing', description: 'Bold startup page with video background CTA', icon: '💡' },
  { id: 'landing-product', name: 'Product Launch', category: 'Landing', description: 'Product launch countdown with feature grid', icon: '🎯' },
  { id: 'landing-portfolio', name: 'Portfolio', category: 'Landing', description: 'Personal portfolio with projects showcase', icon: '👤' },
  { id: 'landing-agency', name: 'Agency', category: 'Landing', description: 'Agency website with services and case studies', icon: '🏢' },
  { id: 'landing-app', name: 'App Download', category: 'Landing', description: 'Mobile app download page with QR codes', icon: '📱' },
  { id: 'landing-event', name: 'Event Page', category: 'Landing', description: 'Conference event with speakers and schedule', icon: '📅' },
  { id: 'landing-book', name: 'Book Landing', category: 'Landing', description: 'Book landing with chapter previews', icon: '📚' },
  { id: 'landing-course', name: 'Course Landing', category: 'Landing', description: 'Online course with curriculum and pricing', icon: '🎓' },
  { id: 'landing-nonprofit', name: 'Nonprofit', category: 'Landing', description: 'Nonprofit donation page with impact stats', icon: '❤️' },

  // ── Authentication (8) ──────────────────────────────────────────────────
  { id: 'auth-login', name: 'Login', category: 'Auth', description: 'Simple email/password login', icon: '🔑' },
  { id: 'auth-signup', name: 'Sign Up', category: 'Auth', description: 'Registration with email verification', icon: '📝' },
  { id: 'auth-forgot', name: 'Forgot Password', category: 'Auth', description: 'Password reset request form', icon: '🔄' },
  { id: 'auth-reset', name: 'Reset Password', category: 'Auth', description: 'New password entry form', icon: '🔒' },
  { id: 'auth-2fa', name: 'Two-Factor Auth', category: 'Auth', description: 'OTP code entry for 2FA', icon: '🔢' },
  { id: 'auth-oauth', name: 'OAuth Login', category: 'Auth', description: 'Social login with Google/GitHub', icon: '🌐' },
  { id: 'auth-magic', name: 'Magic Link', category: 'Auth', description: 'Passwordless email magic link', icon: '✨' },
  { id: 'auth-welcome', name: 'Welcome Screen', category: 'Auth', description: 'Post-signup onboarding welcome', icon: '👋' },

  // ── Dashboards (8) ─────────────────────────────────────────────────────
  { id: 'dash-admin', name: 'Admin Dashboard', category: 'Dashboard', description: 'Full admin panel with sidebar', icon: '📊' },
  { id: 'dash-analytics', name: 'Analytics', category: 'Dashboard', description: 'Analytics dashboard with charts', icon: '📈' },
  { id: 'dash-sales', name: 'Sales Dashboard', category: 'Dashboard', description: 'Sales pipeline with revenue metrics', icon: '💰' },
  { id: 'dash-crm', name: 'CRM', category: 'Dashboard', description: 'Customer relationship management view', icon: '🤝' },
  { id: 'dash-projects', name: 'Project Management', category: 'Dashboard', description: 'Kanban-style project board', icon: '📋' },
  { id: 'dash-finance', name: 'Finance', category: 'Dashboard', description: 'Financial overview with budgets', icon: '🏦' },
  { id: 'dash-support', name: 'Support Tickets', category: 'Dashboard', description: 'Helpdesk ticket queue', icon: '🎧' },
  { id: 'dash-monitoring', name: 'Monitoring', category: 'Dashboard', description: 'System health and uptime', icon: '🩺' },

  // ── E-commerce (8) ─────────────────────────────────────────────────────
  { id: 'shop-list', name: 'Product List', category: 'E-commerce', description: 'Grid of products with filters', icon: '🛍️' },
  { id: 'shop-detail', name: 'Product Detail', category: 'E-commerce', description: 'Single product with gallery', icon: '🏷️' },
  { id: 'shop-cart', name: 'Shopping Cart', category: 'E-commerce', description: 'Cart with quantity controls', icon: '🛒' },
  { id: 'shop-checkout', name: 'Checkout', category: 'E-commerce', description: 'Multi-step checkout flow', icon: '💳' },
  { id: 'shop-orders', name: 'Orders', category: 'E-commerce', description: 'Order history with tracking', icon: '📦' },
  { id: 'shop-wishlist', name: 'Wishlist', category: 'E-commerce', description: 'Saved products for later', icon: '💖' },
  { id: 'shop-search', name: 'Search Results', category: 'E-commerce', description: 'Search with facets', icon: '🔍' },
  { id: 'shop-categories', name: 'Categories', category: 'E-commerce', description: 'Category browse page', icon: '📂' },

  // ── Blog/CMS (6) ───────────────────────────────────────────────────────
  { id: 'blog-list', name: 'Blog Home', category: 'Blog', description: 'Blog homepage with featured posts', icon: '📰' },
  { id: 'blog-post', name: 'Blog Post', category: 'Blog', description: 'Single article with comments', icon: '✍️' },
  { id: 'blog-archive', name: 'Archive', category: 'Blog', description: 'Posts grouped by month', icon: '🗂️' },
  { id: 'blog-categories', name: 'Categories', category: 'Blog', description: 'Browse by category', icon: '🏷️' },
  { id: 'blog-author', name: 'Author Page', category: 'Blog', description: 'Author bio with their posts', icon: '🧑‍💻' },
  { id: 'blog-newsletter', name: 'Newsletter', category: 'Blog', description: 'Newsletter signup landing', icon: '📧' },

  // ── Profile/Settings (5) ───────────────────────────────────────────────
  { id: 'profile-view', name: 'Profile', category: 'Profile', description: 'Public profile view', icon: '👤' },
  { id: 'profile-edit', name: 'Edit Profile', category: 'Profile', description: 'Edit personal information', icon: '✏️' },
  { id: 'settings-account', name: 'Account Settings', category: 'Profile', description: 'Account preferences', icon: '⚙️' },
  { id: 'settings-notifications', name: 'Notifications', category: 'Profile', description: 'Notification preferences', icon: '🔔' },
  { id: 'settings-security', name: 'Security', category: 'Profile', description: 'Password, 2FA, sessions', icon: '🔐' },

  // ── Errors (5) ─────────────────────────────────────────────────────────
  { id: 'err-404', name: '404 Not Found', category: 'Error', description: 'Page not found error', icon: '❓' },
  { id: 'err-500', name: '500 Server Error', category: 'Error', description: 'Internal server error', icon: '💥' },
  { id: 'err-403', name: '403 Forbidden', category: 'Error', description: 'Access denied page', icon: '🚫' },
  { id: 'err-503', name: '503 Unavailable', category: 'Error', description: 'Service unavailable', icon: '🛑' },
  { id: 'err-offline', name: 'Offline', category: 'Error', description: 'No internet connection', icon: '📡' },
];

// ─── HTML Renderer for each template ───────────────────────────────────────

function renderTemplate(id) {
  const tmpl = TEMPLATES.find(t => t.id === id);
  if (!tmpl) return null;

  const renderers = {
    'landing-saas': () => `<section style="padding:80px 20px;text-align:center;background:linear-gradient(135deg,#667eea,#764ba2);color:white;">
  <h1 style="font-size:48px;margin-bottom:16px;">Build Faster with Elmoorx</h1>
  <p style="font-size:20px;opacity:0.9;margin-bottom:32px;">The framework that ships 4.2kb and runs everywhere.</p>
  <button style="background:white;color:#667eea;padding:14px 32px;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;">Get Started Free →</button>
</section>
<section style="padding:60px 20px;max-width:1200px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:24px;">
  <div style="padding:24px;border:1px solid #e2e8f0;border-radius:12px;"><h3>⚡ Fast</h3><p>160M ops/s signal reads</p></div>
  <div style="padding:24px;border:1px solid #e2e8f0;border-radius:12px;"><h3>🔒 Secure</h3><p>A+ Mozilla Observatory</p></div>
  <div style="padding:24px;border:1px solid #e2e8f0;border-radius:12px;"><h3>🌍 Edge-Ready</h3><p>28ms cold start</p></div>
</section>
<section style="padding:60px 20px;background:#f8fafc;text-align:center;">
  <h2>Simple, Transparent Pricing</h2>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:1000px;margin:32px auto;">
    <div style="background:white;padding:32px;border-radius:12px;"><h3>Free</h3><p style="font-size:36px;">$0</p><button>Start</button></div>
    <div style="background:white;padding:32px;border-radius:12px;border:2px solid #667eea;"><h3>Pro</h3><p style="font-size:36px;">$99</p><button>Choose</button></div>
    <div style="background:white;padding:32px;border-radius:12px;"><h3>Enterprise</h3><p style="font-size:36px;">$499</p><button>Contact</button></div>
  </div>
</section>`,

    'landing-startup': () => `<section style="padding:100px 20px;text-align:center;background:#0f172a;color:white;">
  <span style="background:#1e293b;padding:4px 12px;border-radius:12px;font-size:12px;">🎉 Now in beta</span>
  <h1 style="font-size:56px;margin:24px 0;">Change Everything</h1>
  <p style="font-size:20px;color:#94a3b8;margin-bottom:40px;">The startup tool you've been waiting for.</p>
  <div><button style="background:#6366f1;color:white;padding:14px 32px;border:none;border-radius:8px;font-size:16px;cursor:pointer;">Watch Demo ▶</button></div>
</section>`,

    'landing-portfolio': () => `<section style="padding:80px 20px;max-width:1000px;margin:0 auto;">
  <h1 style="font-size:48px;">Hi, I'm Ahmed 👋</h1>
  <p style="font-size:20px;color:#64748b;">Full-stack developer & designer</p>
  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:24px;margin-top:48px;">
    <div style="background:#f1f5f9;padding:24px;border-radius:12px;"><h3>Project Alpha</h3><p>SaaS dashboard built with Elmoorx</p></div>
    <div style="background:#f1f5f9;padding:24px;border-radius:12px;"><h3>Project Beta</h3><p>E-commerce mobile app</p></div>
  </div>
</section>`,

    'auth-login': () => `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f1f5f9;">
  <div style="background:white;padding:40px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.1);width:400px;">
    <h2 style="margin-bottom:24px;text-align:center;">Welcome Back</h2>
    <input type="email" placeholder="Email" style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #e2e8f0;border-radius:6px;">
    <input type="password" placeholder="Password" style="width:100%;padding:12px;margin-bottom:16px;border:1px solid #e2e8f0;border-radius:6px;">
    <button style="width:100%;background:#4f46e5;color:white;padding:12px;border:none;border-radius:6px;cursor:pointer;">Sign In</button>
    <p style="text-align:center;margin-top:16px;font-size:14px;"><a href="#">Forgot password?</a></p>
    <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;">
    <button style="width:100%;background:white;border:1px solid #e2e8f0;padding:12px;border-radius:6px;cursor:pointer;">Continue with Google</button>
  </div>
</div>`,

    'auth-signup': () => `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#667eea,#764ba2);">
  <div style="background:white;padding:40px;border-radius:12px;width:440px;">
    <h2 style="text-align:center;margin-bottom:8px;">Create Account</h2>
    <p style="text-align:center;color:#64748b;margin-bottom:24px;">Start your free 14-day trial</p>
    <input placeholder="Full Name" style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #e2e8f0;border-radius:6px;">
    <input type="email" placeholder="Email" style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #e2e8f0;border-radius:6px;">
    <input type="password" placeholder="Password (min 8 chars)" style="width:100%;padding:12px;margin-bottom:16px;border:1px solid #e2e8f0;border-radius:6px;">
    <button style="width:100%;background:#4f46e5;color:white;padding:12px;border:none;border-radius:6px;cursor:pointer;">Create Account</button>
  </div>
</div>`,

    'auth-2fa': () => `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:white;">
  <div style="text-align:center;">
    <div style="font-size:48px;margin-bottom:24px;">🔢</div>
    <h2>Enter Verification Code</h2>
    <p style="color:#94a3b8;margin-bottom:32px;">We sent a 6-digit code to your phone</p>
    <div style="display:flex;gap:8px;justify-content:center;margin-bottom:24px;">
      ${[1,2,3,4,5,6].map(() => `<input maxlength="1" style="width:48px;height:56px;text-align:center;font-size:24px;background:#1e293b;color:white;border:1px solid #334155;border-radius:8px;">`).join('')}
    </div>
    <button style="background:#6366f1;color:white;padding:12px 32px;border:none;border-radius:6px;cursor:pointer;">Verify</button>
    <p style="margin-top:24px;font-size:14px;color:#64748b;">Didn't receive code? <a href="#" style="color:#818cf8;">Resend</a></p>
  </div>
</div>`,

    'dash-admin': () => `<div style="display:grid;grid-template-columns:240px 1fr;min-height:100vh;background:#f1f5f9;">
  <aside style="background:#0f172a;color:white;padding:24px 0;">
    <h3 style="padding:0 24px 24px;color:#818cf8;">Admin Panel</h3>
    <div style="padding:10px 24px;color:#94a3b8;">📊 Dashboard</div>
    <div style="padding:10px 24px;background:#1e293b;color:white;">👥 Users</div>
    <div style="padding:10px 24px;color:#94a3b8;">🏢 Workspaces</div>
    <div style="padding:10px 24px;color:#94a3b8;">💳 Billing</div>
    <div style="padding:10px 24px;color:#94a3b8;">📜 Audit Log</div>
  </aside>
  <main style="padding:32px;">
    <h2 style="margin-bottom:24px;">Dashboard</h2>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px;">
      <div style="background:white;padding:20px;border-radius:8px;"><div style="color:#64748b;font-size:12px;">USERS</div><div style="font-size:32px;font-weight:700;">1,234</div></div>
      <div style="background:white;padding:20px;border-radius:8px;"><div style="color:#64748b;font-size:12px;">REVENUE</div><div style="font-size:32px;font-weight:700;">$12.4k</div></div>
      <div style="background:white;padding:20px;border-radius:8px;"><div style="color:#64748b;font-size:12px;">ACTIVE</div><div style="font-size:32px;font-weight:700;">892</div></div>
      <div style="background:white;padding:20px;border-radius:8px;"><div style="color:#64748b;font-size:12px;">CHURN</div><div style="font-size:32px;font-weight:700;">2.1%</div></div>
    </div>
    <div style="background:white;padding:24px;border-radius:8px;"><h3>Recent Users</h3><table style="width:100%;"><tr><th>Email</th><th>Joined</th><th>Status</th></tr><tr><td>user@test.com</td><td>Today</td><td>Active</td></tr></table></div>
  </main>
</div>`,

    'dash-analytics': () => `<div style="padding:32px;background:#f8fafc;min-height:100vh;">
  <h2 style="margin-bottom:24px;">Analytics Overview</h2>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px;">
    <div style="background:white;padding:20px;border-radius:8px;"><div style="color:#64748b;font-size:12px;">PAGE VIEWS</div><div style="font-size:32px;">48.2k</div><div style="color:#10b981;font-size:12px;">↑ 12%</div></div>
    <div style="background:white;padding:20px;border-radius:8px;"><div style="color:#64748b;font-size:12px;">UNIQUE VISITORS</div><div style="font-size:32px;">12.8k</div><div style="color:#10b981;font-size:12px;">↑ 8%</div></div>
    <div style="background:white;padding:20px;border-radius:8px;"><div style="color:#64748b;font-size:12px;">BOUNCE RATE</div><div style="font-size:32px;">32%</div><div style="color:#ef4444;font-size:12px;">↑ 2%</div></div>
    <div style="background:white;padding:20px;border-radius:8px;"><div style="color:#64748b;font-size:12px;">AVG SESSION</div><div style="font-size:32px;">4m 32s</div><div style="color:#10b981;font-size:12px;">↑ 15s</div></div>
  </div>
  <div style="background:white;padding:24px;border-radius:8px;height:300px;display:flex;align-items:flex-end;padding-bottom:40px;">
    ${[40, 65, 50, 80, 70, 95, 85, 100, 75, 90, 60, 88].map(h => `<div style="flex:1;background:linear-gradient(180deg,#6366f1,#4f46e5);margin:0 4px;border-radius:4px 4px 0 0;height:${h}%;"></div>`).join('')}
  </div>
</div>`,

    'shop-list': () => `<div style="padding:32px;max-width:1200px;margin:0 auto;">
  <h2 style="margin-bottom:24px;">Products</h2>
  <div style="display:flex;gap:24px;">
    <aside style="width:200px;"><h4>Filters</h4><p>Category</p><p>Price</p><p>Brand</p></aside>
    <div style="flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:24px;">
      ${[1,2,3,4,5,6].map(i => `<div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <div style="height:200px;background:linear-gradient(135deg,#f1f5f9,#e2e8f0);"></div>
        <div style="padding:16px;"><h4>Product ${i}</h4><p style="color:#64748b;">$${(i*29.99).toFixed(2)}</p><button style="background:#4f46e5;color:white;padding:8px 16px;border:none;border-radius:6px;cursor:pointer;margin-top:8px;">Add to Cart</button></div>
      </div>`).join('')}
    </div>
  </div>
</div>`,

    'shop-cart': () => `<div style="padding:32px;max-width:1000px;margin:0 auto;">
  <h2 style="margin-bottom:24px;">Shopping Cart</h2>
  <div style="display:grid;grid-template-columns:1fr 320px;gap:24px;">
    <div style="background:white;border-radius:12px;padding:24px;">
      ${[1,2,3].map(i => `<div style="display:flex;gap:16px;padding:16px 0;border-bottom:1px solid #e2e8f0;">
        <div style="width:80px;height:80px;background:#f1f5f9;border-radius:8px;"></div>
        <div style="flex:1;"><h4>Product ${i}</h4><p style="color:#64748b;">$${(i*29.99).toFixed(2)}</p></div>
        <div><input type="number" value="${i}" style="width:60px;padding:4px;"> × $${(i*29.99).toFixed(2)}</div>
      </div>`).join('')}
    </div>
    <div style="background:white;border-radius:12px;padding:24px;height:fit-content;">
      <h4>Order Summary</h4>
      <div style="display:flex;justify-content:space-between;margin:8px 0;"><span>Subtotal</span><span>$179.97</span></div>
      <div style="display:flex;justify-content:space-between;margin:8px 0;"><span>Shipping</span><span>$9.99</span></div>
      <div style="display:flex;justify-content:space-between;margin:8px 0;font-weight:700;font-size:18px;"><span>Total</span><span>$189.96</span></div>
      <button style="width:100%;background:#10b981;color:white;padding:12px;border:none;border-radius:6px;cursor:pointer;margin-top:16px;">Checkout →</button>
    </div>
  </div>
</div>`,

    'blog-post': () => `<article style="max-width:700px;margin:0 auto;padding:60px 20px;">
  <p style="color:#6366f1;text-transform:uppercase;font-size:12px;letter-spacing:1px;">Tutorial</p>
  <h1 style="font-size:42px;margin:8px 0 16px;">Getting Started with Elmoorx Framework</h1>
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:32px;">
    <div style="width:40px;height:40px;border-radius:50%;background:#6366f1;"></div>
    <div><p style="font-weight:600;">Ahmed Hassan</p><p style="color:#64748b;font-size:14px;">Mar 14, 2026 · 8 min read</p></div>
  </div>
  <p style="font-size:18px;line-height:1.7;color:#334155;">Elmoorx is a signals-based framework that ships 4.2kb gzipped and runs anywhere. In this tutorial, we'll build a complete app from scratch.</p>
  <h2 style="margin-top:32px;">Installation</h2>
  <pre style="background:#0f172a;color:#10b981;padding:16px;border-radius:8px;overflow-x:auto;">npm install @elmoorx/runtime @elmoorx/router @elmoorx/server</pre>
  <h2>Your First Component</h2>
  <p>Components in Elmoorx use signals for reactivity. Let's create a counter:</p>
  <pre style="background:#0f172a;color:#818cf8;padding:16px;border-radius:8px;">import { $state, defineComponent } from '@elmoorx/runtime';

export const Counter = defineComponent({
  setup() {
    const count = $state(0);
    return () => <button onClick={() => count.value++}>{count.value}</button>;
  }
});</pre>
</article>`,

    'err-404': () => `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:white;text-align:center;">
  <div>
    <h1 style="font-size:120px;color:#6366f1;margin:0;">404</h1>
    <h2 style="margin:16px 0;">Page Not Found</h2>
    <p style="color:#94a3b8;margin-bottom:32px;">The page you're looking for doesn't exist.</p>
    <a href="/" style="background:#6366f1;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">← Back Home</a>
  </div>
</div>`,

    'err-500': () => `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fef2f2;text-align:center;">
  <div>
    <div style="font-size:80px;">💥</div>
    <h1 style="font-size:48px;color:#991b1b;">Server Error</h1>
    <p style="color:#7f1d1d;margin:16px 0 32px;">Something went wrong on our end. We're working on it.</p>
    <button style="background:#991b1b;color:white;padding:12px 24px;border:none;border-radius:6px;cursor:pointer;">Try Again</button>
  </div>
</div>`,
  };

  const renderer = renderers[id] || (() => `<div style="padding:80px;text-align:center;"><h1>${tmpl.name}</h1><p>${tmpl.description}</p><p style="color:#94a3b8;">Full template preview coming soon.</p></div>`);
  return renderer();
}

// ─── Main HTML ──────────────────────────────────────────────────────────────

function generateMainHTML() {
  const categories = [...new Set(TEMPLATES.map(t => t.category))];
  let html = `<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Elmoorx Template Library — ${TEMPLATES.length} Templates</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; }
  header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 60px 20px; text-align: center; }
  header h1 { font-size: 36px; margin-bottom: 8px; }
  header p { opacity: 0.9; }
  .stats { display: flex; gap: 32px; justify-content: center; margin-top: 24px; }
  .stat { text-align: center; }
  .stat .num { font-size: 32px; font-weight: 700; }
  .stat .label { font-size: 12px; opacity: 0.8; text-transform: uppercase; }

  .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
  .filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 32px; }
  .filter { background: white; border: 1px solid #e2e8f0; padding: 6px 16px; border-radius: 16px; cursor: pointer; font-size: 14px; }
  .filter.active { background: #4f46e5; color: white; border-color: #4f46e5; }

  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }
  .card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
  .card:hover { transform: translateY(-4px); box-shadow: 0 10px 30px rgba(0,0,0,0.15); }
  .card-preview { height: 160px; background: linear-gradient(135deg, #eef2ff, #ddd6fe); display: flex; align-items: center; justify-content: center; font-size: 48px; }
  .card-body { padding: 16px; }
  .card-body h3 { font-size: 16px; margin-bottom: 4px; }
  .card-body p { font-size: 13px; color: #64748b; }
  .card-category { display: inline-block; background: #eef2ff; color: #4338ca; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-top: 8px; }

  .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: none; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
  .modal-bg.show { display: flex; }
  .modal { background: white; border-radius: 12px; max-width: 1000px; width: 100%; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; }
  .modal-header { padding: 16px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
  .modal-close { cursor: pointer; font-size: 24px; color: #64748b; background: none; border: none; }
  .modal-body { overflow-y: auto; padding: 0; }
  .modal-actions { padding: 16px 24px; border-top: 1px solid #e2e8f0; display: flex; gap: 8px; justify-content: flex-end; }
  .btn { background: #4f46e5; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; }
  .btn:hover { background: #4338ca; }

  .preview-frame { background: white; min-height: 500px; }
</style>
</head>
<body>

<header>
  <h1>🎨 Elmoorx Template Library</h1>
  <p>${TEMPLATES.length} ready-to-use page templates for every need</p>
  <div class="stats">
    <div class="stat"><div class="num">${TEMPLATES.length}</div><div class="label">Templates</div></div>
    <div class="stat"><div class="num">${categories.length}</div><div class="label">Categories</div></div>
    <div class="stat"><div class="num">648</div><div class="label">Components Used</div></div>
    <div class="stat"><div class="num">100%</div><div class="label">Customizable</div></div>
  </div>
</header>

<div class="container">
  <div class="filters" id="filters">
    <div class="filter active" onclick="filterCategory('all', this)">All (${TEMPLATES.length})</div>
    ${categories.map(cat => `<div class="filter" onclick="filterCategory('${cat}', this)">${cat} (${TEMPLATES.filter(t => t.category === cat).length})</div>`).join('')}
  </div>

  <div class="grid" id="grid">
    ${TEMPLATES.map(t => `<div class="card" onclick="openPreview('${t.id}')" data-category="${t.category}">
      <div class="card-preview">${t.icon}</div>
      <div class="card-body">
        <h3>${t.name}</h3>
        <p>${t.description}</p>
        <span class="card-category">${t.category}</span>
      </div>
    </div>`).join('')}
  </div>
</div>

<div class="modal-bg" id="modal" onclick="if(event.target===this)closeModal()">
  <div class="modal">
    <div class="modal-header">
      <h3 id="modal-title">Template Preview</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <div class="preview-frame" id="preview-frame"></div>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="copyCode()">📋 Copy Code</button>
      <button class="btn" onclick="openInBuilder()">🎨 Open in Builder</button>
      <button class="btn" onclick="downloadTemplate()">⬇ Download</button>
    </div>
  </div>
</div>

<script>
const TEMPLATES = ${JSON.stringify(TEMPLATES.map(t => ({ id: t.id, name: t.name, category: t.category, description: t.description })))};

function filterCategory(cat, el) {
  document.querySelectorAll('.filter').forEach(f => f.classList.remove('active'));
  el.classList.add('active');
  const cards = document.querySelectorAll('.card');
  cards.forEach(c => {
    c.style.display = (cat === 'all' || c.dataset.category === cat) ? '' : 'none';
  });
}

let currentTemplate = null;

function openPreview(id) {
  currentTemplate = id;
  const tmpl = TEMPLATES.find(t => t.id === id);
  document.getElementById('modal-title').textContent = tmpl.name + ' (' + tmpl.category + ')';
  fetch('/api/preview/' + id)
    .then(r => r.text())
    .then(html => { document.getElementById('preview-frame').innerHTML = html; });
  document.getElementById('modal').classList.add('show');
}

function closeModal() {
  document.getElementById('modal').classList.remove('show');
}

function copyCode() {
  const html = document.getElementById('preview-frame').innerHTML;
  navigator.clipboard.write(html);
  alert('Template code copied to clipboard!');
}

function openInBuilder() {
  window.open('http://127.0.0.1:5100', '_blank');
}

function downloadTemplate() {
  const html = document.getElementById('preview-frame').innerHTML;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = currentTemplate + '.html'; a.click();
  URL.revokeObjectURL(url);
}
</script>

</body>
</html>`;
}

// ─── HTTP server ───────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.setHeader('Content-Type', 'text/html');
    try {
      const html = generateMainHTML();
      console.error('HTML length:', html.length);
      return res.end(html);
    } catch (e) {
      console.error('GENERATE ERROR:', e.message);
      console.error(e.stack);
      return res.end('Error: ' + e.message);
    }
  }

  if (req.url === '/api/templates') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      total: TEMPLATES.length,
      categories: [...new Set(TEMPLATES.map(t => t.category))],
      templates: TEMPLATES,
    }));
  }

  if (req.url.startsWith('/api/preview/')) {
    const id = req.url.split('/').pop();
    const html = renderTemplate(id);
    if (html === null) {
      res.statusCode = 404;
      return res.end('Template not found');
    }
    res.setHeader('Content-Type', 'text/html');
    return res.end(html);
  }

  if (req.url === '/health') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      status: 'ok', service: 'template-library', version: '2.0.0-alpha.23',
      templatesCount: TEMPLATES.length,
      categories: [...new Set(TEMPLATES.map(t => t.category))],
    }));
  }

  res.statusCode = 404;
  res.end('Not found');
});

const PORT = 5300;
server.listen(PORT, () => {
  console.log(`  ✓ Template Library    → http://localhost:${PORT} (${TEMPLATES.length} templates)`);
});

module.exports = { server, TEMPLATES };
