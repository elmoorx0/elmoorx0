/**
 * @elmoorx/push — Push Notifications
 * Web Push API + Service Worker integration
 */

export interface PushSubscription { endpoint: string; keys: { p256dh: string; auth: string }; }
export interface PushMessage { title: string; body?: string; icon?: string; badge?: string; data?: unknown; tag?: string; actions?: { action: string; title: string }[]; }

class PushManager_ {
  private subscription: PushSubscription | null = null;
  private permission: NotificationPermission = "default";

  async requestPermission(): Promise<boolean> {
    if (!("Notification" in window)) return false;
    this.permission = await Notification.requestPermission();
    return this.permission === "granted";
  }

  hasPermission(): boolean { return Notification.permission === "granted"; }

  async subscribe(): Promise<PushSubscription | null> {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true });
      this.subscription = { endpoint: sub.endpoint, keys: { p256dh: "", auth: "" } };
      return this.subscription;
    } catch { return null; }
  }

  unsubscribe(): void { this.subscription = null; }

  async send(message: PushMessage): Promise<void> {
    if (!this.hasPermission()) { await this.requestPermission(); }
    if (this.hasPermission()) {
      new Notification(message.title, { body: message.body, icon: message.icon, tag: message.tag, data: message.data });
    }
  }

  async sendBatch(messages: PushMessage[]): Promise<void> {
    for (const msg of messages) { await this.send(msg); await new Promise(r => setTimeout(r, 100)); }
  }

  isSupported(): boolean {
    return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
  }

  getPermission(): NotificationPermission { return Notification.permission; }
}

export const push = new PushManager_();
