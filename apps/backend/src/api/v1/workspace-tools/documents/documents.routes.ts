import { Router } from 'express';
import * as ctrl from './documents.controller';

const router = Router();
router.use((req, res, next) => {
    console.log("documentsRoutes matched:", req.method, req.url);
    next();
});

router.get('/', ctrl.getAllDocuments);
router.post('/', ctrl.createDocument);
router.post('/generate-ai', ctrl.generateDocumentAI);

router.get('/links/entity', ctrl.getLinksForEntity); 
router.get('/token/:token', ctrl.getDocumentByToken);
router.post('/token/:token/sign', ctrl.signDocument);
router.post('/token/:token/decision', ctrl.recordDecisionByToken);

router.get('/:id', ctrl.getDocumentById);
router.put('/:id', ctrl.updateDocument);
router.delete('/:id', ctrl.deleteDocument);

router.post('/:id/share', ctrl.generateShareLink);
router.post('/:id/dispatch-share', ctrl.dispatchDocumentShare);
router.post('/:id/approve', ctrl.approveDocument);
router.post('/:id/decision', ctrl.recordDecision);
router.post('/:id/record-payment', ctrl.recordPayment);
router.post('/:id/remind', ctrl.sendPaymentReminder);
router.post('/:id/convert-to-invoice', ctrl.convertToInvoice);

router.post('/:id/lock', ctrl.lockDocument);
router.post('/:id/unlock', ctrl.unlockDocument);
router.post('/:id/links', ctrl.createLink);

export default router;
