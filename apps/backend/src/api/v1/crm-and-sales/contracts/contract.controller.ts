import { Request, Response, NextFunction } from 'express';
import { ContractService } from '@workspace/crm-and-sales';

export const createContract = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId || (req as any).company?.id || (req as any).user?.company;
        const contract = await ContractService.createContract((req as any).user, companyId, req.body, req.ip);
        res.status(201).json({ success: true, contract });
    } catch (error) {
  next(error);
}
};

export const getContracts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId || (req as any).company?.id || (req as any).user?.company;
        const contracts = await ContractService.getContracts(companyId);
        res.json({ success: true, contracts });
    } catch (error) {
  next(error);
}
};

export const getContract = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId || (req as any).company?.id || (req as any).user?.company;
        const contract = await ContractService.getContract(companyId, req.params.id);
        res.json({ success: true, contract });
    } catch (error: any) {
  next(error);
}
};

export const updateContract = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId || (req as any).company?.id || (req as any).user?.company;
        const contract = await ContractService.updateContract((req as any).user, companyId, req.params.id, req.body, req.ip);
        res.json({ success: true, contract });
    } catch (error: any) {
  next(error);
}
};

export const deleteContract = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId || (req as any).company?.id || (req as any).user?.company;
        await ContractService.deleteContract(companyId, req.params.id);
        res.json({ success: true });
    } catch (error) {
  next(error);
}
};

export const generateShareLink = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId || (req as any).company?.id || (req as any).user?.company;
        const shareToken = await ContractService.generateShareLink((req as any).user, companyId, req.params.id, req.ip);
        res.json({ success: true, shareToken });
    } catch (error: any) {
  next(error);
}
};

// PUBLIC ENDPOINTS FOR CLIENT PORTAL
export const getContractByToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const contract = await ContractService.getContractByToken(req.params.token, req.ip);
        res.json({ success: true, contract });
    } catch (error: any) {
  next(error);
}
};

export const signContract = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const contract = await ContractService.signContract(req.params.token, req.body, req.ip, req.headers['user-agent'] as string, (global as any).io);
        res.json({ success: true, contract });
    } catch (error: any) {
  next(error);
}
};
