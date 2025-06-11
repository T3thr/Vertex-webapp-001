"use client";

import { BookOpen } from 'lucide-react';

interface LibraryItem {
  _id: string;
  itemType: string;
  novelId: string;
  title: string;
  author: string;
  coverImage: string;
  statuses: string[];
  views: number;
  likes: number;
  userRating: number;
  readingProgress: {
    overallProgressPercentage: number;
    lastReadAt: string;
  };
  addedAt: string;
}

const FALLBACK_IMAGE = '/images/placeholder-cover.webp';

const HistoryItem = ({ item }: { item: LibraryItem }) => {
  const lastReadDate = new Date(item.readingProgress.lastReadAt).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="relative pl-8 pb-6 last:pb-0">
      {/* Timeline dot and line */}
      <div className="absolute left-0 top-0 bottom-0 flex items-center">
        <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
          <BookOpen className="w-2.5 h-2.5 text-primary-foreground" />
        </div>
        <div className="absolute top-4 bottom-0 left-2 w-[1px] bg-border -translate-x-1/2"></div>
      </div>

      {/* Content */}
      <div className="bg-background rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="flex h-40">
          {/* Cover Image */}
          <div className="relative w-32 h-full bg-muted flex-shrink-0 overflow-hidden">
            <picture className="w-full h-full block">
              <source srcSet={item.coverImage} type="image/webp" />
              <source srcSet={item.coverImage} type="image/jpeg" />
              <img
                src={item.coverImage || FALLBACK_IMAGE}
                alt={item.title}
                className="w-full h-full object-cover object-center"
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = FALLBACK_IMAGE;
                }}
              />
            </picture>
          </div>

          {/* Content */}
          <div className="p-4 flex-1">
            <h4 className="text-lg font-medium text-foreground">{item.title}</h4>
            <p className="text-sm text-muted-foreground">โดย {item.author}</p>
            
            {/* Last Read Time */}
            <div className="mt-2 space-y-2">
              <div className="text-sm text-muted-foreground">
                อ่านล่าสุด: {lastReadDate}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryItem;