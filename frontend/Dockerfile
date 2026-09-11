# ==============================================================================
# AgentCall AI — Frontend Production Multi-Stage Dockerfile (Next.js 14)
# ==============================================================================

# ── Stage 1: Install Dependencies ─────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app/frontend

RUN apk add --no-cache libc6-compat

COPY frontend/package*.json ./
RUN npm ci

# ── Stage 2: Production Build ──────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app/frontend

COPY --from=deps /app/frontend/node_modules ./node_modules
COPY frontend/ ./

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ── Stage 3: Minimal Production Runtime ───────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app/frontend

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Security: non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets and public directory
COPY --from=builder /app/frontend/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next ./.next
COPY --from=builder /app/frontend/node_modules ./node_modules
COPY --from=builder /app/frontend/package.json ./package.json

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=20s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000 || exit 1

STOPSIGNAL SIGTERM

CMD ["npm", "run", "start"]
