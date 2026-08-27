import { Router } from 'express';
import multer from 'multer';
import { LeadController, createLeadSchema, updateLeadSchema } from '../controllers/leadController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRoles } from '../middleware/roleMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.use(authenticateToken);

router.get('/', requireRoles(['ADMIN', 'SUPERVISOR', 'AGENT']), LeadController.list);
router.get('/export-csv', requireRoles(['ADMIN', 'SUPERVISOR']), LeadController.exportCsv);
router.get('/:id', requireRoles(['ADMIN', 'SUPERVISOR', 'AGENT']), LeadController.getById);

router.post('/', requireRoles(['ADMIN', 'SUPERVISOR']), validateBody(createLeadSchema), LeadController.create);
router.post('/import-csv', requireRoles(['ADMIN', 'SUPERVISOR']), upload.single('file'), LeadController.importCsv);
router.put('/:id', requireRoles(['ADMIN', 'SUPERVISOR', 'AGENT']), validateBody(updateLeadSchema), LeadController.update);
router.post('/:id/dnc', requireRoles(['ADMIN', 'SUPERVISOR', 'AGENT']), LeadController.markDnc);
router.delete('/:id', requireRoles(['ADMIN', 'SUPERVISOR']), LeadController.delete);

export default router;
