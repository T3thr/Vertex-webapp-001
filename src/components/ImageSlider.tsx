// src/components/ImageSlider.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import styles from "./ImageSlider.module.css";

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

interface ImageSliderProps {
  slides: SlideData[];
  autoPlayInterval?: number;
}

const DESKTOP_FIXED_SLIDE_WIDTH = 1200; // กำหนดความกว้างคงที่ของสไลด์บนเดสก์ท็อป

export function ImageSlider({ slides, autoPlayInterval = 8000 }: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0); // ดัชนีของสไลด์ที่ใช้งานจริง (logical index)
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const [startPos, setStartPos] = useState(0);
  const [currentTranslate, setCurrentTranslate] = useState(0);
  const [prevTranslate, setPrevTranslate] = useState(0);

  const animationIdRef = useRef<number>(0);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const slideContainerRef = useRef<HTMLDivElement>(null);

  // ฟังก์ชันสำหรับหาความกว้างของสไลด์ปัจจุบัน (responsive บน mobile, fixed บน desktop)
  const getSlideWidth = useCallback((): number => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024 && slides.length > 1) { // 1024px คือ breakpoint สำหรับ desktop
      return DESKTOP_FIXED_SLIDE_WIDTH;
    }
    return containerRef.current?.offsetWidth || 0;
  }, [slides.length]);


  const getSlideIndex = useCallback((index: number): number => {
    const slideCount = slides.length;
    if (slideCount === 0) return 0;
    return ((index % slideCount) + slideCount) % slideCount;
  }, [slides.length]);

  // Animation loop ขณะลาก
  const animationLoop = useCallback(() => {
    if (slideContainerRef.current) {
      // บน Desktop, -100% จะหมายถึง DESKTOP_FIXED_SLIDE_WIDTH
      // บน Mobile, -100% จะหมายถึงความกว้างของ viewport
      // การคำนวณ transform นี้จะทำให้สไลด์ตรงกลาง (ตาม DOM structure 3 สไลด์) อยู่ในตำแหน่งเริ่มต้น
      // และ CSS data-position-in-loop จะจัดการเรื่อง peeking และ centering ที่แท้จริงบน desktop
      const baseTranslatePercentage = slides.length > 1 ? -100 : 0; // ถ้ามีสไลด์เดียว ไม่ต้องเลื่อน base
      slideContainerRef.current.style.transform = `translateX(calc(${baseTranslatePercentage}% + ${currentTranslate}px))`;
    }
    if (isDragging) {
      animationIdRef.current = requestAnimationFrame(animationLoop);
    }
  }, [currentTranslate, isDragging, slides.length]);

  const handleSlideChange = useCallback((direction: 'next' | 'prev') => {
    if (isAnimating || slides.length <= 1) return;

    setIsAnimating(true);
    const slideWidth = getSlideWidth(); // ความกว้างของสไลด์ (fixed หรือ responsive)
    // targetTranslate คือระยะที่ slideContainer ต้องเลื่อนไปเพื่อแสดงสไลด์ถัดไป/ก่อนหน้า
    // ถ้าเป็น next, เลื่อนไปทางซ้าย (ลบ), ถ้าเป็น prev, เลื่อนไปทางขวา (บวก)
    // เมื่อ currentTranslate ถูกเปลี่ยน, animationLoop หรือ useEffect ด้านล่างจะอัปเดต transform
    const targetTranslate = direction === 'next' ? -slideWidth : slideWidth;


    if (slideContainerRef.current) {
      slideContainerRef.current.classList.remove(styles.dragging); // เอา class dragging ออกเพื่อให้มี transition
    }

    setCurrentTranslate(targetTranslate); // ตั้งค่า currentTranslate เพื่อเริ่ม animation ผ่าน CSS transition

    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    // รอให้ CSS transition (0.6s) เสร็จสิ้น
    transitionTimeoutRef.current = setTimeout(() => {
      const newLogicalIndex = getSlideIndex(direction === 'next' ? currentIndex + 1 : currentIndex - 1);
      setCurrentIndex(newLogicalIndex); // อัปเดต logical index ของสไลด์ปัจจุบัน

      // Reset transform และ state สำหรับการสไลด์ครั้งต่อไป
      if (slideContainerRef.current) {
        slideContainerRef.current.classList.add(styles.dragging); // ใส่ class dragging เพื่อปิด transition ชั่วคราว
        setCurrentTranslate(0); // Reset currentTranslate สำหรับสไลด์ "ชุดใหม่" ที่จะแสดง
        setPrevTranslate(0);

        // บังคับ reflow เพื่อให้ browser รับรู้การเปลี่ยนแปลง style ก่อนที่จะเอา class dragging ออก
        // ซึ่งจะทำให้ transform ถูก reset ทันทีโดยไม่มี animation
        const _ = slideContainerRef.current?.offsetHeight;

        slideContainerRef.current.classList.remove(styles.dragging); // เอา class dragging ออก เพื่อให้พร้อมสำหรับ transition ครั้งต่อไป
      }
      setIsAnimating(false);
    }, 600); // ระยะเวลาควรตรงกับ transition-duration ใน CSS

  }, [isAnimating, slides.length, getSlideWidth, currentIndex, getSlideIndex]);


  const goToNext = useCallback(() => {
    if (isDragging) return;
    handleSlideChange('next');
  }, [isDragging, handleSlideChange]);

  const goToPrevious = useCallback(() => {
    if (isDragging) return;
    handleSlideChange('prev');
  }, [isDragging, handleSlideChange]);

  const goToSlide = useCallback((slideIndex: number) => {
    if (isDragging || isAnimating || slides.length <= 1 ) return;

    const newLogicalIndex = getSlideIndex(slideIndex);
    if (newLogicalIndex === currentIndex) return;

    // การเปลี่ยนไปยังสไลด์ที่ระบุโดยตรง (เช่น คลิก dot)
    // จำเป็นต้องมีการจัดการที่ซับซ้อนกว่าถ้าต้องการ animation ที่ราบรื่นเหมือน next/prev
    // สำหรับตอนนี้, จะเป็นการ "snap" ไปยังสไลด์นั้นๆ โดยการอัปเดต currentIndex
    // ซึ่งจะทำให้ extendedSlides re-render และ useEffect ด้านล่างจะปรับ transform
    setCurrentIndex(newLogicalIndex);

    if (slideContainerRef.current) {
      slideContainerRef.current.classList.add(styles.dragging);
      setCurrentTranslate(0);
      setPrevTranslate(0);
      const _ = slideContainerRef.current?.offsetHeight;
      slideContainerRef.current.classList.remove(styles.dragging);
    }
  }, [isDragging, isAnimating, slides.length, getSlideIndex, currentIndex]);

  // Autoplay
  useEffect(() => {
    if (isHovering || slides.length <= 1 || isDragging || isAnimating) {
      return;
    }
    const timer = setTimeout(goToNext, autoPlayInterval);
    return () => clearTimeout(timer);
  }, [currentIndex, goToNext, slides.length, autoPlayInterval, isHovering, isDragging, isAnimating]);


  const getPositionX = (event: MouseEvent | TouchEvent) => {
    return event.type.includes('mouse')
      ? (event as MouseEvent).clientX
      : (event as TouchEvent).touches[0].clientX;
  };

  // Handle resize
  useEffect(() => {
    const performResize = () => {
      if (!isDragging && !isAnimating && containerRef.current && slideContainerRef.current) {
        slideContainerRef.current.classList.add(styles.dragging); // ปิด transition ชั่วคราว
        setCurrentTranslate(0); // Reset translate
        setPrevTranslate(0);
        // บังคับ reflow
        const _ = slideContainerRef.current?.offsetHeight;
        // `style.transform` จะถูกอัปเดตโดย useEffect ด้านล่างที่ขึ้นกับ `currentTranslate`
        slideContainerRef.current.classList.remove(styles.dragging); // เปิด transition กลับ
      }
    };

    if (typeof window !== "undefined") {
      // เรียก performResize ครั้งแรกเพื่อให้แน่ใจว่า layout ถูกต้อง (เช่น หลัง SSR หรือ client-side nav)
      const initTimeout = setTimeout(performResize, 0);
      window.addEventListener('resize', performResize);

      return () => {
        clearTimeout(initTimeout);
        window.removeEventListener('resize', performResize);
      };
    }
  }, [isDragging, isAnimating]); // ไม่มี slides.length หรือ getSlideWidth เพราะ getSlideWidth จะถูกเรียกใช้เมื่อจำเป็น


  const dragStart = useCallback((event: MouseEvent | TouchEvent) => {
    if (slides.length <= 1 || isAnimating) return;

    if (event.type === 'mousedown') {
      (event as MouseEvent).preventDefault();
    }

    setIsDragging(true);
    setStartPos(getPositionX(event));
    setPrevTranslate(currentTranslate); // เก็บ translate ปัจจุบันไว้

    if (slideContainerRef.current) {
      slideContainerRef.current.classList.add(styles.dragging); // ปิด transition ขณะลาก
    }
    animationIdRef.current = requestAnimationFrame(animationLoop); // เริ่ม animation loop สำหรับการลาก
  }, [slides.length, isAnimating, currentTranslate, animationLoop, getPositionX]);

  const dragMove = useCallback((event: MouseEvent | TouchEvent) => {
    if (!isDragging) return;

    const currentPosition = getPositionX(event);
    const diff = currentPosition - startPos;
    setCurrentTranslate(prevTranslate + diff); // อัปเดต currentTranslate ตามการลาก
  }, [isDragging, startPos, prevTranslate, getPositionX]);

  const dragEnd = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);
    cancelAnimationFrame(animationIdRef.current);

    if (slideContainerRef.current) {
      slideContainerRef.current.classList.remove(styles.dragging); // เปิด transition กลับ
    }

    const slideWidth = getSlideWidth();
    const threshold = slideWidth * 0.2; // เกณฑ์ในการตัดสินใจว่าจะเปลี่ยนสไลด์หรือไม่

    if (currentTranslate < -threshold) { // ลากไปทางซ้ายมากพอ
      handleSlideChange('next');
    } else if (currentTranslate > threshold) { // ลากไปทางขวามากพอ
      handleSlideChange('prev');
    } else {
      // ลากไม่ถึงเกณฑ์, กลับไปที่ตำแหน่งเดิม (ของสไลด์ปัจจุบัน)
      setCurrentTranslate(0); // จะทำให้ transform กลับไปที่ -100% (หรือตำแหน่ง base)
      setPrevTranslate(0);
    }
  }, [isDragging, currentTranslate, getSlideWidth, handleSlideChange]);

  // Event handlers สำหรับ touch
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const targetElement = e.target as HTMLElement;
    if (targetElement.closest('a, button')) { // ป้องกันการลากถ้าเริ่มบน link หรือ button
      return;
    }
    dragStart(e.nativeEvent);
  }, [dragStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    dragMove(e.nativeEvent);
  }, [dragMove]);

  // Event handlers สำหรับ mouse
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const targetElement = e.target as HTMLElement;
    if (targetElement.closest('a, button')) {
      return;
    }
    dragStart(e.nativeEvent);
  }, [dragStart]);

  // Add/remove global event listeners for mouse move/up
  useEffect(() => {
    const moveHandler = (e: MouseEvent) => dragMove(e);
    const upHandler = () => dragEnd();

    if (isDragging) {
      document.addEventListener('mousemove', moveHandler);
      document.addEventListener('mouseup', upHandler);
      document.addEventListener('mouseleave', upHandler); // จัดการกรณีลากออกนอกหน้าต่าง
    }

    return () => {
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', upHandler);
      document.removeEventListener('mouseleave', upHandler);
    };
  }, [isDragging, dragMove, dragEnd]);

  // useEffect นี้จะคอยอัปเดต transform ของ slideContainer เมื่อ currentTranslate เปลี่ยนแปลง (และไม่ได้กำลังลาก)
  // หรือเมื่อ currentIndex เปลี่ยน (ซึ่งจะ reset currentTranslate เป็น 0)
  useEffect(() => {
    if (!isDragging && slideContainerRef.current) {
      // baseTranslatePercentage: บน mobile/desktop, -100% หมายถึงการเลื่อน slideContainer เพื่อให้สไลด์ "ตรงกลาง" (ตาม DOM structure 3 สไลด์)
      // มาอยู่ในตำแหน่งเริ่มต้นของ viewport ของมันเอง (คือ slideContainer)
      // CSS `data-position-in-loop` จะจัดการเรื่องการ peeking และการจัดให้อยู่ตรงกลาง viewport จริงๆ บน desktop
      const baseTranslatePercentage = slides.length > 1 ? -100 : 0;
      slideContainerRef.current.style.transform = `translateX(calc(${baseTranslatePercentage}% + ${currentTranslate}px))`;
    }
  }, [currentTranslate, isDragging, slides.length]); // เพิ่ม slides.length เพราะ baseTranslatePercentage ขึ้นกับมัน

  if (!slides || slides.length === 0) {
    return (
      <div className={`${styles.carousel} bg-secondary animate-pulse flex items-center justify-center`} style={{ height: '400px' }}> {/* Default height */}
        <p className="text-muted-foreground">กำลังโหลดสไลด์...</p>
      </div>
    );
  }

  // สร้าง array ของสไลด์ที่จะแสดงผล (สไลด์ก่อนหน้า, ปัจจุบัน, ถัดไป)
  // เพื่อให้เกิด infinite loop illusion
  const extendedSlides = [];
  if (slides.length > 0) {
    if (slides.length === 1) { // กรณีมีสไลด์เดียว
        extendedSlides.push({
            ...slides[0],
            originalIndex: 0,
            positionInLoop: 0, // สไลด์เดียว อยู่ตรงกลางเสมอ
        });
    } else { // กรณีมีมากกว่า 1 สไลด์
        for (let i = -1; i <= 1; i++) { // สร้าง 3 สไลด์: prev, current, next
            const slideDataIndex = getSlideIndex(currentIndex + i);
            extendedSlides.push({
                ...slides[slideDataIndex],
                originalIndex: slideDataIndex,
                positionInLoop: i, // -1 (prev), 0 (current), 1 (next)
            });
        }
    }
  }


  return (
    <div
      ref={containerRef}
      className={styles.carousel}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={dragEnd}
      onMouseDown={handleMouseDown}
      role="region"
      aria-roledescription="carousel"
      aria-label="โปรโมชั่นและเรื่องเด่น"
      style={{ userSelect: isDragging ? 'none' : 'auto' }} // ป้องกันการ select text ขณะลาก
    >
      <div
        ref={slideContainerRef}
        className={`${styles.slideContainer} ${isDragging ? styles.dragging : ''}`}
        // ความกว้างของ slideContainer จะเป็น N เท่าของความกว้างสไลด์ (N = จำนวนสไลด์ใน extendedSlides)
        // บน mobile: slide width = 100% viewport, container = 300% viewport
        // บน desktop: slide width = 1200px, container = 3 * 1200px = 3600px
        // แต่ style width นี้จะถูกจัดการโดย CSS ผ่าน flex หรือ implicit width ของ children ได้ดีกว่า
        // การกำหนด width โดยตรงที่นี่อาจไม่จำเป็นถ้า CSS จัดการได้ดี
        style={{
           width: slides.length > 1 ? `${extendedSlides.length * 100}%` : '100%', // ถ้ามีสไลด์เดียว container กว้าง 100%
        }}
      >
        {extendedSlides.map((slide) => (
          <div
            // key ที่ไม่ซ้ำกันและเสถียรสำคัญมากสำหรับการ re-render ที่ถูกต้อง
            key={`slide-${slide.id}-${slide.originalIndex}-loopPos${slide.positionInLoop}`}
            className={styles.slide}
            data-position-in-loop={slide.positionInLoop} // สำหรับ CSS styling (peeking effect)
            aria-live={slide.positionInLoop === 0 ? "polite" : "off"} // ประกาศการเปลี่ยนแปลงเฉพาะสไลด์ที่ active
            aria-atomic="true"
            // aria-hidden={slide.positionInLoop !== 0} // สไลด์ที่ไม่ active ถูกซ่อนจาก accessibility tree
          >
            <Image
              src={slide.imageUrl}
              alt={slide.title}
              fill // ให้ Image component จัดการขนาดตาม parent (.slide)
              priority={slide.positionInLoop === 0} // โหลดภาพปัจจุบันก่อน
              // sizes ช่วยให้ browser เลือก source ที่เหมาะสมตามขนาด viewport
              // (max-width: 1023px) สำหรับ mobile (เต็มความกว้าง)
              // (min-width: 1024px) สำหรับ desktop (ภาพขนาด 1200px)
              sizes="(max-width: 1023px) 100vw, 1200px"
              className={styles.slideImage}
              draggable={false} // ป้องกันการลากภาพ (เรามีการลากสไลเดอร์เอง)
              unoptimized={false} // เปิด optimization ของ Next/Image
            />

            <div className={styles.slideOverlay}></div> {/* Overlay เพิ่มความคมชัดให้ text */}

            {/* แสดงเนื้อหาเฉพาะสไลด์ที่ "ควรจะ" active (positionInLoop === 0)
                CSS จะจัดการการซ่อน/แสดง content ของสไลด์ที่ peek ออกมาบน desktop */}
            {slide.positionInLoop === 0 && (
              <div className={styles.slideContent}>
                <div className={styles.slideContentEnter}> {/* Animation container สำหรับ content */}
                  {slide.category && (
                    <span
                      className={styles.slideCategory}
                      style={slide.highlightColor ? { backgroundColor: slide.highlightColor } : {}}
                    >
                      {slide.category}
                    </span>
                  )}
                  <h2 className={styles.slideTitle}>
                    <Link
                      href={slide.link}
                      className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 rounded-sm"
                      draggable={false}
                      onClick={(e) => e.stopPropagation()} // ป้องกันการ trigger drag ของ slider
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
                    <div className={styles.slideButtonEnter}> {/* Animation container สำหรับ button */}
                      <Link
                        href={slide.primaryAction.href}
                        className={styles.slideButton}
                        draggable={false}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {slide.primaryAction.label}
                        <ExternalLink size={18} />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ปุ่ม Navigation และ Dots (แสดงเมื่อมีมากกว่า 1 สไลด์) */}
      {slides.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className={`${styles.navButton} ${styles.navButtonPrev}`}
            aria-label="สไลด์ก่อนหน้า"
            disabled={isAnimating || isDragging}
          >
            <ArrowLeft size={22} />
          </button>
          <button
            onClick={goToNext}
            className={`${styles.navButton} ${styles.navButtonNext}`}
            aria-label="สไลด์ถัดไป"
            disabled={isAnimating || isDragging}
          >
            <ArrowRight size={22} />
          </button>

          <div className={styles.dots}>
            {slides.map((_, slideIdx) => (
              <button
                key={`dot-${slideIdx}`}
                onClick={() => goToSlide(slideIdx)}
                className={`${styles.dot} ${getSlideIndex(currentIndex) === slideIdx ? styles.active : ''}`}
                aria-label={`ไปที่สไลด์ ${slideIdx + 1}`}
                aria-current={getSlideIndex(currentIndex) === slideIdx ? "true" : "false"}
                disabled={isAnimating || isDragging}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}