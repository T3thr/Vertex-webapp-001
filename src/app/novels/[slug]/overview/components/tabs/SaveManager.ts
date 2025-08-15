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
  initialData?: {
    nodes: any[];
    edges: any[];
    storyVariables: any[];
  };
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
  private originalData: {
    nodes: any[];
    edges: any[];
    storyVariables: any[];
  };
  
  // Operation categorization สำหรับ hybrid strategy
  private readonly immediateOperations = new Set<OperationType>([
    'DELETE_NODE', 'DELETE_EDGE', 'ADD_NODE', 'ADD_EDGE'
  ]);
  
  private readonly deferredOperations = new Set<OperationType>([
    'MOVE_NODE', 'UPDATE_NODE', 'UPDATE_EDGE', 'UPDATE_CANVAS'
  ]);

  constructor(config: SaveManagerConfig) {
    this.config = config;
    this.originalData = config.initialData || { nodes: [], edges: [], storyVariables: [] };
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
   * อัปเดต dirty state โดยตรงโดยไม่ trigger save operation
   * ใช้สำหรับ undo/redo ที่ต้องการอัปเดต state แต่ไม่บันทึก
   */
  public updateDirtyStateOnly(isDirty: boolean) {
    this.updateDirtyState(isDirty);
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
   * แปลงข้อมูลจาก BlueprintTab format เป็น API format
   */
  private formatDataForAPI(data: any) {
    try {
      // ป้องกัน invalid data ก่อนประมวลผล
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data: data must be an object');
      }

      // ตรวจสอบข้อมูลที่ไม่ถูกต้องจาก undo/redo operations
      if (data.undoOperation || data.redoOperation) {
        throw new Error('Invalid operation data: undo/redo operations should not be saved directly');
      }
      
      // ถ้าเป็น batch operation
      if (data.operations) {
        // รวมข้อมูลจาก batch operations
        let allNodes: any[] = [];
        let allEdges: any[] = [];
        let allStoryVariables: any[] = [];
        
        data.operations.forEach((op: any) => {
          if (op.nodes && Array.isArray(op.nodes)) allNodes = [...allNodes, ...op.nodes];
          if (op.edges && Array.isArray(op.edges)) allEdges = [...allEdges, ...op.edges];  
          if (op.storyVariables && Array.isArray(op.storyVariables)) allStoryVariables = [...allStoryVariables, ...op.storyVariables];
        });

        return {
          nodes: this.convertNodesToStoryMapFormat(allNodes),
          edges: this.convertEdgesToStoryMapFormat(allEdges),
          storyVariables: allStoryVariables,
          version: this.state.localVersion,
          etag: this.state.etag
        };
      }
      
      // ตรวจสอบว่ามี nodes, edges, storyVariables หรือไม่
      if (!data.nodes && !data.edges && !data.storyVariables) {
        throw new Error('Invalid data: must contain at least one of nodes, edges, or storyVariables');
      }
      
      // ถ้าเป็น single operation
      const formattedData = {
        nodes: this.convertNodesToStoryMapFormat(data.nodes || []),
        edges: this.convertEdgesToStoryMapFormat(data.edges || []),
        storyVariables: data.storyVariables || [],
        version: this.state.localVersion,
        etag: this.state.etag
      };

      // Validate ผลลัพธ์
      if (!Array.isArray(formattedData.nodes) || !Array.isArray(formattedData.edges) || !Array.isArray(formattedData.storyVariables)) {
        throw new Error('Invalid formatted data structure');
      }

      return formattedData;
    } catch (error) {
      console.error('[SaveManager] Error formatting data for API:', error);
      throw new Error(`Data formatting failed: ${(error as Error).message}`);
    }
  }

  /**
   * แปลง React Flow nodes เป็น StoryMap format
   */
  private convertNodesToStoryMapFormat(nodes: any[]): any[] {
    return nodes.map(node => ({
      nodeId: node.nodeId || node.id,
      nodeType: node.nodeType || node.data?.nodeType,
      title: node.title || node.data?.title || 'Untitled Node',
      position: node.position || { x: 0, y: 0 },
      dimensions: node.dimensions || node.data?.dimensions,
      nodeSpecificData: node.nodeSpecificData || node.data?.nodeSpecificData || {},
      notesForAuthor: node.notesForAuthor || node.data?.notesForAuthor,
      authorDefinedEmotionTags: node.authorDefinedEmotionTags || node.data?.authorDefinedEmotionTags || [],
      authorDefinedPsychologicalImpact: node.authorDefinedPsychologicalImpact || node.data?.authorDefinedPsychologicalImpact,
      lastEdited: new Date(),
      editorVisuals: {
        color: node.editorVisuals?.color || node.data?.color,
        icon: node.editorVisuals?.icon || node.data?.icon,
        zIndex: node.editorVisuals?.zIndex || node.data?.zIndex
      }
    }));
  }

  /**
   * แปลง React Flow edges เป็น StoryMap format
   */
  private convertEdgesToStoryMapFormat(edges: any[]): any[] {
    return edges.map(edge => ({
      edgeId: edge.edgeId || edge.id,
      sourceNodeId: edge.sourceNodeId || edge.source,
      targetNodeId: edge.targetNodeId || edge.target,
      sourceHandleId: edge.sourceHandleId || edge.sourceHandle,
      targetHandleId: edge.targetHandleId || edge.targetHandle,
      label: edge.label || edge.data?.label,
      condition: edge.condition || edge.data?.condition,
      priority: edge.priority || edge.data?.priority || 1,
      triggeringChoiceId: edge.triggeringChoiceId || edge.data?.triggeringChoiceId,
      authorDefinedEmotionTags: edge.authorDefinedEmotionTags || edge.data?.authorDefinedEmotionTags || [],
      authorDefinedPsychologicalImpact: edge.authorDefinedPsychologicalImpact || edge.data?.authorDefinedPsychologicalImpact,
      editorVisuals: {
        color: edge.editorVisuals?.color || edge.data?.color || edge.style?.stroke,
        lineStyle: edge.editorVisuals?.lineStyle || edge.data?.lineStyle || 'solid',
        animated: edge.editorVisuals?.animated || edge.animated || false
      }
    }));
  }

  /**
   * บันทึกทันที - สำหรับ critical operations
   */
  private async saveImmediately(operation: SaveOperation) {
    try {
      this.updateState({ status: 'saving', isSaving: true });
      
      // แปลงข้อมูลให้ตรงกับ API format - มี error handling
      let requestData;
      try {
        requestData = this.formatDataForAPI(operation.data);
      } catch (formatError) {
        // ถ้าเป็น error จาก undo/redo operation ให้ skip การบันทึก
        if ((formatError as Error).message.includes('undo/redo operations')) {
          console.log('[SaveManager] Skipping invalid undo/redo operation');
          this.updateState({ status: 'idle', isSaving: false });
          return;
        }
        // ถ้าเป็น error อื่นๆ ให้ rethrow
        throw formatError;
      }
      
      console.log('[SaveManager] Saving data:', {
        operationId: operation.id,
        operationType: operation.type,
        nodeCount: requestData.nodes?.length || 0,
        edgeCount: requestData.edges?.length || 0,
        variableCount: requestData.storyVariables?.length || 0
      });
      
      const response = await fetch(`/api/novels/${this.config.novelSlug}/storymap`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Operation-Id': operation.id,
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SaveManager] Server error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      this.handleSaveSuccess(result, operation);
      
    } catch (error) {
      console.error('[SaveManager] Save operation failed:', error);
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
      console.log(`[SaveManager] Processing ${this.state.pendingOperations.length} pending operations`);
      
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

      console.log('[SaveManager] Batch operations processed successfully');

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

    // อัปเดต original data ด้วยข้อมูลที่บันทึกแล้ว
    if (result.storyMap) {
      this.updateOriginalData({
        nodes: result.storyMap.nodes || [],
        edges: result.storyMap.edges || [],
        storyVariables: result.storyMap.storyVariables || []
      });
    } else {
      // รีเซ็ต dirty state หลังบันทึกสำเร็จ
      this.updateDirtyState(false);
    }

    // แสดงข้อความแจ้งเตือนถ้าเป็น manual save
    if (operation.strategy === 'manual') {
      if (result.merged) {
        toast.success(result.mergeMessage || 'บันทึกและรวมการเปลี่ยนแปลงสำเร็จ');
      } else {
        toast.success('บันทึกสำเร็จ');
      }
    }
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
   * ตรวจสอบว่ามีการเปลี่ยนแปลงจริงเทียบกับ database หรือไม่
   */
  public checkIfDataChanged(currentData: { nodes: any[]; edges: any[]; storyVariables: any[] }): boolean {
    try {
      // เปรียบเทียบ nodes
      if (!this.arraysEqual(currentData.nodes, this.originalData.nodes, 'nodeId')) {
        console.log('[SaveManager] Nodes changed');
        return true;
      }

      // เปรียบเทียบ edges
      if (!this.arraysEqual(currentData.edges, this.originalData.edges, 'edgeId')) {
        console.log('[SaveManager] Edges changed');
        return true;
      }

      // เปรียบเทียบ story variables
      if (!this.arraysEqual(currentData.storyVariables, this.originalData.storyVariables, 'variableId')) {
        console.log('[SaveManager] Story variables changed');
        return true;
      }

      console.log('[SaveManager] No changes detected');
      return false;
    } catch (error) {
      console.error('[SaveManager] Error checking data changes:', error);
      return true; // ถ้าเกิด error ให้ถือว่ามีการเปลี่ยนแปลง
    }
  }

  /**
   * อัปเดต original data หลังจากบันทึกสำเร็จ
   */
  public updateOriginalData(newData: { nodes: any[]; edges: any[]; storyVariables: any[] }) {
    this.originalData = {
      nodes: JSON.parse(JSON.stringify(newData.nodes)),
      edges: JSON.parse(JSON.stringify(newData.edges)),
      storyVariables: JSON.parse(JSON.stringify(newData.storyVariables))
    };
    
    // รีเซ็ต dirty state
    this.updateDirtyState(false);
    console.log('[SaveManager] Original data updated');
  }

  /**
   * เปรียบเทียบ array โดยใช้ ID field
   */
  private arraysEqual(arr1: any[], arr2: any[], idField: string): boolean {
    if (arr1.length !== arr2.length) {
      return false;
    }

    // สร้าง map จาก ID เพื่อเปรียบเทียบ
    const map1 = new Map();
    const map2 = new Map();

    arr1.forEach(item => {
      const id = item[idField] || item.id;
      if (id) {
        map1.set(id, this.normalizeForComparison(item));
      }
    });

    arr2.forEach(item => {
      const id = item[idField] || item.id;
      if (id) {
        map2.set(id, this.normalizeForComparison(item));
      }
    });

    // เปรียบเทียบขนาด map
    if (map1.size !== map2.size) {
      return false;
    }

    // เปรียบเทียบแต่ละ item
    for (const [id, item1] of map1) {
      const item2 = map2.get(id);
      if (!item2 || !this.deepEqual(item1, item2)) {
        return false;
      }
    }

    return true;
  }

  /**
   * ทำให้ object เป็นมาตรฐานเพื่อเปรียบเทียบ
   */
  private normalizeForComparison(obj: any): any {
    const normalized = { ...obj };
    
    // ลบ fields ที่ไม่สำคัญสำหรับการเปรียบเทียบ
    delete normalized.lastEdited;
    delete normalized.updatedAt;
    delete normalized.createdAt;
    delete normalized._id;
    delete normalized.__v;
    
    return normalized;
  }

  /**
   * เปรียบเทียบ object แบบ deep
   */
  private deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;
    
    if (obj1 == null || obj2 == null) return obj1 === obj2;
    
    if (typeof obj1 !== typeof obj2) return false;
    
    if (typeof obj1 !== 'object') return obj1 === obj2;
    
    if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!this.deepEqual(obj1[key], obj2[key])) return false;
    }
    
    return true;
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
