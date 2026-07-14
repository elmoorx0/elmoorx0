/**
 * @elmoorx/ai-dev — AI-assisted dev tooling: test generation, bug detection, code review
 * ============================================
 * Programmatic helpers used by `elmoorx ai` commands. These helpers are
 * model-agnostic — pass any OpenAI-compatible chat function.
 *
 *   import { generateTests, detectBugs } from "@elmoorx/ai-dev";
 *
 *   const tests = await generateTests(sourceCode, { chat });
 *   const bugs = await detectBugs(sourceCode, { chat });
 */

export interface ChatFn {
  (prompt: string): Promise<string>;
}

export interface AiDevOptions {
  chat: ChatFn;
  language?: "typescript" | "javascript";
  framework?: "elmoorx" | "react" | "vue" | "svelte" | "none";
}

export async function generateTests(
  source: string,
  opts: AiDevOptions
): Promise<string> {
  const lang = opts.language ?? "typescript";
  const framework = opts.framework ?? "elmoorx";
  const prompt = `You are an expert test author. Generate comprehensive ${lang} tests
for the following source code using the ${framework} testing conventions.
Use describe/it/expect style. Cover happy paths, edge cases, and error paths.

Source:
\`\`\`
${source}
\`\`\`

Return only the test file content, no prose.`;
  return opts.chat(prompt);
}

export async function detectBugs(
  source: string,
  opts: AiDevOptions
): Promise<Array<{ line: number; severity: "low" | "med" | "high"; message: string }>> {
  const prompt = `You are a security-aware code reviewer. Inspect this code and
return a JSON array of issues, each with { "line": number, "severity": "low|med|high", "message": string }.
Return ONLY the JSON array, no other text.

\`\`\`
${source}
\`\`\``;
  const out = await opts.chat(prompt);
  try {
    const parsed = JSON.parse(out);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export async function reviewCode(
  source: string,
  opts: AiDevOptions
): Promise<string> {
  const prompt = `Review the following code for correctness, readability, and
performance. Provide actionable, specific feedback in Markdown.

\`\`\`
${source}
\`\`\``;
  return opts.chat(prompt);
}

export async function analyzePerformance(
  source: string,
  opts: AiDevOptions
): Promise<string> {
  const prompt = `Analyze the following code for performance issues.
Identify hot paths, unnecessary allocations, and potential algorithmic
improvements. Respond in Markdown with concrete suggestions.

\`\`\`
${source}
\`\`\``;
  return opts.chat(prompt);
}

export const VERSION = "3.0.0-alpha.2";
