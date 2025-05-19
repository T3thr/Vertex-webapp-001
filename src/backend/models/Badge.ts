// src/backend/models/Badge.ts
// โมเดลเหรียญตรา (Badge Model)
// จัดการข้อมูลเหรียญตราที่ผู้ใช้สามารถได้รับ เพื่อเพิ่มองค์ประกอบ Gamification และส่งเสริมการมีส่วนร่วม

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
// Import จาก Achievement.ts
import {
  IAchievementUnlockCondition, // Interface สำหรับ type hinting
  AchievementUnlockConditionSchema, // Schema instance สำหรับ reuse
  UnlockConditionOperator,
  AchievementRewardType // อาจจะใช้ AchievementRewardType ร่วมกัน แต่ปรับการใช้งาน
} from "./Achievement";
import { IUser } from "./User"; // สำหรับ createdBy, updatedBy
import { IOfficialMedia } from "./OfficialMedia"; // สำหรับ iconMediaId (ถ้าต้องการใช้ OfficialMedia สำหรับ Badge icon)

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Badge
// ==================================================================================================

/**
 * @enum {string} BadgeCategory
 * @description หมวดหมู่ของเหรียญตรา เพื่อการจัดกลุ่มและแสดงผล
 * (คง Enum เดิมจากไฟล์ Badge.ts ที่ผู้ใช้ให้มา)
 */
export enum BadgeCategory {
  READING_ACHIEVEMENTS = "reading_achievements",
  WRITING_ACHIEVEMENTS = "writing_achievements",
  COMMUNITY_ENGAGEMENT = "community_engagement",
  EVENT_PARTICIPATION = "event_participation",
  PLATFORM_MILESTONES = "platform_milestones",
  SUPPORT_CONTRIBUTION = "support_contribution",
  COLLECTION_MASTER = "collection_master",
  SPECIAL_HIDDEN = "special_hidden", // เหรียญตราลับ
  PROFILE_DECORATION = "profile_decoration", // ใหม่: สำหรับเหรียญตราที่เน้นการตกแต่งโปรไฟล์
  FROM_ACHIEVEMENT = "from_achievement", // ใหม่: หมวดหมู่สำหรับ Badge ที่ได้จาก Achievement โดยตรง
  OTHER = "other",
}

/**
 * @enum {string} BadgeRarity
 * @description ระดับความหายากของเหรียญตรา เพื่อแสดงคุณค่าและความท้าทายในการได้รับ
 * (คง Enum เดิมจากไฟล์ Badge.ts ที่ผู้ใช้ให้มา)
 */
export enum BadgeRarity {
  COMMON = "common",
  UNCOMMON = "uncommon",
  RARE = "rare",
  EPIC = "epic",
  LEGENDARY = "legendary",
  MYTHIC = "mythic", // เพิ่ม Mythic ให้สอดคล้องกับ Achievement
  EVENT_EXCLUSIVE = "event_exclusive",
}

/**
 * @interface IBadgeReward
 * @description โครงสร้างของรางวัลที่ผู้ใช้จะได้รับจากการปลดล็อก Badge.
 * ตาม "Gamification_System_Implementation.txt"[cite: 2], Badge จะเน้นการสะสม, รางวัล XP/Coins จะน้อยหรือไม่ให้เลยโดย default.
 * @property {AchievementRewardType} type - ประเภทของรางวัล (อาจใช้ enum เดียวกับ AchievementRewardType แต่จะเน้นประเภทที่ต่างกัน)
 * @property {number} [experiencePointsAwarded] - (Optional) แต้มประสบการณ์ (XP) ที่จะได้รับ (default: 0 หรือค่าน้อยมาก)
 * @property {number} [coinsAwarded] - (Optional) จำนวนเหรียญ (Coins) ที่จะได้รับ (default: 0 หรือค่าน้อยมาก)
 * @property {string} [description] - คำอธิบายเพิ่มเติมเกี่ยวกับรางวัล
 */
export interface IBadgeReward {
  type: AchievementRewardType; // อาจจะใช้ร่วมกัน แต่การใช้งานจะต่างกัน
  experiencePointsAwarded?: number;
  coinsAwarded?: number;
  description?: string;
  // อาจจะมี reward type อื่นๆ ที่เหมาะกับ Badge เช่น Profile cosmetic items
}
const BadgeRewardSchema = new Schema<IBadgeReward>(
  {
    type: { type: String, enum: Object.values(AchievementRewardType), required: true },
    experiencePointsAwarded: { type: Number, min: 0, default: 0, comment: "แต้ม XP ที่จะได้รับ (น้อยมาก หรือ 0)" },
    coinsAwarded: { type: Number, min: 0, default: 0, comment: "จำนวน Coins ที่จะได้รับ (น้อยมาก หรือ 0)" },
    description: { type: String, trim: true, maxlength: 255, comment: "คำอธิบายรางวัล (ถ้ามี)" },
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
 * @property {string} [customIconUrl] - (ใหม่) URL ไอคอนแบบกำหนดเอง (ถ้าไม่ได้ใช้ iconMediaId)
 * @property {IBadgeReward[]} [rewards] - (ใหม่) รายการรางวัลที่จะได้รับเมื่อปลดล็อก (Optional, และเน้นรางวัลที่ไม่ใช่ XP/Coins จำนวนมาก)
 * @property {string | Record<string, string>} [unlockHint] - (ปรับปรุงแล้ว) คำใบ้ในการปลดล็อก, อาจเป็น object หรือ string เดียว
 * @property {boolean} [isHintPublic] - (ใหม่) แสดงคำใบ้ให้ผู้ใช้ทั่วไปเห็นหรือไม่
 */
export interface IBadge extends Document {
  _id: Types.ObjectId;
  badgeKey: string;
  badgeReadableId: string;
  name: string;
  description: string;
  unlockConditions: Types.DocumentArray<IAchievementUnlockCondition>; // ใช้ Interface ที่ import มา
  imageUrl: string; // เน้นความสำคัญของ imageUrl ตามโจทย์
  imageLockedUrl?: string;
  iconMediaId?: Types.ObjectId | IOfficialMedia; // << ใหม่: สำหรับไอคอนขนาดเล็ก
  customIconUrl?: string; // << ใหม่: ถ้าไม่ใช้ OfficialMedia
  category: BadgeCategory;
  rarity: BadgeRarity;
  rewards?: Types.DocumentArray<IBadgeReward>; // << ใหม่: ใช้โครงสร้างรางวัลของ Badge เอง
  relatedAchievementId?: Types.ObjectId; // คงไว้สำหรับกรณีที่ Badge ผูกกับ Achievement โดยตรง
  relatedAchievementCode?: string;
  unlockLogicDescription?: string;
  unlockHint?: string | Record<string, string>; // << ปรับปรุง
  isHintPublic?: boolean; // << ใหม่
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
      immutable: true,
      match: [/^[A-Z0-9_]+(?:\.[A-Z0-9_]+)*$/, "Key ต้องประกอบด้วยตัวอักษรภาษาอังกฤษตัวใหญ่, ตัวเลข, และ _ เท่านั้น (อนุญาตให้มี . คั่นกลางได้)"],
      minlength: [3, "Badge Key ต้องมีอย่างน้อย 3 ตัวอักษร"],
      maxlength: [100, "Badge Key ต้องไม่เกิน 100 ตัวอักษร"],
      index: true,
      comment: "Key เฉพาะสำหรับอ้างอิง Badge ในระบบ เช่น 'FIRST_COMMENT', 'EVENT_PARTICIPANT_2024'",
    },
    badgeReadableId: {
      type: String,
      required: [true, "กรุณาระบุ ID ที่อ่านได้ของเหรียญตรา (Readable Badge ID is required)"],
      unique: true,
      index: true,
      comment: "ID ที่แสดงให้ผู้ใช้หรือ Admin เห็นได้ง่าย เช่น NVM-BDG-00001",
    },
    name: {
      type: String,
      required: [true, "กรุณาระบุชื่อเหรียญตรา (Badge name is required)"],
      trim: true,
      minlength: [3, "ชื่อเหรียญตราต้องมีอย่างน้อย 3 ตัวอักษร"],
      maxlength: [150, "ชื่อเหรียญตราต้องไม่เกิน 150 ตัวอักษร"],
      comment: "ชื่อ Badge ที่แสดงให้ผู้ใช้เห็น เช่น 'นักสำรวจมือใหม่', 'ผู้เข้าร่วมกิจกรรมฤดูร้อน'",
    },
    description: {
      type: String,
      required: [true, "กรุณาระบุคำอธิบายเหรียญตรา (Badge description is required)"],
      trim: true,
      minlength: [10, "คำอธิบายเหรียญตราต้องมีอย่างน้อย 10 ตัวอักษร"],
      maxlength: [500, "คำอธิบายเหรียญตราต้องไม่เกิน 500 ตัวอักษร"],
      comment: "คำอธิบายเกี่ยวกับ Badge และวิธีการปลดล็อกโดยสังเขป",
    },
    unlockConditions: {
        type: [AchievementUnlockConditionSchema], // << แก้ไข: ใช้ Schema ที่ export มาจาก Achievement.ts
        required: [true, "ต้องมีอย่างน้อยหนึ่งเงื่อนไขในการปลดล็อก Badge"],
        validate: {
            validator: (val: any[]) => val.length > 0,
            message: "ต้องมีอย่างน้อยหนึ่งเงื่อนไขในการปลดล็อก Badge (At least one unlock condition is required for a Badge)"
        },
        comment: "รายการเงื่อนไขที่ผู้ใช้ต้องทำให้สำเร็จเพื่อปลดล็อก Badge นี้"
    },
    imageUrl: { // เน้น field นี้ตามโจทย์
      type: String,
      required: [true, "กรุณาระบุ URL รูปภาพหลักของเหรียญตรา (Main Image URL is required)"],
      trim: true,
      maxlength: [2048, "URL รูปภาพหลักต้องไม่เกิน 2048 ตัวอักษร"],
      validate: {
        validator: function(v: string) { return !v || /^https?:\/\//.test(v) || /^\/assets\//.test(v); }, // อนุญาต relative path สำหรับ local assets
        message: (props: any) => `${props.value} ไม่ใช่ URL รูปภาพที่ถูกต้อง!`
      },
      comment: "URL รูปภาพหลักของ Badge (SVG, PNG, WebP). มีความสำคัญมากสำหรับความเป็นเอกลักษณ์"
    },
    imageLockedUrl: {
      type: String,
      trim: true,
      maxlength: [2048, "URL รูปภาพ (Locked) ต้องไม่เกิน 2048 ตัวอักษร"],
      validate: {
        validator: function(v: string) { return !v || /^https?:\/\//.test(v) || /^\/assets\//.test(v); },
        message: (props: any) => `${props.value} ไม่ใช่ URL รูปภาพ (Locked) ที่ถูกต้อง!`
      },
      comment: "(Optional) URL รูปภาพ Badge เมื่อยังไม่ถูกปลดล็อก (เช่น เป็นสีเทา)"
    },
    iconMediaId: { // << ใหม่
        type: Schema.Types.ObjectId,
        ref: "OfficialMedia",
        sparse: true,
        comment: "(Optional) ID ของ OfficialMedia ที่ใช้เป็นไอคอนขนาดเล็กของ Badge นี้ (เช่น สำหรับแสดงใน list)",
    },
    customIconUrl: { // << ใหม่
        type: String,
        trim: true,
        maxlength: [2048, "URL ไอคอนที่กำหนดเองต้องไม่เกิน 2048 ตัวอักษร"],
        validate: {
            validator: function(v: string) { return !v || /^https?:\/\//.test(v) || /^\/assets\//.test(v); },
            message: (props: any) => `${props.value} ไม่ใช่ URL ที่ถูกต้องสำหรับไอคอน!`
        },
        comment: "(Optional) URL ของไอคอนขนาดเล็กแบบกำหนดเอง หากไม่ได้ใช้ iconMediaId",
    },
    category: {
      type: String,
      enum: Object.values(BadgeCategory),
      required: [true, "กรุณาระบุหมวดหมู่ของเหรียญตรา (Badge category is required)"],
      index: true,
      comment: "หมวดหมู่ของ Badge เพื่อการจัดกลุ่ม",
    },
    rarity: {
      type: String,
      enum: Object.values(BadgeRarity),
      default: BadgeRarity.COMMON,
      required: [true, "กรุณาระบุระดับความหายากของเหรียญตรา"],
      index: true,
      comment: "ระดับความหายากของ Badge",
    },
    rewards: { // << ใหม่: ใช้ BadgeRewardSchema
        type: [BadgeRewardSchema],
        default: [], // Default เป็น array ว่าง, หรืออาจจะ default ให้ไม่มี reward เลย
        comment: "(Optional) รายการรางวัลที่ผู้ใช้จะได้รับ (เน้น XP/Coins น้อย หรือไม่มีเลย)",
    },
    relatedAchievementId: { // คงไว้เผื่อกรณี Badge ผูกกับ Achievement ตรงๆ
      type: Schema.Types.ObjectId,
      ref: "Achievement",
      index: true,
      sparse: true,
      comment: "(Optional) ID ของ Achievement ที่เกี่ยวข้องโดยตรง (ถ้า Badge นี้ได้จากการปลดล็อก Achievement นั้น)"
    },
    relatedAchievementCode: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
      maxlength: [100, "Related Achievement Code ต้องไม่เกิน 100 ตัวอักษร"],
      comment: "(Denormalized) รหัสของ Achievement ที่เกี่ยวข้อง",
    },
    unlockLogicDescription: {
        type: String,
        trim: true,
        maxlength: [1000, "คำอธิบาย Logic การปลดล็อกต้องไม่เกิน 1000 ตัวอักษร"],
        comment: "(Optional) คำอธิบาย Logic การปลดล็อกในเชิงโปรแกรม (สำหรับ developer/admin)",
    },
    unlockHint: { // << ปรับปรุง
        type: Schema.Types.Mixed, // สามารถเป็น String หรือ Object ({ common: "...", rare: "..."})
        trim: true,
        comment: "(Optional) คำใบ้ในการปลดล็อก Badge, อาจเป็น String หรือ Object ตาม Rarity",
    },
    isHintPublic: { type: Boolean, default: false, comment: "(ใหม่) แสดงคำใบ้ให้ผู้ใช้ทั่วไปเห็นหรือไม่" },
    isActive: { type: Boolean, default: true, index: true, comment: "สถานะว่า Badge นี้ยังสามารถได้รับหรือไม่" },
    isPubliclyVisible: { type: Boolean, default: true, index: true, comment: "แสดง Badge นี้ในรายการ Badge ทั้งหมดหรือไม่ (แม้ยังไม่ได้รับ)" },
    isHiddenUntilEarned: { type: Boolean, default: false, index: true, comment: "ซ่อนรายละเอียด Badge นี้จนกว่าผู้ใช้จะได้รับหรือไม่" },
    availableFrom: { type: Date, index: true, comment: "(Optional) วันที่เริ่มให้รับ Badge นี้ (สำหรับ Event หรือ Seasonal)" },
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
      comment: "(Optional) วันที่สิ้นสุดการให้รับ Badge นี้",
    },
    maxIssuanceCount: {
        type: Number,
        min: [1, "จำนวนสูงสุดที่มอบให้ได้ต้องอย่างน้อย 1 (ถ้ามีการจำกัด)"],
        comment: "(Optional) จำนวนครั้งสูงสุดที่ Badge นี้สามารถถูกมอบให้ผู้ใช้ทั้งหมดได้",
    },
    currentIssuanceCount: { type: Number, default: 0, min: 0, comment: "จำนวนครั้งที่ Badge นี้ถูกมอบให้แล้วทั้งหมด" },
    metadata: { type: Schema.Types.Mixed, comment: "(Optional) ข้อมูลเพิ่มเติมอื่นๆ ที่ผู้ดูแลระบบสามารถกำหนดได้" },
    schemaVersion: { type: Number, default: 1, min: 1, comment: "เวอร์ชันของ Schema สำหรับการ Migration ในอนาคต" },
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
// SECTION: Virtuals, Indexes, Middleware
// ==================================================================================================

BadgeSchema.virtual("isCurrentlyAvailable").get(function (this: IBadge) {
  if (!this.isActive) return false;
  const now = new Date();
  if (this.availableFrom && now < this.availableFrom) return false;
  if (this.availableUntil && now > this.availableUntil) return false;
  if (this.maxIssuanceCount && this.currentIssuanceCount >= this.maxIssuanceCount) return false;
  return true;
});

BadgeSchema.index({ category: 1, rarity: 1, isActive: 1 }, { name: "BadgeCategoryRarityActiveIndex" });
BadgeSchema.index({ isPubliclyVisible: 1, isActive: 1, category: 1 }, { name: "PublicActiveBadgesIndex" });
BadgeSchema.index({ relatedAchievementCode: 1, isActive: 1 }, { sparse: true, name: "BadgeRelatedAchievementCodeIndex" });
BadgeSchema.index({ isActive: 1, availableFrom: 1, availableUntil: 1 }, { sparse: true, name: "TimeLimitedBadgesIndex" });
BadgeSchema.index({ "unlockConditions.eventName": 1, isActive: 1 }, { sparse: true, name: "BadgeByEventNameIndex" });
BadgeSchema.index({ iconMediaId: 1 }, { sparse: true, name: "BadgeByIconMediaId" }); // << ใหม่

// Middleware: ก่อน save
BadgeSchema.pre<IBadge>("save", async function (next) {
  if (this.isNew && !this.badgeReadableId) {
    // สร้าง Badge Readable ID อัตโนมัติ
    const count = await (models.Badge as mongoose.Model<IBadge> || model<IBadge>("Badge", BadgeSchema)).countDocuments();
    const year = new Date().getFullYear();
    const paddedCount = (count + 1).toString().padStart(5, "0"); // สมมติว่าต้องการเลข 5 หลัก
    this.badgeReadableId = `NVM-BDG-${year}-${paddedCount}`;
  }

  if (this.isModified("relatedAchievementId") && this.relatedAchievementId) {
    try {
      // ใช้ AchievementModel ที่ import มาโดยตรง (จากไฟล์ Achievement.ts ที่อัปเดตแล้ว)
      const AchievementModelRef = models.Achievement as mongoose.Model<import("./Achievement").IAchievement> || model<import("./Achievement").IAchievement>("Achievement");
      const achievement = await AchievementModelRef
        .findById(this.relatedAchievementId)
        .select("achievementCode") // เลือกเฉพาะ field ที่ต้องการ
        .lean(); // ใช้ lean() เพื่อ performance ที่ดีขึ้น
      if (achievement && achievement.achievementCode) {
        this.relatedAchievementCode = achievement.achievementCode;
      } else {
        this.relatedAchievementCode = undefined; // หรือ null
      }
    } catch (error) {
      console.error(`[Badge Pre-Save Hook] Error populating relatedAchievementCode for achievementId ${this.relatedAchievementId}:`, error);
      this.relatedAchievementCode = undefined; // หรือ null
    }
  } else if (this.isModified("relatedAchievementId") && !this.relatedAchievementId) {
    // ถ้า relatedAchievementId ถูกลบ, ก็ลบ relatedAchievementCode ด้วย
    this.relatedAchievementCode = undefined;
  }

  // Validate icon: ต้องมี iconMediaId หรือ customIconUrl อย่างใดอย่างหนึ่ง (หรือไม่มีเลยก็ได้) ถ้า badge นั้นต้องการ icon
  if (this.iconMediaId && this.customIconUrl) {
    // this.invalidate("iconMediaId", "สามารถระบุ iconMediaId หรือ customIconUrl ได้เพียงอย่างเดียวสำหรับไอคอน", this.iconMediaId);
    return next(new Error("สามารถระบุ iconMediaId หรือ customIconUrl ได้เพียงอย่างเดียวสำหรับไอคอน Badge"));
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
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements) - ปรับปรุงล่าสุด
// ==================================================================================================
// 1.  **Dynamic Unlock Logic & Service Layer**: (คงเดิม) การปลดล็อก Badge จะต้องมี Service Layer.
// 2.  **`unlockConditions` Structure**: (ปรับปรุงแล้ว) ใช้ `AchievementUnlockConditionSchema` จาก Achievement.ts
//     เพื่อให้ Service ที่จัดการ Gamification ใช้ logic การประมวลผลเงื่อนไขร่วมกันได้.
// 3.  **Event Name Standardization**: (คงเดิม) `eventName` ใน `unlockConditions` ควรมีมาตรฐาน.
// 4.  **Badge Rewards**: (ปรับปรุงแล้ว) `rewards` field ใหม่ใช้ `IBadgeReward` ซึ่งเน้น XP/Coins น้อยหรือไม่ให้เลย
//     สอดคล้องกับ "Gamification_System_Implementation.txt" [cite: 2] ที่ว่า Badge เน้นการสะสม.
// 5.  **Localization (i18n)**: (คงเดิม) `name`, `description`, `unlockHint` ควรสนับสนุนหลายภาษา.
// 6.  **UserBadge/UserEarnedItem Collection**: (คงเดิม) ต้องมี Collection กลาง (`UserAchievement.ts` หรือชื่ออื่น)
//     เพื่อบันทึกว่าผู้ใช้คนไหนได้รับ Badge (และ Achievement) อะไรบ้าง.
// 7.  **`imageUrl` vs `iconMediaId`/`customIconUrl`**:
//     - `imageUrl`: ยังคงเป็น URL รูปภาพหลักของ Badge ที่มีขนาดใหญ่และสวยงามสำหรับแสดงผลเด่นๆ (ตามโจทย์เน้นความเป็นเอกลักษณ์ของรูปภาพ).
//     - `iconMediaId` / `customIconUrl`: (ใหม่) เพิ่มเข้ามาสำหรับไอคอนขนาดเล็กของ Badge ที่อาจจะใช้แสดงใน list,
//       notification, หรือส่วน UI อื่นๆ ที่มีพื้นที่จำกัด. ให้เลือกใช้อย่างใดอย่างหนึ่ง.
// 8.  **Unlock from Achievement**:
//     - วิธีที่ 1 (ผ่าน Achievement.rewards): Achievement ที่ปลดล็อกแล้วสามารถ grant Badge ได้ผ่าน `grantedBadgeId` ใน `IAchievementReward`.
//     - วิธีที่ 2 (Badge ตรวจสอบ Achievement): `unlockConditions` ของ Badge สามารถมีเงื่อนไข eventName: "ACHIEVEMENT_UNLOCKED"
//       และ targetValue เป็น `achievementCode` ของ Achievement ที่ต้องการ.
//     - วิธีที่ 3 (relatedAchievementId): `relatedAchievementId` field ใน Badge ยังคงมีอยู่เพื่อ link โดยตรง
//       (อาจจะ legacy หรือสำหรับกรณีง่ายๆ). Service Layer ต้องพิจารณาว่าจะใช้ logic ใด.
// 9.  **Unlock from Level Up**:
//     - `unlockConditions` ของ Badge สามารถมีเงื่อนไข eventName: "USER_LEVEL_UP" และ targetValue เป็นเลข Level ได้
//       (ตาม "Gamification_System_Implementation.txt" [cite: 4]).
// 10. **Clarity on `relatedAchievementId`**: การมีทั้ง `unlockConditions` และ `relatedAchievementId` อาจสร้างความสับสน.
//     ควรมีนโยบายที่ชัดเจน หรือให้ Service ưu tiên `unlockConditions` ถ้ามี.
// 11. **Admin UI**: ควรมี UI สำหรับ Admin ในการสร้าง, จัดการ, และทดสอบ Badges และเงื่อนไขการปลดล็อก.
// 12. **`unlockHint` and `isHintPublic`**: (ใหม่) เพิ่มความยืดหยุ่นในการให้คำใบ้และควบคุมการแสดงผล.
// ==================================================================================================