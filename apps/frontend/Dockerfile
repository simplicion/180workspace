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
COPY --from=builder /app/packages/db-180core/prisma ./packages/db-180core/prisma
RUN pnpm install --prefer-frozen-lockfile
COPY --from=builder /app/out/full/ .
ENV BUILD_STANDALONE="true"
RUN mkdir -p /app/apps/frontend/public
# A throw-away random value: it exists only so the build has *a* secret and is never a known/guessable string. The real
# NEXTAUTH_SECRET is supplied at runtime (see .github/workflows/production-deploy.yml) and is not part of the image.
RUN NEXTAUTH_SECRET="$(openssl rand -hex 32)" pnpm turbo run build --filter=frontend...

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
