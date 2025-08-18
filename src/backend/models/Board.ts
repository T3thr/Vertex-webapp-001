// src/backend/models/Board.ts
// โมเดลกระทู้ (Board Model) - ระบบ Thread/Forum สำหรับแพลตฟอร์ม DivWy
// จัดการกระทู้และการสนทนาของผู้ใช้ เกี่ยวกับนิยาย, ตัวละคร, หรือหัวข้อทั่วไปในชุมชน
// เวอร์ชันปรับปรุง: เพิ่มความสามารถด้าน Q&A, Review, Edit History, และการเชื่อมโยงกับระบบ Gamification และ Moderation ขั้นสูง

import mongoose, { Schema, model, models, Types, Document, HydratedDocument } from "mongoose";
import { IUser } from "./User"; // สำหรับ authorId, lastReplyUserId, และผู้ดูแล
import { INovel } from "./Novel"; // สำหรับ novelAssociated
import { ICategory } from "./Category"; // สำหรับ categoryAssociated
import { IComment } from "./Comment"; // สำหรับ bestAnswer.commentId
import { ILike } from "./Like"; // สำหรับการลบ Likes ที่เกี่ยวข้อง
import { IContentReport } from "./ContentReport"; // สำหรับการอัปเดต Reports
import { IActivityHistory } from "./ActivityHistory"; // สำหรับการสร้าง Activity Log

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Board
// ==================================================================================================

/**
 * @enum {string} BoardStatus
 * @description สถานะของกระทู้ (ละเอียดขึ้นสำหรับทีม Moderator)
 * - `published`: เผยแพร่แล้ว, มองเห็นและตอบกลับได้ (สถานะปกติ)
 * - `locked`: ล็อกกระทู้, อ่านได้อย่างเดียวแต่ตอบกลับไม่ได้ (โดย Moderator)
 * - `archived`: เก็บเข้าคลัง, ไม่แสดงในรายการหลัก แต่ยังเข้าถึงได้ผ่านลิงก์ตรง (สำหรับเจ้าของ/ผู้ดูแล)
 * - `hidden_by_author`: ซ่อนโดยเจ้าของกระทู้ (ยังอยู่ในระบบ แต่ไม่แสดงสาธารณะ)
 * - `hidden_by_moderator`: ซ่อนโดยผู้ดูแล (สำหรับเนื้อหาที่ต้องตรวจสอบเพิ่มเติม)
 * - `unlisted`: ไม่แสดงในรายการกระทู้ แต่เข้าถึงได้ผ่านลิงก์ตรง (เหมือนวิดีโอ unlisted)
 * - `deleted`: ลบกระทู้แล้ว (soft delete)
 * - `pending_review`: รอการตรวจสอบโดยทีมงาน (สำหรับกระทู้ที่เข้าข่าย หรือถูกตั้งค่าให้ต้องตรวจสอบก่อน)
 * - `requires_author_edit`: รอการแก้ไขจากผู้เขียน (Moderator ส่งกลับให้แก้ไข)
 */
export enum BoardStatus {
  PUBLISHED = "published",
  LOCKED = "locked",
  ARCHIVED = "archived",
  HIDDEN_BY_AUTHOR = "hidden_by_author",
  HIDDEN_BY_MODERATOR = "hidden_by_moderator",
  UNLISTED = "unlisted",
  DELETED = "deleted",
  PENDING_REVIEW = "pending_review",
  REQUIRES_AUTHOR_EDIT = "requires_author_edit",
}

/**
 * @enum {string} BoardType
 * @description ประเภทของกระทู้ เพื่อกำหนด UI และฟังก์ชันที่แตกต่างกัน
 * - `discussion`: กระทู้พูดคุยทั่วไป
 * - `question`: กระทู้ถาม-ตอบ (สามารถมี "คำตอบที่ดีที่สุด" ได้)
 * - `review`: กระทู้รีวิวนิยาย (มีระบบให้คะแนนแยกย่อย)
 * - `announcement`: ประกาศ (สำหรับ Admin/Moderator/Writer)
 * - `guide`: กระทู้แนะนำ/สอนการใช้งาน/ทฤษฎีในเรื่อง
 * - `fan_creation`: แชร์ผลงานจากแฟนๆ (Fan Art, Fan Fic Snippet, Music)
 * - `poll`: โพลสำรวจความคิดเห็น
 * - `bug_report`: รายงานข้อผิดพลาดของระบบ/นิยาย (อาจเชื่อมกับระบบ Issue Tracking)
 * - `theory_crafting`: กระทู้สร้างทฤษฎีเกี่ยวกับเนื้อเรื่อง
 */
export enum BoardType {
  DISCUSSION = "discussion",
  QUESTION = "question",
  REVIEW = "review",
  ANNOUNCEMENT = "announcement",
  GUIDE = "guide",
  FAN_CREATION = "fan_creation",
  POLL = "poll",
  BUG_REPORT = "bug_report",
  THEORY_CRAFTING = "theory_crafting",
}

/**
 * @interface IBoardAttachment
 * @description ข้อมูลไฟล์หรือสื่อที่แนบมากับกระทู้
 */
export interface IBoardAttachment {
  mediaId: Types.ObjectId; // อ้างอิงถึง Media Model
  fileName: string; // (Denormalized) ชื่อไฟล์
  fileUrl: string; // (Denormalized) URL ของไฟล์
  fileType: "image" | "video" | "audio" | "other"; // (Denormalized) ประเภทไฟล์
  displayOrder: number; // ลำดับการแสดงผล
  caption?: string; // คำบรรยายภาพ/สื่อ
}

const BoardAttachmentSchema = new Schema<IBoardAttachment>(
  {
    mediaId: { type: Schema.Types.ObjectId, ref: "Media", required: true },
    fileName: { type: String, required: true, trim: true, maxlength: 255 },
    fileUrl: { type: String, required: true, trim: true, maxlength: 2048 },
    fileType: { type: String, enum: ["image", "video", "audio", "other"], required: true },
    displayOrder: { type: Number, default: 0 },
    caption: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false }
);

/**
 * @interface IBoardPoll
 * @description ข้อมูลโพลในกระทู้ (ถ้า boardType เป็น poll)
 */
export interface IBoardPoll {
  question: string;
  options: Array<{
    optionId: Types.ObjectId;
    text: string;
    voterIds: Types.ObjectId[];
    votesCount: number; // Denormalized count
  }>;
  totalVotes: number;
  allowMultipleChoice: boolean;
  expiresAt?: Date;
  isAnonymous: boolean;
}

const BoardPollSchema = new Schema<IBoardPoll>(
  {
    question: { type: String, required: true, trim: true, maxlength: 500 },
    options: [
      {
        optionId: { type: Schema.Types.ObjectId, default: () => new Types.ObjectId() },
        text: { type: String, required: true, trim: true, maxlength: 200 },
        voterIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
        votesCount: { type: Number, default: 0, min: 0 },
        _id: false,
      },
    ],
    totalVotes: { type: Number, default: 0, min: 0 },
    allowMultipleChoice: { type: Boolean, default: false },
    expiresAt: { type: Date },
    isAnonymous: { type: Boolean, default: false },
  },
  { _id: false }
);

/**
 * @interface IReviewDetails
 * @description ข้อมูลเฉพาะสำหรับกระทู้ประเภทรีวิว
 */
export interface IReviewDetails {
  ratingValue: number; // คะแนนที่ให้ (เช่น 1-5, เพิ่มขึ้นทีละ 0.5)
  ratingBreakdown?: {
    story?: number;
    characters?: number;
    visuals?: number;
    audio?: number;
    gameplay?: number;
  };
  readingProgress: "not_started" | "in_progress" | "completed"; // ความคืบหน้าการอ่านของผู้รีวิว
}

const ReviewDetailsSchema = new Schema<IReviewDetails>(
    {
        ratingValue: { type: Number, required: true, min: 0.5, max: 5, validate: { validator: (v: number) => v % 0.5 === 0, message: "คะแนนต้องเป็นจำนวนเต็มหรือ .5" } },
        ratingBreakdown: {
            story: { type: Number, min: 1, max: 5 },
            characters: { type: Number, min: 1, max: 5 },
            visuals: { type: Number, min: 1, max: 5 },
            audio: { type: Number, min: 1, max: 5 },
            gameplay: { type: Number, min: 1, max: 5 },
            _id: false,
        },
        readingProgress: { type: String, enum: ["not_started", "in_progress", "completed"], default: "in_progress"},
    },
    { _id: false }
);

/**
 * @interface IBestAnswer
 * @description ข้อมูลสำหรับคำตอบที่ดีที่สุดในกระทู้ประเภทคำถาม
 */
export interface IBestAnswer {
  commentId: Types.ObjectId | IComment; // อ้างอิง Comment ที่เป็นคำตอบ
  markedByUserId: Types.ObjectId | IUser; // ผู้ที่เลือก (เจ้าของกระทู้ หรือ Moderator)
  markedAt: Date;
}

const BestAnswerSchema = new Schema<IBestAnswer>(
  {
    commentId: { type: Schema.Types.ObjectId, ref: "Comment", required: true },
    markedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    markedAt: { type: Date, default: Date.now, required: true },
  },
  { _id: false }
);

/**
 * @interface IEditHistory
 * @description ประวัติการแก้ไขกระทู้
 */
export interface IEditHistory {
  editedAt: Date;
  editedByUserId: Types.ObjectId | IUser;
  previousTitle: string;
  previousContent: string;
  reason?: string;
}

const EditHistorySchema = new Schema<IEditHistory>(
  {
    editedAt: { type: Date, default: Date.now },
    editedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    previousTitle: { type: String, required: true, maxlength: 200 },
    previousContent: { type: String, required: true, maxlength: 60000 },
    reason: { type: String, trim: true, maxlength: 200 },
  },
  { _id: false }
);

/**
 * @interface IBoardStats
 * @description สถิติของกระทู้ (Denormalized Data)
 */
export interface IBoardStats {
  viewsCount: number;
  repliesCount: number;
  likesCount: number; // Likes on the main post
  upvotesCount: number; // For Q&A or discussion, can be used instead of likes
  downvotesCount: number; // For Q&A or discussion
  sharesCount: number;
  bookmarksCount: number;
}

const BoardStatsSchema = new Schema<IBoardStats>(
  {
    viewsCount: { type: Number, default: 0, min: 0 },
    repliesCount: { type: Number, default: 0, min: 0 },
    likesCount: { type: Number, default: 0, min: 0 },
    upvotesCount: { type: Number, default: 0, min: 0 },
    downvotesCount: { type: Number, default: 0, min: 0 },
    sharesCount: { type: Number, default: 0, min: 0 },
    bookmarksCount: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

/**
 * @interface IModerationLog
 * @description ประวัติการดำเนินการของ Moderator ต่อกระทู้นี้
 */
export interface IModerationLog {
    timestamp: Date;
    moderatorId: Types.ObjectId | IUser;
    action: string; // e.g., 'LOCK', 'PIN', 'CHANGE_STATUS', 'EDIT_TAGS'
    reason?: string;
    notes?: string; // บันทึกภายในสำหรับทีมงาน
}

const ModerationLogSchema = new Schema<IModerationLog>({
    timestamp: { type: Date, default: Date.now, required: true },
    moderatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true, trim: true, maxlength: 100 },
    reason: { type: String, trim: true, maxlength: 500 },
    notes: { type: String, trim: true, maxlength: 1000 },
}, { _id: false });


// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร Board (IBoard Document Interface)
// ==================================================================================================

export interface IBoard extends Document {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  content: string; // เนื้อหาหลัก (รองรับ Markdown/Rich Text)
  contentFormat: "markdown" | "html"; // รูปแบบของเนื้อหา
  authorId: Types.ObjectId | IUser;
  // Denormalized author data for faster list rendering
  authorUsername: string;
  authorAvatarUrl?: string;
  authorRoles: string[]; // Denormalized roles e.g., ['Writer', 'Admin']
  boardType: BoardType;
  status: BoardStatus;
  novelAssociated?: Types.ObjectId | INovel; // นิยายที่เกี่ยวข้อง
  categoryAssociated: Types.ObjectId | ICategory; // หมวดหมู่ของบอร์ด (เช่น "พูดคุยทั่วไป", "สปอยล์", "ทฤษฎี")
  tags: string[];
  containsSpoilers: boolean; // (ใหม่) กระทู้นี้มีสปอยล์หรือไม่ (สำหรับเบลอเนื้อหา)
  attachments?: Types.DocumentArray<IBoardAttachment>;
  poll?: IBoardPoll; // สำหรับ boardType 'poll'
  reviewDetails?: IReviewDetails; // สำหรับ boardType 'review'
  bestAnswer?: IBestAnswer; // สำหรับ boardType 'question'
  stats: IBoardStats;
  subscribers: Types.ObjectId[]; // ผู้ใช้ที่ติดตามกระทู้นี้เพื่อรับการแจ้งเตือน
  isPinned: boolean;
  isLocked: boolean;
  lockReason?: string; // เหตุผลที่ล็อกกระทู้
  isEdited: boolean;
  lastEditedAt?: Date;
  editHistory?: Types.DocumentArray<IEditHistory>; // ประวัติการแก้ไข
  moderationLogs?: Types.DocumentArray<IModerationLog>; // ประวัติการดูแล
  lastReply?: {
    userId: Types.ObjectId;
    username: string; // Denormalized
    at: Date;
    commentId: Types.ObjectId;
  };
  gamificationRewards?: { // (สำหรับ Admin ตั้งค่า)
    xpGrantedOnCreate?: number;
    xpGrantedOnReply?: number;
    xpGrantedForBestAnswer?: number;
    badgeGrantedOnCreate?: string; // Key ของ Badge ที่จะให้เมื่อสร้างกระทู้
  };
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  updateLastReply(commentId: Types.ObjectId, userId: Types.ObjectId, username: string): Promise<void>;
  incrementViewCount(userId?: Types.ObjectId): Promise<void>; // เพิ่ม userId เพื่อจัดการ unique view
  toggleSubscription(userId: Types.ObjectId): Promise<boolean>;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ Board (BoardSchema)
// ==================================================================================================
const BoardSchema = new Schema<IBoard>(
  {
    title: {
      type: String,
      required: [true, "กรุณาระบุหัวข้อกระทู้"],
      trim: true,
      minlength: [5, "หัวข้อกระทู้ต้องมีอย่างน้อย 5 ตัวอักษร"],
      maxlength: [200, "หัวข้อกระทู้ต้องไม่เกิน 200 ตัวอักษร"],
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 250,
      index: true,
    },
    content: {
      type: String,
      required: [true, "กรุณาระบุเนื้อหากระทู้"],
      trim: true,
      minlength: [10, "เนื้อหากระทู้ต้องมีอย่างน้อย 10 ตัวอักษร"],
      maxlength: [60000, "เนื้อหากระทู้ต้องไม่เกิน 60000 ตัวอักษร"],
    },
    contentFormat: { type: String, enum: ["markdown", "html"], default: "markdown" },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    authorUsername: { type: String, required: true, trim: true },
    authorAvatarUrl: { type: String, trim: true },
    authorRoles: [{ type: String }],
    boardType: {
      type: String,
      enum: Object.values(BoardType),
      required: true,
      default: BoardType.DISCUSSION,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(BoardStatus),
      default: BoardStatus.PUBLISHED,
      required: true,
      index: true,
    },
    novelAssociated: {
      type: Schema.Types.ObjectId,
      ref: "Novel",
      index: true,
      sparse: true,
    },
    categoryAssociated: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "กรุณาระบุหมวดหมู่ของบอร์ด"],
      index: true,
    },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 50, index: true }],
    containsSpoilers: { type: Boolean, default: false, index: true },
    attachments: [BoardAttachmentSchema],
    poll: {
      type: BoardPollSchema,
      required: function(this: IBoard) { return this.boardType === BoardType.POLL; },
    },
    reviewDetails: {
        type: ReviewDetailsSchema,
        required: function(this: IBoard) { return this.boardType === BoardType.REVIEW; },
    },
    bestAnswer: { type: BestAnswerSchema },
    stats: {
      type: BoardStatsSchema,
      default: () => ({ viewsCount: 0, repliesCount: 0, likesCount: 0, upvotesCount: 0, downvotesCount: 0, sharesCount: 0, bookmarksCount: 0 }),
    },
    subscribers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isPinned: { type: Boolean, default: false, index: true },
    isLocked: { type: Boolean, default: false, index: true },
    lockReason: { type: String, trim: true, maxlength: 255 },
    isEdited: { type: Boolean, default: false },
    lastEditedAt: { type: Date },
    editHistory: { type: [EditHistorySchema], select: false }, // Don't select by default
    moderationLogs: { type: [ModerationLogSchema], select: false }, // Don't select by default
    lastReply: {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        username: { type: String, trim: true },
        at: { type: Date },
        commentId: { type: Schema.Types.ObjectId, ref: "Comment" },
        _id: false,
    },
    gamificationRewards: {
        xpGrantedOnCreate: { type: Number, min: 0 },
        xpGrantedOnReply: { type: Number, min: 0 },
        xpGrantedForBestAnswer: { type: Number, min: 0 },
        badgeGrantedOnCreate: { type: String, trim: true, maxlength: 100 },
        _id: false,
    },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, index: true, sparse: true },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", sparse: true },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    collection: "boards",
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

BoardSchema.index(
  { title: "text", content: "text", tags: "text", authorUsername: "text" },
  { name: "BoardTextSearchIndex", weights: { title: 10, tags: 7, authorUsername: 5, content: 2 }, default_language: "none" }
);

BoardSchema.index({ categoryAssociated: 1, status: 1, isPinned: -1, "lastReply.at": -1, createdAt: -1 }, { name: "BoardListingByCategoryIndex" });
BoardSchema.index({ novelAssociated: 1, status: 1, isPinned: -1, createdAt: -1 }, { name: "BoardListingByNovelIndex" });
BoardSchema.index({ authorId: 1, status: 1, createdAt: -1 }, { name: "BoardAuthorIndex" });
BoardSchema.index({ status: 1, "stats.likesCount": -1, "stats.repliesCount": -1 }, { name: "BoardPopularityIndex" });
BoardSchema.index({ boardType: 1, status: 1, createdAt: -1 }, { name: "BoardByTypeIndex" });
BoardSchema.index({ containsSpoilers: 1, status: 1 }, { sparse: true });


// ==================================================================================================
// SECTION: Virtuals (ฟิลด์เสมือน)
// ==================================================================================================

BoardSchema.virtual("boardUrl").get(function (this: HydratedDocument<IBoard>) {
  return `/community/boards/${this.slug}`;
});

BoardSchema.virtual("isPopular").get(function (this: HydratedDocument<IBoard>) {
    const score = (this.stats.likesCount * 2) + (this.stats.upvotesCount * 2) - this.stats.downvotesCount + (this.stats.repliesCount);
    // เงื่อนไขสำหรับ "Popular" คือ มี score มากกว่า 25 และยอดชมมากกว่า 1000
    return score > 25 && this.stats.viewsCount > 1000;
});

BoardSchema.virtual("snippet").get(function (this: HydratedDocument<IBoard>) {
    // ลบ HTML/Markdown tags ออกและตัดข้อความเหลือ 150 ตัวอักษร
    return this.content.replace(/<[^>]*>?/gm, '').substring(0, 150) + (this.content.length > 150 ? "..." : "");
});


// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

BoardSchema.pre<HydratedDocument<IBoard>>("save", async function (next) {
  // 1. สร้าง/อัปเดต slug จาก title
  if (this.isModified("title") || this.isNew) {
    const generateSlug = (text: string): string => {
        return text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").replace(/[^\w-]+/g, "").replace(/\-\-+/g, "-").replace(/^-+/, "").replace(/-+$/, "");
    };
    let baseSlug = generateSlug(this.title);
    if (!baseSlug) { baseSlug = `board-${new Types.ObjectId().toHexString().slice(-8)}`; }

    let finalSlug = baseSlug.substring(0, 240);
    let count = 0;
    const BoardModelInstance = models.Board as mongoose.Model<IBoard> || model<IBoard>("Board", BoardSchema);

    while (true) {
        const existingBoard = await BoardModelInstance.findOne({ slug: finalSlug, _id: { $ne: this._id } });
        if (!existingBoard) break;
        count++;
        finalSlug = `${baseSlug.substring(0, 240 - String(count).length - 1)}-${count}`;
    }
    this.slug = finalSlug;
  }

  // 2. Denormalize ข้อมูล author
  if (this.isNew || this.isModified("authorId")) {
    const author = await (models.User as mongoose.Model<IUser>).findById(this.authorId).select("username profile.avatarUrl roles").lean();
    if (author) {
      this.authorUsername = author.username || `user-${(author._id as Types.ObjectId).toString().slice(-6)}`;
      this.authorAvatarUrl = author.profile?.avatarUrl;
      this.authorRoles = author.roles;
    }
  }

  // 3. ตรวจสอบและอัปเดต isEdited และ editHistory
  if (!this.isNew && (this.isModified("content") || this.isModified("title"))) {
    this.isEdited = true;
    this.lastEditedAt = new Date();
    const originalDoc = await (models.Board as mongoose.Model<IBoard>).findById(this._id).lean();
    if (originalDoc) {
      // สมมติว่ามี logic ที่ส่ง `editedByUserId` เข้ามาใน context, ถ้าไม่มีให้ใช้ authorId
      const editorId = (this as any)._editorId || this.authorId;
      if (!this.editHistory) {
        this.editHistory = new Types.DocumentArray<IEditHistory>([]);
      }
      this.editHistory.push({
        editedAt: new Date(),
        editedByUserId: editorId,
        previousTitle: originalDoc.title,
        previousContent: originalDoc.content,
      } as IEditHistory);
    }
  }

  // 4. จัดการสถานะ isDeleted
  if (this.isModified("status") && this.status === BoardStatus.DELETED && !this.deletedAt) {
      this.isDeleted = true;
      this.deletedAt = new Date();
      // สมมติว่ามี `deletedBy` ส่งมาจาก context ผ่าน service layer
      this.deletedBy = (this as any)._deletedBy || this.authorId;
  }

  // 5. จัดการสถานะ isLocked และ lockReason
  if (this.isModified("status")) {
      this.isLocked = this.status === BoardStatus.LOCKED;
      if (!this.isLocked) {
        this.lockReason = undefined; // ล้างเหตุผลเมื่อปลดล็อก
      }
  }

  // 6. ล้างข้อมูลที่ไม่เกี่ยวข้องตาม boardType
  if (this.isModified("boardType")) {
      if (this.boardType !== BoardType.POLL) this.poll = undefined;
      if (this.boardType !== BoardType.REVIEW) this.reviewDetails = undefined;
      if (this.boardType !== BoardType.QUESTION) this.bestAnswer = undefined;
  }

  // 7. Auto-subscribe เจ้าของกระทู้เมื่อสร้าง
  if (this.isNew) {
    this.subscribers.push(this.authorId as Types.ObjectId);
  }

  next();
});

// Post-save hook
BoardSchema.post<HydratedDocument<IBoard>>("save", async function(doc, next) {
    try {
        if (doc.isNew) {
            // ก. อัปเดต socialStats ของผู้เขียน (เพิ่มจำนวนกระทู้ที่สร้าง)
            await (models.User as mongoose.Model<IUser>).findByIdAndUpdate(doc.authorId, {
                $inc: { "socialStats.novelsCreatedCount": 1 } // หรือ commentsMadeCount, ควรมี field แยก
            });

            // ข. ส่ง Activity Log (เพื่อใช้ในระบบ Feed และ Gamification)
            const ActivityHistoryModel = models.ActivityHistory as mongoose.Model<IActivityHistory>;
            if (ActivityHistoryModel) {
                ActivityHistoryModel.create({
                    userId: doc.authorId,
                    activityType: "COMMENT_POSTED", // สมมติว่าใช้ Type นี้ หรือเพิ่ม 'BOARD_POST_CREATED'
                    activityCategory: "SOCIAL",
                    description: `สร้างกระทู้ใหม่: ${doc.title}`,
                    relatedEntityType: "Board",
                    relatedEntityId: doc._id,
                    details: {
                        boardTitle: doc.title,
                        boardType: doc.boardType,
                        novelId: doc.novelAssociated?.toString(),
                        categoryId: doc.categoryAssociated.toString(),
                    }
                }).catch(err => console.error("Failed to create activity log for new board:", err));
            }

            // ค. ให้ XP และ Badge (ถ้ามี) แก่ผู้สร้างกระทู้
            // ใน Production จริง, ส่วนนี้ควรจะ emit event ไปให้ Gamification Service จัดการ
            const xpToGrant = doc.gamificationRewards?.xpGrantedOnCreate;
            const badgeToGrant = doc.gamificationRewards?.badgeGrantedOnCreate;
            if (xpToGrant && xpToGrant > 0) {
                console.log(`[Gamification Trigger] Grant ${xpToGrant} XP to user ${doc.authorId} for creating board ${doc._id}`);
                // await GamificationService.grantExperience(doc.authorId, xpToGrant, 'CREATE_BOARD_POST', doc._id);
            }
            if (badgeToGrant) {
                console.log(`[Gamification Trigger] Grant badge '${badgeToGrant}' to user ${doc.authorId} for creating board ${doc._id}`);
                // await GamificationService.grantBadge(doc.authorId, badgeToGrant, 'CREATE_SPECIFIC_BOARD_TYPE', doc._id);
            }
        }
    } catch (error) {
        console.error("Error in Board post-save hook:", error);
    }
    next();
});

// Post-delete hook
BoardSchema.post<mongoose.Query<IBoard, IBoard>>("findOneAndDelete", async function(doc) {
  if (doc) {
      try {
          const boardDoc = doc as HydratedDocument<IBoard>;
          // 1. ลดจำนวนกระทู้ที่สร้างของ user
          await (models.User as mongoose.Model<IUser>).findByIdAndUpdate(boardDoc.authorId, {
              $inc: { "socialStats.novelsCreatedCount": -1 }
          });

          // 2. ลบ comments ที่เกี่ยวข้อง (เปลี่ยนเป็น archived เพื่อรักษาข้อมูล)
          await (models.Comment as mongoose.Model<IComment>).updateMany(
              { targetId: boardDoc._id, targetType: "Comment" }, // สมมติ Comment มี targetType
              { $set: { status: "archived", statusReason: "Parent board deleted" } }
          );

          // 3. ลบ likes ที่เกี่ยวข้อง
          await (models.Like as mongoose.Model<ILike>).deleteMany({ targetId: boardDoc._id, targetType: "NOVEL" }); // สมมติ Like มี targetType

          // 4. อัปเดต ContentReports ที่เกี่ยวข้องให้เป็น closed
          await (models.ContentReport as mongoose.Model<IContentReport>).updateMany(
            { contentId: boardDoc._id, contentType: "NOVEL" }, // สมมติ Report มี contentType
            { $set: { status: "closed_automated", actionTakenNotes: "Content was deleted by owner or moderator." } }
          );

      } catch (error) {
          const boardDoc = doc as HydratedDocument<IBoard>;
          console.error(`Error during cleanup for deleted board ${boardDoc._id}:`, error);
      }
  }
});


// ==================================================================================================
// SECTION: Instance Methods (เมธอดสำหรับ Board Document)
// ==================================================================================================

BoardSchema.methods.updateLastReply = async function (commentId: Types.ObjectId, userId: Types.ObjectId, username: string): Promise<void> {
    this.lastReply = { commentId, userId, username, at: new Date() };
    this.stats.repliesCount = (this.stats.repliesCount || 0) + 1;
    await this.save({ validateModifiedOnly: true });
};

BoardSchema.methods.incrementViewCount = async function(userId?: Types.ObjectId): Promise<void> {
    // การนับ view แบบ Unique ต่อ User ควรทำใน Service Layer โดยใช้ Redis หรือระบบ Cache อื่นๆ
    // เพื่อป้องกันการเขียนลง DB บ่อยเกินไป ในที่นี้จะแค่เพิ่มยอดวิวรวม
    this.stats.viewsCount = (this.stats.viewsCount || 0) + 1;
    // ใช้ `updateOne` เพื่อลดภาระของ pre/post save hooks ที่ไม่จำเป็น
    await (this.constructor as mongoose.Model<IBoard>).updateOne({ _id: this._id }, { $inc: { "stats.viewsCount": 1 } });
};

BoardSchema.methods.toggleSubscription = async function(userId: Types.ObjectId): Promise<boolean> {
    const isSubscribed = this.subscribers.some((subId: Types.ObjectId) => subId.equals(userId));
    if (isSubscribed) {
        this.subscribers.pull(userId);
    } else {
        this.subscribers.push(userId);
    }
    await this.save();
    return !isSubscribed;
};

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

const BoardModel = (models.Board as mongoose.Model<IBoard>) || model<IBoard>("Board", BoardSchema);

export default BoardModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **การจัดการ Likes/Upvotes/Bookmarks**: ระบบได้ย้ายการจัดการ Likes, Bookmarks ไปยัง Collection ของตัวเอง (เช่น `LikeModel`, `BookmarkModel`)
//     ซึ่งเป็นวิธีที่เหมาะสมกับสเกลใหญ่ Middleware ของ `LikeModel` จะไป `$inc` ค่า `stats.likesCount` ใน `BoardModel`
//     การเพิ่ม Upvote/Downvote ก็จะใช้หลักการเดียวกัน
// 2.  **การตอบกลับ (Replies)**: ใช้ `CommentModel` ที่มีอยู่ โดยกำหนด `targetType: 'Board'` และ `targetId: board._id`.
//     เมื่อมีการสร้าง Comment, Comment Service ควรเรียก `board.updateLastReply()` และส่ง Notification ไปยังผู้ที่เกี่ยวข้อง (เจ้าของกระทู้, ผู้ติดตาม)
// 3.  **Real-time Features**: สำหรับการแจ้งเตือนสด, จำนวนผู้ที่กำลังอ่าน ควรใช้ WebSocket (เช่น Socket.IO) ร่วมกับ Redis Pub/Sub
//     เพื่อลดภาระของ MongoDB และเพิ่มความเร็วในการตอบสนอง
// 4.  **Content Security**: เนื้อหา `content` ที่เป็น Rich Text/HTML ต้องผ่านการ Sanitize อย่างเข้มงวด (เช่น ใช้ DOMPurify) ก่อนบันทึกหรือแสดงผลเพื่อป้องกัน XSS
// 5.  **Search Enhancement**: สำหรับแพลตฟอร์มระดับโลก การใช้ Text Index ของ MongoDB อาจไม่เพียงพอ ควรพิจารณาใช้บริการค้นหาเฉพาะทางเช่น Elasticsearch หรือ Algolia
//     เพื่อการค้นหาที่รวดเร็ว, รองรับหลายภาษาได้ดีกว่า, และมี Relevancy Score ที่ซับซ้อนกว่า
// 6.  **Moderation Workflow**: `moderationLogs` เป็นจุดเริ่มต้นที่ดี ควรมี Dashboard แยกสำหรับ Moderator เพื่อดูกระทู้ที่ถูกรายงาน, จัดการสถานะ,
//     และดูประวัติการดำเนินการทั้งหมดได้อย่างสะดวก
// 7.  **Denormalization Management**: การเก็บ `authorUsername`, `authorAvatarUrl`, `authorRoles` ช่วยเพิ่มประสิทธิภาพในการ query
//     แต่ต้องมีกลไกอัปเดตข้อมูลเหล่านี้เมื่อ User เปลี่ยนแปลงข้อมูลโปรไฟล์ (อาจใช้ background job หรือ trigger ผ่าน message queue)
// 8.  **Gamification Integration**: การให้รางวัล XP/Badge ควรทำผ่าน Service กลาง (GamificationService) ที่รับ event มาจากส่วนต่างๆ ของแอป
//     เช่น `ActivityHistory` เพื่อให้ Logic การให้รางวัลรวมอยู่ที่เดียวและจัดการง่าย
// 9.  **Q&A and Review Workflow**:
//     - **Q&A**: UI ควรมีปุ่มให้เจ้าของกระทู้หรือ Moderator "เลือกเป็นคำตอบที่ดีที่สุด" บน comment เมื่อคลิก จะเรียก API ไปอัปเดต field `bestAnswer`,
//       ให้รางวัล XP/Badge แก่เจ้าของ comment, และส่ง Notification.
//     - **Review**: เมื่อผู้ใช้สร้างกระทู้รีวิว ควรมี UI ให้กรอก `ratingValue` และ `ratingBreakdown` อย่างชัดเจน เมื่อบันทึกแล้ว
//       ข้อมูลคะแนนนี้ควรถูก aggregate ไปยัง `NovelModel.stats.averageRating` และ `ratingsCount`.
// 10. **Unique Viewers**: การนับ Unique Viewers ใน `stats` นั้นทำได้ยากในระดับ document. ควรใช้ระบบ Analytics แยกต่างหาก
//     เช่น Google Analytics หรือระบบที่สร้างขึ้นเองโดยใช้ Redis HyperLogLog เพื่อนับจำนวน UserID ที่ไม่ซ้ำกันที่เข้าถึงกระทู้นี้ในแต่ละช่วงเวลา
// 11. **Poll Voting Logic**: การโหวตใน poll ควรมี API endpoint แยกต่างหากที่รับ `boardId` และ `optionId`
//     API นี้จะตรวจสอบว่าผู้ใช้โหวตไปแล้วหรือยัง (ถ้าไม่อนุญาตให้โหวตซ้ำ) แล้วจึง `$push` `userId` เข้าไปใน `voterIds` และ `$inc` `votesCount` และ `totalVotes`.
// 12. **Content Versioning**: `editHistory` เป็นพื้นฐานที่ดี หากต้องการระบบที่ซับซ้อนกว่านี้ (เช่น diff viewer) อาจต้องพิจารณาเก็บ snapshot ของ content ทั้งหมดในแต่ละเวอร์ชัน
//     ซึ่งจะใช้พื้นที่จัดเก็บมากขึ้น แต่ให้ความสามารถในการย้อนกลับและเปรียบเทียบที่สมบูรณ์แบบ
// ==================================================================================================