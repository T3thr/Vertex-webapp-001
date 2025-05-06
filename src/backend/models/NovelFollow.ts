// src/backend/models/NovelFollow.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface สำหรับ NovelFollow document
export interface INovelFollow extends Document {
  user: Types.ObjectId; // ผู้ติดตาม
  novel: Types.ObjectId; // นิยายที่ติดตาม
  notifications: boolean; // รับการแจ้งเตือนเมื่อมีตอนใหม่
  createdAt: Date;
}

const NovelFollowSchema = new Schema<INovelFollow>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุผู้ติดตาม"],
      index: true,
    },
    novel: {
      type: Schema.Types.ObjectId,
      ref: "Novel",
      required: [true, "กรุณาระบุนิยายที่ติดตาม"],
      index: true,
    },
    notifications: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ป้องกันการติดตามซ้ำ
NovelFollowSchema.index({ user: 1, novel: 1 }, { unique: true });

// Export Model
const NovelFollowModel = () => 
  models.NovelFollow as mongoose.Model<INovelFollow> || model<INovelFollow>("NovelFollow", NovelFollowSchema);

export default NovelFollowModel;