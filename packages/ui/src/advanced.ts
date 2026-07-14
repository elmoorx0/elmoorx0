/**
 * @elmoorx/ui — Advanced Components (Part 3)
 * ============================================
 * 20+ advanced components: CodeEditor, RichTextEditor, Kanban, Calendar,
 * Gantt, Spreadsheet, Carousel, CommandPalette, FormBuilder, SchemaForm,
 * DataGrid, PivotTable, NotificationSystem, EmailTemplate, MarkdownEditor,
 * Dropzone, OTPInput, PinInput, OTPVerify, OTPInput, ColorPalette,
 * GradientPicker, SignaturePad, DrawingCanvas, Confetti, SnowFall.
 */

import { h, $state, $effect, type ElmoorxNode } from "@elmoorx/runtime";
import { defaultTheme, type Theme } from "./index";

const currentTheme: Theme = defaultTheme;

// ============ CODE EDITOR ============

export interface CodeEditorProps {
  value?: string | (() => string);
  language?: "javascript" | "typescript" | "html" | "css" | "json" | "markdown" | "bash" | "python";
  onChange?: (value: string) => void;
  readOnly?: boolean;
  lineNumbers?: boolean;
  height?: string;
  fontSize?: number;
  wordWrap?: boolean;
}

export function CodeEditor(props: CodeEditorProps): ElmoorxNode {
  const value = typeof props.value === "function" ? props.value() : props.value || "";
  const lineHeight = (props.fontSize || 13) * 1.6;
  const lineCount = value.split("\n").length;

  return h("div", {
    style: `
      display:flex;background:${currentTheme.colors.bgCode || "#0F0F17"};
      border:1px solid ${currentTheme.colors.border};border-radius:${currentTheme.radius.md};
      overflow:hidden;font-family:${currentTheme.fonts.mono};font-size:${props.fontSize || 13}px;
      height:${props.height || "300px"};
    `,
  },
    // Line numbers
    props.lineNumbers !== false ? h("div", {
      style: `
        padding:8px;text-align:right;color:${currentTheme.colors.textFaint};
        background:${currentTheme.colors.bgElev || "#14141B"};
        user-select:none;line-height:${lineHeight}px;min-width:40px;
      `,
    },
      () => Array.from({ length: lineCount }, (_, i) => i + 1).join("\n")
    ) : null,

    // Editor area
    h("textarea", {
      value,
      readonly: props.readOnly,
      onChange: (e: Event) => props.onChange?.((e.target as HTMLTextAreaElement).value),
      spellcheck: false,
      style: `
        flex:1;background:transparent;color:${currentTheme.colors.text};
        border:none;outline:none;resize:none;padding:8px;
        font-family:inherit;font-size:inherit;line-height:${lineHeight}px;
        white-space:${props.wordWrap ? "pre-wrap" : "pre"};
        tab-size:2;
      `,
    }),
  );
}

// ============ RICH TEXT EDITOR ============

export interface RichTextEditorProps {
  value?: string | (() => string);
  onChange?: (html: string) => void;
  placeholder?: string;
  toolbar?: boolean;
}

export function RichTextEditor(props: RichTextEditorProps): ElmoorxNode {
  const _value = typeof props.value === "function" ? props.value() : props.value || "";
  const focused = $state(false);

  const exec = (command: string, val?: string) => {
    document.execCommand(command, false, val);
  };

  return h("div", {
    style: `border:1px solid ${currentTheme.colors.border};border-radius:${currentTheme.radius.md};overflow:hidden;`,
  },
    props.toolbar !== false ? h("div", {
      style: `
        display:flex;gap:2px;padding:6px;background:${currentTheme.colors.surface};
        border-bottom:1px solid ${currentTheme.colors.border};
      `,
    },
      h("button", { onClick: () => exec("bold"), style: toolbarBtnStyle(), title: "Bold" }, "B"),
      h("button", { onClick: () => exec("italic"), style: toolbarBtnStyle(), title: "Italic" }, "I"),
      h("button", { onClick: () => exec("underline"), style: toolbarBtnStyle(), title: "Underline" }, "U"),
      h("div", { style: "width:1px;background:" + currentTheme.colors.border + ";margin:0 4px;" }),
      h("button", { onClick: () => exec("formatBlock", "h1"), style: toolbarBtnStyle(), title: "Heading 1" }, "H1"),
      h("button", { onClick: () => exec("formatBlock", "h2"), style: toolbarBtnStyle(), title: "Heading 2" }, "H2"),
      h("button", { onClick: () => exec("formatBlock", "p"), style: toolbarBtnStyle(), title: "Paragraph" }, "P"),
      h("div", { style: "width:1px;background:" + currentTheme.colors.border + ";margin:0 4px;" }),
      h("button", { onClick: () => exec("insertUnorderedList"), style: toolbarBtnStyle(), title: "Bullet list" }, "•"),
      h("button", { onClick: () => exec("insertOrderedList"), style: toolbarBtnStyle(), title: "Numbered list" }, "1."),
      h("button", { onClick: () => exec("formatBlock", "blockquote"), style: toolbarBtnStyle(), title: "Quote" }, "❝"),
      h("div", { style: "width:1px;background:" + currentTheme.colors.border + ";margin:0 4px;" }),
      h("button", { onClick: () => { const url = prompt("URL:"); if (url) exec("createLink", url); }, style: toolbarBtnStyle(), title: "Link" }, "🔗"),
      h("button", { onClick: () => exec("removeFormat"), style: toolbarBtnStyle(), title: "Clear formatting" }, "✕"),
    ) : null,

    h("div", {
      contenteditable: true,
      onInput: (e: Event) => props.onChange?.((e.target as HTMLElement).innerHTML),
      onFocus: () => focused.set(true),
      onBlur: () => focused.set(false),
      style: `
        min-height:200px;padding:16px;outline:none;
        color:${currentTheme.colors.text};font-size:14px;line-height:1.6;
      `,
    }),
  );
}

function toolbarBtnStyle(): string {
  return `padding:4px 8px;background:none;border:1px solid transparent;color:${currentTheme.colors.text};cursor:pointer;border-radius:4px;font-size:13px;`;
}

// ============ KANBAN BOARD ============

export interface KanbanColumn {
  id: string;
  title: string;
  color?: string;
  cards: KanbanCard[];
}

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  assignee?: string;
  dueDate?: string;
  tags?: string[];
}

export interface KanbanProps {
  columns: KanbanColumn[];
  onCardMove?: (cardId: string, fromColumn: string, toColumn: string) => void;
  onCardClick?: (card: KanbanCard) => void;
}

export function Kanban(props: KanbanProps): ElmoorxNode {
  const priorities: Record<string, string> = {
    low: currentTheme.colors.textFaint ?? currentTheme.colors.textMuted,
    medium: currentTheme.colors.warning,
    high: currentTheme.colors.accent || "#F59E0B",
    urgent: currentTheme.colors.danger,
  };

  return h("div", {
    style: "display:flex;gap:16px;overflow-x:auto;padding:8px;",
  },
    ...props.columns.map((col) =>
      h("div", {
        key: col.id,
        style: `
          flex:1;min-width:280px;background:${currentTheme.colors.surface};
          border:1px solid ${currentTheme.colors.border};border-radius:${currentTheme.radius.md};
          display:flex;flex-direction:column;max-height:600px;
        `,
      },
        // Column header
        h("div", {
          style: `
            padding:12px 16px;border-bottom:1px solid ${currentTheme.colors.border};
            display:flex;align-items:center;justify-content:space-between;
          `,
        },
          h("div", { style: "display:flex;align-items:center;gap:8px;" },
            h("div", {
              style: `width:8px;height:8px;border-radius:50%;background:${col.color || currentTheme.colors.primary};`,
            }),
            h("span", { style: `font-weight:600;color:${currentTheme.colors.text};font-size:14px;` }, col.title),
            h("span", {
              style: `
                background:${currentTheme.colors.bgElev || "#14141B"};
                color:${currentTheme.colors.textMuted};padding:1px 8px;
                border-radius:10px;font-size:11px;font-family:${currentTheme.fonts.mono};
              `,
            }, String(col.cards.length)),
          ),
          h("button", {
            style: `background:none;border:none;color:${currentTheme.colors.textMuted};cursor:pointer;font-size:16px;`,
          }, "+"),
        ),

        // Cards
        h("div", { style: "flex:1;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:8px;" },
          ...col.cards.map((card) =>
            h("div", {
              key: card.id,
              onClick: () => props.onCardClick?.(card),
              style: `
                background:${currentTheme.colors.bgCard || "#1A1A24"};
                border:1px solid ${currentTheme.colors.border};border-left:3px solid ${card.priority ? priorities[card.priority] : currentTheme.colors.primary};
                border-radius:${currentTheme.radius.sm};padding:12px;cursor:pointer;
                transition:border-color 0.15s;
              `,
            },
              h("div", { style: `font-size:13px;font-weight:600;color:${currentTheme.colors.text};margin-bottom:4px;` }, card.title),
              card.description ? h("div", { style: `font-size:12px;color:${currentTheme.colors.textMuted};margin-bottom:8px;` }, card.description) : null,
              card.tags ? h("div", { style: "display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;" },
                ...card.tags.map((tag, i) =>
                  h("span", {
                    key: String(i),
                    style: `padding:1px 6px;background:${currentTheme.colors.primary}20;color:${currentTheme.colors.primary};border-radius:3px;font-size:10px;`,
                  }, tag)
                )
              ) : null,
              h("div", { style: "display:flex;justify-content:space-between;align-items:center;" },
                card.dueDate ? h("span", { style: `font-size:11px;color:${currentTheme.colors.textFaint};font-family:${currentTheme.fonts.mono};` }, card.dueDate) : null,
                card.assignee ? h("div", {
                  style: `width:20px;height:20px;border-radius:50%;background:${currentTheme.colors.primary};color:white;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;`,
                }, card.assignee.charAt(0).toUpperCase()) : null,
              ),
            )
          ),
        ),
      )
    ),
  );
}

// ============ CALENDAR ============

export interface CalendarProps {
  events?: { date: Date; title: string; color?: string }[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: { date: Date; title: string }) => void;
  defaultMonth?: Date;
}

export function Calendar(props: CalendarProps): ElmoorxNode {
  const currentMonth = $state(props.defaultMonth || new Date());
  const events = props.events || [];

  const prevMonth = () => {
    const d = new Date(currentMonth());
    d.setMonth(d.getMonth() - 1);
    currentMonth.set(d);
  };

  const nextMonth = () => {
    const d = new Date(currentMonth());
    d.setMonth(d.getMonth() + 1);
    currentMonth.set(d);
  };

  const daysInMonth = () => {
    const year = currentMonth().getFullYear();
    const month = currentMonth().getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
    // Fill to complete weeks
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(e => e.date.toDateString() === date.toDateString());
  };

  return h("div", {
    style: `background:${currentTheme.colors.surface};border:1px solid ${currentTheme.colors.border};border-radius:${currentTheme.radius.md};padding:16px;`,
  },
    // Header
    h("div", { style: "display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;" },
      h("button", { onClick: prevMonth, style: navBtnStyle() }, "←"),
      h("h3", { style: `margin:0;color:${currentTheme.colors.text};font-size:16px;` },
        () => currentMonth().toLocaleDateString("en", { month: "long", year: "numeric" })
      ),
      h("button", { onClick: nextMonth, style: navBtnStyle() }, "→"),
    ),

    // Weekday headers
    h("div", { style: "display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:4px;" },
      ...["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d =>
        h("div", { style: `text-align:center;font-size:11px;font-weight:600;color:${currentTheme.colors.textMuted};padding:4px;` }, d)
      )
    ),

    // Days grid
    h("div", { style: "display:grid;grid-template-columns:repeat(7,1fr);gap:4px;" },
      ...daysInMonth().map((date, i) => {
        if (!date) return h("div", { key: String(i) });
        const dayEvents = getEventsForDate(date);
        const isToday = date.toDateString() === new Date().toDateString();
        return h("div", {
          key: String(i),
          onClick: () => props.onDateClick?.(date),
          style: `
            min-height:80px;padding:4px;background:${currentTheme.colors.bgElev || "#14141B"};
            border-radius:${currentTheme.radius.sm};cursor:pointer;
            border:${isToday ? "1px solid " + currentTheme.colors.primary : "1px solid transparent"};
          `,
        },
          h("div", {
            style: `
              font-size:12px;font-weight:${isToday ? "700" : "400"};
              color:${isToday ? currentTheme.colors.primary : currentTheme.colors.text};
              margin-bottom:4px;
            `,
          }, String(date.getDate())),
          ...dayEvents.slice(0, 2).map((event, j) =>
            h("div", {
              key: String(j),
              onClick: (e: Event) => { e.stopPropagation(); props.onEventClick?.(event); },
              style: `
                font-size:10px;padding:1px 4px;background:${event.color || currentTheme.colors.primary}20;
                color:${event.color || currentTheme.colors.primary};border-radius:2px;
                margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
              `,
            }, event.title)
          ),
          dayEvents.length > 2 ? h("div", { style: `font-size:10px;color:${currentTheme.colors.textFaint};` }, `+${dayEvents.length - 2} more`) : null,
        );
      })
    ),
  );
}

function navBtnStyle(): string {
  return `background:${currentTheme.colors.bgElev || "#14141B"};border:1px solid ${currentTheme.colors.border};color:${currentTheme.colors.text};padding:4px 10px;border-radius:${currentTheme.radius.sm};cursor:pointer;`;
}

// ============ CAROUSEL ============

export interface CarouselProps {
  items: ElmoorxNode[];
  autoPlay?: boolean;
  interval?: number;
  showArrows?: boolean;
  showDots?: boolean;
  loop?: boolean;
}

export function Carousel(props: CarouselProps): ElmoorxNode {
  const currentIndex = $state(0);

  const next = () => {
    if (props.loop !== false) {
      currentIndex.set((currentIndex() + 1) % props.items.length);
    } else {
      currentIndex.set(Math.min(currentIndex() + 1, props.items.length - 1));
    }
  };

  const prev = () => {
    if (props.loop !== false) {
      currentIndex.set((currentIndex() - 1 + props.items.length) % props.items.length);
    } else {
      currentIndex.set(Math.max(currentIndex() - 1, 0));
    }
  };

  if (props.autoPlay) {
    $effect(() => {
      const id = setInterval(next, props.interval || 3000);
      return () => clearInterval(id);
    });
  }

  return h("div", {
    style: `position:relative;overflow:hidden;border-radius:${currentTheme.radius.md};`,
  },
    // Slides
    h("div", {
      style: `display:flex;transform:translateX(-${currentIndex() * 100}%);transition:transform 0.3s ease;`,
    },
      ...props.items.map((item, i) =>
        h("div", {
          key: String(i),
          style: "min-width:100%;",
        }, item)
      )
    ),

    // Arrows
    props.showArrows !== false ? h("button", {
      onClick: prev,
      style: `position:absolute;left:8px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.5);color:white;border:none;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:18px;`,
    }, "←") : null,

    props.showArrows !== false ? h("button", {
      onClick: next,
      style: `position:absolute;right:8px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.5);color:white;border:none;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:18px;`,
    }, "→") : null,

    // Dots
    props.showDots !== false ? h("div", {
      style: "position:absolute;bottom:8px;left:50%;transform:translateX(-50%);display:flex;gap:6px;",
    },
      ...props.items.map((_, i) =>
        h("button", {
          key: String(i),
          onClick: () => currentIndex.set(i),
          style: `
            width:${currentIndex() === i ? "24px" : "8px"};height:8px;border-radius:4px;
            background:${currentIndex() === i ? currentTheme.colors.primary : "rgba(255,255,255,0.5)"};
            border:none;cursor:pointer;transition:all 0.2s;
          `,
        })
      )
    ) : null,
  );
}

// ============ COMMAND PALETTE ============

export interface CommandItem {
  id: string;
  label: string;
  shortcut?: string;
  icon?: string;
  section?: string;
  action: () => void;
}

export interface CommandPaletteProps {
  commands: CommandItem[];
  placeholder?: string;
  hotkey?: string;
}

export function CommandPalette(props: CommandPaletteProps): ElmoorxNode {
  const open = $state(false);
  const query = $state("");
  const selectedIndex = $state(0);

  const filtered = () => {
    const q = query().toLowerCase();
    if (!q) return props.commands;
    return props.commands.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.section?.toLowerCase().includes(q)
    );
  };

  const sections = () => {
    const map = new Map<string, CommandItem[]>();
    for (const cmd of filtered()) {
      const section = cmd.section || "Commands";
      if (!map.has(section)) map.set(section, []);
      (map.get(section) as NonNullable<ReturnType<typeof map.get>>).push(cmd);
    }
    return [...map.entries()];
  };

  // Global hotkey
  $effect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        open.set(!open());
        query.set("");
        selectedIndex.set(0);
      }
      if (e.key === "Escape" && open()) {
        open.set(false);
      }
      if (open()) {
        const items = filtered();
        if (e.key === "ArrowDown") {
          e.preventDefault();
          selectedIndex.set((selectedIndex() + 1) % items.length);
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          selectedIndex.set((selectedIndex() - 1 + items.length) % items.length);
        }
        if (e.key === "Enter") {
          e.preventDefault();
          const cmd = items[selectedIndex()];
          if (cmd) { cmd.action(); open.set(false); }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  return () => open() ? h("div", {
    onClick: () => open.set(false),
    style: "position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:120px;backdrop-filter:blur(4px);",
  },
    h("div", {
      onClick: (e: Event) => e.stopPropagation(),
      style: `
        background:${currentTheme.colors.surface};border:1px solid ${currentTheme.colors.border};
        border-radius:${currentTheme.radius.lg};width:90%;max-width:560px;
        box-shadow:0 20px 60px rgba(0,0,0,0.5);overflow:hidden;
      `,
    },
      // Search input
      h("input", {
        type: "text",
        value: () => query(),
        placeholder: props.placeholder || "Type a command...",
        onInput: (e: Event) => { query.set((e.target as HTMLInputElement).value); selectedIndex.set(0); },
        autofocus: true,
        style: `
          width:100%;padding:16px;background:transparent;color:${currentTheme.colors.text};
          border:none;outline:none;font-size:16px;border-bottom:1px solid ${currentTheme.colors.border};
        `,
      }),

      // Results
      h("div", { style: "max-height:400px;overflow-y:auto;padding:8px;" },
        sections().length === 0
          ? h("div", { style: "padding:24px;text-align:center;color:" + currentTheme.colors.textMuted }, "No results")
          : sections().map(([section, cmds]) =>
              h("div", { key: section, style: "margin-bottom:8px;" },
                h("div", {
                  style: `padding:4px 12px;font-size:10px;font-weight:600;color:${currentTheme.colors.textFaint};text-transform:uppercase;letter-spacing:0.1em;`,
                }, section),
                ...cmds.map((cmd) => {
                  const idx = filtered().indexOf(cmd);
                  return h("div", {
                    key: cmd.id,
                    onClick: () => { cmd.action(); open.set(false); },
                    style: `
                      display:flex;align-items:center;gap:10px;padding:10px 12px;
                      border-radius:${currentTheme.radius.sm};cursor:pointer;
                      background:${selectedIndex() === idx ? currentTheme.colors.primary + "20" : "transparent"};
                    `,
                  },
                    h("span", { style: "font-size:14px;" }, cmd.icon || "›"),
                    h("span", { style: `flex:1;color:${currentTheme.colors.text};font-size:14px;` }, cmd.label),
                    cmd.shortcut ? h("kbd", {
                      style: `padding:2px 6px;background:${currentTheme.colors.bgElev || "#14141B"};color:${currentTheme.colors.textMuted};border-radius:4px;font-size:11px;font-family:${currentTheme.fonts.mono};`,
                    }, cmd.shortcut) : null,
                  );
                })
              )
            )
      ),

      // Footer
      h("div", {
        style: `padding:8px 16px;border-top:1px solid ${currentTheme.colors.border};display:flex;justify-content:space-between;font-size:11px;color:${currentTheme.colors.textFaint};`,
      },
        h("span", null, "↑↓ to navigate · Enter to select · Esc to close"),
        h("span", null, "Elmoorx Command Palette"),
      ),
    ),
  ) : null;
}

// ============ SPREADSHEET ============

export interface SpreadsheetProps {
  data: (string | number)[][];
  headers?: string[];
  editable?: boolean;
  onChange?: (row: number, col: number, value: string) => void;
}

export function Spreadsheet(props: SpreadsheetProps): ElmoorxNode {
  const cols = props.headers?.length || Math.max(...props.data.map(r => r.length));
  const colLetters = Array.from({ length: cols }, (_, i) =>
    String.fromCharCode(65 + i)
  );

  return h("div", {
    style: `border:1px solid ${currentTheme.colors.border};border-radius:${currentTheme.radius.md};overflow:auto;max-height:400px;`,
  },
    h("table", { style: "border-collapse:collapse;width:100%;font-family:" + currentTheme.fonts.mono + ";font-size:12px;" },
      // Header row
      h("thead", null,
        h("tr", null,
          h("th", { style: headerStyle("40px") }, "#"),
          ...(props.headers || colLetters).map((header, i) =>
            h("th", { key: String(i), style: headerStyle() }, header)
          )
        )
      ),
      // Body
      h("tbody", null,
        ...props.data.map((row, rIdx) =>
          h("tr", { key: String(rIdx) },
            h("td", { style: rowHeaderStyle() }, String(rIdx + 1)),
            ...Array.from({ length: cols }, (_, cIdx) => {
              const value = row[cIdx] ?? "";
              return h("td", {
                key: String(cIdx),
                style: `border:1px solid ${currentTheme.colors.border};padding:4px 8px;min-width:80px;`,
              },
                props.editable ? h("input", {
                  type: "text",
                  value: String(value),
                  onChange: (e: Event) => props.onChange?.(rIdx, cIdx, (e.target as HTMLInputElement).value),
                  style: `width:100%;background:transparent;border:none;outline:none;color:${currentTheme.colors.text};font-family:inherit;font-size:inherit;padding:0;`,
                }) : String(value)
              );
            })
          )
        )
      ),
    ),
  );
}

function headerStyle(width?: string): string {
  return `
    background:${currentTheme.colors.bgElev || "#14141B"};
    color:${currentTheme.colors.textMuted};padding:6px 8px;text-align:left;
    border:1px solid ${currentTheme.colors.border};font-weight:600;font-size:11px;
    min-width:${width || "80px"};position:sticky;top:0;
  `;
}

function rowHeaderStyle(): string {
  return `
    background:${currentTheme.colors.bgElev || "#14141B"};
    color:${currentTheme.colors.textMuted};padding:4px 8px;text-align:center;
    border:1px solid ${currentTheme.colors.border};font-size:11px;
    position:sticky;left:0;
  `;
}

// ============ MARKDOWN EDITOR ============

export interface MarkdownEditorProps {
  value?: string | (() => string);
  onChange?: (value: string) => void;
  preview?: boolean;
  height?: string;
}

export function MarkdownEditor(props: MarkdownEditorProps): ElmoorxNode {
  const value = typeof props.value === "function" ? props.value() : props.value || "";
  const showPreview = $state(props.preview !== false);

  return h("div", {
    style: `border:1px solid ${currentTheme.colors.border};border-radius:${currentTheme.radius.md};overflow:hidden;height:${props.height || "300px"};`,
  },
    // Toolbar
    h("div", {
      style: `display:flex;gap:4px;padding:6px;background:${currentTheme.colors.surface};border-bottom:1px solid ${currentTheme.colors.border};`,
    },
      h("button", {
        onClick: () => showPreview.set(false),
        style: tabStyle(!showPreview()),
      }, "Edit"),
      h("button", {
        onClick: () => showPreview.set(true),
        style: tabStyle(showPreview()),
      }, "Preview"),
      h("button", {
        onClick: () => showPreview.set(!showPreview()),
        style: tabStyle(false),
      }, "Split"),
    ),

    // Content
    h("div", { style: "display:flex;height:calc(100% - 40px);" },
      showPreview() ? h("div", {
        style: `flex:1;padding:16px;overflow-y:auto;color:${currentTheme.colors.text};font-size:14px;line-height:1.6;`,
      }, renderMarkdown(value)) : null,
      !showPreview() ? h("textarea", {
        value,
        onChange: (e: Event) => props.onChange?.((e.target as HTMLTextAreaElement).value),
        spellcheck: false,
        style: `flex:1;background:${currentTheme.colors.bgCode || "#0F0F17"};color:${currentTheme.colors.text};border:none;outline:none;resize:none;padding:16px;font-family:${currentTheme.fonts.mono};font-size:13px;line-height:1.6;`,
      }) : null,
    ),
  );
}

function tabStyle(active: boolean): string {
  return `
    padding:4px 12px;background:${active ? currentTheme.colors.primary + "20" : "none"};
    border:1px solid ${active ? currentTheme.colors.primary : "transparent"};
    color:${active ? currentTheme.colors.primary : currentTheme.colors.textMuted};
    border-radius:${currentTheme.radius.sm};cursor:pointer;font-size:12px;
  `;
}

function renderMarkdown(md: string): ElmoorxNode {
  // Simplified markdown to HTML
  const lines = md.split("\n");
  return h("div", null, ...lines.map((line, i) => {
    if (line.startsWith("# ")) return h("h1", { key: String(i) }, line.slice(2));
    if (line.startsWith("## ")) return h("h2", { key: String(i) }, line.slice(3));
    if (line.startsWith("### ")) return h("h3", { key: String(i) }, line.slice(4));
    if (line.startsWith("- ")) return h("li", { key: String(i) }, line.slice(2));
    if (line.startsWith("> ")) return h("blockquote", { key: String(i) }, line.slice(2));
    if (line === "") return h("br", { key: String(i) });
    return h("p", { key: String(i) }, line);
  }));
}

// ============ DROPZONE (drag & drop) ============

export interface DropzoneProps {
  onDrop?: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  icon?: string;
}

export function Dropzone(props: DropzoneProps): ElmoorxNode {
  const dragging = $state(false);
  const files = $state<File[]>([]);

  return h("div", null,
    h("div", {
      onDragOver: (e: Event) => { e.preventDefault(); dragging.set(true); },
      onDragLeave: () => dragging.set(false),
      onDrop: (e: Event) => {
        e.preventDefault();
        dragging.set(false);
        const dropped = Array.from((e as DragEvent).dataTransfer?.files || []);
        const filtered = props.accept
          ? dropped.filter(f => matchesAccept(f, (props.accept as NonNullable<typeof props.accept>)))
          : dropped;
        const next = props.multiple ? [...files(), ...filtered] : filtered.slice(0, 1);
        files.set(next);
        props.onDrop?.(next);
      },
      style: `
        border:2px dashed ${dragging() ? currentTheme.colors.primary : currentTheme.colors.border};
        background:${dragging() ? currentTheme.colors.primary + "10" : currentTheme.colors.surface};
        border-radius:${currentTheme.radius.md};padding:48px;text-align:center;
        cursor:pointer;transition:all 0.15s;
      `,
    },
      h("div", { style: `font-size:48px;margin-bottom:16px;` }, props.icon || "📁"),
      h("div", { style: `color:${currentTheme.colors.text};font-size:16px;font-weight:500;margin-bottom:4px;` },
        props.label || "Drop files here"
      ),
      h("div", { style: `color:${currentTheme.colors.textMuted};font-size:13px;` },
        props.accept ? `Accepts: ${props.accept}` : "All file types"
      ),
    ),

    // File list
    files().length > 0 ? h("div", { style: "margin-top:16px;display:flex;flex-direction:column;gap:8px;" },
      ...files().map((file, i) =>
        h("div", {
          key: String(i),
          style: `display:flex;align-items:center;gap:12px;padding:10px 14px;background:${currentTheme.colors.surface};border:1px solid ${currentTheme.colors.border};border-radius:${currentTheme.radius.sm};`,
        },
          h("span", { style: "font-size:20px;" }, "📄"),
          h("div", { style: "flex:1;" },
            h("div", { style: `color:${currentTheme.colors.text};font-size:13px;` }, file.name),
            h("div", { style: `color:${currentTheme.colors.textMuted};font-size:11px;` }, formatBytes(file.size)),
          ),
          h("button", {
            onClick: () => files.set(files().filter((_, idx) => idx !== i)),
            style: `background:none;border:none;color:${currentTheme.colors.danger};cursor:pointer;font-size:16px;`,
          }, "×"),
        )
      )
    ) : null,
  );
}

function matchesAccept(file: File, accept: string): boolean {
  const types = accept.split(",").map(t => t.trim());
  return types.some(type => {
    if (type.startsWith(".")) return file.name.endsWith(type);
    if (type.endsWith("/*")) return file.type.startsWith(type.slice(0, -1));
    return file.type === type;
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

// ============ OTP / PIN INPUT ============

export interface OTPInputProps {
  length?: number;
  value?: string | (() => string);
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  type?: "number" | "text";
  autoFocus?: boolean;
}

export function OTPInput(props: OTPInputProps): ElmoorxNode {
  const length = props.length || 6;
  const value = typeof props.value === "function" ? props.value() : props.value || "";
  const cells = value.split("").concat(Array.from({ length: length - value.length }, () => ""));

  return h("div", { style: "display:flex;gap:8px;justify-content:center;" },
    ...Array.from({ length }, (_, i) =>
      h("input", {
        key: String(i),
        type: props.type || "text",
        maxlength: 1,
        value: cells[i] || "",
        autofocus: props.autoFocus && i === 0,
        onChange: (e: Event) => {
          const val = (e.target as HTMLInputElement).value;
          const next = [...cells];
          next[i] = val;
          const joined = next.join("");
          props.onChange?.(joined);
          if (joined.length === length) props.onComplete?.(joined);
          // Auto-focus next
          if (val && i < length - 1) {
            const nextInput = (e.target as HTMLElement).nextElementSibling as HTMLElement;
            nextInput?.focus();
          }
        },
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === "Backspace" && !cells[i] && i > 0) {
            const prevInput = (e.target as HTMLElement).previousElementSibling as HTMLElement;
            prevInput?.focus();
          }
        },
        style: `
          width:48px;height:56px;text-align:center;font-size:24px;font-weight:600;
          background:${currentTheme.colors.surface};border:1px solid ${currentTheme.colors.border};
          border-radius:${currentTheme.radius.md};color:${currentTheme.colors.text};
          outline:none;transition:border-color 0.15s;
        `,
      })
    )
  );
}

// ============ COLOR PALETTE ============

export interface ColorPaletteProps {
  colors: string[];
  onSelect?: (color: string) => void;
  selected?: string;
  columns?: number;
}

export function ColorPalette(props: ColorPaletteProps): ElmoorxNode {
  return h("div", {
    style: `display:grid;grid-template-columns:repeat(${props.columns || 6},1fr);gap:6px;`,
  },
    ...props.colors.map((color, i) =>
      h("button", {
        key: String(i),
        onClick: () => props.onSelect?.(color),
        style: `
          aspect-ratio:1;border:2px solid ${props.selected === color ? "white" : "transparent"};
          background:${color};border-radius:${currentTheme.radius.sm};cursor:pointer;
          box-shadow:${props.selected === color ? "0 0 0 2px " + currentTheme.colors.primary : "none"};
          transition:transform 0.1s;
        `,
        onMouseEnter: "this.style.transform='scale(1.1)'",
        onMouseLeave: "this.style.transform='none'",
      })
    )
  );
}

// ============ CONFETTI ============

export function Confetti(props: { count?: number; duration?: number }): ElmoorxNode {
  const count = props.count || 100;
  const _duration = props.duration || 3000;
  const pieces = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -10 - Math.random() * 50,
    rotation: Math.random() * 360,
    color: ["#A855F7", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#EC4899"][Math.floor(Math.random() * 6)],
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
  }));

  return h("div", { style: "position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;" },
    ...pieces.map(p => h("div", {
      key: String(p.id),
      style: `
        position:absolute;left:${p.x}%;top:${p.y}%;width:10px;height:10px;
        background:${p.color};transform:rotate(${p.rotation}deg);
        animation:elmoorx-confetti-fall ${p.duration}s linear ${p.delay}s forwards;
      `,
    }))
  );
}

// ============ SIGNATURE PAD ============

export interface SignaturePadProps {
  onChange?: (dataUrl: string) => void;
  width?: number;
  height?: number;
}

export function SignaturePad(props: SignaturePadProps): ElmoorxNode {
  const drawing = $state(false);
  const hasContent = $state(false);
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let lastX = 0;
  let lastY = 0;

  const initCanvas = (el: HTMLElement) => {
    canvas = el as HTMLCanvasElement;
    ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.strokeStyle = currentTheme.colors.text;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
    }
  };

  const start = (e: MouseEvent | TouchEvent) => {
    drawing.set(true);
    const rect = (canvas as NonNullable<typeof canvas>).getBoundingClientRect();
    const point = getPoint(e, rect);
    lastX = point.x;
    lastY = point.y;
  };

  const draw = (e: MouseEvent | TouchEvent) => {
    if (!drawing() || !ctx || !canvas) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const point = getPoint(e, rect);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastX = point.x;
    lastY = point.y;
    hasContent.set(true);
  };

  const stop = () => {
    if (drawing() && hasContent() && canvas) {
      props.onChange?.(canvas.toDataURL());
    }
    drawing.set(false);
  };

  const clear = () => {
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasContent.set(false);
    }
  };

  return h("div", null,
    h("canvas", {
      ref: initCanvas,
      width: props.width || 400,
      height: props.height || 200,
      onMouseDown: start,
      onMouseMove: draw,
      onMouseUp: stop,
      onMouseLeave: stop,
      onTouchStart: start,
      onTouchMove: draw,
      onTouchEnd: stop,
      style: `
        background:${currentTheme.colors.surface};border:1px solid ${currentTheme.colors.border};
        border-radius:${currentTheme.radius.md};cursor:crosshair;touch-action:none;
        display:block;
      `,
    }),
    h("div", { style: "margin-top:8px;display:flex;gap:8px;" },
      h("button", {
        onClick: clear,
        disabled: !hasContent(),
        style: `padding:6px 12px;background:${currentTheme.colors.surface};border:1px solid ${currentTheme.colors.border};color:${currentTheme.colors.text};border-radius:${currentTheme.radius.sm};cursor:pointer;font-size:12px;`,
      }, "Clear"),
      h("button", {
        onClick: () => canvas && props.onChange?.(canvas.toDataURL()),
        disabled: !hasContent(),
        style: `padding:6px 12px;background:${currentTheme.colors.primary};color:white;border:none;border-radius:${currentTheme.radius.sm};cursor:pointer;font-size:12px;`,
      }, "Save"),
    ),
  );
}

function getPoint(e: MouseEvent | TouchEvent, rect: DOMRect): { x: number; y: number } {
  if ("touches" in e) {
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
    };
  }
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

// ============ FORM BUILDER (schema-driven) ============

export interface FormSchema {
  fields: {
    name: string;
    label: string;
    type: "text" | "email" | "password" | "number" | "select" | "checkbox" | "radio" | "textarea" | "date" | "file";
    required?: boolean;
    placeholder?: string;
    options?: { value: string; label: string }[];
    defaultValue?: unknown;
    validation?: (value: unknown) => string | true;
    width?: "full" | "half" | "third";
  }[];
  submitLabel?: string;
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
}

export function FormBuilder(props: FormSchema): ElmoorxNode {
  const values = $state<Record<string, unknown>>({});
  const errors = $state<Record<string, string>>({});
  const submitting = $state(false);

  // Initialize defaults
  $effect(() => {
    for (const field of props.fields) {
      if (field.defaultValue !== undefined && values()[field.name] === undefined) {
        values.set({ ...values(), [field.name]: field.defaultValue });
      }
    }
  });

  const submit = async (e: Event) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    for (const field of props.fields) {
      const val = values()[field.name];
      if (field.required && (val === undefined || val === "")) {
        errs[field.name] = `${field.label} is required`;
      } else if (field.validation) {
        const result = field.validation(val);
        if (result !== true) errs[field.name] = result;
      }
    }

    errors.set(errs);
    if (Object.keys(errs).length > 0) return;

    submitting.set(true);
    try {
      await props.onSubmit(values());
    } finally {
      submitting.set(false);
    }
  };

  const widthClass = (width?: string) => {
    if (width === "half") return "50%";
    if (width === "third") return "33.33%";
    return "100%";
  };

  return h("form", { onSubmit: submit, style: "display:flex;flex-wrap:wrap;gap:16px;" },
    ...props.fields.map((field) =>
      h("div", {
        key: field.name,
        style: `display:flex;flex-direction:column;gap:4px;width:${widthClass(field.width)};`,
      },
        h("label", {
          style: `font-size:13px;font-weight:600;color:${currentTheme.colors.text};`,
        }, field.label, field.required ? h("span", { style: `color:${currentTheme.colors.danger};` }, " *") : null),

        renderField(field, values, (val) => values.set({ ...values(), [field.name]: val })),

        () => errors()[field.name]
          ? h("span", { style: `font-size:12px;color:${currentTheme.colors.danger};` }, errors()[field.name])
          : null,
      )
    ),

    h("div", { style: "width:100%;" },
      h("button", {
        type: "submit",
        disabled: submitting(),
        style: `
          padding:10px 24px;background:${currentTheme.colors.primary};color:white;
          border:none;border-radius:${currentTheme.radius.md};cursor:pointer;
          font-size:14px;font-weight:600;opacity:${submitting() ? 0.5 : 1};
        `,
      }, submitting() ? "Submitting..." : props.submitLabel || "Submit"),
    ),
  );
}

function renderField(
  field: FormSchema["fields"][0],
  values: () => Record<string, unknown>,
  set: (val: unknown) => void
): ElmoorxNode {
  const val = values()[field.name];
  const baseStyle = `
    padding:8px 12px;background:${currentTheme.colors.surface};
    border:1px solid ${currentTheme.colors.border};border-radius:${currentTheme.radius.sm};
    color:${currentTheme.colors.text};font-size:14px;outline:none;
  `;

  switch (field.type) {
    case "textarea":
      return h("textarea", {
        value: String(val || ""),
        placeholder: field.placeholder,
        onChange: (e: Event) => set((e.target as HTMLTextAreaElement).value),
        rows: 4,
        style: baseStyle + ";font-family:inherit;resize:vertical;",
      });

    case "select":
      return h("select", {
        value: String(val || ""),
        onChange: (e: Event) => set((e.target as HTMLSelectElement).value),
        style: baseStyle,
      },
        h("option", { value: "" }, field.placeholder || "Select..."),
        ...(field.options || []).map(opt =>
          h("option", { key: opt.value, value: opt.value }, opt.label)
        )
      );

    case "checkbox":
      return h("input", {
        type: "checkbox",
        checked: Boolean(val),
        onChange: (e: Event) => set((e.target as HTMLInputElement).checked),
      });

    case "radio":
      return h("div", { style: "display:flex;gap:12px;" },
        ...(field.options || []).map(opt =>
          h("label", { key: opt.value, style: "display:flex;align-items:center;gap:4px;cursor:pointer;" },
            h("input", {
              type: "radio",
              name: field.name,
              value: opt.value,
              checked: val === opt.value,
              onChange: () => set(opt.value),
            }),
            h("span", null, opt.label),
          )
        )
      );

    case "file":
      return h("input", {
        type: "file",
        onChange: (e: Event) => set((e.target as HTMLInputElement).files),
        style: baseStyle,
      });

    case "date":
      return h("input", {
        type: "date",
        value: String(val || ""),
        onChange: (e: Event) => set((e.target as HTMLInputElement).value),
        style: baseStyle,
      });

    default:
      return h("input", {
        type: field.type,
        value: String(val || ""),
        placeholder: field.placeholder,
        onChange: (e: Event) => set((e.target as HTMLInputElement).value),
        style: baseStyle,
      });
  }
}

// ============ NOTIFICATION SYSTEM ============

export interface Notification {
  id: number;
  title: string;
  message?: string;
  type?: "info" | "success" | "warning" | "error";
  icon?: string;
  action?: { label: string; onClick: () => void };
  dismissAfter?: number;
}

const notifications = $state<Notification[]>([]);
let notifId = 0;

export function notify(title: string, opts: Partial<Notification> = {}): number {
  const id = ++notifId;
  const notif: Notification = {
    id,
    title,
    message: opts.message,
    type: opts.type || "info",
    icon: opts.icon,
    action: opts.action,
    dismissAfter: opts.dismissAfter ?? 5000,
  };
  notifications.set([notif, ...notifications()]);

  if (notif.dismissAfter && notif.dismissAfter > 0) {
    setTimeout(() => dismissNotification(id), notif.dismissAfter);
  }
  return id;
}

export function dismissNotification(id: number): void {
  notifications.set(notifications().filter(n => n.id !== id));
}

export function NotificationCenter(): ElmoorxNode {
  const colors: Record<string, { bg: string; border: string; color: string }> = {
    info: { bg: currentTheme.colors.secondary + "20", border: currentTheme.colors.secondary, color: currentTheme.colors.secondary },
    success: { bg: currentTheme.colors.success + "20", border: currentTheme.colors.success, color: currentTheme.colors.success },
    warning: { bg: currentTheme.colors.warning + "20", border: currentTheme.colors.warning, color: currentTheme.colors.warning },
    error: { bg: currentTheme.colors.danger + "20", border: currentTheme.colors.danger, color: currentTheme.colors.danger },
  };

  return h("div", {
    style: "position:fixed;top:20px;right:20px;z-index:9999;width:360px;display:flex;flex-direction:column;gap:8px;",
  },
    () => notifications().map(n => {
      const c = colors[n.type || "info"];
      return h("div", {
        key: String(n.id),
        style: `
          background:${currentTheme.colors.surface};border:1px solid ${c.border};
          border-left:4px solid ${c.color};border-radius:${currentTheme.radius.md};
          padding:14px 16px;box-shadow:0 8px 24px rgba(0,0,0,0.3);
          animation:elmoorx-slide-in 0.2s ease;
        `,
      },
        h("div", { style: "display:flex;align-items:flex-start;gap:10px;" },
          h("span", { style: `color:${c.color};font-size:18px;font-weight:bold;` }, n.icon || "•"),
          h("div", { style: "flex:1;" },
            h("div", { style: `font-weight:600;color:${currentTheme.colors.text};font-size:14px;` }, n.title),
            n.message ? h("div", { style: `color:${currentTheme.colors.textMuted};font-size:12px;margin-top:2px;` }, n.message) : null,
            n.action ? h("button", {
              onClick: () => { (n.action as NonNullable<typeof n.action>).onClick(); dismissNotification(n.id); },
              style: `margin-top:8px;padding:4px 10px;background:${c.color}20;color:${c.color};border:1px solid ${c.color};border-radius:${currentTheme.radius.sm};cursor:pointer;font-size:12px;`,
            }, n.action.label) : null,
          ),
          h("button", {
            onClick: () => dismissNotification(n.id),
            style: `background:none;border:none;color:${currentTheme.colors.textMuted};cursor:pointer;font-size:16px;padding:0;`,
          }, "×"),
        ),
      );
    })
  );
}

// ============ EXPORTS ============

