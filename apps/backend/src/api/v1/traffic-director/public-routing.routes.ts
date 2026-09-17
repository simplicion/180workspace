import { Router } from 'express';
import { PublicRoutingController } from './public-routing.controller';

const router = Router();

// Fast Public Redirect Route (/r/:slug)
router.all('/_proxy/stream', PublicRoutingController.handleProxyStream);
router.all('/_proxy/asset', PublicRoutingController.handleProxyAsset);
router.all(['/:slug', '/:slug/*'], PublicRoutingController.handleRedirect);
router.all('/shield/:slug', PublicRoutingController.handleShieldRoute);
router.all('/tag/:slug', PublicRoutingController.handleDynamicTag);
router.post('/evaluate/:slug', PublicRoutingController.handleEdgeEvaluate);

export default router;

