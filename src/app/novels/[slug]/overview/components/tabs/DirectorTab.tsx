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

// Icons
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
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
  Code
} from 'lucide-react';

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

// Enhanced Timeline Event Component with drag and resize functionality
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

  // Handle mouse events for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, startTime: event.startTimeMs });
    onSelect(event);
  };

  // Handle resize mouse events
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({ x: e.clientX, duration: event.durationMs || 1000 });
  };

  // Mouse move handler (would be attached to document)
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
      style={{ left, width }}
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
      
      {/* Duration indicator */}
      <div className="absolute bottom-0 right-1 text-xs opacity-75">
        {((event.durationMs || 1000) / 1000).toFixed(1)}s
      </div>
      
      {/* Resize handle */}
      <div 
        className="absolute right-0 top-0 h-full w-2 bg-white/30 cursor-ew-resize hover:bg-white/50 transition-colors"
        onMouseDown={handleResizeMouseDown}
      />
      
      {/* Drag handle indicator */}
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
  const [timelineScale, setTimelineScale] = useState(50); // pixels per second
  const [isPreviewMaximized, setIsPreviewMaximized] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const playbackRef = useRef<NodeJS.Timeout | null>(null);

  const allMedia = useMemo(() => [...userMedia, ...officialMedia], [userMedia, officialMedia]);
  const sceneDuration = selectedScene?.estimatedTimelineDurationMs || 30000;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Director</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsInspectorOpen(true)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Preview Window */}
        <div className="lg:flex-1 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Select value={selectedScene?._id} onValueChange={(value) => {
                const scene = scenes.find(s => s._id === value);
                setSelectedScene(scene);
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select scene" />
                </SelectTrigger>
                <SelectContent>
                  {scenes.map((scene) => (
                    <SelectItem key={scene._id} value={scene._id}>
                      {scene.title || `Scene ${scene.sceneOrder}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPreviewMaximized(!isPreviewMaximized)}
              >
                {isPreviewMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isSaving}
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Preview Area */}
          <div className="flex-1 p-4">
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
              {/* Background */}
              <div className="absolute inset-0">
                {selectedScene?.background?.type === 'image' && selectedScene.background.value && (
                  <img 
                    src={selectedScene.background.value} 
                    alt="Background"
                    className="w-full h-full object-cover"
                  />
                )}
                {selectedScene?.background?.type === 'color' && (
                  <div 
                    className="w-full h-full"
                    style={{ backgroundColor: selectedScene.background.value }}
                  />
                )}
              </div>

              {/* Playback indicator */}
              <div className="absolute top-4 right-4">
                {isPlaying ? (
                  <div className="flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    LIVE
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-gray-500 text-white px-3 py-1 rounded-full text-sm">
                    <Pause className="w-3 h-3" />
                    PAUSED
                  </div>
                )}
              </div>

              {/* Timeline scrubber */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                <div 
                  className="h-full bg-red-500 transition-all duration-100"
                  style={{ width: `${(currentTime / sceneDuration) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="p-4 border-t">
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="sm" onClick={() => setCurrentTime(0)}>
                <Square className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsPlaying(!isPlaying)}>
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <div className="flex-1 max-w-md">
                <Slider
                  value={[currentTime]}
                  onValueChange={([value]) => setCurrentTime(value)}
                  max={sceneDuration}
                  min={0}
                  step={100}
                />
              </div>
              <div className="text-sm text-muted-foreground min-w-20">
                {Math.floor(currentTime / 1000)}s / {Math.floor(sceneDuration / 1000)}s
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Timeline with Professional Features */}
        <div className="lg:flex-1 border-t lg:border-t-0 lg:border-l director-timeline">
          {/* Timeline Header */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/20">
            <div className="flex items-center gap-4">
              <h3 className="font-semibold">Timeline</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Duration: {Math.floor(sceneDuration / 1000)}s</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Timeline Scale Controls */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTimelineScale(Math.max(20, timelineScale - 10))}
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-xs text-muted-foreground min-w-8 text-center">
                  {timelineScale}px/s
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTimelineScale(Math.min(200, timelineScale + 10))}
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>

              {/* Timeline Tools */}
              <Separator orientation="vertical" className="h-6" />
              <Button
                variant="outline"
                size="sm"
                title="Add Track"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                title="Timeline Settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Timeline Ruler */}
          <div className="border-b bg-background">
            <div className="h-8 relative overflow-x-auto">
              <div className="absolute inset-0 flex items-center" style={{ width: `${(sceneDuration / 1000) * timelineScale + 100}px` }}>
                {Array.from({ length: Math.ceil(sceneDuration / 1000) + 1 }).map((_, index) => (
                  <div key={index} className="flex flex-col items-start" style={{ width: `${timelineScale}px` }}>
                    <div className="text-xs text-muted-foreground font-mono">
                      {index}s
                    </div>
                    <div className="w-px h-2 bg-border" />
                    {/* Sub-divisions */}
                    {timelineScale > 50 && (
                      <div className="flex" style={{ width: `${timelineScale}px` }}>
                        {Array.from({ length: 10 }).map((_, subIndex) => (
                          <div key={subIndex} className="flex-1 flex justify-center">
                            <div className="w-px h-1 bg-border/50" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Playhead */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-lg z-20 pointer-events-none"
                  style={{ left: `${(currentTime / 1000) * timelineScale}px` }}
                >
                  <div className="absolute -top-1 -left-2 w-4 h-4 bg-red-500 rounded-full shadow-lg" />
                </div>
              </div>
            </div>
          </div>

          {/* Timeline Content */}
          <div className="flex-1 overflow-auto">
            {selectedScene?.timelineTracks?.length > 0 ? (
              <div className="relative">
                {selectedScene.timelineTracks.map((track: any, trackIndex: number) => (
                  <div key={track.trackId} className="border-b last:border-b-0 bg-background hover:bg-muted/30 transition-colors">
                    {/* Track Header */}
                    <div className="flex">
                      <div className="w-48 p-3 border-r bg-muted/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            track.trackType === 'character' ? 'bg-blue-500' :
                            track.trackType === 'audio' ? 'bg-purple-500' :
                            track.trackType === 'visual' ? 'bg-pink-500' :
                            track.trackType === 'camera' ? 'bg-cyan-500' :
                            'bg-gray-500'
                          }`} />
                          <div>
                            <h4 className="font-medium text-sm">{track.trackName}</h4>
                            <p className="text-xs text-muted-foreground capitalize">
                              {track.trackType || 'general'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            {track.isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <Settings className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Track Timeline */}
                      <div className="flex-1 relative h-16 overflow-x-auto">
                        <div className="absolute inset-0" style={{ width: `${(sceneDuration / 1000) * timelineScale + 100}px` }}>
                          {/* Track Events */}
                          {track.events?.map((event: ITimelineEvent) => (
                            <TimelineEvent
                              key={event.eventId}
                              event={event}
                              track={track}
                              scale={timelineScale}
                              onSelect={setSelectedEvent}
                              isSelected={selectedEvent?.eventId === event.eventId}
                              onUpdate={(eventId, updates) => {
                                // Handle event updates
                                console.log('Update event:', eventId, updates);
                              }}
                              onDelete={(eventId) => {
                                // Handle event deletion
                                console.log('Delete event:', eventId);
                              }}
                              onDrag={(eventId, newStartTime) => {
                                // Handle event dragging
                                console.log('Drag event:', eventId, newStartTime);
                              }}
                              onResize={(eventId, newDuration) => {
                                // Handle event resizing
                                console.log('Resize event:', eventId, newDuration);
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-muted/20 rounded-full">
                    <Clock className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-lg font-medium mb-2">No Timeline Available</p>
                    <p className="text-sm max-w-md">
                      Create timeline tracks to add visual effects, character animations, audio, and more to your scene.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Character Track
                    </Button>
                    <Button variant="outline" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Audio Track
                    </Button>
                    <Button variant="outline" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Effects Track
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Timeline Footer */}
          <div className="border-t p-2 bg-muted/10">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>Tracks: {selectedScene?.timelineTracks?.length || 0}</span>
                <span>Events: {selectedScene?.timelineTracks?.reduce((sum: number, track: any) => sum + (track.events?.length || 0), 0) || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Snap: 0.1s</span>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                  Grid
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Inspector Panel */}
        <div className="hidden lg:block w-80 border-l bg-background">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Event Inspector</h3>
          </div>
          <div className="p-4 text-center text-muted-foreground">
            <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Select an event to edit properties</p>
          </div>
        </div>
      </div>

      {/* Mobile Inspector Sheet */}
      <Sheet open={isInspectorOpen} onOpenChange={setIsInspectorOpen}>
        <SheetContent side="right" className="w-80">
          <SheetHeader>
            <SheetTitle>Event Inspector</SheetTitle>
          </SheetHeader>
          <div className="mt-4 text-center text-muted-foreground">
            <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Select an event to edit properties</p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default DirectorTab;