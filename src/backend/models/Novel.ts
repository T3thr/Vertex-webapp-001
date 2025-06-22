// src/backend/models/Novel.ts
// โมเดลนิยาย (Novel Model) - ศูนย์กลางข้อมูลของนิยายแต่ละเรื่องสำหรับแพลตฟอร์ม DivWy
// เวอร์ชันปรับปรุง: เพิ่มการเชื่อมต่อกับ BoardModel เพื่ออัปเดตสถิติรีวิว

import mongoose, { Schema, model, models, Types, Document, HydratedDocument } from "mongoose";
import { CategoryType, ICategory } from "./Category"; // Import CategoryType และ ICategory
import UserModel, { IUser } from "./User";
import { IWriterStatsDoc as IWriterStats, INovelPerformanceStats } from "./WriterStats";
// Import BoardModel เพื่อใช้ในการคำนวณสถิติรีวิว
// การ import นี้อาจทำให้เกิด circular dependency nếu BoardModel ก็ import NovelModel
// วิธีแก้คือการใช้ models("Board") แทนการ import โดยตรงในฟังก์ชันที่จำเป็น
// import BoardModel, { IBoard } from "./Board";

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Novel
// ==================================================================================================

/**
 * @enum {string} NovelStatus
 * @description สถานะของนิยาย
 * - `draft`: ฉบับร่าง, ยังไม่เผยแพร่ ผู้เขียนกำลังแก้ไข
 * - `published`: เผยแพร่แล้ว ผู้อ่านทั่วไปสามารถเข้าถึงได้
 * - `unpublished`: ยกเลิกการเผยแพร่ (เคยเผยแพร่แล้ว) ผู้เขียนนำออกจากสาธารณะ
 * - `archived`: เก็บเข้าคลัง (ไม่แสดงผลในรายการหลัก แต่ข้อมูลยังอยู่สำหรับผู้เขียน)
 * - `pending_review`: รอการตรวจสอบ (เช่น เนื้อหาที่อาจผิดกฎ หรือรอการอนุมัติจากทีมงาน)
 * - `rejected_by_admin`: ถูกปฏิเสธโดยผู้ดูแลระบบ (เช่น เนื้อหาไม่ผ่านการตรวจสอบ)
 * - `banned_by_admin`: ถูกระงับโดยผู้ดูแลระบบ (เช่น เนื้อหาละเมิดนโยบายร้ายแรง)
 * - `scheduled`: ตั้งเวลาเผยแพร่ (จะเปลี่ยนเป็น published เมื่อถึงเวลาที่กำหนด)
 * - `completed`: (เพิ่มเข้ามาเพื่อให้สอดคล้องกับการใช้งาน) สถานะที่บ่งบอกว่านิยายเขียนจบแล้วและเผยแพร่แล้ว
 */
export enum NovelStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  UNPUBLISHED = "unpublished",
  ARCHIVED = "archived",
  PENDING_REVIEW = "pending_review",
  REJECTED_BY_ADMIN = "rejected_by_admin",
  BANNED_BY_ADMIN = "banned_by_admin",
  SCHEDULED = "scheduled",
  COMPLETED = "completed",
  ONGOING = "ONGOING", // เพิ่มเข้ามาเพื่อความชัดเจน แม้จะมี isCompleted field
}

/**
 * @enum {string} NovelAccessLevel
 * @description ระดับการเข้าถึงนิยาย
 */
export enum NovelAccessLevel {
  PUBLIC = "public",
  UNLISTED = "unlisted",
  PRIVATE = "private",
  FOLLOWERS_ONLY = "followers_only",
  PREMIUM_ONLY = "premium_only",
}

/**
 * @enum {string} NovelEndingType
 * @description ประเภทตอนจบของนิยาย
 */
export enum NovelEndingType {
  SINGLE_ENDING = "single_ending",
  MULTIPLE_ENDINGS = "multiple_endings",
  ONGOING = "ongoing",
  OPEN_ENDING = "open_ending",
}

/**
 * @enum {string} NovelContentType
 * @description ประเภทเนื้อหาของนิยาย
 */
export enum NovelContentType {
  ORIGINAL = "original",
  FAN_FICTION = "fan_fiction",
  TRANSLATION = "translation",
  ADAPTATION = "adaptation",
  INTERACTIVE_FICTION = "interactive_fiction", // ใช้สำหรับ Visual Novel
}

// ==================================================================================================
// SECTION: อินเทอร์เฟซย่อย (Sub-Interfaces) สำหรับโครงสร้างข้อมูลที่ซับซ้อนภายใน Novel
// ==================================================================================================

/**
 * @interface INarrativeFocus
 * @description การกำหนดรายละเอียดเชิงลึกเกี่ยวกับลักษณะการเล่าเรื่องและองค์ประกอบหลักของนิยาย
 */
export interface INarrativeFocus {
  narrativePacingTags?: Types.ObjectId[]; // Ref: Category, type: NARRATIVE_PACING
  primaryConflictTypes?: Types.ObjectId[]; // Ref: Category, type: PRIMARY_CONFLICT_TYPE
  narrativePerspective?: Types.ObjectId; // Ref: Category, type: NARRATIVE_PERSPECTIVE
  storyArcStructure?: Types.ObjectId; // Ref: Category, type: STORY_ARC_STRUCTURE
  artStyle?: Types.ObjectId; // Ref: Category, type: ART_STYLE
  gameplayMechanics?: Types.ObjectId[]; // Ref: Category, type: GAMEPLAY_MECHANIC
  interactivityLevel?: Types.ObjectId; // Ref: Category, type: INTERACTIVITY_LEVEL
  playerAgencyLevel?: Types.ObjectId; // Ref: Category, type: PLAYER_AGENCY_LEVEL
  lengthTag?: Types.ObjectId; // Ref: Category, type: LENGTH_TAG
  commonTropes?: Types.ObjectId[]; // Ref: Category, type: COMMON_TROPE
  targetAudienceProfileTags?: Types.ObjectId[]; // Ref: Category, type: TARGET_AUDIENCE_PROFILE
  avoidIfYouDislikeTags?: Types.ObjectId[]; // Ref: Category, type: AVOID_IF_DISLIKE_TAG
}

const NarrativeFocusSchema = new Schema<INarrativeFocus>(
  {
    narrativePacingTags: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    primaryConflictTypes: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    narrativePerspective: { type: Schema.Types.ObjectId, ref: "Category" },
    storyArcStructure: { type: Schema.Types.ObjectId, ref: "Category" },
    artStyle: { type: Schema.Types.ObjectId, ref: "Category" },
    gameplayMechanics: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    interactivityLevel: { type: Schema.Types.ObjectId, ref: "Category" },
    playerAgencyLevel: { type: Schema.Types.ObjectId, ref: "Category" },
    lengthTag: { type: Schema.Types.ObjectId, ref: "Category" },
    commonTropes: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    targetAudienceProfileTags: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    avoidIfYouDislikeTags: [{ type: Schema.Types.ObjectId, ref: "Category" }],
  },
  { _id: false }
);

/**
 * @interface IThemeAssignment
 * @description การกำหนดธีม, หมวดหมู่, และคำเตือนเนื้อหาของนิยาย
 */
export interface IThemeAssignment {
  mainTheme: {
    categoryId: Types.ObjectId;
    customName?: string;
  };
  subThemes?: Array<{
    categoryId: Types.ObjectId;
    customName?: string;
  }>;
  moodAndTone?: Types.ObjectId[]; // Ref: Category, type: MOOD_AND_TONE
  contentWarnings?: Types.ObjectId[]; // Ref: Category, type: CONTENT_WARNING
  customTags?: string[];
}

const ThemeAssignmentSchema = new Schema<IThemeAssignment>(
  {
    mainTheme: {
      categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: [true, "กรุณาระบุหมวดหมู่หลักของธีม"] },
      customName: { type: String, trim: true, maxlength: [100, "ชื่อธีมหลักที่กำหนดเองต้องไม่เกิน 100 ตัวอักษร"] },
    },
    subThemes: [
      {
        categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: [true, "กรุณาระบุหมวดหมู่รองของธีม"] },
        customName: { type: String, trim: true, maxlength: [100, "ชื่อธีมรองที่กำหนดเองต้องไม่เกิน 100 ตัวอักษร"] },
        _id: false,
      },
    ],
    moodAndTone: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    contentWarnings: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    customTags: [{ type: String, trim: true, lowercase: true, maxlength: [50, "แท็กที่กำหนดเองต้องไม่เกิน 50 ตัวอักษร"], index: true }]
  },
  { _id: false }
);

/**
 * @interface ISourceType
 * @description ข้อมูลเกี่ยวกับแหล่งที่มาของเนื้อหานิยาย
 */
export interface ISourceType {
  type: NovelContentType;
  fandomCategoryId?: Types.ObjectId; // Ref: Category, type: FANDOM
  originalWorkTitle?: string;
  originalWorkAuthor?: string;
  originalWorkLanguage?: Types.ObjectId; // Ref: Category, type: LANGUAGE
  permissionDetails?: string;
}

const SourceTypeSchema = new Schema<ISourceType>(
  {
    type: { type: String, enum: Object.values(NovelContentType), required: [true, "กรุณาระบุประเภทเนื้อหา"], default: NovelContentType.ORIGINAL },
    fandomCategoryId: { type: Schema.Types.ObjectId, ref: "Category" },
    originalWorkTitle: { type: String, trim: true, maxlength: [255, "ชื่อผลงานต้นฉบับต้องไม่เกิน 255 ตัวอักษร"] },
    originalWorkAuthor: { type: String, trim: true, maxlength: [150, "ชื่อผู้แต่งผลงานต้นฉบับต้องไม่เกิน 150 ตัวอักษร"] },
    originalWorkLanguage: { type: Schema.Types.ObjectId, ref: "Category" },
    permissionDetails: { type: String, trim: true, maxlength: [1000, "รายละเอียดการอนุญาตต้องไม่เกิน 1000 ตัวอักษร"] },
  },
  { _id: false }
);

/**
 * @interface ITrendingStats
 * @description สถิติเพิ่มเติมสำหรับคำนวณความนิยมในช่วงเวลาต่างๆ (Near Realtime)
 * ฟิลด์เหล่านี้จะถูกอัปเดตโดย Background Job จาก ActivityHistoryModel
 */
export interface ITrendingStats {
  viewsLast24h?: number; // ยอดเข้าชมใน 24 ชั่วโมงล่าสุด
  viewsLast48h?: number; // ยอดเข้าชมใน 48 ชั่วโมงล่าสุด
  likesLast24h?: number; // ยอดไลค์ใน 24 ชั่วโมงล่าสุด
  likesLast3Days?: number; // ยอดไลค์ใน 3 วันล่าสุด
  commentsLast24h?: number; // ยอดคอมเมนต์ใน 24 ชั่วโมงล่าสุด
  newFollowersLastWeek?: number; // จำนวนผู้ติดตามใหม่ในสัปดาห์ล่าสุด
  trendingScore?: number; // คะแนนความนิยมที่คำนวณจากปัจจัยต่างๆ
  lastTrendingScoreUpdate?: Date; // วันที่อัปเดต trendingScore ล่าสุด
}

const TrendingStatsSchema = new Schema<ITrendingStats>(
  {
    viewsLast24h: { type: Number, default: 0, min: 0 },
    viewsLast48h: { type: Number, default: 0, min: 0 },
    likesLast24h: { type: Number, default: 0, min: 0 },
    likesLast3Days: { type: Number, default: 0, min: 0 },
    commentsLast24h: { type: Number, default: 0, min: 0 },
    newFollowersLastWeek: { type: Number, default: 0, min: 0 },
    trendingScore: { type: Number, default: 0, index: true }, // เพิ่ม index ให้ trendingScore เพื่อการ query ที่เร็วขึ้น
    lastTrendingScoreUpdate: { type: Date },
  },
  { _id: false }
);


/**
 * @interface INovelStats
 * @description สถิติต่างๆ ที่เกี่ยวข้องกับนิยาย
 * @property {number} ratingsCount - จำนวนการให้เรตติ้งทั้งหมด **(อัปเดตจาก BoardModel ประเภท 'review')**
 * @property {number} averageRating - คะแนนเฉลี่ย **(อัปเดตจาก BoardModel ประเภท 'review')**
 */
export interface INovelStats {
  viewsCount: number; // ยอดเข้าชมทั้งหมด
  uniqueViewersCount: number; // จำนวนผู้อ่านที่ไม่ซ้ำกัน (อาจใช้สำหรับ totalReads ใน writerStats)
  likesCount: number; // จำนวนไลค์ทั้งหมด
  commentsCount: number; // จำนวนคอมเมนต์ทั้งหมด (จาก CommentModel ที่เกี่ยวกับ Episode)
  discussionThreadCount: number; // **เพิ่มใหม่**: จำนวนกระทู้สนทนาทั้งหมดที่เกี่ยวกับนิยายเรื่องนี้ (จาก BoardModel)
  ratingsCount: number; // **ปรับปรุง**: จำนวน "กระทู้รีวิว" ทั้งหมด (จาก BoardModel)
  averageRating: number; // **ปรับปรุง**: คะแนนเฉลี่ยจาก "กระทู้รีวิว" ทั้งหมด (จาก BoardModel)
  followersCount: number; // จำนวนผู้ติดตามนิยาย
  sharesCount: number; // จำนวนการแชร์
  bookmarksCount: number; // จำนวนการบุ๊คมาร์ค
  totalWords: number; // จำนวนคำรวมของตอนที่เผยแพร่แล้ว
  estimatedReadingTimeMinutes: number; // เวลาอ่านโดยประมาณ (นาที) ของตอนที่เผยแพร่แล้ว
  completionRate: number; // % การอ่านจบโดยเฉลี่ยของผู้ที่เริ่มอ่าน
  purchasesCount: number; // **เพิ่มใหม่**: จำนวนการซื้อ (ตอน/นิยาย)
  lastPublishedEpisodeAt?: Date; // วันที่เผยแพร่ตอนล่าสุด
  currentReaders?: number; // (Optional) จำนวนผู้อ่านปัจจุบัน (Real-time, อาจจัดการยาก)
  peakConcurrentReaders?: number; // (Optional) จำนวนผู้อ่านพร้อมกันสูงสุด
  trendingStats?: ITrendingStats; // **เพิ่มใหม่** สถิติสำหรับ Trending
}

const NovelStatsSchema = new Schema<INovelStats>(
  {
    viewsCount: { type: Number, default: 0, min: 0 },
    uniqueViewersCount: { type: Number, default: 0, min: 0 },
    likesCount: { type: Number, default: 0, min: 0 },
    commentsCount: { type: Number, default: 0, min: 0 },
    discussionThreadCount: { type: Number, default: 0, min: 0 }, // **เพิ่มใหม่**
    ratingsCount: { type: Number, default: 0, min: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    followersCount: { type: Number, default: 0, min: 0 },
    sharesCount: { type: Number, default: 0, min: 0 },
    bookmarksCount: { type: Number, default: 0, min: 0 },
    totalWords: { type: Number, default: 0, min: 0 },
    estimatedReadingTimeMinutes: { type: Number, default: 0, min: 0 },
    completionRate: { type: Number, default: 0, min: 0, max: 100 },
    purchasesCount: { type: Number, default: 0, min: 0 },
    lastPublishedEpisodeAt: { type: Date },
    currentReaders: { type: Number, default: 0, min: 0 },
    peakConcurrentReaders: { type: Number, default: 0, min: 0 },
    trendingStats: { type: TrendingStatsSchema, default: () => ({
        viewsLast24h: 0,
        viewsLast48h: 0,
        likesLast24h: 0,
        likesLast3Days: 0,
        commentsLast24h: 0,
        newFollowersLastWeek: 0,
        trendingScore: 0,
    })},
  },
  { _id: false }
);

/**
 * @interface IPromotionDetails
 * @description การตั้งค่ารายละเอียดโปรโมชันสำหรับนิยาย
 */
export interface IPromotionDetails {
  promotionalPriceCoins?: number;
  promotionStartDate?: Date;
  promotionEndDate?: Date;
  isActive: boolean;
  promotionDescription?: string;
}

const PromotionDetailsSchema = new Schema<IPromotionDetails>(
  {
    promotionalPriceCoins: { type: Number, min: 0 },
    promotionStartDate: { type: Date },
    promotionEndDate: { type: Date },
    isActive: { type: Boolean, default: false, required: true },
    promotionDescription: { type: String, trim: true, maxlength: [250, "คำอธิบายโปรโมชันต้องไม่เกิน 250 ตัวอักษร"] },
  },
  { _id: false }
);

/**
 * @interface IMonetizationSettings
 * @description การตั้งค่าเกี่ยวกับการสร้างรายได้จากนิยาย
 */
export interface IMonetizationSettings {
  isCoinBasedUnlock: boolean;
  defaultEpisodePriceCoins?: number;
  allowDonations: boolean;
  donationApplicationId?: Types.ObjectId;
  isAdSupported: boolean;
  isPremiumExclusive: boolean;
  activePromotion?: IPromotionDetails;
}

const MonetizationSettingsSchema = new Schema<IMonetizationSettings>(
  {
    isCoinBasedUnlock: { type: Boolean, default: false },
    defaultEpisodePriceCoins: { type: Number, min: 0, default: 0 },
    allowDonations: { type: Boolean, default: true },
    donationApplicationId: { type: Schema.Types.ObjectId, ref: "DonationApplication" },
    isAdSupported: { type: Boolean, default: false },
    isPremiumExclusive: { type: Boolean, default: false },
    activePromotion: { type: PromotionDetailsSchema, default: () => ({ isActive: false }) },
  },
  { _id: false }
);

/**
 * @interface IPsychologicalAnalysisConfig
 * @description การตั้งค่าเกี่ยวกับการวิเคราะห์ทางจิตวิทยาสำหรับนิยายเรื่องนี้
 */
export interface IPsychologicalAnalysisConfig {
  allowsPsychologicalAnalysis: boolean;
  sensitiveChoiceCategoriesBlocked?: Types.ObjectId[];
  lastAnalysisDate?: Date;
  analysisVersion?: string;
}

const PsychologicalAnalysisConfigSchema = new Schema<IPsychologicalAnalysisConfig>(
  {
    allowsPsychologicalAnalysis: { type: Boolean, default: false, index: true },
    sensitiveChoiceCategoriesBlocked: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    lastAnalysisDate: { type: Date },
    analysisVersion: { type: String, trim: true, maxlength: [50, "เวอร์ชันการวิเคราะห์ต้องไม่เกิน 50 ตัวอักษร"] },
  },
  { _id: false }
);

/**
 * @interface ICollaborationSettings
 * @description การตั้งค่าสำหรับการทำงานร่วมกัน (Co-authors)
 */
export interface ICollaborationSettings {
  allowCoAuthorRequests: boolean;
  pendingCoAuthors?: Array<{
    userId: Types.ObjectId;
    role: string;
    permissions: string[];
    versionControlResponsibility?: boolean;
  }>;
}

const CollaborationSettingsSchema = new Schema<ICollaborationSettings>(
  {
    allowCoAuthorRequests: { type: Boolean, default: false },
    pendingCoAuthors: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        role: { type: String, trim: true, required: true, maxlength: [50, "บทบาทผู้เขียนร่วมต้องไม่เกิน 50 ตัวอักษร"] },
        permissions: [{ type: String, trim: true, maxlength: [50, "สิทธิ์ผู้เขียนร่วมต้องไม่เกิน 50 ตัวอักษร"] }],
        versionControlResponsibility: { type: Boolean, default: false },
        _id: false,
      },
    ],
  },
  { _id: false }
);

/**
 * @interface IWorldBuildingDetails
 * @description ข้อมูลสำคัญเกี่ยวกับโลกของนิยาย
 */
export interface IWorldBuildingDetails {
    loreSummary?: string;
    magicSystemRules?: string;
    technologyPrinciples?: string;
    keyLocationsAtlasId?: Types.ObjectId;
}

const WorldBuildingDetailsSchema = new Schema<IWorldBuildingDetails>(
    {
        loreSummary: { type: String, trim: true, maxlength: [20000, "สรุป Lore ยาวเกินไป"] },
        magicSystemRules: { type: String, trim: true, maxlength: [20000, "กฎเวทมนตร์ยาวเกินไป"] },
        technologyPrinciples: { type: String, trim: true, maxlength: [20000, "หลักการเทคโนโลยียาวเกินไป"] },
        keyLocationsAtlasId: { type: Schema.Types.ObjectId, ref: "Atlas" },
    },
    { _id: false }
);

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร Novel (INovel Document Interface)
// ==================================================================================================

/**
 * @interface INovel
 * @description อินเทอร์เฟซหลักสำหรับเอกสารนิยายใน Collection "novels"
 */
export interface INovel extends Document {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  author: Types.ObjectId | IUser;
  coAuthors?: (Types.ObjectId | IUser)[];
  synopsis: string;
  longDescription?: string;
  coverImageUrl?: string;
  bannerImageUrl?: string;
  themeAssignment: IThemeAssignment;
  narrativeFocus?: INarrativeFocus;
  worldBuildingDetails?: IWorldBuildingDetails;
  ageRatingCategoryId?: Types.ObjectId | ICategory;
  status: NovelStatus;
  accessLevel: NovelAccessLevel;
  isCompleted: boolean;
  endingType: NovelEndingType;
  sourceType: ISourceType;
  language: Types.ObjectId | ICategory;
  firstEpisodeId?: Types.ObjectId;
  totalEpisodesCount: number;
  publishedEpisodesCount: number;
  stats: INovelStats;
  monetizationSettings: IMonetizationSettings;
  psychologicalAnalysisConfig: IPsychologicalAnalysisConfig;
  collaborationSettings?: ICollaborationSettings;
  isFeatured?: boolean;
  adminNotes?: string;
  publishedAt?: Date;
  scheduledPublicationDate?: Date;
  lastContentUpdatedAt: Date;
  relatedNovels?: (Types.ObjectId | INovel)[];
  seriesId?: Types.ObjectId;
  seriesOrder?: number;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedByUserId?: Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  currentEpisodePriceCoins: number;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ Novel (NovelSchema)
// ==================================================================================================
const NovelSchema = new Schema<INovel>(
  {
    title: {
      type: String,
      required: [true, "กรุณาระบุชื่อนิยาย (Title is required)"],
      trim: true,
      minlength: [1, "ชื่อนิยายต้องมีอย่างน้อย 1 ตัวอักษร"],
      maxlength: [255, "ชื่อนิยายต้องไม่เกิน 255 ตัวอักษร"],
      index: true,
    },
    slug: {
      type: String,
      required: [true, "กรุณาระบุ Slug (Slug is required)"],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [300, "Slug ต้องไม่เกิน 300 ตัวอักษร"],
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุผู้เขียน (Author is required)"],
      index: true,
    },
    coAuthors: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],
    synopsis: {
      type: String,
      required: [true, "กรุณาระบุเรื่องย่อ (Synopsis is required)"],
      trim: true,
      minlength: [10, "เรื่องย่อต้องมีอย่างน้อย 10 ตัวอักษร"],
      maxlength: [2000, "เรื่องย่อต้องไม่เกิน 2000 ตัวอักษร"],
    },
    longDescription: {
      type: String,
      trim: true,
      maxlength: [20000, "คำโปรยต้องไม่เกิน 20000 ตัวอักษร"]
    },
    coverImageUrl: {
        type: String,
        trim: true,
        maxlength: [2048, "URL รูปปกยาวเกินไป"],
        validate: {
            validator: (v: string) => !v || /^https?:\/\/|^\//.test(v) || /^data:image\/(png|jpeg|gif|webp|svg\+xml);base64,/.test(v),
            message: (props: any) => `${props.value} ไม่ใช่รูปแบบ URL รูปปกที่ถูกต้อง`
        }
    },
    bannerImageUrl: {
        type: String,
        trim: true,
        maxlength: [2048, "URL รูปแบนเนอร์ยาวเกินไป"],
        validate: {
            validator: (v: string) => !v || /^https?:\/\/|^\//.test(v) || /^data:image\/(png|jpeg|gif|webp|svg\+xml);base64,/.test(v),
            message: (props: any) => `${props.value} ไม่ใช่รูปแบบ URL รูปแบนเนอร์ที่ถูกต้อง`
        }
    },
    themeAssignment: { type: ThemeAssignmentSchema, required: [true, "กรุณากำหนดธีมและหมวดหมู่"] },
    narrativeFocus: { type: NarrativeFocusSchema, default: () => ({}) },
    worldBuildingDetails: { type: WorldBuildingDetailsSchema, default: () => ({}) },
    ageRatingCategoryId: { type: Schema.Types.ObjectId, ref: "Category", index: true },
    status: {
      type: String,
      enum: Object.values(NovelStatus),
      default: NovelStatus.DRAFT,
      required: true,
      index: true,
    },
    accessLevel: {
      type: String,
      enum: Object.values(NovelAccessLevel),
      default: NovelAccessLevel.PUBLIC,
      required: true,
      index: true,
    },
    isCompleted: { type: Boolean, default: false, index: true },
    endingType: {
      type: String,
      enum: Object.values(NovelEndingType),
      default: NovelEndingType.ONGOING,
      required: true,
    },
    sourceType: { type: SourceTypeSchema, required: true, default: () => ({ type: NovelContentType.ORIGINAL }) },
    language: {
        type: Schema.Types.ObjectId,
        ref: "Category", // CategoryType.LANGUAGE
        required: [true, "กรุณาระบุภาษาหลักของนิยาย"],
        index: true
    },
    firstEpisodeId: { type: Schema.Types.ObjectId, ref: "Episode" },
    totalEpisodesCount: { type: Number, default: 0, min: 0 },
    publishedEpisodesCount: { type: Number, default: 0, min: 0 },
    stats: {
      type: NovelStatsSchema,
      default: () => ({
        viewsCount: 0, uniqueViewersCount: 0, likesCount: 0, commentsCount: 0,
        discussionThreadCount: 0, ratingsCount: 0, averageRating: 0,
        followersCount: 0, sharesCount: 0, bookmarksCount: 0, totalWords: 0,
        estimatedReadingTimeMinutes: 0, completionRate: 0, purchasesCount: 0,
        trendingStats: {
            viewsLast24h: 0, viewsLast48h: 0, likesLast24h: 0, likesLast3Days: 0,
            commentsLast24h: 0, newFollowersLastWeek: 0, trendingScore: 0,
        }
      })
    },
    monetizationSettings: {
      type: MonetizationSettingsSchema,
      default: () => ({
        isCoinBasedUnlock: false, defaultEpisodePriceCoins: 0,
        allowDonations: true, isAdSupported: false, isPremiumExclusive: false,
        activePromotion: { isActive: false }
      })
    },
    psychologicalAnalysisConfig: {
      type: PsychologicalAnalysisConfigSchema,
      default: () => ({ allowsPsychologicalAnalysis: false, sensitiveChoiceCategoriesBlocked: [] })
    },
    collaborationSettings: {
      type: CollaborationSettingsSchema,
      default: () => ({ allowCoAuthorRequests: false, pendingCoAuthors: [] })
    },
    isFeatured: { type: Boolean, default: false, index: true },
    adminNotes: { type: String, trim: true, maxlength: [5000, "หมายเหตุจาก Admin ต้องไม่เกิน 5000 ตัวอักษร"], select: false },
    publishedAt: { type: Date, index: true },
    scheduledPublicationDate: { type: Date, index: true },
    lastContentUpdatedAt: { type: Date, default: Date.now, index: true, required: true },
    relatedNovels: [{ type: Schema.Types.ObjectId, ref: "Novel" }],
    seriesId: { type: Schema.Types.ObjectId, ref: "Series", index: true, sparse: true },
    seriesOrder: { type: Number, min: 1 },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, index: true, sparse: true },
    deletedByUserId: { type: Schema.Types.ObjectId, ref: "User", sparse: true },
  },
  {
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true },
    collection: "novels",
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

NovelSchema.index(
    { title: "text", synopsis: "text", longDescription: "text", "themeAssignment.customTags": "text" },
    {
        name: "NovelContentTextSearchIndex",
        weights: { title: 10, synopsis: 5, "themeAssignment.customTags": 3, longDescription: 1 },
        default_language: "thai"
    }
);
NovelSchema.index({ author: 1, status: 1, lastContentUpdatedAt: -1, isDeleted: 1 }, { name: "NovelAuthorStatusUpdatedAtIndex" });
NovelSchema.index({ status: 1, accessLevel: 1, publishedAt: -1, isDeleted: 1 }, { name: "NovelStatusAccessPublishedAtIndex" });
// **ปรับปรุง Index**: เพิ่ม discussionThreadCount และ ratingsCount เพื่อช่วยในการจัดเรียงตามความนิยมของชุมชน
NovelSchema.index({ "themeAssignment.mainTheme.categoryId": 1, status: 1, "stats.averageRating": -1, "stats.ratingsCount": -1, isDeleted: 1 }, { name: "NovelMainThemeStatusRatingIndex" });
NovelSchema.index({ isFeatured: 1, status: 1, "stats.viewsCount": -1, isDeleted: 1 }, { name: "NovelFeaturedStatusViewsIndex" });
NovelSchema.index({ isDeleted: 1, status: 1 });
NovelSchema.index({ "stats.trendingStats.trendingScore": -1, status: 1, isDeleted: 1, accessLevel: 1 }, { name: "NovelTrendingScoreIndex" });


// ==================================================================================================
// SECTION: Virtuals (ฟิลด์เสมือน)
// ==================================================================================================

NovelSchema.virtual("novelUrl").get(function (this: HydratedDocument<INovel>) {
  return `/novels/${this.slug}`;
});

NovelSchema.virtual("isNewRelease").get(function (this: HydratedDocument<INovel>) {
  if (this.publishedAt) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return new Date(this.publishedAt) > sevenDaysAgo;
  }
  return false;
});

NovelSchema.virtual("currentEpisodePriceCoins").get(function (this: HydratedDocument<INovel>): number {
    const now = new Date();
    const promo = this.monetizationSettings?.activePromotion;

    if (
        promo &&
        promo.isActive &&
        promo.promotionalPriceCoins !== undefined && promo.promotionalPriceCoins >= 0 &&
        (!promo.promotionStartDate || new Date(promo.promotionStartDate) <= now) &&
        (!promo.promotionEndDate || new Date(promo.promotionEndDate) >= now)
    ) {
        return promo.promotionalPriceCoins;
    }
    return this.monetizationSettings?.defaultEpisodePriceCoins ?? 0;
});


// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

NovelSchema.pre<HydratedDocument<INovel>>("save", async function (next: (err?: mongoose.Error) => void) {
  // Slug generation logic (same as before)
  try {
    if (this.isModified("title") || this.isNew) {
        // ฟังก์ชัน generateSlug ที่ปรับปรุงใหม่ให้รองรับภาษาไทยและภาษาอื่นๆ ที่มีเครื่องหมายวรรณยุกต์
        const generateSlug = (text: string): string => {
          if (!text) return `novel-${new Types.ObjectId().toHexString().slice(-8)}`;

          const slug = text
              .toString()
              // 1. ใช้ normalize('NFC') เพื่อรวมพยัญชนะกับสระ/วรรณยุกต์ให้เป็นอักขระเดียว ป้องกันปัญหาสระลอย
              .normalize('NFC')
              .toLowerCase()
              // 2. แทนที่ช่องว่างด้วยขีดกลาง
              .replace(/\s+/g, '-')
              // 3. (***ส่วนที่แก้ไข***) ลบอักขระที่ไม่ใช่ "ตัวอักษร", "ตัวเลข", "สระ/วรรณยุกต์" (\p{M}) หรือ "ขีดกลาง"
              //    การเพิ่ม \p{M} จะช่วยรักษาสระและวรรณยุกต์ของภาษาไทยไว้
              .replace(/[^\p{L}\p{N}\p{M}-]+/gu, '')
              // 4. ยุบขีดกลางที่ซ้ำกันหลายตัวให้เหลือตัวเดียว
              .replace(/--+/g, '-')
              // 5. ลบขีดกลางที่อาจอยู่หน้าสุดหรือท้ายสุดของข้อความ
              .replace(/^-+/, '')
              .replace(/-+$/, '');

          // หากผลลัพธ์เป็นสตริงว่าง (เช่น ชื่อเรื่องมีแต่สัญลักษณ์) ให้สร้าง slug แบบสุ่ม
          if (!slug) {
              return `novel-${new Types.ObjectId().toHexString().slice(-8)}`;
          }

          return slug.substring(0, 280); // จำกัดความยาว
        };
        let baseSlug = generateSlug(this.title);
        if (!baseSlug) {
            baseSlug = `novel-${new Types.ObjectId().toHexString().slice(-8)}`;
        }
        let slug = baseSlug;
        let count = 0;
        const NovelModelInstance = models.Novel || model<INovel>("Novel");
        while (true) {
            const existingNovel = await NovelModelInstance.findOne({ slug: slug, _id: { $ne: this._id } });
            if (!existingNovel) break;
            count++;
            slug = `${baseSlug}-${count}`;
        }
        this.slug = slug;
    }
  } catch (error: any) {
    console.error(`[Novel Pre-Save Hook] Error generating slug for "${this.title}":`, error);
    return next(new mongoose.Error.ValidatorError({ message: `เกิดข้อผิดพลาดในการสร้าง Slug: ${error.message}` }));
  }

  // Timestamp and promotion validation logic (same as before)
  try {
    if (this.isModified("title") || this.isModified("synopsis") || this.isModified("longDescription") ||
        this.isModified("themeAssignment") || this.isModified("narrativeFocus") || this.isModified("worldBuildingDetails") ||
        this.isModified("sourceType") || this.isModified("coverImageUrl") || this.isModified("bannerImageUrl")) {
      this.lastContentUpdatedAt = new Date();
    }
    if (this.isModified("status")) {
        if (this.status === NovelStatus.PUBLISHED && !this.publishedAt) {
          this.publishedAt = new Date();
          this.lastContentUpdatedAt = new Date();
        } else if (this.status === NovelStatus.SCHEDULED && this.scheduledPublicationDate) {
            this.publishedAt = undefined;
        }
    }
    if (this.monetizationSettings?.activePromotion) {
        const { promotionStartDate, promotionEndDate } = this.monetizationSettings.activePromotion;
        if (promotionStartDate && promotionEndDate && new Date(promotionStartDate) > new Date(promotionEndDate)) {
            const promoDateError = new mongoose.Error.ValidationError();
            promoDateError.addError('monetizationSettings.activePromotion.promotionEndDate',
                new mongoose.Error.ValidatorError({
                    message: 'วันที่สิ้นสุดโปรโมชันต้องอยู่หลังหรือตรงกับวันที่เริ่มโปรโมชัน',
                    path: 'monetizationSettings.activePromotion.promotionEndDate',
                    value: promotionEndDate
                })
            );
            return next(promoDateError);
        }
    }
    next();
  } catch (error: any) {
    console.error(`[Novel Pre-Save Hook] Error updating timestamps or validating promotion for "${this.title}":`, error);
    return next(new mongoose.Error.ValidatorError({ message: `เกิดข้อผิดพลาดในการอัปเดตข้อมูลเวลาหรือโปรโมชัน: ${error.message}` }));
  }
});


NovelSchema.post("save", async function (doc: HydratedDocument<INovel>, next: (err?: mongoose.Error) => void) {
    // This hook updates writer-centric stats.
    if (doc.author) {
        try {
            await updateWriterStatsAfterNovelChange(doc._id, doc.author as Types.ObjectId);
        } catch (error: any) {
            console.error("[Novel Post-Save Hook] Error during writer stats update:", error);
        }
    }
    // Note: Updating novel review stats from Board is handled in the Board model's hooks
    // by calling the `updateNovelReviewStats` function exported from this file.
    next();
});

NovelSchema.pre<mongoose.Query<INovel, INovel>>("findOneAndDelete", async function (next: (err?: mongoose.Error) => void) {
    try {
        const docToDelete = await this.model.findOne(this.getFilter()).lean<HydratedDocument<INovel>>();
        if (docToDelete) {
            (this as any)._docToDeleteForWriterStats = docToDelete;
            // **เพิ่มใหม่**: เก็บ novelId เพื่อใช้ล้างข้อมูลใน BoardModel
            (this as any)._deletedNovelId = docToDelete._id;
        }
        next();
    } catch (error: any) {
        console.error("[Novel Pre-FindOneAndDelete Hook] Error fetching doc to delete:", error);
        next(error);
    }
});

NovelSchema.post<mongoose.Query<INovel, INovel>>("findOneAndDelete", async function (_result: any, next: (err?: mongoose.Error) => void) {
    const deletedDoc = (this as any)._docToDeleteForWriterStats as HydratedDocument<INovel> | undefined;
    const deletedNovelId = (this as any)._deletedNovelId as Types.ObjectId | undefined;

    // 1. Update writer stats
    if (deletedDoc && deletedDoc.author) {
        try {
            await updateWriterStatsAfterNovelChange(null, deletedDoc.author as Types.ObjectId);
        } catch (error: any) {
            console.error("[Novel Post-FindOneAndDelete Hook] Error during writer stats update after deletion:", error);
        }
    }

    // **เพิ่มใหม่**: 2. Handle related boards after novel deletion
    if (deletedNovelId) {
        try {
            const BoardModel = models.Board || model("Board"); // Avoid circular dependency
            // Unlink or archive related boards instead of deleting them
            await BoardModel.updateMany(
                { novelAssociated: deletedNovelId },
                { $set: {
                    novelAssociated: undefined, // Unlink the novel
                    // Optional: change status to archived
                    // status: "archived",
                }}
            );
        } catch (error: any) {
             console.error(`[Novel Post-FindOneAndDelete Hook] Error updating related boards for deleted novel ${deletedNovelId}:`, error);
        }
    }

    if ((this as any)._docToDeleteForWriterStats) {
        delete (this as any)._docToDeleteForWriterStats;
    }
    if ((this as any)._deletedNovelId) {
        delete (this as any)._deletedNovelId;
    }
    next();
});

// ==================================================================================================
// SECTION: ฟังก์ชันสำหรับอัปเดตสถิติข้ามโมเดล (Cross-Model Stats Update Functions)
// ==================================================================================================

/**
 * **ฟังก์ชันใหม่**
 * อัปเดตสถิติรีวิว (ratingsCount, averageRating) และจำนวนกระทู้ทั้งหมดของนิยาย
 * โดยจะถูกเรียกใช้จาก Middleware ของ BoardModel เมื่อมีการสร้าง, แก้ไข, หรือลบกระทู้ที่เกี่ยวข้องกับนิยายนี้
 * @param {Types.ObjectId | string | null} novelId - ไอดีของนิยายที่ต้องการอัปเดต
 */
export async function updateNovelCommunityStats(novelId: Types.ObjectId | string | null) {
    if (!novelId || !mongoose.Types.ObjectId.isValid(novelId.toString())) {
        console.warn(`[NovelCommunityStats Update] Invalid novelId: ${novelId}. Skipping stats update.`);
        return;
    }

    const validNovelId = new mongoose.Types.ObjectId(novelId.toString());
    const BoardModel = (models.Board as mongoose.Model<any>) || model("Board"); // ใช้ any เพื่อหลีกเลี่ยงการ import IBoard
    const NovelModelInstance = (models.Novel as mongoose.Model<INovel>) || model<INovel>("Novel");

    try {
        // คำนวณค่าเฉลี่ยและจำนวนรีวิว
        const reviewStatsPromise = BoardModel.aggregate([
            {
                $match: {
                    novelAssociated: validNovelId,
                    boardType: "review", // กรองเฉพาะกระทู้รีวิว
                    isDeleted: { $ne: true }, // ไม่นับกระทู้ที่ถูกลบ
                    "reviewDetails.ratingValue": { $exists: true, $ne: null } // ต้องมีค่า rating
                }
            },
            {
                $group: {
                    _id: "$novelAssociated",
                    averageRating: { $avg: "$reviewDetails.ratingValue" },
                    ratingsCount: { $sum: 1 }
                }
            }
        ]);

        // นับจำนวนกระทู้สนทนาทั้งหมด (ที่ไม่ใช่รีวิว)
        const discussionCountPromise = BoardModel.countDocuments({
            novelAssociated: validNovelId,
            boardType: { $ne: "review" }, // ไม่ใช่กระทู้รีวิว
            isDeleted: { $ne: true }
        });

        const [reviewResults, discussionCount] = await Promise.all([reviewStatsPromise, discussionCountPromise]);

        const reviewStats = reviewResults[0]; // ผลลัพธ์เป็น array

        // เตรียมข้อมูลสำหรับอัปเดต
        const newAverageRating = reviewStats?.averageRating ? parseFloat(reviewStats.averageRating.toFixed(2)) : 0;
        const newRatingsCount = reviewStats?.ratingsCount || 0;

        // อัปเดตข้อมูลใน NovelModel
        await NovelModelInstance.findByIdAndUpdate(validNovelId, {
            $set: {
                "stats.averageRating": newAverageRating,
                "stats.ratingsCount": newRatingsCount,
                "stats.discussionThreadCount": discussionCount
            }
        });
        // console.log(`[NovelCommunityStats Update] Successfully updated stats for novel ${validNovelId}`);

    } catch (error: any) {
        console.error(`[NovelCommunityStats Update] Error updating stats for novel ${validNovelId}:`, error);
    }
}


export async function updateWriterStatsAfterNovelChange(_novelId: Types.ObjectId | null, authorId: Types.ObjectId | string) {
    if (!authorId || !mongoose.Types.ObjectId.isValid(authorId.toString())) {
        console.warn(`[WriterStats Update] Invalid authorId: ${authorId}. Skipping stats update.`);
        return;
    }
    const validAuthorId = new mongoose.Types.ObjectId(authorId.toString());
    const UserModelInstance = (models.User as mongoose.Model<IUser>) || model<IUser>("User");
    const NovelModelInstance = (models.Novel as mongoose.Model<INovel>) || model<INovel>("Novel");
    const author: HydratedDocument<IUser> | null = await UserModelInstance.findById(validAuthorId);

    if (!author) {
        console.warn(`[WriterStats Update] Author ${validAuthorId} not found. Skipping stats update.`);
        return;
    }
    if (!author.roles.includes("Writer")) {
        return;
    }
    if (!author.writerStats) {
        author.writerStats = {
            totalViewsReceived: 0, totalNovelsPublished: 0, totalEpisodesPublished: 0, totalViewsAcrossAllNovels: 0,
            totalReadsAcrossAllNovels: 0, totalLikesReceivedOnNovels: 0, totalCommentsReceivedOnNovels: 0,
            totalEarningsToDate: 0, totalCoinsReceived: 0, totalRealMoneyReceived: 0, totalDonationsReceived: 0,
            novelPerformanceSummaries: new mongoose.Types.DocumentArray<INovelPerformanceStats>([]),
            writerSince: new Date(),
        };
    } else {
        if (!author.writerStats.writerSince) author.writerStats.writerSince = new Date();
        if (!author.writerStats.novelPerformanceSummaries) {
            author.writerStats.novelPerformanceSummaries = new mongoose.Types.DocumentArray<INovelPerformanceStats>([]);
        }
    }

    const authorsNovelsQuery = NovelModelInstance.find({
        author: validAuthorId,
        isDeleted: { $ne: true }
    }).select("title status publishedAt publishedEpisodesCount stats _id");

    const authorsNovels: HydratedDocument<INovel>[] = await authorsNovelsQuery;

    const newSummaries: INovelPerformanceStats[] = [];
    let calculatedTotalNovelsPublished = 0;
    let calculatedTotalEpisodesPublishedAcrossNovels = 0;
    let calculatedTotalViews = 0;
    let calculatedTotalReads = 0;
    let calculatedTotalLikes = 0;
    let calculatedTotalCommentsOnNovels = 0;
    let latestNovelPublicationDate: Date | undefined = undefined;
    let latestEpisodePublishedDateAcrossNovels: Date | undefined = undefined;

    for (const novel of authorsNovels) {
        if (!novel.isDeleted) {
            const summary: INovelPerformanceStats = {
                novelId: novel._id, novelTitle: novel.title,
                totalViews: novel.stats?.viewsCount || 0,
                totalReads: novel.stats?.uniqueViewersCount || 0,
                totalLikes: novel.stats?.likesCount || 0,
                totalComments: novel.stats?.commentsCount || 0,
                totalFollowers: novel.stats?.followersCount || 0,
                averageRating: novel.stats?.averageRating || 0,
                totalEarningsFromNovel: 0,
            };
            newSummaries.push(summary);

            if (novel.status === NovelStatus.PUBLISHED || novel.status === NovelStatus.COMPLETED) {
                calculatedTotalNovelsPublished++;
                if (novel.publishedAt) {
                    if (!latestNovelPublicationDate || novel.publishedAt > latestNovelPublicationDate) {
                        latestNovelPublicationDate = novel.publishedAt;
                    }
                }
                calculatedTotalEpisodesPublishedAcrossNovels += novel.publishedEpisodesCount || 0;
                if (novel.stats?.lastPublishedEpisodeAt) {
                    if (!latestEpisodePublishedDateAcrossNovels || novel.stats.lastPublishedEpisodeAt > latestEpisodePublishedDateAcrossNovels) {
                        latestEpisodePublishedDateAcrossNovels = novel.stats.lastPublishedEpisodeAt;
                    }
                }
            }
            calculatedTotalViews += novel.stats?.viewsCount || 0;
            calculatedTotalReads += novel.stats?.uniqueViewersCount || 0;
            calculatedTotalLikes += novel.stats?.likesCount || 0;
            calculatedTotalCommentsOnNovels += novel.stats?.commentsCount || 0;
        }
    }

    if (author.writerStats) {
        author.writerStats.novelPerformanceSummaries = new mongoose.Types.DocumentArray<INovelPerformanceStats>(newSummaries);
        author.writerStats.totalNovelsPublished = calculatedTotalNovelsPublished;
        author.writerStats.totalEpisodesPublished = calculatedTotalEpisodesPublishedAcrossNovels;
        author.writerStats.totalViewsAcrossAllNovels = calculatedTotalViews;
        author.writerStats.totalReadsAcrossAllNovels = calculatedTotalReads;
        author.writerStats.totalLikesReceivedOnNovels = calculatedTotalLikes;
        author.writerStats.totalCommentsReceivedOnNovels = calculatedTotalCommentsOnNovels;
        author.writerStats.lastNovelPublishedAt = latestNovelPublicationDate;
        author.writerStats.lastEpisodePublishedAt = latestEpisodePublishedDateAcrossNovels;
    }

    try {
        await author.save({ validateModifiedOnly: true });
    } catch (error) {
        console.error(`[WriterStats Update] Error saving author ${validAuthorId} after updating stats:`, error);
    }
}


// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================
const NovelModel = (models.Novel as mongoose.Model<INovel>) ||
                   model<INovel>("Novel", NovelSchema);

export default NovelModel;


// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// ... (ส่วนอื่นๆ เหมือนเดิม)
// **ส่วนที่เพิ่มเข้ามาสำหรับการเชื่อมต่อกับ BoardModel**
// 18. **Board Model Integration**:
//     - **Review Stats**: โมเดลนี้ได้เพิ่มฟังก์ชัน `updateNovelCommunityStats` สำหรับคำนวณ `averageRating`, `ratingsCount`, และ `discussionThreadCount` ของนิยายใหม่
//     - **Trigger Point**: ฟังก์ชัน `updateNovelCommunityStats` นี้ **จะต้องถูกเรียกใช้** จาก `post('save')` และ `post('findOneAndDelete')` middleware ภายใน `BoardModel` ทุกครั้งที่กระทู้ที่มี `novelAssociated` มีการเปลี่ยนแปลง
//       - **ตัวอย่างการเรียกใช้ใน BoardModel.ts:**
//         ```typescript
//         // ใน post('save') hook ของ BoardSchema
//         import { updateNovelCommunityStats } from './Novel'; // หรือเส้นทางที่ถูกต้อง
//         // ...
//         if (doc.isModified('isDeleted') || doc.isNew || doc.isModified('reviewDetails')) {
//            if (doc.novelAssociated) {
//               await updateNovelCommunityStats(doc.novelAssociated);
//            }
//         }
//         ```
//     - **Data Flow**: `BoardModel` (ประเภทรีวิว) -> `updateNovelCommunityStats` -> อัปเดต `NovelModel.stats` ซึ่งทำให้ข้อมูลเรตติ้งของนิยายเป็นปัจจุบันเสมอ
//     - **Novel Deletion**: `post('findOneAndDelete')` hook ของ `NovelModel` ได้รับการปรับปรุงให้จัดการกับกระทู้ที่เกี่ยวข้อง โดยการยกเลิกการเชื่อมโยง (`novelAssociated: undefined`) เพื่อไม่ให้กระทู้เหล่านั้นกลายเป็นข้อมูลกำพร้า
// ==================================================================================================