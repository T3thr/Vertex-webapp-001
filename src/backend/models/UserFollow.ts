// src/backend/models/UserFollow.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IUser } from "./User"; // Import IUser interface
import { ISocialMediaUser } from "./SocialMediaUser"; // Import ISocialMediaUser interface

// อินเทอร์เฟซสำหรับเอกสาร UserFollow
export interface IUserFollow extends Document {
  $isNew: boolean;
  followerId: Types.ObjectId; // ผู้ใช้ที่ทำการติดตาม
  followerModel: "User" | "SocialMediaUser"; // โมเดลของผู้ติดตาม
  followingId: Types.ObjectId; // ผู้ใช้ที่ถูกติดตาม
  followingModel: "User" | "SocialMediaUser"; // โมเดลของผู้ที่ถูกติดตาม
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
      refPath: "followerModel",
      required: [true, "กรุณาระบุ ID ของผู้ติดตาม (followerId)"],
      index: true,
    },
    followerModel: {
      type: String,
      required: true,
      enum: ["User", "SocialMediaUser"],
      index: true,
    },
    followingId: {
      type: Schema.Types.ObjectId,
      refPath: "followingModel",
      required: [true, "กรุณาระบุ ID ของผู้ที่ถูกติดตาม (followingId)"],
      index: true,
    },
    followingModel: {
      type: String,
      required: true,
      enum: ["User", "SocialMediaUser"],
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
UserFollowSchema.index({ followerId: 1, followerModel: 1, followingId: 1, followingModel: 1 }, { unique: true });
UserFollowSchema.index({ followerId: 1, followerModel: 1, status: 1, followedAt: -1 });
UserFollowSchema.index({ followingId: 1, followingModel: 1, status: 1, followedAt: -1 });
UserFollowSchema.index({ followingId: 1, followingModel: 1, createdAt: -1 });

// ----- Virtuals สำหรับการ populate ข้อมูลผู้ใช้ -----
// Virtual สำหรับผู้ติดตาม
UserFollowSchema.virtual("follower", {
  ref: "followerModel", // Dynamic reference based on followerModel field
  localField: "followerId",
  foreignField: "_id",
  justOne: true,
  match: { isActive: true, isBanned: false },
});

// Virtual สำหรับผู้ที่ถูกติดตาม
UserFollowSchema.virtual("following", {
  ref: "followingModel", // Dynamic reference based on followingModel field
  localField: "followingId",
  foreignField: "_id",
  justOne: true,
  match: { isActive: true, isBanned: false },
});

// ----- Middleware สำหรับอัปเดตจำนวนผู้ติดตาม/กำลังติดตาม -----
async function updateUserFollowCounts(
  followerId: Types.ObjectId,
  followerModel: "User" | "SocialMediaUser",
  followingId: Types.ObjectId,
  followingModel: "User" | "SocialMediaUser",
  increment: boolean
) {
  const UserModel = model("User");
  const SocialMediaUserModel = model("SocialMediaUser");
  const change = increment ? 1 : -1;
  try {
    const followerUpdate =
      followerModel === "User"
        ? UserModel.findByIdAndUpdate(followerId, {
            $inc: { "socialStats.followingCount": change },
          })
        : SocialMediaUserModel.findByIdAndUpdate(followerId, {
            $inc: { "socialStats.followingCount": change },
          });

    const followingUpdate =
      followingModel === "User"
        ? UserModel.findByIdAndUpdate(followingId, {
            $inc: { "socialStats.followersCount": change },
          })
        : SocialMediaUserModel.findByIdAndUpdate(followingId, {
            $inc: { "socialStats.followersCount": change },
          });

    await Promise.all([followerUpdate, followingUpdate]);
  } catch (error) {
    console.error(
      `เกิดข้อผิดพลาดในการอัปเดตจำนวนผู้ติดตาม/กำลังติดตาม:`,
      error
    );
  }
}

UserFollowSchema.post("save", async function (doc: IUserFollow) {
  if (doc.$isNew && doc.status === "active") {
    await updateUserFollowCounts(
      doc.followerId,
      doc.followerModel,
      doc.followingId,
      doc.followingModel,
      true
    );
  }

  if (!doc.$isNew && doc.isModified("status") && doc.status === "active") {
    const previousState = await model<IUserFollow>("UserFollow")
      .findOne({ _id: doc._id })
      .lean();
    if (previousState && previousState.status !== "active") {
      await updateUserFollowCounts(
        doc.followerId,
        doc.followerModel,
        doc.followingId,
        doc.followingModel,
        true
      );
    }
  }

  if (!doc.$isNew && doc.isModified("status") && doc.status !== "active") {
    const previousState = await model<IUserFollow>("UserFollow")
      .findOne({ _id: doc._id })
      .lean();
    if (previousState && previousState.status === "active") {
      await updateUserFollowCounts(
        doc.followerId,
        doc.followerModel,
        doc.followingId,
        doc.followingModel,
        false
      );
    }
  }
});

UserFollowSchema.pre(
  ["deleteOne", "findOneAndDelete"],
  { document: true, query: false },
  async function (next) {
    if (this.status === "active") {
      await updateUserFollowCounts(
        this.followerId,
        this.followerModel,
        this.followingId,
        this.followingModel,
        false
      );
    }
    next();
  }
);

UserFollowSchema.pre("deleteMany", async function (next) {
  const docsToDelete = await this.model.find(this.getFilter()).lean();
  for (const doc of docsToDelete) {
    if (doc.status === "active") {
      await updateUserFollowCounts(
        doc.followerId,
        doc.followerModel,
        doc.followingId,
        doc.followingModel,
        false
      );
    }
  }
  next();
});

// ----- Static Method สำหรับการสร้าง Map ของผู้ใช้ (แก้ไขปัญหา 'user._id' is of type 'unknown') -----
UserFollowSchema.statics.createUserMap = async function (
  userIds: Types.ObjectId[],
  socialMediaUserIds: Types.ObjectId[]
): Promise<Map<string, IUser | ISocialMediaUser>> {
  const UserModel = model("User");
  const SocialMediaUserModel = model("SocialMediaUser");

  // ดึงข้อมูลผู้ใช้จากทั้งสองโมเดล
  const users = await UserModel.find({
    _id: { $in: userIds },
    isActive: true,
    isBanned: false,
  }).exec();

  const socialMediaUsers = await SocialMediaUserModel.find({
    _id: { $in: socialMediaUserIds },
    isActive: true,
    isBanned: false,
  }).exec();

  // สร้าง Map ของผู้ใช้โดยใช้ _id เป็น key
  const userMap = new Map<string, IUser | ISocialMediaUser>();
  users.forEach((user: IUser) => userMap.set(user._id.toString(), user));
  socialMediaUsers.forEach((user: ISocialMediaUser) =>
    userMap.set(user._id.toString(), user)
  );

  return userMap;
};

// ----- โมเดล Export -----
const UserFollowModel = () =>
  models.UserFollow as mongoose.Model<IUserFollow> ||
  model<IUserFollow>("UserFollow", UserFollowSchema);

export default UserFollowModel;