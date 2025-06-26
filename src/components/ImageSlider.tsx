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
const DESKTOP_FIXED_SLIDE_WIDTH = 1000; // ความกว้างของสไลด์ "หลัก" ตรงกลาง
const NUM_RENDERED_SLIDES = 5; // ✅ [ปรับปรุง] เพิ่มจำนวนสไลด์ที่ render เพื่อให้ infinite loop ราบรื่นยิ่งขึ้น (prev, prev, current, next, next)
const TRANSITION_DURATION = 500; // ระยะเวลา transition (ms), ควรตรงกับ CSS

export function ImageSlider({ slides, autoPlayInterval = 7000 }: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0); // ดัชนี "ตรรกะ" ของสไลด์ (0 ถึง totalSlides - 1)
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isAutoPlayTransition, setIsAutoPlayTransition] = useState(false); // ✅ [เพิ่ม] ตัวแปรเพื่อติดตามว่าเป็นการเปลี่ยนสไลด์โดยอัตโนมัติหรือไม่

  const [dragStartPos, setDragStartPos] = useState(0);
  const [currentTranslate, setCurrentTranslate] = useState(0); // ค่า translate ที่เกิดจากการลาก (delta X) เฉพาะส่วนที่ลาก
  
  // Offset หลักของ slideContainer สำหรับการจัดตำแหน่งสไลด์
  const [slideContainerOffset, setSlideContainerOffset] = useState(0);

  const [carouselHeight, setCarouselHeight] = useState('56.25vw');

  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const carouselRef = useRef<HTMLDivElement>(null);
  const slideContainerRef = useRef<HTMLDivElement>(null);

  const totalSlides = slides.length;

  // useCallback hook เพื่อ memoize ฟังก์ชันคำนวณความกว้างที่มีผล (effective slide width)
  const getEffectiveSlideWidth = useCallback((): number => {
    if (typeof window !== "undefined" && carouselRef.current) {
      if (window.innerWidth >= 1024 && totalSlides > 1) {
        return Math.min(DESKTOP_FIXED_SLIDE_WIDTH, carouselRef.current.offsetWidth);
      }
      return carouselRef.current.offsetWidth;
    }
    return DESKTOP_FIXED_SLIDE_WIDTH; // Fallback for SSR
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
    // index ของสไลด์ "ปัจจุบัน" ใน DOM array (extendedSlidesToRender)
    const centralSlideInDomIndex = Math.floor(NUM_RENDERED_SLIDES / 2); 

    return (carouselWidth / 2) - (effectiveSlideWidth / 2) - (centralSlideInDomIndex * effectiveSlideWidth);
  }, [getEffectiveSlideWidth]);

  // ✅ [แก้ไข] ฟังก์ชันหลักสำหรับจัดการการเปลี่ยนสไลด์ (Next)
  const goToNext = useCallback((isAutoPlay: boolean = false) => {
    if (isTransitioning || totalSlides <= 1) return;
    setIsTransitioning(true);
    setIsAutoPlayTransition(isAutoPlay); // ✅ [เพิ่ม] ตั้งค่าให้รู้ว่าเป็นการเปลี่ยนสไลด์โดยอัตโนมัติหรือไม่

    const effectiveSlideWidth = getEffectiveSlideWidth();
    // อนิเมชันเลื่อน container ไปทางซ้าย 1 สไลด์
    setTransform(slideContainerOffset - effectiveSlideWidth, true);

    // หลังจากอนิเมชันจบ (TRANSITION_DURATION)
    transitionTimeoutRef.current = setTimeout(() => {
      // อัปเดต index ของสไลด์
      const newIndex = getLoopedIndex(currentIndex + 1);
      setCurrentIndex(newIndex);
      
      // "รีเซ็ต" ตำแหน่งของ container แบบไม่มีอนิเมชันกลับไปที่จุดศูนย์กลาง
      setTransform(slideContainerOffset, false);
      setIsTransitioning(false);
      setIsAutoPlayTransition(false); // ✅ [เพิ่ม] รีเซ็ตสถานะ autoplay
    }, TRANSITION_DURATION);

  }, [isTransitioning, totalSlides, slideContainerOffset, getEffectiveSlideWidth, setTransform, getLoopedIndex, currentIndex]);

  // ✅ [แก้ไข] ฟังก์ชันหลักสำหรับจัดการการเปลี่ยนสไลด์ (Previous)
  const goToPrevious = useCallback(() => {
    if (isTransitioning || totalSlides <= 1) return;
    setIsTransitioning(true);
    setIsAutoPlayTransition(false); // ✅ [เพิ่ม] ระบุว่าไม่ใช่การเปลี่ยนสไลด์โดยอัตโนมัติ

    const effectiveSlideWidth = getEffectiveSlideWidth();
    // อนิเมชันเลื่อน container ไปทางขวา 1 สไลด์
    setTransform(slideContainerOffset + effectiveSlideWidth, true);
    
    // หลังจากอนิเมชันจบ
    transitionTimeoutRef.current = setTimeout(() => {
      const newIndex = getLoopedIndex(currentIndex - 1);
      setCurrentIndex(newIndex);

      // รีเซ็ตตำแหน่ง container แบบไม่มีอนิเมชัน
      setTransform(slideContainerOffset, false);
      setIsTransitioning(false);
    }, TRANSITION_DURATION);

  }, [isTransitioning, totalSlides, slideContainerOffset, getEffectiveSlideWidth, setTransform, getLoopedIndex, currentIndex]);

  // ✅ [แก้ไข] ฟังก์ชันสำหรับไปสไลด์ที่ระบุ (เช่น จากการคลิก dot) ด้วยอนิเมชันเลื่อนซ้าย-ขวา
  const goToSlide = useCallback((slideIndex: number) => {
    if (isTransitioning || totalSlides <= 1) return;
    const newLogicalIndex = getLoopedIndex(slideIndex);
    if (newLogicalIndex === currentIndex) return;

    setIsTransitioning(true);
    setIsAutoPlayTransition(false); // ระบุว่าไม่ใช่การเปลี่ยนสไลด์โดยอัตโนมัติ

    const effectiveSlideWidth = getEffectiveSlideWidth();
    const slidesToMove = newLogicalIndex - currentIndex;
    const translateDistance = -slidesToMove * effectiveSlideWidth;

    // เลื่อนไปยังตำแหน่งเป้าหมายด้วยอนิเมชัน
    setTransform(slideContainerOffset + translateDistance, true);

    transitionTimeoutRef.current = setTimeout(() => {
      setCurrentIndex(newLogicalIndex);
      setTransform(calculateCenteringOffset(), false); // รีเซ็ตตำแหน่งทันที
      setCurrentTranslate(0);
      setIsTransitioning(false);
    }, TRANSITION_DURATION);

  }, [isTransitioning, totalSlides, currentIndex, getLoopedIndex, getEffectiveSlideWidth, setTransform, calculateCenteringOffset]);

  // useEffect สำหรับ Autoplay
  useEffect(() => {
    if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    if (autoPlayInterval && !isHovering && !isDragging && !isTransitioning && totalSlides > 1) {
      autoPlayTimeoutRef.current = setTimeout(() => goToNext(true), autoPlayInterval); // ✅ [แก้ไข] ส่ง isAutoPlay=true
    }
    return () => {
      if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    };
  }, [currentIndex, goToNext, autoPlayInterval, isHovering, isDragging, isTransitioning, totalSlides]);

  // useEffect สำหรับ Initial setup และ Resize handler
  useEffect(() => {
    const setupSlider = () => {
      if (!carouselRef.current || !slideContainerRef.current) return;
      
      const effectiveWidth = getEffectiveSlideWidth();
      const newHeight = window.innerWidth >= 1024 && totalSlides > 1
          ? `${effectiveWidth * 0.45}px` // สำหรับ desktop
          : '56.25vw'; // สำหรับ mobile
      
      setCarouselHeight(newHeight);

      const newCenteringOffset = calculateCenteringOffset();
      setSlideContainerOffset(newCenteringOffset);
      setTransform(newCenteringOffset + currentTranslate, false);  
    };

    // ใช้ timeout เล็กน้อยเพื่อให้แน่ใจว่า layout ถูกคำนวณแล้ว
    const initialTimeoutId = setTimeout(setupSlider, 50); 
    
    const handleResize = () => {
      if (!isDragging) {
        // ยกเลิก transition ที่อาจค้างอยู่
        if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
        setIsTransitioning(false);
        // คำนวณค่าใหม่
        setupSlider();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(initialTimeoutId);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculateCenteringOffset, setTransform, totalSlides]); // deps ถูกต้องแล้ว

  // Drag Handlers
  const getPositionX = (event: MouseEvent | TouchEvent): number => {
    return event.type.includes('mouse')
      ? (event as MouseEvent).clientX
      : (event as TouchEvent).touches[0].clientX;
  };

  const dragStart = useCallback((event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (totalSlides <= 1 || isTransitioning) return;
    // ป้องกันการลากเมื่อคลิกบน Link หรือ Button
    const targetElement = event.target as HTMLElement;
    if (targetElement.closest('a, button')) return;

    if (event.type === 'mousedown') {
      (event as React.MouseEvent<HTMLDivElement>).preventDefault();
    }
    // หยุด autoplay และ transition ที่อาจค้างอยู่
    if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    setIsTransitioning(false); // อนุญาตให้ลากได้ทันที

    setIsDragging(true);
    setDragStartPos(getPositionX(event.nativeEvent));
    setTransform(slideContainerOffset + currentTranslate, false);

  }, [totalSlides, isTransitioning, slideContainerOffset, currentTranslate, setTransform]);

  const dragMove = useCallback((event: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const currentPosition = getPositionX(event);
    const diff = currentPosition - dragStartPos;
    setCurrentTranslate(diff);
    setTransform(slideContainerOffset + diff, false);
  }, [isDragging, dragStartPos, slideContainerOffset, setTransform]);

  const dragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const effectiveSlideWidth = getEffectiveSlideWidth();
    const threshold = effectiveSlideWidth * 0.2; // 20% threshold for swipe

    // ✅ [แก้ไข] ตรรกะการ swipe ให้ถูกต้องตามหลักการ
    // ปัดไปทางซ้าย (translate เป็นลบ) -> ไปสไลด์ถัดไป (Next)
    if (currentTranslate < -threshold) {
      goToNext(false); // ✅ [แก้ไข] ส่ง isAutoPlay=false
    // ปัดไปทางขวา (translate เป็นบวก) -> ไปสไลด์ก่อนหน้า (Prev)
    } else if (currentTranslate > threshold) {
      goToPrevious();
    // ลากไม่ไกลพอ ให้เด้งกลับที่เดิม
    } else {
      setTransform(slideContainerOffset, true);
    }
    
    // รีเซ็ตค่า translate ที่เกิดจากการลาก
    setCurrentTranslate(0);

  }, [isDragging, currentTranslate, getEffectiveSlideWidth, goToNext, goToPrevious, slideContainerOffset, setTransform]);

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
    };
  }, [isDragging, dragMove, dragEnd]);

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
  
  // สร้าง array ของสไลด์ที่จะ render ใน DOM เพื่อสร้าง infinite loop
  const extendedSlidesToRender: (SlideData & { originalIndex: number; uniqueKey: string })[] = [];
  if (totalSlides > 0) {
    const halfRendered = Math.floor(NUM_RENDERED_SLIDES / 2);
    for (let i = -halfRendered; i <= halfRendered; i++) {
      const slideDataIndex = getLoopedIndex(currentIndex + i);
      extendedSlidesToRender.push({
        ...slides[slideDataIndex],
        originalIndex: slideDataIndex,
        // สร้าง unique key ที่เสถียรสำหรับการ re-render
        uniqueKey: `slide-${slides[slideDataIndex].id}-loop-${i}`
      });
    }
  }
  const effectiveSlideWidth = getEffectiveSlideWidth();
  const currentLogicalIndex = getLoopedIndex(currentIndex);

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
        height: carouselHeight,
      }}
    >
      <div
        ref={slideContainerRef}
        className={`${styles.slideContainer} ${isDragging ? styles.dragging : ''}`}
        onMouseDown={dragStart}
      >
        {extendedSlidesToRender.map((slide, index) => {
           const isCentralSlide = index === Math.floor(NUM_RENDERED_SLIDES / 2);
           return (
            <div
              key={slide.uniqueKey}
              className={styles.slide}
              style={{ width: `${effectiveSlideWidth}px` }}
              data-is-active={isCentralSlide}
              aria-live={isCentralSlide ? "polite" : "off"}
              aria-atomic="true"
              aria-hidden={!isCentralSlide}
              role="group"
              aria-roledescription="slide"
              aria-label={`${slide.title} (สไลด์ ${currentLogicalIndex + 1} จาก ${totalSlides})`}
            >
              <Image
                src={slide.imageUrl}
                alt={slide.description || slide.title || "Slide image"}
                fill
                priority={isCentralSlide || Math.abs(index - Math.floor(NUM_RENDERED_SLIDES / 2)) === 1}
                sizes={`(max-width: 1023px) 100vw, ${effectiveSlideWidth}px`}
                className={styles.slideImage}
                draggable={false}
              />
              <div className={styles.slideOverlay}></div>
              <div className={styles.slideContent}>
                <div className={isCentralSlide && isAutoPlayTransition ? styles.slideContentEnter : ""}> {/* ✅ [แก้ไข] ใช้ slideContentEnter เฉพาะเมื่อเป็น autoplay */}
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
                      onClick={(e) => {
                          if(isDragging || currentTranslate !== 0) e.preventDefault();
                          e.stopPropagation();
                      }}
                      tabIndex={isCentralSlide ? 0 : -1}
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
                        onClick={(e) => {
                            if(isDragging || currentTranslate !== 0) e.preventDefault();
                            e.stopPropagation();
                        }}
                        tabIndex={isCentralSlide ? 0 : -1}
                      >
                        {slide.primaryAction.label}
                        <ExternalLink size={16} strokeWidth={2.5} /> 
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
           )
        })}
      </div>

      {totalSlides > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className={`${styles.navButton} ${styles.navButtonPrev}`}
            aria-label="สไลด์ก่อนหน้า"
            disabled={isTransitioning || isDragging}
          >
            <ArrowLeft size={20} strokeWidth={2.5}/>
          </button>
          <button
            onClick={() => goToNext(false)} // ✅ [แก้ไข] ส่ง isAutoPlay=false
            className={`${styles.navButton} ${styles.navButtonNext}`}
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
                className={`${styles.dot} ${currentLogicalIndex === slideIdx ? styles.active : ''}`}
                aria-label={`ไปที่สไลด์ ${slideIdx + 1} (${s.title})`}
                aria-current={currentLogicalIndex === slideIdx ? "true" : "false"}
                disabled={isTransitioning || isDragging}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}