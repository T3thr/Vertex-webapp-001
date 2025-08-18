// src/lib/sync-manager/BidirectionalStateManager.ts
// ===================================================================
// Bidirectional State Manager for Canva/Figma-like Undo/Redo
// Synchronizes state between EventManager and ReactFlow seamlessly
// ===================================================================

export interface StateSnapshot {
  nodes: any[];
  edges: any[];
  storyVariables: any[];
  timestamp: number;
  version: number;
}

export interface SyncCallbacks {
  onReactFlowUpdate: (nodes: any[], edges: any[]) => void;
  onEventManagerUpdate: (nodes: any[], edges: any[], storyVariables: any[]) => void;
  onStateChange?: (snapshot: StateSnapshot) => void;
  onError?: (error: Error, context: string) => void;
}

export interface SyncOptions {
  enableDebouncing: boolean;
  debounceDelayMs: number;
  enableValidation: boolean;
  enableLogging: boolean;
}

/**
 * BidirectionalStateManager
 * Provides seamless synchronization between EventManager and ReactFlow
 * Ensures both systems stay in sync during undo/redo operations
 */
export class BidirectionalStateManager {
  private callbacks: SyncCallbacks;
  private options: SyncOptions;
  private currentSnapshot: StateSnapshot;
  private debounceTimer?: NodeJS.Timeout;
  private syncInProgress: boolean = false;

  constructor(callbacks: SyncCallbacks, options: Partial<SyncOptions> = {}) {
    this.callbacks = callbacks;
    this.options = {
      enableDebouncing: false, // Disabled for undo/redo immediacy
      debounceDelayMs: 100,
      enableValidation: true,
      enableLogging: process.env.NODE_ENV === 'development',
      ...options
    };

    this.currentSnapshot = this.createEmptySnapshot();
    
    if (this.options.enableLogging) {
      console.log('[BidirectionalStateManager] Initialized with options:', this.options);
    }
  }

  /**
   * Update ReactFlow UI from EventManager state
   * Used during undo/redo operations
   */
  syncToReactFlow(snapshot: StateSnapshot): void {
    if (this.syncInProgress) {
      if (this.options.enableLogging) {
        console.log('[BidirectionalStateManager] ⚠️ Sync already in progress, skipping');
      }
      return;
    }

    try {
      this.syncInProgress = true;
      
      if (this.options.enableValidation) {
        this.validateSnapshot(snapshot);
      }

      if (this.options.enableLogging) {
        console.log('[BidirectionalStateManager] 🔄 Syncing to ReactFlow:', {
          nodeCount: snapshot.nodes.length,
          edgeCount: snapshot.edges.length,
          timestamp: snapshot.timestamp
        });
      }

      // Update current snapshot
      this.currentSnapshot = { ...snapshot };

      // Execute sync with debouncing if enabled
      if (this.options.enableDebouncing) {
        this.debouncedSyncToReactFlow(snapshot);
      } else {
        this.executeSyncToReactFlow(snapshot);
      }

    } catch (error) {
      this.handleError(error, 'SYNC_TO_REACTFLOW');
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Update EventManager state from ReactFlow changes
   * Used during normal editing operations
   */
  syncToEventManager(nodes: any[], edges: any[], storyVariables: any[]): void {
    if (this.syncInProgress) {
      if (this.options.enableLogging) {
        console.log('[BidirectionalStateManager] ⚠️ Sync already in progress, skipping');
      }
      return;
    }

    try {
      this.syncInProgress = true;

      const snapshot: StateSnapshot = {
        nodes: [...nodes],
        edges: [...edges],
        storyVariables: [...storyVariables],
        timestamp: Date.now(),
        version: this.currentSnapshot.version + 1
      };

      if (this.options.enableValidation) {
        this.validateSnapshot(snapshot);
      }

      if (this.options.enableLogging) {
        console.log('[BidirectionalStateManager] 🔄 Syncing to EventManager:', {
          nodeCount: snapshot.nodes.length,
          edgeCount: snapshot.edges.length,
          timestamp: snapshot.timestamp
        });
      }

      // Update current snapshot
      this.currentSnapshot = { ...snapshot };

      // Execute sync with debouncing if enabled
      if (this.options.enableDebouncing) {
        this.debouncedSyncToEventManager(snapshot);
      } else {
        this.executeSyncToEventManager(snapshot);
      }

    } catch (error) {
      this.handleError(error, 'SYNC_TO_EVENTMANAGER');
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Force immediate bidirectional sync
   * Used after critical operations like undo/redo
   */
  forceBidirectionalSync(snapshot: StateSnapshot): void {
    if (this.options.enableLogging) {
      console.log('[BidirectionalStateManager] 🚀 Force bidirectional sync:', {
        nodeCount: snapshot.nodes.length,
        edgeCount: snapshot.edges.length
      });
    }

    // Clear any pending debounced operations
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }

    // Execute immediate sync to both sides
    this.executeSyncToReactFlow(snapshot);
    this.executeSyncToEventManager(snapshot);
  }

  /**
   * Get current synchronized state
   */
  getCurrentSnapshot(): StateSnapshot {
    return { ...this.currentSnapshot };
  }

  /**
   * Check if sync operation is currently in progress
   */
  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }

  /**
   * Update sync options at runtime
   */
  updateOptions(newOptions: Partial<SyncOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    if (this.options.enableLogging) {
      console.log('[BidirectionalStateManager] Options updated:', this.options);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    if (this.options.enableLogging) {
      console.log('[BidirectionalStateManager] Destroyed');
    }
  }

  // ===================================================================
  // Private Methods
  // ===================================================================

  private createEmptySnapshot(): StateSnapshot {
    return {
      nodes: [],
      edges: [],
      storyVariables: [],
      timestamp: Date.now(),
      version: 1
    };
  }

  private debouncedSyncToReactFlow(snapshot: StateSnapshot): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.executeSyncToReactFlow(snapshot);
    }, this.options.debounceDelayMs);
  }

  private debouncedSyncToEventManager(snapshot: StateSnapshot): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.executeSyncToEventManager(snapshot);
    }, this.options.debounceDelayMs);
  }

  private executeSyncToReactFlow(snapshot: StateSnapshot): void {
    try {
      this.callbacks.onReactFlowUpdate(snapshot.nodes, snapshot.edges);
      this.callbacks.onStateChange?.(snapshot);
    } catch (error) {
      this.handleError(error, 'EXECUTE_SYNC_TO_REACTFLOW');
    }
  }

  private executeSyncToEventManager(snapshot: StateSnapshot): void {
    try {
      this.callbacks.onEventManagerUpdate(
        snapshot.nodes, 
        snapshot.edges, 
        snapshot.storyVariables
      );
      this.callbacks.onStateChange?.(snapshot);
    } catch (error) {
      this.handleError(error, 'EXECUTE_SYNC_TO_EVENTMANAGER');
    }
  }

  private validateSnapshot(snapshot: StateSnapshot): void {
    if (!snapshot) {
      throw new Error('Snapshot is null or undefined');
    }

    if (!Array.isArray(snapshot.nodes)) {
      throw new Error('Snapshot.nodes must be an array');
    }

    if (!Array.isArray(snapshot.edges)) {
      throw new Error('Snapshot.edges must be an array');
    }

    if (!Array.isArray(snapshot.storyVariables)) {
      throw new Error('Snapshot.storyVariables must be an array');
    }

    if (typeof snapshot.timestamp !== 'number') {
      throw new Error('Snapshot.timestamp must be a number');
    }

    if (typeof snapshot.version !== 'number') {
      throw new Error('Snapshot.version must be a number');
    }

    // Validate nodes structure
    for (const node of snapshot.nodes) {
      if (!node.id) {
        throw new Error('Each node must have an id');
      }
    }

    // Validate edges structure  
    for (const edge of snapshot.edges) {
      if (!edge.id || !edge.source || !edge.target) {
        throw new Error('Each edge must have id, source, and target');
      }
    }
  }

  private handleError(error: unknown, context: string): void {
    const errorObj = error instanceof Error ? error : new Error('Unknown error');
    
    if (this.options.enableLogging) {
      console.error(`[BidirectionalStateManager] Error in ${context}:`, errorObj);
    }

    this.callbacks.onError?.(errorObj, context);
  }
}

// ===================================================================
// Factory Function
// ===================================================================

export function createBidirectionalStateManager(
  callbacks: SyncCallbacks, 
  options?: Partial<SyncOptions>
): BidirectionalStateManager {
  return new BidirectionalStateManager(callbacks, options);
}

export default BidirectionalStateManager;
