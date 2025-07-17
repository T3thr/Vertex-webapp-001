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
const NAV_FADE_TIMEOUT = 2000;

// Advanced image optimization
const getSlideImageProps = (isCentral: boolean, isNearCenter: boolean) => ({
  quality: isCentral ? 95 : 85, // Higher quality for central slide
  priority: isCentral || isNearCenter,
  placeholder: 'blur' as const,
  blurDataURL: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAUAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAhEQACAQIHAQAAAAAAAAAAAAABAgADBAUREiEiMVFhkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==',
  sizes: "(max-width: 1023px) 100vw, 600px",
});

export function ImageSlider({ slides, autoPlayInterval = 7000 }: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [dragStartPos, setDragStartPos] = useState(0);
  const [currentTranslate, setCurrentTranslate] = useState(0);
  const [slideContainerOffset, setSlideContainerOffset] = useState(0);
  
  // Navigation visibility state
  const [showNavButtons, setShowNavButtons] = useState(true);
  const navVisibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const carouselRef = useRef<HTMLDivElement>(null);
  const slideContainerRef = useRef<HTMLDivElement>(null);

  const totalSlides = slides.length;

  // Optimized slide width calculation
  const getEffectiveSlideWidth = useCallback((): number => {
    if (typeof window !== "undefined" && carouselRef.current) {
      if (isMobile || totalSlides <= 1) {
        return carouselRef.current.offsetWidth;
      }
      return Math.min(DESKTOP_FIXED_SLIDE_WIDTH, carouselRef.current.offsetWidth) + SLIDE_GAP;
    }
    return DESKTOP_FIXED_SLIDE_WIDTH + SLIDE_GAP;
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
  
  // Navigation visibility management
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

    if (isMobile) {
        return -(centralSlideInDomIndex * effectiveSlideWidth);
    }
    
    const slideWidthWithoutGap = effectiveSlideWidth - SLIDE_GAP;
    return (carouselWidth / 2) - (slideWidthWithoutGap / 2) - (centralSlideInDomIndex * effectiveSlideWidth);
  }, [getEffectiveSlideWidth, isMobile]);

  const goToNext = useCallback((isAutoPlay: boolean = false) => {
    if (isTransitioning || totalSlides <= 1) return;
    setIsTransitioning(true);
    resetNavVisibilityTimer();

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
    resetNavVisibilityTimer();

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
    
    resetNavVisibilityTimer();
    setIsTransitioning(true);

    const effectiveSlideWidth = getEffectiveSlideWidth();
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

  // Autoplay management
  useEffect(() => {
    if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    if (autoPlayInterval && !isHovering && !isDragging && !isTransitioning && totalSlides > 1) {
      autoPlayTimeoutRef.current = setTimeout(() => goToNext(true), autoPlayInterval);
    }
    return () => {
      if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    };
  }, [currentIndex, goToNext, autoPlayInterval, isHovering, isDragging, isTransitioning, totalSlides]);
  
  // Navigation visibility management
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

  // Setup and resize handling
  useEffect(() => {
    const checkIsMobile = () => window.innerWidth < 1024;

    const setupSlider = () => {
      if (!carouselRef.current || !slideContainerRef.current) return;
      
      setIsMobile(checkIsMobile());
      
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
  }, [calculateCenteringOffset, setTransform, totalSlides, currentTranslate, isDragging]);

  // Touch and mouse interaction handlers
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
    
    resetNavVisibilityTimer();
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
  
  // Calculate slide item width
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
        style={{ gap: isMobile ? `0px` : `${SLIDE_GAP}px` }}
      >
        {extendedSlidesToRender.map((slide, index) => {
            const isCentralSlide = index === Math.floor(NUM_RENDERED_SLIDES / 2);
            const isNearCenter = Math.abs(index - Math.floor(NUM_RENDERED_SLIDES / 2)) === 1;
            const imageProps = getSlideImageProps(isCentralSlide, isNearCenter);
            
            return (
             <div
               key={slide.uniqueKey}
               className={styles.slide}
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
                 {...imageProps}
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
            className={`${styles.navButton} ${styles.navButtonPrev} ${!showNavButtons ? styles.navButtonHidden : ''}`}
            aria-label="สไลด์ก่อนหน้า"
            disabled={isTransitioning || isDragging}
          >
            <ArrowLeft size={20} strokeWidth={2.5}/>
          </button>
          <button
            onClick={() => goToNext(false)}
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