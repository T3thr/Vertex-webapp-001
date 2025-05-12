// src/components/novels/TagBadge.tsx
// Component สำหรับแสดง Tag หรือ Category Badge
import Link from 'next/link';
import React from 'react';
import { Tag, Layers } from 'lucide-react'; // ใช้ไอคอน Tag และ Layers (สำหรับ category)

interface TagBadgeProps {
  text: string;
  type: 'tag' | 'category' | 'feature'; // เพิ่ม type 'feature' สำหรับองค์ประกอบเกม
  slug?: string; // สำหรับ category link
  variant?: 'primary' | 'secondary'; // สำหรับสี (optional)
}

export function TagBadge({ text, type, slug, variant = 'primary' }: TagBadgeProps) {
  const isLink = type === 'category' && slug;

  const baseClasses = "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full border transition-colors duration-150";

  // กำหนดสีตาม variant และ type
  const colorClasses = variant === 'primary'
    ? (type === 'category'
        ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
        : type === 'tag'
        ? "bg-secondary border-border text-secondary-foreground hover:bg-secondary/80"
        : "bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300") // สีสำหรับ feature
    : "bg-muted/50 border-muted/30 text-muted-foreground hover:bg-muted/70"; // secondary variant

  const icon = type === 'category'
    ? <Layers className="w-3 h-3" />
    : type === 'tag'
    ? <Tag className="w-3 h-3" />
    : null; // ไม่มีไอคอนสำหรับ feature หรืออื่นๆ (ปรับได้)

  const content = (
     <>
       {icon}
       <span>{text}</span>
     </>
  );

  if (isLink) {
    return (
      <Link href={`/category/${slug}`} className={`${baseClasses} ${colorClasses}`}>
        {content}
      </Link>
    );
  }

  return (
    <span className={`${baseClasses} ${colorClasses}`}>
       {content}
    </span>
  );
}