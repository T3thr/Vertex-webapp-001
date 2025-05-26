// src/components/novels/TagBadge.tsx
"use client"

import Link from 'next/link';
import { PopulatedCategoryForDetailPage } from '@/app/api/novels/[slug]/route'; // Assuming this is the final structure for category data
import { Palette, Tag as LucideTag, Languages, ShieldAlert, Users, Tv, Puzzle, Eye, ThumbsDown, CalendarDays, BarChart3, Flame, AlertCircle } from 'lucide-react';
import { CategoryType } from '@/backend/models/Category'; //

interface TagBadgeProps {
  category?: PopulatedCategoryForDetailPage | { name: string; slug?: string; color?: string; iconUrl?: string; categoryType?: CategoryType, fullUrl?: string };
  text?: string; // For custom tags not from category object
  className?: string;
  iconSize?: number;
  textSize?: string;
  showIcon?: boolean;
  isLink?: boolean; // To make the badge a link using category.fullUrl
}

// Helper to choose an icon based on categoryType
const getIconForCategoryType = (categoryType?: CategoryType, iconSize: number = 14) => {
  switch (categoryType) {
    case CategoryType.GENRE:
    case CategoryType.SUB_GENRE:
      return <Tv size={iconSize} className="mr-1" />;
    case CategoryType.THEME:
      return <Palette size={iconSize} className="mr-1" />;
    case CategoryType.CONTENT_WARNING:
      return <ShieldAlert size={iconSize} className="mr-1 text-red-500" />;
    case CategoryType.AGE_RATING:
      return <Users size={iconSize} className="mr-1" />;
    case CategoryType.LANGUAGE:
      return <Languages size={iconSize} className="mr-1" />;
    case CategoryType.MOOD_AND_TONE:
        return <Flame size={iconSize} className="mr-1" />;
    case CategoryType.ART_STYLE:
        return <Palette size={iconSize} className="mr-1" />;
    case CategoryType.GAMEPLAY_MECHANIC:
        return <Puzzle size={iconSize} className="mr-1" />;
    case CategoryType.INTERACTIVITY_LEVEL:
        return <Eye size={iconSize} className="mr-1" />;
    case CategoryType.LENGTH_TAG:
        return <CalendarDays size={iconSize} className="mr-1" />;
    case CategoryType.NARRATIVE_PACING:
        return <BarChart3 size={iconSize} className="mr-1" />;
    case CategoryType.AVOID_IF_DISLIKE_TAG:
        return <ThumbsDown size={iconSize} className="mr-1" />;
    case CategoryType.TAG:
    default:
      return <LucideTag size={iconSize} className="mr-1" />;
  }
};


export const TagBadge: React.FC<TagBadgeProps> = ({
  category,
  text,
  className,
  iconSize = 14,
  textSize = 'text-xs',
  showIcon = true,
  isLink = true,
}) => {
  const name = category?.name || text || 'Tag';
  const slug = category?.slug;
  const color = category?.color || '#707b90'; // Muted color from CSS vars
  const categoryType = category?.categoryType;
  const linkUrl = isLink && category?.fullUrl ? category.fullUrl : undefined;

  // Determine background and text colors based on the provided hex color
  // This is a simple contrast check, might need a more sophisticated library for perfect results
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  const getContrastYIQ = (hexcolor: string) => {
    const rgb = hexToRgb(hexcolor);
    if (!rgb) return '#ffffff'; // Default to white text if color is invalid
    const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return yiq >= 128 ? 'var(--foreground)' : 'var(--primary-foreground)'; // Use CSS variables
  };

  const badgeStyle = {
    backgroundColor: color,
    color: getContrastYIQ(color),
    borderColor: color,
  };

  const icon = showIcon ? getIconForCategoryType(categoryType, iconSize) : null;

  const content = (
    <span
      style={badgeStyle}
      className={`inline-flex items-center justify-center rounded-md border px-2.5 py-0.5 ${textSize} font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className} hover:opacity-90`}
    >
      {icon}
      {name}
    </span>
  );

  if (linkUrl) {
    return (
      <Link href={linkUrl} passHref legacyBehavior>
        <a className="no-underline hover:no-underline focus:no-underline active:no-underline visited:no-underline">
            {content}
        </a>
      </Link>
    );
  }

  return content;
};