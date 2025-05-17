// src/backend/models/OfficialMedia.ts
// โมเดลสื่อทางการ (Official Media Model)
// จัดการคลังสื่อกลางที่ดูแลโดยทีมงาน NovelMaze เช่น รูปภาพพื้นหลัง, เทมเพลตตัวละคร, เพลงประกอบ, เสียงเอฟเฟกต์ ที่ผู้เขียนสามารถนำไปใช้ได้

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
// นำเข้า schema และ types ที่แชร์จาก Media.ts
import {
  MediaSubType, // อาจจะใช้ร่วมกัน หรือ OfficialMedia มี sub-type ของตัวเองที่เฉพาะเจาะจงกว่า
  MediaStorageProvider,
  IMediaVariant,
  MediaVariantSchema, // <--- Schema ที่ import มา
  IMediaMetadata,
  MediaMetadataSchema, // <--- Schema ที่ import มา
  MediaType as GeneralMediaType // Alias MediaType จาก Media.ts เพื่อไม่ให้ชนกับ OfficialMediaType
} from "./Media";
import { IUser } from "./User"; // สำหรับ uploadedByUserId, approvedByUserId, lastModifiedByUserId
import { ICategory } from "./Category"; // สำหรับ metadata.categoryIds (ถ้าใช้โครงสร้าง category เดียวกัน)

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้เฉพาะในโมเดล OfficialMedia
// ==================================================================================================

/**
 * @enum {string} OfficialMediaType
 * @description ประเภทหลักของสื่อทางการ (อาจมีการขยายเพิ่มเติมจาก MediaType ทั่วไป)
 * Enum นี้จะรวมประเภทพื้นฐานจาก GeneralMediaType และเพิ่มประเภทเฉพาะสำหรับ Official Media
 * - `template_character_art`: เทมเพลตภาพตัวละครทางการ (เช่น sprite sheet, portrait base)
 * - `template_background_art`: เทมเพลตภาพพื้นหลังทางการ (เช่น ห้องเรียน, ป่าไม้ แบบต่างๆ)
 * - `ui_theme_asset`: Asset สำหรับธีม UI ของแพลตฟอร์มที่ผู้ใช้สามารถนำไปปรับใช้ (เช่น กรอบข้อความ, ปุ่ม)
 * - `tutorial_asset`: Asset สำหรับใช้ในบทช่วยสอนการใช้งานแพลตฟอร์ม NovelMaze
 * - `marketing_material`: สื่อสำหรับใช้ในการตลาดของ NovelMaze (เช่น แบนเนอร์โปรโมท, โลโก้)
 * - `music_track`: เพลงประกอบทางการ (BGM) ที่มีลิขสิทธิ์ถูกต้อง
 * - `sound_effect`: เสียงเอฟเฟกต์ทางการ (SFX)
 * - `official_font`: ฟอนต์ทางการที่ NovelMaze จัดเตรียมไว้ให้
 * ... (รวมถึงค่าจาก GeneralMediaType เช่น IMAGE, AUDIO, VIDEO ถ้า Official Media สามารถเป็นประเภทเหล่านั้นได้โดยตรง)
 */
export enum OfficialMediaType {
  // ค่าจาก GeneralMediaType (สามารถคัดลอกมาหรืออ้างอิงได้ตามความเหมาะสม)
  IMAGE = "image", // รูปภาพทางการทั่วไป
  AUDIO = "audio", // ไฟล์เสียงทางการทั่วไป (อาจจะแยกเป็น music_track, sound_effect)
  VIDEO = "video", // ไฟล์วิดีโอทางการทั่วไป
  DOCUMENT = "document", // เอกสารทางการ เช่น คู่มือ, EULA
  FONT = "official_font", // ฟอนต์ทางการ
  // ประเภทเฉพาะของ OfficialMedia
  TEMPLATE_CHARACTER_ART = "template_character_art",
  TEMPLATE_BACKGROUND_ART = "template_background_art",
  UI_THEME_ASSET = "ui_theme_asset",
  TUTORIAL_ASSET = "tutorial_asset",
  MARKETING_MATERIAL = "marketing_material",
  MUSIC_TRACK = "music_track", // แยกจาก AUDIO ทั่วไปเพื่อความชัดเจน
  SOUND_EFFECT = "sound_effect", // แยกจาก AUDIO ทั่วไป
  OTHER_OFFICIAL = "other_official", // สำหรับประเภทอื่นๆ ที่เป็นทางการและไม่เข้าข่ายข้างต้น
}

/**
 * @enum {string} OfficialMediaStatus
 * @description สถานะของสื่อทางการในคลังของ NovelMaze
 * - `pending_review`: รอการตรวจสอบและอนุมัติจากทีมงาน NovelMaze หลังจากการอัปโหลดโดยทีมงาน
 * - `approved_for_library`: อนุมัติให้ใช้งานในคลังสาธารณะสำหรับผู้เขียนแล้ว
 * - `rejected`: ถูกปฏิเสธการนำเข้าคลัง (ควรมีเหตุผลประกอบใน statusMessage)
 * - `deprecated`: เลิกใช้งานแล้ว (อาจมีเวอร์ชันใหม่มาแทน หรือไม่เหมาะสมอีกต่อไป) แต่ยังเก็บไว้ในระบบ
 * - `archived`: เก็บเข้าคลังถาวร ไม่แสดงในส่วนใช้งานทั่วไป และไม่ควรถูกนำไปใช้ในงานใหม่
 * - `under_maintenance`: อยู่ระหว่างการปรับปรุงหรือแก้ไข (เช่น แก้ไขไฟล์, อัปเดต metadata)
 * - `processing`: (คล้ายกับ MediaStatus) ถ้ามีการประมวลผลหลังอัปโหลดโดยแอดมิน (เช่น สร้าง variants)
 * - `error_processing`: (คล้ายกับ MediaStatus) เกิดข้อผิดพลาดระหว่างการประมวลผลของ Official Media
 */
export enum OfficialMediaStatus {
  PENDING_REVIEW = "pending_review",
  APPROVED_FOR_LIBRARY = "approved_for_library",
  REJECTED = "rejected",
  DEPRECATED = "deprecated",
  ARCHIVED = "archived",
  UNDER_MAINTENANCE = "under_maintenance",
  PROCESSING = "processing",
  ERROR_PROCESSING = "error_processing",
}

/**
 * @interface IOfficialMediaCollectionInfo
 * @description ข้อมูลสังกัดคอลเลกชันของสื่อทางการ (ถ้ามีการจัดกลุ่มสื่อเป็นคอลเลกชัน)
 * @property {Types.ObjectId} collectionId - ID ของคอลเลกชันสื่อทางการ (อ้างอิง OfficialMediaCollection model ที่อาจจะต้องสร้าง)
 * @property {string} collectionName - ชื่อคอลเลกชัน (เพื่อความสะดวกในการแสดงผล, อาจ denormalize มา)
 * @property {number} [orderInCollection] - ลำดับของสื่อนี้ในคอลเลกชัน (ถ้าคอลเลกชันมีการเรียงลำดับ)
 */
export interface IOfficialMediaCollectionInfo {
  collectionId: Types.ObjectId; // ควร ref ไปยัง "OfficialMediaCollection"
  collectionName: string;
  orderInCollection?: number;
}
// Schema สำหรับข้อมูลคอลเลกชัน (embed ภายใน OfficialMedia)
const OfficialMediaCollectionInfoSchema = new Schema<IOfficialMediaCollectionInfo>(
  {
    collectionId: { type: Schema.Types.ObjectId, ref: "OfficialMediaCollection", required: true },
    collectionName: { type: String, required: true, trim: true },
    orderInCollection: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร OfficialMedia (IOfficialMedia Document Interface)
// ==================================================================================================

/**
 * @interface IOfficialMedia
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารสื่อทางการใน Collection "official_media"
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสารสื่อทางการ
 * @property {string} title - ชื่อสื่อ (สำหรับแสดงในคลังให้ผู้ใช้เห็น, **จำเป็น**)
 * @property {string} [description] - คำอธิบายสื่อ, วิธีการใช้งานเบื้องต้น, หรือแรงบันดาลใจ
 * @property {string} internalName - ชื่อภายในระบบสำหรับทีมงาน (อาจเป็นรหัสหรือชื่อเฉพาะที่ไม่ซ้ำกัน, **จำเป็น, unique**)
 * @property {string} originalFileName - ชื่อไฟล์เดิมที่ทีมงาน NovelMaze อัปโหลด
 * @property {string} storedFileName - ชื่อไฟล์ที่จัดเก็บในระบบ (ควร unique และมีการจัดการที่ดี)
 * @property {string} storagePath - Path ที่เก็บไฟล์ใน storage provider (เช่น "official_assets/backgrounds/forest_01.webp", **จำเป็น, unique**)
 * @property {MediaStorageProvider} storageProvider - ผู้ให้บริการพื้นที่จัดเก็บไฟล์ (นำเข้าจาก Media.ts)
 * @property {string} [storageBucket] - ชื่อ Bucket (สำหรับ S3, GCS, Azure)
 * @property {string} [storageRegion] - Region ของ Bucket
 * @property {string} accessUrl - URL สาธารณะสำหรับเข้าถึงไฟล์หลัก (ควรเป็น CDN URL, **จำเป็น**)
 * @property {OfficialMediaType} mediaType - ประเภทหลักของสื่อทางการ (เช่น template_character_art, music_track, **จำเป็น**)
 * @property {MediaSubType} [mediaSubType] - ประเภทย่อยของสื่อ (นำเข้าจาก Media.ts, ถ้าสามารถใช้ร่วมกันได้ หรือ OfficialMedia มี subtype ของตัวเอง)
 * @property {string} mimeType - MIME type ของไฟล์ (เช่น "image/webp", "audio/opus", **จำเป็น**)
 * @property {number} fileSize - ขนาดไฟล์หลัก (หน่วยเป็น bytes, **จำเป็น**)
 * @property {{ width: number; height: number }} [dimensions] - ขนาด (กว้างxสูง) สำหรับ image/video
 * @property {number} [duration] - ความยาว (หน่วยเป็นวินาที) สำหรับ audio/video
 * @property {string} [checksum] - Checksum ของไฟล์ (MD5, SHA256) เพื่อตรวจสอบความสมบูรณ์
 * @property {Types.DocumentArray<IMediaVariant>} [variants] - รายการเวอร์ชันต่างๆ ของสื่อ (นำโครงสร้าง IMediaVariant จาก Media.ts มาใช้)
 * @property {IMediaMetadata} [metadata] - ข้อมูล Metadata เพิ่มเติม (นำโครงสร้าง IMediaMetadata จาก Media.ts มาใช้, อาจปรับปรุง field ภายในให้เหมาะกับ Official Media)
 * @property {OfficialMediaStatus} status - สถานะของสื่อในคลัง (pending_review, approved_for_library, **จำเป็น**)
 * @property {string} [statusMessage] - ข้อความเพิ่มเติมเกี่ยวกับสถานะ (เช่น เหตุผลที่ reject, รายละเอียดการ deprecated)
 * @property {string} [version] - เวอร์ชั่นของสื่อทางการ (เช่น "1.0", "2.1.3", สำหรับการปรับปรุงแก้ไข)
 * @property {string} licenseType - ประเภทใบอนุญาตการใช้งานที่ NovelMaze มอบให้ผู้ใช้ (เช่น "NovelMaze Standard License", "Free for Commercial Use on NovelMaze") (**จำเป็น**)
 * @property {string} [usageRestrictions] - ข้อจำกัดหรือเงื่อนไขการใช้งานเพิ่มเติม (เช่น "ห้ามใช้ในเนื้อหาสำหรับผู้ใหญ่", "ต้องให้เครดิต NovelMaze")
 * @property {string} [usageInstructions] - คำแนะนำการใช้งานสื่อนี้ใน Visual Novel (เช่น "เหมาะสำหรับฉากกลางคืน", "ควรปรับสีให้เข้ากับธีม")
 * @property {string} [sourceInformation] - แหล่งที่มาของสื่อ (ถ้าเป็น asset ที่ซื้อมาหรือได้ลิขสิทธิ์มาจากบุคคลที่สาม)
 * @property {boolean} isPremiumAsset - สื่อนี้เป็น Premium Asset หรือไม่ (ผู้ใช้อาจต้องมี subscription ระดับสูง หรือจ่ายเงินเพื่อใช้งาน)
 * @property {number} popularityScore - ค่าคะแนนความนิยม (คำนวณจากการใช้งาน, ดาวน์โหลด, การถูกใจจากผู้เขียน)
 * @property {Types.ObjectId | IUser} uploadedByUserId - ID ของ Admin/ทีมงานที่อัปโหลด (อ้างอิง User model, **จำเป็น**)
 * @property {Types.ObjectId | IUser} [approvedByUserId] - ID ของ Admin ที่อนุมัติสื่อนี้เข้าคลัง
 * @property {Types.ObjectId | IUser} [lastModifiedByUserId] - ID ของ Admin ที่แก้ไขข้อมูลสื่อนี้ล่าสุด
 * @property {Types.DocumentArray<IOfficialMediaCollectionInfo>} [collections] - คอลเลกชันที่สื่อนี้สังกัดอยู่ (ถ้ามีการจัดกลุ่ม)
 * @property {Date} uploadedAt - วันที่ทีมงานอัปโหลดไฟล์เข้าระบบ (default: Date.now, **จำเป็น**)
 * @property {Date} [approvedAt] - วันที่อนุมัติสื่อเข้าคลัง
 * @property {Date} [lastReviewedAt] - วันที่ตรวจสอบหรือรีวิวล่าสุดโดยทีมงาน
 * @property {Date} [deprecatedAt] - วันที่เลิกใช้งานสื่อนี้
 * @property {string} [deprecationReason] - เหตุผลที่เลิกใช้งานสื่อนี้
 * @property {Record<string, any>} [customFields] - ฟิลด์เพิ่มเติมที่กำหนดโดยทีมงาน NovelMaze (เช่น ข้อมูลเฉพาะสำหรับ media type นั้นๆ)
 * @property {Date} createdAt - วันที่สร้างเอกสาร (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตเอกสารล่าสุด (Mongoose `timestamps`)
 */
export interface IOfficialMedia extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  internalName: string;
  originalFileName: string;
  storedFileName: string;
  storagePath: string;
  storageProvider: MediaStorageProvider; // Shared from Media.ts
  storageBucket?: string;
  storageRegion?: string;
  accessUrl: string;
  mediaType: OfficialMediaType; // Specific enum for OfficialMedia
  mediaSubType?: MediaSubType; // Shared from Media.ts, if applicable
  mimeType: string;
  fileSize: number;
  dimensions?: { width: number; height: number };
  duration?: number;
  checksum?: string;
  variants?: Types.DocumentArray<IMediaVariant>; // Shared structure from Media.ts
  metadata?: IMediaMetadata; // Shared structure from Media.ts
  status: OfficialMediaStatus;
  statusMessage?: string;
  version?: string;
  licenseType: string; // Specific license for using this official asset
  usageRestrictions?: string;
  usageInstructions?: string;
  sourceInformation?: string;
  isPremiumAsset: boolean;
  popularityScore: number;
  uploadedByUserId: Types.ObjectId | IUser;
  approvedByUserId?: Types.ObjectId | IUser;
  lastModifiedByUserId?: Types.ObjectId | IUser;
  collections?: Types.DocumentArray<IOfficialMediaCollectionInfo>;
  uploadedAt: Date;
  approvedAt?: Date;
  lastReviewedAt?: Date;
  deprecatedAt?: Date;
  deprecationReason?: string;
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ OfficialMedia (OfficialMediaSchema)
// ==================================================================================================
const OfficialMediaSchema = new Schema<IOfficialMedia>(
  {
    title: {
      type: String,
      required: [true, "กรุณาระบุชื่อสื่อทางการ (Title is required)"],
      trim: true,
      maxlength: [255, "ชื่อสื่อทางการยาวเกินไป (สูงสุด 255 ตัวอักษร)"],
      index: true,
    },
    description: { type: String, trim: true, maxlength: [2000, "คำอธิบายสื่อทางการยาวเกินไป (สูงสุด 2000 ตัวอักษร)"] },
    internalName: {
      type: String,
      required: [true, "กรุณาระบุชื่อภายในระบบ (Internal name is required)"],
      trim: true,
      unique: true,
      maxlength: [100, "ชื่อภายในระบบยาวเกินไป (สูงสุด 100 ตัวอักษร)"],
      index: true
    },
    originalFileName: {
      type: String,
      required: [true, "กรุณาระบุชื่อไฟล์เดิม (Original file name is required)"],
      trim: true,
      maxlength: [255, "ชื่อไฟล์เดิมยาวเกินไป (สูงสุด 255 ตัวอักษร)"],
    },
    storedFileName: {
      type: String,
      required: [true, "กรุณาระบุชื่อไฟล์ที่จัดเก็บ (Stored file name is required)"],
      trim: true,
      maxlength: [300, "ชื่อไฟล์ที่จัดเก็บยาวเกินไป (สูงสุด 300 ตัวอักษร)"],
      // unique: true, // อาจจะไม่จำเป็นถ้า storagePath unique แล้ว
    },
    storagePath: {
      type: String,
      required: [true, "กรุณาระบุตำแหน่งที่เก็บไฟล์ (Storage path is required)"],
      trim: true,
      unique: true, // Storage path ควร unique เสมอ
      maxlength: [1024, "Storage path ยาวเกินไป (สูงสุด 1024 ตัวอักษร)"],
      index: true,
    },
    storageProvider: {
      type: String,
      enum: Object.values(MediaStorageProvider), // ใช้ enum จาก Media.ts
      required: [true, "กรุณาระบุผู้ให้บริการ Storage (Storage provider is required)"],
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
      enum: Object.values(OfficialMediaType), // ใช้ OfficialMediaType enum ของตัวเอง
      required: [true, "กรุณาระบุประเภทหลักของสื่อทางการ (Media type is required)"],
      index: true,
    },
    mediaSubType: {
      type: String,
      enum: Object.values(MediaSubType), // ใช้ MediaSubType จาก Media.ts (ถ้าเกี่ยวข้อง)
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
    dimensions: { // สำหรับ image/video
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
      _id: false,
    },
    duration: { type: Number, min: 0 }, // หน่วยเป็นวินาที
    checksum: { type: String, trim: true, maxlength: [128, "Checksum ยาวเกินไป"], index: true, sparse: true }, // sparse ถ้า checksum ไม่ได้มีทุก record
    variants: [MediaVariantSchema], // <--- ใช้ Schema ที่ import มา
    metadata: { type: MediaMetadataSchema, default: () => ({}) }, // <--- ใช้ Schema ที่ import มา
    status: {
      type: String,
      enum: Object.values(OfficialMediaStatus),
      default: OfficialMediaStatus.PENDING_REVIEW,
      required: true,
      index: true,
    },
    statusMessage: { type: String, trim: true, maxlength: [500, "Status message ยาวเกินไป"] },
    version: { type: String, trim: true, maxlength: [50, "Version ยาวเกินไป (เช่น 1.0.0, 2.1)"] },
    licenseType: { // License ที่ NovelMaze ให้กับผู้ใช้
      type: String,
      required: [true, "กรุณาระบุประเภทใบอนุญาต (License type is required)"],
      trim: true,
      maxlength: [150, "ประเภทใบอนุญาตยาวเกินไป"],
    },
    usageRestrictions: { type: String, trim: true, maxlength: [2000, "ข้อจำกัดการใช้งานยาวเกินไป"] },
    usageInstructions: { type: String, trim: true, maxlength: [2000, "คำแนะนำการใช้งานยาวเกินไป"] },
    sourceInformation: { type: String, trim: true, maxlength: [1000, "แหล่งที่มาของสื่อยาวเกินไป (ถ้ามี)"] },
    isPremiumAsset: { type: Boolean, default: false, index: true },
    popularityScore: { type: Number, default: 0, min: 0, index: true },
    uploadedByUserId: { // ID ของทีมงานที่อัปโหลด
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุ ID ของผู้อัปโหลด (Uploader User ID is required)"],
      index: true,
    },
    approvedByUserId: { type: Schema.Types.ObjectId, ref: "User", index: true, sparse: true },
    lastModifiedByUserId: { type: Schema.Types.ObjectId, ref: "User", index: true, sparse: true },
    collections: [OfficialMediaCollectionInfoSchema], // Array ของข้อมูลคอลเลกชันที่สื่อนี้สังกัด
    uploadedAt: { type: Date, default: Date.now, required: true },
    approvedAt: { type: Date, index: true },
    lastReviewedAt: { type: Date, index: true },
    deprecatedAt: { type: Date, index: true },
    deprecationReason: { type: String, trim: true, maxlength: [500, "เหตุผลที่เลิกใช้งานยาวเกินไป"] },
    customFields: { type: Schema.Types.Mixed }, // สำหรับข้อมูลเพิ่มเติมที่อาจจะไม่ตายตัว
  },
  {
    timestamps: true, // เพิ่ม createdAt และ updatedAt โดยอัตโนมัติ
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

// ดัชนีพื้นฐานสำหรับกรองสื่อทางการ
OfficialMediaSchema.index({ mediaType: 1, status: 1, isPremiumAsset: 1 }, { name: "OfficialMediaFilterIndex" });

// ---- แก้ไข Partial Indexes ----
// ดัชนีสำหรับค้นหาสื่อที่อนุมัติแล้วด้วย tags (Partial Index)
// จะ индексироватьเฉพาะเอกสารที่มี status เป็น APPROVED_FOR_LIBRARY
OfficialMediaSchema.index(
  { "metadata.tags": 1, status: 1 }, // 'status: 1' เพื่อให้ฟิลด์ status อยู่ในคีย์ของดัชนี
  {
    name: "ApprovedOfficialMediaTagsIndex",
    partialFilterExpression: { status: OfficialMediaStatus.APPROVED_FOR_LIBRARY } // เงื่อนไขสำหรับ partial index
  }
);

// ดัชนีสำหรับค้นหาสื่อที่อนุมัติแล้วด้วย categoryIds (Partial Index)
OfficialMediaSchema.index(
  { "metadata.categoryIds": 1, status: 1 },
  {
    name: "ApprovedOfficialMediaCategoryIndex",
    partialFilterExpression: { status: OfficialMediaStatus.APPROVED_FOR_LIBRARY }
  }
);

// ดัชนีสำหรับ license type และ status (อาจไม่จำเป็นต้องเป็น partial ถ้า query ตาม licenseType บ่อยๆ โดยไม่สน status อื่น)
OfficialMediaSchema.index({ licenseType: 1, status: 1 }, { name: "OfficialMediaLicenseStatusIndex" });

// ดัชนีสำหรับค้นหาสื่อที่อนุมัติแล้วเรียงตามความนิยม (Partial Index)
OfficialMediaSchema.index(
  { popularityScore: -1, status: 1 },
  {
    name: "PopularApprovedOfficialMediaIndex",
    partialFilterExpression: { status: OfficialMediaStatus.APPROVED_FOR_LIBRARY }
  }
);

// ดัชนีสำหรับวันที่อัปโหลด
OfficialMediaSchema.index({ uploadedAt: -1 }, { name: "OfficialMediaUploadDateIndex" });

// ดัชนีสำหรับค้นหาสื่อในคอลเลกชันที่อนุมัติแล้ว (Partial Index)
OfficialMediaSchema.index(
  { "collections.collectionId": 1, status: 1 },
  {
    name: "ApprovedOfficialMediaByCollectionIndex",
    partialFilterExpression: { status: OfficialMediaStatus.APPROVED_FOR_LIBRARY }
  }
);

// Text index สำหรับการค้นหาด้วยข้อความ (ปรับปรุงให้ครอบคลุมและมีประสิทธิภาพ)
OfficialMediaSchema.index(
  { title: "text", description: "text", internalName: "text", "metadata.tags": "text", "metadata.title": "text", "metadata.description": "text", "metadata.artist": "text" },
  {
    name: "OfficialMediaTextSearchIndex",
    weights: {
      title: 10,
      internalName: 8,
      "metadata.title": 7,
      "metadata.tags": 6,
      "metadata.artist": 5,
      description: 4,
      "metadata.description": 3
    },
    default_language: "none", // ใช้ "none" ถ้าไม่ต้องการ stemming หรือ "thai" ถ้า MongoDB version รองรับและต้องการ Thai stemming
                               // การใช้ "none" จะทำให้ค้นหาแบบ case-insensitive และ diacritic-insensitive (ขึ้นอยู่กับ collation ของ collection ด้วย)
  }
);

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

OfficialMediaSchema.pre<IOfficialMedia>("save", async function (next) {
  // 1. การตรวจสอบ Role ของ User (uploadedByUserId, etc.) ควรทำใน Service Layer ก่อนเรียก save
  //    เพื่อความปลอดภัยและการจัดการ error ที่ดีกว่า

  // 2. ถ้า status เปลี่ยนเป็น 'approved_for_library' และยังไม่มี approvedAt, ให้ตั้งค่า approvedAt และ approvedByUserId (ถ้ามี context)
  if (this.isModified("status") && this.status === OfficialMediaStatus.APPROVED_FOR_LIBRARY && !this.approvedAt) {
    this.approvedAt = new Date();
    this.lastReviewedAt = new Date(); // การอนุมัติถือเป็นการรีวิวล่าสุด
    // this.approvedByUserId = currentUser._id; // ควรตั้งค่าจาก context ผู้ใช้ที่ทำการอนุมัติใน service layer
  }

  // 3. ถ้า status เปลี่ยนเป็น 'deprecated' และยังไม่มี deprecatedAt, ให้ตั้งค่า
  if (this.isModified("status") && this.status === OfficialMediaStatus.DEPRECATED && !this.deprecatedAt) {
    this.deprecatedAt = new Date();
  }

  // 4. ถ้ามีการแก้ไขข้อมูลสำคัญ (ที่ไม่ใช่แค่ status หรือ timestamps) ควรบันทึก lastModifiedByUserId และอัปเดต lastReviewedAt
  if (this.isModified() && !this.isNew) {
    // this.lastModifiedByUserId = currentUser._id; // ควรตั้งค่าจาก context ผู้ใช้ที่กำลังแก้ไขใน service layer
    if (this.status === OfficialMediaStatus.APPROVED_FOR_LIBRARY) { // รีวิวเฉพาะ asset ที่ยังใช้งานอยู่
        this.lastReviewedAt = new Date();
    }
  }

  // 5. (ตัวอย่าง) สร้าง storedFileName ที่ unique ถ้ายังไม่มี หรือ originalFileName เปลี่ยน
  //    Logic นี้อาจจะซับซ้อนและควรอยู่ใน service layer เพื่อจัดการ file system หรือ S3 key generation
  if (this.isNew || (this.isModified("originalFileName") && !this.isModified("storedFileName"))) {
    const fileExtension = this.originalFileName.includes('.') ? this.originalFileName.split(".").pop() || "bin" : "bin";
    // สร้าง baseName จาก internalName หรือ title เพื่อให้ชื่อไฟล์สื่อความหมายและ unique
    const baseName = (this.internalName || this.title || new Types.ObjectId().toHexString())
                        .replace(/[^a-zA-Z0-9.-]/g, "_").toLowerCase(); // Sanitize, allow dots and hyphens in base name
    this.storedFileName = `official_${baseName}_${Date.now()}.${fileExtension}`;
  }

  next();
});

// Middleware: ก่อนการลบถาวร (hard delete)
// OfficialMediaSchema.pre<mongoose.Query<IOfficialMedia, IOfficialMedia>>("findOneAndDelete", async function (next) {
//   const docToDelete = await this.model.findOne(this.getFilter()).lean<IOfficialMedia>();
//   if (docToDelete) {
//     // console.log(`[OfficialMedia Middleware] Attempting to hard delete official media file: ${docToDelete.storagePath}`);
//     // await actualFileDeletionService(docToDelete.storageProvider, docToDelete.storagePath, docToDelete.storageBucket);
//     // ... delete variants ...
//   }
//   next();
// });

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

const OfficialMediaModel = (models.OfficialMedia as mongoose.Model<IOfficialMedia>) || model<IOfficialMedia>("OfficialMedia", OfficialMediaSchema);

export default OfficialMediaModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **OfficialMediaCollection Model**: สร้าง Model `OfficialMediaCollection` แยกเพื่อจัดการคอลเลกชันอย่างละเอียด
//     (เช่น คอลเลกชัน "ตัวละครยุคกลาง", "เพลงประกอบแฟนตาซี").
// 2.  **Advanced Search & Filtering**: เพิ่มความสามารถในการค้นหาและกรองสื่อทางการที่ซับซ้อนขึ้น
//     (เช่น ค้นหาตามสีเด่น, สไตล์ภาพ, mood ของเพลง, หรือ metadata ที่ custom).
// 3.  **Digital Asset Management (DAM) Features**:
//     - Version Control เต็มรูปแบบสำหรับสื่อทางการ (เช่น การย้อนกลับไปเวอร์ชันเก่า, การเปรียบเทียบเวอร์ชัน).
//     - AI Tagging และ Image Recognition เพื่อช่วยในการจัดหมวดหมู่และค้นหาอัตโนมัติ.
// 4.  **Content Delivery Network (CDN) Integration**: ตรวจสอบว่า `accessUrl` ชี้ไปยัง CDN และมีการจัดการ cache ที่เหมาะสมเพื่อประสิทธิภาพสูงสุด.
// 5.  **Analytics Dashboard**: แดชบอร์ดสำหรับทีมงาน NovelMaze เพื่อดูสถิติการใช้งาน, ความนิยม, และ feedback ของสื่อทางการแต่ละชิ้น.
// 6.  **Bulk Operations Tools**: เครื่องมือสำหรับ Admin ในการจัดการสื่อจำนวนมาก (อัปโหลดเป็นชุด, แก้ไข metadata พร้อมกัน, จัดเข้าคอลเลกชัน).
// 7.  **Detailed Licensing Management**: ระบบจัดการใบอนุญาตที่ซับซ้อนขึ้น (เช่น attribution requirements แบบละเอียด, วันหมดอายุของ license).
// 8.  **User Feedback Loop**: ช่องทางให้ผู้เขียนนิยายสามารถให้ feedback, รายงานปัญหา, หรือ request สื่อทางการใหม่ๆ ได้โดยตรง.
// 9.  **Watermarking (Optional)**: สำหรับ Premium Assets หรือสื่อที่ต้องการป้องกันการคัดลอก อาจพิจารณาระบบ Watermarking แบบ dynamic.
// 10. **Checksum Verification**: ควรมีการคำนวณและตรวจสอบ checksum ของไฟล์หลังอัปโหลดและอาจจะมีการตรวจสอบเป็นระยะเพื่อความสมบูรณ์ของข้อมูล.
// 11. **Role-Based Access Control (RBAC)**: การกำหนดสิทธิ์สำหรับทีมงานในการจัดการ Official Media (ใครอัปโหลดได้, ใครอนุมัติได้, ใครแก้ไขได้).
// 12. **Automated Variant Generation & Optimization**: ระบบอัตโนมัติในการสร้าง variants (thumbnails, previews, optimized versions) และการ optimize ไฟล์เมื่อมีการอัปโหลดสื่อใหม่.
// 13. **Storage Lifecycle Management**: สำหรับ Cloud Storage เช่น S3, อาจจะตั้งค่านโยบาย Lifecycle เพื่อย้ายไฟล์ที่ไม่ค่อยได้ใช้ไปยัง storage class ที่ถูกกว่า.
// ==================================================================================================