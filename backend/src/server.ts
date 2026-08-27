import http from 'http';
import { createApp } from './app.js';
import { config } from './config/environment.js';
import { connectDatabase, prisma } from './config/database.js';
import { initializeSocket } from './socket/socketHandler.js';
import { telephonyManager } from './telephony/telephonyService.js';
import { dialerEngine } from './workers/dialerEngine.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  logger.info('Initializing Call Center Dialer Platform Backend...');

  // Hostinger requires the application to call listen() promptly. Start the
  // HTTP server first; database and telephony setup can safely complete after
  // the health endpoint is already available.
  const app = createApp();
  const httpServer = http.createServer(app);
  initializeSocket(httpServer);

  const server = httpServer.listen(config.port, '0.0.0.0', () => {
    logger.info(`Server listening on http://localhost:${config.port}`);
    logger.info(`Telephony Mode: ${config.telephonyProvider.toUpperCase()}`);
    logger.info(`Allowed frontend origins: ${config.frontendUrls.join(', ')}`);
  });

  // Graceful Shutdown
  const shutdown = async (signal: string) => {
    logger.warn(`Received ${signal}. Starting graceful shutdown...`);
    dialerEngine.stop();

    server.close(async () => {
      logger.info('HTTP server closed.');
      await telephonyManager.shutdown();
      await prisma.$disconnect();
      logger.info('Database disconnected. Graceful shutdown complete.');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced shutdown due to timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
    await connectDatabase();
    await telephonyManager.initialize();
    dialerEngine.start();
  } catch (err) {
    // Keep the process alive for Hostinger while preserving the error in the
    // runtime logs. A restart can then retry initialization cleanly.
    logger.error('Background service initialization failed:', err);
  }
}

bootstrap().catch((err) => {
  logger.error('Fatal bootstrap error:', err);
  process.exit(1);
});
