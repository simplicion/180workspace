---
sidebar_position: 4
---

# Infrastructure & Deployment

The 180workspace Platform is designed for cloud-native deployment. While specific hosting providers can be swapped, the architecture relies on Docker containers, managed databases, and CI/CD pipelines.

## Hosting Environments

We maintain strict environment isolation:
- **Development / Staging:** Used by developers to test features.
- **Production:** Live environment for end-users.

### Target Infrastructure
- **Frontend Apps (`user-web`, `admin-web`):** Can be deployed on Vercel for optimal Next.js performance and edge caching, or containerized via Docker and deployed to AWS ECS / Google Cloud Run.
- **Backend API (`http-backend`):** Deployed as a containerized Node.js application (e.g., AWS ECS, Google Cloud Run, or Railway).
- **Database:** PostgreSQL Atlas (Managed DBaaS) ensures high availability, automated backups, and scalable cluster sizing.
- **Redis (for BullMQ):** Managed Redis instance (e.g., AWS ElastiCache, Upstash, or Railway Redis).

## CI/CD Pipelines

We use GitHub Actions (or GitLab CI) to automate the deployment process.

1. **Continuous Integration (CI):**
   - Triggered on PR creation against `develop` or `main`.
   - Runs `pnpm lint` and `pnpm test`.
   - Blocks merging if tests or linting fail.
2. **Continuous Deployment (CD):**
   - Triggered on merging to `main`.
   - Builds the Docker images.
   - Pushes images to a container registry (e.g., ECR, Docker Hub).
   - Deploys the updated containers to the production cluster.
