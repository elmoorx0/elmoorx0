/**
 * @elmoorx/cli — `elmoorx generate "<description>"`
 * ============================================
 * Thin wrapper around `@elmoorx/ai-copilot` that exposes the same
 * `generate()` API the CLI entrypoint imports.
 *
 * Keeping this in its own module lets the CLI lazily import it
 * (avoids loading template strings on every CLI invocation).
 */

export { generate } from "@elmoorx/ai-copilot";
export type { GenerateOptions } from "@elmoorx/ai-copilot";
