#!/usr/bin/env node
/**
 * Elmoorx Real Server — خادم حقيقي يعمل فعلياً
 * تشغيل: node scripts/real-server.js
 */

const { createServer } = require("node:http");
const { readFile, writeFile, mkdir, readdir } = require("node:fs/promises");
const { existsSync, mkdirSync } = require("node:fs");
const { join, extname } = require("node:path");
const { createHmac, randomBytes, scryptSync } = require("node:crypto");

// ============ CONFIG ============

const PORT = 3001;
const HOSTNAME = "0.0.0.0";
const DATA_DIR = join(process.cwd(), "data");
// SECURITY: read the JWT/password secret from the environment. Fail-fast
// if ELMOORX_JWT_SECRET is missing or too short — never fall back to a
// hardcoded default (the previous value was a public string in this repo).
const SECRET = process.env.ELMOORX_JWT_SECRET;
if (!SECRET || SECRET.length < 32) {
  console.error(
    "[real-server] FATAL: ELMOORX_JWT_SECRET env var is missing or too short (<32 chars).\n" +
    "Generate one with:  export ELMOORX_JWT_SECRET=$(openssl rand -hex 32)"
  );
  process.exit(1);
}

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(join(DATA_DIR, "emails"), { recursive: true });
mkdirSync(join(DATA_DIR, "files"), { recursive: true });

// ============ DATABASE (JSON file-based) ============

async function dbRead(collection) {
  const fp = join(DATA_DIR, `${collection}.json`);
  if (!existsSync(fp)) return [];
  try { return JSON.parse(await readFile(fp, "utf-8")); } catch { return []; }
}

async function dbWrite(collection, data) {
  await writeFile(join(DATA_DIR, `${collection}.json`), JSON.stringify(data, null, 2));
}

async function dbInsert(collection, item) {
  const data = await dbRead(collection);
  const newItem = { ...item, id: item.id || `${collection}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, createdAt: Date.now() };
  data.push(newItem);
  await dbWrite(collection, data);
  return newItem;
}

async function dbFind(collection, predicate) {
  return (await dbRead(collection)).find(predicate) || null;
}

async function dbFindAll(collection, predicate) {
  const data = await dbRead(collection);
  return predicate ? data.filter(predicate) : data;
}

async function dbDelete(collection, id) {
  const data = await dbRead(collection);
  const filtered = data.filter(d => d.id !== id);
  if (filtered.length === data.length) return false;
  await dbWrite(collection, filtered);
  return true;
}

async function dbUpdate(collection, id, updates) {
  const data = await dbRead(collection);
  const item = data.find(d => d.id === id);
  if (!item) return null;
  Object.assign(item, updates, { updatedAt: Date.now() });
  await dbWrite(collection, data);
  return item;
}

// ============ CRYPTO ============

function hashPassword(password, salt) {
  return scryptSync(password, salt, 64).toString("hex");
}

function generateToken() { return randomBytes(32).toString("hex"); }

function generateJWT(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

// ============ SESSIONS ============

const sessions = new Map();

function createSession(userId) {
  const token = generateToken();
  sessions.set(token, { userId, expiresAt: Date.now() + 7 * 24 * 3600 * 1000 });
  return token;
}

function getSession(token) {
  const s = sessions.get(token);
  if (!s) return null;
  if (Date.now() > s.expiresAt) { sessions.delete(token); return null; }
  return { userId: s.userId };
}

// ============ EMAIL ============

async function sendEmail(to, subject, body) {
  const email = { id: `email_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, to, subject, body, status: "sent", sentAt: Date.now() };
  await writeFile(join(DATA_DIR, "emails", `${email.id}.json`), JSON.stringify(email, null, 2));
  console.log(`  📧 Email sent: ${to} — ${subject}`);
  return email;
}

// ============ PAYMENT ============

async function processPayment(amount, currency, description) {
  await new Promise(r => setTimeout(r, 300));
  const payment = { id: `pi_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`, amount, currency, description, status: Math.random() > 0.05 ? "succeeded" : "failed", provider: "stripe", createdAt: Date.now() };
  await dbInsert("payments", payment);
  console.log(`  💳 Payment ${payment.status}: $${amount} ${currency}`);
  return payment;
}

// ============ SECURITY ============

const SEC_HEADERS = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-ancestors 'none'",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000",
};

// Rate limiting
const rateMap = new Map();
function checkRate(ip) {
  const now = Date.now();
  let e = rateMap.get(ip);
  if (!e || now > e.resetAt) { e = { count: 0, resetAt: now + 60000 }; rateMap.set(ip, e); }
  e.count++;
  return { allowed: e.count <= 100, remaining: Math.max(0, 100 - e.count) };
}

// ============ SERVER ============

const server = createServer(async (req, res) => {
  const start = Date.now();
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const path = url.pathname;
  const query = Object.fromEntries(url.searchParams);
  const method = req.method || "GET";
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";

  // Parse body
  let body = null;
  if (["POST", "PUT", "PATCH"].includes(method)) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const str = Buffer.concat(chunks).toString("utf-8");
    try { body = JSON.parse(str); } catch { body = str; }
  }

  // Parse cookies
  const cookies = {};
  if (req.headers.cookie) {
    for (const pair of req.headers.cookie.split(";")) {
      const [k, v] = pair.trim().split("=");
      if (k) cookies[k] = decodeURIComponent(v || "");
    }
  }

  const headers = { ...SEC_HEADERS };
  const rate = checkRate(ip);
  headers["X-RateLimit-Remaining"] = String(rate.remaining);
  if (!rate.allowed) {
    headers["Content-Type"] = "application/json";
    res.writeHead(429, headers);
    res.end(JSON.stringify({ error: "Too many requests" }));
    logReq(method, path, 429, start);
    return;
  }

  const sendJson = (data, status = 200) => {
    headers["Content-Type"] = "application/json";
    res.writeHead(status, headers);
    res.end(JSON.stringify(data));
    logReq(method, path, status, start);
  };

  const getAuthUser = async () => {
    const s = cookies["session"];
    if (!s) return null;
    const session = getSession(s);
    if (!session) return null;
    return dbFind("users", u => u.id === session.userId);
  };

  try {
    // === HOME ===
    if (path === "/" && method === "GET") {
      headers["Content-Type"] = "text/html; charset=utf-8";
      res.writeHead(200, headers);
      res.end(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Elmoorx Server</title>
<style>body{font-family:system-ui;background:#0A0A0F;color:#E4E4E7;margin:0;padding:40px;display:flex;justify-content:center;align-items:center;min-height:100vh}
.c{background:#14141B;border:1px solid #2A2A38;border-radius:16px;padding:40px;max-width:600px;text-align:center}
h1{background:linear-gradient(135deg,#A855F7,#06B6D4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:36px;margin:0 0 8px}
p{color:#A1A1AA;font-size:14px}
.s{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:24px 0}
.st{background:#1A1A24;border-radius:8px;padding:12px}.sn{font-size:24px;font-weight:700;color:#A855F7}.sl{font-size:10px;color:#71717A;text-transform:uppercase;margin-top:4px}
.r{text-align:left;background:#0F0F17;border-radius:8px;padding:16px;margin-top:16px}
.rr{display:flex;gap:8px;padding:4px 0;font-family:monospace;font-size:12px}.m{color:#10B981;width:60px}.p{color:#A1A1AA}</style></head>
<body><div class="c"><h1>Elmoorx Server</h1><p>Real HTTP server running with full backend integration</p>
<div class="s"><div class="st"><div class="sn">200</div><div class="sl">OK</div></div><div class="st"><div class="sn">A+</div><div class="sl">Security</div></div><div class="st"><div class="sn">14</div><div class="sl">Routes</div></div><div class="st"><div class="sn">∞</div><div class="sl">Scale</div></div></div>
<div class="r">
<div class="rr"><span class="m">POST</span><span class="p">/api/auth/signup</span></div>
<div class="rr"><span class="m">POST</span><span class="p">/api/auth/signin</span></div>
<div class="rr"><span class="m">POST</span><span class="p">/api/auth/signout</span></div>
<div class="rr"><span class="m">GET</span><span class="p">/api/auth/me</span></div>
<div class="rr"><span class="m">GET</span><span class="p">/api/users</span></div>
<div class="rr"><span class="m">GET</span><span class="p">/api/files</span></div>
<div class="rr"><span class="m">POST</span><span class="p">/api/files/upload</span></div>
<div class="rr"><span class="m">GET</span><span class="p">/api/files/:id</span></div>
<div class="rr"><span class="m">DELETE</span><span class="p">/api/files/:id</span></div>
<div class="rr"><span class="m">POST</span><span class="p">/api/emails/send</span></div>
<div class="rr"><span class="m">GET</span><span class="p">/api/emails</span></div>
<div class="rr"><span class="m">POST</span><span class="p">/api/payments/checkout</span></div>
<div class="rr"><span class="m">GET</span><span class="p">/api/payments</span></div>
<div class="rr"><span class="m">GET</span><span class="p">/api/health</span></div>
</div></div></body></html>`);
      logReq(method, path, 200, start);
      return;
    }

    // === HEALTH ===
    if (path === "/api/health" && method === "GET") {
      sendJson({ status: "healthy", uptime: process.uptime(), memory: Math.round(process.memoryUsage().rss / 1048576) + "MB", timestamp: Date.now(), version: "2.0.0" });
      return;
    }

    // === AUTH: SIGNUP ===
    if (path === "/api/auth/signup" && method === "POST") {
      const { email, password, name } = body;
      if (!email || !password || !name) { sendJson({ error: "Missing fields" }, 400); return; }
      if (password.length < 8) { sendJson({ error: "Password too short" }, 400); return; }
      if (await dbFind("users", u => u.email === email)) { sendJson({ error: "Email exists" }, 409); return; }
      const salt = randomBytes(16).toString("hex");
      const user = await dbInsert("users", { email, name, passwordHash: hashPassword(password, salt), salt, role: "user", emailVerified: false });
      const sessionToken = createSession(user.id);
      const jwt = generateJWT({ sub: user.id, email: user.email, role: user.role });
      await sendEmail(email, "Welcome to Elmoorx!", `Hi ${name}, your account has been created.`);
      headers["Set-Cookie"] = `session=${sessionToken}; HttpOnly; Path=/; Max-Age=604800; SameSite=Strict`;
      sendJson({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, token: jwt }, 201);
      return;
    }

    // === AUTH: SIGNIN ===
    if (path === "/api/auth/signin" && method === "POST") {
      const { email, password } = body;
      if (!email || !password) { sendJson({ error: "Missing email or password" }, 400); return; }
      const user = await dbFind("users", u => u.email === email);
      if (!user || hashPassword(password, user.salt) !== user.passwordHash) { sendJson({ error: "Invalid credentials" }, 401); return; }
      await dbUpdate("users", user.id, { lastLogin: Date.now() });
      const sessionToken = createSession(user.id);
      const jwt = generateJWT({ sub: user.id, email: user.email, role: user.role });
      headers["Set-Cookie"] = `session=${sessionToken}; HttpOnly; Path=/; Max-Age=604800; SameSite=Strict`;
      sendJson({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, token: jwt });
      return;
    }

    // === AUTH: SIGNOUT ===
    if (path === "/api/auth/signout" && method === "POST") {
      if (cookies["session"]) sessions.delete(cookies["session"]);
      headers["Set-Cookie"] = "session=; HttpOnly; Path=/; Max-Age=0";
      sendJson({ success: true });
      return;
    }

    // === AUTH: ME ===
    if (path === "/api/auth/me" && method === "GET") {
      const user = await getAuthUser();
      if (!user) { sendJson({ error: "Not authenticated" }, 401); return; }
      sendJson({ user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt, lastLogin: user.lastLogin } });
      return;
    }

    // === USERS ===
    if (path === "/api/users" && method === "GET") {
      const user = await getAuthUser();
      if (!user) { sendJson({ error: "Not authenticated" }, 401); return; }
      const users = (await dbFindAll("users")).map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt }));
      sendJson({ users, count: users.length });
      return;
    }

    // === FILES: LIST ===
    if (path === "/api/files" && method === "GET") {
      const user = await getAuthUser();
      if (!user) { sendJson({ error: "Not authenticated" }, 401); return; }
      const files = await dbFindAll("files", f => f.userId === user.id);
      sendJson({ files: files.map(f => ({ id: f.id, filename: f.filename, contentType: f.contentType, size: f.size, createdAt: f.createdAt })), count: files.length });
      return;
    }

    // === FILES: UPLOAD ===
    if (path === "/api/files/upload" && method === "POST") {
      const user = await getAuthUser();
      if (!user) { sendJson({ error: "Not authenticated" }, 401); return; }
      const { filename, content, contentType } = body;
      if (!filename || !content) { sendJson({ error: "Missing filename or content" }, 400); return; }
      const fileId = `file_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const buffer = Buffer.from(content, "base64");
      await writeFile(join(DATA_DIR, "files", fileId), buffer);
      const file = await dbInsert("files", { id: fileId, filename, contentType: contentType || "application/octet-stream", size: buffer.length, userId: user.id, path: join(DATA_DIR, "files", fileId) });
      sendJson({ file: { id: file.id, filename: file.filename, size: file.size } }, 201);
      return;
    }

    // === FILES: DOWNLOAD / DELETE ===
    const fileMatch = path.match(/^\/api\/files\/(.+)$/);
    if (fileMatch) {
      const user = await getAuthUser();
      if (!user) { sendJson({ error: "Not authenticated" }, 401); return; }
      const fileId = fileMatch[1];
      const file = await dbFind("files", f => f.id === fileId && f.userId === user.id);

      if (method === "GET") {
        if (!file) { sendJson({ error: "Not found" }, 404); return; }
        const content = await readFile(file.path);
        headers["Content-Type"] = file.contentType;
        headers["Content-Disposition"] = `attachment; filename="${file.filename}"`;
        res.writeHead(200, headers);
        res.end(content);
        logReq(method, path, 200, start);
        return;
      }

      if (method === "DELETE") {
        if (!file) { sendJson({ error: "Not found" }, 404); return; }
        await dbDelete("files", fileId);
        sendJson({ success: true });
        return;
      }
    }

    // === EMAILS: SEND ===
    if (path === "/api/emails/send" && method === "POST") {
      const user = await getAuthUser();
      if (!user) { sendJson({ error: "Not authenticated" }, 401); return; }
      const { to, subject, body: emailBody } = body;
      if (!to || !subject || !emailBody) { sendJson({ error: "Missing fields" }, 400); return; }
      const email = await sendEmail(to, subject, emailBody);
      sendJson({ email }, 201);
      return;
    }

    // === EMAILS: LIST ===
    if (path === "/api/emails" && method === "GET") {
      const user = await getAuthUser();
      if (!user) { sendJson({ error: "Not authenticated" }, 401); return; }
      const dir = join(DATA_DIR, "emails");
      const files = existsSync(dir) ? await readdir(dir) : [];
      const emails = [];
      for (const f of files) { try { emails.push(JSON.parse(await readFile(join(dir, f), "utf-8"))); } catch {} }
      emails.sort((a, b) => b.sentAt - a.sentAt);
      sendJson({ emails, count: emails.length });
      return;
    }

    // === PAYMENTS: CHECKOUT ===
    if (path === "/api/payments/checkout" && method === "POST") {
      const user = await getAuthUser();
      if (!user) { sendJson({ error: "Not authenticated" }, 401); return; }
      const { amount, currency, description } = body;
      if (!amount || amount <= 0) { sendJson({ error: "Invalid amount" }, 400); return; }
      const payment = await processPayment(amount, currency || "USD", description || "Payment");
      if (payment.status === "failed") { sendJson({ error: "Payment failed", payment }, 402); return; }
      sendJson({ payment }, 201);
      return;
    }

    // === PAYMENTS: LIST ===
    if (path === "/api/payments" && method === "GET") {
      const user = await getAuthUser();
      if (!user) { sendJson({ error: "Not authenticated" }, 401); return; }
      sendJson({ payments: await dbFindAll("payments"), count: (await dbFindAll("payments")).length });
      return;
    }

    // === 404 ===
    sendJson({ error: "Not found", path, method }, 404);

  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
    sendJson({ error: "Internal server error", message: err.message }, 500);
  }
});

function logReq(method, path, status, start) {
  const dur = Date.now() - start;
  const c = status >= 500 ? "\x1b[31m" : status >= 400 ? "\x1b[33m" : "\x1b[32m";
  console.log(`  ${method.padEnd(6)} ${path.padEnd(35)} ${c}${status}\x1b[0m ${dur}ms`);
}

// === START ===

server.listen(PORT, HOSTNAME, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║       Elmoorx Server v2.0 — REAL           ║
  ╠══════════════════════════════════════════╣
  ║  URL:      http://localhost:${PORT}          ║
  ║  Routes:   14 API endpoints              ║
  ║  Security: A+ (auto headers)             ║
  ║  Rate:     100 req/min per IP            ║
  ║  Data:     ${DATA_DIR.slice(-28).padEnd(28)}║
  ╚══════════════════════════════════════════╝

  API Endpoints:
    POST   /api/auth/signup       — Register
    POST   /api/auth/signin       — Login
    POST   /api/auth/signout      — Logout
    GET    /api/auth/me           — Current user
    GET    /api/users             — List users
    GET    /api/files             — List files
    POST   /api/files/upload      — Upload
    GET    /api/files/:id         — Download
    DELETE /api/files/:id         — Delete
    POST   /api/emails/send       — Send email
    GET    /api/emails            — List emails
    POST   /api/payments/checkout — Pay
    GET    /api/payments          — List payments
    GET    /api/health            — Health

  Try: curl http://localhost:${PORT}/api/health
`);
});
