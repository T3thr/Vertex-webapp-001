// src/backend/models/mongodb.ts

import mongoose, { Schema, Document, Model } from "mongoose";

// อินเทอร์เฟซสำหรับ User
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  email?: string;
  preferences: {
    privacy: {
      readingHistoryVisibility: "public" | "followersOnly" | "private";
    };
  };
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// อินเทอร์เฟซสำหรับ SocialMediaUser
export interface ISocialMediaUser extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  socialMediaId: string;
  platform: string;
  preferences: {
    privacy: {
      readingHistoryVisibility: "public" | "followersOnly" | "private";
    };
  };
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// อินเทอร์เฟซสำหรับ ActivityHistory
export interface IActivityHistory extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  activityType: string;
  message?: string;
  details?: {
    novelId?: mongoose.Types.ObjectId;
    episodeId?: mongoose.Types.ObjectId;
    commentId?: mongoose.Types.ObjectId;
    ratingId?: mongoose.Types.ObjectId;
    targetUserId?: mongoose.Types.ObjectId;
    purchaseId?: mongoose.Types.ObjectId;
    donationId?: mongoose.Types.ObjectId;
    amountCoin?: number;
    ipAddress?: string;
    userAgent?: string;
  };
  createdAt: Date;
}

// อินเทอร์เฟซสำหรับ Novel
export interface INovel extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  isDeleted: boolean;
}

// อินเทอร์เฟซสำหรับ Episode
export interface IEpisode extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  episodeNumber: number;
  isDeleted: boolean;
}

// อัปเดตฟังก์ชัน UserModel
export function UserModel(): Model<IUser> {
  const userSchema = new Schema<IUser>(
    {
      username: { type: String, required: true, unique: true },
      email: { type: String },
      preferences: {
        privacy: {
          readingHistoryVisibility: {
            type: String,
            enum: ["public", "followersOnly", "private"],
            default: "public",
          },
        },
      },
      isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true }
  );

  return (
    mongoose.models.User ||
    mongoose.model<IUser>("User", userSchema)
  );
}

// อัปเดตฟังก์ชัน SocialMediaUserModel
export function SocialMediaUserModel(): Model<ISocialMediaUser> {
  const socialMediaUserSchema = new Schema<ISocialMediaUser>(
    {
      username: { type: String, required: true, unique: true },
      socialMediaId: { type: String, required: true },
      platform: { type: String, required: true },
      preferences: {
        privacy: {
          readingHistoryVisibility: {
            type: String,
            enum: ["public", "followersOnly", "private"],
            default: "public",
          },
        },
      },
      isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true }
  );

  return (
    mongoose.models.SocialMediaUser ||
    mongoose.model<ISocialMediaUser>("SocialMediaUser", socialMediaUserSchema)
  );
}

// อัปเดตฟังก์ชัน ActivityHistoryModel
export function ActivityHistoryModel(): Model<IActivityHistory> {
  const activityHistorySchema = new Schema<IActivityHistory>(
    {
      user: { type: Schema.Types.ObjectId, ref: "User", required: true },
      activityType: { type: String, required: true },
      message: { type: String },
      details: {
        novelId: { type: Schema.Types.ObjectId, ref: "Novel" },
        episodeId: { type: Schema.Types.ObjectId, ref: "Episode" },
        commentId: { type: Schema.Types.ObjectId },
        ratingId: { type: Schema.Types.ObjectId },
        targetUserId: { type: Schema.Types.ObjectId, ref: "User" },
        purchaseId: { type: Schema.Types.ObjectId },
        donationId: { type: Schema.Types.ObjectId },
        amountCoin: { type: Number },
        ipAddress: { type: String },
        userAgent: { type: String },
      },
    },
    { timestamps: true }
  );

  return (
    mongoose.models.ActivityHistory ||
    mongoose.model<IActivityHistory>("ActivityHistory", activityHistorySchema)
  );
}

// อัปเดตฟังก์ชัน NovelModel
export function NovelModel(): Model<INovel> {
  const novelSchema = new Schema<INovel>(
    {
      title: { type: String, required: true },
      slug: { type: String, required: true, unique: true },
      isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true }
  );

  return (
    mongoose.models.Novel ||
    mongoose.model<INovel>("Novel", novelSchema)
  );
}

// อัปเดตฟังก์ชัน EpisodeModel
export function EpisodeModel(): Model<IEpisode> {
  const episodeSchema = new Schema<IEpisode>(
    {
      title: { type: String, required: true },
      episodeNumber: { type: Number, required: true },
      isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true }
  );

  return (
    mongoose.models.Episode ||
    mongoose.model<IEpisode>("Episode", episodeSchema)
  );
}