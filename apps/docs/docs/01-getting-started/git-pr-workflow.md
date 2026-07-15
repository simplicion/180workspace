---
sidebar_position: 3
---

# Git & PR Workflow

To maintain a clean history and ensure code quality, follow these branching and commit strategies.

## Branching Strategy

We use a feature-branch workflow. Never commit directly to `main` or `develop`.

- **Feature Branches:** `feature/your-feature-name` (e.g., `feature/stripe-integration`)
- **Bug Fix Branches:** `fix/issue-description` (e.g., `fix/login-button-alignment`)
- **Hotfix Branches (Production only):** `hotfix/critical-bug`

## Commit Conventions

We follow Conventional Commits. Every commit message must have a type and a description.

- `feat:` A new feature.
- `fix:` A bug fix.
- `docs:` Documentation only changes.
- `style:` Changes that do not affect the meaning of the code (white-space, formatting, etc.).
- `refactor:` A code change that neither fixes a bug nor adds a feature.
- `perf:` A code change that improves performance.
- `test:` Adding missing tests or correcting existing tests.

**Example:** `feat: add Google Workspace OAuth integration`

## Pull Request Process

1. Push your branch to the repository.
2. Open a PR against the `develop` branch.
3. Ensure your PR title follows the commit conventions.
4. Fill out the PR template, including:
   - What the PR does.
   - Any breaking changes.
   - Steps to manually test the changes.
5. Request a review from at least one other developer.
6. Once approved, the PR can be squashed and merged.
