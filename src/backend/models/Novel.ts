// src/backend/models/Novel.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface สำหรับ Novel document
export interface INovel extends Document {
  title: string; // ชื่อนิยาย
  slug: string; // URL slug
  description: string; // คำอธิบายนิยาย
  coverImage: string; // URL รูปปก
  author: Types.ObjectId; // ผู้เขียน (อ้างอิงไปยัง User)
  categories: Types.ObjectId[]; // หมวดหมู่ (อ้างอิงไปยัง Category)
  tags: string[]; // แท็ก
  status: "draft" | "published" | "completed" | "onHiatus" | "discount"; // สถานะนิยาย
  isExplicit: boolean; // เป็นเนื้อหาสำหรับผู้ใหญ่หรือไม่
  isDeleted: boolean; // สถานะการลบ (soft delete)
  visibility: "public" | "unlisted" | "private"; // การมองเห็น
  stats: {
    views: number; // จำนวนเข้าชม
    likes: number; // จำนวนไลค์
    comments: number; // จำนวนคอมเมนต์
    followers: number; // จำนวนผู้ติดตาม
    purchases: number; // จำนวนการซื้อ
    rating: number; // คะแนนโดยเฉลี่ย (0-5)
    ratingCount: number; // จำนวนคนให้คะแนน
  };
  settings: {
    allowComments: boolean; // อนุญาตให้แสดงความคิดเห็น
    monetization: boolean; // เปิดใช้งานการซื้อขาย
    showStatistics: boolean; // แสดงสถิติให้ผู้อ่านเห็น
  };
  releaseSchedule?: {
    frequency: "daily" | "weekly" | "biweekly" | "monthly"; // ความถี่ในการอัพเดต
    nextRelease?: Date; // วันที่จะอัพเดตตอนต่อไป
  };
  lastEpisodeAt: Date; // วันที่อัพเดตตอนล่าสุด
  episodes?: any[]; // Virtual field สำหรับตอน
}

const NovelSchema = new Schema<INovel>(
  {
    title: {
      type: String,
      required: [true, "กรุณาระบุชื่อนิยาย"],
      trim: true,
      maxlength: [200, "ชื่อนิยายต้องไม่เกิน 200 ตัวอักษร"],
      index: true,
    },
    slug: {
      type: String,
      required: [true, "กรุณาระบุ slug URL"],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [200, "Slug ต้องไม่เกิน 200 ตัวอักษร"],
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug ต้องประกอบด้วยตัวอักษรพิมพ์เล็ก, ตัวเลข และเครื่องหมาย - เท่านั้น"],
      index: true,
    },
    description: {
      type: String,
      required: [true, "กรุณาระบุคำอธิบายนิยาย"],
      trim: true,
      maxlength: [5000, "คำอธิบายนิยายต้องไม่เกิน 5000 ตัวอักษร"],
    },
    coverImage: {
      type: String,
      required: [true, "กรุณาระบุ URL รูปปก"],
      trim: true,
      validate: {
        validator: (v: string) => /^https?:\/\/|^\//.test(v),
        message: "รูปแบบ URL ของรูปปกไม่ถูกต้อง",
      },
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุผู้เขียน"],
      index: true,
    },
    categories: {
      type: [Schema.Types.ObjectId],
      ref: "Category",
      validate: [
        {
          validator: function (v: any[]) {
            return v.length > 0;
          },
          message: "กรุณาเลือกอย่างน้อย 1 หมวดหมู่",
        },
        {
          validator: function (v: any[]) {
            return v.length <= 5;
          },
          message: "สามารถเลือกได้สูงสุด 5 หมวดหมู่",
        },
      ],
      index: true,
    },
    tags: {
      type: [String],
      validate: [
        {
          validator: function (v: any[]) {
            return v.length <= 10;
          },
          message: "สามารถใส่แท็กได้สูงสุด 10 แท็ก",
        },
      ],
    },
    status: {
      type: String,
      enum: {
        values: ["draft", "published", "completed", "onHiatus", "discount"],
        message: "สถานะ {VALUE} ไม่ถูกต้อง",
      },
      default: "draft",
      index: true,
    },
    isExplicit: {
      type: Boolean,
      default: false,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    visibility: {
      type: String,
      enum: {
        values: ["public", "unlisted", "private"],
        message: "การมองเห็น {VALUE} ไม่ถูกต้อง",
      },
      default: "public",
      index: true,
    },
    stats: {
      views: {
        type: Number,
        default: 0,
        min: 0,
      },
      likes: {
        type: Number,
        default: 0,
        min: 0,
      },
      comments: {
        type: Number,
        default: 0,
        min: 0,
      },
      followers: {
        type: Number,
        default: 0,
        min: 0,
      },
      purchases: {
        type: Number,
        default: 0,
        min: 0,
      },
      rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      ratingCount: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    settings: {
      allowComments: {
        type: Boolean,
        default: true,
      },
      monetization: {
        type: Boolean,
        default: false,
      },
      showStatistics: {
        type: Boolean,
        default: true,
      },
    },
    releaseSchedule: {
      frequency: {
        type: String,
        enum: {
          values: ["daily", "weekly", "biweekly", "monthly"],
          message: "ความถี่ {VALUE} ไม่ถูกต้อง",
        },
      },
      nextRelease: Date,
    },
    lastEpisodeAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
NovelSchema.index({ title: "text", description: "text", tags: "text" }); // Text search index
NovelSchema.index({ "stats.views": -1 }); // เรียงตามยอดเข้าชม
NovelSchema.index({ "stats.likes": -1 }); // เรียงตามยอดไลค์
NovelSchema.index({ "stats.followers": -1 }); // เรียงตามยอดผู้ติดตาม
NovelSchema.index({ createdAt: -1 }); // เรียงตามวันที่สร้าง
NovelSchema.index({ "stats.rating": -1 }); // เรียงตามคะแนน
NovelSchema.index({ lastEpisodeAt: -1 }); // เพิ่ม index สำหรับ lastEpisodeAt เพื่อการเรียงลำดับ

// Virtuals
NovelSchema.virtual("episodes", {
  ref: "Episode",
  localField: "_id",
  foreignField: "novel",
  justOne: false,
  options: { sort: { episodeNumber: 1 } },
});

// Export Model
const NovelModel = models.Novel || model<INovel>("Novel", NovelSchema);
export default NovelModel;