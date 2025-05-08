// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ฟังก์ชันสำหรับรวม class ของ Tailwind CSS
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ฟังก์ชันสำหรับรับค่า URL รูปภาพที่ปลอดภัย
export function getImageUrl(url?: string, fallback = "/images/default-avatar.png") {
  if (!url) return fallback;
  
  // ตรวจสอบว่าเป็น URL ที่ถูกต้องหรือไม่
  try {
    new URL(url);
    return url;
  } catch (e) {
    // ถ้าเป็นเส้นทางในเซิร์ฟเวอร์
    if (url.startsWith("/")) return url;
    return fallback;
  }
}

// ฟังก์ชันสำหรับย่อข้อความ
export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

// ฟังก์ชันสำหรับฟอร์แมตจำนวน
export function formatNumber(num: number) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

// ฟังก์ชันสำหรับระบุเวลา
export function timeAgo(date: string | Date) {
  const now = new Date();
  const pastDate = new Date(date);
  const seconds = Math.floor((now.getTime() - pastDate.getTime()) / 1000);
  
  // คำนวณช่วงเวลา
  let interval = Math.floor(seconds / 31536000); // ปี
  if (interval >= 1) {
    return `${interval} ปีที่แล้ว`;
  }
  
  interval = Math.floor(seconds / 2592000); // เดือน
  if (interval >= 1) {
    return `${interval} เดือนที่แล้ว`;
  }
  
  interval = Math.floor(seconds / 86400); // วัน
  if (interval >= 1) {
    return `${interval} วันที่แล้ว`;
  }
  
  interval = Math.floor(seconds / 3600); // ชั่วโมง
  if (interval >= 1) {
    return `${interval} ชั่วโมงที่แล้ว`;
  }
  
  interval = Math.floor(seconds / 60); // นาที
  if (interval >= 1) {
    return `${interval} นาทีที่แล้ว`;
  }
  
  return "เมื่อไม่นานมานี้";
}