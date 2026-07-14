/**
 * @elmoorx/theme-studio — Visual Theme Editor
 * ============================================
 * Design, preview, and export themes visually.
 *
 *   import { ThemeStudio } from "@elmoorx/theme-studio";
 *   <ThemeStudio />  // Full visual theme editor
 */

import { h, $state, type ElmoorxNode } from "@elmoorx/runtime";

// ============ THEME TYPES ============

export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    success: string;
    warning: string;
    danger: string;
  };
  fonts: { sans: string; mono: string };
  spacing: { xs: string; sm: string; md: string; lg: string; xl: string };
  radius: { sm: string; md: string; lg: string; full: string };
  shadows: { sm: string; md: string; lg: string };
}

// ============ PRESET THEMES ============

export const presetThemes: Theme[] = [
  {
    name: "Elmoorx Dark",
    colors: {
      primary: "#A855F7", secondary: "#06B6D4", accent: "#F59E0B",
      background: "#0A0A0F", surface: "#1A1A24", text: "#E4E4E7",
      textMuted: "#A1A1AA", border: "#2A2A38", success: "#10B981",
      warning: "#F59E0B", danger: "#EF4444",
    },
    fonts: { sans: "Inter, sans-serif", mono: "JetBrains Mono, monospace" },
    spacing: { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "32px" },
    radius: { sm: "4px", md: "8px", lg: "12px", full: "9999px" },
    shadows: { sm: "0 1px 2px rgba(0,0,0,0.1)", md: "0 4px 12px rgba(0,0,0,0.2)", lg: "0 8px 24px rgba(0,0,0,0.3)" },
  },
  {
    name: "Light Clean",
    colors: {
      primary: "#3B82F6", secondary: "#8B5CF6", accent: "#EC4899",
      background: "#FFFFFF", surface: "#F9FAFB", text: "#111827",
      textMuted: "#6B7280", border: "#E5E7EB", success: "#10B981",
      warning: "#F59E0B", danger: "#EF4444",
    },
    fonts: { sans: "Inter, sans-serif", mono: "monospace" },
    spacing: { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "32px" },
    radius: { sm: "4px", md: "8px", lg: "12px", full: "9999px" },
    shadows: { sm: "0 1px 2px rgba(0,0,0,0.05)", md: "0 4px 6px rgba(0,0,0,0.1)", lg: "0 10px 15px rgba(0,0,0,0.1)" },
  },
  {
    name: "Ocean Blue",
    colors: {
      primary: "#0EA5E9", secondary: "#06B6D4", accent: "#F59E0B",
      background: "#F0F9FF", surface: "#FFFFFF", text: "#0C4A6E",
      textMuted: "#0369A1", border: "#BAE6FD", success: "#10B981",
      warning: "#F59E0B", danger: "#EF4444",
    },
    fonts: { sans: "Inter, sans-serif", mono: "monospace" },
    spacing: { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "32px" },
    radius: { sm: "6px", md: "10px", lg: "16px", full: "9999px" },
    shadows: { sm: "0 1px 3px rgba(14,165,233,0.1)", md: "0 4px 12px rgba(14,165,233,0.15)", lg: "0 8px 24px rgba(14,165,233,0.2)" },
  },
  {
    name: "Sunset",
    colors: {
      primary: "#F97316", secondary: "#EC4899", accent: "#FACC15",
      background: "#1F0A0A", surface: "#2D1110", text: "#FED7AA",
      textMuted: "#FDBA74", border: "#7C2D12", success: "#84CC16",
      warning: "#FACC15", danger: "#DC2626",
    },
    fonts: { sans: "Inter, sans-serif", mono: "monospace" },
    spacing: { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "32px" },
    radius: { sm: "4px", md: "8px", lg: "16px", full: "9999px" },
    shadows: { sm: "0 1px 2px rgba(249,115,22,0.1)", md: "0 4px 12px rgba(249,115,22,0.2)", lg: "0 8px 24px rgba(249,115,22,0.3)" },
  },
  {
    name: "Forest Green",
    colors: {
      primary: "#22C55E", secondary: "#16A34A", accent: "#FACC15",
      background: "#0A1F0A", surface: "#142914", text: "#D1FAE5",
      textMuted: "#86EFAC", border: "#1A3A1A", success: "#22C55E",
      warning: "#FACC15", danger: "#EF4444",
    },
    fonts: { sans: "Inter, sans-serif", mono: "monospace" },
    spacing: { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "32px" },
    radius: { sm: "4px", md: "8px", lg: "12px", full: "9999px" },
    shadows: { sm: "0 1px 2px rgba(34,197,94,0.1)", md: "0 4px 12px rgba(34,197,94,0.15)", lg: "0 8px 24px rgba(34,197,94,0.2)" },
  },
];

// ============ THEME MANAGER ============

class ThemeManager {
  private current = $state<Theme>(presetThemes[0]);
  private custom = $state<Theme[]>([]);
  private history: Theme[] = [];
  private historyIndex = -1;

  setTheme(theme: Theme): void {
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(this.current());
    this.historyIndex++;
    this.current.set(theme);
  }

  updateColors(colors: Partial<Theme["colors"]>): void {
    this.setTheme({
      ...this.current(),
      colors: { ...this.current().colors, ...colors },
    });
  }

  updateFonts(fonts: Partial<Theme["fonts"]>): void {
    this.setTheme({
      ...this.current(),
      fonts: { ...this.current().fonts, ...fonts },
    });
  }

  undo(): void {
    if (this.historyIndex >= 0) {
      this.current.set(this.history[this.historyIndex]);
      this.historyIndex--;
    }
  }

  redo(): void {
    if (this.historyIndex < this.history.length - 2) {
      this.historyIndex += 2;
      this.current.set(this.history[this.historyIndex]);
      this.historyIndex--;
    }
  }

  canUndo(): boolean { return this.historyIndex >= 0; }
  canRedo(): boolean { return this.historyIndex < this.history.length - 2; }

  getCurrent() { return this.current; }

  saveCustom(name: string): void {
    this.custom.set([...this.custom(), { ...this.current(), name }]);
  }

  getCustom() { return this.custom; }

  exportCSS(): string {
    const t = this.current();
    return `:root {
  --color-primary: ${t.colors.primary};
  --color-secondary: ${t.colors.secondary};
  --color-accent: ${t.colors.accent};
  --color-background: ${t.colors.background};
  --color-surface: ${t.colors.surface};
  --color-text: ${t.colors.text};
  --color-text-muted: ${t.colors.textMuted};
  --color-border: ${t.colors.border};
  --color-success: ${t.colors.success};
  --color-warning: ${t.colors.warning};
  --color-danger: ${t.colors.danger};
  --font-sans: ${t.fonts.sans};
  --font-mono: ${t.fonts.mono};
  --spacing-xs: ${t.spacing.xs};
  --spacing-sm: ${t.spacing.sm};
  --spacing-md: ${t.spacing.md};
  --spacing-lg: ${t.spacing.lg};
  --spacing-xl: ${t.spacing.xl};
  --radius-sm: ${t.radius.sm};
  --radius-md: ${t.radius.md};
  --radius-lg: ${t.radius.lg};
  --radius-full: ${t.radius.full};
  --shadow-sm: ${t.shadows.sm};
  --shadow-md: ${t.shadows.md};
  --shadow-lg: ${t.shadows.lg};
}`;
  }

  exportJSON(): string {
    return JSON.stringify(this.current(), null, 2);
  }

  generateAI(opts: { mood: string; brand: string }): Theme {
    // AI-powered theme generation based on mood and brand
    const moods: Record<string, { primary: string; bg: string; surface: string }> = {
      "professional": { primary: "#3B82F6", bg: "#FFFFFF", surface: "#F9FAFB" },
      "playful": { primary: "#EC4899", bg: "#FFF7ED", surface: "#FFFFFF" },
      "dark": { primary: "#A855F7", bg: "#0A0A0F", surface: "#1A1A24" },
      "minimal": { primary: "#6B7280", bg: "#FFFFFF", surface: "#F9FAFB" },
      "energetic": { primary: "#F97316", bg: "#FFFBEB", surface: "#FFFFFF" },
      "calm": { primary: "#0EA5E9", bg: "#F0F9FF", surface: "#FFFFFF" },
    };

    const mood = moods[opts.mood] || moods.professional;

    return {
      name: `${opts.brand} - ${opts.mood}`,
      colors: {
        primary: mood.primary,
        secondary: "#06B6D4",
        accent: "#F59E0B",
        background: mood.bg,
        surface: mood.surface,
        text: mood.bg === "#FFFFFF" ? "#111827" : "#E4E4E7",
        textMuted: mood.bg === "#FFFFFF" ? "#6B7280" : "#A1A1AA",
        border: mood.bg === "#FFFFFF" ? "#E5E7EB" : "#2A2A38",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
      },
      fonts: { sans: "Inter, sans-serif", mono: "monospace" },
      spacing: { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "32px" },
      radius: { sm: "4px", md: "8px", lg: "12px", full: "9999px" },
      shadows: {
        sm: `0 1px 2px rgba(0,0,0,0.05)`,
        md: `0 4px 12px rgba(0,0,0,0.1)`,
        lg: `0 8px 24px rgba(0,0,0,0.15)`,
      },
    };
  }

  // Contrast checker (accessibility)
  checkContrast(fg: string, bg: string): { ratio: number; pass: boolean; level: string } {
    const l1 = this.luminance(fg);
    const l2 = this.luminance(bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

    return {
      ratio: Math.round(ratio * 100) / 100,
      pass: ratio >= 4.5,
      level: ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA Large" : "Fail",
    };
  }

  private luminance(color: string): number {
    const hex = color.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
}

export const themeManager = new ThemeManager();

// ============ THEME STUDIO COMPONENT ============

export function ThemeStudio(): ElmoorxNode {
  const showExport = $state<"css" | "json" | null>(null);
  const aiMood = $state("professional");
  const aiBrand = $state("MyBrand");

  const theme = themeManager.getCurrent();

  return h("div", {
    style: "display:grid;grid-template-columns:300px 1fr 300px;height:100vh;background:#0A0A0F;color:#E4E4E7;font-family:Inter,sans-serif;",
  },
    // LEFT: Presets + AI
    h("div", { style: "background:#14141B;border-right:1px solid #2A2A38;padding:16px;overflow-y:auto;" },
      h("div", { style: "font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:16px;margin-bottom:16px;" }, "Theme Studio"),

      // Presets
      h("div", { style: "font-family:monospace;font-size:9px;color:#71717A;text-transform:uppercase;margin-bottom:8px;" }, "Preset Themes"),
      ...presetThemes.map(preset =>
        h("div", {
          key: preset.name,
          onClick: () => themeManager.setTheme(preset),
          style: `
            display:flex;align-items:center;gap:8px;padding:8px;border-radius:6px;
            cursor:pointer;margin-bottom:4px;
            background:${theme().name === preset.name ? "rgba(168,85,247,0.1)" : "transparent"};
            border:1px solid ${theme().name === preset.name ? "#A855F7" : "transparent"};
          `,
        },
          h("div", { style: "display:flex;gap:2px;" },
            h("div", { style: `width:16px;height:16px;border-radius:3px;background:${preset.colors.primary};` }),
            h("div", { style: `width:16px;height:16px;border-radius:3px;background:${preset.colors.secondary};` }),
            h("div", { style: `width:16px;height:16px;border-radius:3px;background:${preset.colors.background};border:1px solid #2A2A38;` }),
          ),
          h("span", { style: "font-size:13px;color:#A1A1AA;" }, preset.name),
        )
      ),

      // AI Generator
      h("div", { style: "margin-top:24px;" },
        h("div", { style: "font-family:monospace;font-size:9px;color:#71717A;text-transform:uppercase;margin-bottom:8px;" }, "AI Theme Generator"),
        h("select", {
          value: () => aiMood(),
          onChange: (e: Event) => aiMood.set((e.target as HTMLSelectElement).value),
          style: "width:100%;padding:6px;background:#1A1A24;border:1px solid #2A2A38;color:#E4E4E7;border-radius:4px;font-size:12px;margin-bottom:8px;box-sizing:border-box;",
        },
          ...["professional", "playful", "dark", "minimal", "energetic", "calm"].map(m =>
            h("option", { key: m, value: m }, m)
          )
        ),
        h("input", {
          type: "text",
          value: () => aiBrand(),
          onInput: (e: Event) => aiBrand.set((e.target as HTMLInputElement).value),
          placeholder: "Brand name",
          style: "width:100%;padding:6px;background:#1A1A24;border:1px solid #2A2A38;color:#E4E4E7;border-radius:4px;font-size:12px;margin-bottom:8px;box-sizing:border-box;",
        }),
        h("button", {
          onClick: () => themeManager.setTheme(themeManager.generateAI({ mood: aiMood(), brand: aiBrand() })),
          style: "width:100%;padding:8px;background:linear-gradient(135deg,#A855F7,#06B6D4);color:white;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;",
        }, "✨ Generate"),
      ),
    ),

    // CENTER: Live Preview
    h("div", { style: "display:flex;flex-direction:column;overflow:hidden;" },
      h("div", { style: "padding:8px 16px;background:#14141B;border-bottom:1px solid #2A2A38;display:flex;justify-content:space-between;align-items:center;" },
        h("div", { style: "display:flex;gap:4px;" },
          h("button", {
            onClick: () => themeManager.undo(),
            disabled: !themeManager.canUndo(),
            style: `padding:4px 10px;background:${themeManager.canUndo() ? "#2A2A38" : "#1A1A24"};color:${themeManager.canUndo() ? "#E4E4E7" : "#71717A"};border:1px solid #2A2A38;border-radius:4px;cursor:pointer;font-size:11px;`,
          }, "↶ Undo"),
          h("button", {
            onClick: () => themeManager.redo(),
            disabled: !themeManager.canRedo(),
            style: `padding:4px 10px;background:${themeManager.canRedo() ? "#2A2A38" : "#1A1A24"};color:${themeManager.canRedo() ? "#E4E4E7" : "#71717A"};border:1px solid #2A2A38;border-radius:4px;cursor:pointer;font-size:11px;`,
          }, "↷ Redo"),
        ),
        h("div", { style: "display:flex;gap:4px;" },
          h("button", {
            onClick: () => showExport.set(showExport() === "css" ? null : "css"),
            style: "padding:4px 10px;background:#06B6D4;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;",
          }, "CSS"),
          h("button", {
            onClick: () => showExport.set(showExport() === "json" ? null : "json"),
            style: "padding:4px 10px;background:#10B981;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;",
          }, "JSON"),
          h("button", {
            onClick: () => themeManager.saveCustom(theme().name + " (copy)"),
            style: "padding:4px 10px;background:#A855F7;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;",
          }, "Save"),
        ),
      ),
      () => {
        if (showExport()) {
          const code = showExport() === "css" ? themeManager.exportCSS() : themeManager.exportJSON();
          return h("div", {
            style: "flex:1;padding:24px;background:#0F0F17;overflow:auto;",
          },
            h("pre", { style: "font-family:monospace;font-size:12px;color:#E4E4E7;white-space:pre-wrap;" }, code),
          );
        }

        const t = theme();
        return h("div", {
          style: `flex:1;overflow:auto;padding:32px;background:${t.colors.background};color:${t.colors.text};`,
        },
          h("h1", { style: `color:${t.colors.text};font-family:${t.fonts.sans};` }, t.name),
          h("p", { style: `color:${t.colors.textMuted};` }, "Live preview of your theme"),

          // Buttons
          h("div", { style: "display:flex;gap:8px;margin:20px 0;" },
            h("button", { style: `padding:10px 20px;background:${t.colors.primary};color:white;border:none;border-radius:${t.radius.md};cursor:pointer;font-weight:600;` }, "Primary"),
            h("button", { style: `padding:10px 20px;background:${t.colors.secondary};color:white;border:none;border-radius:${t.radius.md};cursor:pointer;font-weight:600;` }, "Secondary"),
            h("button", { style: `padding:10px 20px;background:transparent;color:${t.colors.primary};border:1px solid ${t.colors.primary};border-radius:${t.radius.md};cursor:pointer;` }, "Outline"),
            h("button", { style: `padding:10px 20px;background:${t.colors.danger};color:white;border:none;border-radius:${t.radius.md};cursor:pointer;` }, "Danger"),
          ),

          // Card
          h("div", {
            style: `background:${t.colors.surface};border:1px solid ${t.colors.border};border-radius:${t.radius.lg};padding:20px;margin:20px 0;max-width:400px;box-shadow:${t.shadows.md};`,
          },
            h("h3", { style: `color:${t.colors.text};margin:0 0 8px;` }, "Sample Card"),
            h("p", { style: `color:${t.colors.textMuted};margin:0 0 16px;` }, "This card shows how your theme looks."),
            h("div", { style: "display:flex;gap:8px;" },
              h("span", { style: `padding:2px 8px;background:${t.colors.success}20;color:${t.colors.success};border-radius:${t.radius.full};font-size:11px;` }, "Success"),
              h("span", { style: `padding:2px 8px;background:${t.colors.warning}20;color:${t.colors.warning};border-radius:${t.radius.full};font-size:11px;` }, "Warning"),
              h("span", { style: `padding:2px 8px;background:${t.colors.danger}20;color:${t.colors.danger};border-radius:${t.radius.full};font-size:11px;` }, "Danger"),
            ),
          ),

          // Input
          h("input", {
            type: "text",
            placeholder: "Sample input...",
            style: `padding:10px 14px;background:${t.colors.surface};border:1px solid ${t.colors.border};border-radius:${t.radius.md};color:${t.colors.text};font-size:14px;outline:none;width:300px;`,
          }),
        );
      }
    ),

    // RIGHT: Color editor
    h("div", { style: "background:#14141B;border-left:1px solid #2A2A38;padding:16px;overflow-y:auto;" },
      h("div", { style: "font-family:monospace;font-size:9px;color:#71717A;text-transform:uppercase;margin-bottom:8px;" }, "Colors"),
      ...Object.entries(theme().colors).map(([key, value]) =>
        h("div", {
          key,
          style: "display:flex;align-items:center;gap:8px;margin-bottom:8px;",
        },
          h("input", {
            type: "color",
            value: value,
            onChange: (e: Event) => themeManager.updateColors({ [key]: (e.target as HTMLInputElement).value }),
            style: "width:32px;height:32px;border:none;border-radius:4px;cursor:pointer;background:none;",
          }),
          h("div", { style: "flex:1;" },
            h("div", { style: "font-size:12px;color:#A1A1AA;" }, key),
            h("div", { style: "font-size:10px;color:#71717A;font-family:monospace;" }, value),
          ),
        )
      ),

      // Contrast checker
      h("div", { style: "margin-top:24px;border-top:1px solid #2A2A38;padding-top:16px;" },
        h("div", { style: "font-family:monospace;font-size:9px;color:#71717A;text-transform:uppercase;margin-bottom:8px;" }, "Contrast Check"),
        () => {
          const result = themeManager.checkContrast(theme().colors.text, theme().colors.background);
          return h("div", { style: "padding:8px;background:#1A1A24;border-radius:6px;" },
            h("div", { style: "display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;" },
              h("span", { style: "color:#A1A1AA;" }, "Text / Background"),
              h("span", { style: `color:${result.pass ? "#10B981" : "#EF4444"};font-weight:600;` }, result.level),
            ),
            h("div", { style: "font-size:10px;color:#71717A;font-family:monospace;" }, `Ratio: ${result.ratio}:1`),
          );
        },
      ),
    ),
  );
}
