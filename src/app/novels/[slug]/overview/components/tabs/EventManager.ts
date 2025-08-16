// src/app/novels/[slug]/overview/components/tabs/EventManager.ts
// ===================================================================
// Event Manager - Professional Command & Event Sourcing System
// Replaces SaveManager with Command Pattern and Event Sourcing
// ===================================================================

import { Command, CommandContext, CommandResult, CommandValidation } from '@/lib/commands/Command';
import { IEventStore, createEventStore, StoryMapEvent } from '@/lib/event-store/EventStore';
import { RealtimeClient, createRealtimeClient, RealtimeCommand } from '@/lib/realtime/RealtimeClient';
import { produce } from 'immer';

// ===================================================================
// Event Manager Types
// ===================================================================

export interface EventManagerConfig {
  novelSlug: string;
  autoSaveEnabled: boolean;
  autoSaveIntervalMs: number;
  maxHistorySize: number;
  optimisticUpdates: boolean;
  conflictResolutionStrategy: 'last_write_wins' | 'merge' | 'manual';
  onStateChange?: (state: EventManagerState) => void;
  onDirtyChange?: (isDirty: boolean) => void;
  onError?: (error: Error, context: string) => void;
  // Real-time collaboration settings
  realtimeEnabled?: boolean;
  userId?: string;
  username?: string;
}

export interface EventManagerState {
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
  etag?: string;
  
  // Error Handling
  lastError?: string;
  isConflicted: boolean;
  
  // Performance
  pendingCommands: number;
  totalEvents: number;
  
  // Real-time Collaboration
  isRealtimeConnected: boolean;
  collaborators: Array<{
    userId: string;
    username: string;
    isOnline: boolean;
    cursor?: { x: number; y: number };
  }>;
  remoteCommandsReceived: number;
}

export interface SnapshotData {
  nodes: any[];
  edges: any[];
  storyVariables: any[];
  timestamp: number;
  version: number;
}

// ===================================================================
// Command Context Implementation
// ===================================================================

class EventManagerCommandContext implements CommandContext {
  private eventManager: EventManager;

  constructor(eventManager: EventManager) {
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
    const currentSnapshot = this.eventManager.getCurrentSnapshot();
    this.eventManager.updateSnapshot({
      ...currentSnapshot,
      nodes,
      timestamp: Date.now(),
    });
  }

  setEdges(edges: any[]): void {
    const currentSnapshot = this.eventManager.getCurrentSnapshot();
    this.eventManager.updateSnapshot({
      ...currentSnapshot,
      edges,
      timestamp: Date.now(),
    });
  }

  setStoryVariables(variables: any[]): void {
    const currentSnapshot = this.eventManager.getCurrentSnapshot();
    this.eventManager.updateSnapshot({
      ...currentSnapshot,
      storyVariables: variables,
      timestamp: Date.now(),
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
    // Basic validation - can be enhanced
    return !!(node && node.id && node.position);
  }

  validateEdge(edge: any): boolean {
    // Basic validation - can be enhanced
    return !!(edge && edge.id && edge.source && edge.target);
  }

  notifyChange(changeType: string, data: any): void {
    this.eventManager.notifyChange(changeType, data);
  }
}

// ===================================================================
// Event Manager Class
// ===================================================================

export class EventManager {
  private config: EventManagerConfig;
  private state: EventManagerState;
  private eventStore: IEventStore;
  private commandContext: CommandContext;
  private currentSnapshot: SnapshotData;
  private originalSnapshot: SnapshotData;
  private autoSaveTimer?: NodeJS.Timeout;
  private debounceTimer?: NodeJS.Timeout;
  private stateUpdateListeners: ((state: EventManagerState) => void)[] = [];

  // Real-time collaboration
  private realtimeClient?: RealtimeClient;
  private isProcessingRemoteCommand = false;

  // Stream configuration
  private readonly streamName = 'storymap';
  private readonly aggregateId: string;

  constructor(config: EventManagerConfig) {
    this.config = config;
    this.aggregateId = config.novelSlug;
    
    // Initialize event store
    this.eventStore = createEventStore('memory');
    
    // Initialize command context
    this.commandContext = new EventManagerCommandContext(this);
    
    // Initialize state
    this.state = this.createInitialState();
    this.currentSnapshot = this.createEmptySnapshot();
    this.originalSnapshot = this.createEmptySnapshot();
    
    // TEMPORARILY DISABLE real-time collaboration for single-user mode
    // Initialize real-time collaboration if enabled (non-blocking)
    // if (config.realtimeEnabled && config.userId) {
    //   // Initialize asynchronously to prevent blocking the main initialization
    //   setTimeout(() => {
    //     this.initializeRealtimeClient().catch(error => {
    //       console.warn('[EventManager] Real-time initialization failed, continuing in offline mode:', error.message);
    //     });
    //   }, 1000);
    // }

    // Start auto-save if enabled
    if (config.autoSaveEnabled) {
      this.startAutoSave();
    }

    // Professional logging
    if (process.env.NODE_ENV === 'development') {
      console.log('[EventManager] Initialized with config:', {
        novelSlug: config.novelSlug,
        autoSaveEnabled: config.autoSaveEnabled,
        autoSaveIntervalMs: config.autoSaveIntervalMs,
        optimisticUpdates: config.optimisticUpdates,
        realtimeEnabled: false // Temporarily disabled for single-user mode
      });
    }
  }

  // ===================================================================
  // Public API
  // ===================================================================

  /**
   * Execute a command with optimistic updates
   */
  async executeCommand(command: Command): Promise<CommandResult> {
    try {
      // Validate command
      const validation = this.validateCommand(command);
      if (!validation.isValid) {
        throw new Error(`Command validation failed: ${validation.errors.join(', ')}`);
      }

      // Add to command history
      this.addToHistory(command);

      // Optimistic update
      if (this.config.optimisticUpdates) {
        command.execute();
        this.markAsDirty();
      }

      // Send to real-time clients if enabled and connected
      if (this.realtimeClient && !this.isProcessingRemoteCommand) {
        try {
          // Check if client is connected before sending
          if (this.state.isRealtimeConnected) {
            await this.realtimeClient.sendCommand(command.serialize());
          } else {
            console.log('[EventManager] Real-time client not connected, executing locally only');
          }
        } catch (error) {
          console.warn('[EventManager] Real-time command failed, continuing locally:', error instanceof Error ? error.message : String(error));
          // Continue with local execution even if real-time fails
        }
      }

      // Append to event store
      const eventResult = await this.eventStore.appendEvent({
        type: command.type,
        data: command.serialize(),
        aggregateId: this.aggregateId,
        streamName: this.streamName,
        metadata: {
          sessionId: this.generateSessionId(),
          clientVersion: '1.0.0'
        }
      });

      if (!eventResult.success) {
        // Rollback optimistic update
        if (this.config.optimisticUpdates) {
          command.undo();
          this.removeFromHistory(command.id);
        }
        throw new Error(`Failed to append event: ${eventResult.error}`);
      }

      // Update state
      this.updateState({
        localVersion: eventResult.version,
        totalEvents: this.state.totalEvents + 1
      });

      // Notify changes
      this.notifyChange('COMMAND_EXECUTED', { command, eventResult });

      // Schedule auto-save
      this.scheduleAutoSave();

      return {
        success: true,
        command,
        metadata: { eventId: eventResult.eventId, version: eventResult.version }
      };

    } catch (error) {
      console.error('[EventManager] Command execution failed:', error);
      
      const commandError = error instanceof Error ? error : new Error('Unknown error');
      this.config.onError?.(commandError, 'COMMAND_EXECUTION');
      
      return {
        success: false,
        command,
        error: commandError
      };
    }
  }

  /**
   * Undo the last command
   */
  undo(): boolean {
    try {
      if (this.state.undoStack.length === 0) {
        console.warn('[EventManager] No commands to undo');
        return false;
      }

      const command = this.state.undoStack.pop()!;
      command.undo();
      
      this.state.redoStack.push(command);
      this.markAsDirty();
      
      this.notifyChange('COMMAND_UNDONE', { command });
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[EventManager] Command undone:', command.type);
      }
      
      return true;

    } catch (error) {
      console.error('[EventManager] Undo failed:', error);
      return false;
    }
  }

  /**
   * Redo the last undone command
   */
  redo(): boolean {
    try {
      if (this.state.redoStack.length === 0) {
        console.warn('[EventManager] No commands to redo');
        return false;
      }

      const command = this.state.redoStack.pop()!;
      if (command.redo) {
        command.redo();
      } else {
        command.execute();
      }
      
      this.state.undoStack.push(command);
      this.markAsDirty();
      
      this.notifyChange('COMMAND_REDONE', { command });
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[EventManager] Command redone:', command.type);
      }
      
      return true;

    } catch (error) {
      console.error('[EventManager] Redo failed:', error);
      return false;
    }
  }

  /**
   * Manual save to server
   */
  async saveManual(): Promise<void> {
    if (!this.state.isDirty) {
      console.log('[EventManager] No changes to save');
      return;
    }

    this.updateState({ isSaving: true });

    try {
      // Prepare data for API
      const saveData = this.formatDataForAPI(this.currentSnapshot);
      
      // Send to server using the correct PUT endpoint
      const encodedSlug = encodeURIComponent(this.config.novelSlug);
      const response = await fetch(`/api/novels/${encodedSlug}/storymap`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(this.state.etag && { 'If-Match': this.state.etag })
        },
        body: JSON.stringify(saveData)
      });

      if (!response.ok) {
        if (response.status === 409) {
          // Conflict detected
          await this.handleConflict(response);
          return;
        }
        throw new Error(`Save failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Update state
      this.updateState({
        isSaving: false,
        lastSaved: new Date(),
        isDirty: false,
        hasUnsavedChanges: false,
        serverVersion: result.version || this.state.serverVersion + 1,
        etag: result.etag
      });

      // Update original snapshot
      this.originalSnapshot = { ...this.currentSnapshot };
      
      this.config.onDirtyChange?.(false);
      this.notifyChange('MANUAL_SAVE_SUCCESS', { result });

      if (process.env.NODE_ENV === 'development') {
        console.log('[EventManager] Manual save successful:', {
          version: result.version,
          etag: result.etag
        });
      }

    } catch (error) {
      console.error('[EventManager] Manual save failed:', error);
      
      this.updateState({ 
        isSaving: false,
        lastError: error instanceof Error ? error.message : 'Save failed'
      });
      
      this.config.onError?.(error instanceof Error ? error : new Error('Save failed'), 'MANUAL_SAVE');
      throw error;
    }
  }

  /**
   * Initialize with data from server
   */
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
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[EventManager] Initialized with data:', {
        nodeCount: data.nodes.length,
        edgeCount: data.edges.length,
        variableCount: data.storyVariables.length
      });
    }
  }

  /**
   * Get current state
   */
  getState(): EventManagerState {
    return { ...this.state };
  }

  /**
   * Get current snapshot
   */
  getCurrentSnapshot(): SnapshotData {
    return { ...this.currentSnapshot };
  }

  /**
   * Get command context for external command creation
   */
  getCommandContext(): CommandContext {
    return this.commandContext;
  }

  /**
   * Check if there are unsaved changes
   */
  hasChanges(): boolean {
    return this.state.isDirty || this.state.hasUnsavedChanges;
  }

  /**
   * Destroy the event manager
   */
  destroy(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    // Disconnect real-time client
    if (this.realtimeClient) {
      this.realtimeClient.disconnect();
    }
    
    console.log('[EventManager] Destroyed');
  }

  // ===================================================================
  // Internal Methods
  // ===================================================================

  private createInitialState(): EventManagerState {
    return {
      commandHistory: [],
      undoStack: [],
      redoStack: [],
      isSaving: false,
      lastSaved: null,
      isDirty: false,
      hasUnsavedChanges: false,
      localVersion: 0,
      serverVersion: 0,
      isConflicted: false,
      pendingCommands: 0,
      totalEvents: 0,
      // Real-time collaboration
      isRealtimeConnected: false,
      collaborators: [],
      remoteCommandsReceived: 0
    };
  }

  private createEmptySnapshot(): SnapshotData {
    return {
      nodes: [],
      edges: [],
      storyVariables: [],
      timestamp: Date.now(),
      version: 0
    };
  }

  private validateCommand(command: Command): CommandValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!command.id) errors.push('Command must have an ID');
    if (!command.type) errors.push('Command must have a type');
    if (typeof command.execute !== 'function') errors.push('Command must have execute method');
    if (typeof command.undo !== 'function') errors.push('Command must have undo method');

    // Business logic validation can be added here

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private addToHistory(command: Command): void {
    this.state.undoStack.push(command);
    this.state.redoStack = []; // Clear redo stack
    this.state.commandHistory.push(command);

    // Limit history size
    if (this.state.undoStack.length > this.config.maxHistorySize) {
      this.state.undoStack.shift();
    }
    if (this.state.commandHistory.length > this.config.maxHistorySize) {
      this.state.commandHistory.shift();
    }
  }

  private removeFromHistory(commandId: string): void {
    this.state.undoStack = this.state.undoStack.filter(cmd => cmd.id !== commandId);
    this.state.commandHistory = this.state.commandHistory.filter(cmd => cmd.id !== commandId);
  }



  private scheduleAutoSave(): void {
    if (!this.config.autoSaveEnabled) return;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      if (this.state.isDirty && !this.state.isSaving) {
        this.saveManual().catch(error => {
          console.warn('[EventManager] Auto-save failed:', error);
        });
      }
    }, 2000); // 2 second debounce
  }

  private startAutoSave(): void {
    this.autoSaveTimer = setInterval(() => {
      if (this.state.isDirty && !this.state.isSaving) {
        this.scheduleAutoSave();
      }
    }, this.config.autoSaveIntervalMs);
  }

  private async handleConflict(response: Response): Promise<void> {
    console.warn('[EventManager] Conflict detected during save');
    
    this.updateState({ 
      isConflicted: true,
      lastError: 'Conflict detected - manual resolution required'
    });

    // In Phase 1, we'll just log the conflict
    // In Phase 2, we'll implement proper conflict resolution
    this.config.onError?.(new Error('Save conflict detected'), 'CONFLICT');
  }

  private formatDataForAPI(snapshot: SnapshotData): any {
    // Convert snapshot to API format with proper validation
    return {
      nodes: snapshot.nodes
        .filter(node => node.id) // Filter out nodes without IDs
        .map(node => ({
          nodeId: node.id,
          nodeType: node.type || 'unknown',
          title: node.data?.title || '',
          position: node.position || { x: 0, y: 0 },
          nodeSpecificData: node.data || {},
          editorVisuals: {
            color: node.style?.backgroundColor,
            orientation: node.data?.orientation || 'vertical'
          }
        })),
      edges: snapshot.edges
        .filter(edge => edge.id && edge.source && edge.target) // Filter out invalid edges
        .map(edge => ({
          edgeId: edge.id,
          sourceNodeId: edge.source,
          targetNodeId: edge.target,
          sourceHandleId: edge.sourceHandle || '',
          targetHandleId: edge.targetHandle || '',
          label: edge.label || '',
          editorVisuals: {
            color: edge.style?.stroke,
            animated: edge.animated || false
          }
        })),
      storyVariables: (snapshot.storyVariables || [])
        .filter(variable => variable && variable.variableId) // Filter out null/undefined variables and those without IDs
        .map(variable => ({
          variableId: variable.variableId,
          variableName: variable.variableName || '',
          dataType: variable.dataType || variable.variableType || 'string',
          initialValue: variable.initialValue !== undefined ? variable.initialValue : (variable.defaultValue !== undefined ? variable.defaultValue : ''),
          description: variable.description || '',
          isGlobal: variable.isGlobal !== undefined ? variable.isGlobal : true,
          isVisibleToPlayer: variable.isVisibleToPlayer || false
        })),
      version: this.state.localVersion // Include version for conflict detection
    };
  }



  public notifyChange(changeType: string, data: any): void {
    // Professional change notification
    if (process.env.NODE_ENV === 'development') {
      console.log(`[EventManager] Change notification:`, { changeType, data });
    }
  }

  private updateState(updates: Partial<EventManagerState>): void {
    this.state = { ...this.state, ...updates };
    
    // Use setTimeout to defer state changes to avoid React mount issues
    setTimeout(() => {
      try {
        this.config.onStateChange?.(this.state);
      } catch (error) {
        console.warn('[EventManager] State change callback deferred due to component lifecycle:', error instanceof Error ? error.message : String(error));
      }
      
      // Notify listeners
      this.stateUpdateListeners.forEach(listener => {
        try {
          listener(this.state);
        } catch (error) {
          console.error('[EventManager] State update listener error:', error);
        }
      });
    }, 0);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ===================================================================
  // Real-time Collaboration Methods
  // ===================================================================

  private async initializeRealtimeClient(): Promise<void> {
    if (!this.config.userId || !this.config.realtimeEnabled) return;

    try {
      this.realtimeClient = createRealtimeClient({
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
        timeout: 5000,
        transports: ['websocket', 'polling']
      });

      // Set up event handlers
      this.realtimeClient.on('onCommandReceived', (command: RealtimeCommand) => {
        this.handleRemoteCommand(command);
      });

      this.realtimeClient.on('onCollaboratorJoined', (collaborator) => {
        this.updateState({
          collaborators: [...this.state.collaborators, {
            userId: collaborator.userId,
            username: collaborator.username,
            isOnline: true,
            cursor: collaborator.cursor
          }]
        });
      });

      this.realtimeClient.on('onCollaboratorLeft', (collaborator) => {
        this.updateState({
          collaborators: this.state.collaborators.filter(c => c.userId !== collaborator.userId)
        });
      });

      this.realtimeClient.on('onConnectionStatusChange', (isConnected) => {
        this.updateState({ isRealtimeConnected: isConnected });
        if (isConnected) {
          console.log('[EventManager] Real-time connection restored');
        } else {
          console.log('[EventManager] Real-time connection lost, running in offline mode');
        }
      });

      this.realtimeClient.on('onCursorUpdate', (update) => {
        this.updateState({
          collaborators: this.state.collaborators.map(c => 
            c.userId === update.userId 
              ? { ...c, cursor: update.position }
              : c
          )
        });
      });

      this.realtimeClient.on('onError', (error) => {
        console.warn('[EventManager] Real-time error (non-fatal):', error.message || error);
        // Don't call onError callback for connection issues - they're not fatal
      });

      // Try to connect to story map (non-blocking)
      try {
        await this.realtimeClient.connect(this.aggregateId, this.config.userId);
        console.log('[EventManager] Real-time collaboration initialized successfully');
      } catch (connectionError) {
        console.log('[EventManager] Real-time connection failed, continuing in offline mode');
        this.updateState({ isRealtimeConnected: false });
      }

    } catch (error) {
      console.warn('[EventManager] Real-time initialization failed, continuing without real-time features:', error);
      this.updateState({ isRealtimeConnected: false });
      // Don't throw error - allow app to continue without real-time features
    }
  }

  private async handleRemoteCommand(realtimeCommand: RealtimeCommand): Promise<void> {
    try {
      // Prevent infinite loops
      this.isProcessingRemoteCommand = true;

      // Deserialize command (this would need to be implemented based on command types)
      const commandData = realtimeCommand.commandData;
      
      // For now, we'll apply the command data directly to the state
      // In a more sophisticated implementation, we'd recreate the Command object
      console.log('[EventManager] Received remote command:', commandData.type);

      // Apply remote command to local state
      // This is a simplified implementation - in practice you'd want to:
      // 1. Validate the command
      // 2. Check for conflicts with local changes
      // 3. Apply conflict resolution if needed
      // 4. Update the state accordingly

      this.updateState({
        remoteCommandsReceived: this.state.remoteCommandsReceived + 1
      });

      // Mark as dirty since we received changes
      this.markAsDirty();

    } catch (error) {
      console.error('[EventManager] Failed to handle remote command:', error);
    } finally {
      this.isProcessingRemoteCommand = false;
    }
  }

  /**
   * Update cursor position for real-time collaboration
   */
  async updateCursor(position: { x: number; y: number }): Promise<void> {
    if (this.realtimeClient) {
      try {
        await this.realtimeClient.updateCursor(position);
      } catch (error) {
        console.error('[EventManager] Failed to update cursor:', error);
      }
    }
  }

  /**
   * Update selection for real-time collaboration
   */
  async updateSelection(selectedNodes: string[], selectedEdges: string[]): Promise<void> {
    if (this.realtimeClient) {
      try {
        await this.realtimeClient.updateSelection(selectedNodes, selectedEdges);
      } catch (error) {
        console.error('[EventManager] Failed to update selection:', error);
      }
    }
  }

  /**
   * Get current collaborators
   */
  getCollaborators(): Array<{
    userId: string;
    username: string;
    isOnline: boolean;
    cursor?: { x: number; y: number };
  }> {
    return [...this.state.collaborators];
  }

  /**
   * Check if real-time collaboration is enabled and connected
   */
  isRealtimeConnected(): boolean {
    return this.state.isRealtimeConnected;
  }

  /**
   * Update snapshot data (for initial sync)
   */
  updateSnapshot(snapshotData: {
    nodes: any[];
    edges: any[];
    storyVariables: any[];
    timestamp: number;
    version: number;
  }): void {
    this.originalSnapshot = produce(snapshotData, draft => draft);
    this.currentSnapshot = produce(snapshotData, draft => draft);
    
    this.updateState({
      localVersion: snapshotData.version,
      isDirty: false,
      hasUnsavedChanges: false,
      lastSaved: new Date(snapshotData.timestamp)
    });
    
    this.config.onDirtyChange?.(false);
    console.log('[EventManager] Snapshot updated successfully');
  }

  /**
   * Update snapshot from ReactFlow state (for real-time sync)
   */
  updateSnapshotFromReactFlow(nodes: any[], edges: any[], storyVariables: any[]): void {
    this.currentSnapshot = {
      nodes: [...nodes],
      edges: [...edges],
      storyVariables: [...storyVariables],
      timestamp: Date.now(),
      version: this.state.localVersion
    };
    
    // Check if data has changed compared to original
    const hasChanges = this.hasSnapshotChanges();
    if (hasChanges && !this.state.isDirty) {
      this.markAsDirty();
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[EventManager] Snapshot updated from ReactFlow:', {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        variableCount: storyVariables.length,
        hasChanges
      });
    }
  }

  /**
   * Check if current snapshot has changes compared to original
   */
  private hasSnapshotChanges(): boolean {
    try {
      return JSON.stringify(this.currentSnapshot.nodes) !== JSON.stringify(this.originalSnapshot.nodes) ||
             JSON.stringify(this.currentSnapshot.edges) !== JSON.stringify(this.originalSnapshot.edges) ||
             JSON.stringify(this.currentSnapshot.storyVariables) !== JSON.stringify(this.originalSnapshot.storyVariables);
    } catch (error) {
      console.warn('[EventManager] Error comparing snapshots:', error);
      return false;
    }
  }




  /**
   * Mark as dirty (for compatibility with existing code)
   */
  markAsDirty(): void {
    this.updateState({
      isDirty: true,
      hasUnsavedChanges: true
    });
    this.config.onDirtyChange?.(true);
  }

  /**
   * Mark as saved (for compatibility with existing code)
   */
  markAsSaved(): void {
    this.updateState({
      isDirty: false,
      hasUnsavedChanges: false,
      lastSaved: new Date()
    });
    this.config.onDirtyChange?.(false);
  }

  /**
   * Check if data has changed (compatibility method)
   */
  checkIfDataChanged(currentData: any): boolean {
    return this.hasChanges();
  }

  /**
   * Update original data (compatibility method)
   */
  updateOriginalData(data: { nodes: any[]; edges: any[]; storyVariables: any[] }): void {
    const snapshotData = {
      ...data,
      timestamp: Date.now(),
      version: this.state.localVersion + 1
    };
    this.originalSnapshot = produce(snapshotData, draft => draft);
    this.updateState({
      isDirty: false,
      hasUnsavedChanges: false
    });
    this.config.onDirtyChange?.(false);
  }

  /**
   * Validate with database (placeholder for compatibility)
   */
  async validateWithDatabase(): Promise<void> {
    // In Phase 3, this would perform actual validation
    console.log('[EventManager] Database validation (placeholder)');
    return Promise.resolve();
  }

  /**
   * Save operation (compatibility with old SaveManager interface)
   */
  async saveOperation(operation: {
    type: string;
    data: any;
    strategy: 'immediate' | 'debounced';
  }): Promise<void> {
    console.log('[EventManager] Save operation triggered:', operation.type);
    
    // Convert old-style operation to command
    const command = {
      id: this.generateSessionId(),
      type: operation.type,
      payload: operation.data,
      timestamp: Date.now(),
      execute: () => {
        this.markAsDirty();
      },
      undo: () => {
        // Placeholder
      },
      serialize: () => ({
        id: this.generateSessionId(),
        type: operation.type,
        payload: operation.data,
        timestamp: Date.now()
      })
    };

    await this.executeCommand(command as any);
  }

  /**
   * Update dirty state only (compatibility method)
   */
  updateDirtyStateOnly(isDirty: boolean): void {
    this.updateState({
      isDirty,
      hasUnsavedChanges: isDirty
    });
    this.config.onDirtyChange?.(isDirty);
  }

  // ===================================================================
  // Public Utilities
  // ===================================================================

  /**
   * Subscribe to state updates
   */
  subscribeToState(listener: (state: EventManagerState) => void): () => void {
    this.stateUpdateListeners.push(listener);
    
    return () => {
      const index = this.stateUpdateListeners.indexOf(listener);
      if (index > -1) {
        this.stateUpdateListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get command history for debugging
   */
  getCommandHistory(): Command[] {
    return [...this.state.commandHistory];
  }

  /**
   * Get event store statistics
   */
  async getEventStoreStats(): Promise<any> {
    const streamInfo = await this.eventStore.getStreamInfo(this.streamName, this.aggregateId);
    return {
      streamInfo,
      commandHistory: this.state.commandHistory.length,
      undoStack: this.state.undoStack.length,
      redoStack: this.state.redoStack.length
    };
  }
}

// ===================================================================
// Factory Function
// ===================================================================

export function createEventManager(config: EventManagerConfig): EventManager {
  return new EventManager({
    ...config,
    maxHistorySize: config.maxHistorySize || 50,
    optimisticUpdates: config.optimisticUpdates !== undefined ? config.optimisticUpdates : true
  });
}
