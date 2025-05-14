// src/models/UserAchievement.ts
// โมเดลความสำเร็จของผู้ใช้ (UserAchievement Model) - บันทึกความสำเร็จและเหรียญตราที่ผู้ใช้แต่ละคนได้รับ
// ออกแบบให้เชื่อมโยงผู้ใช้กับความสำเร็จ/เหรียญตรา, วันที่ได้รับ, และความคืบหน้า (ถ้ามี)

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import UserModel from "./User";
import AchievementModel from "./Achievement";
import BadgeModel from "./Badge";

// อินเทอร์เฟซสำหรับความสำเร็จหรือเหรียญตราที่ผู้ใช้ได้รับ
export interface IUserEarnedItem {
  itemId: Types.ObjectId; // ID ของ Achievement หรือ Badge
  itemType: "achievement" | "badge"; // ประเภทของสิ่งที่ได้รับ
  itemName: string; // ชื่อ (denormalized for display, from Achievement.name or Badge.name)
  itemIconUrl?: string; // URL ไอคอน (denormalized)
  unlockedAt: Date; // วันที่ปลดล็อก/ได้รับ
  progress?: number; // ความคืบหน้าปัจจุบัน (สำหรับ achievement ที่มี level หรือ progress tracking)
  maxProgress?: number; // ความคืบหน้าสูงสุดที่ต้องการ
  level?: number; // ระดับที่ปลดล็อก (สำหรับ achievement ที่มี level)
  // notificationSent?: boolean; // สถานะการส่ง notification (อาจจัดการแยก)
}

// อินเทอร์เฟซหลักสำหรับเอกสารความสำเร็จของผู้ใช้ (UserAchievement Document)
// อาจจะรวม Badge ที่ได้รับไว้ในนี้ด้วย หรือมี UserBadge model แยก
// เพื่อความง่ายในการ query "สิ่งที่ผู้ใช้ได้รับทั้งหมด" จะรวมไว้ที่นี่
export interface IUserAchievement extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId; // ผู้ใช้ (อ้างอิง User model)
  
  // รายการความสำเร็จและเหรียญตราที่ปลดล็อกแล้ว
  earnedItems: Types.DocumentArray<IUserEarnedItem>;
  
  // สรุปแต้มประสบการณ์รวมจากความสำเร็จและเหรียญตรา (ถ้ามีระบบ XP)
  totalExperiencePointsEarned: number;
  
  // เหรียญตราที่เลือกแสดงบนโปรไฟล์ (ถ้ามี feature นี้)
  // showcasedBadges: Types.Array<Types.ObjectId>; // Array of Badge IDs
  
  // ความสำเร็จล่าสุดที่ได้รับ (denormalized for quick display on profile)
  // lastAchievementUnlocked?: {
  //   achievementId: Types.ObjectId;
  //   name: string;
  //   unlockedAt: Date;
  // };

  // Timestamps
  createdAt: Date; // วันที่สร้าง record นี้ (มักจะพร้อมกับ user creation)
  updatedAt: Date; // วันที่อัปเดตล่าสุด (เมื่อมีการปลดล็อก achievement/badge ใหม่)
}

// Schema ย่อยสำหรับ IUserEarnedItem
const UserEarnedItemSchema = new Schema<IUserEarnedItem>(
  {
    itemId: { type: Schema.Types.ObjectId, required: true, index: true }, // refPath: "itemType"
    itemType: { type: String, enum: ["achievement", "badge"], required: true },
    itemName: { type: String, required: true, trim: true },
    itemIconUrl: { type: String, trim: true },
    unlockedAt: { type: Date, default: Date.now, required: true, index: true },
    progress: { type: Number, min: 0 },
    maxProgress: { type: Number, min: 0 },
    level: { type: Number, min: 1 },
  },
  {
    _id: false, // No separate _id for subdocuments unless needed for direct reference
    // Add a compound index on itemId and itemType if needed for uniqueness within the array per user
  }
);

// Schema หลักสำหรับ UserAchievement
const UserAchievementSchema = new Schema<IUserAchievement>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // หนึ่ง document ต่อหนึ่งผู้ใช้
      index: true,
    },
    earnedItems: [UserEarnedItemSchema],
    totalExperiencePointsEarned: { type: Number, default: 0, min: 0 },
    // showcasedBadges: [{ type: Schema.Types.ObjectId, ref: "Badge" }],
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ----- Indexes -----
UserAchievementSchema.index({ user: 1, "earnedItems.itemId": 1, "earnedItems.itemType": 1 }); // ตรวจสอบว่า user มี item นี้หรือยัง
UserAchievementSchema.index({ user: 1, "earnedItems.unlockedAt": -1 }); // ดึงรายการล่าสุดที่ปลดล็อก

// ----- Methods -----
// Method to add a new achievement or badge to the user
UserAchievementSchema.methods.addEarnedItem = async function(
  this: IUserAchievement,
  itemDetails: {
    itemId: Types.ObjectId;
    itemType: "achievement" | "badge";
    itemName: string;
    itemIconUrl?: string;
    xpAwarded?: number;
    progress?: number;
    maxProgress?: number;
    level?: number;
  }
) {
  // ตรวจสอบว่ามี item นี้อยู่แล้วหรือไม่ (สำหรับ achievement ที่ไม่ repeatable)
  // Badge โดยทั่วไปจะได้รับครั้งเดียว
  // Achievement ที่ repeatable อาจต้องมี logic การจัดการ progress หรือ multiple entries ที่ซับซ้อนกว่านี้
  // (ปัจจุบัน model นี้เก็บ earnedItems เป็น unique list ของ itemId+itemType)
  const existingItem = this.earnedItems.find(
    (ei) => ei.itemId.equals(itemDetails.itemId) && ei.itemType === itemDetails.itemType
  );

  if (existingItem) {
    // ถ้าเป็น achievement ที่มี level และ level ใหม่สูงกว่า หรือมี progress update
    if (itemDetails.itemType === "achievement") {
        let updated = false;
        if (itemDetails.level && (!existingItem.level || itemDetails.level > existingItem.level)) {
            existingItem.level = itemDetails.level;
            existingItem.unlockedAt = new Date(); // Update unlock date for new level
            updated = true;
        }
        if (itemDetails.progress !== undefined && (!existingItem.progress || itemDetails.progress > existingItem.progress || itemDetails.progress === itemDetails.maxProgress)) {
            existingItem.progress = itemDetails.progress;
            if (itemDetails.progress === itemDetails.maxProgress) {
                existingItem.unlockedAt = new Date(); // Mark as unlocked/completed if progress reaches max
            }
            updated = true;
        }
        if (updated && itemDetails.xpAwarded) {
            this.totalExperiencePointsEarned += itemDetails.xpAwarded; // Add XP for new level/completion
        }
        if (updated) return this.save();
    }
    console.log(`User ${this.user} already has ${itemDetails.itemType} ${itemDetails.itemName}. No new entry added or XP awarded.`);
    return this; // Or throw error if it should be unique and not updatable
  }

  const newEarnedItem: IUserEarnedItem = {
    itemId: itemDetails.itemId,
    itemType: itemDetails.itemType,
    itemName: itemDetails.itemName,
    itemIconUrl: itemDetails.itemIconUrl,
    unlockedAt: new Date(),
    progress: itemDetails.progress,
    maxProgress: itemDetails.maxProgress,
    level: itemDetails.level,
  };

  this.earnedItems.push(newEarnedItem);
  if (itemDetails.xpAwarded) {
    this.totalExperiencePointsEarned += itemDetails.xpAwarded;
  }
  
  // Potentially update User model with total achievements/badges count or last achievement
  // await UserModel().findByIdAndUpdate(this.user, { 
  //   $inc: { [`activityTracking.${itemDetails.itemType}sUnlockedCount`]: 1 },
  //   // Update last achievement details if needed
  // });

  return this.save();
};

// ----- Static Methods -----
// Helper to grant an achievement/badge to a user
UserAchievementSchema.statics.grantAchievementOrBadge = async function(
  userId: Types.ObjectId,
  itemId: Types.ObjectId,
  itemType: "achievement" | "badge"
) {
  let userAchievementDoc = await this.findOne({ user: userId });
  if (!userAchievementDoc) {
    userAchievementDoc = new (this as mongoose.Model<IUserAchievement>)({ user: userId, earnedItems: [], totalExperiencePointsEarned: 0 });
  }

  let itemDefinition;
  let xpAwarded = 0;
  let itemName = "";
  let itemIconUrl: string | undefined;

  if (itemType === "achievement") {
    itemDefinition = await AchievementModel().findById(itemId).lean();
    if (!itemDefinition) throw new Error(`Achievement with ID ${itemId} not found.`);
    xpAwarded = itemDefinition.rewards?.experiencePoints || 0;
    itemName = itemDefinition.name;
    itemIconUrl = itemDefinition.iconUrl;
    // If this achievement also grants a badge, handle that separately or via a more complex reward system
  } else { // badge
    itemDefinition = await BadgeModel().findById(itemId).lean();
    if (!itemDefinition) throw new Error(`Badge with ID ${itemId} not found.`);
    xpAwarded = itemDefinition.experiencePointsAwarded || 0;
    itemName = itemDefinition.name;
    itemIconUrl = itemDefinition.imageUrl || itemDefinition.iconUrl;
  }

  return userAchievementDoc.addEarnedItem({
    itemId,
    itemType,
    itemName,
    itemIconUrl,
    xpAwarded,
    level: itemType === "achievement" ? itemDefinition?.level : undefined,
    // progress and maxProgress would typically be handled by the calling logic that determines if an achievement is unlocked
  });
};


// ----- Model Export -----
const UserAchievementModel = () => models.UserAchievement as mongoose.Model<IUserAchievement> || model<IUserAchievement>("UserAchievement", UserAchievementSchema);

export default UserAchievementModel;

