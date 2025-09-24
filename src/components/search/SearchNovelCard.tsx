// src/components/search/SearchNovelCard.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Heart, Eye, BookOpen, Star } from 'lucide-react';

// ประเภทของข้อมูลนิยาย
export interface Novel {
  _id: string;
  title: string;
  slug: string; // slug ที่จะใช้สำหรับ URL
  synopsis?: string;
  description?: string;
  coverImage?: string;
  coverImageUrl?: string;
  author?: {
    _id: string;
    username?: string;
    profile?: {
      displayName?: string;
      penName?: string;
      avatarUrl?: string;
    }
  };
  status: "draft" | "published" | "completed" | "onHiatus" | "archived" | "PUBLISHED" | "COMPLETED" | "ONGOING";
  isCompleted?: boolean;
  categories?: {
    _id: string;
    name: string;
    slug: string;
  }[];
  mainThemeCategory?: {
    _id: string;
    name: string;
    slug: string;
    color?: string;
  };
  subThemeCategories?: {
    _id: string;
    name: string;
    slug: string;
    color?: string;
  }[];
  isPremium?: boolean;
  isDiscounted?: boolean;
  stats?: {
    averageRating?: number;
    viewsCount?: number;
    likesCount?: number;
    followersCount?: number;
    totalWords?: number;
  };
  averageRating?: number;
  viewsCount?: number;
  likesCount?: number;
  publishedEpisodesCount?: number;
  totalEpisodesCount?: number;
}

interface SearchNovelCardProps {
  novel: Novel;
  index: number;
}

export const SearchNovelCard = ({ novel, index }: SearchNovelCardProps) => {
  // แปลงสถานะเป็นภาษาไทย
  const getStatusText = (status: Novel['status']) => {
    const statusMap = {
      'draft': 'ฉบับร่าง',
      'published': 'กำลังเผยแพร่',
      'completed': 'จบแล้ว',
      'onHiatus': 'หยุดชั่วคราว',
      'archived': 'เก็บถาวร'
    };
    return statusMap[status] || status;
  };

  // แปลงเลขให้อ่านง่าย เช่น 1000 -> 1K
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'; // ลบ .0 ถ้ามี
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K'; // ลบ .0 ถ้ามี
    }
    return num.toString();
  };

  // คำนวณเวลาในการแสดงแอนิเมชั่น
  const animationDelay = index * 0.05;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: animationDelay }}
      whileHover={{ y: -4 }}
      className="h-full group"
    >
      {/*
        ปรับปรุง Link href จาก /novel/${novel.slug} เป็น /novels/${novel.slug}
        เพื่อให้สอดคล้องกับโครงสร้าง URL ของ NovelCard ในหน้าหลัก
      */}
      <Link href={`/novels/${novel.slug}`} className="block h-full" title={novel.title}>
        <div className="bg-card overflow-hidden rounded-lg border border-border h-full flex flex-col transition-all duration-300 group-hover:border-primary group-hover:shadow-md">
          {/* รูปปกนิยาย */}
          <div className="relative aspect-[2/3] overflow-hidden">
            <Image
              src={novel.coverImageUrl || novel.coverImage || "/images/placeholder-cover.webp"} // เพิ่ม placeholder กรณีไม่มีรูป
              alt={novel.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 300px"
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              priority={index < 6} // โหลดรูปแบบ priority สำหรับรูปที่อยู่ด้านบน
              onError={(e) => { // จัดการกรณีรูปโหลดไม่สำเร็จ
                const target = e.target as HTMLImageElement;
                if (target.src !== "/images/placeholder-cover.webp") {
                  target.src = "/images/placeholder-cover.webp";
                  target.srcset = "/images/placeholder-cover.webp";
                }
              }}
            />
            
            {/* แสดงป้ายสถานะและป้ายพรีเมียม/ลดราคา */}
            <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
              <div>
                <span className="inline-block px-2 py-1 text-xs font-medium bg-background/80 backdrop-blur-sm text-foreground rounded shadow-sm">
                  {getStatusText(novel.status)}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                {novel.isPremium && (
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-primary/90 backdrop-blur-sm text-primary-foreground rounded shadow-sm">
                    พรีเมียม
                  </span>
                )}
                {novel.isDiscounted && (
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-accent/90 backdrop-blur-sm text-secondary-foreground rounded shadow-sm">
                    ลดราคา
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* ข้อมูลนิยาย */}
          <div className="p-3 flex flex-col flex-grow">
            <h3 className="font-semibold text-base text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors" title={novel.title}>
              {novel.title}
            </h3>
            
            <div className="text-xs text-muted-foreground mb-1.5"> {/* ปรับ mb เล็กน้อย */}
              โดย <span className="font-medium text-foreground hover:text-primary transition-colors">{novel.author?.profile?.displayName || novel.author?.profile?.penName || novel.author?.username || 'ไม่ระบุผู้เขียน'}</span>
            </div>
            
            {/* แสดงหมวดหมู่ไม่เกิน 2 รายการ */}
            <div className="flex flex-wrap gap-1.5 mt-1 mb-2"> {/* ปรับ gap และ margin */}
              {novel.mainThemeCategory && (
                <span 
                  key={novel.mainThemeCategory._id} 
                  className="inline-block px-2.5 py-1 text-[11px] rounded-full hover:opacity-90 transition-colors"
                  style={{ 
                    backgroundColor: novel.mainThemeCategory.color || '#6366F1',
                    color: '#FFFFFF'
                  }}
                >
                  {novel.mainThemeCategory.name}
                </span>
              )}
              
              {novel.subThemeCategories && novel.subThemeCategories.length > 0 && (
                <span 
                  key={novel.subThemeCategories[0]._id} 
                  className="inline-block px-2.5 py-1 bg-secondary text-secondary-foreground text-[11px] rounded-full hover:bg-secondary/80 transition-colors"
                >
                  {novel.subThemeCategories[0].name}
                </span>
              )}
              
              {/* แสดงจำนวนหมวดหมู่เพิ่มเติม */}
              {((novel.subThemeCategories?.length || 0) > 1 || (novel.categories?.length || 0) > 0) && (
                <span className="inline-block px-2.5 py-1 bg-secondary text-secondary-foreground text-[11px] rounded-full">
                  +{((novel.subThemeCategories?.length || 0) - 1) + (novel.categories?.length || 0)}
                </span>
              )}
            </div>
            
            {/* แสดงสถิติต่างๆ */}
            <div className="flex justify-between items-center mt-auto pt-2 border-t border-border/60 text-xs text-muted-foreground"> {/* เพิ่ม pt และปรับ border */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1" title={`คะแนนเฉลี่ย: ${(novel.stats?.averageRating || novel.averageRating || 0).toFixed(1)}`}>
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-medium">{(novel.stats?.averageRating || novel.averageRating || 0).toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1" title={`ยอดเข้าชม: ${(novel.stats?.viewsCount || novel.viewsCount || 0).toLocaleString()}`}>
                  <Eye className="w-3.5 h-3.5" />
                  <span>{formatNumber(novel.stats?.viewsCount || novel.viewsCount || 0)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1" title={`ถูกใจ: ${(novel.stats?.likesCount || novel.likesCount || 0).toLocaleString()}`}>
                  <Heart className="w-3.5 h-3.5 text-rose-500" /> {/* เพิ่มสีให้ Heart icon */}
                  <span>{formatNumber(novel.stats?.likesCount || novel.likesCount || 0)}</span>
                </div>
                <div className="flex items-center gap-1" title={`จำนวนตอน: ${novel.publishedEpisodesCount || 0}`}>
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{novel.publishedEpisodesCount || 0} ตอน</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};