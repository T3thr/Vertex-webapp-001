// src/backend/models/Category.ts

import mongoose, { Schema, model, models, Document } from "mongoose";

// Interface สำหรับ Category document
export interface ICategory extends Document {
  name: string; // ชื่อหมวดหมู่
  slug: string; // URL slug
  description?: string; // คำอธิบาย
  icon?: string; // ไอคอน (ถ้ามี)
  parentCategory?: mongoose.Types.ObjectId; // หมวดหมู่หลัก (ถ้ามี)
  isActive: boolean; // สถานะการใช้งาน
  order: number; // ลำดับการแสดงผล
}

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, "กรุณาระบุชื่อหมวดหมู่"],
      trim: true,
      maxlength: [50, "ชื่อหมวดหมู่ต้องไม่เกิน 50 ตัวอักษร"],
    },
    slug: {
      type: String,
      required: [true, "กรุณาระบุ slug URL"],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [50, "Slug ต้องไม่เกิน 50 ตัวอักษร"],
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug ต้องประกอบด้วยตัวอักษรพิมพ์เล็ก, ตัวเลข และเครื่องหมาย - เท่านั้น"],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "คำอธิบายต้องไม่เกิน 500 ตัวอักษร"],
    },
    icon: {
      type: String,
      trim: true,
    },
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtuals: หมวดหมู่ย่อย
CategorySchema.virtual("subcategories", {
  ref: "Category",
  localField: "_id",
  foreignField: "parentCategory",
  justOne: false,
});

// Export Model
const CategoryModel = () => 
  models.Category as mongoose.Model<ICategory> || model<ICategory>("Category", CategorySchema);

export default CategoryModel;