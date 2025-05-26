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
 * @property {number} [totalExperiencePointsFromGamification] - (เปลี่ยนชื่อ) สรุป XP ทั้งหมดที่ผู้ใช้ได้รับจากระบบ Gamification (Achievements, Badges, etc.).
 * ค่านี้ควรจะถูกซิงค์กับ `User.gamification.experiencePoints`.
 * @property {Types.ObjectId[]} [showcasedItemIds] - (เปลี่ยนชื่อ) Array ของ `UserEarnedItem._id` ที่ผู้ใช้เลือกแสดงบนโปรไฟล์.
 * @property {string} [featuredTitleKey] - (อนาคต) Key ของ Title ที่ผู้ใช้เลือกแสดง.
 */
export interface IUserAchievement extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId | IUser;
  earnedItems: Types.DocumentArray<IUserEarnedItem>;
  ongoingProgress: Map<string, IUserEarnedItemProgress>; // Key: achievementCode หรือ badgeKey
  totalExperiencePointsFromGamification?: number; // เปลี่ยนชื่อ
  showcasedItemIds?: Types.ObjectId[]; // เปลี่ยนชื่อ, อ้างอิง UserEarnedItem._id
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
    totalExperiencePointsFromGamification: { // เปลี่ยนชื่อ field
      type: Number,
      default: 0,
      min: [0, "แต้มประสบการณ์ต้องไม่ติดลบ"]
    },
    showcasedItemIds: [{ type: Schema.Types.ObjectId }], // เปลี่ยนชื่อ, อ้างอิง UserEarnedItem._id โดยตรง
    featuredTitleKey: { type: String, trim: true, maxlength: 100 },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    collection: "user_gamification_data" // เปลี่ยนชื่อ collection ให้สื่อความหมายมากขึ้น
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
  // ตรวจสอบว่ามีการแก้ไข field ที่ควร trigger การอัปเดต User model หรือไม่
  const relevantFieldsModified = doc.isModified("totalExperiencePointsFromGamification") || doc.isModified("earnedItems");

  if (relevantFieldsModified) {
    const UserModel = models.User as mongoose.Model<IUser>; // Type assertion
    try {
      const achievementDocIds = doc.earnedItems
        .filter(item => item.itemType === EarnedItemType.ACHIEVEMENT && item._id)
        .map(item => item._id as Types.ObjectId); // Explicitly cast to Types.ObjectId

      const updatePayload: any = {
        $currentDate: { "gamification.lastActivityAt": true }
      };

      if (doc.isModified("totalExperiencePointsFromGamification")) {
        updatePayload.$set = {
          ...updatePayload.$set,
          "gamification.experiencePoints": doc.totalExperiencePointsFromGamification,
        };
      }
      if (doc.isModified("earnedItems")) {
        // This logic might be too simplistic if earnedItems can be removed.
        // It assumes `gamification.achievements` should always reflect the current state of `earnedItems` of type ACHIEVEMENT.
        updatePayload.$set = {
          ...updatePayload.$set,
          "gamification.achievements": achievementDocIds,
        };
      }

      if (Object.keys(updatePayload.$set || {}).length > 0) {
        await UserModel.findByIdAndUpdate(doc.user, updatePayload);
        // console.log(`[UserAchievement Post-Save] Updated User ${doc.user} gamification stats.`);
      }

    } catch (error) {
      console.error(`[UserAchievement Post-Save Hook] Error updating User model for user ${doc.user}:`, error);
      // Consider more robust error handling, like queuing a retry or logging to an error service.
    }
  }
  next();
});

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================
UserAchievementSchema.index({ user: 1, "earnedItems.itemType": 1, "earnedItems.unlockedAt": -1 }, { name: "UserGamificationData_EarnedItems_TypeDate_Idx" });
UserAchievementSchema.index({ user: 1, showcasedItemIds: 1 }, { name: "UserGamificationData_ShowcasedItems_Idx", sparse: true });
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
// 1.  **Collection Name**: เปลี่ยนชื่อ Collection เป็น `user_gamification_data` เพื่อให้สื่อความหมายครอบคลุมมากขึ้น.
// 2.  **`itemTypeRef`**: ทำให้ `itemTypeRef` ใน `IUserEarnedItem` เข้มงวดขึ้นเป็น `"Achievement" | "Badge" | "Title"`.
// 3.  **Snapshot Data**:
//     -   เพิ่ม `itemRaritySnapshot` ใน `IUserEarnedItem` เพื่อเก็บ Rarity ณ ตอนที่ได้รับ.
//     -   `rewardsGrantedSnapshot` ใช้ `IEarnedItemRewardSnapshot[]` เพื่อเก็บข้อมูลรางวัลที่ได้รับอย่างกระชับ.
//     -   Service Layer ที่ grant item ควรรับผิดชอบในการ populate snapshot fields (name, description, icon, rarity, rewards) จาก Achievement/Badge ต้นแบบ.
// 4.  **`ongoingProgress` Map Key**: Key ของ Map `ongoingProgress` ควรเป็น `achievementCode` หรือ `badgeKey` ที่ unique.
//     `IUserEarnedItemProgress` ได้เพิ่ม `itemKey` และ `itemType` เพื่อให้ระบุ item ได้ชัดเจน.
// 5.  **`totalExperiencePointsFromGamification`**: เปลี่ยนชื่อ field จาก `totalExperiencePointsEarned` เพื่อความชัดเจนว่ามาจากระบบ Gamification โดยรวม.
// 6.  **`showcasedItemIds`**: เปลี่ยนชื่อ field จาก `showcasedItems` และยืนยันว่าเก็บ Array ของ `UserEarnedItem._id`.
//     การอ้างอิง _id ของ subdocument `earnedItems` นั้นถูกต้อง เพราะ subdocuments ใน Mongoose จะมี _id ของตัวเองโดย default.
// 7.  **Synchronization with `User.gamification`**:
//     -   Post-save hook ได้รับการปรับปรุงเพื่ออัปเดต `User.gamification.experiencePoints` และ `User.gamification.achievements`
//         (ซึ่งเก็บ `UserEarnedItem._id` ที่เป็น Achievement).
//     -   Service Layer ควรเป็นผู้คำนวณ `totalExperiencePointsFromGamification` โดยรวม XP จาก `rewardsGrantedSnapshot` ของ `earnedItems` ทั้งหมด.
// 8.  **Repeatable Items**: `timesEarned` ใน `IUserEarnedItem` ช่วยรองรับ. Logic การ grant item ใน Service Layer
//     จะต้องจัดการว่าจะ increment `timesEarned` หรือสร้าง `IUserEarnedItem` record ใหม่
//     ขึ้นอยู่กับว่าการได้รับซ้ำแต่ละครั้งถือเป็น instance ใหม่หรือไม่ หรือแค่เป็นการนับจำนวน.
// 9.  **Data Integrity & Denormalization**: การใช้ snapshot มีประโยชน์ถ้า Achievement/Badge ต้นแบบมีการเปลี่ยนแปลง
//     แต่ข้อมูลที่ผู้ใช้ได้รับไปแล้วควรจะคงเดิม. อย่างไรก็ตาม, ต้องมีกระบวนการที่ชัดเจนในการ populate ข้อมูล snapshot เหล่านี้.
// 10. **Consistency of Rewards**: `IEarnedItemRewardSnapshot` ควรมีโครงสร้างที่สามารถรองรับรางวัลจากทั้ง `Achievement` และ `Badge` ได้
//     แม้ว่า Badge จะเน้นรางวัลน้อยกว่า.
// 11. **Future `Title` System**: `EarnedItemType.TITLE` และ `featuredTitleKey` เป็น placeholders.
//     หากมีการ implement ระบบ Title, จะต้องสร้าง `Title.ts` model และปรับปรุง logic ที่เกี่ยวข้อง.
// 12. **แก้ไขข้อผิดพลาด ESLint**: ลบ `IUserAchievementModel` ที่ว่างเปล่าออก เนื่องจากไม่มี static methods และไม่จำเป็นต้องกำหนด
//     ทำให้โค้ดสะอาดขึ้นและแก้ไขข้อผิดพลาด `@typescript-eslint/no-empty-object-type`.
// ==================================================================================================