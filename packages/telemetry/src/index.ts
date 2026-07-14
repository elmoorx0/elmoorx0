/**
 * @elmoorx/telemetry — App Monitoring + Error Tracking
 * Real-time metrics, error capture, performance monitoring.
 */

import { $state } from "@elmoorx/runtime";

export interface TelemetryEvent { id: number; name: string; level: "info" | "warn" | "error" | "fatal"; message?: string; metadata?: Record<string, unknown>; timestamp: number; session: string; url?: string; }

class TelemetryManager {
  private events = $state<TelemetryEvent[]>([]);
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histograms = new Map<string, number[]>();
  private sessionId = "sess_" + Math.random().toString(36).slice(2, 9);
  private eventId = 0;
  private enabled = true;

  capture(name: string, level: TelemetryEvent["level"] = "info", message?: string, metadata?: Record<string, unknown>): void {
    if (!this.enabled) return;
    const event: TelemetryEvent = { id: ++this.eventId, name, level, message, metadata, timestamp: Date.now(), session: this.sessionId, url: typeof window !== "undefined" ? window.location.href : undefined };
    this.events.set([event, ...this.events()].slice(0, 1000));
    if (level === "error" || level === "fatal") console.error(`[telemetry] ${name}:`, message, metadata);
  }

  captureError(err: Error, metadata?: Record<string, unknown>): void { this.capture(err.name, "error", err.message, { ...metadata, stack: err.stack }); }
  captureMessage(msg: string, level: TelemetryEvent["level"] = "info"): void { this.capture("message", level, msg); }

  increment(name: string, by = 1): void { this.counters.set(name, (this.counters.get(name) || 0) + by); }
  gauge(name: string, value: number): void { this.gauges.set(name, value); }
  histogram(name: string, value: number): void { if (!this.histograms.has(name)) this.histograms.set(name, []); (this.histograms.get(name) as NonNullable<ReturnType<typeof this.histograms.get>>).push(value); }

  getCounters(): Record<string, number> { return Object.fromEntries(this.counters); }
  getGauges(): Record<string, number> { return Object.fromEntries(this.gauges); }
  getHistograms(): Record<string, { count: number; avg: number; min: number; max: number; p50: number; p95: number; p99: number }> {
    const result: unknown = {};
    for (const [name, values] of this.histograms) {
      const sorted = [...values].sort((a, b) => a - b);
      (result as Record<string, unknown>)[name] = {
        count: values.length,
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: sorted[0] || 0,
        max: sorted[sorted.length - 1] || 0,
        p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
        p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
        p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
      };
    }
    return result as Record<string, { count: number; avg: number; min: number; max: number; p50: number; p95: number; p99: number; }>;
  }

  getEvents(): TelemetryEvent[] { return this.events(); }
  getErrors(): TelemetryEvent[] { return this.events().filter(e => e.level === "error" || e.level === "fatal"); }

  enable(): void { this.enabled = true; }
  disable(): void { this.enabled = false; }
  clear(): void { this.events.set([]); this.counters.clear(); this.gauges.clear(); this.histograms.clear(); }

  export(): string {
    return JSON.stringify({ session: this.sessionId, events: this.events(), counters: this.getCounters(), gauges: this.getGauges(), histograms: this.getHistograms(), exportedAt: new Date().toISOString() }, null, 2);
  }

  // Auto-capture global errors
  install(): void {
    if (typeof window === "undefined") return;
    window.addEventListener("error", (e) => { this.captureError(e.error || new Error(e.message), { filename: e.filename, line: e.lineno, col: e.colno }); });
    window.addEventListener("unhandledrejection", (e) => { this.capture("unhandledrejection", "error", String(e.reason), { reason: e.reason }); });
  }
}

export const telemetry = new TelemetryManager();
