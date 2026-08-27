import { Router } from 'express';
import { CallController, updateDispositionSchema, manualDialSchema } from '../controllers/callController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', CallController.list);
router.get('/:id', CallController.getById);
router.get('/:id/recording', CallController.getRecording);
router.post('/manual-dial', validateBody(manualDialSchema), CallController.manualDial);
router.post('/:id/hangup', CallController.hangup);
router.put('/:id/disposition', validateBody(updateDispositionSchema), CallController.updateDisposition);

export default router;
