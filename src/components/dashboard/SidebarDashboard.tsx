// src/components/dashboard/SidebarDashboard.tsx
// Sidebar Navigation สำหรับ Writer Dashboard - รองรับ realtime, mobile และ floating design
'use client';

import { useState, useEffect, ReactNode, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { 
  Menu, 
  X,
  Home,
  BookOpen,
  BarChart3,
  User,
  Settings,
  HelpCircle,
  PenTool,
  TrendingUp,
  Wallet,
  Trophy,
  Bell,
  Crown,
  Zap,
  Target,
  Coffee,
  Award,
  MessageCircle,
  Users,
  Eye,
  Heart,
  Star,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  DollarSign,
  UserCheck,
  Library,
  LayoutDashboard,
  Lock
} from 'lucide-react';
import { SerializedUser, WriterDashboardData } from '@/app/dashboard/page';

// Import Tab Components
import OverviewTab from '@/components/dashboard/OverviewTab';
import NovelTab from '@/components/dashboard/NovelTab';
import AnalyticsTab from '@/components/dashboard/AnalyticsTab';
import WriterProfileSection from '@/components/dashboard/WriterProfileSection';
import SettingsTab from '@/components/dashboard/SettingsTab';

// Context สำหรับจัดการ Active Tab
interface DashboardContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
};

interface SidebarDashboardProps {
  user: SerializedUser;
  novels: any[];
  writerApplication: any;
  donationApplication: any;
  recentTransactions: any[];
  earningAnalytics: any[];
  isWriter: boolean;
  canApplyForWriter: boolean;
  totalStats: any;
  initialCreateModal?: boolean;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
  color?: string;
  requiresWriter?: boolean;
  isNew?: boolean;
  subItems?: MenuItem[];
}

interface RealStats {
  totalNovels: number;
  totalViews: number;
  totalEarnings: number;
  totalFollowers: number;
  followersBreakdown?: {
    userFollowers: number;
    novelFollowers: number;
    total: number;
  };
  lastUpdated?: string;
}

// Enum สำหรับ Toggle ผู้ติดตาม
enum FollowerDisplayMode {
  TOTAL = 'total',
  USER_FOLLOWERS = 'user',
  NOVEL_FOLLOWERS = 'novel'
}

export default function SidebarDashboard({ 
  user, 
  novels, 
  writerApplication, 
  donationApplication, 
  recentTransactions, 
  earningAnalytics, 
  isWriter, 
  canApplyForWriter, 
  totalStats,
  initialCreateModal = false 
}: SidebarDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [followerDisplayMode, setFollowerDisplayMode] = useState<FollowerDisplayMode>(FollowerDisplayMode.TOTAL);
  const [realUserStats, setRealUserStats] = useState<RealStats>({
    totalNovels: totalStats.totalNovels || 0,
    totalViews: totalStats.totalViews || 0,
    totalEarnings: totalStats.totalEarnings || 0,
    totalFollowers: totalStats.totalFollowers || 0
  });

  // Handle initial create modal - switch to novels tab and trigger modal
  useEffect(() => {
    if (initialCreateModal) {
      setActiveTab('novels');
      // The NovelTab component will need to handle the initial modal state
    }
  }, [initialCreateModal]);

  // ตรวจสอบขนาดหน้าจอและปรับ sidebar state
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      
      if (mobile) {
        // Mobile: sidebar ปิดโดยค่าเริ่มต้น
        setIsSidebarOpen(false);
        setIsCollapsed(false);
      } else {
        // Desktop: sidebar เปิดโดยค่าเริ่มต้น
        setIsSidebarOpen(true);
        setIsCollapsed(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // ดึงข้อมูลจริงจาก API แบบ realtime รวมถึง followers
  useEffect(() => {
    const fetchRealStats = async () => {
      try {
        const response = await fetch('/api/writer/analytics');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const newStats = {
              totalNovels: result.data.totalNovels || 0,
              totalViews: result.data.totalViews || 0,
              totalEarnings: result.data.totalEarnings || 0,
              totalFollowers: result.data.totalFollowers || 0,
              followersBreakdown: result.data.followersBreakdown || {
                userFollowers: 0,
                novelFollowers: 0,
                total: 0
              },
              lastUpdated: result.data.lastUpdated
            };
            
            // ตรวจสอบการเปลี่ยนแปลงและ log การอัพเดท
            if (realUserStats.totalFollowers !== newStats.totalFollowers) {
              console.log(`📈 [Realtime] ผู้ติดตาม: ${realUserStats.totalFollowers} → ${newStats.totalFollowers}`);
            }
            
            setRealUserStats(newStats);
          }
        }
      } catch (error) {
        console.error('Error fetching real stats:', error);
        // ใช้ข้อมูลจาก props เป็น fallback
        setRealUserStats({
          totalNovels: totalStats.totalNovels || 0,
          totalViews: totalStats.totalViews || 0,
          totalEarnings: totalStats.totalEarnings || 0,
          totalFollowers: user.socialStats?.followersCount || 0,
          followersBreakdown: {
            userFollowers: 0,
            novelFollowers: 0,
            total: user.socialStats?.followersCount || 0
          }
        });
      }
    };

    // เรียกทันทีและตั้ง interval สำหรับ realtime updates ทุก 10 วินาที (เร็วขึ้น)
    fetchRealStats();
    const interval = setInterval(fetchRealStats, 10000);

    return () => clearInterval(interval);
  }, [totalStats, user.socialStats?.followersCount, realUserStats.totalFollowers]);

  // ปิด sidebar อัตโนมัติใน mobile เมื่อเปลี่ยน tab
  useEffect(() => {
    if (isMobile && isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  }, [activeTab, isMobile]);

  const toggleSidebar = () => {
    if (isMobile) {
      setIsSidebarOpen(!isSidebarOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  // ฟังก์ชันสำหรับ Toggle ผู้ติดตาม
  const handleFollowerToggle = () => {
    setFollowerDisplayMode(prev => {
      switch (prev) {
        case FollowerDisplayMode.TOTAL:
          return FollowerDisplayMode.USER_FOLLOWERS;
        case FollowerDisplayMode.USER_FOLLOWERS:
          return FollowerDisplayMode.NOVEL_FOLLOWERS;
        case FollowerDisplayMode.NOVEL_FOLLOWERS:
          return FollowerDisplayMode.TOTAL;
        default:
          return FollowerDisplayMode.TOTAL;
      }
    });
  };

  // ฟังก์ชันสำหรับแสดงข้อมูลผู้ติดตามตามโหมด
  const getFollowerDisplayData = () => {
    if (!realUserStats.followersBreakdown) {
      return {
        count: realUserStats.totalFollowers,
        label: 'ติดตาม',
        icon: Users,
        color: 'text-purple-600',
        tooltip: `ผู้ติดตามทั้งหมด: ${realUserStats.totalFollowers.toLocaleString()}`
      };
    }

    switch (followerDisplayMode) {
      case FollowerDisplayMode.USER_FOLLOWERS:
        return {
          count: realUserStats.followersBreakdown.userFollowers,
          label: 'ติดตามคุณ',
          icon: UserCheck,
          color: 'text-blue-600',
          tooltip: `ผู้ติดตามโปรไฟล์: ${realUserStats.followersBreakdown.userFollowers.toLocaleString()}`
        };
      case FollowerDisplayMode.NOVEL_FOLLOWERS:
        return {
          count: realUserStats.followersBreakdown.novelFollowers,
          label: 'ติดตามนิยาย',
          icon: Library,
          color: 'text-green-600',
          tooltip: `ผู้ติดตามนิยาย: ${realUserStats.followersBreakdown.novelFollowers.toLocaleString()}`
        };
      case FollowerDisplayMode.TOTAL:
      default:
        return {
          count: realUserStats.totalFollowers,
          label: 'รวมทั้งหมด',
          icon: Users,
          color: 'text-purple-600',
          tooltip: `รวม: ${realUserStats.totalFollowers.toLocaleString()} | โปรไฟล์: ${realUserStats.followersBreakdown.userFollowers} | นิยาย: ${realUserStats.followersBreakdown.novelFollowers}`
        };
    }
  };

  // ตรวจสอบสถานะการแจ้งเตือน
  const shouldShowWriterApplicationNotification = !isWriter && !writerApplication; // ถ้ายังไม่ใช่นักเขียนและยังไม่เคยสมัคร
  const shouldShowDonationNotification = isWriter && !donationApplication; // ถ้าเป็นนักเขียนแต่ยังไม่สมัครระบบบริจาค

  // เมนูรายการ - อัพเดตให้รองรับทุกบทบาท
  const menuItems: MenuItem[] = [
    {
      id: 'overview',
      label: 'ภาพรวม',
      icon: LayoutDashboard,
      color: 'from-blue-500 to-blue-600',
    },
    {
      id: 'novels',
      label: 'นิยาย',
      icon: BookOpen,
      badge: totalStats.totalNovels.toString(),
      color: 'from-purple-500 to-purple-600',
      // เอา requiresWriter ออกเพื่อให้ทุกคนเข้าถึงได้
    },
    {
      id: 'analytics',
      label: 'วิเคราะห์',
      icon: BarChart3,
      color: 'from-green-500 to-green-600',
      requiresWriter: true, // ล็อคไว้สำหรับ Writer เท่านั้น
    },
    {
      id: 'profile',
      label: 'โปรไฟล์',
      icon: User,
      color: 'from-orange-500 to-orange-600',
      badge: !isWriter ? '!' : undefined, // แจ้งเตือนสำหรับนักอ่าน
    },
    {
      id: 'settings',
      label: 'ตั้งค่า',
      icon: Settings,
      color: 'from-gray-500 to-gray-600',
    },
  ];

  // กรอง navigation items ตาม writer status
  const filteredNavigationItems = menuItems.filter(item => 
    !item.requiresWriter || isWriter
  );

  // Render Tab Content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTab
            user={user}
            totalStats={totalStats}
            novels={novels}
            recentTransactions={recentTransactions}
            earningAnalytics={earningAnalytics}
          />
        );
      case 'novels':
        return (
          <NovelTab 
            novels={novels}
            totalStats={totalStats}
            user={user}
            initialCreateModal={initialCreateModal}
          />
        );
      case 'analytics':
        return (
          <AnalyticsTab 
            earningAnalytics={earningAnalytics}
            novels={novels}
            recentTransactions={recentTransactions}
            user={user}
          />
        );
      case 'profile':
        return (
          <WriterProfileSection 
            user={user}
            isWriter={isWriter}
            writerApplication={writerApplication}
            donationApplication={donationApplication}
            canApplyForWriter={canApplyForWriter}
          />
        );
      case 'settings':
        return <SettingsTab user={user} />;
      default:
        return (
          <OverviewTab
            user={user}
            totalStats={totalStats}
            novels={novels}
            recentTransactions={recentTransactions}
            earningAnalytics={earningAnalytics}
          />
        );
    }
  };

  const followerDisplayData = getFollowerDisplayData();

  // ฟังก์ชันสำหรับจัดการการคลิกเมนู
  const handleMenuClick = (itemId: string) => {
    if (itemId === 'analytics' && !isWriter) {
      // แสดง tooltip แทนการเปลี่ยน tab
      return;
    }
    setActiveTab(itemId);
  };

  return (
    <DashboardContext.Provider value={{ 
      activeTab, 
      setActiveTab, 
      isSidebarOpen, 
      setIsSidebarOpen,
      isCollapsed,
      setIsCollapsed
    }}>
      {/* Dashboard Container - อยู่ในขอบเขต dashboard เท่านั้น */}
      <div className="relative bg-background min-h-[calc(100vh-8rem)] flex"> {/* ใช้ flex layout */}
        
        {/* Mobile Menu Button - อยู่เหนือ sidebar และไม่ blur */}
        {isMobile && (
          <motion.button
            onClick={toggleSidebar}
            className="fixed top-20 left-4 z-30 lg:hidden bg-background border border-border rounded-xl p-3 shadow-xl hover:shadow-2xl transition-all duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{
              rotate: isSidebarOpen ? 90 : 0,
              backgroundColor: isSidebarOpen ? 'rgb(239 68 68 / 0.1)' : 'hsl(var(--background))'
            }}
            transition={{ duration: 0.3 }}
          >
            <AnimatePresence mode="wait">
              {isSidebarOpen ? (
                <motion.div
                  key="close"
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  <X className="w-5 h-5" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ opacity: 0, rotate: 90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: -90 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu className="w-5 h-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        )}

        {/* Mobile Backdrop - blur เฉพาะเนื้อหาหลัก ไม่ blur navbar */}
        <AnimatePresence>
          {isMobile && isSidebarOpen && (
            <>
              {/* Backdrop สำหรับเนื้อหาหลัก - เริ่มจากใต้ navbar */}
              <motion.div
                className="fixed z-20 lg:hidden backdrop-blur-md bg-black/20"
                style={{ 
                  top: '5rem', // เริ่มจากใต้ navbar (navbar สูง 5rem)
                  bottom: '0',
                  left: '0',
                  right: '0'
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                onTouchStart={(e) => {
                  // ป้องกันการเลื่อนหน้าเว็บเมื่อแตะ overlay
                  e.preventDefault();
                }}
              />
            </>
          )}
        </AnimatePresence>

        {/* Sidebar - รองรับ swipe gesture และ mobile optimization */}
        <motion.aside 
          className={`
            ${isMobile ? 'fixed' : 'absolute'} z-25
            ${isMobile 
              ? 'top-20 left-0 w-80 max-w-[calc(100vw-1rem)]' 
              : 'top-6 left-6 w-72'
            }
            ${isCollapsed && !isMobile ? 'w-16' : ''}
            ${isMobile 
              ? 'h-[calc(100vh-6rem)] ml-4' 
              : 'h-[calc(100vh-12rem)]'
            } 
            bg-card border border-border
            shadow-2xl rounded-2xl overflow-hidden
            ${isMobile && !isSidebarOpen ? 'pointer-events-none' : 'pointer-events-auto'}
          `}
          initial={false}
          animate={{
            x: isMobile ? (isSidebarOpen ? 0 : -400) : 0,
            opacity: isMobile ? (isSidebarOpen ? 1 : 0) : 1,
            scale: isMobile ? (isSidebarOpen ? 1 : 0.9) : 1,
            width: isMobile 
              ? 320
              : (isCollapsed ? 64 : 288)
          }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 25,
            duration: 0.4
          }}
          style={{
            visibility: isMobile && !isSidebarOpen ? 'hidden' : 'visible'
          }}
          drag={isMobile ? "x" : false}
          dragConstraints={isMobile ? { left: -400, right: 0 } : undefined}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            if (isMobile && info.velocity.x < -500) {
              setIsSidebarOpen(false);
            }
          }}
        >
          {/* Desktop Collapse Toggle */}
          {!isMobile && (
            <motion.button
              onClick={toggleSidebar}
              className="absolute top-6 -right-3 z-10 p-1.5 bg-background border border-border rounded-full shadow-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <AnimatePresence mode="wait">
                {isCollapsed ? (
                  <motion.div
                    key="expand"
                    initial={{ rotate: 180 }}
                    animate={{ rotate: 0 }}
                    exit={{ rotate: -180 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="collapse"
                    initial={{ rotate: 180 }}
                    animate={{ rotate: 0 }}
                    exit={{ rotate: -180 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          )}

          <div className="flex flex-col h-full">
            {/* User Profile Section */}
            <motion.div 
              className="p-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-accent/5 rounded-t-2xl"
              layout
            >
              <div className="flex items-center gap-3">
                <motion.div 
                  className="relative flex-shrink-0"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className={`${isCollapsed ? 'w-8 h-8' : 'w-12 h-12'} bg-gradient-to-br from-primary via-primary-hover to-accent rounded-xl flex items-center justify-center shadow-lg transition-all duration-300`}>
                    {user.profile?.avatarUrl ? (
                      <img 
                        src={user.profile.avatarUrl} 
                        alt={user.profile.displayName || user.username}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <span className={`text-primary-foreground font-bold ${isCollapsed ? 'text-sm' : 'text-lg'}`}>
                        {user.profile?.displayName?.[0] || user.username?.[0]?.toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  
                  {/* Online Status */}
                  <motion.div 
                    className={`absolute -bottom-0.5 -right-0.5 ${isCollapsed ? 'w-3 h-3' : 'w-4 h-4'} bg-green-500 border-2 border-card rounded-full`}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />

                  {/* Writer Badge */}
                  {isWriter && (
                    <motion.div 
                      className={`absolute -top-0.5 -right-0.5 ${isCollapsed ? 'w-4 h-4' : 'w-5 h-5'} bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: "spring" }}
                    >
                      <Crown className={`${isCollapsed ? 'w-2 h-2' : 'w-3 h-3'} text-white`} />
                    </motion.div>
                  )}
                </motion.div>
                
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div 
                      className="flex-1 min-w-0"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="text-sm font-bold text-card-foreground truncate">
                        {user.profile?.displayName || user.username}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${isWriter ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                        {isWriter ? 'นักเขียน' : 'ผู้อ่าน'}
                      </div>
                      
                      {/* Level Progress */}
                      {user.gamification && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Level {user.gamification.level}</span>
                            <span className="text-primary font-medium">
                              {Math.round((user.gamification.experiencePoints / user.gamification.nextLevelXPThreshold) * 100)}%
                            </span>
                          </div>
                          <div className="w-full bg-secondary/50 rounded-full h-1.5 mt-1 overflow-hidden">
                            <motion.div 
                              className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                              initial={{ width: 0 }}
                              animate={{ 
                                width: `${(user.gamification.experiencePoints / user.gamification.nextLevelXPThreshold) * 100}%` 
                              }}
                              transition={{ duration: 1, delay: 0.5 }}
                            />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Quick Stats - ข้อมูล Realtime */}
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div 
                    className="mt-4 grid grid-cols-3 gap-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    {/* Novels Stat */}
                    <motion.div 
                      className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 relative overflow-hidden"
                      whileHover={{ scale: 1.05, y: -2 }}
                    >
                      {/* Update Flash */}
                      <motion.div
                        className="absolute inset-0 bg-blue-200 dark:bg-blue-600 opacity-0"
                        key={`novels-${realUserStats.totalNovels}`}
                        animate={{ opacity: [0, 0.3, 0] }}
                        transition={{ duration: 0.6 }}
                      />
                      
                      <div className="text-sm font-bold text-blue-600 flex items-center justify-center gap-1 relative z-10">
                        <BookOpen className="w-3 h-3" />
                        <motion.span
                          key={realUserStats.totalNovels}
                          initial={{ scale: 1.1 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          {realUserStats.totalNovels.toLocaleString()}
                        </motion.span>
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium relative z-10">ผลงาน</div>
                    </motion.div>
                    
                    {/* Views Stat */}
                    <motion.div 
                      className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 relative overflow-hidden"
                      whileHover={{ scale: 1.05, y: -2 }}
                    >
                      {/* Update Flash */}
                      <motion.div
                        className="absolute inset-0 bg-green-200 dark:bg-green-600 opacity-0"
                        key={`views-${realUserStats.totalViews}`}
                        animate={{ opacity: [0, 0.3, 0] }}
                        transition={{ duration: 0.6 }}
                      />
                      
                      <div className="text-sm font-bold text-green-600 flex items-center justify-center gap-1 relative z-10">
                        <Eye className="w-3 h-3" />
                        <motion.span
                          key={realUserStats.totalViews}
                          initial={{ scale: 1.1 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          {realUserStats.totalViews > 999 ? `${Math.floor(realUserStats.totalViews / 1000)}k` : realUserStats.totalViews.toLocaleString()}
                        </motion.span>
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400 font-medium relative z-10">ยอดชม</div>
                    </motion.div>

                    {/* Followers Stat with Toggle */}
                    <motion.div 
                      className={`text-center p-2 rounded-lg border relative overflow-hidden group cursor-pointer transition-all duration-200 ${
                        followerDisplayMode === FollowerDisplayMode.USER_FOLLOWERS 
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                          : followerDisplayMode === FollowerDisplayMode.NOVEL_FOLLOWERS
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
                      }`}
                      whileHover={{ scale: 1.05, y: -2 }}
                      onClick={handleFollowerToggle}
                      title={followerDisplayData.tooltip}
                    >
                      {/* Update Flash */}
                      <motion.div
                        className={`absolute inset-0 opacity-0 ${
                          followerDisplayMode === FollowerDisplayMode.USER_FOLLOWERS 
                            ? 'bg-blue-200 dark:bg-blue-600'
                            : followerDisplayMode === FollowerDisplayMode.NOVEL_FOLLOWERS
                            ? 'bg-green-200 dark:bg-green-600'
                            : 'bg-purple-200 dark:bg-purple-600'
                        }`}
                        key={`followers-${followerDisplayData.count}-${followerDisplayMode}`}
                        animate={{ opacity: [0, 0.3, 0] }}
                        transition={{ duration: 0.6 }}
                      />
                      
                      <div className={`text-sm font-bold flex items-center justify-center gap-1 relative z-10 ${followerDisplayData.color}`}>
                        <followerDisplayData.icon className="w-3 h-3" />
                        <motion.span
                          key={`${followerDisplayData.count}-${followerDisplayMode}`}
                          initial={{ scale: 1.2 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.5 }}
                        >
                          {followerDisplayData.count.toLocaleString()}
                        </motion.span>
                      </div>
                      <div className={`text-xs font-medium relative z-10 ${followerDisplayData.color} dark:opacity-80`}>
                        {followerDisplayData.label}
                      </div>
                      
                      {/* Click indicator */}
                      <motion.div
                        className="absolute bottom-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        whileHover={{ scale: 1.1 }}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${followerDisplayData.color.replace('text-', 'bg-')}`} />
                      </motion.div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Navigation */}
            <nav className="flex-1 p-3 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              <ul className={`space-y-1 ${isCollapsed ? 'px-1' : ''} ${isMobile ? 'pb-4' : ''}`}>
                {/* Show all menu items including locked ones */}
                {menuItems.map((item, index) => {
                  const isActive = activeTab === item.id;
                  const isLocked = item.requiresWriter && !isWriter;
                  
                  return (
                    <motion.li 
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <motion.button
                        onClick={() => {
                          if (!isLocked) {
                            handleMenuClick(item.id);
                            // Auto-close sidebar on mobile after selecting a tab
                            if (isMobile) {
                              setTimeout(() => setIsSidebarOpen(false), 100);
                            }
                          }
                        }}
                        className={`
                          w-full flex items-center rounded-xl transition-all duration-300 group relative
                          ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-3'}
                          ${isLocked 
                            ? 'text-muted-foreground/50 cursor-not-allowed' 
                            : isActive 
                              ? 'bg-gradient-to-r from-primary to-primary-hover text-primary-foreground shadow-lg shadow-primary/25' 
                              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                          }
                        `}
                        whileHover={{ scale: isLocked ? 1 : 1.02 }}
                        whileTap={{ scale: isLocked ? 1 : 0.98 }}
                        title={isCollapsed ? (isLocked ? `${item.label} - สมัครเป็นนักเขียนเพื่อปลดล็อค` : item.label) : undefined}
                      >
                        <item.icon className={`${isCollapsed ? 'w-5 h-5' : 'w-5 h-5'} flex-shrink-0 ${isActive ? '' : isLocked ? 'text-muted-foreground/50' : item.color}`} />
                        
                        <AnimatePresence>
                          {!isCollapsed && (
                            <motion.div
                              className="flex items-center justify-between flex-1"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              transition={{ duration: 0.2 }}
                            >
                              <span className="font-medium">{item.label}</span>
                              <div className="flex items-center gap-2">
                                {item.badge && !isLocked && (
                                  <motion.span 
                                    className={`
                                      text-white text-xs px-2 py-1 rounded-full font-bold
                                      ${item.badge === '!' 
                                        ? 'bg-red-500 animate-pulse' 
                                        : 'bg-blue-500'
                                      }
                                    `}
                                    key={item.badge}
                                    initial={{ scale: 1.2 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                  >
                                    {item.badge}
                                  </motion.span>
                                )}
                                {/* Lock Icon for Writer-only features */}
                                {isLocked && (
                                  <motion.div
                                    className="group relative"
                                    whileHover={{ scale: 1.1 }}
                                  >
                                    <Lock className="w-4 h-4 text-muted-foreground/50" />
                                    {/* Tooltip */}
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg p-3 shadow-xl z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                      <div className="text-xs text-card-foreground font-medium mb-1">
                                        ต้องเป็นนักเขียน
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        สมัครเป็นนักเขียนในแท็บโปรไฟล์เพื่อปลดล็อคฟีเจอร์นี้
                                      </div>
                                    </div>
                                  </motion.div>
                                )}

                                {/* Notification badge for Profile tab when user is reader */}
                                {item.id === 'profile' && !isWriter && (
                                  <motion.div
                                    className="w-2 h-2 bg-orange-500 rounded-full"
                                    animate={{ scale: [1, 1.3, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    title="สมัครเป็นนักเขียน"
                                  />
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Icon notification when collapsed */}
                        {isCollapsed && item.id === 'profile' && !isWriter && (
                          <motion.div
                            className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <PenTool className="w-2 h-2 text-white" />
                          </motion.div>
                        )}
                      </motion.button>
                    </motion.li>
                  );
                })}
              </ul>
            </nav>

            {/* Footer */}
            <motion.div 
              className="p-3 border-t border-border/50 rounded-b-2xl"
              layout
            >
              <Link href="/help">
                <motion.div
                  className={`
                    flex items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors
                    ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'}
                  `}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  title={isCollapsed ? "ความช่วยเหลือ" : undefined}
                >
                  <HelpCircle className="w-5 h-5" />
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span 
                        className="font-medium"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        ความช่วยเหลือ
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            </motion.div>
          </div>
        </motion.aside>

        {/* Main Content - ปรับ margin แบบทันทีโดยไม่มีแอนิเมชัน */}
        <main 
          className="flex-1 transition-none"
          style={{
            marginLeft: isMobile ? 0 : (isCollapsed ? 88 : 312),
            paddingLeft: isMobile ? 16 : 24,
            paddingRight: isMobile ? 16 : 24
          }}
        >
          <div className={`
            min-h-[calc(100vh-8rem)]
            ${isMobile ? 'pt-16 pb-8' : 'pt-6 pb-8'}
          `}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={activeTab === 'analytics' ? 'analytics-tab-content' : ''}
              >
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </DashboardContext.Provider>
  );
} 