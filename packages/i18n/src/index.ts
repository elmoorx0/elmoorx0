/**
 * @elmoorx/i18n — Core Translation Engine
 *
 * Design principles:
 * 1. Dictionary-based (developer writes translations — full control, high accuracy)
 * 2. Ultra-fast: O(1) lookup, zero computation in hot path
 * 3. Real-time: reactive locale switching, instant UI updates
 * 4. Revolutionary DX: simplest API possible
 * 5. Flexible: namespaces, lazy loading, interpolation, plural, gender
 *
 * ─── Developer Experience ───
 *
 * Step 1: Write translations (regular JS object, no special syntax)
 *
 *   // locales/ar.ts
 *   export default {
 *     welcome: "مرحباً {name}",
 *     items: {
 *       zero: "لا توجد عناصر",
 *       one: "عنصر واحد",
 *       other: "{count} عنصر"
 *     },
 *     profile: {
 *       male: "ملفه الشخصي",
 *       female: "ملفها الشخصي"
 *     }
 *   }
 *
 * Step 2: Register and use
 *
 *   import { i18n } from '@elmoorx/i18n';
 *
 *   i18n.register('ar', { welcome: "مرحباً {name}" });
 *   i18n.locale = 'ar';
 *
 *   i18n.t('welcome', { name: 'أحمد' })  // → "مرحباً أحمد"
 *   i18n.t('items', { count: 0 })        // → "لا توجد عناصر"
 *   i18n.t('items', { count: 1 })        // → "عنصر واحد"
 *   i18n.t('items', { count: 5 })        // → "5 عنصر"
 *   i18n.t('profile', { gender: 'female' }) // → "ملفها الشخصي"
 *
 * That's it. No config files, no CLI, no build step.
 * Just write dictionaries and call t().
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type Locale = string;

/** A translation value can be a string or a nested object (for plural/gender/variant) */
export type TranslationValue =
  | string
  | { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string }
  | { male?: string; female?: string; neutral?: string; other: string }
  | { [variant: string]: string | TranslationValue };

/** A locale dictionary is a flat or nested object of keys → translations */
export type Dictionary = Record<string, TranslationValue>;

/** Translation parameters */
export interface TranslateOptions {
  count?: number;
  gender?: 'male' | 'female' | 'neutral';
  [key: string]: unknown;
}

/** Locale configuration */
export interface LocaleConfig {
  code: string;
  dir: 'ltr' | 'rtl';
  plural?: (n: number) => 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
  fallback?: string;
  [key: string]: unknown;
}

// ─── Built-in Plural Rules ──────────────────────────────────────────────────

export const pluralRules: Record<string, (n: number) => string> = {
  // one/other (English, German, Spanish, Italian, etc.)
  en: (n) => n === 1 ? 'one' : 'other',
  de: (n) => n === 1 ? 'one' : 'other',
  es: (n) => n === 1 ? 'one' : 'other',
  it: (n) => n === 1 ? 'one' : 'other',
  nl: (n) => n === 1 ? 'one' : 'other',
  sv: (n) => n === 1 ? 'one' : 'other',
  da: (n) => n === 1 ? 'one' : 'other',
  no: (n) => n === 1 ? 'one' : 'other',
  fi: (n) => n === 1 ? 'one' : 'other',
  el: (n) => n === 1 ? 'one' : 'other',
  tr: (n) => n === 1 ? 'one' : 'other',
  hu: (n) => n === 1 ? 'one' : 'other',
  vi: () => 'other',
  th: () => 'other',
  ja: () => 'other',
  ko: () => 'other',
  zh: () => 'other',
  id: () => 'other',
  ms: () => 'other',

  // one/many (French, Portuguese)
  fr: (n) => n >= 0 && n < 2 ? 'one' : 'many',
  pt: (n) => n >= 0 && n < 2 ? 'one' : 'other',

  // Arabic (6 forms)
  ar: (n) => {
    if (n === 0) return 'zero';
    if (n === 1) return 'one';
    if (n === 2) return 'two';
    const m = n % 100;
    if (m >= 3 && m <= 10) return 'few';
    if (m >= 11 && m <= 99) return 'many';
    return 'other';
  },

  // Slavic (one/few/many)
  ru: (n) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return 'one';
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'few';
    return 'many';
  },
  uk: (n) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return 'one';
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'few';
    return 'many';
  },
  pl: (n) => {
    if (n === 1) return 'one';
    const m10 = n % 10, m100 = n % 100;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'few';
    return 'many';
  },
  cs: (n) => n === 1 ? 'one' : n >= 2 && n <= 4 ? 'few' : 'other',
  sk: (n) => n === 1 ? 'one' : n >= 2 && n <= 4 ? 'few' : 'other',
  hr: (n) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return 'one';
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'few';
    return 'other';
  },
  sr: (n) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return 'one';
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'few';
    return 'other';
  },

  // Hebrew
  he: (n) => {
    if (n === 1) return 'one';
    if (n === 2) return 'two';
    if (n > 10 && n % 10 === 0) return 'many';
    return 'other';
  },

  // Persian/Urdu (one/other)
  fa: (n) => n === 1 ? 'one' : 'other',
  ur: (n) => n === 1 ? 'one' : 'other',

  // Hindi/Bengali (one/other)
  hi: (n) => n === 1 ? 'one' : 'other',
  bn: (n) => n === 1 ? 'one' : 'other',

  // Romanian
  ro: (n) => {
    if (n === 1) return 'one';
    if (n === 0 || (n % 100 >= 1 && n % 100 <= 19)) return 'few';
    return 'other';
  },
};

// ─── Built-in Locale Configs ────────────────────────────────────────────────

const localeConfigs: Record<string, LocaleConfig> = {
  en: { code: 'en', dir: 'ltr' },
  ar: { code: 'ar', dir: 'rtl', fallback: 'en' },
  'ar-EG': { code: 'ar-EG', dir: 'rtl', fallback: 'ar' },
  'ar-SA': { code: 'ar-SA', dir: 'rtl', fallback: 'ar' },
  fr: { code: 'fr', dir: 'ltr', fallback: 'en' },
  de: { code: 'de', dir: 'ltr', fallback: 'en' },
  es: { code: 'es', dir: 'ltr', fallback: 'en' },
  it: { code: 'it', dir: 'ltr', fallback: 'en' },
  pt: { code: 'pt', dir: 'ltr', fallback: 'en' },
  ru: { code: 'ru', dir: 'ltr', fallback: 'en' },
  uk: { code: 'uk', dir: 'ltr', fallback: 'en' },
  pl: { code: 'pl', dir: 'ltr', fallback: 'en' },
  cs: { code: 'cs', dir: 'ltr', fallback: 'en' },
  tr: { code: 'tr', dir: 'ltr', fallback: 'en' },
  nl: { code: 'nl', dir: 'ltr', fallback: 'en' },
  sv: { code: 'sv', dir: 'ltr', fallback: 'en' },
  zh: { code: 'zh', dir: 'ltr', fallback: 'en' },
  'zh-TW': { code: 'zh-TW', dir: 'ltr', fallback: 'zh' },
  ja: { code: 'ja', dir: 'ltr', fallback: 'en' },
  ko: { code: 'ko', dir: 'ltr', fallback: 'en' },
  hi: { code: 'hi', dir: 'ltr', fallback: 'en' },
  bn: { code: 'bn', dir: 'ltr', fallback: 'en' },
  fa: { code: 'fa', dir: 'rtl', fallback: 'en' },
  ur: { code: 'ur', dir: 'rtl', fallback: 'en' },
  he: { code: 'he', dir: 'rtl', fallback: 'en' },
  th: { code: 'th', dir: 'ltr', fallback: 'en' },
  vi: { code: 'vi', dir: 'ltr', fallback: 'en' },
  id: { code: 'id', dir: 'ltr', fallback: 'en' },
  ms: { code: 'ms', dir: 'ltr', fallback: 'en' },
  ro: { code: 'ro', dir: 'ltr', fallback: 'en' },
  hu: { code: 'hu', dir: 'ltr', fallback: 'en' },
  el: { code: 'el', dir: 'ltr', fallback: 'en' },
  fi: { code: 'fi', dir: 'ltr', fallback: 'en' },
  da: { code: 'da', dir: 'ltr', fallback: 'en' },
  no: { code: 'no', dir: 'ltr', fallback: 'en' },
  hr: { code: 'hr', dir: 'ltr', fallback: 'en' },
  sr: { code: 'sr', dir: 'ltr', fallback: 'en' },
  sk: { code: 'sk', dir: 'ltr', fallback: 'en' },
};

const rtlLocales = new Set(['ar', 'ar-EG', 'ar-SA', 'fa', 'ur', 'he']);

// ─── Core Engine ────────────────────────────────────────────────────────────

export class I18nCore {
  private dictionaries = new Map<string, Dictionary>();
  private currentLocale: Locale = 'en';
  private listeners = new Set<(locale: Locale) => void>();
  private cache = new Map<string, string>();
  private missingKeys: string[] = [];
  private cacheHits = 0;
  private cacheMisses = 0;

  // ── Locale management ──

  /** Get current locale */
  get locale(): Locale {
    return this.currentLocale;
  }

  /** Set current locale — triggers reactive updates */
  set locale(locale: Locale) {
    if (locale === this.currentLocale) return;
    this.currentLocale = locale;
    this.cache.clear(); // invalidate cache
    this.applyDOM();
    this.listeners.forEach(fn => fn(locale));
  }

  /** Get current text direction */
  get dir(): 'ltr' | 'rtl' {
    return this.isRTL(this.currentLocale) ? 'rtl' : 'ltr';
  }

  /** Check if locale is RTL */
  isRTL(locale?: Locale): boolean {
    const loc = locale || this.currentLocale;
    return rtlLocales.has(loc) || rtlLocales.has(loc.split('-')[0]);
  }

  /** Get locale config */
  getConfig(locale?: Locale): LocaleConfig {
    const loc = locale || this.currentLocale;
    return localeConfigs[loc] || localeConfigs[loc.split('-')[0]] || { code: loc, dir: 'ltr' };
  }

  /** Register a locale config */
  configure(locale: Locale, config: Partial<LocaleConfig>): void {
    localeConfigs[locale] = { ...localeConfigs[locale], ...config, code: locale };
    if (config.dir) {
      if (config.dir === 'rtl') rtlLocales.add(locale);
      else rtlLocales.delete(locale);
    }
  }

  // ── Dictionary management ──

  /**
   * Register translations for a locale.
   * Can be called multiple times — merges with existing.
   */
  register(locale: Locale, dict: Dictionary): void {
    const existing = this.dictionaries.get(locale) || {};
    this.dictionaries.set(locale, this.deepMerge(existing, dict) as Dictionary);
    this.cache.clear(); // invalidate cache
  }

  /**
   * Register translations under a namespace.
   *
   * i18n.namespace('auth', 'ar', {
   *   login: "تسجيل الدخول",
   *   signup: "إنشاء حساب"
   * });
   *
   * i18n.t('auth.login')  // → "تسجيل الدخول"
   */
  namespace(ns: string, locale: Locale, dict: Dictionary): void {
    const existing = this.dictionaries.get(locale) || {};
    existing[ns] = this.deepMerge((existing[ns] as Dictionary) || {}, dict) as TranslationValue;
    this.dictionaries.set(locale, existing);
    this.cache.clear();
  }

  /** Unregister a locale or namespace */
  unregister(locale: Locale, namespace?: string): void {
    if (namespace) {
      const dict = this.dictionaries.get(locale);
      if (dict) {
        delete dict[namespace];
        this.cache.clear();
      }
    } else {
      this.dictionaries.delete(locale);
      this.cache.clear();
    }
  }

  /** Check if a locale has been registered */
  has(locale: Locale): boolean {
    return this.dictionaries.has(locale);
  }

  /** Get all registered locales */
  getLocales(): Locale[] {
    return Array.from(this.dictionaries.keys());
  }

  // ── Translation ──

  /**
   * THE main translation function.
   *
   * @param key — dot-notation key: "auth.login" or "welcome"
   * @param options — { count, gender, name, ... }
   * @returns translated string
   */
  t(key: string, options?: TranslateOptions): string {
    // Build cache key
    const cacheKey = this.currentLocale + ':' + key + (options ? ':' + this.hashOptions(options) : '');

    // Check cache (O(1))
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      this.cacheHits++;
      return cached;
    }
    this.cacheMisses++;

    // Resolve translation
    const value = this.resolve(key, this.currentLocale);

    if (value === undefined) {
      // Track missing
      if (this.missingKeys.length < 200) {
        this.missingKeys.push(`${this.currentLocale}:${key}`);
      }
      // Return key as fallback. Do NOT interpolate inside the key —
      // keys are developer-supplied identifiers, not user-facing
      // templates, and interpolating user data into them is a
      // surprising and potentially dangerous behavior.
      const fallback = key;
      this.cache.set(cacheKey, fallback);
      return fallback;
    }

    // Select variant (plural/gender/custom)
    const selected = this.selectVariant(value, options);

    // Interpolate
    const result = this.interpolate(selected, options);

    // Cache
    this.cache.set(cacheKey, result);
    return result;
  }

  /** Check if a translation key exists */
  exists(key: string, locale?: Locale): boolean {
    return this.resolve(key, locale || this.currentLocale) !== undefined;
  }

  /** Get list of missing keys (for debugging) */
  getMissingKeys(): string[] {
    return [...this.missingKeys];
  }

  /** Clear missing keys list */
  clearMissingKeys(): void {
    this.missingKeys = [];
  }

  // ── Reactive ──

  /** Subscribe to locale changes */
  onChange(fn: (locale: Locale) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // ── Cache management ──

  /** Clear the translation cache. Also resets hit/miss counters. */
  clearCache(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /** Get cache stats — size and hit rate (0..1). */
  getCacheStats(): { size: number; hitRate: number } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      size: this.cache.size,
      hitRate: total === 0 ? 0 : this.cacheHits / total,
    };
  }

  // ─── Internal ──

  private resolve(key: string, locale: Locale): TranslationValue | undefined {
    // Try exact locale, then fallback chain
    const chain = this.getFallbackChain(locale);
    for (const loc of chain) {
      const dict = this.dictionaries.get(loc);
      if (!dict) continue;
      const value = this.getPath(dict, key);
      if (value !== undefined && value !== null) return value as TranslationValue;
    }
    return undefined;
  }

  private getFallbackChain(locale: Locale): Locale[] {
    const chain = [locale];
    const config = localeConfigs[locale];
    if (config?.fallback) chain.push(config.fallback);
    const base = locale.split('-')[0];
    if (base !== locale && !chain.includes(base)) chain.push(base);
    if (!chain.includes('en')) chain.push('en');
    return chain;
  }

  private getPath(obj: unknown, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return current;
  }

  private selectVariant(value: TranslationValue, options?: TranslateOptions): string {
    if (typeof value === 'string') return value;

    if (options) {
      // Try gender-based selection
      if (options.gender && typeof value === 'object') {
        const gendered = (value as Record<string, unknown>)[options.gender as string];
        if (typeof gendered === 'string') return gendered;
      }

      // Try plural-based selection
      if (options.count !== undefined && typeof value === 'object') {
        const pluralForm = this.getPluralForm(this.currentLocale, options.count);
        const pluralVal = (value as Record<string, unknown>)[pluralForm];
        if (typeof pluralVal === 'string') return pluralVal;
        // Fallback to 'other'
        const other = (value as Record<string, unknown>)['other'];
        if (typeof other === 'string') return other;
      }
    }

    // If it's an object with 'other', use that
    if (typeof value === 'object' && value !== null && 'other' in value) {
      const otherVal = (value as Record<string, unknown>)['other'];
      return typeof otherVal === 'string' ? otherVal : String(value);
    }

    // Last resort: stringify
    return String(value);
  }

  private getPluralForm(locale: Locale, count: number): string {
    const base = locale.split('-')[0];
    const rule = pluralRules[base] || pluralRules[locale] || pluralRules['en'];
    return rule(count);
  }

  private interpolate(template: string, options?: TranslateOptions): string {
    if (!options) return template;
    let result = template;
    for (const [key, value] of Object.entries(options)) {
      if (key === 'count' || key === 'gender') continue; // handled by variant
      // SECURITY: use String.split/join instead of RegExp to avoid
      // regex injection from option keys containing metacharacters.
      // Previously `new RegExp('\\{${key}\\}', 'g')` would throw
      // SyntaxError on keys like `foo.bar` (the `.` matches any char)
      // or `.*+?^${}()|[]\\` (malformed regex).
      const placeholder = `{${key}}`;
      result = result.split(placeholder).join(String(value));
    }
    // Also replace {count} if present
    if (options.count !== undefined) {
      result = result.split('{count}').join(String(options.count));
    }
    return result;
  }

  private deepMerge(target: unknown, source: unknown): unknown {
    if (target === null || source === null) return source;
    if (typeof target !== 'object' || typeof source !== 'object') return source;
    const targetRecord = target as Record<string, unknown>;
    const sourceRecord = source as Record<string, unknown>;
    const result: Record<string, unknown> = { ...targetRecord };
    for (const key of Object.keys(sourceRecord)) {
      if (typeof targetRecord[key] === 'object' && typeof sourceRecord[key] === 'object') {
        result[key] = this.deepMerge(targetRecord[key], sourceRecord[key]);
      } else {
        result[key] = sourceRecord[key];
      }
    }
    return result;
  }

  /**
   * Build a cache-key fragment from options. Uses JSON.stringify on
   * each value (not String()) so that object/array values produce
   * distinct keys instead of all collapsing to '[object Object]'.
   */
  private hashOptions(options: TranslateOptions): string {
    const keys = Object.keys(options).sort();
    return keys.map(k => `${k}=${JSON.stringify(options[k])}`).join('&');
  }

  private applyDOM(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = this.currentLocale;
    document.documentElement.dir = this.dir;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const i18n = new I18nCore();

// ─── Quick helpers ──────────────────────────────────────────────────────────

export function t(key: string, options?: TranslateOptions): string {
  return i18n.t(key, options);
}

export function setLocale(locale: Locale): void {
  i18n.locale = locale;
}

export function getLocale(): Locale {
  return i18n.locale;
}

export function getDir(): 'ltr' | 'rtl' {
  return i18n.dir;
}

export function isRTL(locale?: Locale): boolean {
  return i18n.isRTL(locale);
}

export function detectLocale(acceptLanguage?: string): Locale {
  if (acceptLanguage) {
    // Parse Accept-Language per RFC 7231 §5.3.4:
    //   de;q=0.5, en;q=0.9, fr;q=1.0
    // Sort by descending q (default 1.0), then walk the sorted list.
    const parsed = acceptLanguage.split(',').map(entry => {
      const [code, qPart] = entry.split(';q=');
      const q = qPart !== undefined ? parseFloat(qPart.trim()) : 1.0;
      return { code: code.trim(), q: Number.isFinite(q) ? q : 0 };
    }).filter(e => e.code && e.q > 0)
      .sort((a, b) => b.q - a.q);

    for (const { code } of parsed) {
      if (i18n.has(code)) return code;
      const base = code.split('-')[0];
      if (i18n.has(base)) return base;
    }
  }
  if (typeof navigator !== 'undefined') {
    for (const lang of navigator.languages || [navigator.language]) {
      if (i18n.has(lang)) return lang;
      const base = lang.split('-')[0];
      if (i18n.has(base)) return base;
    }
  }
  return 'en';
}

// ─── Version ────────────────────────────────────────────────────────────────

export const VERSION = '3.0.0-alpha.2';
export const SUPPORTED_LOCALES = Object.keys(localeConfigs);
