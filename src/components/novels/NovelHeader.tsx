// src/components/novels/NovelHeader.tsx
// Client Component สำหรับส่วนหัวของหน้านิยาย (Hero Section)
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { PopulatedNovelForDetailPage } from "@/app/api/novels/[slug]/route"; // Import type จาก API
import {
  Star,
  Eye,
  Heart,
  Users,
  BookOpen,
  Play,
  Bookmark,
  Share2,
  Info,
  BadgeCheck,
  Clock,
} from "lucide-react";
import { TagBadge } from "./TagBadge"; // Component สำหรับแสดง Tag/Category
import { formatDistanceToNowStrict } from "date-fns";
import { th } from "date-fns/locale";

interface NovelHeaderProps {
  novel: PopulatedNovelForDetailPage;
}

// ฟังก์ชัน format วันที่ให้อ่านง่าย
const formatDate = (dateInput: Date | string | undefined): string => {
  if (!dateInput) return "ไม่มีข้อมูล";
  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    // แสดงแบบ relative ถ้าน้อยกว่า 1 ปี, มิฉะนั้นแสดงวันที่เต็ม
    if (new Date().getFullYear() === date.getFullYear()) {
      return formatDistanceToNowStrict(date, { addSuffix: true, locale: th });
    }
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (e) {
    console.error("Error formatting date:", e);
    return "วันที่ไม่ถูกต้อง";
  }
};

export function NovelHeader({ novel }: NovelHeaderProps) {
  const authorDisplayName = novel.author?.profile?.displayName || novel.author?.username || "ไม่ระบุชื่อ";
  const authorAvatar = novel.author?.profile?.avatar || "/images/default-avatar.png"; // ใส่ path รูป default

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1, // หน่วงเวลาการแสดงผลของ children
        delayChildren: 0.2,
      },
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

  return (
    <motion.div
      className="relative pt-16 pb-8 md:pt-24 md:pb-12 overflow-hidden bg-gradient-to-b from-background via-background to-secondary/30 dark:to-secondary/10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Background Gradient Overlay */}
      {novel.coverImage && (
        <motion.div
          className="absolute inset-0 z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <Image
            src={novel.coverImage}
            alt={`ภาพพื้นหลังเบลอของ ${novel.title}`}
            fill
            quality={50}
            className="object-cover opacity-10 dark:opacity-5 blur-xl scale-110"
            priority // โหลดภาพนี้ก่อน
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
            <div className="relative w-48 h-72 md:w-full md:h-auto md:aspect-[2/3] rounded-lg overflow-hidden shadow-lg border-2 border-border/50">
              <Image
                src={novel.coverImage}
                alt={`ปกนิยาย ${novel.title}`}
                fill
                quality={85}
                className="object-cover"
                sizes="(max-width: 768px) 192px, 100vw" // ปรับ sizes ตาม layout
                priority
              />
              {/* Discount Badge */}
              {novel.isDiscounted && (
                 <motion.div
                    className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md"
                    initial={{ scale: 0, rotate: -15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.5 }}
                 >
                    ลด {novel.discountDetails?.percentage}%
                 </motion.div>
              )}
            </div>
          </motion.div>

          {/* Novel Details */}
          <motion.div
            className="md:col-span-2 lg:col-span-3 flex flex-col justify-between"
            variants={containerVariants} // ใช้ containerVariants เพื่อ stagger children ภายในส่วนนี้
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
                <Link href={`/profile/${novel.author?.username}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Image
                    src={authorAvatar}
                    alt={`รูปโปรไฟล์ ${authorDisplayName}`}
                    width={24}
                    height={24}
                    className="rounded-full border border-border"
                  />
                  <span className="text-sm font-medium">{authorDisplayName}</span>
                  {/* อาจเพิ่ม Badge ยืนยันตัวตนนักเขียน */}
                  {/* {novel.author?.writerVerification?.status === 'verified' && <BadgeCheck className="w-4 h-4 text-blue-500" />} */}
                </Link>
                <span className="text-xs">• อัปเดตล่าสุด {formatDate(novel.lastEpisodePublishedAt || novel.updatedAt)}</span>
              </motion.div>

              {/* Stats */}
              <motion.div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-sm text-muted-foreground" variants={itemVariants}>
                <span className="flex items-center gap-1" title={`${novel.averageRating?.toFixed(1)} ดาว (${novel.ratingsCount} รีวิว)`}>
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span>{novel.averageRating?.toFixed(1) ?? 'N/A'}</span>
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
                <span className="flex items-center gap-1" title={`${novel.publishedEpisodesCount} / ${novel.episodesCount} ตอน`}>
                  <BookOpen className="w-4 h-4" />
                  <span>{novel.publishedEpisodesCount ?? 0}/{novel.episodesCount ?? 0} ตอน</span>
                </span>
                 <span className="flex items-center gap-1" title={`อัปเดตล่าสุด`}>
                  <Clock className="w-4 h-4" />
                  <span>{formatDate(novel.lastEpisodePublishedAt || novel.updatedAt)}</span>
                 </span>
              </motion.div>

              {/* Tags & Categories */}
              <motion.div className="flex flex-wrap gap-2 mb-5" variants={itemVariants}>
                {novel.categories?.map((cat) => (
                  <TagBadge key={cat._id.toString()} text={cat.name} type="category" slug={cat.slug} />
                ))}
                {novel.tags?.slice(0, 5).map((tag) => ( // แสดงแค่ 5 tags แรก
                  <TagBadge key={tag} text={tag} type="tag" />
                ))}
              </motion.div>
            </div>

             {/* Action Buttons */}
             <motion.div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0" variants={itemVariants}>
              {/* ปุ่ม "อ่านตอนแรก" หรือ "อ่านต่อ" */}
              <Link
                href={`/play/${novel.slug}/${novel.firstEpisodeSlug || ''}`} // ต้องมี slug ตอนแรก
                className={`
                  inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 ease-in-out
                  bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 hover:shadow-primary/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${!novel.firstEpisodeSlug ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                aria-disabled={!novel.firstEpisodeSlug}
                onClick={(e) => !novel.firstEpisodeSlug && e.preventDefault()} // ป้องกันการคลิกถ้าไม่มีตอนแรก
              >
                <Play className="w-5 h-5" />
                {/* เพิ่ม logic แสดง "อ่านต่อ" ถ้ามี session/progress */}
                <span>{novel.firstEpisodeSlug ? "เริ่มอ่าน" : "ยังไม่มีตอน"}</span>
              </Link>

              {/* ปุ่ม "ติดตาม" / "เลิกติดตาม" */}
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full font-medium transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                title="ติดตาม" // เพิ่ม logic แสดง "เลิกติดตาม"
              >
                <Bookmark className="w-5 h-5" />
                <span className="hidden sm:inline">ติดตาม</span>
              </button>

              {/* ปุ่ม "แชร์" */}
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 px-3 py-3 rounded-full font-medium transition-colors text-muted-foreground hover:text-primary hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                title="แชร์"
              >
                <Share2 className="w-5 h-5" />
              </button>

               {/* ปุ่ม "เพิ่มเติม" (ถ้าต้องการ) */}
               {/* <button type="button" className="inline-flex items-center justify-center p-3 rounded-full font-medium transition-colors text-muted-foreground hover:text-primary hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background" title="เพิ่มเติม">
                <MoreHorizontal className="w-5 h-5" />
               </button> */}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}