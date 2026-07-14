/**
 * @elmoorx/cron — Job Scheduler + Task Queue
 * Schedule recurring and one-time jobs.
 */

export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  handler: () => void | Promise<void>;
  lastRun?: number;
  nextRun?: number;
  runs: number;
  active: boolean;
}

class CronScheduler {
  private jobs = new Map<string, { job: CronJob; intervalId: unknown }>();

  schedule(name: string, cronExpr: string, handler: () => void | Promise<void>): string {
    const id = "job_" + Math.random().toString(36).slice(2, 9);
    const intervalMs = this.parseCron(cronExpr);
    const intervalId = setInterval(handler, intervalMs);
    const job: CronJob = { id, name, schedule: cronExpr, handler, runs: 0, active: true, nextRun: Date.now() + intervalMs };
    this.jobs.set(id, { job, intervalId });
    return id;
  }

  unschedule(id: string): boolean {
    const entry = this.jobs.get(id);
    if (!entry) return false;
    clearInterval(entry.intervalId as ReturnType<typeof setInterval>);
    this.jobs.delete(id);
    return true;
  }

  pause(id: string): void {
    const entry = this.jobs.get(id);
    if (entry) { clearInterval(entry.intervalId as ReturnType<typeof setInterval>); entry.job.active = false; }
  }

  resume(id: string): void {
    const entry = this.jobs.get(id);
    if (entry && !entry.job.active) {
      entry.job.active = true;
      const intervalMs = this.parseCron(entry.job.schedule);
      entry.intervalId = setInterval(entry.job.handler, intervalMs);
      entry.job.nextRun = Date.now() + intervalMs;
    }
  }

  getJobs(): CronJob[] { return [...this.jobs.values()].map(e => e.job); }

  /**
   * Parse a cron expression into an interval in milliseconds.
   *
   * SUPPORTED (simple intervals only):
   *   "STAR/N N N N N"  → every N minutes (where STAR is the * char)
   *   "N N N N N"       → every minute (all wildcards)
   *
   * UNSUPPORTED (throws — was silently returning 5 minutes):
   *   Specific times like "0 9 N N 1-5" (9am Mon-Fri)
   *   Hour intervals like "0 STAR/2 N N N" (every 2 hours)
   *   Lists, ranges, day-of-month patterns, etc.
   *
   * The previous implementation silently fell back to 5 minutes for
   * any unsupported expression, causing jobs to run 2,016x too often
   * (e.g. a daily job ran every 5 minutes). Now it THROWS so callers
   * know immediately that their expression isn't supported.
   *
   * For full cron support, use the 'node-cron' or 'cron' package.
   *
   * Also fixed: the field order was wrong. Standard cron is
   * "minute hour day month dow" (5 fields, no seconds). The previous
   * code treated parts[1] as "second", so a 2-hour interval expression
   * was parsed as a 2-SECOND interval — 3,600x too often.
   */
  private parseCron(expr: string): number {
    const parts = expr.trim().split(/\s+/);
    if (parts.length !== 5) {
      throw new Error(
        `[elmoorx/cron] Unsupported cron expression: "${expr}". ` +
        `Only 5-field simple intervals are supported: \`*/N * * * *\` or \`* * * * *\`. ` +
        `For full cron support, use the 'node-cron' or 'cron' package.`
      );
    }
    const [minute, hour, dom, month, dow] = parts;
    // Reject anything beyond simple */N and * in any field.
    const isSimple = (field: string): boolean => field === "*" || /^\*\/\d+$/.test(field);
    if (!isSimple(minute) || !isSimple(hour) || !isSimple(dom) || !isSimple(month) || !isSimple(dow)) {
      throw new Error(
        `[elmoorx/cron] Unsupported cron expression: "${expr}". ` +
        `Only simple intervals (* or */N) in all 5 fields are supported. ` +
        `For full cron support, use the 'node-cron' or 'cron' package.`
      );
    }
    // Compute the GCD-style interval. For simple cases:
    //   */N * * * *  → N minutes
    //   * */N * * *  → N hours (but only if minute is also *)
    // The minimum interval is 1 minute (60_000 ms).
    const minuteInterval = minute === "*" ? 1 : parseInt(minute.slice(2), 10);
    const hourInterval = hour === "*" ? 0 : parseInt(hour.slice(2), 10);
    if (minuteInterval < 1) {
      throw new Error(`[elmoorx/cron] Invalid minute interval in "${expr}"`);
    }
    // If hour has */N, the interval is N hours (assuming minute is */1 or *).
    // If both minute and hour have */N, take the larger (less frequent).
    const minuteMs = minuteInterval * 60 * 1000;
    const hourMs = hourInterval > 0 ? hourInterval * 60 * 60 * 1000 : 0;
    return Math.max(minuteMs, hourMs);
  }

  // One-time delayed job
  delay(name: string, delayMs: number, handler: () => void | Promise<void>): string {
    const id = "delay_" + Math.random().toString(36).slice(2, 9);
    setTimeout(handler, delayMs);
    return id;
  }
}

export const cron = new CronScheduler();

// Task Queue
export interface QueueTask<T = unknown> { id: string; data: T; attempts: number; maxAttempts: number; priority: number; }

class TaskQueue<T = unknown> {
  private tasks: QueueTask<T>[] = [];
  private processing = false;
  private handler: ((task: T) => Promise<void>) | null = null;

  enqueue(data: T, priority = 0, maxAttempts = 3): string {
    const id = "task_" + Math.random().toString(36).slice(2, 9);
    this.tasks.push({ id, data, attempts: 0, maxAttempts, priority });
    this.tasks.sort((a, b) => b.priority - a.priority);
    this.process();
    return id;
  }

  processWith(handler: (task: T) => Promise<void>): void {
    this.handler = handler;
    this.process();
  }

  private async process(): Promise<void> {
    if (this.processing || !this.handler) return;
    this.processing = true;
    while (this.tasks.length > 0) {
      const task = (this.tasks.shift() as NonNullable<ReturnType<typeof this.tasks.shift>>);
      try { await (this.handler as NonNullable<typeof this.handler>)(task.data); }
      catch (_err) {
        task.attempts++;
        if (task.attempts < task.maxAttempts) { this.tasks.push(task); this.tasks.sort((a, b) => b.priority - a.priority); }
      }
    }
    this.processing = false;
  }

  size(): number { return this.tasks.length; }
  clear(): void { this.tasks = []; }
}

export function createQueue<T = unknown>(): TaskQueue<T> { return new TaskQueue<T>(); }
