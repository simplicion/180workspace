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
import socialProjectRoutes from './projects/social-project.routes';
import calendarPieceRoutes from './calendar-pieces/calendar-piece.routes';
import autopilotRoutes from './autopilot/autopilot.routes';
import creativeRoutes from './creative/creative.routes';
import engagementRoutes from './engagement/engagement.routes';

const router = Router();

// Autopilot (WS2) is mounted before the generic project routes so /projects/:id/autopilot/* reaches it.
router.use('/projects/:id/autopilot', autopilotRoutes);
// Creative engine (WS3): carousels / static posts, also before the generic project routes.
router.use('/projects/:id/creative', creativeRoutes);
router.use('/projects', socialProjectRoutes);
router.use('/saved-banks', savedBanksRoutes);
router.use('/assets', socialAssetsRoutes);
router.use('/content-calendar', contentCalendarRoutes);
router.use('/posts', socialPostRoutes);
router.use('/calendar-pieces', calendarPieceRoutes);
router.use('/accounts', socialAccountRoutes);
router.use('/brand-voice', brandVoiceRoutes);
router.use('/reviews', clientReviewRoutes);
router.use('/inbox', socialInboxRoutes);
router.use('/evergreen', evergreenQueueRoutes);
router.use('/engagement', engagementRoutes);

export default router;
