import { Router } from 'express';
import * as websiteController from './website.controller';
const router = Router();

router.get('/resolve', websiteController.publicGetWebsite);

export default router;
