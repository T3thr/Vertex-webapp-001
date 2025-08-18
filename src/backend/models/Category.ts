// src/backend/models/Category.ts
// โมเดลหมวดหมู่ (Category Model) - อัปเกรดสำหรับแพลตฟอร์ม DivWy
// จัดการหมวดหมู่ต่างๆ ในระบบ เช่น ประเภทนิยาย, แท็ก, ธีม, กลุ่มเป้าหมายผู้อ่าน, คำเตือนเนื้อหา, Fandoms ฯลฯ

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
// **ลบออก:** ไม่ import BoardModel โดยตรงเพื่อป้องกัน circular dependency
// import BoardModel from "./Board"; 

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Category
// ==================================================================================================

/**
 * @enum {string} CategoryType
 * @description ประเภทของหมวดหมู่ เพื่อช่วยในการจัดกลุ่มและกรองหมวดหมู่เอง
 * - `genre`: ประเภทหลักของนิยาย (เช่น Romance, Fantasy, Sci-Fi, Horror, Mystery)
 * - `sub_genre`: ประเภทย่อย (เช่น Romantic Comedy, High Fantasy, Space Opera, Psychological Horror)
 * - `theme`: ธีมของเรื่อง (เช่น Revenge, Coming of Age, Dystopian, Betrayal, Redemption)
 * - `tag`: แท็กทั่วไป (เช่น Magic, Time Travel, School Life, Cooking, Sports)
 * - `mood_and_tone`: อารมณ์และโทนของเรื่อง (เช่น Dark, Humorous, Heartwarming, Melancholic)
 * - `content_warning`: คำเตือนเนื้อหา (เช่น Violence, Mature Themes, Spoilers, Sensitive Topics)
 * - `age_rating`: กลุ่มอายุผู้อ่าน (เช่น All Ages, Teen, Mature 18+, Parental Guidance)
 * - `fandom`: สำหรับ Fan Fiction (เช่น Harry Potter, Marvel Cinematic Universe, K-Pop)
 * - `character_tag`: แท็กสำหรับตัวละคร (เช่น Tsundere, Yandere, Genius, Anti-Hero)
 * - `setting_tag`: แท็กสำหรับฉากหรือสถานที่ (เช่น Medieval, Futuristic City, School, Hospital)
 * - `story_element`: แท็กสำหรับองค์ประกอบในเรื่อง (เช่น Dragons, Robots, Secret Society, Mythology)
 * - `language`: ภาษาของนิยาย (เช่น Thai, English, Japanese, Korean)
 * - `novel_source_type`: ประเภทแหล่งที่มาของนิยาย (Original, Fanfic, Translation, Adaptation)
 * - `media_type`: ประเภทของ Media (เช่น Image, Audio, Video, Character Sprite, Background)
 * - `seasonal_tag`: แท็กตามฤดูกาลหรือเทศกาล (เช่น Summer, Christmas, Valentine, Halloween)
 * - `event_tag`: แท็กสำหรับกิจกรรมพิเศษในแพลตฟอร์ม (เช่น Writing Contest, Collaboration Event)
 * - `editorial_tag`: แท็กที่บรรณาธิการกำหนด (เช่น Editor's Choice, Rising Star, Featured)
 * - `other`: อื่นๆ ที่ไม่เข้าข่ายประเภทข้างต้น
 */
export enum CategoryType {
  // ประเภทพื้นฐาน
  GENRE = "genre", // ประเภทหลักของนิยาย (เช่น Romance, Fantasy, Sci-Fi)
  SUB_GENRE = "sub_genre", // ประเภทย่อย (เช่น Romantic Comedy, High Fantasy)
  THEME = "theme", // ธีมของเรื่อง (เช่น Revenge, Coming of Age, Dystopian)
  TAG = "tag", // แท็กทั่วไป (เช่น Magic, Time Travel, School Life)
  MOOD_AND_TONE = "mood_and_tone", // อารมณ์และโทนของเรื่อง (เช่น Dark, Humorous, Heartwarming)
  CONTENT_WARNING = "content_warning", // คำเตือนเนื้อหา (เช่น Violence, Mature Themes)
  AGE_RATING = "age_rating", // กลุ่มอายุผู้อ่าน (เช่น All Ages, Teen, Mature 18+)
  FANDOM = "fandom", // สำหรับ Fan Fiction (เช่น Harry Potter, Marvel)
  LANGUAGE = "language", // ภาษาของนิยาย
  NOVEL_SOURCE_TYPE = "novel_source_type", // ประเภทแหล่งที่มา (Original, Fanfic)
  MEDIA_TYPE = "media_type", // ประเภทของ Media Asset (Image, Audio)
  EDITORIAL_TAG = "editorial_tag", // แท็กที่บรรณาธิการกำหนด (Editor's Choice)
  OTHER = "other", // อื่นๆ

  // ประเภทเพิ่มเติมเพื่อความเป็น visual novel
  ART_STYLE = "art_style", // สไตล์ภาพ (เช่น Anime, Realistic, Pixel Art)
  GAMEPLAY_MECHANIC = "gameplay_mechanic", // กลไกการเล่น (เช่น Stat-based, Puzzle)
  INTERACTIVITY_LEVEL = "interactivity_level", // ระดับการโต้ตอบ (เช่น Kinetic, Branching Narrative)
  PLAYER_AGENCY_LEVEL = "player_agency_level", // ระดับการควบคุมของผู้เล่น (เช่น Fixed Protagonist)
  LENGTH_TAG = "length_tag", // ความยาวของนิยาย/เกม (เช่น Short Story, Full Game)
  NARRATIVE_PACING = "narrative_pacing", // จังหวะการดำเนินเรื่อง (เช่น Slow Burn, Fast-Paced)
  PRIMARY_CONFLICT_TYPE = "primary_conflict_type", // ประเภทความขัดแย้งหลัก (เช่น Man vs Self)
  NARRATIVE_PERSPECTIVE = "narrative_perspective", // มุมมองการเล่าเรื่อง (เช่น First Person, Third Person)
  STORY_ARC_STRUCTURE = "story_arc_structure", // โครงสร้างเส้นเรื่อง (เช่น Hero's Journey)
  COMMON_TROPE = "common_trope", // Trope ที่ใช้บ่อย (เช่น Enemies to Lovers, Chosen One)
  CHARACTER_ARCHETYPE = "character_archetype", // ต้นแบบตัวละคร (เช่น The Mentor, The Rebel) - อาจคล้าย character_tag แต่เน้นโครงสร้าง
  SETTING_PERIOD = "setting_period", // ยุคสมัยของฉาก (เช่น Medieval, Futuristic, Victorian)
  SETTING_ENVIRONMENT = "setting_environment", // สภาพแวดล้อมของฉาก (เช่น Urban, Wilderness, Space)
  SENSITIVE_CHOICE_TOPIC = "sensitive_choice_topic", // หัวข้อของตัวเลือกที่ละเอียดอ่อน (สำหรับให้นักเขียนบล็อกการวิเคราะห์)
  TARGET_AUDIENCE_PROFILE = "target_audience_profile", // โปรไฟล์กลุ่มเป้าหมาย (เช่น "ผู้ชื่นชอบการสืบสวน") - ใช้เก็บคำอธิบาย
  AVOID_IF_DISLIKE_TAG = "avoid_if_dislike_tag", // แท็กสำหรับสิ่งที่ผู้อ่านอาจไม่ชอบ (เช่น "ตัวละครหลักตาย")

  // ประเภทเดิมที่อาจปรับให้ชัดเจนขึ้น หรือรวมอยู่ในประเภทอื่น
  CHARACTER_TAG = "character_tag", // อาจรวมกับ CHARACTER_ARCHETYPE หรือใช้แยกกันสำหรับลักษณะนิสัย
  SETTING_TAG = "setting_tag", // อาจแยกเป็น SETTING_PERIOD และ SETTING_ENVIRONMENT
  STORY_ELEMENT = "story_element", // แท็กองค์ประกอบในเรื่อง (เช่น Dragons, Robots) - อาจเป็น TAG ทั่วไป
  SEASONAL_TAG = "seasonal_tag", // แท็กตามฤดูกาลหรือเทศกาล
  EVENT_TAG = "event_tag", // แท็กสำหรับกิจกรรมพิเศษในแพลตฟอร์ม
}

/**
 * @enum {string} CategoryVisibility
 * @description ระดับการมองเห็นของหมวดหมู่
 */
export enum CategoryVisibility {
  PUBLIC = "public",
  RESTRICTED = "restricted",
  ADMIN_ONLY = "admin_only",
  HIDDEN = "hidden",
}

/**
 * @interface ICategoryLocalization
 * @description การแปลชื่อและคำอธิบายของหมวดหมู่ในภาษาต่างๆ
 */
export interface ICategoryLocalization {
  locale: string; // รหัสภาษา (เช่น "en", "th")
  name: string; // ชื่อหมวดหมู่ในภาษานั้นๆ
  description?: string; // คำอธิบายหมวดหมู่ในภาษานั้นๆ
}
const CategoryLocalizationSchema = new Schema<ICategoryLocalization>(
  {
    locale: { type: String, required: true, trim: true, minlength: 2, maxlength: 10 },
    name: { type: String, required: true, trim: true, maxlength: [150, "ชื่อหมวดหมู่ในภาษาอื่นยาวเกินไป"] },
    description: { type: String, trim: true, maxlength: [1000, "คำอธิบายหมวดหมู่ในภาษาอื่นยาวเกินไป"] },
  },
  { _id: false }
);

/**
 * @interface ICategoryUsageStats
 * @description สถิติการใช้งานของหมวดหมู่
 */
export interface ICategoryUsageStats {
  novelCount: number; // จำนวนนิยายที่ใช้หมวดหมู่นี้
  boardCount: number; // **เพิ่มเข้ามา:** จำนวนกระทู้ที่ใช้หมวดหมู่นี้
  viewCount: number; // จำนวนการเข้าชมหน้าหมวดหมู่นี้
  searchCount: number; // จำนวนครั้งที่หมวดหมู่นี้ถูกค้นหา
  lastUpdated: Date; // วันที่อัปเดตสถิติล่าสุด
}
const CategoryUsageStatsSchema = new Schema<ICategoryUsageStats>(
  {
    novelCount: { type: Number, default: 0, min: 0 },
    boardCount: { type: Number, default: 0, min: 0 }, // **เพิ่มเข้ามา:**
    viewCount: { type: Number, default: 0, min: 0 },
    searchCount: { type: Number, default: 0, min: 0 },
    lastUpdated: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร Category (ICategory Document Interface)
// ==================================================================================================

/**
 * @interface ICategory
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารหมวดหมู่ใน Collection "categories"
 */
export interface ICategory extends Document {
  _id: Types.ObjectId;
  name: string; // ชื่อหมวดหมู่ในภาษาหลัก
  slug: string; // Slug สำหรับ URL
  description?: string; // คำอธิบายเพิ่มเติมในภาษาหลัก
  categoryType: CategoryType; // ประเภทของหมวดหมู่
  parentCategoryId?: Types.ObjectId; // ID ของหมวดหมู่แม่ (ถ้าเป็นหมวดหมู่ย่อย)
  localizations?: Types.DocumentArray<ICategoryLocalization>; // การแปลชื่อและคำอธิบาย
  iconUrl?: string; // URL ของไอคอน
  coverImageUrl?: string; // URL ของภาพปก (สำหรับแสดงในหน้า Category)
  color?: string; // สีประจำหมวดหมู่ (Hex color code)
  relatedCategories?: Types.ObjectId[]; // IDs ของหมวดหมู่ที่เกี่ยวข้อง
  visibility: CategoryVisibility; // ระดับการมองเห็น
  isSystemDefined: boolean; // หมวดหมู่นี้ถูกสร้างโดยระบบหรือไม่ (ผู้ใช้ทั่วไปแก้ไข/ลบไม่ได้)
  isCoreSystemCategory?: boolean; // (เพิ่มใหม่) หมวดหมู่ที่เป็นแกนหลักของระบบจริงๆ (Admin แก้ไขได้จำกัด)
  isActive: boolean; // หมวดหมู่นี้ใช้งานอยู่หรือไม่
  displayOrder?: number; // ลำดับการแสดงผล
  isPromoted?: boolean; // หมวดหมู่นี้ถูกโปรโมทหรือไม่
  promotionStartDate?: Date; // วันที่เริ่มโปรโมท
  promotionEndDate?: Date; // วันที่สิ้นสุดการโปรโมท
  usageStats?: ICategoryUsageStats; // สถิติการใช้งาน
  createdByUserId?: Types.ObjectId; // ID ของผู้ใช้ที่สร้าง
  lastModifiedByUserId?: Types.ObjectId; // ID ของผู้ใช้ที่แก้ไขล่าสุด

  // ฟิลด์เพิ่มเติม
  targetAudienceDescription?: string; // (เพิ่มใหม่) คำอธิบายกลุ่มเป้าหมาย (เช่น "เหมาะสำหรับผู้ที่ชื่นชอบ...")
  // commonTropes ถูกจัดการผ่านการอ้างอิง Category ที่มี categoryType: COMMON_TROPE
  // avoidIfYouDislike ถูกจัดการผ่านการอ้างอิง Category ที่มี categoryType: AVOID_IF_DISLIKE_TAG
  recommendedForFansOf?: string[]; // (เพิ่มใหม่) แนะนำสำหรับแฟนๆ ของ (ชื่อนิยาย/เกม/ภาพยนตร์อื่น)

  seoTitle?: string; // ชื่อสำหรับ SEO
  seoDescription?: string; // คำอธิบายสำหรับ SEO
  seoKeywords?: string[]; // คำสำคัญสำหรับ SEO
  customFields?: Record<string, any>; // ฟิลด์เพิ่มเติมที่กำหนดเอง
  createdAt: Date;
  updatedAt: Date;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ Category (CategorySchema)
// ==================================================================================================
const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, "กรุณาระบุชื่อหมวดหมู่ (Category name is required)"],
      trim: true,
      maxlength: [150, "ชื่อหมวดหมู่ยาวเกินไป (ไม่ควรเกิน 150 ตัวอักษร)"],
      index: true,
    },
    slug: {
      type: String,
      required: [true, "กรุณาระบุ Slug (Slug is required)"],
      trim: true,
      lowercase: true,
      maxlength: [200, "Slug ยาวเกินไป (ไม่ควรเกิน 200 ตัวอักษร)"],
      // unique จะถูกจัดการผ่าน compound index ด้านล่าง
    },
    description: { type: String, trim: true, maxlength: [1000, "คำอธิบายหมวดหมู่ยาวเกินไป (ไม่ควรเกิน 1000 ตัวอักษร)"] },
    categoryType: {
      type: String,
      enum: Object.values(CategoryType), // ใช้ enum ที่อัปเดตแล้ว
      required: [true, "กรุณาระบุประเภทของหมวดหมู่ (Category type is required)"],
      index: true,
    },
    parentCategoryId: { type: Schema.Types.ObjectId, ref: "Category", index: true },
    localizations: [CategoryLocalizationSchema],
    iconUrl: { type: String, trim: true, maxlength: [2048, "URL ไอคอนยาวเกินไป"] },
    coverImageUrl: { type: String, trim: true, maxlength: [2048, "URL ภาพปกยาวเกินไป"] },
    color: {
      type: String,
      trim: true,
      match: [/^#([0-9a-fA-F]{3}){1,2}$/, "กรุณากรอก Hex color code ให้ถูกต้อง (เช่น #FF5733)"],
      uppercase: true,
    },
    relatedCategories: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    visibility: {
      type: String,
      enum: Object.values(CategoryVisibility),
      default: CategoryVisibility.PUBLIC,
      index: true,
    },
    isSystemDefined: { type: Boolean, default: false, index: true },
    isCoreSystemCategory: { type: Boolean, default: false, index: true }, // ฟิลด์ใหม่
    isActive: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0 },
    isPromoted: { type: Boolean, default: false, index: true },
    promotionStartDate: { type: Date },
    promotionEndDate: { type: Date },
    usageStats: { type: CategoryUsageStatsSchema, default: () => ({ novelCount: 0, boardCount: 0, viewCount: 0, searchCount: 0, lastUpdated: new Date() }) }, // **อัปเดต default value**
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User" },
    lastModifiedByUserId: { type: Schema.Types.ObjectId, ref: "User" },

    // ฟิลด์เพิ่มเติม
    targetAudienceDescription: { type: String, trim: true, maxlength: [1000, "คำอธิบายกลุ่มเป้าหมายยาวเกินไป"] },
    recommendedForFansOf: [{ type: String, trim: true, maxlength: [200, "ชื่อผลงานที่แนะนำยาวเกินไป"] }],

    seoTitle: { type: String, trim: true, maxlength: [200, "SEO Title ยาวเกินไป"] },
    seoDescription: { type: String, trim: true, maxlength: [500, "SEO Description ยาวเกินไป"] },
    seoKeywords: [{ type: String, trim: true, maxlength: [100, "SEO Keyword ยาวเกินไป"] }],
    customFields: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

// Unique index สำหรับ slug ภายใน categoryType เดียวกัน (สำคัญมาก)
CategorySchema.index({ slug: 1, categoryType: 1 }, { unique: true, name: "CategoryTypeSlugUniqueIndex" });
// Index สำหรับการค้นหาตามชื่อและประเภท
CategorySchema.index({ name: 1, categoryType: 1 }, { name: "CategoryNameTypeIndex" });
// Index สำหรับการค้นหาหมวดหมู่ย่อยของหมวดหมู่หนึ่งๆ
CategorySchema.index({ parentCategoryId: 1, categoryType: 1, displayOrder: 1 }, { name: "CategoryHierarchyIndex" });
// Index สำหรับการค้นหาหมวดหมู่ที่กำลังโปรโมท
CategorySchema.index({ isPromoted: 1, promotionStartDate: 1, promotionEndDate: 1 }, { name: "CategoryPromotionIndex" });
// Index สำหรับการค้นหาหมวดหมู่ที่ active และ visible
CategorySchema.index({ isActive: 1, visibility: 1, categoryType: 1 }, { name: "CategoryActiveVisibleTypeIndex" }); // เพิ่ม categoryType เพื่อประสิทธิภาพ
// Text index สำหรับการค้นหาด้วยข้อความ
CategorySchema.index(
  { name: "text", description: "text", "localizations.name": "text", "localizations.description": "text", seoKeywords: "text" }, // เพิ่ม seoKeywords
  {
    name: "CategoryTextSearchIndex",
    weights: { name: 10, "localizations.name": 8, description: 5, "localizations.description": 3, seoKeywords: 7 },
    default_language: "none", // กำหนดเป็น none เพื่อให้รองรับหลายภาษาได้ดีขึ้นสำหรับ text index ใน MongoDB 5.0+
                               // หรือพิจารณาใช้ $language ใน query ถ้าต้องการระบุภาษา
  }
);

// ==================================================================================================
// SECTION: Virtuals (ฟิลด์เสมือน)
// ==================================================================================================

CategorySchema.virtual("childrenCategories", {
  ref: "Category",
  localField: "_id",
  foreignField: "parentCategoryId",
  justOne: false, // สามารถมี children ได้หลายตัว
});

CategorySchema.virtual("fullUrl").get(function (this: ICategory) {
  return `/categories/${this.categoryType}/${this.slug}`; // ตัวอย่าง URL path
});

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

CategorySchema.pre<ICategory>("save", async function (next) {
  // 1. สร้าง/อัปเดต slug จาก name (ถ้าจำเป็น)
  if (this.isModified("name") || this.isNew) {
    const slugify = (text: string): string => {
      return text
        .toString()
        .toLowerCase()
        .normalize("NFD") // แยกตัวอักษรกับ diacritics
        .replace(/[\u0300-\u036f]/g, "") // ลบ diacritics
        .replace(/\s+/g, "-") // แทนที่ช่องว่างด้วย -
        .replace(/[^\w-]+/g, "") // ลบอักขระพิเศษที่ไม่ใช่ word characters หรือ hyphens
        .replace(/\-\-+/g, "-") // แทนที่ -- ด้วย -
        .replace(/^-+/, "") // ตัด - หน้าสุด
        .replace(/-+$/, ""); // ตัด - ท้ายสุด
    };
    let baseSlug = slugify(this.name);
    if (!baseSlug) { // กรณีชื่อเป็นอักขระพิเศษล้วนๆ
        baseSlug = `category-${new Types.ObjectId().toHexString().slice(-6)}`;
    }

    let finalSlug = baseSlug;
    let count = 0;
    const CategoryModelConst = models.Category || model<ICategory>("Category");

    // ตรวจสอบความ unique ของ slug ภายใน categoryType เดียวกัน
    while (true) {
      const existingCategory = await CategoryModelConst.findOne({
        slug: finalSlug,
        categoryType: this.categoryType,
        _id: { $ne: this._id } // ไม่ใช่ตัวมันเอง
      });
      if (!existingCategory) break;
      count++;
      finalSlug = `${baseSlug}-${count}`;
    }
    this.slug = finalSlug;
  }

  // 2. ป้องกัน circular parent-child relationship
  if (this.parentCategoryId && (this.isNew || this.isModified("parentCategoryId"))) {
    if (this.parentCategoryId.toString() === this._id.toString()) {
      return next(new Error("หมวดหมู่ไม่สามารถเป็น parent ของตัวเองได้"));
    }
    // การตรวจสอบ circular reference แบบลึก อาจจะซับซ้อนและ tốn performance ใน pre-save hook
    // อาจจะต้องมี utility function แยก หรือทำใน service layer
    // ตัวอย่างการตรวจสอบแบบง่าย (อาจไม่ครอบคลุมทุกกรณีซับซ้อน):
    const CategoryModelConst = models.Category || model<ICategory>("Category");
    let parent = await CategoryModelConst.findById(this.parentCategoryId);
    const visited = new Set<string>();
    visited.add(this._id.toString());
    while(parent) {
        if(visited.has(parent._id.toString())) {
            return next(new Error("ตรวจพบการอ้างอิงวนกลับในลำดับชั้นของหมวดหมู่"));
        }
        visited.add(parent._id.toString());
        if (!parent.parentCategoryId) break;
        parent = await CategoryModelConst.findById(parent.parentCategoryId);
    }
  }

  // 3. ตรวจสอบ localizations ไม่มี locale ซ้ำกัน
  if (this.localizations && this.localizations.length > 0) {
    const locales = this.localizations.map(loc => loc.locale);
    if (new Set(locales).size !== locales.length) {
      return next(new Error("พบ locale ซ้ำกันในการแปลภาษา"));
    }
  }
  
  // 4. ตรวจสอบวันที่โปรโมท
  if (this.isPromoted && this.promotionEndDate && this.promotionStartDate && this.promotionEndDate < this.promotionStartDate) {
    return next(new Error("วันที่สิ้นสุดการโปรโมทต้องมาหลังวันที่เริ่มต้น"));
  }
  if (!this.isPromoted) {
    this.promotionStartDate = undefined;
    this.promotionEndDate = undefined;
  }

  next();
});

// Middleware: หลังจากลบเอกสาร (findOneAndDelete hook ไม่ได้ส่ง doc เข้ามาโดยตรงใน version เก่าๆ, ต้อง query ใหม่ หรือใช้ pre hook)
// สำหรับ MongoDB v5+ และ Mongoose v6+ post('findOneAndDelete') จะได้รับ doc ที่ถูกลบ
CategorySchema.post<mongoose.Query<ICategory, ICategory>>("findOneAndDelete", async function (doc) {
    // ใน Mongoose 6+, `doc` คือ document ที่ถูกลบ (ถ้า query เจอ)
    // ถ้าใช้ Mongoose version เก่ากว่า อาจจะต้อง query document มาใน pre hook ก่อน
    const deletedDoc = doc as ICategory | null; // Type assertion

    if (deletedDoc && deletedDoc._id) {
        try {
            // **แก้ไข:** เรียกใช้โมเดลผ่าน mongoose.models หรือ model() แทนการ import โดยตรง
            const CategoryModelConst = models.Category || model<ICategory>("Category");
            const NovelModelConst = models.Novel || model("Novel");
            const BoardModel = models.Board || model("Board"); // **แก้ไข:** เรียก BoardModel ที่นี่

            // 1. อัปเดตหมวดหมู่ลูก: ตั้ง parentCategoryId เป็น null หรือ parent ของหมวดหมู่ที่ถูกลบ
            await CategoryModelConst.updateMany(
                { parentCategoryId: deletedDoc._id },
                { $set: { parentCategoryId: deletedDoc.parentCategoryId || null } }
            );

            // 2. ลบออกจาก relatedCategories ของหมวดหมู่อื่น
            await CategoryModelConst.updateMany(
                { relatedCategories: deletedDoc._id },
                { $pull: { relatedCategories: deletedDoc._id } }
            );
            
            // 3. **อัปเดต Board ที่ใช้หมวดหมู่นี้**
            // ค้นหากระทู้ทั้งหมดที่ใช้ categoryAssociated เป็น ID ของหมวดหมู่ที่ถูกลบ
            // แล้วตั้งค่า categoryAssociated เป็น null หรือย้ายไปยังหมวดหมู่ "ทั่วไป" (ถ้ามี)
            // ในที่นี้จะตั้งเป็น null เพื่อให้ผู้ดูแลระบบตัดสินใจต่อไป
            await BoardModel.updateMany(
                { categoryAssociated: deletedDoc._id },
                { $set: { categoryAssociated: null } }
            );

            // 4. อัปเดต Novel ที่ใช้หมวดหมู่นี้ (ลบออกจาก array ต่างๆ ใน themeAssignment)
            // ต้องระบุ path ของ array ที่ต้องการ $pull ให้ถูกต้อง
            const pullOperations: any = {};
            pullOperations['themeAssignment.mainTheme.categoryId'] = deletedDoc._id; // อันนี้อาจจะต้อง handle ต่างหากถ้า mainTheme ถูกลบ
            pullOperations['themeAssignment.subThemes'] = { categoryId: deletedDoc._id }; // สำหรับ array of objects
            pullOperations['themeAssignment.moodAndTone'] = deletedDoc._id;
            pullOperations['themeAssignment.contentWarnings'] = deletedDoc._id;
            pullOperations['ageRatingCategoryId'] = deletedDoc._id; // ถ้า ageRating ก็ใช้ Category model

            // การ $pull mainTheme.categoryId ตรงๆ อาจจะไม่ใช่สิ่งที่ต้องการ
            // อาจจะต้อง clear หรือตั้งเป็น default ถ้า main category ถูกลบ
            // ที่นี่จะ pull ออกจาก array อื่นๆ ก่อน
            await NovelModelConst.updateMany(
                {
                    $or: [
                        // { "themeAssignment.mainTheme.categoryId": deletedDoc._id }, // Handle mainTheme separately
                        { "themeAssignment.subThemes.categoryId": deletedDoc._id },
                        { "themeAssignment.moodAndTone": deletedDoc._id },
                        { "themeAssignment.contentWarnings": deletedDoc._id },
                        { "ageRatingCategoryId": deletedDoc._id },
                        { "sourceType.fandomCategoryId": deletedDoc._id } // เพิ่มการตรวจสอบ fandomCategoryId ด้วย
                    ]
                },
                {
                    $pull: {
                        "themeAssignment.subThemes": { categoryId: deletedDoc._id } as any, // Cast to any to satisfy type for array of objects
                        "themeAssignment.moodAndTone": deletedDoc._id,
                        "themeAssignment.contentWarnings": deletedDoc._id,
                    }
                }
            );
            // Handle clearing fields that are single ObjectId references
            await NovelModelConst.updateMany({ "themeAssignment.mainTheme.categoryId": deletedDoc._id }, { $unset: { "themeAssignment.mainTheme": "" } });
            await NovelModelConst.updateMany({ "ageRatingCategoryId": deletedDoc._id }, { $unset: { "ageRatingCategoryId": "" } });
            await NovelModelConst.updateMany({ "sourceType.fandomCategoryId": deletedDoc._id }, { $unset: { "sourceType.fandomCategoryId": "" } });


        } catch (error: any) {
            console.error(`[CategoryMiddlewareError] Failed to update related data after deleting category ${deletedDoc._id}: ${error.message}`);
        }
    }
});


// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

const CategoryModel = (models.Category as mongoose.Model<ICategory>) || model<ICategory>("Category", CategorySchema);

export default CategoryModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Hierarchical Categories**: ระบบหมวดหมู่แบบลำดับชั้น (`parentCategoryId`) มีความยืดหยุ่นสูง
// 2.  **Localization**: `localizations` ช่วยรองรับหลายภาษา ควรมี UI ที่ดีในการจัดการ
// 3.  **Usage Statistics**: `usageStats` ควรมี cron job หรือ trigger เพื่ออัปเดตข้อมูลเป็นระยะ (รวมถึง `boardCount`)
// 4.  **Promotion System**: `isPromoted` และวันที่เกี่ยวข้อง ควรมีระบบจัดการเบื้องหลัง
// 5.  **SEO Optimization**: ควรมีการนำฟิลด์ SEO ไปใช้งานจริงในการสร้าง sitemap และ meta tags
// 6.  **Flexibility vs Complexity**: การเพิ่ม CategoryType จำนวนมากช่วยให้ละเอียด แต่ต้องสมดุลกับความง่ายในการใช้งานของนักเขียน
//     อาจมี UI ที่ชาญฉลาดช่วยแนะนำหรือจัดกลุ่ม CategoryType ที่เกี่ยวข้องกัน
// 7.  **Data Integrity in Deletion**: Middleware `post('findOneAndDelete')` พยายามจัดการการอ้างอิงข้อมูลที่เกี่ยวข้องทั้งใน Novel และ Board
//     การตั้งค่า ID ที่เกี่ยวข้องเป็น null เป็นวิธีที่ปลอดภัยวิธีหนึ่ง ซึ่งอาจต้องมีการกำหนดหมวดหมู่เริ่มต้น (default) เพื่อย้ายข้อมูลไปแทน
// 8.  **Slug Uniqueness**: การสร้าง slug ให้ unique ภายใน `categoryType` เดียวกัน เป็นสิ่งสำคัญ
// 9.  **MongoDB Versioning**: โค้ดนี้พยายามใช้ Mongoose features ที่เข้ากันได้กับ MongoDB version ใหม่ๆ (ต้นปี 2025)
//     เช่น text index options, virtual populate, และการจัดการ subdocuments
// 10. **Frontend Rendering**: การออกแบบ Schema คำนึงถึงการนำไป populate และแสดงผลบน frontend ได้โดยง่าย
//     เช่น virtuals, และการอ้างอิง ObjectId ที่ชัดเจน
// ==================================================================================================