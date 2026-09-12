import express from 'express';
import * as companyConfigController from '../controllers/company-config.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';
import { requireAdmin } from '../../../../system-configs/middleware/auth/rbac';

import { upload, handleUpload } from '../../../../system-configs/middleware/system/central-upload.ts';

const router = express.Router();

router.get('/', protect, companyConfigController.getCompanyConfig);
router.put('/', protect, requireAdmin, companyConfigController.updateCompanyConfig);
router.patch('/apps', protect, requireAdmin, companyConfigController.updateEnabledApps);
router.patch('/modules', protect, requireAdmin, companyConfigController.updateEnabledModules);

// Upload logo / branding media
router.post('/logo', protect, upload.single('file'), handleUpload('branding'), (req: any, res: any) => {
    const url = req.storageResult?.fileUrl || req.fileUrl;
    res.json({ success: true, url, fileUrl: url });
});

export default router;
