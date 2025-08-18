// src/lib/commands/EdgeCommands.ts
// ===================================================================
// Edge-specific Command implementations
// Professional-grade commands for edge operations in Blueprint Editor
// ===================================================================

import { BaseCommand, CommandData, CommandContext, COMMAND_TYPES } from './Command';
import { produce } from 'immer';

// ===================================================================
// Edge Command Types
// ===================================================================

export interface EdgeConnection {
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string;
  targetHandle?: string;
}

// ===================================================================
// Add Edge Command
// ===================================================================

export class AddEdgeCommand extends BaseCommand {
  private edgeData: any;
  private connection: EdgeConnection;
  private context: CommandContext;
  private addedEdgeId?: string;

  constructor(
    edgeData: any,
    connection: EdgeConnection,
    context: CommandContext
  ) {
    super(
      COMMAND_TYPES.ADD_EDGE,
      `Add edge from ${connection.sourceNodeId} to ${connection.targetNodeId}`
    );
    
    this.edgeData = { ...edgeData };
    this.connection = { ...connection };
    this.context = context;
  }

  execute(): void {
    try {
      // Validate source and target nodes exist
      const sourceNode = this.context.findNodeById(this.connection.sourceNodeId);
      const targetNode = this.context.findNodeById(this.connection.targetNodeId);
      
      if (!sourceNode) {
        throw new Error(`Source node ${this.connection.sourceNodeId} not found`);
      }
      if (!targetNode) {
        throw new Error(`Target node ${this.connection.targetNodeId} not found`);
      }

      // Generate unique ID if not provided
      if (!this.edgeData.id) {
        this.edgeData.id = this.context.generateEdgeId();
      }
      this.addedEdgeId = this.edgeData.id;

      // Create new edge
      const newEdge = {
        ...this.edgeData,
        source: this.connection.sourceNodeId,
        target: this.connection.targetNodeId,
        sourceHandle: this.connection.sourceHandle,
        targetHandle: this.connection.targetHandle,
        data: this.edgeData.data || {}
      };

      // Validate edge before adding
      if (!this.context.validateEdge(newEdge)) {
        throw new Error(`Invalid edge data for edge ${this.addedEdgeId}`);
      }

      // Add edge to current state
      const currentEdges = this.context.getCurrentEdges();
      const updatedEdges = produce(currentEdges, draft => {
        draft.push(newEdge);
      });

      this.context.setEdges(updatedEdges);
      this.context.notifyChange('EDGE_ADDED', { 
        edgeId: this.addedEdgeId, 
        edge: newEdge,
        connection: this.connection
      });

    } catch (error) {
      console.error(`[AddEdgeCommand] Failed to add edge:`, error);
      throw error;
    }
  }

  undo(): void {
    if (!this.addedEdgeId) {
      console.warn('[AddEdgeCommand] Cannot undo: No edge ID available');
      return;
    }

    try {
      const currentEdges = this.context.getCurrentEdges();
      const updatedEdges = produce(currentEdges, draft => {
        const index = draft.findIndex(edge => edge.id === this.addedEdgeId);
        if (index !== -1) {
          draft.splice(index, 1);
        }
      });

      this.context.setEdges(updatedEdges);
      this.context.notifyChange('EDGE_REMOVED', { edgeId: this.addedEdgeId });

    } catch (error) {
      console.error(`[AddEdgeCommand] Failed to undo add edge:`, error);
      throw error;
    }
  }

  serialize(): CommandData {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      payload: {
        edgeData: this.edgeData,
        connection: this.connection,
        addedEdgeId: this.addedEdgeId
      }
    };
  }
}

// ===================================================================
// Delete Edge Command
// ===================================================================

export class DeleteEdgeCommand extends BaseCommand {
  private edgeId: string;
  private context: CommandContext;
  private deletedEdge?: any;

  constructor(edgeId: string, context: CommandContext) {
    super(
      COMMAND_TYPES.DELETE_EDGE,
      `Delete edge ${edgeId}`
    );
    
    this.edgeId = edgeId;
    this.context = context;
  }

  execute(): void {
    try {
      const currentEdges = this.context.getCurrentEdges();

      // Find the edge to delete
      this.deletedEdge = currentEdges.find(edge => edge.id === this.edgeId);
      if (!this.deletedEdge) {
        throw new Error(`Edge ${this.edgeId} not found`);
      }

      // Remove edge
      const updatedEdges = produce(currentEdges, draft => {
        const index = draft.findIndex(edge => edge.id === this.edgeId);
        if (index !== -1) {
          draft.splice(index, 1);
        }
      });

      this.context.setEdges(updatedEdges);
      this.context.notifyChange('EDGE_DELETED', { 
        edgeId: this.edgeId,
        connection: {
          sourceNodeId: this.deletedEdge.source,
          targetNodeId: this.deletedEdge.target
        }
      });

    } catch (error) {
      console.error(`[DeleteEdgeCommand] Failed to delete edge:`, error);
      throw error;
    }
  }

  undo(): void {
    if (!this.deletedEdge) {
      console.warn('[DeleteEdgeCommand] Cannot undo: No deleted edge data available');
      return;
    }

    try {
      // Restore edge
      const currentEdges = this.context.getCurrentEdges();
      const updatedEdges = produce(currentEdges, draft => {
        draft.push(this.deletedEdge);
      });

      this.context.setEdges(updatedEdges);
      this.context.notifyChange('EDGE_RESTORED', { 
        edgeId: this.edgeId,
        edge: this.deletedEdge
      });

    } catch (error) {
      console.error(`[DeleteEdgeCommand] Failed to undo delete edge:`, error);
      throw error;
    }
  }

  serialize(): CommandData {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      payload: {
        edgeId: this.edgeId,
        deletedEdge: this.deletedEdge
      }
    };
  }
}

// ===================================================================
// Update Edge Data Command
// ===================================================================

export class UpdateEdgeDataCommand extends BaseCommand {
  private edgeId: string;
  private oldData: any;
  private newData: any;
  private context: CommandContext;

  constructor(
    edgeId: string,
    oldData: any,
    newData: any,
    context: CommandContext
  ) {
    super(
      COMMAND_TYPES.UPDATE_EDGE,
      `Update edge ${edgeId} data`
    );
    
    this.edgeId = edgeId;
    this.oldData = { ...oldData };
    this.newData = { ...newData };
    this.context = context;
  }

  execute(): void {
    this.updateEdgeData(this.newData);
  }

  undo(): void {
    this.updateEdgeData(this.oldData);
  }

  private updateEdgeData(data: any): void {
    try {
      const currentEdges = this.context.getCurrentEdges();
      const updatedEdges = produce(currentEdges, draft => {
        const edge = draft.find(e => e.id === this.edgeId);
        if (edge) {
          // Merge new data with existing edge
          Object.assign(edge.data, data);
          
          // Handle special edge properties
          if (data.label !== undefined) edge.label = data.label;
          if (data.animated !== undefined) edge.animated = data.animated;
          if (data.style !== undefined) edge.style = data.style;
          if (data.type !== undefined) edge.type = data.type;
        }
      });

      this.context.setEdges(updatedEdges);
      this.context.notifyChange('EDGE_DATA_UPDATED', { 
        edgeId: this.edgeId, 
        data 
      });

    } catch (error) {
      console.error(`[UpdateEdgeDataCommand] Failed to update edge data:`, error);
      throw error;
    }
  }

  serialize(): CommandData {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      payload: {
        edgeId: this.edgeId,
        oldData: this.oldData,
        newData: this.newData
      }
    };
  }
}

// ===================================================================
// Reconnect Edge Command
// ===================================================================

export class ReconnectEdgeCommand extends BaseCommand {
  private edgeId: string;
  private oldConnection: EdgeConnection;
  private newConnection: EdgeConnection;
  private context: CommandContext;

  constructor(
    edgeId: string,
    oldConnection: EdgeConnection,
    newConnection: EdgeConnection,
    context: CommandContext
  ) {
    super(
      'RECONNECT_EDGE',
      `Reconnect edge ${edgeId} from ${oldConnection.sourceNodeId}→${oldConnection.targetNodeId} to ${newConnection.sourceNodeId}→${newConnection.targetNodeId}`
    );
    
    this.edgeId = edgeId;
    this.oldConnection = { ...oldConnection };
    this.newConnection = { ...newConnection };
    this.context = context;
  }

  execute(): void {
    this.reconnectEdge(this.newConnection);
  }

  undo(): void {
    this.reconnectEdge(this.oldConnection);
  }

  private reconnectEdge(connection: EdgeConnection): void {
    try {
      // Validate source and target nodes exist
      const sourceNode = this.context.findNodeById(connection.sourceNodeId);
      const targetNode = this.context.findNodeById(connection.targetNodeId);
      
      if (!sourceNode) {
        throw new Error(`Source node ${connection.sourceNodeId} not found`);
      }
      if (!targetNode) {
        throw new Error(`Target node ${connection.targetNodeId} not found`);
      }

      const currentEdges = this.context.getCurrentEdges();
      const updatedEdges = produce(currentEdges, draft => {
        const edge = draft.find(e => e.id === this.edgeId);
        if (edge) {
          edge.source = connection.sourceNodeId;
          edge.target = connection.targetNodeId;
          edge.sourceHandle = connection.sourceHandle;
          edge.targetHandle = connection.targetHandle;
        }
      });

      this.context.setEdges(updatedEdges);
      this.context.notifyChange('EDGE_RECONNECTED', { 
        edgeId: this.edgeId, 
        oldConnection: this.oldConnection,
        newConnection: connection
      });

    } catch (error) {
      console.error(`[ReconnectEdgeCommand] Failed to reconnect edge:`, error);
      throw error;
    }
  }

  serialize(): CommandData {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      payload: {
        edgeId: this.edgeId,
        oldConnection: this.oldConnection,
        newConnection: this.newConnection
      }
    };
  }
}

// ===================================================================
// Batch Edge Operations
// ===================================================================

export class BatchEdgeOperationCommand extends BaseCommand {
  private edgeIds: string[];
  private operation: 'delete' | 'update' | 'style';
  private operationData: any;
  private context: CommandContext;
  private originalStates: Map<string, any> = new Map();

  constructor(
    edgeIds: string[],
    operation: 'delete' | 'update' | 'style',
    operationData: any,
    context: CommandContext
  ) {
    super(
      'BATCH_EDGE_OPERATION',
      `Batch ${operation} ${edgeIds.length} edges`
    );
    
    this.edgeIds = [...edgeIds];
    this.operation = operation;
    this.operationData = operationData;
    this.context = context;
  }

  execute(): void {
    try {
      // Store original states
      const currentEdges = this.context.getCurrentEdges();
      this.edgeIds.forEach(edgeId => {
        const edge = currentEdges.find(e => e.id === edgeId);
        if (edge) {
          this.originalStates.set(edgeId, { ...edge });
        }
      });

      // Apply batch operation
      switch (this.operation) {
        case 'delete':
          this.executeBatchDelete();
          break;
        case 'update':
          this.executeBatchUpdate();
          break;
        case 'style':
          this.executeBatchStyle();
          break;
      }

    } catch (error) {
      console.error(`[BatchEdgeOperationCommand] Failed to execute batch operation:`, error);
      throw error;
    }
  }

  undo(): void {
    try {
      const currentEdges = this.context.getCurrentEdges();
      const updatedEdges = produce(currentEdges, draft => {
        this.originalStates.forEach((originalEdge, edgeId) => {
          const index = draft.findIndex(e => e.id === edgeId);
          if (index !== -1) {
            // Restore original edge
            draft[index] = originalEdge;
          } else {
            // Re-add deleted edge
            draft.push(originalEdge);
          }
        });
      });

      this.context.setEdges(updatedEdges);
      this.context.notifyChange('BATCH_EDGE_OPERATION_UNDONE', { 
        edgeIds: this.edgeIds,
        operation: this.operation
      });

    } catch (error) {
      console.error(`[BatchEdgeOperationCommand] Failed to undo batch operation:`, error);
      throw error;
    }
  }

  private executeBatchDelete(): void {
    const currentEdges = this.context.getCurrentEdges();
    const updatedEdges = produce(currentEdges, draft => {
      this.edgeIds.forEach(edgeId => {
        const index = draft.findIndex(e => e.id === edgeId);
        if (index !== -1) {
          draft.splice(index, 1);
        }
      });
    });

    this.context.setEdges(updatedEdges);
    this.context.notifyChange('BATCH_EDGES_DELETED', { edgeIds: this.edgeIds });
  }

  private executeBatchUpdate(): void {
    const updateData = this.operationData;
    const currentEdges = this.context.getCurrentEdges();
    const updatedEdges = produce(currentEdges, draft => {
      this.edgeIds.forEach(edgeId => {
        const edge = draft.find(e => e.id === edgeId);
        if (edge) {
          Object.assign(edge.data, updateData);
        }
      });
    });

    this.context.setEdges(updatedEdges);
    this.context.notifyChange('BATCH_EDGES_UPDATED', { 
      edgeIds: this.edgeIds, 
      updateData 
    });
  }

  private executeBatchStyle(): void {
    const { style, animated, type } = this.operationData;
    const currentEdges = this.context.getCurrentEdges();
    const updatedEdges = produce(currentEdges, draft => {
      this.edgeIds.forEach(edgeId => {
        const edge = draft.find(e => e.id === edgeId);
        if (edge) {
          if (style !== undefined) edge.style = style;
          if (animated !== undefined) edge.animated = animated;
          if (type !== undefined) edge.type = type;
        }
      });
    });

    this.context.setEdges(updatedEdges);
    this.context.notifyChange('BATCH_EDGES_STYLED', { 
      edgeIds: this.edgeIds, 
      styleData: this.operationData
    });
  }

  serialize(): CommandData {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      payload: {
        edgeIds: this.edgeIds,
        operation: this.operation,
        operationData: this.operationData,
        originalStates: Array.from(this.originalStates.entries())
      }
    };
  }
}
