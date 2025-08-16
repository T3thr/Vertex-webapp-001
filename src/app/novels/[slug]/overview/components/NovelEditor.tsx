'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Layers3, 
  Film, 
  BarChart3, 
  Save, 
  Settings,
  Menu,
  X,
  RefreshCw,
  Image
} from 'lucide-react'
import { toast } from 'sonner'

// Import แท็บต่างๆ
import BlueprintTab from './tabs/BlueprintTab'
import DirectorTab from './tabs/DirectorTab'
import SummaryTab from './tabs/SummaryTab'

// Import ระบบ Save ใหม่ - เปลี่ยนเป็น EventManager
import { EventManager, createEventManager } from './tabs/EventManager'
import SaveStatusIndicator from './tabs/SaveStatusIndicator'

// Import types
import type { NovelData, EpisodeData, StoryMapData } from '../page'

interface NovelEditorProps {
  novel: NovelData
  episodes: EpisodeData[]
  storyMap: StoryMapData | null
  characters: any[]
  scenes: any[]
  userMedia: any[]
  officialMedia: any[]
  userSettings?: any // UserSettings object
}

/**
 * หน้าแต่งนิยาย Visual Novel แบบ Professional
 * รองรับ 3 โหมดหลัก: Blueprint, Director, Summary
 */
const NovelEditor: React.FC<NovelEditorProps> = ({
  novel,
  episodes,
  storyMap,
  characters,
  scenes,
  userMedia,
  officialMedia,
  userSettings
}) => {
  // State สำหรับแท็บที่เลือก
  const [activeTab, setActiveTab] = useState<'blueprint' | 'director' | 'summary'>('blueprint')
  const [currentStoryMap, setCurrentStoryMap] = useState(storyMap)
  const [currentScenes, setCurrentScenes] = useState(scenes)
  const [currentEpisodes, setCurrentEpisodes] = useState(episodes)
  const [currentNovel, setCurrentNovel] = useState(novel)
  
  // State สำหรับ mobile menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // State สำหรับ auto-save (โหลดจาก localStorage เท่านั้น) - แก้ไข hydration
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(false) // เริ่มต้นด้วยค่าคงที่เพื่อป้องกัน hydration mismatch
  
  const [autoSaveIntervalSec, setAutoSaveIntervalSec] = useState<15 | 30>(30) // เริ่มต้นด้วยค่าคงที่
  
  // ใช้ EventManager แทน SaveManager สำหรับ Command Pattern
  const [eventManager] = useState(() => createEventManager({
    novelSlug: novel.slug,
    autoSaveEnabled: isAutoSaveEnabled,
    autoSaveIntervalMs: autoSaveIntervalSec * 1000,
    maxHistorySize: 50,
    optimisticUpdates: true,
    conflictResolutionStrategy: 'merge',
    // Real-time collaboration settings - only enable in browser environment
    realtimeEnabled: typeof window !== 'undefined' && process.env.NODE_ENV === 'development',
    userId: userSettings?.userId || 'anonymous_user',
    username: userSettings?.username || 'Anonymous User',
    onStateChange: (state) => {
      setSaveState(state);
    },
    onDirtyChange: (isDirty) => {
      // Callback เมื่อสถานะ dirty เปลี่ยน
      console.log('[NovelEditor] Dirty state changed:', isDirty);
    },
    onError: (error, context) => {
      // Only show toast for non-realtime errors
      if (context !== 'REALTIME' && context !== 'REALTIME_INIT') {
        console.error(`[NovelEditor] EventManager error in ${context}:`, error);
        toast.error(`Save error: ${error.message}`);
      } else {
        console.log(`[NovelEditor] Real-time feature unavailable: ${error.message}`);
      }
    }
  }))
  
  const [saveState, setSaveState] = useState(eventManager.getState())
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false)
  
  // Track dirty state from tabs - ปรับปรุงให้ stable มากขึ้น
  const [hasBlueprintChanges, setHasBlueprintChanges] = useState(false)
  const [hasDirectorChanges, setHasDirectorChanges] = useState(false)
  const [hasSummaryChanges, setHasSummaryChanges] = useState(false)
  
  // Stable dirty state ที่ไม่ flicker
  const [stableHasUnsavedChanges, setStableHasUnsavedChanges] = useState(false)
  
  // ===============================
  // PROFESSIONAL SMART SAVE DETECTION
  // เทียบเท่า Adobe Premiere Pro & Canva
  // ===============================
  
  // Combined dirty state แต่ให้ความสำคัญกับ EventManager ก่อน (เพื่อความแม่นยำ)
  const hasUnsavedChanges = saveState.hasUnsavedChanges || saveState.isDirty || hasBlueprintChanges || hasDirectorChanges || hasSummaryChanges
  
  // State สำหรับ Blueprint settings (โหลดจาก localStorage เท่านั้น) - แก้ไข hydration
  const [showSceneThumbnails, setShowSceneThumbnails] = useState(true) // เริ่มต้นด้วยค่าคงที่
  const [showNodeLabels, setShowNodeLabels] = useState(true) // เริ่มต้นด้วยค่าคงที่
  const [showGrid, setShowGrid] = useState(true) // เริ่มต้นด้วยค่าคงที่
  const [snapToGrid, setSnapToGrid] = useState(false) // เริ่มต้นด้วยค่าคงที่
  const [nodeOrientation, setNodeOrientation] = useState<'horizontal' | 'vertical'>('vertical') // การวางแนว node ใหม่

  // ✨ Professional Settings Management (Adobe/Canva/Figma style)
  const saveBlueprintSettings = React.useCallback(async (key: string, value: any) => {
    // บันทึกไปยัง localStorage ทันที (สำหรับ instant feedback)
    if (typeof window !== 'undefined') {
      localStorage.setItem(`blueprint-${key}`, JSON.stringify(value));
    }

    // Professional feedback with toast promise pattern
    const settingNames: Record<string, string> = {
      'auto-save-enabled': 'Auto-save',
      'auto-save-interval': 'ความถี่ Auto-save',
      'show-scene-thumbnails': 'ภาพพื้นหลังฉาก',
      'show-node-labels': 'ป้ายชื่อ Choice',
      'show-grid': 'ตารางพื้นหลัง',
      'snap-to-grid': 'จัดแนวตารางอัตโนมัติ',
      'node-orientation': 'การวางแนว Node'
    };

    const settingName = settingNames[key] || 'การตั้งค่า';

    // Professional API call with toast feedback
    const savePromise = fetch('/api/user/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        visualNovelGameplay: {
          blueprintEditor: {
            [key === 'auto-save-enabled' ? 'autoSaveEnabled' : 
             key === 'auto-save-interval' ? 'autoSaveIntervalSec' :
             key === 'show-scene-thumbnails' ? 'showSceneThumbnails' :
             key === 'show-node-labels' ? 'showNodeLabels' :
             key === 'show-grid' ? 'showGrid' :
             key === 'snap-to-grid' ? 'snapToGrid' :
             key === 'node-orientation' ? 'nodeOrientation' :
             key]: value
          }
        }
      }),
    });

    // Adobe/Figma style toast feedback
    toast.promise(savePromise, {
      loading: `💾 กำลังบันทึก${settingName}...`,
      success: (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        // Special feedback for auto-save settings
        if (key === 'auto-save-enabled') {
          return value 
            ? `✅ เปิดใช้งาน ${settingName} สำเร็จ`
            : `⏸️ ปิดใช้งาน ${settingName} สำเร็จ`;
        }
        
        return `✅ บันทึก${settingName}สำเร็จ`;
      },
      error: (error) => {
        console.warn('Error saving blueprint settings to UserSettings:', error);
        return `❌ ไม่สามารถบันทึก${settingName}ได้`;
      },
    });

    try {
      await savePromise;
    } catch (error) {
      // Error is already handled by toast.promise
      console.warn('Blueprint settings save failed:', error);
    }
  }, []);

  // Handlers for data updates
  const handleStoryMapUpdate = (updatedStoryMap: any) => {
    setCurrentStoryMap(updatedStoryMap)
    toast.success('StoryMap updated successfully')
  }

  const handleSceneUpdate = async (sceneId: string, sceneData: any) => {
    try {
      const response = await fetch(`/api/novels/${novel.slug}/scenes/${sceneId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sceneData),
      })

      if (!response.ok) {
        throw new Error('Failed to update scene')
      }

      const updatedScene = await response.json()
      setCurrentScenes(prev => prev.map(scene => 
        scene._id === sceneId ? updatedScene.scene : scene
      ))
      toast.success('Scene updated successfully')
    } catch (error) {
      console.error('Error updating scene:', error)
      toast.error('Failed to update scene')
      throw error
    }
  }

  const handleEpisodeUpdate = async (episodeId: string, episodeData: any) => {
    try {
      const response = await fetch(`/api/novels/${novel.slug}/episodes/${episodeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(episodeData),
      })

      if (!response.ok) {
        throw new Error('Failed to update episode')
      }

      const updatedEpisode = await response.json()
      setCurrentEpisodes(prev => prev.map(episode => 
        episode._id === episodeId ? updatedEpisode.episode : episode
      ))
      toast.success('Episode updated successfully')
    } catch (error) {
      console.error('Error updating episode:', error)
      toast.error('Failed to update episode')
      throw error
    }
  }

  const handleNovelUpdate = async (novelData: any) => {
    try {
      const response = await fetch(`/api/novels/${novel.slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(novelData),
      })

      if (!response.ok) {
        throw new Error('Failed to update novel')
      }

      const updatedNovel = await response.json()
      setCurrentNovel(updatedNovel.novel)
      toast.success('Novel updated successfully')
    } catch (error) {
      console.error('Error updating novel:', error)
      toast.error('Failed to update novel')
      throw error
    }
  }

  // ===============================
  // PROFESSIONAL SMART SAVE FUNCTION
  // เทียบเท่า Adobe Premiere Pro & Canva
  // ===============================
  
  const handleManualSave = React.useCallback(async () => {
    try {
      // Pre-check: ตรวจสอบการเปลี่ยนแปลงจริงก่อนบันทึก
      let hasActualChanges = false;
      
      if (activeTab === 'blueprint' && blueprintTabRef.current?.getCurrentData) {
        const currentData = blueprintTabRef.current.getCurrentData();
        hasActualChanges = eventManager.hasChanges();
      } else if (activeTab === 'director') {
        hasActualChanges = hasDirectorChanges;
      } else if (activeTab === 'summary') {
        hasActualChanges = hasSummaryChanges;
      } else {
        // Fallback check
        hasActualChanges = stableHasUnsavedChanges;
      }
      
      // Professional early exit สำหรับ efficiency
      if (!hasActualChanges) {
        toast.info('🔍 ไม่มีการเปลี่ยนแปลงที่ต้องบันทึก');
        return;
      }
      
      // Enterprise logging สำหรับ debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('[NovelEditor] Professional manual save initiated:', {
          activeTab,
          hasActualChanges,
          timestamp: new Date().toISOString()
        });
      }
      
      // Execute save ตาม tab ที่เปิดอยู่
      if (activeTab === 'blueprint' && blueprintTabRef.current?.handleManualSave) {
        await blueprintTabRef.current.handleManualSave();
        // toast จะแสดงจาก SaveManager
      } else if (activeTab === 'director' && directorTabRef.current?.handleManualSave) {
        await directorTabRef.current.handleManualSave();
        toast.success('✅ บันทึก Director สำเร็จ');
      } else if (activeTab === 'summary' && summaryTabRef.current?.handleManualSave) {
        await summaryTabRef.current.handleManualSave();
        toast.success('✅ บันทึก Summary สำเร็จ');
      } else {
        // Fallback: ใช้ unified save manager
        const currentData = {
          nodes: currentStoryMap?.nodes || [],
          edges: currentStoryMap?.edges || [],
          storyVariables: currentStoryMap?.storyVariables || []
        };
        
        await eventManager.saveManual();
      }
      
      // Professional state reset หลังบันทึกสำเร็จ
      setHasBlueprintChanges(false);
      setHasDirectorChanges(false);
      setHasSummaryChanges(false);
      setStableHasUnsavedChanges(false);
      
      // Real-time localStorage sync
      if (typeof window !== 'undefined') {
        localStorage.setItem('divwy-has-unsaved-changes', 'false');
        localStorage.setItem('divwy-last-saved', Date.now().toString());
      }
      
    } catch (error) {
      console.error('[NovelEditor] Professional save failed:', error);
      toast.error('❌ เกิดข้อผิดพลาดในการบันทึก: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }, [
    activeTab, 
    eventManager, 
    stableHasUnsavedChanges,
    hasBlueprintChanges,
    hasDirectorChanges,
    hasSummaryChanges,
    currentStoryMap?.nodes, 
    currentStoryMap?.edges, 
    currentStoryMap?.storyVariables
  ])

  // Refs for tab components to trigger their save methods
  const blueprintTabRef = React.useRef<any>(null)
  const directorTabRef = React.useRef<any>(null)
  const summaryTabRef = React.useRef<any>(null)
  const settingsDropdownRef = React.useRef<HTMLDivElement>(null)
  
  // Professional initial sync tracking (Adobe/Figma approach)
  const [isInitialSyncComplete, setIsInitialSyncComplete] = useState(false)

  // โหลดการตั้งค่าจริงหลังจาก component mount เพื่อป้องกัน hydration mismatch 
  useEffect(() => {
    // โหลดค่าจาก UserSettings ก่อน แล้วค่อย fallback ไปยัง localStorage
    const loadFromStorage = (key: string, defaultValue: any, userSettingsPath?: string) => {
      // ลองโหลดจาก UserSettings ก่อน
      if (userSettingsPath) {
        const pathParts = userSettingsPath.split('.');
        let value = userSettings;
        for (const part of pathParts) {
          value = value?.[part];
          if (value === undefined) break;
        }
        if (value !== undefined) return value;
      }

      // ถ้าไม่มีใน UserSettings ให้โหลดจาก localStorage
      if (typeof window === 'undefined') return defaultValue;
      const saved = localStorage.getItem(`blueprint-${key}`);
      return saved !== null ? JSON.parse(saved) : defaultValue;
    };

    // อัปเดตค่าทั้งหมดหลังจาก mount
    setIsAutoSaveEnabled(loadFromStorage('auto-save-enabled', false, 'visualNovelGameplay.blueprintEditor.autoSaveEnabled'));
    setAutoSaveIntervalSec(loadFromStorage('auto-save-interval', 30, 'visualNovelGameplay.blueprintEditor.autoSaveIntervalSec'));
    setShowSceneThumbnails(loadFromStorage('show-scene-thumbnails', true, 'visualNovelGameplay.blueprintEditor.showSceneThumbnails'));
    setShowNodeLabels(loadFromStorage('show-node-labels', true, 'visualNovelGameplay.blueprintEditor.showNodeLabels'));
    setShowGrid(loadFromStorage('show-grid', true, 'visualNovelGameplay.blueprintEditor.showGrid'));
    setSnapToGrid(loadFromStorage('snap-to-grid', false, 'visualNovelGameplay.blueprintEditor.snapToGrid'));
    setNodeOrientation(loadFromStorage('node-orientation', 'vertical', 'visualNovelGameplay.blueprintEditor.nodeOrientation'));
  }, [userSettings]);

  // ===============================
  // PROFESSIONAL INITIAL STATE SYNC (Adobe/Figma/Canva Style)
  // ===============================
  
  // Professional-grade initial state synchronization to prevent false dirty state on load
  useEffect(() => {
    if (!isInitialSyncComplete && activeTab === 'blueprint' && blueprintTabRef.current?.getCurrentData) {
      // ใช้ setTimeout เพื่อให้ BlueprintTab โหลดและ initialize เสร็จสมบูรณ์ก่อน
      const syncTimer = setTimeout(() => {
        try {
          const currentData = blueprintTabRef.current.getCurrentData();
          if (currentData && (currentData.nodes?.length >= 0 || currentStoryMap)) {
            // Professional baseline sync with EventManager
            eventManager.initializeWithData(currentData);
            setIsInitialSyncComplete(true);
            
            console.log('[NovelEditor] 🎯 Professional initial state synchronized:', {
              nodeCount: currentData.nodes?.length || 0,
              edgeCount: currentData.edges?.length || 0,
              saveButtonEnabled: false,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          console.warn('[NovelEditor] Failed to sync initial state:', error);
          // หากเกิดข้อผิดพลาด ให้ retry ใน 1 วินาที
          setTimeout(() => setIsInitialSyncComplete(false), 1000);
        }
      }, 1000); // 1 วินาที delay เพื่อให้ BlueprintTab โหลดและ sync เสร็จก่อน

      return () => clearTimeout(syncTimer);
    }
      }, [isInitialSyncComplete, activeTab, currentStoryMap, blueprintTabRef, eventManager]);

  // ===============================
  // PROFESSIONAL REAL-TIME SYNC
  // ===============================
  
  useEffect(() => {
    // Professional state synchronization
    const updateSaveState = (newState: any) => {
      setSaveState(newState);
      
      // Real-time localStorage sync สำหรับ refresh protection
      if (typeof window !== 'undefined') {
        localStorage.setItem('divwy-has-unsaved-changes', newState.hasUnsavedChanges.toString());
        localStorage.setItem('divwy-save-state', JSON.stringify({
          isDirty: newState.isDirty,
          hasUnsavedChanges: newState.hasUnsavedChanges,
          lastSaved: newState.lastSaved,
          timestamp: Date.now()
        }));
      }
    };
    
    const handleDirtyChange = (isDirty: boolean) => {
      // Professional dirty state management
      setSaveState(prev => {
        if (prev.isDirty !== isDirty || prev.hasUnsavedChanges !== isDirty) {
          const newState = { ...prev, isDirty, hasUnsavedChanges: isDirty };
          
          // Real-time localStorage update
          if (typeof window !== 'undefined') {
            localStorage.setItem('divwy-has-unsaved-changes', isDirty.toString());
          }
          
          return newState;
        }
        return prev;
      });
      
      // Enterprise logging สำหรับ debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('[NovelEditor] Real-time dirty state change:', {
          isDirty,
          activeTab,
          timestamp: new Date().toISOString()
        });
      }
    };
    
    // Professional EventManager configuration
    // EventManager already configured in constructor with callbacks
    
    // Enterprise cleanup
    return () => {
      eventManager.destroy();
    };
  }, [eventManager, activeTab])

  // อัปเดต eventManager เมื่อการตั้งค่า auto-save เปลี่ยน
  useEffect(() => {
    // EventManager config updates will be handled in Phase 2
    // For now, we'll log the configuration change
    console.log('[NovelEditor] Auto-save configuration changed:', {
      autoSaveEnabled: isAutoSaveEnabled,
      autoSaveIntervalMs: autoSaveIntervalSec * 1000
    });
  }, [eventManager, isAutoSaveEnabled, autoSaveIntervalSec])

  // ===============================
  // PROFESSIONAL SMART SAVE STATE MANAGEMENT
  // เทียบเท่า Adobe Premiere Pro & Canva
  // ===============================
  
  useEffect(() => {
    // Professional-grade change detection ที่ไม่ทำให้ปุ่ม Save flicker
    const performProfessionalChangeDetection = async () => {
      let actualChangeState = false;
      
      if (activeTab === 'blueprint' && blueprintTabRef.current?.getCurrentData) {
        try {
          const currentData = blueprintTabRef.current.getCurrentData();
          // ใช้ EventManager เป็นแหล่งข้อมูลหลักสำหรับการตรวจจับการเปลี่ยนแปลง
          const eventManagerHasChanges = eventManager.hasChanges();
          const eventManagerState = eventManager.getState();
          
          actualChangeState = eventManagerHasChanges || eventManagerState.isDirty || eventManagerState.hasUnsavedChanges;
          
          // Enterprise logging สำหรับ debugging และ monitoring
          if (process.env.NODE_ENV === 'development') {
            console.log('[NovelEditor] Professional Blueprint change detection:', {
              hasActualChanges: actualChangeState,
              eventManagerHasChanges,
              eventManagerIsDirty: eventManagerState.isDirty,
              eventManagerHasUnsaved: eventManagerState.hasUnsavedChanges,
              nodeCount: currentData.nodes?.length || 0,
              edgeCount: currentData.edges?.length || 0,
              timestamp: new Date().toISOString()
            });
          }
          
        } catch (error) {
          console.error('[NovelEditor] Error in Blueprint change detection:', error);
          // Fallback: ใช้ saveState เป็นหลัก
          actualChangeState = saveState.hasUnsavedChanges || saveState.isDirty;
        }
      } else if (activeTab === 'director') {
        // Professional Director tab change detection
        actualChangeState = hasDirectorChanges;
      } else if (activeTab === 'summary') {
        // Professional Summary tab change detection  
        actualChangeState = hasSummaryChanges;
      } else {
        // Fallback: ใช้ combined state
        actualChangeState = saveState.hasUnsavedChanges || hasBlueprintChanges || hasDirectorChanges || hasSummaryChanges;
      }
      
      // อัปเดต stable state เฉพาะเมื่อมีการเปลี่ยนแปลงจริง
      setStableHasUnsavedChanges(actualChangeState);
      
      // Real-time localStorage sync สำหรับ refresh protection
      if (typeof window !== 'undefined') {
        localStorage.setItem('divwy-has-unsaved-changes', actualChangeState.toString());
        if (actualChangeState) {
          localStorage.setItem('divwy-last-change', Date.now().toString());
        }
      }
    };

    // Professional stabilization technique เพื่อป้องกัน UI flickering
    const stabilizationTimer = setTimeout(() => {
      performProfessionalChangeDetection();
    }, 200); // Optimal delay สำหรับ professional UX และป้องกัน false positive

    return () => {
      if (stabilizationTimer) {
        clearTimeout(stabilizationTimer);
      }
    };
  }, [
    saveState.hasUnsavedChanges,
    hasBlueprintChanges,
    hasDirectorChanges, 
    hasSummaryChanges,
    activeTab, 
    eventManager
  ])

  // บันทึก settings ลง UserSettings และ localStorage เมื่อเปลี่ยนแปลง
  useEffect(() => {
    saveBlueprintSettings('auto-save-enabled', isAutoSaveEnabled);
  }, [isAutoSaveEnabled, saveBlueprintSettings])

  useEffect(() => {
    saveBlueprintSettings('auto-save-interval', autoSaveIntervalSec);
  }, [autoSaveIntervalSec, saveBlueprintSettings])

  useEffect(() => {
    saveBlueprintSettings('show-scene-thumbnails', showSceneThumbnails);
  }, [showSceneThumbnails, saveBlueprintSettings])

  useEffect(() => {
    saveBlueprintSettings('show-node-labels', showNodeLabels);
  }, [showNodeLabels, saveBlueprintSettings])

  useEffect(() => {
    saveBlueprintSettings('show-grid', showGrid);
  }, [showGrid, saveBlueprintSettings])

  useEffect(() => {
    saveBlueprintSettings('snap-to-grid', snapToGrid);
  }, [snapToGrid, saveBlueprintSettings])

  useEffect(() => {
    saveBlueprintSettings('node-orientation', nodeOrientation);
  }, [nodeOrientation, saveBlueprintSettings])

  // ===============================
  // PROFESSIONAL REFRESH PROTECTION
  // ===============================
  
  useEffect(() => {
    // Professional-grade beforeunload handler เทียบเท่า Adobe/Canva
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (stableHasUnsavedChanges) {
        // Professional warning message
        const message = '🚨 คุณมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก\n\n' +
                       'หากออกจากหน้านี้ การเปลี่ยนแปลงทั้งหมดจะสูญหาย\n\n' +
                       '💡 แนะนำให้กดปุ่ม "บันทึก" ก่อนออกจากหน้า';
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    // Enterprise-grade visibility change handler
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // เก็บ timestamp และ unsaved state เมื่อหน้าถูกซ่อน
        localStorage.setItem('divwy-last-hidden', Date.now().toString());
        localStorage.setItem('divwy-has-unsaved-changes', stableHasUnsavedChanges.toString());
      } else if (document.visibilityState === 'visible') {
        // ตรวจสอบเมื่อกลับมาที่หน้า
        const lastHidden = localStorage.getItem('divwy-last-hidden');
        if (lastHidden) {
          const hiddenDuration = Date.now() - parseInt(lastHidden);
          // หากซ่อนไปนานกว่า 5 นาที และมีการเปลี่ยนแปลง ให้แจ้งเตือน
          if (hiddenDuration > 5 * 60 * 1000 && stableHasUnsavedChanges) {
            toast.warning(
              '⚠️ คุณออกจากหน้านี้ไปนานกว่า 5 นาที\n' +
              'หากมีการเปลี่ยนแปลงอื่น อาจมีความเสี่ยงในการสูญเสียข้อมูล\n' +
              'แนะนำให้บันทึกงานทันที'
            );
          }
        }
      }
    };

    // Professional keyboard shortcut สำหรับ Ctrl+S
    const handleKeyboardSave = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        if (stableHasUnsavedChanges) {
          handleManualSave();
        } else {
          toast.info('ไม่มีการเปลี่ยนแปลงที่ต้องบันทึก');
        }
      }
    };

    // Professional event registration
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyboardSave);

    // Enterprise cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyboardSave);
    };
  }, [stableHasUnsavedChanges, handleManualSave]);

  // Handle click outside to close settings dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target as Node)) {
        setShowSettingsDropdown(false)
      }
    }

    if (showSettingsDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSettingsDropdown])

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header Bar - Desktop */}
      <div className="hidden lg:flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-foreground truncate max-w-md">
            {currentNovel.title}
          </h1>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>•</span>
            <span>{currentEpisodes.length} ตอน</span>
            <span>•</span>
            <span className={`px-2 py-1 rounded text-xs ${
              currentNovel.status === 'published' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
            }`}>
              {currentNovel.status === 'published' ? 'เผยแพร่แล้ว' : 'แบบร่าง'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Save Status - ใช้ SaveStatusIndicator ใหม่ */}
          <SaveStatusIndicator 
            saveState={saveState} 
            size="md"
            showDetails={false}
          />

          {/* Manual Save */}
          <Button
            onClick={handleManualSave}
            disabled={saveState.isSaving || !stableHasUnsavedChanges}
            size="sm"
            className={`flex items-center space-x-2 ${
              stableHasUnsavedChanges
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <Save className="h-4 w-4" />
            <span>{stableHasUnsavedChanges ? 'บันทึก' : 'บันทึกแล้ว'}</span>
          </Button>

          {/* Settings Dropdown */}
          <div className="relative" ref={settingsDropdownRef}>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2"
              onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
            
            {showSettingsDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 top-full mt-2 z-50"
              >
                <Card className="w-96 p-6 shadow-lg border bg-card">
                  {/* Header */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold">การตั้งค่า Editor</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      จัดการการตั้งค่าสำหรับการแก้ไขและการแสดงผล
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* ส่วนการบันทึกอัตโนมัติ */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Save className="h-4 w-4 text-blue-600" />
                        <h4 className="font-medium text-sm">ระบบบันทึกอัตโนมัติ</h4>
                      </div>
                      
                      {/* Auto-save Toggle */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label htmlFor="auto-save" className="text-sm font-medium">
                            Auto-save
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            บันทึกการเปลี่ยนแปลงอัตโนมัติ
                          </p>
                        </div>
                        <Switch
                          id="auto-save"
                          checked={isAutoSaveEnabled}
                          onCheckedChange={setIsAutoSaveEnabled}
                        />
                      </div>
                      
                      {/* Auto-save Interval */}
                      {isAutoSaveEnabled && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2"
                        >
                          <Label className="text-sm font-medium">ความถี่ในการบันทึก</Label>
                          <div className="flex gap-2">
                            <Button
                              variant={autoSaveIntervalSec === 15 ? "default" : "outline"}
                              size="sm"
                              onClick={() => setAutoSaveIntervalSec(15)}
                              className="flex-1"
                            >
                              15 วินาที
                            </Button>
                            <Button
                              variant={autoSaveIntervalSec === 30 ? "default" : "outline"}
                              size="sm"
                              onClick={() => setAutoSaveIntervalSec(30)}
                              className="flex-1"
                            >
                              30 วินาที
                            </Button>
                          </div>
                        </motion.div>
                      )}
                      
                      {/* Auto-save Status */}
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">สถานะ:</span>
                          <span className={`font-medium ${isAutoSaveEnabled ? "text-green-600" : "text-gray-600"}`}>
                            {isAutoSaveEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                          </span>
                        </div>
                        {saveState.lastSaved && (
                          <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-muted-foreground">บันทึกล่าสุด:</span>
                            <span className="font-medium">{saveState.lastSaved.toLocaleTimeString('th-TH')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* ส่วนการแสดงผล Blueprint */}
                    <div className="space-y-4 pt-2 border-t border-border">
                      <div className="flex items-center gap-2 mb-3">
                        {/* eslint-disable-next-line jsx-a11y/alt-text */}
                        <Image className="h-4 w-4 text-green-600" />
                        <h4 className="font-medium text-sm">การแสดงผล Blueprint</h4>
                      </div>
                      
                      {/* Scene Thumbnail Toggle */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label htmlFor="scene-thumbnails" className="text-sm font-medium">
                            ภาพพื้นหลังฉาก
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            แสดงภาพพื้นหลังของฉากบน node
                          </p>
                        </div>
                        <Switch
                          id="scene-thumbnails"
                          checked={showSceneThumbnails}
                          onCheckedChange={setShowSceneThumbnails}
                        />
                      </div>
                      
                      {/* Node Labels Toggle */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label htmlFor="choice-labels" className="text-sm font-medium">
                            ป้ายชื่อ Choice
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            แสดงข้อความตัวเลือกบนเส้นเชื่อม
                          </p>
                        </div>
                        <Switch
                          id="choice-labels"
                          checked={showNodeLabels}
                          onCheckedChange={setShowNodeLabels}
                        />
                      </div>
                      
                      {/* Grid Toggle */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label htmlFor="show-grid" className="text-sm font-medium">
                            ตารางพื้นหลัง
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            แสดงตารางช่วยจัดแนวบนหน้าจอ
                          </p>
                        </div>
                        <Switch
                          id="show-grid"
                          checked={showGrid}
                          onCheckedChange={setShowGrid}
                        />
                      </div>

                      {/* Snap to Grid Toggle */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label htmlFor="snap-to-grid" className="text-sm font-medium">
                            จัดแนวตารางอัตโนมัติ
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            จัดแนว node ให้เข้ากับตารางเมื่อลาก
                          </p>
                        </div>
                        <Switch
                          id="snap-to-grid"
                          checked={snapToGrid}
                          onCheckedChange={setSnapToGrid}
                        />
                      </div>

                      {/* Node Orientation */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">การวางแนว Node</Label>
                        <div className="flex gap-2">
                          <Button
                            variant={nodeOrientation === 'vertical' ? "default" : "outline"}
                            size="sm"
                            onClick={() => setNodeOrientation('vertical')}
                            className="flex-1 transition-all duration-200"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <span>แนวตั้ง</span>
                              <div className="text-xs opacity-60">⬆️⬇️</div>
                            </div>
                          </Button>
                          <Button
                            variant={nodeOrientation === 'horizontal' ? "default" : "outline"}
                            size="sm"
                            onClick={() => setNodeOrientation('horizontal')}
                            className="flex-1 transition-all duration-200"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <span>แนวนอน</span>
                              <div className="text-xs opacity-60">⬅️➡️</div>
                            </div>
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {nodeOrientation === 'vertical' 
                            ? '🔗 เส้นเชื่อมต่อจะออกจากด้านบนและล่างของ node' 
                            : '🔗 เส้นเชื่อมต่อจะออกจากด้านซ้ายและขวาของ node'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <h1 className="text-lg font-bold text-foreground truncate max-w-[200px]">
            {currentNovel.title}
          </h1>
        </div>

        <Button
          onClick={handleManualSave}
          disabled={saveState.isSaving || !stableHasUnsavedChanges}
          size="sm"
          className={`${
            stableHasUnsavedChanges
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {saveState.isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex flex-1 h-[calc(100vh-73px)] lg:h-[calc(100vh-89px)]">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as typeof activeTab)}
          className="flex flex-col w-full"
        >
          {/* Tab Navigation - Desktop */}
          <TabsList className="hidden lg:flex w-full justify-start border-b border-border rounded-none bg-transparent p-0 h-auto">
            <TabsTrigger 
              value="blueprint" 
              className="flex items-center space-x-2 px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <Layers3 className="h-4 w-4" />
              <span>Blueprint</span>
            </TabsTrigger>
            <TabsTrigger 
              value="director" 
              className="flex items-center space-x-2 px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <Film className="h-4 w-4" />
              <span>Director</span>
            </TabsTrigger>
            <TabsTrigger 
              value="summary" 
              className="flex items-center space-x-2 px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Summary</span>
            </TabsTrigger>
          </TabsList>

          {/* Mobile Tab Navigation */}
          <div className="lg:hidden">
            <AnimatePresence>
              {isMobileMenuOpen && (
                <motion.div
                  initial={{ x: -300 }}
                  animate={{ x: 0 }}
                  exit={{ x: -300 }}
                  className="fixed left-0 top-[73px] bottom-0 w-64 bg-card border-r border-border z-50 p-4"
                >
                  <div className="space-y-2">
                    <Button
                      variant={activeTab === 'blueprint' ? 'default' : 'ghost'}
                      className="w-full justify-start space-x-2"
                      onClick={() => {
                        setActiveTab('blueprint')
                        setIsMobileMenuOpen(false)
                      }}
                    >
                      <Layers3 className="h-4 w-4" />
                      <span>Blueprint</span>
                    </Button>
                    <Button
                      variant={activeTab === 'director' ? 'default' : 'ghost'}
                      className="w-full justify-start space-x-2"
                      onClick={() => {
                        setActiveTab('director')
                        setIsMobileMenuOpen(false)
                      }}
                    >
                      <Film className="h-4 w-4" />
                      <span>Director</span>
                    </Button>
                    <Button
                      variant={activeTab === 'summary' ? 'default' : 'ghost'}
                      className="w-full justify-start space-x-2"
                      onClick={() => {
                        setActiveTab('summary')
                        setIsMobileMenuOpen(false)
                      }}
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>Summary</span>
                    </Button>
                  </div>

                  {/* Mobile Settings */}
                  <div className="mt-6 pt-4 border-t border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Auto-save</span>
                      <Button
                        variant={isAutoSaveEnabled ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsAutoSaveEnabled(!isAutoSaveEnabled)}
                        className="text-xs"
                      >
                        {isAutoSaveEnabled ? 'เปิด' : 'ปิด'}
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Scene Thumbnails</span>
                      <Button
                        variant={showSceneThumbnails ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowSceneThumbnails(!showSceneThumbnails)}
                        className="text-xs"
                      >
                        {showSceneThumbnails ? 'เปิด' : 'ปิด'}
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Choice Labels</span>
                      <Button
                        variant={showNodeLabels ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowNodeLabels(!showNodeLabels)}
                        className="text-xs"
                      >
                        {showNodeLabels ? 'เปิด' : 'ปิด'}
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Grid</span>
                      <Button
                        variant={showGrid ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowGrid(!showGrid)}
                        className="text-xs"
                      >
                        {showGrid ? 'เปิด' : 'ปิด'}
                      </Button>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {saveState.lastSaved && !saveState.isSaving && `บันทึกล่าสุด ${saveState.lastSaved.toLocaleTimeString('th-TH')}`}
                      {saveState.isSaving && 'กำลังบันทึก...'}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-hidden">
            <TabsContent value="blueprint" className="h-full m-0 p-0">
              <BlueprintTab
                ref={blueprintTabRef}
                novel={currentNovel}
                storyMap={currentStoryMap}
                scenes={currentScenes}
                characters={characters}
                userMedia={userMedia}
                officialMedia={officialMedia}
                episodes={currentEpisodes}
                onStoryMapUpdate={handleStoryMapUpdate}
                onManualSave={handleManualSave}
                onDirtyChange={(isDirty) => {
                  // ส่ง dirty state ไปยัง NovelEditor โดยตรงและเสถียร
                  setHasBlueprintChanges(isDirty);
                }} // ส่ง dirty state callback
                // ✨ Professional Event Management Integration (Adobe/Canva/Figma style)
                eventManager={eventManager}
                // ส่งการตั้งค่าการแสดงผลจาก localStorage
                blueprintSettings={{
                  showSceneThumbnails,
                  showNodeLabels,
                  showGrid,
                  snapToGrid,
                  nodeOrientation
                }}
                onNavigateToDirector={(sceneId?: string) => {
                  setActiveTab('director')
                  // Potentially scroll/locate the scene inside DirectorTab via shared state or event bus
                }}
              />
            </TabsContent>

            <TabsContent value="director" className="h-full m-0 p-0">
              <DirectorTab
                novel={currentNovel}
                scenes={currentScenes}
                characters={characters}
                userMedia={userMedia}
                officialMedia={officialMedia}
                onSceneUpdate={handleSceneUpdate}
              />
            </TabsContent>

            <TabsContent value="summary" className="h-full m-0 p-0">
              <SummaryTab
                novel={currentNovel}
                episodes={currentEpisodes}
                onNovelUpdate={handleNovelUpdate}
                onEpisodeUpdate={handleEpisodeUpdate}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}

export default NovelEditor
