/**
 * Core translation engine — exported separately for tree-shaking
 *
 * import { I18nCore } from '@elmoorx/i18n/core';
 * const i18n = new I18nCore();
 */

export { I18nCore } from './index.js';
export type { Locale, TranslationValue, Dictionary, TranslateOptions, LocaleConfig } from './index.js';
