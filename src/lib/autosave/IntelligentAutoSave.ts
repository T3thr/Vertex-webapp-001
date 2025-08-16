// src/lib/autosave/IntelligentAutoSave.ts
// ===================================================================
// Intelligent Auto-Save System
// Professional-grade smart auto-saving with multiple triggers
// ===================================================================

import { CommandData } from '../commands/Command';

// ===================================================================
// Auto-Save Types
// ===================================================================

export interface AutoSaveConfig {
  enabled: boolean;
  
  // Timing settings
  idleThreshold: number; // ms before considering user idle
  maxSaveInterval: number; // Maximum time between saves (ms)
  minSaveInterval: number; // Minimum time between saves (ms)
  
  // Trigger settings
  enableIdleSave: boolean; // Save when user becomes idle
  enableSignificantChangeSave: boolean; // Save on significant changes
  enablePeriodicSave: boolean; // Save at regular intervals
  enableBeforeUnloadSave: boolean; // Save before page unload
  enableVisibilityChangeSave: boolean; // Save when tab becomes hidden
  
  // Change detection
  significantChangeThreshold: number; // Number of commands to trigger save
  importantCommandTypes: string[]; // Command types that trigger immediate save
  
  // Batching
  enableBatching: boolean; // Batch commands for efficiency
  batchSize: number; // Maximum commands per batch
  batchTimeout: number; // Maximum time to wait for batch (ms)
  
  // Error handling
  maxRetryAttempts: number;
  retryDelay: number; // ms
  exponentialBackoff: boolean;
}

export interface AutoSaveState {
  isEnabled: boolean;
  isSaving: boolean;
  lastSaveAt: Date | null;
  nextSaveAt: Date | null;
  pendingChanges: number;
  saveError?: string;
  retryAttempts: number;
  currentBatch: CommandData[];
  idleStartTime?: number;
  totalSaves: number;
  successfulSaves: number;
  failedSaves: number;
}

export interface AutoSaveMetrics {
  totalSaves: number;
  successfulSaves: number;
  failedSaves: number;
  averageSaveTime: number;
  saveSuccessRate: number;
  idleSaves: number;
  significantChangeSaves: number;
  periodicSaves: number;
  beforeUnloadSaves: number;
  visibilityChangeSaves: number;
}

export interface SaveTrigger {
  type: 'idle' | 'significant_change' | 'periodic' | 'before_unload' | 'visibility_change' | 'manual';
  timestamp: number;
  commandCount: number;
  reason: string;
}

export interface SaveOperation {
  id: string;
  trigger: SaveTrigger;
  commands: CommandData[];
  startTime: number;
  endTime?: number;
  success: boolean;
  error?: string;
  retryAttempts: number;
}

// ===================================================================
// Save Provider Interface
// ===================================================================

export interface SaveProvider {
  save(commands: CommandData[]): Promise<void>;
  canSave(): boolean;
}

// ===================================================================
// User Activity Detector
// ===================================================================

class UserActivityDetector {
  private lastActivityTime = Date.now();
  private listeners: (() => void)[] = [];
  private isListening = false;

  constructor() {
    this.handleActivity = this.handleActivity.bind(this);
  }

  start(): void {
    if (this.isListening) return;
    
    if (typeof window !== 'undefined') {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      events.forEach(event => {
        window.addEventListener(event, this.handleActivity, { passive: true });
      });
    }
    
    this.isListening = true;
  }

  stop(): void {
    if (!this.isListening) return;
    
    if (typeof window !== 'undefined') {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      events.forEach(event => {
        window.removeEventListener(event, this.handleActivity);
      });
    }
    
    this.isListening = false;
  }

  getLastActivityTime(): number {
    return this.lastActivityTime;
  }

  isIdle(threshold: number): boolean {
    return Date.now() - this.lastActivityTime > threshold;
  }

  onActivity(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private handleActivity(): void {
    this.lastActivityTime = Date.now();
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('[UserActivityDetector] Error in activity listener:', error);
      }
    });
  }
}

// ===================================================================
// Intelligent Auto-Save Class
// ===================================================================

export class IntelligentAutoSave {
  private config: AutoSaveConfig;
  private saveProvider: SaveProvider;
  private state: AutoSaveState;
  private metrics: AutoSaveMetrics;
  private activityDetector: UserActivityDetector;
  
  private pendingCommands: CommandData[] = [];
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private saveOperations: SaveOperation[] = [];
  private eventListeners: Map<string, Function[]> = new Map();
  private saveTimes: number[] = [];
  
  private isDestroyed = false;

  constructor(config: Partial<AutoSaveConfig>, saveProvider: SaveProvider) {
    this.config = {
      enabled: true,
      idleThreshold: 2000, // 2 seconds
      maxSaveInterval: 30000, // 30 seconds
      minSaveInterval: 1000, // 1 second
      enableIdleSave: true,
      enableSignificantChangeSave: true,
      enablePeriodicSave: true,
      enableBeforeUnloadSave: true,
      enableVisibilityChangeSave: true,
      significantChangeThreshold: 5,
      importantCommandTypes: ['DELETE_NODE', 'DELETE_EDGE', 'ADD_NODE', 'ADD_EDGE'],
      enableBatching: true,
      batchSize: 20,
      batchTimeout: 2000,
      maxRetryAttempts: 3,
      retryDelay: 1000,
      exponentialBackoff: true,
      ...config
    };

    this.saveProvider = saveProvider;
    this.state = this.createInitialState();
    this.metrics = this.createInitialMetrics();
    this.activityDetector = new UserActivityDetector();

    this.setupEventListeners();
  }

  // ===================================================================
  // Public API
  // ===================================================================

  start(): void {
    if (!this.config.enabled || this.state.isEnabled) return;

    this.state.isEnabled = true;
    this.activityDetector.start();
    
    this.schedulePeriodicSave();
    this.setupIdleDetection();
    this.setupBeforeUnloadHandler();
    this.setupVisibilityChangeHandler();

    this.emit('started');
    console.log('[IntelligentAutoSave] Started');
  }

  stop(): void {
    if (!this.state.isEnabled) return;

    this.state.isEnabled = false;
    this.activityDetector.stop();
    this.clearAllTimers();

    this.emit('stopped');
    console.log('[IntelligentAutoSave] Stopped');
  }

  async addCommand(command: CommandData): Promise<void> {
    if (!this.state.isEnabled || this.isDestroyed) return;

    this.pendingCommands.push(command);
    this.state.pendingChanges = this.pendingCommands.length;

    // Check for immediate save triggers
    await this.checkSaveTriggers(command);

    this.emit('commandAdded', command);
  }

  async saveNow(reason: string = 'manual'): Promise<void> {
    if (!this.saveProvider.canSave()) {
      throw new Error('Save provider is not available');
    }

    const trigger: SaveTrigger = {
      type: 'manual',
      timestamp: Date.now(),
      commandCount: this.pendingCommands.length,
      reason
    };

    await this.performSave(trigger);
  }

  async flush(): Promise<void> {
    if (this.pendingCommands.length > 0) {
      await this.saveNow('flush');
    }
  }

  getState(): AutoSaveState {
    return { ...this.state };
  }

  getMetrics(): AutoSaveMetrics {
    return { ...this.metrics };
  }

  getSaveHistory(): SaveOperation[] {
    return [...this.saveOperations.slice(-50)]; // Last 50 operations
  }

  updateConfig(newConfig: Partial<AutoSaveConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (!this.config.enabled) {
      this.stop();
    } else if (!this.state.isEnabled) {
      this.start();
    }

    this.emit('configUpdated', this.config);
  }

  on(event: string, listener: Function): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    
    this.eventListeners.get(event)!.push(listener);
    
    return () => this.off(event, listener);
  }

  off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  destroy(): void {
    this.isDestroyed = true;
    this.stop();
    this.clearAllTimers();
    this.eventListeners.clear();
    this.pendingCommands = [];
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }

    console.log('[IntelligentAutoSave] Destroyed');
  }

  // ===================================================================
  // Private Methods
  // ===================================================================

  private setupEventListeners(): void {
    // Activity detection for idle saves
    this.activityDetector.onActivity(() => {
      this.handleUserActivity();
    });
  }

  private async checkSaveTriggers(command: CommandData): Promise<void> {
    // Immediate save for important commands
    if (this.config.enableSignificantChangeSave && this.config.importantCommandTypes.includes(command.type)) {
      const trigger: SaveTrigger = {
        type: 'significant_change',
        timestamp: Date.now(),
        commandCount: this.pendingCommands.length,
        reason: `Important command: ${command.type}`
      };
      
      await this.performSave(trigger);
      return;
    }

    // Significant change threshold
    if (this.config.enableSignificantChangeSave && 
        this.pendingCommands.length >= this.config.significantChangeThreshold) {
      const trigger: SaveTrigger = {
        type: 'significant_change',
        timestamp: Date.now(),
        commandCount: this.pendingCommands.length,
        reason: `Change threshold reached: ${this.pendingCommands.length} commands`
      };
      
      await this.performSave(trigger);
      return;
    }

    // Batch timeout
    if (this.config.enableBatching) {
      this.scheduleBatchSave();
    }
  }

  private async performSave(trigger: SaveTrigger): Promise<void> {
    if (this.state.isSaving || this.pendingCommands.length === 0) {
      return;
    }

    const operation: SaveOperation = {
      id: `save_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      trigger,
      commands: [...this.pendingCommands],
      startTime: Date.now(),
      success: false,
      retryAttempts: 0
    };

    this.state.isSaving = true;
    this.emit('saveStarted', operation);

    try {
      await this.saveProvider.save(operation.commands);
      
      // Success
      operation.success = true;
      operation.endTime = Date.now();
      
      this.pendingCommands = [];
      this.state.pendingChanges = 0;
      this.state.lastSaveAt = new Date();
      this.state.saveError = undefined;
      this.state.retryAttempts = 0;
      this.state.successfulSaves++;
      
      // Update metrics
      this.updateSaveMetrics(operation);
      
      this.emit('saveCompleted', operation);

    } catch (error) {
      // Failure
      operation.error = error instanceof Error ? error.message : 'Unknown error';
      operation.endTime = Date.now();
      
      this.state.saveError = operation.error;
      this.state.failedSaves++;
      
      // Retry logic
      if (operation.retryAttempts < this.config.maxRetryAttempts) {
        await this.scheduleRetry(operation);
      } else {
        this.emit('saveFailed', operation);
      }
      
      throw error;
      
    } finally {
      this.state.isSaving = false;
      this.saveOperations.push(operation);
      
      // Keep only recent operations
      if (this.saveOperations.length > 100) {
        this.saveOperations = this.saveOperations.slice(-100);
      }
    }
  }

  private async scheduleRetry(operation: SaveOperation): Promise<void> {
    operation.retryAttempts++;
    this.state.retryAttempts = operation.retryAttempts;
    
    const delay = this.config.exponentialBackoff 
      ? this.config.retryDelay * Math.pow(2, operation.retryAttempts - 1)
      : this.config.retryDelay;

    this.setTimer('retry', setTimeout(async () => {
      try {
        await this.performSave(operation.trigger);
      } catch (error) {
        console.error('[IntelligentAutoSave] Retry failed:', error);
      }
    }, delay));

    this.emit('saveRetryScheduled', { operation, delay });
  }

  private schedulePeriodicSave(): void {
    if (!this.config.enablePeriodicSave) return;

    this.clearTimer('periodic');
    
    this.setTimer('periodic', setTimeout(async () => {
      if (this.pendingCommands.length > 0) {
        const trigger: SaveTrigger = {
          type: 'periodic',
          timestamp: Date.now(),
          commandCount: this.pendingCommands.length,
          reason: 'Periodic save interval'
        };
        
        try {
          await this.performSave(trigger);
        } catch (error) {
          console.error('[IntelligentAutoSave] Periodic save failed:', error);
        }
      }
      
      // Schedule next periodic save
      this.schedulePeriodicSave();
    }, this.config.maxSaveInterval));
  }

  private setupIdleDetection(): void {
    if (!this.config.enableIdleSave) return;

    this.clearTimer('idle');
    
    const checkIdle = () => {
      if (this.activityDetector.isIdle(this.config.idleThreshold) && this.pendingCommands.length > 0) {
        if (!this.state.idleStartTime) {
          this.state.idleStartTime = Date.now();
        }
        
        const trigger: SaveTrigger = {
          type: 'idle',
          timestamp: Date.now(),
          commandCount: this.pendingCommands.length,
          reason: 'User became idle'
        };
        
        this.performSave(trigger).catch(error => {
          console.error('[IntelligentAutoSave] Idle save failed:', error);
        });
      } else {
        this.state.idleStartTime = undefined;
      }
    };

    this.setTimer('idle', setInterval(checkIdle, this.config.idleThreshold / 2));
  }

  private scheduleBatchSave(): void {
    this.clearTimer('batch');
    
    this.setTimer('batch', setTimeout(async () => {
      if (this.pendingCommands.length > 0) {
        const trigger: SaveTrigger = {
          type: 'periodic',
          timestamp: Date.now(),
          commandCount: this.pendingCommands.length,
          reason: 'Batch timeout'
        };
        
        try {
          await this.performSave(trigger);
        } catch (error) {
          console.error('[IntelligentAutoSave] Batch save failed:', error);
        }
      }
    }, this.config.batchTimeout));
  }

  private handleUserActivity(): void {
    this.state.idleStartTime = undefined;
  }

  private setupBeforeUnloadHandler(): void {
    if (!this.config.enableBeforeUnloadSave || typeof window === 'undefined') return;

    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  private handleBeforeUnload = (event: BeforeUnloadEvent): void => {
    if (this.pendingCommands.length > 0) {
      // Try to save synchronously (limited time)
      const trigger: SaveTrigger = {
        type: 'before_unload',
        timestamp: Date.now(),
        commandCount: this.pendingCommands.length,
        reason: 'Page unload'
      };
      
      // Note: Modern browsers limit what can be done in beforeunload
      // This might need to use sendBeacon or similar for reliability
      this.performSave(trigger).catch(() => {
        // Ignore errors during unload
      });
      
      event.preventDefault();
      event.returnValue = '';
    }
  };

  private setupVisibilityChangeHandler(): void {
    if (!this.config.enableVisibilityChangeSave || typeof document === 'undefined') return;

    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden && this.pendingCommands.length > 0) {
      const trigger: SaveTrigger = {
        type: 'visibility_change',
        timestamp: Date.now(),
        commandCount: this.pendingCommands.length,
        reason: 'Tab became hidden'
      };
      
      this.performSave(trigger).catch(error => {
        console.error('[IntelligentAutoSave] Visibility change save failed:', error);
      });
    }
  };

  private updateSaveMetrics(operation: SaveOperation): void {
    this.state.totalSaves++;
    this.metrics.totalSaves++;
    
    if (operation.success) {
      this.metrics.successfulSaves++;
      
      const saveTime = operation.endTime! - operation.startTime;
      this.saveTimes.push(saveTime);
      
      if (this.saveTimes.length > 100) {
        this.saveTimes = this.saveTimes.slice(-100);
      }
      
      this.metrics.averageSaveTime = this.saveTimes.reduce((sum, time) => sum + time, 0) / this.saveTimes.length;
      
      // Update trigger-specific metrics
      switch (operation.trigger.type) {
        case 'idle':
          this.metrics.idleSaves++;
          break;
        case 'significant_change':
          this.metrics.significantChangeSaves++;
          break;
        case 'periodic':
          this.metrics.periodicSaves++;
          break;
        case 'before_unload':
          this.metrics.beforeUnloadSaves++;
          break;
        case 'visibility_change':
          this.metrics.visibilityChangeSaves++;
          break;
      }
    } else {
      this.metrics.failedSaves++;
    }
    
    this.metrics.saveSuccessRate = this.metrics.totalSaves > 0 
      ? this.metrics.successfulSaves / this.metrics.totalSaves 
      : 0;
  }

  private setTimer(key: string, timer: NodeJS.Timeout): void {
    this.clearTimer(key);
    this.timers.set(key, timer);
  }

  private clearTimer(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  private clearAllTimers(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`[IntelligentAutoSave] Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  private createInitialState(): AutoSaveState {
    return {
      isEnabled: false,
      isSaving: false,
      lastSaveAt: null,
      nextSaveAt: null,
      pendingChanges: 0,
      retryAttempts: 0,
      currentBatch: [],
      totalSaves: 0,
      successfulSaves: 0,
      failedSaves: 0
    };
  }

  private createInitialMetrics(): AutoSaveMetrics {
    return {
      totalSaves: 0,
      successfulSaves: 0,
      failedSaves: 0,
      averageSaveTime: 0,
      saveSuccessRate: 0,
      idleSaves: 0,
      significantChangeSaves: 0,
      periodicSaves: 0,
      beforeUnloadSaves: 0,
      visibilityChangeSaves: 0
    };
  }
}

// ===================================================================
// Factory Function
// ===================================================================

export function createIntelligentAutoSave(
  config: Partial<AutoSaveConfig>,
  saveProvider: SaveProvider
): IntelligentAutoSave {
  return new IntelligentAutoSave(config, saveProvider);
}

export default IntelligentAutoSave;
