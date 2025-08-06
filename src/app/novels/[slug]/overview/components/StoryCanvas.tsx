// src/app/novels/[slug]/overview/components/StoryCanvas.tsx
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
import PreviewPublishTab from './PreviewPublishTab';
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
  initialMode: 'blueprint' | 'director' | 'preview';
  selectedSceneId?: string;
}

export type CanvasMode = 'blueprint' | 'director' | 'preview';

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
  isDirectorsStageOpen: boolean;
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
    lastSaved: null,
    isDirectorsStageOpen: false
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
      selectedNodeId: newMode === 'director' || newMode === 'preview' ? null : prev.selectedNodeId,
      selectedElementId: newMode === 'blueprint' || newMode === 'preview' ? null : prev.selectedElementId,
      isDirectorsStageOpen: newMode === 'director'
    }));
  }, []);

  // Handle Director's Stage modal
  const openDirectorsStage = useCallback((sceneId?: string) => {
    setCanvasState(prev => ({
      ...prev,
      isDirectorsStageOpen: true,
      selectedSceneId: sceneId || prev.selectedSceneId
    }));
  }, []);

  const closeDirectorsStage = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      isDirectorsStageOpen: false
    }));
  }, []);

  // Scene selection handler
  const handleSceneSelect = useCallback((sceneId: string) => {
    setCanvasState(prev => ({
      ...prev,
      selectedSceneId: sceneId
    }));
  }, []);

  // Node selection handler
  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setCanvasState(prev => ({
      ...prev,
      selectedNodeId: nodeId
    }));
  }, []);

  // Element selection handler (for Director's Stage)
  const handleElementSelect = useCallback((elementId: string | null) => {
    setCanvasState(prev => ({
      ...prev,
      selectedElementId: elementId
    }));
  }, []);

  // Toolbar action handlers
  const handlePlayToggle = useCallback(() => {
    setCanvasState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  const handleResetView = useCallback(() => {
    setCanvasState(prev => ({ ...prev, zoomLevel: 1, panOffset: { x: 0, y: 0 } }));
  }, []);

  const handleToggleGrid = useCallback(() => {
    setCanvasState(prev => ({ ...prev, showGrid: !prev.showGrid }));
  }, []);

  const handleToggleMinimap = useCallback(() => {
    setCanvasState(prev => ({ ...prev, showMinimap: !prev.showMinimap }));
  }, []);

  const handleSave = useCallback(() => {
    setCanvasState(prev => ({ ...prev, lastSaved: new Date() }));
  }, []);

  // Database update handlers
  const handleStoryMapUpdate = useCallback(async (updates: any) => {
    // TODO: Implement API call to update StoryMap
    console.log('Update StoryMap:', updates);
    setCanvasState(prev => ({ ...prev, lastSaved: new Date() }));
  }, []);

  const handleSceneUpdate = useCallback(async (sceneId: string, updates: any) => {
    // TODO: Implement API call to update Scene
    console.log('Update Scene:', sceneId, updates);
    setCanvasState(prev => ({ ...prev, lastSaved: new Date() }));
  }, []);

  const handleNovelUpdate = useCallback(async (updates: any) => {
    // TODO: Implement API call to update Novel
    console.log('Update Novel:', updates);
    setCanvasState(prev => ({ ...prev, lastSaved: new Date() }));
  }, []);

  return (
    <div className="story-canvas relative w-full h-full bg-background text-foreground">
      {/* ✅ Enhanced Mode Tabs */}
      <div className="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 z-30">
        <div className="bg-card/95 text-card-foreground backdrop-blur-sm border border-border rounded-lg p-0.5 sm:p-1 shadow-lg">
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              onClick={() => switchMode('blueprint')}
              className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                canvasState.mode === 'blueprint'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <span className="hidden sm:inline">Blueprint Room</span>
              <span className="sm:hidden">Blueprint</span>
            </button>
            <button
              onClick={() => switchMode('director')}
              className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                canvasState.mode === 'director'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <span className="hidden sm:inline">Director&apos;s Stage</span>
              <span className="sm:hidden">Director</span>
            </button>
            <button
              onClick={() => switchMode('preview')}
              className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                canvasState.mode === 'preview'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <span className="hidden sm:inline">Preview & Publish</span>
              <span className="sm:hidden">Preview</span>
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Toolbar (only for blueprint mode) */}
      {canvasState.mode === 'blueprint' && (
        <div className="absolute top-16 sm:top-20 left-2 sm:left-4 z-20">
          <CanvasToolbar
            canvasState={canvasState}
            onPlayToggle={handlePlayToggle}
            onResetView={handleResetView}
            onToggleGrid={handleToggleGrid}
            onToggleMinimap={handleToggleMinimap}
            onSave={handleSave}
          />
        </div>
      )}

      {/* Main Canvas Area */}
      <div className="w-full h-full pt-12 sm:pt-16">
        <AnimatePresence mode="wait">
          {canvasState.mode === 'blueprint' && (
            <motion.div
              key="blueprint"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <BlueprintRoom
                canvasData={canvasData}
                canvasState={canvasState}
                onSceneSelect={handleSceneSelect}
                onNodeSelect={handleNodeSelect}
                onModeSwitch={openDirectorsStage}
                onStoryMapUpdate={handleStoryMapUpdate}
              />
            </motion.div>
          )}

          {canvasState.mode === 'director' && (
            <motion.div
              key="director"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <BlueprintRoom
                canvasData={canvasData}
                canvasState={canvasState}
                onSceneSelect={handleSceneSelect}
                onNodeSelect={handleNodeSelect}
                onModeSwitch={openDirectorsStage}
                onStoryMapUpdate={handleStoryMapUpdate}
              />
            </motion.div>
          )}

          {canvasState.mode === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <PreviewPublishTab
                novel={novel}
                episodes={episodes}
                storyMap={storyMap}
                characters={characters}
                scenes={scenes}
                userMedia={userMedia}
                officialMedia={officialMedia}
                onNovelUpdate={handleNovelUpdate}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ✅ Director's Stage Modal */}
      <DirectorsStage
        canvasData={canvasData}
        canvasState={canvasState}
        onElementSelect={handleElementSelect}
        onModeSwitch={switchMode}
        onSceneUpdate={handleSceneUpdate}
        isOpen={canvasState.isDirectorsStageOpen}
        onClose={closeDirectorsStage}
      />

      {/* Status Bar */}
      <div className="absolute bottom-4 left-4 z-20">
        <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Mode: <span className="text-foreground capitalize">{canvasState.mode}</span></span>
            {canvasState.selectedSceneId && (
              <span>Scene: <span className="text-foreground">{canvasState.selectedSceneId}</span></span>
            )}
            {canvasState.autoSave && (
              <span>Auto-save: <span className="text-green-600">{canvasState.lastSaved ? 'Saved' : 'Enabled'}</span></span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryCanvas;