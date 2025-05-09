// src/backend/models/User.ts
// User Model - ศูนย์กลางข้อมูลผู้ใช้, การยืนยันตัวตน, สถิติ, และการตั้งค่า
// โมเดลผู้ใช้ - ศูนย์กลางข้อมูลผู้ใช้, การยืนยันตัวตน, สถิติ, และการตั้งค่า
import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Interface สำหรับ Account ที่เชื่อมโยงกับ User (สำหรับ OAuth providers และ credentials)
// อินเทอร์เฟซสำหรับบัญชีที่เชื่อมโยงกับผู้ใช้ (สำหรับผู้ให้บริการ OAuth และข้อมูลประจำตัว)
export interface IAccount {
  provider: string; // เช่น "google", "facebook", "credentials"
  providerAccountId: string; // ID จาก provider (สำหรับ credentials อาจเป็น email หรือ username)
  type: string; // ประเภทของ account เช่น "oauth", "credentials"
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
  idToken?: string;
  sessionState?: string;
  providerData?: Record<string, any>; // ข้อมูลเพิ่มเติมจาก provider
}

// Interface สำหรับ User document
// อินเทอร์เฟซสำหรับเอกสารผู้ใช้
export interface IUser extends Document {
  email?: string; // อีเมล (บังคับถ้า provider เป็น "credentials" หรือถ้า OAuth provider ให้มาและไม่ซ้ำ)
  username: string; // ชื่อผู้ใช้ (บังคับและไม่ซ้ำกัน)
  password?: string; // รหัสผ่าน (hashed) - select: false (เฉพาะ provider "credentials")
  accounts: IAccount[]; // บัญชีที่เชื่อมโยง
  role: "Reader" | "Writer" | "Admin"; // บทบาทของผู้ใช้
  profile: {
    displayName?: string; // ชื่อที่แสดง
    avatar?: string; // URL รูปโปรไฟล์
    bio?: string; // คำอธิบาย
    coverImage?: string; // รูปปกโปรไฟล์
    gender?: "male" | "female" | "other" | "preferNotToSay"; // เพศ
    preferredGenres?: Types.ObjectId[]; // หมวดหมู่นิยายที่ชื่นชอบ (อ้างอิง Category)
  };
  // สถิติการใช้งานและการมีส่วนร่วมของผู้ใช้
  // สถิติการใช้งานและการมีส่วนร่วมของผู้ใช้
  trackingStats: {
    totalLoginDays: number; // จำนวนวันที่เข้าสู่ระบบทั้งหมด (นับจาก ActivityHistory หรือคำนวณ)
    totalNovelsRead: number; // จำนวนนิยายที่อ่านจบหรือเริ่มอ่าน (นับจาก ActivityHistory)
    totalEpisodesRead: number; // จำนวนตอนที่อ่านทั้งหมด (นับจาก ActivityHistory)
    totalCoinSpent: number; // จำนวนเหรียญทั้งหมดที่ใช้จ่าย
    totalRealMoneySpent: number; // จำนวนเงินจริงทั้งหมดที่ใช้จ่าย (ถ้ามีการติดตามแยก)
    lastNovelReadId?: Types.ObjectId; // ID ของนิยายที่อ่านล่าสุด (อ้างอิง Novel)
    lastNovelReadAt?: Date; // วันที่อ่านนิยายล่าสุด
    joinDate: Date; // วันที่สมัครใช้งาน (คือ createdAt)
    // commentHistory จะ query จาก ActivityHistory โดยตรง
  };
  // สถิติเกี่ยวกับผู้ติดตามและการสร้างสรรค์ (ถ้ามี)
  // สถิติเกี่ยวกับผู้ติดตามและการสร้างสรรค์ (ถ้ามี)
  socialStats: {
    followersCount: number; // จำนวนผู้ติดตาม
    followingCount: number; // จำนวนที่กำลังติดตาม
    novelsCreatedCount: number; // จำนวนนิยายที่เขียน (สำหรับ Writer)
    commentsMadeCount: number; // จำนวนความคิดเห็นที่สร้าง
    ratingsGivenCount: number; // จำนวนเรตติ้งที่ให้
    likesGivenCount: number; // จำนวนไลค์ที่ให้
  };
  // การตั้งค่าการแจ้งเตือนและความเป็นส่วนตัว
  // การตั้งค่าการแจ้งเตือนและความเป็นส่วนตัว
  preferences: {
    language: string; // ภาษาที่ต้องการใช้งาน (เช่น "th", "en")
    theme: "light" | "dark" | "system"; // ธีมที่ต้องการใช้งาน
    notifications: {
      email: boolean; // รับการแจ้งเตือนทางอีเมล
      push: boolean; // รับการแจ้งเตือนแบบ push
      novelUpdates: boolean; // รับการแจ้งเตือนเมื่อนิยายที่ติดตามมีการอัพเดต
      comments: boolean; // รับการแจ้งเตือนเมื่อมีคนแสดงความคิดเห็น
      donations: boolean; // รับการแจ้งเตือนเมื่อได้รับการบริจาค
      newFollowers: boolean; // การแจ้งเตือนผู้ติดตามใหม่
      systemAnnouncements: boolean; // การแจ้งเตือนจากระบบ
    };
    privacy: {
      showActivityStatus: boolean; // แสดงสถานะการใช้งาน (เช่น ออนไลน์ล่าสุด)
      profileVisibility: "public" | "followersOnly" | "private"; // การมองเห็นโปรไฟล์
      readingHistoryVisibility: "public" | "followersOnly" | "private"; // การมองเห็นประวัติการอ่าน
    };
  };
  // ข้อมูลเกี่ยวกับกระเป๋าเงินและเหรียญ
  // ข้อมูลเกี่ยวกับกระเป๋าเงินและเหรียญ
  wallet: {
    coinBalance: number; // ยอดเหรียญคงเหลือ
    // currency field removed as system uses COIN only
    lastCoinTransactionAt?: Date; // วันที่ทำธุรกรรมเหรียญล่าสุด
    // paymentMethodIds: Types.ObjectId[]; // อ้างอิง PaymentMethod model (ถ้ามี)
  };
  // ข้อมูลเกี่ยวกับ Gamification
  // ข้อมูลเกี่ยวกับ Gamification
  gamification: {
    level: number; // ระดับของผู้ใช้
    experience: number; // คะแนนประสบการณ์
    achievements: Types.ObjectId[]; // ID ของ UserAchievement ที่ปลดล็อค
    badges: Types.ObjectId[]; // ID ของ Badge ที่ได้รับ (อาจซ้ำซ้อนกับ achievements ถ้า badge คือ achievement)
    streaks: {
      currentLoginStreak: number; // จำนวนวันที่เข้าสู่ระบบติดต่อกัน
      longestLoginStreak: number; // จำนวนวันที่เข้าสู่ระบบติดต่อกันนานที่สุด
      lastLoginDate?: Date; // วันที่เข้าสู่ระบบล่าสุด
    };
  };
  // การยืนยันตัวตนสำหรับนักเขียน
  // การยืนยันตัวตนสำหรับนักเขียน
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
  // การตั้งค่าการรับบริจาค (สำหรับนักเขียน)
  // การตั้งค่าการรับบริจาค (สำหรับนักเขียน)
  donationSettings?: {
    isDonationEnabled: boolean; // สถานะการเปิดรับบริจาค
    donationApplicationId?: Types.ObjectId; // ID ของใบสมัครขอเปิดรับบริจาค (อ้างอิง DonationApplication)
    customMessage?: string; // ข้อความส่วนตัวสำหรับการบริจาค
  };
  isEmailVerified: boolean; // สถานะการยืนยันอีเมล
  emailVerificationToken?: string; // Token สำหรับยืนยันอีเมล (select: false)
  emailVerificationTokenExpiry?: Date; // วันหมดอายุของ Token (select: false)
  resetPasswordToken?: string; // Token สำหรับรีเซ็ตรหัสผ่าน (select: false)
  resetPasswordTokenExpiry?: Date; // วันหมดอายุของ Token รีเซ็ตรหัสผ่าน (select: false)
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

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      unique: true,
      sparse: true,
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
      displayName: { type: String, trim: true, maxlength: [100, "ชื่อที่แสดงต้องไม่เกิน 100 ตัวอักษร"] },
      avatar: { type: String, trim: true, validate: { validator: (v: string) => !v || /^https?:\/\/|^\//.test(v), message: "รูปแบบ URL ของรูปโปรไฟล์ไม่ถูกต้อง" } },
      bio: { type: String, trim: true, maxlength: [500, "คำอธิบายต้องไม่เกิน 500 ตัวอักษร"] },
      coverImage: { type: String, trim: true, validate: { validator: (v: string) => !v || /^https?:\/\/|^\//.test(v), message: "รูปแบบ URL ของรูปปกไม่ถูกต้อง" } },
      gender: { type: String, enum: { values: ["male", "female", "other", "preferNotToSay"], message: "เพศ {VALUE} ไม่ถูกต้อง" } },
      preferredGenres: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    },
    trackingStats: {
      totalLoginDays: { type: Number, default: 0, min: 0 },
      totalNovelsRead: { type: Number, default: 0, min: 0 },
      totalEpisodesRead: { type: Number, default: 0, min: 0 },
      totalCoinSpent: { type: Number, default: 0, min: 0 },
      totalRealMoneySpent: { type: Number, default: 0, min: 0 }, // อาจต้องมีระบบแปลงหน่วยหรือการบันทึกที่ซับซ้อนขึ้น
      lastNovelReadId: { type: Schema.Types.ObjectId, ref: "Novel" },
      lastNovelReadAt: Date,
      joinDate: { type: Date, default: Date.now, immutable: true }, // ตั้งค่าเมื่อสร้างและไม่เปลี่ยน
    },
    socialStats: {
      followersCount: { type: Number, default: 0, min: 0 },
      followingCount: { type: Number, default: 0, min: 0 },
      novelsCreatedCount: { type: Number, default: 0, min: 0 },
      commentsMadeCount: { type: Number, default: 0, min: 0 },
      ratingsGivenCount: { type: Number, default: 0, min: 0 },
      likesGivenCount: { type: Number, default: 0, min: 0 },
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
        newFollowers: { type: Boolean, default: true },
        systemAnnouncements: { type: Boolean, default: true },
      },
      privacy: {
        showActivityStatus: { type: Boolean, default: true },
        profileVisibility: { type: String, enum: ["public", "followersOnly", "private"], default: "public" },
        readingHistoryVisibility: { type: String, enum: ["public", "followersOnly", "private"], default: "followersOnly" },
      },
    },
    wallet: {
      coinBalance: { type: Number, default: 0, min: 0 },
      lastCoinTransactionAt: Date,
    },
    gamification: {
      level: { type: Number, default: 1, min: 1 },
      experience: { type: Number, default: 0, min: 0 },
      achievements: [{ type: Schema.Types.ObjectId, ref: "UserAchievement" }],
      badges: [{ type: Schema.Types.ObjectId, ref: "Badge" }],
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
      isDonationEnabled: { type: Boolean, default: false },
      donationApplicationId: { type: Schema.Types.ObjectId, ref: "DonationApplication" },
      customMessage: { type: String, trim: true, maxlength: [280, "ข้อความบริจาคต้องไม่เกิน 280 ตัวอักษร"] },
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
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----- Indexes -----
UserSchema.index({ "accounts.provider": 1, "accounts.providerAccountId": 1 }, { unique: true, sparse: true });
UserSchema.index({ role: 1, "writerVerification.status": 1 });
UserSchema.index({ isActive: 1, isBanned: 1 });
UserSchema.index({ "socialStats.followersCount": -1, role: 1 });
UserSchema.index({ "wallet.coinBalance": -1 });
UserSchema.index({ role: 1, "donationSettings.isDonationEnabled": 1 });
UserSchema.index({ "trackingStats.lastNovelReadAt": -1 });
UserSchema.index({ "trackingStats.totalCoinSpent": -1 });
UserSchema.index({ "trackingStats.totalRealMoneySpent": -1 });
UserSchema.index({ "gamification.level": -1, "gamification.experience": -1 });

// ----- Middleware: Password Hashing -----
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) {
    return next();
  }
  const credentialsAccount = this.accounts.find((acc) => acc.provider === "credentials");
  if (credentialsAccount || (this.isNew && this.email && this.password)) {
    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
      if (!credentialsAccount && this.email) {
        const existingCredentials = this.accounts.find((acc) => acc.provider === "credentials" && acc.providerAccountId === this.email);
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
UserSchema.pre("save", function (next) {
  if (this.isModified("lastLoginAt")) {
    const now = new Date();
    const lastLogin = this.gamification?.streaks?.lastLoginDate;

    if (this.gamification?.streaks) {
      const todayMidnight = new Date(now).setHours(0, 0, 0, 0);
      const lastLoginMidnight = lastLogin ? new Date(lastLogin).setHours(0, 0, 0, 0) : null;

      if (lastLoginMidnight && lastLoginMidnight !== todayMidnight) {
        // Increment total login days only if it's a new day
        this.trackingStats.totalLoginDays = (this.trackingStats.totalLoginDays || 0) + 1;

        const yesterdayMidnight = new Date(now);
        yesterdayMidnight.setDate(yesterdayMidnight.getDate() - 1);
        const yesterdayMidnightTimestamp = yesterdayMidnight.setHours(0,0,0,0);

        if (lastLoginMidnight === yesterdayMidnightTimestamp) {
          this.gamification.streaks.currentLoginStreak = (this.gamification.streaks.currentLoginStreak || 0) + 1;
        } else {
          this.gamification.streaks.currentLoginStreak = 1; // Reset if not consecutive day
        }
      } else if (!lastLoginMidnight) { // First login ever for this tracking
        this.trackingStats.totalLoginDays = 1;
        this.gamification.streaks.currentLoginStreak = 1;
      }
      // Update longest streak
      if (this.gamification.streaks.currentLoginStreak > (this.gamification.streaks.longestLoginStreak || 0)) {
        this.gamification.streaks.longestLoginStreak = this.gamification.streaks.currentLoginStreak;
      }
      this.gamification.streaks.lastLoginDate = now;
    } else if (this.gamification) { // Should not happen if gamification object is initialized
        this.trackingStats.totalLoginDays = 1;
        this.gamification.streaks = { currentLoginStreak: 1, longestLoginStreak: 1, lastLoginDate: now };
    }
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

// ----- Virtuals (Populated Fields) -----
UserSchema.virtual("writtenNovels", { ref: "Novel", localField: "_id", foreignField: "author" });
UserSchema.virtual("userFollowers", { ref: "UserFollow", localField: "_id", foreignField: "followingUser" });
UserSchema.virtual("userFollowing", { ref: "UserFollow", localField: "_id", foreignField: "followerUser" });
UserSchema.virtual("novelFollows", { ref: "NovelFollow", localField: "_id", foreignField: "user" });
UserSchema.virtual("purchases", { ref: "Purchase", localField: "_id", foreignField: "user" });
UserSchema.virtual("donationsMade", { ref: "Donation", localField: "_id", foreignField: "donorUser" });
UserSchema.virtual("donationsReceived", { ref: "Donation", localField: "_id", foreignField: "recipientUser" });
UserSchema.virtual("userAchievements", { ref: "UserAchievement", localField: "_id", foreignField: "user" });
UserSchema.virtual("donationApplication", { ref: "DonationApplication", localField: "_id", foreignField: "userId", justOne: true });

// ----- Model Export -----
const UserModel = () => models.User as mongoose.Model<IUser> || model<IUser>("User", UserSchema);

export default UserModel;

