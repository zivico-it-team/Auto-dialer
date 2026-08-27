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

  // Hostinger terminates TLS in front of this Node.js process.
  app.set('trust proxy', 1);

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
      origin: (origin, callback) => {
        if (!origin || config.frontendUrls.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`CORS blocked for origin: ${origin}`));
      },
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

  app.get('/health', (_req, res) => {
    res.status(200).json({ success: true, environment: config.nodeEnv });
  });

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
