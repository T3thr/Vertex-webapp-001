// src/backend/models/Notification.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface for the payload/data associated with a notification
export interface INotificationData extends Document {
  // Common fields that might be useful for displaying notification snippets
  actor?: { id: Types.ObjectId, name: string, avatarUrl?: string }; // User who triggered the event
  verb: string; // Action performed (e.g., "commented", "followed", "unlocked", "purchased", "donated_to")
  object?: { id?: Types.ObjectId, type?: string, name?: string, url?: string }; // Direct object of the action (e.g., a comment, a novel)
  target?: { id?: Types.ObjectId, type?: string, name?: string, url?: string }; // Indirect object (e.g., the novel a comment was on)
  // Specific entity IDs for easy linking and data retrieval
  novelId?: Types.ObjectId;
  episodeId?: Types.ObjectId;
  commentId?: Types.ObjectId;
  userId?: Types.ObjectId; // Could be the actor or another relevant user
  achievementId?: Types.ObjectId;
  purchaseId?: Types.ObjectId;
  donationId?: Types.ObjectId;
  ratingId?: Types.ObjectId;
  // Additional custom data specific to the notification type
  custom?: Record<string, any>;
}

// Interface for Notification document
export interface INotification extends Document {
  recipient: Types.ObjectId; // ผู้ใช้ที่รับการแจ้งเตือน (อ้างอิง User model)
  type: 
    | "system_message" // General system announcements
    | "new_follower" // Someone followed the recipient
    | "new_comment_on_novel" // New comment on recipient's novel
    | "new_reply_to_comment" // New reply to recipient's comment
    | "novel_update" // Update on a followed novel (new episode)
    | "episode_unlocked" // Access granted to a purchased/unlocked episode
    | "achievement_unlocked"
    | "purchase_confirmation"
    | "donation_received"
    | "rating_received" // New rating on recipient's novel
    | "mention_in_comment"
    | "writer_application_status"
    | "payout_processed"
    | "content_moderation_action" // e.g., comment removed, novel approved
    | "custom_event"; // For other specific events
  title?: string; // หัวข้อการแจ้งเตือน (อาจจะ generated หรือ fixed based on type)
  message: string; // ข้อความแจ้งเตือน (เนื้อหาหลัก, รองรับ placeholders from data)
  // Status and Interaction
  isRead: boolean; // สถานะการอ่าน
  readAt?: Date; // วันที่อ่าน
  isArchived: boolean; // ผู้ใช้ archive การแจ้งเตือนนี้หรือไม่
  archivedAt?: Date;
  // Action and Navigation
  actionUrl?: string; // URL ปลายทางเมื่อคลิกการแจ้งเตือน
  // Data Payload
  data: INotificationData; // ข้อมูลที่เกี่ยวข้องกับการแจ้งเตือน
  // Delivery and Importance
  deliveryChannels?: ("in_app" | "email" | "push_notification")[]; // ช่องทางที่ส่ง (default ["in_app"])
  priority: "low" | "normal" | "high" | "urgent"; // ความสำคัญ
  // Time-related
  expiresAt?: Date; // วันที่หมดอายุ (สำหรับการแจ้งเตือนชั่วคราว)
  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationDataSchema = new Schema<INotificationData>(
  {
    actor: {
      id: { type: Schema.Types.ObjectId, ref: "User" },
      name: String,
      avatarUrl: String,
    },
    verb: { type: String, required: true },
    object: {
      id: { type: Schema.Types.ObjectId }, // No ref, type defines it
      type: String,
      name: String,
      url: String,
    },
    target: {
      id: { type: Schema.Types.ObjectId }, // No ref, type defines it
      type: String,
      name: String,
      url: String,
    },
    novelId: { type: Schema.Types.ObjectId, ref: "Novel" },
    episodeId: { type: Schema.Types.ObjectId, ref: "Episode" },
    commentId: { type: Schema.Types.ObjectId, ref: "Comment" },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    achievementId: { type: Schema.Types.ObjectId, ref: "Achievement" },
    purchaseId: { type: Schema.Types.ObjectId, ref: "Purchase" },
    donationId: { type: Schema.Types.ObjectId, ref: "Donation" },
    ratingId: { type: Schema.Types.ObjectId, ref: "Rating" },
    custom: Schema.Types.Mixed,
  },
  { _id: false }
);

const NotificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: [
        "system_message", "new_follower", "new_comment_on_novel", "new_reply_to_comment",
        "novel_update", "episode_unlocked", "achievement_unlocked", "purchase_confirmation",
        "donation_received", "rating_received", "mention_in_comment", "writer_application_status",
        "payout_processed", "content_moderation_action", "custom_event"
      ],
      required: true,
      index: true,
    },
    title: { type: String, trim: true, maxlength: [150, "หัวข้อการแจ้งเตือนต้องไม่เกิน 150 ตัวอักษร"] },
    message: { type: String, required: true, trim: true, maxlength: [1000, "ข้อความแจ้งเตือนต้องไม่เกิน 1000 ตัวอักษร"] },
    isRead: { type: Boolean, default: false, index: true },
    readAt: Date,
    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: Date,
    actionUrl: { type: String, trim: true },
    data: { type: NotificationDataSchema, required: true },
    deliveryChannels: [{ type: String, enum: ["in_app", "email", "push_notification"] }],
    priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal" },
    expiresAt: { type: Date, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ----- Indexes -----
NotificationSchema.index({ recipient: 1, isRead: 1, isArchived: 1, createdAt: -1 }); // Primary query for user notifications
NotificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { sparse: true }); // For TTL or cleanup jobs

// ----- Middleware -----
NotificationSchema.pre("save", function (next) {
  // Generate title automatically if not provided, based on type and data
  if (!this.title && this.data && this.data.actor && this.data.object) {
    // Example: "[Actor Name] commented on [Object Name]"
    // This logic can be more sophisticated
    // this.title = `${this.data.actor.name || "Someone"} ${this.data.verb} ${this.data.object.name || "something"}`;
  }
  // Ensure default delivery channel if not specified
  if (!this.deliveryChannels || this.deliveryChannels.length === 0) {
    this.deliveryChannels = ["in_app"];
  }

  // Soft delete handling
  if (this.isModified("isDeleted") && this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  next();
});

// ----- Static Methods -----
// Mark specific notifications as read
NotificationSchema.statics.markAsRead = async function(
  recipientId: Types.ObjectId,
  notificationIds: Types.ObjectId[]
): Promise<any> {
  return this.updateMany(
    { _id: { $in: notificationIds }, recipient: recipientId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
};

// Mark all unread notifications for a user as read
NotificationSchema.statics.markAllAsRead = async function(recipientId: Types.ObjectId): Promise<any> {
  return this.updateMany(
    { recipient: recipientId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
};

// Archive specific notifications
NotificationSchema.statics.archiveNotifications = async function(
  recipientId: Types.ObjectId,
  notificationIds: Types.ObjectId[]
): Promise<any> {
  return this.updateMany(
    { _id: { $in: notificationIds }, recipient: recipientId, isArchived: false },
    { $set: { isArchived: true, archivedAt: new Date() } }
  );
};

// TTL Index for automatic deletion of old, read, and archived notifications (optional)
// Example: Delete notifications that are read, archived, and older than 90 days
// NotificationSchema.index({ readAt: 1, archivedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60, partialFilterExpression: { isRead: true, isArchived: true } });

// ----- Model Export -----
interface INotificationModel extends mongoose.Model<INotification> {
  markAsRead(recipientId: Types.ObjectId, notificationIds: Types.ObjectId[]): Promise<any>;
  markAllAsRead(recipientId: Types.ObjectId): Promise<any>;
  archiveNotifications(recipientId: Types.ObjectId, notificationIds: Types.ObjectId[]): Promise<any>;
}

const NotificationModel = () =>
  models.Notification as INotificationModel || model<INotification, INotificationModel>("Notification", NotificationSchema);

export default NotificationModel;

