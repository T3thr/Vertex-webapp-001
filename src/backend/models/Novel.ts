// src/backend/models/Novel.ts
// โมเดลนิยาย (Novel Model) - ศูนย์กลางข้อมูลของนิยายแต่ละเรื่องสำหรับแพลตฟอร์ม NovelMaze

import mongoose, { Schema, model, models, Types, Document, HydratedDocument } from "mongoose";
import { CategoryType, ICategory } from "./Category"; // Import CategoryType และ ICategory
import UserModel, { IUser, IWriterStats, INovelPerformanceStats } from "./User";
// Removed direct import of Purchase and Payment from here, as NovelModel doesn't directly reference them as fields.
// They will reference Novel.
// import { IPurchase } from "./Purchase";
// import { IPayment } from "./Payment";
// Import EpisodeModel for updating novel aggregates if needed here, though usually Episode model updates Novel
// import EpisodeModel, { IEpisode } from "./Episode";


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
  INTERACTIVE_FICTION = "interactive_fiction",
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
 */
export interface INovelStats {
  viewsCount: number; // ยอดเข้าชมทั้งหมด
  uniqueViewersCount: number; // จำนวนผู้อ่านที่ไม่ซ้ำกัน (อาจใช้สำหรับ totalReads ใน writerStats)
  likesCount: number; // จำนวนไลค์ทั้งหมด
  commentsCount: number; // จำนวนคอมเมนต์ทั้งหมด
  ratingsCount: number; // จำนวนการให้เรตติ้งทั้งหมด
  averageRating: number; // คะแนนเฉลี่ย
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
    trendingStats: { type: TrendingStatsSchema, default: () => ({  // **เพิ่มใหม่** Default สำหรับ trendingStats
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
 * @property {number} [promotionalPriceCoins] - ราคาโปรโมชันเป็นเหรียญ "ต่อตอน" สำหรับนิยายนี้ในช่วงโปรโมชัน
 * (ไม่ใช่ราคา bundle ทั้งนิยาย)
 * @property {Date} [promotionStartDate] - วันที่เริ่มโปรโมชัน
 * @property {Date} [promotionEndDate] - วันที่สิ้นสุดโปรโมชัน
 * @property {boolean} isActive - โปรโมชันนี้ใช้งานอยู่หรือไม่
 * @property {string} [promotionDescription] - คำอธิบายโปรโมชัน
 * @property {string} [promotionType] - (แนวทางการปรับปรุงในอนาคต) ประเภทของโปรโมชัน เช่น FIXED_PRICE, PERCENTAGE_DISCOUNT, COIN_DISCOUNT
 * ปัจจุบัน `promotionalPriceCoins` ทำหน้าที่เป็นแบบ FIXED_PRICE
 */
export interface IPromotionDetails {
  promotionalPriceCoins?: number;
  promotionStartDate?: Date;
  promotionEndDate?: Date;
  isActive: boolean;
  promotionDescription?: string;
  // promotionType?: "FIXED_PRICE" | "PERCENTAGE_DISCOUNT" | "COIN_DISCOUNT"; // ตัวอย่างสำหรับอนาคต
}

const PromotionDetailsSchema = new Schema<IPromotionDetails>(
  {
    promotionalPriceCoins: { type: Number, min: 0 },
    promotionStartDate: { type: Date },
    promotionEndDate: { type: Date },
    isActive: { type: Boolean, default: false, required: true },
    promotionDescription: { type: String, trim: true, maxlength: [250, "คำอธิบายโปรโมชันต้องไม่เกิน 250 ตัวอักษร"] },
    // promotionType: { type: String, enum: ["FIXED_PRICE", "PERCENTAGE_DISCOUNT", "COIN_DISCOUNT"] } // ตัวอย่างสำหรับอนาคต
  },
  { _id: false }
);

/**
 * @interface IMonetizationSettings
 * @description การตั้งค่าเกี่ยวกับการสร้างรายได้จากนิยาย
 */
export interface IMonetizationSettings {
  isCoinBasedUnlock: boolean; // ตอนในนิยายนี้สามารถปลดล็อกด้วยเหรียญได้หรือไม่
  defaultEpisodePriceCoins?: number; // ราคาเหรียญปกติสำหรับแต่ละตอน (หากไม่ได้กำหนดราคาเฉพาะตอน หรือไม่มีโปรโมชันนิยายที่ active)
  allowDonations: boolean; // นิยายนี้เปิดรับการบริจาคหรือไม่ (ขึ้นกับ DonationApplication ของผู้เขียนด้วย)
  donationApplicationId?: Types.ObjectId; // (ใหม่) อ้างอิง DonationApplication ที่เกี่ยวข้อง (ถ้ามี)
  isAdSupported: boolean; // แสดงโฆษณาในนิยายนี้หรือไม่
  isPremiumExclusive: boolean; // นิยายนี้เป็นสิทธิพิเศษสำหรับสมาชิกระดับพรีเมียมหรือไม่
  activePromotion?: IPromotionDetails; // การตั้งค่าโปรโมชันปัจจุบันของนิยาย (เช่น ส่วนลดราคาตอน)
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
  sensitiveChoiceCategoriesBlocked?: Types.ObjectId[]; // Ref: Category, type: SENSITIVE_CHOICE_TOPIC
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
    keyLocationsAtlasId?: Types.ObjectId; // Ref: Atlas (สมมติว่ามี Model Atlas)
}

const WorldBuildingDetailsSchema = new Schema<IWorldBuildingDetails>(
    {
        loreSummary: { type: String, trim: true, maxlength: [20000, "สรุป Lore ยาวเกินไป"] },
        magicSystemRules: { type: String, trim: true, maxlength: [20000, "กฎเวทมนตร์ยาวเกินไป"] },
        technologyPrinciples: { type: String, trim: true, maxlength: [20000, "หลักการเทคโนโลยียาวเกินไป"] },
        keyLocationsAtlasId: { type: Schema.Types.ObjectId, ref: "Atlas" }, // สมมติว่ามี Atlas Model
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
  firstEpisodeId?: Types.ObjectId; // Ref: Episode
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
  seriesId?: Types.ObjectId; // Ref: Series (สมมติว่ามี Model Series)
  seriesOrder?: number;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedByUserId?: Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  /**
   * @virtual currentEpisodePriceCoins
   * @description ราคาเหรียญ "ต่อตอน" ปัจจุบันตามนโยบายของนิยายเรื่องนี้
   * โดยพิจารณาจากโปรโมชันที่ active ของนิยาย หรือ ราคา defaultEpisodePriceCoins ของนิยาย
   * **ข้อควรระวัง:** virtual นี้ไม่ได้คำนึงถึงราคาเฉพาะตอน (Episode.priceCoins)
   * หากต้องการราคาที่ผู้ใช้ต้องจ่ายจริงสำหรับตอนใดตอนหนึ่ง ควรใช้ `episode.getEffectivePrice()`
   * virtual นี้มีประโยชน์เพื่อดูภาพรวมนโยบายราคาของนิยายเท่านั้น
   */
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
        ratingsCount: 0, averageRating: 0, followersCount: 0, sharesCount: 0,
        bookmarksCount: 0, totalWords: 0, estimatedReadingTimeMinutes: 0,
        completionRate: 0, purchasesCount: 0,
        trendingStats: { // Default สำหรับ trendingStats ที่เพิ่มใหม่
            viewsLast24h: 0,
            viewsLast48h: 0,
            likesLast24h: 0,
            likesLast3Days: 0,
            commentsLast24h: 0,
            newFollowersLastWeek: 0,
            trendingScore: 0,
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
    seriesId: { type: Schema.Types.ObjectId, ref: "Series", index: true, sparse: true }, // สมมติว่ามี Series Model
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
        default_language: "thai" // ตั้งค่า default_language เป็น "none" หากต้องการรองรับหลายภาษาแบบไม่เฉพาะเจาะจง หรือ "thai" หากเนื้อหาส่วนใหญ่เป็นภาษาไทย
    }
);
NovelSchema.index({ author: 1, status: 1, lastContentUpdatedAt: -1, isDeleted: 1 }, { name: "NovelAuthorStatusUpdatedAtIndex" });
NovelSchema.index({ status: 1, accessLevel: 1, publishedAt: -1, isDeleted: 1 }, { name: "NovelStatusAccessPublishedAtIndex" });
NovelSchema.index({ "themeAssignment.mainTheme.categoryId": 1, status: 1, "stats.averageRating": -1, isDeleted: 1 }, { name: "NovelMainThemeStatusRatingIndex" });
NovelSchema.index({ isFeatured: 1, status: 1, "stats.viewsCount": -1, isDeleted: 1 }, { name: "NovelFeaturedStatusViewsIndex" });
NovelSchema.index({ isDeleted: 1, status: 1 });
NovelSchema.index({ "stats.trendingStats.trendingScore": -1, status: 1, isDeleted: 1 }, { name: "NovelTrendingScoreIndex" }); // **เพิ่มใหม่** Index สำหรับ trendingScore

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

/**
 * @virtual currentEpisodePriceCoins
 * @description ราคาเหรียญ "ต่อตอน" ปัจจุบันตามนโยบายของนิยายเรื่องนี้
 * โดยพิจารณาจากโปรโมชันที่ active ของนิยาย หรือ ราคา defaultEpisodePriceCoins ของนิยาย
 * **ข้อควรระวัง:** virtual นี้ไม่ได้คำนึงถึงราคาเฉพาะตอน (Episode.priceCoins) หรือ accessType ของตอน
 * หากต้องการราคาที่ผู้ใช้ต้องจ่ายจริงสำหรับตอนใดตอนหนึ่ง ควรใช้ `episode.getEffectivePrice()`
 * virtual นี้มีประโยชน์เพื่อดูภาพรวมนโยบายราคาของนิยายเท่านั้น (เช่น ราคาโปรโมชันต่อตอนของนิยายนี้คือเท่าไร หรือราคามาตรฐานต่อตอนของนิยายนี้คือเท่าไร)
 */
NovelSchema.virtual("currentEpisodePriceCoins").get(function (this: HydratedDocument<INovel>): number {
    const now = new Date();
    const promo = this.monetizationSettings?.activePromotion;

    if (
        promo &&
        promo.isActive &&
        promo.promotionalPriceCoins !== undefined && promo.promotionalPriceCoins >= 0 && // ตรวจสอบ >= 0
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
  try {
    if (this.isModified("title") || this.isNew) {
      const generateSlug = (text: string): string => {
          // Thai-friendly slug generation
          let slug = text
            .toString()
            .toLowerCase()
            .normalize("NFD") // Normalize Thai characters
            .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
            .replace(/[ก-ฮ]/g, char => { // Basic Thai consonant to latin-like mapping (optional, for more URL-friendly slugs)
                // This is a very basic mapping, consider a more comprehensive library if needed
                const thaiToLatinMap: { [key: string]: string } = {
                    'ก': 'k', 'ข': 'kh', 'ฃ': 'kh', 'ค': 'kh', 'ฅ': 'kh', 'ฆ': 'kh',
                    'ง': 'ng', 'จ': 'j', 'ฉ': 'ch', 'ช': 'ch', 'ซ': 's', 'ฌ': 'ch',
                    'ญ': 'y', 'ฎ': 'd', 'ฏ': 't', 'ฐ': 'th', 'ฑ': 'th', 'ฒ': 'th',
                    'ณ': 'n', 'ด': 'd', 'ต': 't', 'ถ': 'th', 'ท': 'th', 'ธ': 'th',
                    'น': 'n', 'บ': 'b', 'ป': 'p', 'ผ': 'ph', 'ฝ': 'f', 'พ': 'ph',
                    'ฟ': 'f', 'ภ': 'ph', 'ม': 'm', 'ย': 'y', 'ร': 'r', 'ฤ': 'rue',
                    'ล': 'l', 'ฦ': 'lue', 'ว': 'w', 'ศ': 's', 'ษ': 's', 'ส': 's',
                    'ห': 'h', 'ฬ': 'l', 'อ': 'o', 'ฮ': 'h'
                    // Vowels and tones are mostly handled by NFD and diacritic removal
                };
                return thaiToLatinMap[char] || char;
            })
            .replace(/\s+/g, "-") // Replace spaces with -
            .replace(/[^\p{L}\p{N}\p{M}\s_-]+/gu, "") // Remove special characters except letters, numbers, marks, spaces, underscores, hyphens
            .replace(/\-\-+/g, "-") // Replace multiple - with single -
            .replace(/^-+/, "") // Trim - from start of text
            .replace(/-+$/, ""); // Trim - from end of text

          // Fallback for empty slugs after processing (e.g. title was all special chars)
          if (!slug && text.trim().length > 0) {
              slug = text.toString().toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, '');
          }
          return slug.substring(0, 280); // Max length
      };

      let baseSlug = generateSlug(this.title);
      if (!baseSlug) {
          // If slug generation results in an empty string (e.g., title was only symbols)
          // create a default slug based on ObjectId or timestamp
          baseSlug = `novel-${new Types.ObjectId().toHexString().slice(-8)}`;
      }
      let slug = baseSlug;
      let count = 0;
      const NovelModelInstance = models.Novel || model<INovel>("Novel");
      // eslint-disable-next-line no-constant-condition
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
    // Pass the error to the next middleware or save operation
    return next(new mongoose.Error.ValidatorError({ message: `เกิดข้อผิดพลาดในการสร้าง Slug: ${error.message}` }));
  }

  try {
    if (this.isModified("title") ||
        this.isModified("synopsis") ||
        this.isModified("longDescription") ||
        this.isModified("themeAssignment") ||
        this.isModified("narrativeFocus") ||
        this.isModified("worldBuildingDetails") ||
        this.isModified("sourceType") ||
        this.isModified("coverImageUrl") ||
        this.isModified("bannerImageUrl")) {
      this.lastContentUpdatedAt = new Date();
    }

    if (this.isModified("status")) {
        if (this.status === NovelStatus.PUBLISHED && !this.publishedAt) {
          this.publishedAt = new Date();
          this.lastContentUpdatedAt = new Date(); // Content is effectively "live" now
        } else if (this.status === NovelStatus.SCHEDULED && this.scheduledPublicationDate) {
            // If moving to scheduled, clear publishedAt as it's not yet truly published.
            this.publishedAt = undefined;
        }
    }


    if (this.monetizationSettings?.activePromotion) {
        const { promotionStartDate, promotionEndDate } = this.monetizationSettings.activePromotion;
        if (promotionStartDate && promotionEndDate && new Date(promotionStartDate) > new Date(promotionEndDate)) {
            // Create a new ValidationError object
            const promoDateError = new mongoose.Error.ValidationError();
            // Add specific field error
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


export async function updateWriterStatsAfterNovelChange(_novelId: Types.ObjectId | null, authorId: Types.ObjectId | string) {
    // Ensure authorId is a valid ObjectId string or Types.ObjectId
    if (!authorId || !mongoose.Types.ObjectId.isValid(authorId.toString())) {
        console.warn(`[WriterStats Update] Invalid authorId: ${authorId}. Skipping stats update.`);
        return;
    }
    const validAuthorId = new mongoose.Types.ObjectId(authorId.toString());

    // Use existing model instances if available, otherwise create them
    const UserModelInstance = (models.User as mongoose.Model<IUser>) || model<IUser>("User");
    const NovelModelInstance = (models.Novel as mongoose.Model<INovel>) || model<INovel>("Novel");

    // Fetch the author
    const author: HydratedDocument<IUser> | null = await UserModelInstance.findById(validAuthorId);

    if (!author) {
        console.warn(`[WriterStats Update] Author ${validAuthorId} not found. Skipping stats update.`);
        return;
    }

    // Only update stats if the user has the "Writer" role
    if (!author.roles.includes("Writer")) {
        // console.log(`[WriterStats Update] User ${validAuthorId} is not a Writer. Skipping stats update.`);
        return;
    }

    // Initialize writerStats if it doesn't exist
    if (!author.writerStats) {
        author.writerStats = {
            totalNovelsPublished: 0, totalEpisodesPublished: 0, totalViewsAcrossAllNovels: 0,
            totalReadsAcrossAllNovels: 0, totalLikesReceivedOnNovels: 0, totalCommentsReceivedOnNovels: 0,
            totalEarningsToDate: 0, totalCoinsReceived: 0, totalRealMoneyReceived: 0, totalDonationsReceived: 0,
            // Ensure novelPerformanceSummaries is initialized as a Mongoose DocumentArray
            novelPerformanceSummaries: new mongoose.Types.DocumentArray<INovelPerformanceStats>([]),
            writerSince: new Date(), // Set writerSince when stats are first created
            // lastNovelPublishedAt: undefined, // These will be set by aggregation
            // lastEpisodePublishedAt: undefined,
        };
    } else {
        // Ensure sub-fields are initialized if writerStats exists but sub-fields are missing
        if (!author.writerStats.writerSince) author.writerStats.writerSince = new Date();
        if (!author.writerStats.novelPerformanceSummaries) {
            author.writerStats.novelPerformanceSummaries = new mongoose.Types.DocumentArray<INovelPerformanceStats>([]);
        }
    }

    // Query for all non-deleted novels by this author
    const authorsNovelsQuery = NovelModelInstance.find({
        author: validAuthorId,
        isDeleted: { $ne: true } // Only consider non-deleted novels
    }).select("title status publishedAt publishedEpisodesCount stats _id"); // Select necessary fields

    const authorsNovels: HydratedDocument<INovel>[] = await authorsNovelsQuery;

    const newSummaries: INovelPerformanceStats[] = [];
    let calculatedTotalNovelsPublished = 0;
    let calculatedTotalEpisodesPublishedAcrossNovels = 0;
    let calculatedTotalViews = 0;
    let calculatedTotalReads = 0; // uniqueViewersCount from novel stats
    let calculatedTotalLikes = 0;
    let calculatedTotalCommentsOnNovels = 0; // Renamed for clarity
    let latestNovelPublicationDate: Date | undefined = undefined;
    let latestEpisodePublishedDateAcrossNovels: Date | undefined = undefined;


    for (const novel of authorsNovels) {
        // Double-check isDeleted, though query should handle it
        if (!novel.isDeleted) {
            const summary: INovelPerformanceStats = {
                novelId: novel._id, novelTitle: novel.title,
                totalViews: novel.stats?.viewsCount || 0,
                totalReads: novel.stats?.uniqueViewersCount || 0, // uniqueViewersCount maps to totalReads for the novel
                totalLikes: novel.stats?.likesCount || 0,
                totalComments: novel.stats?.commentsCount || 0,
                totalFollowers: novel.stats?.followersCount || 0,
                averageRating: novel.stats?.averageRating || 0,
                totalEarningsFromNovel: 0, // This would typically come from a separate EarningTransaction model or similar
            };
            newSummaries.push(summary);

            // Aggregate stats only from PUBLISHED or COMPLETED novels for "published" counts
            if (novel.status === NovelStatus.PUBLISHED || novel.status === NovelStatus.COMPLETED) {
                calculatedTotalNovelsPublished++;
                if (novel.publishedAt) {
                    if (!latestNovelPublicationDate || novel.publishedAt > latestNovelPublicationDate) {
                        latestNovelPublicationDate = novel.publishedAt;
                    }
                }
                calculatedTotalEpisodesPublishedAcrossNovels += novel.publishedEpisodesCount || 0;

                // Update latest episode published date from novel stats
                if (novel.stats?.lastPublishedEpisodeAt) {
                    if (!latestEpisodePublishedDateAcrossNovels || novel.stats.lastPublishedEpisodeAt > latestEpisodePublishedDateAcrossNovels) {
                        latestEpisodePublishedDateAcrossNovels = novel.stats.lastPublishedEpisodeAt;
                    }
                }
            }
            // Sum up total views, reads, likes, comments from ALL non-deleted novels (drafts, published, etc.)
            // as these reflect overall engagement potential or history.
            calculatedTotalViews += novel.stats?.viewsCount || 0;
            calculatedTotalReads += novel.stats?.uniqueViewersCount || 0;
            calculatedTotalLikes += novel.stats?.likesCount || 0;
            calculatedTotalCommentsOnNovels += novel.stats?.commentsCount || 0;
        }
    }

    // Update author's writerStats
    if (author.writerStats) { // Should always be true due to initialization logic
        author.writerStats.novelPerformanceSummaries = new mongoose.Types.DocumentArray<INovelPerformanceStats>(newSummaries);
        author.writerStats.totalNovelsPublished = calculatedTotalNovelsPublished;
        author.writerStats.totalEpisodesPublished = calculatedTotalEpisodesPublishedAcrossNovels; // Sum of publishedEpisodesCount from each published/completed novel
        author.writerStats.totalViewsAcrossAllNovels = calculatedTotalViews;
        author.writerStats.totalReadsAcrossAllNovels = calculatedTotalReads; // Sum of uniqueViewersCount
        author.writerStats.totalLikesReceivedOnNovels = calculatedTotalLikes;
        author.writerStats.totalCommentsReceivedOnNovels = calculatedTotalCommentsOnNovels;
        author.writerStats.lastNovelPublishedAt = latestNovelPublicationDate;
        author.writerStats.lastEpisodePublishedAt = latestEpisodePublishedDateAcrossNovels;
    }

    try {
        await author.save({ validateModifiedOnly: true }); // Save only if modified
        // console.log(`[WriterStats Update] Successfully updated stats for author ${validAuthorId}`);
    } catch (error) {
        console.error(`[WriterStats Update] Error saving author ${validAuthorId} after updating stats:`, error);
    }
}

// Post-save hook for Novel
NovelSchema.post("save", async function (doc: HydratedDocument<INovel>, next: (err?: mongoose.Error) => void) {
    // Update writer stats if author exists and the novel is not soft-deleted (or was just un-deleted)
    // The updateWriterStatsAfterNovelChange function itself filters by isDeleted: {$ne: true} for novels
    if (doc.author) { // doc.isDeleted might be true if we are saving a "soft delete" operation.
                      // The aggregation function will correctly sum up non-deleted novels.
        try {
            await updateWriterStatsAfterNovelChange(doc._id, doc.author as Types.ObjectId);
        } catch (error: any) {
            console.error("[Novel Post-Save Hook] Error during writer stats update:", error);
            // Decide if this error should halt the operation or just be logged
            // For now, just log, as the primary save succeeded.
        }
    }
    next();
});

// Pre-hook for findOneAndDelete (and similar delete operations if you add them e.g. deleteOne, deleteMany)
// We need to capture the document *before* it's deleted to get its authorId.
NovelSchema.pre<mongoose.Query<INovel, INovel>>("findOneAndDelete", async function (next: (err?: mongoose.Error) => void) {
    try {
        // `this.getFilter()` gets the query conditions.
        // `this.model` refers to the Novel model.
        // We use lean() as we only need the data for the post hook, not a full Mongoose document.
        const docToDelete = await this.model.findOne(this.getFilter()).lean<HydratedDocument<INovel>>();
        if (docToDelete) {
            // Store it on the query object to access in the post hook
            (this as any)._docToDeleteForWriterStats = docToDelete;
        }
        next();
    } catch (error: any) {
        console.error("[Novel Pre-FindOneAndDelete Hook] Error fetching doc to delete for writer stats:", error);
        next(error); // Pass error to stop operation if fetching fails critically
    }
});

NovelSchema.post<mongoose.Query<INovel, INovel>>("findOneAndDelete", async function (_result: any, next: (err?: mongoose.Error) => void) {
    // Retrieve the document that was stored in the pre hook
    const deletedDoc = (this as any)._docToDeleteForWriterStats as HydratedDocument<INovel> | undefined;

    if (deletedDoc && deletedDoc.author) {
        try {
            // Pass null for novelId because the novel is now deleted.
            // The function will recalculate based on remaining novels.
            await updateWriterStatsAfterNovelChange(null, deletedDoc.author as Types.ObjectId);
        } catch (error: any) {
            console.error("[Novel Post-FindOneAndDelete Hook] Error during writer stats update after deletion:", error);
            // Log error, but don't halt as deletion was successful.
        }
    }
    // Clear the temporary variable from the query object
    if ((this as any)._docToDeleteForWriterStats) {
        delete (this as any)._docToDeleteForWriterStats;
    }
    next();
});


// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================
// The `models.Novel` check prevents Mongoose from recompiling the model if it already exists (common in Next.js HMR)
const NovelModel = (models.Novel as mongoose.Model<INovel>) ||
                   model<INovel>("Novel", NovelSchema);

export default NovelModel;


// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Category Validation**: Middleware หรือ Service Layer ควรตรวจสอบว่า Category ID ที่ผู้ใช้เลือกสำหรับ
//     mainTheme, subThemes, narrativeFocus ต่างๆ นั้นมี `categoryType` ที่ถูกต้อง.
// 2.  **Denormalization**: เพื่อ performance, การ denormalize ชื่อ Category บางส่วนมาเก็บใน Novel อาจมีประโยชน์
//     แต่ต้องจัดการ data consistency ให้ดี.
// 3.  **Slug Generation**: Logic การสร้าง slug รองรับภาษาไทยและอักขระพิเศษเบื้องต้นแล้ว.
// 4.  **WorldBuildingDetails, NarrativeFocus**: เป็น Sub-schemas ที่ดีสำหรับการเก็บข้อมูลเฉพาะทาง.
// 5.  **PsychologicalAnalysisConfig**: `sensitiveChoiceCategoriesBlocked` ช่วยในการควบคุม AI.
// 6.  **Series Integration**: `seriesId` และ `seriesOrder` เป็นพื้นฐานที่ดี.
// 7.  **WriterStats Update**: Middleware `updateWriterStatsAfterNovelChange` มีความสำคัญและดูเหมือนจะครอบคลุม
//     การอัปเดตสถิติพื้นฐานของนักเขียน. การคำนวณใหม่ทั้งหมด (re-aggregation) ทุกครั้งที่ Novel เปลี่ยนแปลง
//     ช่วยให้ข้อมูลถูกต้อง แต่สำหรับนักเขียนที่มีนิยายจำนวนมาก การอัปเดตแบบ delta อาจมีประสิทธิภาพกว่าในระยะยาว.
// 8.  **Transactional Integrity**: การอัปเดต User (writerStats) หลังจาก Novel save ควรพิจารณา MongoDB Transactions
//     เพื่อป้องกันข้อมูลไม่สอดคล้องกันหากเกิดข้อผิดพลาด. (ข้อเสนอแนะ: เพิ่ม comment ใน code)
// 9.  **Deletion Hooks**: ปรับปรุง hook การลบให้ครอบคลุมและใช้ `pre` hook เพื่อเก็บข้อมูลก่อนลบ.
// 10. **Error Handling**: เพิ่มการเรียก `next(error)` ใน pre-hooks เมื่อเกิด error และปรับปรุงการ log.
// 11. **Soft Delete**: เพิ่ม fields `isDeleted`, `deletedAt`, `deletedByUserId` และปรับปรุง query/middleware
//     ให้รองรับ soft delete (เช่น filter `isDeleted: false` ใน query หลัก, และการอัปเดต writerStats ไม่ควรนับนิยายที่ soft-deleted)
// 12. **Purchases Count**: เพิ่ม `purchasesCount` ใน `INovelStats` และ `NovelStatsSchema` แล้ว.
//     การอัปเดต field นี้ควรทำผ่าน middleware ใน `PurchaseModel` หรือ `EpisodeModel` เมื่อมีการซื้อสำเร็จ.
// 13. **Donation Application Link**: `monetizationSettings.donationApplicationId` ถูกเพิ่มแล้ว,
//     ช่วยให้สามารถเชื่อมโยงการตั้งค่าการรับบริจาคของนิยายกับใบสมัครที่ได้รับอนุมัติ.
// 14. **Achievement Integration**: `NovelModel` มี fields เพียงพอสำหรับเป็นเงื่อนไข Achievement.
//     `ActivityHistoryModel` จะบันทึกการกระทำที่เกี่ยวกับ Novel (เช่น `WRITER_NOVEL_PUBLISHED`, `NOVEL_READ_PROGRESS_UPDATE`)
//     ซึ่ง Gamification Service สามารถใช้ trigger การตรวจสอบ Achievement ได้.
// 15. **Character Introduction**: ไม่ได้เป็นส่วนหนึ่งของ `NovelModel` โดยตรง แต่ `CharacterModel` จะมี `novelId`
//     ที่เชื่อมโยงกลับมา. การแสดง "ตัวละครแนะนำ" จะเป็นการ query `CharacterModel` โดยใช้ `novelId`.
// 16. **Trending Stats**: เพิ่ม `trendingStats` ใน `INovelStats` และ `NovelStatsSchema` เพื่อรองรับการคำนวณ "นิยายมาแรง" แบบ Near Realtime
//     ข้อมูลในส่วนนี้ควรถูกอัปเดตโดย Background Job ที่ aggregate ข้อมูลจาก `ActivityHistoryModel`
//     เพิ่ม Index `stats.trendingStats.trendingScore` เพื่อช่วยในการ query นิยายมาแรง
// 17. **Pricing Logic**: `Novel.currentEpisodePriceCoins` ให้ข้อมูลราคานิยายในระดับนโยบาย (โปรโมชันหรือดีฟอลต์)
//     ส่วน `Episode.getEffectivePrice()` และ `Episode.getOriginalPrice()` จะให้ราคาที่แท้จริงและราคาดั้งเดิมของแต่ละตอน
//     โดยพิจารณาทั้งนโยบายระดับนิยายและราคาเฉพาะของตอน.
// ==================================================================================================