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
import type { DetailedEpisode } from './VisualNovelContent';
import DialogueHistory from './DialogueHistory';
import EpisodeNavigation from './EpisodeNavigation';
import ReaderSettings, { IReaderSettings } from './ReaderSettings';
import StoryStatusPanel from './StoryStatusPanel';
import { DEFAULT_USER_SETTINGS, getInitialSettings } from '@/lib/user-settings';
import { useDebouncedCallback } from 'use-debounce';

// Refactored to import from models
import type { INovel } from '@/backend/models/Novel';
import type { IEpisode, IEpisodeStats } from '@/backend/models/Episode';
import type { IScene } from '@/backend/models/Scene';

// The page provides a serialized version of INovel.
// This type should reflect the actual data shape passed from page.tsx
type DisplayNovel = Pick<INovel, 'slug' | 'title' | 'coverImageUrl' | 'synopsis'> & {
  _id: string;
  author: {
    _id: string;
    username: string;
    primaryPenName: string;
    avatarUrl: string;
  };
};

// The page provides a serialized, populated version of IEpisode
// We add `hasAccess` to enable pre-fetching logic.
type FullEpisode = Pick<IEpisode, 'slug' | 'title' | 'episodeOrder' | 'accessType' | 'priceCoins' | 'originalPriceCoins' | 'teaserText'> & {
  _id: string;
  firstSceneId?: string;
  stats?: IEpisodeStats;
  hasAccess?: boolean;
};

// A serialized scene, matching the structure within VisualNovelContent
export type SerializedScene = Omit<IScene, '_id' | 'novelId' | 'episodeId' | 'characters' | 'textContents' | 'choiceIds' | 'audios' | 'defaultNextSceneId' | 'previousSceneId'> & {
    _id: string;
    novelId: string;
    episodeId: string;
    characters: any[]; // Simplified for this context
    textContents: any[];
    choices: any[];
    audios: any[];
    defaultNextSceneId?: string;
    previousSceneId?: string;
};

// Use a simplified version for the list of all episodes
type EpisodeListItem = Pick<IEpisode, 'title' | 'slug' | 'episodeOrder' | 'accessType' | 'firstSceneId'> & {
    _id: string;
};

interface VisualNovelFrameReaderProps {
  novel: DisplayNovel;
  episode: FullEpisode;
  initialSceneId?: string;
  userId?: string;
}

export default function VisualNovelFrameReader({ 
  novel, 
  episode, 
  initialSceneId, 
  userId 
}: VisualNovelFrameReaderProps) {
  const router = useRouter();

  // Core Reader State
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeEpisode, setActiveEpisode] = useState<FullEpisode>(episode);
  const [currentSceneId, setCurrentSceneId] = useState(initialSceneId || episode.firstSceneId?.toString());
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
  
  // Episode Data & Loading State
  const [allEpisodes, setAllEpisodes] = useState<FullEpisode[]>([]);
  const [loadedEpisodesData, setLoadedEpisodesData] = useState<Record<string, DetailedEpisode>>({});
  const [isEpisodeLoading, setIsEpisodeLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Advance Trigger
  const [advanceTrigger, setAdvanceTrigger] = useState(0);
  const handleAdvance = () => setAdvanceTrigger(t => t + 1);

  // Fetch initial settings from API or localStorage
  useEffect(() => {
    getInitialSettings(userId).then(initialSettings => {
      setSettings(initialSettings);
      setIsSettingsLoaded(true);
    });
  }, [userId]);

  // Fetch all episodes for navigation and pre-fetching
  useEffect(() => {
    const fetchAllEpisodes = async () => {
        try {
            const res = await fetch(`/api/novels/${novel.slug}/episodes`);
            if (res.ok) {
                const data = await res.json();
                // Process episodes to ensure they match FullEpisode type and have access info
                const processedEpisodes: FullEpisode[] = data.episodes.map((ep: any) => ({
                  ...ep,
                  _id: ep._id.toString(),
                  firstSceneId: ep.firstSceneId?.toString(),
                  hasAccess: ep.accessType === 'free' || ep.hasAccess || false,
                }));
                setAllEpisodes(processedEpisodes);
            }
        } catch (error) {
            console.error("Failed to fetch episodes list:", error);
        }
    };
    fetchAllEpisodes();
  }, [userId, novel.slug]);

  const fetchEpisodeDetails = useCallback(async (episodeId: string): Promise<DetailedEpisode | null> => {
    try {
      const res = await fetch(`/api/novels/${novel.slug}/episodes/${episodeId}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (error) {
      console.error(`Failed to fetch details for episode ${episodeId}:`, error);
    }
    return null;
  }, [novel.slug]);

  // Effect to load current episode and prefetch next one
  useEffect(() => {
    const loadAndPrefetch = async () => {
      // 1. Load data for the active episode if not already loaded
      if (!loadedEpisodesData[activeEpisode._id]) {
        setIsEpisodeLoading(true);
        const data = await fetchEpisodeDetails(activeEpisode._id);
        if (data) {
          setLoadedEpisodesData(prev => ({ ...prev, [activeEpisode._id]: data }));
        }
        setIsEpisodeLoading(false);
      } else {
        setIsEpisodeLoading(false); // Already loaded
      }

      // 2. Find current episode index in the list
      const currentEpisodeIndex = allEpisodes.findIndex(ep => ep._id === activeEpisode._id);

      // 3. If there's a next episode, pre-fetch its data
      if (currentEpisodeIndex !== -1 && currentEpisodeIndex < allEpisodes.length - 1) {
        const nextEpisode = allEpisodes[currentEpisodeIndex + 1];
        if (nextEpisode.hasAccess && !loadedEpisodesData[nextEpisode._id]) {
          const data = await fetchEpisodeDetails(nextEpisode._id);
          if (data) {
            setLoadedEpisodesData(prev => ({ ...prev, [nextEpisode._id]: data }));
          }
        }
      }
    };

    if (allEpisodes.length > 0) {
      loadAndPrefetch();
    }
  }, [activeEpisode, allEpisodes, loadedEpisodesData, fetchEpisodeDetails]);
  
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
        return [...prev, entry].slice(-100); // Keep last 100 entries
    });
  }, []);

  const handleEpisodeEnd = useCallback(async () => {
    const currentEpisodeIndex = allEpisodes.findIndex(ep => ep._id === activeEpisode._id);

    if (currentEpisodeIndex !== -1 && currentEpisodeIndex < allEpisodes.length - 1) {
      const nextEpisode = allEpisodes[currentEpisodeIndex + 1];

      if (!nextEpisode.hasAccess) {
        router.push(`/novels/${novel.slug}`);
        return;
      }

      const performTransition = (nextEp: FullEpisode, nextEpData: DetailedEpisode) => {
        setDialogueHistory([]);
        setActiveEpisode(nextEp);
        setCurrentSceneId(nextEpData.firstSceneId);
        
        const newUrl = `/read/${novel.slug}/${nextEp.episodeOrder}-${nextEp.slug}`;
        window.history.pushState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
        setIsTransitioning(false);
      };

      if (loadedEpisodesData[nextEpisode._id]) {
        performTransition(nextEpisode, loadedEpisodesData[nextEpisode._id]);
      } else {
        setIsTransitioning(true);
        const nextEpisodeData = await fetchEpisodeDetails(nextEpisode._id);
        if (nextEpisodeData) {
          setLoadedEpisodesData(prev => ({ ...prev, [nextEpisode._id]: nextEpisodeData }));
          performTransition(nextEpisode, nextEpisodeData);
        } else {
          console.error("Failed to load next episode, returning to novel page.");
          setIsTransitioning(false);
          router.push(`/novels/${novel.slug}`);
        }
      }
    } else if (currentEpisodeIndex !== -1 && currentEpisodeIndex === allEpisodes.length - 1) {
      setShowSummary(true);
    } else {
      router.push(`/novels/${novel.slug}`);
    }
  }, [allEpisodes, activeEpisode, novel.slug, router, loadedEpisodesData, fetchEpisodeDetails]);

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

  const activeEpisodeData = loadedEpisodesData[activeEpisode._id];

  return (
    <div className="w-full h-full bg-black text-white flex flex-col relative">
        {/* Main Content - Always visible */}
        <main className="flex-1 w-full h-full">
            {isSettingsLoaded && !isEpisodeLoading && activeEpisodeData ? (
            <VisualNovelContent
                key={activeEpisode._id} // Add key to force re-mount on episode change
                novel={novel}
                episodeData={activeEpisodeData}
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
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
              </div>
            )}
        </main>
      
        {/* UI Toggle Button - Always visible */}
        <motion.button
            onClick={() => setIsUiVisible(!isUiVisible)}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white transition-all"
            whileTap={{ scale: 0.9 }}
            aria-label={isUiVisible ? "Hide UI" : "Show UI"}
        >
            {isUiVisible ? <EyeOff size={20} /> : <Eye size={20} />}
        </motion.button>

        {/* Main UI (Header and Footer) */}
        <AnimatePresence>
            {isUiVisible && (
                <motion.div 
                    className='absolute inset-0 pointer-events-none'
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* Header */}
                    <header className="absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/60 to-transparent p-4 text-white pointer-events-auto">
                        <div className="flex items-center justify-between">
                            <motion.button
                                onClick={handleBackToNovel}
                                className="flex items-center gap-2 text-white hover:text-primary-foreground transition-colors group"
                                whileTap={{ scale: 0.95 }}
                            >
                                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                                <div className="text-left">
                                <h1 className="text-sm font-bold truncate">{activeEpisode.title}</h1>
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

                    {/* Footer Controls */}
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
      
        {/* Panels */}
        <AnimatePresence>
            {showHistory && <DialogueHistory isOpen={showHistory} onClose={() => setShowHistory(false)} history={dialogueHistory} />}
            {showEpisodeNav && <EpisodeNavigation isOpen={showEpisodeNav} onClose={() => setShowEpisodeNav(false)} novel={novel} currentEpisode={activeEpisode} userId={userId}/>}
            {showSettings && <ReaderSettings isOpen={showSettings} onClose={() => setShowSettings(false)} settings={settings} onSettingsChange={handleSettingsChange} onSave={handleSaveAndCloseSettings} onReset={handleResetSettings} />}
            {showStoryStatus && <StoryStatusPanel isOpen={showStoryStatus} onClose={() => setShowStoryStatus(false)} scene={currentSceneData} />}
            {showSummary && (
                <EndSummaryScreen 
                    novel={novel} 
                    backgroundUrl={currentSceneData?.background?.value}
                />
            )}
        </AnimatePresence>

        {isTransitioning && (
          <motion.div
              className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
          >
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
              <p className="mt-4 text-white">กำลังโหลดตอนต่อไป...</p>
          </motion.div>
        )}
    </div>
  );
}

// A new component for the end summary screen
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