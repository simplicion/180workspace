import { Router } from 'express';
import { VaultsController } from './vaults.controller';
// @ts-ignore
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB per file
});

const router = Router();

// Dynamic Document Categories (Zero Hardcoding) - Placed before /:id parameter
router.get('/categories', VaultsController.listCategories);
router.post('/categories', VaultsController.createCategory);
router.delete('/categories/:id', VaultsController.deleteCategory);

router.get('/meta/categories', VaultsController.listCategories);
router.post('/meta/categories', VaultsController.createCategory);
router.delete('/meta/categories/:id', VaultsController.deleteCategory);

// Vault CRUD & Ingestion
router.get('/', VaultsController.listVaults);
router.post('/', upload.array('files', 15), VaultsController.createVault);
router.get('/:id', VaultsController.getVaultDetails);
router.delete('/:id', VaultsController.deleteVault);
router.post('/:id/query', VaultsController.queryVault);

export default router;
