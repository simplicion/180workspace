import { prisma } from '@workspace/db';

export interface AuditContext {
  /** IP address of the request (optional) */
  ipAddress?: string;
  /** User-Agent header (optional) */
  userAgent?: string;
  /** Company ID for multi-tenant scoping */
  companyId?: string | null;
}

/**
 * Log an action to the AuditLog table.
 *
 * This is the canonical, domain-safe way to record audit events.
 * It never throws — audit logging must never break the main flow.
 */
export async function logAction(
  userId: string,
  action: string,
  resourceType: string = '',
  resourceId: string = '',
  details: Record<string, unknown> = {},
  context: AuditContext = {}
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resourceType,
        resourceId: resourceId ? String(resourceId) : '',
        details: (details || {}) as any,
        ipAddress: context.ipAddress || '',
        userAgent: context.userAgent || '',
        companyId: context.companyId ?? null,
      },
    });
  } catch (err: any) {
    // Never throw — audit logging should never break the main flow
    console.error('[Audit] Failed to log action:', err.message);
  }
}
