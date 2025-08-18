// src/lib/event-bus/StateEventBus.ts
// ===================================================================
// Event-Driven State Synchronization Bus
// Provides pub/sub mechanism for real-time state updates
// ===================================================================

export type StateEventType = 
  | 'nodes_updated'
  | 'edges_updated' 
  | 'variables_updated'
  | 'undo_executed'
  | 'redo_executed'
  | 'snapshot_changed'
  | 'sync_requested'
  | 'error_occurred';

export interface StateEvent {
  type: StateEventType;
  payload: any;
  timestamp: number;
  source: 'reactflow' | 'eventmanager' | 'syncmanager' | 'user' | 'eventbus';
  eventId: string;
}

export interface StateEventListener {
  (event: StateEvent): void;
}

export interface StateEventOptions {
  enableLogging: boolean;
  enablePersistence: boolean;
  maxEventHistory: number;
}

/**
 * StateEventBus
 * Central event bus for coordinating state changes across different systems
 * Enables loosely coupled, event-driven architecture like Figma/Canva
 */
export class StateEventBus {
  private listeners: Map<StateEventType, Set<StateEventListener>>;
  private eventHistory: StateEvent[];
  private options: StateEventOptions;

  constructor(options: Partial<StateEventOptions> = {}) {
    this.listeners = new Map();
    this.eventHistory = [];
    this.options = {
      enableLogging: process.env.NODE_ENV === 'development',
      enablePersistence: false,
      maxEventHistory: 100,
      ...options
    };

    if (this.options.enableLogging) {
      console.log('[StateEventBus] Initialized with options:', this.options);
    }
  }

  /**
   * Subscribe to state events
   */
  subscribe(eventType: StateEventType, listener: StateEventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    this.listeners.get(eventType)!.add(listener);

    if (this.options.enableLogging) {
      console.log(`[StateEventBus] Subscribed to ${eventType}. Total listeners: ${this.listeners.get(eventType)!.size}`);
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribe(eventType, listener);
    };
  }

  /**
   * Unsubscribe from state events
   */
  unsubscribe(eventType: StateEventType, listener: StateEventListener): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
      
      if (this.options.enableLogging) {
        console.log(`[StateEventBus] Unsubscribed from ${eventType}. Remaining listeners: ${listeners.size}`);
      }

      if (listeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  /**
   * Emit state event to all subscribers
   */
  emit(eventType: StateEventType, payload: any, source: StateEvent['source']): string {
    const event: StateEvent = {
      type: eventType,
      payload,
      timestamp: Date.now(),
      source,
      eventId: this.generateEventId()
    };

    // Add to history
    this.addToHistory(event);

    if (this.options.enableLogging) {
      console.log(`[StateEventBus] 📡 Emitting ${eventType} from ${source}:`, {
        eventId: event.eventId,
        payload: payload,
        listenerCount: this.listeners.get(eventType)?.size || 0
      });
    }

    // Notify all listeners
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`[StateEventBus] Error in listener for ${eventType}:`, error);
          this.emit('error_occurred', { error, originalEvent: event }, 'eventbus');
        }
      });
    }

    return event.eventId;
  }

  /**
   * Emit nodes updated event
   */
  emitNodesUpdated(nodes: any[], source: StateEvent['source']): string {
    return this.emit('nodes_updated', { nodes }, source);
  }

  /**
   * Emit edges updated event
   */
  emitEdgesUpdated(edges: any[], source: StateEvent['source']): string {
    return this.emit('edges_updated', { edges }, source);
  }

  /**
   * Emit variables updated event
   */
  emitVariablesUpdated(variables: any[], source: StateEvent['source']): string {
    return this.emit('variables_updated', { variables }, source);
  }

  /**
   * Emit undo executed event
   */
  emitUndoExecuted(snapshot: any, source: StateEvent['source']): string {
    return this.emit('undo_executed', { snapshot }, source);
  }

  /**
   * Emit redo executed event
   */
  emitRedoExecuted(snapshot: any, source: StateEvent['source']): string {
    return this.emit('redo_executed', { snapshot }, source);
  }

  /**
   * Emit snapshot changed event
   */
  emitSnapshotChanged(snapshot: any, source: StateEvent['source']): string {
    return this.emit('snapshot_changed', { snapshot }, source);
  }

  /**
   * Request synchronization
   */
  requestSync(reason: string, source: StateEvent['source']): string {
    return this.emit('sync_requested', { reason }, source);
  }

  /**
   * Get recent event history
   */
  getEventHistory(count?: number): StateEvent[] {
    if (count) {
      return this.eventHistory.slice(-count);
    }
    return [...this.eventHistory];
  }

  /**
   * Get events by type
   */
  getEventsByType(eventType: StateEventType, count?: number): StateEvent[] {
    const events = this.eventHistory.filter(event => event.type === eventType);
    if (count) {
      return events.slice(-count);
    }
    return events;
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
    
    if (this.options.enableLogging) {
      console.log('[StateEventBus] Event history cleared');
    }
  }

  /**
   * Get current listener count for event type
   */
  getListenerCount(eventType: StateEventType): number {
    return this.listeners.get(eventType)?.size || 0;
  }

  /**
   * Get all active event types
   */
  getActiveEventTypes(): StateEventType[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Update event bus options
   */
  updateOptions(newOptions: Partial<StateEventOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    if (this.options.enableLogging) {
      console.log('[StateEventBus] Options updated:', this.options);
    }
  }

  /**
   * Cleanup all listeners and history
   */
  destroy(): void {
    this.listeners.clear();
    this.eventHistory = [];
    
    if (this.options.enableLogging) {
      console.log('[StateEventBus] Destroyed');
    }
  }

  // ===================================================================
  // Private Methods
  // ===================================================================

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addToHistory(event: StateEvent): void {
    this.eventHistory.push(event);

    // Limit history size
    if (this.eventHistory.length > this.options.maxEventHistory) {
      this.eventHistory = this.eventHistory.slice(-this.options.maxEventHistory);
    }

    // Persist if enabled
    if (this.options.enablePersistence) {
      this.persistEvent(event);
    }
  }

  private persistEvent(event: StateEvent): void {
    // Implementation for persistence (localStorage, IndexedDB, etc.)
    // For now, just log that persistence is requested
    if (this.options.enableLogging) {
      console.log('[StateEventBus] Event persistence requested:', event.eventId);
    }
  }
}

// ===================================================================
// Global Event Bus Instance
// ===================================================================

let globalEventBus: StateEventBus | null = null;

/**
 * Get or create global event bus instance
 */
export function getGlobalEventBus(): StateEventBus {
  if (!globalEventBus) {
    globalEventBus = new StateEventBus({
      enableLogging: process.env.NODE_ENV === 'development',
      enablePersistence: false,
      maxEventHistory: 100
    });
  }
  return globalEventBus;
}

/**
 * Create new event bus instance
 */
export function createEventBus(options?: Partial<StateEventOptions>): StateEventBus {
  return new StateEventBus(options);
}

export default StateEventBus;
