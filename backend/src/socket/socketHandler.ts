import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken, JwtPayload } from '../utils/jwt.js';
import { config } from '../config/environment.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../config/database.js';

export let io: SocketIOServer;

interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
}

export function initializeSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.frontendUrl || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // Authentication Middleware for WebSocket handshake
  io.use((socket: AuthenticatedSocket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      // Allow unauthenticated connection for dev or public live monitor preview if needed, but mark as guest
      return next();
    }

    const decoded = verifyToken(token);
    if (decoded) {
      socket.user = decoded;
    }
    next();
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    logger.info(`🔌 [Socket.IO] Client connected: ${socket.id} (User: ${socket.user?.name || 'Anonymous'})`);

    // Join general monitoring channel
    socket.join('monitoring');

    if (socket.user) {
      // Join user specific room
      socket.join(`user:${socket.user.userId}`);
      socket.join(`role:${socket.user.role}`);

      if (socket.user.role === 'AGENT') {
        socket.join(`agent:${socket.user.userId}`);
        
        // Update Agent Profile status to AVAILABLE or OFFLINE
        try {
          await prisma.agentProfile.updateMany({
            where: { userId: socket.user.userId },
            data: { status: 'AVAILABLE', lastSeenAt: new Date() },
          });
          io.to('monitoring').emit('agent:status', {
            agentId: socket.user.userId,
            status: 'AVAILABLE',
            timestamp: new Date(),
          });
        } catch (e) {
          logger.error('Failed to update agent profile on socket connect', e);
        }
      }
    }

    // Handle manual agent status change from frontend workspace
    socket.on('agent:set_status', async (data: { status: string }) => {
      if (!socket.user) return;
      try {
        await prisma.agentProfile.updateMany({
          where: { userId: socket.user.userId },
          data: { status: data.status, lastSeenAt: new Date() },
        });
        io.to('monitoring').emit('agent:status', {
          agentId: socket.user.userId,
          status: data.status,
          timestamp: new Date(),
        });
      } catch (err) {
        logger.error('Error changing agent status', err);
      }
    });

    socket.on('disconnect', async () => {
      logger.info(`🔌 [Socket.IO] Client disconnected: ${socket.id}`);
      if (socket.user?.role === 'AGENT') {
        try {
          await prisma.agentProfile.updateMany({
            where: { userId: socket.user.userId },
            data: { status: 'OFFLINE', lastSeenAt: new Date() },
          });
          io.to('monitoring').emit('agent:status', {
            agentId: socket.user.userId,
            status: 'OFFLINE',
            timestamp: new Date(),
          });
        } catch (e) {
          // Ignored on disconnect cleanup
        }
      }
    });
  });

  return io;
}
