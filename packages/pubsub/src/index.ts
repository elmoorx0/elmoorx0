/**
 * @elmoorx/pubsub — Pub/Sub Event System
 * ============================================
 * Decoupled event-driven communication.
 *
 *   import { pubsub } from "@elmoorx/pubsub";
 *   const unsub = pubsub.subscribe("user:login", (user) => { ... });
 *   pubsub.publish("user:login", { name: "Amir" });
 *   unsub();
 */

export type EventHandler<T = unknown> = (data: T) => void | Promise<void>;

export interface EventSubscription { unsubscribe: () => void; }

class PubSubManager {
  private channels = new Map<string, Set<EventHandler>>();
  private wildcardHandlers = new Set<(channel: string, data: unknown) => void>();
  private history: { channel: string; data: unknown; timestamp: number }[] = [];
  private maxHistory = 100;

  subscribe<T = unknown>(channel: string, handler: EventHandler<T>): EventSubscription {
    if (!this.channels.has(channel)) this.channels.set(channel, new Set());
    (this.channels.get(channel) as NonNullable<ReturnType<typeof this.channels.get>>).add(handler as EventHandler);
    return { unsubscribe: () => this.channels.get(channel)?.delete(handler as EventHandler) };
  }

  subscribeAll(handler: (channel: string, data: unknown) => void): EventSubscription {
    this.wildcardHandlers.add(handler);
    return { unsubscribe: () => this.wildcardHandlers.delete(handler) };
  }

  async publish<T = unknown>(channel: string, data: T): Promise<void> {
    this.history.push({ channel, data, timestamp: Date.now() });
    if (this.history.length > this.maxHistory) this.history.shift();

    const handlers = this.channels.get(channel);
    if (handlers) {
      await Promise.all([...handlers].map(h => Promise.resolve(h(data))));
    }

    for (const wh of this.wildcardHandlers) wh(channel, data);
  }

  publishSync<T = unknown>(channel: string, data: T): void {
    this.history.push({ channel, data, timestamp: Date.now() });
    if (this.history.length > this.maxHistory) this.history.shift();

    const handlers = this.channels.get(channel);
    if (handlers) for (const h of handlers) h(data);
    for (const wh of this.wildcardHandlers) wh(channel, data);
  }

  once<T = unknown>(channel: string, handler: EventHandler<T>): EventSubscription {
    const sub = this.subscribe<T>(channel, (data) => {
      handler(data);
      sub.unsubscribe();
    });
    return sub;
  }

  waitFor<T = unknown>(channel: string, timeout = 5000): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { sub.unsubscribe(); reject(new Error("Timeout")); }, timeout);
      const sub = this.subscribe<T>(channel, (data) => {
        clearTimeout(timer);
        sub.unsubscribe();
        resolve(data);
      });
    });
  }

  channelExists(channel: string): boolean { return this.channels.has(channel); }
  getChannels(): string[] { return [...this.channels.keys()]; }
  getSubscriberCount(channel: string): number { return this.channels.get(channel)?.size || 0; }
  getHistory(channel?: string): { channel: string; data: unknown; timestamp: number }[] {
    return channel ? this.history.filter(h => h.channel === channel) : this.history;
  }
  clear(): void { this.channels.clear(); this.wildcardHandlers.clear(); this.history = []; }
}

export const pubsub = new PubSubManager();

// Typed channels
export function createChannel<T>(name: string) {
  return {
    name,
    subscribe: (handler: EventHandler<T>) => pubsub.subscribe<T>(name, handler),
    publish: (data: T) => pubsub.publish<T>(name, data),
    publishSync: (data: T) => pubsub.publishSync<T>(name, data),
    once: (handler: EventHandler<T>) => pubsub.once<T>(name, handler),
    waitFor: (timeout?: number) => pubsub.waitFor<T>(name, timeout),
    subscriberCount: () => pubsub.getSubscriberCount(name),
  };
}
