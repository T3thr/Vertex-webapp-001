// app/novels/[slug]/overview/components/TimelineCanvas.tsx
'use client';

import React, { useCallback, useRef, useEffect, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  useReactFlow,
  Panel,
  NodeChange,
  EdgeChange,
  NodeDragHandler,
  OnSelectionChangeParams,
  ReactFlowProvider,
  ConnectionLineType,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Target, 
  Plus, 
  Grid3X3, 
  Sparkles, 
  Gamepad2,
  Crosshair,
  Layers,
  Wand2,
  Stars,
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
  Hand,
  Pointer
} from 'lucide-react';

import { useWorkspace } from './WorkspaceContext';
import EpisodeNode from './EpisodeNode';
import ChapterLane from './ChapterLane';

// กำหนดประเภทของ Node
const nodeTypes = {
  episode: EpisodeNode,
  chapter: ChapterLane,
};

// Custom Edge Style
const customEdgeStyle = {
  strokeWidth: 3,
  stroke: 'url(#gradient)',
};

/**
 * @function TimelineCanvasInner
 * @description Enhanced interactive canvas with game-like features
 */
function TimelineCanvasInner() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
    saveNodePositions,
    setReactFlowInstance,
    selectedNodeId,
    addNode
  } = useWorkspace();
  
  const reactFlowInstance = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  // Interactive States
  const [isDragging, setIsDragging] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [connectionPreview, setConnectionPreview] = useState<{ from: Node | null; to: { x: number; y: number } | null }>({ from: null, to: null });
  const [showGrid, setShowGrid] = useState(true);
  const [canvasMode, setCanvasMode] = useState<'select' | 'add-episode' | 'add-chapter' | 'connect'>('select');
  const [sparkleEffects, setSparkleEffects] = useState<Array<{ id: string; x: number; y: number; timestamp: number }>>([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // เมื่อ Component ถูกโหลด ให้ส่ง reactFlowInstance ไปยัง Context
  useEffect(() => {
    setReactFlowInstance(reactFlowInstance);
  }, [reactFlowInstance, setReactFlowInstance]);
  
  // ติดตาม Mouse Position สำหรับ Interactive Effects
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!reactFlowInstance) return;
    
    const bounds = reactFlowWrapper.current?.getBoundingClientRect();
    if (bounds) {
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      setMousePosition({ x, y });
      
      // Convert to flow coordinates
      const flowPosition = reactFlowInstance.project({ x, y });
      
      // Update connection preview if connecting
      if (isConnecting && connectionPreview.from) {
        setConnectionPreview(prev => ({ ...prev, to: flowPosition }));
      }
    }
  }, [reactFlowInstance, isConnecting, connectionPreview.from]);
  
  // จัดการการคลิก Canvas สำหรับเพิ่ม Node
  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    if (!reactFlowInstance || canvasMode === 'select') return;
    
    const bounds = reactFlowWrapper.current?.getBoundingClientRect();
    if (!bounds) return;
    
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const position = reactFlowInstance.project({ x, y });
    
    // Add sparkle effect
    const sparkleId = `sparkle-${Date.now()}`;
    setSparkleEffects(prev => [...prev, { id: sparkleId, x, y, timestamp: Date.now() }]);
    
    // Remove sparkle after animation
    setTimeout(() => {
      setSparkleEffects(prev => prev.filter(s => s.id !== sparkleId));
    }, 1000);
    
    // Add node based on mode
    if (canvasMode === 'add-episode') {
      addNode('episode', position);
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(25);
      }
    } else if (canvasMode === 'add-chapter') {
      addNode('chapter', position);
      if ('vibrate' in navigator) {
        navigator.vibrate(25);
      }
    }
    
    // Reset mode after adding
    setCanvasMode('select');
  }, [reactFlowInstance, canvasMode, addNode]);
  
  // ฟังก์ชันจัดการการคลิก Node
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    selectNode(node.id);
    
    // Connection mode handling
    if (canvasMode === 'connect') {
      if (!connectionPreview.from) {
        setConnectionPreview({ from: node, to: null });
        setIsConnecting(true);
      } else if (connectionPreview.from.id !== node.id) {
        // Create connection
        const newConnection: Connection = {
          source: connectionPreview.from.id,
          target: node.id,
          sourceHandle: 'bottom',
          targetHandle: 'top'
        };
        onConnect(newConnection);
        
        // Reset connection state
        setConnectionPreview({ from: null, to: null });
        setIsConnecting(false);
        setCanvasMode('select');
        
        // Success feedback
        if ('vibrate' in navigator) {
          navigator.vibrate([50, 50, 50]);
        }
      }
    }
  }, [selectNode, canvasMode, connectionPreview, onConnect]);
  
  // ฟังก์ชันจัดการการคลิกพื้นที่ว่าง
  const onPaneClick = useCallback((event: React.MouseEvent) => {
    // Reset connection state
    if (isConnecting) {
      setConnectionPreview({ from: null, to: null });
      setIsConnecting(false);
      setCanvasMode('select');
    } else {
      selectNode(null);
      handleCanvasClick(event);
    }
  }, [selectNode, handleCanvasClick, isConnecting]);
  
  // ฟังก์ชันจัดการการลาก Node
  const onNodeDragStart: NodeDragHandler = useCallback(() => {
    setIsDragging(true);
  }, []);
  
  const onNodeDragStop: NodeDragHandler = useCallback((event: React.MouseEvent, node: Node, nodes: Node[]) => {
    setIsDragging(false);
    saveNodePositions(nodes);
  }, [saveNodePositions]);
  
  // ฟังก์ชันจัดการการเปลี่ยนแปลงการเลือก
  const onSelectionChange = useCallback(({ nodes }: OnSelectionChangeParams) => {
    if (nodes.length === 1) {
      selectNode(nodes[0].id);
    } else if (nodes.length === 0) {
      selectNode(null);
    }
  }, [selectNode]);
  
  // Custom Connection Line
  const customConnectionLine = ({ fromX, fromY, toX, toY }: any) => (
    <g>
      <defs>
        <linearGradient id="connection-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8} />
          <stop offset="50%" stopColor="#8b5cf6" stopOpacity={1} />
          <stop offset="100%" stopColor="#d946ef" stopOpacity={0.8} />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <path
        d={`M${fromX},${fromY} C${fromX},${fromY + 50} ${toX},${toY - 50} ${toX},${toY}`}
        stroke="url(#connection-gradient)"
        strokeWidth="4"
        fill="none"
        filter="url(#glow)"
        strokeDasharray="5,5"
        className="animate-pulse"
      />
              <circle
        cx={toX}
        cy={toY}
        r="6"
        fill="#8b5cf6"
        className="animate-pulse"
      />
    </g>
  );
  
  // Auto-play simulation mode
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      // Add random sparkle effects during play mode
      if (Math.random() > 0.7) {
        const sparkleId = `auto-sparkle-${Date.now()}`;
        setSparkleEffects(prev => [...prev, { 
          id: sparkleId, 
          x: Math.random() * window.innerWidth, 
          y: Math.random() * window.innerHeight, 
          timestamp: Date.now() 
        }]);
        
        setTimeout(() => {
          setSparkleEffects(prev => prev.filter(s => s.id !== sparkleId));
        }, 1000);
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, [isPlaying]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      
      switch (event.key) {
        case 'e':
        case 'E':
          setCanvasMode('add-episode');
          break;
        case 'c':
        case 'C':
          setCanvasMode('add-chapter');
          break;
        case 'l':
        case 'L':
          setCanvasMode('connect');
          break;
        case 'Escape':
          setCanvasMode('select');
          setIsConnecting(false);
          setConnectionPreview({ from: null, to: null });
          break;
        case ' ':
          event.preventDefault();
          setIsPlaying(!isPlaying);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying]);
  
  // Zoom tracking
  useEffect(() => {
    if (reactFlowInstance) {
      const updateZoom = () => {
        setZoomLevel(reactFlowInstance.getZoom());
      };
      
      if (reactFlowInstance.getViewport()) {
        updateZoom();
      }
      // Note: In a real app, you'd want to listen to zoom changes
    }
  }, [reactFlowInstance]);
  
  return (
    <div 
      ref={reactFlowWrapper} 
      className="w-full h-full relative overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Canvas Mode Indicator */}
      <motion.div
        className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className={`
          px-4 py-2 rounded-full backdrop-blur-sm border shadow-lg flex items-center gap-2
          ${canvasMode === 'select' ? 'bg-card/80 border-border' : 
            canvasMode === 'add-episode' ? 'bg-blue-500/80 border-blue-400 text-white' :
            canvasMode === 'add-chapter' ? 'bg-purple-500/80 border-purple-400 text-white' :
            'bg-green-500/80 border-green-400 text-white'}
        `}>
          {canvasMode === 'select' && <Pointer className="w-4 h-4" />}
          {canvasMode === 'add-episode' && <Plus className="w-4 h-4" />}
          {canvasMode === 'add-chapter' && <Layers className="w-4 h-4" />}
          {canvasMode === 'connect' && <Zap className="w-4 h-4" />}
          
          <span className="text-sm font-medium">
            {canvasMode === 'select' && 'เลือกและจัดการ'}
            {canvasMode === 'add-episode' && 'คลิกเพื่อเพิ่มตอน'}
            {canvasMode === 'add-chapter' && 'คลิกเพื่อเพิ่ม Chapter'}
            {canvasMode === 'connect' && 'คลิกเพื่อเชื่อมต่อ'}
          </span>
          
          {canvasMode !== 'select' && (
            <button
              onClick={() => setCanvasMode('select')}
              className="p-1 rounded-full hover:bg-white/20 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </motion.div>
      
      {/* Interactive Toolbar */}
      <motion.div
        className="absolute top-4 right-4 z-40 flex flex-col gap-2"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        {/* Mode Buttons */}
        <div className="flex flex-col gap-1 bg-card/90 backdrop-blur-sm border border-border rounded-xl p-2 shadow-lg">
          <motion.button
            onClick={() => setCanvasMode('select')}
            className={`p-2 rounded-lg transition-colors ${
              canvasMode === 'select' 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-accent text-muted-foreground'
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="เลือกและจัดการ (Click)"
          >
            <Hand className="w-4 h-4" />
          </motion.button>
          
          <motion.button
            onClick={() => setCanvasMode('add-episode')}
            className={`p-2 rounded-lg transition-colors ${
              canvasMode === 'add-episode' 
                ? 'bg-blue-500 text-white' 
                : 'hover:bg-accent text-muted-foreground'
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="เพิ่มตอน (E)"
          >
            <Plus className="w-4 h-4" />
          </motion.button>
          
          <motion.button
            onClick={() => setCanvasMode('add-chapter')}
            className={`p-2 rounded-lg transition-colors ${
              canvasMode === 'add-chapter' 
                ? 'bg-purple-500 text-white' 
                : 'hover:bg-accent text-muted-foreground'
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="เพิ่ม Chapter (C)"
          >
            <Layers className="w-4 h-4" />
          </motion.button>
          
          <motion.button
            onClick={() => setCanvasMode('connect')}
            className={`p-2 rounded-lg transition-colors ${
              canvasMode === 'connect' 
                ? 'bg-green-500 text-white' 
                : 'hover:bg-accent text-muted-foreground'
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="เชื่อมต่อ (L)"
          >
            <Zap className="w-4 h-4" />
          </motion.button>
        </div>
        
        {/* Playback Controls */}
        <div className="flex flex-col gap-1 bg-card/90 backdrop-blur-sm border border-border rounded-xl p-2 shadow-lg">
          <motion.button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 rounded-lg transition-colors ${
              isPlaying 
                ? 'bg-red-500 text-white' 
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title={isPlaying ? 'หยุดโหมดการเล่น (Space)' : 'เริ่มโหมดการเล่น (Space)'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </motion.button>
        </div>
        
        {/* View Controls */}
        <div className="flex flex-col gap-1 bg-card/90 backdrop-blur-sm border border-border rounded-xl p-2 shadow-lg">
          <motion.button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-lg transition-colors ${
              showGrid 
                ? 'bg-accent text-accent-foreground' 
                : 'hover:bg-accent text-muted-foreground'
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="แสดง/ซ่อนกริด"
          >
            <Grid3X3 className="w-4 h-4" />
          </motion.button>
          
          <motion.button
            onClick={() => reactFlowInstance?.fitView()}
            className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="ดูทั้งหมด"
          >
            <Target className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>
      
      {/* Connection Preview Line */}
      <AnimatePresence>
        {isConnecting && connectionPreview.from && connectionPreview.to && (
          <motion.svg
            className="absolute inset-0 pointer-events-none z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <defs>
              <linearGradient id="preview-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <path
              d={`M${connectionPreview.from.position.x + 144},${connectionPreview.from.position.y + 200} 
                  Q${connectionPreview.to.x},${connectionPreview.from.position.y + 100} 
                  ${connectionPreview.to.x},${connectionPreview.to.y}`}
              stroke="url(#preview-gradient)"
              strokeWidth="3"
              fill="none"
              strokeDasharray="8,4"
              className="animate-pulse"
            />
          </motion.svg>
        )}
      </AnimatePresence>
      
      {/* Sparkle Effects */}
      <AnimatePresence>
        {sparkleEffects.map((sparkle) => (
          <motion.div
            key={sparkle.id}
            className="absolute pointer-events-none z-40"
            style={{ left: sparkle.x, top: sparkle.y }}
            initial={{ scale: 0, rotate: 0 }}
            animate={{ 
              scale: [0, 1.5, 0], 
              rotate: 360,
              opacity: [0, 1, 0]
            }}
            transition={{ duration: 1, ease: "easeInOut" }}
          >
            <Sparkles className="w-6 h-6 text-primary" />
          </motion.div>
        ))}
      </AnimatePresence>
      
      {/* Game-like Status Bar */}
      <motion.div
        className="absolute bottom-4 left-4 right-4 z-40"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="bg-card/90 backdrop-blur-sm border border-border rounded-xl p-3 shadow-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Gamepad2 className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">โหนด:</span>
                <span className="font-medium text-foreground">{nodes.length}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">การเชื่อมต่อ:</span>
                <span className="font-medium text-foreground">{edges.length}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <ZoomIn className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">ซูม:</span>
                <span className="font-medium text-foreground">{Math.round(zoomLevel * 100)}%</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <kbd className="px-1.5 py-0.5 bg-secondary rounded">E</kbd>
              <span>ตอน</span>
              <kbd className="px-1.5 py-0.5 bg-secondary rounded">C</kbd>
              <span>Chapter</span>
              <kbd className="px-1.5 py-0.5 bg-secondary rounded">L</kbd>
              <span>เชื่อมต่อ</span>
              <kbd className="px-1.5 py-0.5 bg-secondary rounded">Space</kbd>
              <span>เล่น</span>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Main ReactFlow */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.1}
        maxZoom={3}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        deleteKeyCode="Delete"
        selectionKeyCode="Shift"
        multiSelectionKeyCode="Control"
        connectionLineComponent={customConnectionLine}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: customEdgeStyle,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 25,
            height: 25,
            color: '#6366f1',
          }
        }}
        className="touch-pan-y"
      >
        {/* Enhanced Background */}
        <Background 
          color={showGrid ? "#6366f1" : "transparent"}
          gap={showGrid ? 20 : 0}
          size={showGrid ? 1 : 0}
          style={{
            backgroundColor: 'var(--background)',
            backgroundImage: isPlaying ? 
              'radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)' : 
              'none'
          }}
        />
        
        {/* Custom Controls */}
        <Controls 
          position="bottom-right"
          showInteractive={false}
          className="!bg-card/90 !backdrop-blur-sm !border !border-border !rounded-xl !shadow-lg [&>button]:!bg-transparent [&>button]:!border-0 [&>button]:!text-foreground hover:[&>button]:!bg-accent"
        />
        
        {/* Enhanced MiniMap */}
        <MiniMap 
          nodeStrokeColor={(n) => {
            if (n.id === selectedNodeId) return '#6366f1';
            return n.type === 'episode' ? '#3b82f6' : '#8b5cf6';
          }}
          nodeColor={(n) => {
            if (n.type === 'chapter') return '#f3f4f6';
            return n.data?.status === 'published' ? '#d1fae5' : 
                   n.data?.status === 'reviewing' ? '#fef3c7' : '#ffffff';
          }}
          className="!bg-card/90 !backdrop-blur-sm !border !border-border !rounded-xl !shadow-lg"
          style={{
            backgroundColor: 'rgba(var(--card), 0.9)',
          }}
        />
        
        {/* SVG Definitions for Gradients */}
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#d946ef" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Help Panel */}
        <Panel position="top-left" className="!bg-card/80 !backdrop-blur-sm !border !border-border !rounded-xl !p-3 !shadow-lg !max-w-xs">
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="font-medium text-foreground mb-2 flex items-center gap-1">
              <Wand2 className="w-3 h-3" />
              คำแนะนำการใช้งาน
            </div>
            <div className="space-y-1">
              <p>• ลากเพื่อเลื่อนพื้นที่</p>
              <p>• Scroll เพื่อซูม</p>
              <p>• กด E เพื่อเพิ่มตอน</p>
              <p>• กด C เพื่อเพิ่ม Chapter</p>
              <p>• กด L เพื่อเชื่อมต่อ</p>
              <p>• กด Space เพื่อเล่น</p>
              <p>• Shift + Click เพื่อเลือกหลายโหนด</p>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

/**
 * @function TimelineCanvas
 * @description Wrapper Component ที่ให้ ReactFlowProvider
 */
export default function TimelineCanvas() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full"
    >
      <ReactFlowProvider>
        <TimelineCanvasInner />
      </ReactFlowProvider>
    </motion.div>
  );
}
        