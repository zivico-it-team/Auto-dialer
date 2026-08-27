import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import agentRoutes from './agentRoutes.js';
import campaignRoutes from './campaignRoutes.js';
import leadRoutes from './leadRoutes.js';
import callRoutes from './callRoutes.js';
import reportRoutes from './reportRoutes.js';
import callbackRoutes from './callbackRoutes.js';
import monitoringRoutes from './monitoringRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import qaRoutes from './qaRoutes.js';

const router = Router();

// Health Check Endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Call Center Dialer API is running',
    timestamp: new Date().toISOString(),
  });
});

// Mount Resource Routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/agents', agentRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/leads', leadRoutes);
router.use('/calls', callRoutes);
router.use('/reports', reportRoutes);
router.use('/callbacks', callbackRoutes);
router.use('/monitoring', monitoringRoutes);
router.use('/settings', settingsRoutes);
router.use('/qa', qaRoutes);

export default router;
