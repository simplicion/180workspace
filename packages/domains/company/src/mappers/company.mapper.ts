export class CompanyMapper {
    static toPublicProfile(company: any, privacySettingsRaw?: any) {
        if (!company) return null;

        const publicCompany = { ...company };

        // Strip sensitive core fields
        delete publicCompany.adminPasswordHash;
        delete publicCompany.adminEmail;
        delete publicCompany.adminPhone;
        delete publicCompany.subscriptionStatus;
        delete publicCompany.accountStatus;
        delete publicCompany.mandateStatus;
        delete publicCompany.apiKey;

        let privacySettings: any = {};
        if (privacySettingsRaw) {
            privacySettings = privacySettingsRaw;
        } else {
            try {
                privacySettings = typeof company.privacySettings === 'string' 
                    ? JSON.parse(company.privacySettings) 
                    : (company.privacySettings || {});
            } catch (e) {
                privacySettings = {};
            }
        }

        // Strip fields marked as private
        const sensitiveFields = [
            'totalFunding', 'fundingStage', 'businessStatus', 'burnRate', 'runway', 
            'annualRevenue', 'revenueGrowth', 'lastRound', 'lastValued', 'leadInvestor'
        ];

        for (const field of sensitiveFields) {
            if (privacySettings[field] === false || privacySettings[field] === 'private') {
                delete publicCompany[field];
            }
        }

        return publicCompany;
    }
}
