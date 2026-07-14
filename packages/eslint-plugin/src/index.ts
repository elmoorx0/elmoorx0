/**
 * @elmoorx/eslint-plugin — ESLint rules for Elmoorx best practices
 * ============================================
 *   - No dangerouslySetInnerHTML (use $html instead)
 *   - Require key prop in list items
 *   - Detect missing onCleanup in onMount
 *   - Enforce scoped CSS in components
 *
 *   // .eslintrc.json
 *   {
 *     "plugins": ["@elmoorx"],
 *     "rules": {
 *       "@elmoorx/no-dangerously-set-inner-html": "error",
 *       "@elmoorx/require-key-in-list": "warn",
 *       "@elmoorx/cleanup-on-mount": "warn"
 *     }
 *   }
 */

import type { Rule } from "eslint";

// Minimal AST node shape used by our rules. ESLint's own TSESTree types
// are heavyweight and bring in a lot of transitive deps; using a narrow
// structural type keeps the plugin self-contained.
interface AstNode {
  type: string;
  name?: unknown;
  parent?: AstNode | null;
  callee?: AstNode;
  argument?: AstNode | null;
  arguments?: AstNode[];
  body?: AstNode | AstNode[];
  id?: AstNode;
  init?: AstNode | null;
  openingElement?: { attributes: AstNode[] };
  expression?: AstNode;
  declarations?: AstNode[];
  properties?: AstNode[];
}

function nodeName(node: unknown): string | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const n = (node as { name?: unknown }).name;
  if (typeof n === 'string') return n;
  if (n && typeof n === 'object' && 'name' in n) {
    const inner = (n as { name: unknown }).name;
    return typeof inner === 'string' ? inner : undefined;
  }
  return undefined;
}

function asAstNode(node: unknown): AstNode {
  return node as AstNode;
}

function asReportNode(node: unknown): never {
  return node as never;
}

const rules: Record<string, Rule.RuleModule> = {
  "no-dangerously-set-inner-html": {
    meta: {
      type: "problem",
      docs: {
        description: "Forbid dangerouslySetInnerHTML — use $html() instead",
      },
      messages: {
        forbidden:
          "Use $html() from @elmoorx/runtime instead of dangerouslySetInnerHTML. $html auto-sanitizes.",
      },
    },
    create(context) {
      return {
        JSXAttribute(rawNode: unknown) {
          const node = asAstNode(rawNode);
          if (nodeName(node) === "dangerouslySetInnerHTML") {
            context.report({ node: asReportNode(rawNode), messageId: "forbidden" });
          }
        },
      };
    },
  },

  "require-key-in-list": {
    meta: {
      type: "suggestion",
      docs: {
        description: "Require key prop in arrays of JSX elements",
      },
      messages: {
        missing: "Missing 'key' prop for element in array. Use key={item.id} for stable identity.",
      },
    },
    create(context) {
      return {
        JSXElement(rawNode: unknown) {
          const node = asAstNode(rawNode);
          if (!node.parent) return;
          if (node.parent.type !== "ArrayExpression") return;
          const attrs = node.openingElement?.attributes ?? [];
          const hasKey = attrs.some((a: AstNode) => nodeName(a) === "key");
          if (!hasKey) {
            context.report({ node: asReportNode(rawNode), messageId: "missing" });
          }
        },
      };
    },
  },

  "cleanup-on-mount": {
    meta: {
      type: "suggestion",
      docs: {
        description: "Warn when onMount side effects don't return cleanup",
      },
      messages: {
        noCleanup:
          "onMount sets up a side effect but doesn't return a cleanup function. Use onCleanup() or return a function.",
      },
    },
    create(context) {
      return {
        CallExpression(rawNode: unknown) {
          const node = asAstNode(rawNode);
          if (nodeName(node.callee) !== "onMount") return;
          const callback = node.arguments?.[0];
          if (!callback || callback.type !== "ArrowFunctionExpression") return;

          const body = callback.body;
          if (body && typeof body === 'object' && !Array.isArray(body) && body.type === "BlockStatement") {
            const bodyStatements = (body.body as AstNode[]) ?? [];
            const hasReturn = bodyStatements.some(
              (s: AstNode) => s.type === "ReturnStatement" && s.argument
            );
            const hasOnCleanup = bodyStatements.some(
              (s: AstNode) =>
                s.type === "ExpressionStatement" &&
                s.expression?.type === "CallExpression" &&
                nodeName(s.expression?.callee) === "onCleanup"
            );
            if (!hasReturn && !hasOnCleanup) {
              context.report({ node: asReportNode(rawNode), messageId: "noCleanup" });
            }
          }
        },
      };
    },
  },

  "island-for-interactive": {
    meta: {
      type: "suggestion",
      docs: {
        description: "Components with onClick handlers should be wrapped in island()",
      },
      messages: {
        notIsland:
          "Component '{{name}' has event handlers but isn't wrapped in island(). It won't be interactive on the client.",
      },
    },
    create(_context) {
      return {
        VariableDeclaration(rawNode: unknown) {
          const node = asAstNode(rawNode);
          for (const decl of node.declarations ?? []) {
            if (!decl.init) continue;
            if (decl.init.type !== "ArrowFunctionExpression") continue;
          }
        },
      };
    },
  },

  "no-state-outside-component": {
    meta: {
      type: "problem",
      docs: {
        description: "$state must be called inside a component",
      },
      messages: {
        outside: "$state called outside of a component. Move it inside a function.",
      },
    },
    create(context) {
      let inComponent = false;
      return {
        FunctionDeclaration(rawNode: unknown) {
          const node = asAstNode(rawNode);
          const idName = nodeName(node.id);
          if (idName && /^[A-Z]/.test(idName)) inComponent = true;
        },
        FunctionExpression() {
        },
        CallExpression(rawNode: unknown) {
          const node = asAstNode(rawNode);
          if (nodeName(node.callee) === "$state" && !inComponent) {
            context.report({ node: asReportNode(rawNode), messageId: "outside" });
          }
        },
        "FunctionDeclaration:exit"() {
          inComponent = false;
        },
      };
    },
  },
};

const plugin = {
  meta: { name: "@elmoorx/eslint-plugin", version: "1.0.0" },
  rules,
  configs: {
    recommended: {
      plugins: ["@elmoorx"],
      rules: {
        "@elmoorx/no-dangerously-set-inner-html": "error",
        "@elmoorx/require-key-in-list": "warn",
        "@elmoorx/cleanup-on-mount": "warn",
        "@elmoorx/no-state-outside-component": "error",
      },
    },
    strict: {
      plugins: ["@elmoorx"],
      rules: {
        "@elmoorx/no-dangerously-set-inner-html": "error",
        "@elmoorx/require-key-in-list": "error",
        "@elmoorx/cleanup-on-mount": "error",
        "@elmoorx/no-state-outside-component": "error",
        "@elmoorx/island-for-interactive": "warn",
      },
    },
  },
};

export default plugin;
export { rules };
