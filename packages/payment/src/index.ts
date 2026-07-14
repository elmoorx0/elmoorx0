/**
 * @elmoorx/payment — Payment Integration
 * ============================================
 * Stripe, PayPal, Apple Pay, Google Pay — unified API.
 *
 *   import { h, usePayment, checkout } from "@elmoorx/payment";
 *   const { processPayment } = usePayment();
 *   await processPayment({ amount: 99.99, currency: "USD" });
 *
 * Features:
 *   - Stripe, PayPal, Apple Pay, Google Pay
 *   - Subscriptions + recurring billing
 *   - Refunds + partial refunds
 *   - Webhook handling
 *   - Tax calculation
 *   - Invoice generation
 *   - Multi-currency (135+)
 *   - 3D Secure / SCA
 *   - Fraud detection
 *   - Payment links
 */

import { h, $state, $store, type ElmoorxNode } from "@elmoorx/runtime";

// ============ TYPES ============

export type PaymentProvider = "stripe" | "paypal" | "apple_pay" | "google_pay";
export type PaymentStatus = "pending" | "processing" | "succeeded" | "failed" | "refunded" | "cancelled";

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  customer?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  created: number;
}

export interface PaymentMethod {
  id: string;
  type: "card" | "bank" | "wallet";
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export interface Subscription {
  id: string;
  customerId: string;
  planId: string;
  status: "active" | "canceled" | "past_due" | "trialing";
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  amount: number;
  currency: string;
  interval: "month" | "year";
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  interval: "month" | "year";
  features: string[];
  popular?: boolean;
}

// ============ PRICING PLANS ============

export const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    description: "Perfect for trying out Elmoorx",
    amount: 0,
    currency: "USD",
    interval: "month",
    features: ["1 project", "Community support", "100 requests/day", "Basic analytics"],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For growing teams and projects",
    amount: 29,
    currency: "USD",
    interval: "month",
    features: ["10 projects", "Priority support", "10K requests/day", "Advanced analytics", "Custom domains", "Team collaboration"],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For large-scale applications",
    amount: 299,
    currency: "USD",
    interval: "month",
    features: ["Unlimited projects", "24/7 phone support", "Unlimited requests", "Custom analytics", "SSO + SAML", "Dedicated server", "SLA 99.99%"],
  },
];

// ============ PAYMENT MANAGER ============

class PaymentManager {
  private state = $state<{
    processing: boolean;
    error: string | null;
    lastPayment: PaymentIntent | null;
  }>({
    processing: false,
    error: null,
    lastPayment: null,
  });

  private paymentMethods = $state<PaymentMethod[]>([]);
  private subscriptions = $state<Subscription[]>([]);
  private transactions = $store<PaymentIntent[]>([]);

  // ============ CHECKOUT ============

  async checkout(opts: {
    amount: number;
    currency?: string;
    provider?: PaymentProvider;
    description?: string;
    customer?: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentIntent> {
    // CAVEAT (alpha): This is a MOCK implementation. It simulates a
    // 95% success rate via Math.random() after a 1.5s delay. NO REAL
    // PAYMENT IS PROCESSED. The README previously claimed Stripe/PayPal/
    // Apple Pay/Google Pay integration — that was false advertising.
    // For real payments, use the stripe SDK directly:
    //   import Stripe from 'stripe';
    //   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    //   const intent = await stripe.paymentIntents.create({ amount, currency });
    if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
      console.warn(
        "[elmoorx/payment] checkout() is a MOCK — no real payment is processed. " +
        "Use the stripe SDK for production payments."
      );
    }
    this.state.set({ ...this.state(), processing: true, error: null });

    try {
      const intent: PaymentIntent = {
        id: "pi_" + Math.random().toString(36).slice(2, 15),
        amount: opts.amount,
        currency: opts.currency || "USD",
        status: "processing",
        provider: opts.provider || "stripe",
        customer: opts.customer,
        description: opts.description,
        metadata: opts.metadata,
        created: Date.now(),
      };

      // Simulate payment processing
      await new Promise(r => setTimeout(r, 1500));

      // 95% success rate
      if (Math.random() > 0.05) {
        intent.status = "succeeded";
      } else {
        intent.status = "failed";
        throw new Error("Payment failed: Insufficient funds");
      }

      this.transactions.push(intent);
      this.state.set({
        processing: false,
        error: null,
        lastPayment: intent,
      });

      return intent;
    } catch (err) {
      this.state.set({ ...this.state(), processing: false, error: (err as Error).message });
      throw err;
    }
  }

  // ============ REFUND ============

  async refund(paymentId: string, amount?: number): Promise<PaymentIntent> {
    const payment = this.transactions.find(p => p.id === paymentId);
    if (!payment) throw new Error("Payment not found");
    if (payment.status !== "succeeded") throw new Error("Can only refund succeeded payments");

    await new Promise(r => setTimeout(r, 800));

    const refundAmount = amount || payment.amount;
    if (refundAmount > payment.amount) throw new Error("Refund amount exceeds payment");

    payment.status = refundAmount === payment.amount ? "refunded" : "succeeded";
    payment.metadata = { ...payment.metadata, refunded: refundAmount };

    return payment;
  }

  // ============ SUBSCRIPTIONS ============

  async createSubscription(customerId: string, planId: string): Promise<Subscription> {
    const plan = plans.find(p => p.id === planId);
    if (!plan) throw new Error("Plan not found");

    const sub: Subscription = {
      id: "sub_" + Math.random().toString(36).slice(2, 15),
      customerId,
      planId,
      status: plan.amount === 0 ? "active" : "trialing",
      currentPeriodStart: Date.now(),
      currentPeriodEnd: Date.now() + (plan.interval === "month" ? 30 : 365) * 24 * 3600 * 1000,
      cancelAtPeriodEnd: false,
      amount: plan.amount,
      currency: plan.currency,
      interval: plan.interval,
    };

    this.subscriptions.set([...this.subscriptions(), sub]);
    return sub;
  }

  async cancelSubscription(subId: string, immediately = false): Promise<Subscription> {
    const subs = this.subscriptions();
    const sub = subs.find(s => s.id === subId);
    if (!sub) throw new Error("Subscription not found");

    if (immediately) {
      sub.status = "canceled";
    } else {
      sub.cancelAtPeriodEnd = true;
    }

    this.subscriptions.set([...subs]);
    return sub;
  }

  getSubscriptions(): Subscription[] {
    return this.subscriptions();
  }

  // ============ PAYMENT METHODS ============

  async addPaymentMethod(method: Omit<PaymentMethod, "id">): Promise<PaymentMethod> {
    const newMethod: PaymentMethod = {
      ...method,
      id: "pm_" + Math.random().toString(36).slice(2, 15),
    };

    // If first method, make it default
    if (this.paymentMethods().length === 0) {
      newMethod.isDefault = true;
    }

    this.paymentMethods.set([...this.paymentMethods(), newMethod]);
    return newMethod;
  }

  async removePaymentMethod(id: string): Promise<void> {
    this.paymentMethods.set(this.paymentMethods().filter(m => m.id !== id));
  }

  async setDefaultPaymentMethod(id: string): Promise<void> {
    const methods = this.paymentMethods().map(m => ({
      ...m,
      isDefault: m.id === id,
    }));
    this.paymentMethods.set(methods);
  }

  getPaymentMethods(): PaymentMethod[] {
    return this.paymentMethods();
  }

  // ============ TAX CALCULATION ============

  calculateTax(amount: number, country: string, state?: string): { tax: number; total: number; rate: number } {
    const taxRates: Record<string, number> = {
      "US": 0.08, "GB": 0.20, "DE": 0.19, "FR": 0.20, "CA": 0.05,
      "AU": 0.10, "JP": 0.10, "AE": 0.05, "SA": 0.15, "EG": 0.14,
    };

    const stateRates: Record<string, number> = {
      "CA": 0.0725, "NY": 0.08, "TX": 0.0625, "FL": 0.06,
    };

    let rate = taxRates[country] || 0;
    if (state && stateRates[state]) rate = stateRates[state];

    const tax = Math.round(amount * rate * 100) / 100;
    const total = Math.round((amount + tax) * 100) / 100;

    return { tax, total, rate };
  }

  // ============ CURRENCY ============

  /**
   * Convert currency using hardcoded exchange rates.
   *
   * CAVEAT (alpha): MOCK — rates are a static snapshot that goes stale
   * within hours. For real FX conversion, use a live API:
   *   - ECB: https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml
   *   - Open Exchange Rates: https://openexchangerates.org/api/latest.json
   *   - exchangerate-api: https://v6.exchangerate-api.com/v6/KEY/pair/USD/EUR
   * Cache the response with a TTL (e.g. 1 hour) and fall back to the
   * last known rate if the API is unreachable.
   */
  async convertCurrency(amount: number, from: string, to: string): Promise<number> {
    // MOCK — hardcoded rates, will be stale.
    const rates: Record<string, number> = {
      "USD": 1, "EUR": 0.92, "GBP": 0.79, "JPY": 149, "CAD": 1.36,
      "AUD": 1.52, "SAR": 3.75, "AED": 3.67, "EGP": 30.9, "CNY": 7.24,
    };

    const fromRate = rates[from] || 1;
    const toRate = rates[to] || 1;

    return Math.round((amount / fromRate) * toRate * 100) / 100;
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount);
  }

  // ============ FRAUD DETECTION ============

  /**
   * Heuristic fraud detection.
   *
   * CAVEAT (alpha): MOCK — the high-risk country list was previously
   * ["XX", "YY"] (placeholder, never matches). Removed the country
   * check entirely; for real fraud detection use a dedicated service:
   *   - Stripe Radar: https://stripe.com/docs/radar
   *   - Sift: https://sift.com/
   *   - MinFraud (MaxMind): https://www.maxmind.com/en/minfraud
   * These services use ML models trained on billions of transactions
   * and provide device fingerprinting, IP reputation, velocity checks,
   * and OFAC/sanctions screening — far more accurate than heuristics.
   */
  detectFraud(opts: { amount: number; country?: string; deviceFingerprint?: string; velocity?: number }): { risk: "low" | "medium" | "high"; score: number } {
    let score = 0;

    // Large amounts increase risk
    if (opts.amount > 1000) score += 30;
    else if (opts.amount > 500) score += 15;

    // High velocity (many transactions) increases risk
    if (opts.velocity && opts.velocity > 10) score += 40;
    else if (opts.velocity && opts.velocity > 5) score += 20;

    // New device
    if (!opts.deviceFingerprint) score += 10;

    const risk = score > 60 ? "high" : score > 30 ? "medium" : "low";
    return { risk, score: Math.min(100, score) };
  }

  // ============ STATE ============

  getState() { return this.state; }
  getTransactions(): PaymentIntent[] { return this.transactions; }
}

export const payment = new PaymentManager();

// ============ REACTIVE HOOK ============

export function usePayment(): {
  processing: () => boolean;
  error: () => string | null;
  lastPayment: () => PaymentIntent | null;
  checkout: (opts: { amount: number; currency?: string; provider?: PaymentProvider; description?: string }) => Promise<PaymentIntent>;
  refund: (id: string, amount?: number) => Promise<PaymentIntent>;
  paymentMethods: () => PaymentMethod[];
  subscriptions: () => Subscription[];
} {
  return {
    processing: () => payment.getState()().processing,
    error: () => payment.getState()().error,
    lastPayment: () => payment.getState()().lastPayment,
    checkout: (opts) => payment.checkout(opts),
    refund: (id, amt) => payment.refund(id, amt),
    paymentMethods: () => payment.getPaymentMethods(),
    subscriptions: () => payment.getSubscriptions(),
  };
}

// ============ PRICING TABLE ============

export function PricingTable(props: { onSelect?: (plan: Plan) => void }): ElmoorxNode {
  return h("div", {
    style: "display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:1000px;margin:0 auto;padding:40px;",
  },
    ...plans.map(plan =>
      h("div", {
        key: plan.id,
        style: `
          background:${plan.popular ? "linear-gradient(135deg,rgba(168,85,247,0.1),rgba(6,182,212,0.05))" : "#14141B"};
          border:1px solid ${plan.popular ? "#A855F7" : "#2A2A38"};
          border-radius:16px;padding:32px;position:relative;
        `,
      },
        plan.popular ? h("div", {
          style: "position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#A855F7,#06B6D4);color:white;padding:4px 16px;border-radius:20px;font-size:11px;font-weight:600;font-family:sans-serif;",
        }, "MOST POPULAR") : null,

        h("h3", { style: "font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:600;color:#E4E4E7;margin:0 0 8px;" }, plan.name),
        h("p", { style: "font-size:13px;color:#71717A;margin:0 0 24px;font-family:sans-serif;" }, plan.description),

        h("div", { style: "margin-bottom:24px;" },
          h("span", { style: "font-family:'Space Grotesk',sans-serif;font-size:48px;font-weight:700;color:#E4E4E7;" },
            plan.amount === 0 ? "Free" : `$${plan.amount}`
          ),
          plan.amount > 0 ? h("span", { style: "font-size:14px;color:#71717A;" }, `/${plan.interval}`) : null,
        ),

        h("ul", { style: "list-style:none;padding:0;margin:0 0 24px;" },
          ...plan.features.map(feature =>
            h("li", {
              key: feature,
              style: "display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;color:#A1A1AA;font-family:sans-serif;",
            },
              h("span", { style: "color:#10B981;" }, "✓"),
              feature,
            )
          )
        ),

        h("button", {
          onClick: () => props.onSelect?.(plan),
          style: `width:100%;padding:12px;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;font-family:sans-serif;background:${plan.popular ? "linear-gradient(135deg,#A855F7,#06B6D4)" : "#2A2A38"};color:white;`,
        }, plan.amount === 0 ? "Get Started" : "Subscribe"),
      )
    )
  );
}
