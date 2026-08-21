import { Router } from 'express';
import savedBanksRoutes from './saved-banks/saved-banks.routes';
import contentCalendarRoutes from './content-calendar/content-calendar.routes';

const router = Router();

router.use('/saved-banks', savedBanksRoutes);
router.use('/content-calendar', contentCalendarRoutes);

export default router;
