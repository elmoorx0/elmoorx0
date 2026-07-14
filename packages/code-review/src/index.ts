/**
 * @elmoorx/code-review — AI Code Review System
 * ============================================
 * AI-powered code review that finds bugs, security issues,
 * and suggests improvements — before you deploy.
 *
 *   import { h, reviewCode } from "@elmoorx/code-review";
 *   const report = await reviewCode(myComponentCode);
 *   // → { score: 92, issues: [...], suggestions: [...] }
 */

import { h, type ElmoorxNode } from "@elmoorx/runtime";

// ============ REVIEW TYPES ============

export interface CodeReviewReport {
  score: number;
  issues: CodeIssue[];
  suggestions: CodeSuggestion[];
  metrics: CodeMetrics;
  summary: string;
}

export interface CodeIssue {
  id: string;
  severity: "critical" | "warning" | "info" | "style";
  category: "bug" | "security" | "performance" | "accessibility" | "best-practice" | "typescript";
  title: string;
  description: string;
  line?: number;
  fix?: string;
}

export interface CodeSuggestion {
  id: string;
  type: "refactor" | "optimize" | "modernize" | "simplify";
  title: string;
  description: string;
  before: string;
  after: string;
  impact: "low" | "medium" | "high";
}

export interface CodeMetrics {
  lines: number;
  complexity: number;
  maintainability: number;
  readability: number;
  testability: number;
  bundleImpact: number;
}

// ============ CODE REVIEWER ============

class CodeReviewer {
  async review(code: string): Promise<CodeReviewReport> {
    const issues: CodeIssue[] = [];
    const suggestions: CodeSuggestion[] = [];

    // === SECURITY CHECKS ===
    issues.push(...this.checkSecurity(code));

    // === BUG CHECKS ===
    issues.push(...this.checkBugs(code));

    // === PERFORMANCE CHECKS ===
    issues.push(...this.checkPerformance(code));

    // === ACCESSIBILITY CHECKS ===
    issues.push(...this.checkAccessibility(code));

    // === BEST PRACTICES ===
    issues.push(...this.checkBestPractices(code));

    // === SUGGESTIONS ===
    suggestions.push(...this.generateSuggestions(code));

    // === METRICS ===
    const metrics = this.calculateMetrics(code);

    // === SCORE ===
    const score = this.calculateScore(issues, metrics);

    // === SUMMARY ===
    const summary = this.generateSummary(score, issues, metrics);

    return { score, issues, suggestions, metrics, summary };
  }

  // ============ SECURITY CHECKS ============

  private checkSecurity(code: string): CodeIssue[] {
    const issues: CodeIssue[] = [];

    // dangerouslySetInnerHTML
    if (code.includes("dangerouslySetInnerHTML")) {
      issues.push({
        id: "sec-xss-dangerous",
        severity: "critical",
        category: "security",
        title: "XSS vulnerability: dangerouslySetInnerHTML",
        description: "Using dangerouslySetInnerHTML allows XSS attacks. Use $html() from @elmoorx/runtime which auto-sanitizes.",
        fix: 'Replace: dangerouslySetInnerHTML={{ __html: x }}\nWith: $html(x)',
      });
    }

    // v-html
    if (code.includes("v-html")) {
      issues.push({
        id: "sec-xss-vhtml",
        severity: "critical",
        category: "security",
        title: "XSS vulnerability: v-html",
        description: "Using v-html allows XSS attacks. Use $html() instead.",
      });
    }

    // innerHTML
    if (code.includes(".innerHTML") && !code.includes("$html")) {
      issues.push({
        id: "sec-xss-innerhtml",
        severity: "warning",
        category: "security",
        title: "Potential XSS: innerHTML",
        description: "Direct innerHTML assignment can cause XSS. Consider using $html() for auto-sanitization.",
      });
    }

    // eval
    if (code.includes("eval(")) {
      issues.push({
        id: "sec-eval",
        severity: "critical",
        category: "security",
        title: "Security risk: eval()",
        description: "eval() allows arbitrary code execution. Remove it and use safer alternatives.",
      });
    }

    // Hardcoded secrets
    if (/api[_-]?key\s*=\s*["'][a-zA-Z0-9]{20,}["']/i.test(code)) {
      issues.push({
        id: "sec-hardcoded-key",
        severity: "critical",
        category: "security",
        title: "Hardcoded API key detected",
        description: "Never hardcode API keys in source code. Use environment variables.",
        fix: 'Use: const apiKey = process.env.API_KEY;',
      });
    }

    // HTTP (not HTTPS)
    if (/http:\/\/(?!localhost|127\.0\.0\.1)/.test(code)) {
      issues.push({
        id: "sec-http",
        severity: "warning",
        category: "security",
        title: "Insecure HTTP URL",
        description: "Use HTTPS for all external URLs to prevent man-in-the-middle attacks.",
      });
    }

    return issues;
  }

  // ============ BUG CHECKS ============

  private checkBugs(code: string): CodeIssue[] {
    const issues: CodeIssue[] = [];

    // Missing key in list
    if (code.includes(".map(") && !code.includes("key=") && !code.includes("key:")) {
      issues.push({
        id: "bug-missing-key",
        severity: "warning",
        category: "bug",
        title: "Missing key prop in list",
        description: "When rendering lists with .map(), each item should have a stable key prop for optimal rendering.",
        fix: 'items.map(item => h("li", { key: item.id }, item.name))',
      });
    }

    // useEffect without cleanup
    if (code.includes("$effect(") || code.includes("useEffect(")) {
      if (code.includes("setInterval") && !code.includes("clearInterval")) {
        issues.push({
          id: "bug-interval-leak",
          severity: "warning",
          category: "bug",
          title: "Memory leak: interval without cleanup",
          description: "setInterval inside $effect should return a cleanup function that clears the interval.",
          fix: '$effect(() => {\n  const id = setInterval(tick, 1000);\n  return () => clearInterval(id);\n});',
        });
      }
      if (code.includes("addEventListener") && !code.includes("removeEventListener")) {
        issues.push({
          id: "bug-listener-leak",
          severity: "warning",
          category: "bug",
          title: "Memory leak: event listener without cleanup",
          description: "addEventListener should be paired with removeEventListener in cleanup.",
        });
      }
    }

    // State update on unmounted component
    if (code.includes("setTimeout") && code.includes(".set(") && !code.includes("onCleanup")) {
      issues.push({
        id: "bug-timeout-leak",
        severity: "info",
        category: "bug",
        title: "Potential state update after unmount",
        description: "setTimeout callbacks may fire after component unmounts. Clear timeouts in onCleanup.",
      });
    }

    // Empty dependency array with external vars
    if (/\$effect\(\(\)\s*=>\s*\{[^}]+\},\s*\[\]\)/.test(code)) {
      issues.push({
        id: "bug-empty-deps",
        severity: "info",
        category: "bug",
        title: "Effect with empty dependencies",
        description: "This effect has empty deps but may reference external variables. Verify this is intentional.",
      });
    }

    return issues;
  }

  // ============ PERFORMANCE CHECKS ============

  private checkPerformance(code: string): CodeIssue[] {
    const issues: CodeIssue[] = [];

    // Large inline objects
    const styleMatches = code.match(/style\s*[:=]\s*\{[^}]{200,}\}/g);
    if (styleMatches) {
      issues.push({
        id: "perf-large-style",
        severity: "info",
        category: "performance",
        title: "Large inline style object",
        description: "Consider extracting large style objects to a constant or using CSS classes.",
      });
    }

    // Missing memo
    if (code.includes(".map(") && code.includes("filter(") && !code.includes("memo(") && !code.includes("useMemo")) {
      issues.push({
        id: "perf-missing-memo",
        severity: "info",
        category: "performance",
        title: "Consider memoizing computed list",
        description: "Filtering + mapping on every render is expensive. Wrap in useMemo or memo().",
        fix: 'const filtered = useMemo(() => items.filter(pred).map(fn), [items]);',
      });
    }

    // Console.log in production
    if (code.includes("console.log")) {
      issues.push({
        id: "perf-console-log",
        severity: "style",
        category: "performance",
        title: "console.log in production code",
        description: "Remove console.log statements before deploying to production.",
      });
    }

    // Inline function creation
    if ((code.match(/onClick\s*[:=]\s*\(/g) || []).length > 5) {
      issues.push({
        id: "perf-inline-functions",
        severity: "info",
        category: "performance",
        title: "Many inline event handlers",
        description: "Creating many inline functions on each render can cause unnecessary re-renders. Consider useCallback.",
      });
    }

    return issues;
  }

  // ============ ACCESSIBILITY CHECKS ============

  private checkAccessibility(code: string): CodeIssue[] {
    const issues: CodeIssue[] = [];

    // img without alt
    if (code.includes("<img") && !code.includes("alt=")) {
      issues.push({
        id: "a11y-img-alt",
        severity: "warning",
        category: "accessibility",
        title: "Images without alt text",
        description: "All images should have alt text for screen readers.",
        fix: 'h("img", { src: url, alt: "Description" })',
      });
    }

    // button without accessible name
    if (code.includes('h("button"') && !code.includes("aria-label")) {
      const emptyButtons = code.match(/h\(["']button["'],\s*\{[^}]*\}\s*,\s*["']["']\)/g);
      if (emptyButtons) {
        issues.push({
          id: "a11y-button-name",
          severity: "warning",
          category: "accessibility",
          title: "Buttons without accessible names",
          description: "Buttons should have text content or aria-label for screen readers.",
        });
      }
    }

    // onClick without onKeyDown
    if (code.includes("onClick") && !code.includes("onKeyDown") && !code.includes("onKeyPress")) {
      issues.push({
        id: "a11y-keyboard",
        severity: "info",
        category: "accessibility",
        title: "Click handler without keyboard support",
        description: "Interactive elements should also respond to keyboard events (Enter, Space).",
      });
    }

    return issues;
  }

  // ============ BEST PRACTICES ============

  private checkBestPractices(code: string): CodeIssue[] {
    const issues: CodeIssue[] = [];

    // var instead of const/let
    if (code.includes("var ")) {
      issues.push({
        id: "bp-var",
        severity: "style",
        category: "best-practice",
        title: "Use const/let instead of var",
        description: "var has function scope and can cause bugs. Use const (default) or let (when reassigning).",
      });
    }

    // == instead of ===
    if (code.includes(" == ") && !code.includes(" === ")) {
      issues.push({
        id: "bp-strict-equality",
        severity: "style",
        category: "best-practice",
        title: "Use strict equality (===)",
        description: "== does type coercion which can cause unexpected behavior. Use === instead.",
      });
    }

    // any type
    if (code.includes(": any") || code.includes("as any")) {
      issues.push({
        id: "bp-any-type",
        severity: "warning",
        category: "typescript",
        title: "Avoid 'any' type",
        description: "Using 'any' defeats TypeScript's type safety. Use 'unknown' or specific types.",
      });
    }

    // TODO/FIXME
    if (code.includes("TODO") || code.includes("FIXME") || code.includes("HACK")) {
      issues.push({
        id: "bp-todo",
        severity: "info",
        category: "best-practice",
        title: "Unresolved TODO/FIXME",
        description: "Code contains TODO or FIXME comments that should be resolved before production.",
      });
    }

    return issues;
  }

  // ============ SUGGESTIONS ============

  private generateSuggestions(code: string): CodeSuggestion[] {
    const suggestions: CodeSuggestion[] = [];

    // Suggest memo
    if (code.includes("function") && !code.includes("memo(")) {
      suggestions.push({
        id: "sug-memo",
        type: "optimize",
        title: "Wrap pure components in memo()",
        description: "Components that don't depend on external state can be memoized to skip unnecessary re-renders.",
        before: 'function ExpensiveList(props) {\n  return h("ul", null, props.items.map(...));\n}',
        after: 'const ExpensiveList = memo(function(props) {\n  return h("ul", null, props.items.map(...));\n});',
        impact: "medium",
      });
    }

    // Suggest $store instead of multiple $state
    const stateCount = (code.match(/\$state\(/g) || []).length;
    if (stateCount >= 3) {
      suggestions.push({
        id: "sug-store",
        type: "refactor",
        title: `Consider using $store instead of ${stateCount} $state calls`,
        description: "Multiple related $state calls can be combined into a single $store for cleaner code.",
        before: 'const name = $state("");\nconst email = $state("");\nconst age = $state(0);',
        after: 'const form = $store({\n  name: "",\n  email: "",\n  age: 0\n});',
        impact: "medium",
      });
    }

    // Suggest lazy loading
    if (code.includes("import(") && !code.includes("lazy(")) {
      suggestions.push({
        id: "sug-lazy",
        type: "optimize",
        title: "Use lazy() for dynamic imports",
        description: "Wrap dynamic imports in lazy() for better code splitting and prefetching.",
        before: 'const Chart = () => import("./Chart");',
        after: 'const Chart = lazy(() => import("./Chart"));',
        impact: "high",
      });
    }

    // Suggest async/await over .then()
    if (code.includes(".then(") && !code.includes("async")) {
      suggestions.push({
        id: "sug-async",
        type: "modernize",
        title: "Use async/await instead of .then()",
        description: "async/await is more readable and easier to debug than promise chains.",
        before: 'fetch(url).then(res => res.json()).then(data => console.warn(data));',
        after: 'const res = await fetch(url);\nconst data = await res.json();\nconsole.log(data);',
        impact: "low",
      });
    }

    return suggestions;
  }

  // ============ METRICS ============

  private calculateMetrics(code: string): CodeMetrics {
    const lines = code.split("\n").length;
    const conditions = (code.match(/if\s*\(/g) || []).length;
    const loops = (code.match(/for\s*\(|while\s*\(|\.map\(|\.forEach\(|\.filter\(/g) || []).length;
    const functions = (code.match(/function\s+\w+|=>\s*[{(]/g) || []).length;

    const complexity = conditions + loops * 2;
    const maintainability = Math.max(0, 100 - complexity * 3);
    const readability = Math.max(0, 100 - (lines > 200 ? 30 : 0) - (functions > 10 ? 20 : 0));
    const testability = Math.max(0, 100 - (complexity > 10 ? 30 : 0));
    const bundleImpact = Math.min(100, lines * 0.5);

    return {
      lines,
      complexity,
      maintainability: Math.round(maintainability),
      readability: Math.round(readability),
      testability: Math.round(testability),
      bundleImpact: Math.round(bundleImpact),
    };
  }

  // ============ SCORE ============

  private calculateScore(issues: CodeIssue[], metrics: CodeMetrics): number {
    let score = 100;

    for (const issue of issues) {
      switch (issue.severity) {
        case "critical": score -= 20; break;
        case "warning": score -= 10; break;
        case "info": score -= 3; break;
        case "style": score -= 1; break;
      }
    }

    // Factor in metrics
    score = (score + metrics.maintainability + metrics.readability + metrics.testability) / 4;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // ============ SUMMARY ============

  private generateSummary(score: number, issues: CodeIssue[], _metrics: CodeMetrics): string {
    const critical = issues.filter(i => i.severity === "critical").length;
    const warnings = issues.filter(i => i.severity === "warning").length;

    if (score >= 90) {
      return `Excellent code quality (score: ${score}/100). ${critical} critical, ${warnings} warnings. Ready for production.`;
    } else if (score >= 70) {
      return `Good code quality (score: ${score}/100). ${critical} critical, ${warnings} warnings. Address critical issues before deploy.`;
    } else if (score >= 50) {
      return `Fair code quality (score: ${score}/100). ${critical} critical, ${warnings} warnings. Needs improvement before production.`;
    } else {
      return `Poor code quality (score: ${score}/100). ${critical} critical, ${warnings} warnings. Major refactoring needed.`;
    }
  }
}

export const codeReviewer = new CodeReviewer();

// ============ CONVENIENCE FUNCTION ============

export async function reviewCode(code: string): Promise<CodeReviewReport> {
  return codeReviewer.review(code);
}

// ============ REVIEW DASHBOARD ============

export function CodeReviewDashboard(props: { report: CodeReviewReport }): ElmoorxNode {
  const r = props.report;

  return h("div", {
    style: "background:#0A0A0F;color:#E4E4E7;font-family:Inter,sans-serif;padding:32px;border-radius:12px;",
  },
    // Score
    h("div", { style: "display:flex;align-items:center;gap:20px;margin-bottom:24px;" },
      h("div", {
        style: `
          width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;
          font-size:28px;font-weight:700;font-family:'Space Grotesk',sans-serif;
          background:conic-gradient(${r.score >= 80 ? "#10B981" : r.score >= 50 ? "#F59E0B" : "#EF4444"} ${r.score * 3.6}deg, #2A2A38 0deg);
        `,
      },
        h("div", { style: "width:64px;height:64px;border-radius:50%;background:#0A0A0F;display:flex;align-items:center;justify-content:center;color:#E4E4E7;" }, String(r.score))
      ),
      h("div", null,
        h("div", { style: "font-size:14px;color:#A1A1AA;" }, "Code Review Score"),
        h("div", { style: `font-size:20px;font-weight:600;color:${r.score >= 80 ? "#10B981" : r.score >= 50 ? "#F59E0B" : "#EF4444"};` },
          r.score >= 90 ? "Excellent" : r.score >= 70 ? "Good" : r.score >= 50 ? "Fair" : "Poor"
        ),
        h("div", { style: "font-size:12px;color:#71717A;margin-top:4px;" }, r.summary),
      ),
    ),

    // Issues
    r.issues.length > 0 ? h("div", { style: "margin-bottom:24px;" },
      h("div", { style: "font-family:monospace;font-size:10px;color:#71717A;text-transform:uppercase;margin-bottom:8px;" }, `Issues (${r.issues.length})`),
      ...r.issues.map(issue =>
        h("div", {
          key: issue.id,
          style: `background:#14141B;border:1px solid #2A2A38;border-left:3px solid ${issue.severity === "critical" ? "#EF4444" : issue.severity === "warning" ? "#F59E0B" : issue.severity === "info" ? "#06B6D4" : "#71717A"};border-radius:6px;padding:12px;margin-bottom:8px;`,
        },
          h("div", { style: "display:flex;align-items:center;gap:8px;margin-bottom:4px;" },
            h("span", {
              style: `padding:1px 6px;border-radius:3px;font-size:9px;font-weight:600;text-transform:uppercase;background:${issue.severity === "critical" ? "rgba(239,68,68,0.15);color:#EF4444" : issue.severity === "warning" ? "rgba(245,158,11,0.15);color:#F59E0B" : issue.severity === "info" ? "rgba(6,182,212,0.15);color:#06B6D4" : "rgba(113,113,122,0.15);color:#71717A"};`,
            }, issue.severity),
            h("span", { style: "font-size:13px;font-weight:600;color:#E4E4E7;" }, issue.title),
          ),
          h("div", { style: "font-size:12px;color:#A1A1AA;margin-bottom:8px;" }, issue.description),
          issue.fix ? h("pre", { style: "font-size:11px;color:#10B981;font-family:monospace;background:#0F0F17;padding:8px;border-radius:4px;white-space:pre-wrap;" }, issue.fix) : null,
        )
      )
    ) : null,

    // Suggestions
    r.suggestions.length > 0 ? h("div", { style: "margin-bottom:24px;" },
      h("div", { style: "font-family:monospace;font-size:10px;color:#71717A;text-transform:uppercase;margin-bottom:8px;" }, `Suggestions (${r.suggestions.length})`),
      ...r.suggestions.map(sug =>
        h("div", {
          key: sug.id,
          style: "background:#14141B;border:1px solid #2A2A38;border-radius:6px;padding:12px;margin-bottom:8px;",
        },
          h("div", { style: "display:flex;align-items:center;gap:8px;margin-bottom:4px;" },
            h("span", { style: `padding:1px 6px;border-radius:3px;font-size:9px;font-weight:600;text-transform:uppercase;background:rgba(168,85,247,0.15);color:#A855F7;` }, sug.type),
            h("span", { style: "font-size:13px;font-weight:600;color:#E4E4E7;" }, sug.title),
            h("span", { style: `margin-left:auto;font-size:10px;color:${sug.impact === "high" ? "#10B981" : sug.impact === "medium" ? "#F59E0B" : "#71717A"};` }, sug.impact + " impact"),
          ),
          h("div", { style: "font-size:12px;color:#A1A1AA;margin-bottom:8px;" }, sug.description),
          h("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:8px;" },
            h("div", null,
              h("div", { style: "font-size:9px;color:#EF4444;text-transform:uppercase;margin-bottom:2px;" }, "Before"),
              h("pre", { style: "font-size:10px;color:#A1A1AA;font-family:monospace;background:#0F0F17;padding:6px;border-radius:4px;white-space:pre-wrap;" }, sug.before),
            ),
            h("div", null,
              h("div", { style: "font-size:9px;color:#10B981;text-transform:uppercase;margin-bottom:2px;" }, "After"),
              h("pre", { style: "font-size:10px;color:#10B981;font-family:monospace;background:#0F0F17;padding:6px;border-radius:4px;white-space:pre-wrap;" }, sug.after),
            ),
          ),
        )
      )
    ) : null,

    // Metrics
    h("div", null,
      h("div", { style: "font-family:monospace;font-size:10px;color:#71717A;text-transform:uppercase;margin-bottom:8px;" }, "Metrics"),
      h("div", { style: "display:grid;grid-template-columns:repeat(3,1fr);gap:8px;" },
        ...Object.entries(r.metrics).map(([key, value]) =>
          h("div", {
            key,
            style: "background:#14141B;border:1px solid #2A2A38;border-radius:6px;padding:8px;text-align:center;",
          },
            h("div", { style: "font-size:20px;font-weight:700;color:#A855F7;" }, String(value)),
            h("div", { style: "font-size:10px;color:#71717A;text-transform:uppercase;" }, key),
          )
        )
      ),
    ),
  );
}
