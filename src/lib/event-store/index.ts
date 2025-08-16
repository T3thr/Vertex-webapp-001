// src/lib/event-store/index.ts
// ===================================================================
// Event Store - Export Index
// Professional-grade event sourcing foundation
// ===================================================================

// Core event store interfaces and implementations
export * from './EventStore';

// Re-export commonly used types for convenience
export type {
  StoryMapEvent,
  EventStreamInfo,
  EventQuery,
  EventAppendResult,
  EventBatch,
  IEventStore
} from './EventStore';

export { 
  InMemoryEventStore, 
  HttpEventStore, 
  createEventStore 
} from './EventStore';
