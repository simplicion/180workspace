import { Router } from 'express';
import projectRoutes from './projects/project.routes';
import activityRoutes from './activities/activity.routes';
import milestoneRoutes from './milestones/milestone.routes';
import moduleRoutes from './modules/module.routes';
import taskRoutes from './tasks/task.routes';
import timelogRoutes from './timelogs/timelog.routes';
import worklogRoutes from './work-logs/worklog.routes';

const router = Router();

router.use('/projects', projectRoutes);
router.use('/activity', activityRoutes);
router.use('/milestones', milestoneRoutes);
router.use('/modules', moduleRoutes);
router.use('/tasks', taskRoutes);
router.use('/timelogs', timelogRoutes);
router.use('/work-logs', worklogRoutes);

export default router;
