/**
 * @elmoorx/health — Health Checks + Status Pages
 */
export interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  latency: number;
  message?: string;
  details?: Record<string, unknown>;
}

export interface HealthReport {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  timestamp: number;
  checks: HealthCheck[];
  version: string;
}

class HealthManager {
  private checks = new Map<string, () => Promise<{ status: HealthCheck["status"]; message?: string; details?: Record<string, unknown> }>>();
  private startTime = Date.now();
  private version = "3.0.0-alpha.2";

  register(name: string, check: () => Promise<{ status: HealthCheck["status"]; message?: string; details?: Record<string, unknown> }>): void {
    this.checks.set(name, check);
  }

  async runCheck(name: string): Promise<HealthCheck> {
    const check = this.checks.get(name);
    if (!check) return { name, status: "unhealthy", latency: 0, message: "Check not found" };

    const start = performance.now();
    try {
      const result = await check();
      return { name, ...result, latency: performance.now() - start };
    } catch (err) {
      return { name, status: "unhealthy", latency: performance.now() - start, message: (err as Error).message };
    }
  }

  async runAll(): Promise<HealthReport> {
    const checks: HealthCheck[] = [];
    for (const [name] of this.checks) {
      checks.push(await this.runCheck(name));
    }

    const hasUnhealthy = checks.some(c => c.status === "unhealthy");
    const hasDegraded = checks.some(c => c.status === "degraded");
    const status: HealthReport["status"] = hasUnhealthy ? "unhealthy" : hasDegraded ? "degraded" : "healthy";

    return { status, uptime: Date.now() - this.startTime, timestamp: Date.now(), checks, version: this.version };
  }

  setVersion(v: string): void { this.version = v; }
  getUptime(): number { return Date.now() - this.startTime; }
  getCheckNames(): string[] { return [...this.checks.keys()]; }
}

export const health = new HealthManager();

// Built-in checks
health.register("memory", async () => {
  if (typeof process !== "undefined" && process.memoryUsage) {
    const mem = process.memoryUsage();
    const usedMB = mem.rss / 1048576;
    return { status: usedMB < 500 ? "healthy" : usedMB < 1000 ? "degraded" : "unhealthy", details: { usedMB: Math.round(usedMB) } };
  }
  return { status: "healthy" };
});

health.register("uptime", async () => {
  const uptime = health.getUptime();
  return { status: uptime > 0 ? "healthy" : "unhealthy", details: { uptimeSeconds: Math.round(uptime / 1000) } };
});
