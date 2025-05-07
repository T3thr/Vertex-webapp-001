// src/backend/models/Media.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface for different versions/renditions of a media file (e.g., thumbnail, different resolutions)
export interface IMediaVersion {
  name: string; // e.g., "thumbnail", "small_webp", "hd_mp4", "original"
  url: string; // URL of this specific version
  fileType: string; // e.g., "jpg", "webp", "mp4"
  mimeType: string;
  fileSize?: number; // Bytes
  width?: number; // Pixels (for images/videos)
  height?: number; // Pixels (for images/videos)
  bitrate?: number; // kbps (for audio/videos)
  isOriginal?: boolean; // Is this the original uploaded file?
}

// Interface for Media document
export interface IMedia extends Document {
  title: string; // ชื่อสื่อ (ควรให้ผู้ใช้อัปเดตได้, อาจ default จากชื่อไฟล์)
  fileName: string; // ชื่อไฟล์ต้นฉบับที่อัปโหลด
  // ประเภทหลักของสื่อ
  mediaType: "image" | "audio" | "video" | "document" | "archive" | "font" | "spriteSheet" | "other";
  // ประเภทการใช้งาน (ช่วยในการจัดหมวดหมู่และค้นหา)
  usageCategory?: "characterAvatar" | "characterSprite" | "background" | "uiElement" | "sfx" | "bgm" | "voiceLine" | "galleryImage" | "coverArt" | "attachment" | "general";
  description?: string; // คำอธิบายสื่อ
  // ข้อมูลไฟล์
  storageUrl: string; // URL หลักสำหรับเข้าถึงไฟล์ (อาจเป็น URL ของเวอร์ชัน original หรือ optimized default)
  fileExtension: string; // นามสกุลไฟล์ (เช่น "png", "mp3", "webm")
  mimeType: string; // MIME type (เช่น "image/png", "audio/mpeg")
  fileSize: number; // ขนาดไฟล์ต้นฉบับ (bytes)
  // ข้อมูลจำเพาะตามประเภทสื่อ
  dimensions?: { // สำหรับ image, video, spriteSheet
    width: number;
    height: number;
  };
  duration?: number; // ระยะเวลา (วินาที, สำหรับ audio, video)
  frameCount?: number; // จำนวนเฟรม (สำหรับ spriteSheet, animated gif)
  frameRate?: number; // FPS (สำหรับ video, spriteSheet)
  // การจัดการเวอร์ชันและการประมวลผล
  versions?: IMediaVersion[]; // เก็บ URL และข้อมูลของเวอร์ชันต่างๆ
  processingStatus: "pending" | "uploading" | "processing" | "completed" | "failed" | "archived";
  processingDetails?: string; // รายละเอียดเพิ่มเติมหากการประมวลผลล้มเหลว หรือข้อมูลการประมวลผล
  // เจ้าของและการอ้างอิง
  uploader: Types.ObjectId; // ผู้ใช้งานที่อัปโหลด (อ้างอิง User model)
  novelId?: Types.ObjectId; // นิยายที่สื่อนี้เกี่ยวข้องโดยตรง (ถ้ามี, เช่น ปกนิยาย)
  episodeId?: Types.ObjectId; // ตอนที่สื่อนี้เกี่ยวข้องโดยตรง (ถ้ามี, เช่น ปกตอน)
  characterId?: Types.ObjectId; // ตัวละครที่สื่อนี้เกี่ยวข้องโดยตรง (ถ้ามี, เช่น avatar หลัก)
  // การจัดระเบียบและการค้นหา
  tags?: string[]; // แท็กสำหรับค้นหา
  customCollection?: string; // ชื่อ collection ที่ผู้ใช้สร้างเองสำหรับจัดกลุ่มสื่อ
  // การอนุญาตและการเผยแพร่
  visibility: "private" | "unlisted" | "public" | "novelAccess" | "platformStock"; // private (เฉพาะผู้สร้าง), unlisted (มีลิงก์เข้าได้), public (ทุกคน), novelAccess (เฉพาะผู้มีสิทธิ์ในนิยาย), platformStock (สื่อทางการของแพลตฟอร์ม)
  isOfficialStock: boolean; // เป็นสื่อทางการของแพลตฟอร์มหรือไม่ (เช่น stock images/sounds)
  // การให้เครดิต
  attribution?: {
    authorName?: string; // ชื่อผู้สร้างสรรค์ผลงานสื่อ
    authorUrl?: string; // URL ของผู้สร้างสรรค์
    sourceName?: string; // ชื่อแหล่งที่มา
    sourceUrl?: string; // URL แหล่งที่มา
    licenseName?: string; // ชื่อใบอนุญาต (เช่น "CC BY-SA 4.0")
    licenseUrl?: string; // URL ของใบอนุญาต
  };
  // สถิติการใช้งาน (อาจอัปเดตผ่าน triggers หรือ batch jobs)
  usageCount: number; // จำนวนครั้งที่สื่อนี้ถูกใช้งานใน scenes/episodes/etc.
  // AI/ML Fields
  embeddingVector?: number[]; // Vector embedding (สำหรับ image similarity, etc.)
  altText?: string; // ข้อความอธิบายรูปภาพ (สำหรับ SEO และ accessibility, อาจ generate โดย AI)
  contentModeration?: { // ผลการตรวจสอบเนื้อหา
    status: "approved" | "rejected" | "pendingReview";
    reason?: string;
    checkedAt?: Date;
  };
  // สถานะการลบ
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MediaVersionSchema = new Schema<IMediaVersion>({
  name: { type: String, required: true },
  url: { type: String, required: true },
  fileType: { type: String, required: true, lowercase: true },
  mimeType: { type: String, required: true },
  fileSize: Number,
  width: Number,
  height: Number,
  bitrate: Number,
  isOriginal: { type: Boolean, default: false },
}, { _id: false });

const MediaSchema = new Schema<IMedia>(
  {
    title: { type: String, required: [true, "กรุณาระบุชื่อหรือหัวข้อของสื่อ"], trim: true, maxlength: [250, "ชื่อสื่อต้องไม่เกิน 250 ตัวอักษร"], index: true },
    fileName: { type: String, required: [true, "กรุณาระบุชื่อไฟล์ต้นฉบับ"], trim: true },
    mediaType: {
      type: String,
      enum: ["image", "audio", "video", "document", "archive", "font", "spriteSheet", "other"],
      required: [true, "กรุณาระบุประเภทหลักของสื่อ"],
      index: true,
    },
    usageCategory: {
      type: String,
      enum: ["characterAvatar", "characterSprite", "background", "uiElement", "sfx", "bgm", "voiceLine", "galleryImage", "coverArt", "attachment", "general"],
      index: true,
    },
    description: { type: String, trim: true, maxlength: [2000, "คำอธิบายสื่อต้องไม่เกิน 2000 ตัวอักษร"] },
    storageUrl: { type: String, required: [true, "กรุณาระบุ URL หลักของสื่อ"], trim: true },
    fileExtension: { type: String, required: true, lowercase: true, trim: true, index: true },
    mimeType: { type: String, required: true, trim: true },
    fileSize: { type: Number, required: [true, "กรุณาระบุขนาดไฟล์"], min: 0 },
    dimensions: { width: { type: Number, min: 0 }, height: { type: Number, min: 0 } },
    duration: { type: Number, min: 0 }, // in seconds
    frameCount: { type: Number, min: 0 },
    frameRate: { type: Number, min: 0 },
    versions: [MediaVersionSchema],
    processingStatus: {
      type: String,
      enum: ["pending", "uploading", "processing", "completed", "failed", "archived"],
      default: "pending",
      index: true,
    },
    processingDetails: String,
    uploader: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    novelId: { type: Schema.Types.ObjectId, ref: "Novel", index: true },
    episodeId: { type: Schema.Types.ObjectId, ref: "Episode", index: true },
    characterId: { type: Schema.Types.ObjectId, ref: "Character", index: true },
    tags: [{ type: String, trim: true, lowercase: true, index: true }],
    customCollection: { type: String, trim: true, index: true },
    visibility: {
      type: String,
      enum: ["private", "unlisted", "public", "novelAccess", "platformStock"],
      default: "private",
      index: true,
    },
    isOfficialStock: { type: Boolean, default: false, index: true },
    attribution: {
      authorName: String,
      authorUrl: String,
      sourceName: String,
      sourceUrl: String,
      licenseName: String,
      licenseUrl: String,
    },
    usageCount: { type: Number, default: 0, min: 0 },
    embeddingVector: { type: [Number], select: false },
    altText: { type: String, trim: true, maxlength: [500, "Alt text ต้องไม่เกิน 500 ตัวอักษร"] },
    contentModeration: {
      status: { type: String, enum: ["approved", "rejected", "pendingReview"], default: "pendingReview" },
      reason: String,
      checkedAt: Date,
    },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----- Indexes -----
// Compound index for uploader and media type/category for user's media library filtering
MediaSchema.index({ uploader: 1, mediaType: 1, usageCategory: 1, isDeleted: 1 });
// For searching public/platform stock media
MediaSchema.index({ visibility: 1, mediaType: 1, tags: 1, isDeleted: 1 });
MediaSchema.index({ isOfficialStock: 1, mediaType: 1, tags: 1, isDeleted: 1 });
// Text search (consider which fields are most relevant for media search)
MediaSchema.index({ title: "text", description: "text", tags: "text", fileName: "text" }, { default_language: "thai" });
// For finding media associated with a specific novel/episode/character
MediaSchema.index({ novelId: 1, usageCategory: 1, isDeleted: 1 });
MediaSchema.index({ characterId: 1, usageCategory: 1, isDeleted: 1 });

// ----- Middleware -----
MediaSchema.pre("save", function (next) {
  if (this.isModified("storageUrl") && !this.title) {
    // Attempt to set a default title from the filename if title is empty
    try {
      const urlPath = new URL(this.storageUrl).pathname;
      const filenameFromUrl = urlPath.substring(urlPath.lastIndexOf('/') + 1);
      this.title = filenameFromUrl.substring(0, filenameFromUrl.lastIndexOf('.')) || filenameFromUrl;
    } catch (e) {
      // If URL parsing fails, use a generic title or leave it to validation
      this.title = this.fileName || "Untitled Media";
    }
  }
  if (!this.fileName && this.title) {
      this.fileName = this.title.replace(/\s+/g, '_') + '.' + this.fileExtension;
  }
  next();
});

// ----- Static Methods (Example) -----
MediaSchema.statics.incrementUsage = async function (mediaId: Types.ObjectId) {
  try {
    await this.findByIdAndUpdate(mediaId, { $inc: { usageCount: 1 } });
  } catch (error) {
    console.error(`ไม่สามารถอัปเดตจำนวนการใช้งานสำหรับ Media ID ${mediaId} ได้:`, error);
  }
};

// ----- Virtuals (Example) -----
// Virtual to get a specific version URL, e.g., thumbnail
MediaSchema.virtual("thumbnailUrl").get(function() {
  if (this.versions && this.versions.length > 0) {
    const thumbnailVersion = this.versions.find(v => v.name === "thumbnail" || v.name.includes("thumb"));
    if (thumbnailVersion) return thumbnailVersion.url;
    // Fallback: if mediaType is image and no specific thumbnail, return original or first version
    if (this.mediaType === "image") return this.versions[0]?.url || this.storageUrl;
  }
  return this.mediaType === "image" ? this.storageUrl : null; // Or a default placeholder thumbnail URL
});

// ----- Model Export -----
const MediaModel = () => models.Media as mongoose.Model<IMedia> || model<IMedia>("Media", MediaSchema);

export default MediaModel;

