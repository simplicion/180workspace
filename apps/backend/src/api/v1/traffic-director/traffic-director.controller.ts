import { Request, Response } from 'express';
import { 
  TrafficLinksService, 
  TrafficRulesService, 
  TrafficAnalyticsService, 
  TrafficSimulatorService 
} from '@workspace/traffic-director';

export class TrafficDirectorController {
  // ─── Links ─────────────────────────────────────────────────────────
  static async getLinks(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || (req as any).company?.id || (req as any).user?.companyId;
      const { page, limit, search, isActive } = req.query;

      const result = await TrafficLinksService.getLinks(companyId, {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        search: search ? String(search) : undefined,
        isActive: isActive !== undefined ? isActive === 'true' : undefined
      });

      return res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[TrafficDirectorController.getLinks]', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch links' });
    }
  }

  static async checkSlug(req: Request, res: Response) {
    try {
      const slug = String(req.query.slug || '');
      const excludeLinkId = req.query.excludeLinkId ? String(req.query.excludeLinkId) : undefined;
      const result = await TrafficLinksService.checkSlugAvailability(slug, excludeLinkId);
      return res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[TrafficDirectorController.checkSlug]', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to check slug' });
    }
  }

  static async getLinkById(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || (req as any).company?.id || (req as any).user?.companyId;
      const linkId = String(req.params.linkId);

      const result = await TrafficLinksService.getLinkById(companyId, linkId);
      return res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[TrafficDirectorController.getLinkById]', error);
      return res.status(404).json({ success: false, error: error.message || 'Link not found' });
    }
  }

  static async createLink(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || (req as any).company?.id || (req as any).user?.companyId;
      const { 
        name, slug, description, fallbackUrl, customDomain, tags,
        warmupUntil, rampUpEnabled, rampUpDurationHours, shieldMode, datacenterBlocked
      } = req.body;

      if (!name || !slug || !fallbackUrl) {
        return res.status(400).json({ success: false, error: 'Name, slug, and fallbackUrl are required' });
      }

      const result = await TrafficLinksService.createLink(companyId, {
        companyId,
        name,
        slug,
        description,
        fallbackUrl,
        customDomain,
        tags,
        warmupUntil,
        rampUpEnabled,
        rampUpDurationHours,
        shieldMode,
        datacenterBlocked
      });

      return res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      console.error('[TrafficDirectorController.createLink]', error);
      return res.status(400).json({ success: false, error: error.message || 'Failed to create link' });
    }
  }

  static async updateLink(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || (req as any).company?.id || (req as any).user?.companyId;
      const linkId = String(req.params.linkId);

      const result = await TrafficLinksService.updateLink(companyId, linkId, req.body);
      return res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[TrafficDirectorController.updateLink]', error);
      return res.status(400).json({ success: false, error: error.message || 'Failed to update link' });
    }
  }

  static async deleteLink(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || (req as any).company?.id || (req as any).user?.companyId;
      const linkId = String(req.params.linkId);

      await TrafficLinksService.deleteLink(companyId, linkId);
      return res.json({ success: true, message: 'Link deleted successfully' });
    } catch (error: any) {
      console.error('[TrafficDirectorController.deleteLink]', error);
      return res.status(400).json({ success: false, error: error.message || 'Failed to delete link' });
    }
  }

  static async checkSlug(req: Request, res: Response) {
    try {
      const { slug, excludeLinkId } = req.query;
      if (!slug) {
        return res.status(400).json({ success: false, error: 'Slug parameter is required' });
      }

      const result = await TrafficLinksService.checkSlugAvailability(
        String(slug), 
        excludeLinkId ? String(excludeLinkId) : undefined
      );
      return res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[TrafficDirectorController.checkSlug]', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // ─── Rules ────────────────────────────────────────────────────────
  static async getRules(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || (req as any).company?.id || (req as any).user?.companyId;
      const linkId = String(req.params.linkId);

      const result = await TrafficRulesService.getRulesByLinkId(companyId, linkId);
      return res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[TrafficDirectorController.getRules]', error);
      return res.status(404).json({ success: false, error: error.message || 'Rules not found' });
    }
  }

  static async createRule(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || (req as any).company?.id || (req as any).user?.companyId;
      const linkId = String(req.params.linkId);
      const { name, destinationUrl, actionType, conditions, weight, priority, isActive } = req.body;

      if (!name || !destinationUrl) {
        return res.status(400).json({ success: false, error: 'Name and destinationUrl are required' });
      }

      const result = await TrafficRulesService.createRule(companyId, {
        linkId,
        name,
        destinationUrl,
        actionType,
        conditions: conditions || [],
        weight: weight !== undefined ? Number(weight) : 100,
        priority,
        isActive
      });

      return res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      console.error('[TrafficDirectorController.createRule]', error);
      return res.status(400).json({ success: false, error: error.message || 'Failed to create rule' });
    }
  }

  static async updateRule(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || (req as any).company?.id || (req as any).user?.companyId;
      const ruleId = String(req.params.ruleId);

      const result = await TrafficRulesService.updateRule(companyId, ruleId, req.body);
      return res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[TrafficDirectorController.updateRule]', error);
      return res.status(400).json({ success: false, error: error.message || 'Failed to update rule' });
    }
  }

  static async deleteRule(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || (req as any).company?.id || (req as any).user?.companyId;
      const ruleId = String(req.params.ruleId);

      await TrafficRulesService.deleteRule(companyId, ruleId);
      return res.json({ success: true, message: 'Rule deleted successfully' });
    } catch (error: any) {
      console.error('[TrafficDirectorController.deleteRule]', error);
      return res.status(400).json({ success: false, error: error.message || 'Failed to delete rule' });
    }
  }

  static async reorderRules(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || (req as any).company?.id || (req as any).user?.companyId;
      const linkId = String(req.params.linkId);
      const { orderedRuleIds } = req.body;

      if (!Array.isArray(orderedRuleIds)) {
        return res.status(400).json({ success: false, error: 'orderedRuleIds array is required' });
      }

      const result = await TrafficRulesService.reorderRules(companyId, linkId, orderedRuleIds.map(String));
      return res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[TrafficDirectorController.reorderRules]', error);
      return res.status(400).json({ success: false, error: error.message || 'Failed to reorder rules' });
    }
  }

  // ─── Analytics & Simulator ─────────────────────────────────────────
  static async getOverviewStats(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || (req as any).company?.id || (req as any).user?.companyId;
      const result = await TrafficAnalyticsService.getOverviewStats(companyId);
      return res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[TrafficDirectorController.getOverviewStats]', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch analytics' });
    }
  }

  static async getLogs(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || (req as any).company?.id || (req as any).user?.companyId;
      const { linkId, isBot, page, limit } = req.query;

      const result = await TrafficAnalyticsService.getLogs(companyId, {
        linkId: linkId ? String(linkId) : undefined,
        isBot: isBot !== undefined ? isBot === 'true' : undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 50
      });

      return res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[TrafficDirectorController.getLogs]', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch logs' });
    }
  }

  static async simulate(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || (req as any).company?.id || (req as any).user?.companyId;
      const result = await TrafficSimulatorService.simulate(companyId, req.body);
      return res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[TrafficDirectorController.simulate]', error);
      return res.status(400).json({ success: false, error: error.message || 'Simulation failed' });
    }
  }
}
