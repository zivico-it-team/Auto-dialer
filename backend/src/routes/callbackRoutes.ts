import { Router } from 'express';
import { CallbackController, createCallbackSchema, updateCallbackSchema } from '../controllers/callbackController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', CallbackController.list);
router.post('/', validateBody(createCallbackSchema), CallbackController.create);
router.put('/:id', validateBody(updateCallbackSchema), CallbackController.update);

export default router;
