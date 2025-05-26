// src/components/novels/NovelEpisodesTab.tsx
// Component สำหรับแสดงรายการตอนของนิยาย
// ประกอบด้วย รายการตอน, สถานะ, ราคา, สถิติ

"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
  BookOpen
} from 'lucide-react';
import { PopulatedNovelForDetailPage } from '@/app/api/novels/[slug]/route';

// ===================================================================
// SECTION: TypeScript Interfaces
// ===================================================================

interface NovelEpisodesTabProps {
  novel: PopulatedNovelForDetailPage;
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
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3 }
  }
};

const episodeCardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3 }
  },
  hover: { 
    scale: 1.02,
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
// SECTION: Main Component
// ===================================================================

export default function NovelEpisodeTab({novel}: NovelEpisodesTabProps) {
  const [sortBy, setSortBy] = useState('episodeOrder');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);

  // ตรวจสอบข้อมูลเบื้องต้น
  if (!novel || !novel.episodes) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground mb-4">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>ยังไม่มีตอนที่เผยแพร่</p>
          <p className="text-sm mt-2">กลับมาตรวจสอบอีกครั้งในภายหลัง</p>
        </div>
      </div>
    );
  }

  // ตัวเลือกการเรียงลำดับ
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

  // เรียงลำดับตอน
  const sortedEpisodes = [...novel.episodes].sort((a, b) => {
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

  // การจัดการเปลี่ยนการเรียงลำดับ
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
      className="space-y-6"
    >
      {/* หัวข้อและตัวควบคุม */}
      <motion.div 
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        variants={itemVariants}
      >
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            รายการตอน ({novel.episodes.length})
          </h2>
          <p className="text-muted-foreground mt-1">
            เผยแพร่แล้ว {novel.publishedEpisodesCount || 0} ตอนจากทั้งหมด {novel.totalEpisodesCount || 0} ตอน
          </p>
        </div>

        {/* ตัวควบคุมการเรียงลำดับ */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">ตัวกรอง</span>
          </button>

          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="px-3 py-2 bg-secondary text-secondary-foreground rounded-lg border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
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
      </motion.div>

      {/* รายการตอน */}
      <motion.div 
        className="space-y-3"
        variants={containerVariants}
      >
        {sortedEpisodes.map((episode, index) => (
          <motion.div
            key={episode._id}
            variants={episodeCardVariants}
            whileHover="hover"
            className="group"
          >
            <Link href={`/novels/${novel.slug}/episodes/${episode.episodeOrder}`}>
              <div className="bg-secondary/30 hover:bg-secondary/50 border border-border rounded-lg p-4 transition-all duration-200 cursor-pointer">
                <div className="flex items-start gap-4">
                  {/* หมายเลขตอน */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center">
                      <span className="font-bold text-primary">
                        {episode.episodeOrder}
                      </span>
                    </div>
                  </div>

                  {/* ข้อมูลตอน */}
                  <div className="flex-grow min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-grow min-w-0">
                        {/* ชื่อตอน */}
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {episode.title}
                        </h3>

                        {/* เรื่องย่อตอน */}
                        {episode.teaserText && (
                          <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                            {episode.teaserText}
                          </p>
                        )}

                        {/* สถิติและข้อมูล */}
                        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span>{formatNumber(episode.stats?.viewsCount || 0)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="w-4 h-4" />
                            <span>{formatNumber(episode.stats?.likesCount || 0)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            <span>{formatNumber(episode.stats?.commentsCount || 0)}</span>
                          </div>
                          {episode.stats?.estimatedReadingTimeMinutes && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{formatReadingTime(episode.stats.estimatedReadingTimeMinutes)}</span>
                            </div>
                          )}
                          {episode.publishedAt && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(episode.publishedAt)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* สถานะและราคา */}
                      <div className="flex flex-col items-end gap-2">
                        {/* สถานะตอน */}
                        <div className="flex items-center gap-2">
                          {episode.accessType === 'free' ? (
                            <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-medium border border-green-500/30">
                              ฟรี
                            </span>
                          ) : episode.accessType === 'paid_unlock' ? (
                            <div className="flex items-center gap-1 bg-orange-500/20 text-orange-400 px-2 py-1 rounded text-xs font-medium border border-orange-500/30">
                              <Coins className="w-3 h-3" />
                              <span>{episode.priceCoins || 0}</span>
                            </div>
                          ) : (
                            <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-medium border border-blue-500/30">
                              {episode.accessType === 'premium_access' && 'พรีเมียม'}
                              {episode.accessType === 'early_access_paid' && 'Early Access'}
                            </span>
                          )}

                          {episode.status === 'scheduled' && (
                            <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-xs font-medium border border-purple-500/30">
                              กำหนดเวลา
                            </span>
                          )}
                        </div>

                        {/* ไอคอนเล่น */}
                        <div className="p-2 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
                          {episode.accessType === 'free' ? (
                            <Play className="w-5 h-5 text-primary" />
                          ) : (
                            <Lock className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ลูกศรชี้ไป */}
                  <div className="flex-shrink-0 self-center">
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* ข้อความเมื่อไม่มีตอน */}
      {sortedEpisodes.length === 0 && (
        <motion.div 
          className="text-center py-12"
          variants={itemVariants}
        >
          <div className="text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>ยังไม่มีตอนที่ตรงกับเงื่อนไขการค้นหา</p>
            <p className="text-sm mt-2">ลองเปลี่ยนการเรียงลำดับหรือตัวกรอง</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};