'use strict';

const { prisma } = require('@workspace/db');
const { getIo } = require('../../../system-configs/sockets');
const { ContractService } = require('@workspace/crm-and-sales');

exports.createContract = async (req, res) => {
    try {
        const companyId = req.user?.companyId || req.company?.id || req.user?.company;
        const contract = await ContractService.createContract(req.user, companyId, req.body, req.ip);
        res.status(201).json({ success: true, contract });
    } catch (error) {
        console.error('Error creating contract:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getContracts = async (req, res) => {
    try {
        const companyId = req.user?.companyId || req.company?.id || req.user?.company;
        const contracts = await ContractService.getContracts(companyId);
        res.json({ success: true, contracts });
    } catch (error) {
        console.error('Error fetching contracts:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getContract = async (req, res) => {
    try {
        const companyId = req.user?.companyId || req.company?.id || req.user?.company;
        const contract = await ContractService.getContract(companyId, req.params.id);
        res.json({ success: true, contract });
    } catch (error) {
        if (error.message === 'Not found') return res.status(404).json({ error: 'Not found' });
        console.error('Error getting contract:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.updateContract = async (req, res) => {
    try {
        const companyId = req.user?.companyId || req.company?.id || req.user?.company;
        const contract = await ContractService.updateContract(req.user, companyId, req.params.id, req.body, req.ip);
        res.json({ success: true, contract });
    } catch (error) {
        if (error.message === 'Not found') return res.status(404).json({ error: 'Not found' });
        if (error.message === 'Cannot edit a signed contract') return res.status(400).json({ error: error.message });
        console.error('Error updating contract:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.deleteContract = async (req, res) => {
    try {
        const companyId = req.user?.companyId || req.company?.id || req.user?.company;
        await ContractService.deleteContract(companyId, req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting contract:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.generateShareLink = async (req, res) => {
    try {
        const companyId = req.user?.companyId || req.company?.id || req.user?.company;
        const shareToken = await ContractService.generateShareLink(req.user, companyId, req.params.id, req.ip);
        res.json({ success: true, shareToken });
    } catch (error) {
        if (error.message === 'Not found') return res.status(404).json({ error: 'Not found' });
        console.error('Error generating share link:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// PUBLIC ENDPOINTS FOR CLIENT PORTAL
exports.getContractByToken = async (req, res) => {
    try {
        const contract = await ContractService.getContractByToken(req.params.token, req.ip);
        res.json({ success: true, contract });
    } catch (error) {
        if (error.message === 'Contract not found') return res.status(404).json({ error: 'Contract not found' });
        console.error('Error getting contract by token:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.signContract = async (req, res) => {
    try {
        const contract = await ContractService.signContract(req.params.token, req.body, req.ip, req.headers['user-agent'], getIo);
        res.json({ success: true, contract });
    } catch (error) {
        if (error.message === 'Contract not found') return res.status(404).json({ error: 'Contract not found' });
        if (error.message === 'Already signed') return res.status(400).json({ error: 'Already signed' });
        console.error('Error signing contract:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

