import { Router } from 'express';
import { TrafficDirectorController } from './traffic-director.controller';

const router = Router();

// Overview & Analytics
router.get('/overview', TrafficDirectorController.getOverviewStats);
router.get('/logs', TrafficDirectorController.getLogs);
router.post('/simulate', TrafficDirectorController.simulate);
router.get('/check-slug', TrafficDirectorController.checkSlug);
router.post('/verify-tag', TrafficDirectorController.verifyTagInstallation);

// Links CRUD
router.get('/links', TrafficDirectorController.getLinks);
router.post('/links', TrafficDirectorController.createLink);
router.get('/links/:linkId', TrafficDirectorController.getLinkById);
router.put('/links/:linkId', TrafficDirectorController.updateLink);
router.delete('/links/:linkId', TrafficDirectorController.deleteLink);

// Rules CRUD
router.get('/links/:linkId/rules', TrafficDirectorController.getRules);
router.post('/links/:linkId/rules', TrafficDirectorController.createRule);
router.put('/rules/:ruleId', TrafficDirectorController.updateRule);
router.delete('/rules/:ruleId', TrafficDirectorController.deleteRule);
router.post('/links/:linkId/rules/reorder', TrafficDirectorController.reorderRules);

export default router;
