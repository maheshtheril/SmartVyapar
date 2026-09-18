# ==========================================================
# SmartVyapar - Multi-Stage Production Dockerfile
# ==========================================================

# 1. Base image with Alpine and Prisma native dependencies
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl curl

# 2. Dependencies stage
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

RUN npm ci

# 3. Builder stage
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npx prisma generate
RUN npm run build

# 4. Production Runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3005
ENV HOSTNAME="0.0.0.0"

# Create a non-root system group and user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set correct ownership for directories
RUN mkdir -p public .next && chown -R nextjs:nodejs /app

# Copy standalone build artifacts and static assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3005

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3005/api/health || exit 1

CMD ["node", "server.js"]
