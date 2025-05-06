// src/backend/models/Comment.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface สำหรับ Comment document
export interface IComment extends Document {
  user: Types.ObjectId; // ผู้แสดงความคิดเห็น
  novel?: Types.ObjectId; // นิยายที่ถูกคอมเมนต์ (ถ้ามี)
  episode?: Types.ObjectId; // ตอนที่ถูกคอมเมนต์ (ถ้ามี)
  parentComment?: Types.ObjectId; // คอมเมนต์หลัก (ถ้าเป็นการตอบกลับ)
  content: string; // เนื้อหา
  isDeleted: boolean; // สถานะการลบ (soft delete)
  likes: number; // จำนวนไลค์
  reports: number; // จำนวนรายงาน
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุผู้แสดงความคิดเห็น"],
      index: true,
    },
    novel: {
      type: Schema.Types.ObjectId,
      ref: "Novel",
      index: true,
    },
    episode: {
      type: Schema.Types.ObjectId,
      ref: "Episode",
      index: true,
    },
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      index: true,
    },
    content: {
      type: String,
      required: [true, "กรุณาใส่เนื้อหาความคิดเห็น"],
      trim: true,
      maxlength: [2000, "ความคิดเห็นต้องไม่เกิน 2000 ตัวอักษร"],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    likes: {
      type: Number,
      default: 0,
      min: 0,
    },
    reports: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Validation: ต้องมีอย่างน้อยหนึ่งเป้าหมาย (นิยาย, ตอน, หรือคอมเมนต์หลัก)
CommentSchema.pre("validate", function(next) {
  if (!this.novel && !this.episode && !this.parentComment) {
    next(new Error("ต้องระบุอย่างน้อยหนึ่งเป้าหมายสำหรับความคิดเห็น (นิยาย, ตอน, หรือคอมเมนต์หลัก)"));
  } else {
    next();
  }
});

// Compound Indexes
CommentSchema.index({ novel: 1, createdAt: -1 });
CommentSchema.index({ episode: 1, createdAt: -1 });
CommentSchema.index({ parentComment: 1, createdAt: -1 });

// Virtuals: การตอบกลับ
CommentSchema.virtual("replies", {
  ref: "Comment",
  localField: "_id",
  foreignField: "parentComment",
  justOne: false,
});

// Export Model
const CommentModel = () => 
  models.Comment as mongoose.Model<IComment> || model<IComment>("Comment", CommentSchema);

export default CommentModel;