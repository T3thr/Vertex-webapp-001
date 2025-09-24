// app/novels/[slug]/overview/components/tabs/DirectorTab.tsx
'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import {
  ChevronDown,
  Play,
  Undo,
  Redo,
  Menu as MenuIcon,
  Folder,
  File,
  Search,
  Plus,
  Trash2,
  Copy,
  Edit,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Settings,
  Image,
  Music,
  Video,
  User,
  MessageSquare,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  Scissors,
  Menu,
  X,
  Clock,
  Camera,
  Palette,
  Code,
  Upload,
  Download,
  Filter,
  Grid3X3,
  List,
  Monitor,
  Smartphone,
  Tablet,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2
} from 'lucide-react';

// Director Components
import CharacterManagementModal from '@/components/director/CharacterManagementModal';
import BackgroundManagementModal from '@/components/director/BackgroundManagementModal';

// Types from backend models
import { TimelineEventType, ITimelineEvent, ITimelineTrack, IScene } from '@/backend/models/Scene';

// Props interface
interface DirectorTabProps {
  novel: any;
  scenes: any[];
  characters: any[];
  userMedia: any[];
  officialMedia: any[];
  onSceneUpdate: (sceneId: string, sceneData: any) => void;
}

// Helper functions for event styling
const getEventColor = (type: TimelineEventType) => {
    switch (type) {
      case TimelineEventType.SHOW_CHARACTER: return 'bg-blue-500';
      case TimelineEventType.HIDE_CHARACTER: return 'bg-blue-400';
      case TimelineEventType.CHANGE_CHARACTER_EXPRESSION: return 'bg-blue-600';
      case TimelineEventType.MOVE_CHARACTER: return 'bg-blue-300';
      case TimelineEventType.CHARACTER_ANIMATION: return 'bg-blue-700';
      case TimelineEventType.SHOW_TEXT_BLOCK: return 'bg-green-500';
      case TimelineEventType.HIDE_TEXT_BLOCK: return 'bg-green-400';
      case TimelineEventType.UPDATE_TEXT_BLOCK: return 'bg-green-600';
      case TimelineEventType.PLAY_AUDIO: return 'bg-purple-500';
      case TimelineEventType.STOP_AUDIO: return 'bg-purple-400';
      case TimelineEventType.ADJUST_AUDIO_VOLUME: return 'bg-purple-300';
      case TimelineEventType.FADE_AUDIO_VOLUME: return 'bg-purple-600';
      case TimelineEventType.CHANGE_BACKGROUND: return 'bg-orange-500';
      case TimelineEventType.SHOW_VISUAL_ELEMENT: return 'bg-pink-500';
      case TimelineEventType.HIDE_VISUAL_ELEMENT: return 'bg-pink-400';
      case TimelineEventType.ANIMATE_VISUAL_ELEMENT: return 'bg-pink-600';
      case TimelineEventType.SHOW_VIDEO_ELEMENT: return 'bg-indigo-500';
      case TimelineEventType.HIDE_VIDEO_ELEMENT: return 'bg-indigo-400';
      case TimelineEventType.CONTROL_VIDEO: return 'bg-indigo-600';
      case TimelineEventType.CAMERA_ZOOM: return 'bg-cyan-500';
      case TimelineEventType.CAMERA_PAN: return 'bg-cyan-400';
      case TimelineEventType.CAMERA_ROTATE: return 'bg-cyan-600';
      case TimelineEventType.CAMERA_SHAKE: return 'bg-cyan-300';
      case TimelineEventType.SCREEN_EFFECT: return 'bg-red-500';
      case TimelineEventType.TRANSITION_EFFECT: return 'bg-red-400';
      case TimelineEventType.SET_VARIABLE: return 'bg-yellow-500';
      case TimelineEventType.RUN_CUSTOM_SCRIPT: return 'bg-violet-500';
      case TimelineEventType.WAIT: return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
};

const getEventIcon = (type: TimelineEventType) => {
    switch (type) {
      case TimelineEventType.SHOW_CHARACTER:
      case TimelineEventType.HIDE_CHARACTER:
      case TimelineEventType.CHANGE_CHARACTER_EXPRESSION:
      case TimelineEventType.MOVE_CHARACTER:
      case TimelineEventType.CHARACTER_ANIMATION:
        return <User className="w-3 h-3" />;
      case TimelineEventType.SHOW_TEXT_BLOCK:
      case TimelineEventType.HIDE_TEXT_BLOCK:
      case TimelineEventType.UPDATE_TEXT_BLOCK:
        return <MessageSquare className="w-3 h-3" />;
      case TimelineEventType.PLAY_AUDIO:
      case TimelineEventType.STOP_AUDIO:
      case TimelineEventType.ADJUST_AUDIO_VOLUME:
      case TimelineEventType.FADE_AUDIO_VOLUME:
        return <Volume2 className="w-3 h-3" />;
      case TimelineEventType.CHANGE_BACKGROUND:
        return <Image className="w-3 h-3" />;
      case TimelineEventType.SHOW_VISUAL_ELEMENT:
      case TimelineEventType.HIDE_VISUAL_ELEMENT:
      case TimelineEventType.ANIMATE_VISUAL_ELEMENT:
        return <Layers className="w-3 h-3" />;
      case TimelineEventType.SHOW_VIDEO_ELEMENT:
      case TimelineEventType.HIDE_VIDEO_ELEMENT:
      case TimelineEventType.CONTROL_VIDEO:
        return <Video className="w-3 h-3" />;
      case TimelineEventType.CAMERA_ZOOM:
      case TimelineEventType.CAMERA_PAN:
      case TimelineEventType.CAMERA_ROTATE:
      case TimelineEventType.CAMERA_SHAKE:
        return <Camera className="w-3 h-3" />;
      case TimelineEventType.SCREEN_EFFECT:
      case TimelineEventType.TRANSITION_EFFECT:
        return <Palette className="w-3 h-3" />;
      case TimelineEventType.SET_VARIABLE:
        return <Settings className="w-3 h-3" />;
      case TimelineEventType.RUN_CUSTOM_SCRIPT:
        return <Code className="w-3 h-3" />;
      case TimelineEventType.WAIT:
        return <Clock className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
};

// Enhanced Timeline Event Component with drag and resize functionality (for Advanced Timeline)
const TimelineEvent = ({ 
  event, 
  track, 
  scale, 
  onSelect, 
  isSelected,
  onUpdate,
  onDelete,
  onDrag,
  onResize 
}: {
  event: ITimelineEvent;
  track: ITimelineTrack;
  scale: number;
  onSelect: (event: ITimelineEvent) => void;
  isSelected: boolean;
  onUpdate: (eventId: string, updates: Partial<ITimelineEvent>) => void;
  onDelete: (eventId: string) => void;
  onDrag?: (eventId: string, newStartTime: number) => void;
  onResize?: (eventId: string, newDuration: number) => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, startTime: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, duration: 0 });

  const width = Math.max(60, (event.durationMs || 1000) / 1000 * scale);
  const left = (event.startTimeMs / 1000) * scale;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, startTime: event.startTimeMs });
    onSelect(event);
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({ x: e.clientX, duration: event.durationMs || 1000 });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && onDrag) {
        const deltaX = e.clientX - dragStart.x;
        const deltaTime = (deltaX / scale) * 1000;
        const newStartTime = Math.max(0, dragStart.startTime + deltaTime);
        onDrag(event.eventId, newStartTime);
      } else if (isResizing && onResize) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaTime = (deltaX / scale) * 1000;
        const newDuration = Math.max(100, resizeStart.duration + deltaTime);
        onResize(event.eventId, newDuration);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, scale, event.eventId, onDrag, onResize]);

  return (
    <motion.div
      className={`
        absolute h-8 rounded cursor-pointer border-2 flex items-center px-2 text-white text-xs
        ${getEventColor(event.eventType)}
        ${isSelected ? 'border-yellow-400 shadow-lg ring-2 ring-yellow-400/20' : 'border-transparent'}
        ${isDragging ? 'shadow-xl z-10' : ''}
        ${isResizing ? 'shadow-xl z-10' : ''}
        hover:shadow-md transition-all duration-200 select-none
      `}
      style={{ left, width, top: '0.5rem' }}
      onMouseDown={handleMouseDown}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      animate={{
        scale: isSelected ? 1.05 : 1,
        zIndex: isSelected ? 10 : 1
      }}
    >
      <div className="flex items-center gap-1 truncate pointer-events-none">
        {getEventIcon(event.eventType)}
        <span className="truncate font-medium">
          {event.eventType.replace(/_/g, ' ').toLowerCase()}
        </span>
      </div>
      <div className="absolute bottom-0 right-1 text-xs opacity-75">
        {((event.durationMs || 1000) / 1000).toFixed(1)}s
      </div>
      <div 
        className="absolute right-0 top-0 h-full w-2 bg-white/30 cursor-ew-resize hover:bg-white/50 transition-colors"
        onMouseDown={handleResizeMouseDown}
      />
      <div className="absolute left-1 top-1/2 transform -translate-y-1/2 w-1 h-4 bg-white/30 rounded-full" />
    </motion.div>
  );
};


// Main Director Tab Component
const DirectorTab: React.FC<DirectorTabProps> = ({
  novel,
  scenes,
  characters,
  userMedia,
  officialMedia,
  onSceneUpdate
}) => {
  const [selectedScene, setSelectedScene] = useState<any>(scenes[0] || null);
  const [selectedEvent, setSelectedEvent] = useState<ITimelineEvent | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineScale, setTimelineScale] = useState(50);
  const [isPreviewMaximized, setIsPreviewMaximized] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showGrid, setShowGrid] = useState(true);
  const playbackRef = useRef<NodeJS.Timeout | null>(null);

  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState(false);

  const [characterList, setCharacterList] = useState(characters || []);
  const [backgroundList, setBackgroundList] = useState<any[]>([]);

  const allMedia = useMemo(() => [...userMedia, ...officialMedia], [userMedia, officialMedia]);
  const sceneDuration = selectedScene?.estimatedTimelineDurationMs || 30000;

  // Character management functions
  const handleCharacterAdd = useCallback((character: any) => {
    const newCharacter = { ...character, id: `char_${Date.now()}`, createdAt: new Date().toISOString() };
    setCharacterList(prev => [...prev, newCharacter]);
  }, []);

  const handleCharacterUpdate = useCallback((id: string, updates: any) => {
    setCharacterList(prev => prev.map(char => char.id === id ? { ...char, ...updates } : char));
  }, []);

  const handleCharacterDelete = useCallback((id: string) => {
    setCharacterList(prev => prev.filter(char => char.id !== id));
  }, []);

  // Background management functions
  const handleBackgroundAdd = useCallback((background: any) => {
    const newBackground = { ...background, id: `bg_${Date.now()}`, createdAt: new Date().toISOString() };
    setBackgroundList(prev => [...prev, newBackground]);
  }, []);

  const handleBackgroundUpdate = useCallback((id: string, updates: any) => {
    setBackgroundList(prev => prev.map(bg => bg.id === id ? { ...bg, ...updates } : bg));
  }, []);

  const handleBackgroundDelete = useCallback((id: string) => {
    setBackgroundList(prev => prev.filter(bg => bg.id !== id));
  }, []);
  
  // NOTE: This is a placeholder for the tree structure.
  // In a real app, you'd likely use a recursive component.
  const SceneTree = ({ scenes, onSelectScene }: { scenes: any[], onSelectScene: (scene: any) => void }) => (
    <div className="space-y-1 text-sm">
        {scenes.map(scene => (
            <div key={scene._id} className="pl-2">
                <button 
                    onClick={() => onSelectScene(scene)} 
                    className={`flex items-center gap-2 w-full text-left p-1.5 rounded-md ${selectedScene?._id === scene._id ? 'bg-blue-100 dark:bg-blue-900/50' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                >
                    <File className="w-4 h-4 text-slate-500" />
                    <span>{`ฉากที่ ${scene.sceneOrder}: ${scene.title || 'Untitled'}`}</span>
                </button>
            </div>
        ))}
    </div>
);


  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-slate-900 font-sans">
      {/* Header Bar - Styled according to Figma */}
      <header className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
        <Button variant="outline" size="sm" className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
          กลับ
        </Button>
        <div className="text-xl font-bold text-green-500">

        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="w-8 h-8"><Play className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="w-8 h-8"><Undo className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="w-8 h-8"><Redo className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="w-8 h-8"><MenuIcon className="w-4 h-4" /></Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Tools */}
        <aside className="w-64 flex flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-3">
          <div className="flex items-center justify-between p-2 mb-2 border rounded-md">
            <span className="font-semibold">เครื่องมือ</span>
            <ChevronDown className="w-4 h-4" />
          </div>
          <Tabs defaultValue="อนิเมชัน" className="flex flex-col flex-1">
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="ทั่วไป" className="text-xs">ทั่วไป</TabsTrigger>
              <TabsTrigger value="ทรัพยากร" className="text-xs">ทรัพยากร</TabsTrigger>
              <TabsTrigger value="ข้อความ" className="text-xs">ข้อความ</TabsTrigger>
              <TabsTrigger value="อนิเมชัน" className="text-xs">อนิเมชัน</TabsTrigger>
              <TabsTrigger value="ตัวเลือก" className="text-xs">ตัวเลือก</TabsTrigger>
            </TabsList>
            <TabsContent value="ทั่วไป" className="p-1">General tools content.</TabsContent>
            <TabsContent value="ทรัพยากร" className="p-1">Assets content.</TabsContent>
            <TabsContent value="ข้อความ" className="p-1">Text tools content.</TabsContent>
            <TabsContent value="อนิเมชัน" className="p-1 mt-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Button variant="outline" className="h-auto py-2">ปรากฏ/ซ่อน</Button>
                <Button variant="outline" className="h-auto py-2">หมุน</Button>
                <Button variant="outline" className="h-auto py-2">ซูม</Button>
                <Button variant="outline" className="h-auto py-2">ฟิลเตอร์</Button>
                <Button variant="outline" className="h-auto py-2">กลับด้าน</Button>
                <Button variant="outline" className="h-auto py-2">สั่น</Button>
                <Button variant="outline" className="h-auto py-2">แฟลช</Button>
                <Button variant="outline" className="h-auto py-2">ลำดับ</Button>
              </div>
            </TabsContent>
             <TabsContent value="ตัวเลือก" className="p-1">Choices content.</TabsContent>
          </Tabs>
        </aside>

        {/* Center Panel: Main Workspace */}
        <main className="flex-1 flex flex-col p-4 bg-slate-50 dark:bg-slate-900/50">
          {/* Preview Canvas */}
          <div className="flex-1 flex items-center justify-center bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden mb-4">
            <img src="/placeholder-character.png" alt="Character Preview" className="max-h-full max-w-full object-contain" />
          </div>
          
          {/* Content Arrangement / Advanced Timeline */}
          <Tabs defaultValue="arrange" className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex-1 flex flex-col">
            <div className="flex items-center justify-between p-2 border-b border-slate-200 dark:border-slate-700">
               <TabsList className="bg-slate-100 dark:bg-slate-900">
                  <TabsTrigger value="arrange">จัดเรียงเนื้อหา</TabsTrigger>
                  <TabsTrigger value="advanced-timeline">Advanced Timeline Editor</TabsTrigger>
               </TabsList>
                <ChevronDown className="w-4 h-4 text-slate-500"/>
            </div>
           
            {/* Figma-style simple content arrangement list */}
            <TabsContent value="arrange" className="flex-1 overflow-y-auto p-2">
                <ScrollArea className="h-full">
                    <div className="space-y-2">
                        {selectedScene?.timelineTracks?.flatMap((track: any) => track.events.map((event: any) => (
                           <Card key={event.eventId} className="flex items-center p-2 justify-between">
                               <div className="flex items-center gap-2">
                                   <Menu className="w-4 h-4 cursor-grab text-slate-400" />
                                   <div className={`w-8 h-8 ${getEventColor(event.eventType)} rounded-md flex items-center justify-center`}>
                                      {getEventIcon(event.eventType)}
                                   </div>
                                   <div>
                                       <p className="text-sm font-medium">{event.eventType.replace(/_/g, ' ').toLowerCase()}</p>
                                       <p className="text-xs text-slate-500">{`on track: ${track.trackName}`}</p>
                                   </div>
                               </div>
                               <div className="flex items-center gap-2">
                                  <Badge variant="secondary">{(event.startTimeMs / 1000).toFixed(1)}s</Badge>
                                  <Badge variant="outline">{(event.durationMs / 1000).toFixed(1)}s</Badge>
                               </div>
                           </Card>
                        )))}
                        {(!selectedScene || selectedScene?.timelineTracks?.length === 0) && (
                            <div className="text-center p-8 text-slate-500">
                                <p>ไม่มีเนื้อหาในฉากนี้</p>
                                <p className="text-xs">เพิ่ม Event ใน Advanced Timeline Editor</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </TabsContent>

            {/* Original Advanced Timeline Editor (kept as a feature) */}
            <TabsContent value="advanced-timeline" className="flex-1 flex flex-col m-0">
               <div className="flex-1 flex flex-col">
                  {/* Timeline Header and Tools */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                     <div className="flex items-center gap-2">
                         <Button variant="outline" size="sm" className="gap-2 text-xs"><Plus className="w-3 h-3" /> Add Track</Button>
                         <Button variant="ghost" size="sm" className="gap-2 text-xs"><Filter className="w-3 h-3" /> Filter</Button>
                     </div>
                     <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setTimelineScale(s => Math.max(20, s - 10))}><ZoomOut className="w-4 h-4" /></Button>
                        <span className="text-xs font-mono text-slate-500 w-16 text-center">{timelineScale}px/s</span>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setTimelineScale(s => Math.min(200, s + 10))}><ZoomIn className="w-4 h-4" /></Button>
                     </div>
                  </div>
                  
                  {/* Timeline Ruler */}
                  <div className="h-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 relative overflow-x-auto flex-shrink-0">
                     <div className="absolute inset-0" style={{ width: `${(sceneDuration / 1000) * timelineScale + 100}px` }}>
                       {/* Ticks */}
                       {Array.from({ length: Math.ceil(sceneDuration / 1000) + 1 }).map((_, index) => (
                         <div key={index} className="absolute top-0 bottom-0 flex flex-col items-start justify-end" style={{ left: `${index * timelineScale}px`, width: `${timelineScale}px` }}>
                           <span className="text-xs text-slate-500">{index}s</span>
                           <div className="w-px h-2 bg-slate-300 dark:bg-slate-600" />
                         </div>
                       ))}
                       {/* Playhead */}
                       <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20" style={{ left: `${(currentTime / 1000) * timelineScale}px` }}>
                         <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-full" />
                       </div>
                     </div>
                  </div>
                  
                  {/* Timeline Content */}
                  <ScrollArea className="flex-1">
                      <div className="relative">
                          {selectedScene?.timelineTracks?.map((track: any) => (
                              <div key={track.trackId} className="flex border-b border-slate-200 dark:border-slate-700">
                                  <div className="w-32 px-2 py-2 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
                                      <p className="font-medium text-xs truncate">{track.trackName}</p>
                                      <p className="text-xs text-slate-500 capitalize">{track.trackType}</p>
                                  </div>
                                  <div className="flex-1 relative h-12">
                                      <div className="absolute inset-0" style={{ width: `${(sceneDuration / 1000) * timelineScale + 100}px` }}>
                                          {track.events?.map((event: ITimelineEvent) => (
                                              <TimelineEvent
                                                  key={event.eventId}
                                                  event={event}
                                                  track={track}
                                                  scale={timelineScale}
                                                  onSelect={setSelectedEvent}
                                                  isSelected={selectedEvent?.eventId === event.eventId}
                                                  onUpdate={() => {}}
                                                  onDelete={() => {}}
                                                  onDrag={() => {}}
                                                  onResize={() => {}}
                                              />
                                          ))}
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </ScrollArea>
                  {/* Playback Controls */}
                    <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setCurrentTime(0)}><SkipBack className="w-4 h-4" /></Button>
                                <Button variant="default" size="icon" className="w-10 h-10 rounded-full" onClick={() => setIsPlaying(!isPlaying)}>
                                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                                </Button>
                                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setCurrentTime(sceneDuration)}><SkipForward className="w-4 h-4" /></Button>
                            </div>
                            <div className="flex-1 flex items-center gap-2">
                                <span className="text-xs font-mono">{(currentTime / 1000).toFixed(2)}s</span>
                                <Slider value={[currentTime]} onValueChange={([v]) => setCurrentTime(v)} max={sceneDuration} step={100} />
                                <span className="text-xs font-mono">{(sceneDuration / 1000).toFixed(2)}s</span>
                            </div>
                        </div>
                    </div>
               </div>
            </TabsContent>
          </Tabs>
        </main>

        {/* Right Panel: Gallery, Chapters, Properties */}
        <aside className="w-80 flex flex-col bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700">
            <Tabs defaultValue="chapter" className="flex-1 flex flex-col">
                <TabsList className="grid grid-cols-3 m-2">
                    <TabsTrigger value="gallery">คลังทางการ</TabsTrigger>
                    <TabsTrigger value="chapter">Chapter</TabsTrigger>
                    <TabsTrigger value="properties">Properties</TabsTrigger>
                </TabsList>
                
                {/* Official Gallery */}
                <TabsContent value="gallery" className="flex-1 flex flex-col p-2 m-0">
                    <Button variant="outline" size="sm" className="mb-2">นำเข้า <Upload className="w-3 h-3 ml-2" /></Button>
                    <ScrollArea className="flex-1">
                        <div className="grid grid-cols-2 gap-2">
                            {officialMedia.map((media: any, index: number) => (
                                <div key={media.id || index} className="aspect-square bg-slate-200 dark:bg-slate-700 rounded-md overflow-hidden">
                                    <img src={media.url} alt={media.name} className="w-full h-full object-cover"/>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </TabsContent>
                
                {/* Chapter/Scene Tree */}
                <TabsContent value="chapter" className="flex-1 flex flex-col p-2 m-0">
                    <div className="flex items-center gap-2 p-1 mb-2 border rounded-md">
                        <Input placeholder="ค้นหา..." className="h-8 border-none focus-visible:ring-0" />
                        <Search className="w-4 h-4 text-slate-400" />
                    </div>
                    <ScrollArea className="flex-1">
                       <SceneTree scenes={scenes} onSelectScene={setSelectedScene} />
                    </ScrollArea>
                </TabsContent>

                {/* Properties Inspector (original feature) */}
                <TabsContent value="properties" className="flex-1 overflow-y-auto p-4 m-0">
                     {selectedEvent ? (
                        <div className="w-full space-y-4 text-sm">
                            <h3 className="font-semibold text-base">Event Properties</h3>
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-2">
                                <div className="flex justify-between"><span className="text-slate-500">Type:</span> <span>{selectedEvent.eventType}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Start:</span> <span>{selectedEvent.startTimeMs}ms</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Duration:</span> <span>{selectedEvent.durationMs}ms</span></div>
                            </div>
                            <div className="space-y-3">
                                <Label>Event Name</Label>
                                <Input defaultValue={selectedEvent.eventType.toLowerCase()} />
                                <Label>Description</Label>
                                <Textarea placeholder="Add a description..." rows={3} />
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="flex-1"><Copy className="w-3 h-3 mr-1" /> Copy</Button>
                                <Button variant="outline" size="sm" className="flex-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-slate-500 pt-10">
                            <Settings className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p>No event selected</p>
                            <p className="text-xs">Select an event in the Advanced Timeline Editor to see its properties.</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </aside>
      </div>

       {/* All original modals are kept */}
      <CharacterManagementModal
        isOpen={isCharacterModalOpen}
        onClose={() => setIsCharacterModalOpen(false)}
        characters={characterList}
        onCharacterAdd={handleCharacterAdd}
        onCharacterUpdate={handleCharacterUpdate}
        onCharacterDelete={handleCharacterDelete}
      />
      <BackgroundManagementModal
        isOpen={isBackgroundModalOpen}
        onClose={() => setIsBackgroundModalOpen(false)}
        backgrounds={backgroundList}
        onBackgroundAdd={handleBackgroundAdd}
        onBackgroundUpdate={handleBackgroundUpdate}
        onBackgroundDelete={handleBackgroundDelete}
      />
    </div>
  );
};

export default DirectorTab;