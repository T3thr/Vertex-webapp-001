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

const FALLBACK_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iMTI4IiB2aWV3Qm94PSIwIDAgOTYgMTI4IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iOTYiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zMiA0OEg2NFY2NEgzMlY0OFoiIGZpbGw9IiNEMUQ1REIiLz4KPC9zdmc+Cg==';

const FavoriteItem = ({ item }: { item: LibraryItem }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
      <div className="flex">
        {/* Cover Image with Heart Icon */}
        <div className="w-24 h-32 bg-gray-200 flex-shrink-0 relative overflow-hidden">
          <picture>
            <source srcSet={item.coverImage} />
            <img
              src={FALLBACK_IMAGE}
              alt={item.title}
              className="w-full h-full object-cover"
              style={{ aspectRatio: '3/4' }} // Ensure aspect ratio matches container
            />
          </picture>
          {/* Heart Icon in Top-Left Corner */}
          <div className="absolute top-2 left-2">
            <Heart
              size={20}
              className="text-red-500 fill-red-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="space-y-2">
            {/* Title */}
            <h3 className="font-medium text-gray-900 text-lg leading-tight">
              {item.title}
            </h3>

            {/* Author */}
            <div className="flex items-center text-gray-600 text-sm">
              <User size={14} className="mr-1" />
              <span>{item.author}</span>
            </div>

            {/* Views and Likes */}
            <div className="flex items-center gap-4 text-gray-500 text-sm">
              <div className="flex items-center">
                <Eye size={14} className="mr-1" />
                <span>{item.views}</span>
              </div>
              <div className="flex items-center">
                <Heart size={14} className="mr-1" />
                <span>{item.likes}</span>
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-1 mt-2">
              {item.statuses.map((status: string, index: number) => (
                <span
                  key={index}
                  className={`px-2 py-1 text-xs rounded-full ${
                    status === 'reading'
                      ? 'bg-blue-100 text-blue-700'
                      : status === 'owned'
                      ? 'bg-green-100 text-green-700'
                      : status === 'following'
                      ? 'bg-purple-100 text-purple-700'
                      : status === 'finished_reading'
                      ? 'bg-gray-100 text-gray-700'
                      : 'bg-gray-100 text-gray-600'
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

export default FavoriteItem;
