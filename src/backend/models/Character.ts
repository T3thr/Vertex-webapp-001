// src/backend/models/Character.ts
// โมเดลตัวละคร (Character Model)
// จัดการข้อมูลตัวละครในนิยาย, รูปแบบการแสดงออก, ความสัมพันธ์, การปรับแต่ง, และการตั้งค่าการรับบริจาค

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { INovel } from "./Novel"; // สำหรับ novelId
import { IUser } from "./User"; // สำหรับ authorId และ voiceActorInfo.sampleMediaId (ถ้าผู้พากย์เป็น User ในระบบ)
import { IMedia } from "./Media"; // สำหรับ profileImageMediaId และ expressions.mediaId
import { OfficialMediaType } from "./OfficialMedia";
// import { IScene } from "./Scene"; // ไม่จำเป็นต้อง import โดยตรง เว้นแต่จะมีการอ้างอิง scene context ใน character stats
// import { IChoice } from "./Choice"; // ไม่จำเป็นต้อง import โดยตรง เว้นแต่จะมีการอ้างอิง choice context ใน character stats

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Character
// ==================================================================================================

/**
 * @enum {string} CharacterRoleInStory
 * @description บทบาทของตัวละครในเนื้อเรื่อง
 * (คง Enum เดิมไว้)
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
 * @description อัตลักษณ์ทางเพศของตัวละคร
 * (คง Enum เดิมไว้)
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
 * @description การตั้งค่าการแสดงออกทางสีหน้าและท่าทางของตัวละคร
 * (คง Interface เดิมไว้)
 */
export interface ICharacterExpression {
  expressionId: string;
  name: string;
  mediaId: Types.ObjectId;
  mediaSourceType: "Media" | "OfficialMedia";
  audioEffectOnDisplay?: Types.ObjectId;
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
    },
    name: { type: String, required: [true, "กรุณาระบุชื่อ Expression (Expression name is required)"], trim: true, maxlength: [100, "ชื่อ Expression ยาวเกินไป"] },
    mediaId: { type: Schema.Types.ObjectId, required: [true, "กรุณาระบุ Media ID สำหรับ Expression"], refPath: "expressions.mediaSourceType" },
    mediaSourceType: { type: String, enum: ["Media", "OfficialMedia"], required: true },
    audioEffectOnDisplay: { type: Schema.Types.ObjectId, ref: "Media" },
    animationTrigger: { type: String, trim: true, maxlength: [100, "Animation trigger ยาวเกินไป"] },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: [50, "Tag ยาวเกินไป"] }],
  },
  { _id: false }
);

/**
 * @interface ICharacterDonationSettings
 * @description การตั้งค่าการรับบริจาคสำหรับตัวละครโดยเฉพาะ
 * (คง Interface เดิมไว้ แต่พิจารณาการเชื่อมโยงกับ DonationApplication ที่ชัดเจน)
 */
export interface ICharacterDonationSettings {
  donationTargetAmount: number;
  isEnabled: boolean;
  /** @description ID ของ DonationApplication ที่เกี่ยวข้องกับตัวละครนี้ (ถ้ามี) อาจเชื่อมโยงกับระบบการอนุมัติรับบริจาค */
  activeDonationApplicationId?: Types.ObjectId; // อ้างอิง DonationApplication
  donationPromptMessage?: string;
  minDonationAmountCoin?: number;
  maxDonationAmountCoin?: number;
  donationTiers?: string[];
  /** @description จำนวนเหรียญทั้งหมดที่ตัวละครนี้ได้รับจากการบริจาค (Denormalized, อัปเดตจาก EarningTransaction) */
  totalCoinsReceived?: number;
  /** @description จำนวนเงินจริงทั้งหมดที่ตัวละครนี้ได้รับจากการบริจาค (Denormalized, หลังหักค่าธรรมเนียม, สกุลเงินหลักของระบบ) */
  totalRealMoneyReceived?: number;
  /** @description จำนวนครั้งที่ได้รับการบริจาค (Denormalized) */
  totalDonationCount?: number;
  /** @description วันที่ได้รับการบริจาคล่าสุด */
  lastDonatedAt?: Date;
}
const CharacterDonationSettingsSchema = new Schema<ICharacterDonationSettings>(
  {
    isEnabled: { type: Boolean, default: false, comment: "เปิด/ปิด การรับบริจาคสำหรับตัวละครนี้" },
    activeDonationApplicationId: { type: Schema.Types.ObjectId, ref: "DonationApplication", comment: "ID การอนุมัติรับบริจาค (ถ้ามี)" },
    donationPromptMessage: { type: String, trim: true, maxlength: [1000, "ข้อความเชิญชวนบริจาคยาวเกินไป"] },
    minDonationAmountCoin: { type: Number, min: 0, default: 0, comment: "เหรียญขั้นต่ำที่บริจาคได้" },
    maxDonationAmountCoin: { type: Number, min: 0, comment: "เหรียญสูงสุดที่บริจาคได้" },
    donationTiers: [{ type: String, trim: true, maxlength: [255, "รายละเอียดระดับการบริจาคยาวเกินไป"] }],
    totalCoinsReceived: { type: Number, default: 0, min: 0, comment: "เหรียญทั้งหมดที่ได้รับ (Denormalized)" },
    totalRealMoneyReceived: { type: Number, default: 0, min: 0, comment: "เงินจริงทั้งหมดที่ได้รับ (Denormalized)" },
    totalDonationCount: { type: Number, default: 0, min: 0, comment: "จำนวนครั้งที่ได้รับบริจาค (Denormalized)" },
    lastDonatedAt: { type: Date, comment: "วันที่ได้รับบริจาคล่าสุด" },
  },
  { _id: false }
);

/**
 * @interface ICharacterRelationship
 * @description ข้อมูลความสัมพันธ์ของตัวละครนี้กับตัวละครอื่น
 * (คง Interface เดิมไว้)
 */
export interface ICharacterRelationship {
  targetCharacterId: Types.ObjectId;
  relationshipType: string;
  relationshipValue?: number;
  description?: string;
}
const CharacterRelationshipSchema = new Schema<ICharacterRelationship>(
  {
    targetCharacterId: { type: Schema.Types.ObjectId, ref: "Character", required: true },
    relationshipType: { type: String, required: true, trim: true, maxlength: [100, "Relationship type is too long"] },
    relationshipValue: { type: Number },
    description: { type: String, trim: true, maxlength: [500, "Relationship description is too long"] },
  },
  { _id: false }
);

/**
 * @interface IPhysicalAttributes
 * @description (เพิ่มใหม่) คุณลักษณะทางกายภาพของตัวละคร
 */
export interface IPhysicalAttributes {
  heightCm?: number; // ส่วนสูง (เซนติเมตร)
  weightKg?: number; // น้ำหนัก (กิโลกรัม)
  eyeColor?: string; // สีตา
  hairColor?: string; // สีผม
  distinguishingFeatures?: string[]; // ลักษณะเด่น (เช่น รอยแผลเป็น, ไฝ)
  ageAppearance?: string; // ลักษณะอายุที่ปรากฏ (เช่น "ต้น 20", "วัยรุ่น")
}
const PhysicalAttributesSchema = new Schema<IPhysicalAttributes>(
  {
    heightCm: { type: Number, min: 0, comment: "ส่วนสูง (เซนติเมตร)" },
    weightKg: { type: Number, min: 0, comment: "น้ำหนัก (กิโลกรัม)" },
    eyeColor: { type: String, trim: true, maxlength: [50, "สีตายาวเกินไป"] },
    hairColor: { type: String, trim: true, maxlength: [50, "สีผมยาวเกินไป"] },
    distinguishingFeatures: [{ type: String, trim: true, maxlength: [150, "ลักษณะเด่นยาวเกินไป"] }],
    ageAppearance: { type: String, trim: true, maxlength: [100, "ลักษณะอายุที่ปรากฏยาวเกินไป"] },
  },
  { _id: false }
);

/**
 * @interface IPersonalityTraits
 * @description (เพิ่มใหม่) ลักษณะนิสัยและข้อมูลเชิงลึกของตัวละคร
 */
export interface IPersonalityTraits {
  goals?: string[]; // เป้าหมายของตัวละคร
  fears?: string[]; // สิ่งที่ตัวละครกลัว
  strengths?: string[]; // จุดแข็ง
  weaknesses?: string[]; // จุดอ่อน
  alignment?: string; // การวางตัว (เช่น Lawful Good, Chaotic Neutral - ถ้ามีระบบนี้)
  likes?: string[]; // สิ่งที่ชอบ
  dislikes?: string[]; // สิ่งที่ไม่ชอบ
  hobbies?: string[]; // งานอดิเรก
  quotes?: string[]; // คำพูดติดปาก หรือคำคมประจำตัว
  mbtiType?: string; // (Optional) MBTI Type (ถ้าผู้เขียนต้องการระบุ)
  enneagramType?: string; // (Optional) Enneagram Type (ถ้าผู้เขียนต้องการระบุ)
}
const PersonalityTraitsSchema = new Schema<IPersonalityTraits>(
  {
    goals: [{ type: String, trim: true, maxlength: [200, "เป้าหมายยาวเกินไป"] }],
    fears: [{ type: String, trim: true, maxlength: [200, "สิ่งที่กลัวยาวเกินไป"] }],
    strengths: [{ type: String, trim: true, maxlength: [200, "จุดแข็งยาวเกินไป"] }],
    weaknesses: [{ type: String, trim: true, maxlength: [200, "จุดอ่อนยาวเกินไป"] }],
    alignment: { type: String, trim: true, maxlength: [50, "Alignment ยาวเกินไป"] },
    likes: [{ type: String, trim: true, maxlength: [150, "สิ่งที่ชอบยาวเกินไป"] }],
    dislikes: [{ type: String, trim: true, maxlength: [150, "สิ่งที่ไม่ชอบยาวเกินไป"] }],
    hobbies: [{ type: String, trim: true, maxlength: [150, "งานอดิเรกยาวเกินไป"] }],
    quotes: [{ type: String, trim: true, maxlength: [500, "คำพูดติดปากยาวเกินไป"] }],
    mbtiType: { type: String, trim: true, maxlength: [10, "MBTI Type ยาวเกินไป"] },
    enneagramType: { type: String, trim: true, maxlength: [10, "Enneagram Type ยาวเกินไป"] },
  },
  { _id: false }
);

/**
 * @interface IVoiceActorInfo
 * @description (เพิ่มใหม่) ข้อมูลนักพากย์ (ถ้ามี)
 */
export interface IVoiceActorInfo {
  name?: string; // ชื่อนักพากย์
  sampleMediaId?: Types.ObjectId; // ID ของ Media (ไฟล์เสียงตัวอย่าง) อาจอ้างอิง OfficialMedia หรือ Media ของ User ที่เป็นนักพากย์
  sampleMediaSourceType?: "Media" | "OfficialMedia";
  language?: string; // ภาษาที่พากย์
  portfolioUrl?: string; // URL ผลงานของนักพากย์
}
const VoiceActorInfoSchema = new Schema<IVoiceActorInfo>(
  {
    name: { type: String, trim: true, maxlength: [150, "ชื่อนักพากย์ยาวเกินไป"] },
    sampleMediaId: { type: Schema.Types.ObjectId, refPath: "voiceActorInfo.sampleMediaSourceType" },
    sampleMediaSourceType: { type: String, enum: ["Media", "OfficialMedia"] },
    language: { type: String, trim: true, maxlength: [50, "ภาษาที่พากย์ยาวเกินไป"] },
    portfolioUrl: { type: String, trim: true, maxlength: [2048, "URL ผลงานนักพากย์ยาวเกินไป"] },
  },
  { _id: false }
);

/**
 * @interface ICharacterStat
 * @description (เพิ่มใหม่) ค่าสถานะของตัวละคร (สำหรับ Gameplay)
 * @property {string} statId - ID เฉพาะของ stat นี้ (เช่น "HP", "MP", "STRENGTH", "KARMA") อาจจะตรงกับ IDefinedStat.statId ใน StoryMap
 * @property {string} name - ชื่อที่แสดงผลของ stat (เช่น "พลังชีวิต", "ความแข็งแกร่ง")
 * @property {number} baseValue - ค่าพื้นฐาน
 * @property {number} currentValue - ค่าปัจจุบัน (อาจมีการเปลี่ยนแปลงระหว่างเล่น)
 * @property {number} [maxValue] - (Optional) ค่าสูงสุดที่เป็นไปได้ (สำหรับ HP, MP)
 * @property {string} [description] - คำอธิบาย stat
 * @property {boolean} [isVisibleToPlayer] - ผู้เล่นสามารถเห็น stat นี้ได้หรือไม่
 * @property {Types.ObjectId} [iconMediaId] - ไอคอนของ Stat (ถ้ามี)
 * @property {"Media" | "OfficialMedia"} [iconMediaSourceType] - แหล่งที่มาของไอคอน
 */
export interface ICharacterStat {
  statId: string; // Unique ID for the stat, e.g., "HP", "MP", "KARMA"
  name: string; // Display name, e.g., "Health Points", "Karma Score"
  baseValue: number;
  currentValue: number;
  maxValue?: number;
  description?: string;
  isVisibleToPlayer?: boolean;
  iconMediaId?: Types.ObjectId;
  iconMediaSourceType?: "Media" | "OfficialMedia";
  // การอ้างอิงถึง Scene, Novel, Choice อาจไม่จำเป็นต้องเก็บใน stat โดยตรง
  // แต่ stat นี้จะถูกใช้ใน context ของ Scene/Novel/Choice นั้นๆ ผ่าน StoryMap หรือ Game Engine
}
const CharacterStatSchema = new Schema<ICharacterStat>(
  {
    statId: { type: String, required: true, trim: true, maxlength: [50, "Stat ID ยาวเกินไป"], comment: "ID เฉพาะของ Stat (ควรตรงกับ StoryMap.gameMechanicsConfig.definedStats.statId)" },
    name: { type: String, required: true, trim: true, maxlength: [100, "ชื่อ Stat ยาวเกินไป"] },
    baseValue: { type: Number, required: true, default: 0 },
    currentValue: { type: Number, required: true, default: function(this: ICharacterStat) { return this.baseValue; } },
    maxValue: { type: Number, min: 0 },
    description: { type: String, trim: true, maxlength: [500, "คำอธิบาย Stat ยาวเกินไป"] },
    isVisibleToPlayer: { type: Boolean, default: true },
    iconMediaId: { type: Schema.Types.ObjectId, refPath: "stats.iconMediaSourceType" },
    iconMediaSourceType: { type: String, enum: ["Media", "OfficialMedia"] },
  },
  { _id: false }
);


// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร Character (ICharacter Document Interface) - ปรับปรุง
// ==================================================================================================

/**
 * @interface ICharacter
 * @description อินเทอร์เฟซหลักสำหรับเอกสารตัวละคร ปรับปรุงเพื่อเพิ่มข้อมูลเชิงลึก
 */
export interface ICharacter extends Document {
  // ... (คง field เดิมไว้)
  _id: Types.ObjectId;
  novelId: Types.ObjectId | INovel;
  authorId: Types.ObjectId | IUser;
  characterCode: string;
  name: string;
  fullName?: string;
  nickname?: string;
  profileImageMediaId?: Types.ObjectId;
  profileImageSourceType?: "Media" | "OfficialMedia";
  description?: string;
  age?: string; // ยังคงไว้สำหรับข้อมูลทั่วไป
  gender?: CharacterGenderIdentity;
  customGenderDetails?: string;
  // personalityTraits?: string[]; // <--- Field เดิม จะถูกแทนที่ด้วย object ด้านล่าง
  roleInStory?: CharacterRoleInStory;
  customRoleDetails?: string;
  colorTheme?: string;
  expressions: Types.DocumentArray<ICharacterExpression>;
  defaultExpressionId?: string;
  profileImageUrl?: string; // This will be the virtual field
  donationSettings?: ICharacterDonationSettings;
  relationships: Types.DocumentArray<ICharacterRelationship>;
  tags?: string[];
  customFields?: Record<string, any>;
  editorNotes?: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;

  // --- Fields ที่เพิ่มใหม่ ---
  /** @description (ใหม่) คุณลักษณะทางกายภาพของตัวละคร */
  physicalAttributes?: IPhysicalAttributes;
  /** @description (ใหม่) ประวัติความเป็นมาโดยละเอียด (รองรับ Markdown ในอนาคต) */
  detailedBackstory?: string;
  /** @description (ใหม่) ลักษณะนิสัยและข้อมูลเชิงลึกของตัวละคร */
  personalityTraits?: IPersonalityTraits; // <--- แทนที่ string[] เดิม
  /** @description (ใหม่) ข้อมูลนักพากย์ (ถ้ามี) */
  voiceActorInfo?: IVoiceActorInfo;
  /** @description (ใหม่, Optional) ค่าสถานะของตัวละครสำหรับ Gameplay (ถ้ามีระบบ Stats/Skills) */
  stats?: Types.DocumentArray<ICharacterStat>;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ Character (CharacterSchema) - ปรับปรุง
// ==================================================================================================
const CharacterSchema = new Schema<ICharacter>(
  {
    novelId: {
      type: Schema.Types.ObjectId,
      ref: "Novel",
      required: [true, "กรุณาระบุ ID ของนิยาย (Novel ID is required)"],
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุ ID ของผู้สร้างตัวละคร (Author ID is required)"],
      index: true,
    },
    characterCode: {
      type: String,
      required: [true, "กรุณาระบุรหัสตัวละคร (Character code is required)"],
      trim: true,
      uppercase: true,
      maxlength: [50, "รหัสตัวละครยาวเกินไป"],
    },
    name: {
      type: String,
      required: [true, "กรุณาระบุชื่อตัวละคร (Character name is required)"],
      trim: true,
      maxlength: [150, "ชื่อตัวละครยาวเกินไป"],
      index: true,
    },
    fullName: { type: String, trim: true, maxlength: [255, "ชื่อเต็มตัวละครยาวเกินไป"] },
    nickname: { type: String, trim: true, maxlength: [100, "ชื่อเล่นตัวละครยาวเกินไป"] },
    profileImageMediaId: { type: Schema.Types.ObjectId, refPath: "profileImageSourceType" },
    profileImageSourceType: { type: String, enum: ["Media", "OfficialMedia"], comment: "แหล่งที่มาของรูปโปรไฟล์หลัก" },
    description: { type: String, trim: true, maxlength: [5000, "คำอธิบายตัวละครยาวเกินไป"] },
    age: { type: String, trim: true, maxlength: [100, "ข้อมูลอายุยาวเกินไป"] },
    gender: { type: String, enum: Object.values(CharacterGenderIdentity), comment: "อัตลักษณ์ทางเพศของตัวละคร" },
    customGenderDetails: { type: String, trim: true, maxlength: [255, "รายละเอียดเพศที่กำหนดเองยาวเกินไป"] },
    // personalityTraits: [{ type: String, trim: true, maxlength: [100, "ลักษณะนิสัยยาวเกินไป"] }], // Comment out the old field
    roleInStory: { type: String, enum: Object.values(CharacterRoleInStory), comment: "บทบาทหลักในเนื้อเรื่อง" },
    customRoleDetails: { type: String, trim: true, maxlength: [255, "รายละเอียดบทบาทที่กำหนดเองยาวเกินไป"] },
    colorTheme: {
      type: String,
      trim: true,
      uppercase: true,
      match: [/^#(?:[0-9A-F]{3}){1,2}$/i, "กรุณากรอก Hex color code ให้ถูกต้อง (เช่น #FF0000)"],
      maxlength: [7, "Hex color code ไม่ถูกต้อง"],
      comment: "สีประจำตัวละคร (Hex code)",
    },
    expressions: { type: [CharacterExpressionSchema], default: [], comment: "รายการการแสดงออกทางสีหน้า/ท่าทาง" },
    defaultExpressionId: { type: String, trim: true, maxlength: [100, "Default Expression ID ยาวเกินไป"], comment: "Expression เริ่มต้นเมื่อตัวละครปรากฏ" },
    donationSettings: { type: CharacterDonationSettingsSchema, default: () => ({ isEnabled: false, totalCoinsReceived: 0, totalRealMoneyReceived: 0, totalDonationCount: 0 }), comment: "การตั้งค่าการรับบริจาคสำหรับตัวละครนี้" },
    relationships: { type: [CharacterRelationshipSchema], default: [], comment: "ความสัมพันธ์กับตัวละครอื่น" },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: [50, "Tag ยาวเกินไป"], index: true }],
    customFields: { type: Schema.Types.Mixed, default: () => ({}), comment: "ข้อมูลเพิ่มเติมที่ผู้เขียนกำหนดเอง" },
    editorNotes: { type: String, trim: true, maxlength: [5000, "Editor notes ยาวเกินไป"], select: false },
    isArchived: { type: Boolean, default: false, index: true, comment: "ตัวละครนี้ถูกเก็บเข้าคลังหรือไม่" },

    // --- Fields ที่เพิ่มใหม่ ---
    physicalAttributes: { type: PhysicalAttributesSchema, default: () => ({}), comment: "คุณลักษณะทางกายภาพ" },
    detailedBackstory: { type: String, trim: true, maxlength: [50000, "ประวัติความเป็นมาตัวละครยาวเกินไป (รองรับ Markdown ในอนาคต)"] }, // เพิ่ม MaxLength
    personalityTraits: { type: PersonalityTraitsSchema, default: () => ({}), comment: "ลักษณะนิสัยและข้อมูลเชิงลึก" },
    voiceActorInfo: { type: VoiceActorInfoSchema, default: () => ({}), comment: "ข้อมูลนักพากย์ (ถ้ามี)" },
    stats: { type: [CharacterStatSchema], default: [], comment: "ค่าสถานะของตัวละคร (สำหรับ Gameplay)" },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    collection: "characters",
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance) - ปรับปรุง
// ==================================================================================================

CharacterSchema.index({ novelId: 1, characterCode: 1 }, { unique: true, name: "idx_char_novel_code_unique" });
CharacterSchema.index({ novelId: 1, name: 1 }, { name: "idx_char_novel_name" }); // อาจจะไม่ unique ถ้าอนุญาตชื่อซ้ำในนิยายเดียว
CharacterSchema.index({ novelId: 1, tags: 1 }, { name: "idx_char_novel_tags" });
CharacterSchema.index({ novelId: 1, isArchived: 1 }, { name: "idx_char_novel_archived" });
CharacterSchema.index(
  { name: "text", description: "text", fullName: "text", nickname: "text", "personalityTraits.strengths": "text", "personalityTraits.weaknesses": "text" },
  {
    name: "idx_char_text_search",
    weights: { name: 10, fullName: 8, nickname: 7, description: 5, "personalityTraits.strengths": 3, "personalityTraits.weaknesses": 3 },
    default_language: "none",
  }
);
CharacterSchema.index({ novelId: 1, "donationSettings.isEnabled": 1 }, { name: "idx_char_donation_enabled", sparse: true });


// ==================================================================================================
// SECTION: Virtuals (ฟิลด์เสมือน)
// ==================================================================================================
// เปลี่ยนชื่อ virtual จาก profileImageUrlFull เป็น profileImageUrl เพื่อให้ตรงกับการใช้งานใน API
CharacterSchema.virtual("profileImageUrl").get(function (this: ICharacter) {
  if (this.profileImageMediaId && this.profileImageSourceType) {
    // TODO: Implement actual URL generation logic based on Media/OfficialMedia structure and CDN
    // For now, returning a placeholder or assuming direct URL stored in Media.
    // Example:
    // const media = this.profileImageMediaId as unknown as IMedia; // Might need to query Media model if not populated
    // return media?.accessUrl || `placeholder_image_url_for_${this.profileImageMediaId}`;

    // Placeholder for now, as IMedia or how to get accessUrl is not fully defined here
    // This logic should ideally query the Media/OfficialMedia model or use a helper service.
    return `/api/media_placeholder/${this.profileImageSourceType}/${(this.profileImageMediaId as Types.ObjectId).toString()}`;

  }
  return `/images/default-avatar.png`; // Default avatar
});

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================
CharacterSchema.pre<ICharacter>("save", async function (next) {
  if (this.isModified("expressions") && this.expressions && this.expressions.length > 0) {
    const expressionIds = this.expressions.map(exp => exp.expressionId);
    const uniqueExpressionIds = new Set(expressionIds);
    if (expressionIds.length !== uniqueExpressionIds.size) {
      return next(new mongoose.Error.ValidatorError({ message: "รหัส Expression ID ภายในตัวละครต้องไม่ซ้ำกัน" }));
    }
  }

  if (this.defaultExpressionId && this.expressions && !this.expressions.some(exp => exp.expressionId === this.defaultExpressionId)) {
    return next(new mongoose.Error.ValidatorError({ message: `รหัส Expression เริ่มต้น "${this.defaultExpressionId}" ไม่พบในรายการ Expressions` }));
  }

  // ตรวจสอบความสมเหตุสมผลของ donationTargetAmount (ถ้ามีการตั้งค่า)
  if (this.donationSettings?.donationTargetAmount && this.donationSettings.donationTargetAmount < 0) {
      this.donationSettings.donationTargetAmount = 0; // หรือ throw error
  }

  // ตรวจสอบ unique ของ statId ภายใน character stats (ถ้ามี)
  if (this.stats && this.stats.length > 0) {
    const statIds = this.stats.map(stat => stat.statId);
    const uniqueStatIds = new Set(statIds);
    if (statIds.length !== uniqueStatIds.size) {
        return next(new mongoose.Error.ValidatorError({ message: "Stat ID ภายในตัวละครต้องไม่ซ้ำกัน" }));
    }
  }

  next();
});

CharacterSchema.post<ICharacter>("save", async function (doc) {
  try {
    const NovelModel = models.Novel || model("Novel");
    await NovelModel.findByIdAndUpdate(doc.novelId, { $set: { lastContentUpdatedAt: new Date() } });
    // อาจจะต้องมี logic เพิ่มเติมในการอัปเดตจำนวนตัวละครใน Novel หรือข้อมูลสรุปอื่นๆ
  } catch (error) {
    console.error(`[CharacterMiddlewareError] Failed to update Novel after saving character ${doc._id}:`, error);
  }
});

CharacterSchema.post<mongoose.Query<ICharacter, ICharacter>>("findOneAndDelete", async function (doc) {
  const deletedDoc = doc as ICharacter | null;
  if (deletedDoc) {
    try {
      const NovelModel = models.Novel || model("Novel");
      await NovelModel.findByIdAndUpdate(deletedDoc.novelId, {
        $set: { lastContentUpdatedAt: new Date() },
        // $pull: { characterIds: deletedDoc._id } // ถ้า Novel model มี array ของ characterIds
      });
      // TODO: ควรมีการล้างข้อมูลที่เกี่ยวข้องกับตัวละครนี้ใน Scene, StoryMap, Choice ฯลฯ (Cascading delete logic)
    } catch (error) {
      console.error(`[CharacterMiddlewareError] Failed to update Novel after deleting character ${deletedDoc._id}:`, error);
    }
  }
});

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================
const CharacterModel = (models.Character as mongoose.Model<ICharacter>) || model<ICharacter>("Character", CharacterSchema);

export default CharacterModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Character Code Generation**: (คงเดิม) `characterCode` ควรมีระบบการสร้างที่ robust.
// 2.  **Relationships & Stats**: (ปรับปรุงแล้ว) `relationships` ยังคงอยู่, เพิ่ม `stats` สำหรับ Gameplay.
//     ความซับซ้อนของ `relationships` อาจย้ายไป StoryMap ถ้าจำเป็น. `stats` ควรเชื่อมโยงกับ `IDefinedStat` ใน StoryMap.
// 3.  **Donation Logic**: (ปรับปรุงแล้ว) `donationSettings` ได้รับการปรับปรุงเพื่อรวม `totalCoinsReceived` และ `totalRealMoneyReceived`
//     ซึ่งควรถูกอัปเดตโดย EarningTransaction service หรือ Donation service เมื่อมีการบริจาคสำเร็จ.
//     การเชื่อมโยงกับ `DonationApplication` จะช่วยในการจัดการการอนุมัติ.
// 4.  **VoiceActorInfo & PhysicalAttributes**: (เพิ่มใหม่) เพิ่มรายละเอียดเชิงลึกตามโจทย์.
// 5.  **DetailedBackstory**: (เพิ่มใหม่) หากจะรองรับ Rich Text หรือ Markdown, frontend editor และ renderer จะต้องสามารถจัดการได้.
// 6.  **PersonalityTraits**: (เพิ่มใหม่) เพิ่ม field ที่หลากหลายขึ้น สามารถขยายได้ตามต้องการ.
// 7.  **Consistency with Other Models**: การเปลี่ยนแปลงใน Character model อาจส่งผลต่อ Scene (ICharacterInScene), StoryMap (การอ้างอิงตัวละคร), และ Choice (เงื่อนไข/ผลลัพธ์ที่เกี่ยวกับตัวละคร).
// 8.  **Monetization Links**: การบริจาคให้ตัวละครจะถูกบันทึกใน Donation.ts และ EarningTransaction.ts.
//     Character.ts จะ denormalize ยอดรวมการบริจาคเพื่อการแสดงผล.
//     การตั้งค่า `donationSettings.isEnabled` ควรได้รับการอนุมัติผ่าน `DonationApplication.ts` ก่อน.
// 9.  **User Model (for Authors/Voice Actors)**: `authorId` และ `voiceActorInfo.sampleMediaId` (ถ้าผู้พากย์เป็น User) อ้างอิง User model.
// 10. **Flexibility for Writers**: การออกแบบให้มี optional fields จำนวนมาก ช่วยให้นักเขียนสามารถใส่รายละเอียดได้ตามต้องการโดยไม่บังคับ.
// 11. **Gamification - Stats**: `ICharacterStat` ถูกออกแบบให้ยืดหยุ่น, `statId` ควรจะ map กับ stat ที่กำหนดใน `StoryMap.gameMechanicsConfig.definedStats`
//     เพื่อให้ Game Engine สามารถจัดการค่าเหล่านี้ได้อย่างถูกต้อง.
// 12. **Comments and Thai Language**: คอมเมนต์ภาษาไทยถูกคงไว้และเพิ่มเติมตามมาตรฐานเดิม.
// 13. **Profile Image URL Virtual**: เปลี่ยนชื่อ virtual field เป็น `profileImageUrl` เพื่อความสอดคล้อง
// ==================================================================================================