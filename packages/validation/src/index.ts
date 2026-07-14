/**
 * @elmoorx/validation — Schema Validation (Zod-like)
 * ============================================
 * Type-safe validation with runtime type checking.
 *
 *   import { v } from "@elmoorx/validation";
 *   const schema = v.object({
 *     name: v.string().min(2),
 *     email: v.string().email(),
 *     age: v.number().min(18).max(120),
 *   });
 *   const result = schema.parse({ name: "Amir", email: "a@b.com", age: 25 });
 */

// ============ TYPES ============

export type Schema<T = unknown> = {
  parse(value: unknown): T;
  safeParse(value: unknown): { success: true; data: T } | { success: false; error: ValidationError[] };
  optional(): Schema<T | undefined>;
  nullable(): Schema<T | null>;
  default(val: T): Schema<T>;
  transform(fn: (val: T) => T): Schema<T>;
  refine(fn: (val: T) => boolean, message?: string): Schema<T>;
};

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

type ParseResult<T> = { success: true; data: T } | { success: false; error: ValidationError[] };

// ============ BASE SCHEMA ============

abstract class BaseSchema<T> implements Schema<T> {
  protected isOptional = false;
  protected isNullable = false;
  protected defaultValue?: T;
  protected hasDefault = false;
  protected transforms: ((val: T) => T)[] = [];
  protected refinements: { fn: (val: T) => boolean; message: string }[] = [];

  optional(): Schema<T | undefined> {
    this.isOptional = true;
    return this as unknown as Schema<T | undefined>;
  }

  nullable(): Schema<T | null> {
    this.isNullable = true;
    return this as unknown as Schema<T | null>;
  }

  default(val: T): Schema<T> {
    this.defaultValue = val;
    this.hasDefault = true;
    return this;
  }

  transform(fn: (val: T) => T): Schema<T> {
    this.transforms.push(fn);
    return this;
  }

  refine(fn: (val: T) => boolean, message = "Invalid value"): Schema<T> {
    this.refinements.push({ fn, message });
    return this;
  }

  parse(value: unknown): T {
    const result = this.safeParse(value);
    if (!result.success) {
      const messages = result.error.map(e => `${e.path}: ${e.message}`).join(", ");
      throw new Error(`Validation failed: ${messages}`);
    }
    return result.data;
  }

  safeParse(value: unknown): ParseResult<T> {
    // Handle undefined
    if (value === undefined) {
      if (this.isOptional) return { success: true, data: undefined as unknown as T };
      if (this.hasDefault) return { success: true, data: this.defaultValue as T };
      return { success: false, error: [{ path: "", message: "Required", code: "required" }] };
    }

    // Handle null
    if (value === null) {
      if (this.isNullable) return { success: true, data: null as unknown as T };
      return { success: false, error: [{ path: "", message: "Cannot be null", code: "null" }] };
    }

    // Use default if value is undefined and default exists
    if (this.hasDefault && value === undefined) {
      value = this.defaultValue;
    }

    // Validate type
    const typeResult = this.validateType(value);
    if (!typeResult.success) return typeResult;

    let data = typeResult.data;

    // Apply transforms
    for (const transform of this.transforms) {
      data = transform(data);
    }

    // Apply refinements
    for (const ref of this.refinements) {
      if (!ref.fn(data)) {
        return { success: false, error: [{ path: "", message: ref.message, code: "refine" }] };
      }
    }

    return { success: true, data };
  }

  protected abstract validateType(value: unknown): ParseResult<T>;
}

// ============ STRING SCHEMA ============

class StringSchema extends BaseSchema<string> {
  private minLen?: number;
  private maxLen?: number;
  private pattern?: RegExp;
  private emailCheck = false;
  private urlCheck = false;
  private trim_ = false;
  private toLower = false;
  private toUpper = false;

  min(n: number, _message?: string): this { this.minLen = n; return this; }
  max(n: number, _message?: string): this { this.maxLen = n; return this; }
  regex(re: RegExp, _message?: string): this { this.pattern = re; return this; }
  email(_message?: string): this { this.emailCheck = true; return this; }
  url(_message?: string): this { this.urlCheck = true; return this; }
  trim(): this { this.trim_ = true; this.transforms.push(s => s.trim()); return this; }
  lowercase(): this { this.toLower = true; this.transforms.push(s => s.toLowerCase()); return this; }
  uppercase(): this { this.toUpper = true; this.transforms.push(s => s.toUpperCase()); return this; }

  protected validateType(value: unknown): ParseResult<string> {
    if (typeof value !== "string") {
      return { success: false, error: [{ path: "", message: "Expected string", code: "type" }] };
    }

    if (this.minLen !== undefined && value.length < this.minLen) {
      return { success: false, error: [{ path: "", message: `Must be at least ${this.minLen} characters`, code: "min" }] };
    }

    if (this.maxLen !== undefined && value.length > this.maxLen) {
      return { success: false, error: [{ path: "", message: `Must be at most ${this.maxLen} characters`, code: "max" }] };
    }

    if (this.pattern && !this.pattern.test(value)) {
      return { success: false, error: [{ path: "", message: "Invalid format", code: "regex" }] };
    }

    if (this.emailCheck && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return { success: false, error: [{ path: "", message: "Invalid email", code: "email" }] };
    }

    if (this.urlCheck) {
      try { new URL(value); } catch {
        return { success: false, error: [{ path: "", message: "Invalid URL", code: "url" }] };
      }
    }

    return { success: true, data: value };
  }
}

// ============ NUMBER SCHEMA ============

class NumberSchema extends BaseSchema<number> {
  private minVal?: number;
  private maxVal?: number;
  private intCheck = false;
  private positive_ = false;
  private negative_ = false;

  min(n: number): this { this.minVal = n; return this; }
  max(n: number): this { this.maxVal = n; return this; }
  int(): this { this.intCheck = true; return this; }
  positive(): this { this.positive_ = true; return this; }
  negative(): this { this.negative_ = true; return this; }

  protected validateType(value: unknown): ParseResult<number> {
    if (typeof value !== "number" || isNaN(value)) {
      return { success: false, error: [{ path: "", message: "Expected number", code: "type" }] };
    }

    if (this.minVal !== undefined && value < this.minVal) {
      return { success: false, error: [{ path: "", message: `Must be at least ${this.minVal}`, code: "min" }] };
    }

    if (this.maxVal !== undefined && value > this.maxVal) {
      return { success: false, error: [{ path: "", message: `Must be at most ${this.maxVal}`, code: "max" }] };
    }

    if (this.intCheck && !Number.isInteger(value)) {
      return { success: false, error: [{ path: "", message: "Must be an integer", code: "int" }] };
    }

    if (this.positive_ && value <= 0) {
      return { success: false, error: [{ path: "", message: "Must be positive", code: "positive" }] };
    }

    if (this.negative_ && value >= 0) {
      return { success: false, error: [{ path: "", message: "Must be negative", code: "negative" }] };
    }

    return { success: true, data: value };
  }
}

// ============ BOOLEAN SCHEMA ============

class BooleanSchema extends BaseSchema<boolean> {
  protected validateType(value: unknown): ParseResult<boolean> {
    if (typeof value !== "boolean") {
      return { success: false, error: [{ path: "", message: "Expected boolean", code: "type" }] };
    }
    return { success: true, data: value };
  }
}

// ============ ARRAY SCHEMA ============

class ArraySchema<T> extends BaseSchema<T[]> {
  private minLen?: number;
  private maxLen?: number;
  private nonEmpty = false;

  constructor(private itemSchema: Schema<T>) { super(); }

  min(n: number): this { this.minLen = n; return this; }
  max(n: number): this { this.maxLen = n; return this; }
  nonempty(): this { this.nonEmpty = true; this.minLen = 1; return this; }

  protected validateType(value: unknown): ParseResult<T[]> {
    if (!Array.isArray(value)) {
      return { success: false, error: [{ path: "", message: "Expected array", code: "type" }] };
    }

    if (this.minLen !== undefined && value.length < this.minLen) {
      return { success: false, error: [{ path: "", message: `Must have at least ${this.minLen} items`, code: "min" }] };
    }

    if (this.maxLen !== undefined && value.length > this.maxLen) {
      return { success: false, error: [{ path: "", message: `Must have at most ${this.maxLen} items`, code: "max" }] };
    }

    const result: T[] = [];
    for (let i = 0; i < value.length; i++) {
      const itemResult = this.itemSchema.safeParse(value[i]);
      if (!itemResult.success) {
        const errors = itemResult.error.map(e => ({ ...e, path: `[${i}]${e.path ? "." + e.path : ""}` }));
        return { success: false, error: errors };
      }
      result.push(itemResult.data);
    }

    return { success: true, data: result };
  }
}

// ============ OBJECT SCHEMA ============

class ObjectSchema<T extends Record<string, unknown>> extends BaseSchema<T> {
  private shape: Record<string, Schema<unknown>>;
  private strict_ = false;

  constructor(shape: Record<string, Schema<unknown>>) {
    super();
    this.shape = shape;
  }

  strict(): this { this.strict_ = true; return this; }

  protected validateType(value: unknown): ParseResult<T> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return { success: false, error: [{ path: "", message: "Expected object", code: "type" }] };
    }

    const result: Record<string, unknown> = {};
    const valueRecord = value as Record<string, unknown>;
    const errors: ValidationError[] = [];

    for (const [key, schema] of Object.entries(this.shape)) {
      const fieldResult = schema.safeParse(valueRecord[key]);
      if (!fieldResult.success) {
        for (const err of fieldResult.error) {
          errors.push({ ...err, path: err.path ? `${key}.${err.path}` : key });
        }
      } else {
        result[key] = fieldResult.data;
      }
    }

    // Check for extra keys in strict mode
    if (this.strict_) {
      for (const key of Object.keys(valueRecord)) {
        if (!(key in this.shape)) {
          errors.push({ path: key, message: "Unexpected key", code: "strict" });
        }
      }
    }

    if (errors.length > 0) return { success: false, error: errors };
    return { success: true, data: result as T };
  }
}

// ============ UNION SCHEMA ============

class UnionSchema<T> extends BaseSchema<T> {
  constructor(private schemas: Schema<unknown>[]) { super(); }

  protected validateType(value: unknown): ParseResult<T> {
    const errors: ValidationError[] = [];
    for (const schema of this.schemas) {
      const result = schema.safeParse(value);
      if (result.success) return result as ParseResult<T>;
      errors.push(...result.error);
    }
    return { success: false, error: [{ path: "", message: "No matching type", code: "union" }] };
  }
}

// ============ ENUM SCHEMA ============

class EnumSchema<T extends string> extends BaseSchema<T> {
  constructor(private values: readonly T[]) { super(); }

  protected validateType(value: unknown): ParseResult<T> {
    if (!this.values.includes(value as T)) {
      return { success: false, error: [{ path: "", message: `Must be one of: ${this.values.join(", ")}`, code: "enum" }] };
    }
    return { success: true, data: value as T };
  }
}

// ============ LITERAL SCHEMA ============

class LiteralSchema<T extends string | number | boolean> extends BaseSchema<T> {
  constructor(private expected: T) { super(); }

  protected validateType(value: unknown): ParseResult<T> {
    if (value !== this.expected) {
      return { success: false, error: [{ path: "", message: `Must be ${JSON.stringify(this.expected)}`, code: "literal" }] };
    }
    return { success: true, data: value as T };
  }
}

// ============ DATE SCHEMA ============

class DateSchema extends BaseSchema<Date> {
  private minDate?: Date;
  private maxDate?: Date;

  min(d: Date): this { this.minDate = d; return this; }
  max(d: Date): this { this.maxDate = d; return this; }

  protected validateType(value: unknown): ParseResult<Date> {
    let date: Date;
    if (value instanceof Date) {
      date = value;
    } else if (typeof value === "string" || typeof value === "number") {
      date = new Date(value);
    } else {
      return { success: false, error: [{ path: "", message: "Expected date", code: "type" }] };
    }

    if (isNaN(date.getTime())) {
      return { success: false, error: [{ path: "", message: "Invalid date", code: "invalid" }] };
    }

    if (this.minDate && date < this.minDate) {
      return { success: false, error: [{ path: "", message: `Must be after ${this.minDate.toISOString()}`, code: "min" }] };
    }

    if (this.maxDate && date > this.maxDate) {
      return { success: false, error: [{ path: "", message: `Must be before ${this.maxDate.toISOString()}`, code: "max" }] };
    }

    return { success: true, data: date };
  }
}

// ============ ANY / UNKNOWN ============

class AnySchema extends BaseSchema<unknown> {
  protected validateType(value: unknown): ParseResult<unknown> {
    return { success: true, data: value };
  }
}

// ============ FACTORY ============

export const v = {
  string: () => new StringSchema(),
  number: () => new NumberSchema(),
  boolean: () => new BooleanSchema(),
  array: <T>(item: Schema<T>) => new ArraySchema<T>(item),
  object: <T extends Record<string, unknown>>(shape: { [K in keyof T]: Schema<T[K]> }) =>
    new ObjectSchema<T>(shape as unknown as Record<string, Schema<unknown>>),
  union: <T>(...schemas: Schema<unknown>[]) => new UnionSchema<T>(schemas),
  enum: <T extends string>(values: readonly T[]) => new EnumSchema<T>(values),
  literal: <T extends string | number | boolean>(val: T) => new LiteralSchema<T>(val),
  date: () => new DateSchema(),
  any: () => new AnySchema(),
};

// ============ HELPER ============

export function validate<T>(schema: Schema<T>, value: unknown): { valid: boolean; data?: T; errors?: ValidationError[] } {
  const result = schema.safeParse(value);
  if (result.success) return { valid: true, data: result.data };
  return { valid: false, errors: result.error };
}
