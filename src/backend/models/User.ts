// src/backend/models/User.ts
// โมเดลผู้ใช้ - ศูนย์กลางข้อมูลผู้ใช้, การยืนยันตัวตน, สถิติ, และการตั้งค่า
// รองรับการล็อกอินด้วยอีเมลหรือชื่อผู้ใช้เท่านั้น โดยไม่มี provider หรือ credential ภายนอก

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// อินเทอร์เฟซสำหรับเอกสารผู้ใช้
export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string; // อีเมล (บังคับ)
  username: string; // ชื่อผู้ใช้ (บังคับและไม่ซ้ำกัน)
  password: string; // รหัสผ่าน (hashed) - select: false
  role: "Reader" | "Writer" | "Admin"; // บทบาทของผู้ใช้
  profile: {
    displayName?: string; // ชื่อที่แสดง
    avatar?: string; // URL รูปโปรไฟล์
    bio?: string; // คำอธิบาย
    coverImage?: string; // รูปปกโปรไฟล์
    gender?: "male" | "female" | "other" | "preferNotToSay"; // เพศ
    preferredGenres?: Types.ObjectId[]; // หมวดหมู่นิยายที่ชื่นชอบ
  };
  trackingStats: {
    totalLoginDays: number; // จำนวนวันที่เข้าสู่ระบบทั้งหมด
    totalNovelsRead: number; // จำนวนนิยายที่อ่าน
    totalEpisodesRead: number; // จำนวนตอนที่อ่านทั้งหมด
    totalCoinSpent: number; // จำนวนเหรียญที่ใช้จ่าย
    totalRealMoneySpent: number; // จำนวนเงินจริงที่ใช้จ่าย
    lastNovelReadId?: Types.ObjectId; // ID นิยายที่อ่านล่าสุด
    lastNovelReadAt?: Date; // วันที่อ่านนิยายล่าสุด
    joinDate: Date; // วันที่สมัคร
  };
  socialStats: {
    followersCount: number; // จำนวนผู้ติดตาม
    followingCount: number; // จำนวนที่ติดตาม
    novelsCreatedCount: number; // จำนวนนิยายที่เขียน
    commentsMadeCount: number; // จำนวนความคิดเห็น
    ratingsGivenCount: number; // จำนวนเรตติ้ง
    likesGivenCount: number; // จำนวนไลค์
  };
  preferences: {
    language: string; // ภาษาที่ใช้งาน
    theme: "light" | "dark" | "system" | "sepia"; // ธีม
    notifications: {
      email: boolean; // การแจ้งเตือนทางอีเมล
      push: boolean; // การแจ้งเตือนแบบ push
      novelUpdates: boolean; // การแจ้งเตือนอัพเดตนิยาย
      comments: boolean; // การแจ้งเตือนความคิดเห็น
      donations: boolean; // การแจ้งเตือนบริจาค
      newFollowers: boolean; // การแจ้งเตือนผู้ติดตามใหม่
      systemAnnouncements: boolean; // การแจ้งเตือนระบบ
    };
    contentFilters?: {
      showMatureContent: boolean; // แสดงเนื้อหาสำหรับผู้ใหญ่
      blockedGenres?: Types.ObjectId[]; // หมวดหมู่ที่บล็อก
      blockedTags?: string[]; // แท็กที่บล็อก
    };
    privacy: {
      showActivityStatus: boolean; // แสดงสถานะกิจกรรม
      profileVisibility: "public" | "followersOnly" | "private"; // การมองเห็นโปรไฟล์
      readingHistoryVisibility: "public" | "followersOnly" | "private"; // การมองเห็นประวัติการอ่าน
    };
  };
  wallet: {
    coinBalance: number; // ยอดเหรียญ
    lastCoinTransactionAt?: Date; // วันที่ทำธุรกรรมล่าสุด
  };
  gamification: {
    level: number; // ระดับ
    experiencePoints: number; // คะแนนประสบการณ์
    achievements: Types.ObjectId[]; // ความสำเร็จ
    badges: Types.ObjectId[]; // เหรียญรางวัล
    streaks: {
      currentLoginStreak: number; // สตรีคการล็อกอิน
      longestLoginStreak: number; // สตรีคการล็อกอินนานที่สุด
      lastLoginDate?: Date; // วันที่ล็อกอินล่าสุด
    };
    dailyCheckIn?: {
      lastCheckInDate?: Date; // วันที่เช็คอินล่าสุด
      currentStreak: number; // สตรีคเช็คอิน
    };
  };
  writerVerification?: {
    status: "none" | "pending" | "verified" | "rejected"; // สถานะยืนยันนักเขียน
    submittedAt?: Date; // วันที่ส่งยืนยัน
    verifiedAt?: Date; // วันที่ยืนยัน
    rejectedReason?: string; // เหตุผลที่ปฏิเสธ
    documents?: {
      type: string; // ประเภทเอกสาร
      url: string; // URL เอกสาร
      uploadedAt: Date; // วันที่อัพโหลด
    }[];
  };
  donationSettings?: {
    isDonationEnabled: boolean; // เปิดรับบริจาค
    donationApplicationId?: Types.ObjectId; // ID ใบสมัครบริจาค
    customMessage?: string; // ข้อความบริจาค
  };
  writerApplication?: Types.ObjectId; // ID ใบสมัครนักเขียน
  writerStats?: Types.ObjectId; // ID สถิตินักเขียน
  isEmailVerified: boolean; // ยืนยันอีเมล
  emailVerificationToken?: string; // โทเค็นยืนยันอีเมล
  emailVerificationTokenExpiry?: Date; // วันหมดอายุโทเค็น
  resetPasswordToken?: string; // โทเค็นรีเซ็ตรหัสผ่าน
  resetPasswordTokenExpiry?: Date; // วันหมดอายุโทเค็น
  isActive: boolean; // สถานะใช้งาน
  isBanned: boolean; // สถานะแบน
  banReason?: string; // เหตุผลแบน
  bannedUntil?: Date; // วันที่แบนถึง
  lastLoginAt?: Date; // ล็อกอินล่าสุด
  joinedAt: Date; // วันที่สมัคร
  isDeleted: boolean; // ลบแบบ soft
  deletedAt?: Date; // วันที่ลบ

  // เมธอด
  matchPassword(enteredPassword: string): Promise<boolean>;
  getResetPasswordToken(): string;
  getEmailVerificationToken(): string;
}

// สคีมาผู้ใช้
const UserSchema = new Schema<IUser>(
  {
    _id: { type: Schema.Types.ObjectId, auto: true },
    email: {
      type: String,
      required: [true, "กรุณาระบุอีเมล"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "รูปแบบอีเมลไม่ถูกต้อง"],
      index: true,
    },
    username: {
      type: String,
      required: [true, "กรุณาระบุชื่อผู้ใช้"],
      unique: true,
      trim: true,
      minlength: [3, "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร"],
      maxlength: [30, "ชื่อผู้ใช้ต้องมีไม่เกิน 30 ตัวอักษร"],
      match: [/^[a-zA-Z0-9_\.]+$/, "ชื่อผู้ใช้ต้องประกอบด้วยตัวอักษร, ตัวเลข, _, หรือ . เท่านั้น"],
      index: true,
    },
    password: {
      type: String,
      required: [true, "กรุณาระบุรหัสผ่าน"],
      minlength: [8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"],
      select: false,
    },
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
      lastNovelReadAt: Date,
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
      language: { type: String, default: "th" },
      theme: { type: String, enum: ["light", "dark", "sepia", "system"], default: "system" },
      notifications: {
        _id: false,
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        novelUpdates: { type: Boolean, default: true },
        comments: { type: Boolean, default: true },
        donations: { type: Boolean, default: true },
        newFollowers: { type: Boolean, default: true },
        systemAnnouncements: { type: Boolean, default: true },
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
      coinBalance: { type: Number, default: 0, min: 0 },
      lastCoinTransactionAt: Date,
    },
    gamification: {
      _id: false,
      level: { type: Number, default: 1, min: 1 },
      experiencePoints: { type: Number, default: 0, min: 0 },
      achievements: [{ type: Schema.Types.ObjectId, ref: "UserAchievement" }],
      badges: [{ type: Schema.Types.ObjectId, ref: "Badge" }],
      streaks: {
        _id: false,
        currentLoginStreak: { type: Number, default: 0, min: 0 },
        longestLoginStreak: { type: Number, default: 0, min: 0 },
        lastLoginDate: Date,
      },
      dailyCheckIn: {
        _id: false,
        lastCheckInDate: Date,
        currentStreak: { type: Number, default: 0, min: 0 },
      },
    },
    writerVerification: {
      _id: false,
      status: { type: String, enum: ["none", "pending", "verified", "rejected"], default: "none" },
      submittedAt: Date,
      verifiedAt: Date,
      rejectedReason: String,
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
    lastLoginAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true, index: true },
    isBanned: { type: Boolean, default: false, index: true },
    banReason: String,
    bannedUntil: Date,
    joinedAt: { type: Date, default: Date.now, immutable: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----- Indexes -----
UserSchema.index({ role: 1, "writerVerification.status": 1 });
UserSchema.index({ isActive: 1, isBanned: 1 });
UserSchema.index({ "socialStats.followersCount": -1, role: 1 });
UserSchema.index({ "wallet.coinBalance": -1 });
UserSchema.index({ role: 1, "donationSettings.isDonationEnabled": 1 });
UserSchema.index({ "trackingStats.lastNovelReadAt": -1 });
UserSchema.index({ "trackingStats.totalCoinSpent": -1 });
UserSchema.index({ "trackingStats.totalRealMoneySpent": -1 });
UserSchema.index({ "gamification.level": -1, "gamification.experiencePoints": -1 });
UserSchema.index({ username: "text", "profile.displayName": "text" });

// ----- Middleware: Password Hashing -----
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// ----- Middleware: Update Login Streaks and Total Login Days -----
UserSchema.pre("save", function (next) {
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
        this.gamification.streaks.longestLoginStreak =
          this.gamification.streaks.currentLoginStreak;
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

  // Soft delete handling
  if (this.isModified("isDeleted") && this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  if (this.isModified("isDeleted") && !this.isDeleted) {
    this.deletedAt = undefined;
  }
  next();
});

// ----- Methods -----
UserSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.methods.getResetPasswordToken = function (): string {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.resetPasswordTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 นาที
  return resetToken;
};

UserSchema.methods.getEmailVerificationToken = function (): string {
  const verificationToken = crypto.randomBytes(32).toString("hex");
  this.emailVerificationToken = crypto.createHash("sha256").update(verificationToken).digest("hex");
  this.emailVerificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ชั่วโมง
  return verificationToken;
};

// ----- Virtuals -----
UserSchema.virtual("writtenNovels", {
  ref: "Novel",
  localField: "_id",
  foreignField: "author",
  justOne: false,
});

UserSchema.virtual("userFollowers", {
  ref: "UserFollow",
  localField: "_id",
  foreignField: "following",
  justOne: false,
});

UserSchema.virtual("userFollowing", {
  ref: "UserFollow",
  localField: "_id",
  foreignField: "follower",
  justOne: false,
});

UserSchema.virtual("novelFollows", {
  ref: "NovelFollow",
  localField: "_id",
  foreignField: "user",
  justOne: false,
});

UserSchema.virtual("purchases", {
  ref: "Purchase",
  localField: "_id",
  foreignField: "user",
  justOne: false,
});

UserSchema.virtual("donationsMade", {
  ref: "Donation",
  localField: "_id",
  foreignField: "donorUser",
  justOne: false,
});

UserSchema.virtual("donationsReceived", {
  ref: "Donation",
  localField: "_id",
  foreignField: "recipientUser",
  justOne: false,
});

UserSchema.virtual("userAchievements", {
  ref: "UserAchievement",
  localField: "_id",
  foreignField: "user",
  justOne: false,
  options: { sort: { createdAt: -1 } },
});

UserSchema.virtual("donationApplication", {
  ref: "DonationApplication",
  localField: "_id",
  foreignField: "userId",
  justOne: true,
});

// ----- Model Export -----
const UserModel = () =>
  models.User as mongoose.Model<IUser> || model<IUser>("User", UserSchema);

export default UserModel;