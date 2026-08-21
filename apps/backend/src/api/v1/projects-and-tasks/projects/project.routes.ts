import { Router } from 'express';
import { protect } from '../../../../system-configs/middleware/auth/auth';
import { requireAccess } from '../../../../system-configs/middleware/auth/rbac';
import * as ctrl from './project.controller';

const router = Router();

router.get('/', protect, requireAccess('projects', 'read'), ctrl.getProjects);
router.post('/', protect, requireAccess('projects', 'write'), ctrl.createProject);
router.get('/:id', protect, requireAccess('projects', 'read'), ctrl.getProjectById);
router.put('/:id', protect, requireAccess('projects', 'write'), ctrl.updateProject);
router.delete('/:id', protect, requireAccess('projects', 'write'), ctrl.deleteProject);
router.put('/:id/members', protect, requireAccess('projects', 'write'), ctrl.updateMembers);
router.put('/:id/clients', protect, requireAccess('projects', 'write'), ctrl.updateClients);
router.get('/:id/tasks', protect, requireAccess('projects', 'read'), ctrl.getProjectTasks);
router.get('/:id/activity', protect, requireAccess('projects', 'read'), ctrl.getProjectActivity);
router.get('/:id/notes', protect, ctrl.getProjectNotes);
router.post('/:id/notes', protect, ctrl.createProjectNote);
router.put('/:id/notes/:noteId', protect, ctrl.updateProjectNote);
router.delete('/:id/notes/:noteId', protect, ctrl.deleteProjectNote);

export default router;
