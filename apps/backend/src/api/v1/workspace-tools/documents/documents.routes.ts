import { Router } from 'express';
import * as ctrl from './documents.controller';

const router = Router();
router.use((req, res, next) => {
    console.log("documentsRoutes matched:", req.method, req.url);
    next();
});

router.get('/', ctrl.getAllDocuments);
router.post('/', ctrl.createDocument);
router.get('/links/entity', ctrl.getLinksForEntity); 
router.get('/:id', ctrl.getDocumentById);
router.put('/:id', ctrl.updateDocument);
router.delete('/:id', ctrl.deleteDocument);

router.post('/:id/lock', ctrl.lockDocument);
router.post('/:id/unlock', ctrl.unlockDocument);

router.post('/:id/links', ctrl.createLink);

export default router;
