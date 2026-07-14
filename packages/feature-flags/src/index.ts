/**
 * @elmoorx/feature-flags — Feature flags: gradual rollout, A/B testing, user targeting
 * ============================================
 * Lightweight in-memory feature-flag engine with persistence hooks.
 *
 *   import { flagManager, defineFlag, isEnabled, roll } from "@elmoorx/feature-flags";
 *
 *   defineFlag('new-dashboard', { enabled: true, rollout: 0.25 });
 *   if (isEnabled('new-dashboard', { userId: 'u-42' })) { ... }
 *
 *   // A/B test
 *   const variant = roll('checkout-flow', { userId: 'u-42' }, ['control', 'v1']);
 */

export interface FlagDefinition {
  enabled: boolean;
  /** 0..1 — fraction of users who see the flag (deterministic by key) */
  rollout?: number;
  /** user IDs that always see the flag, regardless of rollout */
  allowList?: string[];
  /** user IDs that never see the flag */
  denyList?: string[];
  /** metadata — description, owner, expiry, etc. */
  meta?: Record<string, unknown>;
}

export interface EvaluationContext {
  userId?: string;
  // arbitrary attributes used for targeting rules
  [k: string]: unknown;
}

class FlagManager {
  private flags = new Map<string, FlagDefinition>();
  private listeners = new Set<(name: string, def: FlagDefinition) => void>();

  define(name: string, def: FlagDefinition): void {
    this.flags.set(name, def);
    this.listeners.forEach((fn) => fn(name, def));
  }

  get(name: string): FlagDefinition | undefined {
    return this.flags.get(name);
  }

  all(): Record<string, FlagDefinition> {
    return Object.fromEntries(this.flags);
  }

  remove(name: string): boolean {
    return this.flags.delete(name);
  }

  isEnabled(name: string, ctx: EvaluationContext = {}): boolean {
    const def = this.flags.get(name);
    if (!def) return false;
    if (!def.enabled) return false;

    const uid = ctx.userId;
    if (uid) {
      if (def.denyList?.includes(uid)) return false;
      if (def.allowList?.includes(uid)) return true;
    }

    if (def.rollout === undefined || def.rollout >= 1) return true;
    if (def.rollout <= 0) return false;
    // Deterministic hash so the same user always gets the same answer
    const key = uid ?? String(ctx.sessionId ?? ctx.ip ?? Math.random());
    return hashFraction(key) < def.rollout;
  }

  /** Pick a variant deterministically by key. */
  roll<T>(name: string, ctx: EvaluationContext, variants: T[]): T {
    if (variants.length === 0) throw new Error("variants must not be empty");
    const key = `${name}:${ctx.userId ?? ctx.sessionId ?? Math.random()}`;
    const idx = Math.floor(hashFraction(key) * variants.length);
    return variants[Math.min(idx, variants.length - 1)];
  }

  onChange(fn: (name: string, def: FlagDefinition) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

function hashFraction(input: string): number {
  // FNV-1a 32-bit, normalised to [0, 1)
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0x100000000;
}

export const flagManager = new FlagManager();

export function defineFlag(name: string, def: FlagDefinition): void {
  flagManager.define(name, def);
}

export function isEnabled(name: string, ctx: EvaluationContext = {}): boolean {
  return flagManager.isEnabled(name, ctx);
}

export function roll<T>(
  name: string,
  ctx: EvaluationContext,
  variants: T[]
): T {
  return flagManager.roll(name, ctx, variants);
}

export const VERSION = "3.0.0-alpha.2";
