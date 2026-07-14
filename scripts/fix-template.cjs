// Fix script: replace generateMainHTML with a working version
const fs = require('fs');
const path = require('path');
// Resolve relative to this script's location — don't hardcode the path.
const filePath = path.join(__dirname, 'template-library.cjs');
const code = fs.readFileSync(filePath, 'utf8');

const newFn = `function generateMainHTML() {
  const categories = [...new Set(TEMPLATES.map(t => t.category))];
  const filtersHtml = categories.map(cat =>
    '<div class="filter" onclick="filterCategory(\\'' + cat + '\\', this)">' + cat + ' (' + TEMPLATES.filter(t => t.category === cat).length + ')</div>'
  ).join('');
  const cardsHtml = TEMPLATES.map(t =>
    '<div class="card" onclick="openPreview(\\'' + t.id + '\\')" data-category="' + t.category + '">' +
      '<div class="card-preview">' + t.icon + '</div>' +
      '<div class="card-body">' +
        '<h3>' + t.name + '</h3>' +
        '<p>' + t.description + '</p>' +
        '<span class="card-category">' + t.category + '</span>' +
      '</div>' +
    '</div>'
  ).join('');
  const templatesJson = JSON.stringify(TEMPLATES.map(t => ({ id: t.id, name: t.name, category: t.category, description: t.description })));

  return [
    '<!DOCTYPE html>',
    '<html dir="ltr" lang="en">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>Elmoorx Template Library — ' + TEMPLATES.length + ' Templates</title>',
    '<style>',
    '  * { box-sizing: border-box; margin: 0; padding: 0; }',
    '  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; }',
    '  header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 60px 20px; text-align: center; }',
    '  header h1 { font-size: 36px; margin-bottom: 8px; }',
    '  header p { opacity: 0.9; }',
    '  .stats { display: flex; gap: 32px; justify-content: center; margin-top: 24px; }',
    '  .stat { text-align: center; }',
    '  .stat .num { font-size: 32px; font-weight: 700; }',
    '  .stat .label { font-size: 12px; opacity: 0.8; text-transform: uppercase; }',
    '  .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }',
    '  .filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 32px; }',
    '  .filter { background: white; border: 1px solid #e2e8f0; padding: 6px 16px; border-radius: 16px; cursor: pointer; font-size: 14px; }',
    '  .filter.active { background: #4f46e5; color: white; border-color: #4f46e5; }',
    '  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }',
    '  .card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }',
    '  .card:hover { transform: translateY(-4px); box-shadow: 0 10px 30px rgba(0,0,0,0.15); }',
    '  .card-preview { height: 160px; background: linear-gradient(135deg, #eef2ff, #ddd6fe); display: flex; align-items: center; justify-content: center; font-size: 48px; }',
    '  .card-body { padding: 16px; }',
    '  .card-body h3 { font-size: 16px; margin-bottom: 4px; }',
    '  .card-body p { font-size: 13px; color: #64748b; }',
    '  .card-category { display: inline-block; background: #eef2ff; color: #4338ca; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-top: 8px; }',
    '  .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: none; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }',
    '  .modal-bg.show { display: flex; }',
    '  .modal { background: white; border-radius: 12px; max-width: 1000px; width: 100%; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; }',
    '  .modal-header { padding: 16px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }',
    '  .modal-close { cursor: pointer; font-size: 24px; color: #64748b; background: none; border: none; }',
    '  .modal-body { overflow-y: auto; padding: 0; }',
    '  .modal-actions { padding: 16px 24px; border-top: 1px solid #e2e8f0; display: flex; gap: 8px; justify-content: flex-end; }',
    '  .btn { background: #4f46e5; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; }',
    '  .btn:hover { background: #4338ca; }',
    '  .preview-frame { background: white; min-height: 500px; }',
    '</style>',
    '</head>',
    '<body>',
    '<header>',
    '  <h1>Elmoorx Template Library</h1>',
    '  <p>' + TEMPLATES.length + ' ready-to-use page templates for every need</p>',
    '  <div class="stats">',
    '    <div class="stat"><div class="num">' + TEMPLATES.length + '</div><div class="label">Templates</div></div>',
    '    <div class="stat"><div class="num">' + categories.length + '</div><div class="label">Categories</div></div>',
    '    <div class="stat"><div class="num">648</div><div class="label">Components Used</div></div>',
    '    <div class="stat"><div class="num">100%</div><div class="label">Customizable</div></div>',
    '  </div>',
    '</header>',
    '<div class="container">',
    '  <div class="filters" id="filters">',
    '    <div class="filter active" onclick="filterCategory(\\'all\\', this)">All (' + TEMPLATES.length + ')</div>',
    '    ' + filtersHtml,
    '  </div>',
    '  <div class="grid" id="grid">',
    '    ' + cardsHtml,
    '  </div>',
    '</div>',
    '<div class="modal-bg" id="modal" onclick="if(event.target===this)closeModal()">',
    '  <div class="modal">',
    '    <div class="modal-header">',
    '      <h3 id="modal-title">Template Preview</h3>',
    '      <button class="modal-close" onclick="closeModal()">&times;</button>',
    '    </div>',
    '    <div class="modal-body"><div class="preview-frame" id="preview-frame"></div></div>',
    '    <div class="modal-actions">',
    '      <button class="btn" onclick="copyCode()">Copy Code</button>',
    '      <button class="btn" onclick="openInBuilder()">Open in Builder</button>',
    '      <button class="btn" onclick="downloadTemplate()">Download</button>',
    '    </div>',
    '  </div>',
    '</div>',
    '<script>',
    'const TEMPLATES = ' + templatesJson + ';',
    'function filterCategory(cat, el) {',
    '  document.querySelectorAll(".filter").forEach(f => f.classList.remove("active"));',
    '  el.classList.add("active");',
    '  document.querySelectorAll(".card").forEach(c => {',
    '    c.style.display = (cat === "all" || c.dataset.category === cat) ? "" : "none";',
    '  });',
    '}',
    'let currentTemplate = null;',
    'function openPreview(id) {',
    '  currentTemplate = id;',
    '  const tmpl = TEMPLATES.find(t => t.id === id);',
    '  document.getElementById("modal-title").textContent = tmpl.name + " (" + tmpl.category + ")";',
    '  fetch("/api/preview/" + id).then(r => r.text()).then(html => {',
    '    document.getElementById("preview-frame").innerHTML = html;',
    '  });',
    '  document.getElementById("modal").classList.add("show");',
    '}',
    'function closeModal() { document.getElementById("modal").classList.remove("show"); }',
    'function copyCode() {',
    '  navigator.clipboard.writeText(document.getElementById("preview-frame").innerHTML);',
    '  alert("Template code copied to clipboard!");',
    '}',
    'function openInBuilder() { window.open("http://127.0.0.1:5100", "_blank"); }',
    'function downloadTemplate() {',
    '  const html = document.getElementById("preview-frame").innerHTML;',
    '  const blob = new Blob([html], { type: "text/html" });',
    '  const url = URL.createObjectURL(blob);',
    '  const a = document.createElement("a");',
    '  a.href = url; a.download = currentTemplate + ".html"; a.click();',
    '  URL.revokeObjectURL(url);',
    '}',
    '</' + 'script>',
    '</body>',
    '</html>',
  ].join('\\n');
}`;

// Find the function start and end
const startIdx = code.indexOf('function generateMainHTML()');
const endMarker = '// ─── HTTP server';
const endIdx = code.indexOf(endMarker);

const newCode = code.slice(0, startIdx) + newFn + '\n\n' + code.slice(endIdx);
fs.writeFileSync(filePath, newCode);
console.log('Patched. New length:', newCode.length);
console.log('Syntax check:');
try {
  new Function(newCode);
  console.log('  ✓ Valid syntax');
} catch (e) {
  console.log('  ✗ Syntax error:', e.message);
}
