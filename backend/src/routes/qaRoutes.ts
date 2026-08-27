import { Router } from 'express';
import { QAController } from '../controllers/qaController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['ADMIN', 'SUPERVISOR', 'QA_AUDITOR']));

router.get('/calls', QAController.listCalls);
router.get('/calls/:id', QAController.getCallQA);
router.put('/calls/:id/notes', QAController.submitAuditorNotes);
router.get('/stats', QAController.getStats);

export default router;
