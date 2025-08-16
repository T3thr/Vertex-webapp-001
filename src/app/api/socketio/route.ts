// src/app/api/socketio/route.ts
// ===================================================================
// WebSocket API Route for Real-time Collaboration
// Next.js API Route with Socket.IO integration
// ===================================================================

import { NextRequest } from 'next/server';
import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Socket } from 'socket.io';
import { RealtimeCommand, CollaboratorInfo, StoryMapRoomInfo, CursorUpdate, SelectionUpdate } from '@/lib/realtime/RealtimeClient';

// ===================================================================
// Type Definitions
// ===================================================================

interface SocketWithData extends Socket {
  userId?: string;
  storyMapId?: string;
  sessionId?: string;
  username?: string;
}

interface StoryMapRoom {
  storyMapId: string;
  collaborators: Map<string, CollaboratorInfo>;
  lastActivity: Date;
  commandHistory: RealtimeCommand[];
}

// ===================================================================
// Global Socket.IO Server Instance
// ===================================================================

let io: SocketIOServer | undefined;
const storyMapRooms = new Map<string, StoryMapRoom>();

// Room cleanup interval (remove inactive rooms)
const ROOM_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const ROOM_INACTIVE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// ===================================================================
// Socket.IO Server Initialization
// ===================================================================

function initializeSocketIO(server: NetServer): SocketIOServer {
  if (io) {
    console.log('[SocketIO] Server already initialized');
    return io;
  }

  io = new SocketIOServer(server, {
    path: '/api/socketio',
    cors: {
      origin: process.env.NODE_ENV === 'development' 
        ? ["http://localhost:3000", "http://127.0.0.1:3000"]
        : process.env.ALLOWED_ORIGINS?.split(',') || [],
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Set up event handlers
  io.on('connection', handleConnection);

  // Start room cleanup
  startRoomCleanup();

  console.log('[SocketIO] Server initialized successfully');
  return io;
}

// ===================================================================
// Connection Handler
// ===================================================================

function handleConnection(socket: SocketWithData): void {
  console.log(`[SocketIO] Client connected: ${socket.id}`);

  // Extract query parameters
  const { storyMapId, userId, sessionId } = socket.handshake.query;
  
  if (typeof storyMapId === 'string') socket.storyMapId = storyMapId;
  if (typeof userId === 'string') socket.userId = userId;
  if (typeof sessionId === 'string') socket.sessionId = sessionId;

  // Set up event handlers
  socket.on('join-storymap', (data) => handleJoinStoryMap(socket, data));
  socket.on('leave-storymap', (data) => handleLeaveStoryMap(socket, data));
  socket.on('command', (data) => handleCommand(socket, data));
  socket.on('cursor-update', (data) => handleCursorUpdate(socket, data));
  socket.on('selection-update', (data) => handleSelectionUpdate(socket, data));
  socket.on('get-room-info', () => handleGetRoomInfo(socket));
  socket.on('ping', () => handlePing(socket));
  socket.on('disconnect', () => handleDisconnect(socket));

  // Handle connection errors
  socket.on('error', (error) => {
    console.error(`[SocketIO] Socket error for ${socket.id}:`, error);
  });
}

// ===================================================================
// Event Handlers
// ===================================================================

function handleJoinStoryMap(socket: SocketWithData, data: any): void {
  try {
    const { storyMapId, userId, sessionId } = data;
    
    if (!storyMapId || !userId) {
      socket.emit('joined-storymap', { 
        success: false, 
        error: 'Missing storyMapId or userId' 
      });
      return;
    }

    // Update socket data
    socket.storyMapId = storyMapId;
    socket.userId = userId;
    socket.sessionId = sessionId;

    // Join the room
    socket.join(storyMapId);

    // Get or create room
    let room = storyMapRooms.get(storyMapId);
    if (!room) {
      room = {
        storyMapId,
        collaborators: new Map(),
        lastActivity: new Date(),
        commandHistory: []
      };
      storyMapRooms.set(storyMapId, room);
    }

    // Add collaborator to room
    const collaborator: CollaboratorInfo = {
      userId,
      username: `User_${userId.slice(-6)}`, // Fallback username
      isOnline: true,
      lastSeen: new Date()
    };

    room.collaborators.set(userId, collaborator);
    room.lastActivity = new Date();

    // Notify other collaborators
    socket.to(storyMapId).emit('collaborator-joined', collaborator);

    // Send success response
    socket.emit('joined-storymap', { success: true });

    // Send current room info
    socket.emit('room-info', createRoomInfo(room));

    console.log(`[SocketIO] User ${userId} joined story map ${storyMapId}`);

  } catch (error) {
    console.error('[SocketIO] Error in handleJoinStoryMap:', error);
    socket.emit('joined-storymap', { 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

function handleLeaveStoryMap(socket: SocketWithData, storyMapId: string): void {
  try {
    if (!socket.userId || !storyMapId) return;

    const room = storyMapRooms.get(storyMapId);
    if (room) {
      const collaborator = room.collaborators.get(socket.userId);
      if (collaborator) {
        // Mark as offline
        collaborator.isOnline = false;
        collaborator.lastSeen = new Date();

        // Notify other collaborators
        socket.to(storyMapId).emit('collaborator-left', collaborator);

        // Remove from room after delay (in case of reconnection)
        setTimeout(() => {
          if (room.collaborators.has(socket.userId!) && !room.collaborators.get(socket.userId!)?.isOnline) {
            room.collaborators.delete(socket.userId!);
          }
        }, 30000); // 30 seconds grace period
      }
    }

    socket.leave(storyMapId);
    console.log(`[SocketIO] User ${socket.userId} left story map ${storyMapId}`);

  } catch (error) {
    console.error('[SocketIO] Error in handleLeaveStoryMap:', error);
  }
}

function handleCommand(socket: SocketWithData, command: RealtimeCommand): void {
  try {
    if (!socket.storyMapId || !socket.userId) {
      console.warn('[SocketIO] Command received without proper room/user context');
      return;
    }

    // Validate command
    if (!command.commandData || !command.commandData.type) {
      console.warn('[SocketIO] Invalid command data received');
      return;
    }

    // Get room
    const room = storyMapRooms.get(socket.storyMapId);
    if (!room) {
      console.warn(`[SocketIO] Room not found: ${socket.storyMapId}`);
      return;
    }

    // Update room activity
    room.lastActivity = new Date();

    // Store command in history (limited to last 100 commands)
    room.commandHistory.push(command);
    if (room.commandHistory.length > 100) {
      room.commandHistory = room.commandHistory.slice(-100);
    }

    // Broadcast command to other users in the room
    socket.to(socket.storyMapId).emit('command-applied', command);

    console.log(`[SocketIO] Command ${command.commandData.type} applied in room ${socket.storyMapId} by user ${socket.userId}`);

    // TODO: In Phase 3, persist command to database here
    // await persistCommand(command);

  } catch (error) {
    console.error('[SocketIO] Error in handleCommand:', error);
  }
}

function handleCursorUpdate(socket: SocketWithData, update: CursorUpdate): void {
  try {
    if (!socket.storyMapId) return;

    // Broadcast cursor update to other users in the room
    socket.to(socket.storyMapId).emit('cursor-update', update);

    // Update collaborator info in room
    const room = storyMapRooms.get(socket.storyMapId);
    if (room && socket.userId) {
      const collaborator = room.collaborators.get(socket.userId);
      if (collaborator) {
        collaborator.cursor = update.position;
        collaborator.lastSeen = new Date();
      }
    }

  } catch (error) {
    console.error('[SocketIO] Error in handleCursorUpdate:', error);
  }
}

function handleSelectionUpdate(socket: SocketWithData, update: SelectionUpdate): void {
  try {
    if (!socket.storyMapId) return;

    // Broadcast selection update to other users in the room
    socket.to(socket.storyMapId).emit('selection-update', update);

  } catch (error) {
    console.error('[SocketIO] Error in handleSelectionUpdate:', error);
  }
}

function handleGetRoomInfo(socket: SocketWithData): void {
  try {
    if (!socket.storyMapId) return;

    const room = storyMapRooms.get(socket.storyMapId);
    if (room) {
      socket.emit('room-info', createRoomInfo(room));
    }

  } catch (error) {
    console.error('[SocketIO] Error in handleGetRoomInfo:', error);
  }
}

function handlePing(socket: SocketWithData): void {
  socket.emit('pong');
  
  // Update last seen for collaborator
  if (socket.storyMapId && socket.userId) {
    const room = storyMapRooms.get(socket.storyMapId);
    if (room) {
      const collaborator = room.collaborators.get(socket.userId);
      if (collaborator) {
        collaborator.lastSeen = new Date();
      }
    }
  }
}

function handleDisconnect(socket: SocketWithData): void {
  console.log(`[SocketIO] Client disconnected: ${socket.id}`);

  if (socket.storyMapId && socket.userId) {
    handleLeaveStoryMap(socket, socket.storyMapId);
  }
}

// ===================================================================
// Utility Functions
// ===================================================================

function createRoomInfo(room: StoryMapRoom): StoryMapRoomInfo {
  return {
    storyMapId: room.storyMapId,
    collaborators: Array.from(room.collaborators.values()),
    isActive: true,
    roomSize: room.collaborators.size
  };
}

function startRoomCleanup(): void {
  setInterval(() => {
    const now = new Date();
    const roomsToDelete: string[] = [];

    for (const [storyMapId, room] of storyMapRooms.entries()) {
      const timeSinceLastActivity = now.getTime() - room.lastActivity.getTime();
      
      if (timeSinceLastActivity > ROOM_INACTIVE_TIMEOUT) {
        roomsToDelete.push(storyMapId);
      }
    }

    // Clean up inactive rooms
    roomsToDelete.forEach(storyMapId => {
      storyMapRooms.delete(storyMapId);
      console.log(`[SocketIO] Cleaned up inactive room: ${storyMapId}`);
    });

  }, ROOM_CLEANUP_INTERVAL);
}

// ===================================================================
// Next.js API Route Handlers
// ===================================================================

export async function GET(req: NextRequest) {
  return new Response('WebSocket endpoint active', { status: 200 });
}

export async function POST(req: NextRequest) {
  return new Response('WebSocket endpoint active', { status: 200 });
}

// ===================================================================
// Socket.IO Server Access for Next.js
// ===================================================================

export function getSocketIOServer(): SocketIOServer | undefined {
  return io;
}

export function initSocketIOIfNeeded(server: NetServer): SocketIOServer {
  if (!io) {
    return initializeSocketIO(server);
  }
  return io;
}

// Development helper
if (process.env.NODE_ENV === 'development') {
  console.log('[SocketIO] WebSocket API route loaded');
}
