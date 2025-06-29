// app/novels/[slug]/overview/components/WorkspaceContext.tsx
'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { 
  Node, 
  Edge, 
  Connection, 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  ReactFlowInstance,
  MarkerType,
  XYPosition
} from 'reactflow';
// Custom debounce function to avoid lodash dependency
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

// Types
import { NovelData, EpisodeData, StoryMapData } from '../page';

/**
 * @interface WorkspaceContextType
 * @description ประเภทข้อมูลสำหรับ Context ของ Workspace
 */
interface WorkspaceContextType {
  // ข้อมูลนิยาย
  novel: NovelData;
  
  // ข้อมูลตอน
  episodes: EpisodeData[];
  
  // ข้อมูล StoryMap
  storyMap: StoryMapData | null;
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (connection: Connection) => void;
  
  // สถานะการทำงาน
  isLoading: boolean;
  isSaving: boolean;
  
  // สถานะ UI
  selectedNodeId: string | null;
  sidebarOpen: boolean;
  inspectorOpen: boolean;
  
  // ReactFlow Instance
  reactFlowInstance: ReactFlowInstance | null;
  setReactFlowInstance: (instance: ReactFlowInstance) => void;
  
  // ฟังก์ชันจัดการ Node
  selectNode: (nodeId: string | null) => void;
  addNode: (nodeType: string, position: XYPosition) => void;
  updateNode: (nodeId: string, data: any) => void;
  deleteNode: (nodeId: string) => void;
  
  // ฟังก์ชันจัดการ Edge
  addEdge: (params: Edge | Connection) => void;
  deleteEdge: (edgeId: string) => void;
  
  // ฟังก์ชันจัดการ Chapter
  addChapter: (title: string, position: XYPosition) => void;
  updateChapter: (chapterId: string, data: any) => void;
  deleteChapter: (chapterId: string) => void;
  
  // ฟังก์ชันจัดการ UI
  toggleSidebar: () => void;
  toggleInspector: () => void;
  
  // ฟังก์ชันบันทึกข้อมูล
  saveStoryMap: () => Promise<void>;
  saveNodePositions: (nodes: Node[]) => void; // debounced
}

// สร้าง Context
const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

/**
 * @function WorkspaceProvider
 * @description Provider Component สำหรับ WorkspaceContext
 */
export function WorkspaceProvider({ 
  children, 
  novel,
  episodes,
  storyMap
}: { 
  children: React.ReactNode, 
  novel: NovelData,
  episodes: EpisodeData[],
  storyMap: StoryMapData | null
}) {
  // State สำหรับ ReactFlow
  const [nodes, setNodes, onNodesChange] = useNodesState(
    storyMap?.nodes ? convertToReactFlowNodes(storyMap.nodes, episodes) : []
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    storyMap?.edges ? convertToReactFlowEdges(storyMap.edges) : []
  );
  
  // State สำหรับ UI
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [inspectorOpen, setInspectorOpen] = useState<boolean>(false);
  
  // State สำหรับการทำงาน
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  
  // Refs
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  /**
   * แปลงข้อมูล Node จาก StoryMap เป็นรูปแบบที่ ReactFlow ใช้ได้
   */
  function convertToReactFlowNodes(storyMapNodes: any[], episodes: EpisodeData[]): Node[] {
    return storyMapNodes.map((node) => {
      // หาข้อมูลตอนที่เกี่ยวข้องกับ Node นี้ (ถ้ามี)
      const episodeId = node.nodeSpecificData?.episodeId || null;
      const episode = episodeId ? episodes.find(ep => ep._id === episodeId) : null;
      
      return {
        id: node.nodeId,
        type: node.nodeType === 'scene_node' ? 'episode' : 
              node.nodeType === 'chapter_node' ? 'chapter' : 'default',
        position: node.position,
        data: { 
          title: node.title,
          nodeType: node.nodeType,
          episodeId: episodeId,
          status: episode?.status || 'draft',
          wordCount: episode?.stats?.totalWords || 0,
          readingTime: episode?.stats?.estimatedReadingTimeMinutes || 0
        },
      };
    });
  }
  
  /**
   * แปลงข้อมูล Edge จาก StoryMap เป็นรูปแบบที่ ReactFlow ใช้ได้
   */
  function convertToReactFlowEdges(storyMapEdges: any[]): Edge[] {
    return storyMapEdges.map((edge) => ({
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
  }
  
  /**
   * แปลงข้อมูล Node จาก ReactFlow เป็นรูปแบบที่ StoryMap ใช้ได้
   */
  function convertToStoryMapNodes(reactFlowNodes: Node[]): any[] {
    return reactFlowNodes.map((node) => ({
      nodeId: node.id,
      nodeType: node.type === 'episode' ? 'scene_node' : 
                node.type === 'chapter' ? 'chapter_node' : 'default_node',
      title: node.data.title,
      position: node.position,
      nodeSpecificData: {
        episodeId: node.data.episodeId || null
      }
    }));
  }
  
  /**
   * แปลงข้อมูล Edge จาก ReactFlow เป็นรูปแบบที่ StoryMap ใช้ได้
   */
  function convertToStoryMapEdges(reactFlowEdges: Edge[]): any[] {
    return reactFlowEdges.map((edge) => ({
      edgeId: edge.id,
      sourceNodeId: edge.source,
      targetNodeId: edge.target
    }));
  }
  
  /**
   * เลือก Node
   */
  const selectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    if (nodeId && !inspectorOpen) {
      setInspectorOpen(true);
    }
  }, [inspectorOpen]);
  
  /**
   * เพิ่ม Node ใหม่
   */
  const addNode = useCallback((nodeType: string, position: XYPosition) => {
    const newNodeId = `node_${Date.now()}`;
    
    const newNode: Node = {
      id: newNodeId,
      type: nodeType,
      position,
      data: { 
        title: nodeType === 'episode' ? 'ตอนใหม่' : 'Chapter ใหม่',
        nodeType: nodeType === 'episode' ? 'scene_node' : 'chapter_node',
        episodeId: null,
        status: 'draft',
        wordCount: 0,
        readingTime: 0
      },
    };
    
    setNodes((nds) => [...nds, newNode]);
    selectNode(newNodeId);
  }, [setNodes, selectNode]);
  
  /**
   * อัปเดต Node
   */
  const updateNode = useCallback((nodeId: string, data: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      )
    );
  }, [setNodes]);
  
  /**
   * ลบ Node
   */
  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => 
      edge.source !== nodeId && edge.target !== nodeId
    ));
    
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
      setInspectorOpen(false);
    }
  }, [setNodes, setEdges, selectedNodeId]);
  
  /**
   * เพิ่ม Edge
   */
  const onConnect = useCallback(
    (params: Edge | Connection) => {
      const newEdge: Edge = {
        ...params,
        id: `edge_${Date.now()}`,
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
        source: params.source || '',
        target: params.target || '',
        sourceHandle: params.sourceHandle || null,
        targetHandle: params.targetHandle || null,
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );
  
  /**
   * ลบ Edge
   */
  const deleteEdge = useCallback((edgeId: string) => {
    setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
  }, [setEdges]);
  
  /**
   * เพิ่ม Chapter
   */
  const addChapter = useCallback((title: string, position: XYPosition) => {
    const newChapterId = `chapter_${Date.now()}`;
    
    const newNode: Node = {
      id: newChapterId,
      type: 'chapter',
      position,
      data: { 
        title,
        nodeType: 'chapter_node'
      },
    };
    
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);
  
  /**
   * อัปเดต Chapter
   */
  const updateChapter = useCallback((chapterId: string, data: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === chapterId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      )
    );
  }, [setNodes]);
  
  /**
   * ลบ Chapter
   */
  const deleteChapter = useCallback((chapterId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== chapterId));
  }, [setNodes]);
  
  /**
   * สลับการแสดง Sidebar
   */
  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);
  
  /**
   * สลับการแสดง Inspector
   */
  const toggleInspector = useCallback(() => {
    setInspectorOpen((prev) => !prev);
  }, []);
  
  /**
   * บันทึกตำแหน่ง Node (debounced)
   */
  const saveNodePositions = useCallback(
    debounce((updatedNodes: Node[]) => {
      if (!storyMap) return;
      
      setIsSaving(true);
      
      const storyMapNodes = convertToStoryMapNodes(updatedNodes);
      
      fetch(`/api/novels/${novel.slug}/storymap`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'update_nodes_positions',
          data: { nodes: storyMapNodes }
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('ไม่สามารถบันทึกตำแหน่ง Node ได้');
          }
          return response.json();
        })
        .then(() => {
          console.log('บันทึกตำแหน่ง Node สำเร็จ');
        })
        .catch((error) => {
          console.error('เกิดข้อผิดพลาดในการบันทึกตำแหน่ง Node:', error);
        })
        .finally(() => {
          setIsSaving(false);
        });
    }, 1000),
    [storyMap, novel.slug]
  );
  
  /**
   * บันทึก StoryMap ทั้งหมด
   */
  const saveStoryMap = useCallback(async () => {
    if (!storyMap) return;
    
    setIsSaving(true);
    
    try {
      const storyMapData = {
        nodes: convertToStoryMapNodes(nodes),
        edges: convertToStoryMapEdges(edges),
      };
      
      const response = await fetch(`/api/novels/${novel.slug}/storymap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storyMapData),
      });
      
      if (!response.ok) {
        throw new Error('ไม่สามารถบันทึก StoryMap ได้');
      }
      
      const data = await response.json();
      console.log('บันทึก StoryMap สำเร็จ:', data);
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการบันทึก StoryMap:', error);
    } finally {
      setIsSaving(false);
    }
  }, [storyMap, novel.slug, nodes, edges]);
  
  // ค่า Context ที่จะส่งให้ Component ลูก
  const contextValue: WorkspaceContextType = {
    novel,
    episodes,
    storyMap,
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    isLoading,
    isSaving,
    selectedNodeId,
    sidebarOpen,
    inspectorOpen,
    reactFlowInstance,
    setReactFlowInstance,
    selectNode,
    addNode,
    updateNode,
    deleteNode,
    addEdge: onConnect,
    deleteEdge,
    addChapter,
    updateChapter,
    deleteChapter,
    toggleSidebar,
    toggleInspector,
    saveStoryMap,
    saveNodePositions,
  };
  
  return (
    <WorkspaceContext.Provider value={contextValue}>
      {children}
    </WorkspaceContext.Provider>
  );
}

/**
 * @function useWorkspace
 * @description Hook สำหรับใช้งาน WorkspaceContext
 */
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

