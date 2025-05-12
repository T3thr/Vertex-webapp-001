// src/components/novels/NovelReviewsTab.tsx
// Placeholder Component สำหรับ Tab รีวิว
import React from 'react';

interface NovelReviewsTabProps {
  novelId: string; // อาจจะใช้ ID ในการ fetch รีวิว
}

export function NovelReviewsTab({ novelId }: NovelReviewsTabProps) {
  // ในอนาคต:
  // 1. Fetch ข้อมูลรีวิว/ความคิดเห็นสำหรับ novelId นี้
  // 2. แสดงรายการรีวิว
  // 3. อาจจะมีฟอร์มสำหรับเขียนรีวิวใหม่

  return (
    <div className="py-10 text-center text-muted-foreground">
      <p>(ส่วนแสดงรีวิวและคอมเมนต์จะถูกพัฒนาในภายหลัง)</p>
      {/* ตัวอย่าง: แสดง ID นิยายเพื่อทดสอบ */}
      {/* <p className="text-xs mt-4">Novel ID: {novelId}</p> */}
    </div>
  );
}