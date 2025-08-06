// app/novels/[slug]/overview/components/WorkspaceHeader.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  Save, 
  Settings, 
  Share2, 
  Download, 
  Eye, 
  HelpCircle,
  Menu
} from 'lucide-react';

import { useWorkspace } from './WorkspaceContext';

/**
 * @interface WorkspaceHeaderProps
 * @description Props สำหรับ WorkspaceHeader
 */
interface WorkspaceHeaderProps {
  novel: any;
}

/**
 * @function WorkspaceHeader
 * @description Header แบบย่อสำหรับ Workspace
 */
export default function WorkspaceHeader({ novel }: WorkspaceHeaderProps) {
  const router = useRouter();
  const { saveStoryMap, isSaving, toggleSidebar } = useWorkspace();
  
  // ฟังก์ชันแชร์นิยาย
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: novel.title,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('คัดลอก URL แล้ว');
    }
  };
  
  // ฟังก์ชันดาวน์โหลดข้อมูลนิยาย
  const handleDownload = () => {
    // ฟังก์ชันดาวน์โหลดข้อมูลนิยาย
    console.log('ดาวน์โหลดข้อมูลนิยาย');
  };
  
  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-14 border-b border-border bg-card text-card-foreground flex items-center justify-between px-4 sm:px-6 shadow-sm"
    >
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors flex-shrink-0"
          title="เมนู"
        >
          <Menu className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => router.push('/dashboard')}
          className="p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors flex-shrink-0"
          title="กลับไปหน้า Dashboard"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        <div className="border-l border-border pl-2 sm:pl-4 min-w-0 flex-1">
          <h1 className="text-sm sm:text-lg font-semibold text-foreground truncate">
            {novel.title}
          </h1>
        </div>
      </div>
      
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <button
          onClick={() => router.push(`/novels/${novel.slug}/preview`)}
          className="p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
          title="ดูตัวอย่าง"
        >
          <Eye className="w-4 h-4" />
        </button>
        
        <button
          onClick={handleShare}
          className="p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors hidden sm:inline-flex"
          title="แชร์"
        >
          <Share2 className="w-4 h-4" />
        </button>
        
        <button
          onClick={handleDownload}
          className="p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors hidden md:inline-flex"
          title="ดาวน์โหลด"
        >
          <Download className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => router.push(`/novels/${novel.slug}/settings`)}
          className="p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors hidden md:inline-flex"
          title="ตั้งค่า"
        >
          <Settings className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => router.push('/help/workspace')}
          className="p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors hidden lg:inline-flex"
          title="วิธีใช้"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
        
        <button
          onClick={saveStoryMap}
          disabled={isSaving}
          className="px-2 sm:px-3 py-1.5 bg-primary text-primary-foreground rounded-lg flex items-center gap-1 sm:gap-2 text-xs sm:text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors"
          title="บันทึก"
        >
          <Save className="w-4 h-4" />
          <span className="font-medium hidden sm:inline">
            {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
          </span>
        </button>
      </div>
    </motion.div>
  );
}

