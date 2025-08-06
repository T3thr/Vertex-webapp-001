// src/app/novels/[slug]/overview/components/canvas/BlueprintRoom.tsx
"use client";

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,
  Node,
  Edge,
  NodeTypes,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  XYPosition
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Target, 
  Grid3X3, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Eye,
  EyeOff,
  Save,
  AlertCircle
} from 'lucide-react';

// Custom Node Components
import StartNode from './nodes/StartNode';
import SceneNode from './nodes/SceneNode';
import ChoiceNode from './nodes/ChoiceNode';
import BranchNode from './nodes/BranchNode';
import EndingNode from './nodes/EndingNode';
import CommentNode from './nodes/CommentNode';
import VariableModifierNode from './nodes/VariableModifierNode';

// Sidebar Components
import NodePalette from './blueprint/NodePalette';
import InspectorPanel from './blueprint/InspectorPanel';

import { CanvasState, CanvasMode } from '../StoryCanvas';

interface BlueprintRoomProps {
  canvasData: {
    novel: any;
    episodes: any[];
    storyMap: any | null;
    characters: any[];
    scenes: any[];
    userMedia: any[];
    officialMedia: any[];
  };
  canvasState: CanvasState;
  onSceneSelect: (sceneId: string) => void;
  onNodeSelect: (nodeId: string | null) => void;
  onModeSwitch: (mode: CanvasMode, sceneId?: string) => void;
  onStoryMapUpdate?: (updates: any) => Promise<void>;
}

interface NodeConnectionPoint {
  nodeId: string;
  position: XYPosition;
  direction: 'top' | 'bottom' | 'left' | 'right';
  isAvailable: boolean;
}

interface GuidedPlacementState {
  isActive: boolean;
  sourceNodeId: string | null;
  availableConnections: NodeConnectionPoint[];
  suggestedPosition: XYPosition | null;
  nodeTypeToAdd: string | null;
}

// Define custom node types
const nodeTypes: NodeTypes = {
  startNode: StartNode,
  sceneNode: SceneNode,
  choiceNode: ChoiceNode,
  branchNode: BranchNode,
  endingNode: EndingNode,
  commentNode: CommentNode,
  variableModifierNode: VariableModifierNode,
};

const BlueprintRoom: React.FC<BlueprintRoomProps> = ({
  canvasData,
  canvasState,
  onSceneSelect,
  onNodeSelect,
  onModeSwitch,
  onStoryMapUpdate
}) => {
  const { storyMap, scenes, characters, novel } = canvasData;
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Convert StoryMap data to React Flow format first
  const initialNodes: Node[] = useMemo(() => {
    if (!storyMap?.nodes) return [];
    
    return storyMap.nodes.map((node: any) => ({
      id: node.nodeId,
      type: node.nodeType.replace('_node', 'Node'), // Convert to camelCase
      position: node.position,
      data: {
        ...node,
        scenes: scenes,
        characters: characters,
        onSceneSelect: onSceneSelect,
        onModeSwitch: onModeSwitch
      },
      style: {
        width: node.dimensions?.width || undefined,
        height: node.dimensions?.height || undefined,
      }
    }));
  }, [storyMap, scenes, characters, onSceneSelect, onModeSwitch]);

  const initialEdges: Edge[] = useMemo(() => {
    if (!storyMap?.edges) return [];
    
    return storyMap.edges.map((edge: any) => ({
      id: edge.edgeId,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      sourceHandle: edge.sourceHandleId,
      targetHandle: edge.targetHandleId,
      type: edge.edgeType || 'default',
      label: edge.label,
      style: {
        stroke: edge.editorVisuals?.color || '#94a3b8',
        strokeWidth: 2,
        strokeDasharray: edge.editorVisuals?.lineStyle === 'dashed' ? '5,5' : undefined,
      },
      animated: edge.editorVisuals?.animated || false,
      data: edge
    }));
  }, [storyMap]);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  
  // Guided Placement System State
  const [guidedPlacement, setGuidedPlacement] = useState<GuidedPlacementState>({
    isActive: false,
    sourceNodeId: null,
    availableConnections: [],
    suggestedPosition: null,
    nodeTypeToAdd: null
  });
  
  // Auto-save state
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);

  // ✅ Guided Node Placement System Functions
  const calculateNodeConnectionPoints = useCallback((node: Node): NodeConnectionPoint[] => {
    const connections: NodeConnectionPoint[] = [];
    const nodeWidth = node.style?.width as number || 200;
    const nodeHeight = node.style?.height as number || 100;
    
    // Calculate connection points around the node
    const points = [
      { direction: 'top' as const, position: { x: node.position.x + nodeWidth / 2, y: node.position.y - 20 } },
      { direction: 'bottom' as const, position: { x: node.position.x + nodeWidth / 2, y: node.position.y + nodeHeight + 20 } },
      { direction: 'left' as const, position: { x: node.position.x - 20, y: node.position.y + nodeHeight / 2 } },
      { direction: 'right' as const, position: { x: node.position.x + nodeWidth + 20, y: node.position.y + nodeHeight / 2 } }
    ];
    
    points.forEach(point => {
      connections.push({
        nodeId: node.id,
        position: point.position,
        direction: point.direction,
        isAvailable: true // TODO: Check if connection already exists
      });
    });
    
    return connections;
  }, []);

  const startGuidedPlacement = useCallback((sourceNodeId: string, nodeType: string) => {
    const sourceNode = nodes.find(n => n.id === sourceNodeId);
    if (!sourceNode) return;
    
    const connections = calculateNodeConnectionPoints(sourceNode);
    const suggestedPosition = connections.find(c => c.direction === 'bottom')?.position || 
                             connections[0]?.position || 
                             { x: sourceNode.position.x, y: sourceNode.position.y + 150 };
    
    setGuidedPlacement({
      isActive: true,
      sourceNodeId,
      availableConnections: connections,
      suggestedPosition,
      nodeTypeToAdd: nodeType
    });
  }, [nodes, calculateNodeConnectionPoints]);

  const completeGuidedPlacement = useCallback(async (connectionPoint: NodeConnectionPoint) => {
    if (!guidedPlacement.nodeTypeToAdd || !guidedPlacement.sourceNodeId) return;
    
    // Generate new node ID
    const newNodeId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create new node
    const newNode: Node = {
      id: newNodeId,
      type: guidedPlacement.nodeTypeToAdd,
      position: connectionPoint.position,
      data: {
        label: `New ${guidedPlacement.nodeTypeToAdd}`,
        scenes: scenes,
        characters: characters,
        onSceneSelect: onSceneSelect,
        onModeSwitch: onModeSwitch
      }
    };
    
    // Create new edge
    const newEdge: Edge = {
      id: `edge_${guidedPlacement.sourceNodeId}_${newNodeId}`,
      source: guidedPlacement.sourceNodeId,
      target: newNodeId,
      type: 'smoothstep',
      animated: true
    };
    
    // Update local state
    setNodes(prev => [...prev, newNode]);
    setEdges(prev => [...prev, newEdge]);
    
    // Update database
    if (onStoryMapUpdate) {
      try {
        setSaveStatus('saving');
        await onStoryMapUpdate({
          nodes: [...nodes, newNode],
          edges: [...edges, newEdge]
        });
        setSaveStatus('saved');
        setLastSaveTime(new Date());
      } catch (error) {
        console.error('Failed to save node:', error);
        setSaveStatus('error');
      }
    }
    
    // Reset guided placement
    setGuidedPlacement({
      isActive: false,
      sourceNodeId: null,
      availableConnections: [],
      suggestedPosition: null,
      nodeTypeToAdd: null
    });
  }, [guidedPlacement, nodes, edges, scenes, characters, onSceneSelect, onModeSwitch, onStoryMapUpdate, setNodes, setEdges]);

  const cancelGuidedPlacement = useCallback(() => {
    setGuidedPlacement({
      isActive: false,
      sourceNodeId: null,
      availableConnections: [],
      suggestedPosition: null,
      nodeTypeToAdd: null
    });
  }, []);

  // ✅ Smart Canvas Management Functions
  const recenterCanvas = useCallback(() => {
    if (nodes.length === 0) return;
    
    // Find the start node or the first node
    const startNode = nodes.find(n => n.type === 'startNode') || nodes[0];
    if (startNode) {
      // Will be implemented when ReactFlowInstance is available
      console.log('Recenter to:', startNode.position);
    }
  }, [nodes]);

  const fitToView = useCallback(() => {
    // Will be implemented when ReactFlowInstance is available
    console.log('Fit to view');
  }, []);

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    onNodeSelect(node.id);
  }, [onNodeSelect]);

  // Handle edge selection
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
    onNodeSelect(null);
  }, [onNodeSelect]);

  // Handle canvas click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
    onNodeSelect(null);
  }, [onNodeSelect]);

  // Handle new connections
  const onConnect = useCallback((params: Connection) => {
    const newEdge = {
      ...params,
      id: `edge-${Date.now()}`,
      type: 'default',
      animated: false,
      style: { stroke: '#94a3b8', strokeWidth: 2 }
    };
    setEdges((eds) => addEdge(newEdge as any, eds));
  }, [setEdges]);

  // Handle node drag and drop from palette
  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    
    const reactFlowBounds = (event.target as HTMLElement).getBoundingClientRect();
    const nodeType = event.dataTransfer.getData('application/reactflow');
    
    if (!nodeType) return;

    const position = {
      x: event.clientX - reactFlowBounds.left - 75, // Center the node
      y: event.clientY - reactFlowBounds.top - 25,
    };

    const newNode: Node = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType,
      position,
      data: {
        nodeId: `${nodeType}-${Date.now()}`,
        nodeType: nodeType.replace('Node', '_node'),
        title: `New ${nodeType.replace('Node', '')}`,
        scenes: scenes,
        characters: characters,
        onSceneSelect: onSceneSelect,
        onModeSwitch: onModeSwitch
      }
    };

    setNodes((nds) => nds.concat(newNode));
  }, [scenes, characters, onSceneSelect, onModeSwitch, setNodes]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // ✅ Handle guided placement node creation
  const handleGuidedNodeCreation = useCallback((nodeType: string) => {
    if (selectedNode) {
      startGuidedPlacement(selectedNode.id, nodeType);
    }
  }, [selectedNode, startGuidedPlacement]);

  return (
    <div className="blueprint-room flex h-full bg-background">
      {/* ✅ Enhanced Left Sidebar - Node Palette */}
      <div className="w-80 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Blueprint Room
          </h2>
          <p className="text-sm text-muted-foreground">
            Design your story flow with interactive nodes
          </p>
          
          {/* ✅ Guided Placement Status */}
          {guidedPlacement.isActive && (
            <motion.div 
              className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded-lg"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-sm font-medium text-primary">Guided Mode Active</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Click the blue connection points to add a new {guidedPlacement.nodeTypeToAdd} node
              </p>
              <button
                onClick={cancelGuidedPlacement}
                className="mt-2 text-xs text-muted-foreground hover:text-foreground underline"
              >
                Cancel
              </button>
            </motion.div>
          )}
        </div>
        
        <NodePalette />
      </div>

      {/* ✅ Enhanced Main Canvas Area */}
      <div className="flex-1 relative">
        {/* ✅ Canvas Toolbar */}
        <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
          <motion.div 
            className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={recenterCanvas}
                className="p-2 rounded-md hover:bg-accent transition-colors"
                title="จัดกลางผืนผ้าใบ"
              >
                <Target className="w-4 h-4" />
              </button>
              <button
                onClick={fitToView}
                className="p-2 rounded-md hover:bg-accent transition-colors"
                title="ดูทั้งหมด"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

          {/* ✅ Save Status Indicator */}
          <motion.div 
            className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2 text-sm">
              {saveStatus === 'saving' && (
                <>
                  <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-muted-foreground">กำลังบันทึก...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <Save className="w-3 h-3 text-green-500" />
                  <span className="text-green-600">บันทึกแล้ว</span>
                  {lastSaveTime && (
                    <span className="text-xs text-muted-foreground">
                      {lastSaveTime.toLocaleTimeString('th-TH')}
                    </span>
                  )}
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <AlertCircle className="w-3 h-3 text-red-500" />
                  <span className="text-red-600">ข้อผิดพลาด</span>
                </>
              )}
            </div>
          </motion.div>
        </div>

        {/* ✅ Guided Placement Overlay */}
        <AnimatePresence>
          {guidedPlacement.isActive && (
            <motion.div
              className="absolute inset-0 z-25 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Connection Points */}
              {guidedPlacement.availableConnections.map((connection, index) => (
                <motion.div
                  key={`${connection.nodeId}-${connection.direction}`}
                  className="absolute w-8 h-8 -ml-4 -mt-4 pointer-events-auto cursor-pointer"
                  style={{
                    left: connection.position.x,
                    top: connection.position.y
                  }}
                  initial={{ scale: 0, rotate: 0 }}
                  animate={{ scale: 1, rotate: 360 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => completeGuidedPlacement(connection)}
                >
                  <div className="w-full h-full bg-primary rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
                    <Plus className="w-4 h-4 text-primary-foreground" />
                  </div>
                </motion.div>
              ))}
              
              {/* Cancel Overlay */}
              <div 
                className="absolute inset-0 bg-background/20 backdrop-blur-[1px] pointer-events-auto cursor-pointer"
                onClick={cancelGuidedPlacement}
              />
              
              {/* Instructions */}
              <motion.div
                className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg pointer-events-none"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-sm text-foreground">
                  <strong>คลิกจุดเชื่อมต่อสีน้ำเงิน</strong> เพื่อเพิ่มโหนดใหม่ หรือ <strong>คลิกที่ว่าง</strong> เพื่อยกเลิก
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            attributionPosition="bottom-left"
            className="bg-background"
          >
            {canvasState.showGrid && (
              <Background 
                color="hsl(var(--muted))" 
                variant={"dots" as any}
                gap={20} 
                size={1}
                className="opacity-30"
              />
            )}
            
            <Controls 
              className="react-flow__controls !bg-card !border-border shadow-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground hover:[&>button]:!bg-accent"
            />
            
            {canvasState.showMinimap && (
              <MiniMap 
                className="react-flow__minimap !bg-card !border-border shadow-lg"
                nodeColor="hsl(var(--primary))"
                maskColor="hsl(var(--muted)/0.3)"
              />
            )}
          </ReactFlow>
        </ReactFlowProvider>
      </div>

      {/* ✅ Enhanced Right Sidebar - Inspector Panel */}
      <div className="w-80 bg-card border-l border-border">
        <InspectorPanel
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          storyMap={storyMap}
          scenes={scenes}
          characters={characters}
          onNodeUpdate={(nodeId: string, updates: any) => {
            setNodes((nodes) =>
              nodes.map((node) =>
                node.id === nodeId ? { ...node, data: { ...node.data, ...updates } } : node
              )
            );
            
            // ✅ Auto-save on node update
            if (onStoryMapUpdate) {
              setSaveStatus('saving');
              onStoryMapUpdate({
                nodes: nodes.map((node) =>
                  node.id === nodeId ? { ...node, data: { ...node.data, ...updates } } : node
                ),
                edges: edges
              }).then(() => {
                setSaveStatus('saved');
                setLastSaveTime(new Date());
              }).catch(() => {
                setSaveStatus('error');
              });
            }
          }}
          onEdgeUpdate={(edgeId: string, updates: any) => {
            setEdges((edges) =>
              edges.map((edge) =>
                edge.id === edgeId ? { ...edge, ...updates } : edge
              )
            );
            
            // ✅ Auto-save on edge update
            if (onStoryMapUpdate) {
              setSaveStatus('saving');
              onStoryMapUpdate({
                nodes: nodes,
                edges: edges.map((edge) =>
                  edge.id === edgeId ? { ...edge, ...updates } : edge
                )
              }).then(() => {
                setSaveStatus('saved');
                setLastSaveTime(new Date());
              }).catch(() => {
                setSaveStatus('error');
              });
            }
          }}
        />
      </div>
    </div>
  );
};

export default BlueprintRoom;