// src/backend/models/Character.ts
// โมเดลสำหรับตัวละครใน Visual Novel (Character Model)

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Character
// ==================================================================================================

/**
 * @enum {string} CharacterRole
 * @description บทบาทของตัวละครในนิยาย
 * - `protagonist`: ตัวเอกหลัก
 * - `main_character`: ตัวละครหลัก (อาจมีหลายคน)
 * - `supporting_character`: ตัวละครสมทบ
 * - `minor_character`: ตัวละครรอง / ตัวประกอบ
 * - `antagonist`: ตัวร้ายหลัก
 * - `love_interest`: ตัวละครที่เป็นเป้าหมายความรัก (สำหรับเกมจีบหนุ่ม/จีบสาว)
 * - `narrator`: ผู้บรรยาย (ถ้าผู้บรรยายมีตัวตนเป็นตัวละคร)
 * - `cameo`: ตัวละครรับเชิญ
 */
export enum CharacterRole {
  PROTAGONIST = "protagonist",
  MAIN_CHARACTER = "main_character",
  SUPPORTING_CHARACTER = "supporting_character",
  MINOR_CHARACTER = "minor_character",
  ANTAGONIST = "antagonist",
  LOVE_INTEREST = "love_interest",
  NARRATOR = "narrator",
  CAMEO = "cameo",
}

/**
 * @enum {string} CharacterGender
 * @description เพศของตัวละคร (เพื่อให้มีความหลากหลายและครอบคลุม)
 * - `male`: ชาย
 * - `female`: หญิง
 * - `non_binary`: ไม่ระบุเพศ / เพศทางเลือก
 * - `agender`: ไม่มีเพศ
 * - `genderfluid`: เพศลื่นไหล
 * - `other`: อื่นๆ (ระบุเพิ่มเติม)
 * - `not_specified`: ไม่ต้องการระบุ
 */
export enum CharacterGender {
  MALE = "male",
  FEMALE = "female",
  NON_BINARY = "non_binary",
  AGENDER = "agender",
  GENDERFLUID = "genderfluid",
  OTHER = "other",
  NOT_SPECIFIED = "not_specified",
}

/**
 * @enum {string} CharacterAlignment
 * @description แนวคิด/อุดมการณ์ของตัวละคร (ถ้ามีระบบ Alignment)
 * มักใช้ในเกม RPG แต่สามารถประยุกต์ใช้เพื่อเพิ่มมิติให้ตัวละคร VN ได้
 * - `lawful_good`: ยึดมั่นคุณธรรมและกฎระเบียบ
 * - `neutral_good`: ทำดีโดยไม่ยึดติดกฎเกณฑ์
 * - `chaotic_good`: ทำดีตามใจตน ไม่สนกฎ
 * - `lawful_neutral`: ยึดถือกฎหมายเป็นหลัก ไม่สนดีชั่ว
 * - `true_neutral`: เป็นกลางอย่างแท้จริง
 * - `chaotic_neutral`: ทำตามใจตน ไม่สนดีชั่วหรือกฎหมาย
 * - `lawful_evil`: ทำชั่วอย่างมีแบบแผนและกฎเกณฑ์
 * - `neutral_evil`: ทำชั่วเพื่อผลประโยชน์ตน
 * - `chaotic_evil`: ทำชั่วตามสัญชาตญาณและความวุ่นวาย
 * - `unaligned`: ไม่มีแนวคิดที่ชัดเจน / สัตว์ / สิ่งไม่มีชีวิต
 */
export enum CharacterAlignment {
    LAWFUL_GOOD = "lawful_good",
    NEUTRAL_GOOD = "neutral_good",
    CHAOTIC_GOOD = "chaotic_good",
    LAWFUL_NEUTRAL = "lawful_neutral",
    TRUE_NEUTRAL = "true_neutral",
    CHAOTIC_NEUTRAL = "chaotic_neutral",
    LAWFUL_EVIL = "lawful_evil",
    NEUTRAL_EVIL = "neutral_evil",
    CHAOTIC_EVIL = "chaotic_evil",
    UNALIGNED = "unaligned",
}


// ==================================================================================================
// SECTION: อินเทอร์เฟซย่อย (Sub-Interfaces) และ Schemas ย่อยสำหรับข้อมูลเชิงลึกของตัวละคร
// ==================================================================================================

/**
 * @interface ICharacterExpression
 * @description การแสดงออกทางสีหน้า/อารมณ์ของตัวละคร
 * ประกอบด้วย ID ของ Media ที่ใช้ (อาจเป็นรูปภาพ sprite sheet หรือไฟล์แยก)
 */
export interface ICharacterExpression {
  expressionId: string; // ID ที่ผู้ใช้กำหนดเองสำหรับอ้างอิงใน Scene Editor (เช่น "happy", "sad_01")
  name: string; // ชื่อของการแสดงออก (เช่น "ยิ้ม", "ร้องไห้")
  description?: string; // คำอธิบายเพิ่มเติม (ถ้ามี)
  mediaId: Types.ObjectId; // ID ของ Media (รูปภาพ) ที่ใช้สำหรับการแสดงออกนี้
  mediaSourceType: "Media" | "OfficialMedia"; // แหล่งที่มาของ Media
  tags?: string[]; // Tags สำหรับการค้นหา (เช่น "positive", "subtle_smile")
}
const CharacterExpressionSchema = new Schema<ICharacterExpression>({
  expressionId: { type: String, required: [true, "Expression ID is required"], trim: true, index: true },
  name: { type: String, required: [true, "Expression name is required"], trim: true, maxlength: [100, "Expression name is too long"] },
  description: { type: String, trim: true, maxlength: [500, "Expression description is too long"] },
  mediaId: { type: Schema.Types.ObjectId, required: [true, "Media ID for expression is required"], refPath: 'expressions.mediaSourceType' },
  mediaSourceType: { type: String, enum: ["Media", "OfficialMedia"], required: true, alias: 'expressions.mediaSourceType' },
  tags: [{ type: String, trim: true, lowercase: true, maxlength: [50, "Expression tag is too long"] }],
}, { _id: false });


/**
 * @interface IPhysicalAttributes
 * @description (ใหม่) ลักษณะทางกายภาพของตัวละคร
 */
export interface IPhysicalAttributes {
  /** @description ส่วนสูง (เซนติเมตร) */
  heightCm?: number;
  /** @description น้ำหนัก (กิโลกรัม) */
  weightKg?: number;
  /** @description สีตา */
  eyeColor?: string;
  /** @description สีผม */
  hairColor?: string;
  /** @description ลักษณะเด่นอื่นๆ (เช่น รอยแผลเป็น, ไฝ, รอยสัก) */
  distinguishingFeatures?: string[];
  /** @description ลักษณะอายุที่ปรากฏ (เช่น "วัยรุ่นตอนต้น", "ราวๆ 20 ปี") */
  ageAppearance?: string;
}
const PhysicalAttributesSchema = new Schema<IPhysicalAttributes>({
  heightCm: { type: Number, min: 0, comment: "ส่วนสูง (เซนติเมตร)" },
  weightKg: { type: Number, min: 0, comment: "น้ำหนัก (กิโลกรัม)" },
  eyeColor: { type: String, trim: true, maxlength: [50, "สีตาสั้นเกินไป"] },
  hairColor: { type: String, trim: true, maxlength: [50, "สีผมสั้นเกินไป"] },
  distinguishingFeatures: [{ type: String, trim: true, maxlength: [150, "ลักษณะเด่นยาวเกินไป"] }],
  ageAppearance: { type: String, trim: true, maxlength: [100, "ลักษณะอายุที่ปรากฏยาวเกินไป"] },
}, { _id: false });


/**
 * @interface IPersonalityTraits
 * @description (ใหม่) ลักษณะนิสัยและบุคลิกภาพของตัวละคร
 */
export interface IPersonalityTraits {
  /** @description เป้าหมายในชีวิต/แรงจูงใจหลัก */
  goals?: string[];
  /** @description สิ่งที่กลัว/จุดอ่อนทางใจ */
  fears?: string[];
  /** @description จุดแข็ง/ความสามารถพิเศษ */
  strengths?: string[];
  /** @description จุดอ่อน/ข้อด้อย */
  weaknesses?: string[];
  /** @description แนวคิด/อุดมการณ์ (ถ้ามีระบบ Alignment) */
  alignment?: CharacterAlignment;
  /** @description คำอธิบายบุคลิกภาพโดยรวม (อาจเป็น MBTI, Enneagram หรือคำอธิบายอิสระ) */
  summary?: string;
  /** @description ลักษณะการพูดจา/น้ำเสียง */
  mannerOfSpeaking?: string;
  /** @description งานอดิเรก/สิ่งที่ชอบทำ */
  hobbies?: string[];
}
const PersonalityTraitsSchema = new Schema<IPersonalityTraits>({
  goals: [{ type: String, trim: true, maxlength: [255, "เป้าหมายยาวเกินไป"] }],
  fears: [{ type: String, trim: true, maxlength: [255, "สิ่งที่กลัวยาวเกินไป"] }],
  strengths: [{ type: String, trim: true, maxlength: [255, "จุดแข็งยาวเกินไป"] }],
  weaknesses: [{ type: String, trim: true, maxlength: [255, "จุดอ่อนยาวเกินไป"] }],
  alignment: { type: String, enum: Object.values(CharacterAlignment), comment: "แนวคิด/อุดมการณ์ของตัวละคร" },
  summary: { type: String, trim: true, maxlength: [2000, "คำอธิบายบุคลิกภาพยาวเกินไป"] },
  mannerOfSpeaking: { type: String, trim: true, maxlength: [500, "ลักษณะการพูดจายาวเกินไป"] },
  hobbies: [{ type: String, trim: true, maxlength: [100, "งานอดิเรกยาวเกินไป"] }],
}, { _id: false });


/**
 * @interface IVoiceActorInfo
 * @description (ใหม่) ข้อมูลนักพากย์ (ถ้ามี)
 */
export interface IVoiceActorInfo {
  /** @description ชื่อนักพากย์ */
  name?: string;
  /** @description ID ของ Media (เสียงตัวอย่าง) */
  sampleMediaId?: Types.ObjectId;
  /** @description แหล่งที่มาของ Media (เสียงตัวอย่าง) */
  sampleMediaSourceType?: "Media" | "OfficialMedia";
  /** @description หมายเหตุเพิ่มเติมเกี่ยวกับนักพากย์ หรือการพากย์เสียงตัวละครนี้ */
  notes?: string;
}
const VoiceActorInfoSchema = new Schema<IVoiceActorInfo>({
  name: { type: String, trim: true, maxlength: [150, "ชื่อนักพากย์ยาวเกินไป"] },
  sampleMediaId: { type: Schema.Types.ObjectId, refPath: 'voiceActorInfo.sampleMediaSourceType', comment: "ID ของเสียงตัวอย่าง" },
  sampleMediaSourceType: { type: String, enum: ["Media", "OfficialMedia"], alias: 'voiceActorInfo.sampleMediaSourceType' },
  notes: { type: String, trim: true, maxlength: [1000, "หมายเหตุนักพากย์ยาวเกินไป"] },
}, { _id: false });


/**
 * @interface ICharacterStatDefinition
 * @description (ใหม่) นิยามของค่าสถานะ/ทักษะพื้นฐานที่สามารถมีได้ในเกม
 * ตัว Character จะมี instance ของค่าสถานะเหล่านี้ (ICharacterStatInstance)
 */
export interface ICharacterStatDefinition extends Document {
    _id: Types.ObjectId;
    novelId: Types.ObjectId; // เพื่อให้ค่าสถานะเป็นแบบเฉพาะของแต่ละนิยาย
    statKey: string; // Unique key สำหรับอ้างอิง (e.g., "strength", "intelligence", "charisma_level")
    displayName: string; // ชื่อที่แสดงผล (e.g., "ความแข็งแกร่ง", "สติปัญญา", "ระดับเสน่ห์")
    description?: string;
    minValue?: number;
    maxValue?: number;
    defaultValue?: number;
    iconMediaId?: Types.ObjectId;
    iconMediaSourceType?: "Media" | "OfficialMedia";
    isVisibleToPlayer?: boolean; // ผู้เล่นสามารถเห็นค่าสถานะนี้ได้หรือไม่
    canBeModifiedBySystem?: boolean; // ระบบสามารถปรับเปลี่ยนค่านี้ได้หรือไม่ (เช่น จาก Scene Event, Choice)
    tags?: string[]; // สำหรับจัดกลุ่มหรือกรอง
    createdAt: Date;
    updatedAt: Date;
}
// CharacterStatDefinitionSchema จะถูกสร้างในไฟล์ของตัวเอง (e.g., CharacterStatDefinition.ts)
// ใน Character.ts เราจะอ้างอิงถึงมัน

/**
 * @interface ICharacterStatInstance
 * @description (ใหม่) ค่าสถานะ/ทักษะของตัวละครแต่ละตัว (อ้างอิงจาก ICharacterStatDefinition)
 */
export interface ICharacterStatInstance {
  /** @description ID ของ Stat Definition ที่ตัวละครนี้มี */
  statDefinitionId: Types.ObjectId; // Ref to CharacterStatDefinition
  /** @description ค่าปัจจุบันของสถานะนี้สำหรับตัวละคร */
  currentValue: number;
  /** @description ค่าสูงสุดเฉพาะตัวละครนี้ (ถ้ามีการ override จาก definition) */
  characterMaxValue?: number;
  /** @description ค่าต่ำสุดเฉพาะตัวละครนี้ (ถ้ามีการ override จาก definition) */
  characterMinValue?: number;
  /** @description หมายเหตุหรือข้อมูลเพิ่มเติมเกี่ยวกับสถานะนี้ของตัวละคร */
  notes?: string;
  /**
   * @description แหล่งที่มาของการเปลี่ยนแปลงล่าสุด (เช่น "initial", "choice_xyz", "scene_event_abc")
   * เพื่อช่วยในการ debug หรือแสดงผลว่าทำไมค่าสถานะถึงเป็นแบบนี้
   */
  lastModifiedSource?: string;
}
const CharacterStatInstanceSchema = new Schema<ICharacterStatInstance>({
  statDefinitionId: { type: Schema.Types.ObjectId, ref: "CharacterStatDefinition", required: true, comment: "ID ของ Stat Definition" },
  currentValue: { type: Number, required: true, comment: "ค่าปัจจุบันของสถานะ" },
  characterMaxValue: { type: Number, comment: "ค่าสูงสุดเฉพาะตัวละคร (ถ้ามี override)" },
  characterMinValue: { type: Number, comment: "ค่าต่ำสุดเฉพาะตัวละคร (ถ้ามี override)" },
  notes: { type: String, trim: true, maxlength: [500, "หมายเหตุสถานะตัวละครยาวเกินไป"] },
  lastModifiedSource: { type: String, trim: true, maxlength: [100, "แหล่งที่มาการเปลี่ยนแปลงล่าสุดยาวเกินไป"] },
}, { _id: false });



// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร Character (ICharacter Document Interface)
// ==================================================================================================
/**
 * @interface ICharacter
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารตัวละครใน Collection "characters"
 */
export interface ICharacter extends Document {
  _id: Types.ObjectId;
  novelId: Types.ObjectId; // ID ของนิยายที่ตัวละครนี้สังกัดอยู่
  name: string; // ชื่อตัวละคร (ที่ผู้เล่นเห็น)
  internalName?: string; // ชื่อภายในสำหรับผู้เขียน (ถ้าต้องการแยก)
  description?: string; // คำอธิบายสั้นๆ เกี่ยวกับตัวละคร
  role: CharacterRole; // บทบาทของตัวละครในเนื้อเรื่อง
  gender?: CharacterGender; // เพศของตัวละคร (ถ้ามีการระบุ)
  age?: number | string; // อายุ (อาจเป็นตัวเลข หรือข้อความเช่น "อมตะ", "ไม่ทราบ")
  defaultSpriteMediaId?: Types.ObjectId; // ID ของ Media ที่เป็น Sprite เริ่มต้น (ถ้ามี)
  defaultSpriteMediaSourceType?: "Media" | "OfficialMedia";
  expressions: Types.DocumentArray<ICharacterExpression>; // รายการการแสดงออกทางสีหน้า
  colorCode?: string; // สีประจำตัวละคร (สำหรับ UI เช่น สีกรอบคำพูด)
  tags?: string[]; // Tags สำหรับการค้นหาหรือจัดกลุ่มตัวละคร
  isPlayable?: boolean; // ตัวละครนี้ผู้เล่นสามารถควบคุมได้หรือไม่ (สำหรับบางเกม)
  isHiddenFromCastList?: boolean; // ซ่อนจากรายชื่อตัวละครที่แสดงให้ผู้เล่นเห็นหรือไม่ (เช่น ตัวละครลับ)

  // SECTION: ข้อมูลเชิงลึก (ใหม่) - Optional fields
  /** @description (ใหม่) ลักษณะทางกายภาพ */
  physicalAttributes?: IPhysicalAttributes;
  /** @description (ใหม่) ประวัติตัวละครโดยละเอียด (อาจรองรับ Markdown/Rich Text ในอนาคต) */
  detailedBackstory?: string;
  /** @description (ใหม่) ลักษณะนิสัยและบุคลิกภาพ */
  personalityTraits?: IPersonalityTraits;
  /** @description (ใหม่) ข้อมูลนักพากย์ (ถ้ามี) */
  voiceActorInfo?: IVoiceActorInfo;
  /** @description (ใหม่) ค่าสถานะ/ทักษะของตัวละคร (ถ้ามีระบบ Gameplay) */
  stats?: Types.DocumentArray<ICharacterStatInstance>;

  // SECTION: ความสัมพันธ์ (Relationships) - อาจจะแยกเป็น Model ใหม่ในอนาคตถ้าซับซ้อนมาก
  relationships?: {
    characterId: Types.ObjectId; // ID ของตัวละครอื่น
    relationshipType: string; // เช่น "เพื่อนสนิท", "ศัตรู", "คนรัก"
    affinityScore?: number; // ค่าความสัมพันธ์ (ถ้ามีระบบ)
    description?: string; // คำอธิบายความสัมพันธ์
  }[];

  customFields?: { [key: string]: any }; // field ที่ผู้ใช้กำหนดเอง (ถ้าต้องการความยืดหยุ่นสูง)
  authorNotes?: string; // หมายเหตุสำหรับผู้เขียนเท่านั้น
  createdAt: Date;
  updatedAt: Date;
  lastSceneAppearanceId?: Types.ObjectId; // ID ของ Scene ล่าสุดที่ตัวละครนี้ปรากฏ (สำหรับ tracking)
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ Character (CharacterSchema)
// ==================================================================================================
const CharacterSchema = new Schema<ICharacter>(
  {
    novelId: { type: Schema.Types.ObjectId, ref: "Novel", required: [true, "Novel ID is required for character"], index: true },
    name: { type: String, required: [true, "Character name is required"], trim: true, maxlength: [150, "Character name is too long"], index: true },
    internalName: { type: String, trim: true, maxlength: [150, "Internal character name is too long"] },
    description: { type: String, trim: true, maxlength: [2000, "Character description is too long"] },
    role: { type: String, enum: Object.values(CharacterRole), default: CharacterRole.MINOR_CHARACTER, required: true },
    gender: { type: String, enum: Object.values(CharacterGender), default: CharacterGender.NOT_SPECIFIED },
    age: { type: Schema.Types.Mixed, comment: "สามารถเป็นตัวเลข (ปี) หรือข้อความก็ได้" }, // Number or String
    defaultSpriteMediaId: { type: Schema.Types.ObjectId, refPath: 'defaultSpriteMediaSourceType' },
    defaultSpriteMediaSourceType: { type: String, enum: ["Media", "OfficialMedia"], alias: 'defaultSpriteMediaSourceType' },
    expressions: { type: [CharacterExpressionSchema], default: [] },
    colorCode: {
        type: String, trim: true, uppercase: true,
        validate: {
            validator: (v: string) => !v || /^#([0-9A-F]{3}){1,2}$/i.test(v) || /^[a-zA-Z]+$/.test(v), // Basic HEX or color name
            message: (props: any) => `${props.value} is not a valid color code (HEX or name)!`
        },
        maxlength: [50, "Color code is too long"]
    },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: [50, "Character tag is too long"] }],
    isPlayable: { type: Boolean, default: false },
    isHiddenFromCastList: { type: Boolean, default: false },

    // ข้อมูลเชิงลึก (ใหม่)
    physicalAttributes: { type: PhysicalAttributesSchema, required: false },
    detailedBackstory: { type: String, trim: false, maxlength: [100000, "Detailed backstory is too long"], required: false, comment: "อาจรองรับ Markdown/Rich Text ในอนาคต" }, // เพิ่ม maxlength
    personalityTraits: { type: PersonalityTraitsSchema, required: false },
    voiceActorInfo: { type: VoiceActorInfoSchema, required: false },
    stats: { type: [CharacterStatInstanceSchema], default: [], required: false },


    relationships: [{
      _id: false,
      characterId: { type: Schema.Types.ObjectId, ref: "Character", required: true },
      relationshipType: { type: String, trim: true, required: true, maxlength: [100, "Relationship type is too long"] },
      affinityScore: { type: Number },
      description: { type: String, trim: true, maxlength: [500, "Relationship description is too long"] },
    }],

    customFields: { type: Schema.Types.Map, of: Schema.Types.Mixed, default: {} },
    authorNotes: { type: String, trim: true, maxlength: [10000, "Author notes are too long"] },
    lastSceneAppearanceId: { type: Schema.Types.ObjectId, ref: "Scene", default: null },
  },
  {
    timestamps: true,
    toObject: { virtuals: true, aliases: true },
    toJSON: { virtuals: true, aliases: true },
    collection: "characters_v2", // เปลี่ยนชื่อ collection เป็น _v2 เพื่อรองรับการเปลี่ยนแปลงโครงสร้าง
  }
);

// ==================================================================================================
// SECTION: Indexes, Virtuals, Middleware
// ==================================================================================================

CharacterSchema.index({ novelId: 1, name: 1 }, { unique: true, name: "idx_character_novel_name_unique_v2" });
CharacterSchema.index({ novelId: 1, role: 1 }, { name: "idx_character_novel_role_v2" });
CharacterSchema.index({ novelId: 1, tags: 1 }, { name: "idx_character_novel_tags_v2" });
CharacterSchema.index({ novelId: 1, "expressions.expressionId": 1}, { name: "idx_character_expression_id_v2", sparse: true });
CharacterSchema.index({ name: "text", description: "text", "personalityTraits.summary": "text", tags: "text" }, { name: "idx_character_text_search_v2", default_language: "none" });

// Virtual for combined name and internal name (if internal name exists)
CharacterSchema.virtual('displayName').get(function(this: ICharacter) {
  return this.internalName ? `${this.name} (${this.internalName})` : this.name;
});


// Middleware
CharacterSchema.pre<ICharacter>("save", function (next: (err?: mongoose.Error) => void) {
  // ตรวจสอบ expressionId ซ้ำภายในตัวละครเดียวกัน
  if (this.expressions && this.expressions.length > 0) {
    const expressionIds = new Set<string>();
    for (const exp of this.expressions) {
      if (expressionIds.has(exp.expressionId)) {
        const err = new mongoose.Error.ValidatorError({ message: `Duplicate expressionId "${exp.expressionId}" found within character "${this.name}".` });
        return next(err);
      }
      expressionIds.add(exp.expressionId);
    }
  }

  // ตรวจสอบ statDefinitionId ซ้ำภายใน stats ของตัวละครเดียวกัน
  if (this.stats && this.stats.length > 0) {
      const statDefIds = new Set<string>();
      for (const statInstance of this.stats) {
          const statDefIdString = statInstance.statDefinitionId.toString();
          if (statDefIds.has(statDefIdString)) {
              const err = new mongoose.Error.ValidatorError({ message: `Duplicate statDefinitionId "${statDefIdString}" found in stats for character "${this.name}".`});
              return next(err);
          }
          statDefIds.add(statDefIdString);
      }
  }
  next();
});

// Middleware เพื่ออัปเดต novel's lastContentUpdatedAt timestamp เมื่อมีการเปลี่ยนแปลงข้อมูลตัวละคร
async function updateNovelTimestamp(character: ICharacter | null) {
  if (character && character.novelId) {
    try {
      const NovelModel = mongoose.models.Novel || mongoose.model("Novel");
      await NovelModel.findByIdAndUpdate(character.novelId, {
        $set: { lastContentUpdatedAt: new Date(), updatedAt: new Date() }
      });
    } catch (error) {
        const castedError = error as Error;
        console.error(`[CharacterMiddlewareError] Failed to update Novel timestamp for character ${character._id} in novel ${character.novelId}:`, castedError.message);
    }
  }
}

CharacterSchema.post<ICharacter>("save", async function (doc: ICharacter) {
  await updateNovelTimestamp(doc);
});

CharacterSchema.post<mongoose.Query<ICharacter | null, ICharacter>>("findOneAndUpdate", async function(result: ICharacter | null) {
  if (result) {
    await updateNovelTimestamp(result);
  }
});

CharacterSchema.post<mongoose.Query<ICharacter | null, ICharacter>>("findOneAndDelete", async function(doc: ICharacter | null) {
  if (doc) {
    await updateNovelTimestamp(doc);
    // TODO: อาจจะต้องมีการล้างข้อมูลตัวละครนี้ออกจาก Scenes, Choices, หรือส่วนอื่นๆ ที่อ้างอิงถึง
    // เช่น CharacterInSceneSchema ใน Scene.ts
    // หรือ relationships ใน Character อื่นๆ
  }
});


// ==================================================================================================
// SECTION: Model Export
// ==================================================================================================

const CharacterModel = (models.Character as mongoose.Model<ICharacter>) || model<ICharacter>("Character", CharacterSchema);

export default CharacterModel;


// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Expression Management**: `expressionId` ควร unique ภายใน character. การมี UI ที่ดีสำหรับจัดการ expressions และ sprites เป็นสิ่งสำคัญ.
// 2.  **Default Sprite**: การมี `defaultSpriteMediaId` ช่วยให้ง่ายต่อการแสดงตัวละครครั้งแรกในฉาก.
// 3.  **Relationships**: ระบบความสัมพันธ์ (`relationships`) ปัจจุบันเป็นแบบง่าย. หากต้องการความซับซ้อน (เช่น ค่าความสัมพันธ์ที่เปลี่ยนแปลงตามเนื้อเรื่อง, ประเภทความสัมพันธ์ที่หลากหลาย) อาจพิจารณาแยกเป็น Model ใหม่ และมี Service Layer สำหรับจัดการ.
// 4.  **Tags & Search**: `tags` ช่วยในการค้นหาและจัดหมวดหมู่.
// 5.  **Custom Fields**: `customFields` ให้ความยืดหยุ่นสูง แต่ต้องระมัดระวังในการ query และจัดการข้อมูล.
// 6.  **Internationalization (i18n)**: ชื่อ, คำอธิบาย, และข้อมูลอื่นๆ อาจจะต้องรองรับหลายภาษาในอนาคต.
// 7.  **Versioning**: การเปลี่ยนแปลงข้อมูลตัวละครสำคัญ (เช่น บทบาท, เนื้อเรื่องเบื้องหลัง) อาจต้องมีระบบ versioning หรือ audit log.
// 8.  **Integration with Scene/Choice**: Character ID จะถูกอ้างอิงใน Scene (ใครพูด, ใครปรากฏ) และ Choice (เงื่อนไขการแสดงตัวเลือก, ผลกระทบต่อความสัมพันธ์).
// 9.  **Performance**: สำหรับนิยายที่มีตัวละครจำนวนมาก, การ query และ populate ข้อมูลต้องมีประสิทธิภาพ. พิจารณา selective population.
// 10. **Physical Attributes, Backstory, Personality, Voice Actor Info (ใหม่)**: เพิ่ม field เหล่านี้เพื่อให้ผู้เขียนสามารถใส่รายละเอียดตัวละครได้ลึกซึ้งยิ่งขึ้น ทั้งหมดเป็น optional เพื่อไม่ให้เป็นภาระสำหรับผู้เขียนที่ไม่ต้องการรายละเอียดมากนัก
//     - `detailedBackstory` สามารถพัฒนาให้รองรับ Markdown หรือ Rich Text Editor ในอนาคตเพื่อการจัดรูปแบบที่สวยงาม
// 11. **Character Stats/Skills (ใหม่ - `ICharacterStatInstance`)**:
//     - เพิ่ม `stats` เป็น array ของ `ICharacterStatInstanceSchema`.
//     - `ICharacterStatInstance` จะอ้างอิงถึง `CharacterStatDefinition` (ซึ่งควรเป็น Model แยกต่างหาก กำหนดโดยผู้เขียนนิยายว่ามี stat อะไรบ้างในเรื่องนั้นๆ เช่น HP, MP, Strength, Charisma).
//     - การอ้างอิง models อื่นๆ (Scene, Novel, Choice):
//         - `Novel`: `CharacterStatDefinition` ควรผูกกับ `novelId` เพื่อให้แต่ละนิยายมีชุด stat ของตัวเอง.
//         - `Scene`: Event ใน Scene (`TimelineEventType.MODIFY_CHARACTER_STAT`) สามารถปรับเปลี่ยน `currentValue` ของ `ICharacterStatInstance` ได้.
//         - `Choice`: `ChoiceActionType.SET_CHARACTER_STAT` สามารถใช้ปรับค่า stat ตามการตัดสินใจของผู้เล่น.
//         - การแสดงผล stat อาจใช้ `StatusUIElement` ใน `Scene.ts` หรือ UI เฉพาะสำหรับ Character Sheet.
//     - การออกแบบนี้ช่วยให้มีความยืดหยุ่นสำหรับนิยายที่มีองค์ประกอบ Gameplay โดยไม่กระทบกับนิยายที่เน้นเนื้อเรื่องอย่างเดียว
// 12. **Alignment System**: เพิ่ม `CharacterAlignment` enum และ field `alignment` ใน `IPersonalityTraits` สำหรับนิยายที่ต้องการใช้ระบบนี้
// 13. **Collection Naming**: เปลี่ยนชื่อ collection เป็น `characters_v2` เพื่อบ่งบอกถึงการเปลี่ยนแปลงโครงสร้างข้อมูลที่สำคัญ. หากมีการ migrate ข้อมูลจากเวอร์ชันเก่า จะต้องมี script จัดการ.
// 14. **Data Integrity on Deletion**: การลบตัวละคร (findOneAndDelete) ควรพิจารณา cascading effects หรือการตั้งค่า null ในส่วนที่อ้างอิงถึงตัวละครนี้ (เช่นใน Scene, Choice, relationships ของตัวละครอื่น).
// 15. **Localization of Enums**: ค่า enum เช่น `CharacterRole`, `CharacterGender`, `CharacterAlignment` ปัจจุบันเป็นภาษาอังกฤษ หากต้องการแสดงผลใน UI เป็นภาษาไทย อาจต้องมี mapping layer หรือใช้ i18n library.
// ==================================================================================================