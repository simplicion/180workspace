import { Router } from 'express';
import { getDocumentByToken, signDocument, recordDecisionByToken } from './documents.controller';

const router = Router();

router.get('/:token', getDocumentByToken);
router.post('/:token/sign', signDocument);
router.post('/:token/decision', recordDecisionByToken);

export default router;
