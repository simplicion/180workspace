FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat openssl

FROM base AS builder
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune frontend --docker

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
RUN mkdir -p /app/apps/frontend/public
RUN pnpm turbo run build --filter=frontend...

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=installer /app/apps/frontend/public ./apps/frontend/public
COPY --from=installer --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static

USER nextjs

EXPOSE 3002
ENV PORT=3002
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/frontend/server.js"]
