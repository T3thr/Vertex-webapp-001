// src/components/dashboard/NovelTab.tsx
// แท็บจัดการนิยาย - แสดงรายการนิยายและสถิติต่างๆ - อัพเกรดแล้ว
// รองรับ global.css theme system และมี interactive elements ที่สวยงาม
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus,
  BookOpen,
  Eye,
  Heart,
  MessageCircle,
  Star,
  Users,
  Calendar,
  Edit,
  TrendingUp,
  MoreVertical,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Search,
  SortAsc,
  SortDesc,
  Grid3X3,
  List,
  Bookmark,
  Award,
  Zap,
  Target,
  Coffee,
  Sparkles,
  Crown,
  FileText,
  PlayCircle,
  PauseCircle,
  Settings,
  Share2,
  Download,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { SerializedUser, SerializedNovel } from '@/app/dashboard/page';
import { IUser } from '@/backend/models/User';
import { useState } from 'react';

interface NovelTabProps {
  novels: SerializedNovel[];
  totalStats: {
    totalNovels: number;
    totalEpisodes: number;
    totalViews: number;
    totalEarnings: number;
    averageRating: number;
    totalFollowers: number;
  };
  user: SerializedUser;
}

interface NovelCardProps {
  novel: SerializedNovel;
  index: number;
  viewMode: 'grid' | 'list';
}

// Component สำหรับแสดงการ์ดนิยายแต่ละเรื่อง
function NovelCard({ novel, index, viewMode }: NovelCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // กำหนดสีสถานะ
  const getStatusConfig = (status: string) => {
    const statusConfigs = {
      'published': { 
        icon: CheckCircle,
        text: 'เผยแพร่แล้ว',
        color: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
        dot: 'bg-green-500'
      },
      'draft': { 
        icon: Clock,
        text: 'ฉบับร่าง',
        color: 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800',
        dot: 'bg-gray-500'
      },
      'completed': { 
        icon: CheckCircle,
        text: 'จบแล้ว',
        color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
        dot: 'bg-blue-500'
      },
      'pending_review': { 
        icon: AlertCircle,
        text: 'รอตรวจสอบ',
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
        dot: 'bg-yellow-500'
      },
      'rejected_by_admin': { 
        icon: XCircle,
        text: 'ถูกปฏิเสธ',
        color: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
        dot: 'bg-red-500'
      },
    };
    return statusConfigs[status as keyof typeof statusConfigs] || statusConfigs.draft;
  };

  const statusConfig = getStatusConfig(novel.status);
  const StatusIcon = statusConfig.icon;

  if (viewMode === 'list') {
    return (
      <motion.div
        className="bg-background border border-border rounded-xl p-6 hover:shadow-xl hover:border-primary/30 transition-all duration-300 group"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05, duration: 0.5 }}
        whileHover={{ scale: 1.01, y: -2 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
        <div className="flex items-center gap-6">
          {/* Cover Image */}
          <motion.div 
            className="w-20 h-28 bg-secondary rounded-lg overflow-hidden flex-shrink-0"
            whileHover={{ scale: 1.05 }}
          >
            {novel.coverImageUrl ? (
              <img 
                src={novel.coverImageUrl} 
                alt={novel.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
            )}
          </motion.div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors mb-2 truncate">
                  {novel.title}
                </h3>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${statusConfig.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    <span>{statusConfig.text}</span>
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(novel.lastContentUpdatedAt).toLocaleDateString('th-TH')}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm line-clamp-2">
                  {novel.synopsis}
                </p>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <motion.button
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Edit className="w-4 h-4" />
                </motion.button>
                
                <motion.button
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <MoreVertical className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                  <BookOpen className="w-4 h-4" />
                  <span className="font-semibold">{novel.publishedEpisodesCount || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground">ตอน</p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                  <Eye className="w-4 h-4" />
                  <span className="font-semibold">{(novel.stats?.viewsCount || 0).toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground">ยอดชม</p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                  <Heart className="w-4 h-4" />
                  <span className="font-semibold">{novel.stats?.likesCount || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground">ไลค์</p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-yellow-600 mb-1">
                  <Star className="w-4 h-4" />
                  <span className="font-semibold">{(novel.stats?.averageRating || 0).toFixed(1)}</span>
                </div>
                <p className="text-xs text-muted-foreground">คะแนน</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Grid View
  return (
    <motion.div
      className="bg-background border border-border rounded-xl overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all duration-300 group"
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ scale: 1.02, y: -5 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      {/* Cover Image */}
      <div className="relative">
        <div className="w-full h-48 bg-secondary overflow-hidden">
          {novel.coverImageUrl ? (
            <motion.img 
              src={novel.coverImageUrl} 
              alt={novel.title}
              className="w-full h-full object-cover transition-transform group-hover:scale-110"
              whileHover={{ scale: 1.1 }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
              <BookOpen className="w-16 h-16 text-primary/60" />
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border backdrop-blur-sm ${statusConfig.color}`}>
            <StatusIcon className="w-3 h-3" />
            <span className="font-medium">{statusConfig.text}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <motion.div 
          className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={isHovered ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
        >
          <motion.button
            className="p-2 bg-background/80 backdrop-blur-sm text-foreground hover:bg-primary hover:text-primary-foreground rounded-lg transition-colors shadow-lg"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Edit className="w-4 h-4" />
          </motion.button>
          
          <motion.button
            className="p-2 bg-background/80 backdrop-blur-sm text-foreground hover:bg-primary hover:text-primary-foreground rounded-lg transition-colors shadow-lg"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Share2 className="w-4 h-4" />
          </motion.button>
        </motion.div>

        {/* Reading Progress */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${Math.random() * 100}%` }}
            transition={{ delay: index * 0.1 + 0.5, duration: 1 }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Title & Meta */}
        <div className="mb-4">
          <h3 className="font-bold text-lg text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-2">
            {novel.title}
          </h3>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(novel.lastContentUpdatedAt).toLocaleDateString('th-TH')}
            </span>
            {novel.themeAssignment?.mainTheme && (
              <span className="bg-primary/10 text-primary px-2 py-1 rounded-full">
                หมวดหมู่หลัก
              </span>
            )}
          </div>

          <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">
            {novel.synopsis}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
              <BookOpen className="w-4 h-4" />
              <span className="font-bold text-lg">{novel.publishedEpisodesCount || 0}</span>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">ตอน</p>
          </div>

          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
              <Eye className="w-4 h-4" />
              <span className="font-bold text-lg">{(novel.stats?.viewsCount || 0) > 999 ? `${Math.floor((novel.stats?.viewsCount || 0) / 1000)}k` : (novel.stats?.viewsCount || 0)}</span>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">ยอดชม</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
              <Heart className="w-4 h-4" />
              <span className="font-bold text-lg">{novel.stats?.likesCount || 0}</span>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">ไลค์</p>
          </div>

          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-yellow-600 mb-1">
              <Star className="w-4 h-4" />
              <span className="font-bold text-lg">{(novel.stats?.averageRating || 0).toFixed(1)}</span>
            </div>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">คะแนน</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <motion.button 
            className="bg-primary text-primary-foreground py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors shadow-lg"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="flex items-center justify-center gap-2">
              <Edit className="w-4 h-4" />
              จัดการตอน
            </div>
          </motion.button>
          
          <motion.button 
            className="bg-secondary text-secondary-foreground py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="w-4 h-4" />
              ดูสถิติ
            </div>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// Component สำหรับ Summary Card
interface SummaryCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  action: string;
  delay: number;
}

function SummaryCard({ title, description, icon: Icon, color, action, delay }: SummaryCardProps) {
  return (
    <motion.div
      className={`${color} rounded-xl p-6 text-white relative overflow-hidden group`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 300 }}
      whileHover={{ scale: 1.05, y: -5 }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-8 h-8 border border-white/30 rounded-full"
            style={{
              left: `${20 + i * 30}%`,
              top: `${20 + i * 20}%`,
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
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
        <p className="text-white/90 text-sm mb-4">{description}</p>
        <motion.button
          className="text-sm text-white/90 hover:text-white font-medium flex items-center gap-1 group/btn"
          whileHover={{ x: 5 }}
        >
          {action}
          <motion.div
            className="group-hover/btn:translate-x-1 transition-transform"
          >
            →
          </motion.div>
        </motion.button>
      </div>
    </motion.div>
  );
}

export default function NovelTab({ novels, totalStats, user }: NovelTabProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('lastUpdated');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // กรองและเรียงลำดับนิยาย
  const filteredAndSortedNovels = novels
    .filter(novel => {
      if (filterStatus !== 'all' && novel.status !== filterStatus) return false;
      if (searchQuery && !novel.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'views':
          return (b.stats?.viewsCount || 0) - (a.stats?.viewsCount || 0);
        case 'rating':
          return (b.stats?.averageRating || 0) - (a.stats?.averageRating || 0);
        case 'lastUpdated':
        default:
          return new Date(b.lastContentUpdatedAt).getTime() - new Date(a.lastContentUpdatedAt).getTime();
      }
    });

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Actions */}
      <motion.div 
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8"
        variants={itemVariants}
      >
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-3">
            <motion.div
              className="p-2 bg-primary/10 rounded-xl"
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
            >
              <BookOpen className="w-6 h-6 text-primary" />
            </motion.div>
            นิยายของคุณ
          </h3>
          <p className="text-muted-foreground">
            ทั้งหมด {novels.length} เรื่อง • เผยแพร่แล้ว {novels.filter(n => n.status === 'published' || n.status === 'completed').length} เรื่อง
          </p>
        </div>

        <motion.button 
          className="bg-gradient-to-r from-primary to-primary-hover text-primary-foreground px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus className="w-5 h-5" />
          สร้างนิยายใหม่
          <Sparkles className="w-4 h-4" />
        </motion.button>
      </motion.div>

      {/* Summary Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        variants={itemVariants}
      >
        <SummaryCard
          title="ผลงานรวม"
          description="สถิติทั้งหมดของนิยายที่คุณเขียน"
          icon={TrendingUp}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          action="ดูรายละเอียด"
          delay={0.1}
        />
        
        <SummaryCard
          title="กิจกรรมล่าสุด"
          description="การอัปเดตและความเคลื่อนไหวในสัปดาห์นี้"
          icon={Calendar}
          color="bg-gradient-to-br from-green-500 to-green-600"
          action="ดูกิจกรรม"
          delay={0.2}
        />
        
        <SummaryCard
          title="การดำเนินการ"
          description="จัดการเนื้อหาและตอบกลับผู้อ่าน"
          icon={Target}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
          action="เริ่มเขียน"
          delay={0.3}
        />
      </motion.div>

      {/* Filters and View Controls */}
      <motion.div 
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 p-6 bg-secondary/30 rounded-xl border border-border/50"
        variants={itemVariants}
      >
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหานิยาย..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="published">เผยแพร่แล้ว</option>
            <option value="draft">ฉบับร่าง</option>
            <option value="completed">จบแล้ว</option>
            <option value="pending_review">รอตรวจสอบ</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="lastUpdated">อัปเดตล่าสุด</option>
            <option value="title">ชื่อเรื่อง</option>
            <option value="views">ยอดชม</option>
            <option value="rating">คะแนน</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-background border border-border rounded-lg p-1">
            <motion.button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Grid3X3 className="w-4 h-4" />
            </motion.button>
            <motion.button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <List className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Novels List */}
      <AnimatePresence mode="wait">
        {filteredAndSortedNovels.length > 0 ? (
          <motion.div 
            key={`${viewMode}-${filterStatus}-${sortBy}`}
            className={
              viewMode === 'grid'
                ? "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
                : "space-y-4"
            }
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {filteredAndSortedNovels.map((novel, index) => (
              <NovelCard 
                key={novel._id.toString()} 
                novel={novel} 
                index={index}
                viewMode={viewMode}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div 
            className="text-center py-20"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <motion.div
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {searchQuery || filterStatus !== 'all' ? (
                <Search className="w-20 h-20 text-muted-foreground mx-auto mb-6" />
              ) : (
                <Coffee className="w-20 h-20 text-muted-foreground mx-auto mb-6" />
              )}
            </motion.div>
            
            <h3 className="text-2xl font-bold text-foreground mb-3">
              {searchQuery || filterStatus !== 'all' 
                ? 'ไม่พบนิยายที่ตรงกับเงื่อนไข' 
                : 'ยังไม่มีนิยาย'}
            </h3>
            
            <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
              {searchQuery || filterStatus !== 'all'
                ? 'ลองปรับเปลี่ยนคำค้นหาหรือตัวกรองเพื่อดูผลลัพธ์อื่น'
                : 'เริ่มต้นการเดินทางในการเป็นนักเขียนด้วยการสร้างนิยายเรื่องแรกของคุณ'}
            </p>
            
            {(!searchQuery && filterStatus === 'all') && (
              <motion.button 
                className="bg-gradient-to-r from-primary to-primary-hover text-primary-foreground px-10 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3 mx-auto"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Plus className="w-6 h-6" />
                สร้างนิยายแรก
                <Sparkles className="w-5 h-5" />
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}