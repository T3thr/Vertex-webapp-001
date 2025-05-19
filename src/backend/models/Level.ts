// src/backend/models/Level.ts
// โมเดลระดับผู้ใช้ (Level Model)
// กำหนดโครงสร้างของระดับผู้ใช้ในระบบ Gamification รวมถึง XP ที่ต้องการ และรางวัลที่อาจได้รับ

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IAchievement } from "./Achievement"; // สำหรับ achievementOnReachId

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Level
// ==================================================================================================

/**
 * @interface ILevelReward
 * @description (Optional) โครงสร้างรางวัลเพิ่มเติมที่อาจจะให้เมื่อถึง Level นี้โดยตรง
 * นอกเหนือจาก Achievement ที่อาจจะปลดล็อก
 * @property {string} rewardType - ประเภทรางวัล (เช่น "COINS", "PROFILE_FRAME_UNLOCK", "FEATURE_ACCESS")
 * @property {any} value - ค่าของรางวัล (เช่น จำนวน Coins, ชื่อ Frame, key ของ Feature)
 * @property {string} [description] - คำอธิบายรางวัล
 */
export interface ILevelReward {
  rewardType: string; // อาจจะใช้ Enum ร่วมกับ AchievementRewardType หรือสร้างใหม่
  value: any;
  description?: string;
}
const LevelRewardSchema = new Schema<ILevelReward>(
  {
    rewardType: { type: String, required: true, trim: true },
    value: { type: Schema.Types.Mixed, required: true },
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
 * @description อินเทอร์เฟซหลักสำหรับเอกสาร "ต้นแบบ" ของแต่ละ Level ใน Collection "levels"
 * @property {number} levelNumber - หมายเลข Level (เช่น 1, 2, 3, ..., **จำเป็น, unique**)
 * @property {number} xpRequiredForThisLevel - จำนวน XP สะสมที่ต้องมีเพื่อ "ถึง" Level นี้ (เช่น Level 1 = 0 XP, Level 2 = 100 XP, Level 3 = 300 XP)
 * ดังนั้น xpRequiredForNextLevel ของ Level ก่อนหน้า คือค่านี้
 * @property {number} xpRequiredForNextLevel - จำนวน XP สะสมทั้งหมดที่ต้องมีเพื่อ "ขึ้นไป" Level ถัดไปจาก Level ปัจจุบันนี้
 * (เช่น ถ้าปัจจุบันอยู่ Level 2 (XP=100), xpRequiredForNextLevel คือ 300 เพื่อไป Level 3)
 * สำหรับ Level สูงสุด อาจจะเป็น null หรือค่าที่สูงมาก
 * @property {string} levelTitle - ชื่อเรียกของ Level (เช่น "ผู้เริ่มต้น", "นักสำรวจ", "ปรมาจารย์", **จำเป็น**)
 * @property {string} [levelGroupName] - (Optional) ชื่อกลุ่มของ Level (เช่น "ช่วงมือใหม่" สำหรับ Level 1-10, "ระดับกลาง" สำหรับ 11-20)
 * @property {Types.ObjectId | IAchievement} [achievementOnReachId] - (Optional) ID ของ Achievement ที่จะปลดล็อกอัตโนมัติเมื่อผู้ใช้ถึง Level นี้
 * @property {Types.DocumentArray<ILevelReward>} [directRewardsOnReach] - (Optional) รางวัลเพิ่มเติมที่ผู้ใช้จะได้รับโดยตรงเมื่อถึง Level นี้
 * @property {string} [description] - (Optional) คำอธิบายเกี่ยวกับ Level นี้
 * @property {string} [iconUrl] - (Optional) URL ไอคอนสำหรับ Level นี้
 * @property {boolean} isActive - Level นี้ยังใช้งานในระบบหรือไม่ (default: true)
 * @property {Date} createdAt - วันที่สร้างเอกสาร (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตเอกสารล่าสุด (Mongoose `timestamps`)
 */
export interface ILevel extends Document {
  _id: Types.ObjectId;
  levelNumber: number;
  xpRequiredForThisLevel: number; // XP สะสมที่ต้องมีเพื่อ "เป็น" Level นี้
  xpRequiredForNextLevel: number; // XP สะสมที่ต้องมีเพื่อ "ผ่าน" Level นี้ไป Level ถัดไป
  levelTitle: string;
  levelGroupName?: string;
  achievementOnReachId?: Types.ObjectId | IAchievement;
  directRewardsOnReach?: Types.DocumentArray<ILevelReward>;
  description?: string;
  iconUrl?: string;
  isActive: boolean;
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
      required: [true, "กรุณาระบุหมายเลข Level (Level number is required)"],
      unique: true,
      min: [0, "Level ต้องไม่ต่ำกว่า 0 (Level 0 อาจเป็น baseline)"], // Level 0 อาจเป็น baseline ก่อนได้ XP แรก
      index: true,
      comment: "หมายเลข Level ที่ไม่ซ้ำกัน เริ่มจาก 0 หรือ 1",
    },
    xpRequiredForThisLevel: {
      type: Number,
      required: [true, "กรุณาระบุ XP สะสมที่ต้องการเพื่อถึง Level นี้ (XP required for this level is required)"],
      min: [0, "XP ที่ต้องการต้องไม่ติดลบ"],
      validate: { // ตรวจสอบว่า xpRequiredForThisLevel ของ Level ปัจจุบันต้องไม่น้อยกว่า Level ก่อนหน้า (ถ้ามี)
          validator: async function(this: ILevel, value: number): Promise<boolean> {
              if (this.levelNumber > 0) { // Level 0 ไม่ต้องเช็ค
                const LevelModel = models.Level as mongoose.Model<ILevel>;
                const previousLevel = await LevelModel.findOne({ levelNumber: this.levelNumber - 1 });
                if (previousLevel && value < previousLevel.xpRequiredForNextLevel) {
                    return false;
                }
              }
              return true;
          },
          message: (props: any) => `XP ที่ต้องการสำหรับ Level ${props.levelNumber} (${props.value}) ต้องไม่น้อยกว่า xpRequiredForNextLevel ของ Level ก่อนหน้า`
      },
      comment: "จำนวน XP สะสมที่ต้องมีเพื่อ 'เป็น' Level นี้ (เช่น Level 1 = 0 XP, Level 2 = 100 XP)",
    },
    xpRequiredForNextLevel: {
      type: Number,
      required: [true, "กรุณาระบุ XP สะสมที่ต้องมีเพื่อไป Level ถัดไป (XP required for next level is required)"],
      min: [0, "XP ที่ต้องการสำหรับ Level ถัดไปต้องไม่ติดลบ"],
      validate: [{ // ตรวจสอบว่าค่านี้ต้องมากกว่า xpRequiredForThisLevel
          validator: function(this: ILevel, value: number): boolean {
              return value > this.xpRequiredForThisLevel;
          },
          message: (props: any) => `XP ที่ต้องการสำหรับ Level ถัดไป (${props.value}) ต้องมากกว่า XP ที่ต้องการสำหรับ Level ปัจจุบัน (${props.xpRequiredForThisLevel})`
      }],
      comment: "จำนวน XP สะสมทั้งหมดที่ต้องมีเพื่อ 'ผ่าน' Level นี้ไปยัง Level ถัดไป (เช่น ถ้าอยู่ Level 2 (XP=100), ค่านี้คือ 300 เพื่อไป Level 3)",
    },
    levelTitle: {
      type: String,
      required: [true, "กรุณาระบุชื่อ Level (Level title is required)"],
      trim: true,
      maxlength: [100, "ชื่อ Level ต้องไม่เกิน 100 ตัวอักษร"],
      comment: "ชื่อเรียกของ Level เช่น 'มือใหม่หัดอ่าน', 'นักสำรวจแกร่งกล้า'",
    },
    levelGroupName: {
      type: String,
      trim: true,
      maxlength: [100, "ชื่อกลุ่ม Level ต้องไม่เกิน 100 ตัวอักษร"],
      comment: "(Optional) ชื่อกลุ่มของ Level เช่น 'ช่วงเริ่มต้น', 'ระดับกลาง'",
    },
    achievementOnReachId: {
      type: Schema.Types.ObjectId,
      ref: "Achievement", // อ้างอิง Achievement.ts
      comment: "(Optional) ID ของ Achievement ที่จะปลดล็อกเมื่อถึง Level นี้",
    },
    directRewardsOnReach: {
        type: [LevelRewardSchema],
        default: [],
        comment: "(Optional) รางวัลเพิ่มเติมที่ได้รับโดยตรงเมื่อถึง Level นี้"
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "คำอธิบาย Level ต้องไม่เกิน 500 ตัวอักษร"],
      comment: "(Optional) คำอธิบายเกี่ยวกับ Level นี้",
    },
    iconUrl: {
      type: String,
      trim: true,
      maxlength: [2048, "URL ไอคอนต้องไม่เกิน 2048 ตัวอักษร"],
      validate: {
        validator: function(v: string) { return !v || /^https?:\/\/|^\//.test(v); },
        message: (props: any) => `${props.value} ไม่ใช่ URL ที่ถูกต้องสำหรับไอคอน!`
      },
      comment: "(Optional) URL ไอคอนสำหรับ Level นี้",
    },
    isActive: { type: Boolean, default: true, index: true, comment: "Level นี้ยังใช้งานในระบบหรือไม่" },
  },
  {
    timestamps: true,
    collection: "levels", // ชื่อ collection ที่เหมาะสม
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

LevelSchema.index({ levelNumber: 1 }, { unique: true, name: "LevelNumberUniqueIndex" });
LevelSchema.index({ isActive: 1, levelNumber: 1 }, { name: "ActiveLevelsSortIndex" });
LevelSchema.index({ levelTitle: 1 }, { name: "LevelTitleIndex", collation: { locale: 'th', strength: 2 } }); // collation for Thai case-insensitive search if needed

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

// อาจจะมี middleware เพื่อตรวจสอบความสอดคล้องของ xpRequiredForThisLevel และ xpRequiredForNextLevel
// กับ Level ก่อนหน้าและ Level ถัดไป (ถ้ามีการสร้าง Level ไม่เรียงตามลำดับ)
// แต่การ validate ใน schema น่าจะเพียงพอสำหรับกรณีทั่วไป

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

// ตรวจสอบว่า Model "Level" ถูกสร้างไปแล้วหรือยัง ถ้ายัง ให้สร้าง Model ใหม่
const LevelModel =
  (models.Level as mongoose.Model<ILevel>) ||
  model<ILevel>("Level", LevelSchema);

export default LevelModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **XP Curve Management**:
//     - `xpRequiredForThisLevel` และ `xpRequiredForNextLevel` เป็นหัวใจสำคัญในการกำหนด "ความเร็ว" ในการ Level Up.
//     - การออกแบบค่า XP เหล่านี้ควรคำนึงถึง engagement ของผู้ใช้ และความรู้สึกถึงความก้าวหน้า.
//     - อาจจะมีเครื่องมือหรือสูตรคำนวณสำหรับ Admin ในการสร้าง Level และ XP curve ที่เหมาะสม.
// 2.  **Relationship with User Model**:
//     - `User.gamification.level` (Number) จะเก็บหมายเลข Level ปัจจุบันของผู้ใช้.
//     - `User.gamification.experiencePoints` (Number) เก็บ XP สะสมปัจจุบัน.
//     - `User.gamification.nextLevelXPThreshold` (Number) จะถูกดึงมาจาก `xpRequiredForNextLevel` ของ `Level` ปัจจุบันของผู้ใช้.
//     - `User.gamification.currentLevelObject` (ObjectId, ref: 'Level') จะอ้างอิงไปยัง Level document ปัจจุบันของผู้ใช้ใน Collection "levels".
// 3.  **Level Up Logic (Service Layer)**:
//     - เมื่อผู้ใช้ได้รับ XP (จาก Achievement, Badge, หรือกิจกรรมอื่นๆ), Service Layer จะต้อง:
//       1. อัปเดต `User.gamification.experiencePoints`.
//       2. ตรวจสอบว่า `experiencePoints` ถึง `nextLevelXPThreshold` หรือยัง.
//       3. ถ้าถึงแล้ว:
//          a. อัปเดต `User.gamification.level` เป็น Level ถัดไป.
//          b. ค้นหา Level document ใหม่จาก `LevelModel` โดยใช้ `levelNumber` ใหม่.
//          c. อัปเดต `User.gamification.currentLevelObject` เป็น `_id` ของ Level document ใหม่.
//          d. อัปเดต `User.gamification.nextLevelXPThreshold` จาก `xpRequiredForNextLevel` ของ Level document ใหม่.
//          e. มอบรางวัล (ถ้ามี `achievementOnReachId` หรือ `directRewardsOnReach` ใน Level document ใหม่).
//          f. สร้าง Notification สำหรับ Level Up.
// 4.  **Rewards on Level Up**:
//     - `achievementOnReachId`: เมื่อผู้ใช้ถึง Level นี้, Achievement ที่ระบุจะถูกปลดล็อก. Gamification Service จะต้อง trigger การปลดล็อก Achievement นี้,
//       ซึ่งอาจจะนำไปสู่การได้รับ Badge อีกทอดหนึ่งถ้า Achievement นั้นมีการ grant Badge.
//     - `directRewardsOnReach`: สามารถให้รางวัลเล็กๆ น้อยๆ เช่น Coins, Profile Frame ชิ้นเล็กๆ หรือส่วนลดเล็กน้อยได้โดยตรงเมื่อถึง Level.
// 5.  **Admin Interface**: ควรมี Admin UI ที่ดีสำหรับการสร้าง, แก้ไข, และจัดการ Levels ทั้งหมดในระบบ.
//     รวมถึงการ rebalance XP curve หรือปรับรางวัล.
// 6.  **Max Level**: ควรมีการกำหนด Level สูงสุดในระบบ และ `xpRequiredForNextLevel` ของ Level สูงสุดอาจจะเป็นค่าที่สูงมาก, null, หรือ Infinity
//     เพื่อบ่งบอกว่าไม่มี Level ถัดไป.
// 7.  **`xpRequiredForThisLevel` vs `xpBetweenLevels`**:
//     - โมเดลนี้ใช้ `xpRequiredForThisLevel` (XP สะสมที่ต้องมีเพื่อ "เป็น" Level นั้น) และ `xpRequiredForNextLevel` (XP สะสมที่ต้องมีเพื่อ "ผ่าน" Level นั้น).
//     - การแสดงผล "XP ที่ต้องใช้เพื่อขึ้น Level ถัดไป" บน UI ของผู้ใช้ จะคำนวณจาก `(nextLevelXPThreshold - currentExperiencePoints)`.
//     - ตัวอย่าง:
//       - Level 1: `xpRequiredForThisLevel`=0, `xpRequiredForNextLevel`=100
//       - Level 2: `xpRequiredForThisLevel`=100, `xpRequiredForNextLevel`=300 (ต้องใช้ 200 XP จาก Level 1 ไป 2)
//       - Level 3: `xpRequiredForThisLevel`=300, `xpRequiredForNextLevel`=600 (ต้องใช้ 300 XP จาก Level 2 ไป 3)
//     - วิธีนี้ช่วยให้การ query Level ปัจจุบันของผู้ใช้จาก XP สะสมทำได้ง่าย (หา Level ที่ `xpRequiredForThisLevel <= userXP < xpRequiredForNextLevel`).
// 8.  **Seeding Initial Levels**: ควรมี script สำหรับ seed ข้อมูล Level เริ่มต้น (เช่น Level 1-50) เมื่อเริ่มใช้งานระบบ.
// ==================================================================================================