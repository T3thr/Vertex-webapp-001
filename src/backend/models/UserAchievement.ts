// src/backend/models/UserAchievement.ts
// โมเดลความสำเร็จและเหรียญตราของผู้ใช้ (UserAchievement Model)
// บันทึกความสำเร็จและเหรียญตราที่ผู้ใช้แต่ละคนได้รับ รวมถึงความคืบหน้าและรางวัลที่เกี่ยวข้อง
// ทำงานร่วมกับ Achievement.ts, Badge.ts, Level.ts และ User.ts เพื่อสร้างระบบ Gamification ที่สมบูรณ์
// อัปเดตล่าสุด: ปรับปรุงโครงสร้าง IUserEarnedItem, rewardsGranted และการเชื่อมโยงกับ User model
// แก้ไข: ลบ IUserAchievementModel ที่ว่างเปล่าตามข้อผิดพลาด @typescript-eslint/no-empty-object-type

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IUser } from "./User";
import { IAchievement, IAchievementReward } from "./Achievement"; // Import IAchievementReward
import { IBadge, IBadgeReward } from "./Badge"; // Import IBadgeReward
import UserGamificationModel from "./UserGamification";

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล UserAchievement
// ==================================================================================================

/**
 * @enum {string} EarnedItemType
 * @description ประเภทของสิ่งที่ผู้ใช้ได้รับ (Achievement หรือ Badge)
 * - `ACHIEVEMENT`: ความสำเร็จที่กำหนดไว้ใน Achievement.ts
 * - `BADGE`: เหรียญตราที่กำหนดไว้ใน Badge.ts
 * - `TITLE`: (อนาคต) ฉายาที่ผู้ใช้สามารถเลือกแสดงได้
 */
export enum EarnedItemType {
  ACHIEVEMENT = "achievement",
  BADGE = "badge",
  TITLE = "title", // Placeholder for future use
}

/**
 * @interface IUserEarnedItemProgress
 * @description ข้อมูลความคืบหน้าสำหรับรายการ (Achievement/Badge) ที่ผู้ใช้กำลังพยายามปลดล็อก
 * ใช้กับ `ongoingProgress` Map ใน `IUserAchievement`.
 * @property {string} itemKey - Key ของ Achievement (achievementCode) หรือ Badge (badgeKey) ที่กำลังติดตามความคืบหน้า.
 * @property {EarnedItemType} itemType - ประเภทของ item (ACHIEVEMENT หรือ BADGE).
 * @property {number} currentProgress - ความคืบหน้าปัจจุบัน (เช่น จำนวนครั้งที่ทำกิจกรรม, จำนวนวันที่ล็อกอินต่อเนื่อง)
 * @property {number} targetProgress - ความคืบหน้าเป้าหมายที่ต้องการเพื่อปลดล็อก (ดึงมาจาก `unlockConditions.targetValue`)
 * @property {any} [details] - ข้อมูลเพิ่มเติมเกี่ยวกับความคืบหน้า (เช่น array ของ novelId ที่อ่านไปแล้ว, last_event_timestamp)
 * @property {Date} lastProgressAt - วันที่อัปเดตความคืบหน้าล่าสุด
 */
export interface IUserEarnedItemProgress {
  itemKey: string;
  itemType: EarnedItemType;
  currentProgress: number;
  targetProgress: number;
  details?: any;
  lastProgressAt: Date;
}
const UserEarnedItemProgressSchema = new Schema<IUserEarnedItemProgress>(
  {
    itemKey: { type: String, required: true, trim: true },
    itemType: { type: String, enum: Object.values(EarnedItemType), required: true },
    currentProgress: { type: Number, required: true, min: 0 },
    targetProgress: { type: Number, required: true, min: 0 },
    details: { type: Schema.Types.Mixed },
    lastProgressAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

/**
 * @interface IEarnedItemRewardSnapshot
 * @description Snapshot ของรางวัลที่ได้รับจากการปลดล็อก Achievement หรือ Badge.
 * คล้ายกับ IAchievementReward และ IBadgeReward แต่เก็บเฉพาะข้อมูลที่จำเป็น.
 * @property {string} type - ประเภทของรางวัล (อ้างอิง AchievementRewardType)
 * @property {number} [experiencePointsAwarded] - แต้ม XP ที่ได้รับ
 * @property {number} [coinsAwarded] - จำนวน Coins ที่ได้รับ
 * @property {string} [featureUnlockKey] - Key สำหรับปลดล็อกฟีเจอร์
 * @property {string} [grantedBadgeKeySnapshot] - Key ของ Badge ที่มอบให้ (ถ้ามี)
 * @property {string} [description] - คำอธิบายรางวัล
 * @property {any} [value] - ค่าเฉพาะอื่นๆ ของรางวัล
 */
export interface IEarnedItemRewardSnapshot {
  type: string; // Should align with AchievementRewardType
  experiencePointsAwarded?: number;
  coinsAwarded?: number;
  featureUnlockKey?: string;
  grantedBadgeKeySnapshot?: string; // Snapshot of the key, not ObjectId
  description?: string;
  value?: any;
}
const EarnedItemRewardSnapshotSchema = new Schema<IEarnedItemRewardSnapshot>(
  {
    type: { type: String, required: true },
    experiencePointsAwarded: { type: Number, min: 0 },
    coinsAwarded: { type: Number, min: 0 },
    featureUnlockKey: { type: String, trim: true },
    grantedBadgeKeySnapshot: { type: String, trim: true },
    description: { type: String, trim: true },
    value: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

/**
 * @interface IUserEarnedItem
 * @description โครงสร้างของรายการ Achievement หรือ Badge ที่ผู้ใช้ได้รับแล้ว.
 * @property {Types.ObjectId | IAchievement | IBadge} itemId - ID ของ Achievement หรือ Badge ที่ได้รับ.
 * @property {EarnedItemType} itemType - ประเภทของสิ่งที่ได้รับ (ACHIEVEMENT หรือ BADGE).
 * @property {string} itemTypeRef - ชื่อ Model ที่ `itemId` อ้างอิง ("Achievement" หรือ "Badge").
 * @property {string} itemNameSnapshot - ชื่อของรายการ (Achievement/Badge) ณ เวลาที่ได้รับ.
 * @property {string} [itemDescriptionSnapshot] - คำอธิบายของรายการ ณ เวลาที่ได้รับ.
 * @property {string} [itemIconUrlSnapshot] - URL ไอคอนของรายการ ณ เวลาที่ได้รับ.
 * @property {string} itemRaritySnapshot - (ใหม่) ระดับความหายากของไอเทม ณ เวลาที่ได้รับ.
 * @property {Date} unlockedAt - วันที่และเวลาที่ปลดล็อก/ได้รับ.
 * @property {number} timesEarned - จำนวนครั้งที่ได้รับ (สำหรับ isRepeatable=true).
 * @property {IEarnedItemRewardSnapshot[]} [rewardsGrantedSnapshot] - (ปรับปรุง) Snapshot ของรางวัลที่ผู้ใช้ได้รับ.
 * @property {boolean} isPubliclyVisible - ผู้ใช้ต้องการให้แสดงบนโปรไฟล์สาธารณะหรือไม่.
 * @property {Date} [claimedAt] - วันที่ผู้ใช้กดรับรางวัล (ถ้ามีระบบ claim).
 * @property {any} [unlockContext] - ข้อมูลบริบทเพิ่มเติม ณ เวลาที่ปลดล็อก.
 */
export interface IUserEarnedItem extends Document {
  itemId: Types.ObjectId | IAchievement | IBadge;
  itemType: EarnedItemType;
  itemTypeRef: "Achievement" | "Badge" | "Title"; // ทำให้เข้มงวดขึ้น
  itemNameSnapshot: string;
  itemDescriptionSnapshot?: string;
  itemIconUrlSnapshot?: string;
  itemRaritySnapshot: string; // Rarity ณ ตอนที่ได้รับ
  unlockedAt: Date;
  timesEarned: number;
  rewardsGrantedSnapshot?: IEarnedItemRewardSnapshot[]; // ใช้ Snapshot schema
  isPubliclyVisible: boolean;
  claimedAt?: Date;
  unlockContext?: any;
}
const UserEarnedItemSchema = new Schema<IUserEarnedItem>(
  {
    itemId: {
      type: Schema.Types.ObjectId,
      required: [true, "กรุณาระบุ ID ของรายการ (Item ID is required)"],
      refPath: "itemTypeRef",
    },
    itemType: {
      type: String,
      enum: Object.values(EarnedItemType),
      required: [true, "กรุณาระบุประเภทของรายการ (Item type is required)"],
    },
    itemTypeRef: {
      type: String,
      required: [true, "itemTypeRef is required and must be 'Achievement', 'Badge', or 'Title'"],
      enum: ["Achievement", "Badge", "Title"],
    },
    itemNameSnapshot: {
      type: String,
      required: [true, "กรุณาระบุชื่อรายการ (Item name snapshot is required)"],
      trim: true,
      maxlength: [255, "ชื่อรายการยาวเกินไป (สูงสุด 255 ตัวอักษร)"]
    },
    itemDescriptionSnapshot: {
      type: String,
      trim: true,
      maxlength: [2000, "คำอธิบายรายการยาวเกินไป (สูงสุด 2000 ตัวอักษร)"]
    },
    itemIconUrlSnapshot: {
      type: String,
      trim: true,
      maxlength: [2048, "URL ไอคอนยาวเกินไป (สูงสุด 2048 ตัวอักษร)"]
    },
    itemRaritySnapshot: { // ใหม่
      type: String,
      required: [true, "กรุณาระบุ Rarity ของไอเทม ณ ตอนที่ได้รับ"],
      trim: true,
      maxlength: 50,
    },
    unlockedAt: {
      type: Date,
      default: Date.now,
      required: [true, "กรุณาระบุวันที่ปลดล็อก (Unlock date is required)"],
      index: true
    },
    timesEarned: { type: Number, default: 1, min: 1 },
    rewardsGrantedSnapshot: { type: [EarnedItemRewardSnapshotSchema], default: [] }, // ใช้ Snapshot schema
    isPubliclyVisible: { type: Boolean, default: true },
    claimedAt: { type: Date },
    unlockContext: { type: Schema.Types.Mixed },
  },
  {
    _id: true, // Subdocuments will have their own _id
  }
);

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร UserAchievement (IUserAchievement Document Interface)
// ==================================================================================================

/**
 * @interface IUserAchievement
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารความสำเร็จของผู้ใช้ใน Collection "userachievements".
 * @property {Types.ObjectId | IUser} user - ID ของผู้ใช้.
 * @property {Types.DocumentArray<IUserEarnedItem>} earnedItems - รายการ Achievement/Badge ที่ผู้ใช้ปลดล็อก.
 * @property {Map<string, IUserEarnedItemProgress>} ongoingProgress - ความคืบหน้าของ Achievement/Badge ที่ยังไม่ปลดล็อก.
 * Key คือ `achievementCode` หรือ `badgeKey`.
 * @property {string} [featuredTitleKey] - (อนาคต) Key ของ Title ที่ผู้ใช้เลือกแสดง.
 */
export interface IUserAchievement extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId | IUser;
  earnedItems: Types.DocumentArray<IUserEarnedItem>;
  ongoingProgress: Map<string, IUserEarnedItemProgress>; // Key: achievementCode หรือ badgeKey
  featuredTitleKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ UserAchievement (UserAchievementSchema)
// ==================================================================================================
const UserAchievementSchema = new Schema<IUserAchievement>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุ ID ของผู้ใช้ (User ID is required)"],
      unique: true,
      index: true,
    },
    earnedItems: [UserEarnedItemSchema],
    ongoingProgress: {
      type: Map,
      of: UserEarnedItemProgressSchema, // Value เป็น UserEarnedItemProgressSchema
      default: () => new Map(),
      comment: "Key คือ achievementCode หรือ badgeKey, Value คือ IUserEarnedItemProgress"
    },
    featuredTitleKey: { type: String, trim: true, maxlength: 100 },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    collection: "user_achievements" // เปลี่ยนชื่อ collection ให้สื่อความหมายมากขึ้น
  }
);

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

UserEarnedItemSchema.pre<IUserEarnedItem>("save", function (next) {
  if (this.isModified("itemType") || this.isNew) {
    switch (this.itemType) {
      case EarnedItemType.ACHIEVEMENT:
        this.itemTypeRef = "Achievement";
        break;
      case EarnedItemType.BADGE:
        this.itemTypeRef = "Badge";
        break;
      case EarnedItemType.TITLE:
        this.itemTypeRef = "Title"; // Ensure 'Title' is a valid model name if used
        break;
      default:
        // If itemType is somehow invalid, prevent saving or throw error
        const err = new Error(`Invalid itemType: '${this.itemType}' for itemTypeRef generation.`);
        return next(err);
    }
  }
  next();
});

UserAchievementSchema.post<IUserAchievement>("save", async function (doc, next) {
  // ตรวจสอบว่ามีการแก้ไข field ที่ควร trigger การอัปเดตหรือไม่
  // เราสนใจเฉพาะเมื่อมีการเปลี่ยนแปลงรายการที่ได้รับ (earnedItems) เพราะเป็นแหล่งข้อมูลหลัก
  if (doc.isModified("earnedItems")) {
    try {
      // 1. คำนวณค่าประสบการณ์ทั้งหมดจากทุกรายการที่ผู้ใช้ได้รับ
      const totalXPFromItems = doc.earnedItems.reduce((acc, item) => {
        if (item.rewardsGrantedSnapshot && item.rewardsGrantedSnapshot.length > 0) {
          const itemXP = item.rewardsGrantedSnapshot.reduce((rewardAcc, reward) => {
            return rewardAcc + (reward.experiencePointsAwarded || 0);
          }, 0);
          return acc + itemXP;
        }
        return acc;
      }, 0);

      // 2. รวบรวม ID ของรายการที่เป็น 'ACHIEVEMENT' เท่านั้น
      const achievementItemIds = doc.earnedItems
        .filter(item => item.itemType === EarnedItemType.ACHIEVEMENT && item._id)
        .map(item => item._id as Types.ObjectId);

      // 3. เตรียมข้อมูลสำหรับอัปเดต UserGamification document
      // เราจะอัปเดตค่า XP ทั้งหมด และรายการ ID ของ achievements
      const updatePayload = {
        $set: {
          "gamification.totalExperiencePointsEverEarned": totalXPFromItems,
          // การตั้งค่า experiencePoints โดยตรงที่นี่เป็นเพียงการซิงค์ข้อมูลเบื้องต้น
          // ในระบบที่ซับซ้อน Service Layer ควรคำนวณค่า XP สำหรับ Level ปัจจุบันอีกที
          "gamification.experiencePoints": totalXPFromItems, 
          "gamification.achievements": achievementItemIds,
        },
        $currentDate: { "gamification.lastActivityAt": true }
      };

      // 4. ค้นหาและอัปเดต UserGamification document ที่เกี่ยวข้อง
      // ใช้ findOneAndUpdate และ upsert: true เพื่อสร้างเอกสารใหม่หากยังไม่มี
      await UserGamificationModel.findOneAndUpdate(
        { userId: doc.user },
        updatePayload,
        { upsert: true, new: true } // สร้างใหม่ถ้ายังไม่มี, และคืนค่าเอกสารใหม่
      );
      // console.log(`[UserAchievement Post-Save] Synced gamification stats for User ${doc.user}. Total XP: ${totalXPFromItems}`);

    } catch (error) {
      console.error(`[UserAchievement Post-Save Hook] Error syncing gamification data for user ${doc.user}:`, error);
      // ในระบบจริง ควรใช้ logger ที่มีประสิทธิภาพกว่านี้
    }
  }
  next();
});

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================
UserAchievementSchema.index({ user: 1, "earnedItems.itemType": 1, "earnedItems.unlockedAt": -1 }, { name: "UserGamificationData_EarnedItems_TypeDate_Idx" });
UserAchievementSchema.index({ user: 1, "ongoingProgress.itemKey": 1 }, { name: "UserGamificationData_OngoingProgress_ItemKey_Idx", sparse: true });

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================
const UserAchievementModel =
  (models.UserGamificationData as mongoose.Model<IUserAchievement>) || // Use the new collection name
  model<IUserAchievement>("UserGamificationData", UserAchievementSchema); // Use the new collection name

export default UserAchievementModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements) - ปรับปรุงล่าสุด
// ==================================================================================================
// 1.  **Collection Name**: เปลี่ยนชื่อ Collection เป็น `user_achievements` เพื่อให้สื่อความหมายครอบคลุมมากขึ้น.
// 2.  **`itemTypeRef`**: ทำให้ `itemTypeRef` ใน `IUserEarnedItem` เข้มงวดขึ้นเป็น `"Achievement" | "Badge" | "Title"`.
// 3.  **Snapshot Data**:
//     -   เพิ่ม `itemRaritySnapshot` ใน `IUserEarnedItem` เพื่อเก็บ Rarity ณ ตอนที่ได้รับ.
//     -   `rewardsGrantedSnapshot` ใช้ `IEarnedItemRewardSnapshot[]` เพื่อเก็บข้อมูลรางวัลที่ได้รับอย่างกระชับ.
//     -   Service Layer ที่ grant item ควรรับผิดชอบในการ populate snapshot fields (name, description, icon, rarity, rewards) จาก Achievement/Badge ต้นแบบ.
// 4.  **`ongoingProgress` Map Key**: Key ของ Map `ongoingProgress` ควรเป็น `achievementCode` หรือ `badgeKey` ที่ unique.
//     `IUserEarnedItemProgress` ได้เพิ่ม `itemKey` และ `itemType` เพื่อให้ระบุ item ได้ชัดเจน.
// 5.  **Synchronization with `UserGamification` (สำคัญ)**:
//     -   โมเดลนี้เป็น "แหล่งข้อมูลจริง (Source of Truth)" สำหรับรายการที่ผู้ใช้ได้รับ.
//     -   Post-save hook ที่แก้ไขใหม่จะทำหน้าที่ **ส่ง (Push)** ข้อมูลสรุป (เช่น total XP, list of achievement IDs) ไปยัง `UserGamification` model.
//     -   วิธีนี้ทำให้ `UserGamification` เป็น "ภาพสะท้อน (Reflection)" หรือ "แคช (Cache)" ของสถานะปัจจุบันที่อ่านได้เร็ว,
//       ในขณะที่ `UserAchievement` เก็บประวัติทั้งหมดอย่างละเอียด.
// 6.  **Redundant Fields Removed**: ฟิลด์ `totalExperiencePointsFromGamification` และ `showcasedItemIds` ถูกลบออกจากโมเดลนี้
//     เพราะข้อมูลสถานะปัจจุบัน (state) ควรอยู่ใน `UserGamification` ไม่ใช่ในโมเดลที่เก็บประวัติ (ledger).
// 7.  **Repeatable Items**: `timesEarned` ใน `IUserEarnedItem` ช่วยรองรับ. Logic การ grant item ใน Service Layer
//     จะต้องจัดการว่าจะ increment `timesEarned` หรือสร้าง `IUserEarnedItem` record ใหม่
//     ขึ้นอยู่กับว่าการได้รับซ้ำแต่ละครั้งถือเป็น instance ใหม่หรือไม่ หรือแค่เป็นการนับจำนวน.
// 8.  **Data Integrity & Denormalization**: การใช้ snapshot มีประโยชน์ถ้า Achievement/Badge ต้นแบบมีการเปลี่ยนแปลง
//     แต่ข้อมูลที่ผู้ใช้ได้รับไปแล้วควรจะคงเดิม. อย่างไรก็ตาม, ต้องมีกระบวนการที่ชัดเจนในการ populate ข้อมูล snapshot เหล่านี้.
// 9.  **Consistency of Rewards**: `IEarnedItemRewardSnapshot` ควรมีโครงสร้างที่สามารถรองรับรางวัลจากทั้ง `Achievement` และ `Badge` ได้
//     แม้ว่า Badge จะเน้นรางวัลน้อยกว่า.
// 10. **Future `Title` System**: `EarnedItemType.TITLE` และ `featuredTitleKey` เป็น placeholders.
//     หากมีการ implement ระบบ Title, จะต้องสร้าง `Title.ts` model และปรับปรุง logic ที่เกี่ยวข้อง.
// 11. **แก้ไขข้อผิดพลาด ESLint**: ลบ `IUserAchievementModel` ที่ว่างเปล่าออก เนื่องจากไม่มี static methods และไม่จำเป็นต้องกำหนด
//     ทำให้โค้ดสะอาดขึ้นและแก้ไขข้อผิดพลาด `@typescript-eslint/no-empty-object-type`.
// ==================================================================================================