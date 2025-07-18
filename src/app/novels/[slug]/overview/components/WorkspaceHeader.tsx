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
      className="h-14 border-b border-border bg-card flex items-center justify-between px-4"
    >
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-full hover:bg-accent"
          title="เมนู"
        >
          <Menu className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => router.push('/dashboard')}
          className="p-2 rounded-full hover:bg-accent"
          title="กลับไปหน้า Dashboard"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        <h1 className="text-lg font-semibold text-foreground hidden sm:block">
          {novel.title}
        </h1>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push(`/novels/${novel.slug}/preview`)}
          className="p-2 rounded-full hover:bg-accent hidden sm:flex"
          title="ดูตัวอย่าง"
        >
          <Eye className="w-4 h-4" />
        </button>
        
        <button
          onClick={handleShare}
          className="p-2 rounded-full hover:bg-accent hidden sm:flex"
          title="แชร์"
        >
          <Share2 className="w-4 h-4" />
        </button>
        
        <button
          onClick={handleDownload}
          className="p-2 rounded-full hover:bg-accent hidden sm:flex"
          title="ดาวน์โหลด"
        >
          <Download className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => router.push(`/novels/${novel.slug}/settings`)}
          className="p-2 rounded-full hover:bg-accent"
          title="ตั้งค่า"
        >
          <Settings className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => router.push('/help/workspace')}
          className="p-2 rounded-full hover:bg-accent hidden sm:flex"
          title="วิธีใช้"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
        
        <button
          onClick={saveStoryMap}
          disabled={isSaving}
          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg flex items-center gap-2 text-sm disabled:opacity-50 hover:bg-primary-hover transition-colors"
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

