// src/app/novels/[slug]/overview/components/tabs/BlueprintTab.tsx
"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Play,
  Square,
  Diamond,
  Circle,
  ArrowRight,
  GitBranch,
  MessageSquare,
  Settings,
  Trash2,
  Copy,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Grid3X3,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';

import { NovelData, EpisodeData, StoryMapData } from '../../page';

// Interface สำหรับ Node Types
export interface StoryNode {
  id: string;
  type: 'start' | 'scene' | 'choice' | 'branch' | 'ending' | 'comment';
  title: string;
  position: { x: number; y: number };
  data: any;
  connections: string[];
}

// Interface สำหรับ Blueprint Tab Props
interface BlueprintTabProps {
  novel: NovelData;
  episodes: EpisodeData[];
  storyMap: StoryMapData | null;
  characters: any[];
  scenes: any[];
  userMedia: any[];
  officialMedia: any[];
  editorState: any;
  updateEditorState: (updates: any) => void;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

// Interface สำหรับ Canvas State
interface CanvasState {
  zoom: number;
  pan: { x: number; y: number };
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isDragging: boolean;
  isConnecting: boolean;
  connectingFrom: string | null;
  showGrid: boolean;
  showMinimap: boolean;
}

const BlueprintTab: React.FC<BlueprintTabProps> = ({
  novel,
  episodes,
  storyMap,
  characters,
  scenes,
  userMedia,
  officialMedia,
  editorState,
  updateEditorState,
  isMobile,
  isTablet,
  isDesktop
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(!isMobile);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(!isMobile);

  // Canvas State
  const [canvasState, setCanvasState] = useState<CanvasState>({
    zoom: 1,
    pan: { x: 0, y: 0 },
    selectedNodeId: null,
    selectedEdgeId: null,
    isDragging: false,
    isConnecting: false,
    connectingFrom: null,
    showGrid: true,
    showMinimap: true
  });

  // Convert StoryMap data to nodes (ใช้ข้อมูลจริงจาก MongoDB)
  const nodes = useMemo((): StoryNode[] => {
    if (!storyMap || !storyMap.nodes) return [];
    
    return storyMap.nodes.map(node => ({
      id: node.nodeId,
      type: node.nodeType === 'start_node' ? 'start' :
            node.nodeType === 'scene_node' ? 'scene' :
            node.nodeType === 'choice_node' ? 'choice' :
            node.nodeType === 'branch_node' ? 'branch' :
            node.nodeType === 'ending_node' ? 'ending' : 'comment',
      title: node.title,
      position: node.position,
      data: node.nodeSpecificData,
      connections: storyMap.edges
        .filter(edge => edge.sourceNodeId === node.nodeId)
        .map(edge => edge.targetNodeId)
    })) as StoryNode[];
  }, [storyMap]);

  // Node Type Configurations
  const nodeTypes = [
    {
      type: 'scene',
      label: 'ฉาก',
      icon: Square,
      color: 'bg-blue-500',
      description: 'ฉากในเรื่อง'
    },
    {
      type: 'choice',
      label: 'ตัวเลือก',
      icon: GitBranch,
      color: 'bg-green-500',
      description: 'ทางเลือกสำหรับผู้อ่าน'
    },
    {
      type: 'branch',
      label: 'เงื่อนไข',
      icon: Diamond,
      color: 'bg-yellow-500',
      description: 'เงื่อนไขในการแยกเส้นเรื่อง'
    },
    {
      type: 'ending',
      label: 'จบ',
      icon: Circle,
      color: 'bg-red-500',
      description: 'จุดจบของเรื่อง'
    },
    {
      type: 'comment',
      label: 'หมายเหตุ',
      icon: MessageSquare,
      color: 'bg-gray-500',
      description: 'หมายเหตุสำหรับนักเขียน'
    }
  ];

  // Canvas Handlers
  const handleZoomIn = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      zoom: Math.min(prev.zoom * 1.2, 3)
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      zoom: Math.max(prev.zoom / 1.2, 0.1)
    }));
  }, []);

  const handleResetView = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      zoom: 1,
      pan: { x: 0, y: 0 }
    }));
  }, []);

  const handleToggleGrid = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      showGrid: !prev.showGrid
    }));
  }, []);

  // Node Handlers
  const handleNodeSelect = useCallback((nodeId: string) => {
    setCanvasState(prev => ({
      ...prev,
      selectedNodeId: nodeId
    }));
    updateEditorState({ selectedNodeId: nodeId });
  }, [updateEditorState]);

  const handleAddNode = useCallback(async (type: string, position?: { x: number; y: number }) => {
    try {
      const response = await fetch(`/api/novels/${novel.slug}/storymap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeType: `${type}_node`,
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
          position: position || { x: 100, y: 100 },
          nodeSpecificData: {}
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Node added successfully:', result.data.node);
        updateEditorState({ hasUnsavedChanges: false });
        // TODO: Refresh storyMap data
      } else {
        console.error('Failed to add node:', await response.text());
      }
    } catch (error) {
      console.error('Error adding node:', error);
    }
  }, [novel.slug, updateEditorState]);

  const handleDeleteNode = useCallback(async (nodeId: string) => {
    // TODO: Implement API call to delete node from StoryMap
    console.log('Deleting node:', nodeId);
    updateEditorState({ hasUnsavedChanges: true });
  }, [updateEditorState]);

  const handleDuplicateNode = useCallback(async (nodeId: string) => {
    // TODO: Implement API call to duplicate node
    console.log('Duplicating node:', nodeId);
    updateEditorState({ hasUnsavedChanges: true });
  }, [updateEditorState]);

  // Render Node Component
  const renderNode = useCallback((node: StoryNode) => {
    const nodeTypeConfig = nodeTypes.find(nt => nt.type === node.type);
    if (!nodeTypeConfig) return null;

    const Icon = nodeTypeConfig.icon;
    const isSelected = canvasState.selectedNodeId === node.id;
    const isStart = node.type === 'start';

    return (
      <motion.div
        key={node.id}
        className={`
          absolute cursor-pointer select-none
          ${isSelected ? 'z-20' : 'z-10'}
        `}
        style={{
          left: `${node.position.x}px`,
          top: `${node.position.y}px`,
          transform: `scale(${canvasState.zoom})`
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: canvasState.zoom, opacity: 1 }}
        whileHover={{ scale: canvasState.zoom * 1.05 }}
        whileTap={{ scale: canvasState.zoom * 0.95 }}
        onClick={() => handleNodeSelect(node.id)}
      >
        {/* Node Body */}
        <div className={`
          relative min-w-32 p-3 rounded-lg shadow-lg border-2 transition-all
          ${isSelected 
            ? 'border-primary shadow-primary/20' 
            : 'border-border hover:border-primary/50'
          }
          ${isStart 
            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
            : 'bg-card text-card-foreground'
          }
        `}>
          {/* Node Icon */}
          <div className={`
            flex items-center justify-center w-8 h-8 rounded-full mb-2
            ${isStart ? 'bg-white/20' : nodeTypeConfig.color}
          `}>
            {isStart ? (
              <Play className="w-4 h-4 text-white" />
            ) : (
              <Icon className="w-4 h-4 text-white" />
            )}
          </div>

          {/* Node Title */}
          <div className="text-sm font-medium mb-1 line-clamp-2">
            {node.title}
          </div>

          {/* Node Type Label */}
          <div className={`
            text-xs px-2 py-1 rounded-full inline-block
            ${isStart 
              ? 'bg-white/20 text-white' 
              : 'bg-muted text-muted-foreground'
            }
          `}>
            {isStart ? 'เริ่มต้น' : nodeTypeConfig.label}
          </div>

          {/* Connection Points */}
          {node.connections.map((_, index) => (
            <div
              key={index}
              className="absolute w-3 h-3 bg-primary rounded-full border-2 border-background cursor-crosshair"
                          style={{
              right: '-6px',
              top: `${20 + (index * 15)}px`
            }}
              title="จุดเชื่อมต่อ"
            />
          ))}

          {/* Input Connection Point */}
          {!isStart && (
            <div
              className="absolute w-3 h-3 bg-muted-foreground rounded-full border-2 border-background"
                          style={{
              left: '-6px',
              top: '20px'
            }}
              title="จุดรับเชื่อมต่อ"
            />
          )}

          {/* Selection Ring */}
          {isSelected && (
            <motion.div
              className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)'
              }}
            />
          )}
        </div>
      </motion.div>
    );
  }, [canvasState, nodeTypes, handleNodeSelect]);

  // Render Left Panel (Node Palette)
  const renderLeftPanel = () => (
    <AnimatePresence>
      {isLeftPanelOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: isMobile ? '100%' : 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          className="bg-card border-r border-border flex flex-col"
        >
          {/* Panel Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Node Palette</h3>
              <button
                onClick={() => setIsLeftPanelOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ลากเพื่อเพิ่ม Node ใหม่
            </p>
          </div>

          {/* Node Types */}
          <div className="flex-1 p-4 space-y-2">
            {nodeTypes.map((nodeType) => {
              const Icon = nodeType.icon;
              
              return (
                <motion.button
                  key={nodeType.type}
                  className="w-full flex items-center p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAddNode(nodeType.type)}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${nodeType.color}`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-foreground">
                      {nodeType.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {nodeType.description}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Episode List */}
          <div className="p-4 border-t border-border">
            <h4 className="text-sm font-medium text-foreground mb-2">ตอน</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
              {episodes.map((episode) => (
                <button
                  key={episode._id}
                  className="w-full text-left p-2 text-xs rounded hover:bg-accent transition-colors"
                >
                  <div className="font-medium text-foreground">
                    {episode.title}
                  </div>
                  <div className="text-muted-foreground">
                    ตอนที่ {episode.episodeOrder}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render Right Panel (Properties)
  const renderRightPanel = () => (
    <AnimatePresence>
      {isRightPanelOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: isMobile ? '100%' : 300, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          className="bg-card border-l border-border flex flex-col"
        >
          {/* Panel Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Properties</h3>
              <button
                onClick={() => setIsRightPanelOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Properties Content */}
          <div className="flex-1 p-4">
            {canvasState.selectedNodeId ? (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">
                  Node Properties
                </h4>
                {/* TODO: Implement node properties editor */}
                <div className="text-sm text-muted-foreground">
                  Selected: {canvasState.selectedNodeId}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8">
                เลือก Node เพื่อแสดง Properties
              </div>
            )}
          </div>

          {/* Actions */}
          {canvasState.selectedNodeId && (
            <div className="p-4 border-t border-border space-y-2">
              <button
                onClick={() => handleDuplicateNode(canvasState.selectedNodeId!)}
                className="w-full flex items-center justify-center px-3 py-2 text-sm bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors"
              >
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </button>
              <button
                onClick={() => handleDeleteNode(canvasState.selectedNodeId!)}
                className="w-full flex items-center justify-center px-3 py-2 text-sm bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/80 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render Canvas Toolbar
  const renderCanvasToolbar = () => (
    <div className="absolute top-4 right-4 z-30 flex items-center space-x-2">
      {/* Panel Toggles */}
      {!isLeftPanelOpen && (
        <button
          onClick={() => setIsLeftPanelOpen(true)}
          className="p-2 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground shadow-sm"
          title="แสดง Node Palette"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {!isRightPanelOpen && (
        <button
          onClick={() => setIsRightPanelOpen(true)}
          className="p-2 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground shadow-sm"
          title="แสดง Properties"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Canvas Controls */}
      <div className="flex items-center bg-card border border-border rounded-lg shadow-sm">
        <button
          onClick={handleZoomIn}
          className="p-2 text-muted-foreground hover:text-foreground"
          title="ขยาย"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 text-muted-foreground hover:text-foreground border-l border-border"
          title="ย่อ"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          className="p-2 text-muted-foreground hover:text-foreground border-l border-border"
          title="รีเซ็ต"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={handleToggleGrid}
          className={`p-2 border-l border-border ${canvasState.showGrid ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          title="แสดง/ซ่อน Grid"
        >
          <Grid3X3 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-full flex bg-background">
      {/* Left Panel - Node Palette */}
      {renderLeftPanel()}

      {/* Main Canvas Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Canvas Toolbar */}
        {renderCanvasToolbar()}

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="w-full h-full relative cursor-grab active:cursor-grabbing"
          style={{
            backgroundImage: canvasState.showGrid 
              ? `radial-gradient(circle, hsl(var(--muted-foreground)) 1px, transparent 1px)`
              : 'none',
            backgroundSize: '20px 20px',
            backgroundPosition: `${canvasState.pan.x}px ${canvasState.pan.y}px`
          }}
        >
          {/* Nodes */}
          <div className="absolute inset-0">
            {nodes.map(renderNode)}
          </div>

          {/* Connections/Edges */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {storyMap?.edges?.map((edge) => {
              const sourceNode = nodes.find(n => n.id === edge.sourceNodeId);
              const targetNode = nodes.find(n => n.id === edge.targetNodeId);
              
              if (!sourceNode || !targetNode) return null;
              
              const startX = (sourceNode.position.x + 128) * canvasState.zoom + canvasState.pan.x;
              const startY = (sourceNode.position.y + 40) * canvasState.zoom + canvasState.pan.y;
              const endX = targetNode.position.x * canvasState.zoom + canvasState.pan.x;
              const endY = (targetNode.position.y + 40) * canvasState.zoom + canvasState.pan.y;

              return (
                <motion.path
                  key={edge.edgeId}
                  d={`M ${startX} ${startY} Q ${startX + 50} ${startY} ${endX} ${endY}`}
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  fill="none"
                  className="drop-shadow-sm"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
            
            {/* Arrow marker */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="hsl(var(--primary))"
                />
              </marker>
            </defs>
          </svg>

          {/* Empty State */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  เริ่มสร้าง Story Map
                </h3>
                <p className="text-muted-foreground mb-4">
                  เพิ่ม Node แรกเพื่อเริ่มต้นการวางโครงเรื่อง
                </p>
                <button
                  onClick={() => handleAddNode('scene')}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2 inline" />
                  เพิ่ม Scene แรก
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Properties */}
      {renderRightPanel()}
    </div>
  );
};

export default BlueprintTab;
