// app/novels/[slug]/overview/components/NovelHeader.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Book, Eye, Heart, MessageCircle, Star, Clock, Users, Calendar } from 'lucide-react';
import type { NovelData } from '../page';

interface NovelHeaderProps {
  novel: NovelData;
}

/**
 * NovelHeader - คอมโพเนนต์สำหรับแสดงข้อมูลหลักของนิยาย
 * รวมถึงรูปปก ชื่อเรื่อง เรื่องย่อ และข้อมูลสำคัญ
 */
export default function NovelHeader({ novel }: NovelHeaderProps) {
  // ฟังก์ชันสำหรับแปลงตัวเลขให้อ่านง่าย
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // ฟังก์ชันสำหรับแปลงวันที่
  const formatDate = (date: string | undefined): string => {
    if (!date) return 'ไม่ระบุ';
    return new Date(date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // ฟังก์ชันสำหรับแปลงเวลาอ่าน
  const formatReadingTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} นาที`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} ชม. ${remainingMinutes > 0 ? `${remainingMinutes} นาที` : ''}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-card border border-border rounded-xl p-6 shadow-md"
    >
      <div className="flex flex-col lg:flex-row gap-6">
        {/* รูปปกนิยาย */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="flex-shrink-0"
        >
          <div className="relative group cursor-pointer">
            {novel.coverImageUrl ? (
              <img
                src={novel.coverImageUrl}
                alt={`ปกนิยาย ${novel.title}`}
                className="w-32 h-44 lg:w-40 lg:h-56 object-cover rounded-lg border border-border shadow-lg transition-shadow group-hover:shadow-xl"
              />
            ) : (
              <div className="w-32 h-44 lg:w-40 lg:h-56 bg-muted border border-border rounded-lg flex items-center justify-center">
                <Book className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
            
            {/* ป้ายสถานะ */}
            <div className="absolute top-2 left-2">
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  novel.status === 'published'
                    ? 'bg-alert-success text-alert-success-foreground'
                    : novel.status === 'completed'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                }`}
              >
                {novel.status === 'published' && 'เผยแพร่แล้ว'}
                {novel.status === 'completed' && 'จบแล้ว'}
                {novel.status === 'draft' && 'ฉบับร่าง'}
                {novel.status === 'ongoing' && 'กำลังเขียน'}
              </span>
            </div>

            {/* ป้ายจำนวนตอน */}
            <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md">
              <span className="text-xs font-medium text-foreground">
                {novel.publishedEpisodesCount}/{novel.totalEpisodesCount} ตอน
              </span>
            </div>
          </div>
        </motion.div>

        {/* ข้อมูลนิยาย */}
        <div className="flex-1 space-y-4">
          {/* ชื่อเรื่องและผู้เขียน */}
          <div>
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-2xl lg:text-3xl font-bold text-foreground mb-2"
            >
              {novel.title}
            </motion.h1>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3 text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                {novel.author.profile.avatarUrl ? (
                  <img
                    src={novel.author.profile.avatarUrl}
                    alt={novel.author.profile.displayName || 'ผู้เขียน'}
                    className="w-6 h-6 rounded-full border border-border"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                    <Users className="w-3 h-3 text-muted-foreground" />
                  </div>
                )}
                <span className="text-sm">
                  {(novel.author.profile.penNames && novel.author.profile.penNames.length > 0 
                    ? novel.author.profile.penNames[0] 
                    : novel.author.profile.displayName) || 'ไม่ระบุชื่อ'}
                </span>
              </div>
            </motion.div>
          </div>

          {/* เรื่องย่อ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-2"
          >
            <h3 className="text-sm font-semibold text-foreground">เรื่องย่อ</h3>
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
              {novel.synopsis}
            </p>
          </motion.div>

          {/* สถิติย่อ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <div className="flex items-center gap-2 text-sm">
              <Eye className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">
                {formatNumber(novel.stats.viewsCount)} ครั้ง
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Heart className="w-4 h-4 text-red-500" />
              <span className="text-muted-foreground">
                {formatNumber(novel.stats.likesCount)}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <MessageCircle className="w-4 h-4 text-blue-500" />
              <span className="text-muted-foreground">
                {formatNumber(novel.stats.commentsCount || 0)}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-muted-foreground">
                {novel.stats.averageRating.toFixed(1)}
              </span>
            </div>
          </motion.div>

          {/* ข้อมูลเพิ่มเติม */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap gap-4 text-xs text-muted-foreground"
          >
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>เวลาอ่าน: {formatReadingTime(novel.stats.estimatedReadingTimeMinutes)}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>ผู้ติดตาม: {formatNumber(novel.stats.followersCount)}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>อัปเดตล่าสุด: {formatDate(novel.stats.lastPublishedEpisodeAt?.toString())}</span>
            </div>
          </motion.div>

          {/* แท็กและหมวดหมู่ */}
          {novel.themeAssignment.customTags && novel.themeAssignment.customTags.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex flex-wrap gap-2"
            >
              {novel.themeAssignment.customTags.slice(0, 5).map((tag: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined, index: React.Key | null | undefined) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs bg-accent text-accent-foreground rounded-full"
                >
                  {tag}
                </span>
              ))}
              {novel.themeAssignment.customTags.length > 5 && (
                <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded-full">
                  +{novel.themeAssignment.customTags.length - 5} อีก
                </span>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}