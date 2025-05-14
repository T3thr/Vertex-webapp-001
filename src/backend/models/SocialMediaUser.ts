// src/models/SocialMediaUser.ts
// โมเดลผู้ใช้ผ่านโซเชียลมีเดีย (SocialMediaUser Model) - จัดการข้อมูลผู้ใช้ที่ลงทะเบียน/เข้าสู่ระบบผ่าน NextAuth.js providers
// ออกแบบให้สอดคล้องกับ User model ในด้านฟังก์ชันหลัก (เช่น ระบบเหรียญ, การติดตามกิจกรรม) แต่มีโครงสร้างการยืนยันตัวตนที่แตกต่าง

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IUserProfile, UserProfileSchema, IUserSocialStats, UserSocialStatsSchema, IUserGameStats, UserGameStatsSchema, IUserWallet, UserWalletSchema, IUserActivityTracking, UserActivityTrackingSchema, IUserBanInfo, UserBanInfoSchema, IUserPrivacySettings, UserPrivacySettingsSchema, IUserSecuritySettings, UserSecuritySettingsSchema } from "./User"; // Import shared interfaces from User.ts

// อินเทอร์เฟซสำหรับข้อมูลบัญชีที่เชื่อมโยงจาก Provider (เช่น Google, Facebook)
export interface IAccountLink {
  provider: string; // เช่น "google", "facebook", "github"
  providerAccountId: string; // ID ของผู้ใช้จาก Provider นั้นๆ
  accessToken?: string; 
  refreshToken?: string; 
  expiresAt?: number; // Unix timestamp ของ token expiration
}

// อินเทอร์เฟซหลักสำหรับเอกสารผู้ใช้ผ่านโซเชียลมีเดีย (SocialMediaUser Document)
export interface ISocialMediaUser extends Document {
  _id: Types.ObjectId;
  email: string; 
  name?: string; 
  username?: string; 
  emailVerified?: Date | null; 
  image?: string; 
  
  accounts: Types.DocumentArray<IAccountLink>; 
  
  roles: Array<"user" | "writer" | "editor" | "moderator" | "admin">;
  
  profile: IUserProfile;
  socialStats: IUserSocialStats;
  gameStats: IUserGameStats;
  wallet: IUserWallet;
  activityTracking: IUserActivityTracking;
  
  privacySettings: IUserPrivacySettings;
  securitySettings: IUserSecuritySettings; 
  
  isActive: boolean; 
  isBanned: boolean;
  banInfo?: IUserBanInfo;
  lastLoginAt?: Date;
  
  isDeleted: boolean;
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const AccountLinkSchema = new Schema<IAccountLink>(
  {
    provider: { type: String, required: true, trim: true },
    providerAccountId: { type: String, required: true, trim: true },
    accessToken: { type: String, select: false }, 
    refreshToken: { type: String, select: false }, 
    expiresAt: Number,
  },
  { _id: false }
);

const SocialMediaUserSchema = new Schema<ISocialMediaUser>(
  {
    email: {
      type: String,
      required: [true, "กรุณาระบุอีเมล (Email is required)"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "รูปแบบอีเมลไม่ถูกต้อง (Invalid email format)"],
      index: true,
    },
    name: { type: String, trim: true, maxlength: 100 },
    username: { 
      type: String,
      trim: true,
      lowercase: true,
      unique: true, 
      sparse: true, 
      maxlength: 50,
      match: [/^[a-zA-Z0-9_\.]+$/, "ชื่อผู้ใช้สามารถมีได้เฉพาะตัวอักษรภาษาอังกฤษ, ตัวเลข, _, และ ."],
      index: true,
    },
    emailVerified: { type: Date, default: null },
    image: { type: String, trim: true },
    accounts: [AccountLinkSchema],
    roles: {
      type: [String],
      enum: ["user", "writer", "editor", "moderator", "admin"],
      default: ["user"],
      required: true,
    },
    profile: { type: UserProfileSchema, default: () => ({}) },
    socialStats: { type: UserSocialStatsSchema, default: () => ({}) },
    gameStats: { type: UserGameStatsSchema, default: () => ({}) },
    wallet: { type: UserWalletSchema, default: () => ({ coins: 0, transactionHistory: [] }) },
    activityTracking: { type: UserActivityTrackingSchema, default: () => ({}) },
    privacySettings: { type: UserPrivacySettingsSchema, default: () => ({}) },
    securitySettings: { type: UserSecuritySettingsSchema, default: () => ({}) }, 
    isActive: { type: Boolean, default: true, index: true },
    isBanned: { type: Boolean, default: false, index: true },
    banInfo: UserBanInfoSchema,
    lastLoginAt: { type: Date, default: Date.now, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  {
    timestamps: true, 
  }
);

SocialMediaUserSchema.index({ "accounts.provider": 1, "accounts.providerAccountId": 1 }, { unique: true, sparse: true }); 
SocialMediaUserSchema.index({ roles: 1 });
SocialMediaUserSchema.index({ lastLoginAt: -1 });

SocialMediaUserSchema.pre<ISocialMediaUser>("save", async function (next) {
  if (this.isNew && !this.username && this.email) {
    let baseUsername = this.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
    if (!baseUsername) baseUsername = "user";
    let potentialUsername = baseUsername;
    let count = 0;
    const UserModel = models.User || model("User"); 
    const SocialMediaUserModel = models.SocialMediaUser || model("SocialMediaUser");

    // Check for username uniqueness across both User and SocialMediaUser models
    while (await SocialMediaUserModel.findOne({ username: potentialUsername }) || await UserModel.findOne({ username: potentialUsername })) {
      count++;
      potentialUsername = `${baseUsername}${count}`;
    }
    this.username = potentialUsername;
  }
  if (this.isModified("email")) {
    this.email = this.email.toLowerCase();
  }
  next();
});

const SocialMediaUserModel = () => models.SocialMediaUser as mongoose.Model<ISocialMediaUser> || model<ISocialMediaUser>("SocialMediaUser", SocialMediaUserSchema);

export default SocialMediaUserModel;

