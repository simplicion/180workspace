import { Router } from 'express';
import * as ctrl from './storage.controller';
import { requireHR } from '../../../../system-configs/middleware/auth/rbac';
import { upload, handleUpload } from '../../../../system-configs/middleware/system/central-upload.ts';

const router = Router();

router.post('/upload', upload.single('file'), handleUpload('general'), ctrl.uploadFile);
router.post('/upload-voice', upload.single('file'), handleUpload('voice_notes'), ctrl.uploadFile);
router.get('/presigned-url', ctrl.getPresignedUrl);
router.post('/link', ctrl.addFileLink);
router.post('/attach-existing', ctrl.attachExistingFile);
router.get('/', ctrl.getFiles);
router.post('/sign/:id', ctrl.signFile);
router.delete('/:id', ctrl.deleteFile);

export default router;
