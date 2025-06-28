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
  DollarSign
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
            setRealUserStats({
              totalNovels: result.data.totalNovels || 0,
              totalViews: result.data.totalViews || 0,
              totalEarnings: result.data.totalEarnings || 0,
              totalFollowers: result.data.totalFollowers || user.socialStats?.followersCount || 0
            });
          }
        }
      } catch (error) {
        console.error('Error fetching real stats:', error);
        // ใช้ข้อมูลจาก props เป็น fallback
        setRealUserStats({
          totalNovels: totalStats.totalNovels || 0,
          totalViews: totalStats.totalViews || 0,
          totalEarnings: totalStats.totalEarnings || 0,
          totalFollowers: user.socialStats?.followersCount || 0
        });
      }
    };

    // เรียกทันทีและตั้ง interval สำหรับ realtime updates ทุก 15 วินาที
    fetchRealStats();
    const interval = setInterval(fetchRealStats, 15000);

    return () => clearInterval(interval);
  }, [totalStats, user.socialStats?.followersCount]);

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

  // ตรวจสอบสถานะการแจ้งเตือน
  const shouldShowWriterApplicationNotification = !isWriter && !writerApplication; // ถ้ายังไม่ใช่นักเขียนและยังไม่เคยสมัคร
  const shouldShowDonationNotification = isWriter && !donationApplication; // ถ้าเป็นนักเขียนแต่ยังไม่สมัครระบบบริจาค

  // Navigation Items
  const navigationItems: MenuItem[] = [
    {
      id: 'overview',
      label: 'ภาพรวม',
      icon: Home,
      color: 'text-blue-600'
    },
    {
      id: 'novels',
      label: 'นิยาย',
      icon: BookOpen,
      color: 'text-green-600'
      // ลบ badge ออกแล้ว
    },
    {
      id: 'analytics',
      label: 'วิเคราะห์',
      icon: BarChart3,
      requiresWriter: true,
      color: 'text-purple-600'
    },
    {
      id: 'profile',
      label: 'โปรไฟล์',
      icon: User,
      requiresWriter: true,
      color: 'text-orange-600',
      badge: shouldShowWriterApplicationNotification || shouldShowDonationNotification ? '!' : undefined
    },
    {
      id: 'settings',
      label: 'ตั้งค่า',
      icon: Settings,
      color: 'text-gray-600'
    }
  ];

  // กรอง navigation items ตาม writer status
  const filteredNavigationItems = navigationItems.filter(item => 
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
        
        {/* Mobile Menu Button - ปรับตำแหน่งให้อยู่ขอบบนของ sidebar */}
        {isMobile && (
          <motion.button
            onClick={toggleSidebar}
            className="fixed top-20 left-4 z-[60] lg:hidden bg-background/95 backdrop-blur-sm border border-border rounded-xl p-3 shadow-lg hover:shadow-xl transition-all duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{
              rotate: isSidebarOpen ? 90 : 0,
              backgroundColor: isSidebarOpen ? 'rgb(239 68 68 / 0.1)' : 'hsl(var(--background) / 0.95)'
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

        {/* Mobile Overlay - ปรับตำแหน่งให้สูงขึ้นสำหรับ mobile */}
        <AnimatePresence>
          {isMobile && isSidebarOpen && (
            <motion.div
              className="fixed inset-0 bg-black/30 z-40 lg:hidden backdrop-blur-sm"
              style={{ 
                top: '5rem', // ปรับให้สูงขึ้นเล็กน้อย
                bottom: '0', // ไม่ทับ footer
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
          )}
        </AnimatePresence>

        {/* Sidebar - รองรับ swipe gesture และ mobile optimization */}
        <motion.aside 
          className={`
            ${isMobile ? 'fixed' : 'absolute'} z-50
            ${isMobile 
              ? 'top-20 left-0 w-80 max-w-[calc(100vw-1rem)]' 
              : 'top-6 left-6 w-72'
            }
            ${isCollapsed && !isMobile ? 'w-16' : ''}
            ${isMobile 
              ? 'h-[calc(100vh-6rem)] ml-4' 
              : 'h-[calc(100vh-14rem)]'
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
              className="absolute top-6 -right-3 z-40 p-1.5 bg-background border border-border rounded-full shadow-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
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
                    <motion.div 
                      className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                      whileHover={{ scale: 1.05, y: -2 }}
                    >
                      <div className="text-sm font-bold text-blue-600 flex items-center justify-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {realUserStats.totalNovels}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">ผลงาน</div>
                    </motion.div>
                    
                    <motion.div 
                      className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                      whileHover={{ scale: 1.05, y: -2 }}
                    >
                      <div className="text-sm font-bold text-green-600 flex items-center justify-center gap-1">
                        <Eye className="w-3 h-3" />
                        {realUserStats.totalViews > 999 ? `${Math.floor(realUserStats.totalViews / 1000)}k` : realUserStats.totalViews}
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400 font-medium">ยอดชม</div>
                    </motion.div>

                    <motion.div 
                      className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800"
                      whileHover={{ scale: 1.05, y: -2 }}
                    >
                      <div className="text-sm font-bold text-purple-600 flex items-center justify-center gap-1">
                        <Users className="w-3 h-3" />
                        <motion.span
                          key={realUserStats.totalFollowers}
                          initial={{ scale: 1.2, color: '#10b981' }}
                          animate={{ scale: 1, color: '#7c3aed' }}
                          transition={{ duration: 0.5 }}
                        >
                          {realUserStats.totalFollowers}
                        </motion.span>
                      </div>
                      <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">ติดตาม</div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Navigation */}
            <nav className="flex-1 p-3 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              <ul className={`space-y-1 ${isCollapsed ? 'px-1' : ''} ${isMobile ? 'pb-4' : ''}`}>
                {filteredNavigationItems.map((item, index) => {
                  const isActive = activeTab === item.id;
                  
                  return (
                    <motion.li 
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <motion.button
                        onClick={() => {
                          setActiveTab(item.id);
                          // Auto-close sidebar on mobile after selecting a tab
                          if (isMobile) {
                            setTimeout(() => setIsSidebarOpen(false), 100);
                          }
                        }}
                        className={`
                          w-full flex items-center rounded-xl transition-all duration-300 group
                          ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-3'}
                          ${isActive 
                            ? 'bg-gradient-to-r from-primary to-primary-hover text-primary-foreground shadow-lg shadow-primary/25' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                          }
                        `}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <item.icon className={`${isCollapsed ? 'w-5 h-5' : 'w-5 h-5'} flex-shrink-0 ${isActive ? '' : item.color}`} />
                        
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
                              {item.badge && (
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
                            </motion.div>
                          )}
                        </AnimatePresence>
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

        {/* Main Content - ปรับ margin ตามสถานะ sidebar */}
        <motion.main 
          className="flex-1 transition-all duration-300"
          initial={false}
          animate={{
            marginLeft: isMobile ? 0 : (isCollapsed ? 88 : 312), // เพิ่ม margin สำหรับ sidebar + padding
            paddingLeft: isMobile ? 16 : 24,
            paddingRight: isMobile ? 16 : 24
          }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 30,
            duration: 0.3
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
        </motion.main>
      </div>
    </DashboardContext.Provider>
  );
} 