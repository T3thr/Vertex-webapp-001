// src/backend/models/Character.ts
// โมเดลตัวละคร (Character Model)
// จัดการข้อมูลตัวละครในนิยาย, รูปแบบการแสดงออก, ความสัมพันธ์, การปรับแต่ง, และการตั้งค่าการรับบริจาค

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Character
// ==================================================================================================

/**
 * @enum {string} CharacterRoleInStory
 * @description บทบาทของตัวละครในเนื้อเรื่อง
 * - `main_protagonist`: ตัวเอกหลัก
 * - `secondary_protagonist`: ตัวเอกรอง
 * - `antagonist`: ตัวร้ายหลัก
 * - `supporting_character`: ตัวละครสมทบ
 * - `love_interest`: ตัวละครที่เป็นเป้าหมายความรัก
 * - `mentor`: ผู้ชี้แนะ, อาจารย์
 * - `comic_relief`: ตัวละครสร้างสีสัน, ตลก
 * - `narrator`: ผู้บรรยาย (หากผู้บรรยายเป็นตัวละคร)
 * - `cameo`: ตัวละครรับเชิญ
 * - `minor_character`: ตัวละครรองอื่นๆ (บทบาทน้อย)
 * - `custom`: กำหนดเองโดยผู้เขียน
 */
export enum CharacterRoleInStory {
  MAIN_PROTAGONIST = "main_protagonist",
  SECONDARY_PROTAGONIST = "secondary_protagonist",
  ANTAGONIST = "antagonist",
  SUPPORTING_CHARACTER = "supporting_character",
  LOVE_INTEREST = "love_interest",
  MENTOR = "mentor",
  COMIC_RELIEF = "comic_relief",
  NARRATOR = "narrator",
  CAMEO = "cameo",
  MINOR_CHARACTER = "minor_character",
  CUSTOM = "custom",
}

/**
 * @enum {string} CharacterGenderIdentity
 * @description อัตลักษณ์ทางเพศของตัวละคร (เพื่อให้ครอบคลุมและทันสมัย)
 * - `male`: ชาย
 * - `female`: หญิง
 * - `non_binary`: ไม่ระบุเพศ (Non-binary)
 * - `genderfluid`: เพศลื่นไหล (Genderfluid)
 * - `agender`: ไร้เพศ (Agender)
 * - `other`: อื่นๆ (ระบุเพิ่มเติม)
 * - `not_specified`: ไม่ต้องการระบุ
 */
export enum CharacterGenderIdentity {
  MALE = "male",
  FEMALE = "female",
  NON_BINARY = "non_binary",
  GENDERFLUID = "genderfluid",
  AGENDER = "agender",
  OTHER = "other",
  NOT_SPECIFIED = "not_specified",
}

/**
 * @interface ICharacterExpression
 * @description การตั้งค่าการแสดงออกทางสีหน้าและท่าทางของตัวละคร (Sprite Sheet / Individual Images)
 * @property {string} expressionId - ID เฉพาะของ expression นี้ (เช่น "default", "happy_01", "sad_blush", "angry_shout") **ต้อง unique ภายในตัวละครเดียวกัน**
 * @property {string} name - ชื่อของ expression ที่ผู้ใช้อ่านได้ (สำหรับแสดงใน Editor)
 * @property {Types.ObjectId} mediaId - ID ของ Media ที่ใช้สำหรับ expression นี้ (อ้างอิง Media หรือ OfficialMedia model)
 * @property {"Media" | "OfficialMedia"} mediaSourceType - ประเภทของแหล่งที่มาของ Media
 * @property {string} [audioEffectOnDisplay] - ID ของ Media (SFX) ที่จะเล่นเมื่อแสดง expression นี้
 * @property {string} [animationTrigger] - ชื่อ trigger สำหรับ animation (ถ้าใช้ sprite sheet หรือระบบ animation ที่ซับซ้อน)
 * @property {string[]} [tags] - แท็กสำหรับจัดกลุ่มหรือค้นหา expression (เช่น "positive", "negative", "action")
 */
export interface ICharacterExpression {
  expressionId: string;
  name: string;
  mediaId: Types.ObjectId;
  mediaSourceType: "Media" | "OfficialMedia";
  audioEffectOnDisplay?: Types.ObjectId; // Ref to Media (SFX)
  animationTrigger?: string;
  tags?: string[];
}
const CharacterExpressionSchema = new Schema<ICharacterExpression>(
  {
    expressionId: { 
      type: String, 
      required: [true, "กรุณาระบุ ID ของ Expression (Expression ID is required)"], 
      trim: true, 
      maxlength: [100, "Expression ID ยาวเกินไป"],
      // Unique validation จะทำใน pre-save hook ของ CharacterSchema
    },
    name: { type: String, required: [true, "กรุณาระบุชื่อ Expression (Expression name is required)"], trim: true, maxlength: [100, "ชื่อ Expression ยาวเกินไป"] },
    mediaId: { type: Schema.Types.ObjectId, required: [true, "กรุณาระบุ Media ID สำหรับ Expression"], refPath: "expressions.mediaSourceType" },
    mediaSourceType: { type: String, enum: ["Media", "OfficialMedia"], required: true },
    audioEffectOnDisplay: { type: Schema.Types.ObjectId, ref: "Media" }, // สมมติว่า SFX มาจาก Media ของผู้ใช้
    animationTrigger: { type: String, trim: true, maxlength: [100, "Animation trigger ยาวเกินไป"] },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: [50, "Tag ยาวเกินไป"] }],
  },
  { _id: false } // ไม่สร้าง _id สำหรับ subdocument นี้
);

/**
 * @interface ICharacterDonationSettings
 * @description การตั้งค่าการรับบริจาคสำหรับตัวละครโดยเฉพาะ
 * @property {boolean} isEnabled - เปิด/ปิด การรับบริจาคสำหรับตัวละครนี้
 * @property {Types.ObjectId} [activeDonationApplicationId] - ID ของ DonationApplication ที่อนุมัติแล้ว (ถ้าการรับบริจาคต้องผ่านการอนุมัติแยก)
 * @property {string} [donationPromptMessage] - ข้อความเชิญชวนให้บริจาคให้ตัวละครนี้ (แสดงในหน้าโปรไฟล์ตัวละคร หรือจุดอื่นๆ)
 * @property {number} [minDonationAmountCoin] - จำนวนเหรียญขั้นต่ำที่สามารถบริจาคได้ต่อครั้ง
 * @property {number} [maxDonationAmountCoin] - จำนวนเหรียญสูงสุดที่สามารถบริจาคได้ต่อครั้ง
 * @property {string[]} [donationTiers] - ระดับการบริจาคพร้อมของรางวัล (ถ้ามี, เช่น "100 Coins: Thank you message", "500 Coins: Special Wallpaper")
 */
export interface ICharacterDonationSettings {
  isEnabled: boolean;
  activeDonationApplicationId?: Types.ObjectId;
  donationPromptMessage?: string;
  minDonationAmountCoin?: number;
  maxDonationAmountCoin?: number;
  donationTiers?: string[]; // อาจจะต้องเป็น sub-schema ที่ซับซ้อนกว่านี้ถ้ามีรายละเอียดเยอะ
}
const CharacterDonationSettingsSchema = new Schema<ICharacterDonationSettings>(
  {
    isEnabled: { type: Boolean, default: false },
    activeDonationApplicationId: { type: Schema.Types.ObjectId, ref: "DonationApplication" }, // อ้างอิง DonationApplication.ts
    donationPromptMessage: { type: String, trim: true, maxlength: [1000, "ข้อความเชิญชวนบริจาคยาวเกินไป"] },
    minDonationAmountCoin: { type: Number, min: 0, default: 0 },
    maxDonationAmountCoin: { type: Number, min: 0 },
    donationTiers: [{ type: String, trim: true, maxlength: [255, "Donation tier description is too long"] }],
  },
  { _id: false }
);

/**
 * @interface ICharacterRelationship
 * @description ข้อมูลความสัมพันธ์ของตัวละครนี้กับตัวละครอื่น (สำหรับ StoryMap หรือการแสดงผล)
 * @property {Types.ObjectId} targetCharacterId - ID ของตัวละครเป้าหมาย
 * @property {string} relationshipType - ประเภทความสัมพันธ์ (เช่น "ครอบครัว", "เพื่อนสนิท", "คนรัก", "ศัตรู")
 * @property {number} [relationshipValue] - ค่าความสัมพันธ์ (ถ้ามี, เช่น -100 ถึง 100)
 * @property {string} [description] - คำอธิบายเพิ่มเติมเกี่ยวกับความสัมพันธ์
 */
export interface ICharacterRelationship {
  targetCharacterId: Types.ObjectId;
  relationshipType: string;
  relationshipValue?: number;
  description?: string;
}
const CharacterRelationshipSchema = new Schema<ICharacterRelationship>(
  {
    targetCharacterId: { type: Schema.Types.ObjectId, ref: "Character", required: true }, // อ้างอิง Character.ts (ตัวเอง)
    relationshipType: { type: String, required: true, trim: true, maxlength: [100, "Relationship type is too long"] },
    relationshipValue: { type: Number },
    description: { type: String, trim: true, maxlength: [500, "Relationship description is too long"] },
  },
  { _id: false }
);

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร Character (ICharacter Document Interface)
// ==================================================================================================

/**
 * @interface ICharacter
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารตัวละครใน Collection "characters"
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสารตัวละคร
 * @property {Types.ObjectId} novelId - ID ของนิยายที่ตัวละครนี้เป็นส่วนหนึ่ง (อ้างอิง Novel model, **สำคัญมาก**)
 * @property {Types.ObjectId} authorId - ID ของผู้สร้างตัวละครนี้ (อ้างอิง User model, โดยทั่วไปคือผู้เขียนนิยาย)
 * @property {string} characterCode - รหัสเฉพาะของตัวละคร (เช่น "CHAR_001", ใช้ภายในระบบ Editor หรือ Scripting, **ควร unique ภายใน novelId**)
 * @property {string} name - ชื่อตัวละครที่แสดงผล (เช่น "อลิซ", "มังกรเพลิง")
 * @property {string} [fullName] - ชื่อเต็มของตัวละคร (ถ้ามี)
 * @property {string} [nickname] - ชื่อเล่นของตัวละคร
 * @property {Types.ObjectId} [profileImageMediaId] - ID ของ Media ที่ใช้เป็นรูปโปรไฟล์หลัก (อ้างอิง Media หรือ OfficialMedia)
 * @property {"Media" | "OfficialMedia"} [profileImageSourceType] - แหล่งที่มาของรูปโปรไฟล์
 * @property {string} [description] - คำอธิบาย, ประวัติย่อ, หรือข้อมูลเบื้องต้นของตัวละคร
 * @property {string} [age] - อายุของตัวละคร (อาจเป็นข้อความ เช่น "วัยรุ่นตอนปลาย", "ประมาณ 30 ปี", "อมตะ")
 * @property {CharacterGenderIdentity} [gender] - เพศของตัวละคร
 * @property {string} [customGenderDetails] - รายละเอียดเพิ่มเติมหากเพศเป็น "other"
 * @property {string[]} [personalityTraits] - ลักษณะนิสัยเด่น (เช่น "กล้าหาญ", "ขี้อาย", "ฉลาด", "เจ้าเล่ห์")
 * @property {CharacterRoleInStory} [roleInStory] - บทบาทหลักของตัวละครในเนื้อเรื่อง
 * @property {string} [customRoleDetails] - รายละเอียดเพิ่มเติมหากบทบาทเป็น "custom"
 * @property {string} [colorTheme] - สีประจำตัวละคร (HEX color code, เช่น "#FF69B4") สำหรับ UI หรือการเน้นข้อความ
 * @property {Types.DocumentArray<ICharacterExpression>} expressions - รายการการแสดงออกทางสีหน้า/ท่าทางทั้งหมดของตัวละคร
 * @property {string} [defaultExpressionId] - ID ของ expression ที่ใช้เป็นค่าเริ่มต้นเมื่อตัวละครปรากฏตัวครั้งแรกในฉาก
 * @property {ICharacterDonationSettings} [donationSettings] - การตั้งค่าการรับบริจาคสำหรับตัวละครนี้
 * @property {Types.DocumentArray<ICharacterRelationship>} relationships - ความสัมพันธ์กับตัวละครอื่นๆ (อาจจะซับซ้อนและย้ายไป StoryMap ได้)
 * @property {string[]} [tags] - แท็กสำหรับจัดกลุ่มหรือค้นหาตัวละคร (เช่น "human", "elf", "magic_user", "sci-fi")
 * @property {any} [customFields] - Object สำหรับเก็บข้อมูลเพิ่มเติมที่ผู้เขียนกำหนดเอง (ยืดหยุ่นสูง)
 * @property {string} [editorNotes] - หมายเหตุสำหรับผู้เขียน/ทีมงาน (ไม่แสดงผลในเกม)
 * @property {boolean} isArchived - ตัวละครนี้ถูกเก็บเข้าคลัง (ไม่ใช้งานแล้ว) หรือไม่
 * @property {Date} createdAt - วันที่สร้างเอกสารตัวละคร (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตเอกสารตัวละครล่าสุด (Mongoose `timestamps`)
 */
export interface ICharacter extends Document {
  _id: Types.ObjectId;
  novelId: Types.ObjectId;
  authorId: Types.ObjectId;
  characterCode: string;
  name: string;
  fullName?: string;
  nickname?: string;
  profileImageMediaId?: Types.ObjectId;
  profileImageSourceType?: "Media" | "OfficialMedia";
  description?: string;
  age?: string;
  gender?: CharacterGenderIdentity;
  customGenderDetails?: string;
  personalityTraits?: string[];
  roleInStory?: CharacterRoleInStory;
  customRoleDetails?: string;
  colorTheme?: string;
  expressions: Types.DocumentArray<ICharacterExpression>;
  defaultExpressionId?: string;
  donationSettings?: ICharacterDonationSettings;
  relationships: Types.DocumentArray<ICharacterRelationship>; // พิจารณาย้ายไป StoryMap ถ้าซับซ้อนมาก
  tags?: string[];
  customFields?: Record<string, any>;
  editorNotes?: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ Character (CharacterSchema)
// ==================================================================================================
const CharacterSchema = new Schema<ICharacter>(
  {
    novelId: {
      type: Schema.Types.ObjectId,
      ref: "Novel", // อ้างอิง Novel.ts
      required: [true, "กรุณาระบุ ID ของนิยาย (Novel ID is required)"],
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User", // อ้างอิง User.ts
      required: [true, "กรุณาระบุ ID ของผู้สร้างตัวละคร (Author ID is required)"],
      index: true,
    },
    characterCode: {
      type: String,
      required: [true, "กรุณาระบุรหัสตัวละคร (Character code is required)"],
      trim: true,
      uppercase: true,
      maxlength: [50, "รหัสตัวละครยาวเกินไป"],
      // unique จะถูกจัดการผ่าน compound index (novelId, characterCode)
    },
    name: {
      type: String,
      required: [true, "กรุณาระบุชื่อตัวละคร (Character name is required)"],
      trim: true,
      maxlength: [150, "ชื่อตัวละครยาวเกินไป (ไม่ควรเกิน 150 ตัวอักษร)"],
      index: true, // Index สำหรับค้นหาตามชื่อ
    },
    fullName: { type: String, trim: true, maxlength: [255, "ชื่อเต็มตัวละครยาวเกินไป"] },
    nickname: { type: String, trim: true, maxlength: [100, "ชื่อเล่นตัวละครยาวเกินไป"] },
    profileImageMediaId: { type: Schema.Types.ObjectId, refPath: "profileImageSourceType" },
    profileImageSourceType: { type: String, enum: ["Media", "OfficialMedia"] },
    description: { type: String, trim: true, maxlength: [5000, "คำอธิบายตัวละครยาวเกินไป (ไม่ควรเกิน 5000 ตัวอักษร)"] },
    age: { type: String, trim: true, maxlength: [100, "ข้อมูลอายุยาวเกินไป"] },
    gender: { type: String, enum: Object.values(CharacterGenderIdentity) },
    customGenderDetails: { type: String, trim: true, maxlength: [255, "รายละเอียดเพศที่กำหนดเองยาวเกินไป"] },
    personalityTraits: [{ type: String, trim: true, maxlength: [100, "ลักษณะนิสัยยาวเกินไป"] }],
    roleInStory: { type: String, enum: Object.values(CharacterRoleInStory) },
    customRoleDetails: { type: String, trim: true, maxlength: [255, "รายละเอียดบทบาทที่กำหนดเองยาวเกินไป"] },
    colorTheme: {
      type: String,
      trim: true,
      uppercase: true,
      match: [/^#(?:[0-9A-F]{3}){1,2}$/i, "กรุณากรอก Hex color code ให้ถูกต้อง (เช่น #FF0000)"],
      maxlength: [7, "Hex color code ไม่ถูกต้อง"],
    },
    expressions: [CharacterExpressionSchema],
    defaultExpressionId: { type: String, trim: true, maxlength: [100, "Default Expression ID ยาวเกินไป"] },
    donationSettings: { type: CharacterDonationSettingsSchema, default: () => ({ isEnabled: false }) },
    relationships: [CharacterRelationshipSchema],
    tags: [{ type: String, trim: true, lowercase: true, maxlength: [50, "Tag ยาวเกินไป"] }],
    customFields: { type: Schema.Types.Mixed, default: () => ({}) },
    editorNotes: { type: String, trim: true, maxlength: [5000, "Editor notes ยาวเกินไป"] },
    isArchived: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true, // เพิ่ม createdAt และ updatedAt โดยอัตโนมัติ
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

// Compound index เพื่อให้แน่ใจว่า characterCode ไม่ซ้ำกันภายใน novelId เดียวกัน
CharacterSchema.index({ novelId: 1, characterCode: 1 }, { unique: true, name: "NovelCharacterCodeUniqueIndex" });

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

// Compound index เพื่อให้แน่ใจว่า characterCode ไม่ซ้ำกันภายใน novelId เดียวกัน
CharacterSchema.index(
  { novelId: 1, characterCode: 1 },
  { unique: true, name: "NovelCharacterCodeUniqueIndex" }
);

// Compound index เพื่อให้แน่ใจว่าชื่อตัวละคร (name) ไม่ซ้ำกันภายใน novelId เดียวกัน (ถ้าต้องการบังคับ)
// CharacterSchema.index({ novelId: 1, name: 1 }, { unique: true, name: "NovelCharacterNameUniqueIndex" });
// **หมายเหตุ**: การบังคับชื่อ unique อาจไม่เหมาะกับทุกกรณี (เช่น ตัวละครชื่อซ้ำกันแต่คนละบทบาท) ให้พิจารณาตามความเหมาะสม
// ปัจจุบันปล่อยให้ชื่อซ้ำได้ แต่ characterCode ต้อง unique

// Index สำหรับค้นหาตัวละครตาม novelId และ tags
CharacterSchema.index(
  { novelId: 1, tags: 1 },
  { name: "NovelCharacterTagsIndex" }
);

// Index สำหรับค้นหาตัวละครที่ยังไม่ถูก archived
CharacterSchema.index(
  { novelId: 1, isArchived: 1 },
  { name: "NovelActiveCharactersIndex" }
);

// Text index สำหรับค้นหาชื่อและคำอธิบาย (ถ้าจำเป็น)
CharacterSchema.index(
  { name: "text", description: "text", fullName: "text", nickname: "text" },
  { name: "CharacterTextSearchIndex" }
);

// ==================================================================================================
// SECTION: Virtuals (ฟิลด์เสมือน)
// ==================================================================================================

// Virtual field: URL เต็มของรูปโปรไฟล์ (ถ้ามี)
CharacterSchema.virtual("profileImageUrlFull").get(function (this: ICharacter) {
  if (this.profileImageMediaId && this.profileImageSourceType) {
    // Logic การสร้าง URL เต็ม จะขึ้นอยู่กับว่า Media/OfficialMedia เก็บ URL เต็มหรือแค่ path
    // สมมติว่า Media model มี virtual 'fullUrl' หรือ field 'url'
    // return `https://cdn.novelmaze.com/${this.profileImageSourceType.toLowerCase()}/${this.profileImageMediaId}`; // ตัวอย่าง
    return null; // TODO: Implement actual URL generation based on Media/OfficialMedia structure
  }
  return null;
});

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

// Middleware: ก่อนบันทึก (save)
CharacterSchema.pre<ICharacter>("save", async function (next) {
  // 1. ตรวจสอบความ unique ของ expressionId ภายใน character เดียวกัน
  if (this.isModified("expressions") && this.expressions && this.expressions.length > 0) {
    const expressionIds = this.expressions.map(exp => exp.expressionId);
    const uniqueExpressionIds = new Set(expressionIds);
    if (expressionIds.length !== uniqueExpressionIds.size) {
      return next(new Error("รหัส Expression ID ภายในตัวละครต้องไม่ซ้ำกัน (Expression IDs must be unique within a character)."));
    }
  }

  // 2. ตรวจสอบว่า defaultExpressionId (ถ้ามี) อยู่ในรายการ expressions จริง
  if (this.isModified("defaultExpressionId") || this.isModified("expressions")) {
    if (this.defaultExpressionId && this.expressions && !this.expressions.some(exp => exp.expressionId === this.defaultExpressionId)) {
        // อาจจะ clear ค่า หรือ throw error
        // this.defaultExpressionId = undefined; // หรือตั้งเป็น expression แรกถ้ามี
        return next(new Error(`รหัส Expression เริ่มต้น "${this.defaultExpressionId}" ไม่พบในรายการ Expressions ของตัวละครนี้`));
    }
  }

  // 3. ถ้า gender เป็น 'other' แต่ไม่ได้ระบุ customGenderDetails ให้แจ้งเตือน (หรือบังคับ)
  if (this.gender === CharacterGenderIdentity.OTHER && !this.customGenderDetails) {
    // console.warn(`Character ${this.name} has gender 'other' but no custom details.`);
    // อาจจะเพิ่ม validation error ถ้าต้องการบังคับ
  }

  // 4. ถ้า roleInStory เป็น 'custom' แต่ไม่ได้ระบุ customRoleDetails ให้แจ้งเตือน (หรือบังคับ)
  if (this.roleInStory === CharacterRoleInStory.CUSTOM && !this.customRoleDetails) {
    // console.warn(`Character ${this.name} has role 'custom' but no custom details.`);
  }

  // 5. ตรวจสอบการตั้งค่า Donation
  if (this.donationSettings?.isEnabled && !this.donationSettings.activeDonationApplicationId) {
    // ใน Production อาจจะต้องมี Logic ที่ซับซ้อนกว่านี้ เช่น ตรวจสอบว่า Novel อนุญาตให้ตัวละครรับ Donation หรือไม่
    // หรืออาจจะตั้ง isEnabled เป็น false หากไม่มี Application ID ที่ถูกต้องและระบบต้องการการอนุมัติ
    // console.warn(`ตัวละคร "${this.name}" เปิดรับบริจาคแต่ยังไม่มี ID การอนุมัติที่ใช้งานได้`);
  }

  // 6. สร้าง characterCode ถ้ายังไม่มี (อาจจะใช้ novelId + ลำดับ หรือ UUID)
  // ตัวอย่าง: ถ้า characterCode ควรเป็น unique ภายใน novel และสร้างอัตโนมัติ
  if (this.isNew && !this.characterCode) {
    // Logic การสร้าง characterCode อาจจะซับซ้อนกว่านี้ เช่น query หาตัวสุดท้ายแล้ว +1
    // หรือใช้ library เช่น shortid, nanoid
    // this.characterCode = `CHAR_${new Date().getTime().toString(36)}`; // ตัวอย่างง่ายๆ (ไม่แนะนำสำหรับ production)
    // **สำคัญ**: การสร้าง characterCode ควรทำใน service layer หรือมีกลไกที่ robust กว่านี้
    // เพื่อป้องกัน race condition และรับประกันความ unique จริงๆ
    // ในที่นี้ สมมติว่า characterCode ถูกส่งมาจาก client หรือ service layer ที่จัดการเรื่องนี้แล้ว
  }

  next();
});

// Middleware: หลังจากบันทึก (save) หรือลบ เพื่ออัปเดตข้อมูลใน Novel (เช่น list of characters)
CharacterSchema.post<ICharacter>("save", async function (doc) {
  try {
    const NovelModel = models.Novel || model("Novel");
    // อาจจะต้องอัปเดต Novel document เช่น เพิ่ม/อัปเดต characterId ใน list ของ Novel
    // หรืออัปเดต lastContentUpdatedAt ของ Novel
    await NovelModel.findByIdAndUpdate(doc.novelId, { $set: { lastContentUpdatedAt: new Date() } });
  } catch (error) {
    console.error(`[CharacterMiddlewareError] Failed to update Novel after saving character ${doc._id}:`, error);
  }
});

// Middleware: หลังจากลบเอกสาร (findOneAndDelete)
CharacterSchema.post<mongoose.Query<ICharacter, ICharacter>>("findOneAndDelete", async function (doc) {
  // ตรวจสอบว่า doc เป็น ICharacter และมี _id
  if (doc && "modifiedCount" in doc === false && "_id" in doc) {
    try {
      const NovelModel = models.Novel || model("Novel");
      // อัปเดต Novel document เช่น ลบ characterId ออกจาก list ของ Novel
      // และอัปเดต lastContentUpdatedAt ของ Novel
      await NovelModel.findByIdAndUpdate((doc as ICharacter).novelId, {
        $pull: { characterIds: doc._id }, // สมมติว่า Novel มี field characterIds
        $set: { lastContentUpdatedAt: new Date() },
      });
      // **เพิ่มเติม**: ควรล้างข้อมูลที่เกี่ยวข้องกับตัวละครนี้ใน Scene, StoryMap ด้วย
      // เช่น ลบ character instance ออกจากทุก Scene ที่ตัวละครนี้เคยปรากฏ
      // การทำ cascading delete อาจจะซับซ้อนและควรจัดการใน service layer
    } catch (error) {
      console.error(`[CharacterMiddlewareError] Failed to update Novel after deleting character ${doc._id}:`, error);
    }
  }
});


// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

// ตรวจสอบว่า Model "Character" ถูกสร้างไปแล้วหรือยัง ถ้ายัง ให้สร้าง Model ใหม่
const CharacterModel = (models.Character as mongoose.Model<ICharacter>) || model<ICharacter>("Character", CharacterSchema);

export default CharacterModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Character Code Generation**: `characterCode` ควรมีระบบการสร้างที่ robust และรับประกันความ unique ภายใน Novel.
// 2.  **Relationships**: `relationships` field อาจจะซับซ้อนและเหมาะสมที่จะย้ายไปจัดการใน `StoryMap.ts` หรือ model เฉพาะสำหรับความสัมพันธ์ หากต้องการ query หรือแสดงผลที่ซับซ้อน (เช่น กราฟความสัมพันธ์).
// 3.  **Custom Fields**: `customFields` ให้ความยืดหยุ่นสูง แต่การ query ข้อมูลในนี้จะยากและไม่มี type safety ควรใช้เมื่อจำเป็นจริงๆ และมีการกำหนดโครงสร้างที่ชัดเจนในทีมพัฒนา.
// 4.  **Sprite Sheets & Animations**: หากระบบรองรับ sprite sheets หรือ animation ที่ซับซ้อน, `ICharacterExpression` อาจจะต้องมี field เพิ่มเติมสำหรับ metadata ของ animation (เช่น frame data, duration).
// 5.  **Cascading Deletes/Updates**: การลบตัวละคร (archived หรือ hard delete) ควรมีการจัดการข้อมูลที่เกี่ยวข้องใน Scene, Episode, StoryMap อย่างเหมาะสม (อาจใช้ Mongoose middleware หรือ service layer logic).
// 6.  **Localization**: ชื่อตัวละคร, คำอธิบาย, และข้อมูลอื่นๆ อาจจะต้องรองรับหลายภาษา (i18n) ซึ่งจะต้องปรับ schema เพิ่มเติม.
// 7.  **Integration with Scene Editor**: การออกแบบ Character model ควรคำนึงถึงการใช้งานใน Scene Editor ด้วย เช่น การเลือก expression, การแสดงตัวอย่างตัวละคร.
// 8.  **Performance**: สำหรับนิยายที่มีตัวละครจำนวนมาก การ query และ indexing จะมีความสำคัญมาก ควรทดสอบ performance อย่างสม่ำเสมอ.
// ==================================================================================================

