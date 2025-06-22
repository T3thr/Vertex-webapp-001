// src/backend/models/UserGamification.ts
//description Mongoose model for storing user-specific gamification and wallet data.
//Model separated from the monolithic User model.

import mongoose, { Schema, Document, Types, model, models } from "mongoose"; // << แก้ไข: import 'model' และ 'models'
import { ILevel } from "./Level";
import { IAchievement } from "./Achievement";
import { IBadge } from "./Badge";

// SECTION: Embedded Document Interfaces

/**
 * @interface IUserWallet
 * @description Defines the structure for a user's virtual wallet.
 * โครงสร้างสำหรับกระเป๋าเงินเสมือนของผู้ใช้
 */
export interface IUserWallet {
  coinBalance: number; // ยอดเหรียญคงเหลือ
  lastCoinTransactionAt?: Date; // วันที่ทำธุรกรรมเหรียญล่าสุด
}

/**
 * @interface IShowcasedGamificationItem
 * @description Represents a single achievement or badge that a user chooses to showcase on their profile.
 * ข้อมูลของ Achievement หรือ Badge ที่ผู้ใช้เลือกมาแสดงบนโปรไฟล์
 */
export interface IShowcasedGamificationItem {
  earnedItemId: Types.ObjectId; // ID ของ UserEarnedItem (จาก UserAchievement.earnedItems._id หรือ UserBadge.earnedItems._id)
  itemType: "Achievement" | "Badge"; // ประเภทของไอเท็ม
}

/**
 * @interface IUserDisplayBadge
 * @description Represents a specific badge a user has chosen to display in a primary or secondary slot.
 * ข้อมูลของ Badge ที่ผู้ใช้เลือกมาแสดงในตำแหน่งหลักหรือรอง
 */
export interface IUserDisplayBadge {
  earnedBadgeId: Types.ObjectId; // อ้างอิง ID ของ Badge ที่ได้รับแล้ว (UserEarnedItem._id)
  displayContext?: string; // บริบทที่จะแสดง เช่น 'comment_signature', 'profile_header'
}

/**
 * @interface IUserGamification
 * @description Core interface for all user-related gamification data.
 * Interface หลักสำหรับข้อมูล Gamification ทั้งหมดของผู้ใช้
 */
export interface IUserGamification {
  level: number; // Level ปัจจุบันของผู้ใช้
  currentLevelObject?: Types.ObjectId | ILevel | null; // (Denormalized) Object ของ Level ปัจจุบันเพื่อการเข้าถึงที่รวดเร็ว
  experiencePoints: number; // ค่าประสบการณ์ (XP) ที่มีใน Level ปัจจุบัน
  totalExperiencePointsEverEarned: number; // ค่าประสบการณ์สะสมทั้งหมดที่เคยได้รับ
  nextLevelXPThreshold: number; // ค่า XP ที่ต้องการเพื่อไป Level ถัดไป
  achievements: Types.ObjectId[]; // รายการ ID ของ **UserAchievement** (ที่ผู้ใช้ได้รับ)
  showcasedItems?: IShowcasedGamificationItem[]; // ไอเท็มที่ผู้ใช้เลือกแสดงบนโปรไฟล์
  primaryDisplayBadge?: IUserDisplayBadge; // Badge ที่แสดงเป็นหลัก
  secondaryDisplayBadges?: IUserDisplayBadge[]; // Badge ที่แสดงเป็นรอง (จำกัด 2)
  loginStreaks: {
    currentStreakDays: number; // จำนวนวันล็อกอินต่อเนื่องปัจจุบัน
    longestStreakDays: number; // จำนวนวันล็อกอินต่อเนื่องที่ยาวนานที่สุด
    lastLoginDate?: Date; // วันที่ล็อกอินล่าสุดที่นับใน streak
  };
  dailyCheckIn: {
    lastCheckInDate?: Date; // วันที่เช็คอินล่าสุด
    currentStreakDays: number; // จำนวนวันเช็คอินต่อเนื่อง
  };
  lastActivityAt?: Date; // วันที่ทำกิจกรรมล่าสุด (เพื่อคำนวณ decay หรือสถานะ)
}

// SECTION: Main Document Interface

/**
 * @interface IUserGamificationDoc
 * @description The complete Mongoose Document interface for UserGamification.
 * It links the user's ID with their gamification and wallet data.
 * Interface สำหรับเอกสาร UserGamification ใน Mongoose
 */
export interface IUserGamificationDoc extends Document {
  userId: Types.ObjectId; // Foreign Key อ้างอิงไปยังเอกสารใน collection 'users'
  gamification: IUserGamification; // Object ที่รวบรวมข้อมูล Gamification
  wallet: IUserWallet; // Object ที่รวบรวมข้อมูลกระเป๋าเงิน
  createdAt: Date;
  updatedAt: Date;

  // Instance Methods
  addExperience(amount: number): Promise<void>;
  spendCoins(amount: number): Promise<boolean>;
}

// SECTION: Mongoose Schema Definitions

// Schemas are defined from the most nested to the least nested.

const ShowcasedGamificationItemSchema = new Schema<IShowcasedGamificationItem>(
  {
    earnedItemId: {
      type: Schema.Types.ObjectId,
      required: true,
      comment: "ID of an item within the UserAchievement 'earnedItems' array",
    },
    itemType: {
      type: String,
      enum: ["Achievement", "Badge"],
      required: true,
      comment: "ประเภทของไอเท็มที่เลือกมาแสดง",
    },
  },
  { _id: false }
);

const UserDisplayBadgeSchema = new Schema<IUserDisplayBadge>(
  {
    earnedBadgeId: {
      type: Schema.Types.ObjectId,
      required: true,
      comment: "ID of a badge item within the UserAchievement 'earnedItems' array",
    },
    displayContext: {
      type: String,
      trim: true,
      comment: "บริบทที่จะแสดง เช่น 'comment_signature'",
    },
  },
  { _id: false }
);

const UserWalletSchema = new Schema<IUserWallet>(
  {
    coinBalance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      comment: "ยอดเหรียญคงเหลือ",
    },
    lastCoinTransactionAt: {
      type: Date,
      comment: "วันที่ทำธุรกรรมเหรียญล่าสุด",
    },
  },
  { _id: false }
);

const UserGamificationObjectSchema = new Schema<IUserGamification>(
  {
    level: { type: Number, required: true, default: 1, min: 1, comment: "Level ปัจจุบัน" },
    currentLevelObject: {
      type: Schema.Types.ObjectId,
      ref: "Level",
      comment: "(Denormalized) ObjectId ของ Level ปัจจุบัน",
    },
    experiencePoints: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      comment: "ค่าประสบการณ์ (XP) ใน Level ปัจจุบัน",
    },
    totalExperiencePointsEverEarned: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
        comment: "ค่าประสบการณ์สะสมทั้งหมดที่เคยได้รับ",
    },
    nextLevelXPThreshold: {
      type: Number,
      required: true,
      default: 100, // ค่าเริ่มต้นสำหรับ Level 1 -> 2
      comment: "ค่า XP ที่ต้องการเพื่อไป Level ถัดไป",
    },
    achievements: [{
      type: Schema.Types.ObjectId,
      comment: "Array of _id's from UserAchievement.earnedItems (where itemType is 'Achievement')",
    }],
    showcasedItems: {
      type: [ShowcasedGamificationItemSchema],
      default: [],
       validate: [
        (val: IShowcasedGamificationItem[]) => val.length <= 5,
        "สามารถแสดงไอเท็มได้สูงสุด 5 ชิ้น",
      ],
    },
    primaryDisplayBadge: { type: UserDisplayBadgeSchema },
    secondaryDisplayBadges: {
        type: [UserDisplayBadgeSchema],
        default: [],
        validate: [
            (val: IUserDisplayBadge[]) => val.length <= 2,
            "สามารถแสดง Badge รองได้สูงสุด 2 อัน",
        ],
    },
    loginStreaks: {
      currentStreakDays: { type: Number, default: 0, min: 0 },
      longestStreakDays: { type: Number, default: 0, min: 0 },
      lastLoginDate: { type: Date },
    },
    dailyCheckIn: {
      lastCheckInDate: { type: Date },
      currentStreakDays: { type: Number, default: 0, min: 0 },
    },
    lastActivityAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/**
 * @schema UserGamificationSchema
 * @description Schema หลักสำหรับโมเดล UserGamification
 * This collection isolates the high-frequency read/write operations of gamification
 * and wallet systems, preventing performance bottlenecks on other user-related collections.
 */
const UserGamificationSchema = new Schema<IUserGamificationDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // ผู้ใช้หนึ่งคนมีเอกสาร Gamification ได้แค่หนึ่งอัน
      comment: "Foreign Key อ้างอิงไปยัง collection 'users'",
    },
    gamification: {
      type: UserGamificationObjectSchema,
      required: true,
      default: () => ({}), // สร้าง object ว่างเพื่อให้ default ของ sub-schema ทำงาน
    },
    wallet: {
      type: UserWalletSchema,
      required: true,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    collection: "user_gamification",
  }
);

// SECTION: Indexes (ดัชนี)
// Indexes are crucial for performance, especially in a high-traffic system.

// 1. Primary index on userId for fast lookups. This is the most common query pattern.
UserGamificationSchema.index({ userId: 1 }, { unique: true, name: "UserGamification_UserID_Primary" });

// 2. Index on gamification level and experience points for building leaderboards efficiently.
UserGamificationSchema.index(
  { "gamification.level": -1, "gamification.experiencePoints": -1 },
  { name: "UserGamification_Leaderboard_Index" }
);

// 3. Index on coin balance might be useful for administrative queries (e.g., finding top coin holders).
UserGamificationSchema.index({ "wallet.coinBalance": -1 }, { name: "UserGamification_CoinBalance_Admin_Index", sparse: true });


// SECTION: Middleware (มิดเดิลแวร์)

UserGamificationSchema.pre("save", function (next) {
  // `this` is the document being saved.
  // Prioritization Logic: ตรวจสอบก่อนบันทึก
  if (this.isModified("gamification.secondaryDisplayBadges") && this.gamification.secondaryDisplayBadges && this.gamification.secondaryDisplayBadges.length > 2) {
      const error = new Error("สามารถแสดง Badge รองได้สูงสุด 2 อันเท่านั้น");
      return next(error);
  }
   if (this.isModified("gamification.showcasedItems") && this.gamification.showcasedItems && this.gamification.showcasedItems.length > 5) {
      const error = new Error("สามารถแสดงไอเท็มได้สูงสุด 5 ชิ้นเท่านั้น");
      return next(error);
  }
  next();
});


// SECTION: Virtuals (ฟิลด์เสมือน)
// Virtuals are document properties that you can get and set but that do not get persisted to MongoDB.

/**
 * @virtual levelProgressPercentage
 * @description Calculates the user's progress towards the next level as a percentage.
 * คำนวณความคืบหน้าไปยังเลเวลถัดไปเป็นเปอร์เซ็นต์
 */
UserGamificationSchema.virtual("gamification.levelProgressPercentage").get(function (this: IUserGamificationDoc) {
    // Type guard to ensure currentLevelObject is populated and is an ILevel object, not just an ObjectId
    const isLevelPopulated = (level: any): level is ILevel => {
        return level && typeof level === 'object' && 'xpRequiredForThisLevel' in level;
    };

    if (!isLevelPopulated(this.gamification.currentLevelObject)) {
        // Fallback for when level data isn't populated or structured as expected.
        // This might happen if a query doesn't use .populate()
        const xpInCurrentLevel = this.gamification.experiencePoints;
        const xpForNextLevel = this.gamification.nextLevelXPThreshold;
        if (xpForNextLevel <= 0) return 0;
        return Math.max(0, Math.min(100, (xpInCurrentLevel / xpForNextLevel) * 100));
    }

    const levelInfo = this.gamification.currentLevelObject; // Now safely typed as ILevel
    const xpEarnedAfterReachingThisLevel = this.gamification.totalExperiencePointsEverEarned - levelInfo.xpRequiredForThisLevel;
    const xpNeededForNextLevel = levelInfo.xpToNextLevelFromThis;

    if (!xpNeededForNextLevel || xpNeededForNextLevel <= 0) {
        return 100; // ถือว่าเต็มถ้าไม่มีข้อมูล level ถัดไป หรือผู้ใช้อยู่ใน level สูงสุด
    }

    const progress = (xpEarnedAfterReachingThisLevel / xpNeededForNextLevel) * 100;
    return Math.max(0, Math.min(100, progress));
});


// SECTION: Instance Methods (เมธอดสำหรับแต่ละ Instance)
// Methods to encapsulate business logic related to gamification.

/**
 * @method addExperience
 * @description Adds experience points and handles level-up logic.
 * (Placeholder for a more complex gamification service call)
 * @param amount The amount of XP to add.
 */
UserGamificationSchema.methods.addExperience = async function(this: IUserGamificationDoc, amount: number): Promise<void> {
    if (amount <= 0) return;
    this.gamification.experiencePoints += amount;
    this.gamification.totalExperiencePointsEverEarned += amount;
    console.log(`User ${this.userId} gained ${amount} XP. New XP: ${this.gamification.experiencePoints}`);
    // In a real application, this method would trigger a check for level-up.
    // e.g., if (this.gamification.experiencePoints >= this.gamification.nextLevelXPThreshold) {
    //          await GamificationService.levelUp(this.userId);
    //       }
    await this.save();
};

/**
 * @method spendCoins
 * @description Deducts coins from the user's wallet if they have enough balance.
 * @param amount The amount of coins to spend.
 * @returns {Promise<boolean>} True if the transaction was successful, false otherwise.
 */
UserGamificationSchema.methods.spendCoins = async function(this: IUserGamificationDoc, amount: number): Promise<boolean> {
    if (amount <= 0) return false;
    if (this.wallet.coinBalance < amount) {
        console.warn(`User ${this.userId} has insufficient funds for transaction.`);
        return false;
    }
    this.wallet.coinBalance -= amount;
    this.wallet.lastCoinTransactionAt = new Date();
    await this.save();
    return true;
};

// SECTION: Model Export
const UserGamificationModel = 
  (models.UserGamification as mongoose.Model<IUserGamificationDoc>) || 
  model<IUserGamificationDoc>("UserGamification", UserGamificationSchema);

export default UserGamificationModel;

// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// 1.  **Bounded Context:** การแยก UserGamification ออกมาเป็น Collection ของตัวเองเป็นตัวอย่างที่ดีของหลัก Bounded Context
//     ใน Domain-Driven Design (DDD) ทำให้ Gamification Service สามารถทำงานและพัฒนาได้อย่างอิสระ
//     โดยมีการขึ้นต่อกันกับส่วนอื่นน้อยที่สุด (Low Coupling)
//
// 2.  **Performance:** ระบบ Gamification และ Wallet มีการเขียนข้อมูลบ่อยมาก (High-Write) การแยก Collection
//     ช่วยป้องกันไม่ให้การเขียนเหล่านี้ไปสร้างภาระ (Contention) ให้กับ Collection ที่สำคัญอย่าง `users`
//     ซึ่งเน้นการอ่านที่รวดเร็ว (High-Read) สำหรับการ Authentication
//
// 3.  **Data Consistency & Synchronization (สำคัญ)**:
//     -   โมเดลนี้ทำหน้าที่เป็น **ภาพสะท้อน (State Reflection)** หรือแคชสำหรับข้อมูล Gamification
//     -   ข้อมูลในโมเดลนี้ (เช่น `totalExperiencePointsEverEarned`, `achievements`) จะถูก **อัปเดตโดยอัตโนมัติ**
//       ผ่าน post-save hook จาก `UserAchievement.ts` ซึ่งเป็นแหล่งข้อมูลจริง (Source of Truth)
//     -   `currentLevelObject` และ `nextLevelXPThreshold` เป็นข้อมูลที่ Denormalized
//       เพื่อเพิ่มความเร็วในการคำนวณของฝั่ง Client/Backend โดยไม่ต้อง $lookup ไปยัง `levels` collection ทุกครั้ง
//       ต้องมีกลไก (เช่น background job, event listener) ในการอัปเดตข้อมูลเหล่านี้เมื่อผู้ใช้ Level Up
//
// 4.  **Service Layer:** Logic ที่ซับซ้อน เช่น การคำนวณ Level Up, การแจกรางวัล, การตรวจสอบเงื่อนไข Achievement
//     ไม่ควรอยู่ใน Model Methods โดยตรง แต่ควรมอบหมายให้เป็นหน้าที่ของ "GamificationService" ที่ส่วนกลาง
//     เพื่อให้จัดการ Transaction และ Side Effects (เช่น การสร้าง Notification) ได้อย่างถูกต้อง
//
// 5.  **Scalability:** เมื่อระบบเติบโตขึ้น อาจพิจารณาการใช้ Cache (เช่น Redis) สำหรับข้อมูลที่อ่านบ่อย
//     อย่าง Level, XP, และ Coin Balance เพื่อลดภาระของ Database
//
// 6.  **Subdocument References**: ฟิลด์ `achievements`, `showcasedItems.earnedItemId`, และ `*.earnedBadgeId`
//     ตอนนี้เก็บ `ObjectId` ของ subdocument จาก `UserAchievement.earnedItems` โดยตรง **ไม่มีการใช้ `ref`**
//     เพราะ Mongoose ไม่รองรับการ populate subdocument โดยตรง Service Layer ที่ต้องการข้อมูลเต็ม
//     จะต้อง query `UserAchievement` document ของ user คนนั้นๆ แล้วค้นหา item จากใน array `earnedItems` ด้วย `_id` ที่เก็บไว้.
// ==================================================================================================