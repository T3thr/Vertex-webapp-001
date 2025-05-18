// src/backend/models/ActivityHistory.ts
// โมเดลประวัติกิจกรรมผู้ใช้ (ActivityHistory Model) - อัปเกรดสำหรับแพลตฟอร์ม NovelMaze
// บันทึกกิจกรรมต่างๆ ที่ผู้ใช้ทำบนแพลตฟอร์ม NovelMaze เพื่อการวิเคราะห์, การแสดงผล, และการตรวจสอบ

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IUser } from "./User"; // สำหรับ userId
import { INovel } from "./Novel"; // สำหรับ novelId
import { IEpisode } from "./Episode"; // สำหรับ episodeId
import { IComment } from "./Comment"; // สำหรับ commentId
import { IPurchase } from "./Purchase"; // สำหรับ purchaseId
import { IDonation } from "./Donation"; // สำหรับ donationId
import { IPayment } from "./Payment"; // สำหรับ paymentId
import { IContentReport } from "./ContentReport"; // สำหรับ contentReportId
// Achievement และ Badge ไม่จำเป็นต้อง import โดยตรง เว้นแต่จะมีการอ้างอิงใน details แบบเฉพาะเจาะจงมากๆ

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล ActivityHistory
// ==================================================================================================

/**
 * @enum {string} ActivityCategory
 * @description หมวดหมู่หลักของกิจกรรม เพื่อช่วยในการจัดกลุ่มและ Query
 * (คง Enum เดิมไว้ เนื่องจากครอบคลุมดีแล้ว)
 */
export enum ActivityCategory {
  AUTHENTICATION = "Authentication",
  PROFILE = "Profile",
  CONTENT_INTERACTION = "ContentInteraction",
  CONTENT_CREATION = "ContentCreation",
  MONETIZATION = "Monetization",
  SOCIAL = "Social",
  SETTINGS = "Settings",
  GAMIFICATION = "Gamification", // << เพิ่มหมวดหมู่สำหรับ Gamification โดยเฉพาะ
  OTHER = "Other",
}

/**
 * @enum {string} ActivityType
 * @description ประเภทของกิจกรรมที่ผู้ใช้ทำบนแพลตฟอร์ม (ขยายให้ครอบคลุมและชัดเจนขึ้น)
 * ตรวจสอบและเพิ่ม event types ที่อาจจำเป็นสำหรับ Gamification
 * เช่น การอ่านครบ X ประเภท, การเขียนติดต่อกัน Y วัน, การเข้าร่วม event เฉพาะ
 */
export enum ActivityType {
  // --- Authentication & Session (Category: AUTHENTICATION) ---
  USER_REGISTERED = "USER_REGISTERED",
  USER_LOGIN_SUCCESS = "USER_LOGIN_SUCCESS",
  USER_LOGIN_FAILURE = "USER_LOGIN_FAILURE",
  USER_LOGOUT = "USER_LOGOUT",
  USER_PASSWORD_RESET_REQUESTED = "USER_PASSWORD_RESET_REQUESTED",
  USER_PASSWORD_RESET_COMPLETED = "USER_PASSWORD_RESET_COMPLETED",
  USER_EMAIL_VERIFICATION_SENT = "USER_EMAIL_VERIFICATION_SENT",
  USER_EMAIL_VERIFIED = "USER_EMAIL_VERIFIED",
  USER_SESSION_REFRESHED = "USER_SESSION_REFRESHED",
  USER_DAILY_LOGIN_STREAK_UPDATED = "USER_DAILY_LOGIN_STREAK_UPDATED", // Gamification: อัปเดตสตรีคการล็อกอินรายวัน

  // --- Profile Management (Category: PROFILE) ---
  USER_PROFILE_UPDATED = "USER_PROFILE_UPDATED",
  USER_PASSWORD_CHANGED = "USER_PASSWORD_CHANGED",
  USER_AVATAR_UPDATED = "USER_AVATAR_UPDATED",
  USER_COVER_IMAGE_UPDATED = "USER_COVER_IMAGE_UPDATED",
  USER_ACCOUNT_SETTINGS_UPDATED = "USER_ACCOUNT_SETTINGS_UPDATED",
  USER_LINKED_SOCIAL_ACCOUNT = "USER_LINKED_SOCIAL_ACCOUNT",
  USER_UNLINKED_SOCIAL_ACCOUNT = "USER_UNLINKED_SOCIAL_ACCOUNT",

  // --- Content Interaction (Category: CONTENT_INTERACTION) ---
  NOVEL_VIEWED_DETAILS = "NOVEL_VIEWED_DETAILS",
  NOVEL_EPISODE_READ_STARTED = "NOVEL_EPISODE_READ_STARTED", // Gamification: เริ่มอ่านตอน
  NOVEL_EPISODE_READ_COMPLETED = "NOVEL_EPISODE_READ_COMPLETED", // Gamification: อ่านตอนจบ (สำคัญมาก)
  NOVEL_READ_PROGRESS_UPDATE = "NOVEL_READ_PROGRESS_UPDATE", // Gamification: อัปเดตความคืบหน้าการอ่าน (เช่น ทุก X%)
  NOVEL_LIKED = "NOVEL_LIKED",
  NOVEL_UNLIKED = "NOVEL_UNLIKED",
  NOVEL_FOLLOWED = "NOVEL_FOLLOWED",
  NOVEL_UNFOLLOWED = "NOVEL_UNFOLLOWED",
  NOVEL_RATED = "NOVEL_RATED", // Gamification: ให้คะแนนนิยาย
  NOVEL_SHARED = "NOVEL_SHARED", // Gamification: แชร์นิยาย
  COMMENT_POSTED = "COMMENT_POSTED", // Gamification: โพสต์ความคิดเห็น
  COMMENT_UPDATED = "COMMENT_UPDATED",
  COMMENT_DELETED = "COMMENT_DELETED",
  COMMENT_LIKED = "COMMENT_LIKED", // Gamification: กดถูกใจความคิดเห็น
  COMMENT_UNLIKED = "COMMENT_UNLIKED",
  COMMENT_REPLIED = "COMMENT_REPLIED", // Gamification: ตอบกลับความคิดเห็น
  LIBRARY_ITEM_ADDED = "LIBRARY_ITEM_ADDED", // Gamification: เพิ่มนิยายเข้าคลัง
  LIBRARY_ITEM_REMOVED = "LIBRARY_ITEM_REMOVED",
  LIBRARY_ITEM_STATUS_UPDATED = "LIBRARY_ITEM_STATUS_UPDATED",
  EPISODE_PURCHASED = "EPISODE_PURCHASED", // Gamification: ซื้อตอนนิยาย (ปลดล็อคตอน)
  NOVEL_PURCHASED = "NOVEL_PURCHASED",     // Gamification: ซื้อนิยายทั้งเรื่อง
  READ_NOVEL_OF_GENRE = "READ_NOVEL_OF_GENRE", // Gamification: อ่านนิยายในประเภทที่กำหนด (details: { genreId, genreSlug })

  // --- Content Creation (Category: CONTENT_CREATION) - สำหรับนักเขียน ---
  WRITER_NOVEL_CREATED = "WRITER_NOVEL_CREATED",
  WRITER_NOVEL_INFO_UPDATED = "WRITER_NOVEL_INFO_UPDATED",
  WRITER_NOVEL_PUBLISHED = "WRITER_NOVEL_PUBLISHED", // Gamification: เผยแพร่นิยายเรื่องแรก/เรื่องที่ X
  WRITER_NOVEL_UNPUBLISHED = "WRITER_NOVEL_UNPUBLISHED",
  WRITER_NOVEL_DELETED = "WRITER_NOVEL_DELETED",
  WRITER_EPISODE_CREATED = "WRITER_EPISODE_CREATED",
  WRITER_EPISODE_UPDATED = "WRITER_EPISODE_UPDATED",
  WRITER_EPISODE_PUBLISHED = "WRITER_EPISODE_PUBLISHED", // Gamification: เผยแพร่ตอนแรก/ตอนที่ X
  WRITER_EPISODE_UNPUBLISHED = "WRITER_EPISODE_UNPUBLISHED",
  WRITER_EPISODE_DELETED = "WRITER_EPISODE_DELETED",
  WRITER_RECEIVED_LIKE_ON_NOVEL = "WRITER_RECEIVED_LIKE_ON_NOVEL", // Gamification: นิยายได้รับการถูกใจ
  WRITER_RECEIVED_COMMENT_ON_NOVEL = "WRITER_RECEIVED_COMMENT_ON_NOVEL", // Gamification: นิยายได้รับการคอมเมนต์
  WRITER_GAINED_FOLLOWER_ON_NOVEL = "WRITER_GAINED_FOLLOWER_ON_NOVEL", // Gamification: นิยายมีผู้ติดตามใหม่
  WRITER_NOVEL_REACHED_VIEW_MILESTONE = "WRITER_NOVEL_REACHED_VIEW_MILESTONE", // Gamification: นิยายถึงยอดวิวที่กำหนด
  WRITER_CONSISTENT_WRITING_STREAK_UPDATED = "WRITER_CONSISTENT_WRITING_STREAK_UPDATED", // Gamification: อัปเดตสตรีคการเขียนต่อเนื่อง

  // --- Monetization (Category: MONETIZATION) ---
  USER_COIN_PACKAGE_PURCHASED = "USER_COIN_PACKAGE_PURCHASED",
  USER_DONATED_TO_WRITER = "USER_DONATED_TO_WRITER", // Gamification: บริจาคให้นักเขียน
  USER_REDEEMED_VOUCHER = "USER_REDEEMED_VOUCHER",

  // --- Social (Category: SOCIAL) ---
  USER_FOLLOWED_ANOTHER_USER = "USER_FOLLOWED_ANOTHER_USER", // Gamification: ติดตามผู้ใช้อื่น
  USER_UNFOLLOWED_ANOTHER_USER = "USER_UNFOLLOWED_ANOTHER_USER",
  USER_SENT_PRIVATE_MESSAGE = "USER_SENT_PRIVATE_MESSAGE",
  USER_RECEIVED_PRIVATE_MESSAGE = "USER_RECEIVED_PRIVATE_MESSAGE",
  USER_JOINED_COMMUNITY_GROUP = "USER_JOINED_COMMUNITY_GROUP",
  USER_LEFT_COMMUNITY_GROUP = "USER_LEFT_COMMUNITY_GROUP",

  // --- Settings & Others (Category: SETTINGS / OTHER) ---
  USER_NOTIFICATION_SETTINGS_UPDATED = "USER_NOTIFICATION_SETTINGS_UPDATED",
  USER_PRIVACY_SETTINGS_UPDATED = "USER_PRIVACY_SETTINGS_UPDATED",
  USER_SUBMITTED_CONTENT_REPORT = "USER_SUBMITTED_CONTENT_REPORT",
  USER_SEARCHED_CONTENT = "USER_SEARCHED_CONTENT",
  USER_VIEWED_NOTIFICATION = "USER_VIEWED_NOTIFICATION",

  // --- Gamification Specific Events (Category: GAMIFICATION) ---
  // Event เหล่านี้อาจจะถูก trigger โดย Gamification Service เอง หลังจากประมวลผล Activity อื่นๆ
  // หรืออาจจะถูก log โดยตรงจากส่วนที่เกี่ยวข้อง
  USER_ACHIEVEMENT_UNLOCKED = "USER_ACHIEVEMENT_UNLOCKED", // ผู้ใช้ปลดล็อก Achievement
  USER_BADGE_EARNED = "USER_BADGE_EARNED",             // ผู้ใช้ได้รับ Badge
  USER_LEVEL_UP = "USER_LEVEL_UP",                   // ผู้ใช้อัปเลเวล
  USER_CLAIMED_REWARD = "USER_CLAIMED_REWARD",         // ผู้ใช้กดรับรางวัล (จาก Achievement, Daily Check-in etc.)
  USER_DAILY_CHECK_IN = "USER_DAILY_CHECK_IN",         // ผู้ใช้ทำการเช็คอินรายวัน

  // --- Event Participation (Category: GAMIFICATION หรือ EVENT_PARTICIPATION ใน Achievement) ---
  USER_JOINED_EVENT = "USER_JOINED_EVENT",             // ผู้ใช้เข้าร่วมกิจกรรม (details: { eventId, eventName })
  USER_COMPLETED_EVENT_TASK = "USER_COMPLETED_EVENT_TASK", // ผู้ใช้ทำภารกิจในกิจกรรมสำเร็จ (details: { eventId, taskId, taskName })

  OTHER_USER_ACTIVITY = "OTHER_USER_ACTIVITY",
}

/**
 * @interface IActivityDetails
 * @description โครงสร้างข้อมูลเพิ่มเติมสำหรับแต่ละประเภทกิจกรรม (ยืดหยุ่น)
 * ปรับปรุงให้มีข้อมูลที่เพียงพอสำหรับ Gamification Service
 * @property {string} [novelId] - ID ของนิยายที่เกี่ยวข้อง (ถ้ามี)
 * @property {string} [episodeId] - ID ของตอนที่เกี่ยวข้อง (ถ้ามี)
 * @property {string} [novelGenreId] - (เพิ่มใหม่) ID ของ Genre นิยาย (สำหรับ Achievement "อ่านนิยายแนว Sci-Fi")
 * @property {string} [novelGenreSlug] - (เพิ่มใหม่) Slug ของ Genre นิยาย
 * @property {string} [authorIdOfNovel] - (เพิ่มใหม่) ID ของผู้แต่งนิยาย (สำหรับ Achievement ที่เกี่ยวกับผู้แต่ง)
 * @property {number} [progressPercent] - เปอร์เซ็นต์ความคืบหน้า (สำหรับ NOVEL_EPISODE_READ_PROGRESS_UPDATE)
 * @property {number} [durationSeconds] - ระยะเวลาที่ใช้ (สำหรับ NOVEL_EPISODE_READ_COMPLETED)
 * @property {string} [deviceType] - ประเภทอุปกรณ์
 * @property {string[]} [updatedFields] - รายชื่อฟิลด์ที่อัปเดต (สำหรับ USER_PROFILE_UPDATED)
 * @property {string} [reason] - เหตุผล (สำหรับ USER_LOGIN_FAILURE)
 * @property {number} [attemptCount] - จำนวนครั้งที่พยายาม (สำหรับ USER_LOGIN_FAILURE)
 * @property {string} [query] - คำค้นหา (สำหรับ USER_SEARCHED_CONTENT)
 * @property {number} [resultCount] - จำนวนผลลัพธ์ (สำหรับ USER_SEARCHED_CONTENT)
 * @property {any} [filters] - ฟิลเตอร์ที่ใช้ (สำหรับ USER_SEARCHED_CONTENT)
 * @property {string} [achievementId] - ID ของ Achievement (สำหรับ USER_ACHIEVEMENT_UNLOCKED)
 * @property {string} [achievementCode] - Code ของ Achievement
 * @property {string} [badgeId] - ID ของ Badge (สำหรับ USER_BADGE_EARNED)
 * @property {string} [badgeKey] - Key ของ Badge
 * @property {number} [newLevel] - เลเวลใหม่ (สำหรับ USER_LEVEL_UP)
 * @property {string} [rewardId] - ID ของรางวัล (สำหรับ USER_CLAIMED_REWARD)
 * @property {string} [rewardType] - ประเภทของรางวัล
 * @property {number} [streakDays] - จำนวนวันสตรีค (สำหรับ USER_DAILY_LOGIN_STREAK_UPDATED, WRITER_CONSISTENT_WRITING_STREAK_UPDATED)
 * @property {string} [eventId] - ID ของกิจกรรม (สำหรับ USER_JOINED_EVENT, USER_COMPLETED_EVENT_TASK)
 * @property {string} [eventName] - ชื่อกิจกรรม
 * @property {string} [taskId] - ID ของภารกิจในกิจกรรม
 * @property {string} [taskName] - ชื่อภารกิจในกิจกรรม
 * @property {string} [targetRatingValue] - (สำหรับ NOVEL_RATED) ค่า rating ที่ให้
 * @property {string} [sharedPlatform] - (สำหรับ NOVEL_SHARED) แพลตฟอร์มที่แชร์ไป
 * @property {string} [commentTextSnippet] - (สำหรับ COMMENT_POSTED) ตัวอย่างข้อความคอมเมนต์
 * @property {string} [libraryStatus] - (สำหรับ LIBRARY_ITEM_ADDED/UPDATED) สถานะในคลัง เช่น "reading", "wishlisted"
 * @property {number} [purchaseAmount] - (สำหรับ EPISODE_PURCHASED, NOVEL_PURCHASED) จำนวนเงิน/เหรียญที่ซื้อ
 * @property {string} [purchaseCurrency] - สกุลเงิน
 * @property {string} [publishedNovelTitle] - (สำหรับ WRITER_NOVEL_PUBLISHED) ชื่อนิยายที่เผยแพร่
 * @property {string} [publishedEpisodeTitle] - (สำหรับ WRITER_EPISODE_PUBLISHED) ชื่อตอนที่เผยแพร่
 * @property {number} [viewMilestone] - (สำหรับ WRITER_NOVEL_REACHED_VIEW_MILESTONE) จำนวนยอดวิวที่ถึงเป้า
 * @property {string} [targetUsername] - (สำหรับ USER_FOLLOWED_ANOTHER_USER) ชื่อผู้ใช้ที่ถูกติดตาม
 */
export interface IActivityDetails extends Record<string, any> {
  novelId?: string;
  episodeId?: string;
  novelGenreId?: string;
  novelGenreSlug?: string;
  authorIdOfNovel?: string;
  progressPercent?: number;
  durationSeconds?: number;
  deviceType?: string;
  updatedFields?: string[];
  reason?: string;
  attemptCount?: number;
  query?: string;
  resultCount?: number;
  filters?: any;
  achievementId?: string;
  achievementCode?: string;
  badgeId?: string;
  badgeKey?: string;
  newLevel?: number;
  rewardId?: string;
  rewardType?: string;
  streakDays?: number;
  eventId?: string;
  eventName?: string;
  taskId?: string;
  taskName?: string;
  targetRatingValue?: number; // Changed to number
  sharedPlatform?: string;
  commentTextSnippet?: string;
  libraryStatus?: string;
  purchaseAmount?: number;
  purchaseCurrency?: string;
  publishedNovelTitle?: string;
  publishedEpisodeTitle?: string;
  viewMilestone?: number;
  targetUsername?: string;
}

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร ActivityHistory (IActivityHistory Document Interface)
// ==================================================================================================
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
  details?: IActivityDetails; // ใช้ IActivityDetails ที่ปรับปรุงแล้ว
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
    relatedEntityId: { type: Schema.Types.Mixed, index: true, sparse: true },
    details: { type: Schema.Types.Mixed, default: () => ({}) }, // Default เป็น object ว่าง
    ipAddress: { type: String, trim: true, maxlength: 100 },
    userAgent: { type: String, trim: true, maxlength: 512 },
    deviceType: { type: String, trim: true, maxlength: 50 },
    appVersion: { type: String, trim: true, maxlength: 50 },
    timestamp: { type: Date, default: Date.now, required: true, index: true },
    schemaVersion: { type: Number, default: 1, min: 1 },
  },
  {
    timestamps: true,
    collection: "activityhistories",
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================
ActivityHistorySchema.index({ userId: 1, timestamp: -1 }, { name: "ActivityHistoryByUserTimeIndex" });
ActivityHistorySchema.index({ activityCategory: 1, activityType: 1, timestamp: -1 }, { name: "ActivityHistoryByTypeCategoryTimeIndex" });
ActivityHistorySchema.index({ novelId: 1, activityType: 1, timestamp: -1 }, { sparse: true, name: "ActivityHistoryByNovelIndex" });
ActivityHistorySchema.index({ episodeId: 1, activityType: 1, timestamp: -1 }, { sparse: true, name: "ActivityHistoryByEpisodeIndex" });
ActivityHistorySchema.index({ ipAddress: 1, timestamp: -1 }, { sparse: true, name: "ActivityHistoryByIpAddressIndex" });
// Index เพิ่มเติมสำหรับ Gamification Service
ActivityHistorySchema.index({ userId: 1, activityType: 1, "details.novelGenreSlug": 1, timestamp: -1 }, { sparse: true, name: "UserGenreReadActivityIndex" });
ActivityHistorySchema.index({ userId: 1, activityType: 1, "details.eventId": 1, timestamp: -1 }, { sparse: true, name: "UserEventParticipationIndex" });


// ==================================================================================================
// SECTION: Helper Function (ฟังก์ชันช่วยในการกำหนด Category จาก Type)
// ==================================================================================================
function getActivityCategory(activityType: ActivityType): ActivityCategory {
  const typePrefix = activityType.split('.')[0].toUpperCase(); // เช่น "USER_REGISTERED" -> "USER_REGISTERED"
  const categoryMap: Record<string, ActivityCategory> = {
    USER_REGISTERED: ActivityCategory.AUTHENTICATION, USER_LOGIN_SUCCESS: ActivityCategory.AUTHENTICATION,
    USER_LOGIN_FAILURE: ActivityCategory.AUTHENTICATION, USER_LOGOUT: ActivityCategory.AUTHENTICATION,
    USER_PASSWORD_RESET_REQUESTED: ActivityCategory.AUTHENTICATION, USER_PASSWORD_RESET_COMPLETED: ActivityCategory.AUTHENTICATION,
    USER_EMAIL_VERIFICATION_SENT: ActivityCategory.AUTHENTICATION, USER_EMAIL_VERIFIED: ActivityCategory.AUTHENTICATION,
    USER_SESSION_REFRESHED: ActivityCategory.AUTHENTICATION, USER_DAILY_LOGIN_STREAK_UPDATED: ActivityCategory.GAMIFICATION,

    USER_PROFILE_UPDATED: ActivityCategory.PROFILE, USER_PASSWORD_CHANGED: ActivityCategory.PROFILE,
    USER_AVATAR_UPDATED: ActivityCategory.PROFILE, USER_COVER_IMAGE_UPDATED: ActivityCategory.PROFILE,
    USER_ACCOUNT_SETTINGS_UPDATED: ActivityCategory.PROFILE, USER_LINKED_SOCIAL_ACCOUNT: ActivityCategory.PROFILE,
    USER_UNLINKED_SOCIAL_ACCOUNT: ActivityCategory.PROFILE,

    NOVEL_VIEWED_DETAILS: ActivityCategory.CONTENT_INTERACTION, NOVEL_EPISODE_READ_STARTED: ActivityCategory.CONTENT_INTERACTION,
    NOVEL_EPISODE_READ_COMPLETED: ActivityCategory.CONTENT_INTERACTION, NOVEL_READ_PROGRESS_UPDATE: ActivityCategory.CONTENT_INTERACTION,
    NOVEL_LIKED: ActivityCategory.CONTENT_INTERACTION, NOVEL_UNLIKED: ActivityCategory.CONTENT_INTERACTION,
    NOVEL_FOLLOWED: ActivityCategory.CONTENT_INTERACTION, NOVEL_UNFOLLOWED: ActivityCategory.CONTENT_INTERACTION,
    NOVEL_RATED: ActivityCategory.CONTENT_INTERACTION, NOVEL_SHARED: ActivityCategory.CONTENT_INTERACTION,
    COMMENT_POSTED: ActivityCategory.CONTENT_INTERACTION, COMMENT_UPDATED: ActivityCategory.CONTENT_INTERACTION,
    COMMENT_DELETED: ActivityCategory.CONTENT_INTERACTION, COMMENT_LIKED: ActivityCategory.CONTENT_INTERACTION,
    COMMENT_UNLIKED: ActivityCategory.CONTENT_INTERACTION, COMMENT_REPLIED: ActivityCategory.CONTENT_INTERACTION,
    LIBRARY_ITEM_ADDED: ActivityCategory.CONTENT_INTERACTION, LIBRARY_ITEM_REMOVED: ActivityCategory.CONTENT_INTERACTION,
    LIBRARY_ITEM_STATUS_UPDATED: ActivityCategory.CONTENT_INTERACTION, EPISODE_PURCHASED: ActivityCategory.MONETIZATION, // อาจจะอยู่ Monetization ด้วย
    NOVEL_PURCHASED: ActivityCategory.MONETIZATION, READ_NOVEL_OF_GENRE: ActivityCategory.CONTENT_INTERACTION,

    WRITER_NOVEL_CREATED: ActivityCategory.CONTENT_CREATION, WRITER_NOVEL_INFO_UPDATED: ActivityCategory.CONTENT_CREATION,
    WRITER_NOVEL_PUBLISHED: ActivityCategory.CONTENT_CREATION, WRITER_NOVEL_UNPUBLISHED: ActivityCategory.CONTENT_CREATION,
    WRITER_NOVEL_DELETED: ActivityCategory.CONTENT_CREATION, WRITER_EPISODE_CREATED: ActivityCategory.CONTENT_CREATION,
    WRITER_EPISODE_UPDATED: ActivityCategory.CONTENT_CREATION, WRITER_EPISODE_PUBLISHED: ActivityCategory.CONTENT_CREATION,
    WRITER_EPISODE_UNPUBLISHED: ActivityCategory.CONTENT_CREATION, WRITER_EPISODE_DELETED: ActivityCategory.CONTENT_CREATION,
    WRITER_RECEIVED_LIKE_ON_NOVEL: ActivityCategory.CONTENT_CREATION, WRITER_RECEIVED_COMMENT_ON_NOVEL: ActivityCategory.CONTENT_CREATION,
    WRITER_GAINED_FOLLOWER_ON_NOVEL: ActivityCategory.CONTENT_CREATION, WRITER_NOVEL_REACHED_VIEW_MILESTONE: ActivityCategory.CONTENT_CREATION,
    WRITER_CONSISTENT_WRITING_STREAK_UPDATED: ActivityCategory.GAMIFICATION, // หรือ CONTENT_CREATION

    USER_COIN_PACKAGE_PURCHASED: ActivityCategory.MONETIZATION, USER_DONATED_TO_WRITER: ActivityCategory.MONETIZATION,
    USER_REDEEMED_VOUCHER: ActivityCategory.MONETIZATION,

    USER_FOLLOWED_ANOTHER_USER: ActivityCategory.SOCIAL, USER_UNFOLLOWED_ANOTHER_USER: ActivityCategory.SOCIAL,
    USER_SENT_PRIVATE_MESSAGE: ActivityCategory.SOCIAL, USER_RECEIVED_PRIVATE_MESSAGE: ActivityCategory.SOCIAL,
    USER_JOINED_COMMUNITY_GROUP: ActivityCategory.SOCIAL, USER_LEFT_COMMUNITY_GROUP: ActivityCategory.SOCIAL,

    USER_NOTIFICATION_SETTINGS_UPDATED: ActivityCategory.SETTINGS, USER_PRIVACY_SETTINGS_UPDATED: ActivityCategory.SETTINGS,
    USER_SUBMITTED_CONTENT_REPORT: ActivityCategory.SETTINGS, USER_SEARCHED_CONTENT: ActivityCategory.SETTINGS,
    USER_VIEWED_NOTIFICATION: ActivityCategory.SETTINGS,

    USER_ACHIEVEMENT_UNLOCKED: ActivityCategory.GAMIFICATION, USER_BADGE_EARNED: ActivityCategory.GAMIFICATION,
    USER_LEVEL_UP: ActivityCategory.GAMIFICATION, USER_CLAIMED_REWARD: ActivityCategory.GAMIFICATION,
    USER_DAILY_CHECK_IN: ActivityCategory.GAMIFICATION, USER_JOINED_EVENT: ActivityCategory.GAMIFICATION,
    USER_COMPLETED_EVENT_TASK: ActivityCategory.GAMIFICATION,
  };

  // ค้นหาจาก map โดยใช้ activityType ทั้งหมดก่อน
  if (categoryMap[activityType]) {
    return categoryMap[activityType];
  }
  // ลองค้นหาจาก prefix (ส่วนหน้าของ activityType ก่อนถึงจุด)
  const mainType = activityType.substring(0, activityType.indexOf('_')); // เช่น USER, NOVEL, WRITER
  if (mainType) {
      if (mainType === "USER") return ActivityCategory.PROFILE; // Default สำหรับ USER_ activities
      if (mainType === "NOVEL" || mainType === "EPISODE" || mainType === "COMMENT" || mainType === "LIBRARY") return ActivityCategory.CONTENT_INTERACTION;
      if (mainType === "WRITER") return ActivityCategory.CONTENT_CREATION;
  }

  return ActivityCategory.OTHER; // ถ้าไม่ตรงกับ prefix ใดๆ
}

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================
ActivityHistorySchema.pre<IActivityHistory>("save", function (next) {
  if (this.isModified("activityType") || this.isNew) {
    this.activityCategory = getActivityCategory(this.activityType);
  }
  next();
});

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================
const ActivityHistoryModel =
  (models.ActivityHistory as mongoose.Model<IActivityHistory>) ||
  model<IActivityHistory>("ActivityHistory", ActivityHistorySchema);

export default ActivityHistoryModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม
// ==================================================================================================
// 1.  **Data Volume & Retention**: (คงเดิม) ActivityHistory สามารถมีขนาดใหญ่มาก ควรมีนโยบายการเก็บรักษาข้อมูล.
// 2.  **Performance**: (คงเดิม) การเขียน ActivityHistory ไม่ควรส่งผลกระทบต่อ performance.
// 3.  **Granularity of `details`**: (ปรับปรุงแล้ว) `IActivityDetails` ได้รับการขยายให้มี field ที่เฉพาะเจาะจงมากขึ้น
//     เพื่อรองรับเงื่อนไข Gamification ที่ซับซ้อน เช่น `novelGenreId`, `novelGenreSlug`, `authorIdOfNovel`,
//     `achievementId`, `badgeId`, `eventId`, `streakDays` ฯลฯ
//     การ query ข้อมูลใน `details` (ที่เป็น Mixed type) อาจจะต้องใช้ความระมัดระวังและสร้าง index ที่เหมาะสม
//     สำหรับ sub-fields ที่ใช้บ่อยใน `details` (ถ้า MongoDB version รองรับ path-specific indexing for Mixed types).
// 4.  **Privacy**: (คงเดิม) `ipAddress` และ `userAgent` ควรจัดการอย่างระมัดระวัง.
// 5.  **Event Standardization for Gamification**: `ActivityType` enum ได้เพิ่ม event ที่เกี่ยวข้องกับ Gamification
//     เช่น `USER_DAILY_LOGIN_STREAK_UPDATED`, `WRITER_CONSISTENT_WRITING_STREAK_UPDATED`,
//     `USER_ACHIEVEMENT_UNLOCKED`, `USER_BADGE_EARNED`, `USER_LEVEL_UP`, `USER_CLAIMED_REWARD`,
//     `USER_DAILY_CHECK_IN`, `USER_JOINED_EVENT`, `USER_COMPLETED_EVENT_TASK`.
//     Event อื่นๆ เช่น `NOVEL_EPISODE_READ_COMPLETED`, `COMMENT_POSTED`, `NOVEL_LIKED` ก็สามารถใช้
//     เป็น trigger สำหรับ Gamification ได้เช่นกัน และ `details` ควรมีข้อมูลเพียงพอ.
// 6.  **Integration with Gamification Service**: Gamification Service จะต้อง subscribe หรือ query ข้อมูลจาก
//     ActivityHistory เพื่อประมวลผลเงื่อนไขการปลดล็อก Achievement และ Badge.
//     การมี `activityCategory: GAMIFICATION` อาจช่วยให้ Gamification Service query event ที่เกี่ยวข้องโดยตรงได้ง่ายขึ้น.
// 7.  **Referenced IDs in `details`**: สำหรับ `details` ที่เก็บ ID เช่น `novelId`, `episodeId`, `achievementId`, `badgeId`
//     ควรเป็น String หรือ ObjectId ที่ชัดเจน และ Service ที่อ่านข้อมูลนี้จะต้องทราบว่า ID นั้นอ้างอิงไปยัง Collection ใด.
// 8.  **Consistency with ReadingAnalytic_EventStream**: บาง Event อาจจะมีการ log ซ้ำซ้อนกันระหว่าง
//     ActivityHistory (สำหรับกิจกรรมทั่วไป) และ ReadingAnalytic_EventStream (สำหรับพฤติกรรมการอ่านเชิงลึก)
//     ควรมีการออกแบบที่ชัดเจนว่า Event ใดควร log ที่ไหน หรือ log ทั้งสองที่แต่มีวัตถุประสงค์การใช้งานต่างกัน.
//     `ActivityType.NOVEL_EPISODE_READ_COMPLETED` สามารถมี `details` ที่คล้ายกับ `IReadSceneEventDetails` ได้
//     แต่ควรเน้นข้อมูลสรุปของ "การอ่านตอนจบ" มากกว่ารายละเอียดทุก Scene.
// ==================================================================================================