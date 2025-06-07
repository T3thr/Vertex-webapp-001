// app/novels/[slug]/overview/components/EpisodeNode.tsx
'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { motion } from 'framer-motion';
import { BookOpen, Clock, FileText, Edit3 } from 'lucide-react';

import { useWorkspace } from './WorkspaceContext';

/**
 * @interface EpisodeNodeData
 * @description ข้อมูลที่ใช้ใน EpisodeNode
 */
interface EpisodeNodeData {
  title: string;
  episodeId: string | null;
  status: string;
  wordCount: number;
  readingTime: number;
}

/**
 * @function EpisodeNode
 * @description Component แสดง Node ที่แทนตอนของนิยายใน Timeline
 */
function EpisodeNode({ id, data, selected }: NodeProps<EpisodeNodeData>) {
  const { episodes, selectNode } = useWorkspace();
  
  // หาข้อมูลตอนจาก episodeId
  const episode = data.episodeId 
    ? episodes.find(ep => ep._id === data.episodeId) 
    : null;
  
  // ฟังก์ชันจัดการการคลิก
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectNode(id);
  };
  
  // ฟอร์แมตจำนวนคำ
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };
  
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      className={`
        px-4 py-3 bg-card border-2 rounded-lg transition-all
        ${selected ? 'border-primary shadow-lg' : 'border-border'}
        ${data.status === 'published' ? 'bg-green-50' : ''}
        min-w-[200px] max-w-[250px] cursor-pointer
      `}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 bg-blue-500"
      />
      
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-foreground truncate">
            {data.title}
          </h3>
          {selected && (
            <Edit3 className="w-3 h-3 text-primary" />
          )}
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {formatNumber(data.wordCount)} คำ
          </span>
          
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {data.readingTime} นาที
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span
            className={`
              px-2 py-1 text-xs font-medium rounded-full
              ${data.status === 'published' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
              }
            `}
          >
            {data.status === 'published' ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}
          </span>
          
          <BookOpen className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 bg-blue-500"
      />
    </motion.div>
  );
}

// ใช้ memo เพื่อป้องกันการ re-render ที่ไม่จำเป็น
export default memo(EpisodeNode);

