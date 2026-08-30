import { Request, Response } from 'express';
import {
  SignalExtractor,
  DecisionEngine,
  TrafficLinksService,
  TrafficAnalyticsService,
  ClientShieldGenerator
} from '@workspace/traffic-director';

export class PublicRoutingController {
  static async handleRedirect(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      if (!slug) {
        return res.status(404).send('Not Found');
      }

      // 1. Fetch Link with Active Rules
      const link = await TrafficLinksService.getLinkBySlug(slug);
      if (!link) {
        return res.status(404).send('Smart Link Not Found');
      }

      // If link is configured for client-side shield, render the shield probe page
      if (link.shieldMode === 'client_shield') {
        return PublicRoutingController.handleShieldRoute(req, res);
      }

      // 2. Extract Signals from Client Request
      const signals = SignalExtractor.extractFromRequest(req);

      // 3. Evaluate Rule Matrix
      const result = DecisionEngine.evaluate(
        {
          id: link.id,
          fallbackUrl: link.fallbackUrl,
          isActive: link.isActive,
          warmupUntil: link.warmupUntil,
          rampUpEnabled: link.rampUpEnabled,
          rampUpDurationHours: link.rampUpDurationHours,
          datacenterBlocked: link.datacenterBlocked,
          rules: link.rules
        },
        signals
      );

      // 4. Asynchronous Non-Blocking Log Ingestion
      setImmediate(async () => {
        try {
          await TrafficAnalyticsService.recordTrafficLog(link.id, result, signals);
        } catch (err) {
          console.error('[PublicRoutingController] Async log error:', err);
        }
      });

      // 5. Append query params from original request if present
      let finalDestination = result.destinationUrl;
      const originalQuery = req.url.includes('?') ? req.url.split('?')[1] : '';
      if (originalQuery) {
        const separator = finalDestination.includes('?') ? '&' : '?';
        finalDestination = `${finalDestination}${separator}${originalQuery}`;
      }

      // 6. Execute Redirect
      const statusCode = result.actionType === 'redirect_301' 
        ? 301 
        : (result.actionType === 'redirect_307' ? 307 : 302);

      // Add no-cache headers so dynamic routing is re-evaluated on each request
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      return res.redirect(statusCode, finalDestination);
    } catch (error: any) {
      console.error('[PublicRoutingController.handleRedirect]', error);
      return res.status(500).send('Routing Error');
    }
  }

  static async handleShieldRoute(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const link = await TrafficLinksService.getLinkBySlug(slug);
      if (!link) {
        return res.status(404).send('Smart Link Not Found');
      }

      const signals = SignalExtractor.extractFromRequest(req);
      const result = DecisionEngine.evaluate(
        {
          id: link.id,
          fallbackUrl: link.fallbackUrl,
          isActive: link.isActive,
          warmupUntil: link.warmupUntil,
          rampUpEnabled: link.rampUpEnabled,
          rampUpDurationHours: link.rampUpDurationHours,
          datacenterBlocked: link.datacenterBlocked,
          rules: link.rules
        },
        signals
      );

      // Async log
      setImmediate(async () => {
        try {
          await TrafficAnalyticsService.recordTrafficLog(link.id, result, signals);
        } catch (err) {
          console.error('[PublicRoutingController.shield] Async log error:', err);
        }
      });

      let finalDestination = result.destinationUrl;
      const originalQuery = req.url.includes('?') ? req.url.split('?')[1] : '';
      if (originalQuery) {
        const separator = finalDestination.includes('?') ? '&' : '?';
        finalDestination = `${finalDestination}${separator}${originalQuery}`;
      }

      const html = ClientShieldGenerator.generateShieldHtml({
        slug: link.slug,
        linkName: link.name,
        targetUrl: finalDestination,
        fallbackUrl: link.fallbackUrl,
        datacenterBlocked: link.datacenterBlocked
      });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res.send(html);
    } catch (error: any) {
      console.error('[PublicRoutingController.handleShieldRoute]', error);
      return res.status(500).send('Shield Error');
    }
  }

  static async handleDynamicTag(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const cleanSlug = slug.replace(/\.js$/, '');
      const link = await TrafficLinksService.getLinkBySlug(cleanSlug);
      if (!link) {
        return res.status(404).type('application/javascript').send('// Smart Link Not Found');
      }

      const signals = SignalExtractor.extractFromRequest(req);
      const result = DecisionEngine.evaluate(
        {
          id: link.id,
          fallbackUrl: link.fallbackUrl,
          isActive: link.isActive,
          warmupUntil: link.warmupUntil,
          rampUpEnabled: link.rampUpEnabled,
          rampUpDurationHours: link.rampUpDurationHours,
          datacenterBlocked: link.datacenterBlocked,
          rules: link.rules
        },
        signals
      );

      const scriptJs = ClientShieldGenerator.generateEmbedTagJs({
        slug: link.slug,
        targetUrl: result.destinationUrl,
        fallbackUrl: link.fallbackUrl
      });

      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res.send(scriptJs);
    } catch (error: any) {
      console.error('[PublicRoutingController.handleDynamicTag]', error);
      return res.status(500).type('application/javascript').send('// Dynamic Tag Error');
    }
  }
}

