"use client";

import { Eye, Heart, User } from 'lucide-react';

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

const LibraryItemCard = ({ item }: { item: LibraryItem }) => {
  return (
    <div className="bg-background rounded-lg shadow-sm border border-border overflow-hidden hover:shadow-md transition-shadow duration-200">
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
        <div className="flex-1 p-4">
          <div className="space-y-2">
            {/* Title */}
            <h3 className="font-medium text-foreground text-lg leading-tight">
              {item.title}
            </h3>

            {/* Author */}
            <div className="flex items-center text-muted-foreground text-sm">
              <User size={14} className="mr-1" />
              <span>{item.author}</span>
            </div>

            {/* Views and Likes */}
            <div className="flex items-center gap-4 text-muted-foreground text-sm">
              <div className="flex items-center">
                <Eye size={14} className="mr-1 text-sky-500 dark:text-sky-400" />
                <span>{item.views}</span>
              </div>
              <div className="flex items-center">
                <Heart size={14} className="mr-1 text-rose-500 dark:text-rose-400" />
                <span>{item.likes}</span>
              </div>
            </div>

            {/* Reading Progress */}
            {item.readingProgress?.overallProgressPercentage > 0 && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary"
                      style={{ width: `${item.readingProgress.overallProgressPercentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {item.readingProgress.overallProgressPercentage}%
                  </span>
                </div>
              </div>
            )}

            {/* Status Badges */}
            <div className="flex flex-wrap gap-1 mt-2">
              {item.statuses.map((status: string, index: number) => (
                <span
                  key={index}
                  className={`px-2 py-1 text-xs rounded-full ${
                    status === 'reading'
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      : status === 'owned'
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      : status === 'following'
                      ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400'
                      : status === 'finished_reading'
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {status === 'reading'
                    ? 'กำลังอ่าน'
                    : status === 'owned'
                    ? 'เป็นเจ้าของ'
                    : status === 'following'
                    ? 'ติดตาม'
                    : status === 'finished_reading'
                    ? 'อ่านจบแล้ว'
                    : status}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LibraryItemCard;