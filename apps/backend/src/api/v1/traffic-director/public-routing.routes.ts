import { Router } from 'express';
import { PublicRoutingController } from './public-routing.controller';

const router = Router();

// Fast Public Redirect Route (/r/:slug)
router.get('/_proxy/stream', PublicRoutingController.handleProxyStream);
router.get('/:slug', PublicRoutingController.handleRedirect);
router.get('/shield/:slug', PublicRoutingController.handleShieldRoute);
router.get('/tag/:slug', PublicRoutingController.handleDynamicTag);
router.post('/evaluate/:slug', PublicRoutingController.handleEdgeEvaluate);

export default router;

