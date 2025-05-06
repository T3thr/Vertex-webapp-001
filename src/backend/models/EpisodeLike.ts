// src/backend/models/EpisodeLike.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface สำหรับ EpisodeLike document
export interface IEpisodeLike extends Document {
  user: Types.ObjectId; // ผู้กดไลค์
  episode: Types.ObjectId; // ตอนที่ถูกไลค์
  novel: Types.ObjectId; // นิยายที่ตอนนั้นอยู่ (เพื่อความสะดวกในการ query)
  createdAt: Date;
}

const EpisodeLikeSchema = new Schema<IEpisodeLike>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุผู้กดไลค์"],
      index: true,
    },
    episode: {
      type: Schema.Types.ObjectId,
      ref: "Episode",
      required: [true, "กรุณาระบุตอนที่ถูกไลค์"],
      index: true,
    },
    novel: {
      type: Schema.Types.ObjectId,
      ref: "Novel",
      required: [true, "กรุณาระบุนิยายที่ตอนนั้นอยู่"],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ป้องกันการไลค์ซ้ำ
EpisodeLikeSchema.index({ user: 1, episode: 1 }, { unique: true });

// Export Model
const EpisodeLikeModel = () => 
  models.EpisodeLike as mongoose.Model<IEpisodeLike> || model<IEpisodeLike>("EpisodeLike", EpisodeLikeSchema);

export default EpisodeLikeModel;