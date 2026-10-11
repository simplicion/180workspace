---
sidebar_position: 2
---

# Environment Variables Reference

This document lists all environment variables required to run the 180workspace Platform across its various microservices and frontend applications.

## 1. HTTP Backend (`apps/http-backend/.env`)

These variables configure the main API server, database connection, and third-party integrations.

```bash
# Environment
NODE_ENV=development
PORT=5000

# Database
# We use PostgreSQL via Prisma
DATABASE_URL="postgresql://your_db_user:your_db_password@your_db_host:5432/your_db_name"

# Authentication
JWT_SECRET="your_super_secret_jwt_key_here"
JWT_ACCESS_SECRET="your_access_token_secret"
JWT_REFRESH_SECRET="your_refresh_token_secret"

# Redis & Queues (BullMQ)
REDIS_URL="redis://localhost:6379"

# Third-Party API Keys
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."

# Storage
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="us-east-1"
S3_BUCKET_NAME="ims-platform-assets"

# Email
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT=2525
SMTP_USER="..."
SMTP_PASS="..."
```

## 2. User Web / Super App (`apps/user-web/.env.local`)

Configuration for the Founder / User facing Next.js application (including 180workspace).

```bash
# API Connection
NEXT_PUBLIC_API_URL="http://localhost:5000/api"

# Feature Flags
NEXT_PUBLIC_ENABLE_180workspace=true
```

## 3. Admin Web (`apps/admin-web/.env.local`)

Configuration for the Super Admin control panel.

```bash
# API Connection
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
```

## 4. Worker Node (`apps/worker/.env`)

The worker node uses the same configuration as the HTTP backend. In production environments (like AWS or Render), supply the exact same environment variables to the worker process, but ensure `RUN_MODE=worker` is set.

```bash
RUN_MODE=worker
DATABASE_URL="postgresql://your_db_user:your_db_password@your_db_host:5432/your_db_name"
REDIS_URL="redis://localhost:6379"
# ... copy other required backend keys here
```

> **Security Note:** Never commit `.env` files to version control. Always use `.env.example` to track required variables.
