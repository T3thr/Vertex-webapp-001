// app/novels/[slug]/overview/components/SidePanel.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Book, 
  TrendingUp, 
  Clock, 
  Calendar,
  Users,
  FileText,
  Tag,
  Bookmark,
  Star
} from 'lucide-react';

import { useWorkspace } from './WorkspaceContext';

/**
 * @function SidePanel
 * @description แผงด้านซ้ายสำหรับแสดงข้อมูลนิยายและสถิติ
 */
export default function SidePanel() {
  const { novel, episodes, sidebarOpen, toggleSidebar } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'info' | 'stats' | 'recent'>('info');
  
  // ถ้า Sidebar ถูกปิด
  if (!sidebarOpen) {
    return (
      <div className="w-10 h-full border-r border-border flex items-center justify-center">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-full hover:bg-accent"
          title="เปิดแผงข้อมูล"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }
  
  // ฟังก์ชันแปลงวันที่
  const formatDate = (date: string | undefined): string => {
    if (!date) return 'ยังไม่เผยแพร่';
    return new Date(date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // ฟังก์ชันแปลงตัวเลขให้อ่านง่าย
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 300, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        className="h-full bg-card border-r border-border overflow-hidden"
      >
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h3 className="font-semibold text-foreground">ข้อมูลนิยาย</h3>
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-full hover:bg-accent"
            title="ปิดแผงข้อมูล"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
        
        {/* แท็บ */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('info')}
            className={`
              flex-1 py-2 text-sm font-medium
              ${activeTab === 'info' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}
            `}
          >
            ข้อมูล
          </button>
          
          <button
            onClick={() => setActiveTab('stats')}
            className={`
              flex-1 py-2 text-sm font-medium
              ${activeTab === 'stats' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}
            `}
          >
            สถิติ
          </button>
          
          <button
            onClick={() => setActiveTab('recent')}
            className={`
              flex-1 py-2 text-sm font-medium
              ${activeTab === 'recent' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}
            `}
          >
            ตอนล่าสุด
          </button>
        </div>
        
        {/* เนื้อหาแท็บ */}
        <div className="p-4 overflow-y-auto" style={{ height: 'calc(100% - 96px)' }}>
          {activeTab === 'info' && (
            <div className="space-y-4">
              {/* ชื่อนิยายและเรื่องย่อ */}
              <div>
                <h2 className="text-lg font-semibold text-foreground">{novel.title}</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  {novel.synopsis.length > 150 
                    ? novel.synopsis.substring(0, 150) + '...' 
                    : novel.synopsis
                  }
                </p>
              </div>
              
              {/* ข้อมูลผู้เขียน */}
              <div className="flex items-center gap-3 mt-2">
                {novel.author.profile.avatarUrl ? (
                  <img 
                    src={novel.author.profile.avatarUrl} 
                    alt={novel.author.profile.displayName || 'Author'}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs font-medium text-muted-foreground">
                      {novel.author.profile.displayName?.charAt(0) || 'A'}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {novel.author.profile.displayName || 'ไม่ระบุชื่อ'}
                  </p>
                  <p className="text-xs text-muted-foreground">ผู้เขียน</p>
                </div>
              </div>
              
              {/* หมวดหมู่ */}
              <div className="mt-4">
                <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  หมวดหมู่
                </h3>
                <div className="flex flex-wrap gap-1">
                  {novel.categories && novel.categories.length > 0 ? (
                    novel.categories.map((category, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-accent text-accent-foreground rounded-full text-xs"
                      >
                        {category.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">ไม่มีหมวดหมู่</span>
                  )}
                </div>
              </div>
              
              {/* ข้อมูลเพิ่มเติม */}
              <div className="mt-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">สถานะ</span>
                  <span className="text-xs font-medium text-foreground">
                    {novel.status === 'ongoing' ? 'กำลังเขียน' : 
                     novel.status === 'completed' ? 'จบแล้ว' : 
                     novel.status === 'hiatus' ? 'หยุดชั่วคราว' : 'ไม่ระบุ'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">วันที่เริ่มเขียน</span>
                  <span className="text-xs font-medium text-foreground">
                    {formatDate(novel.createdAt)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">อัปเดตล่าสุด</span>
                  <span className="text-xs font-medium text-foreground">
                    {formatDate(novel.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'stats' && (
            <div className="space-y-4">
              {/* สถิติหลัก */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Book className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">จำนวนตอน</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {novel.totalEpisodesCount}
                  </p>
                </div>
                
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">ยอดอ่าน</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {formatNumber(novel.stats.viewsCount)}
                  </p>
                </div>
              </div>
              
              {/* สถิติเพิ่มเติม */}
              <div className="space-y-3">
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">จำนวนคำทั้งหมด</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {formatNumber(novel.stats.totalWords)} คำ
                  </p>
                </div>
                
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">เวลาอ่านโดยประมาณ</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {Math.round(novel.stats.totalWords / 250)} นาที
                  </p>
                </div>
                
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">ผู้ติดตาม</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {formatNumber(novel.stats.followersCount || 0)}
                  </p>
                </div>
                
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Bookmark className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">บุ๊คมาร์ก</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {formatNumber(novel.stats.bookmarksCount || 0)}
                  </p>
                </div>
                
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">คะแนนเฉลี่ย</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {novel.stats.averageRating ? novel.stats.averageRating.toFixed(1) : 'ยังไม่มีคะแนน'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'recent' && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground mb-3">ตอนล่าสุด</h3>
              
              {episodes.length > 0 ? (
                episodes.slice(-5).reverse().map((episode) => (
                  <div 
                    key={episode._id} 
                    className="p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <p className="text-sm font-medium text-foreground truncate">
                      {episode.title}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {formatNumber(episode.stats.totalWords)} คำ
                      </span>
                      <span
                        className={`
                          px-2 py-0.5 text-xs rounded-full
                          ${episode.status === 'published' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                          }
                        `}
                      >
                        {episode.status === 'published' ? 'เผยแพร่' : 'ร่าง'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(episode.updatedAt)}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {formatNumber(episode.stats.viewsCount)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p>ยังไม่มีตอน</p>
                </div>
              )}
              
              {episodes.length > 5 && (
                <button className="w-full mt-2 text-xs text-primary hover:underline">
                  ดูทั้งหมด ({episodes.length} ตอน)
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

