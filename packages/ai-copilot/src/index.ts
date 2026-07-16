export { generate } from "./generate.js";
export type { GenerateOptions } from "./generate.js";

// Pure helpers — exported for unit testing. Not part of the public CLI
// API, but exposed so tests can verify the template-dispatch logic
// without invoking the file-writing `generate()` entrypoint.
export { extractSubject, toPascalCase, generateFromTemplate } from "./generate.js";
