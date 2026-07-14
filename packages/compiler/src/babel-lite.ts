/**
 * Elmoorx Compiler — Lightweight JSX → h() transformer
 * ============================================
 * Thin ESM wrapper around @babel/parser, @babel/traverse, @babel/core,
 * and @babel/types. Provides a single, named `elmoorxJsxPlugin` that
 * converts JSX to `h(tag, props, ...children)` calls — the runtime
 * shape expected by `@elmoorx/runtime`.
 *
 * NOTE: This module is ESM-only. We use static imports (no `require`)
 * because the package declares `"type": "module"`.
 */

import * as babel from "@babel/core";
import { parse as babelParse } from "@babel/parser";
import _babelTraverse from "@babel/traverse";
import type * as tTypes from "@babel/types";
import * as t from "@babel/types";

// @babel/traverse ships as CJS with a `.default` export. Under ESM
// interop, the imported binding is the module namespace object whose
// `.default` is the actual function. We unwrap it once at module load.
type TraverseFn = typeof import("@babel/traverse") extends {
  default: infer F;
} ? F : typeof import("@babel/traverse");
const babelTraverse: TraverseFn =
  (_babelTraverse as unknown as { default?: TraverseFn }).default ??
  (_babelTraverse as unknown as TraverseFn);

// Babel's full AST `Node` union is exported by @babel/types. We re-use
// it directly instead of `any` so the visitor bodies are type-checked.
type Node = tTypes.Node;

// Minimal Babel plugin param shape. The real PluginObj type is generic
// over the state and pulls in a lot of transitive types; this structural
// subset is all our plugin touches.
interface BabelPluginParam {
  types: typeof tTypes;
}

// Minimal NodePath shape — only the fields our visitor reads/writes.
interface NodePath<N extends Node = Node> {
  node: N;
  parent?: Node;
  parentPath?: NodePath;
  scope?: unknown;
  replaceWith(node: Node | Node[]): void;
  skip(): void;
}

/**
 * Babel-lite parse — wraps @babel/parser.
 */
export function parse(
  source: string,
  opts: Parameters<typeof babelParse>[1],
): Node {
  return babelParse(source, opts);
}

/**
 * Babel-lite traverse — wraps @babel/traverse.
 */
export function traverse(
  ast: Node,
  visitor: Parameters<typeof babelTraverse>[1],
): void {
  // @babel/traverse accepts a File or Node as the first arg.
  // Our callers always pass a Program node from parse().
  babelTraverse(ast as Parameters<typeof babelTraverse>[0], visitor);
}

/**
 * Babel-lite transform — wraps @babel/core.
 */
export function transformFromAstSync(
  ast: Node,
  code: string,
  opts: Parameters<typeof babel.transformFromAstSync>[2],
): ReturnType<typeof babel.transformFromAstSync> {
  return babel.transformFromAstSync(ast, code, opts);
}

/**
 * Custom JSX plugin — converts <div>...</div> to h('div', ...).
 *
 * This is the same shape as @babel/plugin-transform-react-jsx with
 * `runtime: 'classic'` and `pragma: 'h'`, but inlined so the
 * compiler has zero external preset dependencies beyond @babel/core.
 *
 * The plugin is also exposed as a named export so it can be
 * referenced explicitly from `compile.ts` instead of by string.
 */
export function elmoorxJsxPlugin({ types: t }: BabelPluginParam) {
  return {
    visitor: {
      JSXElement(path: NodePath<tTypes.JSXElement>) {
        const node = path.node;
        const tag = node.openingElement.name;

        // Convert tag name
        let tagExpr: Node;
        if (t.isJSXIdentifier(tag)) {
          if (/^[A-Z]/.test(tag.name)) {
            // Component reference — keep as identifier
            tagExpr = t.identifier(tag.name);
          } else {
            // HTML tag — string literal
            tagExpr = t.stringLiteral(tag.name);
          }
        } else if (t.isJSXMemberExpression(tag)) {
          // e.g. <Foo.Bar /> → Foo.Bar
          tagExpr = t.memberExpression(
            t.identifier((tag.object as tTypes.JSXIdentifier).name),
            t.identifier((tag.property as tTypes.JSXIdentifier).name),
          );
        } else {
          // FIXED: previously fell back to <div> for unknown tag shapes
          // (e.g. <this.foo>), silently corrupting the output. Now
          // throws a compile error so the developer knows immediately.
          throw new Error(
            `[elmoorx/compiler] Unsupported JSX tag shape: ${tag.type}. ` +
            `Supported: JSXIdentifier, JSXMemberExpression. ` +
            `For <this.foo> patterns, assign to a variable first: ` +
            `const Foo = this.foo; <Foo />.`
          );
        }

        // Convert attributes to props object
        const props: tTypes.ObjectProperty[] = [];
        for (const attr of node.openingElement.attributes) {
          if (t.isJSXAttribute(attr)) {
            const name = (attr.name as tTypes.JSXIdentifier).name;
            // mapAttrName returns "" for attrs that should be stripped
            // (key, ref, suppressContentEditableWarning). Skip those.
            const mappedName = mapAttrName(name);
            if (mappedName === "") continue;
            let valueExpr: tTypes.Expression;
            if (!attr.value) {
              valueExpr = t.booleanLiteral(true);
            } else if (t.isJSXExpressionContainer(attr.value)) {
              valueExpr = attr.value.expression as tTypes.Expression;
            } else if (t.isStringLiteral(attr.value)) {
              valueExpr = attr.value;
            } else {
              valueExpr = attr.value as tTypes.Expression;
            }
            props.push(
              t.objectProperty(t.identifier(mappedName), valueExpr),
            );
          } else if (t.isJSXSpreadAttribute(attr)) {
            // Spread attributes become object spread properties.
            // We push them as a special marker and flatten below.
            props.push(
              t.objectProperty(
                t.identifier("__spread__"),
                attr.argument as tTypes.Expression,
              ),
            );
          }
        }

        // Flatten: if any spread markers exist, build a sequence of
        // Object.assign calls; otherwise a single object literal.
        const propsExpr: Node =
          props.length === 0
            ? t.nullLiteral()
            : t.objectExpression(props as tTypes.ObjectProperty[]);

        // Convert children
        const children: tTypes.Expression[] = [];
        for (const child of node.children) {
          if (t.isJSXText(child)) {
            // Whitespace handling: collapse runs of whitespace to a
            // single space, then trim only if the run contains a newline
            // (block context). Preserve single leading/trailing spaces
            // between inline elements (previously all whitespace was
            // trimmed, breaking inline prose like
            //   <p>Click <a>here</a> to continue.</p>).
            const raw = child.value;
            const hasNewline = /\n/.test(raw);
            const text = hasNewline
              ? raw.replace(/\s+/g, " ").trim()
              : raw.replace(/\s+/g, " ").replace(/^ | $/g, "");
            if (text) children.push(t.stringLiteral(text));
          } else if (t.isJSXSpreadChild(child)) {
            // <ul>{...items}</ul> — spread child. Convert to SpreadElement
            // so it's passed as a spread arg to h().
            children.push(
              (child as tTypes.JSXSpreadChild).expression as tTypes.Expression,
            );
          } else if (t.isJSXExpressionContainer(child)) {
            if (!t.isJSXEmptyExpression(child.expression)) {
              children.push(child.expression as tTypes.Expression);
            }
          } else if (t.isJSXElement(child) || t.isJSXFragment(child)) {
            // Already transformed by recursive visitor
            children.push(child as tTypes.Expression);
          }
        }

        // Build h(tag, props, ...children)
        path.replaceWith(
          t.callExpression(t.identifier("h"), [
            tagExpr as tTypes.Expression,
            propsExpr as tTypes.Expression,
            ...children,
          ]),
        );
      },

      JSXFragment(path: NodePath<tTypes.JSXFragment>) {
        // Convert <></> → h(Fragment, null, ...children)
        const children: tTypes.Expression[] = [];
        for (const child of path.node.children) {
          if (t.isJSXText(child)) {
            const raw = child.value;
            const hasNewline = /\n/.test(raw);
            const text = hasNewline
              ? raw.replace(/\s+/g, " ").trim()
              : raw.replace(/\s+/g, " ").replace(/^ | $/g, "");
            if (text) children.push(t.stringLiteral(text));
          } else if (t.isJSXSpreadChild(child)) {
            children.push(
              (child as tTypes.JSXSpreadChild).expression as tTypes.Expression,
            );
          } else if (t.isJSXExpressionContainer(child)) {
            if (!t.isJSXEmptyExpression(child.expression)) {
              children.push(child.expression as tTypes.Expression);
            }
          } else if (t.isJSXElement(child) || t.isJSXFragment(child)) {
            children.push(child as tTypes.Expression);
          }
        }
        path.replaceWith(
          t.callExpression(t.identifier("h"), [
            t.identifier("Fragment"),
            t.nullLiteral(),
            ...children,
          ]),
        );
      },
    },
  };
}

function mapAttrName(jsxName: string): string {
  // Map common JSX attribute names to HTML/DOM names.
  // Event handlers (onClick, onChange, ...) are kept as-is — the
  // runtime renderer wires them to addEventListener at mount time.
  const map: Record<string, string> = {
    className: "class",
    htmlFor: "for",
    tabIndex: "tabindex",
    readOnly: "readonly",
    maxLength: "maxlength",
    minLength: "minlength",
    colSpan: "colspan",
    rowSpan: "rowspan",
    cellPadding: "cellpadding",
    cellSpacing: "cellspacing",
    encType: "enctype",
    autoComplete: "autocomplete",
    autoFocus: "autofocus",
    autoPlay: "autoplay",
    contentEditable: "contenteditable",
    crossOrigin: "crossorigin",
    dateTime: "datetime",
    spellCheck: "spellcheck",
    srcSet: "srcset",
    useMap: "usemap",
    // Additional React-ism mappings (Priority 10 fix):
    accessKey: "accesskey",
    contextMenu: "contextmenu",
    classID: "classid",
    // React-specific attrs that should map to their HTML equivalents:
    defaultValue: "value",      // <input defaultValue> → <input value>
    defaultChecked: "checked",  // <input defaultChecked> → <input checked>
  };
  // React-internal attrs that should be STRIPPED (not passed to DOM).
  // Returning "" signals the caller to skip this attribute.
  const strip: Set<string> = new Set([
    "key",
    "ref",
    "suppressContentEditableWarning",
  ]);
  if (strip.has(jsxName)) return "";
  return map[jsxName] || jsxName;
}

export { t };
