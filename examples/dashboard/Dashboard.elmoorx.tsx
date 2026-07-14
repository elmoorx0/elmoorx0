/**
 * Elmoorx Dashboard Example
 * ============================================
 * Admin dashboard with stats cards, data table, charts,
 * and real-time updates. Demonstrates $store + useFetch.
 */

import { $store, $state, $effect, h, type ElmoorxNode } from "@elmoorx/runtime";

// ─── Types ────────────────────────────────────────────────────────────

interface Metric {
  label: string;
  value: string;
  change: number;
  icon: string;
}

interface Order {
  id: string;
  customer: string;
  product: string;
  amount: number;
  status: "pending" | "processing" | "shipped" | "delivered";
  date: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────

const METRICS: Metric[] = [
  { label: "Revenue", value: "$48,329", change: 12.5, icon: "💰" },
  { label: "Orders", value: "1,847", change: 8.2, icon: "📦" },
  { label: "Users", value: "12,038", change: -2.4, icon: "👥" },
  { label: "Conversion", value: "3.2%", change: 0.8, icon: "📈" },
];

const ORDERS: Order[] = [
  { id: "ORD-001", customer: "Alice Johnson", product: "Wireless Headphones", amount: 99.99, status: "delivered", date: "2026-07-13" },
  { id: "ORD-002", customer: "Bob Smith", product: "Mechanical Keyboard", amount: 149.99, status: "shipped", date: "2026-07-12" },
  { id: "ORD-003", customer: "Carol White", product: "Coffee Mug", amount: 12.99, status: "processing", date: "2026-07-12" },
  { id: "ORD-004", customer: "Dave Brown", product: "USB-C Cable", amount: 19.99, status: "pending", date: "2026-07-11" },
  { id: "ORD-005", customer: "Eva Green", product: "Notebook", amount: 8.99, status: "delivered", date: "2026-07-10" },
];

// ─── State ────────────────────────────────────────────────────────────

const dashboard = $store<{
  selectedStatus: "all" | Order["status"];
  searchQuery: string;
  sidebarOpen: boolean;
}>({
  selectedStatus: "all",
  searchQuery: "",
  sidebarOpen: true,
});

const liveTime = $state(new Date());
setInterval(() => liveTime.set(new Date()), 1000);

// ─── Components ───────────────────────────────────────────────────────

function StatCard(metric: Metric): ElmoorxNode {
  const isPositive = metric.change >= 0;
  return h("div", {
    style: "background:white; border:1px solid #e2e8f0; border-radius:12px; padding:24px;",
  },
    h("div", { style: "display:flex; justify-content:space-between; align-items:start; margin-bottom:16px;" },
      h("div", { style: "font-size:32px;" }, metric.icon),
      h("div", {
        style: `padding:4px 8px; border-radius:4px; font-size:12px; font-weight:600; background:${isPositive ? "#dcfce7" : "#fee2e2"}; color:${isPositive ? "#16a34a" : "#dc2626"};`,
      }, `${isPositive ? "↑" : "↓"} ${Math.abs(metric.change)}%`)
    ),
    h("div", { style: "font-size:28px; font-weight:700; color:#0f172a;" }, metric.value),
    h("div", { style: "color:#64748b; font-size:14px; margin-top:4px;" }, metric.label)
  );
}

function StatusBadge(status: Order["status"]): ElmoorxNode {
  const colors: Record<Order["status"], string> = {
    pending: "#f59e0b",
    processing: "#3b82f6",
    shipped: "#8b5cf6",
    delivered: "#10b981",
  };
  return h("span", {
    style: `padding:4px 10px; border-radius:999px; font-size:12px; font-weight:600; color:white; background:${colors[status]};`,
  }, status);
}

function OrderRow(order: Order): ElmoorxNode {
  return h("tr", { style: "border-bottom:1px solid #e2e8f0;" },
    h("td", { style: "padding:12px; font-family:monospace; color:#6366f1;" }, order.id),
    h("td", { style: "padding:12px;" }, order.customer),
    h("td", { style: "padding:12px;" }, order.product),
    h("td", { style: "padding:12px; text-align:right;" }, `$${order.amount.toFixed(2)}`),
    h("td", { style: "padding:12px; text-align:center;" }, h(StatusBadge, { status: order.status })),
    h("td", { style: "padding:12px; color:#64748b;" }, order.date)
  );
}

function filteredOrders(): Order[] {
  let result = ORDERS;
  if (dashboard.selectedStatus !== "all") {
    result = result.filter((o) => o.status === dashboard.selectedStatus);
  }
  if (dashboard.searchQuery) {
    const q = dashboard.searchQuery.toLowerCase();
    result = result.filter(
      (o) => o.id.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q) || o.product.toLowerCase().includes(q)
    );
  }
  return result;
}

function Sidebar(): ElmoorxNode {
  const menuItems = [
    { icon: "📊", label: "Dashboard", active: true },
    { icon: "📦", label: "Orders" },
    { icon: "👥", label: "Customers" },
    { icon: "🎁", label: "Products" },
    { icon: "💰", label: "Revenue" },
    { icon: "⚙️", label: "Settings" },
  ];
  return h("aside", {
    style: `width:${dashboard.sidebarOpen ? "240px" : "0"}; background:#0f172a; color:white; overflow:hidden; transition:width 0.3s; height:100vh; position:sticky; top:0;`,
  },
    h("div", { style: "padding:24px; font-size:20px; font-weight:700; border-bottom:1px solid #1e293b;" },
      "⚡ Elmoorx"
    ),
    h("nav", { style: "padding:16px;" },
      ...menuItems.map((item) =>
        h("a", {
          href: "#",
          style: `display:flex; align-items:center; gap:12px; padding:12px 16px; border-radius:8px; color:${item.active ? "#fff" : "#94a3b8"}; background:${item.active ? "#6366f1" : "transparent"}; text-decoration:none; margin-bottom:4px; transition:all 0.2s;`,
        },
          h("span", { style: "font-size:20px;" }, item.icon),
          h("span", null, item.label)
        )
      )
    )
  );
}

function Dashboard(): ElmoorxNode {
  return h("div", { style: "display:flex; min-height:100vh; background:#f8fafc; font-family:sans-serif;" },
    h(Sidebar, {}),
    h("div", { style: "flex:1; padding:32px;" },
      // Header
      h("div", { style: "display:flex; justify-content:space-between; align-items:center; margin-bottom:32px;" },
        h("div", null,
          h("h1", { style: "margin:0; color:#0f172a;" }, "Dashboard"),
          h("p", { style: "color:#64748b; margin:4px 0 0;" },
            () => `Last updated: ${liveTime().toLocaleTimeString()}`
          )
        ),
        h("button", {
          onClick: () => { dashboard.sidebarOpen = !dashboard.sidebarOpen; },
          style: "padding:8px 16px; background:#6366f1; color:white; border:none; border-radius:8px; cursor:pointer;",
        }, dashboard.sidebarOpen ? "← Collapse" : "→ Expand")
      ),
      // Stats
      h("div", { style: "display:grid; grid-template-columns:repeat(4, 1fr); gap:16px; margin-bottom:32px;" },
        ...METRICS.map((m) => h(StatCard, { metric: m }))
      ),
      // Orders table
      h("div", { style: "background:white; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;" },
        h("div", { style: "padding:24px; border-bottom:1px solid #e2e8f0;" },
          h("h2", { style: "margin:0 0 16px; color:#0f172a;" }, "Recent Orders"),
          h("div", { style: "display:flex; gap:16px; flex-wrap:wrap;" },
            h("input", {
              type: "search",
              placeholder: "Search orders...",
              value: dashboard.searchQuery,
              onInput: (e: Event) => { dashboard.searchQuery = (e.target as HTMLInputElement).value; },
              style: "flex:1; min-width:200px; padding:8px 16px; border:1px solid #e2e8f0; border-radius:6px;",
            }),
            h("select", {
              value: dashboard.selectedStatus,
              onChange: (e: Event) => { dashboard.selectedStatus = (e.target as HTMLSelectElement).value as any; },
              style: "padding:8px 16px; border:1px solid #e2e8f0; border-radius:6px;",
            },
              h("option", { value: "all" }, "All Status"),
              h("option", { value: "pending" }, "Pending"),
              h("option", { value: "processing" }, "Processing"),
              h("option", { value: "shipped" }, "Shipped"),
              h("option", { value: "delivered" }, "Delivered"),
            )
          )
        ),
        h("table", { style: "width:100%; border-collapse:collapse;" },
          h("thead", null,
            h("tr", { style: "background:#f8fafc; text-align:left;" },
              h("th", { style: "padding:12px; color:#64748b; font-size:14px;" }, "Order ID"),
              h("th", { style: "padding:12px; color:#64748b; font-size:14px;" }, "Customer"),
              h("th", { style: "padding:12px; color:#64748b; font-size:14px;" }, "Product"),
              h("th", { style: "padding:12px; color:#64748b; font-size:14px; text-align:right;" }, "Amount"),
              h("th", { style: "padding:12px; color:#64748b; font-size:14px; text-align:center;" }, "Status"),
              h("th", { style: "padding:12px; color:#64748b; font-size:14px;" }, "Date")
            )
          ),
          h("tbody", null,
            ...filteredOrders().map((order) => h(OrderRow, { order }))
          )
        )
      )
    )
  );
}

export { Dashboard };
