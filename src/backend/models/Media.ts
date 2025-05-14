// src/models/Media.ts
// โมเดลสื่อ (Media Model) - จัดการไฟล์สื่อที่ผู้ใช้อัปโหลด (รูปภาพ, เสียง, GIF)
// ออกแบบให้รองรับการจัดเก็บข้อมูลไฟล์, การเชื่อมโยงกับผู้ใช้และนิยาย, และการจัดการสิทธิ์

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// อินเทอร์เฟซสำหรับข้อมูลจำเพาะของไฟล์สื่อ
export interface IMediaDetails {
  filename: string; // ชื่อไฟล์เดิม
  filetype: string; // MIME type (เช่น "image/jpeg", "audio/mpeg")
  filesizeBytes: number; // ขนาดไฟล์ (bytes)
  // สำหรับรูปภาพ
  width?: number; // ความกว้าง (pixels)
  height?: number; // ความสูง (pixels)
  // สำหรับเสียง/วิดีโอ
  durationSeconds?: number; // ความยาว (วินาที)
  // อาจมี metadata เพิ่มเติม เช่น EXIF สำหรับรูปภาพ
}

// อินเทอร์เฟซหลักสำหรับเอกสารสื่อ (Media Document)
export interface IMedia extends Document {
  _id: Types.ObjectId;
  uploader: Types.ObjectId; // ผู้ใช้อัปโหลด (อ้างอิง User model)
  novel?: Types.ObjectId; // นิยายที่เกี่ยวข้อง (ถ้าสื่อนี้ใช้เฉพาะในนิยายเรื่องใดเรื่องหนึ่ง, อ้างอิง Novel model)
  
  title?: string; // ชื่อสื่อ (ผู้ใช้ตั้งเอง, สำหรับการจัดการ)
  description?: string; // คำอธิบายสื่อ
  tags?: string[]; // แท็กสำหรับค้นหาสื่อ
  
  storageType: "s3" | "google_cloud_storage" | "local_dev"; // ประเภทที่จัดเก็บไฟล์
  storagePath: string; // เส้นทางไปยังไฟล์ในที่จัดเก็บ (เช่น key ใน S3, path ใน local)
  accessUrl: string; // URL สาธารณะสำหรับเข้าถึงไฟล์ (อาจเป็น CDN URL)
  
  mediaType: "image" | "audio" | "gif" | "video_short"; // ประเภทของสื่อหลัก
  details: IMediaDetails; // ข้อมูลจำเพาะของไฟล์
  
  // การตั้งค่าการใช้งานและการแสดงผล
  usageContext?: "character_sprite" | "background" | "sfx" | "bgm" | "ui_asset" | "profile_avatar" | "novel_cover"; // บริบทการใช้งาน
  isPrivate: boolean; // เป็นสื่อส่วนตัวหรือไม่ (ถ้า true, จะใช้ได้เฉพาะ uploader หรือ novel ที่ระบุ)
  //ลิขสิทธิ์ และการอนุญาตให้ผู้อื่นใช้ (ถ้ามี)
  licenseType?: "private" | "creative_commons" | "public_domain" | "custom";
  customLicenseTerms?: string;
  allowPublicUseInPlatform: boolean; // อนุญาตให้ผู้ใช้อื่นในแพลตฟอร์มนำไปใช้ในนิยายของตนหรือไม่ (ถ้า uploader อนุญาต)

  // สถิติการใช้งาน (อาจ denormalize)
  usageCount?: number; // จำนวนครั้งที่สื่อนี้ถูกนำไปใช้ในฉาก/นิยาย
  
  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema<IMedia>(
  {
    uploader: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    novel: { // ถ้าเป็น null คือเป็น media ทั่วไปของผู้ใช้, ถ้ามีค่าคือผูกกับนิยายนั้นๆ
      type: Schema.Types.ObjectId,
      ref: "Novel",
      index: true,
      default: null,
    },
    title: { type: String, trim: true, maxlength: 255 },
    description: { type: String, trim: true, maxlength: 1000 },
    tags: [{ type: String, trim: true, lowercase: true, index: true, maxlength: 50 }],
    storageType: {
      type: String,
      enum: ["s3", "google_cloud_storage", "local_dev"],
      required: [true, "กรุณาระบุประเภทที่จัดเก็บไฟล์ (Storage type is required)"],
    },
    storagePath: {
      type: String,
      required: [true, "กรุณาระบุเส้นทางไฟล์ในที่จัดเก็บ (Storage path is required)"],
      trim: true,
      unique: true, // เส้นทางควรจะไม่ซ้ำกัน
    },
    accessUrl: {
      type: String,
      required: [true, "กรุณาระบุ URL สำหรับเข้าถึงไฟล์ (Access URL is required)"],
      trim: true,
      validate: { validator: (v: string) => /^https?:\/\/|^\//.test(v), message: "รูปแบบ URL ไม่ถูกต้อง" },
    },
    mediaType: {
      type: String,
      enum: ["image", "audio", "gif", "video_short"],
      required: [true, "กรุณาระบุประเภทของสื่อ (Media type is required)"],
      index: true,
    },
    details: {
      filename: { type: String, required: true, trim: true },
      filetype: { type: String, required: true, trim: true, lowercase: true },
      filesizeBytes: { type: Number, required: true, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
      durationSeconds: { type: Number, min: 0 },
    },
    usageContext: {
      type: String,
      enum: ["character_sprite", "background", "sfx", "bgm", "ui_asset", "profile_avatar", "novel_cover"],
      index: true,
    },
    isPrivate: { type: Boolean, default: false, index: true }, // Default เป็น public ภายใน novel หรือ uploader
    licenseType: { type: String, enum: ["private", "creative_commons", "public_domain", "custom"], default: "private" },
    customLicenseTerms: { type: String, trim: true, maxlength: 2000 },
    allowPublicUseInPlatform: { type: Boolean, default: false, index: true }, // ผู้ใช้อื่นใช้ได้ไหม
    usageCount: { type: Number, default: 0, min: 0 },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ----- Indexes -----
MediaSchema.index({ uploader: 1, mediaType: 1, createdAt: -1 }); // ค้นหาสื่อของผู้ใช้ตามประเภทและวันที่อัปโหลด
MediaSchema.index({ novel: 1, usageContext: 1 }); // ค้นหาสื่อที่ใช้ในนิยายตามบริบท
MediaSchema.index({ tags: 1 });
MediaSchema.index({ mediaType: 1, allowPublicUseInPlatform: 1, usageCount: -1 }); // ค้นหาสื่อสาธารณะยอดนิยม
MediaSchema.index({ title: "text", description: "text", "details.filename": "text" });

// ----- Middleware -----
// อาจมี middleware สำหรับการลบไฟล์ออกจาก storage เมื่อ isDeleted = true (ต้องระมัดระวัง)
// หรือการ generate accessUrl แบบ dynamic ถ้า URL มีวันหมดอายุ

// ----- Model Export -----
const MediaModel = () => models.Media as mongoose.Model<IMedia> || model<IMedia>("Media", MediaSchema);

export default MediaModel;


