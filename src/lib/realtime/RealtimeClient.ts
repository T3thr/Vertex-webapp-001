// src/lib/realtime/RealtimeClient.ts
// ===================================================================
// Real-time Client for WebSocket Communication
// Professional-grade real-time collaboration client
// ===================================================================

import { io, Socket } from 'socket.io-client';
import { CommandData } from '../commands/Command';

// ===================================================================
// Real-time Event Types
// ===================================================================

export interface CollaboratorInfo {
  userId: string;
  username: string;
  avatar?: string;
  cursor?: { x: number; y: number };
  isOnline: boolean;
  lastSeen: Date;
}

export interface StoryMapRoomInfo {
  storyMapId: string;
  collaborators: CollaboratorInfo[];
  isActive: boolean;
  roomSize: number;
}

export interface RealtimeCommand {
  id: string;
  commandData: CommandData;
  authorId: string;
  timestamp: number;
  storyMapId: string;
  sessionId: string;
}

export interface CursorUpdate {
  userId: string;
  position: { x: number; y: number };
  timestamp: number;
}

export interface SelectionUpdate {
  userId: string;
  selectedNodes: string[];
  selectedEdges: string[];
  timestamp: number;
}

// ===================================================================
// Event Handlers Interface
// ===================================================================

export interface RealtimeEventHandlers {
  onCommandReceived?: (command: RealtimeCommand) => void;
  onCollaboratorJoined?: (collaborator: CollaboratorInfo) => void;
  onCollaboratorLeft?: (collaborator: CollaboratorInfo) => void;
  onCursorUpdate?: (update: CursorUpdate) => void;
  onSelectionUpdate?: (update: SelectionUpdate) => void;
  onRoomInfoUpdate?: (roomInfo: StoryMapRoomInfo) => void;
  onConnectionStatusChange?: (isConnected: boolean) => void;
  onError?: (error: Error) => void;
  onReconnect?: () => void;
  onDisconnect?: (reason: string) => void;
}

// ===================================================================
// RealtimeClient Configuration
// ===================================================================

export interface RealtimeClientConfig {
  serverUrl?: string;
  path?: string;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  timeout?: number;
  forceNew?: boolean;
  transports?: string[];
}

// ===================================================================
// RealtimeClient Class
// ===================================================================

export class RealtimeClient {
  private socket: Socket | null = null;
  private config: RealtimeClientConfig;
  private handlers: RealtimeEventHandlers = {};
  private currentStoryMapId: string | null = null;
  private currentUserId: string | null = null;
  private sessionId: string;
  private isConnected = false;
  private reconnectAttempts = 0;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(config: RealtimeClientConfig = {}) {
    this.config = {
      path: '/api/socketio',
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 5000,
      transports: ['websocket', 'polling'],
      ...config
    };
    
    this.sessionId = this.generateSessionId();
  }

  // ===================================================================
  // Connection Management
  // ===================================================================

  async connect(storyMapId: string, userId: string): Promise<void> {
    try {
      if (this.socket && this.isConnected) {
        console.warn('[RealtimeClient] Already connected, disconnecting first');
        await this.disconnect();
      }

      this.currentStoryMapId = storyMapId;
      this.currentUserId = userId;

      // Check if we're in server environment
      if (typeof window === 'undefined') {
        console.warn('[RealtimeClient] Server-side environment detected, skipping connection');
        return;
      }

      // Create socket connection with better error handling
      this.socket = io(this.config.serverUrl || '', {
        path: this.config.path,
        reconnection: this.config.reconnection,
        reconnectionAttempts: this.config.reconnectionAttempts,
        reconnectionDelay: this.config.reconnectionDelay,
        timeout: this.config.timeout,
        forceNew: this.config.forceNew,
        transports: this.config.transports,
        autoConnect: false, // Don't connect automatically
        query: {
          storyMapId,
          userId,
          sessionId: this.sessionId
        }
      });

      // Set up event listeners before connecting
      this.setupEventListeners();

      // Try to connect with timeout
      this.socket.connect();
      
      try {
        await this.waitForConnection();
        await this.joinStoryMapRoom(storyMapId, userId);
        console.log(`[RealtimeClient] Connected to story map: ${storyMapId}`);
      } catch (connectionError) {
        console.warn('[RealtimeClient] Failed to establish connection, running in offline mode');
        this.handlers.onConnectionStatusChange?.(false);
        // Don't throw error, just continue in offline mode
        return;
      }

    } catch (error) {
      console.error('[RealtimeClient] Connection setup failed:', error);
      this.handlers.onError?.(error instanceof Error ? error : new Error('Connection setup failed'));
      // Don't throw error, allow app to continue in offline mode
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = undefined;
      }

      if (this.socket) {
        // Leave current room if connected
        if (this.currentStoryMapId) {
          this.socket.emit('leave-storymap', this.currentStoryMapId);
        }

        this.socket.disconnect();
        this.socket = null;
      }

      this.isConnected = false;
      this.currentStoryMapId = null;
      this.currentUserId = null;
      this.reconnectAttempts = 0;

      console.log('[RealtimeClient] Disconnected');

    } catch (error) {
      console.error('[RealtimeClient] Disconnect error:', error);
    }
  }

  // ===================================================================
  // Event Handler Registration
  // ===================================================================

  on<K extends keyof RealtimeEventHandlers>(
    event: K,
    handler: RealtimeEventHandlers[K]
  ): void {
    this.handlers[event] = handler;
  }

  off<K extends keyof RealtimeEventHandlers>(event: K): void {
    delete this.handlers[event];
  }

  // ===================================================================
  // Command Broadcasting
  // ===================================================================

  async sendCommand(commandData: CommandData): Promise<void> {
    if (!this.socket || !this.isConnected) {
      throw new Error('Not connected to real-time server');
    }

    if (!this.currentStoryMapId || !this.currentUserId) {
      throw new Error('Story map or user not set');
    }

    const realtimeCommand: RealtimeCommand = {
      id: this.generateCommandId(),
      commandData,
      authorId: this.currentUserId,
      timestamp: Date.now(),
      storyMapId: this.currentStoryMapId,
      sessionId: this.sessionId
    };

    try {
      // Send command to server
      this.socket.emit('command', realtimeCommand);

      console.log(`[RealtimeClient] Command sent: ${commandData.type}`);

    } catch (error) {
      console.error('[RealtimeClient] Failed to send command:', error);
      throw error;
    }
  }

  // ===================================================================
  // Collaboration Features
  // ===================================================================

  async updateCursor(position: { x: number; y: number }): Promise<void> {
    if (!this.socket || !this.isConnected || !this.currentUserId) return;

    const cursorUpdate: CursorUpdate = {
      userId: this.currentUserId,
      position,
      timestamp: Date.now()
    };

    this.socket.emit('cursor-update', cursorUpdate);
  }

  async updateSelection(selectedNodes: string[], selectedEdges: string[]): Promise<void> {
    if (!this.socket || !this.isConnected || !this.currentUserId) return;

    const selectionUpdate: SelectionUpdate = {
      userId: this.currentUserId,
      selectedNodes,
      selectedEdges,
      timestamp: Date.now()
    };

    this.socket.emit('selection-update', selectionUpdate);
  }

  async requestRoomInfo(): Promise<void> {
    if (!this.socket || !this.isConnected) return;

    this.socket.emit('get-room-info');
  }

  // ===================================================================
  // Connection Status
  // ===================================================================

  getConnectionStatus(): {
    isConnected: boolean;
    storyMapId: string | null;
    userId: string | null;
    sessionId: string;
    reconnectAttempts: number;
  } {
    return {
      isConnected: this.isConnected,
      storyMapId: this.currentStoryMapId,
      userId: this.currentUserId,
      sessionId: this.sessionId,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // ===================================================================
  // Private Methods
  // ===================================================================

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.handlers.onConnectionStatusChange?.(true);
      this.startHeartbeat();
      console.log('[RealtimeClient] Socket connected');
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this.handlers.onConnectionStatusChange?.(false);
      this.handlers.onDisconnect?.(reason);
      this.stopHeartbeat();
      console.log(`[RealtimeClient] Socket disconnected: ${reason}`);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      this.reconnectAttempts = attemptNumber;
      this.handlers.onReconnect?.();
      console.log(`[RealtimeClient] Reconnected after ${attemptNumber} attempts`);
    });

    this.socket.on('reconnect_error', (error) => {
      this.reconnectAttempts++;
      console.error(`[RealtimeClient] Reconnection error (attempt ${this.reconnectAttempts}):`, error);
    });

    // Real-time collaboration events
    this.socket.on('command-applied', (command: RealtimeCommand) => {
      // Prevent processing our own commands
      if (command.sessionId === this.sessionId) {
        return;
      }

      this.handlers.onCommandReceived?.(command);
    });

    this.socket.on('collaborator-joined', (collaborator: CollaboratorInfo) => {
      this.handlers.onCollaboratorJoined?.(collaborator);
    });

    this.socket.on('collaborator-left', (collaborator: CollaboratorInfo) => {
      this.handlers.onCollaboratorLeft?.(collaborator);
    });

    this.socket.on('cursor-update', (update: CursorUpdate) => {
      if (update.userId !== this.currentUserId) {
        this.handlers.onCursorUpdate?.(update);
      }
    });

    this.socket.on('selection-update', (update: SelectionUpdate) => {
      if (update.userId !== this.currentUserId) {
        this.handlers.onSelectionUpdate?.(update);
      }
    });

    this.socket.on('room-info', (roomInfo: StoryMapRoomInfo) => {
      this.handlers.onRoomInfoUpdate?.(roomInfo);
    });

    // Error events
    this.socket.on('error', (error) => {
      console.error('[RealtimeClient] Socket error:', error);
      this.handlers.onError?.(error);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[RealtimeClient] Connection error:', error);
      this.handlers.onError?.(error);
    });
  }

  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, this.config.timeout || 5000);

      this.socket.once('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.socket.once('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private async joinStoryMapRoom(storyMapId: string, userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Join room timeout'));
      }, 5000);

      this.socket.once('joined-storymap', (response: { success: boolean; error?: string }) => {
        clearTimeout(timeout);
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to join story map room'));
        }
      });

      this.socket.emit('join-storymap', {
        storyMapId,
        userId,
        sessionId: this.sessionId
      });
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.isConnected) {
        this.socket.emit('ping');
      }
    }, 30000); // 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCommandId(): string {
    return `rtc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ===================================================================
// Factory Function
// ===================================================================

export function createRealtimeClient(config?: RealtimeClientConfig): RealtimeClient {
  return new RealtimeClient(config);
}
