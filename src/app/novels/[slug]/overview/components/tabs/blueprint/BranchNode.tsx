// app/novels/[slug]/overview/components/tabs/blueprint/BranchNode.tsx
'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import { GitBranch, Code, Route, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BranchNodeData {
  title: string;
  nodeType: string;
  nodeSpecificData?: {
    conditions?: Array<{
      conditionId: string;
      expression: string;
      targetNodeIdIfTrue: string;
      priority?: number;
    }>;
    defaultTargetNodeId?: string;
  };
  notesForAuthor?: string;
  editorVisuals?: {
    color?: string;
    icon?: string;
  };
}

/**
 * คอมโพเนนต์โหนดแยกเส้นทาง สำหรับ ReactFlow
 * แสดงข้อมูลตรรกะแบบมีเงื่อนไขในนิยายแบบภาพ (Visual Novel)
 * รองรับการลากเส้นเชื่อมต่อแบบ no-code
 */
const BranchNode: React.FC<NodeProps> = ({ 
  data, 
  selected, 
  dragging 
}) => {
  const nodeData = data as unknown as BranchNodeData;
  const nodeColor = nodeData.editorVisuals?.color || '#f59e0b';
  const conditions = nodeData.nodeSpecificData?.conditions || [];
  const hasDefault = !!nodeData.nodeSpecificData?.defaultTargetNodeId;
  const hasNotes = nodeData.notesForAuthor && nodeData.notesForAuthor.length > 0;
  const totalOutputs = conditions.length + (hasDefault ? 1 : 0);

  // สีสำหรับแต่ละเงื่อนไข
  const getConditionColor = (index: number) => {
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#f97316'];
    return colors[index % colors.length];
  };

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative min-w-[220px] max-w-[300px] 
        bg-card border-2 rounded-lg shadow-lg 
        transition-all duration-200
        ${selected ? 'border-primary shadow-primary/20' : 'border-border'}
        ${dragging ? 'shadow-xl rotate-1' : ''}
      `}
      style={{ 
        borderColor: selected ? nodeColor : undefined,
        boxShadow: selected ? `0 0 20px ${nodeColor}20` : undefined 
      }}
    >
      {/* Input Handle */}
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
          <GitBranch className="h-4 w-4 flex-shrink-0" />
          <h3 className="font-medium text-sm truncate flex-1">
            {nodeData.title}
          </h3>
          <Badge variant="secondary" className="bg-white/20 text-white text-xs">
            {totalOutputs} เส้นทาง
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Conditions List */}
        {conditions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Code className="h-3 w-3" />
              <span className="font-medium">เงื่อนไข:</span>
            </div>
            
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {conditions.slice(0, 3).map((condition: any, index: number) => (
                <div 
                  key={condition.conditionId}
                  className="bg-muted/50 rounded p-2 text-xs"
                >
                  <div className="flex items-center space-x-1 mb-1">
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getConditionColor(index) }}
                    />
                    <span className="font-medium text-muted-foreground">
                      #{condition.priority || index + 1}
                    </span>
                  </div>
                  <code className="text-xs font-mono text-muted-foreground line-clamp-1">
                    {condition.expression}
                  </code>
                </div>
              ))}
              
              {conditions.length > 3 && (
                <div className="text-xs text-muted-foreground text-center py-1">
                  +{conditions.length - 3} เงื่อนไขเพิ่มเติม
                </div>
              )}
            </div>
          </div>
        )}

        {/* เส้นทางเริ่มต้น */}
        {hasDefault && (
          <div className="bg-muted/30 rounded p-2 text-xs">
            <div className="flex items-center space-x-1 mb-1">
              <Route className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium text-muted-foreground">เส้นทางเริ่มต้น:</span>
            </div>
            <div className="font-mono text-muted-foreground">
              {nodeData.nodeSpecificData?.defaultTargetNodeId?.slice(-8) || 'ไม่ได้ตั้งค่า'}
            </div>
          </div>
        )}

        {/* คำเตือนสำหรับไม่มีเงื่อนไข */}
        {conditions.length === 0 && !hasDefault && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded p-2 text-xs">
            <div className="flex items-center space-x-1 text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="h-3 w-3" />
              <span className="font-medium">ยังไม่ได้ตั้งค่าเงื่อนไข</span>
            </div>
          </div>
        )}

        {/* ตัวอย่างหมายเหตุผู้แต่ง */}
        {hasNotes && (
          <div className="bg-muted/50 rounded p-2 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1 mb-1">
              <AlertTriangle className="h-3 w-3" />
              <span className="font-medium">หมายเหตุ:</span>
            </div>
            <p className="line-clamp-2">
              {nodeData.notesForAuthor}
            </p>
          </div>
        )}
      </div>

      {/* จุดเชื่อมต่อสำหรับเงื่อนไขต่างๆ (Multiple Output Handles) */}
      {Array.from({ length: Math.max(totalOutputs, 2) }).map((_, index) => {
        const isDefault = index === conditions.length;
        const condition = conditions[index];
        
        return (
          <Handle
            key={`output-${index}`}
            type="source"
            position={Position.Bottom}
            id={isDefault ? 'default' : `condition-${condition?.conditionId || index}`}
            className={isDefault ? "!bg-gray-100 !border-gray-500 dark:!bg-gray-900 dark:!border-gray-400" : "!bg-green-100 !border-green-500 dark:!bg-green-900 dark:!border-green-400"}
            style={{ 
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              border: '2px solid',
              borderColor: isDefault ? '#6b7280' : '#10b981',
              background: isDefault ? '#f3f4f6' : '#d1fae5',
              cursor: 'crosshair',
              left: `${15 + (index * (70 / Math.max(totalOutputs, 1)))}%`,
              bottom: '-7px'
            }}
            title={isDefault ? 'ลากจากจุดนี้เพื่อเชื่อมต่อเส้นทางเริ่มต้น' : `ลากจากจุดนี้เพื่อเชื่อมต่อเงื่อนไขที่ ${index + 1}`}
          />
        );
      })}

      {/* Selection Indicator */}
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 w-4 h-4 rounded-full border-2 border-background"
          style={{ backgroundColor: nodeColor }}
        />
      )}

      {/* Complexity Indicator */}
      {conditions.length > 5 && (
        <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 rounded-full border-2 border-background" />
      )}
    </motion.div>
  );
};

export default memo(BranchNode);
