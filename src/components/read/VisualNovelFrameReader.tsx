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
import VisualNovelContent, { DialogueHistoryItem, DetailedEpisode } from './VisualNovelContent';
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
  firstSceneId?: string;
  stats?: IEpisodeStats;
};

// The page provides a serialized, populated version of IEpisode
type FullEpisode = Pick<IEpisode, 'slug' | 'title' | 'episodeOrder' | 'accessType' | 'priceCoins' | 'originalPriceCoins' | 'teaserText'> & {
  _id: string;
  firstSceneId?: string;
  stats?: IEpisodeStats;
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
  allEpisodes: DetailedEpisode[];
  initialSceneId?: string;
  userId?: string;
}

export default function VisualNovelFrameReader({ 
  novel, 
  episode: initialEpisode, 
  allEpisodes,
  initialSceneId, 
  userId 
}: VisualNovelFrameReaderProps) {
  const router = useRouter();
  const readerRef = useRef<HTMLDivElement>(null);

  // Core Reader State
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentEpisode, setCurrentEpisode] = useState<DetailedEpisode>(() => allEpisodes.find(ep => ep._id === initialEpisode._id)!);
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
  
  // Episode data is now from props
  const episodeListForNav = allEpisodes.map((ep: DetailedEpisode) => ({
      _id: ep._id,
      title: ep.title,
      slug: ep.slug,
      episodeOrder: ep.episodeOrder,
      accessType: ep.accessType,
      effectivePrice: ep.priceCoins || 0,
      originalPrice: ep.originalPriceCoins || ep.priceCoins || 0,
      hasAccess: !!ep.scenes, // Has scenes means has access
      isOwned: !!ep.scenes && ep.accessType !== 'free', // A simplification
      isFree: ep.accessType === 'free',
      teaserText: ep.teaserText,
      stats: {
          viewsCount: ep.stats?.viewsCount || 0,
          likesCount: ep.stats?.likesCount || 0,
          estimatedReadingTimeMinutes: ep.stats?.estimatedReadingTimeMinutes || 10
      }
  }));
  
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

  // ✅ Disable context menu on the reader
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const readerElement = readerRef.current;
    if (readerElement) {
      readerElement.addEventListener('contextmenu', handleContextMenu);
      return () => {
        readerElement.removeEventListener('contextmenu', handleContextMenu);
      };
    }
  }, []);

  const handleRefreshData = () => {
    router.refresh();
  };

  const handleEpisodeChange = useCallback((episodeId: string) => {
    const newEpisode = allEpisodes.find(ep => ep._id === episodeId);
    
    if (newEpisode && newEpisode.scenes && newEpisode.scenes.length > 0) {
      setCurrentEpisode(newEpisode);
      setCurrentSceneId(newEpisode.firstSceneId?.toString());
      setDialogueHistory([]); // Reset history

      // Update URL without full page reload
      const newUrl = `/read/${novel.slug}/${newEpisode.episodeOrder}-${newEpisode.slug}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
    } else {
      console.warn(`Attempted to switch to inaccessible or invalid episode: ${episodeId}`);
      // Optionally, show a paywall or an error message
    }
  }, [allEpisodes, novel.slug]);

  // ✅ [แก้ไข] นำ logic การ save settings กลับมา
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
    const newSettings = DEFAULT_USER_SETTINGS;
    setSettings(newSettings);
    debouncedSaveSettings(newSettings);
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

  const handleEpisodeEnd = useCallback(() => {
    const currentEpisodeIndex = allEpisodes.findIndex(ep => ep._id === currentEpisode._id);
    if (currentEpisodeIndex !== -1 && currentEpisodeIndex < allEpisodes.length - 1) {
      const nextEpisode = allEpisodes[currentEpisodeIndex + 1];
      // Check if the next episode is accessible (has scenes)
      if (nextEpisode.scenes && nextEpisode.scenes.length > 0) {
        handleEpisodeChange(nextEpisode._id);
      } else {
        setShowSummary(true); // Or show paywall for next episode
      }
    } else if (currentEpisodeIndex !== -1 && currentEpisodeIndex === allEpisodes.length - 1) {
      setShowSummary(true);
    } else {
      router.push(`/novels/${novel.slug}`);
    }
  }, [allEpisodes, currentEpisode._id, novel.slug, router, handleEpisodeChange]);

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
    setSettings(newSettings);
    handleSettingsChange(newSettings);
  };

  return (
    <div ref={readerRef} className="w-full h-full bg-black text-white flex flex-col relative no-select">
        {/* Main Content - Always visible */}
        <main className="flex-1 w-full h-full">
            {isSettingsLoaded && currentEpisode && (
            <VisualNovelContent
                novel={novel}
                episode={currentEpisode}
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
            {showEpisodeNav && <EpisodeNavigation isOpen={showEpisodeNav} onClose={() => setShowEpisodeNav(false)} novel={novel} currentEpisode={initialEpisode} userId={userId} episodes={episodeListForNav} onEpisodeSelect={handleEpisodeChange} onRefresh={handleRefreshData} />}
            {showSettings && <ReaderSettings isOpen={showSettings} onClose={handleSaveAndCloseSettings} settings={settings} onSettingsChange={handleSettingsChange} onSave={handleSaveAndCloseSettings} onReset={handleResetSettings} />}
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