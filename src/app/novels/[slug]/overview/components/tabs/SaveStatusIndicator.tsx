// src/app/novels/[slug]/overview/components/tabs/SaveStatusIndicator.tsx
// ===================================================================
// Save Status Indicator - ระบบแสดงสถานะการบันทึก
// ===================================================================
//
// คอมโพเนนต์นี้แสดงสถานะการบันทึกแบบ real-time เหมือน Canva/Premiere Pro
// พร้อมการแสดงผลที่เข้าใจง่ายและสวยงาม

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  Loader2, 
  AlertTriangle, 
  X, 
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';
import { UnifiedSaveState } from './SaveManager';

// ===================================================================
// SECTION: Type Definitions & Props
// ===================================================================

interface SaveStatusIndicatorProps {
  saveState: UnifiedSaveState;
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

export default function SaveStatusIndicator({ 
  saveState, 
  className = '',
  showDetails = true,
  size = 'md'
}: SaveStatusIndicatorProps) {
  
  const getStatusConfig = (): StatusConfig => {
    const { status, lastSaved, isSaving, pendingOperations } = saveState;
    
    switch (status) {
      case 'saving':
        return {
          icon: <Loader2 className="animate-spin" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          text: 'กำลังบันทึก...',
          description: pendingOperations.length > 0 
            ? `กำลังประมวลผล ${pendingOperations.length} การเปลี่ยนแปลง`
            : undefined
        };
      
      case 'idle':
        if (lastSaved) {
          return {
            icon: <Check />,
            color: 'text-green-600',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
            text: 'บันทึกแล้ว',
            description: typeof window !== 'undefined' 
              ? `บันทึกล่าสุด ${formatRelativeTime(lastSaved)}`
              : 'บันทึกล่าสุดเมื่อสักครู่'
          };
        } else {
          return {
            icon: <Clock />,
            color: 'text-gray-500',
            bgColor: 'bg-gray-50 dark:bg-gray-900/20',
            text: 'ยังไม่ได้บันทึก',
            description: 'ยังไม่มีการบันทึกข้อมูล'
          };
        }
      
      case 'conflict':
        return {
          icon: <AlertTriangle />,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          text: 'กำลังรวมข้อมูล',
          description: 'พบการเปลี่ยนแปลงจากผู้ใช้อื่น กำลังรวมอัตโนมัติ'
        };
      
      case 'error':
        return {
          icon: <X />,
          color: 'text-red-600',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          text: 'บันทึกไม่สำเร็จ',
          description: saveState.lastError || 'เกิดข้อผิดพลาดในการบันทึก'
        };
      
      default:
        return {
          icon: <Clock />,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          text: 'ไม่ทราบสถานะ',
          description: undefined
        };
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-2 py-1 text-xs',
          icon: 'h-3 w-3',
          text: 'text-xs'
        };
      case 'lg':
        return {
          container: 'px-4 py-3 text-base',
          icon: 'h-5 w-5',
          text: 'text-base'
        };
      default: // md
        return {
          container: 'px-3 py-2 text-sm',
          icon: 'h-4 w-4',
          text: 'text-sm'
        };
    }
  };

  const statusConfig = getStatusConfig();
  const sizeClasses = getSizeClasses();
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        inline-flex items-center space-x-2 rounded-full border
        ${statusConfig.bgColor} ${statusConfig.color}
        ${sizeClasses.container} ${className}
      `}
    >
      {/* Status Icon */}
      <div className={`${sizeClasses.icon} flex-shrink-0`}>
        {statusConfig.icon}
      </div>

      {/* Status Text */}
      <span className={`font-medium ${sizeClasses.text}`}>
        {statusConfig.text}
      </span>

      {/* Pending Operations Counter */}
      <AnimatePresence>
        {saveState.pendingOperations.length > 0 && (
          <motion.span
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="inline-flex items-center justify-center h-5 w-5 text-xs font-bold text-white bg-blue-500 rounded-full"
          >
            {saveState.pendingOperations.length}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Connection Status */}
      {navigator.onLine !== undefined && (
        <div className={`${sizeClasses.icon} flex-shrink-0 opacity-60`}>
          {navigator.onLine ? (
            <Wifi className="text-green-500" />
          ) : (
            <WifiOff className="text-red-500" />
          )}
        </div>
      )}
    </motion.div>
  );
}

// ===================================================================
// SECTION: Detailed Status Panel Component
// ===================================================================

interface DetailedStatusPanelProps {
  saveState: UnifiedSaveState;
  className?: string;
}

export function DetailedStatusPanel({ 
  saveState, 
  className = '' 
}: DetailedStatusPanelProps) {
  const statusConfig = getStatusConfig(saveState);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        p-4 rounded-lg border bg-card text-card-foreground shadow-sm
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center space-x-3 mb-3">
        <div className={`p-2 rounded-full ${statusConfig.bgColor}`}>
          <div className={`h-5 w-5 ${statusConfig.color}`}>
            {statusConfig.icon}
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-sm">สถานะการบันทึก</h3>
          <p className={`text-sm ${statusConfig.color}`}>
            {statusConfig.text}
          </p>
        </div>
      </div>

      {/* Description */}
      {statusConfig.description && (
        <p className="text-xs text-muted-foreground mb-3">
          {statusConfig.description}
        </p>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <span className="text-muted-foreground">เวอร์ชันปัจจุบัน:</span>
          <span className="ml-2 font-mono">{saveState.localVersion}</span>
        </div>
        <div>
          <span className="text-muted-foreground">รอดำเนินการ:</span>
          <span className="ml-2 font-mono">{saveState.pendingOperations.length}</span>
        </div>
        {saveState.lastSaved && (
          <div className="col-span-2">
            <span className="text-muted-foreground">บันทึกล่าสุด:</span>
            <span className="ml-2">{formatAbsoluteTime(saveState.lastSaved)}</span>
          </div>
        )}
      </div>

      {/* Error Details */}
      {saveState.status === 'error' && saveState.lastError && (
        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs">
          <strong className="text-red-700 dark:text-red-400">ข้อผิดพลาด:</strong>
          <br />
          <code className="text-red-600 dark:text-red-300">{saveState.lastError}</code>
        </div>
      )}

      {/* Pending Operations List */}
      {saveState.pendingOperations.length > 0 && (
        <div className="mt-3">
          <h4 className="text-xs font-semibold mb-2 text-muted-foreground">
            การดำเนินการที่รอคิว:
          </h4>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {saveState.pendingOperations.slice(-5).map((op) => (
              <div key={op.id} className="flex items-center justify-between text-xs">
                <span className="truncate">{getOperationDisplayName(op.type)}</span>
                <span className="text-muted-foreground ml-2">
                  {formatRelativeTime(new Date(op.timestamp))}
                </span>
              </div>
            ))}
            {saveState.pendingOperations.length > 5 && (
              <div className="text-xs text-muted-foreground text-center">
                และอีก {saveState.pendingOperations.length - 5} รายการ...
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ===================================================================
// SECTION: Helper Functions
// ===================================================================

function getStatusConfig(saveState: UnifiedSaveState): StatusConfig {
  // Same logic as in main component but extracted for reuse
  const { status, lastSaved, pendingOperations } = saveState;
  
  switch (status) {
    case 'saving':
      return {
        icon: <Loader2 className="animate-spin" />,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'กำลังบันทึก...',
        description: pendingOperations.length > 0 
          ? `กำลังประมวลผล ${pendingOperations.length} การเปลี่ยนแปลง`
          : undefined
      };
    
    case 'idle':
      if (lastSaved) {
        return {
          icon: <Check />,
          color: 'text-green-600',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          text: 'บันทึกแล้ว',
          description: `บันทึกล่าสุด ${formatRelativeTime(lastSaved)}`
        };
      } else {
        return {
          icon: <Clock />,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          text: 'ยังไม่ได้บันทึก',
          description: 'ยังไม่มีการบันทึกข้อมูล'
        };
      }
    
    case 'conflict':
      return {
        icon: <AlertTriangle />,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        text: 'กำลังรวมข้อมูล',
        description: 'พบการเปลี่ยนแปลงจากผู้ใช้อื่น กำลังรวมอัตโนมัติ'
      };
    
    case 'error':
      return {
        icon: <X />,
        color: 'text-red-600',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        text: 'บันทึกไม่สำเร็จ',
        description: saveState.lastError || 'เกิดข้อผิดพลาดในการบันทึก'
      };
    
    default:
      return {
        icon: <Clock />,
        color: 'text-gray-500',
        bgColor: 'bg-gray-50 dark:bg-gray-900/20',
        text: 'ไม่ทราบสถานะ',
        description: undefined
      };
  }
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (diffSecs < 60) {
    return `${diffSecs} วินาทีที่แล้ว`;
  } else if (diffMins < 60) {
    return `${diffMins} นาทีที่แล้ว`;
  } else if (diffHours < 24) {
    return `${diffHours} ชั่วโมงที่แล้ว`;
  } else {
    return date.toLocaleDateString('th-TH');
  }
}

function formatAbsoluteTime(date: Date): string {
  return date.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function getOperationDisplayName(type: string): string {
  const displayNames: Record<string, string> = {
    'ADD_NODE': 'เพิ่มโหนด',
    'DELETE_NODE': 'ลบโหนด',
    'UPDATE_NODE': 'แก้ไขโหนด',
    'MOVE_NODE': 'ย้ายโหนด',
    'ADD_EDGE': 'เพิ่มการเชื่อมต่อ',
    'DELETE_EDGE': 'ลบการเชื่อมต่อ',
    'UPDATE_EDGE': 'แก้ไขการเชื่อมต่อ',
    'UPDATE_CANVAS': 'อัปเดตผืนผ้าใบ',
    'BATCH_UPDATE': 'อัปเดตหลายรายการ'
  };
  
  return displayNames[type] || type;
}
