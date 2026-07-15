FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN apk add --no-cache libc6-compat openssl

FROM base AS builder
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune http-backend --docker

FROM base AS installer
WORKDIR /app
COPY --from=builder /app/out/json/ .
# Copy prisma schema to ensure postinstall (prisma generate) succeeds
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
RUN pnpm install --frozen-lockfile
COPY --from=builder /app/out/full/ .
# Run build if there is a build script (often not needed for raw JS backends, but safe for turbo)
RUN pnpm turbo run build --filter=http-backend... || true

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 express

COPY --from=installer --chown=express:nodejs /app .

USER express
WORKDIR /app/apps/http-backend

EXPOSE 4000
ENV PORT=4000

CMD ["node", "server.js"]
