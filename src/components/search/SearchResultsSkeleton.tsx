'use client';

import { motion } from 'framer-motion';

// คอมโพเนนต์แสดง skeleton ขณะโหลดข้อมูล
export default function SearchResultsSkeleton() {
  // สร้าง array จำนวน 10 ตัวเพื่อแสดง skeleton
  const skeletons = Array.from({ length: 10 }, (_, i) => i);
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {skeletons.map((index) => (
        <SkeletonCard key={index} index={index} />
      ))}
    </div>
  );
}

// Skeleton card แต่ละชิ้น
interface SkeletonCardProps {
  index: number;
}

function SkeletonCard({ index }: SkeletonCardProps) {
  // คำนวณเวลาในการแสดงแอนิเมชั่น
  const animationDelay = index * 0.05;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: animationDelay }}
      className="bg-card overflow-hidden rounded-lg border border-border h-full flex flex-col"
    >
      {/* Skeleton สำหรับรูปปก */}
      <div className="relative aspect-[2/3] bg-secondary animate-pulse">
        <div className="absolute top-2 left-2 w-16 h-6 bg-background/40 rounded"></div>
      </div>
      
      {/* Skeleton สำหรับข้อความ */}
      <div className="p-3 flex flex-col flex-grow space-y-2">
        <div className="h-5 bg-secondary animate-pulse rounded w-4/5"></div>
        <div className="h-4 bg-secondary animate-pulse rounded w-1/2"></div>
        
        <div className="flex gap-1 mt-1">
          <div className="h-5 w-14 bg-secondary animate-pulse rounded-full"></div>
          <div className="h-5 w-16 bg-secondary animate-pulse rounded-full"></div>
        </div>
        
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-8 bg-secondary animate-pulse rounded"></div>
            <div className="h-4 w-10 bg-secondary animate-pulse rounded"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-8 bg-secondary animate-pulse rounded"></div>
            <div className="h-4 w-12 bg-secondary animate-pulse rounded"></div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}