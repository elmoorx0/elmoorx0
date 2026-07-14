/**
 * @elmoorx/queue — Message Queue (BullMQ-like)
 * ============================================
 * Reliable job processing with retries, delays, priorities, and scheduling.
 *
 *   import { createQueue } from "@elmoorx/queue";
 *   const queue = createQueue("emails");
 *   queue.process(async (job) => { await sendEmail(job.data); });
 *   await queue.add({ to: "user@example.com", subject: "Hi" });
 */

export interface Job<T = unknown> {
  id: string;
  data: T;
  priority: number;
  attempts: number;
  maxAttempts: number;
  delay: number;
  scheduledAt: number;
  status: "waiting" | "active" | "completed" | "failed" | "delayed";
  result?: unknown;
  error?: string;
  createdAt: number;
  processedAt?: number;
  completedAt?: number;
  progress?: number;
  logs: string[];
}

export interface QueueOptions {
  maxAttempts?: number;
  concurrency?: number;
  defaultPriority?: number;
}

export type JobHandler<T = unknown> = (job: Job<T>, updateProgress: (pct: number) => void) => Promise<void>;

class MessageQueue<T = unknown> {
  private jobs: Job<T>[] = [];
  private handler: JobHandler<T> | null = null;
  private processing = false;
  private concurrency: number;
  private activeCount = 0;
  private maxAttempts: number;
  private defaultPriority: number;
  private listeners = new Set<(job: Job<T>) => void>();
  private completedCount = 0;
  private failedCount = 0;

  constructor(private name: string, opts: QueueOptions = {}) {
    this.concurrency = opts.concurrency || 1;
    this.maxAttempts = opts.maxAttempts || 3;
    this.defaultPriority = opts.defaultPriority || 0;
  }

  add(data: T, opts: { priority?: number; delay?: number; maxAttempts?: number } = {}): string {
    const job: Job<T> = {
      id: "job_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      data,
      priority: opts.priority ?? this.defaultPriority,
      attempts: 0,
      maxAttempts: opts.maxAttempts ?? this.maxAttempts,
      delay: opts.delay || 0,
      scheduledAt: Date.now() + (opts.delay || 0),
      status: opts.delay ? "delayed" : "waiting",
      createdAt: Date.now(),
      logs: [],
    };
    this.jobs.push(job);
    this.jobs.sort((a, b) => b.priority - a.priority);
    this.tick();
    return job.id;
  }

  process(handler: JobHandler<T>): void {
    this.handler = handler;
    this.tick();
  }

  private async tick(): Promise<void> {
    if (this.processing || !this.handler) return;
    this.processing = true;

    while (this.activeCount < this.concurrency) {
      const job = this.jobs.find(j => j.status === "waiting" || (j.status === "delayed" && j.scheduledAt <= Date.now()));
      if (!job) break;

      job.status = "active";
      job.attempts++;
      job.processedAt = Date.now();
      this.activeCount++;

      try {
        await this.handler(job, (pct: number) => { job.progress = pct; });
        job.status = "completed";
        job.completedAt = Date.now();
        this.completedCount++;
      } catch (err) {
        job.error = (err as Error).message;
        if (job.attempts < job.maxAttempts) {
          job.status = "waiting";
          job.logs.push(`Retry ${job.attempts}/${job.maxAttempts}: ${job.error}`);
        } else {
          job.status = "failed";
          job.completedAt = Date.now();
          this.failedCount++;
        }
      }

      this.activeCount--;
      this.listeners.forEach(l => l(job));
    }

    this.processing = false;

    // Check if there are more jobs to process
    if (this.jobs.some(j => j.status === "waiting" || (j.status === "delayed" && j.scheduledAt <= Date.now()))) {
      setTimeout(() => this.tick(), 100);
    }
  }

  getJob(id: string): Job<T> | undefined { return this.jobs.find(j => j.id === id); }
  getJobs(status?: Job["status"]): Job<T>[] {
    return status ? this.jobs.filter(j => j.status === status) : this.jobs;
  }
  getWaiting(): Job<T>[] { return this.jobs.filter(j => j.status === "waiting"); }
  getActive(): Job<T>[] { return this.jobs.filter(j => j.status === "active"); }
  getCompleted(): Job<T>[] { return this.jobs.filter(j => j.status === "completed"); }
  getFailed(): Job<T>[] { return this.jobs.filter(j => j.status === "failed"); }

  onComplete(listener: (job: Job<T>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clearCompleted(): void { this.jobs = this.jobs.filter(j => j.status !== "completed"); }
  clearFailed(): void { this.jobs = this.jobs.filter(j => j.status !== "failed"); }
  clearAll(): void { this.jobs = []; this.completedCount = 0; this.failedCount = 0; }

  getStats(): { total: number; waiting: number; active: number; completed: number; failed: number; delayed: number } {
    return {
      total: this.jobs.length,
      waiting: this.jobs.filter(j => j.status === "waiting").length,
      active: this.jobs.filter(j => j.status === "active").length,
      completed: this.completedCount,
      failed: this.failedCount,
      delayed: this.jobs.filter(j => j.status === "delayed").length,
    };
  }

  pause(): void { this.concurrency = 0; this.tick(); }
  resume(): void { this.concurrency = 1; this.tick(); }

  getName(): string { return this.name; }
  size(): number { return this.jobs.length; }
}

export function createQueue<T = unknown>(name: string, opts?: QueueOptions): MessageQueue<T> {
  return new MessageQueue<T>(name, opts);
}

// ============ RATE LIMITER ============

export class RateLimiter {
  private requests = new Map<string, number[]>();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    const valid = requests.filter(t => now - t < this.windowMs);

    if (valid.length >= this.maxRequests) {
      return { allowed: false, remaining: 0, resetAt: valid[0] + this.windowMs };
    }

    valid.push(now);
    this.requests.set(key, valid);
    return { allowed: true, remaining: this.maxRequests - valid.length, resetAt: now + this.windowMs };
  }

  reset(key?: string): void {
    if (key) this.requests.delete(key);
    else this.requests.clear();
  }
}

// ============ CIRCUIT BREAKER ============

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = "half-open";
      } else {
        throw new Error("Circuit breaker is open");
      }
    }

    try {
      const result = await fn();
      if (this.state === "half-open") {
        this.state = "closed";
        this.failures = 0;
      }
      return result;
    } catch (err) {
      this.failures++;
      this.lastFailureTime = Date.now();
      if (this.failures >= this.threshold) this.state = "open";
      throw err;
    }
  }

  getState(): "closed" | "open" | "half-open" { return this.state; }
  reset(): void { this.state = "closed"; this.failures = 0; }
}
