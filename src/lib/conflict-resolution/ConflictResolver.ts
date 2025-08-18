// src/lib/conflict-resolution/ConflictResolver.ts
// ===================================================================
// Conflict Resolution System for Real-time Collaboration
// Professional-grade conflict resolution strategies
// ===================================================================

import { Command, CommandData } from '../commands/Command';

// ===================================================================
// Conflict Resolution Types
// ===================================================================

export type ConflictResolutionStrategy = 
  | 'last_write_wins'
  | 'first_write_wins'
  | 'merge'
  | 'manual'
  | 'operational_transform';

export interface ConflictContext {
  localCommand: CommandData;
  remoteCommand: CommandData;
  currentState: any;
  conflictTimestamp: number;
  localUserId: string;
  remoteUserId: string;
}

export interface ConflictResolution {
  strategy: ConflictResolutionStrategy;
  resolvedCommand?: CommandData;
  requiresManualResolution: boolean;
  conflictReason: string;
  mergedChanges?: any;
  rejectedChanges?: any;
}

export interface ConflictMetrics {
  totalConflicts: number;
  resolvedAutomatically: number;
  requiredManualResolution: number;
  resolutionTimeMs: number;
  strategyUsed: ConflictResolutionStrategy;
}

// ===================================================================
// Base Conflict Resolver Interface
// ===================================================================

export interface IConflictResolver {
  resolve(context: ConflictContext): Promise<ConflictResolution>;
  getMetrics(): ConflictMetrics;
  reset(): void;
}

// ===================================================================
// Basic Conflict Resolver Implementation
// ===================================================================

export class ConflictResolver implements IConflictResolver {
  protected strategy: ConflictResolutionStrategy;
  private metrics: ConflictMetrics;

  constructor(strategy: ConflictResolutionStrategy = 'last_write_wins') {
    this.strategy = strategy;
    this.metrics = this.createInitialMetrics();
  }

  async resolve(context: ConflictContext): Promise<ConflictResolution> {
    const startTime = Date.now();
    
    try {
      this.metrics.totalConflicts++;

      // Log conflict for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('[ConflictResolver] Resolving conflict:', {
          strategy: this.strategy,
          localCommand: context.localCommand.type,
          remoteCommand: context.remoteCommand.type,
          localUser: context.localUserId,
          remoteUser: context.remoteUserId
        });
      }

      let resolution: ConflictResolution;

      switch (this.strategy) {
        case 'last_write_wins':
          resolution = await this.resolveLastWriteWins(context);
          break;
          
        case 'first_write_wins':
          resolution = await this.resolveFirstWriteWins(context);
          break;
          
        case 'merge':
          resolution = await this.resolveMerge(context);
          break;
          
        case 'manual':
          resolution = await this.resolveManual(context);
          break;
          
        case 'operational_transform':
          resolution = await this.resolveOperationalTransform(context);
          break;
          
        default:
          resolution = await this.resolveLastWriteWins(context);
      }

      // Update metrics
      this.metrics.resolutionTimeMs = Date.now() - startTime;
      this.metrics.strategyUsed = this.strategy;
      
      if (resolution.requiresManualResolution) {
        this.metrics.requiredManualResolution++;
      } else {
        this.metrics.resolvedAutomatically++;
      }

      return resolution;

    } catch (error) {
      console.error('[ConflictResolver] Resolution failed:', error);
      
      // Fallback to last write wins
      return await this.resolveLastWriteWins(context);
    }
  }

  getMetrics(): ConflictMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = this.createInitialMetrics();
  }

  setStrategy(strategy: ConflictResolutionStrategy): void {
    this.strategy = strategy;
  }

  // ===================================================================
  // Resolution Strategies
  // ===================================================================

  private async resolveLastWriteWins(context: ConflictContext): Promise<ConflictResolution> {
    // Remote command always wins (it's newer)
    return {
      strategy: 'last_write_wins',
      resolvedCommand: context.remoteCommand,
      requiresManualResolution: false,
      conflictReason: 'Automatic resolution: remote command is newer',
      rejectedChanges: context.localCommand
    };
  }

  private async resolveFirstWriteWins(context: ConflictContext): Promise<ConflictResolution> {
    // Local command wins (it was first)
    return {
      strategy: 'first_write_wins',
      resolvedCommand: context.localCommand,
      requiresManualResolution: false,
      conflictReason: 'Automatic resolution: local command was first',
      rejectedChanges: context.remoteCommand
    };
  }

  private async resolveMerge(context: ConflictContext): Promise<ConflictResolution> {
    // Attempt to merge changes
    try {
      const mergedCommand = await this.attemptMerge(context);
      
      if (mergedCommand) {
        return {
          strategy: 'merge',
          resolvedCommand: mergedCommand,
          requiresManualResolution: false,
          conflictReason: 'Automatic merge successful',
          mergedChanges: mergedCommand
        };
      } else {
        // Merge failed, require manual resolution
        return {
          strategy: 'merge',
          requiresManualResolution: true,
          conflictReason: 'Automatic merge failed - requires manual resolution'
        };
      }
    } catch (error) {
      return {
        strategy: 'merge',
        requiresManualResolution: true,
        conflictReason: `Merge failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async resolveManual(context: ConflictContext): Promise<ConflictResolution> {
    // Always require manual resolution
    return {
      strategy: 'manual',
      requiresManualResolution: true,
      conflictReason: 'Manual resolution required by configuration'
    };
  }

  private async resolveOperationalTransform(context: ConflictContext): Promise<ConflictResolution> {
    // Operational Transform (OT) - simplified implementation
    try {
      const transformedCommand = await this.operationalTransform(context);
      
      return {
        strategy: 'operational_transform',
        resolvedCommand: transformedCommand,
        requiresManualResolution: false,
        conflictReason: 'Operational transform applied successfully',
        mergedChanges: transformedCommand
      };
    } catch (error) {
      // Fallback to last write wins
      return await this.resolveLastWriteWins(context);
    }
  }

  // ===================================================================
  // Merge and Transform Logic
  // ===================================================================

  private async attemptMerge(context: ConflictContext): Promise<CommandData | null> {
    const { localCommand, remoteCommand } = context;

    // Check if commands can be merged
    if (!this.canMergeCommands(localCommand, remoteCommand)) {
      return null;
    }

    // Attempt simple merge based on command types
    if (localCommand.type === remoteCommand.type) {
      return await this.mergeSimilarCommands(localCommand, remoteCommand);
    } else {
      return await this.mergeDifferentCommands(localCommand, remoteCommand);
    }
  }

  private canMergeCommands(local: CommandData, remote: CommandData): boolean {
    // Define which command types can be merged
    const mergeableTypes = new Set([
      'UPDATE_NODE',
      'MOVE_NODE',
      'UPDATE_EDGE',
      'UPDATE_VARIABLE'
    ]);

    return mergeableTypes.has(local.type) && mergeableTypes.has(remote.type);
  }

  private async mergeSimilarCommands(local: CommandData, remote: CommandData): Promise<CommandData | null> {
    try {
      // Merge commands of the same type
      switch (local.type) {
        case 'UPDATE_NODE':
          return this.mergeNodeUpdates(local, remote);
          
        case 'MOVE_NODE':
          return this.mergeNodeMoves(local, remote);
          
        case 'UPDATE_EDGE':
          return this.mergeEdgeUpdates(local, remote);
          
        default:
          return null;
      }
    } catch (error) {
      console.error('[ConflictResolver] Merge failed:', error);
      return null;
    }
  }

  private async mergeDifferentCommands(local: CommandData, remote: CommandData): Promise<CommandData | null> {
    // For different command types, we generally can't merge automatically
    // This would require more sophisticated logic based on specific command combinations
    return null;
  }

  private mergeNodeUpdates(local: CommandData, remote: CommandData): CommandData | null {
    // Merge node update properties
    const localPayload = local.payload;
    const remotePayload = remote.payload;

    if (localPayload.nodeId !== remotePayload.nodeId) {
      return null; // Different nodes, can't merge
    }

    // Merge the data objects
    const mergedData = {
      ...localPayload.oldData,
      ...localPayload.newData,
      ...remotePayload.newData
    };

    return {
      ...remote,
      payload: {
        ...remotePayload,
        newData: mergedData
      }
    };
  }

  private mergeNodeMoves(local: CommandData, remote: CommandData): CommandData | null {
    // For node moves, use the remote position (last write wins for position)
    return remote;
  }

  private mergeEdgeUpdates(local: CommandData, remote: CommandData): CommandData | null {
    // Similar to node updates
    const localPayload = local.payload;
    const remotePayload = remote.payload;

    if (localPayload.edgeId !== remotePayload.edgeId) {
      return null;
    }

    const mergedData = {
      ...localPayload.oldData,
      ...localPayload.newData,
      ...remotePayload.newData
    };

    return {
      ...remote,
      payload: {
        ...remotePayload,
        newData: mergedData
      }
    };
  }

  private async operationalTransform(context: ConflictContext): Promise<CommandData> {
    // Simplified Operational Transform
    // In a real implementation, this would be much more sophisticated
    const { localCommand, remoteCommand } = context;

    // For now, apply a simple transform based on command types
    if (localCommand.type === 'MOVE_NODE' && remoteCommand.type === 'MOVE_NODE') {
      return this.transformNodeMoves(localCommand, remoteCommand);
    }

    // Default: return remote command
    return remoteCommand;
  }

  private transformNodeMoves(local: CommandData, remote: CommandData): CommandData {
    // If both commands move the same node, apply the remote move
    // In a more sophisticated OT, we might adjust positions based on both moves
    return remote;
  }

  // ===================================================================
  // Utility Methods
  // ===================================================================

  private createInitialMetrics(): ConflictMetrics {
    return {
      totalConflicts: 0,
      resolvedAutomatically: 0,
      requiredManualResolution: 0,
      resolutionTimeMs: 0,
      strategyUsed: this.strategy
    };
  }
}

// ===================================================================
// Advanced Conflict Resolver (Future Implementation)
// ===================================================================

export class AdvancedConflictResolver extends ConflictResolver {
  private commandHistory: CommandData[] = [];
  private userPreferences: Map<string, ConflictResolutionStrategy> = new Map();

  constructor(strategy: ConflictResolutionStrategy = 'operational_transform') {
    super(strategy);
  }

  async resolve(context: ConflictContext): Promise<ConflictResolution> {
    // Add to history
    this.commandHistory.push(context.localCommand, context.remoteCommand);
    
    // Keep only recent history
    if (this.commandHistory.length > 100) {
      this.commandHistory = this.commandHistory.slice(-100);
    }

    // Check user preferences
    const userStrategy = this.userPreferences.get(context.localUserId);
    if (userStrategy) {
      const originalStrategy = this.strategy;
      this.setStrategy(userStrategy);
      const result = await super.resolve(context);
      this.setStrategy(originalStrategy);
      return result;
    }

    return await super.resolve(context);
  }

  setUserPreference(userId: string, strategy: ConflictResolutionStrategy): void {
    this.userPreferences.set(userId, strategy);
  }

  getCommandHistory(): CommandData[] {
    return [...this.commandHistory];
  }
}

// ===================================================================
// Factory Functions
// ===================================================================

export function createConflictResolver(
  strategy: ConflictResolutionStrategy = 'last_write_wins'
): ConflictResolver {
  return new ConflictResolver(strategy);
}

export function createAdvancedConflictResolver(
  strategy: ConflictResolutionStrategy = 'operational_transform'
): AdvancedConflictResolver {
  return new AdvancedConflictResolver(strategy);
}
