// src/components/NovelCard.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { memo } from "react";
import { Heart, Eye, Star, Clock, ShieldCheck, Tag, CheckCircle, Sparkles, ThumbsUp, BookOpen } from "lucide-react";
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
  variant?: 'default' | 'large' | 'featured';
}

// ปรับปรุง image optimization
const getOptimizedImageProps = (variant: string, priority: boolean) => {
  const baseConfig = {
    quality: 85, // เพิ่มจาก 75 เป็น 85 เพื่อ quality ที่ดีขึ้น
    placeholder: 'blur' as const,
    blurDataURL: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAhEQACAQIHAQAAAAAAAAAAAAABAgADBAUREiEiMVFhkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==',
  };

  switch (variant) {
    case 'large':
      return {
        ...baseConfig,
        sizes: "(max-width: 640px) 90vw, (max-width: 768px) 70vw, (max-width: 1024px) 50vw, 400px",
        priority: true, // Large cards always priority
      };
    case 'featured':
      return {
        ...baseConfig,
        sizes: "(max-width: 640px) 45vw, (max-width: 768px) 35vw, (max-width: 1024px) 25vw, 200px",
        priority,
      };
    default:
      return {
        ...baseConfig,
        sizes: "(max-width: 640px) 35vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 180px",
        priority,
      };
  }
};

export const NovelCard = memo(function NovelCard({
  novel,
  priority = false,
  className = "",
  imageClassName,
  variant = 'default',
}: NovelCardProps) {

  // ตรวจสอบข้อมูลนิยายและ slug
  if (!novel || !novel.slug) {
    console.warn("[NovelCard] Novel data or slug is missing.", novel);
    return (
      <div
        className={`bg-card rounded-xl shadow-sm overflow-hidden p-4 text-sm text-muted-foreground flex items-center justify-center min-h-[280px] ${className}`}
      >
        ข้อมูลนิยายไม่ถูกต้อง
      </div>
    );
  }

  // จัดรูปแบบวันที่อัปเดตล่าสุด
  const lastUpdatedText = novel.stats?.lastPublishedEpisodeAt
    ? formatDistanceToNow(new Date(novel.stats.lastPublishedEpisodeAt), { addSuffix: true, locale: th })
    : novel.publishedAt
    ? formatDistanceToNow(new Date(novel.publishedAt), { addSuffix: true, locale: th })
    : "เร็วๆ นี้";

  // กำหนดชื่อผู้เขียนที่แสดง
  const authorDisplay =
    novel.author?.profile?.penName ||
    novel.author?.profile?.displayName ||
    novel.author?.username ||
    "นักเขียนนิรนาม";

  // กำหนดประเภทหลักและสี
  const mainGenre = novel.themeAssignment?.mainTheme?.categoryId;
  const mainGenreName = mainGenre?.name || novel.themeAssignment?.mainTheme?.customName || "เรื่องเล่า";
  const mainGenreColor = mainGenre?.color && mainGenre.color !== "#000000" && mainGenre.color !== "#FFFFFF" ? mainGenre.color : 'var(--color-primary)';

  // สร้าง badges สำหรับสถานะต่างๆ
  const statusBadges: { label: string; colorClass: string; icon?: React.ReactNode; title?: string }[] = [];

  if (novel.isFeatured) {
    statusBadges.push({ 
      label: "แนะนำ", 
      colorClass: "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm", 
      icon: <Sparkles size={10} className="fill-current" /> 
    });
  }
  if (novel.isCompleted) {
    statusBadges.push({ 
      label: "จบแล้ว", 
      colorClass: "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm", 
      icon: <CheckCircle size={10} className="fill-current" /> 
    });
  }

  // ตรวจสอบโปรโมชัน
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
      icon: <ThumbsUp size={10} className="fill-current" />,
      title: promo.promotionDescription || `พิเศษ ${promo.promotionalPriceCoins} เหรียญ/ตอน`,
    });
  }

  // แสดงเฉพาะ 18+ เท่านั้น
  const ageRating = novel.ageRatingCategoryId;
  const isAdultContent = ageRating?.name === "18+" || ageRating?.name?.includes("18");
  const ageRatingText = isAdultContent ? "18+" : null;

  // รูปภาพสำรอง
  const placeholderCover = "/images/default.png";

  // เข้ารหัส slug เพื่อรองรับภาษาไทยและ non-English
  const encodedSlug = encodeURIComponent(novel.slug);

  // กำหนดขนาดตาม variant - ปรับปรุงเพื่อรองรับ responsive ใน mobile
  const getCardSize = () => {
    switch (variant) {
      case 'large':
        return {
          wrapper: "w-full h-full",
          image: "aspect-[4/3] sm:aspect-[3/4]",
          content: "p-3 sm:p-4 flex-1",
          title: "text-base sm:text-lg font-bold",
          author: "text-sm",
          genre: "text-sm",
          stats: "text-xs"
        };
      case 'featured':
        return {
          wrapper: "w-full h-full",
          image: "aspect-square",
          content: "p-2 sm:p-2.5 flex-1",
          title: "text-xs sm:text-sm font-semibold",
          author: "text-[10px] sm:text-xs",
          genre: "text-[10px] sm:text-xs",
          stats: "text-[9px] sm:text-[10px]"
        };
      default:
        return {
          wrapper: "w-[160px] min-[400px]:w-[170px] sm:w-[180px] md:w-[190px]",
          image: "aspect-square",
          content: "p-2.5",
          title: "text-sm font-semibold",
          author: "text-xs",
          genre: "text-xs",
          stats: "text-[10px]"
        };
    }
  };

  const cardSize = getCardSize();
  const imageProps = getOptimizedImageProps(variant, priority);

  return (
    <div
      className={`bg-card rounded-xl shadow-sm hover:shadow-lg overflow-hidden flex flex-col group border border-border/30 hover:border-border/60 transition-all duration-300 ${cardSize.wrapper} ${className}`}
      role="article"
      aria-labelledby={`novel-title-${novel._id}`}
      style={{ 
        marginBottom: variant === 'default' && !className?.includes('m-0') ? '0.75rem' : '0'
      }}
    >
      {/* ลิงก์ไปยังหน้าเรื่องโดยใช้ slug ที่เข้ารหัส */}
      <Link href={`/novels/${encodedSlug}`} className="block h-full flex flex-col" title={novel.title}>
        {/* Image Container - ปรับปรุงการโหลดรูปภาพ */}
        <div className={`relative w-full overflow-hidden rounded-t-xl ${cardSize.image}`}>
          <Image
            src={novel.coverImageUrl || placeholderCover}
            alt={`ปกนิยายเรื่อง ${novel.title}`}
            fill
            {...imageProps}
            className={`object-cover transition-all duration-300 ease-in-out group-hover:scale-105 ${imageClassName || ''}`}
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
            <div className="absolute top-2 right-2 flex flex-col items-end gap-1 z-10">
              {statusBadges.map((badge, index) => (
                <span
                  key={`${badge.label}-${index}-${novel._id}`}
                  title={badge.title || badge.label}
                  className={`text-[8px] sm:text-[9px] font-semibold px-1.5 py-1 rounded-full flex items-center gap-1 ${badge.colorClass} backdrop-blur-sm leading-tight whitespace-nowrap`}
                >
                  {badge.icon}{badge.label}
                </span>
              ))}
              {ageRatingText && (
                <span
                  className="text-[8px] sm:text-[9px] font-semibold px-1.5 py-1 rounded-full flex items-center gap-1 bg-gradient-to-r from-red-600 to-red-700 text-white shadow-sm backdrop-blur-sm leading-tight whitespace-nowrap"
                  title="เนื้อหาสำหรับผู้ใหญ่ 18 ปีขึ้นไป"
                >
                  <ShieldCheck size={10} className="flex-shrink-0 fill-current" />{ageRatingText}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className={`${cardSize.content} flex flex-col flex-grow justify-between`}>
          {/* Title */}
          <h3
            id={`novel-title-${novel._id}`}
            className={`${cardSize.title} text-foreground hover:text-primary line-clamp-2 leading-snug mb-1.5 transition-colors duration-200`}
            title={novel.title}
          >
            {novel.title}
          </h3>

          {/* Author */}
          <p
            className={`${cardSize.author} text-muted-foreground line-clamp-1 mb-1.5`}
            title={authorDisplay}
          >
            {authorDisplay}
          </p>

          {/* Genre */}
          {mainGenreName && (
            <div className="flex items-center gap-1 mb-2" title={mainGenreName}>
              <Tag size={10} style={{ color: mainGenreColor }} className="flex-shrink-0" />
              <p
                className={`${cardSize.genre} font-medium line-clamp-1 text-ellipsis`}
                style={{ color: mainGenreColor }}
              >
                {mainGenreName}
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="mt-auto">
            <div className="grid grid-cols-2 gap-1 text-muted-foreground/90 mb-1">
              <div className="flex items-center gap-0.5 truncate" title={`ยอดเข้าชม: ${novel.stats?.viewsCount?.toLocaleString() || 0}`}>
                <Eye size={10} className="text-sky-500 flex-shrink-0" />
                <span className={`truncate ${cardSize.stats}`}>{formatNumber(novel.stats?.viewsCount)}</span>
              </div>
              <div className="flex items-center gap-0.5 truncate" title={`ถูกใจ: ${novel.stats?.likesCount?.toLocaleString() || 0}`}>
                <Heart size={10} className="text-rose-500 flex-shrink-0" />
                <span className={`truncate ${cardSize.stats}`}>{formatNumber(novel.stats?.likesCount)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 text-muted-foreground/90 mb-1.5">
              <div className="flex items-center gap-0.5 truncate" title={`คะแนนเฉลี่ย: ${novel.stats?.averageRating?.toFixed(1) || "N/A"}`}>
                <Star size={10} className="text-amber-400 fill-amber-400 flex-shrink-0" />
                <span className={`truncate ${cardSize.stats}`}>{novel.stats?.averageRating?.toFixed(1) || "-"}</span>
              </div>
              <div className="flex items-center gap-0.5 truncate" title={`จำนวนตอน: ${novel.totalEpisodesCount || 0} ตอน`}>
                <BookOpen size={10} className="text-blue-500 flex-shrink-0" />
                <span className={`truncate ${cardSize.stats}`}>{novel.totalEpisodesCount || 0}</span>
              </div>
            </div>
            <div className="flex items-center text-muted-foreground/70 text-[9px] sm:text-[10px]">
              <Clock className="mr-0.5 flex-shrink-0" size={9} />
              <span className="truncate">{lastUpdatedText}</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
});

// ฟังก์ชันจัดรูปแบบตัวเลข
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
    return result.endsWith(".0") ? result.slice(0, -2) + "k" : result + "k";
  }
  return num.toString();
}

export { NovelCard as default };