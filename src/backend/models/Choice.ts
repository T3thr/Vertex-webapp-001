// src/backend/models/Choice.ts
// โมเดลตัวเลือก (Choice Model)
// จัดการตัวเลือกที่ผู้เล่นสามารถเลือกได้ในฉากต่างๆ, เงื่อนไขการแสดงผล/ใช้งาน, และผลลัพธ์ (Actions) ของการเลือกนั้น
// เน้นการรองรับการวิเคราะห์อารมณ์และผลกระทบทางจิตวิทยา

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { SceneTransitionType } from "./Scene"; // Import enum จาก Scene

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Choice
// ==================================================================================================

/**
 * @enum {string} ChoiceActionType
 * @description ประเภทของการกระทำ (Action) ที่จะเกิดขึ้นเมื่อผู้เล่นเลือกตัวเลือก (Choice)
 * - `go_to_scene`: ไปยังฉากที่กำหนด
 * - `set_story_variable`: ตั้งค่าตัวแปรใน StoryMap (เช่น ค่าสถานะ, flag ของเนื้อเรื่องโดยรวม)
 * - `set_character_variable`: ตั้งค่าตัวแปรเฉพาะของตัวละคร (เช่น ค่าความรู้สึก, สถานะพิเศษ)
 * - `update_relationship_value`: อัปเดตค่าความสัมพันธ์ระหว่างตัวละครใน StoryMap
 * - `unlock_achievement`: ปลดล็อก Achievement ให้กับผู้เล่น
 * - `play_sound_effect`: เล่นเสียงประกอบ (SFX)
 * - `play_background_music`: เล่น/เปลี่ยนเพลงประกอบฉาก (BGM)
 * - `play_voice_over`: เล่นเสียงพากย์
 * - `show_media_element`: แสดงองค์ประกอบสื่อ (เช่น CG, ภาพประกอบพิเศษ, วิดีโอสั้นๆ)
 * - `hide_media_element`: ซ่อนองค์ประกอบสื่อที่แสดงอยู่
 * - `add_item_to_inventory`: เพิ่มไอเทมเข้าช่องเก็บของผู้เล่น (ถ้ามีระบบ inventory)
 * - `remove_item_from_inventory`: ลบไอเทมออกจากช่องเก็บของผู้เล่น
 * - `modify_player_stats`: ปรับค่าสถานะของผู้เล่น (ถ้ามีระบบ RPG)
 * - `trigger_screen_effect`: แสดงเอฟเฟกต์บนหน้าจอ (เช่น สั่น, แฟลช)
 * - `end_novel_branch`: จบเนื้อเรื่องในแขนงนั้นๆ (อาจนำไปสู่ Ending หรือบทสรุปย่อย)
 * - `custom_script`: รันสคริปต์ที่ผู้เขียนกำหนดเอง (สำหรับ logic ที่ซับซ้อน, ควรใช้ด้วยความระมัดระวัง)
 * - `wait_action`: หน่วงเวลาก่อนทำ action ถัดไป (ถ้ามีหลาย actions ต่อเนื่อง)
 * - `display_notification`: แสดงข้อความแจ้งเตือนบนหน้าจอ (เช่น "ได้รับไอเทม X", "ความสัมพันธ์กับ Y เปลี่ยนแปลง")
 */
export enum ChoiceActionType {
  GO_TO_SCENE = "go_to_scene",
  SET_STORY_VARIABLE = "set_story_variable",
  SET_CHARACTER_VARIABLE = "set_character_variable",
  UPDATE_RELATIONSHIP_VALUE = "update_relationship_value",
  UNLOCK_ACHIEVEMENT = "unlock_achievement",
  PLAY_SOUND_EFFECT = "play_sound_effect",
  PLAY_BACKGROUND_MUSIC = "play_background_music",
  PLAY_VOICE_OVER = "play_voice_over",
  SHOW_MEDIA_ELEMENT = "show_media_element",
  HIDE_MEDIA_ELEMENT = "hide_media_element",
  ADD_ITEM_TO_INVENTORY = "add_item_to_inventory",
  REMOVE_ITEM_FROM_INVENTORY = "remove_item_from_inventory",
  MODIFY_PLAYER_STATS = "modify_player_stats",
  TRIGGER_SCREEN_EFFECT = "trigger_screen_effect",
  END_NOVEL_BRANCH = "end_novel_branch",
  CUSTOM_SCRIPT = "custom_script",
  WAIT_ACTION = "wait_action",
  DISPLAY_NOTIFICATION = "display_notification",
}

/**
 * @interface IChoiceAction
 * @description การกระทำ (Action) หนึ่งอย่างที่จะเกิดขึ้นเมื่อผู้เล่นเลือกตัวเลือกนี้
 * @property {string} actionId - ID เฉพาะของ action นี้ภายใน choice (เพื่อให้แก้ไข/อ้างอิงได้ง่าย)
 * @property {ChoiceActionType} type - ประเภทของ Action
 * @property {any} parameters - พารามิเตอร์สำหรับ Action นี้ (โครงสร้างจะขึ้นอยู่กับ `type`)
 *    - `go_to_scene`: { targetSceneId: Types.ObjectId, transitionType?: SceneTransitionType, transitionDurationMs?: number }
 *    - `set_story_variable`: { variableName: string, value: any, operation?: "set" | "add" | "subtract" }
 *    - `set_character_variable`: { characterId: Types.ObjectId, variableName: string, value: any, operation?: "set" | "add" | "subtract" }
 *    - `update_relationship_value`: { character1Id: Types.ObjectId, character2Id: Types.ObjectId, changeValue: number, absoluteValue?: number }
 *    - `unlock_achievement`: { achievementId: Types.ObjectId }
 *    - `play_sound_effect` / `play_background_music` / `play_voice_over`: { mediaId: Types.ObjectId, mediaSourceType: "Media" | "OfficialMedia", volume?: number, loop?: boolean }
 *    - `show_media_element`: { mediaId: Types.ObjectId, mediaSourceType: "Media" | "OfficialMedia", instanceId?: string, transform?: ITransform, durationMs?: number }
 *    - `hide_media_element`: { instanceId: string } // instanceId ของ media ที่จะซ่อน
 *    - `add_item_to_inventory` / `remove_item_from_inventory`: { itemId: string, quantity?: number }
 *    - `modify_player_stats`: { statName: string, changeValue: number, operation?: "set" | "add" | "subtract" }
 *    - `trigger_screen_effect`: { effectName: string, durationMs?: number, intensity?: number }
 *    - `end_novel_branch`: { endingId?: Types.ObjectId, outcomeDescription?: string }
 *    - `custom_script`: { scriptContent: string }
 *    - `wait_action`: { durationMs: number }
 *    - `display_notification`: { message: string, notificationType?: "info" | "success" | "warning" | "error", durationMs?: number }
 * @property {string} [conditionScript] - Script เงื่อนไข (JavaScript expression) ที่ต้องเป็นจริงเพื่อให้ Action นี้ทำงาน (ถ้าไม่ระบุคือทำงานเสมอ)
 * @property {string} [notes] - หมายเหตุสำหรับ Action นี้ (สำหรับ Editor)
 */
export interface IChoiceAction {
  actionId: string;
  type: ChoiceActionType;
  parameters: any; 
  conditionScript?: string;
  notes?: string;
}
const ChoiceActionSchema = new Schema<IChoiceAction>(
  {
    actionId: { type: String, required: [true, "Action ID is required"], trim: true, maxlength: [100, "Action ID is too long"] },
    type: { type: String, enum: Object.values(ChoiceActionType), required: [true, "Action type is required"] },
    parameters: { type: Schema.Types.Mixed, required: [true, "Action parameters are required"] },
    conditionScript: { type: String, trim: true, maxlength: [5000, "Condition script is too long"] },
    notes: { type: String, trim: true, maxlength: [1000, "Action notes are too long"] },
  },
  { _id: false }
);

/**
 * @interface IChoiceCondition
 * @description เงื่อนไขที่ซับซ้อนสำหรับการแสดงผลหรือเปิดใช้งานตัวเลือก
 * @property {"all" | "any"} logicOperator - ตัวดำเนินการตรรกะสำหรับกลุ่มเงื่อนไข ("all" = AND, "any" = OR)
 * @property {IConditionItem[]} conditions - รายการเงื่อนไขย่อย
 */
export interface IChoiceConditionGroup {
  logicOperator: "all" | "any";
  conditions: IConditionItem[];
}
const ChoiceConditionGroupSchema = new Schema<IChoiceConditionGroup>(
  {
    logicOperator: { type: String, enum: ["all", "any"], required: true },
    conditions: [{ type: Schema.Types.Mixed, required: true }], // จะระบุ IConditionItem ด้านล่าง
  },
  { _id: false }
);

/**
 * @interface IConditionItem
 * @description เงื่อนไขเดี่ยวสำหรับการตรวจสอบ (เช่น ค่าตัวแปร, ไอเทมใน inventory, achievement ที่ปลดล็อก)
 * @property {"story_variable" | "character_variable" | "relationship_value" | "has_item" | "has_achievement" | "previous_choice_selected" | "custom_script"} type - ประเภทของเงื่อนไข
 * @property {any} parameters - พารามิเตอร์สำหรับเงื่อนไข (โครงสร้างขึ้นอยู่กับ `type`)
 *    - `story_variable`: { variableName: string, operator: string, value: any }
 *    - `character_variable`: { characterId: Types.ObjectId, variableName: string, operator: string, value: any }
 *    - `relationship_value`: { character1Id: Types.ObjectId, character2Id: Types.ObjectId, operator: string, value: number }
 *    - `has_item`: { itemId: string, quantity?: number, operator?: ">=" | "<=" | "==" }
 *    - `has_achievement`: { achievementId: Types.ObjectId, unlocked: boolean }
 *    - `previous_choice_selected`: { choiceId: Types.ObjectId, sceneId?: Types.ObjectId }
 *    - `custom_script`: { scriptContent: string } // คืนค่า true/false
 */
export interface IConditionItem {
  type: "story_variable" | "character_variable" | "relationship_value" | "has_item" | "has_achievement" | "previous_choice_selected" | "custom_script";
  parameters: any;
}
// เนื่องจาก IConditionItem ใช้ใน ChoiceConditionGroupSchema.conditions ที่เป็น Mixed, ไม่ต้องสร้าง Schema แยกสำหรับ IConditionItem โดยตรง
// แต่ควรมีการ validate โครงสร้างของ parameters ใน service layer หรือ pre-save hook

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร Choice (IChoice Document Interface)
// ==================================================================================================

/**
 * @interface IChoice
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารตัวเลือกใน Collection "choices"
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสารตัวเลือก
 * @property {Types.ObjectId} novelId - ID ของนิยายที่ตัวเลือกนี้เป็นส่วนหนึ่ง (อ้างอิง Novel model, **สำคัญมาก**)
 * @property {Types.ObjectId} authorId - ID ของผู้สร้างตัวเลือกนี้ (อ้างอิง User model, โดยทั่วไปคือผู้เขียนนิยาย)
 * @property {string} choiceCode - รหัสเฉพาะของตัวเลือก (เช่น "CHOICE_001_A", ใช้ภายในระบบ Editor หรือ Scripting, **ควร unique ภายใน novelId หรือ sceneId ที่มันปรากฏ**)
 * @property {string} text - ข้อความที่แสดงให้ผู้เล่นเห็นสำหรับตัวเลือกนี้ (รองรับ Markdown หรือ BBCode พื้นฐาน)
 * @property {string} [hoverText] - ข้อความเพิ่มเติมที่จะแสดงเมื่อผู้เล่นนำเมาส์ไปวางเหนือตัวเลือก (tooltip)
 * @property {IChoiceConditionGroup} [displayConditions] - กลุ่มเงื่อนไขที่ต้องเป็นจริงทั้งหมดเพื่อให้ตัวเลือกนี้ "แสดงผล" บนหน้าจอ
 * @property {IChoiceConditionGroup} [enableConditions] - กลุ่มเงื่อนไขที่ต้องเป็นจริงทั้งหมดเพื่อให้ตัวเลือกนี้ "สามารถเลือกได้" (ถ้าแสดงผลแต่เลือกไม่ได้ จะเป็นสีเทา)
 * @property {string} [disabledReasonText] - ข้อความที่จะแสดงหากตัวเลือกถูก disable (เช่น "คุณยังไม่มีไอเทม X", "ค่าความกล้าหาญไม่พอ")
 * @property {Types.DocumentArray<IChoiceAction>} actions - รายการการกระทำ (Actions) ที่จะเกิดขึ้นตามลำดับเมื่อผู้เล่นเลือกตัวเลือกนี้
 * @property {number} [costCoins] - จำนวนเหรียญ (สกุลเงินในเกม) ที่ต้องใช้เพื่อเลือกตัวเลือกนี้ (0 คือฟรี)
 * @property {Types.ObjectId} [requiredItemId] - ID ของไอเทมที่ต้องมีเพื่อเลือกตัวเลือกนี้ (ถ้ามี, จะถูกใช้ไป)
 * @property {boolean} isMajorChoice - ตัวเลือกนี้เป็นการตัดสินใจสำคัญที่ส่งผลต่อเนื้อเรื่องหลักหรือไม่
 * @property {boolean} isTimedChoice - ตัวเลือกนี้มีเวลาจำกัดในการเลือกหรือไม่
 * @property {number} [timeLimitSeconds] - ระยะเวลา (วินาที) ที่ให้ในการเลือก (ถ้า isTimedChoice เป็น true)
 * @property {Types.ObjectId} [defaultActionChoiceIdOnTimeout] - ID ของ Choice ที่จะถูกเลือกอัตโนมัติหากหมดเวลา (ถ้า isTimedChoice)
 * @property {string[]} [associatedEmotionTags] - แท็กอารมณ์ที่เกี่ยวข้องกับตัวเลือกนี้ (ผู้เขียนกำหนด หรือ AI ช่วย tag, เช่น "กล้าหาญ", "เห็นแก่ตัว", "รอบคอบ") **สำคัญสำหรับการวิเคราะห์สุขภาพจิต**
 * @property {number} [psychologicalImpactScore] - คะแนนผลกระทบทางจิตวิทยา (ผู้เขียนกำหนด หรือ AI คำนวณ, อาจเป็นค่าบวก/ลบ หรือ scale อื่นๆ) **สำคัญสำหรับการวิเคราะห์สุขภาพจิต**
 * @property {string} [feedbackTextAfterSelection] - ข้อความตอบกลับสั้นๆ ที่จะแสดงทันทีหลังจากผู้เล่นเลือกตัวเลือกนี้ (เช่น "คุณเลือกที่จะช่วยเขา", "การตัดสินใจนี้จะส่งผลในอนาคต")
 * @property {string} [editorNotes] - หมายเหตุสำหรับผู้เขียน/ทีมงาน (ไม่แสดงผลในเกม)
 * @property {boolean} isArchived - ตัวเลือกนี้ถูกเก็บเข้าคลัง (ไม่ใช้งานแล้ว) หรือไม่
 * @property {Date} createdAt - วันที่สร้างเอกสารตัวเลือก (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตเอกสารตัวเลือกล่าสุด (Mongoose `timestamps`)
 */
export interface IChoice extends Document {
  _id: Types.ObjectId;
  novelId: Types.ObjectId;
  authorId: Types.ObjectId;
  choiceCode: string;
  text: string;
  hoverText?: string;
  displayConditions?: IChoiceConditionGroup;
  enableConditions?: IChoiceConditionGroup;
  disabledReasonText?: string;
  actions: Types.DocumentArray<IChoiceAction>;
  costCoins?: number;
  requiredItemId?: Types.ObjectId; // อ้างอิง Item model (ถ้ามี)
  isMajorChoice?: boolean;
  isTimedChoice?: boolean;
  timeLimitSeconds?: number;
  defaultActionChoiceIdOnTimeout?: Types.ObjectId; // อ้างอิง Choice ตัวเอง
  associatedEmotionTags?: string[];
  psychologicalImpactScore?: number;
  feedbackTextAfterSelection?: string;
  editorNotes?: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ Choice (ChoiceSchema)
// ==================================================================================================
const ChoiceSchema = new Schema<IChoice>(
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
      required: [true, "กรุณาระบุ ID ของผู้สร้างตัวเลือก (Author ID is required)"],
      index: true,
    },
    choiceCode: {
      type: String,
      required: [true, "กรุณาระบุรหัสตัวเลือก (Choice code is required)"],
      trim: true,
      uppercase: true,
      maxlength: [100, "รหัสตัวเลือกยาวเกินไป"],
      // unique ควรจะ unique ภายใน novelId หรือ sceneId ที่มันปรากฏ (จัดการใน service layer หรือ compound index ถ้าจำเป็น)
    },
    text: {
      type: String,
      required: [true, "กรุณาระบุข้อความของตัวเลือก (Choice text is required)"],
      trim: true,
      maxlength: [500, "ข้อความตัวเลือกยาวเกินไป (ไม่ควรเกิน 500 ตัวอักษร)"],
    },
    hoverText: { type: String, trim: true, maxlength: [255, "Hover text is too long"] },
    displayConditions: { type: ChoiceConditionGroupSchema },
    enableConditions: { type: ChoiceConditionGroupSchema },
    disabledReasonText: { type: String, trim: true, maxlength: [200, "Disabled reason text is too long"] },
    actions: {
      type: [ChoiceActionSchema],
      validate: {
        validator: function (v: any[]) { return v && v.length > 0; },
        message: "ต้องมีอย่างน้อยหนึ่ง action สำหรับตัวเลือก (At least one action is required for a choice)",
      },
    },
    costCoins: { type: Number, min: 0, default: 0 },
    requiredItemId: { type: Schema.Types.ObjectId, ref: "Item" }, // TODO: สร้าง Item model ถ้าจำเป็น
    isMajorChoice: { type: Boolean, default: false, index: true },
    isTimedChoice: { type: Boolean, default: false },
    timeLimitSeconds: { type: Number, min: 1 },
    defaultActionChoiceIdOnTimeout: { type: Schema.Types.ObjectId, ref: "Choice" },
    associatedEmotionTags: [{ type: String, trim: true, lowercase: true, maxlength: [50, "Emotion tag is too long"] }],
    psychologicalImpactScore: { type: Number }, // อาจจะไม่มี default, ให้ผู้เขียนกำหนด หรือ AI คำนวณ
    feedbackTextAfterSelection: { type: String, trim: true, maxlength: [500, "Feedback text is too long"] },
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

// Index สำหรับการ query ทั่วไปตาม novelId และสถานะ archived
ChoiceSchema.index(
  { novelId: 1, isArchived: 1 },
  { name: "NovelActiveChoicesIndex" }
);

// Index สำหรับค้นหาตาม choiceCode ภายใน novel (ถ้า choiceCode ต้อง unique ภายใน novel)
ChoiceSchema.index(
  { novelId: 1, choiceCode: 1 },
  { unique: true, name: "NovelChoiceCodeUniqueIndex" }
);
// **หมายเหตุ**: ถ้า choiceCode ไม่จำเป็นต้อง unique ทั่วทั้ง novel แต่ unique ภายใน scene/choice group, index นี้อาจจะไม่จำเป็น หรือต้องปรับ

// Index สำหรับค้นหาตาม emotion tags (สำคัญสำหรับการวิเคราะห์)
ChoiceSchema.index(
  { novelId: 1, associatedEmotionTags: 1 },
  { name: "ChoiceEmotionTagsIndex" }
);

// Index สำหรับค้นหา major choices
ChoiceSchema.index(
  { novelId: 1, isMajorChoice: 1 },
  { name: "NovelMajorChoicesIndex" }
);

// Text index สำหรับค้นหาข้อความในตัวเลือก (ถ้าจำเป็น)
ChoiceSchema.index(
  { text: "text", hoverText: "text" },
  { name: "ChoiceTextSearchIndex" }
);

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

// Middleware: ก่อนบันทึก (save)
ChoiceSchema.pre<IChoice>("save", async function (next) {
  // 1. ตรวจสอบความถูกต้องของ Actions
  if (this.isModified("actions")) {
    for (const action of this.actions) {
      // ตัวอย่างการ validate parameters ของ action (ควรทำให้ครอบคลุมกว่านี้)
      if (action.type === ChoiceActionType.GO_TO_SCENE && !action.parameters?.targetSceneId) {
        return next(new Error(`Action "${action.actionId}": Target Scene ID is required for go_to_scene action.`));
      }
      if (action.type === ChoiceActionType.SET_STORY_VARIABLE && (!action.parameters?.variableName || action.parameters?.value === undefined)) {
        return next(new Error(`Action "${action.actionId}": Variable name and value are required for set_story_variable action.`));
      }
      // เพิ่ม validation สำหรับ action types อื่นๆ ตามความเหมาะสม
    }
  }

  // 2. ตรวจสอบ Timed Choice
  if (this.isTimedChoice && (!this.timeLimitSeconds || this.timeLimitSeconds <= 0)) {
    return next(new Error("Time limit (seconds) must be a positive number for a timed choice."));
  }
  if (!this.isTimedChoice) {
    this.timeLimitSeconds = undefined;
    this.defaultActionChoiceIdOnTimeout = undefined;
  }

  // 3. ตรวจสอบ costCoins
  if (this.costCoins && this.costCoins < 0) {
    this.costCoins = 0;
  }

  // 4. ตรวจสอบความ unique ของ actionId ภายใน choice
  if (this.isModified("actions") && this.actions && this.actions.length > 0) {
    const actionIds = this.actions.map(act => act.actionId);
    const uniqueActionIds = new Set(actionIds);
    if (actionIds.length !== uniqueActionIds.size) {
      return next(new Error("รหัส Action ID ภายในตัวเลือกต้องไม่ซ้ำกัน (Action IDs must be unique within a choice)."));
    }
  }

  // 5. Validate โครงสร้างของ displayConditions และ enableConditions (ถ้ามี)
  // การ validate โครงสร้างของ IConditionItem.parameters อาจจะซับซ้อนและควรทำอย่างละเอียด
  // ตัวอย่างง่ายๆ:
  const validateConditionGroup = (group: IChoiceConditionGroup | undefined, groupName: string): mongoose.Error | null => {
    if (!group) return null;
    if (!group.conditions || group.conditions.length === 0) {
      return new Error(`${groupName} must have at least one condition if the group is defined.`);
    }
    for (const condition of group.conditions) {
      if (!condition.type || !condition.parameters) {
        return new Error(`Invalid condition structure in ${groupName}. Type and parameters are required.`);
      }
      // TODO: Add more specific validation for each condition.type and its parameters
    }
    return null;
  };

  let validationError = validateConditionGroup(this.displayConditions, "Display Conditions");
  if (validationError) return next(validationError);
  validationError = validateConditionGroup(this.enableConditions, "Enable Conditions");
  if (validationError) return next(validationError);

  next();
});

// Middleware: หลังจากบันทึก (save) หรือลบ เพื่ออัปเดตข้อมูลใน Novel หรือ Scene ที่เกี่ยวข้อง
ChoiceSchema.post<IChoice>("save", async function (doc) {
  try {
    const NovelModel = models.Novel || model("Novel");
    // อัปเดต lastContentUpdatedAt ของ Novel
    await NovelModel.findByIdAndUpdate(doc.novelId, { $set: { lastContentUpdatedAt: new Date() } });

    // **เพิ่มเติม**: หาก Choice นี้ถูกใช้ใน Scene ใดๆ อาจจะต้องมีการอัปเดต Scene นั้นๆ ด้วย
    // เช่น ถ้า Choice นี้เป็นส่วนหนึ่งของ ChoiceGroupInScene ใน Scene.ts
    // การจัดการความสัมพันธ์นี้อาจจะซับซ้อนและควรทำใน service layer
  } catch (error) {
    console.error(`[ChoiceMiddlewareError] Failed to update Novel after saving choice ${doc._id}:`, error);
  }
});

// Middleware: หลังจากลบเอกสาร (findOneAndDelete)
ChoiceSchema.post<mongoose.Query<IChoice, IChoice>>("findOneAndDelete", async function (doc) {
  // ตรวจสอบว่า doc เป็น IChoice และมี _id
  if (doc && "modifiedCount" in doc === false && "_id" in doc) {
    try {
      const NovelModel = models.Novel || model("Novel");
      await NovelModel.findByIdAndUpdate((doc as IChoice).novelId, {
        $set: { lastContentUpdatedAt: new Date() },
      });

      // **เพิ่มเติม**: ควรล้างการอ้างอิงถึง Choice นี้ออกจาก Scene หรือ StoryMap ที่เกี่ยวข้อง
      // เช่น หาก Scene มี array ของ choiceIds, ควร $pull doc._id ออก
      // การทำ cascading delete/update ควรจัดการใน service layer เพื่อความถูกต้องและป้องกัน error
    } catch (error) {
      console.error(`[ChoiceMiddlewareError] Failed to update Novel after deleting choice ${doc._id}:`, error);
    }
  }
});

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

// ตรวจสอบว่า Model "Choice" ถูกสร้างไปแล้วหรือยัง ถ้ายัง ให้สร้าง Model ใหม่
const ChoiceModel = (models.Choice as mongoose.Model<IChoice>) || model<IChoice>("Choice", ChoiceSchema);

export default ChoiceModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Choice Code Uniqueness**: `choiceCode` ควรมีกลยุทธ์การสร้างและบังคับความ unique ที่ชัดเจน (เช่น unique ภายใน Novel หรือ unique ภายใน Scene/Choice Group ที่มันปรากฏ).
// 2.  **Condition Engine**: `displayConditions` และ `enableConditions` รวมถึง `IConditionItem` ต้องการ Condition Engine ที่ robust ในฝั่ง backend เพื่อประมวลผลเงื่อนไขเหล่านี้ได้อย่างถูกต้องและมีประสิทธิภาพ.
// 3.  **Action Parameters Validation**: `parameters` ใน `IChoiceAction` เป็น `Schema.Types.Mixed` ซึ่งยืดหยุ่นแต่ขาด type safety ควรมีการ validate โครงสร้างของ parameters สำหรับแต่ละ `ChoiceActionType` อย่างเข้มงวดใน pre-save hook หรือ service layer.
// 4.  **Item Model**: `requiredItemId` อ้างอิง "Item" model ซึ่งยังไม่ได้สร้าง หากระบบมี inventory หรือ item ที่ใช้แล้วหมดไป จะต้องสร้าง Item model และจัดการ logic ที่เกี่ยวข้อง.
// 5.  **Integration with Scene Editor**: การออกแบบ Choice model ควรคำนึงถึงการใช้งานใน Scene Editor เช่น การสร้าง/แก้ไข choice, การกำหนด actions และ conditions, การ link ไปยัง scene อื่นๆ.
// 6.  **Psychological Impact Analysis**: `associatedEmotionTags` และ `psychologicalImpactScore` เป็น field สำคัญสำหรับการวิเคราะห์ ควรมีแนวทางที่ชัดเจนสำหรับผู้เขียนในการกำหนดค่าเหล่านี้ หรือมีระบบ AI ช่วยแนะนำ.
// 7.  **Complex Choice Structures**: สำหรับโครงสร้างตัวเลือกที่ซับซ้อนมาก (เช่น choice tree ภายใน choice) อาจจะต้องพิจารณา sub-choices หรือการออกแบบที่ซับซ้อนกว่านี้.
// 8.  **Localization (i18n)**: ข้อความต่างๆ (`text`, `hoverText`, `disabledReasonText`, `feedbackTextAfterSelection`) อาจจะต้องรองรับหลายภาษา.
// 9.  **Performance**: สำหรับนิยายที่มี choices และ conditions จำนวนมาก การ query และประมวลผลเงื่อนไขต้องมีประสิทธิภาพ.
// 10. **Action Execution Order**: `actions` เป็น array ซึ่งโดยทั่วไปจะทำงานตามลำดับ ควรระบุให้ชัดเจนและมี action type เช่น `wait_action` หากต้องการหน่วงเวลาระหว่าง actions.
// ==================================================================================================

