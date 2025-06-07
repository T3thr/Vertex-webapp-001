// src/backend/models/ActivityHistory.ts
// โมเดลประวัติกิจกรรมผู้ใช้ (ActivityHistory Model) - อัปเกรดสำหรับแพลตฟอร์ม DivWy
// บันทึกกิจกรรมต่างๆ ที่ผู้ใช้ทำบนแพลตฟอร์ม DivWy เพื่อการวิเคราะห์, การแสดงผล, และการตรวจสอบ

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IUser } from "./User"; // สำหรับ userId
import { INovel } from "./Novel"; // สำหรับ novelId
import { IEpisode } from "./Episode"; // สำหรับ episodeId
import { IComment } from "./Comment"; // สำหรับ commentId
import { IPurchase } from "./Purchase"; // สำหรับ purchaseId
import { IDonation } from "./Donation"; // สำหรับ donationId
import { IPayment } from "./Payment"; // สำหรับ paymentId
import { IContentReport } from "./ContentReport"; // สำหรับ contentReportId
import { IBoard } from "./Board"; // << เพิ่ม: import IBoard สำหรับการอ้างอิง

// Achievement และ Badge ไม่จำเป็นต้อง import โดยตรง เว้นแต่จะมีการอ้างอิงใน details แบบเฉพาะเจาะจงมากๆ

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล ActivityHistory
// ==================================================================================================

/**
 * @enum {string} ActivityCategory
 * @description หมวดหมู่หลักของกิจกรรม เพื่อช่วยในการจัดกลุ่มและ Query
 */
export enum ActivityCategory {
  AUTHENTICATION = "Authentication",
  PROFILE = "Profile",
  CONTENT_INTERACTION = "ContentInteraction",
  CONTENT_CREATION = "ContentCreation",
  MONETIZATION = "Monetization",
  SOCIAL = "Social",
  SETTINGS = "Settings",
  GAMIFICATION = "Gamification",
  MODERATION = "Moderation",
  SYSTEM = "System", // กิจกรรมที่เกิดจากระบบโดยตรง
  OTHER = "Other",
}

/**
 * @enum {string} ActivityType
 * @description ประเภทของกิจกรรมที่เกิดขึ้น (ขยายให้ครอบคลุมมากขึ้น)
 */
export enum ActivityType {
  // Authentication
  USER_LOGIN = "USER_LOGIN",
  USER_LOGOUT = "USER_LOGOUT",
  USER_REGISTERED = "USER_REGISTERED",
  PASSWORD_CHANGED = "PASSWORD_CHANGED",
  PASSWORD_RESET_REQUESTED = "PASSWORD_RESET_REQUESTED",
  EMAIL_VERIFIED = "EMAIL_VERIFIED",
  VERIFICATION_EMAIL_SENT = "VERIFICATION_EMAIL_SENT",

  // Profile
  PROFILE_UPDATED = "PROFILE_UPDATED",
  AVATAR_CHANGED = "AVATAR_CHANGED",
  PENNAME_CREATED = "PENNAME_CREATED",
  PENNAME_UPDATED = "PENNAME_UPDATED",
  PROFILE_VIEWED = "PROFILE_VIEWED",

  // Monetization
  COINS_PURCHASED = "COINS_PURCHASED",
  COINS_SPENT_ON_EPISODE = "COINS_SPENT_ON_EPISODE",
  COINS_SPENT_ON_DONATION = "COINS_SPENT_ON_DONATION",
  DONATION_MADE = "DONATION_MADE",
  EARNINGS_WITHDRAWN = "EARNINGS_WITHDRAWN",
  PAYMENT_METHOD_ADDED = "PAYMENT_METHOD_ADDED",
  PURCHASE_REFUNDED = "PURCHASE_REFUNDED",

  // Content Creation
  NOVEL_CREATED = "NOVEL_CREATED",
  NOVEL_UPDATED = "NOVEL_UPDATED",
  NOVEL_DELETED = "NOVEL_DELETED",
  NOVEL_PUBLISHED = "NOVEL_PUBLISHED",
  NOVEL_EPISODE_CREATED = "NOVEL_EPISODE_CREATED",
  NOVEL_EPISODE_UPDATED = "NOVEL_EPISODE_UPDATED",
  NOVEL_EPISODE_DELETED = "NOVEL_EPISODE_DELETED",
  NOVEL_EPISODE_PUBLISHED = "NOVEL_EPISODE_PUBLISHED",
  COMMENT_POSTED = "COMMENT_POSTED",
  COMMENT_EDITED = "COMMENT_EDITED",
  COMMENT_DELETED = "COMMENT_DELETED",
  BOARD_POST_CREATED = "BOARD_POST_CREATED", // << เพิ่ม: สร้างกระทู้ใหม่
  BOARD_POST_EDITED = "BOARD_POST_EDITED",   // << เพิ่ม: แก้ไขกระทู้

  // Content Interaction
  NOVEL_VIEWED = "NOVEL_VIEWED",
  NOVEL_EPISODE_READ_STARTED = "NOVEL_EPISODE_READ_STARTED",
  NOVEL_EPISODE_READ_COMPLETED = "NOVEL_EPISODE_READ_COMPLETED",
  NOVEL_ADDED_TO_LIBRARY = "NOVEL_ADDED_TO_LIBRARY",
  NOVEL_REMOVED_FROM_LIBRARY = "NOVEL_REMOVED_FROM_LIBRARY",
  NOVEL_RATED = "NOVEL_RATED",
  COMMENT_LIKED = "COMMENT_LIKED",
  COMMENT_UNLIKED = "COMMENT_UNLIKED",
  CONTENT_REPORTED = "CONTENT_REPORTED",
  NOVEL_SHARED = "NOVEL_SHARED",
  BOARD_POST_VIEWED = "BOARD_POST_VIEWED",     // << เพิ่ม: การเข้าดูกระทู้
  BOARD_POST_LIKED = "BOARD_POST_LIKED",       // << เพิ่ม: การกดไลค์กระทู้
  BOARD_POST_UNLIKED = "BOARD_POST_UNLIKED",   // << เพิ่ม: การยกเลิกไลค์กระทู้
  BOARD_POST_REPLIED = "BOARD_POST_REPLIED",   // << เพิ่ม: การตอบกระทู้ (คือการสร้าง Comment แต่ context เป็น Board)
  BOARD_POLL_VOTED = "BOARD_POLL_VOTED",       // << เพิ่ม: การโหวตในโพล
  BOARD_SHARED = "BOARD_SHARED",               // << เพิ่ม: การแชร์กระทู้
  BOARD_SUBSCRIBED = "BOARD_SUBSCRIBED",       // << เพิ่ม: การติดตามกระทู้
  BOARD_UNSUBSCRIBED = "BOARD_UNSUBSCRIBED",   // << เพิ่ม: การเลิกติดตามกระทู้

  // Social
  USER_FOLLOWED = "USER_FOLLOWED",
  USER_UNFOLLOWED = "USER_UNFOLLOWED",
  
  // Gamification
  ACHIEVEMENT_UNLOCKED = "ACHIEVEMENT_UNLOCKED",
  BADGE_EARNED = "BADGE_EARNED",
  LEVEL_UP = "LEVEL_UP",
  XP_GAINED = "XP_GAINED",
  BEST_ANSWER_MARKED = "BEST_ANSWER_MARKED", // << เพิ่ม: ถูกเลือกเป็นคำตอบที่ดีที่สุด

  // Settings
  USER_PREFERENCES_UPDATED = "USER_PREFERENCES_UPDATED",
  NOTIFICATION_SETTINGS_UPDATED = "NOTIFICATION_SETTINGS_UPDATED",
  
  // Moderation
  USER_BANNED = "USER_BANNED",
  USER_WARNED = "USER_WARNED",
  CONTENT_REMOVED_BY_MODERATOR = "CONTENT_REMOVED_BY_MODERATOR",
  REPORT_REVIEWED = "REPORT_REVIEWED",
  BOARD_STATUS_CHANGED_BY_MODERATOR = "BOARD_STATUS_CHANGED_BY_MODERATOR", // << เพิ่ม: Moderator เปลี่ยนสถานะกระทู้ (lock, pin, hide)
  BOARD_DELETED_BY_MODERATOR = "BOARD_DELETED_BY_MODERATOR",               // << เพิ่ม: Moderator ลบกระทู้
  BOARD_POST_DELETED_BY_AUTHOR = "BOARD_POST_DELETED_BY_AUTHOR",           // << เพิ่ม: เจ้าของลบกระทู้เอง
}


/**
 * @interface IActivityDetails
 * @description รายละเอียดเพิ่มเติมของกิจกรรม (โครงสร้างยืดหยุ่น)
 * ควรเก็บข้อมูลที่จำเป็นสำหรับการแสดงผลหรือการวิเคราะห์ โดยไม่ต้อง query จากที่อื่นซ้ำ
 */
export interface IActivityDetails {
  // Common
  ipAddress?: string;
  userAgent?: string;
  reason?: string; 

  // Context-specific IDs
  novelId?: string | Types.ObjectId;
  episodeId?: string | Types.ObjectId;
  commentId?: string | Types.ObjectId;
  targetUserId?: string | Types.ObjectId; 
  purchaseId?: string | Types.ObjectId;
  donationId?: string | Types.ObjectId;
  paymentId?: string | Types.ObjectId;
  reportId?: string | Types.ObjectId;
  achievementId?: string | Types.ObjectId;
  badgeId?: string | Types.ObjectId;
  boardId?: string | Types.ObjectId; // << เพิ่ม: ID ของกระทู้ที่เกี่ยวข้อง
  categoryId?: string | Types.ObjectId; // << เพิ่ม: ID ของหมวดหมู่ (สำหรับ Board, Novel)

  // Denormalized data for display
  novelTitle?: string;
  novelSlug?: string;
  novelGenreId?: string;
  novelGenreSlug?: string;
  episodeTitle?: string;
  commentContent?: string; 
  targetUsername?: string;
  achievementName?: string;
  badgeName?: string;
  boardTitle?: string;  // << เพิ่ม: หัวข้อกระทู้
  boardSlug?: string;   // << เพิ่ม: Slug ของกระทู้
  boardType?: string;   // << เพิ่ม: ประเภทของกระทู้ (จาก BoardType enum)
  
  // Value-related details
  amount?: number; 
  currency?: string;
  ratingValue?: number; 
  xpGained?: number; 
  level?: number; 
  pollOptionId?: string; // << เพิ่ม: ID ของตัวเลือกโพลที่โหวต
  pollOptionText?: string; // << เพิ่ม: ข้อความของตัวเลือกโพลที่โหวต

  // Change details
  changedFields?: string[];
  previousValue?: any;
  newValue?: any;

  // Moderation details
  moderatorId?: string | Types.ObjectId;
  moderatorUsername?: string;
  actionTaken?: string;
  newStatus?: string; // << เพิ่ม: สถานะใหม่ของกระทู้ (e.g., 'LOCKED', 'PINNED')
  previousStatus?: string; // << เพิ่ม: สถานะเดิมของกระทู้
}


/**
 * @interface IActivityHistory
 * @description โครงสร้างข้อมูลหลักสำหรับเอกสารประวัติกิจกรรม
 */
export interface IActivityHistory extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId | IUser; // ผู้ใช้ที่ทำให้เกิดกิจกรรม
  activityType: ActivityType; // ประเภทของกิจกรรม
  activityCategory: ActivityCategory; // หมวดหมู่ของกิจกรรม
  description: string; // คำอธิบายกิจกรรม (สำหรับแสดงผลเร็วๆ)
  relatedEntityType?: "Novel" | "Episode" | "User" | "Comment" | "Purchase" | "Donation" | "Payment" | "Report" | "Board"; // << เพิ่ม "Board"
  relatedEntityId?: Types.ObjectId; // ID ของเอกสารที่เกี่ยวข้อง
  details?: IActivityDetails; // ข้อมูลเพิ่มเติมเกี่ยวกับกิจกรรม
  createdAt: Date;
}

// ==================================================================================================
// SECTION: Schema ของ Mongoose
// ==================================================================================================

const ActivityHistorySchema = new Schema<IActivityHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    activityType: { type: String, enum: Object.values(ActivityType), required: true, index: true },
    activityCategory: { type: String, enum: Object.values(ActivityCategory), required: true, index: true },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    relatedEntityType: { type: String, enum: ["Novel", "Episode", "User", "Comment", "Purchase", "Donation", "Payment", "Report", "Board"] },
    relatedEntityId: { type: Schema.Types.ObjectId, index: true, sparse: true },
    details: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now, expires: "2y", index: true }, // ข้อมูลจะถูกลบอัตโนมัติหลัง 2 ปี
  },
  {
    timestamps: { updatedAt: false }, // เราสนใจแค่ createdAt
    collection: "activity_histories",
  }
);


// ==================================================================================================
// SECTION: Helper Functions และ Middleware
// ==================================================================================================

/**
 * @function getActivityCategory
 * @description ฟังก์ชัน Helper เพื่อหาหมวดหมู่ที่ถูกต้องจากประเภทกิจกรรม
 * @param {ActivityType} type - ประเภทของกิจกรรม
 * @returns {ActivityCategory} - หมวดหมู่ของกิจกรรม
 */
export const getActivityCategory = (type: ActivityType): ActivityCategory => {
  const typeString = type.toString();

  if (typeString.startsWith("USER_") && !typeString.startsWith("USER_PREFERENCES_")) return ActivityCategory.AUTHENTICATION;
  if (typeString.startsWith("PROFILE_")) return ActivityCategory.PROFILE;
  if (typeString.startsWith("COINS_") || typeString.startsWith("DONATION_") || typeString.startsWith("EARNINGS_") || typeString.startsWith("PAYMENT_") || typeString.startsWith("PURCHASE_")) return ActivityCategory.MONETIZATION;
  if (typeString.startsWith("NOVEL_CREATED") || typeString.startsWith("NOVEL_UPDATED") || typeString.startsWith("NOVEL_DELETED") || typeString.startsWith("NOVEL_PUBLISHED") || typeString.startsWith("NOVEL_EPISODE_") || typeString.startsWith("COMMENT_POSTED") || typeString.startsWith("COMMENT_EDITED")) return ActivityCategory.CONTENT_CREATION;
  if (typeString.startsWith("NOVEL_VIEWED") || typeString.startsWith("NOVEL_ADDED") || typeString.startsWith("NOVEL_REMOVED") || typeString.startsWith("NOVEL_RATED") || typeString.startsWith("COMMENT_LIKED") || typeString.startsWith("COMMENT_UNLIKED") || typeString.startsWith("CONTENT_REPORTED") || typeString.startsWith("NOVEL_SHARED")) return ActivityCategory.CONTENT_INTERACTION;
  if (typeString.startsWith("ACHIEVEMENT_") || typeString.startsWith("BADGE_") || typeString.startsWith("LEVEL_") || typeString.startsWith("XP_")) return ActivityCategory.GAMIFICATION;
  if (typeString.endsWith("_SETTINGS_UPDATED") || typeString.startsWith("USER_PREFERENCES_")) return ActivityCategory.SETTINGS;
  if (typeString.includes("_BY_MODERATOR") || typeString.startsWith("REPORT_")) return ActivityCategory.MODERATION;
  
  // << เพิ่ม: การจัดหมวดหมู่สำหรับ Board
  if (typeString.startsWith("BOARD_POST_CREATED") || typeString.startsWith("BOARD_POST_EDITED")) return ActivityCategory.CONTENT_CREATION;
  if (typeString.startsWith("BOARD_POST_VIEWED") || typeString.startsWith("BOARD_POST_LIKED") || typeString.startsWith("BOARD_POST_UNLIKED") || typeString.startsWith("BOARD_POLL_VOTED") || typeString.startsWith("BOARD_SHARED")) return ActivityCategory.CONTENT_INTERACTION;
  if (typeString.startsWith("BOARD_SUBSCRIBED") || typeString.startsWith("BOARD_UNSUBSCRIBED") || typeString.startsWith("USER_FOLLOWED") || typeString.startsWith("USER_UNFOLLOWED") || typeString.startsWith("BOARD_POST_REPLIED")) return ActivityCategory.SOCIAL;
  if (typeString.startsWith("BEST_ANSWER_MARKED")) return ActivityCategory.GAMIFICATION; // การให้รางวัลเป็น Gamification
  if (typeString.startsWith("BOARD_POST_DELETED_BY_AUTHOR")) return ActivityCategory.CONTENT_INTERACTION;


  // Fallback switch for specific cases not covered by prefixes
  switch(type) {
    case ActivityType.USER_FOLLOWED:
    case ActivityType.USER_UNFOLLOWED:
      return ActivityCategory.SOCIAL;
    default:
      return ActivityCategory.OTHER;
  }
};


// Pre-save hook เพื่อกำหนด activityCategory โดยอัตโนมัติ
ActivityHistorySchema.pre<IActivityHistory>("save", function (next) {
  if (this.isNew || this.isModified("activityType")) {
    this.activityCategory = getActivityCategory(this.activityType);
  }
  next();
});

// ==================================================================================================
// SECTION: Model Export
// ==================================================================================================

const ActivityHistoryModel = (models.ActivityHistory as mongoose.Model<IActivityHistory>) || model<IActivityHistory>("ActivityHistory", ActivityHistorySchema);

export default ActivityHistoryModel;


// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการใช้งาน (Notes and Usage Guide)
// ==================================================================================================
// 1.  **การสร้าง Activity Log**: ควรสร้าง Activity Log ผ่าน Service Layer เพื่อจัดการ Logic และรวบรวมข้อมูล `details` ให้ครบถ้วนก่อนบันทึก
//     ตัวอย่าง: `ActivityService.logActivity(userId, ActivityType.NOVEL_CREATED, { novelId: '...', novelTitle: '...' })`
// 2.  **ความสำคัญของ `details`**: `details` เป็นส่วนที่สำคัญมากสำหรับการแสดงผลในหน้า "ประวัติกิจกรรมของฉัน" หรือ "ฟีดข่าว"
//     การ Denormalize ข้อมูลที่จำเป็น เช่น `novelTitle`, `targetUsername` จะช่วยลดการ query ที่ซับซ้อนและเพิ่มความเร็วในการโหลดข้อมูลได้อย่างมหาศาล
// 3.  **การรวมกับ Board.ts**:
//     -   **สร้างกระทู้ (`BOARD_POST_CREATED`)**: เมื่อมีการสร้าง Board ใหม่ ใน `Board.ts` post-save hook ควรเรียกใช้ Service เพื่อสร้าง log นี้
//         `details` ควรมี: `boardId`, `boardTitle`, `boardSlug`, `boardType`, `categoryId`, และ `novelId` (ถ้ามี)
//     -   **ตอบกระทู้ (`BOARD_POST_REPLIED`)**: เมื่อมีการสร้าง Comment บน Board, Comment service ควร log กิจกรรมนี้
//         `details` ควรมี: `boardId`, `boardTitle`, `boardSlug`, และ `commentId`
//     -   **กดไลค์ (`BOARD_POST_LIKED`)**: เมื่อมีการกดไลค์ Board, Like service ควร log กิจกรรมนี้
//         `details` ควรมี: `boardId`, `boardTitle`, `boardSlug`
//     -   **การกระทำของ Moderator (`BOARD_STATUS_CHANGED_BY_MODERATOR`)**: เมื่อ Moderator ทำการล็อก, ปักหมุด, หรือซ่อนกระทู้
//         `details` ควรมี: `boardId`, `boardTitle`, `moderatorId`, `moderatorUsername`, `previousStatus`, `newStatus`, และ `reason`
// 4.  **Data Pruning**: Schema ตั้งค่า `expires` เป็น "2y" หมายความว่า MongoDB จะลบเอกสารที่เก่ากว่า 2 ปีโดยอัตโนมัติ
//     ซึ่งเป็นกลยุทธ์ที่ดีในการจัดการขนาดของ collection ไม่ให้ใหญ่เกินไป หากต้องการเก็บข้อมูลไว้นานกว่านี้ ควรพิจารณา Archive ข้อมูลไปยัง Cold Storage
// 5.  **Gamification**: กิจกรรมหลายอย่าง เช่น `NOVEL_EPISODE_READ_COMPLETED` หรือ `BEST_ANSWER_MARKED`
//     สามารถใช้เป็น trigger สำหรับ Gamification Service ได้ และ `details` ควรมีข้อมูลที่เพียงพอสำหรับ Gamification Service.
//     การเพิ่ม `details.novelGenreId` และ `details.novelGenreSlug` ใน `NOVEL_EPISODE_READ_COMPLETED` event
//     มีประโยชน์อย่างมากสำหรับ Gamification Service ในการตรวจสอบ Achievement "อ่านนิยายหมวดหมู่หลักครบตามรอบกำหนด".
// 6.  **Consistency**: ควรมีมาตรฐานที่ชัดเจนในการตั้งชื่อ `ActivityType` และการจัดโครงสร้าง `details` เพื่อให้ง่ายต่อการพัฒนาและบำรุงรักษาในระยะยาว
// ==================================================================================================