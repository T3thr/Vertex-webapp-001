"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface NovelRowNavButtonProps {
  direction: 'left' | 'right';
  targetId: string;
}

export function NovelRowNavButton({ direction, targetId }: NovelRowNavButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null);

  const scrollAmount = 3 * 170; // เลื่อน 3 การ์ด (~170px ต่อการ์ด)

  // ✅ ฟังก์ชันตรวจสอบตำแหน่ง scroll และการมองเห็นของปุ่ม
  const updateButtonVisibility = useCallback(() => {
    if (!scrollContainer) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
    const maxScrollLeft = scrollWidth - clientWidth;

    if (direction === 'left') {
      // ซ่อน left arrow เมื่ออยู่ซ้ายสุด
      setIsVisible(scrollLeft > 5); // เผื่อ rounding error
    } else {
      // ซ่อน right arrow เมื่ออยู่ขวาสุด
      setIsVisible(scrollLeft < maxScrollLeft - 5); // เผื่อ rounding error
    }
  }, [scrollContainer, direction]);

  // ✅ ฟังก์ชันจัดการ scroll
  const handleScroll = useCallback(() => {
    if (!scrollContainer) return;

    const scrollLeft = scrollContainer.scrollLeft;
    const newScrollLeft = direction === 'left' 
      ? Math.max(0, scrollLeft - scrollAmount)
      : scrollLeft + scrollAmount;
    
    scrollContainer.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  }, [scrollContainer, direction, scrollAmount]);

  // ✅ Effect สำหรับหา scroll container และ setup listeners
  useEffect(() => {
    const element = document.getElementById(targetId);
    if (!element) return;

    setScrollContainer(element);

    // เรียกครั้งแรกเพื่อ set initial state
    const { scrollLeft, scrollWidth, clientWidth } = element;
    const maxScrollLeft = scrollWidth - clientWidth;

    if (direction === 'left') {
      setIsVisible(scrollLeft > 5);
    } else {
      setIsVisible(scrollLeft < maxScrollLeft - 5);
    }

    // ✅ Scroll listener สำหรับ real-time updates
    const handleScrollEvent = () => {
      const { scrollLeft, scrollWidth, clientWidth } = element;
      const maxScrollLeft = scrollWidth - clientWidth;

      if (direction === 'left') {
        setIsVisible(scrollLeft > 5);
      } else {
        setIsVisible(scrollLeft < maxScrollLeft - 5);
      }
    };

    // ✅ Resize listener สำหรับ responsive recalculation
    const handleResizeEvent = () => {
      // หน่วงเวลาเล็กน้อยให้ layout เสร็จก่อน
      setTimeout(handleScrollEvent, 100);
    };

    element.addEventListener('scroll', handleScrollEvent, { passive: true });
    window.addEventListener('resize', handleResizeEvent);

    return () => {
      element.removeEventListener('scroll', handleScrollEvent);
      window.removeEventListener('resize', handleResizeEvent);
    };
  }, [targetId, direction]);

  // ✅ ไม่แสดงปุ่มถ้าไม่ควรมองเห็น
  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={handleScroll}
      className={`novel-row-nav-button ${
        direction === 'left' ? 'novel-row-nav-left' : 'novel-row-nav-right'
      } hidden lg:flex gpu-accelerated transition-opacity duration-200 ease-in-out`}
      aria-label={direction === 'left' ? 'เลื่อนซ้าย' : 'เลื่อนขวา'}
      style={{
        // ✅ ไม่มี hover animation ตามที่ขอ
        transform: 'translateY(-50%)',
      }}
    >
      {direction === 'left' ? (
        <ChevronLeft size={20} className="text-primary" />
      ) : (
        <ChevronRight size={20} className="text-primary" />
      )}
    </button>
  );
} 