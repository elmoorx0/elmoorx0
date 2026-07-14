/**
 * I18nDemo.elmoorx.tsx — Internationalization demo
 * Reactive language switching between English and Arabic.
 *
 * FIXED: The previous version imported 6 symbols that don't exist on
 * the @elmoorx/i18n public API (useTranslations, registerTranslations,
 * locale as a function, plural, formatNumber, formatDate, formatCurrency).
 * It would fail at module-load time. Now uses the actual public API:
 *   - i18n.register(locale, dict) instead of registerTranslations
 *   - i18n.t(key, opts) instead of useTranslations()(...).t
 *   - getLocale() instead of locale()
 *   - i18n.t with plural options instead of plural() function
 *   - Intl.NumberFormat / DateTimeFormat directly (format.ts helpers
 *     are exported via subpath, not the main entry)
 */

import { $state, h, type ElmoorxNode } from "@elmoorx/runtime";
import {
  i18n,
  setLocale,
  getLocale,
  getDir,
  isRTL,
  detectLocale,
} from "@elmoorx/i18n";

// === Register translations ===
// i18n.register(locale, dict) — single namespace per locale.
// For multi-namespace, use i18n.namespace(ns, locale, dict).
i18n.register("en", {
  hello: "Hello, {name}!",
  goodbye: "Goodbye",
  items_zero: "No items",
  items_one: "1 item",
  items_other: "{count} items",
  welcome: "Welcome to Elmoorx",
  description: "A reactive frontend framework",
  switchTo: "Switch to {lang}",
  date: "Today is {date}",
});

i18n.register("ar", {
  hello: "مرحباً، {name}!",
  goodbye: "وداعاً",
  items_zero: "لا عناصر",
  items_one: "عنصر واحد",
  items_other: "{count} عنصر",
  welcome: "مرحباً بك في Elmoorx",
  description: "إطار عمل للواجهات الأمامية",
  switchTo: "تبديل إلى {lang}",
  date: "اليوم هو {date}",
});

// Initialize locale from browser/ Accept-Language (if available)
i18n.locale = detectLocale(
  typeof navigator !== "undefined"
    ? navigator.languages?.join(",")
    : "en"
);

function App() {
  const switchLang = () => {
    setLocale(getLocale() === "en" ? "ar" : "en");
  };

  // Helper: format number using Intl directly (the @elmoorx/i18n/format
  // subpath is not re-exported from the main entry).
  const fmtNum = (n: number) =>
    new Intl.NumberFormat(getLocale()).format(n);
  const fmtCurrency = (n: number, currency: string) =>
    new Intl.NumberFormat(getLocale(), { style: "currency", currency }).format(n);
  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat(getLocale(), { dateStyle: "full" }).format(d);

  // Helper: pluralize using i18n's plural-aware variant selection.
  // i18n.t with {count} option automatically selects the right plural form.
  const fmtItems = (count: number) =>
    i18n.t("items_zero", { count })   // zero
    || i18n.t(count === 1 ? "items_one" : "items_other", { count });

  return h("div", {
    dir: () => getDir(),
    style: "font-family: 'Noto Sans Arabic', Inter, sans-serif; padding: 40px; max-width: 600px; margin: auto;",
  },
    h("h1", null, () => i18n.t("welcome")),
    h("p", null, () => i18n.t("description")),

    h("hr", null),

    h("p", null, () => i18n.t("hello", { name: "Amir" })),
    h("p", null, () => i18n.t("goodbye")),

    // Pluralization — i18n.t auto-selects plural form based on {count}
    h("p", null, () => fmtItems(0)),
    h("p", null, () => fmtItems(1)),
    h("p", null, () => fmtItems(5)),

    // Formatted numbers
    h("p", null, () => `Number: ${fmtNum(1234567.89)}`),
    h("p", null, () => `Currency: ${fmtCurrency(99.99, "USD")}`),
    h("p", null, () => `Date: ${fmtDate(new Date())}`),

    h("hr", null),

    h("button", {
      onClick: switchLang,
      style: "padding: 10px 20px; background: #A855F7; color: white; border: none; border-radius: 6px; cursor: pointer;",
    }, () => i18n.t("switchTo", { lang: getLocale() === "en" ? "Arabic" : "English" })),
  );
}

export default function Page(): ElmoorxNode {
  return h("main", null, h(App, {}));
}
