/**
 * @elmoorx/webhook-system — Outgoing Webhook System
 * ============================================
 * Send webhooks to external services when events occur.
 *
 *   import { WebhookManager } from "@elmoorx/webhook-system";
 *   const webhooks = new WebhookManager();
 *   webhooks.register("https://api.example.com/hook", "orders.created");
 *   await webhooks.trigger("orders.created", { orderId: "123" });
 */

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  createdAt: number;
  lastTriggered?: number;
  lastStatus?: number;
  failureCount: number;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  event: string;
  payload: unknown;
  timestamp: number;
  status: "pending" | "delivered" | "failed";
  attempts: number;
  responseStatus?: number;
  responseBody?: string;
  error?: string;
}

class WebhookManager {
  private endpoints: WebhookEndpoint[] = [];
  private deliveries: WebhookDelivery[] = [];
  private maxRetries = 3;
  private retryDelay = 1000;

  register(url: string, events: string[], opts: { secret?: string } = {}): WebhookEndpoint {
    const endpoint: WebhookEndpoint = {
      id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      url,
      events,
      secret: opts.secret || this.generateSecret(),
      active: true,
      createdAt: Date.now(),
      failureCount: 0,
    };
    this.endpoints.push(endpoint);
    console.log(`  🔗 Webhook registered: ${url} for [${events.join(", ")}]`);
    return endpoint;
  }

  unregister(id: string): boolean {
    const idx = this.endpoints.findIndex(e => e.id === id);
    if (idx === -1) return false;
    this.endpoints.splice(idx, 1);
    return true;
  }

  async trigger(event: string, payload: unknown): Promise<WebhookDelivery[]> {
    const matching = this.endpoints.filter(
      e => e.active && (e.events.includes(event) || e.events.includes("*"))
    );

    if (matching.length === 0) return [];

    const deliveries: WebhookDelivery[] = [];

    for (const endpoint of matching) {
      const delivery: WebhookDelivery = {
        id: `del_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        endpointId: endpoint.id,
        event,
        payload,
        timestamp: Date.now(),
        status: "pending",
        attempts: 0,
      };

      await this.deliver(endpoint, delivery);
      deliveries.push(delivery);
      this.deliveries.unshift(delivery);

      // Keep only last 1000 deliveries
      if (this.deliveries.length > 1000) this.deliveries = this.deliveries.slice(0, 1000);
    }

    return deliveries;
  }

  private async deliver(endpoint: WebhookEndpoint, delivery: WebhookDelivery): Promise<void> {
    const body = JSON.stringify({
      event: delivery.event,
      payload: delivery.payload,
      timestamp: delivery.timestamp,
    });

    const signature = this.sign(body, endpoint.secret);

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      delivery.attempts = attempt;

      try {
        const res = await fetch(endpoint.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Elmoorx-Event": delivery.event,
            "X-Elmoorx-Signature": signature,
            "X-Elmoorx-Delivery": delivery.id,
          },
          body,
          signal: AbortSignal.timeout(10000),
        });

        delivery.responseStatus = res.status;
        delivery.responseBody = await res.text().catch(() => "");

        if (res.ok) {
          delivery.status = "delivered";
          endpoint.lastTriggered = Date.now();
          endpoint.lastStatus = res.status;
          endpoint.failureCount = 0;
          console.log(`  ✓ Webhook delivered: ${endpoint.url} → ${res.status}`);
          return;
        }

        // Non-2xx response — retry
        console.warn(`  ⚠ Webhook ${endpoint.url} returned ${res.status} (attempt ${attempt})`);
      } catch (err) {
        delivery.error = (err as Error).message;
        console.warn(`  ⚠ Webhook ${endpoint.url} failed: ${delivery.error} (attempt ${attempt})`);
      }

      if (attempt < this.maxRetries) {
        await new Promise(r => setTimeout(r, this.retryDelay * attempt));
      }
    }

    delivery.status = "failed";
    endpoint.failureCount++;
    endpoint.lastStatus = delivery.responseStatus || 0;

    // Auto-disable after 10 consecutive failures
    if (endpoint.failureCount >= 10) {
      endpoint.active = false;
      console.error(`  ✗ Webhook auto-disabled after 10 failures: ${endpoint.url}`);
    }
  }

  private sign(body: string, secret: string): string {
    const { createHmac } = require("node:crypto");
    return createHmac("sha256", secret).update(body).digest("hex");
  }

  private generateSecret(): string {
    const { randomBytes } = require("node:crypto");
    return randomBytes(24).toString("hex");
  }

  listEndpoints(): WebhookEndpoint[] { return [...this.endpoints]; }
  getDeliveries(opts: { endpointId?: string; status?: string; limit?: number } = {}): WebhookDelivery[] {
    let result = [...this.deliveries];
    if (opts.endpointId) result = result.filter(d => d.endpointId === opts.endpointId);
    if (opts.status) result = result.filter(d => d.status === opts.status);
    return result.slice(0, opts.limit || 50);
  }

  // Redeliver a failed delivery
  async redeliver(deliveryId: string): Promise<boolean> {
    const delivery = this.deliveries.find(d => d.id === deliveryId);
    if (!delivery) return false;
    const endpoint = this.endpoints.find(e => e.id === delivery.endpointId);
    if (!endpoint) return false;

    delivery.status = "pending";
    delivery.attempts = 0;
    await this.deliver(endpoint, delivery);
    return true;
  }

  getStats(): { totalEndpoints: number; activeEndpoints: number; totalDeliveries: number; delivered: number; failed: number } {
    return {
      totalEndpoints: this.endpoints.length,
      activeEndpoints: this.endpoints.filter(e => e.active).length,
      totalDeliveries: this.deliveries.length,
      delivered: this.deliveries.filter(d => d.status === "delivered").length,
      failed: this.deliveries.filter(d => d.status === "failed").length,
    };
  }
}

export const webhooks = new WebhookManager();
