// src/backend/models/Badge.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface for Badge document
// Represents a visual token or award that users can earn and display.
export interface IBadge extends Document {
  badgeId: string; // Unique, human-readable identifier (e.g., "first_novel_completed", "community_helper_lvl1")
  title: string; // ชื่อตรา (แสดงผล, รองรับหลายภาษาได้ถ้าจำเป็น)
  description: string; // คำอธิบายตรา (แสดงผล, รองรับหลายภาษาได้ถ้าจำเป็น)
  iconUrl: string; // URL ของไอคอนตรา (สำคัญมากสำหรับการแสดงผล)
  imageUrl?: string; // URL ของรูปภาพขนาดใหญ่ขึ้นสำหรับตรา (ถ้ามี, เช่น สำหรับหน้า detail)
  category: string; // หมวดหมู่ของตรา (e.g., "reading_milestones", "writing_achievements", "community_events", "platform_mastery")
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic"; // ระดับความหายาก
  // Link to Achievement (optional, if a badge is always tied to one specific achievement definition)
  // If a badge can be awarded through multiple means or directly, this might not be present or could be an array.
  linkedAchievementDefinition?: Types.ObjectId; // อ้างอิง Achievement model (ถ้า badge นี้ผูกกับ achievement โดยตรง)
  // Visibility and Status
  isPubliclyDisplayable: boolean; // ผู้ใช้สามารถเลือกแสดงบนโปรไฟล์ได้หรือไม่ (default: true)
  isActive: boolean; // ตรานี้ยังคงใช้งาน/สามารถรับได้ในระบบหรือไม่ (default: true)
  // Ordering or Grouping
  displayOrder?: number; // ลำดับการแสดงผล (ถ้าต้องการจัดเรียง badge ในหมวดหมู่)
  group?: string; // กลุ่มของตรา (e.g., "Welcome Series", "Expert Writer Series")
  // Tags for filtering and discovery
  tags?: string[]; // Tags สำหรับการจัดกลุ่มหรือค้นหา (e.g., ["event_exclusive", "limited_time"])
  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BadgeSchema = new Schema<IBadge>(
  {
    badgeId: { type: String, required: true, unique: true, trim: true, index: true },
    title: { type: String, required: [true, "กรุณาระบุชื่อตรา"], trim: true, maxlength: 150, index: true },
    description: { type: String, required: [true, "กรุณาระบุคำอธิบายตรา"], trim: true, maxlength: 1000 },
    iconUrl: { type: String, required: [true, "กรุณาระบุ URL ของไอคอน"], trim: true },
    imageUrl: { type: String, trim: true },
    category: { type: String, required: true, trim: true, index: true, maxlength: 100 },
    rarity: {
      type: String,
      enum: ["common", "uncommon", "rare", "epic", "legendary", "mythic"],
      required: true,
      default: "common",
      index: true,
    },
    linkedAchievementDefinition: { type: Schema.Types.ObjectId, ref: "Achievement", index: true, sparse: true },
    isPubliclyDisplayable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0 },
    group: { type: String, trim: true, index: true, sparse: true },
    tags: [{ type: String, trim: true, lowercase: true, index: true }],
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ----- Indexes -----
BadgeSchema.index({ title: "text", description: "text", tags: "text", category: "text" }); // For searching badges
BadgeSchema.index({ category: 1, rarity: 1, isActive: 1 });
BadgeSchema.index({ group: 1, displayOrder: 1, isActive: 1 });

// ----- Middleware -----
BadgeSchema.pre("save", function (next) {
  // Ensure badgeId is lowercase and has no spaces (like a slug)
  if (this.isModified("badgeId")) {
    this.badgeId = this.badgeId.toLowerCase().replace(/\s+/g, "_");
  }

  // Soft delete handling
  if (this.isModified("isDeleted") && this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  next();
});

// ----- Model Export -----
const BadgeModel = () =>
  models.Badge as mongoose.Model<IBadge> || model<IBadge>("Badge", BadgeSchema);

export default BadgeModel;

