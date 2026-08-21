import { Router } from 'express';
import * as ctrl from './storage.controller';
import { requireHR } from '../../../../system-configs/middleware/auth/rbac';
import { upload, handleUpload } from '../../../../system-configs/middleware/system/upload.ts';
import { handleVideoUpload, upload as videoUpload } from '../../../../system-configs/middleware/system/video-upload.ts';

const router = Router();

router.post('/upload', upload.single('file'), handleUpload('general'), ctrl.uploadFile);
router.post('/upload-video', videoUpload.single('file'), handleVideoUpload, ctrl.uploadFile);
router.post('/upload-voice', upload.single('file'), handleUpload('voice_notes', { forceR2: true }), ctrl.uploadFile);
router.get('/presigned-url', ctrl.getPresignedUrl);
router.post('/link', ctrl.addFileLink);
router.post('/attach-existing', ctrl.attachExistingFile);
router.get('/', ctrl.getFiles);
router.post('/sign/:id', ctrl.signFile);
router.delete('/:id', requireHR, ctrl.deleteFile);

export default router;
