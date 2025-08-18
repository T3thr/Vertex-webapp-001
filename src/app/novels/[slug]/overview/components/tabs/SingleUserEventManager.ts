// src/app/novels/[slug]/overview/components/tabs/SingleUserEventManager.ts
// ===================================================================
// Simplified Event Manager for Single User Mode
// Optimized for Canva/Figma-like experience without real-time complexity
// ===================================================================

import { Command, CommandResult, CommandContext } from '@/lib/commands/Command';

export interface SingleUserConfig {
  novelSlug: string;
  autoSaveEnabled: boolean;
  autoSaveIntervalMs: number;
  maxHistorySize: number;
  onStateChange?: (state: SingleUserState) => void;
  onDirtyChange?: (isDirty: boolean) => void;
  onError?: (error: Error, context: string) => void;
}

export interface SingleUserState {
  // Command History
  commandHistory: Command[];
  undoStack: Command[];
  redoStack: Command[];
  
  // Save State
  isSaving: boolean;
  lastSaved: Date | null;
  isDirty: boolean;
  hasUnsavedChanges: boolean;
  
  // Version Control
  localVersion: number;
  serverVersion: number;
  
  // Error Handling
  lastError?: string;
  
  // Performance
  pendingCommands: number;
  totalEvents: number;
}

export interface SnapshotData {
  nodes: any[];
  edges: any[];
  storyVariables: any[];
  timestamp: number;
  version: number;
}

// ===================================================================
// Single User Command Context
// ===================================================================

class SingleUserCommandContext implements CommandContext {
  private eventManager: SingleUserEventManager;
  // 🚀 NEW: External UI update callbacks
  private reactFlowUpdater?: (nodes: any[], edges: any[]) => void;

  constructor(eventManager: SingleUserEventManager) {
    this.eventManager = eventManager;
  }

  // 🚀 NEW: Set external UI updater callback
  setReactFlowUpdater(updater: (nodes: any[], edges: any[]) => void): void {
    this.reactFlowUpdater = updater;
  }

  getCurrentNodes(): any[] {
    return this.eventManager.getCurrentSnapshot().nodes;
  }

  getCurrentEdges(): any[] {
    return this.eventManager.getCurrentSnapshot().edges;
  }

  getCurrentStoryVariables(): any[] {
    return this.eventManager.getCurrentSnapshot().storyVariables;
  }

  setNodes(nodes: any[]): void {
    this.eventManager.updateSnapshot({ 
      ...this.eventManager.getCurrentSnapshot(), 
      nodes,
      timestamp: Date.now()
    });
    
    // 🔥 CRITICAL: Immediate UI sync - แบบ Figma/Canva
    if (this.reactFlowUpdater) {
      console.log('[SingleUserCommandContext] 🔄 Immediate UI sync - setNodes:', nodes.length);
      
      // ✅ CRITICAL FIX: ใช้ nodes ที่ส่งเข้ามาแทน snapshot
      // เพราะ snapshot อาจยัง out-of-sync
      const currentSnapshot = this.eventManager.getCurrentSnapshot();
      this.reactFlowUpdater([...nodes], [...currentSnapshot.edges]);
    }
  }

  setEdges(edges: any[]): void {
    this.eventManager.updateSnapshot({ 
      ...this.eventManager.getCurrentSnapshot(), 
      edges,
      timestamp: Date.now()
    });
    
    // 🔥 CRITICAL: Immediate UI sync - แบบ Figma/Canva
    if (this.reactFlowUpdater) {
      console.log('[SingleUserCommandContext] 🔄 Immediate UI sync - setEdges:', edges.length);
      
      // ✅ CRITICAL FIX: ใช้ edges ที่ส่งเข้ามาแทน snapshot
      const currentSnapshot = this.eventManager.getCurrentSnapshot();
      this.reactFlowUpdater([...currentSnapshot.nodes], [...edges]);
    }
  }

  setStoryVariables(variables: any[]): void {
    this.eventManager.updateSnapshot({ 
      ...this.eventManager.getCurrentSnapshot(), 
      storyVariables: variables,
      timestamp: Date.now()
    });
  }

  findNodeById(id: string): any | null {
    return this.getCurrentNodes().find(node => node.id === id) || null;
  }

  findEdgeById(id: string): any | null {
    return this.getCurrentEdges().find(edge => edge.id === edge.id) || null;
  }

  generateNodeId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateEdgeId(): string {
    return `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  validateNode(node: any): boolean {
    return !!(node && node.id && node.type);
  }

  validateEdge(edge: any): boolean {
    return !!(edge && edge.id && edge.source && edge.target);
  }

  notifyChange(changeType: string, data: any): void {
    this.eventManager.notifyChange(changeType, data);
  }

  // 🚀 NEW: Bidirectional sync methods implementation
  updateReactFlowUI?: (nodes: any[], edges: any[]) => void = (nodes: any[], edges: any[]) => {
    if (this.reactFlowUpdater) {
      this.reactFlowUpdater(nodes, edges);
    }
  };

  syncBackToReactFlow?: () => void = () => {
    if (this.reactFlowUpdater) {
      const snapshot = this.eventManager.getCurrentSnapshot();
      this.reactFlowUpdater(snapshot.nodes, snapshot.edges);
    }
  };

  updateEventManagerState?: (nodes: any[], edges: any[], storyVariables: any[]) => void = (nodes: any[], edges: any[], storyVariables: any[]) => {
    this.eventManager.updateSnapshotFromReactFlow(nodes, edges, storyVariables);
  };
}

// ===================================================================
// Single User Event Manager
// ===================================================================

export class SingleUserEventManager {
  private config: SingleUserConfig;
  private state: SingleUserState;
  private commandContext: CommandContext;
  private currentSnapshot: SnapshotData;
  private originalSnapshot: SnapshotData;
  private autoSaveTimer?: NodeJS.Timeout;
  private debounceTimer?: NodeJS.Timeout;
  private saveDebouncer: SaveDebouncer; // 🔥 ADOBE/FIGMA STYLE: Save deduplication

  constructor(config: SingleUserConfig) {
    this.config = config;
    this.state = this.createInitialState();
    this.commandContext = new SingleUserCommandContext(this);
    this.currentSnapshot = this.createEmptySnapshot();
    this.originalSnapshot = this.createEmptySnapshot();
    this.saveDebouncer = new SaveDebouncer(); // 🔥 ADOBE/FIGMA STYLE: Initialize save deduplication

    // Start auto-save if enabled
    if (config.autoSaveEnabled) {
      this.startAutoSave();
    }

    console.log('[SingleUserEventManager] Initialized for single-user mode');
  }

  // ===================================================================
  // Public API
  // ===================================================================

  async executeCommand(command: Command): Promise<CommandResult> {
    try {
      // Validate command
      if (!command || !command.type) {
        throw new Error('Invalid command');
      }

      console.log(`[SingleUserEventManager] Executing command: ${command.type} - ${command.description}`);

      // Execute command
      if (command.execute) {
        await command.execute();
      }

      // Add to history เฉพาะ commands ที่สามารถ undo ได้
      if (this.isUndoableCommand(command)) {
        this.addToHistory(command);
        
        // Clear redo stack เมื่อมี command ใหม่ (เหมือน Canva/Figma)
        this.state.redoStack = [];
        
        console.log(`[SingleUserEventManager] ✅ Command added to history. Undo: ${this.state.undoStack.length}, Redo: ${this.state.redoStack.length}`);
      } else {
        console.log(`[SingleUserEventManager] ⏭️ Command not undoable, skipping history`);
      }

      // 🔥 CRITICAL FIX: Mark as dirty เฉพาะ content commands เท่านั้น
      if (this.isContentCommand(command)) {
        this.markAsDirty();
        console.log(`[SingleUserEventManager] ✏️ Content command marked as dirty: ${command.type}`);
      } else {
        console.log(`[SingleUserEventManager] 👆 UI-only command, not marking as dirty: ${command.type}`);
      }

      // Update state
      this.updateState({
        totalEvents: this.state.totalEvents + 1
      });

      return {
        success: true,
        command: command,
        metadata: { timestamp: Date.now() }
      };

    } catch (error) {
      console.error('[SingleUserEventManager] Command execution failed:', error);
      
      this.updateState({
        lastError: error instanceof Error ? error.message : 'Command failed'
      });

      this.config.onError?.(error instanceof Error ? error : new Error('Command failed'), 'COMMAND_EXECUTION');

      return {
        success: false,
        command: command,
        error: error instanceof Error ? error : new Error('Command failed'),
        metadata: { timestamp: Date.now() }
      };
    }
  }

  // ตรวจสอบว่า command สามารถ undo ได้หรือไม่ (เหมือน Canva/Figma)
  private isUndoableCommand(command: Command): boolean {
    const undoableTypes = [
      'ADD_NODE', 'DELETE_NODE', 'UPDATE_NODE', 'MOVE_NODE', 'RESIZE_NODE',
      'ADD_EDGE', 'DELETE_EDGE', 'UPDATE_EDGE',
      'ADD_VARIABLE', 'DELETE_VARIABLE', 'UPDATE_VARIABLE',
      'BATCH_OPERATION', 'COPY_NODES', 'PASTE_NODES',
      // ✅ FIGMA/CANVA STYLE: Support for multiple selection operations
      'BATCH_MOVE', 'BATCH_DELETE', 'BATCH_COPY', 'BATCH_CUT', 'BATCH_PASTE', 'MULTI_SELECT'
    ];
    
    return undoableTypes.some(type => command.type.includes(type));
  }

  // ตรวจสอบว่า command เป็นการเลือกเท่านั้น (ไม่ใช่การแก้ไขข้อมูล)
  private isSelectionOnlyCommand(command: Command): boolean {
    const selectionTypes = [
      // Selection Commands
      'MULTI_SELECT', 'SELECT_NODES', 'SELECT_EDGES', 'CLEAR_SELECTION',
      'SELECTION_CHANGE', 'UI_SELECT', 'VISUAL_SELECT', 'SELECT_ALL',
      'DESELECT_ALL', 'TOGGLE_SELECTION', 'SINGLE_SELECT',
      // UI-only Commands
      'UPDATE_VIEWPORT', 'UPDATE_CANVAS_POSITION', 'UPDATE_ZOOM',
      'UPDATE_UI_SETTINGS', 'TOGGLE_PANEL', 'CHANGE_VIEW_MODE',
      // Focus and Highlight Commands (UI-only)
      'FOCUS_NODE', 'HIGHLIGHT_NODE', 'UNHIGHLIGHT_NODE', 'SET_FOCUS',
      'CLEAR_FOCUS', 'HOVER_NODE', 'UNHOVER_NODE',
      // Canvas State Commands (UI-only)
      'SET_CANVAS_MODE', 'TOGGLE_GRID', 'UPDATE_MINIMAP', 'SET_VIEW_MODE'
    ];
    
    // ✅ PROFESSIONAL: Explicit check for UI-only commands
    const isUIOnly = selectionTypes.some(type => command.type.includes(type));
    
    if (isUIOnly) {
      console.log(`[SingleUserEventManager] 👆 UI-only command detected: ${command.type}`);
    }
    
    return isUIOnly;
  }

  // 🔥 CRITICAL FIX: ตรวจสอบว่า command เป็น content change จริงๆ (ไม่รวม Selection)
  private isContentCommand(command: Command): boolean {
    // ✅ STEP 1: ตรวจสอบ UI-only commands ก่อน (early exit)
    if (this.isSelectionOnlyCommand(command)) {
      console.log(`[SingleUserEventManager] 👆 Selection/UI command, NOT content: ${command.type}`);
      return false; // Selection commands จะไม่ใช่ content commands เด็ดขาด
    }
    
    // ✅ STEP 2: กำหนด Content Commands ที่ชัดเจน (Database Changes Only)
    const contentCommandTypes = [
      // Node Content Changes (Database)
      'ADD_NODE', 'DELETE_NODE', 'UPDATE_NODE', 'MOVE_NODE', 'RESIZE_NODE',
      // Edge Content Changes (Database)
      'ADD_EDGE', 'DELETE_EDGE', 'UPDATE_EDGE',
      // Variable Content Changes (Database)
      'ADD_VARIABLE', 'DELETE_VARIABLE', 'UPDATE_VARIABLE',
      // Batch Operations (Database Changes Only)
      'BATCH_OPERATION', 'COPY_NODES', 'PASTE_NODES',
      'BATCH_MOVE', 'BATCH_DELETE', 'BATCH_COPY', 'BATCH_CUT', 'BATCH_PASTE',
      // Story Structure Changes (Database)
      'UPDATE_STORY_VARIABLE', 'MODIFY_NODE_DATA', 'CHANGE_NODE_TYPE',
      'UPDATE_NODE_PROPERTIES', 'MODIFY_EDGE_PROPERTIES'
    ];
    
    // ✅ STEP 3: Strict matching - เฉพาะ commands ที่อยู่ใน whitelist เท่านั้น
    const isContentType = contentCommandTypes.some(type => command.type === type || command.type.startsWith(type));
    
    if (isContentType) {
      console.log(`[SingleUserEventManager] ✏️ Content command confirmed: ${command.type}`);
    } else {
      console.log(`[SingleUserEventManager] ⚪ Non-content command: ${command.type}`);
    }
    
    return isContentType;
  }

  // เพิ่ม method สำหรับเพิ่ม command เข้า history โดยตรง (สำหรับ ReactFlow generated commands)
  addCommandToHistory(command: Command): void {
    try {
      console.log(`[SingleUserEventManager] Adding command to history: ${command.type} - ${command.description}`);

      // ตรวจสอบว่า command สามารถ undo ได้หรือไม่
      if (this.isUndoableCommand(command)) {
        this.addToHistory(command);
        
        // Clear redo stack เมื่อมี command ใหม่ (เหมือน Canva/Figma)
        this.state.redoStack = [];
        
        console.log(`[SingleUserEventManager] ✅ Command added to history. Undo: ${this.state.undoStack.length}, Redo: ${this.state.redoStack.length}`);
      } else {
        console.log(`[SingleUserEventManager] ⏭️ Command not undoable, skipping history`);
      }

      // 🔥 CRITICAL FIX: Mark as dirty เฉพาะ content commands เท่านั้น
      if (this.isContentCommand(command)) {
        this.markAsDirty();
        console.log(`[SingleUserEventManager] ✏️ Content command marked as dirty: ${command.type}`);
      } else {
        console.log(`[SingleUserEventManager] 👆 UI-only command, not marking as dirty: ${command.type}`);
      }

      // Update state
      this.updateState({
        totalEvents: this.state.totalEvents + 1
      });

    } catch (error) {
      console.error('[SingleUserEventManager] Failed to add command to history:', error);
      this.config.onError?.(error instanceof Error ? error : new Error('Failed to add command to history'), 'ADD_TO_HISTORY');
    }
  }

  undo(): boolean {
    if (this.state.undoStack.length === 0) {
      console.log('[SingleUserEventManager] ↶ No actions to undo');
      return false;
    }

    const command = this.state.undoStack.pop();
    if (!command) return false;

    try {
      console.log(`[SingleUserEventManager] ↶ Undoing: ${command.type} - ${command.description}`);

      if (command.undo) {
        command.undo();
      }

      this.state.redoStack.push(command);
      
      // 🔥 PROFESSIONAL FIX: ตรวจสอบ dirty state หลัง undo แบบ Adobe/Figma
      if (this.isContentCommand(command)) {
        // ✅ SIMPLE & ACCURATE: ตรวจสอบว่ายังมี content commands ใน undo stack หรือไม่
        const remainingContentCommands = this.state.undoStack.filter(cmd => this.isContentCommand(cmd));
        const shouldBeDirty = remainingContentCommands.length > 0;
        
        this.updateState({
          isDirty: shouldBeDirty,
          hasUnsavedChanges: shouldBeDirty
        });
        this.config.onDirtyChange?.(shouldBeDirty);
        
        console.log(`[SingleUserEventManager] ↶ Undo ${shouldBeDirty ? 'marked as dirty' : 'back to saved state'}: ${command.type}`, {
          remainingContentCommands: remainingContentCommands.length,
          commandTypes: remainingContentCommands.map(cmd => cmd.type)
        });
      } else {
        console.log(`[SingleUserEventManager] ↶ Undo UI-only command, not affecting dirty state: ${command.type}`);
      }

      // 🔥 FIGMA/CANVA STYLE: Force immediate UI sync
      this.forceUISync();

      // Update state
      this.updateState({
        totalEvents: this.state.totalEvents + 1
      });

      console.log(`[SingleUserEventManager] ✅ Undo successful. Undo: ${this.state.undoStack.length}, Redo: ${this.state.redoStack.length}`);
      return true;

    } catch (error) {
      console.error('[SingleUserEventManager] ❌ Undo failed:', error);
      // Re-add to undo stack if undo failed
      this.state.undoStack.push(command);
      return false;
    }
  }

  redo(): boolean {
    if (this.state.redoStack.length === 0) {
      console.log('[SingleUserEventManager] ↷ No actions to redo');
      return false;
    }

    const command = this.state.redoStack.pop();
    if (!command) return false;

    try {
      console.log(`[SingleUserEventManager] ↷ Redoing: ${command.type} - ${command.description}`);

      if (command.execute) {
        command.execute();
      }

      this.state.undoStack.push(command);
      
      // 🔥 PROFESSIONAL FIX: ตรวจสอบ dirty state หลัง redo แบบ Adobe/Figma
      if (this.isContentCommand(command)) {
        // ✅ SIMPLE & ACCURATE: ตรวจสอบว่ายังมี content commands ใน undo stack หรือไม่
        const remainingContentCommands = this.state.undoStack.filter(cmd => this.isContentCommand(cmd));
        const shouldBeDirty = remainingContentCommands.length > 0;
        
        this.updateState({
          isDirty: shouldBeDirty,
          hasUnsavedChanges: shouldBeDirty
        });
        this.config.onDirtyChange?.(shouldBeDirty);
        
        console.log(`[SingleUserEventManager] ↷ Redo ${shouldBeDirty ? 'marked as dirty' : 'back to saved state'}: ${command.type}`, {
          remainingContentCommands: remainingContentCommands.length,
          commandTypes: remainingContentCommands.map(cmd => cmd.type)
        });
      } else {
        console.log(`[SingleUserEventManager] ↷ Redo UI-only command, not affecting dirty state: ${command.type}`);
      }

      // 🔥 FIGMA/CANVA STYLE: Force immediate UI sync
      this.forceUISync();

      // Update state
      this.updateState({
        totalEvents: this.state.totalEvents + 1
      });

      console.log(`[SingleUserEventManager] ✅ Redo successful. Undo: ${this.state.undoStack.length}, Redo: ${this.state.redoStack.length}`);
      return true;

    } catch (error) {
      console.error('[SingleUserEventManager] ❌ Redo failed:', error);
      // Re-add to redo stack if redo failed
      this.state.redoStack.push(command);
      return false;
    }
  }

  async saveManual(): Promise<void> {
    if (!this.state.isDirty) {
      console.log('[SingleUserEventManager] ✅ No changes to save');
      return;
    }

    // 🔥 ADOBE/FIGMA STYLE: Check if save is already in progress
    if (this.saveDebouncer.isSaving()) {
      console.log('[SingleUserEventManager] ⏳ Save already in progress, skipping duplicate save');
      return;
    }

    this.updateState({ isSaving: true, lastError: undefined });

    try {
      // ตรวจสอบและทำความสะอาดข้อมูลก่อนบันทึก (ตรงกับ StoryMap model schema)
      const nodes = this.currentSnapshot.nodes || [];
      const edges = this.currentSnapshot.edges || [];
      const storyVariables = this.currentSnapshot.storyVariables || [];

      // ทำความสะอาดข้อมูล nodes ให้ตรงกับ IStoryMapNode interface
      const cleanedNodes = nodes.map(node => ({
        nodeId: node.id || node.nodeId,
        nodeType: node.type || node.nodeType || 'scene_node',
        title: node.data?.title || node.title || 'Untitled Node',
        position: { 
          x: Math.round(node.position?.x || 0), 
          y: Math.round(node.position?.y || 0)
        },
        nodeSpecificData: node.data?.nodeSpecificData || {},
        editorVisuals: {
          color: node.data?.color || '#3b82f6',
          orientation: node.data?.orientation || 'vertical'
        }
      }));

      // ทำความสะอาดข้อมูล edges ให้ตรงกับ IStoryMapEdge interface
      const cleanedEdges = edges.map(edge => ({
        edgeId: edge.id || edge.edgeId,
        sourceNodeId: edge.source || edge.sourceNodeId,
        targetNodeId: edge.target || edge.targetNodeId,
        label: edge.label || '',
        editorVisuals: {
          color: edge.data?.color || '#64748b',
          lineStyle: edge.data?.lineStyle || 'solid'
        }
      }));

      // ทำความสะอาดข้อมูล storyVariables ให้ตรงกับ IStoryVariableDefinition interface
      const cleanedStoryVariables = storyVariables.map(variable => ({
        variableId: variable.variableId || `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        variableName: variable.variableName || variable.name || 'Unknown Variable',
        dataType: variable.dataType || variable.variableType || 'string',
        initialValue: variable.initialValue !== undefined ? variable.initialValue : '',
        description: variable.description || '',
        isGlobal: variable.isGlobal !== undefined ? variable.isGlobal : true,
        isVisibleToPlayer: variable.isVisibleToPlayer || false
      }));

      const saveData = {
        nodes: cleanedNodes,
        edges: cleanedEdges,
        storyVariables: cleanedStoryVariables,
        version: this.state.localVersion
      };

      console.log('[SingleUserEventManager] 🔄 Preparing save with deduplication:', {
        novelSlug: this.config.novelSlug,
        nodeCount: saveData.nodes.length,
        edgeCount: saveData.edges.length,
        variableCount: saveData.storyVariables.length,
        version: saveData.version
      });
      
      // 🔥 ADOBE/FIGMA STYLE: Use SaveDebouncer to prevent duplicate saves
      const saveFunction = async (data: any) => {
        const encodedSlug = encodeURIComponent(this.config.novelSlug);
        const response = await fetch(`/api/novels/${encodedSlug}/storymap`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        });

        console.log('[SingleUserEventManager] 📡 Server response status:', response.status);

        if (!response.ok) {
          let errorMessage = `Save failed: ${response.status}`;
          let errorDetail = '';
          
          try {
            const errorData = await response.json();
            console.error('[SingleUserEventManager] ❌ Server error details:', errorData);
            
            if (errorData.error) {
              errorMessage = `Save failed: ${errorData.error}`;
            }
            if (errorData.details) {
              errorDetail = ` - ${errorData.details}`;
            }
          } catch (parseError) {
            // ถ้า parse JSON ไม่ได้ ใช้ response text
            try {
              const errorText = await response.text();
              console.error('[SingleUserEventManager] ❌ Raw server error:', errorText);
              errorDetail = ` - ${errorText.substring(0, 200)}`;
            } catch {
              errorDetail = ` - ${response.statusText}`;
            }
          }
          
          throw new Error(errorMessage + errorDetail);
        }

        return response.json();
      };

      // 🔥 ADOBE/FIGMA STYLE: Perform save with proper duplicate handling
      const result = await this.saveDebouncer.performSave(saveData, saveFunction);
      console.log('[SingleUserEventManager] ✅ Save successful, server response:', result);
      
      // Update version และ state หลังบันทึกสำเร็จ
      const newVersion = result.newVersion || result.storyMap?.version || (this.state.serverVersion + 1);
      
      // ✅ CRITICAL FIX: Update originalSnapshot BEFORE state update
      this.originalSnapshot = { 
        ...this.currentSnapshot,
        version: newVersion,
        timestamp: Date.now()
      };
      
      // ✅ PROFESSIONAL: Update state with proper synchronization
      this.updateState({
        isSaving: false,
        lastSaved: new Date(),
        isDirty: false,
        hasUnsavedChanges: false,
        localVersion: newVersion,
        serverVersion: newVersion,
        lastError: undefined
      });

      // ✅ ADOBE/FIGMA STYLE: Clear command history AFTER state update
      this.state.undoStack = [];
      this.state.redoStack = [];
      
      // ✅ CRITICAL: Force state callback to update UI immediately
      this.config.onStateChange?.(this.state);
      this.config.onDirtyChange?.(false);

      // ✅ ADOBE/FIGMA STYLE: Sync localStorage immediately after save success
      if (typeof window !== 'undefined') {
        const now = Date.now();
        localStorage.setItem('divwy-last-saved', now.toString());
        localStorage.setItem('divwy-has-unsaved-changes', 'false');
        localStorage.setItem('divwy-content-changes', 'false');
        localStorage.setItem('divwy-command-has-changes', 'false');
        localStorage.removeItem('divwy-last-change');
        localStorage.removeItem('divwy-last-content-change');
        
        // ✅ PROFESSIONAL: Clear auto-save status for refresh protection
        localStorage.removeItem('divwy-auto-save-active');
        localStorage.setItem('divwy-last-auto-save', now.toString());
        
        console.log('[SingleUserEventManager] ✅ localStorage synced - refresh protection cleared', {
          timestamp: now,
          clearFlags: ['content-changes', 'command-has-changes', 'last-change'],
          setFlags: ['last-saved', 'last-auto-save']
        });
      }

      console.log('[SingleUserEventManager] ✅ Save completed - state synchronized');

      console.log('[SingleUserEventManager] ✅ Manual save completed successfully with deduplication');

    } catch (error) {
      console.error('[SingleUserEventManager] ❌ Manual save failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Save failed';
      
      // 🔥 ADOBE/FIGMA STYLE: Handle duplicate save gracefully
      if (errorMessage === 'SAVE_IN_PROGRESS') {
        console.log('[SingleUserEventManager] ⏳ Save already in progress, user notified');
        this.updateState({ isSaving: false });
        return; // Don't throw for duplicate save attempts
      }
      
      if (errorMessage === 'DUPLICATE_DATA') {
        console.log('[SingleUserEventManager] 🔄 No changes to save');
        this.updateState({ isSaving: false });
        return; // Don't throw for no changes
      }
      
      this.updateState({ 
        isSaving: false,
        lastError: errorMessage
      });
      
      this.config.onError?.(error instanceof Error ? error : new Error('Save failed'), 'MANUAL_SAVE');
      throw error;
    }
  }

  initializeWithData(data: { nodes: any[]; edges: any[]; storyVariables: any[] }): void {
    const snapshot: SnapshotData = {
      ...data,
      timestamp: Date.now(),
      version: this.state.serverVersion
    };

    this.currentSnapshot = snapshot;
    this.originalSnapshot = { ...snapshot };
    
    this.updateState({
      isDirty: false,
      hasUnsavedChanges: false,
      localVersion: snapshot.version
    });

    this.config.onDirtyChange?.(false);
    
    console.log('[SingleUserEventManager] Initialized with data:', {
      nodeCount: data.nodes.length,
      edgeCount: data.edges.length,
      variableCount: data.storyVariables.length
    });
  }

  getState(): SingleUserState {
    return { ...this.state };
  }

  getCurrentSnapshot(): SnapshotData {
    return this.currentSnapshot;
  }

  getCommandContext(): CommandContext {
    return this.commandContext;
  }

  // 🚀 NEW: Set ReactFlow UI updater for bidirectional sync
  setReactFlowUpdater(updater: (nodes: any[], edges: any[]) => void): void {
    if (this.commandContext instanceof SingleUserCommandContext) {
      this.commandContext.setReactFlowUpdater(updater);
    }
  }

  hasChanges(): boolean {
    // ✅ SIMPLE & ACCURATE: เฉพาะ content commands ใน undo stack เท่านั้น
    const contentCommands = this.state.undoStack.filter(cmd => this.isContentCommand(cmd));
    const hasContentChanges = contentCommands.length > 0;
    
    // ✅ PROFESSIONAL LOGGING: แสดงข้อมูลที่เข้าใจง่าย
    console.log(`[SingleUserEventManager] 🔍 Simple change detection:`, {
      hasChanges: hasContentChanges,
      contentCommandsCount: contentCommands.length,
      totalCommandsCount: this.state.undoStack.length,
      contentCommandTypes: contentCommands.map(cmd => cmd.type),
      detectionMethod: 'content-commands-only'
    });
    
    return hasContentChanges;
  }

  // 🔥 FIGMA/CANVA STYLE: Force immediate UI sync method
  private forceUISync(): void {
    if (this.commandContext instanceof SingleUserCommandContext) {
      const snapshot = this.getCurrentSnapshot();
      console.log('[SingleUserEventManager] 🔄 Force UI sync:', {
        nodeCount: snapshot.nodes.length,
        edgeCount: snapshot.edges.length
      });
      
      // ✅ CRITICAL FIX: Ensure reactFlowUpdater is called with updated references
      if (this.commandContext.updateReactFlowUI) {
        // Create new array references to force React re-render
        this.commandContext.updateReactFlowUI([...snapshot.nodes], [...snapshot.edges]);
      }
    }
  }

  // ✅ PROFESSIONAL SOLUTION 1: เพิ่ม Dynamic Config Update
  updateConfig(newConfig: Partial<SingleUserConfig>): void {
    const oldAutoSaveEnabled = this.config.autoSaveEnabled;
    const oldInterval = this.config.autoSaveIntervalMs;
    
    // Update configuration
    this.config = { ...this.config, ...newConfig };
    
    // Handle auto-save timer changes dynamically
    if (newConfig.autoSaveEnabled !== undefined || newConfig.autoSaveIntervalMs !== undefined) {
      this.stopAutoSave(); // Stop existing timer
      
      if (this.config.autoSaveEnabled) {
        this.startAutoSave(); // Start with new config
        console.log('[SingleUserEventManager] ✅ Auto-save restarted with new config:', {
          enabled: this.config.autoSaveEnabled,
          intervalMs: this.config.autoSaveIntervalMs
        });
      } else {
        console.log('[SingleUserEventManager] ⏹️ Auto-save disabled');
      }
    }
  }

  private stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = undefined;
      console.log('[SingleUserEventManager] Auto-save timer stopped');
    }
  }

  destroy(): void {
    this.stopAutoSave();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    console.log('[SingleUserEventManager] Destroyed');
  }

  // ===================================================================
  // Private Methods
  // ===================================================================

  private createInitialState(): SingleUserState {
    return {
      commandHistory: [],
      undoStack: [],
      redoStack: [],
      isSaving: false,
      lastSaved: null,
      isDirty: false,
      hasUnsavedChanges: false,
      localVersion: 1,
      serverVersion: 1,
      pendingCommands: 0,
      totalEvents: 0
    };
  }

  private createEmptySnapshot(): SnapshotData {
    return {
      nodes: [],
      edges: [],
      storyVariables: [],
      timestamp: Date.now(),
      version: 1
    };
  }

  private addToHistory(command: Command): void {
    // Add to undo stack
    this.state.undoStack.push(command);

    // Clear redo stack when new command is executed
    this.state.redoStack = [];

    // Limit history size
    if (this.state.undoStack.length > this.config.maxHistorySize) {
      this.state.undoStack = this.state.undoStack.slice(-this.config.maxHistorySize);
    }

    // Add to command history for tracking
    this.state.commandHistory.push(command);
    if (this.state.commandHistory.length > this.config.maxHistorySize) {
      this.state.commandHistory = this.state.commandHistory.slice(-this.config.maxHistorySize);
    }
  }

  private startAutoSave(): void {
    this.autoSaveTimer = setInterval(() => {
      if (this.state.isDirty && !this.state.isSaving) {
        // ✅ ADOBE/FIGMA STYLE: Mark auto-save as active for refresh protection
        if (typeof window !== 'undefined') {
          localStorage.setItem('divwy-auto-save-active', 'true');
          localStorage.setItem('divwy-auto-save-started', Date.now().toString());
        }
        
        this.saveManual().then(() => {
          console.log('[SingleUserEventManager] ✅ Auto-save completed successfully');
          
          // ✅ PROFESSIONAL: Clear auto-save active flag after success
          if (typeof window !== 'undefined') {
            localStorage.removeItem('divwy-auto-save-active');
            localStorage.setItem('divwy-last-successful-auto-save', Date.now().toString());
            
            console.log('[SingleUserEventManager] 🔄 Auto-save cycle completed - refresh protection updated');
          }
        }).catch(error => {
          console.warn('[SingleUserEventManager] Auto-save failed:', error);
          
          // ✅ PROFESSIONAL: Clear auto-save active flag even on failure
          if (typeof window !== 'undefined') {
            localStorage.removeItem('divwy-auto-save-active');
            localStorage.setItem('divwy-last-auto-save-error', Date.now().toString());
          }
        });
      }
    }, this.config.autoSaveIntervalMs);
  }

  // formatDataForAPI function ถูกลบออกแล้ว - ใช้การส่งข้อมูลตรงๆ แทน

  updateSnapshot(snapshotData: SnapshotData): void {
    this.currentSnapshot = snapshotData;
    this.markAsDirty();
  }

  // Compatibility method for BlueprintTab
  updateSnapshotFromReactFlow(nodes: any[], edges: any[], storyVariables: any[]): void {
    const newSnapshot: SnapshotData = {
      nodes: [...nodes],
      edges: [...edges],
      storyVariables: [...storyVariables],
      timestamp: Date.now(),
      version: this.state.localVersion
    };

    // Professional change detection - ตรวจสอบการเปลี่ยนแปลงอย่างละเอียด (Canva/Figma level)
    const hasChanges = this.detectPreciseChanges(this.currentSnapshot, newSnapshot);
    
    if (hasChanges.hasChanges) {
      this.currentSnapshot = newSnapshot;
      this.markAsDirty();
      
      // Log การเปลี่ยนแปลงแบบละเอียด
      console.log('[SingleUserEventManager] Professional change detected:', {
        nodeChanges: hasChanges.nodeChanges,
        edgeChanges: hasChanges.edgeChanges,
        variableChanges: hasChanges.variableChanges,
        changeType: hasChanges.changeType,
        affectedItems: hasChanges.affectedItems.length
      });
      
      // Trigger state change notification with change details
      this.updateState({
        hasUnsavedChanges: true,
        totalEvents: this.state.totalEvents + 1
      });
    }
  }

  markAsDirty(): void {
    // ✅ SIMPLE FIX: Mark as dirty ตรงๆ (จะถูกเรียกเฉพาะจาก content commands แล้ว)
    if (!this.state.isDirty) {
      this.updateState({
        isDirty: true,
        hasUnsavedChanges: true
      });
      this.config.onDirtyChange?.(true);
      console.log('[SingleUserEventManager] ✏️ Marked as dirty due to content change');
    }
  }

  markAsSaved(): void {
    this.updateState({
      isDirty: false,
      hasUnsavedChanges: false,
      lastSaved: new Date()
    });
    this.config.onDirtyChange?.(false);
  }

  notifyChange(changeType: string, data: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SingleUserEventManager] Change: ${changeType}`, data);
    }
  }

  private updateState(updates: Partial<SingleUserState>): void {
    this.state = { ...this.state, ...updates };
    
    // ✅ CRITICAL FIX: Sync isDirty/hasUnsavedChanges with command-based detection
    const commandBasedHasChanges = this.hasChanges();
    if (this.state.isDirty !== commandBasedHasChanges || this.state.hasUnsavedChanges !== commandBasedHasChanges) {
      this.state.isDirty = commandBasedHasChanges;
      this.state.hasUnsavedChanges = commandBasedHasChanges;
      
      console.log('[SingleUserEventManager] 🔄 State sync - command-based override:', {
        commandBasedHasChanges,
        reason: 'Ensuring consistency between Save Button and Status Indicator'
      });
    }
    
    this.config.onStateChange?.(this.state);
  }

  // ===================================================================
  // Professional Change Detection (Canva/Figma Level Precision)
  // ===================================================================

  private detectPreciseChanges(oldSnapshot: SnapshotData, newSnapshot: SnapshotData): {
    hasChanges: boolean;
    nodeChanges: { added: number; removed: number; modified: number; moved: number };
    edgeChanges: { added: number; removed: number; modified: number };
    variableChanges: { added: number; removed: number; modified: number };
    changeType: 'creation' | 'deletion' | 'modification' | 'movement' | 'batch' | 'none';
    affectedItems: string[];
  } {
    const changes = {
      hasChanges: false,
      nodeChanges: { added: 0, removed: 0, modified: 0, moved: 0 },
      edgeChanges: { added: 0, removed: 0, modified: 0 },
      variableChanges: { added: 0, removed: 0, modified: 0 },
      changeType: 'none' as any,
      affectedItems: [] as string[]
    };

    // สร้าง Maps สำหรับการเปรียบเทียบที่รวดเร็ว
    const oldNodes = new Map((oldSnapshot.nodes || []).map(n => [n.id, n]));
    const newNodes = new Map((newSnapshot.nodes || []).map(n => [n.id, n]));
    const oldEdges = new Map((oldSnapshot.edges || []).map(e => [e.id, e]));
    const newEdges = new Map((newSnapshot.edges || []).map(e => [e.id, e]));
    const oldVars = new Map((oldSnapshot.storyVariables || []).map(v => [v.variableId || v.id, v]));
    const newVars = new Map((newSnapshot.storyVariables || []).map(v => [v.variableId || v.id, v]));

    // ตรวจสอบการเปลี่ยนแปลงของ Nodes
    for (const [nodeId, newNode] of newNodes) {
      if (!oldNodes.has(nodeId)) {
        changes.nodeChanges.added++;
        changes.affectedItems.push(`node:${nodeId}:added`);
      } else {
        const oldNode = oldNodes.get(nodeId)!;
        
        // ตรวจสอบการเคลื่อนที่ (Position changes)
        if (this.hasPositionChanged(oldNode.position, newNode.position)) {
          changes.nodeChanges.moved++;
          changes.affectedItems.push(`node:${nodeId}:moved`);
        }
        
        // ตรวจสอบการแก้ไขข้อมูล (Data changes)
        if (this.hasNodeDataChanged(oldNode, newNode)) {
          changes.nodeChanges.modified++;
          changes.affectedItems.push(`node:${nodeId}:modified`);
        }
      }
    }

    // ตรวจสอบ Nodes ที่ถูกลบ
    for (const nodeId of oldNodes.keys()) {
      if (!newNodes.has(nodeId)) {
        changes.nodeChanges.removed++;
        changes.affectedItems.push(`node:${nodeId}:deleted`);
      }
    }

    // ตรวจสอบการเปลี่ยนแปลงของ Edges
    for (const [edgeId, newEdge] of newEdges) {
      if (!oldEdges.has(edgeId)) {
        changes.edgeChanges.added++;
        changes.affectedItems.push(`edge:${edgeId}:added`);
      } else {
        const oldEdge = oldEdges.get(edgeId)!;
        if (this.hasEdgeDataChanged(oldEdge, newEdge)) {
          changes.edgeChanges.modified++;
          changes.affectedItems.push(`edge:${edgeId}:modified`);
        }
      }
    }

    // ตรวจสอบ Edges ที่ถูกลบ
    for (const edgeId of oldEdges.keys()) {
      if (!newEdges.has(edgeId)) {
        changes.edgeChanges.removed++;
        changes.affectedItems.push(`edge:${edgeId}:deleted`);
      }
    }

    // ตรวจสอบการเปลี่ยนแปลงของ Variables
    for (const [varId, newVar] of newVars) {
      if (!oldVars.has(varId)) {
        changes.variableChanges.added++;
        changes.affectedItems.push(`var:${varId}:added`);
      } else {
        const oldVar = oldVars.get(varId)!;
        if (this.hasVariableDataChanged(oldVar, newVar)) {
          changes.variableChanges.modified++;
          changes.affectedItems.push(`var:${varId}:modified`);
        }
      }
    }

    // ตรวจสอบ Variables ที่ถูกลบ
    for (const varId of oldVars.keys()) {
      if (!newVars.has(varId)) {
        changes.variableChanges.removed++;
        changes.affectedItems.push(`var:${varId}:deleted`);
      }
    }

    // คำนวณว่ามีการเปลี่ยนแปลงหรือไม่
    const totalChanges = 
      changes.nodeChanges.added + changes.nodeChanges.removed + changes.nodeChanges.modified + changes.nodeChanges.moved +
      changes.edgeChanges.added + changes.edgeChanges.removed + changes.edgeChanges.modified +
      changes.variableChanges.added + changes.variableChanges.removed + changes.variableChanges.modified;

    changes.hasChanges = totalChanges > 0;

    // กำหนดประเภทการเปลี่ยนแปลง
    if (totalChanges === 0) {
      changes.changeType = 'none';
    } else if (totalChanges === 1) {
      if (changes.nodeChanges.added > 0 || changes.edgeChanges.added > 0 || changes.variableChanges.added > 0) {
        changes.changeType = 'creation';
      } else if (changes.nodeChanges.removed > 0 || changes.edgeChanges.removed > 0 || changes.variableChanges.removed > 0) {
        changes.changeType = 'deletion';
      } else if (changes.nodeChanges.moved > 0) {
        changes.changeType = 'movement';
      } else {
        changes.changeType = 'modification';
      }
    } else {
      changes.changeType = 'batch';
    }

    return changes;
  }

  // Helper methods สำหรับการตรวจสอบการเปลี่ยนแปลงแบบละเอียด
  private hasPositionChanged(oldPos: any, newPos: any): boolean {
    if (!oldPos && !newPos) return false;
    if (!oldPos || !newPos) return true;
    
    const threshold = 1; // pixel threshold สำหรับการเคลื่อนที่
    return Math.abs((oldPos.x || 0) - (newPos.x || 0)) > threshold || 
           Math.abs((oldPos.y || 0) - (newPos.y || 0)) > threshold;
  }

  private hasNodeDataChanged(oldNode: any, newNode: any): boolean {
    // ตรวจสอบการเปลี่ยนแปลงของข้อมูลที่สำคัญ
    const importantFields = ['type', 'data', 'style'];
    
    for (const field of importantFields) {
      if (JSON.stringify(oldNode[field]) !== JSON.stringify(newNode[field])) {
        return true;
      }
    }
    return false;
  }

  private hasEdgeDataChanged(oldEdge: any, newEdge: any): boolean {
    // ตรวจสอบการเปลี่ยนแปลงของ edge
    const importantFields = ['source', 'target', 'sourceHandle', 'targetHandle', 'data', 'style', 'label'];
    
    for (const field of importantFields) {
      if (JSON.stringify(oldEdge[field]) !== JSON.stringify(newEdge[field])) {
        return true;
      }
    }
    return false;
  }

  private hasVariableDataChanged(oldVar: any, newVar: any): boolean {
    // ตรวจสอบการเปลี่ยนแปลงของ variable
    const importantFields = ['variableName', 'dataType', 'initialValue', 'description'];
    
    for (const field of importantFields) {
      if (oldVar[field] !== newVar[field]) {
        return true;
      }
    }
    return false;
  }
}

// ===================================================================
// Save Deduplication Class (Adobe/Figma/Canva Style)
// ===================================================================

class SaveDebouncer {
  private lastSaveHash: string = '';
  private saving: boolean = false;
  
  async performSave(data: any, saveFunction: (data: any) => Promise<any>): Promise<any> {
    // Generate hash of current data
    const currentHash = this.generateDataHash(data);
    
    // 🔥 ADOBE/FIGMA STYLE: Prevent duplicate saves with better error handling
    if (this.saving) {
      console.log('[SaveDebouncer] ⏳ Save already in progress, skipping duplicate request');
      throw new Error('SAVE_IN_PROGRESS');
    }
    
    if (currentHash === this.lastSaveHash) {
      console.log('[SaveDebouncer] 🔄 Identical data detected, skipping duplicate save');
      throw new Error('DUPLICATE_DATA');
    }
    
    this.saving = true;
    console.log('[SaveDebouncer] 🚀 Starting save operation...');
    
    try {
      // Perform actual save
      const result = await saveFunction(data);
      this.lastSaveHash = currentHash;
      console.log('[SaveDebouncer] ✅ Save completed successfully');
      return result;
    } catch (error) {
      console.error('[SaveDebouncer] ❌ Save failed:', error);
      // Reset hash on failure to allow retry
      if (this.lastSaveHash === currentHash) {
        this.lastSaveHash = '';
      }
      throw error;
    } finally {
      this.saving = false;
    }
  }
  
  private generateDataHash(data: any): string {
    try {
      return btoa(JSON.stringify({
        nodeCount: data.nodes?.length || 0,
        edgeCount: data.edges?.length || 0,
        nodePositions: data.nodes?.map((n: any) => `${n.id}:${n.position?.x || 0},${n.position?.y || 0}`).join('|') || '',
        edgeConnections: data.edges?.map((e: any) => `${e.source}->${e.target}`).join('|') || '',
        storyVariableCount: data.storyVariables?.length || 0,
        timestamp: Math.floor(Date.now() / 1000) // Round to seconds to allow minor timing differences
      }));
    } catch (error) {
      console.warn('[SaveDebouncer] Hash generation failed, using fallback:', error);
      return `fallback_${Date.now()}_${Math.random()}`;
    }
  }
  
  reset(): void {
    this.lastSaveHash = '';
    this.saving = false;
  }
  
  isSaving(): boolean {
    return this.saving;
  }
}

// ===================================================================
// Factory Function
// ===================================================================

export function createSingleUserEventManager(config: SingleUserConfig): SingleUserEventManager {
  return new SingleUserEventManager(config);
}

export default SingleUserEventManager;
