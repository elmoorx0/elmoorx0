/**
 * Counter.elmoorx.tsx — Zero-Hydration Island Example
 * ============================================
 * Only the Counter island ships JavaScript to the client.
 * Everything else on the page is pure HTML.
 */

import { $state, island, h, type ElmoorxNode } from "@elmoorx/runtime";

const Counter = island(() => {
  const count = $state(0);

  return h(
    "div",
    { class: "counter" },
    h("h2", null, () => `Count: ${count()}`),
    h(
      "button",
      {
        onClick: () => count.set((c) => c + 1),
        class: "btn-primary",
      },
      "Increment"
    ),
    h(
      "button",
      {
        onClick: () => count.set(0),
        class: "btn-secondary",
      },
      "Reset"
    )
  );
});

export default function Page(): ElmoorxNode {
  return h(
    "main",
    null,
    h("h1", null, "Counter Example"),
    h("p", null, "This entire page is server-rendered. Only the counter below is hydrated as an island."),
    Counter({})
  );
}
