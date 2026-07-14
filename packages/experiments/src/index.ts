/**
 * @elmoorx/experiments — A/B Testing + Feature Flags
 * ============================================
 * Built-in experimentation platform. No Optimizely, no LaunchDarkly needed.
 *
 *   import { h, experiment, flag, useVariant } from "@elmoorx/experiments";
 *
 *   // Define an experiment
 *   const btnColor = experiment("button-color", {
 *     variants: { control: "#A855F7", blue: "#3B82F6", green: "#10B981" },
 *   });
 *
 *   // Use it
 *   <button style={{ background: btnColor.variant() }}>Click</button>
 *
 *   // Feature flags
 *   if (flag("new-dashboard").enabled()) {
 *     render(NewDashboard);
 *   }
 *
 * Features:
 *   - Zero-config A/B testing
 *   - Automatic variant assignment (sticky per user)
 *   - Real-time results dashboard
 *   - Statistical significance calculation
 *   - Feature flags with rollout percentages
 *   - Scheduled flag activation
 *   - Targeting rules (country, device, custom attributes)
 */

import { h, $state, $effect, type ElmoorxNode } from "@elmoorx/runtime";

// ============ EXPERIMENTS ============

export interface ExperimentConfig<V extends string = string> {
  variants: Record<V, unknown>;
  // Percentage split (must sum to 100). Default: equal split.
  weights?: Record<V, number>;
  // Sticky key — user ID or session ID
  stickyKey?: string;
  // Targeting rules
  targeting?: TargetingRule[];
  // Description
  description?: string;
}

export interface TargetingRule {
  attribute: string;
  operator: "eq" | "neq" | "in" | "not_in" | "gt" | "lt" | "contains";
  value: unknown;
}

export interface ExperimentResult {
  experimentId: string;
  variant: string;
  timestamp: number;
  // Optional: conversion event
  event?: string;
  // Optional: revenue
  revenue?: number;
}

class ExperimentManager {
  private experiments = new Map<string, ExperimentConfig>();
  private assignments = new Map<string, string>(); // stickyKey → variant
  private results: ExperimentResult[] = [];
  private userId: string;
  private attributes: Record<string, unknown> = {};

  constructor() {
    // Generate or load user ID
    this.userId = this.getOrCreateUserId();
  }

  private getOrCreateUserId(): string {
    if (typeof localStorage === "undefined") {
      return "user_" + Math.random().toString(36).slice(2);
    }
    let id = localStorage.getItem("elmoorx_user_id");
    if (!id) {
      id = "user_" + Math.random().toString(36).slice(2);
      localStorage.setItem("elmoorx_user_id", id);
    }
    return id;
  }

  setUserAttributes(attrs: Record<string, unknown>): void {
    this.attributes = { ...this.attributes, ...attrs };
  }

  define<V extends string>(id: string, config: ExperimentConfig<V>): void {
    this.experiments.set(id, config as ExperimentConfig);

    // Pre-assign variant if not already
    if (!this.assignments.has(id)) {
      const variant = this.assignVariant(id, config);
      this.assignments.set(id, variant);
    }
  }

  private assignVariant(id: string, config: ExperimentConfig): string {
    // Check targeting
    if (config.targeting && !this.matchesTargeting(config.targeting)) {
      // Default to first variant if not targeted
      return Object.keys(config.variants)[0];
    }

    const variants = Object.keys(config.variants);
    const stickyKey = config.stickyKey || this.userId;

    // Deterministic assignment based on stickyKey
    const hash = this.hash(stickyKey + id);
    const percentage = (hash % 100) + 1; // 1-100

    if (config.weights) {
      let cumulative = 0;
      for (const variant of variants) {
        cumulative += config.weights[variant] || 0;
        if (percentage <= cumulative) return variant;
      }
    }

    // Equal split
    const idx = Math.floor((percentage - 1) / (100 / variants.length));
    return variants[Math.min(idx, variants.length - 1)];
  }

  private hash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private matchesTargeting(rules: TargetingRule[]): boolean {
    return rules.every(rule => {
      const attrValue = this.attributes[rule.attribute];
      switch (rule.operator) {
        case "eq": return attrValue === rule.value;
        case "neq": return attrValue !== rule.value;
        case "in": return Array.isArray(rule.value) && rule.value.includes(attrValue);
        case "not_in": return Array.isArray(rule.value) && !rule.value.includes(attrValue);
        case "gt": return Number(attrValue) > Number(rule.value);
        case "lt": return Number(attrValue) < Number(rule.value);
        case "contains": return String(attrValue).includes(String(rule.value));
        default: return false;
      }
    });
  }

  getVariant(experimentId: string): string {
    return this.assignments.get(experimentId) || Object.keys(this.experiments.get(experimentId)?.variants || {})[0];
  }

  getValue(experimentId: string): unknown {
    const config = this.experiments.get(experimentId);
    if (!config) return undefined;
    const variant = this.getVariant(experimentId);
    return config.variants[variant];
  }

  track(experimentId: string, event: string, revenue?: number): void {
    const variant = this.getVariant(experimentId);
    this.results.push({
      experimentId,
      variant,
      timestamp: Date.now(),
      event,
      revenue,
    });
  }

  getResults(experimentId: string): ExperimentStats {
    const config = this.experiments.get(experimentId);
    const results = this.results.filter(r => r.experimentId === experimentId);

    const variants = Object.keys(config?.variants || {});
    const stats: Record<string, VariantStats> = {};

    for (const variant of variants) {
      const variantResults = results.filter(r => r.variant === variant);
      const conversions = variantResults.filter(r => r.event === "convert").length;
      const revenue = variantResults.reduce((sum, r) => sum + (r.revenue || 0), 0);

      stats[variant] = {
        participants: variantResults.length,
        conversions,
        conversionRate: variantResults.length > 0 ? conversions / variantResults.length : 0,
        revenue,
        revenuePerUser: variantResults.length > 0 ? revenue / variantResults.length : 0,
      };
    }

    // Calculate statistical significance
    const significance = this.calculateSignificance(variants, stats);

    return {
      experimentId,
      totalParticipants: results.length,
      variants: stats,
      significance,
      winner: significance.confidence > 0.95 ? this.findWinner(variants, stats) : null,
    };
  }

  private calculateSignificance(variants: string[], stats: Record<string, VariantStats>): SignificanceResult {
    if (variants.length < 2) {
      return { confidence: 0, pValue: 1, isSignificant: false };
    }

    const control = variants[0];
    const controlStats = stats[control];
    const controlRate = controlStats.conversionRate;
    const controlN = controlStats.participants;

    let maxConfidence = 0;
    let minPValue = 1;

    for (let i = 1; i < variants.length; i++) {
      const variant = variants[i];
      const vStats = stats[variant];
      const vRate = vStats.conversionRate;
      const vN = vStats.participants;

      if (controlN === 0 || vN === 0) continue;

      // Z-test for proportions (simplified)
      const pooledRate = (controlStats.conversions + vStats.conversions) / (controlN + vN);
      const se = Math.sqrt(pooledRate * (1 - pooledRate) * (1/controlN + 1/vN));

      if (se === 0) continue;

      const zScore = Math.abs(vRate - controlRate) / se;
      const pValue = 2 * (1 - this.normalCDF(zScore));
      const confidence = 1 - pValue;

      maxConfidence = Math.max(maxConfidence, confidence);
      minPValue = Math.min(minPValue, pValue);
    }

    return {
      confidence: maxConfidence,
      pValue: minPValue,
      isSignificant: maxConfidence > 0.95,
    };
  }

  private normalCDF(z: number): number {
    // Approximation of the standard normal CDF
    return 0.5 * (1 + this.erf(z / Math.sqrt(2)));
  }

  private erf(x: number): number {
    // Abramowitz and Stegun approximation
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  }

  private findWinner(variants: string[], stats: Record<string, VariantStats>): string | null {
    let bestVariant = null;
    let bestRate = -1;
    for (const v of variants) {
      if (stats[v].conversionRate > bestRate && stats[v].participants >= 30) {
        bestRate = stats[v].conversionRate;
        bestVariant = v;
      }
    }
    return bestVariant;
  }

  getAllResults(): ExperimentStats[] {
    return [...this.experiments.keys()].map(id => this.getResults(id));
  }
}

export interface VariantStats {
  participants: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  revenuePerUser: number;
}

export interface SignificanceResult {
  confidence: number; // 0-1
  pValue: number;
  isSignificant: boolean;
}

export interface ExperimentStats {
  experimentId: string;
  totalParticipants: number;
  variants: Record<string, VariantStats>;
  significance: SignificanceResult;
  winner: string | null;
}

export const experiments = new ExperimentManager();

// ============ REACTIVE API ============

export function experiment<V extends string>(id: string, config: ExperimentConfig<V>): {
  variant: () => V;
  value: () => unknown;
  track: (event: string, revenue?: number) => void;
} {
  experiments.define(id, config);

  return {
    variant: () => experiments.getVariant(id) as V,
    value: () => experiments.getValue(id),
    track: (event: string, revenue?: number) => experiments.track(id, event, revenue),
  };
}

// ============ FEATURE FLAGS ============

export interface FlagConfig {
  // Rollout percentage (0-100). Default: 100
  rollout?: number;
  // Targeting rules
  targeting?: TargetingRule[];
  // Scheduled activation
  startDate?: Date;
  endDate?: Date;
  // Default value
  default?: boolean;
}

class FlagManager {
  private flags = new Map<string, FlagConfig>();
  private overrides = new Map<string, boolean>();

  define(id: string, config: FlagConfig = {}): void {
    this.flags.set(id, config);
  }

  enabled(id: string): boolean {
    // Check override
    if (this.overrides.has(id)) return (this.overrides.get(id) as NonNullable<ReturnType<typeof this.overrides.get>>);

    const config = this.flags.get(id);
    if (!config) return false;

    // Check schedule
    const now = new Date();
    if (config.startDate && now < config.startDate) return false;
    if (config.endDate && now > config.endDate) return false;

    // Check targeting
    if (config.targeting && !experiments["matchesTargeting"](config.targeting)) {
      return false;
    }

    // Check rollout
    const rollout = config.rollout ?? 100;
    if (rollout >= 100) return true;
    if (rollout <= 0) return false;

    // Deterministic based on user ID
// @ts-expect-error — TS2571: Object is of type 'unknown'.
    const hash = experiments["hash"]((experiments as unknown).userId + id);
    return (hash % 100) < rollout;
  }

  setOverride(id: string, value: boolean): void {
    this.overrides.set(id, value);
  }

  clearOverride(id: string): void {
    this.overrides.delete(id);
  }

  getAll(): { id: string; enabled: boolean; config: FlagConfig }[] {
    return [...this.flags.entries()].map(([id, config]) => ({
      id,
      enabled: this.enabled(id),
      config,
    }));
  }
}

export const flags = new FlagManager();

export function flag(id: string, config?: FlagConfig): {
  enabled: () => boolean;
  override: (value: boolean) => void;
} {
  if (config) flags.define(id, config);

  return {
    enabled: () => flags.enabled(id),
    override: (value: boolean) => flags.setOverride(id, value),
  };
}

// ============ RESULTS DASHBOARD ============

export function ExperimentsDashboard(): ElmoorxNode {
  const results = $state<ExperimentStats[]>([]);
  const flagsList = $state(flags.getAll());

  $effect(() => {
    // Refresh every 5 seconds
    const id = setInterval(() => {
      results.set(experiments.getAllResults());
      flagsList.set(flags.getAll());
    }, 5000);
    return () => clearInterval(id);
  });

  return h("div", {
    style: "padding:32px;background:#0A0A0F;color:#E4E4E7;font-family:Inter,sans-serif;min-height:100vh;",
  },
    h("h1", { style: "font-family:'Space Grotesk',sans-serif;font-size:28px;margin-bottom:24px;" }, "🧪 Experiments Dashboard"),

    // Active experiments
    h("div", { style: "margin-bottom:32px;" },
      h("h2", { style: "font-size:18px;margin-bottom:12px;" }, "Active Experiments"),
      () => results().length === 0
        ? h("div", { style: "padding:20px;background:#14141B;border-radius:8px;color:#71717A;" }, "No active experiments.")
        : results().map(r => h(ExperimentCard, { key: r.experimentId, stats: r }))
    ),

    // Feature flags
    h("div", null,
      h("h2", { style: "font-size:18px;margin-bottom:12px;" }, "Feature Flags"),
      h("div", { style: "background:#14141B;border-radius:8px;padding:16px;" },
        () => flagsList().length === 0
          ? h("div", { style: "color:#71717A;" }, "No feature flags defined.")
          : flagsList().map(f =>
              h("div", {
                key: f.id,
                style: "display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #2A2A38;",
              },
                h("div", null,
                  h("span", { style: "font-family:monospace;font-size:13px;color:#E4E4E7;" }, f.id),
                  f.config.rollout !== undefined && f.config.rollout < 100
                    ? h("span", { style: "margin-left:8px;font-size:11px;color:#F59E0B;" }, `${f.config.rollout}% rollout`)
                    : null,
                ),
                h("span", {
                  style: `
                    padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;text-transform:uppercase;
                    background:${f.enabled ? "rgba(16,185,129,0.15)" : "rgba(113,113,122,0.15)"};
                    color:${f.enabled ? "#10B981" : "#71717A"};
                  `,
                }, f.enabled ? "ON" : "OFF"),
              )
            )
      ),
    ),
  );
}

function ExperimentCard(props: { stats: ExperimentStats }): ElmoorxNode {
  const s = props.stats;
  return h("div", {
    style: "background:#14141B;border:1px solid #2A2A38;border-radius:8px;padding:16px;margin-bottom:12px;",
  },
    h("div", { style: "display:flex;justify-content:space-between;margin-bottom:12px;" },
      h("div", null,
        h("span", { style: "font-family:monospace;font-size:14px;color:#A855F7;" }, s.experimentId),
        h("span", { style: "margin-left:8px;font-size:12px;color:#71717A;" }, `${s.totalParticipants} participants`),
      ),
      s.winner
        ? h("span", { style: "padding:2px 8px;background:rgba(16,185,129,0.15);color:#10B981;border-radius:12px;font-size:10px;font-weight:600;" }, `Winner: ${s.winner}`)
        : s.significance.isSignificant
          ? h("span", { style: "padding:2px 8px;background:rgba(168,85,247,0.15);color:#A855F7;border-radius:12px;font-size:10px;font-weight:600;" }, "Significant")
          : h("span", { style: "padding:2px 8px;background:rgba(245,158,11,0.15);color:#F59E0B;border-radius:12px;font-size:10px;font-weight:600;" }, "Inconclusive"),
    ),

    // Variant stats
    h("div", { style: "display:flex;gap:12px;" },
      ...Object.entries(s.variants).map(([variant, stats]) =>
        h("div", {
          key: variant,
          style: "flex:1;background:#1A1A24;border-radius:6px;padding:12px;",
        },
          h("div", { style: "font-family:monospace;font-size:12px;color:#A1A1AA;margin-bottom:8px;" }, variant),
          h("div", { style: "font-size:20px;font-weight:700;color:#E4E4E7;" },
            (stats.conversionRate * 100).toFixed(1) + "%"
          ),
          h("div", { style: "font-size:11px;color:#71717A;margin-top:4px;" },
            `${stats.conversions}/${stats.participants}`
          ),
          stats.revenue > 0 ? h("div", { style: "font-size:11px;color:#10B981;margin-top:4px;" },
            `$${stats.revenue.toFixed(2)} total`
          ) : null,
        )
      )
    ),

    // Significance bar
    h("div", { style: "margin-top:12px;" },
      h("div", { style: "display:flex;justify-content:space-between;font-size:11px;color:#71717A;margin-bottom:4px;" },
        h("span", null, "Statistical Significance"),
        h("span", null, (s.significance.confidence * 100).toFixed(1) + "% confidence"),
      ),
      h("div", { style: "height:4px;background:#2A2A38;border-radius:2px;overflow:hidden;" },
        h("div", {
          style: `height:100%;width:${s.significance.confidence * 100}%;background:${s.significance.isSignificant ? "#10B981" : "#F59E0B"};transition:width 0.3s;`,
        })
      ),
    ),
  );
}
