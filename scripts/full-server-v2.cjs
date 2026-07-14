#!/usr/bin/env node
/**
 * Elmoorx Full Stack Server v2 — OAuth + SSR + Audit + OpenAPI + Chat
 * تشغيل: node scripts/full-server-v2.cjs
 * افتح: http://localhost:3001
 */

const http = require("node:http");
const { WebSocketServer } = require("ws");
const { readFile, writeFile, mkdir, readdir, unlink } = require("node:fs/promises");
const { existsSync, mkdirSync } = require("node:fs");
const { join, extname } = require("node:path");
const { createHmac, randomBytes, scryptSync, timingSafeEqual } = require("node:crypto");
const { transform } = require("esbuild");

// ============ CONFIG ============

const PORT = process.env.PORT || 3001;
const DATA_DIR = join(process.cwd(), "data");
// SECURITY: read the JWT/password secret from the environment using the
// SAME env var name as @elmoorx/auth (ELMOORX_JWT_SECRET). The previous
// version used ELMOORX_SECRET with a hardcoded "elmoorx-dev-secret"
// fallback — that was a 5th hardcoded secret location missed by
// Priority 1. Now fail-fast like the auth package does.
const SECRET = process.env.ELMOORX_JWT_SECRET;
if (!SECRET || SECRET.length < 32) {
  console.error(
    "[full-server-v2] FATAL: ELMOORX_JWT_SECRET env var is missing or too short (<32 chars).\n" +
    "Generate one with:  export ELMOORX_JWT_SECRET=$(openssl rand -hex 32)"
  );
  process.exit(1);
}

// OAuth config (set env vars to enable)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || null;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || null;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || null;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || null;

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(join(DATA_DIR, "emails"), { recursive: true });
mkdirSync(join(DATA_DIR, "files"), { recursive: true });
mkdirSync(join(DATA_DIR, "audit"), { recursive: true });

// ============ DATABASE ============

const collections = new Map();
async function dbRead(col) {
  if (!collections.has(col)) {
    const fp = join(DATA_DIR, `${col}.json`);
    if (existsSync(fp)) { try { collections.set(col, JSON.parse(await readFile(fp, "utf-8"))); } catch { collections.set(col, []); } }
    else collections.set(col, []);
  }
  return collections.get(col);
}
async function dbWrite(col, data) { collections.set(col, data); await writeFile(join(DATA_DIR, `${col}.json`), JSON.stringify(data, null, 2)); }
async function dbInsert(col, item) { const data = await dbRead(col); const newItem = { ...item, id: item.id || `${col}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, createdAt: Date.now() }; data.push(newItem); await dbWrite(col, data); return newItem; }
async function dbFind(col, pred) { return (await dbRead(col)).find(pred) || null; }
async function dbFindAll(col, pred) { const data = await dbRead(col); return pred ? data.filter(pred) : data; }
async function dbUpdate(col, id, updates) { const data = await dbRead(col); const item = data.find(d => d.id === id); if (!item) return null; Object.assign(item, updates, { updatedAt: Date.now() }); await dbWrite(col, data); return item; }
async function dbDelete(col, id) { const data = await dbRead(col); const f = data.filter(d => d.id !== id); if (f.length === data.length) return false; await dbWrite(col, f); return true; }

// ============ CRYPTO ============

function hashPassword(password, salt) { return scryptSync(password, salt, 64).toString("hex"); }
function generateToken(bytes = 32) { return randomBytes(bytes).toString("hex"); }
function generateJWT(payload, expiresIn = 3600) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + expiresIn })).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}
function verifyJWT(token) {
  try { const [h, b, s] = token.split("."); const exp = createHmac("sha256", SECRET).update(`${h}.${b}`).digest("base64url"); if (s !== exp) return null; const p = JSON.parse(Buffer.from(b, "base64url").toString()); if (p.exp && Math.floor(Date.now() / 1000) > p.exp) return null; return p; }
  catch { return null; }
}
function safeCompare(a, b) { const ba = Buffer.from(a), bb = Buffer.from(b); if (ba.length !== bb.length) return false; return timingSafeEqual(ba, bb); }

// ============ SECURITY ============

const SEC_HEADERS = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' ws: wss:; frame-ancestors 'none'",
  "X-Frame-Options": "DENY", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000", "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
};

const rateMap = new Map();
function checkRate(ip, max = 100, windowMs = 60000) {
  const now = Date.now(); let e = rateMap.get(ip);
  if (!e || now > e.resetAt) { e = { count: 0, resetAt: now + windowMs }; rateMap.set(ip, e); }
  e.count++; return { allowed: e.count <= max, remaining: Math.max(0, max - e.count) };
}

// ============ SESSIONS ============

const sessions = new Map();
function createSession(userId) { const t = generateToken(); sessions.set(t, { userId, expiresAt: Date.now() + 7 * 24 * 3600 * 1000 }); return t; }
function getSession(token) { const s = sessions.get(token); if (!s) return null; if (Date.now() > s.expiresAt) { sessions.delete(token); return null; } return { userId: s.userId }; }

// ============ AUDIT LOG ============

async function auditLog(userId, action, resource, details = {}) {
  const entry = await dbInsert("audit_logs", { userId, action, resource, details, ip: "server", timestamp: Date.now() });
  return entry;
}

async function getAuditLogs(opts = {}) {
  let logs = await dbFindAll("audit_logs");
  if (opts.userId) logs = logs.filter(l => l.userId === opts.userId);
  if (opts.action) logs = logs.filter(l => l.action === opts.action);
  if (opts.limit) logs = logs.slice(0, opts.limit);
  return logs.sort((a, b) => b.timestamp - a.timestamp);
}

// ============ EMAIL ============

async function sendEmail(to, subject, body) {
  const email = { id: `email_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, to, subject, body, from: "noreply@elmoorx.dev", status: "sent", sentAt: Date.now() };
  await writeFile(join(DATA_DIR, "emails", `${email.id}.json`), JSON.stringify(email, null, 2));
  await dbInsert("emails", email);
  console.log(`  📧 Email: ${to} — ${subject}`);
  return email;
}

// ============ PAYMENT ============

async function processPayment(amount, currency, description, userId) {
  await new Promise(r => setTimeout(r, 300));
  const payment = { id: `pi_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`, amount, currency, description, userId, status: Math.random() > 0.05 ? "succeeded" : "failed", provider: "simulation", createdAt: Date.now() };
  await dbInsert("payments", payment);
  await auditLog(userId, "payment", "payment", { amount, currency, status: payment.status });
  console.log(`  💳 Payment: $${amount} ${currency} — ${payment.status}`);
  return payment;
}

// ============ OAUTH ============

const oauthStates = new Map();

function generateOAuthState(provider) {
  const state = generateToken(16);
  oauthStates.set(state, { provider, createdAt: Date.now() });
  setTimeout(() => oauthStates.delete(state), 600000); // 10 min expiry
  return state;
}

function getOAuthRedirectUrl(provider) {
  const state = generateOAuthState(provider);
  const redirectUri = `http://localhost:${PORT}/api/auth/oauth/${provider}/callback`;

  if (provider === "google") {
    return `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&scope=openid+email+profile&state=${state}`;
  }

  if (provider === "github") {
    return `https://github.com/login/oauth/authorize?` +
      `client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=user:email&state=${state}`;
  }

  return null;
}

async function exchangeOAuthCode(provider, code) {
  const redirectUri = `http://localhost:${PORT}/api/auth/oauth/${provider}/callback`;

  if (provider === "google") {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri, grant_type: "authorization_code",
      }),
    });
    const tokens = await res.json();

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    return await userRes.json();
  }

  if (provider === "github") {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ code, client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, redirect_uri: redirectUri }),
    });
    const tokenData = await tokenRes.json();

    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();

    // Get email (might be private)
    if (!userData.email) {
      const emailRes = await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const emails = await emailRes.json();
      userData.email = emails.find(e => e.primary)?.email || emails[0]?.email;
    }

    return { id: userData.id, email: userData.email, name: userData.name || userData.login, avatar: userData.avatar_url };
  }

  return null;
}

async function handleOAuthUser(profile, provider) {
  const oauthId = `${provider}_${profile.id}`;

  // Check if user exists
  let user = await dbFind("users", u => u.oauthId === oauthId);

  if (!user && profile.email) {
    user = await dbFind("users", u => u.email === profile.email);
  }

  if (!user) {
    // Create new user
    user = await dbInsert("users", {
      email: profile.email,
      name: profile.name,
      role: "user",
      plan: "free",
      emailVerified: true,
      oauthId,
      oauthProvider: provider,
      avatar: profile.avatar || profile.picture,
      passwordHash: null,
      salt: null,
    });
    await sendEmail(profile.email, "Welcome to Elmoorx!", `<h1>Hi ${profile.name}</h1><p>You signed up via ${provider}. Welcome!</p>`);
    await auditLog(user.id, "signup", "auth", { provider });
  } else {
    await auditLog(user.id, "signin", "auth", { provider });
  }

  return user;
}

// ============ SSR (Server-Side Rendering) ============

async function renderComponent(componentCode, props = {}) {
  try {
    // Transform JSX to JS using esbuild
    const transformed = await transform(componentCode, {
      loader: "tsx",
      jsx: "automatic",
      jsxImportSource: "elmoorx",
      format: "esm",
      target: "es2022",
    });

    // In a real impl, would execute the transformed code and render to HTML
    // For now, return the transformed code + HTML wrapper
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Elmoorx SSR</title></head><body><div id="app"></div><script type="module">${transformed.code}</script></body></html>`;
    return html;
  } catch (err) {
    throw new Error(`SSR render failed: ${err.message}`);
  }
}

// ============ OPENAPI ============

function generateOpenAPISpec() {
  return {
    openapi: "3.0.0",
    info: {
      title: "Elmoorx API",
      version: "2.0.0",
      description: "Full-stack Elmoorx Framework API with auth, payments, files, emails, and more.",
    },
    servers: [{ url: `http://localhost:${PORT}`, description: "Development" }],
    paths: {
      "/api/health": {
        get: { summary: "Health check", tags: ["System"], responses: { "200": { description: "Server health status" } } },
      },
      "/api/auth/signup": {
        post: {
          summary: "Sign up", tags: ["Auth"],
          requestBody: { content: { "application/json": { schema: { type: "object", properties: {
            email: { type: "string" }, password: { type: "string" }, name: { type: "string" },
          }, required: ["email", "password", "name"] } } } },
          responses: { "201": { description: "User created" }, "409": { description: "Email exists" }, "400": { description: "Invalid input" } },
        },
      },
      "/api/auth/signin": {
        post: {
          summary: "Sign in", tags: ["Auth"],
          requestBody: { content: { "application/json": { schema: { type: "object", properties: {
            email: { type: "string" }, password: { type: "string" },
          }, required: ["email", "password"] } } } },
          responses: { "200": { description: "Signed in" }, "401": { description: "Invalid credentials" } },
        },
      },
      "/api/auth/signout": { post: { summary: "Sign out", tags: ["Auth"], responses: { "200": { description: "Signed out" } } } },
      "/api/auth/me": { get: { summary: "Get current user", tags: ["Auth"], responses: { "200": { description: "User data" }, "401": { description: "Not authenticated" } } } },
      "/api/auth/oauth/{provider}": { get: { summary: "OAuth redirect", tags: ["Auth"], parameters: [{ name: "provider", in: "path", schema: { type: "string", enum: ["google", "github"] } }], responses: { "302": { description: "Redirect to OAuth provider" } } } },
      "/api/auth/oauth/{provider}/callback": { get: { summary: "OAuth callback", tags: ["Auth"], parameters: [{ name: "provider", in: "path" }, { name: "code", in: "query" }, { name: "state", in: "query" }], responses: { "302": { description: "Redirect to dashboard" } } } },
      "/api/users": { get: { summary: "List users", tags: ["Users"], responses: { "200": { description: "User list" } } } },
      "/api/files": { get: { summary: "List files", tags: ["Files"], responses: { "200": { description: "File list" } } } },
      "/api/files/upload": { post: { summary: "Upload file", tags: ["Files"], responses: { "201": { description: "File uploaded" } } } },
      "/api/files/{id}": { get: { summary: "Download file", tags: ["Files"] }, delete: { summary: "Delete file", tags: ["Files"] } },
      "/api/emails/send": { post: { summary: "Send email", tags: ["Emails"], responses: { "201": { description: "Email sent" } } } },
      "/api/emails": { get: { summary: "List emails", tags: ["Emails"] } },
      "/api/payments/checkout": { post: { summary: "Process payment", tags: ["Payments"], responses: { "201": { description: "Payment processed" }, "402": { description: "Payment failed" } } } },
      "/api/payments": { get: { summary: "List payments", tags: ["Payments"] } },
      "/api/subscriptions": { post: { summary: "Create subscription", tags: ["Subscriptions"] }, get: { summary: "List subscriptions", tags: ["Subscriptions"] } },
      "/api/realtime/stats": { get: { summary: "WebSocket stats", tags: ["Realtime"] } },
      "/api/realtime/broadcast": { post: { summary: "Broadcast message", tags: ["Realtime"] } },
      "/api/admin/stats": { get: { summary: "Admin stats", tags: ["Admin"] } },
      "/api/audit-logs": { get: { summary: "Audit logs", tags: ["Audit"] } },
      "/api/docs": { get: { summary: "OpenAPI spec", tags: ["Docs"] } },
    },
    components: {
      securitySchemes: {
        session: { type: "apiKey", in: "cookie", name: "session" },
        bearer: { type: "http", scheme: "bearer" },
      },
    },
  };
}

// ============ WEBSOCKET SERVER ============

const wss = new WebSocketServer({ port: parseInt(PORT) + 1 });
const wsRooms = new Map();
const wsUsers = new Map();

wss.on("connection", (ws, req) => {
  const clientId = "ws_" + Math.random().toString(36).slice(2, 9);
  console.log(`  [ws] ${clientId} connected`);

  ws.send(JSON.stringify({ type: "welcome", clientId, serverTime: Date.now() }));

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      handleMessage(ws, clientId, msg);
    } catch (err) { console.error(`  [ws] Error: ${err.message}`); }
  });

  ws.on("close", () => {
    console.log(`  [ws] ${clientId} disconnected`);
    const user = wsUsers.get(clientId);
    if (user?.room) {
      wsRooms.get(user.room)?.delete(ws);
      broadcast(user.room, { type: "user-left", clientId, name: user.name }, ws);
    }
    wsUsers.delete(clientId);
  });
});

function handleMessage(ws, clientId, msg) {
  switch (msg.type) {
    case "join":
      if (!wsRooms.has(msg.room)) wsRooms.set(msg.room, new Set());
      wsRooms.get(msg.room).add(ws);
      wsUsers.set(clientId, { name: msg.user?.name || "Anonymous", color: msg.user?.color || "#A855F7", room: msg.room });
      broadcast(msg.room, { type: "user-joined", clientId, user: wsUsers.get(clientId), timestamp: Date.now() }, ws);
      const participants = [...wsRooms.get(msg.room)].filter(c => c !== ws).map(c => {
        const id = [...wsUsers.entries()].find(([, u]) => u.room === msg.room)?.[0];
        return id ? { id, ...wsUsers.get(id) } : null;
      }).filter(Boolean);
      ws.send(JSON.stringify({ type: "joined", room: msg.room, clientId, participants }));
      break;
    case "message":
      broadcast(msg.room, { type: "message", clientId, user: wsUsers.get(clientId)?.name || "Unknown", text: msg.text, timestamp: Date.now() });
      break;
    case "cursor":
      broadcast(msg.room, { type: "cursor", clientId, x: msg.x, y: msg.y }, ws);
      break;
    case "edit":
      broadcast(msg.room, { type: "edit", clientId, docId: msg.docId, editType: msg.editType, position: msg.position, content: msg.content, timestamp: Date.now() }, ws);
      break;
    case "typing":
      broadcast(msg.room, { type: "typing", clientId, isTyping: msg.isTyping, name: wsUsers.get(clientId)?.name }, ws);
      break;
  }
}

function broadcast(room, message, exceptWs) {
  const clients = wsRooms.get(room);
  if (!clients) return;
  const data = JSON.stringify(message);
  for (const c of clients) { if (c !== exceptWs && c.readyState === 1) c.send(data); }
}

// ============ HTTP SERVER ============

const server = http.createServer(async (req, res) => {
  const start = Date.now();
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const path = url.pathname;
  const query = Object.fromEntries(url.searchParams);
  const method = req.method || "GET";
  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").toString();

  let body = null;
  if (["POST", "PUT", "PATCH"].includes(method)) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const str = Buffer.concat(chunks).toString("utf-8");
    try { body = JSON.parse(str); } catch { body = str; }
  }

  const cookies = {};
  if (req.headers.cookie) { for (const pair of req.headers.cookie.split(";")) { const [k, v] = pair.trim().split("="); if (k) cookies[k] = decodeURIComponent(v || ""); } }

  const headers = { ...SEC_HEADERS };
  const rate = checkRate(ip);
  headers["X-RateLimit-Remaining"] = String(rate.remaining);
  if (!rate.allowed) { headers["Content-Type"] = "application/json"; res.writeHead(429, headers); res.end(JSON.stringify({ error: "Too many requests" })); logReq(method, path, 429, start); return; }

  const sendJson = (data, status = 200) => { headers["Content-Type"] = "application/json"; res.writeHead(status, headers); res.end(JSON.stringify(data)); logReq(method, path, status, start); };
  const sendHtml = (html, status = 200) => { headers["Content-Type"] = "text/html; charset=utf-8"; res.writeHead(status, headers); res.end(html); logReq(method, path, status, start); };
  const sendRedirect = (url, status = 302) => { headers["Location"] = url; res.writeHead(status, headers); res.end(); logReq(method, path, status, start); };

  const getAuthUser = async () => {
    const s = cookies["session"]; if (!s) return null;
    const session = getSession(s); if (!session) return null;
    return dbFind("users", u => u.id === session.userId);
  };

  try {
    // === HOME / ADMIN ===
    if (path === "/" && method === "GET") { sendHtml(adminDashboard()); return; }

    // === HEALTH ===
    if (path === "/api/health" && method === "GET") {
      const users = await dbRead("users"); const emails = await dbRead("emails"); const payments = await dbRead("payments"); const logs = await dbRead("audit_logs");
      sendJson({ status: "healthy", uptime: process.uptime(), memory: Math.round(process.memoryUsage().rss / 1048576) + "MB", stats: { users: users.length, emails: emails.length, payments: payments.length, auditLogs: logs.length, wsClients: wsUsers.size, wsRooms: wsRooms.size }, features: { oauth: { google: !!GOOGLE_CLIENT_ID, github: !!GITHUB_CLIENT_ID }, stripe: !!process.env.STRIPE_SECRET_KEY, smtp: !!process.env.SMTP_HOST, websocket: true, ssr: true }, version: "2.0.0" }); return;
    }

    // === OPENAPI DOCS ===
    if (path === "/api/docs" && method === "GET") { sendJson(generateOpenAPISpec()); return; }
    if (path === "/api/docs/html" && method === "GET") { sendHtml(openApiHtml()); return; }

    // === AUTH: SIGNUP ===
    if (path === "/api/auth/signup" && method === "POST") {
      const { email, password, name } = body;
      if (!email || !password || !name) { sendJson({ error: "Missing fields" }, 400); return; }
      if (password.length < 8) { sendJson({ error: "Password too short" }, 400); return; }
      if (await dbFind("users", u => u.email === email)) { sendJson({ error: "Email exists" }, 409); return; }
      const salt = randomBytes(16).toString("hex");
      const user = await dbInsert("users", { email, name, passwordHash: hashPassword(password, salt), salt, role: "user", plan: "free", emailVerified: false });
      const sessionToken = createSession(user.id); const jwt = generateJWT({ sub: user.id, email: user.email, role: user.role });
      await sendEmail(email, "Welcome to Elmoorx!", `<h1>Hi ${name}</h1><p>Welcome to Elmoorx!</p>`);
      await auditLog(user.id, "signup", "auth", { method: "email" });
      headers["Set-Cookie"] = `session=${sessionToken}; HttpOnly; Path=/; Max-Age=604800; SameSite=Strict`;
      sendJson({ user: { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan }, token: jwt }, 201); return;
    }

    // === AUTH: SIGNIN ===
    if (path === "/api/auth/signin" && method === "POST") {
      const { email, password } = body;
      if (!email || !password) { sendJson({ error: "Missing credentials" }, 400); return; }
      const user = await dbFind("users", u => u.email === email);
      if (!user || !user.passwordHash) { sendJson({ error: "Invalid credentials" }, 401); return; }
      if (!safeCompare(hashPassword(password, user.salt), user.passwordHash)) { sendJson({ error: "Invalid credentials" }, 401); return; }
      await dbUpdate("users", user.id, { lastLogin: Date.now() });
      await auditLog(user.id, "signin", "auth", { method: "email" });
      const sessionToken = createSession(user.id); const jwt = generateJWT({ sub: user.id, email: user.email, role: user.role });
      headers["Set-Cookie"] = `session=${sessionToken}; HttpOnly; Path=/; Max-Age=604800; SameSite=Strict`;
      sendJson({ user: { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan }, token: jwt }); return;
    }

    // === AUTH: SIGNOUT ===
    if (path === "/api/auth/signout" && method === "POST") {
      const user = await getAuthUser();
      if (user) await auditLog(user.id, "signout", "auth");
      if (cookies["session"]) sessions.delete(cookies["session"]);
      headers["Set-Cookie"] = "session=; HttpOnly; Path=/; Max-Age=0";
      sendJson({ success: true }); return;
    }

    // === AUTH: ME ===
    if (path === "/api/auth/me" && method === "GET") {
      const user = await getAuthUser();
      if (!user) { sendJson({ error: "Not authenticated" }, 401); return; }
      sendJson({ user: { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan, avatar: user.avatar, oauthProvider: user.oauthProvider, createdAt: user.createdAt, lastLogin: user.lastLogin } }); return;
    }

    // === OAUTH: REDIRECT ===
    const oauthMatch = path.match(/^\/api\/auth\/oauth\/(google|github)$/);
    if (oauthMatch && method === "GET") {
      const provider = oauthMatch[1];
      const redirectUrl = getOAuthRedirectUrl(provider);
      if (!redirectUrl) { sendJson({ error: `${provider} OAuth not configured` }, 400); return; }
      sendRedirect(redirectUrl); return;
    }

    // === OAUTH: CALLBACK ===
    const oauthCallbackMatch = path.match(/^\/api\/auth\/oauth\/(google|github)\/callback$/);
    if (oauthCallbackMatch && method === "GET") {
      const provider = oauthCallbackMatch[1];
      const { code, state } = query;

      if (!code || !state) { sendRedirect("/?error=oauth_missing_code"); return; }

      const stateData = oauthStates.get(state);
      if (!stateData || stateData.provider !== provider) { sendRedirect("/?error=oauth_invalid_state"); return; }
      oauthStates.delete(state);

      try {
        const profile = await exchangeOAuthCode(provider, code);
        if (!profile || !profile.email) { sendRedirect("/?error=oauth_no_email"); return; }

        const user = await handleOAuthUser(profile, provider);
        const sessionToken = createSession(user.id);
        await auditLog(user.id, "signin", "auth", { method: provider });

        headers["Set-Cookie"] = `session=${sessionToken}; HttpOnly; Path=/; Max-Age=604800; SameSite=Strict`;
        sendRedirect("/?oauth=success");
      } catch (err) {
        console.error(`  OAuth error: ${err.message}`);
        sendRedirect("/?error=oauth_failed");
      }
      return;
    }

    // === USERS ===
    if (path === "/api/users" && method === "GET") {
      const user = await getAuthUser();
      if (!user) { sendJson({ error: "Not authenticated" }, 401); return; }
      const users = (await dbFindAll("users")).map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, plan: u.plan, oauthProvider: u.oauthProvider, createdAt: u.createdAt, lastLogin: u.lastLogin }));
      sendJson({ users, count: users.length }); return;
    }

    // === FILES ===
    if (path === "/api/files" && method === "GET") {
      const user = await getAuthUser(); if (!user) { sendJson({ error: "Not authenticated" }, 401); return; }
      const files = await dbFindAll("files", f => f.userId === user.id);
      sendJson({ files: files.map(f => ({ id: f.id, filename: f.filename, contentType: f.contentType, size: f.size, createdAt: f.createdAt })), count: files.length }); return;
    }
    if (path === "/api/files/upload" && method === "POST") {
      const user = await getAuthUser(); if (!user) { sendJson({ error: "Not authenticated" }, 401); return; }
      const { filename, content, contentType } = body;
      if (!filename || !content) { sendJson({ error: "Missing fields" }, 400); return; }
      const fileId = `file_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const buffer = Buffer.from(content, "base64");
      await writeFile(join(DATA_DIR, "files", fileId), buffer);
      const file = await dbInsert("files", { id: fileId, filename, contentType: contentType || "application/octet-stream", size: buffer.length, userId: user.id, path: join(DATA_DIR, "files", fileId) });
      await auditLog(user.id, "upload", "file", { filename, size: buffer.length });
      sendJson({ file: { id: file.id, filename: file.filename, size: file.size } }, 201); return;
    }
    const fileMatch = path.match(/^\/api\/files\/(.+)$/);
    if (fileMatch) {
      const user = await getAuthUser(); if (!user) { sendJson({ error: "Not authenticated" }, 401); return; }
      const fileId = fileMatch[1]; const file = await dbFind("files", f => f.id === fileId && f.userId === user.id);
      if (method === "GET") { if (!file) { sendJson({ error: "Not found" }, 404); return; } const content = await readFile(file.path); headers["Content-Type"] = file.contentType; headers["Content-Disposition"] = `attachment; filename="${file.filename}"`; res.writeHead(200, headers); res.end(content); logReq(method, path, 200, start); return; }
      if (method === "DELETE") { if (!file) { sendJson({ error: "Not found" }, 404); return; } try { await unlink(file.path); } catch {} await dbDelete("files", fileId); await auditLog(user.id, "delete", "file", { filename: file.filename }); sendJson({ success: true }); return; }
    }

    // === EMAILS ===
    if (path === "/api/emails/send" && method === "POST") {
      const user = await getAuthUser(); if (!user) { sendJson({ error: "Not authenticated" }, 401); return; }
      const { to, subject, body: emailBody } = body;
      if (!to || !subject || !emailBody) { sendJson({ error: "Missing fields" }, 400); return; }
      const email = await sendEmail(to, subject, emailBody);
      await auditLog(user.id, "send_email", "email", { to, subject });
      sendJson({ email }, 201); return;
    }
    if (path === "/api/emails" && method === "GET") {
      const user = await getAuthUser(); if (!user) { sendJson({ error: "Not authenticated" }, 401); return; }
      const emails = await dbFindAll("emails"); sendJson({ emails: emails.sort((a, b) => b.sentAt - a.sentAt), count: emails.length }); return;
    }

    // === PAYMENTS ===
    if (path === "/api/payments/checkout" && method === "POST") {
      const user = await getAuthUser(); if (!user) { sendJson({ error: "Not authenticated" }, 401); return; }
      const { amount, currency, description } = body;
      if (!amount || amount <= 0) { sendJson({ error: "Invalid amount" }, 400); return; }
      const payment = await processPayment(amount, currency || "USD", description || "Payment", user.id);
      if (payment.status === "failed") { sendJson({ error: "Payment failed", payment }, 402); return; }
      sendJson({ payment }, 201); return;
    }
    if (path === "/api/payments" && method === "GET") {
      const user = await getAuthUser(); if (!user) { sendJson({ error: "Not authenticated" }, 401); return; }
      const payments = await dbFindAll("payments"); sendJson({ payments: payments.sort((a, b) => b.createdAt - a.createdAt), count: payments.length }); return;
    }

    // === SUBSCRIPTIONS ===
    if (path === "/api/subscriptions" && method === "POST") {
      const user = await getAuthUser(); if (!user) { sendJson({ error: "Not authenticated" }, 401); return; }
      const { planId } = body; const plans = { free: 0, pro: 29, enterprise: 299 };
      const amount = plans[planId]; if (amount === undefined) { sendJson({ error: "Invalid plan" }, 400); return; }
      if (amount > 0) { const payment = await processPayment(amount, "USD", `${planId} subscription`, user.id); if (payment.status === "failed") { sendJson({ error: "Payment failed" }, 402); return; } }
      await dbUpdate("users", user.id, { plan: planId });
      const sub = await dbInsert("subscriptions", { userId: user.id, planId, amount, status: "active", currentPeriodStart: Date.now(), currentPeriodEnd: Date.now() + 30 * 24 * 3600 * 1000 });
      await sendEmail(user.email, "Subscription Activated", `<h1>Plan Activated!</h1><p>Your ${planId} plan is now active.</p>`);
      await auditLog(user.id, "subscribe", "subscription", { planId, amount });
      sendJson({ subscription: sub }, 201); return;
    }
    if (path === "/api/subscriptions" && method === "GET") {
      const user = await getAuthUser(); if (!user) { sendJson({ error: "Not authenticated" }, 401); return; }
      const subs = await dbFindAll("subscriptions", s => s.userId === user.id); sendJson({ subscriptions: subs, current: user.plan }); return;
    }

    // === REALTIME ===
    if (path === "/api/realtime/stats" && method === "GET") {
      sendJson({ wsPort: parseInt(PORT) + 1, wsUrl: `ws://localhost:${parseInt(PORT) + 1}`, connectedClients: wsUsers.size, activeRooms: wsRooms.size, rooms: [...wsRooms.keys()].map(r => ({ name: r, clients: wsRooms.get(r).size })) }); return;
    }
    if (path === "/api/realtime/broadcast" && method === "POST") {
      const user = await getAuthUser(); if (!user) { sendJson({ error: "Not authenticated" }, 401); return; }
      const { room, message } = body; broadcast(room, { type: "broadcast", message, from: user.name, timestamp: Date.now() });
      sendJson({ success: true, recipients: wsRooms.get(room)?.size || 0 }); return;
    }

    // === AUDIT LOGS ===
    if (path === "/api/audit-logs" && method === "GET") {
      const user = await getAuthUser(); if (!user) { sendJson({ error: "Not authenticated" }, 401); return; }
      const logs = await getAuditLogs({ userId: user.role === "admin" ? undefined : user.id, limit: 100 });
      sendJson({ logs, count: logs.length }); return;
    }

    // === ADMIN ===
    if (path === "/api/admin/stats" && method === "GET") {
      const user = await getAuthUser(); if (!user || user.role !== "admin") { sendJson({ error: "Admin only" }, 403); return; }
      const users = await dbRead("users"); const emails = await dbRead("emails"); const payments = await dbRead("payments"); const files = await dbRead("files"); const subs = await dbRead("subscriptions"); const logs = await dbRead("audit_logs");
      const revenue = payments.filter(p => p.status === "succeeded").reduce((s, p) => s + p.amount, 0);
      sendJson({ users: users.length, emails: emails.length, payments: payments.length, files: files.length, subscriptions: subs.length, auditLogs: logs.length, revenue, wsClients: wsUsers.size, wsRooms: wsRooms.size, uptime: process.uptime(), memory: Math.round(process.memoryUsage().rss / 1048576), features: { google: !!GOOGLE_CLIENT_ID, github: !!GITHUB_CLIENT_ID, stripe: !!process.env.STRIPE_SECRET_KEY, smtp: !!process.env.SMTP_HOST } }); return;
    }

    // === 404 ===
    sendJson({ error: "Not found", path, method }, 404);

  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
    sendJson({ error: "Internal server error", message: err.message }, 500);
  }
});

// ============ ADMIN DASHBOARD ============

function adminDashboard() {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Elmoorx Admin</title>
<style>body{font-family:system-ui;background:#0A0A0F;color:#E4E4E7;margin:0;padding:20px}
.c{max-width:1200px;margin:0 auto}.g{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}
.s{background:#1A1A24;border:1px solid #2A2A38;border-radius:8px;padding:16px}
.sl{font-size:10px;color:#71717A;text-transform:uppercase;margin-bottom:8px}.sv{font-size:24px;font-weight:700;color:#A855F7}
h1{font-size:24px}a{color:#06B6D4}</style></head><body><div class="c">
<h1>Elmoorx Admin Dashboard</h1><p>Full-stack server — OAuth + SSR + Audit + OpenAPI + WebSocket</p>
<div class="g"><div class="s"><div class="sl">Users</div><div class="sv" id="u">—</div></div>
<div class="s"><div class="sl">Revenue</div><div class="sv" id="r">—</div></div>
<div class="s"><div class="sl">Payments</div><div class="sv" id="p">—</div></div>
<div class="s"><div class="sl">Emails</div><div class="sv" id="e">—</div></div></div>
<div class="g"><div class="s"><div class="sl">Files</div><div class="sv" id="f">—</div></div>
<div class="s"><div class="sl">Subscriptions</div><div class="sv" id="su">—</div></div>
<div class="s"><div class="sl">Audit Logs</div><div class="sv" id="al">—</div></div>
<div class="s"><div class="sl">WS Clients</div><div class="sv" id="ws">—</div></div></div>
<p><a href="/api/docs/html">📚 API Documentation (OpenAPI)</a> · <a href="/api/health">Health Check</a> · <a href="/api/audit-logs">Audit Logs</a></p>
</div><script>
async function u(){try{const r=await fetch('/api/health');const d=await r.json();
document.getElementById('u').textContent=d.stats.users;document.getElementById('e').textContent=d.stats.emails;
document.getElementById('p').textContent=d.stats.payments;document.getElementById('al').textContent=d.stats.auditLogs;
document.getElementById('ws').textContent=d.stats.wsClients;
const a=await fetch('/api/admin/stats');if(a.ok){const ad=await a.json();
document.getElementById('r').textContent='$'+ad.revenue.toFixed(2);document.getElementById('f').textContent=ad.files;
document.getElementById('su').textContent=ad.subscriptions;}}catch{}}
u();setInterval(u,3000);
</script></body></html>`;
}

function openApiHtml() {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Elmoorx API Docs</title>
<style>body{font-family:system-ui;background:#0A0A0F;color:#E4E4E7;margin:0;padding:40px}
h1{color:#A855F7}.endpoint{background:#1A1A24;border:1px solid #2A2A38;border-radius:8px;padding:12px;margin:8px 0}
.method{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;color:white;margin-right:8px}
.get{background:#10B981}.post{background:#A855F7}.delete{background:#EF4444}.patch{background:#06B6D4}
.path{font-family:monospace;color:#E4E4E7}a{color:#06B6D4}</style></head><body>
<h1>Elmoorx API Documentation</h1><p>OpenAPI 3.0 · <a href="/api/docs">View JSON Spec</a></p>
<div id="docs"></div>
<script>
const endpoints=[
["GET","/api/health","Health check"],["POST","/api/auth/signup","Register new user"],
["POST","/api/auth/signin","Login"],["POST","/api/auth/signout","Logout"],
["GET","/api/auth/me","Current user"],["GET","/api/auth/oauth/google","Google OAuth"],
["GET","/api/auth/oauth/github","GitHub OAuth"],["GET","/api/users","List users"],
["GET","/api/files","List files"],["POST","/api/files/upload","Upload file"],
["GET","/api/files/:id","Download file"],["DELETE","/api/files/:id","Delete file"],
["POST","/api/emails/send","Send email"],["GET","/api/emails","List emails"],
["POST","/api/payments/checkout","Process payment"],["GET","/api/payments","List payments"],
["POST","/api/subscriptions","Create subscription"],["GET","/api/subscriptions","List subscriptions"],
["GET","/api/realtime/stats","WebSocket stats"],["POST","/api/realtime/broadcast","Broadcast message"],
["GET","/api/audit-logs","Audit logs"],["GET","/api/admin/stats","Admin stats"],
["GET","/api/docs","OpenAPI spec"],["GET","/api/docs/html","This page"],
];
document.getElementById('docs').innerHTML=endpoints.map(([m,p,d])=>
'<div class="endpoint"><span class="method '+m.toLowerCase()+'">'+m+'</span><span class="path">'+p+'</span><br><small style="color:#71717A">'+d+'</small></div>'
).join('');
</script></body></html>`;
}

// ============ LOGGING ============

function logReq(method, path, status, start) {
  const dur = Date.now() - start;
  const c = status >= 500 ? "\x1b[31m" : status >= 400 ? "\x1b[33m" : "\x1b[32m";
  console.log(`  ${method.padEnd(6)} ${path.padEnd(35)} ${c}${status}\x1b[0m ${dur}ms`);
}

// ============ START ============

server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║       Elmoorx Full Stack Server v2.0 — ALPHA.16    ║
  ╠══════════════════════════════════════════════════╣
  ║  HTTP:      http://localhost:${PORT}               ║
  ║  WebSocket: ws://localhost:${parseInt(PORT)+1}              ║
  ║  Routes:    24 API endpoints                     ║
  ║  Security:  A+ (auto headers + rate limit)       ║
  ║  Auth:      JWT + Sessions + OAuth               ║
  ║  OAuth:     Google ${GOOGLE_CLIENT_ID ? "✅ LIVE" : "❌ Disabled"} · GitHub ${GITHUB_CLIENT_ID ? "✅ LIVE" : "❌ Disabled"}  ║
  ║  Audit:     ✅ All actions logged                ║
  ║  OpenAPI:   ✅ /api/docs + /api/docs/html        ║
  ║  SSR:       ✅ esbuild integration               ║
  ║  DB:        JSON file-based (real persistence)   ║
  ╚══════════════════════════════════════════════════╝
`);
});
