// src/lib/commands/BlueprintCommands.ts
// ===================================================================
// Blueprint-specific Command implementations
// High-level commands for Blueprint Tab operations
// ===================================================================

import { BaseCommand, CommandData, CommandContext, COMMAND_TYPES } from './Command';
import { AddNodeCommand, DeleteNodeCommand, MoveNodeCommand, UpdateNodeDataCommand } from './NodeCommands';
import { AddEdgeCommand, DeleteEdgeCommand, UpdateEdgeDataCommand } from './EdgeCommands';
import { produce } from 'immer';

// ===================================================================
// Story Variable Commands
// ===================================================================

export class AddStoryVariableCommand extends BaseCommand {
  private variable: any;
  private context: CommandContext;

  constructor(variable: any, context: CommandContext) {
    super(
      COMMAND_TYPES.ADD_VARIABLE,
      `Add story variable ${variable.variableName}`
    );
    
    this.variable = { ...variable };
    this.context = context;
  }

  execute(): void {
    try {
      const currentVariables = this.context.getCurrentStoryVariables();
      const updatedVariables = produce(currentVariables, draft => {
        draft.push(this.variable);
      });

      this.context.setStoryVariables(updatedVariables);
      this.context.notifyChange('STORY_VARIABLE_ADDED', { variable: this.variable });

    } catch (error) {
      console.error(`[AddStoryVariableCommand] Failed to add variable:`, error);
      throw error;
    }
  }

  undo(): void {
    try {
      const currentVariables = this.context.getCurrentStoryVariables();
      const updatedVariables = produce(currentVariables, draft => {
        const index = draft.findIndex(v => v.variableId === this.variable.variableId);
        if (index !== -1) {
          draft.splice(index, 1);
        }
      });

      this.context.setStoryVariables(updatedVariables);
      this.context.notifyChange('STORY_VARIABLE_REMOVED', { variableId: this.variable.variableId });

    } catch (error) {
      console.error(`[AddStoryVariableCommand] Failed to undo add variable:`, error);
      throw error;
    }
  }

  serialize(): CommandData {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      payload: {
        variable: this.variable
      }
    };
  }
}

export class UpdateStoryVariableCommand extends BaseCommand {
  private variableId: string;
  private oldData: any;
  private newData: any;
  private context: CommandContext;

  constructor(
    variableId: string,
    oldData: any,
    newData: any,
    context: CommandContext
  ) {
    super(
      COMMAND_TYPES.UPDATE_VARIABLE,
      `Update story variable ${variableId}`
    );
    
    this.variableId = variableId;
    this.oldData = { ...oldData };
    this.newData = { ...newData };
    this.context = context;
  }

  execute(): void {
    this.updateVariable(this.newData);
  }

  undo(): void {
    this.updateVariable(this.oldData);
  }

  private updateVariable(data: any): void {
    try {
      const currentVariables = this.context.getCurrentStoryVariables();
      const updatedVariables = produce(currentVariables, draft => {
        const variable = draft.find(v => v.variableId === this.variableId);
        if (variable) {
          Object.assign(variable, data);
        }
      });

      this.context.setStoryVariables(updatedVariables);
      this.context.notifyChange('STORY_VARIABLE_UPDATED', { 
        variableId: this.variableId, 
        data 
      });

    } catch (error) {
      console.error(`[UpdateStoryVariableCommand] Failed to update variable:`, error);
      throw error;
    }
  }

  serialize(): CommandData {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      payload: {
        variableId: this.variableId,
        oldData: this.oldData,
        newData: this.newData
      }
    };
  }
}

// ===================================================================
// Blueprint-specific Helper Functions
// ===================================================================

export interface BlueprintCommandFactory {
  createAddNodeCommand(nodeData: any, position: { x: number; y: number }): AddNodeCommand;
  createDeleteNodeCommand(nodeId: string): DeleteNodeCommand;
  createMoveNodeCommand(nodeId: string, oldPos: { x: number; y: number }, newPos: { x: number; y: number }): MoveNodeCommand;
  createUpdateNodeCommand(nodeId: string, oldData: any, newData: any): UpdateNodeDataCommand;
  createAddEdgeCommand(edgeData: any, connection: any): AddEdgeCommand;
  createDeleteEdgeCommand(edgeId: string): DeleteEdgeCommand;
  createUpdateEdgeCommand(edgeId: string, oldData: any, newData: any): UpdateEdgeDataCommand;
  createAddVariableCommand(variable: any): AddStoryVariableCommand;
  createUpdateVariableCommand(variableId: string, oldData: any, newData: any): UpdateStoryVariableCommand;
}

export class BlueprintCommandFactoryImpl implements BlueprintCommandFactory {
  private context: CommandContext;

  constructor(context: CommandContext) {
    this.context = context;
  }

  createAddNodeCommand(nodeData: any, position: { x: number; y: number }): AddNodeCommand {
    return new AddNodeCommand(nodeData, position, this.context);
  }

  createDeleteNodeCommand(nodeId: string): DeleteNodeCommand {
    return new DeleteNodeCommand(nodeId, this.context);
  }

  createMoveNodeCommand(
    nodeId: string, 
    oldPos: { x: number; y: number }, 
    newPos: { x: number; y: number }
  ): MoveNodeCommand {
    return new MoveNodeCommand(nodeId, oldPos, newPos, this.context);
  }

  createUpdateNodeCommand(nodeId: string, oldData: any, newData: any): UpdateNodeDataCommand {
    return new UpdateNodeDataCommand(nodeId, oldData, newData, this.context);
  }

  createAddEdgeCommand(edgeData: any, connection: any): AddEdgeCommand {
    return new AddEdgeCommand(edgeData, connection, this.context);
  }

  createDeleteEdgeCommand(edgeId: string): DeleteEdgeCommand {
    return new DeleteEdgeCommand(edgeId, this.context);
  }

  createUpdateEdgeCommand(edgeId: string, oldData: any, newData: any): UpdateEdgeDataCommand {
    return new UpdateEdgeDataCommand(edgeId, oldData, newData, this.context);
  }

  createAddVariableCommand(variable: any): AddStoryVariableCommand {
    return new AddStoryVariableCommand(variable, this.context);
  }

  createUpdateVariableCommand(variableId: string, oldData: any, newData: any): UpdateStoryVariableCommand {
    return new UpdateStoryVariableCommand(variableId, oldData, newData, this.context);
  }
}

// ===================================================================
// Legacy Support Functions for BlueprintTab Migration
// ===================================================================

/**
 * Convert ReactFlow node changes to commands
 */
export function nodeChangesToCommands(
  changes: any[], 
  factory: BlueprintCommandFactory,
  currentNodes: any[]
): any[] {
  const commands: any[] = [];

  for (const change of changes) {
    switch (change.type) {
      case 'position':
        if (change.position && change.positionAbsolute) {
          const node = currentNodes.find(n => n.id === change.id);
          if (node) {
            commands.push(factory.createMoveNodeCommand(
              change.id,
              node.position,
              change.position
            ));
          }
        }
        break;
      
      case 'remove':
        commands.push(factory.createDeleteNodeCommand(change.id));
        break;
      
      case 'add':
        if (change.item) {
          commands.push(factory.createAddNodeCommand(
            change.item,
            change.item.position || { x: 0, y: 0 }
          ));
        }
        break;
      
      case 'select':
        // Selection doesn't create commands as it's UI state only
        break;
        
      default:
        console.warn('[BlueprintCommands] Unhandled node change type:', change.type);
    }
  }

  return commands;
}

/**
 * Convert ReactFlow edge changes to commands
 */
export function edgeChangesToCommands(
  changes: any[], 
  factory: BlueprintCommandFactory
): any[] {
  const commands: any[] = [];

  for (const change of changes) {
    switch (change.type) {
      case 'remove':
        commands.push(factory.createDeleteEdgeCommand(change.id));
        break;
      
      case 'add':
        if (change.item) {
          commands.push(factory.createAddEdgeCommand(
            change.item,
            {
              sourceNodeId: change.item.source,
              targetNodeId: change.item.target,
              sourceHandle: change.item.sourceHandle,
              targetHandle: change.item.targetHandle
            }
          ));
        }
        break;
        
      case 'select':
        // Selection doesn't create commands as it's UI state only
        break;
        
      default:
        console.warn('[BlueprintCommands] Unhandled edge change type:', change.type);
    }
  }

  return commands;
}

/**
 * Legacy adapter for BlueprintTab to gradually migrate to command pattern
 */
export class BlueprintTabCommandAdapter {
  private factory: BlueprintCommandFactory;
  private executeCommand: (command: any) => Promise<any>;

  constructor(factory: BlueprintCommandFactory, executeCommand: (command: any) => Promise<any>) {
    this.factory = factory;
    this.executeCommand = executeCommand;
  }

  async handleNodeChanges(changes: any[], currentNodes: any[]): Promise<void> {
    const commands = nodeChangesToCommands(changes, this.factory, currentNodes);
    
    for (const command of commands) {
      try {
        await this.executeCommand(command);
      } catch (error) {
        console.error('[BlueprintTabCommandAdapter] Failed to execute command:', error);
        // In a more sophisticated implementation, we might rollback previous commands
      }
    }
  }

  async handleEdgeChanges(changes: any[]): Promise<void> {
    const commands = edgeChangesToCommands(changes, this.factory);
    
    for (const command of commands) {
      try {
        await this.executeCommand(command);
      } catch (error) {
        console.error('[BlueprintTabCommandAdapter] Failed to execute command:', error);
      }
    }
  }

  async addNode(nodeData: any, position: { x: number; y: number }): Promise<void> {
    const command = this.factory.createAddNodeCommand(nodeData, position);
    await this.executeCommand(command);
  }

  async updateNode(nodeId: string, oldData: any, newData: any): Promise<void> {
    const command = this.factory.createUpdateNodeCommand(nodeId, oldData, newData);
    await this.executeCommand(command);
  }

  async deleteNode(nodeId: string): Promise<void> {
    const command = this.factory.createDeleteNodeCommand(nodeId);
    await this.executeCommand(command);
  }

  async addEdge(edgeData: any, connection: any): Promise<void> {
    const command = this.factory.createAddEdgeCommand(edgeData, connection);
    await this.executeCommand(command);
  }

  async updateEdge(edgeId: string, oldData: any, newData: any): Promise<void> {
    const command = this.factory.createUpdateEdgeCommand(edgeId, oldData, newData);
    await this.executeCommand(command);
  }

  async deleteEdge(edgeId: string): Promise<void> {
    const command = this.factory.createDeleteEdgeCommand(edgeId);
    await this.executeCommand(command);
  }
}
