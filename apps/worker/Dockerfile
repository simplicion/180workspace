FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies needed for pnpm and turbo
RUN npm install -g pnpm turbo

# Copy monorepo configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/worker/package.json ./apps/worker/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the worker source code
COPY apps/worker/ ./apps/worker/

# Build if necessary (though worker might just be raw Node)
# RUN pnpm --filter worker-node build

# Set the working directory to the worker package
WORKDIR /app/apps/worker

# Start the worker
CMD ["npm", "start"]
