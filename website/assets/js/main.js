/**
 * Elmoorx Framework — Documentation Website JS
 * Handles: tab switching, mobile nav, playground code execution
 */

// ─── Mobile nav toggle ────────────────────────────────────────────────
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");
if (navToggle) {
  navToggle.addEventListener("click", () => {
    navLinks.style.display = navLinks.style.display === "flex" ? "none" : "flex";
    navLinks.style.flexDirection = "column";
    navLinks.style.position = "absolute";
    navLinks.style.top = "100%";
    navLinks.style.left = "0";
    navLinks.style.right = "0";
    navLinks.style.background = "var(--bg)";
    navLinks.style.padding = "16px 24px";
    navLinks.style.borderBottom = "1px solid var(--border)";
  });
}

// ─── Tab switching ────────────────────────────────────────────────────
const tabBtns = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetTab = btn.dataset.tab;
    tabBtns.forEach((b) => b.classList.remove("active"));
    tabPanels.forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${targetTab}`).classList.add("active");
  });
});

// ─── Smooth scroll for nav links ──────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (e) => {
    const target = document.querySelector(anchor.getAttribute("href"));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

// ─── Playground code execution ────────────────────────────────────────
// Minimal Elmoorx runtime shim for the playground
function createPlaygroundRuntime() {
  let activeObserver = null;

  function $state(initial) {
    const deps = new Set();
    let value = initial;
    const read = () => {
      if (activeObserver) deps.add(activeObserver);
      return value;
    };
    read.set = (next) => {
      const resolved = typeof next === "function" ? next(value) : next;
      if (Object.is(resolved, value)) return;
      value = resolved;
      for (const dep of [...deps]) dep();
    };
    return read;
  }

  function $effect(fn) {
    const run = () => {
      const prev = activeObserver;
      activeObserver = run;
      try { fn(); } finally { activeObserver = prev; }
    };
    run();
  }

  function h(tag, props, ...children) {
    if (typeof tag === "function") {
      return tag({ ...(props || {}), children: children.flat() });
    }
    return { tag, props: props || {}, children: children.flat(Infinity).filter((c) => c != null && c !== false && c !== true) };
  }

  function mount(node, parent) {
    parent.innerHTML = "";
    const el = renderToDom(node, parent);
    if (el) parent.appendChild(el);
  }

  function renderToDom(node, parent) {
    if (node === null || node === undefined || typeof node !== "object") {
      if (typeof node === "function") {
        // Reactive child
        const marker = document.createTextNode("");
        let current = null;
        $effect(() => {
          if (current && current.parentNode) current.parentNode.removeChild(current);
          const v = node();
          current = renderToDom(v, parent);
          if (current) marker.parentNode.insertBefore(current, marker);
        });
        return marker;
      }
      if (node === null || node === undefined) return null;
      return document.createTextNode(String(node));
    }
    const el = node;
    const dom = document.createElement(el.tag);
    for (const [key, value] of Object.entries(el.props || {})) {
      if (key === "children" || value == null || value === false) continue;
      if (key === "style") {
        dom.setAttribute("style", String(value));
      } else if (key.startsWith("on") && typeof value === "function") {
        dom.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (typeof value === "function") {
        $effect(() => {
          dom.setAttribute(key, String(value()));
        });
      } else {
        dom.setAttribute(key, String(value));
      }
    }
    for (const child of el.children || []) {
      if (typeof child === "function") {
        let currentNodes = [];
        $effect(() => {
          for (const n of currentNodes) {
            if (n.parentNode) n.parentNode.removeChild(n);
          }
          currentNodes = [];
          const v = child();
          const nodes = Array.isArray(v) ? v : [v];
          for (const n of nodes) {
            const domNode = renderToDom(n, dom);
            if (domNode) {
              dom.appendChild(domNode);
              currentNodes.push(domNode);
            }
          }
        });
      } else {
        const childDom = renderToDom(child, dom);
        if (childDom) dom.appendChild(childDom);
      }
    }
    return dom;
  }

  return { $state, $effect, h, mount };
}

// Run button
const runBtn = document.getElementById("run-btn");
const codeInput = document.getElementById("code-input");
const output = document.getElementById("output");

function runCode() {
  if (!codeInput || !output) return;
  output.innerHTML = "";
  try {
    const runtime = createPlaygroundRuntime();
    // Create a function with the runtime in scope
    const fn = new Function(
      "$state", "$effect", "h", "mount", "document",
      `${codeInput.value}`
    );
    fn(runtime.$state, runtime.$effect, runtime.h, runtime.mount, document);
  } catch (err) {
    output.innerHTML = `<div style="color: #ef4444; padding: 16px; font-family: monospace;">Error: ${err.message}</div>`;
  }
}

if (runBtn) {
  runBtn.addEventListener("click", runCode);
}

// Auto-run on load
window.addEventListener("load", () => {
  setTimeout(runCode, 100);
});

// ─── Nav background on scroll ─────────────────────────────────────────
const nav = document.querySelector(".nav");
window.addEventListener("scroll", () => {
  if (window.scrollY > 20) {
    nav.style.background = "rgba(15, 23, 42, 0.95)";
  } else {
    nav.style.background = "rgba(15, 23, 42, 0.8)";
  }
});

// ─── Animate elements on scroll ───────────────────────────────────────
const observerOptions = { threshold: 0.1, rootMargin: "0px 0px -100px 0px" };
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
    }
  });
}, observerOptions);

document.querySelectorAll(".feature-card, .api-card, .example-card").forEach((el) => {
  el.style.opacity = "0";
  el.style.transform = "translateY(20px)";
  el.style.transition = "opacity 0.6s, transform 0.6s";
  observer.observe(el);
});
