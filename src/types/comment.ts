// src/types/comment.ts
// ไฟล์นี้เก็บ types สำหรับใช้ใน client components

/**
 * @enum {string} CommentableType
 * @description ประเภทของเนื้อหาที่สามารถแสดงความคิดเห็นได้ (client-side version)
 */
export enum CommentableType {
  NOVEL = "Novel",
  EPISODE = "Episode",
  BOARD = "Board",
  COMMENT = "Comment",
  CHARACTER = "Character",
  USER_POST = "UserPost",
  ANNOUNCEMENT = "Announcement",
  REVIEW = "Review",
}

/**
 * @interface CommentUser
 * @description ข้อมูลผู้ใช้สำหรับแสดงในความคิดเห็น
 */
export interface CommentUser {
  _id: string;
  username: string;
  avatarUrl?: string;
  primaryPenName?: string;
  roles: string[];
}

/**
 * @interface Comment
 * @description ข้อมูลความคิดเห็นสำหรับแสดงผล
 */
export interface Comment {
  _id: string;
  userId: CommentUser;
  targetId: string;
  targetType: string;
  parentCommentId?: string;
  depth: number;
  content: string;
  status: string;
  likesCount: number;
  dislikesCount: number;
  repliesCount: number;
  isPinned: boolean;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}
