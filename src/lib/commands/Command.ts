// src/lib/commands/Command.ts
// ===================================================================
// Command Pattern Implementation for Novel Editor
// Professional-grade command system with undo/redo capabilities
// ===================================================================

/**
 * Base Command interface - สำหรับ Command Pattern implementation
 * ทุก operation ใน Blueprint Editor จะต้องเป็น Command
 */
export interface Command {
  /** Unique identifier for this command instance */
  readonly id: string;
  
  /** Command type for serialization and debugging */
  readonly type: string;
  
  /** Human-readable description for debugging */
  readonly description: string;
  
  /** Timestamp when command was created */
  readonly timestamp: number;
  
  /**
   * Execute the command (optimistic update)
   * This applies changes immediately to the UI state
   */
  execute(): void;
  
  /**
   * Undo the command
   * This reverts the changes made by execute()
   */
  undo(): void;
  
  /**
   * Redo the command (optional - defaults to execute)
   * Some commands might need different logic for redo
   */
  redo?(): void;
  
  /**
   * Serialize command for network transmission
   * This should contain only the data needed to recreate the command
   */
  serialize(): CommandData;
  
  /**
   * Check if this command can be merged with another command
   * Useful for combining similar operations (e.g., multiple drag events)
   */
  canMergeWith?(other: Command): boolean;
  
  /**
   * Merge this command with another compatible command
   * Returns a new command that represents both operations
   */
  mergeWith?(other: Command): Command;
}

/**
 * Serialized command data for network transmission
 */
export interface CommandData {
  id: string;
  type: string;
  timestamp: number;
  payload: any;
  metadata?: {
    userId?: string;
    sessionId?: string;
    clientVersion?: string;
  };
}

/**
 * Base abstract class for all commands
 * Provides common functionality and enforces the Command interface
 */
export abstract class BaseCommand implements Command {
  public readonly id: string;
  public readonly type: string;
  public readonly description: string;
  public readonly timestamp: number;

  constructor(type: string, description: string) {
    this.id = this.generateId();
    this.type = type;
    this.description = description;
    this.timestamp = Date.now();
  }

  private generateId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  abstract execute(): void;
  abstract undo(): void;
  abstract serialize(): CommandData;

  /**
   * Default redo implementation - just calls execute()
   * Override if your command needs different redo logic
   */
  redo(): void {
    this.execute();
  }

  /**
   * Default merge behavior - no merging
   * Override for commands that can be merged (like drag operations)
   */
  canMergeWith(other: Command): boolean {
    return false;
  }

  mergeWith(other: Command): Command {
    throw new Error(`Command ${this.type} does not support merging`);
  }
}

/**
 * Batch command for executing multiple commands as a single operation
 * Useful for compound operations that should be undone/redone together
 */
export class BatchCommand extends BaseCommand {
  private commands: Command[];

  constructor(commands: Command[], description?: string) {
    super(
      'BATCH',
      description || `Batch operation (${commands.length} commands)`
    );
    this.commands = [...commands]; // Create a copy
  }

  execute(): void {
    for (const command of this.commands) {
      command.execute();
    }
  }

  undo(): void {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }

  redo(): void {
    // Redo in original order
    for (const command of this.commands) {
      if (command.redo) {
        command.redo();
      } else {
        command.execute();
      }
    }
  }

  serialize(): CommandData {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      payload: {
        commands: this.commands.map(cmd => cmd.serialize())
      }
    };
  }

  getCommands(): readonly Command[] {
    return this.commands;
  }
}

/**
 * Command execution result
 */
export interface CommandResult {
  success: boolean;
  command: Command;
  error?: Error;
  metadata?: any;
}

/**
 * Command validation result
 */
export interface CommandValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Interface for command validators
 */
export interface CommandValidator {
  validate(command: Command): CommandValidation;
}

/**
 * Command execution context
 * Provides access to the current state and utilities for command execution
 */
export interface CommandContext {
  // State accessors
  getCurrentNodes(): any[];
  getCurrentEdges(): any[];
  getCurrentStoryVariables(): any[];
  
  // State mutators
  setNodes(nodes: any[]): void;
  setEdges(edges: any[]): void;
  setStoryVariables(variables: any[]): void;
  
  // Utilities
  findNodeById(id: string): any | null;
  findEdgeById(id: string): any | null;
  generateNodeId(): string;
  generateEdgeId(): string;
  
  // Validation
  validateNode(node: any): boolean;
  validateEdge(edge: any): boolean;
  
  // Events
  notifyChange(changeType: string, data: any): void;
  
  // 🚀 NEW: Bidirectional sync methods for Undo/Redo
  updateReactFlowUI?: (nodes: any[], edges: any[]) => void;
  syncBackToReactFlow?: () => void;
  updateEventManagerState?: (nodes: any[], edges: any[], storyVariables: any[]) => void;
}

// Command type constants for better type safety
export const COMMAND_TYPES = {
  // Node operations
  ADD_NODE: 'ADD_NODE',
  DELETE_NODE: 'DELETE_NODE',
  UPDATE_NODE: 'UPDATE_NODE',
  MOVE_NODE: 'MOVE_NODE',
  
  // Edge operations
  ADD_EDGE: 'ADD_EDGE',
  DELETE_EDGE: 'DELETE_EDGE',
  UPDATE_EDGE: 'UPDATE_EDGE',
  
  // Canvas operations
  UPDATE_CANVAS: 'UPDATE_CANVAS',
  MOVE_VIEWPORT: 'MOVE_VIEWPORT',
  ZOOM_CANVAS: 'ZOOM_CANVAS',
  
  // Story variables
  ADD_VARIABLE: 'ADD_VARIABLE',
  UPDATE_VARIABLE: 'UPDATE_VARIABLE',
  DELETE_VARIABLE: 'DELETE_VARIABLE',
  
  // Batch operations
  BATCH: 'BATCH'
} as const;

export type CommandType = typeof COMMAND_TYPES[keyof typeof COMMAND_TYPES];
