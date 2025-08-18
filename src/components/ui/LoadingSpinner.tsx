// src/components/ui/LoadingSpinner.tsx
// Loading Spinner Component สำหรับการแสดงสถานะการโหลดข้อมูล
// รองรับหลายขนาดและสไตล์ตาม global.css theme system
'use client';

import { motion, Variants } from 'framer-motion';
import { Loader2, BookOpen, PenTool } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  variant?: 'default' | 'dots' | 'pulse' | 'writer' | 'reader';
  text?: string;
  className?: string;
  showIcon?: boolean;
}

export default function LoadingSpinner({ 
  size = 'medium', 
  variant = 'default',
  text,
  className = '',
  showIcon = true
}: LoadingSpinnerProps) {
  
  // กำหนดขนาดตาม size prop
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
    xlarge: 'w-16 h-16'
  };

  const textSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base',
    xlarge: 'text-lg'
  };

  // Animation variants สำหรับแต่ละ variant
  const spinVariants: Variants = {
    animate: {
      rotate: 360,
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }
    }
  };

  const pulseVariants: Variants = {
    animate: {
      scale: [1, 1.2, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const dotsVariants: Variants = {
    animate: {
      transition: {
        staggerChildren: 0.2,
        repeat: Infinity,
        repeatDelay: 0.5
      }
    }
  };

  const dotVariants: Variants = {
    animate: {
      y: [-3, -6, -3],
      transition: {
        duration: 0.6,
        ease: "easeInOut"
      }
    }
  };

  // Render different variants
  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return (
          <motion.div
            className="flex items-center gap-1"
            variants={dotsVariants}
            animate="animate"
          >
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                className="w-2 h-2 bg-primary rounded-full"
                variants={dotVariants}
              />
            ))}
          </motion.div>
        );

      case 'pulse':
        return (
          <motion.div
            className={`${sizeClasses[size]} bg-primary rounded-full`}
            variants={pulseVariants}
            animate="animate"
          />
        );

      case 'writer':
        return (
          <motion.div
            className="relative"
            variants={spinVariants}
            animate="animate"
          >
            <PenTool className={`${sizeClasses[size]} text-primary`} />
            <motion.div
              className="absolute inset-0 border-2 border-primary border-t-transparent rounded-full"
              variants={spinVariants}
              animate="animate"
            />
          </motion.div>
        );

      case 'reader':
        return (
          <motion.div
            className="relative"
            variants={spinVariants}
            animate="animate"
          >
            <BookOpen className={`${sizeClasses[size]} text-primary`} />
            <motion.div
              className="absolute inset-0 border-2 border-primary border-t-transparent rounded-full"
              variants={spinVariants}
              animate="animate"
            />
          </motion.div>
        );

      default:
        return (
          <motion.div
            variants={spinVariants}
            animate="animate"
          >
            <Loader2 className={`${sizeClasses[size]} text-primary`} />
          </motion.div>
        );
    }
  };

  return (
    <motion.div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Spinner */}
      <div className="relative">
        {renderSpinner()}
      </div>

      {/* Loading Text */}
      {text && (
        <motion.p
          className={`${textSizeClasses[size]} text-muted-foreground text-center max-w-xs`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {text}
        </motion.p>
      )}

      {/* Animated Background Effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 rounded-lg -z-10"
        animate={{
          background: [
            'linear-gradient(90deg, var(--primary)/0.05, transparent, var(--accent)/0.05)',
            'linear-gradient(90deg, var(--accent)/0.05, transparent, var(--primary)/0.05)',
            'linear-gradient(90deg, var(--primary)/0.05, transparent, var(--accent)/0.05)'
          ]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </motion.div>
  );
}

// Export additional utility variants for specific use cases
export const WriterLoadingSpinner = (props: Omit<LoadingSpinnerProps, 'variant'>) => (
  <LoadingSpinner {...props} variant="writer" />
);

export const ReaderLoadingSpinner = (props: Omit<LoadingSpinnerProps, 'variant'>) => (
  <LoadingSpinner {...props} variant="reader" />
);

export const DotsLoadingSpinner = (props: Omit<LoadingSpinnerProps, 'variant'>) => (
  <LoadingSpinner {...props} variant="dots" />
);

export const PulseLoadingSpinner = (props: Omit<LoadingSpinnerProps, 'variant'>) => (
  <LoadingSpinner {...props} variant="pulse" />
);