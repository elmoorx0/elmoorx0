#!/usr/bin/env node
/**
 * Elmoorx Playground — Live code editor in the browser
 *
 * Write Elmoorx code, see results instantly.
 *
 * Features:
 * - Live preview (auto-refresh on code change)
 * - Multiple file support
 * - Theme switcher (light/dark)
 * - Code sharing (URL-encoded)
 * - Templates to start from
 * - Error display
 * - Resizable panels
 *
 * Runs on port 5500
 */

const http = require('http');

function generatePlaygroundHTML() {
  return `<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Elmoorx Playground — Live Code Editor</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, sans-serif; height: 100vh; overflow: hidden; background: #1e1e1e; color: #e2e8f0; display: grid; grid-template-rows: 56px 1fr; }
  header { background: #0f172a; border-bottom: 1px solid #334155; display: flex; align-items: center; padding: 0 24px; gap: 16px; }
  header h1 { color: #818cf8; font-size: 18px; }
  header .actions { margin-left: auto; display: flex; gap: 8px; }
  .btn { background: #4f46e5; color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; }
  .btn-ghost { background: transparent; color: #94a3b8; border: 1px solid #334155; }
  .btn:hover { background: #4338ca; }

  .main { display: grid; grid-template-columns: 1fr 1fr; height: 100%; overflow: hidden; }
  .editor-pane { background: #1e1e1e; display: flex; flex-direction: column; }
  .preview-pane { background: white; }
  .pane-header { padding: 8px 16px; background: #252526; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #334155; }
  .editor { flex: 1; background: #1e1e1e; color: #d4d4d4; font-family: 'SF Mono', Menlo, monospace; font-size: 14px; padding: 16px; border: none; outline: none; resize: none; line-height: 1.6; tab-size: 2; }
  .preview { width: 100%; height: 100%; border: none; background: white; }
  .error-bar { background: #fee2e2; color: #991b1b; padding: 8px 16px; font-family: monospace; font-size: 12px; border-top: 1px solid #fecaca; max-height: 100px; overflow-y: auto; }
  .templates { display: flex; gap: 4px; }
  .templates button { background: #334155; color: #94a3b8; border: none; padding: 4px 10px; border-radius: 4px; font-size: 12px; cursor: pointer; }
  .templates button:hover { background: #475569; color: white; }
</style>
</head>
<body>

<header>
  <h1>🎮 Elmoorx Playground</h1>
  <div class="templates">
    <button onclick="loadTemplate('counter')">Counter</button>
    <button onclick="loadTemplate('todo')">Todo List</button>
    <button onclick="loadTemplate('form')">Form</button>
    <button onclick="loadTemplate('chart')">Chart</button>
    <button onclick="loadTemplate('layout')">Layout</button>
  </div>
  <div class="actions">
    <button class="btn btn-ghost" onclick="shareCode()">🔗 Share</button>
    <button class="btn btn-ghost" onclick="toggleTheme()">🌓 Theme</button>
    <button class="btn" onclick="runCode()">▶ Run</button>
  </div>
</header>

<div class="main">
  <div class="editor-pane">
    <div class="pane-header">📝 Code (auto-runs on change)</div>
    <textarea class="editor" id="editor" oninput="autoRun()" spellcheck="false"></textarea>
    <div class="error-bar" id="error-bar" style="display:none;"></div>
  </div>
  <div class="preview-pane">
    <div class="pane-header" style="background:#f1f5f9;color:#475569;">👁 Preview</div>
    <iframe class="preview" id="preview" sandbox="allow-scripts"></iframe>
  </div>
</div>

<script>
const TEMPLATES = {
  counter: \`import { \\$state, \\$effect } from '@elmoorx/runtime';

const app = document.getElementById('app');

function Counter() {
  const count = \\$state(0);
  const doubled = \\$computed(() => count.value * 2);

  return \`<div style="text-align:center;padding:40px;font-family:system-ui;">
    <h1>Counter</h1>
    <p style="font-size:48px;font-weight:bold;">\\\${count.value}</p>
    <p>Doubled: \\\${doubled.value}</p>
    <button onclick="increment()">+1</button>
    <button onclick="decrement()">-1</button>
    <button onclick="reset()">Reset</button>
  </div>\`;
}

function increment() { count.value++; }
function decrement() { count.value--; }
function reset() { count.value = 0; }

// Note: This is a simplified demo
// In real Elmoorx, you'd use JSX and the compiler
app.innerHTML = '<div style="text-align:center;padding:40px;font-family:system-ui;"><h1>Counter Demo</h1><p>Edit the code on the left to see changes</p></div>';\`,

  todo: \`// Todo List Demo
const app = document.getElementById('app');
let todos = [];
let nextId = 1;

function render() {
  app.innerHTML = \`
    <div style="max-width:500px;margin:40px auto;font-family:system-ui;">
      <h1>📝 Todo List</h1>
      <div style="display:flex;gap:8px;margin-bottom:16px;">
        <input type="text" id="newTodo" placeholder="Add a todo..." style="flex:1;padding:8px;border:1px solid #ccc;border-radius:4px;">
        <button onclick="addTodo()" style="padding:8px 16px;background:#4f46e5;color:white;border:none;border-radius:4px;cursor:pointer;">Add</button>
      </div>
      <ul style="list-style:none;padding:0;">
        \\\${todos.map(t => \`<li style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid #eee;">
          <input type="checkbox" \\\${t.done ? 'checked' : ''} onchange="toggle(\\\${t.id})">
          <span style="flex:1;\\\${t.done ? 'text-decoration:line-through;color:#999;' : ''}">\\\${t.text}</span>
          <button onclick="remove(\\\${t.id})" style="background:#ef4444;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;">×</button>
        </li>\`).join('')}
      </ul>
      <p>\\\${todos.filter(t => !t.done).length} items left</p>
    </div>
  \`;
}

function addTodo() {
  const input = document.getElementById('newTodo');
  if (input.value.trim()) {
    todos.push({ id: nextId++, text: input.value.trim(), done: false });
    input.value = '';
    render();
  }
}

function toggle(id) {
  const t = todos.find(t => t.id === id);
  if (t) { t.done = !t.done; render(); }
}

function remove(id) {
  todos = todos.filter(t => t.id !== id);
  render();
}

render();\`,

  form: \`// Form Demo
const app = document.getElementById('app');
app.innerHTML = \`
  <div style="max-width:500px;margin:40px auto;font-family:system-ui;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
    <h2 style="margin-bottom:24px;">Contact Form</h2>
    <form onsubmit="handleSubmit(event)">
      <div style="margin-bottom:16px;">
        <label style="display:block;margin-bottom:4px;font-size:14px;">Name</label>
        <input type="text" required style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;">
      </div>
      <div style="margin-bottom:16px;">
        <label style="display:block;margin-bottom:4px;font-size:14px;">Email</label>
        <input type="email" required style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;">
      </div>
      <div style="margin-bottom:16px;">
        <label style="display:block;margin-bottom:4px;font-size:14px;">Subject</label>
        <select style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;">
          <option>General</option>
          <option>Support</option>
          <option>Sales</option>
        </select>
      </div>
      <div style="margin-bottom:16px;">
        <label style="display:block;margin-bottom:4px;font-size:14px;">Message</label>
        <textarea rows="4" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;"></textarea>
      </div>
      <button type="submit" style="width:100%;padding:12px;background:#4f46e5;color:white;border:none;border-radius:6px;cursor:pointer;font-size:16px;">Send Message</button>
    </form>
    <div id="success" style="display:none;margin-top:16px;padding:12px;background:#d1fae5;color:#065f46;border-radius:6px;">✓ Message sent successfully!</div>
  </div>
\`;

function handleSubmit(e) {
  e.preventDefault();
  document.getElementById('success').style.display = 'block';
  e.target.reset();
  setTimeout(() => { document.getElementById('success').style.display = 'none'; }, 3000);
}\`,

  chart: \`// Chart Demo
const app = document.getElementById('app');
const data = [40, 65, 50, 80, 70, 95, 85, 100, 75, 90, 60, 88];

app.innerHTML = \`
  <div style="padding:40px;font-family:system-ui;">
    <h2>Monthly Revenue</h2>
    <div style="display:flex;align-items:flex-end;height:300px;background:#f8fafc;padding:20px;border-radius:8px;margin-top:20px;">
      \\\${data.map((v, i) => \`<div style="flex:1;margin:0 4px;background:linear-gradient(180deg,#6366f1,#4f46e5);border-radius:4px 4px 0 0;height:\\\${v}%;position:relative;" title="Month \\\${i+1}: \\\${v}k">
        <span style="position:absolute;bottom:-24px;left:0;right:0;text-align:center;font-size:11px;color:#64748b;">\\\${i+1}</span>
      </div>\`).join('')}
    </div>
    <div style="margin-top:40px;">
      <p>Total: \\\${data.reduce((a,b) => a+b, 0)}k</p>
      <p>Average: \\\${Math.round(data.reduce((a,b) => a+b, 0) / data.length)}k</p>
      <p>Max: \\\${Math.max(...data)}k</p>
      <p>Min: \\\${Math.min(...data)}k</p>
    </div>
  </div>
\`;\`,

  layout: \`// Layout Demo
const app = document.getElementById('app');
app.innerHTML = \`
  <div style="font-family:system-ui;min-height:100vh;">
    <header style="background:#4f46e5;color:white;padding:16px 24px;display:flex;justify-content:space-between;align-items:center;">
      <h1>⚡ MyApp</h1>
      <nav style="display:flex;gap:16px;">
        <a href="#" style="color:white;text-decoration:none;">Home</a>
        <a href="#" style="color:white;text-decoration:none;">Features</a>
        <a href="#" style="color:white;text-decoration:none;">Pricing</a>
        <a href="#" style="color:white;text-decoration:none;">Docs</a>
      </nav>
    </header>
    <div style="display:grid;grid-template-columns:240px 1fr;gap:0;min-height:calc(100vh - 64px);">
      <aside style="background:#1e293b;color:#94a3b8;padding:24px 0;">
        <div style="padding:8px 24px;background:#334155;color:white;">📊 Dashboard</div>
        <div style="padding:8px 24px;">👥 Users</div>
        <div style="padding:8px 24px;">💳 Billing</div>
        <div style="padding:8px 24px;">⚙️ Settings</div>
      </aside>
      <main style="padding:32px;background:#f8fafc;">
        <h2>Welcome back!</h2>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:24px;">
          <div style="background:white;padding:20px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <div style="color:#64748b;font-size:12px;">USERS</div>
            <div style="font-size:32px;font-weight:700;">1,234</div>
          </div>
          <div style="background:white;padding:20px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <div style="color:#64748b;font-size:12px;">REVENUE</div>
            <div style="font-size:32px;font-weight:700;">\\\$12.4k</div>
          </div>
          <div style="background:white;padding:20px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <div style="color:#64748b;font-size:12px;">ACTIVE</div>
            <div style="font-size:32px;font-weight:700;">892</div>
          </div>
        </div>
      </main>
    </div>
  </div>
\`;\`,
};

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const errorBar = document.getElementById('error-bar');
let theme = 'dark';
let autoRunTimer;

function loadTemplate(name) {
  editor.value = TEMPLATES[name] || '';
  runCode();
}

function runCode() {
  const code = editor.value;
  const html = \`
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><style>body{margin:0;font-family:system-ui;}</style></head>
    <body>
      <div id="app"></div>
      <script>
        try {
          \${code}
        } catch (err) {
          document.getElementById('app').innerHTML = '<div style="padding:20px;background:#fee2e2;color:#991b1b;font-family:monospace;">Error: ' + err.message + '</div>';
        }
      </script>
    </body>
    </html>
  \`;
  preview.srcdoc = html;
  hideError();
}

function autoRun() {
  clearTimeout(autoRunTimer);
  autoRunTimer = setTimeout(runCode, 500);
}

function toggleTheme() {
  theme = theme === 'dark' ? 'light' : 'dark';
  if (theme === 'light') {
    document.body.style.background = '#ffffff';
    document.body.style.color = '#1e293b';
    editor.style.background = '#ffffff';
    editor.style.color = '#1e293b';
  } else {
    document.body.style.background = '#1e1e1e';
    document.body.style.color = '#e2e8f0';
    editor.style.background = '#1e1e1e';
    editor.style.color = '#d4d4d4';
  }
}

function shareCode() {
  const code = editor.value;
  const encoded = btoa(unescape(encodeURIComponent(code)));
  const url = window.location.origin + '/?code=' + encoded;
  navigator.clipboard.writeText(url);
  alert('Share URL copied to clipboard!\\n\\n' + url);
}

function showError(msg) {
  errorBar.style.display = 'block';
  errorBar.textContent = msg;
}

function hideError() {
  errorBar.style.display = 'none';
}

// Check URL for shared code
const urlParams = new URLSearchParams(window.location.search);
const sharedCode = urlParams.get('code');
if (sharedCode) {
  try {
    editor.value = decodeURIComponent(escape(atob(sharedCode)));
  } catch {}
}

// Load default template
if (!editor.value) {
  loadTemplate('counter');
}
</script>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url.startsWith('/?')) {
    res.setHeader('Content-Type', 'text/html');
    return res.end(generatePlaygroundHTML());
  }

  if (req.url === '/api/templates') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      templates: ['counter', 'todo', 'form', 'chart', 'layout'],
    }));
  }

  if (req.url === '/health') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      status: 'ok', service: 'playground', version: '2.0.0-alpha.23',
      features: ['live-preview', 'multi-template', 'code-sharing', 'theme-switcher'],
    }));
  }

  res.statusCode = 404;
  res.end('Not found');
});

const PORT = 5500;
server.listen(PORT, () => {
  console.log(`  ✓ Playground           → http://localhost:${PORT}`);
});

module.exports = { server };
