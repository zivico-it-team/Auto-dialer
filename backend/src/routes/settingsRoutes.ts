import { Router } from 'express';
import { SettingsController } from '../controllers/settingsController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRoles } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(authenticateToken);
router.use(requireRoles(['ADMIN', 'SUPERVISOR']));

router.get('/', SettingsController.getSettings);
router.post('/', requireRoles(['ADMIN']), SettingsController.updateSetting);
router.get('/audit-logs', SettingsController.getAuditLogs);

export default router;
