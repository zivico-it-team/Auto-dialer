import { Router } from 'express';
import { AuthController, registerSchema, loginSchema, updatePasswordSchema } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', authLimiter, validateBody(registerSchema), AuthController.register);
router.post('/login', authLimiter, validateBody(loginSchema), AuthController.login);
router.post('/logout', authenticateToken, AuthController.logout);
router.get('/me', authenticateToken, AuthController.getMe);
router.put('/password', authenticateToken, validateBody(updatePasswordSchema), AuthController.updatePassword);

export default router;
