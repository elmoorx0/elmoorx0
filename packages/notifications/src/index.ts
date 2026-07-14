/**
 * @elmoorx/notifications — Multi-Channel Notifications
 * ============================================
 * Send via email, SMS, push, in-app, webhook — one API.
 *
 *   import { notify } from "@elmoorx/notifications";
 *   await notify.send({ to: "user@example.com", channel: "email", subject: "Hi", body: "Hello" });
 *   await notify.broadcast({ channel: "push", title: "Update", body: "New version!" });
 */

export type NotificationChannel = "email" | "sms" | "push" | "in_app" | "webhook" | "slack";

export interface NotificationPayload {
  to?: string | string[];
  channel: NotificationChannel;
  title?: string;
  subject?: string;
  body: string;
  data?: Record<string, unknown>;
  scheduledAt?: Date;
  priority?: "low" | "normal" | "high" | "urgent";
  template?: string;
  templateData?: Record<string, unknown>;
}

export interface NotificationResult {
  id: string;
  channel: NotificationChannel;
  recipients: number;
  status: "sent" | "failed" | "queued" | "delivered";
  sentAt: number;
  error?: string;
}

export interface NotificationTemplate {
  name: string;
  channel: NotificationChannel;
  render: (data: Record<string, unknown>) => { subject?: string; body: string };
}

class NotificationManager {
  private history: NotificationResult[] = [];
  private templates = new Map<string, NotificationTemplate>();
  private providers = new Map<NotificationChannel, (payload: NotificationPayload) => Promise<void>>();
  private preferences = new Map<string, Set<NotificationChannel>>();
  private rateLimits = new Map<string, { count: number; resetAt: number }>();

  registerProvider(channel: NotificationChannel, handler: (payload: NotificationPayload) => Promise<void>): void {
    this.providers.set(channel, handler);
  }

  registerTemplate(template: NotificationTemplate): void {
    this.templates.set(template.name, template);
  }

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    // Check rate limit
    const rateKey = `${payload.channel}:${payload.to}`;
    if (this.isRateLimited(rateKey)) {
      return { id: "rate_limited", channel: payload.channel, recipients: 0, status: "queued", sentAt: Date.now(), error: "Rate limited" };
    }

    // Use template if specified
    if (payload.template) {
      const template = this.templates.get(payload.template);
      if (template) {
        const rendered = template.render(payload.templateData || {});
        payload.subject = rendered.subject || payload.subject;
        payload.body = rendered.body;
      }
    }

    // Check user preferences
    if (payload.to && typeof payload.to === "string") {
      const userPrefs = this.preferences.get(payload.to);
      if (userPrefs && !userPrefs.has(payload.channel)) {
        return { id: "disabled", channel: payload.channel, recipients: 0, status: "failed", sentAt: Date.now(), error: "Channel disabled by user" };
      }
    }

    const provider = this.providers.get(payload.channel);
    const recipients = Array.isArray(payload.to) ? payload.to.length : 1;

    if (payload.scheduledAt && payload.scheduledAt > new Date()) {
      const result: NotificationResult = { id: "notif_" + Date.now(), channel: payload.channel, recipients, status: "queued", sentAt: Date.now() };
      this.history.push(result);
      return result;
    }

    try {
      if (provider) await provider(payload);
      else console.warn(`[notifications] Sending via ${payload.channel}: ${payload.body}`);

      const result: NotificationResult = {
        id: "notif_" + Math.random().toString(36).slice(2, 11),
        channel: payload.channel,
        recipients,
        status: "sent",
        sentAt: Date.now(),
      };
      this.history.push(result);
      this.recordRateLimit(rateKey);
      return result;
    } catch (err) {
      const result: NotificationResult = {
        id: "notif_" + Math.random().toString(36).slice(2, 11),
        channel: payload.channel,
        recipients: 0,
        status: "failed",
        sentAt: Date.now(),
        error: (err as Error).message,
      };
      this.history.push(result);
      return result;
    }
  }

  async broadcast(payload: Omit<NotificationPayload, "to">): Promise<NotificationResult> {
    return this.send({ ...payload, to: "all" } as NotificationPayload);
  }

  async sendMulti(payloads: NotificationPayload[]): Promise<NotificationResult[]> {
    return Promise.all(payloads.map(p => this.send(p)));
  }

  setUserPreference(userId: string, channels: NotificationChannel[]): void {
    this.preferences.set(userId, new Set(channels));
  }

  getUserPreference(userId: string): NotificationChannel[] | null {
    const prefs = this.preferences.get(userId);
    return prefs ? [...prefs] : null;
  }

  private isRateLimited(key: string): boolean {
    const limit = this.rateLimits.get(key);
    if (!limit) return false;
    if (Date.now() > limit.resetAt) { this.rateLimits.delete(key); return false; }
    return limit.count >= 10; // 10 per minute
  }

  private recordRateLimit(key: string): void {
    const limit = this.rateLimits.get(key) || { count: 0, resetAt: Date.now() + 60000 };
    limit.count++;
    this.rateLimits.set(key, limit);
  }

  getHistory(): NotificationResult[] { return this.history; }
  getHistoryByChannel(channel: NotificationChannel): NotificationResult[] {
    return this.history.filter(h => h.channel === channel);
  }
  getStats(): { total: number; sent: number; failed: number; queued: number } {
    return {
      total: this.history.length,
      sent: this.history.filter(h => h.status === "sent").length,
      failed: this.history.filter(h => h.status === "failed").length,
      queued: this.history.filter(h => h.status === "queued").length,
    };
  }
  clear(): void { this.history = []; this.rateLimits.clear(); }
}

export const notify = new NotificationManager();

// ============ TEMPLATES ============

export const notificationTemplates = {
  welcome: {
    name: "welcome",
    channel: "email" as NotificationChannel,
    render: (data: Record<string, unknown>) => ({
      subject: `Welcome, ${data.name}!`,
      body: `Hi ${data.name}, welcome to ${data.app || "our app"}!`,
    }),
  },
  passwordReset: {
    name: "password-reset",
    channel: "email" as NotificationChannel,
    render: (data: Record<string, unknown>) => ({
      subject: "Reset your password",
      body: `Click here to reset: ${data.url}`,
    }),
  },
  orderConfirmation: {
    name: "order-confirmation",
    channel: "email" as NotificationChannel,
    render: (data: Record<string, unknown>) => ({
      subject: `Order #${data.orderId} confirmed`,
      body: `Your order for $${data.total} has been confirmed.`,
    }),
  },
  appointmentReminder: {
    name: "appointment-reminder",
    channel: "sms" as NotificationChannel,
    render: (data: Record<string, unknown>) => ({
      body: `Reminder: ${data.type} appointment on ${data.date} at ${data.time}`,
    }),
  },
};
