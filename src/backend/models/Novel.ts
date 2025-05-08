// src/backend/models/Novel.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface สำหรับ Novel document
export interface INovel extends Document {
  title: string; // ชื่อนิยาย (ต้องไม่ซ้ำกันภายในผู้เขียนคนเดียวกัน หรือ ทั่วทั้งระบบ? พิจารณา unique index)
  slug: string; // URL slug (ต้อง unique ทั่วทั้งระบบ)
  description: string; // คำอธิบายนิยาย (รองรับ markdown หรือ rich text ได้)
  coverImage: string; // URL รูปปกนิยาย
  author: Types.ObjectId; // ผู้เขียน (อ้างอิงไปยัง User model ที่รวมศูนย์แล้ว)
  categories: Types.ObjectId[]; // หมวดหมู่หลัก (อ้างอิงไปยัง Category model)
  subCategories?: Types.ObjectId[]; // หมวดหมู่ย่อย (อ้างอิงไปยัง Category model, optional)
  tags: string[]; // แท็กคำค้น (ผู้เขียนกำหนดเอง, ช่วยในการค้นหาและ AI recommendations)
  status: "draft" | "published" | "completed" | "onHiatus" | "archived" | "discount"; // สถานะนิยาย (เพิ่ม archived)
  visibility: "public" | "unlisted" | "private" | "followersOnly"; // การมองเห็น (เพิ่ม followersOnly)
  language: string; // ภาษาของนิยาย (เช่น "th", "en", ISO 639-1 codes)
  isExplicitContent: boolean; // เนื้อหาสำหรับผู้ใหญ่ (18+)
  ageRating?: "everyone" | "teen" | "mature17+" | "adult18+"; // การจัดเรทอายุ (ละเอียดขึ้น)
  isOriginalWork: boolean; // เป็นงานต้นฉบับของผู้เขียนหรือไม่ (true) หรือเป็นงานแปล/ดัดแปลง (false)
  originalLanguage?: string; // ภาษาต้นฉบับ (กรณีเป็นงานแปล)
  translationSource?: string; // แหล่งที่มาของงานแปล (ถ้ามี)
  isPremium: boolean; // เป็นนิยายพรีเมียมหรือไม่ (อาจมีผลต่อการเข้าถึงหรือการสร้างรายได้)
  averageRating: number; // คะแนนเฉลี่ย (คำนวณจาก Rating model, 0-5)
  ratingsCount: number; // จำนวนผู้ให้คะแนน
  viewsCount: number; // จำนวนการเข้าชมทั้งหมด (อาจแยกเป็น unique views / total views)
  likesCount: number; // จำนวนไลค์ (จาก NovelLike model)
  followersCount: number; // จำนวนผู้ติดตามนิยาย (จาก NovelFollow model)
  commentsCount: number; // จำนวนความคิดเห็น (จาก Comment model)
  episodesCount: number; // จำนวนตอนทั้งหมด (คำนวณจาก Episode model)
  publishedEpisodesCount: number; // จำนวนตอนที่เผยแพร่แล้ว
  wordsCount?: number; // จำนวนคำโดยประมาณทั้งหมดในนิยาย (อัปเดตเมื่อมีการเพิ่ม/แก้ไขตอน)
  // สถิติสำหรับการวิเคราะห์และการแสดงผล
  stats: {
    totalPurchasesAmount?: number; // ยอดขายรวมจากนิยายนี้ (ถ้ามีตอนที่ขาย)
    totalDonationsAmount?: number; // ยอดบริจาคทั้งหมดที่นิยายนี้ได้รับ
    completionRate?: number; // อัตราการอ่านจบโดยเฉลี่ย (%)
    // สามารถเพิ่มสถิติอื่นๆ ที่เกี่ยวข้องกับ AI/ML เช่น engagement score
    lastViewedAt?: Date; // วันที่ถูกเข้าชมล่าสุด (สำหรับ sorting "recently viewed")
  };
  // การตั้งค่าที่เกี่ยวข้องกับนิยาย
  settings: {
    allowComments: boolean; // อนุญาตให้แสดงความคิดเห็นหรือไม่
    showContentWarnings?: boolean; // แสดงคำเตือนเนื้อหาหรือไม่
    contentWarnings?: string[]; // รายการคำเตือนเนื้อหา (เช่น violence, gore)
    enableMonetization: boolean; // เปิดใช้งานการสร้างรายได้จากนิยายนี้ (เช่น ขายตอน, รับบริจาค)
    enableDonations: boolean; // เปิดใช้งานการรับบริจาคสำหรับนิยายนี้โดยตรง
    enableCharacterDonations: boolean; // อนุญาตให้บริจาคให้ตัวละครในนิยายนี้
  };
  // ตารางการเผยแพร่ตอน (ถ้ามี)
  releaseSchedule?: {
    frequency: "asReady" | "daily" | "weekly" | "biweekly" | "monthly"; // ความถี่ (เพิ่ม asReady)
    dayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6; // วันในสัปดาห์ (0 = Sunday, ... , 6 = Saturday)
    timeOfDay?: string; // เวลาในวัน (HH:MM ในโซนของผู้เขียน หรือ UTC)
    nextExpectedReleaseAt?: Date; // วันที่คาดว่าจะเผยแพร่ตอนถัดไป
  };
  // องค์ประกอบเกมในนิยาย (สรุปจาก StoryMaps หรือตั้งค่าระดับ Novel)
  gameElementsSummary?: {
    hasChoices: boolean;
    hasMultipleEndings: boolean;
    hasStatSystem: boolean;
    hasRelationshipSystem: boolean;
    hasInventorySystem: boolean;
    // อาจเพิ่ม game mechanics อื่นๆ ที่สำคัญ
  };
  // คลังมีเดียที่ใช้ในนิยายนี้ (อาจเป็น subset ของ OfficialMedia หรือ Media ที่ผู้เขียนอัปโหลด)
  // การเก็บ ObjectId ตรงนี้อาจจะซ้ำซ้อนกับสิ่งที่อยู่ใน Episode/Scene
  // พิจารณาการ query ผ่าน Episode/Scene หรือเก็บเฉพาะ Official Media ที่เด่นๆ
  featuredOfficialMedia?: Types.ObjectId[]; // สื่อทางการที่เด่นๆ ที่ใช้ (อ้างอิง OfficialMedia)
  // การตั้งค่า SEO
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[]; // คำสำคัญสำหรับ SEO
    socialImage?: string; // รูปภาพสำหรับแชร์บนโซเชียล
    // structuredData อาจจะ generate ตอน render page
  };
  // สำหรับ AI/ML
  embeddingVector?: number[]; // Vector embedding ของเนื้อหานิยาย (สำหรับ similarity search, recommendations)
  genreDistribution?: Record<string, number>; // การกระจายของหมวดหมู่ (เช่น { action: 0.7, romance: 0.3 })
  sentimentAnalysis?: {
    overallScore: number; // คะแนนความรู้สึกโดยรวม (-1 ถึง 1)
    dominantEmotion?: string; // อารมณ์เด่น
  };
  isDeleted: boolean; // สถานะการลบ (soft delete)
  deletedAt?: Date;
  lastEpisodePublishedAt?: Date; // วันที่เผยแพร่ตอนล่าสุด (สำคัญสำหรับ sorting "recently updated")
  firstPublishedAt?: Date; // วันที่เผยแพร่ครั้งแรก (ถ้า status เป็น published)
  createdAt: Date;
  updatedAt: Date;
  lastSignificantUpdateAt?: Date; // วันที่มีการอัปเดตเนื้อหาสำคัญ (เช่น เพิ่มตอน, แก้ไขเนื้อเรื่องหลัก)
}

const NovelSchema = new Schema<INovel>(
  {
    title: {
      type: String,
      required: [true, "กรุณาระบุชื่อนิยาย"],
      trim: true,
      maxlength: [200, "ชื่อนิยายต้องไม่เกิน 200 ตัวอักษร"],
      index: true,
    },
    slug: {
      type: String,
      required: [true, "กรุณาระบุ slug URL สำหรับนิยาย"],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [220, "Slug ต้องไม่เกิน 220 ตัวอักษร"],
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug ต้องประกอบด้วยตัวอักษรพิมพ์เล็ก, ตัวเลข และเครื่องหมาย - เท่านั้น"],
      index: true,
    },
    description: {
      type: String,
      required: [true, "กรุณาระบุคำอธิบายนิยาย"],
      trim: true,
      maxlength: [5000, "คำอธิบายนิยายต้องไม่เกิน 5000 ตัวอักษร"],
    },
    coverImage: {
      type: String,
      required: [true, "กรุณาระบุ URL รูปปกนิยาย"],
      trim: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุผู้เขียน"],
      index: true,
    },
    categories: {
      type: [Schema.Types.ObjectId],
      ref: "Category",
      required: [true, "กรุณาเลือกอย่างน้อย 1 หมวดหมู่หลัก"],
      validate: [
        { validator: (v: Types.ObjectId[]) => v.length > 0, message: "ต้องมีอย่างน้อย 1 หมวดหมู่หลัก" },
        { validator: (v: Types.ObjectId[]) => v.length <= 3, message: "สามารถเลือกหมวดหมู่หลักได้สูงสุด 3 หมวดหมู่" },
      ],
      index: true,
    },
    subCategories: [{ type: Schema.Types.ObjectId, ref: "Category", index: true }],
    tags: {
      type: [String],
      validate: [
        { validator: (v: string[]) => v.length <= 15, message: "สามารถใส่แท็กได้สูงสุด 15 แท็ก" },
        { validator: (v: string[]) => v.every(tag => tag.length <= 50), message: "แต่ละแท็กต้องมีความยาวไม่เกิน 50 ตัวอักษร" },
      ],
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "published", "completed", "onHiatus", "archived"],
      default: "draft",
      index: true,
    },
    visibility: {
      type: String,
      enum: ["public", "unlisted", "private", "followersOnly"],
      default: "private",
      index: true,
    },
    language: { type: String, required: [true, "กรุณาระบุภาษาของนิยาย"], default: "th", index: true },
    isExplicitContent: { type: Boolean, default: false, index: true },
    ageRating: { type: String, enum: ["everyone", "teen", "mature17+", "adult18+"], default: "everyone", index: true },
    isOriginalWork: { type: Boolean, default: true },
    originalLanguage: String,
    translationSource: String,
    isPremium: { type: Boolean, default: false, index: true },
    averageRating: { type: Number, default: 0, min: 0, max: 5, index: true },
    ratingsCount: { type: Number, default: 0, min: 0 },
    viewsCount: { type: Number, default: 0, min: 0, index: true },
    likesCount: { type: Number, default: 0, min: 0, index: true },
    followersCount: { type: Number, default: 0, min: 0, index: true },
    commentsCount: { type: Number, default: 0, min: 0 },
    episodesCount: { type: Number, default: 0, min: 0 },
    publishedEpisodesCount: { type: Number, default: 0, min: 0 },
    wordsCount: { type: Number, default: 0, min: 0 },
    stats: {
      totalPurchasesAmount: { type: Number, default: 0, min: 0 },
      totalDonationsAmount: { type: Number, default: 0, min: 0 },
      completionRate: { type: Number, default: 0, min: 0, max: 100 },
      lastViewedAt: { type: Date, index: true },
    },
    settings: {
      allowComments: { type: Boolean, default: true },
      showContentWarnings: { type: Boolean, default: false },
      contentWarnings: [String],
      enableMonetization: { type: Boolean, default: false },
      enableDonations: { type: Boolean, default: false },
      enableCharacterDonations: { type: Boolean, default: false },
    },
    releaseSchedule: {
      frequency: { type: String, enum: ["asReady", "daily", "weekly", "biweekly", "monthly"], default: "asReady" },
      dayOfWeek: { type: Number, min: 0, max: 6 },
      timeOfDay: { type: String, match: /^([01]\d|2[0-3]):([0-5]\d)$/ },
      nextExpectedReleaseAt: Date,
    },
    gameElementsSummary: {
      hasChoices: { type: Boolean, default: false },
      hasMultipleEndings: { type: Boolean, default: false },
      hasStatSystem: { type: Boolean, default: false },
      hasRelationshipSystem: { type: Boolean, default: false },
      hasInventorySystem: { type: Boolean, default: false },
    },
    featuredOfficialMedia: [{ type: Schema.Types.ObjectId, ref: "OfficialMedia" }],
    seo: {
      metaTitle: { type: String, trim: true, maxlength: [70, "Meta Title ควรไม่เกิน 70 ตัวอักษร"] },
      metaDescription: { type: String, trim: true, maxlength: [160, "Meta Description ควรไม่เกิน 160 ตัวอักษร"] },
      keywords: [String],
      socialImage: String,
    },
    embeddingVector: { type: [Number], select: false },
    genreDistribution: { type: Schema.Types.Mixed, select: false },
    sentimentAnalysis: {
      type: {
        overallScore: Number,
        dominantEmotion: String,
      },
      select: false,
    },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    lastEpisodePublishedAt: { type: Date, index: true },
    firstPublishedAt: Date,
    lastSignificantUpdateAt: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----- Indexes -----
NovelSchema.index({ author: 1, title: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
NovelSchema.index({ title: "text", description: "text", tags: "text", "author.username": "text" }, { default_language: "thai" });
NovelSchema.index({ status: 1, visibility: 1, isDeleted: 1 });
NovelSchema.index({ language: 1, status: 1, isDeleted: 1 });
NovelSchema.index({ categories: 1, status: 1, isDeleted: 1 });
NovelSchema.index({ isPremium: 1, status: 1, isDeleted: 1 });
NovelSchema.index({ averageRating: -1 }, { partialFilterExpression: { status: "published", isDeleted: false } });
NovelSchema.index({ viewsCount: -1 }, { partialFilterExpression: { status: "published", isDeleted: false } });
NovelSchema.index({ lastSignificantUpdateAt: -1 }, { partialFilterExpression: { status: "published", isDeleted: false } });
NovelSchema.index({ firstPublishedAt: -1 }, { partialFilterExpression: { status: "published", isDeleted: false } });

// ----- Virtuals (Populated Fields) -----
NovelSchema.virtual("authorDetails", {
  ref: "User",
  localField: "author",
  foreignField: "_id",
  justOne: true,
});

NovelSchema.virtual("episodes", {
  ref: "Episode",
  localField: "_id",
  foreignField: "novel",
  options: { sort: { episodeNumber: 1 } },
});

NovelSchema.virtual("storyMaps", {
  ref: "StoryMap",
  localField: "_id",
  foreignField: "novel",
});

// ----- Middleware -----
NovelSchema.pre("save", async function (next) {
  if (this.isModified("title") || this.isNew) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[\s\W-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  
  if (this.isModified("status") && this.status === "published" && !this.firstPublishedAt) {
    this.firstPublishedAt = new Date();
  }

  if (this.isModified("title") || this.isModified("description") || this.isModified("categories") || this.isModified("tags")) {
    this.lastSignificantUpdateAt = new Date();
  }
  next();
});

// ----- Instance Methods (Example) -----
NovelSchema.methods.updateCounts = async function () {
  const episodeCount = await models.Episode.countDocuments({ novel: this._id, status: "published" });
  this.publishedEpisodesCount = episodeCount;
  this.episodesCount = await models.Episode.countDocuments({ novel: this._id });
};

// ----- Model Export -----
const NovelModel = () => models.Novel as mongoose.Model<INovel> || model<INovel>("Novel", NovelSchema);

export default NovelModel;
