// src/components/NovelCard.tsx
"use client";

import { Novel } from "@/backend/types/novel";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { FiHeart, FiEye, FiStar, FiClock } from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

interface NovelCardProps {
  novel: Novel;
  priority?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function NovelCard({ novel, priority = false, size = 'md' }: NovelCardProps) {
  // ฟอร์แมตวันที่เป็นภาษาไทย
  const lastUpdated = novel.lastEpisodeAt 
    ? formatDistanceToNow(new Date(novel.lastEpisodeAt), { 
        addSuffix: true, 
        locale: th 
      })
    : "ไม่มีข้อมูล";

  // กำหนดสีป้ายสถานะ
  const getStatusColor = () => {
    switch (novel.status) {
      case "published": return "bg-green-500";
      case "completed": return "bg-blue-500";
      case "onHiatus": return "bg-amber-500";
      default: return "bg-gray-500";
    }
  };

  // แปลงสถานะเป็นภาษาไทย
  const getStatusLabel = () => {
    switch (novel.status) {
      case "published": return "กำลังเผยแพร่";
      case "completed": return "จบแล้ว";
      case "onHiatus": return "หยุดชั่วคราว";
      default: return "ร่าง";
    }
  };

  // ปรับขนาดตามพารามิเตอร์ size
  const sizeClasses = {
    sm: 'text-xs', 
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <motion.div
      whileHover={{ 
        scale: 1.03,
        transition: { duration: 0.2 }
      }}
      className="w-full h-full"
    >
      <Link href={`/novels/${novel.slug}`} className="block h-full">
        <div className="bg-card rounded-xl shadow-md overflow-hidden h-full flex flex-col">
          {/* ปกนิยายพร้อมป้ายสถานะ */}
          <div className="relative aspect-[2/3] w-full overflow-hidden">
            <Image
              src={novel.coverImage || "/images/placeholder-cover.jpg"}
              alt={novel.title}
              fill
              sizes="(max-width: 768px) 40vw, 200px"
              className="object-cover transition-transform duration-500 hover:scale-110"
              priority={priority}
            />
            
            <div className="absolute top-2 right-2">
              <span className={`text-xs font-semibold px-2 py-1 rounded-full text-white ${getStatusColor()}`}>
                {getStatusLabel()}
              </span>
            </div>
            
            {novel.isExplicit && (
              <div className="absolute top-2 left-2">
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-500 text-white">
                  18+
                </span>
              </div>
            )}
          </div>

          {/* เนื้อหา */}
          <div className="p-3 flex flex-col flex-grow">
            <h2 
              className={`font-semibold ${sizeClasses[size]} line-clamp-1`} 
              title={novel.title}
            >
              {novel.title}
            </h2>
            
            {/* แท็ก */}
            <div className="mt-2 flex flex-wrap gap-1">
              {novel.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
              {novel.tags.length > 2 && (
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
                <span>{novel.stats?.views?.toLocaleString() || 0}</span>
              </div>
              <div className="flex items-center gap-1 justify-center">
                <FiHeart size={12} />
                <span>{novel.stats?.likes?.toLocaleString() || 0}</span>
              </div>
              <div className="flex items-center gap-1 justify-center">
                <FiStar size={12} />
                <span>{novel.stats?.rating?.toFixed(1) || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}