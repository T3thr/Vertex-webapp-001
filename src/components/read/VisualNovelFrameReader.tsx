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
  Swords
} from 'lucide-react';
import VisualNovelContent, { DialogueHistoryItem } from './VisualNovelContent';
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
  const [currentSceneId, setCurrentSceneId] = useState(initialSceneId || episode.firstSceneId?.toString());
  const [currentSceneData, setCurrentSceneData] = useState<SerializedScene | null>(null);
  const [dialogueHistory, setDialogueHistory] = useState<DialogueHistoryItem[]>([]);
  
  // UI Panels and Visibility State
  const [isUiVisible, setIsUiVisible] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showEpisodeNav, setShowEpisodeNav] = useState(false);
  const [showStoryStatus, setShowStoryStatus] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<IReaderSettings>(DEFAULT_USER_SETTINGS);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
  
  // Episode Data
  const [allEpisodes, setAllEpisodes] = useState<EpisodeListItem[]>([]);
  
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

  // Fetch all episodes for navigation
  useEffect(() => {
    const fetchAllEpisodes = async () => {
        try {
            const res = await fetch(`/api/novels/${novel.slug}/episodes`);
            if (res.ok) {
                const data = await res.json();
                // Ensure IDs are strings for comparison
                const episodesWithStringIds = data.episodes.map((ep: any) => ({...ep, _id: ep._id.toString() }));
                setAllEpisodes(episodesWithStringIds);
            }
        } catch (error) {
            console.error("Failed to fetch episodes for auto-navigation:", error);
        }
    };
    fetchAllEpisodes();
  }, [userId, novel.slug]);
  
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

  const handleEpisodeEnd = useCallback(() => {
    const currentEpisodeIndex = allEpisodes.findIndex(ep => ep._id === episode._id);
    if (currentEpisodeIndex !== -1 && currentEpisodeIndex < allEpisodes.length - 1) {
      const nextEpisode = allEpisodes[currentEpisodeIndex + 1];
      router.push(`/read/${novel.slug}/${nextEpisode.episodeOrder}-${nextEpisode.slug}`);
    } else {
      router.push(`/novels/${novel.slug}`);
    }
  }, [allEpisodes, episode._id, novel.slug, router]);

  return (
    <div className="w-full h-full bg-black text-white flex flex-col relative">
        {/* Main Content - Always visible */}
        <main className="flex-1 w-full h-full">
            {isSettingsLoaded && (
            <VisualNovelContent
                novel={novel}
                episode={episode}
                currentSceneId={currentSceneId}
                isPlaying={isPlaying}
                userSettings={settings}
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
                                <h1 className="text-sm font-bold truncate">{episode.title}</h1>
                                <p className="text-xs text-white/80 truncate">{novel.title}</p>
                                </div>
                            </motion.button>
                            
                            <div className="flex items-center gap-2">
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
            {showEpisodeNav && <EpisodeNavigation isOpen={showEpisodeNav} onClose={() => setShowEpisodeNav(false)} novel={novel} currentEpisode={episode} userId={userId}/>}
            {showSettings && <ReaderSettings isOpen={showSettings} onClose={() => setShowSettings(false)} settings={settings} onSettingsChange={handleSettingsChange} onSave={handleSaveAndCloseSettings} onReset={handleResetSettings} />}
            {showStoryStatus && <StoryStatusPanel isOpen={showStoryStatus} onClose={() => setShowStoryStatus(false)} scene={currentSceneData} />}
        </AnimatePresence>
    </div>
  );
}