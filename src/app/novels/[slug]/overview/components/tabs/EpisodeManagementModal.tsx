// src/app/novels/[slug]/overview/components/tabs/EpisodeManagementModal.tsx
// 🎯 Modal สำหรับจัดการตอน (Episodes) แบบภาพรวม

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Plus, Trash2, Edit3, Save, ChevronRight, 
  Book, Lock, Unlock, Eye, EyeOff, AlertCircle,
  Calendar, Clock, Users, BarChart3, Grid3x3,
  List, Search, Filter, SortAsc, SortDesc
} from 'lucide-react';
import { toast } from 'sonner';

// 🎯 Types
interface Episode {
  _id: string;
  title: string;
  slug: string;
  episodeOrder: number;
  volumeNumber?: number;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  accessType: 'free' | 'paid_unlock' | 'premium_access';
  priceCoins?: number;
  publishedAt?: string;
  stats?: {
    viewsCount: number;
    uniqueViewersCount: number;
    likesCount: number;
    commentsCount: number;
    totalWords: number;
  };
  storyMapNodeId?: string;
  createdAt: string;
  updatedAt: string;
}

interface EpisodeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  novelSlug: string;
  currentEpisodeId?: string;
  onEpisodeSelect: (episodeId: string | null) => void;
  onEpisodesUpdate?: (episodes: Episode[]) => void;
  onEpisodeDelete?: (episodeId: string) => void;
}

// 🎨 Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    draft: { color: 'bg-gray-500', icon: Edit3, label: 'แบบร่าง' },
    published: { color: 'bg-green-500', icon: Eye, label: 'เผยแพร่แล้ว' },
    scheduled: { color: 'bg-blue-500', icon: Calendar, label: 'ตั้งเวลา' },
    archived: { color: 'bg-orange-500', icon: EyeOff, label: 'เก็บถาวร' }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white ${config.color}`}>
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </div>
  );
};

// 🎨 Access Type Badge Component
const AccessBadge = ({ type, price }: { type: string; price?: number }) => {
  const accessConfig = {
    free: { color: 'bg-green-100 text-green-700', icon: Unlock, label: 'ฟรี' },
    paid_unlock: { color: 'bg-purple-100 text-purple-700', icon: Lock, label: `${price || 0} เหรียญ` },
    premium_access: { color: 'bg-yellow-100 text-yellow-700', icon: Lock, label: 'พรีเมียม' }
  };

  const config = accessConfig[type as keyof typeof accessConfig] || accessConfig.free;
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${config.color}`}>
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </div>
  );
};

// 🎨 Episode Card Component
const EpisodeCard = ({ 
  episode, 
  isSelected, 
  onSelect, 
  onEdit, 
  onDelete,
  viewMode 
}: {
  episode: Episode;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  viewMode: 'grid' | 'list';
}) => {
  if (viewMode === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className={`
          flex items-center justify-between p-4 rounded-lg border-2 transition-all cursor-pointer
          ${isSelected 
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
            : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
          }
        `}
        onClick={onSelect}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 font-bold">
            {episode.episodeOrder}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{episode.title}</h4>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={episode.status} />
              <AccessBadge type={episode.accessType} price={episode.priceCoins} />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {episode.stats && (
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {episode.stats.viewsCount}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {episode.stats.uniqueViewersCount}
              </span>
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Edit3 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </motion.div>
    );
  }

  // Grid View
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`
        relative p-4 rounded-xl border-2 transition-all cursor-pointer
        ${isSelected 
          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-lg' 
          : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md'
        }
      `}
      onClick={onSelect}
    >
      <div className="absolute top-2 right-2 flex gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
        </button>
      </div>

      <div className="flex items-center justify-center w-12 h-12 mb-3 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 font-bold text-lg">
        {episode.episodeOrder}
      </div>
      
      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 pr-12 line-clamp-2">
        {episode.title}
      </h4>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <StatusBadge status={episode.status} />
          <AccessBadge type={episode.accessType} price={episode.priceCoins} />
        </div>
        
        {episode.stats && (
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {episode.stats.viewsCount}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {episode.stats.uniqueViewersCount}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// 🎯 Main Modal Component
export default function EpisodeManagementModal({
  isOpen,
  onClose,
  novelSlug,
  currentEpisodeId,
  onEpisodeSelect,
  onEpisodesUpdate,
  onEpisodeDelete
}: EpisodeManagementModalProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'order' | 'date'>('order');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isCreating, setIsCreating] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  
  // Form state for creating/editing
  const [formData, setFormData] = useState<{
    title: string;
    episodeOrder: number;
    volumeNumber: number;
    status: 'draft' | 'published' | 'scheduled' | 'archived';
    accessType: 'free' | 'paid_unlock' | 'premium_access';
    priceCoins: number;
  }>({
    title: '',
    episodeOrder: 1,
    volumeNumber: 1,
    status: 'draft',
    accessType: 'free',
    priceCoins: 0
  });

  // 🔄 Load episodes
  const loadEpisodes = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/novels/${novelSlug}/episodes`);
      if (!response.ok) throw new Error('Failed to load episodes');
      
      const data = await response.json();
      setEpisodes(data.episodes || []);
      onEpisodesUpdate?.(data.episodes || []);
    } catch (error) {
      console.error('Error loading episodes:', error);
      toast.error('ไม่สามารถโหลดรายการตอนได้');
    } finally {
      setIsLoading(false);
    }
  }, [novelSlug]);

  useEffect(() => {
    if (isOpen) {
      loadEpisodes();
    }
  }, [isOpen, loadEpisodes]);

  // 📝 Create new episode
  const handleCreateEpisode = async () => {
    try {
      const response = await fetch(`/api/novels/${novelSlug}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 🎯 PROFESSIONAL: Episodes don't create nodes - they have separate StoryMaps
        body: JSON.stringify({
          ...formData
        })
      });

      if (!response.ok) throw new Error('Failed to create episode');
      
      const data = await response.json();
      toast.success('สร้างตอนใหม่สำเร็จ');
      
      await loadEpisodes();
      setIsCreating(false);
      resetForm();
      
      // Auto-select the new episode
      if (data.episode) {
        onEpisodeSelect(data.episode._id);
      }
    } catch (error) {
      console.error('Error creating episode:', error);
      toast.error('ไม่สามารถสร้างตอนได้');
    }
  };

  // 📝 Update episode
  const handleUpdateEpisode = async () => {
    if (!editingEpisode) return;

    try {
      const response = await fetch(`/api/novels/${novelSlug}/episodes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _id: editingEpisode._id,
          ...formData
        })
      });

      if (!response.ok) throw new Error('Failed to update episode');
      
      toast.success('อัปเดตตอนสำเร็จ');
      await loadEpisodes();
      setEditingEpisode(null);
      resetForm();
    } catch (error) {
      console.error('Error updating episode:', error);
      toast.error('ไม่สามารถอัปเดตตอนได้');
    }
  };

  // 🗑️ Delete episode - REAL-TIME UPDATE
  const handleDeleteEpisode = async (episodeId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบตอนนี้? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
      return;
    }

    try {
      // 🎯 PROFESSIONAL: Update UI immediately (optimistic update)
      const updatedEpisodes = episodes.filter(ep => ep._id !== episodeId);
      setEpisodes(updatedEpisodes);
      
      // If deleted episode was selected, clear selection
      if (currentEpisodeId === episodeId) {
        if (updatedEpisodes.length > 0) {
          onEpisodeSelect(updatedEpisodes[0]._id);
        } else {
          onEpisodeSelect(null);
        }
      }
      
      const response = await fetch(`/api/novels/${novelSlug}/episodes?ids=${episodeId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        // Revert on error
        await loadEpisodes();
        throw new Error('Failed to delete episode');
      }
      
      toast.success('ลบตอนสำเร็จ');
      
      // Call parent callback if provided
      if (onEpisodeDelete) {
        onEpisodeDelete(episodeId);
      }
    } catch (error) {
      console.error('Error deleting episode:', error);
      toast.error('ไม่สามารถลบตอนได้');
    }
  };

  // 🔧 Helper functions
  const resetForm = () => {
    setFormData({
      title: '',
      episodeOrder: Math.max(...episodes.map(ep => ep.episodeOrder), 0) + 1,
      volumeNumber: 1,
      status: 'draft',
      accessType: 'free',
      priceCoins: 0
    });
  };

  const startEdit = (episode: Episode) => {
    setEditingEpisode(episode);
    setFormData({
      title: episode.title,
      episodeOrder: episode.episodeOrder,
      volumeNumber: episode.volumeNumber || 1,
      status: episode.status as 'draft' | 'published' | 'scheduled' | 'archived',
      accessType: episode.accessType as 'free' | 'paid_unlock' | 'premium_access',
      priceCoins: episode.priceCoins || 0
    });
  };

  // 🔍 Filter and sort episodes
  const filteredEpisodes = episodes
    .filter(ep => ep.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      if (sortBy === 'order') {
        return (a.episodeOrder - b.episodeOrder) * multiplier;
      } else {
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * multiplier;
      }
    });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-6xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <Book className="w-6 h-6 text-purple-500" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                จัดการตอน (Episodes)
              </h2>
              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium">
                {episodes.length} ตอน
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาตอน..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Sort */}
              <button
                onClick={() => setSortBy(sortBy === 'order' ? 'date' : 'order')}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <Filter className="w-4 h-4" />
                {sortBy === 'order' ? 'ลำดับตอน' : 'วันที่สร้าง'}
              </button>

              <button
                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              </button>

              {/* View Mode */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''
                  }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Create Button */}
            <button
              onClick={() => {
                // 🎯 PROFESSIONAL: Open the main episode creator dialog instead
                if (window.parent && window.parent.postMessage) {
                  window.parent.postMessage({ type: 'OPEN_EPISODE_CREATOR' }, '*');
                }
                onClose(); // Close this modal
              }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              เพิ่มตอนใหม่
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
              </div>
            ) : filteredEpisodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                <Book className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">ยังไม่มีตอน</p>
                <p className="text-sm mt-2">คลิก &quot;เพิ่มตอนใหม่&quot; เพื่อเริ่มสร้างเรื่องราว</p>
              </div>
            ) : (
              <div className={
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                  : 'space-y-3'
              }>
                {filteredEpisodes.map((episode) => (
                  <EpisodeCard
                    key={episode._id}
                    episode={episode}
                    isSelected={currentEpisodeId === episode._id}
                    onSelect={() => {
                      onEpisodeSelect(episode._id);
                      onClose();
                    }}
                    onEdit={() => startEdit(episode)}
                    onDelete={() => handleDeleteEpisode(episode._id)}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer Stats */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-6">
                <span className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  ทั้งหมด: {episodes.length} ตอน
                </span>
                <span className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  เผยแพร่แล้ว: {episodes.filter(ep => ep.status === 'published').length}
                </span>
                <span className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4" />
                  แบบร่าง: {episodes.filter(ep => ep.status === 'draft').length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                อัปเดตล่าสุด: {new Date().toLocaleString('th-TH')}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Create/Edit Form Modal */}
        <AnimatePresence>
          {(isCreating || editingEpisode) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[10000] flex items-center justify-center p-4"
            >
              <div 
                className="absolute inset-0 bg-black/60"
                onClick={() => {
                  setIsCreating(false);
                  setEditingEpisode(null);
                }}
              />
              
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-md"
              >
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                  {isCreating ? 'สร้างตอนใหม่' : 'แก้ไขตอน'}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ชื่อตอน
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="เช่น ตอนที่ 1: การเริ่มต้น"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        ลำดับตอน
                      </label>
                      <input
                        type="number"
                        value={formData.episodeOrder}
                        onChange={(e) => setFormData({ ...formData, episodeOrder: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        min="1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        เล่มที่
                      </label>
                      <input
                        type="number"
                        value={formData.volumeNumber}
                        onChange={(e) => setFormData({ ...formData, volumeNumber: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        min="1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      สถานะ
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' | 'scheduled' | 'archived' })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="draft">แบบร่าง</option>
                      <option value="published">เผยแพร่</option>
                      <option value="scheduled">ตั้งเวลา</option>
                      <option value="archived">เก็บถาวร</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ประเภทการเข้าถึง
                    </label>
                    <select
                      value={formData.accessType}
                      onChange={(e) => setFormData({ ...formData, accessType: e.target.value as 'free' | 'paid_unlock' | 'premium_access' })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="free">ฟรี</option>
                      <option value="paid_unlock">ซื้อด้วยเหรียญ</option>
                      <option value="premium_access">พรีเมียม</option>
                    </select>
                  </div>

                  {formData.accessType === 'paid_unlock' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        ราคา (เหรียญ)
                      </label>
                      <input
                        type="number"
                        value={formData.priceCoins}
                        onChange={(e) => setFormData({ ...formData, priceCoins: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        min="0"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setEditingEpisode(null);
                    }}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={isCreating ? handleCreateEpisode : handleUpdateEpisode}
                    disabled={!formData.title.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {isCreating ? 'สร้างตอน' : 'บันทึก'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}
