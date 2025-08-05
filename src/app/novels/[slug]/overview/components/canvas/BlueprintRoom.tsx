"use client";

import React, { useState, useCallback, useMemo } from 'react';
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
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

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
  onModeSwitch
}) => {
  const { storyMap, scenes, characters } = canvasData;

  // Convert StoryMap data to React Flow format
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

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

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

  return (
    <div className="blueprint-room flex h-full bg-slate-50 dark:bg-slate-900">
      {/* Left Sidebar - Node Palette */}
      <div className="w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Blueprint Room
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Design your story flow with interactive nodes
          </p>
        </div>
        
        <NodePalette />
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative">
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
            className="bg-slate-50 dark:bg-slate-900"
          >
            {canvasState.showGrid && (
              <Background 
                color="#94a3b8" 
                variant={"dots" as any}
                gap={20} 
                size={1}
                className="opacity-30 dark:opacity-20"
              />
            )}
            
            <Controls 
              className="react-flow__controls bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg"
            />
            
            {canvasState.showMinimap && (
              <MiniMap 
                className="react-flow__minimap bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg"
                nodeColor="#3b82f6"
                maskColor="rgba(0, 0, 0, 0.1)"
              />
            )}
          </ReactFlow>
        </ReactFlowProvider>
      </div>

      {/* Right Sidebar - Inspector Panel */}
      <div className="w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700">
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
          }}
          onEdgeUpdate={(edgeId: string, updates: any) => {
            setEdges((edges) =>
              edges.map((edge) =>
                edge.id === edgeId ? { ...edge, ...updates } : edge
              )
            );
          }}
        />
      </div>
    </div>
  );
};

export default BlueprintRoom;