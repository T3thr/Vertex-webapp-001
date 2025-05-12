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
  slug: string;
  description: string;
  coverImage: string;
  author: {
    _id: string;
    username: string;
    profile?: {
      displayName?: string;
    }
  };
  status: "draft" | "published" | "completed" | "onHiatus" | "archived";
  categories: {
    _id: string;
    name: string;
    slug: string;
  }[];
  isPremium: boolean;
  isDiscounted: boolean;
  averageRating: number;
  viewsCount: number;
  likesCount: number;
  publishedEpisodesCount: number;
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
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
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
      <Link href={`/novel/${novel.slug}`} className="block h-full">
        <div className="bg-card overflow-hidden rounded-lg border border-border h-full flex flex-col transition-all duration-300 group-hover:border-primary group-hover:shadow-md">
          {/* รูปปกนิยาย */}
          <div className="relative aspect-[2/3] overflow-hidden">
            <Image
              src={novel.coverImage}
              alt={novel.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 300px"
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              priority={index < 6} // โหลดรูปแบบ priority สำหรับรูปที่อยู่ด้านบน
            />
            
            {/* แสดงป้ายสถานะและป้ายพรีเมียม */}
            <div className="absolute top-2 left-2 right-2 flex justify-between">
              <div>
                <span className="inline-block px-2 py-1 text-xs font-medium bg-background/80 backdrop-blur-sm text-foreground rounded">
                  {getStatusText(novel.status)}
                </span>
              </div>
              <div className="flex gap-1">
                {novel.isPremium && (
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-primary/90 backdrop-blur-sm text-primary-foreground rounded">
                    พรีเมียม
                  </span>
                )}
                {novel.isDiscounted && (
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-accent/90 backdrop-blur-sm text-secondary-foreground rounded">
                    ลดราคา
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* ข้อมูลนิยาย */}
          <div className="p-3 flex flex-col flex-grow">
            <h3 className="font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
              {novel.title}
            </h3>
            
            <div className="text-xs text-muted-foreground mb-1">
              โดย <span className="text-foreground hover:text-primary">{novel.author.profile?.displayName || novel.author.username}</span>
            </div>
            
            {/* แสดงหมวดหมู่ไม่เกิน 2 รายการ */}
            <div className="flex flex-wrap gap-1 mt-1 mb-2">
              {novel.categories.slice(0, 2).map((category) => (
                <span key={category._id} className="inline-block px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-full">
                  {category.name}
                </span>
              ))}
              {novel.categories.length > 2 && (
                <span className="inline-block px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-full">
                  +{novel.categories.length - 2}
                </span>
              )}
            </div>
            
            {/* แสดงสถิติต่างๆ */}
            <div className="flex justify-between items-center mt-auto text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  <span>{novel.averageRating.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{formatNumber(novel.viewsCount)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5" />
                  <span>{formatNumber(novel.likesCount)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{novel.publishedEpisodesCount} ตอน</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};