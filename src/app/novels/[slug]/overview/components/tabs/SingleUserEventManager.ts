// src/app/novels/[slug]/overview/components/tabs/SingleUserEventManager.ts
// ===================================================================
// Simplified Event Manager for Single User Mode
// Optimized for Canva/Figma-like experience without real-time complexity
// ===================================================================

import { Command, CommandResult, CommandContext } from '@/lib/commands/Command';

export interface SingleUserConfig {
  novelSlug: string;
  selectedEpisodeId?: string | null; // 🆕 Episode-specific context
  autoSaveEnabled: boolean;
  autoSaveIntervalMs: number;
  maxHistorySize: number;
  onStateChange?: (state: SingleUserState) => void;
  onDirtyChange?: (isDirty: boolean) => void;
  onError?: (error: Error, context: string) => void;
  // 🎬 NEW: Unified Blueprint-Director Integration
  onSceneNodeSync?: (sceneId: string, nodeId: string) => void;
  onDirectorTabUpdate?: (scenes: any[]) => void;
  onBlueprintTabUpdate?: (nodes: any[], edges: any[]) => void;
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
  episodes?: any[]; // 🆕 PHASE 3: Episode data
  scenes?: any[]; // 🆕 UNIFIED STATE: Scene data for DirectorTab integration
  timestamp: number;
  version: number;
}

// 🆕 PHASE 3: Episode Command Interfaces
export interface EpisodeCommand extends Command {
  type: 'EPISODE_CREATE' | 'EPISODE_UPDATE' | 'EPISODE_DELETE' | 'EPISODE_MOVE' | 'EPISODE_REORDER';
  episodeId?: string;
  episodeData?: any;
  canvasPosition?: { x: number; y: number };
  undoData?: any;
  bulkData?: Array<{ episodeId: string; updates: any }>;
}

// 🆕 UNIFIED STATE: Scene Command Interfaces for DirectorTab integration
export interface SceneCommand extends Command {
  type: 'SCENE_CREATE' | 'SCENE_UPDATE' | 'SCENE_DELETE' | 'SCENE_TIMELINE_UPDATE' | 'SCENE_REORDER' | 'SCENE_NODE_SYNC_CREATE';
  sceneId?: string;
  sceneData?: any;
  timelineData?: any;
  undoData?: any;
  linkedNodeId?: string; // Link to blueprint node
  bulkData?: Array<{ sceneId: string; updates: any }>;
  // 🎬 NEW: Synchronized creation data
  nodeData?: any; // Blueprint node data for synchronized creation
  autoSync?: boolean; // Whether to automatically sync with blueprint
}

export interface EpisodeCommandResult extends CommandResult {
  episode?: any;
  episodes?: any[];
  updatedNodes?: any[];
  updatedEdges?: any[];
}

export interface SceneCommandResult extends CommandResult {
  scene?: any;
  scenes?: any[];
  linkedNode?: any;
  updatedNodes?: any[];
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

  // 🆕 PHASE 3: Episode Management Methods
  getCurrentEpisodes(): any[] {
    return this.eventManager.getCurrentSnapshot().episodes || [];
  }

  setEpisodes(episodes: any[]): void {
    this.eventManager.updateSnapshot({ 
      ...this.eventManager.getCurrentSnapshot(), 
      episodes,
      timestamp: Date.now()
    });
  }

  findEpisodeById(id: string): any | null {
    return this.getCurrentEpisodes().find(episode => episode._id === id) || null;
  }

  addEpisode(episode: any): void {
    const currentEpisodes = this.getCurrentEpisodes();
    const updatedEpisodes = [...currentEpisodes, episode].sort((a, b) => a.episodeOrder - b.episodeOrder);
    this.setEpisodes(updatedEpisodes);
  }

  updateEpisode(episodeId: string, updates: any): void {
    const currentEpisodes = this.getCurrentEpisodes();
    const updatedEpisodes = currentEpisodes.map(ep => 
      ep._id === episodeId ? { ...ep, ...updates } : ep
    );
    this.setEpisodes(updatedEpisodes);
  }

  removeEpisode(episodeId: string): void {
    const currentEpisodes = this.getCurrentEpisodes();
    const updatedEpisodes = currentEpisodes.filter(ep => ep._id !== episodeId);
    this.setEpisodes(updatedEpisodes);
  }

  // 🆕 UNIFIED STATE: Scene Management Methods
  getCurrentScenes(): any[] {
    return this.eventManager.getCurrentSnapshot().scenes || [];
  }

  setScenes(scenes: any[]): void {
    this.eventManager.updateSnapshot({ 
      ...this.eventManager.getCurrentSnapshot(), 
      scenes,
      timestamp: Date.now()
    });
  }

  findSceneById(id: string): any | null {
    return this.getCurrentScenes().find(scene => scene._id === id) || null;
  }

  addScene(scene: any): void {
    const currentScenes = this.getCurrentScenes();
    const updatedScenes = [...currentScenes, scene].sort((a, b) => a.sceneOrder - b.sceneOrder);
    this.setScenes(updatedScenes);
  }

  updateScene(sceneId: string, updates: any): void {
    const currentScenes = this.getCurrentScenes();
    const updatedScenes = currentScenes.map(scene => 
      scene._id === sceneId ? { ...scene, ...updates } : scene
    );
    this.setScenes(updatedScenes);
    
    // 🎯 UNIFIED STATE: Update linked blueprint node
    this.updateLinkedSceneNode(sceneId, updates);
  }

  removeScene(sceneId: string): void {
    const currentScenes = this.getCurrentScenes();
    const updatedScenes = currentScenes.filter(scene => scene._id !== sceneId);
    this.setScenes(updatedScenes);
  }

  // Link scene to blueprint node
  updateLinkedSceneNode(sceneId: string, sceneUpdates: any): void {
    const nodes = this.getCurrentNodes();
    const linkedNode = nodes.find(node => 
      node.data.nodeType === 'scene_node' && 
      node.data.nodeSpecificData?.sceneId === sceneId
    );
    
    if (linkedNode) {
      const updatedNodes = nodes.map(node => {
        if (node.id === linkedNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              sceneData: { ...node.data.sceneData, ...sceneUpdates },
              title: sceneUpdates.title || node.data.title
            }
          };
        }
        return node;
      });
      this.setNodes(updatedNodes);
    }
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

      // 🆕 PHASE 3: Handle Episode Commands
      if (this.isEpisodeCommand(command)) {
        return await this.executeEpisodeCommand(command as EpisodeCommand);
      }

      // 🆕 UNIFIED STATE: Handle Scene Commands
      if (this.isSceneCommand(command)) {
        return await this.executeSceneCommand(command as SceneCommand);
      }

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

  // 🆕 PHASE 3: Episode Command Handlers
  private isEpisodeCommand(command: Command): boolean {
    return command.type.startsWith('EPISODE_');
  }

  private isSceneCommand(command: Command): boolean {
    return command.type.startsWith('SCENE_');
  }

  private async executeEpisodeCommand(command: EpisodeCommand): Promise<EpisodeCommandResult> {
    try {
      console.log(`[SingleUserEventManager] 🎭 Executing Episode command: ${command.type}`);

      let result: EpisodeCommandResult;

      switch (command.type) {
        case 'EPISODE_CREATE':
          result = await this.handleEpisodeCreate(command);
          break;
        case 'EPISODE_UPDATE':
          result = await this.handleEpisodeUpdate(command);
          break;
        case 'EPISODE_DELETE':
          result = await this.handleEpisodeDelete(command);
          break;
        case 'EPISODE_MOVE':
          result = await this.handleEpisodeMove(command);
          break;
        case 'EPISODE_REORDER':
          result = await this.handleEpisodeReorder(command);
          break;
        default:
          throw new Error(`Unknown episode command: ${command.type}`);
      }

      // Add to history if undoable
      if (this.isUndoableCommand(command)) {
        this.addToHistory(command);
        this.state.redoStack = [];
      }

      // Mark as dirty for content commands
      if (this.isContentCommand(command)) {
        this.markAsDirty();
      }

      // Update state
      this.updateState({
        totalEvents: this.state.totalEvents + 1
      });

      console.log(`[SingleUserEventManager] ✅ Episode command completed: ${command.type}`);
      return result;

    } catch (error) {
      console.error(`[SingleUserEventManager] ❌ Episode command failed: ${command.type}`, error);
      throw error;
    }
  }

  // 🆕 UNIFIED STATE: Scene Command Execution
  private async executeSceneCommand(command: SceneCommand): Promise<SceneCommandResult> {
    try {
      console.log(`[SingleUserEventManager] 🎬 Executing Scene command: ${command.type}`);

      let result: SceneCommandResult;

      switch (command.type) {
        case 'SCENE_CREATE':
          result = await this.handleSceneCreate(command);
          break;
        case 'SCENE_UPDATE':
          result = await this.handleSceneUpdate(command);
          break;
        case 'SCENE_DELETE':
          result = await this.handleSceneDelete(command);
          break;
        case 'SCENE_TIMELINE_UPDATE':
          result = await this.handleSceneTimelineUpdate(command);
          break;
        case 'SCENE_REORDER':
          result = await this.handleSceneReorder(command);
          break;
        case 'SCENE_NODE_SYNC_CREATE':
          result = await this.handleSceneNodeSyncCreate(command);
          break;
        default:
          throw new Error(`Unknown scene command: ${command.type}`);
      }

      // Add to history if undoable
      if (this.isUndoableCommand(command)) {
        this.addToHistory(command);
        this.state.redoStack = [];
      }

      // Mark as dirty for content commands
      if (this.isContentCommand(command)) {
        this.markAsDirty();
      }

      // Update state
      this.updateState({
        totalEvents: this.state.totalEvents + 1
      });

      return result;
    } catch (error) {
      console.error(`[SingleUserEventManager] ❌ Scene command failed: ${command.type}`, error);
      throw error;
    }
  }

  private async handleEpisodeCreate(command: EpisodeCommand): Promise<EpisodeCommandResult> {
    const { episodeData, canvasPosition } = command;
    
    if (!episodeData) {
      throw new Error('Episode data is required for create command');
    }

    // Add episode to snapshot
    const context = this.commandContext as SingleUserCommandContext;
    context.addEpisode(episodeData);

    // Create corresponding node if canvas position provided
    if (canvasPosition) {
      const newNode = {
        id: `episode_${episodeData._id}`,
        type: 'episode',
        position: canvasPosition,
        data: {
          ...episodeData,
          episodeId: episodeData._id,
          nodeType: 'episode_node',
          title: episodeData.title,
          status: episodeData.status
        }
      };

      const currentNodes = context.getCurrentNodes();
      context.setNodes([...currentNodes, newNode]);
    }

    return {
      success: true,
      command,
      episode: episodeData,
      metadata: { timestamp: Date.now() }
    };
  }

  private async handleEpisodeUpdate(command: EpisodeCommand): Promise<EpisodeCommandResult> {
    const { episodeId, episodeData } = command;
    
    if (!episodeId || !episodeData) {
      throw new Error('Episode ID and data are required for update command');
    }

    const context = this.commandContext as SingleUserCommandContext;
    
    // Store undo data
    const originalEpisode = context.findEpisodeById(episodeId);
    command.undoData = originalEpisode;

    // Update episode
    context.updateEpisode(episodeId, episodeData);

    // Update corresponding node
    const currentNodes = context.getCurrentNodes();
    const updatedNodes = currentNodes.map(node => 
      node.data?.episodeId === episodeId 
        ? { 
            ...node, 
            data: { ...node.data, ...episodeData },
            position: episodeData.canvasPosition || node.position
          }
        : node
    );
    context.setNodes(updatedNodes);

    return {
      success: true,
      command,
      episode: { ...originalEpisode, ...episodeData },
      updatedNodes,
      metadata: { timestamp: Date.now() }
    };
  }

  private async handleEpisodeDelete(command: EpisodeCommand): Promise<EpisodeCommandResult> {
    const { episodeId } = command;
    
    if (!episodeId) {
      throw new Error('Episode ID is required for delete command');
    }

    const context = this.commandContext as SingleUserCommandContext;
    
    // Store undo data
    const episodeToDelete = context.findEpisodeById(episodeId);
    command.undoData = episodeToDelete;

    // Remove episode
    context.removeEpisode(episodeId);

    // Remove corresponding node and edges
    const currentNodes = context.getCurrentNodes();
    const currentEdges = context.getCurrentEdges();
    
    const updatedNodes = currentNodes.filter(node => node.data?.episodeId !== episodeId);
    const updatedEdges = currentEdges.filter(edge => 
      !currentNodes.some(node => 
        node.data?.episodeId === episodeId && 
        (edge.source === node.id || edge.target === node.id)
      )
    );

    context.setNodes(updatedNodes);
    context.setEdges(updatedEdges);

    return {
      success: true,
      command,
      episode: episodeToDelete,
      updatedNodes,
      updatedEdges,
      metadata: { timestamp: Date.now() }
    };
  }

  private async handleEpisodeMove(command: EpisodeCommand): Promise<EpisodeCommandResult> {
    const { episodeId, canvasPosition } = command;
    
    if (!episodeId || !canvasPosition) {
      throw new Error('Episode ID and canvas position are required for move command');
    }

    const context = this.commandContext as SingleUserCommandContext;
    
    // Update episode canvas position
    context.updateEpisode(episodeId, { 
      'blueprintMetadata.canvasPosition': canvasPosition,
      'blueprintMetadata.lastCanvasUpdate': new Date(),
      'blueprintMetadata.version': Date.now()
    });

    // Update corresponding node position
    const currentNodes = context.getCurrentNodes();
    const updatedNodes = currentNodes.map(node => 
      node.data?.episodeId === episodeId 
        ? { ...node, position: canvasPosition }
        : node
    );
    context.setNodes(updatedNodes);

    return {
      success: true,
      command,
      updatedNodes,
      metadata: { timestamp: Date.now() }
    };
  }

  private async handleEpisodeReorder(command: EpisodeCommand): Promise<EpisodeCommandResult> {
    const { bulkData } = command;
    
    if (!bulkData || bulkData.length === 0) {
      throw new Error('Bulk data is required for reorder command');
    }

    const context = this.commandContext as SingleUserCommandContext;
    const currentEpisodes = context.getCurrentEpisodes();
    
    // Store undo data
    command.undoData = currentEpisodes.map(ep => ({ episodeId: ep._id, episodeOrder: ep.episodeOrder }));

    // Update episode orders
    const updatedEpisodes = currentEpisodes.map(episode => {
      const updateData = bulkData.find(item => item.episodeId === episode._id);
      return updateData ? { ...episode, ...updateData.updates } : episode;
    }).sort((a, b) => a.episodeOrder - b.episodeOrder);

    context.setEpisodes(updatedEpisodes);

    return {
      success: true,
      command,
      episodes: updatedEpisodes,
      metadata: { timestamp: Date.now() }
    };
  }

  // 🆕 UNIFIED STATE: Scene Command Handlers
  private async handleSceneCreate(command: SceneCommand): Promise<SceneCommandResult> {
    const { sceneData, linkedNodeId } = command;
    
    if (!sceneData) {
      throw new Error('Scene data is required for create command');
    }

    const context = this.commandContext as SingleUserCommandContext;
    const newScene = {
      ...sceneData,
      _id: sceneData._id || `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    context.addScene(newScene);

    // Link to blueprint node if specified
    if (linkedNodeId) {
      const nodes = context.getCurrentNodes();
      const linkedNode = nodes.find(node => node.id === linkedNodeId);
      if (linkedNode) {
        const updatedNodes = nodes.map(node => {
          if (node.id === linkedNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                nodeSpecificData: {
                  ...node.data.nodeSpecificData,
                  sceneId: newScene._id
                },
                sceneData: newScene
              }
            };
          }
          return node;
        });
        context.setNodes(updatedNodes);
      }
    }

    return {
      success: true,
      command,
      scene: newScene,
      linkedNode: linkedNodeId,
      metadata: { timestamp: Date.now() }
    };
  }

  private async handleSceneUpdate(command: SceneCommand): Promise<SceneCommandResult> {
    const { sceneId, sceneData } = command;
    
    if (!sceneId || !sceneData) {
      throw new Error('Scene ID and data are required for update command');
    }

    const context = this.commandContext as SingleUserCommandContext;
    const existingScene = context.findSceneById(sceneId);
    
    if (!existingScene) {
      throw new Error(`Scene not found: ${sceneId}`);
    }

    // Store undo data
    command.undoData = { ...existingScene };

    // Update scene (this also updates linked blueprint node)
    context.updateScene(sceneId, { ...sceneData, updatedAt: new Date() });

    const updatedScene = context.findSceneById(sceneId);

    return {
      success: true,
      command,
      scene: updatedScene,
      metadata: { timestamp: Date.now() }
    };
  }

  private async handleSceneDelete(command: SceneCommand): Promise<SceneCommandResult> {
    const { sceneId } = command;
    
    if (!sceneId) {
      throw new Error('Scene ID is required for delete command');
    }

    const context = this.commandContext as SingleUserCommandContext;
    const existingScene = context.findSceneById(sceneId);
    
    if (!existingScene) {
      throw new Error(`Scene not found: ${sceneId}`);
    }

    // Store undo data
    command.undoData = { ...existingScene };

    // Remove scene
    context.removeScene(sceneId);

    // Update linked blueprint node
    const nodes = context.getCurrentNodes();
    const linkedNode = nodes.find(node => 
      node.data.nodeType === 'scene_node' && 
      node.data.nodeSpecificData?.sceneId === sceneId
    );

    if (linkedNode) {
      const updatedNodes = nodes.map(node => {
        if (node.id === linkedNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              nodeSpecificData: {
                ...node.data.nodeSpecificData,
                sceneId: null
              },
              sceneData: null
            }
          };
        }
        return node;
      });
      context.setNodes(updatedNodes);
    }

    return {
      success: true,
      command,
      scene: existingScene,
      metadata: { timestamp: Date.now() }
    };
  }

  private async handleSceneTimelineUpdate(command: SceneCommand): Promise<SceneCommandResult> {
    const { sceneId, timelineData } = command;
    
    if (!sceneId || !timelineData) {
      throw new Error('Scene ID and timeline data are required for timeline update command');
    }

    const context = this.commandContext as SingleUserCommandContext;
    const existingScene = context.findSceneById(sceneId);
    
    if (!existingScene) {
      throw new Error(`Scene not found: ${sceneId}`);
    }

    // Store undo data
    command.undoData = { timeline: existingScene.timeline };

    // Update scene timeline
    context.updateScene(sceneId, { 
      timeline: timelineData,
      updatedAt: new Date()
    });

    const updatedScene = context.findSceneById(sceneId);

    return {
      success: true,
      command,
      scene: updatedScene,
      metadata: { timestamp: Date.now() }
    };
  }

  private async handleSceneReorder(command: SceneCommand): Promise<SceneCommandResult> {
    const { bulkData } = command;
    
    if (!bulkData || bulkData.length === 0) {
      throw new Error('Bulk data is required for reorder command');
    }

    const context = this.commandContext as SingleUserCommandContext;
    const currentScenes = context.getCurrentScenes();
    
    // Store undo data
    command.undoData = currentScenes.map(scene => ({ sceneId: scene._id, sceneOrder: scene.sceneOrder }));

    // Update scene orders
    const updatedScenes = currentScenes.map(scene => {
      const updateData = bulkData.find(item => item.sceneId === scene._id);
      return updateData ? { ...scene, ...updateData.updates } : scene;
    }).sort((a, b) => a.sceneOrder - b.sceneOrder);

    context.setScenes(updatedScenes);

    return {
      success: true,
      command,
      scenes: updatedScenes,
      metadata: { timestamp: Date.now() }
    };
  }

  // 🎬 NEW: Handle synchronized scene-node creation
  private async handleSceneNodeSyncCreate(command: SceneCommand): Promise<SceneCommandResult> {
    const { sceneData, nodeData, linkedNodeId } = command;

    if (!sceneData || !nodeData || !linkedNodeId) {
      throw new Error('Scene data, node data, and linked node ID are required for synchronized creation');
    }

    const context = this.commandContext as SingleUserCommandContext;

    // Create scene with linked node reference
    const newScene = {
      _id: sceneData._id || `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: sceneData.title || nodeData.title || 'New Scene',
      description: sceneData.description || nodeData.notesForAuthor || '',
      linkedNodeId: linkedNodeId,
      nodeType: nodeData.nodeType,
      sceneOrder: sceneData.sceneOrder || context.getCurrentScenes().length,
      estimatedTimelineDurationMs: 30000,
      background: sceneData.background || { type: 'color', value: '#1a1a1a' },
      timelineTracks: [],
      storyVariables: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...sceneData
    };

    // Add scene
    context.addScene(newScene);

    // Update linked node to reference the scene
    context.updateLinkedSceneNode(newScene._id, newScene);

    // Store undo data
    command.undoData = { sceneId: newScene._id, linkedNodeId };

    // Notify callbacks
    if (this.config.onSceneNodeSync) {
      this.config.onSceneNodeSync(newScene._id, linkedNodeId);
    }

    if (this.config.onDirectorTabUpdate) {
      this.config.onDirectorTabUpdate(context.getCurrentScenes());
    }

    if (this.config.onBlueprintTabUpdate) {
      this.config.onBlueprintTabUpdate(context.getCurrentNodes(), context.getCurrentEdges());
    }

    return {
      success: true,
      command,
      scene: newScene,
      scenes: context.getCurrentScenes(),
      linkedNode: context.findNodeById(linkedNodeId),
      updatedNodes: context.getCurrentNodes(),
      metadata: { timestamp: Date.now() }
    };
  }

  // ตรวจสอบว่า command สามารถ undo ได้หรือไม่ (เหมือน Canva/Figma)
  private isUndoableCommand(command: Command): boolean {
    const undoableTypes = [
      'ADD_NODE', 'DELETE_NODE', 'UPDATE_NODE', 'MOVE_NODE', 'RESIZE_NODE',
      'ADD_EDGE', 'DELETE_EDGE', 'UPDATE_EDGE',
      'ADD_VARIABLE', 'DELETE_VARIABLE', 'UPDATE_VARIABLE',
      'BATCH_OPERATION', 'COPY_NODES', 'PASTE_NODES',
      // 🆕 PHASE 3: Episode commands
      'EPISODE_CREATE', 'EPISODE_UPDATE', 'EPISODE_DELETE', 'EPISODE_MOVE', 'EPISODE_REORDER',
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
      // 🆕 PHASE 3: Episode Content Changes (Database)
      'EPISODE_CREATE', 'EPISODE_UPDATE', 'EPISODE_DELETE', 'EPISODE_MOVE', 'EPISODE_REORDER',
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
      const cleanedNodes = nodes.map(node => {
        // 🔥 CRITICAL FIX: Extract nodeType properly from node.data.nodeType (ReactFlow format)
        const nodeType = node.data?.nodeType || node.nodeType || node.type || 'scene_node';
        
        return {
          nodeId: node.id || node.nodeId,
          nodeType: nodeType,
          title: node.data?.title || node.title || 'Untitled Node',
          position: { 
            x: Math.round(node.position?.x || 0), 
            y: Math.round(node.position?.y || 0)
          },
          nodeSpecificData: node.data?.nodeSpecificData || {},
          notesForAuthor: node.data?.notesForAuthor || '',
          authorDefinedEmotionTags: node.data?.authorDefinedEmotionTags || [],
          editorVisuals: {
            color: node.data?.editorVisuals?.color || node.data?.color || '#3b82f6',
            orientation: node.data?.editorVisuals?.orientation || node.data?.orientation || 'vertical',
            icon: node.data?.editorVisuals?.icon || 'circle',
            borderStyle: node.data?.editorVisuals?.borderStyle || 'solid'
          }
        };
      });

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

      // 🔥 CRITICAL FIX: Enhanced storyVariables cleaning to completely prevent duplicates
      const usedVariableIds = new Set<string>(); // Track used IDs to prevent duplicates
      const timestamp = Date.now();
      const sessionId = Math.random().toString(36).substr(2, 12); // Unique session ID
      
      console.log(`[SingleUserEventManager] 🧹 Starting variable cleaning process:`, {
        originalCount: storyVariables.length,
        timestamp,
        sessionId
      });
      
      // 🎯 STEP 0: If no story variables, return empty array immediately
      if (!storyVariables || storyVariables.length === 0) {
        console.log('[SingleUserEventManager] ✅ No story variables to clean, using empty array');
        const saveData = {
          nodes: cleanedNodes,
          edges: cleanedEdges,
          storyVariables: [], // Empty array is safe
          version: this.state.localVersion
        };

        // Continue to save with empty variables array
        const saveFunction = async (data: any) => {
          const encodedSlug = encodeURIComponent(this.config.novelSlug);
          const isEpisodeSpecific = !!this.config.selectedEpisodeId;
          
          // ✅ CRITICAL FIX: Comprehensive episodeId validation before constructing URL
          if (isEpisodeSpecific) {
            const episodeId = this.config.selectedEpisodeId;
            
            // Check for invalid values
            if (!episodeId || 
                episodeId === 'null' || 
                episodeId === 'undefined' ||
                episodeId.length !== 24 ||
                !/^[0-9a-fA-F]{24}$/.test(episodeId)
            ) {
              console.error('[SingleUserEventManager] ❌ Invalid episodeId detected during save:', {
                selectedEpisodeId: episodeId,
                type: typeof episodeId,
                length: episodeId?.length,
                isHex: episodeId ? /^[0-9a-fA-F]+$/.test(episodeId) : false,
                novelSlug: this.config.novelSlug,
                isEpisodeSpecific
              });
              
              throw new Error(
                `❌ รหัสตอนไม่ถูกต้อง (${episodeId})\n\n` +
                `กรุณา:\n` +
                `1. เลือกตอนใหม่อีกครั้ง หรือ\n` +
                `2. Refresh หน้าเว็บ หรือ\n` +
                `3. สลับไปยัง Main Story Mode`
              );
            }
          }
          
          const apiUrl = isEpisodeSpecific 
            ? `/api/novels/${encodedSlug}/episodes/${this.config.selectedEpisodeId}/storymap/save`
            : `/api/novels/${encodedSlug}/storymap`;
          
          console.log('[SingleUserEventManager] 📤 Saving to API:', {
            url: apiUrl,
            isEpisodeSpecific,
            episodeId: this.config.selectedEpisodeId,
            episodeIdValid: this.config.selectedEpisodeId ? /^[0-9a-fA-F]{24}$/.test(this.config.selectedEpisodeId) : null,
            nodeCount: data.nodes?.length || 0,
            edgeCount: data.edges?.length || 0,
            variableCount: data.storyVariables?.length || 0
          });
          
          const response = await fetch(apiUrl, {
            method: isEpisodeSpecific ? 'POST' : 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Idempotency-Key': `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            },
            body: JSON.stringify(data)
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[SingleUserEventManager] ❌ Server error:', {
              status: response.status,
              statusText: response.statusText,
              error: errorData,
              episodeId: this.config.selectedEpisodeId,
              url: apiUrl
            });
            
            // 🔥 ENHANCED: Provide user-friendly error messages
            let userMessage = errorData.error || 'Unknown error';
            if (response.status === 404) {
              userMessage = isEpisodeSpecific 
                ? `ไม่พบตอนที่เลือก (ID: ${this.config.selectedEpisodeId}). กรุณา refresh หน้าเว็บหรือเลือกตอนใหม่`
                : 'ไม่พบ Story Map. กรุณา refresh หน้าเว็บ';
            } else if (response.status === 403) {
              userMessage = 'คุณไม่มีสิทธิ์บันทึกข้อมูลนี้';
            } else if (response.status === 409) {
              userMessage = 'เกิด conflict ระหว่างการบันทึก กรุณาลองใหม่อีกครั้ง';
            }
            
            throw new Error(`Save failed: ${response.status} - ${userMessage}`);
          }

          return response.json();
        };

        const result = await this.saveDebouncer.performSave(saveData, saveFunction);
        const newVersion = result.newVersion || result.storyMap?.version || result.version || (this.state.serverVersion + 1);
        
        this.originalSnapshot = { 
          ...this.currentSnapshot,
          version: newVersion,
          timestamp: Date.now()
        };
        
        this.updateState({
          isSaving: false,
          lastSaved: new Date(),
          isDirty: false,
          hasUnsavedChanges: false,
          localVersion: newVersion,
          serverVersion: newVersion,
          lastError: undefined
        });

        this.state.undoStack = [];
        this.state.redoStack = [];
        this.config.onStateChange?.(this.state);
        this.config.onDirtyChange?.(false);

        if (typeof window !== 'undefined') {
          const now = Date.now();
          localStorage.setItem('divwy-last-saved', now.toString());
          localStorage.setItem('divwy-has-unsaved-changes', 'false');
          localStorage.setItem('divwy-content-changes', 'false');
          localStorage.setItem('divwy-command-has-changes', 'false');
          localStorage.removeItem('divwy-last-change');
          localStorage.removeItem('divwy-last-content-change');
          localStorage.removeItem('divwy-auto-save-active');
          localStorage.setItem('divwy-last-auto-save', now.toString());
        }

        console.log('[SingleUserEventManager] ✅ Save completed (empty variables array)');
        return;
      }
      
      // 🎯 STEP 1: Filter out invalid variables completely
      const validVariables = storyVariables.filter(variable => {
        if (!variable) {
          console.warn('[SingleUserEventManager] 🚨 Filtered null/undefined variable');
          return false;
        }
        if (!variable.variableName && !variable.name) {
          console.warn('[SingleUserEventManager] 🚨 Filtered variable without name:', variable);
          return false;
        }
        // 🔥 CRITICAL: Filter out variables with null/undefined/empty variableId that cause duplicates
        if (variable.variableId === null || variable.variableId === undefined || variable.variableId === '' || variable.variableId === 'null' || variable.variableId === 'undefined') {
          console.warn('[SingleUserEventManager] 🚨 Filtered variable with invalid ID:', {
            id: variable.variableId,
            name: variable.variableName || variable.name
          });
          return false; // Skip these problematic variables entirely
        }
        return true;
      });
      
      // 🎯 STEP 2: Clean and deduplicate remaining variables
      const cleanedStoryVariables = validVariables
        .map((variable, index) => {
          // 🔥 ENHANCED: Create absolutely unique variableId
          const baseId = variable.variableId && 
                         variable.variableId !== null && 
                         variable.variableId !== 'null' && 
                         variable.variableId !== 'undefined'
            ? variable.variableId 
            : null;

          let uniqueId;
          if (baseId && !usedVariableIds.has(baseId)) {
            uniqueId = baseId; // Use existing ID if it's unique
          } else {
            // Generate new unique ID with enhanced randomness
            const randomSuffix = Math.random().toString(36).substr(2, 9);
            const indexSuffix = index.toString().padStart(3, '0');
            uniqueId = `var_${timestamp}_${sessionId}_${indexSuffix}_${randomSuffix}`;
          }

          // 🔥 CRITICAL: Ensure absolute uniqueness with collision detection
          let counter = 0;
          const originalId = uniqueId;
          while (usedVariableIds.has(uniqueId)) {
            counter++;
            uniqueId = `${originalId}_${counter}`;
            
            // Safety break to prevent infinite loop
            if (counter > 1000) {
              uniqueId = `var_emergency_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
              break;
            }
          }
          
          usedVariableIds.add(uniqueId);

          return {
            variableId: uniqueId,
            variableName: variable.variableName || variable.name || `Variable_${index + 1}`,
            dataType: variable.dataType || variable.variableType || 'string',
            initialValue: variable.initialValue !== undefined ? variable.initialValue : '',
            description: variable.description || '',
            isGlobal: variable.isGlobal !== undefined ? variable.isGlobal : true,
            isVisibleToPlayer: variable.isVisibleToPlayer || false
          };
        })
        .filter(variable => {
          // 🔥 FINAL CHECK: ตรวจสอบว่า variableId ไม่เป็น null หรือ undefined
          if (!variable.variableId || variable.variableId === null || variable.variableId === 'null' || variable.variableId === 'undefined') {
            console.warn(`[SingleUserEventManager] 🚨 Removing variable with null/invalid ID:`, variable);
            return false;
          }
          return true;
        })
        .filter((variable, index, array) => {
          // 🔥 FINAL DEDUPLICATION: Remove duplicates by variableId (keep first occurrence)
          const firstIndex = array.findIndex(v => v.variableId === variable.variableId);
          if (firstIndex !== index) {
            console.warn(`[SingleUserEventManager] 🔄 Removing duplicate variable:`, variable.variableId);
            return false;
          }
          return true;
        });

      console.log(`[SingleUserEventManager] ✅ Variable cleaning completed:`, {
        originalCount: storyVariables.length,
        validCount: validVariables.length,
        finalCount: cleanedStoryVariables.length,
        finalVariables: cleanedStoryVariables.map(v => ({ id: v.variableId, name: v.variableName }))
      });

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
        version: saveData.version,
        isEpisodeSpecific: !!this.config.selectedEpisodeId,
        episodeId: this.config.selectedEpisodeId,
        storyVariableIds: saveData.storyVariables.map(v => v.variableId),
        duplicateVariableIds: saveData.storyVariables.filter((v, i, arr) => 
          arr.findIndex(x => x.variableId === v.variableId) !== i
        ).map(v => v.variableId)
      });
      
      // 🔥 ADOBE/FIGMA STYLE: Use SaveDebouncer to prevent duplicate saves
      const saveFunction = async (data: any) => {
        const encodedSlug = encodeURIComponent(this.config.novelSlug);
        const isEpisodeSpecific = !!this.config.selectedEpisodeId;
        
        // ✅ CRITICAL FIX: Comprehensive episodeId validation before constructing URL
        if (isEpisodeSpecific) {
          const episodeId = this.config.selectedEpisodeId;
          
          // Check for invalid values
          if (!episodeId || 
              episodeId === 'null' || 
              episodeId === 'undefined' ||
              episodeId.length !== 24 ||
              !/^[0-9a-fA-F]{24}$/.test(episodeId)
          ) {
            console.error('[SingleUserEventManager] ❌ Invalid episodeId detected during auto-save:', {
              selectedEpisodeId: episodeId,
              type: typeof episodeId,
              length: episodeId?.length,
              isHex: episodeId ? /^[0-9a-fA-F]+$/.test(episodeId) : false,
              novelSlug: this.config.novelSlug,
              isEpisodeSpecific
            });
            
            throw new Error(
              `❌ รหัสตอนไม่ถูกต้อง (${episodeId})\n\n` +
              `กรุณา:\n` +
              `1. เลือกตอนใหม่อีกครั้ง หรือ\n` +
              `2. Refresh หน้าเว็บ หรือ\n` +
              `3. สลับไปยัง Main Story Mode`
            );
          }
        }
        
        const apiUrl = isEpisodeSpecific 
          ? `/api/novels/${encodedSlug}/episodes/${this.config.selectedEpisodeId}/storymap/save`
          : `/api/novels/${encodedSlug}/storymap`;
        
        console.log('[SingleUserEventManager] 📤 Saving to API (auto-save):', {
          url: apiUrl,
          isEpisodeSpecific,
          episodeId: this.config.selectedEpisodeId,
          episodeIdValid: this.config.selectedEpisodeId ? /^[0-9a-fA-F]{24}$/.test(this.config.selectedEpisodeId) : null,
          nodeCount: data.nodes?.length || 0,
          edgeCount: data.edges?.length || 0,
          variableCount: data.storyVariables?.length || 0
        });
        
        const response = await fetch(apiUrl, {
          method: isEpisodeSpecific ? 'POST' : 'PUT', // Episode API uses POST, Novel API uses PUT
          headers: {
            'Content-Type': 'application/json',
            'X-Idempotency-Key': `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
            if (errorData.message) {
              errorDetail = ` - ${errorData.message}`;
            } else if (errorData.details) {
              errorDetail = ` - ${errorData.details}`;
            }
            
            // 🔥 ENHANCED: Provide user-friendly error messages based on status code
            if (response.status === 404) {
              errorMessage = isEpisodeSpecific 
                ? `ไม่พบตอนที่เลือก (ID: ${this.config.selectedEpisodeId}). กรุณา refresh หน้าเว็บหรือเลือกตอนใหม่`
                : 'ไม่พบ Story Map. กรุณา refresh หน้าเว็บ';
            } else if (response.status === 403) {
              errorMessage = 'คุณไม่มีสิทธิ์บันทึกข้อมูลนี้';
            } else if (response.status === 409) {
              errorMessage = 'เกิด conflict ระหว่างการบันทึก กรุณาลองใหม่อีกครั้ง';
            }
            
            // 🔥 CRITICAL FIX: Handle specific error types with better error messages
            if (errorData.message && errorData.message.includes('E11000') && errorData.message.includes('storyVariables.variableId')) {
              errorMessage = 'Save failed: Duplicate story variable detected';
              errorDetail = ' - The system will automatically fix this on retry';
              
              // 🔥 PROFESSIONAL: Log the error but don't auto-retry to prevent infinite loops
              console.log('[SingleUserEventManager] 🚨 Duplicate variable error - enhanced cleaning should prevent this');
              console.error('[SingleUserEventManager] 📊 Debug info:', {
                cleanedVariablesCount: cleanedStoryVariables.length,
                cleanedVariables: cleanedStoryVariables.map(v => ({ id: v.variableId, name: v.variableName })),
                serverError: errorData
              });
              
              // Throw error with user-friendly message for auto-retry case
              throw new Error(errorMessage + errorDetail);
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
      
      // 🔥 CRITICAL FIX: Handle different API response formats with null safety
      if (!result) {
        throw new Error('Save failed: No response from server');
      }
      
      const newVersion = result.newVersion || result.storyMap?.version || result.version || (this.state.serverVersion + 1);
      
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

  initializeWithData(data: { nodes: any[]; edges: any[]; storyVariables: any[]; episodes?: any[]; scenes?: any[] }): void {
    const snapshot: SnapshotData = {
      ...data,
      episodes: data.episodes || [], // 🆕 PHASE 3: Initialize episodes
      scenes: data.scenes || [], // 🆕 UNIFIED STATE: Initialize scenes
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

  // ✅ NEW: Get current config (for validation purposes)
  getConfig(): Readonly<SingleUserConfig> {
    return { ...this.config };
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
    const oldEpisodeId = this.config.selectedEpisodeId;
    
    // ✅ PROFESSIONAL: Validate episodeId before updating
    if ('selectedEpisodeId' in newConfig) {
      const episodeId = newConfig.selectedEpisodeId;
      
      // Validate format (MongoDB ObjectId must be 24 hex characters)
      if (episodeId && typeof episodeId === 'string') {
        if (episodeId === 'null' || episodeId === 'undefined') {
          console.error('[SingleUserEventManager] ❌ Invalid episodeId string:', episodeId);
          throw new Error('Invalid episodeId: cannot be string "null" or "undefined"');
        }
        
        if (episodeId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(episodeId)) {
          console.error('[SingleUserEventManager] ❌ Invalid ObjectId format:', {
            episodeId,
            length: episodeId.length,
            expected: 24,
            isHex: /^[0-9a-fA-F]+$/.test(episodeId)
          });
          throw new Error(`Invalid episodeId format: must be 24-character hex string (got: "${episodeId}" with ${episodeId.length} chars)`);
        }
      }
      
      console.log('[SingleUserEventManager] ✅ Valid episodeId, updating config:', {
        oldEpisodeId,
        newEpisodeId: episodeId
      });
    }
    
    // Update configuration
    this.config = { ...this.config, ...newConfig };
    
    // 🎯 Handle episode context changes
    if (newConfig.selectedEpisodeId !== oldEpisodeId) {
      console.log('[SingleUserEventManager] 🎭 Episode context changed:', {
        from: oldEpisodeId,
        to: newConfig.selectedEpisodeId,
        isEpisodeSpecific: !!newConfig.selectedEpisodeId
      });
      
      // Reset save state for new episode context
      this.updateState({
        isDirty: false,
        hasUnsavedChanges: false,
        lastSaved: null
      });
      
      // Clear command history when switching episodes
      this.state.undoStack = [];
      this.state.redoStack = [];
    }
    
    // Handle auto-save timer changes dynamically
    if (newConfig.autoSaveEnabled !== undefined || newConfig.autoSaveIntervalMs !== undefined) {
      this.stopAutoSave(); // Stop existing timer
      
      if (this.config.autoSaveEnabled) {
        this.startAutoSave(); // Start with new config
        console.log('[SingleUserEventManager] ✅ Auto-save restarted with new config:', {
          enabled: this.config.autoSaveEnabled,
          intervalMs: this.config.autoSaveIntervalMs,
          episodeId: this.config.selectedEpisodeId
        });
      } else {
        console.log('[SingleUserEventManager] ⏹️ Auto-save disabled');
      }
    }
    
    console.log('[SingleUserEventManager] ✅ Config updated successfully:', {
      novelSlug: this.config.novelSlug,
      selectedEpisodeId: this.config.selectedEpisodeId,
      autoSaveEnabled: this.config.autoSaveEnabled
    });
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
      episodes: [], // 🆕 PHASE 3: Initialize episodes
      scenes: [], // 🆕 UNIFIED STATE: Initialize scenes
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
  updateSnapshotFromReactFlow(nodes: any[], edges: any[], storyVariables: any[], scenes?: any[]): void {
    const newSnapshot: SnapshotData = {
      nodes: [...nodes],
      edges: [...edges],
      storyVariables: [...storyVariables],
      timestamp: Date.now(),
      version: this.state.localVersion,
      episodes: this.currentSnapshot.episodes || [], // Preserve episodes
      scenes: scenes ? [...scenes] : this.currentSnapshot.scenes || [] // Update or preserve scenes
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

  // 🎬 NEW: Create synchronized scene-node pair
  async createSynchronizedSceneNode(nodeData: any, sceneData?: any): Promise<{ scene: any; node: any }> {
    const nodeId = nodeData.id || `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sceneId = sceneData?._id || `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create the synchronized scene-node command
    const command: SceneCommand = {
      id: `sync_create_${Date.now()}`,
      type: 'SCENE_NODE_SYNC_CREATE',
      timestamp: Date.now(),
      description: `Create synchronized scene-node pair: ${nodeData.title}`,
      sceneData: {
        _id: sceneId,
        title: nodeData.title || 'New Scene',
        description: nodeData.notesForAuthor || '',
        ...sceneData
      },
      nodeData,
      linkedNodeId: nodeId,
      autoSync: true,
      execute: () => {},
      undo: () => {},
      serialize: () => ({
        id: `sync_create_${Date.now()}`,
        type: 'SCENE_NODE_SYNC_CREATE',
        timestamp: Date.now(),
        payload: { nodeData, sceneData }
      })
    };

    const result = await this.executeCommand(command);
    
    if (!result.success) {
      const errorMessage = typeof result.error === 'string' ? result.error : 'Failed to create synchronized scene-node pair';
      throw new Error(errorMessage);
    }

    return {
      scene: (result as SceneCommandResult).scene!,
      node: (result as SceneCommandResult).linkedNode!
    };
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