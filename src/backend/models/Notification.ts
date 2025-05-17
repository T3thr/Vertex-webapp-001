// src/backend/models/Notification.ts
// โมเดลการแจ้งเตือน (Notification Model)
// จัดการการแจ้งเตือนต่างๆ ที่ส่งไปยังผู้ใช้, รองรับหลายช่องทาง, และสามารถปรับแต่งได้

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IUser } from "./User"; // สำหรับ recipient และ sourceUserId
import { INovel } from "./Novel"; // สำหรับ novelId
import { IEpisode } from "./Episode"; // สำหรับ episodeId
import { IComment } from "./Comment"; // สำหรับ commentId
import { IAchievement } from "./Achievement"; // สำหรับ achievementId
import { IBadge } from "./Badge"; // สำหรับ badgeId
import { IPurchase } from "./Purchase"; // สำหรับ purchaseId

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Notification
// ==================================================================================================

/**
 * @enum {string} NotificationType
 * @description ประเภทของการแจ้งเตือน (สามารถขยายเพิ่มเติมได้ตามความต้องการของ NovelMaze)
 * SOCIAL: เกี่ยวกับกิจกรรมทางสังคม
 * CONTENT: เกี่ยวกับเนื้อหา (นิยาย, ตอน, ความคิดเห็น)
 * ACHIEVEMENT: เกี่ยวกับความสำเร็จและรางวัล
 * SYSTEM: เกี่ยวกับระบบและบัญชีผู้ใช้
 * MONETIZATION: เกี่ยวกับการเงินและการซื้อขาย
 * PROMOTION: เกี่ยวกับโปรโมชั่นและข่าวสาร
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
  LIKE_ON_NOVEL = "content.like_on_novel", // อาจพิจารณาเงื่อนไขการส่ง (เช่น ทุกๆ X likes)
  LIKE_ON_EPISODE = "content.like_on_episode",
  // Novel Updates (from followed novels/authors)
  NEW_EPISODE_RELEASE = "content.new_episode_release",
  NOVEL_UPDATE_ANNOUNCEMENT = "content.novel_update_announcement",
  FOLLOWED_AUTHOR_NEW_NOVEL = "content.followed_author_new_novel",
  // Achievements & Rewards (Gamification)
  ACHIEVEMENT_UNLOCKED = "achievement.unlocked",
  BADGE_AWARDED = "achievement.badge_awarded",
  DAILY_REWARD_AVAILABLE = "achievement.daily_reward_available",
  LEVEL_UP = "achievement.level_up",
  // System & Account
  PLATFORM_ANNOUNCEMENT = "system.platform_announcement",
  ACCOUNT_SECURITY_ALERT = "system.account_security_alert",
  CONTENT_MODERATION_UPDATE = "system.content_moderation_update", // เช่น เนื้อหาถูกอนุมัติ/ปฏิเสธ
  TERMS_OF_SERVICE_UPDATE = "system.terms_of_service_update",
  // Monetization & Support
  DONATION_RECEIVED = "monetization.donation_received", // สำหรับผู้เขียน
  PURCHASE_COMPLETED = "monetization.purchase_completed", // สำหรับผู้ซื้อ
  PAYMENT_SUCCEEDED = "monetization.payment_succeeded", // สำหรับผู้ซื้อ (ถ้าแยก Payment กับ Purchase)
  PAYMENT_FAILED = "monetization.payment_failed",
  SUBSCRIPTION_UPDATE = "monetization.subscription_update", // เช่น ต่ออายุ, หมดอายุ, ยกเลิก
  EARNING_SUMMARY_READY = "monetization.earning_summary_ready", // สำหรับผู้เขียน
  // Promotional & Engagement
  FEATURE_HIGHLIGHT = "promotion.feature_highlight",
  RECOMMENDED_NOVEL = "promotion.recommended_novel",
  EVENT_REMINDER = "promotion.event_reminder",
  OTHER = "other",
  CONTENT_REPORT_STATUS_UPDATE = "CONTENT_REPORT_STATUS_UPDATE",
  CONTENT_POLICY_VIOLATION = "CONTENT_POLICY_VIOLATION",
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
  SMS = "sms",
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
 * - `SUCCESS`: การดำเนินการสำเร็จ ผลลัพธ์เป็นบวก
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
 * @property {string} [actionType] - ประเภทของการกระทำ (เช่น "navigate", "api_call")
 */
export interface INotificationAction {
  label: string;
  url: string;
  actionType?: string;
}
const NotificationActionSchema = new Schema<INotificationAction>(
  {
    label: { type: String, required: true, trim: true, maxlength: [50, "ข้อความบนปุ่มต้องไม่เกิน 50 ตัวอักษร"] },
    url: { type: String, required: true, trim: true },
    actionType: { type: String, trim: true, default: "navigate" },
  },
  { _id: false }
);

/**
 * @interface INotificationContext
 * @description ข้อมูลเพิ่มเติมที่เกี่ยวข้องกับการแจ้งเตือน (Contextual Data)
 *              ใช้สำหรับสร้างข้อความแจ้งเตือนแบบ Dynamic และสำหรับการเชื่อมโยงไปยังเนื้อหา
 * @property {Types.ObjectId | IUser} [sourceUserId] - ID ผู้ใช้ที่เป็นต้นเหตุ (เช่น คนที่ follow, comment)
 * @property {Types.ObjectId | INovel} [novelId] - ID นิยายที่เกี่ยวข้อง
 * @property {Types.ObjectId | IEpisode} [episodeId] - ID ตอนที่เกี่ยวข้อง
 * @property {Types.ObjectId | IComment} [commentId] - ID ความคิดเห็นที่เกี่ยวข้อง
 * @property {Types.ObjectId | IAchievement} [achievementId] - ID ความสำเร็จที่ปลดล็อก
 * @property {Types.ObjectId | IBadge} [badgeId] - ID เหรียญตราที่ได้รับ
 * @property {Types.ObjectId | IPurchase} [purchaseId] - ID การซื้อที่เกี่ยวข้อง
 * @property {string} [novelTitle] - (Denormalized) ชื่อนิยาย
 * @property {string} [episodeTitle] - (Denormalized) ชื่อตอน
 * @property {string} [sourceUsername] - (Denormalized) ชื่อผู้ใช้ต้นเหตุ
 * @property {string} [sourceUserAvatar] - (Denormalized) URL รูปโปรไฟล์ผู้ใช้ต้นเหตุ
 * @property {string} [commentSnippet] - (Denormalized) ส่วนหนึ่งของความคิดเห็น
 * @property {string} [achievementName] - (Denormalized) ชื่อความสำเร็จ
 * @property {string} [badgeName] - (Denormalized) ชื่อเหรียญตรา
 * @property {any} [customData] - ข้อมูลอื่นๆ ที่อาจจำเป็นตามประเภทการแจ้งเตือน (เช่น จำนวนเงินที่บริจาค)
 */
export interface INotificationContext {
  sourceUserId?: Types.ObjectId | IUser;
  novelId?: Types.ObjectId | INovel;
  episodeId?: Types.ObjectId | IEpisode;
  commentId?: Types.ObjectId | IComment;
  achievementId?: Types.ObjectId | IAchievement;
  badgeId?: Types.ObjectId | IBadge;
  purchaseId?: Types.ObjectId | IPurchase;
  novelTitle?: string;
  episodeTitle?: string;
  sourceUsername?: string;
  sourceUserAvatar?: string;
  commentSnippet?: string;
  achievementName?: string;
  badgeName?: string;
  customData?: any;
}
const NotificationContextSchema = new Schema<INotificationContext>(
  {
    sourceUserId: { type: Schema.Types.ObjectId, ref: "User" },
    novelId: { type: Schema.Types.ObjectId, ref: "Novel" },
    episodeId: { type: Schema.Types.ObjectId, ref: "Episode" },
    commentId: { type: Schema.Types.ObjectId, ref: "Comment" },
    achievementId: { type: Schema.Types.ObjectId, ref: "Achievement" },
    badgeId: { type: Schema.Types.ObjectId, ref: "Badge" },
    purchaseId: { type: Schema.Types.ObjectId, ref: "Purchase" },
    novelTitle: { type: String, trim: true, maxlength: [255, "ชื่อนิยายยาวเกินไป"] },
    episodeTitle: { type: String, trim: true, maxlength: [255, "ชื่อตอนยาวเกินไป"] },
    sourceUsername: { type: String, trim: true, maxlength: [100, "ชื่อผู้ใช้ต้นเหตุยาวเกินไป"] },
    sourceUserAvatar: { type: String, trim: true },
    commentSnippet: { type: String, trim: true, maxlength: [150, "ส่วนของความคิดเห็นยาวเกินไป"] },
    achievementName: { type: String, trim: true, maxlength: [150, "ชื่อความสำเร็จยาวเกินไป"] },
    badgeName: { type: String, trim: true, maxlength: [150, "ชื่อเหรียญตรายาวเกินไป"] },
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
    iconUrl: { type: String, trim: true },
    context: { 
      type: NotificationContextSchema, 
      required: [true, "กรุณาระบุข้อมูลบริบท (Context is required)"], 
      default: () => ({}) 
    },
    actions: [NotificationActionSchema],
    primaryActionUrl: { type: String, trim: true },
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

// Index หลักสำหรับการ query การแจ้งเตือนของผู้ใช้ (เรียงตามวันที่สร้างล่าสุด, กรองตามการอ่าน/จัดเก็บ)
NotificationSchema.index({ recipientId: 1, isArchived: 1, isRead: 1, createdAt: -1 }, { name: "UserNotificationsQueryIndex" });
NotificationSchema.index({ recipientId: 1, type: 1, createdAt: -1 }, { name: "UserNotificationsByTypeIndex" });
NotificationSchema.index({ channels: 1, status: 1, priority: 1, createdAt: 1 }, { name: "NotificationQueueProcessingIndex" }); // สำหรับระบบ worker ที่ส่งการแจ้งเตือน
NotificationSchema.index({ expiresAt: 1 }, { name: "NotificationExpiryIndex", sparse: true }); // สำหรับลบการแจ้งเตือนที่หมดอายุ

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

/**
 * @function updateUserUnreadNotificationCount
 * @description อัปเดตจำนวนการแจ้งเตือนที่ยังไม่อ่านของผู้ใช้ใน User model
 * @param recipientId ID ของผู้ใช้
 */
async function updateUserUnreadNotificationCount(recipientId: Types.ObjectId) {
  const UserModel = models.User as mongoose.Model<IUser>;
  const NotificationModelInstance = models.Notification as mongoose.Model<INotification>;
  try {
    const unreadCount = await NotificationModelInstance.countDocuments({
      recipientId: recipientId,
      isRead: false,
      isArchived: false, // นับเฉพาะที่ยังไม่อ่านและยังไม่จัดเก็บ
    });
    await UserModel.findByIdAndUpdate(recipientId, { "activityTracking.unreadNotificationsCount": unreadCount });
  } catch (error) {
    console.error(`[Notification Middleware Error] Failed to update unread notification count for user ${recipientId}:`, error);
    // ควรมีระบบ logging ที่ดีกว่านี้
  }
}

// Hook หลังจาก save: ถ้าเป็นการแจ้งเตือนใหม่ หรือมีการแก้ไข isRead/isArchived ให้อัปเดต unread count
NotificationSchema.post<INotification>("save", async function (doc) {
  if (doc.isNew || doc.isModified("isRead") || doc.isModified("isArchived")) {
    await updateUserUnreadNotificationCount(doc.recipientId as Types.ObjectId);
  }
});

// Hook หลังจาก findOneAndUpdate: ถ้ามีการแก้ไข isRead/isArchived ให้อัปเดต unread count
// หมายเหตุ: this.getFilter() และ this.getUpdate() ใช้ได้กับ Mongoose 5.x+
NotificationSchema.post<mongoose.Query<INotification | null, INotification>>("findOneAndUpdate", async function (result) {
  const update = this.getUpdate() as any;
  const filter = this.getFilter();

  // ตรวจสอบว่ามีการแก้ไข isRead หรือ isArchived หรือไม่
  const fieldsModified = (
    update?.$set?.isRead !== undefined ||
    update?.$set?.isArchived !== undefined ||
    update?.isRead !== undefined ||
    update?.isArchived !== undefined
  );

  if (fieldsModified) {
    let recipientToUpdate: Types.ObjectId | null = null;

    // ตรวจสอบว่า result เป็น INotification และมี recipientId
    if (result && "recipientId" in result && !("modifiedCount" in result)) {
      recipientToUpdate = result.recipientId as Types.ObjectId;
    } else if (filter.recipientId) {
      // ถ้า result ไม่มี recipientId, ลองดึงจาก filter
      recipientToUpdate = filter.recipientId as Types.ObjectId;
    } else if (filter._id) {
      // ถ้า filter มี _id, query หา recipientId
      const doc = await (models.Notification as mongoose.Model<INotification>)
        .findById(filter._id)
        .select("recipientId")
        .lean();
      if (doc) recipientToUpdate = doc.recipientId as Types.ObjectId;
    }

    if (recipientToUpdate) {
      await updateUserUnreadNotificationCount(recipientToUpdate);
    }
  }
});

// Hook หลังจาก findOneAndDelete, deleteOne: ถ้าลบการแจ้งเตือนที่ยังไม่อ่าน/ไม่จัดเก็บ ให้อัปเดต unread count
NotificationSchema.post<mongoose.Query<INotification, INotification>>(["findOneAndDelete", "deleteOne"], async function (doc) {
  // ตรวจสอบว่า doc เป็น INotification และมี isRead, isArchived
  if (doc && "modifiedCount" in doc === false && "isRead" in doc && "isArchived" in doc) {
    const notification = doc as INotification;
    if (!notification.isRead && !notification.isArchived) {
      await updateUserUnreadNotificationCount(notification.recipientId as Types.ObjectId);
    }
  }
});

// Hook หลังจาก deleteMany: อัปเดต unread count สำหรับผู้ใช้ที่ได้รับผลกระทบ
// การทำเช่นนี้อาจมี performance impact ถ้าลบจำนวนมาก ควรพิจารณา batch update หรือ re-calculate เป็นระยะ
NotificationSchema.post<mongoose.Query<any, any>>("deleteMany", async function (result) {
  const filter = this.getFilter();
  // ถ้า filter มี recipientId, ให้อัปเดตเฉพาะผู้ใช้นั้น
  if (filter.recipientId) {
    await updateUserUnreadNotificationCount(filter.recipientId as Types.ObjectId);
  } else {
    // ถ้า filter ไม่มี recipientId (เช่น ลบตามเงื่อนไขอื่น), การอัปเดต unread count จะซับซ้อน
    // อาจจะต้อง queryหา distinct recipientIds ที่ได้รับผลกระทบ หรือมี job background คอย re-calculate
    console.warn("[Notification Middleware] deleteMany without specific recipientId. Unread counts might need broader recalculation.");
    // ตัวอย่าง (อาจมี performance issue): 
    // const distinctRecipients = await (models.Notification as mongoose.Model<INotification>).distinct("recipientId", filter);
    // for (const recipientId of distinctRecipients) {
    //   await updateUserUnreadNotificationCount(recipientId);
    // }
  }
});

// ==================================================================================================
// SECTION: Static Methods (เมธอดสำหรับ Model Notification)
// ==================================================================================================

/**
 * @static markAsRead
 * @description ทำเครื่องหมายการแจ้งเตือนเป็น "อ่านแล้ว"
 * @param notificationId ID ของการแจ้งเตือน
 * @returns {Promise<INotification | null>} การแจ้งเตือนที่อัปเดตแล้ว
 */
NotificationSchema.statics.markAsRead = async function (
  notificationId: Types.ObjectId
): Promise<INotification | null> {
  return this.findByIdAndUpdate(
    notificationId,
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  );
};

/**
 * @static markAllAsRead
 * @description ทำเครื่องหมายการแจ้งเตือนทั้งหมดของผู้ใช้เป็น "อ่านแล้ว"
 * @param recipientId ID ของผู้ใช้
 * @returns {Promise<mongoose.UpdateWriteOpResult>} ผลลัพธ์การอัปเดต
 */
NotificationSchema.statics.markAllAsRead = async function (
  recipientId: Types.ObjectId
): Promise<mongoose.UpdateWriteOpResult> {
  const result = await this.updateMany(
    { recipientId: recipientId, isRead: false, isArchived: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
  if (result.modifiedCount > 0) {
      await updateUserUnreadNotificationCount(recipientId);
  }
  return result;
};

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

// ตรวจสอบว่า Model "Notification" ถูกสร้างไปแล้วหรือยัง ถ้ายัง ให้สร้าง Model ใหม่
const NotificationModel = 
  (models.Notification as mongoose.Model<INotification>) ||
  model<INotification>("Notification", NotificationSchema);

export default NotificationModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Dynamic Content Generation**: `title` และ `message` อาจจะถูกสร้างขึ้นแบบ dynamic โดยใช้ template engine
//     และข้อมูลจาก `context` เพื่อให้รองรับหลายภาษาและมีความยืดหยุ่น.
// 2.  **User Preferences**: ควรมีระบบให้ผู้ใช้สามารถตั้งค่าได้ว่าจะรับการแจ้งเตือนประเภทใดบ้าง และผ่านช่องทางใด.
//     Notification model อาจจะต้องมีการตรวจสอบ preference ของผู้ใช้ก่อนส่งจริง.
// 3.  **Notification Delivery System**: การส่งการแจ้งเตือนผ่านช่องทางต่างๆ (Email, Push, SMS) ควรมีระบบ worker/queue แยกต่างหาก
//     เพื่อไม่ให้กระทบ performance ของ API หลัก. `channels` field และ `priority` จะช่วยในการจัดการคิว.
// 4.  **Scalability**: สำหรับระบบขนาดใหญ่ที่มีการแจ้งเตือนจำนวนมาก, การ query และ update Notification model
//     ควรทำได้อย่างมีประสิทธิภาพ. Indexes ที่เหมาะสมและการ partition ข้อมูล (ถ้าจำเป็น) มีความสำคัญ.
// 5.  **Denormalization**: การเก็บข้อมูล denormalized ใน `context` (เช่น `novelTitle`, `sourceUsername`)
//     ช่วยลดการ join เมื่อแสดงผลการแจ้งเตือน แต่ต้องมีการจัดการเมื่อข้อมูลต้นทางมีการเปลี่ยนแปลง.
// 6.  **Real-time Updates**: สำหรับ In-app notifications, อาจใช้ WebSocket เพื่อส่งการแจ้งเตือนให้ผู้ใช้แบบ real-time.
// 7.  **Batching Notifications**: สำหรับบางประเภทการแจ้งเตือน (เช่น "like on your novel"), อาจพิจารณาการ batch
//     (เช่น "มี 5 คนถูกใจนิยายของคุณ") แทนการส่งแยกทีละรายการ เพื่อลดจำนวนการแจ้งเตือน.
// 8.  **Internationalization (i18n)**: `title` และ `message` ควรออกแบบให้รองรับหลายภาษา.
// ==================================================================================================