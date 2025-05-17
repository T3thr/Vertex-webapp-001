// src/backend/models/ActivityHistory_upgraded.ts
// โมเดลประวัติกิจกรรมผู้ใช้ (ActivityHistory Model) - อัปเกรดสำหรับแพลตฟอร์ม NovelMaze
// บันทึกกิจกรรมต่างๆ ที่ผู้ใช้ทำบนแพลตฟอร์ม NovelMaze เพื่อการวิเคราะห์, การแสดงผล, และการตรวจสอบ
// อัปเกรดจาก ActivityHistory.ts เดิม โดยเพิ่มรายละเอียด, Type Safety, คอมเมนต์ภาษาไทย, Indexes, และปรับปรุงตามมาตรฐาน NovelMaze

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IUser } from "./User_upgraded"; // สำหรับ userId
import { INovel } from "./Novel_upgraded"; // สำหรับ relatedNovelId
import { IEpisode } from "./Episode_upgraded"; // สำหรับ relatedEpisodeId
import { IComment } from "./Comment_upgraded"; // สำหรับ relatedCommentId
import { IPurchase } from "./Purchase_upgraded"; // สำหรับ relatedPurchaseId
import { IDonation } from "./Donation_upgraded"; // สำหรับ relatedDonationId
import { IPayment } from "./Payment_upgraded"; // สำหรับ relatedPaymentId
import { IContentReport } from "./ContentReport_upgraded"; // สำหรับ relatedContentReportId

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล ActivityHistory
// ==================================================================================================

/**
 * @enum {string} ActivityCategory
 * @description หมวดหมู่หลักของกิจกรรม เพื่อช่วยในการจัดกลุ่มและ Query
 */
export enum ActivityCategory {
  AUTHENTICATION = "Authentication", // การยืนยันตัวตนและเซสชัน
  PROFILE = "Profile",             // การจัดการโปรไฟล์
  CONTENT_INTERACTION = "ContentInteraction", // การโต้ตอบกับเนื้อหา (นิยาย, ตอน, คอมเมนต์)
  CONTENT_CREATION = "ContentCreation",   // การสร้างเนื้อหา (สำหรับนักเขียน)
  MONETIZATION = "Monetization",       // การสร้างรายได้และการใช้จ่าย
  SOCIAL = "Social",               // กิจกรรมทางสังคม (ติดตาม, ข้อความ)
  SETTINGS = "Settings",             // การตั้งค่าต่างๆ
  OTHER = "Other",                 // อื่นๆ
}

/**
 * @enum {string} ActivityType
 * @description ประเภทของกิจกรรมที่ผู้ใช้ทำบนแพลตฟอร์ม (ขยายให้ครอบคลุมและชัดเจนขึ้น)
 */
export enum ActivityType {
  // --- Authentication & Session (Category: AUTHENTICATION) ---
  USER_REGISTERED = "user_registered",                 // สมัครสมาชิกใหม่
  USER_LOGIN_SUCCESS = "user_login_success",             // ล็อกอินสำเร็จ
  USER_LOGIN_FAILURE = "user_login_failure",             // ล็อกอินล้มเหลว (ระบุเหตุผลใน details)
  USER_LOGOUT = "user_logout",                       // ออกจากระบบ
  USER_PASSWORD_RESET_REQUESTED = "user_password_reset_requested", // ขอรีเซ็ตรหัสผ่าน
  USER_PASSWORD_RESET_COMPLETED = "user_password_reset_completed", // รีเซ็ตรหัสผ่านสำเร็จ
  USER_EMAIL_VERIFICATION_SENT = "user_email_verification_sent", // ส่งอีเมลยืนยัน
  USER_EMAIL_VERIFIED = "user_email_verified",             // ยืนยันอีเมลสำเร็จ
  USER_SESSION_REFRESHED = "user_session_refreshed",       // รีเฟรชเซสชัน

  // --- Profile Management (Category: PROFILE) ---
  USER_PROFILE_UPDATED = "user_profile_updated",           // อัปเดตโปรไฟล์ส่วนตัว (เช่น displayName, bio)
  USER_PASSWORD_CHANGED = "user_password_changed",          // เปลี่ยนรหัสผ่าน
  USER_AVATAR_UPDATED = "user_avatar_updated",            // อัปเดต Avatar
  USER_COVER_IMAGE_UPDATED = "user_cover_image_updated",   // อัปเดต Cover Image
  USER_ACCOUNT_SETTINGS_UPDATED = "user_account_settings_updated", // อัปเดตการตั้งค่าบัญชี (เช่น notification preferences)
  USER_LINKED_SOCIAL_ACCOUNT = "user_linked_social_account", // เชื่อมต่อบัญชีโซเชียล
  USER_UNLINKED_SOCIAL_ACCOUNT = "user_unlinked_social_account", // ยกเลิกการเชื่อมต่อบัญชีโซเชียล

  // --- Content Interaction (Category: CONTENT_INTERACTION) ---
  NOVEL_VIEWED_DETAILS = "novel_viewed_details",         // ดูรายละเอียดนิยาย
  NOVEL_EPISODE_READ = "novel_episode_read",             // อ่านตอนนิยาย (อาจมี progress)
  NOVEL_LIKED = "novel_liked",                       // กดถูกใจนิยาย
  NOVEL_UNLIKED = "novel_unliked",                     // เลิกถูกใจนิยาย
  NOVEL_FOLLOWED = "novel_followed",                   // ติดตามนิยาย
  NOVEL_UNFOLLOWED = "novel_unfollowed",                 // เลิกติดตามนิยาย
  NOVEL_RATED = "novel_rated",                       // ให้คะแนนนิยาย
  NOVEL_SHARED = "novel_shared",                     // แชร์นิยาย (เช่น ไปยังโซเชียลมีเดีย)
  COMMENT_POSTED = "comment_posted",                   // โพสต์ความคิดเห็น (ในนิยาย/ตอน)
  COMMENT_UPDATED = "comment_updated",                 // แก้ไขความคิดเห็น
  COMMENT_DELETED = "comment_deleted",                 // ลบความคิดเห็น
  COMMENT_LIKED = "comment_liked",                     // กดถูกใจความคิดเห็น
  COMMENT_UNLIKED = "comment_unliked",                   // เลิกถูกใจความคิดเห็น
  COMMENT_REPLIED = "comment_replied",                   // ตอบกลับความคิดเห็น
  LIBRARY_ITEM_ADDED = "library_item_added",             // เพิ่มนิยายเข้าคลัง (ระบุสถานะ เช่น reading, wishlisted)
  LIBRARY_ITEM_REMOVED = "library_item_removed",           // ลบนิยายออกจากคลัง
  LIBRARY_ITEM_STATUS_UPDATED = "library_item_status_updated", // อัปเดตสถานะในคลัง (เช่น จาก wishlisted เป็น reading)
  EPISODE_PURCHASED = "episode_purchased",             // ซื้อตอนนิยาย (ปลดล็อคตอน)
  NOVEL_PURCHASED = "novel_purchased",                 // ซื้อนิยายทั้งเรื่อง (ถ้ามีระบบนี้)

  // --- Content Creation (Category: CONTENT_CREATION) - สำหรับนักเขียน ---
  WRITER_NOVEL_CREATED = "writer_novel_created",           // นักเขียนสร้างนิยายใหม่
  WRITER_NOVEL_INFO_UPDATED = "writer_novel_info_updated",   // นักเขียนอัปเดตข้อมูลนิยาย
  WRITER_NOVEL_PUBLISHED = "writer_novel_published",         // นักเขียนเผยแพร่นิยาย
  WRITER_NOVEL_UNPUBLISHED = "writer_novel_unpublished",       // นักเขียนยกเลิกการเผยแพร่นิยาย
  WRITER_NOVEL_DELETED = "writer_novel_deleted",           // นักเขียนลบนิยาย
  WRITER_EPISODE_CREATED = "writer_episode_created",         // นักเขียนสร้างตอนใหม่
  WRITER_EPISODE_UPDATED = "writer_episode_updated",         // นักเขียนอัปเดตตอน
  WRITER_EPISODE_PUBLISHED = "writer_episode_published",       // นักเขียนเผยแพร่ตอน
  WRITER_EPISODE_UNPUBLISHED = "writer_episode_unpublished",     // นักเขียนยกเลิกการเผยแพร่ตอน
  WRITER_EPISODE_DELETED = "writer_episode_deleted",         // นักเขียนลบตอน
  WRITER_APPLICATION_SUBMITTED = "writer_application_submitted", // สมัครเป็นนักเขียน
  WRITER_DONATION_APPLICATION_SUBMITTED = "writer_donation_application_submitted", // สมัครขอเปิดรับบริจาค
  WRITER_VIEWED_EARNING_STATS = "writer_viewed_earning_stats", // นักเขียนดูสถิติรายได้
  WRITER_REQUESTED_PAYOUT = "writer_requested_payout",     // นักเขียนขอเบิกเงิน

  // --- Monetization (Category: MONETIZATION) ---
  USER_COIN_PACKAGE_PURCHASED = "user_coin_package_purchased", // ซื้อแพ็กเกจเหรียญ
  USER_DONATED_TO_WRITER = "user_donated_to_writer",       // บริจาคให้นักเขียน
  USER_REDEEMED_VOUCHER = "user_redeemed_voucher",         // ใช้ Voucher/Promo Code
  USER_CLAIMED_ACHIEVEMENT_REWARD = "user_claimed_achievement_reward", // รับรางวัลจาก Achievement (เช่น เหรียญ)

  // --- Social (Category: SOCIAL) ---
  USER_FOLLOWED_ANOTHER_USER = "user_followed_another_user", // ติดตามผู้ใช้อื่น
  USER_UNFOLLOWED_ANOTHER_USER = "user_unfollowed_another_user", // เลิกติดตามผู้ใช้อื่น
  USER_SENT_PRIVATE_MESSAGE = "user_sent_private_message",   // ส่งข้อความส่วนตัว (ถ้ามี)
  USER_RECEIVED_PRIVATE_MESSAGE = "user_received_private_message", // ได้รับข้อความส่วนตัว (ถ้ามี)
  USER_JOINED_COMMUNITY_GROUP = "user_joined_community_group", // เข้าร่วมกลุ่ม (ถ้ามี)
  USER_LEFT_COMMUNITY_GROUP = "user_left_community_group",   // ออกจากกลุ่ม (ถ้ามี)

  // --- Settings & Others (Category: SETTINGS / OTHER) ---
  USER_NOTIFICATION_SETTINGS_UPDATED = "user_notification_settings_updated", // อัปเดตการตั้งค่าการแจ้งเตือน
  USER_PRIVACY_SETTINGS_UPDATED = "user_privacy_settings_updated",     // อัปเดตการตั้งค่าความเป็นส่วนตัว
  USER_SUBMITTED_CONTENT_REPORT = "user_submitted_content_report",   // รายงานเนื้อหา/ผู้ใช้
  USER_SEARCHED_CONTENT = "user_searched_content",           // ค้นหาเนื้อหา (เก็บ query ใน details)
  USER_VIEWED_NOTIFICATION = "user_viewed_notification",       // ผู้ใช้เปิดดูการแจ้งเตือน
  OTHER_USER_ACTIVITY = "other_user_activity",             // กิจกรรมอื่นๆ ที่ไม่เข้าพวก
}

/**
 * @interface IActivityDetails
 * @description โครงสร้างข้อมูลเพิ่มเติมสำหรับแต่ละประเภทกิจกรรม (ยืดหยุ่น)
 *              ตัวอย่าง:
 *              - `novel_episode_read`: { progressPercent: number, durationSeconds: number, deviceType: string }
 *              - `user_profile_updated`: { updatedFields: string[], previousValues?: Record<string, any> }
 *              - `user_login_failure`: { reason: string, attemptCount: number }
 *              - `user_searched_content`: { query: string, resultCount: number, filters?: any }
 */
export interface IActivityDetails extends Record<string, any> {}

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร ActivityHistory (IActivityHistory Document Interface)
// ==================================================================================================

/**
 * @interface IActivityHistory
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารประวัติกิจกรรมผู้ใช้ใน Collection "activityhistories"
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสาร
 * @property {Types.ObjectId | IUser} userId - ID ของผู้ใช้ที่ทำกิจกรรม (**จำเป็น**, อ้างอิง User model)
 * @property {ActivityType} activityType - ประเภทของกิจกรรม (**จำเป็น**)
 * @property {ActivityCategory} activityCategory - หมวดหมู่ของกิจกรรม (ได้มาจาก activityType, **จำเป็น**)
 * @property {string} [description] - (Optional) คำอธิบายกิจกรรมที่สร้างโดยระบบ (human-readable, อาจจะ template-based)
 * @property {Types.ObjectId | INovel} [novelId] - (Optional) ID ของนิยายที่เกี่ยวข้อง
 * @property {Types.ObjectId | IEpisode} [episodeId] - (Optional) ID ของตอนที่เกี่ยวข้อง
 * @property {Types.ObjectId | IComment} [commentId] - (Optional) ID ของความคิดเห็นที่เกี่ยวข้อง
 * @property {Types.ObjectId | IUser} [targetUserId] - (Optional) ID ของผู้ใช้เป้าหมาย (เช่น ผู้ใช้ที่ถูกติดตาม, ผู้รับบริจาค)
 * @property {Types.ObjectId | IPurchase} [purchaseId] - (Optional) ID ของการซื้อที่เกี่ยวข้อง
 * @property {Types.ObjectId | IDonation} [donationId] - (Optional) ID ของการบริจาคที่เกี่ยวข้อง
 * @property {Types.ObjectId | IPayment} [paymentId] - (Optional) ID ของการชำระเงินที่เกี่ยวข้อง
 * @property {Types.ObjectId | IContentReport} [contentReportId] - (Optional) ID ของรายงานเนื้อหาที่เกี่ยวข้อง
 * @property {string} [relatedEntityType] - (Optional) ชื่อ Model ของ Entity อื่นๆ ที่เกี่ยวข้อง (ถ้ามีนอกเหนือจากที่ระบุ)
 * @property {Types.ObjectId | string} [relatedEntityId] - (Optional) ID ของ Entity อื่นๆ ที่เกี่ยวข้อง
 * @property {IActivityDetails} [details] - (Optional) รายละเอียดเพิ่มเติมเฉพาะของกิจกรรมนั้นๆ
 * @property {string} [ipAddress] - (Optional) IP Address ของผู้ใช้ (ควร Hash หรือ Anonymize บางส่วนเพื่อความเป็นส่วนตัว)
 * @property {string} [userAgent] - (Optional) User Agent ของ browser/client
 * @property {string} [deviceType] - (Optional) ประเภทอุปกรณ์ (เช่น "desktop", "mobile", "tablet")
 * @property {string} [appVersion] - (Optional) เวอร์ชันของแอปพลิเคชัน (ถ้ามี)
 * @property {Date} timestamp - เวลาที่เกิดกิจกรรม (**จำเป็น**, default: `Date.now`)
 * @property {number} schemaVersion - เวอร์ชันของ schema (default: 1)
 * @property {Date} createdAt - วันที่สร้างเอกสาร (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตเอกสารล่าสุด (Mongoose `timestamps`)
 */
export interface IActivityHistory extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId | IUser;
  activityType: ActivityType;
  activityCategory: ActivityCategory;
  description?: string;
  novelId?: Types.ObjectId | INovel;
  episodeId?: Types.ObjectId | IEpisode;
  commentId?: Types.ObjectId | IComment;
  targetUserId?: Types.ObjectId | IUser;
  purchaseId?: Types.ObjectId | IPurchase;
  donationId?: Types.ObjectId | IDonation;
  paymentId?: Types.ObjectId | IPayment;
  contentReportId?: Types.ObjectId | IContentReport;
  relatedEntityType?: string;
  relatedEntityId?: Types.ObjectId | string;
  details?: IActivityDetails;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  appVersion?: string;
  timestamp: Date;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ ActivityHistory (ActivityHistorySchema)
// ==================================================================================================
const ActivityHistorySchema = new Schema<IActivityHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุ ID ของผู้ใช้ (User ID is required)"],
      index: true,
    },
    activityType: {
      type: String,
      enum: Object.values(ActivityType),
      required: [true, "กรุณาระบุประเภทกิจกรรม (Activity type is required)"],
      index: true,
    },
    activityCategory: {
      type: String,
      enum: Object.values(ActivityCategory),
      required: [true, "กรุณาระบุหมวดหมู่กิจกรรม (Activity category is required)"],
      index: true,
    },
    description: { type: String, trim: true, maxlength: [1000, "คำอธิบายกิจกรรมต้องไม่เกิน 1000 ตัวอักษร"] },
    novelId: { type: Schema.Types.ObjectId, ref: "Novel", index: true, sparse: true },
    episodeId: { type: Schema.Types.ObjectId, ref: "Episode", index: true, sparse: true },
    commentId: { type: Schema.Types.ObjectId, ref: "Comment", index: true, sparse: true },
    targetUserId: { type: Schema.Types.ObjectId, ref: "User", index: true, sparse: true },
    purchaseId: { type: Schema.Types.ObjectId, ref: "Purchase", index: true, sparse: true },
    donationId: { type: Schema.Types.ObjectId, ref: "Donation", index: true, sparse: true },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", index: true, sparse: true },
    contentReportId: { type: Schema.Types.ObjectId, ref: "ContentReport", index: true, sparse: true },
    relatedEntityType: { type: String, trim: true, maxlength: 100 },
    relatedEntityId: { type: Schema.Types.Mixed, index: true, sparse: true }, // Can be ObjectId or String
    details: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, trim: true, maxlength: 100 }, // Store hashed/anonymized if needed
    userAgent: { type: String, trim: true, maxlength: 512 },
    deviceType: { type: String, trim: true, maxlength: 50 },
    appVersion: { type: String, trim: true, maxlength: 50 },
    timestamp: { type: Date, default: Date.now, required: true, index: true },
    schemaVersion: { type: Number, default: 1, min: 1 },
  },
  {
    timestamps: true, // createdAt, updatedAt
    collection: "activityhistories", // ชื่อ collection ที่เหมาะสม
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

// Index หลักสำหรับการ query กิจกรรมล่าสุดของผู้ใช้
ActivityHistorySchema.index({ userId: 1, timestamp: -1 }, { name: "ActivityHistoryByUserTimeIndex" });
// Index สำหรับการ query ตามประเภทและหมวดหมู่กิจกรรม
ActivityHistorySchema.index({ activityCategory: 1, activityType: 1, timestamp: -1 }, { name: "ActivityHistoryByTypeCategoryTimeIndex" });
// Index สำหรับกิจกรรมที่เกี่ยวข้องกับนิยาย
ActivityHistorySchema.index({ novelId: 1, activityType: 1, timestamp: -1 }, { sparse: true, name: "ActivityHistoryByNovelIndex" });
// Index สำหรับกิจกรรมที่เกี่ยวข้องกับตอน
ActivityHistorySchema.index({ episodeId: 1, activityType: 1, timestamp: -1 }, { sparse: true, name: "ActivityHistoryByEpisodeIndex" });
// Index สำหรับการค้นหาตาม IP Address (ถ้ามีการใช้งานบ่อย และคำนึงถึงความเป็นส่วนตัว)
ActivityHistorySchema.index({ ipAddress: 1, timestamp: -1 }, { sparse: true, name: "ActivityHistoryByIpAddressIndex" });

// ==================================================================================================
// SECTION: Helper Function (ฟังก์ชันช่วยในการกำหนด Category จาก Type)
// ==================================================================================================

/**
 * @function getActivityCategory
 * @description กำหนดหมวดหมู่ (ActivityCategory) โดยอัตโนมัติจากประเภทกิจกรรม (ActivityType)
 * @param {ActivityType} activityType - ประเภทของกิจกรรม
 * @returns {ActivityCategory} - หมวดหมู่ของกิจกรรม
 */
function getActivityCategory(activityType: ActivityType): ActivityCategory {
  if (activityType.startsWith("USER_REGISTERED") || activityType.startsWith("USER_LOGIN") || activityType.startsWith("USER_LOGOUT") || activityType.startsWith("USER_PASSWORD_RESET") || activityType.startsWith("USER_EMAIL_VERIF") || activityType.startsWith("USER_SESSION")) {
    return ActivityCategory.AUTHENTICATION;
  }
  if (activityType.startsWith("USER_PROFILE") || activityType.startsWith("USER_PASSWORD_CHANGED") || activityType.startsWith("USER_AVATAR") || activityType.startsWith("USER_COVER_IMAGE") || activityType.startsWith("USER_ACCOUNT_SETTINGS") || activityType.startsWith("USER_LINKED_SOCIAL") || activityType.startsWith("USER_UNLINKED_SOCIAL")) {
    return ActivityCategory.PROFILE;
  }
  if (activityType.startsWith("NOVEL_") || activityType.startsWith("COMMENT_") || activityType.startsWith("LIBRARY_ITEM_") || activityType.startsWith("EPISODE_PURCHASED")) {
    return ActivityCategory.CONTENT_INTERACTION;
  }
  if (activityType.startsWith("WRITER_")) {
    return ActivityCategory.CONTENT_CREATION;
  }
  if (activityType.startsWith("USER_COIN_PACKAGE") || activityType.startsWith("USER_DONATED") || activityType.startsWith("USER_REDEEMED_VOUCHER") || activityType.startsWith("USER_CLAIMED_ACHIEVEMENT_REWARD")) {
    return ActivityCategory.MONETIZATION;
  }
  if (activityType.startsWith("USER_FOLLOWED") || activityType.startsWith("USER_UNFOLLOWED") || activityType.startsWith("USER_SENT_PRIVATE") || activityType.startsWith("USER_RECEIVED_PRIVATE") || activityType.startsWith("USER_JOINED_COMMUNITY") || activityType.startsWith("USER_LEFT_COMMUNITY")) {
    return ActivityCategory.SOCIAL;
  }
  if (activityType.startsWith("USER_NOTIFICATION_SETTINGS") || activityType.startsWith("USER_PRIVACY_SETTINGS") || activityType.startsWith("USER_SUBMITTED_CONTENT_REPORT") || activityType.startsWith("USER_SEARCHED") || activityType.startsWith("USER_VIEWED_NOTIFICATION")) {
    return ActivityCategory.SETTINGS;
  }
  return ActivityCategory.OTHER;
}

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

// Middleware ก่อน save เพื่อกำหนด activityCategory โดยอัตโนมัติ
ActivityHistorySchema.pre<IActivityHistory>("save", function (next) {
  if (this.isModified("activityType") || this.isNew) {
    this.activityCategory = getActivityCategory(this.activityType);
  }
  next();
});

// Middleware `post("save")` (ตัวอย่าง - ควรพิจารณา performance impact)
// สามารถใช้ update `lastActiveAt` ของ User และนับจำนวน activity แต่ละประเภทได้
// แต่การ update สถิติที่ซับซ้อนมากๆ ควรแยกไปทำใน background job หรือ service อื่นเพื่อไม่ให้กระทบ performance การ save activity
ActivityHistorySchema.post<IActivityHistory>("save", async function(doc, next) {
  try {
    if (doc.userId) {
      const UserModel = models.User || model<IUser>("User"); // Ensure User model is available
      // Update last active timestamp for the user
      await UserModel.findByIdAndUpdate(doc.userId, { 
        "userProfile.lastActiveAt": doc.timestamp,
        // $inc: { [`userProfile.stats.activityCounts.${doc.activityType}`]: 1 } // Consider if this is too granular or impacts performance
      });

      // ตัวอย่างการอัปเดตสถิติอื่นๆ ที่ User model (ควรทำอย่างระมัดระวังเรื่อง performance)
      // if (doc.activityType === ActivityType.COMMENT_POSTED) {
      //   await UserModel.findByIdAndUpdate(doc.userId, { 
      //     $inc: { "userProfile.stats.totalCommentsPosted": 1 }
      //   });
      // }
    }
  } catch (error) {
    console.error("Error in ActivityHistory post-save hook:", error);
    // ไม่ควร throw error ที่นี่ เพราะจะทำให้ save operation หลัก fail
    // ควร log error และดำเนินการต่อ หรือมีระบบ retry ที่เหมาะสม
  }
  next();
});

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

// ตรวจสอบว่า Model "ActivityHistory" ถูกสร้างไปแล้วหรือยัง ถ้ายัง ให้สร้าง Model ใหม่
const ActivityHistoryModel =
  (models.ActivityHistory as mongoose.Model<IActivityHistory>) ||
  model<IActivityHistory>("ActivityHistory", ActivityHistorySchema);

export default ActivityHistoryModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Data Volume & Retention**: ActivityHistory สามารถมีขนาดใหญ่มาก ควรมีนโยบายการเก็บรักษาข้อมูล (Retention Policy)
//     เช่น เก็บ log ล่าสุด 6-12 เดือนใน hot storage และ archive log ที่เก่ากว่าไปยัง cold storage หรือทำการ aggregate.
// 2.  **Performance**: การเขียน ActivityHistory ไม่ควรส่งผลกระทบต่อ performance ของ critical path.
//     พิจารณาใช้ message queue (เช่น RabbitMQ, Kafka) สำหรับการเขียน log แบบ asynchronous หากระบบมี traffic สูงมาก.
// 3.  **Granularity of `details`**: `activityDetails` มีความยืดหยุ่นสูง แต่ควรมีการกำหนดโครงสร้างที่ชัดเจนสำหรับแต่ละ `activityType`
//     เพื่อให้ง่ายต่อการ query และวิเคราะห์ข้อมูลในภายหลัง (อาจจะสร้าง sub-interfaces สำหรับ details ของแต่ละ type).
// 4.  **Privacy**: `ipAddress` และ `userAgent` ควรจัดการอย่างระมัดระวังตามนโยบายความเป็นส่วนตัว (เช่น Anonymization, Hashing).
// 5.  **Use Cases**: ข้อมูลนี้สามารถใช้สำหรับ:
//     - แสดง "ประวัติกิจกรรมล่าสุด" ให้ผู้ใช้
//     - Admin ใช้ตรวจสอบพฤติกรรม
//     - ข้อมูลดิบสำหรับ Recommendation Engine
//     - ข้อมูลดิบสำหรับ Analytics (Reading, Earning, User Engagement)
//     - Triggering other system events (เช่น Achievements, Notifications)
// 6.  **Aggregation**: สำหรับการวิเคราะห์ที่ซับซ้อน อาจจะต้องมีการสร้าง aggregated views หรือ collections เป็นระยะ
//     เพื่อลดภาระในการ query collection ใหญ่โดยตรง.
// 7.  **Error Handling in Hooks**: การจัดการ error ใน Mongoose hooks (เช่น post-save) ควรทำอย่างระมัดระวัง
//     เพื่อไม่ให้กระทบต่อ operation หลัก และควรมีการ logging ที่ดี.
// ==================================================================================================
