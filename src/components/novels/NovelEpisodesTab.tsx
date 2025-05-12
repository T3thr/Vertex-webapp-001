// src/components/novels/NovelEpisodesTab.tsx
// Component แสดงรายการตอนทั้งหมด
"use client"; // ทำให้เป็น Client Component เพื่อใช้ Framer Motion และ event handlers

import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, CheckCircle, Clock, Eye, Heart, MessageSquare, Play } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

// อินเทอร์เฟซสำหรับตอนของนิยายใน episodesList
interface EpisodeSummary {
  _id: string; // หรือใช้ mongoose.Types.ObjectId ถ้าใช้ Mongoose type
  episodeNumber: number;
  title: string;
  slug: string;
  status: "published" | "draft" | string; // รองรับสถานะอื่นๆ
  publishedAt?: Date | string;
  isFree: boolean;
  priceInCoins?: number;
  viewsCount?: number;
  likesCount?: number;
  commentsCount?: number;
}

// อินเทอร์เฟซสำหรับ props ของ component
interface NovelEpisodesTabProps {
  novel: {
    slug: string;
    episodesList?: EpisodeSummary[]; // ใช้ EpisodeSummary สำหรับ episodesList
  };
}

// ฟังก์ชัน format วันที่เผยแพร่
const formatPublishedDate = (dateInput: Date | string | undefined): string => {
  if (!dateInput) return "ยังไม่เผยแพร่";
  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    // ถ้าเป็นวันนี้ แสดงเวลา, ถ้าเป็นปีนี้ แสดง วัน เดือน, ถ้าไม่ใช่ แสดง วัน เดือน ปี
    const now = new Date();
    if (format(date, "yyyy-MM-dd") === format(now, "yyyy-MM-dd")) {
      return `วันนี้, ${format(date, "HH:mm", { locale: th })}`;
    } else if (date.getFullYear() === now.getFullYear()) {
      return format(date, "d MMM", { locale: th });
    } else {
      return format(date, "d MMM yyyy", { locale: th });
    }
  } catch (e) {
    return "วันที่ไม่ถูกต้อง";
  }
};

// ฟังก์ชัน format ตัวเลขสั้นๆ
const formatStat = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return num.toString();
};

export function NovelEpisodesTab({ novel }: NovelEpisodesTabProps) {
  const episodes = novel.episodesList || [];

  const listVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05, // หน่วงเวลาเล็กน้อยสำหรับแต่ละ item
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="pb-10">
      {episodes.length === 0 ? (
        <p className="text-center text-muted-foreground mt-8">ยังไม่มีตอนเผยแพร่</p>
      ) : (
        <motion.ul
          className="divide-y divide-border"
          variants={listVariants}
          initial="hidden"
          animate="visible"
        >
          {episodes.map((episode) => (
            <motion.li key={episode._id} variants={itemVariants}>
              <Link
                href={`/play/${novel.slug}/${episode.slug}`}
                className="block group hover:bg-secondary/50 transition-colors duration-150 py-4 px-2 sm:px-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  {/* Episode Title and Number */}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-foreground truncate group-hover:text-primary">
                      <span className="text-muted-foreground mr-2">{`#${episode.episodeNumber}`}</span>
                      {episode.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      {episode.status === "published" ? (
                        <>
                          <Clock className="w-3 h-3" />
                          <span>เผยแพร่เมื่อ {formatPublishedDate(episode.publishedAt)}</span>
                        </>
                      ) : episode.status === "draft" ? (
                        <span className="italic">ฉบับร่าง</span>
                      ) : (
                        <span className="italic">{episode.status}</span> // สถานะอื่นๆ
                      )}
                      {/* แสดง Icon ล็อคถ้าไม่ฟรี */}
                      {!episode.isFree && (
                        <span
                          className="ml-2 flex items-center gap-1 text-yellow-600 dark:text-yellow-400"
                          title={`ราคา ${episode.priceInCoins} Coins`}
                        >
                          <Lock className="w-3 h-3" />
                          <span>{episode.priceInCoins} Coins</span>
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Episode Stats */}
                  <div className="flex items-center justify-start sm:justify-end gap-3 text-xs text-muted-foreground mt-2 sm:mt-0 flex-shrink-0">
                    <span className="flex items-center gap-1" title={`${formatStat(episode.viewsCount)} views`}>
                      <Eye className="w-3.5 h-3.5" />
                      {formatStat(episode.viewsCount)}
                    </span>
                    <span className="flex items-center gap-1" title={`${formatStat(episode.likesCount)} likes`}>
                      <Heart className="w-3.5 h-3.5" />
                      {formatStat(episode.likesCount)}
                    </span>
                    <span className="flex items-center gap-1" title={`${formatStat(episode.commentsCount)} comments`}>
                      <MessageSquare className="w-3.5 h-3.5" />
                      {formatStat(episode.commentsCount)}
                    </span>
                    {/* Play Icon (optional, appears on hover maybe?) */}
                    <Play className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                  </div>
                </div>
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  );
}