import { requestContext } from '@workspace/db';

export class WalletTenantIsolationViolationError extends Error {
  constructor(message: string) {
    super(`[WalletTenantIsolationViolation] ${message}`);
    this.name = 'WalletTenantIsolationViolationError';
  }
}

export class WalletIsolationGuard {
  /**
   * Asserts that companyId is non-empty, defined, and safe.
   * Prevents multi-tenant data cross-contamination or unauthorized access.
   */
  static assertCompany(companyId: unknown, operation = 'wallet_operation'): string {
    if (!companyId || typeof companyId !== 'string' || companyId.trim() === '') {
      throw new WalletTenantIsolationViolationError(
        `Critical security failure: Missing or invalid companyId for ${operation}. Execution blocked to protect multi-tenant isolation.`
      );
    }
    return companyId.trim();
  }

  /**
   * Asserts that the authenticated company matches the target operation company.
   */
  static assertBoundary(authCompanyId: string, targetCompanyId: string, operation = 'boundary_check'): void {
    const safeAuth = this.assertCompany(authCompanyId, `${operation}:auth`);
    const safeTarget = this.assertCompany(targetCompanyId, `${operation}:target`);

    if (safeAuth !== safeTarget) {
      throw new WalletTenantIsolationViolationError(
        `Cross-tenant access breach detected: Auth tenant '${safeAuth}' attempted to access/mutate tenant '${safeTarget}' during ${operation}. Access denied.`
      );
    }
  }

  /**
   * Runs an operation wrapped in the Prisma requestContext for targetCompanyId.
   */
  static async runInTenantContext<T>(companyId: string, fn: () => Promise<T>): Promise<T> {
    const validCompanyId = this.assertCompany(companyId, 'runInTenantContext');
    return requestContext.run({ companyId: validCompanyId }, fn);
  }
}
