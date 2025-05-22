// src/backend/models/Episode.ts
// โมเดลตอนของนิยาย (Episode Model) - จัดการข้อมูลของตอนต่างๆ ในนิยายสำหรับแพลตฟอร์ม NovelMaze

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
// Import NovelModel เพื่อใช้ใน middleware สำหรับอัปเดตข้อมูลใน Novel document ที่เกี่ยวข้อง
// import NovelModel from "./Novel"; // ใช้ Novel.ts ที่อัปเดตแล้ว

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
 * @property {Types.ObjectId} novelId - ID ของนิยายแม่ ที่ตอนนี้เป็นส่วนหนึ่ง (อ้างอิง Novel model, **สำคัญมาก**)
 * @property {Types.ObjectId} authorId - ID ของผู้เขียนตอนนี้ (โดยปกติคือผู้เขียนนิยาย แต่รองรับกรณี co-author เขียนบางตอน)
 * @property {string} title - ชื่อตอน (เช่น "บทที่ 1: การเริ่มต้น", "ตอนพิเศษ: วันหยุดฤดูร้อน")
 * @property {number} episodeOrder - ลำดับของตอนในนิยาย (เช่น 1, 2, 3.1, 3.2) **ควร unique ภายใน novelId เดียวกัน**
 * @property {number} [volumeNumber] - (Optional) หมายเลขเล่มหรือภาคที่ตอนนี้สังกัดอยู่ (ถ้ามีการแบ่งเป็นเล่ม)
 * @property {Types.ObjectId} [firstSceneId] - ID ของ Scene แรกสุดในตอนนี้ (อ้างอิง Scene model, เป็นจุดเริ่มต้นของเนื้อหาตอน)
 * @property {EpisodeStatus} status - สถานะปัจจุบันของตอน (เช่น "draft", "published", "scheduled")
 * @property {EpisodeAccessType} accessType - ประเภทการเข้าถึงเนื้อหาของตอน (เช่น "free", "paid_unlock")
 * @property {number} [priceCoins] - ราคาเป็นเหรียญสำหรับการปลดล็อกตอนนี้ (ถ้า accessType เป็น "paid_unlock")
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
 */
export interface IEpisode extends Document {
  _id: Types.ObjectId;
  novelId: Types.ObjectId;
  authorId: Types.ObjectId;
  title: string;
  episodeOrder: number;
  volumeNumber?: number;
  firstSceneId?: Types.ObjectId;
  status: EpisodeStatus;
  accessType: EpisodeAccessType;
  priceCoins?: number;
  scheduledPublishAt?: Date;
  publishedAt?: Date;
  teaserText?: string;
  stats: IEpisodeStats;
  sentimentInfo?: IEpisodeSentiment; // << เพิ่ม field ใหม่
  authorNotesBefore?: string;
  authorNotesAfter?: string;
  contentWarningOverride?: IContentWarningOverride;
  adminNotes?: string;
  lastContentUpdatedAt: Date;
  nextEpisodeId?: Types.ObjectId;
  previousEpisodeId?: Types.ObjectId;
  isPreviewAllowed: boolean;
  wordCountLastCalculatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
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
      ref: "Novel", // อ้างอิงไปยัง Model 'Novel' ที่อัปเกรดแล้ว
      required: [true, "กรุณาระบุ ID ของนิยาย (Novel ID is required)"],
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User", // อ้างอิงไปยัง Model 'User' ที่อัปเกรดแล้ว
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
    episodeOrder: {
      type: Number,
      required: [true, "กรุณาระบุลำดับตอน (Episode order is required)"],
      min: 0, // อนุญาตให้มีตอนที่ 0 (เช่น Prologue) หรือตอนพิเศษที่ episodeOrder เป็น 0.x
    },
    volumeNumber: { type: Number, min: 1 },
    firstSceneId: { type: Schema.Types.ObjectId, ref: "Scene" }, // อ้างอิง Scene model
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
        validator: function (this: IEpisode, value: number | undefined) {
          if ((this.accessType === EpisodeAccessType.PAID_UNLOCK || this.accessType === EpisodeAccessType.EARLY_ACCESS_PAID) && (value === undefined || value < 0)) {
            return false;
          }
          return true;
        },
        message: "กรุณาระบุราคาเป็นเหรียญให้ถูกต้องสำหรับตอนที่ต้องจ่าย (Price in coins is required and must be non-negative for paid episodes)",
      },
    },
    scheduledPublishAt: { type: Date, index: true },
    publishedAt: { type: Date, index: true },
    teaserText: { type: String, trim: true, maxlength: [1000, "ข้อความเกริ่นนำต้องไม่เกิน 1000 ตัวอักษร"] },
    stats: { type: EpisodeStatsSchema, default: () => ({ viewsCount: 0, uniqueViewersCount: 0, likesCount: 0, commentsCount: 0, totalWords: 0, estimatedReadingTimeMinutes: 0, purchasesCount: 0 }) },
    sentimentInfo: { type: EpisodeSentimentSchema, default: () => ({}) }, // << เพิ่ม schema และ default
    authorNotesBefore: { type: String, trim: true, maxlength: [5000, "หมายเหตุจากผู้เขียน (ก่อนเริ่มตอน) ต้องไม่เกิน 5000 ตัวอักษร"] },
    authorNotesAfter: { type: String, trim: true, maxlength: [5000, "หมายเหตุจากผู้เขียน (หลังจบตอน) ต้องไม่เกิน 5000 ตัวอักษร"] },
    contentWarningOverride: { type: ContentWarningOverrideSchema, default: () => ({ hasSpecificWarnings: false }) },
    adminNotes: { type: String, trim: true, maxlength: [5000, "หมายเหตุจาก Admin ต้องไม่เกิน 5000 ตัวอักษร"], select: false },
    lastContentUpdatedAt: { type: Date, default: Date.now, required: true, index: true },
    nextEpisodeId: { type: Schema.Types.ObjectId, ref: "Episode", default: null },
    previousEpisodeId: { type: Schema.Types.ObjectId, ref: "Episode", default: null },
    isPreviewAllowed: { type: Boolean, default: true }, // โดย default อนุญาตให้ดูตัวอย่างได้
    wordCountLastCalculatedAt: { type: Date },
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

EpisodeSchema.index({ novelId: 1, episodeOrder: 1 }, { unique: true, name: "NovelEpisodeOrderUniqueIndex" });
EpisodeSchema.index({ novelId: 1, status: 1, publishedAt: -1},{ name: "NovelPublishedEpisodesSortIndex" });
EpisodeSchema.index({ novelId: 1, authorId: 1},{ name: "NovelAuthorEpisodesIndex" });
EpisodeSchema.index({ novelId: 1, accessType: 1},{ name: "NovelEpisodeAccessTypeIndex" });
EpisodeSchema.index({ scheduledPublishAt: 1, status: 1},{ name: "ScheduledEpisodesIndex" });
// Index สำหรับ sentimentInfo (ถ้ามีการ query บ่อย)
EpisodeSchema.index({ novelId: 1, "sentimentInfo.aiPreliminaryOverallSentiment": 1},{ name: "NovelEpisodeAISentimentIndex" });


// ==================================================================================================
// SECTION: Virtuals (ฟิลด์เสมือน)
// ==================================================================================================

EpisodeSchema.virtual("episodeUrl").get(function (this: IEpisode) {
  const novelSlug = (this.novelId as any)?.slug;
  if (novelSlug) {
    return `/novels/${novelSlug}/episodes/${this.episodeOrder}`;
  }
  return `/n/${this.novelId}/e/${this.episodeOrder}`;
});

EpisodeSchema.virtual("isTrulyFree").get(function (this: IEpisode) {
  return this.accessType === EpisodeAccessType.FREE ||
         (this.accessType === EpisodeAccessType.PAID_UNLOCK && (this.priceCoins === undefined || this.priceCoins === 0));
});

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

EpisodeSchema.pre<IEpisode>("save", async function (next) {
  if (this.isModified("title") ||
      this.isModified("firstSceneId") ||
      this.isModified("teaserText") ||
      this.isModified("authorNotesBefore") ||
      this.isModified("authorNotesAfter") ||
      this.isModified("sentimentInfo")) { // เพิ่ม sentimentInfo ในการตรวจสอบ
    this.lastContentUpdatedAt = new Date();
  }

  if (this.isModified("status") && this.status === EpisodeStatus.PUBLISHED && !this.publishedAt) {
    this.publishedAt = new Date();
    this.lastContentUpdatedAt = new Date();
  }

  if (this.status === EpisodeStatus.SCHEDULED && !this.scheduledPublishAt) {
    return next(new Error("Scheduled publish date is required for scheduled episodes. กรุณาระบุวันที่ตั้งเวลาเผยแพร่สำหรับตอนที่ตั้งเวลาไว้"));
  }
  if (this.status !== EpisodeStatus.SCHEDULED) {
      this.scheduledPublishAt = undefined;
  }

  next();
});

async function updateNovelAggregates(episodeDoc: IEpisode, operation: "save" | "delete") {
  const NovelModelInstance = models.Novel || model("Novel");
  if (!NovelModelInstance || !episodeDoc?.novelId) return;

  const novelId = episodeDoc.novelId;

  const totalEpisodes = await (models.Episode || model<IEpisode>("Episode")).countDocuments({ novelId });
  const publishedEpisodes = await (models.Episode || model<IEpisode>("Episode")).countDocuments({ novelId, status: EpisodeStatus.PUBLISHED });

  const updateData: any = {
    totalEpisodesCount: totalEpisodes,
    publishedEpisodesCount: publishedEpisodes,
    lastContentUpdatedAt: new Date(),
  };

  const episodesForNovel = await (models.Episode || model<IEpisode>("Episode"))
    .find({ novelId, status: EpisodeStatus.PUBLISHED })
    .sort({ episodeOrder: 1 })
    .select("_id episodeOrder publishedAt")
    .lean();

  if (episodesForNovel.length > 0) {
    updateData.firstEpisodeId = episodesForNovel[0]._id;
    updateData["stats.lastPublishedEpisodeAt"] = episodesForNovel[episodesForNovel.length - 1].publishedAt;
  } else {
    updateData.firstEpisodeId = null;
    updateData["stats.lastPublishedEpisodeAt"] = null;
  }

  await NovelModelInstance.findByIdAndUpdate(novelId, { $set: updateData });

  if (operation === "save") {
      const currentEpisodeOrder = episodeDoc.episodeOrder;
      const prevEp = await (models.Episode || model<IEpisode>("Episode")).findOne({ novelId, episodeOrder: { $lt: currentEpisodeOrder } }).sort({ episodeOrder: -1 }).select("_id");
      const nextEp = await (models.Episode || model<IEpisode>("Episode")).findOne({ novelId, episodeOrder: { $gt: currentEpisodeOrder } }).sort({ episodeOrder: 1 }).select("_id");

      await (models.Episode || model<IEpisode>("Episode")).findByIdAndUpdate(episodeDoc._id, {
          $set: {
              previousEpisodeId: prevEp ? prevEp._id : null,
              nextEpisodeId: nextEp ? nextEp._id : null
          }
      });
      if(prevEp) await (models.Episode || model<IEpisode>("Episode")).findByIdAndUpdate(prevEp._id, { $set: { nextEpisodeId: episodeDoc._id }});
      if(nextEp) await (models.Episode || model<IEpisode>("Episode")).findByIdAndUpdate(nextEp._id, { $set: { previousEpisodeId: episodeDoc._id }});
  }
}

EpisodeSchema.post<IEpisode>("save", async function (doc) {
  await updateNovelAggregates(this, "save");
});

EpisodeSchema.pre<mongoose.Query<IEpisode, IEpisode>>("findOneAndDelete", async function (next) {
  const docToDelete = await this.model.findOne(this.getQuery()).lean();
  if (docToDelete) {
    (this as any)._docToDelete = docToDelete;
  }
  next();
});

EpisodeSchema.post<mongoose.Query<IEpisode, IEpisode>>("findOneAndDelete", async function (doc) {
  const deletedDoc = (this as any)._docToDelete;
  if (deletedDoc) {
    await updateNovelAggregates(deletedDoc, "delete");
    if (deletedDoc.previousEpisodeId) {
        await (models.Episode || model<IEpisode>("Episode")).findByIdAndUpdate(deletedDoc.previousEpisodeId, { $set: { nextEpisodeId: deletedDoc.nextEpisodeId || null } });
    }
    if (deletedDoc.nextEpisodeId) {
        await (models.Episode || model<IEpisode>("Episode")).findByIdAndUpdate(deletedDoc.nextEpisodeId, { $set: { previousEpisodeId: deletedDoc.previousEpisodeId || null } });
    }
  }
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
// 6.  **Navigation (next/previousEpisodeId)**: การ denormalize `nextEpisodeId` และ `previousEpisodeId` ช่วยเพิ่ม performance ในการโหลดหน้าตอน แต่ต้องมีการจัดการอัปเดตที่ถูกต้องเมื่อมีการเพิ่ม/ลบ/เปลี่ยนลำดับตอน
// 7.  **Error Handling in Hooks**: Middleware ควรมีการจัดการ error ที่ดี เพื่อไม่ให้กระทบต่อการทำงานหลัก
// 8.  **Transactionality**: สำหรับการอัปเดตข้อมูลข้ามหลาย collection (เช่น Episode และ Novel) ควรพิจารณาใช้ transactions ของ MongoDB (ถ้า replica set ถูกตั้งค่าไว้) เพื่อ đảm bảo data consistency โดยเฉพาะใน operation ที่ซับซ้อน
// 9.  **Scheduled Publishing Job**: การเปลี่ยน status จาก "scheduled" เป็น "published" อัตโนมัติตาม `scheduledPublishAt` ต้องใช้ job scheduler ภายนอก (เช่น cron job, Agenda, BullMQ) ที่คอยตรวจสอบและดำเนินการ
// 10. **Integration with Reading Analytics**: ข้อมูลจาก Episode model (เช่น `totalWords`, `estimatedReadingTimeMinutes`) สามารถใช้เป็น input สำหรับระบบ Reading Analytics ได้
// 11. **Episode Sentiment**: Field `sentimentInfo` ที่เพิ่มเข้ามามีไว้สำหรับเก็บ sentiment โดยรวมของตอน ที่อาจจะมาจากการกำหนดของผู้เขียน หรือการวิเคราะห์เบื้องต้นจาก AI (เช่น จากเนื้อหาของตอน).
//     `episodeCompletionSentiment` ที่แท้จริงของผู้ใช้นั้นเป็นผลลัพธ์จากการอ่าน และควรถูกคำนวณและจัดเก็บใน `UserEpisodeProgress.ts` (ถ้ามี) หรือได้มาจากการวิเคราะห์ `ReadingAnalytic_EventStream.ts`
//     โดยเฉพาะข้อมูลจาก `makeChoiceDetails` และ `readSceneDetails.dominantEmotionsInSceneText` ตามที่ระบุใน `ReadingAnalytic_EventStream_Schema.txt`.
// ==================================================================================================