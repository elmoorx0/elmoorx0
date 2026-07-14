/**
 * ContextDemo.elmoorx.tsx — Context API demo
 * Shows provide/inject for dependency injection.
 */

import {
  createContext, provide, inject,
  $state, h, type ElmoorxNode,
} from "@elmoorx/runtime";

// === Define contexts ===
const ThemeCtx = createContext<"light" | "dark">("light", "theme");
const UserCtx = createContext<{ name: string; role: string } | null>(null, "user");

// === Provider component ===
function App() {
  const theme = $state<"light" | "dark">("dark");
  const user = { name: "Amir", role: "admin" };

  // Provide values to descendants
  provide(ThemeCtx, () => theme());
  provide(UserCtx, user);

  return h("div", null,
    h("button", {
      onClick: () => theme.set(t => t === "dark" ? "light" : "dark")
    }, () => `Toggle theme (current: ${theme()})`),
    h(Toolbar, {}),
    h(UserBadge, {}),
    h(Settings, {}),
  );
}

// === Consumers — can be deeply nested ===
function Toolbar() {
  const theme = inject(ThemeCtx);  // ← got it from App, no prop drilling
  return h("div", { class: "toolbar" },
    h("p", null, () => `Toolbar theme: ${theme()}`),
    h(SearchBox, {}),
  );
}

function SearchBox() {
  const theme = inject(ThemeCtx);  // ← still works, deeply nested
  return h("input", {
    placeholder: "Search...",
    class: () => `search search-${theme()}`,
  });
}

function UserBadge() {
  const user = inject(UserCtx);
  if (!user) return h("span", null, "Guest");
  return h("span", { class: "badge" }, () => `${user.name} (${user.role})`);
}

function Settings() {
  const theme = inject(ThemeCtx);
  const user = inject(UserCtx);
  return h("div", null,
    h("p", null, () => `Settings for ${user?.name}, theme=${theme()}`),
  );
}

export default function Page(): ElmoorxNode {
  return h("main", null, h(App, {}));
}
