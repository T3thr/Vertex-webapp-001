// app/novels/[slug]/overview/components/tabs/blueprint/ChoiceNode.tsx
'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import { Square, Users, Coins, Timer, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ChoiceNodeData {
  title: string;
  nodeType: string;
  nodeSpecificData?: {
    choiceIds?: string[];
    promptText?: string;
    layout?: 'vertical' | 'horizontal' | 'grid';
    isMajorChoice?: boolean;
    isTimedChoice?: boolean;
    timeLimitSeconds?: number;
    costCoins?: number;
  };
  notesForAuthor?: string;
  editorVisuals?: {
    color?: string;
    icon?: string;
  };
}

/**
 * คอมโพเนนต์โหนดตัวเลือก สำหรับ ReactFlow  
 * แสดงข้อมูลตัวเลือกในนิยายแบบภาพ (Visual Novel)
 * รองรับการลากเส้นเชื่อมต่อแบบ no-code
 */
const ChoiceNode: React.FC<NodeProps> = ({ 
  data, 
  selected, 
  dragging 
}) => {
  const nodeData = data as unknown as ChoiceNodeData;
  const nodeColor = nodeData.editorVisuals?.color || '#10b981';
  const choiceCount = nodeData.nodeSpecificData?.choiceIds?.length || 0;
  const isMajor = nodeData.nodeSpecificData?.isMajorChoice || false;
  const isTimed = nodeData.nodeSpecificData?.isTimedChoice || false;
  const costCoins = nodeData.nodeSpecificData?.costCoins || 0;
  const timeLimit = nodeData.nodeSpecificData?.timeLimitSeconds || 0;
  const layout = nodeData.nodeSpecificData?.layout || 'vertical';
  const hasNotes = nodeData.notesForAuthor && nodeData.notesForAuthor.length > 0;

  // ไอคอนสำหรับ layout
  const getLayoutIcon = () => {
    switch (layout) {
      case 'horizontal':
        return '⟷';
      case 'grid':
        return '⊞';
      default:
        return '⟸';
    }
  };

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.005 }}
      transition={{ duration: 0.1, ease: "easeOut" }}
      className={`
        relative min-w-[200px] max-w-[280px] 
        bg-card border-2 rounded-lg shadow-lg 
        transition-all duration-200
        ${selected ? 'border-primary shadow-primary/20' : 'border-border'}
        ${dragging ? 'shadow-xl rotate-1' : ''}
        ${isMajor ? 'ring-2 ring-yellow-500/30' : ''}
      `}
      style={{ 
        borderColor: selected ? nodeColor : undefined,
        boxShadow: selected ? `0 0 20px ${nodeColor}20` : undefined 
      }}
    >
      {/* จุดเชื่อมต่อสำหรับรับข้อมูล (Input Handle) */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="!bg-blue-100 !border-blue-500 dark:!bg-blue-900 dark:!border-blue-400"
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          border: '2px solid',
          borderColor: '#3b82f6',
          background: '#dbeafe',
          cursor: 'crosshair',
          top: '-8px'
        }}
        title="ลากเส้นเชื่อมต่อมาที่นี่"
      />

      {/* Header */}
      <div 
        className="p-3 rounded-t-lg text-white"
        style={{ backgroundColor: nodeColor }}
      >
        <div className="flex items-center space-x-2">
          <Square className="h-4 w-4 flex-shrink-0" />
          <h3 className="font-medium text-sm truncate flex-1">
            {nodeData.title}
          </h3>
          {isMajor && (
            <div className="w-2 h-2 bg-yellow-400 rounded-full flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* จำนวนตัวเลือกและรูปแบบการแสดงผล */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {choiceCount} ตัวเลือก
            </span>
          </div>
          
          <Badge variant="secondary" className="text-xs">
            {getLayoutIcon()} {layout === 'vertical' ? 'แนวตั้ง' : layout === 'horizontal' ? 'แนวนอน' : 'ตาราง'}
          </Badge>
        </div>

        {/* คุณสมบัติพิเศษ */}
        <div className="space-y-1">
          {isTimed && (
            <div className="flex items-center space-x-1 text-xs">
              <Timer className="h-3 w-3 text-orange-500" />
              <span className="text-muted-foreground">
                จำกัดเวลา ({timeLimit} วินาที)
              </span>
            </div>
          )}
          
          {costCoins > 0 && (
            <div className="flex items-center space-x-1 text-xs">
              <Coins className="h-3 w-3 text-yellow-500" />
              <span className="text-muted-foreground">
                ค่าใช้จ่าย: {costCoins} เหรียญ
              </span>
            </div>
          )}
          
          {isMajor && (
            <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
              ตัวเลือกสำคัญ
            </Badge>
          )}
        </div>

        {/* ตัวอย่างข้อความแจ้ง */}
        {nodeData.nodeSpecificData?.promptText && (
          <div className="bg-muted/50 rounded p-2 text-xs">
            <div className="font-medium text-muted-foreground mb-1">ข้อความแจ้ง:</div>
            <p className="line-clamp-2 text-muted-foreground">
              &quot;{nodeData.nodeSpecificData.promptText}&quot;
            </p>
          </div>
        )}

        {/* ตัวอย่างหมายเหตุผู้แต่ง */}
        {hasNotes && (
          <div className="bg-muted/50 rounded p-2 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1 mb-1">
              <AlertCircle className="h-3 w-3" />
              <span className="font-medium">หมายเหตุ:</span>
            </div>
            <p className="line-clamp-2">
              {nodeData.notesForAuthor}
            </p>
          </div>
        )}
      </div>

      {/* จุดเชื่อมต่อสำหรับตัวเลือกต่างๆ (Multiple Output Handles) */}
      {Array.from({ length: Math.max(choiceCount, 2) }).map((_, index) => (
        <Handle
          key={index}
          type="source"
          position={Position.Bottom}
          id={`choice-${index}`}
          className="!bg-green-100 !border-green-500 dark:!bg-green-900 dark:!border-green-400"
          style={{ 
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            border: '2px solid',
            borderColor: '#10b981',
            background: '#d1fae5',
            cursor: 'crosshair',
            left: `${20 + (index * (60 / Math.max(choiceCount, 1)))}%`,
            bottom: '-7px'
          }}
          title={`ลากจากจุดนี้เพื่อเชื่อมต่อตัวเลือกที่ ${index + 1}`}
        />
      ))}

      {/* Selection Indicator */}
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 w-4 h-4 rounded-full border-2 border-background"
          style={{ backgroundColor: nodeColor }}
        />
      )}

      {/* Major Choice Indicator */}
      {isMajor && (
        <div className="absolute -top-1 -left-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-background" />
      )}
    </motion.div>
  );
};

export default memo(ChoiceNode);
