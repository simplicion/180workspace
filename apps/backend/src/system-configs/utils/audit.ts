import { logAction as commonLogAction } from '@workspace/backend-infra';

export const logAction = async (userId: string, action: string, entityType: string, entityId: string, meta: any, req: any) => {
    // Attempt to extract location from common cloud headers
    const locationInfo = {
        city: req?.headers?.['x-vercel-ip-city'] || req?.headers?.['cf-ipcity'] || null,
        country: req?.headers?.['x-vercel-ip-country'] || req?.headers?.['cf-ipcountry'] || null,
        region: req?.headers?.['x-vercel-ip-country-region'] || null,
    };
    
    let locationString = null;
    if (locationInfo.city && locationInfo.country) {
        locationString = `${locationInfo.city}, ${locationInfo.country}`;
    } else if (locationInfo.country) {
        locationString = locationInfo.country;
    }

    const enhancedMeta = {
        ...meta,
        ...(locationString ? { location: locationString } : {})
    };

    const ipAddress = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || 
                      req?.headers?.['x-real-ip'] || 
                      req?.ip || 
                      '';

    await commonLogAction(userId, action, entityType, entityId, enhancedMeta, {
        ipAddress: ipAddress,
        userAgent: req?.headers?.['user-agent'],
        companyId: req?.company?.id || null
    });
};
