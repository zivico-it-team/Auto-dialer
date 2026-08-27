import { Router } from 'express';
import { UserController, createUserSchema, updateUserSchema } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRoles } from '../middleware/roleMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', requireRoles(['ADMIN', 'SUPERVISOR']), UserController.list);
router.get('/:id', requireRoles(['ADMIN', 'SUPERVISOR']), UserController.getById);
router.post('/', requireRoles(['ADMIN']), validateBody(createUserSchema), UserController.create);
router.put('/:id', requireRoles(['ADMIN']), validateBody(updateUserSchema), UserController.update);
router.delete('/:id', requireRoles(['ADMIN']), UserController.delete);

export default router;
