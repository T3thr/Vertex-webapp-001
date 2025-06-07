// app/novels/[slug]/overview/components/QuickActions.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Edit3, 
  Settings, 
  BarChart3, 
  Share2, 
  Download,
  Eye,
  BookOpen,
  Map
} from 'lucide-react';

interface QuickActionsProps {
  novelId: string;
  currentView: string;
}

/**
 * QuickActions - คอมโพเนนต์สำหรับการดำเนินการด่วน
 * รวมปุ่มต่างๆ สำหรับจัดการนิยาย
 */
export default function QuickActions({ novelId, currentView }: QuickActionsProps) {
  const router = useRouter();

  // ฟังก์ชันสำหรับเปลี่ยนมุมมอง
  const handleViewChange = (view: string) => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('view', view);
    router.push(currentUrl.toString());
  };

  // รายการปุ่มมุมมอง
  const viewOptions = [
    {
      key: 'flow',
      label: 'แผนผังเรื่อง',
      icon: Map,
      description: 'จัดการโครงสร้างและเส้นทางของเรื่อง'
    },
    {
      key: 'episodes',
      label: 'จัดการตอน',
      icon: BookOpen,
      description: 'สร้าง แก้ไข และจัดการตอนต่างๆ'
    },
    {
      key: 'analytics',
      label: 'การวิเคราะห์',
      icon: BarChart3,
      description: 'ดูสถิติและรายงานผลงาน'
    }
  ];

  // รายการปุ่มการดำเนินการ
  const actionButtons = [
    {
      label: 'เพิ่มตอนใหม่',
      icon: Plus,
      onClick: () => router.push(`/novels/${novelId}/episodes/new`),
      color: 'bg-primary hover:bg-primary-hover text-primary-foreground',
      description: 'สร้างตอนใหม่สำหรับนิยาย'
    },
    {
      label: 'แก้ไขข้อมูลนิยาย',
      icon: Edit3,
      onClick: () => router.push(`/novels/${novelId}/edit`),
      color: 'bg-accent hover:bg-accent/80 text-accent-foreground',
      description: 'แก้ไขชื่อ เรื่องย่อ และข้อมูลอื่นๆ'
    },
    {
      label: 'ตั้งค่าขั้นสูง',
      icon: Settings,
      onClick: () => router.push(`/novels/${novelId}/settings`),
      color: 'bg-secondary hover:bg-secondary/80 text-secondary-foreground',
      description: 'จัดการการตั้งค่าละเอียด'
    },
    {
      label: 'แชร์',
      icon: Share2,
      onClick: () => {
        // ฟังก์ชันแชร์
        if (navigator.share) {
          navigator.share({
            title: 'นิยายของฉัน',
            url: window.location.href
          });
        } else {
          navigator.clipboard.writeText(window.location.href);
          // แสดงการแจ้งเตือนว่าคัดลอกแล้ว
        }
      },
      color: 'bg-blue-500 hover:bg-blue-600 text-white',
      description: 'แชร์นิยายให้เพื่อนๆ'
    },
    {
      label: 'ดาวน์โหลด',
      icon: Download,
      onClick: () => {
        // ฟังก์ชันดาวน์โหลด
        console.log('ดาวน์โหลดข้อมูลนิยาย');
      },
      color: 'bg-green-500 hover:bg-green-600 text-white',
      description: 'ดาวน์โหลดไฟล์สำรอง'
    },
    {
      label: 'ดูตัวอย่าง',
      icon: Eye,
      onClick: () => router.push(`/novels/${novelId}/preview`),
      color: 'bg-purple-500 hover:bg-purple-600 text-white',
      description: 'ดูนิยายในมุมมองผู้อ่าน'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="space-y-6"
    >
      {/* แท็บเปลี่ยนมุมมอง */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          เปลี่ยนมุมมอง
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {viewOptions.map((option, index) => (
            <motion.button
              key={option.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleViewChange(option.key)}
              className={`
                p-4 rounded-lg text-left transition-all duration-200
                ${currentView === option.key 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                }
              `}
            >
              <div className="flex items-center gap-3 mb-2">
                <option.icon className="w-5 h-5" />
                <span className="font-medium">{option.label}</span>
              </div>
              <p className="text-xs opacity-80 leading-relaxed">
                {option.description}
              </p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ปุ่มการดำเนินการด่วน */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          การดำเนินการด่วน
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {actionButtons.map((button, index) => (
            <motion.button
              key={button.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              whileHover={{ 
                scale: 1.05,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.95 }}
              onClick={button.onClick}
              className={`
                p-4 rounded-lg text-center transition-all duration-200 group
                ${button.color}
                hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
              `}
              title={button.description}
            >
              <div className="flex flex-col items-center gap-2">
                <button.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium leading-tight">
                  {button.label}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ข้อมูลเพิ่มเติม */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="bg-gradient-to-r from-accent/20 to-primary/20 border border-border rounded-lg p-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-foreground mb-1">
              เคล็ดลับการใช้งาน
            </h4>
            <p className="text-xs text-muted-foreground">
              คลิกที่แผนผังเรื่องเพื่อเริ่มสร้างโครงสร้างนิยายของคุณ
            </p>
          </div>
          <div className="text-2xl">💡</div>
        </div>
      </motion.div>
    </motion.div>
  );
}