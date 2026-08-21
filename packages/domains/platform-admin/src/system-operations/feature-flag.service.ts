import { FeatureFlagRepository } from '../repositories/feature-flag.repository';

const DEFAULT_FLAGS = [
    { flagKey: 'enable_ai', label: 'AI Module', description: 'Enable AI document analysis and chat features', category: 'ai' },
    { flagKey: 'enable_chat', label: 'Team Chat', description: 'Enable real-time team chat system', category: 'communication' },
    { flagKey: 'enable_automation', label: 'Automation Module', description: 'Enable workflow automation features', category: 'general' },
    { flagKey: 'enable_google_drive', label: 'Google Drive Storage', description: 'Allow companies to connect Google Drive for storage', category: 'storage' },
    { flagKey: 'enable_cloudinary', label: 'Cloudinary Storage', description: 'Allow companies to use Cloudinary for media uploads', category: 'storage' },
    { flagKey: 'enable_razorpay', label: 'Razorpay Payments', description: 'Enable subscription billing via Razorpay', category: 'billing' },
    { flagKey: 'enable_mfa', label: 'Multi-Factor Authentication', description: 'Enable MFA for all users', category: 'security' },
    { flagKey: 'enable_support_tickets', label: 'Support Tickets', description: 'Allow companies to raise support tickets', category: 'general' },
];

export class FeatureFlagService {
    static async list() {
        let flags = await FeatureFlagRepository.list();
        
        if (flags.length === 0) {
            await FeatureFlagRepository.createMany(DEFAULT_FLAGS);
            flags = await FeatureFlagRepository.list();
        }
        return flags;
    }

    static async create(data: any, adminId: string) {
        return await FeatureFlagRepository.create({ ...data, updatedBy: adminId });
    }

    static async toggle(id: string, adminId: string) {
        const flag = await FeatureFlagRepository.findById(id);
        if (!flag) throw new Error('Flag not found');
        
        return await FeatureFlagRepository.update(id, {
            isEnabled: !flag.isEnabled,
            updatedBy: adminId
        });
    }

    static async remove(id: string) {
        await FeatureFlagRepository.remove(id);
        return true;
    }
}
