// src/components/novels/TagBadge.tsx
// Component สำหรับแสดง Tag หรือ Category Badge
// รองรับหลายขนาดและรูปแบบ พร้อมสีที่กำหนดเอง

"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Tag, AlertTriangle, Shield, Star } from 'lucide-react';

// ===================================================================
// SECTION: TypeScript Interfaces
// ===================================================================

interface CategoryData {
  _id: string;
  name: string;
  slug: string;
  color?: string;
}

interface TagBadgeProps {
  category: CategoryData;
  customName?: string;
  variant?: 'default' | 'mood' | 'warning' | 'age' | 'featured';
  size?: 'sm' | 'md' | 'lg';
  clickable?: boolean;
  showIcon?: boolean;
  className?: string;
}

// ===================================================================
// SECTION: Animation Variants
// ===================================================================

const badgeVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.2 }
  },
  hover: { 
    scale: 1.05,
    transition: { duration: 0.1 }
  },
  tap: { 
    scale: 0.95,
    transition: { duration: 0.1 }
  }
};

// ===================================================================
// SECTION: Helper Functions
// ===================================================================

/**
 * ฟังก์ชันสำหรับกำหนดสีเริ่มต้นตาม variant
 */
const getVariantColor = (variant: string): string => {
  switch (variant) {
    case 'mood':
      return '#8B5CF6'; // Purple
    case 'warning':
      return '#F59E0B'; // Orange
    case 'age':
      return '#EF4444'; // Red
    case 'featured':
      return '#10B981'; // Green
    default:
      return '#5495ff'; // Primary blue
  }
};

/**
 * ฟังก์ชันสำหรับกำหนดไอคอนตาม variant
 */
const getVariantIcon = (variant: string) => {
  switch (variant) {
    case 'warning':
      return <AlertTriangle className="w-3 h-3" />;
    case 'age':
      return <Shield className="w-3 h-3" />;
    case 'featured':
      return <Star className="w-3 h-3" />;
    default:
      return <Tag className="w-3 h-3" />;
  }
};

/**
 * ฟังก์ชันสำหรับกำหนดขนาดของ badge
 */
const getSizeClasses = (size: string): string => {
  switch (size) {
    case 'sm':
      return 'px-2 py-1 text-xs';
    case 'lg':
      return 'px-4 py-2 text-base';
    default:
      return 'px-3 py-1.5 text-sm';
  }
};

// ===================================================================
// SECTION: Main Component
// ===================================================================

export default function TagBadge({
  category,
  customName,
  variant = 'default',
  size = 'md',
  clickable = true,
  showIcon = true,
  className = ''
}: TagBadgeProps) {
  // ตรวจสอบข้อมูลเบื้องต้น
  if (!category) {
    return null;
  }

  // เตรียมข้อมูลที่จะแสดง
  const displayName = customName || category.name;
  const categoryColor = category.color || getVariantColor(variant);
  const icon = showIcon ? getVariantIcon(variant) : null;
  const sizeClasses = getSizeClasses(size);

  // สร้าง CSS styles สำหรับสี
  const badgeStyles = {
    backgroundColor: `${categoryColor}20`,
    borderColor: `${categoryColor}40`,
    color: categoryColor
  };

  // กำหนด classes พื้นฐาน
  const baseClasses = `
    inline-flex items-center gap-1.5 font-medium rounded-full border
    transition-all duration-200
    ${sizeClasses}
    ${className}
  `;

  // กำหนด classes สำหรับ hover effect
  const hoverClasses = clickable 
    ? 'hover:shadow-md cursor-pointer' 
    : '';

  // สร้าง badge content
  const badgeContent = (
    <motion.span
      variants={badgeVariants}
      initial="hidden"
      animate="visible"
      whileHover={clickable ? "hover" : undefined}
      whileTap={clickable ? "tap" : undefined}
      className={`${baseClasses} ${hoverClasses}`}
      style={badgeStyles}
      title={`หมวดหมู่: ${displayName}`}
    >
      {icon}
      <span className="truncate max-w-32">{displayName}</span>
    </motion.span>
  );

  // ถ้าคลิกได้ ให้ wrap ด้วย Link
  if (clickable && category.slug) {
    return (
      <Link 
        href={`/categories/${category.slug}`}
        className="inline-block"
      >
        {badgeContent}
      </Link>
    );
  }

  // ถ้าคลิกไม่ได้ ให้แสดงเป็น span ธรรมดา
  return badgeContent;
};