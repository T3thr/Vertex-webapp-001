// src/backend/models/Achievement.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface for defining the criteria for an achievement
export interface IAchievementCriteria extends Document {
  metric: string; // Key for the metric to track (e.g., "novels_read_count", "episodes_written_count", "daily_login_streak")
  targetValue: number; // The value of the metric required to unlock
  operator?: "gte" | "lte" | "eq" | "gt" | "lt"; // Operator for comparison (default: "gte")
  timeWindowSeconds?: number; // Optional: Time window in seconds for the metric (e.g., for streaks or time-limited events)
  relatedEntity?: "novel" | "episode" | "user" | "category"; // Optional: If the metric is related to a specific type of entity
  additionalConditions?: Record<string, any>; // e.g., { genre: "fantasy" } for "read_fantasy_novels"
}

// Interface for rewards given when an achievement is unlocked
export interface IAchievementReward extends Document {
  type: "experience_points" | "virtual_currency" | "badge" | "item" | "title_unlock" | "feature_unlock"; // ประเภทของรางวัล
  value?: number | string; // จำนวน (สำหรับ points, currency), ID/name (สำหรับ badge, item, title, feature)
  currencyType?: string; // e.g., "COINS", "GEMS" (if type is virtual_currency)
  itemName?: string; // ชื่อไอเทม (ถ้า type is item)
  itemQuantity?: number; // จำนวนไอเทม (ถ้า type is item)
  description?: string; // คำอธิบายรางวัล
}

// Interface for Achievement definition document
export interface IAchievement extends Document {
  achievementId: string; // Unique, human-readable ID (e.g., "first_novel_read", "prolific_writer_bronze")
  title: string; // ชื่อความสำเร็จ (แสดงผล, รองรับหลายภาษาได้ถ้าจำเป็น)
  description: string; // คำอธิบายความสำเร็จ (แสดงผล, รองรับหลายภาษาได้ถ้าจำเป็น)
  iconUrl?: string; // URL ของไอคอนความสำเร็จ
  category: "reading" | "writing" | "community_interaction" | "platform_engagement" | "special_event" | "monetization"; // หมวดหมู่ความสำเร็จ
  type: "milestone" | "streak" | "cumulative" | "event_participation" | "hidden_discovery"; // ประเภทของความสำเร็จ
  difficulty: "bronze" | "silver" | "gold" | "platinum" | "diamond"; // ระดับความยาก (หรือใช้ points range)
  unlockPoints: number; // คะแนนที่ผู้ใช้ได้รับเมื่อปลดล็อกความสำเร็จนี้ (สำหรับระบบ ranking/leaderboard)
  // Criteria for unlocking
  unlockCriteria: IAchievementCriteria[]; // เงื่อนไขในการปลดล็อก (สามารถมีหลายเงื่อนไข, AND logic by default)
  // Rewards
  rewards: IAchievementReward[]; // รางวัลที่ได้รับเมื่อปลดล็อก
  // Status and Visibility
  isActive: boolean; // ความสำเร็จนี้เปิดใช้งานอยู่หรือไม่
  isSecret: boolean; // เป็นความสำเร็จลับหรือไม่ (ซ่อนเงื่อนไขจนกว่าจะปลดล็อก)
  isHiddenUntilUnlocked: boolean; // ซ่อนความสำเร็จทั้งหมด (รวมถึงชื่อและไอคอน) จนกว่าจะปลดล็อก
  // Progression (for multi-tier achievements)
  previousTierAchievement?: Types.ObjectId; // Achievement ก่อนหน้าใน tier เดียวกัน (อ้างอิง Achievement model)
  nextTierAchievement?: Types.ObjectId; // Achievement ถัดไปใน tier เดียวกัน (อ้างอิง Achievement model)
  // Time-related
  availableFrom?: Date; // วันที่เริ่มให้ปลดล็อกได้
  availableUntil?: Date; // วันที่สิ้นสุดการปลดล็อก (สำหรับ event-specific achievements)
  // Versioning and Tags
  version: number; // Version ของ definition นี้ (เผื่อมีการแก้ไข criteria/rewards)
  tags?: string[]; // Tags สำหรับการจัดกลุ่มหรือค้นหา
  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AchievementCriteriaSchema = new Schema<IAchievementCriteria>(
  {
    metric: { type: String, required: true, trim: true },
    targetValue: { type: Number, required: true, min: 1 },
    operator: { type: String, enum: ["gte", "lte", "eq", "gt", "lt"], default: "gte" },
    timeWindowSeconds: { type: Number, min: 0 },
    relatedEntity: { type: String, enum: ["novel", "episode", "user", "category"] },
    additionalConditions: Schema.Types.Mixed,
  },
  { _id: false }
);

const AchievementRewardSchema = new Schema<IAchievementReward>(
  {
    type: {
      type: String,
      enum: ["experience_points", "virtual_currency", "badge", "item", "title_unlock", "feature_unlock"],
      required: true,
    },
    value: Schema.Types.Mixed, // Can be number or string
    currencyType: { type: String, trim: true, uppercase: true },
    itemName: { type: String, trim: true },
    itemQuantity: { type: Number, min: 1 },
    description: { type: String, trim: true, maxlength: 200 },
  },
  { _id: false }
);

const AchievementSchema = new Schema<IAchievement>(
  {
    achievementId: { type: String, required: true, unique: true, trim: true, index: true },
    title: { type: String, required: [true, "กรุณาระบุชื่อความสำเร็จ"], trim: true, maxlength: 150, index: true },
    description: { type: String, required: [true, "กรุณาระบุคำอธิบาย"], trim: true, maxlength: 1000 },
    iconUrl: { type: String, trim: true },
    category: {
      type: String,
      enum: ["reading", "writing", "community_interaction", "platform_engagement", "special_event", "monetization"],
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["milestone", "streak", "cumulative", "event_participation", "hidden_discovery"],
      required: true,
      index: true,
    },
    difficulty: {
      type: String,
      enum: ["bronze", "silver", "gold", "platinum", "diamond"],
      required: true,
      index: true,
    },
    unlockPoints: { type: Number, required: true, min: 0, default: 0 },
    unlockCriteria: { type: [AchievementCriteriaSchema], required: true },
    rewards: [AchievementRewardSchema],
    isActive: { type: Boolean, default: true, index: true },
    isSecret: { type: Boolean, default: false },
    isHiddenUntilUnlocked: { type: Boolean, default: false },
    previousTierAchievement: { type: Schema.Types.ObjectId, ref: "Achievement" },
    nextTierAchievement: { type: Schema.Types.ObjectId, ref: "Achievement" },
    availableFrom: Date,
    availableUntil: Date,
    version: { type: Number, default: 1, min: 1 },
    tags: [{ type: String, trim: true, lowercase: true }],
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ----- Indexes -----
AchievementSchema.index({ title: "text", description: "text", tags: "text" }); // For searching
AchievementSchema.index({ category: 1, difficulty: 1, isActive: 1 });
AchievementSchema.index({ type: 1, isActive: 1 });
AchievementSchema.index({ availableFrom: 1, availableUntil: 1, isActive: 1 });
AchievementSchema.index({ tags: 1, isActive: 1 });

// ----- Middleware -----
AchievementSchema.pre("save", function (next) {
  // Ensure achievementId is lowercase and has no spaces (like a slug)
  if (this.isModified("achievementId")) {
    this.achievementId = this.achievementId.toLowerCase().replace(/\s+/g, "_");
  }

  // Soft delete handling
  if (this.isModified("isDeleted") && this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  next();
});

// ----- Virtuals -----
// Virtual to get user progress for this achievement (would require UserAchievement model)
AchievementSchema.virtual("userAchievements", {
  ref: "UserAchievement", // Assumes UserAchievement model exists
  localField: "_id",
  foreignField: "achievementDefinition", // Field in UserAchievement that refs this Achievement
});

// ----- Model Export -----
const AchievementModel = () =>
  models.Achievement as mongoose.Model<IAchievement> || model<IAchievement>("Achievement", AchievementSchema);

export default AchievementModel;

