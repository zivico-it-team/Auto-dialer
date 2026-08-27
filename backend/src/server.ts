import http from 'http';
import { createApp } from './app.js';
import { config } from './config/environment.js';
import { connectDatabase, prisma } from './config/database.js';
import { initializeSocket } from './socket/socketHandler.js';
import { telephonyManager } from './telephony/telephonyService.js';
import { dialerEngine } from './workers/dialerEngine.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  logger.info('🚀 Initializing Call Center Dialer Platform Backend...');

  // 1. Connect to Database
  await connectDatabase();

  // 2. Initialize Telephony Provider (Mock or Asterisk AMI)
  await telephonyManager.initialize();

  // 3. Create HTTP Server & Socket.IO Gateway
  const app = createApp();
  const httpServer = http.createServer(app);
  initializeSocket(httpServer);

  // 4. Start Background Auto-Dialer Engine
  dialerEngine.start();

  // 5. Listen on configured port
  // Hostinger supplies PORT for Node.js applications; bind to all interfaces.
  const server = httpServer.listen(config.port, '0.0.0.0', () => {
    logger.info(`✅ Server listening on http://localhost:${config.port}`);
    logger.info(`📡 Telephony Mode: ${config.telephonyProvider.toUpperCase()}`);
    logger.info(`🔗 Allowed frontend origins: ${config.frontendUrls.join(', ')}`);
  });

  // Graceful Shutdown
  const shutdown = async (signal: string) => {
    logger.warn(`Received ${signal}. Starting graceful shutdown...`);
    
    // Stop background dialer loop
    dialerEngine.stop();

    // Close HTTP Server
    server.close(async () => {
      logger.info('HTTP server closed.');

      // Disconnect telephony provider
      await telephonyManager.shutdown();

      // Disconnect Prisma DB
      await prisma.$disconnect();
      logger.info('Database disconnected. Graceful shutdown complete.');
      process.exit(0);
    });

    // Force exit after 10s if shutdown hangs
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('Fatal bootstrap error:', err);
  process.exit(1);
});
