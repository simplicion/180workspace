import { Request, Response } from 'express';

/**
 * Triggered by the Admin Panel when CMS content is published.
 * This webhook calls the hosting provider (e.g. Vercel/Cloudflare) 
 * to trigger a new static build of the marketing site.
 */
export const rebuildMarketingSite = async (req: Request, res: Response) => {
  try {
    const deployHookUrl = process.env.MARKETING_SITE_DEPLOY_HOOK_URL;
    
    if (!deployHookUrl) {
      console.warn("MARKETING_SITE_DEPLOY_HOOK_URL is not configured.");
      // In local dev, we might not have a webhook URL.
      return res.status(200).json({ 
        success: true, 
        message: 'Rebuild acknowledged, but no deploy hook URL is configured.' 
      });
    }

    // Call the deploy hook
    const response = await fetch(deployHookUrl, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error(`Deploy hook failed with status ${response.status}`);
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Marketing site rebuild triggered successfully.' 
    });
  } catch (error) {
    console.error('Error triggering marketing site rebuild:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to trigger marketing site rebuild.' 
    });
  }
};
