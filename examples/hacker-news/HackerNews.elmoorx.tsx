/**
 * HackerNews.elmoorx.tsx — Full Benchmark App
 * ============================================
 * A Hacker News clone with stories, voting, comments.
 * This is the exact app used in our benchmarks:
 *   Hacker News clone demo
 */

import { $store, $state, island, h, $effect, type ElmoorxNode } from "@elmoorx/runtime";

interface Story {
  id: number;
  title: string;
  url: string;
  points: number;
  author: string;
  comments: number;
  voted: boolean;
}

interface AppState {
  stories: Story[];
  filter: "top" | "new" | "best";
  user: { name: string; karma: number } | null;
}

function StoryItem({ story, index }: { story: Story; index: number }): ElmoorxNode {
  return h(
    "article",
    { class: "story" },
    h("div", { class: "story-rank" }, String(index + 1)),
    h(
      "div",
      { class: "story-vote" },
      h(
        "button",
        {
          class: story.voted ? "vote-btn voted" : "vote-btn",
          onClick: () => {
            if (!story.voted) {
              story.points += 1;
              story.voted = true;
            }
          },
        },
        "▲"
      )
    ),
    h(
      "div",
      { class: "story-body" },
      h(
        "h3",
        { class: "story-title" },
        h(
          "a",
          { href: story.url, target: "_blank", rel: "noopener noreferrer" },
          story.title
        )
      ),
      h(
        "div",
        { class: "story-meta" },
        () => `${story.points} points · ${story.author} · ${story.comments} comments`
      )
    )
  );
}

const HackerNews = island(() => {
  const store = $store<AppState>({
    stories: [
      { id: 1, title: "Elmoorx 1.0: A 4kb frontend framework", url: "https://elmoorx.dev", points: 1842, author: "amir", comments: 287, voted: false },
      { id: 2, title: "Show HN: I built a startup with Elmoorx in a weekend", url: "https://example.com", points: 932, author: "sara", comments: 156, voted: false },
      { id: 3, title: "Why hydration is a solved problem", url: "https://example.com", points: 714, author: "khalid", comments: 89, voted: false },
      { id: 4, title: "The death of the virtual DOM", url: "https://example.com", points: 521, author: "leila", comments: 64, voted: false },
      { id: 5, title: "Edge runtime comparison: Elmoorx vs Next.js", url: "https://example.com", points: 410, author: "yusuf", comments: 47, voted: false },
    ],
    filter: "top",
    user: { name: "guest", karma: 1 },
  });

  // Computed: derived value auto-updates
  const totalPoints = () =>
    store.stories.reduce((sum, s) => sum + s.points, 0);

  // Effect: side-effect runs on every change
  $effect(() => {
    document.title = `Elmoorx News · ${store.stories.length} stories`;
  });

  return h(
    "div",
    { class: "hn-app" },
    h(
      "header",
      { class: "hn-header" },
      h("div", { class: "hn-logo" }, "▲ Elmoorx News"),
      h(
        "nav",
        { class: "hn-nav" },
        ["top", "new", "best"].map((f) =>
          h(
            "button",
            {
              class: store.filter === f ? "nav-btn active" : "nav-btn",
              onClick: () => (store.filter = f as AppState["filter"]),
            },
            f
          )
        )
      ),
      h(
        "div",
        { class: "hn-user" },
        () => `${store.user?.name} (${store.user?.karma} karma)`
      )
    ),
    h(
      "section",
      { class: "hn-stories" },
      () => store.stories.map((s, i) => h(StoryItem, { story: s, index: i }))
    ),
    h(
      "footer",
      { class: "hn-footer" },
      () => `Total: ${totalPoints()} points across ${store.stories.length} stories`
    )
  );
});

export default function Page(): ElmoorxNode {
  return h(
    "div",
    { class: "page" },
    HackerNews({})
  );
}
