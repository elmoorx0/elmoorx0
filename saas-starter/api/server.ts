/**
 * SaaS Starter — API server with full CRUD endpoints
 * Mounts on the Elmoorx server
 */

import { createServer } from 'http';
import { AuthService, WorkspaceService, BillingService, ApiKeyService, UsageService, PLANS } from '../src/index.js';
import type { User, Workspace } from '../src/index.js';

export function createSaasServer(port = 4100) {
  const auth = new AuthService();
  const workspaces = new WorkspaceService();
  const billing = new BillingService();
  const apiKeys = new ApiKeyService();
  const usage = new UsageService();

  const server = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    try {
      // ── Auth endpoints ──
      if (req.url === '/api/auth/signup' && req.method === 'POST') {
        const body = await readBody(req);
        const result = await auth.signup(body.email, body.password, body.name);
        res.statusCode = 201;
        res.end(JSON.stringify({ user: sanitizeUser(result.user), sessionToken: result.sessionToken }));
        return;
      }

      if (req.url === '/api/auth/login' && req.method === 'POST') {
        const body = await readBody(req);
        const result = await auth.login(body.email, body.password);
        res.end(JSON.stringify({ user: sanitizeUser(result.user), sessionToken: result.sessionToken }));
        return;
      }

      if (req.url === '/api/auth/logout' && req.method === 'POST') {
        const token = extractToken(req);
        if (token) await auth.logout(token);
        res.end(JSON.stringify({ success: true }));
        return;
      }

      if (req.url === '/api/auth/me' && req.method === 'GET') {
        const token = extractToken(req);
        const user = token ? await auth.verifySession(token) : null;
        if (!user) { res.statusCode = 401; res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
        res.end(JSON.stringify({ user: sanitizeUser(user) }));
        return;
      }

      // ── Workspace endpoints ──
      if (req.url === '/api/workspaces' && req.method === 'POST') {
        const user = await requireAuth(req, auth);
        if (!user) return unauthorized(res);
        const body = await readBody(req);
        const ws = await workspaces.create(body.name, user.id);
        res.statusCode = 201;
        res.end(JSON.stringify(ws));
        return;
      }

      if (req.url?.startsWith('/api/workspaces/') && req.method === 'GET') {
        const user = await requireAuth(req, auth);
        if (!user) return unauthorized(res);
        const id = req.url.split('/').pop();
        const ws = await workspaces.getMember(id, user.id);
        if (!ws) { res.statusCode = 404; res.end(JSON.stringify({ error: 'Not found' })); return; }
        res.end(JSON.stringify(ws));
        return;
      }

      // ── Billing endpoints ──
      if (req.url?.startsWith('/api/billing/') && req.method === 'POST') {
        const user = await requireAuth(req, auth);
        if (!user) return unauthorized(res);
        const wsId = req.url.split('/').pop();
        const body = await readBody(req);
        const sub = await billing.upgrade(wsId, body.plan);
        res.end(JSON.stringify(sub));
        return;
      }

      // ── API Keys ──
      if (req.url?.match(/^\/api\/keys\/[^/]+$/) && req.method === 'POST') {
        const user = await requireAuth(req, auth);
        if (!user) return unauthorized(res);
        const wsId = req.url.split('/').pop();
        const body = await readBody(req);
        const result = await apiKeys.create(wsId, body.name, body.scopes);
        res.statusCode = 201;
        res.end(JSON.stringify({ id: result.apiKey.id, prefix: result.apiKey.prefix, plaintext: result.plaintext }));
        return;
      }

      if (req.url?.match(/^\/api\/keys\/[^/]+$/) && req.method === 'GET') {
        const user = await requireAuth(req, auth);
        if (!user) return unauthorized(res);
        const wsId = req.url.split('/').pop();
        const keys = await apiKeys.list(wsId);
        res.end(JSON.stringify(keys));
        return;
      }

      // ── Usage ──
      if (req.url?.match(/^\/api\/usage\/[^/]+$/) && req.method === 'GET') {
        const user = await requireAuth(req, auth);
        if (!user) return unauthorized(res);
        const wsId = req.url.split('/').pop();
        const records = await usage.getUsage(wsId);
        res.end(JSON.stringify(records));
        return;
      }

      // ── Plans ──
      if (req.url === '/api/plans' && req.method === 'GET') {
        res.end(JSON.stringify(PLANS));
        return;
      }

      // ── Health ──
      if (req.url === '/api/health' && req.method === 'GET') {
        res.end(JSON.stringify({ status: 'ok', version: '2.0.0-alpha.20' }));
        return;
      }

      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch (err: any) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err.message }));
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`SaaS Starter server running on http://localhost:${port}`);
      resolve({ server, auth, workspaces, billing, apiKeys, usage });
    });
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function readBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(data)); } catch { resolve({}); }
    });
  });
}

function extractToken(req: any): string | null {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/);
  return match ? match[1] : null;
}

async function requireAuth(req: any, auth: AuthService): Promise<User | null> {
  const token = extractToken(req);
  if (!token) return null;
  return auth.verifySession(token);
}

function unauthorized(res: any) {
  res.statusCode = 401;
  res.end(JSON.stringify({ error: 'Unauthorized' }));
}

function sanitizeUser(user: User) {
  const { passwordHash, ...safe } = user as any;
  return safe;
}

// ─── Run if invoked directly ────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  createSaasServer(parseInt(process.env.PORT ?? '4100', 10));
}
