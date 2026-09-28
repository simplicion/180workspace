# 180 Documentation Portal

Internal platform architecture, engineering blueprints, database models, and developer onboarding runbooks for **180workspace**.

## Local Development

Run the documentation server locally from the monorepo root:

```bash
pnpm dev --filter docs
```

Or from the `apps/docs` directory:

```bash
pnpm dev
```

The portal runs by default at `http://localhost:3005`.

## Building for Production

```bash
pnpm build
```

This compiles static assets into the `build` directory, fully optimized for CDN edge caching and static delivery.
