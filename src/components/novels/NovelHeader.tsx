// src/components/novels/NovelHeader.tsx
// Client Component สำหรับส่วนหัวของหน้านิยาย (Hero Section)
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
// อ้างอิง PopulatedNovelForDetailPage จากตำแหน่งที่ถูกต้อง (API Route)
import { PopulatedNovelForDetailPage } from "@/app/api/novels/[slug]/route";
import {
  Star, Eye, Heart, Users, BookOpen, Play, Bookmark, Share2, Clock, UsersRound, // เพิ่ม UsersRound
} from "lucide-react";
import { TagBadge } from "./TagBadge"; // ตรวจสอบว่า path ถูกต้อง
import { formatDistanceToNowStrict, format } from "date-fns"; // เพิ่ม format
import { th } from "date-fns/locale";

interface NovelHeaderProps {
  novel: PopulatedNovelForDetailPage;
}

// ฟังก์ชัน format วันที่ให้อ่านง่าย (ปรับปรุง)
const formatDate = (dateInput?: Date | string | null): string => {
  if (!dateInput) return "ไม่มีข้อมูล";
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "วันที่ไม่ถูกต้อง";

    if (new Date().getFullYear() === date.getFullYear()) {
      return formatDistanceToNowStrict(date, { addSuffix: true, locale: th });
    }
    return format(date, "d MMM yy", { locale: th }); // ปรับ format เป็น d MMM yy
  } catch (e) {
    console.error("Error formatting date:", e);
    return "วันที่ไม่ถูกต้อง";
  }
};

export function NovelHeader({ novel }: NovelHeaderProps) {
  const authorDisplayName = novel.author?.profile?.penName || novel.author?.profile?.displayName || novel.author?.username || "ไม่ระบุชื่อผู้แต่ง";
  const authorAvatar = novel.author?.profile?.avatarUrl || "/images/default-avatar.png";
  const coverImageSrc = novel.coverImageUrl || "/images/placeholder-cover.webp";
  const bannerImageSrc = novel.bannerImageUrl;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 },
    },
  };

  const firstEpisodePath = novel.firstEpisodeSlug ? `/play/${novel.slug}/${novel.firstEpisodeSlug}` : undefined;
  const lastUpdateTime = novel.lastContentUpdatedAt || novel.updatedAt;

  return (
    <motion.div
      className="relative pt-16 pb-8 md:pt-24 md:pb-12 overflow-hidden bg-gradient-to-b from-background via-background to-secondary/30 dark:to-secondary/10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Background Image */}
      {(bannerImageSrc || coverImageSrc) && (
        <motion.div
          className="absolute inset-0 z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <Image
            src={bannerImageSrc || coverImageSrc}
            alt={`ภาพพื้นหลังเบลอของ ${novel.title}`}
            fill
            quality={50}
            className="object-cover opacity-10 dark:opacity-5 blur-xl scale-110"
            priority
            onError={(e) => { (e.target as HTMLImageElement).src = "/images/placeholder-banner.webp"; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
        </motion.div>
      )}

      {/* Content */}
      <div className="container-custom relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
          {/* Cover Image */}
          <motion.div
            className="md:col-span-1 lg:col-span-1 flex justify-center md:justify-start"
            variants={itemVariants}
          >
            <div className="relative w-48 h-72 md:w-full md:h-auto md:aspect-[2/3.1] rounded-lg overflow-hidden shadow-lg border-2 border-border/50">
              <Image
                src={coverImageSrc}
                alt={`ปกนิยาย ${novel.title}`}
                fill
                quality={85}
                className="object-cover"
                sizes="(max-width: 768px) 192px, (max-width: 1024px) 20vw, 25vw"
                priority
                onError={(e) => { (e.target as HTMLImageElement).src = "/images/placeholder-cover.webp"; }}
              />
              {/* Discount Badge */}
              {novel.monetizationSettings?.activePromotion?.isActive &&
                new Date(novel.monetizationSettings.activePromotion.promotionEndDate || 0) >= new Date() &&
                (novel.monetizationSettings.activePromotion.promotionStartDate ? new Date(novel.monetizationSettings.activePromotion.promotionStartDate) <= new Date() : true) &&
                novel.monetizationSettings.activePromotion.promotionalPriceCoins !== undefined &&
                (
                 <motion.div
                    className="absolute top-2 right-2 bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md"
                    initial={{ scale: 0, rotate: -15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.5 }}
                 >
                    ลดราคา!
                 </motion.div>
              )}
            </div>
          </motion.div>

          {/* Novel Details */}
          <motion.div
            className="md:col-span-2 lg:col-span-3 flex flex-col justify-between"
            variants={containerVariants}
          >
            <div>
              {/* Title */}
              <motion.h1
                className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground mb-2 leading-tight"
                variants={itemVariants}
              >
                {novel.title}
              </motion.h1>

              {/* Author */}
              <motion.div className="flex items-center gap-2 mb-4 text-muted-foreground" variants={itemVariants}>
                {novel.author?.username ? (
                    <Link href={`/u/${novel.author.username}`} className="flex items-center gap-2 hover:text-primary transition-colors"> {/* แก้ไข path เป็น /u/username */}
                    <Image
                        src={authorAvatar}
                        alt={`รูปโปรไฟล์ ${authorDisplayName}`}
                        width={24}
                        height={24}
                        className="rounded-full border border-border"
                        onError={(e) => { (e.target as HTMLImageElement).src = "/images/default-avatar.png"; }}
                    />
                    <span className="text-sm font-medium">{authorDisplayName}</span>
                    </Link>
                ) : (
                    <div className="flex items-center gap-2">
                        <Image
                            src={authorAvatar}
                            alt={`รูปโปรไฟล์ ${authorDisplayName}`}
                            width={24}
                            height={24}
                            className="rounded-full border border-border"
                            onError={(e) => { (e.target as HTMLImageElement).src = "/images/default-avatar.png"; }}
                        />
                        <span className="text-sm font-medium">{authorDisplayName}</span>
                    </div>
                )}
                <span className="text-xs">• อัปเดตล่าสุด {formatDate(lastUpdateTime)}</span>
              </motion.div>

              {/* Stats */}
              <motion.div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-sm text-muted-foreground" variants={itemVariants}>
                <span className="flex items-center gap-1" title={`${novel.formattedAverageRating} ดาว (${novel.rawStats?.ratingsCount || 0} รีวิว)`}>
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span>{novel.formattedAverageRating ?? 'N/A'}</span>
                </span>
                <span className="flex items-center gap-1" title={`${novel.formattedViewsCount} ยอดเข้าชม`}>
                  <Eye className="w-4 h-4" />
                  <span>{novel.formattedViewsCount}</span>
                </span>
                <span className="flex items-center gap-1" title={`${novel.formattedLikesCount} ไลค์`}>
                  <Heart className="w-4 h-4" />
                  <span>{novel.formattedLikesCount}</span>
                </span>
                <span className="flex items-center gap-1" title={`${novel.formattedFollowersCount} ผู้ติดตาม`}>
                  <Users className="w-4 h-4" />
                  <span>{novel.formattedFollowersCount}</span>
                </span>
                <span className="flex items-center gap-1" title={`${novel.publishedEpisodesCount} / ${novel.totalEpisodesCount} ตอน`}>
                  <BookOpen className="w-4 h-4" />
                  <span>{novel.publishedEpisodesCount ?? 0}/{novel.totalEpisodesCount ?? 0} ตอน</span>
                </span>
                {/* แสดงจำนวนตัวละคร */}
                {novel.charactersList && novel.charactersList.length > 0 && (
                    <span className="flex items-center gap-1" title={`มีตัวละคร ${novel.charactersList.length} ตัว`}>
                      <UsersRound className="w-4 h-4" />
                      <span>{novel.charactersList.length} ตัวละคร</span>
                    </span>
                )}
                 <span className="flex items-center gap-1" title={`อัปเดตล่าสุด ${formatDate(lastUpdateTime)}`}>
                  <Clock className="w-4 h-4" />
                  <span>{formatDate(lastUpdateTime)}</span>
                 </span>
              </motion.div>

              {/* Categories & Tags */}
              <motion.div className="flex flex-wrap gap-2 mb-5" variants={itemVariants}>
                {novel.mainThemeCategory && (
                  <TagBadge key={novel.mainThemeCategory._id.toString()} text={novel.mainThemeCategory.name} type="category" slug={novel.mainThemeCategory.slug} />
                )}
                {/* แสดง Sub-genres ไม่เกิน 2 */}
                {novel.subThemeCategories?.slice(0, 2).map((cat) => (
                  <TagBadge key={cat._id.toString()} text={cat.name} type="category" slug={cat.slug} variant="secondary" />
                ))}
                 {/* แสดง Mood & Tone ไม่เกิน 1 */}
                 {novel.moodAndToneCategories?.slice(0,1).map((cat) => (
                  <TagBadge key={cat._id.toString()} text={cat.name} type="category" slug={cat.slug} variant="secondary" />
                ))}
                {/* แสดง Custom Tags ไม่เกิน 3 */}
                {novel.customTags?.slice(0, 3).map((tag) => (
                  <TagBadge key={tag} text={tag} type="tag" />
                ))}
              </motion.div>
            </div>

             {/* Action Buttons */}
             <motion.div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0" variants={itemVariants}>
              {firstEpisodePath ? (
                <Link
                    href={firstEpisodePath}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 ease-in-out bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 hover:shadow-primary/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                >
                    <Play className="w-5 h-5" />
                    <span>{novel.firstEpisodeSlug ? "เริ่มอ่าน" : "ยังไม่มีตอน"}</span>
                </Link>
              ) : (
                <button
                    type="button"
                    disabled
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 ease-in-out bg-muted text-muted-foreground shadow-none opacity-50 cursor-not-allowed"
                >
                    <Play className="w-5 h-5" />
                    <span>ยังไม่มีตอน</span>
                </button>
              )}
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full font-medium transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                title="ติดตาม"
              >
                <Bookmark className="w-5 h-5" />
                <span className="hidden sm:inline">ติดตาม</span>
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 px-3 py-3 rounded-full font-medium transition-colors text-muted-foreground hover:text-primary hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                title="แชร์"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}