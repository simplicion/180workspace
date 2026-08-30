import { Request, Response, NextFunction } from 'express';
import { DomainsService } from '@workspace/public';

// Centralized Domain Controller (Subdomains & Custom Domains) - v2 reload

export const addCustomDomain = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.headers['x-company-id'] as string || req.body.companyId;
    const { domain, type, targetId } = req.body;

    if (!domain || !type || !targetId) {
      return res.status(400).json({ error: 'domain, type, and targetId are required fields.' });
    }

    const result = await DomainsService.addDomain(companyId || 'default', {
      domain,
      type,
      targetId
    });

    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to add custom domain.' });
  }
};

export const verifyCustomDomain = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.headers['x-company-id'] as string || (req.query.companyId as string) || 'default';
    const domain = req.params.domain || (req.query.domain as string);

    if (!domain) {
      return res.status(400).json({ error: 'Domain parameter is required.' });
    }

    const result = await DomainsService.verifyDomain(companyId, domain);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to verify custom domain.' });
  }
};

export const getCustomDomainStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.headers['x-company-id'] as string || (req.query.companyId as string) || 'default';
    const domain = req.params.domain || (req.query.domain as string);

    if (!domain) {
      return res.status(400).json({ error: 'Domain parameter is required.' });
    }

    const result = await DomainsService.getDomainStatus(companyId, domain);
    if (!result) {
      return res.status(404).json({ error: 'Domain not found.' });
    }

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to fetch domain status.' });
  }
};

export const checkSubdomainAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = (req.query.slug || req.query.subdomain || '') as string;
    const targetId = req.query.targetId as string | undefined;
    const companyId = req.headers['x-company-id'] as string || (req.query.companyId as string) || 'default';

    if (!slug) {
      return res.status(400).json({ error: 'Slug parameter is required.' });
    }

    const result = await DomainsService.checkSubdomainAvailability(slug, {
      targetId,
      companyId
    });

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to check subdomain availability.' });
  }
};

export const removeCustomDomain = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.headers['x-company-id'] as string || (req.body.companyId as string) || 'default';
    const domain = req.params.domain;

    if (!domain) {
      return res.status(400).json({ error: 'Domain parameter is required.' });
    }

    const result = await DomainsService.removeDomain(companyId, domain);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to remove custom domain.' });
  }
};

