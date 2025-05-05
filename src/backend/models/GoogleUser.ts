// src/backend/models/GoogleUser.ts

// นำเข้าโมดูลที่จำเป็นจาก Mongoose
import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// กำหนด Interface สำหรับ GoogleUser document เพื่อ Type Safety
// หมายเหตุ: โครงสร้างนี้คล้ายกับ IUser แต่ไม่มี password และมี providerId
// และอาจไม่จำเป็นต้องมี isEmailVerified ถ้าเราเชื่อถืออีเมลจาก Google
export interface IGoogleUser extends Document {
  email: string; // อีเมล (ต้องไม่ซ้ำกัน)
  username: string; // ชื่อผู้ใช้ (ควรสร้างขึ้นมาให้ไม่ซ้ำกัน หรือใช้ email เป็นพื้นฐาน)
  providerId: string; // ID ที่ได้จาก Google (ต้องไม่ซ้ำกัน)
  role: "Reader" | "Writer" | "Admin"; // บทบาทของผู้ใช้
  profile: {
    displayName?: string; // ชื่อที่แสดง (จาก Google)
    avatar?: string; // URL รูปโปรไฟล์ (จาก Google)
    bio?: string; // คำอธิบาย (อาจไม่มีจาก Google)
  };
  // ถ้าต้องการให้ข้อมูลเชื่อมโยงกับ User หลัก อาจพิจารณาใช้ User model แทน
  // หรือเก็บ reference ไปยัง User หลัก
  // userId?: Types.ObjectId;
  novels: Types.ObjectId[]; // อาร์เรย์ของ ObjectId ที่อ้างอิงถึง Novel model (ถ้ามี)
  purchases: Types.ObjectId[]; // อาร์เรย์ของ ObjectId ที่อ้างอิงถึง Purchase model (ถ้ามี)
  lastLogin: Date; // วันที่และเวลาล็อกอินล่าสุด
  // createdAt และ updatedAt จะถูกเพิ่มโดย timestamps: true
}

// สร้าง GoogleUser Schema
const GoogleUserSchema = new Schema<IGoogleUser>(
  {
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
      // Username อาจสร้างจาก email หรือส่วนหนึ่งของ email เพื่อให้ unique
      // หรืออาจจะใช้ค่าจาก Google profile ถ้ามีและเหมาะสม
      type: String,
      required: [true, "กรุณาระบุชื่อผู้ใช้"],
      unique: true,
      trim: true,
      minlength: [3, "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร"],
      maxlength: [30, "ชื่อผู้ใช้ต้องมีไม่เกิน 30 ตัวอักษร"],
      index: true,
    },
    providerId: {
      type: String,
      required: [true, "ต้องมี Provider ID"],
      unique: true,
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
      displayName: { type: String, trim: true, maxlength: 50 },
      avatar: {
        type: String,
        trim: true,
        validate: {
          validator: (v: string) => /^https?:\/\/|^\//.test(v),
          message: "รูปแบบ URL ของรูปโปรไฟล์ไม่ถูกต้อง",
        },
      },
      bio: { type: String, trim: true, maxlength: 500 },
    },
    // ถ้าไม่มี Novel หรือ Purchase model ในโปรเจกต์นี้ อาจลบออกได้
    novels: [{
      type: Schema.Types.ObjectId,
      ref: "Novel",
      default: [],
    }],
    purchases: [{
      type: Schema.Types.ObjectId,
      ref: "Purchase",
      default: [],
    }],
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// เพิ่ม index รวมสำหรับ query ที่ใช้บ่อย
// GoogleUserSchema.index({ email: 1, providerId: 1 });

// สร้าง Model จาก Schema
// ใช้ `models.GoogleUser` เพื่อป้องกันการ re-compile model
const GoogleUserModel = () => models.GoogleUser as mongoose.Model<IGoogleUser> || model<IGoogleUser>("GoogleUser", GoogleUserSchema);

export default GoogleUserModel;

// หมายเหตุ: การมี Model แยกสำหรับแต่ละ Provider (GoogleUser, TwitterUser, etc.)
// อาจทำให้การจัดการข้อมูลซับซ้อนขึ้นเมื่อผู้ใช้คนเดียวกันล็อกอินด้วยหลายวิธี
// พิจารณาใช้ User model หลักเพียงอันเดียว แล้วเพิ่มฟิลด์สำหรับ provider และ providerId
// หรือสร้างตารางแยกสำหรับ `Account` ที่เชื่อมโยงกับ `User` (ตามแนวทางของ NextAuth)
// แต่ในที่นี้ เราทำตามโครงสร้างที่ผู้ใช้ให้มาเป็นตัวอย่างก่อน

