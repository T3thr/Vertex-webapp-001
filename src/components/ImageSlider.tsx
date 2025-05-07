// src/components/ImageSlider.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";

interface Slide {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  link: string;
}

interface ImageSliderProps {
  slides: Slide[];
  autoPlayInterval?: number;
}

export function ImageSlider({ slides, autoPlayInterval = 5000 }: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // ความต่างขั้นต่ำที่ต้องการให้นับเป็นการสไลด์
  const minSwipeDistance = 50;

  // ฟังก์ชันเปลี่ยนสไลด์ถัดไป
  const goToNext = useCallback(() => {
    const isLastSlide = currentIndex === slides.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  }, [currentIndex, slides.length]);
  
  // ฟังก์ชันเปลี่ยนสไลด์ก่อนหน้า
  const goToPrevious = useCallback(() => {
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? slides.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  }, [currentIndex, slides.length]);

  // เลือกสไลด์ตาม index
  const goToSlide = useCallback((slideIndex: number) => {
    setCurrentIndex(slideIndex);
  }, []);

  // ฟังก์ชัน autoplay
  useEffect(() => {
    if (isHovering || !slides.length) return;
    
    const interval = setInterval(() => {
      goToNext();
    }, autoPlayInterval);
    
    return () => clearInterval(interval);
  }, [goToNext, slides.length, autoPlayInterval, isHovering]);

  // จัดการการแตะหน้าจอสำหรับอุปกรณ์สัมผัส
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      goToNext();
    }
    if (isRightSwipe) {
      goToPrevious();
    }
  };

  // ถ้าไม่มีสไลด์ให้แสดง
  if (!slides.length) return null;

  return (
    <div 
      className="relative w-full h-[300px] sm:h-[400px] md:h-[500px] lg:h-[550px]"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* สไลด์หลัก */}
      <div className="w-full h-full overflow-hidden rounded-2xl relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="absolute w-full h-full"
          >
            <Link href={slides[currentIndex].link} className="block w-full h-full relative">
              <Image
                src={slides[currentIndex].imageUrl}
                alt={slides[currentIndex].title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 1200px"
                className="object-cover"
              />
              {/* เกรเดียนท์เพื่อความชัดเจนของข้อความ */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              
              {/* เนื้อหาข้อความ */}
              <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full">
                <motion.h2 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2"
                >
                  {slides[currentIndex].title}
                </motion.h2>
                {slides[currentIndex].description && (
                  <motion.p 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.7, delay: 0.4 }}
                    className="text-white/80 text-sm sm:text-base md:text-lg lg:text-xl max-w-2xl"
                  >
                    {slides[currentIndex].description}
                  </motion.p>
                )}
                <motion.button
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.7, delay: 0.6 }}
                  className="mt-6 bg-primary hover:bg-primary/90 text-white py-3 px-8 rounded-full inline-flex items-center gap-2 font-semibold transition-all text-lg"
                >
                  อ่านเลย <FiArrowRight className="ml-1" />
                </motion.button>
              </div>
            </Link>
          </motion.div>
        </AnimatePresence>

        {/* ปุ่มนำทาง */}
        <button
          onClick={(e) => {
            e.preventDefault();
            goToPrevious();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 p-3 rounded-full text-white transition-all z-10"
          aria-label="สไลด์ก่อนหน้า"
        >
          <FiArrowLeft size={24} />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            goToNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 p-3 rounded-full text-white transition-all z-10"
          aria-label="สไลด์ถัดไป"
        >
          <FiArrowRight size={24} />
        </button>
      </div>
      
      {/* จุดระบุตำแหน่ง */}
      <div className="absolute -bottom-8 left-0 right-0 flex justify-center gap-2">
        {slides.map((_, slideIndex) => (
          <button
            key={slideIndex}
            onClick={() => goToSlide(slideIndex)}
            className={`h-3 rounded-full transition-all ${
              slideIndex === currentIndex
                ? "bg-primary w-8"
                : "bg-secondary w-3 hover:bg-primary/40"
            }`}
            aria-label={`ไปที่สไลด์ ${slideIndex + 1}`}
          />
        ))}
      </div>

      {/* ตัวบ่งชี้ความคืบหน้า */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ 
            duration: autoPlayInterval / 1000, 
            ease: "linear" 
          }}
          key={currentIndex}
        />
      </div>
    </div>
  );
};