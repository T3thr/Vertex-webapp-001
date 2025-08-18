// src/lib/realtime/index.ts
// ===================================================================
// Real-time Collaboration - Export Index
// Professional-grade real-time collaboration system
// ===================================================================

// Core real-time client and types
export * from './RealtimeClient';

// Re-export commonly used types for convenience
export type {
  CollaboratorInfo,
  StoryMapRoomInfo,
  RealtimeCommand,
  CursorUpdate,
  SelectionUpdate,
  RealtimeEventHandlers,
  RealtimeClientConfig
} from './RealtimeClient';

export { 
  RealtimeClient, 
  createRealtimeClient 
} from './RealtimeClient';
