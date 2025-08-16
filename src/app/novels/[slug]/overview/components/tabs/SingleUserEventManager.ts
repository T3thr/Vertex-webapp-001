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

  constructor(eventManager: SingleUserEventManager) {
    this.eventManager = eventManager;
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
  }

  setEdges(edges: any[]): void {
    this.eventManager.updateSnapshot({ 
      ...this.eventManager.getCurrentSnapshot(), 
      edges,
      timestamp: Date.now()
    });
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
    return this.getCurrentEdges().find(edge => edge.id === id) || null;
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

  constructor(config: SingleUserConfig) {
    this.config = config;
    this.state = this.createInitialState();
    this.commandContext = new SingleUserCommandContext(this);
    this.currentSnapshot = this.createEmptySnapshot();
    this.originalSnapshot = this.createEmptySnapshot();

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

      // Execute command
      if (command.execute) {
        await command.execute();
      }

      // Add to history
      this.addToHistory(command);

      // Mark as dirty
      this.markAsDirty();

      // Update state
      this.updateState({
        totalEvents: this.state.totalEvents + 1
      });

      console.log(`[SingleUserEventManager] Command executed: ${command.type}`);

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

  undo(): boolean {
    if (this.state.undoStack.length === 0) {
      return false;
    }

    const command = this.state.undoStack.pop();
    if (!command) return false;

    try {
      if (command.undo) {
        command.undo();
      }

      this.state.redoStack.push(command);
      this.markAsDirty();

      console.log(`[SingleUserEventManager] Undid command: ${command.type}`);
      return true;

    } catch (error) {
      console.error('[SingleUserEventManager] Undo failed:', error);
      // Re-add to undo stack if undo failed
      this.state.undoStack.push(command);
      return false;
    }
  }

  redo(): boolean {
    if (this.state.redoStack.length === 0) {
      return false;
    }

    const command = this.state.redoStack.pop();
    if (!command) return false;

    try {
      if (command.execute) {
        command.execute();
      }

      this.state.undoStack.push(command);
      this.markAsDirty();

      console.log(`[SingleUserEventManager] Redid command: ${command.type}`);
      return true;

    } catch (error) {
      console.error('[SingleUserEventManager] Redo failed:', error);
      // Re-add to redo stack if redo failed
      this.state.redoStack.push(command);
      return false;
    }
  }

  async saveManual(): Promise<void> {
    if (!this.state.isDirty) {
      console.log('[SingleUserEventManager] No changes to save');
      return;
    }

    this.updateState({ isSaving: true });

    try {
      // Prepare data for API - ใช้ข้อมูลจาก currentSnapshot โดยตรง
      const saveData = {
        nodes: this.currentSnapshot.nodes || [],
        edges: this.currentSnapshot.edges || [],
        storyVariables: this.currentSnapshot.storyVariables || [],
        version: this.currentSnapshot.version
      };

      console.log('[SingleUserEventManager] Saving data:', {
        nodeCount: saveData.nodes.length,
        edgeCount: saveData.edges.length,
        variableCount: saveData.storyVariables.length,
        version: saveData.version
      });
      
      // Send to server
      const encodedSlug = encodeURIComponent(this.config.novelSlug);
      const response = await fetch(`/api/novels/${encodedSlug}/storymap`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData)
      });

      if (!response.ok) {
        let errorMessage = `Save failed: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = `Save failed: ${errorData.error}`;
          }
        } catch {
          // ถ้า parse JSON ไม่ได้ ใช้ status text
          const errorText = await response.text();
          errorMessage = `Save failed: ${response.status} ${response.statusText} - ${errorText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // Update state
      this.updateState({
        isSaving: false,
        lastSaved: new Date(),
        isDirty: false,
        hasUnsavedChanges: false,
        serverVersion: result.newVersion || this.state.serverVersion + 1
      });

      // Update original snapshot
      this.originalSnapshot = { ...this.currentSnapshot };
      
      this.config.onDirtyChange?.(false);

      console.log('[SingleUserEventManager] Manual save successful');

    } catch (error) {
      console.error('[SingleUserEventManager] Manual save failed:', error);
      
      this.updateState({ 
        isSaving: false,
        lastError: error instanceof Error ? error.message : 'Save failed'
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

  hasChanges(): boolean {
    return this.state.isDirty || this.state.hasUnsavedChanges;
  }

  destroy(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
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
        this.saveManual().catch(error => {
          console.warn('[SingleUserEventManager] Auto-save failed:', error);
        });
      }
    }, this.config.autoSaveIntervalMs);
  }

  private formatDataForAPI(snapshot: SnapshotData): any {
    // แปลงข้อมูลให้ตรงกับรูปแบบที่ StoryMap API คาดหวัง
    const formattedData = {
      nodes: snapshot.nodes
        .filter(node => node && node.id) // กรองเฉพาะ node ที่มี id
        .map(node => ({
          nodeId: node.id,
          nodeType: node.type || 'scene_node', // ใช้ default type ที่ถูกต้อง
          title: node.data?.title || node.data?.label || `Node ${node.id}`,
          position: node.position || { x: 0, y: 0 },
          nodeSpecificData: {
            // รวมข้อมูลทั้งหมดจาก node.data
            ...node.data,
            // เพิ่มข้อมูลเฉพาะประเภทของ node
            ...(node.type === 'scene_node' && node.data?.sceneId ? { sceneId: node.data.sceneId } : {}),
            ...(node.type === 'choice_node' && node.data?.choiceIds ? { choiceIds: node.data.choiceIds } : {}),
          },
          editorVisuals: {
            color: node.style?.backgroundColor || node.data?.color || '#3b82f6',
            orientation: node.data?.orientation || 'vertical',
            // เพิ่มข้อมูล visual อื่นๆ
            borderStyle: node.style?.borderStyle || 'solid',
            borderRadius: node.style?.borderRadius || 8,
            ...(node.style && {
              zIndex: node.style.zIndex,
              opacity: node.style.opacity
            })
          },
          // เพิ่มข้อมูลเพิ่มเติมจาก node
          notesForAuthor: node.data?.notes || node.data?.description || '',
          authorDefinedEmotionTags: node.data?.emotionTags || [],
          lastEdited: new Date()
        })),
      
      edges: snapshot.edges
        .filter(edge => edge && edge.id && edge.source && edge.target) // กรองเฉพาะ edge ที่ถูกต้อง
        .map(edge => ({
          edgeId: edge.id,
          sourceNodeId: edge.source,
          targetNodeId: edge.target,
          sourceHandleId: edge.sourceHandle || 'bottom',
          sourceHandlePosition: edge.sourceHandle || 'bottom',
          targetHandleId: edge.targetHandle || 'top', 
          targetHandlePosition: edge.targetHandle || 'top',
          label: edge.label || edge.data?.label || '',
          // เพิ่มข้อมูล condition หากมี
          condition: edge.data?.condition ? {
            expression: edge.data.condition
          } : undefined,
          priority: edge.data?.priority || 0,
          editorVisuals: {
            color: edge.style?.stroke || '#64748b',
            lineStyle: edge.style?.strokeDasharray ? 'dashed' : 'solid',
            animated: edge.animated || false,
            pathType: edge.type || 'default',
            strokeWidth: edge.style?.strokeWidth || 2,
            markerEnd: edge.markerEnd || 'arrowclosed'
          },
          authorDefinedEmotionTags: edge.data?.emotionTags || []
        })),
      
      storyVariables: (snapshot.storyVariables || [])
        .filter(variable => variable && (variable.variableId || variable.id)) // รองรับทั้ง variableId และ id
        .map(variable => ({
          variableId: variable.variableId || variable.id || `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          variableName: variable.variableName || variable.name || 'Unnamed Variable',
          dataType: variable.dataType || variable.variableType || 'string',
          initialValue: variable.initialValue !== undefined 
            ? variable.initialValue 
            : (variable.defaultValue !== undefined ? variable.defaultValue : ''),
          description: variable.description || '',
          isGlobal: variable.isGlobal !== undefined ? variable.isGlobal : true,
          isVisibleToPlayer: variable.isVisibleToPlayer !== undefined ? variable.isVisibleToPlayer : false,
          allowedValues: variable.allowedValues || undefined
        })),
      
      // เพิ่มข้อมูล metadata
      version: this.state.localVersion,
      lastModified: new Date(),
      
      // เพิ่มข้อมูลสำหรับการตรวจสอบ
      clientInfo: {
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SingleUserEventManager',
        timestamp: Date.now(),
        nodeCount: snapshot.nodes.length,
        edgeCount: snapshot.edges.length,
        variableCount: snapshot.storyVariables.length
      }
    };

    console.log('[SingleUserEventManager] Formatted API data:', {
      nodeCount: formattedData.nodes.length,
      edgeCount: formattedData.edges.length,
      variableCount: formattedData.storyVariables.length,
      version: formattedData.version
    });

    return formattedData;
  }

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
    if (!this.state.isDirty) {
      this.updateState({
        isDirty: true,
        hasUnsavedChanges: true
      });
      this.config.onDirtyChange?.(true);
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
// Factory Function
// ===================================================================

export function createSingleUserEventManager(config: SingleUserConfig): SingleUserEventManager {
  return new SingleUserEventManager(config);
}

export default SingleUserEventManager;
