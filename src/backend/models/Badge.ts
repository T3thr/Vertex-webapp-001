// src/backend/models/Badge.ts
// โมเดลเหรียญตรา (Badge Model)
// จัดการข้อมูลเหรียญตราที่ผู้ใช้สามารถได้รับ เพื่อเพิ่มองค์ประกอบ Gamification และส่งเสริมการมีส่วนร่วม

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
// นำเข้า IAchievementUnlockCondition จาก Achievement.ts เพื่อใช้ใน unlockConditions ของ Badge
// หรือจะ define โครงสร้างที่คล้ายกันที่นี่ก็ได้ แต่การ import ช่วยให้สอดคล้องกัน
// หาก Achievement.ts และ Badge.ts อยู่ใน path ที่ import ถึงกันได้:
import { IAchievementUnlockCondition, UnlockConditionOperator } from "./Achievement";
import { IUser } from "./User"; // สำหรับ createdBy, updatedBy

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Badge
// ==================================================================================================

/**
 * @enum {string} BadgeCategory
 * @description หมวดหมู่ของเหรียญตรา เพื่อการจัดกลุ่มและแสดงผล
 * (ใช้ Enum เดิมจากไฟล์ Badge.ts ที่ผู้ใช้ให้มา)
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
 * (ใช้ Enum เดิมจากไฟล์ Badge.ts ที่ผู้ใช้ให้มา)
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

// ไม่จำเป็นต้อง define IBadgeUnlockCondition ใหม่ ถ้าจะใช้ IAchievementUnlockCondition โดยตรง
// ถ้าต้องการความแตกต่างเล็กน้อย ค่อยสร้าง interface ใหม่
// type IBadgeUnlockCondition = IAchievementUnlockCondition; // สามารถใช้ type alias ได้

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร Badge (IBadge Document Interface)
// ==================================================================================================

/**
 * @interface IBadge
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารเหรียญตราใน Collection "badges"
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสาร
 * @property {string} badgeKey - Unique key สำหรับอ้างอิงในโค้ดและระบบ (เช่น "FIRST_COMMENT_BADGE", **จำเป็น**, immutable)
 * @property {string} badgeReadableId - ID ที่มนุษย์อ่านได้สำหรับเหรียญตรา (เช่น BDG-2024-00001, **จำเป็น**, unique)
 * @property {string} name - ชื่อเหรียญตราที่แสดงผลให้ผู้ใช้เห็น (เช่น "นักสื่อสารคนแรก", **จำเป็น**)
 * @property {string} description - คำอธิบายสั้นๆ เกี่ยวกับเหรียญตรา และเกณฑ์การได้รับโดยสังเขป (**จำเป็น**)
 * @property {IAchievementUnlockCondition[]} unlockConditions - (ปรับปรุงจาก criteria: string) โครงสร้างเงื่อนไขการปลดล็อก Badge คล้ายกับ Achievement.ts
 * @property {string} imageUrl - URL ของรูปภาพเหรียญตรา (SVG, PNG, WebP, **จำเป็น**)
 * @property {string} [imageLockedUrl] - (Optional) URL ของรูปภาพเหรียญตราเมื่อยังไม่ถูกปลดล็อก
 * @property {BadgeCategory} category - หมวดหมู่ของเหรียญตรา (**จำเป็น**)
 * @property {BadgeRarity} rarity - ระดับความหายากของเหรียญตรา (**จำเป็น**)
 * @property {number} [experiencePointsAwarded] - (Optional) แต้มประสบการณ์ (XP) ที่ผู้ใช้จะได้รับเมื่อปลดล็อก (default: 0)
 * @property {number} [coinsAwarded] - (Optional) เหรียญ Coins ภายในแพลตฟอร์มที่ผู้ใช้จะได้รับ (default: 0)
 * @property {string} [unlockLogicDescription] - (Optional) คำอธิบาย logic การปลดล็อกในเชิงโปรแกรม (สำหรับ dev)
 * @property {boolean} isActive - เหรียญตรานี้ยังสามารถได้รับหรือไม่ (default: true)
 * @property {boolean} isPubliclyVisible - แสดงเหรียญตรานี้ในรายการเหรียญตราทั้งหมดหรือไม่ (default: true)
 * @property {boolean} isHiddenUntilEarned - ซ่อนรายละเอียดของเหรียญตรานี้จนกว่าผู้ใช้จะได้รับหรือไม่ (default: false)
 * @property {Date} [availableFrom] - (Optional) วันที่เริ่มให้รับเหรียญตรานี้
 * @property {Date} [availableUntil] - (Optional) วันที่สิ้นสุดการให้รับเหรียญตรานี้
 * @property {number} [maxIssuanceCount] - (Optional) จำนวนสูงสุดที่เหรียญตรานี้สามารถถูกมอบให้ได้ทั้งหมด
 * @property {number} currentIssuanceCount - จำนวนครั้งที่เหรียญตรานี้ถูกมอบให้แล้ว (default: 0)
 * @property {any} [metadata] - (Optional) ข้อมูลเพิ่มเติมอื่นๆ
 * @property {number} schemaVersion - เวอร์ชันของ schema (default: 1)
 * @property {Types.ObjectId | IUser} [createdBy] - (Optional) ID ของ Admin ผู้สร้าง
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
  // criteria: string; // <-- Field เดิมที่จะถูกแทนที่
  unlockConditions: Types.DocumentArray<IAchievementUnlockCondition>; // <-- Field ใหม่
  imageUrl: string;
  imageLockedUrl?: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  experiencePointsAwarded?: number;
  coinsAwarded?: number;
  // relatedAchievementId และ relatedAchievementCode สามารถคงไว้ถ้า Badge บางอันยังผูกกับ Achievement โดยตรง
  // แต่ถ้าจะใช้ unlockConditions เป็นหลัก ก็อาจจะไม่จำเป็นแล้ว หรือใช้เป็นทางเลือก
  relatedAchievementId?: Types.ObjectId;
  relatedAchievementCode?: string;
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

// หาก IAchievementUnlockCondition ถูก define ใน Achievement.ts และ export ออกมา
// เราสามารถใช้ AchievementUnlockConditionSchema ที่ import มาได้เลย
// เพื่อความกระชับและกัน error หาก path import ไม่ถูกต้องใน context นี้,
// ขอยก schema ของ AchievementUnlockCondition มาไว้ที่นี่ชั่วคราว (ในโค้ดจริงควร import)
const LocalAchievementUnlockConditionSchema = new Schema<IAchievementUnlockCondition>(
  {
    eventName: {
      type: String, required: [true, "กรุณาระบุชื่อ Event หรือ Metric สำหรับเงื่อนไข (eventName is required)"],
      trim: true, maxlength: [150, "ชื่อ Event/Metric ต้องไม่เกิน 150 ตัวอักษร"],
      comment: "ชื่อ Event ที่จะใช้ในการตรวจสอบ เช่น USER_READ_EPISODE, USER_POSTED_COMMENT. ควรตรงกับ ActivityType หรือ ReadingEventType หรือเป็น Event ที่ Gamification Service รู้จัก",
    },
    operator: {
      type: String, enum: Object.values(UnlockConditionOperator),
      default: UnlockConditionOperator.GREATER_THAN_OR_EQUAL_TO_COUNT,
      comment: "ตัวดำเนินการที่ใช้เปรียบเทียบ เช่น >=_COUNT, ==_EXACT_VALUE",
    },
    targetValue: {
      type: Schema.Types.Mixed, required: [true, "กรุณาระบุค่าเป้าหมายสำหรับเงื่อนไข (targetValue is required)"],
      comment: "ค่าเป้าหมายที่ต้องการ เช่น 10, 'sci-fi', true, หรือ REGEX pattern",
    },
    description: {
      type: String, trim: true, maxlength: [500, "คำอธิบายเงื่อนไขต้องไม่เกิน 500 ตัวอักษร"],
      comment: "คำอธิบายที่มนุษย์อ่านเข้าใจได้ของเงื่อนไขนี้",
    },
    relatedTo: {
      type: String, trim: true, maxlength: [255, "relatedTo ต้องไม่เกิน 255 ตัวอักษร"],
      comment: " (Optional) ระบุ property/entity ที่เกี่ยวข้อง เช่น novelId, category.slug หรือ path ใน event.details เช่น 'sceneDetails.isReread' ",
    },
    relatedToType: {
      type: String, trim: true, maxlength: [100, "relatedToType ต้องไม่เกิน 100 ตัวอักษร"],
      comment: " (Optional) ประเภทของ relatedTo เช่น Novel, Category, User, หรือชื่อ field ใน event details",
    },
    group: { type: Number, comment: " (Optional) สำหรับจัดกลุ่มเงื่อนไข (AND/OR logic จะจัดการใน service layer)" },
    isTerminal: { type: Boolean, default: false, comment: "(Optional) ถ้าเงื่อนไขนี้เป็นจริง ให้ปลดล็อกทันที (สำหรับ OR logic บางประเภท)"},
    weight: { type: Number, min: 0, comment: "(Optional) น้ำหนักของเงื่อนไขนี้ในการคำนวณ progress (ถ้ามี)"}
  },
  { _id: false }
);


const BadgeSchema = new Schema<IBadge>(
  {
    badgeKey: {
      type: String,
      required: [true, "กรุณาระบุ Key เฉพาะสำหรับอ้างอิงเหรียญตรา (Badge Key is required)"],
      unique: true,
      trim: true,
      uppercase: true,
      immutable: true,
      match: [/^[A-Z0-9_]+(?:\.[A-Z0-9_]+)*$/, "Key ต้องประกอบด้วยตัวอักษรภาษาอังกฤษตัวใหญ่, ตัวเลข, และ _ เท่านั้น (อนุญาตให้มี . คั่นกลางได้)"],
      minlength: [3, "Badge Key ต้องมีอย่างน้อย 3 ตัวอักษร"],
      maxlength: [100, "Badge Key ต้องไม่เกิน 100 ตัวอักษร"],
      index: true,
    },
    badgeReadableId: {
      type: String,
      required: [true, "กรุณาระบุ ID ที่อ่านได้ของเหรียญตรา (Readable Badge ID is required)"],
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "กรุณาระบุชื่อเหรียญตรา (Badge name is required)"],
      trim: true,
      minlength: [3, "ชื่อเหรียญตราต้องมีอย่างน้อย 3 ตัวอักษร"],
      maxlength: [150, "ชื่อเหรียญตราต้องไม่เกิน 150 ตัวอักษร"],
    },
    description: {
      type: String,
      required: [true, "กรุณาระบุคำอธิบายเหรียญตรา (Badge description is required)"],
      trim: true,
      minlength: [10, "คำอธิบายเหรียญตราต้องมีอย่างน้อย 10 ตัวอักษร"],
      maxlength: [500, "คำอธิบายเหรียญตราต้องไม่เกิน 500 ตัวอักษร"],
    },
    // criteria: { // <-- Field เดิม
    //   type: String,
    //   required: [true, "กรุณาระบุเกณฑ์การได้รับเหรียญตรา (Criteria is required)"],
    //   trim: true,
    //   maxlength: [1000, "เกณฑ์การได้รับเหรียญตราต้องไม่เกิน 1000 ตัวอักษร"],
    // },
    unlockConditions: { // <-- Field ใหม่ แทนที่ criteria
        type: [LocalAchievementUnlockConditionSchema], // ใช้ Schema ของเงื่อนไขที่ปรับปรุงแล้ว
        required: [true, "ต้องมีอย่างน้อยหนึ่งเงื่อนไขในการปลดล็อก Badge"],
        validate: {
            validator: (val: any[]) => val.length > 0,
            message: "ต้องมีอย่างน้อยหนึ่งเงื่อนไขในการปลดล็อก Badge (At least one unlock condition is required for a Badge)"
        },
        comment: "รายการเงื่อนไขที่ผู้ใช้ต้องทำให้สำเร็จเพื่อปลดล็อก Badge นี้, คล้ายกับ Achievement"
    },
    imageUrl: {
      type: String,
      required: [true, "กรุณาระบุ URL รูปภาพของเหรียญตรา (Image URL is required)"],
      trim: true,
      maxlength: [2048, "URL รูปภาพต้องไม่เกิน 2048 ตัวอักษร"],
    },
    imageLockedUrl: {
      type: String,
      trim: true,
      maxlength: [2048, "URL รูปภาพ (Locked) ต้องไม่เกิน 2048 ตัวอักษร"],
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
    relatedAchievementId: { // ยังคงไว้เผื่อกรณีที่ Badge ผูกกับ Achievement โดยตรง
      type: Schema.Types.ObjectId,
      ref: "Achievement",
      index: true,
      sparse: true, // เพราะไม่ใช่ทุก Badge จะผูกกับ Achievement
    },
    relatedAchievementCode: { // Denormalized achievementCode
      type: String,
      trim: true,
      index: true,
      sparse: true,
      maxlength: [100, "Related Achievement Code ต้องไม่เกิน 100 ตัวอักษร"],
    },
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
    createdBy: { type: Schema.Types.ObjectId, ref: "User", index: true, sparse: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", index: true, sparse: true },
  },
  {
    timestamps: true,
    collection: "badges",
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

// ==================================================================================================
// SECTION: Virtuals, Indexes, Middleware (เหมือนเดิมจาก Badge.ts ที่ผู้ใช้ให้มา ถ้าไม่ขัดแย้งกับการเปลี่ยนแปลง)
// ==================================================================================================

// Virtual field: isCurrentlyAvailable (เหมือนเดิม)
BadgeSchema.virtual("isCurrentlyAvailable").get(function (this: IBadge) {
  if (!this.isActive) return false;
  const now = new Date();
  if (this.availableFrom && now < this.availableFrom) return false;
  if (this.availableUntil && now > this.availableUntil) return false;
  if (this.maxIssuanceCount && this.currentIssuanceCount >= this.maxIssuanceCount) return false;
  return true;
});

// Indexes (ปรับปรุงเพื่อให้สอดคล้องกับ field ใหม่ถ้ามี)
BadgeSchema.index({ category: 1, rarity: 1, isActive: 1 }, { name: "BadgeCategoryRarityActiveIndex" });
BadgeSchema.index({ isPubliclyVisible: 1, isActive: 1, category: 1 }, { name: "PublicActiveBadgesIndex" });
BadgeSchema.index({ relatedAchievementCode: 1, isActive: 1 }, { sparse: true, name: "BadgeRelatedAchievementCodeIndex" });
BadgeSchema.index({ isActive: 1, availableFrom: 1, availableUntil: 1 }, { sparse: true, name: "TimeLimitedBadgesIndex" });
BadgeSchema.index({ "unlockConditions.eventName": 1, isActive: 1 }, { sparse: true, name: "BadgeByEventNameIndex" }); // Index สำหรับ eventName ในเงื่อนไขใหม่

// Middleware (ปรับปรุง pre-save hook ให้สอดคล้อง)
BadgeSchema.pre<IBadge>("save", async function (next) {
  if (this.isNew && !this.badgeReadableId) {
    const count = await (models.Badge as mongoose.Model<IBadge> || model<IBadge>("Badge", BadgeSchema)).countDocuments();
    const paddedCount = (count + 1).toString().padStart(5, "0");
    this.badgeReadableId = `NVM-BDG-${new Date().getFullYear()}-${paddedCount}`;
  }

  if (this.isModified("relatedAchievementId") && this.relatedAchievementId) {
    try {
      const AchievementModelRef = models.Achievement as mongoose.Model<import("./Achievement").IAchievement> || model<import("./Achievement").IAchievement>("Achievement");
      const achievement = await AchievementModelRef
        .findById(this.relatedAchievementId)
        .select("achievementCode")
        .lean();
      if (achievement && achievement.achievementCode) {
        this.relatedAchievementCode = achievement.achievementCode;
      } else {
        this.relatedAchievementCode = undefined;
      }
    } catch (error) {
      this.relatedAchievementCode = undefined;
    }
  } else if (this.isModified("relatedAchievementId") && !this.relatedAchievementId) {
    this.relatedAchievementCode = undefined;
  }
  next();
});

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================
const BadgeModel =
  (models.Badge as mongoose.Model<IBadge>) ||
  model<IBadge>("Badge", BadgeSchema);

export default BadgeModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม
// ==================================================================================================
// 1.  **Dynamic Unlock Logic & Service Layer**: เช่นเดียวกับ Achievement, การปลดล็อก Badge จะต้องมี Service Layer
//     ที่คอยตรวจสอบเงื่อนไขจาก `unlockConditions` โดยเทียบกับข้อมูลจาก `ActivityHistory`,
//     `ReadingAnalytic_EventStream`, หรือ state ปัจจุบันของผู้ใช้.
// 2.  **`unlockConditions` Structure**: การใช้โครงสร้าง `IAchievementUnlockCondition` ที่ import มา
//     (หรือโครงสร้างที่เทียบเท่ากันที่ define ในไฟล์นี้) ช่วยให้ Service ที่จัดการ Gamification
//     สามารถใช้ logic การประมวลผลเงื่อนไขร่วมกันได้ระหว่าง Achievement และ Badge ซึ่งเป็นไปตามความต้องการของผู้ใช้.
// 3.  **Event Name Standardization**: `eventName` ใน `unlockConditions` ควรมีการกำหนดมาตรฐานและสอดคล้องกับ
//     `ActivityType` และ `ReadingEventType` ที่ใช้ในระบบ หรือมี mapping ที่ชัดเจน.
// 4.  **Reward Idempotency**: การมอบรางวัล (`experiencePointsAwarded`, `coinsAwarded`) ควรเป็น idempotent.
// 5.  **Localization (i18n)**: `name`, `description` ควรสนับสนุนหลายภาษา.
// 6.  **UserBadge Collection**: (เหมือนเดิม) ต้องมี Collection `UserBadge` หรือ `UserEarnedItem` (ถ้าใช้ร่วมกับ Achievement)
//     เพื่อบันทึกว่าผู้ใช้คนไหนได้รับเหรียญตราอะไรบ้าง.
// 7.  **Migration for `criteria`**: หากมีข้อมูล Badge เดิมที่ใช้ `criteria: string`, จะต้องมี script สำหรับ
//     migration ข้อมูลนั้นมาเป็นโครงสร้าง `unlockConditions` ใหม่. หรืออาจจะต้องคง `criteria` ไว้ชั่วคราว
//     และให้ระบบใหม่ทำงานกับ `unlockConditions`.
// 8.  **Clarity of `relatedAchievementId` vs `unlockConditions`**: ควรมีนโยบายที่ชัดเจนว่าเมื่อใดจะใช้
//     `relatedAchievementId` (Badge ผูกกับ Achievement โดยตรง) และเมื่อใดจะใช้ `unlockConditions`
//     (Badge มีเงื่อนไขการปลดล็อกของตัวเอง). อาจจะอนุญาตให้ใช้เพียงอย่างใดอย่างหนึ่งต่อ Badge.
//     ปัจจุบัน Schema อนุญาตให้มีทั้งคู่ได้ ซึ่ง Service จะต้องมี logic ในการพิจารณา.
// ==================================================================================================