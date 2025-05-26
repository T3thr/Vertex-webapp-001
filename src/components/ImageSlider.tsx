// src/components/ImageSlider.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link"; // Keep Next.js Link for navigation
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react"; // Using Lucide icons

export interface SlideData { // Renamed to avoid conflict if Slide is a common name
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  link: string;
  category?: string;
  highlightColor?: string; // e.g., 'bg-purple-500'
  primaryAction?: { label: string; href: string };
}

interface ImageSliderProps {
  slides: SlideData[];
  autoPlayInterval?: number;
}

export function ImageSlider({ slides, autoPlayInterval = 6000 }: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === slides.length - 1 ? 0 : prevIndex + 1));
  }, [slides.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? slides.length - 1 : prevIndex - 1));
  }, [slides.length]);

  const goToSlide = useCallback((slideIndex: number) => {
    setCurrentIndex(slideIndex);
  }, []);

  useEffect(() => {
    if (isHovering || slides.length <= 1) return;
    const timer = setTimeout(goToNext, autoPlayInterval);
    return () => clearTimeout(timer);
  }, [currentIndex, goToNext, slides.length, autoPlayInterval, isHovering]);

  if (!slides || slides.length === 0) {
    return (
        <div className="relative w-full h-[300px] sm:h-[380px] md:h-[450px] lg:h-[500px] bg-secondary rounded-lg md:rounded-xl flex items-center justify-center">
            <p className="text-muted-foreground">ไม่มีสไลด์ให้แสดง</p>
        </div>
    );
  }

  const currentSlide = slides[currentIndex];

  const slideVariants = {
    initial: { opacity: 0.8, scale: 1.02 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] } },
    exit: { opacity: 0.8, scale: 0.98, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } },
  };

  const contentVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.2, ease: "easeOut" } },
  };
  
  const buttonVariants = {
    initial: { opacity: 0, y:10 },
    animate: { opacity: 1, y:0, transition: { duration: 0.5, delay: 0.5, ease: "easeOut" } },
    hover: { scale: 1.05, backgroundColor: 'var(--color-primary-hover, var(--color-primary))' }, // Use CSS var or default
    tap: { scale: 0.95 }
  }


  return (
    <div
      className="relative w-full h-[300px] sm:h-[380px] md:h-[450px] lg:h-[500px] xl:h-[580px] select-none group" // Increased height slightly
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="w-full h-full overflow-hidden rounded-lg md:rounded-xl shadow-lg">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={currentIndex}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 w-full h-full"
          >
            {/* Link component should wrap interactive content, not the entire motion.div if motion.div has its own handlers */}
            <Image
              src={currentSlide.imageUrl}
              alt={currentSlide.title}
              fill
              priority={currentIndex === 0} // Priority for the first slide
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1280px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/10 md:bg-gradient-to-r md:from-black/70 md:to-transparent md:w-3/4 lg:w-2/3" />
            
            <div className="absolute inset-0 flex flex-col justify-end md:justify-center p-4 sm:p-6 md:p-8 lg:p-12 text-white w-full md:w-3/4 lg:w-2/3 xl:w-1/2">
              <motion.div variants={contentVariants} initial="initial" animate="animate">
                {currentSlide.category && (
                  <span 
                    className={`text-xs sm:text-sm font-semibold px-3 py-1 rounded-full mb-2 sm:mb-3 inline-block ${currentSlide.highlightColor || 'bg-primary'} text-primary-foreground shadow`}
                  >
                    {currentSlide.category}
                  </span>
                )}
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3 leading-tight shadow-text-md">
                  {/* Wrap title in Link if it's the primary clickable element for the slide's content */}
                  <Link href={currentSlide.link} className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded-sm">
                     {currentSlide.title}
                  </Link>
                </h2>
                {currentSlide.description && (
                  <p className="text-sm sm:text-base md:text-lg text-slate-200 mb-4 sm:mb-6 line-clamp-2 sm:line-clamp-3 shadow-text-sm">
                    {currentSlide.description}
                  </p>
                )}
                {currentSlide.primaryAction && (
                  <motion.div variants={buttonVariants} initial="initial" animate="animate" whileHover="hover" whileTap="tap">
                    <Link
                      href={currentSlide.primaryAction.href}
                      className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base font-semibold bg-primary text-primary-foreground rounded-md hover:bg-opacity-90 transition-colors duration-200 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      {currentSlide.primaryAction.label}
                      <ExternalLink size={18} className="ml-1" />
                    </Link>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {slides.length > 1 && (
        <>
          {/* Navigation Buttons */}
          <button
            onClick={goToPrevious}
            className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/50 p-2 sm:p-2.5 rounded-full text-white transition-all duration-200 z-10 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="สไลด์ก่อนหน้า"
          >
            <ArrowLeft size={20} className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/50 p-2 sm:p-2.5 rounded-full text-white transition-all duration-200 z-10 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="สไลด์ถัดไป"
          >
            <ArrowRight size={20} className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex space-x-1.5 sm:space-x-2 z-10">
            {slides.map((_, slideIndex) => (
              <button
                key={slideIndex}
                onClick={() => goToSlide(slideIndex)}
                className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-300 ease-out
                  ${slideIndex === currentIndex ? 'bg-primary scale-125' : 'bg-white/40 hover:bg-white/70'}`}
                aria-label={`ไปที่สไลด์ ${slideIndex + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
