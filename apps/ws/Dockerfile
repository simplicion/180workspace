FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN apk add --no-cache libc6-compat openssl

FROM base AS builder
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune ws --docker

FROM base AS installer
WORKDIR /app
COPY --from=builder /app/out/json/ .
# Copy prisma schema to ensure postinstall (prisma generate) succeeds
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
RUN pnpm install --frozen-lockfile
COPY --from=builder /app/out/full/ .
# WS doesn't have a build step, it's just raw JS. But turbo build won't hurt if we add one later.
RUN pnpm turbo run build --filter=ws... || true

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 ws-server

COPY --from=installer --chown=ws-server:nodejs /app .

USER ws-server
WORKDIR /app/apps/ws

EXPOSE 4003
ENV PORT=4003

CMD ["node", "src/index.js"]
