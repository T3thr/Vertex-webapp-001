// app/novels/[slug]/overview/components/tabs/blueprint/BranchNode.tsx
'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
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
 * Branch Node Component สำหรับ ReactFlow
 * แสดงข้อมูล Branch/แยกเส้นทางตามเงื่อนไขใน Visual Novel
 */
const BranchNode: React.FC<NodeProps<BranchNodeData>> = ({ 
  data, 
  selected, 
  dragging 
}) => {
  const nodeColor = data.editorVisuals?.color || '#f59e0b';
  const conditions = data.nodeSpecificData?.conditions || [];
  const hasDefault = !!data.nodeSpecificData?.defaultTargetNodeId;
  const hasNotes = data.notesForAuthor && data.notesForAuthor.length > 0;
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
        className="w-3 h-3 bg-background border-2 border-muted-foreground"
        style={{ borderColor: nodeColor }}
      />

      {/* Header */}
      <div 
        className="p-3 rounded-t-lg text-white"
        style={{ backgroundColor: nodeColor }}
      >
        <div className="flex items-center space-x-2">
          <GitBranch className="h-4 w-4 flex-shrink-0" />
          <h3 className="font-medium text-sm truncate flex-1">
            {data.title}
          </h3>
          <Badge variant="secondary" className="bg-white/20 text-white text-xs">
            {totalOutputs} paths
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
              <span className="font-medium">Conditions:</span>
            </div>
            
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {conditions.slice(0, 3).map((condition, index) => (
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
                  +{conditions.length - 3} more conditions
                </div>
              )}
            </div>
          </div>
        )}

        {/* Default Path */}
        {hasDefault && (
          <div className="bg-muted/30 rounded p-2 text-xs">
            <div className="flex items-center space-x-1 mb-1">
              <Route className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium text-muted-foreground">Default Path:</span>
            </div>
            <div className="font-mono text-muted-foreground">
              {data.nodeSpecificData?.defaultTargetNodeId?.slice(-8) || 'Not set'}
            </div>
          </div>
        )}

        {/* Warning for no conditions */}
        {conditions.length === 0 && !hasDefault && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded p-2 text-xs">
            <div className="flex items-center space-x-1 text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="h-3 w-3" />
              <span className="font-medium">No conditions set</span>
            </div>
          </div>
        )}

        {/* Author Notes Preview */}
        {hasNotes && (
          <div className="bg-muted/50 rounded p-2 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1 mb-1">
              <AlertTriangle className="h-3 w-3" />
              <span className="font-medium">Notes:</span>
            </div>
            <p className="line-clamp-2">
              {data.notesForAuthor}
            </p>
          </div>
        )}
      </div>

      {/* Multiple Output Handles for different conditions */}
      {Array.from({ length: Math.max(totalOutputs, 2) }).map((_, index) => {
        const isDefault = index === conditions.length;
        const condition = conditions[index];
        
        return (
          <Handle
            key={`output-${index}`}
            type="source"
            position={Position.Bottom}
            id={isDefault ? 'default' : `condition-${condition?.conditionId || index}`}
            className="w-3 h-3 bg-background border-2 border-muted-foreground"
            style={{ 
              borderColor: isDefault ? '#6b7280' : getConditionColor(index),
              left: `${15 + (index * (70 / Math.max(totalOutputs, 1)))}%`
            }}
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
