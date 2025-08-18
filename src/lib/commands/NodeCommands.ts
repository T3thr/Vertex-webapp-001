// src/lib/commands/NodeCommands.ts
// ===================================================================
// Node-specific Command implementations
// Professional-grade commands for node operations in Blueprint Editor
// ===================================================================

import { BaseCommand, CommandData, CommandContext, COMMAND_TYPES } from './Command';
import { produce } from 'immer';

// ===================================================================
// Node Command Types
// ===================================================================

export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeDimensions {
  width: number;
  height: number;
}

// ===================================================================
// Add Node Command
// ===================================================================

export class AddNodeCommand extends BaseCommand {
  private nodeData: any;
  private position: NodePosition;
  private context: CommandContext;
  private addedNodeId?: string;

  constructor(
    nodeData: any,
    position: NodePosition,
    context: CommandContext
  ) {
    super(
      COMMAND_TYPES.ADD_NODE,
      `Add ${nodeData.type || 'node'} at (${position.x}, ${position.y})`
    );
    
    this.nodeData = { ...nodeData };
    this.position = { ...position };
    this.context = context;
  }

  execute(): void {
    try {
      // Generate unique ID if not provided
      if (!this.nodeData.id) {
        this.nodeData.id = this.context.generateNodeId();
      }
      this.addedNodeId = this.nodeData.id;

      // Create new node with position
      const newNode = {
        ...this.nodeData,
        position: this.position,
        data: this.nodeData.data || {}
      };

      // Validate node before adding
      if (!this.context.validateNode(newNode)) {
        throw new Error(`Invalid node data for node ${this.addedNodeId}`);
      }

      // Add node to current state using immer for immutability
      const currentNodes = this.context.getCurrentNodes();
      const updatedNodes = produce(currentNodes, draft => {
        draft.push(newNode);
      });

      this.context.setNodes(updatedNodes);
      this.context.notifyChange('NODE_ADDED', { nodeId: this.addedNodeId, node: newNode });

    } catch (error) {
      console.error(`[AddNodeCommand] Failed to add node:`, error);
      throw error;
    }
  }

  undo(): void {
    if (!this.addedNodeId) {
      console.warn('[AddNodeCommand] Cannot undo: No node ID available');
      return;
    }

    try {
      const currentNodes = this.context.getCurrentNodes();
      const updatedNodes = produce(currentNodes, draft => {
        const index = draft.findIndex(node => node.id === this.addedNodeId);
        if (index !== -1) {
          draft.splice(index, 1);
        }
      });

      this.context.setNodes(updatedNodes);
      this.context.notifyChange('NODE_REMOVED', { nodeId: this.addedNodeId });

    } catch (error) {
      console.error(`[AddNodeCommand] Failed to undo add node:`, error);
      throw error;
    }
  }

  serialize(): CommandData {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      payload: {
        nodeData: this.nodeData,
        position: this.position,
        addedNodeId: this.addedNodeId
      }
    };
  }
}

// ===================================================================
// Delete Node Command
// ===================================================================

export class DeleteNodeCommand extends BaseCommand {
  private nodeId: string;
  private context: CommandContext;
  private deletedNode?: any;
  private deletedEdges: any[] = [];

  constructor(nodeId: string, context: CommandContext) {
    super(
      COMMAND_TYPES.DELETE_NODE,
      `Delete node ${nodeId}`
    );
    
    this.nodeId = nodeId;
    this.context = context;
  }

  execute(): void {
    try {
      const currentNodes = this.context.getCurrentNodes();
      const currentEdges = this.context.getCurrentEdges();

      // Find the node to delete
      this.deletedNode = currentNodes.find(node => node.id === this.nodeId);
      if (!this.deletedNode) {
        throw new Error(`Node ${this.nodeId} not found`);
      }

      // Find all edges connected to this node
      this.deletedEdges = currentEdges.filter(edge => 
        edge.source === this.nodeId || edge.target === this.nodeId
      );

      // Remove node
      const updatedNodes = produce(currentNodes, draft => {
        const index = draft.findIndex(node => node.id === this.nodeId);
        if (index !== -1) {
          draft.splice(index, 1);
        }
      });

      // Remove connected edges
      const updatedEdges = produce(currentEdges, draft => {
        this.deletedEdges.forEach(edge => {
          const index = draft.findIndex(e => e.id === edge.id);
          if (index !== -1) {
            draft.splice(index, 1);
          }
        });
      });

      this.context.setNodes(updatedNodes);
      this.context.setEdges(updatedEdges);
      
      this.context.notifyChange('NODE_DELETED', { 
        nodeId: this.nodeId, 
        deletedEdges: this.deletedEdges.map(e => e.id)
      });

    } catch (error) {
      console.error(`[DeleteNodeCommand] Failed to delete node:`, error);
      throw error;
    }
  }

  undo(): void {
    if (!this.deletedNode) {
      console.warn('[DeleteNodeCommand] Cannot undo: No deleted node data available');
      return;
    }

    try {
      // Restore node
      const currentNodes = this.context.getCurrentNodes();
      const updatedNodes = produce(currentNodes, draft => {
        draft.push(this.deletedNode);
      });

      // Restore edges
      const currentEdges = this.context.getCurrentEdges();
      const updatedEdges = produce(currentEdges, draft => {
        this.deletedEdges.forEach(edge => {
          draft.push(edge);
        });
      });

      this.context.setNodes(updatedNodes);
      this.context.setEdges(updatedEdges);
      
      this.context.notifyChange('NODE_RESTORED', { 
        nodeId: this.nodeId,
        restoredEdges: this.deletedEdges.map(e => e.id)
      });

    } catch (error) {
      console.error(`[DeleteNodeCommand] Failed to undo delete node:`, error);
      throw error;
    }
  }

  serialize(): CommandData {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      payload: {
        nodeId: this.nodeId,
        deletedNode: this.deletedNode,
        deletedEdges: this.deletedEdges
      }
    };
  }
}

// ===================================================================
// Move Node Command
// ===================================================================

export class MoveNodeCommand extends BaseCommand {
  private nodeId: string;
  private oldPosition: NodePosition;
  private newPosition: NodePosition;
  private context: CommandContext;

  constructor(
    nodeId: string,
    oldPosition: NodePosition,
    newPosition: NodePosition,
    context: CommandContext
  ) {
    super(
      COMMAND_TYPES.MOVE_NODE,
      `Move node ${nodeId} from (${oldPosition.x}, ${oldPosition.y}) to (${newPosition.x}, ${newPosition.y})`
    );
    
    this.nodeId = nodeId;
    this.oldPosition = { ...oldPosition };
    this.newPosition = { ...newPosition };
    this.context = context;
  }

  execute(): void {
    this.moveNodeToPosition(this.newPosition);
  }

  undo(): void {
    this.moveNodeToPosition(this.oldPosition);
  }

  private moveNodeToPosition(position: NodePosition): void {
    try {
      const currentNodes = this.context.getCurrentNodes();
      const updatedNodes = produce(currentNodes, draft => {
        const node = draft.find(n => n.id === this.nodeId);
        if (node) {
          node.position = { ...position };
        }
      });

      this.context.setNodes(updatedNodes);
      this.context.notifyChange('NODE_MOVED', { 
        nodeId: this.nodeId, 
        position 
      });

    } catch (error) {
      console.error(`[MoveNodeCommand] Failed to move node:`, error);
      throw error;
    }
  }

  serialize(): CommandData {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      payload: {
        nodeId: this.nodeId,
        oldPosition: this.oldPosition,
        newPosition: this.newPosition
      }
    };
  }

  // Implement merging for smooth drag operations
  canMergeWith(other: MoveNodeCommand): boolean {
    return (
      other instanceof MoveNodeCommand &&
      other.nodeId === this.nodeId &&
      (other.timestamp - this.timestamp) < 100 // Merge if within 100ms
    );
  }

  mergeWith(other: MoveNodeCommand): MoveNodeCommand {
    if (!this.canMergeWith(other)) {
      throw new Error('Cannot merge incompatible MoveNodeCommand');
    }

    // Create new command with original start position and latest end position
    return new MoveNodeCommand(
      this.nodeId,
      this.oldPosition, // Keep original start position
      other.newPosition, // Use latest end position
      this.context
    );
  }
}

// ===================================================================
// Update Node Data Command
// ===================================================================

export class UpdateNodeDataCommand extends BaseCommand {
  private nodeId: string;
  private oldData: any;
  private newData: any;
  private context: CommandContext;

  constructor(
    nodeId: string,
    oldData: any,
    newData: any,
    context: CommandContext
  ) {
    super(
      COMMAND_TYPES.UPDATE_NODE,
      `Update node ${nodeId} data`
    );
    
    this.nodeId = nodeId;
    this.oldData = { ...oldData };
    this.newData = { ...newData };
    this.context = context;
  }

  execute(): void {
    this.updateNodeData(this.newData);
  }

  undo(): void {
    this.updateNodeData(this.oldData);
  }

  private updateNodeData(data: any): void {
    try {
      const currentNodes = this.context.getCurrentNodes();
      const updatedNodes = produce(currentNodes, draft => {
        const node = draft.find(n => n.id === this.nodeId);
        if (node) {
          // Merge new data with existing node
          Object.assign(node.data, data);
        }
      });

      this.context.setNodes(updatedNodes);
      this.context.notifyChange('NODE_DATA_UPDATED', { 
        nodeId: this.nodeId, 
        data 
      });

    } catch (error) {
      console.error(`[UpdateNodeDataCommand] Failed to update node data:`, error);
      throw error;
    }
  }

  serialize(): CommandData {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      payload: {
        nodeId: this.nodeId,
        oldData: this.oldData,
        newData: this.newData
      }
    };
  }
}

// ===================================================================
// Batch Node Operations
// ===================================================================

export class BatchNodeOperationCommand extends BaseCommand {
  private nodeIds: string[];
  private operation: 'delete' | 'move' | 'update';
  private operationData: any;
  private context: CommandContext;
  private originalStates: Map<string, any> = new Map();

  constructor(
    nodeIds: string[],
    operation: 'delete' | 'move' | 'update',
    operationData: any,
    context: CommandContext
  ) {
    super(
      'BATCH_NODE_OPERATION',
      `Batch ${operation} ${nodeIds.length} nodes`
    );
    
    this.nodeIds = [...nodeIds];
    this.operation = operation;
    this.operationData = operationData;
    this.context = context;
  }

  execute(): void {
    try {
      // Store original states
      const currentNodes = this.context.getCurrentNodes();
      this.nodeIds.forEach(nodeId => {
        const node = currentNodes.find(n => n.id === nodeId);
        if (node) {
          this.originalStates.set(nodeId, { ...node });
        }
      });

      // Apply batch operation
      switch (this.operation) {
        case 'delete':
          this.executeBatchDelete();
          break;
        case 'move':
          this.executeBatchMove();
          break;
        case 'update':
          this.executeBatchUpdate();
          break;
      }

    } catch (error) {
      console.error(`[BatchNodeOperationCommand] Failed to execute batch operation:`, error);
      throw error;
    }
  }

  undo(): void {
    try {
      const currentNodes = this.context.getCurrentNodes();
      const updatedNodes = produce(currentNodes, draft => {
        this.originalStates.forEach((originalNode, nodeId) => {
          const index = draft.findIndex(n => n.id === nodeId);
          if (index !== -1) {
            // Restore original node
            draft[index] = originalNode;
          } else {
            // Re-add deleted node
            draft.push(originalNode);
          }
        });
      });

      this.context.setNodes(updatedNodes);
      this.context.notifyChange('BATCH_NODE_OPERATION_UNDONE', { 
        nodeIds: this.nodeIds,
        operation: this.operation
      });

    } catch (error) {
      console.error(`[BatchNodeOperationCommand] Failed to undo batch operation:`, error);
      throw error;
    }
  }

  private executeBatchDelete(): void {
    const currentNodes = this.context.getCurrentNodes();
    const updatedNodes = produce(currentNodes, draft => {
      this.nodeIds.forEach(nodeId => {
        const index = draft.findIndex(n => n.id === nodeId);
        if (index !== -1) {
          draft.splice(index, 1);
        }
      });
    });

    this.context.setNodes(updatedNodes);
    this.context.notifyChange('BATCH_NODES_DELETED', { nodeIds: this.nodeIds });
  }

  private executeBatchMove(): void {
    const { deltaX, deltaY } = this.operationData;
    const currentNodes = this.context.getCurrentNodes();
    const updatedNodes = produce(currentNodes, draft => {
      this.nodeIds.forEach(nodeId => {
        const node = draft.find(n => n.id === nodeId);
        if (node) {
          node.position.x += deltaX;
          node.position.y += deltaY;
        }
      });
    });

    this.context.setNodes(updatedNodes);
    this.context.notifyChange('BATCH_NODES_MOVED', { 
      nodeIds: this.nodeIds, 
      delta: { x: deltaX, y: deltaY }
    });
  }

  private executeBatchUpdate(): void {
    const updateData = this.operationData;
    const currentNodes = this.context.getCurrentNodes();
    const updatedNodes = produce(currentNodes, draft => {
      this.nodeIds.forEach(nodeId => {
        const node = draft.find(n => n.id === nodeId);
        if (node) {
          Object.assign(node.data, updateData);
        }
      });
    });

    this.context.setNodes(updatedNodes);
    this.context.notifyChange('BATCH_NODES_UPDATED', { 
      nodeIds: this.nodeIds, 
      updateData 
    });
  }

  serialize(): CommandData {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      payload: {
        nodeIds: this.nodeIds,
        operation: this.operation,
        operationData: this.operationData,
        originalStates: Array.from(this.originalStates.entries())
      }
    };
  }
}
