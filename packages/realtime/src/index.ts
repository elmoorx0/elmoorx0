/**
 * Elmoorx Realtime — WebSocket + Server-Sent Events
 * ============================================
 * Reactive hooks for real-time communication.
 *
 *   // WebSocket
 *   const { messages, send, status } = useWebSocket('wss://chat.example.com');
 *   send('Hello!');
 *
 *   // SSE
 *   const { events, close } = useSSE('/api/notifications');
 */

import { $state, onCleanup, onMount } from "@elmoorx/runtime";

export interface WebSocketResult<T = unknown> {
  // Last received message
  data: () => T | null;
  // All received messages
  messages: () => T[];
  // Connection status: 'connecting' | 'open' | 'closed' | 'error'
  status: () => "connecting" | "open" | "closed" | "error";
  // Send a message
  send: (data: unknown) => void;
  // Manually close
  close: () => void;
  // Manually reconnect
  reconnect: () => void;
}

export interface WebSocketOptions {
  // Auto-connect on mount (default: true)
  autoConnect?: boolean;
  // Reconnect on close (default: true)
  reconnect?: boolean;
  // Reconnect delay (ms, default: 1000)
  reconnectDelay?: number;
  // Max reconnect attempts (default: 5)
  maxReconnectAttempts?: number;
  // Serialize outgoing messages
  serialize?: (data: unknown) => string | ArrayBuffer;
  // Parse incoming messages
  deserialize?: (data: string) => unknown;
  // Heartbeat interval (ms, 0 = disabled, default: 30000)
  heartbeat?: number;
  // Heartbeat message to send
  heartbeatMessage?: string;
  // Subprotocols
  protocols?: string | string[];
}

/**
 * useWebSocket — reactive WebSocket client.
 *
 *   const { data, send, status } = useWebSocket<ChatMessage>('wss://chat.example.com', {
 *     reconnect: true,
 *     heartbeat: 30000,
 *   });
 *
 *   <div>{data()?.text}</div>
 *   <button onClick={() => send({ text: 'Hello' })}>Send</button>
 */
export function useWebSocket<T = unknown>(
  url: string | (() => string),
  opts: WebSocketOptions = {}
): WebSocketResult<T> {
  const data = $state<T | null>(null);
  const messages = $state<T[]>([]);
  const status = $state<"connecting" | "open" | "closed" | "error">("closed");

  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;
  let heartbeatId: ReturnType<typeof setInterval> | null = null;
  let shouldReconnect = opts.reconnect !== false;

  const getUrl = () => (typeof url === "function" ? url() : url);
  const serialize = opts.serialize || JSON.stringify;
  const deserialize = opts.deserialize || JSON.parse;

  const connect = () => {
    if (typeof WebSocket === "undefined") return;

    const u = getUrl();
    if (!u) return;

    status.set("connecting");

    try {
      ws = new WebSocket(u, opts.protocols);
    } catch (_err) {
      status.set("error");
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      status.set("open");
      reconnectAttempts = 0;

      // Start heartbeat
      if (opts.heartbeat && opts.heartbeat > 0 && opts.heartbeatMessage) {
        heartbeatId = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send((opts.heartbeatMessage as NonNullable<typeof opts.heartbeatMessage>));
          }
        }, opts.heartbeat);
      }
    };

    ws.onmessage = (event) => {
      try {
        const parsed = deserialize(event.data) as T;
        data.set(parsed);
        messages.set([...messages(), parsed]);
      } catch {
        data.set(event.data as T);
        messages.set([...messages(), event.data as T]);
      }
    };

    ws.onerror = () => {
      status.set("error");
    };

    ws.onclose = () => {
      status.set("closed");
      if (heartbeatId) clearInterval(heartbeatId);
      if (shouldReconnect) scheduleReconnect();
    };
  };

  const scheduleReconnect = () => {
    const max = opts.maxReconnectAttempts || 5;
    if (reconnectAttempts >= max) return;
    reconnectAttempts++;
    const delay = (opts.reconnectDelay || 1000) * reconnectAttempts;
    setTimeout(connect, delay);
  };

  const send = (msg: unknown) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(serialize(msg));
    }
  };

  const close = () => {
    shouldReconnect = false;
    if (heartbeatId) clearInterval(heartbeatId);
    ws?.close();
    ws = null;
  };

  const reconnect = () => {
    shouldReconnect = true;
    reconnectAttempts = 0;
    close();
    shouldReconnect = true;
    connect();
  };

  if (opts.autoConnect !== false) {
    onMount(() => {
      connect();
      onCleanup(close);
    });
  }

  return { data, messages, status, send, close, reconnect };
}

export interface SSEResult<T = unknown> {
  events: () => T[];
  lastEvent: () => T | null;
  error: () => Event | null;
  readyState: () => number;
  close: () => void;
}

/**
 * useSSE — Server-Sent Events client.
 *
 *   const { events, error } = useSSE<Notification>('/api/notifications');
 *
 *   <ul>{events().map(e => h('li', null, e.message))}</ul>
 */
export function useSSE<T = unknown>(
  url: string | (() => string),
  opts: {
    withCredentials?: boolean;
    autoConnect?: boolean;
    deserialize?: (data: string) => T;
  } = {}
): SSEResult<T> {
  const events = $state<T[]>([]);
  const lastEvent = $state<T | null>(null);
  const error = $state<Event | null>(null);
  const readyState = $state(0);

  let source: EventSource | null = null;
  const deserialize = opts.deserialize || JSON.parse;
  const getUrl = () => (typeof url === "function" ? url() : url);

  const connect = () => {
    if (typeof EventSource === "undefined") return;
    const u = getUrl();
    if (!u) return;

    source = new EventSource(u, { withCredentials: opts.withCredentials });

    source.onopen = () => readyState.set((source as NonNullable<typeof source>).readyState);
    source.onerror = (e) => {
      error.set(e);
      readyState.set(source?.readyState || 0);
    };
    source.onmessage = (e) => {
      try {
        const parsed = deserialize(e.data) as T;
        lastEvent.set(parsed);
        events.set([...events(), parsed]);
      } catch {
        lastEvent.set(e.data as T);
        events.set([...events(), e.data as T]);
      }
    };
  };

  const close = () => {
    source?.close();
    source = null;
    readyState.set(0);
  };

  if (opts.autoConnect !== false) {
    onMount(() => {
      connect();
      onCleanup(close);
    });
  }

  return { events, lastEvent, error, readyState, close };
}

/**
 * usePolling — poll an async function on an interval.
 *
 *   const { data } = usePolling(async () => {
 *     const res = await fetch('/api/status');
 *     return res.json();
 *   }, 5000);
 */
export function usePolling<T>(
  fn: () => Promise<T>,
  intervalMs: number,
  opts: { immediate?: boolean } = {}
) {
  const data = $state<T | null>(null);
  const error = $state<Error | null>(null);
  const loading = $state(false);

  const poll = async () => {
    loading.set(true);
    try {
      const result = await fn();
      data.set(result);
      error.set(null);
    } catch (err) {
      error.set(err as Error);
    } finally {
      loading.set(false);
    }
  };

  onMount(() => {
    if (opts.immediate !== false) poll();
    const id = setInterval(poll, intervalMs);
    onCleanup(() => clearInterval(id));
  });

  return { data, error, loading, refresh: poll };
}
