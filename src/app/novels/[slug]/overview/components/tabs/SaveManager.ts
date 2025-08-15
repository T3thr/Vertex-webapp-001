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
  private stateUpdateTimer?: NodeJS.Timeout;
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
   * อัปเดต dirty state โดยตรง (สำหรับ external components)
   * Professional-grade API 
   */
  public updateDirtyStateOnly(isDirty: boolean) {
    this.updateDirtyState(isDirty);
    console.log(`[SaveManager] External dirty state update: ${isDirty ? 'DIRTY' : 'CLEAN'}`);
  }

  /**
   * ทำลาย instance และ cleanup
   */
  public destroy() {
    this.stopAutoSaveTimer();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    if (this.stateUpdateTimer) {
      clearTimeout(this.stateUpdateTimer);
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
        // ใช้ console.warn แทน console.error สำหรับ server errors
        console.warn('[SaveManager] Server error response:', {
          status: response.status,
          statusText: response.statusText,
          responseBody: errorText
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      this.handleSaveSuccess(result, operation);
      
    } catch (error) {
      // ไม่ใช้ console.error ที่นี่ เพราะ handleSaveError จะจัดการเอง
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

    // แสดงข้อความแจ้งเตือนและ console log ตามประเภทการบันทึก - Professional Grade
    if (operation.strategy === 'manual') {
      // Manual save: แสดง toast และ console log
      if (result.merged) {
        const message = result.mergeMessage || 'บันทึกและรวมการเปลี่ยนแปลงสำเร็จ';
        toast.success(message, {
          description: 'ข้อมูลของคุณได้รับการบันทึก',
          duration: 4000
        });
        console.log('[SaveManager] Manual save with merge successful:', {
          message,
          operationId: operation.id,
          timestamp: now.toISOString(),
          nodeCount: result.storyMap?.nodes?.length || 0,
          edgeCount: result.storyMap?.edges?.length || 0,
          merged: true
        });
      } else {
        toast.success('บันทึกเรียบร้อยแล้ว', {
          description: 'การเปลี่ยนแปลงของคุณได้รับการบันทึกเป็นที่เรียบร้อยแล้ว',
          duration: 3000
        });
        console.log('[SaveManager] Manual save successful:', {
          operationId: operation.id,
          timestamp: now.toISOString(),
          nodeCount: result.storyMap?.nodes?.length || 0,
          edgeCount: result.storyMap?.edges?.length || 0
        });
      }
    } else {
      // Auto save: เฉพาะ console log - ไม่รบกวนผู้ใช้
      const message = result.merged ? 'Auto-save with merge successful' : 'Auto-save successful';
      console.log(`[SaveManager] ${message}`, {
        operationId: operation.id,
        timestamp: now.toISOString(),
        nodeCount: result.storyMap?.nodes?.length || 0,
        edgeCount: result.storyMap?.edges?.length || 0,
        merged: Boolean(result.merged),
        strategy: operation.strategy
      });
    }
  }

  /**
   * จัดการเมื่อบันทึกล้มเหลว
   */
  private async handleSaveError(error: Error, operation: SaveOperation) {
    // ตรวจสอบว่าเป็น error ประเภทไหน และจัดการตามความเหมาะสม
    const isNetworkError = error.message.includes('fetch') || error.message.includes('network');
    const isServerError = error.message.includes('Internal server error') || error.message.includes('HTTP 5');
    
    // Console log รายละเอียดแต่ไม่ใช้ console.error ถ้าเป็น server error ปกติ
    if (isServerError) {
      console.warn('[SaveManager] Server error encountered:', {
        operationId: operation.id,
        operationType: operation.type,
        strategy: operation.strategy,
        retryCount: operation.retryCount,
        error: error.message
      });
    } else {
      console.error('[SaveManager] Save failed:', {
        operationId: operation.id,
        operationType: operation.type,
        strategy: operation.strategy,
        retryCount: operation.retryCount,
        error: error.message
      });
    }
    
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
      
      // Console log สำหรับ retry attempt
      console.log(`[SaveManager] Retrying save operation in ${delay}ms (attempt ${operation.retryCount + 1}/${this.config.maxRetries})`);
    } else {
      // ล้มเหลวถาวร
      this.updateState({
        status: 'error',
        isSaving: false,
        lastError: `บันทึกล้มเหลว: ${error.message}`,
        retryCount: operation.retryCount
      });
      
      // Professional error handling เน้นการทำงานคนเดียว
      if (operation.strategy === 'manual') {
        // Enhanced manual save error messaging
        if (error.message.includes('conflict') || error.message.includes('409')) {
          toast.error(
            '🚨 พบข้อมูลที่ขัดแย้งกัน\n' +
            '💡 เพื่อป้องกันปัญหา แนะนำให้ใช้เบราว์เซอร์แท็บเดียว\n' +
            'กรุณารีเฟรชหน้าเพจแล้วลองใหม่'
          );
        } else {
          toast.error(
            `❌ บันทึกล้มเหลว: ${error.message}\n` +
            `💡 หากปัญหาเกิดขึ้นซ้ำ แนะนำให้ใช้เบราว์เซอร์แท็บเดียว`
          );
        }
        console.error('[SaveManager] Manual save failed permanently:', error.message);
      } else {
        // Enhanced auto-save error handling สำหรับการทำงานคนเดียว
        console.warn('[SaveManager] Auto-save failed permanently (single-user mode):', error.message);
        
        // แสดง subtle notification สำหรับ auto-save errors
        if (error.message.includes('conflict')) {
          toast.warning(
            '⚠️ Auto-save หยุดชั่วคราว เนื่องจากตรวจพบการเปิดหลายแท็บ\n' +
            'แนะนำให้ใช้แท็บเดียวเพื่อประสบการณ์ที่ดีที่สุด'
          );
        }
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
   * อัปเดต dirty state - Professional-grade detection 
   * ป้องกัน flickering โดยการตรวจสอบความถูกต้องของข้อมูลก่อนการอัปเดต
   */
  private updateDirtyState(isDirty: boolean) {
    // ตรวจสอบว่าสถานะเปลี่ยนแปลงจริงๆ หรือไม่
    if (this.state.isDirty !== isDirty) {
      // เพิ่มการ debounce เล็กน้อยเพื่อป้องกัน rapid state changes
      if (this.stateUpdateTimer) {
        clearTimeout(this.stateUpdateTimer);
      }
      
      this.stateUpdateTimer = setTimeout(() => {
        this.updateState({ 
          isDirty, 
          hasUnsavedChanges: isDirty 
        });
        this.config.onDirtyChange?.(isDirty);
        
        console.log(`[SaveManager] Dirty state updated: ${isDirty ? 'DIRTY' : 'CLEAN'}`);
      }, 10); // 10ms debounce เพื่อให้ responsive แต่ป้องกัน flickering
    }
  }

  /**
   * Real-time Professional Change Detection
   * ตรวจสอบการเปลี่ยนแปลงจริงเทียบกับ database ด้วย deep comparison และ data normalization
   * พร้อม Real-time conflict detection สำหรับ single-user mode
   */
  public checkIfDataChanged(currentData: { nodes: any[]; edges: any[]; storyVariables: any[] }): boolean {
    try {
      // Professional data normalization เพื่อการเปรียบเทียบที่แม่นยำ
      const normalizedCurrent = this.professionalNormalizeData(currentData);
      const normalizedOriginal = this.professionalNormalizeData(this.originalData);

      // Real-time multi-layer comparison system สำหรับความแม่นยำสูงสุด
      const nodesChanged = !this.arraysEqualDeep(normalizedCurrent.nodes, normalizedOriginal.nodes, 'id');
      const edgesChanged = !this.arraysEqualDeep(normalizedCurrent.edges, normalizedOriginal.edges, 'id');
      const variablesChanged = !this.arraysEqualDeep(normalizedCurrent.storyVariables, normalizedOriginal.storyVariables, 'variableId');

      const hasActualChanges = nodesChanged || edgesChanged || variablesChanged;

      // Real-time state validation - ตรวจสอบว่าข้อมูลปัจจุบันต่างจาก database จริงหรือไม่
      if (!hasActualChanges) {
        // ถ้าไม่มีการเปลี่ยนแปลงจาก original data แสดงว่าไม่ต้อง save
        this.updateState({
          isDirty: false,
          hasUnsavedChanges: false,
          status: 'idle'
        });
        
        // แจ้ง parent component ให้ disable ปุ่ม save
        this.config.onDirtyChange?.(false);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[SaveManager] Real-time validation: No changes detected, save button disabled');
        }
        
        return false;
      }

      // มีการเปลี่ยนแปลงจริง - enable ปุ่ม save
      this.updateState({
        isDirty: true,
        hasUnsavedChanges: true,
        status: 'idle'
      });
      
      // แจ้ง parent component ให้ enable ปุ่ม save
      this.config.onDirtyChange?.(true);

      // Enterprise-level logging สำหรับ debugging และ monitoring
      if (process.env.NODE_ENV === 'development') {
        console.log('[SaveManager] Real-time change detection results:', {
          hasActualChanges: true,
          breakdown: {
            nodes: nodesChanged ? `${normalizedCurrent.nodes.length} items (changed)` : `${normalizedCurrent.nodes.length} items (unchanged)`,
            edges: edgesChanged ? `${normalizedCurrent.edges.length} items (changed)` : `${normalizedCurrent.edges.length} items (unchanged)`,
            variables: variablesChanged ? `${normalizedCurrent.storyVariables.length} items (changed)` : `${normalizedCurrent.storyVariables.length} items (unchanged)`
          },
          timestamp: new Date().toISOString(),
          sessionId: this.config.novelSlug,
          saveButtonEnabled: true
        });
      }

      return true;

    } catch (error) {
      console.error('[SaveManager] Critical error in real-time change detection:', error);
      // Enterprise-grade error handling: ส่งคืน false เพื่อป้องกัน false positive
      this.config.onDirtyChange?.(false);
      return false;
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
    
    // รีเซ็ต dirty state และแจ้ง parent ให้ disable ปุ่ม save
    this.updateState({
      isDirty: false,
      hasUnsavedChanges: false,
      status: 'idle',
      lastSaved: new Date(),
      lastError: undefined
    });
    
    // แจ้ง parent component ให้ disable ปุ่ม save ทันที
    this.config.onDirtyChange?.(false);
    
    console.log('[SaveManager] Original data updated, save button disabled');
  }

  /**
   * Real-time Database Sync Validation
   * ตรวจสอบว่าข้อมูลปัจจุบันตรงกับข้อมูลใน database หรือไม่
   */
  public async validateWithDatabase(): Promise<boolean> {
    try {
      const response = await fetch(`/api/novels/${this.config.novelSlug}/storymap`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn('[SaveManager] Cannot validate with database:', response.statusText);
        return true; // ถ้าไม่สามารถตรวจสอบได้ ให้ถือว่ามีการเปลี่ยนแปลง
      }

      const data = await response.json();
      const dbStoryMap = data.storyMap;

      if (!dbStoryMap) {
        console.warn('[SaveManager] No storymap found in database');
        return true;
      }

      // เปรียบเทียบข้อมูลปัจจุบันกับ database
      const dbData = {
        nodes: dbStoryMap.nodes || [],
        edges: dbStoryMap.edges || [],
        storyVariables: dbStoryMap.storyVariables || []
      };

      const normalizedDb = this.professionalNormalizeData(dbData);
      const normalizedOriginal = this.professionalNormalizeData(this.originalData);

      // ตรวจสอบว่า original data ยังคงตรงกับ database หรือไม่
      const nodesMatch = this.arraysEqualDeep(normalizedDb.nodes, normalizedOriginal.nodes, 'id');
      const edgesMatch = this.arraysEqualDeep(normalizedDb.edges, normalizedOriginal.edges, 'id');
      const variablesMatch = this.arraysEqualDeep(normalizedDb.storyVariables, normalizedOriginal.storyVariables, 'variableId');

      const isSync = nodesMatch && edgesMatch && variablesMatch;

      if (!isSync) {
        console.log('[SaveManager] Database has been updated by another source, updating original data');
        // อัปเดต original data ให้ตรงกับ database
        this.originalData = dbData;
        
        // แจ้ง parent ให้ตรวจสอบสถานะใหม่
        this.config.onDirtyChange?.(false);
      }

      return isSync;

    } catch (error) {
      console.error('[SaveManager] Error validating with database:', error);
      return true; // ในกรณีที่เกิดข้อผิดพลาด ให้ถือว่ามีการเปลี่ยนแปลง
    }
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
   * Professional-grade data normalization
   * ใช้สำหรับการเปรียบเทียบที่แม่นยำสูงสุด
   */
  private professionalNormalizeData(data: { nodes: any[]; edges: any[]; storyVariables: any[] }) {
    return {
      nodes: data.nodes
        .map(node => this.professionalNormalizeItem(node))
        .sort((a, b) => (a.id || a.nodeId || '').localeCompare(b.id || b.nodeId || '')),
      edges: data.edges
        .map(edge => this.professionalNormalizeItem(edge))
        .sort((a, b) => (a.id || a.edgeId || '').localeCompare(b.id || b.edgeId || '')),
      storyVariables: data.storyVariables
        .map(variable => this.professionalNormalizeItem(variable))
        .sort((a, b) => (a.variableId || a.id || '').localeCompare(b.variableId || b.id || ''))
    };
  }

  /**
   * Legacy normalization สำหรับ backward compatibility
   */
  private normalizeDataForComparison(data: { nodes: any[]; edges: any[]; storyVariables: any[] }) {
    return {
      nodes: data.nodes.map(node => this.normalizeItemForComparison(node)).sort((a, b) => a.nodeId?.localeCompare(b.nodeId) || 0),
      edges: data.edges.map(edge => this.normalizeItemForComparison(edge)).sort((a, b) => a.edgeId?.localeCompare(b.edgeId) || 0),
      storyVariables: data.storyVariables.map(variable => this.normalizeItemForComparison(variable)).sort((a, b) => a.variableId?.localeCompare(b.variableId) || 0)
    };
  }

  /**
   * Enterprise-grade deep comparison
   * ใช้ advanced algorithms สำหรับ performance optimization
   */
  private arraysEqualDeep(arr1: any[], arr2: any[], idField: string): boolean {
    // Fast path: length comparison
    if (arr1.length !== arr2.length) {
      return false;
    }

    // Performance optimization: ถ้าเป็น array เปล่าให้ return true ทันที
    if (arr1.length === 0) {
      return true;
    }

    // Performance optimization: สร้าง Map สำหรับ O(1) lookup
    const map2 = new Map();
    for (const item of arr2) {
      const id = item[idField] || item.id;
      if (id) {
        map2.set(id, item);
      }
    }

    // เปรียบเทียบแต่ละ item ด้วย optimized approach
    for (const item1 of arr1) {
      const id = item1[idField] || item1.id;
      if (!id) {
        // ถ้าไม่มี ID ให้ใช้ deep comparison แบบ sequential
        const matchingItem = arr2.find(item2 => this.deepEqual(item1, item2));
        if (!matchingItem) {
          return false;
        }
      } else {
        const item2 = map2.get(id);
        if (!item2) {
          return false;
        }
        // Deep comparison สำหรับ items ที่มี ID เดียวกัน
        if (!this.deepEqual(item1, item2)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Professional-grade item normalization
   * ใช้ advanced techniques เพื่อ normalize ข้อมูลอย่างละเอียด
   */
  private professionalNormalizeItem(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    const normalized: any = {};

    for (const [key, value] of Object.entries(obj)) {
      // ข้าม internal React Flow properties ที่ไม่ส่งผลต่อ business logic
      if (key.startsWith('__') || 
          key === 'selected' || 
          key === 'dragging' ||
          key === 'measured' ||
          key === 'hidden' ||
          key === 'connecting' ||
          key === 'resizing' ||
          key === 'lastEdited' ||
          key === 'updatedAt' ||
          key === 'createdAt' ||
          key === '_id' ||
          key === '__v') {
        continue;
      }

      // Professional position normalization (round เป็น pixel ที่แน่นอน)
      if (key === 'position' && value && typeof value === 'object') {
        const position = value as { x?: number; y?: number };
        normalized[key] = {
          x: Math.round(Number(position.x) || 0),
          y: Math.round(Number(position.y) || 0)
        };
        continue;
      }

      // Recursive normalization สำหรับ nested objects
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        normalized[key] = this.professionalNormalizeItem(value);
      } else if (Array.isArray(value)) {
        normalized[key] = value.map(item => this.professionalNormalizeItem(item));
      } else {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  /**
   * Legacy normalization สำหรับ backward compatibility
   */
  private normalizeItemForComparison(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const normalized = { ...obj };
    
    // ลบ fields ที่ไม่สำคัญสำหรับการเปรียบเทียบ (metadata fields)
    delete normalized.lastEdited;
    delete normalized.updatedAt;
    delete normalized.createdAt;
    delete normalized._id;
    delete normalized.__v;
    
    // Normalize nested objects recursively
    Object.keys(normalized).forEach(key => {
      if (normalized[key] && typeof normalized[key] === 'object') {
        if (Array.isArray(normalized[key])) {
          normalized[key] = normalized[key].map((item: any) => this.normalizeItemForComparison(item));
        } else {
          normalized[key] = this.normalizeItemForComparison(normalized[key]);
        }
      }
    });

    return normalized;
  }

  /**
   * ทำให้ object เป็นมาตรฐานเพื่อเปรียบเทียบ - Legacy version สำหรับ backward compatibility
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
  /**
   * Enterprise-grade deep equality check
   * ใช้ advanced optimization techniques สำหรับ performance สูงสุด
   */
  private deepEqual(obj1: any, obj2: any): boolean {
    // Fast path: reference equality
    if (obj1 === obj2) return true;
    
    // Fast path: null/undefined handling
    if (obj1 == null || obj2 == null) return obj1 === obj2;
    
    // Fast path: type mismatch
    if (typeof obj1 !== typeof obj2) return false;
    
    // Fast path: primitive values
    if (typeof obj1 !== 'object') return obj1 === obj2;
    
    // Fast path: array type mismatch
    if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
    
    // Performance optimization: ใช้ Set สำหรับ key comparison แทน array.includes
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    // Fast path: key count mismatch
    if (keys1.length !== keys2.length) return false;
    
    // Performance optimization: สร้าง Set สำหรับ O(1) lookup
    const keys2Set = new Set(keys2);
    
    // เปรียบเทียบ keys และ values
    for (const key of keys1) {
      // Fast path: key existence check ด้วย Set
      if (!keys2Set.has(key)) return false;
      
      // Recursive comparison สำหรับ nested objects
      if (!this.deepEqual(obj1[key], obj2[key])) return false;
    }
    
    return true;
  }

  /**
   * เริ่ม auto-save timer - Professional-grade 
   */
  private startAutoSaveTimer() {
    this.stopAutoSaveTimer(); // ล้าง timer เดิมก่อน
    
    this.autoSaveTimer = setInterval(async () => {
      try {
        // Professional-grade auto-save logic
        if (this.state.pendingOperations.length > 0 && !this.state.isProcessingQueue) {
          console.log('[SaveManager] Auto-save timer triggered - processing pending operations');
          await this.processPendingOperations();
        } else if (this.state.hasUnsavedChanges && !this.state.isSaving) {
          // Fallback สำหรับ hasUnsavedChanges โดยไม่มี pending operations
          console.log('[SaveManager] Auto-save timer triggered - unsaved changes detected');
          await this.processPendingOperations();
        }
        
        // Real-time conflict detection (ทุก 30 วินาที)
        if (Date.now() % (30 * 1000) < this.config.autoSaveIntervalMs) {
          await this.performConflictCheck();
        }
        
      } catch (error) {
        console.error('[SaveManager] Error in auto-save timer:', error);
        // ไม่ stop timer เพื่อให้ระบบทำงานต่อไป
      }
    }, this.config.autoSaveIntervalMs);
    
    console.log(`[SaveManager] Professional auto-save timer started with ${this.config.autoSaveIntervalMs}ms interval`);
  }

  /**
   * Real-time conflict detection เทียบเท่า Adobe และ Canva
   */
  private async performConflictCheck() {
    try {
      // ตรวจสอบ timestamp ของไฟล์ในเซิร์ฟเวอร์
      const response = await fetch(`/api/novels/${this.config.novelSlug}/storymap`, {
        method: 'HEAD' // ใช้ HEAD เพื่อดึงเฉพาะ headers
      });
      
      if (response.ok) {
        const serverEtag = response.headers.get('etag');
        const lastModified = response.headers.get('last-modified');
        
        // ตรวจสอบ conflict
        if (this.state.etag && serverEtag && this.state.etag !== serverEtag) {
          console.warn('[SaveManager] Real-time conflict detected:', {
            localEtag: this.state.etag,
            serverEtag,
            lastModified
          });
          
          this.updateState({ 
            status: 'conflict',
            lastError: 'ตรวจพบการเปลี่ยนแปลงจากภายนอก แนะนำให้รีเฟรชหน้าเพจ'
          });
        }
      }
    } catch (error) {
      // ไม่ log error เพราะอาจเป็นเรื่องปกติ (network issues)
      if (process.env.NODE_ENV === 'development') {
        console.debug('[SaveManager] Conflict check failed:', error);
      }
    }
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
 * สร้าง SaveManager instance ด้วยการตั้งค่าเริ่มต้น - Professional Grade
 * ตั้งค่าตามมาตรฐาน
 */
export function createSaveManager(config: Omit<SaveManagerConfig, 'debounceDelayMs' | 'maxRetries'>): UnifiedSaveManager {
  const professionalConfig = {
    ...config,
    debounceDelayMs: 300, // 300ms debounce เหมือน Premiere Pro และ Canva
    maxRetries: 3, // Enterprise-grade retry mechanism
    autoSaveIntervalMs: config.autoSaveIntervalMs || 30000 // 30 วินาที default เหมือน Adobe
  };
  
  console.log('[SaveManager] Creating professional-grade SaveManager with config:', {
    novelSlug: professionalConfig.novelSlug,
    autoSaveEnabled: professionalConfig.autoSaveEnabled,
    debounceDelayMs: professionalConfig.debounceDelayMs,
    maxRetries: professionalConfig.maxRetries
  });
  
  return new UnifiedSaveManager(professionalConfig);
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
