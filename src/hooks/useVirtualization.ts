// src/hooks/useVirtualization.ts
// ===================================================================
// React Hook for Story Map Virtualization
// Professional-grade performance optimization hook
// ===================================================================

import React from 'react';
import { Node, Edge, Viewport } from '@xyflow/react';
import { 
  VirtualizationManager, 
  createVirtualizationManager,
  VirtualizationConfig,
  VirtualNode,
  VirtualEdge,
  ClusterNode,
  VirtualizationMetrics
} from '@/lib/performance/VirtualizationManager';

export interface UseVirtualizationProps {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  containerSize: { width: number; height: number };
  config?: Partial<VirtualizationConfig>;
  enabled?: boolean;
}

export interface UseVirtualizationReturn {
  virtualNodes: VirtualNode[];
  virtualEdges: VirtualEdge[];
  clusterNodes: ClusterNode[];
  metrics: VirtualizationMetrics;
  manager: VirtualizationManager;
  isVirtualizationActive: boolean;
}

export function useVirtualization({
  nodes,
  edges,
  viewport,
  containerSize,
  config,
  enabled = true
}: UseVirtualizationProps): UseVirtualizationReturn {
  const [manager] = React.useState(() => createVirtualizationManager(config));
  const [virtualNodes, setVirtualNodes] = React.useState<VirtualNode[]>([]);
  const [virtualEdges, setVirtualEdges] = React.useState<VirtualEdge[]>([]);
  const [clusterNodes, setClusterNodes] = React.useState<ClusterNode[]>([]);
  const [metrics, setMetrics] = React.useState<VirtualizationMetrics>(manager.getMetrics());

  // Update virtualization when data changes
  React.useEffect(() => {
    if (!enabled) {
      setVirtualNodes(nodes.map(node => ({ ...node, isVisible: true, distanceFromViewport: 0, levelOfDetail: 'full' as const })));
      setVirtualEdges(edges.map(edge => ({ ...edge, isVisible: true, levelOfDetail: 'full' as const, sourceVisible: true, targetVisible: true })));
      setClusterNodes([]);
      return;
    }

    manager.initialize(nodes, edges, viewport, containerSize);
    
    setVirtualNodes(manager.getVirtualNodes());
    setVirtualEdges(manager.getVirtualEdges());
    setClusterNodes(manager.getClusterNodes());
    setMetrics(manager.getMetrics());
  }, [nodes, edges, enabled, manager, viewport, containerSize]);

  // Update viewport when it changes
  React.useEffect(() => {
    if (!enabled) return;

    manager.updateViewport(viewport, containerSize);
    
    setVirtualNodes(manager.getVirtualNodes());
    setVirtualEdges(manager.getVirtualEdges());
    setClusterNodes(manager.getClusterNodes());
    setMetrics(manager.getMetrics());
  }, [viewport, containerSize, enabled, manager]);

  // Update config when it changes
  React.useEffect(() => {
    if (!enabled || !config) return;
    
    manager.updateConfig(config);
    
    setVirtualNodes(manager.getVirtualNodes());
    setVirtualEdges(manager.getVirtualEdges());
    setClusterNodes(manager.getClusterNodes());
    setMetrics(manager.getMetrics());
  }, [config, enabled, manager]);

  return {
    virtualNodes,
    virtualEdges,
    clusterNodes,
    metrics,
    manager,
    isVirtualizationActive: enabled && nodes.length > 100 // Auto-enable for large datasets
  };
}
