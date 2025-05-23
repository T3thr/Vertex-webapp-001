// src/components/NovelCard.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Eye, Star, Clock, ShieldCheck, Tag, CheckCircle, Sparkles, BookmarkPlus, ThumbsUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { INovel, NovelStatus } from "@/backend/models/Novel"; // INovel for base types, NovelStatus for potential direct use
import { ICategory, CategoryType } from "@/backend/models/Category";
import { IUser } from "@/backend/models/User";

// อินเทอร์เฟซสำหรับผู้เขียนที่ถูก populate (ตรงกับที่ API ส่งมา)
// IUser['_id'] ควรเป็น string หลัง lean() และ JSON serialization
export interface PopulatedAuthor {
  _id: string; // ObjectId -> string
  username?: string;
  profile?: {
    displayName?: string;
    penName?: string;
    avatarUrl?: string;
  };
  roles?: IUser['roles'];
}

// อินเทอร์เฟซสำหรับหมวดหมู่ที่ถูก populate (ตรงกับที่ API ส่งมา)
export interface PopulatedCategory {
  _id: string; // ObjectId -> string
  name: string;
  slug?: string;
  localizations?: ICategory['localizations'];
  iconUrl?: string;
  color?: string;
  categoryType?: CategoryType;
  description?: string;
}

// อินเทอร์เฟซสำหรับข้อมูลการ์ดนิยาย ที่ปรับให้ตรงกับการ populate จาก API
// ใช้ Pick และ Omit เพื่อสร้าง type ที่แม่นยำจาก INovel
export type NovelCardData = Pick<INovel,
  | '_id' // ObjectId will be string
  | 'title'
  | 'slug'
  | 'synopsis'
  | 'coverImageUrl'
  | 'stats'
  | 'isCompleted'
  | 'isFeatured'
  | 'publishedAt'
  | 'status' // อาจใช้แสดงผลบางอย่าง
  | 'totalEpisodesCount'
  | 'publishedEpisodesCount'
  // เพิ่ม currentEpisodePriceCoins (virtual) และ monetizationSettings (สำหรับแสดงข้อมูลราคาโปรโมชั่น)
  | 'currentEpisodePriceCoins'
> & {
  author: PopulatedAuthor;
  themeAssignment: {
    mainTheme: {
      categoryId: PopulatedCategory;
      customName?: string;
    };
    subThemes?: Array<{ categoryId: PopulatedCategory; customName?: string }>; // Optional, if populated
    moodAndTone?: PopulatedCategory[]; // Optional, if populated
    contentWarnings?: PopulatedCategory[]; // Optional, if populated
    customTags?: string[];
  };
  language: PopulatedCategory;
  ageRatingCategoryId?: PopulatedCategory;
  // เพิ่ม monetizationSettings ถ้าจะแสดงข้อมูลโปรโมชั่นบนการ์ดโดยตรง
  monetizationSettings?: INovel['monetizationSettings'];
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
  imageClassName = "aspect-[2/3.1]", // ปรับ aspect ratio ให้สูงขึ้นเล็กน้อยตาม Figma
}: NovelCardProps) {
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
  const mainGenreColor = mainGenre?.color || 'var(--primary)';

  const statusBadges: { label: string; colorClass: string; icon?: React.ReactNode; title?: string }[] = [];

  if (novel.isFeatured) {
    statusBadges.push({ label: "แนะนำ", colorClass: "bg-amber-500/90 text-white", icon: <Sparkles size={11} /> });
  }
  if (novel.isCompleted) {
    statusBadges.push({ label: "จบแล้ว", colorClass: "bg-emerald-500/90 text-white", icon: <CheckCircle size={11} /> });
  } else if (novel.status === NovelStatus.PUBLISHED && (novel.publishedEpisodesCount || 0) > 0 && (novel.publishedEpisodesCount || 0) < (novel.totalEpisodesCount || 5)) {
     // "ยังไม่จบ" อาจจะไม่ต้องแสดง ถ้า isCompleted ครอบคลุมแล้ว
  }

  // Promotion Badge (ส่วนลด)
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
      colorClass: "bg-rose-500/90 text-white", // สีสำหรับโปรโมชั่น
      icon: <ThumbsUp size={11} />, // หรือ Tag icon
      title: promo.promotionDescription || `พิเศษ ${promo.promotionalPriceCoins} เหรียญ`,
    });
  }


  const ageRating = novel.ageRatingCategoryId;
  const ageRatingText = ageRating?.name;
  const ageRatingColor = ageRating?.color || 'var(--color-alert-error-foreground)';
  const ageRatingDesc = ageRating?.description || ageRatingText;

  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 1, 0.5, 1] } },
    hover: {
      y: -5,
      boxShadow: "var(--shadow-lg)", // ใช้ shadow จาก globals.css
      transition: { duration: 0.2, ease: "circOut" },
    },
  };

  const placeholderCover = "/images/placeholder-cover.webp";

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      className={`bg-card rounded-lg md:rounded-xl shadow-md overflow-hidden flex flex-col transition-all duration-300 ease-in-out group ${className}`}
    >
      <Link href={`/novels/${novel.slug}`} className="block h-full flex flex-col" title={novel.title}>
        <div className={`relative w-full overflow-hidden rounded-t-lg md:rounded-t-xl ${imageClassName}`}>
          <Image
            src={novel.coverImageUrl || placeholderCover}
            alt={`ปกนิยายเรื่อง ${novel.title}`}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, (max-width: 1024px) 22vw, 18vw"
            className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
            priority={priority}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== placeholderCover) {
                target.srcset = placeholderCover;
                target.src = placeholderCover;
              }
            }}
          />
          <div className="absolute top-1.5 right-1.5 flex flex-col items-end gap-1 z-10">
            {statusBadges.map((badge) => (
              <span
                key={badge.label}
                title={badge.title || badge.label}
                className={`text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${badge.colorClass} shadow-sm backdrop-blur-sm bg-opacity-85 leading-tight`}
              >
                {badge.icon} {badge.label}
              </span>
            ))}
            {ageRatingText && (
              <span
                style={{ backgroundColor: ageRatingColor, color: 'var(--card-foreground)' }}
                className="text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm backdrop-blur-sm bg-opacity-85 leading-tight"
                title={ageRatingDesc}
              >
                <ShieldCheck size={11} /> {ageRatingText}
              </span>
            )}
          </div>

          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 via-black/50 to-transparent pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 right-0 p-2 md:p-2.5 text-primary-foreground">
            <h3
              className="font-bold text-xs sm:text-sm md:text-base line-clamp-2 leading-tight"
              title={novel.title}
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
            >
              {novel.title}
            </h3>
            <p
              className="text-[10px] sm:text-xs text-gray-300 line-clamp-1"
              title={authorDisplay}
              style={{ textShadow: '1px 1px 1px rgba(0,0,0,0.7)' }}
            >
              {authorDisplay}
            </p>
          </div>
        </div>

        <div className="p-2 md:p-2.5 flex flex-col flex-grow text-xs">
          {mainGenreName && (
            <div className="flex items-center gap-1 mb-1">
              <Tag size={12} style={{ color: mainGenreColor }} className="flex-shrink-0" />
              <p
                className="font-medium line-clamp-1"
                title={mainGenreName}
                style={{ color: mainGenreColor }}
              >
                {mainGenreName}
              </p>
            </div>
          )}

          <p className="text-muted-foreground line-clamp-2 mb-1.5 flex-grow min-h-[2.2em] text-[11px] sm:text-xs" title={novel.synopsis}>
            {novel.synopsis || "ยังไม่มีเรื่องย่อ"}
          </p>

          <div className="mt-auto pt-1.5 border-t border-border/50 text-[10px] sm:text-xs">
            <div className="grid grid-cols-3 gap-x-0.5 text-muted-foreground/90">
              <div className="flex items-center gap-0.5 truncate" title={`ยอดเข้าชม: ${novel.stats?.viewsCount?.toLocaleString() || 0}`}>
                <Eye size={11} className="text-sky-500 flex-shrink-0" />
                <span className="truncate">{novel.stats?.viewsCount?.toLocaleString() || "0"}</span>
              </div>
              <div className="flex items-center gap-0.5 truncate" title={`ถูกใจ: ${novel.stats?.likesCount?.toLocaleString() || 0}`}>
                <Heart size={11} className="text-rose-500 flex-shrink-0" />
                <span className="truncate">{novel.stats?.likesCount?.toLocaleString() || "0"}</span>
              </div>
              <div className="flex items-center gap-0.5 truncate" title={`คะแนน: ${novel.stats?.averageRating?.toFixed(1) || "N/A"}`}>
                <Star size={11} className="text-amber-400 flex-shrink-0" />
                <span className="truncate">{novel.stats?.averageRating?.toFixed(1) || "-"}</span>
              </div>
            </div>
            <div className="mt-1 flex items-center text-muted-foreground/70 text-[9px] sm:text-[10px]">
              <Clock className="mr-0.5 flex-shrink-0" size={9} />
              <span className="truncate">อัปเดต: {lastUpdatedText}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}