import express from 'express';
import * as companyConfigController from '../controllers/company-config.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';
import { requireAdmin } from '../../../../system-configs/middleware/auth/rbac';

const router = express.Router();

router.get('/', protect, companyConfigController.getCompanyConfig);
router.put('/', protect, requireAdmin, companyConfigController.updateCompanyConfig);
router.patch('/apps', protect, requireAdmin, companyConfigController.updateEnabledApps);
router.patch('/modules', protect, requireAdmin, companyConfigController.updateEnabledModules);

export default router;
