/**
 * @elmoorx/analytics — Component Analytics + Usage Stats
 * ============================================
 * Track how users interact with your components.
 *
 *   import { track, useAnalytics } from "@elmoorx/analytics";
 *   track("button_click", { id: "submit" });
 */

import { $state } from "@elmoorx/runtime";

export interface AnalyticsEvent {
  id: number;
  name: string;
  props?: Record<string, unknown>;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

class AnalyticsManager {
  private events = $state<AnalyticsEvent[]>([]);
  private eventCount = $state(0);
  private sessionId: string;
  private userId: string | undefined;
  private eventIdCounter = 0;

  constructor() {
    this.sessionId = "sess_" + Math.random().toString(36).slice(2, 9);
  }

  setUser(id: string) { this.userId = id; }

  track(name: string, props?: Record<string, unknown>): void {
    const event: AnalyticsEvent = {
      id: ++this.eventIdCounter,
      name,
      props,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };
    this.events.set([event, ...this.events()].slice(0, 1000));
    this.eventCount.set(this.eventCount() + 1);
  }

  getEvents() { return this.events; }
  getCount() { return this.eventCount; }

  getEventsByName(name: string): AnalyticsEvent[] {
    return this.events().filter(e => e.name === name);
  }

  getUniqueEventNames(): string[] {
    return [...new Set(this.events().map(e => e.name))];
  }

  getEventCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const e of this.events()) {
      counts[e.name] = (counts[e.name] || 0) + 1;
    }
    return counts;
  }

  clear(): void {
    this.events.set([]);
    this.eventCount.set(0);
  }

  export(): string {
    return JSON.stringify(this.events(), null, 2);
  }
}

export const analytics = new AnalyticsManager();

export function track(name: string, props?: Record<string, unknown>): void {
  analytics.track(name, props);
}

export function useAnalytics() {
  return {
    events: () => analytics.getEvents()(),
    count: () => analytics.getCount()(),
    eventNames: () => analytics.getUniqueEventNames(),
    counts: () => analytics.getEventCounts(),
    clear: () => analytics.clear(),
    export: () => analytics.export(),
  };
}
