// src/lib/event-store/EventStore.ts
// ===================================================================
// Event Store Abstraction Layer
// Professional-grade event sourcing foundation for Blueprint Editor
// ===================================================================

import { CommandData } from '../commands/Command';

// ===================================================================
// Event Types
// ===================================================================

export interface StoryMapEvent {
  /** Unique event identifier */
  id: string;
  
  /** Event type matching command types */
  type: string;
  
  /** Timestamp when event occurred */
  timestamp: number;
  
  /** Event payload (from command serialization) */
  data: any;
  
  /** Metadata for event processing */
  metadata?: {
    userId?: string;
    sessionId?: string;
    clientVersion?: string;
    correlationId?: string;
    causationId?: string; // ID of event that caused this event
  };
  
  /** Version number for optimistic concurrency control */
  version?: number;
  
  /** Aggregate ID (story map ID) */
  aggregateId: string;
  
  /** Stream name for event partitioning */
  streamName: string;
}

export interface EventStreamInfo {
  streamName: string;
  aggregateId: string;
  version: number;
  lastEventId: string;
  lastEventTimestamp: number;
  eventCount: number;
}

export interface EventQuery {
  streamName?: string;
  aggregateId?: string;
  fromVersion?: number;
  toVersion?: number;
  fromTimestamp?: number;
  toTimestamp?: number;
  eventTypes?: string[];
  limit?: number;
  offset?: number;
}

export interface EventAppendResult {
  success: boolean;
  eventId: string;
  version: number;
  error?: string;
}

export interface EventBatch {
  events: StoryMapEvent[];
  expectedVersion?: number;
  transactionId?: string;
}

// ===================================================================
// Event Store Interface
// ===================================================================

export interface IEventStore {
  /**
   * Append a single event to the store
   */
  appendEvent(event: Omit<StoryMapEvent, 'id' | 'timestamp'>): Promise<EventAppendResult>;
  
  /**
   * Append multiple events as a batch (transactional)
   */
  appendBatch(batch: EventBatch): Promise<EventAppendResult[]>;
  
  /**
   * Read events from a stream
   */
  readEvents(query: EventQuery): Promise<StoryMapEvent[]>;
  
  /**
   * Get stream information
   */
  getStreamInfo(streamName: string, aggregateId: string): Promise<EventStreamInfo | null>;
  
  /**
   * Subscribe to real-time events (for Phase 2)
   */
  subscribe?(callback: (event: StoryMapEvent) => void): () => void; // Returns unsubscribe function
  
  /**
   * Health check
   */
  isHealthy(): Promise<boolean>;
}

// ===================================================================
// In-Memory Event Store (Phase 1 Implementation)
// ===================================================================

export class InMemoryEventStore implements IEventStore {
  private events: Map<string, StoryMapEvent[]> = new Map();
  private streamInfo: Map<string, EventStreamInfo> = new Map();
  private subscribers: ((event: StoryMapEvent) => void)[] = [];

  async appendEvent(eventData: Omit<StoryMapEvent, 'id' | 'timestamp'>): Promise<EventAppendResult> {
    try {
      const event: StoryMapEvent = {
        ...eventData,
        id: this.generateEventId(),
        timestamp: Date.now()
      };

      const streamKey = this.getStreamKey(event.streamName, event.aggregateId);
      
      // Get or create stream
      if (!this.events.has(streamKey)) {
        this.events.set(streamKey, []);
        this.streamInfo.set(streamKey, {
          streamName: event.streamName,
          aggregateId: event.aggregateId,
          version: 0,
          lastEventId: '',
          lastEventTimestamp: 0,
          eventCount: 0
        });
      }

      const stream = this.events.get(streamKey)!;
      const info = this.streamInfo.get(streamKey)!;

      // Set version
      event.version = info.version + 1;

      // Append event
      stream.push(event);

      // Update stream info
      info.version = event.version;
      info.lastEventId = event.id;
      info.lastEventTimestamp = event.timestamp;
      info.eventCount = stream.length;

      // Notify subscribers (for Phase 2 preparation)
      this.notifySubscribers(event);

      // Professional logging
      if (process.env.NODE_ENV === 'development') {
        console.log(`[EventStore] Event appended:`, {
          eventId: event.id,
          type: event.type,
          streamName: event.streamName,
          version: event.version,
          aggregateId: event.aggregateId
        });
      }

      return {
        success: true,
        eventId: event.id,
        version: event.version
      };

    } catch (error) {
      console.error('[EventStore] Failed to append event:', error);
      return {
        success: false,
        eventId: '',
        version: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async appendBatch(batch: EventBatch): Promise<EventAppendResult[]> {
    const results: EventAppendResult[] = [];
    
    try {
      // In Phase 1, we'll process sequentially
      // In Phase 2, this will be truly transactional
      for (const eventData of batch.events) {
        const result = await this.appendEvent(eventData);
        results.push(result);
        
        // If any event fails, we should rollback in a real implementation
        if (!result.success) {
          console.warn('[EventStore] Batch append failed at event:', eventData.type);
          break;
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`[EventStore] Batch append completed:`, {
          totalEvents: batch.events.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        });
      }

    } catch (error) {
      console.error('[EventStore] Batch append failed:', error);
    }

    return results;
  }

  async readEvents(query: EventQuery): Promise<StoryMapEvent[]> {
    try {
      let allEvents: StoryMapEvent[] = [];

      if (query.streamName && query.aggregateId) {
        // Read from specific stream
        const streamKey = this.getStreamKey(query.streamName, query.aggregateId);
        const stream = this.events.get(streamKey) || [];
        allEvents = [...stream];
      } else {
        // Read from all streams (less efficient, but works for Phase 1)
        for (const stream of this.events.values()) {
          allEvents.push(...stream);
        }
      }

      // Apply filters
      let filteredEvents = allEvents;

      if (query.fromVersion !== undefined) {
        filteredEvents = filteredEvents.filter(e => (e.version || 0) >= query.fromVersion!);
      }

      if (query.toVersion !== undefined) {
        filteredEvents = filteredEvents.filter(e => (e.version || 0) <= query.toVersion!);
      }

      if (query.fromTimestamp !== undefined) {
        filteredEvents = filteredEvents.filter(e => e.timestamp >= query.fromTimestamp!);
      }

      if (query.toTimestamp !== undefined) {
        filteredEvents = filteredEvents.filter(e => e.timestamp <= query.toTimestamp!);
      }

      if (query.eventTypes && query.eventTypes.length > 0) {
        filteredEvents = filteredEvents.filter(e => query.eventTypes!.includes(e.type));
      }

      // Sort by timestamp
      filteredEvents.sort((a, b) => a.timestamp - b.timestamp);

      // Apply pagination
      if (query.offset !== undefined) {
        filteredEvents = filteredEvents.slice(query.offset);
      }

      if (query.limit !== undefined) {
        filteredEvents = filteredEvents.slice(0, query.limit);
      }

      return filteredEvents;

    } catch (error) {
      console.error('[EventStore] Failed to read events:', error);
      return [];
    }
  }

  async getStreamInfo(streamName: string, aggregateId: string): Promise<EventStreamInfo | null> {
    const streamKey = this.getStreamKey(streamName, aggregateId);
    return this.streamInfo.get(streamKey) || null;
  }

  subscribe(callback: (event: StoryMapEvent) => void): () => void {
    this.subscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  async isHealthy(): Promise<boolean> {
    // In Phase 1, always healthy since it's in-memory
    return true;
  }

  // ===================================================================
  // Helper Methods
  // ===================================================================

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getStreamKey(streamName: string, aggregateId: string): string {
    return `${streamName}:${aggregateId}`;
  }

  private notifySubscribers(event: StoryMapEvent): void {
    // Async notification to avoid blocking
    setTimeout(() => {
      this.subscribers.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('[EventStore] Subscriber callback error:', error);
        }
      });
    }, 0);
  }

  // ===================================================================
  // Development/Debug Methods
  // ===================================================================

  /**
   * Get all events for debugging (Development only)
   */
  getAllEvents(): StoryMapEvent[] {
    const allEvents: StoryMapEvent[] = [];
    for (const stream of this.events.values()) {
      allEvents.push(...stream);
    }
    return allEvents.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Clear all events (Development only)
   */
  clearAllEvents(): void {
    if (process.env.NODE_ENV !== 'development') {
      console.warn('[EventStore] clearAllEvents called in non-development environment');
      return;
    }
    
    this.events.clear();
    this.streamInfo.clear();
    console.log('[EventStore] All events cleared');
  }

  /**
   * Get statistics (Development only)
   */
  getStatistics(): {
    totalStreams: number;
    totalEvents: number;
    averageEventsPerStream: number;
    oldestEvent?: StoryMapEvent;
    newestEvent?: StoryMapEvent;
  } {
    const totalStreams = this.events.size;
    let totalEvents = 0;
    
    for (const stream of this.events.values()) {
      totalEvents += stream.length;
    }

    const allEvents = this.getAllEvents();
    
    return {
      totalStreams,
      totalEvents,
      averageEventsPerStream: totalStreams > 0 ? totalEvents / totalStreams : 0,
      oldestEvent: allEvents[0],
      newestEvent: allEvents[allEvents.length - 1]
    };
  }
}

// ===================================================================
// HTTP Event Store (Phase 2 Implementation Placeholder)
// ===================================================================

export class HttpEventStore implements IEventStore {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string, headers: Record<string, string> = {}) {
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
      ...headers
    };
  }

  async appendEvent(eventData: Omit<StoryMapEvent, 'id' | 'timestamp'>): Promise<EventAppendResult> {
    // TODO: Implement in Phase 2
    console.log('[HttpEventStore] appendEvent not implemented in Phase 1');
    return { success: false, eventId: '', version: 0, error: 'Not implemented' };
  }

  async appendBatch(batch: EventBatch): Promise<EventAppendResult[]> {
    // TODO: Implement in Phase 2
    console.log('[HttpEventStore] appendBatch not implemented in Phase 1');
    return [];
  }

  async readEvents(query: EventQuery): Promise<StoryMapEvent[]> {
    // TODO: Implement in Phase 2
    console.log('[HttpEventStore] readEvents not implemented in Phase 1');
    return [];
  }

  async getStreamInfo(streamName: string, aggregateId: string): Promise<EventStreamInfo | null> {
    // TODO: Implement in Phase 2
    console.log('[HttpEventStore] getStreamInfo not implemented in Phase 1');
    return null;
  }

  async isHealthy(): Promise<boolean> {
    // TODO: Implement in Phase 2
    return false;
  }
}

// ===================================================================
// Factory Function
// ===================================================================

export function createEventStore(type: 'memory' | 'http' = 'memory', config?: any): IEventStore {
  switch (type) {
    case 'memory':
      return new InMemoryEventStore();
    case 'http':
      return new HttpEventStore(config?.baseUrl || '/api/events', config?.headers);
    default:
      throw new Error(`Unknown event store type: ${type}`);
  }
}
