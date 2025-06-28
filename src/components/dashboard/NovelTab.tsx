// src/components/dashboard/NovelTab.tsx
// แท็บจัดการนิยาย - แสดงรายการนิยายและสถิติต่างๆ - อัพเกรดใหม่
// รองรับ global.css theme system และมี interactive elements ที่สวยงาม
'use client';

import { motion, AnimatePresence } from 'framer-motion';
// CODE-MOD: เพิ่มการ import คอมโพเนนต์ Link จาก next/link สำหรับการทำ internal navigation
import Link from 'next/link';
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
  Sparkles,
  Crown,
  ImageIcon,
  FileText,
  Settings,
  Share2,
  BarChart,
  DollarSign,
  PlayCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { SerializedNovel, SerializedUser } from '@/app/dashboard/page';
import { useState, useMemo, useEffect } from 'react';
import CreateNovelModal from './CreateNovelModal';

// Interfaces
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
  initialCreateModal?: boolean;
}

interface NovelCardProps {
  novel: SerializedNovel;
  index: number;
  viewMode: 'grid' | 'list';
}

function NovelCard({ novel, index, viewMode }: NovelCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const getStatusConfig = (status: string) => {
    const configs = {
      published: {
        color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800',
        icon: CheckCircle,
        label: 'เผยแพร่แล้ว'
      },
      draft: {
        color: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800',
        icon: Edit,
        label: 'ฉบับร่าง'
      },
      completed: {
        color: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800',
        icon: Award,
        label: 'จบแล้ว'
      },
      archived: {
        color: 'bg-gray-500/10 text-gray-600 border-gray-200 dark:border-gray-800',
        icon: XCircle,
        label: 'เก็บไว้'
      }
    };
    return configs[status as keyof typeof configs] || configs.draft;
  };

  const statusConfig = getStatusConfig(novel.status);
  const StatusIcon = statusConfig.icon;

  // Calculate engagement rate
  const engagementRate = novel.stats.viewsCount > 0 
    ? ((novel.stats.likesCount + novel.stats.commentsCount) / novel.stats.viewsCount * 100) 
    : 0;

  if (viewMode === 'list') {
    return (
      <motion.div
        className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-500 group"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.4 }}
        whileHover={{ scale: 1.02, y: -4 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
        <div className="p-6">
          <div className="flex items-start gap-6">
            {/* Novel Cover */}
          <motion.div
              className="relative flex-shrink-0 w-24 h-32 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 border border-border/50"
            whileHover={{ scale: 1.05 }}
          >
              {novel.coverImageUrl && !imageError ? (
              <img
                src={novel.coverImageUrl}
                alt={novel.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={() => setImageError(true)}
              />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              
              {/* Status Badge */}
              <div className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-medium border ${statusConfig.color} backdrop-blur-sm`}>
                <StatusIcon className="w-3 h-3 inline mr-1" />
                {statusConfig.label}
              </div>
          </motion.div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-card-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                  {novel.title}
                </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {novel.synopsis || 'ไม่มีเรื่องย่อ'}
                </p>
              </div>

                {/* Actions */}
              <div className="flex items-center gap-2 ml-4">
                  <motion.button
                    className="p-2 bg-secondary hover:bg-accent rounded-lg text-muted-foreground hover:text-accent-foreground transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Edit className="w-4 h-4" />
                  </motion.button>
                <motion.button
                    className="p-2 bg-secondary hover:bg-accent rounded-lg text-muted-foreground hover:text-accent-foreground transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <MoreVertical className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-secondary/50 rounded-lg">
                  <Eye className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                  <div className="text-sm font-semibold">{novel.stats.viewsCount.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">ยอดชม</div>
                </div>
                <div className="text-center p-3 bg-secondary/50 rounded-lg">
                  <Heart className="w-4 h-4 text-red-500 mx-auto mb-1" />
                  <div className="text-sm font-semibold">{novel.stats.likesCount.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">ไลค์</div>
                </div>
                <div className="text-center p-3 bg-secondary/50 rounded-lg">
                  <MessageCircle className="w-4 h-4 text-green-500 mx-auto mb-1" />
                  <div className="text-sm font-semibold">{novel.stats.commentsCount.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">คอมเมนต์</div>
              </div>
                <div className="text-center p-3 bg-secondary/50 rounded-lg">
                  <Star className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
                  <div className="text-sm font-semibold">{novel.stats.averageRating.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">คะแนน</div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>ตอน: {novel.publishedEpisodesCount}</span>
                  <span>อัปเดต: {new Date(novel.lastContentUpdatedAt).toLocaleDateString('th-TH')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-lg text-xs ${
                    engagementRate > 5 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                    engagementRate > 2 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                    'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {engagementRate.toFixed(1)}% Engagement
                  </span>
                </div>
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
      className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-500"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      whileHover={{ scale: 1.03, y: -8 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      {/* Cover Image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
        {novel.coverImageUrl && !imageError ? (
          <img
              src={novel.coverImageUrl}
              alt={novel.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={() => setImageError(true)}
            />
          ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
            <ImageIcon className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
        
        {/* Overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0.5 }}
          transition={{ duration: 0.3 }}
        />

        {/* Status Badge */}
        <div className={`absolute top-3 left-3 px-3 py-1.5 rounded-lg text-xs font-semibold border ${statusConfig.color} backdrop-blur-md`}>
          <StatusIcon className="w-3 h-3 inline mr-1" />
          {statusConfig.label}
        </div>

        {/* Action Buttons */}
        <AnimatePresence>
          {isHovered && (
        <motion.div
              className="absolute top-3 right-3 flex flex-col gap-2"
          initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
        >
            <motion.button
                className="p-2 bg-white/20 backdrop-blur-md rounded-lg text-white hover:bg-white/30 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Edit className="w-4 h-4" />
            </motion.button>
              <motion.button
                className="p-2 bg-white/20 backdrop-blur-md rounded-lg text-white hover:bg-white/30 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <BarChart className="w-4 h-4" />
              </motion.button>
          <motion.button
                className="p-2 bg-white/20 backdrop-blur-md rounded-lg text-white hover:bg-white/30 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
                <MoreVertical className="w-4 h-4" />
          </motion.button>
        </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-yellow-300 transition-colors">
            {novel.title}
          </h3>

          {/* Quick Stats */}
          <div className="flex items-center justify-between text-sm opacity-90">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>{novel.stats.viewsCount > 1000 ? `${(novel.stats.viewsCount / 1000).toFixed(1)}K` : novel.stats.viewsCount}</span>
          </div>
              <div className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                <span>{novel.stats.likesCount}</span>
        </div>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-400" />
              <span>{novel.stats.averageRating.toFixed(1)}</span>
            </div>
          </div>
        </div>
          </div>

      {/* Card Footer */}
      <div className="p-4 bg-gradient-to-r from-card via-card to-secondary/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span>{novel.publishedEpisodesCount} ตอน</span>
          <span>{new Date(novel.lastContentUpdatedAt).toLocaleDateString('th-TH')}</span>
        </div>

        {/* Engagement Bar */}
        <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              engagementRate > 5 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
              engagementRate > 2 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
              'bg-gradient-to-r from-red-400 to-pink-500'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(engagementRate * 10, 100)}%` }}
            transition={{ delay: index * 0.1 + 0.5, duration: 0.8 }}
          />
              </div>
        <div className="text-xs text-muted-foreground mt-1 text-center">
          {engagementRate.toFixed(1)}% การมีส่วนร่วม
        </div>
      </div>
    </motion.div>
  );
}

// Summary Cards Component
interface SummaryCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  action: string;
  delay: number;
  onClick?: () => void;
}

function SummaryCard({ title, description, icon: Icon, color, action, delay, onClick }: SummaryCardProps) {
  return (
    <motion.div
      className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-card-foreground mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground mb-3">{description}</p>
          <motion.button
            className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {action}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export default function NovelTab({ novels, totalStats, user, initialCreateModal = false }: NovelTabProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'views' | 'likes' | 'rating'>('updated');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(initialCreateModal);
  const [novelsList, setNovelsList] = useState(novels);

  // Handle initial create modal from URL parameter
  useEffect(() => {
    if (initialCreateModal) {
      setIsCreateModalOpen(true);
    }
  }, [initialCreateModal]);

  // Handle novel creation success
  const handleNovelCreated = (newNovel: any) => {
    // Add the new novel to the beginning of the list
    const formattedNovel: SerializedNovel = {
      ...newNovel,
      stats: {
        viewsCount: 0,
        likesCount: 0,
        commentsCount: 0,
        discussionThreadCount: 0,
        ratingsCount: 0,
        averageRating: 0,
        followersCount: 0,
        sharesCount: 0,
        bookmarksCount: 0,
        totalWords: 0,
        estimatedReadingTimeMinutes: 0,
        completionRate: 0,
        purchasesCount: 0,
        uniqueViewersCount: 0,
        ...newNovel.stats
      },
      themeAssignment: newNovel.themeAssignment || {
        mainTheme: { categoryId: { _id: '', name: 'ทั่วไป' } },
        subThemes: [],
        moodAndTone: [],
        contentWarnings: [],
        customTags: []
      },
      narrativeFocus: {},
      language: newNovel.language || { _id: '', name: 'ไม่ระบุ' },
      author: user._id,
      coAuthors: [],
      firstEpisodeId: undefined,
      relatedNovels: [],
      seriesId: undefined,
      deletedByUserId: undefined,
      monetizationSettings: {
        isCoinBasedUnlock: false,
        allowDonations: false,
        isAdSupported: false,
        isPremiumExclusive: false
      },
      psychologicalAnalysisConfig: {
        allowsPsychologicalAnalysis: true
      },
      publishedAt: undefined,
      scheduledPublicationDate: undefined,
      deletedAt: undefined,
      isDeleted: false,
      totalEpisodesCount: 0,
      publishedEpisodesCount: 0,
      isCompleted: false,
      accessLevel: 'private' as any,
      sourceType: { type: 'interactive_fiction' as any },
      endingType: 'ongoing' as any,
      isFeatured: false,
      adminNotes: undefined
    };

    setNovelsList(prev => [formattedNovel, ...prev]);
  };

  // Filter and sort novels
  const filteredAndSortedNovels = useMemo(() => {
    let filtered = novelsList.filter(novel => {
      const matchesSearch = novel.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           novel.synopsis?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || novel.status === filterStatus;
      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortBy) {
        case 'updated':
          aValue = new Date(a.lastContentUpdatedAt).getTime();
          bValue = new Date(b.lastContentUpdatedAt).getTime();
          break;
        case 'views':
          aValue = a.stats.viewsCount;
          bValue = b.stats.viewsCount;
          break;
        case 'likes':
          aValue = a.stats.likesCount;
          bValue = b.stats.likesCount;
          break;
        case 'rating':
          aValue = a.stats.averageRating;
          bValue = b.stats.averageRating;
          break;
        default:
          aValue = new Date(a.lastContentUpdatedAt).getTime();
          bValue = new Date(b.lastContentUpdatedAt).getTime();
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
      }
      return 0;
    });

    return filtered;
  }, [novelsList, searchQuery, sortBy, filterStatus, sortOrder]);

  const summaryCards = [
    {
      title: 'เขียนนิยายใหม่',
      description: 'เริ่มต้นสร้างสรรค์เรื่องราวใหม่ที่น่าตื่นเต้น',
      icon: Plus,
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      action: 'เริ่มเขียน',
      onClick: () => setIsCreateModalOpen(true)
    },
    {
      title: 'จัดการนิยาย',
      description: 'แก้ไข อัปเดต และจัดการนิยายที่มีอยู่',
      icon: Edit,
      color: 'bg-gradient-to-br from-green-500 to-green-600',
      action: 'จัดการ'
    },
    {
      title: 'วิเคราะห์ผลงาน',
      description: 'ดูสถิติและประสิทธิภาพของนิยายทั้งหมด',
      icon: BarChart,
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      action: 'ดูรายงาน'
    },
    {
      title: 'การตั้งค่า',
      description: 'ปรับแต่งการแสดงผลและการทำงานของนิยาย',
      icon: Settings,
      color: 'bg-gradient-to-br from-orange-500 to-orange-600',
      action: 'ตั้งค่า'
    }
  ];

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <motion.div
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-primary" />
            จัดการนิยาย
          </h2>
          <p className="text-muted-foreground">
            จัดการและติดตามผลงานนิยายทั้งหมดของคุณ
          </p>
        </div>

        <div className="flex items-center gap-3">
        {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="ค้นหานิยาย..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
          />
        </div>

          {/* Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">ทั้งหมด</option>
            <option value="published">เผยแพร่แล้ว</option>
            <option value="draft">ฉบับร่าง</option>
            <option value="completed">จบแล้ว</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="updated">อัปเดตล่าสุด</option>
            <option value="views">ยอดชม</option>
            <option value="likes">ไลค์</option>
            <option value="rating">คะแนน</option>
          </select>

          {/* Sort Order */}
          <motion.button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="p-2 bg-secondary border border-border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {sortOrder === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
          </motion.button>

          {/* View Mode Toggle */}
          <div className="flex bg-secondary rounded-lg p-1">
            <motion.button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Grid3X3 className="w-4 h-4" />
            </motion.button>
            <motion.button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <List className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {summaryCards.map((card, index) => (
          <SummaryCard
            key={card.title}
            {...card}
            delay={index * 0.1}
          />
        ))}
      </div>

      {/* Stats Overview */}
      <motion.div
        className="bg-card border border-border rounded-2xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <h3 className="text-xl font-bold text-card-foreground mb-6 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" />
          ภาพรวมผลงาน
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'นิยายทั้งหมด', value: totalStats.totalNovels, icon: BookOpen, color: 'text-blue-500' },
            { label: 'ตอนทั้งหมด', value: totalStats.totalEpisodes, icon: FileText, color: 'text-green-500' },
            { label: 'ยอดชมรวม', value: totalStats.totalViews.toLocaleString(), icon: Eye, color: 'text-purple-500' },
            { label: 'ผู้ติดตาม', value: totalStats.totalFollowers.toLocaleString(), icon: Users, color: 'text-pink-500' },
            { label: 'คะแนนเฉลี่ย', value: totalStats.averageRating.toFixed(1), icon: Star, color: 'text-yellow-500' },
            { label: 'รายได้', value: `฿${totalStats.totalEarnings.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-500' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              className="text-center p-4 bg-secondary/50 rounded-xl hover:bg-secondary transition-colors"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 + 0.5, duration: 0.3 }}
              whileHover={{ scale: 1.05 }}
            >
              <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
              <div className="text-lg font-bold text-card-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Novels Grid/List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        {filteredAndSortedNovels.length > 0 ? (
          <div className={
              viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
          }>
            {filteredAndSortedNovels.map((novel, index) => (
              <NovelCard
                key={novel._id}
                novel={novel}
                index={index}
                viewMode={viewMode}
              />
            ))}
          </div>
        ) : (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-card-foreground mb-2">
              {searchQuery || filterStatus !== 'all' ? 'ไม่พบนิยายที่ตรงกับเงื่อนไข' : 'ยังไม่มีนิยาย'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || filterStatus !== 'all'
                ? 'ลองเปลี่ยนคำค้นหาหรือเงื่อนไขการกรอง' 
                : 'เริ่มต้นสร้างสรรค์เรื่องราวแรกของคุณได้เลย'
              }
            </p>
            {!searchQuery && filterStatus === 'all' && (
              <motion.button
                className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary-hover transition-colors flex items-center gap-2 mx-auto"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Plus className="w-5 h-5" />
                เขียนนิยายแรก
              </motion.button>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Create Novel Modal */}
      <CreateNovelModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        user={user}
        onNovelCreated={handleNovelCreated}
      />
    </motion.div>
  );
}