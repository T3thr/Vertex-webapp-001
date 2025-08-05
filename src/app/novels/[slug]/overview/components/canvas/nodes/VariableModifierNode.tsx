"use client";

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Calculator, Plus, Minus, Equal, ToggleLeft } from 'lucide-react';

interface VariableModifierNodeData {
  nodeId: string;
  title: string;
  nodeType: string;
  nodeSpecificData?: {
    operations: Array<{
      variableId: string;
      operation: 'set' | 'add' | 'subtract' | 'toggle' | 'push' | 'pop' | 'increment' | 'decrement';
      value?: any;
      valueFromVariableId?: string;
    }>;
  };
  scenes?: any[];
  characters?: any[];
  onSceneSelect?: (sceneId: string) => void;
  onModeSwitch?: (mode: 'director', sceneId?: string) => void;
}

const VariableModifierNode = ({ data, selected }: { data: VariableModifierNodeData; selected?: boolean }) => {
  const operations = data.nodeSpecificData?.operations || [];

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'set': return Equal;
      case 'add':
      case 'increment': return Plus;
      case 'subtract':
      case 'decrement': return Minus;
      case 'toggle': return ToggleLeft;
      default: return Calculator;
    }
  };

  const getOperationSymbol = (operation: string) => {
    switch (operation) {
      case 'set': return '=';
      case 'add': return '+';
      case 'subtract': return '-';
      case 'increment': return '++';
      case 'decrement': return '--';
      case 'toggle': return '!';
      default: return '?';
    }
  };

  return (
    <div className={`variable-modifier-node bg-white dark:bg-slate-800 rounded-xl shadow-lg border-2 transition-all duration-200 ${
      selected ? 'border-indigo-400 shadow-xl scale-105' : 'border-slate-200 dark:border-slate-600'
    }`}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-indigo-500 border-2 border-white"
        style={{ left: -6 }}
      />

      <div className="p-4 min-w-[180px]">
        {/* Header */}
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
            <Calculator className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
              {data.title || 'Variable Modifier'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {operations.length} operation{operations.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Operations Preview */}
        <div className="space-y-2">
          {operations.slice(0, 3).map((operation: any, index: number) => {
            const IconComponent = getOperationIcon(operation.operation);
            return (
              <div key={index} className="flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-700 rounded text-xs">
                <IconComponent className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                <div className="flex-1 font-mono">
                  <span className="text-slate-700 dark:text-slate-300">
                    {operation.variableId || 'var'}
                  </span>
                  <span className="mx-1 text-indigo-600 dark:text-indigo-400">
                    {getOperationSymbol(operation.operation)}
                  </span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {operation.valueFromVariableId || operation.value || '?'}
                  </span>
                </div>
              </div>
            );
          })}
          
          {operations.length > 3 && (
            <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
              +{operations.length - 3} more operation{operations.length - 3 !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* No operations message */}
        {operations.length === 0 && (
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center py-2">
            No operations defined
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-indigo-500 border-2 border-white"
        style={{ right: -6 }}
      />
    </div>
  );
};

export default VariableModifierNode;