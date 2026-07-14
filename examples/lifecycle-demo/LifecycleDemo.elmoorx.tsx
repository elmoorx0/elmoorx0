/**
 * LifecycleDemo.elmoorx.tsx — onMount / onCleanup / onError
 */

import {
  $state, $effect,
  onMount, onCleanup, onError,
  h, type ElmoorxNode,
} from "@elmoorx/runtime";

function Timer() {
  const seconds = $state(0);

  onMount(() => {
    console.log("Timer mounted");
    const id = setInterval(() => seconds.set(s => s + 1), 1000);

    // Return cleanup function
    onCleanup(() => {
      console.log("Timer unmounting — clearing interval");
      clearInterval(id);
    });
  });

  return h("div", null,
    h("p", null, () => `Elapsed: ${seconds()}s`),
  );
}

function ErrorProne() {
  onError((err) => {
    console.error("Caught error in ErrorProne:", err);
  });

  return h("button", {
    onClick: () => { throw new Error("Oops!"); },
  }, "Throw error");
}

export default function Page(): ElmoorxNode {
  const show = $state(true);

  return h("main", null,
    h("h1", null, "Lifecycle Demo"),
    h("button", {
      onClick: () => show.set(s => !s),
    }, () => show() ? "Unmount timer" : "Mount timer"),
    () => show() ? h(Timer, {}) : null,
    h("hr", null),
    h(ErrorProne, {}),
  );
}
