// src/backend/models/Character.ts
// Character Model - โมเดลตัวละคร
// โมเดลสำหรับจัดเก็บข้อมูลตัวละครในนิยาย
import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface สำหรับ Character Sprite/Expression (เป็น subdocument หรืออ้างอิง Media)
// อินเทอร์เฟซสำหรับภาพตัวละคร/การแสดงออกทางสีหน้า
export interface ICharacterVisual {
  mediaId: Types.ObjectId; // อ้างอิง Media model (รูปภาพ sprite sheet, individual image) - ID ของสื่อ
  emotion: string; // ชื่ออารมณ์ (เช่น "default", "happy", "angry", "sad", "surprised") - ใช้เป็น key - ชื่ออารมณ์
  url?: string; // URL โดยตรง (ถ้าไม่ใช้ mediaId หรือเป็น fallback) - URL โดยตรง
  isDefaultEmotion?: boolean; // เป็น sprite/expression เริ่มต้นหรือไม่ - เป็นภาพเริ่มต้นหรือไม่
  metadata?: Record<string, any>; // เช่น coordinates on sprite sheet, animation info - ข้อมูลเพิ่มเติม
}

// Interface สำหรับ Character document
// อินเทอร์เฟซสำหรับเอกสารตัวละคร
export interface ICharacter extends Document {
  _id: Types.ObjectId;
  novel: Types.ObjectId; // นิยายที่ตัวละครนี้สังกัด (อ้างอิง Novel model) - ID ของนิยาย
  author: Types.ObjectId; // ผู้สร้างตัวละคร (อ้างอิง User model) - ID ของผู้สร้าง
  name: string; // ชื่อตัวละคร (ควร unique ภายใน Novel) - ชื่อตัวละคร
  slug: string; // URL slug (unique ภายใน Novel) - สลักสำหรับ URL
  aliases?: string[]; // ชื่อเล่น หรือชื่ออื่นๆ ที่ตัวละครถูกเรียก - ชื่อเล่น/ชื่ออื่น
  description?: string; // คำอธิบายสั้นๆ (สำหรับแสดงใน list) - คำอธิบายสั้นๆ
  biography?: string; // ประวัติความเป็นมา, รายละเอียดเชิงลึก (รองรับ Markdown) - ประวัติโดยละเอียด
  roleInNovel: "protagonist" | "deuteragonist" | "antagonist" | "supporting" | "minor" | "cameo"; // บทบาทในนิยาย - บทบาทในนิยาย
  age?: string; // อายุ (อาจเป็นช่วง เช่น "วัยรุ่นตอนปลาย", "20s", หรือตัวเลข) - อายุ
  gender?: string; // เพศ - เพศ
  species?: string; // เผ่าพันธุ์ (ถ้ามี) - เผ่าพันธุ์
  height?: string; // ส่วนสูง (เช่น "175 cm", "สูงปานกลาง") - ส่วนสูง
  weight?: string; // น้ำหนัก - น้ำหนัก
  appearanceDetails?: string; // รายละเอียดรูปลักษณ์เพิ่มเติม (สีผม, สีตา, ลักษณะเด่น) - รายละเอียดรูปลักษณ์
  personalityTraits?: string[]; // เช่น "ใจดี", "ขี้อาย", "กล้าหาญ" - ลักษณะนิสัย
  likes?: string[]; // สิ่งที่ชอบ - สิ่งที่ชอบ
  dislikes?: string[]; // สิ่งที่ไม่ชอบ - สิ่งที่ไม่ชอบ
  profileImage?: ICharacterVisual; // รูปโปรไฟล์หลัก (อาจเป็น default emotion) - รูปโปรไฟล์หลัก
  expressions?: ICharacterVisual[]; // ชุด sprite/expression ตามอารมณ์ต่างๆ - การแสดงออกทางสีหน้า
  galleryImages?: Types.ObjectId[]; // อ้างอิง Media model สำหรับรูปภาพอื่นๆ ใน gallery - รูปภาพในแกลเลอรี่
  voiceActor?: string; // ชื่อนักพากย์ (ถ้ามี) - ชื่อนักพากย์
  sampleVoiceLineUrl?: string; // URL ตัวอย่างเสียงพากย์ - URL ตัวอย่างเสียง
  firstAppearance?: { // การปรากฏตัวครั้งแรก - การปรากฏตัวครั้งแรก
    episodeId?: Types.ObjectId;
    sceneId?: Types.ObjectId; // หรือ sceneNumber
    description?: string;
  };
  isControllableByPlayer?: boolean; // ผู้เล่นสามารถควบคุมตัวละครนี้ได้หรือไม่ (ในบางช่วงของเกม) - ผู้เล่นควบคุมได้หรือไม่
  isHiddenCharacter?: boolean; // เป็นตัวละครลับหรือไม่ - เป็นตัวละครลับหรือไม่
  unlockConditions?: any[]; // เงื่อนไขในการปลดล็อคตัวละคร (ถ้าเป็นตัวละครลับหรือต้องปลดล็อค) - เงื่อนไขการปลดล็อค

  // Coin-based Donation System for Characters - ระบบการบริจาคเหรียญสำหรับตัวละคร
  isDonationEnabled: boolean; // เปิดให้ผู้ใช้อื่นบริจาคให้ตัวละครนี้ได้หรือไม่ - เปิดรับบริจาคหรือไม่
  totalCoinDonated: number; // จำนวนเหรียญทั้งหมดที่ได้รับจากการบริจาค - จำนวนเหรียญที่ได้รับบริจาคทั้งหมด
  // donationTransactions: Types.ObjectId[]; // Array of ActivityHistory IDs related to donations for this character (Consider if needed or if ActivityHistory query is sufficient)
  // รายการธุรกรรมการบริจาค (อ้างอิง ActivityHistory) - อาจไม่จำเป็นถ้า ActivityHistory query เพียงพอ

  embeddingVector?: number[]; // Vector embedding ของข้อมูลตัวละคร (สำหรับ similarity search) - Vector Embedding
  tags?: string[]; // แท็กสำหรับ AI (เช่น archetypes, roles for AI story generation) - แท็กสำหรับ AI
  visibility: "public" | "unlisted" | "privateToAuthor"; // การมองเห็นข้อมูลตัวละคร - การมองเห็น
  isOfficial: boolean; // เป็นตัวละครทางการที่สร้างโดยผู้เขียนนิยายหรือไม่ - เป็นทางการหรือไม่
  isDeleted: boolean; // Soft delete - ลบแบบ Soft
  deletedAt?: Date; // วันที่ลบ - วันที่ลบ
  createdAt: Date; // วันที่สร้าง - วันที่สร้าง
  updatedAt: Date; // วันที่อัปเดตล่าสุด - วันที่อัปเดตล่าสุด
  lastSignificantUpdateAt?: Date; // วันที่อัปเดตสำคัญล่าสุด - วันที่อัปเดตสำคัญล่าสุด
}

const CharacterVisualSchema = new Schema<ICharacterVisual>(
  {
    mediaId: { type: Schema.Types.ObjectId, ref: "Media", required: true },
    emotion: { type: String, required: true, trim: true },
    url: String,
    isDefaultEmotion: { type: Boolean, default: false },
    metadata: Schema.Types.Mixed,
  },
  { _id: false }
);

const CharacterSchema = new Schema<ICharacter>(
  {
    novel: { type: Schema.Types.ObjectId, ref: "Novel", required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: [true, "กรุณาระบุชื่อตัวละคร"], trim: true, maxlength: [150, "ชื่อตัวละครต้องไม่เกิน 150 ตัวอักษร"] },
    slug: { type: String, required: [true, "กรุณาระบุ slug สำหรับตัวละคร"], trim: true, lowercase: true, maxlength: [170, "Slug ต้องไม่เกิน 170 ตัวอักษร"] },
    aliases: [{ type: String, trim: true }],
    description: { type: String, trim: true, maxlength: [1000, "คำอธิบายสั้นๆ ต้องไม่เกิน 1000 ตัวอักษร"] },
    biography: { type: String, trim: true, maxlength: [20000, "ประวัติตัวละครต้องไม่เกิน 20000 ตัวอักษร"] },
    roleInNovel: {
      type: String,
      enum: ["protagonist", "deuteragonist", "antagonist", "supporting", "minor", "cameo"],
      required: [true, "กรุณาระบุบทบาทของตัวละครในนิยาย"],
      index: true,
    },
    age: String,
    gender: String,
    species: String,
    height: String,
    weight: String,
    appearanceDetails: { type: String, maxlength: [5000, "รายละเอียดรูปลักษณ์ต้องไม่เกิน 5000 ตัวอักษร"] },
    personalityTraits: [{ type: String, trim: true }],
    likes: [{ type: String, trim: true }],
    dislikes: [{ type: String, trim: true }],
    profileImage: CharacterVisualSchema,
    expressions: [CharacterVisualSchema],
    galleryImages: [{ type: Schema.Types.ObjectId, ref: "Media" }],
    voiceActor: String,
    sampleVoiceLineUrl: String,
    firstAppearance: {
      episodeId: { type: Schema.Types.ObjectId, ref: "Episode" },
      sceneId: { type: Schema.Types.ObjectId, ref: "Scene" },
      description: String,
    },
    isControllableByPlayer: { type: Boolean, default: false },
    isHiddenCharacter: { type: Boolean, default: false },
    unlockConditions: [Schema.Types.Mixed],
    isDonationEnabled: { type: Boolean, default: false, index: true }, // เปิดให้ผู้ใช้อื่นบริจาคให้ตัวละครนี้ได้หรือไม่
    totalCoinDonated: { type: Number, default: 0, min: 0 }, // จำนวนเหรียญทั้งหมดที่ได้รับจากการบริจาค
    // donationTransactions: [{ type: Schema.Types.ObjectId, ref: "ActivityHistory" }], // อ้างอิงไปยัง ActivityHistory ที่เกี่ยวข้องกับการบริจาคให้ตัวละครนี้โดยเฉพาะ
    embeddingVector: { type: [Number], select: false },
    tags: [{ type: String, trim: true, index: true }],
    visibility: { type: String, enum: ["public", "unlisted", "privateToAuthor"], default: "public", index: true },
    isOfficial: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    lastSignificantUpdateAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----- Indexes -----
CharacterSchema.index({ novel: 1, slug: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
CharacterSchema.index({ novel: 1, name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
CharacterSchema.index({ novel: 1, isDeleted: 1, visibility: 1 });
CharacterSchema.index({ novel: 1, isDonationEnabled: 1, totalCoinDonated: -1 }); // For querying donatable characters and sorting by donations
CharacterSchema.index({ name: "text", aliases: "text", description: "text", tags: "text" }, { default_language: "thai" });

// ----- Middleware: Slug generation -----
CharacterSchema.pre("save", async function (next) {
  if ((this.isModified("name") || this.isNew) && !this.slug) {
    this.slug = (this.name || "")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .substring(0, 70);
  }
  if (this.isModified("name") || this.isModified("description") || this.isModified("biography") || this.isModified("profileImage") || this.isModified("expressions")) {
    this.lastSignificantUpdateAt = new Date();
  }
  next();
});

// ----- Model Export -----
const CharacterModel = () => models.Character as mongoose.Model<ICharacter> || model<ICharacter>("Character", CharacterSchema);

export default CharacterModel;

