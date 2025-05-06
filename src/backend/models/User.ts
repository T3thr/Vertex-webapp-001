// src/backend/models/User.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Interface สำหรับ User document
export interface IUser extends Document {
  email?: string; // อีเมล (บังคับสำหรับ credentials, optional สำหรับ OAuth)
  username: string; // ชื่อผู้ใช้ (บังคับและไม่ซ้ำกัน)
  password?: string; // รหัสผ่าน (hashed) - select: false
  provider?: string; // Provider สำหรับ OAuth (e.g., 'google', 'twitter')
  providerAccountId?: string; // ID จาก provider สำหรับ OAuth
  role: "Reader" | "Writer" | "Admin"; // บทบาทของผู้ใช้
  profile: {
    displayName?: string; // ชื่อที่แสดง
    avatar?: string; // URL รูปโปรไฟล์
    bio?: string; // คำอธิบาย
    coverImage?: string; // รูปปกโปรไฟล์
  };
  stats: {
    followers: number; // จำนวนผู้ติดตาม
    following: number; // จำนวนที่กำลังติดตาม
    novels: number; // จำนวนนิยายที่เขียน
    purchases: number; // จำนวนการซื้อ
  };
  preferences: {
    language: string; // ภาษาที่ต้องการใช้งาน
    theme: "light" | "dark" | "system"; // ธีมที่ต้องการใช้งาน
    notifications: {
      email: boolean; // รับการแจ้งเตือนทางอีเมล
      push: boolean; // รับการแจ้งเตือนแบบ push
    };
  };
  wallet: {
    balance: number; // ยอดเงินคงเหลือ
    currency: string; // สกุลเงิน (THB, USD, etc.)
    lastTransaction?: Date; // วันที่ทำธุรกรรมล่าสุด
  };
  isEmailVerified: boolean; // สถานะการยืนยันอีเมล
  emailVerificationToken?: string; // Token สำหรับยืนยันอีเมล
  emailVerificationTokenExpiry?: Date; // วันหมดอายุของ Token
  resetPasswordToken?: string; // Token สำหรับรีเซ็ตรหัสผ่าน
  resetPasswordTokenExpiry?: Date; // วันหมดอายุของ Token รีเซ็ตรหัสผ่าน
  lastLogin: Date; // วันที่เข้าสู่ระบบล่าสุด
  isActive: boolean; // สถานะการใช้งาน
  bannedUntil?: Date; // วันที่ถูกแบนจนถึง (ถ้ามี)
  
  // Methods
  matchPassword(enteredPassword: string): Promise<boolean>;
  getResetPasswordToken(): string;
  getEmailVerificationToken(): string;
}

// สร้าง Schema สำหรับ User
const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      unique: true,
      sparse: true, // อนุญาตให้มีหลาย document ที่มีค่า null
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
    provider: {
      type: String,
      index: true,
    },
    providerAccountId: {
      type: String,
      index: true,
    },
    role: {
      type: String,
      enum: {
        values: ["Reader", "Writer", "Admin"],
        message: "บทบาท {VALUE} ไม่ถูกต้อง",
      },
      default: "Reader",
    },
    profile: {
      displayName: { 
        type: String, 
        trim: true, 
        maxlength: [100, "ชื่อที่แสดงต้องไม่เกิน 100 ตัวอักษร"] 
      },
      avatar: {
        type: String,
        trim: true,
        validate: {
          validator: (v: string) => !v || /^https?:\/\/|^\//.test(v),
          message: "รูปแบบ URL ของรูปโปรไฟล์ไม่ถูกต้อง",
        },
      },
      bio: { 
        type: String, 
        trim: true, 
        maxlength: [500, "คำอธิบายต้องไม่เกิน 500 ตัวอักษร"] 
      },
      coverImage: {
        type: String,
        trim: true,
        validate: {
          validator: (v: string) => !v || /^https?:\/\/|^\//.test(v),
          message: "รูปแบบ URL ของรูปปกไม่ถูกต้อง",
        },
      },
    },
    stats: {
      followers: { 
        type: Number, 
        default: 0 
      },
      following: { 
        type: Number, 
        default: 0 
      },
      novels: { 
        type: Number, 
        default: 0 
      },
      purchases: { 
        type: Number, 
        default: 0 
      },
    },
    preferences: {
      language: { 
        type: String, 
        default: "th" 
      },
      theme: { 
        type: String, 
        enum: ["light", "dark", "system"], 
        default: "system" 
      },
      notifications: {
        email: { 
          type: Boolean, 
          default: true 
        },
        push: { 
          type: Boolean, 
          default: true 
        },
      },
    },
    wallet: {
      balance: { 
        type: Number, 
        default: 0,
        min: [0, "ยอดเงินไม่สามารถติดลบได้"] 
      },
      currency: { 
        type: String, 
        default: "THB" 
      },
      lastTransaction: Date,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationTokenExpiry: {
      type: Date,
      select: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordTokenExpiry: {
      type: Date,
      select: false,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    bannedUntil: {
      type: Date,
    },
  },
  {
    timestamps: true, // เพิ่ม createdAt และ updatedAt โดยอัตโนมัติ
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// เพิ่ม Compound Index สำหรับ OAuth
UserSchema.index({ provider: 1, providerAccountId: 1 });

// Middleware: เข้ารหัสรหัสผ่านก่อนบันทึก
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

// Method: ตรวจสอบรหัสผ่าน
UserSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method: สร้าง Reset Password Token
UserSchema.methods.getResetPasswordToken = function (): string {
  // สร้าง token
  const resetToken = crypto.randomBytes(32).toString("hex");
  
  // เข้ารหัส token และเก็บในฐานข้อมูล
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
    
  // กำหนดเวลาหมดอายุ (30 นาที)
  this.resetPasswordTokenExpiry = new Date(Date.now() + 30 * 60 * 1000);
  
  return resetToken;
};

// Method: สร้าง Email Verification Token
UserSchema.methods.getEmailVerificationToken = function (): string {
  // สร้าง token
  const verificationToken = crypto.randomBytes(32).toString("hex");
  
  // เข้ารหัส token และเก็บในฐานข้อมูล
  this.emailVerificationToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");
    
  // กำหนดเวลาหมดอายุ (24 ชั่วโมง)
  this.emailVerificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  return verificationToken;
};

// Virtual: สร้าง virtual fields สำหรับ populate
UserSchema.virtual("writtenNovels", {
  ref: "Novel",
  localField: "_id",
  foreignField: "author",
  justOne: false,
});

UserSchema.virtual("followedNovels", {
  ref: "NovelFollow",
  localField: "_id",
  foreignField: "user",
  justOne: false,
});

UserSchema.virtual("purchasedEpisodes", {
  ref: "Purchase",
  localField: "_id",
  foreignField: "user",
  justOne: false,
});

// สร้างและส่งออก Model Factory Function
// หมายเหตุ: ต้องนำเข้า model นี้ก่อน NovelModel หากมีการ populate author
const UserModel = () => 
  models.User as mongoose.Model<IUser> || model<IUser>("User", UserSchema);

export default UserModel;