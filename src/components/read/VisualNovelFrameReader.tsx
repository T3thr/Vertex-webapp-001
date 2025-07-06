'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Settings, 
  ArrowLeft,
  List,
  MessageSquareText,
  Eye,
  EyeOff,
  SkipForward,
  Swords,
  MessageSquare,
  MessageSquareOff
} from 'lucide-react';
import VisualNovelContent, { DialogueHistoryItem } from './VisualNovelContent';
import DialogueHistory from './DialogueHistory';
import EpisodeNavigation from './EpisodeNavigation';
import ReaderSettings, { IReaderSettings } from './ReaderSettings';
import StoryStatusPanel from './StoryStatusPanel';
import { DEFAULT_USER_SETTINGS, getInitialSettings } from '@/lib/user-settings';
import { useDebouncedCallback } from 'use-debounce';

// --- Type Definitions ---
import type { INovel } from '@/backend/models/Novel';
import type { IEpisode, IEpisodeStats } from '@/backend/models/Episode';
import type { IScene, ICharacterInScene, ITextContent } from '@/backend/models/Scene';
import type { IChoice as IChoiceBackend } from '@/backend/models/Choice';
import type { ICharacter } from '@/backend/models/Character';

type PopulatedCharacter = Omit<ICharacterInScene, 'characterId'> & {
    characterId: string;
    characterData?: Omit<ICharacter, '_id'> & { _id: string };
};

type SerializedTextContent = Omit<ITextContent, 'characterId' | 'voiceOverMediaId'> & {
    characterId?: string;
    voiceOverMediaId?: string;
};

type SerializedChoice = Omit<IChoiceBackend, '_id'> & { _id: string };

export type SerializedScene = Omit<IScene, '_id' | 'novelId' | 'episodeId' | 'characters' | 'textContents' | 'choiceIds' | 'audios' | 'defaultNextSceneId' | 'previousSceneId'> & {
    _id: string;
    novelId: string;
    episodeId: string;
    characters: PopulatedCharacter[];
    textContents: SerializedTextContent[];
    choices: SerializedChoice[];
    audios: any[];
    defaultNextSceneId?: string;
    previousSceneId?: string;
};

type DetailedEpisode = Omit<IEpisode, '_id' | 'novelId' | 'authorId' | 'sceneIds' | 'firstSceneId' | 'nextEpisodeId' | 'previousEpisodeId'> & {
    _id: string;
    novelId: string;
    authorId: string;
    scenes?: SerializedScene[];
    firstSceneId?: string;
    nextEpisodeId?: string;
    previousEpisodeId?: string;
    priceCoins?: number;
    originalPriceCoins?: number;
    teaserText?: string;
};

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

type EpisodeListItem = Pick<IEpisode, 'title' | 'slug' | 'episodeOrder' | 'accessType' | 'firstSceneId'> & {
    _id: string;
};

interface VisualNovelFrameReaderProps {
  novel: DisplayNovel;
  episode: FullEpisode; // This is the INITIAL episode
  initialSceneId?: string;
  userId?: string;
}

export default function VisualNovelFrameReader({ 
  novel, 
  episode: initialEpisode, 
  initialSceneId, 
  userId 
}: VisualNovelFrameReaderProps) {
  const router = useRouter();

  // Core Reader State
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentSceneId, setCurrentSceneId] = useState(initialSceneId || initialEpisode.firstSceneId?.toString());
  const [currentSceneData, setCurrentSceneData] = useState<SerializedScene | null>(null);
  const [dialogueHistory, setDialogueHistory] = useState<DialogueHistoryItem[]>([]);
  
  // UI Panels and Visibility State
  const [isUiVisible, setIsUiVisible] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showEpisodeNav, setShowEpisodeNav] = useState(false);
  const [showStoryStatus, setShowStoryStatus] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<IReaderSettings>(DEFAULT_USER_SETTINGS);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
  
  // --- New State for Seamless Transitions ---
  const [currentEpisode, setCurrentEpisode] = useState<FullEpisode>(initialEpisode);
  const [currentEpisodeData, setCurrentEpisodeData] = useState<DetailedEpisode | null>(null);
  const [prefetchedEpisodeData, setPrefetchedEpisodeData] = useState<DetailedEpisode | null>(null);
  const [isLoadingEpisode, setIsLoadingEpisode] = useState(true);
  const [allEpisodes, setAllEpisodes] = useState<EpisodeListItem[]>([]);
  
  // Advance Trigger
  const [advanceTrigger, setAdvanceTrigger] = useState(0);
  const handleAdvance = () => setAdvanceTrigger(t => t + 1);

  // --- Data Fetching Logic ---
  const fetchEpisodeDetails = useCallback(async (episodeId: string): Promise<DetailedEpisode | null> => {
    try {
        const res = await fetch(`/api/novels/${novel.slug}/episodes/${episodeId}`);
        if (!res.ok) {
            console.error(`Failed to fetch details for episode ${episodeId}`);
            return null;
        }
        return await res.json();
    } catch (error) {
        console.error("Error in fetchEpisodeDetails:", error);
        return null;
    }
  }, [novel.slug]);

  // Fetch initial settings from API or localStorage
  useEffect(() => {
    getInitialSettings(userId).then(initialSettings => {
      setSettings(initialSettings);
      setIsSettingsLoaded(true);
    });
  }, [userId]);

  // Fetch all episodes for navigation & pre-fetching logic
  useEffect(() => {
    const fetchAllEpisodes = async () => {
        try {
            const res = await fetch(`/api/novels/${novel.slug}/episodes`);
            if (res.ok) {
                const data = await res.json();
                const episodesWithStringIds = data.episodes.map((ep: any) => ({
                    ...ep,
                    _id: ep._id.toString(),
                    firstSceneId: ep.firstSceneId?.toString(),
                }));
                setAllEpisodes(episodesWithStringIds);
            }
        } catch (error) {
            console.error("Failed to fetch episodes for navigation:", error);
        }
    };
    fetchAllEpisodes();
  }, [userId, novel.slug]);

  // Fetch data for the CURRENT episode
  useEffect(() => {
    setIsLoadingEpisode(true);
    fetchEpisodeDetails(currentEpisode._id).then(data => {
        setCurrentEpisodeData(data);
        if (currentEpisode._id === initialEpisode._id) {
             setCurrentSceneId(initialSceneId || data?.firstSceneId?.toString());
        } else {
             setCurrentSceneId(data?.firstSceneId?.toString());
        }
        setIsLoadingEpisode(false);
    });
  }, [currentEpisode, initialEpisode._id, initialSceneId, fetchEpisodeDetails]);

  // Pre-fetch the NEXT episode
  useEffect(() => {
    if (!currentEpisodeData || !allEpisodes.length || prefetchedEpisodeData) return;
    const prefetch = async () => {
        const currentIdx = allEpisodes.findIndex(ep => ep._id === currentEpisode._id);
        if (currentIdx > -1 && currentIdx < allEpisodes.length - 1) {
            const nextEpisodeInfo = allEpisodes[currentIdx + 1];
            const accessRes = await fetch(`/api/novels/${novel.slug}/episodes/${nextEpisodeInfo._id}/access`);
            if (accessRes.ok) {
                const accessData = await accessRes.json();
                if (accessData.hasAccess) {
                    const data = await fetchEpisodeDetails(nextEpisodeInfo._id);
                    if (data) setPrefetchedEpisodeData(data);
                }
            }
        }
    };
    prefetch();
  }, [currentEpisodeData, allEpisodes, novel.slug, fetchEpisodeDetails, prefetchedEpisodeData, currentEpisode._id]);
  
  const debouncedSaveSettings = useDebouncedCallback(async (newSettings: IReaderSettings) => {
    if (!userId) {
      localStorage.setItem('divwy-reader-settings', JSON.stringify(newSettings));
      return;
    };
    try {
      await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
       localStorage.setItem('divwy-reader-settings', JSON.stringify(newSettings));
    } catch (error) {
       console.error("Failed to save settings:", error);
    }
  }, 1000);

  const handleSettingsChange = useCallback((newSettings: IReaderSettings) => {
    setSettings(newSettings);
    debouncedSaveSettings(newSettings);
  }, [debouncedSaveSettings]);

  const handleSaveAndCloseSettings = useCallback(() => {
    debouncedSaveSettings.flush();
    setShowSettings(false);
  }, [debouncedSaveSettings]);
  
  const handleResetSettings = useCallback(() => {
    setSettings(DEFAULT_USER_SETTINGS);
    debouncedSaveSettings(DEFAULT_USER_SETTINGS);
  }, [debouncedSaveSettings]);

  const handleBackToNovel = useCallback(() => {
    router.push(`/novels/${novel.slug}`);
  }, [router, novel.slug]);

  const handleDialogueEntry = useCallback((entry: DialogueHistoryItem) => {
    setDialogueHistory(prev => {
        if (prev.find(item => item.id === entry.id)) return prev;
        return [...prev, entry].slice(-100);
    });
  }, []);

  const handleEpisodeEnd = useCallback(async () => {
    const currentEpisodeIndex = allEpisodes.findIndex(ep => ep._id === currentEpisode._id);
    if (currentEpisodeIndex === -1 || currentEpisodeIndex >= allEpisodes.length - 1) {
      setShowSummary(true);
      return;
    }
    const nextEpisodeInfo = allEpisodes[currentEpisodeIndex + 1];

    const transitionToEpisode = (episodeData: DetailedEpisode) => {
        const newCurrentEpisode: FullEpisode = {
            _id: episodeData._id,
            title: episodeData.title,
            slug: episodeData.slug,
            episodeOrder: episodeData.episodeOrder,
            accessType: episodeData.accessType,
            priceCoins: episodeData.priceCoins,
            originalPriceCoins: episodeData.originalPriceCoins,
            teaserText: episodeData.teaserText,
            firstSceneId: episodeData.firstSceneId?.toString(),
        };
        setCurrentEpisode(newCurrentEpisode);
        setDialogueHistory([]);
        setPrefetchedEpisodeData(null);
        const newUrl = `/read/${novel.slug}/${newCurrentEpisode.episodeOrder}-${newCurrentEpisode.slug}`;
        const newTitle = `${newCurrentEpisode.title} - ${novel.title} | DivWy`;
        document.title = newTitle;
        window.history.pushState({ episodeId: newCurrentEpisode._id }, newTitle, newUrl);
    };
    
    if (prefetchedEpisodeData && prefetchedEpisodeData._id === nextEpisodeInfo._id) {
        transitionToEpisode(prefetchedEpisodeData);
        return;
    }

    setIsLoadingEpisode(true);
    const accessRes = await fetch(`/api/novels/${novel.slug}/episodes/${nextEpisodeInfo._id}/access`);
    if (accessRes.ok && (await accessRes.json()).hasAccess) {
        const data = await fetchEpisodeDetails(nextEpisodeInfo._id);
        if (data) {
            transitionToEpisode(data);
        } else {
            router.push(`/read/${novel.slug}/${nextEpisodeInfo.episodeOrder}-${nextEpisodeInfo.slug}`);
        }
    } else {
         router.push(`/read/${novel.slug}/${nextEpisodeInfo.episodeOrder}-${nextEpisodeInfo.slug}`);
    }
    setIsLoadingEpisode(false);

  }, [allEpisodes, currentEpisode._id, novel, router, prefetchedEpisodeData, fetchEpisodeDetails]);

  useEffect(() => {
    const handleContextmenu = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextmenu);
    return () => document.removeEventListener('contextmenu', handleContextmenu);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      router.push(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [router]);

  const handleToggleDialogue = () => {
    const newSettings: IReaderSettings = {
      ...settings,
      display: {
        ...settings.display,
        uiVisibility: {
          theme: settings.display?.uiVisibility?.theme ?? 'system_default',
          textBoxOpacity: settings.display?.uiVisibility?.textBoxOpacity ?? 80,
          backgroundBrightness: settings.display?.uiVisibility?.backgroundBrightness ?? 100,
          textBoxBorder: settings.display?.uiVisibility?.textBoxBorder ?? true,
          isDialogueBoxVisible: !(settings.display?.uiVisibility?.isDialogueBoxVisible ?? true),
        },
      },
    };
    handleSettingsChange(newSettings);
  };

  return (
    <div className="w-full h-full bg-black text-white flex flex-col relative">
        <AnimatePresence>
            {isLoadingEpisode && (
                <motion.div 
                    className="absolute inset-0 z-50 bg-black/70 flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </motion.div>
            )}
        </AnimatePresence>

        <main className="flex-1 w-full h-full">
            {isSettingsLoaded && !isLoadingEpisode && (
            <VisualNovelContent
                novel={novel}
                episodeData={currentEpisodeData}
                currentSceneId={currentSceneId}
                isPlaying={isPlaying}
                userSettings={settings}
                isDialogueVisible={settings.display?.uiVisibility?.isDialogueBoxVisible ?? true}
                onSceneChange={setCurrentSceneId}
                onSceneDataChange={setCurrentSceneData}
                onDialogueEntry={handleDialogueEntry}
                onEpisodeEnd={handleEpisodeEnd}
                advanceTrigger={advanceTrigger}
            />
            )}
        </main>
      
        <AnimatePresence>
            {isUiVisible && (
                <motion.div 
                    className='absolute inset-0 pointer-events-none'
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <header className="absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/60 to-transparent p-4 text-white pointer-events-auto">
                        <div className="flex items-center justify-between">
                            <motion.button
                                onClick={handleBackToNovel}
                                className="flex items-center gap-2 text-white hover:text-primary-foreground transition-colors group"
                                whileTap={{ scale: 0.95 }}
                            >
                                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                                <div className="text-left">
                                <h1 className="text-sm font-bold truncate">{currentEpisode.title}</h1>
                                <p className="text-xs text-white/80 truncate">{novel.title}</p>
                                </div>
                            </motion.button>
                            
                            <div className="flex items-center gap-1">
                                <motion.button whileTap={{ scale: 0.95 }} onClick={handleToggleDialogue} className="p-2 rounded-full hover:bg-white/20 transition-colors" aria-label="Toggle Dialogue">
                                  {(settings.display.uiVisibility?.isDialogueBoxVisible ?? true) ? <MessageSquareOff size={18} /> : <MessageSquare size={18} />}
                                </motion.button>
                                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowStoryStatus(true)} className="p-2 rounded-full hover:bg-white/20 transition-colors"><Swords size={18} /></motion.button>
                            </div>
                        </div>
                    </header>

                    <footer className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/60 to-transparent p-4 pointer-events-auto">
                        <div className="max-w-xl mx-auto bg-black/30 backdrop-blur-md rounded-full flex items-center justify-evenly text-white p-2 border border-white/20 shadow-lg">
                           <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowEpisodeNav(true)} className="p-3 rounded-full hover:bg-white/20 transition-colors" aria-label="Episode List"><List size={20} /></motion.button>
                           <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowHistory(true)} className="p-3 rounded-full hover:bg-white/20 transition-colors" aria-label="Dialogue History"><MessageSquareText size={20} /></motion.button>
                           <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsPlaying(!isPlaying)} className="p-3 rounded-full hover:bg-white/20 transition-colors" aria-label={isPlaying ? 'Pause' : 'Play'}>
                             {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                           </motion.button>
                           <motion.button whileTap={{ scale: 0.9 }} onClick={handleAdvance} className="p-3 rounded-full hover:bg-white/20 transition-colors" aria-label="Skip"><SkipForward size={20} /></motion.button>
                           <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowSettings(true)} className="p-3 rounded-full hover:bg-white/20 transition-colors" aria-label="Settings"><Settings size={20} /></motion.button>
                        </div>
                    </footer>
                </motion.div>
            )}
        </AnimatePresence>
      
        <AnimatePresence>
            {showHistory && <DialogueHistory isOpen={showHistory} onClose={() => setShowHistory(false)} history={dialogueHistory} />}
            {showEpisodeNav && <EpisodeNavigation isOpen={showEpisodeNav} onClose={() => setShowEpisodeNav(false)} novel={novel} currentEpisode={currentEpisode} userId={userId}/>}
            {showSettings && <ReaderSettings isOpen={showSettings} onClose={() => setShowSettings(false)} settings={settings} onSettingsChange={handleSettingsChange} onSave={handleSaveAndCloseSettings} onReset={handleResetSettings} />}
            {showStoryStatus && <StoryStatusPanel isOpen={showStoryStatus} onClose={() => setShowStoryStatus(false)} scene={currentSceneData} />}
            {showSummary && (
                <EndSummaryScreen 
                    novel={novel} 
                    backgroundUrl={currentSceneData?.background?.value}
                />
            )}
        </AnimatePresence>
    </div>
  );
}

function EndSummaryScreen({ novel, backgroundUrl }: { novel: DisplayNovel, backgroundUrl?: string }) {
    const router = useRouter();

    return (
        <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {backgroundUrl && (
                <img
                    src={backgroundUrl}
                    alt="Final Scene Background"
                    className="absolute inset-0 w-full h-full object-cover"
                />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/50 to-transparent" />
            
            <div className="relative z-10 text-center text-white p-8 rounded-lg max-w-2xl">
                <motion.h1 
                    className="text-4xl md:text-5xl font-bold mb-4"
                    style={{ textShadow: '2px 2px 8px rgba(0, 0, 0, 0.8)' }}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1, transition: { delay: 0.2 } }}
                >
                    บทสรุปการเดินทาง
                </motion.h1>
                <motion.p 
                    className="text-lg md:text-xl text-white/80 mb-8"
                    style={{ textShadow: '1px 1px 6px rgba(0, 0, 0, 0.8)' }}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1, transition: { delay: 0.4 } }}
                >
                    และนี่คือผลลัพธ์อุปนิสัยของคุณแบบคร่าวๆ ขอบคุณที่ร่วมเล่นสนุกกับพวกเรา PATHY!
                </motion.p>
                <motion.div 
                    className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1, transition: { delay: 0.6 } }}
                >
                    <button
                        onClick={() => router.push(`/novels/${novel.slug}`)}
                        className="w-full sm:w-auto px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-full hover:bg-primary-hover transition-all duration-300 transform hover:scale-105"
                    >
                        กลับไปหน้าเลือกตอน
                    </button>
                    <button
                        onClick={() => router.push('/')}
                        className="w-full sm:w-auto px-8 py-3 bg-secondary text-secondary-foreground font-semibold rounded-full hover:bg-white/20 transition-all duration-300 transform hover:scale-105"
                    >
                        กลับหน้าหลัก
                    </button>
                </motion.div>
            </div>
        </motion.div>
    );
}