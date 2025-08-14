// src/app/novels/[slug]/overview/components/tabs/SaveManager.ts
// ===================================================================
// Unified Save Manager - ระบบจัดการการบันทึกแบบรวมศูนย์
// ===================================================================
// 
// ระบบนี้ถูกออกแบบให้มีประสิทธิภาพระดับ Canva/Premiere Pro โดย:
// 1. รวมทุกการบันทึกให้เป็นระบบเดียว (Single Entry Point)
// 2. จัดการ Version Conflicts อัตโนมัติ
// 3. ใช้ Hybrid Auto-save Strategy
// 4. มี Visual Feedback ที่ชัดเจน

import React from 'react';
import { toast } from 'sonner';

// ===================================================================
// SECTION: Type Definitions
// ===================================================================

export type SaveStatus = 'idle' | 'saving' | 'conflict' | 'error';

export type OperationType = 
  | 'ADD_NODE' | 'DELETE_NODE' | 'UPDATE_NODE' | 'MOVE_NODE'
  | 'ADD_EDGE' | 'DELETE_EDGE' | 'UPDATE_EDGE'
  | 'UPDATE_CANVAS' | 'BATCH_UPDATE';

export type SaveStrategy = 'immediate' | 'debounced' | 'manual';

export interface SaveOperation {
  id: string;
  type: OperationType;
  data: any;
  timestamp: number;
  strategy: SaveStrategy;
  retryCount: number;
}

export interface UnifiedSaveState {
  // Status Management
  status: SaveStatus;
  isSaving: boolean;
  lastSaved: Date | null;
  
  // Version Control
  localVersion: number;
  serverVersion: number;
  etag?: string;
  
  // Queue Management
  pendingOperations: SaveOperation[];
  isProcessingQueue: boolean;
  
  // Error Handling
  lastError?: string;
  retryCount: number;
  
  // Dirty State
  isDirty: boolean;
  hasUnsavedChanges: boolean;
}

export interface SaveManagerConfig {
  novelSlug: string;
  autoSaveEnabled: boolean;
  autoSaveIntervalMs: number;
  debounceDelayMs: number;
  maxRetries: number;
  onStateChange?: (state: UnifiedSaveState) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

// ===================================================================
// SECTION: Unified Save Manager Class
// ===================================================================

export class UnifiedSaveManager {
  private config: SaveManagerConfig;
  private state: UnifiedSaveState;
  private debounceTimer?: NodeJS.Timeout;
  private autoSaveTimer?: NodeJS.Timeout;
  private isProcessing = false;
  
  // Operation categorization สำหรับ hybrid strategy
  private readonly immediateOperations = new Set<OperationType>([
    'DELETE_NODE', 'DELETE_EDGE', 'ADD_NODE', 'ADD_EDGE'
  ]);
  
  private readonly deferredOperations = new Set<OperationType>([
    'MOVE_NODE', 'UPDATE_NODE', 'UPDATE_EDGE', 'UPDATE_CANVAS'
  ]);

  constructor(config: SaveManagerConfig) {
    this.config = config;
    this.state = this.createInitialState();
    
    // เริ่ม auto-save timer ถ้าเปิดใช้งาน
    if (config.autoSaveEnabled) {
      this.startAutoSaveTimer();
    }
  }

  // ===================================================================
  // SECTION: Public API Methods
  // ===================================================================

  /**
   * หลักสำคัญ: Single Entry Point สำหรับทุกการบันทึก
   * จัดการ strategy อัตโนมัติตามประเภทของ operation
   */
  public async saveOperation(operation: Omit<SaveOperation, 'id' | 'timestamp' | 'retryCount'>) {
    const fullOperation: SaveOperation = {
      ...operation,
      id: this.generateOperationId(),
      timestamp: Date.now(),
      retryCount: 0
    };

    // กำหนด strategy ตามประเภท operation
    if (this.immediateOperations.has(operation.type)) {
      fullOperation.strategy = 'immediate';
      await this.saveImmediately(fullOperation);
    } else if (this.deferredOperations.has(operation.type)) {
      fullOperation.strategy = 'debounced';
      this.scheduleDebounced(fullOperation);
    } else {
      fullOperation.strategy = 'manual';
      this.addToQueue(fullOperation);
    }

    this.updateDirtyState(true);
  }

  /**
   * Manual save - บังคับบันทึกทันที
   */
  public async saveManual(data: any): Promise<void> {
    const operation: SaveOperation = {
      id: this.generateOperationId(),
      type: 'BATCH_UPDATE',
      data,
      timestamp: Date.now(),
      strategy: 'manual',
      retryCount: 0
    };

    await this.saveImmediately(operation);
  }

  /**
   * ดึงสถานะปัจจุบัน
   */
  public getState(): UnifiedSaveState {
    return { ...this.state };
  }

  /**
   * อัปเดตการตั้งค่า
   */
  public updateConfig(newConfig: Partial<SaveManagerConfig>) {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.autoSaveEnabled !== undefined) {
      if (newConfig.autoSaveEnabled) {
        this.startAutoSaveTimer();
      } else {
        this.stopAutoSaveTimer();
      }
    }
  }

  /**
   * ทำลาย instance และ cleanup
   */
  public destroy() {
    this.stopAutoSaveTimer();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }

  // ===================================================================
  // SECTION: Private Implementation Methods
  // ===================================================================

  private createInitialState(): UnifiedSaveState {
    return {
      status: 'idle',
      isSaving: false,
      lastSaved: null,
      localVersion: 1,
      serverVersion: 1,
      pendingOperations: [],
      isProcessingQueue: false,
      retryCount: 0,
      isDirty: false,
      hasUnsavedChanges: false
    };
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * บันทึกทันที - สำหรับ critical operations
   */
  private async saveImmediately(operation: SaveOperation) {
    try {
      this.updateState({ status: 'saving', isSaving: true });
      
      const response = await fetch(`/api/novels/${this.config.novelSlug}/storymap`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Operation-Id': operation.id,
        },
        body: JSON.stringify({
          nodes: operation.data.nodes || [],
          edges: operation.data.edges || [],
          storyVariables: operation.data.storyVariables || [],
          version: this.state.localVersion,
          etag: this.state.etag
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      this.handleSaveSuccess(result, operation);
      
    } catch (error) {
      await this.handleSaveError(error as Error, operation);
    }
  }

  /**
   * Debounced save - สำหรับ frequent operations
   */
  private scheduleDebounced(operation: SaveOperation) {
    // ล้าง timer เดิม
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // เพิ่ม operation เข้าคิว
    this.addToQueue(operation);

    // ตั้ง timer ใหม่
    this.debounceTimer = setTimeout(async () => {
      await this.processPendingOperations();
    }, this.config.debounceDelayMs);
  }

  /**
   * ประมวลผล operations ที่รอคิว
   */
  private async processPendingOperations() {
    if (this.isProcessing || this.state.pendingOperations.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.updateState({ isProcessingQueue: true, status: 'saving', isSaving: true });

    try {
      // รวม operations ที่รอคิวเป็น batch
      const batchOperation: SaveOperation = {
        id: this.generateOperationId(),
        type: 'BATCH_UPDATE',
        data: {
          operations: this.state.pendingOperations.map(op => op.data)
        },
        timestamp: Date.now(),
        strategy: 'debounced',
        retryCount: 0
      };

      // บันทึก batch
      await this.saveImmediately(batchOperation);
      
      // ล้างคิวหลังบันทึกสำเร็จ
      this.updateState({ 
        pendingOperations: [],
        isProcessingQueue: false
      });

    } catch (error) {
      console.error('[SaveManager] Batch save failed:', error);
      this.updateState({ 
        status: 'error',
        lastError: (error as Error).message,
        isProcessingQueue: false
      });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * จัดการเมื่อบันทึกสำเร็จ
   */
  private handleSaveSuccess(result: any, operation: SaveOperation) {
    const now = new Date();
    
    this.updateState({
      status: 'idle',
      isSaving: false,
      lastSaved: now,
      localVersion: result.newVersion || this.state.localVersion + 1,
      serverVersion: result.newVersion || this.state.serverVersion + 1,
      etag: result.etag,
      lastError: undefined,
      retryCount: 0
    });

    // แสดงข้อความแจ้งเตือนถ้าเป็น manual save
    if (operation.strategy === 'manual') {
      if (result.merged) {
        toast.success(result.mergeMessage || 'บันทึกและรวมการเปลี่ยนแปลงสำเร็จ');
      } else {
        toast.success('บันทึกสำเร็จ');
      }
    }

    this.updateDirtyState(false);
  }

  /**
   * จัดการเมื่อบันทึกล้มเหลว
   */
  private async handleSaveError(error: Error, operation: SaveOperation) {
    console.error('[SaveManager] Save failed:', error);
    
    if (operation.retryCount < this.config.maxRetries) {
      // ลอง retry
      const retryOperation = {
        ...operation,
        retryCount: operation.retryCount + 1
      };
      
      // Exponential backoff
      const delay = Math.pow(2, operation.retryCount) * 1000;
      setTimeout(() => {
        this.saveImmediately(retryOperation);
      }, delay);
      
      this.updateState({
        status: 'error',
        lastError: `กำลังลองใหม่... (${operation.retryCount + 1}/${this.config.maxRetries})`
      });
    } else {
      // ล้มเหลวถาวร
      this.updateState({
        status: 'error',
        isSaving: false,
        lastError: `บันทึกล้มเหลว: ${error.message}`,
        retryCount: operation.retryCount
      });
      
      if (operation.strategy === 'manual') {
        toast.error(`บันทึกล้มเหลว: ${error.message}`);
      }
    }
  }

  /**
   * เพิ่ม operation เข้าคิว
   */
  private addToQueue(operation: SaveOperation) {
    this.updateState({
      pendingOperations: [...this.state.pendingOperations, operation]
    });
  }

  /**
   * อัปเดตสถานะและแจ้ง callback
   */
  private updateState(updates: Partial<UnifiedSaveState>) {
    this.state = { ...this.state, ...updates };
    this.config.onStateChange?.(this.state);
  }

  /**
   * อัปเดต dirty state
   */
  private updateDirtyState(isDirty: boolean) {
    if (this.state.isDirty !== isDirty) {
      this.updateState({ 
        isDirty, 
        hasUnsavedChanges: isDirty 
      });
      this.config.onDirtyChange?.(isDirty);
    }
  }

  /**
   * เริ่ม auto-save timer
   */
  private startAutoSaveTimer() {
    this.stopAutoSaveTimer(); // ล้าง timer เดิมก่อน
    
    this.autoSaveTimer = setInterval(async () => {
      if (this.state.hasUnsavedChanges && !this.state.isSaving) {
        await this.processPendingOperations();
      }
    }, this.config.autoSaveIntervalMs);
  }

  /**
   * หยุด auto-save timer
   */
  private stopAutoSaveTimer() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = undefined;
    }
  }
}

// ===================================================================
// SECTION: Helper Functions
// ===================================================================

/**
 * สร้าง SaveManager instance ด้วยการตั้งค่าเริ่มต้น
 */
export function createSaveManager(config: Omit<SaveManagerConfig, 'debounceDelayMs' | 'maxRetries'>): UnifiedSaveManager {
  return new UnifiedSaveManager({
    ...config,
    debounceDelayMs: 300, // 300ms debounce เหมือน Premiere Pro
    maxRetries: 3
  });
}

/**
 * Hook สำหรับใช้ SaveManager ใน React Component
 */
export function useSaveManager(config: SaveManagerConfig) {
  const [saveManager] = React.useState(() => new UnifiedSaveManager(config));
  const [saveState, setSaveState] = React.useState<UnifiedSaveState>(saveManager.getState());

  React.useEffect(() => {
    const unsubscribe = (state: UnifiedSaveState) => setSaveState(state);
    saveManager.updateConfig({ ...config, onStateChange: unsubscribe });

    return () => {
      saveManager.destroy();
    };
  }, [saveManager, config]);

  return { saveManager, saveState };
}
