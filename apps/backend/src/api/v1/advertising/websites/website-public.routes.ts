import { Router } from 'express';
import * as websiteController from './website.controller';
import rateLimit from 'express-rate-limit';

const leadSubmitLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 submissions per 15 minutes
    message: { error: 'Too many submissions, please try again later.' },
});

const router = Router();

router.get('/resolve', websiteController.publicGetWebsite);
router.post('/resolve/lead', leadSubmitLimiter, websiteController.publicSubmitLead);

export default router;
