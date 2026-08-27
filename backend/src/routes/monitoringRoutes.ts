import { Router } from 'express';
import { MonitoringController } from '../controllers/monitoringController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRoles } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(authenticateToken);
router.use(requireRoles(['ADMIN', 'SUPERVISOR']));

router.get('/live', MonitoringController.getLiveSnapshot);

export default router;
