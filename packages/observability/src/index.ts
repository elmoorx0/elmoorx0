/**
 * @elmoorx/observability — Full observability stack
 *
 * Features:
 * - Structured logging (JSON, with levels, redaction)
 * - Metrics collection (counter, gauge, histogram, timer)
 * - Distributed tracing (spans, parent/child)
 * - Health checks
 * - Readiness checks
 * - Prometheus export
 * - Error tracking
 * - Performance monitoring
 *
 * Zero dependencies. Designed for weak servers.
 */

import { EventEmitter } from 'events';

// ─── Logging ────────────────────────────────────────────────────────────────

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60,
};

export interface LogEntry {
  level: LogLevel;
  msg: string;
  timestamp: number;
  [key: string]: unknown;
}

export class Logger {
  private level: number = LOG_LEVELS.info;
  private entries: LogEntry[] = [];
  private maxEntries: number;
  private redactKeys: Set<string>;
  private transports: ((entry: LogEntry) => void)[] = [];

  constructor(options?: { level?: LogLevel; maxEntries?: number; redact?: string[] }) {
    if (options?.level) this.level = LOG_LEVELS[options.level];
    this.maxEntries = options?.maxEntries || 5000;
    this.redactKeys = new Set(options?.redact || ['password', 'token', 'secret', 'apiKey', 'creditCard']);
  }

  setLevel(level: LogLevel): void {
    this.level = LOG_LEVELS[level];
  }

  addTransport(fn: (entry: LogEntry) => void): void {
    this.transports.push(fn);
  }

  log(level: LogLevel, msg: string, meta?: Record<string, unknown>): void {
    if (LOG_LEVELS[level] < this.level) return;

    const entry: LogEntry = {
      level,
      msg,
      timestamp: Date.now(),
      ...this.redact(meta || {}),
    };

    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) this.entries.shift();

    for (const transport of this.transports) {
      transport(entry);
    }
  }

  trace(msg: string, meta?: Record<string, unknown>): void { this.log('trace', msg, meta); }
  debug(msg: string, meta?: Record<string, unknown>): void { this.log('debug', msg, meta); }
  info(msg: string, meta?: Record<string, unknown>): void { this.log('info', msg, meta); }
  warn(msg: string, meta?: Record<string, unknown>): void { this.log('warn', msg, meta); }
  error(msg: string, meta?: Record<string, unknown>): void { this.log('error', msg, meta); }
  fatal(msg: string, meta?: Record<string, unknown>): void { this.log('fatal', msg, meta); }

  child(meta: Record<string, unknown>): Logger {
    const child = new Logger({ maxEntries: this.maxEntries });
    child.level = this.level;
    child.transports = this.transports;
    const origLog = child.log.bind(child);
    child.log = (level, msg, m) => origLog(level, msg, { ...meta, ...m });
    return child;
  }

  getEntries(filter?: { level?: LogLevel; since?: number }): LogEntry[] {
    if (!filter) return [...this.entries];
    return this.entries.filter(e =>
      (!filter.level || LOG_LEVELS[e.level] >= LOG_LEVELS[filter.level]) &&
      (!filter.since || e.timestamp >= filter.since)
    );
  }

  private redact(meta: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(meta)) {
      if (this.redactKeys.has(key.toLowerCase())) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.redact(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}

// ─── Metrics ────────────────────────────────────────────────────────────────

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'timer';

export interface MetricPoint {
  name: string;
  type: MetricType;
  value: number;
  labels?: Record<string, string>;
  timestamp: number;
}

export class MetricsCollector extends EventEmitter {
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histograms = new Map<string, number[]>();
  private timers = new Map<string, number>();

  increment(name: string, by: number = 1, labels?: Record<string, string>): void {
    const key = this.key(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + by);
    this.emit('metric', { name, type: 'counter', value: current + by, labels, timestamp: Date.now() } as MetricPoint);
  }

  gauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.key(name, labels);
    this.gauges.set(key, value);
    this.emit('metric', { name, type: 'gauge', value, labels, timestamp: Date.now() } as MetricPoint);
  }

  observe(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.key(name, labels);
    let histogram = this.histograms.get(key);
    if (!histogram) {
      histogram = [];
      this.histograms.set(key, histogram);
    }
    histogram.push(value);
    if (histogram.length > 10000) histogram.shift();
    this.emit('metric', { name, type: 'histogram', value, labels, timestamp: Date.now() } as MetricPoint);
  }

  startTimer(name: string, labels?: Record<string, string>): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.observe(name + '.duration', duration, labels);
    };
  }

  getCounter(name: string, labels?: Record<string, string>): number {
    return this.counters.get(this.key(name, labels)) || 0;
  }

  getGauge(name: string, labels?: Record<string, string>): number {
    return this.gauges.get(this.key(name, labels)) || 0;
  }

  getHistogram(name: string, labels?: Record<string, string>): { count: number; min: number; max: number; avg: number; p50: number; p95: number; p99: number } | null {
    const histogram = this.histograms.get(this.key(name, labels));
    if (!histogram || histogram.length === 0) return null;
    const sorted = [...histogram].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const pct = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
    return {
      count: sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / sorted.length,
      p50: pct(0.5),
      p95: pct(0.95),
      p99: pct(0.99),
    };
  }

  exportPrometheus(): string {
    let out = '';
    for (const [key, value] of this.counters) {
      const [name, labels] = this.parseKey(key);
      out += `# TYPE ${name} counter\n`;
      out += `${name}${labels} ${value}\n`;
    }
    for (const [key, value] of this.gauges) {
      const [name, labels] = this.parseKey(key);
      out += `# TYPE ${name} gauge\n`;
      out += `${name}${labels} ${value}\n`;
    }
    for (const [key, _values] of this.histograms) {
      const [name, labels] = this.parseKey(key);
      const stats = this.getHistogram(name, undefined);
      if (stats) {
        out += `# TYPE ${name} histogram\n`;
        out += `${name}_count${labels} ${stats.count}\n`;
        out += `${name}_sum${labels} ${stats.avg * stats.count}\n`;
        out += `${name}{quantile="0.5"} ${stats.p50}\n`;
        out += `${name}{quantile="0.95"} ${stats.p95}\n`;
        out += `${name}{quantile="0.99"} ${stats.p99}\n`;
      }
    }
    return out;
  }

  private key(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) return name;
    const labelStr = Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',');
    return `${name}{${labelStr}}`;
  }

  private parseKey(key: string): [string, string] {
    const idx = key.indexOf('{');
    if (idx === -1) return [key, ''];
    return [key.slice(0, idx), key.slice(idx)];
  }
}

// ─── Distributed Tracing ────────────────────────────────────────────────────

export interface Span {
  id: string;
  parentId?: string;
  traceId: string;
  name: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  tags: Record<string, string>;
  status: 'ok' | 'error';
}

export class Tracer {
  private spans = new Map<string, Span>();
  private traces = new Map<string, string[]>();

  startSpan(name: string, parentId?: string, tags?: Record<string, string>): { span: Span; end: (status?: 'ok' | 'error', extraTags?: Record<string, string>) => void } {
    const traceId = parentId ? this.findTraceId(parentId) : this.genId('trace');
    const span: Span = {
      id: this.genId('span'),
      parentId,
      traceId,
      name,
      startTime: Date.now(),
      tags: tags || {},
      status: 'ok',
    };
    this.spans.set(span.id, span);
    if (!this.traces.has(traceId)) this.traces.set(traceId, []);
    const spanList = this.traces.get(traceId);
    if (spanList) spanList.push(span.id);
    return {
      span,
      end: (status = 'ok', extraTags) => {
        span.endTime = Date.now();
        span.durationMs = span.endTime - span.startTime;
        span.status = status;
        if (extraTags) Object.assign(span.tags, extraTags);
      },
    };
  }

  getTrace(traceId: string): Span[] {
    const spanIds = this.traces.get(traceId) || [];
    return spanIds.map(id => this.spans.get(id)).filter(Boolean) as Span[];
  }

  getRecentSpans(limit: number = 100): Span[] {
    const all = Array.from(this.spans.values());
    return all.slice(-limit);
  }

  private genId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  private findTraceId(spanId: string): string {
    const span = this.spans.get(spanId);
    if (span) return span.traceId;
    return this.genId('trace');
  }
}

// ─── Health Checks ──────────────────────────────────────────────────────────

export interface HealthCheck {
  name: string;
  check: () => Promise<{ healthy: boolean; message?: string; data?: unknown }>;
}

export class HealthChecker {
  private checks: HealthCheck[] = [];

  add(name: string, check: HealthCheck['check']): void {
    this.checks.push({ name, check });
  }

  async check(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, { healthy: boolean; message?: string; data?: unknown; durationMs: number }>;
    timestamp: number;
  }> {
    const results: Record<string, { healthy: boolean; message?: string; data?: unknown; durationMs: number }> = {};
    let allHealthy = true;
    let anyHealthy = false;

    for (const { name, check } of this.checks) {
      const start = Date.now();
      try {
        const result = await check();
        results[name] = { ...result, durationMs: Date.now() - start };
        if (result.healthy) anyHealthy = true;
        else allHealthy = false;
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        results[name] = { healthy: false, message: errMsg, durationMs: Date.now() - start };
        allHealthy = false;
      }
    }

    return {
      status: allHealthy ? 'healthy' : anyHealthy ? 'degraded' : 'unhealthy',
      checks: results,
      timestamp: Date.now(),
    };
  }
}

// ─── Error Tracker ──────────────────────────────────────────────────────────

export interface TrackedError {
  id: string;
  message: string;
  stack?: string;
  timestamp: number;
  count: number;
  lastSeen: number;
  context?: unknown;
}

export class ErrorTracker {
  private errors = new Map<string, TrackedError>();
  private maxErrors: number;

  constructor(maxErrors: number = 1000) {
    this.maxErrors = maxErrors;
  }

  track(error: Error, context?: unknown): void {
    const fingerprint = this.fingerprint(error);
    let tracked = this.errors.get(fingerprint);
    if (!tracked) {
      tracked = {
        id: fingerprint,
        message: error.message,
        stack: error.stack,
        timestamp: Date.now(),
        count: 0,
        lastSeen: Date.now(),
        context,
      };
      this.errors.set(fingerprint, tracked);
      if (this.errors.size > this.maxErrors) {
        const oldest = Array.from(this.errors.entries()).sort((a, b) => a[1].lastSeen - b[1].lastSeen)[0];
        if (oldest) this.errors.delete(oldest[0]);
      }
    }
    tracked.count++;
    tracked.lastSeen = Date.now();
  }

  getErrors(): TrackedError[] {
    return Array.from(this.errors.values()).sort((a, b) => b.lastSeen - a.lastSeen);
  }

  clear(): void {
    this.errors.clear();
  }

  private fingerprint(error: Error): string {
    const str = error.message + (error.stack?.split('\n')[1] || '');
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return 'err_' + Math.abs(h).toString(16);
  }
}

// ─── Singletons ─────────────────────────────────────────────────────────────

let _logger: Logger | null = null;
let _metrics: MetricsCollector | null = null;
let _tracer: Tracer | null = null;
let _health: HealthChecker | null = null;
let _errors: ErrorTracker | null = null;

export function getLogger(): Logger {
  if (!_logger) _logger = new Logger({ level: 'info' });
  return _logger;
}

export function getMetrics(): MetricsCollector {
  if (!_metrics) _metrics = new MetricsCollector();
  return _metrics;
}

export function getTracer(): Tracer {
  if (!_tracer) _tracer = new Tracer();
  return _tracer;
}

export function getHealthChecker(): HealthChecker {
  if (!_health) _health = new HealthChecker();
  return _health;
}

export function getErrorTracker(): ErrorTracker {
  if (!_errors) _errors = new ErrorTracker();
  return _errors;
}

export const OBSERVABILITY_VERSION = '3.0.0-alpha.2';
