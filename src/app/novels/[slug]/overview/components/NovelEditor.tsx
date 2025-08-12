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
  officialMedia
}) => {
  // State สำหรับแท็บที่เลือก
  const [activeTab, setActiveTab] = useState<'blueprint' | 'director' | 'summary'>('blueprint')
  const [currentStoryMap, setCurrentStoryMap] = useState(storyMap)
  const [currentScenes, setCurrentScenes] = useState(scenes)
  const [currentEpisodes, setCurrentEpisodes] = useState(episodes)
  const [currentNovel, setCurrentNovel] = useState(novel)
  
  // State สำหรับ mobile menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // State สำหรับ auto-save
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(false)
  const [autoSaveIntervalSec, setAutoSaveIntervalSec] = useState<15 | 30>(15)
  const [isDirty, setIsDirty] = useState(false)
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false)
  
  // State สำหรับ Blueprint settings
  const [showSceneThumbnails, setShowSceneThumbnails] = useState(true)
  const [showNodeLabels, setShowNodeLabels] = useState(true)
  const [showGrid, setShowGrid] = useState(true)

  // Handlers for data updates
  const handleStoryMapUpdate = (updatedStoryMap: any) => {
    setCurrentStoryMap(updatedStoryMap)
    setLastSaved(new Date())
    toast.success('StoryMap updated successfully')
  }

  const handleSceneUpdate = async (sceneId: string, sceneData: any) => {
    try {
      setIsSaving(true)
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
      setLastSaved(new Date())
      toast.success('Scene updated successfully')
    } catch (error) {
      console.error('Error updating scene:', error)
      toast.error('Failed to update scene')
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  const handleEpisodeUpdate = async (episodeId: string, episodeData: any) => {
    try {
      setIsSaving(true)
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
      setLastSaved(new Date())
      toast.success('Episode updated successfully')
    } catch (error) {
      console.error('Error updating episode:', error)
      toast.error('Failed to update episode')
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  const handleNovelUpdate = async (novelData: any) => {
    try {
      setIsSaving(true)
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
      setLastSaved(new Date())
      toast.success('Novel updated successfully')
    } catch (error) {
      console.error('Error updating novel:', error)
      toast.error('Failed to update novel')
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  // Manual save function - triggers save for currently active tab
  const handleManualSave = async () => {
    if (!isDirty) {
      toast.info('No changes to save')
      return
    }
    
    try {
      setIsSaving(true)
      // Trigger manual save from the active tab
      if (activeTab === 'blueprint' && blueprintTabRef.current?.handleManualSave) {
        await blueprintTabRef.current.handleManualSave()
      } else if (activeTab === 'director' && directorTabRef.current?.handleManualSave) {
        await directorTabRef.current.handleManualSave()
      } else if (activeTab === 'summary' && summaryTabRef.current?.handleManualSave) {
        await summaryTabRef.current.handleManualSave()
      }
      
      setLastSaved(new Date())
      setIsDirty(false)
      toast.success('All changes saved successfully')
    } catch (error) {
      console.error('Error saving:', error)
      toast.error('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  // Refs for tab components to trigger their save methods
  const blueprintTabRef = React.useRef<any>(null)
  const directorTabRef = React.useRef<any>(null)
  const summaryTabRef = React.useRef<any>(null)
  const settingsDropdownRef = React.useRef<HTMLDivElement>(null)

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
          {/* Save Status */}
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            {isSaving && (
              <RefreshCw className="h-4 w-4 animate-spin" />
            )}
            <span>
              {lastSaved && !isSaving && `บันทึกล่าสุด ${lastSaved.toLocaleTimeString('th-TH')}`}
              {isSaving && 'กำลังบันทึก...'}
            </span>
          </div>

          {/* Manual Save */}
          <Button
            onClick={handleManualSave}
            disabled={isSaving || !isDirty}
            size="sm"
            className={`flex items-center space-x-2 ${
              isDirty 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <Save className="h-4 w-4" />
            <span>{isDirty ? 'บันทึก' : 'บันทึกแล้ว'}</span>
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
                      <div className="pt-2 border-t border-border">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>สถานะ:</span>
                          <span className={isAutoSaveEnabled ? "text-green-600" : "text-gray-600"}>
                            {isAutoSaveEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                          </span>
                        </div>
                        {lastSaved && (
                          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                            <span>บันทึกล่าสุด:</span>
                            <span>{lastSaved.toLocaleTimeString('th-TH')}</span>
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
                            แสดงข้อความตัวเลือกบนเส้นเชื่อมระหว่างโหนด
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
          disabled={isSaving}
          size="sm"
        >
          {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
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
                      {lastSaved && !isSaving && `บันทึกล่าสุด ${lastSaved.toLocaleTimeString('th-TH')}`}
                      {isSaving && 'กำลังบันทึก...'}
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
                isAutoSaveEnabled={isAutoSaveEnabled}
                autoSaveIntervalSec={autoSaveIntervalSec}
                onDirtyChange={setIsDirty}
                showSceneThumbnails={showSceneThumbnails}
                showNodeLabels={showNodeLabels}
                showGrid={showGrid}
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