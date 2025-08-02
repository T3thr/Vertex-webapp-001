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
import type { IScene, ICharacterInScene, ITextContent, IAudioElement, IBackgroundSetting, IConfigurableAction, ISceneEnding } from '@/backend/models/Scene';
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
    ending?: ISceneEnding;
    sceneTransitionOut?: {
        type: string;
        durationSeconds?: number;
        parameters?: any;
    };
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

type DisplayNovel = Pick<INovel, 'slug' | 'title' | 'coverImageUrl' | 'synopsis' | 'endingType' | 'isCompleted' | 'totalEpisodesCount'> & {
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
export type DetailedEpisode = Omit<IEpisode, '_id' | 'novelId' | 'authorId' | 'sceneIds' | 'firstSceneId' | 'nextEpisodeId' | 'previousEpisodeId'> & {
    _id: string;
    novelId: string;
    authorId: string;
    scenes?: SerializedScene[];
    firstSceneId?: string;
    nextEpisodeId?: string;
    previousEpisodeId?: string;
    storyMap?: {
        _id: string;
        nodes: any[];
        edges: any[];
        storyVariables: any[];
        startNodeId: string;
    } | null;
    novelMeta?: {
        endingType: string;
        isCompleted: boolean;
        totalEpisodesCount: number;
    };
};

interface VisualNovelContentProps {
  novel: DisplayNovel;
  episodeData: DetailedEpisode | null;
  currentSceneId?: string;
  isPlaying: boolean;
  userSettings: UserSettings;
  isDialogueVisible: boolean;
  advanceTrigger: number;
  onSceneChange: (sceneId: string) => void;
  onSceneDataChange: (scene: SerializedScene | null) => void;
  onDialogueEntry: (entry: DialogueHistoryItem) => void;
  onEpisodeEnd: (ending?: ISceneEnding) => void;
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

// Optimized background renderer component to avoid re-renders
const BackgroundRenderer = ({ background, title }: { background?: any, title?: string }) => {
  if (!background) return null;
  
  if (background.type === 'image') {
    return (
      <div
        className="w-full h-full vn-background"
        style={{ backgroundImage: `url(${background.value})` }}
        aria-label={title || 'background'}
      />
    );
  }
  
  return (
    <div 
      className="w-full h-full" 
      style={{ backgroundColor: background.value }} 
    />
  );
};

function VisualNovelContent({
  novel,
  episodeData,
  currentSceneId,
  isPlaying,
  userSettings,
  isDialogueVisible,
  advanceTrigger,
  onSceneChange,
  onSceneDataChange,
  onDialogueEntry,
  onEpisodeEnd,
}: VisualNovelContentProps) {
  const [currentScene, setCurrentScene] = useState<SerializedScene | null>(null);
  const [previousScene, setPreviousScene] = useState<SerializedScene | null>(null);
  const [currentBackground, setCurrentBackground] = useState<string | null>(null);
  const [shouldTransition, setShouldTransition] = useState(false);
  const [textIndex, setTextIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
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
    const scene = episodeData?.scenes?.find(s => s._id === currentSceneId) ?? null;
    if (scene) {
      const newBackground = scene.background.value;
      
      // Optimize transition logic - avoid unnecessary state updates
      let shouldUseTransition = false;
      
      // Only check transition if we have a current scene (not the first scene)
      if (currentScene && scene && currentScene._id !== scene._id) {
        const transitionType = currentScene.sceneTransitionOut?.type;
        
        // Performance optimization: 'none' means instant transition (no animation)
        // 'fade' or other types mean animated transition
        shouldUseTransition = transitionType !== 'none';
      }
      
      // Only update transition state if it actually changed
      if (shouldUseTransition !== shouldTransition) {
        setShouldTransition(shouldUseTransition);
      }
      
      // Only update background if it actually changed
      if (newBackground !== currentBackground) {
        setCurrentBackground(newBackground);
      }
      
      setPreviousScene(currentScene);
      setCurrentScene(scene);
    }
    
    onSceneDataChange(scene);
    setTextIndex(0);
    setDisplayedText('');
    setIsTyping(false);
    setAvailableChoices(null);
  }, [currentSceneId, episodeData, onSceneDataChange, currentScene, shouldTransition, currentBackground]);


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

  // Move handleAdvance definition above auto-play effect to avoid TDZ error
  const handleAdvance = useCallback(() => {
    if (typingTimeoutRef.current) {
       clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      // If user clicks while typing, reveal the full text instantly.
      setDisplayedText(currentScene?.textContents[textIndex]?.content || '');
      setIsTyping(false);
    } else {
      // If text is fully displayed, advance to the next part of the scene.
      if (!currentScene) return;

      // Check if there is more text content in the current scene object.
      const hasNextText = textIndex < (currentScene.textContents.length - 1);
      if (hasNextText) {
        setTextIndex(prev => prev + 1);
        return;
      }

      // End of all text for the current scene. Determine what's next.
      // 1. Priority: If there's a default next scene, go to it immediately.
      if (currentScene.defaultNextSceneId) {
        onSceneChange(currentScene.defaultNextSceneId);
        return;
      }

      // 2. If there are choices, display them and wait for the user.
      if (currentScene.choices && currentScene.choices.length > 0) {
        setAvailableChoices(currentScene.choices);
        return;
      }

      // 3. If it's an explicit ending scene, end the episode.
      if (currentScene.ending) {
        onEpisodeEnd(currentScene.ending);
        return;
      }

      // 4. For SINGLE_ENDING novels, check if this is the last scene of the final episode
      // Use optimized novel metadata from episode data when available
      const novelMeta = episodeData?.novelMeta || novel;
      if (novelMeta.endingType === 'single_ending' && novelMeta.isCompleted) {
        // Check if this is the final episode and final scene
        const isLastEpisode = episodeData?.episodeOrder === novelMeta.totalEpisodesCount;
        const isLastScene = episodeData?.scenes && currentScene.sceneOrder === episodeData.scenes.length;
        
        if (isLastEpisode && isLastScene) {
          // Generate a default ending for single ending novels
          const defaultEnding = {
            endingType: 'NORMAL' as const,
            title: 'จบบทเรื่องราว',
            description: 'ขอบคุณที่ติดตามเรื่องราวจนจบ',
            endingId: `${novel.slug}_single_ending`
          };
          onEpisodeEnd(defaultEnding);
          return;
        }
      }

      // 5. Fallback: If none of the above, the episode ends.
      onEpisodeEnd();
    }
  }, [isTyping, textIndex, currentScene, onSceneChange, onEpisodeEnd, novel, episodeData]);

  const handleChoiceSelect = (choice: SerializedChoice) => {
    setAvailableChoices(null); // Hide choices after selection
    
    // หา action ที่เป็น GO_TO_NODE หรือ END_NOVEL_BRANCH
    const goToNodeAction = choice.actions.find((a: IChoiceAction) => a.type === 'go_to_node');
    const endBranchAction = choice.actions.find((a: IChoiceAction) => a.type === 'end_novel_branch');

    if (goToNodeAction) {
      const targetNodeId = goToNodeAction.parameters.targetNodeId;
      
      // ใช้ StoryMap เพื่อหา scene ที่ควรไปต่อ
      if (episodeData?.storyMap && episodeData?.scenes) {
        // หา node ใน StoryMap ที่ตรงกับ targetNodeId
        const targetNode = episodeData.storyMap.nodes.find(node => node.nodeId === targetNodeId);
        
        if (targetNode) {
          if (targetNode.nodeType === 'scene_node' && targetNode.nodeSpecificData?.sceneId) {
            // หา scene ที่ตรงกับ sceneId ใน nodeSpecificData
            const nextScene = episodeData.scenes.find(s => s.nodeId === targetNode.nodeSpecificData.sceneId);
            if (nextScene) {
              onSceneChange(nextScene._id);
              return;
            }
          } else if (targetNode.nodeType === 'ending_node') {
            // หากเป็น ending node ให้จบ episode ด้วยข้อมูลจาก node
            const endingData = {
              endingType: 'NORMAL' as const,
              title: targetNode.nodeSpecificData?.endingTitle || targetNode.title || 'จบ',
              description: targetNode.nodeSpecificData?.outcomeDescription || 'เรื่องจบลงแล้ว',
              endingId: targetNode.nodeId,
            };
            onEpisodeEnd(endingData);
            return;
          }
        }
      }
      
      // Fallback: ใช้วิธีเก่า
      const nextScene = episodeData?.scenes?.find(s => s.nodeId === targetNodeId);
      if (nextScene) {
        onSceneChange(nextScene._id);
      } else {
        console.warn(`Choice action "go_to_node" failed: Scene with node ID "${targetNodeId}" not found.`);
        onEpisodeEnd(currentScene?.ending);
      }
    } else if (endBranchAction) {
      // จัดการ ending จาก choice action
      const endingData = {
        endingType: endBranchAction.parameters.endingType || 'NORMAL',
        title: endBranchAction.parameters.endingTitle || 'จบ',
        description: endBranchAction.parameters.outcomeDescription || 'เรื่องจบลงแล้ว',
        endingId: endBranchAction.parameters.endingNodeId || 'ending',
      };
      onEpisodeEnd(endingData);
    } else {
      console.log('Selected choice has no valid action.');
      // ถ้าไม่มี action ที่รู้จัก ให้จบ episode
      onEpisodeEnd(currentScene?.ending);
    }
  };

  useEffect(() => {
    if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    
    if (gameplaySettings.autoPlayEnabled && isPlaying && !isTyping && !availableChoices && currentScene?.textContents[textIndex]) {
       autoPlayTimeoutRef.current = setTimeout(() => {
            handleAdvance();
       }, gameplaySettings.autoPlayDelayMs ?? 2000);
    }
    
    return () => {
       if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    }
  }, [gameplaySettings.autoPlayEnabled, gameplaySettings.autoPlayDelayMs, isPlaying, isTyping, textIndex, currentScene, availableChoices, handleAdvance]);

  useEffect(() => {
    if (episodeData?.scenes && episodeData.scenes.length > 0 && currentScene) {
        onSceneDataChange(currentScene);
    }
   }, [currentScene, episodeData, onSceneDataChange]);

  useEffect(() => {
    if (episodeData?.scenes && episodeData.scenes.length > 0 && currentScene) {
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

  if (!episodeData) {
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
      {/* Background - Optimized for performance */}
      {shouldTransition ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScene._id}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: previousScene?.sceneTransitionOut?.durationSeconds ?? 0.6,
              ease: "easeInOut"
            }}
          >
            <BackgroundRenderer background={currentScene?.background} title={currentScene?.title} />
          </motion.div>
        </AnimatePresence>
      ) : (
        // No transition - instant background change for 'none' type (performance optimized)
        <div className="absolute inset-0">
          <BackgroundRenderer background={currentScene?.background} title={currentScene?.title} />
        </div>
      )}
      
      {/* ใช้ CSS class ใหม่สำหรับ gradient overlay */}
      <div className="absolute inset-0 vn-gradient-overlay"></div>

      {/* Characters */}
      <div className="absolute inset-0 z-10 overflow-hidden">
        <AnimatePresence mode="wait">
          {charactersInScene.map(char => {
            const transform = char.transform ?? {};
            return (
              <motion.div
                  key={char.instanceId}
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: transform.opacity ?? 1,
                    x: transform.positionX ?? 0,
                    y: transform.positionY ?? 0,
                    scale: transform.scaleX ?? 1,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ 
                    duration: 0.4, 
                    ease: "easeInOut",
                    opacity: { duration: 0.3 }
                  }}
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
                     className="h-full w-auto object-contain object-bottom protected-image vn-character-image"
                     onError={() => handleImageError(char.characterData?.characterCode || '')}
                   />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Choices Overlay */}
      <AnimatePresence mode="wait">
        {availableChoices && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-8"
          >
            <motion.div 
              className="w-full max-w-lg space-y-4"
              variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: {
                      opacity: 1,
                      y: 0,
                      transition: { 
                        staggerChildren: 0.08,
                        duration: 0.4,
                        ease: "easeOut"
                      }
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
                      hidden: { y: 15, opacity: 0 },
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

      {/* Dialogue Box - ใช้ CSS class ใหม่ */}
      {isDialogueVisible && !availableChoices && currentScene?.textContents[textIndex] && (
        <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-4 md:p-6 text-white z-30 pointer-events-none">
          <div 
            className="vn-dialogue-box p-4 sm:p-6 md:p-8 rounded-lg min-h-[150px] sm:min-h-[180px] md:min-h-[220px] flex flex-col justify-center"
            style={{ 
              backgroundColor: `rgba(0, 0, 0, ${textBoxOpacity * 0.4})`, // ลดความเข้มลงจาก 0.6 เป็น 0.4
              transition: 'background-color 0.3s'
            }}
          >
            {/* Speaker Name */}
            {speakerInfo.name && (
              <h3 
                 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2"
                 style={{ color: speakerInfo.color, textShadow: '1px 1px 3px rgba(0,0,0,0.5)'}}
              >
                {speakerInfo.name}
              </h3>
            )}
            
            {displayedText && (
              <p 
                key={currentScene.textContents[textIndex].instanceId}
                className="leading-normal sm:leading-relaxed text-base sm:text-lg md:text-xl"
                style={{ fontSize: `${fontSize}px`}}>
                {displayedText}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default VisualNovelContent;