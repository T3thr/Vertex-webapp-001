// src/lib/conflict-resolution/index.ts
// ===================================================================
// Conflict Resolution - Export Index
// Professional-grade conflict resolution system
// ===================================================================

// Core conflict resolution types and classes
export * from './ConflictResolver';

// Re-export commonly used types for convenience
export type {
  ConflictResolutionStrategy,
  ConflictContext,
  ConflictResolution,
  ConflictMetrics,
  IConflictResolver
} from './ConflictResolver';

export { 
  ConflictResolver,
  AdvancedConflictResolver,
  createConflictResolver,
  createAdvancedConflictResolver
} from './ConflictResolver';
