/**
 * Format helpers — Number, date, currency, relative time
 *
 * Pure functions, use Intl under the hood.
 * Tree-shakeable: import only what you need.
 */

import type { Locale } from './index.js';

export function formatNumber(value: number, locale: Locale = 'en', options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatDate(date: Date | number | string, locale: Locale = 'en', options?: Intl.DateTimeFormatOptions): string {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(locale, options).format(d);
}

export function formatCurrency(value: number, currency: string, locale: Locale = 'en'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
}

export function formatRelative(seconds: number, locale: Locale = 'en'): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(Math.round(seconds), 'second');
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour');
  if (abs < 2592000) return rtf.format(Math.round(seconds / 86400), 'day');
  if (abs < 31536000) return rtf.format(Math.round(seconds / 2592000), 'month');
  return rtf.format(Math.round(seconds / 31536000), 'year');
}

export function formatList(items: string[], locale: Locale = 'en'): string {
  return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(items);
}

export function formatDuration(seconds: number): string {
  // Guard against negative durations (e.g. countdown timers) —
  // previously produced "-2:-30" garbage for negative input.
  if (seconds < 0) return '-' + formatDuration(-seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatBytes(bytes: number, locale: Locale = 'en'): string {
  // Guards: negative, NaN, Infinity, and overflow beyond PB all
  // previously produced "NaN undefined" / "∞ undefined" garbage.
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  return `${formatNumber(bytes / Math.pow(1024, i), locale, { maximumFractionDigits: 1 })} ${units[i]}`;
}
