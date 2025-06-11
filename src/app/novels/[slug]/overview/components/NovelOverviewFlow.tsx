'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  EdgeChange,
  NodeChange,
  Position,
  MarkerType,
  ConnectionMode,
} from 'reactflow';
import { 
  Plus, 
  Settings, 
  Save, 
  RotateCcw, 
  Download, 
  Upload,
  Play,
  Square,
  Circle,
  Diamond,
  Triangle,
  Trash2,
  Edit3,
  Copy
} from 'lucide-react';

// Import CSS สำหรับ ReactFlow
import 'reactflow/dist/style.css';

// Types สำหรับ Node และ Edge
interface StoryNode extends Node {
  data: {
    label: string;
    type: 'start' | 'scene' | 'choice' | 'ending' | 'branch' | 'merge';
    description?: string;
    sceneId?: string;
    choiceIds?: string[];
  };
}

interface StoryEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  markerEnd?: {
    type: MarkerType;
    width: number;
    height: number;
    color: string;
  };
  style?: {
    strokeWidth: number;
    stroke: string;
  };
  data?: {
    choiceId?: string;
    condition?: string;
    label?: string;
  };
  sourceHandle?: string;
  targetHandle?: string;
}

interface NovelOverviewFlowProps {
  nodes: Array<{
    nodeId: string;
    nodeType: string;
    title: string;
    position: { x: number; y: number };
  }>;
  edges: Array<{
    edgeId: string;
    sourceNodeId: string;
    targetNodeId: string;
  }>;
  novelId: string;
}

// Custom Node Components
const StartNode = ({ data, selected }: { data: any; selected: boolean }) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    className={`
      px-4 py-3 bg-green-500 text-white rounded-full border-2 transition-all
      ${selected ? 'border-yellow-400 shadow-lg' : 'border-green-600'}
      cursor-pointer min-w-[120px] text-center font-medium
    `}
  >
    <Play className="w-4 h-4 inline-block mr-2" />
    {data.label}
  </motion.div>
);

const SceneNode = ({ data, selected }: { data: any; selected: boolean }) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    className={`
      px-4 py-3 bg-blue-500 text-white rounded-lg border-2 transition-all
      ${selected ? 'border-yellow-400 shadow-lg' : 'border-blue-600'}
      cursor-pointer min-w-[140px] text-center font-medium
    `}
  >
    <Square className="w-4 h-4 inline-block mr-2" />
    {data.label}
  </motion.div>
);

const ChoiceNode = ({ data, selected }: { data: any; selected: boolean }) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    className={`
      px-4 py-3 bg-purple-500 text-white rounded-lg border-2 transition-all
      ${selected ? 'border-yellow-400 shadow-lg' : 'border-purple-600'}
      cursor-pointer min-w-[140px] text-center font-medium transform rotate-45
    `}
  >
    <div className="transform -rotate-45">
      <Diamond className="w-4 h-4 inline-block mr-2" />
      {data.label}
    </div>
  </motion.div>
);

const EndingNode = ({ data, selected }: { data: any; selected: boolean }) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    className={`
      px-4 py-3 bg-red-500 text-white rounded-full border-2 transition-all
      ${selected ? 'border-yellow-400 shadow-lg' : 'border-red-600'}
      cursor-pointer min-w-[120px] text-center font-medium
    `}
  >
    <Circle className="w-4 h-4 inline-block mr-2" />
    {data.label}
  </motion.div>
);

const BranchNode = ({ data, selected }: { data: any; selected: boolean }) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    className={`
      px-4 py-3 bg-orange-500 text-white rounded-lg border-2 transition-all
      ${selected ? 'border-yellow-400 shadow-lg' : 'border-orange-600'}
      cursor-pointer min-w-[140px] text-center font-medium
    `}
  >
    <Triangle className="w-4 h-4 inline-block mr-2" />
    {data.label}
  </motion.div>
);

// กำหนด Custom Node Types
const nodeTypes = {
  start: StartNode,
  scene: SceneNode,
  choice: ChoiceNode,
  ending: EndingNode,
  branch: BranchNode,
  merge: SceneNode, // ใช้ SceneNode เป็นแบบ
};

/**
 * NovelOverviewFlow - คอมโพเนนต์หลักสำหรับจัดการแผนผังเรื่อง
 * ใช้ ReactFlow สำหรับการแสดงผลและจัดการ nodes/edges
 */
export default function NovelOverviewFlow({ nodes: initialNodes, edges: initialEdges, novelId }: NovelOverviewFlowProps) {
  // แปลงข้อมูลจาก props เป็นรูปแบบที่ ReactFlow ใช้ได้
  const convertToReactFlowNodes = useCallback((nodes: any[]): StoryNode[] => {
    return nodes.map((node) => ({
      id: node.nodeId,
      type: node.nodeType === 'start_node' ? 'start' : 
            node.nodeType === 'scene_node' ? 'scene' :
            node.nodeType === 'choice_node' ? 'choice' :
            node.nodeType === 'ending_node' ? 'ending' :
            node.nodeType === 'branch_node' ? 'branch' : 'scene',
      position: node.position,
      data: { 
        label: node.title,
        type: node.nodeType,
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    }));
  }, []);

  const convertToReactFlowEdges = useCallback((edges: any[]): StoryEdge[] => {
    return edges.map((edge) => ({
      id: edge.edgeId,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      type: 'smoothstep',
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#6366f1',
      },
      style: {
        strokeWidth: 2,
        stroke: '#6366f1',
      },
    }));
  }, []);

  // State สำหรับ nodes และ edges
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialNodes.length > 0 ? convertToReactFlowNodes(initialNodes) : []
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialEdges.length > 0 ? convertToReactFlowEdges(initialEdges) : []
  );

  // State สำหรับ UI
  const [selectedNodeType, setSelectedNodeType] = useState<string>('scene');
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedNode, setSelectedNode] = useState<StoryNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Refs
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // ฟังก์ชันสำหรับเพิ่ม Node ใหม่
  const addNode = useCallback((type: string) => {
    const newNodeId = `node_${Date.now()}`;
    const position = { 
      x: Math.random() * 500 + 100, 
      y: Math.random() * 300 + 100 
    };

    const newNode: StoryNode = {
      id: newNodeId,
      type: type,
      position,
      data: { 
        label: `${type === 'start' ? 'เริ่มต้น' : 
                 type === 'scene' ? 'ฉาก' :
                 type === 'choice' ? 'ตัวเลือก' :
                 type === 'ending' ? 'จบ' :
                 type === 'branch' ? 'แยกเส้นทาง' : 'โหนด'} ใหม่`,
        type: type as 'start' | 'scene' | 'choice' | 'ending' | 'branch' | 'merge',
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    };

    setNodes((nds) => nds.concat(newNode));
  }, [setNodes]);

  // ฟังก์ชันสำหรับเชื่อมต่อ nodes
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: StoryEdge = {
        ...params,
        id: `edge_${Date.now()}`,
        type: 'smoothstep',
        animated: true,
        source: params.source ?? '',
        target: params.target ?? '',
        sourceHandle: params.sourceHandle ?? '',
        targetHandle: params.targetHandle ?? '',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#6366f1',
        },
        style: {
          strokeWidth: 2,
          stroke: '#6366f1',
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // ฟังก์ชันสำหรับลบ node ที่เลือก
  const deleteSelectedNode = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      setEdges((eds) => eds.filter((edge) => 
        edge.source !== selectedNode.id && edge.target !== selectedNode.id
      ));
      setSelectedNode(null);
    }
  }, [selectedNode, setNodes, setEdges]);

  // ฟังก์ชันสำหรับบันทึกข้อมูล
  const saveStoryMap = async () => {
    setIsLoading(true);
    try {
      const storyMapData = {
        nodes: nodes.map((node) => ({
          nodeId: node.id,
          nodeType: node.data.type + '_node',
          title: node.data.label,
          position: node.position,
        })),
        edges: edges.map((edge) => ({
          edgeId: edge.id,
          sourceNodeId: edge.source,
          targetNodeId: edge.target,
        })),
      };

      const response = await fetch(`/api/novels/${novelId}/storymap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storyMapData),
      });

      if (response.ok) {
        // แสดงการแจ้งเตือนความสำเร็จ
        console.log('บันทึกแผนผังเรื่องสำเร็จ');
      } else {
        throw new Error('ไม่สามารถบันทึกได้');
      }
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการบันทึก:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ฟังก์ชันสำหรับรีเซ็ต
  const resetStoryMap = () => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
  };

  // ฟังก์ชันสำหรับจัดวาง nodes อัตโนมัติ
  const autoLayout = () => {
    const layoutedNodes = nodes.map((node, index) => ({
      ...node,
      position: {
        x: (index % 4) * 200 + 100,
        y: Math.floor(index / 4) * 150 + 100,
      },
    }));
    setNodes(layoutedNodes);
  };

  // รายการปุ่มสำหรับเพิ่ม Node
  const nodeTypeButtons = [
    { type: 'start', label: 'เริ่มต้น', icon: Play, color: 'bg-green-500 hover:bg-green-600' },
    { type: 'scene', label: 'ฉาก', icon: Square, color: 'bg-blue-500 hover:bg-blue-600' },
    { type: 'choice', label: 'ตัวเลือก', icon: Diamond, color: 'bg-purple-500 hover:bg-purple-600' },
    { type: 'branch', label: 'แยกเส้นทาง', icon: Triangle, color: 'bg-orange-500 hover:bg-orange-600' },
    { type: 'ending', label: 'จบ', icon: Circle, color: 'bg-red-500 hover:bg-red-600' },
  ];

  return (
    <div className="relative w-full h-full bg-background">
      {/* แถบเครื่องมือด้านบน */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-4 left-4 right-4 z-10 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* ปุ่มเพิ่ม Node */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">เพิ่มโหนด:</span>
            {nodeTypeButtons.map((button) => (
              <motion.button
                key={button.type}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => addNode(button.type)}
                className={`
                  px-3 py-2 rounded-lg text-white text-sm font-medium transition-colors
                  ${button.color}
                  flex items-center gap-2
                `}
                title={`เพิ่ม${button.label}`}
              >
                <button.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{button.label}</span>
              </motion.button>
            ))}
          </div>

          {/* ปุ่มการดำเนินการ */}
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={autoLayout}
              className="px-3 py-2 bg-accent hover:bg-accent/80 text-accent-foreground rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              title="จัดวางอัตโนมัติ"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">จัดวาง</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={resetStoryMap}
              className="px-3 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              title="รีเซ็ต"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">รีเซ็ต</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={saveStoryMap}
              disabled={isLoading}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              title="บันทึก"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isLoading ? 'กำลังบันทึก...' : 'บันทึก'}
              </span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* แผนผัง ReactFlow */}
      <div ref={reactFlowWrapper} className="w-full h-full pt-20">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          attributionPosition="bottom-left"
          className="bg-background"
          onNodeClick={(event, node) => setSelectedNode(node as StoryNode)}
          onPaneClick={() => setSelectedNode(null)}
        >
          <Background 
            color="#e2e8f0" 
            gap={20} 
            size={1}
          />
          <Controls className="bg-card border border-border" />
          <MiniMap 
            className="bg-card border border-border"
            nodeColor={(node) => {
              switch (node.type) {
                case 'start': return '#10b981';
                case 'scene': return '#3b82f6';
                case 'choice': return '#8b5cf6';
                case 'branch': return '#f59e0b';
                case 'ending': return '#ef4444';
                default: return '#6b7280';
              }
            }}
          />
        </ReactFlow>
      </div>

      {/* แผงข้อมูล Node ที่เลือก */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute top-4 right-4 w-80 bg-card border border-border rounded-lg p-4 shadow-lg z-20"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                แก้ไขโหนด
              </h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  ชื่อโหนด
                </label>
                <input
                  type="text"
                  value={selectedNode.data.label}
                  onChange={(e) => {
                    setNodes((nds) =>
                      nds.map((node) =>
                        node.id === selectedNode.id
                          ? { ...node, data: { ...node.data, label: e.target.value } }
                          : node
                      )
                    );
                    setSelectedNode({
                      ...selectedNode,
                      data: { ...selectedNode.data, label: e.target.value }
                    });
                  }}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="ใส่ชื่อโหนด"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  ประเภท
                </label>
                <div className="text-sm text-muted-foreground bg-secondary px-3 py-2 rounded-lg">
                  {selectedNode.data.type === 'start' && 'โหนดเริ่มต้น'}
                  {selectedNode.data.type === 'scene' && 'โหนดฉาก'}
                  {selectedNode.data.type === 'choice' && 'โหนดตัวเลือก'}
                  {selectedNode.data.type === 'branch' && 'โหนดแยกเส้นทาง'}
                  {selectedNode.data.type === 'ending' && 'โหนดจบ'}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // Copy node
                    const copiedNode = {
                      ...selectedNode,
                      id: `node_${Date.now()}`,
                      position: {
                        x: selectedNode.position.x + 50,
                        y: selectedNode.position.y + 50,
                      },
                      data: {
                        ...selectedNode.data,
                        label: selectedNode.data.label + ' (คัดลอก)',
                      },
                    };
                    setNodes((nds) => nds.concat(copiedNode));
                  }}
                  className="flex-1 px-3 py-2 bg-accent hover:bg-accent/80 text-accent-foreground rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  คัดลอก
                </button>
                
                <button
                  onClick={deleteSelectedNode}
                  className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  ลบ
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* คำแนะนำการใช้งาน */}
      {nodes.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="text-center p-8 bg-card/50 backdrop-blur-sm border border-border rounded-xl">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              เริ่มสร้างแผนผังเรื่องของคุณ
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              คลิกปุ่ม &quot;เริ่มต้น&quot; ด้านบนเพื่อเพิ่มโหนดแรก 
              หรือลากวางเพื่อสร้างเส้นทางเรื่องราว
            </p>
            <div className="text-6xl mb-4">📖</div>
            <div className="text-sm text-muted-foreground">
              เคล็ดลับ: ใช้เมาส์คลิกและลากเพื่อเชื่อมต่อโหนดต่างๆ
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}