/**
 * @elmoorx/ui — Master Catalog
 * Total: 500 components organized in 10 categories
 *
 * Categories:
 *   1. Forms        (1-50)
 *   2. Layout       (51-110)
 *   3. Navigation   (111-160)
 *   4. Data Display (161-225)
 *   5. Feedback     (226-275)
 *   6. Media        (276-325)
 *   7. Inputs       (326-375)
 *   8. Overlays     (376-425)
 *   9. Typography   (426-475)
 *  10. Utility      (476-525)
 *  + Pro V2 + Specialty (extras)
 */

import { FORMS_COMPONENTS } from './forms.js';
import { LAYOUT_COMPONENTS } from './layout.js';
import { NAV_COMPONENTS } from './navigation.js';
import { DATA_COMPONENTS } from './data-display.js';
import { FEEDBACK_COMPONENTS } from './feedback.js';
import { MEDIA_COMPONENTS } from './media.js';
import { INPUT_COMPONENTS } from './inputs.js';
import { OVERLAY_COMPONENTS } from './overlays.js';
import { TYPOGRAPHY_COMPONENTS } from './typography.js';
import { UTILITY_COMPONENTS } from './utility.js';
import { PRO_COMPONENTS_V2 } from './pro-v2.js';
import { SPECIALTY_COMPONENTS } from './specialty.js';

// Count helpers
function count(obj: Record<string, unknown>): number {
  return Object.keys(obj).length;
}

export const CATALOG = {
  forms: FORMS_COMPONENTS,
  layout: LAYOUT_COMPONENTS,
  navigation: NAV_COMPONENTS,
  dataDisplay: DATA_COMPONENTS,
  feedback: FEEDBACK_COMPONENTS,
  media: MEDIA_COMPONENTS,
  inputs: INPUT_COMPONENTS,
  overlays: OVERLAY_COMPONENTS,
  typography: TYPOGRAPHY_COMPONENTS,
  utility: UTILITY_COMPONENTS,
  pro: PRO_COMPONENTS_V2,
  specialty: SPECIALTY_COMPONENTS,
};

export const TOTAL_COUNT =
  count(FORMS_COMPONENTS) +
  count(LAYOUT_COMPONENTS) +
  count(NAV_COMPONENTS) +
  count(DATA_COMPONENTS) +
  count(FEEDBACK_COMPONENTS) +
  count(MEDIA_COMPONENTS) +
  count(INPUT_COMPONENTS) +
  count(OVERLAY_COMPONENTS) +
  count(TYPOGRAPHY_COMPONENTS) +
  count(UTILITY_COMPONENTS) +
  count(PRO_COMPONENTS_V2) +
  count(SPECIALTY_COMPONENTS);

export const CATEGORY_COUNTS = {
  forms: count(FORMS_COMPONENTS),
  layout: count(LAYOUT_COMPONENTS),
  navigation: count(NAV_COMPONENTS),
  dataDisplay: count(DATA_COMPONENTS),
  feedback: count(FEEDBACK_COMPONENTS),
  media: count(MEDIA_COMPONENTS),
  inputs: count(INPUT_COMPONENTS),
  overlays: count(OVERLAY_COMPONENTS),
  typography: count(TYPOGRAPHY_COMPONENTS),
  utility: count(UTILITY_COMPONENTS),
  pro: count(PRO_COMPONENTS_V2),
  specialty: count(SPECIALTY_COMPONENTS),
};

export function listAllComponents(): string[] {
  return Object.values(CATALOG).flatMap(category => Object.keys(category));
}

export function getComponent(name: string): unknown {
  for (const category of Object.values(CATALOG)) {
    const cat = category as Record<string, unknown>;
    if (name in cat) return cat[name];
  }
  return null;
}

export function getComponentsByCategory(category: keyof typeof CATALOG): string[] {
  return Object.keys(CATALOG[category] ?? {});
}

// Re-export everything
export * from './forms.js';
export * from './layout.js';
export * from './navigation.js';
export * from './data-display.js';
export * from './feedback.js';
export * from './media.js';
export * from './inputs.js';
export * from './overlays.js';
export * from './typography.js';
export * from './utility.js';
export * from './pro-v2.js';
export * from './specialty.js';
