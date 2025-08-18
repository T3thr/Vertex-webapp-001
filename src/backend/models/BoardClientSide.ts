// src/backend/models/BoardClientSide.ts
// เวอร์ชัน client-side ของ Board model ที่มีเฉพาะ enum และ interface ที่จำเป็น
// ไม่มีการ import mongoose หรือสร้าง schema

/**
 * @enum {string} BoardStatus
 * @description สถานะของกระทู้ (ละเอียดขึ้นสำหรับทีม Moderator)
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
  mediaId: string; // อ้างอิงถึง Media Model
  fileName: string; // (Denormalized) ชื่อไฟล์
  fileUrl: string; // (Denormalized) URL ของไฟล์
  fileType: "image" | "video" | "audio" | "other"; // (Denormalized) ประเภทไฟล์
  displayOrder: number; // ลำดับการแสดงผล
  caption?: string; // คำบรรยายภาพ/สื่อ
}

/**
 * @interface IBoardPoll
 * @description ข้อมูลโพลในกระทู้ (ถ้า boardType เป็น poll)
 */
export interface IBoardPoll {
  question: string;
  options: Array<{
    optionId: string;
    text: string;
    voterIds: string[];
    votesCount: number; // Denormalized count
  }>;
  totalVotes: number;
  allowMultipleChoice: boolean;
  expiresAt?: Date;
  isAnonymous: boolean;
}

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

/**
 * @interface IBoardData
 * @description ข้อมูลกระทู้สำหรับใช้ใน client-side
 */
export interface IBoardData {
  _id: string;
  title: string;
  slug: string;
  content: string;
  contentFormat: "markdown" | "html";
  authorId: string;
  authorUsername: string;
  authorAvatarUrl?: string;
  authorRoles: string[];
  boardType: BoardType;
  status: BoardStatus;
  novelAssociated?: string;
  categoryAssociated: string;
  tags: string[];
  containsSpoilers: boolean;
  attachments?: IBoardAttachment[];
  poll?: IBoardPoll;
  reviewDetails?: IReviewDetails;
  stats: IBoardStats;
  isPinned: boolean;
  isLocked: boolean;
  lockReason?: string;
  isEdited: boolean;
  lastEditedAt?: Date;
  lastReply?: {
    userId: string;
    username: string;
    at: Date;
    commentId: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// ส่งออก default เป็น BoardType เพื่อความสะดวกในการ import
export default BoardType;
