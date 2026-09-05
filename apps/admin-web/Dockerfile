FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN apk add --no-cache libc6-compat openssl

FROM base AS builder
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune admin-web --docker

FROM base AS installer
WORKDIR /app
COPY --from=builder /app/out/json/ .
# Copy prisma schema to ensure postinstall (prisma generate) succeeds
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
RUN pnpm install --prefer-frozen-lockfile
COPY --from=builder /app/out/full/ .
ENV BUILD_STANDALONE="true"
ENV NEXT_PUBLIC_API_URL="https://api.180workspace.com"
ENV NEXT_PUBLIC_ROOT_DOMAIN="180workspace.com"
ENV NEXT_PUBLIC_MAIN_DOMAIN="180workspace.com"
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID="188560578303-2bih1dg5qhbq5uao9q451r6db3986e6f.apps.googleusercontent.com"
RUN mkdir -p /app/apps/admin-web/public
RUN pnpm turbo run build --filter=admin-web...


FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=installer /app/apps/admin-web/public ./apps/admin-web/public
COPY --from=installer --chown=nextjs:nodejs /app/apps/admin-web/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/admin-web/.next/static ./apps/admin-web/.next/static

USER nextjs

EXPOSE 3003
ENV PORT=3003
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/admin-web/server.js"]
