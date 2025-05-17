// src/backend/models/Achievement.ts
// โมเดลรางวัลความสำเร็จ (Achievement Model)
// กำหนดรางวัลความสำเร็จต่างๆ ที่ผู้ใช้สามารถปลดล็อกได้ในแพลตฟอร์ม NovelMaze, พร้อมระบบเงื่อนไขและรางวัลที่ยืดหยุ่น

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IBadge } from "./Badge"; // สำหรับ rewardBadgeId
import { IOfficialMedia } from "./OfficialMedia"; // สำหรับ iconMediaId
import { IUser } from "./User"; // สมมติว่ามีการ import IUser ถ้า OfficialMedia ต้องการ

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Achievement
// ==================================================================================================

/**
 * @enum {string} AchievementCategory
 * @description หมวดหมู่หลักของรางวัลความสำเร็จ เพื่อช่วยในการจัดกลุ่มและแสดงผล
 * - `READING`: เกี่ยวกับการอ่านนิยายและตอนต่างๆ
 * - `WRITING`: เกี่ยวกับการสร้างสรรค์ผลงานนิยาย (สำหรับนักเขียน)
 * - `ENGAGEMENT`: เกี่ยวกับการมีส่วนร่วมในชุมชน (คอมเมนต์, ไลค์, ติดตาม)
 * - `COLLECTION`: เกี่ยวกับการสะสมไอเท็มต่างๆ (เช่น ป้าย, ตัวละครพิเศษ)
 * - `EVENT_PARTICIPATION`: เกี่ยวกับการเข้าร่วมกิจกรรมพิเศษของแพลตฟอร์ม
 * - `PLATFORM_MILESTONE`: เกี่ยวกับความสำเร็จหลักบนแพลตฟอร์ม (เช่น เป็นสมาชิกครบปี)
 * - `MONETIZATION`: เกี่ยวกับการสร้างรายได้หรือการใช้จ่ายบนแพลตฟอร์ม
 * - `SOCIAL_INTERACTION`: เกี่ยวกับการปฏิสัมพันธ์กับผู้ใช้อื่น
 * - `CONTENT_DISCOVERY`: เกี่ยวกับการค้นพบเนื้อหาใหม่ๆ หรือหมวดหมู่ที่หลากหลาย
 * - `LEARNING_AND_EXPLORATION`: เกี่ยวกับการเรียนรู้การใช้งานฟีเจอร์ต่างๆ ของแพลตฟอร์ม
 * - `OTHER`: หมวดหมู่อื่นๆ ที่ไม่เข้าพวก
 */
export enum AchievementCategory {
  READING = "Reading",
  WRITING = "Writing",
  ENGAGEMENT = "Engagement",
  COLLECTION = "Collection",
  EVENT_PARTICIPATION = "EventParticipation",
  PLATFORM_MILESTONE = "PlatformMilestone",
  MONETIZATION = "Monetization",
  SOCIAL_INTERACTION = "SocialInteraction",
  CONTENT_DISCOVERY = "ContentDiscovery",
  LEARNING_AND_EXPLORATION = "LearningAndExploration",
  OTHER = "Other",
}

/**
 * @enum {string} AchievementRarity
 * @description ระดับความหายากของรางวัลความสำเร็จ มีผลต่อการแสดงผลและอาจมีผลต่อรางวัล
 * - `COMMON`: ทั่วไป (ปลดล็อกง่าย)
 * - `UNCOMMON`: ไม่บ่อย (มีความท้าทายเล็กน้อย)
 * - `RARE`: หายาก (ต้องใช้ความพยายามพอสมควร)
 * - `EPIC`: ยิ่งใหญ่ (ท้าทายมาก, รางวัลอาจจะดีขึ้น)
 * - `LEGENDARY`: ตำนาน (ยากที่สุดในการปลดล็อก, รางวัลพิเศษสุด)
 * - `MYTHIC`: เหนือตำนาน (สำหรับอีเว้นท์พิเศษ หรือความสำเร็จที่ยากมากๆ)
 */
export enum AchievementRarity {
  COMMON = "Common",
  UNCOMMON = "Uncommon",
  RARE = "Rare",
  EPIC = "Epic",
  LEGENDARY = "Legendary",
  MYTHIC = "Mythic",
}

/**
 * @enum {string} AchievementRewardType
 * @description ประเภทของรางวัลที่ผู้ใช้จะได้รับเมื่อปลดล็อก Achievement
 * - `COINS`: เหรียญในเกม/แพลตฟอร์ม
 * - `POINTS`: แต้มประสบการณ์ (XP) หรือแต้มพิเศษอื่นๆ
 * - `BADGE`: ป้ายรางวัล (อ้างอิง Badge model)
 * - `PROFILE_FRAME`: กรอบโปรไฟล์พิเศษ
 * - `EXCLUSIVE_CONTENT_ACCESS`: สิทธิ์ในการเข้าถึงเนื้อหาพิเศษ
 * - `DISCOUNT_VOUCHER`: คูปองส่วนลดสำหรับการซื้อในแพลตฟอร์ม
 * - `FEATURE_UNLOCK`: ปลดล็อกฟีเจอร์บางอย่าง
 * - `NO_REWARD`: ไม่มีรางวัลเป็นรูปธรรม (ตัว Achievement เองคือรางวัล)
 */
export enum AchievementRewardType {
  COINS = "Coins",
  POINTS = "Points",
  BADGE = "Badge",
  PROFILE_FRAME = "ProfileFrame",
  EXCLUSIVE_CONTENT_ACCESS = "ExclusiveContentAccess",
  DISCOUNT_VOUCHER = "DiscountVoucher",
  FEATURE_UNLOCK = "FeatureUnlock",
  NO_REWARD = "NoReward",
}

/**
 * @interface IAchievementReward
 * @description โครงสร้างของรางวัลที่ผู้ใช้จะได้รับ
 * @property {AchievementRewardType} type - ประเภทของรางวัล
 * @property {number} [value] - จำนวน (เช่น จำนวนเหรียญ, จำนวนแต้ม)
 * @property {Types.ObjectId | IBadge | string} [itemId] - ID ของไอเท็มที่เกี่ยวข้อง (เช่น Badge ID, ชื่อ frame, โค้ด voucher)
 * @property {string} [description] - คำอธิบายเพิ่มเติมเกี่ยวกับรางวัล
 */
export interface IAchievementReward {
  type: AchievementRewardType;
  value?: number;
  itemId?: Types.ObjectId | IBadge | string; // string for profile frame name or voucher code
  description?: string;
}
const AchievementRewardSchema = new Schema<IAchievementReward>(
  {
    type: { type: String, enum: Object.values(AchievementRewardType), required: true },
    value: { type: Number, min: 0 },
    itemId: { type: Schema.Types.Mixed }, // Can be ObjectId for Badge, or string for others
    description: { type: String, trim: true, maxlength: 255 },
  },
  { _id: false }
);

/**
 * @enum {string} UnlockConditionOperator
 * @description ตัวดำเนินการสำหรับเงื่อนไขที่ซับซ้อน (ถ้ามี)
 * - `GREATER_THAN_OR_EQUAL_TO`: มากกว่าหรือเท่ากับ
 * - `EQUAL_TO`: เท่ากับ
 * - `LESS_THAN_OR_EQUAL_TO`: น้อยกว่าหรือเท่ากับ
 */
export enum UnlockConditionOperator {
  GREATER_THAN_OR_EQUAL_TO = ">=",
  EQUAL_TO = "==",
  LESS_THAN_OR_EQUAL_TO = "<=",
}

/**
 * @interface IAchievementUnlockCondition
 * @description โครงสร้างของเงื่อนไขในการปลดล็อก Achievement
 * @property {string} eventName - ชื่อ event หรือ metric ที่ใช้ในการตรวจสอบ (เช่น "user_read_episode_count", "user_total_comments_posted")
 * @property {UnlockConditionOperator} operator - ตัวดำเนินการเปรียบเทียบ (default: GREATER_THAN_OR_EQUAL_TO)
 * @property {number | string | boolean} targetValue - ค่าเป้าหมายที่ต้องทำให้สำเร็จ (เช่น 10 ตอน, "published", true)
 * @property {string} [description] - คำอธิบายเงื่อนไขนี้ (human-readable)
 * @property {string} [relatedEntity] - (Optional) ชื่อ Entity ที่เกี่ยวข้องกับเงื่อนไขนี้ (เช่น "Novel", "Category")
 * @property {Types.ObjectId | string} [relatedEntityId] - (Optional) ID ของ Entity ที่เกี่ยวข้อง
 * @property {number} [group] - (Optional) สำหรับจัดกลุ่มเงื่อนไข (AND/OR logic จะจัดการใน service layer)
 */
export interface IAchievementUnlockCondition {
  eventName: string;
  operator?: UnlockConditionOperator;
  targetValue: number | string | boolean;
  description?: string;
  relatedEntity?: string;
  relatedEntityId?: Types.ObjectId | string;
  group?: number;
}
const AchievementUnlockConditionSchema = new Schema<IAchievementUnlockCondition>(
  {
    eventName: { type: String, required: true, trim: true, maxlength: 100 },
    operator: { type: String, enum: Object.values(UnlockConditionOperator), default: UnlockConditionOperator.GREATER_THAN_OR_EQUAL_TO },
    targetValue: { type: Schema.Types.Mixed, required: true },
    description: { type: String, trim: true, maxlength: 500 },
    relatedEntity: { type: String, trim: true, maxlength: 100 },
    relatedEntityId: { type: Schema.Types.Mixed },
    group: { type: Number },
  },
  { _id: false }
);

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร Achievement (IAchievement Document Interface)
// ==================================================================================================

/**
 * @interface IAchievement
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสาร "ต้นแบบ" ของรางวัลความสำเร็จใน Collection "achievements"
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสาร
 * @property {string} achievementCode - รหัสเฉพาะของ Achievement (human-readable, unique, เช่น "FIRST_NOVEL_PUBLISHED") (**จำเป็น**, **unique**)
 * @property {string} title - ชื่อรางวัลความสำเร็จ (เช่น "นักอ่านตัวยง", "นักเขียนดาวรุ่ง") (**จำเป็น**)
 * @property {string} description - คำอธิบายเกี่ยวกับรางวัลและวิธีการปลดล็อก (**จำเป็น**)
 * @property {Types.ObjectId | IOfficialMedia} [iconMediaId] - (Optional) ID ของ OfficialMedia ที่ใช้เป็นไอคอน (อาจเป็น ObjectId หรือ populated IOfficialMedia)
 * @property {string} [customIconUrl] - (Optional) URL ไอคอนแบบกำหนดเอง (ถ้าไม่ได้ใช้ OfficialMedia)
 * @property {AchievementCategory} category - หมวดหมู่ของรางวัลความสำเร็จ (**จำเป็น**)
 * @property {AchievementRarity} rarity - ระดับความหายากของรางวัล (**จำเป็น**, default: `COMMON`)
 * @property {IAchievementUnlockCondition[]} unlockConditions - รายการเงื่อนไขในการปลดล็อก (**จำเป็น**, ต้องมีอย่างน้อย 1 เงื่อนไข)
 * @property {IAchievementReward[]} [rewards] - รายการรางวัลที่จะได้รับเมื่อปลดล็อก (Optional)
 * @property {string} [unlockHint] - (Optional) คำใบ้ในการปลดล็อก (สำหรับรางวัลที่ซับซ้อนหรือเป็นความลับบางส่วน)
 * @property {boolean} isActive - สถานะการเปิดใช้งานของรางวัลนี้ (default: `true`)
 * @property {boolean} isSecret - เป็นรางวัลลับหรือไม่ (ไม่แสดงในรายการจนกว่าจะปลดล็อก, default: `false`)
 * @property {boolean} isRepeatable - สามารถปลดล็อกซ้ำได้หรือไม่ (เช่น achievement รายวัน/รายสัปดาห์, default: `false`)
 * @property {number} [maxRepeats] - (Optional) จำนวนครั้งสูงสุดที่สามารถปลดล็อกซ้ำได้ (ถ้า isRepeatable = true)
 * @property {number} [points] - (Optional) แต้มที่เกี่ยวข้องกับ Achievement นี้ (อาจใช้ในการจัดอันดับหรือระบบ Gamification อื่นๆ, เช่น XP ที่ได้โดยตรงจาก Achievement นี้)
 * @property {number} displayOrder - ลำดับการแสดงผล (default: 0, ใช้ในการเรียงลำดับ)
 * @property {string[]} [tags] - (Optional) แท็กสำหรับจัดกลุ่มหรือค้นหา Achievement
 * @property {Date} [availableFrom] - (Optional) วันที่เริ่มใช้งาน Achievement นี้ (สำหรับ Event-specific)
 * @property {Date} [availableUntil] - (Optional) วันที่สิ้นสุดการใช้งาน Achievement นี้ (สำหรับ Event-specific)
 * @property {any} [metadata] - (Optional) ข้อมูลเพิ่มเติมอื่นๆ ที่เกี่ยวข้อง (เช่น ข้อมูลสำหรับ Admin UI)
 * @property {number} schemaVersion - เวอร์ชันของ schema (default: 1)
 * @property {Date} createdAt - วันที่สร้างเอกสาร (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตเอกสารล่าสุด (Mongoose `timestamps`)
 */
export interface IAchievement extends Document {
  _id: Types.ObjectId;
  achievementCode: string;
  title: string;
  description: string;
  iconMediaId?: Types.ObjectId | IOfficialMedia; // เมื่อ populate จะเป็น IOfficialMedia
  customIconUrl?: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  unlockConditions: IAchievementUnlockCondition[];
  rewards?: IAchievementReward[];
  unlockHint?: string;
  isActive: boolean;
  isSecret: boolean;
  isRepeatable: boolean;
  maxRepeats?: number;
  points?: number; // แต้ม XP ที่ได้จาก Achievement นี้โดยตรง
  displayOrder: number;
  tags?: string[];
  availableFrom?: Date;
  availableUntil?: Date;
  metadata?: any;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ Achievement (AchievementSchema)
// ==================================================================================================
const AchievementSchema = new Schema<IAchievement>(
  {
    achievementCode: {
      type: String,
      required: [true, "กรุณาระบุรหัสเฉพาะของ Achievement (Achievement Code is required)"],
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: [100, "รหัส Achievement ต้องไม่เกิน 100 ตัวอักษร"],
      match: [/^[A-Z0-9_]+$/, "รหัส Achievement สามารถมีได้เฉพาะตัวอักษรภาษาอังกฤษตัวใหญ่, ตัวเลข, และ underscore (_)"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "กรุณาระบุชื่อรางวัล (Title is required)"],
      trim: true,
      maxlength: [200, "ชื่อรางวัลต้องไม่เกิน 200 ตัวอักษร"],
      index: true, // เพื่อการค้นหา
    },
    description: {
      type: String,
      required: [true, "กรุณาระบุคำอธิบายรางวัล (Description is required)"],
      trim: true,
      maxlength: [2000, "คำอธิบายรางวัลต้องไม่เกิน 2000 ตัวอักษร"],
    },
    iconMediaId: { type: Schema.Types.ObjectId, ref: "OfficialMedia", sparse: true },
    customIconUrl: { type: String, trim: true, maxlength: [2048, "URL ไอคอนต้องไม่เกิน 2048 ตัวอักษร"] },
    category: {
      type: String,
      enum: Object.values(AchievementCategory),
      required: [true, "กรุณาระบุหมวดหมู่ของรางวัล (Category is required)"],
      index: true,
    },
    rarity: {
      type: String,
      enum: Object.values(AchievementRarity),
      default: AchievementRarity.COMMON,
      required: true,
      index: true,
    },
    unlockConditions: {
      type: [AchievementUnlockConditionSchema],
      required: true,
      validate: [(val: any[]) => val.length > 0, "ต้องมีอย่างน้อยหนึ่งเงื่อนไขในการปลดล็อก (At least one unlock condition is required)"],
    },
    rewards: { type: [AchievementRewardSchema], default: [] },
    unlockHint: { type: String, trim: true, maxlength: [500, "คำใบ้ต้องไม่เกิน 500 ตัวอักษร"] },
    isActive: { type: Boolean, default: true, index: true },
    isSecret: { type: Boolean, default: false, index: true }, // Index เพื่อ query รางวัลที่ไม่ลับได้เร็ว
    isRepeatable: { type: Boolean, default: false },
    maxRepeats: { type: Number, min: 1 },
    points: { type: Number, min: 0, default: 0 }, // แต้ม XP ที่ได้จาก Achievement นี้โดยตรง
    displayOrder: { type: Number, default: 0, index: true },
    tags: { type: [String], default: [], index: true },
    availableFrom: { type: Date, sparse: true },
    availableUntil: { type: Date, sparse: true },
    metadata: { type: Schema.Types.Mixed },
    schemaVersion: { type: Number, default: 1, min: 1 },
  },
  {
    timestamps: true, // createdAt, updatedAt
    collection: "achievements", // ชื่อ collection ที่เหมาะสม
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

AchievementSchema.index({ category: 1, rarity: 1, isActive: 1, displayOrder: 1 }, { name: "AchievementQueryIndex" });
AchievementSchema.index({ tags: 1, isActive: 1 }, { sparse: true, name: "AchievementByTagsIndex" });
AchievementSchema.index({ availableFrom: 1, availableUntil: 1, isActive: 1 }, { sparse: true, name: "AchievementAvailabilityIndex" });

// Compound index for unlock condition eventNames (if frequently queried, can be large)
// AchievementSchema.index({ "unlockConditions.eventName": 1, isActive: 1 }, { name: "AchievementByEventNameIndex" });

// ==================================================================================================
// SECTION: Validation and Middleware (Mongoose Hooks)
// ==================================================================================================

// Validate icon: ต้องมี iconMediaId หรือ customIconUrl อย่างใดอย่างหนึ่ง (หรือไม่มีเลยก็ได้)
AchievementSchema.path("iconMediaId").validate(function(this: IAchievement, value: any) {
  // Allow if customIconUrl is provided
  if (this.customIconUrl) return true;
  // Allow if no icon is provided at all (value is null/undefined)
  if (!value && !this.customIconUrl) return true;
  // If value is provided, it must be a valid ObjectId (Mongoose handles this for type: Schema.Types.ObjectId)
  return true;
}, "สามารถระบุ iconMediaId หรือ customIconUrl ได้อย่างใดอย่างหนึ่ง หรือไม่ระบุเลยก็ได้");

AchievementSchema.path("customIconUrl").validate(function(this: IAchievement, value: any) {
  if (this.iconMediaId && value) {
    // this.invalidate("customIconUrl", "ไม่สามารถระบุ customIconUrl พร้อมกับ iconMediaId ได้", value); // Mongoose 6+ ไม่ใช้ invalidate แบบนี้
    return false; // ทำให้ validation fail
  }
  return true;
}, "ไม่สามารถระบุ customIconUrl พร้อมกับ iconMediaId ได้");

// Validate maxRepeats if isRepeatable is true
AchievementSchema.path("maxRepeats").validate(function(this: IAchievement, value: any) {
  if (this.isRepeatable && (typeof value !== 'number' || value < 1)) {
    return false;
  }
  if (!this.isRepeatable && value != null) { // หากไม่สามารถทำซ้ำได้ ไม่ควรมีค่า maxRepeats
    return false;
  }
  return true;
}, "การตั้งค่า maxRepeats ไม่ถูกต้องตาม isRepeatable");

// Middleware ก่อน save
AchievementSchema.pre<IAchievement>("save", async function (next) {
  // Ensure achievementCode is uppercase
  if (this.isModified("achievementCode")) {
    this.achievementCode = this.achievementCode.toUpperCase();
  }

  // Default displayOrder based on rarity if not set
  if (this.isNew && this.displayOrder === 0) { // ให้ displayOrder เริ่มต้นตาม Rarity หากยังไม่ได้กำหนด
    switch (this.rarity) {
      case AchievementRarity.MYTHIC: this.displayOrder = 100; break;
      case AchievementRarity.LEGENDARY: this.displayOrder = 90; break;
      case AchievementRarity.EPIC: this.displayOrder = 80; break;
      case AchievementRarity.RARE: this.displayOrder = 70; break;
      case AchievementRarity.UNCOMMON: this.displayOrder = 60; break;
      default: this.displayOrder = 50; break; // COMMON และอื่นๆ
    }
  }
  next();
});

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

// ตรวจสอบว่า Model "Achievement" ถูกสร้างไปแล้วหรือยัง ถ้ายัง ให้สร้าง Model ใหม่
const AchievementModel =
  (models.Achievement as mongoose.Model<IAchievement>) ||
  model<IAchievement>("Achievement", AchievementSchema);

export default AchievementModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Unlock Logic**: โมเดลนี้กำหนด "โครงสร้าง" ของ Achievement เท่านั้น.
//     Logic ในการตรวจสอบและปลดล็อก Achievement จริงของผู้ใช้ (สร้าง UserAchievement document)
//     จะต้องถูกจัดการใน Service Layer หรือผ่านระบบ Event Bus ที่คอยดักจับ `eventName` จาก `unlockConditions`.
// 2.  **Dynamic Conditions**: `unlockConditions.targetValue` เป็น `Mixed` type เพื่อความยืดหยุ่น
//     แต่ควรมีการ validate ประเภทข้อมูลให้สอดคล้องกับ `eventName` ใน service layer.
// 3.  **Localization**: `title`, `description`, `unlockHint` ควรสนับสนุนหลายภาษา (i18n) ในอนาคต.
//     อาจจะเปลี่ยนเป็น Object ที่มี key เป็น language code เช่น { en: "Title", th: "ชื่อรางวัล" }.
// 4.  **Versioning**: `schemaVersion` ช่วยในการจัดการการเปลี่ยนแปลงโครงสร้างของ Achievement ในอนาคต.
// 5.  **Performance of Unlock Checking**: การตรวจสอบเงื่อนไขการปลดล็อกอาจมีผลต่อ performance.
//     ควรออกแบบให้มีประสิทธิภาพ, อาจใช้ denormalized counters ใน User model หรือ UserProfileStats model.
// 6.  **Admin UI**: ควรมี Admin UI ที่ใช้งานง่ายสำหรับการสร้างและจัดการ Achievements เหล่านี้.
// 7.  **Testing**: เงื่อนไขการปลดล็อกที่ซับซ้อนควรมีการทดสอบอย่างละเอียด.
// ==================================================================================================