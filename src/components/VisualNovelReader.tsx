"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  Play, Pause, SkipForward, Volume2, VolumeX, Settings, 
  Save, Menu, X, ChevronLeft, ChevronRight, Lock,
  Maximize2, Minimize2, Home, Book
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

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
    characterData?: Character; // Make optional to handle cases where character data might not be populated
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
  textContents: Array<{
    instanceId: string; 
    type: "dialogue" | "narration" | "thought_bubble" | "ui_text" | "label" | "system_message"; 
    characterId?: string; // Change from ObjectId to string
    speakerDisplayName?: string; 
    content: string; 
    voiceOverMediaId?: string; // Change from ObjectId to string
    voiceOverMediaSourceType?: "Media" | "OfficialMedia"; // Add this field
  }>; // Renamed from dialogue to textContents
  choices?: Choice[];
  defaultNextSceneId?: string; // Renamed from nextSceneId to defaultNextSceneId
  audios?: Array<{
    instanceId: string;
    type: "audio_effect" | "background_music" | "voice_over";
    mediaId: string; // Ensure this is string
    mediaSourceType?: "Media" | "OfficialMedia"; // Add this field
    volume?: number;
    loop?: boolean;
  }>;
  ending?: {
    endingType: "TRUE" | "GOOD" | "NORMAL" | "BAD" | "SECRET" | "ALTERNATE" | "JOKE";
    title: string;
    description: string;
    imageUrl?: string;
    endingId: string;
  };
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
  const router = useRouter();
  const { data: session } = useSession();
  
  // State
  const [currentScene, setCurrentScene] = useState<SceneData | null>(null);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
  const [showChoices, setShowChoices] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [textSpeed, setTextSpeed] = useState<'instant' | 'fast' | 'normal' | 'slow'>('normal');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large' | 'extra-large'>('medium');
  const [autoPlaySpeed, setAutoPlaySpeed] = useState<'slow' | 'normal' | 'fast' | 'very-fast'>('normal');
  const [hasAccess, setHasAccess] = useState(true);
  const [sceneHistory, setSceneHistory] = useState<string[]>([]);
  const [backgroundColor, setBackgroundColor] = useState<'dark' | 'sepia' | 'light'>('dark');
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check episode access
  const checkAccess = useCallback(async () => {
    try {
      const response = await fetch(`/api/novels/${novelSlug}/episodes/${episodeId}/access`);
      const data = await response.json();
      
      if (!data.access.hasAccess) {
        setHasAccess(false);
        setError(data.access.requiresLogin ? 'Please login to access this episode' : 'This episode requires purchase');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking access:', error);
      return true; // Default to allowing access if check fails
    }
  }, [novelSlug, episodeId]);

  // Load scene data
  const loadScene = useCallback(async (sceneId?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check access first
      const accessGranted = await checkAccess();
      if (!accessGranted) {
        setIsLoading(false);
        return;
      }
      
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
      
      // Add to history
      if (sceneData._id) {
        setSceneHistory(prev => [...prev, sceneData._id]);
      }
      
      // Start background music if available
      const bgMusic = sceneData.audios?.find(audio => audio.type === "background_music");
      if (bgMusic && audioRef.current) {
        const mediaUrl = bgMusic.mediaSourceType === 'OfficialMedia' 
          ? `/media/official/${bgMusic.mediaId}.mp3`
          : `/media/user/${bgMusic.mediaId}.mp3`;
        audioRef.current.src = mediaUrl;
        audioRef.current.volume = (bgMusic.volume || 1) * (isMuted ? 0 : 1);
        audioRef.current.loop = bgMusic.loop || false;
        audioRef.current.play().catch(console.error);
      }
      
    } catch (error) {
      console.error('Error loading scene:', error);
      setError('Failed to load scene. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [novelSlug, episodeId, initialSceneId, isMuted, checkAccess]);

  // Handle dialogue progression
  const handleNext = useCallback(() => {
    if (!currentScene || showChoices) return;
    
    if (currentDialogueIndex < currentScene.textContents.length - 1) {
      setCurrentDialogueIndex(prev => prev + 1);
    } else if (currentScene.choices && currentScene.choices.length > 0) {
      setShowChoices(true);
      setIsAutoPlay(false);
    } else if (currentScene.defaultNextSceneId) {
      loadScene(currentScene.defaultNextSceneId);
    } else {
      // End of episode
      router.push(`/novels/${novelSlug}`);
    }
  }, [currentScene, currentDialogueIndex, showChoices, loadScene, novelSlug, router]);

  // Handle previous dialogue
  const handlePrevious = useCallback(() => {
    if (currentDialogueIndex > 0) {
      setCurrentDialogueIndex(prev => prev - 1);
    } else if (sceneHistory.length > 1) {
      // Go to previous scene
      const previousSceneId = sceneHistory[sceneHistory.length - 2];
      setSceneHistory(prev => prev.slice(0, -1));
      loadScene(previousSceneId);
    }
  }, [currentDialogueIndex, sceneHistory, loadScene]);

  // Handle choice selection
  const handleChoiceSelect = useCallback(async (choiceIndex: number, choice: Choice) => {
    setSelectedChoice(choiceIndex);
    
    // Animate choice selection
    await new Promise(resolve => setTimeout(resolve, 500));
    
    for (const action of choice.actions) {
      switch (action.type) {
        case 'go_to_node':
        case 'GO_TO_NODE':
          if (action.parameters.targetNodeId) {
            loadScene(action.parameters.targetNodeId);
          }
          break;
        // Handle other action types as needed
      }
    }
  }, [loadScene]);

  // Handle swipe gestures for mobile
  const handleSwipe = useCallback((event: any, info: PanInfo) => {
    const swipeThreshold = 50;
    
    if (info.offset.x > swipeThreshold) {
      handlePrevious();
    } else if (info.offset.x < -swipeThreshold) {
      handleNext();
    }
  }, [handleNext, handlePrevious]);

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (showSettings || showMenu) return;
      
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          handleNext();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'Escape':
          setShowMenu(!showMenu);
          break;
        case 'f':
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleNext, handlePrevious, showSettings, showMenu]);

  // Auto-play functionality
  useEffect(() => {
    if (isAutoPlay && !showChoices) {
      autoPlayTimerRef.current = setTimeout(() => {
        handleNext();
      }, getAutoPlayDelay());
    }

    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    };
  }, [isAutoPlay, currentDialogueIndex, showChoices, autoPlaySpeed, handleNext]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Initial scene load
  useEffect(() => {
    loadScene();
  }, [loadScene]);

  // UI Configuration
  const getFontSizeClass = (): string => {
    const sizes = {
      'small': 'text-sm md:text-base lg:text-lg',
      'medium': 'text-base md:text-lg lg:text-xl',
      'large': 'text-lg md:text-xl lg:text-2xl',
      'extra-large': 'text-xl md:text-2xl lg:text-3xl'
    };
    return sizes[fontSize] || sizes.medium;
  };

  const getTextSpeed = (): number => {
    const speeds = {
      'instant': 0,
      'fast': 15,
      'normal': 30,
      'slow': 50
    };
    return speeds[textSpeed] || speeds.normal;
  };

  const getAutoPlayDelay = (): number => {
    const delays = {
      'slow': 8000,
      'normal': 5000,
      'fast': 3000,
      'very-fast': 2000
    };
    return delays[autoPlaySpeed] || delays.normal;
  };

  const getBackgroundTheme = () => {
    const themes = {
      'dark': { bg: 'bg-black', text: 'text-white', dialogueBg: 'bg-black/80' },
      'sepia': { bg: 'bg-amber-50', text: 'text-amber-900', dialogueBg: 'bg-amber-100/90' },
      'light': { bg: 'bg-gray-100', text: 'text-gray-900', dialogueBg: 'bg-white/90' }
    };
    return themes[backgroundColor] || themes.dark;
  };

  const currentDialogue = currentScene?.textContents[currentDialogueIndex];

  // Render loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">กำลังโหลด...</div>
      </div>
    );
  }

  // Render access denied state
  if (!hasAccess) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-lg p-6 md:p-8 max-w-md w-full text-center">
          <Lock className="w-16 h-16 mx-auto mb-4 text-gray-500" />
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4">
            ตอนนี้ถูกล็อค
          </h2>
          <p className="text-gray-300 mb-6">
            {error || 'คุณต้องซื้อตอนนี้เพื่อเข้าอ่าน'}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push(`/novels/${novelSlug}`)}
              className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              กลับไปหน้านิยาย
            </button>
            {!session && (
              <button
                onClick={() => router.push('/signin')}
                className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                เข้าสู่ระบบ
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      ref={containerRef}
      className="fixed inset-0 bg-black text-white overflow-hidden"
      onPan={handleSwipe}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
    >
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
        {currentScene?.background.type === "color" && (
          <div 
            className="w-full h-full"
            style={{ backgroundColor: currentScene.background.value }}
          />
        )}
      </div>

      {/* Characters */}
      <div className="absolute inset-0">
        <AnimatePresence>
          {currentScene?.characters
            .filter(char => char.isVisible !== false)
            .map((char) => {
              const expression = char.characterData?.expressions.find(
                exp => exp.expressionId === char.expressionId
              ) || char.characterData?.expressions[0];
              
              return (
                <motion.div
                  key={char.instanceId}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5 }}
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2"
                  style={{
                    transform: `translate(-50%, 0) translateX(${(char.transform?.positionX || 0) * 100}px)`,
                    opacity: char.transform?.opacity || 1
                  }}
                >
                  {expression && (
                    <div className="relative w-[200px] md:w-[300px] lg:w-[400px] h-[300px] md:h-[450px] lg:h-[600px]">
                      <Image
                        src={`/images/character/${expression.mediaId}.png`}
                        alt={char.characterData?.name || 'Character'}
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                </motion.div>
              );
            })}
        </AnimatePresence>
      </div>

      {/* Top UI Controls */}
      <div className="absolute top-0 left-0 right-0 z-20">
        <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-full bg-black/50 backdrop-blur hover:bg-white/20 transition-colors"
          >
            <Menu size={20} />
          </button>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsAutoPlay(!isAutoPlay)}
              className={`p-2 rounded-full backdrop-blur transition-colors ${
                isAutoPlay ? 'bg-blue-600 hover:bg-blue-700' : 'bg-black/50 hover:bg-white/20'
              }`}
            >
              {isAutoPlay ? <Pause size={20} /> : <Play size={20} />}
            </button>
            
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-full bg-black/50 backdrop-blur hover:bg-white/20 transition-colors"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-full bg-black/50 backdrop-blur hover:bg-white/20 transition-colors hidden md:block"
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-full bg-black/50 backdrop-blur hover:bg-white/20 transition-colors"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Dialogue Box */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-black/80 backdrop-blur-sm border-t border-white/20"
        >
          {/* Speaker Name */}
          {currentDialogue?.speakerDisplayName && (
            <div className="px-4 md:px-6 pt-4">
              <span className="inline-block px-3 py-1 bg-white/10 rounded-full text-sm">
                {currentDialogue.speakerDisplayName}
              </span>
            </div>
          )}
          
          {/* Dialogue Text */}
          <div className="p-4 md:p-6">
            <p className={`leading-relaxed ${getFontSizeClass()}`}>
              {currentDialogue?.content || "..."}
            </p>
          </div>
          
          {/* Navigation Hints */}
          <div className="flex items-center justify-between px-4 pb-2 text-xs text-gray-400">
            <span className="flex items-center space-x-1">
              <ChevronLeft size={14} />
              <span>Previous</span>
            </span>
            <span>Tap or swipe to continue</span>
            <span className="flex items-center space-x-1">
              <span>Next</span>
              <ChevronRight size={14} />
            </span>
          </div>
        </motion.div>

        {/* Choices */}
        <AnimatePresence>
          {showChoices && currentScene?.choices && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="p-4 md:p-6 space-y-3"
            >
              {currentScene.choices.map((choice, index) => (
                <motion.button
                  key={choice._id}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleChoiceSelect(index, choice)}
                  disabled={selectedChoice !== null}
                  className={`w-full text-left p-3 md:p-4 rounded-lg border-2 transition-all duration-200 ${
                    selectedChoice === index
                      ? 'bg-blue-600 border-blue-500'
                      : 'bg-white/10 border-white/30 hover:bg-white/20 hover:border-white/50'
                  } ${selectedChoice !== null && selectedChoice !== index ? 'opacity-50' : ''}`}
                >
                  <span className={getFontSizeClass()}>{choice.text}</span>
                  {choice.hoverText && (
                    <span className="block text-sm text-gray-300 mt-1">
                      {choice.hoverText}
                    </span>
                  )}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Side Menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-30"
              onClick={() => setShowMenu(false)}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-gray-900 z-40 overflow-y-auto"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Menu</h3>
                  <button
                    onClick={() => setShowMenu(false)}
                    className="p-1 rounded hover:bg-white/10"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <nav className="space-y-2">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      router.push(`/novels/${novelSlug}`);
                    }}
                    className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <Book size={20} />
                    <span>กลับไปหน้านิยาย</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      router.push('/');
                    }}
                    className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <Home size={20} />
                    <span>หน้าแรก</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      // Save progress
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <Save size={20} />
                    <span>บันทึกความคืบหน้า</span>
                  </button>
                </nav>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-30"
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-gray-900 rounded-lg z-40 overflow-hidden"
            >
              <div className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">การตั้งค่า</h3>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-1 rounded hover:bg-white/10"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-6">
                  {/* Font Size */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      ขนาดตัวอักษร
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['small', 'medium', 'large', 'extra-large'] as const).map((size) => (
                        <button
                          key={size}
                          onClick={() => setFontSize(size)}
                          className={`py-2 px-3 rounded ${
                            fontSize === size
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 hover:bg-gray-600'
                          } transition-colors`}
                        >
                          {size === 'small' ? 'เล็ก' : 
                           size === 'medium' ? 'กลาง' : 
                           size === 'large' ? 'ใหญ่' : 'ใหญ่มาก'}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Auto-play Speed */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      ความเร็วอ่านอัตโนมัติ
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['slow', 'normal', 'fast', 'very-fast'] as const).map((speed) => (
                        <button
                          key={speed}
                          onClick={() => setAutoPlaySpeed(speed)}
                          className={`py-2 px-3 rounded ${
                            autoPlaySpeed === speed
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 hover:bg-gray-600'
                          } transition-colors`}
                        >
                          {speed === 'slow' ? 'ช้า' : 
                           speed === 'normal' ? 'ปกติ' : 
                           speed === 'fast' ? 'เร็ว' : 'เร็วมาก'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Text Speed */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      ความเร็วแสดงข้อความ
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['instant', 'fast', 'normal', 'slow'] as const).map((speed) => (
                        <button
                          key={speed}
                          onClick={() => setTextSpeed(speed)}
                          className={`py-2 px-3 rounded ${
                            textSpeed === speed
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 hover:bg-gray-600'
                          } transition-colors`}
                        >
                          {speed === 'instant' ? 'ทันที' : 
                           speed === 'fast' ? 'เร็ว' : 
                           speed === 'normal' ? 'ปกติ' : 'ช้า'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Background Theme */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      ธีมพื้นหลัง
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['dark', 'sepia', 'light'] as const).map((theme) => (
                        <button
                          key={theme}
                          onClick={() => setBackgroundColor(theme)}
                          className={`py-2 px-3 rounded ${
                            backgroundColor === theme
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 hover:bg-gray-600'
                          } transition-colors`}
                        >
                          {theme === 'dark' ? 'มืด' : 
                           theme === 'sepia' ? 'ซีเปีย' : 'สว่าง'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Click areas for navigation */}
      <div className="absolute inset-0 flex z-0">
        <button
          className="flex-1 focus:outline-none"
          onClick={handlePrevious}
          aria-label="Previous"
        />
        <button
          className="flex-1 focus:outline-none"
          onClick={handleNext}
          aria-label="Next"
          disabled={showChoices}
        />
      </div>

      <audio ref={audioRef} />
    </motion.div>
  );
} 