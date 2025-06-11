// src/components/novels/NovelHeader.tsx
// Component สำหรับแสดงส่วนหัวของหน้ารายละเอียดนิยาย
// ประกอบด้วย ปกนิยาย, ชื่อ, ผู้เขียน, สถิติ, ปุ่มต่างๆ

"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Play, 
  Heart, 
  BookmarkPlus, 
  Share2, 
  Star, 
  Eye, 
  MessageCircle,
  Clock,
  Calendar,
  User,
  Crown,
  Award
} from 'lucide-react';
import { PopulatedNovelForDetailPage } from '@/app/api/novels/[slug]/route';

// ===================================================================
// SECTION: TypeScript Interfaces
// ===================================================================

interface NovelHeaderProps {
  novel: PopulatedNovelForDetailPage;
}

// ===================================================================
// SECTION: Animation Variants
// ===================================================================

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

const imageVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.5 }
  }
};

// ===================================================================
// SECTION: Helper Functions
// ===================================================================

/**
 * ฟังก์ชันสำหรับแปลงตัวเลขให้อ่านง่าย (เช่น 1500 -> 1.5K)
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

// ===================================================================
// SECTION: Main Component
// ===================================================================

export default function NovelHeader({ novel }: NovelHeaderProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [imageError, setImageError] = useState(false);

  // ตรวจสอบข้อมูลเบื้องต้น
  if (!novel) {
    return (
      <div className="bg-card text-card-foreground p-8 rounded-lg">
        <div className="text-center text-muted-foreground">
          ไม่พบข้อมูลนิยาย
        </div>
      </div>
    );
  }
  // เตรียมข้อมูลที่จะแสดง
  const authorName = novel.author?.profile?.penNames?.join(', ') || 
                    novel.author?.profile?.displayName || 
                    novel.author?.username || 
                    'นักเขียนนิรนาม';

  const mainTheme = novel.themeAssignment?.mainTheme?.categoryId?.name || 'ไม่ระบุหมวดหมู่';
  const mainThemeColor = novel.themeAssignment?.mainTheme?.categoryId?.color || '#5495ff';

  const coverImage = novel.coverImageUrl || '/images/default-novel-cover.png';
  const authorAvatar = novel.author?.profile?.avatarUrl || '/images/default-avatar.png';

  // สถิติ
  const stats = novel.stats || {};
  const viewsCount = stats.viewsCount || 0;
  const likesCount = stats.likesCount || 0;
  const commentsCount = stats.commentsCount || 0;
  const followersCount = stats.followersCount || 0;
  const averageRating = stats.averageRating || 0;
  const ratingsCount = stats.ratingsCount || 0;

  // วันที่
  const publishedDate = formatDate(novel.publishedAt?.toString());
  const lastUpdated = formatDate(novel.lastContentUpdatedAt?.toString());

  // การจัดการปุ่ม
  const handleLike = () => {
    setIsLiked(!isLiked);
    // TODO: เชื่อมต่อ API สำหรับกดไลค์
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    // TODO: เชื่อมต่อ API สำหรับบุ๊คมาร์ค
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: novel.title,
          text: novel.synopsis,
          url: window.location.href,
        });
      } else {
        // Fallback: คัดลอก URL
        await navigator.clipboard.writeText(window.location.href);
        // TODO: แสดง toast notification
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <motion.div 
      className="relative bg-card text-card-foreground overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Background Gradient */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          background: `linear-gradient(135deg, ${mainThemeColor}40 0%, transparent 50%)`
        }}
      />

      <div className="relative z-10 container-custom py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* ส่วนรูปปก */}
          <motion.div 
            className="lg:col-span-1"
            variants={imageVariants}
          >
            <div className="relative group">
              <div className="aspect-[3/4] relative rounded-lg overflow-hidden shadow-lg">
                <Image
                  src={imageError ? '/images/default-novel-cover.png' : coverImage}
                  alt={`ปกนิยาย ${novel.title}`}
                  fill
                  className="object-cover transition-transform group-hover:scale-105 duration-300"
                  onError={() => setImageError(true)}
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  priority
                />
                
                {/* Overlay สำหรับปุ่ม Play */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <motion.button
                    className="bg-primary text-primary-foreground p-4 rounded-full hover:bg-primary/90 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Play className="w-8 h-8 ml-1" />
                  </motion.button>
                </div>
              </div>

              {/* สถานะนิยาย */}
              <div className="absolute top-3 left-3">
                <span 
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    novel.status === 'published' 
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                      : novel.status === 'completed'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                  }`}
                >
                  {novel.status === 'published' && 'กำลังเผยแพร่'}
                  {novel.status === 'completed' && 'เสมชนัน'}
                  {novel.status === 'draft' && 'ร่าง'}
                  {novel.status === 'scheduled' && 'ตั้งเวลาแล้ว'}
                </span>
              </div>

              {/* คะแนนเฉลี่ย */}
              {averageRating > 0 && (
                <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-white font-semibold">
                      {averageRating.toFixed(1)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* ส่วนข้อมูลหลัก */}
          <motion.div 
            className="lg:col-span-2 space-y-6"
            variants={itemVariants}
          >
            {/* ชื่อเรื่องและผู้เขียน */}
            <div className="space-y-4">
              <motion.h1 
                className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight"
                variants={itemVariants}
              >
                {novel.title}
              </motion.h1>
              
              <motion.div 
                className="flex items-center gap-3"
                variants={itemVariants}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 relative rounded-full overflow-hidden">
                    <Image
                      src={authorAvatar}
                      alt={`โปรไฟล์ ${authorName}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-col">
                    <Link 
                      href={`/u/${novel.author?.username || ''}`}
                      className="text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      {authorName}
                    </Link>
                    {novel.author?.writerStats && (
                      <span className="text-sm text-muted-foreground">
                        {novel.author.writerStats.totalNovelsPublished} นิยาย
                      </span>
                    )}
                  </div>
                </div>

                {/* Badge หมวดหมู่หลัก */}
                <div 
                  className="px-3 py-1 rounded-full text-sm font-medium border"
                  style={{
                    backgroundColor: `${mainThemeColor}20`,
                    borderColor: `${mainThemeColor}40`,
                    color: mainThemeColor
                  }}
                >
                  {mainTheme}
                </div>
              </motion.div>
            </div>

            {/* เรื่องย่อ */}
            <motion.div 
              className="space-y-3"
              variants={itemVariants}
            >
              <h3 className="text-lg font-semibold text-foreground">เรื่องย่อ</h3>
              <p className="text-muted-foreground leading-relaxed line-clamp-4">
                {novel.synopsis}
              </p>
            </motion.div>

            {/* สถิติและข้อมูล */}
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
              variants={itemVariants}
            >
              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">การดู</span>
                </div>
                <div className="text-lg font-bold text-foreground">
                  {formatNumber(viewsCount)}
                </div>
              </div>

              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-muted-foreground">ไลค์</span>
                </div>
                <div className="text-lg font-bold text-foreground">
                  {formatNumber(likesCount)}
                </div>
              </div>

              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <MessageCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">ความคิดเห็น</span>
                </div>
                <div className="text-lg font-bold text-foreground">
                  {formatNumber(commentsCount)}
                </div>
              </div>

              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <User className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-muted-foreground">ติดตาม</span>
                </div>
                <div className="text-lg font-bold text-foreground">
                  {formatNumber(followersCount)}
                </div>
              </div>
            </motion.div>

            {/* ข้อมูลวันที่ */}
            <motion.div 
              className="flex flex-wrap gap-4 text-sm text-muted-foreground"
              variants={itemVariants}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>เผยแพร่: {publishedDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>อัปเดตล่าสุด: {lastUpdated}</span>
              </div>
            </motion.div>

            {/* ปุ่มการกระทำ */}
            <motion.div 
              className="flex flex-wrap gap-3"
              variants={itemVariants}
            >
              {/* ปุ่มเริ่มอ่าน */}
              <Link href={`/novels/${novel.slug}/read`}>
                <motion.button 
                  className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Play className="w-5 h-5" />
                  เริ่มอ่าน
                </motion.button>
              </Link>

              {/* ปุ่มไลค์ */}
              <motion.button 
                onClick={handleLike}
                className={`px-4 py-3 rounded-lg border transition-colors flex items-center gap-2 ${
                  isLiked 
                    ? 'bg-red-500/20 border-red-500/40 text-red-400' 
                    : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                ถูกใจ
              </motion.button>

              {/* ปุ่มบุ๊คมาร์ค */}
              <motion.button 
                onClick={handleBookmark}
                className={`px-4 py-3 rounded-lg border transition-colors flex items-center gap-2 ${
                  isBookmarked 
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' 
                    : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <BookmarkPlus className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
                บันทึก
              </motion.button>

              {/* ปุ่มแชร์ */}
              <motion.button 
                onClick={handleShare}
                className="px-4 py-3 rounded-lg border bg-secondary border-border text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Share2 className="w-5 h-5" />
                แชร์
              </motion.button>
            </motion.div>

            {/* ข้อมูลเพิ่มเติม */}
            {(novel.totalEpisodesCount > 0 || novel.publishedEpisodesCount > 0) && (
              <motion.div 
                className="flex items-center gap-6 text-sm text-muted-foreground pt-4 border-t border-border"
                variants={itemVariants}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">ตอนทั้งหมด:</span>
                  <span>{novel.totalEpisodesCount || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">เผยแพร่แล้ว:</span>
                  <span>{novel.publishedEpisodesCount || 0}</span>
                </div>
                {novel.stats?.totalWords && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">จำนวนคำ:</span>
                    <span>{formatNumber(novel.stats.totalWords)}</span>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};