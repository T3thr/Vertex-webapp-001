// src/models/Notification.ts
// โมเดลการแจ้งเตือน (Notification Model) - จัดการการแจ้งเตือนต่างๆ ที่ส่งไปยังผู้ใช้
// ออกแบบให้รองรับประเภทการแจ้งเตือนที่หลากหลาย, การอ่าน/ยังไม่อ่าน, และการเชื่อมโยงไปยังเนื้อหาที่เกี่ยวข้อง

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import UserModel from "./User"; // Import User model for updates

// ประเภทของการแจ้งเตือน (สามารถขยายเพิ่มเติมได้)
export type NotificationType = 
  // Social & Community
  | "new_follower" // มีคนใหม่ติดตามคุณ
  | "reply_to_your_comment" // มีคนตอบกลับความคิดเห็นของคุณ
  | "comment_on_your_novel" // มีคนแสดงความคิดเห็นในนิยายของคุณ
  | "like_on_your_comment" // มีคนถูกใจความคิดเห็นของคุณ
  | "like_on_your_novel" // มีคนถูกใจนิยายของคุณ (อาจจะเยอะไปถ้าทุก like, อาจเป็น milestone likes)
  | "user_mention" // มีคนกล่าวถึงคุณในความคิดเห็นหรือโพสต์
  // Novel Updates (from followed novels/authors)
  | "new_episode_release" // ตอนใหม่ของนิยายที่คุณติดตามถูกเผยแพร่
  | "novel_update_announcement" // นิยายที่คุณติดตามมีการอัปเดต/ประกาศสำคัญ
  | "followed_author_new_novel" // นักเขียนที่คุณติดตามเผยแพร่นิยายเรื่องใหม่
  // Achievements & Rewards (Gamification)
  | "achievement_unlocked" // คุณปลดล็อกความสำเร็จใหม่
  | "badge_awarded" // คุณได้รับเหรียญตราใหม่
  | "daily_reward_available" // รางวัลประจำวันพร้อมให้รับ
  // Platform & System
  | "platform_announcement" // ประกาศสำคัญจากแพลตฟอร์ม
  | "account_security_alert" // การแจ้งเตือนความปลอดภัยของบัญชี
  | "content_moderation_update" // อัปเดตเกี่ยวกับการตรวจสอบเนื้อหาของคุณ
  // Monetization & Support
  | "donation_received" // คุณได้รับการสนับสนุน (โดเนท)
  | "purchase_confirmation" // ยืนยันการซื้อสำเร็จ
  | "subscription_update"; // อัปเดตเกี่ยวกับการสมัครสมาชิก

// อินเทอร์เฟซสำหรับข้อมูลเพิ่มเติมที่เกี่ยวข้องกับการแจ้งเตือน (Contextual Data)
export interface INotificationContext {
  // IDs for linking
  novelId?: Types.ObjectId; // ID นิยายที่เกี่ยวข้อง
  episodeId?: Types.ObjectId; // ID ตอนที่เกี่ยวข้อง
  sceneId?: Types.ObjectId; // ID ฉากที่เกี่ยวข้อง
  commentId?: Types.ObjectId; // ID ความคิดเห็นที่เกี่ยวข้อง
  sourceUserId?: Types.ObjectId; // ID ผู้ใช้ที่เป็นต้นเหตุของการแจ้งเตือน (เช่น คนที่มา follow, comment)
  targetContentId?: Types.ObjectId; // ID ของเนื้อหาเป้าหมาย (เช่น ID ของ comment ที่ถูก reply)
  achievementId?: Types.ObjectId; // ID ความสำเร็จที่ปลดล็อก
  badgeId?: Types.ObjectId; // ID เหรียญตราที่ได้รับ
  purchaseId?: Types.ObjectId; // ID การซื้อ
  // Denormalized data for quick display
  novelTitle?: string;
  episodeTitle?: string;
  sourceUsername?: string;
  sourceUserAvatar?: string;
  commentSnippet?: string;
  achievementName?: string;
  badgeName?: string;
  // Other relevant data
  [key: string]: any; // สำหรับข้อมูลอื่นๆ ที่อาจจำเป็นตามประเภทการแจ้งเตือน
}

// อินเทอร์เฟซหลักสำหรับเอกสารการแจ้งเตือน (Notification Document)
export interface INotification extends Document {
  _id: Types.ObjectId;
  recipient: Types.ObjectId; // ผู้ใช้ที่รับการแจ้งเตือน (อ้างอิง User model หรือ SocialMediaUser model)
  type: NotificationType; // ประเภทของการแจ้งเตือน
  
  title?: string; // หัวข้อการแจ้งเตือน (อาจจะ generate หรือกำหนดเอง)
  message: string; // เนื้อหาหลักของการแจ้งเตือน (ควรสั้นกระชับ)
  iconUrl?: string; // URL ไอคอนสำหรับการแจ้งเตือน (อาจเป็น default ตาม type หรือ custom)
  
  context: INotificationContext; // ข้อมูลเพิ่มเติมที่เกี่ยวข้อง
  actionUrl?: string; // URL ที่จะนำผู้ใช้ไปเมื่อคลิกการแจ้งเตือน (เช่น /novel/abc/episode/1)
  
  isRead: boolean; // สถานะการอ่าน (true = อ่านแล้ว, false = ยังไม่อ่าน)
  readAt?: Date; // วันที่อ่านการแจ้งเตือน
  
  // Timestamps
  createdAt: Date; // วันที่สร้างการแจ้งเตือน
  updatedAt: Date; // วันที่อัปเดตล่าสุด (เช่น เมื่อ isRead เปลี่ยน)
}

// Schema ย่อยสำหรับ INotificationContext
const NotificationContextSchema = new Schema<INotificationContext>(
  {
    novelId: { type: Schema.Types.ObjectId, ref: "Novel" },
    episodeId: { type: Schema.Types.ObjectId, ref: "Episode" },
    sceneId: { type: Schema.Types.ObjectId, ref: "Scene" },
    commentId: { type: Schema.Types.ObjectId, ref: "Comment" },
    sourceUserId: { type: Schema.Types.ObjectId, ref: "User" }, // หรือ refPath
    targetContentId: { type: Schema.Types.ObjectId },
    achievementId: { type: Schema.Types.ObjectId, ref: "Achievement" },
    badgeId: { type: Schema.Types.ObjectId, ref: "Badge" },
    purchaseId: { type: Schema.Types.ObjectId, ref: "Purchase" },
    novelTitle: { type: String, trim: true },
    episodeTitle: { type: String, trim: true },
    sourceUsername: { type: String, trim: true },
    sourceUserAvatar: { type: String, trim: true },
    commentSnippet: { type: String, trim: true, maxlength: 100 },
    achievementName: { type: String, trim: true },
    badgeName: { type: String, trim: true },
  },
  { _id: false, strict: false } // Allow additional properties not strictly defined
);

// Schema หลักสำหรับ Notification
const NotificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User", // หรือ refPath เพื่อรองรับ SocialMediaUser
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: [true, "กรุณาระบุประเภทการแจ้งเตือน (Notification type is required)"],
      index: true,
    },
    title: { type: String, trim: true, maxlength: 150 },
    message: {
      type: String,
      required: [true, "กรุณาระบุเนื้อหาการแจ้งเตือน (Notification message is required)"],
      trim: true,
      maxlength: [500, "เนื้อหาการแจ้งเตือนต้องไม่เกิน 500 ตัวอักษร"],
    },
    iconUrl: { type: String, trim: true },
    context: { type: NotificationContextSchema, default: () => ({}) },
    actionUrl: { type: String, trim: true },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, index: true },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ----- Indexes -----
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });

// ----- Middleware -----
async function updateUserUnreadCount(recipientId: Types.ObjectId) {
  const User = UserModel(); 
  const Notification = NotificationModel(); // Get Notification model instance
  try {
    const unreadCount = await Notification.countDocuments({
      recipient: recipientId,
      isRead: false,
    });
    await User.findByIdAndUpdate(recipientId, { "activityTracking.unreadNotificationsCount": unreadCount });
  } catch (error) {
    console.error(`Error updating unread notification count for user ${recipientId}:`, error);
  }
}

NotificationSchema.post<INotification>("save", async function (doc) {
  // If it's a new notification or an existing one marked as unread (though less common for existing)
  if (this.isNew || (this.isModified("isRead") && !this.isRead)) {
    await updateUserUnreadCount(doc.recipient);
  }
});

NotificationSchema.post<mongoose.Query<INotification, INotification>>("findOneAndUpdate", async function (result) {
  const update = this.getUpdate() as any;
  const filter = this.getFilter();
  let recipientIdToUpdate: Types.ObjectId | null = null;

  // Check if isRead was set to true in the update operation
  if (update && (update.isRead === true || (update.$set && update.$set.isRead === true))) {
    // If the update was by _id, we can get the document to find the recipient
    if (filter._id) {
        const updatedDoc = await NotificationModel().findById(filter._id).lean();
        if (updatedDoc) recipientIdToUpdate = updatedDoc.recipient;
    } else if (filter.recipient) {
        // If recipient is in the filter, we can use that, but this might be for multiple docs
        // This hook runs *after* the update, so `result` might be the doc or null
        // For simplicity, if recipient is in filter, assume we update for that one
        // A more robust solution for multi-doc updates would be needed
        recipientIdToUpdate = filter.recipient;
    }
    
    if (recipientIdToUpdate) {
        await updateUserUnreadCount(recipientIdToUpdate);
    }
  }
});

NotificationSchema.post<INotification>(["findOneAndDelete", "deleteOne"], async function (doc) {
  if (doc && !doc.isRead) { 
    await updateUserUnreadCount(doc.recipient);
  }
});

NotificationSchema.post<mongoose.Query<any, any>>("deleteMany", async function (result) {
    const filter = this.getFilter();
    if (filter.recipient && (filter.isRead === false || filter.isRead === undefined)) {
        // If deleting for a specific user and potentially unread messages
        await updateUserUnreadCount(filter.recipient);
    } else if (!filter.recipient && (filter.isRead === false || filter.isRead === undefined)){
        // If deleting for multiple users, this is complex. 
        // We'd need to find all unique recipients affected by the deleteMany operation
        // and whose unread messages were deleted, then update their counts.
        // This is a simplified placeholder, a robust solution would be more involved.
        console.warn("deleteMany on Notification without specific recipient or for unread items, unread counts might need broad recalculation.");
        // Potentially, find all distinct recipients from the filter criteria if possible and update them.
        // Example: const distinctRecipients = await NotificationModel().distinct("recipient", filter);
        // for (const recipientId of distinctRecipients) { await updateUserUnreadCount(recipientId); }
    }
});


// ----- Model Export -----
const NotificationModel = () => models.Notification as mongoose.Model<INotification> || model<INotification>("Notification", NotificationSchema);

export default NotificationModel;

