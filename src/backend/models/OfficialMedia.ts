// src/models/OfficialMedia.ts
// โมเดลสื่อทางการ (OfficialMedia Model) - จัดการคลังสื่อที่แพลตฟอร์มจัดเตรียมไว้ให้ (ลิขสิทธิ์ถูกต้อง)
// ออกแบบให้ผู้ใช้ (นักเขียน) สามารถค้นหาและนำไปใช้ในนิยายของตนเองได้ง่าย

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// อินเทอร์เฟซสำหรับข้อมูลจำเพาะของไฟล์สื่อทางการ (คล้ายกับ Media.ts แต่สำหรับสื่อของแพลตฟอร์ม)
export interface IOfficialMediaDetails {
  filename: string; // ชื่อไฟล์ต้นฉบับ (อาจไม่ตรงกับ key ใน storage)
  filetype: string; // MIME type (เช่น "image/jpeg", "audio/mpeg")
  filesizeBytes: number; // ขนาดไฟล์ (bytes)
  // สำหรับรูปภาพ
  width?: number; // ความกว้าง (pixels)
  height?: number; // ความสูง (pixels)
  // สำหรับเสียง/วิดีโอ
  durationSeconds?: number; // ความยาว (วินาที)
  // อาจมี metadata เพิ่มเติม เช่น EXIF, ID3 tags
}

// อินเทอร์เฟซหลักสำหรับเอกสารสื่อทางการ (OfficialMedia Document)
export interface IOfficialMedia extends Document {
  _id: Types.ObjectId;
  title: string; // ชื่อสื่อ (สำหรับแสดงผลและค้นหา, เช่น "เสียงฝนตก", "ภาพปราสาทแฟนตาซี")
  description?: string; // คำอธิบายสื่อ (ช่วยในการค้นหาและให้ข้อมูลเพิ่มเติม)
  tags: string[]; // แท็กสำหรับค้นหาสื่อ (สำคัญมาก)
  category?: string; // หมวดหมู่ของสื่อ (เช่น "Backgrounds", "Sound Effects", "Music Loops", "Characters")
  
  storageType: "s3" | "google_cloud_storage" | "platform_cdn"; // ประเภทที่จัดเก็บไฟล์
  storagePath: string; // เส้นทางไปยังไฟล์ในที่จัดเก็บ
  accessUrl: string; // URL สาธารณะสำหรับเข้าถึงไฟล์ (ควรเป็น CDN URL ที่มีประสิทธิภาพสูง)
  thumbnailUrl?: string; // URL รูปตัวอย่างขนาดเล็ก (สำหรับแสดงใน list view)
  
  mediaType: "image" | "audio" | "gif" | "video_short"; // ประเภทของสื่อหลัก
  details: IOfficialMediaDetails; // ข้อมูลจำเพาะของไฟล์
  
  // ข้อมูลลิขสิทธิ์และการใช้งาน
  licenseType: "platform_provided_free" | "platform_provided_premium" | "specific_artist_agreement"; // ประเภทลิขสิทธิ์
  usageTerms?: string; // เงื่อนไขการใช้งาน (ถ้ามีข้อจำกัดพิเศษ)
  artistOrCreator?: string; // ชื่อศิลปินหรือผู้สร้าง (ถ้าต้องการให้เครดิต)
  sourceOrCollection?: string; // แหล่งที่มาหรือคอลเลกชัน (ถ้ามี)
  
  // การตั้งค่าสำหรับนักเขียน
  isRecommended?: boolean; // แนะนำโดยแพลตฟอร์มหรือไม่
  style?: string; // สไตล์ของอาร์ตเวิร์ค/เสียง (เช่น "pixel_art", "orchestral", "anime")
  
  // สถิติการใช้งาน (denormalized)
  usageCount: number; // จำนวนครั้งที่สื่อนี้ถูกนำไปใช้โดยผู้เขียน
  // lastUsedAt?: Date; // วันที่ถูกใช้ล่าสุด
  
  // สถานะการเผยแพร่ในคลังสื่อ
  isActive: boolean; // พร้อมใช้งานในคลังหรือไม่
  addedToPlatformAt: Date; // วันที่เพิ่มเข้าสู่แพลตฟอร์ม

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const OfficialMediaSchema = new Schema<IOfficialMedia>(
  {
    title: {
      type: String,
      required: [true, "กรุณาระบุชื่อสื่อทางการ (Official Media title is required)"],
      trim: true,
      maxlength: [255, "ชื่อสื่อต้องไม่เกิน 255 ตัวอักษร"],
      index: true,
    },
    description: { type: String, trim: true, maxlength: 2000 },
    tags: [{ type: String, required: true, trim: true, lowercase: true, index: true, maxlength: 50 }],
    category: { type: String, trim: true, index: true, maxlength: 100 }, // เช่น "Backgrounds/Nature", "SFX/Ambient"
    storageType: {
      type: String,
      enum: ["s3", "google_cloud_storage", "platform_cdn"],
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
    thumbnailUrl: { 
      type: String, 
      trim: true, 
      validate: { validator: (v: string) => !v || /^https?:\/\/|^\//.test(v), message: "รูปแบบ URL ของ Thumbnail ไม่ถูกต้อง" }
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
    licenseType: {
      type: String,
      enum: ["platform_provided_free", "platform_provided_premium", "specific_artist_agreement"],
      default: "platform_provided_free",
    },
    usageTerms: { type: String, trim: true, maxlength: 2000 },
    artistOrCreator: { type: String, trim: true, maxlength: 255 },
    sourceOrCollection: { type: String, trim: true, maxlength: 255 },
    isRecommended: { type: Boolean, default: false, index: true },
    style: { type: String, trim: true, index: true, maxlength: 100 },
    usageCount: { type: Number, default: 0, min: 0, index: true },
    // lastUsedAt: { type: Date, index: true },
    isActive: { type: Boolean, default: true, index: true },
    addedToPlatformAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ----- Indexes -----
// Index สำหรับการค้นหาและกรองสื่อทางการ
OfficialMediaSchema.index({ mediaType: 1, category: 1, tags: 1, isActive: 1 });
OfficialMediaSchema.index({ title: "text", description: "text", tags: "text", category: "text", style: "text" }, { default_language: "thai" });
OfficialMediaSchema.index({ isActive: 1, usageCount: -1 }); // สื่อยอดนิยมที่ยังใช้งานได้
OfficialMediaSchema.index({ isActive: 1, isRecommended: 1, addedToPlatformAt: -1 }); // สื่อแนะนำล่าสุด

// ----- Model Export -----
const OfficialMediaModel = () => models.OfficialMedia as mongoose.Model<IOfficialMedia> || model<IOfficialMedia>("OfficialMedia", OfficialMediaSchema);

export default OfficialMediaModel;

