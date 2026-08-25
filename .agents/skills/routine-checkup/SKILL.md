---
name: routine-checkup
description: Automated routine checkup for 180workspace architecture best practices, multi-tenancy (companyId) isolation, and code health.
---

# Routine Checkup & Engineering Standards

When the user asks to "run a routine checkup" or "run the routine checkup script", you MUST perform a deep architectural inspection and automated fix across the active domain or specified files.

## 1. Company Isolation & Multi-Tenancy (`requestContext`)
The platform relies heavily on **Implicit Row-Level Security (RLS)** using `AsyncLocalStorage` (`requestContext`). This guarantees robust data isolation at the database level. Our mid-layer middleware (`company-context.ts`) intercepts incoming requests, identifies the `companyId`, and wraps the execution in `requestContext.run()`. As a result, the global `prisma` client acts as a proxy that automatically reads the `companyId` from the context and applies it to all queries invisibly.

**Checkup Actions:**
1. **DEPRECATED `getCompanyPrisma`**: The function `getCompanyPrisma(companyId)` is strictly deprecated across the entire platform. If you find it being used in a `.service.ts`, `.controller.ts`, or any business logic file, **REMOVE IT** and switch to `import { prisma } from '@workspace/db'`.
2. **Remove Hardcoded `companyId`**: Scan `.service.ts`, `.repository.ts`, and controller files. If `companyId` is passed explicitly as an argument into an internal business logic function, remove it from the function signature.
3. **No Explicit Filtering Needed**: You do not need to manually add `where: { companyId }` to database queries. The underlying Prisma proxy automatically applies this filter based on the `requestContext`.
4. **Late Binding Context**: If background jobs, queues, or specific edge cases (like authentication setup) lack a pre-established HTTP request context, you MUST manually wrap the logic in a new context using:
   ```typescript
   import { requestContext, prisma } from '@workspace/db';
   
   await requestContext.run({ companyId: targetCompanyId }, async () => {
       // All nested calls to \`prisma\` will now automatically be scoped to targetCompanyId
       await someService.doWork();
   });
   ```
5. **Robust Execution**: This script guarantees that any newly created file or old created file strictly adheres to this invisible context pattern. The agent running this script should automatically fix issues by ripping out manual `companyId` plumbing and relying on the context proxy.

## 2. Robust Engineering Practices
Ensure the code adheres to senior-level engineering standards:
1. **Single Source of Truth**: Data dependencies like `companyId` or `userId` should flow from the request middleware, not manual client payload injection.
2. **Robust Error Handling**: Never swallow errors (`catch (e) {}`). Ensure `console.error` or a standardized logger captures the stack trace.
3. **No 'any' Abuse**: In new files or during deep refactoring, ensure strict typings are used instead of `any` wherever possible.

## 3. Execution Workflow
When executing this checkup:
1. **Identify**: Determine the domain to check (e.g., `packages/domains/crm-and-sales`).
2. **Pre-Check**: Run `tsc --noEmit` on the package to ensure base health.
3. **Scan**: Use `grep_search` to find `companyId` in `.service.ts` files and verify if they are internal or exceptional.
4. **Refactor**: Apply fixes using the file editing tools carefully.
5. **Verify**: Run `tsc --noEmit` again to verify no regressions or TypeScript errors were introduced.
6. **Report**: Produce a final markdown summary documenting exactly what was checked and what was automatically fixed.
