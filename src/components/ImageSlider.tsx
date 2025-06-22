// src/components/ImageSlider.tsx
"use client"; // **สำคัญมาก** สำหรับ Client Component ที่มีการใช้ hooks และ event listeners

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import styles from "./ImageSlider.module.css"; // Import CSS Module

// Interface สำหรับข้อมูลของแต่ละสไลด์
export interface SlideData {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  link: string;
  category?: string;
  highlightColor?: string;
  primaryAction?: { label: string; href: string };
}

// Props ของ ImageSlider component
interface ImageSliderProps {
  slides: SlideData[];
  autoPlayInterval?: number;
}

// ความกว้างคงที่ของสไลด์บนเดสก์ท็อปเมื่อแสดงผลแบบหลายรายการ (Peeking Effect)
// ควรปรับค่านี้ให้สอดคล้องกับดีไซน์ที่ต้องการ
const DESKTOP_FIXED_SLIDE_WIDTH = 1000; // ความกว้างของสไลด์ "หลัก" ตรงกลาง
const NUM_RENDERED_SLIDES = 3; // จำนวนสไลด์ที่จะ render ใน DOM (prev, current, next) เพื่อ infinite loop
const TRANSITION_DURATION = 500; // ระยะเวลา transition (ms), ควรตรงกับ CSS

export function ImageSlider({ slides, autoPlayInterval = 7000 }: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0); // ดัชนี "ตรรกะ" ของสไลด์ (0 ถึง totalSlides - 1)
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [dragStartPos, setDragStartPos] = useState(0);
  const [currentTranslate, setCurrentTranslate] = useState(0); // ค่า translate ที่เกิดจากการลาก (delta X) เฉพาะส่วนที่ลาก
  
  // Offset หลักของ slideContainer สำหรับการจัดตำแหน่งสไลด์
  // ค่านี้จะถูกคำนวณเพื่อให้สไลด์ "ปัจจุบัน" ที่ render (ตัวกลางใน NUM_RENDERED_SLIDES) อยู่ตรงกลาง carousel
  const [slideContainerOffset, setSlideContainerOffset] = useState(0);

  // ✅ [การแก้ไข] เพิ่ม state สำหรับเก็บความสูงของ carousel
  // กำหนดค่าเริ่มต้นเป็น '56.25vw' เพื่อให้ตรงกับค่าที่ Server จะ Render เสมอ (เนื่องจาก server ไม่มี object 'window')
  const [carouselHeight, setCarouselHeight] = useState('56.25vw');

  const dragAnimationIdRef = useRef<number | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const carouselRef = useRef<HTMLDivElement>(null);
  const slideContainerRef = useRef<HTMLDivElement>(null);

  const totalSlides = slides.length;

  // useCallback hook เพื่อ memoize ฟังก์ชันคำนวณความกว้างที่มีผล (effective slide width)
  const getEffectiveSlideWidth = useCallback((): number => {
    if (typeof window !== "undefined" && carouselRef.current) {
      // บน desktop (>=1024px) และมีมากกว่า 1 สไลด์: ใช้ DESKTOP_FIXED_SLIDE_WIDTH
      // แต่ต้องไม่เกินความกว้างของ carousel container เอง
      if (window.innerWidth >= 1024 && totalSlides > 1) {
        return Math.min(DESKTOP_FIXED_SLIDE_WIDTH, carouselRef.current.offsetWidth);
      }
      // ถ้าเป็น mobile หรือมีสไลด์เดียว ใช้ความกว้างของ carousel container
      return carouselRef.current.offsetWidth;
    }
    return DESKTOP_FIXED_SLIDE_WIDTH; // Fallback for SSR or if ref not ready
  }, [totalSlides]);

  // ฟังก์ชันสำหรับคำนวณ modular index เพื่อให้วนลูปได้ถูกต้อง
  const getLoopedIndex = useCallback((index: number): number => {
    if (totalSlides === 0) return 0;
    return ((index % totalSlides) + totalSlides) % totalSlides;
  }, [totalSlides]);

  // ฟังก์ชันสำหรับอัปเดต transform (translateX) ของ slideContainer
  const setTransform = useCallback((translateX: number, useTransition: boolean = false) => {
    if (slideContainerRef.current) {
        slideContainerRef.current.style.transition = useTransition
            ? `transform ${TRANSITION_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`
            : 'none';
        slideContainerRef.current.style.transform = `translateX(${translateX}px)`;
    }
  }, []);

  // ฟังก์ชันคำนวณ offset เพื่อให้สไลด์ "ปัจจุบัน" (ตัวกลางใน DOM) อยู่ตรงกลาง carousel
  const calculateCenteringOffset = useCallback((): number => {
    if (!carouselRef.current) return 0;
    const effectiveSlideWidth = getEffectiveSlideWidth();
    const carouselWidth = carouselRef.current.offsetWidth;
    const centralSlideInDomIndex = Math.floor(NUM_RENDERED_SLIDES / 2); // index ของสไลด์ "ปัจจุบัน" ใน DOM array (extendedSlidesToRender)

    return (carouselWidth / 2) - (effectiveSlideWidth / 2) - (centralSlideInDomIndex * effectiveSlideWidth);
  }, [getEffectiveSlideWidth]);


  // ฟังก์ชันหลักสำหรับจัดการการเปลี่ยนสไลด์
  const handleSlideChange = useCallback((direction: 'next' | 'prev') => {
    if (isTransitioning || totalSlides <= 1) return;

    const effectiveSlideWidth = getEffectiveSlideWidth();
    const newLogicalCurrentIndex = getLoopedIndex(currentIndex + (direction === 'prev' ? 1 : -1));

    const targetTransform = slideContainerOffset + (direction === 'prev' ? -effectiveSlideWidth : effectiveSlideWidth);
    setTransform(targetTransform, false); // No animation for immediate change

    setCurrentIndex(newLogicalCurrentIndex); // Update index immediately
    const newCenteringOffset = calculateCenteringOffset();
    setSlideContainerOffset(newCenteringOffset);
    setTransform(newCenteringOffset, true); // Animate to new position
  }, [isTransitioning, totalSlides, getEffectiveSlideWidth, currentIndex, getLoopedIndex, slideContainerOffset, setTransform, calculateCenteringOffset]);


  const goToNext = useCallback(() => {
    if (isDragging || isTransitioning) return;
    handleSlideChange('next');
  }, [isDragging, isTransitioning, handleSlideChange]);

  const goToPrevious = useCallback(() => {
    if (isDragging || isTransitioning) return;
    handleSlideChange('prev');
  }, [isDragging, isTransitioning, handleSlideChange]);

  // ฟังก์ชันสำหรับไปสไลด์ที่ระบุ (เช่น จากการคลิก dot)
  const goToSlide = useCallback((slideIndex: number) => {
    if (isDragging || isTransitioning || totalSlides <= 1) return;

    const newLogicalIndex = getLoopedIndex(slideIndex);
    if (newLogicalIndex === currentIndex) return;

    setCurrentIndex(newLogicalIndex);
    const newCenteringOffset = calculateCenteringOffset();
    setSlideContainerOffset(newCenteringOffset);
    setTransform(newCenteringOffset, false);
    setCurrentTranslate(0);
    
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    setIsTransitioning(false);

  }, [isDragging, isTransitioning, totalSlides, getLoopedIndex, currentIndex, calculateCenteringOffset, setTransform]);

  // useEffect สำหรับ Autoplay
  useEffect(() => {
    if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    if (autoPlayInterval && !isHovering && !isDragging && !isTransitioning && totalSlides > 1) {
      autoPlayTimeoutRef.current = setTimeout(goToNext, autoPlayInterval);
    }
    return () => {
      if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    };
  }, [currentIndex, goToNext, autoPlayInterval, isHovering, isDragging, isTransitioning, totalSlides]);


  // useEffect สำหรับ Initial setup และ Resize handler
  useEffect(() => {
    const setupSlider = () => {
      if (!carouselRef.current || !slideContainerRef.current) return;
      
      // ✅ [การแก้ไข] คำนวณค่าต่างๆ บน client เท่านั้น
      const effectiveWidth = getEffectiveSlideWidth();
      const newHeight = window.innerWidth >= 1024 && totalSlides > 1
          ? `${effectiveWidth * 0.45}px` // สำหรับ desktop
          : '56.25vw'; // สำหรับ mobile
      
      // ✅ [การแก้ไข] อัปเดต state ของความสูง ซึ่งจะทำให้ component re-render ด้วยค่าที่ถูกต้องบน client
      setCarouselHeight(newHeight);

      const newCenteringOffset = calculateCenteringOffset();
      setSlideContainerOffset(newCenteringOffset);
      setTransform(newCenteringOffset + currentTranslate, false); 
    };

    const initialTimeoutId = setTimeout(setupSlider, 50); 
    const handleResize = () => {
      if (!isDragging && !isTransitioning) {
        setupSlider();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(initialTimeoutId);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      if (dragAnimationIdRef.current) cancelAnimationFrame(dragAnimationIdRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculateCenteringOffset, setTransform, totalSlides]);


  // Drag Handlers
  const getPositionX = (event: MouseEvent | TouchEvent): number => {
    return event.type.includes('mouse')
      ? (event as MouseEvent).clientX
      : (event as TouchEvent).touches[0].clientX;
  };

  const dragStart = useCallback((event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (totalSlides <= 1 || isTransitioning) return;
    const targetElement = event.target as HTMLElement;
    if (targetElement.closest('a, button')) return;
    if (event.type === 'mousedown') {
      (event as React.MouseEvent<HTMLDivElement>).preventDefault();
    }
    setIsDragging(true);
    setDragStartPos(getPositionX(event.nativeEvent));
    if (slideContainerRef.current) {
      slideContainerRef.current.style.transition = 'none'; 
    }
    if (dragAnimationIdRef.current) {
      cancelAnimationFrame(dragAnimationIdRef.current);
      dragAnimationIdRef.current = null;
    }
  }, [totalSlides, isTransitioning]);

  const dragMove = useCallback((event: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const currentPosition = getPositionX(event);
    const diff = currentPosition - dragStartPos;

    if (dragAnimationIdRef.current) cancelAnimationFrame(dragAnimationIdRef.current);
    dragAnimationIdRef.current = requestAnimationFrame(() => {
      setTransform(slideContainerOffset + diff, false);
    });
    setCurrentTranslate(diff);
  }, [isDragging, dragStartPos, slideContainerOffset, setTransform]);

  const dragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragAnimationIdRef.current) {
      cancelAnimationFrame(dragAnimationIdRef.current);
      dragAnimationIdRef.current = null;
    }

    const effectiveSlideWidth = getEffectiveSlideWidth();
    const threshold = effectiveSlideWidth * 0.20;

    if (currentTranslate < -threshold) {
      handleSlideChange('next');
    } else if (currentTranslate > threshold) {
      handleSlideChange('prev');
    } else {
      setTransform(slideContainerOffset, true);
      setCurrentTranslate(0);
    }
  }, [isDragging, currentTranslate, getEffectiveSlideWidth, handleSlideChange, slideContainerOffset, setTransform]);


  // useEffect สำหรับ global mouse/touch event listeners ขณะลาก
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => dragMove(e);
    const handleGlobalMouseUp = () => dragEnd();
    const handleGlobalTouchMove = (e: TouchEvent) => dragMove(e);
    const handleGlobalTouchEnd = () => dragEnd();

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('mouseleave', handleGlobalMouseUp);
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: true });
      document.addEventListener('touchend', handleGlobalTouchEnd);
      document.addEventListener('touchcancel', handleGlobalTouchEnd);
    }
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mouseleave', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
      document.removeEventListener('touchcancel', handleGlobalTouchEnd);
      if (dragAnimationIdRef.current) {
        cancelAnimationFrame(dragAnimationIdRef.current);
        dragAnimationIdRef.current = null;
      }
    };
  }, [isDragging, dragMove, dragEnd]);

  // Add fade-out effect for arrow buttons
  const [showArrows, setShowArrows] = useState(true);
  useEffect(() => {
    const timeout = setTimeout(() => setShowArrows(false), 3000); // Hide arrows after 3 seconds
    return () => clearTimeout(timeout);
  }, [currentIndex]);

  if (totalSlides === 0) {
    return (
      <div
        className={`${styles.carousel} ${styles.loadingState}`}
        style={{ height: '300px', minHeight: '300px' }} 
      >
        <p>Loading slides...</p>
      </div>
    );
  }
  
  const extendedSlidesToRender: (SlideData & { originalIndex: number; positionInLoop: number })[] = [];
  if (totalSlides > 0) {
    const halfRendered = Math.floor(NUM_RENDERED_SLIDES / 2);
    for (let i = -halfRendered; i <= halfRendered; i++) {
      const slideDataIndex = getLoopedIndex(currentIndex + i);
      extendedSlidesToRender.push({
        ...slides[slideDataIndex],
        originalIndex: slideDataIndex,
        positionInLoop: i,
      });
    }
  }
  const effectiveSlideWidth = getEffectiveSlideWidth();

  // ❌ [การแก้ไข] ลบการคำนวณ carouselHeight ออกจากส่วน render body
  // const carouselHeight = ...

  return (
    <div
      ref={carouselRef}
      className={styles.carousel}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onTouchStart={dragStart}
      role="region"
      aria-roledescription="carousel"
      aria-label="โปรโมชั่นและเรื่องเด่น"
      style={{
        userSelect: isDragging ? 'none' : 'auto',
        // ✅ [การแก้ไข] ใช้ค่าความสูงจาก state ที่จะถูกอัปเดตบน client
        height: carouselHeight,
      }}
    >
      <div
        ref={slideContainerRef}
        className={`${styles.slideContainer} ${isDragging ? styles.dragging : ''}`}
        onMouseDown={dragStart}
      >
        {extendedSlidesToRender.map((slide) => (
          <div
            key={`slide-${slide.id}-${slide.originalIndex}-loopPos${slide.positionInLoop}`}
            className={styles.slide}
            style={{ width: `${effectiveSlideWidth}px` }}
            data-position-in-loop={slide.positionInLoop}
            data-is-active={slide.positionInLoop === 0}
            aria-live={slide.positionInLoop === 0 ? "polite" : "off"}
            aria-atomic="true"
            aria-hidden={slide.positionInLoop !== 0 && typeof window !== 'undefined' && window.innerWidth < 1024}
            role="group"
            aria-roledescription="slide"
            aria-label={`${slide.title} (สไลด์ ${getLoopedIndex(currentIndex) + 1} จาก ${totalSlides})`}
          >
            <Image
              src={slide.imageUrl}
              alt={slide.description || slide.title || "Slide image"}
              fill
              priority={
                slide.positionInLoop === 0 ||
                (extendedSlidesToRender.findIndex(s => s.id === slide.id && s.positionInLoop === 0) !== -1) ||
                Math.abs(slide.positionInLoop) <= 1
              }
              sizes={`(max-width: 767px) 100vw, (max-width: 1023px) calc(100vw - 32px), ${effectiveSlideWidth}px`}
              className={styles.slideImage}
              draggable={false}
              unoptimized={false}
            />
            <div className={styles.slideOverlay}></div>
            <div className={styles.slideContent}>
              <div className={slide.positionInLoop === 0 ? styles.slideContentEnter : ""}>
                {slide.category && (
                  <span
                    className={styles.slideCategory}
                    style={slide.highlightColor ? { backgroundColor: slide.highlightColor, color: 'var(--primary-foreground)' } : {}}
                  >
                    {slide.category}
                  </span>
                )}
                <h2 className={styles.slideTitle}>
                  <Link
                    href={slide.link || '#'}
                    className="focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 rounded-sm"
                    draggable={false}
                    onClick={(e) => e.stopPropagation()}
                    tabIndex={slide.positionInLoop === 0 ? 0 : -1}
                  >
                    {slide.title}
                  </Link>
                </h2>
                {slide.description && (
                  <p className={styles.slideDescription}>
                    {slide.description}
                  </p>
                )}
                {slide.primaryAction && (
                  <div className="mt-2 md:mt-3"> 
                    <Link
                      href={slide.primaryAction.href || '#'}
                      className={styles.slideButton}
                      draggable={false}
                      onClick={(e) => e.stopPropagation()}
                      tabIndex={slide.positionInLoop === 0 ? 0 : -1}
                    >
                      {slide.primaryAction.label}
                      <ExternalLink size={16} strokeWidth={2.5} /> 
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalSlides > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className={`${styles.navButton} ${styles.navButtonPrev} ${showArrows ? '' : styles.fadeOut}`}
            aria-label="สไลด์ก่อนหน้า"
            disabled={isTransitioning || isDragging}
          >
            <ArrowLeft size={20} strokeWidth={2.5}/>
          </button>
          <button
            onClick={goToNext}
            className={`${styles.navButton} ${styles.navButtonNext} ${showArrows ? '' : styles.fadeOut}`}
            aria-label="สไลด์ถัดไป"
            disabled={isTransitioning || isDragging}
          >
            <ArrowRight size={20} strokeWidth={2.5}/>
          </button>

          <div className={styles.dots}>
            {slides.map((s, slideIdx) => (
              <button
                key={`dot-${s.id}-${slideIdx}`}
                onClick={() => goToSlide(slideIdx)}
                className={`${styles.dot} ${getLoopedIndex(currentIndex) === slideIdx ? styles.active : ''}`}
                aria-label={`ไปที่สไลด์ ${slideIdx + 1} (${s.title})`}
                aria-current={getLoopedIndex(currentIndex) === slideIdx ? "true" : "false"}
                disabled={isTransitioning || isDragging}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}