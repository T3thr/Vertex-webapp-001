// src/lib/autosave/index.ts
// ===================================================================
// Intelligent Auto-Save - Export Index
// Professional-grade intelligent auto-saving system
// ===================================================================

// Core auto-save system
export * from './IntelligentAutoSave';

// Re-export commonly used types for convenience
export type {
  AutoSaveConfig,
  AutoSaveState,
  AutoSaveMetrics,
  SaveTrigger,
  SaveOperation,
  SaveProvider
} from './IntelligentAutoSave';

export { 
  IntelligentAutoSave,
  createIntelligentAutoSave
} from './IntelligentAutoSave';
