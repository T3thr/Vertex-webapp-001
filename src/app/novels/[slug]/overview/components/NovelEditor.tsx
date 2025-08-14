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

// Import ระบบ Save ใหม่
import { UnifiedSaveManager, createSaveManager } from './tabs/SaveManager'
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
  
  // State สำหรับ auto-save (โหลดจาก UserSettings หรือ localStorage) - แก้ไข hydration
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(false) // เริ่มต้นด้วยค่าคงที่เพื่อป้องกัน hydration mismatch
  
  const [autoSaveIntervalSec, setAutoSaveIntervalSec] = useState<15 | 30>(30) // เริ่มต้นด้วยค่าคงที่
  
  // ใช้ Unified Save Manager แทน state แยกๆ
  const [saveManager] = useState(() => createSaveManager({
    novelSlug: novel.slug,
    autoSaveEnabled: isAutoSaveEnabled,
    autoSaveIntervalMs: autoSaveIntervalSec * 1000,
    onDirtyChange: (isDirty) => {
      // Callback เมื่อสถานะ dirty เปลี่ยน
    }
  }))
  
  const [saveState, setSaveState] = useState(saveManager.getState())
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false)
  
  // State สำหรับ Blueprint settings (โหลดจาก UserSettings หรือ localStorage) - แก้ไข hydration
  const [showSceneThumbnails, setShowSceneThumbnails] = useState(true) // เริ่มต้นด้วยค่าคงที่
  
  const [showNodeLabels, setShowNodeLabels] = useState(true) // เริ่มต้นด้วยค่าคงที่
  const [showGrid, setShowGrid] = useState(true) // เริ่มต้นด้วยค่าคงที่
  const [snapToGrid, setSnapToGrid] = useState(false) // เริ่มต้นด้วยค่าคงที่
  const [enableAnimations, setEnableAnimations] = useState(true) // เริ่มต้นด้วยค่าคงที่
  const [conflictResolutionStrategy, setConflictResolutionStrategy] = useState<'last_write_wins' | 'merge' | 'manual'>('merge') // เริ่มต้นด้วยค่าคงที่

  // ฟังก์ชั่นบันทึกการตั้งค่าไปยัง UserSettings
  const saveUserSettings = async (settings: any) => {
    try {
      console.log('Saving user settings:', settings);
      
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences: {
            visualNovelGameplay: {
              blueprintEditor: settings
            }
          }
        }),
      })

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Settings save failed:', errorData);
        throw new Error(errorData.error || 'Failed to save user settings')
      }

      const result = await response.json();
      console.log('Settings saved successfully:', result);
      
      // อัปเดต local state ด้วยค่าที่บันทึกแล้ว
      if (result.settings?.visualNovelGameplay?.blueprintEditor) {
        const savedSettings = result.settings.visualNovelGameplay.blueprintEditor;
        
        // Sync กับ local state
        if (savedSettings.autoSaveEnabled !== undefined) {
          setIsAutoSaveEnabled(savedSettings.autoSaveEnabled);
        }
        if (savedSettings.autoSaveIntervalSec !== undefined) {
          setAutoSaveIntervalSec(savedSettings.autoSaveIntervalSec);
        }
        if (savedSettings.showSceneThumbnails !== undefined) {
          setShowSceneThumbnails(savedSettings.showSceneThumbnails);
        }
        if (savedSettings.showNodeLabels !== undefined) {
          setShowNodeLabels(savedSettings.showNodeLabels);
        }
        if (savedSettings.showGrid !== undefined) {
          setShowGrid(savedSettings.showGrid);
        }
        if (savedSettings.snapToGrid !== undefined) {
          setSnapToGrid(savedSettings.snapToGrid);
        }
        if (savedSettings.enableAnimations !== undefined) {
          setEnableAnimations(savedSettings.enableAnimations);
        }
        if (savedSettings.conflictResolutionStrategy !== undefined) {
          setConflictResolutionStrategy(savedSettings.conflictResolutionStrategy);
        }
      }
      
    } catch (error) {
      console.error('Error saving user settings:', error)
      toast.error('Failed to save settings: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  // Debounced save settings function
  const debouncedSaveSettings = React.useMemo(
    () => {
      let timeoutId: NodeJS.Timeout
      return (settings: any) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => saveUserSettings(settings), 1000)
      }
    },
    []
  )

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

  // Manual save function - ใช้ Unified Save Manager
  const handleManualSave = async () => {
    if (!saveState.hasUnsavedChanges) {
      toast.info('ไม่มีการเปลี่ยนแปลงที่ต้องบันทึก')
      return
    }
    
    try {
      // รวบรวมข้อมูลจากแท็บที่เปิดอยู่
      let dataToSave = null
      
      if (activeTab === 'blueprint' && blueprintTabRef.current?.getCurrentData) {
        dataToSave = await blueprintTabRef.current.getCurrentData()
      } else if (activeTab === 'director' && directorTabRef.current?.getCurrentData) {
        dataToSave = await directorTabRef.current.getCurrentData()
      } else if (activeTab === 'summary' && summaryTabRef.current?.getCurrentData) {
        dataToSave = await summaryTabRef.current.getCurrentData()
      }
      
      if (dataToSave) {
        await saveManager.saveManual(dataToSave)
      } else {
        toast.warning('ไม่พบข้อมูลที่ต้องบันทึก')
      }
    } catch (error) {
      console.error('Error in manual save:', error)
      // Error handling จะถูกจัดการโดย SaveManager
    }
  }

  // Refs for tab components to trigger their save methods
  const blueprintTabRef = React.useRef<any>(null)
  const directorTabRef = React.useRef<any>(null)
  const summaryTabRef = React.useRef<any>(null)
  const settingsDropdownRef = React.useRef<HTMLDivElement>(null)

  // โหลดการตั้งค่าจริงหลังจาก component mount เพื่อป้องกัน hydration mismatch
  useEffect(() => {
    // โหลดค่าจาก UserSettings หรือ localStorage หลังจาก mount แล้ว
    const loadAutoSaveEnabled = () => {
      if (userSettings?.visualNovelGameplay?.blueprintEditor?.autoSaveEnabled !== undefined) {
        return userSettings.visualNovelGameplay.blueprintEditor.autoSaveEnabled;
      }
      const saved = localStorage.getItem('blueprint-auto-save-enabled');
      if (saved !== null) {
        return JSON.parse(saved);
      }
      return false; // Default
    };

    const loadAutoSaveInterval = () => {
      if (userSettings?.visualNovelGameplay?.blueprintEditor?.autoSaveIntervalSec !== undefined) {
        return userSettings.visualNovelGameplay.blueprintEditor.autoSaveIntervalSec;
      }
      const saved = localStorage.getItem('blueprint-auto-save-interval');
      if (saved !== null) {
        const interval = parseInt(saved);
        return (interval === 15 || interval === 30) ? interval : 30;
      }
      return 30;
    };

    const loadShowSceneThumbnails = () => {
      if (userSettings?.visualNovelGameplay?.blueprintEditor?.showSceneThumbnails !== undefined) {
        return userSettings.visualNovelGameplay.blueprintEditor.showSceneThumbnails;
      }
      const saved = localStorage.getItem('blueprint-show-scene-thumbnails');
      if (saved !== null) return JSON.parse(saved);
      return true;
    };

    const loadShowNodeLabels = () => {
      if (userSettings?.visualNovelGameplay?.blueprintEditor?.showNodeLabels !== undefined) {
        return userSettings.visualNovelGameplay.blueprintEditor.showNodeLabels;
      }
      const saved = localStorage.getItem('blueprint-show-node-labels');
      if (saved !== null) return JSON.parse(saved);
      return true;
    };

    const loadShowGrid = () => {
      if (userSettings?.visualNovelGameplay?.blueprintEditor?.showGrid !== undefined) {
        return userSettings.visualNovelGameplay.blueprintEditor.showGrid;
      }
      const saved = localStorage.getItem('blueprint-show-grid');
      if (saved !== null) return JSON.parse(saved);
      return true;
    };

    const loadSnapToGrid = () => {
      if (userSettings?.visualNovelGameplay?.blueprintEditor?.snapToGrid !== undefined) {
        return userSettings.visualNovelGameplay.blueprintEditor.snapToGrid;
      }
      const saved = localStorage.getItem('blueprint-snap-to-grid');
      if (saved !== null) return JSON.parse(saved);
      return false;
    };

    const loadEnableAnimations = () => {
      if (userSettings?.visualNovelGameplay?.blueprintEditor?.enableAnimations !== undefined) {
        return userSettings.visualNovelGameplay.blueprintEditor.enableAnimations;
      }
      const saved = localStorage.getItem('blueprint-enable-animations');
      if (saved !== null) return JSON.parse(saved);
      return true;
    };

    const loadConflictStrategy = () => {
      if (userSettings?.visualNovelGameplay?.blueprintEditor?.conflictResolutionStrategy !== undefined) {
        return userSettings.visualNovelGameplay.blueprintEditor.conflictResolutionStrategy;
      }
      const saved = localStorage.getItem('blueprint-conflict-resolution-strategy');
      if (saved !== null) {
        const strategy = saved.replace(/"/g, '');
        if (['last_write_wins', 'merge', 'manual'].includes(strategy)) {
          return strategy as 'last_write_wins' | 'merge' | 'manual';
        }
      }
      return 'merge';
    };

    // อัปเดตค่าทั้งหมดหลังจาก mount
    setIsAutoSaveEnabled(loadAutoSaveEnabled());
    setAutoSaveIntervalSec(loadAutoSaveInterval());
    setShowSceneThumbnails(loadShowSceneThumbnails());
    setShowNodeLabels(loadShowNodeLabels());
    setShowGrid(loadShowGrid());
    setSnapToGrid(loadSnapToGrid());
    setEnableAnimations(loadEnableAnimations());
    setConflictResolutionStrategy(loadConflictStrategy());
  }, [userSettings]);

  // Sync saveState กับ saveManager
  useEffect(() => {
    const updateSaveState = (newState: any) => setSaveState(newState)
    saveManager.updateConfig({ onStateChange: updateSaveState })
    
    return () => {
      saveManager.destroy()
    }
  }, [saveManager])

  // อัปเดต saveManager เมื่อการตั้งค่า auto-save เปลี่ยน
  useEffect(() => {
    saveManager.updateConfig({
      autoSaveEnabled: isAutoSaveEnabled,
      autoSaveIntervalMs: autoSaveIntervalSec * 1000
    })
  }, [saveManager, isAutoSaveEnabled, autoSaveIntervalSec])

  // บันทึก settings ลง localStorage เมื่อเปลี่ยนแปลง (fallback สำหรับกรณีที่ไม่มีใน UserSettings)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // บันทึกเฉพาะเมื่อไม่มีใน UserSettings
      if (userSettings?.visualNovelGameplay?.blueprintEditor?.autoSaveEnabled === undefined) {
        localStorage.setItem('blueprint-auto-save-enabled', JSON.stringify(isAutoSaveEnabled));
      }
    }
  }, [isAutoSaveEnabled, userSettings])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (userSettings?.visualNovelGameplay?.blueprintEditor?.autoSaveIntervalSec === undefined) {
        localStorage.setItem('blueprint-auto-save-interval', autoSaveIntervalSec.toString());
      }
    }
  }, [autoSaveIntervalSec, userSettings])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (userSettings?.visualNovelGameplay?.blueprintEditor?.showSceneThumbnails === undefined) {
        localStorage.setItem('blueprint-show-scene-thumbnails', JSON.stringify(showSceneThumbnails));
      }
    }
  }, [showSceneThumbnails, userSettings])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (userSettings?.visualNovelGameplay?.blueprintEditor?.showNodeLabels === undefined) {
        localStorage.setItem('blueprint-show-node-labels', JSON.stringify(showNodeLabels));
      }
    }
  }, [showNodeLabels, userSettings])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (userSettings?.visualNovelGameplay?.blueprintEditor?.showGrid === undefined) {
        localStorage.setItem('blueprint-show-grid', JSON.stringify(showGrid));
      }
    }
  }, [showGrid, userSettings])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (userSettings?.visualNovelGameplay?.blueprintEditor?.snapToGrid === undefined) {
        localStorage.setItem('blueprint-snap-to-grid', JSON.stringify(snapToGrid));
      }
    }
  }, [snapToGrid, userSettings])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (userSettings?.visualNovelGameplay?.blueprintEditor?.enableAnimations === undefined) {
        localStorage.setItem('blueprint-enable-animations', JSON.stringify(enableAnimations));
      }
    }
  }, [enableAnimations, userSettings])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (userSettings?.visualNovelGameplay?.blueprintEditor?.conflictResolutionStrategy === undefined) {
        localStorage.setItem('blueprint-conflict-resolution-strategy', JSON.stringify(conflictResolutionStrategy));
      }
    }
  }, [conflictResolutionStrategy, userSettings])

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
            disabled={saveState.isSaving || !saveState.hasUnsavedChanges}
            size="sm"
            className={`flex items-center space-x-2 ${
              saveState.hasUnsavedChanges 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <Save className="h-4 w-4" />
            <span>{saveState.hasUnsavedChanges ? 'บันทึก' : 'บันทึกแล้ว'}</span>
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
                <Card className="w-80 p-4 shadow-lg border bg-card">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Editor Settings</h4>
                      <p className="text-xs text-muted-foreground">
                        จัดการการตั้งค่าการบันทึกอัตโนมัติ
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Auto-save Toggle */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label htmlFor="auto-save" className="text-sm font-medium">
                            Auto-save
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            บันทึกการเปลี่ยนแปลงอัตโนมัติ (ค่าเริ่มต้น: ปิด)
                          </p>
                        </div>
                        <Switch
                          id="auto-save"
                          checked={isAutoSaveEnabled}
                          onCheckedChange={(checked) => {
                            setIsAutoSaveEnabled(checked)
                            debouncedSaveSettings({ 
                              ...userSettings?.visualNovelGameplay?.blueprintEditor,
                              autoSaveEnabled: checked 
                            })
                          }}
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
                              onClick={() => {
                                setAutoSaveIntervalSec(15)
                                debouncedSaveSettings({ 
                                  ...userSettings?.visualNovelGameplay?.blueprintEditor,
                                  autoSaveIntervalSec: 15 
                                })
                              }}
                              className="flex-1"
                            >
                              15 วินาที
                            </Button>
                            <Button
                              variant={autoSaveIntervalSec === 30 ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                setAutoSaveIntervalSec(30)
                                debouncedSaveSettings({ 
                                  ...userSettings?.visualNovelGameplay?.blueprintEditor,
                                  autoSaveIntervalSec: 30 
                                })
                              }}
                              className="flex-1"
                            >
                              30 วินาที
                            </Button>
                          </div>
                        </motion.div>
                      )}
                      
                      {/* Auto-save Status */}
                      <div className="pt-2 border-t border-border">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>สถานะ:</span>
                          <span className={isAutoSaveEnabled ? "text-green-600" : "text-gray-600"}>
                            {isAutoSaveEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                          </span>
                        </div>
                        {saveState.lastSaved && (
                          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                            <span>บันทึกล่าสุด:</span>
                            <span>{saveState.lastSaved.toLocaleTimeString('th-TH')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Blueprint Visualization Settings */}
                    <div className="space-y-4 pt-2 border-t border-border">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">การแสดงผล Blueprint</h4>
                        <p className="text-xs text-muted-foreground">
                          การตั้งค่าการแสดงผลในหน้า Blueprint
                        </p>
                      </div>
                      
                      {/* Scene Thumbnail Toggle */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label htmlFor="scene-thumbnails" className="text-sm font-medium">
                            ภาพพื้นหลังฉาก
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            แสดงภาพพื้นหลังของฉากบน node แทนที่จะเป็นไอคอน
                          </p>
                        </div>
                        <Switch
                          id="scene-thumbnails"
                          checked={showSceneThumbnails}
                          onCheckedChange={(checked) => {
                            setShowSceneThumbnails(checked)
                            debouncedSaveSettings({ 
                              ...userSettings?.visualNovelGameplay?.blueprintEditor,
                              showSceneThumbnails: checked 
                            })
                          }}
                        />
                      </div>
                      
                      {/* Node Labels Toggle */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label htmlFor="choice-labels" className="text-sm font-medium">
                            ป้ายชื่อ Choice
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            แสดงข้อความตัวเลือกบนเส้นเชื่อมระหว่างโหนด
                          </p>
                        </div>
                        <Switch
                          id="choice-labels"
                          checked={showNodeLabels}
                          onCheckedChange={(checked) => {
                            setShowNodeLabels(checked)
                            debouncedSaveSettings({ 
                              ...userSettings?.visualNovelGameplay?.blueprintEditor,
                              showNodeLabels: checked 
                            })
                          }}
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
                          onCheckedChange={(checked) => {
                            setShowGrid(checked)
                            debouncedSaveSettings({ 
                              ...userSettings?.visualNovelGameplay?.blueprintEditor,
                              showGrid: checked 
                            })
                          }}
                        />
                      </div>

                      {/* Advanced Blueprint Settings */}
                      <div className="space-y-4 pt-2 border-t border-border">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">การตั้งค่าขั้นสูง</h4>
                          <p className="text-xs text-muted-foreground">
                            การตั้งค่าสำหรับผู้ใช้ขั้นสูง
                          </p>
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
                            onCheckedChange={(checked) => {
                              setSnapToGrid(checked)
                              debouncedSaveSettings({ 
                                ...userSettings?.visualNovelGameplay?.blueprintEditor,
                                snapToGrid: checked 
                              })
                            }}
                          />
                        </div>

                        {/* Animations Toggle */}
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label htmlFor="enable-animations" className="text-sm font-medium">
                              เอฟเฟกต์แอนิเมชัน
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              แอนิเมชันการเคลื่อนไหวและการเปลี่ยนแปลง
                            </p>
                          </div>
                          <Switch
                            id="enable-animations"
                            checked={enableAnimations}
                            onCheckedChange={(checked) => {
                              setEnableAnimations(checked)
                              debouncedSaveSettings({ 
                                ...userSettings?.visualNovelGameplay?.blueprintEditor,
                                enableAnimations: checked 
                              })
                            }}
                          />
                        </div>

                        {/* Conflict Resolution Strategy */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">การแก้ไขข้อขัดแย้ง</Label>
                          <Select
                            value={conflictResolutionStrategy}
                            onValueChange={(value: 'last_write_wins' | 'merge' | 'manual') => {
                              setConflictResolutionStrategy(value)
                              debouncedSaveSettings({ 
                                ...userSettings?.visualNovelGameplay?.blueprintEditor,
                                conflictResolutionStrategy: value 
                              })
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="merge">รวมอัตโนมัติ (แนะนำ)</SelectItem>
                              <SelectItem value="last_write_wins">ใช้การเปลี่ยนแปลงล่าสุด</SelectItem>
                              <SelectItem value="manual">ให้ผู้ใช้เลือกเอง</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            วิธีการแก้ไขเมื่อมีการแก้ไขพร้อมกัน
                          </p>
                        </div>
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
          disabled={saveState.isSaving}
          size="sm"
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
                onDirtyChange={() => {}} // ไม่ใช้แล้วเพราะมี SaveManager จัดการ
                userSettings={userSettings}
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