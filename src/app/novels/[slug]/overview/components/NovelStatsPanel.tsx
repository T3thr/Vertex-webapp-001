// app/novels/[slug]/overview/components/NovelStatsPanel.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Eye, 
  Users, 
  Heart, 
  MessageCircle, 
  Star, 
  TrendingUp, 
  Clock, 
  BookOpen,
  Target,
  Award
} from 'lucide-react';

interface NovelStatsProps {
  stats: {
    viewsCount: number;
    uniqueViewersCount: number;
    likesCount: number;
    commentsCount: number;
    followersCount: number;
    averageRating: number;
    totalWords: number;
    estimatedReadingTimeMinutes: number;
    completionRate: number;
    trendingStats?: {
      viewsLast24h?: number;
      trendingScore?: number;
    };
  };
  totalEpisodes: number;
}

/**
 * NovelStatsPanel - คอมโพเนนต์สำหรับแสดงสถิติต่างๆ ของนิยาย
 * แสดงข้อมูลในรูปแบบการ์ดที่เข้าใจง่าย
 */
export default function NovelStatsPanel({ stats, totalEpisodes }: NovelStatsProps) {
  // ฟังก์ชันสำหรับแปลงตัวเลขให้อ่านง่าย
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  // ฟังก์ชันสำหรับแปลงเวลาอ่าน
  const formatReadingTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} นาที`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} ชม. ${remainingMinutes > 0 ? `${remainingMinutes} นาที` : ''}`;
  };

  // ข้อมูลสถิติที่จะแสดง
  const statItems = [
    {
      title: 'ยอดเข้าชมทั้งหมด',
      value: formatNumber(stats.viewsCount),
      icon: Eye,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      trend: stats.trendingStats?.viewsLast24h 
        ? `+${formatNumber(stats.trendingStats.viewsLast24h)} ใน 24 ชม.`
        : undefined
    },
    {
      title: 'ผู้อ่านที่ไม่ซ้ำ',
      value: formatNumber(stats.uniqueViewersCount),
      icon: Users,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      trend: undefined
    },
    {
      title: 'ถูกใจทั้งหมด',
      value: formatNumber(stats.likesCount),
      icon: Heart,
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      trend: undefined
    },
    {
      title: 'ความคิดเห็น',
      value: formatNumber(stats.commentsCount),
      icon: MessageCircle,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      trend: undefined
    },
    {
      title: 'ผู้ติดตาม',
      value: formatNumber(stats.followersCount),
      icon: Target,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      trend: undefined
    },
    {
      title: 'คะแนนเฉลี่ย',
      value: stats.averageRating.toFixed(1),
      icon: Star,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      trend: undefined
    },
    {
      title: 'จำนวนคำทั้งหมด',
      value: formatNumber(stats.totalWords),
      icon: BookOpen,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      trend: undefined
    },
    {
      title: 'เวลาอ่านโดยประมาณ',
      value: formatReadingTime(stats.estimatedReadingTimeMinutes),
      icon: Clock,
      color: 'text-teal-500',
      bgColor: 'bg-teal-50 dark:bg-teal-900/20',
      trend: undefined
    },
    {
      title: 'อัตราการอ่านจบ',
      value: `${stats.completionRate.toFixed(1)}%`,
      icon: Award,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      trend: undefined
    },
    {
      title: 'คะแนนความนิยม',
      value: stats.trendingStats?.trendingScore 
        ? stats.trendingStats.trendingScore.toFixed(1)
        : '0.0',
      icon: TrendingUp,
      color: 'text-pink-500',
      bgColor: 'bg-pink-50 dark:bg-pink-900/20',
      trend: undefined
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="space-y-6"
    >
      {/* หัวข้อส่วน */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          สถิติประสิทธิภาพ
        </h2>
        <div className="text-sm text-muted-foreground">
          จำนวนตอนทั้งหมด: {totalEpisodes} ตอน
        </div>
      </div>

      {/* กริดแสดงสถิติ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statItems.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              duration: 0.3, 
              delay: 0.1 * index,
              type: "spring",
              stiffness: 300
            }}
            whileHover={{ 
              scale: 1.05,
              transition: { duration: 0.2 }
            }}
            className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${item.bgColor}`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              
              {item.trend && (
                <div className="text-xs text-muted-foreground bg-accent/50 px-2 py-1 rounded-full">
                  {item.trend}
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <div className="text-2xl font-bold text-foreground">
                {item.value}
              </div>
              <div className="text-xs text-muted-foreground leading-tight">
                {item.title}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* สถิติเพิ่มเติม */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="bg-gradient-to-r from-primary/10 to-accent/10 border border-border rounded-lg p-4"
      >
        <h3 className="text-sm font-semibold text-foreground mb-3">
          ภาพรวมประสิทธิภาพ
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="space-y-1">
            <div className="text-muted-foreground">การมีส่วนร่วม</div>
            <div className="text-foreground font-medium">
              {stats.likesCount > 0 && stats.viewsCount > 0 
                ? ((stats.likesCount / stats.viewsCount) * 100).toFixed(2)
                : '0.00'
              }% ของผู้เข้าชม
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-muted-foreground">ความยาวเฉลี่ยต่อตอน</div>
            <div className="text-foreground font-medium">
              {totalEpisodes > 0 
                ? formatNumber(Math.round(stats.totalWords / totalEpisodes))
                : '0'
              } คำ
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-muted-foreground">ผู้อ่านซ้ำ</div>
            <div className="text-foreground font-medium">
              {stats.uniqueViewersCount > 0 
                ? (stats.viewsCount / stats.uniqueViewersCount).toFixed(1)
                : '0.0'
              }x เฉลี่ย
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}