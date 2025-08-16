// server.js
// ===================================================================
// Custom Next.js Server with Socket.IO Integration
// Professional-grade real-time server setup
// ===================================================================

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// ===================================================================
// Server Initialization
// ===================================================================

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

console.log('[Server] Preparing Next.js application...');

app.prepare().then(() => {
  console.log('[Server] Next.js application prepared successfully');
  
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // ===================================================================
  // Socket.IO Integration
  // ===================================================================

  const io = new Server(httpServer, {
    path: '/api/socketio',
    cors: {
      origin: dev 
        ? ["http://localhost:3000", "http://127.0.0.1:3000"]
        : process.env.ALLOWED_ORIGINS?.split(',') || [],
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // ===================================================================
  // Real-time State Management
  // ===================================================================

  const storyMapRooms = new Map();
  const ROOM_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  const ROOM_INACTIVE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  // ===================================================================
  // Socket.IO Event Handlers
  // ===================================================================

  io.on('connection', (socket) => {
    console.log(`[SocketIO] Client connected: ${socket.id}`);

    // Extract query parameters
    const { storyMapId, userId, sessionId } = socket.handshake.query;
    socket.storyMapId = storyMapId;
    socket.userId = userId;
    socket.sessionId = sessionId;

    // ===================================================================
    // Join Story Map Room
    // ===================================================================

    socket.on('join-storymap', (data) => {
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
        const collaborator = {
          userId,
          username: `User_${userId.slice(-6)}`,
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
        const roomInfo = {
          storyMapId: room.storyMapId,
          collaborators: Array.from(room.collaborators.values()),
          isActive: true,
          roomSize: room.collaborators.size
        };
        socket.emit('room-info', roomInfo);

        console.log(`[SocketIO] User ${userId} joined story map ${storyMapId}`);

      } catch (error) {
        console.error('[SocketIO] Error in join-storymap:', error);
        socket.emit('joined-storymap', { 
          success: false, 
          error: 'Internal server error' 
        });
      }
    });

    // ===================================================================
    // Leave Story Map Room
    // ===================================================================

    socket.on('leave-storymap', (storyMapId) => {
      try {
        if (!socket.userId || !storyMapId) return;

        const room = storyMapRooms.get(storyMapId);
        if (room) {
          const collaborator = room.collaborators.get(socket.userId);
          if (collaborator) {
            collaborator.isOnline = false;
            collaborator.lastSeen = new Date();
            socket.to(storyMapId).emit('collaborator-left', collaborator);

            // Remove from room after delay
            setTimeout(() => {
              if (room.collaborators.has(socket.userId) && !room.collaborators.get(socket.userId)?.isOnline) {
                room.collaborators.delete(socket.userId);
              }
            }, 30000);
          }
        }

        socket.leave(storyMapId);
        console.log(`[SocketIO] User ${socket.userId} left story map ${storyMapId}`);

      } catch (error) {
        console.error('[SocketIO] Error in leave-storymap:', error);
      }
    });

    // ===================================================================
    // Command Broadcasting
    // ===================================================================

    socket.on('command', (command) => {
      try {
        if (!socket.storyMapId || !socket.userId) {
          console.warn('[SocketIO] Command received without proper room/user context');
          return;
        }

        if (!command.commandData || !command.commandData.type) {
          console.warn('[SocketIO] Invalid command data received');
          return;
        }

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

      } catch (error) {
        console.error('[SocketIO] Error in command handler:', error);
      }
    });

    // ===================================================================
    // Collaboration Features
    // ===================================================================

    socket.on('cursor-update', (update) => {
      try {
        if (!socket.storyMapId) return;

        socket.to(socket.storyMapId).emit('cursor-update', update);

        const room = storyMapRooms.get(socket.storyMapId);
        if (room && socket.userId) {
          const collaborator = room.collaborators.get(socket.userId);
          if (collaborator) {
            collaborator.cursor = update.position;
            collaborator.lastSeen = new Date();
          }
        }

      } catch (error) {
        console.error('[SocketIO] Error in cursor-update:', error);
      }
    });

    socket.on('selection-update', (update) => {
      try {
        if (!socket.storyMapId) return;
        socket.to(socket.storyMapId).emit('selection-update', update);
      } catch (error) {
        console.error('[SocketIO] Error in selection-update:', error);
      }
    });

    socket.on('get-room-info', () => {
      try {
        if (!socket.storyMapId) return;

        const room = storyMapRooms.get(socket.storyMapId);
        if (room) {
          const roomInfo = {
            storyMapId: room.storyMapId,
            collaborators: Array.from(room.collaborators.values()),
            isActive: true,
            roomSize: room.collaborators.size
          };
          socket.emit('room-info', roomInfo);
        }
      } catch (error) {
        console.error('[SocketIO] Error in get-room-info:', error);
      }
    });

    // ===================================================================
    // Connection Management
    // ===================================================================

    socket.on('ping', () => {
      socket.emit('pong');
      
      if (socket.storyMapId && socket.userId) {
        const room = storyMapRooms.get(socket.storyMapId);
        if (room) {
          const collaborator = room.collaborators.get(socket.userId);
          if (collaborator) {
            collaborator.lastSeen = new Date();
          }
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`[SocketIO] Client disconnected: ${socket.id}`);

      if (socket.storyMapId && socket.userId) {
        const room = storyMapRooms.get(socket.storyMapId);
        if (room) {
          const collaborator = room.collaborators.get(socket.userId);
          if (collaborator) {
            collaborator.isOnline = false;
            collaborator.lastSeen = new Date();
            socket.to(socket.storyMapId).emit('collaborator-left', collaborator);
          }
        }
      }
    });

    socket.on('error', (error) => {
      console.error(`[SocketIO] Socket error for ${socket.id}:`, error);
    });
  });

  // ===================================================================
  // Room Cleanup
  // ===================================================================

  function startRoomCleanup() {
    setInterval(() => {
      const now = new Date();
      const roomsToDelete = [];

      for (const [storyMapId, room] of storyMapRooms.entries()) {
        const timeSinceLastActivity = now.getTime() - room.lastActivity.getTime();
        
        if (timeSinceLastActivity > ROOM_INACTIVE_TIMEOUT) {
          roomsToDelete.push(storyMapId);
        }
      }

      roomsToDelete.forEach(storyMapId => {
        storyMapRooms.delete(storyMapId);
        console.log(`[SocketIO] Cleaned up inactive room: ${storyMapId}`);
      });

    }, ROOM_CLEANUP_INTERVAL);
  }

  startRoomCleanup();

  // ===================================================================
  // Server Start
  // ===================================================================

  httpServer
    .once('error', (err) => {
      console.error('[Server] HTTP server error:', err);
      if (err.code === 'EADDRINUSE') {
        console.error(`[Server] Port ${port} is already in use. Please use a different port or stop the other process.`);
      }
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`[Server] ✅ Ready on http://${hostname}:${port}`);
      console.log(`[Server] ✅ Socket.IO ready on path: /api/socketio`);
      console.log(`[Server] 🚀 DivWy server started successfully!`);
    });
}).catch((err) => {
  console.error('[Server] Failed to prepare Next.js application:', err);
  process.exit(1);
});
