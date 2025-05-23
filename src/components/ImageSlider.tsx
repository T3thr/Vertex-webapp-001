// src/components/ImageSlider.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, PlayCircle } from "lucide-react"; // Use Lucide icons

// Interface for individual slide data, exported for use in page.tsx
export interface Slide {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  link: string;
  category?: string; // Optional category badge
  highlightColor?: string; // Optional color for category badge or accents
  primaryAction?: { label: string; href: string };
}

interface ImageSliderProps {
  slides: Slide[];
  autoPlayInterval?: number;
}

export function ImageSlider({ slides, autoPlayInterval = 6000 }: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

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
    if (isHovering || !slides.length || autoPlayInterval === 0) return;
    const interval = setInterval(goToNext, autoPlayInterval);
    return () => clearInterval(interval);
  }, [goToNext, slides.length, autoPlayInterval, isHovering]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) goToNext();
    else if (distance < -minSwipeDistance) goToPrevious();
  };

  if (!slides || slides.length === 0) return null;

  const currentSlide = slides[currentIndex];

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0,
    }),
  };
  const [direction, setDirection] = useState(0);

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    if (newDirection > 0) goToNext(); else goToPrevious();
  };


  return (
    <div
      className="relative w-full h-[320px] sm:h-[420px] md:h-[500px] lg:h-[580px] xl:h-[620px] overflow-hidden group"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.3 },
          }}
          className="absolute w-full h-full"
        >
          <Link href={currentSlide.link} className="block w-full h-full">
            <Image
              src={currentSlide.imageUrl}
              alt={currentSlide.title}
              fill
              priority={currentIndex === 0} // Priority load the first slide
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 1920px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            
            <div className="absolute bottom-0 left-0 p-4 sm:p-6 md:p-8 lg:p-12 w-full md:w-3/4 lg:w-2/3">
              {currentSlide.category && (
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className={`text-xs sm:text-sm font-semibold px-3 py-1 rounded-full mb-2 sm:mb-3 inline-block text-white ${currentSlide.highlightColor || 'bg-primary'}`}
                >
                  {currentSlide.category}
                </motion.span>
              )}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3, type: "spring", stiffness:100 }}
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 sm:mb-3 md:mb-4 leading-tight"
                style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)'}}
              >
                {currentSlide.title}
              </motion.h2>
              {currentSlide.description && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4, type: "spring", stiffness:90 }}
                  className="text-white/80 text-sm sm:text-base md:text-lg max-w-xl mb-4 sm:mb-6 line-clamp-2 sm:line-clamp-3"
                  style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.4)'}}
                >
                  {currentSlide.description}
                </motion.p>
              )}
              {currentSlide.primaryAction && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5, type: "spring", stiffness:80 }}
                >
                  <Link
                    href={currentSlide.primaryAction.href}
                    className="bg-primary hover:bg-primary/80 text-primary-foreground py-2.5 px-6 sm:py-3 sm:px-8 rounded-lg inline-flex items-center gap-2 font-semibold transition-colors duration-200 text-sm sm:text-base"
                  >
                    <PlayCircle className="h-5 w-5" /> {currentSlide.primaryAction.label}
                  </Link>
                </motion.div>
              )}
            </div>
          </Link>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <button
        onClick={() => paginate(-1)}
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 p-2 sm:p-3 rounded-full text-white transition-all z-10 opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label="Previous Slide"
      >
        <ChevronLeft size={20} className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>
      <button
        onClick={() => paginate(1)}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 p-2 sm:p-3 rounded-full text-white transition-all z-10 opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label="Next Slide"
      >
        <ChevronRight size={20} className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
        {slides.map((_, slideIndex) => (
          <button
            key={slideIndex}
            onClick={() => goToSlide(slideIndex)}
            className={`h-2.5 rounded-full transition-all duration-300 ease-in-out
              ${slideIndex === currentIndex ? "bg-primary w-6 sm:w-8" : "bg-white/40 hover:bg-white/70 w-2.5"}`}
            aria-label={`Go to slide ${slideIndex + 1}`}
          />
        ))}
      </div>

      {/* Autoplay Progress Bar (Optional) */}
       {autoPlayInterval > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-transparent z-20" // transparent track
            style={{ pointerEvents: 'none' }}
        >
          <AnimatePresence>
            { !isHovering && ( // Only show progress when not hovering
                <motion.div
                    className="h-full bg-primary/70" // Progress color
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    exit={{ opacity: 0 }}
                    transition={{
                        duration: autoPlayInterval / 1000,
                        ease: "linear",
                    }}
                    key={currentIndex} // Re-trigger animation on slide change
                />
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}