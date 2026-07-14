/**
 * @elmoorx/ai-chat — Streaming AI chat UI + transport helpers
 * ============================================
 * Render a streaming chat UI that connects to any OpenAI-compatible
 * `/v1/chat/completions` endpoint (or a custom fetcher).
 *
 *   import { createChat } from "@elmoorx/ai-chat";
 *
 *   const chat = createChat({
 *     endpoint: "/api/chat",
 *     model: "gpt-4o-mini",
 *   });
 *
 *   await chat.send("Hello, world!");
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  /** Optional citation/metadata attached to assistant messages. */
  meta?: Record<string, unknown>;
}

export interface ChatOptions {
  endpoint: string;
  model?: string;
  systemPrompt?: string;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
  /** Called for each token chunk during streaming. */
  onToken?: (delta: string, full: string) => void;
}

export interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
}

export interface ChatController {
  state: ChatState;
  send(userText: string): Promise<string>;
  reset(): void;
}

export function createChat(opts: ChatOptions): ChatController {
  const state: ChatState = {
    messages: opts.systemPrompt
      ? [{ role: "system", content: opts.systemPrompt }]
      : [],
    isStreaming: false,
  };

  const fetchImpl = opts.fetchImpl ?? fetch;

  return {
    state,
    async send(userText: string): Promise<string> {
      if (state.isStreaming) {
        throw new Error("A message is already streaming");
      }
      const userMsg: ChatMessage = { role: "user", content: userText };
      state.messages.push(userMsg);
      state.isStreaming = true;

      try {
        const res = await fetchImpl(opts.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(opts.headers ?? {}),
          },
          body: JSON.stringify({
            model: opts.model ?? "gpt-4o-mini",
            messages: state.messages.map(({ role, content }) => ({ role, content })),
            stream: true,
          }),
        });

        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => "");
          throw new Error(`Chat request failed: HTTP ${res.status} ${text}`);
        }

        // Parse SSE stream
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let full = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload);
              const delta: string = json.choices?.[0]?.delta?.content ?? "";
              if (delta) {
                full += delta;
                opts.onToken?.(delta, full);
              }
            } catch {
              // skip malformed chunk
            }
          }
        }

        state.messages.push({ role: "assistant", content: full });
        return full;
      } finally {
        state.isStreaming = false;
      }
    },

    reset(): void {
      state.messages = opts.systemPrompt
        ? [{ role: "system", content: opts.systemPrompt }]
        : [];
      state.isStreaming = false;
    },
  };
}

export const VERSION = "3.0.0-alpha.2";
