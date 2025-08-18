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

type SerializedAudioElement = Omit<IAudioElement, 'mediaId'> & { mediaId: string; };

type SerializedScene = Omit<IScene, '_id' | 'novelId' | 'episodeId' | 'characters' | 'textContents' | 'choiceIds' | 'audios' | 'defaultNextSceneId' | 'previousSceneId'> & {
    _id: string;
    novelId: string;
    episodeId: string;
    characters: PopulatedCharacter[];
    textContents: SerializedTextContent[];
    choices: SerializedChoice[];
    audios: SerializedAudioElement[];
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
  onAdvance?: (handleAdvanceFn: () => void) => void;
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
            // Check if mediaId is a valid, non-empty string before proceeding
            if (!audioConfig.mediaId) {
                console.warn(`Skipping audio instanceId ${audioConfig.instanceId} because mediaId is missing or empty.`);
                return; 
            }
            
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
  onAdvance,
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
  const handleAdvanceRef = useRef<(() => void) | null>(null);

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
      // Only proceed if this is actually a different scene
      if (!currentScene || currentScene._id !== scene._id) {
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
        
        // Reset text state for new scene
        setTextIndex(0);
        setDisplayedText('');
        setIsTyping(false);
        setAvailableChoices(null);
        
        console.log(`🎬 Scene changed to: "${scene.title}" (${scene.sceneOrder}) with ${scene.textContents?.length || 0} texts`);
        
        // 🎭 MULTIPLE ENDINGS: ตรวจสอบ ending field ทันทีเมื่อเข้าสู่ scene
        if (scene.ending) {
          const novelMeta = episodeData?.novelMeta || novel;
          console.log(`🎭 Ending scene detected: "${scene.ending.title}" (${scene.ending.endingType})`);
          console.log(`📚 Novel type: "${novelMeta.endingType}", Episode: ${episodeData?.episodeOrder}/${novelMeta.totalEpisodesCount}`);
          
          if (novelMeta.endingType === 'multiple_endings') {
            // สำหรับ MULTIPLE_ENDINGS: แสดง ending screen ทันที
            console.log(`🎊 Showing MULTIPLE_ENDINGS ending: "${scene.ending.title}"`);
            onEpisodeEnd(scene.ending);
            return; // หยุดการเล่นทันที
          } else if (novelMeta.endingType === 'single_ending') {
            // สำหรับ SINGLE_ENDING: ตรวจสอบว่าเป็นฉากสุดท้ายของตอนสุดท้ายหรือไม่
            const isLastEpisode = episodeData?.episodeOrder === novelMeta.totalEpisodesCount;
            const maxSceneOrder = Math.max(...(episodeData?.scenes?.map(s => s.sceneOrder) || [0]));
            const isLastScene = scene.sceneOrder === maxSceneOrder;
            
            console.log(`🎯 SINGLE_ENDING ending check - isLastEpisode: ${isLastEpisode}, isLastScene: ${isLastScene} (${scene.sceneOrder}/${maxSceneOrder})`);
            
            if (isLastEpisode && isLastScene) {
              console.log(`🎊 Showing SINGLE_ENDING finale: "${scene.ending.title}"`);
              onEpisodeEnd(scene.ending);
              return; // หยุดการเล่นทันที
            } else {
              console.log(`⏭️ Skipping ending for SINGLE_ENDING novel (not final scene/episode)`);
              // ไปตอนถัดไปโดยไม่แสดง ending screen
              const nextEpisodeOrder = (episodeData?.episodeOrder || 1) + 1;
              if (nextEpisodeOrder <= novelMeta.totalEpisodesCount) {
                console.log(`📖 Moving to next episode: ${nextEpisodeOrder}/${novelMeta.totalEpisodesCount}`);
                onEpisodeEnd(); // จบตอนปัจจุบันแล้วไปตอนถัดไป
                return;
              }
            }
          } else {
            // สำหรับ ending types อื่นๆ: แสดง ending
            console.log(`🔄 Showing ending for "${novelMeta.endingType}" novel: "${scene.ending.title}"`);
            onEpisodeEnd(scene.ending);
            return; // หยุดการเล่นทันที
          }
        }
        
        onSceneDataChange(scene);
      }
    } else {
      // No scene found, clear current scene
      if (currentScene) {
        setCurrentScene(null);
        onSceneDataChange(null);
      }
    }
  }, [currentSceneId, episodeData]);


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
    // Always clear any active typing animation first to ensure responsive interaction
    if (typingTimeoutRef.current) {
       clearTimeout(typingTimeoutRef.current);
       typingTimeoutRef.current = null;
    }

    if (isTyping) {
      // If user clicks while typing, reveal the full text instantly.
      // This ensures clicking during fade transitions works seamlessly
      const fullText = currentScene?.textContents[textIndex]?.content || '';
      setDisplayedText(fullText);
      setIsTyping(false);
      
      console.log(`🎯 User clicked during typing - showing full text instantly: "${fullText.substring(0, 50)}..."`);
      console.log(`🔧 Instant text - Scene: "${currentScene?.title || 'Unknown'}" (${currentScene?.sceneOrder || 0}), Text: ${textIndex + 1}/${currentScene?.textContents.length || 0}`);
      return; // Exit early to prevent advancing to next scene
    } else {
      // If text is fully displayed, advance to the next part of the scene.
      if (!currentScene) return;

      // ✅ แก้ไข: ตรวจสอบว่าข้อความปัจจุบันแสดงครบหรือยัง
      const currentTextContent = currentScene.textContents[textIndex];
      const fullText = currentTextContent?.content || '';
      const isCurrentTextComplete = displayedText === fullText;

      // หากข้อความปัจจุบันยังแสดงไม่ครบ ให้แสดงครบก่อน
      if (!isCurrentTextComplete && fullText) {
        console.log(`📝 Current text not fully displayed - showing complete text first`);
        console.log(`📊 Text comparison: displayed="${displayedText.length}/${fullText.length}" chars`);
        console.log(`🎬 Scene: "${currentScene.title}" (${currentScene.sceneOrder}) - Text ${textIndex + 1}/${currentScene.textContents.length}`);
        setDisplayedText(fullText);
        setIsTyping(false);
        return; // หยุดไม่ให้ไปฉากถัดไป
      }

      // Check if there is more text content in the current scene object.
      const hasNextText = textIndex < (currentScene.textContents.length - 1);
      if (hasNextText) {
        console.log(`📖 Advancing to next text in scene (${textIndex + 1}/${currentScene.textContents.length})`);
        setTextIndex(prev => prev + 1);
        return;
      }

      // End of all text for the current scene. Determine what's next.
      console.log(`🎬 End of scene "${currentScene.title}" - determining next action...`);
      
      // 1. Priority: If there's a default next scene, go to it immediately.
      if (currentScene.defaultNextSceneId) {
        console.log(`➡️ Moving to default next scene: ${currentScene.defaultNextSceneId}`);
        console.log(`🎭 Scene transition: "${currentScene.sceneTransitionOut?.type || 'none'}" (${currentScene.sceneTransitionOut?.durationSeconds || 0}s)`);
        onSceneChange(currentScene.defaultNextSceneId);
        return;
      }

      // 2. If there are choices, display them and wait for the user.
      if (currentScene.choices && currentScene.choices.length > 0) {
        console.log(`🔄 Showing ${currentScene.choices.length} choices to user`);
        setAvailableChoices(currentScene.choices);
        return;
      }

      // ✅ แก้ไข: เพิ่มการตรวจสอบฉากถัดไปใน episode เดียวกัน
      const nextSceneInEpisode = episodeData?.scenes?.find(s => s.sceneOrder === currentScene.sceneOrder + 1);
      if (nextSceneInEpisode) {
        console.log(`📖 Moving to next scene in same episode: ${nextSceneInEpisode.title} (${nextSceneInEpisode.sceneOrder})`);
        console.log(`🎭 Scene transition: "${currentScene.sceneTransitionOut?.type || 'none'}" (${currentScene.sceneTransitionOut?.durationSeconds || 0}s)`);
        onSceneChange(nextSceneInEpisode._id);
        return;
      } else {
        console.log(`🏁 No more scenes in current episode (${episodeData?.episodeOrder}) - ending episode`);
      }

      // 3. Handle scene endings based on novel type
      const novelMeta = episodeData?.novelMeta || novel;
      console.log(`📚 Novel metadata - endingType: "${novelMeta.endingType}", isCompleted: ${novelMeta.isCompleted}, totalEpisodes: ${novelMeta.totalEpisodesCount}`);
      console.log(`📜 Current episode: ${episodeData?.episodeOrder}, has ending: ${!!currentScene.ending}`);
      console.log(`🎬 Current scene: "${currentScene.title}" (${currentScene.sceneOrder}) - Total scenes in episode: ${episodeData?.scenes?.length || 0}`);
      console.log(`📋 Available scenes in episode: ${episodeData?.scenes?.map(s => `${s.sceneOrder}:${s.title}`).join(', ') || 'none'}`);
      
      if (currentScene.ending) {
        // 🎭 MULTIPLE ENDINGS: ตรวจสอบ ending field ใน scene ปัจจุบัน
        console.log(`🎭 Ending scene detected in handleAdvance: "${currentScene.ending.title}" (${currentScene.ending.endingType})`);
        
        if (novelMeta.endingType === 'multiple_endings') {
          // สำหรับ MULTIPLE_ENDINGS: แสดง ending screen ทันที
          console.log(`🎊 Showing MULTIPLE_ENDINGS ending: "${currentScene.ending.title}"`);
          onEpisodeEnd(currentScene.ending);
          return; // หยุดการเล่นทันที
        } else if (novelMeta.endingType === 'single_ending') {
          // สำหรับ SINGLE_ENDING: ตรวจสอบว่าเป็นฉากสุดท้ายของตอนสุดท้ายหรือไม่
          const isLastEpisode = episodeData?.episodeOrder === novelMeta.totalEpisodesCount;
          const maxSceneOrder = Math.max(...(episodeData?.scenes?.map(s => s.sceneOrder) || [0]));
          const isLastScene = currentScene.sceneOrder === maxSceneOrder;
          
          console.log(`🎯 SINGLE_ENDING ending check - isLastEpisode: ${isLastEpisode}, isLastScene: ${isLastScene} (${currentScene.sceneOrder}/${maxSceneOrder})`);
          
          if (isLastEpisode && isLastScene) {
            console.log(`🎊 Showing SINGLE_ENDING finale: "${currentScene.ending.title}"`);
            onEpisodeEnd(currentScene.ending);
            return; // หยุดการเล่นทันที
          } else {
            console.log(`⏭️ Skipping ending for SINGLE_ENDING novel (not final scene/episode)`);
            // ไปตอนถัดไปโดยไม่แสดง ending screen
            const nextEpisodeOrder = (episodeData?.episodeOrder || 1) + 1;
            if (nextEpisodeOrder <= novelMeta.totalEpisodesCount) {
              console.log(`📖 Moving to next episode: ${nextEpisodeOrder}/${novelMeta.totalEpisodesCount}`);
              onEpisodeEnd(); // จบตอนปัจจุบันแล้วไปตอนถัดไป
              return;
            }
          }
        } else {
          // สำหรับ ending types อื่นๆ: แสดง ending
          console.log(`🔄 Showing ending for "${novelMeta.endingType}" novel: "${currentScene.ending.title}"`);
          onEpisodeEnd(currentScene.ending);
          return; // หยุดการเล่นทันที
        }
      }

      // 4. Fallback: If none of the above, the episode ends.
      console.log(`🏁 Episode ending without specific scene ending`);
      onEpisodeEnd();
    }
  }, [isTyping, textIndex, currentScene, onSceneChange, onEpisodeEnd, novel.slug, episodeData, displayedText]);

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
            // หากเป็น ending node ให้ตรวจสอบประเภทนิยายก่อนแสดงจบ
            const endingData = {
              endingType: 'NORMAL' as const,
              title: targetNode.nodeSpecificData?.endingTitle || targetNode.title || 'จบ',
              description: targetNode.nodeSpecificData?.outcomeDescription || 'เรื่องจบลงแล้ว',
              endingId: targetNode.nodeId,
            };
            
            // Apply novel type restrictions with detailed logging
            const novelMeta = episodeData?.novelMeta || novel;
            console.log(`🎲 Choice ending check - Novel type: "${novelMeta.endingType}", Episode: ${episodeData?.episodeOrder}/${novelMeta.totalEpisodesCount}`);
            
            if (novelMeta.endingType === 'single_ending') {
              // For SINGLE_ENDING novels, only show ending if this is the final episode
              const isLastEpisode = episodeData?.episodeOrder === novelMeta.totalEpisodesCount;
              console.log(`🎯 SINGLE_ENDING choice ending check - isLastEpisode: ${isLastEpisode}`);
              
              if (isLastEpisode) {
                console.log(`🎊 Showing SINGLE_ENDING choice finale: "${endingData.title}"`);
                onEpisodeEnd(endingData);
              } else {
                // Skip ending for SINGLE_ENDING novels on non-final episodes
                console.log(`⏭️ Skipping choice ending for SINGLE_ENDING novel (not final episode)`);
                onEpisodeEnd(); // End without showing ending
              }
            } else {
              // For MULTIPLE_ENDINGS or other types, show ending
              console.log(`🎭 Showing choice ending for "${novelMeta.endingType}" novel: "${endingData.title}"`);
              onEpisodeEnd(endingData);
            }
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
      // จัดการ ending จาก choice action โดยตรวจสอบประเภทนิยาย
      const endingData = {
        endingType: endBranchAction.parameters.endingType || 'NORMAL',
        title: endBranchAction.parameters.endingTitle || 'จบ',
        description: endBranchAction.parameters.outcomeDescription || 'เรื่องจบลงแล้ว',
        endingId: endBranchAction.parameters.endingNodeId || 'ending',
      };
      
      // Apply novel type restrictions with detailed logging
      const novelMeta = episodeData?.novelMeta || novel;
      console.log(`🎲 Choice action ending check - Novel type: "${novelMeta.endingType}", Episode: ${episodeData?.episodeOrder}/${novelMeta.totalEpisodesCount}`);
      
      if (novelMeta.endingType === 'single_ending') {
        // For SINGLE_ENDING novels, only show ending if this is the final episode
        const isLastEpisode = episodeData?.episodeOrder === novelMeta.totalEpisodesCount;
        console.log(`🎯 SINGLE_ENDING action ending check - isLastEpisode: ${isLastEpisode}`);
        
        if (isLastEpisode) {
          console.log(`🎊 Showing SINGLE_ENDING action finale: "${endingData.title}"`);
          onEpisodeEnd(endingData);
        } else {
          // Skip ending for SINGLE_ENDING novels on non-final episodes
          console.log(`⏭️ Skipping action ending for SINGLE_ENDING novel (not final episode)`);
          onEpisodeEnd(); // End without showing ending
        }
      } else {
        // For MULTIPLE_ENDINGS or other types, show ending
        console.log(`🎭 Showing action ending for "${novelMeta.endingType}" novel: "${endingData.title}"`);
        onEpisodeEnd(endingData);
      }
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

  // Store the handleAdvance function in ref for external access
  useEffect(() => {
    handleAdvanceRef.current = handleAdvance;
  }, [handleAdvance]);

  // Register the handleAdvance function with the parent component
  useEffect(() => {
    if (onAdvance) {
      onAdvance(() => {
        // Ensure we're not in the middle of a render cycle
        if (handleAdvanceRef.current) {
          handleAdvanceRef.current();
        }
      });
    }
  }, [onAdvance]);

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
    <div 
      className="relative w-full h-full" 
      style={{ 
        pointerEvents: 'none', // Disable pointer events on container, let click overlay handle it
        zIndex: 1 // Ensure main container is above background
      }}
    >
      {/* Background - Completely non-interactive for seamless clicking */}
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
            style={{ 
              zIndex: -10, // Much lower z-index to ensure it never interferes with clicks
              pointerEvents: 'none', // Explicitly disable all pointer events
              touchAction: 'none' // Disable touch events as well
            }}
          >
            <BackgroundRenderer background={currentScene?.background} title={currentScene?.title} />
          </motion.div>
        </AnimatePresence>
      ) : (
        // No transition - instant background change for 'none' type (performance optimized)
        <div 
          className="absolute inset-0" 
          style={{ 
            zIndex: -10, // Much lower z-index 
            pointerEvents: 'none', // Explicitly disable all pointer events
            touchAction: 'none' // Disable touch events as well
          }}
        >
          <BackgroundRenderer background={currentScene?.background} title={currentScene?.title} />
        </div>
      )}
      
      {/* ใช้ CSS class ใหม่สำหรับ gradient overlay */}
      <div className="absolute inset-0 vn-gradient-overlay pointer-events-none" style={{ zIndex: 0 }}></div>

      {/* Characters */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 5 }}>
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
                      zIndex: (transform.zIndex ?? 1) + 10, // Ensure characters are above background
                      transform: `translateX(-50%)`, // Offset by half its own width to truly center
                  }}
              >
                   <img
                     src={
                       imageErrors[char.characterData?.characterCode || ''] || !char.characterData?.characterCode
                         ? '/images/default-avatar.png'
                         : `/images/character/${char.characterData.characterCode}_fullbody.png`                     }
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
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-8"
            style={{ 
              pointerEvents: 'auto',
              zIndex: 60 // Higher than click overlay to receive interactions
            }}
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

      {/* Click overlay - Ensures clicks always work regardless of transitions */}
      {!availableChoices && (
        <div 
          className="absolute inset-0 cursor-pointer"
          onClick={handleAdvance}
          onMouseDown={(e) => e.preventDefault()}
          onTouchStart={(e) => e.preventDefault()} // Prevent touch interference
          style={{ 
            zIndex: 50, // Highest z-index to capture all clicks
            backgroundColor: 'transparent', // Invisible but clickable
            pointerEvents: 'auto', // Ensure this always receives clicks
            touchAction: 'manipulation' // Optimize touch response
          }}
          aria-label="Click to advance text"
        />
      )}

      {/* Dialogue Box - ใช้ CSS class ใหม่ */}
      {isDialogueVisible && !availableChoices && currentScene?.textContents[textIndex] && (
        <div 
          className="absolute bottom-0 left-0 right-0 p-2 sm:p-4 md:p-6 text-white pointer-events-none"
          style={{ zIndex: 10 }}
        >
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