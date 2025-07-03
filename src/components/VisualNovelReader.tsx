"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, Volume2, VolumeX, Settings, Save, Menu } from 'lucide-react';

// Type definitions based on the models
interface Character {
  _id: string;
  name: string;
  characterCode: string;
  expressions: Array<{
    expressionId: string;
    name: string;
    mediaId: string;
    mediaSourceType: "Media" | "OfficialMedia";
  }>;
  colorTheme?: string;
}

interface DialogueText {
  id: string;
  speaker?: string;
  speakerId?: string;
  content: string;
  characterExpression?: string;
  voiceFile?: string;
}

interface Choice {
  _id: string;
  text: string;
  hoverText?: string;
  actions: Array<{
    actionId: string;
    type: string;
    parameters: any;
  }>;
  isTimedChoice?: boolean;
  timeLimitSeconds?: number;
}

interface SceneData {
  _id: string;
  title?: string;
  background: {
    type: "color" | "image" | "video";
    value: string;
  };
  characters: Array<{
    instanceId: string;
    characterId: string;
    characterData: Character;
    expressionId?: string;
    transform?: {
      positionX?: number;
      positionY?: number;
      scaleX?: number;
      scaleY?: number;
      opacity?: number;
    };
    isVisible?: boolean;
  }>;
  dialogue: DialogueText[];
  choices?: Choice[];
  nextSceneId?: string;
  audioElements?: Array<{
    instanceId: string;
    type: "background_music" | "audio_effect" | "voice_over";
    mediaId: string;
    volume?: number;
    loop?: boolean;
  }>;
}

interface VisualNovelReaderProps {
  novelSlug: string;
  episodeId: string;
  initialSceneId?: string;
}

export default function VisualNovelReader({ 
  novelSlug, 
  episodeId, 
  initialSceneId 
}: VisualNovelReaderProps) {
  const [currentScene, setCurrentScene] = useState<SceneData | null>(null);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [showChoices, setShowChoices] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [textSpeed, setTextSpeed] = useState(50);
  const [autoPlayDelay, setAutoPlayDelay] = useState(3000);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const typewriterRef = useRef<NodeJS.Timeout | null>(null);

  // Load scene data
  const loadScene = useCallback(async (sceneId?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/novels/${novelSlug}/episodes/${episodeId}/scenes/${sceneId || initialSceneId || 'first'}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to load scene');
      }
      
      const sceneData: SceneData = await response.json();
      setCurrentScene(sceneData);
      setCurrentDialogueIndex(0);
      setShowChoices(false);
      setSelectedChoice(null);
      
      // Start background music if available
      const bgMusic = sceneData.audioElements?.find(audio => audio.type === "background_music");
      if (bgMusic && audioRef.current) {
        audioRef.current.src = `/api/media/${bgMusic.mediaId}`;
        audioRef.current.volume = (bgMusic.volume || 1) * (isMuted ? 0 : 1);
        audioRef.current.loop = bgMusic.loop || false;
        audioRef.current.play().catch(console.error);
      }
      
    } catch (error) {
      console.error('Error loading scene:', error);
    } finally {
      setIsLoading(false);
    }
  }, [novelSlug, episodeId, initialSceneId, isMuted]);

  const handleNext = useCallback(() => {
    if (!currentScene) return;
    
    if (currentDialogueIndex < currentScene.dialogue.length - 1) {
      setCurrentDialogueIndex(prev => prev + 1);
    } else if (currentScene.choices && currentScene.choices.length > 0) {
      setShowChoices(true);
    } else if (currentScene.nextSceneId) {
      loadScene(currentScene.nextSceneId);
    }
  }, [currentScene, currentDialogueIndex, loadScene]);

  const handleChoiceSelect = useCallback(async (choiceIndex: number, choice: Choice) => {
    setSelectedChoice(choiceIndex);
    
    for (const action of choice.actions) {
      switch (action.type) {
        case 'GO_TO_NODE':
          if (action.parameters.targetNodeId) {
            setTimeout(() => {
              loadScene(action.parameters.targetNodeId);
            }, 1000);
          }
          break;
      }
    }
  }, [loadScene]);

  useEffect(() => {
    loadScene();
  }, [loadScene]);

  const currentDialogue = currentScene?.dialogue[currentDialogueIndex];

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        {currentScene?.background.type === "image" && (
          <Image
            src={currentScene.background.value}
            alt="Background"
            fill
            className="object-cover"
            priority
          />
        )}
      </div>

      {/* Characters */}
      <div className="absolute inset-0">
        <AnimatePresence>
          {currentScene?.characters
            .filter(char => char.isVisible !== false)
            .map((char) => {
              const expression = char.characterData.expressions[0];
              
              return (
                <motion.div
                  key={char.instanceId}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5 }}
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2"
                >
                  {expression && (
                    <Image
                      src={`/images/character/${expression.mediaId}`}
                      alt={char.characterData.name}
                      width={400}
                      height={600}
                      className="max-h-[80vh] w-auto object-contain"
                    />
                  )}
                </motion.div>
              );
            })}
        </AnimatePresence>
      </div>

      {/* Dialogue Box */}
      <div className="absolute bottom-0 left-0 right-0">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-black/80 backdrop-blur-sm border-t border-white/20 p-6"
        >
          <div className="min-h-[80px] flex items-center">
            <p className="text-lg leading-relaxed">
              {currentDialogue?.content || "Click to continue..."}
            </p>
          </div>
        </motion.div>

        {/* Choices */}
        <AnimatePresence>
          {showChoices && currentScene?.choices && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="p-6 space-y-3"
            >
              {currentScene.choices.map((choice, index) => (
                <motion.button
                  key={choice._id}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleChoiceSelect(index, choice)}
                  className="w-full text-left p-4 rounded-lg border-2 bg-white/10 border-white/30 hover:bg-white/20 hover:border-white/50 transition-all duration-200"
                >
                  <span className="text-base">{choice.text}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* UI Controls */}
      <div className="absolute top-4 right-4 flex items-center space-x-2">
        <button
          onClick={() => setIsAutoPlay(!isAutoPlay)}
          className={`p-2 rounded-full ${isAutoPlay ? 'bg-blue-600' : 'bg-white/20'} hover:bg-white/30 transition-colors`}
        >
          {isAutoPlay ? <Pause size={20} /> : <Play size={20} />}
        </button>
        
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Click to continue */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={handleNext}
        style={{ zIndex: showChoices ? -1 : 1 }}
      />

      <audio ref={audioRef} />
    </div>
  );
} 