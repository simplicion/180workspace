import { Request, Response, NextFunction } from 'express';
import { VendorService } from '@workspace/finance';

export const getVendors = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await VendorService.getVendors();
        res.json({ success: true, data });
    } catch (err) { next(err); }
};

export const createVendor = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await VendorService.createVendor(req.body);
        res.json({ success: true, data });
    } catch (err) { next(err); }
};

export const updateVendor = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await VendorService.updateVendor(req.params.id, req.body);
        res.json({ success: true, data });
    } catch (err) { next(err); }
};

export const getBills = async (req: Request, res: Response, next: NextFunction) => {
  try {
 res.json({ success: true, data: [] }); 
  } catch (error) {
    next(error);
  }
};
export const createBill = async (req: Request, res: Response, next: NextFunction) => {
  try {
 res.json({ success: true, data: {} }); 
  } catch (error) {
    next(error);
  }
};
export const updateBillStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
 res.json({ success: true, data: {} }); 
  } catch (error) {
    next(error);
  }
};
export const initiatePayout = async (req: Request, res: Response, next: NextFunction) => {
  try {
 res.json({ success: true, data: {} }); 
  } catch (error) {
    next(error);
  }
};
