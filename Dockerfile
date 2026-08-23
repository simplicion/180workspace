# ---------------------------------------------
# Base image for node
# ---------------------------------------------
FROM node:20-slim AS base
# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl
RUN npm install -g pnpm turbo tsx

# ---------------------------------------------
# Stage 1: Prune the workspace
# ---------------------------------------------
FROM base AS builder
WORKDIR /app
COPY . .
# Extract only the necessary files for the backend app
RUN turbo prune backend --docker

# ---------------------------------------------
# Stage 2: Install dependencies
# ---------------------------------------------
FROM base AS installer
WORKDIR /app

# First install the dependencies (as they change less often)
# Copy the lockfile and package.jsons
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile --prod=false

# Now copy the source code of the pruned app
COPY --from=builder /app/out/full/ .

# Generate Prisma Client
WORKDIR /app/packages/db
RUN pnpm dlx prisma generate

# ---------------------------------------------
# Stage 3: Runner
# ---------------------------------------------
FROM base AS runner
WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 backend-user
USER backend-user

# Copy installed dependencies and source code
COPY --from=installer --chown=backend-user:nodejs /app .

WORKDIR /app/apps/backend

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["tsx", "server.js"]
