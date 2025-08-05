"use client";

import React from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Grid3X3, 
  Map as MapIcon,
  Save,
  Settings,
  Maximize2,
  Eye,
  EyeOff
} from 'lucide-react';
import { CanvasState } from '../StoryCanvas';

interface CanvasToolbarProps {
  canvasState: CanvasState;
  onPlayToggle: () => void;
  onResetView: () => void;
  onToggleGrid: () => void;
  onToggleMinimap: () => void;
  onSave: () => void;
}

const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  canvasState,
  onPlayToggle,
  onResetView,
  onToggleGrid,
  onToggleMinimap,
  onSave
}) => {
  return (
    <div className="flex items-center space-x-2">
      {/* Playback Controls */}
      <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
        <button
          onClick={onPlayToggle}
          className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition-colors"
          title={canvasState.isPlaying ? "Pause Preview" : "Play Preview"}
        >
          {canvasState.isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* View Controls */}
      <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
        <button
          onClick={onResetView}
          className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition-colors"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        
        <button
          onClick={onToggleGrid}
          className={`p-2 rounded-md transition-colors ${
            canvasState.showGrid
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
          }`}
          title="Toggle Grid"
        >
          <Grid3X3 className="w-4 h-4" />
        </button>
        
        <button
          onClick={onToggleMinimap}
          className={`p-2 rounded-md transition-colors ${
            canvasState.showMinimap
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
          }`}
          title="Toggle Minimap"
        >
          <MapIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Save Controls */}
      <div className="flex items-center space-x-1">
        <button
          onClick={onSave}
          className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Save className="w-4 h-4" />
          <span>Save</span>
        </button>
      </div>

      {/* Auto-save Indicator */}
      {canvasState.autoSave && (
        <div className="flex items-center space-x-1 text-xs text-slate-500 dark:text-slate-400">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>Auto-save</span>
        </div>
      )}
    </div>
  );
};

export default CanvasToolbar;