# Elmoorx Framework — Deployment Guide

Complete guide to deploy Elmoorx apps to every platform.

---

## Table of Contents
1. [Quick Start](#quick-start)
2. [Docker Deployment](#docker)
3. [Cloudflare Workers](#cloudflare)
4. [Vercel Edge](#vercel)
5. [Deno Deploy](#deno)
6. [Node.js VPS](#nodejs)
7. [Environment Variables](#env-vars)
8. [Production Checklist](#checklist)

---

## Quick Start

```bash
# Build for production
elmoorx build

# Deploy (auto-detects platform)
elmoorx deploy

# Or specify platform
elmoorx deploy --target=cloudflare
elmoorx deploy --target=vercel
elmoorx deploy --target=deno
elmoorx deploy --target=node
```

---

## Docker

### Using docker-compose (recommended)

```bash
# Basic deployment
docker compose up -d

# With PostgreSQL + Redis
docker compose --profile postgres --profile redis up -d

# With Nginx reverse proxy
docker compose --profile nginx up -d

# View logs
docker compose logs -f elmoorx-app

# Stop
docker compose down
```

### Building manually

```bash
# Build image
docker build -t elmoorx/framework:latest .

# Run container
docker run -d \
  --name elmoorx-app \
  -p 3001:3001 \
  -p 3002:3002 \
  -v $(pwd)/data:/app/data \
  -e ELMOORX_JWT_SECRET=$(openssl rand -hex 32) \
  elmoorx/framework:latest

# Health check
curl http://localhost:3001/api/health
```

### Docker environment

```env
NODE_ENV=production
PORT=3001
ELMOORX_JWT_SECRET=$(openssl rand -hex 32)
STRIPE_SECRET_KEY=sk_live_xxx
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-app-password
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
```

---

## Cloudflare Workers

### Setup

```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Create wrangler.toml
cat > wrangler.toml << 'EOF'
name = "elmoorx-app"
main = "src/index.ts"
compatibility_date = "2026-07-01"

[env.production]
name = "elmoorx-app"
route = "elmoorx.dev/*"

[env.staging]
name = "elmoorx-app-staging"
route = "staging.elmoorx.dev/*"
EOF

# Deploy
wrangler deploy --env production
```

### wrangler.toml with KV + D1

```toml
name = "elmoorx-app"
main = "src/index.ts"
compatibility_date = "2026-07-01"

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"

[[d1_databases]]
binding = "DB"
database_name = "elmoorx-db"
database_id = "your-d1-database-id"

[vars]
ELMOORX_JWT_SECRET = "$(openssl rand -hex 32)"
```

### Deploy command

```bash
# Deploy to Cloudflare (285 edge locations)
wrangler deploy

# Tail logs
wrangler tail
```

---

## Vercel Edge

### Setup

```bash
# Install Vercel CLI
npm install -g vercel

# Create vercel.json
cat > vercel.json << 'EOF'
{
  "version": 2,
  "builds": [
    { "src": "src/index.ts", "use": "@vercel/edge" }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "/src/index.ts" }
  ]
}
EOF

# Deploy
vercel --prod
```

### Environment variables

```bash
# Set via CLI
vercel env add ELMOORX_JWT_SECRET production
vercel env add STRIPE_SECRET_KEY production
vercel env add SMTP_HOST production
vercel env add GOOGLE_CLIENT_ID production
vercel env add GITHUB_CLIENT_ID production

# Pull to local
vercel env pull .env.local
```

---

## Deno Deploy

### Setup

```bash
# Install deployctl
deno install -Arf jsr:@deno/deployctl

# Create deno.json
cat > deno.json << 'EOF'
{
  "tasks": {
    "start": "deno run --allow-net --allow-read --allow-env src/index.ts"
  },
  "deploy": {
    "project": "elmoorx-app",
    "entrypoint": "src/index.ts",
    "include": ["src/", "public/"]
  }
}
EOF

# Deploy
deployctl deploy --project=elmoorx-app src/index.ts
```

---

## Node.js VPS

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start scripts/full-server-v2.cjs --name elmoorx-app

# Save process list
pm2 save

# Setup startup script
pm2 startup

# Monitor
pm2 monit

# Logs
pm2 logs elmoorx-app

# Restart
pm2 restart elmoorx-app

# Stop
pm2 stop elmoorx-app
```

### Using systemd

```bash
# Create service file
sudo cat > /etc/systemd/system/elmoorx-app.service << 'EOF'
[Unit]
Description=Elmoorx Framework Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/elmoorx
ExecStart=/usr/bin/node scripts/full-server-v2.cjs
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3001
Environment=ELMOORX_JWT_SECRET=$(openssl rand -hex 32)

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl enable elmoorx-app
sudo systemctl start elmoorx-app
sudo systemctl status elmoorx-app
```

### Using Nginx reverse proxy

```nginx
server {
    listen 80;
    server_name elmoorx.dev;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | HTTP server port |
| `ELMOORX_JWT_SECRET` | **Yes** | JWT signing secret (32+ bytes, generate with: openssl rand -hex 32) | JWT signing secret |
| `STRIPE_SECRET_KEY` | No | — | Stripe API key for real payments |
| `SMTP_HOST` | No | — | SMTP server for real emails |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USER` | No | — | SMTP username |
| `SMTP_PASS` | No | — | SMTP password |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | — | Google OAuth secret |
| `GITHUB_CLIENT_ID` | No | — | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | No | — | GitHub OAuth secret |
| `NODE_ENV` | No | `development` | Environment |

---

## Production Checklist

### Security
- [ ] Change `ELMOORX_JWT_SECRET` to a random 32+ byte string (openssl rand -hex 32)
- [ ] Enable HTTPS (use Let's Encrypt for free SSL)
- [ ] Set `NODE_ENV=production`
- [ ] Review CSP headers
- [ ] Enable rate limiting (default: 100 req/min)
- [ ] Configure CSRF protection
- [ ] Set up audit logging

### Performance
- [ ] Enable gzip compression (Nginx or middleware)
- [ ] Set up CDN for static assets
- [ ] Configure cache headers
- [ ] Enable HSTS
- [ ] Monitor Core Web Vitals

### Reliability
- [ ] Set up health checks (`/api/health`)
- [ ] Configure auto-restart (PM2 or systemd)
- [ ] Set up log rotation
- [ ] Configure backup for `data/` directory
- [ ] Set up monitoring alerts

### Database
- [ ] Migrate from JSON to PostgreSQL for production
- [ ] Set up database backups
- [ ] Configure connection pooling

### Email
- [ ] Configure SMTP (Gmail, SES, SendGrid)
- [ ] Set up SPF, DKIM, DMARC records
- [ ] Test email delivery

### Payments
- [ ] Set Stripe secret key
- [ ] Configure webhook endpoint
- [ ] Test payment flow

### OAuth
- [ ] Register Google OAuth app
- [ ] Register GitHub OAuth app
- [ ] Set redirect URLs

---

## Platform Comparison

| Platform | Cold Start | Regions | Free Tier | WebSocket |
|----------|-----------|---------|-----------|-----------|
| Cloudflare Workers | 12ms | 285 | 100K req/day | Via Durable Objects |
| Vercel Edge | 28ms | Global | 1M req/month | Limited |
| Deno Deploy | 35ms | 35 | 1M req/month | ✅ Native |
| Node.js VPS | 8ms | 1 | — | ✅ Native |
| Docker | 8ms | 1 | — | ✅ Native |
