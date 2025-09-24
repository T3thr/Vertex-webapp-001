// src/components/dashboard/NovelTab.tsx
// แท็บจัดการนิยาย - แสดงรายการนิยายและสถิติต่างๆ - อัพเกรดใหม่
// รองรับ global.css theme system และมี interactive elements ที่สวยงาม
'use client';

import { motion, AnimatePresence } from 'framer-motion';
// CODE-MOD: เพิ่มการ import คอมโพเนนต์ Link จาก next/link สำหรับการทำ internal navigation
import Link from 'next/link';
import Image from 'next/image';
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
  ArrowDown,
  ArrowDownAZ,
  ArrowUpAZ,
  ChevronLeft,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { SerializedNovel, SerializedUser } from '@/app/dashboard/page';
import { useState, useMemo, useEffect } from 'react';
import CreateNovelModal from './CreateNovelModal';
import DeleteNovelModal from './DeleteNovelModal';

// Interfaces
interface NovelTabProps {
  novels: SerializedNovel[];
  totalStats: {
    totalNovels: number;
    totalViews: number;
    totalEarnings: number;
    totalFollowers: number;
  };
  user: SerializedUser;
  initialCreateModal?: boolean;
  setActiveTab?: (tab: string) => void;
}

interface NovelCardProps {
  novel: SerializedNovel;
  index: number;
  viewMode: 'grid' | 'list';
  setActiveTab?: (tab: string) => void;
  onDeleteNovel?: (novel: SerializedNovel) => void;
}

function NovelCard({ novel, index, viewMode, setActiveTab, onDeleteNovel }: NovelCardProps) {
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
        <div className="p-4 md:p-6">
          <div className="flex items-start gap-3 md:gap-6">
            {/* Novel Cover */}
          <motion.div
              className="relative flex-shrink-0 w-16 h-20 md:w-24 md:h-32 rounded-lg md:rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 border border-border/50 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            onClick={() => window.location.href = `/novels/${novel.slug}/overview`}
          >
                            {novel.coverImageUrl && !imageError ? (
              <Image
                src={novel.coverImageUrl}
                alt={novel.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  width={96}
                  height={128}
                  sizes="(max-width: 768px) 64px, 96px"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                  <ImageIcon className="w-4 h-4 md:w-8 md:h-8 text-muted-foreground/30" />
                </div>
              )}
              
              {/* Status Badge */}
              <div className={`absolute top-1 right-1 md:top-2 md:right-2 px-1.5 py-0.5 md:px-2 md:py-1 rounded text-xs font-medium border ${statusConfig.color} backdrop-blur-sm`}>
                <StatusIcon className="w-2 h-2 md:w-3 md:h-3 inline mr-0.5 md:mr-1" />
                <span className="hidden sm:inline">{statusConfig.label}</span>
              </div>
          </motion.div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => window.location.href = `/novels/${novel.slug}/overview`}>
                  <h3 className="text-sm md:text-lg font-bold text-card-foreground mb-1 md:mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                  {novel.title}
                </h3>
                  <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {novel.synopsis || 'ไม่มีเรื่องย่อ'}
                </p>
              </div>

                {/* Actions */}
              <div className="flex items-center gap-1 md:gap-2 ml-2 md:ml-4">
                  <motion.button
                    className="p-1.5 md:p-2 bg-secondary hover:bg-accent rounded-lg text-muted-foreground hover:text-accent-foreground transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `/novels/${novel.slug}/overview`;
                    }}
                    title="แก้ไขนิยาย"
                  >
                    <Edit className="w-3 h-3 md:w-4 md:h-4" />
                  </motion.button>
                <motion.button
                    className="p-1.5 md:p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-500 hover:text-red-600 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNovel?.(novel);
                  }}
                  title="ลบนิยาย"
                >
                  <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                </motion.button>
              </div>
            </div>

            {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4">
                <div className="text-center p-2 md:p-3 bg-secondary/50 rounded-lg">
                  <Eye className="w-3 h-3 md:w-4 md:h-4 text-blue-500 mx-auto mb-1" />
                  <div className="text-xs md:text-sm font-semibold">{novel.stats.viewsCount.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">ยอดชม</div>
                </div>
                <div className="text-center p-2 md:p-3 bg-secondary/50 rounded-lg">
                  <Heart className="w-3 h-3 md:w-4 md:h-4 text-red-500 mx-auto mb-1" />
                  <div className="text-xs md:text-sm font-semibold">{novel.stats.likesCount.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">ไลค์</div>
                </div>
                <div className="text-center p-2 md:p-3 bg-secondary/50 rounded-lg">
                  <MessageCircle className="w-3 h-3 md:w-4 md:h-4 text-green-500 mx-auto mb-1" />
                  <div className="text-xs md:text-sm font-semibold">{novel.stats.commentsCount.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">คอมเมนต์</div>
              </div>
                <div className="text-center p-2 md:p-3 bg-secondary/50 rounded-lg">
                  <Star className="w-3 h-3 md:w-4 md:h-4 text-yellow-500 mx-auto mb-1" />
                  <div className="text-xs md:text-sm font-semibold">{novel.stats.averageRating.toFixed(1)}</div>
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
                    {engagementRate.toFixed(1)}% การมีส่วนร่วม
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
      <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 cursor-pointer" onClick={() => window.location.href = `/novels/${novel.slug}/overview`}>
                {novel.coverImageUrl && !imageError ? (
          <Image
              src={novel.coverImageUrl}
              alt={novel.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            width={240}
            height={320}
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
              onClick={(e) => {
                e.stopPropagation();
                // Use the setActiveTab function if provided
                if (setActiveTab) {
                  setActiveTab('analytics');
                } else {
                  // Fallback to console log if setActiveTab is not provided
                  console.log('View analytics for novel:', novel.title);
                }
              }}
              title="ดูสถิติ"
            >
              <BarChart className="w-4 h-4" />
            </motion.button>
              <motion.button
                className="p-2 bg-white/20 backdrop-blur-md rounded-lg text-white hover:bg-white/30 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `/novels/${novel.slug}/overview`;
                }}
                title="แก้ไขนิยาย"
              >
                <Edit className="w-4 h-4" />
              </motion.button>
              <motion.button
                className="p-2 bg-red-500/80 backdrop-blur-md rounded-lg text-white hover:bg-red-600/80 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteNovel?.(novel);
                }}
                title="ลบนิยาย"
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
        </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white cursor-pointer" onClick={() => window.location.href = `/novels/${novel.slug}/overview`}>
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
      className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4">
        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl ${color} flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0`}>
          <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base md:text-lg font-bold text-card-foreground mb-1 truncate">{title}</h3>
          <p className="text-xs md:text-sm text-muted-foreground mb-3 line-clamp-2">{description}</p>
          <motion.button
            className="bg-primary/10 text-primary px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
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
  const [sortBy, setSortBy] = useState<'updated' | 'views' | 'likes' | 'rating' | 'title' | 'episodes' | 'created'>('updated');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(initialCreateModal);
  const [novelsList, setNovelsList] = useState(novels);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [novelToDelete, setNovelToDelete] = useState<SerializedNovel | null>(null);
  
  // Enhanced Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  
  // Quick actions สำหรับ summary cards
  const summaryCards = [
    {
      title: "เขียนนิยายใหม่",
      description: "เริ่มต้นการเขียนผลงานใหม่",
      icon: Plus,
      color: "text-blue-500",
      action: "สร้างเลย",
      delay: 0,
      onClick: () => setIsCreateModalOpen(true)
    },
    {
      title: "จัดการผลงาน",
      description: "แก้ไขและปรับปรุงนิยาย",
      icon: Edit,
      color: "text-green-500", 
      action: "จัดการ",
      delay: 0.1
    },
    {
      title: "ดูสถิติ",
      description: "ติดตามยอดชมและผลตอบรับ",
      icon: BarChart,
      color: "text-purple-500",
      action: "ดูเลย",
      delay: 0.2
    },
    {
      title: "การตั้งค่า",
      description: "ปรับแต่งการแสดงผล",
      icon: Settings,
      color: "text-orange-500",
      action: "ตั้งค่า",
      delay: 0.3
    }
  ];

  const handleNovelCreated = (newNovel: any) => {
    setNovelsList(prev => [newNovel, ...prev]);
    setIsCreateModalOpen(false);
  };

  const handleDeleteNovel = (novel: SerializedNovel) => {
    // Ensure we close any existing modal first
    if (isDeleteModalOpen) {
      setIsDeleteModalOpen(false);
      setNovelToDelete(null);
      // Small delay to ensure clean state transition
      setTimeout(() => {
        setNovelToDelete(novel);
        setIsDeleteModalOpen(true);
      }, 150);
    } else {
      setNovelToDelete(novel);
      setIsDeleteModalOpen(true);
    }
  };

  const handleConfirmDelete = async (novelId: string) => {
    try {
      const response = await fetch(`/api/novels/${novelToDelete?.slug}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete novel');
      }

      const result = await response.json();
      console.log('Novel deleted successfully:', result);

      // Remove the novel from the local state
      setNovelsList(prev => prev.filter(novel => novel._id !== novelId));
      
      // Show success message (you might want to add a toast notification here)
      alert(`ลบนิยาย "${novelToDelete?.title}" เรียบร้อยแล้ว`);
      
      // Close the modal and reset states - this will be handled by the modal's onClose
      setIsDeleteModalOpen(false);
      setNovelToDelete(null);
      
    } catch (error: any) {
      console.error('Error deleting novel:', error);
      alert(`เกิดข้อผิดพลาดในการลบนิยาย: ${error.message}`);
      // Don't close modal on error, let user try again
    }
  };

  // Enhanced filtering and sorting
  const filteredAndSortedNovels = useMemo(() => {
    const filtered = novelsList.filter(novel => {
      const matchesSearch = novel.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           novel.synopsis?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || novel.status === filterStatus;
      return matchesSearch && matchesStatus;
    });

    // Enhanced sorting
    filtered.sort((a, b) => {
      let aValue: any = 0;
      let bValue: any = 0;

      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'updated':
          aValue = new Date(a.lastContentUpdatedAt).getTime();
          bValue = new Date(b.lastContentUpdatedAt).getTime();
          break;
        case 'created':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'views':
          aValue = a.stats?.viewsCount || 0;
          bValue = b.stats?.viewsCount || 0;
          break;
        case 'likes':
          aValue = a.stats?.likesCount || 0;
          bValue = b.stats?.likesCount || 0;
          break;
        case 'rating':
          aValue = a.stats?.averageRating || 0;
          bValue = b.stats?.averageRating || 0;
          break;
        case 'episodes':
          aValue = a.publishedEpisodesCount || 0;
          bValue = b.publishedEpisodesCount || 0;
          break;
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [novelsList, searchQuery, filterStatus, sortBy, sortOrder]);

  // Enhanced pagination
  const totalPages = Math.ceil(filteredAndSortedNovels.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNovels = filteredAndSortedNovels.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, sortBy, sortOrder, itemsPerPage]);

  const handleSortChange = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  // Get sort icon
  const getSortIcon = (field: typeof sortBy) => {
    if (sortBy !== field) return ArrowUpDown;
    return sortOrder === 'asc' ? ArrowUp : ArrowDown;
  };

  const statusOptions = [
    { value: 'all', label: 'ทั้งหมด', count: novelsList.length },
    { value: 'published', label: 'เผยแพร่แล้ว', count: novelsList.filter(n => n.status === 'published').length },
    { value: 'draft', label: 'ฉบับร่าง', count: novelsList.filter(n => n.status === 'draft').length },
    { value: 'completed', label: 'จบแล้ว', count: novelsList.filter(n => n.status === 'completed').length },
  ];

  const itemsPerPageOptions = [6, 12, 24, 48];

  function setActiveTab(tab: string): void {
    throw new Error('Function not implemented.');
  }

  return (
    <div className="space-y-4 md:space-y-6 px-2 sm:px-4 md:px-6">
      {/* Header Section */}
      <motion.div 
        className="flex flex-col gap-3 md:gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-foreground mb-1 md:mb-2 flex items-center gap-2 md:gap-3">
              <BookOpen className="w-5 h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-primary flex-shrink-0" />
              <span className="truncate">จัดการนิยาย</span>
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground">จัดการและติดตามผลงานของคุณ</p>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div 
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {summaryCards.map((card, index) => (
          <SummaryCard key={card.title} {...card} delay={index * 0.1} />
        ))}
      </motion.div>

      {/* Search and Filter Controls - Moved below summary cards */}
      <motion.div 
        className="bg-card border border-border rounded-lg md:rounded-xl p-3 md:p-4 lg:p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="space-y-3 md:space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="ค้นหานิยายจากชื่อเรื่องหรือเรื่องย่อ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg pl-10 md:pl-12 pr-4 py-2 md:py-3 text-sm md:text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {searchQuery && (
              <motion.button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <XCircle className="w-4 h-4" />
              </motion.button>
            )}
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col lg:flex-row gap-3 md:gap-4">
            {/* Status Filter */}
            <div className="flex-1">
              <label className="block text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">สถานะ</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 md:py-2.5 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div className="flex-1">
              <label className="block text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">เรียงตาม</label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 md:py-2.5 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="updated">วันที่อัปเดต</option>
                  <option value="created">วันที่สร้าง</option>
                  <option value="title">ชื่อเรื่อง</option>
                  <option value="views">ยอดชม</option>
                  <option value="likes">ไลค์</option>
                  <option value="rating">คะแนน</option>
                  <option value="episodes">จำนวนตอน</option>
                </select>
                
                <motion.button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="bg-secondary border border-border rounded-lg px-3 py-2 md:py-2.5 hover:bg-accent hover:text-accent-foreground transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title={sortOrder === 'asc' ? 'เรียงจากน้อยไปมาก' : 'เรียงจากมากไปน้อย'}
                >
                  {sortOrder === 'asc' ? <ArrowUpAZ className="w-4 h-4" /> : <ArrowDownAZ className="w-4 h-4" />}
                </motion.button>
              </div>
            </div>

            {/* Items Per Page */}
            <div className="flex-1">
              <label className="block text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">จำนวนต่อหน้า</label>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 md:py-2.5 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {itemsPerPageOptions.map(option => (
                  <option key={option} value={option}>{option} รายการ</option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex-shrink-0">
              <label className="block text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">รูปแบบ</label>
              <div className="flex bg-secondary border border-border rounded-lg p-1">
                <motion.button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-md text-xs md:text-sm font-medium transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Grid3X3 className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">ตาราง</span>
                </motion.button>
                <motion.button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-md text-xs md:text-sm font-medium transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <List className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">รายการ</span>
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Results Summary */}
      <motion.div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div>
          แสดง {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredAndSortedNovels.length)} จาก {filteredAndSortedNovels.length} ผลงาน
          {searchQuery && ` (ค้นหา: "${searchQuery}")`}
        </div>
        {filteredAndSortedNovels.length > 0 && (
          <div className="flex items-center gap-2">
            <span>หน้า {currentPage} จาก {totalPages}</span>
          </div>
        )}
      </motion.div>

      {/* Novels Grid/List */}
      <AnimatePresence mode="wait">
        {filteredAndSortedNovels.length > 0 ? (
          <motion.div
            key={`${viewMode}-${currentPage}`}
            className={`grid gap-3 md:gap-4 lg:gap-6 transition-all duration-300 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5' 
                : 'grid-cols-1'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {paginatedNovels.map((novel, index) => (
              <NovelCard 
                key={novel._id} 
                novel={novel} 
                index={index} 
                viewMode={viewMode}
                setActiveTab={setActiveTab}
                onDeleteNovel={handleDeleteNovel}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            className="text-center py-12 md:py-16 lg:py-20"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <BookOpen className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 mx-auto mb-4 md:mb-6 text-muted-foreground opacity-50" />
            <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2 md:mb-3">
              {searchQuery || filterStatus !== 'all' ? 'ไม่พบผลลัพธ์' : 'ยังไม่มีนิยาย'}
            </h3>
            <p className="text-sm md:text-base text-muted-foreground mb-6 md:mb-8 max-w-md mx-auto">
              {searchQuery || filterStatus !== 'all' 
                ? 'ลองปรับเปลี่ยนคำค้นหาหรือตัวกรองเพื่อหาผลงานที่ต้องการ'
                : 'เริ่มต้นการเขียนผลงานแรกของคุณวันนี้'
              }
            </p>
            {(!searchQuery && filterStatus === 'all') && (
              <motion.button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary-hover transition-colors flex items-center gap-3 mx-auto shadow-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Plus className="w-5 h-5" />
                เขียนนิยายใหม่
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Pagination */}
      {totalPages > 1 && (
        <motion.div 
          className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {/* Page Info */}
          <div className="text-xs md:text-sm text-muted-foreground">
            หน้า {currentPage} จาก {totalPages} ({filteredAndSortedNovels.length} ผลงาน)
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-2">
            {/* First Page */}
            <motion.button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm"
              whileHover={{ scale: currentPage === 1 ? 1 : 1.05 }}
              whileTap={{ scale: currentPage === 1 ? 1 : 0.95 }}
            >
              ««
            </motion.button>

            {/* Previous Page */}
            <motion.button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-xs md:text-sm"
              whileHover={{ scale: currentPage === 1 ? 1 : 1.05 }}
              whileTap={{ scale: currentPage === 1 ? 1 : 0.95 }}
            >
              <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">ก่อนหน้า</span>
            </motion.button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current page
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 2 && page <= currentPage + 2)
                ) {
                  return (
                    <motion.button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'border border-border hover:bg-secondary'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {page}
                    </motion.button>
                  );
                } else if (
                  page === currentPage - 3 ||
                  page === currentPage + 3
                ) {
                  return (
                    <span key={page} className="px-1 text-muted-foreground text-xs md:text-sm">
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>

            {/* Next Page */}
            <motion.button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-xs md:text-sm"
              whileHover={{ scale: currentPage === totalPages ? 1 : 1.05 }}
              whileTap={{ scale: currentPage === totalPages ? 1 : 0.95 }}
            >
              <span className="hidden sm:inline">ถัดไป</span>
              <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
            </motion.button>

            {/* Last Page */}
            <motion.button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm"
              whileHover={{ scale: currentPage === totalPages ? 1 : 1.05 }}
              whileTap={{ scale: currentPage === totalPages ? 1 : 0.95 }}
            >
              »»
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Create Novel Modal */}
      <CreateNovelModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onNovelCreated={handleNovelCreated}
        user={user}
      />

      {/* Delete Novel Modal */}
      <DeleteNovelModal
        key={novelToDelete?._id || 'delete-modal'} // Force re-render when novel changes
        isOpen={isDeleteModalOpen}
        onClose={() => {
          // Always reset states when modal closes
          setIsDeleteModalOpen(false);
          setNovelToDelete(null);
        }}
        novel={novelToDelete}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
}