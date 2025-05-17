// src/backend/models/Media.ts
// โมเดลสื่อ (Media Model)
// จัดการไฟล์สื่อที่ผู้ใช้อัปโหลด เช่น รูปภาพ, เสียง, วิดีโอ สำหรับใช้ในนิยาย, โปรไฟล์, ฯลฯ

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { ICategory } from "./Category"; // สำหรับ mediaCategory ใน metadata
import { IUser } from "./User"; // สำหรับ userId และ deletedByUserId
import { INovel } from "./Novel"; // สำหรับ novelId (ถ้าต้องการ populate)

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Media
// ==================================================================================================

/**
 * @enum {string} MediaType
 * @description ประเภทหลักของสื่อที่ผู้ใช้อัปโหลดได้
 * - `IMAGE`: รูปภาพทั่วไป (jpg, png, gif, webp, svg)
 * - `AUDIO`: ไฟล์เสียง (mp3, wav, ogg, aac, flac)
 * - `VIDEO`: ไฟล์วิดีโอ (mp4, webm, mov, avi)
 * - `DOCUMENT`: เอกสาร (pdf, docx, txt)
 * - `ARCHIVE`: ไฟล์บีบอัด (zip, rar)
 * - `FONT`: ไฟล์ฟอนต์ (ttf, otf, woff, woff2)
 * - `THREE_D_MODEL`: โมเดล 3 มิติ (glb, gltf)
 * - `OTHER`: ประเภทอื่นๆ
 */
export enum MediaType {
  IMAGE = "image",
  AUDIO = "audio",
  VIDEO = "video",
  DOCUMENT = "document",
  ARCHIVE = "archive",
  FONT = "font",
  THREE_D_MODEL = "three_d_model",
  OTHER = "other",
}

/**
 * @enum {string} MediaSubType
 * @description ประเภทย่อยของสื่อ เพื่อระบุการใช้งานเฉพาะสำหรับ Visual Novel
 * - `GENERAL_IMAGE`: รูปภาพทั่วไป
 * - `AVATAR`: รูปโปรไฟล์ผู้ใช้
 * - `USER_BANNER`: แบนเนอร์โปรไฟล์ผู้ใช้
 * - `NOVEL_COVER`: ปกนิยาย
 * - `NOVEL_BANNER`: แบนเนอร์นิยาย
 * - `EPISODE_THUMBNAIL`: ภาพตัวอย่างตอนนิยาย
 * - `CHARACTER_SPRITE`: สไปรท์ตัวละคร
 * - `CHARACTER_PORTRAIT`: ภาพวาดตัวละคร
 * - `SCENE_BACKGROUND`: พื้นหลังฉาก
 * - `SCENE_CG`: ภาพ CG
 * - `ITEM_ICON`: ไอคอนไอเท็ม
 * - `MAP_TILE`: ไทล์แผนที่
 * - `UI_ASSET`: Asset สำหรับ UI
 * - `AUDIO_SFX`: เสียงประกอบ
 * - `AUDIO_BGM`: เพลงประกอบ
 * - `AUDIO_VO`: เสียงพากย์
 * - `VIDEO_CUTSCENE`: คัทซีนวิดีโอ
 * - `VIDEO_TRAILER`: วิดีโอตัวอย่างนิยาย
 * - `PROMOTIONAL_MATERIAL`: สื่อโปรโมทนิยาย
 * - `USER_UPLOADED_FONT`: ฟอนต์ที่ผู้ใช้อัปโหลด
 * - `OTHER_SUB_TYPE`: ประเภทย่อยอื่นๆ
 */
export enum MediaSubType {
  GENERAL_IMAGE = "general_image",
  AVATAR = "avatar",
  USER_BANNER = "user_banner",
  NOVEL_COVER = "novel_cover",
  NOVEL_BANNER = "novel_banner",
  EPISODE_THUMBNAIL = "episode_thumbnail",
  CHARACTER_SPRITE = "character_sprite",
  CHARACTER_PORTRAIT = "character_portrait",
  SCENE_BACKGROUND = "scene_background",
  SCENE_CG = "scene_cg",
  ITEM_ICON = "item_icon",
  MAP_TILE = "map_tile",
  UI_ASSET = "ui_asset",
  AUDIO_SFX = "audio_sfx",
  AUDIO_BGM = "audio_bgm",
  AUDIO_VO = "audio_vo",
  VIDEO_CUTSCENE = "video_cutscene",
  VIDEO_TRAILER = "video_trailer",
  PROMOTIONAL_MATERIAL = "promotional_material",
  USER_UPLOADED_FONT = "user_uploaded_font",
  OTHER_SUB_TYPE = "other_sub_type",
}

/**
 * @enum {string} MediaStatus
 * @description สถานะของไฟล์สื่อในระบบ
 * - `PENDING_UPLOAD`: รอการอัปโหลดไฟล์
 * - `UPLOADING`: กำลังอัปโหลด
 * - `UPLOADED`: อัปโหลดเสร็จ รอประมวลผล
 * - `PROCESSING`: กำลังประมวลผล
 * - `AVAILABLE`: พร้อมใช้งาน
 * - `ERROR_UPLOAD`: ข้อผิดพลาดการอัปโหลด
 * - `ERROR_PROCESSING`: ข้อผิดพลาดการประมวลผล
 * - `QUARANTINED`: ถูกกักกัน
 * - `ARCHIVED`: เก็บเข้าคลัง
 * - `PENDING_DELETION`: รอการลบถาวร
 * - `DELETED`: ถูกลบ (soft delete)
 */
export enum MediaStatus {
  PENDING_UPLOAD = "pending_upload",
  UPLOADING = "uploading",
  UPLOADED = "uploaded",
  PROCESSING = "processing",
  AVAILABLE = "available",
  ERROR_UPLOAD = "error_upload",
  ERROR_PROCESSING = "error_processing",
  QUARANTINED = "quarantined",
  ARCHIVED = "archived",
  PENDING_DELETION = "pending_deletion",
  DELETED = "deleted",
}

/**
 * @enum {string} MediaStorageProvider
 * @description ผู้ให้บริการพื้นที่จัดเก็บไฟล์
 * - `LOCAL`: จัดเก็บบนเซิร์ฟเวอร์ NovelMaze
 * - `AWS_S3`: Amazon S3
 * - `GOOGLE_CLOUD_STORAGE`: Google Cloud Storage
 * - `AZURE_BLOB_STORAGE`: Azure Blob Storage
 * - `CLOUDINARY`: Cloudinary
 * - `OTHER_PROVIDER`: ผู้ให้บริการอื่นๆ
 */
export enum MediaStorageProvider {
  LOCAL = "local",
  AWS_S3 = "aws_s3",
  GOOGLE_CLOUD_STORAGE = "google_cloud_storage",
  AZURE_BLOB_STORAGE = "azure_blob_storage",
  CLOUDINARY = "cloudinary",
  OTHER_PROVIDER = "other_provider",
}

/**
 * @interface IMediaVariant
 * @description ข้อมูลสำหรับเวอร์ชันต่างๆ ของสื่อ (เช่น thumbnail, optimized version)
 * @property {string} variantName - ชื่อเวอร์ชัน (เช่น "thumbnail_small_webp")
 * @property {string} accessUrl - URL สำหรับเข้าถึงเวอร์ชันนี้
 * @property {string} [storagePath] - Path ที่เก็บเวอร์ชันนี้
 * @property {string} [mimeType] - MIME type ของเวอร์ชันนี้
 * @property {number} [fileSize] - ขนาดไฟล์ของเวอร์ชันนี้ (bytes)
 * @property {{ width: number; height: number }} [dimensions] - ขนาดของรูปภาพ/วิดีโอ
 * @property {string} [format] - Format ของเวอร์ชันนี้ (เช่น "webp")
 * @property {number} [bitrate] - Bitrate สำหรับ audio/video (kbps)
 */
export interface IMediaVariant {
  variantName: string;
  accessUrl: string;
  storagePath?: string;
  mimeType?: string;
  fileSize?: number;
  dimensions?: { width: number; height: number };
  format?: string;
  bitrate?: number;
}
export const MediaVariantSchema = new Schema<IMediaVariant>(
  {
    variantName: {
      type: String,
      required: [true, "กรุณาระบุชื่อเวอร์ชันของสื่อ (Variant name is required)"],
      trim: true,
      maxlength: [100, "ชื่อเวอร์ชันของสื่อยาวเกินไป"],
    },
    accessUrl: {
      type: String,
      required: [true, "กรุณาระบุ URL ของเวอร์ชันสื่อ (Variant access URL is required)"],
      trim: true,
      maxlength: [2048, "URL ของ Media Variant ยาวเกินไป"],
    },
    storagePath: { type: String, trim: true, maxlength: [1024, "Storage Path ของ Media Variant ยาวเกินไป"] },
    mimeType: { type: String, trim: true, lowercase: true, maxlength: [100, "MIME Type ของ Media Variant ยาวเกินไป"] },
    fileSize: { type: Number, min: 0 },
    dimensions: {
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
      _id: false,
    },
    format: { type: String, trim: true, lowercase: true, maxlength: [50, "Format ของ Media Variant ยาวเกินไป"] },
    bitrate: { type: Number, min: 0 },
  },
  { _id: false }
);

/**
 * @interface IMediaMetadata
 * @description ข้อมูล Metadata เพิ่มเติมสำหรับสื่อ
 * @property {string} [title] - ชื่อของสื่อ
 * @property {string} [description] - คำอธิบายสื่อ
 * @property {string} [altText] - ข้อความทางเลือกสำหรับรูปภาพ
 * @property {string} [caption] - คำบรรยายภาพ
 * @property {string} [artist] - ชื่อศิลปิน
 * @property {string} [album] - ชื่ออัลบั้ม
 * @property {number} [year] - ปีที่สร้าง
 * @property {string} [copyrightHolder] - ผู้ถือลิขสิทธิ์
 * @property {string} [licenseType] - ประเภทใบอนุญาต
 * @property {string[]} [tags] - แท็กสำหรับค้นหา
 * @property {Types.ObjectId[]} [categoryIds] - ID ของหมวดหมู่
 * @property {string} [dominantColor] - สีเด่น (hex code)
 * @property {Record<string, any>} [exifData] - ข้อมูล EXIF
 * @property {string} [language] - ภาษาของเนื้อหา
 * @property {boolean} [isUserGeneratedContentWarning] - ระวังเนื้อหาจากผู้ใช้
 */
export interface IMediaMetadata {
  title?: string;
  description?: string;
  altText?: string;
  caption?: string;
  artist?: string;
  album?: string;
  year?: number;
  copyrightHolder?: string;
  licenseType?: string;
  tags?: string[];
  categoryIds?: Types.ObjectId[];
  dominantColor?: string;
  exifData?: Record<string, any>;
  language?: string;
  isUserGeneratedContentWarning?: boolean;
}
export const MediaMetadataSchema = new Schema<IMediaMetadata>(
  {
    title: { type: String, trim: true, maxlength: [255, "Title ของ Media Metadata ยาวเกินไป"] },
    description: { type: String, trim: true, maxlength: [2000, "Description ของ Media Metadata ยาวเกินไป"] },
    altText: { type: String, trim: true, maxlength: [500, "Alt Text ของ Media Metadata ยาวเกินไป"] },
    caption: { type: String, trim: true, maxlength: [1000, "Caption ของ Media Metadata ยาวเกินไป"] },
    artist: { type: String, trim: true, maxlength: [150, "Artist ของ Media Metadata ยาวเกินไป"] },
    album: { type: String, trim: true, maxlength: [150, "Album ของ Media Metadata ยาวเกินไป"] },
    year: { type: Number, min: 1000, max: new Date().getFullYear() + 10 },
    copyrightHolder: { type: String, trim: true, maxlength: [150, "Copyright Holder ของ Media Metadata ยาวเกินไป"] },
    licenseType: { type: String, trim: true, maxlength: [100, "License Type ของ Media Metadata ยาวเกินไป"] },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: [50, "Tag ของ Media Metadata ยาวเกินไป"], index: true }],
    categoryIds: [{ type: Schema.Types.ObjectId, ref: "Category", index: true }],
    dominantColor: {
      type: String,
      trim: true,
      match: [/^#([0-9a-fA-F]{3}){1,2}$/, "กรุณากรอก Hex color code ให้ถูกต้อง"],
    },
    exifData: { type: Schema.Types.Mixed },
    language: { type: String, trim: true, maxlength: [10, "Language code ยาวเกินไป"] },
    isUserGeneratedContentWarning: { type: Boolean, default: false },
  },
  { _id: false }
);

/**
 * @interface IMedia
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารสื่อใน Collection "media"
 * @property {Types.ObjectId} _id - รหัส ObjectId
 * @property {Types.ObjectId | IUser} userId - ID ของผู้อัปโหลด
 * @property {Types.ObjectId | INovel} [novelId] - ID ของนิยาย
 * @property {Types.ObjectId} [episodeId] - ID ของตอน
 * @property {Types.ObjectId} [characterId] - ID ของตัวละคร
 * @property {Types.ObjectId} [sceneId] - ID ของฉาก
 * @property {string} originalFileName - ชื่อไฟล์เดิม
 * @property {string} storedFileName - ชื่อไฟล์ที่จัดเก็บ
 * @property {string} storagePath - Path ที่เก็บไฟล์
 * @property {MediaStorageProvider} storageProvider - ผู้ให้บริการ Storage
 * @property {string} [storageBucket] - ชื่อ Bucket
 * @property {string} [storageRegion] - Region ของ Bucket
 * @property {string} accessUrl - URL สำหรับเข้าถึงไฟล์
 * @property {MediaType} mediaType - ประเภทหลักของสื่อ
 * @property {MediaSubType} [mediaSubType] - ประเภทย่อยของสื่อ
 * @property {string} mimeType - MIME type
 * @property {number} fileSize - ขนาดไฟล์ (bytes)
 * @property {{ width: number; height: number }} [dimensions] - ขนาด
 * @property {number} [duration] - ความยาว (วินาที)
 * @property {string} [checksum] - Checksum
 * @property {Types.DocumentArray<IMediaVariant>} [variants] - เวอร์ชันของสื่อ
 * @property {IMediaMetadata} [metadata] - Metadata
 * @property {MediaStatus} status - สถานะของสื่อ
 * @property {string} [statusMessage] - ข้อความสถานะ
 * @property {boolean} isPrivate - เป็นส่วนตัวหรือไม่
 * @property {number} usageCount - จำนวนครั้งที่ใช้งาน
 * @property {Date} [lastUsedAt] - วันที่ใช้งานล่าสุด
 * @property {string} [uploaderIpAddress] - IP ของผู้อัปโหลด
 * @property {string} [userAgent] - User Agent
 * @property {boolean} isOfficialResource - เป็นสื่อทางการหรือไม่
 * @property {Date} uploadedAt - วันที่อัปโหลด
 * @property {Date} [processedAt] - วันที่ประมวลผล
 * @property {Date} [deletedAt] - วันที่ถูกลบ
 * @property {Types.ObjectId | IUser} [deletedByUserId] - ID ผู้ลบ
 * @property {Date} createdAt - วันที่สร้าง
 * @property {Date} updatedAt - วันที่อัปเดต
 */
export interface IMedia extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId | IUser;
  novelId?: Types.ObjectId | INovel;
  episodeId?: Types.ObjectId;
  characterId?: Types.ObjectId;
  sceneId?: Types.ObjectId;
  originalFileName: string;
  storedFileName: string;
  storagePath: string;
  storageProvider: MediaStorageProvider;
  storageBucket?: string;
  storageRegion?: string;
  accessUrl: string;
  mediaType: MediaType;
  mediaSubType?: MediaSubType;
  mimeType: string;
  fileSize: number;
  dimensions?: { width: number; height: number };
  duration?: number;
  checksum?: string;
  variants?: Types.DocumentArray<IMediaVariant>;
  metadata?: IMediaMetadata;
  status: MediaStatus;
  statusMessage?: string;
  isPrivate: boolean;
  usageCount: number;
  lastUsedAt?: Date;
  uploaderIpAddress?: string;
  userAgent?: string;
  isOfficialResource: boolean;
  uploadedAt: Date;
  processedAt?: Date;
  deletedAt?: Date;
  deletedByUserId?: Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  isDeleted?: boolean;
  fullStoragePath?: string;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ Media (MediaSchema)
// ==================================================================================================
const MediaSchema = new Schema<IMedia>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุ ID ของผู้อัปโหลด (User ID is required)"],
      index: true,
    },
    novelId: { type: Schema.Types.ObjectId, ref: "Novel", index: true, sparse: true },
    episodeId: { type: Schema.Types.ObjectId, ref: "Episode", index: true, sparse: true },
    characterId: { type: Schema.Types.ObjectId, ref: "Character", index: true, sparse: true },
    sceneId: { type: Schema.Types.ObjectId, ref: "Scene", index: true, sparse: true },
    originalFileName: {
      type: String,
      required: [true, "กรุณาระบุชื่อไฟล์เดิม (Original file name is required)"],
      trim: true,
      maxlength: [255, "ชื่อไฟล์เดิมยาวเกินไป"],
    },
    storedFileName: {
      type: String,
      required: [true, "กรุณาระบุชื่อไฟล์ที่จัดเก็บ (Stored file name is required)"],
      trim: true,
      maxlength: [300, "ชื่อไฟล์ที่จัดเก็บยาวเกินไป"],
    },
    storagePath: {
      type: String,
      required: [true, "กรุณาระบุตำแหน่งที่เก็บไฟล์ (Storage path is required)"],
      trim: true,
      unique: true,
      maxlength: [1024, "Storage path ยาวเกินไป"],
      index: true,
    },
    storageProvider: {
      type: String,
      enum: Object.values(MediaStorageProvider),
      required: [true, "กรุณาระบุผู้ให้บริการ Storage (Storage provider is required)"],
      default: MediaStorageProvider.LOCAL,
    },
    storageBucket: { type: String, trim: true, maxlength: [100, "ชื่อ Bucket ยาวเกินไป"] },
    storageRegion: { type: String, trim: true, maxlength: [50, "ชื่อ Region ยาวเกินไป"] },
    accessUrl: {
      type: String,
      required: [true, "กรุณาระบุ URL สำหรับเข้าถึงไฟล์ (Access URL is required)"],
      trim: true,
      maxlength: [2048, "Access URL ยาวเกินไป"],
    },
    mediaType: {
      type: String,
      enum: Object.values(MediaType),
      required: [true, "กรุณาระบุประเภทหลักของสื่อ (Media type is required)"],
      index: true,
    },
    mediaSubType: {
      type: String,
      enum: Object.values(MediaSubType),
      index: true,
    },
    mimeType: {
      type: String,
      required: [true, "กรุณาระบุ MIME type (MIME type is required)"],
      trim: true,
      lowercase: true,
      maxlength: [100, "MIME type ยาวเกินไป"],
    },
    fileSize: {
      type: Number,
      required: [true, "กรุณาระบุขนาดไฟล์ (File size is required)"],
      min: [0, "ขนาดไฟล์ต้องไม่ติดลบ"],
    },
    dimensions: {
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
      _id: false,
    },
    duration: { type: Number, min: 0 },
    checksum: { type: String, trim: true, maxlength: [128, "Checksum ยาวเกินไป"] },
    variants: [MediaVariantSchema],
    metadata: { type: MediaMetadataSchema, default: () => ({}) },
    status: {
      type: String,
      enum: Object.values(MediaStatus),
      default: MediaStatus.PENDING_UPLOAD,
      required: true,
      index: true,
    },
    statusMessage: { type: String, trim: true, maxlength: [500, "Status message ยาวเกินไป"] },
    isPrivate: { type: Boolean, default: false, index: true },
    usageCount: { type: Number, default: 0, min: 0, index: true },
    lastUsedAt: { type: Date, index: true },
    uploaderIpAddress: { type: String, trim: true, maxlength: [45, "IP Address ยาวเกินไป"] },
    userAgent: { type: String, trim: true, maxlength: [500, "User Agent ยาวเกินไป"] },
    isOfficialResource: { type: Boolean, default: false, index: true },
    uploadedAt: { type: Date, default: Date.now, required: true },
    processedAt: { type: Date },
    deletedAt: { type: Date, index: true },
    deletedByUserId: { type: Schema.Types.ObjectId, ref: "User", sparse: true },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    collection: "media", // ชื่อ collection ใน MongoDB
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

// ดัชนีสำหรับค้นหาสื่อของผู้ใช้ตามประเภทและวันที่สร้าง (เรียงจากใหม่ไปเก่า)
MediaSchema.index(
  { userId: 1, mediaType: 1, mediaSubType: 1, createdAt: -1 },
  { name: "UserMediaSearchIndex" }
);

// ดัชนีสำหรับค้นหาสื่อที่เกี่ยวข้องกับนิยายและยังไม่ถูกลบ (soft delete)
MediaSchema.index(
  { novelId: 1, mediaType: 1 },
  {
    name: "NovelMediaForNovelViewIndex",
    partialFilterExpression: { deletedAt: null },
  }
);

// ดัชนีสำหรับค้นหาสื่อด้วย tags และยังไม่ถูกลบ
MediaSchema.index(
  { "metadata.tags": 1 },
  {
    name: "MediaTagsSearchIndex",
    partialFilterExpression: { deletedAt: null },
  }
);

// ดัชนีสำหรับค้นหาสื่อตามสถานะและประเภท โดยรวมเฉพาะสื่อที่ยังไม่ถูกลบ
MediaSchema.index(
  { status: 1, mediaType: 1 },
  {
    name: "MediaStatusTypeIndex",
    partialFilterExpression: { deletedAt: null },
  }
);

// ดัชนีสำหรับตรวจสอบไฟล์ซ้ำด้วย checksum และยังไม่ถูกลบ
MediaSchema.index(
  { checksum: 1 },
  {
    name: "MediaChecksumIndex",
    unique: true,
    sparse: true,
    partialFilterExpression: { deletedAt: null },
  }
);

// ดัชนีสำหรับค้นหาสื่อตามวันที่อัปโหลด (เรียงจากใหม่ไปเก่า) และยังไม่ถูกลบ
MediaSchema.index(
  { uploadedAt: -1 },
  {
    name: "MediaUploadDateIndex",
    partialFilterExpression: { deletedAt: null },
  }
);

// ดัชนีสำหรับค้นหาสื่อทางการที่พร้อมใช้งานและยังไม่ถูกลบ
MediaSchema.index(
  { isOfficialResource: 1, mediaType: 1, status: 1 },
  {
    name: "AvailableOfficialMediaIndex",
    partialFilterExpression: { deletedAt: null, status: MediaStatus.AVAILABLE },
  }
);

// ดัชนีสำหรับคำนวณโควต้าพื้นที่ใช้ของผู้ใช้ และยังไม่ถูกลบ
MediaSchema.index(
  { userId: 1, fileSize: 1 },
  {
    name: "UserStorageQuotaCalculationIndex",
    partialFilterExpression: { deletedAt: null },
  }
);

// ==================================================================================================
// SECTION: Virtuals (ฟิลด์เสมือน)
// ==================================================================================================

// Virtual field: isDeleted - ตรวจสอบสถานะ soft delete
MediaSchema.virtual("isDeleted").get(function (this: IMedia) {
  return !!this.deletedAt; // true ถ้า deletedAt มีค่า
});

// Virtual field: fullStoragePath - สร้าง path เต็มสำหรับ storage
MediaSchema.virtual("fullStoragePath").get(function (this: IMedia) {
  if (this.storageProvider === MediaStorageProvider.AWS_S3 && this.storageBucket) {
    return `https://${this.storageBucket}.s3.${this.storageRegion || "your-default-region"}.amazonaws.com/${this.storagePath}`;
  }
  return this.storagePath;
});

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

// Middleware: ก่อนการบันทึก (save)
MediaSchema.pre<IMedia>("save", async function (next) {
  // 1. ตั้งค่า processedAt เมื่อ status เป็น AVAILABLE
  if (this.isModified("status") && this.status === MediaStatus.AVAILABLE && !this.processedAt) {
    this.processedAt = new Date();
  }

  // 2. สร้าง storedFileName ที่ unique
  if (this.isNew || (this.isModified("originalFileName") && !this.isModified("storedFileName"))) {
    const fileExtension = this.originalFileName.includes(".") ? this.originalFileName.split(".").pop() : "bin";
    this.storedFileName = `${new Types.ObjectId().toHexString()}_${Date.now()}.${fileExtension}`;
  }

  // 3. เตือนถ้า soft delete ไม่มี deletedByUserId
  if (this.isModified("deletedAt") && this.deletedAt && !this.deletedByUserId) {
    console.warn(`Media ${this._id} is being soft-deleted without deletedByUserId.`);
  }

  next();
});

// Middleware: ก่อนการลบถาวร (hard delete) - คอมเมนต์ไว้
// MediaSchema.pre<mongoose.Query<IMedia, IMedia>>("findOneAndDelete", async function (next) {
//   const docToDelete = await this.model.findOne(this.getFilter()).lean<IMedia>();
//   if (docToDelete) {
//     console.log(`[Media Middleware] Attempting to hard delete file: ${docToDelete.storagePath} from ${docToDelete.storageProvider}`);
//   }
//   next();
// });

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

const MediaModel = (models.Media as mongoose.Model<IMedia>) || model<IMedia>("Media", MediaSchema);

export default MediaModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1. **File Storage Abstraction Service**: สร้าง Service สำหรับจัดการไฟล์ (upload, delete, signed URLs)
// 2. **Security Best Practices**: ตรวจสอบ MIME type, virus scanning, access control, GDPR compliance
// 3. **Asynchronous Processing**: ใช้ message queue (RabbitMQ, Kafka) สำหรับสร้าง variants
// 4. **Content Delivery Network (CDN)**: ใช้ CDN สำหรับ accessUrl เพื่อ performance
// 5. **Comprehensive Usage Tracking**: อัปเดต usageCount และ lastUsedAt อย่างแม่นยำ
// 6. **Storage Quotas Management**: จัดการโควต้าพื้นที่จัดเก็บสำหรับผู้ใช้
// 7. **Content Moderation Workflow**: ใช้ AI และ manual review สำหรับตรวจสอบเนื้อหา
// 8. **Checksum Verification**: คำนวณและตรวจสอบ checksum เพื่อความสมบูรณ์ของไฟล์
// 9. **Error Handling and Retry**: จัดการข้อผิดพลาดและ retry สำหรับการอัปโหลด
// 10. **Backup and Recovery**: มีแผนสำรองข้อมูลสำหรับไฟล์สื่อ
// 11. **Detailed Logging**: บันทึกการเข้าถึงและการเปลี่ยนแปลงสื่อ
// 12. **Partial Indexes**: ใช้ partialFilterExpression เพื่อเพิ่ม performance และลดขนาด index
// ==================================================================================================