import { Router } from 'express';
import { AgentController, updateAgentStatusSchema, updateAgentSipSchema } from '../controllers/agentController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRoles } from '../middleware/roleMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', requireRoles(['ADMIN', 'SUPERVISOR', 'AGENT']), AgentController.list);
router.put('/:id/status', validateBody(updateAgentStatusSchema), AgentController.updateStatus);
router.put('/:id/sip', requireRoles(['ADMIN', 'SUPERVISOR']), validateBody(updateAgentSipSchema), AgentController.updateSip);

export default router;
