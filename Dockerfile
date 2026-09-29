FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN apk add --no-cache libc6-compat gcompat openssl
RUN npm install -g tsx turbo

FROM base AS builder
WORKDIR /app
COPY . .
RUN turbo prune backend --docker

FROM base AS installer
WORKDIR /app
COPY --from=builder /app/out/json/ .
# Copy prisma schemas to ensure postinstall (prisma generate) succeeds
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder /app/packages/db-180core/prisma ./packages/db-180core/prisma
RUN pnpm install --prefer-frozen-lockfile
COPY --from=builder /app/out/full/ .
RUN pnpm --filter @workspace/db-180core build || true

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=installer /app .

WORKDIR /app/apps/backend

EXPOSE 4000
ENV PORT=4000

CMD ["tsx", "server.js"]
