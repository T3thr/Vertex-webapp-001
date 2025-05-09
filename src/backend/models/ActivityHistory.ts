// src/backend/models/ActivityHistory.ts
// ActivityHistory Model - บันทึกกิจกรรมทั้งหมดของผู้ใช้บนแพลตฟอร์ม
// โมเดลประวัติกิจกรรม - บันทึกกิจกรรมทั้งหมดของผู้ใช้บนแพลตฟอร์ม

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// ประเภทของกิจกรรมที่สามารถบันทึกได้
export type ActivityType =
  // User Account Activities
  | "USER_REGISTERED"
  | "USER_LOGGED_IN"
  | "USER_LOGGED_OUT"
  | "USER_PROFILE_UPDATED"
  | "USER_PASSWORD_CHANGED"
  | "USER_EMAIL_VERIFIED"
  | "USER_ROLE_CHANGED"
  | "WRITER_APPLICATION_SUBMITTED"
  | "WRITER_APPLICATION_APPROVED"
  | "WRITER_APPLICATION_REJECTED"
  | "DONATION_APPLICATION_SUBMITTED"
  | "DONATION_APPLICATION_APPROVED"
  | "DONATION_APPLICATION_REJECTED"
  | "DONATION_SETTINGS_UPDATED"
  // Content Interaction Activities
  | "NOVEL_READ"
  | "EPISODE_READ"
  | "NOVEL_FOLLOWED"
  | "NOVEL_UNFOLLOWED"
  | "USER_FOLLOWED"
  | "USER_UNFOLLOWED"
  | "COMMENT_CREATED"
  | "COMMENT_UPDATED"
  | "COMMENT_DELETED"
  | "COMMENT_LIKED"
  | "COMMENT_UNLIKED"
  | "RATING_GIVEN"
  | "RATING_UPDATED"
  | "RATING_DELETED"
  | "NOVEL_LIKED"
  | "NOVEL_UNLIKED"
  | "EPISODE_LIKED"
  | "EPISODE_UNLIKED"
  // Content Creation Activities (for Writers)
  | "NOVEL_CREATED"
  | "NOVEL_UPDATED"
  | "NOVEL_PUBLISHED"
  | "NOVEL_UNPUBLISHED"
  | "NOVEL_DELETED"
  | "EPISODE_CREATED"
  | "EPISODE_UPDATED"
  | "EPISODE_PUBLISHED"
  | "EPISODE_UNPUBLISHED"
  | "EPISODE_DELETED"
  | "CHARACTER_CREATED"
  | "CHARACTER_UPDATED"
  | "SCENE_CREATED"
  | "SCENE_UPDATED"
  | "STORY_MAP_CREATED"
  | "STORY_MAP_UPDATED"
  // Monetary Activities
  | "COIN_PURCHASED"
  | "COIN_SPENT_EPISODE"
  | "COIN_SPENT_DONATION_WRITER"
  | "COIN_SPENT_DONATION_NOVEL"
  | "COIN_SPENT_DONATION_CHARACTER"
  | "COIN_EARNED_WRITER_SALE"
  | "COIN_EARNED_WRITER_DONATION"
  | "COIN_REFUNDED"
  // Gamification Activities
  | "ACHIEVEMENT_UNLOCKED"
  | "BADGE_EARNED"
  | "LEVEL_UP"
  // Other Activities
  | "SEARCH_PERFORMED"
  | "NOTIFICATION_SETTINGS_UPDATED"
  | "PRIVACY_SETTINGS_UPDATED";

// อินเทอร์เฟซสำหรับรายละเอiadยอดกิจกรรม
interface ActivityDetails {
  // General details
  ipAddress?: string;
  userAgent?: string;
  // Content related
  novelId?: Types.ObjectId;
  episodeId?: Types.ObjectId;
  characterId?: Types.ObjectId;
  commentId?: Types.ObjectId;
  ratingId?: Types.ObjectId;
  targetUserId?: Types.ObjectId;
  // Monetary related
  amountCoin?: number;
  amountRealMoney?: number;
  currencyRealMoney?: string;
  paymentId?: Types.ObjectId;
  purchaseId?: Types.ObjectId;
  donationId?: Types.ObjectId;
  // Gamification related
  achievementId?: Types.ObjectId;
  badgeId?: Types.ObjectId;
  levelReached?: number;
  // Search related
  searchQuery?: string;
  // Other specific details
  previousValue?: any;
  newValue?: any;
}

// อินเทอร์เฟซสำหรับเอกสารประวัติกิจกรรม
export interface IActivityHistory extends Document {
  user: Types.ObjectId;
  activityType: ActivityType;
  content?: string;
  message?: string;
  details: ActivityDetails;
  createdAt: Date;
}

// Schema ย่อยสำหรับรายละเอียดกิจกรรม
const DetailsSchema = new Schema<ActivityDetails>(
  {
    ipAddress: String,
    userAgent: String,
    novelId: { type: Schema.Types.ObjectId, ref: "Novel" },
    episodeId: { type: Schema.Types.ObjectId, ref: "Episode" },
    characterId: { type: Schema.Types.ObjectId, ref: "Character" },
    commentId: { type: Schema.Types.ObjectId, ref: "Comment" },
    ratingId: { type: Schema.Types.ObjectId, ref: "Rating" },
    targetUserId: { type: Schema.Types.ObjectId, ref: "User" },
    amountCoin: Number,
    amountRealMoney: Number,
    currencyRealMoney: String,
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    purchaseId: { type: Schema.Types.ObjectId, ref: "Purchase" },
    donationId: { type: Schema.Types.ObjectId, ref: "Donation" },
    achievementId: { type: Schema.Types.ObjectId, ref: "Achievement" },
    badgeId: { type: Schema.Types.ObjectId, ref: "Badge" },
    levelReached: Number,
    searchQuery: String,
    previousValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed,
  },
  { _id: false }
);

const ActivityHistorySchema = new Schema<IActivityHistory>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "ต้องระบุผู้ใช้สำหรับกิจกรรม"],
      index: true,
    },
    activityType: {
      type: String,
      required: [true, "ต้องระบุประเภทของกิจกรรม"],
      enum: [
        "USER_REGISTERED",
        "USER_LOGGED_IN",
        "USER_LOGGED_OUT",
        "USER_PROFILE_UPDATED",
        "USER_PASSWORD_CHANGED",
        "USER_EMAIL_VERIFIED",
        "USER_ROLE_CHANGED",
        "WRITER_APPLICATION_SUBMITTED",
        "WRITER_APPLICATION_APPROVED",
        "WRITER_APPLICATION_REJECTED",
        "DONATION_APPLICATION_SUBMITTED",
        "DONATION_APPLICATION_APPROVED",
        "DONATION_APPLICATION_REJECTED",
        "DONATION_SETTINGS_UPDATED",
        "NOVEL_READ",
        "EPISODE_READ",
        "NOVEL_FOLLOWED",
        "NOVEL_UNFOLLOWED",
        "USER_FOLLOWED",
        "USER_UNFOLLOWED",
        "COMMENT_CREATED",
        "COMMENT_UPDATED",
        "COMMENT_DELETED",
        "COMMENT_LIKED",
        "COMMENT_UNLIKED",
        "RATING_GIVEN",
        "RATING_UPDATED",
        "RATING_DELETED",
        "NOVEL_LIKED",
        "NOVEL_UNLIKED",
        "EPISODE_LIKED",
        "EPISODE_UNLIKED",
        "NOVEL_CREATED",
        "NOVEL_UPDATED",
        "NOVEL_PUBLISHED",
        "NOVEL_UNPUBLISHED",
        "NOVEL_DELETED",
        "EPISODE_CREATED",
        "EPISODE_UPDATED",
        "EPISODE_PUBLISHED",
        "EPISODE_UNPUBLISHED",
        "EPISODE_DELETED",
        "CHARACTER_CREATED",
        "CHARACTER_UPDATED",
        "SCENE_CREATED",
        "SCENE_UPDATED",
        "STORY_MAP_CREATED",
        "STORY_MAP_UPDATED",
        "COIN_PURCHASED",
        "COIN_SPENT_EPISODE",
        "COIN_SPENT_DONATION_WRITER",
        "COIN_SPENT_DONATION_NOVEL",
        "COIN_SPENT_DONATION_CHARACTER",
        "COIN_EARNED_WRITER_SALE",
        "COIN_EARNED_WRITER_DONATION",
        "COIN_REFUNDED",
        "ACHIEVEMENT_UNLOCKED",
        "BADGE_EARNED",
        "LEVEL_UP",
        "SEARCH_PERFORMED",
        "NOTIFICATION_SETTINGS_UPDATED",
        "PRIVACY_SETTINGS_UPDATED",
      ],
      index: true,
    },
    content: {
      type: String,
      trim: true,
      maxlength: [500, "ข้อความสรุปกิจกรรมต้องไม่เกิน 500 ตัวอักษร"],
    },
    message: {
      type: String,
      trim: true,
      maxlength: [500, "ข้อความบันทึกต้องไม่เกิน 500 ตัวอักษร"],
    },
    details: {
      type: DetailsSchema,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// การตรวจสอบความถูกต้องของ details ตาม activityType
ActivityHistorySchema.pre("save", function (next) {
  const details = this.details;
  const type = this.activityType;

  // กำหนดฟิลด์ที่ต้องมีสำหรับแต่ละ activityType
  const requiredFields: Record<string, string[]> = {
    EPISODE_READ: ["novelId", "episodeId"],
    COMMENT_CREATED: ["commentId", "novelId", "episodeId"],
    RATING_GIVEN: ["ratingId", "novelId"],
    USER_FOLLOWED: ["targetUserId"],
    NOVEL_LIKED: ["novelId"],
    COIN_SPENT_EPISODE: ["purchaseId", "novelId", "episodeId", "amountCoin"],
    COIN_SPENT_DONATION_WRITER: ["donationId", "targetUserId", "amountCoin"],
    COIN_EARNED_WRITER_DONATION: ["donationId", "amountCoin"],
  };

  const required = requiredFields[type];
  if (required) {
    for (const field of required) {
      if (!details[field]) {
        return next(new Error(`ฟิลด์ ${field} จำเป็นสำหรับ ${type}`));
      }
    }
  }

  // สร้าง content ถ้ายังไม่มี
  if (!this.content) {
    this.content = generateActivityContent(this.activityType, details);
  }

  next();
});

// ฟังก์ชันช่วยสร้างข้อความสรุปกิจกรรม
function generateActivityContent(type: ActivityType, details: ActivityDetails): string {
  switch (type) {
    case "EPISODE_READ":
      return `อ่านตอนของนิยาย`;
    case "COMMENT_CREATED":
      return `แสดงความคิดเห็นในนิยาย`;
    case "RATING_GIVEN":
      return `ให้คะแนนนิยาย`;
    case "USER_FOLLOWED":
      return `ติดตามผู้ใช้`;
    case "NOVEL_LIKED":
      return `ถูกใจนิยาย`;
    case "COIN_SPENT_EPISODE":
      return `ซื้อตอนด้วย ${details.amountCoin} เหรียญ`;
    case "COIN_SPENT_DONATION_WRITER":
    case "COIN_EARNED_WRITER_DONATION":
      return `บริจาค ${details.amountCoin} เหรียญให้ผู้เขียน`;
    default:
      return type.replace(/_/g, " ").toLowerCase();
  }
}

// ดัชนีสำหรับการ query
ActivityHistorySchema.index({ user: 1, createdAt: -1 });
ActivityHistorySchema.index({ activityType: 1, createdAt: -1 });
ActivityHistorySchema.index({ "details.novelId": 1, createdAt: -1 }, { sparse: true });
ActivityHistorySchema.index({ "details.episodeId": 1, createdAt: -1 }, { sparse: true });
ActivityHistorySchema.index(
  { user: 1, activityType: 1, "details.novelId": 1, createdAt: -1 },
  { sparse: true }
);
ActivityHistorySchema.index(
  { user: 1, activityType: 1, "details.episodeId": 1, createdAt: -1 },
  { sparse: true }
);
ActivityHistorySchema.index(
  { "details.targetUserId": 1, createdAt: -1 },
  { sparse: true }
);

// สร้างโมเดล
const ActivityHistoryModel = () =>
  models.ActivityHistory as mongoose.Model<IActivityHistory> ||
  model<IActivityHistory>("ActivityHistory", ActivityHistorySchema);

export default ActivityHistoryModel;