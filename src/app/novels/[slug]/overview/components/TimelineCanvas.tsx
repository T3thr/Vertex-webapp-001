// app/novels/[slug]/overview/components/TimelineCanvas.tsx
'use client';

import React, { useCallback, useRef, useEffect } from 'react';
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
  ConnectionLineType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion } from 'framer-motion';

import { useWorkspace } from './WorkspaceContext';
import EpisodeNode from './EpisodeNode';
import ChapterLane from './ChapterLane';

// กำหนดประเภทของ Node
const nodeTypes = {
  episode: EpisodeNode,
  chapter: ChapterLane,
};

/**
 * @function TimelineCanvasInner
 * @description Component หลักสำหรับแสดง Timeline และจัดการ Node
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
    selectedNodeId
  } = useWorkspace();
  
  const reactFlowInstance = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  // เมื่อ Component ถูกโหลด ให้ส่ง reactFlowInstance ไปยัง Context
  useEffect(() => {
    setReactFlowInstance(reactFlowInstance);
  }, [reactFlowInstance, setReactFlowInstance]);
  
  // ฟังก์ชันจัดการการคลิก Node
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    selectNode(node.id);
  }, [selectNode]);
  
  // ฟังก์ชันจัดการการคลิกพื้นที่ว่าง
  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);
  
  // ฟังก์ชันจัดการการลาก Node
  const onNodeDragStop: NodeDragHandler = useCallback((event: React.MouseEvent, node: Node, nodes: Node[]) => {
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
  
  return (
    <div ref={reactFlowWrapper} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.2}
        maxZoom={2}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        deleteKeyCode="Delete"
        selectionKeyCode="Shift"
        multiSelectionKeyCode="Control"
        connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 2 }}
        connectionLineType={ConnectionLineType.SmoothStep}
      >
        <Background 
          color="#6366f1" 
          gap={16} 
          size={1} 
        />
        <Controls 
          position="bottom-right"
          showInteractive={false}
          className="bg-card border border-border rounded-lg shadow-md"
        />
        <MiniMap 
          nodeStrokeColor={(n) => {
            if (n.id === selectedNodeId) return '#6366f1';
            return '#ddd';
          }}
          nodeColor={(n) => {
            if (n.type === 'chapter') return '#f3f4f6';
            return n.data.status === 'published' ? '#d1fae5' : '#ffffff';
          }}
          className="bg-card border border-border rounded-lg shadow-md"
        />
        
        <Panel position="top-left" className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-2 shadow-md">
          <div className="text-xs text-muted-foreground">
            <p>ลากเพื่อเลื่อน • Scroll เพื่อซูม • Shift + คลิกเพื่อเลือกหลายตอน</p>
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

