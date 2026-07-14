/**
 * Auth.elmoorx.tsx — Authentication flow with Elmoorx
 * ============================================
 * - Login / logout
 * - Session via fetch + httpOnly cookie (CSRF-protected)
 * - Reactive user state shared across islands
 */

import { $store, $effect, island, h, type ElmoorxNode } from "@elmoorx/runtime";

interface AuthState {
  user: { id: string; name: string; email: string } | null;
  loading: boolean;
  error: string | null;
}

// Global auth store — shared across all islands
const authStore = $store<AuthState>({
  user: null,
  loading: false,
  error: null,
});

// Login form island
const LoginForm = island(() => {
  const email = $store({ value: "" });
  const password = $store({ value: "" });

  const submit = async (e: Event) => {
    e.preventDefault();
    authStore.loading = true;
    authStore.error = null;

    try {
      // CSRF token auto-attached by Elmoorx runtime
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.value,
          password: password.value,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        authStore.error = data.message || "Login failed";
        return;
      }

      const user = await res.json();
      authStore.user = user;
      authStore.error = null;
    } catch {
      authStore.error = "Network error — please try again";
    } finally {
      authStore.loading = false;
    }
  };

  return h(
    "form",
    { onSubmit: submit, class: "login-form" },
    h("h2", null, "Sign In"),
    h("input", {
      type: "email",
      placeholder: "Email",
      value: () => email.value,
      onInput: (e: Event) => (email.value = (e.target as HTMLInputElement).value),
      required: true,
    }),
    h("input", {
      type: "password",
      placeholder: "Password",
      value: () => password.value,
      onInput: (e: Event) => (password.value = (e.target as HTMLInputElement).value),
      required: true,
    }),
    () => (authStore.error ? h("div", { class: "error" }, authStore.error) : null),
    h(
      "button",
      { type: "submit", disabled: () => authStore.loading },
      () => (authStore.loading ? "Signing in..." : "Sign In")
    )
  );
});

// User profile island — reads from shared store
const UserProfile = island(() => {
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    authStore.user = null;
  };

  return h(
    "div",
    { class: "profile" },
    h("h2", null, () => `Welcome, ${authStore.user?.name || "Guest"}`),
    () =>
      authStore.user
        ? h(
            "div",
            null,
            h("p", null, () => `Email: ${authStore.user!.email}`),
            h("button", { onClick: logout }, "Sign Out")
          )
        : h("p", null, "Not signed in.")
  );
});

// Layout that decides which island to show
export default function Page(): ElmoorxNode {
  // Sync initial state from server-injected payload
  $effect(() => {
    const initial = (window as any).__ELMOORX_INITIAL__?.user;
    if (initial) authStore.user = initial;
  });

  return h(
    "main",
    { class: "auth-page" },
    h("h1", null, "Elmoorx Auth Demo"),
    () => (authStore.user ? h(UserProfile, {}) : h(LoginForm, {}))
  );
}
