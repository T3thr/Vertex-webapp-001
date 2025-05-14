// backend/models/Category.ts
// โมเดลหมวดหมู่ (Category Model) - จัดการหมวดหมู่หลักและหมวดหมู่ย่อยของนิยาย
// ออกแบบให้รองรับการค้นหาและกรองนิยายที่ซับซ้อน, การแสดงผล UI ที่หลากหลาย, และการจัดการโดยผู้ดูแลระบบ

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// ประเภทของหมวดหมู่ (สำหรับแยกหมวดหมู่หลักและหมวดหมู่ย่อย)
// ตัวอย่างการใช้งาน: const type: CategoryType = "main_genre";
export type CategoryType = 
  | "main_genre" // หมวดหมู่หลัก (เช่น แฟนตาซี, โรแมนติก, สืบสวนสอบสวน)
  | "sub_genre" // หมวดหมู่ย่อย (เช่น แฟนตาซีโรงเรียน, โรแมนติกคอมเมดี้, สืบสวนคดีฆาตกรรม)
  | "theme_tag" // แท็กธีม (เช่น ต่างโลก, ย้อนยุค, ทหาร, โรงเรียน, ออฟฟิศ)
  | "content_rating" // เรทเนื้อหา (เช่น ทั่วไป, 13+, 18+)
  | "novel_type" // ประเภทนิยาย (เช่น นิยายแชท, นิยายบรรยาย, Visual Novel)
  | "source_type"; // ประเภทแหล่งที่มา (เช่น Original, Fanfiction)

// อินเทอร์เฟซสำหรับข้อมูลหลายภาษา (i18n)
// ตัวอย่างการใช้งาน: const localizedName: ILocalizedString = { en: "Fantasy", th: "แฟนตาซี" };
export interface ILocalizedString {
  [languageCode: string]: string; // key คือรหัสภาษา (เช่น "en", "th"), value คือข้อความในภาษานั้น
                                  // ตัวอย่าง: { en: "School Life", th: "ชีวิตในโรงเรียน" }
}

// อินเทอร์เฟซหลักสำหรับเอกสารหมวดหมู่ (Category Document)
export interface ICategory extends Document {
  _id: Types.ObjectId;
  name: ILocalizedString; // ชื่อหมวดหมู่ (รองรับหลายภาษา)
                          // ตัวอย่าง: { en: "Fantasy", th: "แฟนตาซี" }
  slug: string; // Slug สำหรับใช้ใน URL (ควร unique และสร้างจากชื่อภาษาอังกฤษ)
                // ตัวอย่าง: "fantasy"
  description?: ILocalizedString; // (Optional) คำอธิบายหมวดหมู่ (รองรับหลายภาษา)
                                 // ตัวอย่าง: { en: "Novels with magical elements...", th: "นิยายที่มีองค์ประกอบของเวทมนตร์..." }
  
  type: CategoryType; // ประเภทของหมวดหมู่ (main_genre, sub_genre, theme_tag, etc.)
                      // ตัวอย่าง: "main_genre"
  
  parentCategory?: Types.ObjectId; // (Optional) ID ของหมวดหมู่แม่ (สำหรับ sub_genre หรือการจัดกลุ่ม)
                                   // ตัวอย่าง: new Types.ObjectId("60f5eabc1234567890maincat") (ถ้าเป็น sub-genre ของ "Fantasy")
  
  iconUrl?: string; // (Optional) URL ของไอคอนหมวดหมู่ (สำหรับแสดงผลใน UI)
                   // ตัวอย่าง: "https://cdn.novelmaze.com/categories/fantasy.svg"
  coverImageUrl?: string; // (Optional) URL ของภาพปกหมวดหมู่ (สำหรับหน้า category page)
                        // ตัวอย่าง: "https://cdn.novelmaze.com/categories/fantasy_cover.jpg"
  
  displayOrder?: number; // (Optional) ลำดับการแสดงผล (สำหรับจัดเรียงใน UI)
                         // ตัวอย่าง: 1 (แสดงเป็นอันดับแรก)
  
  isActive: boolean; // สถานะการใช้งาน (ผู้ดูแลระบบสามารถปิดหมวดหมู่ที่ไม่ต้องการใช้)
                     // ตัวอย่าง: true
  isFeatured: boolean; // (Optional) เป็นหมวดหมู่แนะนำหรือไม่ (สำหรับแสดงในส่วนพิเศษ)
                       // ตัวอย่าง: false
  
  associatedTags?: string[]; // (Optional) แท็กที่เกี่ยวข้องอื่นๆ (อาจใช้สำหรับการค้นหาขั้นสูง)
                             // ตัวอย่าง: ["magic", "adventure", "medieval"]
  
  novelCount?: number; // (Denormalized) จำนวนนิยายในหมวดหมู่นี้ (อัปเดตผ่าน trigger หรือ batch job)
                       // ตัวอย่าง: 125 (มีนิยายในหมวดนี้ 125 เรื่อง)

  createdAt: Date;
  updatedAt: Date;
}

const LocalizedStringSchema = new Schema<ILocalizedString>(
  {
    // Dynamic keys for language codes
  },
  { _id: false, strict: false } // strict: false เพื่อให้สามารถเพิ่มภาษาได้เรื่อยๆ
);

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: LocalizedStringSchema,
      required: [true, "กรุณาระบุชื่อหมวดหมู่ (Category name is required)"],
      validate: {
        validator: (value: ILocalizedString) => value && (value.en || value.th), // ต้องมีอย่างน้อยภาษาอังกฤษหรือไทย
        message: "ชื่อหมวดหมู่ต้องมีอย่างน้อยภาษาอังกฤษ (en) หรือภาษาไทย (th)",
      },
      // ตัวอย่าง: { en: "Science Fiction", th: "นิยายวิทยาศาสตร์" }
    },
    slug: {
      type: String,
      required: [true, "กรุณาระบุ Slug สำหรับหมวดหมู่ (Slug is required)"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug ต้องเป็นตัวอักษรภาษาอังกฤษตัวเล็ก, ตัวเลข, และขีดกลาง (-) เท่านั้น และห้ามขึ้นต้นหรือลงท้ายด้วยขีดกลาง"],
      index: true,
      // ตัวอย่าง: "science-fiction"
    },
    description: { 
      type: LocalizedStringSchema,
      // ตัวอย่าง: { en: "Stories involving future science and technology.", th: "เรื่องราวเกี่ยวกับวิทยาศาสตร์และเทคโนโลยีในอนาคต" }
    },
    type: {
      type: String,
      enum: Object.values<CategoryType>(["main_genre", "sub_genre", "theme_tag", "content_rating", "novel_type", "source_type"]),
      required: [true, "กรุณาระบุประเภทของหมวดหมู่ (Category type is required)"],
      index: true,
      // ตัวอย่าง: "main_genre"
    },
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      index: true,
      // ตัวอย่าง: new Types.ObjectId() (ถ้าเป็นหมวดหมู่ย่อย)
    },
    iconUrl: { 
      type: String, 
      trim: true, 
      // ตัวอย่าง: "/assets/icons/categories/sci-fi.svg"
    },
    coverImageUrl: { 
      type: String, 
      trim: true, 
      // ตัวอย่าง: "/assets/images/covers/categories/sci-fi_banner.jpg"
    },
    displayOrder: { 
      type: Number, 
      default: 0, 
      // ตัวอย่าง: 2 (แสดงเป็นลำดับที่สอง)
    },
    isActive: { 
      type: Boolean, 
      default: true, 
      index: true, 
      // ตัวอย่าง: true (หมวดหมู่นี้ใช้งานได้)
    },
    isFeatured: { 
      type: Boolean, 
      default: false, 
      index: true, 
      // ตัวอย่าง: true (เป็นหมวดหมู่แนะนำ)
    },
    associatedTags: [{ 
      type: String, 
      trim: true, 
      lowercase: true, 
      // ตัวอย่าง: ["cyberpunk", "space_opera", "dystopian"]
    }],
    novelCount: { 
      type: Number, 
      default: 0, 
      min: 0, 
      // ตัวอย่าง: 78 (มีนิยายในหมวดนี้ 78 เรื่อง)
    },
  },
  {
    timestamps: true, // สร้าง createdAt และ updatedAt โดยอัตโนมัติ
  }
);

// ----- Indexes เพิ่มเติม -----
CategorySchema.index({ type: 1, parentCategory: 1, displayOrder: 1, "name.th": 1 }); // สำหรับการ query หมวดหมู่ตามประเภทและ parent, เรียงตาม displayOrder และชื่อไทย
CategorySchema.index({ type: 1, parentCategory: 1, displayOrder: 1, "name.en": 1 }); // สำหรับการ query หมวดหมู่ตามประเภทและ parent, เรียงตาม displayOrder และชื่ออังกฤษ
CategorySchema.index({ isActive: 1, type: 1 }); // สำหรับการค้นหาหมวดหมู่ที่ active ตามประเภท

// ----- Middleware (Pre/Post Hooks) -----
CategorySchema.pre<ICategory>("save", async function(next) {
  // สร้าง slug จาก name.en ถ้า slug ยังไม่ได้กำหนด
  if (!this.slug && this.name && this.name.en) {
    this.slug = this.name.en
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-") // แทนที่ช่องว่างด้วยขีดกลาง
      .replace(/[^\w-]+/g, "") // ลบตัวอักษรพิเศษที่ไม่ใช่ word characters หรือขีดกลาง
      .replace(/--+/g, "-"); // แทนที่ขีดกลางซ้ำๆ ด้วยขีดกลางเดียว
  }
  next();
});

// ----- Virtuals (ถ้ามี) -----
// CategorySchema.virtual("childrenCategories", {
//   ref: "Category",
//   localField: "_id",
//   foreignField: "parentCategory"
// });

// ----- Model Export -----
const CategoryModel = () => models.Category as mongoose.Model<ICategory> || model<ICategory>("Category", CategorySchema);

export default CategoryModel;

