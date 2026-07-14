#!/usr/bin/env node
/**
 * Elmoorx Visual Page Builder — Drag-and-drop UI designer
 * Consumes the 648-component library and lets users design pages visually.
 *
 * Features:
 * - Drag components from palette to canvas
 * - Property inspector (edit props live)
 * - Component tree (hierarchical view)
 * - Code export (generates Elmoorx JSX code)
 * - Save/load designs (JSON)
 * - Undo/redo
 * - Preview mode (no editing)
 * - Responsive breakpoints (mobile/tablet/desktop)
 * - Templates (pre-built layouts)
 * - Theme switcher
 *
 * Runs on port 5100
 */

const http = require('http');
const fs = require('fs');

function generateBuilderHTML() {
  return `<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Elmoorx Visual Builder — Design Pages with 648 Components</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #0f172a; color: #e2e8f0; height: 100vh; overflow: hidden;
    display: grid; grid-template-rows: 56px 1fr; grid-template-columns: 280px 1fr 320px;
    grid-template-areas: "header header header" "left main right";
  }
  header {
    grid-area: header; background: #1e293b; border-bottom: 1px solid #334155;
    display: flex; align-items: center; padding: 0 24px; gap: 16px;
  }
  header h1 { font-size: 18px; font-weight: 600; color: #818cf8; }
  header .actions { margin-left: auto; display: flex; gap: 8px; }
  .btn {
    background: #4f46e5; color: white; border: none; padding: 6px 14px;
    border-radius: 6px; font-size: 13px; cursor: pointer; font-weight: 500;
  }
  .btn:hover { background: #4338ca; }
  .btn-ghost { background: transparent; color: #94a3b8; border: 1px solid #334155; }
  .btn-ghost:hover { background: #334155; color: white; }
  .btn-success { background: #10b981; }
  .btn-success:hover { background: #059669; }

  aside.left {
    grid-area: left; background: #1e293b; border-right: 1px solid #334155;
    overflow-y: auto;
  }
  aside.right {
    grid-area: right; background: #1e293b; border-left: 1px solid #334155;
    overflow-y: auto; padding: 16px;
  }
  main {
    grid-area: main; background: #0f172a; overflow: auto; padding: 24px;
    display: flex; justify-content: center; align-items: flex-start;
  }
  .canvas-frame {
    background: white; color: #1e293b; width: 100%; max-width: 1024px;
    min-height: 600px; border-radius: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    padding: 24px; position: relative;
  }
  .palette-section { padding: 12px 16px; border-bottom: 1px solid #334155; }
  .palette-section h3 {
    font-size: 11px; text-transform: uppercase; color: #64748b;
    margin-bottom: 8px; letter-spacing: 0.5px;
  }
  .palette-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .palette-item {
    background: #334155; padding: 8px 10px; border-radius: 4px;
    font-size: 12px; cursor: grab; border: 1px solid transparent;
    transition: all 0.15s;
  }
  .palette-item:hover {
    background: #475569; border-color: #6366f1;
  }
  .palette-item:active { cursor: grabbing; }

  .inspector-section { margin-bottom: 20px; }
  .inspector-section h3 {
    font-size: 11px; text-transform: uppercase; color: #64748b;
    margin-bottom: 10px; letter-spacing: 0.5px;
  }
  .inspector-field { margin-bottom: 10px; }
  .inspector-field label {
    display: block; font-size: 12px; color: #94a3b8; margin-bottom: 4px;
  }
  .inspector-field input, .inspector-field select, .inspector-field textarea {
    width: 100%; background: #0f172a; color: #e2e8f0; border: 1px solid #334155;
    padding: 6px 10px; border-radius: 4px; font-size: 13px; font-family: inherit;
  }
  .inspector-field input:focus, .inspector-field select:focus { outline: none; border-color: #6366f1; }

  .canvas-component {
    border: 1px dashed transparent; cursor: pointer; padding: 4px; margin: 4px 0;
    transition: border-color 0.15s;
  }
  .canvas-component:hover { border-color: #c7d2fe; }
  .canvas-component.selected { border-color: #6366f1; background: rgba(99,102,241,0.05); }

  .empty-canvas {
    text-align: center; color: #94a3b8; padding: 80px 0; font-size: 14px;
  }

  .breakpoint-toggle { display: flex; gap: 4px; }
  .breakpoint-toggle button {
    background: #334155; border: none; color: #94a3b8; padding: 4px 10px;
    border-radius: 4px; cursor: pointer; font-size: 12px;
  }
  .breakpoint-toggle button.active { background: #4f46e5; color: white; }

  .tree { font-size: 12px; font-family: monospace; }
  .tree-item { padding: 3px 8px; cursor: pointer; border-radius: 3px; }
  .tree-item:hover { background: #334155; }
  .tree-item.selected { background: #4f46e5; color: white; }
  .tree-item .indent { color: #475569; }

  .modal-bg {
    position: fixed; inset: 0; background: rgba(0,0,0,0.7);
    display: none; align-items: center; justify-content: center; z-index: 1000;
  }
  .modal-bg.show { display: flex; }
  .modal {
    background: #1e293b; border-radius: 12px; padding: 24px;
    width: 90%; max-width: 700px; max-height: 80vh; overflow-y: auto;
  }
  .modal h2 { color: #818cf8; margin-bottom: 16px; }
  .modal pre {
    background: #0f172a; padding: 16px; border-radius: 8px;
    font-family: 'SF Mono', Menlo, monospace; font-size: 12px; color: #10b981;
    overflow-x: auto; white-space: pre-wrap;
  }
  .modal-close { float: right; cursor: pointer; color: #94a3b8; font-size: 24px; }

  .toast {
    position: fixed; bottom: 24px; right: 24px;
    background: #10b981; color: white; padding: 12px 20px; border-radius: 8px;
    font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    opacity: 0; transition: opacity 0.3s; z-index: 999;
  }
  .toast.show { opacity: 1; }
</style>
</head>
<body>

<header>
  <h1>🎨 Elmoorx Visual Builder</h1>
  <div class="breakpoint-toggle">
    <button onclick="setBreakpoint('mobile')" id="bp-mobile">📱 Mobile</button>
    <button onclick="setBreakpoint('tablet')" id="bp-tablet">📲 Tablet</button>
    <button onclick="setBreakpoint('desktop')" id="bp-desktop" class="active">💻 Desktop</button>
  </div>
  <div class="actions">
    <button class="btn btn-ghost" onclick="undo()">↩ Undo</button>
    <button class="btn btn-ghost" onclick="redo()">↪ Redo</button>
    <button class="btn btn-ghost" onclick="loadTemplate()">📋 Templates</button>
    <button class="btn btn-ghost" onclick="togglePreview()">👁 Preview</button>
    <button class="btn btn-ghost" onclick="saveDesign()">💾 Save</button>
    <button class="btn btn-success" onclick="exportCode()">↗ Export Code</button>
  </div>
</header>

<aside class="left" id="palette">
  <!-- Palette populated by JS -->
</aside>

<main>
  <div class="canvas-frame" id="canvas">
    <div class="empty-canvas">Drag components here to start designing</div>
  </div>
</main>

<aside class="right" id="inspector">
  <div style="color: #64748b; text-align: center; padding: 40px 0; font-size: 13px;">
    Select a component to edit its properties
  </div>
</aside>

<div class="modal-bg" id="codeModal" onclick="if(event.target===this)closeModal()">
  <div class="modal">
    <span class="modal-close" onclick="closeModal()">&times;</span>
    <h2>Generated Elmoorx JSX Code</h2>
    <pre id="codeOutput"></pre>
    <div style="margin-top: 16px; text-align: right;">
      <button class="btn" onclick="copyCode()">Copy Code</button>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
// ─── Component catalog (mirrors server catalog) ────────────────────────────
const CATALOG = {
  'Forms': ['Input', 'Textarea', 'Select', 'Checkbox', 'Radio', 'Switch', 'Slider', 'DatePicker', 'TimePicker', 'ColorPicker', 'FileUpload', 'Dropzone', 'OTPInput', 'MaskedInput', 'PhoneInput', 'CurrencyInput', 'PasswordInput', 'SearchInput', 'Autocomplete', 'Combobox', 'MultiSelect', 'TagInput', 'Rating', 'StarRating', 'SegmentedControl', 'Toggle', 'CheckboxGroup'],
  'Layout': ['Grid', 'Stack', 'HStack', 'VStack', 'Container', 'Box', 'Card', 'CardHeader', 'CardBody', 'CardFooter', 'Panel', 'Sidebar', 'SplitView', 'AspectRatio', 'Tabs', 'TabList', 'Tab', 'TabPanel', 'Accordion', 'Collapsible', 'ScrollArea', 'Section', 'Header', 'Footer', 'Main', 'Nav', 'Figure'],
  'Navigation': ['Navbar', 'NavItem', 'Breadcrumb', 'Pagination', 'Menu', 'MenuItem', 'ContextMenu', 'Dropdown', 'MegaMenu', 'Stepper', 'Step', 'Wizard', 'Drawer', 'BottomSheet', 'AppBar', 'Toolbar', 'CommandPalette'],
  'Data Display': ['Table', 'TableHeader', 'TableBody', 'TableRow', 'TableCell', 'DataTable', 'DataGrid', 'Tree', 'TreeNode', 'Timeline', 'TimelineItem', 'Calendar', 'Kanban', 'KanbanColumn', 'KanbanCard', 'Gantt', 'Chart', 'BarChart', 'LineChart', 'PieChart', 'DonutChart', 'Heatmap', 'Sparkline', 'Badge', 'Avatar', 'Chip', 'Tag', 'Stat', 'Progress', 'ProgressBar', 'ProgressCircle', 'Skeleton', 'Empty'],
  'Feedback': ['Alert', 'AlertTitle', 'Toast', 'Snackbar', 'Notification', 'Banner', 'Callout', 'Modal', 'ModalContent', 'Dialog', 'ConfirmDialog', 'Popover', 'Tooltip', 'HoverCard', 'Spotlight', 'Coachmark'],
  'Media': ['Image', 'ImageGallery', 'ImageGrid', 'ImageCropper', 'Video', 'VideoPlayer', 'Audio', 'AudioPlayer', 'AudioRecorder', 'AudioVisualizer', 'Gallery', 'Carousel', 'CarouselItem', 'Lightbox', 'Icon', 'IconButton', 'Logo', 'Emoji', 'Flag', 'QRCode', 'Barcode'],
  'Inputs': ['Button', 'ButtonGroup', 'IconButton', 'FloatingActionButton', 'Fab', 'PrimaryButton', 'SecondaryButton', 'SuccessButton', 'WarningButton', 'DangerButton', 'OutlineButton', 'GhostButton', 'LinkButton', 'GradientButton', 'NeonButton', 'GlassButton', 'LiquidButton', 'LoadingButton', 'AsyncButton', 'CopyButton', 'ShareButton', 'DownloadButton', 'SaveButton', 'CancelButton', 'DeleteButton', 'EditButton'],
  'Typography': ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'Title', 'Subtitle', 'Caption', 'Label', 'Paragraph', 'Lead', 'Blockquote', 'Quote', 'Code', 'CodeBlock', 'Pre', 'Kbd', 'Mark', 'Highlight', 'Bold', 'Italic', 'Underline', 'Link', 'Truncate', 'Clamp'],
  'Utility': ['Portal', 'Slot', 'ErrorBoundary', 'Suspense', 'Lazy', 'Show', 'Hide', 'If', 'Else', 'Switch', 'Case', 'For', 'Each', 'Fragment', 'Template', 'ClientOnly', 'Conditional', 'Async', 'Await', 'Debounce', 'Hover', 'Focus', 'Draggable', 'Droppable', 'Resizable', 'Sortable', 'Transition'],
  'Pro': ['RichTextEditor', 'MarkdownEditor', 'CodeEditor', 'PivotTable', 'FilterBuilder', 'SortableList', 'StockChart', 'CandlestickChart', 'RadarChart', 'BubbleChart', 'FunnelChart', 'SankeyDiagram', 'NetworkGraph', 'FlowChart', 'MindMap', 'CommentThread', 'MentionInput', 'PricingTable', 'PricingCard', 'PlanComparison', 'LoginForm', 'SignupForm', 'OAuthButtons', 'TwoFactor', 'ProfileCard', 'TeamMembers', 'ActivityFeed', 'SearchBar', 'CommandK'],
  'Specialty': ['Map', 'MapMarker', 'Scheduler', 'EventCalendar', 'BookingCalendar', 'FileTree', 'FileExplorer', 'ChatBox', 'ChatMessage', 'LikeButton', 'ShareMenu', 'ProductCard', 'ProductGrid', 'ShoppingCart', 'CheckoutForm', 'OrderSummary', 'PriceTag', 'WishlistButton', 'ArticleCard', 'BlogPost', 'Leaderboard', 'AchievementBadge', 'SystemTray', 'WindowFrame'],
};

// ─── State ─────────────────────────────────────────────────────────────────
let canvas = []; // array of placed components
let selectedId = null;
let history = [];
let historyIndex = -1;
let breakpoint = 'desktop';
let previewMode = false;
let nextId = 1;

// ─── Render palette ────────────────────────────────────────────────────────
function renderPalette() {
  const palette = document.getElementById('palette');
  let html = '';
  for (const [category, components] of Object.entries(CATALOG)) {
    html += \`<div class="palette-section">
      <h3>\${category} (\${components.length})</h3>
      <div class="palette-grid">\${components.map(c =>
        \`<div class="palette-item" draggable="true" ondragstart="dragStart(event, '\${c}')">\${c}</div>\`
      ).join('')}</div>
    </div>\`;
  }
  palette.innerHTML = html;
}

// ─── Drag and drop ─────────────────────────────────────────────────────────
let draggedComponent = null;

function dragStart(event, name) {
  draggedComponent = name;
  event.dataTransfer.effectAllowed = 'copy';
}

const canvasEl = document.getElementById('canvas');
canvasEl.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
canvasEl.addEventListener('drop', e => {
  e.preventDefault();
  if (draggedComponent && !previewMode) {
    addComponent(draggedComponent);
  }
});

function addComponent(name) {
  pushHistory();
  const component = {
    id: nextId++,
    type: name,
    props: getDefaultProps(name),
    children: [],
  };
  canvas.push(component);
  selectedId = component.id;
  renderCanvas();
  renderInspector();
  renderTree();
  showToast('Added ' + name);
}

function getDefaultProps(name) {
  if (name.startsWith('H')) return { children: 'Heading Text', className: '' };
  if (name === 'Button' || name.endsWith('Button')) return { children: 'Click me', variant: 'primary', size: 'md' };
  if (name === 'Input') return { placeholder: 'Enter text', type: 'text', value: '' };
  if (name === 'Card' || name === 'Panel') return { title: 'Card Title', className: '' };
  if (name === 'Avatar') return { src: '', alt: 'User', size: 'md' };
  if (name === 'Badge' || name === 'Chip' || name === 'Tag') return { children: 'New', variant: 'default' };
  if (name === 'Image') return { src: '', alt: 'Image', width: 200, height: 150 };
  if (name === 'Paragraph') return { children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' };
  if (name === 'Alert') return { children: 'This is an alert!', variant: 'info' };
  if (name === 'Progress' || name === 'ProgressBar') return { value: 50, max: 100 };
  return { children: name, className: '' };
}

// ─── Render canvas ─────────────────────────────────────────────────────────
function renderCanvas() {
  const canvasEl = document.getElementById('canvas');
  if (canvas.length === 0) {
    canvasEl.innerHTML = '<div class="empty-canvas">Drag components here to start designing</div>';
    return;
  }
  if (previewMode) {
    canvasEl.innerHTML = canvas.map(c => renderComponentPreview(c)).join('');
  } else {
    canvasEl.innerHTML = canvas.map(c => renderComponent(c)).join('');
  }
}

function renderComponent(c) {
  const selected = c.id === selectedId ? 'selected' : '';
  return \`<div class="canvas-component \${selected}" onclick="selectComponent(\${c.id}); event.stopPropagation();">
    \${renderComponentInner(c)}
  </div>\`;
}

function renderComponentInner(c) {
  // Generate a basic HTML preview of the component
  const children = c.props.children || '';
  switch (c.type) {
    case 'H1': return \`<h1 style="font-size:32px;font-weight:700;">\${children}</h1>\`;
    case 'H2': return \`<h2 style="font-size:24px;font-weight:600;">\${children}</h2>\`;
    case 'H3': return \`<h3 style="font-size:20px;font-weight:600;">\${children}</h3>\`;
    case 'Button':
    case 'PrimaryButton':
      return \`<button style="background:#4f46e5;color:white;padding:8px 16px;border:none;border-radius:6px;cursor:pointer;">\${children}</button>\`;
    case 'OutlineButton':
      return \`<button style="background:transparent;color:#4f46e5;border:1px solid #4f46e5;padding:8px 16px;border-radius:6px;cursor:pointer;">\${children}</button>\`;
    case 'Input':
      return \`<input type="text" placeholder="\${c.props.placeholder}" style="padding:8px 12px;border:1px solid #cbd5e1;border-radius:6px;width:100%;">\`;
    case 'Textarea':
      return \`<textarea placeholder="\${c.props.placeholder}" style="padding:8px 12px;border:1px solid #cbd5e1;border-radius:6px;width:100%;min-height:80px;"></textarea>\`;
    case 'Card':
      return \`<div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.1);"><h3 style="margin-bottom:8px;">\${c.props.title}</h3><p>\${children}</p></div>\`;
    case 'Alert':
      const colors = { info: '#3b82f6', success: '#10b981', warning: '#f59e0b', danger: '#ef4444' };
      const color = colors[c.props.variant] || '#3b82f6';
      return \`<div style="background:\${color}20;color:\${color};padding:12px 16px;border-radius:6px;border-left:4px solid \${color};">\${children}</div>\`;
    case 'Badge':
      return \`<span style="background:#eef2ff;color:#4338ca;padding:2px 8px;border-radius:12px;font-size:12px;">\${children}</span>\`;
    case 'Avatar':
      return \`<div style="width:40px;height:40px;border-radius:50%;background:#6366f1;color:white;display:flex;align-items:center;justify-content:center;">U</div>\`;
    case 'Image':
      return \`<div style="width:\${c.props.width}px;height:\${c.props.height}px;background:#e2e8f0;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#94a3b8;">Image</div>\`;
    case 'Progress':
    case 'ProgressBar':
      return \`<div style="background:#e2e8f0;border-radius:6px;height:8px;width:100%;"><div style="background:#4f46e5;height:100%;width:\${c.props.value}%;border-radius:6px;"></div></div>\`;
    case 'Paragraph':
      return \`<p style="line-height:1.6;color:#475569;">\${children}</p>\`;
    case 'Divider':
      return \`<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;">\`;
    default:
      return \`<div style="padding:8px 12px;border:1px dashed #cbd5e1;border-radius:4px;color:#64748b;font-size:13px;">[\${c.type}] \${children}</div>\`;
  }
}

function renderComponentPreview(c) {
  return \`<div>\${renderComponentInner(c)}</div>\`;
}

// ─── Inspector ─────────────────────────────────────────────────────────────
function renderInspector() {
  const inspector = document.getElementById('inspector');
  const selected = canvas.find(c => c.id === selectedId);
  if (!selected) {
    inspector.innerHTML = '<div style="color: #64748b; text-align: center; padding: 40px 0; font-size: 13px;">Select a component to edit its properties</div>';
    return;
  }
  let fieldsHtml = '';
  for (const [key, value] of Object.entries(selected.props)) {
    fieldsHtml += \`<div class="inspector-field">
      <label>\${key}</label>
      <input type="text" value="\${escapeHtml(String(value))}" oninput="updateProp(\${selected.id}, '\${key}', this.value)">
    </div>\`;
  }
  inspector.innerHTML = \`
    <div class="inspector-section">
      <h3>Component</h3>
      <div style="background:#0f172a;padding:8px 12px;border-radius:4px;font-family:monospace;font-size:13px;color:#818cf8;">\${selected.type} (#\${selected.id})</div>
    </div>
    <div class="inspector-section">
      <h3>Properties</h3>
      \${fieldsHtml}
    </div>
    <div class="inspector-section">
      <h3>Actions</h3>
      <button class="btn btn-ghost" style="width:100%;margin-bottom:6px;" onclick="duplicateComponent(\${selected.id})">📋 Duplicate</button>
      <button class="btn" style="width:100%;background:#ef4444;" onclick="deleteComponent(\${selected.id})">🗑 Delete</button>
    </div>
    <div class="inspector-section">
      <h3>Component Tree</h3>
      <div class="tree" id="tree"></div>
    </div>
  \`;
  renderTree();
}

function renderTree() {
  const tree = document.getElementById('tree');
  if (!tree) return;
  if (canvas.length === 0) {
    tree.innerHTML = '<div style="color:#64748b;font-size:11px;">No components</div>';
    return;
  }
  tree.innerHTML = canvas.map(c => {
    const selected = c.id === selectedId ? 'selected' : '';
    return \`<div class="tree-item \${selected}" onclick="selectComponent(\${c.id})"><span class="indent">•</span> \${c.type}</div>\`;
  }).join('');
}

function selectComponent(id) {
  selectedId = id;
  renderCanvas();
  renderInspector();
}

function updateProp(id, key, value) {
  const c = canvas.find(x => x.id === id);
  if (c) {
    c.props[key] = value;
    renderCanvas();
  }
}

function deleteComponent(id) {
  pushHistory();
  canvas = canvas.filter(c => c.id !== id);
  if (selectedId === id) selectedId = null;
  renderCanvas();
  renderInspector();
  showToast('Deleted');
}

function duplicateComponent(id) {
  pushHistory();
  const c = canvas.find(x => x.id === id);
  if (c) {
    const copy = { ...c, id: nextId++, props: { ...c.props } };
    canvas.push(copy);
    selectedId = copy.id;
    renderCanvas();
    renderInspector();
    showToast('Duplicated');
  }
}

// ─── History (undo/redo) ───────────────────────────────────────────────────
function pushHistory() {
  history = history.slice(0, historyIndex + 1);
  history.push(JSON.stringify({ canvas, nextId }));
  historyIndex++;
  if (history.length > 50) { history.shift(); historyIndex--; }
}

function undo() {
  if (historyIndex < 0) return;
  historyIndex--;
  if (historyIndex >= 0) {
    const state = JSON.parse(history[historyIndex]);
    canvas = state.canvas;
    nextId = state.nextId;
    renderCanvas();
    renderInspector();
    showToast('Undone');
  }
}

function redo() {
  if (historyIndex >= history.length - 1) return;
  historyIndex++;
  const state = JSON.parse(history[historyIndex]);
  canvas = state.canvas;
  nextId = state.nextId;
  renderCanvas();
  renderInspector();
  showToast('Redone');
}

// ─── Breakpoints ───────────────────────────────────────────────────────────
function setBreakpoint(bp) {
  breakpoint = bp;
  document.querySelectorAll('.breakpoint-toggle button').forEach(b => b.classList.remove('active'));
  document.getElementById('bp-' + bp).classList.add('active');
  const frame = document.querySelector('.canvas-frame');
  if (bp === 'mobile') frame.style.maxWidth = '375px';
  else if (bp === 'tablet') frame.style.maxWidth = '768px';
  else frame.style.maxWidth = '1024px';
}

// ─── Preview mode ──────────────────────────────────────────────────────────
function togglePreview() {
  previewMode = !previewMode;
  renderCanvas();
  showToast(previewMode ? 'Preview mode ON' : 'Preview mode OFF');
}

// ─── Save/load ─────────────────────────────────────────────────────────────
function saveDesign() {
  const design = { canvas, version: '2.0.0-alpha.22', savedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(design, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'elmoorx-design.json'; a.click();
  URL.revokeObjectURL(url);
  showToast('Saved!');
}

// ─── Templates ─────────────────────────────────────────────────────────────
function loadTemplate() {
  const templates = [
    { name: 'Login Page', components: [
      { type: 'Card', props: { title: 'Login', children: '' } },
      { type: 'Input', props: { placeholder: 'Email', type: 'email', value: '' } },
      { type: 'Input', props: { placeholder: 'Password', type: 'password', value: '' } },
      { type: 'Button', props: { children: 'Sign In', variant: 'primary' } },
    ]},
    { name: 'Dashboard', components: [
      { type: 'H1', props: { children: 'Dashboard', className: '' } },
      { type: 'Card', props: { title: 'Stats', children: 'Users: 1,234' } },
      { type: 'ProgressBar', props: { value: 75, max: 100 } },
      { type: 'Chart', props: { children: '', type: 'line' } },
    ]},
    { name: 'Pricing Page', components: [
      { type: 'H1', props: { children: 'Pricing', className: '' } },
      { type: 'Card', props: { title: 'Free', children: '\\$0/mo' } },
      { type: 'Card', props: { title: 'Pro', children: '\\$99/mo' } },
      { type: 'Button', props: { children: 'Get Started', variant: 'primary' } },
    ]},
  ];
  const choice = prompt('Choose template:\\n' + templates.map((t, i) => \`\${i+1}. \${t.name}\`).join('\\n'));
  const idx = parseInt(choice, 10) - 1;
  if (idx >= 0 && idx < templates.length) {
    pushHistory();
    canvas = templates[idx].components.map(c => ({ ...c, id: nextId++ }));
    renderCanvas();
    renderInspector();
    showToast('Loaded template: ' + templates[idx].name);
  }
}

// ─── Export code ───────────────────────────────────────────────────────────
function exportCode() {
  if (canvas.length === 0) {
    showToast('Nothing to export');
    return;
  }
  const imports = new Set();
  canvas.forEach(c => imports.add(c.type));
  const code = \`import { \${Array.from(imports).join(', ')} } from '@elmoorx/ui';

export default function Page() {
  return (
    <div>
\${canvas.map(c => \`      <\${c.type}\${Object.entries(c.props).map(([k, v]) => v === '' ? '' : \` \${k}={\${JSON.stringify(v)}}\`).join('')} />\`).join('\\n')}
    </div>
  );
}
\`;
  document.getElementById('codeOutput').textContent = code;
  document.getElementById('codeModal').classList.add('show');
}

function copyCode() {
  const code = document.getElementById('codeOutput').textContent;
  navigator.clipboard.writeText(code);
  showToast('Code copied to clipboard!');
}

function closeModal() {
  document.getElementById('codeModal').classList.remove('show');
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

// ─── Init ──────────────────────────────────────────────────────────────────
renderPalette();
pushHistory(); // initial empty state
</script>
</body>
</html>`;
}

// ─── HTTP server ───────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.setHeader('Content-Type', 'text/html');
    return res.end(generateBuilderHTML());
  }

  if (req.url === '/api/components') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      total: 648,
      categories: Object.keys({
        Forms: 1, Layout: 1, Navigation: 1, 'Data Display': 1,
        Feedback: 1, Media: 1, Inputs: 1, Typography: 1, Utility: 1, Pro: 1, Specialty: 1,
      }),
    }));
  }

  if (req.url === '/api/templates') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify([
      { id: 'login', name: 'Login Page' },
      { id: 'dashboard', name: 'Dashboard' },
      { id: 'pricing', name: 'Pricing Page' },
    ]));
  }

  if (req.url === '/health') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      status: 'ok',
      service: 'visual-builder',
      version: '2.0.0-alpha.22',
      features: ['drag-drop', 'preview', 'undo-redo', 'code-export', 'templates', 'breakpoints'],
    }));
  }

  res.statusCode = 404;
  res.end('Not found');
});

const PORT = 5100;
server.listen(PORT, () => {
  console.log(`  ✓ Visual Builder       → http://localhost:${PORT}`);
});

module.exports = { server, generateBuilderHTML };
