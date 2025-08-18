// src/components/dashboard/OverviewTab.tsx
// แท็บภาพรวม Dashboard สำหรับนักเขียน - Modern & Responsive Design
// รองรับ Visual Novel Platform พร้อม Interactive Elements
'use client';

import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  BookOpen, 
  Eye, 
  Users, 
  Star,
  Coins,
  Calendar,
  Clock,
  Target,
  Award,
  Zap,
  Coffee,
  Heart,
  MessageCircle,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Bell,
  Gift,
  Sparkles,
  Crown,
  Activity,
  BarChart3,
  PieChart,
  Trophy,
  Plus,
  Edit,
  BarChart,
  Settings,
  ChevronRight,
  PenTool,
  Globe
} from 'lucide-react';
import { SerializedUser, SerializedNovel, SerializedEarningAnalytic, SerializedEarningTransaction } from '@/app/dashboard/page';
import DashboardHeader from './DashboardHeader';
import StatsOverview from './StatsOverview';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import CreateNovelModal from './CreateNovelModal';

interface OverviewTabProps {
  user: SerializedUser;
  totalStats: {
    totalNovels: number;
    totalNovelsPublished: number;
    totalEpisodes: number;
    totalViews: number;
    totalEarnings: number;
    averageRating: number;
    totalFollowers: number;
  };
  novels: SerializedNovel[];
  recentTransactions: SerializedEarningTransaction[];
  earningAnalytics: SerializedEarningAnalytic[];
}

// Component สำหรับ Achievement Card
function AchievementCard({ achievement, delay }: { achievement: any; delay: number }) {
  return (
    <motion.div
      className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 
                 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 relative overflow-hidden group
                 hover:shadow-lg transition-all duration-300"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 300 }}
      whileHover={{ scale: 1.05, y: -2 }}
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl 
                        flex items-center justify-center shadow-lg">
          <Trophy className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-yellow-800 dark:text-yellow-400">{achievement.title}</h4>
          <p className="text-xs text-yellow-600 dark:text-yellow-500">{achievement.description}</p>
        </div>
      </div>
    </motion.div>
  );
}

// Component สำหรับ Quick Action Card
function QuickActionCard({ icon: Icon, title, description, color, onClick, delay }: any) {
  return (
    <motion.div
      className="bg-card border border-border rounded-xl p-6 hover:shadow-lg 
                 transition-all duration-300 cursor-pointer group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center
                         group-hover:scale-110 transition-transform`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-card-foreground group-hover:text-primary 
                         transition-colors">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary 
                                 transition-colors" />
      </div>
    </motion.div>
  );
}

// Component สำหรับ Recent Novel Card
function RecentNovelCard({ novel, index }: { novel: SerializedNovel; index: number }) {
  const statusColors = {
    published: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
  };

  return (
    <motion.div
      className="bg-card border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-300 group"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.02, x: 5 }}
    >
      <div className="flex items-center gap-4">
        {/* Cover Image */}
        <div className="w-16 h-20 bg-secondary rounded-lg overflow-hidden flex-shrink-0">
          {novel.coverImageUrl ? (
            <img 
              src={novel.coverImageUrl} 
              alt={novel.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Novel Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {novel.title}
          </h4>
          <div className="flex items-center gap-3 mt-1">
            <span className={`text-xs px-2 py-1 rounded-full ${statusColors[novel.status as keyof typeof statusColors]}`}>
              {novel.status === 'published' ? 'เผยแพร่แล้ว' : novel.status === 'draft' ? 'ฉบับร่าง' : 'จบแล้ว'}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {(novel.stats?.viewsCount || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <Link href={`/novels/${novel.slug}/overview`}>
          <motion.button
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
          </motion.button>
        </Link>
      </div>
    </motion.div>
  );
}

export default function OverviewTab({
  user,
  totalStats,
  novels,
  recentTransactions,
  earningAnalytics
}: OverviewTabProps) {
  const [greeting, setGreeting] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const isWriter = user.roles?.includes('Writer') || false;

  // Handle novel creation success  
  const handleNovelCreated = (newNovel: any) => {
    // Modal handles the success message and closes automatically
    // The parent dashboard will handle refreshing the data if needed
    console.log('Novel created successfully:', newNovel);
  };

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('สวัสดีตอนเช้า');
    } else if (hour < 17) {
      setGreeting('สวัสดีตอนบ่าย'); 
    } else {
      setGreeting('สวัสดีตอนเย็น');
    }
  }, []);

  const quickActions = [
    {
      title: 'สร้างนิยายใหม่',
      description: 'เริ่มต้นเขียนเรื่องราวใหม่',
      icon: Plus,
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      onClick: () => setIsCreateModalOpen(true)
    },
    {
      title: 'จัดการนิยาย',
      description: 'แก้ไขและจัดการนิยายที่มีอยู่',
      icon: Edit,
      color: 'bg-gradient-to-br from-green-500 to-green-600'
    },
    {
      title: 'ดูสถิติ',
      description: 'ตรวจสอบประสิทธิภาพผลงาน',
      icon: BarChart,
      color: 'bg-gradient-to-br from-purple-500 to-purple-600'
    },
    {
      title: 'ตั้งค่า',
      description: 'ปรับแต่งโปรไฟล์และการตั้งค่า',
      icon: Settings,
      color: 'bg-gradient-to-br from-orange-500 to-orange-600'
    }
  ];

  // จำลอง Achievements (ในอนาคตดึงจาก UserAchievement)
  const achievements = [
    { title: 'นักเขียนมือใหม่', description: 'เผยแพร่นิยายเรื่องแรก' },
    { title: 'ยอดนิยม', description: 'มียอดชมเกิน 1,000 ครั้ง' }
  ];

  // Recent novels (5 เรื่องล่าสุด)
  const recentNovels = Array.isArray(novels) ? novels.slice(0, 5) : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Dashboard Header */}
      <DashboardHeader user={user} totalStats={totalStats} />

      {/* Main Content */}
      <div className="space-y-8">
        {/* Welcome Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 
                          border border-primary/20 rounded-2xl p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
                  {greeting}, {user.profile?.displayName || user.username}!
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles className="w-8 h-8 text-yellow-500" />
                  </motion.div>
                </h1>
                <p className="text-muted-foreground">
                  {isWriter 
                    ? 'พร้อมสร้างสรรค์เรื่องราวใหม่วันนี้หรือยัง?' 
                    : 'เริ่มต้นการเดินทางในฐานะนักเขียนได้แล้ววันนี้!'}
                </p>
              </div>

              {/* Daily Stats */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{totalStats.totalViews.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">ยอดชมวันนี้</div>
                </div>
                <div className="h-12 w-px bg-border" />
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-500">+{Math.floor(totalStats.totalEarnings / 100)}</div>
                  <div className="text-sm text-muted-foreground">รายได้วันนี้ (บาท)</div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Quick Actions - ย้ายมาอยู่เหนือ Stats Overview */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-3">
            <Zap className="w-6 h-6 text-primary" />
            ดำเนินการด่วน
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <QuickActionCard key={action.title} {...action} delay={0.1 * index} />
            ))}
          </div>
        </motion.section>

        {/* Stats Overview */}
        <StatsOverview 
          stats={totalStats}
          recentTransactions={recentTransactions}
          earningAnalytics={earningAnalytics}
        />

        {/* Recent Activity Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Recent Novels (2/3 width on xl) */}
          <div className="xl:col-span-2 space-y-6">
            {/* Recent Novels */}
            {recentNovels.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-3">
                    <BookOpen className="w-6 h-6 text-primary" />
                    นิยายล่าสุด
                  </h2>
                  <Link href="/dashboard?tab=novels">
                    <motion.button
                      className="text-sm text-primary hover:text-primary-hover font-medium 
                                 flex items-center gap-1"
                      whileHover={{ x: 5 }}
                    >
                      ดูทั้งหมด
                      <ArrowUpRight className="w-4 h-4" />
                    </motion.button>
                  </Link>
                </div>
                <div className="space-y-3">
                  {recentNovels.map((novel, index) => (
                    <RecentNovelCard key={novel._id} novel={novel} index={index} />
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar Content (1/3 width on xl) */}
          <div className="space-y-6">
            {/* Achievements */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-3">
                <Award className="w-5 h-5 text-primary" />
                ความสำเร็จล่าสุด
              </h3>
              <div className="space-y-3">
                {achievements.map((achievement, index) => (
                  <AchievementCard key={achievement.title} achievement={achievement} delay={0.1 * index} />
                ))}
              </div>
            </motion.div>

            {/* Notifications */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-card border border-border rounded-xl p-6"
            >
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-3">
                <Bell className="w-5 h-5 text-primary" />
                การแจ้งเตือน
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">มีผู้อ่านใหม่ติดตามคุณ</p>
                    <p className="text-xs text-muted-foreground">5 นาทีที่แล้ว</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">นิยายของคุณได้รับคอมเมนต์ใหม่</p>
                    <p className="text-xs text-muted-foreground">1 ชั่วโมงที่แล้ว</p>
                  </div>
                </div>
              </div>
              <Link href="/notifications">
                <motion.button
                  className="mt-4 w-full text-center text-sm text-primary hover:text-primary-hover 
                             font-medium flex items-center justify-center gap-1"
                  whileHover={{ scale: 1.02 }}
                >
                  ดูทั้งหมด
                  <ArrowUpRight className="w-3 h-3" />
                </motion.button>
              </Link>
            </motion.div>

            {/* Writer Tips */}
            {isWriter && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 
                           border border-purple-200 dark:border-purple-800 rounded-xl p-6"
              >
                <h3 className="text-lg font-bold text-purple-800 dark:text-purple-400 mb-3 
                               flex items-center gap-3">
                  <Coffee className="w-5 h-5" />
                  เคล็ดลับนักเขียน
                </h3>
                <p className="text-sm text-purple-700 dark:text-purple-300 leading-relaxed">
                  การเผยแพร่ตอนใหม่อย่างสม่ำเสมอช่วยรักษาผู้อ่านและเพิ่มการมีส่วนร่วม 
                  ลองตั้งเป้าหมายเผยแพร่อย่างน้อยสัปดาห์ละ 1 ตอน
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Create Novel Modal */}
      <CreateNovelModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        user={user}
        onNovelCreated={handleNovelCreated}
      />
    </div>
  );
} 