// app/novels/[slug]/overview/components/tabs/blueprint/CommentNode.tsx
'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { motion } from 'framer-motion';
import { MessageCircle, User, Calendar, Pin } from 'lucide-react';

interface CommentNodeData {
  title: string;
  nodeType: string;
  nodeSpecificData?: {
    commentText?: string;
    authorId?: string;
    createdAt?: string;
    isPinned?: boolean;
    tags?: string[];
  };
  notesForAuthor?: string;
  editorVisuals?: {
    color?: string;
    icon?: string;
  };
}

/**
 * Comment Node Component สำหรับ ReactFlow
 * แสดงข้อมูล Comment/หมายเหตุใน Visual Novel Story Map
 */
const CommentNode: React.FC<NodeProps<CommentNodeData>> = ({ 
  data, 
  selected, 
  dragging 
}) => {
  const nodeColor = data.editorVisuals?.color || '#6b7280';
  const commentText = data.nodeSpecificData?.commentText || '';
  const isPinned = data.nodeSpecificData?.isPinned || false;
  const tags = data.nodeSpecificData?.tags || [];
  const createdAt = data.nodeSpecificData?.createdAt;

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
        ${isPinned ? 'ring-2 ring-blue-500/30' : ''}
      `}
      style={{ 
        borderColor: selected ? nodeColor : undefined,
        boxShadow: selected ? `0 0 20px ${nodeColor}20` : undefined 
      }}
    >
      {/* Optional Input Handle (comments can be connected to show context) */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 bg-background border border-muted-foreground opacity-50"
        style={{ borderColor: nodeColor }}
      />

      {/* Header */}
      <div 
        className="p-3 rounded-t-lg text-white"
        style={{ backgroundColor: nodeColor }}
      >
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-4 w-4 flex-shrink-0" />
          <h3 className="font-medium text-sm truncate flex-1">
            {data.title}
          </h3>
          {isPinned && (
            <Pin className="h-3 w-3 flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Comment Text */}
        {commentText && (
          <div className="bg-muted/50 rounded p-2 text-sm">
            <p className="text-foreground leading-relaxed line-clamp-4">
              {commentText}
            </p>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index}
                className="inline-block bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full"
              >
                #{tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="inline-block text-muted-foreground text-xs px-2 py-1">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {/* Author */}
          <div className="flex items-center space-x-1">
            <User className="h-3 w-3" />
            <span>
              {data.nodeSpecificData?.authorId?.slice(-8) || 'Unknown'}
            </span>
          </div>

          {/* Date */}
          {createdAt && (
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(createdAt)}</span>
            </div>
          )}
        </div>

        {/* Additional Notes */}
        {data.notesForAuthor && (
          <div className="border-t border-border pt-2 text-xs text-muted-foreground">
            <div className="font-medium mb-1">Internal Notes:</div>
            <p className="line-clamp-2">
              {data.notesForAuthor}
            </p>
          </div>
        )}
      </div>

      {/* Optional Output Handle (for connecting to related nodes) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 bg-background border border-muted-foreground opacity-50"
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

      {/* Pinned Indicator */}
      {isPinned && (
        <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-background" />
      )}

      {/* Comment Bubble Tail */}
      <div 
        className="absolute -bottom-2 left-4 w-4 h-4 transform rotate-45 border-r border-b border-border"
        style={{ backgroundColor: nodeColor }}
      />
    </motion.div>
  );
};

export default memo(CommentNode);
