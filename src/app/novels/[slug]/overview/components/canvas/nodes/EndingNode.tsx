"use client";

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Trophy, Star, Skull, Heart, Zap, Smile } from 'lucide-react';

interface EndingNodeData {
  nodeId: string;
  title: string;
  nodeType: string;
  nodeSpecificData?: {
    endingTitle: string;
    endingSceneId?: string;
    outcomeDescription?: string;
    unlockCondition?: string;
  };
  scenes?: any[];
  characters?: any[];
  onSceneSelect?: (sceneId: string) => void;
  onModeSwitch?: (mode: 'director', sceneId?: string) => void;
}

const EndingNode = ({ data, selected }: { data: EndingNodeData; selected?: boolean }) => {
  const endingData = data.nodeSpecificData;
  
  // Determine ending type from title or description
  const getEndingIcon = () => {
    const title = endingData?.endingTitle?.toLowerCase() || '';
    const desc = endingData?.outcomeDescription?.toLowerCase() || '';
    
    if (title.includes('true') || title.includes('perfect')) return Trophy;
    if (title.includes('good') || title.includes('happy')) return Star;
    if (title.includes('bad') || title.includes('tragic')) return Skull;
    if (title.includes('romance') || title.includes('love')) return Heart;
    if (title.includes('secret') || title.includes('hidden')) return Zap;
    return Smile; // Default/Normal ending
  };

  const getEndingColor = () => {
    const title = endingData?.endingTitle?.toLowerCase() || '';
    
    if (title.includes('true') || title.includes('perfect')) return 'from-yellow-500 to-yellow-600';
    if (title.includes('good') || title.includes('happy')) return 'from-green-500 to-green-600';
    if (title.includes('bad') || title.includes('tragic')) return 'from-red-500 to-red-600';
    if (title.includes('romance') || title.includes('love')) return 'from-pink-500 to-pink-600';
    if (title.includes('secret') || title.includes('hidden')) return 'from-purple-500 to-purple-600';
    return 'from-blue-500 to-blue-600'; // Default
  };

  const IconComponent = getEndingIcon();

  return (
    <div className={`ending-node bg-gradient-to-br ${getEndingColor()} text-white rounded-xl shadow-lg border-2 transition-all duration-200 ${
      selected ? 'border-white shadow-xl scale-105' : 'border-white/50'
    }`}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-white border-2 border-current"
        style={{ left: -6 }}
      />

      <div className="p-4 min-w-[180px]">
        {/* Header */}
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <IconComponent className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">
              {endingData?.endingTitle || data.title || 'Ending'}
            </h3>
            <p className="text-xs opacity-75">
              Story Conclusion
            </p>
          </div>
        </div>

        {/* Outcome Description */}
        {endingData?.outcomeDescription && (
          <div className="mb-3 p-2 bg-white/10 rounded text-xs">
            {endingData.outcomeDescription}
          </div>
        )}

        {/* Unlock Condition */}
        {endingData?.unlockCondition && (
          <div className="flex items-center space-x-2 text-xs opacity-75">
            <Zap className="w-3 h-3" />
            <span>Conditional Ending</span>
          </div>
        )}

        {/* Scene Reference */}
        {endingData?.endingSceneId && (
          <div className="mt-2 text-xs opacity-75">
            Scene ID: {endingData.endingSceneId}
          </div>
        )}
      </div>
    </div>
  );
};

export default EndingNode;