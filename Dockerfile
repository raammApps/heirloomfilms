# ─────────────────────────────────────────────────────────────────────────────
# Heirloom Films — production image.
#
# Vercel is the primary target (doc 05 §1: wildcard subdomains and automatic TLS).
# This image exists so the platform is not a lock-in: the same build runs on any host that
# can run a container, which matters because the thing being hosted is somebody's wedding
# video and "our PaaS changed its pricing" should never become their problem.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
RUN corepack enable pnpm
WORKDIR /app

# ── Dependencies ─────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── Build ────────────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT_STANDALONE=1
# Build-time only. Real configuration is injected at runtime; lib/env.ts skips its
# production guards during the build phase precisely so no secret is baked into the image.
ENV SESSION_SECRET=build-time-placeholder-0123456789abcdefghij
RUN pnpm build

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
