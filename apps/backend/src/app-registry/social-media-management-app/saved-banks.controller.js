const { prisma } = require('@workspace/db');

class SavedBanksController {
    static async getBanks(req, res) {
        try {
            const { companyId } = req.user;
            const banks = await prisma.savedBank.findMany({
                where: { companyId },
                orderBy: { createdAt: 'desc' }
            });
            return res.json({ success: true, banks });
        } catch (error) {
            console.error('Error fetching banks:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch saved banks' });
        }
    }

    static async createBank(req, res) {
        try {
            const { companyId } = req.user;
            const { type, name, content, tags } = req.body;
            
            if (!type || !name || !content) {
                return res.status(400).json({ success: false, message: 'Type, name, and content are required' });
            }

            const bank = await prisma.savedBank.create({
                data: {
                    companyId,
                    type,
                    name,
                    content,
                    tags: tags || []
                }
            });
            return res.json({ success: true, bank });
        } catch (error) {
            console.error('Error creating bank:', error);
            return res.status(500).json({ success: false, message: 'Failed to create saved bank' });
        }
    }

    static async deleteBank(req, res) {
        try {
            const { companyId } = req.user;
            const { id } = req.params;

            const bank = await prisma.savedBank.findUnique({ where: { id } });
            if (!bank || bank.companyId !== companyId) {
                return res.status(404).json({ success: false, message: 'Bank not found' });
            }

            await prisma.savedBank.delete({ where: { id } });
            return res.json({ success: true, message: 'Bank deleted' });
        } catch (error) {
            console.error('Error deleting bank:', error);
            return res.status(500).json({ success: false, message: 'Failed to delete saved bank' });
        }
    }
}

module.exports = { SavedBanksController };
