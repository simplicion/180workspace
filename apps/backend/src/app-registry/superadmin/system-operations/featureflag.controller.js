'use strict';

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

exports.list = async (req, res) => {
    try {
        let flags = await req.prisma.featureFlag.findMany({
            orderBy: [{ category: 'asc' }, { label: 'asc' }]
        });
        
        // Seed defaults if empty
        if (flags.length === 0) {
            await req.prisma.featureFlag.createMany({
                data: DEFAULT_FLAGS
            });
            flags = await req.prisma.featureFlag.findMany({
                orderBy: [{ category: 'asc' }, { label: 'asc' }]
            });
        }
        res.json({ flags });
    } catch (err) {
        console.error('[FeatureFlag Controller] list error:', err);
        res.status(500).json({ error: 'Failed to fetch feature flags' });
    }
};

exports.create = async (req, res) => {
    try {
        const flag = await req.prisma.featureFlag.create({ 
            data: { ...req.body, updatedBy: req.superAdmin.id }
        });
        res.status(201).json({ flag });
    } catch (err) {
        console.error('[FeatureFlag Controller] create error:', err);
        if (err.code === 'P2002') return res.status(400).json({ error: 'Flag key already exists' });
        res.status(500).json({ error: 'Failed to create flag' });
    }
};

exports.toggle = async (req, res) => {
    try {
        const flag = await req.prisma.featureFlag.findUnique({ where: { id: req.params.id } });
        if (!flag) return res.status(404).json({ error: 'Flag not found' });
        
        const updatedFlag = await req.prisma.featureFlag.update({
            where: { id: req.params.id },
            data: { 
                isEnabled: !flag.isEnabled,
                updatedBy: req.superAdmin.id
            }
        });
        res.json({ flag: updatedFlag });
    } catch (err) {
        console.error('[FeatureFlag Controller] toggle error:', err);
        res.status(500).json({ error: 'Failed to toggle flag' });
    }
};

exports.remove = async (req, res) => {
    try {
        await req.prisma.featureFlag.delete({ where: { id: req.params.id } });
        res.json({ message: 'Feature flag deleted' });
    } catch (err) {
        console.error('[FeatureFlag Controller] remove error:', err);
        if (err.code === 'P2025') return res.status(404).json({ error: 'Flag not found' });
        res.status(500).json({ error: 'Failed to delete flag' });
    }
};
