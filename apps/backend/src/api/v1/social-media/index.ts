import { Router } from 'express';
import savedBanksRoutes from './saved-banks/saved-banks.routes';
import contentCalendarRoutes from './content-calendar/content-calendar.routes';
import socialPostRoutes from './posts/social-post.routes';
import socialAccountRoutes from './accounts/social-account.routes';
import brandVoiceRoutes from './brand-voice/brand-voice.routes';
import clientReviewRoutes from './reviews/client-review.routes';
import socialInboxRoutes from './inbox/social-inbox.routes';
import evergreenQueueRoutes from './evergreen/evergreen-queue.routes';
import socialAssetsRoutes from './assets/social-assets.routes';

const router = Router();

router.use('/saved-banks', savedBanksRoutes);
router.use('/assets', socialAssetsRoutes);
router.use('/content-calendar', contentCalendarRoutes);
router.use('/posts', socialPostRoutes);
router.use('/accounts', socialAccountRoutes);
router.use('/brand-voice', brandVoiceRoutes);
router.use('/reviews', clientReviewRoutes);
router.use('/inbox', socialInboxRoutes);
router.use('/evergreen', evergreenQueueRoutes);

export default router;
