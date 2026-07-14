/**
 * DataFetching.elmoorx.tsx — Server-side + client-side data fetching
 * ============================================
 * Demonstrates:
 *   - SSR data fetching (page loads with data already present)
 *   - Client-side revalidation (refresh button)
 *   - Streaming (progressive HTML chunks)
 */

import { $state, $effect, island, h, type ElmoorxNode } from "@elmoorx/runtime";

interface Post {
  id: number;
  title: string;
  body: string;
}

// This function runs server-side during SSR.
// Its result is serialized and injected into the client bundle.
export async function getServerSideProps() {
  const res = await fetch("https://jsonplaceholder.typicode.com/posts?_limit=5");
  const posts: Post[] = await res.json();
  return { props: { posts } };
}

const PostList = island((initialProps: { posts: Post[] }) => {
  const posts = $state<Post[]>(initialProps.posts || []);
  const loading = $state(false);
  const error = $state<string | null>(null);

  const refresh = async () => {
    loading.set(true);
    error.set(null);
    try {
      const res = await fetch("https://jsonplaceholder.typicode.com/posts?_limit=5");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      posts.set(data);
    } catch (err) {
      error.set(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      loading.set(false);
    }
  };

  return h(
    "div",
    { class: "post-list" },
    h(
      "header",
      { class: "list-header" },
      h("h2", null, "Latest Posts"),
      h(
        "button",
        { onClick: refresh, disabled: () => loading(), class: "refresh-btn" },
        () => (loading() ? "Refreshing..." : "Refresh")
      )
    ),
    () =>
      error()
        ? h("div", { class: "error" }, error())
        : h(
            "ul",
            null,
            () =>
              posts().map((post) =>
                h(
                  "li",
                  { key: String(post.id), class: "post" },
                  h("h3", null, post.title),
                  h("p", null, post.body)
                )
              )
          )
  );
});

export default function Page({ posts }: { posts: Post[] }): ElmoorxNode {
  return h(
    "main",
    { class: "page" },
    h("h1", null, "Data Fetching Demo"),
    h("p", null, "Data is fetched on the server and streamed to the client. Click Refresh to revalidate."),
    h(PostList, { posts })
  );
}
