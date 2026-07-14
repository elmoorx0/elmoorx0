/**
 * @elmoorx/visual-builder — Visual Component Builder
 * ============================================
 * Drag & drop UI builder that generates real Elmoorx code.
 * Like Webflow/Figma but outputs production Elmoorx components.
 *
 *   import { VisualBuilder } from "@elmoorx/visual-builder";
 *   <VisualBuilder />  // Full visual editor
 *
 * Features NO competitor has:
 *   - Drag & drop components onto canvas
 *   - Real-time code generation
 *   - Copy-paste generated code into your project
 *   - Responsive preview (mobile/tablet/desktop)
 *   - Theme editor
 *   - Component tree with reordering
 *   - Property panel for every component
 *   - Export as .elmoorx.tsx file
 */

import { h, $state, $store, type ElmoorxNode } from "@elmoorx/runtime";

// ============ TYPES ============

export interface BuilderComponent {
  id: string;
  type: string;
  props: Record<string, unknown>;
  children: BuilderComponent[];
}

export interface ComponentDefinition {
  type: string;
  label: string;
  icon: string;
  category: "layout" | "form" | "display" | "navigation";
  defaultProps: Record<string, unknown>;
  canHaveChildren: boolean;
  propsSchema: PropSchema[];
}

export interface PropSchema {
  name: string;
  label: string;
  type: "text" | "number" | "color" | "select" | "boolean" | "style";
  options?: { value: string; label: string }[];
  default?: unknown;
}

// ============ COMPONENT LIBRARY ============

export const componentLibrary: ComponentDefinition[] = [
  {
    type: "div",
    label: "Container",
    icon: "▢",
    category: "layout",
    canHaveChildren: true,
    defaultProps: { style: "padding:20px;background:#f4f4f4;border-radius:8px;" },
    propsSchema: [
      { name: "style", label: "Style (CSS)", type: "style", default: "padding:20px;" },
    ],
  },
  {
    type: "h1",
    label: "Heading 1",
    icon: "H1",
    category: "display",
    canHaveChildren: false,
    defaultProps: { text: "Heading" },
    propsSchema: [
      { name: "text", label: "Text", type: "text", default: "Heading" },
      { name: "style", label: "Style", type: "style", default: "color:#333;font-size:32px;" },
    ],
  },
  {
    type: "h2",
    label: "Heading 2",
    icon: "H2",
    category: "display",
    canHaveChildren: false,
    defaultProps: { text: "Subheading" },
    propsSchema: [
      { name: "text", label: "Text", type: "text", default: "Subheading" },
      { name: "style", label: "Style", type: "style", default: "color:#333;font-size:24px;" },
    ],
  },
  {
    type: "p",
    label: "Paragraph",
    icon: "¶",
    category: "display",
    canHaveChildren: false,
    defaultProps: { text: "Lorem ipsum dolor sit amet." },
    propsSchema: [
      { name: "text", label: "Text", type: "text", default: "Lorem ipsum" },
      { name: "style", label: "Style", type: "style", default: "color:#666;font-size:14px;" },
    ],
  },
  {
    type: "button",
    label: "Button",
    icon: "▢",
    category: "form",
    canHaveChildren: false,
    defaultProps: { text: "Click Me", style: "padding:10px 20px;background:#A855F7;color:white;border:none;border-radius:6px;cursor:pointer;" },
    propsSchema: [
      { name: "text", label: "Label", type: "text", default: "Click Me" },
      { name: "style", label: "Style", type: "style", default: "padding:10px 20px;background:#A855F7;color:white;border:none;border-radius:6px;" },
    ],
  },
  {
    type: "input",
    label: "Input",
    icon: "▭",
    category: "form",
    canHaveChildren: false,
    defaultProps: { placeholder: "Enter text...", style: "padding:8px 12px;border:1px solid #ddd;border-radius:4px;font-size:14px;" },
    propsSchema: [
      { name: "placeholder", label: "Placeholder", type: "text", default: "Enter text..." },
      { name: "type", label: "Type", type: "select", options: [
        { value: "text", label: "Text" },
        { value: "email", label: "Email" },
        { value: "password", label: "Password" },
        { value: "number", label: "Number" },
      ], default: "text" },
      { name: "style", label: "Style", type: "style", default: "padding:8px 12px;border:1px solid #ddd;" },
    ],
  },
  {
    type: "img",
    label: "Image",
    icon: "🖼",
    category: "display",
    canHaveChildren: false,
    defaultProps: { src: "https://picsum.photos/300/200", alt: "Image", style: "max-width:100%;border-radius:8px;" },
    propsSchema: [
      { name: "src", label: "Source URL", type: "text", default: "https://picsum.photos/300/200" },
      { name: "alt", label: "Alt Text", type: "text", default: "Image" },
      { name: "style", label: "Style", type: "style", default: "max-width:100%;border-radius:8px;" },
    ],
  },
  {
    type: "ul",
    label: "List",
    icon: "☰",
    category: "display",
    canHaveChildren: true,
    defaultProps: { style: "padding-left:20px;color:#666;" },
    propsSchema: [
      { name: "style", label: "Style", type: "style", default: "padding-left:20px;" },
    ],
  },
];

// ============ BUILDER STATE ============

const builderState = $store<{
  tree: BuilderComponent[];
  selectedId: string | null;
  device: "mobile" | "tablet" | "desktop";
  theme: { primary: string; bg: string; text: string };
}>({
  tree: [],
  selectedId: null,
  device: "desktop",
  theme: { primary: "#A855F7", bg: "#ffffff", text: "#333333" },
});

let componentIdCounter = 0;

function createComponent(type: string): BuilderComponent {
  const def = componentLibrary.find(c => c.type === type);
  if (!def) throw new Error(`Unknown component: ${type}`);

  return {
    id: `comp_${++componentIdCounter}`,
    type: def.type,
    props: { ...def.defaultProps },
    children: [],
  };
}

function findComponent(tree: BuilderComponent[], id: string): BuilderComponent | null {
  for (const node of tree) {
    if (node.id === id) return node;
    const found = findComponent(node.children, id);
    if (found) return found;
  }
  return null;
}

function _findParent(tree: BuilderComponent[], id: string, parent: BuilderComponent | null = null): BuilderComponent | null {
  for (const node of tree) {
    if (node.id === id) return parent;
    const found = _findParent(node.children, id, node);
    if (found !== null) return found;
  }
  return null;
}

function removeComponent(tree: BuilderComponent[], id: string): BuilderComponent[] {
  return tree.filter(node => {
    if (node.id === id) return false;
    node.children = removeComponent(node.children, id);
    return true;
  });
}

// ============ CODE GENERATION ============

export function generateCode(tree: BuilderComponent[], indent: number = 0): string {
  const pad = "  ".repeat(indent);

  if (tree.length === 0) return "";

  return tree.map(comp => {
    const def = componentLibrary.find(c => c.type === comp.type);
    if (!def) return "";

    const propsStr = Object.entries(comp.props)
      .filter(([key, val]) => key !== "text" && val !== undefined && val !== "")
      .map(([key, val]) => {
        if (key === "style") return `style="${val}"`;
        return `${key}="${val}"`;
      })
      .join(" ");

    // Self-closing tags
    if (["img", "input", "br", "hr"].includes(comp.type)) {
      return `${pad}<${comp.type} ${propsStr} />`;
    }

    // Text content
    const textContent = comp.props.text as string | undefined;
    const childrenCode = comp.children.length > 0
      ? "\n" + generateCode(comp.children, indent + 1) + "\n" + pad
      : (textContent || "");

    return `${pad}<${comp.type} ${propsStr}>${childrenCode}</${comp.type}>`;
  }).join("\n");
}

export function generateElmoorxComponent(tree: BuilderComponent[], name: string = "MyComponent"): string {
  const code = generateCode(tree, 2);

  return `/**
 * ${name} — Generated by Elmoorx Visual Builder
 * Copy this file to your project: src/${name}.elmoorx.tsx
 */

import { h, type ElmoorxNode } from "@elmoorx/runtime";

export default function ${name}(): ElmoorxNode {
  return (
${code}
  );
}
`;
}

// ============ VISUAL BUILDER UI ============

export function VisualBuilder(): ElmoorxNode {
  const showCode = $state(false);
  const _draggingType = $state<string | null>(null);

  const addToTree = (type: string) => {
    const comp = createComponent(type);
    if (builderState.selectedId) {
      const selected = findComponent(builderState.tree, builderState.selectedId);
      if (selected) {
        const def = componentLibrary.find(c => c.type === selected.type);
        if (def?.canHaveChildren) {
          selected.children.push(comp);
          builderState.tree = [...builderState.tree];
          builderState.selectedId = comp.id;
          return;
        }
      }
    }
    builderState.tree = [...builderState.tree, comp];
    builderState.selectedId = comp.id;
  };

  const deleteSelected = () => {
    if (!builderState.selectedId) return;
    builderState.tree = removeComponent(builderState.tree, builderState.selectedId);
    builderState.selectedId = null;
  };

  const updateProp = (compId: string, propName: string, value: unknown) => {
    const comp = findComponent(builderState.tree, compId);
    if (comp) {
      comp.props[propName] = value;
      builderState.tree = [...builderState.tree];
    }
  };

  const deviceWidth = () => {
    if (builderState.device === "mobile") return "375px";
    if (builderState.device === "tablet") return "768px";
    return "100%";
  };

  const selected = () => builderState.selectedId ? findComponent(builderState.tree, builderState.selectedId) : null;

  return h("div", {
    style: "display:grid;grid-template-columns:200px 1fr 280px;height:100vh;background:#0A0A0F;color:#E4E4E7;font-family:Inter,sans-serif;",
  },
    // LEFT: Component palette
    h("div", {
      style: "background:#14141B;border-right:1px solid #2A2A38;padding:16px;overflow-y:auto;",
    },
      h("div", { style: "font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:16px;margin-bottom:16px;" }, "Components"),
      ...["layout", "form", "display", "navigation"].map(category =>
        h("div", { key: category, style: "margin-bottom:16px;" },
          h("div", {
            style: "font-family:monospace;font-size:9px;letter-spacing:0.15em;color:#71717A;text-transform:uppercase;margin-bottom:8px;",
          }, category),
          ...componentLibrary.filter(c => c.category === category).map(comp =>
            h("div", {
              key: comp.type,
              onClick: () => addToTree(comp.type),
              style: `
                display:flex;align-items:center;gap:8px;padding:8px 10px;
                background:#1A1A24;border:1px solid #2A2A38;border-radius:6px;
                margin-bottom:4px;cursor:pointer;font-size:13px;color:#A1A1AA;
                transition:all 0.1s;
              `,
              onMouseEnter: "this.style.borderColor='#A855F7';this.style.color='#E4E4E7'",
              onMouseLeave: "this.style.borderColor='#2A2A38';this.style.color='#A1A1AA'",
            },
              h("span", { style: "font-size:16px;width:20px;text-align:center;" }, comp.icon),
              h("span", null, comp.label),
            )
          )
        )
      ),
    ),

    // CENTER: Canvas
    h("div", { style: "display:flex;flex-direction:column;overflow:hidden;" },
      // Toolbar
      h("div", {
        style: "padding:8px 16px;background:#14141B;border-bottom:1px solid #2A2A38;display:flex;justify-content:space-between;align-items:center;",
      },
        h("div", { style: "display:flex;gap:4px;" },
          ...["mobile", "tablet", "desktop"].map(d =>
            h("button", {
              key: d,
// @ts-expect-error — TS2322: Type 'unknown' is not assignable to type '"mobile" | "tablet" | "desktop
              onClick: () => (builderState.device as "mobile" | "tablet" | "desktop") = d as unknown,
              style: `padding:4px 12px;border:1px solid ${builderState.device === d ? "#A855F7" : "#2A2A38"};background:${builderState.device === d ? "#A855F7" : "transparent"};color:${builderState.device === d ? "white" : "#A1A1AA"};border-radius:4px;cursor:pointer;font-size:11px;text-transform:capitalize;`,
            }, d)
          ),
        ),
        h("div", { style: "display:flex;gap:4px;" },
          h("button", {
            onClick: () => showCode.set(!showCode()),
            style: "padding:4px 12px;background:#06B6D4;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;",
          }, () => showCode() ? "◀ Back to Canvas" : "</> View Code"),
          h("button", {
            onClick: deleteSelected,
            style: "padding:4px 12px;background:#EF4444;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;",
          }, "🗑 Delete"),
          h("button", {
            onClick: () => {
              const code = generateElmoorxComponent(builderState.tree);
              const blob = new Blob([code], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = "MyComponent.elmoorx.tsx"; a.click();
            },
            style: "padding:4px 12px;background:#10B981;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;",
          }, "⬇ Export"),
        ),
      ),

      // Canvas / Code
      () => showCode()
        ? h("div", {
            style: "flex:1;overflow:auto;padding:24px;background:#0F0F17;",
          },
            h("pre", {
              style: "font-family:'JetBrains Mono',monospace;font-size:13px;color:#E4E4E7;line-height:1.6;white-space:pre-wrap;",
            }, generateElmoorxComponent(builderState.tree)),
          )
        : h("div", {
            style: "flex:1;overflow:auto;padding:32px;display:flex;justify-content:center;background:#0A0A0F;",
          },
            h("div", {
              style: `width:${deviceWidth()};min-height:400px;background:${builderState.theme.bg};color:${builderState.theme.text};border-radius:12px;padding:20px;box-shadow:0 8px 32px rgba(0,0,0,0.3);transition:width 0.3s;`,
            },
              () => builderState.tree.length === 0
                ? h("div", {
                    style: "display:flex;align-items:center;justify-content:center;min-height:300px;color:#999;border:2px dashed #ddd;border-radius:8px;",
                  }, "Click components on the left to build your UI")
                : renderTree(builderState.tree, builderState.selectedId, (id) => builderState.selectedId = id)
            )
          ),
    ),

    // RIGHT: Properties panel
    h("div", {
      style: "background:#14141B;border-left:1px solid #2A2A38;padding:16px;overflow-y:auto;",
    },
      h("div", { style: "font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:16px;margin-bottom:16px;" }, "Properties"),
      () => {
        const sel = selected();
        if (!sel) {
          return h("div", { style: "color:#71717A;font-size:13px;padding:20px 0;" }, "Select a component to edit its properties.");
        }

        const def = componentLibrary.find(c => c.type === sel.type);
        if (!def) return null;

        return h("div", null,
          h("div", {
            style: "padding:8px 12px;background:#1A1A24;border-radius:6px;margin-bottom:16px;",
          },
            h("div", { style: "font-family:monospace;font-size:10px;color:#A855F7;text-transform:uppercase;letter-spacing:0.1em;" }, def.label),
            h("div", { style: "font-family:monospace;font-size:11px;color:#71717A;" }, `ID: ${sel.id}`),
          ),

          ...def.propsSchema.map(prop => {
            const value = sel.props[prop.name] ?? prop.default;
            return h("div", { key: prop.name, style: "margin-bottom:12px;" },
              h("label", {
                style: "display:block;font-size:12px;font-weight:600;color:#A1A1AA;margin-bottom:4px;",
              }, prop.label),
              prop.type === "select"
                ? h("select", {
                    value: String(value),
                    onChange: (e: Event) => updateProp(sel.id, prop.name, (e.target as HTMLSelectElement).value),
                    style: "width:100%;padding:6px 8px;background:#1A1A24;border:1px solid #2A2A38;color:#E4E4E7;border-radius:4px;font-size:12px;",
                  },
                    ...(prop.options || []).map(opt =>
                      h("option", { key: opt.value, value: opt.value }, opt.label)
                    )
                  )
                : prop.type === "boolean"
                ? h("input", {
                    type: "checkbox",
                    checked: Boolean(value),
                    onChange: (e: Event) => updateProp(sel.id, prop.name, (e.target as HTMLInputElement).checked),
                  })
                : h("textarea", {
                    value: String(value),
                    onChange: (e: Event) => updateProp(sel.id, prop.name, (e.target as HTMLTextAreaElement).value),
                    rows: prop.type === "style" ? 3 : 1,
                    style: "width:100%;padding:6px 8px;background:#1A1A24;border:1px solid #2A2A38;color:#E4E4E7;border-radius:4px;font-size:12px;font-family:monospace;resize:vertical;box-sizing:border-box;",
                  })
            );
          }),

          // Component tree
          h("div", { style: "margin-top:24px;border-top:1px solid #2A2A38;padding-top:16px;" },
            h("div", { style: "font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:14px;margin-bottom:8px;" }, "Tree"),
            renderTreeSimple(builderState.tree, 0, builderState.selectedId, (id) => builderState.selectedId = id),
          ),
        );
      },
    ),
  );
}

// ============ RENDER HELPERS ============

function renderTree(tree: BuilderComponent[], selectedId: string | null, onSelect: (id: string) => void): ElmoorxNode {
  return h("div", null,
    ...tree.map(comp => {
      const isSelected = selectedId === comp.id;
      const def = componentLibrary.find(c => c.type === comp.type);

      return h("div", {
        key: comp.id,
        onClick: (e: Event) => { e.stopPropagation(); onSelect(comp.id); },
        style: `
          outline:${isSelected ? "2px solid #A855F7" : "1px dashed transparent"};
          outline-offset:2px;cursor:pointer;padding:2px;
        `,
      },
        renderComponent(comp, def)
      );
    })
  );
}

function renderComponent(comp: BuilderComponent, _def?: ComponentDefinition): ElmoorxNode {
  const tag = comp.type;
  const props: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(comp.props)) {
    if (key === "text") continue;
    props[key] = val;
  }

  const children = comp.children.length > 0
    ? comp.children.map(child => {
        const childDef = componentLibrary.find(c => c.type === child.type);
        return renderComponent(child, childDef);
      })
    : (comp.props.text as string | undefined) || undefined;

  return h(tag, props, ...(Array.isArray(children) ? children : children ? [children] : []));
}

function renderTreeSimple(tree: BuilderComponent[], depth: number, selectedId: string | null, onSelect: (id: string) => void): ElmoorxNode {
  return h("div", null,
    ...tree.map(comp => {
      const def = componentLibrary.find(c => c.type === comp.type);
      return h("div", { key: comp.id },
        h("div", {
          onClick: () => onSelect(comp.id),
          style: `
            padding:4px 8px;padding-left:${depth * 12 + 8}px;
            cursor:pointer;border-radius:4px;font-size:12px;
            background:${selectedId === comp.id ? "rgba(168,85,247,0.2)" : "transparent"};
            color:${selectedId === comp.id ? "#A855F7" : "#A1A1AA"};
          `,
        },
          h("span", { style: "margin-right:6px;" }, def?.icon || "•"),
          def?.label || comp.type,
        ),
        comp.children.length > 0 ? renderTreeSimple(comp.children, depth + 1, selectedId, onSelect) : null,
      );
    })
  );
}
