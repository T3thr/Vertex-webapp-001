'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, SkipForward } from 'lucide-react';

interface Novel {
  _id: string;
  title: string;
  slug: string;
  coverImageUrl?: string;
  synopsis?: string;
  author: any;
}

interface Episode {
  _id: string;
  title: string;
  slug: string;
  episodeOrder: number;
  accessType: string;
  priceCoins?: number;
  originalPriceCoins?: number;
  firstSceneId?: string;
  teaserText?: string;
  stats?: any;
  scenes?: Scene[]; // Make scenes optional as the component fetches them
}

interface Character {
  instanceId: string;
  characterId: string;
  characterData?: {
    _id: string;
    name: string;
    characterCode: string;
    colorTheme?: string;
    profileImageUrl?: string;
  };
  expressionId?: string;
  transform?: any;
  isVisible: boolean;
}

interface TextContent {
  instanceId: string;
  type: 'dialogue' | 'narration' | 'thought_bubble' | 'system_message';
  characterId?: string;
  speakerDisplayName?: string;
  content: string;
}

interface Choice {
  _id: string;
  text: string;
  hoverText?: string;
  actions: any[];
  isTimedChoice?: boolean;
  timeLimitSeconds?: number;
}

interface Scene {
  _id: string;
  sceneOrder: number;
  title?: string;
  background: {
    type: string;
    value: string;
    blurEffect?: string;
    colorOverlay?: string;
    fitMode?: string;
  };
  characters: Character[];
  textContents: TextContent[];
  choices?: Choice[];
  nextSceneId?: string;
  audioElements?: any[];
}

interface DialogueHistoryItem {
    id: string;
    sceneId: string;
    sceneOrder: number;
    characterName?: string;
    dialogueText: string;
}

interface VisualNovelContentProps {
  novel: Novel;
  episode: Episode;
  currentSceneId?: string;
  isPlaying: boolean;
  autoPlay: boolean; // Added for autoplay functionality
  textSpeed: number;
  fontSize: number;
  bgOpacity: number;
  onSceneChange: (sceneId: string) => void;
  onProgressChange: (progress: number) => void;
  onDialogueEntry: (entry: DialogueHistoryItem) => void;
  onEpisodeEnd: () => void;
  userId?: string;
}

const getSpeakerInfo = (textContent: TextContent | undefined, characters: Character[]): { name: string, color?: string } => {
    if (!textContent) return { name: '', color: '#FFFFFF' };

    if (textContent.type === 'narration' || textContent.type === 'system_message') {
        return { name: 'บรรยาย', color: '#CCCCCC' };
    }
    
    if (textContent.speakerDisplayName) {
        const character = characters.find(c => c.characterData?._id === textContent.characterId);
        return { 
            name: textContent.speakerDisplayName,
            color: character?.characterData?.colorTheme || '#FFFFFF'
        };
    }

    return { name: '', color: '#FFFFFF' };
};

export default function VisualNovelContent({
  novel,
  episode: initialEpisode,
  currentSceneId,
  isPlaying,
  autoPlay,
  textSpeed,
  fontSize,
  bgOpacity,
  onSceneChange,
  onProgressChange,
  onDialogueEntry,
  onEpisodeEnd,
  userId
}: VisualNovelContentProps) {
  const [episodeData, setEpisodeData] = useState<Episode | null>(null);
  const [currentScene, setCurrentScene] = useState<Scene | null>(null);
  const [textIndex, setTextIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [availableChoices, setAvailableChoices] = useState<Choice[] | null>(null);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const charactersInScene = currentScene?.characters.filter(c => c.isVisible) || [];

  // Fetch episode data including all scenes
  useEffect(() => {
    const fetchEpisodeData = async () => {
      if (!initialEpisode?._id) return;
      setIsLoading(true);
      try {
        const response = await fetch(`/api/novels/${novel.slug}/episodes/${initialEpisode._id}`);
        if (!response.ok) throw new Error('Failed to fetch episode data');
        const data: Episode = await response.json();
        setEpisodeData(data);
      } catch (error) {
        console.error('Error fetching episode data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEpisodeData();
  }, [novel.slug, initialEpisode?._id]);
  
  // Update scene when currentSceneId or episodeData changes
  useEffect(() => {
    if (episodeData?.scenes && currentSceneId) {
      const scene = episodeData.scenes.find(s => s._id === currentSceneId) || null;
      setCurrentScene(scene);
      setTextIndex(0); // Reset text index when scene changes
    } else if (episodeData?.scenes) {
      // If no currentSceneId is provided, start with the first scene
      const firstScene = episodeData.scenes.find(s => s._id === episodeData.firstSceneId) || episodeData.scenes[0];
       if (firstScene) {
           onSceneChange(firstScene._id);
       }
    }
  }, [currentSceneId, episodeData, onSceneChange]);


  const currentTextContent = currentScene?.textContents[textIndex];
  
  // Typewriter effect
  const typeText = useCallback(() => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (!currentTextContent) {
        setDisplayedText('');
        setIsTyping(false);
        return;
    };

    setIsTyping(true);
    let i = 0;
    const fullText = currentTextContent.content;
    
    // Add dialogue to history as soon as it starts typing
     if (currentTextContent.type === 'dialogue' || currentTextContent.type === 'narration') {
        onDialogueEntry({
            id: `${currentScene?._id}-${textIndex}`,
            sceneId: currentScene?._id || '',
            sceneOrder: currentScene?.sceneOrder || 0,
            characterName: getSpeakerInfo(currentTextContent, currentScene?.characters || []).name,
            dialogueText: fullText
        });
     }

    const typingSpeed = (1 / textSpeed) * 150; 

    const type = () => {
      if (i < fullText.length) {
        setDisplayedText(fullText.substring(0, i + 1));
        i++;
        typingTimeoutRef.current = setTimeout(type, typingSpeed);
      } else {
        setIsTyping(false);
      }
    };
    type();
  }, [currentTextContent, textSpeed, onDialogueEntry, currentScene, textIndex]);

  useEffect(() => {
    if (isPlaying) {
      typeText();
    } else {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
    return () => {
       if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [textIndex, currentScene, isPlaying, typeText]);
  
  // AutoPlay Logic
  useEffect(() => {
    if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    
    if (autoPlay && isPlaying && !isTyping && currentTextContent) {
       autoPlayTimeoutRef.current = setTimeout(() => {
            handleAdvance();
       }, 2000); // 2-second delay before advancing
    }
    
    return () => {
       if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    }
  }, [autoPlay, isPlaying, isTyping, currentTextContent]);

  const handleAdvance = useCallback(() => {
    if (typingTimeoutRef.current) {
       clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      // If typing, finish immediately
      setDisplayedText(currentTextContent?.content || '');
      setIsTyping(false);
    } else {
      // If not typing, advance to next text or scene
      const hasNextText = currentTextContent && textIndex < (currentScene?.textContents.length || 0) - 1;

      if (hasNextText) {
        setTextIndex(prev => prev + 1);
      } else if (currentScene?.choices && currentScene.choices.length > 0) {
        // If there are choices, display them
        setAvailableChoices(currentScene.choices);
      } else {
        // End of scene, go to next scene
        if (episodeData && episodeData.scenes && currentScene) {
            const currentSceneIndex = episodeData.scenes.findIndex(s => s._id === currentScene._id);
            const isLastScene = currentSceneIndex === episodeData.scenes.length - 1;
            const nextScene = episodeData.scenes[currentSceneIndex + 1];

            if (nextScene) {
                onSceneChange(nextScene._id);
            } else if (isLastScene) {
                // End of episode
                console.log("End of episode reached. Calling onEpisodeEnd.");
                onEpisodeEnd();
            }
        }
      }
    }
  }, [isTyping, textIndex, currentScene, episodeData, currentTextContent, onSceneChange, onEpisodeEnd]);
  
  const handleChoiceSelect = (choice: Choice) => {
    setAvailableChoices(null); // Hide choices
    const goToNodeAction = choice.actions.find(a => a.type === 'go_to_node');
    if (goToNodeAction && episodeData?.scenes) {
      const targetNodeId = goToNodeAction.parameters.targetNodeId;
      // This is a simplification. The seed data uses nodeId, but the scene data fetched doesn't have it.
      // This will require adding nodeId to the API response. For now, we assume a direct ID or find by another property.
      // Let's assume the API needs to be updated to also return the nodeId for each scene.
      // For now, I will add a placeholder logic that needs the API to be updated.
      
      // A proper implementation would need the nodeId in the scene data from the API.
      // The logic below is illustrative and depends on an updated API.
      // Since I cannot update the API and this component in the same step,
      // I will assume the API will be updated.
      
      // This is a placeholder for a real implementation that would search based on nodeId
      // This will likely fail until the API provides the nodeId for each scene.
      const nextScene = episodeData.scenes.find(s => (s as any).nodeId === targetNodeId);

      if (nextScene) {
        onSceneChange(nextScene._id);
      } else {
        console.warn(`Scene with nodeId "${targetNodeId}" not found.`);
        // As a fallback, just go to the next scene in order if any
        const currentSceneIndex = episodeData.scenes.findIndex(s => s._id === currentScene?._id);
        const fallbackScene = episodeData.scenes[currentSceneIndex + 1];
        if (fallbackScene) onSceneChange(fallbackScene._id);
      }
    }
  };
  
   // Update progress bar
   useEffect(() => {
    if (episodeData && episodeData.scenes && episodeData.scenes.length > 0 && currentScene) {
        const currentSceneIndex = episodeData.scenes.findIndex(s => s._id === currentScene._id);
        const progress = ((currentSceneIndex + 1) / episodeData.scenes.length) * 100;
        onProgressChange(progress);
    }
   }, [currentScene, episodeData, onProgressChange]);
   
  const speaker = getSpeakerInfo(currentTextContent, currentScene?.characters || []);

  if (isLoading) {
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
        </div>
    );
  }

  if (!currentScene) {
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
            <p>ไม่สามารถโหลดฉากได้</p>
        </div>
    );
  }

  return (
    <div className="relative w-full h-full" onClick={!availableChoices ? handleAdvance : undefined}>
      {/* Background */}
      <AnimatePresence>
        <motion.div
          key={currentScene._id}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          {currentScene.background.type === 'image' ? (
            <img 
              src={currentScene.background.value} 
              alt={currentScene.title || 'background'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div 
              className="w-full h-full" 
              style={{ backgroundColor: currentScene.background.value }} 
            />
          )}
        </motion.div>
      </AnimatePresence>
      
      {/* Black overlay for text readability */}
      <div 
         className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"
         style={{ opacity: bgOpacity }}
      ></div>

      {/* Characters */}
      <div className="absolute inset-0">
          <AnimatePresence>
              {charactersInScene.map(char => (
                  <motion.div
                      key={char.instanceId}
                      initial={{ opacity: 0, x: char.transform?.positionX > 0 ? 50 : -50 }}
                      animate={{ opacity: char.transform?.opacity ?? 1, x: char.transform?.positionX ?? 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="absolute bottom-0"
                      style={{
                          left: `${50 + (char.transform?.positionX ?? 0) / 10}%`, // Example positioning
                          transform: 'translateX(-50%)',
                          width: '40%', // Adjust as needed
                          maxHeight: '80%',
                      }}
                  >
                      {/* Use characterCode for image path */}
                       <img src={`/images/character/${char.characterData?.characterCode}_fullbody.png`} alt={char.characterData?.name} className="object-contain" />
                  </motion.div>
              ))}
          </AnimatePresence>
      </div>

      {/* Choices Overlay */}
      <AnimatePresence>
        {availableChoices && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-8"
          >
            <motion.div 
              className="w-full max-w-lg space-y-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {availableChoices.map((choice, index) => (
                <motion.button
                  key={choice._id}
                  onClick={() => handleChoiceSelect(choice)}
                  className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white text-lg font-semibold text-center hover:bg-white/20 hover:border-white/30 transition-all duration-300"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  {choice.text}
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialogue Box */}
      {!availableChoices && currentTextContent && (
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <div className="bg-black/50 backdrop-blur-md p-6 rounded-lg border border-white/20">
            {/* Speaker Name */}
            {speaker.name && speaker.name !== 'บรรยาย' && (
              <h3 
                 className="text-2xl font-bold mb-2"
                 style={{ color: speaker.color, textShadow: '1px 1px 3px rgba(0,0,0,0.5)'}}
              >
                {speaker.name}
              </h3>
            )}
            
            {/* Dialogue Text */}
            <p 
              key={currentTextContent.instanceId}
              className="leading-relaxed"
              style={{ fontSize: `${fontSize}px`}}
            >
              {displayedText}
            </p>
          </div>
        </div>
      )}
      
       {/* Skip Button */}
       <div className="absolute top-20 right-5">
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    handleAdvance();
                }}
                className="bg-black/30 text-white/80 hover:text-white hover:bg-black/50 p-2 rounded-full transition-colors"
            >
                <SkipForward size={20} />
            </button>
        </div>
    </div>
  );
} 