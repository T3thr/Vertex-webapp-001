// src/app/novels/[slug]/overview/components/unified/canvas/LivingCanvas.tsx
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlayIcon, 
  PauseIcon,
  SkipBackIcon,
  SkipForwardIcon,
  SettingsIcon,
  LayersIcon,
  ImageIcon,
  VolumeIcon,
  MousePointerClickIcon,
  EyeIcon,
  EyeOffIcon,
  ZoomInIcon,
  ZoomOutIcon,
  RotateCcwIcon,
  GridIcon,
  SaveIcon
} from 'lucide-react';

import { NovelData, EpisodeData, StoryMapData } from '../../../page';
import { EditorState } from '../UnifiedStorytellingEnvironment';
import { InteractivePreviewCanvas } from './preview/InteractivePreviewCanvas';
import { SceneEditor } from './editor/SceneEditor';
import { TimelineController } from './timeline/TimelineController';
import { LayerManager } from './editor/LayerManager';
import { AssetLibrary } from './assets/AssetLibrary';
import PropertiesInspector from './properties/PropertiesInspector';

interface LivingCanvasProps {
  novel: NovelData;
  episodes: EpisodeData[];
  storyMap: StoryMapData;
  characters: any[];
  scenes: any[];
  userMedia: any[];
  officialMedia: any[];
  editorState: EditorState;
  updateEditorState: (updates: Partial<EditorState>) => void;
}

// Canvas Mode Types
type CanvasMode = 'edit' | 'preview' | 'timeline' | 'layers';

// Panel Types
type PanelType = 'assets' | 'layers' | 'properties' | 'timeline' | null;

export function LivingCanvas({
  novel,
  episodes,
  storyMap,
  characters,
  scenes,
  userMedia,
  officialMedia,
  editorState,
  updateEditorState
}: LivingCanvasProps) {

  // Local Canvas State
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('edit');
  const [activePanel, setActivePanel] = useState<PanelType>('layers');
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Canvas Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<any>(null);

  // Current Scene Data
  const currentScene = scenes.find(scene => scene._id === editorState.selectedSceneId) || scenes[0];

  // Canvas Controls
  const handleZoomIn = useCallback(() => {
    updateEditorState({ zoomLevel: Math.min(editorState.zoomLevel * 1.2, 5) });
  }, [editorState.zoomLevel, updateEditorState]);

  const handleZoomOut = useCallback(() => {
    updateEditorState({ zoomLevel: Math.max(editorState.zoomLevel / 1.2, 0.1) });
  }, [editorState.zoomLevel, updateEditorState]);

  const handleZoomReset = useCallback(() => {
    updateEditorState({ zoomLevel: 1, panOffset: { x: 0, y: 0 } });
  }, [updateEditorState]);

  // Playback Controls
  const handlePlay = useCallback(() => {
    if (!isPlaying) {
      setIsPlaying(true);
      setCanvasMode('preview');
      updateEditorState({ isPlayMode: true });
    } else {
      setIsPlaying(false);
      setCanvasMode('edit');
      updateEditorState({ isPlayMode: false });
    }
  }, [isPlaying, updateEditorState]);

  const handleTimelineSeek = useCallback((position: number) => {
    updateEditorState({ timelinePosition: position });
    if (timelineRef.current) {
      timelineRef.current.seekTo(position);
    }
  }, [updateEditorState]);

  // Element Selection
  const handleElementSelect = useCallback((elementId: string) => {
    setSelectedElement(elementId);
    setActivePanel('properties');
  }, []);

  // Auto-save functionality
  const handleAutoSave = useCallback(async () => {
    try {
      console.log('Auto-saving canvas changes...');
      // TODO: Implement actual save logic
    } catch (error) {
      console.error('Canvas auto-save failed:', error);
    }
  }, []);

  // Keyboard shortcuts for canvas
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          handlePlay();
          break;
        case 'g':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setShowGrid(!showGrid);
          }
          break;
        case 'Escape':
          if (canvasMode === 'preview') {
            setCanvasMode('edit');
            setIsPlaying(false);
            updateEditorState({ isPlayMode: false });
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [canvasMode, showGrid, handlePlay, updateEditorState]);

  // Canvas Toolbar Component
  const CanvasToolbar = () => (
    <div className="flex items-center justify-between p-3 bg-card border-b border-border">
      {/* Left Section - Mode & Controls */}
      <div className="flex items-center space-x-3">
        {/* Canvas Mode Switcher */}
        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => setCanvasMode('edit')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              canvasMode === 'edit'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <SettingsIcon className="w-3 h-3 mr-1 inline" />
            Edit
          </button>
          <button
            onClick={() => setCanvasMode('preview')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              canvasMode === 'preview'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <EyeIcon className="w-3 h-3 mr-1 inline" />
            Preview
          </button>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => handleTimelineSeek(0)}
            className="p-1 text-muted-foreground hover:text-foreground"
            title="Go to beginning"
          >
            <SkipBackIcon className="w-4 h-4" />
          </button>
          
          <button
            onClick={handlePlay}
            className={`p-2 rounded-md transition-colors ${
              isPlaying
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
            title={isPlaying ? 'Stop Preview (Esc)' : 'Play Preview (Space)'}
          >
            {isPlaying ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
          </button>
          
          <button
            onClick={() => handleTimelineSeek(100)}
            className="p-1 text-muted-foreground hover:text-foreground"
            title="Go to end"
          >
            <SkipForwardIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Control */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-muted-foreground">Speed:</span>
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            className="text-xs bg-background border border-border rounded px-2 py-1"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
        </div>
      </div>

      {/* Center Section - Scene Info */}
      <div className="text-center">
        <h3 className="text-sm font-medium text-foreground">
          {currentScene?.title || 'Untitled Scene'}
        </h3>
        <p className="text-xs text-muted-foreground">
          Scene {scenes.indexOf(currentScene) + 1} of {scenes.length}
        </p>
      </div>

      {/* Right Section - View Controls */}
      <div className="flex items-center space-x-2">
        {/* Grid Toggle */}
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`p-2 rounded-md transition-colors ${
            showGrid
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Toggle Grid (Ctrl+G)"
        >
          <GridIcon className="w-4 h-4" />
        </button>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-1">
          <button
            onClick={handleZoomOut}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <ZoomOutIcon className="w-4 h-4" />
          </button>
          
          <span className="text-xs text-muted-foreground min-w-[3rem] text-center">
            {Math.round(editorState.zoomLevel * 100)}%
          </span>
          
          <button
            onClick={handleZoomIn}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <ZoomInIcon className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleZoomReset}
            className="p-1 text-muted-foreground hover:text-foreground"
            title="Reset Zoom"
          >
            <RotateCcwIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Auto-save Button */}
        <button
          onClick={handleAutoSave}
          className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          title="Save Changes"
        >
          <SaveIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // Side Panel Component
  const SidePanel = () => (
    <div className="w-80 bg-card border-l border-border flex flex-col">
      {/* Panel Tabs */}
      <div className="flex border-b border-border">
        {[
          { id: 'layers', label: 'Layers', icon: LayersIcon },
          { id: 'assets', label: 'Assets', icon: ImageIcon },
          { id: 'properties', label: 'Properties', icon: SettingsIcon },
          { id: 'timeline', label: 'Timeline', icon: VolumeIcon }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActivePanel(id as PanelType)}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              activePanel === id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Icon className="w-3 h-3 mr-1 inline" />
            {label}
          </button>
        ))}
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activePanel === 'layers' && (
            <motion.div
              key="layers"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
              <LayerManager
                scene={currentScene}
                selectedElement={selectedElement}
                onElementSelect={handleElementSelect}
                onElementUpdate={() => {}}
              />
            </motion.div>
          )}

          {activePanel === 'assets' && (
            <motion.div
              key="assets"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
              <AssetLibrary
                userMedia={userMedia}
                officialMedia={officialMedia}
                onAssetSelect={(asset) => console.log('Asset selected:', asset)}
              />
            </motion.div>
          )}

          {activePanel === 'properties' && (
            <motion.div
              key="properties"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
              <PropertiesInspector
                selectedElement={selectedElement}
                scene={currentScene}
                onPropertyChange={() => {}}
              />
            </motion.div>
          )}

          {activePanel === 'timeline' && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
              <TimelineController
                ref={timelineRef}
                scene={currentScene}
                isPlaying={isPlaying}
                playbackSpeed={playbackSpeed}
                currentPosition={editorState.timelinePosition}
                onPositionChange={handleTimelineSeek}
                onEventSelect={(eventId) => console.log('Event selected:', eventId)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Canvas Toolbar */}
      <CanvasToolbar />
      
      {/* Main Canvas Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Viewport */}
        <div className="flex-1 relative overflow-hidden">
          <div
            ref={canvasRef}
            className="w-full h-full relative"
            style={{
              transform: `scale(${editorState.zoomLevel}) translate(${editorState.panOffset.x}px, ${editorState.panOffset.y}px)`,
              transformOrigin: 'center center'
            }}
          >
            {/* Grid Overlay */}
            {showGrid && canvasMode === 'edit' && (
              <div 
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(var(--border), 0.5) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(var(--border), 0.5) 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px'
                }}
              />
            )}

            {/* Canvas Content */}
            <AnimatePresence mode="wait">
              {canvasMode === 'preview' || editorState.isPlayMode ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full"
                >
                  <InteractivePreviewCanvas
                    scene={currentScene}
                    characters={characters}
                    userMedia={userMedia}
                    officialMedia={officialMedia}
                    isPlaying={isPlaying}
                    playbackSpeed={playbackSpeed}
                    currentPosition={editorState.timelinePosition}
                    onPositionChange={handleTimelineSeek}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="editor"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full"
                >
                  <SceneEditor
                    scene={currentScene}
                    characters={characters}
                    userMedia={userMedia}
                    officialMedia={officialMedia}
                    selectedElement={selectedElement}
                    onElementSelect={handleElementSelect}
                    showGrid={showGrid}
                    snapToGrid={snapToGrid}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Side Panel */}
        <SidePanel />
      </div>
    </div>
  );
}