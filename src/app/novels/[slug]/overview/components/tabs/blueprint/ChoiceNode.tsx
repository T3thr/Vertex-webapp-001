// app/novels/[slug]/overview/components/tabs/blueprint/ChoiceNode.tsx
'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
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
 * Choice Node Component สำหรับ ReactFlow
 * แสดงข้อมูล Choice/ตัวเลือกใน Visual Novel
 */
const ChoiceNode: React.FC<NodeProps<ChoiceNodeData>> = ({ 
  data, 
  selected, 
  dragging 
}) => {
  const nodeColor = data.editorVisuals?.color || '#10b981';
  const choiceCount = data.nodeSpecificData?.choiceIds?.length || 0;
  const isMajor = data.nodeSpecificData?.isMajorChoice || false;
  const isTimed = data.nodeSpecificData?.isTimedChoice || false;
  const costCoins = data.nodeSpecificData?.costCoins || 0;
  const timeLimit = data.nodeSpecificData?.timeLimitSeconds || 0;
  const layout = data.nodeSpecificData?.layout || 'vertical';
  const hasNotes = data.notesForAuthor && data.notesForAuthor.length > 0;

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
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
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
          <Square className="h-4 w-4 flex-shrink-0" />
          <h3 className="font-medium text-sm truncate flex-1">
            {data.title}
          </h3>
          {isMajor && (
            <div className="w-2 h-2 bg-yellow-400 rounded-full flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Choice Count & Layout */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {choiceCount} choices
            </span>
          </div>
          
          <Badge variant="secondary" className="text-xs">
            {getLayoutIcon()} {layout}
          </Badge>
        </div>

        {/* Special Properties */}
        <div className="space-y-1">
          {isTimed && (
            <div className="flex items-center space-x-1 text-xs">
              <Timer className="h-3 w-3 text-orange-500" />
              <span className="text-muted-foreground">
                Timed ({timeLimit}s)
              </span>
            </div>
          )}
          
          {costCoins > 0 && (
            <div className="flex items-center space-x-1 text-xs">
              <Coins className="h-3 w-3 text-yellow-500" />
              <span className="text-muted-foreground">
                Cost: {costCoins} coins
              </span>
            </div>
          )}
          
          {isMajor && (
            <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
              Major Choice
            </Badge>
          )}
        </div>

        {/* Prompt Text Preview */}
        {data.nodeSpecificData?.promptText && (
          <div className="bg-muted/50 rounded p-2 text-xs">
            <div className="font-medium text-muted-foreground mb-1">Prompt:</div>
            <p className="line-clamp-2 text-muted-foreground">
              &quot;{data.nodeSpecificData.promptText}&quot;
            </p>
          </div>
        )}

        {/* Author Notes Preview */}
        {hasNotes && (
          <div className="bg-muted/50 rounded p-2 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1 mb-1">
              <AlertCircle className="h-3 w-3" />
              <span className="font-medium">Notes:</span>
            </div>
            <p className="line-clamp-2">
              {data.notesForAuthor}
            </p>
          </div>
        )}
      </div>

      {/* Multiple Output Handles for different choices */}
      {Array.from({ length: Math.max(choiceCount, 2) }).map((_, index) => (
        <Handle
          key={index}
          type="source"
          position={Position.Bottom}
          id={`choice-${index}`}
          className="w-3 h-3 bg-background border-2 border-muted-foreground"
          style={{ 
            borderColor: nodeColor,
            left: `${20 + (index * (60 / Math.max(choiceCount, 1)))}%`
          }}
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
