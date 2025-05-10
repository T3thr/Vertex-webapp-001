// src/backend/models/Category.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface สำหรับ Category document
// Categories ใช้สำหรับจัดระเบียบ Novels และเนื้อหาอื่นๆ ที่อาจมี
// ออกแบบมาเพื่อรองรับการกรองและการแสดงผลที่ซับซ้อนใน UI
export interface ICategory extends Document {
  name: string; // ชื่อหมวดหมู่ (เช่น "แฟนตาซี", "โรแมนติก", "สยองขวัญ") - ชื่อที่แสดงต่อผู้ใช้
  slug: string; // URL-friendly slug (unique) - สำหรับใช้ใน URL ให้สั้นและสื่อความหมาย
  description?: string; // คำอธิบายหมวดหมู่ (รองรับ Markdown) - รายละเอียดเพิ่มเติมเกี่ยวกับหมวดหมู่
  
  // Hierarchy and Structure (โครงสร้างลำดับชั้น)
  parentCategory?: Types.ObjectId; // หมวดหมู่หลัก (ถ้าเป็นหมวดหมู่ย่อย) - อ้างอิงไปยัง Category อื่นที่เป็นแม่
  ancestorPath?: Types.ObjectId[]; // เส้นทางของหมวดหมู่หลักทั้งหมด (เช่น [grandparent_id, parent_id]) - ช่วยในการ query ที่ซับซ้อน
  level: number; // ระดับความลึกในโครงสร้างหมวดหมู่ (0 = หมวดหมู่หลัก) - ช่วยในการแสดงผลและจัดการ UI
  categoryType: "genre" | "subgenre" | "theme" | "trope" | "setting" | "art_style" | "gameplay_feature" | "content_warning" | "tag" | "platform_specific"; // ประเภทของหมวดหมู่เพื่อการกรองขั้นสูง - เช่น หมวดหมู่หลัก, ธีม, แท็ก

  // Visuals & UI Presentation (การแสดงผลและภาพลักษณ์)
  iconUrl?: string; // URL ของไอคอน (SVG, PNG) - สำหรับแสดงใน UI
  coverImageUrl?: string; // URL ของภาพปกสำหรับหน้าหมวดหมู่ - ภาพขนาดใหญ่สำหรับตกแต่ง
  themeColor?: string; // สีหลักของหมวดหมู่ (HEX, e.g., "#FF69B4") - เพื่อสร้าง branding
  displayOrder?: number; // ลำดับการแสดงผล (สำหรับหมวดหมู่ในระดับเดียวกัน) - ควบคุมการเรียงลำดับใน UI
  isVisible: boolean; // แสดงหมวดหมู่นี้ในรายการหรือไม่ - ควบคุมการมองเห็นทั่วไป
  isFeatured: boolean; // หมวดหมู่นี้ถูกเน้น/แนะนำเป็นพิเศษหรือไม่ (เช่น ในหน้าแรกส่วน features) - ต่างจาก isPromoted ที่อาจใช้สำหรับ SEO หรือการตลาด
  isPromoted: boolean; // โปรโมทหมวดหมู่นี้ในหน้าหลักหรือส่วนแนะนำหรือไม่ (อาจใช้สำหรับ SEO หรือการตลาด)

  // SEO Settings (การตั้งค่าสำหรับ SEO)
  seo: {
    metaTitle?: string; // ชื่อสำหรับ SEO (อาจ default จาก name)
    metaDescription?: string; // คำอธิบายสำหรับ SEO (อาจ default จาก description)
    keywords?: string[]; // คำสำคัญสำหรับ SEO
  };

  // Content Association and Stats (การเชื่อมโยงกับเนื้อหาและสถิติ)
  novelCount: number; // จำนวนนิยายทั้งหมดในหมวดหมู่นี้ (รวมหมวดหมู่ย่อย, อาจต้องอัปเดตผ่าน trigger)
  
  // Specific Settings & Restrictions (การตั้งค่าเฉพาะและข้อจำกัด)
  allowedNovelAgeRatings?: ("everyone" | "teen" | "mature" | "adult")[]; // การจัดเรทอายุของนิยายที่อนุญาตในหมวดหมู่นี้
  allowsExplicitContent: boolean; // หมวดหมู่นี้อนุญาตเนื้อหาสำหรับผู้ใหญ่หรือไม่
  isSystemCategory: boolean; // เป็นหมวดหมู่ที่สร้างโดยระบบหรือไม่ (ผู้ใช้ทั่วไปแก้ไขไม่ได้)
  
  // Standard Timestamps and Soft Delete (ข้อมูลเวลามาตรฐานและการลบแบบ soft delete)
  isDeleted: boolean; // Soft delete status
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { 
      type: String, 
      required: [true, "กรุณาระบุชื่อหมวดหมู่"], // ชื่อหมวดหมู่จำเป็นต้องมี
      trim: true, 
      maxlength: [100, "ชื่อหมวดหมู่ต้องไม่เกิน 100 ตัวอักษร"], 
      index: true 
    },
    slug: { 
      type: String, 
      required: [true, "กรุณาระบุ slug สำหรับหมวดหมู่"], // slug จำเป็นต้องมี
      unique: true, // slug ต้องไม่ซ้ำกัน
      trim: true, 
      lowercase: true, 
      maxlength: [120, "Slug ต้องไม่เกิน 120 ตัวอักษร"] 
    },
    description: { 
      type: String, 
      trim: true, 
      maxlength: [1500, "คำอธิบายหมวดหมู่ต้องไม่เกิน 1500 ตัวอักษร"] 
    },
    parentCategory: { 
      type: Schema.Types.ObjectId, 
      ref: "Category", 
      index: true 
    },
    ancestorPath: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    level: { 
      type: Number, 
      default: 0, 
      min: 0, 
      max: 10, // เพิ่ม max depth สำหรับความยืดหยุ่น
      index: true 
    },
    categoryType: {
      type: String,
      enum: ["genre", "subgenre", "theme", "trope", "setting", "art_style", "gameplay_feature", "content_warning", "tag", "platform_specific"],
      required: [true, "กรุณาระบุประเภทของหมวดหมู่"], // ประเภทหมวดหมู่จำเป็นต้องมี
      default: "tag",
      index: true
    },
    iconUrl: { type: String, trim: true },
    coverImageUrl: { type: String, trim: true },
    themeColor: { type: String, trim: true },
    displayOrder: { type: Number, default: 0, index: true },
    isVisible: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true }, // เพิ่ม field isFeatured
    isPromoted: { type: Boolean, default: false, index: true },
    seo: {
      metaTitle: { type: String, trim: true, maxlength: [70, "Meta title ต้องไม่เกิน 70 ตัวอักษร"] },
      metaDescription: { type: String, trim: true, maxlength: [160, "Meta description ต้องไม่เกิน 160 ตัวอักษร"] },
      keywords: [{ type: String, trim: true, lowercase: true }],
    },
    novelCount: { type: Number, default: 0, min: 0 },
    allowedNovelAgeRatings: {
      type: [String],
      enum: ["everyone", "teen", "mature", "adult"],
      default: ["everyone", "teen", "mature", "adult"],
    },
    allowsExplicitContent: { type: Boolean, default: false },
    isSystemCategory: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----- Indexes (ดัชนีสำหรับ query ที่มีประสิทธิภาพ) -----
// Unique slug per non-deleted category (ปรับปรุง unique index)
CategorySchema.index({ slug: 1, isDeleted: 1 }, { unique: true });

// For finding top-level categories or categories by parent, ordered by displayOrder
CategorySchema.index({ parentCategory: 1, displayOrder: 1, isVisible: 1, isDeleted: 1 });

// For filtering by categoryType, visibility, and order
CategorySchema.index({ categoryType: 1, isVisible: 1, displayOrder: 1, isDeleted: 1 });

// For searching categories by name (text index)
CategorySchema.index({ name: "text", description: "text" }, { default_language: "thai", weights: { name: 10, description: 5 } });

// For filtering by level and visibility
CategorySchema.index({ level: 1, isVisible: 1, isDeleted: 1 });

// For featured categories
CategorySchema.index({ isFeatured: 1, isVisible: 1, isDeleted: 1, displayOrder: 1 });

// ----- Middleware (ฟังก์ชันที่ทำงานก่อนหรือหลัง event บางอย่าง) -----
CategorySchema.pre("save", async function (next) {
  // Auto-generate slug from name if not provided or if name changed
  if ((this.isModified("name") || this.isNew) && (!this.slug || this.isModified("name"))) {
    const baseSlug = (this.name || "")
      .toLowerCase()
      .replace(/\s+/g, "-")      // แทนที่ช่องว่างด้วย -
      .replace(/[^a-z0-9ก-๙เ-ไ\-]+/g, "") // ลบอักขระที่ไม่ใช่ alphanumeric ไทย อังกฤษ หรือ -
      .replace(/--+/g, "-")     // แทนที่ -- ด้วย -
      .substring(0, 100);
    
    // Ensure slug uniqueness by appending a counter if necessary
    // This is a basic implementation; a more robust solution might use a separate counter or UUIDs for extremely high collision scenarios.
    let slug = baseSlug;
    let count = 0;
    const Category = this.constructor as mongoose.Model<ICategory>; // Get the model constructor
    while (await Category.findOne({ slug: slug, _id: { $ne: this._id }, isDeleted: this.isDeleted })) {
      count++;
      slug = `${baseSlug}-${count}`;
    }
    this.slug = slug;
  }

  // Manage ancestorPath and level
  if (this.isModified("parentCategory") || this.isNew) {
    if (this.parentCategory) {
      const Category = this.constructor as mongoose.Model<ICategory>;
      const parent = await Category.findById(this.parentCategory).select("ancestorPath level");
      if (parent) {
        this.ancestorPath = [...(parent.ancestorPath || []), this.parentCategory];
        this.level = parent.level + 1;
        if (this.level > 10) { // Enforce max depth
            return next(new Error("Category depth cannot exceed 10 levels."));
        }
      } else {
        // Parent category not found, reset to top level
        this.parentCategory = undefined;
        this.ancestorPath = [];
        this.level = 0;
      }
    } else {
      this.ancestorPath = [];
      this.level = 0;
    }
  }
  next();
});

// ----- Virtuals (field ที่ไม่ได้เก็บใน DB โดยตรง แต่คำนวณได้) -----
// Virtual to get children categories
CategorySchema.virtual("children", {
  ref: "Category",
  localField: "_id",
  foreignField: "parentCategory",
  justOne: false,
  options: { sort: { displayOrder: 1 }, match: { isVisible: true, isDeleted: false } },
});

// ----- Static Methods (ฟังก์ชันที่เรียกใช้ผ่าน Model โดยตรง) -----
// Example: Method to get a category tree (can be complex, consider client-side processing or optimized queries)
// CategorySchema.statics.getCategoryTree = async function() { ... };

// ----- Model Export (ส่งออก Model) -----
const CategoryModel = () => models.Category as mongoose.Model<ICategory> || model<ICategory>("Category", CategorySchema);

export default CategoryModel;