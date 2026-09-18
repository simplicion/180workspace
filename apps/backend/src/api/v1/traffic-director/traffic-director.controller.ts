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

  static async verifyTagInstallation(req: Request, res: Response) {
    try {
      const { url, slug } = req.body || {};
      if (!url || typeof url !== 'string' || !url.trim()) {
        return res.status(400).json({ success: false, error: 'URL is required' });
      }
      if (!slug || typeof slug !== 'string' || !slug.trim()) {
        return res.status(400).json({ success: false, error: 'Slug is required' });
      }

      let targetUrl = url.trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = `https://${targetUrl}`;
      }

      const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      const startTime = Date.now();

      // Check 1: Verify Smart Link exists in our platform
      const link = await TrafficLinksService.getLinkBySlug(cleanSlug);
      const linkExists = Boolean(link);

      const checks: Array<{
        name: string;
        status: 'passed' | 'warning' | 'failed';
        message: string;
      }> = [];

      // Add Link Existence Check
      if (linkExists) {
        checks.push({
          name: 'Link Configuration',
          status: 'passed',
          message: `Smart Link "/r/${cleanSlug}" is active with ${link?.rules?.length || 0} rule(s) and fallback target.`
        });
      } else {
        checks.push({
          name: 'Link Configuration',
          status: 'failed',
          message: `Smart Link with slug "${cleanSlug}" was not found in the database. Please create the link first.`
        });
      }

      // Fetch the landing page
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      try {
        const pageRes = await fetch(targetUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 180workspace-Tag-Verifier/1.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        });
        clearTimeout(timeoutId);

        const latencyMs = Date.now() - startTime;
        const statusCode = pageRes.status;

        // Check 2: HTTP Reachability
        if (statusCode >= 200 && statusCode < 400) {
          checks.push({
            name: 'Page Reachability',
            status: 'passed',
            message: `Website reached successfully (HTTP ${statusCode}) in ${latencyMs}ms.`
          });
        } else {
          checks.push({
            name: 'Page Reachability',
            status: 'failed',
            message: `Website returned error status HTTP ${statusCode}. Ensure your page is published and publicly accessible.`
          });
        }

        const html = await pageRes.text();
        const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
        const headContent = headMatch ? headMatch[1] : '';
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        const bodyContent = bodyMatch ? bodyMatch[1] : html;

        // Check 3: Script Tag Detection (in head vs body)
        const tagPattern = new RegExp(`tag/${cleanSlug}(\\.js)?|evaluate/${cleanSlug}`, 'i');
        const inHead = tagPattern.test(headContent);
        const inBody = tagPattern.test(bodyContent) || tagPattern.test(html);

        if (inHead) {
          checks.push({
            name: 'Tag Detection & Head Placement',
            status: 'passed',
            message: 'Tag script is properly installed inside <head> for zero-flicker instant redirection.'
          });
        } else if (inBody) {
          checks.push({
            name: 'Tag Detection & Head Placement',
            status: 'warning',
            message: 'Tag script was found, but placed inside <body>. We recommend moving it into <head> for faster execution before page render.'
          });
        } else {
          checks.push({
            name: 'Tag Detection & Head Placement',
            status: 'failed',
            message: `Could not find the script tag matching "/tag/${cleanSlug}.js" or inline shield code in this page HTML.`
          });
        }

        // Check 4: Async / Defer Optimization
        if (inHead || inBody) {
          const scriptTagMatch = html.match(new RegExp(`<script[^>]*tag/${cleanSlug}[^>]*>`, 'i'));
          if (scriptTagMatch && /async|defer/i.test(scriptTagMatch[0])) {
            checks.push({
              name: 'Non-Blocking Execution',
              status: 'passed',
              message: 'Script tag includes "async" attribute to prevent blocking safe page rendering for review bots.'
            });
          } else {
            checks.push({
              name: 'Non-Blocking Execution',
              status: 'warning',
              message: 'Script tag is missing "async". Add async attribute (<script src="..." async></script>) for better compliance.'
            });
          }
        }

        const isFullyVerified = checks.every(c => c.status !== 'failed');

        return res.json({
          success: true,
          verified: isFullyVerified,
          url: targetUrl,
          statusCode,
          latencyMs,
          checks,
          summary: isFullyVerified
            ? 'All diagnostics passed! Your safe landing page is fully protected and ready for Meta / Google Ads review.'
            : 'One or more diagnostic checks require your attention.'
        });

      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        checks.push({
          name: 'Page Reachability',
          status: 'failed',
          message: `Network error connecting to ${targetUrl}: ${fetchError.message || 'Connection timeout or invalid domain'}. If testing a local file, ensure it is served over http:// (e.g. VS Code Live Server).`
        });

        return res.json({
          success: true,
          verified: false,
          url: targetUrl,
          checks,
          summary: 'Could not connect to the provided URL.'
        });
      }

    } catch (error: any) {
      console.error('[TrafficDirectorController.verifyTagInstallation]', error);
      return res.status(500).json({ success: false, error: 'Verification error' });
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
        warmupUntil, rampUpEnabled, rampUpDurationHours, shieldMode, datacenterBlocked,
        safePageProxyMode
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
        datacenterBlocked,
        safePageProxyMode
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

  static async bulkDeleteLinks(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || (req as any).company?.id || (req as any).user?.companyId;
      const linkIds = req.body.linkIds || req.body.ids || [];
      if (!Array.isArray(linkIds) || linkIds.length === 0) {
        return res.status(400).json({ success: false, error: 'Please provide linkIds to delete' });
      }

      let deletedCount = 0;
      for (const linkId of linkIds) {
        try {
          await TrafficLinksService.deleteLink(companyId, linkId);
          deletedCount++;
        } catch (e) {}
      }
      return res.json({ success: true, message: `Successfully deleted ${deletedCount} links`, count: deletedCount });
    } catch (error: any) {
      console.error('[TrafficDirectorController.bulkDeleteLinks]', error);
      return res.status(400).json({ success: false, error: error.message || 'Failed to delete links' });
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
  static async getLinkAnalytics(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || (req as any).company?.id || (req as any).user?.companyId;
      const linkId = String(req.params.linkId);
      const { timeRange, startDate, endDate, country, routingAction, isBot, deviceType } = req.query;

      const result = await TrafficAnalyticsService.getLinkAnalytics(companyId, linkId, {
        timeRange: (timeRange as any) || 'today',
        startDate: startDate ? String(startDate) : undefined,
        endDate: endDate ? String(endDate) : undefined,
        country: country ? String(country) : undefined,
        routingAction: (routingAction as any) || 'all',
        isBot: isBot !== undefined ? isBot === 'true' : undefined,
        deviceType: deviceType ? String(deviceType) : undefined
      });

      return res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[TrafficDirectorController.getLinkAnalytics]', error);
      return res.status(error.message?.includes('not found') ? 404 : 500).json({ 
        success: false, 
        error: error.message || 'Failed to fetch link analytics' 
      });
    }
  }

  static async getOverviewStats(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || (req as any).company?.id || (req as any).user?.companyId;
      const { timeRange, startDate, endDate } = req.query;

      const result = await TrafficAnalyticsService.getOverviewStats(companyId, {
        timeRange: (timeRange as any) || 'today',
        startDate: startDate ? String(startDate) : undefined,
        endDate: endDate ? String(endDate) : undefined
      });
      return res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[TrafficDirectorController.getOverviewStats]', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch analytics' });
    }
  }

  static async getLogs(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId || (req as any).company?.id || (req as any).user?.companyId;
      const { linkId, isBot, timeRange, startDate, endDate, action, country, deviceType, search, page, limit } = req.query;

      const result = await TrafficAnalyticsService.getLogs(companyId, {
        linkId: linkId ? String(linkId) : undefined,
        isBot: isBot !== undefined ? isBot === 'true' : undefined,
        timeRange: (timeRange as any) || undefined,
        startDate: startDate ? String(startDate) : undefined,
        endDate: endDate ? String(endDate) : undefined,
        action: (action as any) || undefined,
        country: country ? String(country) : undefined,
        deviceType: deviceType ? String(deviceType) : undefined,
        search: search ? String(search) : undefined,
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
