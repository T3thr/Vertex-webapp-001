// src/components/ImageSlider.tsx

"use client";

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

// ค่าคงที่ต่างๆ
const DESKTOP_FIXED_SLIDE_WIDTH = 600;
const NUM_RENDERED_SLIDES = 5; // (prev, prev, current, next, next)
const TRANSITION_DURATION = 500;
const SLIDE_GAP = 32;
const NAV_FADE_TIMEOUT = 2000; // ✅ [เพิ่ม] เวลา (ms) ก่อนที่ปุ่มจะจางหายไป

export function ImageSlider({ slides, autoPlayInterval = 7000 }: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0); // ดัชนี "ตรรกะ" ของสไลด์ (0 ถึง totalSlides - 1)
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMobile, setIsMobile] = useState(false); // ✅ [เพิ่ม] State สำหรับตรวจสอบขนาดหน้าจอ

  const [dragStartPos, setDragStartPos] = useState(0);
  const [currentTranslate, setCurrentTranslate] = useState(0);
  const [slideContainerOffset, setSlideContainerOffset] = useState(0);
  
  // ✅ [เพิ่ม] State และ Ref สำหรับการซ่อน/แสดงปุ่ม Navigation
  const [showNavButtons, setShowNavButtons] = useState(true);
  const navVisibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const carouselRef = useRef<HTMLDivElement>(null);
  const slideContainerRef = useRef<HTMLDivElement>(null);

  const totalSlides = slides.length;

  // ✅ [ปรับปรุง] useCallback hook เพื่อ memoize ฟังก์ชันคำนวณความกว้างสไลด์ โดยแยกตามขนาดหน้าจอ
  const getEffectiveSlideWidth = useCallback((): number => {
    if (typeof window !== "undefined" && carouselRef.current) {
      // สำหรับ Mobile: ความกว้างเต็มจอ ไม่มี gap
      if (isMobile || totalSlides <= 1) {
        return carouselRef.current.offsetWidth;
      }
      // สำหรับ Desktop: ความกว้างคงที่ + gap
      return Math.min(DESKTOP_FIXED_SLIDE_WIDTH, carouselRef.current.offsetWidth) + SLIDE_GAP;
    }
    return DESKTOP_FIXED_SLIDE_WIDTH + SLIDE_GAP; // Fallback for SSR
  }, [totalSlides, isMobile]);

  const getLoopedIndex = useCallback((index: number): number => {
    if (totalSlides === 0) return 0;
    return ((index % totalSlides) + totalSlides) % totalSlides;
  }, [totalSlides]);

  const setTransform = useCallback((translateX: number, useTransition: boolean = false) => {
    if (slideContainerRef.current) {
      slideContainerRef.current.style.transition = useTransition
        ? `transform ${TRANSITION_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`
        : 'none';
      slideContainerRef.current.style.transform = `translateX(${translateX}px)`;
    }
  }, []);
  
  // ✅ [ปรับปรุง] ฟังก์ชันสำหรับรีเซ็ต timer การซ่อนปุ่ม
  const resetNavVisibilityTimer = useCallback(() => {
    if (navVisibilityTimeoutRef.current) clearTimeout(navVisibilityTimeoutRef.current);
    setShowNavButtons(true);
    navVisibilityTimeoutRef.current = setTimeout(() => {
        if (!isHovering) {
            setShowNavButtons(false);
        }
    }, NAV_FADE_TIMEOUT);
  }, [isHovering]);

  const calculateCenteringOffset = useCallback((): number => {
    if (!carouselRef.current) return 0;

    const effectiveSlideWidth = getEffectiveSlideWidth();
    const carouselWidth = carouselRef.current.offsetWidth;
    const centralSlideInDomIndex = Math.floor(NUM_RENDERED_SLIDES / 2);

    // ✅ [ปรับปรุง] ถ้าเป็น mobile ไม่ต้องจัดกลางแบบ peeking
    if (isMobile) {
        return -(centralSlideInDomIndex * effectiveSlideWidth);
    }
    
    const slideWidthWithoutGap = effectiveSlideWidth - SLIDE_GAP;
    return (carouselWidth / 2) - (slideWidthWithoutGap / 2) - (centralSlideInDomIndex * effectiveSlideWidth);
  }, [getEffectiveSlideWidth, isMobile]);

  const goToNext = useCallback((isAutoPlay: boolean = false) => {
    if (isTransitioning || totalSlides <= 1) return;
    setIsTransitioning(true);
    resetNavVisibilityTimer(); // ✅ [เพิ่ม] รีเซ็ต timer เมื่อเปลี่ยนสไลด์

    const effectiveSlideWidth = getEffectiveSlideWidth();
    setTransform(slideContainerOffset - effectiveSlideWidth, true);

    transitionTimeoutRef.current = setTimeout(() => {
      const newIndex = getLoopedIndex(currentIndex + 1);
      setCurrentIndex(newIndex);
      setTransform(slideContainerOffset, false);
      setIsTransitioning(false);
    }, TRANSITION_DURATION);

  }, [isTransitioning, totalSlides, slideContainerOffset, getEffectiveSlideWidth, setTransform, getLoopedIndex, currentIndex, resetNavVisibilityTimer]);

  const goToPrevious = useCallback(() => {
    if (isTransitioning || totalSlides <= 1) return;
    setIsTransitioning(true);
    resetNavVisibilityTimer(); // ✅ [เพิ่ม] รีเซ็ต timer เมื่อเปลี่ยนสไลด์

    const effectiveSlideWidth = getEffectiveSlideWidth();
    setTransform(slideContainerOffset + effectiveSlideWidth, true);
    
    transitionTimeoutRef.current = setTimeout(() => {
      const newIndex = getLoopedIndex(currentIndex - 1);
      setCurrentIndex(newIndex);
      setTransform(slideContainerOffset, false);
      setIsTransitioning(false);
    }, TRANSITION_DURATION);

  }, [isTransitioning, totalSlides, slideContainerOffset, getEffectiveSlideWidth, setTransform, getLoopedIndex, currentIndex, resetNavVisibilityTimer]);

  const goToSlide = useCallback((slideIndex: number) => {
    if (isTransitioning || totalSlides <= 1) return;
    const newLogicalIndex = getLoopedIndex(slideIndex);
    if (newLogicalIndex === currentIndex) return;
    
    resetNavVisibilityTimer(); // ✅ [เพิ่ม] รีเซ็ต timer เมื่อเปลี่ยนสไลด์
    setIsTransitioning(true);

    const effectiveSlideWidth = getEffectiveSlideWidth();
    // คำนวณจำนวนสไลด์ที่ต้องเลื่อน (จัดการเรื่องการวนลูป)
    const diff = newLogicalIndex - currentIndex;
    const slidesToMove = (Math.abs(diff) > totalSlides / 2) 
        ? (diff > 0 ? diff - totalSlides : diff + totalSlides) 
        : diff;

    const translateDistance = -slidesToMove * effectiveSlideWidth;

    setTransform(slideContainerOffset + translateDistance, true);

    transitionTimeoutRef.current = setTimeout(() => {
      setCurrentIndex(newLogicalIndex);
      setTransform(calculateCenteringOffset(), false);
      setCurrentTranslate(0);
      setIsTransitioning(false);
    }, TRANSITION_DURATION);

  }, [isTransitioning, totalSlides, currentIndex, getLoopedIndex, getEffectiveSlideWidth, setTransform, calculateCenteringOffset, resetNavVisibilityTimer]);

  // useEffect สำหรับ Autoplay
  useEffect(() => {
    if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    if (autoPlayInterval && !isHovering && !isDragging && !isTransitioning && totalSlides > 1) {
      autoPlayTimeoutRef.current = setTimeout(() => goToNext(true), autoPlayInterval);
    }
    return () => {
      if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    };
  }, [currentIndex, goToNext, autoPlayInterval, isHovering, isDragging, isTransitioning, totalSlides]);
  
  // ✅ [เพิ่ม] useEffect สำหรับการซ่อน/แสดงปุ่ม Navigation
  useEffect(() => {
    if (isHovering) {
      setShowNavButtons(true);
      if (navVisibilityTimeoutRef.current) clearTimeout(navVisibilityTimeoutRef.current);
    } else {
      resetNavVisibilityTimer();
    }
    return () => {
      if (navVisibilityTimeoutRef.current) clearTimeout(navVisibilityTimeoutRef.current);
    };
  }, [isHovering, resetNavVisibilityTimer]);

  // useEffect สำหรับ Initial setup และ Resize handler
  useEffect(() => {
    const checkIsMobile = () => window.innerWidth < 1024;

    const setupSlider = () => {
      if (!carouselRef.current || !slideContainerRef.current) return;
      
      setIsMobile(checkIsMobile()); // ✅ [เพิ่ม] ตรวจสอบขนาดจอเมื่อ setup
      
      const newCenteringOffset = calculateCenteringOffset();
      setSlideContainerOffset(newCenteringOffset);
      setTransform(newCenteringOffset + currentTranslate, false);   
    };
    
    const initialTimeoutId = setTimeout(setupSlider, 50); 
    
    const handleResize = () => {
      if (!isDragging) {
        if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
        setIsTransitioning(false);
        setupSlider();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(initialTimeoutId);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
      if (navVisibilityTimeoutRef.current) clearTimeout(navVisibilityTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculateCenteringOffset, setTransform, totalSlides]); // deps ถูกต้องแล้ว

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
    if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    
    resetNavVisibilityTimer(); // ✅ [เพิ่ม] รีเซ็ต timer เมื่อเริ่มลาก
    setIsTransitioning(false); 
    setIsDragging(true);
    setDragStartPos(getPositionX(event.nativeEvent));
    setTransform(slideContainerOffset + currentTranslate, false);
  }, [totalSlides, isTransitioning, slideContainerOffset, currentTranslate, setTransform, resetNavVisibilityTimer]);

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
    const threshold = effectiveSlideWidth * 0.2;

    if (currentTranslate < -threshold) {
      goToNext(false);
    } else if (currentTranslate > threshold) {
      goToPrevious();
    } else {
      setTransform(slideContainerOffset, true);
    }
    
    setCurrentTranslate(0);
  }, [isDragging, currentTranslate, getEffectiveSlideWidth, goToNext, goToPrevious, slideContainerOffset, setTransform]);

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
    }
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mouseleave', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isDragging, dragMove, dragEnd]);

  if (totalSlides === 0) {
    return <div className={`${styles.carousel} ${styles.loadingState}`} style={{ height: '300px' }}><p>Loading slides...</p></div>;
  }
  
  const extendedSlidesToRender: (SlideData & { originalIndex: number; uniqueKey: string })[] = [];
  if (totalSlides > 0) {
    const halfRendered = Math.floor(NUM_RENDERED_SLIDES / 2);
    for (let i = -halfRendered; i <= halfRendered; i++) {
      const slideDataIndex = getLoopedIndex(currentIndex + i);
      extendedSlidesToRender.push({
        ...slides[slideDataIndex],
        originalIndex: slideDataIndex,
        uniqueKey: `slide-${slides[slideDataIndex].id}-loop-${i}`
      });
    }
  }
  
  const currentLogicalIndex = getLoopedIndex(currentIndex);
  
  // ✅ [ปรับปรุง] คำนวณความกว้างของ slide item แยกต่างหาก
  const getSlideItemWidth = () => {
      if(isMobile) return getEffectiveSlideWidth();
      return DESKTOP_FIXED_SLIDE_WIDTH;
  }

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
    >
      <div
        ref={slideContainerRef}
        className={`${styles.slideContainer} ${isDragging ? styles.dragging : ''}`}
        onMouseDown={dragStart}
        // ✅ [ปรับปรุง] gap จะเป็น 0 บน mobile
        style={{ gap: isMobile ? `0px` : `${SLIDE_GAP}px` }}
      >
        {extendedSlidesToRender.map((slide, index) => {
            const isCentralSlide = index === Math.floor(NUM_RENDERED_SLIDES / 2);
            return (
             <div
               key={slide.uniqueKey}
               className={styles.slide}
               // ✅ [ปรับปรุง] กำหนดความกว้างของสไลด์ให้ถูกต้องตาม responsive state
               style={{ width: `${getSlideItemWidth()}px` }}
               data-is-active={isCentralSlide}
               aria-live={isCentralSlide ? "polite" : "off"}
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
                 sizes={`(max-width: 1023px) 100vw, ${DESKTOP_FIXED_SLIDE_WIDTH}px`}
                 className={styles.slideImage}
                 draggable={false}
               />
               <div className={styles.slideOverlay}></div>
               <div className={styles.slideContent}>
                 <div>
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
            // ✅ [เพิ่ม] class สำหรับซ่อนปุ่ม
            className={`${styles.navButton} ${styles.navButtonPrev} ${!showNavButtons ? styles.navButtonHidden : ''}`}
            aria-label="สไลด์ก่อนหน้า"
            disabled={isTransitioning || isDragging}
          >
            <ArrowLeft size={20} strokeWidth={2.5}/>
          </button>
          <button
            onClick={() => goToNext(false)}
            // ✅ [เพิ่ม] class สำหรับซ่อนปุ่ม
            className={`${styles.navButton} ${styles.navButtonNext} ${!showNavButtons ? styles.navButtonHidden : ''}`}
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