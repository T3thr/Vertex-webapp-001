// src/app/novels/[slug]/overview/components/unified/mobile/MobileTimelineView.tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  PlayIcon,
  PauseIcon,
  SkipBackIcon,
  SkipForwardIcon,
  ClockIcon,
  VolumeIcon,
  UserIcon,
  MessageSquareIcon,
  ImageIcon
} from 'lucide-react';

import { EditorState } from '../UnifiedStorytellingEnvironment';
import { TimelineEventType, TimelineEvent, TimelineTrack, SerializedScene } from '@/types/novel';

interface MobileTimelineViewProps {
  scene: SerializedScene;
  editorState: EditorState;
  updateEditorState: (updates: Partial<EditorState>) => void;
}

export function MobileTimelineView({
  scene,
  editorState,
  updateEditorState
}: MobileTimelineViewProps) {

  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Mock timeline data
  const timelineTracks: TimelineTrack[] = scene?.timelineTracks || [
    {
      trackId: 'main',
      trackName: 'Main Track',
      events: [
        { 
          eventId: '1', 
          startTimeMs: 0, 
          durationMs: 2000, 
          eventType: TimelineEventType.SHOW_CHARACTER,
          parameters: {}
        },
        { 
          eventId: '2', 
          startTimeMs: 2000, 
          durationMs: 3000, 
          eventType: TimelineEventType.SHOW_TEXT_BLOCK,
          parameters: {}
        },
        { 
          eventId: '3', 
          startTimeMs: 5000, 
          durationMs: 1000, 
          eventType: TimelineEventType.PLAY_AUDIO,
          parameters: {}
        },
      ]
    }
  ];

  const totalDuration = 30000; // 30 seconds

  const getEventIcon = (eventType: TimelineEventType) => {
    switch (eventType) {
      case TimelineEventType.SHOW_CHARACTER:
      case TimelineEventType.HIDE_CHARACTER:
        return <UserIcon className="w-4 h-4" />;
      case TimelineEventType.SHOW_TEXT_BLOCK:
      case TimelineEventType.HIDE_TEXT_BLOCK:
        return <MessageSquareIcon className="w-4 h-4" />;
      case TimelineEventType.PLAY_AUDIO:
      case TimelineEventType.STOP_AUDIO:
        return <VolumeIcon className="w-4 h-4" />;
      case TimelineEventType.SHOW_VISUAL_ELEMENT:
        return <ImageIcon className="w-4 h-4" />;
      default:
        return <ClockIcon className="w-4 h-4" />;
    }
  };

  const getEventColor = (eventType: TimelineEventType) => {
    switch (eventType) {
      case TimelineEventType.SHOW_CHARACTER:
      case TimelineEventType.HIDE_CHARACTER:
        return 'bg-green-500';
      case TimelineEventType.SHOW_TEXT_BLOCK:
      case TimelineEventType.HIDE_TEXT_BLOCK:
        return 'bg-blue-500';
      case TimelineEventType.PLAY_AUDIO:
      case TimelineEventType.STOP_AUDIO:
        return 'bg-purple-500';
      case TimelineEventType.SHOW_VISUAL_ELEMENT:
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Timeline Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground mb-3">Timeline Editor</h2>
        
        {/* Playback Controls */}
        <div className="flex items-center justify-center space-x-4 mb-4">
          <button className="p-2 text-muted-foreground">
            <SkipBackIcon className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => {
              setIsPlaying(!isPlaying);
              updateEditorState({ isPlayMode: !isPlaying });
            }}
            className={`p-3 rounded-full ${
              isPlaying 
                ? 'bg-red-500 text-white' 
                : 'bg-green-500 text-white'
            }`}
          >
            {isPlaying ? (
              <PauseIcon className="w-6 h-6" />
            ) : (
              <PlayIcon className="w-6 h-6" />
            )}
          </button>
          
          <button className="p-2 text-muted-foreground">
            <SkipForwardIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Timeline Scrubber */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>0:00</span>
            <span>0:30</span>
          </div>
          <div className="relative">
            <div className="w-full h-2 bg-muted rounded-full">
              <div 
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${editorState.timelinePosition}%` }}
              />
            </div>
            <div 
              className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg"
              style={{ left: `calc(${editorState.timelinePosition}% - 8px)` }}
            />
          </div>
        </div>
      </div>

      {/* Timeline Tracks */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {timelineTracks.map((track) => (
            <div key={track.trackId} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">{track.trackName}</h3>
                <button className="text-xs text-primary">Edit</button>
              </div>
              
              {/* Track Timeline */}
              <div className="relative h-16 bg-muted/50 rounded-lg overflow-hidden">
                {/* Time Markers */}
                <div className="absolute inset-x-0 top-0 h-4 flex">
                  {Array.from({ length: 11 }, (_, i) => (
                    <div key={i} className="flex-1 border-l border-border/50 first:border-l-0">
                      <span className="text-xs text-muted-foreground ml-1">
                        {i * 3}s
                      </span>
                    </div>
                  ))}
                </div>

                {/* Events */}
                <div className="absolute inset-x-0 top-4 bottom-0">
                  {track.events.map((event) => {
                    const leftPercent = (event.startTimeMs / totalDuration) * 100;
                    const widthPercent = ((event.durationMs || 1000) / totalDuration) * 100;
                    
                    return (
                      <motion.div
                        key={event.eventId}
                        className={`absolute h-8 rounded ${getEventColor(event.eventType)} cursor-pointer`}
                        style={{
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                          top: '4px'
                        }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => console.log('Event selected:', event.eventId)}
                      >
                        <div className="flex items-center h-full px-2 text-white">
                          {getEventIcon(event.eventType)}
                          <span className="ml-2 text-xs truncate">
                            {event.eventType.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Playhead */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none"
                  style={{ left: `${editorState.timelinePosition}%` }}
                />
              </div>
            </div>
          ))}

          {/* Add Track Button */}
          <button className="w-full p-4 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
            + Add New Track
          </button>
        </div>
      </div>

      {/* Event Inspector */}
      {selectedTrack && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="border-t border-border bg-card p-4"
        >
          <h3 className="text-sm font-semibold text-foreground mb-3">Event Properties</h3>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground">Event Type</label>
              <select className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm">
                <option>SHOW_CHARACTER</option>
                <option>HIDE_CHARACTER</option>
                <option>SHOW_TEXT_BLOCK</option>
                <option>PLAY_AUDIO</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs font-medium text-foreground">Duration (ms)</label>
              <input
                type="number"
                className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
                placeholder="2000"
              />
            </div>
            
            <div className="flex space-x-2">
              <button className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm">
                Save
              </button>
              <button className="flex-1 px-3 py-2 bg-muted text-foreground rounded-md text-sm">
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
