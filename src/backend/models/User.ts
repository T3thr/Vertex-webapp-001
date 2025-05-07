// src/backend/models/User.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Interface สำหรับ Account ที่เชื่อมโยงกับ User (สำหรับ OAuth providers)
export interface IAccount {
  provider: string; // เช่น "google", "facebook", "credentials"
  providerAccountId: string; // ID จาก provider
  type: string; // ประเภทของ account เช่น "oauth", "email"
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
  idToken?: string;
  sessionState?: string;
  // สามารถเพิ่มข้อมูลเฉพาะ provider ได้ตามต้องการ
  providerData?: Record<string, any>; // ข้อมูลเพิ่มเติมจาก provider
}

// Interface สำหรับ User document (รวม credentials และ OAuth)
export interface IUser extends Document {
  email?: string; // อีเมล (บังคับถ้า provider เป็น "credentials" หรือถ้า OAuth provider ให้มา)
  username: string; // ชื่อผู้ใช้ (บังคับและไม่ซ้ำกัน)
  password?: string; // รหัสผ่าน (hashed) - select: false (เฉพาะ provider "credentials")
  accounts: IAccount[]; // บัญชีที่เชื่อมโยง (credentials, google, facebook etc.)
  role: "Reader" | "Writer" | "Admin"; // บทบาทของผู้ใช้
  profile: {
    displayName?: string; // ชื่อที่แสดง (อาจมาจาก OAuth หรือผู้ใช้ตั้งเอง)
    avatar?: string; // URL รูปโปรไฟล์
    bio?: string; // คำอธิบาย
    coverImage?: string; // รูปปกโปรไฟล์
    gender?: "male" | "female" | "other" | "preferNotToSay"; // เพศ
    preferredGenres?: Types.ObjectId[]; // หมวดหมู่นิยายที่ชื่นชอบ (อ้างอิง Category)
  };
  stats: {
    followersCount: number; // จำนวนผู้ติดตาม
    followingCount: number; // จำนวนที่กำลังติดตาม
    novelsCount: number; // จำนวนนิยายที่เขียน
    purchasesCount: number; // จำนวนการซื้อ
    donationsReceivedAmount: number; // จำนวนเงินที่ได้รับจากการบริจาค
    donationsMadeAmount: number; // จำนวนเงินที่บริจาคให้ผู้อื่น
    totalEpisodesSoldCount: number; // จำนวนตอนที่ขายได้ทั้งหมด
  };
  preferences: {
    language: string; // ภาษาที่ต้องการใช้งาน (เช่น "th", "en")
    theme: "light" | "dark" | "system"; // ธีมที่ต้องการใช้งาน
    notifications: {
      email: boolean; // รับการแจ้งเตือนทางอีเมล
      push: boolean; // รับการแจ้งเตือนแบบ push
      novelUpdates: boolean; // รับการแจ้งเตือนเมื่อนิยายที่ติดตามมีการอัพเดต
      comments: boolean; // รับการแจ้งเตือนเมื่อมีคนแสดงความคิดเห็น
      donations: boolean; // รับการแจ้งเตือนเมื่อได้รับการบริจาค
    };
  };
  wallet: {
    balance: number; // ยอดเงินคงเหลือ
    currency: string; // สกุลเงิน (THB, USD, etc.)
    lastTransactionAt?: Date; // วันที่ทำธุรกรรมล่าสุด
    // transactionHistory อาจจะแยกเป็น collection ใหม่ถ้ามีจำนวนมาก หรือเก็บ ObjectId อ้างอิง
    // paymentMethods อาจจะแยกเป็น collection ใหม่เพื่อความปลอดภัยและการจัดการที่ดีขึ้น
  };
  gamification: {
    level: number; // ระดับของผู้ใช้
    experience: number; // คะแนนประสบการณ์
    // achievements ควรเป็น Array of ObjectId อ้างอิงไปยัง UserAchievement model
    // badges ควรเป็น Array of ObjectId อ้างอิงไปยัง Badge model (ถ้ามี)
    streaks: {
      currentLoginStreak: number; // จำนวนวันที่เข้าสู่ระบบติดต่อกัน
      longestLoginStreak: number; // จำนวนวันที่เข้าสู่ระบบติดต่อกันนานที่สุด
      lastLoginDate?: Date; // วันที่เข้าสู่ระบบล่าสุด
    };
  };
  writerVerification?: {
    status: "none" | "pending" | "verified" | "rejected"; // สถานะการยืนยันตัวตน
    submittedAt?: Date; // วันที่ส่งเอกสารยืนยัน
    verifiedAt?: Date; // วันที่ได้รับการยืนยัน
    rejectedReason?: string; // เหตุผลที่ถูกปฏิเสธ
    documents?: { // เอกสารยืนยันตัวตน
      type: string; // ประเภทเอกสาร
      url: string; // URL ของเอกสาร
      uploadedAt: Date; // วันที่อัพโหลด
    }[];
  };
  isEmailVerified: boolean; // สถานะการยืนยันอีเมล
  emailVerificationToken?: string; // Token สำหรับยืนยันอีเมล
  emailVerificationTokenExpiry?: Date; // วันหมดอายุของ Token
  resetPasswordToken?: string; // Token สำหรับรีเซ็ตรหัสผ่าน
  resetPasswordTokenExpiry?: Date; // วันหมดอายุของ Token รีเซ็ตรหัสผ่าน
  lastLoginAt?: Date; // วันที่เข้าสู่ระบบล่าสุด
  isActive: boolean; // สถานะการใช้งาน (active/inactive)
  isBanned: boolean; // สถานะการถูกแบน
  bannedReason?: string; // เหตุผลที่ถูกแบน
  bannedUntil?: Date; // วันที่ถูกแบนจนถึง (ถ้ามี)
  createdAt: Date;
  updatedAt: Date;

  // Methods
  matchPassword(enteredPassword: string): Promise<boolean>;
  getResetPasswordToken(): string;
  getEmailVerificationToken(): string;
}

const AccountSchema = new Schema<IAccount>({
  provider: { type: String, required: true },
  providerAccountId: { type: String, required: true },
  type: { type: String, required: true },
  accessToken: String,
  refreshToken: String,
  expiresAt: Number,
  tokenType: String,
  scope: String,
  idToken: String,
  sessionState: String,
  providerData: Schema.Types.Mixed,
}, { _id: false });

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      unique: true,
      sparse: true, // อนุญาตให้มีหลาย document ที่มีค่า null/undefined สำหรับ email (สำคัญสำหรับ OAuth ที่อาจไม่มี email)
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
      match: [/^[a-zA-Z0-9_]+$/, "ชื่อผู้ใช้ต้องประกอบด้วยตัวอักษร, ตัวเลข หรือเครื่องหมาย _ เท่านั้น"],
      index: true,
    },
    password: {
      type: String,
      minlength: [8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"],
      select: false, // ไม่ดึงรหัสผ่านออกมาโดย default
    },
    accounts: [AccountSchema], // Array of accounts for different providers
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
      displayName: { type: String, trim: true, maxlength: [100, "ชื่อที่แสดงต้องไม่เกิน 100 ตัวอักษร"] },
      avatar: { type: String, trim: true, validate: { validator: (v: string) => !v || /^https?:\/\/|^\//.test(v), message: "รูปแบบ URL ของรูปโปรไฟล์ไม่ถูกต้อง" } },
      bio: { type: String, trim: true, maxlength: [500, "คำอธิบายต้องไม่เกิน 500 ตัวอักษร"] },
      coverImage: { type: String, trim: true, validate: { validator: (v: string) => !v || /^https?:\/\/|^\//.test(v), message: "รูปแบบ URL ของรูปปกไม่ถูกต้อง" } },
      gender: { type: String, enum: { values: ["male", "female", "other", "preferNotToSay"], message: "เพศ {VALUE} ไม่ถูกต้อง" } },
      preferredGenres: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    },
    stats: {
      followersCount: { type: Number, default: 0, min: 0 },
      followingCount: { type: Number, default: 0, min: 0 },
      novelsCount: { type: Number, default: 0, min: 0 },
      purchasesCount: { type: Number, default: 0, min: 0 },
      donationsReceivedAmount: { type: Number, default: 0, min: 0 },
      donationsMadeAmount: { type: Number, default: 0, min: 0 },
      totalEpisodesSoldCount: { type: Number, default: 0, min: 0 },
    },
    preferences: {
      language: { type: String, default: "th" },
      theme: { type: String, enum: ["light", "dark", "system"], default: "system" },
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        novelUpdates: { type: Boolean, default: true },
        comments: { type: Boolean, default: true },
        donations: { type: Boolean, default: true },
      },
    },
    wallet: {
      balance: { type: Number, default: 0, min: 0 },
      currency: { type: String, default: "THB" },
      lastTransactionAt: Date,
    },
    gamification: {
      level: { type: Number, default: 1, min: 1 },
      experience: { type: Number, default: 0, min: 0 },
      streaks: {
        currentLoginStreak: { type: Number, default: 0, min: 0 },
        longestLoginStreak: { type: Number, default: 0, min: 0 },
        lastLoginDate: Date,
      },
    },
    writerVerification: {
      status: { type: String, enum: ["none", "pending", "verified", "rejected"], default: "none" },
      submittedAt: Date,
      verifiedAt: Date,
      rejectedReason: String,
      documents: [{
        _id: false,
        type: { type: String, required: true },
        url: { type: String, required: true, validate: { validator: (v: string) => /^https?:\/\/|^\//.test(v), message: "รูปแบบ URL ของเอกสารไม่ถูกต้อง" } },
        uploadedAt: { type: Date, default: Date.now },
      }],
    },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationTokenExpiry: { type: Date, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordTokenExpiry: { type: Date, select: false },
    lastLoginAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true, index: true },
    isBanned: { type: Boolean, default: false, index: true },
    bannedReason: String,
    bannedUntil: Date,
  },
  {
    timestamps: true, // เพิ่ม createdAt และ updatedAt โดยอัตโนมัติ
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----- Indexes -----
// Index for OAuth provider lookups (critical for NextAuth)
UserSchema.index({ "accounts.provider": 1, "accounts.providerAccountId": 1 }, { unique: true, sparse: true });
// Index for writer verification status
UserSchema.index({ role: 1, "writerVerification.status": 1 });
// Index for user activity and status
UserSchema.index({ isActive: 1, isBanned: 1 });
// Index for popular writers (example)
UserSchema.index({ "stats.followersCount": -1, role: 1 });

// ----- Middleware: Password Hashing -----
UserSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new) AND it exists
  if (!this.isModified("password") || !this.password) {
    return next();
  }
  // Hash password only if the primary account is 'credentials' or if password is being set directly
  const credentialsAccount = this.accounts.find(acc => acc.provider === "credentials");
  if (credentialsAccount || this.isNew) { // Allow password for new users even if no explicit credentials account yet
    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
      // Ensure credentials account exists if password is set
      if (!credentialsAccount && this.email) {
          const existingCredentials = this.accounts.find(acc => acc.provider === "credentials" && acc.providerAccountId === this.email);
          if (!existingCredentials) {
            this.accounts.push({
                provider: "credentials",
                providerAccountId: this.email, // Use email as providerAccountId for credentials
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

// ----- Middleware: Update Login Streaks -----
UserSchema.pre("save", function (next) {
  if (this.isModified("lastLoginAt")) {
    const now = new Date();
    const lastLogin = this.gamification?.streaks?.lastLoginDate;

    if (lastLogin && this.gamification?.streaks) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastLogin.setHours(0, 0, 0, 0) === yesterday.setHours(0, 0, 0, 0)) {
        this.gamification.streaks.currentLoginStreak = (this.gamification.streaks.currentLoginStreak || 0) + 1;
        if (this.gamification.streaks.currentLoginStreak > (this.gamification.streaks.longestLoginStreak || 0)) {
          this.gamification.streaks.longestLoginStreak = this.gamification.streaks.currentLoginStreak;
        }
      } else if (lastLogin.setHours(0, 0, 0, 0) !== now.setHours(0, 0, 0, 0)) {
        this.gamification.streaks.currentLoginStreak = 1; // Reset if not consecutive day and not same day
      }
    } else if (this.gamification?.streaks) {
      this.gamification.streaks.currentLoginStreak = 1; // First login
      this.gamification.streaks.longestLoginStreak = 1;
    }
    if (this.gamification?.streaks) {
        this.gamification.streaks.lastLoginDate = now;
    }
  }
  next();
});

// ----- Methods -----
UserSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
  if (!this.password) return false; // No password set (e.g. OAuth only user)
  return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.methods.getResetPasswordToken = function (): string {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.resetPasswordTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  return resetToken;
};

UserSchema.methods.getEmailVerificationToken = function (): string {
  const verificationToken = crypto.randomBytes(32).toString("hex");
  this.emailVerificationToken = crypto.createHash("sha256").update(verificationToken).digest("hex");
  this.emailVerificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return verificationToken;
};

// ----- Virtuals (Populated Fields) -----
// Consider if these are always needed or if specific queries are better.
// Virtuals add overhead if not used carefully.
UserSchema.virtual("writtenNovels", { ref: "Novel", localField: "_id", foreignField: "author" });
UserSchema.virtual("userFollowers", { ref: "UserFollow", localField: "_id", foreignField: "followingUser" });
UserSchema.virtual("userFollowing", { ref: "UserFollow", localField: "_id", foreignField: "followerUser" });
UserSchema.virtual("novelFollows", { ref: "NovelFollow", localField: "_id", foreignField: "user" });
UserSchema.virtual("purchases", { ref: "Purchase", localField: "_id", foreignField: "user" });
UserSchema.virtual("donationsMade", { ref: "Donation", localField: "_id", foreignField: "donor" });
UserSchema.virtual("donationsReceived", { ref: "Donation", localField: "_id", foreignField: "recipientUser" }); // Assuming Donation model has recipientUser
UserSchema.virtual("achievements", { ref: "UserAchievement", localField: "_id", foreignField: "user" });

// ----- Model Export -----
// This pattern ensures the model is not recompiled by Next.js in dev mode
const UserModel = () => models.User as mongoose.Model<IUser> || model<IUser>("User", UserSchema);

export default UserModel;

