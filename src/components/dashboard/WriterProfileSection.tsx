// src/components/dashboard/WriterProfileSection.tsx
// Section โปรไฟล์นักเขียนพร้อมข้อมูลสถานะการสมัครและการตั้งค่า - อัพเกรดแล้ว
// รองรับ global.css theme system และมี interactive elements ที่สวยงาม
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  Edit, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertCircle,
  Heart,
  DollarSign,
  PiggyBank,
  PenTool,
  Calendar,
  MapPin,
  Globe,
  Mail,
  User,
  Copy,
  ExternalLink,
  Shield,
  Verified,
  Star,
  TrendingUp,
  Award,
  Zap,
  BookOpen,
  Eye,
  Users,
  Target,
  Coffee,
  Sparkles,
  Crown,
  Gift
} from 'lucide-react';
import { SerializedUser , SerializedWriterApplication , SerializedDonationApplication } from '@/app/dashboard/page';
import { IWriterApplication } from '@/backend/models/WriterApplication';
import { IDonationApplication } from '@/backend/models/DonationApplication';
import React, { useState } from 'react';

interface WriterProfileSectionProps {
  user: SerializedUser;
  isWriter: boolean;
  canApplyForWriter: boolean;
  writerApplication: SerializedWriterApplication | null;
  donationApplication: SerializedDonationApplication | null;
}

// Component สำหรับแสดงข้อมูลรายการ
interface InfoItemProps {
  icon: React.ElementType;
  label: string;
  value: string | React.ReactNode;
  verified?: boolean;
  copyable?: boolean;
  linkable?: boolean;
  delay?: number;
}

function InfoItem({ icon: Icon, label, value, verified = false, copyable = false, linkable = false, delay = 0 }: InfoItemProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (typeof value === 'string') {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  return (
    <motion.div
      className="flex items-center justify-between p-4 bg-secondary/30 hover:bg-secondary/50 rounded-xl border border-border/50 hover:border-border transition-all duration-300 group"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.02, y: -2 }}
    >
      <div className="flex items-center gap-3 flex-1">
        <motion.div 
          className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors"
          whileHover={{ rotate: 5 }}
        >
          <Icon className="w-5 h-5 text-primary" />
        </motion.div>
        <div className="flex-1">
          <label className="text-sm font-medium text-muted-foreground block mb-1">{label}</label>
          <div className="flex items-center gap-2">
            {linkable && typeof value === 'string' ? (
              <a 
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-card-foreground hover:text-primary transition-colors flex items-center gap-1 group/link"
              >
                <span className="group-hover/link:underline">{value}</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            ) : (
              <span className="text-card-foreground">{value || 'ยังไม่ได้ตั้งค่า'}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {verified && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: delay + 0.2 }}
          >
            <CheckCircle className="w-5 h-5 text-green-500" />
          </motion.div>
        )}
        
        {copyable && (
          <motion.button
            onClick={handleCopy}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-md transition-all"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Copy className="w-4 h-4" />
            <AnimatePresence>
              {copied && (
                <motion.span
                  className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-foreground text-background text-xs px-2 py-1 rounded whitespace-nowrap"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  คัดลอกแล้ว!
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// Component สำหรับแสดงสถิติ Writer
interface WriterStatCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sublabel?: string;
  color: string;
  delay: number;
}

function WriterStatCard({ icon: Icon, label, value, sublabel, color, delay }: WriterStatCardProps) {
  return (
    <motion.div
      className={`${color} rounded-xl p-6 text-center relative overflow-hidden group`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 300 }}
      whileHover={{ scale: 1.05, y: -5 }}
    >
      {/* Background Pattern */}
      <motion.div
        className="absolute inset-0 opacity-20"
        animate={{
          background: [
            'radial-gradient(circle at 20% 50%, white 2px, transparent 2px)',
            'radial-gradient(circle at 80% 50%, white 2px, transparent 2px)',
            'radial-gradient(circle at 20% 50%, white 2px, transparent 2px)'
          ]
        }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      <div className="relative z-10">
        <motion.div
          className="mb-3"
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.6 }}
        >
          <Icon className="w-8 h-8 mx-auto text-white" />
        </motion.div>
        
        <motion.div
          className="text-3xl font-bold text-white mb-1"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.2, type: "spring" }}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </motion.div>
        
        <div className="text-white/90 font-medium text-sm">{label}</div>
        
        {sublabel && (
          <div className="text-white/70 text-xs mt-1">{sublabel}</div>
        )}
      </div>
    </motion.div>
  );
}

export default function WriterProfileSection({ 
  user, 
  isWriter, 
  canApplyForWriter, 
  writerApplication,
  donationApplication 
}: WriterProfileSectionProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'writer' | 'donation'>('profile');

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
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  const tabVariants = {
    inactive: {
      backgroundColor: 'transparent',
      color: 'var(--muted-foreground)',
      scale: 1
    },
    active: {
      backgroundColor: 'var(--primary)',
      color: 'var(--primary-foreground)',
      scale: 1.02,
      transition: {
        duration: 0.2,
        ease: 'easeInOut'
      }
    }
  };

  // ฟังก์ชันสำหรับแสดงสถานะใบสมัคร
  const getApplicationStatusDisplay = (status: string) => {
    const statusConfig = {
      pending_review: { 
        icon: Clock, 
        text: 'รอการตรวจสอบ', 
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        pulse: true
      },
      under_review: { 
        icon: AlertCircle, 
        text: 'กำลังตรวจสอบ', 
        color: 'text-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
        pulse: true
      },
      approved: { 
        icon: CheckCircle, 
        text: 'ได้รับการอนุมัติ', 
        color: 'text-green-500',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
        pulse: false
      },
      rejected: { 
        icon: XCircle, 
        text: 'ถูกปฏิเสธ', 
        color: 'text-red-500',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        pulse: false
      },
      requires_more_info: { 
        icon: AlertCircle, 
        text: 'ต้องการข้อมูลเพิ่มเติม', 
        color: 'text-orange-500',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        borderColor: 'border-orange-200 dark:border-orange-800',
        pulse: true
      }
    };

    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending_review;
  };

  // ข้อมูลสำหรับแท็บต่างๆ
  const tabs = [
    { id: 'profile', label: 'ข้อมูลส่วนตัว', icon: User },
    { id: 'writer', label: 'สถานะนักเขียน', icon: PenTool },
    { id: 'donation', label: 'การรับบริจาค', icon: Heart }
  ];

  return (
    <motion.section
      className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div 
        className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-b border-border p-6 md:p-8"
        variants={itemVariants}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-card-foreground mb-2 flex items-center gap-3">
              <motion.div
                className="p-2 bg-primary/10 rounded-lg"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <Shield className="w-6 h-6 text-primary" />
              </motion.div>
              ข้อมูลโปรไฟล์
            </h2>
            <p className="text-muted-foreground">จัดการข้อมูลส่วนตัวและสถานะการเป็นนักเขียน</p>
          </div>
          
          <motion.button 
            className="flex items-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-xl hover:bg-accent hover:text-accent-foreground transition-all duration-300 shadow-lg hover:shadow-xl"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <Settings className="w-5 h-5" />
            <span>ตั้งค่า</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div 
        className="border-b border-border bg-secondary/20"
        variants={itemVariants}
      >
        <div className="px-6 md:px-8">
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <motion.button
                  key={tab.id}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-all duration-300 border-b-2 ${
                    isActive 
                      ? 'text-primary border-primary bg-primary/5' 
                      : 'text-muted-foreground border-transparent hover:text-card-foreground hover:bg-secondary/50'
                  }`}
                  onClick={() => setActiveTab(tab.id as any)}
                  variants={tabVariants}
                  animate={isActive ? 'active' : 'inactive'}
                  whileHover={!isActive ? { y: -2 } : {}}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon className="w-5 h-5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  
                  {/* Active Indicator */}
                  {isActive && (
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                      layoutId="activeTabIndicator"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Tab Content */}
      <div className="p-6 md:p-8">
        <AnimatePresence mode="wait">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <motion.h3 
                className="text-lg font-semibold text-card-foreground mb-6 flex items-center gap-2"
                variants={itemVariants}
              >
                <User className="w-5 h-5 text-primary" />
                ข้อมูลพื้นฐาน
              </motion.h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <InfoItem
                  icon={Edit}
                  label="ชื่อที่แสดง"
                  value={user.profile?.displayName}
                  delay={0.1}
                />
                
                <InfoItem
                  icon={PenTool}
                  label="นามปากกา"
                  value={user.profile?.penName}
                  delay={0.2}
                />
                
                <InfoItem
                  icon={Mail}
                  label="อีเมล"
                  value={user.email}
                  verified={user.isEmailVerified}
                  copyable={true}
                  delay={0.3}
                />
                
                <InfoItem
                  icon={User}
                  label="ชื่อผู้ใช้"
                  value={user.username}
                  copyable={true}
                  delay={0.4}
                />
                
                {user.profile?.location && (
                  <InfoItem
                    icon={MapPin}
                    label="ที่อยู่"
                    value={user.profile.location}
                    delay={0.5}
                  />
                )}
                
                {user.profile?.websiteUrl && (
                  <InfoItem
                    icon={Globe}
                    label="เว็บไซต์"
                    value={user.profile.websiteUrl}
                    linkable={true}
                    delay={0.6}
                  />
                )}
                
                <InfoItem
                  icon={Calendar}
                  label="สมาชิกตั้งแต่"
                  value={new Date(user.trackingStats.joinDate).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                  delay={0.7}
                />
              </div>

              {/* Bio Section */}
              {user.profile?.bio && (
                <motion.div
                  className="bg-secondary/30 rounded-xl p-6 border border-border/50"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <h4 className="text-base font-medium text-card-foreground mb-3 flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-primary" />
                    เกี่ยวกับตัวฉัน
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">{user.profile.bio}</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Writer Status Tab */}
          {activeTab === 'writer' && (
            <motion.div
              key="writer"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <motion.h3 
                className="text-lg font-semibold text-card-foreground mb-6 flex items-center gap-2"
                variants={itemVariants}
              >
                <PenTool className="w-5 h-5 text-primary" />
                สถานะนักเขียน
              </motion.h3>

              {isWriter ? (
                <div className="space-y-6">
                  {/* Writer Status Card */}
                  <motion.div 
                    className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-8"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <motion.div
                        className="p-4 bg-green-100 dark:bg-green-800/30 rounded-xl"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                      >
                        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                      </motion.div>
                      <div>
                        <h4 className="font-bold text-xl text-green-700 dark:text-green-400 mb-1">
                          นักเขียนที่ได้รับการยืนยัน
                        </h4>
                        <p className="text-green-600 dark:text-green-500">
                          คุณสามารถเผยแพร่นิยายและได้รับรายได้
                        </p>
                      </div>
                    </div>

                    {/* Writer Stats Grid */}
                    {user.writerStats && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <WriterStatCard
                          icon={BookOpen}
                          label="นิยายที่เผยแพร่"
                          value={user.writerStats.totalNovelsPublished}
                          color="bg-gradient-to-br from-blue-500 to-blue-600"
                          delay={0.2}
                        />
                        <WriterStatCard
                          icon={Edit}
                          label="ตอนที่เผยแพร่"
                          value={user.writerStats.totalEpisodesPublished}
                          color="bg-gradient-to-br from-purple-500 to-purple-600"
                          delay={0.3}
                        />
                        <WriterStatCard
                          icon={Eye}
                          label="ยอดชมรวม"
                          value={user.writerStats.totalViewsReceived?.toLocaleString() || '0'}
                          color="bg-gradient-to-br from-indigo-500 to-indigo-600"
                          delay={0.4}
                        />
                        <WriterStatCard
                          icon={PiggyBank}
                          label="รายได้รวม"
                          value={`${(user.writerStats.totalEarningsToDate || 0).toLocaleString()} บาท`}
                          color="bg-gradient-to-br from-yellow-500 to-orange-500"
                          delay={0.5}
                        />
                      </div>
                    )}

                    {/* Writer Since */}
                    {user.writerStats?.writerSince && (
                      <motion.div 
                        className="pt-6 border-t border-green-200 dark:border-green-800"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                      >
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
                          <Award className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            เป็นนักเขียนตั้งแต่: {new Date(user.writerStats.writerSince).toLocaleDateString('th-TH')}
                          </span>
                        </div>
                      </motion.div>
                    )}

                    {/* Writer Tier Badge */}
                    {user.writerStats?.writerTier && (
                      <motion.div
                        className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm px-4 py-2 rounded-full border border-purple-400/30"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.7, type: "spring" }}
                      >
                        <Crown className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium text-purple-300">
                          {user.writerStats.writerTier === 'beginner' && 'นักเขียนมือใหม่'}
                          {user.writerStats.writerTier === 'intermediate' && 'นักเขียนระดับกลาง'}
                          {user.writerStats.writerTier === 'advanced' && 'นักเขียนระดับสูง'}
                        </span>
                      </motion.div>
                    )}
                  </motion.div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Application Status */}
                  {writerApplication && (
                    <motion.div 
                      className={`border rounded-xl p-6 ${getApplicationStatusDisplay(writerApplication.status).bgColor} ${getApplicationStatusDisplay(writerApplication.status).borderColor}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <motion.div
                          className={`p-3 rounded-xl ${getApplicationStatusDisplay(writerApplication.status).pulse ? 'animate-pulse' : ''}`}
                          whileHover={{ scale: 1.1 }}
                        >
                          {React.createElement(getApplicationStatusDisplay(writerApplication.status).icon, {
                            className: `w-6 h-6 ${getApplicationStatusDisplay(writerApplication.status).color}`
                          })}
                        </motion.div>
                        <div>
                          <h4 className={`font-semibold text-lg ${getApplicationStatusDisplay(writerApplication.status).color}`}>
                            ใบสมัครนักเขียน
                          </h4>
                          <p className="text-muted-foreground">
                            {getApplicationStatusDisplay(writerApplication.status).text}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>ส่งใบสมัครเมื่อ: {new Date(writerApplication.submittedAt).toLocaleDateString('th-TH')}</span>
                        </div>
                        {writerApplication.reviewedAt && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>ตรวจสอบเมื่อ: {new Date(writerApplication.reviewedAt).toLocaleDateString('th-TH')}</span>
                          </div>
                        )}
                      </div>

                      {writerApplication.rejectionReason && (
                        <motion.div
                          className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                        >
                          <p className="text-sm text-red-700 dark:text-red-400">
                            <strong>เหตุผลที่ถูกปฏิเสธ:</strong> {writerApplication.rejectionReason}
                          </p>
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  {/* Apply Button */}
                  {canApplyForWriter && (
                    <motion.div
                      className="text-center"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <motion.button 
                        className="bg-gradient-to-r from-primary to-primary-hover text-primary-foreground py-4 px-8 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-3 mx-auto"
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <PenTool className="w-6 h-6" />
                        สมัครเป็นนักเขียน
                        <Sparkles className="w-5 h-5" />
                      </motion.button>
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Donation Tab */}
          {activeTab === 'donation' && (
            <motion.div
              key="donation"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <motion.h3 
                className="text-lg font-semibold text-card-foreground mb-6 flex items-center gap-2"
                variants={itemVariants}
              >
                <Heart className="w-5 h-5 text-primary" />
                การตั้งค่าการรับบริจาค
              </motion.h3>

              {isWriter ? (
                donationApplication ? (
                  <motion.div 
                    className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-8"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <motion.div
                        className="p-4 bg-green-100 dark:bg-green-800/30 rounded-xl"
                        whileHover={{ scale: 1.1 }}
                      >
                        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                      </motion.div>
                      <div>
                        <h4 className="font-bold text-xl text-green-700 dark:text-green-400 mb-1">
                          การรับบริจาคได้รับการอนุมัติ
                        </h4>
                        <p className="text-green-600 dark:text-green-500">
                          ผู้อ่านสามารถสนับสนุนผลงานของคุณได้แล้ว
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4">
                      <motion.button 
                        className="bg-primary text-primary-foreground px-6 py-3 rounded-xl hover:bg-primary-hover transition-colors flex items-center gap-2 shadow-lg"
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <PiggyBank className="w-5 h-5" />
                        ดูรายได้จากบริจาค
                      </motion.button>
                      
                      <motion.button 
                        className="bg-secondary text-secondary-foreground px-6 py-3 rounded-xl hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2"
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Settings className="w-5 h-5" />
                        จัดการการตั้งค่า
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    className="bg-secondary/30 border border-border rounded-xl p-8 text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <motion.div
                      className="mb-6"
                      variants={floatingVariants}
                      animate="animate"
                    >
                      <Heart className="w-16 h-16 text-muted-foreground mx-auto" />
                    </motion.div>
                    <h4 className="font-semibold text-card-foreground mb-3 text-xl">ยังไม่ได้เปิดรับบริจาค</h4>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      เปิดรับการสนับสนุนจากผู้อ่านเพื่อสร้างแรงจูงใจในการเขียนต่อไป
                    </p>
                    
                    <motion.button 
                      className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-8 py-3 rounded-xl hover:from-pink-600 hover:to-rose-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Gift className="w-5 h-5" />
                      สมัครรับบริจาค
                    </motion.button>
                  </motion.div>
                )
              ) : (
                <motion.div 
                  className="bg-muted/30 border border-border rounded-xl p-8 text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h4 className="font-semibold text-card-foreground mb-2">เฉพาะนักเขียน</h4>
                  <p className="text-muted-foreground">
                    การรับบริจาคใช้ได้เฉพาะสมาชิกที่ได้รับสถานะนักเขียนแล้วเท่านั้น
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

const floatingVariants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};