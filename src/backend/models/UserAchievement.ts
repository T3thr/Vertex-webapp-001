// src/backend/models/UserAchievement.ts
// โมเดลความสำเร็จและเหรียญตราของผู้ใช้ (UserAchievement Model)
// บันทึกความสำเร็จและเหรียญตราที่ผู้ใช้แต่ละคนได้รับ รวมถึงความคืบหน้าและรางวัลที่เกี่ยวข้อง
// ทำงานร่วมกับ Achievement.ts, Badge.ts, และ User.ts เพื่อสร้างระบบ Gamification ที่สมบูรณ์

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IUser } from "./User"; // สำหรับ user (อ้างอิง User.ts ที่อัปเดตแล้ว)
import { IAchievement } from "./Achievement"; // สำหรับ achievementId (อ้างอิง Achievement.ts ที่อัปเดตแล้ว)
import { IBadge } from "./Badge"; // สำหรับ badgeId (อ้างอิง Badge.ts ที่อัปเดตแล้ว)
// IOfficialMedia อาจจะไม่จำเป็นต้อง import โดยตรงที่นี่ ถ้า itemIconUrlSnapshot เก็บเป็น URL string

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล UserAchievement
// ==================================================================================================

/**
 * @enum {string} EarnedItemType
 * @description ประเภทของสิ่งที่ผู้ใช้ได้รับ (Achievement หรือ Badge)
 * - `ACHIEVEMENT`: ความสำเร็จที่กำหนดไว้ใน Achievement.ts
 * - `BADGE`: เหรียญตราที่กำหนดไว้ใน Badge.ts
 * - `TITLE`: (อนาคต) ฉายาที่ผู้ใช้สามารถเลือกแสดงได้ (ยังไม่ implement ในปัจจุบัน)
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
 * @property {number} currentProgress - ความคืบหน้าปัจจุบัน (เช่น จำนวนครั้งที่ทำกิจกรรม, จำนวนวันที่ล็อกอินต่อเนื่อง)
 * @property {number} targetProgress - ความคืบหน้าเป้าหมายที่ต้องการเพื่อปลดล็อก (ดึงมาจาก `unlockConditions.targetValue` ของ Achievement/Badge)
 * @property {any} [details] - ข้อมูลเพิ่มเติมเกี่ยวกับความคืบหน้า (เช่น array ของ novelId ที่อ่านไปแล้ว, last_event_timestamp)
 * @property {Date} lastProgressAt - วันที่อัปเดตความคืบหน้าล่าสุด
 */
export interface IUserEarnedItemProgress {
  currentProgress: number;
  targetProgress: number;
  details?: any;
  lastProgressAt: Date;
}
const UserEarnedItemProgressSchema = new Schema<IUserEarnedItemProgress>(
  {
    currentProgress: { type: Number, required: true, min: 0 },
    targetProgress: { type: Number, required: true, min: 0 },
    details: { type: Schema.Types.Mixed },
    lastProgressAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false } // ไม่จำเป็นต้องมี _id สำหรับ sub-document ใน Map
);

/**
 * @interface IUserEarnedItem
 * @description โครงสร้างของรายการ Achievement หรือ Badge ที่ผู้ใช้ได้รับแล้ว
 * แต่ละ object ใน array `earnedItems` ของ `IUserAchievement` จะใช้โครงสร้างนี้.
 * @property {Types.ObjectId | IAchievement | IBadge} itemId - ID ของ Achievement หรือ Badge ที่ได้รับ (อ้างอิงตาม `itemTypeRef`)
 * เมื่อ populate แล้วจะเป็น IAchievement หรือ IBadge document.
 * @property {EarnedItemType} itemType - ประเภทของสิ่งที่ได้รับ (ACHIEVEMENT หรือ BADGE). **จำเป็น**
 * @property {string} itemTypeRef - ชื่อ Model ที่ `itemId` อ้างอิงถึง (เช่น "Achievement", "Badge").
 * จะถูกกำหนดค่าโดยอัตโนมัติผ่าน pre-save hook โดยอิงจากค่า `itemType`. **จำเป็น**
 * @property {string} itemNameSnapshot - ชื่อของรายการ (Achievement/Badge) ณ เวลาที่ผู้ใช้ได้รับ (denormalized). **จำเป็น**
 * @property {string} [itemDescriptionSnapshot] - คำอธิบายของรายการ ณ เวลาที่ผู้ใช้ได้รับ (denormalized).
 * @property {string} [itemIconUrlSnapshot] - URL ไอคอนของรายการ ณ เวลาที่ผู้ใช้ได้รับ (denormalized).
 * อาจเป็น URL จาก `customIconUrl` หรือ URL ของ `OfficialMedia` ที่แปลงแล้ว.
 * @property {Date} unlockedAt - วันที่และเวลาที่ผู้ใช้ปลดล็อก/ได้รับรายการนี้. **จำเป็น**
 * @property {number} [timesEarned] - (ใหม่) จำนวนครั้งที่ได้รับ (สำหรับ Achievement/Badge ที่ isRepeatable=true) (default: 1).
 * @property {any} [rewardsGranted] - รางวัลที่ผู้ใช้ได้รับจากการปลดล็อกรายการนี้ (เช่น XP, Coins, หรือ object ที่มีรายละเอียดรางวัล).
 * โครงสร้างควรสอดคล้องกับ `IAchievementReward` ใน Achievement.ts หรือโครงสร้างรางวัลของ Badge.
 * @property {boolean} isPubliclyVisible - ผู้ใช้ต้องการให้รายการนี้แสดงบนโปรไฟล์สาธารณะของตนหรือไม่ (default: true).
 * @property {Date} [claimedAt] - (Optional) วันที่ผู้ใช้กดรับรางวัล (ถ้ามีระบบ claim reward แยกต่างหาก).
 * @property {any} [unlockContext] - (Optional) ข้อมูลบริบทเพิ่มเติม ณ เวลาที่ปลดล็อก (เช่น novelId, episodeId ที่ทำให้ปลดล็อก).
 */
export interface IUserEarnedItem extends Document { // Document สำหรับ sub-document array
  itemId: Types.ObjectId | IAchievement | IBadge; // หรือ ITitle ในอนาคต
  itemType: EarnedItemType;
  itemTypeRef: string;
  itemNameSnapshot: string;
  itemDescriptionSnapshot?: string;
  itemIconUrlSnapshot?: string;
  unlockedAt: Date;
  timesEarned: number; // เพิ่ม field นี้
  rewardsGranted?: any; // ควรเป็นโครงสร้างที่ชัดเจน เช่น IAchievementReward[]
  isPubliclyVisible: boolean;
  claimedAt?: Date;
  unlockContext?: any;
}
const UserEarnedItemSchema = new Schema<IUserEarnedItem>(
  {
    itemId: {
      type: Schema.Types.ObjectId,
      required: [true, "กรุณาระบุ ID ของรายการ (Item ID is required)"],
      refPath: "itemTypeRef", // Dynamic reference based on itemTypeRef
    },
    itemType: {
      type: String,
      enum: Object.values(EarnedItemType),
      required: [true, "กรุณาระบุประเภทของรายการ (Item type is required)"],
    },
    itemTypeRef: { // This field will be set by a pre-save hook
      type: String,
      required: [true, "itemTypeRef is required for dynamic population and must be 'Achievement' or 'Badge' or 'Title'"],
      enum: ["Achievement", "Badge", "Title"], // Ensure it's one of the expected model names
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
    unlockedAt: {
      type: Date,
      default: Date.now,
      required: [true, "กรุณาระบุวันที่ปลดล็อก (Unlock date is required)"],
      index: true
    },
    timesEarned: { type: Number, default: 1, min: 1 }, // เพิ่ม field นี้
    rewardsGranted: { type: Schema.Types.Mixed },
    isPubliclyVisible: { type: Boolean, default: true },
    claimedAt: { type: Date },
    unlockContext: { type: Schema.Types.Mixed },
  },
  {
    _id: true, // Subdocuments will have their own _id by default unless set to false. Keeping it true is fine.
  }
);


// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร UserAchievement (IUserAchievement Document Interface)
// ==================================================================================================

/**
 * @interface IUserAchievement
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารความสำเร็จของผู้ใช้ใน Collection "userachievements".
 * เอกสารนี้จะถูกสร้างหนึ่งรายการต่อผู้ใช้ และจะเก็บข้อมูล Gamification ทั้งหมดที่เกี่ยวข้องกับผู้ใช้นั้น.
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสาร
 * @property {Types.ObjectId | IUser} user - ID ของผู้ใช้ (อ้างอิง User model). **จำเป็นและ unique**
 * @property {Types.DocumentArray<IUserEarnedItem>} earnedItems - รายการความสำเร็จและเหรียญตราทั้งหมดที่ผู้ใช้ปลดล็อกแล้ว.
 * @property {Map<string, IUserEarnedItemProgress>} ongoingProgress - ความคืบหน้าของ Achievement/Badge ที่ผู้ใช้ยังไม่ปลดล็อก.
 * Key คือ `achievementCode` หรือ `badgeKey` (string), Value คือ `IUserEarnedItemProgress`.
 * @property {number} totalExperiencePointsEarned - สรุปแต้มประสบการณ์ (XP) ทั้งหมดที่ผู้ใช้ได้รับจากความสำเร็จและเหรียญตรา.
 * ค่านี้ควรจะถูกอัปเดตใน `User.gamification.experiencePoints` ด้วย.
 * @property {Types.ObjectId[]} showcasedItems - (เปลี่ยนชื่อจาก showcasedBadgeIds) Array ของ `UserEarnedItem._id` (ไม่ใช่ BadgeId โดยตรง)
 * ที่ผู้ใช้เลือกแสดงบนโปรไฟล์ (อาจจะจำกัดจำนวน).
 * การเก็บ UserEarnedItem._id ทำให้สามารถแยกแยะได้ในกรณีที่ Badge เดียวกันได้รับหลายครั้ง (ถ้า isRepeatable).
 * @property {string} [featuredTitleKey] - (อนาคต) Key ของ Title ที่ผู้ใช้เลือกแสดง (ถ้ามีระบบ Title และ Title Model).
 * @property {Date} createdAt - วันที่สร้างเอกสาร (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตเอกสารล่าสุด (Mongoose `timestamps`)
 */
export interface IUserAchievement extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId | IUser;
  earnedItems: Types.DocumentArray<IUserEarnedItem>;
  ongoingProgress: Map<string, IUserEarnedItemProgress>;
  totalExperiencePointsEarned: number;
  showcasedItems: Types.ObjectId[]; // Array of UserEarnedItem._id
  featuredTitleKey?: string; // สำหรับอนาคต
  createdAt: Date;
  updatedAt: Date;
}

// Interface สำหรับ Static method (ถ้ามี)
export interface IUserAchievementModel extends mongoose.Model<IUserAchievement> {
    // ตัวอย่าง static method
    // findByUserAndUpsertProgress(userId: Types.ObjectId, itemKey: string, progress: Partial<IUserEarnedItemProgress>): Promise<IUserAchievement>;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ UserAchievement (UserAchievementSchema)
// ==================================================================================================
const UserAchievementSchema = new Schema<IUserAchievement, IUserAchievementModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User", // อ้างอิง User.ts ที่อัปเดตแล้ว
      required: [true, "กรุณาระบุ ID ของผู้ใช้ (User ID is required)"],
      unique: true, // หนึ่ง document ต่อหนึ่งผู้ใช้
      index: true,
    },
    earnedItems: [UserEarnedItemSchema], // Array of subdocuments
    ongoingProgress: {
      type: Map,
      of: UserEarnedItemProgressSchema,
      default: () => new Map(),
      comment: "Key คือ achievementCode หรือ badgeKey, Value คือ IUserEarnedItemProgress"
    },
    totalExperiencePointsEarned: {
      type: Number,
      default: 0,
      min: [0, "แต้มประสบการณ์ต้องไม่ติดลบ (Experience points cannot be negative)"]
    },
    showcasedItems: [{ type: Schema.Types.ObjectId, ref: "UserAchievement.earnedItems" }], // อ้างอิง _id ของ subdocument ใน earnedItems
    featuredTitleKey: { type: String, trim: true }, // สำหรับอนาคต
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    collection: "userachievements"
  }
);

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

// Middleware: ก่อนการบันทึก (save) สำหรับ UserEarnedItemSchema (ภายใน earnedItems array)
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
        this.itemTypeRef = "Title"; // สำหรับอนาคต
        break;
      default:
        const err = new Error(`Invalid itemType: '${this.itemType}' for itemTypeRef generation.`);
        return next(err);
    }
  }
  next();
});

// Middleware: หลังจากการบันทึก UserAchievement (post-save)
UserAchievementSchema.post<IUserAchievement>("save", async function (doc, next) {
  // ถ้ามีการเปลี่ยนแปลง totalExperiencePointsEarned หรือ earnedItems
  // ให้อัปเดต User.gamification.experiencePoints และ User.gamification.achievements
  if (doc.isModified("totalExperiencePointsEarned") || doc.isModified("earnedItems")) {
    const UserModel = models.User as mongoose.Model<IUser>;
    try {
      // ดึง ObjectId ของ UserEarnedItem document ที่เป็น Achievement
      const achievementDocIds = doc.earnedItems
          .filter(item => item.itemType === EarnedItemType.ACHIEVEMENT && item._id) // ตรวจสอบว่า _id มีอยู่
          .map(item => item._id!); // ใช้ ! เพราะได้ filter กรณี _id ไม่มีค่าออกไปแล้ว

      await UserModel.findByIdAndUpdate(doc.user, {
        $set: {
          "gamification.experiencePoints": doc.totalExperiencePointsEarned,
          "gamification.achievements": achievementDocIds, // เก็บ array ของ ObjectId ของ UserEarnedItem ที่เป็น achievement
        },
        $currentDate: { "gamification.lastActivityAt": true } // (สมมติว่า User.gamification มี field นี้)
      });
      // console.log(`[UserAchievement Post-Save] Updated User ${doc.user} gamification stats.`);
    } catch (error) {
      console.error(`[UserAchievement Post-Save Hook] Error updating User model for user ${doc.user}:`, error);
      // ควรมี error handling ที่ดีกว่านี้
    }
  }
  next();
});


// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

// Index หลักคือ user ID เนื่องจากเป็น unique
// UserAchievementSchema.index({ user: 1 }, { unique: true }); // Mongoose สร้างให้จาก unique: true ด้านบน

// Index สำหรับค้นหา items ที่ผู้ใช้ได้รับตามประเภทและวันที่
UserAchievementSchema.index({ user: 1, "earnedItems.itemType": 1, "earnedItems.unlockedAt": -1 }, { name: "UserEarnedItemsByTypeAndDateIndex" });
// Index สำหรับค้นหา items ที่ผู้ใช้เลือกแสดง
UserAchievementSchema.index({ user: 1, showcasedItems: 1 }, { name: "UserShowcasedItemsIndex" });
// Index สำหรับ ongoingProgress (ถ้ามีการ query บ่อย)
// การ query Map อาจซับซ้อน, อาจจะต้องพิจารณาโครงสร้างอื่นถ้า query based on progress key/value เป็นเรื่องปกติ
// UserAchievementSchema.index({ user: 1, "ongoingProgress.$*": 1 }); // ตัวอย่าง (อาจจะไม่ใช่ syntax ที่ถูกต้องเสมอไป)

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

const UserAchievementModel =
    (models.UserAchievement as IUserAchievementModel) || // ใช้ IUserAchievementModel สำหรับ static methods
    model<IUserAchievement, IUserAchievementModel>("UserAchievement", UserAchievementSchema);

export default UserAchievementModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **`itemTypeRef` Mechanism**: การใช้ `refPath` ร่วมกับ `itemTypeRef` ที่ถูกกำหนดค่าใน pre-save hook ของ subdocument
//     เป็นวิธีที่ Mongoose รองรับสำหรับ dynamic population. `itemTypeRef` ใน IUserEarnedItemSchema
//     ควรมี enum ที่ตรงกับชื่อ Model ที่จะอ้างอิง ("Achievement", "Badge", "Title") เพื่อความถูกต้อง.
// 2.  **Data Integrity for Snapshots**: `itemNameSnapshot`, `itemDescriptionSnapshot`, `itemIconUrlSnapshot`
//     เป็นข้อมูลที่ denormalize มา. ควรมีกลไก (อาจจะเป็นตอน grant item) ในการดึงข้อมูลล่าสุดจาก Achievement/Badge
//     มาใส่ใน fields เหล่านี้ให้ถูกต้อง.
// 3.  **`ongoingProgress` Map Key**: Key ของ Map `ongoingProgress` ควรเป็น ID ที่เสถียรและ unique
//     เช่น `achievementCode` จาก `Achievement.ts` หรือ `badgeKey` จาก `Badge.ts`.
//     ปัจจุบัน schema ใช้ Map<string, ...> ซึ่งหมายถึง key เป็น string.
// 4.  **`rewardsGranted` Structure**: โครงสร้างของ `rewardsGranted` ใน `IUserEarnedItem` ควรจะชัดเจน
//     และสอดคล้องกับ `IAchievementReward` หรือโครงสร้างรางวัลจาก `Badge`.
// 5.  **Repeatable Achievements/Badges**:
//     -   Field `timesEarned` ถูกเพิ่มใน `IUserEarnedItem` เพื่อรองรับกรณีที่ Achievement/Badge สามารถได้รับซ้ำได้.
//     -   Gamification Service Layer จะต้องมี logic ในการตรวจสอบ `isRepeatable` และ `maxRepeats` จาก
//         Achievement/Badge ต้นแบบก่อนที่จะเพิ่ม `timesEarned` หรือสร้าง `IUserEarnedItem` ใหม่ (ถ้าการรับซ้ำแต่ละครั้งถือเป็น item ใหม่).
//         ปัจจุบัน `addEarnedItem` ในไฟล์ต้นฉบับจะอัปเดต item เดิมถ้าเจอซ้ำ, ซึ่งอาจต้องปรับถ้าการรับซ้ำหมายถึง record ใหม่.
// 6.  **Synchronization with `User.gamification`**:
//     -   `totalExperiencePointsEarned` ใน `UserAchievement` ควรจะถูกซิงค์กับ `User.gamification.experiencePoints`.
//     -   `User.gamification.achievements` ได้ถูกปรับปรุงใน `User.ts` ให้อ้างอิง `UserAchievement` (ซึ่งในที่นี้หมายถึง `UserEarnedItem._id` ที่เป็น Achievement)
//         Post-save hook ใน `UserAchievementSchema` ได้ถูกปรับปรุงเพื่ออัปเดตข้อมูลเหล่านี้ใน `User` model.
// 7.  **Performance**: สำหรับผู้ใช้ที่มี `earnedItems` หรือ `ongoingProgress` จำนวนมาก การ query หรือ update document นี้
//     อาจต้องพิจารณาเรื่อง performance. การใช้ index ที่เหมาะสมและการจำกัดจำนวน subdocuments ที่ populate เป็นสิ่งสำคัญ.
// 8.  **`showcasedItems`**: การอ้างอิง `UserAchievement.earnedItems` โดยตรงอาจจะยังไม่ถูกต้องนักถ้า `earnedItems` ไม่ได้ใช้
//     `_id` ของตัวเองเป็น subdocument (แต่ default คือมี). ถ้า `earnedItems` เป็น array ของ plain objects ที่ไม่มี `_id`,
//     จะต้องเปลี่ยนวิธีการอ้างอิง (เช่น อ้างอิง `itemId` และ `itemType` แทน). ปัจจุบัน `UserEarnedItemSchema`
//     ถูกกำหนดให้มี `_id: true` ซึ่งเป็น default ของ Mongoose subdocument และดีต่อการอ้างอิง.
// ==================================================================================================