// src/lib/performance/VirtualizationManager.ts
// ===================================================================
// Virtualization Manager for Large Story Maps
// Professional-grade performance optimization
// ===================================================================

import { Node, Edge, Viewport } from '@xyflow/react';
import { produce } from 'immer';

// ===================================================================
// Virtualization Types
// ===================================================================

export interface VirtualizationConfig {
  viewportPadding: number; // Extra padding around viewport
  maxVisibleNodes: number; // Maximum nodes to render
  maxVisibleEdges: number; // Maximum edges to render
  chunkSize: number; // Size of data chunks for incremental loading
  enableNodeClustering: boolean; // Group distant nodes into clusters
  clusterThreshold: number; // Distance threshold for clustering
  enableLevelOfDetail: boolean; // Simplify distant elements
  lodThreshold: number; // Distance threshold for LOD
}

export interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VirtualNode extends Node {
  isVisible: boolean;
  distanceFromViewport: number;
  levelOfDetail: 'full' | 'simplified' | 'hidden';
  clusterId?: string;
}

export interface VirtualEdge extends Edge {
  isVisible: boolean;
  levelOfDetail: 'full' | 'simplified' | 'hidden';
  sourceVisible: boolean;
  targetVisible: boolean;
}

export interface ClusterNode {
  id: string;
  position: { x: number; y: number };
  nodeCount: number;
  nodeIds: string[];
  bounds: ViewportBounds;
  type: 'cluster';
}

export interface VirtualizationMetrics {
  totalNodes: number;
  visibleNodes: number;
  clusteredNodes: number;
  totalEdges: number;
  visibleEdges: number;
  renderTime: number;
  memoryUsage: number;
}

// ===================================================================
// Virtualization Manager Class
// ===================================================================

export class VirtualizationManager {
  private config: VirtualizationConfig;
  private viewport: Viewport;
  private viewportBounds: ViewportBounds;
  private allNodes: Node[] = [];
  private allEdges: Edge[] = [];
  private virtualNodes: VirtualNode[] = [];
  private virtualEdges: VirtualEdge[] = [];
  private clusters: ClusterNode[] = [];
  private metrics: VirtualizationMetrics;
  private lastUpdateTime = 0;
  private spatialIndex: Map<string, Node[]> = new Map(); // Spatial indexing for performance

  constructor(config: Partial<VirtualizationConfig> = {}) {
    this.config = {
      viewportPadding: 200,
      maxVisibleNodes: 500,
      maxVisibleEdges: 1000,
      chunkSize: 100,
      enableNodeClustering: true,
      clusterThreshold: 1000,
      enableLevelOfDetail: true,
      lodThreshold: 500,
      ...config
    };

    this.viewport = { x: 0, y: 0, zoom: 1 };
    this.viewportBounds = { x: 0, y: 0, width: 0, height: 0 };
    this.metrics = this.createInitialMetrics();
  }

  // ===================================================================
  // Public API
  // ===================================================================

  /**
   * Initialize with full dataset
   */
  initialize(nodes: Node[], edges: Edge[], viewport: Viewport, containerSize: { width: number; height: number }): void {
    const startTime = performance.now();

    this.allNodes = [...nodes];
    this.allEdges = [...edges];
    this.viewport = viewport;
    
    this.updateViewportBounds(containerSize);
    this.buildSpatialIndex();
    this.updateVirtualization();

    this.metrics.renderTime = performance.now() - startTime;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[VirtualizationManager] Initialized with:', {
        totalNodes: this.allNodes.length,
        totalEdges: this.allEdges.length,
        renderTime: this.metrics.renderTime.toFixed(2) + 'ms'
      });
    }
  }

  /**
   * Update viewport and recalculate visible elements
   */
  updateViewport(viewport: Viewport, containerSize: { width: number; height: number }): void {
    // Throttle updates to avoid excessive recalculation
    const now = performance.now();
    if (now - this.lastUpdateTime < 16) return; // ~60fps
    
    this.lastUpdateTime = now;
    this.viewport = viewport;
    this.updateViewportBounds(containerSize);
    this.updateVirtualization();
  }

  /**
   * Add nodes incrementally
   */
  addNodes(newNodes: Node[]): void {
    this.allNodes = [...this.allNodes, ...newNodes];
    this.buildSpatialIndex();
    this.updateVirtualization();
  }

  /**
   * Remove nodes
   */
  removeNodes(nodeIds: string[]): void {
    const nodeIdSet = new Set(nodeIds);
    this.allNodes = this.allNodes.filter(node => !nodeIdSet.has(node.id));
    this.allEdges = this.allEdges.filter(edge => 
      !nodeIdSet.has(edge.source) && !nodeIdSet.has(edge.target)
    );
    this.buildSpatialIndex();
    this.updateVirtualization();
  }

  /**
   * Update node positions
   */
  updateNodePositions(updates: Array<{ id: string; position: { x: number; y: number } }>): void {
    const updateMap = new Map(updates.map(u => [u.id, u.position]));
    
    this.allNodes = this.allNodes.map(node => {
      const newPosition = updateMap.get(node.id);
      return newPosition ? { ...node, position: newPosition } : node;
    });

    this.buildSpatialIndex();
    this.updateVirtualization();
  }

  /**
   * Get current virtual nodes for rendering
   */
  getVirtualNodes(): VirtualNode[] {
    return this.virtualNodes.filter(node => node.isVisible);
  }

  /**
   * Get current virtual edges for rendering
   */
  getVirtualEdges(): VirtualEdge[] {
    return this.virtualEdges.filter(edge => edge.isVisible);
  }

  /**
   * Get cluster nodes for rendering
   */
  getClusterNodes(): ClusterNode[] {
    return this.clusters;
  }

  /**
   * Get performance metrics
   */
  getMetrics(): VirtualizationMetrics {
    return { ...this.metrics };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<VirtualizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.updateVirtualization();
  }

  // ===================================================================
  // Private Methods
  // ===================================================================

  private updateViewportBounds(containerSize: { width: number; height: number }): void {
    const { x, y, zoom } = this.viewport;
    const { viewportPadding } = this.config;

    this.viewportBounds = {
      x: x - viewportPadding / zoom,
      y: y - viewportPadding / zoom,
      width: containerSize.width / zoom + (viewportPadding * 2) / zoom,
      height: containerSize.height / zoom + (viewportPadding * 2) / zoom
    };
  }

  private buildSpatialIndex(): void {
    this.spatialIndex.clear();
    const cellSize = 500; // Grid cell size for spatial indexing

    for (const node of this.allNodes) {
      const cellX = Math.floor(node.position.x / cellSize);
      const cellY = Math.floor(node.position.y / cellSize);
      const cellKey = `${cellX},${cellY}`;

      if (!this.spatialIndex.has(cellKey)) {
        this.spatialIndex.set(cellKey, []);
      }
      this.spatialIndex.get(cellKey)!.push(node);
    }
  }

  private updateVirtualization(): void {
    const startTime = performance.now();

    // Calculate visibility and distance for all nodes
    this.virtualNodes = this.allNodes.map(node => this.createVirtualNode(node));

    // Apply clustering if enabled
    if (this.config.enableNodeClustering) {
      this.applyNodeClustering();
    }

    // Calculate virtual edges
    this.virtualEdges = this.allEdges.map(edge => this.createVirtualEdge(edge));

    // Sort by distance and limit visible items
    this.limitVisibleItems();

    // Update metrics
    this.updateMetrics();

    this.metrics.renderTime = performance.now() - startTime;
  }

  private createVirtualNode(node: Node): VirtualNode {
    const distance = this.calculateDistanceFromViewport(node.position);
    const isVisible = this.isNodeInViewport(node);
    
    let levelOfDetail: 'full' | 'simplified' | 'hidden' = 'full';
    
    if (this.config.enableLevelOfDetail) {
      if (distance > this.config.lodThreshold * 2) {
        levelOfDetail = 'hidden';
      } else if (distance > this.config.lodThreshold) {
        levelOfDetail = 'simplified';
      }
    }

    return {
      ...node,
      isVisible: isVisible && levelOfDetail !== 'hidden',
      distanceFromViewport: distance,
      levelOfDetail
    };
  }

  private createVirtualEdge(edge: Edge): VirtualEdge {
    const sourceNode = this.virtualNodes.find(n => n.id === edge.source);
    const targetNode = this.virtualNodes.find(n => n.id === edge.target);
    
    const sourceVisible = sourceNode?.isVisible || false;
    const targetVisible = targetNode?.isVisible || false;
    const isVisible = sourceVisible || targetVisible;

    let levelOfDetail: 'full' | 'simplified' | 'hidden' = 'full';
    
    if (this.config.enableLevelOfDetail) {
      const sourceDistance = sourceNode?.distanceFromViewport || Infinity;
      const targetDistance = targetNode?.distanceFromViewport || Infinity;
      const minDistance = Math.min(sourceDistance, targetDistance);
      
      if (minDistance > this.config.lodThreshold * 2) {
        levelOfDetail = 'hidden';
      } else if (minDistance > this.config.lodThreshold) {
        levelOfDetail = 'simplified';
      }
    }

    return {
      ...edge,
      isVisible: isVisible && levelOfDetail !== 'hidden',
      levelOfDetail,
      sourceVisible,
      targetVisible
    };
  }

  private isNodeInViewport(node: Node): boolean {
    const nodeWidth = node.measured?.width || 200;
    const nodeHeight = node.measured?.height || 100;

    return !(
      node.position.x + nodeWidth < this.viewportBounds.x ||
      node.position.x > this.viewportBounds.x + this.viewportBounds.width ||
      node.position.y + nodeHeight < this.viewportBounds.y ||
      node.position.y > this.viewportBounds.y + this.viewportBounds.height
    );
  }

  private calculateDistanceFromViewport(position: { x: number; y: number }): number {
    const viewportCenterX = this.viewportBounds.x + this.viewportBounds.width / 2;
    const viewportCenterY = this.viewportBounds.y + this.viewportBounds.height / 2;

    const dx = position.x - viewportCenterX;
    const dy = position.y - viewportCenterY;

    return Math.sqrt(dx * dx + dy * dy);
  }

  private applyNodeClustering(): void {
    this.clusters = [];
    const hiddenNodes = this.virtualNodes.filter(node => 
      !node.isVisible && node.distanceFromViewport > this.config.clusterThreshold
    );

    if (hiddenNodes.length === 0) return;

    // Simple clustering algorithm - group nearby hidden nodes
    const clustered = new Set<string>();
    const clusterRadius = 300; // Cluster radius

    for (const node of hiddenNodes) {
      if (clustered.has(node.id)) continue;

      const nearbyNodes = hiddenNodes.filter(other => {
        if (clustered.has(other.id) || other.id === node.id) return false;
        
        const dx = node.position.x - other.position.x;
        const dy = node.position.y - other.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance <= clusterRadius;
      });

      if (nearbyNodes.length >= 3) { // Minimum cluster size
        const clusterNodes = [node, ...nearbyNodes];
        const clusterId = `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        // Calculate cluster center
        const centerX = clusterNodes.reduce((sum, n) => sum + n.position.x, 0) / clusterNodes.length;
        const centerY = clusterNodes.reduce((sum, n) => sum + n.position.y, 0) / clusterNodes.length;

        // Calculate cluster bounds
        const minX = Math.min(...clusterNodes.map(n => n.position.x));
        const maxX = Math.max(...clusterNodes.map(n => n.position.x));
        const minY = Math.min(...clusterNodes.map(n => n.position.y));
        const maxY = Math.max(...clusterNodes.map(n => n.position.y));

        this.clusters.push({
          id: clusterId,
          position: { x: centerX, y: centerY },
          nodeCount: clusterNodes.length,
          nodeIds: clusterNodes.map(n => n.id),
          bounds: {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
          },
          type: 'cluster'
        });

        // Mark nodes as clustered
        clusterNodes.forEach(n => {
          clustered.add(n.id);
          const virtualNode = this.virtualNodes.find(vn => vn.id === n.id);
          if (virtualNode) {
            virtualNode.clusterId = clusterId;
          }
        });
      }
    }
  }

  private limitVisibleItems(): void {
    // Sort nodes by distance and limit
    this.virtualNodes.sort((a, b) => a.distanceFromViewport - b.distanceFromViewport);
    
    let visibleNodeCount = 0;
    for (const node of this.virtualNodes) {
      if (node.isVisible && visibleNodeCount < this.config.maxVisibleNodes) {
        visibleNodeCount++;
      } else if (visibleNodeCount >= this.config.maxVisibleNodes) {
        node.isVisible = false;
      }
    }

    // Sort edges by their nodes' distance and limit
    this.virtualEdges.sort((a, b) => {
      const aSourceNode = this.virtualNodes.find(n => n.id === a.source);
      const aTargetNode = this.virtualNodes.find(n => n.id === a.target);
      const bSourceNode = this.virtualNodes.find(n => n.id === b.source);
      const bTargetNode = this.virtualNodes.find(n => n.id === b.target);
      
      const aMinDistance = Math.min(
        aSourceNode?.distanceFromViewport || Infinity,
        aTargetNode?.distanceFromViewport || Infinity
      );
      const bMinDistance = Math.min(
        bSourceNode?.distanceFromViewport || Infinity,
        bTargetNode?.distanceFromViewport || Infinity
      );
      
      return aMinDistance - bMinDistance;
    });

    let visibleEdgeCount = 0;
    for (const edge of this.virtualEdges) {
      if (edge.isVisible && visibleEdgeCount < this.config.maxVisibleEdges) {
        visibleEdgeCount++;
      } else if (visibleEdgeCount >= this.config.maxVisibleEdges) {
        edge.isVisible = false;
      }
    }
  }

  private updateMetrics(): void {
    this.metrics = {
      totalNodes: this.allNodes.length,
      visibleNodes: this.virtualNodes.filter(n => n.isVisible).length,
      clusteredNodes: this.virtualNodes.filter(n => n.clusterId).length,
      totalEdges: this.allEdges.length,
      visibleEdges: this.virtualEdges.filter(e => e.isVisible).length,
      renderTime: this.metrics.renderTime,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage in MB
    const nodeSize = 1000; // bytes per node (estimated)
    const edgeSize = 500; // bytes per edge (estimated)
    
    return (this.allNodes.length * nodeSize + this.allEdges.length * edgeSize) / 1024 / 1024;
  }

  private createInitialMetrics(): VirtualizationMetrics {
    return {
      totalNodes: 0,
      visibleNodes: 0,
      clusteredNodes: 0,
      totalEdges: 0,
      visibleEdges: 0,
      renderTime: 0,
      memoryUsage: 0
    };
  }
}

// ===================================================================
// Factory Function
// ===================================================================

export function createVirtualizationManager(config?: Partial<VirtualizationConfig>): VirtualizationManager {
  return new VirtualizationManager(config);
}

// ===================================================================
// React Hook for Virtualization
// ===================================================================

// React hook will be implemented in a separate file to avoid React import in this utility file

export default VirtualizationManager;
