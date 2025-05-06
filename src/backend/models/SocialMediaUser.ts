// src/backend/models/SocialMediaUser.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface สำหรับ SocialMediaUser document (เฉพาะ OAuth)
export interface ISocialMediaUser extends Document {
  _id: Types.ObjectId;
  provider: string; // Provider ที่ใช้ login (e.g., 'google', 'twitter')
  providerAccountId: string; // ID จาก provider
  email?: string; // อีเมล (optional, sparse, unique)
  username: string; // ชื่อผู้ใช้ (ต้องไม่ซ้ำกัน)
  role: "Reader" | "Writer" | "Admin"; // บทบาทของผู้ใช้
  profile: {
    displayName?: string; // ชื่อที่แสดง (จาก provider)
    avatar?: string; // URL รูปโปรไฟล์ (จาก provider)
    bio?: string; // คำอธิบาย (อาจไม่มี)
    coverImage?: string; // รูปปกโปรไฟล์ (เพิ่มจาก User.ts)
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
  isActive: boolean; // สถานะการใช้งาน
  bannedUntil?: Date; // วันที่ถูกแบนจนถึง (ถ้ามี)
  lastLogin: Date; // วันที่เข้าสู่ระบบล่าสุด
}

// สร้าง SocialMediaUser Schema (เฉพาะ OAuth)
const SocialMediaUserSchema = new Schema<ISocialMediaUser>(
  {
    provider: {
      type: String,
      required: [true, "กรุณาระบุ Provider"],
      index: true,
    },
    providerAccountId: {
      type: String,
      required: [true, "กรุณาระบุ Provider Account ID"],
      index: true,
    },
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
      required: [true, "กรุณาระบุชื่อผู้ใช้"],
      unique: true,
      trim: true,
      minlength: [3, "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร"],
      maxlength: [30, "ชื่อผู้ใช้ต้องมีไม่เกิน 30 ตัวอักษร"],
      match: [/^[a-zA-Z0-9_]+$/, "ชื่อผู้ใช้ต้องประกอบด้วยตัวอักษร, ตัวเลข หรือเครื่องหมาย _ เท่านั้น"],
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
      _id: false,
      displayName: {
        type: String,
        trim: true,
        maxlength: [100, "ชื่อที่แสดงต้องไม่เกิน 100 ตัวอักษร"],
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
        maxlength: [500, "คำอธิบายต้องไม่เกิน 500 ตัวอักษร"],
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
        default: 0,
        min: [0, "จำนวนผู้ติดตามไม่สามารถติดลบได้"],
      },
      following: {
        type: Number,
        default: 0,
        min: [0, "จำนวนที่กำลังติดตามไม่สามารถติดลบได้"],
      },
      novels: {
        type: Number,
        default: 0,
        min: [0, "จำนวนนิยายไม่สามารถติดลบได้"],
      },
      purchases: {
        type: Number,
        default: 0,
        min: [0, "จำนวนการซื้อไม่สามารถติดลบได้"],
      },
    },
    preferences: {
      language: {
        type: String,
        default: "th",
      },
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
      },
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        push: {
          type: Boolean,
          default: true,
        },
      },
    },
    wallet: {
      balance: {
        type: Number,
        default: 0,
        min: [0, "ยอดเงินไม่สามารถติดลบได้"],
      },
      currency: {
        type: String,
        default: "THB",
      },
      lastTransaction: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    bannedUntil: {
      type: Date,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// เพิ่ม Compound Index สำหรับ OAuth
SocialMediaUserSchema.index({ provider: 1, providerAccountId: 1 });

// Virtual: สร้าง virtual fields สำหรับ populate
SocialMediaUserSchema.virtual("writtenNovels", {
  ref: "Novel",
  localField: "_id",
  foreignField: "author",
  justOne: false,
});

SocialMediaUserSchema.virtual("followedNovels", {
  ref: "NovelFollow",
  localField: "_id",
  foreignField: "user",
  justOne: false,
});

SocialMediaUserSchema.virtual("purchasedEpisodes", {
  ref: "Purchase",
  localField: "_id",
  foreignField: "user",
  justOne: false,
});

// สร้าง Model Factory Function
const SocialMediaUserModel = () =>
  models.SocialMediaUser as mongoose.Model<ISocialMediaUser> ||
  model<ISocialMediaUser>("SocialMediaUser", SocialMediaUserSchema);

// Export Model
export default SocialMediaUserModel;