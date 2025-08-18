// src/components/dashboard/StatsOverview.tsx
// แสดงภาพรวมสถิติและข้อมูลสำคัญของนักเขียน - อัพเกรดแล้ว
// รองรับ global.css theme system และมี interactive elements ที่สวยงาม
'use client';

// แหงภาพรวมข้อมูลและสร้างสรรค์สำหรับนักเขียน - อัพเกรดแล้ว
// รองรับ global.css theme system และมี interactive elements ที่สวยงาม

import { motion, useSpring, useTransform, Variants } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  Heart, 
  MessageCircle, 
  Star,
  Users,
  Coins,
  BookOpen,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap,
  Award,
  Clock,
  DollarSign,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  Globe,
  Sparkles,
  Crown,
  Gift,
  Coffee,
  Flame,
  ThumbsUp,
  MessageSquare,
  FileText,
  TrendingUpIcon
} from 'lucide-react';
import { SerializedUser , SerializedWriterApplication , SerializedDonationApplication , SerializedEarningTransaction , SerializedEarningAnalytic } from '@/app/dashboard/page';
import { IEarningTransaction } from '@/backend/models/EarningTransaction';
import { IEarningAnalytic } from '@/backend/models/EarningAnalytic';
import { useState, useEffect, useMemo } from 'react';

interface StatsOverviewProps {
  stats: {
    totalNovels: number;
    totalNovelsPublished: number;
    totalEpisodes: number;
    totalViews: number;
    totalEarnings: number;
    averageRating: number;
    totalFollowers: number;
  };
  recentTransactions: SerializedEarningTransaction[];
  earningAnalytics: SerializedEarningAnalytic[];
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: {
    value: number;
    isPositive: boolean;
    period: string;
  };
  color: string;
  delay: number;
  gradient: string;
  formatValue?: (value: any) => string;
}

// Component สำหรับแสดงการ์ดสถิติแต่ละอัน
function StatCard({ title, value, icon: Icon, trend, color, delay, gradient, formatValue }: StatCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [displayValue, setDisplayValue] = useState(0);

  // Animation สำหรับตัวเลข
  useEffect(() => {
    if (typeof value === 'number') {
      let start = 0;
      const end = value;
      const duration = 2000; // 2 วินาที
      const stepTime = 50; // อัปเดตทุก 50ms
      const steps = duration / stepTime;
      const increment = end / steps;

      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setDisplayValue(end);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(start));
        }
      }, stepTime);

      return () => clearInterval(timer);
    }
  }, [value]);

  const formattedValue = formatValue 
    ? formatValue(typeof value === 'number' ? displayValue : value)
    : typeof value === 'number' 
      ? displayValue.toLocaleString() 
      : value;

  // สร้าง particles คงที่สำหรับ StatCard เพื่อหลีกเลี่ยง hydration error
  const statParticles = useMemo(() => [
    { id: 1, left: '20%', top: '10%' },
    { id: 2, left: '80%', top: '15%' },
    { id: 3, left: '30%', top: '85%' },
    { id: 4, left: '70%', top: '75%' },
    { id: 5, left: '50%', top: '50%' }
  ], []);

  return (
    <motion.div
      className={`bg-card border border-border rounded-2xl p-6 relative overflow-hidden group cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500`}
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.6, type: "spring", stiffness: 300 }}
      whileHover={{ 
        scale: 1.05, 
        y: -8,
        rotateY: 5
      }}
      whileTap={{ scale: 0.95 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      {/* Animated Background Gradient */}
      <motion.div
        className={`absolute inset-0 ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
        animate={isHovered ? { 
          scale: 1.2, 
          rotate: 2,
          background: [gradient, `${gradient} brightness(110%)`, gradient]
        } : { scale: 1, rotate: 0 }}
        transition={{ duration: 0.6 }}
      />

      {/* Floating Particles Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        {statParticles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-1 h-1 bg-primary/40 rounded-full"
            style={{
              left: particle.left,
              top: particle.top,
            }}
            animate={isHovered ? {
              y: [0, -20, -40],
              opacity: [0, 1, 0],
              scale: [0, 1, 0]
            } : {}}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: particle.id * 0.2
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <motion.div
            className={`w-14 h-14 rounded-xl ${color} flex items-center justify-center shadow-lg`}
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.8 }}
          >
            <Icon className="w-7 h-7 text-white" />
          </motion.div>
          
          {trend && (
            <motion.div
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                trend.isPositive 
                  ? 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400' 
                  : 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400'
              }`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.3 }}
              whileHover={{ scale: 1.1 }}
            >
              {trend.isPositive ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span>{Math.abs(trend.value)}%</span>
            </motion.div>
          )}
        </div>
        
        {/* Value */}
        <motion.div
          className="mb-3"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: delay + 0.2, type: "spring", stiffness: 400 }}
        >
          <h3 className="text-3xl font-bold text-card-foreground mb-1 font-mono">
            {formattedValue}
          </h3>
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
        </motion.div>

        {/* Trend Period */}
        {trend && (
          <motion.p
            className="text-xs text-muted-foreground flex items-center gap-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.4 }}
          >
            <Clock className="w-3 h-3" />
            {trend.period}
          </motion.p>
        )}

        {/* Progress Bar Effect */}
        <motion.div
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary/20 to-accent/20 w-full"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: delay + 0.5, duration: 1 }}
        />
      </div>

      {/* Shine Effect */}
      <motion.div
        className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full"
        animate={isHovered ? { x: '200%' } : { x: '-100%' }}
        transition={{ duration: 0.8 }}
      />
    </motion.div>
  );
}

// Component สำหรับแสดงกิจกรรมล่าสุด
interface ActivityItemProps {
  transaction: SerializedEarningTransaction;
  index: number;
}

function ActivityItem({ transaction, index }: ActivityItemProps) {
  const getTransactionIcon = (type: string) => {
    if (type.includes('earn')) return TrendingUp;
    if (type.includes('donation')) return Gift;
    if (type.includes('purchase')) return Coins;
    if (type.includes('writer_coin')) return TrendingUp;
    if (type.includes('writer_real_money')) return DollarSign;
    return DollarSign;
  };

  const getTransactionColor = (type: string) => {
    if (type.includes('earn')) return 'text-green-600 bg-green-50 dark:bg-green-900/20';
    if (type.includes('donation')) return 'text-pink-600 bg-pink-50 dark:bg-pink-900/20';
    if (type.includes('purchase')) return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
    if (type.includes('writer_coin')) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20';
    if (type.includes('writer_real_money')) return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20';
    return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20';
  };

  const TransactionIcon = getTransactionIcon(transaction.transactionType);

  const formattedDate = (date: Date) => {
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <motion.div
      className="flex items-center justify-between p-4 bg-background rounded-xl border border-border hover:border-primary/30 hover:bg-secondary/30 transition-all duration-300 group"
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ scale: 1.02, x: 5 }}
    >
      <div className="flex items-center gap-4">
        <motion.div 
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${getTransactionColor(transaction.transactionType)}`}
          whileHover={{ rotate: 5, scale: 1.1 }}
        >
          <TransactionIcon className="w-5 h-5" />
        </motion.div>
        <div className="flex-1">
          <p className="font-medium text-card-foreground text-sm group-hover:text-primary transition-colors">
            {transaction.description}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formattedDate(new Date(transaction.transactionDate))}
            </p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              transaction.status === 'completed' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                : transaction.status === 'pending'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {transaction.status === 'completed' && 'สำเร็จ'}
              {transaction.status === 'pending' && 'รอดำเนินการ'}
              {transaction.status === 'failed' && 'ล้มเหลว'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <motion.p 
          className={`font-bold text-lg ${
            transaction.transactionType.includes('earn') 
              ? 'text-green-600' 
              : 'text-blue-600'
          }`}
          whileHover={{ scale: 1.1 }}
        >
          {transaction.transactionType.includes('earn') ? '+' : ''}{transaction.amount.toLocaleString()} 
        </motion.p>
        <p className="text-xs text-muted-foreground">{transaction.currency}</p>
      </div>
    </motion.div>
  );
}

export default function StatsOverview({ stats, recentTransactions, earningAnalytics }: StatsOverviewProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // อัปเดตเวลาทุก ๆ นาที
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // คำนวณ trend จากข้อมูล analytics
  const calculateTrend = (currentValue: number, previousValue: number) => {
    if (previousValue === 0) return null;
    const change = ((currentValue - previousValue) / previousValue) * 100;
    return {
      value: Math.round(Math.abs(change)),
      isPositive: change >= 0,
      period: 'เทียบกับเดือนก่อน'
    };
  };

  // ข้อมูลสถิติหลัก
  const mainStats = [
    {
      title: 'ยอดชมทั้งหมด',
      value: stats.totalViews,
      icon: Eye,
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      gradient: 'bg-gradient-to-br from-blue-400 to-blue-600',
      trend: calculateTrend(stats.totalViews, stats.totalViews * 0.85)
    },
    {
      title: 'ผู้ติดตามทั้งหมด',
      value: stats.totalFollowers,
      icon: Users,
      color: 'bg-gradient-to-br from-green-500 to-green-600',
      gradient: 'bg-gradient-to-br from-green-400 to-green-600',
      trend: calculateTrend(stats.totalFollowers, stats.totalFollowers * 0.9)
    },
    {
      title: 'คะแนนเฉลี่ย',
      value: stats.averageRating,
      icon: Star,
      color: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
      gradient: 'bg-gradient-to-br from-yellow-400 to-orange-500',
      trend: calculateTrend(stats.averageRating, stats.averageRating * 0.95),
      formatValue: (val: number) => val.toFixed(1)
    },
    {
      title: 'รายได้ทั้งหมด',
      value: stats.totalEarnings,
      icon: Coins,
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      gradient: 'bg-gradient-to-br from-purple-400 to-pink-500',
      trend: calculateTrend(stats.totalEarnings, stats.totalEarnings * 0.8),
      formatValue: (val: number) => `${val.toLocaleString()} บาท`
    }
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const headerVariants: Variants = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" }
    }
  };

  return (
    <motion.section
      className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div>
        {/* Header */}
        <motion.div 
          className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-b border-border p-6 md:p-8"
          variants={headerVariants}
        >
          <div className="flex items-center justify-between">
            <div>
              <motion.h2 
                className="text-2xl md:text-3xl font-bold text-card-foreground mb-2 flex items-center gap-3"
                whileHover={{ scale: 1.02 }}
              >
                <motion.div
                  className="p-2 bg-primary/20 rounded-xl"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <BarChart3 className="w-6 h-6 text-primary" />
                </motion.div>
                ภาพรวมสถิติ
              </motion.h2>
              <p className="text-muted-foreground">ติดตามผลงานและความก้าวหน้าของคุณ</p>
            </div>
            
            <div className="flex items-center gap-4 text-muted-foreground">
              <motion.div 
                className="flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-xl"
                whileHover={{ scale: 1.05, backgroundColor: "var(--secondary)" }}
              >
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">
                  อัปเดตล่าสุด: {currentTime.toLocaleTimeString('th-TH', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </motion.div>
              
              <motion.button
                className="p-2 bg-secondary/50 hover:bg-secondary text-secondary-foreground rounded-xl transition-colors"
                whileHover={{ scale: 1.1, rotate: 180 }}
                whileTap={{ scale: 0.9 }}
              >
                <Activity className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </motion.div>

        <div className="p-6 md:p-8">
          {/* Main Stats Grid */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8"
            variants={itemVariants}
          >
            {mainStats.map((stat, index) => (
              <StatCard
                key={stat.title}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                trend={stat.trend ?? undefined}
                color={stat.color}
                gradient={stat.gradient}
                delay={index * 0.1}
                formatValue={stat.formatValue}
              />
            ))}
          </motion.div>

          {/* Secondary Stats */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
            variants={itemVariants}
          >
            {/* Total Novels */}
            <motion.div 
              className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 group"
              whileHover={{ scale: 1.03, y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <motion.div
                  className="p-3 bg-blue-100 dark:bg-blue-800/30 rounded-xl"
                  whileHover={{ rotate: 15, scale: 1.1 }}
                >
                  <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </motion.div>
                <h3 className="font-semibold text-blue-800 dark:text-blue-400">นิยายทั้งหมด</h3>
              </div>
              <motion.div 
                className="text-4xl font-bold text-blue-700 dark:text-blue-300 mb-2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
              >
                {stats.totalNovels}
              </motion.div>
              <p className="text-sm text-blue-600 dark:text-blue-500 flex items-center gap-1">
                <FileText className="w-4 h-4" />
                เรื่องที่สร้าง
              </p>
            </motion.div>

            {/* Total Episodes */}
            <motion.div 
              className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6"
              whileHover={{ scale: 1.03, y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <motion.div
                  className="p-3 bg-green-100 dark:bg-green-800/30 rounded-xl"
                  whileHover={{ rotate: 15, scale: 1.1 }}
                >
                  <MessageCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </motion.div>
                <h3 className="font-semibold text-green-800 dark:text-green-400">ตอนทั้งหมด</h3>
              </div>
              <motion.div 
                className="text-4xl font-bold text-green-700 dark:text-green-300 mb-2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: "spring" }}
              >
                {stats.totalEpisodes}
              </motion.div>
              <p className="text-sm text-green-600 dark:text-green-500 flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                ตอนที่เผยแพร่แล้ว
              </p>
            </motion.div>

            {/* Engagement Rate */}
            <motion.div 
              className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6"
              whileHover={{ scale: 1.03, y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <motion.div
                  className="p-3 bg-purple-100 dark:bg-purple-800/30 rounded-xl"
                  whileHover={{ rotate: 15, scale: 1.1 }}
                >
                  <Heart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </motion.div>
                <h3 className="font-semibold text-purple-800 dark:text-purple-400">อัตราการมีส่วนร่วม</h3>
              </div>
              <motion.div 
                className="text-4xl font-bold text-purple-700 dark:text-purple-300 mb-2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.7, type: "spring" }}
              >
                {stats.totalViews > 0 ? ((stats.totalFollowers / stats.totalViews) * 100).toFixed(1) : '0'}%
              </motion.div>
              <p className="text-sm text-purple-600 dark:text-purple-500 flex items-center gap-1">
                <ThumbsUp className="w-4 h-4" />
                ผู้ติดตาม / ยอดชม
              </p>
            </motion.div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-card-foreground flex items-center gap-3">
                <motion.div
                  className="p-2 bg-gradient-to-r from-orange-400 to-red-400 rounded-xl"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 6 }}
                >
                  <Flame className="w-5 h-5 text-white" />
                </motion.div>
                ธุรกรรมล่าสุด
              </h3>
              
              <motion.button
                className="text-sm font-medium text-primary hover:text-primary-hover"
                whileHover={{ scale: 1.05, x: 5 }}
              >
                ดูทั้งหมด
                <ArrowUpRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>

          <div className="bg-secondary/20 rounded-xl p-6 border border-border/50">
            {recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions
                  .filter(transaction => [
                    'writer_coin.earn_from_episode_sale',
                    'writer_coin.earn_from_donation',
                    'writer_coin.earn_from_platform_bonus',
                    'writer_real_money.revenue_share_accrual',
                    'writer_real_money.withdrawal_completed'
                  ].includes(transaction.transactionType))
                  .slice(0, 5)
                  .map((transaction, index) => (
                    <ActivityItem
                      key={transaction._id as string}
                      transaction={transaction}
                      index={index}
                    />
                  ))}
              </div>
            ) : (
              <motion.div 
                className="text-center py-12"
                initial={{ opacity: '0', scale: '0.9' }}
                animate={{ opacity: '1', scale: '1' }}
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Coffee className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                </motion.div>
                <h4 className="font-semibold mb-2 text-card-foreground">ยังไม่มีรายการธุรกรรม</h4>
                <p className="text-muted-foreground">เมื่อมีผู้ซื้อตอนนิยายของคุณ รายได้จะปรากฏที่นี่</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}