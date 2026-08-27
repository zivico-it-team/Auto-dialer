import { Router } from 'express';
import { ReportController } from '../controllers/reportController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRoles } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(authenticateToken);
router.use(requireRoles(['ADMIN', 'SUPERVISOR']));

router.get('/summary', ReportController.getSummary);
router.get('/export-csv', ReportController.exportReportCsv);

export default router;
