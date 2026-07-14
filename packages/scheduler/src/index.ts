/**
 * @elmoorx/scheduler — Task scheduler: cron, intervals, one-time, distributed locks
 * ============================================
 * In-process scheduler with persistent registration hooks. Swap the
 * `LockBackend` for Redis/Postgres advisory locks to run distributed.
 *
 *   import { scheduler } from "@elmoorx/scheduler";
 *
 *   scheduler.every('5m', () => syncDb());
 *   scheduler.cron('0 9 * * 1', () => sendWeeklyReport());
 *   scheduler.at('2026-01-01T00:00:00Z', () => newYear());
 *   scheduler.start();
 */

export interface LockBackend {
  acquire(key: string, ttlMs: number): Promise<boolean>;
  release(key: string): Promise<void>;
}

class NoopLockBackend implements LockBackend {
  async acquire(): Promise<boolean> {
    return true;
  }
  async release(): Promise<void> {
    /* noop */
  }
}

export interface ScheduledTask {
  id: string;
  name: string;
  nextRun: number;
  run: () => Promise<void> | void;
  cancel: () => void;
}

interface InternalTask {
  id: string;
  name: string;
  intervalMs?: number;
  cronExpr?: string;
  nextRun: number;
  fn: () => Promise<void> | void;
  cancelled: boolean;
}

class Scheduler {
  private tasks = new Map<string, InternalTask>();
  private timer: NodeJS.Timeout | null = null;
  private lockBackend: LockBackend = new NoopLockBackend();

  setLockBackend(backend: LockBackend): void {
    this.lockBackend = backend;
  }

  every(interval: string | number, fn: () => Promise<void> | void, name?: string): string {
    const ms = typeof interval === "number" ? interval : parseDuration(interval);
    return this.register({
      id: makeId(name ?? "every"),
      name: name ?? "every",
      intervalMs: ms,
      nextRun: Date.now() + ms,
      fn,
      cancelled: false,
    });
  }

  cron(expr: string, fn: () => Promise<void> | void, name?: string): string {
    return this.register({
      id: makeId(name ?? "cron"),
      name: name ?? "cron",
      cronExpr: expr,
      nextRun: nextCronRun(expr),
      fn,
      cancelled: false,
    });
  }

  at(isoTime: string, fn: () => Promise<void> | void, name?: string): string {
    const when = Date.parse(isoTime);
    if (Number.isNaN(when)) throw new Error(`Invalid ISO time: ${isoTime}`);
    return this.register({
      id: makeId(name ?? "at"),
      name: name ?? "at",
      nextRun: when,
      fn,
      cancelled: false,
    });
  }

  cancel(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    task.cancelled = true;
    this.tasks.delete(id);
    return true;
  }

  list(): ScheduledTask[] {
    return [...this.tasks.values()].map((t) => ({
      id: t.id,
      name: t.name,
      nextRun: t.nextRun,
      run: t.fn,
      cancel: () => this.cancel(t.id),
    }));
  }

  start(intervalMs = 1000): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    const now = Date.now();
    for (const task of this.tasks.values()) {
      if (task.cancelled) continue;
      if (task.nextRun > now) continue;

      // Try to acquire a lock so only one process runs the task
      const got = await this.lockBackend.acquire(task.id, 60_000);
      if (!got) continue;

      try {
        await task.fn();
      } catch (err) {
        console.error(`[elmoorx/scheduler] task "${task.name}" failed:`, err);
      } finally {
        await this.lockBackend.release(task.id);
      }

      // Schedule next run
      if (task.intervalMs) {
        task.nextRun = Date.now() + task.intervalMs;
      } else if (task.cronExpr) {
        task.nextRun = nextCronRun(task.cronExpr);
      } else {
        // One-shot task — remove it
        this.tasks.delete(task.id);
      }
    }
  }

  private register(task: InternalTask): string {
    this.tasks.set(task.id, task);
    return task.id;
  }
}

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function parseDuration(s: string): number {
  const m = /^(\d+)(ms|s|m|h|d)$/.exec(s.trim());
  if (!m) throw new Error(`Invalid duration: ${s}`);
  const n = Number(m[1]);
  switch (m[2]) {
    case "ms": return n;
    case "s": return n * 1000;
    case "m": return n * 60_000;
    case "h": return n * 3_600_000;
    case "d": return n * 86_400_000;
    default: throw new Error(`Unknown unit: ${m[2]}`);
  }
}

/**
 * Minimal cron evaluator — supports 5-field cron (min hour dom month dow)
 * with star, star-slash-n, and explicit lists. Does NOT support named
 * days/months or L/W modifiers. For full cron, swap this for the
 * `cron-parser` package.
 */
function nextCronRun(expr: string, from: Date = new Date()): number {
  // Naive implementation: scan minute-by-minute for the next match.
  // Acceptable for low-frequency schedules; production code should
  // use a real cron parser.
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error(`Cron must have 5 fields: ${expr}`);

  const next = new Date(from.getTime() + 60_000);
  next.setSeconds(0, 0);
  const max = 366 * 24 * 60; // 1-year cap
  for (let i = 0; i < max; i++) {
    if (
      cronFieldMatches(parts[0], next.getMinutes()) &&
      cronFieldMatches(parts[1], next.getHours()) &&
      cronFieldMatches(parts[2], next.getDate()) &&
      cronFieldMatches(parts[3], next.getMonth() + 1) &&
      cronFieldMatches(parts[4], next.getDay())
    ) {
      return next.getTime();
    }
    next.setMinutes(next.getMinutes() + 1);
  }
  throw new Error(`No next-run within 1 year for cron: ${expr}`);
}

function cronFieldMatches(field: string, value: number): boolean {
  for (const part of field.split(",")) {
    const stepMatch = /^\*\/(\d+)$/.exec(part);
    if (stepMatch) {
      const step = Number(stepMatch[1]);
      if (value % step === 0) return true;
      continue;
    }
    if (part === "*") return true;
    const rangeMatch = /^(\d+)-(\d+)$/.exec(part);
    if (rangeMatch) {
      const [a, b] = [Number(rangeMatch[1]), Number(rangeMatch[2])];
      if (value >= a && value <= b) return true;
      continue;
    }
    if (part === String(value)) return true;
  }
  return false;
}

export const scheduler = new Scheduler();
export { Scheduler, NoopLockBackend };
export const VERSION = "3.0.0-alpha.2";
