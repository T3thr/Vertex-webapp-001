// src/backend/types/novel.ts

export interface Novel {
  _id?: string;
  title: string;
  author?: string;
  coverImage?: string;
  description?: string;
  category?: string[];
  tags?: string[];
  stats?: {
    views: number;
    likes: number;
    bookmarks?: number;
    chapters?: number;
  };
  updatedAt?: string;
  createdAt?: string;
  isFeatured?: boolean;
  isPopular?: boolean;
  isNew?: boolean;
}