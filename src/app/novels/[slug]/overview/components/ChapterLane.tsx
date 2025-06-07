// app/novels/[slug]/overview/components/ChapterLane.tsx
'use client';

import React, { memo, useState } from 'react';
import { NodeProps } from 'reactflow';
import { motion } from 'framer-motion';
import { Grip, Edit2, X, Check } from 'lucide-react';

import { useWorkspace } from './WorkspaceContext';

/**
 * @interface ChapterNodeData
 * @description ข้อมูลที่ใช้ใน ChapterLane
 */
interface ChapterNodeData {
  title: string;
}

/**
 * @function ChapterLane
 * @description Component แสดง Node ที่แทน Chapter หรือ Act ใน Timeline
 */
function ChapterLane({ id, data, selected }: NodeProps<ChapterNodeData>) {
  const { updateNode, deleteChapter } = useWorkspace();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(data.title);
  
  // ฟังก์ชันจัดการการแก้ไขชื่อ
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };
  
  // ฟังก์ชันบันทึกการแก้ไข
  const handleSave = () => {
    updateNode(id, { title });
    setIsEditing(false);
  };
  
  // ฟังก์ชันยกเลิกการแก้ไข
  const handleCancel = () => {
    setTitle(data.title);
    setIsEditing(false);
  };
  
  // ฟังก์ชันลบ Chapter
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบ Chapter นี้?')) {
      deleteChapter(id);
    }
  };
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`
        px-4 py-3 bg-accent/30 border-2 rounded-lg transition-all
        ${selected ? 'border-primary shadow-lg' : 'border-border'}
        min-w-[300px] min-h-[100px] w-full
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Grip className="w-4 h-4 text-muted-foreground cursor-move" />
          
          {isEditing ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="px-2 py-1 bg-background border border-input-border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
              onClick={(e) => e.stopPropagation()}
              placeholder="Enter chapter title"
            />
          ) : (
            <h3 className="text-sm font-medium text-foreground">
              {data.title}
            </h3>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="p-1 rounded-full hover:bg-background"
              >
                <Check className="w-3 h-3 text-green-600" />
              </button>
              
              <button
                onClick={handleCancel}
                className="p-1 rounded-full hover:bg-background"
              >
                <X className="w-3 h-3 text-red-600" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleEdit}
                className="p-1 rounded-full hover:bg-background"
              >
                <Edit2 className="w-3 h-3 text-muted-foreground" />
              </button>
              
              <button
                onClick={handleDelete}
                className="p-1 rounded-full hover:bg-background"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="border-t border-border/50 pt-2">
        <p className="text-xs text-muted-foreground">
          ลากตอนมาวางที่นี่เพื่อจัดกลุ่ม
        </p>
      </div>
    </motion.div>
  );
}

// ใช้ memo เพื่อป้องกันการ re-render ที่ไม่จำเป็น
export default memo(ChapterLane);

