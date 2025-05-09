// src/backend/models/UserFollow.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// อินเทอร์เฟซสำหรับเอกสาร UserFollow
export interface IUserFollow extends Document {
  $isNew: boolean;
  followerId: Types.ObjectId; // ผู้ใช้ที่ทำการติดตาม
  followingId: Types.ObjectId; // ผู้ใช้ที่ถูกติดตาม
  notifications?: {
    onNewNovelByFollowing?: boolean; // แจ้งเตือนเมื่อผู้ที่ถูกติดตามสร้างนิยายใหม่
    onFollowingActivity?: boolean; // แจ้งเตือนเกี่ยวกับกิจกรรมอื่นๆ
  };
  status: "active" | "pending_approval" | "blocked"; // สถานะการติดตาม
  followedAt: Date; // วันที่เริ่มติดตาม
  createdAt: Date;
  updatedAt: Date;
}

// สคีมาสำหรับความสัมพันธ์การติดตาม
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
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----- ดัชนี -----
UserFollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
UserFollowSchema.index({ followerId: 1, status: 1, followedAt: -1 });
UserFollowSchema.index({ followingId: 1, status: 1, followedAt: -1 });
UserFollowSchema.index({ followingId: 1, createdAt: -1 });

// ----- Virtuals สำหรับการ populate ข้อมูลผู้ใช้ -----
// Virtual สำหรับผู้ติดตาม
UserFollowSchema.virtual("follower", {
  ref: [
    { model: "User", match: { isActive: true, isBanned: false } },
    { model: "SocialMediaUser", match: { isActive: true, isBanned: false } },
  ],
  localField: "followerId",
  foreignField: "_id",
  justOne: true,
});

// Virtual สำหรับผู้ที่ถูกติดตาม
UserFollowSchema.virtual("following", {
  ref: [
    { model: "User", match: { isActive: true, isBanned: false } },
    { model: "SocialMediaUser", match: { isActive: true, isBanned: false } },
  ],
  localField: "followingId",
  foreignField: "_id",
  justOne: true,
});

// ----- Middleware สำหรับอัปเดตจำนวนผู้ติดตาม/กำลังติดตาม -----
async function updateUserFollowCounts(
  followerId: Types.ObjectId,
  followingId: Types.ObjectId,
  increment: boolean
) {
  const User = model("User"); // สมมติว่าได้ลงทะเบียนโมเดล User แล้ว
  const change = increment ? 1 : -1;
  try {
    await User.findByIdAndUpdate(followerId, {
      $inc: { "statistics.followingUsersCount": change },
    });
    await User.findByIdAndUpdate(followingId, {
      $inc: { "statistics.followersCount": change },
    });
  } catch (error) {
    console.error(
      `เกิดข้อผิดพลาดในการอัปเดตจำนวนผู้ติดตาม/กำลังติดตาม:`,
      error
    );
  }
}

UserFollowSchema.post("save", async function (doc: IUserFollow) {
  if (doc.$isNew && doc.status === "active") {
    await updateUserFollowCounts(doc.followerId, doc.followingId, true);
  }

  if (!doc.$isNew && doc.isModified("status") && doc.status === "active") {
    const previousState = await model<IUserFollow>("UserFollow")
      .findOne({ _id: doc._id })
      .lean();
    if (previousState && previousState.status !== "active") {
      await updateUserFollowCounts(doc.followerId, doc.followingId, true);
    }
  }

  if (!doc.$isNew && doc.isModified("status") && doc.status !== "active") {
    const previousState = await model<IUserFollow>("UserFollow")
      .findOne({ _id: doc._id })
      .lean();
    if (previousState && previousState.status === "active") {
      await updateUserFollowCounts(doc.followerId, doc.followingId, false);
    }
  }
});

UserFollowSchema.pre(
  ["deleteOne", "findOneAndDelete"],
  { document: true, query: false },
  async function (next) {
    if (this.status === "active") {
      await updateUserFollowCounts(this.followerId, this.followingId, false);
    }
    next();
  }
);

UserFollowSchema.pre("deleteMany", async function (next) {
  const docsToDelete = await this.model.find(this.getFilter()).lean();
  for (const doc of docsToDelete) {
    if (doc.status === "active") {
      await updateUserFollowCounts(doc.followerId, doc.followingId, false);
    }
  }
  next();
});

// ----- โมเดล Export -----
const UserFollowModel = () =>
  models.UserFollow as mongoose.Model<IUserFollow> ||
  model<IUserFollow>("UserFollow", UserFollowSchema);

export default UserFollowModel;
