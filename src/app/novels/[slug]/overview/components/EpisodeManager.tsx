// app/novels/[slug]/overview/components/EpisodeManager.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Edit3, 
  Eye, 
  Trash2, 
  Clock, 
  Users, 
  BookOpen,
  MoreVertical,
  Calendar,
  TrendingUp,
  FileText,
  Settings,
  Copy
} from 'lucide-react';

interface EpisodeData {
  _id: string;
  title: string;
  episodeOrder: number;
  status: string;
  publishedAt?: string;
  stats: {
    viewsCount: number;
    totalWords: number;
    estimatedReadingTimeMinutes: number;
  };
}

interface EpisodeManagerProps {
  episodes: EpisodeData[];
  novelId: string;
}

/**
 * EpisodeManager - คอมโพเนนต์สำหรับจัดการตอนต่างๆ ของนิยาย
 * รวมการสร้าง แก้ไข ลบ และจัดเรียงตอน
 */
export default function EpisodeManager({ episodes, novelId }: EpisodeManagerProps) {
  const router = useRouter();
  const [selectedEpisodes, setSelectedEpisodes] = useState<string[]>([]);
  const [showActions, setShowActions] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'order' | 'date' | 'views'>('order');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');

  // ฟังก์ชันสำหรับแปลงตัวเลขให้อ่านง่าย
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  // ฟังก์ชันสำหรับแปลงวันที่
  const formatDate = (date: string | undefined): string => {
    if (!date) return 'ยังไม่เผยแพร่';
    return new Date(date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // ฟังก์ชันสำหรับแปลงเวลาอ่าน
  const formatReadingTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} นาที`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} ชม. ${remainingMinutes > 0 ? `${remainingMinutes} นาที` : ''}`;
  };

  // ฟังก์ชันกรองและเรียงลำดับตอน
  const getFilteredAndSortedEpisodes = () => {
    let filtered = episodes;

    // กรองตามสถานะ
    if (filterStatus !== 'all') {
      filtered = episodes.filter(episode => episode.status === filterStatus);
    }

    // เรียงลำดับ
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'order':
          return a.episodeOrder - b.episodeOrder;
        case 'date':
          const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          return dateB - dateA;
        case 'views':
          return b.stats.viewsCount - a.stats.viewsCount;
        default:
          return a.episodeOrder - b.episodeOrder;
      }
    });

    return sorted;
  };

  // ฟังก์ชันสำหรับเลือก/ยกเลิกตอน
  const toggleEpisodeSelection = (episodeId: string) => {
    setSelectedEpisodes(prev => 
      prev.includes(episodeId) 
        ? prev.filter(id => id !== episodeId)
        : [...prev, episodeId]
    );
  };

  // ฟังก์ชันสำหรับเลือกทั้งหมด
  const toggleSelectAll = () => {
    const filteredEpisodes = getFilteredAndSortedEpisodes();
    if (selectedEpisodes.length === filteredEpisodes.length) {
      setSelectedEpisodes([]);
    } else {
      setSelectedEpisodes(filteredEpisodes.map(ep => ep._id));
    }
  };

  // ฟังก์ชันสำหรับลบตอน
  const deleteEpisode = async (episodeId: string) => {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบตอนนี้?')) {
      try {
        const response = await fetch(`/api/novels/${novelId}/episodes/${episodeId}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          // รีเฟรชหน้าหรืออัปเดตข้อมูล
          router.refresh();
        } else {
          throw new Error('ไม่สามารถลบตอนได้');
        }
      } catch (error) {
        console.error('เกิดข้อผิดพลาดในการลบตอน:', error);
        alert('เกิดข้อผิดพลาดในการลบตอน');
      }
    }
  };

  // ฟังก์ชันสำหรับคัดลอกตอน
  const duplicateEpisode = async (episodeId: string) => {
    try {
      const response = await fetch(`/api/novels/${novelId}/episodes/${episodeId}/duplicate`, {
        method: 'POST',
      });
      
      if (response.ok) {
        router.refresh();
      } else {
        throw new Error('ไม่สามารถคัดลอกตอนได้');
      }
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการคัดลอกตอน:', error);
      alert('เกิดข้อผิดพลาดในการคัดลอกตอน');
    }
  };

  const filteredAndSortedEpisodes = getFilteredAndSortedEpisodes();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* แถบเครื่องมือด้านบน */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-foreground">
            จัดการตอน ({episodes.length} ตอน)
          </h3>
          
          {selectedEpisodes.length > 0 && (
            <div className="text-sm text-muted-foreground">
              เลือกแล้ว {selectedEpisodes.length} ตอน
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* ตัวกรอง */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 bg-input border border-input-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">ทั้งหมด</option>
            <option value="published">เผยแพร่แล้ว</option>
            <option value="draft">ฉบับร่าง</option>
          </select>

          {/* การเรียงลำดับ */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-input border border-input-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="order">เรียงตามลำดับ</option>
            <option value="date">เรียงตามวันที่</option>
            <option value="views">เรียงตามยอดดู</option>
          </select>

          {/* ปุ่มเพิ่มตอนใหม่ */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push(`/novels/${novelId}/episodes/new`)}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            เพิ่มตอนใหม่
          </motion.button>
        </div>
      </div>

      {/* รายการตอน */}
      {filteredAndSortedEpisodes.length > 0 ? (
        <div className="space-y-3">
          {/* หัวตาราง */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b border-border">
            <div className="col-span-1">
              <label htmlFor="selectAllEpisodes" className="sr-only">เลือกทั้งหมด</label>
              <input
                id="selectAllEpisodes"
                type="checkbox"
                checked={selectedEpisodes.length === filteredAndSortedEpisodes.length && filteredAndSortedEpisodes.length > 0}
                onChange={toggleSelectAll}
                className="rounded border-input-border focus:ring-ring"
              />
            </div>
            <div className="col-span-1">#</div>
            <div className="col-span-4">ชื่อตอน</div>
            <div className="col-span-2">สถานะ</div>
            <div className="col-span-2">สถิติ</div>
            <div className="col-span-1">วันที่</div>
            <div className="col-span-1">การดำเนินการ</div>
          </div>

          {/* รายการตอน */}
          <AnimatePresence>
            {filteredAndSortedEpisodes.map((episode, index) => (
              <motion.div
                key={episode._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow
                  ${selectedEpisodes.includes(episode._id) ? 'ring-2 ring-primary' : ''}
                `}
              >
                {/* แสดงผลแบบ Desktop */}
                <div className="hidden md:grid md:grid-cols-12 gap-4 items-center">
                  <div className="col-span-1">
                    <label htmlFor={`episode-${episode._id}`} className="sr-only">เลือกตอน</label>
                    <input
                      id={`episode-${episode._id}`}
                      type="checkbox"
                      checked={selectedEpisodes.includes(episode._id)}
                      onChange={() => toggleEpisodeSelection(episode._id)}
                      className="rounded border-input-border focus:ring-ring"
                    />
                  </div>
                  
                  <div className="col-span-1 text-sm font-medium text-muted-foreground">
                    {episode.episodeOrder}
                  </div>
                  
                  <div className="col-span-4">
                    <h4 className="font-medium text-foreground line-clamp-2">
                      {episode.title}
                    </h4>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {formatNumber(episode.stats.totalWords)} คำ
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatReadingTime(episode.stats.estimatedReadingTimeMinutes)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="col-span-2">
                    <span
                      className={`
                        px-2 py-1 text-xs font-medium rounded-full
                        ${episode.status === 'published' 
                          ? 'bg-alert-success text-alert-success-foreground' 
                          : 'bg-secondary text-secondary-foreground'
                        }
                      `}
                    >
                      {episode.status === 'published' ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}
                    </span>
                  </div>
                  
                  <div className="col-span-2">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="w-3 h-3" />
                      {formatNumber(episode.stats.viewsCount)}
                    </div>
                  </div>
                  
                  <div className="col-span-1 text-xs text-muted-foreground">
                    {formatDate(episode.publishedAt)}
                  </div>
                  
                  <div className="col-span-1 relative">
                    <button
                      onClick={() => setShowActions(showActions === episode._id ? null : episode._id)}
                      className="p-2 hover:bg-accent rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    
                    <AnimatePresence>
                      {showActions === episode._id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 top-10 z-10 bg-popover border border-border rounded-lg shadow-lg py-2 min-w-[160px]"
                        >
                          <button
                            onClick={() => router.push(`/novels/${novelId}/episodes/${episode._id}/edit`)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
                          >
                            <Edit3 className="w-4 h-4" />
                            แก้ไข
                          </button>
                          
                          <button
                            onClick={() => router.push(`/novels/${novelId}/episodes/${episode._id}`)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            ดูตัวอย่าง
                          </button>
                          
                          <button
                            onClick={() => duplicateEpisode(episode._id)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
                          >
                            <Copy className="w-4 h-4" />
                            คัดลอก
                          </button>
                          
                          <div className="my-1 border-t border-border"></div>
                          
                          <button
                            onClick={() => deleteEpisode(episode._id)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 transition-colors flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            ลบ
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* แสดงผลแบบ Mobile */}
                <div className="md:hidden space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <label htmlFor={`episode-${episode._id}`} className="flex items-center gap-2">
                        <input
                          id={`episode-${episode._id}`}
                          type="checkbox"
                          checked={selectedEpisodes.includes(episode._id)}
                          onChange={() => toggleEpisodeSelection(episode._id)}
                          className="mt-1 rounded border-input-border focus:ring-ring"
                        />
                        <span className="text-sm font-medium text-muted-foreground">เลือก</span>
                      </label>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-muted-foreground">
                            ตอนที่ {episode.episodeOrder}
                          </span>
                          <span
                            className={`
                              px-2 py-1 text-xs font-medium rounded-full
                              ${episode.status === 'published' 
                                ? 'bg-alert-success text-alert-success-foreground' 
                                : 'bg-secondary text-secondary-foreground'
                              }
                            `}
                          >
                            {episode.status === 'published' ? 'เผยแพร่' : 'ร่าง'}
                          </span>
                        </div>
                        
                        <h4 className="font-medium text-foreground line-clamp-2 mb-2">
                          {episode.title}
                        </h4>
                        
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {formatNumber(episode.stats.totalWords)} คำ
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatReadingTime(episode.stats.estimatedReadingTimeMinutes)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {formatNumber(episode.stats.viewsCount)} ครั้ง
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(episode.publishedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setShowActions(showActions === episode._id ? null : episode._id)}
                      className="p-2 hover:bg-accent rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  {/* เมนูการดำเนินการสำหรับ Mobile */}
                  <AnimatePresence>
                    {showActions === episode._id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex gap-2 pt-3 border-t border-border"
                      >
                        <button
                          onClick={() => router.push(`/novels/${novelId}/episodes/${episode._id}/edit`)}
                          className="flex-1 px-3 py-2 bg-accent hover:bg-accent/80 text-accent-foreground rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <Edit3 className="w-4 h-4" />
                          แก้ไข
                        </button>
                        
                        <button
                          onClick={() => router.push(`/novels/${novelId}/episodes/${episode._id}`)}
                          className="flex-1 px-3 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          ดู
                        </button>
                        
                        <button
                          onClick={() => deleteEpisode(episode._id)}
                          className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        /* ข้อความเมื่อไม่มีตอน */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 bg-card border border-border rounded-lg"
        >
          <div className="text-6xl mb-4">📖</div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            ยังไม่มีตอนในนิยายเรื่องนี้
          </h3>
          <p className="text-muted-foreground mb-6">
            เริ่มสร้างตอนแรกของนิยายเพื่อเล่าเรื่องราวของคุณ
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push(`/novels/${novelId}/episodes/new`)}
            className="px-6 py-3 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
          >
            <Plus className="w-5 h-5" />
            สร้างตอนแรก
          </motion.button>
        </motion.div>
      )}

      {/* การดำเนินการแบบหลายรายการ */}
      {selectedEpisodes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-card border border-border rounded-lg shadow-lg p-4 z-20"
        >
          <div className="flex items-center gap-4">
            <span className="text-sm text-foreground">
              เลือกแล้ว {selectedEpisodes.length} ตอน
            </span>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // ดำเนินการแบบกลุ่ม
                  console.log('Bulk publish', selectedEpisodes);
                }}
                className="px-3 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg text-sm font-medium transition-colors"
              >
                เผยแพร่ทั้งหมด
              </button>
              
              <button
                onClick={() => {
                  if (confirm(`คุณแน่ใจหรือไม่ที่จะลบ ${selectedEpisodes.length} ตอน?`)) {
                    // ลบแบบกลุ่ม
                    console.log('Bulk delete', selectedEpisodes);
                  }
                }}
                className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                ลบทั้งหมด
              </button>
              
              <button
                onClick={() => setSelectedEpisodes([])}
                className="px-3 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-sm font-medium transition-colors"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}