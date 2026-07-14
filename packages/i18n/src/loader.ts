/**
 * Async loader — Load translations on demand
 *
 * Features:
 * - Lazy load locale files (only when needed)
 * - Parallel loading
 * - Preload critical locales
 * - Cache loaded translations
 * - SSR support (load all before render)
 *
 * Usage:
 *
 *   import { i18nLoader } from '@elmoorx/i18n/loader';
 *
 *   // Register loaders
 *   i18nLoader.register('ar', () => import('./locales/ar.ts'));
 *   i18nLoader.register('fr', () => import('./locales/fr.ts'));
 *
 *   // Load on demand
 *   await i18nLoader.load('ar');
 *   i18n.locale = 'ar';
 *
 *   // Preload
 *   i18nLoader.preload(['fr', 'de']);
 */

import { i18n, type Locale, type Dictionary } from './index.js';

type Loader = () => Promise<Dictionary>;

class I18nLoader {
  private loaders = new Map<string, Loader>();
  private loaded = new Set<string>();
  private loading = new Map<string, Promise<void>>();
  private preloadQueue: Locale[] = [];

  /** Register a locale loader */
  register(locale: Locale, loader: Loader): void {
    this.loaders.set(locale, loader);
  }

  /** Register multiple loaders */
  registerAll(loaders: Record<string, Loader>): void {
    for (const [locale, loader] of Object.entries(loaders)) {
      this.register(locale, loader);
    }
  }

  /** Load a locale (lazy).
   *
   * Returns a Promise that resolves when the locale is loaded (or
   * rejects on failure). Previously the .catch() handler swallowed
   * errors and returned undefined — callers couldn't distinguish
   * success from failure. Now errors propagate.
   */
  async load(locale: Locale): Promise<void> {
    // Already loaded
    if (this.loaded.has(locale)) return;

    // Already loading — return the in-flight promise so callers share
    // the same load result (success or failure).
    if (this.loading.has(locale)) {
      return (this.loading.get(locale) as NonNullable<ReturnType<typeof this.loading.get>>);
    }

    // Get loader
    const loader = this.loaders.get(locale);
    if (!loader) {
      // Try base locale (e.g. 'ar-SA' → 'ar')
      const base = locale.split('-')[0];
      if (base !== locale) return this.load(base);
      return;
    }

    // Load. Errors propagate to the caller (was swallowed).
    const promise = loader()
      .then((dict) => {
        i18n.register(locale, dict);
        this.loaded.add(locale);
        this.loading.delete(locale);
      })
      .catch((err) => {
        this.loading.delete(locale);
        console.error(`Failed to load locale ${locale}:`, err);
        // Re-throw so the caller knows the load failed.
        throw err;
      });

    this.loading.set(locale, promise);
    return promise;
  }

  /** Load multiple locales in parallel */
  async loadAll(locales: Locale[]): Promise<void> {
    await Promise.all(locales.map(l => this.load(l)));
  }

  /** Preload locales in background (non-blocking) */
  preload(locales: Locale[]): void {
    this.preloadQueue.push(...locales);
    this.processQueue();
  }

  /** Check if a locale is loaded */
  isLoaded(locale: Locale): boolean {
    return this.loaded.has(locale);
  }

  /** Get list of registered locales */
  getRegistered(): Locale[] {
    return Array.from(this.loaders.keys());
  }

  /** Get list of loaded locales */
  getLoaded(): Locale[] {
    return Array.from(this.loaded);
  }

  /** Unload a locale (free memory).
   *
   * Also clears the in-flight loading promise so a subsequent load()
   * re-fetches from scratch (was leaving stale promise that would
   * resolve to the old dictionary).
   */
  unload(locale: Locale): void {
    i18n.unregister(locale);
    this.loaded.delete(locale);
    this.loading.delete(locale);
  }

  /** SSR: Load all registered locales before render */
  async loadAllForSSR(): Promise<void> {
    const all = this.getRegistered();
    await this.loadAll(all);
  }

  // ─── Internal ──

  /**
   * Process the preload queue serially.
   *
   * FIXED: previously multiple concurrent processQueue() loops could
   * run if preload() was called rapidly. The `await this.load(locale)`
   * yielded to the event loop, allowing a second processQueue() to
   * start and interleave. Now guarded by an isProcessing flag.
   */
  private isProcessing = false;
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return; // another loop is already draining
    this.isProcessing = true;
    try {
      while (this.preloadQueue.length > 0) {
        const locale = (this.preloadQueue.shift() as NonNullable<ReturnType<typeof this.preloadQueue.shift>>);
        try {
          await this.load(locale);
        } catch {
          // load() already logged the error; continue with the next locale
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

export const i18nLoader = new I18nLoader();

// ─── Quick helpers ──────────────────────────────────────────────────────────

export async function loadLocale(locale: Locale): Promise<void> {
  return i18nLoader.load(locale);
}

export async function loadLocales(locales: Locale[]): Promise<void> {
  return i18nLoader.loadAll(locales);
}

export function preloadLocales(locales: Locale[]): void {
  i18nLoader.preload(locales);
}
