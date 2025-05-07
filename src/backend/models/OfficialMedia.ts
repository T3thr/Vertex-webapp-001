// src/backend/models/OfficialMedia.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface for different versions/renditions of an official media file
// Consistent with IMediaVersion in Media.ts for shared understanding of media versions
export interface IOfficialMediaVersion {
  name: string; // e.g., "thumbnail", "preview_webp", "hd_mp4", "original_png"
  url: string; // URL of this specific version
  fileType: string; // e.g., "jpg", "webp", "mp4", "png"
  mimeType: string;
  fileSize?: number; // Bytes
  width?: number; // Pixels (for images/videos)
  height?: number; // Pixels (for images/videos)
  bitrate?: number; // kbps (for audio/videos)
  isOriginal?: boolean; // Is this the original uploaded file format/quality provided by the platform?
}

// Interface for OfficialMedia document
// Represents curated, platform-provided media assets (images, audio, video, etc.)
// These may be free or premium, with clear licensing.
export interface IOfficialMedia extends Document {
  title: string; // ชื่อสื่อทางการ (เช่น "Forest Background Loopable Music")
  originalFileName?: string; // ชื่อไฟล์ดั้งเดิมที่ผู้ดูแลระบบอัปโหลด (สำหรับการอ้างอิงภายใน)
  // ประเภทหลักของสื่อ (สอดคล้องกับ Media.mediaType)
  mediaType: "image" | "audio" | "video" | "spriteSheet" | "font" | "other";
  // หมวดหมู่การใช้งานหลัก (เช่น "Backgrounds", "Character Sprites", "Sound Effects", "UI Icons")
  usageCategory: string;
  usageSubcategory?: string; // หมวดหมู่ย่อย (เช่น "Fantasy Forest", "Female Warrior", "Button Click")
  description?: string; // คำอธิบายสื่อ (รองรับ Markdown)
  // ข้อมูลไฟล์และการจัดเก็บ
  primaryAccessUrl: string; // URL หลักสำหรับเข้าถึง (อาจเป็นเวอร์ชันที่ optimized ที่สุด หรือ original)
  fileExtension: string; // นามสกุลไฟล์ของ asset หลัก (เช่น "png", "mp3")
  mimeType: string; // MIME type ของ asset หลัก
  originalFileSize?: number; // ขนาดไฟล์ของ asset ดั้งเดิมที่อัปโหลด (bytes)
  // ข้อมูลจำเพาะตามประเภทสื่อ
  dimensions?: { // สำหรับ image, video, spriteSheet
    width: number;
    height: number;
  };
  duration?: number; // ระยะเวลา (วินาที, สำหรับ audio, video)
  // การจัดการเวอร์ชัน (เช่น thumbnail, different resolutions/formats)
  versions?: IOfficialMediaVersion[];
  // การอนุญาตและการเผยแพร่
  licensing: {
    type: string; // ประเภทใบอนุญาต (เช่น "Standard Platform License", "CC0", "Royalty-Free")
    termsSummary?: string; // สรุปเงื่อนไขการใช้งานหลัก
    fullTermsUrl?: string; // URL ไปยังข้อกำหนดและเงื่อนไขฉบับเต็ม
    allowsCommercialUse: boolean;
    allowsModification: boolean;
    requiresAttribution: boolean;
    attributionInstructions?: string; // วิธีการให้เครดิต (ถ้า requiresAttribution is true)
  };
  // การให้เครดิตผู้สร้าง (ถ้าไม่ใช่ผลงานของแพลตฟอร์มเอง)
  attribution?: {
    creatorName?: string;
    creatorUrl?: string;
    sourceName?: string; // แหล่งที่มา (ถ้ามี)
    sourceUrl?: string;
  };
  // การกำหนดราคา (สำหรับสื่อ Premium)
  isPremium: boolean;
  price?: number; // ราคา (ถ้า isPremium is true)
  currency?: string; // สกุลเงิน (เช่น "THB", "USD", "CREDITS")
  // การจัดระเบียบและการค้นหา
  tags?: string[]; // แท็กสำหรับค้นหา (เช่น "forest", "epic", "loopable", "female")
  keywords?: string[]; // คำสำคัญเพิ่มเติม (อาจรวมถึงคำพ้อง)
  // สถานะและการมองเห็น
  status: "draft" | "active" | "archived" | "restricted"; // สถานะของสื่อในระบบ
  // สถิติ (อัปเดตผ่าน triggers หรือ batch jobs)
  stats: {
    totalDownloads: number;
    totalUsesInNovel: number; // จำนวนครั้งที่ถูกนำไปใช้ในนิยายโดยผู้ใช้
    averageRating?: number; // คะแนนเฉลี่ย (0-5)
    ratingCount: number;
    favoritesCount: number; // จำนวนครั้งที่ผู้ใช้เพิ่มในรายการโปรด
    revenueGenerated?: number; // รายได้ที่สร้าง (สำหรับสื่อ premium)
  };
  // ข้อมูลการจัดเก็บ (สำหรับผู้ดูแลระบบ)
  storageDetails: {
    provider: "s3" | "googleCloudStorage" | "azureBlob" | "local" | "other";
    bucketOrContainer?: string;
    filePathOrKey?: string;
    region?: string;
    uploadDate: Date;
  };
  // ความเข้ากันได้
  compatibility?: {
    supportedEngines?: string[]; // เช่น "RenPy", "Unity", "Unreal" (ถ้าเกี่ยวข้อง)
    notes?: string; // หมายเหตุเพิ่มเติมเกี่ยวกับความเข้ากันได้
  };
  // AI-related fields (if applicable)
  isAIGenerated?: boolean;
  aiGenerationDetails?: {
    modelUsed?: string;
    prompt?: string;
    seed?: string;
  };
  // การอ้างอิง
  relatedOfficialMedia?: Types.ObjectId[]; // สื่อทางการอื่นๆ ที่เกี่ยวข้อง (อ้างอิง OfficialMedia model)
  partOfCollections?: Types.ObjectId[]; // Collection ที่สื่อนี้เป็นส่วนหนึ่ง (อ้างอิง OfficialMediaCollection model)
  // Metadata
  customMetadata?: Record<string, any>; // ข้อมูลเพิ่มเติมตามที่ผู้ดูแลระบบกำหนด
  isDeleted: boolean; // Soft delete
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  lastReviewedAt?: Date; // วันที่ตรวจสอบ/อัปเดตข้อมูลครั้งล่าสุดโดยผู้ดูแล
}

const OfficialMediaVersionSchema = new Schema<IOfficialMediaVersion>({
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

const OfficialMediaSchema = new Schema<IOfficialMedia>(
  {
    title: { type: String, required: [true, "กรุณาระบุชื่อสื่อทางการ"], trim: true, maxlength: 250, index: true },
    originalFileName: { type: String, trim: true },
    mediaType: {
      type: String,
      enum: ["image", "audio", "video", "spriteSheet", "font", "other"],
      required: [true, "กรุณาระบุประเภทหลักของสื่อ"],
      index: true,
    },
    usageCategory: { type: String, required: [true, "กรุณาระบุหมวดหมู่การใช้งานหลัก"], trim: true, index: true },
    usageSubcategory: { type: String, trim: true, index: true },
    description: { type: String, trim: true, maxlength: 5000 },
    primaryAccessUrl: { type: String, required: [true, "กรุณาระบุ URL หลักของสื่อ"], trim: true },
    fileExtension: { type: String, required: true, lowercase: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    originalFileSize: { type: Number, min: 0 },
    dimensions: { width: { type: Number, min: 0 }, height: { type: Number, min: 0 } },
    duration: { type: Number, min: 0 }, // in seconds
    versions: [OfficialMediaVersionSchema],
    licensing: {
      type: { type: String, required: true },
      termsSummary: String,
      fullTermsUrl: String,
      allowsCommercialUse: { type: Boolean, required: true, default: false },
      allowsModification: { type: Boolean, required: true, default: false },
      requiresAttribution: { type: Boolean, required: true, default: true },
      attributionInstructions: String,
    },
    attribution: {
      creatorName: String,
      creatorUrl: String,
      sourceName: String,
      sourceUrl: String,
    },
    isPremium: { type: Boolean, default: false, index: true },
    price: {
      type: Number,
      min: 0,
      validate: {
        validator: function(this: IOfficialMedia, value: number) {
          return !this.isPremium || (typeof value === "number" && value >= 0);
        },
        message: "ราคาสินค้าพรีเมียมต้องเป็นตัวเลขและไม่ติดลบ",
      },
    },
    currency: {
      type: String,
      uppercase: true,
      validate: {
        validator: function(this: IOfficialMedia, value: string) {
          return !this.isPremium || (!!value && value.length === 3);
        },
        message: "สกุลเงินสำหรับสินค้าพรีเมียมต้องเป็นรหัส 3 ตัวอักษร (เช่น THB, USD)",
      },
    },
    tags: [{ type: String, trim: true, lowercase: true, index: true }],
    keywords: [{ type: String, trim: true, lowercase: true, index: true }],
    status: { type: String, enum: ["draft", "active", "archived", "restricted"], default: "draft", index: true },
    stats: {
      totalDownloads: { type: Number, default: 0, min: 0 },
      totalUsesInNovel: { type: Number, default: 0, min: 0 },
      averageRating: { type: Number, min: 0, max: 5 },
      ratingCount: { type: Number, default: 0, min: 0 },
      favoritesCount: { type: Number, default: 0, min: 0 },
      revenueGenerated: { type: Number, default: 0, min: 0 },
    },
    storageDetails: {
      provider: { type: String, enum: ["s3", "googleCloudStorage", "azureBlob", "local", "other"], required: true },
      bucketOrContainer: String,
      filePathOrKey: String,
      region: String,
      uploadDate: { type: Date, default: Date.now },
    },
    compatibility: {
      supportedEngines: [String],
      notes: String,
    },
    isAIGenerated: { type: Boolean, default: false },
    aiGenerationDetails: {
      modelUsed: String,
      prompt: String,
      seed: String,
    },
    relatedOfficialMedia: [{ type: Schema.Types.ObjectId, ref: "OfficialMedia" }],
    partOfCollections: [{ type: Schema.Types.ObjectId, ref: "OfficialMediaCollection" }], // Note: Assumes OfficialMediaCollection model
    customMetadata: Schema.Types.Mixed,
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    lastReviewedAt: Date,
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ----- Indexes -----
OfficialMediaSchema.index({ title: "text", description: "text", tags: "text", keywords: "text" }, { default_language: "thai" });
OfficialMediaSchema.index({ mediaType: 1, usageCategory: 1, status: 1, isDeleted: 1 });
OfficialMediaSchema.index({ isPremium: 1, status: 1 });
OfficialMediaSchema.index({ "stats.totalDownloads": -1, status: 1 });
OfficialMediaSchema.index({ "stats.averageRating": -1, status: 1 });
OfficialMediaSchema.index({ tags: 1, status: 1 });

// ----- Middleware -----
OfficialMediaSchema.pre("save", function (next) {
  if (this.isModified("isPremium")) {
    if (this.isPremium && (typeof this.price !== "number" || !this.currency)) {
      return next(new Error("สื่อพรีเมียมต้องมีการระบุราคาและสกุลเงิน (Premium media requires price and currency)."));
    }
    if (!this.isPremium) {
      this.price = undefined;
      this.currency = undefined;
    }
  }
  next();
});

// ----- Model Export -----
// Using a function to prevent recompilation in Next.js dev environment
const OfficialMediaModel = () =>
  models.OfficialMedia as mongoose.Model<IOfficialMedia> || model<IOfficialMedia>("OfficialMedia", OfficialMediaSchema);

export default OfficialMediaModel;

