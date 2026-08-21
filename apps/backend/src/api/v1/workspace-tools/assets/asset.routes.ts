import { Router } from 'express';
import * as ctrl from './asset.controller';

const router = Router();

router.get('/stats', ctrl.getAssetStats);
router.get('/', ctrl.getAssets);
router.get('/:id', ctrl.getAssetById);
router.post('/', ctrl.createAsset);
router.put('/:id', ctrl.updateAsset);
router.delete('/:id', ctrl.deleteAsset);

export default router;
