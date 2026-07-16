/**
 * Reactive translation hooks — Real-time UI updates
 *
 * When locale changes, all subscribed components re-render automatically.
 *
 * Usage with Elmoorx signals:
 *
 *   import { $state, $effect } from '@elmoorx/runtime';
 *   import { i18n } from '@elmoorx/i18n';
 *
 *   // Component
 *   function Header() {
 *     const locale = $state(i18n.locale);
 *     i18n.onChange(l => locale.set(l));
 *     return <h1>{i18n.t('welcome', { name: 'Ahmed' })}</h1>;
 *   }
 *
 * For React-like frameworks:
 *
 *   import { useTranslation } from '@elmoorx/i18n/reactive';
 *
 *   function Header() {
 *     const { t, locale, setLocale } = useTranslation();
 *     return <h1>{t('welcome', { name: 'Ahmed' })}</h1>;
 *   }
 */

import { i18n, type Locale, type TranslateOptions } from './index.js';

// ─── Reactive state ─────────────────────────────────────────────────────────

/**
 * A minimal reactive signal contract the i18n module can drive.
 * Both Elmoorx `$state` and the built-in fallback implement it.
 */
export interface ReactiveLocaleSignal {
  value: Locale;
  set(value: Locale): void;
}

let _reactiveLocale: ReactiveLocaleSignal | null = null;
let _initialized = false;

/**
 * Initialize reactive system.
 * Call once at app startup.
 *
 * @param signalFactory Optional factory that returns an object satisfying
 *   `ReactiveLocaleSignal`. When omitted, a plain fallback signal is used.
 */
export function initReactive(
  signalFactory?: (value: Locale) => ReactiveLocaleSignal,
): void {
  if (_initialized) return;
  _initialized = true;

  if (signalFactory) {
    _reactiveLocale = signalFactory(i18n.locale);
  } else {
    // Simple reactive implementation — closure-backed signal.
    let currentValue: Locale = i18n.locale;
    _reactiveLocale = {
      get value() {
        return currentValue;
      },
      set value(v: Locale) {
        currentValue = v;
      },
      set(v: Locale) {
        currentValue = v;
      },
    };
  }

  i18n.onChange((locale) => {
    if (_reactiveLocale) {
      _reactiveLocale.value = locale;
      _reactiveLocale.set?.(locale);
    }
  });
}

/**
 * Hook for reactive translation.
 *
 * Returns an object with `t`, `locale`, `setLocale`, `dir`, `isRTL`.
 * The `locale`/`dir`/`isRTL` are exposed as GETTERS (not snapshot
 * values) so consumers reading them inside a reactive context
 * ($effect, $computed) re-run when the locale changes.
 *
 * For signal-based frameworks (Elmoorx, SolidJS), read these getters
 * inside a tracked context:
 *
 *   const { t, locale } = useTranslation();
 *   $effect(() => { console.warn('locale changed to', locale()); });
 *
 * For React-like frameworks, you'll need to wrap with useState +
 * useEffect subscribing to onLocaleChange — the getter pattern alone
 * won't trigger React re-renders.
 *
 * The previous implementation returned snapshot values captured at
 * hook-call time — they never updated after the initial call. This
 * broke the core promise of "real-time UI updates" in the file header.
 */
export function useTranslation(): {
  t: (key: string, options?: TranslateOptions) => string;
  locale: () => Locale;
  setLocale: (locale: Locale) => void;
  dir: () => 'ltr' | 'rtl';
  isRTL: () => boolean;
} {
  if (!_initialized) initReactive();

  // Return GETTERS so consumers reading them inside a tracked context
  // (e.g. $effect) re-subscribe and re-run when the locale changes.
  return {
    t: (key: string, options?: TranslateOptions) => i18n.t(key, options),
    locale: () => i18n.locale,
    setLocale: (locale: Locale) => { i18n.locale = locale; },
    dir: () => i18n.dir,
    isRTL: () => i18n.isRTL(),
  };
}

/**
 * Subscribe to locale changes.
 * Returns unsubscribe function.
 */
export function onLocaleChange(fn: (locale: Locale) => void): () => void {
  return i18n.onChange(fn);
}

/**
 * Reactive translation getter.
 * Use in signal-based frameworks:
 *
 *   const title = computed(() => tr('app.title'));
 */
export function tr(key: string, options?: TranslateOptions): string {
  // Reading i18n.locale makes this reactive in signal systems
  void i18n.locale;
  return i18n.t(key, options);
}

/**
 * Batch translation — translate multiple keys at once.
 */
export function tBatch(keys: string[], options?: TranslateOptions): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of keys) {
    result[key] = i18n.t(key, options);
  }
  return result;
}

/**
 * Format number for current locale.
 */
export function formatNumber(value: number, locale?: Locale): string {
  const loc = locale || i18n.locale;
  return new Intl.NumberFormat(loc).format(value);
}

/**
 * Format date for current locale.
 */
export function formatDate(date: Date | number, locale?: Locale): string {
  const loc = locale || i18n.locale;
  return new Intl.DateTimeFormat(loc).format(date instanceof Date ? date : new Date(date));
}

/**
 * Format currency for current locale.
 */
export function formatCurrency(value: number, currency: string, locale?: Locale): string {
  const loc = locale || i18n.locale;
  return new Intl.NumberFormat(loc, { style: 'currency', currency }).format(value);
}

/**
 * Format relative time.
 */
export function formatRelative(seconds: number, locale?: Locale): string {
  const loc = locale || i18n.locale;
  const rtf = new Intl.RelativeTimeFormat(loc, { numeric: 'auto' });
  if (Math.abs(seconds) < 60) return rtf.format(Math.round(seconds), 'second');
  if (Math.abs(seconds) < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
  if (Math.abs(seconds) < 86400) return rtf.format(Math.round(seconds / 3600), 'hour');
  return rtf.format(Math.round(seconds / 86400), 'day');
}
