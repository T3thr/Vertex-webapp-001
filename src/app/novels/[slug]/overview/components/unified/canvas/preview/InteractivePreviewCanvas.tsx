// src/app/novels/[slug]/overview/components/unified/canvas/preview/InteractivePreviewCanvas.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayIcon, PauseIcon, VolumeIcon, Volume2Icon } from 'lucide-react';

interface InteractivePreviewCanvasProps {
  scene: any;
  characters: any[];
  userMedia: any[];
  officialMedia: any[];
  isPlaying: boolean;
  playbackSpeed: number;
  currentPosition: number;
  onPositionChange: (position: number) => void;
}

// สถานะของ Preview
interface PreviewState {
  currentTimeMs: number;
  activeElements: Map<string, any>;
  visibleCharacters: Map<string, any>;
  currentBackground: any;
  activeChoices: any[];
  audioElements: Map<string, any>;
  isInteractive: boolean;
}

export function InteractivePreviewCanvas({
  scene,
  characters,
  userMedia,
  officialMedia,
  isPlaying,
  playbackSpeed,
  currentPosition,
  onPositionChange
}: InteractivePreviewCanvasProps) {

  // Preview State
  const [previewState, setPreviewState] = useState<PreviewState>({
    currentTimeMs: 0,
    activeElements: new Map(),
    visibleCharacters: new Map(),
    currentBackground: scene?.background || null,
    activeChoices: [],
    audioElements: new Map(),
    isInteractive: false
  });

  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [showChoices, setShowChoices] = useState(false);
  const [currentDialogue, setCurrentDialogue] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Refs
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastUpdateTimeRef = useRef<number>(0);

  // Timeline Events Processing
  const processTimelineEvents = useCallback((timeMs: number) => {
    if (!scene?.timelineTracks) return;

    const newState = { ...previewState };
    let hasChanges = false;

    // ประมวลผล Timeline Events
    scene.timelineTracks.forEach((track: any) => {
      track.events.forEach((event: any) => {
        const eventStartTime = event.startTimeMs;
        const eventEndTime = eventStartTime + (event.durationMs || 0);

        // ตรวจสอบว่า event นี้ควรทำงานหรือไม่
        if (timeMs >= eventStartTime && (event.durationMs === undefined || timeMs <= eventEndTime)) {
          
          switch (event.eventType) {
            case 'SHOW_CHARACTER':
              if (event.targetInstanceId) {
                const character = scene.characters?.find((c: any) => c.instanceId === event.targetInstanceId);
                if (character) {
                  newState.visibleCharacters.set(event.targetInstanceId, {
                    ...character,
                    ...event.parameters?.targetTransform
                  });
                  hasChanges = true;
                }
              }
              break;

            case 'HIDE_CHARACTER':
              if (event.targetInstanceId && newState.visibleCharacters.has(event.targetInstanceId)) {
                newState.visibleCharacters.delete(event.targetInstanceId);
                hasChanges = true;
              }
              break;

            case 'SHOW_TEXT_BLOCK':
              const textContent = scene.textContents?.find((t: any) => t.instanceId === event.targetInstanceId);
              if (textContent) {
                setCurrentDialogue(textContent);
                setIsTyping(true);
                hasChanges = true;
              }
              break;

            case 'HIDE_TEXT_BLOCK':
              if (currentDialogue?.instanceId === event.targetInstanceId) {
                setCurrentDialogue(null);
                setIsTyping(false);
                hasChanges = true;
              }
              break;

            case 'CHANGE_BACKGROUND':
              if (event.parameters?.newBackground) {
                newState.currentBackground = event.parameters.newBackground;
                hasChanges = true;
              }
              break;

            case 'SHOW_CHOICE_GROUP':
              const choiceGroup = scene.choiceGroupsAvailable?.find((cg: any) => cg.instanceId === event.targetInstanceId);
              if (choiceGroup) {
                newState.activeChoices = scene.choiceIds || [];
                setShowChoices(true);
                newState.isInteractive = true;
                hasChanges = true;
              }
              break;

            case 'HIDE_CHOICE_GROUP':
              newState.activeChoices = [];
              setShowChoices(false);
              newState.isInteractive = false;
              hasChanges = true;
              break;

            case 'PLAY_AUDIO':
              if (event.targetInstanceId) {
                const audioElement = scene.audios?.find((a: any) => a.instanceId === event.targetInstanceId);
                if (audioElement) {
                  newState.audioElements.set(event.targetInstanceId, {
                    ...audioElement,
                    isPlaying: true,
                    volume: event.parameters?.volume || audioElement.volume || 1
                  });
                  hasChanges = true;
                }
              }
              break;

            case 'STOP_AUDIO':
              if (event.targetInstanceId && newState.audioElements.has(event.targetInstanceId)) {
                const audio = newState.audioElements.get(event.targetInstanceId);
                newState.audioElements.set(event.targetInstanceId, {
                  ...audio,
                  isPlaying: false
                });
                hasChanges = true;
              }
              break;
          }
        }
      });
    });

    if (hasChanges) {
      setPreviewState(newState);
    }
  }, [scene, previewState, currentDialogue]);

  // Animation Loop
  const animate = useCallback((timestamp: number) => {
    if (!isPlaying) return;

    const deltaTime = timestamp - lastUpdateTimeRef.current;
    lastUpdateTimeRef.current = timestamp;

    const newTimeMs = previewState.currentTimeMs + (deltaTime * playbackSpeed);
    
    // อัปเดต Timeline Position
    onPositionChange((newTimeMs / (scene?.estimatedTimelineDurationMs || 30000)) * 100);
    
    // ประมวลผล Timeline Events
    processTimelineEvents(newTimeMs);
    
    setPreviewState(prev => ({
      ...prev,
      currentTimeMs: newTimeMs
    }));

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [isPlaying, playbackSpeed, previewState.currentTimeMs, scene, onPositionChange, processTimelineEvents]);

  // Start/Stop Animation
  useEffect(() => {
    if (isPlaying) {
      lastUpdateTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, animate]);

  // Handle Choice Selection
  const handleChoiceSelect = useCallback((choiceId: string) => {
    setSelectedChoice(choiceId);
    console.log('Choice selected:', choiceId);
    
    // จำลองการทำงานของ Choice Action
    // ในการใช้งานจริงจะเรียก API หรือ update state ตาม choice.actions
    
    // ซ่อน choices หลังจากเลือก
    setTimeout(() => {
      setShowChoices(false);
      setSelectedChoice(null);
      setPreviewState(prev => ({
        ...prev,
        activeChoices: [],
        isInteractive: false
      }));
    }, 1000);
  }, []);

  // Render Background
  const renderBackground = () => {
    const bg = previewState.currentBackground;
    if (!bg) return null;

    if (bg.type === 'color') {
      return (
        <div 
          className="absolute inset-0"
          style={{ backgroundColor: bg.value }}
        />
      );
    } else if (bg.type === 'image') {
      return (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${bg.value})` }}
        />
      );
    }
    return null;
  };

  // Render Characters
  const renderCharacters = () => {
    return Array.from(previewState.visibleCharacters.entries()).map(([instanceId, character]) => (
      <motion.div
        key={instanceId}
        className="absolute"
        style={{
          left: character.transform?.positionX || 0,
          top: character.transform?.positionY || 0,
          zIndex: character.transform?.zIndex || 1
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: character.transform?.opacity || 1, 
          scale: character.transform?.scaleX || 1 
        }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.5 }}
      >
        {/* Character Image - ในการใช้งานจริงจะดึงจาก character data */}
        <div className="w-32 h-48 bg-muted border border-border rounded-lg flex items-center justify-center">
          <span className="text-xs text-muted-foreground">Character</span>
        </div>
      </motion.div>
    ));
  };

  // Render Dialogue
  const renderDialogue = () => {
    if (!currentDialogue) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="absolute bottom-8 left-8 right-8"
      >
        <div className="bg-black/80 backdrop-blur-sm text-white rounded-lg p-4">
          {currentDialogue.speakerDisplayName && (
            <div className="text-sm font-medium text-blue-300 mb-2">
              {currentDialogue.speakerDisplayName}
            </div>
          )}
          <div className="text-base">
            {isTyping ? (
              <motion.span
                initial={{ width: 0 }}
                animate={{ width: 'auto' }}
                transition={{ duration: 2 }}
              >
                {currentDialogue.content}
              </motion.span>
            ) : (
              currentDialogue.content
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  // Render Choices
  const renderChoices = () => {
    if (!showChoices || previewState.activeChoices.length === 0) return null;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="absolute inset-0 bg-black/50 flex items-center justify-center"
      >
        <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">Choose your path</h3>
          <div className="space-y-3">
            {/* Mock choices - ในการใช้งานจริงจะดึงจาก choice data */}
            {['Choice 1', 'Choice 2', 'Choice 3'].map((choice, index) => (
              <motion.button
                key={index}
                onClick={() => handleChoiceSelect(`choice-${index}`)}
                className={`w-full p-3 text-left rounded-lg border transition-colors ${
                  selectedChoice === `choice-${index}`
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background hover:bg-muted text-foreground'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={selectedChoice !== null}
              >
                {choice}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    );
  };

  // Render Audio Controls (Debug)
  const renderAudioControls = () => {
    if (previewState.audioElements.size === 0) return null;

    return (
      <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm text-white rounded-lg p-3">
        <h4 className="text-sm font-medium mb-2 flex items-center">
          <VolumeIcon className="w-4 h-4 mr-2" />
          Audio
        </h4>
        {Array.from(previewState.audioElements.entries()).map(([instanceId, audio]) => (
          <div key={instanceId} className="text-xs mb-1 flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${audio.isPlaying ? 'bg-green-500' : 'bg-gray-500'}`} />
            <span>{audio.type}: {audio.isPlaying ? 'Playing' : 'Stopped'}</span>
            <Volume2Icon className="w-3 h-3 ml-2" />
            <span className="ml-1">{Math.round(audio.volume * 100)}%</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-black">
      {/* Background */}
      <AnimatePresence>
        {renderBackground()}
      </AnimatePresence>

      {/* Characters */}
      <AnimatePresence>
        {renderCharacters()}
      </AnimatePresence>

      {/* Visual Elements */}
      {scene?.images?.map((image: any) => (
        <motion.div
          key={image.instanceId}
          className="absolute"
          style={{
            left: image.transform?.positionX || 0,
            top: image.transform?.positionY || 0,
            zIndex: image.transform?.zIndex || 2
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: image.transform?.opacity || 1 }}
        >
          <div className="w-24 h-24 bg-muted border border-border rounded flex items-center justify-center">
            <span className="text-xs text-muted-foreground">Image</span>
          </div>
        </motion.div>
      ))}

      {/* Dialogue */}
      <AnimatePresence>
        {renderDialogue()}
      </AnimatePresence>

      {/* Choices */}
      <AnimatePresence>
        {renderChoices()}
      </AnimatePresence>

      {/* Audio Controls (Debug) */}
      {renderAudioControls()}

      {/* Preview Controls */}
      <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm text-white rounded-lg p-3">
        <div className="text-xs mb-2">
          Preview Mode
        </div>
        <div className="text-xs text-gray-300">
          Time: {Math.round(previewState.currentTimeMs / 1000)}s
        </div>
        <div className="text-xs text-gray-300">
          Speed: {playbackSpeed}x
        </div>
        {previewState.isInteractive && (
          <div className="text-xs text-blue-300 mt-1">
            Interactive
          </div>
        )}
      </div>

      {/* Click to continue hint */}
      {currentDialogue && !showChoices && (
        <motion.div
          className="absolute bottom-4 right-4 text-white/60 text-xs"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          Click to continue...
        </motion.div>
      )}
    </div>
  );
}