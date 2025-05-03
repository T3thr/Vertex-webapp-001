// src/components/ui/Avatar.tsx
"use client"
import { useState } from 'react';

interface AvatarProps {
  src?: string;
  alt: string;
  fallback: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Avatar = ({ src, alt, fallback, size = 'md' }: AvatarProps) => {
  const [imageError, setImageError] = useState(false);
  
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };
  
  const handleImageError = () => {
    setImageError(true);
  };
  
  return (
    <div className={`relative rounded-full overflow-hidden flex items-center justify-center bg-primary/10 ${sizeClasses[size]}`}>
      {src && !imageError ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={handleImageError}
        />
      ) : (
        <span className="font-medium text-primary">{fallback}</span>
      )}
    </div>
  );
};