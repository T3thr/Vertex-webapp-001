"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Clock, Lock, Eye, ChevronDown } from 'lucide-react';

interface Episode {
  _id: string;
  title: string;
  episodeOrder: number;
  publishedAt: string;
  teaserText?: string;
  accessType: 'free' | 'paid_unlock' | 'premium_access' | 'ad_supported_free' | 'early_access_paid';
  priceCoins: number;
  stats: {
    viewsCount: number;
    likesCount: number;
    estimatedReadingTimeMinutes: number;
  };
  firstSceneId?: string;
}

interface EpisodeSelectorProps {
  novelSlug: string;
  novelId: string;
  buttonClassName?: string;
  buttonText?: string;
}

export default function EpisodeSelector({ 
  novelSlug, 
  novelId, 
  buttonClassName,
  buttonText = "เริ่มอ่าน"
}: EpisodeSelectorProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch episodes when dropdown opens
  useEffect(() => {
    if (isOpen && episodes.length === 0) {
      fetchEpisodes();
    }
  }, [isOpen]);

  const fetchEpisodes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/novels/${novelSlug}/episodes`);
      if (response.ok) {
        const data = await response.json();
        setEpisodes(data.episodes || []);
      }
    } catch (error) {
      console.error('Error fetching episodes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) return 'วันนี้';
    if (diffDays <= 7) return `${diffDays} วันที่แล้ว`;
    if (diffDays <= 30) return `${Math.floor(diffDays / 7)} สัปดาห์ที่แล้ว`;
    
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getAccessIcon = (accessType: Episode['accessType']) => {
    switch (accessType) {
      case 'paid_unlock':
      case 'premium_access':
      case 'early_access_paid':
        return <Lock className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getAccessText = (accessType: Episode['accessType'], priceCoins: number) => {
    switch (accessType) {
      case 'paid_unlock':
        return `${priceCoins} เหรียญ`;
      case 'premium_access':
        return 'Premium';
      case 'early_access_paid':
        return 'Early Access';
      case 'ad_supported_free':
        return 'ฟรี (มีโฆษณา)';
      default:
        return 'ฟรี';
    }
  };

  // If only one episode or no episodes, show simple button
  if (episodes.length <= 1 && !isLoading) {
    const firstEpisode = episodes[0];
    if (!firstEpisode) {
      return (
        <button 
          disabled
          className="bg-gray-500 text-white px-6 py-3 rounded-lg font-medium cursor-not-allowed flex items-center gap-2"
        >
          <Play className="w-5 h-5" />
          ยังไม่มีตอน
        </button>
      );
    }

    return (
      <Link href={`/novels/${novelSlug}/read/${firstEpisode._id}`}>
        <motion.button 
          className={buttonClassName || "bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Play className="w-5 h-5" />
          {buttonText}
        </motion.button>
      </Link>
    );
  }

  return (
    <div className="relative">
      {/* Main Button */}
      <motion.button 
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClassName || "bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Play className="w-5 h-5" />
        {buttonText}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Episodes List */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 mt-2 w-96 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden"
            >
              <div className="p-3 border-b border-border">
                <h3 className="font-semibold text-foreground">เลือกตอนที่ต้องการอ่าน</h3>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {isLoading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    กำลังโหลด...
                  </div>
                ) : episodes.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    ยังไม่มีตอนที่เผยแพร่
                  </div>
                ) : (
                  episodes.map((episode, index) => (
                    <Link 
                      key={episode._id}
                      href={`/novels/${novelSlug}/read/${episode._id}`}
                      onClick={() => setIsOpen(false)}
                    >
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 hover:bg-secondary/50 transition-colors border-b border-border last:border-b-0 cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                ตอนที่ {episode.episodeOrder}
                              </span>
                              {getAccessIcon(episode.accessType)}
                            </div>
                            
                            <h4 className="font-medium text-foreground line-clamp-1">
                              {episode.title}
                            </h4>
                            
                            {episode.teaserText && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {episode.teaserText}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {formatNumber(episode.stats.viewsCount)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {episode.stats.estimatedReadingTimeMinutes} นาที
                              </div>
                              <span>{formatDate(episode.publishedAt)}</span>
                            </div>
                          </div>
                          
                          <div className="ml-3 text-right">
                            <div className="text-xs text-muted-foreground">
                              {getAccessText(episode.accessType, episode.priceCoins)}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  ))
                )}
              </div>

              {episodes.length > 0 && (
                <div className="p-3 border-t border-border bg-secondary/30">
                  <p className="text-xs text-muted-foreground text-center">
                    ทั้งหมด {episodes.length} ตอน
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
} 