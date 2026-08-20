'use strict';
const { VendorService } = require('@workspace/finance');

exports.getVendors = async (req, res, next) => {
    try {
        const data = await VendorService.getVendors(req.user.companyId);
        res.json({ success: true, data });
    } catch (err) { next(err); }
};
exports.createVendor = async (req, res, next) => {
    try {
        const data = await VendorService.createVendor(req.user.companyId, req.body);
        res.json({ success: true, data });
    } catch (err) { next(err); }
};
exports.updateVendor = async (req, res, next) => {
    try {
        const data = await VendorService.updateVendor(req.user.companyId, req.params.id, req.body);
        res.json({ success: true, data });
    } catch (err) { next(err); }
};
exports.getBills = async (req, res, next) => { res.json({ success: true, data: [] }); };
exports.createBill = async (req, res, next) => { res.json({ success: true, data: {} }); };
exports.updateBillStatus = async (req, res, next) => { res.json({ success: true, data: {} }); };
exports.initiatePayout = async (req, res, next) => { res.json({ success: true, data: {} }); };
