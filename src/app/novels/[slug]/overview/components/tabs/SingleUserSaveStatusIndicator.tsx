// src/app/novels/[slug]/overview/components/tabs/SingleUserSaveStatusIndicator.tsx
// ===================================================================
// Single User Save Status Indicator - ระบบแสดงสถานะการบันทึกสำหรับโหมดผู้ใช้คนเดียว
// ===================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  Loader2, 
  X, 
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';
import { SingleUserState } from './SingleUserEventManager';

// ===================================================================
// SECTION: Type Definitions & Props
// ===================================================================

// ConnectionStatus Component เพื่อป้องกัน hydration mismatch
const ConnectionStatus = ({ size }: { size: string }) => {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  
  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  if (isOnline === null) {
    return null; // หรือแสดง placeholder
  }
  
  return (
    <div className={`${isOnline ? 'text-green-500' : 'text-red-500'}`}>
      {isOnline ? <Wifi className={size} /> : <WifiOff className={size} />}
    </div>
  );
};

interface SingleUserSaveStatusIndicatorProps {
  saveState: SingleUserState;
  className?: string;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

interface StatusConfig {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  text: string;
  description?: string;
}

// ===================================================================
// SECTION: Main Component
// ===================================================================

export default function SingleUserSaveStatusIndicator({ 
  saveState, 
  className = '',
  showDetails = true,
  size = 'md'
}: SingleUserSaveStatusIndicatorProps) {
  
  // ฟังก์ชันสำหรับแปลงเวลาให้อ่านง่าย
  const formatRelativeTime = React.useCallback((date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'เมื่อสักครู่';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} นาทีที่แล้ว`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} ชั่วโมงที่แล้ว`;
    } else {
      return date.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }, []);
  
  // ใช้ useMemo เพื่อป้องกันการคำนวณซ้ำที่ไม่จำเป็น
  const config = React.useMemo((): StatusConfig & { statusKey: string } => {
    const { isSaving, lastSaved, lastError, pendingCommands, isDirty, hasUnsavedChanges } = saveState;
    
    let status: string;
    if (isSaving) {
      status = 'saving';
    } else if (lastError) {
      status = 'error';
    } else if (isDirty || hasUnsavedChanges) {
      status = 'dirty';
    } else if (lastSaved) {
      status = 'saved';
    } else {
      status = 'ready';
    }

    // สร้าง stable key สำหรับแต่ละสถานะ (ไม่ใช้ random เพื่อป้องกัน excessive re-renders)
    const statusKey = `${status}-${isSaving ? 'saving' : ''}${lastError ? '-error' : ''}${isDirty || hasUnsavedChanges ? '-dirty' : ''}${lastSaved ? '-saved' : ''}`;
    
    switch (status) {
      case 'saving':
        return {
          statusKey,
          icon: <Loader2 className="animate-spin" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          text: '💾 กำลังบันทึกข้อมูล...',
          description: pendingCommands > 0 
            ? `กำลังประมวลผลและบันทึก ${pendingCommands} การเปลี่ยนแปลง`
            : 'กำลังบันทึกการเปลี่ยนแปลงของคุณไปยังเซิร์ฟเวอร์'
        };
      
      case 'dirty':
        return {
          statusKey,
          icon: <Clock className="text-orange-500" />,
          color: 'text-orange-600 font-semibold',
          bgColor: 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200',
          text: '🔄 มีการเปลี่ยนแปลง',
          description: 'มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก กดปุ่ม "บันทึก" เพื่อบันทึกข้อมูล'
        };
      
      case 'saved':
        if (lastSaved) {
          return {
            statusKey,
            icon: <Check className="text-green-500" />,
            color: 'text-green-600 font-semibold',
            bgColor: 'bg-green-50 dark:bg-green-900/20 border border-green-200',
            text: '✅ บันทึกเรียบร้อย',
            description: `การเปลี่ยนแปลงทั้งหมดได้รับการบันทึกแล้ว (${formatRelativeTime(lastSaved)})`
          };
        } else {
          return {
            statusKey,
            icon: <Clock className="text-gray-400" />,
            color: 'text-gray-600',
            bgColor: 'bg-gray-50 dark:bg-gray-900/20 border border-gray-200',
            text: '⏳ พร้อมใช้งาน',
            description: 'ระบบพร้อมใช้งาน ยังไม่มีการเปลี่ยนแปลงที่ต้องบันทึก'
          };
        }
        
      case 'ready':
        return {
          statusKey,
          icon: <Clock className="text-gray-400" />,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20 border border-gray-200',
          text: '⏳ พร้อมใช้งาน',
          description: 'ระบบพร้อมใช้งาน ยังไม่มีการเปลี่ยนแปลงใดๆ'
        };
      
      case 'error':
        return {
          statusKey,
          icon: <X className="text-red-500" />,
          color: 'text-red-600 font-semibold',
          bgColor: 'bg-red-50 dark:bg-red-900/20 border border-red-200',
          text: '❌ เกิดข้อผิดพลาด',
          description: lastError 
            ? `เกิดข้อผิดพลาด: ${lastError} - กรุณาลองใหม่หรือตรวจสอบการเชื่อมต่ออินเทอร์เน็ต`
            : 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง'
        };
      
      default:
        return {
          statusKey,
          icon: <Clock />,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          text: '❓ สถานะไม่ชัดเจน',
          description: 'ไม่สามารถระบุสถานะการบันทึกได้ กรุณารีเฟรชหน้าเว็บ'
        };
    }
  }, [saveState, formatRelativeTime]); // dependency array สำหรับ useMemo
  
  // Size configurations
  const sizeClasses = {
    sm: {
      container: 'px-2 py-1 text-xs',
      icon: 'h-3 w-3',
      text: 'text-xs',
      gap: 'gap-1'
    },
    md: {
      container: 'px-3 py-2 text-sm',
      icon: 'h-4 w-4',
      text: 'text-sm',
      gap: 'gap-2'
    },
    lg: {
      container: 'px-4 py-3 text-base',
      icon: 'h-5 w-5',
      text: 'text-base',
      gap: 'gap-3'
    }
  };

  const currentSize = sizeClasses[size];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        inline-flex items-center ${currentSize.gap} ${currentSize.container}
        rounded-full border transition-all duration-200
        ${config.bgColor} ${config.color}
        ${className}
      `}
      title={config.description}
    >
      {/* Status Icon */}
      <motion.div
        key={`icon-${config.statusKey}`} // ใช้ unique key
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className={currentSize.icon}
      >
        {React.cloneElement(config.icon as React.ReactElement, {
          className: currentSize.icon
        } as React.HTMLAttributes<SVGElement>)}
      </motion.div>

      {/* Status Text */}
      {showDetails && (
        <motion.span
          key={`text-${config.statusKey}`} // ใช้ unique key
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`font-medium ${currentSize.text} whitespace-nowrap`}
        >
          {config.text}
        </motion.span>
      )}

      {/* Connection Status (only for larger sizes) */}
      {size === 'lg' && (
        <div className="ml-2 opacity-60">
          <ConnectionStatus size={currentSize.icon} />
        </div>
      )}
    </motion.div>
  );
}

// ===================================================================
// SECTION: Utility Functions
// ===================================================================

