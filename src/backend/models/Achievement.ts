// src/backend/models/Achievement.ts
// โมเดลรางวัลความสำเร็จ (Achievement Model)
// กำหนดรางวัลความสำเร็จต่างๆ ที่ผู้ใช้สามารถปลดล็อกได้ในแพลตฟอร์ม DivWy, พร้อมระบบเงื่อนไขและรางวัลที่ยืดหยุ่น

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IBadge } from "./Badge"; // สำหรับ rewardBadgeId
import { IOfficialMedia } from "./OfficialMedia"; // สำหรับ iconMediaId

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
 * - `USER_PROGRESSION`: (ใหม่) เกี่ยวกับความก้าวหน้าของผู้ใช้ เช่น การขึ้น Level
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
  USER_PROGRESSION = "UserProgression", // ใหม่: สำหรับความก้าวหน้า เช่น Level Up
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
 * เน้นรางวัลที่มีมูลค่าสูงตาม "Gamification_System_Implementation.txt" [cite: 1]
 * - `COINS`: เหรียญในเกม/แพลตฟอร์ม (จำนวนมาก)
 * - `EXPERIENCE_POINTS`: แต้มประสบการณ์ (XP) (จำนวนมาก)
 * - `BADGE`: ป้ายรางวัล (อ้างอิง Badge model, สำหรับ Achievement ระดับสูง)
 * - `PROFILE_FRAME`: กรอบโปรไฟล์พิเศษ
 * - `EXCLUSIVE_CONTENT_ACCESS`: สิทธิ์ในการเข้าถึงเนื้อหาพิเศษ
 * - `DISCOUNT_VOUCHER`: คูปองส่วนลดสำหรับการซื้อในแพลตฟอร์ม
 * - `FEATURE_UNLOCK`: ปลดล็อกฟีเจอร์บางอย่าง (ระบุด้วย featureUnlockKey)
 * - `NO_REWARD`: ไม่มีรางวัลเป็นรูปธรรม (ตัว Achievement เองคือรางวัล)
 */
export enum AchievementRewardType {
  COINS = "Coins",
  EXPERIENCE_POINTS = "ExperiencePoints",
  BADGE = "Badge", // สำหรับ Achievement ระดับสูงที่ให้ Badge ด้วย
  PROFILE_FRAME = "ProfileFrame",
  EXCLUSIVE_CONTENT_ACCESS = "ExclusiveContentAccess",
  DISCOUNT_VOUCHER = "DiscountVoucher",
  FEATURE_UNLOCK = "FeatureUnlock",
  NO_REWARD = "NoReward",
}

/**
 * @interface IAchievementReward
 * @description โครงสร้างของรางวัลที่ผู้ใช้จะได้รับจากการปลดล็อก Achievement.
 * ปรับปรุงตาม "Gamification_System_Implementation.txt" [cite: 1] ให้เน้นรางวัลมูลค่าสูง
 * และสามารถให้ Badge ได้เมื่อบรรลุ Achievement ระดับสูงสุด
 * @property {AchievementRewardType} type - ประเภทของรางวัล
 * @property {number} [experiencePointsAwarded] - (ใหม่) แต้มประสบการณ์ (XP) ที่จะได้รับ (จำนวนมาก)
 * @property {number} [coinsAwarded] - (ใหม่) จำนวนเหรียญ (Coins) ที่จะได้รับ (จำนวนมาก)
 * @property {string} [featureUnlockKey] - (ใหม่) Key สำหรับปลดล็อกฟีเจอร์
 * @property {Types.ObjectId | IBadge | string} [grantedBadgeId] - (ใหม่) ID ของ Badge ที่จะมอบให้เมื่อปลดล็อก Achievement นี้ (อ้างอิง Badge Model)
 * @property {string} [grantedBadgeKey] - (ใหม่, Denormalized) Key ของ Badge ที่มอบให้ (เพื่อความสะดวกในการอ้างอิง)
 * @property {any} [value] - (เดิม, อาจจะยังคงไว้สำหรับ reward type อื่นๆ) จำนวน หรือค่าเฉพาะของรางวัล (เช่น ID ของ item อื่น, ชื่อ frame)
 * @property {string} [description] - คำอธิบายเพิ่มเติมเกี่ยวกับรางวัล
 */
export interface IAchievementReward {
  type: AchievementRewardType;
  experiencePointsAwarded?: number;
  coinsAwarded?: number;
  featureUnlockKey?: string;
  grantedBadgeId?: Types.ObjectId | IBadge | string; // สามารถเป็น ObjectId หรือ populated IBadge, หรือ string สำหรับ badge key
  grantedBadgeKey?: string;
  value?: any; // สำหรับ backward compatibility หรือ reward type อื่นๆ ที่ไม่ตรงกับ field เฉพาะ
  description?: string;
}
const AchievementRewardSchema = new Schema<IAchievementReward>(
  {
    type: { type: String, enum: Object.values(AchievementRewardType), required: true },
    experiencePointsAwarded: { type: Number, min: 0, comment: "แต้ม XP ที่จะได้รับ (จำนวนมาก)" },
    coinsAwarded: { type: Number, min: 0, comment: "จำนวน Coins ที่จะได้รับ (จำนวนมาก)" },
    featureUnlockKey: { type: String, trim: true, maxlength: 100, comment: "Key สำหรับปลดล็อกฟีเจอร์" },
    grantedBadgeId: { type: Schema.Types.Mixed, comment: "ID หรือ Key ของ Badge ที่จะมอบให้" }, // ใช้ Mixed เพื่อรองรับ ObjectId หรือ string (key)
    grantedBadgeKey: { type: String, trim: true, maxlength: 100, comment: "Key ของ Badge ที่มอบให้ (Denormalized)" },
    value: { type: Schema.Types.Mixed, comment: "ค่าเฉพาะของรางวัล (ถ้ามี, เช่น item ID, frame name)" },
    description: { type: String, trim: true, maxlength: 255, comment: "คำอธิบายรางวัล" },
  },
  { _id: false }
);

/**
 * @enum {string} UnlockConditionOperator
 * @description ตัวดำเนินการสำหรับเงื่อนไขการปลดล็อก Achievement
 * (คง Enum เดิมจากไฟล์ต้นฉบับ แต่ตรวจสอบและปรับปรุงคำอธิบายให้สอดคล้องกับการใช้งาน)
 */
export enum UnlockConditionOperator {
  GREATER_THAN_OR_EQUAL_TO_COUNT = ">=_COUNT",
  EQUAL_TO_EXACT_VALUE = "==_EXACT",
  LESS_THAN_OR_EQUAL_TO_COUNT = "<=_COUNT",
  GREATER_THAN_OR_EQUAL_TO_VALUE_FROM_EVENT = ">=_VALUE_SPECIFIC_EVENT",
  EQUAL_TO_VALUE_FROM_EVENT = "==_VALUE_SPECIFIC_EVENT",
  HAS_FLAG = "HAS_FLAG",
  NOT_HAS_FLAG = "NOT_HAS_FLAG",
  BEFORE_DATE = "BEFORE_DATE",
  AFTER_DATE = "AFTER_DATE",
  WITHIN_DURATION_SECONDS_FROM_PREVIOUS_EVENT = "WITHIN_DURATION_SECONDS_FROM_PREVIOUS_EVENT",
  CUSTOM_FUNCTION = "custom_function",
  REGEX_MATCH_ON_EVENT_DETAIL = "REGEX_MATCH_ON_EVENT_DETAIL",
}


/**
 * @interface IAchievementUnlockCondition
 * @description โครงสร้างของเงื่อนไขในการปลดล็อก Achievement
 * (คง Interface เดิมจากไฟล์ต้นฉบับ แต่ปรับปรุง comment ให้ชัดเจน)
 */
export interface IAchievementUnlockCondition {
  eventName: string;
  operator?: UnlockConditionOperator;
  targetValue: any;
  description?: string;
  relatedTo?: string;
  relatedToType?: "Novel" | "Episode" | "Category" | "User" | "Tag" | "SpecificItem" | string;
  group?: number;
  isTerminal?: boolean;
  weight?: number;
}
export const AchievementUnlockConditionSchema = new Schema<IAchievementUnlockCondition>(
  {
    eventName: {
      type: String,
      required: [true, "กรุณาระบุชื่อ Event หรือ Metric สำหรับเงื่อนไข (eventName is required)"],
      trim: true,
      maxlength: [150, "ชื่อ Event/Metric ต้องไม่เกิน 150 ตัวอักษร"],
      comment: "ชื่อ Event ที่จะใช้ในการตรวจสอบ เช่น USER_READ_EPISODE, USER_POSTED_COMMENT, USER_LEVEL_UP. ควรตรงกับ ActivityType หรือ ReadingEventType หรือเป็น Event ที่ Gamification Service รู้จัก",
    },
    operator: {
      type: String,
      enum: Object.values(UnlockConditionOperator),
      default: UnlockConditionOperator.GREATER_THAN_OR_EQUAL_TO_COUNT,
      comment: "ตัวดำเนินการที่ใช้เปรียบเทียบ เช่น >=_COUNT, ==_EXACT_VALUE",
    },
    targetValue: {
      type: Schema.Types.Mixed,
      required: [true, "กรุณาระบุค่าเป้าหมายสำหรับเงื่อนไข (targetValue is required)"],
      comment: "ค่าเป้าหมายที่ต้องการ เช่น 10 (สำหรับ count), 'sci-fi' (สำหรับ category), true (สำหรับ flag), หรือ level number",
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "คำอธิบายเงื่อนไขต้องไม่เกิน 500 ตัวอักษร"],
      comment: "คำอธิบายที่มนุษย์อ่านเข้าใจได้ของเงื่อนไขนี้",
    },
    relatedTo: {
      type: String,
      trim: true,
      maxlength: [255, "relatedTo ต้องไม่เกิน 255 ตัวอักษร"],
      comment: " (Optional) ระบุ property/entity ที่เกี่ยวข้อง เช่น novelId, category.slug หรือ path ใน event.details เช่น 'sceneDetails.isReread' ",
    },
    relatedToType: {
      type: String,
      trim: true,
      maxlength: [100, "relatedToType ต้องไม่เกิน 100 ตัวอักษร"],
      comment: " (Optional) ประเภทของ relatedTo เช่น Novel, Category, User, หรือชื่อ field ใน event details",
    },
    group: {
      type: Number,
      comment: " (Optional) สำหรับจัดกลุ่มเงื่อนไข (AND/OR logic จะจัดการใน service layer)",
    },
    isTerminal: {
        type: Boolean,
        default: false,
        comment: "(Optional) ถ้าเงื่อนไขนี้เป็นจริง ให้ปลดล็อกทันที (สำหรับ OR logic บางประเภท)",
    },
    weight: {
        type: Number,
        min: 0,
        comment: "(Optional) น้ำหนักของเงื่อนไขนี้ในการคำนวณ progress (ถ้ามี)",
    }
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
 * @property {string} [tierKey] - (ใหม่) Key สำหรับจัดกลุ่ม Achievement ที่เป็นลำดับขั้น (เช่น "REVIEW_MASTER_TIER")
 * @property {number} [tierLevel] - (ใหม่) ระดับของ Achievement ในกลุ่ม Tier (เช่น 1, 2, 3)
 * @property {Types.ObjectId | IAchievement} [previousTierAchievementId] - (ใหม่, Optional) ID ของ Achievement ใน Tier ก่อนหน้า
 * @property {Types.ObjectId | IAchievement} [nextTierAchievementId] - (ใหม่, Optional) ID ของ Achievement ใน Tier ถัดไป
 * @property {string} [unlockHint] - (ปรับปรุงแล้ว) คำใบ้ในการปลดล็อก, อาจเป็น object หรือ string เดียว
 * @property {boolean} [isHintPublic] - (ใหม่) แสดงคำใบ้ให้ผู้ใช้ทั่วไปเห็นหรือไม่
 */
export interface IAchievement extends Document {
  _id: Types.ObjectId;
  achievementCode: string;
  title: string;
  description: string;
  iconMediaId?: Types.ObjectId | IOfficialMedia;
  customIconUrl?: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  unlockConditions: Types.DocumentArray<IAchievementUnlockCondition>;
  rewards?: Types.DocumentArray<IAchievementReward>; // ปรับปรุงโครงสร้าง IAchievementReward แล้ว
  unlockHint?: string | Record<string, string>; // << ปรับปรุง: สามารถเป็น Object หรือ String
  isHintPublic?: boolean; // << ใหม่: ควบคุมการแสดงคำใบ้
  isActive: boolean;
  isSecret: boolean;
  isRepeatable: boolean;
  maxRepeats?: number;
  points?: number; // แต้ม XP ที่ได้จาก Achievement นี้โดยตรง (อาจจะรวมกับ rewards.experiencePointsAwarded)
  tierKey?: string; // << ใหม่
  tierLevel?: number; // << ใหม่
  previousTierAchievementId?: Types.ObjectId | IAchievement; // << ใหม่
  nextTierAchievementId?: Types.ObjectId | IAchievement; // << ใหม่
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
      comment: "รหัสเฉพาะที่ใช้อ้างอิง Achievement ในระบบ เช่น 'FIRST_NOVEL_READ', 'WRITER_OF_THE_MONTH'",
    },
    title: {
      type: String,
      required: [true, "กรุณาระบุชื่อรางวัล (Title is required)"],
      trim: true,
      maxlength: [200, "ชื่อรางวัลต้องไม่เกิน 200 ตัวอักษร"],
      index: true,
      comment: "ชื่อ Achievement ที่แสดงให้ผู้ใช้เห็น เช่น 'นักอ่านหน้าใหม่', 'นักเขียนยอดนิยม'",
    },
    description: {
      type: String,
      required: [true, "กรุณาระบุคำอธิบายรางวัล (Description is required)"],
      trim: true,
      maxlength: [2000, "คำอธิบายรางวัลต้องไม่เกิน 2000 ตัวอักษร"],
      comment: "คำอธิบายเกี่ยวกับ Achievement และวิธีการปลดล็อกโดยสังเขป",
    },
    iconMediaId: {
        type: Schema.Types.ObjectId,
        ref: "OfficialMedia",
        sparse: true,
        comment: "(Optional) ID ของ OfficialMedia ที่ใช้เป็นไอคอนหลักของ Achievement นี้",
    },
    customIconUrl: {
        type: String,
        trim: true,
        maxlength: [2048, "URL ไอคอนที่กำหนดเองต้องไม่เกิน 2048 ตัวอักษร"],
        validate: {
            validator: function(v: string) { return !v || /^https?:\/\//.test(v); },
            message: (props: any) => `${props.value} ไม่ใช่ URL ที่ถูกต้องสำหรับไอคอน!`
        },
        comment: "(Optional) URL ของไอคอนแบบกำหนดเอง หากไม่ได้ใช้ iconMediaId",
    },
    category: {
      type: String,
      enum: Object.values(AchievementCategory),
      required: [true, "กรุณาระบุหมวดหมู่ของรางวัล (Category is required)"],
      index: true,
      comment: "หมวดหมู่หลักของ Achievement เพื่อการจัดกลุ่ม",
    },
    rarity: {
      type: String,
      enum: Object.values(AchievementRarity),
      default: AchievementRarity.COMMON,
      required: true,
      index: true,
      comment: "ระดับความหายากของ Achievement",
    },
    unlockConditions: {
      type: [AchievementUnlockConditionSchema],
      required: true,
      validate: {
        validator: (val: any[]) => val.length > 0,
        message: "ต้องมีอย่างน้อยหนึ่งเงื่อนไขในการปลดล็อก (At least one unlock condition is required)"
      },
      comment: "รายการเงื่อนไขที่ผู้ใช้ต้องทำให้สำเร็จเพื่อปลดล็อก Achievement นี้",
    },
    rewards: {
        type: [AchievementRewardSchema], // ใช้ Schema ที่ปรับปรุงแล้ว
        default: [],
        comment: "(Optional) รายการรางวัลที่ผู้ใช้จะได้รับเมื่อปลดล็อก Achievement",
    },
    unlockHint: { // << ปรับปรุง
        type: Schema.Types.Mixed, // สามารถเป็น String หรือ Object ({ common: "...", rare: "..."})
        trim: true,
        // maxlength สำหรับ string hint, object จะไม่มี maxlength โดยตรง
        // validate: {
        //     validator: function(v: any) {
        //         if (typeof v === 'string') return v.length <= 500;
        //         if (typeof v === 'object' && v !== null) {
        //             return Object.values(v).every(hint => typeof hint === 'string' && hint.length <= 500);
        //         }
        //         return true; // Allow null/undefined
        //     },
        //     message: "คำใบ้แต่ละส่วนต้องไม่เกิน 500 ตัวอักษร"
        // },
        comment: "(Optional) คำใบ้ในการปลดล็อก อาจเป็น String หรือ Object ตาม Rarity",
    },
    isHintPublic: { type: Boolean, default: false, comment: "(ใหม่) แสดงคำใบ้ให้ผู้ใช้ทั่วไปเห็นหรือไม่" },
    isActive: { type: Boolean, default: true, index: true, comment: "สถานะว่า Achievement นี้ยังใช้งานอยู่หรือไม่ (สามารถปลดล็อกได้)" },
    isSecret: { type: Boolean, default: false, index: true, comment: "เป็น Achievement ลับหรือไม่ (ไม่แสดงในรายการจนกว่าจะปลดล็อก)" },
    isRepeatable: { type: Boolean, default: false, comment: "Achievement นี้สามารถปลดล็อกซ้ำได้หรือไม่ (เช่น รายวัน, รายสัปดาห์)" },
    maxRepeats: {
        type: Number,
        min: 1,
        validate: {
            validator: function(this: IAchievement, value: number | undefined) {
                // ถ้า isRepeatable เป็น true, maxRepeats ต้องมีค่าและ >= 1
                // ถ้า isRepeatable เป็น false, maxRepeats ควรเป็น undefined หรือ null
                if (this.isRepeatable) {
                    return value !== undefined && typeof value === 'number' && value >= 1;
                }
                return value === undefined || value === null; // หรือจะ return true เสมอถ้าไม่ repeatable
            },
            message: (props: any) => `maxRepeats ("${props.value}") ไม่ถูกต้องตามค่า isRepeatable. ต้องระบุ (>=1) เมื่อ isRepeatable=true และไม่ต้องระบุเมื่อ isRepeatable=false.`
        },
        comment: "(Optional) จำนวนครั้งสูงสุดที่สามารถปลดล็อกซ้ำได้ (ถ้า isRepeatable)",
    },
    points: { // อาจจะใช้เป็น XP โดยตรง หรือเป็น point พิเศษสำหรับระบบ leaderboard
        type: Number,
        min: 0,
        default: 0,
        comment: "(Optional) แต้มที่เกี่ยวข้องกับ Achievement นี้ (อาจใช้แทน XP หรือเพิ่มเติมจาก rewards)",
    },
    tierKey: { // << ใหม่
        type: String,
        trim: true,
        uppercase: true,
        maxlength: [100, "Tier Key ต้องไม่เกิน 100 ตัวอักษร"],
        sparse: true,
        index: true,
        comment: "(ใหม่) Key สำหรับจัดกลุ่ม Achievement ที่เป็นลำดับขั้น (เช่น 'REVIEW_MASTER_TIER')",
    },
    tierLevel: { // << ใหม่
        type: Number,
        min: 1,
        sparse: true,
        comment: "(ใหม่) ระดับของ Achievement ในกลุ่ม Tier (เช่น 1, 2, 3)",
    },
    previousTierAchievementId: { // << ใหม่
        type: Schema.Types.ObjectId,
        ref: "Achievement",
        sparse: true,
        comment: "(ใหม่, Optional) ID ของ Achievement ใน Tier ก่อนหน้า",
    },
    nextTierAchievementId: { // << ใหม่
        type: Schema.Types.ObjectId,
        ref: "Achievement",
        sparse: true,
        comment: "(ใหม่, Optional) ID ของ Achievement ใน Tier ถัดไป",
    },
    displayOrder: { type: Number, default: 0, index: true, comment: "ลำดับการแสดงผล Achievement ในรายการ (ค่ามาก่อน)" },
    tags: {
        type: [String],
        default: [],
        index: true,
        validate: {
            validator: (tags: string[]) => tags.every(tag => tag.length <= 50 && /^[a-zA-Z0-9ก-๙\-_]+$/.test(tag)), // อนุญาตไทย, eng, number, _, -
            message: "แต่ละแท็กต้องมีความยาวไม่เกิน 50 ตัวอักษร และใช้ได้เฉพาะอักขระที่อนุญาต"
        },
        comment: "(Optional) แท็กสำหรับจัดกลุ่มหรือค้นหา Achievement เพิ่มเติม",
    },
    availableFrom: { type: Date, sparse: true, comment: "(Optional) วันที่เริ่มให้ปลดล็อก Achievement นี้ (สำหรับ Event หรือ Seasonal)" },
    availableUntil: { type: Date, sparse: true, comment: "(Optional) วันที่สิ้นสุดการให้ปลดล็อก Achievement นี้" },
    metadata: { type: Schema.Types.Mixed, comment: "(Optional) ข้อมูลเพิ่มเติมอื่นๆ ที่ผู้ดูแลระบบสามารถกำหนดได้" },
    schemaVersion: { type: Number, default: 1, min: 1, comment: "เวอร์ชันของ Schema สำหรับการ Migration ในอนาคต" },
  },
  {
    timestamps: true,
    collection: "achievements",
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

AchievementSchema.index({ category: 1, rarity: 1, isActive: 1, displayOrder: 1 }, { name: "AchievementQueryIndex" });
AchievementSchema.index({ tags: 1, isActive: 1 }, { sparse: true, name: "AchievementByTagsIndex" });
AchievementSchema.index({ availableFrom: 1, availableUntil: 1, isActive: 1 }, { sparse: true, name: "AchievementAvailabilityIndex" });
AchievementSchema.index({ "unlockConditions.eventName": 1, isActive: 1 }, { name: "AchievementByEventNameIndex" });
AchievementSchema.index({ tierKey: 1, tierLevel: 1, isActive: 1 }, { name: "AchievementTierIndex", sparse: true }); // << ใหม่


// ==================================================================================================
// SECTION: Validation and Middleware (Mongoose Hooks)
// ==================================================================================================

// Validate icon: ต้องมี iconMediaId หรือ customIconUrl อย่างใดอย่างหนึ่ง (หรือไม่มีเลยก็ได้)
AchievementSchema.path("iconMediaId").validate(function(this: IAchievement, value: any) {
  if (this.customIconUrl && value) { // ถ้ามีทั้งคู่ ให้ error
    // this.invalidate("iconMediaId", "สามารถระบุ iconMediaId หรือ customIconUrl ได้เพียงอย่างเดียว", value);
    return false;
  }
  return true;
}, "สามารถระบุ iconMediaId หรือ customIconUrl ได้เพียงอย่างเดียว หรือไม่ระบุเลยก็ได้");

AchievementSchema.path("customIconUrl").validate(function(this: IAchievement, value: any) {
  if (this.iconMediaId && value) {
    // this.invalidate("customIconUrl", "ไม่สามารถระบุ customIconUrl พร้อมกับ iconMediaId ได้", value);
    return false;
  }
  return true;
}, "ไม่สามารถระบุ customIconUrl พร้อมกับ iconMediaId ได้");


// Middleware ก่อน save
AchievementSchema.pre<IAchievement>("save", async function (next) {
  if (this.isModified("achievementCode")) {
    this.achievementCode = this.achievementCode.toUpperCase();
  }

  // Default displayOrder based on rarity and tierLevel
  if ((this.isNew && this.displayOrder === 0) || this.isModified("rarity") || this.isModified("tierLevel")) {
    let baseOrder = 50; // Default for COMMON
    switch (this.rarity) {
      case AchievementRarity.MYTHIC: baseOrder = 100; break;
      case AchievementRarity.LEGENDARY: baseOrder = 90; break;
      case AchievementRarity.EPIC: baseOrder = 80; break;
      case AchievementRarity.RARE: baseOrder = 70; break;
      case AchievementRarity.UNCOMMON: baseOrder = 60; break;
    }
    // ถ้ามี tierLevel ให้ปรับ displayOrder ภายใน rarity เดียวกัน
    // เช่น tier 1 ของ RARE จะมาก่อน tier 2 ของ RARE
    this.displayOrder = baseOrder - (this.tierLevel || 1) + 1; // Tier สูงกว่า (เลขน้อยกว่า) ควรแสดงก่อน
  }

  // Auto-populate grantedBadgeKey if grantedBadgeId is provided and is an ObjectId
  if (this.rewards && this.isModified("rewards")) {
    const BadgeModelRef = models.Badge as mongoose.Model<IBadge> || model<IBadge>("Badge");
    for (const reward of this.rewards) {
      if (reward.type === AchievementRewardType.BADGE && reward.grantedBadgeId && mongoose.Types.ObjectId.isValid(reward.grantedBadgeId.toString())) {
        if (!reward.grantedBadgeKey) { // Populate only if key is missing
          try {
            const badge = await BadgeModelRef.findById(reward.grantedBadgeId).select("badgeKey").lean();
            if (badge && badge.badgeKey) {
              reward.grantedBadgeKey = badge.badgeKey;
            }
          } catch (error) {
            console.error(`[Achievement Pre-Save Hook] Error populating grantedBadgeKey for badgeId ${reward.grantedBadgeId}:`, error);
          }
        }
      }
    }
  }
  next();
});

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================
const AchievementModel =
  (models.Achievement as mongoose.Model<IAchievement>) ||
  model<IAchievement>("Achievement", AchievementSchema);

export default AchievementModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Unlock Logic Service**: (คงเดิม) การปลดล็อก Achievement จริงของผู้ใช้ จะต้องมี Service Layer.
// 2.  **Event Name Consistency**: (คงเดิม) `eventName` ใน `unlockConditions` ควรมีการกำหนดมาตรฐาน.
// 3.  **Complex Condition Logic**: (คงเดิม) `group` field เป็นจุดเริ่มต้น, service layer จะต้อง handle การประเมิน.
// 4.  **Reward Idempotency**: (คงเดิม) การมอบรางวัล (`rewards`) ควรออกแบบให้เป็น idempotent.
// 5.  **Localization (i18n)**: (คงเดิม) `title`, `description`, `unlockHint` ควรสนับสนุนหลายภาษา.
// 6.  **Tier System Implementation**: (ใหม่)
//     - เพิ่ม `tierKey`, `tierLevel`, `previousTierAchievementId`, `nextTierAchievementId`.
//     - `tierKey` ใช้สำหรับจัดกลุ่ม Achievements ที่เป็นลำดับขั้นเดียวกัน เช่น "REVIEW_HERO_TIER".
//     - `tierLevel` ระบุระดับภายใน Tier นั้น (1, 2, 3,...).
//     - `previousTierAchievementId` และ `nextTierAchievementId` ช่วยในการ navigate ระหว่าง Tiers และอาจใช้ในเงื่อนไขปลดล็อก
//       (เช่น ต้องปลดล็อก Tier ก่อนหน้าก่อน).
//     - Service Layer จะต้องจัดการ Logic การปลดล็อกตาม Tier และการแสดงผลตามลำดับ Tier.
//     - การสร้าง Achievement แบบ Tier ควรกระทำผ่าน Admin UI ที่ช่วยจัดการความเชื่อมโยงเหล่านี้.
// 7.  **Linking Achievement to Badge**: (ใหม่)
//     - `IAchievementReward` ได้เพิ่ม `grantedBadgeId` และ `grantedBadgeKey`.
//     - เมื่อผู้ใช้ปลดล็อก Achievement ที่มี `grantedBadgeId` กำหนดไว้, Gamification Service ควรจะมอบ Badge นั้นให้ผู้ใช้ด้วย
//       โดยบันทึกใน `UserAchievement` (หรือ `UserEarnedItem`).
//     - เหมาะสำหรับกรณีที่ Achievement ระดับสูงสุดของ Tier หรือ Achievement สำคัญ มอบ Badge เป็นรางวัลเพิ่มเติม.
// 8.  **Unlock Hint Flexibility**: (ปรับปรุง) `unlockHint` สามารถเป็น string เดียว หรือ object ที่มี key เป็น Rarity
//     เพื่อให้สามารถแสดงคำใบ้ที่แตกต่างกันตามความยากของ Achievement ได้. `isHintPublic` ช่วยควบคุมการแสดงผล.
// 9.  **Clearer Reward Structure**: (ปรับปรุง) `IAchievementReward` มี fields ที่ชัดเจนขึ้นสำหรับ `experiencePointsAwarded`, `coinsAwarded`, `featureUnlockKey`
//     เพื่อให้สอดคล้องกับข้อกำหนดที่ Achievement ควรให้รางวัลมูลค่าสูง.
// 10. **`points` field clarification**: `points` field ใน `IAchievement` อาจจะยังคงไว้สำหรับระบบ leaderboard เฉพาะของ Achievement
//     หรือใช้เป็น XP ที่ให้โดยตรงนอกเหนือจากใน `rewards` array. ควรมีการนิยามการใช้งานให้ชัดเจน.
// 11. **Consistency with Badge Rewards**: ต้องแน่ใจว่าโครงสร้างรางวัลใน Achievement สอดคล้อง (แต่ไม่จำเป็นต้องเหมือนกันทุกประการ)
//     กับ Badge ที่เน้นการสะสมมากกว่าการให้รางวัลมูลค่าสูงโดยตรง.
// ==================================================================================================