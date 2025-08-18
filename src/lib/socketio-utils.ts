// src/lib/socketio-utils.ts
// ===================================================================
// Socket.IO Server Utilities
// Utilities for accessing Socket.IO server instance
// ===================================================================

import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Global Socket.IO server instance (shared with the API route)
declare global {
  // eslint-disable-next-line no-var
  var socketIOServer: SocketIOServer | undefined;
}

export function getSocketIOServer(): SocketIOServer | undefined {
  return global.socketIOServer;
}

export function setSocketIOServer(server: SocketIOServer): void {
  global.socketIOServer = server;
}

export function initSocketIOIfNeeded(server: NetServer): SocketIOServer {
  const existingServer = getSocketIOServer();
  if (existingServer) {
    return existingServer;
  }
  
  // This would need to be implemented based on your initialization logic
  // For now, return undefined and handle initialization in the API route
  throw new Error('Socket.IO server must be initialized in the API route first');
}
