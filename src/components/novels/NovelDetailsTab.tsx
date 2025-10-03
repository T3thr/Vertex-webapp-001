// src/components/novels/NovelDetailsTab.tsx
// Component สำหรับแสดงรายละเอียดเชิงลึกของนิยาย
// ประกอบด้วย เรื่องยาว, หมวดหมู่, แท็ก, คำเตือน, ข้อมูลเพิ่มเติม

"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  Globe, 
  Tag, 
  AlertTriangle, 
  Heart, 
  Eye, 
  MessageCircle, 
  User,
  BookOpen,
  Star,
  TrendingUp,
  Info
} from 'lucide-react';
import TagBadge from './TagBadge';

// ===================================================================
// SECTION: TypeScript Interfaces
// ===================================================================

interface NovelDetailsTabProps {
  novel: any;
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

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4 }
  }
};

const statsCardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3 }
  },
  hover: { 
    scale: 1.05,
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

export default function NovelDetailsTab({novel}:NovelDetailsTabProps) {
  // ตรวจสอบข้อมูลเบื้องต้น
  if (!novel) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">
          <Info className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>ไม่พบข้อมูลรายละเอียดนิยาย</p>
        </div>
      </div>
    );
  }

  // เตรียมข้อมูลที่จะแสดง
  const stats = novel.stats || {};
  const themeAssignment = novel.themeAssignment || {};
  const sourceType = novel.sourceType || {};

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* เรื่องยาว/คำโปรย */}
      {novel.longDescription && (
        <motion.section variants={sectionVariants}>
          <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            คำโปรย
          </h3>
          <div className="bg-secondary/30 rounded-lg p-6">
            <div className="prose prose-sm max-w-none text-foreground">
              <div 
                className="whitespace-pre-wrap leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: novel.longDescription.replace(/\n/g, '<br />') 
                }}
              />
            </div>
          </div>
        </motion.section>
      )}

      {/* สถิติรายละเอียด */}
      <motion.section variants={sectionVariants}>
        <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          สถิติโดยละเอียด
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div 
            variants={statsCardVariants}
            whileHover="hover"
            className="bg-secondary/30 rounded-lg p-4 text-center border border-border"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Eye className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">ยอดชม</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {formatNumber(stats.viewsCount || 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              ผู้อ่านเฉพาะ: {formatNumber(stats.uniqueViewersCount || 0)}
            </div>
          </motion.div>

          <motion.div 
            variants={statsCardVariants}
            whileHover="hover"
            className="bg-secondary/30 rounded-lg p-4 text-center border border-border"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Heart className="w-5 h-5 text-red-500" />
              <span className="text-sm text-muted-foreground">ไลค์</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {formatNumber(stats.likesCount || 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              บุ๊คมาร์ค: {formatNumber(stats.bookmarksCount || 0)}
            </div>
          </motion.div>

          <motion.div 
            variants={statsCardVariants}
            whileHover="hover"
            className="bg-secondary/30 rounded-lg p-4 text-center border border-border"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <MessageCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-muted-foreground">ความคิดเห็น</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {formatNumber(stats.commentsCount || 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              การแชร์: {formatNumber(stats.sharesCount || 0)}
            </div>
          </motion.div>

          <motion.div 
            variants={statsCardVariants}
            whileHover="hover"
            className="bg-secondary/30 rounded-lg p-4 text-center border border-border"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <User className="w-5 h-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">ติดตาม</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {formatNumber(stats.followersCount || 0)}
            </div>
            {stats.averageRating && stats.averageRating > 0 && (
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-1">
                <Star className="w-3 h-3 text-yellow-400 fill-current" />
                <span>{stats.averageRating.toFixed(1)}</span>
                <span>({formatNumber(stats.ratingsCount || 0)})</span>
              </div>
            )}
          </motion.div>
        </div>
      </motion.section>

      {/* หมวดหมู่และแท็ก */}
      <motion.section variants={sectionVariants}>
        <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Tag className="w-5 h-5 text-primary" />
          หมวดหมู่และแท็ก
        </h3>
        <div className="space-y-4">
          {/* หมวดหมู่หลัก */}
          {themeAssignment.mainTheme && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">หมวดหมู่หลัก</h4>
              <TagBadge 
                category={themeAssignment.mainTheme.categoryId}
                customName={themeAssignment.mainTheme.customName}
                size="lg"
              />
            </div>
          )}

          {/* หมวดหมู่รอง */}
          {themeAssignment.subThemes && themeAssignment.subThemes.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">หมวดหมู่รอง</h4>
              <div className="flex flex-wrap gap-2">
                {themeAssignment.subThemes.map((subTheme: any, index: number) => (
                  <TagBadge 
                    key={index}
                    category={subTheme.categoryId}
                    customName={subTheme.customName}
                  />
                ))}
              </div>
            </div>
          )}

          {/* อารมณ์และโทน */}
          {themeAssignment.moodAndTone && themeAssignment.moodAndTone.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">อารมณ์และโทน</h4>
              <div className="flex flex-wrap gap-2">
                {themeAssignment.moodAndTone.map((mood: any, index: number) => (
                  <TagBadge 
                    key={index}
                    category={mood}
                    variant="mood"
                  />
                ))}
              </div>
            </div>
          )}

          {/* แท็กที่กำหนดเอง */}
          {themeAssignment.customTags && themeAssignment.customTags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">แท็กเพิ่มเติม</h4>
              <div className="flex flex-wrap gap-2">
                {themeAssignment.customTags.map((tag: any, index: number) => (
                  <span 
                    key={index}
                    className="px-3 py-1 bg-accent/20 text-accent border border-accent/30 rounded-full text-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.section>

      {/* คำเตือนเนื้อหา */}
      {themeAssignment.contentWarnings && themeAssignment.contentWarnings.length > 0 && (
        <motion.section variants={sectionVariants}>
          <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            คำเตือนเนื้อหา
          </h3>
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
            <div className="flex flex-wrap gap-2">
              {themeAssignment.contentWarnings.map((warning: any, index: number) => (
                <TagBadge 
                  key={index}
                  category={warning}
                  variant="warning"
                />
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* ข้อมูลทั่วไป */}
      <motion.section variants={sectionVariants}>
        <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-primary" />
          ข้อมูลทั่วไป
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* คอลัมน์ซ้าย */}
          <div className="space-y-4">
            <div className="bg-secondary/30 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-3">ข้อมูลการเผยแพร่</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">เผยแพร่:</span>
                  <span className="text-foreground">{formatDate(novel.publishedAt?.toString())}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">อัปเดตล่าสุด:</span>
                  <span className="text-foreground">{formatDate(novel.lastContentUpdatedAt?.toString())}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">ภาษา:</span>
                  <span className="text-foreground">{novel.language?.name || 'ไม่ระบุ'}</span>
                </div>
              </div>
            </div>

            {/* ข้อมูลจำนวน */}
            <div className="bg-secondary/30 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-3">ขนาดเนื้อหา</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">จำนวนตอนทั้งหมด:</span>
                  <span className="text-foreground font-medium">{novel.totalEpisodesCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">เผยแพร่แล้ว:</span>
                  <span className="text-foreground font-medium">{novel.publishedEpisodesCount || 0}</span>
                </div>
                {stats.totalWords && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">จำนวนคำรวม:</span>
                    <span className="text-foreground font-medium">{formatNumber(stats.totalWords)}</span>
                  </div>
                )}
                {stats.estimatedReadingTimeMinutes && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">เวลาอ่านโดยประมาณ:</span>
                    <span className="text-foreground font-medium">{formatReadingTime(stats.estimatedReadingTimeMinutes)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* คอลัมน์ขวา */}
          <div className="space-y-4">
            {/* ข้อมูลประเภท */}
            <div className="bg-secondary/30 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-3">ประเภทเนื้อหา</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ประเภท:</span>
                  <span className="text-foreground font-medium">
                    {sourceType.type === 'original' && 'นิยายต้นฉบับ'}
                    {sourceType.type === 'fan_fiction' && 'แฟนฟิกชัน'}
                    {sourceType.type === 'translation' && 'นิยายแปล'}
                    {sourceType.type === 'adaptation' && 'นิยายดัดแปลง'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">สถานะ:</span>
                  <span className="text-foreground font-medium">
                    {novel.isCompleted ? 'จบแล้ว' : 'กำลังดำเนินเรื่อง'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ประเภทตอนจบ:</span>
                  <span className="text-foreground font-medium">
                    {novel.endingType === 'single_ending' && 'จบเดียว'}
                    {novel.endingType === 'multiple_endings' && 'หลายตอนจบ'}
                    {novel.endingType === 'open_ending' && 'ปลายเปิด'}
                    {novel.endingType === 'ongoing' && 'ยังไม่จบ'}
                  </span>
                </div>
              </div>
            </div>

            {/* เรตติ้งอายุ */}
            {novel.ageRatingCategoryId && (
              <div className="bg-secondary/30 rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-3">เรตติ้งอายุ</h4>
                <TagBadge 
                  category={novel.ageRatingCategoryId}
                  variant="age"
                  size="lg"
                />
              </div>
            )}

            {/* ข้อมูลการเข้าถึง */}
            <div className="bg-secondary/30 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-3">การเข้าถึง</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ระดับการเข้าถึง:</span>
                  <span className="text-foreground font-medium">
                    {novel.accessLevel === 'public' && 'สาธารณะ'}
                    {novel.accessLevel === 'unlisted' && 'ไม่อยู่ในรายการ'}
                    {novel.accessLevel === 'private' && 'ส่วนตัว'}
                    {novel.accessLevel === 'followers_only' && 'เฉพาะผู้ติดตาม'}
                    {novel.accessLevel === 'premium_only' && 'เฉพาะสมาชิกพรีเมียม'}
                  </span>
                </div>
                {novel.monetizationSettings?.isCoinBasedUnlock && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ระบบเหรียญ:</span>
                    <span className="text-green-400 font-medium">เปิดใช้งาน</span>
                  </div>
                )}
                {novel.monetizationSettings?.allowDonations && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">รับบริจาค:</span>
                    <span className="text-green-400 font-medium">เปิดใช้งาน</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ข้อมูลผู้เขียน */}
      {novel.author && (
        <motion.section variants={sectionVariants}>
          <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            เกี่ยวกับผู้เขียน
          </h3>
          <div className="bg-secondary/30 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="flex-grow">
                <Link 
                  href={`/u/${novel.author.username || ''}`}
                  className="text-lg font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  {novel.author.profile?.penNames?.join(', ') || novel.author.profile?.displayName || novel.author.username}
                </Link>
                {novel.author.profile?.bio && (
                  <p className="text-muted-foreground mt-2 leading-relaxed">
                    {novel.author.profile.bio}
                  </p>
                )}
                {novel.author.writerStats && (
                  <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      <span>{novel.author.writerStats.totalNovelsPublished} นิยาย</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{formatNumber(novel.author.writerStats.totalViewsAcrossAllNovels)} ยอดชม</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      <span>{formatNumber(novel.author.writerStats.totalLikesReceivedOnNovels)} ไลค์</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.section>
      )}
    </motion.div>
  );
};