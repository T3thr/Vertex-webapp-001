// src/app/novels/[slug]/overview/components/tabs/BlueprintCommandAdapter.ts
// ===================================================================
// Blueprint Command Adapter for EventManager Integration
// Bridges BlueprintTab's legacy commands with new EventManager system
// ===================================================================

import { Node, Edge } from '@xyflow/react';
import { EventManager } from './EventManager';

// Legacy command interface from BlueprintTab
interface ICommand {
  id: string;
  type: string;
  description: string;
  timestamp: number;
  execute(): void;
  undo(): void;
  redo?(): void;
}

interface NodeCommand extends ICommand {
  type: 'ADD_NODE' | 'DELETE_NODE' | 'UPDATE_NODE' | 'MOVE_NODE';
  nodeId: string;
  nodeData?: Node;
  oldPosition?: { x: number; y: number };
  newPosition?: { x: number; y: number };
  oldData?: any;
  newData?: any;
}

interface EdgeCommand extends ICommand {
  type: 'ADD_EDGE' | 'DELETE_EDGE' | 'UPDATE_EDGE';
  edgeId: string;
  edgeData?: Edge;
  sourceNodeId?: string;
  targetNodeId?: string;
  oldData?: any;
  newData?: any;
}

interface BatchCommand extends ICommand {
  type: 'BATCH';
  commands: ICommand[];
}

type AnyCommand = NodeCommand | EdgeCommand | BatchCommand;

// ===================================================================
// Blueprint Command Adapter Class
// ===================================================================

export class BlueprintCommandAdapter {
  private eventManager: EventManager;

  constructor(eventManager: EventManager) {
    this.eventManager = eventManager;
  }

  /**
   * Execute a BlueprintTab command through EventManager
   */
  async executeCommand(command: AnyCommand): Promise<void> {
    try {
      // Convert BlueprintTab command to EventManager command format
      const eventManagerCommand = this.convertToEventManagerCommand(command);
      
      // Execute through EventManager
      await this.eventManager.executeCommand(eventManagerCommand);
      
      console.log(`[BlueprintCommandAdapter] Command executed: ${command.type} - ${command.description}`);
      
    } catch (error) {
      console.error('[BlueprintCommandAdapter] Command execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute a batch of commands
   */
  async executeBatchCommand(commands: AnyCommand[]): Promise<void> {
    try {
      for (const command of commands) {
        await this.executeCommand(command);
      }
      
      console.log(`[BlueprintCommandAdapter] Batch execution completed: ${commands.length} commands`);
      
    } catch (error) {
      console.error('[BlueprintCommandAdapter] Batch execution failed:', error);
      throw error;
    }
  }

  /**
   * Convert BlueprintTab command to EventManager command format
   */
  private convertToEventManagerCommand(command: AnyCommand): any {
    const baseCommand = {
      id: command.id,
      type: command.type,
      description: command.description,
      timestamp: command.timestamp,
      execute: command.execute.bind(command),
      undo: command.undo.bind(command),
      serialize: () => this.serializeCommand(command)
    };

    switch (command.type) {
      case 'ADD_NODE':
      case 'DELETE_NODE':
      case 'UPDATE_NODE':
      case 'MOVE_NODE':
        return {
          ...baseCommand,
          payload: {
            nodeId: (command as NodeCommand).nodeId,
            nodeData: (command as NodeCommand).nodeData,
            oldPosition: (command as NodeCommand).oldPosition,
            newPosition: (command as NodeCommand).newPosition,
            oldData: (command as NodeCommand).oldData,
            newData: (command as NodeCommand).newData
          }
        };

      case 'ADD_EDGE':
      case 'DELETE_EDGE':
      case 'UPDATE_EDGE':
        return {
          ...baseCommand,
          payload: {
            edgeId: (command as EdgeCommand).edgeId,
            edgeData: (command as EdgeCommand).edgeData,
            sourceNodeId: (command as EdgeCommand).sourceNodeId,
            targetNodeId: (command as EdgeCommand).targetNodeId,
            oldData: (command as EdgeCommand).oldData,
            newData: (command as EdgeCommand).newData
          }
        };

      case 'BATCH':
        return {
          ...baseCommand,
          payload: {
            commands: (command as BatchCommand).commands.map(cmd => this.serializeCommand(cmd))
          }
        };

      default:
        return baseCommand;
    }
  }

  /**
   * Serialize command for storage/transmission
   */
  private serializeCommand(command: ICommand): any {
    const baseData = {
      id: command.id,
      type: command.type,
      description: command.description,
      timestamp: command.timestamp
    };

    // Type-safe serialization
    if ('nodeId' in command) {
      const nodeCmd = command as NodeCommand;
      return {
        ...baseData,
        nodeId: nodeCmd.nodeId,
        nodeData: nodeCmd.nodeData,
        oldPosition: nodeCmd.oldPosition,
        newPosition: nodeCmd.newPosition,
        oldData: nodeCmd.oldData,
        newData: nodeCmd.newData
      };
    }

    if ('edgeId' in command) {
      const edgeCmd = command as EdgeCommand;
      return {
        ...baseData,
        edgeId: edgeCmd.edgeId,
        edgeData: edgeCmd.edgeData,
        sourceNodeId: edgeCmd.sourceNodeId,
        targetNodeId: edgeCmd.targetNodeId,
        oldData: edgeCmd.oldData,
        newData: edgeCmd.newData
      };
    }

    if ('commands' in command) {
      const batchCmd = command as BatchCommand;
      return {
        ...baseData,
        commands: batchCmd.commands.map(cmd => this.serializeCommand(cmd))
      };
    }

    return baseData;
  }

  /**
   * Create a simple command that just marks as dirty
   */
  createSimpleCommand(type: string, description: string, data?: any): any {
    const commandId = `simple_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: commandId,
      type,
      description,
      timestamp: Date.now(),
      data,
      execute: () => {
        // Mark as dirty using the proper EventManager method
        this.eventManager.markAsDirty();
        
        // Also notify change for professional tracking
        this.eventManager.notifyChange('SIMPLE_COMMAND_EXECUTED', { type, description, data });
        
        console.log(`[BlueprintCommandAdapter] Simple command executed: ${type} - ${description}`);
      },
      undo: () => {
        // Placeholder for undo - could mark as clean if this was the only change
        console.log(`[BlueprintCommandAdapter] Undo command: ${type} - ${description}`);
      },
      serialize: () => ({
        id: commandId,
        type,
        description,
        timestamp: Date.now(),
        data
      })
    };
  }

  // Create professional-grade commands with real undo/redo functionality
  createNodeCommand(
    type: 'ADD_NODE' | 'DELETE_NODE' | 'MOVE_NODE' | 'UPDATE_NODE',
    nodeData: any,
    previousState?: any
  ): any {
    const commandId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: commandId,
      type,
      description: `${type}: ${nodeData.id || nodeData.nodeId}`,
      timestamp: Date.now(),
      nodeData,
      previousState,
      execute: () => {
        // The actual execution will be handled by BlueprintTab
        this.eventManager.markAsDirty();
        this.eventManager.notifyChange('NODE_COMMAND_EXECUTED', { type, nodeData });
        console.log(`[BlueprintCommandAdapter] Node command executed: ${type}`);
      },
      undo: () => {
        // The actual undo will be handled by BlueprintTab
        this.eventManager.notifyChange('NODE_COMMAND_UNDONE', { type, nodeData, previousState });
        console.log(`[BlueprintCommandAdapter] Node command undone: ${type}`);
      },
      serialize: () => ({
        id: commandId,
        type,
        description: `${type}: ${nodeData.id || nodeData.nodeId}`,
        timestamp: Date.now(),
        nodeData,
        previousState
      })
    };
  }

  createEdgeCommand(
    type: 'ADD_EDGE' | 'DELETE_EDGE' | 'UPDATE_EDGE',
    edgeData: any,
    previousState?: any
  ): any {
    const commandId = `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: commandId,
      type,
      description: `${type}: ${edgeData.id || edgeData.edgeId}`,
      timestamp: Date.now(),
      edgeData,
      previousState,
      execute: () => {
        // The actual execution will be handled by BlueprintTab
        this.eventManager.markAsDirty();
        this.eventManager.notifyChange('EDGE_COMMAND_EXECUTED', { type, edgeData });
        console.log(`[BlueprintCommandAdapter] Edge command executed: ${type}`);
      },
      undo: () => {
        // The actual undo will be handled by BlueprintTab
        this.eventManager.notifyChange('EDGE_COMMAND_UNDONE', { type, edgeData, previousState });
        console.log(`[BlueprintCommandAdapter] Edge command undone: ${type}`);
      },
      serialize: () => ({
        id: commandId,
        type,
        description: `${type}: ${edgeData.id || edgeData.edgeId}`,
        timestamp: Date.now(),
        edgeData,
        previousState
      })
    };
  }

  createBatchCommand(commands: any[], description: string): any {
    const commandId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: commandId,
      type: 'BATCH',
      description,
      timestamp: Date.now(),
      commands,
      execute: () => {
        // Execute all commands in sequence
        commands.forEach(cmd => {
          if (cmd.execute) cmd.execute();
        });
        this.eventManager.markAsDirty();
        this.eventManager.notifyChange('BATCH_COMMAND_EXECUTED', { commands });
        console.log(`[BlueprintCommandAdapter] Batch command executed: ${description}`);
      },
      undo: () => {
        // Undo all commands in reverse order
        [...commands].reverse().forEach(cmd => {
          if (cmd.undo) cmd.undo();
        });
        this.eventManager.notifyChange('BATCH_COMMAND_UNDONE', { commands });
        console.log(`[BlueprintCommandAdapter] Batch command undone: ${description}`);
      },
      serialize: () => ({
        id: commandId,
        type: 'BATCH',
        description,
        timestamp: Date.now(),
        commands: commands.map(cmd => cmd.serialize ? cmd.serialize() : cmd)
      })
    };
  }

  /**
   * Get EventManager state
   */
  getState() {
    return this.eventManager.getState();
  }

  /**
   * Check if there are changes
   */
  hasChanges(): boolean {
    return this.eventManager.hasChanges();
  }
}

// ===================================================================
// Factory Function
// ===================================================================

export function createBlueprintCommandAdapter(eventManager: EventManager): BlueprintCommandAdapter {
  return new BlueprintCommandAdapter(eventManager);
}

export default BlueprintCommandAdapter;
