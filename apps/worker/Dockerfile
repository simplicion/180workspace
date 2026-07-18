FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN apk add --no-cache libc6-compat openssl

FROM base AS builder
WORKDIR /app
RUN npm install -g turbo
COPY . .
# Worker depends on the backend source code to run server.js
RUN turbo prune worker backend --docker

FROM base AS installer
WORKDIR /app
COPY --from=builder /app/out/json/ .
# Copy prisma schema to ensure postinstall (prisma generate) succeeds
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
RUN pnpm install --frozen-lockfile
COPY --from=builder /app/out/full/ .
RUN pnpm turbo run build --filter=worker... --filter=backend... || true

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV RUN_MODE=worker
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker-server

COPY --from=installer --chown=worker-server:nodejs /app .

USER worker-server
WORKDIR /app/apps/worker

EXPOSE 4004
ENV PORT=4004

# Run the worker via the backend server file
CMD ["node", "../backend/server.js"]
