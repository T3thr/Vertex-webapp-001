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

export function ImageSlider({ slides, autoPlayInterval = 7000 }: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0); // ดัชนีของสไลด์ที่ใช้งานจริง (logical index)
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false); // สถานะกำลังลากหรือไม่
  const [isAnimating, setIsAnimating] = useState(false); // สถานะกำลังเล่นอนิเมชั่น (สำหรับการคลิก next/prev)
  
  const [startPos, setStartPos] = useState(0); // ตำแหน่งเริ่มต้นของการลาก (แกน X)
  const [currentTranslate, setCurrentTranslate] = useState(0); // ค่า translate ปัจจุบันสำหรับ offset จากจุดศูนย์กลาง
  const [prevTranslate, setPrevTranslate] = useState(0); // ค่า translate ก่อนหน้า (currentTranslate ณ ตอนเริ่มลาก)
  
  const animationIdRef = useRef<number>(0); // Ref สำหรับเก็บ ID ของ requestAnimationFrame
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref สำหรับ setTimeout ของ transition

  const containerRef = useRef<HTMLDivElement>(null);
  const slideContainerRef = useRef<HTMLDivElement>(null);

  // Helper function เพื่อเอา slide width ปัจจุบัน
  const getSlideWidth = useCallback(() => {
    return containerRef.current?.offsetWidth || 0;
  }, []);

  // คำนวณดัชนีสำหรับ infinite loop (ให้ index วนอยู่ในช่วงของ slides.length)
  const getSlideIndex = useCallback((index: number): number => {
    const slideCount = slides.length;
    if (slideCount === 0) return 0;
    return ((index % slideCount) + slideCount) % slideCount;
  }, [slides.length]);

  // ฟังก์ชันสำหรับ animation loop ขณะลาก
  const animationLoop = useCallback(() => {
    if (slideContainerRef.current) {
      // ใช้ calc(-100%) เพื่อให้สไลด์ตรงกลาง (extendedSlides[1]) เป็นหลัก
      // แล้วบวกด้วย currentTranslate ที่เป็น offset จากการลากหรืออนิเมชั่น
      slideContainerRef.current.style.transform = `translateX(calc(-100% + ${currentTranslate}px))`;
    }
    if (isDragging) {
      animationIdRef.current = requestAnimationFrame(animationLoop);
    }
  }, [currentTranslate, isDragging]);

  // ฟังก์ชันจัดการการเปลี่ยนสไลด์ (next/previous)
  const handleSlideChange = useCallback((direction: 'next' | 'prev') => {
    if (isAnimating || slides.length <= 1) return; // ถ้ากำลัง animate หรือมีสไลด์เดียว ไม่ต้องทำอะไร

    setIsAnimating(true);
    const slideWidth = getSlideWidth();
    const targetTranslate = direction === 'next' ? -slideWidth : slideWidth;

    // เปิด CSS transition (ลบ class 'dragging' ถ้ามี)
    if (slideContainerRef.current) {
      slideContainerRef.current.classList.remove(styles.dragging);
    }
    
    setCurrentTranslate(targetTranslate); // เริ่ม animate currentTranslate ไปยังเป้าหมาย

    // Clear timeout เก่า (ถ้ามี)
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    transitionTimeoutRef.current = setTimeout(() => {
      const newLogicalIndex = getSlideIndex(direction === 'next' ? currentIndex + 1 : currentIndex - 1);
      setCurrentIndex(newLogicalIndex); // อัปเดต currentIndex จริง

      // Snap กลับไปที่ตรงกลาง (currentTranslate = 0) โดยปิด CSS transition ชั่วคราว
      if (slideContainerRef.current) {
        slideContainerRef.current.classList.add(styles.dragging); // ใช้ class dragging เพื่อปิด transition
        setCurrentTranslate(0);
        setPrevTranslate(0); // รีเซ็ต prevTranslate ด้วย
        // Force reflow เล็กน้อยเพื่อให้ DOM อัปเดตก่อนคืน transition
        slideContainerRef.current.offsetHeight; 
        slideContainerRef.current.classList.remove(styles.dragging); // คืน transition
      }
      setIsAnimating(false);
    }, 600); // ระยะเวลาควรตรงกับ CSS transition duration (0.6s)

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
    if (isDragging || isAnimating || slides.length <=1 ) return;
    
    const newLogicalIndex = getSlideIndex(slideIndex);
    if (newLogicalIndex === currentIndex) return; // ถ้าเป็นสไลด์ปัจจุบัน ไม่ต้องทำอะไร

    // สำหรับ goToSlide เราจะ snap โดยตรง
    setCurrentIndex(newLogicalIndex);
    
    if (slideContainerRef.current) {
      slideContainerRef.current.classList.add(styles.dragging); // ปิด transition ชั่วคราว
      setCurrentTranslate(0); // รีเซ็ต offset
      setPrevTranslate(0);
      slideContainerRef.current.offsetHeight; // Force reflow
      slideContainerRef.current.classList.remove(styles.dragging); // คืน transition
    }
  }, [isDragging, isAnimating, slides.length, getSlideIndex, currentIndex]);

  // Auto play logic
  useEffect(() => {
    if (isHovering || slides.length <= 1 || isDragging || isAnimating) {
      if (transitionTimeoutRef.current && (isDragging || isAnimating || isHovering)) {
         // หากกำลัง drag, animate หรือ hover, และมี autoPlay timeout ค้างอยู่ให้เคลียร์
         // ส่วนการ resume จะจัดการโดย timeout ใหม่เมื่อเงื่อนไขเปลี่ยน
      }
      return; // หยุด auto play ถ้ามีการโต้ตอบ หรือกำลัง animate
    }
    const timer = setTimeout(goToNext, autoPlayInterval);
    return () => clearTimeout(timer);
  }, [currentIndex, goToNext, slides.length, autoPlayInterval, isHovering, isDragging, isAnimating]);


  // Touch และ Mouse handlers สำหรับ drag
  const getPositionX = (event: MouseEvent | TouchEvent) => {
    return event.type.includes('mouse') 
      ? (event as MouseEvent).clientX 
      : (event as TouchEvent).touches[0].clientX;
  };

  // Handle resize: จัดตำแหน่งสไลด์ใหม่เมื่อขนาดหน้าจอเปลี่ยน
  useEffect(() => {
    const handleResize = () => {
      if (!isDragging && !isAnimating) { // ทำต่อเมื่อไม่กำลังลากหรือ animate
        if (slideContainerRef.current) {
          slideContainerRef.current.classList.add(styles.dragging); // ปิด transition ชั่วคราว
          // คำนวณ transform ใหม่เพื่อให้สไลด์ปัจจุบัน (ตรงกลาง) แสดงผลถูกต้อง
          // เนื่องจาก currentTranslate คือ offset, การ reset เป็น 0 จะทำให้สไลด์ตรงกลางเสมอ
          setCurrentTranslate(0); 
          setPrevTranslate(0);
          slideContainerRef.current.offsetHeight; // Force reflow
          // อัปเดต transform ทันทีโดยไม่ต้องรอ animationLoop เพราะ isDragging เป็น false
          slideContainerRef.current.style.transform = `translateX(calc(-100% + 0px))`; 
          slideContainerRef.current.classList.remove(styles.dragging); // คืน transition
        }
      }
    };

    window.addEventListener('resize', handleResize);
    // เรียก handleResize ครั้งแรกเพื่อให้ตำแหน่งถูกต้องเมื่อโหลด
    handleResize(); 
    return () => window.removeEventListener('resize', handleResize);
  }, [getSlideWidth, isDragging, isAnimating]); // เพิ่ม isAnimating dependency

  // Drag start
  const dragStart = useCallback((event: MouseEvent | TouchEvent) => {
    if (slides.length <= 1 || isAnimating) return; // ไม่ให้ลากถ้ามีสไลด์เดียวหรือกำลัง animate
    
    // สำหรับ touch events, default behavior อาจจะยังคงทำให้เกิด scroll ได้
    // event.preventDefault() อาจจำเป็นในบางกรณีที่ซับซ้อนกว่านี้ แต่ระวังเรื่อง accessibility
    if (event.type === 'mousedown') {
      (event as MouseEvent).preventDefault(); // ป้องกันการลากรูปภาพ default ของ browser
    }
    
    setIsDragging(true);
    setStartPos(getPositionX(event));
    setPrevTranslate(currentTranslate); // เก็บ offset ปัจจุบันไว้ (ปกติควรเป็น 0 ถ้าไม่ได้ลากค้างไว้)
    
    if (slideContainerRef.current) {
      slideContainerRef.current.classList.add(styles.dragging); // ปิด CSS transition ขณะลาก
    }
    animationIdRef.current = requestAnimationFrame(animationLoop); // เริ่ม animation loop สำหรับการลาก
  }, [slides.length, isAnimating, currentTranslate, animationLoop]);

  // Drag move
  const dragMove = useCallback((event: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    
    const currentPosition = getPositionX(event);
    const diff = currentPosition - startPos;
    setCurrentTranslate(prevTranslate + diff); // อัปเดต currentTranslate ตามการลาก
  }, [isDragging, startPos, prevTranslate]);

  // Drag end
  const dragEnd = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    cancelAnimationFrame(animationIdRef.current); // หยุด animation loop
    
    if (slideContainerRef.current) {
      slideContainerRef.current.classList.remove(styles.dragging); // เปิด CSS transition อีกครั้ง
    }

    const slideWidth = getSlideWidth();
    const movedBy = currentTranslate - prevTranslate; // ระยะที่ลากจริงจากจุดที่เริ่มลากครั้งนี้
    
    // ตัดสินใจว่าจะเลื่อนไปสไลด์ไหน
    // ใช้ currentTranslate (offset จาก 0) เทียบกับ slideWidth ไม่ใช่ movedBy
    // ถ้า currentTranslate < -threshold -> next, > threshold -> prev
    const threshold = slideWidth * 0.2;

    if (currentTranslate < -threshold) { // ลากไปทางซ้ายมากพอ (ต้องการไป next)
      handleSlideChange('next');
    } else if (currentTranslate > threshold) { // ลากไปทางขวามากพอ (ต้องการไป prev)
      handleSlideChange('prev');
    } else {
      // ไม่ถึง threshold, กลับไปตำแหน่งเดิม (currentTranslate = 0)
      setCurrentTranslate(0); // จะ animate กลับเพราะ class 'dragging' ถูกลบแล้ว
    }
    // prevTranslate จะถูกรีเซ็ตเป็น 0 ใน handleSlideChange หรือเมื่อ setCurrentTranslate(0) ด้านบนทำงานเสร็จ (ถ้าไม่มีการเปลี่ยนสไลด์)
    // เพื่อความแน่นอน อาจจะ setPrevTranslate(0) ที่นี่ด้วยถ้า currentTranslate ถูกเซ็ตเป็น 0
    if (Math.abs(currentTranslate) <= threshold) {
        setPrevTranslate(0);
    }

  }, [isDragging, currentTranslate, prevTranslate, getSlideWidth, handleSlideChange]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // หาก target เป็น link หรือ button ภายในสไลด์, ไม่ควรเริ่ม drag
    const targetElement = e.target as HTMLElement;
    if (targetElement.closest('a, button')) {
      return;
    }
    dragStart(e.nativeEvent);
  }, [dragStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isDragging) { // ตรวจสอบ isDragging เพื่อให้แน่ใจว่า dragStart ได้ถูกเรียกแล้ว
        // ป้องกัน vertical scroll ขณะ horizontal swipe
        // e.preventDefault(); // อาจจะมีผลข้างเคียง พิจารณาตามความเหมาะสม
    }
    dragMove(e.nativeEvent);
  }, [isDragging, dragMove]);


  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // หาก target เป็น link หรือ button ภายในสไลด์, ไม่ควรเริ่ม drag
    const targetElement = e.target as HTMLElement;
    if (targetElement.closest('a, button')) {
      return;
    }
    dragStart(e.nativeEvent);
  }, [dragStart]);

  // useEffect สำหรับ mousemove และ mouseup listeners (ผูกกับ document)
  useEffect(() => {
    const moveHandler = (e: MouseEvent) => dragMove(e);
    const upHandler = () => dragEnd();

    if (isDragging) {
      document.addEventListener('mousemove', moveHandler);
      document.addEventListener('mouseup', upHandler);
      document.addEventListener('mouseleave', upHandler); // เพิ่ม mouseleave เผื่อลากออกนอกหน้าจอ
    }

    return () => {
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', upHandler);
      document.removeEventListener('mouseleave', upHandler);
    };
  }, [isDragging, dragMove, dragEnd]);

  // useEffect สำหรับการตั้งค่า transform เริ่มต้นและเมื่อ currentTranslate เปลี่ยนแปลง (นอกเหนือจากการลาก)
  useEffect(() => {
    if (!isDragging && slideContainerRef.current) {
      // เมื่อไม่ได้ลาก, การเปลี่ยนแปลง currentTranslate (เช่น จาก goToNext, goToPrevious, goToSlide, หรือ snap back)
      // ควรใช้ CSS transition ที่กำหนดไว้ใน .slideContainer
      slideContainerRef.current.style.transform = `translateX(calc(-100% + ${currentTranslate}px))`;
    }
  }, [currentTranslate, isDragging]);


  if (!slides || slides.length === 0) {
    return (
      <div className={`${styles.carousel} bg-secondary animate-pulse flex items-center justify-center`} style={{ height: '300px' /* fallback height */ }}>
        <p className="text-muted-foreground">กำลังโหลดสไลด์...</p>
      </div>
    );
  }

  // สร้าง slides array สำหรับ infinite loop (แสดง 3 slides: prev, current, next)
  // extendedSlides จะมี 3 items: [สไลด์ก่อนหน้า, สไลด์ปัจจุบัน, สไลด์ถัดไป]
  const extendedSlides = [];
  if (slides.length > 0) { // ป้องกัน error ถ้า slides ว่างหลังจากเช็คข้างบน แต่ก่อนจะ render
    for (let i = -1; i <= 1; i++) {
      const slideDataIndex = getSlideIndex(currentIndex + i);
      extendedSlides.push({
        ...slides[slideDataIndex],
        originalIndex: slideDataIndex, // เก็บ index เดิมของ slide จาก array `slides`
        positionInLoop: i, // -1 for prev, 0 for current, 1 for next
      });
    }
  }


  const currentVisibleSlide = slides[getSlideIndex(currentIndex)];

  return (
    <div
      ref={containerRef}
      className={styles.carousel}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={dragEnd} // dragEnd ถูกเรียกทั้ง touchEnd และ mouseUp
      onMouseDown={handleMouseDown}
      role="region"
      aria-roledescription="carousel"
      aria-label="โปรโมชั่นและเรื่องเด่น"
      style={{ userSelect: isDragging ? 'none' : 'auto' }} // ป้องกันการ select text ขณะลาก
    >
      <div 
        ref={slideContainerRef}
        className={`${styles.slideContainer} ${isDragging ? styles.dragging : ''}`}
        style={{
          // transform ถูกตั้งค่าโดย animationLoop (ขณะลาก) หรือ useEffect (เมื่อ currentTranslate เปลี่ยนนอกการลาก)
          // ค่าเริ่มต้นจะถูกตั้งโดย resize handler หรือ useEffect [currentTranslate, isDragging]
          width: `${extendedSlides.length * 100}%` // กว้าง 300% สำหรับ 3 สไลด์
        }}
      >
        {extendedSlides.map((slide) => (
          <div
            // key ควรจะ unique และ เสถียรต่อการ re-render ของ item นั้นๆ
            // การใช้ currentIndex ใน key อาจทำให้ slide ทั้งหมด re-mount บ่อยครั้ง
            // ใช้ originalIndex และ positionInLoop เพื่อความเสถียรมากขึ้น
            key={`slide-${slide.id}-${slide.originalIndex}-pos${slide.positionInLoop}`}
            className={styles.slide}
            aria-live={slide.positionInLoop === 0 ? "polite" : "off"} // เฉพาะสไลด์ปัจจุบันที่ควรประกาศการเปลี่ยนแปลง
            aria-atomic="true"
            // aria-hidden={slide.positionInLoop !== 0} // ซ่อนสไลด์ที่ไม่ใช่ปัจจุบันจาก screen reader
          >
            <Image
              src={slide.imageUrl}
              alt={slide.title}
              fill
              priority={slide.positionInLoop === 0} // ให้ priority กับสไลด์ปัจจุบัน
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" // ปรับ sizes ตาม layout จริง
              className={styles.slideImage}
              draggable={false} // ป้องกัน default browser drag
              unoptimized={false} // ตั้งเป็น true หากใช้ external image provider ที่ไม่รองรับ Next/Image optimization
            />
            
            <div className={styles.slideOverlay}></div>
            
            {/* แสดงเนื้อหาเฉพาะสไลด์ที่กำลัง active (positionInLoop === 0) */}
            {slide.positionInLoop === 0 && (
              <div className={styles.slideContent}>
                <div className={styles.slideContentEnter}> {/* animation class */}
                  {slide.category && (
                    <span 
                      className={styles.slideCategory}
                      style={slide.highlightColor ? { backgroundColor: slide.highlightColor } : {}}
                    >
                      {slide.category}
                    </span>
                  )}
                  <h2 className={styles.slideTitle}>
                    {/* เมื่อผู้ใช้ focus ที่ link นี้, การลาก slider ไม่ควรทำงาน */}
                    <Link 
                      href={slide.link} 
                      className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 rounded-sm"
                      draggable={false} // ป้องกันการลาก link โดยไม่ได้ตั้งใจ
                      onClick={(e) => e.stopPropagation()} // หยุด event propagation เพื่อไม่ให้ carousel ลาก
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
                    <div className={styles.slideButtonEnter}> {/* animation class */}
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

      {slides.length > 1 && (
        <>
          {/* Navigation Buttons */}
          <button
            onClick={goToPrevious}
            className={`${styles.navButton} ${styles.navButtonPrev}`}
            aria-label="สไลด์ก่อนหน้า"
            disabled={isAnimating || isDragging} // ปิดการใช้งานขณะ animate หรือ ลาก
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

          {/* Dots Indicator */}
          <div className={styles.dots}>
            {slides.map((_, slideIdx) => (
              <button
                key={slideIdx}
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