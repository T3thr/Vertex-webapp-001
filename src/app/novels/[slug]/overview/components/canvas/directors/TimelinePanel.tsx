"use client";

import React, { useState, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward,
  Plus,
  Volume2,
  Camera,
  Users,
  Type,
  Zap
} from 'lucide-react';

interface TimelinePanelProps {
  scene: any;
  currentPosition: number;
  isPlaying: boolean;
  onSeek: (position: number) => void;
  onEventAdd: (event: any) => void;
  onEventUpdate: (eventId: string, updates: any) => void;
}

interface TimelineEvent {
  eventId: string;
  startTimeMs: number;
  durationMs: number;
  eventType: string;
  targetInstanceId?: string;
  parameters: any;
}

const TimelinePanel: React.FC<TimelinePanelProps> = ({
  scene,
  currentPosition,
  isPlaying,
  onSeek,
  onEventAdd,
  onEventUpdate
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [timelineDuration, setTimelineDuration] = useState(30000); // 30 seconds default

  // Convert scene timeline tracks to our format
  const tracks = scene?.timelineTracks || [];

  const eventTypes = [
    { id: 'SHOW_CHARACTER', label: 'Show Character', icon: Users, color: 'bg-blue-500' },
    { id: 'HIDE_CHARACTER', label: 'Hide Character', icon: Users, color: 'bg-blue-400' },
    { id: 'SHOW_TEXT_BLOCK', label: 'Show Text', icon: Type, color: 'bg-green-500' },
    { id: 'PLAY_AUDIO', label: 'Play Audio', icon: Volume2, color: 'bg-purple-500' },
    { id: 'CAMERA_ZOOM', label: 'Camera Zoom', icon: Camera, color: 'bg-orange-500' },
    { id: 'SCREEN_EFFECT', label: 'Screen Effect', icon: Zap, color: 'bg-red-500' }
  ];

  // Timeline scale (pixels per millisecond)
  const timelineScale = 0.05; // 50ms per pixel

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = x / timelineScale;
    onSeek(Math.max(0, Math.min(timelineDuration, time)));
  };

  const renderTimelineHeader = () => (
    <div className="timeline-header flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700">
      <div className="flex items-center space-x-2">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Timeline</h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {formatTime(currentPosition)} / {formatTime(timelineDuration)}
        </span>
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onSeek(0)}
          className="p-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <SkipBack className="w-4 h-4" />
        </button>
        <button
          onClick={() => onSeek(timelineDuration)}
          className="p-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <SkipForward className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-slate-300 dark:bg-slate-600" />
        <button
          onClick={() => onEventAdd({ eventType: 'SHOW_TEXT_BLOCK', startTimeMs: currentPosition })}
          className="flex items-center space-x-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
        >
          <Plus className="w-3 h-3" />
          <span>Add Event</span>
        </button>
      </div>
    </div>
  );

  const renderTimelineRuler = () => {
    const markers = [];
    const stepMs = 5000; // 5 second intervals
    
    for (let time = 0; time <= timelineDuration; time += stepMs) {
      const x = time * timelineScale;
      markers.push(
        <div
          key={time}
          className="absolute top-0 bottom-0 border-l border-slate-300 dark:border-slate-600 flex items-start"
          style={{ left: `${x}px` }}
        >
          <span className="text-xs text-slate-500 dark:text-slate-400 ml-1 mt-1">
            {formatTime(time)}
          </span>
        </div>
      );
    }

    // Playhead
    const playheadX = currentPosition * timelineScale;
    
    return (
      <div className="timeline-ruler relative h-8 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
        {markers}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
          style={{ left: `${playheadX}px` }}
        >
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 rounded-full" />
        </div>
      </div>
    );
  };

  const renderTrack = (track: any, index: number) => {
    const events = track.events || [];
    
    return (
      <div key={track.trackId} className="timeline-track border-b border-slate-200 dark:border-slate-600">
        {/* Track Header */}
        <div className="flex">
          <div className="w-48 p-3 bg-slate-50 dark:bg-slate-700 border-r border-slate-200 dark:border-slate-600 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                {track.trackName || `Track ${index + 1}`}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {events.length} events
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                className={`p-1 rounded ${
                  track.isMuted
                    ? 'text-red-500'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <Volume2 className="w-3 h-3" />
              </button>
            </div>
          </div>
          
          {/* Track Content */}
          <div className="flex-1 relative h-16 bg-white dark:bg-slate-800">
            {events.map((event: TimelineEvent) => {
              const eventType = eventTypes.find(et => et.id === event.eventType);
              const x = event.startTimeMs * timelineScale;
              const width = Math.max(20, (event.durationMs || 1000) * timelineScale);
              
              return (
                <div
                  key={event.eventId}
                  className={`absolute top-2 bottom-2 ${eventType?.color || 'bg-gray-500'} rounded cursor-pointer hover:opacity-80 transition-opacity`}
                  style={{ left: `${x}px`, width: `${width}px` }}
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="p-1 text-white text-xs font-medium truncate">
                    {eventType?.label || event.eventType}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="timeline-panel h-full flex flex-col bg-white dark:bg-slate-800">
      {renderTimelineHeader()}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderTimelineRuler()}
        
        <div 
          ref={timelineRef}
          className="flex-1 overflow-auto cursor-pointer"
          onClick={handleTimelineClick}
        >
          {tracks.length > 0 ? (
            tracks.map((track: any, index: number) => renderTrack(track, index))
          ) : (
            <div className="flex items-center justify-center h-32 text-slate-500 dark:text-slate-400">
              <div className="text-center">
                <div className="text-sm mb-2">No timeline tracks</div>
                <button
                  onClick={() => onEventAdd({ 
                    trackName: 'Main Track',
                    eventType: 'SHOW_TEXT_BLOCK', 
                    startTimeMs: 0 
                  })}
                  className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  Add First Event
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Event Properties (when event is selected) */}
      {selectedEvent && (
        <div className="border-t border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              Event Properties
            </span>
            <button
              onClick={() => setSelectedEvent(null)}
              className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              ×
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">Start Time</label>
              <input
                type="number"
                value={selectedEvent.startTimeMs}
                onChange={(e) => onEventUpdate(selectedEvent.eventId, { 
                  startTimeMs: parseInt(e.target.value) || 0 
                })}
                className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">Duration</label>
              <input
                type="number"
                value={selectedEvent.durationMs || 1000}
                onChange={(e) => onEventUpdate(selectedEvent.eventId, { 
                  durationMs: parseInt(e.target.value) || 1000 
                })}
                className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">Type</label>
              <select
                value={selectedEvent.eventType}
                onChange={(e) => onEventUpdate(selectedEvent.eventId, { 
                  eventType: e.target.value 
                })}
                className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
              >
                {eventTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelinePanel;