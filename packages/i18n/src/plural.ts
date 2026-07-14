/**
 * Standalone plural function — Use without full i18n
 *
 * import { plural, getPluralForm } from '@elmoorx/i18n/plural';
 *
 * plural(5, {
 *   zero: 'لا عناصر',
 *   one: 'عنصر واحد',
 *   two: 'عنصران',
 *   few: '{count} عناصر',
 *   many: '{count} عنصراً',
 *   other: '{count} عنصر'
 * }, 'ar');
 * // → "5 عناصر"
 *
 * Plural rules are imported from index.ts (single source of truth).
 * The previous implementation maintained a duplicate table that
 * drifted — it was missing cs, sk, hr, sr, ro, sv, da, no, fi, el,
 * hu, ms, bn rules that index.ts had, causing wrong plural forms
 * for those 13 languages.
 */

import { pluralRules } from './index.js';
import type { Locale } from './index.js';

export type PluralForm = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
export type PluralForms = Partial<Record<PluralForm, string>> & { other: string };

export function getPluralForm(count: number, locale: Locale): PluralForm {
  const base = locale.split('-')[0];
  const rule = pluralRules[base] || pluralRules[locale] || pluralRules['en'];
  return rule(count) as PluralForm;
}

export function plural(count: number, forms: PluralForms, locale: Locale = 'en'): string {
  const form = getPluralForm(count, locale);
  const template = forms[form] || forms.other;
  // SECURITY: use split/join instead of RegExp to avoid regex injection
  // (count is a number, so this is safe either way, but consistent
  // with the interpolate() fix in index.ts).
  return template.split('{count}').join(String(count));
}
