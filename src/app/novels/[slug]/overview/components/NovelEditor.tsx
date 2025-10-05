'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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

// Import ระบบ Save ใหม่ - ใช้ SingleUserEventManager สำหรับโหมดผู้ใช้คนเดียว
import { SingleUserEventManager, createSingleUserEventManager } from './tabs/SingleUserEventManager'
import SingleUserSaveStatusIndicator from './tabs/SingleUserSaveStatusIndicator'

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
  // URL state management
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // State สำหรับแท็บที่เลือก
  const [activeTab, setActiveTab] = useState<'blueprint' | 'director' | 'summary'>('blueprint')
  const [currentStoryMap, setCurrentStoryMap] = useState(storyMap)
  const [currentScenes, setCurrentScenes] = useState(scenes)
  const [currentEpisodes, setCurrentEpisodes] = useState(episodes)
  const [currentNovel, setCurrentNovel] = useState(novel)
  
  // 🎯 Episode selection state with URL persistence
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(
    searchParams.get('episode') || null
  )
  
  // State สำหรับ mobile menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // State สำหรับ auto-save (ดึงจาก database API เท่านั้น) - ปิดเด็ดขาดโดย default
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(false) // ✅ ปิดเด็ดขาดเพื่อป้องกัน hydration mismatch
  
  const [autoSaveIntervalSec, setAutoSaveIntervalSec] = useState<15 | 30>(30) // เริ่มต้นด้วยค่าคงที่
  
  // ใช้ SingleUserEventManager สำหรับโหมดผู้ใช้คนเดียว (Canva/Figma-like experience)
  const [eventManager] = useState(() => createSingleUserEventManager({
    novelSlug: novel.slug,
    selectedEpisodeId,
    autoSaveEnabled: isAutoSaveEnabled,
    autoSaveIntervalMs: autoSaveIntervalSec * 1000,
    maxHistorySize: 50,
    onStateChange: (state) => {
      // ✅ PROFESSIONAL FIX: Use command-based detection for perfect consistency with debounce
      const commandBasedHasChanges = eventManager.hasChanges();
      
      const enhancedState = {
        ...state,
        isDirty: commandBasedHasChanges,
        hasUnsavedChanges: commandBasedHasChanges
      };
      
      // ✅ ADOBE/FIGMA STYLE: Debounced save state update to prevent flickering
      setSaveState(prev => {
        if (prev.isDirty !== commandBasedHasChanges || prev.hasUnsavedChanges !== commandBasedHasChanges) {
          return enhancedState;
        }
        return prev; // No change, prevent re-render
      });
      
      // ✅ CRITICAL: Immediate localStorage sync for refresh protection
      if (typeof window !== 'undefined') {
        localStorage.setItem('divwy-has-unsaved-changes', commandBasedHasChanges.toString());
        localStorage.setItem('divwy-content-changes', commandBasedHasChanges.toString());
        localStorage.setItem('divwy-command-has-changes', commandBasedHasChanges.toString());
        
        if (state.lastSaved && !commandBasedHasChanges) {
          // ✅ ADOBE/FIGMA STYLE: Clear all change flags when truly saved
          localStorage.setItem('divwy-last-saved', Date.now().toString());
          localStorage.removeItem('divwy-last-change');
          localStorage.removeItem('divwy-last-content-change');
          
          // ✅ PROFESSIONAL: Clear settings change flags separately
          localStorage.setItem('divwy-settings-changes', 'false');
          
          console.log('[NovelEditor] ✅ All change flags cleared - save confirmed');
        }
        
        // ✅ PROFESSIONAL: Update change timestamp for accurate refresh protection
        if (commandBasedHasChanges) {
          localStorage.setItem('divwy-last-change', Date.now().toString());
        } else {
          localStorage.removeItem('divwy-last-change');
        }
      }
    },
    onDirtyChange: (isDirty) => {
      // ✅ PROFESSIONAL FIX: Use command-based detection to prevent flickering
      const commandBasedHasChanges = eventManager.hasChanges();
      
      // ✅ ADOBE/FIGMA STYLE: Update states only if truly changed
      setHasBlueprintChanges(prev => prev !== commandBasedHasChanges ? commandBasedHasChanges : prev);
      
      // ✅ CRITICAL: Immediate localStorage sync with command-based state
      if (typeof window !== 'undefined') {
        localStorage.setItem('divwy-content-changes', commandBasedHasChanges.toString());
        if (commandBasedHasChanges) {
          localStorage.setItem('divwy-last-change', Date.now().toString());
        } else {
          localStorage.removeItem('divwy-last-change'); // ✅ Clear when no changes
        }
      }
      
      console.log('[NovelEditor] 🔄 Command-based dirty state update:', {
        originalIsDirty: isDirty,
        commandBasedHasChanges,
        preventFlicker: true
      });
    },
    onError: (error, context) => {
      console.error(`[NovelEditor] SingleUserEventManager error in ${context}:`, error);
      toast.error(`Save error: ${error.message}`);
    },
    // 🎬 NEW: Blueprint-Director Integration Callbacks
    onSceneNodeSync: (sceneId: string, nodeId: string) => {
      console.log(`[NovelEditor] 🎬 Scene-Node synchronized: scene=${sceneId}, node=${nodeId}`);
      // Force re-render of both tabs to show the synchronization
      setCurrentScenes([...eventManager.getCurrentSnapshot().scenes || []]);
    },
    onDirectorTabUpdate: (scenes: any[]) => {
      console.log(`[NovelEditor] 🎬 Director tab updated with ${scenes.length} scenes`);
      setCurrentScenes([...scenes]);
    },
    onBlueprintTabUpdate: (nodes: any[], edges: any[]) => {
      console.log(`[NovelEditor] 🎬 Blueprint tab updated with ${nodes.length} nodes, ${edges.length} edges`);
      // Update storymap if needed
      if (currentStoryMap) {
        setCurrentStoryMap({
          ...currentStoryMap,
          nodes,
          edges,
          updatedAt: new Date().toISOString()
        });
      }
    }
  }))
  
  const [saveState, setSaveState] = useState(eventManager.getState())
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false)
  
  // Track dirty state from tabs - ปรับปรุงให้ stable มากขึ้น
  const [hasBlueprintChanges, setHasBlueprintChanges] = useState(false)
  const [hasDirectorChanges, setHasDirectorChanges] = useState(false)
  const [hasSummaryChanges, setHasSummaryChanges] = useState(false)
  
  // ===============================
  // PROFESSIONAL SMART SAVE DETECTION
  // เทียบเท่า Adobe Premiere Pro & Canva
  // ===============================
  
  // ✅ PROFESSIONAL FIX: Use command-based detection as single source of truth
  const commandBasedHasChanges = eventManager?.hasChanges() || false
  const hasUnsavedChanges = commandBasedHasChanges || hasDirectorChanges || hasSummaryChanges
  
  // 🔥 เพิ่ม isInitialLoad flag เพื่อป้องกันการบันทึกตอนเริ่มต้น
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false)
  
  // State สำหรับ Blueprint settings (โหลดจาก API/localStorage) - แก้ไข hydration
  const [showSceneThumbnails, setShowSceneThumbnails] = useState(true) // เริ่มต้นด้วยค่าคงที่
  const [showNodeLabels, setShowNodeLabels] = useState(true) // เริ่มต้นด้วยค่าคงที่
  const [showGrid, setShowGrid] = useState(true) // เริ่มต้นด้วยค่าคงที่
  const [snapToGrid, setSnapToGrid] = useState(false) // เริ่มต้นด้วยค่าคงที่
  const [nodeOrientation, setNodeOrientation] = useState<'horizontal' | 'vertical'>('vertical') // การวางแนว node ใหม่

  // ✨ Professional Settings Management (Adobe/Canva/Figma style) - เชื่อมต่อกับ Database จริง
  const saveBlueprintSettings = React.useCallback(async (key: string, value: any, options?: { silent?: boolean }) => {
    // 🔥 SKIP การบันทึกถ้าเป็น initial load เพื่อป้องกัน toast spam
    if (isInitialLoad || !isSettingsLoaded) {
      console.log('[NovelEditor] 🚫 Skipping save during initial load:', { key, value, isInitialLoad, isSettingsLoaded });
      return;
    }
    
    const silent = options?.silent || false;
    
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
    
    // 🔥 ตรวจสอบว่าเป็น UI-only settings หรือไม่ (สำหรับ silent mode)
    const uiOnlySettings = ['show-scene-thumbnails', 'show-node-labels', 'show-grid', 'snap-to-grid'];
    const isUiOnlySetting = uiOnlySettings.includes(key);
    
    // 🔥 UI-only settings ใช้ silent mode โดยอัตโนมัติ
    const shouldShowToast = !silent && !isUiOnlySetting;

    // สร้าง API payload ที่ถูกต้องตาม UserSettings schema
    const fieldMapping: Record<string, string> = {
      'auto-save-enabled': 'autoSaveEnabled',
      'auto-save-interval': 'autoSaveIntervalSec',
      'show-scene-thumbnails': 'showSceneThumbnails',
      'show-node-labels': 'showNodeLabels',
      'show-grid': 'showGrid',
      'snap-to-grid': 'snapToGrid',
      'node-orientation': 'nodeOrientation'
    };

    const fieldName = fieldMapping[key];
    if (!fieldName) {
      console.error('[NovelEditor] Unknown setting key:', key);
      return;
    }

    // Professional API call with proper error handling
    const savePromise = fetch('/api/user/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        visualNovelGameplay: {
          blueprintEditor: {
            [fieldName]: value
          }
        }
      }),
    }).then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    });

    // 🔥 แสดง toast เฉพาะเมื่อไม่ใช่ silent mode และไม่ใช่ UI-only settings
    if (shouldShowToast) {
      // Adobe/Figma style toast feedback with enhanced messages
      toast.promise(savePromise, {
        loading: `💾 กำลังบันทึก${settingName}ไปยัง Database...`,
        success: (data) => {
          console.log('[NovelEditor] Settings saved successfully:', data);
          
          // Special feedback for different setting types
          if (key === 'auto-save-enabled') {
            return value 
              ? `✅ เปิดใช้งาน ${settingName} สำเร็จ - ระบบจะบันทึกอัตโนมัติทุก ${autoSaveIntervalSec} วินาที`
              : `⏸️ ปิดใช้งาน ${settingName} สำเร็จ - จะบันทึกเฉพาะเมื่อกดปุ่ม Save`;
          } else if (key === 'auto-save-interval') {
            return `✅ ตั้งค่า${settingName}เป็น ${value} วินาที สำเร็จ`;
          }
          
          return `✅ บันทึก${settingName}สำเร็จ`;
        },
        error: (error) => {
          console.error('[NovelEditor] Error saving blueprint settings:', error);
          return `❌ ไม่สามารถบันทึก${settingName}ได้: ${error.message}`;
        },
      });
    }

    try {
      await savePromise;
      
              // 🔥 บันทึกลง localStorage สำหรับ fallback (เฉพาะ UI settings)
        if (isUiOnlySetting) {
          const fieldMapping: Record<string, string> = {
            'show-scene-thumbnails': 'showSceneThumbnails',
            'show-node-labels': 'showNodeLabels',
            'show-grid': 'showGrid',
            'snap-to-grid': 'snapToGrid',
            'node-orientation': 'nodeOrientation'
          };
          
          const fieldName = fieldMapping[key];
          if (fieldName) {
            const currentSettings = JSON.parse(localStorage.getItem('blueprint-settings') || '{}');
            currentSettings[fieldName] = value;
            localStorage.setItem('blueprint-settings', JSON.stringify(currentSettings));
            
            // ✅ PROFESSIONAL FIX: Settings changes ไม่ trigger refresh protection
            localStorage.setItem('divwy-settings-only-changes', 'true');
            localStorage.setItem('divwy-last-settings-change', Date.now().toString());
            
            // ✅ CRITICAL: Explicitly clear content/command flags after settings save
            localStorage.setItem('divwy-content-changes', 'false');
            localStorage.setItem('divwy-command-has-changes', 'false');
            localStorage.removeItem('divwy-last-change');
            localStorage.removeItem('divwy-last-content-change');
            
            // ✅ EXTRA PROTECTION: Set timestamp for recent settings change detection
            setTimeout(() => {
              localStorage.setItem('divwy-settings-only-changes', 'true');
              localStorage.setItem('divwy-last-settings-change', Date.now().toString());
            }, 100); // Small delay to ensure flags are set after any potential content flags
            
            console.log(`[NovelEditor] 🎨 Settings change recorded (no refresh protection): ${settingName} = ${value}`);
          }
        } else {
          // 🔥 Critical settings (auto-save, intervals) ไม่ถือเป็น changes ที่ต้องเตือน
          localStorage.setItem('divwy-settings-only-changes', 'true');
          localStorage.setItem('divwy-last-settings-change', Date.now().toString());
          
          // ✅ CRITICAL: Clear content flags for critical settings too
          localStorage.setItem('divwy-content-changes', 'false');
          localStorage.setItem('divwy-command-has-changes', 'false');
          localStorage.removeItem('divwy-last-change');
          localStorage.removeItem('divwy-last-content-change');
          
          // ✅ EXTRA PROTECTION: Set timestamp for recent settings change detection (critical settings)
          setTimeout(() => {
            localStorage.setItem('divwy-settings-only-changes', 'true');
            localStorage.setItem('divwy-last-settings-change', Date.now().toString());
          }, 100); // Small delay to ensure flags are set after any potential content flags
          
          console.log(`[NovelEditor] ⚙️ Critical setting saved (no refresh protection): ${settingName} = ${value}`);
        }
      
      // 🔥 Silent logging สำหรับ UI-only settings
      if (silent || isUiOnlySetting) {
        console.log(`[NovelEditor] 🔇 Silent save: ${settingName} = ${value}`);
      }
      
    } catch (error) {
      // Error is already handled by toast.promise (หากไม่ใช่ silent mode)
      console.error('[NovelEditor] Blueprint settings save failed:', error);
      
      // 🔥 แสดง error toast แม้ใน silent mode (เพราะ error สำคัญ)
      if (silent || isUiOnlySetting) {
        toast.error(`❌ ไม่สามารถบันทึก${settingName}ได้: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }, [autoSaveIntervalSec, isInitialLoad, isSettingsLoaded]);

  // 🔥 เพิ่มฟังก์ชัน Batch Save สำหรับ settings หลายตัวพร้อมกัน (User-Centric Design)
  const saveBlueprintSettingsBatch = React.useCallback(async (
    settings: Record<string, any>, 
    options?: { silent?: boolean; showToast?: boolean }
  ) => {
    // Skip ถ้าเป็น initial load
    if (isInitialLoad || !isSettingsLoaded) {
      console.log('[NovelEditor] 🚫 Skipping batch save during initial load:', settings);
      return;
    }

    const { silent = false, showToast = true } = options || {};
    
    try {
      // สร้าง API payload สำหรับ batch update
      const blueprintEditorUpdates: Record<string, any> = {};
      const fieldMapping: Record<string, string> = {
        'auto-save-enabled': 'autoSaveEnabled',
        'auto-save-interval': 'autoSaveIntervalSec',
        'show-scene-thumbnails': 'showSceneThumbnails',
        'show-node-labels': 'showNodeLabels',
        'show-grid': 'showGrid',
        'snap-to-grid': 'snapToGrid',
        'node-orientation': 'nodeOrientation'
      };

      // แปลง key ให้ตรงกับ database schema
      Object.entries(settings).forEach(([key, value]) => {
        const dbField = fieldMapping[key];
        if (dbField) {
          blueprintEditorUpdates[dbField] = value;
        }
      });

      if (Object.keys(blueprintEditorUpdates).length === 0) {
        console.warn('[NovelEditor] No valid fields in batch save request');
        return;
      }

      // Professional API call
      const savePromise = fetch('/api/user/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visualNovelGameplay: {
            blueprintEditor: blueprintEditorUpdates
          }
        }),
      }).then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      });

      // แสดง toast เฉพาะเมื่อต้องการ
      if (showToast && !silent) {
        toast.promise(savePromise, {
          loading: `💾 กำลังบันทึกการตั้งค่า Blueprint (${Object.keys(settings).length} รายการ)...`,
          success: () => {
            console.log('[NovelEditor] Batch settings saved successfully');
            return `✅ บันทึกการตั้งค่า Blueprint สำเร็จ (${Object.keys(settings).length} รายการ)`;
          },
          error: (error) => {
            console.error('[NovelEditor] Batch save failed:', error);
            return `❌ ไม่สามารถบันทึกการตั้งค่าได้: ${error.message}`;
          },
        });
      }

      await savePromise;

      // บันทึกลง localStorage สำหรับ fallback
      const currentLocalSettings = JSON.parse(localStorage.getItem('blueprint-settings') || '{}');
      Object.entries(settings).forEach(([key, value]) => {
        const dbField = fieldMapping[key];
        if (dbField) {
          currentLocalSettings[dbField] = value;
        }
      });
      localStorage.setItem('blueprint-settings', JSON.stringify(currentLocalSettings));

      if (silent) {
        console.log(`[NovelEditor] 🔇 Silent batch save completed: ${Object.keys(settings).length} settings`);
      }

      return true;
    } catch (error) {
      console.error('[NovelEditor] Batch settings save failed:', error);
      
      // แสดง error แม้ใน silent mode (เพราะ error สำคัญ)
      if (showToast) {
        toast.error(`❌ ไม่สามารถบันทึกการตั้งค่าได้: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      return false;
    }
  }, [isInitialLoad, isSettingsLoaded, autoSaveIntervalSec]);

  // Handlers for data updates
  const handleStoryMapUpdate = (updatedStoryMap: any) => {
    setCurrentStoryMap(updatedStoryMap)
    toast.success('StoryMap updated successfully')
  }

  // 🎬 NEW: Handle navigation to Director tab with scene context
  const handleNavigateToDirector = useCallback((sceneId?: string) => {
    console.log(`[NovelEditor] 🎬 Navigating to Director tab`, { sceneId });
    
    setActiveTab('director');
    
    // If a specific scene is provided, we could set it as selected in DirectorTab
    if (sceneId) {
      // The DirectorTab will receive the sceneId and can auto-select it
      console.log(`[NovelEditor] 🎬 Will focus on scene: ${sceneId}`);
    }
    
    // Ensure scenes are up to date
    setCurrentScenes([...eventManager.getCurrentSnapshot().scenes || []]);
  }, [eventManager]);

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

  // 🎯 Enhanced Episode Update Handler
  const handleEpisodeUpdate = useCallback(async (episodeId: string, episodeData: any) => {
    try {
      // 🔥 Use Blueprint API for consistent updates
      const response = await fetch(`/api/novels/${novel.slug}/episodes/blueprint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          episodeIds: [episodeId],
          updateData: episodeData
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update episode')
      }

      const result = await response.json()
      const updatedEpisode = result.data

      // 🎯 Update local state
      const updatedEpisodes = currentEpisodes.map(episode => 
        episode._id === episodeId ? updatedEpisode : episode
      )
      setCurrentEpisodes(updatedEpisodes)

      // 🎯 Update EventManager
      if (eventManager) {
        await eventManager.executeCommand({
          type: 'EPISODE_UPDATE',
          id: `episode_update_${episodeId}_${Date.now()}`,
          description: `Update episode: ${updatedEpisode.title}`,
          execute: async () => {
            // Command execution handled by EventManager
          },
          undo: async () => {
            // Undo logic handled by EventManager
          }
        } as any) // 🔧 Type assertion for extended Command interface
      }

      toast.success(`อัปเดตตอน "${updatedEpisode.title}" เรียบร้อยแล้ว`)
    } catch (error: any) {
      console.error('Error updating episode:', error)
      toast.error(`การอัปเดตตอนล้มเหลว: ${error.message}`)
      throw error
    }
  }, [novel.slug, currentEpisodes, eventManager])

  // 🎯 URL state management for episode selection
  // 🔥 FIX: Sync episode selection to URL and event manager IMMEDIATELY
  const handleEpisodeSelect = useCallback(async (episodeId: string | null) => {
    console.log('[NovelEditor] 🎯 Episode selection changed:', { episodeId, type: typeof episodeId })
    
    // ✅ STEP 1: Validate episodeId format (MongoDB ObjectId must be 24 hex chars)
    if (episodeId && (
      episodeId === 'null' || 
      episodeId === 'undefined' ||
      episodeId.length !== 24 ||
      !/^[0-9a-fA-F]{24}$/.test(episodeId)
    )) {
      console.error('[NovelEditor] ❌ Invalid episodeId format:', {
        episodeId,
        length: episodeId.length,
        isHex: /^[0-9a-fA-F]+$/.test(episodeId)
      })
      toast.error('รหัสตอนไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง')
      return
    }
    
    // ✅ STEP 2: Update local state
    setSelectedEpisodeId(episodeId)
    
    // ✅ STEP 3: Update event manager config IMMEDIATELY before any save operations
    eventManager.updateConfig({ selectedEpisodeId: episodeId })
    
    // ✅ STEP 4: Verify the update was successful
    const currentConfig = eventManager.getConfig()
    const currentSnapshot = eventManager.getCurrentSnapshot()
    console.log('[NovelEditor] ✅ EventManager config verified:', { 
      requestedEpisodeId: episodeId,
      configuredEpisodeId: currentConfig.selectedEpisodeId,
      isMatching: episodeId === currentConfig.selectedEpisodeId,
      snapshotHasData: !!currentSnapshot
    })
    
    // ✅ STEP 5: Load StoryMap for selected episode
    if (episodeId) {
      try {
        console.log(`[NovelEditor] 📥 Loading StoryMap for episode: ${episodeId}`)
        const response = await fetch(`/api/novels/${novel.slug}/episodes/${episodeId}/storymap`)
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.storyMap) {
            setCurrentStoryMap(data.storyMap)
            console.log('[NovelEditor] ✅ Episode StoryMap loaded successfully')
          } else {
            console.warn('[NovelEditor] ⚠️ No StoryMap found for episode, using empty state')
            setCurrentStoryMap(null)
          }
        } else {
          console.warn('[NovelEditor] ⚠️ Failed to load episode StoryMap:', response.status)
          setCurrentStoryMap(null)
        }
      } catch (error) {
        console.error('[NovelEditor] ❌ Error loading episode StoryMap:', error)
        setCurrentStoryMap(null)
      }
    } else {
      // Load main story StoryMap
      console.log('[NovelEditor] 📥 Loading Main Story StoryMap')
      setCurrentStoryMap(storyMap)
    }
    
    // ✅ STEP 6: Update URL (after config is confirmed)
    const currentParams = new URLSearchParams(searchParams.toString())
    if (episodeId) {
      currentParams.set('episode', episodeId)
    } else {
      currentParams.delete('episode')
    }
    
    const newUrl = `${window.location.pathname}?${currentParams.toString()}`
    router.replace(newUrl, { scroll: false })
  }, [router, searchParams, eventManager, novel.slug, storyMap])

  // 🔥 CRITICAL FIX: Sync selectedEpisodeId from URL to EventManager on mount and URL changes
  useEffect(() => {
    const urlEpisodeId = searchParams.get('episode')
    
    // Validate URL episode ID format before syncing
    if (urlEpisodeId) {
      if (urlEpisodeId === 'null' || 
          urlEpisodeId === 'undefined' ||
          urlEpisodeId.length !== 24 ||
          !/^[0-9a-fA-F]{24}$/.test(urlEpisodeId)) {
        console.error('[NovelEditor] ❌ Invalid episodeId in URL:', {
          urlEpisodeId,
          length: urlEpisodeId.length
        })
        // Clear invalid episode from URL
        router.replace(`/novels/${novel.slug}/overview`, { scroll: false })
        return
      }
    }
    
    // Only update if different from current config
    const currentConfigEpisodeId = eventManager.getConfig().selectedEpisodeId
    if (urlEpisodeId !== currentConfigEpisodeId) {
      console.log('[NovelEditor] 🔄 Syncing episodeId from URL to EventManager:', {
        urlEpisodeId,
        currentConfigEpisodeId,
        isValid: !urlEpisodeId || /^[0-9a-fA-F]{24}$/.test(urlEpisodeId)
      })
      
      // Update local state
      setSelectedEpisodeId(urlEpisodeId)
      
      // Update EventManager config
      eventManager.updateConfig({ selectedEpisodeId: urlEpisodeId })
      
      // Verify sync
      const verifiedConfig = eventManager.getConfig()
      console.log('[NovelEditor] ✅ EventManager episodeId synced:', {
        requestedEpisodeId: urlEpisodeId,
        configuredEpisodeId: verifiedConfig.selectedEpisodeId,
        isMatching: urlEpisodeId === verifiedConfig.selectedEpisodeId
      })
    }
  }, [searchParams, eventManager, novel.slug, router])

  // ✨ Handle episode creation from BlueprintTab
  const handleEpisodeCreate = useCallback((newEpisode: any, updatedEpisodes: any[]) => {
    // 🎯 Update current episodes state with the new episode list
    setCurrentEpisodes(updatedEpisodes)
    
    // 🎯 Update novel episode count
    setCurrentNovel(prev => ({
      ...prev,
      totalEpisodesCount: updatedEpisodes.length,
      publishedEpisodesCount: updatedEpisodes.filter(ep => ep.status === 'published').length
    }))
    
    // 🎯 Update EventManager with new episodes data
    if (eventManager) {
      const context = eventManager.getCommandContext() as any;
      if (context.setEpisodes) {
        context.setEpisodes(updatedEpisodes);
      }
    }
    
    // 🎯 Auto-select the new episode with URL update
    handleEpisodeSelect(newEpisode._id)
    
    console.log('[NovelEditor] Episode created successfully:', newEpisode.title)
    toast.success(`สร้างตอน "${newEpisode.title}" เรียบร้อยแล้ว`)
  }, [eventManager, handleEpisodeSelect])

  // 🎯 Enhanced Episode Delete Handler
  const handleEpisodeDelete = useCallback(async (episodeId: string, updatedEpisodes: any[]) => {
    try {
      // 🎯 Update local state immediately for responsive UI
      setCurrentEpisodes(updatedEpisodes)
      
      // 🎯 Update novel episode count
      setCurrentNovel(prev => ({
        ...prev,
        totalEpisodesCount: updatedEpisodes.length,
        publishedEpisodesCount: updatedEpisodes.filter(ep => ep.status === 'published').length
      }))

      // 🎯 Update EventManager
      if (eventManager) {
        await eventManager.executeCommand({
          type: 'EPISODE_DELETE',
          id: `episode_delete_${episodeId}_${Date.now()}`,
          description: `Delete episode: ${episodeId}`,
          execute: async () => {
            // Command execution handled by EventManager
          },
          undo: async () => {
            // Undo logic handled by EventManager
          }
        } as any) // 🔧 Type assertion for extended Command interface
      }

      // 🎯 Clear episode selection if deleted episode was selected
      if (selectedEpisodeId === episodeId) {
        handleEpisodeSelect(null)
      }

      console.log('[NovelEditor] Episode deleted successfully:', episodeId)
    } catch (error: any) {
      console.error('Error in episode delete handler:', error)
      toast.error(`การลบตอนล้มเหลว: ${error.message}`)
    }
  }, [eventManager, selectedEpisodeId, handleEpisodeSelect])

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
        // 🔥 ADOBE/FIGMA STYLE: ใช้ EventManager's command-based detection เป็นหลัก
        hasActualChanges = eventManager?.hasChanges() || false;
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
    hasUnsavedChanges,
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

  // 🔥 โหลดการตั้งค่าจริงจาก UserSettings Database (Professional Data Loading)
  useEffect(() => {
    // Professional settings loader - โหลดจาก database จริงผ่าน API
    const loadProfessionalSettings = async () => {
      console.log('[NovelEditor] 🔄 เริ่มโหลดการตั้งค่าจาก API...');
      
      try {
        // ดึงข้อมูลจาก API /api/user/settings
        const response = await fetch('/api/user/settings', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load settings: ${response.status} ${response.statusText}`);
        }

        const settingsData = await response.json();
        const blueprintSettings = settingsData.settings?.visualNovelGameplay?.blueprintEditor;
        
        if (blueprintSettings) {
          // 🔥 โหลดค่าจาก database อย่างระมัดระวัง
          console.log('[NovelEditor] 📖 โหลดการตั้งค่าจาก Database:', blueprintSettings);
          
          setIsAutoSaveEnabled(blueprintSettings.autoSaveEnabled ?? false);
          setAutoSaveIntervalSec((blueprintSettings.autoSaveIntervalSec as 15 | 30) ?? 30);
          setShowSceneThumbnails(blueprintSettings.showSceneThumbnails ?? true);
          setShowNodeLabels(blueprintSettings.showNodeLabels ?? true);
          setShowGrid(blueprintSettings.showGrid ?? true);
          setSnapToGrid(blueprintSettings.snapToGrid ?? false);
          setNodeOrientation(blueprintSettings.nodeOrientation ?? 'vertical');
          
        } else {
          // 🔥 ลอง fallback ไปยัง localStorage
          console.log('[NovelEditor] 💾 ไม่พบข้อมูลใน Database, ตรวจสอบ localStorage...');
          
          const localSettings = localStorage.getItem('blueprint-settings');
          if (localSettings) {
            try {
              const parsed = JSON.parse(localSettings);
              console.log('[NovelEditor] 📁 โหลดการตั้งค่าจาก localStorage:', parsed);
              
              setShowSceneThumbnails(parsed.showSceneThumbnails ?? true);
              setShowNodeLabels(parsed.showNodeLabels ?? true);
              setShowGrid(parsed.showGrid ?? true);
              setSnapToGrid(parsed.snapToGrid ?? false);
              setNodeOrientation(parsed.nodeOrientation ?? 'vertical');
            } catch (parseError) {
              console.error('[NovelEditor] ❌ Error parsing localStorage settings:', parseError);
            }
          }
          
          // ✅ ใช้ค่าเริ่มต้นสำหรับการตั้งค่าที่ไม่มีใน localStorage
          console.log('[NovelEditor] ✅ ใช้ค่าเริ่มต้น - ผู้ใช้สามารถปรับได้ตามต้องการ');
        }
      } catch (error) {
        console.error('[NovelEditor] ❌ ข้อผิดพลาดในการโหลดการตั้งค่าจาก API:', error);
        
        // 🔥 Fallback: ลอง localStorage ก่อน
        try {
          const localSettings = localStorage.getItem('blueprint-settings');
          if (localSettings) {
            const parsed = JSON.parse(localSettings);
            console.log('[NovelEditor] 💾 Fallback: ใช้การตั้งค่าจาก localStorage:', parsed);
            
            setShowSceneThumbnails(parsed.showSceneThumbnails ?? true);
            setShowNodeLabels(parsed.showNodeLabels ?? true);
            setShowGrid(parsed.showGrid ?? true);
            setSnapToGrid(parsed.snapToGrid ?? false);
            setNodeOrientation(parsed.nodeOrientation ?? 'vertical');
          }
        } catch (localError) {
          console.error('[NovelEditor] ❌ Error reading localStorage:', localError);
        }
        
        // Fallback สุดท้าย: ค่าเริ่มต้น
        setIsAutoSaveEnabled(false); // ✅ ปิดเด็ดขาดแม้ในกรณี error
        setAutoSaveIntervalSec(30);
      } finally {
        // 🔥 สำคัญ: เปิดใช้งานการบันทึกหลังจากโหลดเสร็จแล้ว
        setTimeout(() => {
          setIsSettingsLoaded(true);
          setIsInitialLoad(false);
          console.log('[NovelEditor] ✅ การโหลดเสร็จสิ้น - เปิดใช้งานการบันทึก');
        }, 500); // หน่วงเวลา 500ms เพื่อให้แน่ใจว่า state ทั้งหมดอัปเดตแล้ว
      }
    };

    // โหลดเฉพาะเมื่อ component mount ครั้งแรก
    loadProfessionalSettings();
  }, []); // ✅ ว่างเปล่าเพื่อให้เรียกครั้งเดียวเมื่อ mount เท่านั้น

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
            // 🆕 PHASE 5: Professional baseline sync with Episodes
            eventManager.initializeWithData({
              ...currentData,
              episodes: currentEpisodes // 🎯 Include episodes in initial data
            });
            setIsInitialSyncComplete(true);
            
            console.log('[NovelEditor] 🎯 Professional initial state synchronized:', {
              nodeCount: currentData.nodes?.length || 0,
              edgeCount: currentData.edges?.length || 0,
              episodeCount: currentEpisodes?.length || 0, // 🎯 Log episode count
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
      // 🔥 ADOBE/FIGMA STYLE: Override with command-based detection for all systems
      const commandBasedHasChanges = eventManager.hasChanges();
      
      const enhancedState = {
        ...newState,
        isDirty: commandBasedHasChanges,
        hasUnsavedChanges: commandBasedHasChanges
      };
      
      setSaveState(enhancedState);
      
                // Real-time localStorage sync สำหรับ refresh protection - ใช้ command-based state
          if (typeof window !== 'undefined') {
            // 🔥 แยก Content Changes จาก Settings Changes
            localStorage.setItem('divwy-has-unsaved-changes', commandBasedHasChanges.toString());
            localStorage.setItem('divwy-command-has-changes', commandBasedHasChanges.toString());
            localStorage.setItem('divwy-content-changes', commandBasedHasChanges.toString()); // 🔥 NEW: Content-specific flag
            localStorage.setItem('divwy-save-state', JSON.stringify({
              isDirty: commandBasedHasChanges,
              hasUnsavedChanges: commandBasedHasChanges,
              lastSaved: enhancedState.lastSaved,
              timestamp: Date.now(),
              changeType: 'content' // 🔥 NEW: Mark as content change
            }));
            
            // 🔥 ADOBE/FIGMA STYLE: Update change timestamp เฉพาะ content commands
            if (commandBasedHasChanges) {
              localStorage.setItem('divwy-last-change', Date.now().toString());
              localStorage.setItem('divwy-last-content-change', Date.now().toString()); // 🔥 NEW: Content-specific timestamp
            } else {
              localStorage.removeItem('divwy-last-change');
              localStorage.removeItem('divwy-last-content-change');
            }
          }
    };
    
    const handleDirtyChange = (isDirty: boolean) => {
      // 🔥 ADOBE/FIGMA STYLE: Use command-based detection for Status Indicator consistency
      const commandBasedHasChanges = eventManager.hasChanges();
      
      console.log('[NovelEditor] 🔍 Status Indicator Sync Check:', {
        eventManagerIsDirty: isDirty,
        commandBasedHasChanges,
        willUseCommandBased: true
      });
      
      // Professional dirty state management - ใช้ command-based detection
      setSaveState(prev => {
        if (prev.isDirty !== commandBasedHasChanges || prev.hasUnsavedChanges !== commandBasedHasChanges) {
          const newState = { ...prev, isDirty: commandBasedHasChanges, hasUnsavedChanges: commandBasedHasChanges };
          
          // Real-time localStorage update - ใช้ command-based state
          if (typeof window !== 'undefined') {
            localStorage.setItem('divwy-has-unsaved-changes', commandBasedHasChanges.toString());
            
            // 🔥 CRITICAL: Store command-based state for Refresh Protection
            localStorage.setItem('divwy-command-has-changes', commandBasedHasChanges.toString());
            
            // 🔥 ADOBE/FIGMA STYLE: Update change timestamp เฉพาะ content commands
            if (commandBasedHasChanges) {
              localStorage.setItem('divwy-last-change', Date.now().toString());
            } else {
              localStorage.removeItem('divwy-last-change');
            }
          }
          
          return newState;
        }
        return prev;
      });
      
      // Enterprise logging สำหรับ debugging - improved with command-based info
      if (process.env.NODE_ENV === 'development') {
        console.log('[NovelEditor] Real-time dirty state change:', {
          originalIsDirty: isDirty,
          commandBasedHasChanges,
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
    // ✅ PROFESSIONAL SOLUTION 2: Real-time EventManager config update
    if (eventManager && isSettingsLoaded) {
      eventManager.updateConfig({
        autoSaveEnabled: isAutoSaveEnabled,
        autoSaveIntervalMs: autoSaveIntervalSec * 1000
      });
      
      console.log('[NovelEditor] 🔄 EventManager config updated:', {
        autoSaveEnabled: isAutoSaveEnabled,
        autoSaveIntervalMs: autoSaveIntervalSec * 1000
      });

      // ✅ PROFESSIONAL SOLUTION 7: Professional User Feedback
      if (isAutoSaveEnabled) {
        console.log(`[NovelEditor] ✅ Auto-save enabled - saving every ${autoSaveIntervalSec} seconds`);
      } else {
        console.log('[NovelEditor] ⏸️ Auto-save disabled - manual save only');
      }
    }
  }, [isAutoSaveEnabled, autoSaveIntervalSec, eventManager, isSettingsLoaded])

  // ===============================
  // PROFESSIONAL SMART SAVE STATE MANAGEMENT
  // เทียบเท่า Adobe Premiere Pro & Canva
  // ===============================
  
  // ✅ REMOVED: Complex stabilization logic replaced with unified hasUnsavedChanges

  // 🔥 บันทึก settings ลง UserSettings และ localStorage เมื่อเปลี่ยนแปลง (หลังจาก initial load)
  useEffect(() => {
    if (isSettingsLoaded && !isInitialLoad) {
      saveBlueprintSettings('auto-save-enabled', isAutoSaveEnabled);
    }
  }, [isAutoSaveEnabled, saveBlueprintSettings, isSettingsLoaded, isInitialLoad])

  useEffect(() => {
    if (isSettingsLoaded && !isInitialLoad) {
      saveBlueprintSettings('auto-save-interval', autoSaveIntervalSec);
    }
  }, [autoSaveIntervalSec, saveBlueprintSettings, isSettingsLoaded, isInitialLoad])

  useEffect(() => {
    if (isSettingsLoaded && !isInitialLoad) {
      saveBlueprintSettings('show-scene-thumbnails', showSceneThumbnails, { silent: true });
    }
  }, [showSceneThumbnails, saveBlueprintSettings, isSettingsLoaded, isInitialLoad])

  useEffect(() => {
    if (isSettingsLoaded && !isInitialLoad) {
      saveBlueprintSettings('show-node-labels', showNodeLabels, { silent: true });
    }
  }, [showNodeLabels, saveBlueprintSettings, isSettingsLoaded, isInitialLoad])

  useEffect(() => {
    if (isSettingsLoaded && !isInitialLoad) {
      saveBlueprintSettings('show-grid', showGrid, { silent: true });
    }
  }, [showGrid, saveBlueprintSettings, isSettingsLoaded, isInitialLoad])

  useEffect(() => {
    if (isSettingsLoaded && !isInitialLoad) {
      saveBlueprintSettings('snap-to-grid', snapToGrid, { silent: true });
    }
  }, [snapToGrid, saveBlueprintSettings, isSettingsLoaded, isInitialLoad])

  useEffect(() => {
    if (isSettingsLoaded && !isInitialLoad) {
      saveBlueprintSettings('node-orientation', nodeOrientation, { silent: true });
    }
  }, [nodeOrientation, saveBlueprintSettings, isSettingsLoaded, isInitialLoad])

  // ===============================
  // PROFESSIONAL REFRESH PROTECTION
  // ===============================
  
  useEffect(() => {
    // Professional-grade beforeunload handler เทียบเท่า Adobe/Canva
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
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
        localStorage.setItem('divwy-has-unsaved-changes', hasUnsavedChanges.toString());
      } else if (document.visibilityState === 'visible') {
        // ตรวจสอบเมื่อกลับมาที่หน้า
        const lastHidden = localStorage.getItem('divwy-last-hidden');
        if (lastHidden) {
          const hiddenDuration = Date.now() - parseInt(lastHidden);
          // หากซ่อนไปนานกว่า 5 นาที และมีการเปลี่ยนแปลง ให้แจ้งเตือน
          if (hiddenDuration > 5 * 60 * 1000 && hasUnsavedChanges) {
            toast.warning(
              '⚠️ คุณออกจากหน้านี้ไปนานกว่า 5 นาที\n' +
              'หากมีการเปลี่ยนแปลงอื่น อาจมีความเสี่ยงในการสูญเสียข้อมูล\n' +
              'แนะนำให้บันทึกงานทันที'
            );
          }
        }
      }
    };

    // Professional keyboard shortcuts สำหรับ Ctrl+S, Ctrl+Z, Ctrl+Y
    const handleKeyboardShortcuts = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 's':
            event.preventDefault();
            if (hasUnsavedChanges) {
              handleManualSave();
            } else {
              toast.info('ไม่มีการเปลี่ยนแปลงที่ต้องบันทึก');
            }
            break;
          // Undo/Redo keyboard shortcuts ถูกย้ายไปยัง BlueprintTab แล้ว
        }
      }
    };

    // Professional event registration
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // Enterprise cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, [hasUnsavedChanges, handleManualSave]);

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
          {/* Save Status - ใช้ unified state */}
          <SingleUserSaveStatusIndicator 
            saveState={{
              ...saveState,
              isDirty: hasUnsavedChanges,
              hasUnsavedChanges: hasUnsavedChanges
            }} 
            size="md"
            showDetails={true}
            className="min-w-[180px]"
          />

          {/* Undo/Redo Controls ถูกย้ายไปยัง BlueprintTab floating bar แล้ว */}

          {/* Manual Save */}
          <Button
            onClick={handleManualSave}
            disabled={saveState.isSaving || !hasUnsavedChanges}
            size="sm"
            className={`flex items-center space-x-2 ${
              hasUnsavedChanges
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <Save className="h-4 w-4" />
            <span>{hasUnsavedChanges ? 'บันทึก' : 'บันทึก'}</span>
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
                      
                      {/* Auto-save Status - แสดงข้อมูลจริงจาก Database API */}
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">สถานะ Auto-save:</span>
                          <span className={`font-medium ${isAutoSaveEnabled ? "text-green-600" : "text-gray-600"}`}>
                            {isAutoSaveEnabled ? `🟢 เปิด (${autoSaveIntervalSec}s)` : '🔴 ปิด'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-muted-foreground">ข้อมูลจาก:</span>
                          <span className="font-medium text-blue-600">
                            API Database
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-muted-foreground">EventManager:</span>
                          <span className="font-medium text-green-600">
                            {eventManager ? '🟢 เชื่อมต่อแล้ว' : '🔴 ไม่เชื่อมต่อ'}
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
          disabled={saveState.isSaving || !hasUnsavedChanges}
          size="sm"
          className={`${
            hasUnsavedChanges
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
            <TabsContent value="blueprint" className="h-full m-0 p-0" forceMount={true} hidden={activeTab !== 'blueprint'}>
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
                // ✨ Episode creation callback
                onEpisodeCreate={handleEpisodeCreate}
                onEpisodeUpdate={handleEpisodeUpdate}
                onEpisodeDelete={handleEpisodeDelete}
                onEpisodeSelect={handleEpisodeSelect}
                // ✅ PROFESSIONAL SOLUTION 3: ส่ง auto-save config ไปยัง BlueprintTab
                autoSaveConfig={{
                  enabled: isAutoSaveEnabled,
                  intervalSec: autoSaveIntervalSec
                }}
                // ส่งการตั้งค่าการแสดงผลจาก localStorage
                blueprintSettings={{
                  showSceneThumbnails,
                  showNodeLabels,
                  showGrid,
                  snapToGrid,
                  nodeOrientation
                }}
                onNavigateToDirector={handleNavigateToDirector}
              />
            </TabsContent>

            <TabsContent value="director" className="h-full m-0 p-0" forceMount={true} hidden={activeTab !== 'director'}>
              <DirectorTab
                novel={currentNovel}
                scenes={currentScenes}
                characters={characters}
                userMedia={userMedia}
                officialMedia={officialMedia}
                onSceneUpdate={handleSceneUpdate}
              />
            </TabsContent>

            <TabsContent value="summary" className="h-full m-0 p-0" forceMount={true} hidden={activeTab !== 'summary'}>
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
