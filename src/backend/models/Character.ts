// src/models/Character.ts
// โมเดลตัวละคร (Character Model) - จัดการข้อมูลของตัวละครที่ปรากฏในนิยาย
// ออกแบบให้รองรับการแสดงผลภาพตัวละคร, การแสดงออก (expressions), และข้อมูลพื้นฐาน
// **ปรับปรุงล่าสุด**: เพิ่มการเชื่อมโยงกับ DonationApplication สำหรับการบริจาคให้ตัวละครโดยเฉพาะ

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// อินเทอร์เฟซสำหรับภาพการแสดงออกของตัวละคร (Character Expression/Sprite)
export interface ICharacterExpression {
  name: string; // ชื่อการแสดงออก (เช่น "default", "happy", "sad", "angry")
  imageUrl: string; // URL รูปภาพสำหรับการแสดงออกนี้ (อ้างอิง Media model หรือ URL โดยตรง)
  mediaId?: Types.ObjectId; // ID ของ Media (ถ้าใช้ Media model)
  // อาจมี metadata เพิ่มเติม เช่น ขนาด, ตำแหน่ง anchor point
}

// ----- Interface หลักสำหรับเอกสารตัวละคร (Character Document) -----
export interface ICharacter extends Document {
  _id: Types.ObjectId;
  novel: Types.ObjectId; // นิยายที่ตัวละครนี้ปรากฏ (อ้างอิง Novel model)
  author: Types.ObjectId; // ผู้สร้างตัวละครนี้ (อ้างอิง User model, คือผู้แต่งนิยาย)
  
  name: string; // ชื่อตัวละคร (ที่แสดงในเกม/นิยาย)
  slug: string; // Slug สำหรับตัวละคร (ถ้าต้องการหน้าโปรไฟล์ตัวละครแยก)
  
  description?: string; // คำอธิบายตัวละคร (ประวัติ, ลักษณะนิสัย)
  profileImageUrl?: string; // URL รูปโปรไฟล์หลักของตัวละคร (อาจเป็น default expression)
  // defaultMediaId?: Types.ObjectId; // ID ของ Media ที่เป็น default expression

  // คอลเลกชันของภาพการแสดงออก (sprites)
  expressions: Types.DocumentArray<ICharacterExpression>;
  
  // สีประจำตัว (สำหรับ UI เช่น สีชื่อในกล่องข้อความ)
  colorCode?: string; // เช่น "#FF5733"
  
  // ข้อมูลเพิ่มเติม (ไม่บังคับ)
  age?: string; // อายุ (เช่น "18 ปี", "วัยรุ่น")
  height?: string; // ส่วนสูง
  // firstAppearanceSceneId?: Types.ObjectId; // ฉากที่ปรากฏตัวครั้งแรก (อ้างอิง Scene model)
  // voiceActor?: string; // ชื่อนักพากย์ (ถ้ามี)

  // การตั้งค่าการรับบริจาคสำหรับตัวละครนี้โดยเฉพาะ
  // หากนักเขียนเปิดรับบริจาคให้ตัวละครนี้ผ่าน DonationApplication
  // และ application นั้น active อยู่, ID จะถูกเก็บไว้ที่นี่
  activeDonationApplicationId?: Types.ObjectId; // ID ของ DonationApplication ที่ active สำหรับตัวละครนี้ (อ้างอิง DonationApplication model)
  isDonationEnabled: boolean; // สถานะว่าตัวละครนี้เปิดรับบริจาคอยู่หรือไม่ (อาจ denormalize จาก DonationApplication)
  
  // Metadata
  isProtagonist: boolean; // เป็นตัวละครหลักหรือไม่
  isMajorCharacter: boolean; // เป็นตัวละครสำคัญหรือไม่
  customFields?: Record<string, any>; // ฟิลด์เพิ่มเติมตามความต้องการ
  lastUpdatedAt: Date;
  
  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Schema ย่อยสำหรับ ICharacterExpression
const CharacterExpressionSchema = new Schema<ICharacterExpression>(
  {
    name: { 
      type: String, 
      required: [true, "กรุณาระบุชื่อการแสดงออก (Expression name is required)"], 
      trim: true, 
      maxlength: 50 
    },
    imageUrl: { 
      type: String, 
      required: [true, "กรุณาระบุ URL รูปภาพ (Image URL is required)"], 
      trim: true, 
      validate: { validator: (v: string) => /^https?:\/\/|^\//.test(v), message: "รูปแบบ URL ของรูปภาพไม่ถูกต้อง" }
    },
    mediaId: { type: Schema.Types.ObjectId, ref: "Media" }, // หรือ OfficialMedia
  },
  { _id: false } // ไม่สร้าง _id สำหรับ subdocument นี้โดยอัตโนมัติ, แต่ถ้าต้องการ ID ให้ใส่ true
);

// Schema หลักสำหรับ Character
const CharacterSchema = new Schema<ICharacter>(
  {
    novel: {
      type: Schema.Types.ObjectId,
      ref: "Novel",
      required: true,
      index: true,
    },
    author: { // Denormalized from Novel for easier access control or direct query
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "กรุณาระบุชื่อตัวละคร (Character name is required)"],
      trim: true,
      maxlength: [100, "ชื่อตัวละครต้องไม่เกิน 100 ตัวอักษร"],
      index: true,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      // unique: true, // ถ้าต้องการให้ slug ของตัวละครไม่ซ้ำกันทั้งระบบ หรือ unique ภายใน novel
    },
    description: { type: String, trim: true, maxlength: 2000 },
    profileImageUrl: { 
        type: String, 
        trim: true, 
        validate: { validator: (v: string) => !v || /^https?:\/\/|^\//.test(v), message: "รูปแบบ URL ของรูปโปรไฟล์ไม่ถูกต้อง" }
    },
    // defaultMediaId: { type: Schema.Types.ObjectId, ref: "Media" },
    expressions: [CharacterExpressionSchema],
    colorCode: { 
      type: String, 
      trim: true, 
      match: [/^#([0-9a-fA-F]{3}){1,2}$/, "รูปแบบรหัสสีไม่ถูกต้อง (e.g., #FF5733 or #F53)"]
    },
    age: { type: String, trim: true, maxlength: 50 },
    height: { type: String, trim: true, maxlength: 50 },
    // firstAppearanceSceneId: { type: Schema.Types.ObjectId, ref: "Scene" },
    // voiceActor: { type: String, trim: true, maxlength: 100 },
    
    // การเชื่อมโยงกับการรับบริจาค
    activeDonationApplicationId: { 
      type: Schema.Types.ObjectId, 
      ref: "DonationApplication", // อ้างอิงไปยังโมเดล DonationApplication
      index: true 
    },
    isDonationEnabled: { type: Boolean, default: false, index: true }, // สถานะการเปิดรับบริจาคของตัวละครนี้

    isProtagonist: { type: Boolean, default: false },
    isMajorCharacter: { type: Boolean, default: true },
    customFields: Schema.Types.Mixed,
    lastUpdatedAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ----- Indexes -----
// Index สำหรับ query ตัวละครทั้งหมดของนิยายหนึ่งๆ
CharacterSchema.index({ novel: 1, name: 1 });
CharacterSchema.index({ novel: 1, slug: 1 }, { unique: true, sparse: true }); // Slug ควร unique ภายใน novel ถ้ามี
CharacterSchema.index({ novel: 1, isDonationEnabled: 1 }); // ค้นหาตัวละครที่เปิดรับบริจาคในนิยาย

// ----- Middleware -----
// อัปเดต lastUpdatedAt ของ Character และ Novel เมื่อมีการเปลี่ยนแปลง
CharacterSchema.pre("save", async function (next) {
  if (this.isModified("name") && !this.slug) {
    let baseSlug = this.name
      .toString()
      .toLowerCase()
      .replace(/\s+/g, "-") // แทนที่ช่องว่างด้วย -
      .replace(/[^\w\-]+/g, "") // ลบอักขระที่ไม่ใช่ word characters หรือ -
      .replace(/\-\-+/g, "-") // แทนที่ -- ด้วย -
      .replace(/^-+/, "") // ลบ - ที่อยู่ข้างหน้าสุด
      .replace(/-+$/, ""); // ลบ - ที่อยู่ข้างหลังสุด
    this.slug = baseSlug; // อาจต้องเพิ่ม logic ตรวจสอบความซ้ำซ้อนภายใน novel
  }

  if (this.isModified() && !this.isNew) {
    this.lastUpdatedAt = new Date();
    
    // อัปเดต Novel.lastUpdatedAt
    const Novel = models.Novel || model("Novel"); // ใช้ models.Novel หรือ model("Novel") เพื่อหลีกเลี่ยง OverwriteModelError
    try {
      await Novel.findByIdAndUpdate(this.novel, { lastUpdatedAt: new Date() });
    } catch (error) {
      console.error(`Error updating Novel.lastUpdatedAt for character ${this._id}:`, error);
      // ควรพิจารณาการจัดการ error ที่เหมาะสมกว่านี้ใน production
    }
  }

  // Denormalize author from novel if not set or novel changed
  if (this.isNew || this.isModified("novel")) {
    const NovelModel = models.Novel || model("Novel");
    const novelDoc = await NovelModel.findById(this.novel).select("author").lean();
    if (novelDoc) {
        this.author = novelDoc.author;
    }
  }
  
  // ตรวจสอบและอัปเดต isDonationEnabled โดยอัตโนมัติ
  // ถ้า activeDonationApplicationId มีค่า และ DonationApplication นั้น active อยู่จริง
  // (ส่วนนี้อาจต้องทำใน service layer หรือหลังจาก DonationApplication ถูกอัปเดตสถานะ)
  if (this.isModified("activeDonationApplicationId")) {
    if (this.activeDonationApplicationId) {
      // สมมติว่ามี logic ในการตรวจสอบสถานะของ DonationApplication ที่นี่
      // หรืออาจจะตั้งค่า isDonationEnabled โดยตรงเมื่อมีการ link activeDonationApplicationId
      // ในตัวอย่างนี้ จะตั้งเป็น true ถ้ามี ID, แต่ในระบบจริงควรตรวจสอบสถานะของ App นั้นๆ
      // this.isDonationEnabled = true; // ตัวอย่างง่ายๆ
    } else {
      this.isDonationEnabled = false;
    }
  }

  next();
});

// ----- Model Export -----
const CharacterModel = () => models.Character as mongoose.Model<ICharacter> || model<ICharacter>("Character", CharacterSchema);

export default CharacterModel;

// ----- ตัวอย่างการใช้งาน (เพิ่มเติม) -----
/**
 * // เมื่อ DonationApplication สำหรับตัวละครได้รับการอนุมัติและ active
 * const characterId = "some_character_id";
 * const activeDonationAppIdForCharacter = "donation_app_id_for_this_character";
 *
 * await CharacterModel().findByIdAndUpdate(characterId, {
 *   $set: {
 *     activeDonationApplicationId: activeDonationAppIdForCharacter,
 *     isDonationEnabled: true // ควรตั้งค่าตามสถานะจริงของ DonationApplication
 *   }
 * });
 *
 * // การค้นหาตัวละครที่เปิดรับบริจาคในนิยายเรื่องหนึ่ง
 * // const novelId = "some_novel_id";
 * // const charactersWithDonation = await CharacterModel().find({
 * //   novel: novelId,
 * //   isDonationEnabled: true,
 * //   isDeleted: false
 * // }).populate("activeDonationApplicationId");
 */

