# Testing and Quality

## Existing Testing Setup
Based on root configuration files (`package.json`), the 180workspace platform does not currently deploy a standardized automated runner configuration (like Jest, Mocha, or Cypress). 
Instead, Quality Assurance relies predominantly on isolated manual procedural scripts housed in the root directory:
*   `test_automation_systemic.js`
*   `test_reminders.js`
*   `verify-phase5.js` / `verify-phase6.js`

These scripts operate as direct integration or smoke tests triggering particular backend functions or endpoints directly via Node to prove core capabilities persist over broad development phases.

## Missing Tests
- **Frontend Unit Testing:** Complete lack of React Testing Library configurations for component assertion mapping. Important modular modals (like `GeneratePayrollModal` or `CreateTaskModal`) have no baseline logical guardrails stopping refactoring breaks.
- **API Unit Testing:** Supertest coverage checking boundary conditions against the 40+ PostgreSQL Prisma entities does not exist.
- **End-to-End Testing:** No automated click-path tests ensure the complex navigation structure (Company Isolation Login -> Dashboard -> Project Mapping) works smoothly across browser instances.

## QA Gaps
- **Continuous Integration:** CI pipelines (GitHub Actions / GitLab CI) are disconnected. Code deployment currently pushes raw into Edge hosts (Vercel) allowing the Next.js compiler to operate as the sole final boundary identifying syntax errors.
- **Dependency Analytics:** There is minimal tooling running deep audits automatically tracking outdated package vulnerabilities spanning the `node_modules`.
