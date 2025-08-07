// src/app/novels/[slug]/overview/components/tabs/SummaryTab.tsx
"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Eye,
  Heart,
  MessageSquare,
  Bookmark,
  Users,
  Clock,
  Calendar,
  Edit,
  Save,
  X,
  Check,
  Upload,
  Image as ImageIcon,
  Tag,
  Globe,
  Lock,
  Unlock,
  Star,
  DollarSign,
  Settings,
  AlertCircle,
  Info
} from 'lucide-react';

import { NovelData, EpisodeData, StoryMapData } from '../../page';

// Interface สำหรับ Summary Tab Props
interface SummaryTabProps {
  novel: NovelData;
  episodes: EpisodeData[];
  storyMap: StoryMapData | null;
  characters: any[];
  scenes: any[];
  userMedia: any[];
  officialMedia: any[];
  editorState: any;
  updateEditorState: (updates: any) => void;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

// Interface สำหรับ Novel Form
interface NovelForm {
  title: string;
  synopsis: string;
  coverImageUrl: string;
  status: string;
  accessLevel: string;
  isCompleted: boolean;
  tags: string[];
  customTags: string[];
}

const SummaryTab: React.FC<SummaryTabProps> = ({
  novel,
  episodes,
  storyMap,
  characters,
  scenes,
  userMedia,
  officialMedia,
  editorState,
  updateEditorState,
  isMobile,
  isTablet,
  isDesktop
}) => {
  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [novelForm, setNovelForm] = useState<NovelForm>({
    title: novel.title || '',
    synopsis: novel.synopsis || '',
    coverImageUrl: novel.coverImageUrl || '',
    status: novel.status || 'draft',
    accessLevel: novel.accessLevel || 'public',
    isCompleted: novel.isCompleted || false,
    tags: novel.themeAssignment?.moodAndTone?.map((tag: any) => tag.name) || [],
    customTags: novel.themeAssignment?.customTags || []
  });

  // Statistics (จากข้อมูล Novel.stats)
  const statistics = useMemo(() => {
    const stats = novel.stats || {};
    return {
      views: stats.viewsCount || 0,
      likes: stats.likesCount || 0,
      comments: stats.commentsCount || 0,
      bookmarks: stats.bookmarksCount || 0,
      followers: stats.followersCount || 0,
      averageRating: stats.averageRating || 0,
      totalWords: stats.totalWords || 0,
      estimatedReadingTime: stats.estimatedReadingTimeMinutes || 0
    };
  }, [novel.stats]);

  // Recent Activity (จากข้อมูล Episodes)
  const recentActivity = useMemo(() => {
    return episodes
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
      .map(episode => ({
        id: episode._id,
        title: episode.title,
        action: 'อัปเดต',
        timestamp: new Date(episode.updatedAt),
        status: episode.status
      }));
  }, [episodes]);

  // Form Handlers
  const handleFormChange = useCallback((field: keyof NovelForm, value: any) => {
    setNovelForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      const response = await fetch(`/api/novels/${novel.slug}/metadata`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: novelForm.title,
          synopsis: novelForm.synopsis,
          coverImageUrl: novelForm.coverImageUrl,
          status: novelForm.status,
          accessLevel: novelForm.accessLevel,
          isCompleted: novelForm.isCompleted,
          themeAssignment: {
            customTags: novelForm.customTags
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Novel metadata updated successfully:', result.data);
        updateEditorState({ hasUnsavedChanges: false });
        setIsEditing(false);
      } else {
        const error = await response.text();
        console.error('Failed to save novel metadata:', error);
      }
    } catch (error) {
      console.error('Error saving novel metadata:', error);
    }
  }, [novelForm, novel.slug, updateEditorState]);

  const handleCancel = useCallback(() => {
    setNovelForm({
      title: novel.title || '',
      synopsis: novel.synopsis || '',
      coverImageUrl: novel.coverImageUrl || '',
      status: novel.status || 'draft',
      accessLevel: novel.accessLevel || 'public',
      isCompleted: novel.isCompleted || false,
      tags: novel.themeAssignment?.moodAndTone?.map((tag: any) => tag.name) || [],
      customTags: novel.themeAssignment?.customTags || []
    });
    setIsEditing(false);
  }, [novel]);

  const handlePublish = useCallback(async () => {
    try {
      const response = await fetch(`/api/novels/${novel.slug}/metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'publish'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Novel published successfully:', result.message);
        setNovelForm(prev => ({ ...prev, status: 'published' }));
        updateEditorState({ hasUnsavedChanges: false });
      } else {
        const error = await response.text();
        console.error('Failed to publish novel:', error);
      }
    } catch (error) {
      console.error('Error publishing novel:', error);
    }
  }, [novel.slug, updateEditorState]);

  // Status Options
  const statusOptions = [
    { value: 'draft', label: 'แบบร่าง', color: 'text-yellow-600', bg: 'bg-yellow-100' },
    { value: 'published', label: 'เผยแพร่แล้ว', color: 'text-green-600', bg: 'bg-green-100' },
    { value: 'scheduled', label: 'กำหนดเผยแพร่', color: 'text-blue-600', bg: 'bg-blue-100' },
    { value: 'unpublished', label: 'ยกเลิกเผยแพร่', color: 'text-gray-600', bg: 'bg-gray-100' },
    { value: 'completed', label: 'จบแล้ว', color: 'text-purple-600', bg: 'bg-purple-100' }
  ];

  const accessLevelOptions = [
    { value: 'public', label: 'สาธารณะ', icon: Globe },
    { value: 'unlisted', label: 'ไม่แสดงในรายการ', icon: Eye },
    { value: 'private', label: 'ส่วนตัว', icon: Lock },
    { value: 'followers_only', label: 'ผู้ติดตามเท่านั้น', icon: Users },
    { value: 'premium_only', label: 'สมาชิกพรีเมียมเท่านั้น', icon: Star }
  ];

  // Render Statistics Cards
  const renderStatisticsCards = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
      <motion.div
        className="bg-card border border-border rounded-lg p-4"
        whileHover={{ scale: 1.02 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">ยอดเข้าชม</p>
            <p className="text-2xl font-bold text-foreground">{statistics.views.toLocaleString()}</p>
          </div>
          <Eye className="w-8 h-8 text-blue-500" />
        </div>
        <div className="flex items-center mt-2 text-xs">
          <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
          <span className="text-green-600">+12% จากเดือนที่แล้ว</span>
        </div>
      </motion.div>

      <motion.div
        className="bg-card border border-border rounded-lg p-4"
        whileHover={{ scale: 1.02 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">ไลค์</p>
            <p className="text-2xl font-bold text-foreground">{statistics.likes.toLocaleString()}</p>
          </div>
          <Heart className="w-8 h-8 text-red-500" />
        </div>
        <div className="flex items-center mt-2 text-xs">
          <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
          <span className="text-green-600">+8% จากเดือนที่แล้ว</span>
        </div>
      </motion.div>

      <motion.div
        className="bg-card border border-border rounded-lg p-4"
        whileHover={{ scale: 1.02 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">ความคิดเห็น</p>
            <p className="text-2xl font-bold text-foreground">{statistics.comments.toLocaleString()}</p>
          </div>
          <MessageSquare className="w-8 h-8 text-green-500" />
        </div>
        <div className="flex items-center mt-2 text-xs">
          <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
          <span className="text-green-600">+15% จากเดือนที่แล้ว</span>
        </div>
      </motion.div>

      <motion.div
        className="bg-card border border-border rounded-lg p-4"
        whileHover={{ scale: 1.02 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">ผู้ติดตาม</p>
            <p className="text-2xl font-bold text-foreground">{statistics.followers.toLocaleString()}</p>
          </div>
          <Users className="w-8 h-8 text-purple-500" />
        </div>
        <div className="flex items-center mt-2 text-xs">
          <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
          <span className="text-green-600">+5% จากเดือนที่แล้ว</span>
        </div>
      </motion.div>
    </div>
  );

  // Render Novel Information Form
  const renderNovelForm = () => (
    <div className="bg-card border border-border rounded-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">ข้อมูลนิยาย</h3>
        <div className="flex items-center space-x-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Edit className="w-4 h-4 mr-2" />
              แก้ไข
            </button>
          ) : (
            <>
              <button
                onClick={handleCancel}
                className="flex items-center px-3 py-2 text-sm bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                <X className="w-4 h-4 mr-2" />
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                className="flex items-center px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                บันทึก
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cover Image */}
        <div className="space-y-4">
          <label className="text-sm font-medium text-foreground">ปกนิยาย</label>
          <div className="aspect-[3/4] bg-muted rounded-lg border-2 border-dashed border-border flex items-center justify-center relative overflow-hidden">
            {novelForm.coverImageUrl ? (
              <img
                src={novelForm.coverImageUrl}
                alt="Novel Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center">
                <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">ไม่มีปก</p>
              </div>
            )}
            {isEditing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <button className="px-3 py-2 bg-white text-black rounded-lg text-sm font-medium">
                  <Upload className="w-4 h-4 mr-2 inline" />
                  อัปโหลดปก
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Novel Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Title */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">ชื่อเรื่อง</label>
            {isEditing ? (
              <input
                type="text"
                value={novelForm.title}
                onChange={(e) => handleFormChange('title', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="ใส่ชื่อเรื่อง"
              />
            ) : (
              <p className="text-foreground">{novelForm.title || 'ไม่มีชื่อเรื่อง'}</p>
            )}
          </div>

          {/* Synopsis */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">เรื่องย่อ</label>
            {isEditing ? (
              <textarea
                value={novelForm.synopsis}
                onChange={(e) => handleFormChange('synopsis', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="เขียนเรื่องย่อ"
              />
            ) : (
              <p className="text-muted-foreground">{novelForm.synopsis || 'ไม่มีเรื่องย่อ'}</p>
            )}
          </div>

          {/* Status and Access Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">สถานะ</label>
              {isEditing ? (
                <select
                  value={novelForm.status}
                  onChange={(e) => handleFormChange('status', e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center">
                  {(() => {
                    const status = statusOptions.find(s => s.value === novelForm.status);
                    return status ? (
                      <span className={`px-2 py-1 text-xs rounded-full ${status.bg} ${status.color}`}>
                        {status.label}
                      </span>
                    ) : null;
                  })()}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">ระดับการเข้าถึง</label>
              {isEditing ? (
                <select
                  value={novelForm.accessLevel}
                  onChange={(e) => handleFormChange('accessLevel', e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {accessLevelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center">
                  {(() => {
                    const access = accessLevelOptions.find(a => a.value === novelForm.accessLevel);
                    if (!access) return null;
                    const Icon = access.icon;
                    return (
                      <div className="flex items-center">
                        <Icon className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="text-sm text-foreground">{access.label}</span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Completion Status */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-foreground">สถานะการเขียน</label>
            {isEditing ? (
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={novelForm.isCompleted}
                  onChange={(e) => handleFormChange('isCompleted', e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  novelForm.isCompleted 
                    ? 'bg-primary border-primary' 
                    : 'border-border'
                }`}>
                  {novelForm.isCompleted && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="ml-2 text-sm text-foreground">เขียนจบแล้ว</span>
              </label>
            ) : (
              <span className={`px-2 py-1 text-xs rounded-full ${
                novelForm.isCompleted 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-yellow-100 text-yellow-600'
              }`}>
                {novelForm.isCompleted ? 'เขียนจบแล้ว' : 'กำลังเขียน'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Render Content Overview
  const renderContentOverview = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      {/* Episodes Overview */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">ตอนทั้งหมด</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">ตอนทั้งหมด</span>
            <span className="text-sm font-medium text-foreground">{episodes.length} ตอน</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">ตอนที่เผยแพร่</span>
            <span className="text-sm font-medium text-foreground">
              {episodes.filter(ep => ep.status === 'published').length} ตอน
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">ตอนแบบร่าง</span>
            <span className="text-sm font-medium text-foreground">
              {episodes.filter(ep => ep.status === 'draft').length} ตอน
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">จำนวนคำรวม</span>
            <span className="text-sm font-medium text-foreground">{statistics.totalWords.toLocaleString()} คำ</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">เวลาอ่านประมาณ</span>
            <span className="text-sm font-medium text-foreground">{statistics.estimatedReadingTime} นาที</span>
          </div>
        </div>
      </div>

      {/* Story Map Overview */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">โครงเรื่อง</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">จำนวน Node</span>
            <span className="text-sm font-medium text-foreground">{storyMap?.nodes?.length || 0} Node</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">จำนวน Connection</span>
            <span className="text-sm font-medium text-foreground">{storyMap?.edges?.length || 0} เส้นเชื่อม</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">ฉากทั้งหมด</span>
            <span className="text-sm font-medium text-foreground">{scenes.length} ฉาก</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">ตัวละคร</span>
            <span className="text-sm font-medium text-foreground">{characters.length} ตัว</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">เวอร์ชัน StoryMap</span>
            <span className="text-sm font-medium text-foreground">v{storyMap?.version || 1}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Recent Activity
  const renderRecentActivity = () => (
    <div className="bg-card border border-border rounded-lg p-6 mb-8">
      <h3 className="text-lg font-semibold text-foreground mb-4">กิจกรรมล่าสุด</h3>
      <div className="space-y-3">
        {recentActivity.length > 0 ? (
          recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <Edit className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{activity.action} "{activity.title}"</p>
                  <p className="text-xs text-muted-foreground">{activity.timestamp.toLocaleDateString('th-TH')}</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                activity.status === 'published' ? 'bg-green-100 text-green-600' :
                activity.status === 'draft' ? 'bg-yellow-100 text-yellow-600' :
                'bg-gray-100 text-gray-600'
              }`}>
                {activity.status}
              </span>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">ยังไม่มีกิจกรรม</p>
          </div>
        )}
      </div>
    </div>
  );

  // Render Publishing Controls
  const renderPublishingControls = () => (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">การเผยแพร่</h3>
      
      {novelForm.status === 'draft' && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">พร้อมเผยแพร่หรือยัง?</h4>
              <p className="text-xs text-yellow-700 mt-1">
                ตรวจสอบข้อมูลนิยาย ปก และเนื้อหาให้ครบถ้วนก่อนเผยแพร่
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={handlePublish}
          disabled={novelForm.status === 'published'}
          className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Globe className="w-5 h-5 mr-2" />
          {novelForm.status === 'published' ? 'เผยแพร่แล้ว' : 'เผยแพร่นิยาย'}
        </button>
        
        <button
          disabled={novelForm.status !== 'published'}
          className="flex items-center justify-center px-4 py-3 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 disabled:cursor-not-allowed transition-colors"
        >
          <Lock className="w-5 h-5 mr-2" />
          ยกเลิกเผยแพร่
        </button>
      </div>

      {/* Publication Info */}
      {novel.publishedAt && (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="w-4 h-4 mr-2" />
            เผยแพร่เมื่อ: {new Date(novel.publishedAt).toLocaleDateString('th-TH')}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="container-custom py-6 space-y-8">
        {/* Statistics Cards */}
        {renderStatisticsCards()}

        {/* Novel Information Form */}
        {renderNovelForm()}

        {/* Content Overview */}
        {renderContentOverview()}

        {/* Recent Activity */}
        {renderRecentActivity()}

        {/* Publishing Controls */}
        {renderPublishingControls()}
      </div>
    </div>
  );
};

export default SummaryTab;
