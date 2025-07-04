'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Settings, 
  Bookmark, 
  BookmarkCheck,
  Volume2, 
  VolumeX,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  List,
  Eye,
  Heart,
  Clock,
  MessageCircle
} from 'lucide-react';
import VisualNovelContent from './VisualNovelContent';
import DialogueHistory from './DialogueHistory';
import EpisodeNavigation from './EpisodeNavigation';
import ReaderSettings from './ReaderSettings';

interface Novel {
  _id: string;
  title: string;
  slug: string;
  coverImageUrl?: string;
  synopsis?: string;
  author: {
    _id: string;
    username: string;
    primaryPenName: string;
    avatarUrl: string;
  };
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
  stats?: {
    viewsCount: number;
    likesCount: number;
    commentsCount: number;
    estimatedReadingTimeMinutes: number;
    totalWords: number;
  };
}

interface DialogueHistoryItem {
    id: string;
    sceneId: string;
    sceneOrder: number;
    characterName?: string;
    dialogueText: string;
}

interface VisualNovelFrameReaderProps {
  novel: Novel;
  episode: Episode;
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
  const frameRef = useRef<HTMLDivElement>(null);
  
  // สถานะของ reader
  const [isPlaying, setIsPlaying] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showEpisodeNav, setShowEpisodeNav] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [currentSceneId, setCurrentSceneId] = useState(initialSceneId || episode.firstSceneId);
  const [readingProgress, setReadingProgress] = useState(0);
  const [dialogueHistory, setDialogueHistory] = useState<DialogueHistoryItem[]>([]);
  const [allEpisodes, setAllEpisodes] = useState<Episode[]>([]);
  
  // การตั้งค่าการอ่าน
  const [autoPlay, setAutoPlay] = useState(false);
  const [textSpeed, setTextSpeed] = useState(2);
  const [fontSize, setFontSize] = useState(16);
  const [bgOpacity, setBgOpacity] = useState(0.8);
  
  // ตรวจสอบสถานะ bookmark
  useEffect(() => {
    if (userId) {
      // TODO: เรียก API เพื่อตรวจสอบสถานะ bookmark
      setIsBookmarked(false);
    }
  }, [userId, episode._id]);

  // Fetch all episodes for navigation
  useEffect(() => {
    const fetchAllEpisodes = async () => {
        try {
            const response = await fetch(`/api/novels/${novel.slug}/episodes`);
            if (!response.ok) {
                throw new Error('Failed to fetch episodes for navigation');
            }
            const data = await response.json();
            setAllEpisodes(data.episodes);
        } catch (error) {
            console.error(error);
        }
    };
    fetchAllEpisodes();
  }, [novel.slug]);

  // ฟังก์ชันการควบคุม
  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleBookmark = useCallback(async () => {
    if (!userId) return;
    
    try {
      // TODO: เรียก API สำหรับ bookmark
      setIsBookmarked(!isBookmarked);
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    }
  }, [userId, isBookmarked]);

  const handleBackToNovel = useCallback(() => {
    router.push(`/novels/${novel.slug}`);
  }, [router, novel.slug]);

  const handleDialogueEntry = useCallback((entry: DialogueHistoryItem) => {
    setDialogueHistory(prev => {
        if (prev.find(item => item.id === entry.id)) {
            return prev;
        }
        return [...prev, entry];
    });
  }, []);

  const handleNextEpisode = useCallback(() => {
    if (allEpisodes.length === 0) return;
    
    const currentEpisodeIndex = allEpisodes.findIndex(ep => ep._id === episode._id);
    
    if (currentEpisodeIndex !== -1 && currentEpisodeIndex < allEpisodes.length - 1) {
        const nextEpisode = allEpisodes[currentEpisodeIndex + 1];
        const nextEpisodeSlug = `${nextEpisode.episodeOrder}-${nextEpisode.slug}`;
        router.push(`/read/${novel.slug}/${nextEpisodeSlug}`);
    } else {
        // End of the novel, navigate back to the novel's main page
        router.push(`/novels/${novel.slug}`);
    }
  }, [allEpisodes, episode._id, novel.slug, router]);

  const handlePreviousEpisode = useCallback(() => {
    if (allEpisodes.length === 0) return;

    const currentEpisodeIndex = allEpisodes.findIndex(ep => ep._id === episode._id);

    if (currentEpisodeIndex > 0) {
        const prevEpisode = allEpisodes[currentEpisodeIndex - 1];
        const prevEpisodeSlug = `${prevEpisode.episodeOrder}-${prevEpisode.slug}`;
        router.push(`/read/${novel.slug}/${prevEpisodeSlug}`);
    } else {
        // Already at the first episode, do nothing or show a message
        console.log('Already at the first episode.');
    }
  }, [allEpisodes, episode._id, novel.slug, router]);

  return (
    <div className="vn-reader h-full bg-background">
      {/* คอนเทนเนอร์หลักสำหรับ Frame */}
      <div className="h-full flex items-center justify-center p-2 sm:p-4 lg:py-8">
        {/* Visual Novel Frame - Responsive */}
        <div 
          ref={frameRef}
          className="vn-frame relative w-full h-full lg:max-w-6xl lg:aspect-video bg-card rounded-none lg:rounded-2xl overflow-hidden shadow-2xl border-0 lg:border border-border"
          data-responsive="true"
        >
          {/* Header สำหรับเดสก์ท็อป */}
          <div className="hidden lg:block absolute top-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border">
            <div className="flex items-center justify-between px-6 py-4">
              {/* ฝั่งซ้าย - ปุ่มกลับ */}
              <div className="flex items-center">
                <button
                  onClick={handleBackToNovel}
                  className="flex items-center gap-3 text-card-foreground hover:text-primary transition-colors group"
                >
                  <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                  <div className="text-left">
                    <div className="text-sm font-medium">{novel.title}</div>
                    <div className="text-xs text-muted-foreground">กลับไปหน้านิยาย</div>
                  </div>
                </button>
              </div>
              
              {/* ตรงกลาง - ชื่อตอน */}
              <div className="flex-1 text-center mx-8">
                <h1 className="text-card-foreground text-lg font-bold">{episode.title}</h1>
                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mt-1">
                  <span>ตอนที่ {episode.episodeOrder}</span>
                  <span className="flex items-center gap-1">
                    <Eye size={14} />
                    {episode.stats?.viewsCount || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart size={14} />
                    {episode.stats?.likesCount || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {episode.stats?.estimatedReadingTimeMinutes || 10} นาที
                  </span>
                </div>
              </div>
              
              {/* ฝั่งขวา - ปุ่มควบคุม */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBookmark}
                  className={`p-2 rounded-lg transition-colors ${
                    isBookmarked 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary hover:bg-secondary/80 text-card-foreground'
                  }`}
                >
                  {isBookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                </button>
                
                <button
                  onClick={() => setShowEpisodeNav(true)}
                  className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-card-foreground transition-colors"
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Header สำหรับมือถือ - ติดกับ frame เท่านั้น */}
          <div className="lg:hidden absolute top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={handleBackToNovel}
                className="flex items-center gap-2 text-card-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft size={18} />
                <span className="text-sm font-medium">กลับ</span>
              </button>
              
              <div className="flex-1 text-center px-4">
                <h1 className="text-card-foreground text-sm font-semibold truncate">{episode.title}</h1>
                <p className="text-muted-foreground text-xs">ตอนที่ {episode.episodeOrder}</p>
              </div>
              
              <button
                onClick={() => setShowEpisodeNav(true)}
                className="text-card-foreground hover:text-primary transition-colors p-2"
              >
                <List size={18} />
              </button>
            </div>
          </div>

          {/* พื้นที่เนื้อหาหลัก */}
          <div className="absolute inset-0 top-16 lg:top-[74px] bottom-[88px]">
            <VisualNovelContent
              novel={novel}
              episode={episode}
              currentSceneId={currentSceneId}
              isPlaying={isPlaying}
              autoPlay={autoPlay}
              textSpeed={textSpeed}
              fontSize={fontSize}
              bgOpacity={bgOpacity}
              onSceneChange={setCurrentSceneId}
              onProgressChange={setReadingProgress}
              onDialogueEntry={handleDialogueEntry}
              onEpisodeEnd={handleNextEpisode}
              userId={userId}
            />
          </div>

          {/* แถบควบคุมด้านล่าง - ไม่รบกวนเนื้อหา */}
          <div className="absolute bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-t border-border">
            <div className="px-6 py-4">
              {/* ปุ่มควบคุม */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePreviousEpisode}
                    className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-card-foreground transition-colors"
                    title="ตอนก่อนหน้า"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  
                  <button
                    onClick={handlePlayPause}
                    className={`p-3 rounded-lg transition-colors ${
                      isPlaying 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary hover:bg-secondary/80 text-card-foreground'
                    }`}
                    title={isPlaying ? "หยุดชั่วคราว" : "เล่นอัตโนมัติ"}
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                  </button>
                  
                  <button
                    onClick={handleNextEpisode}
                    className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-card-foreground transition-colors"
                    title="ตอนถัดไป"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowHistory(true)}
                    className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-card-foreground transition-colors"
                    title="ประวัติการสนทนา"
                  >
                    <MessageCircle size={18} />
                  </button>
                  
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-2 rounded-lg transition-colors ${
                      isMuted 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary hover:bg-secondary/80 text-card-foreground'
                    }`}
                    title={isMuted ? "เปิดเสียง" : "ปิดเสียง"}
                  >
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                  
                  <button
                    onClick={() => setShowSettings(true)}
                    className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-card-foreground transition-colors"
                    title="ตั้งค่า"
                  >
                    <Settings size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Components */}
      <AnimatePresence>
        {showSettings && (
          <ReaderSettings
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            textSpeed={textSpeed}
            onTextSpeedChange={setTextSpeed}
            fontSize={fontSize}
            onFontSizeChange={setFontSize}
            bgOpacity={bgOpacity}
            onBgOpacityChange={setBgOpacity}
            autoPlay={autoPlay}
            onAutoPlayChange={setAutoPlay}
          />
        )}

        {showHistory && (
          <DialogueHistory
            isOpen={showHistory}
            onClose={() => setShowHistory(false)}
            history={dialogueHistory}
          />
        )}

        {showEpisodeNav && (
          <EpisodeNavigation
            isOpen={showEpisodeNav}
            onClose={() => setShowEpisodeNav(false)}
            novel={novel}
            currentEpisode={episode}
            userId={userId}
          />
        )}
      </AnimatePresence>
    </div>
  );
} 