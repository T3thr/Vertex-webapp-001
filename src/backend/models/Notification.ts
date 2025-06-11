// src/backend/models/Notification.ts
// โมเดลการแจ้งเตือน (Notification Model)
// จัดการการแจ้งเตือนต่างๆ ที่ส่งไปยังผู้ใช้, รองรับหลายช่องทาง, และสามารถปรับแต่งได้
// อัปเดตล่าสุด: เพิ่มการรองรับการแจ้งเตือนจากระบบกระทู้ (Board), การรีวิว, และการกระทำของ Moderator

import mongoose, { Schema, model, models, Types, Document, HydratedDocument } from "mongoose";
import { IUser } from "./User"; // สำหรับ recipientId และ sourceUserId
import { INovel } from "./Novel"; // สำหรับ novelId
import { IEpisode } from "./Episode"; // สำหรับ episodeId
import { IComment } from "./Comment"; // สำหรับ commentId
import { IAchievement } from "./Achievement"; // สำหรับ achievementId
import { IBadge } from "./Badge"; // สำหรับ badgeId
import { IPurchase } from "./Purchase"; // สำหรับ purchaseId
import { IBoard } from "./Board"; // **ใหม่**: Import IBoard เพื่อเชื่อมโยงข้อมูลกระทู้

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Notification
// ==================================================================================================

/**
 * @enum {string} NotificationChannel
 * @description ช่องทางในการส่งการแจ้งเตือน
 */
export enum NotificationChannel {
  IN_APP = "in-app", // การแจ้งเตือนภายในแอปพลิเคชัน (Bell Icon)
  EMAIL = "email", // การแจ้งเตือนผ่านอีเมล
  PUSH = "push", // Push Notification บนมือถือหรือเบราว์เซอร์
}

/**
 * @enum {string} NotificationStatus
 * @description สถานะของการแจ้งเตือนแต่ละรายการสำหรับผู้ใช้
 */
export enum NotificationStatus {
  SENT = "sent",       // ส่งแล้ว แต่ยังไม่อ่าน
  READ = "read",       // ผู้ใช้เปิดอ่านแล้ว
  ARCHIVED = "archived", // ผู้ใช้เก็บเข้าคลัง
  FAILED = "failed",     // การส่งล้มเหลว (เช่น อีเมลส่งไม่ออก)
}

/**
 * @enum {string} NotificationType
 * @description ประเภทของการแจ้งเตือน, ขยายเพิ่มเติมเพื่อรองรับระบบ Board และระบบอื่นๆ
 */
export enum NotificationType {
    // --- Social & Community ---
    NEW_FOLLOWER = "NEW_FOLLOWER",
    COMMENT_REPLY = "COMMENT_REPLY", // ตอบกลับความคิดเห็นของคุณ (ในนิยาย, ตอน)
    USER_MENTION = "USER_MENTION",   // มีคน @mention คุณในความคิดเห็นของเนื้อหาทั่วไป

    // --- Content Related ---
    NOVEL_NEW_EPISODE = "NOVEL_NEW_EPISODE", // นิยายที่คุณติดตามมีตอนใหม่
    NOVEL_UPDATE = "NOVEL_UPDATE", // นิยายที่คุณติดตามมีการอัปเดตข้อมูลสำคัญ
    NOVEL_COMPLETED = "NOVEL_COMPLETED", // นิยายที่คุณติดตามได้จบลงแล้ว

    // --- Gamification ---
    ACHIEVEMENT_UNLOCKED = "ACHIEVEMENT_UNLOCKED",
    BADGE_EARNED = "BADGE_EARNED",
    LEVEL_UP = "LEVEL_UP",
    REWARD_GRANTED = "REWARD_GRANTED", // ได้รับรางวัลพิเศษ (เช่น ไอเทม, Coins)

    // --- Monetization & Author ---
    NEW_DONATION = "NEW_DONATION", // มีคนโดเนทให้คุณ
    CONTENT_PURCHASED = "CONTENT_PURCHASED", // มีคนซื้อตอนนิยายของคุณ
    PURCHASE_COMPLETED = "PURCHASE_COMPLETED", // การซื้อของคุณสำเร็จ (แจ้งเตือนผู้ซื้อ)
    WRITER_APPLICATION_STATUS_CHANGE = "WRITER_APPLICATION_STATUS_CHANGE", // สถานะใบสมัครนักเขียนเปลี่ยนแปลง

    // --- Account & System ---
    WELCOME_MESSAGE = "WELCOME_MESSAGE",
    SECURITY_ALERT = "SECURITY_ALERT", // เช่น การล็อกอินจากอุปกรณ์ใหม่
    SYSTEM_ANNOUNCEMENT = "SYSTEM_ANNOUNCEMENT", // ประกาศจากระบบ

    // ================================================================
    // **ใหม่**: ประเภทการแจ้งเตือนที่เกี่ยวข้องกับระบบ Board/Community
    // ================================================================

    /** มีคนตอบกลับในกระทู้ที่คุณสร้าง หรือกระทู้ที่คุณติดตาม */
    BOARD_NEW_REPLY = "BOARD_NEW_REPLY",

    /** มีคน @mention คุณในกระทู้หรือในความคิดเห็นของกระทู้ */
    BOARD_USER_MENTION = "BOARD_USER_MENTION",

    /** ความคิดเห็นของคุณถูกเลือกให้เป็น "คำตอบที่ดีที่สุด" (Best Answer) */
    BOARD_BEST_ANSWER = "BOARD_BEST_ANSWER",

    /** กระทู้ของคุณถูกดำเนินการโดย Moderator (เช่น ล็อก, ซ่อน, ขอให้แก้ไข) */
    BOARD_MODERATION_ACTION = "BOARD_MODERATION_ACTION",

    /** นิยายของคุณได้รับการรีวิวใหม่ (จากกระทู้ประเภท Review) */
    NOVEL_NEW_REVIEW = "NOVEL_NEW_REVIEW",
    CONTENT_REPORT_STATUS_UPDATE = "CONTENT_REPORT_STATUS_UPDATE",
    CONTENT_POLICY_VIOLATION = "CONTENT_POLICY_VIOLATION",
    DONATION_RECEIVED = "DONATION_RECEIVED",
}


/**
 * @enum {string} NotificationSeverity
 * @description ระดับความสำคัญของการแจ้งเตือน เพื่อกำหนดการแสดงผล (เช่น สี, ไอคอน)
 */
export enum NotificationSeverity {
  LOW = "low",       // ข้อมูลทั่วไป (เช่น Level up, ผู้ติดตามใหม่)
  DEFAULT = "default", // ปกติ (เช่น ตอนใหม่, คอมเมนต์)
  INFO = "info",      // ข้อมูลสำคัญ (เช่น ประกาศ, รีวิวใหม่)
  SUCCESS = "success", // สำเร็จ (เช่น ได้รับรางวัล, ได้รับ Best Answer)
  WARNING = "warning", // แจ้งเตือน (เช่น ขอให้แก้ไขกระทู้, กระทู้ถูกล็อก)
  CRITICAL = "critical",
  ERROR = "ERROR", // วิกฤต (เช่น Security Alert)
}


/**
 * @interface INotificationContext
 * @description ข้อมูลเพิ่มเติมที่เกี่ยวข้องกับการแจ้งเตือนแต่ละประเภท เพื่อใช้สร้างข้อความและลิงก์
 */
export interface INotificationContext {
    // === Context Fields เดิม ===
    sourceUserId?: string;
    sourceUsername?: string; // (Denormalized)
    novelId?: string;
    novelTitle?: string; // (Denormalized)
    episodeId?: string;
    episodeTitle?: string; // (Denormalized)
    commentId?: string;
    commentSnippet?: string; // (Denormalized)
    achievementId?: string;
    achievementName?: string; // (Denormalized)
    badgeId?: string;
    badgeName?: string; // (Denormalized)
    level?: number;
    purchaseId?: string;
    purchaseReadableId?: string; // (Denormalized)
    // ... และ fields เดิมอื่นๆ ที่อาจมี

    // ================================================================
    // **ใหม่**: Context Fields สำหรับการแจ้งเตือนของ Board
    // ================================================================
    boardId?: string;
    boardTitle?: string; // (Denormalized) หัวข้อกระทู้
    boardSlug?: string; // (Denormalized) Slug สำหรับสร้าง URL

    /**
     * @description การกระทำของ Moderator ที่เกิดขึ้นกับกระทู้
     * ใช้ร่วมกับ NotificationType.BOARD_MODERATION_ACTION
     */
    moderationAction?: 'LOCKED' | 'HIDDEN' | 'ACTION_REQUIRED' | 'UNLOCKED' | 'RESTORED' | 'DELETED';
    moderationReason?: string; // เหตุผลที่ Moderator ระบุ
}


// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร Notification (INotification Document Interface)
// ==================================================================================================

export interface INotification extends Document {
  _id: Types.ObjectId;
  recipientId: Types.ObjectId | IUser; // ผู้รับการแจ้งเตือน
  type: NotificationType;
  channels: NotificationChannel[]; // ช่องทางที่จะส่ง
  status: Map<NotificationChannel, NotificationStatus>; // สถานะการส่งในแต่ละช่องทาง
  readAt?: Date; // วันที่อ่าน (สำหรับ In-App)
  archivedAt?: Date; // วันที่เก็บเข้าคลัง

  // -- Content --
  message: string; // ข้อความที่สร้างขึ้นและพร้อมแสดงผล (อาจเป็นภาษาของผู้รับ)
  messageKey?: string; // Key สำหรับ i18n (optional)
  title?: string; // หัวข้อ (สำหรับ Email/Push)
  ctaUrl: string; // Call-to-Action URL เมื่อคลิกการแจ้งเตือน
  iconUrl?: string; // URL ของไอคอน (อาจเป็นรูปโปรไฟล์ผู้ส่ง หรือไอคอนตามประเภท)
  severity: NotificationSeverity;

  // -- Context --
  context: INotificationContext;

  // -- Timestamps & Expiry --
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date; // วันหมดอายุของการแจ้งเตือน (ถ้ามี)

  // -- Schema Version --
  schemaVersion: number;
}


// ==================================================================================================
// SECTION: Schema หลักสำหรับ Notification (NotificationSchema)
// ==================================================================================================

const NotificationSchema = new Schema<INotification>({
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: Object.values(NotificationType), required: true, index: true },
    channels: [{ type: String, enum: Object.values(NotificationChannel), required: true }],
    status: {
        type: Map,
        of: { type: String, enum: Object.values(NotificationStatus) },
        default: () => new Map([[NotificationChannel.IN_APP, NotificationStatus.SENT]]),
    },
    readAt: { type: Date },
    archivedAt: { type: Date },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    messageKey: { type: String, trim: true, maxlength: 100 },
    title: { type: String, trim: true, maxlength: 150 },
    ctaUrl: { type: String, required: true, trim: true, maxlength: 2048 },
    iconUrl: { type: String, trim: true, maxlength: 2048 },
    severity: { type: String, enum: Object.values(NotificationSeverity), default: NotificationSeverity.DEFAULT },
    context: {
        // === Context Fields เดิม ===
        sourceUserId: { type: String },
        sourceUsername: { type: String },
        novelId: { type: String },
        novelTitle: { type: String },
        episodeId: { type: String },
        episodeTitle: { type: String },
        commentId: { type: String },
        commentSnippet: { type: String },
        achievementId: { type: String },
        achievementName: { type: String },
        badgeId: { type: String },
        badgeName: { type: String },
        level: { type: Number },
        purchaseId: { type: String },
        purchaseReadableId: { type: String },

        // **ใหม่**: เพิ่มฟิลด์สำหรับ Board Context
        boardId: { type: String },
        boardTitle: { type: String },
        boardSlug: { type: String },
        moderationAction: { type: String, enum: ['LOCKED', 'HIDDEN', 'ACTION_REQUIRED', 'UNLOCKED', 'RESTORED', 'DELETED'] },
        moderationReason: { type: String },
    },
    expiresAt: { type: Date, index: { expires: '90d' } }, // TTL index (ลบการแจ้งเตือนที่เก่ากว่า 90 วันอัตโนมัติ)
    schemaVersion: { type: Number, default: 3, required: true },
}, {
    timestamps: true,
    collection: "notifications",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});


// ==================================================================================================
// SECTION: Indexes (ดัชนี)
// ==================================================================================================
NotificationSchema.index({ recipientId: 1, 'status.in-app': 1, createdAt: -1 }, { name: "InAppNotificationListingIndex" });
NotificationSchema.index({ recipientId: 1, type: 1, createdAt: -1 }, { name: "UserNotificationsByTypeIndex" });
NotificationSchema.index({ "context.boardId": 1 }, { sparse: true, name: "NotificationsByBoardContextIndex" });


// ==================================================================================================
// SECTION: Static Methods (เมธอดสำหรับสร้าง Notification)
// ==================================================================================================

/**
 * @interface CreateNotificationParams
 * @description พารามิเตอร์สำหรับฟังก์ชัน createNotification
 */
interface CreateNotificationParams {
    recipientId: Types.ObjectId;
    type: NotificationType;
    context: INotificationContext;
    channels?: NotificationChannel[]; // Optional, default เป็น IN_APP
    // สามารถเพิ่มพารามิเตอร์อื่นๆ ได้ เช่น userPreferences
}

/**
 * @static createNotification
 * @description เมธอดสำหรับสร้างและบันทึกการแจ้งเตือนใหม่ลงในฐานข้อมูล
 * @param {CreateNotificationParams} params - พารามิเตอร์ที่จำเป็นสำหรับการสร้างการแจ้งเตือน
 * @returns {Promise<HydratedDocument<INotification> | null>} - เอกสาร Notification ที่สร้างขึ้น หรือ null หากมีข้อผิดพลาด
 */
NotificationSchema.statics.createNotification = async function(params: CreateNotificationParams): Promise<HydratedDocument<INotification> | null> {
    const { recipientId, type, context, channels = [NotificationChannel.IN_APP] } = params;

    // ตรวจสอบว่าผู้รับมีอยู่จริง (อาจไม่จำเป็นถ้า business logic จัดการแล้ว)
    const UserModel = models.User as mongoose.Model<IUser> || model<IUser>("User");
    const recipient = await UserModel.findById(recipientId).select('preferences.notifications').lean();
    if (!recipient) {
        console.warn(`[Notification] Recipient user with ID ${recipientId} not found. Creation aborted.`);
        return null;
    }
    
    // TODO: ตรวจสอบ user preferences ว่าต้องการรับการแจ้งเตือนประเภทนี้หรือไม่
    // if (!recipient.preferences?.notifications?.masterNotificationsEnabled || !recipient.preferences?.notifications?.inApp?.[type]) { 
    //     console.log(`[Notification] User ${recipientId} has disabled notifications of type ${type}.`);
    //     return null; 
    // }

    let message = "";
    let title = "";
    let ctaUrl = "/dashboard"; // Default URL
    // Default icon, จะถูก override ใน switch-case
    let iconUrl = context.sourceUsername ? `/api/users/${context.sourceUsername}/avatar` : '/icons/default-notification.png';
    let severity = NotificationSeverity.DEFAULT;

    // --- สร้าง content ตามประเภทของการแจ้งเตือน ---
    switch (type) {
        // === กรณีเดิม: Social & Community ===
        case NotificationType.NEW_FOLLOWER:
            message = `${context.sourceUsername} ได้เริ่มติดตามคุณ`;
            title = "คุณมีผู้ติดตามใหม่!";
            ctaUrl = `/u/${context.sourceUsername}`;
            severity = NotificationSeverity.LOW;
            break;
        
        case NotificationType.COMMENT_REPLY:
            message = `${context.sourceUsername} ได้ตอบกลับความคิดเห็นของคุณในเรื่อง "${context.novelTitle}"`;
            title = `มีการตอบกลับความคิดเห็น`;
            ctaUrl = `/n/${context.novelId}/e/${context.episodeId}#comment-${context.commentId}`;
            break;

        case NotificationType.USER_MENTION:
            message = `${context.sourceUsername} ได้กล่าวถึงคุณในความคิดเห็น`;
            title = `มีคนกล่าวถึงคุณ`;
            // URL ควรจะชี้ไปยัง context ของ comment นั้นๆ (เช่น ตอนนิยาย)
            ctaUrl = context.novelId && context.episodeId
                ? `/n/${context.novelId}/e/${context.episodeId}#comment-${context.commentId}`
                : `/dashboard`; // Fallback
            severity = NotificationSeverity.INFO;
            break;

        // === กรณีเดิม: Content Related ===
        case NotificationType.NOVEL_NEW_EPISODE:
            message = `ตอนใหม่! "${context.episodeTitle}" ในนิยายเรื่อง "${context.novelTitle}" พร้อมให้อ่านแล้ว`;
            title = `ตอนใหม่: ${context.novelTitle}`;
            ctaUrl = `/n/${context.novelId}/e/${context.episodeId}`;
            severity = NotificationSeverity.INFO;
            iconUrl = `/icons/new-episode.png`;
            break;

        case NotificationType.NOVEL_COMPLETED:
            message = `นิยายเรื่อง "${context.novelTitle}" ที่คุณติดตามได้เดินทางมาถึงตอนจบแล้ว!`;
            title = `นิยายจบแล้ว: ${context.novelTitle}`;
            ctaUrl = `/n/${context.novelId}`;
            severity = NotificationSeverity.INFO;
            iconUrl = `/icons/novel-completed.png`;
            break;
        
        // === กรณีเดิม: Gamification ===
        case NotificationType.ACHIEVEMENT_UNLOCKED:
            message = `คุณปลดล็อกความสำเร็จใหม่: "${context.achievementName}"`;
            title = `ปลดล็อกความสำเร็จ!`;
            ctaUrl = `/u/${recipient.username}/achievements#${context.achievementId}`;
            severity = NotificationSeverity.SUCCESS;
            iconUrl = `/icons/achievement-unlocked.png`;
            break;

        case NotificationType.BADGE_EARNED:
            message = `คุณได้รับเหรียญตราใหม่: "${context.badgeName}"`;
            title = `ได้รับเหรียญตราใหม่!`;
            ctaUrl = `/u/${recipient.username}/badges#${context.badgeId}`;
            severity = NotificationSeverity.SUCCESS;
            iconUrl = `/icons/badge-earned.png`;
            break;

        case NotificationType.LEVEL_UP:
            message = `ยินดีด้วย! คุณได้เลื่อนระดับเป็น Level ${context.level}!`;
            title = `Level Up!`;
            ctaUrl = `/u/${recipient.username}/gamification`;
            severity = NotificationSeverity.SUCCESS;
            iconUrl = `/icons/level-up.png`;
            break;
        
        // === กรณีเดิม: Monetization & System ===
        case NotificationType.PURCHASE_COMPLETED:
            message = `การซื้อหมายเลข #${context.purchaseReadableId} ของคุณสำเร็จแล้ว`;
            title = `การซื้อสำเร็จ`;
            ctaUrl = `/user/purchases/${context.purchaseId}`;
            severity = NotificationSeverity.SUCCESS;
            iconUrl = `/icons/purchase-success.png`;
            break;

        case NotificationType.SYSTEM_ANNOUNCEMENT:
            message = context.commentSnippet || "มีประกาศใหม่จากทีมงาน DivWy"; // ใช้ commentSnippet สำหรับเนื้อหาประกาศ
            title = context.novelTitle || "ประกาศจากระบบ"; // ใช้ novelTitle สำหรับหัวข้อประกาศ
            ctaUrl = `/announcements/${context.commentId}`; // สมมติว่าใช้ ID เป็นตัวอ้างอิง
            severity = NotificationSeverity.INFO;
            iconUrl = `/icons/system-announcement.png`;
            break;

        case NotificationType.SECURITY_ALERT:
            message = `ตรวจพบกิจกรรมที่น่าสงสัยในบัญชีของคุณ กรุณาตรวจสอบและเปลี่ยนรหัสผ่าน`;
            title = `แจ้งเตือนความปลอดภัย`;
            ctaUrl = `/user/security`;
            severity = NotificationSeverity.CRITICAL;
            iconUrl = `/icons/security-alert.png`;
            break;

        // ================================================================
        // **ใหม่**: Logic สำหรับสร้างการแจ้งเตือนของ Board
        // ================================================================
        
        case NotificationType.BOARD_NEW_REPLY:
            message = `${context.sourceUsername} ได้แสดงความคิดเห็นในกระทู้ "${context.boardTitle}"`;
            title = "มีการตอบกลับใหม่ในกระทู้";
            ctaUrl = `/community/boards/${context.boardSlug}#comment-${context.commentId}`; 
            // iconUrl จะใช้รูปโปรไฟล์ของผู้คอมเมนต์ (ซึ่งเป็น default อยู่แล้ว)
            severity = NotificationSeverity.DEFAULT;
            break;

        case NotificationType.BOARD_USER_MENTION:
            message = `${context.sourceUsername} ได้กล่าวถึงคุณในกระทู้ "${context.boardTitle}"`;
            title = "มีคนกล่าวถึงคุณในกระทู้";
            ctaUrl = `/community/boards/${context.boardSlug}#comment-${context.commentId}`;
            severity = NotificationSeverity.INFO;
            break;

        case NotificationType.BOARD_BEST_ANSWER:
            message = `ความคิดเห็นของคุณในกระทู้ "${context.boardTitle}" ถูกเลือกเป็นคำตอบที่ดีที่สุด!`;
            title = "ยินดีด้วย! คุณได้รับเลือกเป็น Best Answer";
            ctaUrl = `/community/boards/${context.boardSlug}#comment-${context.commentId}`;
            iconUrl = '/icons/best-answer.png'; // ไอคอนพิเศษ
            severity = NotificationSeverity.SUCCESS;
            break;

        case NotificationType.NOVEL_NEW_REVIEW:
            message = `${context.sourceUsername} ได้เขียนรีวิวใหม่สำหรับนิยายของคุณ: "${context.novelTitle}"`;
            title = "นิยายของคุณได้รับการรีวิวใหม่";
            ctaUrl = `/community/boards/${context.boardSlug}`;
            severity = NotificationSeverity.INFO;
            break;

        case NotificationType.BOARD_MODERATION_ACTION:
            iconUrl = '/icons/moderator-action.png'; // ไอคอนทีมงาน
            switch (context.moderationAction) {
                case 'LOCKED':
                    message = `กระทู้ของคุณ "${context.boardTitle}" ถูกล็อกโดยผู้ดูแลระบบ`;
                    title = "กระทู้ถูกล็อก";
                    severity = NotificationSeverity.WARNING;
                    break;
                case 'HIDDEN':
                    message = `กระทู้ของคุณ "${context.boardTitle}" ถูกซ่อนโดยผู้ดูแลระบบ`;
                    title = "กระทู้ถูกซ่อน";
                    severity = NotificationSeverity.WARNING;
                    break;
                case 'ACTION_REQUIRED':
                    message = `กระทู้ของคุณ "${context.boardTitle}" จำเป็นต้องได้รับการแก้ไขตามที่ผู้ดูแลระบบแนะนำ`;
                    title = "จำเป็นต้องแก้ไขกระทู้";
                    severity = NotificationSeverity.CRITICAL;
                    break;
                default:
                    message = `มีการดำเนินการกับกระทู้ "${context.boardTitle}" โดยผู้ดูแล`;
                    title = "แจ้งเตือนจากผู้ดูแล";
                    severity = NotificationSeverity.WARNING;
            }
            // เพิ่มเหตุผลถ้ามี
            if (context.moderationReason) {
                message += `\nเหตุผล: ${context.moderationReason}`;
            }
            ctaUrl = `/community/boards/${context.boardSlug}`;
            break;

        default:
            console.warn(`[Notification] Notification type "${type}" is not handled in createNotification switch-case.`);
            return null; // ไม่สร้างการแจ้งเตือนสำหรับประเภทที่ไม่รู้จัก
    }

    // สร้าง Map สำหรับสถานะเริ่มต้นของแต่ละช่องทาง
    const initialStatus = channels.reduce((acc, channel) => {
        acc[channel] = NotificationStatus.SENT;
        return acc;
    }, {} as Record<NotificationChannel, NotificationStatus>);

    // สร้าง instance ของ Notification
    const notification = new this({
        recipientId,
        type,
        channels,
        status: initialStatus,
        message,
        title,
        ctaUrl,
        iconUrl,
        severity,
        context,
    });

    await notification.save();

    // Trigger การส่งผ่านช่องทางอื่นๆ (Email, Push) ที่นี่
    // เพื่อให้ Service ที่รับผิดชอบจัดการการส่ง Email/Push โดยเฉพาะ
    // console.log(`[Notification] Created notification ${notification._id} for user ${recipientId}. Triggering channels: ${channels.join(', ')}`);
    // if (channels.includes(NotificationChannel.EMAIL)) { /* await EmailService.send(notification) */ }
    // if (channels.includes(NotificationChannel.PUSH)) { /* await PushService.send(notification) */ }

    return notification;
};


// ==================================================================================================
// SECTION: Model Export
// ==================================================================================================

// Type assertion เพื่อให้ TypeScript รู้จัก static method ที่เราสร้างขึ้น
export interface NotificationModel extends mongoose.Model<INotification> {
    createNotification(params: CreateNotificationParams): Promise<HydratedDocument<INotification> | null>;
}

export default (models.Notification as NotificationModel) || model<INotification, NotificationModel>("Notification", NotificationSchema);


// ==================================================================================================
// SECTION: หมายเหตุและการเชื่อมต่อกับ Board.ts (Notes and Integration with Board.ts)
// ==================================================================================================
//
// การจะทำให้ระบบแจ้งเตือนนี้ทำงานกับ Board.ts ได้อย่างสมบูรณ์ ต้องมีการเรียกใช้ `NotificationModel.createNotification`
// จาก Service หรือ Middleware ที่เกี่ยวข้องกับเหตุการณ์ต่างๆ ในระบบกระทู้ ดังนี้:
//
// 1. **การตอบกลับกระทู้ (BOARD_NEW_REPLY)**
//    - **ที่ไหน**: ใน Service ที่จัดการการสร้าง Comment (เช่น `CommentService.createComment`) หรือใน `post('save')` hook ของ `Comment.ts`
//    - **เมื่อไหร่**: หลังจากสร้าง Comment สำเร็จ และ Comment นั้นมี `targetType: 'Board'`.
//    - **Logic**:
//      1. ดึงข้อมูลกระทู้ (Board) จาก `targetId` ของ Comment.
//      2. ดึงรายชื่อผู้รับการแจ้งเตือน ซึ่งคือ `board.authorId` และ `board.subscribers` ทั้งหมด (ยกเว้นคนสร้าง Comment เอง).
//      3. วนลูปสร้าง Notification สำหรับผู้รับแต่ละคน:
//         `await NotificationModel.createNotification({
//              recipientId: subscriberId, // ID ของเจ้าของกระทู้ หรือผู้ติดตาม
//              type: NotificationType.BOARD_NEW_REPLY,
//              context: {
//                  sourceUserId: newComment.userId,
//                  sourceUsername: newComment.author.username, // ต้อง populate author
//                  boardId: board._id,
//                  boardTitle: board.title,
//                  boardSlug: board.slug,
//                  commentId: newComment._id,
//              }
//          })`
//
// 2. **การกล่าวถึงผู้ใช้ (@mention) (BOARD_USER_MENTION)**
//    - **ที่ไหน**: ใน Service ที่จัดการการสร้าง Comment (เช่น `CommentService.createComment`).
//    - **เมื่อไหร่**: หลังจากบันทึกเนื้อหา (content) ของคอมเมนต์แล้ว.
//    - **Logic**:
//      1. สแกน `content` ของคอมเมนต์เพื่อหา @mentions (เช่น ใช้ regex `/(@\w+)/g`).
//      2. ค้นหา User ID จาก username ที่ mention ได้.
//      3. วนลูปสร้าง Notification ไปยัง User ที่ถูก mention แต่ละคน.
//         `await NotificationModel.createNotification({
//              recipientId: mentionedUserId,
//              type: NotificationType.BOARD_USER_MENTION,
//              context: { /* ... context เหมือน BOARD_NEW_REPLY ... */ }
//          })`
//
// 3. **การเลือกคำตอบที่ดีที่สุด (BOARD_BEST_ANSWER)**
//    - **ที่ไหน**: ใน Service ที่จัดการการตั้งค่า Best Answer (เช่น `BoardService.setBestAnswer`).
//    - **เมื่อไหร่**: หลังจากอัปเดต field `bestAnswer` บน Board document สำเร็จ.
//    - **Logic**:
//      1. ดึงข้อมูล Comment ที่ถูกเลือกเป็น Best Answer เพื่อหา `authorId` ของคอมเมนต์นั้น.
//      2. สร้าง Notification ไปยัง `comment.userId`:
//         `await NotificationModel.createNotification({
//              recipientId: bestAnswerComment.userId,
//              type: NotificationType.BOARD_BEST_ANSWER,
//              context: {
//                  sourceUserId: board.authorId, // คนที่เลือกอาจเป็นเจ้าของกระทู้
//                  sourceUsername: board.authorUsername,
//                  boardId: board._id,
//                  boardTitle: board.title,
//                  boardSlug: board.slug,
//                  commentId: bestAnswerComment._id,
//              }
//          })`
//
// 4. **การดำเนินการโดย Moderator (BOARD_MODERATION_ACTION)**
//    - **ที่ไหน**: ใน Service ของ Moderator ที่ใช้เปลี่ยนสถานะกระทู้ (เช่น `ModerationService.changeBoardStatus`).
//    - **เมื่อไหร่**: หลังจากเปลี่ยน `status` ของ Board เป็น `LOCKED`, `HIDDEN_BY_MODERATOR`, `REQUIRES_AUTHOR_EDIT`.
//    - **Logic**:
//      1. สร้าง Notification ไปยัง `board.authorId`.
//         `await NotificationModel.createNotification({
//              recipientId: board.authorId,
//              type: NotificationType.BOARD_MODERATION_ACTION,
//              context: {
//                  sourceUserId: moderator.userId, // ID ของ Moderator ที่กระทำ
//                  sourceUsername: 'ทีมงาน DivWy',
//                  boardId: board._id,
//                  boardTitle: board.title,
//                  boardSlug: board.slug,
//                  moderationAction: 'LOCKED', // หรือ 'HIDDEN', 'ACTION_REQUIRED'
//                  moderationReason: reason, // เหตุผลจากฟอร์มของ Moderator
//              }
//          })`
//
// 5. **การรีวิวนิยายใหม่ (NOVEL_NEW_REVIEW)**
//    - **ที่ไหน**: ใน Middleware `post("save")` ของ `BoardSchema` หรือใน `BoardService.createBoard`.
//    - **เมื่อไหร่**: เมื่อมีการสร้าง Board ใหม่ (`isNew: true`) และมีเงื่อนไข `board.boardType === BoardType.REVIEW` และ `board.novelAssociated` ไม่ใช่ null.
//    - **Logic**:
//      1. ดึงข้อมูล Novel จาก `board.novelAssociated` เพื่อหา `author` ของนิยาย.
//      2. สร้าง Notification ไปยังผู้เขียนนิยาย (`novel.author`).
//         `await NotificationModel.createNotification({
//              recipientId: novel.author._id,
//              type: NotificationType.NOVEL_NEW_REVIEW,
//              context: {
//                  sourceUserId: board.authorId,
//                  sourceUsername: board.authorUsername,
//                  boardId: board._id,
//                  boardTitle: board.title, // หัวข้อรีวิว
//                  boardSlug: board.slug,
//                  novelId: novel._id,
//                  novelTitle: novel.title,
//              }
//          })`
//
// การแยก Logic การสร้าง Notification ออกจาก Model แล้วไปเรียกใช้ใน Service Layer เป็นแนวทางปฏิบัติที่ดี
// ช่วยให้โค้ดสะอาดและจัดการได้ง่ายขึ้นในระยะยาว
// ==================================================================================================