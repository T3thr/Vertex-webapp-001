// app/novels/[slug]/overview/components/WorkspaceToolbar.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Save, 
  ZoomIn, 
  ZoomOut, 
  LayoutGrid, 
  Columns, 
  Rows,
  Undo,
  Redo,
  AlignLeft,
  AlignRight,
  AlignCenter,
  AlignJustify,
  Maximize,
  Minimize
} from 'lucide-react';

import { useWorkspace } from './WorkspaceContext';

/**
 * @function WorkspaceToolbar
 * @description แถบเครื่องมือด้านล่างสำหรับจัดการ Workspace
 */
export default function WorkspaceToolbar() {
  const { 
    addNode, 
    addChapter,
    saveStoryMap, 
    isSaving,
    reactFlowInstance
  } = useWorkspace();
  
  // ฟังก์ชันเพิ่ม Node ใหม่
  const handleAddNode = () => {
    if (reactFlowInstance) {
      const position = reactFlowInstance.project({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      });
      addNode('episode', position);
    }
  };
  
  // ฟังก์ชันเพิ่ม Chapter ใหม่
  const handleAddChapter = () => {
    if (reactFlowInstance) {
      const position = reactFlowInstance.project({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2 - 150
      });
      
      const title = prompt('ชื่อ Chapter:', 'Chapter ใหม่');
      if (title) {
        addChapter(title, position);
      }
    }
  };
  
  // ฟังก์ชันซูมเข้า
  const handleZoomIn = () => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomIn();
    }
  };
  
  // ฟังก์ชันซูมออก
  const handleZoomOut = () => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomOut();
    }
  };
  
  // ฟังก์ชันจัดเรียงแนวนอน
  const handleHorizontalLayout = () => {
    if (!reactFlowInstance) return;
    
    const nodes = reactFlowInstance.getNodes();
    const episodeNodes = nodes.filter(node => node.type === 'episode');
    
    // จัดเรียงตอนในแนวนอน
    const spacing = 250; // ระยะห่างระหว่างตอน
    const startX = 100;
    const startY = 100;
    
    const updatedNodes = episodeNodes.map((node, index) => ({
      ...node,
      position: {
        x: startX + index * spacing,
        y: startY
      }
    }));
    
    reactFlowInstance.setNodes(
      nodes.map(node => {
        const updatedNode = updatedNodes.find(n => n.id === node.id);
        return updatedNode || node;
      })
    );
    
    // บันทึกตำแหน่ง
    setTimeout(() => {
      const allNodes = reactFlowInstance.getNodes();
      saveNodePositions(allNodes);
    }, 100);
  };
  
  // ฟังก์ชันจัดเรียงแนวตั้ง
  const handleVerticalLayout = () => {
    if (!reactFlowInstance) return;
    
    const nodes = reactFlowInstance.getNodes();
    const episodeNodes = nodes.filter(node => node.type === 'episode');
    
    // จัดเรียงตอนในแนวตั้ง
    const spacing = 150; // ระยะห่างระหว่างตอน
    const startX = 100;
    const startY = 100;
    
    const updatedNodes = episodeNodes.map((node, index) => ({
      ...node,
      position: {
        x: startX,
        y: startY + index * spacing
      }
    }));
    
    reactFlowInstance.setNodes(
      nodes.map(node => {
        const updatedNode = updatedNodes.find(n => n.id === node.id);
        return updatedNode || node;
      })
    );
    
    // บันทึกตำแหน่ง
    setTimeout(() => {
      const allNodes = reactFlowInstance.getNodes();
      saveNodePositions(allNodes);
    }, 100);
  };
  
  // ฟังก์ชันจัดเรียงแบบกริด
  const handleGridLayout = () => {
    if (!reactFlowInstance) return;
    
    const nodes = reactFlowInstance.getNodes();
    const episodeNodes = nodes.filter(node => node.type === 'episode');
    
    // จัดเรียงตอนในแบบกริด
    const colSpacing = 250; // ระยะห่างระหว่างคอลัมน์
    const rowSpacing = 150; // ระยะห่างระหว่างแถว
    const startX = 100;
    const startY = 100;
    const cols = 3; // จำนวนคอลัมน์
    
    const updatedNodes = episodeNodes.map((node, index) => ({
      ...node,
      position: {
        x: startX + (index % cols) * colSpacing,
        y: startY + Math.floor(index / cols) * rowSpacing
      }
    }));
    
    reactFlowInstance.setNodes(
      nodes.map(node => {
        const updatedNode = updatedNodes.find(n => n.id === node.id);
        return updatedNode || node;
      })
    );
    
    // บันทึกตำแหน่ง
    setTimeout(() => {
      const allNodes = reactFlowInstance.getNodes();
      saveNodePositions(allNodes);
    }, 100);
  };
  
  // ฟังก์ชันแสดงทั้งหมด
  const handleFitView = () => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2 });
    }
  };
  
  // ฟังก์ชันบันทึกตำแหน่ง Node
  const saveNodePositions = (nodes: any[]) => {
    // ใช้ฟังก์ชัน saveNodePositions จาก Context
    // แต่ต้องเพิ่มฟังก์ชันนี้ใน WorkspaceToolbar เพื่อใช้ใน handleLayout
  };
  
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-16 border-t border-border bg-card flex items-center justify-between px-4"
    >
      <div className="flex items-center gap-2">
        <button
          onClick={handleAddNode}
          className="px-3 py-2 bg-primary text-primary-foreground rounded-lg flex items-center gap-2 hover:bg-primary-hover transition-colors"
          title="เพิ่มตอนใหม่"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">เพิ่มตอน</span>
        </button>
        
        <button
          onClick={handleAddChapter}
          className="px-3 py-2 bg-secondary text-secondary-foreground rounded-lg flex items-center gap-2 hover:bg-secondary/80 transition-colors"
          title="เพิ่ม Chapter"
        >
          <Columns className="w-4 h-4" />
          <span className="text-sm font-medium">เพิ่ม Chapter</span>
        </button>
      </div>
      
      <div className="flex items-center gap-2">
        {/* ปุ่มจัดเรียง */}
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          <button
            onClick={handleHorizontalLayout}
            className="p-2 bg-accent hover:bg-accent/80 text-accent-foreground transition-colors"
            title="จัดเรียงแนวนอน"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleVerticalLayout}
            className="p-2 bg-accent hover:bg-accent/80 text-accent-foreground transition-colors"
            title="จัดเรียงแนวตั้ง"
          >
            <AlignLeft className="w-4 h-4 rotate-90" />
          </button>
          
          <button
            onClick={handleGridLayout}
            className="p-2 bg-accent hover:bg-accent/80 text-accent-foreground transition-colors"
            title="จัดเรียงแบบกริด"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
        
        {/* ปุ่มซูม */}
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          <button
            onClick={handleZoomIn}
            className="p-2 bg-accent hover:bg-accent/80 text-accent-foreground transition-colors"
            title="ซูมเข้า"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleZoomOut}
            className="p-2 bg-accent hover:bg-accent/80 text-accent-foreground transition-colors"
            title="ซูมออก"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleFitView}
            className="p-2 bg-accent hover:bg-accent/80 text-accent-foreground transition-colors"
            title="แสดงทั้งหมด"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
        
        {/* ปุ่ม Undo/Redo */}
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          <button
            className="p-2 bg-accent hover:bg-accent/80 text-accent-foreground transition-colors disabled:opacity-50"
            title="ย้อนกลับ"
            disabled
          >
            <Undo className="w-4 h-4" />
          </button>
          
          <button
            className="p-2 bg-accent hover:bg-accent/80 text-accent-foreground transition-colors disabled:opacity-50"
            title="ทำซ้ำ"
            disabled
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>
        
        {/* ปุ่มบันทึก */}
        <button
          onClick={saveStoryMap}
          disabled={isSaving}
          className="px-3 py-2 bg-primary text-primary-foreground rounded-lg flex items-center gap-2 hover:bg-primary-hover transition-colors disabled:opacity-50"
          title="บันทึก"
        >
          <Save className="w-4 h-4" />
          <span className="text-sm font-medium">
            {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
          </span>
        </button>
      </div>
    </motion.div>
  );
}

