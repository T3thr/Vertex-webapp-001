// src/backend/models/NovelLike.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface สำหรับ NovelLike document
export interface INovelLike extends Document {
  user: Types.ObjectId; // ผู้กดไลค์
  novel: Types.ObjectId; // นิยายที่ถูกไลค์
  createdAt: Date;
}

const NovelLikeSchema = new Schema<INovelLike>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุผู้กดไลค์"],
      index: true,
    },
    novel: {
      type: Schema.Types.ObjectId,
      ref: "Novel",
      required: [true, "กรุณาระบุนิยายที่ถูกไลค์"],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ป้องกันการไลค์ซ้ำ
NovelLikeSchema.index({ user: 1, novel: 1 }, { unique: true });

// Export Model
const NovelLikeModel = () => 
  models.NovelLike as mongoose.Model<INovelLike> || model<INovelLike>("NovelLike", NovelLikeSchema);

export default NovelLikeModel;