// src/components/novels/NovelTabs.tsx
// Component สำหรับแสดงแท็บต่างๆ ในหน้ารายละเอียดนิยาย
// ประกอบด้วย แท็บตอน, รายละเอียด, ตัวละคร, รีวิว

"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Info, 
  Users, 
  MessageSquare,
  FileText,
  Star
} from 'lucide-react';
import { PopulatedNovelForDetailPage } from '@/app/api/novels/[slug]/route';
import NovelEpisodesTab from './NovelEpisodesTab';
import NovelDetailsTab from './NovelDetailsTab';
import NovelCharactersTab from './NovelCharactersTab';
import NovelReviewsTab from './NovelReviewsTab';

// ===================================================================
// SECTION: TypeScript Interfaces
// ===================================================================

interface NovelTabsProps {
  novel: PopulatedNovelForDetailPage;
}

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

// ===================================================================
// SECTION: Animation Variants
// ===================================================================

const tabContainerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      staggerChildren: 0.1
    }
  }
};

const tabVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

const contentVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0, 
    x: -20,
    transition: { duration: 0.2 }
  }
};

// ===================================================================
// SECTION: Main Component
// ===================================================================

export default function NovelTabs({novel}: NovelTabsProps) {
  const [activeTab, setActiveTab] = useState('episodes');

  // ตรวจสอบข้อมูลเบื้องต้น
  if (!novel) {
    return (
      <div className="bg-card text-card-foreground p-8 rounded-lg">
        <div className="text-center text-muted-foreground">
          ไม่พบข้อมูลนิยาย
        </div>
      </div>
    );
  }

  // เตรียมข้อมูลแท็บ
  const tabs: TabItem[] = [
    {
      id: 'episodes',
      label: 'ตอน',
      icon: <BookOpen className="w-5 h-5" />,
      count: novel.publishedEpisodesCount || 0
    },
    {
      id: 'details',
      label: 'รายละเอียด',
      icon: <Info className="w-5 h-5" />
    },
    {
      id: 'characters',
      label: 'ตัวละคร',
      icon: <Users className="w-5 h-5" />,
      count: novel.characters?.length || 0
    },
    {
      id: 'reviews',
      label: 'รีวิว',
      icon: <MessageSquare className="w-5 h-5" />,
      count: novel.stats?.ratingsCount || 0
    }
  ];

  // ฟังก์ชันเปลี่ยนแท็บ
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  // ฟังก์ชันเรนเดอร์เนื้อหาตามแท็บ
  const renderTabContent = () => {
    switch (activeTab) {
      case 'episodes':
        return <NovelEpisodesTab novel={novel} />;
      case 'details':
        return <NovelDetailsTab novel={novel} />;
      case 'characters':
        return <NovelCharactersTab novel={novel} />;
      case 'reviews':
        return <NovelReviewsTab novel={novel} />;
      default:
        return <NovelEpisodesTab novel={novel} />;
    }
  };

  return (
    <motion.div 
      className="bg-card text-card-foreground rounded-lg overflow-hidden shadow-sm"
      variants={tabContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* แถบแท็บ */}
      <div className="border-b border-border">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`relative flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
              variants={tabVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-2 py-1 text-xs rounded-full ${
                  activeTab === tab.id
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.count > 999 ? '999+' : tab.count}
                </span>
              )}
              
              {/* เส้นบ่งบอกแท็บที่เลือก */}
              {activeTab === tab.id && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  layoutId="activeTab"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* เนื้อหาแท็บ */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="p-6"
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};