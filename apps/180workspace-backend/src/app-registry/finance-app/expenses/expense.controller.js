'use strict';

const { createNotification } = require('../../../platform-core/platform-communications/services/notify.js');
const CategorizationService = require('../finance/CategorizationService.js');

exports.getExpenses = async (req, res, next) => {
    try {
        const Expense = req.prisma.expense;
        const { status, employeeId, projectId, clientId } = req.query;
        const filter = { companyId: req.user.companyId };

        if (req.user.role === 'employee') filter.employeeId = req.user.id;
        else if (employeeId) filter.employeeId = employeeId;

        if (status) filter.status = status;
        if (projectId) filter.projectId = projectId;
        if (clientId) filter.clientId = clientId;

        const expenses = await Expense.findMany({
            where: filter,
            include: {
                employee: { select: { name: true, email: true, department: true } },
                reviewedBy: { select: { name: true } },
                project: { select: { name: true } },
                client: { select: { name: true, company: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const totalAmount = expenses.reduce((s, e) => s + (e.amount || 0), 0);
        res.json({ success: true, expenses, totalAmount });
    } catch (err) { next(err); }
};

exports.createExpense = async (req, res, next) => {
    try {
        const Expense = req.prisma.expense;
        const userId = req.user.id;
        
        const expenseData = {
            ...req.body,
            employeeId: userId,
            companyId: req.user.companyId
        };

        // Validation
        if (!expenseData.title || !expenseData.amount || !expenseData.date) {
            return res.status(400).json({ error: 'Title, amount, and date are required' });
        }
        
        const amount = parseFloat(expenseData.amount);
        if (isNaN(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Amount must be a positive number' });
        }
        expenseData.amount = amount;

        // Auto-categorization logic
        if (!expenseData.category || expenseData.category === 'other') {
            const suggested = CategorizationService.suggestCategory(expenseData.title);
            if (suggested) expenseData.category = suggested;
        }

        const expense = await Expense.create({ data: expenseData });
        res.status(201).json({ success: true, expense });
    } catch (err) { next(err); }
};

exports.reviewExpense = async (req, res, next) => {
    try {
        const Expense = req.prisma.expense;
        const { status, reviewNote } = req.body;
        if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

        const userId = req.user.id;

        const expense = await Expense.update({ 
            where: { id: req.params.id }, 
            data: { status, reviewedById: userId, reviewedAt: new Date(), reviewNote },
            include: { employee: { select: { id: true, name: true, email: true } } }
        });

        if (!expense) return res.status(404).json({ error: 'Not found' });

        // Notify employee
        try {
            await createNotification({
                userId: expense.employee.id,
                type: 'alert',
                title: `Expense ${status === 'approved' ? 'Approved âœ…' : 'Rejected âŒ'}`,
                message: `Your expense claim "${expense.title}" (â‚¹${expense.amount}) was ${status}.`,
                actionUrl: '/dashboard/expenses',
                io: require('../../../system-configs/sockets').getIo(),
            });
        } catch (e) { /* swallow */ }

        res.json({ success: true, expense });
    } catch (err) { next(err); }
};

exports.deleteExpense = async (req, res, next) => {
    try {
        const Expense = req.prisma.expense;
        const userId = req.user.id;
        
        const expense = await Expense.findUnique({ where: { id: req.params.id } });
        if (!expense) return res.status(404).json({ error: 'Not found' });

        if (expense.employeeId !== userId && !['admin', 'hr'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await Expense.delete({ where: { id: req.params.id } });
        res.json({ success: true, message: 'Deleted' });
    } catch (err) { next(err); }
};

exports.uploadReceipt = async (req, res) => {
    if (!req.storageResult) {
        return res.status(400).json({ error: 'No file uploaded or upload failed' });
    }
    res.json({
        success: true,
        fileUrl: req.storageResult.fileUrl,
        storageType: req.storageResult.storageType,
        fileId: req.storageResult.fileId
    });
};
