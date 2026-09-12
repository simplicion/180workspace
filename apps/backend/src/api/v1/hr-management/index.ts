import { Router } from 'express';
import { attendanceRoutes } from './attendance';
import { holidayRoutes } from './holidays';
import { leaveRoutes } from './leaves';
import { employeeRoutes } from './employees';
import { designationRoutes } from './designations';
import { hrmsRoutes } from './hrms';

const router = Router();

// Mount hr-management sub-routes
router.use('/attendance', attendanceRoutes);
router.use('/holidays', holidayRoutes);
router.use('/leaves', leaveRoutes);
router.use('/employees', employeeRoutes);
router.use('/designations', designationRoutes);
router.use('/hrms', hrmsRoutes);

export default router;
