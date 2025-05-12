// src/components/search/ErrorStates.tsx
'use client';

import { motion } from 'framer-motion';
import { SearchX, Loader2, AlertCircle, WifiOff } from 'lucide-react';

// สำหรับแสดงสถานะไม่พบผลลัพธ์
export const NoResultsFound = ({ searchTerm }: { searchTerm?: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
        <SearchX className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">ไม่พบผลการค้นหา</h3>
      {searchTerm ? (
        <p className="text-muted-foreground max-w-md">
          ไม่พบนิยายที่ตรงกับ "{searchTerm}" กรุณาลองคำค้นหาอื่น
          หรือปรับตัวกรองของคุณ
        </p>
      ) : (
        <p className="text-muted-foreground max-w-md">
          ไม่พบนิยายที่ตรงกับตัวกรองที่คุณเลือก กรุณาลองปรับตัวกรองใหม่
        </p>
      )}
    </motion.div>
  );
};

// สำหรับแสดงสถานะกำลังโหลด
export const LoadingState = ({ message = 'กำลังโหลดนิยาย...' }: { message?: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-12 px-4"
    >
      <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
      <p className="text-muted-foreground">{message}</p>
    </motion.div>
  );
};

// สำหรับแสดงข้อผิดพลาด
export const ErrorState = ({ 
  message = 'เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง',
  retry
}: { 
  message?: string,
  retry?: () => void 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-alert-error flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-alert-error-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">เกิดข้อผิดพลาด</h3>
      <p className="text-muted-foreground max-w-md mb-4">{message}</p>
      
      {retry && (
        <button
          onClick={retry}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          ลองอีกครั้ง
        </button>
      )}
    </motion.div>
  );
};

// สำหรับแสดงสถานะไม่มีการเชื่อมต่อ
export const OfflineState = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
        <WifiOff className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">ไม่มีการเชื่อมต่ออินเทอร์เน็ต</h3>
      <p className="text-muted-foreground max-w-md">
        กรุณาตรวจสอบการเชื่อมต่อของคุณและลองใหม่อีกครั้ง
      </p>
    </motion.div>
  );
};