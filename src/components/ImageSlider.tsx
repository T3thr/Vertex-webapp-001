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
  const setTransform = useCallback((translateX: number, useTransition: boolean = true) => {
    if (slideContainerRef.current) {
      slideContainerRef.current.style.transition = useTransition
        ? `transform ${TRANSITION_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`
        : 'none';
      // ค่า transform สุดท้ายจะเป็น offset หลัก + ค่าที่เกิดจากการลาก (currentTranslate จะถูกรวมก่อนเรียก setTransform)
      slideContainerRef.current.style.transform = `translateX(${translateX}px)`;
    }
  }, []);

  // ฟังก์ชันคำนวณ offset เพื่อให้สไลด์ "ปัจจุบัน" (ตัวกลางใน DOM) อยู่ตรงกลาง carousel
  const calculateCenteringOffset = useCallback((): number => {
    if (!carouselRef.current) return 0;
    const effectiveSlideWidth = getEffectiveSlideWidth();
    const carouselWidth = carouselRef.current.offsetWidth;
    const centralSlideInDomIndex = Math.floor(NUM_RENDERED_SLIDES / 2); // index ของสไลด์ "ปัจจุบัน" ใน DOM array (extendedSlidesToRender)

    // Offset ที่ต้องการคือ: (จุดกึ่งกลาง carousel) - (จุดกึ่งกลางของสไลด์ "ปัจจุบัน" ใน DOM เมื่อ slideContainer อยู่ที่ 0)
    // จุดกึ่งกลาง carousel = carouselWidth / 2
    // ตำแหน่งเริ่มต้นของสไลด์ "ปัจจุบัน" ใน DOM = centralSlideInDomIndex * effectiveSlideWidth
    // จุดกึ่งกลางของสไลด์ "ปัจจุบัน" ใน DOM = (centralSlideInDomIndex * effectiveSlideWidth) + (effectiveSlideWidth / 2)
    // ดังนั้น offset = (carouselWidth / 2) - ((centralSlideInDomIndex * effectiveSlideWidth) + (effectiveSlideWidth / 2))
    return (carouselWidth / 2) - (effectiveSlideWidth / 2) - (centralSlideInDomIndex * effectiveSlideWidth);
  }, [getEffectiveSlideWidth]);


  // ฟังก์ชันหลักสำหรับจัดการการเปลี่ยนสไลด์
  const handleSlideChange = useCallback((direction: 'next' | 'prev') => {
    if (isTransitioning || totalSlides <= 1) return;

    setIsTransitioning(true);
    const effectiveSlideWidth = getEffectiveSlideWidth();
    const newLogicalCurrentIndex = getLoopedIndex(currentIndex + (direction === 'next' ? 1 : -1));

    // คำนวณค่า transform เป้าหมายสำหรับการ "เลื่อน" ไปยังสไลด์ถัดไป/ก่อนหน้า
    // slideContainerOffset คือ offset ปัจจุบันที่ทำให้สไลด์ "กลาง" อยู่ตรงกลาง carousel
    // เมื่อเลื่อน next, เรา "เปิดพื้นที่" ด้านขวา (translate ไปทางซ้าย, ค่าลบ)
    // เมื่อเลื่อน prev, เรา "เปิดพื้นที่" ด้านซ้าย (translate ไปทางขวา, ค่าบวก)
    const targetTransform = slideContainerOffset + (direction === 'next' ? -effectiveSlideWidth : effectiveSlideWidth);
    setTransform(targetTransform, true); // สั่งให้เลื่อนพร้อม animation

    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = setTimeout(() => {
      setCurrentIndex(newLogicalCurrentIndex); // อัปเดต logical currentIndex *หลังจาก* animation เสร็จ

      // --- ส่วนสำคัญสำหรับ Infinite Loop: "Reset" transform ---
      // คำนวณ offset ใหม่เพื่อให้สไลด์ "ตรงกลาง" ใน DOM (ที่ตอนนี้คือ newLogicalCurrentIndex) แสดงอยู่ตรงกลาง carousel
      const newCenteringOffset = calculateCenteringOffset();
      
      setSlideContainerOffset(newCenteringOffset); // อัปเดต offset หลัก
      setTransform(newCenteringOffset, false); // "Snap" ไปยังตำแหน่งใหม่โดยไม่มี animation
      setCurrentTranslate(0); // Reset ค่า translate ที่เกิดจากการลาก (ถ้ามี)

      setIsTransitioning(false);
    }, TRANSITION_DURATION);

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

    // สำหรับ goToSlide, เราจะ "snap" ไปยังสไลด์นั้นโดยตรง
    setCurrentIndex(newLogicalIndex); // อัปเดต logical index ทันที

    const newCenteringOffset = calculateCenteringOffset();
    setSlideContainerOffset(newCenteringOffset);
    setTransform(newCenteringOffset, false); // Snap to position
    setCurrentTranslate(0);
    
    // หากกำลัง transition จากการกด next/prev แล้วกด dot ทันที, ต้อง clear timeout เก่า
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    setIsTransitioning(false); // Reset transitioning state

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
      if (!carouselRef.current || !slideContainerRef.current) return; // ตรวจสอบว่า ref พร้อมใช้งาน
      
      const newCenteringOffset = calculateCenteringOffset();
      setSlideContainerOffset(newCenteringOffset);
      // currentTranslate คือ 0 ตอนเริ่มต้น หรือค่าที่ค้างจากการลากก่อน resize
      setTransform(newCenteringOffset + currentTranslate, false); 
    };

    // Setup ครั้งแรก
    // หน่วงเวลาเล็กน้อยเพื่อให้ layout ของ carouselRef.current ถูกต้องหลัง hydration
    // โดยเฉพาะเมื่อ carouselRef.current.offsetWidth ถูกใช้ในการคำนวณ
    const initialTimeoutId = setTimeout(setupSlider, 50); 


    const handleResize = () => {
      // ไม่ต้องทำอะไรถ้ากำลังลากหรือ transition เพราะจะทำให้ UX สะดุด
      if (!isDragging && !isTransitioning) {
        // คำนวณและปรับใช้ dimension/offset ใหม่
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
  // currentTranslate ไม่ควรอยู่ใน dependencies นี้ เพราะจะทำให้ effect ทำงานบ่อยเกินไปเมื่อลาก
  // getEffectiveSlideWidth ถูกรวมใน calculateCenteringOffset แล้ว
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculateCenteringOffset, setTransform, totalSlides]); // เพิ่ม calculateCenteringOffset ใน deps


  // Drag Handlers
  const getPositionX = (event: MouseEvent | TouchEvent): number => {
    return event.type.includes('mouse')
      ? (event as MouseEvent).clientX
      : (event as TouchEvent).touches[0].clientX;
  };

  const dragStart = useCallback((event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (totalSlides <= 1 || isTransitioning) return;
    // ป้องกันการลากเมื่อคลิกบน link หรือ button ภายในสไลด์
    const targetElement = event.target as HTMLElement;
    if (targetElement.closest('a, button')) return;

    // ป้องกัน default browser behavior เช่น การเลือก text หรือ scroll บน mobile เมื่อเริ่มลาก
    if (event.type === 'mousedown') {
      (event as React.MouseEvent<HTMLDivElement>).preventDefault();
    }
    // สำหรับ touch event, passive: false อาจจะต้องตั้งที่ event listener โดยตรง ซึ่ง Next.js ไม่ได้เปิดให้ตั้งง่ายๆ ผ่าน props
    // แต่การเรียก preventDefault() ใน touchmove (ถ้าจำเป็น) อาจช่วยได้

    setIsDragging(true);
    setDragStartPos(getPositionX(event.nativeEvent));
    // ปิด CSS transition ชั่วคราวขณะลากเพื่อให้การลากตอบสนองทันที
    if (slideContainerRef.current) {
      slideContainerRef.current.style.transition = 'none'; 
    }
    // ยกเลิก animation frame ก่อนหน้า (ถ้ามี)
    if (dragAnimationIdRef.current) {
      cancelAnimationFrame(dragAnimationIdRef.current);
      dragAnimationIdRef.current = null;
    }
  }, [totalSlides, isTransitioning]);

  const dragMove = useCallback((event: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    // สำหรับ touch events, อาจต้องการ preventDefault เพื่อป้องกันการ scroll ของหน้าจอ
    // if (event.type === 'touchmove') { event.preventDefault(); } // อาจจะ aggressive ไปหน่อย

    const currentPosition = getPositionX(event);
    const diff = currentPosition - dragStartPos; // delta X จากจุดเริ่มต้นลาก

    if (dragAnimationIdRef.current) cancelAnimationFrame(dragAnimationIdRef.current);
    dragAnimationIdRef.current = requestAnimationFrame(() => {
      // การ transform จะเป็น offset หลัก (slideContainerOffset) + diff จากการลากปัจจุบัน
      setTransform(slideContainerOffset + diff, false);
    });
    setCurrentTranslate(diff); // เก็บ delta ที่เกิดจากการลากปัจจุบัน (เทียบกับ slideContainerOffset)
  }, [isDragging, dragStartPos, slideContainerOffset, setTransform]);

  const dragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragAnimationIdRef.current) {
      cancelAnimationFrame(dragAnimationIdRef.current);
      dragAnimationIdRef.current = null;
    }

    const effectiveSlideWidth = getEffectiveSlideWidth();
    const threshold = effectiveSlideWidth * 0.20; // 20% threshold ของความกว้างสไลด์เพื่อเปลี่ยนสไลด์

    // currentTranslate คือผลต่างของการลาก
    if (currentTranslate < -threshold) { // ลากไปซ้าย (พอสมควร) -> next slide
      handleSlideChange('next');
    } else if (currentTranslate > threshold) { // ลากไปขวา (พอสมควร) -> prev slide
      handleSlideChange('prev');
    } else {
      // ลากไม่ถึง threshold, snap กลับไปที่ตำแหน่งเดิม (ก่อนเริ่มลาก)
      // ตำแหน่งเดิมคือ slideContainerOffset (เพราะ currentTranslate จะถูก reset เป็น 0 ใน handleSlideChange หรือถ้า snap กลับก็จะ reset ที่นี่)
      setTransform(slideContainerOffset, true); // กลับไปที่ offset เดิมพร้อม animation
      setCurrentTranslate(0); // Reset currentTranslate เมื่อ snap กลับ
    }
    // currentTranslate จะถูก reset เป็น 0 ภายใน handleSlideChange ด้วยเมื่อเปลี่ยนสไลด์สำเร็จ
  }, [isDragging, currentTranslate, getEffectiveSlideWidth, handleSlideChange, slideContainerOffset, setTransform]);


  // useEffect สำหรับ global mouse/touch event listeners ขณะลาก
  // เพื่อให้การลากยังทำงานได้แม้ cursor/finger จะออกนอก carousel container
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => dragMove(e);
    const handleGlobalMouseUp = () => dragEnd();
    // สำหรับ touch
    const handleGlobalTouchMove = (e: TouchEvent) => dragMove(e);
    const handleGlobalTouchEnd = () => dragEnd();


    if (isDragging) {
      // Mouse events
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('mouseleave', handleGlobalMouseUp); // จัดการกรณีลากเมาส์ออกนอกหน้าต่าง
      // Touch events
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: true }); // passive: true ถ้า dragMove ไม่ได้เรียก preventDefault()
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


  if (totalSlides === 0) {
    return (
      <div
        className={`${styles.carousel} ${styles.loadingState}`}
        // กำหนดความสูงเริ่มต้นสำหรับ loading state หรือเมื่อไม่มีสไลด์
        // ควรใช้ค่าที่สอดคล้องกับ aspect ratio ที่คาดหวัง
        style={{ height: '300px', minHeight: '300px' }} 
      >
        <p>Loading slides...</p> {/* สามารถปรับปรุง UI ของ loading state ได้ */}
      </div>
    );
  }

  // สร้าง array ของสไลด์ที่จะ render ใน DOM (สำหรับ infinite loop และ peeking)
  // จะ render NUM_RENDERED_SLIDES สไลด์ โดยมี currentIndex (logical) อยู่ตรงกลางของชุดนี้
  const extendedSlidesToRender: (SlideData & { originalIndex: number; positionInLoop: number })[] = [];
  if (totalSlides > 0) {
    const halfRendered = Math.floor(NUM_RENDERED_SLIDES / 2); // เช่น 1 ถ้า NUM_RENDERED_SLIDES = 3
    for (let i = -halfRendered; i <= halfRendered; i++) { // Loop จาก -1, 0, 1 (สำหรับ NUM_RENDERED_SLIDES=3)
      const slideDataIndex = getLoopedIndex(currentIndex + i);
      extendedSlidesToRender.push({
        ...slides[slideDataIndex],
        originalIndex: slideDataIndex, // ดัชนีจริงใน `slides` array
        positionInLoop: i, // ตำแหน่งใน loop ของ DOM: -1 (prev), 0 (current), 1 (next)
      });
    }
  }
  const effectiveSlideWidth = getEffectiveSlideWidth(); // คำนวณครั้งเดียวต่อ render เพื่อ performance

  // คำนวณความสูงของ Carousel ให้มี aspect ratio ที่สวยงาม
  // ตัวอย่าง: ให้ความสูงเป็น 45% ของ effectiveSlideWidth สำหรับ Desktop (peeking view), และ 56.25% (16:9) สำหรับ Mobile (full width view)
  const carouselHeight = typeof window !== 'undefined' && window.innerWidth >= 1024 && totalSlides > 1
    ? `${effectiveSlideWidth * 0.45}px` // สำหรับ desktop ที่มี peeking effect (ประมาณ 2.22:1 aspect ratio ของสไลด์เดี่ยว)
    : '56.25vw'; // 16:9 aspect ratio for mobile, vw เพื่อให้ปรับตามความกว้างจอ

  return (
    <div
      ref={carouselRef}
      className={styles.carousel} // class หลักจาก CSS module
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      // Touch events สำหรับการ swipe จะถูกผูกที่นี่
      onTouchStart={dragStart}
      // onTouchMove ไม่ได้ผูกที่นี่ เพราะจะใช้ global listener ขณะ isDragging
      // onTouchEnd ก็ใช้ global listener
      role="region" // ARIA role สำหรับ carousel
      aria-roledescription="carousel"
      aria-label="โปรโมชั่นและเรื่องเด่น" // ควรเป็น label ที่สื่อความหมาย
      style={{
        userSelect: isDragging ? 'none' : 'auto', // ป้องกันการ select text ขณะลาก
        height: carouselHeight, // กำหนดความสูงของ carousel แบบ dynamic
      }}
    >
      <div
        ref={slideContainerRef}
        className={`${styles.slideContainer} ${isDragging ? styles.dragging : ''}`}
        // Mouse event สำหรับการลากบน desktop
        onMouseDown={dragStart}
        // onMouseMove และ onMouseUp จะถูกจัดการโดย global listeners ขณะ isDragging
      >
        {extendedSlidesToRender.map((slide) => (
          <div
            // Key ควร unique สำหรับแต่ละ instance ของสไลด์ใน DOM loop
            key={`slide-${slide.id}-${slide.originalIndex}-loopPos${slide.positionInLoop}`}
            className={styles.slide}
            style={{ width: `${effectiveSlideWidth}px` }} // กำหนดความกว้างของแต่ละสไลด์
            data-position-in-loop={slide.positionInLoop} // attribute สำหรับ styling หรือ debugging
            data-is-active={slide.positionInLoop === 0} // สไลด์ที่อยู่ตรงกลาง (active ใน loop)
            // ARIA attributes สำหรับ accessibility
            aria-live={slide.positionInLoop === 0 ? "polite" : "off"} // ประกาศการเปลี่ยนแปลงเนื้อหาสำหรับ AT
            aria-atomic="true"
            // ซ่อนสไลด์ที่ไม่ active บน mobile จาก AT (Accessiblity Tree)
            // บน desktop จะยังเห็น peeking slides จึงไม่ควร aria-hidden ถ้ามองเห็นได้
            aria-hidden={slide.positionInLoop !== 0 && typeof window !== 'undefined' && window.innerWidth < 1024}
            role="group" // แต่ละสไลด์เป็นกลุ่มของเนื้อหา
            aria-roledescription="slide"
            aria-label={`${slide.title} (สไลด์ ${getLoopedIndex(currentIndex) + 1} จาก ${totalSlides})`}
          >
            <Image
              src={slide.imageUrl}
              alt={slide.description || slide.title || "Slide image"} // alt text ที่มีความหมาย
              fill // ให้ Image component ขยายเต็ม parent (.slide)
              // Priority loading สำหรับสไลด์ที่ active หรือใกล้จะ active
              // ปรับปรุงเพื่อให้โหลดภาพแรกๆ และภาพปัจจุบัน/ถัดไปเร็วขึ้น
              priority={
                slide.positionInLoop === 0 || // สไลด์ปัจจุบันใน DOM
                (extendedSlidesToRender.findIndex(s => s.id === slide.id && s.positionInLoop === 0) !== -1) || // เป็นสไลด์ที่จะ active
                Math.abs(slide.positionInLoop) <= 1 // สไลด์ที่อยู่ติดกัน
              }
              sizes={`(max-width: 767px) 100vw, (max-width: 1023px) calc(100vw - 32px), ${effectiveSlideWidth}px`}
              className={styles.slideImage}
              draggable={false} // ป้องกันการลากภาพโดย browser
              unoptimized={false} // ตั้งเป็น true ถ้าไม่ต้องการ Next/Image optimization หรือใช้ CDN ภายนอก
              // onLoad event สามารถใช้เพื่อจัดการ fade-in เมื่อภาพโหลดเสร็จ (ถ้าต้องการ)
            />
            <div className={styles.slideOverlay}></div> {/* Overlay ไล่สีบนภาพ */}
            <div className={styles.slideContent}> {/* Container สำหรับเนื้อหาบนสไลด์ */}
              {/* Apply animation (fade-in + slide-up) เฉพาะเนื้อหาของสไลด์ที่ active (ตรงกลาง) */}
              <div className={slide.positionInLoop === 0 ? styles.slideContentEnter : ""}>
                {slide.category && (
                  <span
                    className={styles.slideCategory}
                    // ใช้สี highlight ถ้ามี, หรือสี primary จาก global CSS variables
                    style={slide.highlightColor ? { backgroundColor: slide.highlightColor, color: 'var(--primary-foreground)' } : {}}
                  >
                    {slide.category}
                  </span>
                )}
                <h2 className={styles.slideTitle}>
                  <Link
                    href={slide.link || '#'}
                    // Styling สำหรับ focus state ของ link เพื่อ accessibility
                    className="focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 rounded-sm"
                    draggable={false} // ป้องกันการลาก link
                    onClick={(e) => e.stopPropagation()} // ป้องกันการ trigger drag ของ carousel เมื่อคลิก link
                    // ทำให้ link สามารถ focus ได้เฉพาะเมื่อสไลด์ active
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
                  // ปรับ margin top เล็กน้อยสำหรับปุ่ม action
                  <div className="mt-2 md:mt-3"> 
                    <Link
                      href={slide.primaryAction.href || '#'}
                      className={styles.slideButton}
                      draggable={false}
                      onClick={(e) => e.stopPropagation()}
                      tabIndex={slide.positionInLoop === 0 ? 0 : -1}
                    >
                      {slide.primaryAction.label}
                      {/* Icon สำหรับ external link, ปรับขนาดให้เหมาะสม */}
                      <ExternalLink size={16} strokeWidth={2.5} /> 
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows and Dots (แสดงเมื่อมีมากกว่า 1 สไลด์) */}
      {totalSlides > 1 && (
        <>
          {/* Previous Button */}
          <button
            onClick={goToPrevious}
            className={`${styles.navButton} ${styles.navButtonPrev}`}
            aria-label="สไลด์ก่อนหน้า" // ARIA label ที่ชัดเจน
            // ปิดการใช้งานปุ่มขณะกำลัง transition หรือลาก
            disabled={isTransitioning || isDragging}
          >
            <ArrowLeft size={20} strokeWidth={2.5}/> {/* ปรับขนาด icon */}
          </button>
          {/* Next Button */}
          <button
            onClick={goToNext}
            className={`${styles.navButton} ${styles.navButtonNext}`}
            aria-label="สไลด์ถัดไป"
            disabled={isTransitioning || isDragging}
          >
            <ArrowRight size={20} strokeWidth={2.5}/> {/* ปรับขนาด icon */}
          </button>

          {/* Dots Navigation */}
          <div className={styles.dots}>
            {/* สร้าง dot สำหรับแต่ละสไลด์ */}
            {slides.map((s, slideIdx) => (
              <button
                // Key ควร unique สำหรับแต่ละ dot
                key={`dot-${s.id}-${slideIdx}`}
                onClick={() => goToSlide(slideIdx)}
                // class สำหรับ styling dot ที่ active
                className={`${styles.dot} ${getLoopedIndex(currentIndex) === slideIdx ? styles.active : ''}`}
                aria-label={`ไปที่สไลด์ ${slideIdx + 1} (${s.title})`} // ARIA label ที่บอกรายละเอียดสไลด์
                // ระบุ dot ปัจจุบันสำหรับ AT
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