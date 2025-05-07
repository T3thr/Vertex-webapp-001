// src/backend/models/ReadingAnalytic.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface for individual reading session data points (more granular)
export interface IReadingSessionEvent extends Document {
  eventType: "start_read" | "pause_read" | "resume_read" | "end_read" | "scroll_depth" | "choice_made" | "page_turn";
  timestamp: Date;
  currentProgress?: number; // Current percentage or scene/node ID
  scrollDepthPercent?: number; // For long-form text within a scene
  choiceId?: string; // If eventType is choice_made
  metadata?: Record<string, any>; // e.g., { sceneId: "...", nodeId: "..." }
}

// Interface for ReadingAnalytic document
// This model captures detailed analytics about user reading behavior.
// It can store aggregated data per session or individual events for deep analysis.
export interface IReadingAnalytic extends Document {
  user: Types.ObjectId; // ผู้อ่าน (อ้างอิง User model)
  novel: Types.ObjectId; // นิยายที่อ่าน (อ้างอิง Novel model)
  episode?: Types.ObjectId; // ตอนที่อ่าน (อ้างอิง Episode model, optional if tracking novel-level reading)
  storyMapNodeId?: Types.ObjectId; // ID ของโหนดใน StoryMap ที่กำลังอ่าน/โต้ตอบ (ถ้าเป็น visual novel)
  // Session Information
  sessionId: string; // Unique ID for a reading session (can be client-generated or server-generated)
  sessionStartTime: Date; // เวลาเริ่ม session การอ่าน
  sessionEndTime?: Date; // เวลาสิ้นสุด session การอ่าน (ถ้า session สิ้นสุดแล้ว)
  durationSeconds: number; // ระยะเวลาที่ใช้ใน session นี้ (วินาที, อัปเดตเมื่อ session สิ้นสุดหรือเป็นระยะ)
  // Progress and Engagement
  startProgress?: number; // % ความคืบหน้า ณ ตอนเริ่ม session (0-100 or scene/node ID)
  endProgress?: number; // % ความคืบหน้า ณ ตอนสิ้นสุด session (0-100 or scene/node ID)
  maxScrollDepth?: number; // % ความลึกสูงสุดที่ scroll ในเนื้อหา (ถ้ามี)
  choicesMadeCount?: number; // จำนวนตัวเลือกที่ผู้ใช้เลือกใน session นี้ (สำหรับ visual novels)
  pagesViewedCount?: number; // จำนวนหน้า/ฉากที่ดูใน session นี้
  isCompletedEpisode?: boolean; // อ่านตอนจบหรือไม่ (ถ้า session นี้จบตอน)
  isCompletedNovel?: boolean; // อ่านนิยายจบหรือไม่ (ถ้า session นี้ทำให้นิยายจบ)
  // Contextual Information
  deviceInfo?: {
    type?: "mobile" | "tablet" | "desktop" | "console" | "other"; // ประเภทอุปกรณ์
    os?: string; // ระบบปฏิบัติการ (e.g., "iOS", "Android", "Windows")
    browser?: string; // เบราว์เซอร์ (e.g., "Chrome", "Safari")
    appVersion?: string; // Version ของแอป (ถ้ามี)
    screenResolution?: string; // e.g., "1920x1080"
  };
  networkInfo?: {
    connectionType?: "wifi" | "cellular" | "ethernet";
    effectiveConnectionType?: "2g" | "3g" | "4g" | "5g";
  };
  location?: { // เก็บข้อมูลตำแหน่งคร่าวๆ (ถ้าผู้ใช้อนุญาต)
    countryCode?: string; // รหัสประเทศ (e.g., "TH", "US")
    region?: string; // ภูมิภาค/จังหวัด
    city?: string;
  };
  // For more granular event tracking within a session (optional, can be a separate collection if too verbose)
  sessionEvents?: IReadingSessionEvent[];
  // AI/ML Features - to be populated by processing jobs
  engagementScore?: number; // Calculated score (0-1) indicating engagement level for this session
  predictedChurnRisk?: number; // Predicted risk of user churning after this session (0-1)
  readingSpeedWPM?: number; // Words per minute (if applicable and calculable)
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const ReadingSessionEventSchema = new Schema<IReadingSessionEvent>(
  {
    eventType: {
      type: String,
      enum: ["start_read", "pause_read", "resume_read", "end_read", "scroll_depth", "choice_made", "page_turn"],
      required: true,
    },
    timestamp: { type: Date, required: true, default: Date.now },
    currentProgress: Number,
    scrollDepthPercent: { type: Number, min: 0, max: 100 },
    choiceId: String,
    metadata: Schema.Types.Mixed,
  },
  { _id: false }
);

const ReadingAnalyticSchema = new Schema<IReadingAnalytic>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    novel: { type: Schema.Types.ObjectId, ref: "Novel", required: true, index: true },
    episode: { type: Schema.Types.ObjectId, ref: "Episode", index: true },
    storyMapNodeId: { type: Schema.Types.ObjectId, ref: "StoryMap.nodes", index: true }, // Assuming StoryMap has a subdocument array `nodes`
    sessionId: { type: String, required: true, index: true },
    sessionStartTime: { type: Date, required: true, default: Date.now, index: true },
    sessionEndTime: { type: Date, index: true },
    durationSeconds: { type: Number, default: 0, min: 0 },
    startProgress: Number,
    endProgress: Number,
    maxScrollDepth: { type: Number, min: 0, max: 100 },
    choicesMadeCount: { type: Number, default: 0, min: 0 },
    pagesViewedCount: { type: Number, default: 0, min: 0 },
    isCompletedEpisode: { type: Boolean, default: false },
    isCompletedNovel: { type: Boolean, default: false },
    deviceInfo: {
      type: { type: String, enum: ["mobile", "tablet", "desktop", "console", "other"] },
      os: String,
      browser: String,
      appVersion: String,
      screenResolution: String,
    },
    networkInfo: {
        connectionType: { type: String, enum: ["wifi", "cellular", "ethernet"] },
        effectiveConnectionType: { type: String, enum: ["2g", "3g", "4g", "5g"] },
    },
    location: {
      countryCode: { type: String, uppercase: true, trim: true },
      region: String,
      city: String,
    },
    sessionEvents: [ReadingSessionEventSchema], // Embed if events per session are few, otherwise separate collection
    engagementScore: { type: Number, min: 0, max: 1 },
    predictedChurnRisk: { type: Number, min: 0, max: 1 },
    readingSpeedWPM: { type: Number, min: 0 },
  },
  {
    timestamps: true, // createdAt, updatedAt
    // Consider `timeseries` collection if using MongoDB 5.0+ for high-volume event data
    // timeseries: {
    //   timeField: "sessionStartTime",
    //   metaField: "user", // or a composite object
    //   granularity: "hours" // or minutes, seconds
    // }
  }
);

// ----- Indexes -----
ReadingAnalyticSchema.index({ user: 1, novel: 1, sessionStartTime: -1 });
ReadingAnalyticSchema.index({ novel: 1, episode: 1, sessionStartTime: -1 });
ReadingAnalyticSchema.index({ sessionId: 1 }, { unique: true });
ReadingAnalyticSchema.index({ sessionStartTime: -1 }); // For general time-based queries
ReadingAnalyticSchema.index({ "location.countryCode": 1, sessionStartTime: -1 });
ReadingAnalyticSchema.index({ novel: 1, isCompletedNovel: 1, user: 1 });
ReadingAnalyticSchema.index({ episode: 1, isCompletedEpisode: 1, user: 1 });

// For AI/ML features
ReadingAnalyticSchema.index({ novel: 1, engagementScore: -1 });
ReadingAnalyticSchema.index({ user: 1, predictedChurnRisk: -1 });

// ----- Middleware -----
ReadingAnalyticSchema.pre("save", function (next) {
  if (this.sessionEndTime && this.sessionStartTime) {
    this.durationSeconds = Math.floor((this.sessionEndTime.getTime() - this.sessionStartTime.getTime()) / 1000);
  }
  // If progress reaches 100 for an episode, mark as completed
  if (this.episode && this.endProgress === 100 && !this.isCompletedEpisode) {
      this.isCompletedEpisode = true;
      // Potentially trigger event for UserAchievement update here
  }
  next();
});

// ----- Model Export -----
const ReadingAnalyticModel = () =>
  models.ReadingAnalytic as mongoose.Model<IReadingAnalytic> || model<IReadingAnalytic>("ReadingAnalytic", ReadingAnalyticSchema);

export default ReadingAnalyticModel;

