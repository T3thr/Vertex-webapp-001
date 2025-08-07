// src/app/novels/[slug]/overview/components/unified/UnifiedStorytellingEnvironment.tsx
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapIcon, 
  PlayIcon, 
  PauseIcon, 
  EyeIcon, 
  BarChart3Icon,
  HeartIcon,
  LayersIcon,
  SettingsIcon,
  ZoomInIcon,
  ZoomOutIcon,
  RotateCcwIcon,
  SaveIcon,
  MenuIcon,
  XIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from 'lucide-react';

import { NovelData, EpisodeData, StoryMapData } from '../../page';
import { NarrativeCommandCenter } from './narrative/NarrativeCommandCenter';
import { LivingCanvas } from './canvas/LivingCanvas';
import { MobileAdaptiveInterface } from './mobile/MobileAdaptiveInterface';

// Interface สำหรับ Component Props
interface UnifiedStorytellingEnvironmentProps {
  novel: NovelData;
  episodes: EpisodeData[];
  storyMap: StoryMapData;
  characters: any[];
  scenes: any[];
  userMedia: any[];
  officialMedia: any[];
  initialMode?: 'blueprint' | 'director' | 'unified';
  selectedSceneId?: string;
}

// Enum สำหรับ View Modes
export enum ViewMode {
  BLUEPRINT = 'blueprint',
  DIRECTOR = 'director', 
  UNIFIED = 'unified',
  MOBILE_FOCUS = 'mobile_focus'
}

// Enum สำหรับ Panel States
export enum PanelState {
  HIDDEN = 'hidden',
  MINIMIZED = 'minimized',
  EXPANDED = 'expanded',
  FULLSCREEN = 'fullscreen'
}

// Interface สำหรับ Editor State - ใช้ร่วมกันทั้งระบบ
export interface EditorState {
  currentMode: ViewMode;
  isPlayMode: boolean;
  analyticsEnabled: boolean;
  emotionalMapEnabled: boolean;
  selectedSceneId: string | null;
  selectedNodeId: string | null;
  timelinePosition: number;
  zoomLevel: number;
  panOffset: { x: number; y: number };
  
  // Panel States
  narrativePanelState: PanelState;
  canvasPanelState: PanelState;
  propertiesPanelState: PanelState;
  timelinePanelState: PanelState;
  
  // Mobile specific
  isMobile: boolean;
  activeMobilePanel: 'canvas' | 'properties' | 'timeline' | 'assets' | 'layers' | null;
  mobileBottomSheetHeight: number;
}

// ฟังก์ชัน Utility สำหรับ Responsive Detection
const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  useEffect(() => {
    const checkResponsive = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };
    
    checkResponsive();
    window.addEventListener('resize', checkResponsive);
    
    return () => window.removeEventListener('resize', checkResponsive);
  }, []);
  
  return { isMobile, isTablet };
};

export default function UnifiedStorytellingEnvironment({
  novel,
  episodes,
  storyMap,
  characters,
  scenes,
  userMedia,
  officialMedia,
  initialMode = 'unified',
  selectedSceneId
}: UnifiedStorytellingEnvironmentProps) {
  const { isMobile, isTablet } = useResponsive();
  
  // Editor State Management
  const [editorState, setEditorState] = useState<EditorState>({
    currentMode: isMobile ? ViewMode.MOBILE_FOCUS : (initialMode as ViewMode),
    isPlayMode: false,
    analyticsEnabled: false,
    emotionalMapEnabled: false,
    selectedSceneId: selectedSceneId || null,
    selectedNodeId: null,
    timelinePosition: 0,
    zoomLevel: 1,
    panOffset: { x: 0, y: 0 },
    
    narrativePanelState: isMobile ? PanelState.HIDDEN : PanelState.EXPANDED,
    canvasPanelState: PanelState.EXPANDED,
    propertiesPanelState: isMobile ? PanelState.HIDDEN : PanelState.MINIMIZED,
    timelinePanelState: isMobile ? PanelState.HIDDEN : PanelState.MINIMIZED,
    
    isMobile,
    activeMobilePanel: isMobile ? 'canvas' : null,
    mobileBottomSheetHeight: 300
  });

  // Auto-save functionality
  const lastSaveRef = useRef<Date>(new Date());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Update responsive state
  useEffect(() => {
    setEditorState(prev => ({
      ...prev,
      isMobile,
      currentMode: isMobile ? ViewMode.MOBILE_FOCUS : prev.currentMode,
      narrativePanelState: isMobile ? PanelState.HIDDEN : prev.narrativePanelState,
      propertiesPanelState: isMobile ? PanelState.HIDDEN : prev.propertiesPanelState,
      timelinePanelState: isMobile ? PanelState.HIDDEN : prev.timelinePanelState,
      activeMobilePanel: isMobile ? 'canvas' : null
    }));
  }, [isMobile]);

  // State Update Handlers
  const updateEditorState = useCallback((updates: Partial<EditorState>) => {
    setEditorState(prev => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  }, []);

  const togglePlayMode = useCallback(() => {
    updateEditorState({ isPlayMode: !editorState.isPlayMode });
  }, [editorState.isPlayMode, updateEditorState]);

  const toggleAnalytics = useCallback(() => {
    updateEditorState({ analyticsEnabled: !editorState.analyticsEnabled });
  }, [editorState.analyticsEnabled, updateEditorState]);

  const toggleEmotionalMap = useCallback(() => {
    updateEditorState({ emotionalMapEnabled: !editorState.emotionalMapEnabled });
  }, [editorState.emotionalMapEnabled, updateEditorState]);

  const switchMode = useCallback((mode: ViewMode) => {
    updateEditorState({ currentMode: mode });
  }, [updateEditorState]);

  // Auto-save handler
  const handleAutoSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;
    
    try {
      // TODO: Implement actual save logic
      console.log('Auto-saving changes...');
      lastSaveRef.current = new Date();
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [hasUnsavedChanges]);

  // Auto-save effect
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    
    const autoSaveTimer = setTimeout(handleAutoSave, 2000); // Auto-save after 2 seconds of inactivity
    
    return () => clearTimeout(autoSaveTimer);
  }, [hasUnsavedChanges, handleAutoSave]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleAutoSave();
            break;
          case '1':
            e.preventDefault();
            switchMode(ViewMode.BLUEPRINT);
            break;
          case '2':
            e.preventDefault();
            switchMode(ViewMode.DIRECTOR);
            break;
          case '3':
            e.preventDefault();
            switchMode(ViewMode.UNIFIED);
            break;
          case ' ':
            e.preventDefault();
            togglePlayMode();
            break;
        }
      }
      
      if (e.key === 'Escape' && editorState.isPlayMode) {
        togglePlayMode();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleAutoSave, switchMode, togglePlayMode, editorState.isPlayMode]);

  // Render Mobile Interface
  if (editorState.isMobile) {
    return (
      <MobileAdaptiveInterface
        novel={novel}
        episodes={episodes}
        storyMap={storyMap}
        characters={characters}
        scenes={scenes}
        userMedia={userMedia}
        officialMedia={officialMedia}
        editorState={editorState}
        updateEditorState={updateEditorState}
      />
    );
  }

  // Main Toolbar Component
  const MainToolbar = () => (
    <div className="flex items-center justify-between p-4 bg-background border-b border-border">
      {/* Left Section - Mode Switcher */}
      <div className="flex items-center space-x-2">
        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => switchMode(ViewMode.BLUEPRINT)}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              editorState.currentMode === ViewMode.BLUEPRINT
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MapIcon className="w-4 h-4 mr-2 inline" />
            Blueprint
          </button>
          <button
            onClick={() => switchMode(ViewMode.DIRECTOR)}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              editorState.currentMode === ViewMode.DIRECTOR
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayersIcon className="w-4 h-4 mr-2 inline" />
            Director
          </button>
          <button
            onClick={() => switchMode(ViewMode.UNIFIED)}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              editorState.currentMode === ViewMode.UNIFIED
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <EyeIcon className="w-4 h-4 mr-2 inline" />
            Unified
          </button>
        </div>
      </div>

      {/* Center Section - Novel Title */}
      <div className="flex-1 text-center">
        <h1 className="text-lg font-semibold text-foreground">{novel.title}</h1>
        <p className="text-sm text-muted-foreground">
          {episodes.length} ตอน • {scenes.length} ฉาก
        </p>
      </div>

      {/* Right Section - Action Buttons */}
      <div className="flex items-center space-x-2">
        {/* Analytics Toggle */}
        <button
          onClick={toggleAnalytics}
          className={`p-2 rounded-md transition-colors ${
            editorState.analyticsEnabled
              ? 'bg-blue-500 text-white'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
          title="Analytics Overlay"
        >
          <BarChart3Icon className="w-4 h-4" />
        </button>

        {/* Emotional Map Toggle */}
        <button
          onClick={toggleEmotionalMap}
          className={`p-2 rounded-md transition-colors ${
            editorState.emotionalMapEnabled
              ? 'bg-pink-500 text-white'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
          title="Emotional Journey Map"
        >
          <HeartIcon className="w-4 h-4" />
        </button>

        {/* Play/Pause Toggle */}
        <button
          onClick={togglePlayMode}
          className={`p-2 rounded-md transition-colors ${
            editorState.isPlayMode
              ? 'bg-green-500 text-white'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
          title={editorState.isPlayMode ? 'Exit Play Mode (Esc)' : 'Enter Play Mode (Space)'}
        >
          {editorState.isPlayMode ? (
            <PauseIcon className="w-4 h-4" />
          ) : (
            <PlayIcon className="w-4 h-4" />
          )}
        </button>

        {/* Save Indicator */}
        <div className="flex items-center space-x-2">
          {hasUnsavedChanges ? (
            <motion.button
              onClick={handleAutoSave}
              className="p-2 bg-orange-500 text-white rounded-md"
              title="บันทึกการเปลี่ยนแปลง"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <SaveIcon className="w-4 h-4" />
            </motion.button>
          ) : (
            <div className="p-2 bg-green-500 text-white rounded-md" title="บันทึกแล้ว">
              <SaveIcon className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Main Layout Renderer
  const renderMainLayout = () => {
    switch (editorState.currentMode) {
      case ViewMode.BLUEPRINT:
        return (
          <div className="flex h-full">
            <div className="flex-1">
              <NarrativeCommandCenter
                novel={novel}
                episodes={episodes}
                storyMap={storyMap}
                characters={characters}
                scenes={scenes}
                editorState={editorState}
                updateEditorState={updateEditorState}
              />
            </div>
          </div>
        );

      case ViewMode.DIRECTOR:
        return (
          <div className="flex h-full">
            <div className="flex-1">
              <LivingCanvas
                novel={novel}
                episodes={episodes}
                storyMap={storyMap}
                characters={characters}
                scenes={scenes}
                userMedia={userMedia}
                officialMedia={officialMedia}
                editorState={editorState}
                updateEditorState={updateEditorState}
              />
            </div>
          </div>
        );

      case ViewMode.UNIFIED:
      default:
        return (
          <div className="flex h-full">
            {/* Left Panel - Narrative Command Center */}
            <AnimatePresence>
              {editorState.narrativePanelState !== PanelState.HIDDEN && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ 
                    width: editorState.narrativePanelState === PanelState.MINIMIZED ? 300 : 400,
                    opacity: 1 
                  }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-card border-r border-border overflow-hidden"
                >
                  <NarrativeCommandCenter
                    novel={novel}
                    episodes={episodes}
                    storyMap={storyMap}
                    characters={characters}
                    scenes={scenes}
                    editorState={editorState}
                    updateEditorState={updateEditorState}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Center Panel - Living Canvas */}
            <div className="flex-1 flex flex-col">
              <LivingCanvas
                novel={novel}
                episodes={episodes}
                storyMap={storyMap}
                characters={characters}
                scenes={scenes}
                userMedia={userMedia}
                officialMedia={officialMedia}
                editorState={editorState}
                updateEditorState={updateEditorState}
              />
            </div>

            {/* Right Panel - Properties & Timeline */}
            <AnimatePresence>
              {(editorState.propertiesPanelState !== PanelState.HIDDEN || 
                editorState.timelinePanelState !== PanelState.HIDDEN) && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 350, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-card border-l border-border flex flex-col"
                >
                  {/* Properties Panel */}
                  {editorState.propertiesPanelState !== PanelState.HIDDEN && (
                    <div className={`${
                      editorState.timelinePanelState !== PanelState.HIDDEN ? 'flex-1' : 'h-full'
                    } border-b border-border`}>
                      <div className="p-4">
                        <h3 className="text-sm font-medium text-foreground mb-4">Properties</h3>
                        {/* Properties content will be implemented */}
                        <div className="text-sm text-muted-foreground">
                          Properties panel content
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Timeline Panel */}
                  {editorState.timelinePanelState !== PanelState.HIDDEN && (
                    <div className={`${
                      editorState.propertiesPanelState !== PanelState.HIDDEN ? 'flex-1' : 'h-full'
                    }`}>
                      <div className="p-4">
                        <h3 className="text-sm font-medium text-foreground mb-4">Timeline</h3>
                        {/* Timeline content will be implemented */}
                        <div className="text-sm text-muted-foreground">
                          Timeline panel content
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Main Toolbar */}
      <MainToolbar />
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {renderMainLayout()}
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-muted border-t border-border flex items-center justify-between px-4 text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          <span>Zoom: {Math.round(editorState.zoomLevel * 100)}%</span>
          <span>Mode: {editorState.currentMode}</span>
          {editorState.selectedSceneId && (
            <span>Selected Scene: {editorState.selectedSceneId}</span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <span>Last saved: {lastSaveRef.current.toLocaleTimeString()}</span>
          <span>Ctrl+S to save • Ctrl+1-3 to switch modes • Space to play</span>
        </div>
      </div>
    </div>
  );
}