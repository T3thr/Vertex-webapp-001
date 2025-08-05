"use client";

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch, Users } from 'lucide-react';

interface ChoiceNodeData {
  nodeId: string;
  title: string;
  nodeType: string;
  nodeSpecificData?: {
    choiceIds: string[];
    promptText?: string;
    layout?: 'vertical' | 'horizontal' | 'grid';
  };
  scenes?: any[];
  characters?: any[];
  onSceneSelect?: (sceneId: string) => void;
  onModeSwitch?: (mode: 'director', sceneId?: string) => void;
}

const ChoiceNode = ({ data, selected }: { data: ChoiceNodeData; selected?: boolean }) => {
  const choiceData = data.nodeSpecificData;
  const choiceCount = choiceData?.choiceIds?.length || 0;

  return (
    <div className={`choice-node bg-white dark:bg-slate-800 rounded-xl shadow-lg border-2 transition-all duration-200 ${
      selected ? 'border-purple-400 shadow-xl scale-105' : 'border-slate-200 dark:border-slate-600'
    }`}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-purple-500 border-2 border-white"
        style={{ left: -6 }}
      />

      <div className="p-4 min-w-[180px]">
        {/* Header */}
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
            <GitBranch className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
              {data.title || 'Choice Point'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {choiceCount} option{choiceCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Prompt Text */}
        {choiceData?.promptText && (
                     <div className="mb-3 p-2 bg-slate-50 dark:bg-slate-700 rounded text-xs text-slate-700 dark:text-slate-300">
             &quot;{choiceData.promptText}&quot;
           </div>
        )}

        {/* Choice Preview */}
        <div className="space-y-1">
          {Array.from({ length: Math.min(choiceCount, 3) }).map((_, index) => (
            <div key={index} className="flex items-center space-x-2 text-xs">
              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
              <span className="text-slate-600 dark:text-slate-400">
                Choice {index + 1}
              </span>
            </div>
          ))}
          {choiceCount > 3 && (
            <div className="text-xs text-slate-500 dark:text-slate-400 pl-3">
              +{choiceCount - 3} more...
            </div>
          )}
        </div>

        {/* Layout Indicator */}
        {choiceData?.layout && (
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Layout: {choiceData.layout}
          </div>
        )}
      </div>

      {/* Multiple Output Handles for choices */}
      {Array.from({ length: Math.min(choiceCount, 4) }).map((_, index) => (
        <Handle
          key={index}
          type="source"
          position={Position.Right}
          id={`choice-${index}`}
          className="w-3 h-3 bg-purple-500 border-2 border-white"
          style={{ 
            right: -6, 
            top: `${30 + (index * 15)}%`
          }}
        />
      ))}
    </div>
  );
};

export default ChoiceNode;