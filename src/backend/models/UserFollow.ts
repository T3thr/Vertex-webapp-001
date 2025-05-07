// src/backend/models/UserFollow.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface for UserFollow document
// Represents a user (follower) following another user (following).
export interface IUserFollow extends Document {
  $isNew: boolean;
  followerId: Types.ObjectId; // ผู้ใช้ที่ทำการติดตาม (อ้างอิง User model)
  followingId: Types.ObjectId; // ผู้ใช้ที่ถูกติดตาม (อ้างอิง User model)
  // Notification settings for this specific follow relationship (optional)
  notifications?: {
    onNewNovelByFollowing?: boolean; // แจ้งเตือนเมื่อผู้ที่ถูกติดตามสร้างนิยายใหม่
    onFollowingActivity?: boolean; // แจ้งเตือนเกี่ยวกับกิจกรรมอื่นๆ ของผู้ที่ถูกติดตาม (เช่น คอมเมนต์, ไลค์)
  };
  status: "active" | "pending_approval" | "blocked"; // สถานะการติดตาม (ถ้ามีระบบ approval หรือ block)
  followedAt: Date; // วันที่เริ่มติดตาม
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const UserFollowSchema = new Schema<IUserFollow>(
  {
    followerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุ ID ของผู้ติดตาม (followerId)"],
      index: true,
    },
    followingId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุ ID ของผู้ที่ถูกติดตาม (followingId)"],
      index: true,
    },
    notifications: {
      onNewNovelByFollowing: { type: Boolean, default: true },
      onFollowingActivity: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: ["active", "pending_approval", "blocked"],
      default: "active",
      index: true,
    },
    followedAt: { type: Date, default: Date.now, required: true },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ----- Indexes -----
// Unique combination of follower and following to prevent duplicate entries
UserFollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
// For fetching users a specific user is following
UserFollowSchema.index({ followerId: 1, status: 1, followedAt: -1 });
// For fetching followers of a specific user
UserFollowSchema.index({ followingId: 1, status: 1, followedAt: -1 });

// ----- Middleware: Update denormalized counts on User models -----
async function updateUserFollowCounts(followerId: Types.ObjectId, followingId: Types.ObjectId, increment: boolean) {
  const User = model("User"); // Assuming User model is registered
  const change = increment ? 1 : -1;
  try {
    // Increment/decrement followingCount for the follower
    await User.findByIdAndUpdate(followerId, { $inc: { "statistics.followingUsersCount": change } });
    // Increment/decrement followersCount for the user being followed
    await User.findByIdAndUpdate(followingId, { $inc: { "statistics.followersCount": change } });
  } catch (error) {
    console.error(`Error updating follow counts for follower ${followerId} and following ${followingId}:`, error);
    // Consider a retry mechanism or logging for critical counter updates
  }
}

UserFollowSchema.post("save", async function (doc: IUserFollow) {
  // If a new follow is created and is active
  if (doc.$isNew && doc.status === "active") {
    await updateUserFollowCounts(doc.followerId, doc.followingId, true);
  }
  // If an existing follow record is updated to active (e.g., after pending approval)
  if (!doc.$isNew && doc.isModified("status") && doc.status === "active") {
    // This logic might need to fetch the previous state to see if it was inactive before
    // For simplicity, assuming a direct transition to active from a non-counted state
    const previousState = await model<IUserFollow>("UserFollow").findOne({ _id: doc._id }).lean();
    if (previousState && previousState.status !== "active") { // Was not active before
        await updateUserFollowCounts(doc.followerId, doc.followingId, true);
    }
  }
  // If an existing follow record is updated to inactive (e.g., unfollowed or blocked)
  if (!doc.$isNew && doc.isModified("status") && doc.status !== "active") {
    const previousState = await model<IUserFollow>("UserFollow").findOne({ _id: doc._id }).lean();
    if (previousState && previousState.status === "active") { // Was active before
        await updateUserFollowCounts(doc.followerId, doc.followingId, false);
    }
  }
});

// Middleware for direct delete operations (e.g., admin deleting a follow record or user unfollowing)
// Using `pre` for `deleteOne` and `findOneAndDelete` to capture the document(s) before deletion.
UserFollowSchema.pre(["deleteOne", "findOneAndDelete"], { document: true, query: false }, async function(next) {
  if (this.status === "active") {
    await updateUserFollowCounts(this.followerId, this.followingId, false);
  }
  next();
});

UserFollowSchema.pre("deleteMany", async function(next) {
    const docsToDelete = await this.model.find(this.getFilter()).lean();
    for (const doc of docsToDelete) {
        if (doc.status === "active") {
            await updateUserFollowCounts(doc.followerId, doc.followingId, false);
        }
    }
    next();
});


// ----- Model Export -----
const UserFollowModel = () =>
  models.UserFollow as mongoose.Model<IUserFollow> || model<IUserFollow>("UserFollow", UserFollowSchema);

export default UserFollowModel;

