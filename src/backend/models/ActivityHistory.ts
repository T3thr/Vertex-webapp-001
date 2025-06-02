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
  OTHER = "Other",
}

/**
 * @enum {string} ActivityType
 * @description ประเภทของกิจกรรมที่ผู้ใช้ทำบนแพลตฟอร์ม (ขยายให้ครอบคลุมและชัดเจนขึ้น)
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
  USER_DAILY_LOGIN_STREAK_UPDATED = "USER_DAILY_LOGIN_STREAK_UPDATED",

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
  NOVEL_EPISODE_READ_STARTED = "NOVEL_EPISODE_READ_STARTED",
  NOVEL_EPISODE_READ_COMPLETED = "NOVEL_EPISODE_READ_COMPLETED",
  NOVEL_READ_PROGRESS_UPDATE = "NOVEL_READ_PROGRESS_UPDATE",
  NOVEL_LIKED = "NOVEL_LIKED",
  NOVEL_UNLIKED = "NOVEL_UNLIKED",
  NOVEL_FOLLOWED = "NOVEL_FOLLOWED",
  NOVEL_UNFOLLOWED = "NOVEL_UNFOLLOWED",
  NOVEL_RATED = "NOVEL_RATED",
  NOVEL_SHARED = "NOVEL_SHARED",
  COMMENT_POSTED = "COMMENT_POSTED",
  COMMENT_UPDATED = "COMMENT_UPDATED",
  COMMENT_DELETED = "COMMENT_DELETED",
  COMMENT_LIKED = "COMMENT_LIKED",
  COMMENT_UNLIKED = "COMMENT_UNLIKED",
  COMMENT_REPLIED = "COMMENT_REPLIED",
  LIBRARY_ITEM_ADDED = "LIBRARY_ITEM_ADDED",
  LIBRARY_ITEM_REMOVED = "LIBRARY_ITEM_REMOVED",
  LIBRARY_ITEM_STATUS_UPDATED = "LIBRARY_ITEM_STATUS_UPDATED",
  EPISODE_PURCHASED = "EPISODE_PURCHASED",
  NOVEL_PURCHASED = "NOVEL_PURCHASED",
  READ_NOVEL_OF_GENRE = "READ_NOVEL_OF_GENRE",

  // --- Content Creation (Category: CONTENT_CREATION) - สำหรับนักเขียน ---
  WRITER_NOVEL_CREATED = "WRITER_NOVEL_CREATED",
  WRITER_NOVEL_INFO_UPDATED = "WRITER_NOVEL_INFO_UPDATED",
  WRITER_NOVEL_PUBLISHED = "WRITER_NOVEL_PUBLISHED",
  WRITER_NOVEL_UNPUBLISHED = "WRITER_NOVEL_UNPUBLISHED",
  WRITER_NOVEL_DELETED = "WRITER_NOVEL_DELETED",
  WRITER_EPISODE_CREATED = "WRITER_EPISODE_CREATED",
  WRITER_EPISODE_UPDATED = "WRITER_EPISODE_UPDATED",
  WRITER_EPISODE_PUBLISHED = "WRITER_EPISODE_PUBLISHED",
  WRITER_EPISODE_UNPUBLISHED = "WRITER_EPISODE_UNPUBLISHED",
  WRITER_EPISODE_DELETED = "WRITER_EPISODE_DELETED",
  WRITER_RECEIVED_LIKE_ON_NOVEL = "WRITER_RECEIVED_LIKE_ON_NOVEL",
  WRITER_RECEIVED_COMMENT_ON_NOVEL = "WRITER_RECEIVED_COMMENT_ON_NOVEL",
  WRITER_GAINED_FOLLOWER_ON_NOVEL = "WRITER_GAINED_FOLLOWER_ON_NOVEL",
  WRITER_NOVEL_REACHED_VIEW_MILESTONE = "WRITER_NOVEL_REACHED_VIEW_MILESTONE",
  WRITER_CONSISTENT_WRITING_STREAK_UPDATED = "WRITER_CONSISTENT_WRITING_STREAK_UPDATED",

  // --- Monetization (Category: MONETIZATION) ---
  USER_COIN_PACKAGE_PURCHASED = "USER_COIN_PACKAGE_PURCHASED",
  USER_DONATED_TO_WRITER = "USER_DONATED_TO_WRITER",
  USER_REDEEMED_VOUCHER = "USER_REDEEMED_VOUCHER",

  // --- Social (Category: SOCIAL) ---
  USER_FOLLOWED_ANOTHER_USER = "USER_FOLLOWED_ANOTHER_USER",
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
  USER_ACHIEVEMENT_UNLOCKED = "USER_ACHIEVEMENT_UNLOCKED",
  USER_BADGE_EARNED = "USER_BADGE_EARNED",
  USER_LEVEL_UP = "USER_LEVEL_UP",
  USER_CLAIMED_REWARD = "USER_CLAIMED_REWARD",
  USER_DAILY_CHECK_IN = "USER_DAILY_CHECK_IN",

  // --- Event Participation (Category: GAMIFICATION หรือ EVENT_PARTICIPATION ใน Achievement) ---
  USER_JOINED_EVENT = "USER_JOINED_EVENT",
  USER_COMPLETED_EVENT_TASK = "USER_COMPLETED_EVENT_TASK",

  OTHER_USER_ACTIVITY = "OTHER_USER_ACTIVITY",
  WRITER_DAILY_LOGIN_STREAK_UPDATED = "WRITER_DAILY_LOGIN_STREAK_UPDATED",
}

/**
 * @interface IActivityDetails
 * @description โครงสร้างข้อมูลเพิ่มเติมสำหรับแต่ละประเภทกิจกรรม (ยืดหยุ่น)
 * @property {string} [novelId] - ID ของนิยายที่เกี่ยวข้อง
 * @property {string} [episodeId] - ID ของตอนที่เกี่ยวข้อง
 * @property {string} [novelGenreId] - ID ของ Category (Genre) ของนิยาย
 * @property {string} [novelGenreSlug] - Slug ของ Category (Genre) ของนิยาย
 * @property {string} [authorIdOfNovel] - ID ของผู้แต่งนิยาย
 * @property {number} [progressPercent] - เปอร์เซ็นต์ความคืบหน้า
 * @property {number} [durationSeconds] - ระยะเวลาที่ใช้ (วินาที)
 * @property {string} [deviceType] - ประเภทอุปกรณ์
 * @property {string[]} [updatedFields] - รายชื่อฟิลด์ที่อัปเดต
 * @property {string} [reason] - เหตุผล
 * @property {number} [attemptCount] - จำนวนครั้งที่พยายาม
 * @property {string} [query] - คำค้นหา
 * @property {number} [resultCount] - จำนวนผลลัพธ์
 * @property {any} [filters] - ฟิลเตอร์ที่ใช้
 * @property {string} [achievementId] - ID ของ Achievement
 * @property {string} [achievementCode] - Code ของ Achievement
 * @property {string} [badgeId] - ID ของ Badge
 * @property {string} [badgeKey] - Key ของ Badge
 * @property {number} [newLevel] - เลเวลใหม่
 * @property {string} [rewardId] - ID ของรางวัล
 * @property {string} [rewardType] - ประเภทของรางวัล
 * @property {number} [streakDays] - จำนวนวันสตรีค
 * @property {string} [eventId] - ID ของกิจกรรม
 * @property {string} [eventName] - ชื่อกิจกรรม
 * @property {string} [taskId] - ID ของภารกิจ
 * @property {string} [taskName] - ชื่อภารกิจ
 * @property {number} [targetRatingValue] - ค่า rating ที่ให้
 * @property {string} [sharedPlatform] - แพลตฟอร์มที่แชร์ไป
 * @property {string} [commentTextSnippet] - ตัวอย่างข้อความคอมเมนต์
 * @property {string} [libraryStatus] - สถานะในคลัง
 * @property {number} [purchaseAmount] - จำนวนเงิน/เหรียญที่ซื้อ
 * @property {string} [purchaseCurrency] - สกุลเงิน
 * @property {string} [publishedNovelTitle] - ชื่อนิยายที่เผยแพร่
 * @property {string} [publishedEpisodeTitle] - ชื่อตอนที่เผยแพร่
 * @property {number} [viewMilestone] - จำนวนยอดวิวที่ถึงเป้า
 * @property {string} [targetUsername] - ชื่อผู้ใช้ที่ถูกติดตาม
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
  targetRatingValue?: number;
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
      required: [true, "กรุณาระบุ ID ของผู้ใช้"],
      index: true,
      description: "ID ของผู้ใช้ที่ทำกิจกรรม",
    },
    activityType: {
      type: String,
      enum: Object.values(ActivityType),
      required: [true, "กรุณาระบุประเภทกิจกรรม"],
      index: true,
      description: "ประเภทของกิจกรรมที่ผู้ใช้ทำบนแพลตฟอร์ม",
    },
    activityCategory: {
      type: String,
      enum: Object.values(ActivityCategory),
      required: [true, "กรุณาระบุหมวดหมู่กิจกรรม"],
      index: true,
      description: "หมวดหมู่หลักของกิจกรรม",
    },
    description: { type: String, trim: true, maxlength: [1000, "คำอธิบายกิจกรรมต้องไม่เกิน 1000 ตัวอักษร"], description: "คำอธิบายเพิ่มเติมเกี่ยวกับกิจกรรม (ถ้ามี)" },
    novelId: { type: Schema.Types.ObjectId, ref: "Novel", index: true, sparse: true, description: "ID ของนิยายที่เกี่ยวข้อง (ถ้ามี)" },
    episodeId: { type: Schema.Types.ObjectId, ref: "Episode", index: true, sparse: true, description: "ID ของตอนที่เกี่ยวข้อง (ถ้ามี)" },
    commentId: { type: Schema.Types.ObjectId, ref: "Comment", index: true, sparse: true, description: "ID ของความคิดเห็นที่เกี่ยวข้อง (ถ้ามี)" },
    targetUserId: { type: Schema.Types.ObjectId, ref: "User", index: true, sparse: true, description: "ID ของผู้ใช้อื่นที่เกี่ยวข้องกับกิจกรรมนี้ (เช่น ผู้ใช้ที่ถูกติดตาม, ผู้เขียนที่ได้รับบริจาค)" },
    purchaseId: { type: Schema.Types.ObjectId, ref: "Purchase", index: true, sparse: true, description: "ID ของการซื้อที่เกี่ยวข้อง (ถ้ามี)" },
    donationId: { type: Schema.Types.ObjectId, ref: "Donation", index: true, sparse: true, description: "ID ของการบริจาคที่เกี่ยวข้อง (ถ้ามี)" },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", index: true, sparse: true, description: "ID ของการชำระเงินที่เกี่ยวข้อง (ถ้ามี)" },
    contentReportId: { type: Schema.Types.ObjectId, ref: "ContentReport", index: true, sparse: true, description: "ID ของการรายงานเนื้อหาที่เกี่ยวข้อง (ถ้ามี)" },
    relatedEntityType: { type: String, trim: true, maxlength: 100, description: "ประเภทของ Entity อื่นๆ ที่เกี่ยวข้อง (ถ้ามี)" },
    relatedEntityId: { type: Schema.Types.Mixed, index: true, sparse: true, description: "ID ของ Entity อื่นๆ ที่เกี่ยวข้อง (ถ้ามี)" },
    details: { type: Schema.Types.Mixed, default: () => ({}), description: "ข้อมูลเพิ่มเติมเฉพาะของกิจกรรมนั้นๆ เพื่อใช้ในการวิเคราะห์หรือแสดงผล" },
    ipAddress: { type: String, trim: true, maxlength: 100, description: "IP Address ของผู้ใช้ขณะทำกิจกรรม" },
    userAgent: { type: String, trim: true, maxlength: 512, description: "User Agent ของ Client ที่ผู้ใช้ใช้งาน" },
    deviceType: { type: String, trim: true, maxlength: 50, description: "ประเภทอุปกรณ์ที่ใช้ (เช่น mobile, desktop)" },
    appVersion: { type: String, trim: true, maxlength: 50, description: "เวอร์ชันของแอปพลิเคชัน (ถ้ามี)" },
    timestamp: { type: Date, default: Date.now, required: true, index: true, description: "เวลาที่เกิดกิจกรรม" },
    schemaVersion: { type: Number, default: 1, min: 1, description: "เวอร์ชันของ Schema" },
  },
  {
    timestamps: true, // createdAt, updatedAt
    collection: "activityhistories", // ชื่อ collection ใน MongoDB
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
ActivityHistorySchema.index({ userId: 1, activityType: 1, "details.novelGenreSlug": 1, timestamp: -1 }, { sparse: true, name: "UserGenreReadActivityIndex" });
ActivityHistorySchema.index({ userId: 1, activityType: 1, "details.eventId": 1, timestamp: -1 }, { sparse: true, name: "UserEventParticipationIndex" });


// ==================================================================================================
// SECTION: Helper Function (ฟังก์ชันช่วยในการกำหนด Category จาก Type)
// ==================================================================================================
function getActivityCategory(activityType: ActivityType): ActivityCategory {
  const typeString = activityType as string;
  if (typeString.startsWith("USER_REGISTERED") || typeString.startsWith("USER_LOGIN") || typeString.startsWith("USER_LOGOUT") || typeString.startsWith("USER_PASSWORD_RESET") || typeString.startsWith("USER_EMAIL_VERIFICATION") || typeString.startsWith("USER_SESSION")) {
    return ActivityCategory.AUTHENTICATION;
  }
  if (typeString.startsWith("USER_PROFILE") || typeString.startsWith("USER_PASSWORD_CHANGED") || typeString.startsWith("USER_AVATAR") || typeString.startsWith("USER_COVER_IMAGE") || typeString.startsWith("USER_ACCOUNT_SETTINGS") || typeString.startsWith("USER_LINKED_SOCIAL") || typeString.startsWith("USER_UNLINKED_SOCIAL")) {
    return ActivityCategory.PROFILE;
  }
  if (typeString.startsWith("NOVEL_") || typeString.startsWith("EPISODE_") || typeString.startsWith("COMMENT_") || typeString.startsWith("LIBRARY_") || typeString.startsWith("READ_NOVEL_OF_GENRE")) {
    if (typeString === ActivityType.EPISODE_PURCHASED || typeString === ActivityType.NOVEL_PURCHASED) return ActivityCategory.MONETIZATION;
    return ActivityCategory.CONTENT_INTERACTION;
  }
  if (typeString.startsWith("WRITER_")) {
    if (typeString === ActivityType.WRITER_DAILY_LOGIN_STREAK_UPDATED || typeString === ActivityType.WRITER_CONSISTENT_WRITING_STREAK_UPDATED) return ActivityCategory.GAMIFICATION;
    return ActivityCategory.CONTENT_CREATION;
  }
  if (typeString.startsWith("USER_COIN_") || typeString.startsWith("USER_DONATED_") || typeString.startsWith("USER_REDEEMED_")) {
    return ActivityCategory.MONETIZATION;
  }
  if (typeString.startsWith("USER_FOLLOWED_") || typeString.startsWith("USER_UNFOLLOWED_") || typeString.startsWith("USER_SENT_PRIVATE_") || typeString.startsWith("USER_RECEIVED_PRIVATE_") || typeString.startsWith("USER_JOINED_COMMUNITY_") || typeString.startsWith("USER_LEFT_COMMUNITY_")) {
    return ActivityCategory.SOCIAL;
  }
  if (typeString.startsWith("USER_NOTIFICATION_SETTINGS_") || typeString.startsWith("USER_PRIVACY_SETTINGS_") || typeString.startsWith("USER_SUBMITTED_CONTENT_REPORT") || typeString.startsWith("USER_SEARCHED_CONTENT") || typeString.startsWith("USER_VIEWED_NOTIFICATION")) {
    return ActivityCategory.SETTINGS;
  }
  if (typeString.startsWith("USER_ACHIEVEMENT_") || typeString.startsWith("USER_BADGE_") || typeString.startsWith("USER_LEVEL_UP") || typeString.startsWith("USER_CLAIMED_REWARD") || typeString.startsWith("USER_DAILY_CHECK_IN") || typeString.startsWith("USER_JOINED_EVENT") || typeString.startsWith("USER_COMPLETED_EVENT_TASK") || typeString.startsWith("USER_DAILY_LOGIN_STREAK_UPDATED")) {
    return ActivityCategory.GAMIFICATION;
  }
  return ActivityCategory.OTHER;
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
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Data Volume & Retention**: ปริมาณข้อมูล ActivityHistory สามารถเพิ่มขึ้นได้อย่างรวดเร็ว.
//     ควรมีนโยบายการเก็บรักษาข้อมูลที่ชัดเจน เช่น การเก็บข้อมูลดิบไว้เป็นระยะเวลาหนึ่ง (เช่น 1-2 ปี)
//     แล้วทำการสรุป (aggregate) ข้อมูลที่สำคัญเก็บไว้ใน Collection อื่น หรือย้ายข้อมูลเก่าไปยัง Cold Storage
//     เพื่อลดภาระของฐานข้อมูลหลักและค่าใช้จ่ายในการจัดเก็บ.
// 2.  **Performance**: การเขียน ActivityHistory ไม่ควรส่งผลกระทบต่อ performance ของ critical path ในแอปพลิเคชัน.
//     สำหรับระบบที่มี activity จำนวนมาก อาจพิจารณาใช้ message queue (เช่น RabbitMQ, Kafka)
//     สำหรับการเขียน log แบบ asynchronous เพื่อเพิ่ม throughput และ resilience.
// 3.  **Granularity of `details`**: `IActivityDetails` ได้รับการขยายให้มี field ที่เฉพาะเจาะจงมากขึ้น
//     เช่น `novelGenreId`, `novelGenreSlug`, `authorIdOfNovel` เพื่อรองรับเงื่อนไข Gamification.
//     การ query ข้อมูลใน `details` (ที่เป็น Mixed type) อาจจะต้องใช้ความระมัดระวัง
//     และสร้าง index ที่เหมาะสมสำหรับ sub-fields ที่ใช้บ่อยใน `details` (ถ้า MongoDB version รองรับ).
//     การกำหนด schema ที่เข้มงวดสำหรับ `details` (เช่น union type ของ specific detail interfaces)
//     จะช่วยเรื่อง type safety แต่เพิ่มความซับซ้อนของ schema.
// 4.  **Privacy**: การจัดเก็บ `ipAddress` และ `userAgent` ควรเป็นไปตามนโยบายความเป็นส่วนตัว
//     อาจมีการ hash หรือ anonymize ข้อมูลบางส่วนเพื่อปกป้องผู้ใช้.
// 5.  **Event Standardization for Gamification**: `ActivityType` enum ได้เพิ่ม event ที่เกี่ยวข้องกับ Gamification.
//     Event อื่นๆ ที่มีอยู่แล้ว เช่น `NOVEL_EPISODE_READ_COMPLETED`, `COMMENT_POSTED`, `NOVEL_LIKED`
//     สามารถใช้เป็น trigger สำหรับ Gamification ได้ และ `details` ควรมีข้อมูลที่เพียงพอสำหรับ Gamification Service.
//     การเพิ่ม `details.novelGenreId` และ `details.novelGenreSlug` ใน `NOVEL_EPISODE_READ_COMPLETED` event
//     มีประโยชน์อย่างมากสำหรับ Gamification Service ในการตรวจสอบ Achievement "อ่านนิยายหมวดหมู่หลักครบตามรอบกำหนด".
// 6.  **Integration with Gamification Service**: Gamification Service จะต้อง subscribe หรือ query ข้อมูลจาก
//     ActivityHistory (และ/หรือ ReadingAnalytic_EventStream) เพื่อประมวลผลเงื่อนไขการปลดล็อก Achievement และ Badge.
// 7.  **Referenced IDs in `details`**: การเก็บ ID เช่น `novelId`, `episodeId`, `achievementId`, `badgeId`, `novelGenreId`
//     ใน `details` ควรเป็น String หรือ ObjectId ที่ชัดเจน. Service ที่อ่านข้อมูลนี้จะต้องทราบว่า ID นั้นอ้างอิงไปยัง Collection ใด.
// 8.  **Consistency with ReadingAnalytic_EventStream**: บาง Event อาจมีการ log ซ้ำซ้อนกันระหว่าง ActivityHistory และ
//     ReadingAnalytic_EventStream. ควรมีการออกแบบที่ชัดเจนว่า Event ใดควร log ที่ไหน หรือ log ทั้งสองที่แต่มีวัตถุประสงค์ต่างกัน.
// 9.  **Mapping Helper Function `getActivityCategory`**: ควรตรวจสอบให้ครอบคลุม `ActivityType` ทั้งหมด.
//     การใช้ `typeString.startsWith("...")` อาจจะไม่แม่นยำเสมอไปถ้ามี enum members ที่มี prefix คล้ายกัน
//     แต่ควรอยู่คนละ category. การ map ตรงๆ แบบที่ทำในปัจจุบัน (แม้จะยาว) มีความแม่นยำมากกว่า.
// ==================================================================================================