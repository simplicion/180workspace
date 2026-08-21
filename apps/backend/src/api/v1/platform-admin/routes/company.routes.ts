import { Router } from 'express';
import { list, create, getOne, suspend, unsuspend, deleteCompany, bulkDelete, resetAdminPassword } from '../controllers/company.controller';
import { validateRequest } from '../../../../system-configs/middleware/system/validateRequest';
import { listCompaniesSchema, createCompanySchema, suspendCompanySchema, deleteCompanyConfirmSchema, bulkDeleteCompanySchema, resetAdminPasswordSchema } from '../validation/company.validation';

const router = Router();

router.get('/', validateRequest(listCompaniesSchema), list);
router.post('/', validateRequest(createCompanySchema), create);
router.post('/bulk-delete', validateRequest(bulkDeleteCompanySchema), bulkDelete);
router.get('/:id', getOne);
router.put('/:id/suspend', validateRequest(suspendCompanySchema), suspend);
router.put('/:id/unsuspend', unsuspend);
router.delete('/:id', validateRequest(deleteCompanyConfirmSchema), deleteCompany);
router.post('/:id/reset-password', validateRequest(resetAdminPasswordSchema), resetAdminPassword);

export default router;
