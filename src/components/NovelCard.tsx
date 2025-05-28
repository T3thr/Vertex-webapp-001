// src/components/NovelCard.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Eye, Star, Clock, ShieldCheck, Tag, CheckCircle, Sparkles, ThumbsUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import type { INovel, NovelStatus, IMonetizationSettings, INovelStats } from "@/backend/models/Novel"; 
import type { ICategory, CategoryType, ICategoryLocalization } from "@/backend/models/Category"; 
import type { IUser } from "@/backend/models/User"; 

// อินเทอร์เฟซสำหรับผู้เขียนที่ถูก populate
export interface PopulatedAuthor {
  _id: string;
  username?: string;
  profile?: {
    displayName?: string;
    penName?: string;
    avatarUrl?: string;
  };
  roles?: IUser['roles'];
}

// อินเทอร์เฟซสำหรับหมวดหมู่ที่ถูก populate
export interface PopulatedCategory {
  _id: string;
  name: string;
  slug?: string;
  localizations?: ICategoryLocalization[];
  iconUrl?: string;
  color?: string;
  categoryType?: CategoryType;
  description?: string;
}

// อินเทอร์เฟซสำหรับข้อมูลการ์ดนิยาย
export type NovelCardData = Pick<INovel,
  | '_id'
  | 'title'
  | 'slug'
  | 'synopsis'
  | 'coverImageUrl'
  | 'isCompleted'
  | 'isFeatured'
  | 'publishedAt'
  | 'status'
  | 'totalEpisodesCount'
  | 'publishedEpisodesCount'
  | 'currentEpisodePriceCoins'
> & {
  author: PopulatedAuthor;
  themeAssignment: {
    mainTheme?: {
      categoryId: PopulatedCategory;
      customName?: string;
    };
    subThemes?: Array<{ categoryId: PopulatedCategory; customName?: string; }>;
    moodAndTone?: PopulatedCategory[];
    contentWarnings?: PopulatedCategory[];
    customTags?: string[];
  };
  language: PopulatedCategory;
  ageRatingCategoryId?: PopulatedCategory | null;
  monetizationSettings?: IMonetizationSettings;
  stats: Pick<INovelStats, 'viewsCount' | 'likesCount' | 'averageRating' | 'lastPublishedEpisodeAt'>;
};

interface NovelCardProps {
  novel: NovelCardData;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
}

export function NovelCard({
  novel,
  priority = false,
  className = "",
  imageClassName = "aspect-[2/3]", // ปรับเป็น 2:3 ให้เล็กลงเหมือน readawrite.com
}: NovelCardProps) {

  if (!novel || !novel.slug) {
    console.warn("[NovelCard] Novel data or slug is missing.", novel);
    return (
      <div
        className={`bg-card rounded-lg shadow-sm overflow-hidden p-3 text-xs ${className} w-[120px] min-[400px]:w-[130px] sm:w-[140px] md:w-[150px]`}
      >
        ข้อมูลนิยายไม่ถูกต้อง
      </div>
    );
  }

  const lastUpdatedText = novel.stats?.lastPublishedEpisodeAt
    ? formatDistanceToNow(new Date(novel.stats.lastPublishedEpisodeAt), { addSuffix: true, locale: th })
    : novel.publishedAt
    ? formatDistanceToNow(new Date(novel.publishedAt), { addSuffix: true, locale: th })
    : "เร็วๆ นี้";

  const authorDisplay =
    novel.author?.profile?.penName ||
    novel.author?.profile?.displayName ||
    novel.author?.username ||
    "นักเขียนนิรนาม";

  const mainGenre = novel.themeAssignment?.mainTheme?.categoryId;
  const mainGenreName = mainGenre?.name || novel.themeAssignment?.mainTheme?.customName || "เรื่องเล่า";
  const mainGenreColor = mainGenre?.color && mainGenre.color !== "#000000" && mainGenre.color !== "#FFFFFF" ? mainGenre.color : 'var(--color-primary)';

  // ปรับสี status badges ให้ดูดีขึ้น
  const statusBadges: { label: string; colorClass: string; icon?: React.ReactNode; title?: string }[] = [];

  if (novel.isFeatured) {
    statusBadges.push({ 
      label: "แนะนำ", 
      colorClass: "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm", 
      icon: <Sparkles size={8} className="fill-current" /> 
    });
  }
  if (novel.isCompleted) {
    statusBadges.push({ 
      label: "จบแล้ว", 
      colorClass: "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm", 
      icon: <CheckCircle size={8} className="fill-current" /> 
    });
  }

  const promo = novel.monetizationSettings?.activePromotion;
  const now = new Date();
  if (
    promo &&
    promo.isActive &&
    promo.promotionalPriceCoins !== undefined &&
    (!promo.promotionStartDate || new Date(promo.promotionStartDate) <= now) &&
    (!promo.promotionEndDate || new Date(promo.promotionEndDate) >= now)
  ) {
    statusBadges.push({
      label: "ลดราคา",
      colorClass: "bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-sm",
      icon: <ThumbsUp size={8} className="fill-current" />,
      title: promo.promotionDescription || `พิเศษ ${promo.promotionalPriceCoins} เหรียญ/ตอน`,
    });
  }

  // แสดงเฉพาะ 18+ เท่านั้น
  const ageRating = novel.ageRatingCategoryId;
  const isAdultContent = ageRating?.name === "18+" || ageRating?.name?.includes("18");
  const ageRatingText = isAdultContent ? "18+" : null;

  const cardVariants = {
    initial: { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
    hover: {
      y: -2,
      boxShadow: "var(--shadow-md)",
      transition: { duration: 0.15, ease: "easeOut" },
    },
  };

  const placeholderCover = "/images/placeholder-cover.webp";

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      className={`bg-card rounded-lg shadow-sm hover:shadow-md overflow-hidden flex flex-col group border border-border/50 ${className}`}
      role="article"
      aria-labelledby={`novel-title-${novel._id}`}
    >
      <Link href={`/novels/${novel.slug}`} className="block h-full flex flex-col" title={novel.title}>
        {/* Image Container - ปรับให้เล็กลงตาม readawrite.com */}
        <div className={`relative w-full overflow-hidden rounded-t-lg ${imageClassName}`}>
          <Image
            src={novel.coverImageUrl || placeholderCover}
            alt={`ปกนิยายเรื่อง ${novel.title}`}
            fill
            sizes="(max-width: 640px) 25vw, (max-width: 768px) 20vw, (max-width: 1024px) 15vw, 12vw"
            className="object-cover transition-transform duration-200 ease-in-out group-hover:scale-105"
            priority={priority}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== placeholderCover && target.srcset !== placeholderCover) {
                target.srcset = placeholderCover;
                target.src = placeholderCover;
              }
            }}
          />
          
          {/* Badges Area - ปรับตำแหน่งและขนาด */}
          {(statusBadges.length > 0 || ageRatingText) && (
            <div className="absolute top-1 right-1 flex flex-col items-end gap-0.5 z-10">
              {statusBadges.map((badge, index) => (
                <span
                  key={`${badge.label}-${index}-${novel._id}`}
                  title={badge.title || badge.label}
                  className={`text-[7px] sm:text-[8px] font-semibold px-1 py-0.5 rounded-full flex items-center gap-0.5 ${badge.colorClass} backdrop-blur-sm leading-tight whitespace-nowrap`}
                >
                  {badge.icon}{badge.label}
                </span>
              ))}
              {ageRatingText && (
                <span
                  className="text-[7px] sm:text-[8px] font-semibold px-1 py-0.5 rounded-full flex items-center gap-0.5 bg-gradient-to-r from-red-600 to-red-700 text-white shadow-sm backdrop-blur-sm leading-tight whitespace-nowrap"
                  title="เนื้อหาสำหรับผู้ใหญ่ 18 ปีขึ้นไป"
                >
                  <ShieldCheck size={8} className="flex-shrink-0 fill-current" />{ageRatingText}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Content Area - ปรับให้กระชับขึ้น */}
        <div className="p-2 flex flex-col flex-grow text-xs">
          {/* Title - ปรับขนาดให้เล็กลง */}
          <h3
            id={`novel-title-${novel._id}`}
            className="font-semibold text-xs sm:text-sm text-foreground hover:text-primary line-clamp-2 leading-snug mb-1"
            title={novel.title}
          >
            {novel.title}
          </h3>

          {/* Author - ปรับให้เล็กลง */}
          <p
            className="text-[9px] sm:text-[10px] text-muted-foreground line-clamp-1 mb-1"
            title={authorDisplay}
          >
            {authorDisplay}
          </p>

          {/* Genre - ปรับขนาดไอคอนและข้อความ */}
          {mainGenreName && (
            <div className="flex items-center gap-0.5 mb-1" title={mainGenreName}>
              <Tag size={9} style={{ color: mainGenreColor }} className="flex-shrink-0" />
              <p
                className="font-medium line-clamp-1 text-ellipsis text-[9px] sm:text-[10px]"
                style={{ color: mainGenreColor }}
              >
                {mainGenreName}
              </p>
            </div>
          )}

          {/* Stats - ปรับให้เล็กลงและกระชับขึ้น */}
          <div className="mt-auto pt-1 border-t border-border/50">
            <div className="grid grid-cols-3 gap-x-0.5 text-muted-foreground/90 mb-0.5">
              <div className="flex items-center gap-0.5 truncate" title={`ยอดเข้าชม: ${novel.stats?.viewsCount?.toLocaleString() || 0}`}>
                <Eye size={9} className="text-sky-500 flex-shrink-0" />
                <span className="truncate text-[8px] sm:text-[9px]">{formatNumber(novel.stats?.viewsCount)}</span>
              </div>
              <div className="flex items-center gap-0.5 truncate" title={`ถูกใจ: ${novel.stats?.likesCount?.toLocaleString() || 0}`}>
                <Heart size={9} className="text-rose-500 flex-shrink-0" />
                <span className="truncate text-[8px] sm:text-[9px]">{formatNumber(novel.stats?.likesCount)}</span>
              </div>
              <div className="flex items-center gap-0.5 truncate" title={`คะแนนเฉลี่ย: ${novel.stats?.averageRating?.toFixed(1) || "N/A"}`}>
                <Star size={9} className="text-amber-400 fill-amber-400 flex-shrink-0" />
                <span className="truncate text-[8px] sm:text-[9px]">{novel.stats?.averageRating?.toFixed(1) || "-"}</span>
              </div>
            </div>
            <div className="flex items-center text-muted-foreground/70 text-[7px] sm:text-[8px]">
              <Clock className="mr-0.5 flex-shrink-0" size={8} />
              <span className="truncate">{lastUpdatedText}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ฟังก์ชัน formatNumber คงเดิม
function formatNumber(num?: number | null): string {
  if (num === null || num === undefined || isNaN(num) || typeof num !== 'number') {
    return "0";
  }
  if (num === 0) return "0";

  if (Math.abs(num) >= 1000000) {
    const result = (num / 1000000).toFixed(1);
    return result.endsWith(".0") ? result.slice(0, -2) + "M" : result + "M";
  }
  if (Math.abs(num) >= 1000) {
    const result = (num / 1000).toFixed(1);
    return result.endsWith(".0") ? result.slice(0, -2) + "K" : result + "K";
  }
  return num.toString();
}