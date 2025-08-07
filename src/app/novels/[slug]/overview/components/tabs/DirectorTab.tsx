// src/app/novels/[slug]/overview/components/tabs/DirectorTab.tsx
"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Image as ImageIcon,
  Type,
  Users,
  Music,
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Copy,
  Trash2,
  Plus,
  Settings,
  Maximize2,
  RotateCcw,
  Move3D,
  Palette,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

import { NovelData, EpisodeData, StoryMapData } from '../../page';

// Interface สำหรับ Scene Element
interface SceneElement {
  id: string;
  type: 'character' | 'text' | 'image' | 'video' | 'audio' | 'background';
  name: string;
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
  data: any;
}

// Interface สำหรับ Timeline Event
interface TimelineEvent {
  id: string;
  startTime: number;
  duration: number;
  elementId: string;
  eventType: string;
  properties: any;
}

// Interface สำหรับ Director Tab Props
interface DirectorTabProps {
  novel: NovelData;
  episodes: EpisodeData[];
  storyMap: StoryMapData | null;
  characters: any[];
  scenes: any[];
  userMedia: any[];
  officialMedia: any[];
  editorState: any;
  updateEditorState: (updates: any) => void;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

// Interface สำหรับ Director State
interface DirectorState {
  selectedSceneId: string | null;
  selectedElementId: string | null;
  selectedLayerId: string | null;
  isPlaying: boolean;
  currentTime: number;
  zoomLevel: number;
  showGrid: boolean;
  showRulers: boolean;
  previewMode: 'editor' | 'reader';
}

const DirectorTab: React.FC<DirectorTabProps> = ({
  novel,
  episodes,
  storyMap,
  characters,
  scenes,
  userMedia,
  officialMedia,
  editorState,
  updateEditorState,
  isMobile,
  isTablet,
  isDesktop
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  // Panel States
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(!isMobile);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(!isMobile);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(!isMobile);

  // Director State
  const [directorState, setDirectorState] = useState<DirectorState>({
    selectedSceneId: scenes[0]?._id || null,
    selectedElementId: null,
    selectedLayerId: null,
    isPlaying: false,
    currentTime: 0,
    zoomLevel: 1,
    showGrid: true,
    showRulers: true,
    previewMode: 'editor'
  });

  // Current Scene Data (จากข้อมูล MongoDB)
  const currentScene = useMemo(() => {
    if (!directorState.selectedSceneId) return null;
    return scenes.find(scene => scene._id === directorState.selectedSceneId) || null;
  }, [scenes, directorState.selectedSceneId]);

  // Scene Elements (แปลงจากข้อมูล MongoDB)
  const sceneElements = useMemo<SceneElement[]>(() => {
    if (!currentScene) return [];

    const elements: SceneElement[] = [];

    // Background
    if (currentScene.background) {
      elements.push({
        id: 'background',
        type: 'background',
        name: 'Background',
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
        data: currentScene.background
      });
    }

    // Characters
    currentScene.characters?.forEach((char: any) => {
      elements.push({
        id: char.instanceId,
        type: 'character',
        name: char.characterId?.name || `Character ${char.instanceId}`,
        transform: {
          positionX: char.transform?.positionX || 0,
          positionY: char.transform?.positionY || 0,
          scaleX: char.transform?.scaleX || 1,
          scaleY: char.transform?.scaleY || 1,
          rotation: char.transform?.rotation || 0,
          opacity: char.transform?.opacity || 1,
          zIndex: char.transform?.zIndex || 1
        },
        isVisible: char.isVisible !== false,
        isLocked: false,
        data: char
      });
    });

    // Text Contents
    currentScene.textContents?.forEach((text: any) => {
      elements.push({
        id: text.instanceId,
        type: 'text',
        name: text.speakerDisplayName || 'Text',
        transform: {
          positionX: text.transform?.positionX || 0,
          positionY: text.transform?.positionY || 0,
          scaleX: text.transform?.scaleX || 1,
          scaleY: text.transform?.scaleY || 1,
          rotation: text.transform?.rotation || 0,
          opacity: text.transform?.opacity || 1,
          zIndex: text.transform?.zIndex || 2
        },
        isVisible: true,
        isLocked: false,
        data: text
      });
    });

    // Images
    currentScene.images?.forEach((img: any) => {
      elements.push({
        id: img.instanceId,
        type: 'image',
        name: 'Image',
        transform: {
          positionX: img.transform?.positionX || 0,
          positionY: img.transform?.positionY || 0,
          scaleX: img.transform?.scaleX || 1,
          scaleY: img.transform?.scaleY || 1,
          rotation: img.transform?.rotation || 0,
          opacity: img.transform?.opacity || 1,
          zIndex: img.transform?.zIndex || 1
        },
        isVisible: img.isVisible !== false,
        isLocked: false,
        data: img
      });
    });

    // Audio Elements
    currentScene.audios?.forEach((audio: any) => {
      elements.push({
        id: audio.instanceId,
        type: 'audio',
        name: `Audio (${audio.type})`,
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
        data: audio
      });
    });

    return elements.sort((a, b) => a.transform.zIndex - b.transform.zIndex);
  }, [currentScene]);

  // Timeline Events (จาก timelineTracks ใน Scene)
  const timelineEvents = useMemo<TimelineEvent[]>(() => {
    if (!currentScene?.timelineTracks) return [];

    const events: TimelineEvent[] = [];
    
    currentScene.timelineTracks.forEach((track: any) => {
      track.events?.forEach((event: any) => {
        events.push({
          id: event.eventId,
          startTime: event.startTimeMs || 0,
          duration: event.durationMs || 1000,
          elementId: event.targetInstanceId || '',
          eventType: event.eventType,
          properties: event.parameters
        });
      });
    });

    return events.sort((a, b) => a.startTime - b.startTime);
  }, [currentScene]);

  // Director State Handlers
  const updateDirectorState = useCallback((updates: Partial<DirectorState>) => {
    setDirectorState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleSceneSelect = useCallback((sceneId: string) => {
    updateDirectorState({ selectedSceneId: sceneId, selectedElementId: null });
    updateEditorState({ selectedSceneId: sceneId, hasUnsavedChanges: true });
  }, [updateDirectorState, updateEditorState]);

  const handleElementSelect = useCallback((elementId: string) => {
    updateDirectorState({ selectedElementId: elementId });
  }, [updateDirectorState]);

  const handlePlayToggle = useCallback(() => {
    updateDirectorState({ isPlaying: !directorState.isPlaying });
  }, [directorState.isPlaying, updateDirectorState]);

  const handleTimeChange = useCallback((time: number) => {
    updateDirectorState({ currentTime: time });
  }, [updateDirectorState]);

  // Element Manipulation
  const handleAddElement = useCallback(async (type: string) => {
    if (!directorState.selectedSceneId) {
      console.error('No scene selected');
      return;
    }

    try {
      const response = await fetch(`/api/novels/${novel.slug}/scenes/${directorState.selectedSceneId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          elementType: type,
          elementData: {
            transform: {
              positionX: 100,
              positionY: 100,
              scaleX: 1,
              scaleY: 1,
              rotation: 0,
              opacity: 1,
              zIndex: 1
            },
            isVisible: true
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Element added successfully:', result.data.element);
        updateEditorState({ hasUnsavedChanges: false });
        // TODO: Refresh scene data
      } else {
        console.error('Failed to add element:', await response.text());
      }
    } catch (error) {
      console.error('Error adding element:', error);
    }
  }, [novel.slug, directorState.selectedSceneId, updateEditorState]);

  const handleUpdateElement = useCallback(async (elementId: string, updates: any) => {
    // TODO: Implement API call to update element
    console.log('Updating element:', elementId, updates);
    updateEditorState({ hasUnsavedChanges: true });
  }, [updateEditorState]);

  const handleDeleteElement = useCallback(async (elementId: string) => {
    // TODO: Implement API call to delete element
    console.log('Deleting element:', elementId);
    updateEditorState({ hasUnsavedChanges: true });
  }, [updateEditorState]);

  // Render Left Panel (Assets & Tools)
  const renderLeftPanel = () => (
    <AnimatePresence>
      {isLeftPanelOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: isMobile ? '100%' : 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          className="bg-card border-r border-border flex flex-col"
        >
          {/* Panel Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Assets</h3>
              <button
                onClick={() => setIsLeftPanelOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Asset Categories */}
          <div className="flex-1 overflow-y-auto">
            {/* Characters */}
            <div className="p-4 border-b border-border">
              <h4 className="text-sm font-medium text-foreground mb-3 flex items-center">
                <Users className="w-4 h-4 mr-2" />
                ตัวละคร
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {characters.map((character) => (
                  <motion.button
                    key={character._id}
                    className="p-2 border border-border rounded-lg hover:border-primary/50 hover:bg-accent transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAddElement('character')}
                  >
                    <div className="w-full aspect-square bg-muted rounded mb-2 flex items-center justify-center">
                      <Users className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="text-xs font-medium text-foreground truncate">
                      {character.name}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Media Assets */}
            <div className="p-4 border-b border-border">
              <h4 className="text-sm font-medium text-foreground mb-3 flex items-center">
                <ImageIcon className="w-4 h-4 mr-2" />
                รูปภาพ
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {userMedia.slice(0, 6).map((media) => (
                  <motion.button
                    key={media._id}
                    className="p-2 border border-border rounded-lg hover:border-primary/50 hover:bg-accent transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAddElement('image')}
                  >
                    <div className="w-full aspect-square bg-muted rounded mb-2 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="text-xs font-medium text-foreground truncate">
                      {media.filename}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Quick Add Tools */}
            <div className="p-4">
              <h4 className="text-sm font-medium text-foreground mb-3">เครื่องมือ</h4>
              <div className="space-y-2">
                <button
                  onClick={() => handleAddElement('text')}
                  className="w-full flex items-center p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <Type className="w-4 h-4 mr-3 text-muted-foreground" />
                  <span className="text-sm text-foreground">เพิ่มข้อความ</span>
                </button>
                <button
                  onClick={() => handleAddElement('audio')}
                  className="w-full flex items-center p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <Music className="w-4 h-4 mr-3 text-muted-foreground" />
                  <span className="text-sm text-foreground">เพิ่มเสียง</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render Scene Canvas
  const renderSceneCanvas = () => (
    <div className="flex-1 relative bg-muted/20">
      {/* Canvas Header */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
        {/* Scene Selector */}
        <div className="flex items-center space-x-2">
          <select
            value={directorState.selectedSceneId || ''}
            onChange={(e) => handleSceneSelect(e.target.value)}
            className="px-3 py-1 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">เลือกฉาก</option>
            {scenes.map((scene) => (
              <option key={scene._id} value={scene._id}>
                {scene.title || `ฉาก ${scene.sceneOrder}`}
              </option>
            ))}
          </select>
        </div>

        {/* Canvas Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => updateDirectorState({ previewMode: directorState.previewMode === 'editor' ? 'reader' : 'editor' })}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              directorState.previewMode === 'reader'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-card-foreground border border-border'
            }`}
          >
            {directorState.previewMode === 'reader' ? 'Reader View' : 'Editor View'}
          </button>
          
          <div className="flex items-center bg-card border border-border rounded-lg">
            <button
              onClick={() => updateDirectorState({ showGrid: !directorState.showGrid })}
              className={`p-2 ${directorState.showGrid ? 'text-primary' : 'text-muted-foreground'}`}
              title="แสดง/ซ่อน Grid"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => updateDirectorState({ zoomLevel: Math.min(directorState.zoomLevel * 1.2, 3) })}
              className="p-2 text-muted-foreground hover:text-foreground border-l border-border"
              title="ขยาย"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas */}
      <div
        ref={canvasRef}
        className="w-full h-full relative overflow-hidden"
        style={{
          backgroundImage: directorState.showGrid 
            ? `radial-gradient(circle, hsl(var(--muted-foreground)) 1px, transparent 1px)`
            : 'none',
          backgroundSize: '20px 20px'
        }}
      >
        {/* Preview Mode: Reader View */}
        {directorState.previewMode === 'reader' && currentScene && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            {/* Visual Novel Reader Preview */}
            <div className="w-full max-w-4xl h-full relative">
              {/* Background */}
              {currentScene.background && (
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: currentScene.background.type === 'image' 
                      ? `url(${currentScene.background.value})`
                      : undefined,
                    backgroundColor: currentScene.background.type === 'color' 
                      ? currentScene.background.value
                      : undefined
                  }}
                />
              )}

              {/* Characters */}
              {sceneElements
                .filter(el => el.type === 'character' && el.isVisible)
                .map((character) => (
                  <div
                    key={character.id}
                    className="absolute"
                    style={{
                      left: `${character.transform.positionX}px`,
                      top: `${character.transform.positionY}px`,
                      transform: `scale(${character.transform.scaleX}, ${character.transform.scaleY}) rotate(${character.transform.rotation}deg)`,
                      opacity: character.transform.opacity,
                      zIndex: character.transform.zIndex
                    }}
                  >
                    <div className="w-48 h-64 bg-gradient-to-b from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-medium">
                      {character.name}
                    </div>
                  </div>
                ))}

              {/* Text/Dialogue */}
              {sceneElements
                .filter(el => el.type === 'text' && el.isVisible)
                .map((text) => (
                  <div
                    key={text.id}
                    className="absolute bottom-4 left-4 right-4 bg-black/80 text-white p-4 rounded-lg"
                    style={{
                      zIndex: text.transform.zIndex
                    }}
                  >
                    <div className="font-medium mb-1">{text.name}</div>
                    <div>{text.data.content}</div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Edit Mode: Layer-based Canvas */}
        {directorState.previewMode === 'editor' && (
          <div className="absolute inset-0 p-16">
            <div 
              className="w-full h-full relative border-2 border-dashed border-muted-foreground/20 bg-background/50"
              style={{ transform: `scale(${directorState.zoomLevel})` }}
            >
              {/* Canvas Elements */}
              {sceneElements.map((element) => (
                <motion.div
                  key={element.id}
                  className={`
                    absolute cursor-pointer select-none border-2 transition-colors
                    ${directorState.selectedElementId === element.id 
                      ? 'border-primary shadow-lg shadow-primary/20' 
                      : 'border-transparent hover:border-primary/50'
                    }
                    ${!element.isVisible ? 'opacity-50' : ''}
                  `}
                  style={{
                    left: element.transform.positionX,
                    top: element.transform.positionY,
                    transform: `scale(${element.transform.scaleX}, ${element.transform.scaleY}) rotate(${element.transform.rotation}deg)`,
                    opacity: element.transform.opacity,
                    zIndex: element.transform.zIndex
                  }}
                  onClick={() => handleElementSelect(element.id)}
                  whileHover={{ scale: 1.02 }}
                  drag
                  dragMomentum={false}
                  onDragEnd={(event, info) => {
                    handleUpdateElement(element.id, {
                      'transform.positionX': element.transform.positionX + info.offset.x,
                      'transform.positionY': element.transform.positionY + info.offset.y
                    });
                  }}
                >
                  {/* Element Content */}
                  <div className="relative">
                    {element.type === 'character' && (
                      <div className="w-32 h-48 bg-gradient-to-b from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-medium">
                        {element.name}
                      </div>
                    )}
                    {element.type === 'text' && (
                      <div className="min-w-48 p-3 bg-card border border-border rounded-lg">
                        <div className="text-sm font-medium text-foreground">{element.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {element.data.content?.substring(0, 50)}...
                        </div>
                      </div>
                    )}
                    {element.type === 'image' && (
                      <div className="w-32 h-32 bg-muted rounded-lg border-2 border-border flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    {element.type === 'audio' && (
                      <div className="w-24 h-12 bg-muted rounded-lg border border-border flex items-center justify-center">
                        <Music className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    {element.type === 'background' && (
                      <div className="w-full h-full absolute inset-0 -z-10 rounded-lg border border-dashed border-muted-foreground/30 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">Background</span>
                      </div>
                    )}

                    {/* Element Label */}
                    <div className="absolute -top-6 left-0 text-xs bg-card border border-border rounded px-2 py-1 text-foreground">
                      {element.name}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Empty State */}
              {sceneElements.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-4">🎬</div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      เริ่มแต่งฉาก
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      เพิ่มตัวละครและองค์ประกอบอื่นๆ เพื่อสร้างฉาก
                    </p>
                    <button
                      onClick={() => handleAddElement('character')}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Users className="w-4 h-4 mr-2 inline" />
                      เพิ่มตัวละคร
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Render Right Panel (Properties & Layers)
  const renderRightPanel = () => (
    <AnimatePresence>
      {isRightPanelOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: isMobile ? '100%' : 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          className="bg-card border-l border-border flex flex-col"
        >
          {/* Panel Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Layers & Properties</h3>
              <button
                onClick={() => setIsRightPanelOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Layers Panel */}
          <div className="flex-1 border-b border-border">
            <div className="p-4">
              <h4 className="text-sm font-medium text-foreground mb-3 flex items-center">
                <Layers className="w-4 h-4 mr-2" />
                Layers
              </h4>
              <div className="space-y-1">
                {sceneElements
                  .sort((a, b) => b.transform.zIndex - a.transform.zIndex)
                  .map((element) => (
                    <motion.div
                      key={element.id}
                      className={`
                        flex items-center p-2 rounded-lg cursor-pointer transition-colors
                        ${directorState.selectedElementId === element.id 
                          ? 'bg-primary/10 border border-primary' 
                          : 'hover:bg-accent'
                        }
                      `}
                      onClick={() => handleElementSelect(element.id)}
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateElement(element.id, { isVisible: !element.isVisible });
                          }}
                          className="mr-2 text-muted-foreground hover:text-foreground"
                        >
                          {element.isVisible ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {element.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {element.type}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateElement(element.id, { isLocked: !element.isLocked });
                          }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {element.isLocked ? (
                            <Lock className="w-3 h-3" />
                          ) : (
                            <Unlock className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteElement(element.id);
                          }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </div>
          </div>

          {/* Properties Panel */}
          <div className="flex-1">
            <div className="p-4">
              <h4 className="text-sm font-medium text-foreground mb-3">Properties</h4>
              {directorState.selectedElementId ? (
                <div className="space-y-4">
                  {/* Transform Properties */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                      Position
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="X"
                        className="px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <input
                        type="number"
                        placeholder="Y"
                        className="px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                      Scale
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Width"
                        step="0.1"
                        className="px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <input
                        type="number"
                        placeholder="Height"
                        step="0.1"
                        className="px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                      Opacity
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      className="w-full"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8">
                  เลือก Element เพื่อแสดง Properties
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render Bottom Panel (Timeline)
  const renderBottomPanel = () => (
    <AnimatePresence>
      {isBottomPanelOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 200, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-card border-t border-border flex flex-col"
        >
          {/* Timeline Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Timeline
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePlayToggle}
                    className="p-1 text-muted-foreground hover:text-foreground"
                  >
                    {directorState.isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                  <button className="p-1 text-muted-foreground hover:text-foreground">
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button className="p-1 text-muted-foreground hover:text-foreground">
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <button
                onClick={() => setIsBottomPanelOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Timeline Content */}
          <div className="flex-1 p-4">
            <div 
              ref={timelineRef}
              className="relative h-full bg-muted/20 rounded-lg overflow-x-auto"
            >
              {/* Timeline Ruler */}
              <div className="absolute top-0 left-0 right-0 h-8 bg-background border-b border-border flex items-center px-4">
                {Array.from({ length: 20 }, (_, i) => (
                  <div key={i} className="flex-1 text-xs text-muted-foreground text-center border-r border-border last:border-r-0">
                    {i}s
                  </div>
                ))}
              </div>

              {/* Timeline Events */}
              <div className="pt-8">
                {timelineEvents.map((event) => (
                  <div
                    key={event.id}
                    className="absolute h-6 bg-primary/20 border border-primary rounded text-xs px-2 flex items-center text-primary-foreground"
                    style={{
                      left: `${(event.startTime / 1000) * 80}px`,
                      width: `${(event.duration / 1000) * 80}px`,
                      top: `${40 + (timelineEvents.indexOf(event) % 5) * 30}px`
                    }}
                  >
                    {event.eventType}
                  </div>
                ))}
              </div>

              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                style={{
                  left: `${(directorState.currentTime / 1000) * 80}px`
                }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        {renderLeftPanel()}

        {/* Scene Canvas */}
        {renderSceneCanvas()}

        {/* Right Panel */}
        {renderRightPanel()}
      </div>

      {/* Bottom Panel */}
      {renderBottomPanel()}

      {/* Panel Toggle Buttons */}
      <div className="absolute bottom-4 left-4 flex items-center space-x-2 z-30">
        {!isLeftPanelOpen && (
          <button
            onClick={() => setIsLeftPanelOpen(true)}
            className="p-2 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground shadow-sm"
            title="แสดง Assets Panel"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
        {!isBottomPanelOpen && (
          <button
            onClick={() => setIsBottomPanelOpen(true)}
            className="p-2 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground shadow-sm"
            title="แสดง Timeline"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        )}
        {!isRightPanelOpen && (
          <button
            onClick={() => setIsRightPanelOpen(true)}
            className="p-2 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground shadow-sm"
            title="แสดง Properties Panel"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default DirectorTab;
