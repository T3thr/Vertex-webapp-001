"use client";

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Flag, Play } from 'lucide-react';

interface StartNodeData {
  nodeId: string;
  title: string;
  nodeType: string;
  scenes?: any[];
  characters?: any[];
  onSceneSelect?: (sceneId: string) => void;
  onModeSwitch?: (mode: 'director', sceneId?: string) => void;
}

const StartNode = ({ data, selected }: { data: StartNodeData; selected?: boolean }) => {
  return (
    <div className={`start-node bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-lg border-2 transition-all duration-200 ${
      selected ? 'border-green-300 shadow-xl scale-105' : 'border-green-400'
    }`}>
      <div className="p-4 min-w-[160px]">
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Flag className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium opacity-90">START</span>
        </div>
        
        <h3 className="font-semibold text-sm mb-1">
          {data.title || 'Story Beginning'}
        </h3>
        
        <p className="text-xs opacity-75">
          The starting point of your visual novel
        </p>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-white border-2 border-green-500"
        style={{ right: -6 }}
      />
    </div>
  );
};

export default StartNode;