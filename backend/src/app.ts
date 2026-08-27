import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/index.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { config } from './config/environment.js';

export function createApp() {
  const app = express();

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // For API flexibility
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // CORS
  app.use(
    cors({
      origin: config.frontendUrl || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      credentials: true,
    })
  );

  // Request Body Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request Logging
  app.use(requestLogger);

  // Global Rate Limiting
  app.use('/api', apiLimiter);

  // Mount API Routes
  app.use('/api', routes);

  // 404 Handler
  app.use('*', (req, res) => {
    res.status(404).json({ success: false, error: `Route not found: ${req.originalUrl}` });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
