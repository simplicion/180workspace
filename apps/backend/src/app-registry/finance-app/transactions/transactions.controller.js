'use strict';
const { TransactionService } = require('@workspace/finance');

exports.getTransactions = async (req, res, next) => {
    try {
        if (!req.user || !req.user.companyId) {
            return res.status(403).json({ success: false, message: 'Unauthorized access.' });
        }

        const transactions = await TransactionService.getTransactions(req.user.companyId);

        res.status(200).json({ success: true, count: transactions.length, data: transactions });
    } catch (error) {
        next(error);
    }
};

exports.getLedgerKPIs = async (req, res, next) => {
    try {
        if (!req.user || !req.user.companyId) {
            return res.status(403).json({ success: false, message: 'Unauthorized access.' });
        }

        const kpis = await TransactionService.getLedgerKPIs(req.user.companyId);

        res.status(200).json({ success: true, data: kpis });
    } catch (error) {
        next(error);
    }
};

exports.addTransaction = async (req, res, next) => {
    try {
        if (!req.user || !req.user.companyId) {
            return res.status(403).json({ success: false, message: 'Unauthorized access.' });
        }

        const transaction = await TransactionService.addTransaction(req.user.companyId, req.body);

        res.status(201).json({ success: true, data: transaction });
    } catch (error) {
        next(error);
    }
};
