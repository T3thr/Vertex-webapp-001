// src/backend/models/Comment.ts
// โมเดลความคิดเห็น (Comment Model)
// จัดการความคิดเห็นของผู้ใช้ต่อเนื้อหาต่างๆ เช่น นิยาย, ตอน, กระทู้, หรือความคิดเห็นอื่นๆ (nested comments)
// เวอร์ชันปรับปรุง: เพิ่มการรองรับ Board Model และการเชื่อมต่อฟังก์ชันเฉพาะทาง

import mongoose, { Document, model, models, Schema, Types } from "mongoose";
import { IBoard } from "./Board"; // (ใหม่) สำหรับการเชื่อมต่อกับ Board Model
import { IEpisode } from "./Episode"; // สำหรับ episodeId (context)
import { INovel } from "./Novel"; // สำหรับ novelId (context)
import { IUser } from "./User"; // สำหรับ userId, mentionedUserIds, hiddenByUserId, deletedByUserId

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Comment
// ==================================================================================================

/**
 * @enum {string} CommentableType
 * @description ประเภทของเนื้อหาที่สามารถแสดงความคิดเห็นได้
 * - `Novel`: แสดงความคิดเห็นต่อภาพรวมของนิยาย
 * - `Episode`: แสดงความคิดเห็นต่อตอนใดตอนหนึ่งของนิยาย
 * - `Board`: (ใหม่) แสดงความคิดเห็นในกระทู้ (Board/Thread)
 * - `Comment`: ตอบกลับความคิดเห็นอื่น (สร้าง nested comments)
 * - `Character`: (อนาคต) แสดงความคิดเห็นต่อตัวละครโดยเฉพาะ
 * - `UserPost`: (อนาคต) แสดงความคิดเห็นต่อโพสต์ของผู้ใช้ในส่วนโซเชียล
 * - `Announcement`: (อนาคต) แสดงความคิดเห็นต่อประกาศจากทีมงาน
 * - `Review`: (อนาคต) แสดงความคิดเห็นต่อรีวิว (ถ้า Review เป็น model แยก)
 */
export enum CommentableType {
  NOVEL = "Novel",
  EPISODE = "Episode",
  BOARD = "Board", // เพิ่มใหม่สำหรับ Board Model
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
 * - `hidden_by_author`: ผู้เขียนเนื้อหา (เช่น เจ้าของนิยาย/กระทู้) ซ่อนความคิดเห็นในเนื้อหาของตน
 * - `hidden_by_moderator`: ผู้ดูแลระบบ (Moderator/Admin) ซ่อนความคิดเห็น (เช่น เนื้อหาไม่เหมาะสม, รอตรวจสอบเพิ่มเติม)
 * - `reported`: ถูกรายงานโดยผู้ใช้อื่น และกำลังรอการตรวจสอบ
 * - `deleted_by_user`: ผู้ใช้เจ้าของความคิดเห็นลบความคิดเห็นของตนเอง (soft delete)
 * - `deleted_by_moderator`: ผู้ดูแลระบบลบความคิดเห็น (soft delete, อาจมีเหตุผลบันทึกไว้)
 * - `archived`: ถูกเก็บเข้าคลัง (อาจไม่แสดงผล แต่ยังอยู่ในระบบเพื่อการตรวจสอบ เช่น เมื่อกระทู้แม่ถูกลบ)
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
    previousContent: { type: String, required: true, maxlength: [10000, "เนื้อหาเดิมของ Comment ยาวเกินไป"] },
  },
  { _id: false }
);

/**
 * @interface ICommentAwards
 * @description (ใหม่) รางวัลหรือสถานะพิเศษที่ความคิดเห็นได้รับ
 */
export interface ICommentAwards {
    isBestAnswer?: boolean; // ถูกเลือกเป็นคำตอบที่ดีที่สุดในกระทู้ Q&A
    awardedAt?: Date; // วันที่ได้รับสถานะ
}
const CommentAwardsSchema = new Schema<ICommentAwards>(
    {
        isBestAnswer: { type: Boolean, default: false },
        awardedAt: { type: Date },
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
 */
export interface IComment extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId | IUser;
  targetId: Types.ObjectId; // ID ของเนื้อหาที่ถูกแสดงความคิดเห็น (Novel, Episode, Board, Comment, etc.)
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
  novelId?: Types.ObjectId | INovel; // Context: ID นิยาย
  episodeId?: Types.ObjectId | IEpisode; // Context: ID ตอน
  boardId?: Types.ObjectId | IBoard; // (ใหม่) Context: ID กระทู้
  userIpAddress?: string;
  userAgent?: string;
  isEdited: boolean;
  lastEditedAt?: Date;
  editHistory?: Types.DocumentArray<ICommentEditHistory>;
  isPinned: boolean;
  pinnedAt?: Date;
  awards?: ICommentAwards; // (ใหม่) รางวัล/สถานะพิเศษของคอมเมนต์
  moderationDetails?: {
    actionTaken?: string;
    reasonCode?: string;
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
      refPath: "targetType" // เปิดใช้งานเพื่อให้ Mongoose สามารถ populate targetId แบบ dynamic ได้
    },
    targetType: {
      type: String,
      enum: Object.values(CommentableType),
      required: [true, "กรุณาระบุประเภทของเนื้อหาที่แสดงความคิดเห็น (Target type is required)"],
      index: true,
    },
    parentCommentId: { type: Schema.Types.ObjectId, ref: "Comment", index: true, default: null },
    depth: { type: Number, default: 0, min: 0, index: true },
    content: {
      type: String,
      required: [true, "กรุณาระบุเนื้อหาความคิดเห็น (Comment content is required)"],
      trim: true,
      minlength: [1, "เนื้อหาความคิดเห็นสั้นเกินไป"],
      maxlength: [5000, "เนื้อหาความคิดเห็นยาวเกินไป (สูงสุด 5000 ตัวอักษร)"],
    },
    mentionedUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    status: {
      type: String,
      enum: Object.values(CommentStatus),
      default: CommentStatus.VISIBLE,
      required: true,
      index: true,
    },
    statusReason: { type: String, trim: true, maxlength: [500, "เหตุผลเกี่ยวกับสถานะยาวเกินไป"] },
    hiddenOrDeletedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
    likesCount: { type: Number, default: 0, min: 0, index: true },
    dislikesCount: { type: Number, default: 0, min: 0, index: true },
    repliesCount: { type: Number, default: 0, min: 0, index: true },
    novelId: { type: Schema.Types.ObjectId, ref: "Novel", index: true, sparse: true }, // Context field
    episodeId: { type: Schema.Types.ObjectId, ref: "Episode", index: true, sparse: true }, // Context field
    boardId: { type: Schema.Types.ObjectId, ref: "Board", index: true, sparse: true }, // (ใหม่) Context field
    userIpAddress: { type: String, trim: true, maxlength: [45, "IP Address ยาวเกินไป"] },
    userAgent: { type: String, trim: true, maxlength: [500, "User Agent ยาวเกินไป"] },
    isEdited: { type: Boolean, default: false },
    lastEditedAt: { type: Date },
    editHistory: { type: [CommentEditHistorySchema], select: false },
    isPinned: { type: Boolean, default: false, index: true },
    pinnedAt: { type: Date },
    awards: { type: CommentAwardsSchema, select: true }, // (ใหม่)
    moderationDetails: {
      actionTaken: { type: String, trim: true, maxlength: [100, "Action Taken ยาวเกินไป"] },
      reasonCode: { type: String, trim: true, maxlength: [100, "Reason Code ยาวเกินไป"] },
      moderatorNotes: { type: String, trim: true, maxlength: [1000, "Moderator Notes ยาวเกินไป"] },
      moderatorId: { type: Schema.Types.ObjectId, ref: "User" },
      actionAt: { type: Date },
      _id: false,
    },
    deletedAt: { type: Date, index: true, sparse: true },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    collection: "comments"
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

CommentSchema.index({ targetId: 1, targetType: 1, status: 1, isPinned: -1, createdAt: -1 }, { name: "TargetCommentsQueryIndex" });
CommentSchema.index({ parentCommentId: 1, status: 1, createdAt: 1 }, { name: "RepliesToCommentQueryIndex" });
CommentSchema.index({ userId: 1, status: 1, createdAt: -1 }, { name: "UserCommentsQueryIndex" });
CommentSchema.index({ boardId: 1, status: 1, createdAt: -1 }, { name: "BoardContextCommentsIndex", sparse: true }); // (ใหม่) Index สำหรับ query comment ในกระทู้

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

// Middleware: ก่อนบันทึก (save)
CommentSchema.pre<IComment>("save", async function (next) {
  // 1. กำหนดค่า depth และ context Ids (novelId, episodeId, boardId)
  if (this.isNew) {
      if (this.parentCommentId) {
        try {
          const parentComment = await CommentModel.findById(this.parentCommentId).select("depth novelId episodeId boardId");
          if (parentComment) {
            this.depth = parentComment.depth + 1;
            // Inherit context IDs from parent
            if (!this.novelId && parentComment.novelId) this.novelId = parentComment.novelId;
            if (!this.episodeId && parentComment.episodeId) this.episodeId = parentComment.episodeId;
            if (!this.boardId && parentComment.boardId) this.boardId = parentComment.boardId; // (ใหม่) Inherit boardId
          } else {
            this.depth = 0; // Parent ไม่พบ, fallback เป็น top-level
            console.warn(`Parent comment ID ${this.parentCommentId} not found. Setting depth to 0.`);
          }
        } catch (error) {
          console.error("Error fetching parent comment:", error);
          this.depth = 0; // Fallback
        }
      } else {
        this.depth = 0; // Top-level comment
        // (ใหม่) ถ้าเป็น top-level comment ของ Board, ให้ตั้งค่า boardId
        if (this.targetType === CommentableType.BOARD) {
            this.boardId = this.targetId;
        }
      }
  }

  // 2. ตรวจสอบการแก้ไข content และอัปเดต isEdited, lastEditedAt
  if (!this.isNew && this.isModified("content")) {
    this.isEdited = true;
    this.lastEditedAt = new Date();
    // เพิ่ม logic การเก็บ history ได้ที่นี่ (ถ้าต้องการ)
  }

  // 3. จัดการ deletedAt ตาม status
  if (this.isModified("status")) {
    const deletedStatuses = [CommentStatus.DELETED_BY_USER, CommentStatus.DELETED_BY_MODERATOR, CommentStatus.ARCHIVED];
    if (deletedStatuses.includes(this.status) && !this.deletedAt) {
      this.deletedAt = new Date();
    }
    if (this.status === CommentStatus.VISIBLE && this.deletedAt) {
      this.deletedAt = undefined;
    }
  }

  next();
});

// Helper Function: อัปเดตค่า denormalized counts ใน parent/target
async function updateCounts(comment: IComment, operation: "increment" | "decrement") {
  if (!comment) return;
  const updateValue = operation === "increment" ? 1 : -1;

  // 1. อัปเดต repliesCount ใน parentComment (ถ้าเป็นการตอบกลับ)
  if (comment.parentCommentId) {
    try {
      await CommentModel.findByIdAndUpdate(comment.parentCommentId, { $inc: { repliesCount: updateValue } });
    } catch (error) {
      console.error(`Error updating repliesCount for parent comment ${comment.parentCommentId}:`, error);
    }
  }

  // 2. อัปเดต commentsCount/repliesCount ใน Target Model (Novel, Episode, Board)
  const targetModelName = comment.targetType;
  
  // ตรวจสอบว่า mongoose.models มีค่าหรือไม่ก่อนเข้าถึง
  // เพื่อป้องกัน "Cannot read properties of undefined"
  let TargetModel: mongoose.Model<any> | null = null;
  
  try {
    if (mongoose.models && mongoose.models[targetModelName]) {
      TargetModel = mongoose.models[targetModelName] as mongoose.Model<any>;
    }
  } catch (error) {
    console.error(`Error accessing mongoose.models[${targetModelName}]:`, error);
  }
  
  if (!TargetModel) return;

  try {
    // (ใหม่) Logic เฉพาะสำหรับ Board Model
    if (targetModelName === CommentableType.BOARD) {
        const updateQuery: any = { $inc: { "stats.repliesCount": updateValue } };
        
        // เมื่อเพิ่ม comment ใหม่ ให้ update 'lastReply' ด้วย
        if (operation === "increment") {
            // ตรวจสอบว่า mongoose.models.User มีค่าหรือไม่ก่อนเข้าถึง
            let UserModel: mongoose.Model<IUser> | null = null;
            let user = null;
            
            try {
              if (mongoose.models && mongoose.models.User) {
                UserModel = mongoose.models.User as mongoose.Model<IUser>;
                user = await UserModel.findById(comment.userId).select("username").lean();
              }
            } catch (error) {
              console.error("Error accessing mongoose.models.User:", error);
            }
            updateQuery.$set = {
                "lastReply": {
                    userId: comment.userId,
                    username: user?.username || "Unknown User",
                    at: comment.createdAt,
                    commentId: comment._id
                }
            };
        }
        // หมายเหตุ: การ decrement จะไม่พยายามหา lastReply ก่อนหน้าเพื่อความเรียบง่าย
        // ระบบควร re-calculate หากจำเป็นจริงๆ
        await TargetModel.findByIdAndUpdate(comment.targetId, updateQuery);

    } else { // Logic เดิมสำหรับ Novel, Episode, etc.
        // สมมติว่า model อื่นๆ นับเฉพาะ top-level comments
        if (comment.depth === 0) {
            const targetDoc = await TargetModel.findById(comment.targetId).select("stats commentsCount").lean() as { stats?: { commentsCount: number } } | null;
            let updateQuery;
            if (targetDoc && targetDoc.stats && typeof targetDoc.stats.commentsCount === "number") {
                updateQuery = { $inc: { "stats.commentsCount": updateValue } };
            }
            if(updateQuery) {
                await TargetModel.findByIdAndUpdate(comment.targetId, updateQuery);
            }
        }
    }
  } catch (error) {
      console.error(`Error updating counts for ${targetModelName} ID ${comment.targetId}:`, error);
  }
}

// Middleware: หลังบันทึก (save)
CommentSchema.post<IComment>("save", async function (doc) {
  const isNewVisibleComment = doc.isNew && doc.status === CommentStatus.VISIBLE;
  const statusChangedToVisible = !doc.isNew && doc.isModified("status") && doc.status === CommentStatus.VISIBLE;

  if (isNewVisibleComment || statusChangedToVisible) {
    await updateCounts(doc, "increment");

    // (ใหม่) Gamification & Notification Trigger สำหรับ Board
    if (doc.targetType === CommentableType.BOARD && doc.boardId) {
        try {
            const board = await (models.Board as mongoose.Model<IBoard>).findById(doc.boardId).select("gamificationRewards subscribers").lean();
            if (board) {
                // Trigger Gamification: ให้ XP เมื่อตอบกระทู้
                const xpToGrant = board.gamificationRewards?.xpGrantedOnReply;
                if (xpToGrant && xpToGrant > 0) {
                    console.log(`[Gamification Trigger] Grant ${xpToGrant} XP to user ${doc.userId} for replying to board ${doc.boardId}`);
                    // await GamificationService.grantExperience(doc.userId, xpToGrant, 'REPLY_TO_BOARD', doc._id);
                }

                // Trigger Notification: แจ้งเตือนผู้ติดตามกระทู้
                // const subscribers = board.subscribers.filter(subId => !subId.equals(doc.userId));
                // if (subscribers.length > 0) {
                //    console.log(`[Notification Trigger] Send notification to ${subscribers.length} subscribers of board ${doc.boardId}`);
                //    // await NotificationService.notifyBoardSubscribers(doc, subscribers);
                // }
            }
        } catch (error) {
            console.error(`Error in post-save trigger for board ${doc.boardId}:`, error);
        }
    }
  }
});

// Hook สำหรับการเปลี่ยนแปลง status ที่ทำให้ comment ไม่ visible
CommentSchema.pre<mongoose.Query<IComment, IComment>>("findOneAndUpdate", async function (next) {
  const update = this.getUpdate() as any;
  if (update?.$set?.status && update.$set.status !== CommentStatus.VISIBLE) {
    const docToUpdate = await this.model.findOne(this.getQuery()).lean() as IComment | null;
    if (docToUpdate && docToUpdate.status === CommentStatus.VISIBLE) {
      await updateCounts(docToUpdate, "decrement");
    }
  }
  next();
});

// Hook สำหรับการลบ (soft/hard)
CommentSchema.post<mongoose.Query<IComment, IComment>>("findOneAndDelete", async function (doc) {
  if ((doc as IComment).status === CommentStatus.VISIBLE) {
      await updateCounts(doc as IComment, "decrement");
  }
});

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

// ใช้ try-catch เพื่อป้องกันข้อผิดพลาด "Cannot read properties of undefined"
let CommentModel: mongoose.Model<IComment>;
try {
  // ตรวจสอบว่า mongoose.models มีค่าหรือไม่
  CommentModel = mongoose.models && mongoose.models.Comment 
    ? mongoose.models.Comment as mongoose.Model<IComment>
    : model<IComment>("Comment", CommentSchema);
} catch (error) {
  // กรณีเกิดข้อผิดพลาด ให้สร้างโมเดลใหม่
  console.error("Error accessing mongoose.models.Comment:", error);
  CommentModel = model<IComment>("Comment", CommentSchema);
}

export default CommentModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **การเชื่อมต่อกับ Board**: โมเดลนี้รองรับการเป็น comment ของกระทู้แล้ว (`targetType: 'Board'`)
//     Middleware จะอัปเดต `stats.repliesCount` และ `lastReply` ใน `Board` document โดยอัตโนมัติ
// 2.  **Best Answer Workflow**: การตั้งค่า comment เป็น "คำตอบที่ดีที่สุด" ควรทำผ่าน API endpoint แยก
//     API นี้จะรับ `boardId` และ `commentId` จากนั้นจะ:
//     a. อัปเดต `Board.bestAnswer` ให้ชี้ไปที่ comment นี้
//     b. อัปเดต `Comment.awards.isBestAnswer = true` ใน comment ที่ถูกเลือก
//     c. (ถ้ามี) ยกเลิก comment ที่เคยเป็น best answer ก่อนหน้า
//     d. Trigger ระบบ Gamification เพื่อให้รางวัล (`xpGrantedForBestAnswer`) แก่เจ้าของ comment
// 3.  **Denormalization**: `likesCount`, `repliesCount` ยังคงเป็นค่า denormalized ที่จัดการผ่าน middleware เพื่อ performance
//     การอัปเดต `lastReply` ใน Board ก็เป็น denormalization เช่นกัน
// 4.  **Notifications**: การสร้าง comment ในกระทู้ ควร trigger notification ไปยังผู้ที่เกี่ยวข้อง เช่น เจ้าของกระทู้ และผู้ที่ติดตามกระทู้ (`Board.subscribers`)
//     ซึ่งควรทำผ่าน service แยก (NotificationService) เพื่อไม่ให้ logic ซับซ้อนใน middleware เกินไป
// 5.  **Context ID Propagation**: ระบบสืบทอด `novelId`, `episodeId`, และ `boardId` จาก parent comment ไปยัง child comment
//     ช่วยให้การ query หา comment ทั้งหมดที่อยู่ใน context เดียวกัน (เช่น ทุก comment ในกระทู้นี้) ทำได้ง่ายและมีประสิทธิภาพ โดยใช้ index บน `boardId`
// 6.  **Dynamic Ref (`refPath`)**: การใช้ `refPath` ทำให้ `targetId` สามารถ `populate` ข้อมูลจาก collection ที่ถูกต้องได้ (Board, Novel, etc.)
//     ต้องแน่ใจว่าทุก Model ที่อยู่ใน `CommentableType` ถูก import และ register กับ Mongoose แล้ว
// 7.  **Gamification**: ได้เพิ่มจุด trigger สำหรับการให้รางวัล XP เมื่อมีการตอบกระทู้ (`xpGrantedOnReply`) ใน `post('save')` hook
//     ใน production ควรใช้ระบบ event queue (เช่น RabbitMQ, SQS) เพื่อส่งต่อไปยัง Gamification Service
// ==================================================================================================