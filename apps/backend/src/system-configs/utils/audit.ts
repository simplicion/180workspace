import { logAction as commonLogAction } from '@workspace/backend-infra';

export const logAction = async (userId: string, action: string, entityType: string, entityId: string, meta: any, req: any) => {
    await commonLogAction(userId, action, entityType, entityId, meta, {
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent'],
        companyId: req?.company?.id || null
    });
};
