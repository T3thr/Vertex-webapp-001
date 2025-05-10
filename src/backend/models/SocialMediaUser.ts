// src/backend/models/SocialMediaUser.ts
// SocialMediaUser Model - ศูนย์กลางข้อมูลผู้ใช้ที่เข้าสู่ระบบผ่าน OAuth providers (Google, Twitter, etc.)
// โมเดลผู้ใช้โซเชียลมีเดีย - จัดการข้อมูลผู้ใช้ที่เข้าสู่ระบบผ่านผู้ให้บริการ OAuth

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Interface สำหรับ Account ที่เชื่อมโยงกับ SocialMediaUser (สำหรับ OAuth providers)
// อินเทอร์เฟซสำหรับบัญชีที่เชื่อมโยงกับผู้ใช้ (สำหรับผู้ให้บริการ OAuth)
export interface IAccount {
  provider: string; // เช่น "google", "twitter"
  providerAccountId: string; // ID จาก provider
  type: string; // ประเภทของ account เช่น "oauth"
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
  idToken?: string;
  sessionState?: string;
  providerData?: Record<string, any>; // ข้อมูลเพิ่มเติมจาก provider
}

// Interface สำหรับ SocialMediaUser document
// อินเทอร์เฟซสำหรับเอกสารผู้ใช้โซเชียลมีเดีย
export interface ISocialMediaUser extends Document {
  _id: Types.ObjectId;
  email?: string; // อีเมล (ตัวเลือก, ไม่ซ้ำกัน, อาจไม่มี)
  username: string; // ชื่อผู้ใช้ (ต้องไม่ซ้ำกัน)
  password?: string; // รหัสผ่าน (hashed) - select: false (ถ้ามีการใช้ credentials)
  accounts: IAccount[]; // บัญชีที่เชื่อมโยง (OAuth providers)
  role: "Reader" | "Writer" | "Admin"; // บทบาทของผู้ใช้
  profile: {
    displayName?: string; // ชื่อที่แสดง (จาก provider)
    avatar?: string; // URL รูปโปรไฟล์ (จาก provider)
    bio?: string; // คำอธิบาย (อาจไม่มี)
    coverImage?: string; // รูปปกโปรไฟล์
    gender?: "male" | "female" | "other" | "preferNotToSay"; // เพศ
    preferredGenres?: Types.ObjectId[]; // หมวดหมู่นิยายที่ชื่นชอบ (อ้างอิง Category model)
  };
  trackingStats: {
    totalLoginDays: number; // จำนวนวันที่เข้าสู่ระบบทั้งหมด
    totalNovelsRead: number; // จำนวนนิยายที่อ่านจบหรือเริ่มอ่าน
    totalEpisodesRead: number; // จำนวนตอนที่อ่านทั้งหมด
    totalCoinSpent: number; // จำนวนเหรียญทั้งหมดที่ใช้จ่าย
    totalRealMoneySpent: number; // จำนวนเงินจริงทั้งหมดที่ใช้จ่าย
    lastNovelReadId?: Types.ObjectId; // ID ของนิยายที่อ่านล่าสุด (อ้างอิง Novel)
    lastNovelReadAt?: Date; // วันที่อ่านนิยายล่าสุด
    joinDate: Date; // วันที่สมัครใช้งาน (คือ createdAt)
  };
  socialStats: {
    followersCount: number; // จำนวนผู้ติดตาม
    followingCount: number; // จำนวนที่กำลังติดตาม
    novelsCreatedCount: number; // จำนวนนิยายที่เขียน (สำหรับ Writer)
    commentsMadeCount: number; // จำนวนความคิดเห็นที่สร้าง
    ratingsGivenCount: number; // จำนวนเรตติ้งที่ให้
    likesGivenCount: number; // จำนวนไลค์ที่ให้
  };
  preferences: {
    language: string; // ภาษาที่ต้องการใช้งาน
    theme: "light" | "dark" | "system" | "sepia"; // ธีมที่ต้องการใช้งาน
    notifications: {
      email: boolean; // รับการแจ้งเตือนทางอีเมล
      push: boolean; // รับการแจ้งเตือนแบบ push
      novelUpdates: boolean; // รับการแจ้งเตือนเมื่อนิยายที่ติดตามมีการอัพเดต
      comments: boolean; // รับการแจ้งเตือนเมื่อมีคนแสดงความคิดเห็น
      donations: boolean; // รับการแจ้งเตือนเมื่อได้รับการบริจาค
      newFollowers: boolean; // การแจ้งเตือนเมื่อมีผู้ติดตามใหม่
      systemAnnouncements: boolean; // การแจ้งเตือนการอัปเดตระบบ
    };
    contentFilters?: {
      showMatureContent: boolean; // แสดงเนื้อหาสำหรับผู้ใหญ่หรือไม่
      blockedGenres?: Types.ObjectId[]; // หมวดหมู่ที่บล็อก
      blockedTags?: string[]; // แท็กที่บล็อก
    };
    privacy: {
      showActivityStatus: boolean; // แสดงสถานะกิจกรรมหรือไม่
      profileVisibility: "public" | "followersOnly" | "private"; // การมองเห็นโปรไฟล์
      readingHistoryVisibility: "public" | "followersOnly" | "private"; // การมองเห็นประวัติการอ่าน
    };
  };
  wallet: {
    coinBalance: number; // ยอดเหรียญคงเหลือ
    lastCoinTransactionAt?: Date; // วันที่ทำธุรกรรมเหรียญล่าสุด
  };
  gamification: {
    level: number; // ระดับของผู้ใช้
    experiencePoints: number; // คะแนนประสบการณ์
    achievements: Types.ObjectId[]; // ID ของ UserAchievement ที่ปลดล็อค
    badges: Types.ObjectId[]; // ID ของ Badge ที่ได้รับ
    streaks: {
      currentLoginStreak: number; // จำนวนวันที่เข้าสู่ระบบติดต่อกัน
      longestLoginStreak: number; // จำนวนวันที่เข้าสู่ระบบติดต่อกันนานที่สุด
      lastLoginDate?: Date; // วันที่เข้าสู่ระบบล่าสุด
    };
    dailyCheckIn?: {
      lastCheckInDate?: Date; // วันที่เช็คอินล่าสุด
      currentStreak: number; // สตรีคการเช็คอินปัจจุบัน
    };
  };
  writerVerification?: {
    status: "none" | "pending" | "verified" | "rejected"; // สถานะการยืนยันตัวตน
    submittedAt?: Date; // วันที่ส่งเอกสารยืนยัน
    verifiedAt?: Date; // วันที่ได้รับการยืนยัน
    rejectedReason?: string; // เหตุผลที่ถูกปฏิเสธ
    documents?: {
      type: string; // ประเภทของ document
      url: string; // URL ของเอกสาร
      uploadedAt: Date; // วันที่อัพโหลด
    }[];
  };
  donationSettings?: {
    isDonationEnabled: boolean; // สถานะการเปิดรับบริจาค
    donationApplicationId?: Types.ObjectId; // ID ของใบสมัครขอเปิดรับบริจาค
    customMessage?: string; // ข้อความส่วนตัวสำหรับการบริจาค
  };
  writer dew: boolean; // สำหรับการ soft delete
  writerApplication?: Types.ObjectId; // อ้างอิง WriterApplication
  writerStats?: Types.ObjectId; // อ้างอิง WriterStats
  isEmailVerified: boolean;
  emailVerificationToken?: string; // select: false
  emailVerificationTokenExpiry?: Date; // select: false
  resetPasswordToken?: string; // select: false
  resetPasswordTokenExpiry?: Date; // select: false
  isActive: boolean;
  isBanned: boolean;
  banReason?: string;
  bannedUntil?: Date;
  lastLoginAt?: Date;
  joinedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  image?: string; // รูปโปรไฟล์จาก NextAuth (มักใช้เป็น avatar)

  // Methods
  matchPassword(enteredPassword: string): Promise<boolean>;
  getResetPasswordToken(): string;
  getEmailVerificationToken(): string;
}

// สร้าง Account Schema สำหรับบัญชีที่เชื่อมโยง
const AccountSchema = new Schema<IAccount>(
  {
    provider: { type: String, required: true },
    providerAccountId: { type: String, required: true },
    type: { type: String, required: true },
    accessToken: { type: String, select: false },
    refreshToken: { type: String, select: false },
    expiresAt: Number,
    tokenType: { type: String, select: false },
    scope: String,
    idToken: { type: String, select: false },
    sessionState: { type: String, select: false },
    providerData: Schema.Types.Mixed,
  },
  { _id: false }
);

// สร้าง SocialMediaUser Schema
const SocialMediaUserSchema = new Schema<ISocialMediaUser>(
  {
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (v: string) => !v || /^\S+@\S+\.\S+$/.test(v),
        message: "รูปแบบอีเมลไม่ถูกต้อง",
      },
      index: true,
    },
    username: {
      type: String,
      required: [true, "ต้องระบุชื่อผู้ใช้"],
      unique: true,
      trim: true,
      minlength: [3, "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร"],
      maxlength: [30, "ชื่อผู้ใช้ต้องมีไม่เกิน 30 ตัวอักษร"],
      match: [/^[a-zA-Z0-9_\.]+$/, "ชื่อผู้ใช้สามารถประกอบด้วยตัวอักษร (a-z, A-Z), ตัวเลข (0-9), จุด (.) และขีดล่าง (_) เท่านั้น"],
      index: true,
    },
    password: {
      type: String,
      minlength: [8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"],
      select: false,
    },
    accounts: [AccountSchema],
    role: {
      type: String,
      enum: {
        values: ["Reader", "Writer", "Admin"],
        message: "บทบาท {VALUE} ไม่ถูกต้อง",
      },
      default: "Reader",
      index: true,
    },
    profile: {
      _id: false,
      displayName: { type: String, trim: true, maxlength: [100, "ชื่อที่แสดงต้องไม่เกิน 100 ตัวอักษร"] },
      avatar: { type: String, trim: true, validate: { validator: (v: string) => !v || /^https?:\/\/|^\//.test(v), message: "รูปแบบ URL ของรูปโปรไฟล์ไม่ถูกต้อง" } },
      bio: { type: String, trim: true, maxlength: [500, "คำอธิบายต้องไม่เกิน 500 ตัวอักษร"] },
      coverImage: { type: String, trim: true, validate: { validator: (v: string) => !v || /^https?:\/\/|^\//.test(v), message: "รูปแบบ URL ของรูปปกไม่ถูกต้อง" } },
      gender: { type: String, enum: { values: ["male", "female", "other", "preferNotToSay"], message: "เพศ {VALUE} ไม่ถูกต้อง" } },
      preferredGenres: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    },
    trackingStats: {
      _id: false,
      totalLoginDays: { type: Number, default: 0, min: 0 },
      totalNovelsRead: { type: Number, default: 0, min: 0 },
      totalEpisodesRead: { type: Number, default: 0, min: 0 },
      totalCoinSpent: { type: Number, default: 0, min: 0 },
      totalRealMoneySpent: { type: Number, default: 0, min: 0 },
      lastNovelReadId: { type: Schema.Types.ObjectId, ref: "Novel" },
      lastNovelReadAt: { type: Date },
      joinDate: { type: Date, default: Date.now, immutable: true },
    },
    socialStats: {
      _id: false,
      followersCount: { type: Number, default: 0, min: 0 },
      followingCount: { type: Number, default: 0, min: 0 },
      novelsCreatedCount: { type: Number, default: 0, min: 0 },
      commentsMadeCount: { type: Number, default: 0, min: 0 },
      ratingsGivenCount: { type: Number, default: 0, min: 0 },
      likesGivenCount: { type: Number, default: 0, min: 0 },
    },
    preferences: {
      _id: false,
      language: { type: String, default: "th", trim: true },
      theme: { type: String, enum: ["light", "dark", "system", "sepia"], default: "system" },
      notifications: {
        _id: false,
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        novelUpdates: { type: Boolean, default: true },
        comments: { type: Boolean, default: true },
        donations: { type: Boolean, default: true },
        newFollowers: { type: Boolean, default: true },
        systemAnnouncements: { type: Boolean, default: false },
      },
      contentFilters: {
        _id: false,
        showMatureContent: { type: Boolean, default: false },
        blockedGenres: [{ type: Schema.Types.ObjectId, ref: "Category" }],
        blockedTags: [{ type: String, trim: true }],
      },
      privacy: {
        _id: false,
        showActivityStatus: { type: Boolean, default: true },
        profileVisibility: { type: String, enum: ["public", "followersOnly", "private"], default: "public" },
        readingHistoryVisibility: { type: String, enum: ["public", "followersOnly", "private"], default: "followersOnly" },
      },
    },
    wallet: {
      _id: false,
      coinBalance: { type: Number, default: 0, min: [0, "ยอดเหรียญคงเหลือไม่สามารถติดลบได้"] },
      lastCoinTransactionAt: { type: Date },
    },
    gamification: {
      _id: false,
      level: { type: Number, default: 1, min: 1 },
      experiencePoints: { type: Number, default: 0, min: 0 },
      achievements: [{ type: Schema.Types.ObjectId, ref: "Achievement" }],
      badges: [{ type: Schema.Types.ObjectId, ref: "Badge" }],
      streaks: {
        _id: false,
        currentLoginStreak: { type: Number, default: 0, min: 0 },
        longestLoginStreak: { type: Number, default: 0, min: 0 },
        lastLoginDate: { type: Date },
      },
      dailyCheckIn: {
        _id: false,
        lastCheckInDate: { type: Date },
        currentStreak: { type: Number, default: 0, min: 0 },
      },
    },
    writerVerification: {
      _id: false,
      status: { type: String, enum: ["none", "pending", "verified", "rejected"], default: "none" },
      submittedAt: { type: Date },
      verifiedAt: { type: Date },
      rejectedReason: { type: String },
      documents: [
        {
          _id: false,
          type: { type: String, required: true },
          url: { type: String, required: true, validate: { validator: (v: string) => /^https?:\/\/|^\//.test(v), message: "รูปแบบ URL ของเอกสารไม่ถูกต้อง" } },
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
    },
    donationSettings: {
      _id: false,
      isDonationEnabled: { type: Boolean, default: false },
      donationApplicationId: { type: Schema.Types.ObjectId, ref: "DonationApplication" },
      customMessage: { type: String, trim: true, maxlength: [280, "ข้อความบริจาคต้องไม่เกิน 280 ตัวอักษร"] },
    },
    writerApplication: { type: Schema.Types.ObjectId, ref: "WriterApplication" },
    writerStats: { type: Schema.Types.ObjectId, ref: "WriterStats" },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationTokenExpiry: { type: Date, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordTokenExpiry: { type: Date, select: false },
    isActive: { type: Boolean, default: true, index: true },
    isBanned: { type: Boolean, default: false, index: true },
    banReason: { type: String, trim: true, maxlength: [500, "เหตุผลการแบนต้องไม่เกิน 500 ตัวอักษร"] },
    bannedUntil: { type: Date },
    lastLoginAt: { type: Date, default: Date.now },
    joinedAt: { type: Date, default: Date.now, immutable: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    image: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----- Indexes -----
SocialMediaUserSchema.index({ "accounts.provider": 1, "accounts.providerAccountId": 1 }, { unique: true, sparse: true });
SocialMediaUserSchema.index({ role: 1, "writerVerification.status": 1 });
SocialMediaUserSchema.index({ isActive: 1, isBanned: 1 });
SocialMediaUserSchema.index({ "socialStats.followersCount": -1 });
SocialMediaUserSchema.index({ "wallet.coinBalance": -1 });
SocialMediaUserSchema.index({ role: 1, "donationSettings.isDonationEnabled": 1 });
SocialMediaUserSchema.index({ "trackingStats.lastNovelReadAt": -1 });
SocialMediaUserSchema.index({ "trackingStats.totalCoinSpent": -1 });
SocialMediaUserSchema.index({ "trackingStats.totalRealMoneySpent": -1 });
SocialMediaUserSchema.index({ "gamification.level": -1, "gamification.experiencePoints": -1 });
SocialMediaUserSchema.index({ username: "text", "profile.displayName": "text" });

// ----- Middleware: Password Hashing -----
SocialMediaUserSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) {
    return next();
  }
  const credentialsAccount = this.accounts.find((acc) => acc.provider === "credentials");
  if (credentialsAccount || (this.isNew && this.email && this.password)) {
    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
      if (!credentialsAccount && this.email) {
        const existingCredentials = this.accounts.find(
          (acc) => acc.provider === "credentials" && acc.providerAccountId === this.email
        );
        if (!existingCredentials) {
          this.accounts.push({
            provider: "credentials",
            providerAccountId: this.email,
            type: "credentials",
          });
        }
      }
      next();
    } catch (error) {
      next(error as Error);
    }
  } else {
    next();
  }
});

// ----- Middleware: Update Login Streaks and Total Login Days -----
SocialMediaUserSchema.pre("save", function (next) {
  if (this.isModified("lastLoginAt")) {
    const now = new Date();
    const lastLogin = this.gamification?.streaks?.lastLoginDate;

    if (this.gamification?.streaks) {
      const todayMidnight = new Date(now).setHours(0, 0, 0, 0);
      const lastLoginMidnight = lastLogin ? new Date(lastLogin).setHours(0, 0, 0, 0) : null;

      if (lastLoginMidnight && lastLoginMidnight !== todayMidnight) {
        this.trackingStats.totalLoginDays = (this.trackingStats.totalLoginDays || 0) + 1;

        const yesterdayMidnight = new Date(now);
        yesterdayMidnight.setDate(yesterdayMidnight.getDate() - 1);
        const yesterdayMidnightTimestamp = yesterdayMidnight.setHours(0, 0, 0, 0);

        if (lastLoginMidnight === yesterdayMidnightTimestamp) {
          this.gamification.streaks.currentLoginStreak =
            (this.gamification.streaks.currentLoginStreak || 0) + 1;
        } else {
          this.gamification.streaks.currentLoginStreak = 1;
        }
      } else if (!lastLoginMidnight) {
        this.trackingStats.totalLoginDays = 1;
        this.gamification.streaks.currentLoginStreak = 1;
      }
      if (
        this.gamification.streaks.currentLoginStreak >
        (this.gamification.streaks.longestLoginStreak || 0)
      ) {
        this.gamification.streaks.longestLoginStreak = this.gamification.streaks.currentLoginStreak;
      }
      this.gamification.streaks.lastLoginDate = now;
    } else if (this.gamification) {
      this.trackingStats.totalLoginDays = 1;
      this.gamification.streaks = {
        currentLoginStreak: 1,
        longestLoginStreak: 1,
        lastLoginDate: now,
      };
    }
  }

  // Soft delete handling - การจัดการการลบแบบ soft delete
  if (this.isModified("isDeleted") && this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  if (this.isModified("isDeleted") && !this.isDeleted) {
    this.deletedAt = undefined;
  }
  next();
});

// ----- Methods -----
SocialMediaUserSchema.methods.matchPassword = async function (
  enteredPassword: string
): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

SocialMediaUserSchema.methods.getResetPasswordToken = function (): string {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.resetPasswordTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 นาที
  return resetToken;
};

SocialMediaUserSchema.methods.getEmailVerificationToken = function (): string {
  const verificationToken = crypto.randomBytes(32).toString("hex");
  this.emailVerificationToken = crypto.createHash("sha256").update(verificationToken).digest("hex");
  this.emailVerificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ชั่วโมง
  return verificationToken;
};

// ----- Virtuals -----
SocialMediaUserSchema.virtual("writtenNovels", {
  ref: "Novel",
  localField: "_id",
  foreignField: "author",
  justOne: false,
});

SocialMediaUserSchema.virtual("userFollowers", {
  ref: "UserFollow",
  localField: "_id",
  foreignField: "following",
  justOne: false,
});

SocialMediaUserSchema.virtual("userFollowing", {
  ref: "UserFollow",
  localField: "_id",
  foreignField: "follower",
  justOne: false,
});

SocialMediaUserSchema.virtual("novelFollows", {
  ref: "NovelFollow",
  localField: "_id",
  foreignField: "user",
  justOne: false,
});

SocialMediaUserSchema.virtual("userAchievements", {
  ref: "UserAchievement",
  localField: "_id",
  foreignField: "user",
  justOne: false,
  options: { sort: { createdAt: -1 } },
});

SocialMediaUserSchema.virtual("purchases", {
  ref: "Purchase",
  localField: "_id",
  foreignField: "user",
  just Unevaluated: false,
  justOne: false,
});

SocialMediaUserSchema.virtual("donationsMade", {
  ref: "Donation",
  localField: "_id",
  foreignField: "donorUser",
  justOne: false,
});

SocialMediaUserSchema.virtual("donationsReceived", {
  ref: "Donation",
  localField: "_id",
  foreignField: "recipientUser",
  justOne: false,
});

SocialMediaUserSchema.virtual("donationApplication", {
  ref: "DonationApplication",
  localField: "_id",
  foreignField: "userId",
  justOne: true,
});

// ----- Model Export -----
const SocialMediaUserModel = () =>
  models.SocialMediaUser as mongoose.Model<ISocialMediaUser> ||
  model<ISocialMediaUser>("SocialMediaUser", SocialMediaUserSchema);

export default SocialMediaUserModel;