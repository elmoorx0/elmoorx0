/**
 * Todo.elmoorx.tsx — Reactive Store Example
 * ============================================
 * The store is a deep reactive proxy. Mutations like
 * `store.todos.push(item)` or `store.text = '...'` auto-trigger
 * surgical DOM updates — only the affected nodes re-render.
 */

import { $store, h, type ElmoorxNode } from "@elmoorx/runtime";

interface Todo {
  text: string;
  done: boolean;
}

interface TodoState {
  todos: Todo[];
  text: string;
}

function TodoApp(): ElmoorxNode {
  const store = $store<TodoState>({
    todos: [
      { text: "Learn Elmoorx", done: true },
      { text: "Build an app", done: false },
      { text: "Deploy to edge", done: false },
    ],
    text: "",
  });

  const addTodo = () => {
    const text = store.text.trim();
    if (!text) return;
    store.todos.push({ text, done: false });
    store.text = "";
  };

  const remaining = () => store.todos.filter((t) => !t.done).length;

  return h(
    "div",
    { class: "todo-app" },
    h(
      "div",
      { class: "todo-input-row" },
      h("input", {
        type: "text",
        placeholder: "What needs to be done?",
        value: () => store.text,
        onInput: (e: Event) => (store.text = (e.target as HTMLInputElement).value),
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === "Enter") addTodo();
        },
      }),
      h("button", { onClick: addTodo, class: "btn-primary" }, "Add")
    ),
    h(
      "ul",
      { class: "todo-list" },
      () =>
        store.todos.map((todo, i) =>
          h(
            "li",
            { class: todo.done ? "todo-item done" : "todo-item" },
            h("input", {
              type: "checkbox",
              checked: todo.done,
              onChange: (e: Event) =>
                (store.todos[i].done = (e.target as HTMLInputElement).checked),
            }),
            h("span", { class: "todo-text" }, todo.text),
            h(
              "button",
              {
                class: "todo-del",
                onClick: () => store.todos.splice(i, 1),
              },
              "×"
            )
          )
        )
    ),
    h("div", { class: "todo-stats" }, () => `${remaining()} of ${store.todos.length} remaining`)
  );
}

export default function Page(): ElmoorxNode {
  return h(
    "main",
    null,
    h("h1", null, "Todo List"),
    h("p", null, "Built with Elmoorx's reactive store. No Redux. No Context. No boilerplate."),
    TodoApp()
  );
}
