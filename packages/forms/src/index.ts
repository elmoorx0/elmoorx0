/**
 * Elmoorx Forms — Form handling + validation
 * ============================================
 * Declarative form validation inspired by Vue Use / React Hook Form.
 *
 *   const form = useForm({
 *     email: { value: '', validate: v => v.includes('@') || 'Invalid email' },
 *     password: { value: '', validate: v => v.length >= 8 || 'Min 8 chars' },
 *   });
 *
 *   form.email.value       // current value
 *   form.email.error       // validation error (null if valid)
 *   form.submit(async (values) => { ... })
 *
 * Bundle impact: ~380 bytes gzipped
 */

import { $state } from "@elmoorx/runtime";

export interface FieldConfig {
  initialValue?: unknown;
  validate?: (value: unknown, allValues: Record<string, unknown>) => string | true | Promise<string | true>;
  // Transform value before validation
  transform?: (value: unknown) => unknown;
  // Required (defaults to false)
  required?: boolean;
  // Custom required message
  requiredMessage?: string;
}

export interface Field<T = unknown> {
  value: T;
  error: string | null;
  touched: boolean;
  dirty: boolean;
  setValue: (v: T) => void;
  setTouched: () => void;
  setError: (e: string | null) => void;
  reset: () => void;
}

export interface FormInstance<T extends Record<string, FieldConfig>> {
  fields: { [K in keyof T]: Field } & Record<string, Field>;
  values: () => Record<string, unknown>;
  errors: () => Record<string, string | null>;
  isValid: () => boolean;
  isSubmitting: () => boolean;
  submit: (handler: (values: Record<string, unknown>) => Promise<void> | void) => Promise<void>;
  reset: () => void;
  validate: () => Promise<boolean>;
}

/**
 * Create a reactive form with validation.
 */
export function useForm<T extends Record<string, FieldConfig>>(
  config: T
): FormInstance<T> {
  const fields: Record<string, Field> = {};
  const isSubmitting = $state(false);

  for (const [name, fieldConfig] of Object.entries(config)) {
    const value = $state(fieldConfig.initialValue ?? "");
    const error = $state<string | null>(null);
    const touched = $state(false);
    const dirty = $state(false);

    fields[name] = {
      get value() { return value(); },
      get error() { return error(); },
      get touched() { return touched(); },
      get dirty() { return dirty(); },
      setValue: (v) => {
        const transformed = fieldConfig.transform ? fieldConfig.transform(v) : v;
        value.set(transformed as never);
        dirty.set(true);
        // Validate on change if already touched
        if (touched()) {
          validateField(name);
        }
      },
      setTouched: () => {
        touched.set(true);
        validateField(name);
      },
      setError: (e) => error.set(e),
      reset: () => {
        value.set(fieldConfig.initialValue ?? "");
        error.set(null);
        touched.set(false);
        dirty.set(false);
      },
    };
  }

  async function validateField(name: string): Promise<boolean> {
    const fieldConfig = config[name];
    const field = fields[name];
    const value = field.value;

    // Required check
    if (fieldConfig.required && (!value || value === "")) {
      field.setError(fieldConfig.requiredMessage || "This field is required");
      return false;
    }

    // Custom validation
    if (fieldConfig.validate) {
      const result = await fieldConfig.validate(value, getAllValues());
      if (result === true) {
        field.setError(null);
        return true;
      }
      field.setError(result);
      return false;
    }

    field.setError(null);
    return true;
  }

  function getAllValues(): Record<string, unknown> {
    const values: Record<string, unknown> = {};
    for (const [name, field] of Object.entries(fields)) {
      values[name] = field.value;
    }
    return values;
  }

  async function validateAll(): Promise<boolean> {
    let valid = true;
    for (const name of Object.keys(config)) {
      const ok = await validateField(name);
      if (!ok) valid = false;
    }
    return valid;
  }

  return {
    fields: fields as { [K in keyof T]: Field } & Record<string, Field>,
    values: () => getAllValues(),
    errors: () => {
      const errs: Record<string, string | null> = {};
      for (const [name, field] of Object.entries(fields)) {
        errs[name] = field.error;
      }
      return errs;
    },
    isValid: () => {
      for (const field of Object.values(fields)) {
        if (field.error) return false;
      }
      return true;
    },
    isSubmitting: () => isSubmitting(),
    submit: async (handler) => {
      isSubmitting.set(true);
      try {
        const valid = await validateAll();
        if (!valid) return;
        await handler(getAllValues());
      } finally {
        isSubmitting.set(false);
      }
    },
    reset: () => {
      for (const field of Object.values(fields)) {
        field.reset();
      }
    },
    validate: validateAll,
  };
}

/**
 * Built-in validators.
 */
export const validators = {
  required: (msg = "Required"): (v: unknown) => string | true =>
    (v) => (v != null && v !== "" ? true : msg),

  email: (msg = "Invalid email"): (v: unknown) => string | true =>
    (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)) ? true : msg),

  min: (n: number, msg?: string): (v: unknown) => string | true =>
    (v) => (Number(v) >= n ? true : msg || `Must be at least ${n}`),

  max: (n: number, msg?: string): (v: unknown) => string | true =>
    (v) => (Number(v) <= n ? true : msg || `Must be at most ${n}`),

  minLength: (n: number, msg?: string): (v: unknown) => string | true =>
    (v) => (String(v).length >= n ? true : msg || `Must be at least ${n} characters`),

  maxLength: (n: number, msg?: string): (v: unknown) => string | true =>
    (v) => (String(v).length <= n ? true : msg || `Must be at most ${n} characters`),

  pattern: (re: RegExp, msg = "Invalid format"): (v: unknown) => string | true =>
    (v) => (re.test(String(v)) ? true : msg),

  url: (msg = "Invalid URL"): (v: unknown) => string | true =>
    (v) => {
      try {
        new URL(String(v));
        return true;
      } catch {
        return msg;
      }
    },

  matches: (otherField: string, msg = "Must match"): (v: unknown, all: Record<string, unknown>) => string | true =>
    (v, all) => (v === all[otherField] ? true : msg),
};

/**
 * Combine multiple validators.
 *
 *   validate(
 *     validators.required(),
 *     validators.email(),
 *   )
 */
export function validate(
  ...validators: ((v: unknown, all: Record<string, unknown>) => string | true | Promise<string | true>)[]
): (v: unknown, all: Record<string, unknown>) => Promise<string | true> {
  return async (v, all) => {
    for (const validator of validators) {
      const result = await validator(v, all);
      if (result !== true) return result;
    }
    return true;
  };
}
