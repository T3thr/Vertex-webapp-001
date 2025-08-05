"use client";

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Film, Edit3, Eye } from 'lucide-react';

interface SceneNodeData {
  nodeId: string;
  title: string;
  nodeType: string;
  nodeSpecificData?: {
    sceneId: string;
  };
  scenes?: any[];
  characters?: any[];
  onSceneSelect?: (sceneId: string) => void;
  onModeSwitch?: (mode: 'director', sceneId?: string) => void;
}

const SceneNode = ({ data, selected }: { data: SceneNodeData; selected?: boolean }) => {
  const sceneId = data.nodeSpecificData?.sceneId;
  const scene = data.scenes?.find((s: any) => s._id === sceneId);
  
  const handleEditScene = () => {
    if (sceneId && data.onModeSwitch) {
      data.onModeSwitch('director', sceneId);
    }
  };

  const handlePreviewScene = () => {
    if (sceneId && data.onSceneSelect) {
      data.onSceneSelect(sceneId);
    }
  };

  return (
    <div className={`scene-node bg-white dark:bg-slate-800 rounded-xl shadow-lg border-2 transition-all duration-200 ${
      selected ? 'border-blue-400 shadow-xl scale-105' : 'border-slate-200 dark:border-slate-600'
    }`}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
        style={{ left: -6 }}
      />

      <div className="p-4 min-w-[200px]">
        {/* Scene Thumbnail */}
        <div className="w-full h-24 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
          {scene?.thumbnailUrl ? (
            <img 
              src={scene.thumbnailUrl} 
              alt={scene.title || 'Scene thumbnail'}
              className="w-full h-full object-cover"
            />
          ) : (
            <Film className="w-8 h-8 text-blue-500 dark:text-blue-400" />
          )}
        </div>

        {/* Scene Info */}
        <div className="mb-3">
          <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-1">
            {scene?.title || data.title || 'Untitled Scene'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Scene #{scene?.sceneOrder || '?'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button
            onClick={handleEditScene}
            className="flex-1 flex items-center justify-center space-x-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
            disabled={!sceneId}
          >
            <Edit3 className="w-3 h-3" />
            <span>Edit</span>
          </button>
          <button
            onClick={handlePreviewScene}
            className="px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded transition-colors"
            disabled={!sceneId}
            title="Preview Scene"
          >
            <Eye className="w-3 h-3" />
          </button>
        </div>

        {/* Scene Status */}
        {scene && (
          <div className="mt-2 flex items-center space-x-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${
              scene.status === 'published' ? 'bg-green-500' : 
              scene.status === 'draft' ? 'bg-yellow-500' : 'bg-gray-500'
            }`} />
            <span className="text-slate-600 dark:text-slate-400 capitalize">
              {scene.status || 'draft'}
            </span>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
        style={{ right: -6 }}
      />
    </div>
  );
};

export default SceneNode;