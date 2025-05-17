// src/backend/models/Comment.ts
// โมเดลความคิดเห็น (Comment Model)
// จัดการความคิดเห็นของผู้ใช้ต่อเนื้อหาต่างๆ เช่น นิยาย, ตอน, หรือความคิดเห็นอื่นๆ (nested comments)

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IUser } from "./User"; // สำหรับ userId, mentionedUserIds, hiddenByUserId, deletedByUserId
import { INovel } from "./Novel"; // สำหรับ novelId (context)
import { IEpisode } from "./Episode"; // สำหรับ episodeId (context)
// import { ICharacter } from "./Character"; // ถ้าจะ comment character โดยตรง
// import { IUserPost } from "./UserPost"; // ถ้ามีระบบ User Post

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Comment
// ==================================================================================================

/**
 * @enum {string} CommentableType
 * @description ประเภทของเนื้อหาที่สามารถแสดงความคิดเห็นได้
 * - `Novel`: แสดงความคิดเห็นต่อภาพรวมของนิยาย
 * - `Episode`: แสดงความคิดเห็นต่อตอนใดตอนหนึ่งของนิยาย
 * - `Comment`: ตอบกลับความคิดเห็นอื่น (สร้าง nested comments)
 * - `Character`: (อนาคต) แสดงความคิดเห็นต่อตัวละครโดยเฉพาะ
 * - `UserPost`: (อนาคต) แสดงความคิดเห็นต่อโพสต์ของผู้ใช้ในส่วนโซเชียล
 * - `Announcement`: (อนาคต) แสดงความคิดเห็นต่อประกาศจากทีมงาน
 * - `Review`: (อนาคต) แสดงความคิดเห็นต่อรีวิว (ถ้า Review เป็น model แยก)
 */
export enum CommentableType {
  NOVEL = "Novel",
  EPISODE = "Episode",
  COMMENT = "Comment", // สำหรับการตอบกลับ comment อื่น
  CHARACTER = "Character",
  USER_POST = "UserPost",
  ANNOUNCEMENT = "Announcement",
  REVIEW = "Review",
}

/**
 * @enum {string} CommentStatus
 * @description สถานะของความคิดเห็น
 * - `visible`: แสดงผลปกติ ผู้ใช้ทุกคนมองเห็น (ตามสิทธิ์การเข้าถึงเนื้อหาหลัก)
 * - `pending_approval`: รอการอนุมัติจากผู้ดูแล หรือผู้เขียนนิยาย (ถ้าตั้งค่าไว้)
 * - `hidden_by_user`: ผู้ใช้เจ้าของความคิดเห็นซ่อนความคิดเห็นของตนเอง
 * - `hidden_by_author`: ผู้เขียนเนื้อหา (เช่น เจ้าของนิยาย) ซ่อนความคิดเห็นในเนื้อหาของตน
 * - `hidden_by_moderator`: ผู้ดูแลระบบ (Moderator/Admin) ซ่อนความคิดเห็น (เช่น เนื้อหาไม่เหมาะสม, รอตรวจสอบเพิ่มเติม)
 * - `reported`: ถูกรายงานโดยผู้ใช้อื่น และกำลังรอการตรวจสอบ
 * - `deleted_by_user`: ผู้ใช้เจ้าของความคิดเห็นลบความคิดเห็นของตนเอง (soft delete)
 * - `deleted_by_moderator`: ผู้ดูแลระบบลบความคิดเห็น (soft delete, อาจมีเหตุผลบันทึกไว้)
 * - `archived`: ถูกเก็บเข้าคลัง (อาจไม่แสดงผล แต่ยังอยู่ในระบบเพื่อการตรวจสอบ)
 */
export enum CommentStatus {
  VISIBLE = "visible",
  PENDING_APPROVAL = "pending_approval",
  HIDDEN_BY_USER = "hidden_by_user",
  HIDDEN_BY_AUTHOR = "hidden_by_author",
  HIDDEN_BY_MODERATOR = "hidden_by_moderator",
  REPORTED = "reported",
  DELETED_BY_USER = "deleted_by_user",
  DELETED_BY_MODERATOR = "deleted_by_moderator",
  ARCHIVED = "archived",
}

/**
 * @interface ICommentEditHistory
 * @description ประวัติการแก้ไขความคิดเห็น (ถ้าอนุญาตให้แก้ไข)
 * @property {Date} editedAt - วันที่แก้ไข
 * @property {Types.ObjectId} editedByUserId - ID ของผู้ใช้ที่แก้ไข (ควรเป็นเจ้าของ comment หรือ admin)
 * @property {string} previousContent - เนื้อหาเดิมก่อนแก้ไข
 */
export interface ICommentEditHistory {
  editedAt: Date;
  editedByUserId: Types.ObjectId | IUser;
  previousContent: string;
}
const CommentEditHistorySchema = new Schema<ICommentEditHistory>(
  {
    editedAt: { type: Date, required: true, default: Date.now },
    editedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    previousContent: { type: String, required: true, maxlength: [10000, "เนื้อหาเดิมของ Comment ยาวเกินไป"] }, // ควรเท่ากับ maxLength ของ content หลัก
  },
  { _id: false }
);

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร Comment (IComment Document Interface)
// ==================================================================================================

/**
 * @interface IComment
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารความคิดเห็นใน Collection "comments"
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสารความคิดเห็น
 * @property {Types.ObjectId | IUser} userId - ID ของผู้ใช้ที่แสดงความคิดเห็น (**จำเป็น**, อ้างอิง User model)
 * @property {Types.ObjectId} targetId - ID ของเนื้อหาที่ถูกแสดงความคิดเห็น (Novel, Episode, Comment, etc., **จำเป็น**)
 * @property {CommentableType} targetType - ประเภทของเนื้อหาที่ถูกแสดงความคิดเห็น (**จำเป็น**)
 * @property {Types.ObjectId | IComment} [parentCommentId] - ID ของความคิดเห็นแม่ (ถ้าเป็นการตอบกลับ, อ้างอิง Comment model)
 * @property {number} depth - ระดับความลึกของ nested comment (0 สำหรับ top-level, 1 สำหรับ reply, ...)
 * @property {string} content - เนื้อหาของความคิดเห็น (**จำเป็น**, minlength, maxlength)
 * @property {Types.ObjectId[] | IUser[]} [mentionedUserIds] - ผู้ใช้ที่ถูกกล่าวถึงในความคิดเห็น (อ้างอิง User model)
 * @property {CommentStatus} status - สถานะของความคิดเห็น (default: `visible` หรือ `pending_approval` ขึ้นอยู่กับนโยบาย)
 * @property {string} [statusReason] - เหตุผลเพิ่มเติมเกี่ยวกับสถานะ (เช่น เหตุผลที่ซ่อน/ลบ/ไม่อนุมัติ)
 * @property {Types.ObjectId | IUser} [hiddenOrDeletedByUserId] - ID ของผู้ใช้ที่ซ่อนหรือลบความคิดเห็นนี้
 * @property {number} likesCount - จำนวนการถูกใจความคิดเห็นนี้ (denormalized, อัปเดตจาก Like model)
 * @property {number} dislikesCount - จำนวนการไม่ถูกใจความคิดเห็นนี้ (denormalized, ถ้ามีระบบ dislike)
 * @property {number} repliesCount - จำนวนการตอบกลับความคิดเห็นนี้ (denormalized, สำหรับ top-level หรือ parent comments)
 * @property {Types.ObjectId | INovel} [novelId] - ID ของนิยาย (context, สำหรับ query ง่ายขึ้นเมื่อ targetType คือ Episode หรือ Comment ในนิยาย)
 * @property {Types.ObjectId | IEpisode} [episodeId] - ID ของตอน (context, สำหรับ query ง่ายขึ้นเมื่อ targetType คือ Comment ในตอน)
 * @property {string} [userIpAddress] - IP Address ของผู้แสดงความคิดเห็น (เพื่อความปลอดภัยและการตรวจสอบ)
 * @property {string} [userAgent] - User Agent ของผู้แสดงความคิดเห็น
 * @property {boolean} isEdited - ความคิดเห็นนี้เคยถูกแก้ไขหรือไม่
 * @property {Date} [lastEditedAt] - วันที่แก้ไขล่าสุด
 * @property {Types.DocumentArray<ICommentEditHistory>} [editHistory] - ประวัติการแก้ไข (ถ้าเก็บ)
 * @property {boolean} isPinned - ความคิดเห็นนี้ถูกปักหมุดโดยผู้เขียนเนื้อหาหรือผู้ดูแลหรือไม่
 * @property {Date} [pinnedAt] - วันที่ปักหมุด
 * @property {any} [moderationDetails] - รายละเอียดเพิ่มเติมจากการ Moderation (เช่น ประเภทการละเมิด, action ที่ถูกดำเนินการ)
 * @property {Date} [deletedAt] - วันที่ถูกลบ (สำหรับ soft delete)
 * @property {Date} createdAt - วันที่สร้างเอกสารความคิดเห็น (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตเอกสารความคิดเห็นล่าสุด (Mongoose `timestamps`)
 */
export interface IComment extends Document {
  [x: string]: any;
  _id: Types.ObjectId;
  userId: Types.ObjectId | IUser;
  targetId: Types.ObjectId; // ควรมี refPath เพื่อ dynamic ref
  targetType: CommentableType;
  parentCommentId?: Types.ObjectId | IComment;
  depth: number;
  content: string;
  mentionedUserIds?: (Types.ObjectId | IUser)[];
  status: CommentStatus;
  statusReason?: string;
  hiddenOrDeletedByUserId?: Types.ObjectId | IUser;
  likesCount: number;
  dislikesCount: number;
  repliesCount: number;
  novelId?: Types.ObjectId | INovel;
  episodeId?: Types.ObjectId | IEpisode;
  userIpAddress?: string;
  userAgent?: string;
  isEdited: boolean;
  lastEditedAt?: Date;
  editHistory?: Types.DocumentArray<ICommentEditHistory>;
  isPinned: boolean;
  pinnedAt?: Date;
  moderationDetails?: {
    actionTaken?: string; // e.g., "warned", "content_removed", "user_banned_temporarily"
    reasonCode?: string; // e.g., "spam", "hate_speech", "off_topic"
    moderatorNotes?: string;
    moderatorId?: Types.ObjectId | IUser;
    actionAt?: Date;
  };
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ Comment (CommentSchema)
// ==================================================================================================
const CommentSchema = new Schema<IComment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุ ID ของผู้ใช้ (User ID is required)"],
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: [true, "กรุณาระบุ ID ของเนื้อหาที่แสดงความคิดเห็น (Target ID is required)"],
      index: true,
      // refPath: "targetType" // เปิดใช้งานเพื่อให้ Mongoose สามารถ populate targetId แบบ dynamic ได้
                               // แต่ต้องแน่ใจว่าทุก model ใน CommentableType ถูก import และ register กับ Mongoose แล้ว
    },
    targetType: {
      type: String,
      enum: Object.values(CommentableType),
      required: [true, "กรุณาระบุประเภทของเนื้อหาที่แสดงความคิดเห็น (Target type is required)"],
      index: true,
    },
    parentCommentId: { type: Schema.Types.ObjectId, ref: "Comment", index: true, default: null },
    depth: { type: Number, default: 0, min: 0, index: true }, // 0 for top-level
    content: {
      type: String,
      required: [true, "กรุณาระบุเนื้อหาความคิดเห็น (Comment content is required)"],
      trim: true,
      minlength: [1, "เนื้อหาความคิดเห็นสั้นเกินไป"],
      maxlength: [5000, "เนื้อหาความคิดเห็นยาวเกินไป (สูงสุด 5000 ตัวอักษร)"], // ปรับตามความเหมาะสม
    },
    mentionedUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    status: {
      type: String,
      enum: Object.values(CommentStatus),
      default: CommentStatus.VISIBLE, // หรือ CommentStatus.PENDING_APPROVAL ตามนโยบาย
      required: true,
      index: true,
    },
    statusReason: { type: String, trim: true, maxlength: [500, "เหตุผลเกี่ยวกับสถานะยาวเกินไป"] },
    hiddenOrDeletedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
    likesCount: { type: Number, default: 0, min: 0, index: true },
    dislikesCount: { type: Number, default: 0, min: 0, index: true }, // ถ้ามีระบบ dislike
    repliesCount: { type: Number, default: 0, min: 0, index: true },
    novelId: { type: Schema.Types.ObjectId, ref: "Novel", index: true }, // Context field
    episodeId: { type: Schema.Types.ObjectId, ref: "Episode", index: true }, // Context field
    userIpAddress: { type: String, trim: true, maxlength: [45, "IP Address ยาวเกินไป"] },
    userAgent: { type: String, trim: true, maxlength: [500, "User Agent ยาวเกินไป"] },
    isEdited: { type: Boolean, default: false },
    lastEditedAt: { type: Date },
    editHistory: [CommentEditHistorySchema],
    isPinned: { type: Boolean, default: false, index: true },
    pinnedAt: { type: Date },
    moderationDetails: {
      actionTaken: { type: String, trim: true, maxlength: [100, "Action Taken ยาวเกินไป"] },
      reasonCode: { type: String, trim: true, maxlength: [100, "Reason Code ยาวเกินไป"] },
      moderatorNotes: { type: String, trim: true, maxlength: [1000, "Moderator Notes ยาวเกินไป"] },
      moderatorId: { type: Schema.Types.ObjectId, ref: "User" },
      actionAt: { type: Date },
      _id: false,
    },
    deletedAt: { type: Date, index: true }, // สำหรับ soft delete
  },
  {
    timestamps: true, // เพิ่ม createdAt และ updatedAt โดยอัตโนมัติ
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

// ==================================================================================================
// SECTION: Dynamic Reference for targetId (ถ้าต้องการใช้ populate แบบ dynamic)
// ==================================================================================================
// CommentSchema.virtual("target", {
//   ref: (doc: IComment) => doc.targetType, // The model to use, conditional on targetType
//   localField: "targetId",
//   foreignField: "_id",
//   justOne: true,
// });

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

// Index หลักสำหรับการดึงความคิดเห็นของเนื้อหาเป้าหมาย (เรียงตามวันที่สร้างล่าสุด หรือตาม pinned status ก่อน)
CommentSchema.index({ targetId: 1, targetType: 1, status: 1, isPinned: -1, createdAt: -1 }, { name: "TargetCommentsQueryIndex" });
CommentSchema.index({ targetId: 1, targetType: 1, status: 1, likesCount: -1, createdAt: -1 }, { name: "TargetCommentsPopularityIndex" }); // สำหรับเรียงตามความนิยม

// Index สำหรับการดึงการตอบกลับ (replies) ของความคิดเห็นแม่
CommentSchema.index({ parentCommentId: 1, status: 1, createdAt: 1 }, { name: "RepliesToCommentQueryIndex" });

// Index สำหรับการดึงความคิดเห็นทั้งหมดของผู้ใช้คนใดคนหนึ่ง
CommentSchema.index({ userId: 1, status: 1, createdAt: -1 }, { name: "UserCommentsQueryIndex" });

// Index สำหรับการค้นหาความคิดเห็นที่ถูกลบ (soft delete)
CommentSchema.index({ status: 1, deletedAt: 1 }, { name: "SoftDeletedCommentsIndex" });

// Index สำหรับ novelId และ episodeId เพื่อการ query ที่ง่ายขึ้น (ถ้าใช้บ่อย)
CommentSchema.index({ novelId: 1, status: 1, createdAt: -1 }, { name: "NovelContextCommentsIndex", sparse: true });
CommentSchema.index({ episodeId: 1, status: 1, createdAt: -1 }, { name: "EpisodeContextCommentsIndex", sparse: true });

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

// Middleware: ก่อนบันทึก (save)
CommentSchema.pre<IComment>("save", async function (next) {
  // 1. กำหนดค่า depth สำหรับ nested comments
  if (this.isNew && this.parentCommentId) {
    try {
      const parentComment = await CommentModel.findById(this.parentCommentId).select("depth novelId episodeId");
      if (parentComment) {
        this.depth = parentComment.depth + 1;
        // Inherit novelId and episodeId from parent if not set and parent has them
        if (!this.novelId && parentComment.novelId) this.novelId = parentComment.novelId;
        if (!this.episodeId && parentComment.episodeId) this.episodeId = parentComment.episodeId;
      } else {
        // Parent comment ไม่พบ, อาจจะตั้ง depth เป็น 0 หรือ throw error
        this.depth = 0; // หรือจัดการตามนโยบาย
        console.warn(`Parent comment ID ${this.parentCommentId} not found during save. Setting depth to 0.`);
      }
    } catch (error) {
      console.error("Error fetching parent comment for depth calculation:", error);
      this.depth = 0; // Fallback
    }
  } else if (this.isNew) {
    this.depth = 0; // Top-level comment
  }

  // 2. ตรวจสอบการแก้ไข content และอัปเดต isEdited, lastEditedAt, editHistory
  if (!this.isNew && this.isModified("content")) {
    this.isEdited = true;
    this.lastEditedAt = new Date();
    // const originalDoc = await this.constructor.findById(this._id).lean(); // this.constructor is the model
    // if (originalDoc && originalDoc.content !== this.content) {
    //   this.editHistory.push({ 
    //     editedAt: new Date(), 
    //     editedByUserId: this.userId, // ควรเป็น user ที่กำลังแก้ไข ไม่ใช่เจ้าของ comment เสมอไป
    //     previousContent: originalDoc.content 
    //   });
    // }
  }

  // 3. ถ้า status เปลี่ยนเป็นสถานะที่เกี่ยวข้องกับการลบ และยังไม่มี deletedAt ให้ตั้งค่า
  if (this.isModified("status")) {
    const deletedStatuses = [CommentStatus.DELETED_BY_USER, CommentStatus.DELETED_BY_MODERATOR];
    if (deletedStatuses.includes(this.status) && !this.deletedAt) {
      this.deletedAt = new Date();
    }
    // ถ้า status เปลี่ยนกลับเป็น visible จากสถานะ deleted, ให้ล้าง deletedAt
    if (this.status === CommentStatus.VISIBLE && this.deletedAt) {
      this.deletedAt = undefined;
    }
  }

  next();
});

// Middleware: หลังบันทึก (save) หรือลบ (remove, findOneAndDelete)
// เพื่ออัปเดต repliesCount ใน parentComment และ commentsCount ใน targetModel
async function updateCounts(comment: IComment, operation: "increment" | "decrement") {
  if (!comment) return;

  // 1. อัปเดต repliesCount ใน parentComment (ถ้ามี)
  if (comment.parentCommentId) {
    const updateValue = operation === "increment" ? 1 : -1;
    try {
      await CommentModel.findByIdAndUpdate(comment.parentCommentId, { $inc: { repliesCount: updateValue } });
    } catch (error) {
      console.error(`Error updating repliesCount for parent comment ${comment.parentCommentId}:`, error);
    }
  }

  // 2. อัปเดต commentsCount ใน targetModel (เฉพาะ top-level comments หรือตามนโยบาย)
  //    การนับ commentsCount ของ target ควรนับเฉพาะ top-level (depth 0) หรือนับทั้งหมด?
  //    ถ้านับทั้งหมด อาจจะซับซ้อนในการ update เมื่อมีการลบ nested comment
  //    ที่นี่จะสมมติว่า commentsCount ของ target นับเฉพาะ top-level comments ที่ visible
  if (comment.depth === 0 && comment.status === CommentStatus.VISIBLE) {
    const targetModelName = comment.targetType;
    const TargetModel = models[targetModelName] as mongoose.Model<any>; // ควรตรวจสอบว่า TargetModel มีอยู่จริง

    if (TargetModel) {
      const updateValue = operation === "increment" ? 1 : -1;
      try {
        // ตรวจสอบว่า target model มี field stats.commentsCount หรือ commentsCount โดยตรง
        const targetDoc = await TargetModel.findById(comment.targetId).select("stats commentsCount");
        let updateQuery;
        if (targetDoc && targetDoc.stats && typeof targetDoc.stats.commentsCount === "number") {
          updateQuery = { $inc: { "stats.commentsCount": updateValue } };
        } else if (targetDoc && typeof targetDoc.commentsCount === "number") {
          updateQuery = { $inc: { "commentsCount": updateValue } };
        } else {
          // Default: พยายามอัปเดต stats.commentsCount (อาจต้องสร้าง field นี้ใน target models)
          updateQuery = { $inc: { "stats.commentsCount": updateValue } }; 
          // console.warn(`Target model "${targetModelName}" does not have a recognized commentsCount field for ID ${comment.targetId}. Attempting 'stats.commentsCount'.`);
        }
        await TargetModel.findByIdAndUpdate(comment.targetId, updateQuery);
      } catch (error) {
        console.error(`Error updating commentsCount for ${targetModelName} ID ${comment.targetId}:`, error);
      }
    }
  }
}

// Middleware: หลังบันทึก (save)
CommentSchema.post<IComment>("save", async function (doc) {
  // ตรวจสอบว่าเป็นการสร้าง comment ใหม่ที่ visible หรือ status เปลี่ยนเป็น visible
  const isNewVisibleComment = doc.isNew && doc.status === CommentStatus.VISIBLE;
  const statusChangedToVisible = !doc.isNew && doc.isModified("status") && doc.status === CommentStatus.VISIBLE && doc.$__.priorDoc?.status !== CommentStatus.VISIBLE;

  if (isNewVisibleComment || statusChangedToVisible) {
    await updateCounts(doc, "increment");
  }
});

// Hook สำหรับการเปลี่ยนแปลง status ที่ทำให้ comment ไม่ visible อีกต่อไป
CommentSchema.pre<mongoose.Query<IComment, IComment>>("findOneAndUpdate", async function (next) {
  const update = this.getUpdate() as any;
  if (update && update.status && update.status !== CommentStatus.VISIBLE) {
    const docToUpdate = await this.model.findOne(this.getQuery()).lean() as IComment | null;
    if (docToUpdate && docToUpdate.status === CommentStatus.VISIBLE) {
      // ถ้า comment เดิมเป็น visible และกำลังจะเปลี่ยนเป็น non-visible
      await updateCounts(docToUpdate, "decrement");
    }
  }
  next();
});

CommentSchema.post<mongoose.Query<IComment, IComment>>("findOneAndDelete", async function (doc) {
  // ตรวจสอบว่า doc เป็น IComment และมี status
  if (doc && "modifiedCount" in doc === false && "status" in doc) {
    if ((doc as IComment).status === CommentStatus.VISIBLE) {
      // ถ้า comment ที่ถูกลบเป็น visible
      await updateCounts(doc as IComment, "decrement");
    }
  }
});

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

// ตรวจสอบว่า Model "Comment" ถูกสร้างไปแล้วหรือยัง ถ้ายัง ให้สร้าง Model ใหม่
const CommentModel = (models.Comment as mongoose.Model<IComment>) || model<IComment>("Comment", CommentSchema);

export default CommentModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Dynamic Ref for `targetId`**: การใช้ `refPath: "targetType"` ใน `targetId` จะช่วยให้ Mongoose populate ข้อมูลจาก collection ที่ถูกต้องได้โดยอัตโนมัติ
//     แต่ต้องมั่นใจว่าทุก Model ที่อยู่ใน `CommentableType` ได้ถูก import และ register กับ Mongoose ก่อนที่ CommentModel จะถูก initialize.
// 2.  **Denormalization**: `likesCount`, `dislikesCount`, `repliesCount` เป็นค่า denormalized เพื่อ performance ในการ query.
//     การอัปเดตค่าเหล่านี้ต้องทำอย่างระมัดระวังผ่าน middleware หรือ service layer.
// 3.  **`commentsCount` in Target Models**: Middleware ที่อัปเดต `commentsCount` ใน target model (Novel, Episode, etc.)
//     จำเป็นต้องมีการออกแบบ field `commentsCount` (อาจจะอยู่ใน `stats` object) ใน target models เหล่านั้นด้วย.
// 4.  **Content Moderation Workflow**: ระบบ comment ควรมี workflow สำหรับการ report และ moderation ที่ชัดเจน.
//     `status`, `statusReason`, `moderationDetails` เป็นส่วนหนึ่งของ workflow นี้.
// 5.  **Notifications**: การสร้าง comment หรือ reply ควร trigger notification ไปยังผู้ที่เกี่ยวข้อง (เช่น เจ้าของเนื้อหา, ผู้ที่ถูก mention, เจ้าของ parent comment).
// 6.  **Performance for Deeply Nested Comments**: การแสดงผล nested comments ที่ลึกมากๆ อาจมีผลต่อ performance.
//     อาจต้องพิจารณาการจำกัดความลึก, lazy loading, หรือการ flatten โครงสร้างในบางกรณี.
// 7.  **Edit History**: การเก็บ `editHistory` อาจทำให้ document มีขนาดใหญ่ขึ้น ควรพิจารณาว่าจำเป็นต้องเก็บประวัติทั้งหมดหรือไม่ หรือเก็บเฉพาะการแก้ไขล่าสุด.
// 8.  **User Mentions**: ระบบ mention (@username) ควรมีการ parse content เพื่อหา mentions และ link ไปยัง User profile.
// 9.  **Rich Text Content**: ถ้าเนื้อหา comment รองรับ rich text (เช่น Markdown, HTML subset) ต้องมีการ sanitize เพื่อป้องกัน XSS.
// 10. **Rate Limiting**: ป้องกันการ spam comment ด้วย rate limiting ต่อ user หรือ IP address.
// 11. **Searchability**: การทำ Full-text search บน `content` อาจต้องพิจารณาถ้ามี comment จำนวนมาก.
// ==================================================================================================
