// src/backend/types/novel.ts
import { Types } from "mongoose";

// อินเทอร์เฟซสำหรับนิยาย
export interface Novel {
  _id: string;
  title: string;
  slug: string;
  description: string;
  coverImage: string;
  author: Types.ObjectId | { _id: string; username: string; profile?: { displayName?: string } }; // อ้างอิงผู้เขียน
  categories: Types.ObjectId[] | { _id: string; name: string }[]; // อ้างอิงหมวดหมู่
  tags: string[];
  status: "draft" | "published" | "completed" | "onHiatus" | "discount";
  isExplicit: boolean;
  isDeleted: boolean;
  visibility: "public" | "unlisted" | "private";
  stats: {
    views: number;
    likes: number;
    comments: number;
    followers: number;
    purchases: number;
    rating: number;
    ratingCount: number;
  };
  settings: {
    allowComments: boolean;
    monetization: boolean;
    showStatistics: boolean;
  };
  releaseSchedule?: {
    frequency: "daily" | "weekly" | "biweekly" | "monthly";
    nextRelease?: Date;
  };
  lastEpisodeAt: Date;
  createdAt: Date;
  updatedAt: Date;
  episodes?: Episode[]; // เพิ่มสำหรับ virtual field
}

// อินเทอร์เฟซสำหรับตอน
export interface Episode {
  _id: string;
  title: string;
  slug: string;
  novel: string | Types.ObjectId;
  episodeNumber: number;
  summary?: string;
  thumbnail?: string;
  isPremium: boolean;
  price: number;
  isPublished: boolean;
  publishedAt?: Date;
  stats: {
    views: number;
    likes: number;
    comments: number;
    purchases: number;
    completionRate: number;
    averageRating: number;
  };
}