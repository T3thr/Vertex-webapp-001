// app/novels/[slug]/overview/components/tabs/blueprint/EndingNode.tsx
'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { motion } from 'framer-motion';
import { Flag, Crown, Heart, Skull, Eye, Sparkles, Laugh, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface EndingNodeData {
  title: string;
  nodeType: string;
  nodeSpecificData?: {
    endingTitle?: string;
    endingSceneId?: string;
    outcomeDescription?: string;
    unlockCondition?: string;
    endingType?: 'TRUE' | 'GOOD' | 'NORMAL' | 'BAD' | 'SECRET' | 'ALTERNATE' | 'JOKE';
  };
  notesForAuthor?: string;
  editorVisuals?: {
    color?: string;
    icon?: string;
  };
}

/**
 * Ending Node Component สำหรับ ReactFlow
 * แสดงข้อมูลจุดจบของเรื่องใน Visual Novel
 */
const EndingNode: React.FC<NodeProps<EndingNodeData>> = ({ 
  data, 
  selected, 
  dragging 
}) => {
  const nodeColor = data.editorVisuals?.color || '#ef4444';
  const endingType = data.nodeSpecificData?.endingType || 'NORMAL';
  const endingTitle = data.nodeSpecificData?.endingTitle || data.title;
  const hasCondition = !!data.nodeSpecificData?.unlockCondition;
  const hasNotes = data.notesForAuthor && data.notesForAuthor.length > 0;
  const outcomeDescription = data.nodeSpecificData?.outcomeDescription;

  // ไอคอนและสีสำหรับแต่ละประเภท ending
  const getEndingConfig = (type: string) => {
    switch (type) {
      case 'TRUE':
        return { 
          icon: Crown, 
          color: '#ffd700', 
          bgColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
          label: 'True End' 
        };
      case 'GOOD':
        return { 
          icon: Heart, 
          color: '#10b981', 
          bgColor: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
          label: 'Good End' 
        };
      case 'NORMAL':
        return { 
          icon: Flag, 
          color: '#6b7280', 
          bgColor: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
          label: 'Normal End' 
        };
      case 'BAD':
        return { 
          icon: Skull, 
          color: '#ef4444', 
          bgColor: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
          label: 'Bad End' 
        };
      case 'SECRET':
        return { 
          icon: Eye, 
          color: '#8b5cf6', 
          bgColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
          label: 'Secret End' 
        };
      case 'ALTERNATE':
        return { 
          icon: Sparkles, 
          color: '#06b6d4', 
          bgColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400',
          label: 'Alternate End' 
        };
      case 'JOKE':
        return { 
          icon: Laugh, 
          color: '#f97316', 
          bgColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
          label: 'Joke End' 
        };
      default:
        return { 
          icon: Flag, 
          color: '#6b7280', 
          bgColor: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
          label: 'Ending' 
        };
    }
  };

  const endingConfig = getEndingConfig(endingType);
  const EndingIcon = endingConfig.icon;

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
        ${endingType === 'SECRET' ? 'ring-2 ring-purple-500/30' : ''}
      `}
      style={{ 
        borderColor: selected ? endingConfig.color : undefined,
        boxShadow: selected ? `0 0 20px ${endingConfig.color}20` : undefined 
      }}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-background border-2 border-muted-foreground"
        style={{ borderColor: endingConfig.color }}
      />

      {/* Header */}
      <div 
        className="p-3 rounded-t-lg text-white"
        style={{ backgroundColor: endingConfig.color }}
      >
        <div className="flex items-center space-x-2">
          <EndingIcon className="h-4 w-4 flex-shrink-0" />
          <h3 className="font-medium text-sm truncate flex-1">
            {endingTitle}
          </h3>
          {hasCondition && (
            <div className="w-2 h-2 bg-white/80 rounded-full flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Ending Type Badge */}
        <div className="flex items-center justify-center">
          <Badge 
            variant="secondary" 
            className={`text-xs font-medium ${endingConfig.bgColor}`}
          >
            {endingConfig.label}
          </Badge>
        </div>

        {/* Outcome Description */}
        {outcomeDescription && (
          <div className="bg-muted/50 rounded p-2 text-sm">
            <div className="font-medium text-muted-foreground mb-1 text-xs">Outcome:</div>
            <p className="text-foreground leading-relaxed line-clamp-3">
              {outcomeDescription}
            </p>
          </div>
        )}

        {/* Unlock Condition */}
        {hasCondition && (
          <div className="bg-muted/30 rounded p-2 text-xs">
            <div className="flex items-center space-x-1 mb-1">
              <AlertCircle className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium text-muted-foreground">Unlock Condition:</span>
            </div>
            <code className="text-xs font-mono text-muted-foreground line-clamp-2">
              {data.nodeSpecificData?.unlockCondition}
            </code>
          </div>
        )}

        {/* Scene Reference */}
        {data.nodeSpecificData?.endingSceneId && (
          <div className="text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <span className="font-medium">Scene ID:</span>
              <span className="font-mono bg-muted px-1 rounded">
                {data.nodeSpecificData.endingSceneId.slice(-8)}
              </span>
            </div>
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

      {/* No Output Handle - Endings are terminal nodes */}

      {/* Selection Indicator */}
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 w-4 h-4 rounded-full border-2 border-background"
          style={{ backgroundColor: endingConfig.color }}
        />
      )}

      {/* Special Ending Indicators */}
      {endingType === 'TRUE' && (
        <div className="absolute -top-1 -left-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-background" />
      )}
      
      {endingType === 'SECRET' && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full border-2 border-background" />
      )}

      {/* Ending Glow Effect */}
      <div 
        className="absolute inset-0 rounded-lg opacity-20 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${endingConfig.color}40 0%, transparent 70%)`,
        }}
      />
    </motion.div>
  );
};

export default memo(EndingNode);
