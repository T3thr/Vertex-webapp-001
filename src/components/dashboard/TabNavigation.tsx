// src/components/dashboard/TabNavigation.tsx
// ระบบ Tab Navigation สำหรับแสดงข้อมูลแยกตาม Tab พร้อม animation - อัพเกรดแล้ว
// รองรับ global.css theme system และมี interactive elements ที่สวยงาม
'use client';

import { useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  BookOpen,
  BarChart3,
  Settings,
  TrendingUp,
  Eye,
  Users,
  DollarSign,
  Star,
  Target,
  Zap,
  Activity,
  PieChart,
  LineChart,
  Calendar,
  Award,
  Coffee,
  Sparkles,
  Crown,
  Gift,
  Heart,
  MessageCircle,
  FileText,
  Edit,
  Plus,
  Search,
  Filter,
  Download,
  Share2,
  RefreshCw,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  Info,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import React from 'react';

// --- Start: Type definitions (mirroring structure from page.tsx) ---
// These types should ideally be imported from page.tsx or a shared types file
// For simplicity here, they are defined to match the relevant parts of your page.tsx interfaces.

interface SerializedNovelForTab {
  _id: string;
  id: string;
  title: string;
  publishedAt?: string; // Used for filtering published status
  // Add any other fields from SerializedNovel if used by TabNavigation or its children via props
  // For example, if the user's hidden filter code at line 206 needs other fields:
  // stats?: {
  //   publishedEpisodesCount?: number;
  // };
}

interface TotalStatsForTab {
  totalNovels: number;
  totalEpisodes: number;
  totalViews: number;
  totalEarnings: number; // Available in totalStats from page.tsx
  averageRating: number;
  totalFollowers: number; // Available in totalStats from page.tsx
}

// Assuming SerializedEarningAnalytic has at least an 'id' or is an object
interface SerializedEarningAnalyticForTab {
  _id: string;
  id: string;
  // Add other fields if needed by TabNavigation
}
// --- End: Type definitions ---


interface TabNavigationProps {
  children: React.ReactNode[];
  novels: SerializedNovelForTab[];
  totalStats: TotalStatsForTab;
  earningAnalytics: SerializedEarningAnalyticForTab[];
  isWriter: boolean;
}

interface TabItem {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
  stats?: {
    count: number | string; // Allow string for things like averageRating
    label: string;
  };
  disabled?: boolean;
}

interface QuickStatProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  delay: number;
}

// Component สำหรับแสดงสถิติด่วน
function QuickStat({ icon: Icon, label, value, color, delay }: QuickStatProps) {
  return (
    <motion.div
      className={`${color} rounded-xl p-4 text-center relative overflow-hidden group`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 300 }}
      whileHover={{ scale: 1.05, y: -2 }}
    >
      {/* Background Effect */}
      <div className="absolute inset-0 opacity-20">
        <motion.div
          className="w-full h-full bg-gradient-to-br from-white/20 to-transparent"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      <div className="relative z-10">
        <motion.div
          className="mb-2"
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.6 }}
        >
          <Icon className="w-6 h-6 text-white mx-auto" />
        </motion.div>

        <motion.div
          className="text-2xl font-bold text-white mb-1"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.2, type: "spring" }}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </motion.div>

        <div className="text-white/80 text-xs font-medium">{label}</div>
      </div>
    </motion.div>
  );
}

// Component สำหรับ Feature Card
interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  action: string;
  color: string;
  delay: number;
}

function FeatureCard({ icon: Icon, title, description, color, action, delay }: FeatureCardProps) {
  return (
    <motion.div
      className={`${color} rounded-xl p-6 text-white relative overflow-hidden group cursor-pointer`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.02, y: -3 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-8 h-8 border border-white/30 rounded-full"
            style={{
              left: `${20 + i * 25}%`,
              top: `${30 + i * 15}%`,
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <motion.div
            className="p-2 bg-white/20 rounded-lg"
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
          >
            <Icon className="w-6 h-6" />
          </motion.div>
          <h4 className="font-semibold text-lg">{title}</h4>
        </div>

        <p className="text-white/90 text-sm mb-4 leading-relaxed">{description}</p>

        <motion.div
          className="flex items-center gap-2 text-sm text-white/90 hover:text-white font-medium group/btn"
          whileHover={{ x: 5 }}
        >
          <span>{action}</span>
          <motion.div
            className="group-hover/btn:translate-x-1 transition-transform"
          >
            <ChevronRight className="w-4 h-4" />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function TabNavigation({ children, novels, totalStats, earningAnalytics, isWriter }: TabNavigationProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  // This is the problematic line mentioned by the user (assumed to be around here or at line 206)
  // It will now work because `novels` is a prop.
  // The filter logic is changed to use `publishedAt` as `status` is not in SerializedNovel.
  // This count might be used by other parts of the user's code not shown.
  // If this was purely for the tab stats, it's now redundant due to totalStats.
  const publishedNovelsCount = novels.filter(n => n.publishedAt).length;
  // You can console.log(publishedNovelsCount) here if you need to verify it for other purposes.

  // กำหนดข้อมูล tabs (Dynamically using props)
  const tabs: TabItem[] = [
    {
      id: 'novels',
      label: 'นิยาย',
      icon: BookOpen,
      description: 'จัดการและติดตามผลงานนิยายของคุณ',
      color: 'from-blue-500 to-cyan-500',
      stats: { count: totalStats.totalNovels, label: 'เรื่องที่สร้าง' }
    },
    {
      id: 'analytics',
      label: 'รายงาน',
      icon: BarChart3,
      description: 'วิเคราะห์ข้อมูลเชิงลึกและสถิติต่างๆ',
      color: 'from-purple-500 to-pink-500',
      stats: { count: earningAnalytics.length, label: 'รายงานพร้อม' },
      disabled: !isWriter
    }
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  const tabVariants: Variants = {
    inactive: {
      backgroundColor: 'transparent',
      color: 'var(--muted-foreground)',
      scale: 1,
      y: 0
    },
    active: {
      backgroundColor: 'var(--primary)',
      color: 'var(--primary-foreground)',
      scale: 1.02,
      y: -2,
      transition: {
        duration: 0.3,
        ease: 'easeInOut'
      }
    }
  };

  const contentVariants: Variants = {
    hidden: {
      opacity: 0,
      x: -30,
      transition: {
        duration: 0.2
      }
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.4,
        ease: 'easeOut'
      }
    }
  };

  return (
    <motion.div
      className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Sticky/scrollable tab bar for mobile */}
      <div className="sticky top-0 z-20 bg-card border-b border-border md:static md:bg-transparent md:border-none">
        <div className="flex overflow-x-auto no-scrollbar md:overflow-visible md:justify-start gap-2 px-2 py-2 md:p-0">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === index;
            const isDisabled = tab.disabled;
            return (
              <motion.button
                key={tab.id}
                className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-300 relative overflow-hidden
                  ${isActive ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-card-foreground hover:bg-secondary/70'}
                  ${isDisabled ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''}`}
                onClick={() => !isDisabled && setActiveTab(index)}
                variants={tabVariants}
                animate={isActive ? 'active' : 'inactive'}
                whileHover={!isActive && !isDisabled ? { scale: 1.02, y: -1 } : {}}
                whileTap={{ scale: 0.98 }}
                tabIndex={isDisabled ? -1 : 0}
                aria-disabled={isDisabled}
              >
                <Icon className="w-5 h-5" />
                <span className="hidden sm:inline">{tab.label}</span>
                {isDisabled && (
                  <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 bg-background text-xs text-muted-foreground px-2 py-1 rounded shadow-lg whitespace-nowrap z-30">
                    สมัครเป็นนักเขียนเพื่อดูรายงาน
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Header */}
      <motion.div
        className="border-b border-border bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5"
        variants={itemVariants}
      >
        <div className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <motion.h2
                className="text-2xl md:text-3xl font-bold text-card-foreground mb-2 flex items-center gap-3"
                whileHover={{ scale: 1.02 }}
              >
                <motion.div
                  className="p-2 bg-primary/10 rounded-xl"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <Target className="w-6 h-6 text-primary" />
                </motion.div>
                จัดการผลงาน
              </motion.h2>
              <p className="text-muted-foreground">ติดตามและวิเคราะห์ผลงานของคุณอย่างครบวงจร</p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <motion.button
                className="p-2 bg-secondary/50 hover:bg-secondary text-secondary-foreground rounded-xl transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Settings className="w-5 h-5" />
              </motion.button>

              <motion.button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 bg-secondary/50 hover:bg-secondary text-secondary-foreground rounded-xl transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {isExpanded ? <ChevronDown className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Tab Description */}
        <motion.div
          className="px-6 md:px-8 pb-6"
          variants={itemVariants}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              className="bg-secondary/30 rounded-xl p-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                {tabs[activeTab].description}
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Expanded Quick Stats */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="border-t border-border bg-secondary/20 p-6 md:p-8"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.h3
              className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2"
              variants={itemVariants}
            >
              <Activity className="w-5 h-5 text-primary" />
              สถิติด่วน
            </motion.h3>

            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
              variants={itemVariants}
            >
              {activeTab === 0 && ( // นิยาย tab
                <>
                  <QuickStat
                    icon={BookOpen}
                    label="นิยายที่เผยแพร่"
                    value={totalStats.totalNovels}
                    color="bg-gradient-to-br from-blue-500 to-blue-600"
                    delay={0.1}
                  />
                  <QuickStat
                    icon={FileText}
                    label="ตอนทั้งหมด"
                    value={totalStats.totalEpisodes}
                    color="bg-gradient-to-br from-green-500 to-green-600"
                    delay={0.2}
                  />
                  <QuickStat
                    icon={Eye}
                    label="ยอดชมรวม"
                    value={totalStats.totalViews}
                    color="bg-gradient-to-br from-purple-500 to-purple-600"
                    delay={0.3}
                  />
                  <QuickStat
                    icon={Star}
                    label="เรตติ้งเฉลี่ย"
                    value={totalStats.averageRating.toFixed(1)}
                    color="bg-gradient-to-br from-orange-500 to-red-500"
                    delay={0.4}
                  />
                </>
              )}

              {activeTab === 1 && ( // รายงาน tab
                <>
                  <QuickStat
                    icon={DollarSign}
                    label="รายได้ทั้งหมด" // Changed from "รายได้เดือนนี้" as totalStats has totalEarnings
                    value={totalStats.totalEarnings} // Using totalEarnings from totalStats
                    color="bg-gradient-to-br from-indigo-500 to-indigo-600"
                    delay={0.1}
                  />
                  <QuickStat
                    icon={TrendingUp}
                    label="รายงาน (Analytics)" // Label for earningAnalytics count
                    value={earningAnalytics.length} // Example: using length of earningAnalytics
                    color="bg-gradient-to-br from-pink-500 to-pink-600"
                    delay={0.2}
                  />
                  <QuickStat
                    icon={Users}
                    label="ผู้ติดตามทั้งหมด" // Changed from "ผู้ติดตามใหม่"
                    value={totalStats.totalFollowers} // Using totalFollowers from totalStats
                    color="bg-gradient-to-br from-teal-500 to-teal-600"
                    delay={0.3}
                  />
                  <QuickStat
                    icon={Award}
                    label="อันดับความนิยม" // This data is not in totalStats, kept as placeholder
                    value="-"
                    color="bg-gradient-to-br from-amber-500 to-amber-600"
                    delay={0.4}
                  />
                </>
              )}
            </motion.div>

            {/* Feature Cards */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
              variants={itemVariants}
            >
              {activeTab === 0 && (
                <>
                  <FeatureCard
                    icon={Plus}
                    title="สร้างนิยายใหม่"
                    description="เริ่มต้นเขียนเรื่องราวใหม่และแชร์ความคิดสร้างสรรค์"
                    action="เริ่มเขียน"
                    color="bg-gradient-to-br from-blue-500 to-cyan-500"
                    delay={0.1}
                  />
                  <FeatureCard
                    icon={Edit}
                    title="แก้ไขผลงาน"
                    description="ปรับปรุงและพัฒนานิยายที่มีอยู่ให้สมบูรณ์ยิ่งขึ้น"
                    action="จัดการนิยาย"
                    color="bg-gradient-to-br from-green-500 to-emerald-500"
                    delay={0.2}
                  />
                  <FeatureCard
                    icon={MessageCircle}
                    title="ตอบกลับผู้อ่าน"
                    description="โต้ตอบกับผู้อ่านและสร้างชุมชนรอบผลงานของคุณ"
                    action="ดูคอมเมนต์"
                    color="bg-gradient-to-br from-purple-500 to-pink-500"
                    delay={0.3}
                  />
                </>
              )}

              {activeTab === 1 && (
                <>
                  <FeatureCard
                    icon={LineChart}
                    title="วิเคราะห์ผู้อ่าน"
                    description="เข้าใจพฤติกรรมและความชอบของผู้อ่านของคุณ"
                    action="ดูรายงาน"
                    color="bg-gradient-to-br from-indigo-500 to-purple-500"
                    delay={0.1}
                  />
                  <FeatureCard
                    icon={Download}
                    title="ส่งออกข้อมูล"
                    description="ดาวน์โหลดรายงานและสถิติสำหรับการวิเคราะห์เพิ่มเติม"
                    action="ส่งออก"
                    color="bg-gradient-to-br from-emerald-500 to-teal-500"
                    delay={0.2}
                  />
                  <FeatureCard
                    icon={Zap}
                    title="เพิ่มประสิทธิภาพ"
                    description="รับคำแนะนำเพื่อเพิ่มยอดชมและผู้ติดตาม"
                    action="ดูคำแนะนำ"
                    color="bg-gradient-to-br from-orange-500 to-red-500"
                    delay={0.3}
                  />
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="p-6 md:p-8"
          >
            {/* Content Header */}
            <motion.div
              className="mb-6"
              variants={itemVariants}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    className={`p-2 bg-gradient-to-r ${tabs[activeTab].color} rounded-xl`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    {React.createElement(tabs[activeTab].icon, {
                      className: "w-5 h-5 text-white"
                    })}
                  </motion.div>
                  <div>
                    <h3 className="text-lg font-semibold text-card-foreground">
                      {tabs[activeTab].label}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {tabs[activeTab].description}
                    </p>
                  </div>
                </div>

                {/* Content Actions */}
                <div className="flex items-center gap-2">
                  <motion.button
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Search className="w-4 h-4" />
                  </motion.button>

                  <motion.button
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Filter className="w-4 h-4" />
                  </motion.button>

                  <motion.button
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Main Tab Content */}
            <motion.div
              key={`content-${activeTab}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              {children[activeTab]}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}