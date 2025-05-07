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
    coverImage?: string; // รูปปกโปรไฟล์
    gender?: "male" | "female" | "other" | "preferNotToSay"; // เพศ
    preferredGenres?: Types.ObjectId[]; // หมวดหมู่นิยายที่ชื่นชอบ
  };
  stats: {
    followers: number; // จำนวนผู้ติดตาม
    following: number; // จำนวนที่กำลังติดตาม
    novels: number; // จำนวนนิยายที่เขียน
    purchases: number; // จำนวนการซื้อ
    donationsReceived: number; // จำนวนเงินที่ได้รับจากการบริจาค
    donationsMade: number; // จำนวนเงินที่บริจาคให้ผู้อื่น
    totalEpisodesSold: number; // จำนวนตอนที่ขายได้ทั้งหมด
  };
  preferences: {
    language: string; // ภาษาที่ต้องการใช้งาน
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
    lastTransaction?: Date; // วันที่ทำธุรกรรมล่าสุด
    transactionHistory?: Types.ObjectId[]; // ประวัติการทำธุรกรรม
    paymentMethods?: {
      type: string; // ประเภทวิธีการชำระเงิน (creditCard, promptpay, etc.)
      details: Record<string, any>; // รายละเอียดเพิ่มเติม (ขึ้นอยู่กับประเภท)
      isDefault: boolean; // เป็นวิธีการชำระเงินเริ่มต้นหรือไม่
    }[];
  };
  gamification: {
    level: number; // ระดับของผู้ใช้
    experience: number; // คะแนนประสบการณ์
    achievements: { // ความสำเร็จที่ได้รับ
      id: string; // รหัสความสำเร็จ
      name: string; // ชื่อความสำเร็จ
      unlockedAt: Date; // วันที่ปลดล็อค
    }[];
    badges: Types.ObjectId[]; // แบดจ์ที่ได้รับ
    streaks: {
      currentLoginStreak: number; // จำนวนวันที่เข้าสู่ระบบติดต่อกัน
      longestLoginStreak: number; // จำนวนวันที่เข้าสู่ระบบติดต่อกันนานที่สุด
      lastLoginDate: Date; // วันที่เข้าสู่ระบบล่าสุด
    };
  };
  writerVerification?: {
    status: "pending" | "verified" | "rejected"; // สถานะการยืนยันตัวตน
    submittedAt: Date; // วันที่ส่งเอกสารยืนยัน
    verifiedAt?: Date; // วันที่ได้รับการยืนยัน
    rejectedReason?: string; // เหตุผลที่ถูกปฏิเสธ
    documents: { // เอกสารยืนยันตัวตน
      type: string; // ประเภทเอกสาร
      url: string; // URL ของเอกสาร
      uploadedAt: Date; // วันที่อัพโหลด
    }[];
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
      index: true, // เพิ่ม index เพื่อเพิ่มประสิทธิภาพการค้นหาตามบทบาท
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
      gender: {
        type: String,
        enum: {
          values: ["male", "female", "other", "preferNotToSay"],
          message: "เพศ {VALUE} ไม่ถูกต้อง",
        },
      },
      preferredGenres: [{
        type: Schema.Types.ObjectId,
        ref: "Category",
      }],
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
      donationsReceived: {
        type: Number,
        default: 0,
        min: [0, "จำนวนเงินที่ได้รับจากการบริจาคไม่สามารถติดลบได้"]
      },
      donationsMade: {
        type: Number,
        default: 0,
        min: [0, "จำนวนเงินที่บริจาคไม่สามารถติดลบได้"]
      },
      totalEpisodesSold: {
        type: Number,
        default: 0,
        min: [0, "จำนวนตอนที่ขายได้ไม่สามารถติดลบได้"]
      }
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
        novelUpdates: {
          type: Boolean,
          default: true
        },
        comments: {
          type: Boolean,
          default: true
        },
        donations: {
          type: Boolean,
          default: true
        }
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
      transactionHistory: [{
        type: Schema.Types.ObjectId,
        ref: "Transaction"
      }],
      paymentMethods: [{
        type: {
          type: String,
          required: [true, "กรุณาระบุประเภทวิธีการชำระเงิน"]
        },
        details: {
          type: Schema.Types.Mixed,
          required: [true, "กรุณาระบุรายละเอียดวิธีการชำระเงิน"]
        },
        isDefault: {
          type: Boolean,
          default: false
        }
      }]
    },
    gamification: {
      level: {
        type: Number,
        default: 1,
        min: [1, "ระดับต้องไม่น้อยกว่า 1"]
      },
      experience: {
        type: Number,
        default: 0,
        min: [0, "ค่าประสบการณ์ไม่สามารถติดลบได้"]
      },
      achievements: [{
        id: {
          type: String,
          required: true
        },
        name: {
          type: String,
          required: true
        },
        unlockedAt: {
          type: Date,
          default: Date.now
        }
      }],
      badges: [{
        type: Schema.Types.ObjectId,
        ref: "Badge"
      }],
      streaks: {
        currentLoginStreak: {
          type: Number,
          default: 0,
          min: 0
        },
        longestLoginStreak: {
          type: Number,
          default: 0,
          min: 0
        },
        lastLoginDate: {
          type: Date,
          default: Date.now
        }
      }
    },
    writerVerification: {
      status: {
        type: String,
        enum: {
          values: ["pending", "verified", "rejected"],
          message: "สถานะการยืนยัน {VALUE} ไม่ถูกต้อง"
        },
        default: "pending"
      },
      submittedAt: {
        type: Date,
        default: Date.now
      },
      verifiedAt: Date,
      rejectedReason: String,
      documents: [{
        type: {
          type: String,
          required: [true, "กรุณาระบุประเภทเอกสาร"]
        },
        url: {
          type: String,
          required: [true, "กรุณาระบุ URL ของเอกสาร"],
          validate: {
            validator: (v: string) => /^https?:\/\/|^\//.test(v),
            message: "รูปแบบ URL ของเอกสารไม่ถูกต้อง",
          }
        },
        uploadedAt: {
          type: Date,
          default: Date.now
        }
      }]
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true, // เพิ่ม index เพื่อเพิ่มประสิทธิภาพการค้นหาผู้ใช้ที่ยังใช้งานอยู่
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

// เพิ่ม Compound Index สำหรับการค้นหาผู้ใช้ที่เป็นนักเขียนที่ยืนยันแล้ว
SocialMediaUserSchema.index({ role: 1, "writerVerification.status": 1 });

// เพิ่ม Index สำหรับการค้นหาตามความนิยม (ผู้ติดตามจำนวนมาก)
SocialMediaUserSchema.index({ "stats.followers": -1 });

// Middleware: อัพเดต streaks เมื่อมีการอัพเดต lastLogin
SocialMediaUserSchema.pre("save", function (next) {
  if (this.isModified("lastLogin")) {
    const now = new Date();
    const lastLogin = this.get("gamification.streaks.lastLoginDate");
    
    // ตรวจสอบว่าเข้าสู่ระบบวันถัดไปหรือไม่
    if (lastLogin) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // เช็คว่าเข้าสู่ระบบเมื่อวาน
      if (lastLogin.setHours(0, 0, 0, 0) === yesterday.setHours(0, 0, 0, 0)) {
        // เพิ่ม streak
        this.set("gamification.streaks.currentLoginStreak", this.get("gamification.streaks.currentLoginStreak") + 1);
        
        // อัพเดต longest streak ถ้าจำเป็น
        if (this.get("gamification.streaks.currentLoginStreak") > this.get("gamification.streaks.longestLoginStreak")) {
          this.set("gamification.streaks.longestLoginStreak", this.get("gamification.streaks.currentLoginStreak"));
        }
      } 
      // ถ้าไม่ได้เข้าสู่ระบบเมื่อวาน แต่เป็นวันเดียวกัน ไม่ต้องทำอะไร
      else if (lastLogin.setHours(0, 0, 0, 0) !== now.setHours(0, 0, 0, 0)) {
        // รีเซ็ต streak
        this.set("gamification.streaks.currentLoginStreak", 1);
      }
    }
    
    // อัพเดตวันที่เข้าสู่ระบบล่าสุด
    this.set("gamification.streaks.lastLoginDate", now);
  }
  
  next();
});

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

SocialMediaUserSchema.virtual("followedWriters", {
  ref: "UserFollow",
  localField: "_id",
  foreignField: "follower",
  justOne: false,
});

SocialMediaUserSchema.virtual("followers", {
  ref: "UserFollow",
  localField: "_id",
  foreignField: "following",
  justOne: false,
});

SocialMediaUserSchema.virtual("purchasedEpisodes", {
  ref: "Purchase",
  localField: "_id",
  foreignField: "user",
  justOne: false,
});

SocialMediaUserSchema.virtual("donations", {
  ref: "Donation",
  localField: "_id",
  foreignField: "donor",
  justOne: false,
});

SocialMediaUserSchema.virtual("receivedDonations", {
  ref: "Donation",
  localField: "_id",
  foreignField: "recipient",
  justOne: false,
});

// สร้าง Model Factory Function
const SocialMediaUserModel = () =>
  models.SocialMediaUser as mongoose.Model<ISocialMediaUser> ||
  model<ISocialMediaUser>("SocialMediaUser", SocialMediaUserSchema);

// Export Model
export default SocialMediaUserModel;