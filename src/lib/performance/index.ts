// src/lib/performance/index.ts
// ===================================================================
// Performance Optimization - Export Index
// Professional-grade performance optimization system
// ===================================================================

// Virtualization
export * from './VirtualizationManager';
export { 
  VirtualizationManager,
  createVirtualizationManager
} from './VirtualizationManager';

// Incremental Loading
export * from './IncrementalLoader';
export { 
  IncrementalLoader,
  createIncrementalLoader
} from './IncrementalLoader';

// Re-export commonly used types for convenience
export type {
  VirtualizationConfig,
  VirtualNode,
  VirtualEdge,
  ClusterNode,
  VirtualizationMetrics
} from './VirtualizationManager';

export type {
  LoadingConfig,
  LoadingRegion,
  DataChunk,
  LoadingMetrics,
  LoadingProgress,
  DataSource
} from './IncrementalLoader';

export type {
  LoadingConfig as IncrementalLoadingConfig,
  LoadingMetrics as IncrementalLoadingMetrics,
  LoadingProgress as IncrementalLoadingProgress,
  DataSource as IncrementalDataSource
} from './IncrementalLoader';
