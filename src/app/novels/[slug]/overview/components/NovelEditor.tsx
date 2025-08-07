// src/app/novels/[slug]/overview/components/NovelEditor.tsx
"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Map, 
  Clapperboard, 
  BarChart3, 
  Save,
  Loader2,
  Menu,
  X
} from 'lucide-react';

import { NovelData, EpisodeData, StoryMapData } from '../page';
import BlueprintTab from './tabs/BlueprintTab';
import DirectorTab from './tabs/DirectorTab';
import SummaryTab from './tabs/SummaryTab';

// ประเภทของแท็บ
export type EditorTab = 'blueprint' | 'director' | 'summary';

// Interface สำหรับ Props
interface NovelEditorProps {
  novel: NovelData;
  episodes: EpisodeData[];
  storyMap: StoryMapData | null;
  characters: any[];
  scenes: any[];
  userMedia: any[];
  officialMedia: any[];
  initialTab?: EditorTab;
  selectedSceneId?: string;
}

// Interface สำหรับ Editor State
interface EditorState {
  activeTab: EditorTab;
  selectedSceneId: string | null;
  selectedNodeId: string | null;
  selectedElementId: string | null;
  isAutoSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  isMobileMenuOpen: boolean;
}

// Hook สำหรับ Responsive Detection
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

  return { isMobile, isTablet, isDesktop: !isMobile && !isTablet };
};

const NovelEditor: React.FC<NovelEditorProps> = ({
  novel,
  episodes,
  storyMap,
  characters,
  scenes,
  userMedia,
  officialMedia,
  initialTab = 'blueprint',
  selectedSceneId
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  // State Management
  const [editorState, setEditorState] = useState<EditorState>({
    activeTab: initialTab,
    selectedSceneId: selectedSceneId || null,
    selectedNodeId: null,
    selectedElementId: null,
    isAutoSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    isMobileMenuOpen: false
  });

  // Memoized data preparation สำหรับป้องกัน re-render ที่ไม่จำเป็น
  const editorData = useMemo(() => ({
    novel,
    episodes,
    storyMap,
    characters,
    scenes,
    userMedia,
    officialMedia
  }), [novel, episodes, storyMap, characters, scenes, userMedia, officialMedia]);

  // Update Editor State
  const updateEditorState = useCallback((updates: Partial<EditorState>) => {
    setEditorState(prev => ({ 
      ...prev, 
      ...updates,
      hasUnsavedChanges: updates.hasUnsavedChanges !== undefined ? updates.hasUnsavedChanges : true
    }));
  }, []);

  // Switch Tab Handler
  const switchTab = useCallback((tab: EditorTab) => {
    updateEditorState({ 
      activeTab: tab,
      isMobileMenuOpen: false 
    });
  }, [updateEditorState]);

  // Auto-save Handler
  const handleAutoSave = useCallback(async () => {
    if (!editorState.hasUnsavedChanges) return;

    updateEditorState({ isAutoSaving: true });

    try {
      // TODO: Implement actual API calls to save data
      console.log('Auto-saving novel data...');
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      updateEditorState({ 
        isAutoSaving: false,
        lastSaved: new Date(),
        hasUnsavedChanges: false
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
      updateEditorState({ isAutoSaving: false });
    }
  }, [editorState.hasUnsavedChanges, updateEditorState]);

  // Auto-save Effect (ทุก 3 วินาทีหลังจากมีการเปลี่ยนแปลง)
  useEffect(() => {
    if (!editorState.hasUnsavedChanges) return;

    const autoSaveTimer = setTimeout(handleAutoSave, 3000);
    return () => clearTimeout(autoSaveTimer);
  }, [editorState.hasUnsavedChanges, handleAutoSave]);

  // Keyboard Shortcuts
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
            switchTab('blueprint');
            break;
          case '2':
            e.preventDefault();
            switchTab('director');
            break;
          case '3':
            e.preventDefault();
            switchTab('summary');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleAutoSave, switchTab]);

  // Tab Configuration
  const tabConfig = [
    {
      id: 'blueprint' as EditorTab,
      label: 'Blueprint',
      mobileLabel: 'Map',
      icon: Map,
      description: 'ห้องวางโครงเรื่อง - จัดการ Story Map แบบ Node-Edge'
    },
    {
      id: 'director' as EditorTab,
      label: 'Director',
      mobileLabel: 'Edit',
      icon: Clapperboard,
      description: 'ห้องกำกับฉาก - แต่งฉากและ Preview'
    },
    {
      id: 'summary' as EditorTab,
      label: 'Summary',
      mobileLabel: 'Stats',
      icon: BarChart3,
      description: 'สรุปและจัดการ - สถิติและ Metadata'
    }
  ];

  // Render Tab Navigation
  const renderTabNavigation = () => (
    <div className="bg-background border-b border-border">
      <div className="container-custom">
        <div className="flex items-center justify-between py-2 sm:py-4">
          {/* Novel Title */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">
              {novel.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {episodes.length} ตอน • {scenes.length} ฉาก
            </p>
          </div>

          {/* Desktop Tab Navigation */}
          {isDesktop && (
            <div className="flex items-center space-x-1 mx-8">
              {tabConfig.map((tab) => {
                const Icon = tab.icon;
                const isActive = editorState.activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => switchTab(tab.id)}
                    className={`
                      flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive 
                        ? 'bg-primary text-primary-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      }
                    `}
                    title={tab.description}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Mobile Menu Toggle */}
          {isMobile && (
            <button
              onClick={() => updateEditorState({ isMobileMenuOpen: !editorState.isMobileMenuOpen })}
              className="p-2 text-muted-foreground hover:text-foreground"
            >
              {editorState.isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Save Status */}
          <div className="flex items-center ml-4">
            {editorState.isAutoSaving ? (
              <div className="flex items-center text-blue-600">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span className="text-sm">กำลังบันทึก...</span>
              </div>
            ) : editorState.hasUnsavedChanges ? (
              <button
                onClick={handleAutoSave}
                className="flex items-center text-orange-600 hover:text-orange-700"
              >
                <Save className="w-4 h-4 mr-2" />
                <span className="text-sm">บันทึก</span>
              </button>
            ) : (
              <div className="flex items-center text-green-600">
                <Save className="w-4 h-4 mr-2" />
                <span className="text-sm">บันทึกแล้ว</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <AnimatePresence>
        {isMobile && editorState.isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border bg-card"
          >
            <div className="container-custom py-2">
              {tabConfig.map((tab) => {
                const Icon = tab.icon;
                const isActive = editorState.activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => switchTab(tab.id)}
                    className={`
                      w-full flex items-center px-4 py-3 rounded-lg text-left transition-colors mb-1
                      ${isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    <div>
                      <div className="font-medium">{tab.label}</div>
                      <div className="text-xs opacity-75">{tab.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tablet Tab Navigation */}
      {isTablet && (
        <div className="border-t border-border">
          <div className="container-custom">
            <div className="flex">
              {tabConfig.map((tab) => {
                const Icon = tab.icon;
                const isActive = editorState.activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => switchTab(tab.id)}
                    className={`
                      flex-1 flex items-center justify-center px-3 py-3 text-sm font-medium transition-colors
                      ${isActive 
                        ? 'bg-primary text-primary-foreground border-b-2 border-primary' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.mobileLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render Active Tab Content
  const renderTabContent = () => {
    const commonProps = {
      ...editorData,
      editorState,
      updateEditorState,
      isMobile,
      isTablet,
      isDesktop
    };

    switch (editorState.activeTab) {
      case 'blueprint':
        return <BlueprintTab {...commonProps} />;
      case 'director':
        return <DirectorTab {...commonProps} />;
      case 'summary':
        return <SummaryTab {...commonProps} />;
      default:
        return <BlueprintTab {...commonProps} />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Tab Navigation */}
      {renderTabNavigation()}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={editorState.activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-muted border-t border-border flex items-center justify-between px-4 text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          <span>แท็บ: {tabConfig.find(t => t.id === editorState.activeTab)?.label}</span>
          {editorState.selectedSceneId && (
            <span>ฉากที่เลือก: {editorState.selectedSceneId}</span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {editorState.lastSaved && (
            <span>บันทึกล่าสุด: {editorState.lastSaved.toLocaleTimeString()}</span>
          )}
          <span>Ctrl+1-3 สลับแท็บ • Ctrl+S บันทึก</span>
        </div>
      </div>
    </div>
  );
};

export default NovelEditor;
