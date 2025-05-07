// src/backend/models/Character.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface สำหรับ Character Sprite/Expression (เป็น subdocument หรืออ้างอิง Media)
export interface ICharacterVisual {
  mediaId: Types.ObjectId; // อ้างอิง Media model (รูปภาพ sprite sheet, individual image)
  emotion: string; // ชื่ออารมณ์ (เช่น "default", "happy", "angry", "sad", "surprised") - ใช้เป็น key
  url?: string; // URL โดยตรง (ถ้าไม่ใช้ mediaId หรือเป็น fallback)
  isDefaultEmotion?: boolean; // เป็น sprite/expression เริ่มต้นหรือไม่
  metadata?: Record<string, any>; // เช่น coordinates on sprite sheet, animation info
}

// Interface สำหรับ Character document
export interface ICharacter extends Document {
  novel: Types.ObjectId; // นิยายที่ตัวละครนี้สังกัด (อ้างอิง Novel model)
  author: Types.ObjectId; // ผู้สร้างตัวละคร (อ้างอิง User model)
  name: string; // ชื่อตัวละคร (ควร unique ภายใน Novel)
  slug: string; // URL slug (unique ภายใน Novel)
  aliases?: string[]; // ชื่อเล่น หรือชื่ออื่นๆ ที่ตัวละครถูกเรียก
  // รายละเอียดตัวละคร
  description?: string; // คำอธิบายสั้นๆ (สำหรับแสดงใน list)
  biography?: string; // ประวัติความเป็นมา, รายละเอียดเชิงลึก (รองรับ Markdown)
  roleInNovel: "protagonist" | "deuteragonist" | "antagonist" | "supporting" | "minor" | "cameo"; // บทบาทในนิยาย
  // ลักษณะทางกายภาพและข้อมูลส่วนตัว
  age?: string; // อายุ (อาจเป็นช่วง เช่น "วัยรุ่นตอนปลาย", "20s", หรือตัวเลข)
  gender?: string; // เพศ
  species?: string; // เผ่าพันธุ์ (ถ้ามี)
  height?: string; // ส่วนสูง (เช่น "175 cm", "สูงปานกลาง")
  weight?: string; // น้ำหนัก
  appearanceDetails?: string; // รายละเอียดรูปลักษณ์เพิ่มเติม (สีผม, สีตา, ลักษณะเด่น)
  // บุคลิกภาพและนิสัย
  personalityTraits?: string[]; // เช่น "ใจดี", "ขี้อาย", "กล้าหาญ"
  likes?: string[]; // สิ่งที่ชอบ
  dislikes?: string[]; // สิ่งที่ไม่ชอบ
  // รูปภาพและสื่อ
  profileImage?: ICharacterVisual; // รูปโปรไฟล์หลัก (อาจเป็น default emotion)
  expressions?: ICharacterVisual[]; // ชุด sprite/expression ตามอารมณ์ต่างๆ
  galleryImages?: Types.ObjectId[]; // อ้างอิง Media model สำหรับรูปภาพอื่นๆ ใน gallery
  voiceActor?: string; // ชื่อนักพากย์ (ถ้ามี)
  sampleVoiceLineUrl?: string; // URL ตัวอย่างเสียงพากย์
  // ความสัมพันธ์ (เก็บใน model แยกต่างหากเพื่อความยืดหยุ่น หรือ embed แบบง่ายๆ)
  // relationships?: Array<{ characterId: Types.ObjectId; type: string; description?: string }>;
  // สถิติและการมีส่วนร่วม (อาจคำนวณหรืออัปเดตผ่าน triggers)
  firstAppearance?: { // การปรากฏตัวครั้งแรก
    episodeId?: Types.ObjectId;
    sceneId?: Types.ObjectId; // หรือ sceneNumber
    description?: string;
  };
  // การตั้งค่าเฉพาะตัวละคร
  isControllableByPlayer?: boolean; // ผู้เล่นสามารถควบคุมตัวละครนี้ได้หรือไม่ (ในบางช่วงของเกม)
  isHiddenCharacter?: boolean; // เป็นตัวละครลับหรือไม่
  unlockConditions?: any[]; // เงื่อนไขในการปลดล็อคตัวละคร (ถ้าเป็นตัวละครลับหรือต้องปลดล็อค)
  // การสร้างรายได้
  isDonationEnabled: boolean; // เปิดให้ผู้ใช้อื่นบริจาคให้ตัวละครนี้ได้หรือไม่
  donationLink?: string; // ลิงก์สำหรับบริจาค (ถ้ามี)
  // AI/ML Fields
  embeddingVector?: number[]; // Vector embedding ของข้อมูลตัวละคร (สำหรับ similarity search)
  tags?: string[]; // แท็กสำหรับ AI (เช่น archetypes, roles for AI story generation)
  // สถานะและการมองเห็น
  visibility: "public" | "unlisted" | "privateToAuthor"; // การมองเห็นข้อมูลตัวละคร
  isOfficial: boolean; // เป็นตัวละครทางการที่สร้างโดยผู้เขียนนิยายหรือไม่
  isDeleted: boolean; // Soft delete
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  lastSignificantUpdateAt?: Date;
}

const CharacterVisualSchema = new Schema<ICharacterVisual>({
  mediaId: { type: Schema.Types.ObjectId, ref: "Media", required: true },
  emotion: { type: String, required: true, trim: true },
  url: String, // Optional direct URL as fallback or for non-Media items
  isDefaultEmotion: { type: Boolean, default: false },
  metadata: Schema.Types.Mixed,
}, { _id: false });

const CharacterSchema = new Schema<ICharacter>(
  {
    novel: { type: Schema.Types.ObjectId, ref: "Novel", required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }, // ผู้สร้างตัวละคร
    name: { type: String, required: [true, "กรุณาระบุชื่อตัวละคร"], trim: true, maxlength: [150, "ชื่อตัวละครต้องไม่เกิน 150 ตัวอักษร"] },
    slug: { type: String, required: [true, "กรุณาระบุ slug สำหรับตัวละคร"], trim: true, lowercase: true, maxlength: [170, "Slug ต้องไม่เกิน 170 ตัวอักษร"] },
    aliases: [{ type: String, trim: true }],
    description: { type: String, trim: true, maxlength: [1000, "คำอธิบายสั้นๆ ต้องไม่เกิน 1000 ตัวอักษร"] },
    biography: { type: String, trim: true, maxlength: [20000, "ประวัติตัวละครต้องไม่เกิน 20000 ตัวอักษร"] }, // Increased length for detailed bio
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
      sceneId: { type: Schema.Types.ObjectId, ref: "Scene" }, // Assuming Scene is its own collection
      description: String,
    },
    isControllableByPlayer: { type: Boolean, default: false },
    isHiddenCharacter: { type: Boolean, default: false },
    unlockConditions: [Schema.Types.Mixed],
    isDonationEnabled: { type: Boolean, default: false },
    donationLink: String,
    embeddingVector: { type: [Number], select: false },
    tags: [{ type: String, trim: true, index: true }],
    visibility: { type: String, enum: ["public", "unlisted", "privateToAuthor"], default: "public", index: true },
    isOfficial: { type: Boolean, default: true }, // Default to true if created by novel author
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    lastSignificantUpdateAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----- Indexes -----
// Unique slug per novel for characters
CharacterSchema.index({ novel: 1, slug: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
// Unique name per novel for characters (optional, depending on requirements)
CharacterSchema.index({ novel: 1, name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
// For searching characters within a novel
CharacterSchema.index({ novel: 1, isDeleted: 1, visibility: 1 });
// Text search index (consider which fields are most relevant)
CharacterSchema.index({ name: "text", aliases: "text", description: "text", tags: "text" }, { default_language: "thai" });

// ----- Middleware: Slug generation -----
CharacterSchema.pre("save", async function (next) {
  if ((this.isModified("name") || this.isNew) && !this.slug) {
    this.slug = (this.name || "")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .substring(0, 70);
    // Ensure slug uniqueness within the novel (requires async query, can be complex in pre-save)
    // A common pattern is to append a short hash or number if collision, or handle at application level.
  }
  if (this.isModified("name") || this.isModified("description") || this.isModified("biography") || this.isModified("profileImage") || this.isModified("expressions")) {
      this.lastSignificantUpdateAt = new Date();
  }
  next();
});

// ----- Virtuals (Example: Relationship count or detailed relationships if stored elsewhere) -----
// CharacterSchema.virtual("relationshipCount", {
//   ref: "Relationship", // Assuming a separate Relationship model
//   localField: "_id",
//   foreignField: "characterOneId", // Or however relationships are defined
//   count: true
// });

// ----- Model Export -----
const CharacterModel = () => models.Character as mongoose.Model<ICharacter> || model<ICharacter>("Character", CharacterSchema);

export default CharacterModel;

