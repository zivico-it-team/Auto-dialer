import { Router } from 'express';
import {
  CampaignController,
  createCampaignSchema,
  updateCampaignSchema,
} from '../controllers/campaignController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRoles } from '../middleware/roleMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', requireRoles(['ADMIN', 'SUPERVISOR', 'AGENT']), CampaignController.list);
router.get('/:id', requireRoles(['ADMIN', 'SUPERVISOR', 'AGENT']), CampaignController.getById);

router.post('/', requireRoles(['ADMIN', 'SUPERVISOR']), validateBody(createCampaignSchema), CampaignController.create);
router.put('/:id', requireRoles(['ADMIN', 'SUPERVISOR']), validateBody(updateCampaignSchema), CampaignController.update);
router.delete('/:id', requireRoles(['ADMIN', 'SUPERVISOR']), CampaignController.delete);

// Lifecycle controls
router.post('/:id/start', requireRoles(['ADMIN', 'SUPERVISOR']), CampaignController.start);
router.post('/:id/pause', requireRoles(['ADMIN', 'SUPERVISOR']), CampaignController.pause);
router.post('/:id/resume', requireRoles(['ADMIN', 'SUPERVISOR']), CampaignController.resume);
router.post('/:id/stop', requireRoles(['ADMIN', 'SUPERVISOR']), CampaignController.stop);

// Emergency Stop
router.post('/emergency-stop', requireRoles(['ADMIN', 'SUPERVISOR']), CampaignController.emergencyStop);

export default router;
