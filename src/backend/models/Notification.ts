// src/backend/models/Notification.ts
// โมเดลการแจ้งเตือน (Notification Model)
// จัดการการแจ้งเตือนต่างๆ ที่ส่งไปยังผู้ใช้, รองรับหลายช่องทาง, และสามารถปรับแต่งได้
// อัปเดตล่าสุด: ปรับปรุง NotificationType และ Context สำหรับ Gamification ให้ครอบคลุมยิ่งขึ้น, เพิ่ม Severity โดยอิงจาก Type

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IUser } from "./User"; // สำหรับ recipient และ sourceUserId (อ้างอิง User.ts ที่อัปเดตแล้ว)
import { INovel } from "./Novel"; // สำหรับ novelId
import { IEpisode } from "./Episode"; // สำหรับ episodeId
import { IComment } from "./Comment"; // สำหรับ commentId
import { IAchievement } from "./Achievement"; // สำหรับ achievementId (อ้างอิง Achievement.ts ต้นแบบ)
import { IBadge } from "./Badge"; // สำหรับ badgeId (อ้างอิง Badge.ts ต้นแบบ)
import { IPurchase } from "./Purchase"; // สำหรับ purchaseId
// UserAchievement ไม่จำเป็นต้อง import โดยตรง แต่ INotificationContext.userEarnedItemId จะอ้างอิงถึง _id ของ UserEarnedItem ในนั้น

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Notification
// ==================================================================================================

/**
 * @enum {string} NotificationType
 * @description ประเภทของการแจ้งเตือน (สามารถขยายเพิ่มเติมได้ตามความต้องการของ NovelMaze)
 * SOCIAL: เกี่ยวกับกิจกรรมทางสังคม
 * CONTENT: เกี่ยวกับเนื้อหา (นิยาย, ตอน, ความคิดเห็น)
 * GAMIFICATION: เกี่ยวกับความสำเร็จ รางวัล เควส และ Leaderboards
 * SYSTEM: เกี่ยวกับระบบและบัญชีผู้ใช้
 * MONETIZATION: เกี่ยวกับการเงินและการซื้อขาย
 * PROMOTION: เกี่ยวกับโปรโมชั่นและข่าวสาร
 */
export enum NotificationType {
  // Social & Community
  NEW_FOLLOWER = "social.new_follower", // มีผู้ติดตามใหม่
  USER_MENTION = "social.user_mention", // ถูกกล่าวถึง

  // Content Interaction
  REPLY_TO_COMMENT = "content.reply_to_comment", // มีการตอบกลับความคิดเห็นของคุณ
  COMMENT_ON_NOVEL = "content.comment_on_novel", // มีความคิดเห็นใหม่ในนิยายของคุณ
  COMMENT_ON_EPISODE = "content.comment_on_episode", // มีความคิดเห็นใหม่ในตอนของคุณ
  LIKE_ON_COMMENT = "content.like_on_comment", // มีคนถูกใจความคิดเห็นของคุณ
  LIKE_ON_NOVEL = "content.like_on_novel", // มีคนถูกใจนิยายของคุณ
  LIKE_ON_EPISODE = "content.like_on_episode", // มีคนถูกใจตอนของคุณ

  // Novel Updates
  NEW_EPISODE_RELEASE = "content.new_episode_release", // ตอนใหม่ของนิยายที่คุณติดตามถูกเผยแพร่
  NOVEL_UPDATE_ANNOUNCEMENT = "content.novel_update_announcement", // ประกาศอัปเดตจากผู้เขียนนิยาย
  FOLLOWED_AUTHOR_NEW_NOVEL = "content.followed_author_new_novel", // นักเขียนที่คุณติดตามเผยแพร่นิยายเรื่องใหม่

  // Gamification (Achievements & Rewards)
  ACHIEVEMENT_UNLOCKED = "gamification.achievement_unlocked", // ปลดล็อก Achievement ใหม่
  BADGE_AWARDED = "gamification.badge_awarded", // ได้รับ Badge ใหม่
  LEVEL_UP = "gamification.level_up", // ระดับผู้ใช้เพิ่มขึ้น
  REWARD_RECEIVED = "gamification.reward_received", // ได้รับรางวัล (XP, Coins จากแหล่งอื่นๆ)
  DAILY_REWARD_AVAILABLE = "gamification.daily_reward_available", // รางวัลรายวันพร้อมให้รับ

  // Gamification (Quests - สำหรับอนาคต)
  QUEST_ASSIGNED = "gamification.quest_assigned", // ได้รับเควสใหม่
  QUEST_COMPLETED = "gamification.quest_completed", // ทำเควสสำเร็จ
  QUEST_PROGRESS_UPDATE = "gamification.quest_progress_update", // ความคืบหน้าเควส
  QUEST_REWARD_CLAIMED = "gamification.quest_reward_claimed", // รับรางวัลจากเควสสำเร็จ

  // Gamification (Leaderboards - สำหรับอนาคต)
  LEADERBOARD_RANK_UP = "gamification.leaderboard_rank_up", // อันดับใน Leaderboard สูงขึ้น
  LEADERBOARD_RANK_DOWN = "gamification.leaderboard_rank_down", // อันดับใน Leaderboard ลดลง
  LEADERBOARD_NEW_CHALLENGER = "gamification.leaderboard_new_challenger", // มีผู้ท้าชิงใหม่ใน Leaderboard
  LEADERBOARD_SEASON_START = "gamification.leaderboard_season_start", // เริ่มฤดูกาล Leaderboard ใหม่
  LEADERBOARD_SEASON_END_RESULTS = "gamification.leaderboard_season_end_results", // สรุปผลและรางวัลสิ้นสุดฤดูกาล Leaderboard

  // System & Account
  PLATFORM_ANNOUNCEMENT = "system.platform_announcement", // ประกาศจากแพลตฟอร์ม
  ACCOUNT_SECURITY_ALERT = "system.account_security_alert", // การแจ้งเตือนความปลอดภัยบัญชี
  CONTENT_MODERATION_UPDATE = "system.content_moderation_update", // การอัปเดตสถานะการตรวจสอบเนื้อหา
  TERMS_OF_SERVICE_UPDATE = "system.terms_of_service_update", // อัปเดตข้อกำหนดการให้บริการ
  CONTENT_REPORT_STATUS_UPDATE = "system.content_report_status_update", // อัปเดตสถานะการรายงานเนื้อหา
  CONTENT_POLICY_VIOLATION = "system.content_policy_violation", // การละเมิดนโยบายเนื้อหา

  // Monetization & Support
  DONATION_RECEIVED = "monetization.donation_received", // ได้รับการบริจาค
  PURCHASE_COMPLETED = "monetization.purchase_completed", // การซื้อสำเร็จ
  PAYMENT_SUCCEEDED = "monetization.payment_succeeded", // การชำระเงินสำเร็จ
  PAYMENT_FAILED = "monetization.payment_failed", // การชำระเงินล้มเหลว
  SUBSCRIPTION_UPDATE = "monetization.subscription_update", // อัปเดตสถานะการสมัครสมาชิก
  EARNING_SUMMARY_READY = "monetization.earning_summary_ready", // สรุปรายได้พร้อมให้ตรวจสอบ

  // Promotional & Engagement
  FEATURE_HIGHLIGHT = "promotion.feature_highlight", // แนะนำฟีเจอร์ใหม่หรือน่าสนใจ
  RECOMMENDED_NOVEL = "promotion.recommended_novel", // แนะนำนิยายที่อาจสนใจ
  EVENT_REMINDER = "promotion.event_reminder", // การแจ้งเตือนกิจกรรม
  SURVEY_INVITATION = "promotion.survey_invitation", // เชิญชวนทำแบบสำรวจ

  OTHER = "other", // ประเภทอื่นๆ (ควรใช้ให้น้อยที่สุด)
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
 * - `CRITICAL`: วิกฤตอย่างยิ่ง, ต้องการการดำเนินการทันที (อาจจะซ้อนกับ Priority)
 */
export enum NotificationSeverity {
  INFO = "info",
  WARNING = "warning",
  SUCCESS = "success",
  ERROR = "error",
  CRITICAL = "critical", // เพิ่มเข้ามาเพื่อความชัดเจนยิ่งขึ้น
}

/**
 * @interface INotificationAction
 * @description การกระทำที่ผู้ใช้สามารถทำได้กับการแจ้งเตือน
 * @property {string} label - ข้อความที่แสดงบนปุ่มหรือลิงก์ (เช่น "ดูเลย", "ตอบกลับ")
 * @property {string} url - URL ที่จะนำผู้ใช้ไปเมื่อคลิก
 * @property {string} [actionType] - ประเภทของการกระทำ (เช่น "navigate", "api_call", "claim_reward")
 * @property {string} [icon] - (ใหม่) ไอคอนสำหรับ Action (ชื่อไอคอนจาก library หรือ URL)
 */
export interface INotificationAction {
  label: string;
  url: string;
  actionType?: string;
  icon?: string;
}
const NotificationActionSchema = new Schema<INotificationAction>(
  {
    label: { type: String, required: true, trim: true, maxlength: [50, "ข้อความบนปุ่มต้องไม่เกิน 50 ตัวอักษร"] },
    url: { type: String, required: true, trim: true, maxlength: [2048, "URL ของ Action ยาวเกินไป"] },
    actionType: { type: String, trim: true, default: "navigate", maxlength: [50, "ประเภท Action ยาวเกินไป"] },
    icon: {type: String, trim: true, maxlength: [100, "ชื่อ/URL ไอคอน Action ยาวเกินไป"]},
  },
  { _id: false }
);

/**
 * @interface INotificationContext
 * @description ข้อมูลเพิ่มเติมที่เกี่ยวข้องกับการแจ้งเตือน (Contextual Data)
 * ใช้สำหรับสร้างข้อความแจ้งเตือนแบบ Dynamic และสำหรับการเชื่อมโยงไปยังเนื้อหา
 * @property {Types.ObjectId | IUser} [sourceUserId] - ID ผู้ใช้ที่เป็นต้นเหตุ (เช่น คนที่ follow, comment)
 * @property {string} [sourceUsername] - (Denormalized) ชื่อผู้ใช้ต้นเหตุ
 * @property {string} [sourceUserAvatar] - (Denormalized) URL รูปโปรไฟล์ผู้ใช้ต้นเหตุ
 * @property {Types.ObjectId | INovel} [novelId] - ID นิยายที่เกี่ยวข้อง
 * @property {string} [novelTitle] - (Denormalized) ชื่อนิยาย
 * @property {Types.ObjectId | IEpisode} [episodeId] - ID ตอนที่เกี่ยวข้อง
 * @property {string} [episodeTitle] - (Denormalized) ชื่อตอน
 * @property {Types.ObjectId | IComment} [commentId] - ID ความคิดเห็นที่เกี่ยวข้อง
 * @property {string} [commentSnippet] - (Denormalized) ส่วนหนึ่งของความคิดเห็น
 * @property {Types.ObjectId | IAchievement} [achievementId] - ID ของ Achievement ต้นแบบที่ปลดล็อก
 * @property {string} [achievementCode] - (Denormalized) รหัสของ Achievement
 * @property {string} [achievementName] - (Denormalized) ชื่อ Achievement
 * @property {string} [achievementIconUrl] - (Denormalized, ใหม่) URL ไอคอนของ Achievement
 * @property {Types.ObjectId | IBadge} [badgeId] - ID ของ Badge ต้นแบบที่ได้รับ
 * @property {string} [badgeKey] - (Denormalized) Key ของ Badge
 * @property {string} [badgeName] - (Denormalized) ชื่อ Badge
 * @property {string} [badgeIconUrl] - (Denormalized, ใหม่) URL ไอคอนของ Badge
 * @property {Types.ObjectId} [userEarnedItemId] - ID ของ UserEarnedItem (ใน UserAchievement) ที่บันทึกการได้รับนี้
 * @property {number} [xpEarned] - จำนวน XP ที่ได้รับ
 * @property {number} [coinsEarned] - จำนวน Coins ที่ได้รับ
 * @property {string} [itemRewardType] - ประเภทของไอเท็มพิเศษที่ได้รับ (เช่น "PROFILE_FRAME", "EXCLUSIVE_CONTENT_ACCESS")
 * @property {string} [itemRewardName] - ชื่อของไอเท็มพิเศษที่ได้รับ
 * @property {string} [itemRewardIconUrl] - (ใหม่) URL ไอคอนของไอเท็มพิเศษที่ได้รับ
 * @property {number} [newLevel] - เลเวลใหม่ที่ผู้ใช้ขึ้นถึง (สำหรับ NotificationType.LEVEL_UP)
 * @property {string} [levelTitle] - (Denormalized, ใหม่) ชื่อ/ฉายาของเลเวลใหม่
 * @property {string} [questId] - (ใหม่) ID ของเควส
 * @property {string} [questName] - (ใหม่) ชื่อเควส
 * @property {string} [questObjective] - (ใหม่, Denormalized) เป้าหมายของเควส (สั้นๆ)
 * @property {string} [leaderboardId] - (ใหม่) ID ของ Leaderboard
 * @property {string} [leaderboardName] - (ใหม่) ชื่อ Leaderboard
 * @property {number} [rankAchieved] - (ใหม่) อันดับที่ได้ใน Leaderboard
 * @property {number} [previousRank] - (ใหม่) อันดับก่อนหน้าใน Leaderboard
 * @property {Types.ObjectId | IPurchase} [purchaseId] - ID การซื้อที่เกี่ยวข้อง
 * @property {string} [moderationAction] - (ใหม่) การดำเนินการของ Moderator (เช่น "comment_removed", "warning_issued")
 * @property {string} [reportedContentSnippet] - (ใหม่) ส่วนหนึ่งของเนื้อหาที่ถูกรายงาน (ถ้าเกี่ยวข้อง)
 * @property {any} [customData] - ข้อมูลอื่นๆ ที่อาจจำเป็นตามประเภทการแจ้งเตือน
 */
export interface INotificationContext {
  sourceUserId?: Types.ObjectId | IUser;
  sourceUsername?: string;
  sourceUserAvatar?: string;
  novelId?: Types.ObjectId | INovel;
  novelTitle?: string;
  episodeId?: Types.ObjectId | IEpisode;
  episodeTitle?: string;
  commentId?: Types.ObjectId | IComment;
  commentSnippet?: string;
  achievementId?: Types.ObjectId | IAchievement;
  achievementCode?: string;
  achievementName?: string;
  achievementIconUrl?: string;
  badgeId?: Types.ObjectId | IBadge;
  badgeKey?: string;
  badgeName?: string;
  badgeIconUrl?: string;
  userEarnedItemId?: Types.ObjectId; // สำคัญ: ID ของ UserEarnedItem จาก UserAchievement.ts
  xpEarned?: number;
  coinsEarned?: number;
  itemRewardType?: string;
  itemRewardName?: string;
  itemRewardIconUrl?: string;
  newLevel?: number;
  levelTitle?: string;
  questId?: string;
  questName?: string;
  questObjective?: string;
  leaderboardId?: string;
  leaderboardName?: string;
  rankAchieved?: number;
  previousRank?: number;
  purchaseId?: Types.ObjectId | IPurchase;
  moderationAction?: string;
  reportedContentSnippet?: string;
  customData?: any;
}

const NotificationContextSchema = new Schema<INotificationContext>(
  {
    sourceUserId: { type: Schema.Types.ObjectId, ref: "User" },
    sourceUsername: { type: String, trim: true, maxlength: [100, "ชื่อผู้ใช้ต้นเหตุยาวเกินไป"] },
    sourceUserAvatar: { type: String, trim: true, maxlength: [2048, "URL รูป Avatar ยาวเกินไป"] },
    novelId: { type: Schema.Types.ObjectId, ref: "Novel" },
    novelTitle: { type: String, trim: true, maxlength: [255, "ชื่อนิยายยาวเกินไป"] },
    episodeId: { type: Schema.Types.ObjectId, ref: "Episode" },
    episodeTitle: { type: String, trim: true, maxlength: [255, "ชื่อตอนยาวเกินไป"] },
    commentId: { type: Schema.Types.ObjectId, ref: "Comment" },
    commentSnippet: { type: String, trim: true, maxlength: [150, "ส่วนของความคิดเห็นยาวเกินไป"] },
    achievementId: { type: Schema.Types.ObjectId, ref: "Achievement", comment: "ID ของ Achievement ต้นแบบ" },
    achievementCode: { type: String, trim: true, maxlength: [100, "รหัส Achievement ยาวเกินไป"] },
    achievementName: { type: String, trim: true, maxlength: [200, "ชื่อ Achievement ยาวเกินไป"] },
    achievementIconUrl: { type: String, trim: true, maxlength: [2048, "URL ไอคอน Achievement ยาวเกินไป"]},
    badgeId: { type: Schema.Types.ObjectId, ref: "Badge", comment: "ID ของ Badge ต้นแบบ" },
    badgeKey: { type: String, trim: true, maxlength: [100, "Key ของ Badge ยาวเกินไป"] },
    badgeName: { type: String, trim: true, maxlength: [150, "ชื่อ Badge ยาวเกินไป"] },
    badgeIconUrl: { type: String, trim: true, maxlength: [2048, "URL ไอคอน Badge ยาวเกินไป"]},
    userEarnedItemId: { type: Schema.Types.ObjectId, comment: "ID ของ UserEarnedItem ใน UserAchievement" },
    xpEarned: { type: Number, min: 0 },
    coinsEarned: { type: Number, min: 0 },
    itemRewardType: { type: String, trim: true, maxlength: [100, "ประเภท Item Reward ยาวเกินไป"] },
    itemRewardName: { type: String, trim: true, maxlength: [150, "ชื่อ Item Reward ยาวเกินไป"] },
    itemRewardIconUrl: { type: String, trim: true, maxlength: [2048, "URL ไอคอน Item Reward ยาวเกินไป"]},
    newLevel: { type: Number, min: 1 },
    levelTitle: { type: String, trim: true, maxlength: [100, "ชื่อ/ฉายา Level ยาวเกินไป"]},
    questId: { type: String, trim: true, maxlength: [100, "ID ของ Quest ยาวเกินไป"]},
    questName: { type: String, trim: true, maxlength: [200, "ชื่อ Quest ยาวเกินไป"] },
    questObjective: { type: String, trim: true, maxlength: [255, "เป้าหมาย Quest ยาวเกินไป"] },
    leaderboardId: { type: String, trim: true, maxlength: [100, "ID ของ Leaderboard ยาวเกินไป"]},
    leaderboardName: { type: String, trim: true, maxlength: [150, "ชื่อ Leaderboard ยาวเกินไป"] },
    rankAchieved: { type: Number, min: 1 },
    previousRank: { type: Number, min: 0 }, // 0 อาจหมายถึงยังไม่เคยมีอันดับ
    purchaseId: { type: Schema.Types.ObjectId, ref: "Purchase" },
    moderationAction: { type: String, trim: true, maxlength: [100, "Moderation Action ยาวเกินไป"]},
    reportedContentSnippet: { type: String, trim: true, maxlength: [200, "ส่วนเนื้อหาที่ถูกรายงานยาวเกินไป"]},
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
 * @property {NotificationSeverity} severity - ระดับความรุนแรงของการแจ้งเตือน (default: INFO, หรือ SUCCESS สำหรับ gamification)
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
  recipientId: Types.ObjectId | IUser; // ID ผู้รับ
  type: NotificationType; // ประเภทการแจ้งเตือน
  severity: NotificationSeverity; // ระดับความรุนแรง
  title: string; // หัวข้อ
  message: string; // เนื้อหา
  iconUrl?: string; // URL ไอคอน
  context: INotificationContext; // ข้อมูลบริบท
  actions?: Types.DocumentArray<INotificationAction>; // การกระทำที่เป็นไปได้
  primaryActionUrl?: string; // URL หลักเมื่อคลิก
  isRead: boolean; // อ่านแล้วหรือยัง
  readAt?: Date; // วันที่อ่าน
  isArchived: boolean; // เก็บเข้าคลังแล้วหรือยัง
  archivedAt?: Date; // วันที่เก็บเข้าคลัง
  channels: NotificationChannel[]; // ช่องทางที่ส่ง
  priority: NotificationPriority; // ระดับความสำคัญ
  expiresAt?: Date; // วันหมดอายุ (ถ้ามี)
  correlationId?: string; // ID เชื่อมโยง
  schemaVersion: number; // เวอร์ชัน Schema
  createdAt: Date; // วันที่สร้าง (Mongoose)
  updatedAt: Date; // วันที่อัปเดต (Mongoose)
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
    severity: { // Default severity กำหนดโดยอิงตาม type
      type: String,
      enum: Object.values(NotificationSeverity),
      default: function(this: INotification) {
          switch (this.type) {
            case NotificationType.ACHIEVEMENT_UNLOCKED:
            case NotificationType.BADGE_AWARDED:
            case NotificationType.LEVEL_UP:
            case NotificationType.REWARD_RECEIVED:
            case NotificationType.QUEST_COMPLETED:
            case NotificationType.QUEST_REWARD_CLAIMED:
            case NotificationType.LEADERBOARD_SEASON_END_RESULTS:
            case NotificationType.PAYMENT_SUCCEEDED:
            case NotificationType.PURCHASE_COMPLETED:
            case NotificationType.DONATION_RECEIVED:
              return NotificationSeverity.SUCCESS;
            case NotificationType.ACCOUNT_SECURITY_ALERT:
            case NotificationType.CONTENT_POLICY_VIOLATION:
            case NotificationType.TERMS_OF_SERVICE_UPDATE: // อาจจะเป็น WARNING หรือ INFO
              return NotificationSeverity.WARNING;
            case NotificationType.PAYMENT_FAILED:
              return NotificationSeverity.ERROR;
            // กรณีอื่นๆ สามารถเพิ่มได้ตามความเหมาะสม
            default:
              return NotificationSeverity.INFO;
          }
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
      default: () => ({}) // Default เป็น object ว่าง
    },
    actions: { type: [NotificationActionSchema], default: [] },
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
    expiresAt: { type: Date, index: true }, // วันหมดอายุ, เหมาะสำหรับโปรโมชั่น
    correlationId: { type: String, trim: true, index: true, maxlength: [100, "Correlation ID ยาวเกินไป"] }, // ID เชื่อมโยงการแจ้งเตือนชุดเดียวกัน
    schemaVersion: { type: Number, default: 2, min: 1 }, // ปรับเวอร์ชัน Schema
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
NotificationSchema.index({ channels: 1, createdAt: 1 }, { name: "NotificationQueueProcessingIndex" }); // อาจใช้สำหรับ Background Job ที่ส่ง Notification
NotificationSchema.index({ expiresAt: 1 }, { name: "NotificationExpiryIndex", sparse: true }); // Sparse index สำหรับ field ที่อาจไม่มีค่า

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

/**
 * @function updateUserUnreadNotificationCount
 * @description อัปเดตจำนวนการแจ้งเตือนที่ยังไม่อ่านของผู้ใช้ใน User model
 * @param {Types.ObjectId} recipientId - ID ของผู้ใช้ที่รับการแจ้งเตือน
 *
 * **ข้อควรระวัง:** ฟังก์ชันนี้คาดหวังว่า User model จะมี field สำหรับเก็บจำนวนการแจ้งเตือนที่ยังไม่อ่าน
 * ใน User.ts ที่ให้มา ยังไม่มี field นี้โดยตรง (เช่น `user.preferences.notifications.unreadInAppCount`)
 * ผู้พัฒนาจำเป็นต้อง:
 * 1. เพิ่ม field ดังกล่าวใน User.ts (แนะนำให้อยู่ใน `IUserPreferencesNotifications`)
 * 2. หรือ ปรับ logic การอัปเดตนี้ให้ไปเรียก Service Layer ที่จัดการ User Stats โดยเฉพาะ
 * 3. หรือ Comment out ส่วนที่อัปเดต User model หากยังไม่พร้อม
 */
async function updateUserUnreadNotificationCount(recipientId: Types.ObjectId) {
  const UserModel = models.User as mongoose.Model<IUser> | undefined; // ตรวจสอบว่า UserModel ถูก initialize
  const NotificationModelInstance = models.Notification as mongoose.Model<INotification>;

  if (!UserModel) {
      console.warn(`[Notification Middleware] UserModel not found. Skipping unread count update for user ${recipientId}.`);
      return;
  }

  try {
    const unreadCount = await NotificationModelInstance.countDocuments({
      recipientId: recipientId,
      channels: NotificationChannel.IN_APP, // นับเฉพาะ In-App notifications ที่ยังไม่อ่าน
      isRead: false,
      isArchived: false, // ไม่นับที่เก็บเข้าคลังแล้ว
    });

    // สมมติว่า User model มี field: user.preferences.notifications.unreadInAppCount
    // โปรดตรวจสอบและปรับปรุง path นี้ให้ตรงกับโครงสร้าง User.ts ของคุณ
    const updatePath = "preferences.notifications.unreadInAppCount"; // << ตรวจสอบ PATH นี้ใน User.ts!

    await UserModel.findByIdAndUpdate(recipientId, { $set: { [updatePath]: unreadCount } });
    console.log(`[Notification Middleware] User ${recipientId} unread In-App notification count updated to ${unreadCount}.`);

  } catch (error) {
    console.error(`[Notification Middleware Error] Failed to update unread notification count for user ${recipientId}:`, error);
  }
}

// Hook: หลังจากการบันทึก (save)
NotificationSchema.post<INotification>("save", async function (doc) {
  // อัปเดต unread count ถ้าเป็น notification ใหม่, หรือสถานะ isRead/isArchived ของ In-App notification เปลี่ยนไป
  if (doc.channels.includes(NotificationChannel.IN_APP) && (doc.isNew || doc.isModified("isRead") || doc.isModified("isArchived"))) {
    await updateUserUnreadNotificationCount(doc.recipientId as Types.ObjectId);
  }
});

// Hook: หลังจากการอัปเดต (findOneAndUpdate)
NotificationSchema.post<mongoose.Query<INotification | null, INotification>>("findOneAndUpdate", async function (result) {
  const update = this.getUpdate() as any;
  const filter = this.getFilter();

  // ตรวจสอบว่ามีการแก้ไข isRead หรือ isArchived
  const fieldsModified = (update?.$set?.isRead !== undefined || update?.$set?.isArchived !== undefined || update?.isRead !== undefined || update?.isArchived !== undefined);

  if (fieldsModified) {
    let recipientToUpdate: Types.ObjectId | null = null;
    let channelsInvolved: NotificationChannel[] | undefined;

    // พยายามหา recipientId และ channels จากผลลัพธ์หรือ filter
    if (result && "recipientId" in result && !("modifiedCount" in result)) { // กรณี findOneAndUpdate trả về document
      recipientToUpdate = result.recipientId as Types.ObjectId;
      channelsInvolved = result.channels;
    } else if (filter.recipientId) { // กรณีมี recipientId ใน filter โดยตรง
      recipientToUpdate = filter.recipientId as Types.ObjectId;
      // ถ้า filter มี channels ด้วยก็ใช้, หรือ query มาอีกที (แต่จะซับซ้อน)
      // เพื่อความง่าย หากมีการ update isRead/isArchived และมี recipientId ก็จะพยายาม update count
      // โดยไม่สน channel ก่อน แล้วให้ updateUserUnreadNotificationCount กรอง channel เอง
    } else if (filter._id) { // กรณี update ด้วย _id
      const doc = await (models.Notification as mongoose.Model<INotification>).findById(filter._id).select("recipientId channels").lean();
      if (doc) {
        recipientToUpdate = doc.recipientId as Types.ObjectId;
        channelsInvolved = doc.channels;
      }
    }

    // อัปเดต unread count ถ้าหา recipientId ได้ และเกี่ยวข้องกับ In-App channel
    if (recipientToUpdate && (!channelsInvolved || channelsInvolved.includes(NotificationChannel.IN_APP))) {
      await updateUserUnreadNotificationCount(recipientToUpdate);
    }
  }
});


// Hook: หลังจากการลบ (findOneAndDelete, deleteOne)
NotificationSchema.post<mongoose.Query<INotification, INotification>>(["findOneAndDelete", "deleteOne"], async function (doc) {
    // doc ที่ได้จาก hook นี้คือ document ที่ถูกลบ
    if (doc && "recipientId" in doc && "channels" in doc) {
        const notification = doc as INotification;
        if (notification.channels.includes(NotificationChannel.IN_APP)) {
             await updateUserUnreadNotificationCount(notification.recipientId as Types.ObjectId);
        }
    }
});

// Hook: หลังจากการลบหลายรายการ (deleteMany)
NotificationSchema.post<mongoose.Query<any, any>>("deleteMany", async function (result) {
  const filter = this.getFilter();
  // หากการลบมีเงื่อนไข recipientId, ให้อัปเดต unread count ของ user นั้น
  if (filter.recipientId) {
    // เราไม่รู้ว่าที่ลบไปมี in_app channel หรือไม่ จึงต้องคำนวณใหม่ทั้งหมด
    await updateUserUnreadNotificationCount(filter.recipientId as Types.ObjectId);
  } else {
    // หากลบโดยไม่มี recipientId เฉพาะเจาะจง (เช่น ลบ Notification เก่าทั้งหมด)
    // การอัปเดต unread count จะซับซ้อน อาจจะต้อง re-calculate ของ user ทุกคนที่มีผลกระทบ
    // หรือ Service Layer จะต้องจัดการกรณีนี้เป็นพิเศษ
    console.warn("[Notification Middleware] deleteMany without specific recipientId. Unread counts might need broader recalculation or handling by a dedicated service.");
  }
});


// ==================================================================================================
// SECTION: Static Methods (เมธอดสำหรับ Model Notification)
// ==================================================================================================

/**
 * @static markAsRead
 * @description ทำเครื่องหมายการแจ้งเตือนเดียวว่าอ่านแล้ว
 * @param {Types.ObjectId} notificationId - ID ของการแจ้งเตือน
 * @returns {Promise<INotification | null>} - เอกสารการแจ้งเตือนที่อัปเดตแล้ว หรือ null ถ้าไม่พบ
 */
NotificationSchema.statics.markAsRead = async function (notificationId: Types.ObjectId): Promise<INotification | null> {
  return this.findByIdAndUpdate(notificationId, { $set: { isRead: true, readAt: new Date() } }, { new: true });
};

/**
 * @static markAllAsRead
 * @description ทำเครื่องหมายการแจ้งเตือน In-App ทั้งหมดของผู้ใช้ว่าอ่านแล้ว
 * @param {Types.ObjectId} recipientId - ID ของผู้ใช้
 * @returns {Promise<mongoose.UpdateWriteOpResult>} - ผลลัพธ์การอัปเดตจาก Mongoose
 */
NotificationSchema.statics.markAllAsRead = async function (recipientId: Types.ObjectId): Promise<mongoose.UpdateWriteOpResult> {
  const result = await this.updateMany(
    { recipientId: recipientId, channels: NotificationChannel.IN_APP, isRead: false, isArchived: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
  // ไม่จำเป็นต้องเรียก updateUserUnreadNotificationCount ซ้ำที่นี่ เพราะ post("updateMany") จะไม่ถูก trigger โดยตรง
  // แต่การ updateMany จะทำให้ count เป็น 0 อย่างถูกต้องในครั้งถัดไปที่นับ
  // หรือถ้าต้องการให้ update ทันที ต้องเรียกเอง:
  if (result.modifiedCount > 0) {
     await updateUserUnreadNotificationCount(recipientId);
  }
  return result;
};


/**
 * @static archiveNotification
 * @description เก็บการแจ้งเตือนเข้าคลัง
 * @param {Types.ObjectId} notificationId - ID ของการแจ้งเตือน
 * @returns {Promise<INotification | null>}
 */
NotificationSchema.statics.archiveNotification = async function (notificationId: Types.ObjectId): Promise<INotification | null> {
  return this.findByIdAndUpdate(notificationId, { $set: { isArchived: true, archivedAt: new Date() } }, { new: true });
};

/**
 * @static unarchiveNotification
 * @description นำการแจ้งเตือนออกจากคลัง
 * @param {Types.ObjectId} notificationId - ID ของการแจ้งเตือน
 * @returns {Promise<INotification | null>}
 */
NotificationSchema.statics.unarchiveNotification = async function (notificationId: Types.ObjectId): Promise<INotification | null> {
  return this.findByIdAndUpdate(notificationId, { $set: { isArchived: false, $unset: { archivedAt: "" } } }, { new: true });
};


// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================
const NotificationModel =
  (models.Notification as mongoose.Model<INotification>) ||
  model<INotification>("Notification", NotificationSchema);

export default NotificationModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements) - ปรับปรุงล่าสุด
// ==================================================================================================
// 1.  **การทำงานร่วมกับ Gamification Service (ยืนยันและขยายความ)**:
//     -   เมื่อ Gamification Service ตรวจพบการปลดล็อก Achievement/Badge, Level Up, หรือการได้รับรางวัล:
//         -   Service จะสร้าง Notification document ใหม่.
//         -   `recipientId` คือ User ID.
//         -   `type` จะเป็น `ACHIEVEMENT_UNLOCKED`, `BADGE_AWARDED`, `LEVEL_UP`, `REWARD_RECEIVED`, `QUEST_COMPLETED` ฯลฯ.
//         -   `context` จะถูก populate อย่างละเอียด:
//             -   `sourceUserId`: (ถ้ามี) เช่น ผู้ดูแลระบบที่มอบรางวัลพิเศษ.
//             -   `achievementId`, `badgeId`: ID ของ *Achievement/Badge ต้นแบบ* (จาก collection `achievements` หรือ `badges`).
//             -   `achievementName`, `badgeName`, `achievementCode`, `badgeKey`: Denormalized data จากต้นแบบ.
//             -   `achievementIconUrl`, `badgeIconUrl`: (ใหม่) Denormalized icon URLs จากต้นแบบ Achievement/Badge.
//             -   `userEarnedItemId`: (สำคัญมาก) ID ของ `UserEarnedItem` (จาก `UserAchievement.earnedItems._id`) ที่บันทึกการได้รับครั้งนี้.
//                  นี่คือ link โดยตรงไปยัง "อินสแตนซ์" ของรางวัลที่ผู้ใช้ได้รับ.
//             -   `xpEarned`, `coinsEarned`: จำนวนที่ผู้ใช้ได้รับจากการปลดล็อกนี้.
//             -   `itemRewardType`, `itemRewardName`, `itemRewardIconUrl`: (ใหม่) หากรางวัลเป็นไอเท็มพิเศษ (เช่น กรอบโปรไฟล์, จาก `Achievement.rewards.grantedFeatureUnlockKey` หรือ `grantedCosmeticItemKey`).
//             -   `newLevel`: Level ใหม่ของผู้ใช้.
//             -   `levelTitle`: (ใหม่) ชื่อ/ฉายาของ Level ใหม่ (จาก `Level.levelTitle`).
//             -   `questId`, `questName`, `questObjective`: สำหรับการแจ้งเตือนเควส.
//             -   `leaderboardId`, `leaderboardName`, `rankAchieved`, `previousRank`: สำหรับการแจ้งเตือน Leaderboard.
//     -   `title` และ `message` ของ Notification ควรสั้นและน่าสนใจ, UI อาจจะใช้ข้อมูลจาก `context` มาประกอบการแสดงผลให้ phong phú มากขึ้น.
// 2.  **Gamification Notification Types (ยืนยัน)**:
//     -   `ACHIEVEMENT_UNLOCKED`, `BADGE_AWARDED`, `LEVEL_UP`, `REWARD_RECEIVED` (สำหรับ XP/Coins ทั่วไป).
//     -   `QUEST_ASSIGNED`, `QUEST_COMPLETED`, `QUEST_PROGRESS_UPDATE`, `QUEST_REWARD_CLAIMED`.
//     -   `LEADERBOARD_RANK_UP`, `LEADERBOARD_RANK_DOWN`, `LEADERBOARD_NEW_CHALLENGER`, `LEADERBOARD_SEASON_START`, `LEADERBOARD_SEASON_END_RESULTS`.
//     -   `DAILY_REWARD_AVAILABLE`.
// 3.  **User Preferences for Notifications (ยืนยัน)**:
//     -   `User.preferences.notifications.achievementUnlocks` ควรครอบคลุม Achievements, Badges, Level Up, Rewards.
//     -   พิจารณาเพิ่ม categories ใหม่ใน `User.preferences.notifications` สำหรับ `questNotificationsEnabled`, `leaderboardNotificationsEnabled`
//         เพื่อให้ผู้ใช้ควบคุมได้ละเอียดยิ่งขึ้น. Gamification Service ต้องตรวจสอบ preferences เหล่านี้.
// 4.  **Notification Actions for Gamification (ขยายความ)**:
//     -   `ACHIEVEMENT_UNLOCKED`/`BADGE_AWARDED`:
//         -   Action 1: "ดูรายละเอียด" (URL ไปยังหน้าแสดง Achievement/Badge นั้น, อาจใช้ `context.achievementCode` หรือ `context.badgeKey`).
//         -   Action 2: "ไปยังคลังของฉัน" (URL ไปยังหน้าคลัง Achievement/Badge ของผู้ใช้).
//         -   Action 3: (ถ้า Badge) "ตั้งเป็น Badge หลัก/รอง" (URL ไปยังหน้าตั้งค่าโปรไฟล์).
//     -   `LEVEL_UP`: "ดูสิทธิประโยชน์ของเลเวล [newLevel]" (URL ไปยังหน้าข้อมูล Level).
//     -   `REWARD_RECEIVED`: "ดูประวัติรางวัล" (URL ไปยังหน้าประวัติการเงิน/รางวัล).
//     -   `QUEST_COMPLETED`: "รับรางวัลเควส" (ถ้าต้อง claim) หรือ "ดูเควสถัดไป".
// 5.  **Notification Severity (ยืนยัน)**: Default logic ใน Schema ช่วยกำหนด `severity` ที่เหมาะสม (ส่วนใหญ่เป็น `SUCCESS` สำหรับ Gamification).
// 6.  **Denormalized Data in Context (ยืนยันและเพิ่มเติม)**:
//     -   การเก็บ `achievementName`, `badgeName`, `levelTitle`, `questName`, `leaderboardName` รวมถึง Icon URLs (`achievementIconUrl`, `badgeIconUrl`, `itemRewardIconUrl`)
//         เป็นสิ่งที่ดีมากเพื่อลดการ query ซ้ำซ้อนในฝั่ง Client เมื่อแสดงรายการ Notifications.
//     -   Service ที่สร้าง Notification ต้องรับผิดชอบในการดึงข้อมูลเหล่านี้มาใส่ใน `context`.
// 7.  **Notification Batching/Throttling**:
//     -   สำหรับ events ที่อาจเกิดถี่ๆ (เช่น XP จากการอ่านหลายๆ ครั้งติดกัน) อาจจะไม่สร้าง Notification ทุกครั้ง แต่รวมเป็น "คุณได้รับ X XP จากการอ่านล่าสุด".
//     -   Leaderboard rank changes อาจจะแจ้งเตือนเมื่อมีการเปลี่ยนแปลงที่สำคัญ หรือสรุปรายวัน/สัปดาห์ แทนที่จะแจ้งทุกครั้งที่อันดับขยับเล็กน้อย.
// 8.  **User Unread Notification Count (สำคัญมาก - ต้องดำเนินการ)**:
//     -   Middleware `updateUserUnreadNotificationCount` ในปัจจุบันมีการ `console.warn` เรื่อง UserModel และ path สำหรับ unread count.
//     -   **สิ่งที่ต้องทำ**:
//         1.  ตัดสินใจว่าจะเก็บ unread In-App notification count ที่ใดใน `User.ts`. ตัวเลือกที่แนะนำ:
//             `User.preferences.notifications.unreadInAppCount: number` (เพิ่ม field นี้ใน `IUserPreferencesNotifications`).
//         2.  อัปเดต `updatePath` ใน `updateUserUnreadNotificationCount` ของ `Notification.ts` ให้ตรงกับ field ที่เลือก.
//         3.  ตรวจสอบว่า `UserPreferencesNotificationsSchema` ใน `User.ts` มี default value สำหรับ field ใหม่นี้ (เช่น 0).
//     -   การนับควรมุ่งเน้นไปที่ `channels: NotificationChannel.IN_APP` ที่ `isRead: false` และ `isArchived: false`.
// 9.  **Real-time Updates (ยืนยัน)**: การใช้ WebSockets (เช่น Socket.IO) ร่วมกับการสร้าง Notification ใน Backend
//     จะช่วยให้ผู้ใช้ได้รับประสบการณ์ In-App ที่ดีและทันท่วงที, โดยเฉพาะสำหรับ Gamification events.
// 10. **Schema Version**: ปรับ `schemaVersion` เป็น 2 เพื่อบ่งบอกว่ามีการเปลี่ยนแปลงโครงสร้าง.
// 11. **Contextual Icons**: `iconUrl` ใน `INotification` ควรเป็นไอคอนทั่วไปของการแจ้งเตือน.
//     ไอคอนเฉพาะของ Achievement, Badge, Item Reward ควรอยู่ใน `context` (`achievementIconUrl`, `badgeIconUrl`, `itemRewardIconUrl`).
//     UI สามารถเลือกใช้ไอคอนที่เหมาะสมจาก `context` หากมี, หรือ fallback ไปใช้ `iconUrl` หลัก.
// 12. **Clarity of IDs in Context**:
//      - `achievementId` / `badgeId` ใน context คือ ID ของ *Definition* (จาก `AchievementModel`, `BadgeModel`).
//      - `userEarnedItemId` คือ ID ของ *Instance* (จาก `UserAchievementModel.earnedItems`).
//      การแยกสองสิ่งนี้ชัดเจนเป็นสิ่งสำคัญ.
// ==================================================================================================