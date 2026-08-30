import { Router } from 'express';
import * as domainsController from './domains.controller';

const router = Router();

router.post('/', domainsController.addCustomDomain);
router.get('/:domain/status', domainsController.getCustomDomainStatus);
router.post('/:domain/verify', domainsController.verifyCustomDomain);
router.delete('/:domain', domainsController.removeCustomDomain);

export default router;
