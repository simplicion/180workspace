# ACTIVE DEPLOYMENT CONFIG: Used for deploying the apps/backend service.
FROM node:20-slim

# Install pnpm and openssl for Prisma, plus tsx for running TS imports
RUN apt-get update -y && apt-get install -y openssl
RUN npm install -g pnpm tsx

# Set working directory
WORKDIR /app

# Copy root workspace configurations
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy packages and apps
COPY packages ./packages
COPY apps/backend ./apps/backend

# Install dependencies for the workspace
RUN pnpm install --frozen-lockfile --prod=false

# Generate Prisma Client
WORKDIR /app/packages/db
RUN npx prisma generate

# Switch to backend directory
WORKDIR /app/apps/backend

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4000

# Expose the API port
EXPOSE 4000

# Start the server using tsx so it can run TypeScript files from @workspace/db
CMD ["tsx", "server.js"]
