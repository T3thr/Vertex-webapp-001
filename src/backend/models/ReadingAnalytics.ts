// src/backend/models/ReadingAnalytics.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface สำหรับ ReadingAnalytics document
export interface IReadingAnalytics extends Document {
  user: Types.ObjectId; // ผู้อ่าน
  novel: Types.ObjectId; // นิยายที่อ่าน
  episode?: Types.ObjectId; // ตอนที่อ่าน (ถ้ามี)
  readAt: Date; // วันที่อ่าน
  timeSpent: number; // เวลาที่ใช้อ่าน (วินาที)
  progress: number; // ความคืบหน้า (0-100%)
  completedReading: boolean; // อ่านจบแล้วหรือไม่
  deviceInfo: {
    type: string; // ประเภทอุปกรณ์ (mobile, tablet, desktop)
    os?: string; // ระบบปฏิบัติการ
    browser?: string; // เบราว์เซอร์
  };
  location?: {
    country: string; // ประเทศ
    region?: string; // ภูมิภาค/จังหวัด
  };
}

const ReadingAnalyticsSchema = new Schema<IReadingAnalytics>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุผู้อ่าน"],
      index: true,
    },
    novel: {
      type: Schema.Types.ObjectId,
      ref: "Novel",
      required: [true, "กรุณาระบุนิยายที่อ่าน"],
      index: true,
    },
    episode: {
      type: Schema.Types.ObjectId,
      ref: "Episode",
      index: true,
    },
    readAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    timeSpent: {
      type: Number,
      required: [true, "กรุณาระบุเวลาที่ใช้อ่าน"],
      min: [0, "เวลาที่ใช้อ่านต้องไม่ติดลบ"],
    },
    progress: {
      type: Number,
      required: [true, "กรุณาระบุความคืบหน้า"],
      min: [0, "ความคืบหน้าต้องไม่ต่ำกว่า 0%"],
      max: [100, "ความคืบหน้าต้องไม่เกิน 100%"],
    },
    completedReading: {
      type: Boolean,
      default: false,
    },
    deviceInfo: {
      type: {
        type: String,
        required: [true, "กรุณาระบุประเภทอุปกรณ์"],
        enum: {
          values: ["mobile", "tablet", "desktop"],
          message: "ประเภทอุปกรณ์ {VALUE} ไม่ถูกต้อง",
        },
      },
      os: String,
      browser: String,
    },
    location: {
      country: String,
      region: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ReadingAnalyticsSchema.index({ user: 1, novel: 1, readAt: -1 });
ReadingAnalyticsSchema.index({ novel: 1, episode: 1, readAt: -1 });
ReadingAnalyticsSchema.index({ readAt: -1 });
ReadingAnalyticsSchema.index({ "deviceInfo.type": 1, readAt: -1 });
ReadingAnalyticsSchema.index({ "location.country": 1, readAt: -1 });

// Export Model
const ReadingAnalyticsModel = () => 
  models.ReadingAnalytics as mongoose.Model<IReadingAnalytics> || model<IReadingAnalytics>("ReadingAnalytics", ReadingAnalyticsSchema);

export default ReadingAnalyticsModel;