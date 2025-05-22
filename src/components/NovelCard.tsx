// src/components/NovelCard.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Eye, Star, Clock, ShieldCheck, Tag, CheckCircle, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { INovel } from "@/backend/models/Novel";
import { ICategory, CategoryType } from "@/backend/models/Category";
import { IUser } from "@/backend/models/User";

// อินเทอร์เฟซสำหรับผู้เขียนที่ถูก populate (ตรงกับที่ API ส่งมา)
interface PopulatedAuthor {
  _id: IUser['_id'];
  username?: string;
  profile?: {
    displayName?: string;
    penName?: string;
    avatarUrl?: string;
  };
  roles?: IUser['roles'];
}

// อินเทอร์เฟซสำหรับหมวดหมู่ที่ถูก populate (ตรงกับที่ API ส่งมา)
interface PopulatedCategory {
  _id: ICategory['_id'];
  name: string;
  slug?: string;
  localizations?: ICategory['localizations'];
  iconUrl?: string;
  color?: string;
  categoryType?: CategoryType;
  description?: string; // เพิ่ม description
}

// อินเทอร์เฟซสำหรับข้อมูลการ์ดนิยาย ที่ปรับให้ตรงกับการ populate จาก API
export interface NovelCardData extends Omit<
  INovel,
  | 'author'
  | 'themeAssignment' // themeAssignment จะถูก override ด้วย populated version
  | 'language' // language จะถูก override
  | 'ageRatingCategoryId' // ageRatingCategoryId จะถูก override
  // Fields ที่ไม่ได้ใช้โดยตรงใน card หรือจะถูก override
  | 'relatedNovels'
  | 'coAuthors'
  | 'seriesId'
  | 'firstEpisodeId'
  | 'narrativeFocus'
  | 'worldBuildingDetails'
  | 'sourceType' // ถ้าไม่แสดงแหล่งที่มาใน card
  | 'monetizationSettings'
  | 'psychologicalAnalysisConfig'
  | 'collaborationSettings'
  | 'adminNotes'
> {
  _id: INovel['_id']; // ObjectId should be string after lean() and JSON serialization
  author: PopulatedAuthor; // ผู้เขียนที่ populate แล้ว
  themeAssignment: { // โครงสร้าง themeAssignment ที่ populate แล้ว
    mainTheme: {
      categoryId: PopulatedCategory; // categoryId ของ mainTheme ที่ populate แล้ว
      customName?: string;
    };
    // ถ้ามีการ populate subThemes, moodAndTone, contentWarnings ใน API ก็ต้องเพิ่ม type ที่นี่
    subThemes?: Array<{ categoryId: PopulatedCategory; customName?: string; }>;
    moodAndTone?: PopulatedCategory[];
    contentWarnings?: PopulatedCategory[];
    customTags?: string[];
  };
  language: PopulatedCategory; // ภาษาที่ populate แล้ว
  ageRatingCategoryId?: PopulatedCategory; // เรทอายุที่ populate แล้ว (optional)
  // stats, coverImageUrl, title, slug, synopsis, isFeatured, isCompleted, status จะมาจาก INovel โดยตรง
}


interface NovelCardProps {
  novel: NovelCardData;
  priority?: boolean; // สำหรับ Next/Image priority loading
  className?: string; // คลาสเพิ่มเติมสำหรับ container ของ card
  imageClassName?: string; // คลาสเพิ่มเติมสำหรับ Image component
}

export function NovelCard({
  novel,
  priority = false,
  className = "",
  imageClassName = "aspect-[2/3]", // Default aspect ratio
}: NovelCardProps) {
  // การคำนวณวันที่อัปเดตล่าสุด
  const lastUpdated = novel.stats?.lastPublishedEpisodeAt
    ? formatDistanceToNow(new Date(novel.stats.lastPublishedEpisodeAt), { addSuffix: true, locale: th })
    : novel.publishedAt
    ? formatDistanceToNow(new Date(novel.publishedAt), { addSuffix: true, locale: th })
    : "ยังไม่เผยแพร่";

  // การแสดงชื่อผู้เขียน
  const authorDisplay =
    novel.author?.profile?.penName ||
    novel.author?.profile?.displayName ||
    novel.author?.username ||
    "นักเขียนนิรนาม";

  // การแสดงชื่อหมวดหมู่หลัก
  const mainGenre = novel.themeAssignment?.mainTheme?.categoryId;
  const mainGenreName = mainGenre?.name || novel.themeAssignment?.mainTheme?.customName || "ทั่วไป";
  const mainGenreColor = mainGenre?.color || 'var(--primary)'; // ใช้สีจาก CSS variable ถ้าไม่มี

  // ป้ายสถานะ (Badges)
  const statusBadges: { label: string; colorClass: string; icon?: React.ReactNode }[] = [];
  if (novel.isFeatured) {
    statusBadges.push({ label: "แนะนำ", colorClass: "bg-amber-500/90 text-white", icon: <Sparkles size={12} /> });
  }
  if (novel.isCompleted) {
    statusBadges.push({ label: "จบแล้ว", colorClass: "bg-emerald-500/90 text-white", icon: <CheckCircle size={12} /> });
  }
  // ตัวอย่าง: เพิ่มป้าย "มาใหม่" หาก publishedAt ไม่นานมานี้
  if (novel.publishedAt && new Date(novel.publishedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
      // statusBadges.unshift({ label: "มาใหม่", colorClass: "bg-sky-500/90 text-white", icon: <Sparkles size={12}/>});
  }


  // เรทอายุ
  const ageRating = novel.ageRatingCategoryId;
  const ageRatingText = ageRating?.name;
  // ใช้สีจาก category ถ้ามี, หรือสี fallback, หรือสีที่สื่อถึงคำเตือน
  const ageRatingColor = ageRating?.color || 'var(--alert-error-foreground)';
  const ageRatingDesc = ageRating?.description;

  const cardVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 1, 0.5, 1] } }, // Smoother ease
    hover: {
      y: -6,
      boxShadow: "var(--shadow-xl)", // ใช้ shadow จาก globals.css
      transition: { duration: 0.25, ease: "circOut" },
    },
  };

  const placeholderCover = "/images/placeholder-cover.webp"; // ตรวจสอบว่ามีไฟล์นี้ใน public/images

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      className={`bg-card rounded-lg md:rounded-xl shadow-md overflow-hidden flex flex-col transition-all duration-300 ease-in-out group ${className}`}
      // style={{ height: '100%' }} // ทำให้การ์ดสูงเท่ากันถ้าอยู่ใน flex container
    >
      <Link href={`/novels/${novel.slug}`} className="block h-full flex flex-col" title={novel.title}>
        <div className={`relative w-full overflow-hidden rounded-t-lg md:rounded-t-xl ${imageClassName}`}>
          <Image
            src={novel.coverImageUrl || placeholderCover}
            alt={`ปกนิยายเรื่อง ${novel.title}`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
            priority={priority}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== placeholderCover) { // ป้องกัน loop ถ้า placeholder ก็ error
                target.srcset = placeholderCover;
                target.src = placeholderCover;
              }
            }}
          />
          {/* Badges Area */}
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1.5 z-10">
            {statusBadges.map((badge) => (
              <span
                key={badge.label}
                className={`text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full flex items-center gap-1 ${badge.colorClass} shadow-sm backdrop-blur-sm bg-opacity-80`}
              >
                {badge.icon} {badge.label}
              </span>
            ))}
            {ageRatingText && (
              <span
                style={{ backgroundColor: ageRatingColor, color: 'white' }} // กำหนดสีตัวอักษรเป็นขาวเพื่อความชัดเจน
                className="text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full flex items-center gap-1 shadow-sm backdrop-blur-sm bg-opacity-80"
                title={ageRatingDesc || ageRatingText}
              >
                <ShieldCheck size={12} /> {ageRatingText}
              </span>
            )}
          </div>

          {/* Gradient & Title on Image */}
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/60 to-transparent pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 right-0 p-2.5 md:p-3 text-primary-foreground">
            <h3
              className="font-bold text-sm sm:text-base md:text-lg line-clamp-2 leading-tight"
              title={novel.title}
              style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}
            >
              {novel.title}
            </h3>
            <p
              className="text-xs sm:text-sm text-gray-200 line-clamp-1"
              title={authorDisplay}
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.6)' }}
            >
              {authorDisplay}
            </p>
          </div>
        </div>

        {/* Content Area below image */}
        <div className="p-2.5 md:p-3 flex flex-col flex-grow">
          {mainGenreName && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <Tag size={14} style={{ color: mainGenreColor }} className="flex-shrink-0" />
              <p
                className="text-xs font-medium line-clamp-1"
                title={mainGenreName}
                style={{ color: mainGenreColor }}
              >
                {mainGenreName}
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground line-clamp-2 mb-2 flex-grow min-h-[2.5em]" title={novel.synopsis}>
            {novel.synopsis || "ไม่มีเรื่องย่อ"}
          </p>

          {/* Stats and Footer */}
          <div className="mt-auto pt-2 border-t border-border/60">
            <div className="grid grid-cols-3 gap-x-1 gap-y-0.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1 truncate" title={`ยอดเข้าชม: ${novel.stats?.viewsCount?.toLocaleString() || 0}`}>
                <Eye size={13} className="text-sky-500 flex-shrink-0" />
                <span className="truncate">{novel.stats?.viewsCount?.toLocaleString() || "0"}</span>
              </div>
              <div className="flex items-center gap-1 truncate" title={`ถูกใจ: ${novel.stats?.likesCount?.toLocaleString() || 0}`}>
                <Heart size={13} className="text-rose-500 flex-shrink-0" />
                <span className="truncate">{novel.stats?.likesCount?.toLocaleString() || "0"}</span>
              </div>
              <div className="flex items-center gap-1 truncate" title={`คะแนนเฉลี่ย: ${novel.stats?.averageRating?.toFixed(1) || "N/A"}`}>
                <Star size={13} className="text-amber-400 flex-shrink-0" />
                <span className="truncate">{novel.stats?.averageRating?.toFixed(1) || "-"}</span>
              </div>
            </div>
            <div className="mt-1.5 flex items-center text-[10px] text-muted-foreground/80">
              <Clock className="mr-1 flex-shrink-0" size={10} />
              <span className="truncate">อัปเดต: {lastUpdated}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}