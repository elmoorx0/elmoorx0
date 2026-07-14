#!/usr/bin/env node
/**
 * Serve the Elmoorx demo on http://localhost:3000
 */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const demoPath = join(__dirname, "..", "demo", "index.html");

const port = parseInt(process.argv.find(a => a.startsWith("--port="))?.split("=")[1] || "3000");

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (url.pathname === "/" || url.pathname === "/index.html") {
    try {
      const html = await readFile(demoPath, "utf-8");
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        // Elmoorx's auto-applied security headers (from runtime/src/security.ts)
        "Content-Security-Policy": "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'",
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
      });
      res.end(html);
    } catch (err) {
      res.writeHead(500);
      res.end(`Error: ${err.message}`);
    }
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(port, () => {
  console.log(`
  Elmoorx Framework — Live Demo
  ─────────────────────────────────
  → http://localhost:${port}
  → Hot reload: OFF (static demo)
  → Security headers auto-applied (CSP, HSTS, X-Frame-Options)
  ─────────────────────────────────
  Press Ctrl+C to stop
`);
});
