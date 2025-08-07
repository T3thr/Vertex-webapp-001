// src/app/novels/[slug]/overview/components/unified/narrative/nodes/EmotionalBranchNode.tsx
"use client";

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import { GitBranch, Heart, Brain, Zap } from 'lucide-react';

const EmotionalBranchNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      onClick={data?.onSelect}
      className={`
        relative min-w-48 max-w-64 p-4 rounded-lg border-2 shadow-sm cursor-pointer transition-all duration-200
        border-pink-300 bg-pink-50 dark:bg-pink-900
        ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        hover:shadow-md
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-gray-400 border-2 border-white dark:border-gray-800"
      />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Branch
          </span>
        </div>
        
        {data?.showEmotionalData && Math.abs(data?.authorDefinedPsychologicalImpact || 0) > 5 && (
          <Heart className="w-4 h-4 text-pink-500" />
        )}
      </div>

      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 line-clamp-2">
        {data?.title || 'Branch Node'}
      </h3>

      {data?.showEmotionalData && (
        <div className="space-y-2 mb-3">
          {data?.authorDefinedEmotionTags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {data.authorDefinedEmotionTags.slice(0, 2).map((emotion: string, i: number) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-pink-200 dark:bg-pink-800 text-xs rounded-full text-pink-700 dark:text-pink-300"
                >
                  {emotion}
                </span>
              ))}
            </div>
          )}
          
          {data?.authorDefinedPsychologicalImpact !== undefined && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">Impact</span>
              <span className={`font-medium ${
                data.authorDefinedPsychologicalImpact > 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {data.authorDefinedPsychologicalImpact > 0 ? '+' : ''}{data.authorDefinedPsychologicalImpact}
              </span>
            </div>
          )}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-gray-400 border-2 border-white dark:border-gray-800"
      />
    </motion.div>
  );
};

export default EmotionalBranchNode;