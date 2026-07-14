# Elmoorx Framework — Multi-stage Dockerfile
# Builds the framework + serves the full-stack app

# ============ Stage 1: Build ============
FROM node:20-slim AS builder

WORKDIR /app

# Copy lockfile first (if present) for layer caching
COPY package.json ./
COPY package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Copy every workspace's package.json so npm install can resolve workspaces.
# Use a shell glob to copy ONLY package.json files (not source) for better
# Docker layer caching — source changes don't invalidate the install layer.
COPY packages/ ./packages/

# Install dependencies (workspaces resolved from local package.json files)
RUN npm install --legacy-peer-deps --ignore-scripts

# Copy the rest of the source
COPY . .

# Build all workspaces.
# FIXED: previously `npm run build 2>/dev/null || true` silently swallowed
# ALL build failures — production Docker image could ship broken/no code
# with no signal. Now build failures fail the image build.
RUN npm run build

# ============ Stage 2: Production ============
FROM node:20-slim AS production

WORKDIR /app

# Copy only the files needed at runtime
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/scripts/full-server-v2.cjs ./server.cjs

# Create data directory (mounted as a volume in production)
RUN mkdir -p data/emails data/files
VOLUME ["/app/data"]

# Environment
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001 3002

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/api/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

# Run
CMD ["node", "server.cjs"]
