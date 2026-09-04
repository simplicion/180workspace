import { FeatureFlagRepository } from '../repositories/feature-flag.repository';

const DEFAULT_FLAGS = [
    { name: 'enable_ai', description: 'Enable AI document analysis and chat features', isEnabled: true },
    { name: 'enable_chat', description: 'Enable real-time team chat system', isEnabled: true },
    { name: 'enable_automation', description: 'Enable workflow automation features', isEnabled: true },
    { name: 'enable_google_drive', description: 'Allow companies to connect Google Drive for storage', isEnabled: false },
    { name: 'enable_cloudinary', description: 'Allow companies to use Cloudinary for media uploads', isEnabled: false },
    { name: 'enable_razorpay', description: 'Enable subscription billing via Razorpay', isEnabled: true },
    { name: 'enable_mfa', description: 'Enable MFA for all users', isEnabled: false },
    { name: 'enable_support_tickets', description: 'Allow companies to raise support tickets', isEnabled: true },
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

    static async create(data: any, _adminId?: string) {
        const flagName = data.name || data.key;
        return await FeatureFlagRepository.create({
            name: flagName,
            description: data.description || null,
            isEnabled: data.isEnabled ?? false,
            rules: data.rules ?? undefined
        });
    }

    static async toggle(id: string, _adminId?: string) {
        const flag = await FeatureFlagRepository.findById(id);
        if (!flag) throw new Error('Flag not found');
        
        return await FeatureFlagRepository.update(id, {
            isEnabled: !flag.isEnabled
        });
    }

    static async remove(id: string) {
        await FeatureFlagRepository.remove(id);
        return true;
    }
}

