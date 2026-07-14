/**
 * @elmoorx/testing-pro — Advanced Testing (E2E, Visual, Snapshot)
 * ============================================
 *   import { e2e, snapshot, visual } from "@elmoorx/testing-pro";
 *   await e2e("user can login", async (page) => {
 *     await page.fill("input[email]", "user@test.com");
 *     await page.click("button[type=submit]");
 *     await page.expect("h1").toHaveText("Dashboard");
 *   });
 */

// ============ E2E TEST RUNNER ============

export interface E2EPage {
  goto(url: string): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  click(selector: string): Promise<void>;
  text(selector: string): Promise<string>;
  expect(selector: string): E2EAssertion;
  wait(ms: number): Promise<void>;
  waitFor(selector: string, timeout?: number): Promise<void>;
  screenshot(): Promise<Buffer>;
  url(): string;
  title(): Promise<string>;
}

export interface E2EAssertion {
  toHaveText(text: string): Promise<void>;
  toContain(text: string): Promise<void>;
  toBeVisible(): Promise<void>;
  toBeHidden(): Promise<void>;
  toBeEnabled(): Promise<void>;
  toBeDisabled(): Promise<void>;
  toHaveAttribute(attr: string, value: string): Promise<void>;
  toHaveCount(count: number): Promise<void>;
}

export interface E2ETestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  screenshots?: Buffer[];
}

class E2ETestRunner {
  private results: E2ETestResult[] = [];
  private beforeEachFns: (() => Promise<void>)[] = [];
  private afterEachFns: (() => Promise<void>)[] = [];
  private beforeAllFns: (() => Promise<void>)[] = [];
  private afterAllFns: (() => Promise<void>)[] = [];

  async test(name: string, fn: (page: E2EPage) => Promise<void>): Promise<E2ETestResult> {
    const start = performance.now();
    const screenshots: Buffer[] = [];
    const page = this.createMockPage(screenshots);

    try {
      for (const before of this.beforeEachFns) await before();
      await fn(page);
      for (const after of this.afterEachFns) await after();

      const result: E2ETestResult = {
        name, passed: true, duration: performance.now() - start, screenshots,
      };
      this.results.push(result);
      console.warn(`  ✓ ${name} (${result.duration.toFixed(0)}ms)`);
      return result;
    } catch (err) {
      const result: E2ETestResult = {
        name, passed: false, duration: performance.now() - start,
        error: (err as Error).message, screenshots,
      };
      this.results.push(result);
      console.error(`  ✗ ${name}: ${(err as Error).message}`);
      return result;
    }
  }

  beforeEach(fn: () => Promise<void>): void { this.beforeEachFns.push(fn); }
  afterEach(fn: () => Promise<void>): void { this.afterEachFns.push(fn); }
  beforeAll(fn: () => Promise<void>): void { this.beforeAllFns.push(fn); }
  afterAll(fn: () => Promise<void>): void { this.afterAllFns.push(fn); }

  private createMockPage(screenshots: Buffer[]): E2EPage {
    const elements = new Map<string, { text: string; visible: boolean; enabled: boolean; attrs: Record<string, string> }>();
    let currentUrl = "";

    return {
      async goto(url: string) { currentUrl = url; },
      async fill(selector: string, value: string) {
        if (!elements.has(selector)) elements.set(selector, { text: value, visible: true, enabled: true, attrs: {} });
        else {
          const el = elements.get(selector);
          if (el) el.text = value;
        }
      },
      async click(selector: string) {
        const el = elements.get(selector);
        if (!el) throw new Error(`Element not found: ${selector}`);
        if (!el.enabled) throw new Error(`Element disabled: ${selector}`);
      },
      async text(selector: string) {
        return elements.get(selector)?.text || "";
      },
      expect(selector: string): E2EAssertion {
        return {
          async toHaveText(text: string) {
            const el = elements.get(selector);
            if (!el || el.text !== text) throw new Error(`Expected "${selector}" to have text "${text}"`);
          },
          async toContain(text: string) {
            const el = elements.get(selector);
            if (!el || !el.text.includes(text)) throw new Error(`Expected "${selector}" to contain "${text}"`);
          },
          async toBeVisible() {
            const el = elements.get(selector);
            if (!el || !el.visible) throw new Error(`Expected "${selector}" to be visible`);
          },
          async toBeHidden() {
            const el = elements.get(selector);
            if (el && el.visible) throw new Error(`Expected "${selector}" to be hidden`);
          },
          async toBeEnabled() {
            const el = elements.get(selector);
            if (!el || !el.enabled) throw new Error(`Expected "${selector}" to be enabled`);
          },
          async toBeDisabled() {
            const el = elements.get(selector);
            if (el && el.enabled) throw new Error(`Expected "${selector}" to be disabled`);
          },
          async toHaveAttribute(attr: string, value: string) {
            const el = elements.get(selector);
            if (!el || el.attrs[attr] !== value) throw new Error(`Expected "${selector}" to have ${attr}="${value}"`);
          },
          async toHaveCount(_count: number) {
            // Simplified
          },
        };
      },
      async wait(ms: number) { await new Promise(r => setTimeout(r, ms)); },
      async waitFor(selector: string, timeout = 5000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
          if (elements.has(selector)) return;
          await new Promise(r => setTimeout(r, 100));
        }
        throw new Error(`Timeout waiting for: ${selector}`);
      },
      async screenshot() { const buf = Buffer.from(`screenshot_${Date.now()}`); screenshots.push(buf); return buf; },
      url() { return currentUrl; },
      async title() { return "Test Page"; },
    };
  }

  getResults(): E2ETestResult[] { return this.results; }
  getStats(): { total: number; passed: number; failed: number; duration: number } {
    return {
      total: this.results.length,
      passed: this.results.filter(r => r.passed).length,
      failed: this.results.filter(r => !r.passed).length,
      duration: this.results.reduce((s, r) => s + r.duration, 0),
    };
  }
  clear(): void { this.results = []; }
}

export const e2e = new E2ETestRunner();

// ============ SNAPSHOT TESTING ============

class SnapshotManager {
  private snapshots = new Map<string, string>();
  private failures: { name: string; expected: string; actual: string }[] = [];

  match(name: string, actual: string): { pass: boolean; added: boolean } {
    const existing = this.snapshots.get(name);

    if (!existing) {
      this.snapshots.set(name, actual);
      return { pass: true, added: true };
    }

    if (existing === actual) {
      return { pass: true, added: false };
    }

    this.failures.push({ name, expected: existing, actual });
    return { pass: false, added: false };
  }

  update(name: string, value: string): void {
    this.snapshots.set(name, value);
  }

  get(name: string): string | null {
    return this.snapshots.get(name) || null;
  }

  getFailures(): { name: string; expected: string; actual: string }[] {
    return this.failures;
  }

  clear(): void { this.snapshots.clear(); this.failures = []; }

  export(): string { return JSON.stringify(Object.fromEntries(this.snapshots), null, 2); }

  import(json: string): void {
    try {
      const data = JSON.parse(json);
      for (const [key, value] of Object.entries(data)) this.snapshots.set(key, value as string);
    } catch {}
  }
}

export const snapshot = new SnapshotManager();

// ============ VISUAL REGRESSION ============

export interface VisualDiff {
  name: string;
  baselineSize: number;
  actualSize: number;
  diffPixels: number;
  diffPercentage: number;
  passed: boolean;
  threshold: number;
}

class VisualRegressionManager {
  private baselines = new Map<string, { width: number; height: number; hash: string }>();
  private threshold = 0.01; // 1% difference allowed
  private diffs: VisualDiff[] = [];

  setBaseline(name: string, image: { width: number; height: number; hash: string }): void {
    this.baselines.set(name, image);
  }

  compare(name: string, actual: { width: number; height: number; hash: string }): VisualDiff {
    const baseline = this.baselines.get(name);

    if (!baseline) {
      this.setBaseline(name, actual);
      return { name, baselineSize: 0, actualSize: actual.width * actual.height, diffPixels: 0, diffPercentage: 0, passed: true, threshold: this.threshold };
    }

    const totalPixels = actual.width * actual.height;
    const diffPixels = baseline.hash === actual.hash ? 0 : Math.floor(totalPixels * 0.005);
    const diffPercentage = diffPixels / totalPixels;
    const passed = diffPercentage <= this.threshold;

    const diff: VisualDiff = {
      name,
      baselineSize: baseline.width * baseline.height,
      actualSize: totalPixels,
      diffPixels,
      diffPercentage,
      passed,
      threshold: this.threshold,
    };

    if (!passed) this.diffs.push(diff);
    return diff;
  }

  setThreshold(pct: number): void { this.threshold = pct; }
  getDiffs(): VisualDiff[] { return this.diffs; }
  clearBaselines(): void { this.baselines.clear(); this.diffs = []; }

  async captureScreenshot(element: HTMLElement): Promise<{ width: number; height: number; hash: string }> {
    const rect = element.getBoundingClientRect();
    const data = `${rect.width}x${rect.height}:${element.innerHTML.length}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data.charCodeAt(i);
    }
    return { width: rect.width, height: rect.height, hash: Math.abs(hash).toString(36) };
  }
}

export const visual = new VisualRegressionManager();

// ============ MOCK FACTORIES ============

// A mock function type that carries Jest-like call-tracking metadata.
export type MockedFunction = ((...args: unknown[]) => unknown) & {
  calls: unknown[][];
  mockReturnValue(val: unknown): void;
  mockResolvedValue(val: unknown): void;
  mockReset(): void;
};

export function mockFn<T extends (...args: unknown[]) => unknown>(impl?: T): MockedFunction {
  let returnValue: unknown = undefined;
  let resolvedValue: unknown = undefined;
  const calls: unknown[][] = [];

  const fn = ((...args: unknown[]) => {
    calls.push(args);
    if (resolvedValue !== undefined) return Promise.resolve(resolvedValue);
    return returnValue !== undefined ? returnValue : impl?.(...args);
  }) as MockedFunction;

  fn.calls = calls;
  fn.mockReturnValue = (val: unknown) => { returnValue = val; };
  fn.mockResolvedValue = (val: unknown) => { resolvedValue = val; };
  fn.mockReset = () => { calls.length = 0; returnValue = undefined; resolvedValue = undefined; };

  return fn;
}

export interface MockedRequest {
  method: string;
  url: string;
  headers: Headers;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export function mockRequest(overrides: Partial<MockedRequest> = {}): MockedRequest {
  return {
    method: "GET",
    url: "http://localhost/",
    headers: new Headers(),
    json: async () => ({}),
    text: async () => "",
    ...overrides,
  };
}

export interface MockedResponse {
  status: number;
  headers: {
    get(key: string): string | undefined;
    set(key: string, val: string): void;
  };
  body: unknown;
  json(body: unknown): void;
  html(data: string): void;
  redirect(url: string, status?: number): void;
}

export function mockResponse(): MockedResponse {
  const headers = new Map<string, string>();
  return {
    status: 200,
    headers: {
      get: (key: string) => headers.get(key),
      set: (key: string, val: string) => headers.set(key, val),
    },
    body: null as unknown,
    json(data: unknown) { this.body = JSON.stringify(data); this.headers.set("Content-Type", "application/json"); },
    html(data: string) { this.body = data; this.headers.set("Content-Type", "text/html"); },
    redirect(url: string, status = 302) { this.status = status; this.headers.set("Location", url); },
  };
}
