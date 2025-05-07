// src/backend/models/NovelFollow.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface for user-specific notification settings for a followed novel
export interface INovelFollowNotificationSettings {
  onNewEpisodeRelease: boolean; // แจ้งเตือนเมื่อมีตอนใหม่
  onNovelUpdates: boolean; // แจ้งเตือนเมื่อนิยายมีการอัปเดตสำคัญ (เช่น ผู้เขียนประกาศข่าว)
  onNewCommentsOnNovel: boolean; // แจ้งเตือนเมื่อมีคอมเมนต์ใหม่ในหน้านิยาย (ไม่ใช่ในตอน)
  onRepliesToMyComments: boolean; // แจ้งเตือนเมื่อมีคนตอบกลับคอมเมนต์ของผู้ใช้ในนิยายนี้
  // Potentially more granular settings in the future
}

// Interface for tracking reading progress for a followed novel
export interface IReadingProgress {
  lastReadEpisodeId?: Types.ObjectId; // ID ของตอนล่าสุดที่อ่าน (อ้างอิง Episode model)
  lastReadSceneId?: Types.ObjectId; // ID ของฉากล่าสุดที่อ่าน (อ้างอิง Scene model, ถ้าติดตามละเอียด)
  progressPercentage?: number; // ความคืบหน้าโดยรวมของนิยาย (0-100, อาจคำนวณจากตอนที่อ่านจบ)
  lastReadAt: Date; // วันที่อ่านล่าสุด
  // อาจเพิ่มรายละเอียดต่อตอน เช่น { episodeId: Types.ObjectId, sceneProgress: number, finished: boolean }
}

// Interface for managing the novel in the user's personal bookshelf/library
export interface IUserBookshelfEntry {
  status: "want_to_read" | "reading" | "completed" | "on_hold" | "dropped" | "not_on_shelf"; // สถานะในชั้นหนังสือ
  addedToShelfAt?: Date; // วันที่เพิ่มเข้าชั้นหนังสือ
  finishedReadingAt?: Date; // วันที่อ่านจบ (ถ้า status is "completed")
  userRating?: number; // คะแนนที่ผู้ใช้ให้ (1-5 or 1-10, สอดคล้องกับ Rating model)
  userReviewId?: Types.ObjectId; // อ้างอิง Review model (ถ้าผู้ใช้เขียนรีวิว)
  customShelves?: string[]; // ชื่อชั้นหนังสือที่ผู้ใช้สร้างเอง (เช่น "Favorites", "To Re-read")
}

// Interface for NovelFollow document
// This model represents a user following a novel and their associated interactions/settings for that novel.
export interface INovelFollow extends Document {
  user: Types.ObjectId; // ผู้ใช้ที่ติดตาม (อ้างอิง User model)
  novel: Types.ObjectId; // นิยายที่ถูกติดตาม (อ้างอิง Novel model)
  // การตั้งค่าการแจ้งเตือน
  notifications: INovelFollowNotificationSettings;
  // สถานะการอ่านและความคืบหน้า
  readingProgress?: IReadingProgress;
  // การจัดการในชั้นหนังสือส่วนตัวของผู้ใช้
  bookshelf: IUserBookshelfEntry;
  // สถานะการติดตาม
  isActivelyFollowing: boolean; // ผู้ใช้กำลังติดตามนิยายนี้อยู่หรือไม่ (อาจ unfollow แต่ยังเก็บข้อมูล progress)
  followedAt: Date; // วันที่เริ่มติดตาม
  unfollowedAt?: Date; // วันที่เลิกติดตาม (ถ้ามี)
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const NovelFollowNotificationSettingsSchema = new Schema<INovelFollowNotificationSettings>({
  onNewEpisodeRelease: { type: Boolean, default: true },
  onNovelUpdates: { type: Boolean, default: true },
  onNewCommentsOnNovel: { type: Boolean, default: false },
  onRepliesToMyComments: { type: Boolean, default: true },
}, { _id: false });

const ReadingProgressSchema = new Schema<IReadingProgress>({
  lastReadEpisodeId: { type: Schema.Types.ObjectId, ref: "Episode" },
  lastReadSceneId: { type: Schema.Types.ObjectId, ref: "Scene" },
  progressPercentage: { type: Number, min: 0, max: 100 },
  lastReadAt: { type: Date, required: true, default: Date.now },
}, { _id: false });

const UserBookshelfEntrySchema = new Schema<IUserBookshelfEntry>({
  status: {
    type: String,
    enum: ["want_to_read", "reading", "completed", "on_hold", "dropped", "not_on_shelf"],
    default: "not_on_shelf",
    required: true,
  },
  addedToShelfAt: Date,
  finishedReadingAt: Date,
  userRating: { type: Number, min: 1, max: 5 }, // Assuming a 5-star rating system
  userReviewId: { type: Schema.Types.ObjectId, ref: "Review" }, // Assuming a Review model
  customShelves: [{ type: String, trim: true }],
}, { _id: false });

const NovelFollowSchema = new Schema<INovelFollow>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    novel: { type: Schema.Types.ObjectId, ref: "Novel", required: true, index: true },
    notifications: { type: NovelFollowNotificationSettingsSchema, default: () => ({}) },
    readingProgress: ReadingProgressSchema,
    bookshelf: { type: UserBookshelfEntrySchema, default: () => ({ status: "not_on_shelf" }) }, // Default to not on shelf
    isActivelyFollowing: { type: Boolean, default: true, index: true },
    followedAt: { type: Date, default: Date.now, required: true },
    unfollowedAt: { type: Date },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ----- Indexes -----
// Unique combination of user and novel to prevent duplicate follow entries
NovelFollowSchema.index({ user: 1, novel: 1 }, { unique: true });
// For fetching novels a user follows, or users following a novel
NovelFollowSchema.index({ user: 1, isActivelyFollowing: 1, "bookshelf.status": 1 });
NovelFollowSchema.index({ novel: 1, isActivelyFollowing: 1 });

// ----- Middleware: Update denormalized counts on Novel and User models -----
async function updateNovelFollowerCount(novelId: Types.ObjectId, increment: boolean) {
  const Novel = model("Novel"); // Assuming Novel model is registered
  const change = increment ? 1 : -1;
  try {
    await Novel.findByIdAndUpdate(novelId, { $inc: { "statistics.followersCount": change } });
  } catch (error) {
    console.error(`Error updating follower count for novel ${novelId}:`, error);
    // Consider a retry mechanism or logging to a dead-letter queue for critical counter updates
  }
}

async function updateUserFollowingCount(userId: Types.ObjectId, increment: boolean) {
  const User = model("User"); // Assuming User model is registered
  const change = increment ? 1 : -1;
  try {
    await User.findByIdAndUpdate(userId, { $inc: { "statistics.followingNovelsCount": change } });
  } catch (error) {
    console.error(`Error updating following count for user ${userId}:`, error);
    // Similar error handling considerations
  }
}

NovelFollowSchema.post("save", async function (doc: INovelFollow) {
  // If a new follow is created and is active
  if (doc.isNew && doc.isActivelyFollowing) {
    await updateNovelFollowerCount(doc.novel, true);
    await updateUserFollowingCount(doc.user, true);
  }
  // If an existing follow record is updated to active (e.g., re-following)
  if (!doc.isNew && doc.isModified("isActivelyFollowing") && doc.isActivelyFollowing) {
    const previousState = await model<INovelFollow>("NovelFollow").findOne({ _id: doc._id }).lean();
    if (previousState && !previousState.isActivelyFollowing) { // Was not active before
      await updateNovelFollowerCount(doc.novel, true);
      await updateUserFollowingCount(doc.user, true);
    }
  }
  // If an existing follow record is updated to inactive (unfollowed)
  if (!doc.isNew && doc.isModified("isActivelyFollowing") && !doc.isActivelyFollowing) {
    await updateNovelFollowerCount(doc.novel, false);
    await updateUserFollowingCount(doc.user, false);
    if (!doc.unfollowedAt) {
      doc.unfollowedAt = new Date(); // Set unfollowedAt if not already set
      // Note: This modification within post-save might need `doc.save()` if not handled by the update operation itself.
      // However, direct save in post hook can cause infinite loops. Better to set in pre-hook or ensure update op covers it.
    }
  }
});

// Middleware for direct delete operations (e.g., admin deleting a follow record)
// Using `pre` for `deleteOne` and `deleteMany` to capture the document(s) before deletion.
NovelFollowSchema.pre(["deleteOne", "findOneAndDelete"], { document: true, query: false }, async function(next) {
  if (this.isActivelyFollowing) {
    await updateNovelFollowerCount(this.novel, false);
    await updateUserFollowingCount(this.user, false);
  }
  next();
});

NovelFollowSchema.pre("deleteMany", async function(next) {
    const docsToDelete = await this.model.find(this.getFilter()).lean();
    for (const doc of docsToDelete) {
        if (doc.isActivelyFollowing) {
            await updateNovelFollowerCount(doc.novel, false);
            await updateUserFollowingCount(doc.user, false);
        }
    }
    next();
});


// ----- Model Export -----
const NovelFollowModel = () =>
  models.NovelFollow as mongoose.Model<INovelFollow> || model<INovelFollow>("NovelFollow", NovelFollowSchema);

export default NovelFollowModel;

