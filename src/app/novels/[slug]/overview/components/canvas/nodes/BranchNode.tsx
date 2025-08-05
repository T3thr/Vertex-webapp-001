"use client";

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Diamond, Code } from 'lucide-react';

interface BranchNodeData {
  nodeId: string;
  title: string;
  nodeType: string;
  nodeSpecificData?: {
    conditions: Array<{
      conditionId: string;
      expression: string;
      targetNodeIdIfTrue: string;
      priority?: number;
    }>;
    defaultTargetNodeId?: string;
  };
  scenes?: any[];
  characters?: any[];
  onSceneSelect?: (sceneId: string) => void;
  onModeSwitch?: (mode: 'director', sceneId?: string) => void;
}

const BranchNode = ({ data, selected }: { data: BranchNodeData; selected?: boolean }) => {
  const branchData = data.nodeSpecificData;
  const conditionCount = branchData?.conditions?.length || 0;

  return (
    <div className={`branch-node bg-white dark:bg-slate-800 rounded-xl shadow-lg border-2 transition-all duration-200 ${
      selected ? 'border-amber-400 shadow-xl scale-105' : 'border-slate-200 dark:border-slate-600'
    }`}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-amber-500 border-2 border-white"
        style={{ left: -6 }}
      />

      <div className="p-4 min-w-[180px]">
        {/* Header */}
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
            <Diamond className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
              {data.title || 'Branch Logic'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {conditionCount} condition{conditionCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Conditions Preview */}
        <div className="space-y-2">
          {branchData?.conditions?.slice(0, 2).map((condition: { conditionId: string; expression: string; targetNodeIdIfTrue: string; priority?: number }, index: number) => (
            <div key={condition.conditionId} className="p-2 bg-slate-50 dark:bg-slate-700 rounded text-xs">
              <div className="flex items-center space-x-1 mb-1">
                <Code className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  IF #{index + 1}
                </span>
              </div>
              <div className="text-slate-600 dark:text-slate-400 font-mono text-xs truncate">
                {condition.expression || 'No expression'}
              </div>
            </div>
          ))}
          
          {conditionCount > 2 && (
            <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
              +{conditionCount - 2} more condition{conditionCount - 2 !== 1 ? 's' : ''}
            </div>
          )}

          {/* Default Path */}
          {branchData?.defaultTargetNodeId && (
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
              <div className="flex items-center space-x-1 mb-1">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  ELSE (Default)
                </span>
              </div>
              <div className="text-gray-600 dark:text-gray-400 text-xs">
                Fallback path
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Output Handles */}
      {/* True condition outputs */}
      {Array.from({ length: Math.min(conditionCount, 3) }).map((_, index) => (
        <Handle
          key={`condition-${index}`}
          type="source"
          position={Position.Right}
          id={`condition-${index}`}
          className="w-3 h-3 bg-green-500 border-2 border-white"
          style={{ 
            right: -6, 
            top: `${25 + (index * 20)}%`
          }}
        />
      ))}
      
      {/* Default output */}
      {branchData?.defaultTargetNodeId && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="default"
          className="w-3 h-3 bg-gray-500 border-2 border-white"
          style={{ bottom: -6 }}
        />
      )}
    </div>
  );
};

export default BranchNode;