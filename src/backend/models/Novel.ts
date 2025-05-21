// src/backend/models/Novel.ts
// โมเดลนิยาย (Novel Model) - ศูนย์กลางข้อมูลของนิยายแต่ละเรื่องสำหรับแพลตฟอร์ม NovelMaze

import mongoose, { Schema, model, models, Types, Document, HydratedDocument } from "mongoose"; // HydratedDocument ถูกรวมอยู่
import { CategoryType } from "./Category"; // Import CategoryType เพื่อใช้ในการอ้างอิง

// SECTION: เพิ่ม Imports สำหรับการอัปเดต User Model
import UserModel, { IUser, IWriterStats, INovelPerformanceStats } from "./User"; // Import User Model และ Interfaces ที่เกี่ยวข้อง

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
}

/**
 * @enum {string} NovelAccessLevel
 * @description ระดับการเข้าถึงนิยาย
 * - `public`: สาธารณะ ทุกคนสามารถเข้าถึงได้
 * - `unlisted`: ไม่แสดงในรายการค้นหาหรือหน้าหลัก แต่เข้าถึงได้ผ่านลิงก์โดยตรง
 * - `private`: ส่วนตัว ผู้เขียนและผู้ที่ได้รับเชิญเท่านั้นที่เห็น
 * - `followers_only`: เฉพาะผู้ติดตามของผู้เขียนเท่านั้นที่สามารถเข้าถึงได้
 * - `premium_only`: เฉพาะสมาชิกระดับพรีเมียม (ถ้ามีระบบสมาชิก)
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
 * - `single_ending`: ตอนจบแบบเดียว
 * - `multiple_endings`: หลายตอนจบ (ขึ้นอยู่กับการเลือกของผู้เล่นใน Visual Novel)
 * - `ongoing`: ยังไม่จบ (สำหรับนิยายที่กำลังดำเนินเรื่องและอัปเดตตอนใหม่ๆ)
 * - `open_ending`: ตอนจบแบบปลายเปิด ให้ผู้อ่านตีความเอง
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
 * - `original`: งานเขียนต้นฉบับที่ผู้เขียนสร้างขึ้นเอง
 * - `fan_fiction`: แฟนฟิคชั่น อ้างอิงจากผลงานอื่น
 * - `translation`: งานแปลจากภาษาอื่น
 * - `adaptation`: งานดัดแปลงจากสื่ออื่น (เช่น ภาพยนตร์, เกม)
 * - `interactive_fiction`: นิยายเชิงโต้ตอบที่เน้นการเลือกของผู้เล่นเป็นหลัก (นอกเหนือจาก Visual Novel ทั่วไป)
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
 * @description (เพิ่มใหม่) การกำหนดรายละเอียดเชิงลึกเกี่ยวกับลักษณะการเล่าเรื่องและองค์ประกอบหลักของนิยาย
 */
export interface INarrativeFocus {
  narrativePacingTags?: Types.ObjectId[];
  primaryConflictTypes?: Types.ObjectId[];
  narrativePerspective?: Types.ObjectId;
  storyArcStructure?: Types.ObjectId;
  artStyle?: Types.ObjectId;
  gameplayMechanics?: Types.ObjectId[];
  interactivityLevel?: Types.ObjectId;
  playerAgencyLevel?: Types.ObjectId;
  lengthTag?: Types.ObjectId;
  commonTropes?: Types.ObjectId[];
  targetAudienceProfileTags?: Types.ObjectId[];
  avoidIfYouDislikeTags?: Types.ObjectId[];
}

const NarrativeFocusSchema = new Schema<INarrativeFocus> (
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
  mainTheme: { // ธีมหลักของนิยาย
    categoryId: Types.ObjectId; // ID ของหมวดหมู่หลัก (อ้างอิง Category model, type: THEME หรือ GENRE)
    customName?: string; // ชื่อธีมหลักที่ผู้เขียนกำหนดเอง (ถ้าหมวดหมู่เป็น "อื่นๆ")
  };
  subThemes?: Array<{ // ธีมรองหรือแท็กย่อย
    categoryId: Types.ObjectId; // ID ของหมวดหมู่รอง (อ้างอิง Category model, type: THEME, SUB_GENRE, TAG)
    customName?: string;
  }>;
  moodAndTone?: Types.ObjectId[]; // ID ของหมวดหมู่ที่สื่อถึงอารมณ์และโทน (อ้างอิง Category model, type: MOOD_AND_TONE)
  contentWarnings?: Types.ObjectId[]; // ID ของหมวดหมู่ที่เป็นคำเตือนเนื้อหา (อ้างอิง Category model, type: CONTENT_WARNING)
  customTags?: string[]; // แท็กที่ผู้เขียนกำหนดเองเพิ่มเติม
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
    customTags: [{ type: String, trim: true, lowercase: true, maxlength: [50, "แท็กที่กำหนดเองต้องไม่เกิน 50 ตัวอักษร"] }]
  },
  { _id: false }
);

/**
 * @interface ISourceType
 * @description ข้อมูลเกี่ยวกับแหล่งที่มาของเนื้อหานิยาย (ถ้าไม่ใช่ Original)
 */
export interface ISourceType {
  type: NovelContentType;
  fandomCategoryId?: Types.ObjectId; // อ้างอิง Category (type: FANDOM)
  originalWorkTitle?: string;
  originalWorkAuthor?: string;
  originalWorkLanguage?: Types.ObjectId; // อ้างอิง Category (type: LANGUAGE)
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
 * @interface INovelStats
 * @description สถิติต่างๆ ที่เกี่ยวข้องกับนิยาย
 */
export interface INovelStats {
  viewsCount: number;
  uniqueViewersCount: number;
  likesCount: number;
  commentsCount: number;
  ratingsCount: number;
  averageRating: number;
  followersCount: number;
  sharesCount: number;
  bookmarksCount: number;
  totalWords: number;
  estimatedReadingTimeMinutes: number;
  completionRate: number;
  lastPublishedEpisodeAt?: Date;
  currentReaders?: number;
  peakConcurrentReaders?: number;
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
    lastPublishedEpisodeAt: { type: Date },
    currentReaders: { type: Number, default: 0, min: 0 },
    peakConcurrentReaders: { type: Number, default: 0, min: 0 },
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
  donationApplicationId?: Types.ObjectId; // อ้างอิง DonationApplication model (ถ้ามี)
  isAdSupported: boolean;
  isPremiumExclusive: boolean;
}

const MonetizationSettingsSchema = new Schema<IMonetizationSettings>(
  {
    isCoinBasedUnlock: { type: Boolean, default: false },
    defaultEpisodePriceCoins: { type: Number, min: 0, default: 0 },
    allowDonations: { type: Boolean, default: true },
    donationApplicationId: { type: Schema.Types.ObjectId, ref: "DonationApplication" },
    isAdSupported: { type: Boolean, default: false },
    isPremiumExclusive: { type: Boolean, default: false },
  },
  { _id: false }
);

/**
 * @interface IPsychologicalAnalysisConfig
 * @description การตั้งค่าเกี่ยวกับการวิเคราะห์ทางจิตวิทยาสำหรับนิยายเรื่องนี้
 */
export interface IPsychologicalAnalysisConfig {
  allowsPsychologicalAnalysis: boolean; // ผู้เขียนอนุญาตให้นิยายนี้ถูกนำไปวิเคราะห์หรือไม่
  sensitiveChoiceCategoriesBlocked?: Types.ObjectId[]; // (เพิ่มใหม่) ID ของ Category (type: SENSITIVE_CHOICE_TOPIC) ที่ไม่ต้องการให้ AI วิเคราะห์
  lastAnalysisDate?: Date; // วันที่ทำการวิเคราะห์ครั้งล่าสุด
  analysisVersion?: string; // เวอร์ชันของโมเดลการวิเคราะห์ที่ใช้
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
    role: string; // เช่น "editor", "proofreader", "co-writer"
    permissions: string[]; // เช่น "edit_episodes", "manage_story_map"
    versionControlResponsibility?: boolean; // (เพิ่มใหม่) เป็นผู้รับผิดชอบหลักในการ merge หรือไม่
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
 * @description (เพิ่มใหม่) ข้อมูลสำคัญเกี่ยวกับโลกของนิยาย (สำหรับนิยายที่มีความซับซ้อนสูง)
 */
export interface IWorldBuildingDetails {
    loreSummary?: string; // สรุป Lore สำคัญ
    magicSystemRules?: string; // กฎของระบบเวทมนตร์ (ถ้ามี)
    technologyPrinciples?: string; // หลักการของเทคโนโลยี (ถ้ามี)
    keyLocationsAtlasId?: Types.ObjectId; // (Optional) ID อ้างอิงไปยังระบบ Atlas หรือแผนที่ (ถ้ามี)
    // สามารถเพิ่ม fields อื่นๆ ที่จำเป็นสำหรับ world building ได้
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
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารนิยายใน Collection "novels"
 */
export interface INovel extends Document {
  _id: Types.ObjectId;
  title: string; // ชื่อนิยาย
  slug: string; // Slug ที่ใช้ใน URL
  author: Types.ObjectId; // ID ของผู้เขียนหลัก
  coAuthors?: Types.ObjectId[]; // ID ของผู้เขียนร่วม
  synopsis: string; // เรื่องย่อ
  longDescription?: string; // คำโปรยหรือรายละเอียดเพิ่มเติม
  coverImageUrl?: string; // URL รูปปกนิยาย
  bannerImageUrl?: string; // URL รูปแบนเนอร์
  themeAssignment: IThemeAssignment; // การกำหนดธีม, หมวดหมู่, และคำเตือน
  narrativeFocus?: INarrativeFocus; // (เพิ่มใหม่) รายละเอียดเชิงลึกเกี่ยวกับการเล่าเรื่อง
  worldBuildingDetails?: IWorldBuildingDetails; // (เพิ่มใหม่) รายละเอียดเกี่ยวกับโลกของนิยาย
  ageRatingCategoryId?: Types.ObjectId; // ID ของหมวดหมู่อายุผู้อ่าน (อ้างอิง Category, type: AGE_RATING)
  status: NovelStatus; // สถานะปัจจุบันของนิยาย
  accessLevel: NovelAccessLevel; // ระดับการเข้าถึงนิยาย
  isCompleted: boolean; // นิยายเรื่องนี้เขียนจบแล้วหรือยัง
  endingType: NovelEndingType; // ประเภทตอนจบของนิยาย
  sourceType: ISourceType; // ข้อมูลแหล่งที่มาของเนื้อหา
  language: Types.ObjectId; // (เปลี่ยนเป็น Ref) ภาษาหลักของนิยาย (อ้างอิง Category, type: LANGUAGE)
  firstEpisodeId?: Types.ObjectId; // ID ของตอนแรกสุด
  totalEpisodesCount: number; // จำนวนตอนทั้งหมด
  publishedEpisodesCount: number; // จำนวนตอนที่เผยแพร่แล้ว
  stats: INovelStats; // สถิติต่างๆ ของนิยาย
  monetizationSettings: IMonetizationSettings; // การตั้งค่าการสร้างรายได้
  psychologicalAnalysisConfig: IPsychologicalAnalysisConfig; // การตั้งค่าการวิเคราะห์ทางจิตวิทยา
  collaborationSettings?: ICollaborationSettings; // การตั้งค่าการทำงานร่วมกัน
  isFeatured?: boolean; // นิยายเรื่องนี้ถูกเลือกให้เป็น Featured หรือไม่
  adminNotes?: string; // หมายเหตุจาก Admin (สำหรับทีมงานภายใน)
  publishedAt?: Date; // วันที่เผยแพร่นิยายครั้งแรก
  scheduledPublicationDate?: Date; // วันที่ตั้งเวลาเผยแพร่
  lastContentUpdatedAt: Date; // วันที่เนื้อหานิยายมีการอัปเดตล่าสุด
  relatedNovels?: Types.ObjectId[]; // ID ของนิยายที่เกี่ยวข้อง
  seriesId?: Types.ObjectId; // ID ของซีรีส์ที่นิยายนี้เป็นส่วนหนึ่ง
  seriesOrder?: number; // ลำดับของนิยายนี้ในซีรีส์
  createdAt: Date;
  updatedAt: Date;
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
            validator: (v: string) => !v || /^https?:\/\/|^\//.test(v) || /^data:image\/(png|jpeg|gif|webp);base64,/.test(v),
            message: "รูปแบบ URL รูปปกไม่ถูกต้อง"
        }
    },
    bannerImageUrl: {
        type: String,
        trim: true,
        maxlength: [2048, "URL รูปแบนเนอร์ยาวเกินไป"],
        validate: {
            validator: (v: string) => !v || /^https?:\/\/|^\//.test(v) || /^data:image\/(png|jpeg|gif|webp);base64,/.test(v),
            message: "รูปแบบ URL รูปแบนเนอร์ไม่ถูกต้อง"
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
        ref: "Category",
        required: [true, "กรุณาระบุภาษาหลักของนิยาย"],
        index: true
    },
    firstEpisodeId: { type: Schema.Types.ObjectId, ref: "Episode" },
    totalEpisodesCount: { type: Number, default: 0, min: 0 },
    publishedEpisodesCount: { type: Number, default: 0, min: 0 },
    stats: { type: NovelStatsSchema, default: () => ({ viewsCount: 0, uniqueViewersCount: 0, likesCount: 0, commentsCount: 0, ratingsCount: 0, averageRating: 0, followersCount: 0, sharesCount: 0, bookmarksCount: 0, totalWords: 0, estimatedReadingTimeMinutes: 0, completionRate: 0 }) },
    monetizationSettings: { type: MonetizationSettingsSchema, default: () => ({ isCoinBasedUnlock: false, defaultEpisodePriceCoins: 0, allowDonations: true, isAdSupported: false, isPremiumExclusive: false }) },
    psychologicalAnalysisConfig: { type: PsychologicalAnalysisConfigSchema, default: () => ({ allowsPsychologicalAnalysis: false }) },
    collaborationSettings: { type: CollaborationSettingsSchema, default: () => ({ allowCoAuthorRequests: false }) },
    isFeatured: { type: Boolean, default: false, index: true },
    adminNotes: { type: String, trim: true, maxlength: [5000, "หมายเหตุจาก Admin ต้องไม่เกิน 5000 ตัวอักษร"], select: false },
    publishedAt: { type: Date, index: true },
    scheduledPublicationDate: { type: Date, index: true },
    lastContentUpdatedAt: { type: Date, default: Date.now, index: true, required: true },
    relatedNovels: [{ type: Schema.Types.ObjectId, ref: "Novel" }],
    seriesId: { type: Schema.Types.ObjectId, ref: "Series", index: true },
    seriesOrder: { type: Number, min: 1 },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
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
        default_language: "thai" // This tells MongoDB to use Thai language text processing rules by default
    }
);
NovelSchema.index({ author: 1, status: 1, lastContentUpdatedAt: -1}, { name: "NovelAuthorStatusUpdatedAtIndex" });
NovelSchema.index({ status: 1, accessLevel: 1, publishedAt: -1}, { name: "NovelStatusAccessPublishedAtIndex" });
NovelSchema.index({ "themeAssignment.mainTheme.categoryId": 1, status: 1, "stats.averageRating": -1 }, { name: "NovelMainThemeStatusRatingIndex" });
NovelSchema.index({ "themeAssignment.subThemes.categoryId": 1, status: 1 }, { name: "NovelSubThemesStatusIndex" });
NovelSchema.index({ language: 1, status: 1 }, { name: "NovelLanguageStatusIndex" });
NovelSchema.index({ isFeatured: 1, status: 1, "stats.viewsCount": -1 }, { name: "NovelFeaturedStatusViewsIndex" });
NovelSchema.index({ "stats.likesCount": -1, status: 1 }, { name: "NovelLikesStatusIndex" });
NovelSchema.index({ "stats.followersCount": -1, status: 1 }, { name: "NovelFollowersStatusIndex" });
NovelSchema.index({ "psychologicalAnalysisConfig.allowsPsychologicalAnalysis": 1, status: 1 }, { name: "NovelPsychologicalAnalysisStatusIndex" });
NovelSchema.index({ isCompleted: 1, status: 1 }, { name: "NovelCompletedStatusIndex" });
NovelSchema.index({ seriesId: 1, seriesOrder: 1 }, { name: "NovelSeriesOrderIndex" });
NovelSchema.index({ "narrativeFocus.artStyle": 1, status: 1 }, { name: "NovelArtStyleStatusIndex" });
NovelSchema.index({ "narrativeFocus.commonTropes": 1, status: 1 }, { name: "NovelTropesStatusIndex" });
NovelSchema.index({ "narrativeFocus.interactivityLevel": 1, status: 1 }, { name: "NovelInteractivityStatusIndex" });


// ==================================================================================================
// SECTION: Virtuals (ฟิลด์เสมือน)
// ==================================================================================================

NovelSchema.virtual("novelUrl").get(function (this: HydratedDocument<INovel>) {
  return `/novels/${this.slug}`;
});

NovelSchema.virtual("isNewRelease").get(function (this: HydratedDocument<INovel>) {
  if (this.publishedAt) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return this.publishedAt > sevenDaysAgo;
  }
  return false;
});

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

// Middleware: ก่อนการบันทึก Novel - สร้าง Slug อัตโนมัติ
NovelSchema.pre<HydratedDocument<INovel>>("save", async function (next: (err?: mongoose.Error) => void) {
  try {
    if (this.isModified("title") || this.isNew) {
      const generateSlug = (text: string): string => {
          return text
          .toString()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "-")
          .replace(/[^\w-]+/g, "")
          .replace(/\-\-+/g, "-")
          .replace(/^-+/, "")
          .replace(/-+$/, "")
          .substring(0, 280);
      };

      let baseSlug = generateSlug(this.title);
      if (!baseSlug) {
          baseSlug = `novel-${new Types.ObjectId().toHexString().slice(-8)}`;
      }
      let slug = baseSlug;
      let count = 0;
      // ใช้ Model ที่ถูก compiled แล้วในการค้นหา (models.Novel หรือ model("Novel"))
      const NovelModelInstance = models.Novel || model<INovel>("Novel");
      while (true) {
          const existingNovel = await NovelModelInstance.findOne({ slug: slug, _id: { $ne: this._id } });
          if (!existingNovel) break;
          count++;
          slug = `${baseSlug}-${count}`;
      }
      this.slug = slug;
    }
    next(); // เรียก next() เมื่อการทำงานของ pre-hook เสร็จสิ้นหรือไม่มีการแก้ไข title/new document
  } catch (error: any) {
    next(error); // ส่งต่อ error หากเกิดปัญหา
  }
});

// Middleware: ก่อนการบันทึก Novel - อัปเดต lastContentUpdatedAt และ publishedAt
NovelSchema.pre<HydratedDocument<INovel>>("save", function (next: (err?: mongoose.Error) => void) {
  try {
    if (this.isModified("title") ||
        this.isModified("synopsis") ||
        this.isModified("longDescription") ||
        this.isModified("themeAssignment") ||
        this.isModified("narrativeFocus") ||
        this.isModified("worldBuildingDetails") ||
        this.isModified("sourceType")) {
      this.lastContentUpdatedAt = new Date();
    }

    if (this.isModified("status") && this.status === NovelStatus.PUBLISHED && !this.publishedAt) {
      this.publishedAt = new Date();
      this.lastContentUpdatedAt = new Date();
    }

    if (this.isModified("status") && this.status === NovelStatus.SCHEDULED && this.scheduledPublicationDate) {
        this.publishedAt = undefined;
    }
    next();
  } catch (error: any) {
    next(error);
  }
});


// ==================================================================================================
// SECTION: Helper Function และ Hooks สำหรับอัปเดต WriterStats
// ==================================================================================================

/**
 * @async
 * @function updateWriterStatsAfterNovelChange
 * @description อัปเดต writerStats ของผู้แต่งหลังจากมีการเปลี่ยนแปลงข้อมูลนิยาย (สร้าง, แก้ไข, ลบ)
 */
// เพิ่มการอนุญาตให้ _novelId เป็น null สำหรับการ refresh ทั่วไป
export async function updateWriterStatsAfterNovelChange(_novelId: Types.ObjectId | null, authorId: Types.ObjectId) {
    // console.log(`[WriterStats Update] Initiated for author ${authorId} (Novel ID: ${_novelId || 'N/A - General Refresh'})`);
    const UserModelInstance = (models.User as mongoose.Model<IUser>) || model<IUser>("User");
    const NovelModelInstance = (models.Novel as mongoose.Model<INovel>) || model<INovel>("Novel");

    const author: HydratedDocument<IUser> | null = await UserModelInstance.findById(authorId);

    if (!author) {
        console.warn(`[WriterStats Update] Author ${authorId} not found. Skipping stats update.`);
        return;
    }

    if (!author.roles.includes("Writer")) {
        // console.warn(`[WriterStats Update] User ${authorId} is not a Writer. Skipping stats update.`);
        return;
    }

    // ตรวจสอบและกำหนดค่าเริ่มต้นสำหรับ writerStats และ writerStats.novelPerformanceSummaries
    if (!author.writerStats) {
        author.writerStats = {
            totalNovelsPublished: 0,
            totalEpisodesPublished: 0,
            totalViewsAcrossAllNovels: 0,
            totalReadsAcrossAllNovels: 0, // ตรงกับ uniqueViewersCount
            totalLikesReceivedOnNovels: 0,
            totalCommentsReceivedOnNovels: 0,
            totalEarningsToDate: 0,
            totalCoinsReceived: 0,
            totalRealMoneyReceived: 0,
            totalDonationsReceived: 0,
            novelPerformanceSummaries: new mongoose.Types.DocumentArray<INovelPerformanceStats>([]),
            writerSince: new Date(), // กำหนด writerSince เมื่อสร้าง writerStats ใหม่
        };
    } else {
        if (!author.writerStats.writerSince) {
            author.writerStats.writerSince = new Date();
        }
        if (!author.writerStats.novelPerformanceSummaries) {
            author.writerStats.novelPerformanceSummaries = new mongoose.Types.DocumentArray<INovelPerformanceStats>([]);
        }
    }


    const authorsNovels: HydratedDocument<INovel>[] = await NovelModelInstance.find({ author: authorId });

    const newSummaries: INovelPerformanceStats[] = [];
    let calculatedTotalNovelsPublished = 0;
    let calculatedTotalEpisodesPublishedAcrossNovels = 0;
    let calculatedTotalViews = 0;
    let calculatedTotalReads = 0; // uniqueViewersCount
    let calculatedTotalLikes = 0;
    let calculatedTotalCommentsOnNovels = 0;
    let latestNovelPublicationDate: Date | undefined = undefined;
    let latestEpisodePublishedDateAcrossNovels: Date | undefined = undefined;

    for (const novel of authorsNovels) {
        const summary: INovelPerformanceStats = {
            novelId: novel._id,
            novelTitle: novel.title,
            totalViews: novel.stats.viewsCount || 0,
            totalReads: novel.stats.uniqueViewersCount || 0,
            totalLikes: novel.stats.likesCount || 0,
            totalComments: novel.stats.commentsCount || 0,
            totalFollowers: novel.stats.followersCount || 0,
            averageRating: novel.stats.averageRating || 0,
            totalEarningsFromNovel: 0, // สมมติว่าคำนวณจากที่อื่น
        };
        newSummaries.push(summary);

        if (novel.status === NovelStatus.PUBLISHED) {
            calculatedTotalNovelsPublished++;
            if (novel.publishedAt) {
                if (!latestNovelPublicationDate || novel.publishedAt > latestNovelPublicationDate) {
                    latestNovelPublicationDate = novel.publishedAt;
                }
            }
            calculatedTotalEpisodesPublishedAcrossNovels += novel.publishedEpisodesCount || 0;

            if (novel.stats.lastPublishedEpisodeAt) {
                if (!latestEpisodePublishedDateAcrossNovels || novel.stats.lastPublishedEpisodeAt > latestEpisodePublishedDateAcrossNovels) {
                    latestEpisodePublishedDateAcrossNovels = novel.stats.lastPublishedEpisodeAt;
                }
            }
        }
        calculatedTotalViews += novel.stats.viewsCount || 0;
        calculatedTotalReads += novel.stats.uniqueViewersCount || 0;
        calculatedTotalLikes += novel.stats.likesCount || 0;
        calculatedTotalCommentsOnNovels += novel.stats.commentsCount || 0;
    }

    if (author.writerStats) { // ตรวจสอบอีกครั้งเพื่อความปลอดภัย
        author.writerStats.novelPerformanceSummaries = new mongoose.Types.DocumentArray<INovelPerformanceStats>(newSummaries);
        author.writerStats.totalNovelsPublished = calculatedTotalNovelsPublished;
        author.writerStats.totalEpisodesPublished = calculatedTotalEpisodesPublishedAcrossNovels;
        author.writerStats.totalViewsAcrossAllNovels = calculatedTotalViews;
        author.writerStats.totalReadsAcrossAllNovels = calculatedTotalReads;
        author.writerStats.totalLikesReceivedOnNovels = calculatedTotalLikes;
        author.writerStats.totalCommentsReceivedOnNovels = calculatedTotalCommentsOnNovels;

        if (latestNovelPublicationDate) {
            author.writerStats.lastNovelPublishedAt = latestNovelPublicationDate;
        } else if (author.writerStats.hasOwnProperty('lastNovelPublishedAt')) {
            author.writerStats.lastNovelPublishedAt = undefined;
        }

        if (latestEpisodePublishedDateAcrossNovels) {
            author.writerStats.lastEpisodePublishedAt = latestEpisodePublishedDateAcrossNovels;
        } else if (author.writerStats.hasOwnProperty('lastEpisodePublishedAt')) {
            author.writerStats.lastEpisodePublishedAt = undefined;
        }
    }

    try {
        await author.save();
        // console.log(`[WriterStats Update] Successfully updated writer stats for author ${authorId}`);
    } catch (error) {
        console.error(`[WriterStats Update] Error saving author ${authorId} after updating stats:`, error);
        // พิจารณาการจัดการ error ที่เหมาะสม เช่น re-throw หรือ logging ไปยังระบบ monitoring
    }
}

// Hook: หลังจากการบันทึก Novel (สร้างใหม่ หรือ อัปเดต)
NovelSchema.post("save", async function (doc: HydratedDocument<INovel>, next: (err?: mongoose.Error) => void) {
    // console.log(`[Novel Post-Save Hook] Novel "${doc.title}" (ID: ${doc._id}) saved. Author ID: ${doc.author}. Triggering writer stats update.`);
    if (doc.author) {
        try {
            await updateWriterStatsAfterNovelChange(doc._id, doc.author as Types.ObjectId);
            next(); // เรียก next() เมื่อการทำงานสำเร็จ
        } catch (error: any) {
            console.error("[Novel Post-Save Hook] Error during writer stats update:", error);
            next(error); // ส่ง error ไปยัง error handling middleware ถัดไป
        }
    } else {
       next(); // ถ้าไม่มี author ก็เรียก next()
    }
});

// Hook: หลังจากการลบ Novel (สำหรับ Model.findOneAndDelete(), Model.findByIdAndDelete())
// 'doc' คือเอกสารที่ถูกลบ, หรือ null ถ้าไม่พบเอกสาร
NovelSchema.post("findOneAndDelete", async function (doc: HydratedDocument<INovel> | null, next: (err?: mongoose.Error) => void) {
    // console.log(`[Novel Post-FindOneAndDelete Hook] Processed. Deleted doc ID (if any): ${doc?._id}. Author ID (if any): ${doc?.author}. Triggering writer stats update if applicable.`);
    if (doc && doc.author) { // ตรวจสอบว่า doc ไม่ใช่ null และมี author
         try {
            await updateWriterStatsAfterNovelChange(doc._id, doc.author as Types.ObjectId);
            next();
        } catch (error: any) {
            console.error("[Novel Post-FindOneAndDelete Hook] Error during writer stats update:", error);
            next(error);
        }
    } else {
        // ถ้า doc เป็น null (ไม่มีเอกสารใดถูกลบ) หรือไม่มี author, ก็เรียก next()
        next();
    }
});


// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================
const NovelModel = (models.Novel as mongoose.Model<INovel, {}, {}, {}, HydratedDocument<INovel>>) ||
                   model<INovel, mongoose.Model<INovel, {}, {}, {}, HydratedDocument<INovel>>>("Novel", NovelSchema);

export default NovelModel;


// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Category Validation**: เมื่อผู้เขียนเลือก Category ID สำหรับฟิลด์ต่างๆ (mainTheme, subThemes, narrativeFocus, etc.)
//     ควรมีการ validate ใน service layer ว่า Category ที่เลือกมานั้นมี `categoryType` ตรงกับที่คาดหวัง
//     เช่น `narrativeFocus.artStyle` ควรเป็น Category ที่มี `categoryType: CategoryType.ART_STYLE`
// 2.  **Denormalization for Display**: สำหรับการแสดงผลบน frontend อาจพิจารณา denormalize ชื่อ Category (name, localized name)
//     เข้ามาใน Novel document บางส่วน เพื่อลดจำนวน query (แต่ต้องจัดการเรื่อง data consistency) หรือใช้ $lookup ใน aggregation.
// 3.  **Slug Generation**: ปรับปรุงให้รองรับ Unicode และมีความ robust มากขึ้น
// 4.  **WorldBuildingDetails**: สามารถขยายฟิลด์ภายในได้ตามความต้องการของแพลตฟอร์ม เช่น `characterRelationshipMapId`, `timelineOfEventsId`
// 5.  **PsychologicalAnalysisConfig**: `sensitiveChoiceCategoriesBlocked` ช่วยให้นักเขียนควบคุม AI ได้ละเอียดขึ้น ควรมี UI ที่ชัดเจน
// 6.  **Series Integration**: ถ้ามี Model `Series` ควรมีการจัดการความสัมพันธ์และการอัปเดตที่รัดกุม
// 7.  **Frontend UI for Tagging**: การออกแบบ UI ให้นักเขียนเลือก Category/Tag ที่ละเอียดขนาดนี้ได้อย่างง่ายดายและไม่สับสนเป็นสิ่งสำคัญมาก
//     อาจใช้ระบบ suggestion, auto-complete, หรือการจัดกลุ่ม CategoryType ที่ดี
// 8.  **Backward Compatibility**: หากมีการเปลี่ยนแปลงโครงสร้าง Schema ครั้งใหญ่ ควรมีแผนสำหรับการ migration ข้อมูลเก่า
// 9.  **WriterStats Update Strategy**: (เพิ่มใหม่) การอัปเดต `writerStats` โดยการคำนวณใหม่ทั้งหมดใน hook นี้มีความ robust สูง
//     และช่วยให้ข้อมูลถูกต้องเสมอ เหมาะสำหรับกรณีส่วนใหญ่ อย่างไรก็ตาม หากระบบมีนิยายจำนวนมากต่อผู้เขียน
//     หรือมีการอัปเดตนิยายบ่อยครั้งมากๆ อาจส่งผลต่อประสิทธิภาพได้ ในกรณีดังกล่าว
//     การย้าย Logic นี้ไปยัง Service Layer และใช้วิธีการอัปเดตแบบ Delta (เฉพาะส่วนที่เปลี่ยนแปลง)
//     ร่วมกับการมี Background Job สำหรับ re-sync เป็นครั้งคราว อาจเป็นทางเลือกที่ดีกว่า
// 10. **Episode Statistics**: การอัปเดตสถิติที่เกี่ยวข้องกับ Episode (เช่น `totalEpisodesPublished`, `lastEpisodePublishedAt`)
//     จะต้องมี Logic ที่คล้ายกันใน Model `Episode` หรือผ่าน Service Layer ที่จัดการทั้ง Novel และ Episode.
// 11. **Transactional Integrity**: การอัปเดตข้อมูลข้าม Collection (Novel -> User) ใน hook ควรพิจารณาถึง
//     Transactional Integrity หาก Database รองรับ (เช่น MongoDB Replica Sets สามารถใช้ Transactions ได้)
//     เพื่อป้องกันข้อมูลไม่สอดคล้องกันหากเกิดข้อผิดพลาดระหว่างการบันทึก User หลังจาก Novel ถูกบันทึกแล้ว
// 12. **Deletion Hooks**: Hook `post("findOneAndDelete")` จะทำงานเมื่อมีการเรียก `Model.findOneAndDelete()` หรือ `Model.findByIdAndDelete()`.
//     หากคุณใช้ `Model.deleteOne()` หรือ `Model.deleteMany()`, คุณจะต้องใช้ query middleware hooks เช่น `post("deleteOne", ...)` หรือ `post("deleteMany", ...)`.
//     ในกรณีของ `deleteOne` และ `deleteMany`, callback จะไม่ได้รับ document ที่ถูกลบโดยตรง แต่จะได้รับ result object (เช่น `{ acknowledged: true, deletedCount: 1 }`).
//     การอัปเดต `writerStats` ในกรณีนั้นจะต้องใช้เงื่อนไขจาก query (เช่น `this.getFilter()`) เพื่อหา `authorId` และอาจจะต้อง query `_id` ของ novel ที่ถูกลบหากจำเป็น.
//     การใช้ `findOneAndDelete` (หรือ `findByIdAndDelete`) จะง่ายกว่าสำหรับการอัปเดต writerStats เพราะมันคืน document ที่ถูกลบมาให้.
// 13. **`post("remove")` vs Query Middleware**: Document middleware `post("remove")` จะทำงานเมื่อเรียก `doc.remove()` บน instance ของ novel เท่านั้น.
//     การเปลี่ยนไปใช้ `post("findOneAndDelete")` จะครอบคลุมกรณีการลบผ่าน static model methods ที่ใช้บ่อยกว่า.
// ==================================================================================================