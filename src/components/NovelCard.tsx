"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Eye, Star, Clock, ShieldCheck, Tag, CheckCircle, Sparkles, ThumbsUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
// ตรวจสอบ path ของ INovel และอื่นๆ ให้ถูกต้อง
import { INovel, NovelStatus, IMonetizationSettings, INovelStats } from "@/backend/models/Novel"; // INovelStats เพิ่มเข้ามา
import { ICategory, CategoryType, ICategoryLocalization } from "@/backend/models/Category"; // ICategoryLocalization เพิ่มเข้ามา
import { IUser } from "@/backend/models/User";

// อินเทอร์เฟซสำหรับผู้เขียนที่ถูก populate (ควรตรงกับที่ API `/api/novels` ส่งมาสำหรับ NovelCard)
export interface PopulatedAuthor {
  _id: string;
  username?: string;
  profile?: {
    displayName?: string;
    penName?: string;
    avatarUrl?: string;
  };
  roles?: IUser['roles']; // Optional, API for card might not send this
}

// อินเทอร์เฟซสำหรับหมวดหมู่ที่ถูก populate (ควรตรงกับที่ API `/api/novels` ส่งมาสำหรับ NovelCard)
export interface PopulatedCategory {
  _id: string;
  name: string;
  slug?: string; // slug มาจาก CategoryModel
  localizations?: ICategoryLocalization[]; // localizations มาจาก CategoryModel
  iconUrl?: string;
  color?: string;
  categoryType?: CategoryType;
  description?: string;
}

// อินเทอร์เฟซสำหรับข้อมูลการ์ดนิยาย ที่ปรับให้ตรงกับการ populate จาก API ที่ใช้แสดงรายการ
// นี่คือ type ที่ NovelCard component คาดหวังจะได้รับ
export type NovelCardData = Pick<INovel,
  | '_id'
  | 'title'
  | 'slug'
  | 'synopsis'
  | 'coverImageUrl'
  // | 'stats' // stats ถูก destructure ด้านล่าง
  | 'isCompleted'
  | 'isFeatured'
  | 'publishedAt' // วันที่เผยแพร่นิยายครั้งแรก
  | 'status'
  | 'totalEpisodesCount'
  | 'publishedEpisodesCount'
  | 'currentEpisodePriceCoins' // Virtual
> & {
  author: PopulatedAuthor;
  themeAssignment: { // themeAssignment ควรมีโครงสร้างตามที่ API ส่งมา
    mainTheme?: {
      categoryId: PopulatedCategory; // Populated
      customName?: string;
    };
    // Optional additional theme aspects if API sends them for cards
    subThemes?: Array<{ categoryId: PopulatedCategory; customName?: string; }>;
    moodAndTone?: PopulatedCategory[];
    contentWarnings?: PopulatedCategory[];
    customTags?: string[];
  };
  language: PopulatedCategory; // Populated
  ageRatingCategoryId?: PopulatedCategory | null; // Populated, can be null
  monetizationSettings?: IMonetizationSettings; // จาก INovel
  stats: Pick<INovelStats, 'viewsCount' | 'likesCount' | 'averageRating' | 'lastPublishedEpisodeAt'>; // เลือกเฉพาะ field ที่ใช้
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
  imageClassName = "aspect-[2/3.1]", // aspect-[3/4.5] หรือ aspect-[2/3] เป็นที่นิยม
}: NovelCardProps) {

  // ตรวจสอบ novel object ก่อนใช้งาน
  if (!novel || !novel.slug) {
    console.warn("[NovelCard] Novel data or slug is missing.", novel);
    return <div className={`bg-card rounded-lg md:rounded-xl shadow-md overflow-hidden p-4 ${className}`}>ข้อมูลนิยายไม่ถูกต้อง</div>;
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
  // ใช้สีจาก mainGenre ถ้ามี, หรือ fallback ไปสี primary ของ theme
  const mainGenreColor = mainGenre?.color || 'hsl(var(--primary))';


  const statusBadges: { label: string; colorClass: string; icon?: React.ReactNode; title?: string }[] = [];

  if (novel.isFeatured) {
    statusBadges.push({ label: "แนะนำ", colorClass: "bg-amber-500 text-amber-foreground", icon: <Sparkles size={11} /> });
  }
  if (novel.isCompleted) {
    statusBadges.push({ label: "จบแล้ว", colorClass: "bg-emerald-600 text-emerald-foreground", icon: <CheckCircle size={11} /> });
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
      colorClass: "bg-rose-500 text-rose-foreground", // ใช้สี foreground ที่เหมาะสม
      icon: <ThumbsUp size={11} />,
      title: promo.promotionDescription || `พิเศษ ${promo.promotionalPriceCoins} เหรียญ/ตอน`,
    });
  }

  const ageRating = novel.ageRatingCategoryId;
  const ageRatingText = ageRating?.name;
  // ถ้า ageRating.color มีค่า, ให้ใช้ค่านั้น. ถ้าไม่มี, ให้ fallback ไปสีที่ generic กว่า หรือสีที่กำหนดไว้สำหรับ age rating
  const ageRatingColorStyle = ageRating?.color ? { backgroundColor: ageRating.color, color: 'hsl(var(--card-foreground))' } : { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' };
  const ageRatingDesc = ageRating?.description || ageRatingText;


  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 1, 0.5, 1] } }, // easeOutExpo
    hover: {
      y: -5,
      boxShadow: "0 10px 20px -5px hsla(var(--primary)/0.2), 0 4px 6px -2px hsla(var(--primary)/0.1)", // improved shadow
      transition: { duration: 0.25, ease: "circOut" },
    },
  };

  const placeholderCover = "/images/placeholder-cover.webp"; // ตรวจสอบว่า path นี้ถูกต้อง

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      className={`bg-card rounded-lg md:rounded-xl shadow-md hover:shadow-lg overflow-hidden flex flex-col transition-all duration-300 ease-in-out group ${className}`}
      role="article"
      aria-labelledby={`novel-title-${novel._id}`}
    >
      <Link href={`/novels/${novel.slug}`} className="block h-full flex flex-col" title={novel.title}>
        {/* Image Container */}
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
              if (target.src !== placeholderCover && target.srcset !== placeholderCover) { // ตรวจสอบ srcset ด้วย
                target.srcset = placeholderCover; // กำหนด srcset และ src
                target.src = placeholderCover;
              }
            }}
          />
          {/* Badges Area */}
          <div className="absolute top-1.5 right-1.5 flex flex-col items-end gap-1 z-10">
            {statusBadges.map((badge, index) => (
              <span
                key={`${badge.label}-${index}`} // แก้ไข key ให้ unique
                title={badge.title || badge.label}
                className={`text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${badge.colorClass} shadow-sm backdrop-blur-sm bg-opacity-85 leading-tight`}
              >
                {badge.icon} {badge.label}
              </span>
            ))}
            {ageRatingText && (
              <span
                style={ageRatingColorStyle}
                className="text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm backdrop-blur-sm bg-opacity-85 leading-tight"
                title={ageRatingDesc || ageRatingText}
              >
                <ShieldCheck size={11} className="flex-shrink-0" /> {ageRatingText}
              </span>
            )}
          </div>

          {/* Gradient Overlay & Title on Image */}
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 right-0 p-2 md:p-2.5 text-primary-foreground">
            <h3
              id={`novel-title-${novel._id}`}
              className="font-semibold text-xs sm:text-sm md:text-base line-clamp-2 leading-tight drop-shadow-sm" // ใช้ font-semibold และ drop-shadow
              title={novel.title}
            >
              {novel.title}
            </h3>
            <p
              className="text-[10px] sm:text-xs text-gray-300 line-clamp-1 drop-shadow-sm"
              title={authorDisplay}
            >
              {authorDisplay}
            </p>
          </div>
        </div>

        {/* Content Area below image */}
        <div className="p-2 md:p-2.5 flex flex-col flex-grow text-xs">
          {/* Main Genre Tag */}
          {mainGenreName && (
            <div className="flex items-center gap-1 mb-1.5"> {/* เพิ่ม mb */}
              <Tag size={12} style={{ color: mainGenreColor }} className="flex-shrink-0" />
              <p
                className="font-medium line-clamp-1 text-ellipsis" // เพิ่ม text-ellipsis
                title={mainGenreName}
                style={{ color: mainGenreColor }}
              >
                {mainGenreName}
              </p>
            </div>
          )}

          {/* Synopsis */}
          <p className="text-muted-foreground line-clamp-2 mb-1.5 flex-grow min-h-[2.2em] text-[11px] sm:text-xs leading-relaxed" title={novel.synopsis || ""}>
            {novel.synopsis || "ยังไม่มีเรื่องย่อ"}
          </p>

          {/* Stats and Footer */}
          <div className="mt-auto pt-1.5 border-t border-border/60"> {/* ทำให้เส้นจางลง */}
            <div className="grid grid-cols-3 gap-x-1 text-muted-foreground/90"> {/* เพิ่ม gap */}
              <div className="flex items-center gap-0.5 truncate" title={`ยอดเข้าชม: ${novel.stats?.viewsCount?.toLocaleString() || 0}`}>
                <Eye size={11} className="text-sky-500 flex-shrink-0" />
                <span className="truncate text-[10px] sm:text-xs">{formatNumber(novel.stats?.viewsCount)}</span>
              </div>
              <div className="flex items-center gap-0.5 truncate" title={`ถูกใจ: ${novel.stats?.likesCount?.toLocaleString() || 0}`}>
                <Heart size={11} className="text-rose-500 flex-shrink-0" />
                <span className="truncate text-[10px] sm:text-xs">{formatNumber(novel.stats?.likesCount)}</span>
              </div>
              <div className="flex items-center gap-0.5 truncate" title={`คะแนนเฉลี่ย: ${novel.stats?.averageRating?.toFixed(1) || "N/A"}`}>
                <Star size={11} className="text-amber-400 flex-shrink-0" />
                <span className="truncate text-[10px] sm:text-xs">{novel.stats?.averageRating?.toFixed(1) || "-"}</span>
              </div>
            </div>
            <div className="mt-1.5 flex items-center text-muted-foreground/70 text-[9px] sm:text-[10px]"> {/* เพิ่ม mt */}
              <Clock className="mr-1 flex-shrink-0" size={9} /> {/* เพิ่ม mr */}
              <span className="truncate">อัปเดต: {lastUpdatedText}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// Helper function for NovelCard, can be moved to a utils file
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