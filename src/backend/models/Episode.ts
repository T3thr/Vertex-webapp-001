// src/backend/models/Episode.ts
// โมเดลตอนของนิยาย (Episode Model) - จัดการข้อมูลของตอนต่างๆ ในนิยายสำหรับแพลตฟอร์ม DivWy

import mongoose, { Schema, model, models, Types, Document, HydratedDocument } from "mongoose";
// Import NovelModel และ INovel interface เพื่อใช้ใน method และ type hinting
// การ import model โดยตรงอาจทำให้เกิด circular dependency ถ้า NovelModel ก็ import EpisodeModel
// ดังนั้นจะใช้ models[name] || model(name, schema) pattern ภายใน method
import { INovel, IMonetizationSettings } from "./Novel"; // ใช้ INovel และ IMonetizationSettings สำหรับ type hinting

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Episode
// ==================================================================================================

/**
 * @enum {string} EpisodeStatus
 * @description สถานะของตอนนิยาย
 * - `draft`: ฉบับร่าง, ผู้เขียนกำลังแก้ไข ยังไม่เผยแพร่
 * - `published`: เผยแพร่แล้ว ผู้อ่านสามารถเข้าถึงได้ตาม accessType
 * - `scheduled`: ตั้งเวลาเผยแพร่ (จะเปลี่ยนเป็น published เมื่อถึงเวลาที่กำหนด)
 * - `unpublished`: ยกเลิกการเผยแพร่ (เคยเผยแพร่แล้ว) ผู้เขียนนำออกจากสาธารณะ
 * - `archived`: เก็บเข้าคลัง (ไม่แสดงผล แต่ข้อมูลยังอยู่สำหรับผู้เขียน)
 * - `pending_review`: รอการตรวจสอบ (เช่น เนื้อหาที่อาจผิดกฎ หรือรอการอนุมัติจากทีมงาน)
 * - `banned_by_admin`: ถูกระงับโดยผู้ดูแลระบบ (เช่น เนื้อหาละเมิดนโยบาย)
 * - `revision_needed`: ต้องการการแก้ไข (Admin แจ้งให้ผู้เขียนแก้ไขก่อนเผยแพร่)
 */
export enum EpisodeStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  SCHEDULED = "scheduled",
  UNPUBLISHED = "unpublished",
  ARCHIVED = "archived",
  PENDING_REVIEW = "pending_review",
  BANNED_BY_ADMIN = "banned_by_admin",
  REVISION_NEEDED = "revision_needed",
}

/**
 * @enum {string} EpisodeAccessType
 * @description ประเภทการเข้าถึงเนื้อหาของตอน
 * - `free`: อ่านฟรี ไม่ต้องจ่ายเงินหรือใช้เหรียญ
 * - `paid_unlock`: จ่ายครั้งเดียวเพื่อปลดล็อกการเข้าถึงถาวร (ใช้เหรียญ)
 * - `premium_access`: เฉพาะสมาชิกระดับพรีเมียมเท่านั้นที่เข้าถึงได้ (ถ้ามีระบบสมาชิก)
 * - `ad_supported_free`: อ่านฟรี แต่มีโฆษณาแสดง
 * - `early_access_paid`: สิทธิพิเศษในการอ่านก่อนใครสำหรับผู้ที่จ่าย (อาจเป็นเหรียญหรือสมาชิก)
 */
export enum EpisodeAccessType {
  FREE = "free",
  PAID_UNLOCK = "paid_unlock",
  PREMIUM_ACCESS = "premium_access",
  AD_SUPPORTED_FREE = "ad_supported_free",
  EARLY_ACCESS_PAID = "early_access_paid",
}

// ==================================================================================================
// SECTION: อินเทอร์เฟซย่อย (Sub-Interfaces) สำหรับโครงสร้างข้อมูลที่ซับซ้อนภายใน Episode
// ==================================================================================================

/**
 * @interface IEpisodeStats
 * @description สถิติต่างๆ ที่เกี่ยวข้องกับตอนนิยายนี้โดยเฉพาะ
 * @property {number} viewsCount - จำนวนการเข้าชมทั้งหมดของตอนนี้ (รวมการเข้าชมซ้ำ)
 * @property {number} uniqueViewersCount - จำนวนผู้อ่านที่ไม่ซ้ำกันของตอนนี้
 * @property {number} likesCount - จำนวนการกดถูกใจตอนนี้ (อัปเดตจาก Like model)
 * @property {number} commentsCount - จำนวนความคิดเห็นทั้งหมดในตอนนี้ (อัปเดตจาก Comment model)
 * @property {number} totalWords - จำนวนคำทั้งหมดในตอนนี้ (คำนวณจาก Scenes ที่ประกอบกันเป็นตอนนี้)
 * @property {number} estimatedReadingTimeMinutes - เวลาโดยประมาณที่ใช้ในการอ่านตอนนี้ (นาที, คำนวณจาก totalWords)
 * @property {number} purchasesCount - จำนวนครั้งที่ตอนนี้ถูกซื้อหรือปลดล็อก (ถ้าเป็นตอนที่ต้องจ่าย)
 * @property {number} averageReadingProgress - เปอร์เซ็นต์ความคืบหน้าในการอ่านเฉลี่ยของผู้ที่เข้ามาอ่านตอนนี้
 * @property {number} dropOffRate - อัตราการหยุดอ่านกลางคันสำหรับตอนนี้ (ถ้ามีการเก็บข้อมูล)
 */
export interface IEpisodeStats {
  viewsCount: number;
  uniqueViewersCount: number;
  likesCount: number;
  commentsCount: number;
  totalWords: number;
  estimatedReadingTimeMinutes: number;
  purchasesCount: number;
  averageReadingProgress?: number;
  dropOffRate?: number;
}

/**
 * @interface IContentWarningOverride
 * @description การตั้งค่าคำเตือนเนื้อหาเฉพาะสำหรับตอนนี้ ที่อาจแตกต่างจากคำเตือนหลักของนิยาย
 * @property {boolean} hasSpecificWarnings - ตอนนี้มีคำเตือนเนื้อหาเฉพาะหรือไม่
 * @property {Types.ObjectId[]} [contentWarningCategoryIds] - ID ของหมวดหมู่คำเตือนเนื้อหาเฉพาะสำหรับตอนนี้ (อ้างอิง Category model)
 * @property {string} [customWarningDescription] - คำอธิบายคำเตือนเพิ่มเติมเฉพาะตอนนี้
 */
export interface IContentWarningOverride {
  hasSpecificWarnings: boolean;
  contentWarningCategoryIds?: Types.ObjectId[];
  customWarningDescription?: string;
}

/**
 * @interface IEpisodeSentiment
 * @description ข้อมูลเกี่ยวกับ Sentiment หรืออารมณ์โดยรวมของตอนนี้
 * ข้อมูลนี้อาจจะมาจากการกำหนดของผู้เขียน หรือการวิเคราะห์เบื้องต้นโดย AI
 * Sentiment ที่ละเอียดจากการอ่านของผู้ใช้แต่ละคนควรเก็บใน UserEpisodeProgress.ts หรือ ReadingAnalytic_EventStream.ts
 * @property {string[]} [authorDefinedEmotionTags] - Tags อารมณ์หลักที่ผู้เขียนกำหนดสำหรับตอนนี้ (เช่น "happy_ending", "cliffhanger", "thought_provoking")
 * @property {number} [authorDefinedIntensityScore] - (Optional) คะแนนความเข้มข้นของอารมณ์ที่ผู้เขียนให้ (เช่น 1-5)
 * @property {string} [aiPreliminaryOverallSentiment] - (Optional, AI-Generated) Sentiment โดยรวมเบื้องต้นที่ AI วิเคราะห์จากเนื้อหาตอน (เช่น "positive", "negative", "neutral")
 * @property {number} [aiPreliminarySentimentScore] - (Optional, AI-Generated) คะแนน Sentiment จาก AI (เช่น -1 ถึง 1)
 */
export interface IEpisodeSentiment {
    authorDefinedEmotionTags?: string[];
    authorDefinedIntensityScore?: number;
    aiPreliminaryOverallSentiment?: "positive" | "negative" | "neutral" | "mixed";
    aiPreliminarySentimentScore?: number;
}


// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร Episode (IEpisode Document Interface)
// ==================================================================================================

/**
 * @interface IEpisode
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารตอนนิยายใน Collection "episodes"
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสารตอนนิยาย
 * @property {Types.ObjectId | INovel} novelId - ID ของนิยายแม่ ที่ตอนนี้เป็นส่วนหนึ่ง (อ้างอิง Novel model, **สำคัญมาก**)
 * อาจถูก populate เพื่อเข้าถึงข้อมูลนิยาย
 * @property {Types.ObjectId} authorId - ID ของผู้เขียนตอนนี้ (โดยปกติคือผู้เขียนนิยาย แต่รองรับกรณี co-author เขียนบางตอน)
 * @property {string} title - ชื่อตอน (เช่น "บทที่ 1: การเริ่มต้น", "ตอนพิเศษ: วันหยุดฤดูร้อน")
 * @property {number} episodeOrder - ลำดับของตอนในนิยาย (เช่น 1, 2, 3.1, 3.2) **ควร unique ภายใน novelId เดียวกัน**
 * @property {number} [volumeNumber] - (Optional) หมายเลขเล่มหรือภาคที่ตอนนี้สังกัดอยู่ (ถ้ามีการแบ่งเป็นเล่ม)
 * @property {Types.ObjectId} [firstSceneId] - ID ของ Scene แรกสุดในตอนนี้ (อ้างอิง Scene model, เป็นจุดเริ่มต้นของเนื้อหาตอน)
 * @property {Types.ObjectId[]} sceneIds - IDs ของ Scenes ทั้งหมดในตอนนี้
 * @property {EpisodeStatus} status - สถานะปัจจุบันของตอน (เช่น "draft", "published", "scheduled")
 * @property {EpisodeAccessType} accessType - ประเภทการเข้าถึงเนื้อหาของตอน (เช่น "free", "paid_unlock")
 * @property {number} [priceCoins] - ราคาเป็นเหรียญสำหรับการปลดล็อกตอนนี้ (ถ้า accessType เป็น "paid_unlock")
 * ราคานี้เป็นราคาเฉพาะของตอนนี้ และอาจถูก override โดยโปรโมชันระดับนิยาย
 * @property {Date} [scheduledPublishAt] - วันและเวลาที่ตั้งค่าให้เผยแพร่ตอน (ถ้า status เป็น "scheduled")
 * @property {Date} [publishedAt] - วันและเวลาที่ตอนถูกเผยแพร่จริง (เมื่อ status เป็น "published" ครั้งแรก)
 * @property {string} [teaserText] - ข้อความเกริ่นนำหรือสรุปย่อของตอน (สำหรับแสดงในสารบัญหรือการโปรโมท)
 * @property {IEpisodeStats} stats - สถิติต่างๆ ที่เกี่ยวข้องกับตอนนี้
 * @property {IEpisodeSentiment} [sentimentInfo] - (เพิ่มใหม่) ข้อมูลเกี่ยวกับ Sentiment หรืออารมณ์โดยรวมของตอนนี้
 * @property {string} [authorNotesBefore] - หมายเหตุจากผู้เขียนที่แสดงก่อนเริ่มเนื้อหาตอน
 * @property {string} [authorNotesAfter] - หมายเหตุจากผู้เขียนหรือคำทิ้งท้ายที่แสดงหลังจบเนื้อหาตอน
 * @property {IContentWarningOverride} [contentWarningOverride] - การตั้งค่าคำเตือนเนื้อหาเฉพาะสำหรับตอนนี้
 * @property {string} [adminNotes] - หมายเหตุจาก Admin (สำหรับทีมงานภายใน, `select: false`)
 * @property {Date} lastContentUpdatedAt - วันที่เนื้อหาของตอนนี้ (เช่น title, scenes, authorNotes) มีการอัปเดตล่าสุด
 * @property {Types.ObjectId} [nextEpisodeId] - ID ของตอนถัดไป (สำหรับ navigation, อาจ denormalize หรือ query)
 * @property {Types.ObjectId} [previousEpisodeId] - ID ของตอนก่อนหน้า (สำหรับ navigation, อาจ denormalize หรือ query)
 * @property {boolean} isPreviewAllowed - อนุญาตให้แสดงตัวอย่างเนื้อหาบางส่วนหรือไม่ (สำหรับตอนที่ต้องจ่ายเงิน)
 * @property {number} [wordCountLastCalculatedAt] - วันที่คำนวณจำนวนคำล่าสุด (เพื่อช่วยในการ re-calculation)
 * @property {Date} createdAt - วันที่สร้างเอกสารตอน (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตเอกสารตอนล่าสุด (Mongoose `timestamps`)
 *
 * @method getEffectivePrice - คำนวณราคาที่ต้องจ่ายจริงสำหรับตอนนี้ โดยพิจารณาทั้งโปรโมชันระดับนิยาย, ราคาเฉพาะตอน, และราคาดีฟอลต์ของนิยาย
 * @method getOriginalPrice - คำนวณราคาดั้งเดิมของตอนนี้ โดยไม่รวมโปรโมชันระดับนิยาย
 */
export interface IEpisode extends Document {
  _id: Types.ObjectId;
  novelId: Types.ObjectId | INovel; // สามารถเป็น ObjectId หรือ populated INovel
  authorId: Types.ObjectId;
  title: string;
  slug: string; // เพิ่ม slug สำหรับ SEO-friendly URL
  episodeOrder: number;
  volumeNumber?: number;
  firstSceneId?: Types.ObjectId;
  sceneIds: Types.ObjectId[];
  status: EpisodeStatus;
  accessType: EpisodeAccessType;
  priceCoins?: number;
  originalPriceCoins?: number; // เพิ่มราคาเดิมสำหรับแสดงส่วนลด
  promotions?: Array<{
    promotionId: Types.ObjectId;
    promotionType: 'percentage_discount' | 'fixed_discount' | 'early_bird' | 'bundle';
    discountPercentage?: number;
    discountAmount?: number;
    startDate: Date;
    endDate: Date;
    description?: string;
  }>; // เพิ่มโปรโมชั่นระดับตอน
  earlyAccessDuration?: number; // จำนวนวันสำหรับ early access
  earlyAccessStartDate?: Date;
  earlyAccessEndDate?: Date;
  scheduledPublishAt?: Date;
  publishedAt?: Date;
  teaserText?: string;
  stats: IEpisodeStats;
  sentimentInfo?: IEpisodeSentiment;
  authorNotesBefore?: string;
  authorNotesAfter?: string;
  contentWarningOverride?: IContentWarningOverride;
  adminNotes?: string;
  lastContentUpdatedAt: Date;
  nextEpisodeId?: Types.ObjectId;
  previousEpisodeId?: Types.ObjectId;
  isPreviewAllowed: boolean;
  wordCountLastCalculatedAt?: Date;
  changelog?: Array<{
    version: string;
    date: Date;
    changes: string;
  }>; // เพิ่มประวัติการแก้ไข
  createdAt: Date;
  updatedAt: Date;

  // Methods
  getEffectivePrice: () => Promise<number>;
  getOriginalPrice: () => Promise<number>;
}

// ==================================================================================================
// SECTION: Schema ย่อย (Sub-Schemas) สำหรับ Mongoose
// ==================================================================================================

const EpisodeStatsSchema = new Schema<IEpisodeStats>(
  {
    viewsCount: { type: Number, default: 0, min: 0 },
    uniqueViewersCount: { type: Number, default: 0, min: 0 },
    likesCount: { type: Number, default: 0, min: 0 },
    commentsCount: { type: Number, default: 0, min: 0 },
    totalWords: { type: Number, default: 0, min: 0 },
    estimatedReadingTimeMinutes: { type: Number, default: 0, min: 0 },
    purchasesCount: { type: Number, default: 0, min: 0 },
    averageReadingProgress: { type: Number, min: 0, max: 100 },
    dropOffRate: { type: Number, min: 0, max: 100 },
  },
  { _id: false } // ไม่สร้าง _id สำหรับ sub-document นี้
);

const ContentWarningOverrideSchema = new Schema<IContentWarningOverride>(
  {
    hasSpecificWarnings: { type: Boolean, default: false, required: true },
    contentWarningCategoryIds: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    customWarningDescription: { type: String, trim: true, maxlength: [1000, "คำอธิบายคำเตือนเพิ่มเติมต้องไม่เกิน 1000 ตัวอักษร"] },
  },
  { _id: false }
);

// Schema สำหรับข้อมูล Sentiment ของตอน
const EpisodeSentimentSchema = new Schema<IEpisodeSentiment>(
    {
        authorDefinedEmotionTags: [{ type: String, trim: true, lowercase: true, maxlength: [50, "Emotion tag is too long"] }],
        authorDefinedIntensityScore: { type: Number, min: 1, max: 5 },
        aiPreliminaryOverallSentiment: { type: String, enum: ["positive", "negative", "neutral", "mixed"] },
        aiPreliminarySentimentScore: { type: Number, min: -1, max: 1 },
    },
    { _id: false }
);


// ==================================================================================================
// SECTION: Schema หลักสำหรับ Episode (EpisodeSchema)
// ==================================================================================================
const EpisodeSchema = new Schema<IEpisode>(
  {
    novelId: {
      type: Schema.Types.ObjectId,
      ref: "Novel", // อ้างอิงไปยัง Model 'Novel'
      required: [true, "กรุณาระบุ ID ของนิยาย (Novel ID is required)"],
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User", // อ้างอิงไปยัง Model 'User'
      required: [true, "กรุณาระบุ ID ของผู้เขียน (Author ID is required)"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "กรุณาระบุชื่อตอน (Title is required)"],
      trim: true,
      minlength: [1, "ชื่อตอนต้องมีอย่างน้อย 1 ตัวอักษร"],
      maxlength: [255, "ชื่อตอนต้องไม่เกิน 255 ตัวอักษร"],
    },
    slug: {
      type: String,
      required: [true, "กรุณาระบุ Slug (Slug is required)"],
      trim: true,
      lowercase: true,
      maxlength: [300, "Slug ต้องไม่เกิน 300 ตัวอักษร"],
      index: true,
    },
    episodeOrder: {
      type: Number,
      required: [true, "กรุณาระบุลำดับตอน (Episode order is required)"],
      min: 0, // อนุญาตให้มีตอนที่ 0 (เช่น Prologue) หรือตอนพิเศษที่ episodeOrder เป็น 0.x
    },
    volumeNumber: { type: Number, min: 1 },
    firstSceneId: {
      type: Schema.Types.ObjectId,
      ref: "Scene",
      index: true,
      validate: {
        validator: async function (value: Types.ObjectId) {
          if (!value) return true;
          const scene = await models.Scene.findById(value);
          return !!scene;
        },
        message: "firstSceneId must be a valid Scene ID",
      },
    },
    sceneIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Scene" }],
      default: [],
    },
    status: {
      type: String,
      enum: Object.values(EpisodeStatus),
      default: EpisodeStatus.DRAFT,
      required: true,
      index: true,
    },
    accessType: {
      type: String,
      enum: Object.values(EpisodeAccessType),
      default: EpisodeAccessType.FREE,
      required: true,
    },
    priceCoins: {
      type: Number,
      min: 0,
      default: 0,
      validate: {
        validator: function (this: HydratedDocument<IEpisode>, value: number | undefined) {
          // ราคาจำเป็นต้องมีค่า >= 0 หากตอนนั้นเป็นประเภทที่ต้องจ่ายเงิน
          if ((this.accessType === EpisodeAccessType.PAID_UNLOCK || this.accessType === EpisodeAccessType.EARLY_ACCESS_PAID) && (value === undefined || value < 0)) {
            // ถ้า accessType เป็น paid แต่ priceCoins ไม่ได้กำหนด หรือน้อยกว่า 0, จะถือว่าไม่ถูกต้อง
            // อย่างไรก็ตาม logic การคำนวณราคาที่ effectivePrice จะ fallback ไปใช้ defaultNovelPrice หรือ 0
            // การ validate นี้เพื่อให้แน่ใจว่าถ้าจะใส่ราคาเฉพาะตอน ต้องใส่ให้ถูกต้อง
            // return false; // อาจจะเข้มงวดเกินไป เพราะถ้าไม่ใส่ จะใช้ default จาก novel
          }
          return true;
        },
        // message: "กรุณาระบุราคาเป็นเหรียญให้ถูกต้อง (>=0) สำหรับตอนที่ตั้งใจให้มีราคาเฉพาะ",
      },
    },
    originalPriceCoins: {
      type: Number,
      min: 0,
      default: function(this: HydratedDocument<IEpisode>) {
        return this.priceCoins || 0;
      },
    },
    promotions: [{
      promotionId: { type: Schema.Types.ObjectId, default: () => new Types.ObjectId() },
      promotionType: {
        type: String,
        enum: ['percentage_discount', 'fixed_discount', 'early_bird', 'bundle'],
        required: true,
      },
      discountPercentage: { type: Number, min: 0, max: 100 },
      discountAmount: { type: Number, min: 0 },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      description: { type: String, trim: true, maxlength: 500 },
    }],
    earlyAccessDuration: { type: Number, min: 1 },
    earlyAccessStartDate: { type: Date },
    earlyAccessEndDate: { type: Date },
    scheduledPublishAt: { type: Date, index: true },
    publishedAt: { type: Date, index: true },
    teaserText: { type: String, trim: true, maxlength: [1000, "ข้อความเกริ่นนำต้องไม่เกิน 1000 ตัวอักษร"] },
    stats: { type: EpisodeStatsSchema, default: () => ({ viewsCount: 0, uniqueViewersCount: 0, likesCount: 0, commentsCount: 0, totalWords: 0, estimatedReadingTimeMinutes: 0, purchasesCount: 0 }) },
    sentimentInfo: { type: EpisodeSentimentSchema, default: () => ({}) },
    authorNotesBefore: { type: String, trim: true, maxlength: [5000, "หมายเหตุจากผู้เขียน (ก่อนเริ่มตอน) ต้องไม่เกิน 5000 ตัวอักษร"] },
    authorNotesAfter: { type: String, trim: true, maxlength: [5000, "หมายเหตุจากผู้เขียน (หลังจบตอน) ต้องไม่เกิน 5000 ตัวอักษร"] },
    contentWarningOverride: { type: ContentWarningOverrideSchema, default: () => ({ hasSpecificWarnings: false }) },
    adminNotes: { type: String, trim: true, maxlength: [5000, "หมายเหตุจาก Admin ต้องไม่เกิน 5000 ตัวอักษร"], select: false },
    lastContentUpdatedAt: { type: Date, default: Date.now, required: true, index: true },
    nextEpisodeId: { type: Schema.Types.ObjectId, ref: "Episode", default: null },
    previousEpisodeId: { type: Schema.Types.ObjectId, ref: "Episode", default: null },
    isPreviewAllowed: { type: Boolean, default: true }, // โดย default อนุญาตให้ดูตัวอย่างได้
    wordCountLastCalculatedAt: { type: Date },
    changelog: [{
      version: { type: String, required: true, trim: true },
      date: { type: Date, required: true, default: Date.now },
      changes: { type: String, required: true, trim: true, maxlength: 1000 },
    }],
  },
  {
    timestamps: true, // เพิ่ม createdAt และ updatedAt โดยอัตโนมัติ
    toObject: { virtuals: true, getters: true }, // getters: true เพื่อให้ virtuals ทำงานเมื่อ toObject
    toJSON: { virtuals: true, getters: true },   // getters: true เพื่อให้ virtuals ทำงานเมื่อ toJSON
  }
);

// ==================================================================================================
// SECTION: Methods (สำหรับคำนวณราคา)
// ==================================================================================================

/**
 * @method getEffectivePrice
 * @description คำนวณ "ราคาที่จ่ายจริง" ของตอน โดยพิจารณาตามลำดับความสำคัญ:
 * 1. โปรโมชันระดับนิยาย (Novel-level Promotion)
 * 2. ราคาเฉพาะของตอน (Episode-specific Price)
 * 3. ราคาเริ่มต้นของตอนในนิยาย (Novel's Default Episode Price)
 * 4. ฟรี (ถ้า accessType เป็น FREE หรือไม่สามารถหาราคาได้)
 * @returns {Promise<number>} ราคาที่ต้องจ่ายจริงเป็นเหรียญ
 */
EpisodeSchema.methods.getEffectivePrice = async function (this: HydratedDocument<IEpisode>): Promise<number> {
    // ชั้นที่ 0: ตอนที่กำหนดเป็น FREE จะฟรีเสมอ
    if (this.accessType === EpisodeAccessType.FREE) {
        return 0;
    }

    let novelMonetizationSettings: IMonetizationSettings | undefined;
    const NovelModelInstance = models.Novel || model<INovel>("Novel");

    // ตรวจสอบว่า novelId populated และมี monetizationSettings หรือไม่
    if (this.novelId && (this.novelId as INovel).monetizationSettings) {
        // ถ้า novelId ถูก populate มาพร้อม object INovel ที่มี monetizationSettings
        novelMonetizationSettings = (this.novelId as INovel).monetizationSettings;
    } else if (mongoose.Types.ObjectId.isValid(this.novelId.toString())) {
        // ถ้า novelId เป็น ObjectId, query เฉพาะ field ที่ต้องการจาก Novel model
        // ใช้ .lean() เพื่อ performance เนื่องจากต้องการแค่ข้อมูล ไม่ต้องการ Mongoose document features
        const novelData = await NovelModelInstance.findById(this.novelId).select("monetizationSettings").lean<Pick<INovel, 'monetizationSettings'>>();
        novelMonetizationSettings = novelData?.monetizationSettings;
    }

    // หากไม่พบ novel หรือ monetizationSettings ของนิยาย (ซึ่งไม่ควรเกิดขึ้นกับตอนที่ผูกกับนิยายอย่างถูกต้อง)
    // ให้ fallback ไปใช้ราคาของตอนเองถ้าเป็นแบบจ่าย หรือ 0 ถ้าไม่ระบุ
    if (!novelMonetizationSettings) {
        if (this.accessType === EpisodeAccessType.PAID_UNLOCK || this.accessType === EpisodeAccessType.EARLY_ACCESS_PAID) {
            return (this.priceCoins !== undefined && this.priceCoins > 0) ? this.priceCoins : 0;
        }
        return 0; // กรณีอื่นๆ ให้เป็นฟรี
    }

    const now = new Date();
    const promo = novelMonetizationSettings.activePromotion;

    // ชั้นที่ 1: ราคาโปรโมชันระดับนิยาย (Novel-level Promotion)
    if (
        promo &&
        promo.isActive &&
        promo.promotionalPriceCoins !== undefined && promo.promotionalPriceCoins >= 0 &&
        (!promo.promotionStartDate || new Date(promo.promotionStartDate) <= now) &&
        (!promo.promotionEndDate || new Date(promo.promotionEndDate) >= now)
    ) {
        // ถ้ามีโปรโมชันระดับนิยายที่ active และกำหนดราคาไว้, ราคานี้จะถูกใช้
        return promo.promotionalPriceCoins;
    }

    // ชั้นที่ 2: โปรโมชั่นระดับตอน (Episode-level Promotions)
    if (this.promotions && this.promotions.length > 0) {
        const activePromotion = this.promotions.find(promo => {
            return promo.startDate <= now && promo.endDate >= now;
        });
        
        if (activePromotion) {
            const basePrice = this.priceCoins || 0;
            if (activePromotion.promotionType === 'percentage_discount' && activePromotion.discountPercentage) {
                return Math.round(basePrice * (1 - activePromotion.discountPercentage / 100));
            } else if (activePromotion.promotionType === 'fixed_discount' && activePromotion.discountAmount) {
                return Math.max(0, basePrice - activePromotion.discountAmount);
            }
        }
    }

    // ชั้นที่ 3: ราคาเฉพาะของตอน (Episode-specific Price)
    // ใช้สำหรับตอนที่ต้องจ่ายเงิน (PAID_UNLOCK, EARLY_ACCESS_PAID)
    if (this.accessType === EpisodeAccessType.PAID_UNLOCK || this.accessType === EpisodeAccessType.EARLY_ACCESS_PAID) {
        if (this.priceCoins !== undefined && this.priceCoins > 0) {
            return this.priceCoins;
        }
    }

    // ชั้นที่ 3: ราคาเริ่มต้นของตอนในนิยาย (Novel's Default Episode Price)
    // ใช้สำหรับตอนที่ต้องจ่ายเงิน และไม่มีราคาเฉพาะตอน หรือราคาเฉพาะตอนเป็น 0 (หรือไม่ได้กำหนด)
    if (this.accessType === EpisodeAccessType.PAID_UNLOCK || this.accessType === EpisodeAccessType.EARLY_ACCESS_PAID) {
        if (novelMonetizationSettings.defaultEpisodePriceCoins !== undefined && novelMonetizationSettings.defaultEpisodePriceCoins >= 0) {
            return novelMonetizationSettings.defaultEpisodePriceCoins;
        }
    }

    // ชั้นที่ 4: ฟรี (Fallback)
    // หาก accessType ไม่ใช่ FREE แต่ไม่สามารถหาราคาจากเงื่อนไขข้างต้นได้, ให้ถือว่าเป็นฟรี (0 เหรียญ)
    return 0;
};

/**
 * @method getOriginalPrice
 * @description คำนวณ "ราคาดั้งเดิม" ของตอน โดยไม่รวมโปรโมชันระดับนิยาย
 * ใช้สำหรับแสดงราคาที่อาจถูกขีดฆ่าเมื่อมีโปรโมชัน
 * ลำดับ: 1. ราคาเฉพาะตอน, 2. ราคาดีฟอลต์ของนิยาย
 * @returns {Promise<number>} ราคาดั้งเดิมเป็นเหรียญ
 */
EpisodeSchema.methods.getOriginalPrice = async function (this: HydratedDocument<IEpisode>): Promise<number> {
    if (this.accessType === EpisodeAccessType.FREE) {
        return 0;
    }

    let novelMonetizationSettings: IMonetizationSettings | undefined;
    const NovelModelInstance = models.Novel || model<INovel>("Novel");

    if (this.novelId && (this.novelId as INovel).monetizationSettings) {
        novelMonetizationSettings = (this.novelId as INovel).monetizationSettings;
    } else if (mongoose.Types.ObjectId.isValid(this.novelId.toString())) {
        const novelData = await NovelModelInstance.findById(this.novelId).select("monetizationSettings").lean<Pick<INovel, 'monetizationSettings'>>();
        novelMonetizationSettings = novelData?.monetizationSettings;
    }

    if (this.accessType === EpisodeAccessType.PAID_UNLOCK || this.accessType === EpisodeAccessType.EARLY_ACCESS_PAID) {
        // 1. ราคาเฉพาะของตอน (Episode-specific Price)
        if (this.priceCoins !== undefined && this.priceCoins > 0) {
            return this.priceCoins;
        }
        // 2. ราคาเริ่มต้นของตอนในนิยาย (Novel's Default Episode Price)
        if (novelMonetizationSettings?.defaultEpisodePriceCoins !== undefined && novelMonetizationSettings.defaultEpisodePriceCoins >= 0) {
            return novelMonetizationSettings.defaultEpisodePriceCoins;
        }
    }
    // Fallback to free if no price found for paid types
    return 0;
};


// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

EpisodeSchema.index({ novelId: 1, episodeOrder: 1 }, { unique: true, name: "NovelEpisodeOrderUniqueIndex" });
EpisodeSchema.index({ novelId: 1, slug: 1 }, { unique: true, name: "NovelEpisodeSlugUniqueIndex" });
EpisodeSchema.index({ novelId: 1, status: 1, publishedAt: -1},{ name: "NovelPublishedEpisodesSortIndex" });
EpisodeSchema.index({ novelId: 1, authorId: 1},{ name: "NovelAuthorEpisodesIndex" });
EpisodeSchema.index({ novelId: 1, accessType: 1},{ name: "NovelEpisodeAccessTypeIndex" });
EpisodeSchema.index({ scheduledPublishAt: 1, status: 1},{ name: "ScheduledEpisodesIndex" });
// Index สำหรับ sentimentInfo (ถ้ามีการ query บ่อย)
EpisodeSchema.index({ novelId: 1, "sentimentInfo.aiPreliminaryOverallSentiment": 1},{ name: "NovelEpisodeAISentimentIndex" });


// ==================================================================================================
// SECTION: Virtuals (ฟิลด์เสมือน)
// ==================================================================================================

EpisodeSchema.virtual("episodeUrl").get(function (this: HydratedDocument<IEpisode>) {
  // Use the new URL structure with episode slug
  const novelObject = this.novelId as INovel;
  if (novelObject && novelObject.slug && this.slug) {
    return `/read/${novelObject.slug}/${this.episodeOrder}-${this.slug}`;
  }
  // Fallback URL if novelId is not populated or doesn't have slugs
  return `/read/${this.novelId.toString()}/${this.episodeOrder}`;
});

/**
 * @virtual isTrulyFree
 * @description ตรวจสอบว่าตอนนี้ฟรีจริงๆ หรือไม่ โดยพิจารณาจาก accessType และราคาที่คำนวณได้
 * หมายเหตุ: virtual นี้ไม่ได้ทำการ query DB เพื่อคำนวณ effective price
 * หากต้องการความแม่นยำสูงสุด ควรใช้ episode.getEffectivePrice() === 0
 * virtual นี้เป็นการตรวจสอบเบื้องต้นจากข้อมูลที่มีใน episode document เอง
 */
EpisodeSchema.virtual("isTrulyFree").get(function (this: HydratedDocument<IEpisode>): boolean {
  if (this.accessType === EpisodeAccessType.FREE) return true;
  if (
    (this.accessType === EpisodeAccessType.PAID_UNLOCK || this.accessType === EpisodeAccessType.EARLY_ACCESS_PAID) &&
    (this.priceCoins === undefined || this.priceCoins === 0)
  ) {
    // ถ้าเป็นตอนที่ต้องจ่ายแต่ไม่ได้ตั้งราคาไว้ (priceCoins เป็น 0 หรือ undefined)
    // มันอาจจะยังไม่ฟรีจริง หากนิยายมี defaultEpisodePriceCoins หรือโปรโมชันที่ทำให้มีราคา
    // การตรวจสอบนี้ไม่สมบูรณ์เท่า getEffectivePrice()
    // เพื่อความง่าย virtual นี้จะถือว่า "อาจจะฟรี" ถ้า episode ไม่มีราคาของตัวเอง
    // แต่ควรใช้ getEffectivePrice() เพื่อยืนยัน
    return true; // อาจจะไม่แม่นยำ 100% ควรใช้ getEffectivePrice() เพื่อความถูกต้อง
  }
  return false;
});

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

EpisodeSchema.pre<HydratedDocument<IEpisode>>("save", async function (next) {
  // Generate slug from title if modified or new
  if (this.isModified("title") || this.isNew) {
    const generateSlug = (text: string): string => {
      if (!text) return `episode-${new Types.ObjectId().toHexString().slice(-8)}`;

      const slug = text
        .toString()
        .normalize('NFC')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\p{L}\p{N}\p{M}-]+/gu, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');

      if (!slug) {
        return `episode-${new Types.ObjectId().toHexString().slice(-8)}`;
      }

      return slug.substring(0, 280);
    };

    const baseSlug = generateSlug(this.title);
    let finalSlug = baseSlug;
    let count = 0;
    const EpisodeModelInstance = models.Episode || model<IEpisode>("Episode");

    // Check uniqueness of slug within the novel
    while (true) {
      const existingEpisode = await EpisodeModelInstance.findOne({
        slug: finalSlug,
        novelId: this.novelId,
        _id: { $ne: this._id }
      });
      if (!existingEpisode) break;
      count++;
      finalSlug = `${baseSlug}-${count}`;
    }
    this.slug = finalSlug;
  }

  if (this.isModified("title") ||
      this.isModified("firstSceneId") || // หากมีการเปลี่ยนแปลงเนื้อหาหลัก (Scene แรก)
      this.isModified("teaserText") ||
      this.isModified("authorNotesBefore") ||
      this.isModified("authorNotesAfter") ||
      this.isModified("sentimentInfo")) { // เพิ่ม sentimentInfo ในการตรวจสอบ
    this.lastContentUpdatedAt = new Date();
  }

  // อัปเดต publishedAt เมื่อ status เป็น PUBLISHED ครั้งแรก
  if (this.isModified("status") && this.status === EpisodeStatus.PUBLISHED && !this.publishedAt) {
    this.publishedAt = new Date();
    this.lastContentUpdatedAt = new Date(); // ถือว่ามีการอัปเดต "เนื้อหา" ที่เผยแพร่
  }

  // ตรวจสอบความถูกต้องของการตั้งเวลาเผยแพร่
  if (this.status === EpisodeStatus.SCHEDULED && !this.scheduledPublishAt) {
    return next(new mongoose.Error.ValidatorError({ message: "Scheduled publish date is required for scheduled episodes. กรุณาระบุวันที่ตั้งเวลาเผยแพร่สำหรับตอนที่ตั้งเวลาไว้" }));
  }
  // ถ้า status ไม่ใช่ SCHEDULED ให้ล้างค่า scheduledPublishAt (ถ้ามี)
  if (this.status !== EpisodeStatus.SCHEDULED) {
      this.scheduledPublishAt = undefined; // หรือ null
  }

  // Validate early access dates
  if (this.accessType === EpisodeAccessType.EARLY_ACCESS_PAID) {
    if (!this.earlyAccessStartDate || !this.earlyAccessEndDate) {
      return next(new mongoose.Error.ValidatorError({ 
        message: "Early access start and end dates are required for early access episodes." 
      }));
    }
    if (this.earlyAccessEndDate <= this.earlyAccessStartDate) {
      return next(new mongoose.Error.ValidatorError({ 
        message: "Early access end date must be after start date." 
      }));
    }
  }

  // Validate promotions
  if (this.promotions && this.promotions.length > 0) {
    for (const promo of this.promotions) {
      if (promo.endDate <= promo.startDate) {
        return next(new mongoose.Error.ValidatorError({ 
          message: "Promotion end date must be after start date." 
        }));
      }
      if (promo.promotionType === 'percentage_discount' && !promo.discountPercentage) {
        return next(new mongoose.Error.ValidatorError({ 
          message: "Discount percentage is required for percentage discount promotions." 
        }));
      }
      if (promo.promotionType === 'fixed_discount' && !promo.discountAmount) {
        return next(new mongoose.Error.ValidatorError({ 
          message: "Discount amount is required for fixed discount promotions." 
        }));
      }
    }
  }

  next();
});

// Function to update novel aggregates after an episode is saved or deleted
async function updateNovelAggregates(episodeDoc: HydratedDocument<IEpisode> | Pick<IEpisode, '_id'|'novelId'|'status'|'episodeOrder'|'publishedAt'|'previousEpisodeId'|'nextEpisodeId'>, operation: "save" | "delete") {
  const NovelModelInstance = models.Novel || model<INovel>("Novel");
  const EpisodeModelInstance = models.Episode || model<IEpisode>("Episode");

  if (!NovelModelInstance || !episodeDoc?.novelId) {
    console.warn("[updateNovelAggregates] NovelModel or episodeDoc.novelId is missing. Skipping.");
    return;
  }

  const novelId = episodeDoc.novelId;

  // Recalculate total and published episodes count
  const totalEpisodes = await EpisodeModelInstance.countDocuments({ novelId });
  const publishedEpisodes = await EpisodeModelInstance.countDocuments({ novelId, status: EpisodeStatus.PUBLISHED });

  const updateData: any = {
    totalEpisodesCount: totalEpisodes,
    publishedEpisodesCount: publishedEpisodes,
    lastContentUpdatedAt: new Date(), // Novel's content is affected by episode changes
  };

  // Find first and last published episode for the novel
  const episodesForNovel = await EpisodeModelInstance
    .find({ novelId, status: EpisodeStatus.PUBLISHED })
    .sort({ episodeOrder: 1 }) // Sort by episodeOrder to find first and last
    .select("_id episodeOrder publishedAt")
    .lean<Pick<IEpisode, '_id'|'episodeOrder'|'publishedAt'>[]>();

  if (episodesForNovel.length > 0) {
    updateData.firstEpisodeId = episodesForNovel[0]._id;
    // The last episode in the sorted list is the one with the highest episodeOrder among published ones
    updateData["stats.lastPublishedEpisodeAt"] = episodesForNovel[episodesForNovel.length - 1].publishedAt;
  } else {
    updateData.firstEpisodeId = null;
    updateData["stats.lastPublishedEpisodeAt"] = null;
  }

  await NovelModelInstance.findByIdAndUpdate(novelId, { $set: updateData });
  console.log(`[updateNovelAggregates] Updated novel ${novelId} with counts: total=${totalEpisodes}, published=${publishedEpisodes}`);


  // Update next/previous episode links
  // This part is complex and needs to be handled carefully, especially with reordering or sparse orders.
  // The current logic updates the saved/deleted doc and its immediate neighbors.
  if (operation === "save" && episodeDoc.status === EpisodeStatus.PUBLISHED) { // Only link published episodes
      const currentEpisodeOrder = (episodeDoc as IEpisode).episodeOrder; // Ensure episodeDoc is full doc for save

      // Find previous published episode
      const prevEp = await EpisodeModelInstance.findOne({
          novelId,
          status: EpisodeStatus.PUBLISHED,
          episodeOrder: { $lt: currentEpisodeOrder }
      }).sort({ episodeOrder: -1 }).select("_id episodeOrder");

      // Find next published episode
      const nextEp = await EpisodeModelInstance.findOne({
          novelId,
          status: EpisodeStatus.PUBLISHED,
          episodeOrder: { $gt: currentEpisodeOrder }
      }).sort({ episodeOrder: 1 }).select("_id episodeOrder");

      // Update current episode's links
      await EpisodeModelInstance.findByIdAndUpdate((episodeDoc as IEpisode)._id, {
          $set: {
              previousEpisodeId: prevEp ? prevEp._id : null,
              nextEpisodeId: nextEp ? nextEp._id : null
          }
      });

      // Update neighbors
      if(prevEp) await EpisodeModelInstance.findByIdAndUpdate(prevEp._id, { $set: { nextEpisodeId: (episodeDoc as IEpisode)._id }});
      if(nextEp) await EpisodeModelInstance.findByIdAndUpdate(nextEp._id, { $set: { previousEpisodeId: (episodeDoc as IEpisode)._id }});

  } else if (operation === "delete") {
      // When an episode is deleted, its previous and next episodes need to be linked to each other.
      const deletedEpisode = episodeDoc as Pick<IEpisode, 'previousEpisodeId'|'nextEpisodeId'|'novelId'>; // Cast for clarity
      if (deletedEpisode.previousEpisodeId && deletedEpisode.nextEpisodeId) {
          await EpisodeModelInstance.findByIdAndUpdate(deletedEpisode.previousEpisodeId, { $set: { nextEpisodeId: deletedEpisode.nextEpisodeId }});
          await EpisodeModelInstance.findByIdAndUpdate(deletedEpisode.nextEpisodeId, { $set: { previousEpisodeId: deletedEpisode.previousEpisodeId }});
      } else if (deletedEpisode.previousEpisodeId) { // Deleted was the last episode
          await EpisodeModelInstance.findByIdAndUpdate(deletedEpisode.previousEpisodeId, { $set: { nextEpisodeId: null }});
      } else if (deletedEpisode.nextEpisodeId) { // Deleted was the first episode
          await EpisodeModelInstance.findByIdAndUpdate(deletedEpisode.nextEpisodeId, { $set: { previousEpisodeId: null }});
      }
  }
}

EpisodeSchema.post<HydratedDocument<IEpisode>>("save", async function (doc: HydratedDocument<IEpisode>) {
  try {
    await updateNovelAggregates(doc, "save");
    // Also update writer stats on novel, as episode count/last published date might change
    const novel = await (models.Novel || model<INovel>("Novel")).findById(doc.novelId).select("author").lean<Pick<INovel, 'author'>>();
    if (novel && novel.author) {
        // Assuming updateWriterStatsAfterNovelChange is exported from Novel.ts or a shared utils
        // For now, we'll skip direct call if it causes circular dependency issues at import level
        // This is better handled by a job queue or if Novel model is updated, its post-save hook handles writer stats.
        // The updateNovelAggregates already updates Novel's lastContentUpdatedAt, which could trigger Novel's post-save hook if structured that way.
    }

  } catch (error) {
    console.error("[Episode Post-Save Hook] Error during novel aggregate update:", error);
  }
});

EpisodeSchema.pre<mongoose.Query<IEpisode, IEpisode>>("findOneAndDelete", async function (next) {
  try {
    const docToDelete = await this.model.findOne(this.getQuery()).lean<HydratedDocument<IEpisode>>();
    if (docToDelete) {
      (this as any)._docToDeleteForAggregates = docToDelete; // Store for post-hook
    }
    next();
  } catch (error: any) {
    console.error("[Episode Pre-FindOneAndDelete Hook] Error fetching doc to delete:", error);
    next(error);
  }
});

EpisodeSchema.post<mongoose.Query<IEpisode, IEpisode>>("findOneAndDelete", async function (_result: any, next:(err?: mongoose.Error) => void) {
  const deletedDoc = (this as any)._docToDeleteForAggregates as HydratedDocument<IEpisode> | undefined;
  if (deletedDoc) {
    try {
      await updateNovelAggregates(deletedDoc, "delete");
    } catch (error: any) {
      console.error("[Episode Post-FindOneAndDelete Hook] Error during novel aggregate update after deletion:", error);
    }
    // Clear the temporary variable
    delete (this as any)._docToDeleteForAggregates;
  }
  next();
});

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

const EpisodeModel = (models.Episode as mongoose.Model<IEpisode>) || model<IEpisode>("Episode", EpisodeSchema);

export default EpisodeModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Content Management (Scenes)**: เนื้อหาหลักของตอน (text, images, choices) จะถูกจัดการผ่าน Scene model ที่เชื่อมโยงกับ Episode นี้ผ่าน `firstSceneId` และลำดับของ Scene ภายในตอน
// 2.  **Stats Aggregation**: สถิติเช่น `likesCount`, `commentsCount` ควรถูกอัปเดตผ่าน middleware หรือ triggers จาก Model ที่เกี่ยวข้อง (Like, Comment) เพื่อความแม่นยำและลดภาระการคำนวณที่ Episode model โดยตรง
// 3.  **Word Count Calculation**: `stats.totalWords` ควรมีกลไกการคำนวณที่แม่นยำจาก Scene ทั้งหมดในตอน และอาจมีการ re-calculate เป็นระยะ หรือเมื่อ Scene มีการเปลี่ยนแปลง `wordCountLastCalculatedAt` ช่วยในการติดตาม
// 4.  **Reading Time Estimation**: `stats.estimatedReadingTimeMinutes` ควรคำนวณจาก `totalWords` โดยใช้อัตราการอ่านเฉลี่ย (เช่น 200-250 WPM)
// 5.  **Novel Model Dependency**: Middleware ที่อัปเดต Novel model (`updateNovelAggregates`) มีความสำคัญมาก ต้องทดสอบให้แน่ใจว่าทำงานถูกต้องในทุกกรณี (save, delete) และจัดการกับ circular dependencies ในการ import model อย่างระมัดระวัง
// 6.  **Navigation (next/previousEpisodeId)**: การ denormalize `nextEpisodeId` และ `previousEpisodeId` ช่วยเพิ่ม performance ในการโหลดหน้าตอน แต่ต้องมีการจัดการอัปเดตที่ถูกต้องเมื่อมีการเพิ่ม/ลบ/เปลี่ยนลำดับตอน หรือเปลี่ยนสถานะการเผยแพร่
// 7.  **Error Handling in Hooks**: Middleware ควรมีการจัดการ error ที่ดี เพื่อไม่ให้กระทบต่อการทำงานหลัก
// 8.  **Transactionality**: สำหรับการอัปเดตข้อมูลข้ามหลาย collection (เช่น Episode และ Novel) ควรพิจารณาใช้ transactions ของ MongoDB (ถ้า replica set ถูกตั้งค่าไว้) เพื่อ data consistency โดยเฉพาะใน operation ที่ซับซ้อน
// 9.  **Scheduled Publishing Job**: การเปลี่ยน status จาก "scheduled" เป็น "published" อัตโนมัติตาม `scheduledPublishAt` ต้องใช้ job scheduler ภายนอก (เช่น cron job, Agenda, BullMQ) ที่คอยตรวจสอบและดำเนินการ
// 10. **Integration with Reading Analytics**: ข้อมูลจาก Episode model (เช่น `totalWords`, `estimatedReadingTimeMinutes`) สามารถใช้เป็น input สำหรับระบบ Reading Analytics ได้
// 11. **Episode Sentiment**: Field `sentimentInfo` ที่เพิ่มเข้ามามีไว้สำหรับเก็บ sentiment โดยรวมของตอน ที่อาจจะมาจากการกำหนดของผู้เขียน หรือการวิเคราะห์เบื้องต้นจาก AI (เช่น จากเนื้อหาของตอน).
//     `episodeCompletionSentiment` ที่แท้จริงของผู้ใช้นั้นเป็นผลลัพธ์จากการอ่าน และควรถูกคำนวณและจัดเก็บใน `UserEpisodeProgress.ts` (ถ้ามี) หรือได้มาจากการวิเคราะห์ `ReadingAnalytic_EventStream.ts`
//     โดยเฉพาะข้อมูลจาก `makeChoiceDetails` และ `readSceneDetails.dominantEmotionsInSceneText` ตามที่ระบุใน `ReadingAnalytic_EventStream_Schema.txt`.
// 12. **Pricing**: `episode.getEffectivePrice()` จะคำนวณราคาที่ต้องจ่ายจริง และ `episode.getOriginalPrice()` จะให้ราคาดั้งเดิม (สำหรับการแสดงส่วนลด)
//     โดยพิจารณาทั้งโปรโมชันนิยาย ราคาเฉพาะตอน และราคาดีฟอลต์ของนิยาย. ส่วน `Novel.currentEpisodePriceCoins` เป็น virtual ที่ให้ภาพรวมนโยบายราคาของนิยาย.
// ==================================================================================================