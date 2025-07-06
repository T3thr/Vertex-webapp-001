'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkipForward } from 'lucide-react';

// --- Refactored to use types from models ---
import type { 
    IUserSettings, 
    IUserDisplayPreferences, 
    IVisualNovelGameplayPreferences 
} from '@/backend/models/UserSettings';
import type { IScene, ICharacterInScene, ITextContent, IAudioElement, IBackgroundSetting, IConfigurableAction } from '@/backend/models/Scene';
import type { ICharacter } from '@/backend/models/Character';
import type { INovel } from '@/backend/models/Novel';
import type { IEpisode, IEpisodeStats } from '@/backend/models/Episode';
import type { IChoice, IChoiceAction, ChoiceActionType } from '@/backend/models/Choice';

// --- Local, Serialized Types for Frontend ---

// The data from the API is serialized (e.g. ObjectIds become strings)
// and populated. These types reflect the shape the component receives.

type PopulatedCharacter = Omit<ICharacterInScene, 'characterId'> & {
    characterId: string;
    characterData?: Omit<ICharacter, '_id'> & { _id: string };
};

type SerializedTextContent = Omit<ITextContent, 'characterId' | 'voiceOverMediaId'> & {
    characterId?: string;
    voiceOverMediaId?: string;
};

type SerializedChoice = Omit<IChoice, '_id'> & { _id: string };

type SerializedScene = Omit<IScene, '_id' | 'novelId' | 'episodeId' | 'characters' | 'textContents' | 'choiceIds' | 'audios' | 'defaultNextSceneId' | 'previousSceneId'> & {
    _id: string;
    novelId: string;
    episodeId: string;
    characters: PopulatedCharacter[];
    textContents: SerializedTextContent[];
    choices: SerializedChoice[];
    audios: IAudioElement[];
    defaultNextSceneId?: string;
    previousSceneId?: string;
};

type SerializedEpisode = Omit<IEpisode, '_id' | 'novelId' | 'authorId' | 'sceneIds' | 'firstSceneId' | 'nextEpisodeId' | 'previousEpisodeId'> & {
    _id: string;
    novelId: string;
    authorId: string;
    scenes?: SerializedScene[]; // Scenes are fetched and embedded client-side
    firstSceneId?: string;
    nextEpisodeId?: string;
    previousEpisodeId?: string;
};

type SerializedNovel = Omit<INovel, '_id' | 'authorId'> & {
    _id: string;
    authorId: string;
};

export interface DialogueHistoryItem {
  id: string;
  sceneId: string;
  sceneOrder: number;
  characterName?: string;
  dialogueText: string;
}

// Combine user settings into a single object for easier management
interface UserSettings {
    display: Partial<IUserDisplayPreferences>;
    gameplay: Partial<IVisualNovelGameplayPreferences>;
}

// --- Frontend-Specific Serialized Types ---
// These types should match what VisualNovelFrameReader passes down.

type DisplayNovel = Pick<INovel, 'slug' | 'title' | 'coverImageUrl' | 'synopsis'> & {
  _id: string;
  author: {
    _id: string;
    username: string;
    primaryPenName: string;
    avatarUrl: string;
  };
};

type FullEpisode = Pick<IEpisode, 'slug' | 'title' | 'episodeOrder' | 'accessType' | 'priceCoins' | 'originalPriceCoins' | 'teaserText'> & {
  _id: string;
  firstSceneId?: string;
  stats?: IEpisodeStats;
};

// This type is now for the detailed episode data fetched *within* this component
type DetailedEpisode = Omit<IEpisode, '_id' | 'novelId' | 'authorId' | 'sceneIds' | 'firstSceneId' | 'nextEpisodeId' | 'previousEpisodeId'> & {
    _id: string;
    novelId: string;
    authorId: string;
    scenes?: SerializedScene[];
    firstSceneId?: string;
    nextEpisodeId?: string;
    previousSceneId?: string;
};

interface VisualNovelContentProps {
  novel: DisplayNovel;
  episode: FullEpisode;
  currentSceneId?: string;
  isPlaying: boolean;
  userSettings: UserSettings;
  advanceTrigger: number;
  onSceneChange: (sceneId: string) => void;
  onSceneDataChange: (scene: SerializedScene | null) => void;
  onDialogueEntry: (entry: DialogueHistoryItem) => void;
  onEpisodeEnd: () => void;
}

// --- Audio Hook ---
const useAudio = (
    scene: SerializedScene | null,
    gameplaySettings: Partial<IVisualNovelGameplayPreferences>
) => {
    const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

    useEffect(() => {
        const activeAudios: Record<string, HTMLAudioElement> = {};
        const masterVolume = (gameplaySettings.masterVolume ?? 100) / 100;

        scene?.audios?.forEach(audioConfig => {
            const id = audioConfig.instanceId;
            let audio = audioRefs.current[id];
            if (!audio) {
                // This assumes a convention for media URLs.
                // In a real app, this might come from an API or a manifest.
                const mediaUrl = audioConfig.mediaSourceType === 'OfficialMedia' 
                  ? `/media/official/${audioConfig.mediaId}.mp3`
                  : `/media/user/${audioConfig.mediaId}.mp3`;
                audio = new Audio(mediaUrl); // Updated to handle media source
                audioRefs.current[id] = audio;
            }

            const specificVolume = (
              audioConfig.type === 'background_music'
                ? gameplaySettings.bgmVolume ?? 70
                : gameplaySettings.sfxVolume ?? 80
            ) / 100;

            audio.volume = masterVolume * (audioConfig.volume ?? 1) * specificVolume;
            audio.loop = audioConfig.loop ?? false;
            
            if (audioConfig.autoplayOnLoad) {
                audio.play().catch(e => console.error("Audio play failed:", e));
            }
            activeAudios[id] = audio;
        });

        // Cleanup: Stop audio from previous scenes
        Object.keys(audioRefs.current).forEach(id => {
            if (!activeAudios[id]) {
                const oldAudio = audioRefs.current[id];
                oldAudio.pause();
                oldAudio.currentTime = 0;
                delete audioRefs.current[id];
            }
        });

        // Cleanup on component unmount
        return () => {
            Object.values(audioRefs.current).forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
            });
        };

    }, [scene, gameplaySettings]);

    return audioRefs;
};


const getSpeakerInfo = (textContent: SerializedTextContent | undefined, characters: PopulatedCharacter[]): { name: string, color?: string } => {
    if (!textContent) return { name: '', color: '#FFFFFF' };

    if (textContent.type === 'narration' || textContent.type === 'system_message') {
        return { name: '', color: '#CCCCCC' };
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
  userSettings,
  advanceTrigger,
  onSceneChange,
  onSceneDataChange,
  onDialogueEntry,
  onEpisodeEnd,
}: VisualNovelContentProps) {
  const [episodeData, setEpisodeData] = useState<DetailedEpisode | null>(null);
  const [currentScene, setCurrentScene] = useState<SerializedScene | null>(null);
  const [textIndex, setTextIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [availableChoices, setAvailableChoices] = useState<SerializedChoice[] | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { gameplay: gameplaySettings, display: displaySettings } = userSettings;
  
  const audioPlayback = useAudio(currentScene, gameplaySettings);
  
  const handleImageError = (characterCode: string) => {
    if (characterCode) {
      setImageErrors(prev => ({ ...prev, [characterCode]: true }));
    }
  };
  
  const charactersInScene = currentScene?.characters.filter(c => c.isVisible) || [];

  useEffect(() => {
    const fetchEpisodeData = async () => {
      if (!initialEpisode?._id) return;
      setIsLoading(true);
      try {
        const response = await fetch(`/api/novels/${novel.slug}/episodes/${initialEpisode._id}`);
        if (!response.ok) throw new Error('Failed to fetch episode data');
        const data: DetailedEpisode = await response.json();
        setEpisodeData(data);
      } catch (error) {
        console.error('Error fetching episode data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (initialEpisode) {
        fetchEpisodeData();
    }
  }, [novel.slug, initialEpisode?._id]);
  
  useEffect(() => {
    const scene = episodeData?.scenes?.find(s => s._id === currentSceneId) ?? null;
    setCurrentScene(scene);
    onSceneDataChange(scene);
    setTextIndex(0);
    setDisplayedText('');
    setIsTyping(false);
  }, [currentSceneId, episodeData, onSceneDataChange]);


  const typeText = useCallback(() => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (!currentScene?.textContents[textIndex]) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    };

    setIsTyping(true);
    let i = 0;
    const fullText = currentScene.textContents[textIndex].content;
    
     if (currentScene.textContents[textIndex].type === 'dialogue' || currentScene.textContents[textIndex].type === 'narration') {
        onDialogueEntry({
            id: `${currentScene._id}-${textIndex}`,
            sceneId: currentScene._id || '',
            sceneOrder: currentScene.sceneOrder || 0,
            characterName: getSpeakerInfo(currentScene.textContents[textIndex], currentScene.characters || []).name,
            dialogueText: fullText
        });
     }

    const textSpeedValue = gameplaySettings.textSpeedValue ?? 50;
    const typingSpeed = 150 - (textSpeedValue * 1.4); // Convert 0-100 scale to ms delay

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
  }, [currentScene, gameplaySettings.textSpeedValue, onDialogueEntry, textIndex]);

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

  useEffect(() => {
    if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    
    if (gameplaySettings.autoPlayEnabled && isPlaying && !isTyping && currentScene?.textContents[textIndex]) {
       autoPlayTimeoutRef.current = setTimeout(() => {
            handleAdvance();
       }, gameplaySettings.autoPlayDelayMs ?? 2000);
    }
    
    return () => {
       if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    }
  }, [gameplaySettings.autoPlayEnabled, gameplaySettings.autoPlayDelayMs, isPlaying, isTyping, textIndex, currentScene]);

  const handleAdvance = useCallback(() => {
    if (typingTimeoutRef.current) {
       clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      setDisplayedText(currentScene?.textContents[textIndex]?.content || '');
      setIsTyping(false);
    } else {
      const hasNextText = textIndex < (currentScene?.textContents.length || 0) - 1;

      if (hasNextText) {
        setTextIndex(prev => prev + 1);
      } else if (currentScene?.choices && currentScene.choices.length > 0) {
        setAvailableChoices(currentScene.choices);
      } else {
        const nextSceneId = currentScene?.defaultNextSceneId;
        if (nextSceneId && episodeData?.scenes) {
            onSceneChange(nextSceneId);
        } else if (episodeData?.scenes && currentScene) {
            const currentSceneIndex = episodeData.scenes.findIndex(s => s._id === currentScene._id);
            const isLastScene = currentSceneIndex === episodeData.scenes.length - 1;
            
            if (!isLastScene) {
                const nextScene = episodeData.scenes[currentSceneIndex + 1];
                if (nextScene) onSceneChange(nextScene._id);
            } else {
                onEpisodeEnd();
            }
        }
      }
    }
  }, [isTyping, textIndex, currentScene, episodeData, onSceneChange, onEpisodeEnd]);
  
  const handleChoiceSelect = (choice: SerializedChoice) => {
    setAvailableChoices(null);
    const goToNodeAction = choice.actions.find((a: IChoiceAction) => a.type === 'go_to_node');
    
    if (goToNodeAction && episodeData?.scenes) {
      const targetNodeId = goToNodeAction.parameters.targetNodeId;
      const nextScene = episodeData.scenes.find(s => s.nodeId === targetNodeId);

      if (nextScene) {
        onSceneChange(nextScene._id);
      } else {
        console.warn(`Choice action "go_to_node" failed: Scene with node ID "${targetNodeId}" not found in this episode.`);
        // As a fallback, try to go to the default next scene if it exists
        const defaultNextSceneId = currentScene?.defaultNextSceneId;
        if (defaultNextSceneId && episodeData.scenes.some(s => s._id === defaultNextSceneId)) {
          onSceneChange(defaultNextSceneId);
        } else {
          // If no fallback, end the episode
          onEpisodeEnd();
        }
      }
    } else {
        // If no "go_to_node" action, assume it's the end or requires a different handler.
        // For now, we just end the episode.
        onEpisodeEnd();
    }
  };
  
   useEffect(() => {
    if (episodeData?.scenes && episodeData.scenes.length > 0 && currentScene) {
        const currentSceneIndex = episodeData.scenes.findIndex(s => s._id === currentScene._id);
        const progress = ((currentSceneIndex + 1) / episodeData.scenes.length) * 100;
        onSceneDataChange(currentScene);
    }
   }, [currentScene, episodeData, onSceneDataChange]);
   
  const speakerInfo = currentScene?.textContents[textIndex] ? getSpeakerInfo(currentScene.textContents[textIndex], currentScene.characters || []) : { name: '', color: undefined };
  const fontSize = displaySettings.reading?.fontSize ?? 16;
  const textBoxOpacity = (displaySettings.uiVisibility?.textBoxOpacity ?? 80) / 100;

  // Effect to handle external advance trigger
  useEffect(() => {
    if (advanceTrigger > 0) {
      handleAdvance();
    }
    // This effect should only run when the trigger value changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advanceTrigger]);

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
              className="w-full h-full object-cover" // Changed to object-cover for better fit
            />
          ) : (
            <div 
              className="w-full h-full" 
              style={{ backgroundColor: currentScene.background.value }} 
            />
          )}
        </motion.div>
      </AnimatePresence>
      
      <div 
         className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"
      ></div>

      {/* Characters */}
      <div className="absolute inset-0 z-10 overflow-hidden">
        <AnimatePresence>
          {charactersInScene.map(char => {
            const transform = char.transform ?? {};
            return (
              <motion.div
                  key={char.instanceId}
                  initial={{ opacity: 0, x: (transform.positionX ?? 0) > 0 ? '100%' : '-100%' }}
                  animate={{ 
                    opacity: transform.opacity ?? 1,
                    x: transform.positionX ?? 0,
                    y: transform.positionY ?? 0,
                    scale: transform.scaleX ?? 1,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="absolute bottom-0 h-[85%]" // Base height
                  style={{
                      width: 'auto',
                      left: '50%', // Center horizontally
                      zIndex: transform.zIndex ?? 1,
                      transform: `translateX(-50%)`, // Offset by half its own width to truly center
                  }}
              >
                   <img
                     src={
                       imageErrors[char.characterData?.characterCode || ''] || !char.characterData?.characterCode
                         ? '/images/default-avatar.png'
                         : `/images/character/${char.characterData.characterCode}_fullbody.png`
                     }
                     alt={char.characterData?.name || 'Character'}
                     className="h-full w-auto object-contain object-bottom"
                     onError={() => handleImageError(char.characterData?.characterCode || '')}
                   />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Choices Overlay */}
      <AnimatePresence>
        {availableChoices && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-8"
          >
            <motion.div 
              className="w-full max-w-lg space-y-4"
              variants={{
                  hidden: { opacity: 0 },
                  visible: {
                      opacity: 1,
                      transition: { staggerChildren: 0.1 }
                  }
              }}
              initial="hidden"
              animate="visible"
            >
              {availableChoices.map((choice) => (
                <motion.button
                  key={choice._id}
                  onClick={() => handleChoiceSelect(choice)}
                  className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white text-lg font-semibold text-center hover:bg-white/20 transition-all duration-300"
                  variants={{
                      hidden: { y: 20, opacity: 0 },
                      visible: { y: 0, opacity: 1 }
                  }}
                >
                  {choice.text}
                </motion.button>
              ))}
            </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* Dialogue Box */}
      {!availableChoices && currentScene?.textContents[textIndex] && (
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white z-30 pointer-events-none">
          <div 
            className="backdrop-blur-md p-8 rounded-lg border border-white/20 min-h-[220px] flex flex-col justify-center"
            style={{ 
              backgroundColor: `rgba(0, 0, 0, ${textBoxOpacity * 0.6})`,
              transition: 'background-color 0.3s'
            }}
          >
            {/* Speaker Name */}
            {speakerInfo.name && (
              <h3 
                 className="text-3xl font-bold mb-3"
                 style={{ color: speakerInfo.color, textShadow: '1px 1px 3px rgba(0,0,0,0.5)'}}
              >
                {speakerInfo.name}
              </h3>
            )}
            
            <p 
              key={currentScene.textContents[textIndex].instanceId}
              className="leading-relaxed text-xl"
              style={{ fontSize: `${fontSize}px`}}
            >
              {displayedText}
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 