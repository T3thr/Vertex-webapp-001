// src/app/novels/[slug]/overview/components/unified/canvas/timeline/TimelineController.tsx
'use client';

import { forwardRef, useImperativeHandle } from 'react';

interface TimelineControllerProps {
  scene: any;
  isPlaying: boolean;
  playbackSpeed: number;
  currentPosition: number;
  onPositionChange: (position: number) => void;
  onEventSelect: (eventId: string) => void;
}

export interface TimelineControllerRef {
  seekTo: (position: number) => void;
}

export const TimelineController = forwardRef<TimelineControllerRef, TimelineControllerProps>(
  ({ scene, isPlaying, playbackSpeed, currentPosition, onPositionChange, onEventSelect }, ref) => {
    
    useImperativeHandle(ref, () => ({
      seekTo: (position: number) => {
        onPositionChange(position);
      }
    }));

    return (
      <div className="h-full p-4">
        <div className="text-center">
          <div className="text-lg font-semibold text-foreground mb-2">Timeline Controller</div>
          <div className="text-sm text-muted-foreground mb-4">
            Timeline interface will be implemented here
          </div>
          <div className="text-xs text-muted-foreground">
            Playing: {isPlaying ? 'Yes' : 'No'} | Speed: {playbackSpeed}x | Position: {currentPosition}%
          </div>
        </div>
      </div>
    );
  }
);