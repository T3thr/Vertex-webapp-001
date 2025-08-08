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
  Palette
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

// Timeline Event Component
const TimelineEvent = ({ 
  event, 
  track, 
  scale, 
  onSelect, 
  isSelected,
  onUpdate,
  onDelete 
}: {
  event: ITimelineEvent;
  track: ITimelineTrack;
  scale: number;
  onSelect: (event: ITimelineEvent) => void;
  isSelected: boolean;
  onUpdate: (eventId: string, updates: Partial<ITimelineEvent>) => void;
  onDelete: (eventId: string) => void;
}) => {
  const width = Math.max(60, (event.durationMs || 1000) / 1000 * scale);
  const left = (event.startTimeMs / 1000) * scale;

  const getEventColor = (type: TimelineEventType) => {
    switch (type) {
      case TimelineEventType.SHOW_CHARACTER: return 'bg-blue-500';
      case TimelineEventType.SHOW_TEXT_BLOCK: return 'bg-green-500';
      case TimelineEventType.PLAY_AUDIO: return 'bg-purple-500';
      case TimelineEventType.CHANGE_BACKGROUND: return 'bg-orange-500';
      case TimelineEventType.SHOW_VISUAL_ELEMENT: return 'bg-pink-500';
      case TimelineEventType.CAMERA_ZOOM: return 'bg-cyan-500';
      case TimelineEventType.SCREEN_EFFECT: return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getEventIcon = (type: TimelineEventType) => {
    switch (type) {
      case TimelineEventType.SHOW_CHARACTER: return <User className="w-3 h-3" />;
      case TimelineEventType.SHOW_TEXT_BLOCK: return <MessageSquare className="w-3 h-3" />;
      case TimelineEventType.PLAY_AUDIO: return <Volume2 className="w-3 h-3" />;
      case TimelineEventType.CHANGE_BACKGROUND: return <Image className="w-3 h-3" />;
      case TimelineEventType.SHOW_VISUAL_ELEMENT: return <Layers className="w-3 h-3" />;
      case TimelineEventType.CAMERA_ZOOM: return <Camera className="w-3 h-3" />;
      case TimelineEventType.SCREEN_EFFECT: return <Palette className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  return (
    <div
      className={`
        absolute h-8 rounded cursor-pointer border-2 flex items-center px-2 text-white text-xs
        ${getEventColor(event.eventType)}
        ${isSelected ? 'border-yellow-400 shadow-lg' : 'border-transparent'}
        hover:shadow-md transition-all duration-200
      `}
      style={{ left, width }}
      onClick={() => onSelect(event)}
    >
      <div className="flex items-center gap-1 truncate">
        {getEventIcon(event.eventType)}
        <span className="truncate">{event.eventType.replace(/_/g, ' ')}</span>
      </div>
      
      {/* Resize handles */}
      <div className="absolute right-0 top-0 h-full w-1 bg-white/30 cursor-ew-resize" />
    </div>
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

        {/* Timeline */}
        <div className="lg:flex-1 border-t lg:border-t-0 lg:border-l">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">Timeline</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTimelineScale(Math.max(20, timelineScale - 10))}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTimelineScale(Math.min(100, timelineScale + 10))}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {selectedScene?.timelineTracks?.length > 0 ? (
              <div className="p-4">
                <div className="space-y-4">
                  {selectedScene.timelineTracks.map((track: any) => (
                    <div key={track.trackId} className="border rounded-lg">
                      <div className="p-3 bg-muted/50 border-b">
                        <h4 className="font-medium">{track.trackName}</h4>
                        <p className="text-sm text-muted-foreground">{track.trackType || 'General'}</p>
                      </div>
                      <div className="p-3">
                        <div className="text-sm text-muted-foreground">
                          Events: {track.events?.length || 0}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No Timeline Available</p>
                <p className="text-sm">This scene doesn&apos;t have timeline tracks yet.</p>
                <Button className="mt-4" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Timeline Track
                </Button>
              </div>
            )}
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