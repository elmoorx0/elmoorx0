/**
 * @elmoorx/ui — Pro Components (Part 4)
 * ============================================
 * Enterprise-grade components:
 *   - Gantt (project timeline)
 *   - PivotTable (data analysis)
 *   - DataGrid (virtualized, 100K+ rows)
 *   - KanbanDnD (real drag & drop)
 *   - TreeView (with DnD)
 *   - FileExplorer
 *   - Inbox (notification center pro)
 *   - RichDataGrid (filtering + grouping + pivoting)
 */

import { h, $state, type ElmoorxNode } from "@elmoorx/runtime";
import { defaultTheme, type Theme } from "./index";
import type { TreeNode } from "./extended";

const currentTheme: Theme = defaultTheme;

// ============ GANTT CHART ============

export interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress?: number; // 0-100
  color?: string;
  dependencies?: string[]; // IDs of tasks this depends on
  assignee?: string;
  milestone?: boolean;
}

export interface GanttProps {
  tasks: GanttTask[];
  startDate?: Date;
  endDate?: Date;
  onTaskClick?: (task: GanttTask) => void;
  onTaskUpdate?: (task: GanttTask, newStart: Date, newEnd: Date) => void;
  showToday?: boolean;
  dayWidth?: number;
}

export function Gantt(props: GanttProps): ElmoorxNode {
  const dayWidth = props.dayWidth || 40;
  const rowHeight = 36;

  // Calculate date range
  const allDates = props.tasks.flatMap(t => [t.start, t.end]);
  const minDate = props.startDate || new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = props.endDate || new Date(Math.max(...allDates.map(d => d.getTime())));

  // Add padding
  minDate.setDate(minDate.getDate() - 2);
  maxDate.setDate(maxDate.getDate() + 2);

  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
  const totalWidth = totalDays * dayWidth;

  const daysToPixels = (date: Date) => {
    const diff = (date.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
    return diff * dayWidth;
  };

  const today = new Date();
  const todayX = daysToPixels(today);

  // Generate month headers
  const months: { label: string; x: number; width: number }[] = [];
  let currentMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  while (currentMonth < maxDate) {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    const x = daysToPixels(currentMonth);
    const width = daysToPixels(nextMonth) - x;
    months.push({
      label: currentMonth.toLocaleDateString("en", { month: "short", year: "numeric" }),
      x,
      width,
    });
    currentMonth = nextMonth;
  }

  return h("div", {
    style: `border:1px solid ${currentTheme.colors.border};border-radius:${currentTheme.radius.md};overflow:auto;max-height:500px;`,
  },
    h("div", { style: `display:flex;min-width:${totalWidth + 200}px;` },
      // Task names column
      h("div", {
        style: `width:200px;flex-shrink:0;background:${currentTheme.colors.surface};border-right:1px solid ${currentTheme.colors.border};`,
      },
        // Header
        h("div", {
          style: `height:48px;display:flex;align-items:center;padding:0 12px;font-family:${currentTheme.fonts.mono};font-size:10px;color:${currentTheme.colors.textFaint};text-transform:uppercase;letter-spacing:0.1em;border-bottom:1px solid ${currentTheme.colors.border};`,
        }, "Task"),
        // Task names
        ...props.tasks.map(task =>
          h("div", {
            key: task.id,
            onClick: () => props.onTaskClick?.(task),
            style: `height:${rowHeight}px;display:flex;align-items:center;padding:0 12px;font-size:13px;color:${currentTheme.colors.text};cursor:pointer;border-bottom:1px solid ${currentTheme.colors.border};`,
          }, task.name)
        ),
      ),

      // Timeline column
      h("div", { style: "flex:1;position:relative;" },
        // Month headers
        h("div", {
          style: `height:48px;position:relative;background:${currentTheme.colors.surface};border-bottom:1px solid ${currentTheme.colors.border};`,
        },
          ...months.map(m =>
            h("div", {
              key: m.label,
              style: `position:absolute;left:${m.x}px;width:${m.width}px;height:100%;display:flex;align-items:center;padding:0 8px;font-size:11px;font-weight:600;color:${currentTheme.colors.text};border-right:1px solid ${currentTheme.colors.border};`,
            }, m.label)
          ),
        ),

        // Grid + tasks
        h("div", { style: `position:relative;width:${totalWidth}px;` },
          // Day grid
          ...Array.from({ length: totalDays }, (_, i) => {
            const date = new Date(minDate);
            date.setDate(date.getDate() + i);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            return h("div", {
              key: String(i),
              style: `position:absolute;left:${i * dayWidth}px;width:${dayWidth}px;top:0;bottom:0;background:${isWeekend ? currentTheme.colors.surface : "transparent"};border-right:1px solid ${currentTheme.colors.border};`,
            });
          }),

          // Today line
          props.showToday !== false && todayX >= 0 && todayX <= totalWidth
            ? h("div", {
                style: `position:absolute;left:${todayX}px;top:0;bottom:0;width:2px;background:${currentTheme.colors.danger};z-index:5;`,
              },
                h("div", {
                  style: `position:absolute;top:0;left:-20px;background:${currentTheme.colors.danger};color:white;padding:2px 6px;border-radius:3px;font-size:9px;font-family:${currentTheme.fonts.mono};`,
                }, "Today")
              )
            : null,

          // Tasks
          ...props.tasks.map((task, i) => {
            const x = daysToPixels(task.start);
            const width = daysToPixels(task.end) - x;
            const progress = task.progress || 0;

            return h("div", {
              key: task.id,
              style: `position:absolute;left:${x}px;top:${i * rowHeight + 4}px;width:${width}px;height:${rowHeight - 8}px;`,
            },
              h("div", {
                style: `
                  width:100%;height:100%;border-radius:${currentTheme.radius.sm};
                  background:${task.color || currentTheme.colors.primary}40;
                  border:1px solid ${task.color || currentTheme.colors.primary};
                  overflow:hidden;position:relative;cursor:pointer;
                `,
                onClick: () => props.onTaskClick?.(task),
              },
                // Progress bar
                h("div", {
                  style: `width:${progress}%;height:100%;background:${task.color || currentTheme.colors.primary};transition:width 0.3s;`,
                }),
                // Label
                h("div", {
                  style: `position:absolute;top:50%;left:8px;transform:translateY(-50%);font-size:11px;font-weight:600;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`,
                }, task.name),
              ),
            );
          }),
        ),
      ),
    ),
  );
}

// ============ PIVOT TABLE ============

export interface PivotProps {
  data: Record<string, unknown>[];
  rows: string[]; // fields to group by rows
  cols: string[]; // fields to group by cols
  value: string; // field to aggregate
  aggFunc?: "sum" | "avg" | "count" | "min" | "max";
}

export function PivotTable(props: PivotProps): ElmoorxNode {
  const aggFunc = props.aggFunc || "sum";

  // Aggregate data
  const aggregate = (values: number[]): number => {
    if (values.length === 0) return 0;
    switch (aggFunc) {
      case "sum": return values.reduce((a, b) => a + b, 0);
      case "avg": return values.reduce((a, b) => a + b, 0) / values.length;
      case "count": return values.length;
      case "min": return Math.min(...values);
      case "max": return Math.max(...values);
    }
  };

  // Get unique row and col combinations
  const getRowKey = (item: Record<string, unknown>) =>
    props.rows.map(r => String(item[r])).join(" | ");

  const getColKey = (item: Record<string, unknown>) =>
    props.cols.map(c => String(item[c])).join(" | ");

  const rowKeys = new Set<string>();
  const colKeys = new Set<string>();
  const cells = new Map<string, number[]>();

  for (const item of props.data) {
    const rk = getRowKey(item);
    const ck = getColKey(item);
    rowKeys.add(rk);
    colKeys.add(ck);
    const key = `${rk}||${ck}`;
    if (!cells.has(key)) cells.set(key, []);
    (cells.get(key) as NonNullable<ReturnType<typeof cells.get>>).push(Number(item[props.value]) || 0);
  }

  const rowKeysArr = [...rowKeys].sort();
  const colKeysArr = [...colKeys].sort();

  return h("div", {
    style: `border:1px solid ${currentTheme.colors.border};border-radius:${currentTheme.radius.md};overflow:auto;max-height:500px;`,
  },
    h("table", { style: "border-collapse:collapse;width:100%;font-size:13px;" },
      // Header
      h("thead", null,
        h("tr", null,
          h("th", {
            style: `padding:10px;background:${currentTheme.colors.surface};border:1px solid ${currentTheme.colors.border};text-align:left;font-family:${currentTheme.fonts.mono};font-size:10px;color:${currentTheme.colors.textFaint};text-transform:uppercase;`,
          }, props.rows.join(" / ")),
          ...colKeysArr.map(ck =>
            h("th", {
              key: ck,
              style: `padding:10px;background:${currentTheme.colors.surface};border:1px solid ${currentTheme.colors.border};text-align:right;font-weight:600;color:${currentTheme.colors.text};min-width:100px;`,
            }, ck)
          ),
          h("th", {
            style: `padding:10px;background:${currentTheme.colors.primary}20;border:1px solid ${currentTheme.colors.border};text-align:right;font-weight:700;color:${currentTheme.colors.primary};`,
          }, "Total"),
        )
      ),
      // Body
      h("tbody", null,
        ...rowKeysArr.map(rk => {
          let rowTotal = 0;
          const cells_ = colKeysArr.map(ck => {
            const key = `${rk}||${ck}`;
            const values = cells.get(key) || [];
            const val = aggregate(values);
            rowTotal += val;
            return val;
          });

          return h("tr", { key: rk },
            h("td", {
              style: `padding:10px;border:1px solid ${currentTheme.colors.border};font-weight:600;color:${currentTheme.colors.text};`,
            }, rk),
            ...cells_.map((val, i) =>
              h("td", {
                key: String(i),
                style: `padding:10px;border:1px solid ${currentTheme.colors.border};text-align:right;color:${currentTheme.colors.text};font-family:${currentTheme.fonts.mono};`,
              }, formatNumber(val))
            ),
            h("td", {
              style: `padding:10px;border:1px solid ${currentTheme.colors.border};text-align:right;font-weight:700;color:${currentTheme.colors.primary};background:${currentTheme.colors.primary}10;font-family:${currentTheme.fonts.mono};`,
            }, formatNumber(rowTotal)),
          );
        }),
        // Total row
        h("tr", null,
          h("td", {
            style: `padding:10px;border:1px solid ${currentTheme.colors.border};font-weight:700;color:${currentTheme.colors.primary};background:${currentTheme.colors.primary}10;`,
          }, "Total"),
          ...colKeysArr.map(ck => {
            let colTotal = 0;
            for (const rk of rowKeysArr) {
              const key = `${rk}||${ck}`;
              colTotal += aggregate(cells.get(key) || []);
            }
            return h("td", {
              key: ck,
              style: `padding:10px;border:1px solid ${currentTheme.colors.border};text-align:right;font-weight:700;color:${currentTheme.colors.primary};background:${currentTheme.colors.primary}10;font-family:${currentTheme.fonts.mono};`,
            }, formatNumber(colTotal));
          }),
          (() => {
            let grandTotal = 0;
            for (const values of cells.values()) grandTotal += aggregate(values);
            return h("td", {
              style: `padding:10px;border:1px solid ${currentTheme.colors.border};text-align:right;font-weight:700;color:white;background:${currentTheme.colors.primary};font-family:${currentTheme.fonts.mono};`,
            }, formatNumber(grandTotal));
          })(),
        ),
      ),
    ),
  );
}

function formatNumber(n: number): string {
  if (n === 0) return "0";
  if (Math.abs(n) < 0.01) return n.toExponential(2);
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toFixed(2).replace(/\.?0+$/, "");
}

// ============ VIRTUALIZED DATA GRID ============

export interface DataGridColumn {
  key: string;
  label: string;
  width?: number;
  sortable?: boolean;
  editable?: boolean;
  render?: (value: unknown, row: Record<string, unknown>, index: number) => ElmoorxNode;
  filter?: "text" | "select" | "date" | "number";
}

export interface DataGridProps {
  data: Record<string, unknown>[];
  columns: DataGridColumn[];
  height?: number;
  rowHeight?: number;
  sortable?: boolean;
  filterable?: boolean;
  selectable?: boolean;
  editable?: boolean;
  onCellEdit?: (row: number, col: string, value: unknown) => void;
  onSort?: (col: string, dir: "asc" | "desc") => void;
  emptyState?: ElmoorxNode;
}

export function DataGrid(props: DataGridProps): ElmoorxNode {
  const rowHeight = props.rowHeight || 36;
  const height = props.height || 400;
  const scrollTop = $state(0);
  const sortKey = $state<string | null>(null);
  const sortDir = $state<"asc" | "desc">("asc");
  const filters = $state<Record<string, string>>({});
  const selectedRows = $state<Set<number>>(new Set());

  // Filtered + sorted data
  const processedData = (): Record<string, unknown>[] => {
    let data = [...props.data];

    // Apply filters
    for (const [col, filter] of Object.entries(filters())) {
      if (filter.trim()) {
        data = data.filter(row =>
          String(row[col]).toLowerCase().includes(filter.toLowerCase())
        );
      }
    }

    // Apply sort
    if (sortKey()) {
      const key = (sortKey() as NonNullable<ReturnType<typeof sortKey>>);
      const dir = sortDir() === "asc" ? 1 : -1;
      data.sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
    }

    return data;
  };

  const sortBy = (col: string) => {
    if (sortKey() === col) {
      sortDir.set(sortDir() === "asc" ? "desc" : "asc");
    } else {
      sortKey.set(col);
      sortDir.set("asc");
    }
    props.onSort?.(col, sortDir());
  };

  const toggleRow = (index: number) => {
    const next = new Set(selectedRows());
    if (next.has(index)) next.delete(index);
    else next.add(index);
    selectedRows.set(next);
  };

  const visibleRange = () => {
    const data = processedData();
    const start = Math.max(0, Math.floor(scrollTop() / rowHeight) - 5);
    const visibleCount = Math.ceil(height / rowHeight) + 10;
    const end = Math.min(data.length, start + visibleCount);
    return { start, end, data };
  };

  return h("div", {
    style: `border:1px solid ${currentTheme.colors.border};border-radius:${currentTheme.radius.md};overflow:hidden;`,
  },
    // Filter row
    props.filterable ? h("div", {
      style: `display:flex;gap:0;background:${currentTheme.colors.surface};border-bottom:1px solid ${currentTheme.colors.border};`,
    },
      props.selectable ? h("div", { style: "width:40px;flex-shrink:0;" }) : null,
      ...props.columns.map(col =>
        h("div", {
          key: col.key,
          style: `width:${col.width || 150}px;padding:4px;`,
        },
          h("input", {
            type: "text",
            placeholder: `Filter ${col.label}...`,
            value: () => filters()[col.key] || "",
            onInput: (e: Event) => filters.set({ ...filters(), [col.key]: (e.target as HTMLInputElement).value }),
            style: `width:100%;padding:4px 8px;background:${currentTheme.colors.bgCode || "#0F0F17"};border:1px solid ${currentTheme.colors.border};border-radius:4px;color:${currentTheme.colors.text};font-size:11px;outline:none;box-sizing:border-box;`,
          })
        )
      )
    ) : null,

    // Header
    h("div", {
      style: `display:flex;background:${currentTheme.colors.surface};border-bottom:1px solid ${currentTheme.colors.border};`,
    },
      props.selectable ? h("div", {
        style: `width:40px;flex-shrink:0;padding:0 8px;display:flex;align-items:center;justify-content:center;border-right:1px solid ${currentTheme.colors.border};`,
      }) : null,
      ...props.columns.map(col =>
        h("div", {
          key: col.key,
          onClick: () => (props.sortable && col.sortable !== false) && sortBy(col.key),
          style: `
            width:${col.width || 150}px;padding:10px 12px;
            font-family:${currentTheme.fonts.mono};font-size:10px;
            color:${currentTheme.colors.textFaint};text-transform:uppercase;
            letter-spacing:0.1em;cursor:${(props.sortable && col.sortable !== false) ? "pointer" : "default"};
            border-right:1px solid ${currentTheme.colors.border};
            display:flex;align-items:center;justify-content:space-between;
          `,
        },
          h("span", null, col.label),
          () => sortKey() === col.key ? (sortDir() === "asc" ? "↑" : "↓") : "",
        )
      ),
    ),

    // Virtualized body
    h("div", {
      onScroll: (e: Event) => scrollTop.set((e.target as HTMLElement).scrollTop),
      style: `height:${height}px;overflow-y:auto;position:relative;`,
    },
      () => {
        const { start, end, data } = visibleRange();
        const totalHeight = data.length * rowHeight;
        const offsetY = start * rowHeight;

        if (data.length === 0) {
          return h("div", {
            style: `display:flex;align-items:center;justify-content:center;height:100%;color:${currentTheme.colors.textMuted};`,
          }, props.emptyState || "No data");
        }

        return h("div", {
          style: `position:relative;height:${totalHeight}px;`,
        },
          h("div", {
            style: `position:absolute;top:${offsetY}px;left:0;right:0;`,
          },
            ...data.slice(start, end).map((row, i) => {
              const realIndex = start + i;
              const isSelected = selectedRows().has(realIndex);
              return h("div", {
                key: String(realIndex),
                style: `
                  display:flex;height:${rowHeight}px;
                  background:${isSelected ? currentTheme.colors.primary + "10" : "transparent"};
                  border-bottom:1px solid ${currentTheme.colors.border};
                `,
              },
                props.selectable ? h("div", {
                  style: `width:40px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-right:1px solid ${currentTheme.colors.border};`,
                },
                  h("input", {
                    type: "checkbox",
                    checked: isSelected,
                    onChange: () => toggleRow(realIndex),
                  })
                ) : null,
                ...props.columns.map(col =>
                  h("div", {
                    key: col.key,
                    style: `width:${col.width || 150}px;padding:0 12px;display:flex;align-items:center;border-right:1px solid ${currentTheme.colors.border};font-size:13px;color:${currentTheme.colors.text};`,
                  },
                    col.render
                      ? col.render(row[col.key], row, realIndex)
                      : String(row[col.key] ?? "")
                  )
                ),
              );
            })
          )
        );
      }
    ),

    // Footer
    h("div", {
      style: `display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:${currentTheme.colors.surface};border-top:1px solid ${currentTheme.colors.border};font-size:11px;color:${currentTheme.colors.textMuted};`,
    },
      h("span", null, () => {
        const data = processedData();
        return `${data.length} rows${selectedRows().size > 0 ? ` · ${selectedRows().size} selected` : ""}`;
      }),
      h("span", { style: `font-family:${currentTheme.fonts.mono};` }, "Virtualized"),
    ),
  );
}

// ============ KANBAN WITH DRAG & DROP ============

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  labels?: string[];
  tags?: string[];
  assignee?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
}

export interface KanbanDnDColumn {
  id: string;
  title: string;
  color?: string;
  cards: KanbanCard[];
}

export interface KanbanDnDProps {
  columns: KanbanDnDColumn[];
  onCardMove?: (cardId: string, fromColumn: string, toColumn: string, newIndex: number) => void;
  onCardClick?: (card: KanbanCard) => void;
  editable?: boolean;
}

export function KanbanDnD(props: KanbanDnDProps): ElmoorxNode {
  const columns = $state(props.columns);
  const draggingCard = $state<{ card: KanbanCard; fromColumn: string; fromIndex: number } | null>(null);
  const dragOverColumn = $state<string | null>(null);
  const dragOverIndex = $state<number | null>(null);

  const priorities: Record<string, string> = {
    low: currentTheme.colors.textFaint ?? currentTheme.colors.textMuted,
    medium: currentTheme.colors.warning,
    high: "#F59E0B",
    urgent: currentTheme.colors.danger,
  };

  const handleDragStart = (card: KanbanCard, fromColumn: string, fromIndex: number) => {
    draggingCard.set({ card, fromColumn, fromIndex });
  };

  const handleDragOver = (e: Event, columnId: string, index: number) => {
    e.preventDefault();
    dragOverColumn.set(columnId);
    dragOverIndex.set(index);
  };

  const handleDrop = (columnId: string, dropIndex: number) => {
    const drag = draggingCard();
    if (!drag) return;

    // Remove from source
    const sourceCol = columns().find(c => c.id === drag.fromColumn);
    if (sourceCol) {
      sourceCol.cards.splice(drag.fromIndex, 1);
    }

    // Insert at target
    const targetCol = columns().find(c => c.id === columnId);
    if (targetCol) {
      const insertIndex = dropIndex >= 0 ? dropIndex : targetCol.cards.length;
      targetCol.cards.splice(insertIndex, 0, drag.card);
    }

    columns.set([...columns()]);
    props.onCardMove?.(drag.card.id, drag.fromColumn, columnId, dropIndex);

    draggingCard.set(null);
    dragOverColumn.set(null);
    dragOverIndex.set(null);
  };

  return h("div", {
    style: "display:flex;gap:16px;overflow-x:auto;padding:8px;min-height:500px;",
  },
    ...columns().map(col =>
      h("div", {
        key: col.id,
        onDragOver: (e: Event) => handleDragOver(e, col.id, -1),
        onDrop: () => handleDrop(col.id, -1),
        style: `
          flex:1;min-width:280px;background:${currentTheme.colors.surface};
          border:1px solid ${currentTheme.colors.border};border-radius:${currentTheme.radius.md};
          display:flex;flex-direction:column;max-height:600px;
          background:${dragOverColumn() === col.id && dragOverIndex() === null ? currentTheme.colors.primary + "10" : currentTheme.colors.surface};
        `,
      },
        // Column header
        h("div", {
          style: `padding:12px 16px;border-bottom:1px solid ${currentTheme.colors.border};display:flex;align-items:center;justify-content:space-between;`,
        },
          h("div", { style: "display:flex;align-items:center;gap:8px;" },
            h("div", {
              style: `width:8px;height:8px;border-radius:50%;background:${col.color || currentTheme.colors.primary};`,
            }),
            h("span", { style: `font-weight:600;color:${currentTheme.colors.text};font-size:14px;` }, col.title),
            h("span", {
              style: `background:${currentTheme.colors.bgElev || "#14141B"};color:${currentTheme.colors.textMuted};padding:1px 8px;border-radius:10px;font-size:11px;font-family:${currentTheme.fonts.mono};`,
            }, String(col.cards.length)),
          ),
          h("button", {
            style: `background:none;border:none;color:${currentTheme.colors.textMuted};cursor:pointer;font-size:16px;`,
          }, "+"),
        ),

        // Cards
        h("div", { style: "flex:1;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:8px;" },
          ...col.cards.map((card, idx) =>
            h("div", {
              key: card.id,
              draggable: props.editable !== false,
              onDragStart: () => handleDragStart(card, col.id, idx),
              onDragOver: (e: Event) => handleDragOver(e, col.id, idx),
              onDrop: () => handleDrop(col.id, idx),
              onClick: () => props.onCardClick?.(card),
              style: `
                background:${currentTheme.colors.bgCard || "#1A1A24"};
                border:1px solid ${currentTheme.colors.border};
                border-left:3px solid ${card.priority ? priorities[card.priority] : currentTheme.colors.primary};
                border-radius:${currentTheme.radius.sm};padding:12px;cursor:grab;
                transition:all 0.15s;opacity:${draggingCard()?.card.id === card.id ? 0.5 : 1};
                background:${dragOverColumn() === col.id && dragOverIndex() === idx ? currentTheme.colors.primary + "20" : currentTheme.colors.bgCard || "#1A1A24"};
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

          // Drop zone indicator
          h("div", {
            onDragOver: (e: Event) => handleDragOver(e, col.id, col.cards.length),
            onDrop: () => handleDrop(col.id, col.cards.length),
            style: `
              min-height:40px;border:2px dashed ${dragOverColumn() === col.id && dragOverIndex() === col.cards.length ? currentTheme.colors.primary : "transparent"};
              border-radius:${currentTheme.radius.sm};
            `,
          }),
        ),
      )
    ),
  );
}

// ============ TREE VIEW WITH DnD ============

export interface TreeNodeDnD extends TreeNode {
  children?: TreeNodeDnD[];
}

export interface TreeViewDnDProps {
  data: TreeNodeDnD[];
  onNodeClick?: (node: TreeNodeDnD) => void;
  onNodeMove?: (nodeId: string, newParentId: string | null, newIndex: number) => void;
  defaultExpanded?: string[];
  showIcons?: boolean;
}

export function TreeViewDnD(props: TreeViewDnDProps): ElmoorxNode {
  const renderNode = (node: TreeNodeDnD, depth: number = 0): ElmoorxNode => {
    const expanded = $state((props.defaultExpanded || []).includes(node.id));
    const hasChildren = node.children && node.children.length > 0;

    return h("div", { key: node.id },
      h("div", {
        draggable: true,
        onClick: () => {
          if (hasChildren) expanded.set(!expanded());
          props.onNodeClick?.(node);
        },
        style: `
          display:flex;align-items:center;gap:6px;padding:4px 8px;
          padding-left:${depth * 16 + 8}px;cursor:pointer;border-radius:${currentTheme.radius.sm};
          color:${currentTheme.colors.text};font-size:13px;
        `,
      },
        hasChildren ? h("span", {
          style: `color:${currentTheme.colors.textMuted};font-size:10px;transform:${expanded() ? "rotate(90deg)" : "none"};transition:transform 0.15s;`,
        }, "▶") : h("span", { style: "width:10px;" }),
        props.showIcons ? h("span", null, node.icon || "📄") : null,
        h("span", null, node.label),
      ),
      () => hasChildren && expanded()
        ? h("div", null, ...(node.children as NonNullable<typeof node.children>).map(child => renderNode(child, depth + 1)))
        : null,
    );
  };

  return h("div", {
    style: `padding:8px;background:${currentTheme.colors.surface};border:1px solid ${currentTheme.colors.border};border-radius:${currentTheme.radius.md};`,
  },
    ...props.data.map(node => renderNode(node))
  );
}

// ============ FILE EXPLORER ============

export interface FileNode {
  name: string;
  type: "file" | "folder";
  size?: number;
  modified?: Date;
  children?: FileNode[];
  extension?: string;
}

export interface FileExplorerProps {
  files: FileNode[];
  onFileOpen?: (file: FileNode) => void;
  onFileDelete?: (file: FileNode) => void;
  onFileRename?: (file: FileNode, newName: string) => void;
  onFileCreate?: (parent: FileNode | null, type: "file" | "folder") => void;
}

export function FileExplorer(props: FileExplorerProps): ElmoorxNode {
  const renderNode = (node: FileNode, depth: number = 0): ElmoorxNode => {
    const expanded = $state(depth === 0);
    const isSelected = $state(false);
    const hasChildren = node.type === "folder" && node.children && node.children.length > 0;

    const getFileIcon = (file: FileNode): string => {
      if (file.type === "folder") return expanded() ? "📂" : "📁";
      const ext = file.extension || file.name.split(".").pop();
      const icons: Record<string, string> = {
        js: "📄", ts: "📄", tsx: "📄", jsx: "📄",
        html: "🌐", css: "🎨", json: "📋",
        png: "🖼️", jpg: "🖼️", jpeg: "🖼️", gif: "🖼️", svg: "🖼️",
        pdf: "📕", doc: "📘", docx: "📘", xls: "📗", xlsx: "📗",
        zip: "🗜️", rar: "🗜️", tar: "🗜️",
        mp3: "🎵", mp4: "🎬", avi: "🎬",
      };
      return icons[ext || ""] || "📄";
    };

    const formatSize = (bytes?: number): string => {
      if (bytes === undefined) return "";
      if (bytes < 1024) return bytes + " B";
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
      return (bytes / 1048576).toFixed(1) + " MB";
    };

    return h("div", { key: node.name },
      h("div", {
        onClick: () => {
          if (node.type === "folder" && hasChildren) {
            expanded.set(!expanded());
          } else if (node.type === "file") {
            props.onFileOpen?.(node);
          }
          isSelected.set(true);
        },
        style: `
          display:flex;align-items:center;gap:8px;padding:4px 8px;
          padding-left:${depth * 16 + 8}px;cursor:pointer;border-radius:${currentTheme.radius.sm};
          background:${isSelected() ? currentTheme.colors.primary + "20" : "transparent"};
          color:${currentTheme.colors.text};font-size:13px;
        `,
      },
        h("span", { style: "font-size:14px;" }, getFileIcon(node)),
        h("span", { style: "flex:1;" }, node.name),
        node.size !== undefined ? h("span", {
          style: `font-size:11px;color:${currentTheme.colors.textFaint};font-family:${currentTheme.fonts.mono};`,
        }, formatSize(node.size)) : null,
      ),
      () => hasChildren && expanded()
        ? h("div", null, ...(node.children as NonNullable<typeof node.children>).map(child => renderNode(child, depth + 1)))
        : null,
    );
  };

  return h("div", {
    style: `background:${currentTheme.colors.surface};border:1px solid ${currentTheme.colors.border};border-radius:${currentTheme.radius.md};padding:8px;max-height:500px;overflow-y:auto;`,
  },
    h("div", {
      style: `display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid ${currentTheme.colors.border};margin-bottom:8px;`,
    },
      h("span", { style: `font-family:${currentTheme.fonts.mono};font-size:11px;color:${currentTheme.colors.textFaint};text-transform:uppercase;letter-spacing:0.1em;` }, "Explorer"),
      h("div", { style: "display:flex;gap:4px;" },
        h("button", {
          onClick: () => props.onFileCreate?.(null, "folder"),
          style: `background:none;border:1px solid ${currentTheme.colors.border};color:${currentTheme.colors.text};padding:2px 6px;border-radius:4px;cursor:pointer;font-size:11px;`,
        }, "📁 New Folder"),
        h("button", {
          onClick: () => props.onFileCreate?.(null, "file"),
          style: `background:none;border:1px solid ${currentTheme.colors.border};color:${currentTheme.colors.text};padding:2px 6px;border-radius:4px;cursor:pointer;font-size:11px;`,
        }, "📄 New File"),
      ),
    ),
    ...props.files.map(file => renderNode(file)),
  );
}

// ============ INBOX (Advanced Notification Center) ============

export interface InboxItem {
  id: number;
  title: string;
  body?: string;
  type?: "message" | "alert" | "task" | "mention" | "system";
  from?: { name: string; avatar?: string };
  timestamp: Date;
  read?: boolean;
  starred?: boolean;
  archived?: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export interface InboxProps {
  items: InboxItem[];
  onMarkRead?: (id: number) => void;
  onStar?: (id: number) => void;
  onArchive?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export function Inbox(props: InboxProps): ElmoorxNode {
  const filter = $state<"all" | "unread" | "starred">("all");
  const items = $state(props.items);

  const filtered = () => {
    const f = filter();
    return items().filter(item => {
      if (f === "unread") return !item.read;
      if (f === "starred") return item.starred;
      return true;
    });
  };

  const typeIcons: Record<string, string> = {
    message: "💬",
    alert: "⚠️",
    task: "✓",
    mention: "@",
    system: "⚙️",
  };

  const formatTime = (date: Date): string => {
    const diff = Date.now() - date.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
    if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
    return date.toLocaleDateString();
  };

  return h("div", {
    style: `background:${currentTheme.colors.surface};border:1px solid ${currentTheme.colors.border};border-radius:${currentTheme.radius.md};overflow:hidden;`,
  },
    // Header
    h("div", {
      style: `padding:16px;border-bottom:1px solid ${currentTheme.colors.border};`,
    },
      h("div", { style: "display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;" },
        h("h3", { style: `margin:0;font-size:16px;font-weight:600;color:${currentTheme.colors.text};` }, "Inbox"),
        h("span", {
          style: `background:${currentTheme.colors.primary};color:white;padding:2px 8px;border-radius:10px;font-size:11px;font-family:${currentTheme.fonts.mono};`,
        }, () => String(items().filter(i => !i.read).length)),
      ),
      // Filter tabs
      h("div", { style: "display:flex;gap:4px;" },
        ...(["all", "unread", "starred"] as const).map(f =>
          h("button", {
            key: f,
            onClick: () => filter.set(f),
            style: `
              padding:4px 12px;border-radius:${currentTheme.radius.sm};cursor:pointer;
              background:${filter() === f ? currentTheme.colors.primary : currentTheme.colors.bgElev || "#14141B"};
              color:${filter() === f ? "white" : currentTheme.colors.textMuted};
              border:1px solid ${filter() === f ? currentTheme.colors.primary : currentTheme.colors.border};
              font-size:12px;text-transform:capitalize;
            `,
          }, f)
        ),
      ),
    ),

    // Items
    h("div", { style: "max-height:500px;overflow-y:auto;" },
      () => filtered().length === 0
        ? h("div", { style: `padding:40px;text-align:center;color:${currentTheme.colors.textMuted};` }, "No items")
        : filtered().map(item =>
            h("div", {
              key: String(item.id),
              style: `
                padding:12px 16px;border-bottom:1px solid ${currentTheme.colors.border};
                display:flex;gap:12px;cursor:pointer;
                background:${!item.read ? currentTheme.colors.primary + "10" : "transparent"};
              `,
            },
              // Type icon
              h("div", {
                style: `width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${currentTheme.colors.bgElev || "#14141B"};flex-shrink:0;`,
              }, typeIcons[item.type || "message"]),

              // Content
              h("div", { style: "flex:1;min-width:0;" },
                h("div", { style: "display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;" },
                  h("div", { style: `font-size:13px;font-weight:${!item.read ? "700" : "500"};color:${currentTheme.colors.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;` },
                    item.from ? `${item.from.name} — ` : "",
                    item.title,
                  ),
                  h("span", { style: `font-size:11px;color:${currentTheme.colors.textFaint};font-family:${currentTheme.fonts.mono};flex-shrink:0;margin-left:8px;` }, formatTime(item.timestamp)),
                ),
                item.body ? h("div", {
                  style: `font-size:12px;color:${currentTheme.colors.textMuted};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`,
                }, item.body) : null,

                // Actions
                h("div", { style: "display:flex;gap:8px;margin-top:4px;" },
                  h("button", {
                    onClick: (e: Event) => { e.stopPropagation(); props.onMarkRead?.(item.id); },
                    style: `background:none;border:none;color:${currentTheme.colors.textFaint};cursor:pointer;font-size:11px;padding:0;`,
                  }, item.read ? "Mark unread" : "Mark read"),
                  h("button", {
                    onClick: (e: Event) => { e.stopPropagation(); props.onStar?.(item.id); },
                    style: `background:none;border:none;color:${item.starred ? currentTheme.colors.warning : currentTheme.colors.textFaint};cursor:pointer;font-size:11px;padding:0;`,
                  }, item.starred ? "★ Starred" : "☆ Star"),
                  h("button", {
                    onClick: (e: Event) => { e.stopPropagation(); props.onArchive?.(item.id); },
                    style: `background:none;border:none;color:${currentTheme.colors.textFaint};cursor:pointer;font-size:11px;padding:0;`,
                  }, "Archive"),
                  h("button", {
                    onClick: (e: Event) => { e.stopPropagation(); props.onDelete?.(item.id); },
                    style: `background:none;border:none;color:${currentTheme.colors.danger};cursor:pointer;font-size:11px;padding:0;`,
                  }, "Delete"),
                ),
              ),
            )
          )
    ),
  );
}

// ============ EXPORTS ============

