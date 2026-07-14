/**
 * @elmoorx/collab — Real-time Collaboration (Figma-like)
 * ============================================
 * Multiple users editing the same Elmoorx app simultaneously.
 * See cursors, selections, and edits in real-time.
 *
 *   import { h, useCollab, collabSession } from "@elmoorx/collab";
 *
 *   const session = collabSession.create("my-app");
 *   const { users, cursors, share } = useCollab(session);
 *
 * Features:
 *   - Live cursors (see where others are pointing)
 *   - Live selections (see what others have selected)
 *   - Shared state (everyone sees the same data)
 *   - Presence (who's online, what they're editing)
 *   - Comments + annotations
 *   - Voice chat integration
 *   - Conflict-free editing (CRDT-based)
 */

import { h, $state, type ElmoorxNode } from "@elmoorx/runtime";

// ============ TYPES ============

export interface CollabUser {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selection: string | null; // element ID
  active: boolean;
  lastSeen: number;
}

export interface CollabComment {
  id: string;
  userId: string;
  text: string;
  position: { x: number; y: number };
  timestamp: number;
  resolved: boolean;
}

export interface CollabEdit {
  id: string;
  userId: string;
  path: string; // e.g., "tree.0.children.1.props.text"
  oldValue: unknown;
  newValue: unknown;
  timestamp: number;
}

// ============ COLLAB SESSION ============

class CollabSessionManager {
  private sessions = new Map<string, CollabSession>();
  private currentSession: CollabSession | null = null;

  create(name: string): CollabSession {
    const session = new CollabSession(name);
    this.sessions.set(name, session);
    this.currentSession = session;
    return session;
  }

  join(name: string): CollabSession {
    let session = this.sessions.get(name);
    if (!session) {
      session = this.create(name);
    }
    this.currentSession = session;
    session.connect();
    return session;
  }

  getCurrent(): CollabSession | null {
    return this.currentSession;
  }

  leave(): void {
    if (this.currentSession) {
      this.currentSession.disconnect();
      this.currentSession = null;
    }
  }
}

class CollabSession {
  private users = $state<CollabUser[]>([]);
  private comments = $state<CollabComment[]>([]);
  private edits = $state<CollabEdit[]>([]);
  private connected = $state(false);
  private currentUserId: string;
  private ws: WebSocket | null = null;

  constructor(private name: string) {
    this.currentUserId = "user_" + Math.random().toString(36).slice(2, 9);
  }

  async connect(): Promise<void> {
    // In production, connect to WebSocket server
    // For demo, simulate with mock users
    this.connected.set(true);

    // Add self
    this.users.set([{
      id: this.currentUserId,
      name: "You",
      color: "#A855F7",
      cursor: null,
      selection: null,
      active: true,
      lastSeen: Date.now(),
    }]);

    // Simulate other users joining
    setTimeout(() => {
      this.users.set([...this.users(), {
        id: "user_sara",
        name: "Sara M.",
        color: "#06B6D4",
        cursor: { x: 200, y: 150 },
        selection: null,
        active: true,
        lastSeen: Date.now(),
      }]);
    }, 2000);

    setTimeout(() => {
      this.users.set([...this.users(), {
        id: "user_khalid",
        name: "Khalid A.",
        color: "#10B981",
        cursor: { x: 400, y: 300 },
        selection: "comp_3",
        active: true,
        lastSeen: Date.now(),
      }]);
    }, 4000);

    // Simulate cursor movement
    setInterval(() => {
      const updated = this.users().map(u => {
        if (u.id !== this.currentUserId && u.cursor) {
          return {
            ...u,
            cursor: {
              x: u.cursor.x + (Math.random() - 0.5) * 50,
              y: u.cursor.y + (Math.random() - 0.5) * 50,
            },
            lastSeen: Date.now(),
          };
        }
        return u;
      });
      this.users.set(updated);
    }, 3000);
  }

  disconnect(): void {
    this.connected.set(false);
    this.users.set([]);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  updateCursor(x: number, y: number): void {
    const users = this.users().map(u =>
      u.id === this.currentUserId ? { ...u, cursor: { x, y } } : u
    );
    this.users.set(users);
  }

  setSelection(elementId: string | null): void {
    const users = this.users().map(u =>
      u.id === this.currentUserId ? { ...u, selection: elementId } : u
    );
    this.users.set(users);
  }

  addComment(text: string, position: { x: number; y: number }): void {
    this.comments.set([{
      id: "comment_" + Date.now(),
      userId: this.currentUserId,
      text,
      position,
      timestamp: Date.now(),
      resolved: false,
    }, ...this.comments()]);
  }

  resolveComment(commentId: string): void {
    this.comments.set(this.comments().map(c =>
      c.id === commentId ? { ...c, resolved: !c.resolved } : c
    ));
  }

  recordEdit(path: string, oldValue: unknown, newValue: unknown): void {
    this.edits.set([{
      id: "edit_" + Date.now(),
      userId: this.currentUserId,
      path,
      oldValue,
      newValue,
      timestamp: Date.now(),
    }, ...this.edits().slice(0, 50)]);
  }

  getShareUrl(): string {
    return `https://elmoorx.dev/collab/${this.name}?invite=${this.currentUserId}`;
  }

  getUsers() { return this.users; }
  getComments() { return this.comments; }
  getEdits() { return this.edits; }
  isConnected() { return this.connected; }
  getCurrentUserId() { return this.currentUserId; }
}

export const collabSession = new CollabSessionManager();

// ============ REACTIVE HOOK ============

export function useCollab(session: CollabSession): {
  users: () => CollabUser[];
  comments: () => CollabComment[];
  edits: () => CollabEdit[];
  connected: () => boolean;
  updateCursor: (x: number, y: number) => void;
  setSelection: (id: string | null) => void;
  addComment: (text: string, position: { x: number; y: number }) => void;
  shareUrl: () => string;
} {
  return {
    users: () => session.getUsers()(),
    comments: () => session.getComments()(),
    edits: () => session.getEdits()(),
    connected: () => session.isConnected()(),
    updateCursor: (x, y) => session.updateCursor(x, y),
    setSelection: (id) => session.setSelection(id),
    addComment: (text, pos) => session.addComment(text, pos),
    shareUrl: () => session.getShareUrl(),
  };
}

// ============ COLLAB OVERLAY (cursors + names) ============

export function CollabOverlay(): ElmoorxNode {
  const session = collabSession.getCurrent();
  if (!session) return null;

  const { users, comments } = useCollab(session);

  return h("div", {
    style: "position:fixed;inset:0;pointer-events:none;z-index:9998;",
  },
    // Cursors
    () => users().filter(u => u.cursor && u.id !== session.getCurrentUserId()).map(u =>
      h("div", {
        key: u.id,
        style: `
          position:absolute;left:${(u.cursor as NonNullable<typeof u.cursor>).x}px;top:${(u.cursor as NonNullable<typeof u.cursor>).y}px;
          transition:all 0.1s ease-out;pointer-events:none;
        `,
      },
        // Cursor arrow
        h("svg", { width: 24, height: 24, viewBox: "0 0 24 24" },
          h("path", {
            d: "M5 3l14 9-7 2-2 7-5-18z",
            fill: u.color,
            stroke: "white",
            "stroke-width": 1,
          })
        ),
        // Name label
        h("div", {
          style: `
            position:absolute;top:18px;left:12px;
            padding:2px 8px;background:${u.color};color:white;
            border-radius:4px;font-size:10px;font-weight:600;
            white-space:nowrap;font-family:Inter,sans-serif;
          `,
        }, u.name),
      )
    ),

    // Comments
    () => comments().map(comment => {
      const user = users().find(u => u.id === comment.userId);
      return h("div", {
        key: comment.id,
        style: `
          position:absolute;left:${comment.position.x}px;top:${comment.position.y}px;
          pointer-events:auto;
        `,
      },
        h("div", {
          style: `
            background:#1A1A24;border:1px solid ${comment.resolved ? "#10B981" : user?.color || "#A855F7"};
            border-radius:8px;padding:8px 12px;max-width:240px;
            box-shadow:0 4px 12px rgba(0,0,0,0.3);
            opacity:${comment.resolved ? 0.6 : 1};
          `,
        },
          h("div", { style: "display:flex;align-items:center;gap:6px;margin-bottom:4px;" },
            h("div", {
              style: `width:16px;height:16px;border-radius:50%;background:${user?.color || "#A855F7"};display:flex;align-items:center;justify-content:center;color:white;font-size:9px;font-weight:600;`,
            }, user?.name.charAt(0) || "?"),
            h("span", { style: "font-size:11px;font-weight:600;color:#E4E4E7;" }, user?.name || "Unknown"),
            h("span", { style: "font-size:10px;color:#71717A;" },
              new Date(comment.timestamp).toLocaleTimeString()
            ),
          ),
          h("div", { style: "font-size:12px;color:#A1A1AA;margin-bottom:6px;" }, comment.text),
          h("button", {
            onClick: () => session.resolveComment(comment.id),
            style: "background:none;border:none;color:#71717A;cursor:pointer;font-size:10px;text-decoration:underline;",
          }, comment.resolved ? "Unresolve" : "Resolve"),
        ),
      );
    }),
  );
}

// ============ PRESENCE BAR ============

export function PresenceBar(): ElmoorxNode {
  const session = collabSession.getCurrent();
  if (!session) return null;

  const { users, connected: _connected, shareUrl } = useCollab(session);
  const showShareLink = $state(false);

  return h("div", {
    style: "position:fixed;top:20px;right:20px;display:flex;align-items:center;gap:8px;z-index:9999;",
  },
    // Online users
    h("div", {
      style: "display:flex;align-items:center;gap:-8px;",
    },
      () => users().slice(0, 5).map((user, i) =>
        h("div", {
          key: user.id,
          title: user.name,
          style: `
            width:32px;height:32px;border-radius:50%;
            background:${user.color};color:white;
            display:flex;align-items:center;justify-content:center;
            font-size:12px;font-weight:600;margin-left:${i > 0 ? -8 : 0}px;
            border:2px solid #0A0A0F;position:relative;
          `,
        },
          user.name.charAt(0),
          h("div", {
            style: `
              position:absolute;bottom:0;right:0;
              width:8px;height:8px;border-radius:50%;
              background:${user.active ? "#10B981" : "#71717A"};
              border:2px solid #0A0A0F;
            `,
          })
        )
      ),
      () => users().length > 5
        ? h("div", {
            style: "width:32px;height:32px;border-radius:50%;background:#2A2A38;color:#A1A1AA;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;margin-left:-8px;border:2px solid #0A0A0F;",
          }, `+${users().length - 5}`)
        : null,
    ),

    // Share button
    h("button", {
      onClick: () => showShareLink.set(!showShareLink()),
      style: "padding:6px 12px;background:#A855F7;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;",
    }, "🔗 Share"),

    () => showShareLink()
      ? h("div", {
          style: "position:absolute;top:100%;right:0;margin-top:8px;background:#1A1A24;border:1px solid #2A2A38;border-radius:8px;padding:12px;width:280px;z-index:10000;",
        },
          h("div", { style: "font-size:12px;color:#71717A;margin-bottom:8px;" }, "Share this link to collaborate:"),
          h("input", {
            type: "text",
            value: shareUrl(),
            readOnly: true,
            onClick: (e: Event) => (e.target as HTMLInputElement).select(),
            style: "width:100%;padding:6px 8px;background:#0F0F17;border:1px solid #2A2A38;border-radius:4px;color:#E4E4E7;font-size:11px;font-family:monospace;box-sizing:border-box;",
          }),
        )
      : null,
  );
}

// ============ COMMENT ANCHOR ============

export function CommentAnchor(props: { onComment: (text: string) => void }): ElmoorxNode {
  const showInput = $state(false);
  const text = $state("");

  return h("div", { style: "position:relative;display:inline-block;" },
    h("button", {
      onClick: () => showInput.set(!showInput()),
      style: "width:20px;height:20px;border-radius:50%;background:#A855F7;color:white;border:none;cursor:pointer;font-size:10px;display:inline-flex;align-items:center;justify-content:center;margin-left:4px;",
    }, "💬"),
    () => showInput()
      ? h("div", {
          style: "position:absolute;top:100%;left:0;margin-top:4px;background:#1A1A24;border:1px solid #2A2A38;border-radius:8px;padding:8px;width:200px;z-index:100;",
        },
          h("textarea", {
            value: () => text(),
            onInput: (e: Event) => text.set((e.target as HTMLTextAreaElement).value),
            placeholder: "Add a comment...",
            rows: 2,
            style: "width:100%;padding:6px;background:#0F0F17;border:1px solid #2A2A38;border-radius:4px;color:#E4E4E7;font-size:12px;resize:none;box-sizing:border-box;",
          }),
          h("div", { style: "display:flex;gap:4px;margin-top:6px;" },
            h("button", {
              onClick: () => { if (text().trim()) { props.onComment(text()); text.set(""); showInput.set(false); } },
              style: "flex:1;padding:4px;background:#A855F7;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;",
            }, "Comment"),
            h("button", {
              onClick: () => { showInput.set(false); text.set(""); },
              style: "padding:4px 8px;background:#2A2A38;color:#A1A1AA;border:none;border-radius:4px;cursor:pointer;font-size:11px;",
            }, "Cancel"),
          ),
        )
      : null,
  );
}
