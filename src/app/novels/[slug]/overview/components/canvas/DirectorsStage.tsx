// src/app/novels/[slug]/overview/components/canvas/DirectorsStage.tsx
"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  RotateCcw,
  Maximize2,
  Layers,
  Clock,
  Settings,
  X,
  Save,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Copy,
  Move,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  Image,
  Type,
  Volume2
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
  onSceneUpdate?: (sceneId: string, updates: any) => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
}

export interface SceneElement {
  id: string;
  type: 'character' | 'text' | 'image' | 'video' | 'audio' | 'choice' | 'ui' | 'background';
  name: string;
  data: any;
  transform: {
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
  isSelected: boolean;
  layerGroup?: string;
  blendMode?: string;
  filters?: {
    blur?: number;
    brightness?: number;
    contrast?: number;
    saturate?: number;
    sepia?: number;
  };
}

export interface LayerGroup {
  id: string;
  name: string;
  isVisible: boolean;
  isLocked: boolean;
  isExpanded: boolean;
  elements: string[];
}

export interface DirectorsStageState {
  selectedElements: string[];
  draggedElement: string | null;
  canvasZoom: number;
  canvasOffset: { x: number; y: number };
  tool: 'select' | 'move' | 'rotate' | 'scale';
  showGrid: boolean;
  snapToGrid: boolean;
  autoSave: boolean;
  saveStatus: 'saved' | 'saving' | 'error';
  lastSaveTime: Date | null;
}

const DirectorsStage: React.FC<DirectorsStageProps> = ({
  canvasData,
  canvasState,
  onElementSelect,
  onModeSwitch,
  onSceneUpdate,
  isOpen,
  onClose
}) => {
  const { scenes, characters, userMedia, officialMedia } = canvasData;
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Find current scene
  const currentScene = useMemo(() => {
    return scenes.find(scene => scene._id === canvasState.selectedSceneId);
  }, [scenes, canvasState.selectedSceneId]);

  // ✅ Enhanced Director's Stage State
  const [stageState, setStageState] = useState<DirectorsStageState>({
    selectedElements: [],
    draggedElement: null,
    canvasZoom: 1,
    canvasOffset: { x: 0, y: 0 },
    tool: 'select',
    showGrid: true,
    snapToGrid: true,
    autoSave: true,
    saveStatus: 'saved',
    lastSaveTime: null
  });

  // Scene elements state
  const [sceneElements, setSceneElements] = useState<SceneElement[]>([]);
  const [layerGroups, setLayerGroups] = useState<LayerGroup[]>([]);
  const [timelinePosition, setTimelinePosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Panel visibility states
  const [showAssetPanel, setShowAssetPanel] = useState(true);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true);
  const [showTimelinePanel, setShowTimelinePanel] = useState(true);

  // ✅ Layer-based Composition System Functions
  const handleElementSelect = useCallback((elementId: string | null, multiSelect = false) => {
    setStageState(prev => {
      if (!elementId) {
        return { ...prev, selectedElements: [] };
      }
      
      if (multiSelect) {
        const isSelected = prev.selectedElements.includes(elementId);
        return {
          ...prev,
          selectedElements: isSelected
            ? prev.selectedElements.filter(id => id !== elementId)
            : [...prev.selectedElements, elementId]
        };
      }
      
      return { ...prev, selectedElements: [elementId] };
    });
    
    onElementSelect(elementId);
  }, [onElementSelect]);

  const addElement = useCallback((type: SceneElement['type'], data: any) => {
    const newElement: SceneElement = {
      id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${type} ${sceneElements.length + 1}`,
      type,
      data,
      transform: {
        positionX: 400,
        positionY: 300,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        opacity: 1,
        zIndex: sceneElements.length + 1
      },
      isVisible: true,
      isLocked: false,
      isSelected: false
    };
    
    setSceneElements(prev => [...prev, newElement]);
    handleElementSelect(newElement.id);
    
    // Auto-save
    if (stageState.autoSave && onSceneUpdate && currentScene) {
      setStageState(prev => ({ ...prev, saveStatus: 'saving' }));
      onSceneUpdate(currentScene._id, {
        elements: [...sceneElements, newElement]
      }).then(() => {
        setStageState(prev => ({ 
          ...prev, 
          saveStatus: 'saved',
          lastSaveTime: new Date()
        }));
      }).catch(() => {
        setStageState(prev => ({ ...prev, saveStatus: 'error' }));
      });
    }
  }, [sceneElements, handleElementSelect, stageState.autoSave, onSceneUpdate, currentScene]);

  const updateElement = useCallback((elementId: string, updates: Partial<SceneElement>) => {
    setSceneElements(prev => 
      prev.map(element => 
        element.id === elementId ? { ...element, ...updates } : element
      )
    );
    
    // Auto-save
    if (stageState.autoSave && onSceneUpdate && currentScene) {
      setStageState(prev => ({ ...prev, saveStatus: 'saving' }));
      const updatedElements = sceneElements.map(element => 
        element.id === elementId ? { ...element, ...updates } : element
      );
      onSceneUpdate(currentScene._id, {
        elements: updatedElements
      }).then(() => {
        setStageState(prev => ({ 
          ...prev, 
          saveStatus: 'saved',
          lastSaveTime: new Date()
        }));
      }).catch(() => {
        setStageState(prev => ({ ...prev, saveStatus: 'error' }));
      });
    }
  }, [sceneElements, stageState.autoSave, onSceneUpdate, currentScene]);

  const deleteElement = useCallback((elementId: string) => {
    setSceneElements(prev => prev.filter(element => element.id !== elementId));
    setStageState(prev => ({
      ...prev,
      selectedElements: prev.selectedElements.filter(id => id !== elementId)
    }));
  }, []);

  const duplicateElement = useCallback((elementId: string) => {
    const element = sceneElements.find(el => el.id === elementId);
    if (!element) return;
    
    const duplicatedElement: SceneElement = {
      ...element,
      id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${element.name} Copy`,
      transform: {
        ...element.transform,
        positionX: element.transform.positionX + 20,
        positionY: element.transform.positionY + 20,
        zIndex: Math.max(...sceneElements.map(el => el.transform.zIndex)) + 1
      }
    };
    
    setSceneElements(prev => [...prev, duplicatedElement]);
    handleElementSelect(duplicatedElement.id);
  }, [sceneElements, handleElementSelect]);

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

  // ✅ Canvas Controls
  const handleZoomIn = useCallback(() => {
    setStageState(prev => ({
      ...prev,
      canvasZoom: Math.min(prev.canvasZoom * 1.2, 3)
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setStageState(prev => ({
      ...prev,
      canvasZoom: Math.max(prev.canvasZoom / 1.2, 0.1)
    }));
  }, []);

  const handleResetView = useCallback(() => {
    setStageState(prev => ({
      ...prev,
      canvasZoom: 1,
      canvasOffset: { x: 0, y: 0 }
    }));
  }, []);

  const handleToggleGrid = useCallback(() => {
    setStageState(prev => ({
      ...prev,
      showGrid: !prev.showGrid
    }));
  }, []);

  // ✅ Initialize scene elements from current scene data
  useEffect(() => {
    if (currentScene && currentScene.elements) {
      setSceneElements(currentScene.elements);
    } else {
      // Create default background element if no elements exist
      setSceneElements([{
        id: 'background_default',
        name: 'Background',
        type: 'background',
        data: { color: '#1a1a1a' },
        transform: {
          positionX: 0,
          positionY: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          opacity: 1,
          zIndex: 0
        },
        isVisible: true,
        isLocked: false,
        isSelected: false
      }]);
    }
  }, [currentScene]);

  // ✅ Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      // Delete selected elements
      if (e.key === 'Delete' || e.key === 'Backspace') {
        stageState.selectedElements.forEach(elementId => {
          deleteElement(elementId);
        });
      }
      
      // Copy (Ctrl+C)
      if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (stageState.selectedElements.length === 1) {
          duplicateElement(stageState.selectedElements[0]);
        }
      }
      
      // Escape to close
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, stageState.selectedElements, deleteElement, duplicateElement, onClose]);

  // ✅ Modal UI with Enhanced Director's Stage
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-[95vw] h-[90vh] bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ✅ Enhanced Header */}
            <div className="flex items-center justify-between p-4 bg-card border-b border-border">
              <div className="flex items-center gap-4">
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-accent transition-colors"
                  title="Back to Blueprint"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                
                <div>
                  <h1 className="text-lg font-semibold text-foreground">
                    Director&apos;s Stage
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Scene: {currentScene?.title || 'Untitled Scene'}
                  </p>
                </div>
                
                {/* Scene Selector */}
                <div className="ml-4">
                  <select
                    value={currentScene?._id || ''}
                    onChange={(e) => handleSceneChange(e.target.value)}
                    className="px-3 py-1 bg-input border border-input-border rounded-md text-sm"
                  >
                    {scenes.map(scene => (
                      <option key={scene._id} value={scene._id}>
                        {scene.title || `Scene ${scene.sceneOrder}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Save Status */}
                <div className="flex items-center gap-2 text-sm">
                  {stageState.saveStatus === 'saving' && (
                    <>
                      <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-muted-foreground">Saving...</span>
                    </>
                  )}
                  {stageState.saveStatus === 'saved' && (
                    <>
                      <Save className="w-3 h-3 text-green-500" />
                      <span className="text-green-600">Saved</span>
                    </>
                  )}
                  {stageState.saveStatus === 'error' && (
                    <>
                      <X className="w-3 h-3 text-red-500" />
                      <span className="text-red-600">Error</span>
                    </>
                  )}
                </div>

                {/* Canvas Controls */}
                <div className="flex items-center gap-1 bg-accent/50 rounded-lg p-1">
                  <button
                    onClick={handleZoomOut}
                    className="p-1 rounded hover:bg-accent transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="px-2 text-xs text-muted-foreground min-w-[3rem] text-center">
                    {Math.round(stageState.canvasZoom * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    className="p-1 rounded hover:bg-accent transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleResetView}
                    className="p-1 rounded hover:bg-accent transition-colors"
                    title="Reset View"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                </div>

                {/* Panel Toggles */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowAssetPanel(!showAssetPanel)}
                    className={`p-2 rounded-lg transition-colors ${
                      showAssetPanel 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-accent'
                    }`}
                    title="Asset Panel"
                  >
                    <Layers className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setShowTimelinePanel(!showTimelinePanel)}
                    className={`p-2 rounded-lg transition-colors ${
                      showTimelinePanel 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-accent'
                    }`}
                    title="Timeline Panel"
                  >
                    <Clock className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setShowPropertiesPanel(!showPropertiesPanel)}
                    className={`p-2 rounded-lg transition-colors ${
                      showPropertiesPanel 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-accent'
                    }`}
                    title="Properties Panel"
                  >
                    <Settings className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleToggleGrid}
                    className={`p-2 rounded-lg transition-colors ${
                      stageState.showGrid 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-accent'
                    }`}
                    title="Toggle Grid"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-accent transition-colors ml-2"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ✅ Main Content Area */}
            <div className="flex-1 flex h-[calc(90vh-5rem)]">
              {/* Left Sidebar - Asset Panel */}
              <AnimatePresence>
                {showAssetPanel && (
                  <motion.div
                    className="w-80 bg-card border-r border-border flex flex-col"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 320, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="p-4 border-b border-border">
                      <h3 className="font-semibold text-foreground mb-2">Assets</h3>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => addElement('character', {})}
                          className="flex items-center gap-2 px-3 py-2 bg-accent rounded-lg hover:bg-accent/80 transition-colors text-sm"
                        >
                          <Image className="w-4 h-4" />
                          Character
                        </button>
                        <button
                          onClick={() => addElement('text', { content: 'New Text' })}
                          className="flex items-center gap-2 px-3 py-2 bg-accent rounded-lg hover:bg-accent/80 transition-colors text-sm"
                        >
                          <Type className="w-4 h-4" />
                          Text
                        </button>
                        <button
                          onClick={() => addElement('audio', {})}
                          className="flex items-center gap-2 px-3 py-2 bg-accent rounded-lg hover:bg-accent/80 transition-colors text-sm"
                        >
                          <Volume2 className="w-4 h-4" />
                          Audio
                        </button>
                      </div>
                    </div>
                    
                    {/* Layer Panel */}
                    <div className="flex-1 overflow-y-auto scrollbar-thin">
                      <div className="p-4">
                        <h4 className="font-medium text-foreground mb-3">Layers</h4>
                        <div className="space-y-1">
                          {sceneElements
                            .sort((a, b) => b.transform.zIndex - a.transform.zIndex)
                            .map(element => (
                              <div
                                key={element.id}
                                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                                  stageState.selectedElements.includes(element.id)
                                    ? 'bg-primary/20 border border-primary/30'
                                    : 'hover:bg-accent/50'
                                }`}
                                onClick={() => handleElementSelect(element.id)}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateElement(element.id, { isVisible: !element.isVisible });
                                  }}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  {element.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                                <span className="flex-1 text-sm truncate">{element.name}</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      duplicateElement(element.id);
                                    }}
                                    className="p-1 text-muted-foreground hover:text-foreground"
                                    title="Duplicate"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteElement(element.id);
                                    }}
                                    className="p-1 text-muted-foreground hover:text-red-500"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Center - Scene Canvas */}
              <div className="flex-1 relative bg-background overflow-hidden">
                {/* Canvas Viewport */}
                <div
                  ref={canvasRef}
                  className="w-full h-full relative"
                  style={{
                    transform: `scale(${stageState.canvasZoom}) translate(${stageState.canvasOffset.x}px, ${stageState.canvasOffset.y}px)`,
                    transformOrigin: 'center center'
                  }}
                >
                  {/* Grid */}
                  {stageState.showGrid && (
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage: `
                          linear-gradient(to right, hsl(var(--muted)) 1px, transparent 1px),
                          linear-gradient(to bottom, hsl(var(--muted)) 1px, transparent 1px)
                        `,
                        backgroundSize: '20px 20px'
                      }}
                    />
                  )}
                  
                  {/* Scene Elements */}
                  {sceneElements.map(element => (
                    <div
                      key={element.id}
                      className={`absolute cursor-pointer transition-all ${
                        stageState.selectedElements.includes(element.id)
                          ? 'ring-2 ring-primary ring-offset-2'
                          : ''
                      }`}
                      style={{
                        left: element.transform.positionX,
                        top: element.transform.positionY,
                        transform: `scale(${element.transform.scaleX}, ${element.transform.scaleY}) rotate(${element.transform.rotation}deg)`,
                        opacity: element.transform.opacity,
                        zIndex: element.transform.zIndex,
                        visibility: element.isVisible ? 'visible' : 'hidden'
                      }}
                      onClick={() => handleElementSelect(element.id)}
                    >
                      {/* Element Content */}
                      {element.type === 'background' && (
                        <div
                          className="w-screen h-screen"
                          style={{ backgroundColor: element.data.color || '#1a1a1a' }}
                        />
                      )}
                      {element.type === 'text' && (
                        <div className="p-4 bg-card/80 backdrop-blur-sm rounded-lg border border-border">
                          <p className="text-foreground">{element.data.content || 'Text Element'}</p>
                        </div>
                      )}
                      {element.type === 'character' && (
                        <div className="w-32 h-48 bg-accent/30 rounded-lg border border-border flex items-center justify-center">
                          <span className="text-muted-foreground text-sm">Character</span>
                        </div>
                      )}
                      {element.type === 'audio' && (
                        <div className="w-16 h-16 bg-accent/30 rounded-full border border-border flex items-center justify-center">
                          <Volume2 className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Sidebar - Properties Panel */}
              <AnimatePresence>
                {showPropertiesPanel && (
                  <motion.div
                    className="w-80 bg-card border-l border-border flex flex-col"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 320, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="p-4 border-b border-border">
                      <h3 className="font-semibold text-foreground">Properties</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
                      {stageState.selectedElements.length > 0 ? (
                        <div className="space-y-4">
                          {stageState.selectedElements.map(elementId => {
                            const element = sceneElements.find(el => el.id === elementId);
                            if (!element) return null;
                            
                            return (
                              <div key={elementId} className="space-y-3">
                                <div>
                                  <label className="block text-sm font-medium text-foreground mb-1">
                                    Name
                                  </label>
                                  <input
                                    type="text"
                                    value={element.name}
                                    onChange={(e) => updateElement(elementId, { name: e.target.value })}
                                    className="w-full px-3 py-2 bg-input border border-input-border rounded-md text-sm"
                                  />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                      X
                                    </label>
                                    <input
                                      type="number"
                                      value={element.transform.positionX}
                                      onChange={(e) => updateElement(elementId, {
                                        transform: { ...element.transform, positionX: Number(e.target.value) }
                                      })}
                                      className="w-full px-2 py-1 bg-input border border-input-border rounded text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                      Y
                                    </label>
                                    <input
                                      type="number"
                                      value={element.transform.positionY}
                                      onChange={(e) => updateElement(elementId, {
                                        transform: { ...element.transform, positionY: Number(e.target.value) }
                                      })}
                                      className="w-full px-2 py-1 bg-input border border-input-border rounded text-xs"
                                    />
                                  </div>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-foreground mb-1">
                                    Opacity
                                  </label>
                                  <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={element.transform.opacity}
                                    onChange={(e) => updateElement(elementId, {
                                      transform: { ...element.transform, opacity: Number(e.target.value) }
                                    })}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">Select an element to edit properties</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom - Timeline Panel */}
            <AnimatePresence>
              {showTimelinePanel && (
                <motion.div
                  className="h-48 bg-card border-t border-border"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 192, opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="p-4 h-full">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-foreground">Timeline</h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handlePlayToggle}
                          className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setTimelinePosition(0)}
                          className="p-2 rounded-lg hover:bg-accent transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Timeline Scrubber */}
                    <div className="relative h-2 bg-accent rounded-full mb-4">
                      <div
                        className="absolute top-0 left-0 h-full bg-primary rounded-full"
                        style={{ width: `${timelinePosition}%` }}
                      />
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={timelinePosition}
                        onChange={(e) => setTimelinePosition(Number(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      Timeline controls and keyframe editing will be implemented here
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DirectorsStage;