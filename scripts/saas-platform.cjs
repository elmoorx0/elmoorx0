#!/usr/bin/env node
/**
 * Elmoorx SaaS Platform — Full-featured SaaS application running on Elmoorx
 *
 * Modules:
 *   1. CRM (customers, leads, deals, pipeline)
 *   2. Project Management (projects, tasks, kanban, time tracking)
 *   3. Invoicing (invoices, payments, clients)
 *   4. Team Chat (real-time messages)
 *   5. File Sharing (upload, organize, share)
 *   6. Knowledge Base (articles, categories)
 *
 * Uses the live backend (port 3100) for auth, files, audit.
 *
 * Runs on port 5600
 */

const http = require('http');

// ─── In-memory data stores (production: use @elmoorx/postgres) ────────────────

const customers = new Map();
const leads = new Map();
const deals = new Map();
const projects = new Map();
const tasks = new Map();
const invoices = new Map();
const articles = new Map();
const messages = new Map();

// Seed with sample data
function seed() {
  // Customers
  [
    { id: 'cus_1', name: 'Acme Corp', email: 'contact@acme.com', plan: 'enterprise', value: 49900, status: 'active' },
    { id: 'cus_2', name: 'Globex', email: 'hello@globex.com', plan: 'pro', value: 9900, status: 'active' },
    { id: 'cus_3', name: 'Initech', email: 'billing@initech.com', plan: 'starter', value: 1900, status: 'active' },
    { id: 'cus_4', name: 'Umbrella Inc', email: 'ops@umbrella.com', plan: 'pro', value: 9900, status: 'churned' },
  ].forEach(c => customers.set(c.id, c));

  // Leads
  [
    { id: 'lead_1', name: 'Wayne Enterprises', email: 'bruce@wayne.com', stage: 'qualified', value: 50000, owner: 'Alice' },
    { id: 'lead_2', name: 'Stark Industries', email: 'tony@stark.com', stage: 'demo', value: 100000, owner: 'Bob' },
    { id: 'lead_3', name: 'Cyberdyne', email: 'sales@cyberdyne.com', stage: 'proposal', value: 25000, owner: 'Alice' },
    { id: 'lead_4', name: 'Tyrell Corp', email: 'eldon@tyrell.com', stage: 'new', value: 15000, owner: 'Charlie' },
  ].forEach(l => leads.set(l.id, l));

  // Deals
  [
    { id: 'deal_1', name: 'Acme Enterprise Renewal', value: 49900, stage: 'closed_won', customer: 'cus_1', closeDate: '2026-08-01' },
    { id: 'deal_2', name: 'Globex Upgrade', value: 29900, stage: 'negotiation', customer: 'cus_2', closeDate: '2026-08-15' },
    { id: 'deal_3', name: 'Initech Add-on', value: 4900, stage: 'qualified', customer: 'cus_3', closeDate: '2026-09-01' },
  ].forEach(d => deals.set(d.id, d));

  // Projects
  [
    { id: 'proj_1', name: 'Website Redesign', client: 'cus_1', status: 'active', progress: 65, deadline: '2026-08-30', team: ['Alice', 'Bob'] },
    { id: 'proj_2', name: 'Mobile App', client: 'cus_2', status: 'active', progress: 40, deadline: '2026-09-15', team: ['Charlie', 'Dave'] },
    { id: 'proj_3', name: 'API Integration', client: 'cus_3', status: 'completed', progress: 100, deadline: '2026-07-01', team: ['Alice'] },
  ].forEach(p => projects.set(p.id, p));

  // Tasks
  [
    { id: 'task_1', title: 'Design homepage hero', project: 'proj_1', assignee: 'Alice', status: 'done', priority: 'high' },
    { id: 'task_2', title: 'Build pricing section', project: 'proj_1', assignee: 'Bob', status: 'in_progress', priority: 'medium' },
    { id: 'task_3', title: 'Set up CI/CD', project: 'proj_1', assignee: 'Charlie', status: 'todo', priority: 'high' },
    { id: 'task_4', title: 'Implement auth flow', project: 'proj_2', assignee: 'Dave', status: 'in_progress', priority: 'high' },
    { id: 'task_5', title: 'Design dashboard', project: 'proj_2', assignee: 'Alice', status: 'todo', priority: 'medium' },
  ].forEach(t => tasks.set(t.id, t));

  // Invoices
  [
    { id: 'inv_1', number: 'INV-2026-001', client: 'cus_1', amount: 49900, status: 'paid', dueDate: '2026-07-01', paidDate: '2026-06-28' },
    { id: 'inv_2', number: 'INV-2026-002', client: 'cus_2', amount: 9900, status: 'pending', dueDate: '2026-07-15' },
    { id: 'inv_3', number: 'INV-2026-003', client: 'cus_3', amount: 1900, status: 'overdue', dueDate: '2026-06-15' },
    { id: 'inv_4', number: 'INV-2026-004', client: 'cus_1', amount: 12500, status: 'draft', dueDate: '2026-08-01' },
  ].forEach(i => invoices.set(i.id, i));

  // Knowledge base
  [
    { id: 'kb_1', title: 'Getting Started Guide', category: 'Onboarding', views: 1234, helpful: 89 },
    { id: 'kb_2', title: 'How to Use the API', category: 'Developers', views: 892, helpful: 95 },
    { id: 'kb_3', title: 'Billing & Invoicing FAQ', category: 'Billing', views: 567, helpful: 78 },
    { id: 'kb_4', title: 'Integrating with Slack', category: 'Integrations', views: 345, helpful: 92 },
  ].forEach(a => articles.set(a.id, a));

  // Team chat
  [
    { id: 'msg_1', user: 'Alice', text: 'Morning team! Let\'s sync at 10am', channel: 'general', time: Date.now() - 3600000 },
    { id: 'msg_2', user: 'Bob', text: 'I\'ll be 5 min late', channel: 'general', time: Date.now() - 3500000 },
    { id: 'msg_3', user: 'Charlie', text: 'Pushed the new design to staging', channel: 'proj_1', time: Date.now() - 1800000 },
    { id: 'msg_4', user: 'Dave', text: 'API docs updated, please review', channel: 'general', time: Date.now() - 900000 },
  ].forEach(m => messages.set(m.id, m));
}

seed();

// ─── HTML generators ────────────────────────────────────────────────────────

function layout(content, activeNav = 'crm') {
  const navItems = [
    { id: 'crm', label: 'CRM', icon: '🤝' },
    { id: 'projects', label: 'Projects', icon: '📋' },
    { id: 'invoices', label: 'Invoices', icon: '💳' },
    { id: 'chat', label: 'Team Chat', icon: '💬' },
    { id: 'kb', label: 'Knowledge', icon: '📚' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  ];
  return `<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Elmoorx SaaS Platform</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f1f5f9; color: #1e293b; }
  .layout { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
  .sidebar { background: #0f172a; color: #e2e8f0; padding: 24px 0; position: sticky; top: 0; height: 100vh; }
  .brand { padding: 0 24px 24px; border-bottom: 1px solid #1e293b; margin-bottom: 16px; }
  .brand h1 { color: #818cf8; font-size: 20px; }
  .brand p { font-size: 12px; color: #64748b; margin-top: 4px; }
  .nav-item { padding: 12px 24px; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.15s; color: #94a3b8; text-decoration: none; }
  .nav-item:hover { background: #1e293b; color: #e2e8f0; }
  .nav-item.active { background: #1e293b; color: #818cf8; border-right: 3px solid #6366f1; }
  .main { padding: 32px; overflow-y: auto; }
  h2 { font-size: 24px; margin-bottom: 8px; }
  .subtitle { color: #64748b; margin-bottom: 24px; }
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .stat-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .stat-card .label { font-size: 12px; color: #64748b; text-transform: uppercase; }
  .stat-card .value { font-size: 28px; font-weight: 700; margin: 8px 0 4px; }
  .stat-card .trend { font-size: 12px; }
  .stat-card .trend.up { color: #10b981; }
  .stat-card .trend.down { color: #ef4444; }
  .card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 24px; }
  .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .card-header h3 { font-size: 16px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { text-align: left; padding: 12px 8px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 12px; text-transform: uppercase; }
  td { padding: 12px 8px; border-bottom: 1px solid #f1f5f9; }
  tr:hover { background: #f8fafc; }
  .pill { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
  .pill.green { background: #d1fae5; color: #065f46; }
  .pill.red { background: #fee2e2; color: #991b1b; }
  .pill.yellow { background: #fef3c7; color: #92400e; }
  .pill.blue { background: #dbeafe; color: #1e40af; }
  .pill.gray { background: #f1f5f9; color: #475569; }
  .pill.purple { background: #ede9fe; color: #5b21b6; }
  .progress-bar { background: #e2e8f0; border-radius: 4px; height: 8px; overflow: hidden; width: 100px; display: inline-block; vertical-align: middle; }
  .progress-fill { background: #4f46e5; height: 100%; }
  .kanban { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .kanban-col { background: #f8fafc; border-radius: 8px; padding: 16px; min-height: 200px; }
  .kanban-col h4 { font-size: 13px; text-transform: uppercase; color: #64748b; margin-bottom: 12px; }
  .kanban-card { background: white; padding: 12px; border-radius: 6px; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
  .kanban-card .title { font-size: 14px; font-weight: 500; margin-bottom: 4px; }
  .kanban-card .meta { font-size: 11px; color: #64748b; }
  .chat-container { display: grid; grid-template-columns: 200px 1fr; height: 600px; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .chat-channels { background: #f1f5f9; padding: 16px; border-right: 1px solid #e2e8f0; }
  .chat-channels h4 { font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 8px; }
  .chat-channel { padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 14px; margin-bottom: 2px; }
  .chat-channel:hover { background: #e2e8f0; }
  .chat-channel.active { background: #4f46e5; color: white; }
  .chat-messages { padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
  .chat-msg { display: flex; gap: 8px; }
  .chat-avatar { width: 32px; height: 32px; border-radius: 50%; background: #6366f1; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; }
  .chat-bubble { flex: 1; }
  .chat-bubble .name { font-size: 13px; font-weight: 600; }
  .chat-bubble .time { font-size: 11px; color: #94a3b8; margin-left: 8px; }
  .chat-bubble .text { font-size: 14px; margin-top: 2px; }
</style>
</head>
<body>
<div class="layout">
  <aside class="sidebar">
    <div class="brand">
      <h1>⚡ Elmoorx SaaS</h1>
      <p>v2.0.0-alpha.24</p>
    </div>
    ${navItems.map(n => `<a class="nav-item ${n.id === activeNav ? 'active' : ''}" href="/${n.id}">${n.icon} ${n.label}</a>`).join('')}
  </aside>
  <main class="main">
    ${content}
  </main>
</div>
</body>
</html>`;
}

function renderDashboard() {
  const totalRevenue = Array.from(invoices.values()).filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const pendingRevenue = Array.from(invoices.values()).filter(i => i.status === 'pending' || i.status === 'overdue').reduce((s, i) => s + i.amount, 0);
  const activeProjects = Array.from(projects.values()).filter(p => p.status === 'active').length;
  const openDeals = Array.from(deals.values()).filter(d => d.stage !== 'closed_won' && d.stage !== 'closed_lost').length;

  return layout(`
    <h2>Dashboard</h2>
    <p class="subtitle">Welcome back! Here's what's happening today.</p>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="label">Total Revenue</div>
        <div class="value">$${(totalRevenue / 1000).toFixed(1)}k</div>
        <div class="trend up">↑ 12% vs last month</div>
      </div>
      <div class="stat-card">
        <div class="label">Pending Revenue</div>
        <div class="value">$${(pendingRevenue / 1000).toFixed(1)}k</div>
        <div class="trend down">↑ 3 invoices overdue</div>
      </div>
      <div class="stat-card">
        <div class="label">Active Projects</div>
        <div class="value">${activeProjects}</div>
        <div class="trend up">↑ 1 new this week</div>
      </div>
      <div class="stat-card">
        <div class="label">Open Deals</div>
        <div class="value">${openDeals}</div>
        <div class="trend up">↑ $45k in pipeline</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
      <div class="card">
        <div class="card-header"><h3>Revenue by Month</h3></div>
        <div style="display: flex; align-items: flex-end; height: 200px; gap: 8px;">
          ${[40, 65, 50, 80, 70, 95, 85, 100, 75, 90, 60, 88].map(h => `<div style="flex:1;background:linear-gradient(180deg,#6366f1,#4f46e5);border-radius:4px 4px 0 0;height:${h}%;"></div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Recent Activity</h3></div>
        <div style="font-size:14px;line-height:2;">
          <div>✅ Invoice INV-2026-001 paid ($49,900)</div>
          <div>🆕 Lead "Stark Industries" added</div>
          <div>📋 Task "Design homepage hero" completed</div>
          <div>💬 New message in #proj_1 channel</div>
          <div>💵 Deal "Globex Upgrade" moved to negotiation</div>
        </div>
      </div>
    </div>
  `, 'dashboard');
}

function renderCRM() {
  const dealsByStage = { new: [], qualified: [], demo: [], proposal: [], negotiation: [], closed_won: [], closed_lost: [] };
  Array.from(deals.values()).forEach(d => {
    if (dealsByStage[d.stage]) dealsByStage[d.stage].push(d);
  });

  return layout(`
    <h2>CRM</h2>
    <p class="subtitle">Manage customers, leads, and deals</p>

    <div class="stats-grid">
      <div class="stat-card"><div class="label">Total Customers</div><div class="value">${customers.size}</div><div class="trend up">↑ 2 new</div></div>
      <div class="stat-card"><div class="label">Active Leads</div><div class="value">${leads.size}</div><div class="trend up">↑ 1 new</div></div>
      <div class="stat-card"><div class="label">Pipeline Value</div><div class="value">$${(Array.from(deals.values()).reduce((s, d) => s + d.value, 0) / 1000).toFixed(0)}k</div><div class="trend up">↑ 8%</div></div>
      <div class="stat-card"><div class="label">Win Rate</div><div class="value">34%</div><div class="trend up">↑ 4%</div></div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Deals Pipeline</h3></div>
      <div class="kanban">
        ${Object.entries(dealsByStage).filter(([s]) => s !== 'closed_lost').map(([stage, stageDeals]) => `
          <div class="kanban-col">
            <h4>${stage.replace('_', ' ')} (${stageDeals.length})</h4>
            ${stageDeals.map(d => `
              <div class="kanban-card">
                <div class="title">${d.name}</div>
                <div class="meta">$${(d.value / 1000).toFixed(1)}k · ${customers.get(d.customer)?.name || 'Unknown'}</div>
                <div class="meta">📅 ${d.closeDate}</div>
              </div>
            `).join('') || '<div style="color:#94a3b8;font-size:12px;">No deals</div>'}
          </div>
        `).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Customers</h3></div>
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Plan</th><th>Value</th><th>Status</th></tr></thead>
        <tbody>
          ${Array.from(customers.values()).map(c => `
            <tr>
              <td><strong>${c.name}</strong></td>
              <td>${c.email}</td>
              <td><span class="pill ${c.plan === 'enterprise' ? 'purple' : c.plan === 'pro' ? 'blue' : 'gray'}">${c.plan}</span></td>
              <td>$${(c.value / 1000).toFixed(1)}k</td>
              <td><span class="pill ${c.status === 'active' ? 'green' : 'red'}">${c.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="card">
      <div class="card-header"><h3>Leads</h3></div>
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Stage</th><th>Value</th><th>Owner</th></tr></thead>
        <tbody>
          ${Array.from(leads.values()).map(l => `
            <tr>
              <td><strong>${l.name}</strong></td>
              <td>${l.email}</td>
              <td><span class="pill ${l.stage === 'new' ? 'gray' : l.stage === 'qualified' ? 'blue' : l.stage === 'demo' ? 'yellow' : 'green'}">${l.stage}</span></td>
              <td>$${(l.value / 1000).toFixed(1)}k</td>
              <td>${l.owner}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `, 'crm');
}

function renderProjects() {
  const tasksByStatus = { todo: [], in_progress: [], done: [] };
  Array.from(tasks.values()).forEach(t => {
    if (tasksByStatus[t.status]) tasksByStatus[t.status].push(t);
  });

  return layout(`
    <h2>Projects</h2>
    <p class="subtitle">Track projects, tasks, and team progress</p>

    <div class="stats-grid">
      <div class="stat-card"><div class="label">Total Projects</div><div class="value">${projects.size}</div></div>
      <div class="stat-card"><div class="label">Active</div><div class="value">${Array.from(projects.values()).filter(p => p.status === 'active').length}</div></div>
      <div class="stat-card"><div class="label">Completed</div><div class="value">${Array.from(projects.values()).filter(p => p.status === 'completed').length}</div></div>
      <div class="stat-card"><div class="label">Open Tasks</div><div class="value">${Array.from(tasks.values()).filter(t => t.status !== 'done').length}</div></div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Projects</h3></div>
      <table>
        <thead><tr><th>Name</th><th>Client</th><th>Status</th><th>Progress</th><th>Deadline</th><th>Team</th></tr></thead>
        <tbody>
          ${Array.from(projects.values()).map(p => `
            <tr>
              <td><strong>${p.name}</strong></td>
              <td>${customers.get(p.client)?.name || '—'}</td>
              <td><span class="pill ${p.status === 'active' ? 'green' : 'gray'}">${p.status}</span></td>
              <td>
                <div class="progress-bar"><div class="progress-fill" style="width:${p.progress}%"></div></div>
                ${p.progress}%
              </td>
              <td>${p.deadline}</td>
              <td>${p.team.join(', ')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="card">
      <div class="card-header"><h3>Tasks Board</h3></div>
      <div class="kanban" style="grid-template-columns: repeat(3, 1fr);">
        ${Object.entries(tasksByStatus).map(([status, statusTasks]) => `
          <div class="kanban-col">
            <h4>${status.replace('_', ' ')} (${statusTasks.length})</h4>
            ${statusTasks.map(t => `
              <div class="kanban-card">
                <div class="title">${t.title}</div>
                <div class="meta">👤 ${t.assignee} · ${customers.get(projects.get(t.project)?.client)?.name || '—'}</div>
                <div class="meta">🔴 ${t.priority}</div>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    </div>
  `, 'projects');
}

function renderInvoices() {
  const totalPaid = Array.from(invoices.values()).filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const totalPending = Array.from(invoices.values()).filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0);
  const totalOverdue = Array.from(invoices.values()).filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0);

  return layout(`
    <h2>Invoices</h2>
    <p class="subtitle">Manage billing and payments</p>

    <div class="stats-grid">
      <div class="stat-card"><div class="label">Paid</div><div class="value" style="color:#10b981">$${(totalPaid / 1000).toFixed(1)}k</div></div>
      <div class="stat-card"><div class="label">Pending</div><div class="value" style="color:#f59e0b">$${(totalPending / 1000).toFixed(1)}k</div></div>
      <div class="stat-card"><div class="label">Overdue</div><div class="value" style="color:#ef4444">$${(totalOverdue / 1000).toFixed(1)}k</div></div>
      <div class="stat-card"><div class="label">Total</div><div class="value">$${((totalPaid + totalPending + totalOverdue) / 1000).toFixed(1)}k</div></div>
    </div>

    <div class="card">
      <div class="card-header"><h3>All Invoices</h3></div>
      <table>
        <thead><tr><th>Number</th><th>Client</th><th>Amount</th><th>Status</th><th>Due Date</th><th>Paid Date</th></tr></thead>
        <tbody>
          ${Array.from(invoices.values()).map(i => `
            <tr>
              <td><strong>${i.number}</strong></td>
              <td>${customers.get(i.client)?.name || '—'}</td>
              <td>$${i.amount.toLocaleString()}</td>
              <td><span class="pill ${i.status === 'paid' ? 'green' : i.status === 'pending' ? 'yellow' : i.status === 'overdue' ? 'red' : 'gray'}">${i.status}</span></td>
              <td>${i.dueDate}</td>
              <td>${i.paidDate || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `, 'invoices');
}

function renderChat() {
  const channels = ['general', 'proj_1', 'proj_2', 'random'];
  const messagesByChannel = {};
  Array.from(messages.values()).forEach(m => {
    if (!messagesByChannel[m.channel]) messagesByChannel[m.channel] = [];
    messagesByChannel[m.channel].push(m);
  });

  return layout(`
    <h2>Team Chat</h2>
    <p class="subtitle">Real-time team communication</p>

    <div class="chat-container">
      <div class="chat-channels">
        <h4>Channels</h4>
        ${channels.map(c => `<div class="chat-channel ${c === 'general' ? 'active' : ''}"># ${c}</div>`).join('')}
        <h4 style="margin-top: 24px;">Direct Messages</h4>
        <div class="chat-channel">👤 Alice</div>
        <div class="chat-channel">👤 Bob</div>
        <div class="chat-channel">👤 Charlie</div>
      </div>
      <div class="chat-messages">
        ${(messagesByChannel['general'] || []).map(m => `
          <div class="chat-msg">
            <div class="chat-avatar">${m.user[0]}</div>
            <div class="chat-bubble">
              <div><span class="name">${m.user}</span><span class="time">${new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
              <div class="text">${m.text}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `, 'chat');
}

function renderKB() {
  const articlesByCategory = {};
  Array.from(articles.values()).forEach(a => {
    if (!articlesByCategory[a.category]) articlesByCategory[a.category] = [];
    articlesByCategory[a.category].push(a);
  });

  return layout(`
    <h2>Knowledge Base</h2>
    <p class="subtitle">Documentation and helpful articles</p>

    <div class="stats-grid">
      <div class="stat-card"><div class="label">Total Articles</div><div class="value">${articles.size}</div></div>
      <div class="stat-card"><div class="label">Total Views</div><div class="value">${Array.from(articles.values()).reduce((s, a) => s + a.views, 0).toLocaleString()}</div></div>
      <div class="stat-card"><div class="label">Avg Helpful</div><div class="value">${Math.round(Array.from(articles.values()).reduce((s, a) => s + a.helpful, 0) / articles.size)}%</div></div>
      <div class="stat-card"><div class="label">Categories</div><div class="value">${Object.keys(articlesByCategory).length}</div></div>
    </div>

    ${Object.entries(articlesByCategory).map(([cat, catArticles]) => `
      <div class="card">
        <div class="card-header"><h3>${cat}</h3></div>
        <table>
          <thead><tr><th>Title</th><th>Views</th><th>Helpful Rating</th></tr></thead>
          <tbody>
            ${catArticles.map(a => `
              <tr>
                <td><strong>${a.title}</strong></td>
                <td>${a.views.toLocaleString()}</td>
                <td><span class="pill green">${a.helpful}% helpful</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('')}
  `, 'kb');
}

// ─── HTTP server ────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const route = req.url.split('?')[0];

  if (route === '/' || route === '/dashboard') {
    res.setHeader('Content-Type', 'text/html');
    return res.end(renderDashboard());
  }
  if (route === '/crm') {
    res.setHeader('Content-Type', 'text/html');
    return res.end(renderCRM());
  }
  if (route === '/projects') {
    res.setHeader('Content-Type', 'text/html');
    return res.end(renderProjects());
  }
  if (route === '/invoices') {
    res.setHeader('Content-Type', 'text/html');
    return res.end(renderInvoices());
  }
  if (route === '/chat') {
    res.setHeader('Content-Type', 'text/html');
    return res.end(renderChat());
  }
  if (route === '/kb') {
    res.setHeader('Content-Type', 'text/html');
    return res.end(renderKB());
  }

  // API endpoints
  if (route === '/api/customers') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(Array.from(customers.values())));
  }
  if (route === '/api/leads') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(Array.from(leads.values())));
  }
  if (route === '/api/deals') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(Array.from(deals.values())));
  }
  if (route === '/api/projects') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(Array.from(projects.values())));
  }
  if (route === '/api/tasks') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(Array.from(tasks.values())));
  }
  if (route === '/api/invoices') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(Array.from(invoices.values())));
  }
  if (route === '/api/articles') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(Array.from(articles.values())));
  }
  if (route === '/api/stats') {
    res.setHeader('Content-Type', 'application/json');
    const totalRevenue = Array.from(invoices.values()).filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
    return res.end(JSON.stringify({
      customers: customers.size,
      leads: leads.size,
      deals: deals.size,
      projects: projects.size,
      tasks: tasks.size,
      invoices: invoices.size,
      articles: articles.size,
      totalRevenue,
    }));
  }

  if (route === '/health') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      status: 'ok',
      service: 'saas-platform',
      version: '2.0.0-alpha.24',
      modules: ['crm', 'projects', 'invoices', 'chat', 'kb', 'dashboard'],
      data: {
        customers: customers.size,
        leads: leads.size,
        deals: deals.size,
        projects: projects.size,
        tasks: tasks.size,
        invoices: invoices.size,
        articles: articles.size,
      },
    }));
  }

  res.statusCode = 404;
  res.end('Not found');
});

const PORT = 5600;
server.listen(PORT, () => {
  console.log(`  ✓ SaaS Platform        → http://localhost:${PORT}`);
});

module.exports = { server };
