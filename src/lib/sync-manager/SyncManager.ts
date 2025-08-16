// src/lib/sync-manager/SyncManager.ts
// ===================================================================
// Sync Manager for Offline Support
// Professional-grade offline-first synchronization
// ===================================================================

import { Command, CommandData } from '../commands/Command';
import { ConflictResolver, ConflictResolution, ConflictContext } from '../conflict-resolution/ConflictResolver';

// ===================================================================
// Sync Manager Types
// ===================================================================

export interface SyncConfig {
  enableOfflineMode: boolean;
  maxQueueSize: number;
  syncInterval: number; // ms
  retryAttempts: number;
  retryDelay: number; // ms
  batchSize: number; // Number of commands to sync at once
  persistenceAdapter: PersistenceAdapter;
  conflictResolutionStrategy: 'last_write_wins' | 'merge' | 'manual';
}

export interface QueuedCommand {
  id: string;
  command: CommandData;
  timestamp: number;
  attempts: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  priority: number; // 1 = high, 2 = medium, 3 = low
  localVersion: number;
  sessionId: string;
}

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  queuedCommands: number;
  syncedCommands: number;
  failedCommands: number;
  lastSyncAt: Date | null;
  lastError?: string;
  syncProgress: number; // 0-1
  estimatedSyncTime: number; // seconds
}

export interface SyncMetrics {
  totalCommandsProcessed: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageSyncTime: number;
  queueSize: number;
  conflictsResolved: number;
}

export interface SyncBatch {
  id: string;
  commands: QueuedCommand[];
  startTime: number;
  priority: number;
}

export interface ConflictEvent {
  localCommand: QueuedCommand;
  remoteCommand: CommandData;
  resolution: ConflictResolution;
  timestamp: number;
}

// ===================================================================
// Persistence Adapter Interface
// ===================================================================

export interface PersistenceAdapter {
  initialize?(): Promise<void>; // Optional initialization method
  saveQueue(commands: QueuedCommand[]): Promise<void>;
  loadQueue(): Promise<QueuedCommand[]>;
  saveState(state: any): Promise<void>;
  loadState(): Promise<any>;
  clear(): Promise<void>;
}

// ===================================================================
// IndexedDB Persistence Adapter
// ===================================================================

export class IndexedDBAdapter implements PersistenceAdapter {
  private dbName = 'StoryMapSync';
  private version = 1;
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        // Server-side fallback
        resolve();
        return;
      }

      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('commandQueue')) {
          db.createObjectStore('commandQueue', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('syncState')) {
          db.createObjectStore('syncState', { keyPath: 'id' });
        }
      };
    });
  }

  async saveQueue(commands: QueuedCommand[]): Promise<void> {
    if (!this.db) await this.initialize();
    if (!this.db) return;

    const transaction = this.db.transaction(['commandQueue'], 'readwrite');
    const store = transaction.objectStore('commandQueue');

    // Clear existing queue
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    // Save new queue
    for (const command of commands) {
      await new Promise<void>((resolve, reject) => {
        const addRequest = store.add(command);
        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => reject(addRequest.error);
      });
    }
  }

  async loadQueue(): Promise<QueuedCommand[]> {
    if (!this.db) await this.initialize();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['commandQueue'], 'readonly');
      const store = transaction.objectStore('commandQueue');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveState(state: any): Promise<void> {
    if (!this.db) await this.initialize();
    if (!this.db) return;

    const transaction = this.db.transaction(['syncState'], 'readwrite');
    const store = transaction.objectStore('syncState');

    return new Promise<void>((resolve, reject) => {
      const request = store.put({ id: 'syncState', data: state });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async loadState(): Promise<any> {
    if (!this.db) await this.initialize();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncState'], 'readonly');
      const store = transaction.objectStore('syncState');
      const request = store.get('syncState');

      request.onsuccess = () => resolve(request.result?.data || null);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.initialize();
    if (!this.db) return;

    const transaction = this.db.transaction(['commandQueue', 'syncState'], 'readwrite');
    
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('commandQueue').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('syncState').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    ]);
  }
}

// ===================================================================
// Remote Sync Interface
// ===================================================================

export interface RemoteSyncAdapter {
  syncCommandBatch(commands: CommandData[]): Promise<{
    success: boolean;
    syncedCommands: string[];
    conflicts: Array<{
      localCommandId: string;
      remoteCommand: CommandData;
    }>;
    error?: string;
  }>;

  pullRemoteCommands(lastSyncTimestamp: number): Promise<{
    commands: CommandData[];
    timestamp: number;
  }>;

  isOnline(): boolean;
  
  onConnectionChange(callback: (isOnline: boolean) => void): () => void;
}

// ===================================================================
// Sync Manager Class
// ===================================================================

export class SyncManager {
  private config: SyncConfig;
  private conflictResolver: ConflictResolver;
  private remoteSyncAdapter: RemoteSyncAdapter;
  private commandQueue: QueuedCommand[] = [];
  private state: SyncState;
  private metrics: SyncMetrics;
  private syncTimer?: NodeJS.Timeout;
  private isInitialized = false;
  private eventListeners: Map<string, ((...args: any[]) => void)[]> = new Map();
  private conflictEvents: ConflictEvent[] = [];
  private lastSyncTimestamp = 0;

  constructor(
    config: Partial<SyncConfig>,
    remoteSyncAdapter: RemoteSyncAdapter
  ) {
    this.config = {
      enableOfflineMode: true,
      maxQueueSize: 1000,
      syncInterval: 5000, // 5 seconds
      retryAttempts: 3,
      retryDelay: 1000,
      batchSize: 50,
      persistenceAdapter: new IndexedDBAdapter(),
      conflictResolutionStrategy: 'merge',
      ...config
    };

    this.remoteSyncAdapter = remoteSyncAdapter;
    this.conflictResolver = new ConflictResolver(this.config.conflictResolutionStrategy);
    this.state = this.createInitialState();
    this.metrics = this.createInitialMetrics();

    this.setupConnectionMonitoring();
  }

  // ===================================================================
  // Public API
  // ===================================================================

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize persistence adapter
      if (typeof this.config.persistenceAdapter.initialize === 'function') {
        await this.config.persistenceAdapter.initialize();
      }

      // Load persisted queue and state
      this.commandQueue = await this.config.persistenceAdapter.loadQueue();
      const persistedState = await this.config.persistenceAdapter.loadState();
      
      if (persistedState) {
        this.state = { ...this.state, ...persistedState };
        this.lastSyncTimestamp = persistedState.lastSyncTimestamp || 0;
      }

      // Start sync timer
      this.startSyncTimer();

      // Pull remote commands if online
      if (this.state.isOnline) {
        await this.pullRemoteCommands();
      }

      this.isInitialized = true;
      this.emit('initialized');

      console.log('[SyncManager] Initialized with', this.commandQueue.length, 'queued commands');

    } catch (error) {
      console.error('[SyncManager] Initialization failed:', error);
      throw error;
    }
  }

  async queueCommand(command: CommandData, priority: number = 2): Promise<void> {
    const queuedCommand: QueuedCommand = {
      id: command.id,
      command,
      timestamp: Date.now(),
      attempts: 0,
      status: 'pending',
      priority,
      localVersion: this.getNextLocalVersion(),
      sessionId: this.generateSessionId()
    };

    // Add to queue
    this.commandQueue.push(queuedCommand);
    
    // Sort by priority and timestamp
    this.sortQueue();

    // Enforce queue size limit
    if (this.commandQueue.length > this.config.maxQueueSize) {
      const removed = this.commandQueue.shift();
      console.warn('[SyncManager] Queue size limit reached, removing oldest command:', removed?.id);
    }

    // Persist queue
    await this.persistQueue();

    // Update state
    this.updateState({
      queuedCommands: this.commandQueue.filter(c => c.status === 'pending').length
    });

    this.emit('commandQueued', queuedCommand);

    // Try immediate sync if online
    if (this.state.isOnline && !this.state.isSyncing) {
      this.triggerSync();
    }
  }

  async syncNow(): Promise<void> {
    if (!this.state.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    await this.performSync();
  }

  async clearQueue(): Promise<void> {
    this.commandQueue = [];
    await this.persistQueue();
    
    this.updateState({
      queuedCommands: 0,
      failedCommands: 0
    });

    this.emit('queueCleared');
  }

  async reset(): Promise<void> {
    await this.config.persistenceAdapter.clear();
    this.commandQueue = [];
    this.state = this.createInitialState();
    this.metrics = this.createInitialMetrics();
    this.conflictEvents = [];
    this.lastSyncTimestamp = 0;

    this.emit('reset');
  }

  getState(): SyncState {
    return { ...this.state };
  }

  getMetrics(): SyncMetrics {
    return { ...this.metrics };
  }

  getQueuedCommands(): QueuedCommand[] {
    return [...this.commandQueue];
  }

  getConflictHistory(): ConflictEvent[] {
    return [...this.conflictEvents];
  }

  on(event: string, listener: (...args: any[]) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    
    this.eventListeners.get(event)!.push(listener);
    
    return () => this.off(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    this.eventListeners.clear();
    console.log('[SyncManager] Destroyed');
  }

  // ===================================================================
  // Private Methods
  // ===================================================================

  private setupConnectionMonitoring(): void {
    this.state.isOnline = this.remoteSyncAdapter.isOnline();
    
    this.remoteSyncAdapter.onConnectionChange((isOnline) => {
      const wasOnline = this.state.isOnline;
      this.updateState({ isOnline });
      
      if (!wasOnline && isOnline) {
        // Came back online
        this.emit('connectionRestored');
        this.triggerSync();
        this.pullRemoteCommands();
      } else if (wasOnline && !isOnline) {
        // Went offline
        this.emit('connectionLost');
      }
    });
  }

  private startSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      if (this.state.isOnline && !this.state.isSyncing && this.commandQueue.some(c => c.status === 'pending')) {
        this.triggerSync();
      }
    }, this.config.syncInterval);
  }

  private triggerSync(): void {
    this.performSync().catch(error => {
      console.error('[SyncManager] Sync failed:', error);
    });
  }

  private async performSync(): Promise<void> {
    if (this.state.isSyncing || !this.state.isOnline) {
      return;
    }

    this.updateState({ isSyncing: true });
    const startTime = Date.now();

    try {
      // Get pending commands
      const pendingCommands = this.commandQueue.filter(c => c.status === 'pending');
      
      if (pendingCommands.length === 0) {
        return;
      }

      // Create batches
      const batches = this.createSyncBatches(pendingCommands);
      
      for (const batch of batches) {
        await this.syncBatch(batch);
      }

      // Update metrics
      const syncTime = Date.now() - startTime;
      this.updateMetrics(syncTime);
      
      this.updateState({
        lastSyncAt: new Date(),
        lastError: undefined,
        syncProgress: 1
      });

      this.emit('syncCompleted');

    } catch (error) {
      this.updateState({
        lastError: error instanceof Error ? error.message : 'Unknown sync error'
      });
      
      this.emit('syncFailed', error);
      throw error;
      
    } finally {
      this.updateState({ isSyncing: false, syncProgress: 0 });
      await this.persistQueue();
    }
  }

  private createSyncBatches(commands: QueuedCommand[]): SyncBatch[] {
    const batches: SyncBatch[] = [];
    const sortedCommands = [...commands].sort((a, b) => a.priority - b.priority);
    
    for (let i = 0; i < sortedCommands.length; i += this.config.batchSize) {
      const batchCommands = sortedCommands.slice(i, i + this.config.batchSize);
      
      batches.push({
        id: `batch_${Date.now()}_${i}`,
        commands: batchCommands,
        startTime: Date.now(),
        priority: Math.min(...batchCommands.map(c => c.priority))
      });
    }
    
    return batches;
  }

  private async syncBatch(batch: SyncBatch): Promise<void> {
    const commandData = batch.commands.map(c => c.command);
    
    try {
      // Mark as syncing
      batch.commands.forEach(cmd => {
        cmd.status = 'syncing';
        cmd.attempts++;
      });

      const result = await this.remoteSyncAdapter.syncCommandBatch(commandData);

      if (result.success) {
        // Mark synced commands
        batch.commands.forEach(cmd => {
          if (result.syncedCommands.includes(cmd.id)) {
            cmd.status = 'synced';
            this.metrics.successfulSyncs++;
          }
        });

        // Handle conflicts
        for (const conflict of result.conflicts) {
          await this.handleConflict(conflict.localCommandId, conflict.remoteCommand);
        }

        // Remove synced commands from queue
        this.commandQueue = this.commandQueue.filter(c => c.status !== 'synced');

      } else {
        // Handle sync failure
        batch.commands.forEach(cmd => {
          cmd.status = cmd.attempts >= this.config.retryAttempts ? 'failed' : 'pending';
          if (cmd.status === 'failed') {
            this.metrics.failedSyncs++;
          }
        });

        if (result.error) {
          throw new Error(result.error);
        }
      }

    } catch (error) {
      // Mark commands as failed or pending for retry
      batch.commands.forEach(cmd => {
        cmd.status = cmd.attempts >= this.config.retryAttempts ? 'failed' : 'pending';
        if (cmd.status === 'failed') {
          this.metrics.failedSyncs++;
        }
      });

      throw error;
    }
  }

  private async handleConflict(localCommandId: string, remoteCommand: CommandData): Promise<void> {
    const localCommand = this.commandQueue.find(c => c.id === localCommandId);
    if (!localCommand) return;

    const conflictContext: ConflictContext = {
      localCommand: localCommand.command,
      remoteCommand,
      currentState: {}, // Would need actual state here
      conflictTimestamp: Date.now(),
      localUserId: 'current_user', // Would need actual user ID
      remoteUserId: (remoteCommand as any).userId || 'unknown' // Type assertion for userId property
    };

    try {
      const resolution = await this.conflictResolver.resolve(conflictContext);
      
      // Store conflict event
      const conflictEvent: ConflictEvent = {
        localCommand,
        remoteCommand,
        resolution,
        timestamp: Date.now()
      };
      
      this.conflictEvents.push(conflictEvent);
      this.metrics.conflictsResolved++;
      
      // Apply resolution
      if (resolution.resolvedCommand) {
        // Update local command with resolved version
        localCommand.command = resolution.resolvedCommand;
      }
      
      if (resolution.requiresManualResolution) {
        localCommand.status = 'failed'; // Will need manual intervention
        this.emit('conflictRequiresManualResolution', conflictEvent);
      }

      this.emit('conflictResolved', conflictEvent);

    } catch (error) {
      console.error('[SyncManager] Conflict resolution failed:', error);
      localCommand.status = 'failed';
    }
  }

  private async pullRemoteCommands(): Promise<void> {
    try {
      const result = await this.remoteSyncAdapter.pullRemoteCommands(this.lastSyncTimestamp);
      
      if (result.commands.length > 0) {
        this.lastSyncTimestamp = result.timestamp;
        this.emit('remoteCommandsReceived', result.commands);
      }

    } catch (error) {
      console.error('[SyncManager] Failed to pull remote commands:', error);
    }
  }

  private sortQueue(): void {
    this.commandQueue.sort((a, b) => {
      // Sort by priority first, then by timestamp
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.timestamp - b.timestamp;
    });
  }

  private async persistQueue(): Promise<void> {
    try {
      await this.config.persistenceAdapter.saveQueue(this.commandQueue);
    } catch (error) {
      console.error('[SyncManager] Failed to persist queue:', error);
    }
  }

  private updateState(updates: Partial<SyncState>): void {
    this.state = { ...this.state, ...updates };
    
    // Calculate derived state
    this.state.queuedCommands = this.commandQueue.filter(c => c.status === 'pending').length;
    this.state.failedCommands = this.commandQueue.filter(c => c.status === 'failed').length;
    this.state.syncedCommands = this.metrics.successfulSyncs;

    this.emit('stateChanged', this.state);
  }

  private updateMetrics(syncTime?: number): void {
    if (syncTime) {
      this.metrics.totalCommandsProcessed++;
      this.metrics.averageSyncTime = 
        (this.metrics.averageSyncTime * (this.metrics.totalCommandsProcessed - 1) + syncTime) / 
        this.metrics.totalCommandsProcessed;
    }

    this.metrics.queueSize = this.commandQueue.length;
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`[SyncManager] Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  private getNextLocalVersion(): number {
    return Date.now();
  }

  private generateSessionId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createInitialState(): SyncState {
    return {
      isOnline: false,
      isSyncing: false,
      queuedCommands: 0,
      syncedCommands: 0,
      failedCommands: 0,
      lastSyncAt: null,
      syncProgress: 0,
      estimatedSyncTime: 0
    };
  }

  private createInitialMetrics(): SyncMetrics {
    return {
      totalCommandsProcessed: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageSyncTime: 0,
      queueSize: 0,
      conflictsResolved: 0
    };
  }
}

// ===================================================================
// Factory Function
// ===================================================================

export function createSyncManager(
  config: Partial<SyncConfig>,
  remoteSyncAdapter: RemoteSyncAdapter
): SyncManager {
  return new SyncManager(config, remoteSyncAdapter);
}

export default SyncManager;
