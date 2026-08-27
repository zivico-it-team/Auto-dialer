import { io } from './socketHandler.js';
import { logger } from '../utils/logger.js';

export function emitToAll(event: string, data: any) {
  if (io) {
    io.emit(event, data);
  }
}

export function emitToMonitoring(event: string, data: any) {
  if (io) {
    io.to('monitoring').emit(event, data);
  }
}

export function emitToAgent(agentId: string, event: string, data: any) {
  if (io) {
    io.to(`agent:${agentId}`).emit(event, data);
    // Also notify monitoring dashboard
    io.to('monitoring').emit(event, data);
  }
}

export function emitCallEvent(eventName: string, payload: any) {
  if (io) {
    io.to('monitoring').emit(eventName, payload);
    if (payload.agentId) {
      io.to(`agent:${payload.agentId}`).emit(eventName, payload);
    }
  }
}

export function emitCampaignEvent(eventName: string, payload: any) {
  if (io) {
    io.to('monitoring').emit(eventName, payload);
    io.emit(eventName, payload);
  }
}
