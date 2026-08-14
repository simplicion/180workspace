'use strict';

exports.getTransactions = async (req, res, next) => {
    try {
        const CompanyTransaction = req.prisma.companyTransaction;
        
        // Ensure user belongs to a company
        if (!req.user || !req.user.companyId) {
            return res.status(403).json({ success: false, message: 'Unauthorized access.' });
        }

        const transactions = await CompanyTransaction.findMany({
            where: { companyId: req.user.companyId },
            include: {
                client: { select: { name: true, company: true } },
                user: { select: { name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({ success: true, count: transactions.length, data: transactions });
    } catch (error) {
        next(error);
    }
};

exports.getLedgerKPIs = async (req, res, next) => {
    try {
        const CompanyTransaction = req.prisma.companyTransaction;
        
        if (!req.user || !req.user.companyId) {
            return res.status(403).json({ success: false, message: 'Unauthorized access.' });
        }

        const companyId = req.user.companyId;
        const now = new Date();
        
        const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        // Fetch all transactions for this company
        const allTransactions = await CompanyTransaction.findMany({
            where: { companyId }
        });

        let currentMonthIn = 0, currentMonthOut = 0;
        let prevMonthIn = 0, prevMonthOut = 0;
        let totalIn = 0, totalOut = 0;

        allTransactions.forEach(t => {
            const isCredit = ['credit', 'income', 'sales'].includes(t.type.toLowerCase());
            const amount = t.amount || 0;
            const tDate = new Date(t.createdAt);

            if (isCredit) {
                totalIn += amount;
                if (tDate >= firstDayCurrentMonth) currentMonthIn += amount;
                else if (tDate >= firstDayPreviousMonth && tDate < firstDayCurrentMonth) prevMonthIn += amount;
            } else { // debit / expense / purchase
                totalOut += amount;
                if (tDate >= firstDayCurrentMonth) currentMonthOut += amount;
                else if (tDate >= firstDayPreviousMonth && tDate < firstDayCurrentMonth) prevMonthOut += amount;
            }
        });

        const currentCashFlow = currentMonthIn - currentMonthOut;
        const prevCashFlow = prevMonthIn - prevMonthOut;
        
        const calcGrowth = (current, prev) => {
            if (prev === 0) return current > 0 ? 100 : 0;
            return ((current - prev) / prev) * 100;
        };

        const kpis = {
            totalCashFlow: {
                value: totalIn - totalOut,
                currentMonth: currentCashFlow,
                growth: calcGrowth(currentCashFlow, prevCashFlow)
            },
            totalIn: {
                value: totalIn,
                currentMonth: currentMonthIn,
                growth: calcGrowth(currentMonthIn, prevMonthIn)
            },
            totalOut: {
                value: totalOut,
                currentMonth: currentMonthOut,
                growth: calcGrowth(currentMonthOut, prevMonthOut)
            },
            netProfit: {
                value: totalIn - totalOut,
                currentMonth: currentMonthIn - currentMonthOut,
                growth: calcGrowth(currentMonthIn - currentMonthOut, prevMonthIn - prevMonthOut)
            }
        };

        res.status(200).json({ success: true, data: kpis });
    } catch (error) {
        next(error);
    }
};

exports.addTransaction = async (req, res, next) => {
    try {
        const CompanyTransaction = req.prisma.companyTransaction;
        
        if (!req.user || !req.user.companyId) {
            return res.status(403).json({ success: false, message: 'Unauthorized access.' });
        }

        const { type, amount, currency, metadata, provider, referenceModel, referenceId } = req.body;

        const transaction = await CompanyTransaction.create({
            data: {
                companyId: req.user.companyId,
                type: type || 'credit',
                amount: parseFloat(amount),
                currency: currency || 'USD',
                status: 'completed',
                provider: provider || 'manual',
                referenceModel: referenceModel || 'manual',
                referenceId: referenceId || 'manual',
                metadata: metadata || {}
            }
        });

        res.status(201).json({ success: true, data: transaction });
    } catch (error) {
        next(error);
    }
};
