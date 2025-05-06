// src/backend/models/UserFollow.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface สำหรับ UserFollow document
export interface IUserFollow extends Document {
  follower: Types.ObjectId; // ผู้ติดตาม
  following: Types.ObjectId; // ผู้ถูกติดตาม
  createdAt: Date;
}

const UserFollowSchema = new Schema<IUserFollow>(
  {
    follower: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุผู้ติดตาม"],
      index: true,
    },
    following: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุผู้ถูกติดตาม"],
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ป้องกันการติดตามซ้ำ
UserFollowSchema.index({ follower: 1, following: 1 }, { unique: true });

// Export Model
const UserFollowModel = () => 
  models.UserFollow as mongoose.Model<IUserFollow> || model<IUserFollow>("UserFollow", UserFollowSchema);

export default UserFollowModel;