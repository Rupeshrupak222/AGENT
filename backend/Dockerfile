# ==============================================================================
# AgentCall AI — Backend Production Multi-Stage Dockerfile
# ==============================================================================

# ── Stage 1: Build & Dependencies ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools if native compilation needed
RUN apk add --no-cache python3 make g++

# Copy package descriptors
COPY backend/package*.json ./backend/
COPY db/package*.json ./db/ 2>/dev/null || true

# Install dependencies
WORKDIR /app/backend
RUN npm ci

# Copy Prisma schema and generate client
WORKDIR /app
COPY db ./db
WORKDIR /app/backend
RUN npx prisma generate --schema=../db/schema.prisma

# Copy source code and configuration
COPY backend/tsconfig*.json ./
COPY backend/nest-cli.json ./
COPY backend/src ./src

# Build production bundle
RUN npm run build

# Prune dev dependencies for lean production image
RUN npm prune --production

# ── Stage 2: Production Minimal Runtime ───────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Security: Set production environment
ENV NODE_ENV=production
ENV PORT=3001

# Add non-root system user and group
RUN addgroup -S -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nestjs

# Copy runtime artifacts from builder
COPY --from=builder --chown=nestjs:nodejs /app/backend/package*.json ./backend/
COPY --from=builder --chown=nestjs:nodejs /app/backend/node_modules ./backend/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/backend/dist ./backend/dist
COPY --from=builder --chown=nestjs:nodejs /app/db ./db

WORKDIR /app/backend

# Switch to non-root user
USER nestjs

# Expose HTTP API port
EXPOSE 3001

# Container healthcheck using standard liveness probe
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3001/health/live || exit 1

# Graceful termination handling
STOPSIGNAL SIGTERM

# Default startup command (HTTP API + In-process worker queues)
CMD ["node", "dist/main.js"]
