// src/components/ImageSlider.tsx

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

interface Slide {
  id: string;
  title: string;
  imageUrl: string;
  link: string;
}

interface ImageSliderProps {
  slides: Slide[];
  autoPlayInterval?: number;
}

export function ImageSlider({ slides, autoPlayInterval = 5000 }: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // ฟังก์ชันเปลี่ยนไปยังสไลด์ก่อนหน้า
  const goToPrevious = () => {
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? slides.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  // ฟังก์ชันเปลี่ยนไปยังสไลด์ถัดไป
  const goToNext = () => {
    const isLastSlide = currentIndex === slides.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  };

  // สร้าง autoplay สำหรับสไลด์
  useEffect(() => {
    const slideInterval = setInterval(() => {
      goToNext();
    }, autoPlayInterval);

    return () => clearInterval(slideInterval);
  }, [currentIndex, autoPlayInterval]);

  // ถ้าไม่มีข้อมูลสไลด์ให้แสดงเป็นค่าว่าง
  if (!slides || slides.length === 0) {
    return null;
  }

  return (
    <div className="relative h-36 md:h-48 w-full overflow-hidden rounded-lg">
    <button
      onClick={goToPrevious}
      className="absolute z-20 left-0 top-0 h-full w-8 flex items-center justify-center text-white bg-gradient-to-r from-black/40 to-transparent"
    >
      &lt;
    </button>
  
    <Link href={slides[currentIndex].link} className="block h-full w-full relative">
      <div className="absolute inset-0 z-10 bg-black/30 flex items-center justify-center">
        <h2 className="text-white text-2xl font-bold text-center">{slides[currentIndex].title}</h2>
      </div>
      <Image
        src={slides[currentIndex].imageUrl}
        alt={slides[currentIndex].title}
        fill
        className="object-cover"
      />
    </Link>
  
    <button
      onClick={goToNext}
      className="absolute z-20 right-0 top-0 h-full w-8 flex items-center justify-center text-white bg-gradient-to-l from-black/40 to-transparent"
    >
      &gt;
    </button>
  </div>
  
  );
}