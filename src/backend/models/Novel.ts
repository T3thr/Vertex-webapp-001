// src/backend/models/Novel.ts
import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface สำหรับข้อมูลรายเดือนของรายได้
interface MonthlyEarning {
  year: number; // ปี (เช่น 2025)
  month: number; // เดือน (1-12)
  coinValue: number; // รายได้จากเหรียญ
  donationValue: number; // รายได้จากการบริจาค
}

// Interface สำหรับข้อมูลส่วนลด
interface DiscountDetails {
  percentage?: number; // เปอร์เซ็นต์ส่วนลด (เช่น 20 หมายถึง 20%)
  startDate?: Date; // วันที่เริ่มโปรโมชัน
  endDate?: Date; // วันที่สิ้นสุดโปรโมชัน
}

// Interface สำหรับ Novel document
export interface INovel extends Document {
  title: string;
  slug: string;
  description: string;
  coverImage: string;
  author: Types.ObjectId;
  categories: Types.ObjectId[];
  subCategories?: Types.ObjectId[];
  tags: string[];
  status: "draft" | "published" | "completed" | "onHiatus" | "archived"; // ลบ discount ออกจาก enum
  visibility: "public" | "unlisted" | "private" | "followersOnly";
  language: string;
  isExplicitContent: boolean;
  ageRating?: "everyone" | "teen" | "mature17+" | "adult18+";
  isOriginalWork: boolean;
  originalLanguage?: string;
  translationSource?: string;
  isPremium: boolean;
  isDiscounted: boolean; // เพิ่มฟิลด์ใหม่เพื่อระบุสถานะส่วนลด
  discountDetails?: DiscountDetails; // เพิ่มฟิลด์สำหรับเก็บรายละเอียดส่วนลด
  averageRating: number;
  ratingsCount: number;
  viewsCount: number;
  totalReads: number;
  likesCount: number;
  followersCount: number;
  commentsCount: number;
  episodesCount: number;
  publishedEpisodesCount: number;
  wordsCount?: number;
  stats: {
    totalPurchasesAmount?: number;
    totalDonationsAmount?: number;
    completionRate?: number;
    lastViewedAt?: Date;
    monthlyEarnings?: MonthlyEarning[];
  };
  settings: {
    allowComments: boolean;
    showContentWarnings?: boolean;
    contentWarnings?: string[];
    enableMonetization: boolean;
    enableDonations: boolean;
    enableCharacterDonations: boolean;
  };
  releaseSchedule?: {
    frequency: "asReady" | "daily" | "weekly" | "biweekly" | "monthly";
    dayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    timeOfDay?: string;
    nextExpectedReleaseAt?: Date;
  };
  gameElementsSummary?: {
    hasChoices: boolean;
    hasMultipleEndings: boolean;
    hasStatSystem: boolean;
    hasRelationshipSystem: boolean;
    hasInventorySystem: boolean;
  };
  featuredOfficialMedia?: Types.ObjectId[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    socialImage?: string;
  };
  embeddingVector?: number[];
  genreDistribution?: Record<string, number>;
  sentimentAnalysis?: {
    overallScore: number;
    dominantEmotion?: string;
  };
  isDeleted: boolean;
  deletedAt?: Date;
  lastEpisodePublishedAt?: Date;
  firstPublishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  lastSignificantUpdateAt?: Date;
}

const MonthlyEarningSchema = new Schema<MonthlyEarning>(
  {
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    coinValue: { type: Number, default: 0, min: 0 },
    donationValue: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const DiscountDetailsSchema = new Schema<DiscountDetails>(
  {
    percentage: { type: Number, min: 0, max: 100 },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { _id: false }
);

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
        { validator: (v: string[]) => v.every((tag) => tag.length <= 50), message: "แต่ละแท็กต้องมีความยาวไม่เกิน 50 ตัวอักษร" },
      ],
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "published", "completed", "onHiatus", "archived"], // ลบ discount ออก
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
    isDiscounted: { type: Boolean, default: false, index: true }, // เพิ่มฟิลด์ isDiscounted
    discountDetails: DiscountDetailsSchema, // เพิ่มฟิลด์ discountDetails
    averageRating: { type: Number, default: 0, min: 0, max: 5, index: true },
    ratingsCount: { type: Number, default: 0, min: 0 },
    viewsCount: { type: Number, default: 0, min: 0, index: true },
    totalReads: { type: Number, default: 0, min: 0 },
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
      monthlyEarnings: [MonthlyEarningSchema],
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
NovelSchema.index({ isDiscounted: 1, status: 1, isDeleted: 1 }); // เพิ่ม index สำหรับ isDiscounted
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