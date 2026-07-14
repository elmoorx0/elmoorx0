/**
 * Elmoorx Chat App Example
 * ============================================
 * Real-time chat with rooms, typing indicators,
 * and message history. Demonstrates $store + useWebSocket.
 */

import { $store, $state, $effect, h, type ElmoorxNode } from "@elmoorx/runtime";

// ─── Types ────────────────────────────────────────────────────────────

interface Message {
  id: string;
  roomId: string;
  author: string;
  text: string;
  timestamp: number;
  isOwn: boolean;
}

interface Room {
  id: string;
  name: string;
  unread: number;
  lastMessage?: string;
}

// ─── State ────────────────────────────────────────────────────────────

const chat = $store<{
  rooms: Room[];
  messages: Message[];
  activeRoom: string;
  input: string;
  isTyping: boolean;
  currentUser: string;
}>({
  rooms: [
    { id: "general", name: "# general", unread: 0 },
    { id: "random", name: "# random", unread: 2 },
    { id: "dev", name: "# dev", unread: 0 },
  ],
  messages: [
    { id: "m1", roomId: "general", author: "Alice", text: "Hey everyone!", timestamp: Date.now() - 60000, isOwn: false },
    { id: "m2", roomId: "general", author: "Bob", text: "Hi Alice 👋", timestamp: Date.now() - 50000, isOwn: false },
    { id: "m3", roomId: "general", author: "You", text: "Hello!", timestamp: Date.now() - 40000, isOwn: true },
    { id: "m4", roomId: "general", author: "Alice", text: "How's the project going?", timestamp: Date.now() - 30000, isOwn: false },
    { id: "m5", roomId: "random", author: "Bob", text: "Check this out 🎉", timestamp: Date.now() - 20000, isOwn: false },
    { id: "m6", roomId: "random", author: "Alice", text: "That's awesome!", timestamp: Date.now() - 10000, isOwn: false },
    { id: "m7", roomId: "dev", author: "You", text: "Pushed the fix", timestamp: Date.now() - 5000, isOwn: true },
  ],
  activeRoom: "general",
  input: "",
  isTyping: false,
  currentUser: "You",
});

// ─── Bot responses (simulated WebSocket) ──────────────────────────────

const BOT_RESPONSES = [
  "That's interesting!",
  "I agree 👍",
  "Let me think about that...",
  "Good point!",
  "🎉",
  "Can you elaborate?",
  "Sounds great!",
  "I'll look into it.",
];

function simulateResponse() {
  setTimeout(() => {
    chat.isTyping = true;
    setTimeout(() => {
      chat.isTyping = false;
      const response = BOT_RESPONSES[Math.floor(Math.random() * BOT_RESPONSES.length)];
      const author = Math.random() > 0.5 ? "Alice" : "Bob";
      chat.messages.push({
        id: `m${Date.now()}`,
        roomId: chat.activeRoom,
        author,
        text: response,
        timestamp: Date.now(),
        isOwn: false,
      });
      // Update room's last message
      const room = chat.rooms.find((r) => r.id === chat.activeRoom);
      if (room) room.lastMessage = response;
    }, 1500 + Math.random() * 1000);
  }, 500);
}

// ─── Actions ──────────────────────────────────────────────────────────

function selectRoom(roomId: string) {
  chat.activeRoom = roomId;
  const room = chat.rooms.find((r) => r.id === roomId);
  if (room) room.unread = 0;
}

function sendMessage() {
  const text = chat.input.trim();
  if (!text) return;

  chat.messages.push({
    id: `m${Date.now()}`,
    roomId: chat.activeRoom,
    author: chat.currentUser,
    text,
    timestamp: Date.now(),
    isOwn: true,
  });

  // Update room's last message
  const room = chat.rooms.find((r) => r.id === chat.activeRoom);
  if (room) room.lastMessage = text;

  chat.input = "";

  // Simulate a response
  simulateResponse();
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function currentRoomMessages(): Message[] {
  return chat.messages.filter((m) => m.roomId === chat.activeRoom);
}

// ─── Components ───────────────────────────────────────────────────────

function Sidebar(): ElmoorxNode {
  return h("aside", {
    style: "width:260px; background:#1e293b; color:#e2e8f0; display:flex; flex-direction:column; height:100vh;",
  },
    // Header
    h("div", {
      style: "padding:20px; border-bottom:1px solid #334155; display:flex; align-items:center; gap:8px;",
    },
      h("span", { style: "font-size:24px;" }, "⚡"),
      h("span", { style: "font-size:18px; font-weight:700;" }, "Elmoorx Chat")
    ),
    // Rooms
    h("div", { style: "padding:12px;" },
      h("div", { style: "color:#94a3b8; font-size:12px; text-transform:uppercase; margin-bottom:8px; padding:0 8px;" }, "Channels"),
      ...chat.rooms.map((room) =>
        h("div", {
          key: room.id,
          onClick: () => selectRoom(room.id),
          style: `padding:8px 12px; border-radius:6px; cursor:pointer; margin-bottom:2px; display:flex; justify-content:space-between; align-items:center; background:${chat.activeRoom === room.id ? "#6366f1" : "transparent"}; transition:background 0.15s;`,
        },
          h("span", { style: "font-size:14px;" }, room.name),
          () => room.unread > 0
            ? h("span", {
                style: "background:#ef4444; color:white; font-size:11px; padding:2px 6px; border-radius:999px; font-weight:600;",
              }, () => String(room.unread))
            : null
        )
      )
    ),
    // User
    h("div", {
      style: "margin-top:auto; padding:16px; border-top:1px solid #334155; display:flex; align-items:center; gap:8px;",
    },
      h("div", {
        style: "width:32px; height:32px; border-radius:50%; background:#6366f1; display:flex; align-items:center; justify-content:center; font-weight:600;",
      }, "Y"),
      h("div", null,
        h("div", { style: "font-size:14px; font-weight:600;" }, "You"),
        h("div", { style: "font-size:12px; color:#22c55e;" }, "● Online")
      )
    )
  );
}

function MessageBubble(msg: Message): ElmoorxNode {
  return h("div", {
    style: `display:flex; flex-direction:column; margin-bottom:12px; align-items:${msg.isOwn ? "flex-end" : "flex-start"};`,
  },
    h("div", {
      style: `max-width:70%; padding:10px 14px; border-radius:12px; background:${msg.isOwn ? "#6366f1" : "#e2e8f0"}; color:${msg.isOwn ? "white" : "#1e293b"};`,
    },
      !msg.isOwn
        ? h("div", { style: "font-size:12px; font-weight:600; margin-bottom:4px; color:#6366f1;" }, msg.author)
        : null,
      h("div", { style: "font-size:14px; line-height:1.4;" }, msg.text)
    ),
    h("div", {
      style: "font-size:11px; color:#94a3b8; margin-top:4px;",
    }, formatTime(msg.timestamp))
  );
}

function ChatArea(): ElmoorxNode {
  return h("div", {
    style: "flex:1; display:flex; flex-direction:column; height:100vh; background:#f8fafc;",
  },
    // Header
    h("div", {
      style: "padding:16px 24px; background:white; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;",
    },
      h("h2", { style: "margin:0; font-size:18px; color:#1e293b;" },
        () => chat.rooms.find((r) => r.id === chat.activeRoom)?.name || ""
      ),
      h("div", { style: "display:flex; gap:8px; color:#94a3b8; font-size:13px;" },
        h("span", null, "👥 3 members")
      )
    ),
    // Messages
    h("div", {
      style: "flex:1; overflow-y:auto; padding:24px;",
    },
      ...currentRoomMessages().map((msg) => h(MessageBubble, { msg })),
      // Typing indicator
      () => chat.isTyping
        ? h("div", { style: "display:flex; align-items:center; gap:4px; padding:8px 14px;" },
            h("div", { style: "display:flex; gap:4px;" },
              h("span", { style: "width:8px; height:8px; border-radius:50%; background:#94a3b8; animation:blink 1s infinite;" }, ""),
              h("span", { style: "width:8px; height:8px; border-radius:50%; background:#94a3b8; animation:blink 1s infinite 0.2s;" }, ""),
              h("span", { style: "width:8px; height:8px; border-radius:50%; background:#94a3b8; animation:blink 1s infinite 0.4s;" }, "")
            ),
            h("span", { style: "color:#94a3b8; font-size:13px; margin-left:8px;" }, "someone is typing...")
          )
        : null
    ),
    // Input
    h("div", {
      style: "padding:16px 24px; background:white; border-top:1px solid #e2e8f0; display:flex; gap:12px;",
    },
      h("input", {
        type: "text",
        placeholder: `Message #${chat.activeRoom}...`,
        value: chat.input,
        onInput: (e: Event) => { chat.input = (e.target as HTMLInputElement).value; },
        onKeyDown: (e: KeyboardEvent) => { if (e.key === "Enter") sendMessage(); },
        style: "flex:1; padding:10px 16px; border:1px solid #e2e8f0; border-radius:8px; font-size:14px; outline:none;",
      }),
      h("button", {
        onClick: sendMessage,
        style: "padding:10px 24px; background:#6366f1; color:white; border:none; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer;",
      }, "Send →")
    )
  );
}

function ChatApp(): ElmoorxNode {
  return h("div", {
    style: "display:flex; height:100vh; font-family:-apple-system,sans-serif; overflow:hidden;",
  },
    h(Sidebar, {}),
    h(ChatArea, {})
  );
}

export { ChatApp };
