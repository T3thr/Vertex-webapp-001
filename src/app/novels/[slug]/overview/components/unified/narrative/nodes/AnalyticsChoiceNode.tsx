// src/app/novels/[slug]/overview/components/unified/narrative/nodes/AnalyticsChoiceNode.tsx
"use client";

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import { GitBranch, TrendingUp, Users, AlertTriangle } from 'lucide-react';

const AnalyticsChoiceNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      onClick={data?.onSelect}
      className={`
        relative min-w-48 max-w-64 p-4 rounded-lg border-2 shadow-sm cursor-pointer transition-all duration-200
        border-orange-300 bg-orange-50 dark:bg-orange-900
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
            Choice
          </span>
        </div>
        
        {data?.showAnalytics && data?.analyticsData?.selectionRate > 0.8 && (
          <TrendingUp className="w-4 h-4 text-green-500" />
        )}
      </div>

      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 line-clamp-2">
        {data?.title || 'Choice Node'}
      </h3>

      {data?.showAnalytics && data?.analyticsData && (
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">Selection Rate</span>
            <span className="font-medium text-orange-600 dark:text-orange-400">
              {Math.round(data.analyticsData.selectionRate * 100)}%
            </span>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${data.analyticsData.selectionRate * 100}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              className="bg-orange-500 h-1.5 rounded-full"
            />
          </div>
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

export default AnalyticsChoiceNode;