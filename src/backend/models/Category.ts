// src/backend/models/Category.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface for Category document
// Categories are used to organize Novels and potentially other content.
export interface ICategory extends Document {
  name: string; // ชื่อหมวดหมู่ (เช่น "แฟนตาซี", "โรแมนติก", "สยองขวัญ")
  slug: string; // URL-friendly slug (unique)
  description?: string; // คำอธิบายหมวดหมู่ (รองรับ Markdown)
  parentCategory?: Types.ObjectId; // หมวดหมู่หลัก (ถ้าเป็นหมวดหมู่ย่อย)
  ancestorPath?: Types.ObjectId[]; // เส้นทางของหมวดหมู่หลักทั้งหมด (เช่น [grandparent_id, parent_id])
  level: number; // ระดับความลึกในโครงสร้างหมวดหมู่ (0 = หมวดหมู่หลัก)
  // Visuals
  iconUrl?: string; // URL ของไอคอน (SVG, PNG)
  coverImageUrl?: string; // URL ของภาพปกสำหรับหน้าหมวดหมู่
  themeColor?: string; // สีหลักของหมวดหมู่ (HEX, e.g., "#FF69B4")
  // Display and Order
  displayOrder?: number; // ลำดับการแสดงผล (สำหรับหมวดหมู่ในระดับเดียวกัน)
  isVisible: boolean; // แสดงหมวดหมู่นี้ในรายการหรือไม่
  isPromoted: boolean; // โปรโมทหมวดหมู่นี้ในหน้าหลักหรือส่วนแนะนำหรือไม่
  // SEO Settings
  seo: {
    metaTitle?: string; // ชื่อสำหรับ SEO (อาจ default จาก name)
    metaDescription?: string; // คำอธิบายสำหรับ SEO (อาจ default จาก description)
    keywords?: string[]; // คำสำคัญสำหรับ SEO
  };
  // Content Association and Stats (อาจคำนวณหรืออัปเดตผ่าน triggers/batch jobs)
  novelCount: number; // จำนวนนิยายทั้งหมดในหมวดหมู่นี้ (รวมหมวดหมู่ย่อย)
  // การตั้งค่าเฉพาะสำหรับหมวดหมู่
  allowedNovelAgeRatings?: ("everyone" | "teen" | "mature" | "adult")[]; // การจัดเรทอายุของนิยายที่อนุญาตในหมวดหมู่นี้
  allowsExplicitContent: boolean; // หมวดหมู่นี้อนุญาตเนื้อหาสำหรับผู้ใหญ่หรือไม่
  // Admin and Status
  isSystemCategory: boolean; // เป็นหมวดหมู่ที่สร้างโดยระบบหรือไม่ (ผู้ใช้ทั่วไปแก้ไขไม่ได้)
  isDeleted: boolean; // Soft delete
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: [true, "กรุณาระบุชื่อหมวดหมู่"], trim: true, maxlength: [100, "ชื่อหมวดหมู่ต้องไม่เกิน 100 ตัวอักษร"], index: true },
    slug: { type: String, required: [true, "กรุณาระบุ slug สำหรับหมวดหมู่"], unique: true, trim: true, lowercase: true, maxlength: [120, "Slug ต้องไม่เกิน 120 ตัวอักษร"] },
    description: { type: String, trim: true, maxlength: [1500, "คำอธิบายหมวดหมู่ต้องไม่เกิน 1500 ตัวอักษร"] },
    parentCategory: { type: Schema.Types.ObjectId, ref: "Category", index: true },
    ancestorPath: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    level: { type: Number, default: 0, min: 0, max: 5, index: true }, // Max 5 levels deep for simplicity
    iconUrl: String,
    coverImageUrl: String,
    themeColor: String,
    displayOrder: { type: Number, default: 0 },
    isVisible: { type: Boolean, default: true, index: true },
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
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----- Indexes -----
// Unique slug (already enforced by `unique: true` on slug field, but good to be explicit if needed for partial filters)
// CategorySchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
// For finding top-level categories or categories by parent
CategorySchema.index({ parentCategory: 1, displayOrder: 1, isVisible: 1, isDeleted: 1 });
// For searching categories by name
CategorySchema.index({ name: "text", description: "text" }, { default_language: "thai" });
// For filtering by level and visibility
CategorySchema.index({ level: 1, isVisible: 1, isDeleted: 1 });

// ----- Middleware: Slug generation and ancestor path/level management -----
CategorySchema.pre("save", async function (next) {
  // Auto-generate slug from name if not provided or if name changed
  if ((this.isModified("name") || this.isNew) && !this.slug) {
    this.slug = (this.name || "")
      .toLowerCase()
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/[^\[\w\-]+/g, "") // Remove all non-word chars except hyphens
      .replace(/--+/g, "-") // Replace multiple hyphens with single
      .substring(0, 100);
    // Add a simple mechanism to avoid slug collision, though `unique:true` handles DB level
    // For production, a more robust slug generation/uniqueness check might be needed
  }

  // Manage ancestorPath and level
  if (this.isModified("parentCategory") || this.isNew) {
    if (this.parentCategory) {
      const parent = await mongoose.model("Category").findById(this.parentCategory).select("ancestorPath level");
      if (parent) {
        this.ancestorPath = [...(parent.ancestorPath || []), this.parentCategory];
        this.level = parent.level + 1;
        if (this.level > 5) { // Enforce max depth
            return next(new Error("Category depth cannot exceed 5 levels."));
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

// ----- Virtuals -----
// Virtual to get children categories
CategorySchema.virtual("children", {
  ref: "Category",
  localField: "_id",
  foreignField: "parentCategory",
  justOne: false,
  options: { sort: { displayOrder: 1 }, match: { isVisible: true, isDeleted: false } },
});

// Virtual to get novels in this category (direct association)
// For a more performant count or full list, a separate query or denormalization might be better.
// CategorySchema.virtual("novelsInCategory", {
//   ref: "Novel",
//   localField: "_id",
//   foreignField: "categories", // Assuming Novel model has a `categories: [Types.ObjectId]` field
//   count: true // Or `justOne: false` for the list
// });

// ----- Static Methods (Example) -----
// Method to rebuild ancestor paths or novel counts (can be intensive, run as a batch job)
// CategorySchema.statics.rebuildCategoryStats = async function (categoryId: Types.ObjectId) { ... };

// ----- Model Export -----
const CategoryModel = () => models.Category as mongoose.Model<ICategory> || model<ICategory>("Category", CategorySchema);

export default CategoryModel;

