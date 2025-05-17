// src/backend/models/Badge.ts
// โมเดลเหรียญตรา (Badge Model)
// จัดการข้อมูลเหรียญตราที่ผู้ใช้สามารถได้รับ เพื่อเพิ่มองค์ประกอบ Gamification และส่งเสริมการมีส่วนร่วม

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IAchievement } from "./Achievement"; // สำหรับการเชื่อมโยงกับ Achievement
import { IUser } from "./User"; // สำหรับ createdBy, updatedBy (ถ้าต้องการ track admin)

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Badge
// ==================================================================================================

/**
 * @enum {string} BadgeCategory
 * @description หมวดหมู่ของเหรียญตรา เพื่อการจัดกลุ่มและแสดงผล
 * - `READING_ACHIEVEMENTS`: เหรียญตราที่เกี่ยวข้องกับการอ่าน (เช่น อ่านนิยายครบ X เรื่อง, อ่านต่อเนื่อง Y วัน)
 * - `WRITING_ACHIEVEMENTS`: เหรียญตราที่เกี่ยวข้องกับการเขียน (เช่น เขียนนิยายเรื่องแรก, ได้รับยอดวิว X ครั้ง)
 * - `COMMUNITY_ENGAGEMENT`: เหรียญตราจากการมีส่วนร่วมในชุมชน (เช่น คอมเมนต์แรก, ได้รับไลค์ X ครั้ง, ติดตาม Y คน)
 * - `EVENT_PARTICIPATION`: เหรียญตราจากการเข้าร่วมกิจกรรมพิเศษของแพลตฟอร์ม
 * - `PLATFORM_MILESTONES`: เหรียญตราสำหรับความสำเร็จหรือการใช้งานแพลตฟอร์ม (เช่น ครบรอบ 1 ปี, ผู้ใช้คนที่ X)
 * - `SUPPORT_CONTRIBUTION`: เหรียญตราสำหรับการสนับสนุน (เช่น ผู้บริจาคดีเด่น, ผู้ทดสอบเบต้า)
 * - `COLLECTION_MASTER`: เหรียญตราสำหรับการสะสม (เช่น สะสมเหรียญตราครบทุกหมวดหมู่)
 * - `SPECIAL_HIDDEN`: เหรียญตราพิเศษหรือซ่อนเร้น (Easter Eggs)
 * - `OTHER`: หมวดหมู่อื่นๆ ที่ไม่ได้ระบุไว้
 */
export enum BadgeCategory {
  READING_ACHIEVEMENTS = "reading_achievements",
  WRITING_ACHIEVEMENTS = "writing_achievements",
  COMMUNITY_ENGAGEMENT = "community_engagement",
  EVENT_PARTICIPATION = "event_participation",
  PLATFORM_MILESTONES = "platform_milestones",
  SUPPORT_CONTRIBUTION = "support_contribution",
  COLLECTION_MASTER = "collection_master",
  SPECIAL_HIDDEN = "special_hidden",
  OTHER = "other",
}

/**
 * @enum {string} BadgeRarity
 * @description ระดับความหายากของเหรียญตรา เพื่อแสดงคุณค่าและความท้าทายในการได้รับ
 * - `COMMON`: ทั่วไป (หาได้ง่าย, เงื่อนไขไม่ซับซ้อน)
 * - `UNCOMMON`: ไม่บ่อย (ต้องใช้ความพยายามระดับหนึ่ง)
 * - `RARE`: หายาก (เงื่อนไขท้าทาย, ไม่ใช่ทุกคนที่จะได้รับ)
 * - `EPIC`: หายากมาก (ต้องใช้ความทุ่มเทและความสามารถสูง)
 * - `LEGENDARY`: ระดับตำนาน (สำหรับความสำเร็จที่ยิ่งใหญ่หรือกิจกรรมพิเศษสุดๆ)
 * - `MYTHIC`: ระดับเทพนิยาย (หายากที่สุด, อาจมีเพียงไม่กี่คนหรือจำกัดเวลา)
 * - `EVENT_EXCLUSIVE`: เฉพาะกิจกรรม (ความหายากขึ้นอยู่กับกิจกรรมนั้นๆ)
 */
export enum BadgeRarity {
  COMMON = "common",
  UNCOMMON = "uncommon",
  RARE = "rare",
  EPIC = "epic",
  LEGENDARY = "legendary",
  MYTHIC = "mythic",
  EVENT_EXCLUSIVE = "event_exclusive",
}

/**
 * @interface IBadgeUnlockCondition
 * @description (Optional) โครงสร้างสำหรับเงื่อนไขการปลดล็อกที่ซับซ้อน (ถ้าต้องการเก็บใน DB)
 * @property {string} conditionType - ประเภทของเงื่อนไข (เช่น "read_novels_count", "total_likes_received")
 * @property {number | string} targetValue - ค่าเป้าหมายที่ต้องทำให้สำเร็จ
 * @property {string} [description] - คำอธิบายเงื่อนไขย่อย
 */
export interface IBadgeUnlockCondition {
  conditionType: string;
  targetValue: number | string;
  description?: string;
}
const BadgeUnlockConditionSchema = new Schema<IBadgeUnlockCondition>(
  {
    conditionType: { type: String, required: true, trim: true },
    targetValue: { type: Schema.Types.Mixed, required: true }, // Number or String
    description: { type: String, trim: true, maxlength: 200 },
  },
  { _id: false }
);

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร Badge (IBadge Document Interface)
// ==================================================================================================

/**
 * @interface IBadge
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารเหรียญตราใน Collection "badges"
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสาร
 * @property {string} badgeKey - Unique key สำหรับอ้างอิงในโค้ดและระบบ (เช่น "FIRST_COMMENT", "YEAR_ONE_VETERAN", **จำเป็น**, immutable)
 * @property {string} badgeReadableId - ID ที่มนุษย์อ่านได้สำหรับเหรียญตรา (เช่น BDG-2024-00001, **จำเป็น**, unique)
 * @property {string} name - ชื่อเหรียญตราที่แสดงผลให้ผู้ใช้เห็น (เช่น "นักสื่อสารมือใหม่", "ผู้อยู่คู่ NovelMaze ปีแรก", **จำเป็น**)
 * @property {string} description - คำอธิบายสั้นๆ เกี่ยวกับเหรียญตรา และเกณฑ์การได้รับโดยสังเขป (**จำเป็น**)
 * @property {string} [detailedCriteriaMarkdown] - (Optional) เงื่อนไขการได้รับอย่างละเอียด, สามารถใช้ Markdown format เพื่อการแสดงผลที่สวยงาม
 * @property {string} imageUrl - URL ของรูปภาพเหรียญตรา (SVG, PNG, WebP, **จำเป็น**)
 * @property {string} [imageLockedUrl] - (Optional) URL ของรูปภาพเหรียญตราเมื่อยังไม่ถูกปลดล็อก (เช่น รูปเงา)
 * @property {BadgeCategory} category - หมวดหมู่ของเหรียญตรา (เช่น "community_engagement", **จำเป็น**)
 * @property {BadgeRarity} rarity - ระดับความหายากของเหรียญตรา (เช่น "common", **จำเป็น**)
 * @property {number} [experiencePointsAwarded] - (Optional) แต้มประสบการณ์ (XP) ที่ผู้ใช้จะได้รับเมื่อปลดล็อกเหรียญตรานี้ (default: 0)
 * @property {number} [coinsAwarded] - (Optional) เหรียญ Coins ภายในแพลตฟอร์มที่ผู้ใช้จะได้รับ (default: 0)
 * @property {Types.ObjectId | IAchievement} [relatedAchievementId] - (Optional) ID ของ Achievement ที่เกี่ยวข้องหรือเป็นเงื่อนไขในการได้รับ Badge นี้
 * @property {string} [relatedAchievementCode] - (แก้ไข: เดิมคือ relatedAchievementKey) Code ของ Achievement ที่เกี่ยวข้อง (เพื่อความสะดวกในการ query โดยไม่ต้อง populate, สอดคล้องกับฟิลด์ `achievementCode` ใน `Achievement.ts`)
 * @property {IBadgeUnlockCondition[]} [unlockConditions] - (Optional) รายการเงื่อนไขการปลดล็อกที่ซับซ้อน (ถ้าไม่ใช้ relatedAchievementId)
 * @property {string} [unlockLogicDescription] - (Optional) คำอธิบาย logic การปลดล็อกในเชิงโปรแกรม (สำหรับ dev)
 * @property {boolean} isActive - เหรียญตรานี้ยังสามารถได้รับหรือไม่ (เช่น อาจปิดการใช้งานเหรียญตราเก่า, default: true)
 * @property {boolean} isPubliclyVisible - แสดงเหรียญตรานี้ในรายการเหรียญตราทั้งหมดหรือไม่ (แม้ผู้ใช้ยังไม่ได้รับ, default: true)
 * @property {boolean} isHiddenUntilEarned - ซ่อนรายละเอียด (เช่น ชื่อ, รูป, คำอธิบาย) ของเหรียญตรานี้จนกว่าผู้ใช้จะได้รับหรือไม่ (สำหรับเหรียญตราลับ, default: false)
 * @property {Date} [availableFrom] - (Optional) วันที่เริ่มให้รับเหรียญตรานี้ (สำหรับ event-specific badges หรือ seasonal badges)
 * @property {Date} [availableUntil] - (Optional) วันที่สิ้นสุดการให้รับเหรียญตรานี้ (ถ้ามี availableFrom)
 * @property {number} [maxIssuanceCount] - (Optional) จำนวนสูงสุดที่เหรียญตรานี้สามารถถูกมอบให้ได้ทั้งหมด (เช่น เหรียญตราสำหรับ 100 คนแรก)
 * @property {number} currentIssuanceCount - จำนวนครั้งที่เหรียญตรานี้ถูกมอบให้แล้ว (ใช้คู่กับ maxIssuanceCount, default: 0)
 * @property {any} [metadata] - (Optional) ข้อมูลเพิ่มเติมอื่นๆ ที่เกี่ยวข้องกับเหรียญตรา (เช่น ข้อมูลเฉพาะสำหรับ event)
 * @property {number} schemaVersion - เวอร์ชันของ schema (default: 1)
 * @property {Types.ObjectId | IUser} [createdBy] - (Optional) ID ของ Admin ผู้สร้างเหรียญตรา
 * @property {Types.ObjectId | IUser} [updatedBy] - (Optional) ID ของ Admin ผู้แก้ไขล่าสุด
 * @property {Date} createdAt - วันที่สร้างเอกสาร (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตเอกสารล่าสุด (Mongoose `timestamps`)
 */
export interface IBadge extends Document {
  _id: Types.ObjectId;
  badgeKey: string;
  badgeReadableId: string;
  name: string;
  description: string;
  detailedCriteriaMarkdown?: string;
  imageUrl: string;
  imageLockedUrl?: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  experiencePointsAwarded?: number;
  coinsAwarded?: number;
  relatedAchievementId?: Types.ObjectId | IAchievement;
  relatedAchievementCode?: string; // แก้ไขชื่อฟิลด์นี้
  unlockConditions?: IBadgeUnlockCondition[];
  unlockLogicDescription?: string;
  isActive: boolean;
  isPubliclyVisible: boolean;
  isHiddenUntilEarned: boolean;
  availableFrom?: Date;
  availableUntil?: Date;
  maxIssuanceCount?: number;
  currentIssuanceCount: number;
  metadata?: any;
  schemaVersion: number;
  createdBy?: Types.ObjectId | IUser;
  updatedBy?: Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ Badge (BadgeSchema)
// ==================================================================================================
const BadgeSchema = new Schema<IBadge>(
  {
    badgeKey: {
      type: String,
      required: [true, "กรุณาระบุ Key เฉพาะสำหรับอ้างอิงเหรียญตรา (Badge Key is required)"],
      unique: true,
      trim: true,
      uppercase: true,
      immutable: true, // Key ไม่ควรเปลี่ยนแปลงหลังสร้าง
      match: [/^[A-Z0-9_]+(?:\.[A-Z0-9_]+)*$/, "Key ต้องประกอบด้วยตัวอักษรภาษาอังกฤษตัวใหญ่, ตัวเลข, และ _ เท่านั้น (อนุญาตให้มี . คั่นกลางได้)"],
      minlength: [3, "Badge Key ต้องมีอย่างน้อย 3 ตัวอักษร"],
      maxlength: [100, "Badge Key ต้องไม่เกิน 100 ตัวอักษร"],
      index: true,
      // ตัวอย่าง: "COMMUNITY.FIRST_COMMENT", "EVENT.NEW_YEAR_2025"
    },
    badgeReadableId: {
      type: String,
      required: [true, "กรุณาระบุ ID ที่อ่านได้ของเหรียญตรา (Readable Badge ID is required)"],
      unique: true,
      index: true,
      // จะถูก generate ใน pre-save hook
    },
    name: {
      type: String,
      required: [true, "กรุณาระบุชื่อเหรียญตรา (Badge name is required)"],
      trim: true,
      minlength: [3, "ชื่อเหรียญตราต้องมีอย่างน้อย 3 ตัวอักษร"],
      maxlength: [150, "ชื่อเหรียญตราต้องไม่เกิน 150 ตัวอักษร"],
      // ตัวอย่าง: "นักสื่อสารดาวรุ่ง", "ผู้พิชิตกิจกรรมปีใหม่ 2025"
    },
    description: {
      type: String,
      required: [true, "กรุณาระบุคำอธิบายเหรียญตรา (Badge description is required)"],
      trim: true,
      minlength: [10, "คำอธิบายเหรียญตราต้องมีอย่างน้อย 10 ตัวอักษร"],
      maxlength: [500, "คำอธิบายเหรียญตราต้องไม่เกิน 500 ตัวอักษร"],
      // ตัวอย่าง: "มอบให้เมื่อคุณแสดงความคิดเห็นครั้งแรกบนแพลตฟอร์ม NovelMaze อย่างสร้างสรรค์"
    },
    detailedCriteriaMarkdown: {
      type: String,
      trim: true,
      maxlength: [5000, "เงื่อนไขการได้รับแบบละเอียดต้องไม่เกิน 5000 ตัวอักษร"],
    },
    imageUrl: {
      type: String,
      required: [true, "กรุณาระบุ URL รูปภาพของเหรียญตรา (Image URL is required)"],
      trim: true,
      maxlength: [2048, "URL รูปภาพต้องไม่เกิน 2048 ตัวอักษร"],
      // ตัวอย่าง: "/assets/images/badges/community/first_comment_rare.svg"
    },
    imageLockedUrl: {
      type: String,
      trim: true,
      maxlength: [2048, "URL รูปภาพ (Locked) ต้องไม่เกิน 2048 ตัวอักษร"],
      // ตัวอย่าง: "/assets/images/badges/locked_badge_default.svg"
    },
    category: {
      type: String,
      enum: Object.values(BadgeCategory),
      required: [true, "กรุณาระบุหมวดหมู่ของเหรียญตรา (Badge category is required)"],
      index: true,
    },
    rarity: {
      type: String,
      enum: Object.values(BadgeRarity),
      default: BadgeRarity.COMMON,
      required: [true, "กรุณาระบุระดับความหายากของเหรียญตรา"],
      index: true,
    },
    experiencePointsAwarded: {
      type: Number,
      min: [0, "แต้มประสบการณ์ต้องไม่ติดลบ"],
      default: 0,
    },
    coinsAwarded: {
      type: Number,
      min: [0, "จำนวนเหรียญต้องไม่ติดลบ"],
      default: 0,
    },
    relatedAchievementId: {
      type: Schema.Types.ObjectId,
      ref: "Achievement",
      index: true,
    },
    relatedAchievementCode: { // แก้ไข: Denormalized achievementCode เพื่อความสะดวกในการ query
      type: String,
      trim: true,
      index: true,
      maxlength: [100, "Related Achievement Code ต้องไม่เกิน 100 ตัวอักษร"], // สอดคล้องกับ achievementCode ใน Achievement.ts
    },
    unlockConditions: { type: [BadgeUnlockConditionSchema], default: [] },
    unlockLogicDescription: { type: String, trim: true, maxlength: [1000, "คำอธิบาย Logic ต้องไม่เกิน 1000 ตัวอักษร"] },
    isActive: { type: Boolean, default: true, index: true },
    isPubliclyVisible: { type: Boolean, default: true, index: true },
    isHiddenUntilEarned: { type: Boolean, default: false, index: true },
    availableFrom: { type: Date, index: true },
    availableUntil: {
      type: Date,
      index: true,
      validate: {
        validator: function (this: IBadge, value: Date | undefined): boolean {
          // availableUntil ต้องมาหลัง availableFrom (ถ้ามี availableFrom)
          if (this.availableFrom && value) {
            return value > this.availableFrom;
          }
          return true;
        },
        message: "วันที่สิ้นสุด (availableUntil) ต้องอยู่หลังวันที่เริ่มต้น (availableFrom)",
      },
    },
    maxIssuanceCount: { type: Number, min: [1, "จำนวนสูงสุดที่มอบให้ได้ต้องอย่างน้อย 1"] },
    currentIssuanceCount: { type: Number, default: 0, min: 0 },
    metadata: { type: Schema.Types.Mixed },
    schemaVersion: { type: Number, default: 1, min: 1 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", index: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", index: true },
  },
  {
    timestamps: true, // สร้าง createdAt และ updatedAt โดยอัตโนมัติ
    collection: "badges",
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

// ==================================================================================================
// SECTION: Virtuals (ฟิลด์เสมือน)
// ==================================================================================================

// ฟิลด์เสมือนสำหรับตรวจสอบว่าเหรียญตรานี้ยังสามารถได้รับอยู่หรือไม่ (พิจารณาทั้ง isActive และช่วงเวลา)
BadgeSchema.virtual("isCurrentlyAvailable").get(function (this: IBadge) {
  if (!this.isActive) return false;
  const now = new Date();
  if (this.availableFrom && now < this.availableFrom) return false;
  if (this.availableUntil && now > this.availableUntil) return false;
  if (this.maxIssuanceCount && this.currentIssuanceCount >= this.maxIssuanceCount) return false;
  return true;
});

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

// Index สำหรับการค้นหาตามหมวดหมู่, ความหายาก, และสถานะการใช้งาน
BadgeSchema.index({ category: 1, rarity: 1, isActive: 1 }, { name: "BadgeCategoryRarityActiveIndex" });
// Index สำหรับการค้นหาเหรียญตราที่ Public และ Active
BadgeSchema.index({ isPubliclyVisible: 1, isActive: 1, category: 1 }, { name: "PublicActiveBadgesIndex" });
// Index สำหรับการค้นหาตาม Achievement ที่เกี่ยวข้อง (ใช้ relatedAchievementCode)
BadgeSchema.index({ relatedAchievementCode: 1, isActive: 1 }, { sparse: true, name: "RelatedAchievementCodeIndex" }); // แก้ไข Index ให้ตรงกับชื่อฟิลด์
// Index สำหรับเหรียญตราที่มีเวลาจำกัด
BadgeSchema.index({ isActive: 1, availableFrom: 1, availableUntil: 1 }, { sparse: true, name: "TimeLimitedBadgesIndex" });

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

// Middleware ก่อน save เพื่อสร้าง badgeReadableId (ถ้ายังไม่มี) และดึง relatedAchievementCode
BadgeSchema.pre<IBadge>("save", async function (next) {
  // 1. สร้าง badgeReadableId ถ้ายังไม่มี (สำหรับเอกสารใหม่)
  if (this.isNew && !this.badgeReadableId) {
    // Logic การสร้าง ID ที่ซับซ้อนขึ้น อาจจะใช้ service หรือ helper
    // ตัวอย่าง: นับจำนวน badge ทั้งหมด + 1 แล้ว format
    // ใช้ models.Badge หรือ BadgeModel ที่ export ด้านล่างก็ได้ แต่ models.Badge ปลอดภัยกว่าใน hook
    const count = await (models.Badge as mongoose.Model<IBadge> || model<IBadge>("Badge", BadgeSchema)).countDocuments();
    const paddedCount = (count + 1).toString().padStart(5, "0");
    this.badgeReadableId = `NVM-BDG-${new Date().getFullYear()}-${paddedCount}`;
  }

  // 2. ถ้ามี relatedAchievementId แต่ไม่มี relatedAchievementCode (หรือมีการแก้ไข relatedAchievementId)
  //    ให้พยายามดึง achievementCode มาใส่ใน relatedAchievementCode
  //    แก้ไข: เปลี่ยนจาก achievementKey เป็น achievementCode เพื่อให้ตรงกับ Achievement.ts
  if (this.isModified("relatedAchievementId") && this.relatedAchievementId) {
    try {
      // ดึง Achievement document โดยเลือกเฉพาะฟิลด์ achievementCode
      // ใช้ models.Achievement หรือ AchievementModel ที่ import มา
      const AchievementModelRef = models.Achievement as mongoose.Model<IAchievement> || model<IAchievement>("Achievement"); // เพิ่ม model<IAchievement>("Achievement") เพื่อความปลอดภัยหาก Achievement ยังไม่ได้ถูก model ขึ้นมา
      const achievement = await AchievementModelRef
        .findById(this.relatedAchievementId)
        .select("achievementCode") // เลือกฟิลด์ achievementCode
        .lean(); // ใช้ .lean() เพื่อ performance ที่ดีขึ้นเมื่อต้องการข้อมูลดิบ

      if (achievement && achievement.achievementCode) {
        this.relatedAchievementCode = achievement.achievementCode; // กำหนดค่าให้กับ relatedAchievementCode
      } else {
        // ถ้าไม่พบ achievement หรือไม่มี achievementCode ให้เคลียร์ค่า relatedAchievementCode
        this.relatedAchievementCode = undefined;
        console.warn(`[Badge Pre-Save Hook] Achievement with ID ${this.relatedAchievementId} not found or has no achievementCode.`);
      }
    } catch (error) {
      console.warn(`[Badge Pre-Save Hook] Could not fetch achievementCode for achievementId ${this.relatedAchievementId}:`, error);
      // ไม่ควร block การ save แต่ log ไว้ และอาจจะเคลียร์ค่า relatedAchievementCode
      this.relatedAchievementCode = undefined;
    }
  } else if (this.isModified("relatedAchievementId") && !this.relatedAchievementId) {
    // กรณีที่ relatedAchievementId ถูกลบ (set เป็น null/undefined) ก็ควรลบ relatedAchievementCode ด้วย
    this.relatedAchievementCode = undefined;
  }

  next();
});

// Middleware หลัง save (Post-save hook)
BadgeSchema.post<IBadge>("save", async function (doc, next) {
  // ตัวอย่าง: สร้าง AuditLog เมื่อมีการสร้างหรือแก้ไข Badge (ถ้ามี AuditLogModel)
  // if (models.AuditLog) {
  //   const AuditLogModel = models.AuditLog as mongoose.Model<any>; // แทน any ด้วย IAuditLog
  //   const action = doc.isNew ? "BADGE_CREATED" : "BADGE_UPDATED";
  //   await AuditLogModel.create({
  //     actorUserId: doc.updatedBy || doc.createdBy, // Admin ID
  //     action: action,
  //     targetType: "Badge",
  //     targetId: doc._id,
  //     details: `Badge '${doc.name}' (Key: ${doc.badgeKey}) was ${action.toLowerCase().replace("_"," ")}.`
  //   });
  // }
  next();
});

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

// ตรวจสอบว่า Model "Badge" ถูกสร้างไปแล้วหรือยัง ถ้ายัง ให้สร้าง Model ใหม่
// การใช้ฟังก์ชันช่วยให้สามารถเรียกใช้ models.Badge ได้อย่างปลอดภัยแม้ในสภาพแวดล้อมที่อาจมีการ import วน
const BadgeModel =
  (models.Badge as mongoose.Model<IBadge>) ||
  model<IBadge>("Badge", BadgeSchema);

export default BadgeModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Dynamic Unlock Logic**: ระบบการปลดล็อกเหรียญตรา (Badge awarding) เป็นส่วนที่ซับซ้อนและมักจะอยู่นอก Model นี้
//     โดยตรง อาจจะต้องมี Service Layer หรือ Event Listeners ที่คอยตรวจสอบเงื่อนไขต่างๆ และมอบเหรียญตราให้ผู้ใช้
//     `unlockConditions` และ `relatedAchievementId` (และ `relatedAchievementCode`) เป็นเพียงข้อมูลประกอบการตัดสินใจของ logic นั้น.
// 2.  **Localization**: ชื่อ (name) และคำอธิบาย (description, detailedCriteriaMarkdown) ของเหรียญตราควรมีการรองรับหลายภาษา
//     อาจจะต้องปรับ schema เพื่อเก็บข้อมูล localized (เช่น name: { en: "English Name", th: "ชื่อภาษาไทย" }).
// 3.  **Image Optimization**: URL รูปภาพ (`imageUrl`, `imageLockedUrl`) ควรชี้ไปยังรูปภาพที่ผ่านการ optimize แล้ว
//     และอาจมีการใช้ CDN เพื่อประสิทธิภาพในการโหลด.
// 4.  **Versioning and Evolution**: `schemaVersion` มีไว้สำหรับการจัดการการเปลี่ยนแปลง schema ในอนาคต.
//     หากมีการเปลี่ยนแปลงเงื่อนไขการได้รับเหรียญตราเก่า อาจจะต้องพิจารณาสร้างเหรียญตราเวอร์ชันใหม่
//     หรือมีกระบวนการ migrate ผู้ใช้ที่ได้รับเหรียญตราเวอร์ชันเก่า.
// 5.  **Admin Interface**: การจัดการเหรียญตรา (สร้าง, แก้ไข, เปิด/ปิดการใช้งาน) จะต้องมี Admin Interface ที่ใช้งานง่าย.
// 6.  **Performance for Awarding**: การตรวจสอบเงื่อนไขเพื่อมอบเหรียญตราให้ผู้ใช้จำนวนมากอาจส่งผลต่อ performance
//     ควรออกแบบ query และ logic ให้มีประสิทธิภาพ หรือใช้ background jobs/workers.
// 7.  **UserBadge Collection**: จะต้องมีอีก Collection หนึ่ง (เช่น `UserBadge` หรือ `EarnedBadge`) เพื่อบันทึกว่าผู้ใช้คนไหน
//     ได้รับเหรียญตราอะไรบ้าง เมื่อไหร่ และอาจมีข้อมูลเพิ่มเติม เช่น จำนวนครั้งที่ได้รับ (ถ้าเหรียญตรานั้นสามารถรับซ้ำได้).
// 8.  **RelatedAchievementCode**: ฟิลด์ `relatedAchievementKey` ได้ถูกเปลี่ยนชื่อเป็น `relatedAchievementCode` เพื่อให้สอดคล้องกับชื่อฟิลด์ใน `Achievement.ts` และ logic การดึงข้อมูลก็ถูกแก้ไขให้ดึง `achievementCode` แทน.
// ==================================================================================================