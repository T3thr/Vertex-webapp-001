// src/models/Novel.ts
// โมเดลนิยาย (Novel Model) - ศูนย์กลางข้อมูลของนิยายแต่ละเรื่อง
// ออกแบบให้รองรับข้อมูลที่ละเอียด, การจัดการเนื้อหา, การตั้งค่าการเข้าถึง, สถิติ, และการเชื่อมโยงกับผู้เขียนและหมวดหมู่
// ปรับปรุงให้รองรับธีมหลัก/รอง, ประเภทตอนจบที่หลากหลาย, และการกรองขั้นสูงตามข้อกำหนดของ NovelMaze
// **ปรับปรุงล่าสุด**: เปลี่ยนไปใช้ Follow.ts สำหรับระบบการติดตามนิยาย, เพิ่มคอมเมนต์เพื่อชี้แจงบทบาทของโมเดลนี้ในการรองรับระบบการบริจาค (Donation System)

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { ICategory, CategoryType } from "./Category"; // อ้างอิง Category model
// ไม่มีการ import NovelFollowModel อีกต่อไป

// ประเภทของตอนจบ (Ending Type)
export type NovelEndingType = 
  | "single_linear" // ตอนจบเดียว เนื้อเรื่องเป็นเส้นตรง
  | "multiple_choices_single_ending" // มีตัวเลือกแต่จบแบบเดียว (อาจมีผลต่อ stat หรือฉากเล็กน้อย)
  | "multiple_branching_paths_endings" // มีตัวเลือกที่ส่งผลให้เนื้อเรื่องแตกแขนงและมีหลายฉากจบ
  | "open_world_sandbox" // (แนวคิดสำหรับอนาคต) ไม่มีจุดจบที่ชัดเจน ผู้เล่นสำรวจและสร้างเรื่องราวเอง
  | "episodic_ongoing"; // นิยายรายตอนที่ยังไม่จบ อาจมีหลาย arc แต่ยังไม่มี final ending

// สถานะของนิยาย (Novel Status)
export type NovelStatus = 
  | "draft" // ฉบับร่าง ผู้เขียนกำลังสร้าง/แก้ไข ยังไม่เผยแพร่
  | "published" // เผยแพร่แล้ว ผู้อ่านทั่วไปสามารถเข้าถึงได้ (ตาม access control)
  | "on_hiatus" // หยุดพักการอัปเดตชั่วคราว
  | "completed" // เขียนจบสมบูรณ์แล้ว
  | "discontinued" // ยกเลิกการเขียน ไม่มีการอัปเดตอีกต่อไป
  | "pending_review" // รอการตรวจสอบจากทีมงาน (ถ้ามีระบบ review)
  | "rejected"; // ไม่ผ่านการตรวจสอบ

// ระดับความเหมาะสมของเนื้อหา (Content Rating / Maturity Level)
export type ContentMaturity = 
  | "all_ages" // เหมาะสมสำหรับทุกวัย
  | "teen_13_plus" // เหมาะสำหรับวัยรุ่น 13 ปีขึ้นไป
  | "mature_17_plus" // เหมาะสำหรับผู้ใหญ่ 17 ปีขึ้นไป (อาจมีเนื้อหารุนแรง, เพศ)
  | "adult_18_plus_explicit"; // สำหรับผู้ใหญ่ 18 ปีขึ้นไป มีเนื้อหาทางเพศอย่างชัดเจน (ถ้าแพลตฟอร์มอนุญาต)

// โมเดลการสร้างรายได้ (Monetization Model)
export type MonetizationModel = 
  | "free_to_read" // อ่านฟรีทั้งหมด
  | "freemium_with_paid_episodes" // บางตอนฟรี บางตอนเสียเงิน
  | "pay_per_novel" // ซื้อทั้งเรื่องเพื่ออ่าน
  | "subscription_access" // เข้าถึงได้ผ่านระบบสมาชิกของแพลตฟอร์ม
  | "ads_supported"; // อ่านฟรี มีโฆษณา

// การตั้งค่าการเข้าถึง (Access Control)
export interface INovelAccessControl {
  monetizationModel: MonetizationModel; // โมเดลการสร้างรายได้
  pricePerNovel?: number; // ราคาสำหรับทั้งเรื่อง (ถ้า monetizationModel = "pay_per_novel")
  pricePerEpisode?: number; // ราคาต่อตอน (ถ้า monetizationModel = "freemium_with_paid_episodes")
  currency?: string; // สกุลเงิน (เช่น "COIN", "THB", "USD")
  freeEpisodeCount?: number; // จำนวนตอนที่อ่านฟรี (ถ้า monetizationModel = "freemium_with_paid_episodes")
  isListed: boolean; // แสดงในรายการนิยายสาธารณะหรือไม่ (default true)
  passwordProtected?: string; // รหัสผ่านสำหรับเข้านิยาย (hashed, ถ้าต้องการ)
}

// ข้อมูลสถิติของนิยาย (Novel Statistics - denormalized for performance)
export interface INovelStats {
  viewCount: number; // จำนวนครั้งที่ถูกเปิดอ่าน (รวมทุกตอน)
  uniqueViewCount?: number; // จำนวนผู้อ่านที่ไม่ซ้ำกัน (ถ้าติดตามได้)
  likeCount: number; // จำนวนไลค์ทั้งหมด
  followerCount: number; // จำนวนผู้ติดตามนิยาย (จะถูกอัปเดตโดย Follow.ts middleware หรือ logic ที่เกี่ยวข้อง)
  commentCount: number; // จำนวนความคิดเห็นทั้งหมด
  ratingAverage?: number; // คะแนนเฉลี่ย (0-5)
  ratingCount?: number; // จำนวนผู้ให้คะแนน
  totalChapters: number; // จำนวนตอนทั้งหมดที่เผยแพร่แล้ว
  totalWords?: number; // จำนวนคำโดยประมาณทั้งหมด (อาจคำนวณจาก Episodes/Scenes)
}

// การอ้างอิงหมวดหมู่และธีม (Category and Theme Reference)
export interface INovelCategoryReference {
  categoryId: Types.ObjectId; // ID ของ ICategory document
  subItemSlug: string; // Slug ของ ISubCategory item ที่เลือก
}

// การอ้างอิงธีมหลักและธีมรอง (Main and Sub Themes)
export interface INovelThemeAssignment {
  mainTheme: INovelCategoryReference; // ธีมหลัก (ต้องเป็น subItem จาก Category ที่มี categoryType="theme")
  subThemes?: INovelCategoryReference[]; // ธีมรอง (ต้องเป็น subItems จาก Category ที่มี categoryType="theme")
}

// ข้อมูลเกี่ยวกับ Fan Fiction (ถ้าเป็น)
export interface IFanFictionDetails {
  originalWorkTitle: string; // ชื่อผลงานต้นฉบับ
  originalWorkAuthor?: string; // ชื่อผู้แต่งผลงานต้นฉบับ
  originalWorkSourceUrl?: string; // URL ของผลงานต้นฉบับ (ถ้ามี)
}

// Interface สำหรับ Localized String (ย้ายมาด้านบนเพื่อใช้งานก่อน)
export interface ILocalizedString {
  th: string; // ภาษาไทย (บังคับมี)
  en?: string; // ภาษาอังกฤษ (ไม่บังคับ)
  // สามารถเพิ่มภาษาอื่นๆ ได้ตามต้องการ เช่น jp, cn, kr
  [key: string]: string | undefined; // Index signature for other languages
}

// ----- Interface หลักสำหรับเอกสารนิยาย (Novel Document) -----
// **ข้อมูลสำคัญสำหรับระบบบริจาค (Donation System):**
// - `author`: ใช้ตรวจสอบว่าผู้ยื่นคำขอเปิดรับบริจาค (applicant ใน DonationApplication) เป็นเจ้าของนิยายจริงหรือไม่
// - `sourceType`: ใช้ตรวจสอบว่านิยายเป็นประเภท "Original" หรือไม่ ซึ่งเป็นเงื่อนไขสำหรับการเปิดรับบริจาคให้ตัวละครในนิยาย
// โมเดล Novel ไม่ได้เก็บ ID ของ DonationApplication โดยตรง แต่ DonationApplication จะอ้างอิงมายัง Novel (targetNovel)
export interface INovel extends Document {
  _id: Types.ObjectId;
  title: ILocalizedString; // ชื่อนิยาย (รองรับหลายภาษา)
  slug: string; // Slug สำหรับ URL ที่ไม่ซ้ำกัน (สร้างจาก title ภาษาหลัก)
  
  author: Types.ObjectId; // ผู้เขียน (อ้างอิง User model) - **สำคัญสำหรับ Donation: ต้องตรงกับ applicant ของ DonationApplication**
  coAuthors?: Types.ObjectId[]; // ผู้เขียนร่วม (ถ้ามี)
  
  // รายละเอียดเนื้อหา
  synopsis: ILocalizedString; // เรื่องย่อ (รองรับหลายภาษา)
  coverImageUrl: string; // URL ภาพปกหลักของนิยาย
  bannerImageUrl?: string; // URL ภาพแบนเนอร์ (สำหรับหน้าโปรโมทนิยาย)
  tags?: string[]; // Tags หรือ Keywords เพิ่มเติม (ผู้เขียนกำหนดเอง)
  
  // การจัดหมวดหมู่และธีม
  categories: INovelCategoryReference[]; // หมวดหมู่ทั่วไป
  themeAssignment: INovelThemeAssignment; // การกำหนดธีมหลักและธีมรอง
  sourceType: INovelCategoryReference; // ประเภทแหล่งที่มา (Original, Fan Fiction, Inspired By) - **สำคัญสำหรับ Donation: การบริจาคให้ตัวละครจะอนุญาตเฉพาะนิยายที่เป็น 'original'**
  fanFictionDetails?: IFanFictionDetails; // รายละเอียดเพิ่มเติมถ้า sourceType เป็น Fan Fiction
  
  // โครงสร้างและตอนจบ
  endingType: NovelEndingType; // ประเภทของตอนจบ
  defaultLanguage: string; // ภาษาหลักของนิยาย (เช่น "th", "en")
  
  // สถานะและการเผยแพร่
  status: NovelStatus; // สถานะปัจจุบันของนิยาย
  publishedAt?: Date; // วันที่เผยแพร่ครั้งแรก
  lastEpisodePublishedAt?: Date; // วันที่ตอนล่าสุดเผยแพร่
  contentMaturity: ContentMaturity; // ระดับความเหมาะสมของเนื้อหา
  
  // การเข้าถึงและการสร้างรายได้
  accessControl: INovelAccessControl;
  
  // สถิติ (Denormalized)
  stats: INovelStats; // followerCount ในนี้จะถูกจัดการโดย Follow.ts
  
  // การตั้งค่าเพิ่มเติม
  enableComments: boolean; // เปิด/ปิด ระบบความคิดเห็น (default true)
  enableRatings: boolean; // เปิด/ปิด ระบบให้คะแนน (default true)
  authorNotes?: ILocalizedString; // หมายเหตุจากผู้เขียนเกี่ยวกับนิยายโดยรวม
  
  // การจัดการ Editor
  firstEpisode?: Types.ObjectId; // ID ของตอนแรก (อาจใช้เป็นจุดเริ่มต้นใน editor)
  storyMapData?: any; // ข้อมูลสำหรับแสดงผล Story Map (โครงสร้าง JSON ที่ editor จัดการ)
  
  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastContentUpdatedAt: Date; // วันที่เนื้อหาภายใน (เช่น episodes, scenes) มีการอัปเดตล่าสุด
}

// ----- Schema ย่อย -----
const LocalizedStringSchema = new Schema<ILocalizedString>(
  { 
    th: { type: String, required: [true, "ต้องระบุข้อความเป็นภาษาไทย"], trim: true, maxlength: 5000 }, 
    en: { type: String, trim: true, maxlength: 5000 },
    // เพิ่ม index signature สำหรับภาษาอื่นๆ
  },
  { _id: false, strict: false } // strict: false เพื่ออนุญาตภาษาอื่นๆ
);

const NovelAccessControlSchema = new Schema<INovelAccessControl>(
  {
    monetizationModel: {
      type: String,
      enum: Object.values(MonetizationModel),
      required: true,
      default: "free_to_read",
    },
    pricePerNovel: { type: Number, min: 0 },
    pricePerEpisode: { type: Number, min: 0 },
    currency: { type: String, trim: true, uppercase: true, maxlength: 10 },
    freeEpisodeCount: { type: Number, min: 0 },
    isListed: { type: Boolean, default: true },
    passwordProtected: { type: String }, // ควร hash ก่อนบันทึก
  },
  { _id: false }
);

const NovelStatsSchema = new Schema<INovelStats>(
  {
    viewCount: { type: Number, default: 0, min: 0 },
    uniqueViewCount: { type: Number, default: 0, min: 0 },
    likeCount: { type: Number, default: 0, min: 0 },
    followerCount: { type: Number, default: 0, min: 0 }, // จะถูกอัปเดตโดย Follow.ts middleware หรือ logic ที่เกี่ยวข้อง
    commentCount: { type: Number, default: 0, min: 0 },
    ratingAverage: { type: Number, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    totalChapters: { type: Number, default: 0, min: 0 },
    totalWords: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const NovelCategoryReferenceSchema = new Schema<INovelCategoryReference>(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    subItemSlug: { type: String, required: true, trim: true, lowercase: true },
  },
  { _id: false }
);

const NovelThemeAssignmentSchema = new Schema<INovelThemeAssignment>(
  {
    mainTheme: { type: NovelCategoryReferenceSchema, required: true },
    subThemes: [NovelCategoryReferenceSchema],
  },
  { _id: false }
);

const FanFictionDetailsSchema = new Schema<IFanFictionDetails>(
  {
    originalWorkTitle: { type: String, required: true, trim: true, maxlength: 255 },
    originalWorkAuthor: { type: String, trim: true, maxlength: 255 },
    originalWorkSourceUrl: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false }
);

// Schema หลักสำหรับ Novel
const NovelSchema = new Schema<INovel>(
  {
    title: { type: LocalizedStringSchema, required: true, index: "text" }, // เพิ่ม text index สำหรับ title.th, title.en
    slug: {
      type: String,
      required: [true, "Slug คือจำเป็น"],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 300,
    },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    coAuthors: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],
    synopsis: { type: LocalizedStringSchema, required: true },
    coverImageUrl: { type: String, required: [true, "URL ภาพปกคือจำเป็น"], trim: true, maxlength: 500 },
    bannerImageUrl: { type: String, trim: true, maxlength: 500 },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 50, index: true }],
    
    categories: [NovelCategoryReferenceSchema],
    themeAssignment: { type: NovelThemeAssignmentSchema, required: true },
    sourceType: { type: NovelCategoryReferenceSchema, required: true }, // **สำคัญสำหรับ Donation: ใช้ตรวจสอบว่าเป็น 'original' หรือไม่**
    fanFictionDetails: FanFictionDetailsSchema,
    
    endingType: {
      type: String,
      enum: Object.values(NovelEndingType),
      required: [true, "ประเภทตอนจบคือจำเป็น"],
      default: "single_linear",
    },
    defaultLanguage: { type: String, required: true, default: "th", maxlength: 10 },
    status: {
      type: String,
      enum: Object.values(NovelStatus),
      default: "draft",
      index: true,
      required: true,
    },
    publishedAt: { type: Date, index: true },
    lastEpisodePublishedAt: { type: Date, index: true },
    contentMaturity: {
      type: String,
      enum: Object.values(ContentMaturity),
      required: [true, "ระดับความเหมาะสมของเนื้อหาคือจำเป็น"],
      default: "all_ages",
    },
    accessControl: { type: NovelAccessControlSchema, required: true, default: () => ({ monetizationModel: "free_to_read", isListed: true }) },
    stats: { type: NovelStatsSchema, default: () => ({ viewCount: 0, likeCount: 0, followerCount: 0, totalChapters: 0 }) },
    enableComments: { type: Boolean, default: true },
    enableRatings: { type: Boolean, default: true },
    authorNotes: LocalizedStringSchema,
    firstEpisode: { type: Schema.Types.ObjectId, ref: "Episode" },
    storyMapData: Schema.Types.Mixed,
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    lastContentUpdatedAt: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----- Indexes -----
NovelSchema.index({ status: 1, publishedAt: -1 });
NovelSchema.index({ author: 1, status: 1 });
NovelSchema.index({ "categories.categoryId": 1, "categories.subItemSlug": 1 });
NovelSchema.index({ "themeAssignment.mainTheme.subItemSlug": 1 });
NovelSchema.index({ "themeAssignment.subThemes.subItemSlug": 1 });
NovelSchema.index({ "sourceType.subItemSlug": 1 });
NovelSchema.index({ "stats.viewCount": -1 });
NovelSchema.index({ "stats.likeCount": -1 });
NovelSchema.index({ "stats.ratingAverage": -1 });
NovelSchema.index({ "title.th": "text", "title.en": "text", "synopsis.th": "text", "synopsis.en": "text", tags: "text" }, { default_language: "none" });

// ----- Middleware -----
NovelSchema.pre<INovel>("save", function (next) {
  if ((this.isModified("title") || this.isNew) && !this.slug) {
    const titleForSlug = this.title[this.defaultLanguage] || this.title.th || this.title.en || "untitled-novel";
    this.slug = titleForSlug.toString().toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\u0E00-\u0E7F\-]+/g, "") // อนุญาตอักขระไทย
      .replace(/\-\-+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "");
    if (!this.slug) this.slug = new Types.ObjectId().toHexString(); // Fallback slug
  }

  if (this.isModified() && !this.isNew) {
    this.lastContentUpdatedAt = new Date();
  }
  next();
});

// ----- Model Export -----
const NovelModel = () => models.Novel as mongoose.Model<INovel> || model<INovel>("Novel", NovelSchema);

export default NovelModel;

