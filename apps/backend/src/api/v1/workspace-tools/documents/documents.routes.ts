import { Router } from 'express';
import * as ctrl from './documents.controller';

const router = Router();

router.get('/', ctrl.getAllDocuments);

const filesRouter = Router();
filesRouter.get('/', ctrl.getDocumentsList);
filesRouter.post('/', ctrl.createDocument);
filesRouter.get('/links/entity', ctrl.getLinksForEntity); 
filesRouter.get('/:id', ctrl.getDocumentById);
filesRouter.put('/:id', ctrl.updateDocument);
filesRouter.delete('/:id', ctrl.deleteDocument);

filesRouter.post('/:id/lock', ctrl.lockDocument);
filesRouter.post('/:id/unlock', ctrl.unlockDocument);

filesRouter.post('/:id/links', ctrl.createLink);

router.use('/files', filesRouter);

export default router;
