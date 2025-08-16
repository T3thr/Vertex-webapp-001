// src/lib/sync-manager/index.ts
// ===================================================================
// Sync Manager - Export Index
// Professional-grade offline-first synchronization system
// ===================================================================

// Core sync manager
export * from './SyncManager';

// Re-export commonly used types for convenience
export type {
  SyncConfig,
  QueuedCommand,
  SyncState,
  SyncMetrics,
  SyncBatch,
  ConflictEvent,
  PersistenceAdapter,
  RemoteSyncAdapter
} from './SyncManager';

export { 
  SyncManager,
  IndexedDBAdapter,
  createSyncManager
} from './SyncManager';
