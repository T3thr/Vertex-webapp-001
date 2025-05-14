// src/models/Comment.ts
// โมเดลความคิดเห็น (Comment Model) - จัดการความคิดเห็นของผู้ใช้ต่อเนื้อหาต่างๆ (เช่น นิยาย, ตอน, ฉาก, หรือความคิดเห็นอื่น)
// ออกแบบให้รองรับการตอบกลับ (replies), การถูกใจ, การแก้ไข, การลบ (soft delete), และการรายงาน

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import UserModel from "./User"; // สำหรับอ้างอิง User model ใน middleware
import NovelModel from "./Novel"; // สำหรับอ้างอิง Novel model ใน middleware
import EpisodeModel from "./Episode"; // สำหรับอ้างอิง Episode model ใน middleware

// สถานะของความคิดเห็น (สำหรับการตรวจสอบเนื้อหา)
export type CommentStatus = "pending_approval" | "approved" | "rejected" | "hidden_by_user" | "archived";

// อินเทอร์เฟซสำหรับข้อมูลการรายงานความคิดเห็น
export interface ICommentReport {
  reportedBy: Types.ObjectId; // ผู้ใช้ที่รายงาน
  reason: string; // เหตุผลการรายงาน
  reportedAt: Date; // วันที่รายงาน
}

// อินเทอร์เฟซหลักสำหรับเอกสารความคิดเห็น (Comment Document)
export interface IComment extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId; // ผู้ใช้ที่แสดงความคิดเห็น (อ้างอิง User model)
  
  novel?: Types.ObjectId; // นิยายที่แสดงความคิดเห็น (อ้างอิง Novel model)
  episode?: Types.ObjectId; // ตอนที่แสดงความคิดเห็น (อ้างอิง Episode model)
  scene?: Types.ObjectId; // ฉากที่แสดงความคิดเห็น (อ้างอิง Scene model)
  
  parentComment?: Types.ObjectId; // ID ของความคิดเห็นแม่ (ถ้าเป็น reply, อ้างอิง Comment model)
  text: string; // เนื้อหาความคิดเห็น
  
  likesCount: number;
  repliesCount: number; // จำนวนการตอบกลับโดยตรง
  
  status: CommentStatus;
  isEdited: boolean; // ความคิดเห็นนี้เคยถูกแก้ไขหรือไม่
  editedAt?: Date; // วันที่แก้ไขล่าสุด
  isPinned?: boolean; // ปักหมุดโดยเจ้าของเนื้อหา
  
  mentions?: Array<Types.ObjectId>; // รายชื่อ User IDs ที่ถูกกล่าวถึง
  
  reports?: Types.DocumentArray<ICommentReport>;
  reportCount: number; // จำนวนครั้งที่ถูกรายงาน (denormalized)

  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId; // ผู้ที่ทำการลบ (user or moderator)

  createdAt: Date;
  updatedAt: Date;
}

const CommentReportSchema = new Schema<ICommentReport>(
  {
    reportedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    reportedAt: { type: Date, default: Date.now, required: true },
  },
  { _id: false }
);

const CommentSchema = new Schema<IComment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User", 
      required: true,
      index: true,
    },
    novel: { type: Schema.Types.ObjectId, ref: "Novel", index: true },
    episode: { type: Schema.Types.ObjectId, ref: "Episode", index: true },
    scene: { type: Schema.Types.ObjectId, ref: "Scene", index: true },
    parentComment: { type: Schema.Types.ObjectId, ref: "Comment", index: true },
    text: {
      type: String,
      required: [true, "กรุณาระบุเนื้อหาความคิดเห็น (Comment text is required)"],
      trim: true,
      minlength: [1, "ความคิดเห็นต้องมีอย่างน้อย 1 ตัวอักษร"],
      maxlength: [5000, "ความคิดเห็นต้องไม่เกิน 5000 ตัวอักษร"],
    },
    likesCount: { type: Number, default: 0, min: 0 },
    repliesCount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["pending_approval", "approved", "rejected", "hidden_by_user", "archived"],
      default: "approved", 
      required: true,
      index: true,
    },
    isEdited: { type: Boolean, default: false },
    editedAt: Date,
    isPinned: { type: Boolean, default: false, index: true },
    mentions: [{ type: Schema.Types.ObjectId, ref: "User" }],
    reports: [CommentReportSchema],
    reportCount: { type: Number, default: 0, min: 0, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true, 
  }
);

CommentSchema.index({ novel: 1, status: 1, isDeleted: 1, createdAt: -1 });
CommentSchema.index({ episode: 1, status: 1, isDeleted: 1, createdAt: -1 });
CommentSchema.index({ scene: 1, status: 1, isDeleted: 1, createdAt: -1 });
CommentSchema.index({ parentComment: 1, status: 1, isDeleted: 1, createdAt: -1 });
CommentSchema.index({ user: 1, isDeleted: 1, createdAt: -1 });
CommentSchema.index({ status: 1, reportCount: -1, createdAt: 1 });

CommentSchema.pre("validate", function (next) {
  if (!this.novel && !this.episode && !this.scene && !this.parentComment) {
    next(new Error("ความคิดเห็นต้องเชื่อมโยงกับ Novel, Episode, Scene หรือเป็น Reply (parentComment)"));
  } else {
    next();
  }
});

async function updateParentCommentRepliesCount(parentId: Types.ObjectId | null | undefined, increment: 1 | -1) {
  if (!parentId) return;
  const Comment = CommentModel(); // ใช้ function accessor
  try {
    await Comment.findByIdAndUpdate(parentId, { $inc: { repliesCount: increment } });
  } catch (error) {
    console.error(`Error updating repliesCount for parent comment ${parentId}:`, error);
  }
}

async function updateContentCommentCount(doc: IComment, increment: 1 | -1) {
  const { novel, episode } = doc;
  const Novel = NovelModel(); // ใช้ function accessor
  const Episode = EpisodeModel(); // ใช้ function accessor
  try {
    if (novel && !doc.parentComment) { 
      await Novel.findByIdAndUpdate(novel, { $inc: { "statistics.totalComments": increment } });
    }
    if (episode && !doc.parentComment) {
      await Episode.findByIdAndUpdate(episode, { $inc: { "statistics.totalComments": increment } });
    }
  } catch (error) {
    console.error(`Error updating comment count for content (novel: ${novel}, episode: ${episode}):`, error);
  }
}

CommentSchema.post<IComment>("save", async function (doc) {
  // `this` is the document that was saved
  if (this.isNew) {
    if (this.parentComment) {
      await updateParentCommentRepliesCount(this.parentComment, 1);
    }
    if (!this.isDeleted && this.status === "approved") {
        await updateContentCommentCount(this, 1);
    }
  }

  if (!this.isNew && (this.isModified("status") || this.isModified("isDeleted"))) {
    const previousStatus = this.$__.priorValid ? this.$__.priorValid.status : null;
    const previousIsDeleted = this.$__.priorValid ? this.$__.priorValid.isDeleted : null;

    const wasVisible = previousStatus === "approved" && !previousIsDeleted;
    const isVisible = this.status === "approved" && !this.isDeleted;

    if (wasVisible && !isVisible) {
        await updateContentCommentCount(this, -1);
    } else if (!wasVisible && isVisible) {
        await updateContentCommentCount(this, 1);
    }
  }
});

CommentSchema.post<mongoose.Query<IComment, IComment>>("findOneAndUpdate", async function (doc) {
  // `this` is the query object. `doc` is the document returned by the update (if {new: true})
  // หรือ null ถ้าไม่เจอ หรือ doc ก่อน update ถ้า {new: false} (default)
  // การจัดการ denormalization ใน findOneAndUpdate ค่อนข้างซับซ้อนเพราะ pre-hook ไม่มี doc ที่อัปเดต
  // และ post-hook อาจไม่มีสถานะก่อนอัปเดตที่ชัดเจนเสมอไป
  // วิธีที่แนะนำคือ: 1. ดึง doc มาตรวจสอบก่อนใน application logic แล้วค่อยสั่ง update
  // 2. หรือใช้ transaction แล้วคำนวณ delta ในนั้น
  // 3. หรือมี job แยกต่างหากสำหรับ re-calculate counts เป็นระยะ
  // ที่นี่จะพยายามอัปเดตถ้า doc ถูกคืนมาและมีการเปลี่ยนแปลงที่สำคัญ
  if (doc) {
    const Comment = CommentModel();
    const currentDoc = await Comment.findById(doc._id).lean(); // ดึงสถานะล่าสุดจริงๆ
    if (currentDoc) {
        // ตรวจสอบว่าจำเป็นต้องอัปเดต content count หรือไม่ (เช่น status เปลี่ยนจาก approved <-> อื่นๆ)
        // Logic นี้ควรจะซับซ้อนกว่านี้เพื่อจัดการทุก edge cases ของการเปลี่ยน status และ isDeleted
        // ตัวอย่าง: ถ้า status เปลี่ยนจาก non-approved เป็น approved และไม่ถูกลบ -> increment
        // ถ้า status เปลี่ยนจาก approved เป็น non-approved หรือถูกลบ -> decrement
        // การ implement ที่แม่นยำอาจต้องเก็บ old values จาก update operation หรือ query ก่อน update
    }
  }
});

CommentSchema.post<mongoose.Query<IComment, IComment>>(["findOneAndDelete", "deleteOne"], async function (doc) {
  // `doc` is the document that was deleted
  if (doc) {
    if (doc.parentComment) {
      await updateParentCommentRepliesCount(doc.parentComment, -1);
    }
    if (!doc.isDeleted && doc.status === "approved") { 
        await updateContentCommentCount(doc, -1);
    }
  }
});

const CommentModel = () => models.Comment as mongoose.Model<IComment> || model<IComment>("Comment", CommentSchema);

export default CommentModel;

