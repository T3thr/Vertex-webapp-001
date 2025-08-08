// app/novels/[slug]/overview/components/tabs/blueprint/SceneNode.tsx
'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { motion } from 'framer-motion';
import { Play, Clock, FileText, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SceneNodeData {
  title: string;
  nodeType: string;
  nodeSpecificData?: {
    sceneId?: string;
    episodeId?: string;
    estimatedDuration?: number;
    complexity?: 'low' | 'medium' | 'high' | 'very_high';
  };
  notesForAuthor?: string;
  editorVisuals?: {
    color?: string;
    icon?: string;
  };
}

/**
 * Scene Node Component สำหรับ ReactFlow
 * แสดงข้อมูลฉากใน Visual Novel
 */
const SceneNode: React.FC<NodeProps<SceneNodeData>> = ({ 
  data, 
  selected, 
  dragging 
}) => {
  const nodeColor = data.editorVisuals?.color || '#3b82f6';
  const complexity = data.nodeSpecificData?.complexity || 'medium';
  const hasNotes = data.notesForAuthor && data.notesForAuthor.length > 0;
  const estimatedDuration = data.nodeSpecificData?.estimatedDuration || 0;

  // สีตาม complexity
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'very_high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
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
          <Play className="h-4 w-4 flex-shrink-0" />
          <h3 className="font-medium text-sm truncate flex-1">
            {data.title}
          </h3>
          {hasNotes && (
            <FileText className="h-3 w-3 flex-shrink-0 opacity-80" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Complexity Badge */}
        <div className="flex items-center justify-between">
          <Badge 
            variant="secondary" 
            className={`text-xs ${getComplexityColor(complexity)}`}
          >
            {complexity.toUpperCase()}
          </Badge>
          
          {/* Duration */}
          {estimatedDuration > 0 && (
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{Math.ceil(estimatedDuration / 60000)}m</span>
            </div>
          )}
        </div>

        {/* Scene Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          {data.nodeSpecificData?.sceneId && (
            <div className="flex items-center space-x-1">
              <span className="font-medium">Scene ID:</span>
              <span className="font-mono bg-muted px-1 rounded">
                {data.nodeSpecificData.sceneId.slice(-8)}
              </span>
            </div>
          )}
          
          {data.nodeSpecificData?.episodeId && (
            <div className="flex items-center space-x-1">
              <span className="font-medium">Episode:</span>
              <span className="font-mono bg-muted px-1 rounded">
                {data.nodeSpecificData.episodeId.slice(-8)}
              </span>
            </div>
          )}
        </div>

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

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-background border-2 border-muted-foreground"
        style={{ borderColor: nodeColor }}
      />

      {/* Selection Indicator */}
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 w-4 h-4 rounded-full border-2 border-background"
          style={{ backgroundColor: nodeColor }}
        />
      )}
    </motion.div>
  );
};

export default memo(SceneNode);
