import { Router } from 'express';
import { clientRoutes } from './clients';
import { contractRoutes, publicContractRoutes } from './contracts';
import { salesRoutes } from './sales';

const router = Router();

// Mount CRM & Sales sub-routes
router.use('/clients', clientRoutes);
router.use('/contracts', contractRoutes);
router.use('/sales', salesRoutes);

// Public routes can be mounted at the top-level router if needed, 
// but typically handled in a separate public index.

export default router;
export { publicContractRoutes };
