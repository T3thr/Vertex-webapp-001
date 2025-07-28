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
  const [showNavButtons, setShowNavButtons] = useState(false);

  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const carouselRef = useRef<HTMLDivElement>(null);
  const slideContainerRef = useRef<HTMLDivElement>(null);

  const totalSlides = slides.length;

  // Optimized slide width calculation
  const getEffectiveSlideWidth = useCallback((): number => {
    if (carouselRef.current) {
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
    const element = slideContainerRef.current;
    if (!element) return;

    element.style.transition = useTransition
      ? `transform ${TRANSITION_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`
      : 'none';

    // The key to fixing the flicker is to ensure the browser registers
    // the new 'transition' value *before* it gets the new 'transform' value.
    // Forcing a reflow by reading a layout property like offsetHeight does the trick.
    if (useTransition) {
      void element.offsetHeight; // Force reflow to prevent flickering
    }
    
    element.style.transform = `translateX(${translateX}px)`;
  }, []);

  // Navigation visibility management
  const resetNavVisibilityTimer = useCallback(() => {
    // This function is now only for resetting visibility on interaction, not for timeout.
    setShowNavButtons(true);
  }, []);

  const calculateCenteringOffset = useCallback(() => {
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
      setCurrentIndex(prev => prev + 1);
      setTransform(slideContainerOffset, false);
      setIsTransitioning(false);
    }, TRANSITION_DURATION);
  }, [isTransitioning, totalSlides, slideContainerOffset, getEffectiveSlideWidth, setTransform, resetNavVisibilityTimer]);

  const goToPrevious = useCallback(() => {
    if (isTransitioning || totalSlides <= 1) return;
    setIsTransitioning(true);
    resetNavVisibilityTimer();

    const effectiveSlideWidth = getEffectiveSlideWidth();
    setTransform(slideContainerOffset + effectiveSlideWidth, true);

    transitionTimeoutRef.current = setTimeout(() => {
      setCurrentIndex(prev => prev - 1);
      setTransform(slideContainerOffset, false);
      setIsTransitioning(false);
    }, TRANSITION_DURATION);
  }, [isTransitioning, totalSlides, slideContainerOffset, getEffectiveSlideWidth, setTransform, resetNavVisibilityTimer]);

  const goToSlide = useCallback((slideIndex: number) => {
    if (isTransitioning || totalSlides <= 1 || slideIndex === getLoopedIndex(currentIndex)) return;
    setIsTransitioning(true);
    resetNavVisibilityTimer();

    const currentLogicalIndex = getLoopedIndex(currentIndex);
    let diff = slideIndex - currentLogicalIndex;

    if (Math.abs(diff) > totalSlides / 2) {
      diff = diff > 0 ? diff - totalSlides : diff + totalSlides;
    }

    const effectiveSlideWidth = getEffectiveSlideWidth();
    const newOffset = calculateCenteringOffset();
    setSlideContainerOffset(newOffset); // Recalculate offset before transition
    const translateDistance = newOffset - (diff * effectiveSlideWidth);
    setTransform(translateDistance, true);

    transitionTimeoutRef.current = setTimeout(() => {
      setCurrentIndex(getLoopedIndex(currentIndex + diff));
      setTransform(newOffset, false);
      setIsTransitioning(false);
    }, TRANSITION_DURATION);
  }, [isTransitioning, totalSlides, currentIndex, getLoopedIndex, getEffectiveSlideWidth, setTransform, calculateCenteringOffset, resetNavVisibilityTimer]);

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 1024);

    const setupSlider = () => {
      checkIsMobile();
      const offset = calculateCenteringOffset();
      setSlideContainerOffset(offset);
      setTransform(offset, false);
    };

    const initialTimeoutId = setTimeout(setupSlider, 50);
    const handleResize = () => setupSlider();

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(initialTimeoutId);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);

    };
  }, [calculateCenteringOffset, setTransform]);

  const getPositionX = useCallback((event: MouseEvent | TouchEvent): number => {
    if (event.type.includes('mouse')) {
      return (event as MouseEvent).clientX;
    } else {
      const touchEvent = event as TouchEvent;
      const touches = touchEvent.touches.length > 0 ? touchEvent.touches : touchEvent.changedTouches;
      return touches[0]?.clientX || 0;
    }
  }, []);

  const dragStart = useCallback((event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (totalSlides <= 1 || isTransitioning) return;

    const targetElement = event.target as HTMLElement;
    if (targetElement.closest('a, button, input, textarea, select')) return;

    if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    if (event.type === 'mousedown') event.preventDefault();

    resetNavVisibilityTimer();
    setTransform(slideContainerOffset + currentTranslate, false);
    setIsTransitioning(false);
    setDragStartPos(getPositionX(event.nativeEvent));
    setIsDragging(true);
  }, [totalSlides, isTransitioning, resetNavVisibilityTimer, getPositionX, slideContainerOffset, currentTranslate, setTransform]);

  const dragMove = useCallback((event: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const currentPosition = getPositionX(event);
    let diff = currentPosition - dragStartPos;
    setCurrentTranslate(diff);
    setTransform(slideContainerOffset + diff, false);
  }, [isDragging, getPositionX, dragStartPos, slideContainerOffset, setTransform]);

  const dragEnd = useCallback(() => {
    if (!isDragging) return;

    const effectiveSlideWidth = getEffectiveSlideWidth();
    const threshold = effectiveSlideWidth * 0.25;

    setIsDragging(false);

    if (Math.abs(currentTranslate) > threshold) {
      if (currentTranslate < 0) {
        goToNext(false);
      } else {
        goToPrevious();
      }
    } else {
      setTransform(slideContainerOffset, true);
    }

    setCurrentTranslate(0);
  }, [isDragging, currentTranslate, getEffectiveSlideWidth, goToNext, goToPrevious, slideContainerOffset, setTransform]);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => dragMove(e);
    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isDragging) e.preventDefault();
      dragMove(e);
    };
    const handleGlobalMouseUp = () => dragEnd();
    const handleGlobalTouchEnd = () => dragEnd();

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('mouseleave', handleGlobalMouseUp);
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
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

  useEffect(() => {
    if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    if (autoPlayInterval && !isHovering && !isDragging && !isTransitioning && totalSlides > 1) {
      autoPlayTimeoutRef.current = setTimeout(() => goToNext(true), autoPlayInterval);
    }
  }, [currentIndex, isHovering, isDragging, isTransitioning, autoPlayInterval, totalSlides, goToNext]);

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
  
  const getSlideItemWidth = () => {
    if (isMobile || totalSlides <= 1) {
      return carouselRef.current?.offsetWidth || 0;
    }
    return DESKTOP_FIXED_SLIDE_WIDTH;
  };

  return (
    <div
      ref={carouselRef}
      className={styles.carousel}
      onMouseEnter={() => {
        setIsHovering(true);
        setShowNavButtons(true);
      }}
      onMouseLeave={() => {
        setIsHovering(false);
        setShowNavButtons(false);
      }}
      onMouseDown={dragStart}
      onTouchStart={dragStart}
      role="region"
      aria-roledescription="carousel"
      aria-label="โปรโมชั่นและเรื่องเด่น"
    >
      <div
        ref={slideContainerRef}
        className={`${styles.slideContainer} ${isDragging ? styles.dragging : ''}`}
        style={{ gap: isMobile ? `0px` : `${SLIDE_GAP}px` }}
      >
        {extendedSlidesToRender.map((slide, index) => {
            const isCentralSlide = index === Math.floor(NUM_RENDERED_SLIDES / 2);
            const isNearCenter = Math.abs(index - Math.floor(NUM_RENDERED_SLIDES / 2)) === 1;
            const imageProps = getSlideImageProps(isCentralSlide, isNearCenter);
            
            return (
             <div
               key={index}
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
                key={slideIdx}
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