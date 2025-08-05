"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers3, 
  Map, 
  Settings, 
  Play, 
  Pause, 
  RotateCcw,
  Maximize2,
  Minimize2,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';

// Import sub-components
import BlueprintRoom from './canvas/BlueprintRoom';
import DirectorsStage from './canvas/DirectorsStage';
import CanvasToolbar from './canvas/CanvasToolbar';
import ModeToggle from './canvas/ModeToggle';

// Types based on our Mongoose models
interface StoryCanvasProps {
  novel: any;
  episodes: any[];
  storyMap: any | null;
  characters: any[];
  scenes: any[];
  userMedia: any[];
  officialMedia: any[];
  initialMode: 'blueprint' | 'director';
  selectedSceneId?: string;
}

export type CanvasMode = 'blueprint' | 'director';

export interface CanvasState {
  mode: CanvasMode;
  selectedSceneId: string | null;
  selectedNodeId: string | null;
  selectedElementId: string | null;
  isPlaying: boolean;
  zoomLevel: number;
  panOffset: { x: number; y: number };
  showGrid: boolean;
  showMinimap: boolean;
  autoSave: boolean;
  lastSaved: Date | null;
}

const StoryCanvas: React.FC<StoryCanvasProps> = ({
  novel,
  episodes,
  storyMap,
  characters,
  scenes,
  userMedia,
  officialMedia,
  initialMode,
  selectedSceneId
}) => {
  // Canvas state management
  const [canvasState, setCanvasState] = useState<CanvasState>({
    mode: initialMode,
    selectedSceneId: selectedSceneId || null,
    selectedNodeId: null,
    selectedElementId: null,
    isPlaying: false,
    zoomLevel: 1,
    panOffset: { x: 0, y: 0 },
    showGrid: true,
    showMinimap: true,
    autoSave: true,
    lastSaved: null
  });

  // Memoized data preparation
  const canvasData = useMemo(() => ({
    novel,
    episodes,
    storyMap,
    characters,
    scenes,
    userMedia,
    officialMedia
  }), [novel, episodes, storyMap, characters, scenes, userMedia, officialMedia]);

  // Canvas mode switching
  const switchMode = useCallback((newMode: CanvasMode, sceneId?: string) => {
    setCanvasState(prev => ({
      ...prev,
      mode: newMode,
      selectedSceneId: sceneId || prev.selectedSceneId,
      selectedNodeId: newMode === 'director' ? null : prev.selectedNodeId,
      selectedElementId: newMode === 'blueprint' ? null : prev.selectedElementId
    }));
  }, []);

  // Scene selection handler
  const handleSceneSelect = useCallback((sceneId: string) => {
    setCanvasState(prev => ({
      ...prev,
      selectedSceneId: sceneId,
      mode: 'director' // Auto-switch to director mode when selecting a scene
    }));
  }, []);

  // Node selection handler
  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setCanvasState(prev => ({
      ...prev,
      selectedNodeId: nodeId
    }));
  }, []);

  // Element selection handler (for director mode)
  const handleElementSelect = useCallback((elementId: string | null) => {
    setCanvasState(prev => ({
      ...prev,
      selectedElementId: elementId
    }));
  }, []);

  // Playback controls
  const togglePlayback = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      isPlaying: !prev.isPlaying
    }));
  }, []);

  // Canvas controls
  const resetView = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      zoomLevel: 1,
      panOffset: { x: 0, y: 0 }
    }));
  }, []);

  const toggleGrid = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      showGrid: !prev.showGrid
    }));
  }, []);

  const toggleMinimap = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      showMinimap: !prev.showMinimap
    }));
  }, []);

  // Save handler
  const handleSave = useCallback(async () => {
    try {
      // Implement save logic here
      setCanvasState(prev => ({
        ...prev,
        lastSaved: new Date()
      }));
      console.log('Canvas saved successfully');
    } catch (error) {
      console.error('Failed to save canvas:', error);
    }
  }, []);

  return (
    <div className="story-canvas h-screen bg-slate-100 dark:bg-slate-900 flex flex-col overflow-hidden">
      {/* Canvas Header */}
      <div className="canvas-header bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">SC</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                Story Canvas
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {novel.title}
              </p>
            </div>
          </div>

          <ModeToggle 
            currentMode={canvasState.mode}
            onModeChange={switchMode}
          />
        </div>

        <CanvasToolbar
          canvasState={canvasState}
          onPlayToggle={togglePlayback}
          onResetView={resetView}
          onToggleGrid={toggleGrid}
          onToggleMinimap={toggleMinimap}
          onSave={handleSave}
        />
      </div>

      {/* Canvas Content */}
      <div className="canvas-content flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          {canvasState.mode === 'blueprint' ? (
            <motion.div
              key="blueprint"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <BlueprintRoom
                canvasData={canvasData}
                canvasState={canvasState}
                onSceneSelect={handleSceneSelect}
                onNodeSelect={handleNodeSelect}
                onModeSwitch={switchMode}
              />
            </motion.div>
          ) : (
            <motion.div
              key="director"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <DirectorsStage
                canvasData={canvasData}
                canvasState={canvasState}
                onElementSelect={handleElementSelect}
                onModeSwitch={switchMode}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Canvas Status Bar */}
      <div className="canvas-status bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center space-x-4">
          <span>
            Mode: <span className="font-medium capitalize">{canvasState.mode}</span>
          </span>
          <span>
            Zoom: {Math.round(canvasState.zoomLevel * 100)}%
          </span>
          {canvasState.selectedSceneId && (
            <span>
              Scene: {scenes.find(s => s._id === canvasState.selectedSceneId)?.title || 'Untitled'}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {canvasState.lastSaved && (
            <span>
              Saved: {canvasState.lastSaved.toLocaleTimeString()}
            </span>
          )}
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${canvasState.autoSave ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span>Auto-save {canvasState.autoSave ? 'On' : 'Off'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryCanvas;