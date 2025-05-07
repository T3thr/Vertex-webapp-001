// src/backend/models/Comment.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface สำหรับ Reaction (เป็น subdocument หรือ collection แยก)
export interface ICommentReaction {
  user: Types.ObjectId; // ผู้ใช้ที่ react (อ้างอิง User model)
  type: string; // ประเภท reaction (เช่น "like", "love", "haha", "wow", "sad", "angry")
  createdAt: Date;
}

// Interface สำหรับ Comment document
// Comments can be made on Novels or specific Episodes.
export interface IComment extends Document {
  content: string; // เนื้อหาคอมเมนต์ (รองรับ Markdown แบบจำกัด)
  author: Types.ObjectId; // ผู้แสดงความคิดเห็น (อ้างอิง User model)
  // Target of the comment
  novel?: Types.ObjectId; // นิยายที่แสดงความคิดเห็น (ถ้า comment นี้อยู่ที่ระดับ Novel)
  episode?: Types.ObjectId; // ตอนที่แสดงความคิดเห็น (ถ้า comment นี้อยู่ที่ระดับ Episode)
  // Threading
  parentComment?: Types.ObjectId; // คอมเมนต์หลัก (สำหรับการตอบกลับ, อ้างอิง Comment model)
  // Status and Moderation
  isDeleted: boolean; // สถานะการลบ (soft delete)
  deletedAt?: Date;
  isEdited: boolean; // มีการแก้ไขหรือไม่
  lastEditedAt?: Date; // วันที่แก้ไขล่าสุด
  isHiddenByModerator: boolean; // ซ่อนโดยผู้ดูแลหรือไม่
  moderationReason?: string; // เหตุผลในการซ่อน/แก้ไขโดยผู้ดูแล
  moderator?: Types.ObjectId; // ผู้ดูแลที่ดำเนินการ (อ้างอิง User model)
  // Engagement
  likesCount: number; // จำนวนไลค์ (denormalized)
  repliesCount: number; // จำนวนการตอบกลับ (denormalized, เฉพาะ direct replies)
  // Features
  isSpoiler: boolean; // เป็นเนื้อหาสปอยล์หรือไม่ (ผู้ใช้ mark เอง หรือ moderator mark)
  // Optional reference to a specific point in content (e.g., scene in an episode)
  contentReference?: {
    sceneId?: Types.ObjectId; // อ้างอิง Scene model (ถ้า comment เกี่ยวกับ scene เฉพาะ)
    timestamp?: string; // เช่น "01:23" สำหรับ video/audio, หรือ " абзац 5" สำหรับ text
    quote?: string; // ส่วนของเนื้อหาที่อ้างอิง
  };
  // Reporting (เก็บใน collection แยกอาจจะดีกว่าถ้าซับซ้อนมาก)
  reports?: Array<{ // รายงานคอมเมนต์ที่ไม่เหมาะสม
    reporter: Types.ObjectId; // ผู้รายงาน (อ้างอิง User model)
    reason: string; // เหตุผลในการรายงาน (enum หรือ free text)
    reportCategory: "spam" | "harassment" | "hate_speech" | "spoiler_unmarked" | "other";
    notes?: string; // รายละเอียดเพิ่มเติม
    status: "pending" | "reviewed_approved" | "reviewed_rejected" | "action_taken";
    reviewedBy?: Types.ObjectId; // ผู้ดูแลที่ตรวจสอบ (อ้างอิง User model)
    reviewedAt?: Date;
    createdAt: Date;
  }>;
  mentionedUsers?: Types.ObjectId[]; // ผู้ใช้ที่ถูกกล่าวถึงในคอมเมนต์ (อ้างอิง User model)
  // Metadata (พิจารณาเรื่อง privacy, select: false)
  ipAddress?: string; // IP address ของผู้แสดงความคิดเห็น (hashed หรือ encrypted, ใช้เพื่อ moderation)
  userAgent?: string; // User agent ของผู้แสดงความคิดเห็น (ใช้เพื่อ moderation)
  // AI/ML fields
  sentiment?: "positive" | "negative" | "neutral" | "mixed";
  language?: string; // ภาษาที่ตรวจจับได้ (ISO 639-1 code)
  toxicityScore?: number; // คะแนนความเป็นพิษ (0-1)
  embeddingVector?: number[]; // Vector embedding ของเนื้อหาคอมเมนต์
  createdAt: Date;
  updatedAt: Date;
}

const CommentReactionSchema = new Schema<ICommentReaction>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, required: true, default: "like" },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const CommentSchema = new Schema<IComment>(
  {
    content: { type: String, required: [true, "กรุณาระบุเนื้อหาคอมเมนต์"], trim: true, minlength: [1, "คอมเมนต์ต้องมีอย่างน้อย 1 ตัวอักษร"], maxlength: [5000, "เนื้อหาคอมเมนต์ต้องไม่เกิน 5000 ตัวอักษร"] },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    novel: { type: Schema.Types.ObjectId, ref: "Novel", index: true },
    episode: { type: Schema.Types.ObjectId, ref: "Episode", index: true },
    parentComment: { type: Schema.Types.ObjectId, ref: "Comment", index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    isEdited: { type: Boolean, default: false },
    lastEditedAt: { type: Date },
    isHiddenByModerator: { type: Boolean, default: false, index: true },
    moderationReason: String,
    moderator: { type: Schema.Types.ObjectId, ref: "User" },
    likesCount: { type: Number, default: 0, min: 0 },
    repliesCount: { type: Number, default: 0, min: 0 },
    isSpoiler: { type: Boolean, default: false },
    contentReference: {
      sceneId: { type: Schema.Types.ObjectId, ref: "Scene" },
      timestamp: String,
      quote: { type: String, maxlength: 300 },
    },
    reports: [{
      _id: false,
      reporter: { type: Schema.Types.ObjectId, ref: "User", required: true },
      reason: { type: String, required: true, trim: true, maxlength: 500 },
      reportCategory: { type: String, enum: ["spam", "harassment", "hate_speech", "spoiler_unmarked", "other"], required: true },
      notes: { type: String, maxlength: 1000 },
      status: { type: String, enum: ["pending", "reviewed_approved", "reviewed_rejected", "action_taken"], default: "pending" },
      reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
      reviewedAt: Date,
      createdAt: { type: Date, default: Date.now },
    }],
    mentionedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    ipAddress: { type: String, select: false },
    userAgent: { type: String, select: false },
    sentiment: { type: String, enum: ["positive", "negative", "neutral", "mixed"] },
    language: { type: String, index: true },
    toxicityScore: { type: Number, min: 0, max: 1 },
    embeddingVector: { type: [Number], select: false },
  },
  {
    timestamps: true, // createdAt, updatedAt
    validateBeforeSave: true,
  }
);

// ----- Validation -----
CommentSchema.path("novel").validate(function (this: IComment, value: Types.ObjectId) {
  // A comment must be associated with either a novel or an episode.
  // If it has an episode, it implicitly belongs to that episode's novel.
  return !!value || !!this.episode;
}, "ความคิดเห็นต้องเกี่ยวข้องกับนิยายหรือตอนใดตอนหนึ่ง (A comment must be related to either a Novel or an Episode).");

// ----- Indexes -----
// For fetching comments for a novel or episode, sorted by creation time
CommentSchema.index({ novel: 1, isDeleted: 1, isHiddenByModerator: 1, createdAt: -1 });
CommentSchema.index({ episode: 1, isDeleted: 1, isHiddenByModerator: 1, createdAt: -1 });
// For fetching replies to a parent comment
CommentSchema.index({ parentComment: 1, isDeleted: 1, isHiddenByModerator: 1, createdAt: 1 });
// For user's comments
CommentSchema.index({ author: 1, isDeleted: 1, createdAt: -1 });
// For moderation queue (pending reports)
CommentSchema.index({ "reports.status": 1, isHiddenByModerator: 1 });
// Text search on content
CommentSchema.index({ content: "text" }, { default_language: "thai" });

// ----- Middleware -----
// Update `isEdited` and `lastEditedAt` on content modification
CommentSchema.pre("save", function (next) {
  if (this.isModified("content") && !this.isNew) {
    this.isEdited = true;
    this.lastEditedAt = new Date();
  }
  // Soft delete handling
  if (this.isModified("isDeleted") && this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  next();
});

// Middleware to update repliesCount on parent comment
async function updateParentRepliesCount(doc: IComment, operation: "increment" | "decrement") {
  if (doc.parentComment) {
    const Comment = model<IComment>("Comment");
    const change = operation === "increment" ? 1 : -1;
    await Comment.findByIdAndUpdate(doc.parentComment, { $inc: { repliesCount: change } });
  }
}

// Middleware to update comment counts on Novel/Episode
async function updateTargetCommentCount(doc: IComment, operation: "increment" | "decrement") {
  const change = operation === "increment" ? 1 : -1;
  if (doc.episode) {
    const Episode = model("Episode"); // Assuming Episode model is registered
    await Episode.findByIdAndUpdate(doc.episode, { $inc: { "statistics.commentsCount": change } });
  } else if (doc.novel) {
    const Novel = model("Novel"); // Assuming Novel model is registered
    await Novel.findByIdAndUpdate(doc.novel, { $inc: { "statistics.commentsCount": change } });
  }
}

CommentSchema.post("save", async function (doc: IComment) {
  // Check if it is a new, non-deleted, visible comment
  if (doc.isNew && !doc.isDeleted && !doc.isHiddenByModerator) {
    await updateParentRepliesCount(doc, "increment");
    if (!doc.parentComment) { // Only count top-level comments for novel/episode stats
      await updateTargetCommentCount(doc, "increment");
    }
  }
});

// Handle decrementing counts when a comment is soft-deleted or hidden
// Using findOneAndUpdate to capture the state before update
CommentSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate() as any; // Consider stricter typing for update
  const query = this.getQuery();

  // Check if the update involves setting isDeleted or isHiddenByModerator to true
  if (
    (update.$set && (update.$set.isDeleted === true || update.$set.isHiddenByModerator === true)) ||
    update.isDeleted === true ||
    update.isHiddenByModerator === true
  ) {
    // Explicitly type the document as IComment | null
    const docToUpdate = await this.model.findOne(query).lean() as IComment | null;
    if (docToUpdate && !docToUpdate.isDeleted && !docToUpdate.isHiddenByModerator) {
      // Store the pre-update document for the post hook
      (this as any)._docPreUpdate = docToUpdate;
    }
  }

  // Update lastEditedAt if content is changed
  if (update.$set && update.$set.content) {
    update.$set.isEdited = true;
    update.$set.lastEditedAt = new Date();
  }

  next();
});

CommentSchema.post("findOneAndUpdate", async function () {
  const preUpdateDoc = (this as any)._docPreUpdate as IComment | null;
  const postUpdateDoc = await this.model.findOne(this.getQuery()).lean() as IComment | null;

  if (preUpdateDoc && postUpdateDoc) {
    const justDeleted = !preUpdateDoc.isDeleted && postUpdateDoc.isDeleted;
    const justHidden = !preUpdateDoc.isHiddenByModerator && postUpdateDoc.isHiddenByModerator;

    if (justDeleted || justHidden) {
      await updateParentRepliesCount(postUpdateDoc, "decrement");
      if (!postUpdateDoc.parentComment) {
        await updateTargetCommentCount(postUpdateDoc, "decrement");
      }
    }
  }
});

// ----- Virtuals -----
// Direct replies to this comment
CommentSchema.virtual("directReplies", {
  ref: "Comment",
  localField: "_id",
  foreignField: "parentComment",
  match: { isDeleted: false, isHiddenByModerator: false },
  options: { sort: { createdAt: 1 } },
});

// (CommentLike model would be separate for actual like data)
// CommentSchema.virtual("commentLikes", {
//   ref: "CommentLike",
//   localField: "_id",
//   foreignField: "commentId",
//   count: true // if you only need the count from a separate collection
// });

// ----- Model Export -----
const CommentModel = () => models.Comment as mongoose.Model<IComment> || model<IComment>("Comment", CommentSchema);

export default CommentModel;

