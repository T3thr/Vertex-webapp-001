// src/components/dashboard/DashboardHeader.tsx
// Header สำหรับ Writer Dashboard พร้อม animation และ responsive design ที่อัพเกรดแล้ว
// รองรับ global.css theme system และมี interactive elements ที่สวยงาม
'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  User, 
  PenTool, 
  TrendingUp, 
  BookOpen, 
  Coins, 
  Eye,
  Star,
  Users,
  Settings,
  Bell,
  Crown,
  Zap,
  Award,
  Calendar,
  Clock,
  MapPin,
  Globe,
  Coffee,
  Target,
  Sparkles
} from 'lucide-react';
import { SerializedUser } from '@/app/dashboard/page';
import { useState, useEffect } from 'react';

interface DashboardHeaderProps {
  user: SerializedUser;
  totalStats: {
    totalNovels: number;
    totalEpisodes: number;
    totalViews: number;
    totalEarnings: number;
    averageRating: number;
    totalFollowers: number;
  };
}

// Component สำหรับแสดงสถิติแต่ละรายการ
interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  delay: number;
  gradient: string;
}

function StatCard({ icon: Icon, label, value, change, changeType = 'neutral', delay, gradient }: StatCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const changeColor = {
    increase: 'text-green-400',
    decrease: 'text-red-400',
    neutral: 'text-muted-foreground'
  };

  return (
    <motion.div
      className={`bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 relative overflow-hidden group cursor-pointer`}
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 300, damping: 20 }}
      whileHover={{ 
        scale: 1.05, 
        backgroundColor: "rgba(255,255,255,0.15)",
        borderColor: "rgba(255,255,255,0.3)"
      }}
      whileTap={{ scale: 0.95 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      {/* Background Gradient Animation */}
      <motion.div
        className={`absolute inset-0 ${gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-300`}
        animate={isHovered ? { scale: 1.1, rotate: 1 } : { scale: 1, rotate: 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Icon และ Change Indicator */}
        <div className="flex items-center justify-between mb-3">
          <motion.div
            className="p-2 bg-white/20 rounded-lg"
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
          >
            <Icon className="w-5 h-5 text-foreground" />
          </motion.div>
          
          {change !== undefined && (
            <motion.div
              className={`flex items-center gap-1 text-xs ${changeColor[changeType]}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.2 }}
            >
              <TrendingUp className="w-3 h-3" />
              <span>{change > 0 ? '+' : ''}{change}%</span>
            </motion.div>
          )}
        </div>

        {/* Value */}
        <motion.div
          className="text-foreground text-2xl font-bold mb-1"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.1, type: "spring" }}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </motion.div>

        {/* Label */}
        <div className="text-foreground/70 text-xs font-medium">{label}</div>

        {/* Shine Effect */}
        <motion.div
          className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12"
          initial={{ x: '-100%' }}
          animate={isHovered ? { x: '100%' } : { x: '-100%' }}
          transition={{ duration: 0.6 }}
        />
      </div>
    </motion.div>
  );
}

// Component สำหรับแสดง Achievement Badge
function AchievementBadge({ achievement, delay }: { achievement: string; delay: number }) {
  return (
    <motion.div
      className="bg-gradient-to-r from-yellow-400/20 to-orange-400/20 border border-yellow-400/30 rounded-full px-3 py-1 backdrop-blur-sm"
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 400 }}
      whileHover={{ scale: 1.1 }}
    >
      <div className="flex items-center gap-2">
        <Crown className="w-3 h-3 text-yellow-400" />
        <span className="text-xs text-yellow-100 font-medium">{achievement}</span>
      </div>
    </motion.div>
  );
}

export default function DashboardHeader({ user, totalStats }: DashboardHeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { scrollY } = useScroll();
  const headerOpacity = useTransform(scrollY, [0, 100], [1, 0.95]);
  const headerScale = useTransform(scrollY, [0, 100], [1, 0.98]);

  // อัปเดตเวลาทุก ๆ นาที
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        staggerChildren: 0.1,
        ease: "easeOut"
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  const floatingVariants = {
    animate: {
      y: [0, -5, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  // ตรวจสอบว่าเป็น Writer หรือไม่
  const isWriter = user.roles.includes('Writer');

  // คำนวณ Level Progress
  const levelProgress = user.gamification 
    ? (user.gamification.experiencePoints / user.gamification.nextLevelXPThreshold) * 100
    : 0;

  // จำลองข้อมูล Achievements (ในอนาคตจะดึงจาก DB จริง)
  const recentAchievements = [
    'นักเขียนมือใหม่',
    'ผู้สร้างสรรค์',
    'นักเล่าเรื่อง'
  ].slice(0, 2);

  // สถิติพิเศษ
  const specialStats = [
    {
      icon: BookOpen,
      label: 'นิยาย',
      value: totalStats.totalNovels,
      change: 12,
      changeType: 'increase' as const,
      gradient: 'bg-gradient-to-br from-blue-400 to-blue-600'
    },
    {
      icon: TrendingUp,
      label: 'ตอน',
      value: totalStats.totalEpisodes,
      change: 8,
      changeType: 'increase' as const,
      gradient: 'bg-gradient-to-br from-green-400 to-green-600'
    },
    {
      icon: Eye,
      label: 'ยอดชม',
      value: totalStats.totalViews.toLocaleString(),
      change: 15,
      changeType: 'increase' as const,
      gradient: 'bg-gradient-to-br from-purple-400 to-purple-600'
    },
    {
      icon: Coins,
      label: 'บาท',
      value: totalStats.totalEarnings.toLocaleString(),
      change: 22,
      changeType: 'increase' as const,
      gradient: 'bg-gradient-to-br from-yellow-400 to-orange-500'
    }
  ];

  return (
    <motion.header 
      className="relative overflow-hidden bg-gradient-to-br from-secondary via-secondary-hover to-accent"
      style={{ opacity: headerOpacity, scale: headerScale }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        {/* Floating Circles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-white rounded-full"
            style={{
              width: Math.random() * 100 + 50,
              height: Math.random() * 100 + 50,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -20, 0],
              x: [0, Math.random() * 20 - 10, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 4 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Ccircle cx=\'30\' cy=\'30\' r=\'4\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
      </div>

      <div className="container-custom relative z-10">
        <div className="py-12 md:py-16">
          {/* Top Bar */}
          <motion.div
            className="flex items-center justify-between mb-8"
            variants={itemVariants}
          >
            {/* Time & Date */}
            <div className="flex items-center gap-4 text-foreground">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {currentTime.toLocaleTimeString('th-TH', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {currentTime.toLocaleDateString('th-TH', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <motion.button
                className="p-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 text-foreground hover:bg-white/20 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Bell className="w-5 h-5" />
              </motion.button>
              <motion.button
                className="p-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 text-foreground hover:bg-white/20 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Settings className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>

          {/* Main Content */}
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8">
            {/* User Profile Section */}
            <motion.div 
              className="flex items-center gap-6"
              variants={itemVariants}
            >
              {/* Avatar & Writer Badge */}
              <motion.div 
                className="relative"
                variants={floatingVariants}
                animate="animate"
              >
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center overflow-hidden shadow-2xl">
                  {user.profile?.avatarUrl ? (
                    <img 
                      src={user.profile.avatarUrl} 
                      alt={user.profile.displayName || user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 md:w-14 md:h-14 text-foreground" />
                  )}
                </div>
                
                {/* Writer Badge */}
                {isWriter && (
                  <motion.div 
                    className="absolute -bottom-2 -right-2 bg-gradient-to-r from-accent to-yellow-400 rounded-full p-3 border-3 border-white shadow-lg"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.6, type: "spring", stiffness: 400 }}
                    whileHover={{ scale: 1.2, rotate: 15 }}
                  >
                    <PenTool className="w-4 h-4 text-foreground" />
                  </motion.div>
                )}

                {/* Online Status */}
                <motion.div
                  className="absolute top-1 right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>

              {/* User Details */}
              <div className="text-foreground">
                <motion.h1 
                  className="text-3xl md:text-4xl font-bold mb-2 bg-foreground bg-clip-text text-transparent"
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                >
                  {user.profile?.penName || user.profile?.displayName || user.username}
                </motion.h1>
                
                <motion.div 
                  className="flex flex-wrap items-center gap-3 text-foreground mb-3"
                  variants={itemVariants}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-white/60 rounded-full" />
                    <span className="text-sm font-medium">
                      {isWriter ? 'นักเขียน' : 'ผู้อ่าน'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      สมาชิกตั้งแต่ {new Date(user.trackingStats.joinDate).toLocaleDateString('th-TH', { 
                        year: 'numeric', 
                        month: 'long' 
                      })}
                    </span>
                  </div>

                  {user.profile?.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{user.profile.location}</span>
                    </div>
                  )}
                </motion.div>

                {/* Writer Tier */}
                {user.writerStats?.writerTier && (
                  <motion.div
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm px-4 py-2 rounded-full border border-purple-400/30 mb-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <Crown className="w-4 h-4 text-purple-300" />
                    <span className="text-sm font-medium text-purple-100">
                      {user.writerStats.writerTier === 'beginner' && 'นักเขียนมือใหม่'}
                      {user.writerStats.writerTier === 'intermediate' && 'นักเขียนระดับกลาง'}
                      {user.writerStats.writerTier === 'advanced' && 'นักเขียนระดับสูง'}
                    </span>
                  </motion.div>
                )}

                {/* Bio */}
                {user.profile?.bio && (
                  <motion.p 
                    className="text-foreground/70 text-sm mt-3 max-w-md leading-relaxed"
                    variants={itemVariants}
                  >
                    {user.profile.bio}
                  </motion.p>
                )}

                {/* Social Links */}
                {user.profile?.websiteUrl && (
                  <motion.div
                    className="flex items-center gap-2 mt-3"
                    variants={itemVariants}
                  >
                    <Globe className="w-4 h-4 text-foreground/60" />
                    <a 
                      href={user.profile.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground hover:text-foreground text-sm underline decoration-white/40 hover:decoration-white transition-all"
                    >
                      เว็บไซต์ส่วนตัว
                    </a>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Stats Grid for Writers */}
            {isWriter && (
              <motion.div 
                className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full xl:w-auto xl:min-w-96"
                variants={itemVariants}
              >
                {specialStats.map((stat, index) => (
                  <StatCard
                    key={stat.label}
                    icon={stat.icon}
                    label={stat.label}
                    value={stat.value}
                    change={stat.change}
                    changeType={stat.changeType}
                    delay={0.3 + index * 0.1}
                    gradient={stat.gradient}
                  />
                ))}
              </motion.div>
            )}
          </div>

          {/* Level Progress & Achievements */}
          {user.gamification && (
            <motion.div 
              className="mt-8 space-y-6"
              variants={itemVariants}
            >
              {/* Level Progress */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg">
                      <Zap className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <h3 className="text-foreground font-semibold">
                        Level {user.gamification.level}
                      </h3>
                      <p className="text-foreground/70 text-sm">
                        {user.gamification.experiencePoints.toLocaleString()} / {user.gamification.nextLevelXPThreshold.toLocaleString()} XP
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-foreground font-bold text-lg">
                      {Math.round(levelProgress)}%
                    </div>
                    <div className="text-foreground/60 text-xs">ความคืบหน้า</div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${levelProgress}%` }}
                    transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Recent Achievements */}
              {recentAchievements.length > 0 && (
                <motion.div
                  className="flex flex-wrap items-center gap-3"
                  variants={itemVariants}
                >
                  <div className="flex items-center gap-2 text-foreground">
                    <Award className="w-4 h-4" />
                    <span className="text-sm font-medium">ความสำเร็จล่าสุด:</span>
                  </div>
                  {recentAchievements.map((achievement, index) => (
                    <AchievementBadge
                      key={achievement}
                      achievement={achievement}
                      delay={0.5 + index * 0.1}
                    />
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Welcome Message for New Users */}
          {!isWriter && (
            <motion.div
              className="mt-8 bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
              variants={itemVariants}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-xl">
                  <Sparkles className="w-6 h-6 text-foreground" />
                </div>
                <div>
                  <h3 className="text-foreground font-semibold text-lg mb-1">
                    ยินดีต้อนรับสู่ NovelMaze!
                  </h3>
                  <p className="text-foreground/70 text-sm">
                    เริ่มต้นการเดินทางในฐานะนักเขียนและสร้างสรรค์เรื่องราวที่น่าตื่นเต้น
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.header>
  );
}