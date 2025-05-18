// src/backend/models/Notification.ts
// โมเดลการแจ้งเตือน (Notification Model)
// จัดการการแจ้งเตือนต่างๆ ที่ส่งไปยังผู้ใช้, รองรับหลายช่องทาง, และสามารถปรับแต่งได้
// อัปเดตล่าสุด: เพิ่มการรองรับ Gamification และปรับปรุง context สำหรับรางวัล

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IUser } from "./User"; // สำหรับ recipient และ sourceUserId (อ้างอิง User.ts ที่อัปเดตแล้ว)
import { INovel } from "./Novel"; // สำหรับ novelId
import { IEpisode } from "./Episode"; // สำหรับ episodeId
import { IComment } from "./Comment"; // สำหรับ commentId
import { IAchievement } from "./Achievement"; // สำหรับ achievementId (อ้างอิง Achievement.ts ที่อัปเดตแล้ว)
import { IBadge } from "./Badge"; // สำหรับ badgeId (อ้างอิง Badge.ts ที่อัปเดตแล้ว)
import { IPurchase } from "./Purchase"; // สำหรับ purchaseId
// UserAchievement ไม่จำเป็นต้อง import โดยตรงที่นี่ เพราะ Notification จะถูกสร้างหลัง UserAchievement ถูกบันทึก
// แต่ context อาจมี ID ของ UserAchievement entry ถ้าต้องการ link โดยตรง

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Notification
// ==================================================================================================

/**
 * @enum {string} NotificationType
 * @description ประเภทของการแจ้งเตือน (สามารถขยายเพิ่มเติมได้ตามความต้องการของ NovelMaze)
 * SOCIAL: เกี่ยวกับกิจกรรมทางสังคม
 * CONTENT: เกี่ยวกับเนื้อหา (นิยาย, ตอน, ความคิดเห็น)
 * ACHIEVEMENT: เกี่ยวกับความสำเร็จและรางวัล (Gamification)
 * SYSTEM: เกี่ยวกับระบบและบัญชีผู้ใช้
 * MONETIZATION: เกี่ยวกับการเงินและการซื้อขาย
 * PROMOTION: เกี่ยวกับโปรโมชั่นและข่าวสาร
 * QUEST: (ใหม่) เกี่ยวกับเควสและความคืบหน้า
 * LEADERBOARD: (ใหม่) เกี่ยวกับอันดับและสถานะใน Leaderboard
 */
export enum NotificationType {
  // Social & Community
  NEW_FOLLOWER = "social.new_follower",
  USER_MENTION = "social.user_mention",
  // Content Interaction
  REPLY_TO_COMMENT = "content.reply_to_comment",
  COMMENT_ON_NOVEL = "content.comment_on_novel",
  COMMENT_ON_EPISODE = "content.comment_on_episode",
  LIKE_ON_COMMENT = "content.like_on_comment",
  LIKE_ON_NOVEL = "content.like_on_novel",
  LIKE_ON_EPISODE = "content.like_on_episode",
  // Novel Updates
  NEW_EPISODE_RELEASE = "content.new_episode_release",
  NOVEL_UPDATE_ANNOUNCEMENT = "content.novel_update_announcement",
  FOLLOWED_AUTHOR_NEW_NOVEL = "content.followed_author_new_novel",
  // Gamification (Achievements & Rewards)
  ACHIEVEMENT_UNLOCKED = "gamification.achievement_unlocked", // เปลี่ยน prefix เป็น gamification
  BADGE_AWARDED = "gamification.badge_awarded",             // เปลี่ยน prefix เป็น gamification
  LEVEL_UP = "gamification.level_up",                       // เปลี่ยน prefix เป็น gamification
  REWARD_RECEIVED = "gamification.reward_received",           // (ใหม่) สำหรับรางวัลทั่วไป (XP, Coins จากแหล่งต่างๆ)
  DAILY_REWARD_AVAILABLE = "gamification.daily_reward_available", // คงไว้ หรืออาจรวมกับ REWARD_RECEIVED
  // Gamification (Quests - สำหรับอนาคต)
  QUEST_ASSIGNED = "gamification.quest_assigned",         // (ใหม่) ได้รับเควสใหม่
  QUEST_COMPLETED = "gamification.quest_completed",       // (ใหม่) ทำเควสสำเร็จ
  QUEST_PROGRESS_UPDATE = "gamification.quest_progress_update", // (ใหม่) ความคืบหน้าเควส
  // Gamification (Leaderboards - สำหรับอนาคต)
  LEADERBOARD_RANK_UP = "gamification.leaderboard_rank_up",   // (ใหม่) อันดับใน Leaderboard สูงขึ้น
  LEADERBOARD_NEW_CHALLENGER = "gamification.leaderboard_new_challenger", // (ใหม่) มีผู้ท้าชิงใหม่ใน Leaderboard
  LEADERBOARD_SEASON_END_REWARDS = "gamification.leaderboard_season_end_rewards", // (ใหม่) รางวัลสิ้นสุดฤดูกาล Leaderboard
  // System & Account
  PLATFORM_ANNOUNCEMENT = "system.platform_announcement",
  ACCOUNT_SECURITY_ALERT = "system.account_security_alert",
  CONTENT_MODERATION_UPDATE = "system.content_moderation_update",
  TERMS_OF_SERVICE_UPDATE = "system.terms_of_service_update",
  CONTENT_REPORT_STATUS_UPDATE = "system.content_report_status_update", // ย้ายมาอยู่ system
  CONTENT_POLICY_VIOLATION = "system.content_policy_violation",       // ย้ายมาอยู่ system
  // Monetization & Support
  DONATION_RECEIVED = "monetization.donation_received",
  PURCHASE_COMPLETED = "monetization.purchase_completed",
  PAYMENT_SUCCEEDED = "monetization.payment_succeeded",
  PAYMENT_FAILED = "monetization.payment_failed",
  SUBSCRIPTION_UPDATE = "monetization.subscription_update",
  EARNING_SUMMARY_READY = "monetization.earning_summary_ready",
  // Promotional & Engagement
  FEATURE_HIGHLIGHT = "promotion.feature_highlight",
  RECOMMENDED_NOVEL = "promotion.recommended_novel",
  EVENT_REMINDER = "promotion.event_reminder",
  OTHER = "other",
}

/**
 * @enum {string} NotificationChannel
 * @description ช่องทางที่ส่งการแจ้งเตือน
 * - `IN_APP`: การแจ้งเตือนภายในแอปพลิเคชัน/เว็บไซต์ (Bell icon)
 * - `EMAIL`: การแจ้งเตือนผ่านอีเมล
 * - `PUSH_NOTIFICATION`: การแจ้งเตือนแบบ Push (Mobile/Web Push)
 * - `SMS`: การแจ้งเตือนผ่าน SMS (สำหรับกรณีสำคัญมาก)
 */
export enum NotificationChannel {
  IN_APP = "in_app",
  EMAIL = "email",
  PUSH_NOTIFICATION = "push_notification",
  SMS = "sms", // ใช้งานอย่างระมัดระวังเรื่องค่าใช้จ่ายและความถี่
}

/**
 * @enum {string} NotificationPriority
 * @description ระดับความสำคัญของการแจ้งเตือน
 * - `LOW`: ต่ำ
 * - `MEDIUM`: ปานกลาง
 * - `HIGH`: สูง
 * - `CRITICAL`: วิกฤต (เช่น การแจ้งเตือนความปลอดภัย)
 */
export enum NotificationPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * @enum {string} NotificationSeverity
 * @description ระดับความรุนแรงของการแจ้งเตือน (ใช้สำหรับระบุผลกระทบหรือความเร่งด่วนของเหตุการณ์)
 * - `INFO`: ข้อมูลทั่วไป ไม่เร่งด่วน
 * - `WARNING`: คำเตือน ควรให้ความสนใจ
 * - `SUCCESS`: การดำเนินการสำเร็จ ผลลัพธ์เป็นบวก (เช่น ปลดล็อก Achievement)
 * - `ERROR`: ข้อผิดพลาดหรือปัญหาที่ต้องแก้ไขทันที
 */
export enum NotificationSeverity {
  INFO = "info",
  WARNING = "warning",
  SUCCESS = "success",
  ERROR = "error",
}

/**
 * @interface INotificationAction
 * @description การกระทำที่ผู้ใช้สามารถทำได้กับการแจ้งเตือน
 * @property {string} label - ข้อความที่แสดงบนปุ่มหรือลิงก์ (เช่น "ดูเลย", "ตอบกลับ")
 * @property {string} url - URL ที่จะนำผู้ใช้ไปเมื่อคลิก
 * @property {string} [actionType] - ประเภทของการกระทำ (เช่น "navigate", "api_call", "claim_reward")
 */
export interface INotificationAction {
  label: string;
  url: string;
  actionType?: string;
}
const NotificationActionSchema = new Schema<INotificationAction>(
  {
    label: { type: String, required: true, trim: true, maxlength: [50, "ข้อความบนปุ่มต้องไม่เกิน 50 ตัวอักษร"] },
    url: { type: String, required: true, trim: true, maxlength: [2048, "URL ของ Action ยาวเกินไป"] },
    actionType: { type: String, trim: true, default: "navigate", maxlength: [50, "ประเภท Action ยาวเกินไป"] },
  },
  { _id: false }
);

/**
 * @interface INotificationContext
 * @description ข้อมูลเพิ่มเติมที่เกี่ยวข้องกับการแจ้งเตือน (Contextual Data)
 * ใช้สำหรับสร้างข้อความแจ้งเตือนแบบ Dynamic และสำหรับการเชื่อมโยงไปยังเนื้อหา
 * @property {Types.ObjectId | IUser} [sourceUserId] - ID ผู้ใช้ที่เป็นต้นเหตุ (เช่น คนที่ follow, comment)
 * @property {Types.ObjectId | INovel} [novelId] - ID นิยายที่เกี่ยวข้อง
 * @property {Types.ObjectId | IEpisode} [episodeId] - ID ตอนที่เกี่ยวข้อง
 * @property {Types.ObjectId | IComment} [commentId] - ID ความคิดเห็นที่เกี่ยวข้อง
 * @property {Types.ObjectId | IAchievement} [achievementId] - ID ของ Achievement ต้นแบบที่ปลดล็อก
 * @property {string} [achievementCode] - (Denormalized) รหัสของ Achievement
 * @property {string} [achievementName] - (Denormalized) ชื่อ Achievement
 * @property {Types.ObjectId | IBadge} [badgeId] - ID ของ Badge ต้นแบบที่ได้รับ
 * @property {string} [badgeKey] - (Denormalized) Key ของ Badge
 * @property {string} [badgeName] - (Denormalized) ชื่อ Badge
 * @property {Types.ObjectId} [userAchievementItemId] - (ใหม่) ID ของ document หรือ subdocument ใน UserAchievement ที่บันทึกการได้รับนี้ (ถ้ามี)
 * @property {number} [xpEarned] - (ใหม่) จำนวน XP ที่ได้รับ
 * @property {number} [coinsEarned] - (ใหม่) จำนวน Coins ที่ได้รับ
 * @property {string} [itemRewardType] - (ใหม่) ประเภทของไอเท็มพิเศษที่ได้รับ (เช่น "PROFILE_FRAME", "EXCLUSIVE_CONTENT_ACCESS")
 * @property {string} [itemRewardName] - (ใหม่) ชื่อของไอเท็มพิเศษที่ได้รับ
 * @property {number} [newLevel] - (ใหม่) เลเวลใหม่ที่ผู้ใช้ขึ้นถึง (สำหรับ NotificationType.LEVEL_UP)
 * @property {string} [questName] - (ใหม่) ชื่อเควส (สำหรับ NotificationType ที่เกี่ยวกับเควส)
 * @property {string} [leaderboardName] - (ใหม่) ชื่อ Leaderboard (สำหรับ NotificationType ที่เกี่ยวกับ Leaderboard)
 * @property {number} [rankAchieved] - (ใหม่) อันดับที่ได้ใน Leaderboard
 * @property {Types.ObjectId | IPurchase} [purchaseId] - ID การซื้อที่เกี่ยวข้อง
 * @property {string} [novelTitle] - (Denormalized) ชื่อนิยาย
 * @property {string} [episodeTitle] - (Denormalized) ชื่อตอน
 * @property {string} [sourceUsername] - (Denormalized) ชื่อผู้ใช้ต้นเหตุ
 * @property {string} [sourceUserAvatar] - (Denormalized) URL รูปโปรไฟล์ผู้ใช้ต้นเหตุ
 * @property {string} [commentSnippet] - (Denormalized) ส่วนหนึ่งของความคิดเห็น
 * @property {any} [customData] - ข้อมูลอื่นๆ ที่อาจจำเป็นตามประเภทการแจ้งเตือน (เช่น จำนวนเงินที่บริจาค)
 */
export interface INotificationContext {
  sourceUserId?: Types.ObjectId | IUser;
  novelId?: Types.ObjectId | INovel;
  episodeId?: Types.ObjectId | IEpisode;
  commentId?: Types.ObjectId | IComment;
  achievementId?: Types.ObjectId | IAchievement;
  achievementCode?: string;
  achievementName?: string;
  badgeId?: Types.ObjectId | IBadge;
  badgeKey?: string;
  badgeName?: string;
  userAchievementItemId?: Types.ObjectId;
  xpEarned?: number;
  coinsEarned?: number;
  itemRewardType?: string; // e.g., from AchievementRewardType
  itemRewardName?: string;
  newLevel?: number;
  questName?: string;
  leaderboardName?: string;
  rankAchieved?: number;
  purchaseId?: Types.ObjectId | IPurchase;
  novelTitle?: string;
  episodeTitle?: string;
  sourceUsername?: string;
  sourceUserAvatar?: string;
  commentSnippet?: string;
  customData?: any;
}
const NotificationContextSchema = new Schema<INotificationContext>(
  {
    sourceUserId: { type: Schema.Types.ObjectId, ref: "User" },
    novelId: { type: Schema.Types.ObjectId, ref: "Novel" },
    episodeId: { type: Schema.Types.ObjectId, ref: "Episode" },
    commentId: { type: Schema.Types.ObjectId, ref: "Comment" },
    achievementId: { type: Schema.Types.ObjectId, ref: "Achievement" }, // Ref ไปยัง Achievement ต้นแบบ
    achievementCode: { type: String, trim: true, maxlength: [100, "รหัส Achievement ยาวเกินไป"] },
    achievementName: { type: String, trim: true, maxlength: [200, "ชื่อ Achievement ยาวเกินไป"] },
    badgeId: { type: Schema.Types.ObjectId, ref: "Badge" }, // Ref ไปยัง Badge ต้นแบบ
    badgeKey: { type: String, trim: true, maxlength: [100, "Key ของ Badge ยาวเกินไป"] },
    badgeName: { type: String, trim: true, maxlength: [150, "ชื่อ Badge ยาวเกินไป"] },
    userAchievementItemId: { type: Schema.Types.ObjectId }, // ID ของ UserEarnedItem ใน UserAchievement
    xpEarned: { type: Number, min: 0 },
    coinsEarned: { type: Number, min: 0 },
    itemRewardType: { type: String, trim: true, maxlength: [100, "ประเภท Item Reward ยาวเกินไป"] },
    itemRewardName: { type: String, trim: true, maxlength: [150, "ชื่อ Item Reward ยาวเกินไป"] },
    newLevel: { type: Number, min: 1 },
    questName: { type: String, trim: true, maxlength: [200, "ชื่อ Quest ยาวเกินไป"] },
    leaderboardName: { type: String, trim: true, maxlength: [150, "ชื่อ Leaderboard ยาวเกินไป"] },
    rankAchieved: { type: Number, min: 1 },
    purchaseId: { type: Schema.Types.ObjectId, ref: "Purchase" },
    novelTitle: { type: String, trim: true, maxlength: [255, "ชื่อนิยายยาวเกินไป"] },
    episodeTitle: { type: String, trim: true, maxlength: [255, "ชื่อตอนยาวเกินไป"] },
    sourceUsername: { type: String, trim: true, maxlength: [100, "ชื่อผู้ใช้ต้นเหตุยาวเกินไป"] },
    sourceUserAvatar: { type: String, trim: true, maxlength: [2048, "URL รูป Avatar ยาวเกินไป"] },
    commentSnippet: { type: String, trim: true, maxlength: [150, "ส่วนของความคิดเห็นยาวเกินไป"] },
    customData: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร Notification (INotification Document Interface)
// ==================================================================================================

/**
 * @interface INotification
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารการแจ้งเตือนใน Collection "notifications"
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสาร
 * @property {Types.ObjectId | IUser} recipientId - ID ของผู้ใช้ที่รับการแจ้งเตือน (**จำเป็น**, อ้างอิง User model)
 * @property {NotificationType} type - ประเภทของการแจ้งเตือน (**จำเป็น**)
 * @property {NotificationSeverity} [severity] - ระดับความรุนแรงของการแจ้งเตือน (default: INFO, หรือ SUCCESS สำหรับ gamification)
 * @property {string} title - หัวข้อการแจ้งเตือน (อาจจะ generate หรือกำหนดเอง, **จำเป็น**)
 * @property {string} message - เนื้อหาหลักของการแจ้งเตือน (ควรสั้นกระชับ, **จำเป็น**)
 * @property {string} [iconUrl] - URL ไอคอนสำหรับการแจ้งเตือน (อาจเป็น default ตาม type หรือ custom)
 * @property {INotificationContext} context - ข้อมูลเพิ่มเติมที่เกี่ยวข้อง (**จำเป็น**)
 * @property {Types.DocumentArray<INotificationAction>} [actions] - รายการการกระทำที่ผู้ใช้สามารถทำได้ (เช่น ปุ่ม "ดูเลย")
 * @property {string} [primaryActionUrl] - URL หลักที่จะนำผู้ใช้ไปเมื่อคลิกการแจ้งเตือน (ถ้าไม่มี actions หรือเป็น default action)
 * @property {boolean} isRead - สถานะการอ่าน (true = อ่านแล้ว, false = ยังไม่อ่าน, **จำเป็น**)
 * @property {Date} [readAt] - วันที่อ่านการแจ้งเตือน
 * @property {boolean} isArchived - สถานะการจัดเก็บ (true = เก็บแล้ว, false = ยังไม่เก็บ)
 * @property {Date} [archivedAt] - วันที่จัดเก็บการแจ้งเตือน
 * @property {NotificationChannel[]} channels - ช่องทางที่ส่งการแจ้งเตือนนี้ (**จำเป็น**)
 * @property {NotificationPriority} priority - ระดับความสำคัญของการแจ้งเตือน (**จำเป็น**)
 * @property {Date} [expiresAt] - วันหมดอายุของการแจ้งเตือน (ถ้ามี, เช่น โปรโมชั่น)
 * @property {string} [correlationId] - ID สำหรับเชื่อมโยงการแจ้งเตือนที่เกี่ยวข้อง (เช่น การแจ้งเตือนหลายขั้นตอน)
 * @property {number} schemaVersion - เวอร์ชันของ schema
 * @property {Date} createdAt - วันที่สร้างการแจ้งเตือน (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตล่าสุด (Mongoose `timestamps`)
 */
export interface INotification extends Document {
  _id: Types.ObjectId;
  recipientId: Types.ObjectId | IUser;
  type: NotificationType;
  severity?: NotificationSeverity; // เพิ่ม severity
  title: string;
  message: string;
  iconUrl?: string;
  context: INotificationContext;
  actions?: Types.DocumentArray<INotificationAction>;
  primaryActionUrl?: string;
  isRead: boolean;
  readAt?: Date;
  isArchived: boolean;
  archivedAt?: Date;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  expiresAt?: Date;
  correlationId?: string;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ Notification (NotificationSchema)
// ==================================================================================================
const NotificationSchema = new Schema<INotification>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุ ID ผู้รับการแจ้งเตือน (Recipient ID is required)"],
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: [true, "กรุณาระบุประเภทการแจ้งเตือน (Notification type is required)"],
      index: true,
    },
    severity: {
      type: String,
      enum: Object.values(NotificationSeverity),
      default: function(this: INotification) { // Default severity based on type
          if (this.type === NotificationType.ACHIEVEMENT_UNLOCKED ||
              this.type === NotificationType.BADGE_AWARDED ||
              this.type === NotificationType.LEVEL_UP ||
              this.type === NotificationType.REWARD_RECEIVED ||
              this.type === NotificationType.QUEST_COMPLETED ||
              this.type === NotificationType.LEADERBOARD_SEASON_END_REWARDS) {
            return NotificationSeverity.SUCCESS;
          }
          if (this.type === NotificationType.ACCOUNT_SECURITY_ALERT ||
              this.type === NotificationType.CONTENT_POLICY_VIOLATION) {
            return NotificationSeverity.WARNING; // หรือ ERROR แล้วแต่กรณี
          }
          return NotificationSeverity.INFO;
      }
    },
    title: {
      type: String,
      required: [true, "กรุณาระบุหัวข้อการแจ้งเตือน (Title is required)"],
      trim: true,
      maxlength: [150, "หัวข้อการแจ้งเตือนต้องไม่เกิน 150 ตัวอักษร"],
    },
    message: {
      type: String,
      required: [true, "กรุณาระบุเนื้อหาการแจ้งเตือน (Message is required)"],
      trim: true,
      maxlength: [500, "เนื้อหาการแจ้งเตือนต้องไม่เกิน 500 ตัวอักษร"],
    },
    iconUrl: { type: String, trim: true, maxlength: [2048, "URL ไอคอนยาวเกินไป"] },
    context: {
      type: NotificationContextSchema,
      required: [true, "กรุณาระบุข้อมูลบริบท (Context is required)"],
      default: () => ({})
    },
    actions: [NotificationActionSchema],
    primaryActionUrl: { type: String, trim: true, maxlength: [2048, "URL หลักยาวเกินไป"] },
    isRead: { type: Boolean, default: false, required: true, index: true },
    readAt: { type: Date, index: true },
    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date, index: true },
    channels: {
      type: [String],
      enum: Object.values(NotificationChannel),
      required: [true, "กรุณาระบุช่องทางการส่ง (Channels are required)"],
      validate: [
        (v: NotificationChannel[]) => Array.isArray(v) && v.length > 0,
        "ต้องมีอย่างน้อย 1 ช่องทางการส่ง (At least one channel is required)",
      ],
    },
    priority: {
      type: String,
      enum: Object.values(NotificationPriority),
      default: NotificationPriority.MEDIUM,
      required: [true, "กรุณาระบุระดับความสำคัญ (Priority is required)"],
    },
    expiresAt: { type: Date, index: true },
    correlationId: { type: String, trim: true, index: true, maxlength: [100, "Correlation ID ยาวเกินไป"] },
    schemaVersion: { type: Number, default: 1, min: 1 },
  },
  {
    timestamps: true, // createdAt, updatedAt
    collection: "notifications",
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================
NotificationSchema.index({ recipientId: 1, isArchived: 1, isRead: 1, createdAt: -1 }, { name: "UserNotificationsQueryIndex" });
NotificationSchema.index({ recipientId: 1, type: 1, createdAt: -1 }, { name: "UserNotificationsByTypeIndex" });
NotificationSchema.index({ channels: 1, createdAt: 1 }, { name: "NotificationQueueProcessingIndex" }); // เปลี่ยนเอา status ออก เพราะอาจไม่จำเป็น
NotificationSchema.index({ expiresAt: 1 }, { name: "NotificationExpiryIndex", sparse: true });

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks) - (คงเดิมส่วนใหญ่, ตรวจสอบความถูกต้องของ field ใน User model)
// ==================================================================================================
async function updateUserUnreadNotificationCount(recipientId: Types.ObjectId) {
  const UserModel = models.User as mongoose.Model<IUser>;
  const NotificationModelInstance = models.Notification as mongoose.Model<INotification>;
  try {
    const unreadCount = await NotificationModelInstance.countDocuments({
      recipientId: recipientId,
      isRead: false,
      isArchived: false,
    });
    // ตรวจสอบ User Model Structure: User.ts อาจจะไม่มี activityTracking.unreadNotificationsCount โดยตรง
    // อาจจะต้องอัปเดต field อื่น เช่น User.preferences.notifications.unreadCount หรือ field ที่เหมาะสม
    // สมมติว่ามี field `unreadNotificationsCount` ใน User model โดยตรง หรือใน sub-document ที่เหมาะสม
    // หมายเหตุ: ใน User.ts ที่ให้มา ไม่มี field `activityTracking.unreadNotificationsCount`
    // ผู้ใช้จะต้องเพิ่ม field นี้ใน User model หรือระบุ field ที่ถูกต้องสำหรับเก็บจำนวน notification ที่ยังไม่อ่าน
    // ตัวอย่างการอัปเดต (หาก User.ts มี unreadNotificationsCount):
    // await UserModel.findByIdAndUpdate(recipientId, { $set: { unreadNotificationsCount: unreadCount } });
    // หากไม่มี field ดังกล่าว อาจจะต้อง comment out ส่วนนี้ หรือแจ้งให้ผู้ใช้เพิ่ม field
     console.log(`[Notification Middleware] User ${recipientId} has ${unreadCount} unread notifications. (User model update skipped as field path is unconfirmed)`);
  } catch (error) {
    console.error(`[Notification Middleware Error] Failed to update unread notification count for user ${recipientId}:`, error);
  }
}
// Hooks (คงเดิมจากไฟล์ต้นฉบับ, แต่ส่วน updateUserUnreadNotificationCount ต้องพิจารณา field ใน User.ts ให้ถูกต้อง)
NotificationSchema.post<INotification>("save", async function (doc) {
  if (doc.isNew || doc.isModified("isRead") || doc.isModified("isArchived")) {
    await updateUserUnreadNotificationCount(doc.recipientId as Types.ObjectId);
  }
});
NotificationSchema.post<mongoose.Query<INotification | null, INotification>>("findOneAndUpdate", async function (result) {
  const update = this.getUpdate() as any;
  const filter = this.getFilter();
  const fieldsModified = (update?.$set?.isRead !== undefined || update?.$set?.isArchived !== undefined || update?.isRead !== undefined || update?.isArchived !== undefined);
  if (fieldsModified) {
    let recipientToUpdate: Types.ObjectId | null = null;
    if (result && "recipientId" in result && !("modifiedCount" in result)) {
      recipientToUpdate = result.recipientId as Types.ObjectId;
    } else if (filter.recipientId) {
      recipientToUpdate = filter.recipientId as Types.ObjectId;
    } else if (filter._id) {
      const doc = await (models.Notification as mongoose.Model<INotification>).findById(filter._id).select("recipientId").lean();
      if (doc) recipientToUpdate = doc.recipientId as Types.ObjectId;
    }
    if (recipientToUpdate) {
      await updateUserUnreadNotificationCount(recipientToUpdate);
    }
  }
});
NotificationSchema.post<mongoose.Query<INotification, INotification>>(["findOneAndDelete", "deleteOne"], async function (doc) {
  if (doc && "modifiedCount" in doc === false && "isRead" in doc && "isArchived" in doc) {
    const notification = doc as INotification;
    if (!notification.isRead && !notification.isArchived) {
      await updateUserUnreadNotificationCount(notification.recipientId as Types.ObjectId);
    }
  }
});
NotificationSchema.post<mongoose.Query<any, any>>("deleteMany", async function (result) {
  const filter = this.getFilter();
  if (filter.recipientId) {
    await updateUserUnreadNotificationCount(filter.recipientId as Types.ObjectId);
  } else {
    console.warn("[Notification Middleware] deleteMany without specific recipientId. Unread counts might need broader recalculation.");
  }
});

// ==================================================================================================
// SECTION: Static Methods (เมธอดสำหรับ Model Notification)
// ==================================================================================================
NotificationSchema.statics.markAsRead = async function (notificationId: Types.ObjectId): Promise<INotification | null> {
  return this.findByIdAndUpdate(notificationId, { $set: { isRead: true, readAt: new Date() } }, { new: true });
};
NotificationSchema.statics.markAllAsRead = async function (recipientId: Types.ObjectId): Promise<mongoose.UpdateWriteOpResult> {
  const result = await this.updateMany({ recipientId: recipientId, isRead: false, isArchived: false }, { $set: { isRead: true, readAt: new Date() } });
  if (result.modifiedCount > 0) { await updateUserUnreadNotificationCount(recipientId); }
  return result;
};

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================
const NotificationModel =
  (models.Notification as mongoose.Model<INotification>) ||
  model<INotification>("Notification", NotificationSchema);

export default NotificationModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **การทำงานร่วมกับ Gamification Service**:
//     -   เมื่อ Gamification Service ตรวจพบว่าผู้ใช้ปลดล็อก Achievement หรือได้รับ Badge (ผ่านการตรวจสอบ `ActivityHistory`, `ReadingAnalytic_EventStream` และอัปเดต `UserAchievement`, `User.gamification`, `User.wallet`):
//         -   Service ควรสร้าง Notification โดยใช้ `NotificationType` ที่เหมาะสม เช่น `ACHIEVEMENT_UNLOCKED`, `BADGE_AWARDED`, `LEVEL_UP`, `REWARD_RECEIVED`.
//         -   `INotificationContext` ควรถูก populate ด้วยข้อมูลที่เกี่ยวข้อง:
//             -   `achievementId`, `achievementCode`, `achievementName` (จาก `Achievement.ts`)
//             -   `badgeId`, `badgeKey`, `badgeName` (จาก `Badge.ts`)
//             -   `userAchievementItemId` (ID ของ entry ใน `UserAchievement.earnedItems` ที่เพิ่งสร้าง)
//             -   `xpEarned`, `coinsEarned` (จำนวน XP และ Coins ที่ผู้ใช้ได้รับ)
//             -   `itemRewardType`, `itemRewardName` (ถ้ามีการให้รางวัลเป็นไอเท็มพิเศษ เช่น กรอบโปรไฟล์ จาก `Achievement.rewards`)
//             -   `newLevel` (ถ้ามีการ Level Up)
//     -   ข้อความ `title` และ `message` ของ Notification ควรถูกสร้างแบบ dynamic โดยอิงจากข้อมูลใน `context`
//         (เช่น "ยินดีด้วย! คุณปลดล็อกความสำเร็จ: [Achievement Name]" หรือ "คุณได้รับเหรียญตรา: [Badge Name]!")
// 2.  **รองรับ Gamification Features ในอนาคต**:
//     -   **Leaderboards**: เพิ่ม `NotificationType` เช่น `LEADERBOARD_RANK_UP`, `LEADERBOARD_NEW_CHALLENGER`, `LEADERBOARD_SEASON_END_REWARDS`.
//         Context อาจมี `leaderboardName`, `rankAchieved`, `opponentUsername` (สำหรับ new challenger).
//     -   **Daily/Weekly Quests**: หากมีการเพิ่ม `Quest.ts` model, สามารถเพิ่ม `NotificationType` เช่น `QUEST_ASSIGNED`, `QUEST_COMPLETED`, `QUEST_PROGRESS_UPDATE`.
//         Context อาจมี `questName`, `questDescription`, `rewardsForQuest`.
// 3.  **User Preferences for Gamification Notifications**: ผู้ใช้ควรสามารถตั้งค่าได้ว่าจะรับการแจ้งเตือนเกี่ยวกับ Gamification หรือไม่
//     (เช่น ใน `User.preferences.notifications.achievementUnlocks` ที่มีอยู่แล้ว หรือเพิ่ม categories ใหม่สำหรับ Quests, Leaderboards).
//     Gamification Service ควรตรวจสอบ preference นี้ก่อนสร้าง Notification.
// 4.  **Notification Actions for Gamification**:
//     -   `ACHIEVEMENT_UNLOCKED` หรือ `BADGE_AWARDED`: Action อาจจะเป็น "ดูความสำเร็จทั้งหมด", "แสดงบนโปรไฟล์".
//     -   `REWARD_RECEIVED`: Action อาจจะเป็น "ดูรายละเอียดรางวัล".
//     -   `QUEST_COMPLETED`: Action อาจจะเป็น "รับรางวัลเควส" (ถ้าต้องมีการ claim).
// 5.  **Severity สำหรับ Gamification Notifications**: ส่วนใหญ่ควรเป็น `NotificationSeverity.SUCCESS` เพื่อสร้างความรู้สึกเชิงบวก.
// 6.  **Denormalized Data in Context**: การเก็บ `achievementName`, `badgeName` เป็นสิ่งที่ดี.
//     ควรพิจารณาเพิ่มการ denormalize `achievementIconUrl`, `badgeIconUrl` ใน `context.customData` หรือ field เฉพาะ
//     เพื่อลดการ query ซ้ำเมื่อแสดงผล Notification ที่มีไอคอนของ Achievement/Badge.
// 7.  **Notification Batching**: สำหรับ Leaderboard updates หรือการแจ้งเตือนบางประเภทที่อาจเกิดถี่ๆ ควรพิจารณาการ batch.
// 8.  **User Unread Notification Count**: Middleware ที่อัปเดต `unreadNotificationsCount` ใน `User` model สำคัญมาก.
//     ต้องแน่ใจว่า field ที่อัปเดตใน `User` model (`User.ts`) นั้นถูกต้องและมีอยู่จริง.
//     (ใน User.ts ที่ให้มา ยังไม่มี field `activityTracking.unreadNotificationsCount` โดยตรง ต้องปรับปรุง User.ts หรือ logic การอัปเดตนี้)
// 9.  **Real-time Updates**: ใช้ WebSocket สำหรับการแจ้งเตือน In-app เพื่อประสบการณ์ที่ดีขึ้น, โดยเฉพาะสำหรับ Gamification ที่ต้องการการตอบสนองทันที.
// ==================================================================================================