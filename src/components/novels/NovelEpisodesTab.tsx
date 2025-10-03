// src/components/novels/NovelEpisodesTab.tsx
// Component สำหรับแสดงรายการตอนของนิยาย
// ประกอบด้วย รายการตอน, สถานะ, ราคา, สถิติ และระบบซื้อตอน

"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Lock, 
  Eye, 
  Heart, 
  MessageCircle, 
  Clock, 
  Calendar,
  Coins,
  ChevronRight,
  Filter,
  SortAsc,
  SortDesc,
  BookOpen,
  Unlock,
  CreditCard,
  Sparkles,
  Crown,
  ShoppingCart,
  CheckCircle,
  Info,
  Loader2
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// ===================================================================
// SECTION: TypeScript Interfaces
// ===================================================================

interface NovelEpisodesTabProps {
  novel: any;
}

interface EpisodeAccess {
  _id: string;
  hasAccess: boolean;
  isFree: boolean;
  isOwned: boolean;
  canPurchase: boolean;
  requiresLogin: boolean;
  effectivePrice?: number;
  originalPrice?: number;
  hasPromotion?: boolean;
}

interface SortOption {
  value: string;
  label: string;
  icon: React.ReactNode;
}

// ===================================================================
// SECTION: Animation Variants
// ===================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3 }
  }
};

const episodeCardVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3 }
  },
  hover: { 
    x: 5,
    transition: { duration: 0.2 }
  }
};

// ===================================================================
// SECTION: Helper Functions
// ===================================================================

/**
 * ฟังก์ชันสำหรับแปลงตัวเลขให้อ่านง่าย
 */
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

/**
 * ฟังก์ชันสำหรับแปลงวันที่ให้อ่านง่าย
 */
const formatDate = (dateString?: string): string => {
  if (!dateString) return 'ไม่ระบุ';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 1) return 'วันนี้';
  if (diffDays <= 7) return `${diffDays} วันที่แล้ว`;
  if (diffDays <= 30) return `${Math.floor(diffDays / 7)} สัปดาห์ที่แล้ว`;
  
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * ฟังก์ชันสำหรับแปลงเวลาอ่าน
 */
const formatReadingTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} นาที`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} ชั่วโมง`;
  }
  return `${hours} ชม. ${remainingMinutes} นาที`;
};

// ===================================================================
// SECTION: Purchase Dialog Component
// ===================================================================

interface PurchaseDialogProps {
  episode: any;
  episodeAccess: EpisodeAccess;
  novelSlug: string;
  onClose: () => void;
  onPurchaseSuccess: () => void;
}

function PurchaseDialog({ episode, episodeAccess, novelSlug, onClose, onPurchaseSuccess }: PurchaseDialogProps) {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handlePurchase = async () => {
    setIsPurchasing(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/novels/${novelSlug}/episodes/${episode._id}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to purchase episode');
      }
      
      // Purchase successful
      onPurchaseSuccess();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsPurchasing(false);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-background border border-border rounded-xl max-w-md w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold mb-4">ซื้อตอนนี้</h3>
        
        <div className="space-y-4">
          <div className="bg-secondary/50 rounded-lg p-4">
            <p className="font-medium mb-1">{episode.title}</p>
            <p className="text-sm text-muted-foreground">ตอนที่ {episode.episodeOrder}</p>
          </div>
          
          <div className="flex items-center justify-between py-3">
            <span className="text-muted-foreground">ราคา</span>
            <div className="flex items-center gap-2">
              {episodeAccess.hasPromotion && episodeAccess.originalPrice && (
                <span className="line-through text-muted-foreground text-sm">
                  {episodeAccess.originalPrice}
                </span>
              )}
              <div className="flex items-center gap-1 text-lg font-bold">
                <Coins className="w-5 h-5 text-yellow-500" />
                <span>{episodeAccess.effectivePrice}</span>
              </div>
            </div>
          </div>
          
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
              {error}
            </div>
          )}
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isPurchasing}
              className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              onClick={handlePurchase}
              disabled={isPurchasing}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPurchasing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังซื้อ...</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  <span>ซื้อเลย</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ===================================================================
// SECTION: Episode Card Component
// ===================================================================

interface EpisodeCardProps {
  episode: any;
  novel: any;
  index: number;
}

function EpisodeCard({ episode, novel, index }: EpisodeCardProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [episodeAccess, setEpisodeAccess] = useState<EpisodeAccess | null>(null);
  const [isLoadingAccess, setIsLoadingAccess] = useState(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);

  // Check episode access on mount and when session changes
  useEffect(() => {
    checkEpisodeAccess();
  }, [session]);

  const checkEpisodeAccess = async () => {
    setIsLoadingAccess(true);
    try {
      const response = await fetch(`/api/novels/${novel.slug}/episodes/${episode._id}/access`);
      const data = await response.json();
      
      if (response.ok) {
        setEpisodeAccess({
          _id: episode._id,
          hasAccess: data.access.hasAccess,
          isFree: data.access.isFree,
          isOwned: data.access.isOwned,
          canPurchase: data.access.canPurchase,
          requiresLogin: data.access.requiresLogin,
          effectivePrice: data.episode.effectivePrice,
          originalPrice: data.episode.originalPrice,
          hasPromotion: data.episode.hasPromotion
        });
      }
    } catch (error) {
      console.error('Error checking episode access:', error);
    } finally {
      setIsLoadingAccess(false);
    }
  };

  const handleEpisodeClick = (e: React.MouseEvent) => {
    // Use Thai slug directly from database without encoding
    const episodeSlug = episode.slug || 'no-slug';
    const readUrl = `/read/${novel.slug}/${episode.episodeOrder}-${episodeSlug}`;
    
    console.log('🔗 Navigating to:', readUrl);
    console.log('📝 Episode slug from DB:', episodeSlug);
    
    if (!episodeAccess) {
      // Navigate directly if no access info yet - server will handle access control
      router.push(readUrl);
      return;
    }
    
    if (episodeAccess.hasAccess) {
      // Can read - navigate to reading page
      router.push(readUrl);
    } else if (episodeAccess.requiresLogin) {
      // Need to login
      e.preventDefault();
      router.push('/signin');
    } else if (episodeAccess.canPurchase) {
      // Can purchase - show dialog
      e.preventDefault();
      setShowPurchaseDialog(true);
    } else {
      // Fallback - let server handle it
      router.push(readUrl);
    }
  };

  const handlePurchaseSuccess = () => {
    setShowPurchaseDialog(false);
    checkEpisodeAccess(); // Refresh access status
    // Use Thai slug directly from database
    const episodeSlug = episode.slug || 'no-slug';
    const readUrl = `/read/${novel.slug}/${episode.episodeOrder}-${episodeSlug}`;
    console.log('🛒 After purchase, navigating to:', readUrl);
    router.push(readUrl);
  };

  const getAccessButton = () => {
    // Show appropriate button based on episode access type, with real-time handling
    if (episodeAccess?.hasAccess) {
      return (
        <div className="p-2 bg-green-500/20 rounded-full group-hover:bg-green-500/30 transition-colors">
          <Play className="w-5 h-5 text-green-500" />
        </div>
      );
    }

    if (episode.accessType === 'free' || episodeAccess?.isFree) {
      return (
        <div className="p-2 bg-primary/20 rounded-full group-hover:bg-primary/30 transition-colors">
          <Play className="w-5 h-5 text-primary" />
        </div>
      );
    }

    return (
      <div className="p-2 bg-orange-500/20 rounded-full group-hover:bg-orange-500/30 transition-colors">
        <Lock className="w-5 h-5 text-orange-500" />
      </div>
    );
  };

  const getAccessBadge = () => {
    // Show badge based on available information, real-time without loading
    if (episodeAccess?.isOwned) {
      return (
        <div className="flex items-center gap-1 bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-medium border border-green-500/30">
          <CheckCircle className="w-3 h-3" />
          <span>เป็นเจ้าของ</span>
        </div>
      );
    }

    if (episode.accessType === 'free' || episodeAccess?.isFree) {
      return (
        <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-medium border border-green-500/30">
          ฟรี
        </span>
      );
    }

    if (episode.accessType === 'premium_access') {
      return (
        <div className="flex items-center gap-1 bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full text-xs font-medium border border-purple-500/30">
          <Crown className="w-3 h-3" />
          <span>พรีเมียม</span>
        </div>
      );
    }

    if (episode.accessType === 'early_access_paid') {
      return (
        <div className="flex items-center gap-1 bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full text-xs font-medium border border-blue-500/30">
          <Sparkles className="w-3 h-3" />
          <span>Early Access</span>
        </div>
      );
    }

    // Show price from episode data or episodeAccess
    const priceToShow = episodeAccess?.effectivePrice ?? episode.priceCoins;
    const originalPrice = episodeAccess?.originalPrice ?? episode.originalPriceCoins;
    
    if (priceToShow && priceToShow > 0) {
      return (
        <div className="flex items-center gap-1 bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full text-xs font-medium border border-orange-500/30">
          <Coins className="w-3 h-3" />
          <span>{priceToShow}</span>
          {originalPrice && originalPrice > priceToShow && (
            <span className="line-through text-xs opacity-60">{originalPrice}</span>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <motion.div
        key={episode._id}
        variants={episodeCardVariants}
        whileHover="hover"
        className="group"
      >
        <div 
          onClick={handleEpisodeClick}
          className="bg-card hover:bg-card/80 border border-border rounded-xl p-4 sm:p-5 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
        >
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Episode Number - Responsive */}
            <div className="flex-shrink-0 hidden sm:block">
              <div className="w-12 h-12 lg:w-14 lg:h-14 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
                <span className="font-bold text-primary text-lg">
                  {episode.episodeOrder}
                </span>
              </div>
            </div>

            {/* Mobile Episode Number */}
            <div className="flex-shrink-0 sm:hidden">
              <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center">
                <span className="font-bold text-primary text-sm">
                  {episode.episodeOrder}
                </span>
              </div>
            </div>

            {/* Episode Content - Responsive */}
            <div className="flex-grow min-w-0">
              <div className="flex items-start justify-between gap-2 sm:gap-4">
                <div className="flex-grow min-w-0">
                  {/* Title and Description */}
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 text-sm sm:text-base">
                    {episode.title}
                  </h3>

                  {episode.teaserText && (
                    <p className="text-muted-foreground text-xs sm:text-sm mt-1 line-clamp-2 sm:line-clamp-3">
                      {episode.teaserText}
                    </p>
                  )}

                  {/* Stats - Responsive Grid */}
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-4 mt-3 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>{formatNumber(episode.stats?.viewsCount || 0)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>{formatNumber(episode.stats?.likesCount || 0)}</span>
                    </div>
                    {episode.stats?.estimatedReadingTimeMinutes && (
                      <div className="flex items-center gap-1 col-span-2 sm:col-span-1">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>{formatReadingTime(episode.stats.estimatedReadingTimeMinutes)}</span>
                      </div>
                    )}
                    {episode.publishedAt && (
                      <div className="flex items-center gap-1 hidden sm:flex">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden lg:inline">{formatDate(episode.publishedAt)}</span>
                        <span className="lg:hidden">{formatDate(episode.publishedAt).split(' ')[0]}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Access Status and Button - Responsive */}
                <div className="flex flex-col items-end gap-2">
                  <div className="hidden sm:block">
                    {getAccessBadge()}
                  </div>
                  
                  {getAccessButton()}
                </div>
              </div>

              {/* Mobile Access Badge */}
              <div className="mt-3 sm:hidden">
                {getAccessBadge()}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Purchase Dialog */}
      <AnimatePresence>
        {showPurchaseDialog && episodeAccess && (
          <PurchaseDialog
            episode={episode}
            episodeAccess={episodeAccess}
            novelSlug={novel.slug}
            onClose={() => setShowPurchaseDialog(false)}
            onPurchaseSuccess={handlePurchaseSuccess}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ===================================================================
// SECTION: Main Component
// ===================================================================

export default function NovelEpisodeTab({ novel }: NovelEpisodesTabProps) {
  const [sortBy, setSortBy] = useState('episodeOrder');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [filterAccessType, setFilterAccessType] = useState<string>('all');

  // Check data
  if (!novel || !novel.episodes || novel.episodes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground mb-4">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">ยังไม่มีตอนที่เผยแพร่</p>
          <p className="text-sm mt-2">กลับมาตรวจสอบอีกครั้งในภายหลัง</p>
        </div>
      </div>
    );
  }

  // Sort options
  const sortOptions: SortOption[] = [
    {
      value: 'episodeOrder',
      label: 'ลำดับตอน',
      icon: <SortAsc className="w-4 h-4" />
    },
    {
      value: 'publishedAt',
      label: 'วันที่เผยแพร่',
      icon: <Calendar className="w-4 h-4" />
    },
    {
      value: 'viewsCount',
      label: 'ยอดชม',
      icon: <Eye className="w-4 h-4" />
    },
    {
      value: 'likesCount',
      label: 'ยอดไลค์',
      icon: <Heart className="w-4 h-4" />
    }
  ];

  // Filter episodes
  const filteredEpisodes = novel.episodes.filter((episode: any) => {
    if (filterAccessType === 'all') return true;
    if (filterAccessType === 'free') return episode.accessType === 'free';
    if (filterAccessType === 'paid') return episode.accessType !== 'free';
    return true;
  });

  // Sort episodes
  const sortedEpisodes = [...filteredEpisodes].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'episodeOrder':
        aValue = a.episodeOrder;
        bValue = b.episodeOrder;
        break;
      case 'publishedAt':
        aValue = new Date(a.publishedAt || 0).getTime();
        bValue = new Date(b.publishedAt || 0).getTime();
        break;
      case 'viewsCount':
        aValue = a.stats?.viewsCount || 0;
        bValue = b.stats?.viewsCount || 0;
        break;
      case 'likesCount':
        aValue = a.stats?.likesCount || 0;
        bValue = b.stats?.likesCount || 0;
        break;
      default:
        aValue = a.episodeOrder;
        bValue = b.episodeOrder;
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const handleSortChange = (newSortBy: string) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 sm:space-y-6"
    >
      {/* Header and Controls - Responsive */}
      <motion.div 
        className="space-y-4"
        variants={itemVariants}
      >
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            รายการตอน ({novel.episodes.length})
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            เผยแพร่แล้ว {novel.publishedEpisodesCount || 0} ตอนจากทั้งหมด {novel.totalEpisodesCount || 0} ตอน
          </p>
        </div>

        {/* Controls - Responsive */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm"
          >
            <Filter className="w-4 h-4" />
            <span>ตัวกรอง</span>
          </button>

          {/* Sort Controls */}
          <div className="flex gap-2 flex-1">
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
              className="flex-1 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
          </button>
        </div>
        </div>

        {/* Filters - Responsive */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    ประเภทการเข้าถึง
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'all', label: 'ทั้งหมด' },
                      { value: 'free', label: 'ฟรี' },
                      { value: 'paid', label: 'ต้องซื้อ' }
                    ].map((filter) => (
                      <button
                        key={filter.value}
                        onClick={() => setFilterAccessType(filter.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          filterAccessType === filter.value
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Episodes List - Responsive */}
      <motion.div 
        className="space-y-3"
        variants={containerVariants}
      >
        {sortedEpisodes.map((episode: any, index: number) => (
          <EpisodeCard
            key={episode._id}
            episode={episode}
            novel={novel}
            index={index}
          />
        ))}
      </motion.div>

      {/* No episodes message */}
      {sortedEpisodes.length === 0 && (
        <motion.div 
          className="text-center py-12"
          variants={itemVariants}
        >
          <div className="text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">ยังไม่มีตอนที่ตรงกับเงื่อนไขการค้นหา</p>
            <p className="text-sm mt-2">ลองเปลี่ยนการเรียงลำดับหรือตัวกรอง</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}