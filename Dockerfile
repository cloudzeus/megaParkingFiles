# Production Dockerfile for Coolify (use this instead of Nixpacks to avoid NIXPACKS_PATH / build warnings).
# In Coolify: Build Pack → Dockerfile, Port 3000.

FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends curl wget && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="${PNPM_HOME}:$PATH"
WORKDIR /app

# ---- deps ----
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm i --frozen-lockfile

# ---- builder ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

# ---- runner ----
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends default-mysql-client && rm -rf /var/lib/apt/lists/*
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
