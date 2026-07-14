/**
 * @elmoorx/sdk — Auto-generated TypeScript SDK Client
 * ============================================
 * Full type-safe client for the Elmoorx API (24 endpoints).
 *
 *   import { ElmoorxClient } from "@elmoorx/sdk";
 *   const client = new ElmoorxClient({ baseUrl: "http://localhost:3001" });
 *   await client.auth.signUp({ email, password, name });
 *   const user = await client.auth.me();
 *   await client.emails.send({ to, subject, body });
 *   await client.payments.checkout({ amount, currency });
 */

// ============ TYPES ============

export interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  plan: "free" | "pro" | "enterprise";
  avatar?: string;
  oauthProvider?: string;
  createdAt: number;
  lastLogin?: number;
}

export interface Email {
  id: string;
  to: string;
  subject: string;
  body: string;
  from: string;
  status: "sent" | "failed";
  sentAt: number;
  provider: string;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  description: string;
  status: "succeeded" | "failed" | "pending";
  provider: string;
  createdAt: number;
}

export interface FileRecord {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  createdAt: number;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  status: "active" | "canceled";
  currentPeriodStart: number;
  currentPeriodEnd: number;
  createdAt: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  details: Record<string, unknown>;
  timestamp: number;
}

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  memory: string;
  stats: {
    users: number;
    emails: number;
    payments: number;
    auditLogs: number;
    wsClients: number;
    wsRooms: number;
  };
  features: {
    oauth: { google: boolean; github: boolean };
    stripe: boolean;
    smtp: boolean;
    websocket: boolean;
    ssr: boolean;
  };
  version: string;
}

export interface RealtimeStats {
  wsPort: number;
  wsUrl: string;
  connectedClients: number;
  activeRooms: number;
  rooms: { name: string; clients: number }[];
}

export interface AdminStats {
  users: number;
  emails: number;
  payments: number;
  files: number;
  subscriptions: number;
  auditLogs: number;
  revenue: number;
  wsClients: number;
  wsRooms: number;
  uptime: number;
  memory: number;
  features: Record<string, boolean>;
}

// ============ CLIENT ============

export interface ClientOptions {
  baseUrl?: string;
  token?: string;
  sessionCookie?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export class ElmoorxClient {
  private baseUrl: string;
  private token: string | null;
  private sessionCookie: string | null;
  private headers: Record<string, string>;
  private timeout: number;

  public auth: AuthAPI;
  public users: UsersAPI;
  public files: FilesAPI;
  public emails: EmailsAPI;
  public payments: PaymentsAPI;
  public subscriptions: SubscriptionsAPI;
  public realtime: RealtimeAPI;
  public audit: AuditAPI;
  public admin: AdminAPI;
  public system: SystemAPI;

  constructor(opts: ClientOptions = {}) {
    this.baseUrl = opts.baseUrl || "http://localhost:3001";
    this.token = opts.token || null;
    this.sessionCookie = opts.sessionCookie || null;
    this.headers = opts.headers || {};
    this.timeout = opts.timeout || 30000;

    this.auth = new AuthAPI(this);
    this.users = new UsersAPI(this);
    this.files = new FilesAPI(this);
    this.emails = new EmailsAPI(this);
    this.payments = new PaymentsAPI(this);
    this.subscriptions = new SubscriptionsAPI(this);
    this.realtime = new RealtimeAPI(this);
    this.audit = new AuditAPI(this);
    this.admin = new AdminAPI(this);
    this.system = new SystemAPI(this);
  }

  setToken(token: string): void {
    this.token = token;
  }

  setSession(cookie: string): void {
    this.sessionCookie = cookie;
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  async request<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.headers,
      ...(opts.headers as Record<string, string>),
    };

    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
    if (this.sessionCookie) headers["Cookie"] = `session=${this.sessionCookie}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        ...opts,
        headers,
        signal: controller.signal,
        credentials: "include",
      });

      clearTimeout(timeoutId);

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new ElmoorxAPIError(
          (data as { error?: string }).error || `HTTP ${res.status}`,
          res.status,
          data
        );
      }

      return data as T;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof ElmoorxAPIError) throw err;
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new ElmoorxAPIError("Request timeout", 408, {});
      }
      throw new ElmoorxAPIError(
        err instanceof Error ? err.message : "Network error",
        0,
        {}
      );
    }
  }

  async get<T = unknown>(path: string): Promise<T> {
    return this.request<T>(path, { method: "GET" });
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  async delete<T = unknown>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }

  // ============ WEBSOCKET ============

  connectWebSocket(room: string, user: { name: string; color?: string }): ElmoorxWebSocket {
    const wsUrl = this.baseUrl.replace("http", "ws").replace(`:${new URL(this.baseUrl).port}`, `:${parseInt(new URL(this.baseUrl).port) + 1}`);
    return new ElmoorxWebSocket(wsUrl, room, user);
  }
}

// ============ ERROR ============

export class ElmoorxAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public data: unknown
  ) {
    super(message);
    this.name = "ElmoorxAPIError";
  }
}

// ============ AUTH API ============

class AuthAPI {
  constructor(private client: ElmoorxClient) {}

  async signUp(email: string, password: string, name: string): Promise<{ user: User; token: string }> {
    const res = await this.client.post<{ user: User; token: string }>("/api/auth/signup", {
      email, password, name,
    });
    this.client.setToken(res.token);
    return res;
  }

  async signIn(email: string, password: string): Promise<{ user: User; token: string }> {
    const res = await this.client.post<{ user: User; token: string }>("/api/auth/signin", {
      email, password,
    });
    this.client.setToken(res.token);
    return res;
  }

  async signOut(): Promise<{ success: boolean }> {
    const res = await this.client.post<{ success: boolean }>("/api/auth/signout");
    this.client.token = null;
    this.client.sessionCookie = null;
    return res;
  }

  async me(): Promise<{ user: User }> {
    return this.client.get<{ user: User }>("/api/auth/me");
  }

  async oauthRedirect(provider: "google" | "github"): Promise<string> {
    // Returns the redirect URL
    return `${this.client.baseUrl}/api/auth/oauth/${provider}`;
  }
}

// ============ USERS API ============

class UsersAPI {
  constructor(private client: ElmoorxClient) {}

  async list(): Promise<{ users: User[]; count: number }> {
    return this.client.get("/api/users");
  }

  async update(updates: Partial<Pick<User, "name" | "plan">>): Promise<{ user: User }> {
    return this.client.patch("/api/users/me", updates);
  }
}

// ============ FILES API ============

class FilesAPI {
  constructor(private client: ElmoorxClient) {}

  async list(): Promise<{ files: FileRecord[]; count: number }> {
    return this.client.get("/api/files");
  }

  async upload(filename: string, content: string, contentType?: string): Promise<{ file: FileRecord }> {
    return this.client.post("/api/files/upload", {
      filename,
      content,
      contentType: contentType || "application/octet-stream",
    });
  }

  async uploadText(filename: string, text: string): Promise<{ file: FileRecord }> {
    return this.upload(filename, btoa(text), "text/plain");
  }

  async download(fileId: string): Promise<Blob> {
    const res = await fetch(`${this.client.baseUrl}/api/files/${fileId}`, {
      credentials: "include",
      headers: this.client.sessionCookie
        ? { Cookie: `session=${this.client.sessionCookie}` }
        : {},
    });
    if (!res.ok) throw new ElmoorxAPIError(`Download failed: ${res.status}`, res.status, {});
    return res.blob();
  }

  async delete(fileId: string): Promise<{ success: boolean }> {
    return this.client.delete(`/api/files/${fileId}`);
  }
}

// ============ EMAILS API ============

class EmailsAPI {
  constructor(private client: ElmoorxClient) {}

  async send(to: string, subject: string, body: string): Promise<{ email: Email }> {
    return this.client.post("/api/emails/send", { to, subject, body });
  }

  async list(): Promise<{ emails: Email[]; count: number }> {
    return this.client.get("/api/emails");
  }
}

// ============ PAYMENTS API ============

class PaymentsAPI {
  constructor(private client: ElmoorxClient) {}

  async checkout(amount: number, currency: string = "USD", description?: string): Promise<{ payment: Payment }> {
    return this.client.post("/api/payments/checkout", { amount, currency, description });
  }

  async list(): Promise<{ payments: Payment[]; count: number }> {
    return this.client.get("/api/payments");
  }
}

// ============ SUBSCRIPTIONS API ============

class SubscriptionsAPI {
  constructor(private client: ElmoorxClient) {}

  async create(planId: "free" | "pro" | "enterprise"): Promise<{ subscription: Subscription }> {
    return this.client.post("/api/subscriptions", { planId });
  }

  async list(): Promise<{ subscriptions: Subscription[]; current: string }> {
    return this.client.get("/api/subscriptions");
  }
}

// ============ REALTIME API ============

class RealtimeAPI {
  constructor(private client: ElmoorxClient) {}

  async stats(): Promise<RealtimeStats> {
    return this.client.get("/api/realtime/stats");
  }

  async broadcast(room: string, message: string): Promise<{ success: boolean; recipients: number }> {
    return this.client.post("/api/realtime/broadcast", { room, message });
  }
}

// ============ AUDIT API ============

class AuditAPI {
  constructor(private client: ElmoorxClient) {}

  async logs(): Promise<{ logs: AuditLog[]; count: number }> {
    return this.client.get("/api/audit-logs");
  }
}

// ============ ADMIN API ============

class AdminAPI {
  constructor(private client: ElmoorxClient) {}

  async stats(): Promise<AdminStats> {
    return this.client.get("/api/admin/stats");
  }
}

// ============ SYSTEM API ============

class SystemAPI {
  constructor(private client: ElmoorxClient) {}

  async health(): Promise<HealthStatus> {
    return this.client.get("/api/health");
  }

  async docs(): Promise<Record<string, unknown>> {
    return this.client.get("/api/docs");
  }
}

// ============ WEBSOCKET CLIENT ============

export class ElmoorxWebSocket {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<(data: unknown) => void>>();

  constructor(
    private url: string,
    private room: string,
    private user: { name: string; color?: string }
  ) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.send({ type: "join", room: this.room, user: this.user });
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.emit(msg.type, msg);
        } catch {}
      };

      this.ws.onerror = (err) => reject(err);

      this.ws.onclose = () => {
        this.emit("close", {});
      };
    });
  }

  send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  sendMessage(text: string): void {
    this.send({ type: "message", room: this.room, text });
  }

  sendCursor(x: number, y: number): void {
    this.send({ type: "cursor", room: this.room, x, y });
  }

  sendEdit(docId: string, editType: "insert" | "delete", position: number, content: string): void {
    this.send({ type: "edit", room: this.room, docId, editType, position, content });
  }

  sendTyping(isTyping: boolean): void {
    this.send({ type: "typing", room: this.room, isTyping });
  }

  on(event: string, handler: (data: unknown) => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach(h => h(data));
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// ============ FACTORY ============

export function createClient(opts?: ClientOptions): ElmoorxClient {
  return new ElmoorxClient(opts);
}
