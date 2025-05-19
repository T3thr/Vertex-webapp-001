// src/backend/models/Level.ts
// โมเดลระดับผู้ใช้ (Level Model)
// กำหนดโครงสร้างของแต่ละระดับ (Level) ในระบบ Gamification, รวมถึง XP ที่ต้องการ และรางวัลที่อาจได้รับ

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IAchievement } from "./Achievement"; // สำหรับ achievementOnReachId
import { IBadge } from "./Badge"; // สำหรับ badgeOnReachId (ถ้าต้องการให้ Badge โดยตรงจาก Level)
import { IUser } from "./User"; // สำหรับการอ้างอิงในอนาคต (ถ้าจำเป็น)

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Level
// ==================================================================================================

/**
 * @interface ILevelReward
 * @description โครงสร้างของรางวัลที่ผู้ใช้จะได้รับเมื่อถึง Level นี้
 * สามารถให้ Coins, ปลดล็อก Achievement, หรือให้ Badge ได้โดยตรง
 * @property {"COINS" | "ACHIEVEMENT_UNLOCK" | "BADGE_AWARD" | "FEATURE_UNLOCK" | "PROFILE_COSMETIC"} type - ประเภทของรางวัล
 * @property {number} [coinsAwarded] - จำนวน Coins ที่จะได้รับ (ถ้า type เป็น COINS)
 * @property {Types.ObjectId | IAchievement | string} [achievementIdToUnlock] - ID หรือ Code ของ Achievement ที่จะปลดล็อก (ถ้า type เป็น ACHIEVEMENT_UNLOCK)
 * @property {Types.ObjectId | IBadge | string} [badgeIdToAward] - ID หรือ Key ของ Badge ที่จะมอบให้ (ถ้า type เป็น BADGE_AWARD)
 * @property {string} [featureKeyToUnlock] - Key ของฟีเจอร์ที่จะปลดล็อก (ถ้า type เป็น FEATURE_UNLOCK)
 * @property {string} [cosmeticItemKey] - Key ของ Profile Cosmetic Item (ถ้า type เป็น PROFILE_COSMETIC)
 * @property {string} [description] - คำอธิบายรางวัลเพิ่มเติม
 */
export interface ILevelReward {
  type: "COINS" | "ACHIEVEMENT_UNLOCK" | "BADGE_AWARD" | "FEATURE_UNLOCK" | "PROFILE_COSMETIC";
  coinsAwarded?: number;
  achievementIdToUnlock?: Types.ObjectId | IAchievement | string; // สามารถเป็น ObjectId หรือ achievementCode
  badgeIdToAward?: Types.ObjectId | IBadge | string; // สามารถเป็น ObjectId หรือ badgeKey
  featureKeyToUnlock?: string;
  cosmeticItemKey?: string;
  description?: string;
}
const LevelRewardSchema = new Schema<ILevelReward>(
  {
    type: {
      type: String,
      enum: ["COINS", "ACHIEVEMENT_UNLOCK", "BADGE_AWARD", "FEATURE_UNLOCK", "PROFILE_COSMETIC"],
      required: [true, "กรุณาระบุประเภทของรางวัล"],
    },
    coinsAwarded: { type: Number, min: 0 },
    achievementIdToUnlock: { type: Schema.Types.Mixed }, // ObjectId หรือ String (code)
    badgeIdToAward: { type: Schema.Types.Mixed }, // ObjectId หรือ String (key)
    featureKeyToUnlock: { type: String, trim: true, maxlength: 100 },
    cosmeticItemKey: { type: String, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 255 },
  },
  { _id: false }
);


// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร Level (ILevel Document Interface)
// ==================================================================================================

/**
 * @interface ILevel
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซสำหรับเอกสาร "ต้นแบบ" ของแต่ละระดับใน Collection "levels"
 * @property {number} levelNumber - หมายเลขระดับ (เช่น 1, 2, 3, ...). **จำเป็นและ unique**.
 * @property {string} title - ชื่อระดับ (เช่น "มือใหม่หัดอ่าน", "นักสำรวจโลกนิยาย"). **จำเป็น**.
 * @property {string} [levelGroupName] - (Optional) ชื่อกลุ่มของระดับ (เช่น "ช่วงเริ่มต้น", "ระดับกลาง", "ระดับสูง") เพื่อการจัดกลุ่มบน UI.
 * @property {number} xpRequiredForThisLevel - จำนวน XP สะสมทั้งหมดที่ต้องการเพื่อ "ถึง" Level นี้.
 * เช่น Level 1 = 0 XP, Level 2 = 100 XP, Level 3 = 250 XP.
 * ผู้ใช้จะอยู่ Level X ถ้า XP สะสม >= Level X.xpRequiredForThisLevel และ < Level X+1.xpRequiredForThisLevel.
 * **สำคัญ:** `xpRequiredForThisLevel` ของ Level 1 ควรเป็น 0.
 * @property {number} [xpToNextLevelFromThis] - (Computed or Stored) จำนวน XP ที่ "ต้องการเพิ่ม" จากจุดเริ่มต้นของ Level นี้ เพื่อไปถึง Level ถัดไป.
 * เช่น ถ้า Level 2 ต้องใช้ 100 XP สะสม และ Level 3 ต้องใช้ 250 XP สะสม,
 * สำหรับ Level 2: `xpToNextLevelFromThis` = 250 - 100 = 150.
 * สำหรับ Level 1 (0 XP): `xpToNextLevelFromThis` = 100 - 0 = 100.
 * ค่านี้จะถูกใช้เป็น `User.gamification.nextLevelXPThreshold` เมื่อผู้ใช้อยู่ใน Level นี้.
 * @property {Types.DocumentArray<ILevelReward>} [rewardsOnReach] - (Optional) รายการรางวัลที่จะได้รับเมื่อผู้ใช้มาถึง Level นี้.
 * @property {string} [description] - (Optional) คำอธิบายเกี่ยวกับ Level นี้.
 * @property {string} [iconUrl] - (Optional) URL ของไอคอนสำหรับ Level นี้.
 * @property {string} [themeColor] - (Optional) สีธีมสำหรับ Level นี้ (hex code).
 * @property {boolean} isActive - สถานะว่า Level นี้ยังใช้งานอยู่ในระบบหรือไม่ (default: true).
 * @property {number} schemaVersion - เวอร์ชันของ Schema.
 */
export interface ILevel extends Document {
  _id: Types.ObjectId;
  levelNumber: number;
  title: string;
  levelGroupName?: string;
  xpRequiredForThisLevel: number; // XP สะสมทั้งหมดที่ต้องการเพื่อ "ถึง" Level นี้
  xpToNextLevelFromThis?: number; // XP ที่ต้องการ "เพิ่ม" เพื่อไป Level ถัดไป
  rewardsOnReach?: Types.DocumentArray<ILevelReward>;
  description?: string;
  iconUrl?: string;
  themeColor?: string;
  isActive: boolean;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ Level (LevelSchema)
// ==================================================================================================
const LevelSchema = new Schema<ILevel>(
  {
    levelNumber: {
      type: Number,
      required: [true, "กรุณาระบุหมายเลขระดับ"],
      unique: true,
      min: [1, "หมายเลขระดับต้องเป็นค่าบวก"], // Level เริ่มต้นที่ 1
      index: true,
    },
    title: {
      type: String,
      required: [true, "กรุณาระบุชื่อระดับ"],
      trim: true,
      maxlength: [100, "ชื่อระดับต้องไม่เกิน 100 ตัวอักษร"],
    },
    levelGroupName: {
      type: String,
      trim: true,
      maxlength: [100, "ชื่อกลุ่มระดับต้องไม่เกิน 100 ตัวอักษร"],
    },
    xpRequiredForThisLevel: { // XP สะสมที่ต้องการเพื่อ "ถึง" Level นี้
      type: Number,
      required: [true, "กรุณาระบุ XP สะสมที่ต้องการสำหรับระดับนี้"],
      min: [0, "XP สะสมที่ต้องการต้องไม่ติดลบ (Level 1 ควรเป็น 0)"],
      comment: "XP สะสมทั้งหมดที่ต้องการเพื่อ 'ถึง' Level นี้ (Level 1 ควรเป็น 0)",
    },
    xpToNextLevelFromThis: { // XP ที่ต้องการ "เพิ่ม" เพื่อไป Level ถัดไป
      type: Number,
      min: [0, "XP ที่ต้องการสำหรับระดับถัดไปต้องไม่ติดลบ"],
      comment: "(คำนวณหรือกำหนด) XP ที่ต้องใช้เพิ่มจากจุดเริ่มต้นของ Level นี้ เพื่อไป Level ถัดไป",
    },
    rewardsOnReach: {
        type: [LevelRewardSchema],
        default: []
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "คำอธิบายระดับต้องไม่เกิน 1000 ตัวอักษร"],
    },
    iconUrl: {
        type: String,
        trim: true,
        maxlength: [2048, "URL ไอคอนยาวเกินไป"],
        validate: {
            validator: function(v: string) { return !v || /^https?:\/\/|^\//.test(v) || /^data:image\/(png|jpeg|gif|webp|svg\+xml);base64,/.test(v); },
            message: "รูปแบบ URL ไอคอนไม่ถูกต้อง"
        }
    },
    themeColor: {
        type: String,
        trim: true,
        uppercase: true,
        match: [/^#(?:[0-9A-F]{3}){1,2}$/i, "กรุณากรอก Hex color code ให้ถูกต้อง (เช่น #FF0000)"],
        maxlength: [7, "Hex color code ไม่ถูกต้อง"]
    },
    isActive: { type: Boolean, default: true, index: true },
    schemaVersion: { type: Number, default: 1, min: 1 },
  },
  {
    timestamps: true,
    collection: "levels", // ชื่อ collection
    // Mongoose จะคำนวณ xpToNextLevelFromThis ให้อัตโนมัติไม่ได้โดยตรงใน schema definition
    // ควรคำนวณและจัดเก็บเมื่อสร้าง/อัปเดต Level definitions หรือคำนวณใน service layer
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================
LevelSchema.index({ levelNumber: 1 }, { unique: true, name: "LevelNumberUniqueIndex" });
LevelSchema.index({ xpRequiredForThisLevel: 1 }, { name: "XPRequiredIndex" });
LevelSchema.index({ isActive: 1, levelNumber: 1 }, { name: "ActiveLevelsSortIndex" });

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================
LevelSchema.pre<ILevel>("save", async function (next) {
  // 1. Ensure Level 1 has xpRequiredForThisLevel = 0
  if (this.levelNumber === 1 && this.xpRequiredForThisLevel !== 0) {
    console.warn(`[Level Model] Forcing xpRequiredForThisLevel to 0 for Level 1. Original value was ${this.xpRequiredForThisLevel}.`);
    this.xpRequiredForThisLevel = 0;
  }

  // 2. Automatically calculate xpToNextLevelFromThis if possible
  // This requires fetching the next level's definition.
  // It's often better to pre-calculate and store this value when defining levels,
  // or calculate it on-the-fly in the service layer when a user levels up.
  // For simplicity here, we'll assume it might be set manually or by a seed script.
  // If not set, and we can find the next level, we can try to calculate it.
  if (this.isNew || this.isModified("xpRequiredForThisLevel")) {
    const LevelModelInstance = models.Level as mongoose.Model<ILevel> || model<ILevel>("Level", LevelSchema);
    const nextLevelDoc = await LevelModelInstance.findOne({ levelNumber: this.levelNumber + 1 }).sort({levelNumber: 1}).lean<ILevel>();
    if (nextLevelDoc) {
        this.xpToNextLevelFromThis = nextLevelDoc.xpRequiredForThisLevel - this.xpRequiredForThisLevel;
    } else {
        // If this is the highest level, xpToNextLevelFromThis might be Infinity, 0, or undefined based on game design
        this.xpToNextLevelFromThis = undefined; // Or a very large number if there's a "max level" concept without further progression
    }
  }

  next();
});

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================
const LevelModel =
  (models.Level as mongoose.Model<ILevel>) ||
  model<ILevel>("Level", LevelSchema);

export default LevelModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **การจัดการ Level Definitions**:
//     - Level definitions (ข้อมูลแต่ละ Level) ควรถูกสร้างและจัดการโดย Admin ผ่าน Admin Panel.
//     - ควรมีชุดข้อมูล Level เริ่มต้น (seed data) เมื่อระบบเริ่มทำงานครั้งแรก.
//     - การออกแบบ Level progression และ XP curve เป็นส่วนสำคัญของการออกแบบเกม.
// 2.  **คำนวณ `xpToNextLevelFromThis`**:
//     - Field นี้มีความสำคัญสำหรับ `User.gamification.nextLevelXPThreshold`.
//     - ขณะนี้ `pre-save` hook พยายามคำนวณค่านี้ถ้า Level ถัดไปมีอยู่. อย่างไรก็ตาม, การคำนวณนี้อาจจะซับซ้อน
//       ถ้ามีการแก้ไข Level กลางๆ หรือถ้า Level ถูกสร้างไม่เรียงตามลำดับ.
//     - ทางเลือกที่ดีกว่าคือ:
//         1. Admin กำหนดค่า `xpToNextLevelFromThis` โดยตรงเมื่อสร้าง/แก้ไข Level definition.
//         2. มี Service/Script แยกต่างหากที่คำนวณและอัปเดต field นี้สำหรับทุก Level เมื่อมีการเปลี่ยนแปลงโครงสร้าง Level.
// 3.  **Level Rewards**:
//     - `rewardsOnReach` ใน `ILevel` สามารถใช้กำหนดรางวัลที่ผู้ใช้จะได้รับทันทีเมื่อถึง Level นั้น.
//     - `achievementIdToUnlock` ใน `ILevelReward` (ถ้า type เป็น `ACHIEVEMENT_UNLOCK`) จะเป็นตัว trigger การปลดล็อก Achievement.
//     - ถ้า Achievement นั้นมี `grantedBadgeId` ใน `rewards` ของมัน, ผู้ใช้ก็จะได้รับ Badge ด้วย (การให้ Badge จาก Level ผ่าน Achievement).
//     - `badgeIdToAward` ใน `ILevelReward` (ถ้า type เป็น `BADGE_AWARD`) สามารถใช้ให้ Badge โดยตรงจาก Level Up ได้เลย.
// 4.  **การเชื่อมโยงกับ `User.ts`**:
//     - `User.gamification.currentLevelObject` จะอ้างอิง `_id` ของ Level document ปัจจุบันของผู้ใช้.
//     - เมื่อผู้ใช้ได้ XP, Gamification Service จะตรวจสอบ `User.gamification.experiencePoints` เทียบกับ
//       `User.gamification.nextLevelXPThreshold` (ซึ่งดึงมาจาก `xpToNextLevelFromThis` ของ Level ปัจจุบัน).
//     - ถ้า XP ถึงเกณฑ์:
//         1. อัปเดต `User.gamification.level` และ `User.gamification.currentLevelObject` ไปยัง Level ใหม่.
//         2. ดึง `xpToNextLevelFromThis` จาก Level ใหม่ มาตั้งเป็น `User.gamification.nextLevelXPThreshold`.
//         3. มอบรางวัลที่กำหนดใน `rewardsOnReach` ของ Level ใหม่.
//         4. สร้าง Notification สำหรับ Level Up.
// 5.  **Total XP vs. XP for Current Level**:
//     - `Level.xpRequiredForThisLevel`: คือ XP "สะสมทั้งหมด" ที่ต้องมีเพื่อ "อยู่" ใน Level นี้.
//     - `Level.xpToNextLevelFromThis`: คือ XP ที่ต้อง "เก็บเพิ่ม" จากจุดเริ่มต้นของ Level ปัจจุบัน เพื่อไป Level ถัดไป.
//     - `User.gamification.experiencePoints`: คือ XP "สะสมทั้งหมด" ของผู้ใช้.
//     - `User.gamification.nextLevelXPThreshold`: ควรจะหมายถึงจำนวน XP ที่ "ต้องการเพิ่มอีก" เพื่อไป Level ถัดไป ไม่ใช่ XP สะสมทั้งหมดที่ Level ถัดไปต้องการ.
//       ดังนั้น `User.gamification.nextLevelXPThreshold` ควรจะดึงค่ามาจาก `xpToNextLevelFromThis` ของ Level ปัจจุบันของผู้ใช้.
//       หรืออีกทางเลือกหนึ่งคือ `User.gamification.nextLevelXPThreshold` เก็บค่า XP สะสมที่ Level ถัดไปต้องการ (คือ `Level[current+1].xpRequiredForThisLevel`)
//       แล้ว UI แสดง progress bar เป็น (`User.XP` - `currentLevel.XPRequired`) / (`nextLevel.XPRequired` - `currentLevel.XPRequired`).
//       การออกแบบใน "Gamification_System_Implementation.txt" ชี้ไปทางที่ `nextLevelXPThreshold` ของ User คือ XP ที่ต้องการเพิ่ม.
//       ดังนั้นการใช้ `xpToNextLevelFromThis` จาก Level Model จึงเหมาะสม.
// 6.  **Extensibility**: Model นี้สามารถขยายเพื่อรองรับ:
//     -   Perks หรือ Abilities ที่ปลดล็อกตาม Level.
//     -   การจำกัดการเข้าถึงเนื้อหาตาม Level.
//     -   ความแตกต่างของ XP ที่ได้รับจากกิจกรรมต่างๆ ตาม Level ของผู้ใช้.
// 7.  **Consistency**: ต้องมั่นใจว่าข้อมูล Level ใน `Level.ts` สอดคล้องกับ logic การคำนวณ Level Up ใน Service Layer.
//     การเปลี่ยนแปลง Level definitions (เช่น เพิ่ม/ลด XP required) อาจจะต้องมีการ re-calculate Level ของผู้ใช้ทั้งหมด (ซึ่งเป็นงานใหญ่).
// ==================================================================================================