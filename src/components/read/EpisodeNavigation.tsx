'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { X, Play, Lock, Crown, Clock, Eye, Heart, Coins } from 'lucide-react';
import type { IEpisode, IEpisodeStats } from '@/backend/models/Episode';
import type { INovel } from '@/backend/models/Novel';

// --- Aligned Types ---
// These types match the props passed down from VisualNovelFrameReader.
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

interface EpisodeNavigationProps {
  isOpen: boolean;
  onClose: () => void;
  novel: DisplayNovel;
  currentEpisode: FullEpisode;
  userId?: string;
  episodes: EpisodeListItem[];
  onEpisodeSelect: (episodeId: string) => void;
  onRefresh: () => void;
}

export interface EpisodeListItem {
  _id: string;
  title: string;
  slug: string;
  episodeOrder: number;
  accessType: string;
  effectivePrice: number;
  originalPrice: number;
  hasAccess: boolean;
  isOwned: boolean;
  isFree: boolean;
  teaserText?: string;
  stats: {
    viewsCount: number;
    likesCount: number;
    estimatedReadingTimeMinutes: number;
  };
}

export default function EpisodeNavigation({ 
  isOpen, 
  onClose, 
  novel, 
  currentEpisode, 
  userId,
  episodes,
  onEpisodeSelect,
  onRefresh
}: EpisodeNavigationProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [purchasingEpisode, setPurchasingEpisode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEpisodeClick = (episode: EpisodeListItem) => {
    if (episode.hasAccess) {
      onEpisodeSelect(episode._id);
      onClose();
    } else if (!userId) {
      router.push('/signin');
    }
  };

  const handlePurchase = async (episodeId: string, novelSlug: string) => {
    if (!userId) {
      router.push('/signin');
      return;
    }

    setPurchasingEpisode(episodeId);
    setError(null);
    try {
      const response = await fetch(`/api/novels/${novelSlug}/episodes/${episodeId}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'เกิดข้อผิดพลาดในการซื้อ');
      }

      // ซื้อสำเร็จ, โหลดข้อมูลตอนใหม่และนำทาง
      onRefresh();
      
      const purchasedEpisode = episodes.find(ep => ep._id === episodeId);
      if (purchasedEpisode) {
        onEpisodeSelect(episodeId);
        onClose();
      } else {
        onRefresh();
      }
    } catch (error: any) {
      console.error('Purchase failed:', error);
      setError(error.message || 'เกิดข้อผิดพลาดในการซื้อ');
    } finally {
      setPurchasingEpisode(null);
    }
  };

  const getAccessIcon = (episode: EpisodeListItem) => {
    if (episode.hasAccess) {
      return <Play size={16} className="text-green-600 dark:text-green-400" />;
    }
    if (episode.accessType === 'early_access_paid') {
      return <Crown size={16} className="text-yellow-600 dark:text-yellow-400" />;
    }
    return <Lock size={16} className="text-muted-foreground" />;
  };

  const getAccessBadge = (episode: EpisodeListItem) => {
    if (episode.isOwned) {
      return (
        <span className="bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-1 rounded-full text-xs border border-green-500/30">
          เป็นเจ้าของ
        </span>
      );
    }
    if (episode.isFree) {
      return (
        <span className="bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full text-xs border border-blue-500/30">
          ฟรี
        </span>
      );
    }
    if (episode.accessType === 'early_access_paid') {
      return (
        <span className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-2 py-1 rounded-full text-xs border border-yellow-500/30">
          Early Access
        </span>
      );
    }
    return (
      <span className="bg-muted text-muted-foreground px-2 py-1 rounded-full text-xs border border-border">
        เสียเงิน
      </span>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-y-0 left-0 z-50 w-full max-w-lg bg-card border-r border-border"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h2 className="text-card-foreground text-lg font-semibold">{novel.title}</h2>
                <p className="text-muted-foreground text-sm">รายการตอน</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-card-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {episodes.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {episodes.map((episode, index) => {
                    const isCurrentEpisode = episode._id === currentEpisode._id;
                    const isPurchasing = purchasingEpisode === episode._id;
                    
                    return (
                      <motion.div
                        key={episode._id}
                        className={`
                          relative bg-secondary/50 border rounded-lg p-4 transition-all cursor-pointer
                          ${isCurrentEpisode 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border hover:border-primary/40 hover:bg-secondary'
                          }
                        `}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleEpisodeClick(episode)}
                      >
                        {/* Current episode indicator */}
                        {isCurrentEpisode && (
                          <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-primary rounded-r"></div>
                        )}

                        <div className="flex items-start gap-3">
                          {/* Episode number & access icon */}
                          <div className="flex flex-col items-center gap-1 min-w-[40px]">
                            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-sm font-semibold text-primary">
                              {episode.episodeOrder}
                            </div>
                            {getAccessIcon(episode)}
                          </div>

                          {/* Episode content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-card-foreground font-medium truncate">{episode.title}</h3>
                              {getAccessBadge(episode)}
                            </div>

                            {/* Teaser */}
                            {episode.teaserText && (
                              <p className="text-muted-foreground text-sm line-clamp-2 mb-2">
                                {episode.teaserText}
                              </p>
                            )}

                            {/* Stats */}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                              <span className="flex items-center gap-1">
                                <Eye size={12} />
                                {episode.stats.viewsCount}
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart size={12} />
                                {episode.stats.likesCount}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {episode.stats.estimatedReadingTimeMinutes} นาที
                              </span>
                            </div>

                            {/* Purchase section */}
                            {!episode.hasAccess && episode.effectivePrice > 0 && (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-yellow-600 dark:text-yellow-400 text-sm font-semibold">
                                    {episode.effectivePrice} Coins
                                  </span>
                                  {episode.originalPrice > episode.effectivePrice && (
                                    <span className="text-muted-foreground text-xs line-through">
                                      {episode.originalPrice}
                                    </span>
                                  )}
                                </div>
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePurchase(episode._id, novel.slug);
                                  }}
                                  disabled={isPurchasing}
                                  className="px-3 py-1 bg-primary text-primary-foreground text-xs rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                  {isPurchasing ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent"></div>
                                  ) : (
                                    <>
                                      <Coins size={12} />
                                      ซื้อ
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 