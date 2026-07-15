---
sidebar_position: 2
---

# Testing Strategy

A robust testing strategy ensures stability as the platform grows. We use a combination of Unit and E2E tests.

## 1. Unit Testing (Jest)
We use Jest for testing individual functions, services, and utility classes in isolation.

### Backend Testing
- **Services:** Test the core business logic in `src/services/`. Mock external dependencies (like Prisma models, Stripe, or BullMQ) using `jest.mock()`.
- **Controllers:** Test request validation and ensure the correct HTTP status codes are returned.

### Frontend Testing
- Use React Testing Library alongside Jest to render UI components (`@workspace/ui`) and verify they respond correctly to props and user events.

## 2. End-to-End (E2E) Testing
E2E tests simulate real user interactions across the entire stack.

- **Playwright / Cypress:** Used to write scripts that open a browser, log in, navigate to a project, create a task, and verify it appears in the UI.
- These tests are slower but provide the highest confidence that the system works as a whole.

## 3. CI/CD Integration
- All tests must pass in the Continuous Integration pipeline (e.g., GitHub Actions) before a pull request can be merged into `develop` or `main`.
- We enforce a minimum code coverage percentage for core packages.
