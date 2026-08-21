import express from 'express';
import companyProfileRoutes from './routes/company-profile.routes';
import companyConfigRoutes from './routes/company-config.routes';
import onboardingRoutes from './onboarding/onboarding.routes';

const router = express.Router();

router.use('/profile', companyProfileRoutes);
router.use('/config', companyConfigRoutes);
router.use('/onboarding', onboardingRoutes);

export default router;
