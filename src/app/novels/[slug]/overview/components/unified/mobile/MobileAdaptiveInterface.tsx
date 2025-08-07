// src/app/novels/[slug]/overview/components/unified/mobile/MobileAdaptiveInterface.tsx
'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MenuIcon,
  XIcon,
  PlayIcon,
  PauseIcon,
  LayersIcon,
  ImageIcon,
  SettingsIcon,
  BarChart3Icon,
  HeartIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  PlusIcon,
  EditIcon,
  EyeIcon
} from 'lucide-react';

import { NovelData, EpisodeData, StoryMapData } from '../../../page';
import { EditorState } from '../UnifiedStorytellingEnvironment';
import { MobileBottomSheet } from './MobileBottomSheet';
import { MobileCanvasEditor } from './MobileCanvasEditor';
import { MobileStoryMapView } from './MobileStoryMapView';
import { MobileTimelineView } from './MobileTimelineView';

interface MobileAdaptiveInterfaceProps {
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

type MobileFocusMode = 'storymap' | 'canvas' | 'timeline' | 'analytics';

export function MobileAdaptiveInterface({
  novel,
  episodes,
  storyMap,
  characters,
  scenes,
  userMedia,
  officialMedia,
  editorState,
  updateEditorState
}: MobileAdaptiveInterfaceProps) {

  const [focusMode, setFocusMode] = useState<MobileFocusMode>('storymap');
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [bottomSheetContent, setBottomSheetContent] = useState<'canvas' | 'layers' | 'assets' | 'properties' | 'timeline' | null>(null);
  const [showMainMenu, setShowMainMenu] = useState(false);

  // Current Scene
  const currentScene = scenes.find(scene => scene._id === editorState.selectedSceneId) || scenes[0];

  // Handle Focus Mode Switch
  const switchFocusMode = useCallback((mode: MobileFocusMode) => {
    setFocusMode(mode);
    setShowBottomSheet(false);
    setShowMainMenu(false);
  }, []);

  // Handle Bottom Sheet
  const openBottomSheet = useCallback((content: typeof bottomSheetContent) => {
    setBottomSheetContent(content);
    setShowBottomSheet(true);
    updateEditorState({ activeMobilePanel: content });
  }, [updateEditorState]);

  const closeBottomSheet = useCallback(() => {
    setShowBottomSheet(false);
    setBottomSheetContent(null);
    updateEditorState({ activeMobilePanel: null });
  }, [updateEditorState]);

  // Handle Play Mode
  const togglePlayMode = useCallback(() => {
    updateEditorState({ isPlayMode: !editorState.isPlayMode });
    if (!editorState.isPlayMode) {
      setFocusMode('canvas');
    }
  }, [editorState.isPlayMode, updateEditorState]);

  // Mobile Header Component
  const MobileHeader = () => (
    <div className="bg-background border-b border-border p-4 safe-top">
      <div className="flex items-center justify-between">
        {/* Left - Menu Button */}
        <button
          onClick={() => setShowMainMenu(!showMainMenu)}
          className="p-2 -ml-2 text-foreground"
        >
          <MenuIcon className="w-6 h-6" />
        </button>

        {/* Center - Title & Mode */}
        <div className="text-center flex-1 mx-4">
          <h1 className="text-lg font-semibold text-foreground truncate">
            {novel.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {focusMode === 'storymap' && 'Story Map'}
            {focusMode === 'canvas' && (currentScene?.title || 'Canvas')}
            {focusMode === 'timeline' && 'Timeline'}
            {focusMode === 'analytics' && 'Analytics'}
          </p>
        </div>

        {/* Right - Play Button */}
        <button
          onClick={togglePlayMode}
          className={`p-2 rounded-lg ${
            editorState.isPlayMode
              ? 'bg-red-500 text-white'
              : 'bg-green-500 text-white'
          }`}
        >
          {editorState.isPlayMode ? (
            <PauseIcon className="w-5 h-5" />
          ) : (
            <PlayIcon className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );

  // Mobile Tab Navigation
  const MobileTabNav = () => (
    <div className="bg-background border-t border-border">
      <div className="flex">
        {[
          { id: 'storymap', label: 'Story', icon: BarChart3Icon },
          { id: 'canvas', label: 'Canvas', icon: EditIcon },
          { id: 'timeline', label: 'Timeline', icon: LayersIcon },
          { id: 'analytics', label: 'Insights', icon: HeartIcon }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => switchFocusMode(id as MobileFocusMode)}
            className={`flex-1 py-3 px-2 text-center transition-colors ${
              focusMode === id
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground'
            }`}
          >
            <Icon className="w-5 h-5 mx-auto mb-1" />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // Floating Action Button
  const FloatingActionButton = () => {
    if (focusMode !== 'canvas' || editorState.isPlayMode) return null;

    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        onClick={() => openBottomSheet('layers')}
        className="fixed bottom-20 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center z-40"
        whileTap={{ scale: 0.9 }}
      >
        <PlusIcon className="w-6 h-6" />
      </motion.button>
    );
  };

  // Main Menu Overlay
  const MainMenuOverlay = () => (
    <AnimatePresence>
      {showMainMenu && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50"
          onClick={() => setShowMainMenu(false)}
        >
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="w-80 h-full bg-background border-r border-border p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-semibold text-foreground">Menu</h2>
              <button
                onClick={() => setShowMainMenu(false)}
                className="p-2 text-muted-foreground"
              >
                <XIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="space-y-4">
              <button
                onClick={() => {
                  updateEditorState({ analyticsEnabled: !editorState.analyticsEnabled });
                  setShowMainMenu(false);
                }}
                className={`w-full p-4 rounded-lg text-left transition-colors ${
                  editorState.analyticsEnabled
                    ? 'bg-blue-500/20 text-blue-600'
                    : 'bg-muted text-foreground'
                }`}
              >
                <BarChart3Icon className="w-5 h-5 mb-2" />
                <div className="font-medium">Analytics Overlay</div>
                <div className="text-sm text-muted-foreground">
                  Show reader insights
                </div>
              </button>

              <button
                onClick={() => {
                  updateEditorState({ emotionalMapEnabled: !editorState.emotionalMapEnabled });
                  setShowMainMenu(false);
                }}
                className={`w-full p-4 rounded-lg text-left transition-colors ${
                  editorState.emotionalMapEnabled
                    ? 'bg-pink-500/20 text-pink-600'
                    : 'bg-muted text-foreground'
                }`}
              >
                <HeartIcon className="w-5 h-5 mb-2" />
                <div className="font-medium">Emotional Map</div>
                <div className="text-sm text-muted-foreground">
                  Visualize story emotions
                </div>
              </button>

              <button
                onClick={() => {
                  setShowMainMenu(false);
                  // TODO: Open settings
                }}
                className="w-full p-4 rounded-lg text-left bg-muted text-foreground"
              >
                <SettingsIcon className="w-5 h-5 mb-2" />
                <div className="font-medium">Settings</div>
                <div className="text-sm text-muted-foreground">
                  Editor preferences
                </div>
              </button>
            </div>

            {/* Stats */}
            <div className="mt-8 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-medium text-foreground mb-3">Project Stats</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Nodes</div>
                  <div className="font-semibold text-foreground">{storyMap.nodes.length}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Scenes</div>
                  <div className="font-semibold text-foreground">{scenes.length}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Episodes</div>
                  <div className="font-semibold text-foreground">{episodes.length}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Characters</div>
                  <div className="font-semibold text-foreground">{characters.length}</div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Main Content Renderer
  const renderMainContent = () => {
    switch (focusMode) {
      case 'storymap':
        return (
          <MobileStoryMapView
            novel={novel}
            storyMap={storyMap}
            scenes={scenes}
            editorState={editorState}
            updateEditorState={updateEditorState}
          />
        );

      case 'canvas':
        return (
          <MobileCanvasEditor
            scene={currentScene}
            characters={characters}
            userMedia={userMedia}
            officialMedia={officialMedia}
            editorState={editorState}
            onElementSelect={(elementId) => {
              openBottomSheet('properties');
            }}
          />
        );

      case 'timeline':
        return (
          <MobileTimelineView
            scene={currentScene}
            editorState={editorState}
            updateEditorState={updateEditorState}
          />
        );

      case 'analytics':
        return (
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="text-center py-12">
              <BarChart3Icon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Analytics View</h3>
              <p className="text-muted-foreground">
                Mobile analytics interface will be implemented here
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Mobile Header */}
      <MobileHeader />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {renderMainContent()}
      </div>

      {/* Mobile Tab Navigation */}
      <MobileTabNav />

      {/* Floating Action Button */}
      <FloatingActionButton />

      {/* Bottom Sheet */}
      <MobileBottomSheet
        isOpen={showBottomSheet}
        onClose={closeBottomSheet}
        content={bottomSheetContent}
        scene={currentScene}
        userMedia={userMedia}
        officialMedia={officialMedia}
        height={editorState.mobileBottomSheetHeight}
        onHeightChange={(height) => updateEditorState({ mobileBottomSheetHeight: height })}
      />

      {/* Main Menu Overlay */}
      <MainMenuOverlay />
    </div>
  );
}