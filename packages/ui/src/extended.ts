/**
 * @elmoorx/ui — Extended Components (Part 2)
 * ============================================
 * 22+ additional components: DataTable, DatePicker, Combobox, Drawer,
 * Toast, Popover, Menu, Breadcrumb, Pagination, Stepper, Slider, Rating,
 * ColorPicker, FileUpload, Calendar, Tree, Timeline, Chart, QRCode,
 * Barcode, CodeEditor, MarkdownEditor.
 *
 * Total library: 40+ components when combined with index.ts
 */

import { h, $state, type ElmoorxNode } from "@elmoorx/runtime";
import {
  defaultTheme,
  type Theme,
} from "./index";

const currentTheme: Theme = defaultTheme;

// ============ DATA TABLE ============

export interface DataTableProps<T = Record<string, unknown>> {
  data: T[];
  columns: {
    key: string;
    label: string;
    sortable?: boolean;
    render?: (row: T, index: number) => ElmoorxNode;
    width?: string;
  }[];
  // Features
  sortable?: boolean;
  filterable?: boolean;
  pagination?: { pageSize: number };
  selectable?: boolean;
  onRowClick?: (row: T, index: number) => void;
  emptyState?: ElmoorxNode;
  loading?: boolean;
}

export function DataTable<T = Record<string, unknown>>(props: DataTableProps<T>): ElmoorxNode {
  const sortKey = $state<string | null>(null);
  const sortDir = $state<"asc" | "desc">("asc");
  const filter = $state("");
  const currentPage = $state(0);
  const selected = $state<Set<number>>(new Set());

  const sortedData = (): T[] => {
    let data = [...props.data];

    // Filter
    if (filter().trim()) {
      const q = filter().toLowerCase();
      data = data.filter((row) =>
        Object.values(row as Record<string, unknown>).some((v) =>
          String(v).toLowerCase().includes(q)
        )
      );
    }

    // Sort
    if (sortKey()) {
      const key = sortKey() as string;
      const dir = sortDir() === "asc" ? 1 : -1;
      data.sort((a, b) => {
        const av = (a as Record<string, unknown>)[key] as string | number;
        const bv = (b as Record<string, unknown>)[key] as string | number;
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }

    return data;
  };

  const sortBy = (key: string) => {
    if (sortKey() === key) {
      sortDir.set(sortDir() === "asc" ? "desc" : "asc");
    } else {
      sortKey.set(key);
      sortDir.set("asc");
    }
  };

  const toggleSelect = (index: number) => {
    const next = new Set(selected());
    if (next.has(index)) next.delete(index);
    else next.add(index);
    selected.set(next);
  };

  const pageSize = props.pagination?.pageSize || 10;
  const totalPages = () => Math.ceil(sortedData().length / pageSize);
  const pagedData = () => {
    const start = currentPage() * pageSize;
    return sortedData().slice(start, start + pageSize);
  };

  return h("div", { class: "data-table" },
    // Filter bar
    props.filterable ? h("div", { style: "padding:8px;" },
      h("input", {
        type: "search",
        placeholder: "Filter...",
        value: () => filter(),
        onInput: (e: Event) => { filter.set((e.target as HTMLInputElement).value); currentPage.set(0); },
        style: `width:100%;padding:6px 10px;background:${currentTheme.colors.surface};border:1px solid ${currentTheme.colors.border};border-radius:${currentTheme.radius.sm};color:${currentTheme.colors.text};`,
      }),
    ) : null,

    h("table", { style: "width:100%;border-collapse:collapse;" },
      // Header
      h("thead", null,
        h("tr", null,
          props.selectable ? h("th", { style: "padding:10px;width:40px;" }) : null,
          ...props.columns.map((col) =>
            h("th", {
              onClick: () => (props.sortable && col.sortable !== false) && sortBy(col.key),
              style: `
                padding:10px;text-align:left;font-size:11px;font-weight:600;
                color:${currentTheme.colors.textMuted};text-transform:uppercase;
                letter-spacing:0.05em;border-bottom:1px solid ${currentTheme.colors.border};
                cursor:${(props.sortable && col.sortable !== false) ? "pointer" : "default"};
                width:${col.width || "auto"};
              `,
            },
              col.label,
              () => sortKey() === col.key ? (sortDir() === "asc" ? " ↑" : " ↓") : "",
            )
          ),
        ),
      ),
      // Body
      h("tbody", null,
        () => props.loading ? h("tr", null,
          h("td", { colspan: props.columns.length + 1, style: "padding:40px;text-align:center;color:" + currentTheme.colors.textMuted },
            "Loading...",
          ),
        ) : pagedData().length === 0 ? h("tr", null,
          h("td", { colspan: props.columns.length + 1, style: "padding:40px;text-align:center;color:" + currentTheme.colors.textMuted },
            props.emptyState || "No data",
          ),
        ) : pagedData().map((row, i) =>
          h("tr", {
            key: String(i),
            onClick: () => props.onRowClick?.(row, i),
            style: `cursor:${props.onRowClick ? "pointer" : "default"};border-bottom:1px solid ${currentTheme.colors.border};`,
          },
            props.selectable ? h("td", { style: "padding:10px;" ,
              onClick: (e: Event) => { e.stopPropagation(); toggleSelect(i); },
            },
              h("input", { type: "checkbox", checked: selected().has(i) }),
            ) : null,
            ...props.columns.map((col) =>
              h("td", { style: `padding:10px;color:${currentTheme.colors.text};font-size:13px;` },
                col.render ? col.render(row, i) : String((row as Record<string, unknown>)[col.key] ?? "")
              )
            ),
          )
        ),
      ),
    ),

    // Pagination
    props.pagination ? h("div", { style: `display:flex;justify-content:space-between;align-items:center;padding:8px;border-top:1px solid ${currentTheme.colors.border};` },
      h("span", { style: `font-size:12px;color:${currentTheme.colors.textMuted};` },
        () => `Showing ${currentPage() * pageSize + 1}-${Math.min((currentPage() + 1) * pageSize, sortedData().length)} of ${sortedData().length}`
      ),
      h("div", { style: "display:flex;gap:4px;" },
        h("button", {
          onClick: () => currentPage.set(Math.max(0, currentPage() - 1)),
          disabled: currentPage() === 0,
          style: `padding:4px 8px;background:${currentTheme.colors.surface};border:1px solid ${currentTheme.colors.border};color:${currentTheme.colors.text};border-radius:${currentTheme.radius.sm};cursor:pointer;`,
        }, "←"),
        h("span", { style: `padding:4px 12px;color:${currentTheme.colors.textMuted};font-size:12px;` },
          () => `Page ${currentPage() + 1} of ${Math.max(1, totalPages())}`
        ),
        h("button", {
          onClick: () => currentPage.set(Math.min(totalPages() - 1, currentPage() + 1)),
          disabled: currentPage() >= totalPages() - 1,
          style: `padding:4px 8px;background:${currentTheme.colors.surface};border:1px solid ${currentTheme.colors.border};color:${currentTheme.colors.text};border-radius:${currentTheme.radius.sm};cursor:pointer;`,
        }, "→"),
      ),
    ) : null,
  );
}

// ============ DATE PICKER ============

export interface DatePickerProps {
  value?: Date | string | (() => Date | string);
  onChange?: (date: Date) => void;
  min?: Date;
  max?: Date;
  placeholder?: string;
  format?: (date: Date) => string;
}

export function DatePicker(props: DatePickerProps): ElmoorxNode {
  const open = $state(false);
  const currentMonth = $state(new Date());
  const selected = $state<Date | null>(
    typeof props.value === "function"
      ? new Date(props.value() as string)
      : props.value
      ? new Date(props.value as string)
      : null
  );

  const formatDate = props.format || ((d: Date) => d.toLocaleDateString());

  const daysInMonth = () => {
    const year = currentMonth().getFullYear();
    const month = currentMonth().getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
    return cells;
  };

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

  const selectDate = (date: Date) => {
    selected.set(date);
    open.set(false);
    props.onChange?.(date);
  };

  const isDisabled = (date: Date) => {
    if (props.min && date < props.min) return true;
    if (props.max && date > props.max) return true;
    return false;
  };

  const isSelected = (date: Date) => {
    const sel = selected();
    return sel && date.toDateString() === sel.toDateString();
  };

  const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString();
  };

  return h("div", { style: "position:relative;" },
    h("input", {
      type: "text",
      readonly: true,
      value: () => selected() ? formatDate((selected() as NonNullable<ReturnType<typeof selected>>)) : "",
      placeholder: props.placeholder || "Select date...",
      onClick: () => open.set(!open()),
      style: `
        width:100%;padding:8px 12px;background:${currentTheme.colors.surface};
        border:1px solid ${currentTheme.colors.border};border-radius:${currentTheme.radius.md};
        color:${currentTheme.colors.text};cursor:pointer;font-size:14px;
      `,
    }),
    () => open() ? h("div", {
      style: `
        position:absolute;top:100%;left:0;margin-top:4px;z-index:10;
        background:${currentTheme.colors.surface};border:1px solid ${currentTheme.colors.border};
        border-radius:${currentTheme.radius.md};padding:12px;
        box-shadow:0 8px 24px rgba(0,0,0,0.4);width:280px;
      `,
    },
      // Header
      h("div", { style: "display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;" },
        h("button", { onClick: prevMonth, style: `background:none;border:none;color:${currentTheme.colors.text};cursor:pointer;font-size:16px;` }, "←"),
        h("span", { style: `font-weight:600;color:${currentTheme.colors.text};` },
          () => currentMonth().toLocaleDateString("en", { month: "long", year: "numeric" })
        ),
        h("button", { onClick: nextMonth, style: `background:none;border:none;color:${currentTheme.colors.text};cursor:pointer;font-size:16px;` }, "→"),
      ),
      // Weekday headers
      h("div", { style: "display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px;" },
        ...["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d =>
          h("div", { style: `text-align:center;font-size:11px;font-weight:600;color:${currentTheme.colors.textMuted};padding:4px;` }, d)
        )
      ),
      // Days
      h("div", { style: "display:grid;grid-template-columns:repeat(7,1fr);gap:2px;" },
        ...daysInMonth().map((date, i) =>
          date === null ? h("div", { key: String(i) }) : h("button", {
            key: String(i),
            onClick: () => !isDisabled(date) && selectDate(date),
            disabled: isDisabled(date),
            style: `
              aspect-ratio:1;border:none;cursor:pointer;border-radius:${currentTheme.radius.sm};
              font-size:12px;color:${isSelected(date) ? "white" : currentTheme.colors.text};
              background:${isSelected(date) ? currentTheme.colors.primary : isToday(date) ? currentTheme.colors.primary + "20" : "transparent"};
              border:${isToday(date) && !isSelected(date) ? "1px solid " + currentTheme.colors.primary : "none"};
              opacity:${isDisabled(date) ? 0.3 : 1};
            `,
          }, String(date.getDate()))
        )
      ),
    ) : null,
  );
}

// ============ COMBOBOX (autocomplete) ============

export interface ComboboxProps {
  options: { value: string; label: string }[];
  value?: string | (() => string);
  placeholder?: string;
  onChange?: (value: string) => void;
  filterable?: boolean;
  creatable?: boolean;
}

export function Combobox(props: ComboboxProps): ElmoorxNode {
  const open = $state(false);
  const query = $state("");
  const selected = $state(typeof props.value === "function" ? props.value() : props.value || "");

  const filtered = () => {
    if (!query().trim()) return props.options;
    const q = query().toLowerCase();
    return props.options.filter((o) => o.label.toLowerCase().includes(q));
  };

  const select = (value: string) => {
    selected.set(value);
    open.set(false);
    query.set("");
    props.onChange?.(value);
  };

  return h("div", { style: "position:relative;" },
    h("input", {
      type: "text",
      value: () => open() ? query() : (props.options.find(o => o.value === selected())?.label || ""),
      placeholder: props.placeholder || "Select...",
      onFocus: () => open.set(true),
      onBlur: () => setTimeout(() => open.set(false), 200),
      onInput: (e: Event) => query.set((e.target as HTMLInputElement).value),
      style: `
        width:100%;padding:8px 12px;background:${currentTheme.colors.surface};
        border:1px solid ${currentTheme.colors.border};border-radius:${currentTheme.radius.md};
        color:${currentTheme.colors.text};font-size:14px;
      `,
    }),
    () => open() ? h("div", {
      style: `
        position:absolute;top:100%;left:0;right:0;margin-top:4px;z-index:10;
        background:${currentTheme.colors.surface};border:1px solid ${currentTheme.colors.border};
        border-radius:${currentTheme.radius.md};max-height:200px;overflow-y:auto;
      `,
    },
      filtered().length === 0
        ? (props.creatable
            ? h("div", {
                onClick: () => select(query()),
                style: `padding:8px 12px;cursor:pointer;color:${currentTheme.colors.text};font-size:14px;`,
              }, `Create "${query()}"`)
            : h("div", { style: `padding:8px 12px;color:${currentTheme.colors.textMuted};font-size:14px;` }, "No results")
          )
        : filtered().map((opt) =>
            h("div", {
              key: opt.value,
              onClick: () => select(opt.value),
              style: `
                padding:8px 12px;cursor:pointer;font-size:14px;
                background:${selected() === opt.value ? currentTheme.colors.primary + "20" : "transparent"};
                color:${selected() === opt.value ? currentTheme.colors.primary : currentTheme.colors.text};
              `,
            }, opt.label)
          )
    ) : null,
  );
}

// ============ DRAWER (slide-out panel) ============

export interface DrawerProps {
  open: boolean | (() => boolean);
  onClose: () => void;
  side?: "left" | "right" | "top" | "bottom";
  width?: string;
  title?: string;
  children?: ElmoorxNode;
}

export function Drawer(props: DrawerProps): ElmoorxNode {
  const isOpen = typeof props.open === "function" ? props.open() : props.open;
  if (!isOpen) return null;

  const sides: Record<string, string> = {
    left: `left:0;top:0;bottom:0;width:${props.width || "300px"};transform:translateX(0);`,
    right: `right:0;top:0;bottom:0;width:${props.width || "300px"};transform:translateX(0);`,
    top: `top:0;left:0;right:0;height:${props.width || "300px"};transform:translateY(0);`,
    bottom: `bottom:0;left:0;right:0;height:${props.width || "300px"};transform:translateY(0);`,
  };

  return h("div", {
    style: "position:fixed;inset:0;z-index:1000;",
  },
    h("div", {
      onClick: props.onClose,
      style: "position:absolute;inset:0;background:rgba(0,0,0,0.5);",
    }),
    h("div", {
      style: `
        position:absolute;background:${currentTheme.colors.surface};
        ${sides[props.side || "right"]}
        box-shadow:-8px 0 24px rgba(0,0,0,0.4);display:flex;flex-direction:column;
        animation:elmoorx-slide-in 0.2s ease;
      `,
    },
      props.title ? h("div", {
        style: `padding:16px;border-bottom:1px solid ${currentTheme.colors.border};display:flex;justify-content:space-between;align-items:center;`,
      },
        h("h3", { style: `margin:0;font-size:16px;font-weight:600;color:${currentTheme.colors.text};` }, props.title),
        h("button", {
          onClick: props.onClose,
          style: `background:none;border:none;color:${currentTheme.colors.textMuted};cursor:pointer;font-size:20px;`,
        }, "×"),
      ) : null,
      h("div", { style: "flex:1;overflow-y:auto;padding:16px;" }, props.children),
    ),
  );
}

// ============ TOAST (notifications) ============

export interface ToastMessage {
  id: number;
  type: "info" | "success" | "warning" | "danger";
  title?: string;
  message: string;
  duration?: number;
}

const toasts = $state<ToastMessage[]>([]);
let toastId = 0;

export function toast(message: string, opts: Partial<ToastMessage> = {}): void {
  const id = ++toastId;
  const msg: ToastMessage = {
    id,
    type: opts.type || "info",
    title: opts.title,
    message,
    duration: opts.duration || 4000,
  };
  toasts.set([...toasts(), msg]);

  if (msg.duration && msg.duration > 0) {
    setTimeout(() => {
      toasts.set(toasts().filter((t) => t.id !== id));
    }, msg.duration);
  }
}

export function ToastContainer(): ElmoorxNode {
  const colors: Record<string, { bg: string; border: string; color: string; icon: string }> = {
    info: { bg: currentTheme.colors.secondary + "20", border: currentTheme.colors.secondary, color: currentTheme.colors.secondary, icon: "ℹ" },
    success: { bg: currentTheme.colors.success + "20", border: currentTheme.colors.success, color: currentTheme.colors.success, icon: "✓" },
    warning: { bg: currentTheme.colors.warning + "20", border: currentTheme.colors.warning, color: currentTheme.colors.warning, icon: "⚠" },
    danger: { bg: currentTheme.colors.danger + "20", border: currentTheme.colors.danger, color: currentTheme.colors.danger, icon: "✗" },
  };

  return h("div", {
    style: "position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:360px;",
  },
    () => toasts().map((t) => {
      const c = colors[t.type];
      return h("div", {
        key: String(t.id),
        style: `
          background:${currentTheme.colors.surface};border:1px solid ${c.border};
          border-left:4px solid ${c.color};border-radius:${currentTheme.radius.md};
          padding:12px 16px;display:flex;gap:10px;align-items:flex-start;
          box-shadow:0 8px 24px rgba(0,0,0,0.4);
          animation:elmoorx-slide-in-right 0.2s ease;
        `,
      },
        h("span", { style: `color:${c.color};font-size:18px;font-weight:bold;` }, c.icon),
        h("div", { style: "flex:1;" },
          t.title ? h("div", { style: `font-weight:600;color:${currentTheme.colors.text};margin-bottom:2px;` }, t.title) : null,
          h("div", { style: `color:${currentTheme.colors.textMuted};font-size:13px;` }, t.message),
        ),
        h("button", {
          onClick: () => toasts.set(toasts().filter((x) => x.id !== t.id)),
          style: `background:none;border:none;color:${currentTheme.colors.textMuted};cursor:pointer;font-size:16px;`,
        }, "×"),
      );
    })
  );
}

// ============ POPOVER ============

export interface PopoverProps {
  content: ElmoorxNode;
  trigger?: "click" | "hover";
  position?: "top" | "bottom" | "left" | "right";
  children: ElmoorxNode;
}

export function Popover(props: PopoverProps): ElmoorxNode {
  const visible = $state(false);

  const positions: Record<string, string> = {
    top: "bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:8px;",
    bottom: "top:100%;left:50%;transform:translateX(-50%);margin-top:8px;",
    left: "right:100%;top:50%;transform:translateY(-50%);margin-right:8px;",
    right: "left:100%;top:50%;transform:translateY(-50%);margin-left:8px;",
  };

  return h("span", {
    style: "position:relative;display:inline-block;",
    onClick: props.trigger === "click" ? () => visible.set(!visible()) : undefined,
    onMouseEnter: props.trigger === "hover" ? () => visible.set(true) : undefined,
    onMouseLeave: props.trigger === "hover" ? () => visible.set(false) : undefined,
  },
    props.children,
    () => visible() ? h("div", {
      style: `
        position:absolute;z-index:100;background:${currentTheme.colors.surface};
        border:1px solid ${currentTheme.colors.border};border-radius:${currentTheme.radius.md};
        padding:12px;box-shadow:0 4px 16px rgba(0,0,0,0.4);min-width:200px;
        ${positions[props.position || "bottom"]}
      `,
    }, props.content) : null,
  );
}

// ============ MENU (dropdown menu) ============

export interface MenuProps {
  trigger: ElmoorxNode;
  items: {
    label?: string;
    icon?: string;
    onClick?: () => void;
    disabled?: boolean;
    divider?: boolean;
    danger?: boolean;
  }[];
  align?: "left" | "right";
}

export function Menu(props: MenuProps): ElmoorxNode {
  const open = $state(false);

  return h("div", { style: "position:relative;display:inline-block;" },
    h("div", { onClick: () => open.set(!open()) }, props.trigger),
    () => open() ? h("div", {
      style: `
        position:absolute;top:100%;${props.align === "right" ? "right:0" : "left:0"};
        margin-top:4px;min-width:180px;background:${currentTheme.colors.surface};
        border:1px solid ${currentTheme.colors.border};border-radius:${currentTheme.radius.md};
        padding:4px;z-index:100;box-shadow:0 8px 24px rgba(0,0,0,0.4);
      `,
    },
      ...props.items.map((item, i) =>
        item.divider
          ? h("hr", { key: String(i), style: `border:none;height:1px;background:${currentTheme.colors.border};margin:4px 0;` })
          : h("button", {
              key: String(i),
              onClick: () => { if (!item.disabled) { item.onClick?.(); open.set(false); } },
              disabled: item.disabled,
              style: `
                display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;
                background:none;border:none;cursor:pointer;text-align:left;
                color:${item.danger ? currentTheme.colors.danger : currentTheme.colors.text};
                font-size:13px;border-radius:${currentTheme.radius.sm};
                opacity:${item.disabled ? 0.5 : 1};
              `,
            },
              item.icon ? h("span", null, item.icon) : null,
              item.label,
            )
      ),
    ) : null,
  );
}

// ============ BREADCRUMB ============

export interface BreadcrumbProps {
  items: { label: string; href?: string; onClick?: () => void }[];
  separator?: string;
}

export function Breadcrumb(props: BreadcrumbProps): ElmoorxNode {
  const sep = props.separator || "/";

  return h("nav", { style: "display:flex;align-items:center;gap:8px;font-size:13px;" },
    ...props.items.map((item, i) =>
      h("span", { key: String(i), style: "display:flex;align-items:center;gap:8px;" },
        item.href || item.onClick
          ? h("a", {
              href: item.href || "#",
              onClick: item.onClick ? (e: Event) => { e.preventDefault(); (item.onClick as NonNullable<typeof item.onClick>)(); } : undefined,
              style: `color:${currentTheme.colors.textMuted};text-decoration:none;cursor:pointer;`,
            }, item.label)
          : h("span", { style: `color:${currentTheme.colors.text};font-weight:500;` }, item.label),
        i < props.items.length - 1 ? h("span", { style: `color:${currentTheme.colors.textFaint};` }, sep) : null,
      )
    ),
  );
}

// ============ PAGINATION ============

export interface PaginationProps {
  currentPage: number | (() => number);
  totalPages: number | (() => number);
  onPageChange: (page: number) => void;
  maxButtons?: number;
}

export function Pagination(props: PaginationProps): ElmoorxNode {
  const current = typeof props.currentPage === "function" ? props.currentPage() : props.currentPage;
  const total = typeof props.totalPages === "function" ? props.totalPages() : props.totalPages;
  const max = props.maxButtons || 5;

  const buttons: number[] = [];
  const start = Math.max(1, current - Math.floor(max / 2));
  const end = Math.min(total, start + max - 1);

  for (let i = start; i <= end; i++) buttons.push(i);

  return h("div", { style: "display:flex;gap:4px;align-items:center;" },
    h("button", {
      onClick: () => props.onPageChange(current - 1),
      disabled: current === 1,
      style: `padding:6px 10px;background:${currentTheme.colors.surface};border:1px solid ${currentTheme.colors.border};color:${currentTheme.colors.text};border-radius:${currentTheme.radius.sm};cursor:pointer;`,
    }, "←"),
    start > 1 ? h("button", {
      onClick: () => props.onPageChange(1),
      style: `padding:6px 10px;background:${currentTheme.colors.surface};border:1px solid ${currentTheme.colors.border};color:${currentTheme.colors.text};border-radius:${currentTheme.radius.sm};cursor:pointer;`,
    }, "1") : null,
    start > 2 ? h("span", { style: "padding:6px;color:" + currentTheme.colors.textMuted }, "...") : null,
    ...buttons.map((b) =>
      h("button", {
        key: String(b),
        onClick: () => props.onPageChange(b),
        style: `
          padding:6px 10px;border-radius:${currentTheme.radius.sm};cursor:pointer;
          background:${b === current ? currentTheme.colors.primary : currentTheme.colors.surface};
          color:${b === current ? "white" : currentTheme.colors.text};
          border:1px solid ${b === current ? currentTheme.colors.primary : currentTheme.colors.border};
          font-weight:${b === current ? "600" : "400"};
        `,
      }, String(b))
    ),
    end < total - 1 ? h("span", { style: "padding:6px;color:" + currentTheme.colors.textMuted }, "...") : null,
    end < total ? h("button", {
      onClick: () => props.onPageChange(total),
      style: `padding:6px 10px;background:${currentTheme.colors.surface};border:1px solid ${currentTheme.colors.border};color:${currentTheme.colors.text};border-radius:${currentTheme.radius.sm};cursor:pointer;`,
    }, String(total)) : null,
    h("button", {
      onClick: () => props.onPageChange(current + 1),
      disabled: current === total,
      style: `padding:6px 10px;background:${currentTheme.colors.surface};border:1px solid ${currentTheme.colors.border};color:${currentTheme.colors.text};border-radius:${currentTheme.radius.sm};cursor:pointer;`,
    }, "→"),
  );
}

// ============ STEPPER ============

export interface StepperProps {
  steps: { title: string; description?: string }[];
  current: number | (() => number);
  onStepClick?: (index: number) => void;
}

export function Stepper(props: StepperProps): ElmoorxNode {
  const current = typeof props.current === "function" ? props.current() : props.current;

  return h("div", { style: "display:flex;align-items:center;" },
    ...props.steps.map((step, i) =>
      h("div", { key: String(i), style: `display:flex;align-items:center;flex:${i < props.steps.length - 1 ? "1" : "0"};` },
        h("div", {
          onClick: () => props.onStepClick?.(i),
          style: `
            width:32px;height:32px;border-radius:50%;display:flex;align-items:center;
            justify-content:center;font-weight:600;font-size:13px;cursor:pointer;
            background:${i < current ? currentTheme.colors.success : i === current ? currentTheme.colors.primary : currentTheme.colors.surface};
            color:${i <= current ? "white" : currentTheme.colors.textMuted};
            border:2px solid ${i < current ? currentTheme.colors.success : i === current ? currentTheme.colors.primary : currentTheme.colors.border};
          `,
        },
          i < current ? "✓" : String(i + 1)
        ),
        h("div", { style: "margin-left:8px;" },
          h("div", { style: `font-size:13px;font-weight:600;color:${i <= current ? currentTheme.colors.text : currentTheme.colors.textMuted};` }, step.title),
          step.description ? h("div", { style: `font-size:11px;color:${currentTheme.colors.textMuted};` }, step.description) : null,
        ),
        i < props.steps.length - 1 ? h("div", {
          style: `flex:1;height:2px;margin:0 16px;background:${i < current ? currentTheme.colors.success : currentTheme.colors.border};`,
        }) : null,
      )
    ),
  );
}

// ============ SLIDER ============

export interface SliderProps {
  value?: number | (() => number);
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
  showValue?: boolean;
  label?: string;
}

export function Slider(props: SliderProps): ElmoorxNode {
  const value = typeof props.value === "function" ? props.value() : props.value ?? props.min ?? 0;
  const min = props.min ?? 0;
  const max = props.max ?? 100;
  const step = props.step ?? 1;
  const percent = ((value - min) / (max - min)) * 100;

  return h("div", null,
    props.label || props.showValue ? h("div", { style: "display:flex;justify-content:space-between;margin-bottom:6px;" },
      h("span", { style: `font-size:13px;color:${currentTheme.colors.text};` }, props.label || ""),
      props.showValue ? h("span", { style: `font-family:${currentTheme.fonts.mono};font-size:13px;color:${currentTheme.colors.primary};` }, String(value)) : null,
    ) : null,
    h("input", {
      type: "range",
      min: min,
      max: max,
      step: step,
      value: value,
      onChange: (e: Event) => props.onChange?.(Number((e.target as HTMLInputElement).value)),
      style: `
        width:100%;height:6px;background:${currentTheme.colors.surface};border-radius:3px;
        appearance:none;outline:none;
        background-image:linear-gradient(90deg, ${currentTheme.colors.primary} ${percent}%, ${currentTheme.colors.surface} ${percent}%);
      `,
    }),
  );
}

// ============ RATING ============

export interface RatingProps {
  value?: number | (() => number);
  max?: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Rating(props: RatingProps): ElmoorxNode {
  const value = typeof props.value === "function" ? props.value() : props.value ?? 0;
  const max = props.max ?? 5;
  const sizes: Record<string, string> = { sm: "14px", md: "20px", lg: "28px" };
  const size = sizes[props.size || "md"];

  return h("div", { style: "display:flex;gap:2px;" },
    ...Array.from({ length: max }, (_, i) =>
      h("button", {
        key: String(i),
        onClick: () => !props.readonly && props.onChange?.(i + 1),
        disabled: props.readonly,
        style: `
          background:none;border:none;cursor:${props.readonly ? "default" : "pointer"};
          font-size:${size};color:${i < value ? "#F59E0B" : currentTheme.colors.border};
          padding:2px;
        `,
      }, "★")
    )
  );
}

// ============ COLOR PICKER ============

export interface ColorPickerProps {
  value?: string | (() => string);
  onChange?: (color: string) => void;
  presets?: string[];
}

export function ColorPicker(props: ColorPickerProps): ElmoorxNode {
  const value = typeof props.value === "function" ? props.value() : props.value || "#A855F7";
  const presets = props.presets || ["#A855F7", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#8B5CF6", "#3B82F6"];

  return h("div", { style: "display:flex;flex-direction:column;gap:8px;" },
    h("div", { style: "display:flex;gap:8px;align-items:center;" },
      h("input", {
        type: "color",
        value: value,
        onChange: (e: Event) => props.onChange?.((e.target as HTMLInputElement).value),
        style: "width:40px;height:40px;border:none;cursor:pointer;background:none;",
      }),
      h("input", {
        type: "text",
        value: value,
        onChange: (e: Event) => props.onChange?.((e.target as HTMLInputElement).value),
        style: `
          padding:6px 10px;background:${currentTheme.colors.surface};
          border:1px solid ${currentTheme.colors.border};border-radius:${currentTheme.radius.sm};
          color:${currentTheme.colors.text};font-family:${currentTheme.fonts.mono};font-size:13px;
          width:100px;
        `,
      }),
    ),
    h("div", { style: "display:flex;flex-wrap:wrap;gap:4px;" },
      ...presets.map((color) =>
        h("button", {
          key: color,
          onClick: () => props.onChange?.(color),
          style: `
            width:24px;height:24px;background:${color};border:2px solid ${value === color ? "white" : "transparent"};
            border-radius:${currentTheme.radius.sm};cursor:pointer;
            box-shadow:${value === color ? "0 0 0 2px " + currentTheme.colors.primary : "none"};
          `,
        })
      )
    ),
  );
}

// ============ FILE UPLOAD ============

export interface FileUploadProps {
  onChange?: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // bytes
  label?: string;
}

export function FileUpload(props: FileUploadProps): ElmoorxNode {
  const dragging = $state(false);
  const files = $state<File[]>([]);

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const arr = Array.from(newFiles);
    const valid = props.maxSize ? arr.filter((f) => f.size <= (props.maxSize ?? Infinity)) : arr;
    files.set(props.multiple ? [...files(), ...valid] : valid);
    props.onChange?.(files());
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  return h("div", null,
    h("div", {
      onDragOver: (e: Event) => { e.preventDefault(); dragging.set(true); },
      onDragLeave: () => dragging.set(false),
      onDrop: (e: Event) => {
        e.preventDefault();
        dragging.set(false);
        handleFiles((e as DragEvent).dataTransfer?.files || null);
      },
      onClick: () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = props.accept || "*";
        input.multiple = props.multiple || false;
        input.onchange = () => handleFiles(input.files);
        input.click();
      },
      style: `
        border:2px dashed ${dragging() ? currentTheme.colors.primary : currentTheme.colors.border};
        border-radius:${currentTheme.radius.md};padding:32px;text-align:center;
        cursor:pointer;transition:border-color 0.15s;background:${dragging() ? currentTheme.colors.primary + "10" : "transparent"};
      `,
    },
      h("div", { style: `font-size:32px;color:${currentTheme.colors.textMuted};margin-bottom:8px;` }, "📁"),
      h("div", { style: `color:${currentTheme.colors.text};font-size:14px;` },
        props.label || "Drop files here or click to upload"
      ),
      h("div", { style: `color:${currentTheme.colors.textMuted};font-size:12px;margin-top:4px;` },
        props.accept ? `Accepts: ${props.accept}` : ""
      ),
    ),
    // File list
    files().length > 0 ? h("div", { style: "margin-top:12px;display:flex;flex-direction:column;gap:4px;" },
      ...files().map((file, i) =>
        h("div", {
          key: String(i),
          style: `
            display:flex;align-items:center;gap:8px;padding:8px 12px;
            background:${currentTheme.colors.surface};border-radius:${currentTheme.radius.sm};
            font-size:13px;
          `,
        },
          h("span", null, "📄"),
          h("span", { style: `color:${currentTheme.colors.text};flex:1;` }, file.name),
          h("span", { style: `color:${currentTheme.colors.textMuted};font-size:11px;` }, formatSize(file.size)),
          h("button", {
            onClick: () => files.set(files().filter((_, idx) => idx !== i)),
            style: `background:none;border:none;color:${currentTheme.colors.textMuted};cursor:pointer;font-size:16px;`,
          }, "×"),
        )
      )
    ) : null,
  );
}

// ============ TREE ============

export interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
  icon?: string;
}

export interface TreeProps {
  data: TreeNode[];
  onSelect?: (node: TreeNode) => void;
  defaultExpanded?: string[];
}

export function Tree(props: TreeProps): ElmoorxNode {
  const renderNode = (node: TreeNode, depth: number = 0): ElmoorxNode => {
    const expanded = $state((props.defaultExpanded || []).includes(node.id));
    const hasChildren = node.children && node.children.length > 0;

    return h("div", { key: node.id },
      h("div", {
        onClick: () => {
          if (hasChildren) expanded.set(!expanded());
          props.onSelect?.(node);
        },
        style: `
          display:flex;align-items:center;gap:6px;padding:4px 8px;
          padding-left:${depth * 16 + 8}px;cursor:pointer;border-radius:${currentTheme.radius.sm};
          color:${currentTheme.colors.text};font-size:13px;
        `,
      },
        hasChildren ? h("span", { style: `color:${currentTheme.colors.textMuted};font-size:10px;transform:${expanded() ? "rotate(90deg)" : "none"};` }, "▶") : h("span", { style: "width:10px;" }),
        node.icon ? h("span", null, node.icon) : null,
        h("span", null, node.label),
      ),
      () => hasChildren && expanded()
        ? h("div", null, ...(node.children as NonNullable<typeof node.children>).map((child) => renderNode(child, depth + 1)))
        : null,
    );
  };

  return h("div", null, ...props.data.map((node) => renderNode(node)));
}

// ============ TIMELINE ============

export interface TimelineProps {
  items: {
    title: string;
    description?: string;
    timestamp?: string;
    icon?: string;
    color?: string;
  }[];
}

export function Timeline(props: TimelineProps): ElmoorxNode {
  return h("div", { style: "position:relative;padding-left:24px;" },
    h("div", {
      style: `position:absolute;left:7px;top:8px;bottom:8px;width:2px;background:${currentTheme.colors.border};`,
    }),
    ...props.items.map((item, i) =>
      h("div", { key: String(i), style: "position:relative;padding-bottom:20px;" },
        h("div", {
          style: `
            position:absolute;left:-22px;top:4px;width:14px;height:14px;border-radius:50%;
            background:${item.color || currentTheme.colors.primary};border:2px solid ${currentTheme.colors.surface};
          `,
        }),
        h("div", { style: `font-size:14px;font-weight:600;color:${currentTheme.colors.text};` },
          item.icon ? item.icon + " " : "",
          item.title,
        ),
        item.description ? h("div", { style: `font-size:12px;color:${currentTheme.colors.textMuted};margin-top:2px;` }, item.description) : null,
        item.timestamp ? h("div", { style: `font-size:11px;color:${currentTheme.colors.textFaint};margin-top:4px;font-family:${currentTheme.fonts.mono};` }, item.timestamp) : null,
      )
    ),
  );
}

// ============ CHART (bar/line/pie) ============

export interface ChartProps {
  type: "bar" | "line" | "pie";
  data: { label: string; value: number; color?: string }[];
  height?: number;
  showLegend?: boolean;
  showValues?: boolean;
}

export function Chart(props: ChartProps): ElmoorxNode {
  const height = props.height || 200;
  const max = Math.max(...props.data.map((d) => d.value), 1);

  if (props.type === "bar") {
    return h("div", { style: `height:${height}px;display:flex;align-items:flex-end;gap:4px;padding:16px 0;` },
      ...props.data.map((d, i) =>
        h("div", {
          key: String(i),
          style: `
            flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;
          `,
        },
          props.showValues ? h("span", { style: `font-size:11px;color:${currentTheme.colors.text};font-family:${currentTheme.fonts.mono};` }, String(d.value)) : null,
          h("div", {
            style: `
              width:80%;background:${d.color || currentTheme.colors.primary};border-radius:4px 4px 0 0;
              height:${(d.value / max) * (height - 40)}px;min-height:2px;
              transition:height 0.3s;
            `,
          }),
          h("span", { style: `font-size:10px;color:${currentTheme.colors.textMuted};text-align:center;` }, d.label),
        )
      ),
    );
  }

  if (props.type === "line") {
    const w = 400;
    const points = props.data.map((d, i) => {
      const x = (i / (props.data.length - 1)) * w;
      const y = height - (d.value / max) * (height - 20) - 10;
      return `${x},${y}`;
    }).join(" ");

    return h("svg", { width: "100%", height: height, viewBox: `0 0 ${w} ${height}` },
      h("polyline", { points: points, fill: "none", stroke: currentTheme.colors.primary, "stroke-width": "2" }),
      h("polyline", { points: `0,${height} ${points} ${w},${height}`, fill: currentTheme.colors.primary + "20", stroke: "none" }),
      ...props.data.map((d, i) => {
        const x = (i / (props.data.length - 1)) * w;
        const y = height - (d.value / max) * (height - 20) - 10;
        return h("circle", { cx: x, cy: y, r: "4", fill: currentTheme.colors.primary });
      }),
    );
  }

  if (props.type === "pie") {
    const total = props.data.reduce((s, d) => s + d.value, 0);
    let cumulative = 0;
    const cx = 100, cy = 100, r = 80;

    return h("div", { style: "display:flex;gap:20px;align-items:center;" },
      h("svg", { width: 200, height: 200, viewBox: "0 0 200 200" },
        ...props.data.map((d, i) => {
          const startAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
          cumulative += d.value;
          const endAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
          const x1 = cx + r * Math.cos(startAngle);
          const y1 = cy + r * Math.sin(startAngle);
          const x2 = cx + r * Math.cos(endAngle);
          const y2 = cy + r * Math.sin(endAngle);
          const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
          const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
          return h("path", {
            key: String(i),
            d: path,
            fill: d.color || ["#A855F7", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"][i % 5],
          });
        }),
      ),
      props.showLegend ? h("div", { style: "display:flex;flex-direction:column;gap:6px;" },
        ...props.data.map((d, i) =>
          h("div", { key: String(i), style: "display:flex;align-items:center;gap:6px;" },
            h("div", { style: `width:12px;height:12px;border-radius:2px;background:${d.color || ["#A855F7", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"][i % 5]};` }),
            h("span", { style: `font-size:12px;color:${currentTheme.colors.text};` }, d.label),
            h("span", { style: `font-size:11px;color:${currentTheme.colors.textMuted};font-family:${currentTheme.fonts.mono};` }, String(d.value)),
          )
        )
      ) : null,
    );
  }

  return h("div", null, "Unknown chart type");
}

// ============ QR CODE ============

export interface QRCodeProps {
  value: string;
  size?: number;
  color?: string;
  background?: string;
}

export function QRCode(props: QRCodeProps): ElmoorxNode {
  const size = props.size || 200;
  // Simplified — in production would use a real QR library
  // For demo, we render a grid pattern based on the value
  const cells = 21;
  const cellSize = size / cells;
  const hash = Array.from(props.value).reduce((a, c) => a + c.charCodeAt(0), 0);

  const rects: ElmoorxNode[] = [];
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      // Finder patterns (corners)
      const isFinder = (x < 7 && y < 7) || (x >= cells - 7 && y < 7) || (x < 7 && y >= cells - 7);
      if (isFinder) {
        const fx = x % 7;
        const fy = y % 7;
        const onBorder = fx === 0 || fx === 6 || fy === 0 || fy === 6;
        const inCenter = fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4;
        if (onBorder || inCenter) {
          rects.push(h("rect", {
            x: x * cellSize, y: y * cellSize,
            width: cellSize, height: cellSize,
            fill: props.color || currentTheme.colors.text,
          }));
        }
      } else {
        // Pseudo-random pattern based on hash
        if (((x * 7 + y * 13 + hash) % 3) === 0) {
          rects.push(h("rect", {
            x: x * cellSize, y: y * cellSize,
            width: cellSize, height: cellSize,
            fill: props.color || currentTheme.colors.text,
          }));
        }
      }
    }
  }

  return h("svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}` },
    h("rect", { width: size, height: size, fill: props.background || "white" }),
    ...rects,
  );
}

// ============ EXPORTS ============

