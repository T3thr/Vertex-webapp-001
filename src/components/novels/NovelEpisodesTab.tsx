// src/components/novels/NovelEpisodesTab.tsx
// Component แสดงรายการตอนทั้งหมด
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, Clock, Eye, Heart, MessageSquare, Play, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
// อ้างอิง PopulatedEpisodeSummary จากตำแหน่งที่ถูกต้อง (API Route)
import { PopulatedEpisodeSummary } from "@/app/api/novels/[slug]/route";
import { EpisodeStatus, EpisodeAccessType } from "@/backend/models/Episode"; // Import Enums

interface NovelEpisodesTabProps {
  novelSlug: string;
  episodesList: PopulatedEpisodeSummary[];
  firstEpisodeSlug?: string;
}

// ฟังก์ชัน format วันที่เผยแพร่ (ตรวจสอบว่า Date object หรือ ISO string)
const formatPublishedDate = (dateInput?: Date | string | null): string => {
  if (!dateInput) return "ยังไม่เผยแพร่";
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "วันที่ไม่ถูกต้อง";
    const now = new Date();
    if (format(date, "yyyy-MM-dd") === format(now, "yyyy-MM-dd")) {
      return `วันนี้, ${format(date, "HH:mm", { locale: th })}`;
    } else if (date.getFullYear() === now.getFullYear()) {
      return format(date, "d MMM", { locale: th });
    } else {
      return format(date, "d MMM yy", { locale: th });
    }
  } catch (e) {
    return "วันที่ไม่ถูกต้อง";
  }
};

const formatStat = (num?: number | null): string => {
  if (num === null || num === undefined || isNaN(num)) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return num.toString();
};

// Mapping สถานะตอนเป็นภาษาไทย
const statusTextMap: { [key in EpisodeStatus]: string } = {
    [EpisodeStatus.PUBLISHED]: "เผยแพร่แล้ว",
    [EpisodeStatus.DRAFT]: "ฉบับร่าง",
    [EpisodeStatus.SCHEDULED]: "ตั้งเวลาเผยแพร่",
    [EpisodeStatus.ARCHIVED]: "เก็บเข้าคลัง",
    [EpisodeStatus.PENDING_REVIEW]: "รอการตรวจสอบ",
    [EpisodeStatus.BANNED_BY_ADMIN]: "ถูกระงับ",
    [EpisodeStatus.UNPUBLISHED]: "ยกเลิกการเผยแพร่", // เพิ่มสถานะนี้
    [EpisodeStatus.REVISION_NEEDED]: "ต้องการการแก้ไข", // เพิ่มสถานะนี้
};


export function NovelEpisodesTab({ novelSlug, episodesList, firstEpisodeSlug }: NovelEpisodesTabProps) {
  const episodes = episodesList || [];

  const listVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  const ReadFirstEpisodeButton = () => {
    if (!firstEpisodeSlug) return null;
    return (
      <div className="mb-6 text-center">
        <Link
          href={`/play/${novelSlug}/${firstEpisodeSlug}`}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 ease-in-out bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 hover:shadow-primary/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
        >
          <Play className="w-5 h-5" />
          <span>เริ่มอ่านตอนแรก</span>
        </Link>
      </div>
    );
  };

  return (
    <div className="pb-10">
      {episodes.length > 0 && <ReadFirstEpisodeButton />}
      {episodes.length === 0 ? (
        <p className="text-center text-muted-foreground mt-8">ยังไม่มีตอนเผยแพร่</p>
      ) : (
        <motion.ul
          className="divide-y divide-border"
          variants={listVariants}
          initial="hidden"
          animate="visible"
        >
          {episodes.map((episode) => {
            const episodePath = `/play/${novelSlug}/${episode.slug}`; // episode.slug คือ episodeOrder ที่แปลงเป็น string
            const isFree = episode.accessType === EpisodeAccessType.FREE || (episode.priceCoins !== undefined && episode.priceCoins <= 0);
            const currentStatusText = statusTextMap[episode.status] || episode.status; // Fallback to raw status if not in map

            return (
              <motion.li key={episode._id} variants={itemVariants}> {/* ใช้ _id ที่เป็น string แล้ว */}
                <Link
                  href={episodePath}
                  className="block group hover:bg-secondary/50 transition-colors duration-150 py-4 px-2 sm:px-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    {/* Episode Title and Number */}
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium text-foreground truncate group-hover:text-primary">
                        <span className="text-muted-foreground mr-2">{`#${episode.episodeOrder}`}</span>
                        {episode.title}
                        {episode.status !== EpisodeStatus.PUBLISHED && (
                            <span className="ml-2 text-xs italic text-muted-foreground/80">({currentStatusText})</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
                        {episode.status === EpisodeStatus.PUBLISHED && episode.publishedAt ? (
                          <>
                            <Clock className="w-3 h-3" />
                            <span>เผยแพร่เมื่อ {formatPublishedDate(episode.publishedAt)}</span>
                          </>
                        ) : episode.status === EpisodeStatus.SCHEDULED && episode.publishedAt ? (
                            <>
                              <Clock className="w-3 h-3 text-blue-500" />
                              <span className="text-blue-500">จะเผยแพร่: {formatPublishedDate(episode.publishedAt)}</span>
                            </>
                        ) : (
                          <span className="italic">{currentStatusText}</span>
                        )}
                        {/* แสดง Icon ล็อคถ้าไม่ฟรี */}
                        {!isFree && episode.priceCoins && episode.priceCoins > 0 && (
                          <span
                            className="ml-2 flex items-center gap-1 text-amber-600 dark:text-amber-400"
                            title={`ราคา ${episode.priceCoins} Coins`}
                          >
                            <Lock className="w-3 h-3" />
                            <span>{episode.priceCoins} Coins</span>
                          </span>
                        )}
                        {isFree && episode.status === EpisodeStatus.PUBLISHED && (
                             <span className="ml-2 flex items-center gap-1 text-green-600 dark:text-green-400" title="อ่านฟรี">
                                <CheckCircle className="w-3 h-3" />
                                <span>ฟรี</span>
                            </span>
                        )}
                      </p>
                    </div>

                    {/* Episode Stats */}
                    {episode.status === EpisodeStatus.PUBLISHED && (
                        <div className="flex items-center justify-start sm:justify-end gap-3 text-xs text-muted-foreground mt-2 sm:mt-0 flex-shrink-0">
                            <span className="flex items-center gap-1" title={`${formatStat(episode.stats?.viewsCount)} views`}>
                            <Eye className="w-3.5 h-3.5" />
                            {formatStat(episode.stats?.viewsCount)}
                            </span>
                            <span className="flex items-center gap-1" title={`${formatStat(episode.stats?.likesCount)} likes`}>
                            <Heart className="w-3.5 h-3.5" />
                            {formatStat(episode.stats?.likesCount)}
                            </span>
                            <span className="flex items-center gap-1" title={`${formatStat(episode.stats?.commentsCount)} comments`}>
                            <MessageSquare className="w-3.5 h-3.5" />
                            {formatStat(episode.stats?.commentsCount)}
                            </span>
                            <Play className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                        </div>
                    )}
                  </div>
                </Link>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </div>
  );
}