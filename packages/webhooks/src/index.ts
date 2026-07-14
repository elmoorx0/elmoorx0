/**
 * @elmoorx/webhooks — Outbound webhook dispatcher with signing + retries
 * ============================================
 *
 *   import { WebhookDispatcher } from "@elmoorx/webhooks";
 *
 *   const wh = new WebhookDispatcher({ secret: 'whsec_...' });
 *   await wh.send('https://example.com/hook', 'invoice.paid', { id: 'in_123' });
 */

import { createHmac, timingSafeEqual as nodeTSEqual } from "node:crypto";

export interface DispatcherOptions {
  /** HMAC secret used to sign payloads (HMAC-SHA256). */
  secret: string;
  /** Max retry attempts (default: 5). */
  maxRetries?: number;
  /** Base backoff in ms (default: 1000). */
  backoffMs?: number;
  /** Optional fetch override (for testing). */
  fetchImpl?: typeof fetch;
  /** Default timeout per request in ms (default: 10_000). */
  timeoutMs?: number;
}

export interface SendOptions {
  /** Additional headers to attach. */
  headers?: Record<string, string>;
  /** Override per-call timeout. */
  timeoutMs?: number;
}

export interface WebhookResult {
  ok: boolean;
  status: number;
  attempt: number;
  body?: string;
}

export class WebhookDispatcher {
  private opts: Required<Omit<DispatcherOptions, "fetchImpl">> & {
    fetchImpl: typeof fetch;
  };

  constructor(opts: DispatcherOptions) {
    this.opts = {
      maxRetries: opts.maxRetries ?? 5,
      backoffMs: opts.backoffMs ?? 1000,
      timeoutMs: opts.timeoutMs ?? 10_000,
      fetchImpl: opts.fetchImpl ?? fetch,
      secret: opts.secret,
    };
  }

  /** Compute the HMAC-SHA256 signature for a payload. */
  sign(payload: string, timestamp: number): string {
    return createHmac("sha256", this.opts.secret)
      .update(`${timestamp}.${payload}`)
      .digest("hex");
  }

  /** Verify an inbound webhook signature (constant-time). */
  verify(payload: string, timestamp: number, signature: string): boolean {
    const expected = this.sign(payload, timestamp);
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return nodeTSEqual(a, b);
  }

  async send(
    url: string,
    eventType: string,
    payload: unknown,
    options: SendOptions = {}
  ): Promise<WebhookResult> {
    const body = JSON.stringify(payload);
    const ts = Date.now();
    const sig = this.sign(body, ts);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Elmoorx-Event": eventType,
      "X-Elmoorx-Timestamp": String(ts),
      "X-Elmoorx-Signature": sig,
      ...options.headers,
    };

    let lastErr: Error | null = null;
    for (let attempt = 1; attempt <= this.opts.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(
          () => controller.abort(),
          options.timeoutMs ?? this.opts.timeoutMs
        );
        try {
          const res = await this.opts.fetchImpl(url, {
            method: "POST",
            headers,
            body,
            signal: controller.signal,
          });
          if (res.status >= 200 && res.status < 300) {
            const text = await res.text().catch(() => "");
            return { ok: true, status: res.status, attempt, body: text };
          }
          // 4xx — don't retry, the webhook will never accept it
          if (res.status >= 400 && res.status < 500) {
            const text = await res.text().catch(() => "");
            return { ok: false, status: res.status, attempt, body: text };
          }
          lastErr = new Error(`HTTP ${res.status}`);
        } finally {
          clearTimeout(timer);
        }
      } catch (err) {
        lastErr = err as Error;
      }
      // Exponential backoff with jitter
      const delay = this.opts.backoffMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delay + Math.random() * 250));
    }
    return {
      ok: false,
      status: 0,
      attempt: this.opts.maxRetries,
      body: lastErr?.message,
    };
  }
}

export const VERSION = "3.0.0-alpha.2";
