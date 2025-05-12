// src/components/NovelCard.tsx
// คอมโพเนนต์สำหรับแสดงการ์ดนิยายในหน้าแรกหรือหน้าค้นหา
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { FiHeart, FiEye, FiStar, FiClock } from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

// อินเทอร์เฟซสำหรับข้อมูลส่วนลด
interface DiscountDetails {
  percentage?: number;
  startDate?: Date;
  endDate?: Date;
}

// อินเทอร์เฟซสำหรับข้อมูลนิยาย
interface Novel {
  _id: string;
  title: string;
  slug: string;
  coverImage: string;
  description?: string;
  status: "draft" | "published" | "completed" | "onHiatus" | "archived";
  isExplicitContent: boolean;
  isDiscounted: boolean;
  discountDetails?: DiscountDetails;
  tags: string[];
  lastEpisodePublishedAt?: Date | string;
  viewsCount?: number;
  likesCount?: number;
  averageRating?: number;
  author?: {
    displayName?: string;
    username?: string;
  };
}

// อินเทอร์เฟซสำหรับ props ของคอมโพเนนต์
interface NovelCardProps {
  novel: Novel;
  priority?: boolean;
  size?: "sm" | "md" | "lg";
  showAuthor?: boolean;
}

/**
 * คอมโพเนนต์ NovelCard สำหรับแสดงการ์ดนิยาย
 * @param novel ข้อมูลนิยาย
 * @param priority ใช้ priority loading สำหรับรูปภาพหรือไม่
 * @param size ขนาดของการ์ด (sm, md, lg)
 * @param showAuthor แสดงชื่อผู้เขียนหรือไม่
 */
export function NovelCard({
  novel,
  priority = false,
  size = "md",
  showAuthor = false,
}: NovelCardProps) {
  // ฟอร์แมตวันที่เป็นภาษาไทย
  const lastUpdated = novel.lastEpisodePublishedAt
    ? formatDistanceToNow(new Date(novel.lastEpisodePublishedAt), {
        addSuffix: true,
        locale: th,
      })
    : "ไม่มีข้อมูล";

  // กำหนดสีป้ายสถานะโดยใช้ธีม
  const getStatusColor = (label: string) => {
    if (label === "ลดราคา") return "bg-purple-500"; // สีสำหรับส่วนลด
    switch (novel.status) {
      case "published":
        return "bg-primary";
      case "completed":
        return "bg-secondary";
      case "onHiatus":
        return "bg-accent";
      default:
        return "bg-muted";
    }
  };

  // สร้างรายการป้ายสถานะ (รวมส่วนลดและสถานะนิยาย)
  const getStatusLabels = (): string[] => {
    const labels: string[] = [];
    // เพิ่มป้ายส่วนลดถ้ามี
    if (novel.isDiscounted) {
      labels.push("ลดราคา");
    }
    // เพิ่มป้ายสถานะนิยาย
    switch (novel.status) {
      case "published":
        labels.push("ยังไม่จบ");
        break;
      case "completed":
        labels.push("จบแล้ว");
        break;
      case "onHiatus":
        labels.push("หยุดชั่วคราว");
        break;
      default:
        labels.push("ร่าง");
        break;
    }
    return labels;
  };

  // ปรับขนาดตัวอักษรตามพารามิเตอร์ size
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <motion.div
      whileHover={{
        scale: 1.03,
        transition: { duration: 0.2 },
      }}
      className="w-full h-full"
    >
      <Link href={`/novels/${novel.slug}`} className="block h-full">
        <div className="bg-card rounded-xl shadow-md overflow-hidden h-full flex flex-col">
          {/* ปกนิยายพร้อมป้ายสถานะ */}
          <div className="relative aspect-[4/3] w-full overflow-hidden">
            <Image
              src={novel.coverImage || "/images/placeholder-cover.jpg"}
              alt={novel.title}
              fill
              sizes="(max-width: 768px) 40vw, 200px"
              className="object-cover transition-transform duration-500 hover:scale-110"
              priority={priority}
            />
            {/* ป้ายแสดงสถานะนิยายและส่วนลด */}
            <div className="absolute top-2 right-2 flex flex-col gap-1">
              {getStatusLabels().map((label) => (
                <span
                  key={label}
                  className={`text-xs font-semibold px-2 py-1 rounded-full text-foreground ${getStatusColor(
                    label
                  )}`}
                >
                  {label}
                </span>
              ))}
            </div>
            {/* ป้ายแสดงการจำกัดอายุ */}
            {novel.isExplicitContent && (
              <div className="absolute top-2 left-2">
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-500 text-primary-foreground">
                  18+
                </span>
              </div>
            )}
            {/* เกรเดียนท์ด้านล่างรูปเพื่อเพิ่มความชัดเจนให้ข้อความ */}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/70 to-transparent"></div>
          </div>

          {/* เนื้อหาการ์ด */}
          <div className="p-3 flex flex-col flex-grow">
            <h2
              className={`font-semibold text-foreground ${sizeClasses[size]} line-clamp-1`}
              title={novel.title}
            >
              {novel.title}
            </h2>
            {/* ชื่อผู้เขียน (ถ้าเลือกแสดง) */}
            {showAuthor && novel.author && (
              <p className="text-xs text-muted-foreground mt-1">
                โดย {novel.author?.displayName || novel.author?.username || "ไม่ระบุผู้เขียน"}
              </p>
            )}
            {/* แท็ก */}
            <div className="mt-2 flex flex-wrap gap-1">
              {novel.tags?.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
              {novel.tags?.length > 2 && (
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                  +{novel.tags.length - 2}
                </span>
              )}
            </div>
            {/* อัพเดตล่าสุด */}
            <div className="mt-1 flex items-center text-[10px] text-muted-foreground">
              <FiClock className="mr-1" size={10} />
              <span>อัพเดตล่าสุด: {lastUpdated}</span>
            </div>
            {/* สถิติ */}
            <div className="mt-auto pt-2 grid grid-cols-3 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1 justify-center">
                <FiEye size={12} />
                <span>{novel.viewsCount?.toLocaleString() || 0}</span>
              </div>
              <div className="flex items-center gap-1 justify-center">
                <FiHeart size={12} />
                <span>{novel.likesCount?.toLocaleString() || 0}</span>
              </div>
              <div className="flex items-center gap-1 justify-center">
                <FiStar size={12} />
                <span>{novel.averageRating?.toFixed(1) || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}