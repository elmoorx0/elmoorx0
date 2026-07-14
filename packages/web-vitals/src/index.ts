/**
 * @elmoorx/web-vitals — Core Web Vitals tracking
 * ============================================
 * Automatically track LCP, FID, CLS, INP, TTFB, FCP
 * and report to your analytics endpoint.
 *
 *   import { trackWebVitals } from '@elmoorx/web-vitals';
 *   trackWebVitals({
 *     endpoint: '/api/vitals',
 *     // or callback
 *     onMetric: (metric) => console.warn(metric),
 *   });
 */

export interface WebVitalMetric {
  name: "LCP" | "FID" | "CLS" | "INP" | "TTFB" | "FCP";
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
  timestamp: number;
  // Additional navigation entry info
  navigationType?: string;
}

export interface WebVitalsOptions {
  // Report immediately on each metric
  immediate?: boolean;
  // Report on page unload (default: true)
  reportOnUnload?: boolean;
  // Analytics endpoint
  endpoint?: string;
  // Custom callback
  onMetric?: (metric: WebVitalMetric) => void;
  // Sample rate (0-1, default: 1)
  sampleRate?: number;
}

const thresholds = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  INP: { good: 200, poor: 500 },
  TTFB: { good: 800, poor: 1800 },
  FCP: { good: 1800, poor: 3000 },
};

function getRating(name: WebVitalMetric["name"], value: number): WebVitalMetric["rating"] {
  const t = thresholds[name];
  if (value <= t.good) return "good";
  if (value > t.poor) return "poor";
  return "needs-improvement";
}

let cachedMetrics: WebVitalMetric[] = [];

/**
 * Start tracking Web Vitals.
 */
export function trackWebVitals(opts: WebVitalsOptions = {}): () => void {
  if (typeof window === "undefined") return () => {};

  const sampleRate = opts.sampleRate ?? 1;
  if (Math.random() > sampleRate) return () => {};

  const report = (metric: WebVitalMetric) => {
    cachedMetrics.push(metric);
    opts.onMetric?.(metric);

    if (opts.immediate && opts.endpoint) {
      sendToEndpoint(opts.endpoint, [metric]);
    }
  };

  // Use web-vitals library if available, otherwise polyfill
  // (Real impl would use the web-vitals package)
  observeLCP(report);
  observeCLS(report);
  observeFID(report);
  observeINP(report);
  observeFCP(report);
  observeTTFB(report);

  // Report on unload
  if (opts.reportOnUnload !== false && opts.endpoint) {
    const endpoint = opts.endpoint;
    const handler = () => {
      if (cachedMetrics.length === 0) return;
      sendToEndpoint(endpoint, cachedMetrics, true);
      cachedMetrics = [];
    };
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") handler();
    });
    window.addEventListener("pagehide", handler);
  }

  return () => {
    cachedMetrics = [];
  };
}

function observeLCP(report: (m: WebVitalMetric) => void): void {
  if (!("PerformanceObserver" in window)) return;
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    report({
      name: "LCP",
      value: lastEntry.startTime,
      rating: getRating("LCP", lastEntry.startTime),
      delta: lastEntry.startTime,
      id: "lcp-" + Date.now(),
      timestamp: Date.now(),
    });
  });
  try {
    observer.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {}
}

function observeCLS(report: (m: WebVitalMetric) => void): void {
  if (!("PerformanceObserver" in window)) return;
  let clsValue = 0;
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const layoutShift = entry as unknown;
      if (!(layoutShift as Record<string, unknown>).hadRecentInput) {
// @ts-expect-error — TS2571: Object is of type 'unknown'.
        clsValue += (layoutShift as Record<string, unknown>).value;
      }
    }
    report({
      name: "CLS",
      value: clsValue,
      rating: getRating("CLS", clsValue),
      delta: clsValue,
      id: "cls-" + Date.now(),
      timestamp: Date.now(),
    });
  });
  try {
    observer.observe({ type: "layout-shift", buffered: true });
  } catch {}
}

function observeFID(report: (m: WebVitalMetric) => void): void {
  if (!("PerformanceObserver" in window)) return;
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const fid = entry as unknown;
      const fidRecord = fid as Record<string, unknown>;
      const value = (fidRecord.processingStart as number) - (fidRecord.startTime as number);
      report({
        name: "FID",
        value,
        rating: getRating("FID", value),
        delta: value,
        id: "fid-" + Date.now(),
        timestamp: Date.now(),
      });
    }
  });
  try {
    observer.observe({ type: "first-input", buffered: true });
  } catch {}
}

function observeINP(report: (m: WebVitalMetric) => void): void {
  if (!("PerformanceObserver" in window)) return;
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
// @ts-expect-error — TS2352: Conversion of type 'PerformanceEntry' to type 'Record<string, unknown>' 
      const inp = entry as Record<string, unknown>;
      const value = inp.duration as number;
      report({
        name: "INP",
        value,
        rating: getRating("INP", value),
        delta: value,
        id: "inp-" + Date.now(),
        timestamp: Date.now(),
      });
    }
  });
  try {
    observer.observe({ type: "event", buffered: true });
  } catch {}
}

function observeFCP(report: (m: WebVitalMetric) => void): void {
  if (!("PerformanceObserver" in window)) return;
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
// @ts-expect-error — TS2571: Object is of type 'unknown'.
      if ((entry as unknown).name === "first-contentful-paint") {
        const value = entry.startTime;
        report({
          name: "FCP",
          value,
          rating: getRating("FCP", value),
          delta: value,
          id: "fcp-" + Date.now(),
          timestamp: Date.now(),
        });
      }
    }
  });
  try {
    observer.observe({ type: "paint", buffered: true });
  } catch {}
}

function observeTTFB(report: (m: WebVitalMetric) => void): void {
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
  if (!nav) return;
  const value = nav.responseStart - nav.requestStart;
  report({
    name: "TTFB",
    value,
    rating: getRating("TTFB", value),
    delta: value,
    id: "ttfb-" + Date.now(),
    timestamp: Date.now(),
    navigationType: nav.type,
  });
}

function sendToEndpoint(endpoint: string, metrics: WebVitalMetric[], useBeacon = false): void {
  const body = JSON.stringify({ metrics, page: location.pathname, ts: Date.now() });
  if (useBeacon && "sendBeacon" in navigator) {
    navigator.sendBeacon(endpoint, body);
  } else {
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }
}

/**
 * Get current cached metrics (for debugging).
 */
export function getCachedMetrics(): WebVitalMetric[] {
  return cachedMetrics;
}

/**
 * Clear the metrics cache.
 */
export function clearMetrics(): void {
  cachedMetrics = [];
}
