// src/backend/models/Notification.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface สำหรับ Notification document
export interface INotification extends Document {
  recipient: Types.ObjectId; // ผู้รับการแจ้งเตือน
  type: string; // ประเภทการแจ้งเตือน
  title: string; // หัวข้อการแจ้งเตือน
  message: string; // ข้อความแจ้งเตือน
  isRead: boolean; // อ่านแล้วหรือไม่
  data: {
    // ข้อมูลเพิ่มเติม (ขึ้นอยู่กับประเภทการแจ้งเตือน)
    user?: Types.ObjectId; // ผู้ใช้ที่เกี่ยวข้อง
    novel?: Types.ObjectId; // นิยายที่เกี่ยวข้อง
    episode?: Types.ObjectId; // ตอนที่เกี่ยวข้อง
    comment?: Types.ObjectId; // คอมเมนต์ที่เกี่ยวข้อง
    link?: string; // ลิงก์ที่เกี่ยวข้อง
  };
  sentAt: Date; // วันที่ส่งการแจ้งเตือน
  expireAt?: Date; // วันที่หมดอายุ (ถ้ามี)
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุผู้รับการแจ้งเตือน"],
      index: true,
    },
    type: {
      type: String,
      required: [true, "กรุณาระบุประเภทการแจ้งเตือน"],
      enum: {
        values: [
          "new_follower",
          "new_episode",
          "new_comment",
          "new_like",
          "purchase_success",
          "payment_success",
          "system_announcement",
          "other",
        ],
        message: "ประเภทการแจ้งเตือน {VALUE} ไม่ถูกต้อง",
      },
      index: true,
    },
    title: {
      type: String,
      required: [true, "กรุณาระบุหัวข้อการแจ้งเตือน"],
      trim: true,
      maxlength: [100, "หัวข้อการแจ้งเตือนต้องไม่เกิน 100 ตัวอักษร"],
    },
    message: {
      type: String,
      required: [true, "กรุณาระบุข้อความแจ้งเตือน"],
      trim: true,
      maxlength: [500, "ข้อความแจ้งเตือนต้องไม่เกิน 500 ตัวอักษร"],
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    data: {
      user: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      novel: {
        type: Schema.Types.ObjectId,
        ref: "Novel",
      },
      episode: {
        type: Schema.Types.ObjectId,
        ref: "Episode",
      },
      comment: {
        type: Schema.Types.ObjectId,
        ref: "Comment",
      },
      link: {
        type: String,
        trim: true,
      },
    },
    sentAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expireAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
NotificationSchema.index({ recipient: 1, isRead: 1, sentAt: -1 });
NotificationSchema.index({ recipient: 1, type: 1, sentAt: -1 });
NotificationSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 }); // TTL index สำหรับลบข้อมูลอัตโนมัติเมื่อหมดอายุ

// Export Model
const NotificationModel = () => 
  models.Notification as mongoose.Model<INotification> || model<INotification>("Notification", NotificationSchema);

export default NotificationModel;