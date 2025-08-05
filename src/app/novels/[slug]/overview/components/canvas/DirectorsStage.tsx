"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  RotateCcw,
  Maximize2,
  Layers,
  Clock,
  Settings
} from 'lucide-react';

// Import sub-components
import SceneCanvas from './directors/SceneCanvas';
import AssetPanel from './directors/AssetPanel';
import PropertiesPanel from './directors/PropertiesPanel';
import TimelinePanel from './directors/TimelinePanel';
import SceneSelector from './directors/SceneSelector';

import { CanvasState, CanvasMode } from '../StoryCanvas';

interface DirectorsStageProps {
  canvasData: {
    novel: any;
    episodes: any[];
    storyMap: any | null;
    characters: any[];
    scenes: any[];
    userMedia: any[];
    officialMedia: any[];
  };
  canvasState: CanvasState;
  onElementSelect: (elementId: string | null) => void;
  onModeSwitch: (mode: CanvasMode, sceneId?: string) => void;
}

export interface SceneElement {
  id: string;
  type: 'character' | 'text' | 'image' | 'video' | 'audio' | 'choice' | 'ui';
  data: any;
  transform?: {
    positionX: number;
    positionY: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
    opacity: number;
    zIndex: number;
  };
  isVisible: boolean;
  isLocked: boolean;
}

const DirectorsStage: React.FC<DirectorsStageProps> = ({
  canvasData,
  canvasState,
  onElementSelect,
  onModeSwitch
}) => {
  const { scenes, characters, userMedia, officialMedia } = canvasData;
  
  // Find current scene
  const currentScene = useMemo(() => {
    return scenes.find(scene => scene._id === canvasState.selectedSceneId);
  }, [scenes, canvasState.selectedSceneId]);

  // Scene elements state
  const [selectedElement, setSelectedElement] = useState<SceneElement | null>(null);
  const [timelinePosition, setTimelinePosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Panel visibility states
  const [showAssetPanel, setShowAssetPanel] = useState(true);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true);
  const [showTimelinePanel, setShowTimelinePanel] = useState(true);

  // Handle element selection
  const handleElementSelect = useCallback((element: SceneElement | null) => {
    setSelectedElement(element);
    onElementSelect(element?.id || null);
  }, [onElementSelect]);

  // Handle scene change
  const handleSceneChange = useCallback((sceneId: string) => {
    onModeSwitch('director', sceneId);
  }, [onModeSwitch]);

  // Playback controls
  const handlePlayToggle = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleTimelineSeek = useCallback((position: number) => {
    setTimelinePosition(position);
  }, []);

  // Back to blueprint
  const handleBackToBlueprint = useCallback(() => {
    onModeSwitch('blueprint');
  }, [onModeSwitch]);

  if (!currentScene) {
    return (
      <div className="directors-stage h-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-300 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4 mx-auto">
            <Settings className="w-8 h-8 text-slate-500 dark:text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
            No Scene Selected
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            Select a scene from the Blueprint Room or choose one below
          </p>
          <div className="space-y-2">
            <SceneSelector
              scenes={scenes}
              currentSceneId={null}
              onSceneSelect={handleSceneChange}
            />
            <button
              onClick={handleBackToBlueprint}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Blueprint</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="directors-stage h-full bg-slate-100 dark:bg-slate-900 flex flex-col">
      {/* Stage Header */}
      <div className="stage-header bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBackToBlueprint}
            className="flex items-center space-x-2 px-3 py-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Blueprint</span>
          </button>

          <div className="h-6 w-px bg-slate-300 dark:bg-slate-600" />

          <SceneSelector
            scenes={scenes}
            currentSceneId={currentScene._id}
            onSceneSelect={handleSceneChange}
          />
        </div>

        <div className="flex items-center space-x-4">
          {/* Playback Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePlayToggle}
              className={`p-2 rounded-lg transition-colors ${
                isPlaying
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setTimelinePosition(0)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Panel Toggles */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowAssetPanel(!showAssetPanel)}
              className={`p-2 rounded-lg text-xs transition-colors ${
                showAssetPanel
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title="Toggle Asset Panel"
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowPropertiesPanel(!showPropertiesPanel)}
              className={`p-2 rounded-lg text-xs transition-colors ${
                showPropertiesPanel
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title="Toggle Properties Panel"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowTimelinePanel(!showTimelinePanel)}
              className={`p-2 rounded-lg text-xs transition-colors ${
                showTimelinePanel
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title="Toggle Timeline Panel"
            >
              <Clock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stage Content */}
      <div className="stage-content flex-1 flex overflow-hidden">
        {/* Left Panel - Assets & Elements */}
        <AnimatePresence>
          {showAssetPanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="asset-panel bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              <AssetPanel
                characters={characters}
                userMedia={userMedia}
                officialMedia={officialMedia}
                currentScene={currentScene}
                onElementAdd={(element) => {
                  // Handle adding new element to scene
                  console.log('Add element:', element);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Canvas Area */}
        <div className="canvas-area flex-1 flex flex-col overflow-hidden">
          <SceneCanvas
            scene={currentScene}
            selectedElement={selectedElement}
            timelinePosition={timelinePosition}
            isPlaying={isPlaying}
            onElementSelect={handleElementSelect}
            canvasState={canvasState}
          />
        </div>

        {/* Right Panel - Properties & Inspector */}
        <AnimatePresence>
          {showPropertiesPanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="properties-panel bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              <PropertiesPanel
                scene={currentScene}
                selectedElement={selectedElement}
                characters={characters}
                onElementUpdate={(elementId, updates) => {
                  // Handle element updates
                  console.log('Update element:', elementId, updates);
                }}
                onSceneUpdate={(updates) => {
                  // Handle scene updates
                  console.log('Update scene:', updates);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Panel - Timeline */}
      <AnimatePresence>
        {showTimelinePanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 200, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="timeline-panel bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 overflow-hidden"
          >
            <TimelinePanel
              scene={currentScene}
              currentPosition={timelinePosition}
              isPlaying={isPlaying}
              onSeek={handleTimelineSeek}
              onEventAdd={(event) => {
                // Handle adding new timeline event
                console.log('Add timeline event:', event);
              }}
              onEventUpdate={(eventId, updates) => {
                // Handle timeline event updates
                console.log('Update timeline event:', eventId, updates);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DirectorsStage;