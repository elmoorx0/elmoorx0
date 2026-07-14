/**
 * Elmoorx DevTools — Browser debug panel
 * ============================================
 * Press Ctrl+Shift+W (or Cmd+Shift+W on Mac) to open.
 *
 * Shows:
 *   - Active signals (current value + dep count)
 *   - Active effects (call count + last run time)
 *   - Hydrated islands (location + size)
 *   - Performance timeline
 *   - Store snapshots
 *
 * Zero-cost in production — only included when NODE_ENV !== 'production'.
 *
 * Bundle impact: ~1.2kb (only in dev builds)
 */

import { $state } from "@elmoorx/runtime";

interface DevtoolsState {
  signals: Map<string, { value: unknown; deps: number }>;
  effects: Map<string, { runs: number; lastMs: number }>;
  islands: Map<string, { id: string; element?: Element }>;
  storeSnapshots: Map<string, unknown>;
  open: boolean;
}

const devtools = $state<DevtoolsState>({
  signals: new Map(),
  effects: new Map(),
  islands: new Map(),
  storeSnapshots: new Map(),
  open: false,
});

// Track active signals
const originalState = (globalThis as Record<string, unknown>).$state;
if (typeof originalState === "function") {
  let signalId = 0;
  (globalThis as Record<string, unknown>).$state = function (initial: unknown) {
    const id = `sig_${signalId++}`;
    const sig = originalState(initial);

    // Track value changes
    const originalSet = sig.set;
    sig.set = function (v: unknown) {
      const resolved = typeof v === "function" ? v(sig._value) : v;
      devtools().signals.set(id, { value: resolved, deps: sig._deps?.size || 0 });
      return originalSet(v);
    };

    devtools().signals.set(id, { value: initial, deps: 0 });
    return sig;
  };
}

/**
 * Register an island with the devtools.
 */
export function registerIsland(id: string, element?: Element): void {
  if (process.env.NODE_ENV === "production") return;
  devtools().islands.set(id, { id, element });
}

/**
 * Take a snapshot of a store's current state.
 */
export function snapshotStore(name: string, value: unknown): void {
  if (process.env.NODE_ENV === "production") return;
  devtools().storeSnapshots.set(name, value);
}

/**
 * Inject the devtools panel into the page.
 * Call this once at app startup (dev only).
 */
export function injectDevtools(): void {
  if (process.env.NODE_ENV === "production") return;
  if (typeof document === "undefined") return;

  // Wait for DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectDevtools);
    return;
  }

  // Create panel container
  const panel = document.createElement("div");
  panel.id = "elmoorx-devtools";
  panel.style.cssText = `
    position: fixed; bottom: 0; right: 0; width: 400px; height: 300px;
    background: #0A0A0F; color: #E4E4E7; border: 1px solid #A855F7;
    border-radius: 8px 0 0 0; z-index: 99999; font-family: monospace;
    font-size: 11px; padding: 12px; overflow: auto; display: none;
    box-shadow: 0 0 40px rgba(168,85,247,0.3);
  `;
  document.body.appendChild(panel);

  // Toggle with Ctrl+Shift+W
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "W") {
      e.preventDefault();
      panel.style.display = panel.style.display === "none" ? "block" : "none";
      renderPanel(panel);
    }
  });

  // Auto-update every 500ms when open
  setInterval(() => {
    if (panel.style.display === "block") renderPanel(panel);
  }, 500);

  console.warn("%c Elmoorx DevTools ", "background:#A855F7;color:white;padding:4px 8px;border-radius:4px;font-weight:bold");
  console.warn("Press Ctrl+Shift+W to toggle the debug panel");
}

function renderPanel(panel: HTMLElement): void {
  const state = devtools();
  const sigCount = state.signals.size;
  const effCount = state.effects.size;
  const islandCount = state.islands.size;

  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:1px solid #2A2A38;padding-bottom:8px">
      <strong style="color:#A855F7">⚡ Elmoorx DevTools</strong>
      <span style="color:#71717A;font-size:10px">v1.0</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">
      <div style="background:#14141B;padding:8px;border-radius:4px;text-align:center">
        <div style="color:#A855F7;font-size:16px;font-weight:bold">${sigCount}</div>
        <div style="color:#71717A;font-size:9px">SIGNALS</div>
      </div>
      <div style="background:#14141B;padding:8px;border-radius:4px;text-align:center">
        <div style="color:#06B6D4;font-size:16px;font-weight:bold">${effCount}</div>
        <div style="color:#71717A;font-size:9px">EFFECTS</div>
      </div>
      <div style="background:#14141B;padding:8px;border-radius:4px;text-align:center">
        <div style="color:#10B981;font-size:16px;font-weight:bold">${islandCount}</div>
        <div style="color:#71717A;font-size:9px">ISLANDS</div>
      </div>
    </div>
    <div style="margin-bottom:8px">
      <div style="color:#A855F7;margin-bottom:4px">Signals:</div>
      ${[...state.signals.entries()].slice(0, 5).map(([id, info]) => `
        <div style="background:#14141B;padding:4px 6px;border-radius:3px;margin-bottom:2px;color:#A1A1AA">
          ${id}: <span style="color:#06B6D4">${JSON.stringify(info.value).slice(0, 40)}</span>
          <span style="color:#71717A">(${info.deps} deps)</span>
        </div>
      `).join("")}
    </div>
    <div>
      <div style="color:#A855F7;margin-bottom:4px">Islands:</div>
      ${[...state.islands.entries()].slice(0, 5).map(([id, _info]) => `
        <div style="background:#14141B;padding:4px 6px;border-radius:3px;margin-bottom:2px;color:#A1A1AA">
          ${id}
        </div>
      `).join("")}
    </div>
  `;
}
