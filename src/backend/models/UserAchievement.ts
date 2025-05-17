// src/backend/models/UserAchievement.ts
// โมเดลความสำเร็จของผู้ใช้ (UserAchievement Model)
// บันทึกความสำเร็จและเหรียญตราที่ผู้ใช้แต่ละคนได้รับ รวมถึงความคืบหน้าและรางวัลที่เกี่ยวข้อง

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IUser } from "./User"; // สำหรับ user
import { IAchievement, AchievementRewardType } from "./Achievement"; // สำหรับ achievementId และ type ที่เกี่ยวข้อง
import { IOfficialMedia } from "./OfficialMedia"; // สำหรับ iconMediaId (สมมติว่า IOfficialMedia มี property url: string)
import { IBadge } from "./Badge"; // สำหรับ badgeId

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล UserAchievement
// ==================================================================================================

/**
 * @enum {string} EarnedItemType
 * @description ประเภทของสิ่งที่ผู้ใช้ได้รับ
 * - `ACHIEVEMENT`: ความสำเร็จ (เช่น อ่านนิยายครบ 10 เรื่อง)
 * - `BADGE`: เหรียญตรา (เช่น เหรียญตรานักอ่านตัวยง)
 * - `TITLE`: (อนาคต) ฉายาที่ผู้ใช้สามารถเลือกแสดงได้
 */
export enum EarnedItemType {
  ACHIEVEMENT = "achievement",
  BADGE = "badge",
  TITLE = "title", // ยังไม่ใช้ แต่เผื่ออนาคต
}

/**
 * @interface IUserEarnedItemProgress
 * @description ข้อมูลความคืบหน้าสำหรับรายการที่ผู้ใช้กำลังพยายามปลดล็อก
 * @property {number} currentProgress - ความคืบหน้าปัจจุบัน
 * @property {number} targetProgress - ความคืบหน้าเป้าหมายที่ต้องการเพื่อปลดล็อก
 * @property {any} [details] - ข้อมูลเพิ่มเติมเกี่ยวกับความคืบหน้า (เช่น list of novel IDs read)
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
  { _id: false }
);

/**
 * @interface IUserEarnedItem
 * @description รายการความสำเร็จหรือเหรียญตราที่ผู้ใช้ได้รับ
 * @property {Types.ObjectId | IAchievement | IBadge} itemId - ID ของ Achievement หรือ Badge (อ้างอิงตาม itemType)
 * เมื่อ populate แล้วจะเป็น IAchievement หรือ IBadge document
 * @property {EarnedItemType} itemType - ประเภทของสิ่งที่ได้รับ (**จำเป็น**)
 * @property {string} itemTypeRef - ชื่อ Model ที่อ้างอิง (เช่น "Achievement", "Badge") ถูกกำหนดโดย pre-save hook
 * @property {string} itemNameSnapshot - ชื่อของรายการ ณ เวลาที่ได้รับ (denormalized)
 * @property {string} [itemDescriptionSnapshot] - คำอธิบายของรายการ ณ เวลาที่ได้รับ (denormalized)
 * @property {string} [itemIconUrlSnapshot] - URL ไอคอนของรายการ ณ เวลาที่ได้รับ (denormalized)
 * @property {Date} unlockedAt - วันที่ปลดล็อก/ได้รับ (**จำเป็น**)
 * @property {number} [levelUnlocked] - ระดับที่ปลดล็อก (สำหรับ achievement ที่มีหลายระดับ)
 * @property {any} [rewardsGranted] - รางวัลที่ได้รับจากการปลดล็อกนี้ (เช่น XP, points, virtual currency, object ที่มีรายละเอียดรางวัล)
 * @property {boolean} isPubliclyVisible - ผู้ใช้ต้องการให้รายการนี้แสดงบนโปรไฟล์สาธารณะหรือไม่ (default: true)
 * @property {Date} [claimedAt] - (Optional) วันที่ผู้ใช้กดรับรางวัล (ถ้ามีระบบ claim)
 */
export interface IUserEarnedItem extends Document {
  itemId: Types.ObjectId | IAchievement | IBadge; // หรือ ITitle ในอนาคต
  itemType: EarnedItemType;
  itemTypeRef: string; // << แก้ไข: เพิ่ม property นี้ใน interface
  itemNameSnapshot: string;
  itemDescriptionSnapshot?: string;
  itemIconUrlSnapshot?: string;
  unlockedAt: Date;
  levelUnlocked?: number;
  rewardsGranted?: any;
  isPubliclyVisible: boolean;
  claimedAt?: Date;
}
const UserEarnedItemSchema = new Schema<IUserEarnedItem>(
  {
    itemId: {
      type: Schema.Types.ObjectId,
      required: [true, "กรุณาระบุ ID ของรายการ (Item ID is required)"],
      refPath: "itemTypeRef", // แก้ไข: ให้ refPath อ้างอิงจาก itemTypeRef โดยตรงใน schema นี้
    },
    itemType: {
      type: String,
      enum: Object.values(EarnedItemType),
      required: [true, "กรุณาระบุประเภทของรายการ (Item type is required)"],
    },
    // Field นี้จะถูกสร้างอัตโนมัติใน pre-save hook และใช้สำหรับ refPath
    itemTypeRef: {
      type: String,
      required: true, // ทำให้จำเป็นต้องมีค่านี้ก่อน save
      validate: {
        validator: function(this: IUserEarnedItem, v: string) { // this ใน validator คือ subdocument IUserEarnedItem
          // const parentDocument = (this as any).parent(); // ไม่จำเป็นต้องใช้ parentDocument ในการ validate นี้
          const itemTypeFromSubdoc = this.itemType as EarnedItemType;

          if (itemTypeFromSubdoc === EarnedItemType.ACHIEVEMENT) return v === "Achievement";
          if (itemTypeFromSubdoc === EarnedItemType.BADGE) return v === "Badge";
          if (itemTypeFromSubdoc === EarnedItemType.TITLE) return v === "Title"; // สำหรับอนาคต
          return false; // ถ้า itemType ไม่ตรงกับที่คาดไว้
        },
        message: (props: { value: string }) => `itemTypeRef ('${props.value}') ไม่สอดคล้องกับ itemType ที่กำหนดใน subdocument นี้.`
      }
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
      maxlength: [1000, "คำอธิบายรายการยาวเกินไป (สูงสุด 1000 ตัวอักษร)"]
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
    levelUnlocked: { type: Number, min: 1 },
    rewardsGranted: { type: Schema.Types.Mixed },
    isPubliclyVisible: { type: Boolean, default: true },
    claimedAt: { type: Date },
  },
  {
    _id: true, // ให้ subdocument มี _id ของตัวเอง เพื่อให้สามารถอ้างอิงหรืออัปเดตได้ง่าย
  }
);

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร UserAchievement (IUserAchievement Document Interface)
// ==================================================================================================

/**
 * @interface IUserAchievement
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารความสำเร็จของผู้ใช้ใน Collection "userachievements"
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสาร
 * @property {Types.ObjectId | IUser} user - ID ของผู้ใช้ (**จำเป็น**, อ้างอิง User model)
 * @property {Types.DocumentArray<IUserEarnedItem>} earnedItems - รายการความสำเร็จและเหรียญตราที่ปลดล็อกแล้ว
 * @property {Map<string, IUserEarnedItemProgress>} ongoingProgress - ความคืบหน้าของ Achievement ที่ยังไม่ปลดล็อก (key คือ Achievement ID string)
 * @property {number} totalExperiencePointsEarned - สรุปแต้มประสบการณ์รวมจากความสำเร็จและเหรียญตรา
 * @property {Types.ObjectId[]} showcasedBadgeIds - Array ของ Badge IDs ที่ผู้ใช้เลือกแสดงบนโปรไฟล์
 * @property {Types.ObjectId} [featuredTitleId] - (อนาคต) ID ของ Title ที่ผู้ใช้เลือกแสดง
 * @property {Date} createdAt - วันที่สร้างเอกสาร (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตเอกสารล่าสุด (Mongoose `timestamps`)
 */
export interface IUserAchievement extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId | IUser;
  earnedItems: Types.DocumentArray<IUserEarnedItem>;
  ongoingProgress: Map<string, IUserEarnedItemProgress>;
  totalExperiencePointsEarned: number;
  showcasedBadgeIds: Types.ObjectId[];
  featuredTitleId?: Types.ObjectId; // สำหรับอนาคต หากมี Title Model
  createdAt: Date;
  updatedAt: Date;

  // Method signatures for instance methods
  addEarnedItem(itemDetails: {
    itemId: Types.ObjectId;
    itemType: EarnedItemType;
    itemNameSnapshot: string;
    itemDescriptionSnapshot?: string;
    itemIconUrlSnapshot?: string;
    xpAwarded?: number;
    levelUnlocked?: number;
    rewardsGranted?: any;
    isPubliclyVisible?: boolean;
  }): Promise<IUserAchievement>;

  updateOngoingProgress(
    achievementId: Types.ObjectId,
    currentProgress: number,
    targetProgress: number,
    details?: any
  ): Promise<IUserAchievement>;
}

// Interface สำหรับ Static method
export interface IUserAchievementModel extends mongoose.Model<IUserAchievement> {
    grantAchievementOrBadge(
        userId: Types.ObjectId,
        itemId: Types.ObjectId,
        itemType: EarnedItemType.ACHIEVEMENT | EarnedItemType.BADGE
    ): Promise<IUserAchievement>;
}


// ==================================================================================================
// SECTION: Schema หลักสำหรับ UserAchievement (UserAchievementSchema)
// ==================================================================================================
const UserAchievementSchema = new Schema<IUserAchievement, IUserAchievementModel>( // เพิ่ม IUserAchievementModel สำหรับ static methods
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุ ID ของผู้ใช้ (User ID is required)"],
      unique: true, // หนึ่ง document ต่อหนึ่งผู้ใช้
      index: true,
    },
    earnedItems: [UserEarnedItemSchema], // Array of subdocuments
    ongoingProgress: {
      type: Map,
      of: UserEarnedItemProgressSchema, // Schema for the values in the Map
      default: () => new Map(), // ใช้ function เพื่อให้สร้าง Map ใหม่ทุกครั้ง
    },
    totalExperiencePointsEarned: {
      type: Number,
      default: 0,
      min: [0, "แต้มประสบการณ์ต้องไม่ติดลบ (Experience points cannot be negative)"]
    },
    showcasedBadgeIds: [{ type: Schema.Types.ObjectId, ref: "Badge" }],
    featuredTitleId: { type: Schema.Types.ObjectId, ref: "Title" }, // สำหรับอนาคต
  },
  {
    timestamps: true, // เพิ่ม createdAt และ updatedAt โดยอัตโนมัติ
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    collection: "userachievements" // กำหนดชื่อ collection โดยตรง
  }
);

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

// Middleware: ก่อนการบันทึก (save) สำหรับ UserEarnedItemSchema (ภายใน earnedItems array)
// เราจะตั้งค่า itemTypeRef ที่นี่เมื่อ subdocument ถูกเพิ่มหรือ itemType เปลี่ยนแปลง
UserEarnedItemSchema.pre<IUserEarnedItem>("save", function (next) {
  // ตรวจสอบว่า `this` เป็น subdocument (IUserEarnedItem) และมี `itemType`
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
        // หาก itemType ไม่ถูกต้อง, validator ของ itemTypeRef ควรจะจัดการ
        // หรือจะโยน error ที่นี่ก็ได้
        const err = new Error(`Invalid itemType: '${this.itemType}' provided for itemTypeRef generation.`);
        return next(err);
    }
  }
  next();
});


// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

UserAchievementSchema.index({ user: 1, "earnedItems.itemId": 1, "earnedItems.itemType": 1 }, { name: "UserEarnedItemLookupIndex" });
UserAchievementSchema.index({ user: 1, "earnedItems.unlockedAt": -1 }, { name: "UserEarnedItemsByDateIndex" });
UserAchievementSchema.index({ user: 1, showcasedBadgeIds: 1 }, { name: "UserShowcasedBadgesIndex" });

// ==================================================================================================
// SECTION: Instance Methods (เมธอดสำหรับเอกสาร UserAchievement)
// ==================================================================================================

UserAchievementSchema.methods.addEarnedItem = async function(
  this: IUserAchievement,
  itemDetails: {
    itemId: Types.ObjectId;
    itemType: EarnedItemType;
    itemNameSnapshot: string;
    itemDescriptionSnapshot?: string;
    itemIconUrlSnapshot?: string;
    xpAwarded?: number;
    levelUnlocked?: number;
    rewardsGranted?: any;
    isPubliclyVisible?: boolean;
  }
): Promise<IUserAchievement> {
  const existingItemIndex = this.earnedItems.findIndex(
    (ei) => {
      let currentSubItemId: Types.ObjectId;
      if (ei.itemId instanceof Types.ObjectId) {
        currentSubItemId = ei.itemId;
      } else {
        // ei.itemId ควรเป็น populated IAchievement หรือ IBadge document
        // ทั้ง IAchievement และ IBadge interface กำหนด _id เป็น Types.ObjectId
        // หาก TypeScript infer type ของ ._id เป็น 'unknown', เราต้อง cast อย่างชัดเจน
        currentSubItemId = (ei.itemId as IAchievement | IBadge)._id as Types.ObjectId;

        // เพิ่มการตรวจสอบ runtime เพื่อความปลอดภัย (สำคัญมากหากมีการ cast)
        if (!(currentSubItemId instanceof Types.ObjectId)) {
            console.error(
              `[UserAchievement addEarnedItem] CRITICAL: _id of populated item is not a valid ObjectId after casting. Item:`, 
              JSON.stringify(ei.itemId), 
              `Extracted _id:`, 
              currentSubItemId
            );
            // ทำให้ predicate ของ findIndex คืน false เพื่อไม่ให้ match หรือจะ throw error ก็ได้
            // throw new TypeError("Data integrity issue: _id of populated item is not a valid ObjectId.");
            return false; 
        }
      }
      return currentSubItemId.equals(itemDetails.itemId) && ei.itemType === itemDetails.itemType;
    }
  );

  if (existingItemIndex !== -1) {
    const existingItem = this.earnedItems[existingItemIndex];
    let updated = false;

    if (itemDetails.levelUnlocked && (!existingItem.levelUnlocked || itemDetails.levelUnlocked > existingItem.levelUnlocked)) {
      existingItem.levelUnlocked = itemDetails.levelUnlocked;
      existingItem.unlockedAt = new Date();
      updated = true;
    }
    if (itemDetails.itemNameSnapshot !== existingItem.itemNameSnapshot) { 
        existingItem.itemNameSnapshot = itemDetails.itemNameSnapshot; updated = true; 
    }
    if (itemDetails.itemDescriptionSnapshot !== undefined && itemDetails.itemDescriptionSnapshot !== existingItem.itemDescriptionSnapshot) { 
        existingItem.itemDescriptionSnapshot = itemDetails.itemDescriptionSnapshot; updated = true; 
    }
    if (itemDetails.itemIconUrlSnapshot !== undefined && itemDetails.itemIconUrlSnapshot !== existingItem.itemIconUrlSnapshot) { 
        existingItem.itemIconUrlSnapshot = itemDetails.itemIconUrlSnapshot; updated = true; 
    }
    if (itemDetails.rewardsGranted !== undefined) { 
        existingItem.rewardsGranted = itemDetails.rewardsGranted; updated = true; 
    }
    if (itemDetails.isPubliclyVisible !== undefined && itemDetails.isPubliclyVisible !== existingItem.isPubliclyVisible) { 
        existingItem.isPubliclyVisible = itemDetails.isPubliclyVisible; updated = true; 
    }

    if (updated && itemDetails.xpAwarded && itemDetails.xpAwarded > 0) {
      this.totalExperiencePointsEarned += itemDetails.xpAwarded;
    }

    if (updated) {
      console.log(`[UserAchievement] Updated existing ${itemDetails.itemType} "${itemDetails.itemNameSnapshot}" for user ${this.user}.`);
      return this.save();
    }
    console.log(`[UserAchievement] User ${this.user} already has ${itemDetails.itemType} "${itemDetails.itemNameSnapshot}" with no significant updates required.`);
    return this;
  }

  const newEarnedItemData: Omit<IUserEarnedItem, '_id' | 'itemTypeRef' | 'createdAt' | 'updatedAt' | keyof Document > & { itemTypeRef?: string } = {
    itemId: itemDetails.itemId,
    itemType: itemDetails.itemType,
    // itemTypeRef จะถูกตั้งค่าโดย pre-save hook
    itemNameSnapshot: itemDetails.itemNameSnapshot,
    itemDescriptionSnapshot: itemDetails.itemDescriptionSnapshot,
    itemIconUrlSnapshot: itemDetails.itemIconUrlSnapshot,
    unlockedAt: new Date(),
    levelUnlocked: itemDetails.levelUnlocked,
    rewardsGranted: itemDetails.rewardsGranted,
    isPubliclyVisible: itemDetails.isPubliclyVisible !== undefined ? itemDetails.isPubliclyVisible : true,
  };
  
  this.earnedItems.push(newEarnedItemData as IUserEarnedItem);

  if (itemDetails.xpAwarded && itemDetails.xpAwarded > 0) {
    this.totalExperiencePointsEarned += itemDetails.xpAwarded;
  }

  console.log(`[UserAchievement] Added new ${itemDetails.itemType} "${itemDetails.itemNameSnapshot}" for user ${this.user}.`);

  if (itemDetails.itemType === EarnedItemType.ACHIEVEMENT) {
    this.ongoingProgress.delete(itemDetails.itemId.toString());
  }

  return this.save();
};

UserAchievementSchema.methods.updateOngoingProgress = async function(
  this: IUserAchievement,
  achievementId: Types.ObjectId,
  currentProgress: number,
  targetProgress: number,
  details?: any
): Promise<IUserAchievement> {
  const progressData: IUserEarnedItemProgress = {
    currentProgress,
    targetProgress,
    details,
    lastProgressAt: new Date(),
  };
  this.ongoingProgress.set(achievementId.toString(), progressData);
  console.log(`[UserAchievement] Updated ongoing progress for achievement ${achievementId} for user ${this.user}.`);
  return this.save();
};

// ==================================================================================================
// SECTION: Static Methods (เมธอดสำหรับ Model UserAchievement)
// ==================================================================================================

UserAchievementSchema.statics.grantAchievementOrBadge = async function(
  this: IUserAchievementModel,
  userId: Types.ObjectId,
  itemId: Types.ObjectId,
  itemType: EarnedItemType.ACHIEVEMENT | EarnedItemType.BADGE
): Promise<IUserAchievement> {
  let userAchievementDoc = await this.findOne({ user: userId });
  if (!userAchievementDoc) {
    userAchievementDoc = new this({
      user: userId,
      // earnedItems: [], // Mongoose จะ default ให้เป็น array ว่าง
      // ongoingProgress: new Map(), // Default จาก schema
      // totalExperiencePointsEarned: 0, // Default จาก schema
      // showcasedBadgeIds: [], // Default จาก schema
    });
  }

  let xpAwarded = 0;
  let itemNameSnapshot = "";
  let itemDescriptionSnapshot: string | undefined;
  let itemIconUrlSnapshot: string | undefined;
  let levelUnlocked: number | undefined;
  let rewardsGrantedPayload: any;

  if (itemType === EarnedItemType.ACHIEVEMENT) {
    const AchievementModelRef = models.Achievement as mongoose.Model<IAchievement> || model<IAchievement>("Achievement");
    const achievementDoc = await AchievementModelRef.findById(itemId).populate<{ iconMediaId?: IOfficialMedia }>('iconMediaId');

    if (!achievementDoc) throw new Error(`[UserAchievement Static] Achievement with ID ${itemId} not found.`);

    xpAwarded = achievementDoc.points || 0;
    itemNameSnapshot = achievementDoc.title;
    itemDescriptionSnapshot = achievementDoc.description;

    itemIconUrlSnapshot = achievementDoc.customIconUrl;
    if (!itemIconUrlSnapshot && achievementDoc.iconMediaId && !(achievementDoc.iconMediaId instanceof Types.ObjectId)) {
      const mediaItem = achievementDoc.iconMediaId as IOfficialMedia;
      if (mediaItem.url) { // สมมติว่า IOfficialMedia มี property url
        itemIconUrlSnapshot = mediaItem.url;
      } else {
        console.warn(`[UserAchievement Static] Achievement '${achievementDoc.title}' has iconMediaId but 'url' property is missing.`);
      }
    }
    
    levelUnlocked = undefined; 

    rewardsGrantedPayload = {
      pointsAwarded: achievementDoc.points,
      detailedRewards: achievementDoc.rewards,
      achievementCode: achievementDoc.achievementCode,
    };

  } else if (itemType === EarnedItemType.BADGE) {
    const BadgeModelRef = models.Badge as mongoose.Model<IBadge> || model<IBadge>("Badge");
    const badgeDoc = await BadgeModelRef.findById(itemId);
    if (!badgeDoc) throw new Error(`[UserAchievement Static] Badge with ID ${itemId} not found.`);

    xpAwarded = badgeDoc.experiencePointsAwarded || 0;
    itemNameSnapshot = badgeDoc.name;
    itemDescriptionSnapshot = badgeDoc.description;
    itemIconUrlSnapshot = badgeDoc.imageUrl;
    
    levelUnlocked = undefined;

    rewardsGrantedPayload = {
      name: badgeDoc.name,
      description: badgeDoc.description,
      icon: badgeDoc.imageUrl,
      experiencePointsAwarded: badgeDoc.experiencePointsAwarded,
      coinsAwarded: badgeDoc.coinsAwarded,
      rarity: badgeDoc.rarity,
      category: badgeDoc.category,
    };

  } else {
    throw new Error(`[UserAchievement Static] Unsupported itemType for granting: ${itemType}`);
  }

  return userAchievementDoc.addEarnedItem({
    itemId,
    itemType,
    itemNameSnapshot,
    itemDescriptionSnapshot,
    itemIconUrlSnapshot,
    xpAwarded,
    levelUnlocked,
    rewardsGranted: rewardsGrantedPayload,
  });
};


// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

const UserAchievementModel = 
    (models.UserAchievement as IUserAchievementModel) ||
    model<IUserAchievement, IUserAchievementModel>("UserAchievement", UserAchievementSchema);

export default UserAchievementModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **RefPath for `itemId`**: การใช้ `refPath` ช่วยให้ Mongoose populate `itemId` ไปยัง Model ที่ถูกต้อง
//     (Achievement หรือ Badge) โดยอัตโนมัติเมื่อ query. `itemTypeRef` ถูกจัดการใน pre-save hook ของ subdocument.
// 2.  **Denormalization**: `itemNameSnapshot`, `itemDescriptionSnapshot`, `itemIconUrlSnapshot` ถูก denormalize
//     เพื่อเก็บข้อมูล ณ เวลาที่ได้รับ ป้องกันปัญหาถ้าข้อมูลต้นทาง (Achievement/Badge) มีการเปลี่ยนแปลง.
// 3.  **Ongoing Progress**: `ongoingProgress` Map ใช้เก็บความคืบหน้าของ Achievement ที่ยังไม่ปลดล็อก
//     ช่วยให้สามารถแสดง UI ความคืบหน้าให้ผู้ใช้เห็นได้ และ trigger การปลดล็อกเมื่อถึงเป้าหมาย.
// 4.  **Repeatable Achievements**: Model ปัจจุบัน (addEarnedItem) จะอัปเดต existing item ถ้าเจอ itemId+itemType ซ้ำ
//     ถ้าต้องการให้ Achievement บางประเภทสามารถรับได้หลายครั้ง (เช่น "Daily Login") อาจจะต้องปรับ logic
//     ให้สามารถมี multiple entries ของ earnedItem เดียวกันได้ หรือมี counter แยก หรือ subdocument ID ที่ต่างกัน
// 5.  **Reward Claiming**: `claimedAt` field สำหรับระบบที่ผู้ใช้ต้องกด "รับรางวัล" หลังจากปลดล็อก.
// 6.  **Notification System**: ควรมีการ integrate กับ Notification system เพื่อแจ้งเตือนผู้ใช้เมื่อปลดล็อก Achievement/Badge ใหม่.
// 7.  **Scalability of Progress Tracking**: สำหรับระบบที่มีผู้ใช้จำนวนมากและการอัปเดต progress บ่อยครั้ง
//     อาจต้องพิจารณา performance ของการอัปเดต Map `ongoingProgress`.
// 8.  **Leaderboards**: `totalExperiencePointsEarned` สามารถใช้เป็นพื้นฐานในการสร้าง Leaderboard ได้.
// 9.  **Admin Tools**: ควรมีเครื่องมือสำหรับ Admin ในการ grant/revoke Achievements/Badges หรือแก้ไขข้อมูลผู้ใช้.
// 10. **Error Handling & Logging**: เพิ่มการจัดการข้อผิดพลาดและ logging ที่ละเอียดขึ้นใน production.
// 11. **Icon URL Resolution for Achievements**: การดึง `itemIconUrlSnapshot` จาก `achievementDoc.iconMediaId` อาจต้องมีการ populate `iconMediaId` อย่างถูกต้อง และ `IOfficialMedia` ต้องมี property `url`.
// ==================================================================================================