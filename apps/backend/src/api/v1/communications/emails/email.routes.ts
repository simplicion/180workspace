import { Router } from 'express';
import * as ctrl from './email.controller';
import { requireHR } from '../../../../system-configs/middleware/auth/rbac';

const router = Router();

// All email management routes are protected for HR/Admin only
router.get('/logs', requireHR, ctrl.getEmailLogs);
router.get('/templates', requireHR, ctrl.getTemplates);
router.get('/stats', requireHR, ctrl.getEmailStats);
router.post('/send', requireHR, ctrl.sendManualEmail);
router.post('/preview', requireHR, ctrl.previewTemplate);
router.post('/send-custom', requireHR, ctrl.sendCustomEmail);
router.post('/send-bulk', requireHR, ctrl.sendBulkEmail);
router.post('/send-document', requireHR, ctrl.sendDocumentEmail);
router.post('/retry/:id', requireHR, ctrl.retryEmail);

export default router;
