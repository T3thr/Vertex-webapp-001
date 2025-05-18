// src/backend/models/Choice.ts
// โมเดลตัวเลือก (Choice Model)
// จัดการตัวเลือกที่ผู้เล่นสามารถเลือกได้ในฉากต่างๆ, เงื่อนไขการแสดงผล/ใช้งาน, และผลลัพธ์ (Actions) ของการเลือกนั้น
// เน้นการรองรับการวิเคราะห์อารมณ์และผลกระทบทางจิตวิทยา และการทำงานร่วมกับ StoryMap.
// อัปเดตตามคำแนะนำ: ปรับปรุงการเชื่อมโยงกับ StoryMap, Scene และ Novel.

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
// ไม่จำเป็นต้อง import SceneTransitionType จาก Scene.ts ถ้า action parameters ของ go_to_scene เก็บเป็น string
// แต่ถ้าต้องการ type safety ที่เข้มงวด อาจจะ import และใช้ enum โดยตรง

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Choice
// ==================================================================================================

/**
 * @enum {string} ChoiceActionType
 * @description ประเภทของการกระทำ (Action) ที่จะเกิดขึ้นเมื่อผู้เล่นเลือกตัวเลือก (Choice)
 * (รายละเอียด Enum เหมือนเดิม แต่เพิ่มตัวอย่างการใช้งาน)
 * - `go_to_node`: ไปยังโหนดที่กำหนดใน StoryMap (เปลี่ยนจาก go_to_scene)
 * - `set_story_variable`: ตั้งค่าตัวแปรใน StoryMap (จาก IStoryMap.storyVariables)
 * - `unlock_achievement`: ปลดล็อก Achievement ให้กับผู้เล่น (อ้างอิง Achievement model)
 * - `play_sound_effect`: เล่นเสียงประกอบ (SFX) (อ้างอิง Media หรือ OfficialMedia model)
 * - `add_item_to_inventory`: เพิ่มไอเทมเข้าช่องเก็บของผู้เล่น (อ้างอิง Item model, ถ้ามี)
 * - `modify_player_stat`: ปรับค่าสถานะของผู้เล่น (จาก StoryMap.gameMechanicsConfig.definedStats)
 * - `trigger_story_event`: กระตุ้นเหตุการณ์ใน StoryMap (อาจเป็น custom event ที่ StoryMap Engine จัดการ)
 * - `update_relationship`: อัปเดตค่าความสัมพันธ์ (จาก StoryMap.gameMechanicsConfig.definedRelationships)
 * - `end_novel_branch`: จบเนื้อเรื่องในแขนงนั้นๆ (อาจเชื่อมไป EndingNode ใน StoryMap)
 * - `custom_script`: รันสคริปต์ที่ผู้เขียนกำหนดเอง
 * - `display_notification`: แสดงข้อความแจ้งเตือนบนหน้าจอ
 * - `wait`: หน่วงเวลาก่อนทำ action ถัดไป
 */
export enum ChoiceActionType {
  GO_TO_NODE = "go_to_node", // เปลี่ยนจาก GO_TO_SCENE
  SET_STORY_VARIABLE = "set_story_variable",
  UNLOCK_ACHIEVEMENT = "unlock_achievement",
  PLAY_SOUND_EFFECT = "play_sound_effect",
  ADD_ITEM_TO_INVENTORY = "add_item_to_inventory",
  MODIFY_PLAYER_STAT = "modify_player_stat",
  TRIGGER_STORY_EVENT = "trigger_story_event",
  UPDATE_RELATIONSHIP = "update_relationship",
  END_NOVEL_BRANCH = "end_novel_branch",
  CUSTOM_SCRIPT = "custom_script",
  DISPLAY_NOTIFICATION = "display_notification",
  WAIT = "wait",
  // เพิ่มเติมตามความต้องการ
  // SET_CHARACTER_VARIABLE, PLAY_BACKGROUND_MUSIC, PLAY_VOICE_OVER, SHOW_MEDIA_ELEMENT, HIDE_MEDIA_ELEMENT,
  // REMOVE_ITEM_FROM_INVENTORY, TRIGGER_SCREEN_EFFECT สามารถจัดการผ่าน CUSTOM_SCRIPT หรือ EVENT_TRIGGER_NODE ใน StoryMap ได้
}

/**
 * @interface IChoiceActionParameters
 * @description โครงสร้างพารามิเตอร์สำหรับแต่ละ ChoiceActionType (ตัวอย่าง)
 * - `go_to_node`: { targetNodeId: string, transitionEffect?: string, transitionDurationMs?: number }
 * - `set_story_variable`: { variableId: string, value: any, operation?: "set" | "add" | "subtract" | "toggle" } (variableId อ้างอิง IStoryVariableDefinition.variableId)
 * - `unlock_achievement`: { achievementId: Types.ObjectId } (อ้างอิง Achievement model)
 * - `play_sound_effect`: { mediaId: Types.ObjectId, mediaSourceType: "Media" | "OfficialMedia", volume?: number, loop?: boolean }
 * - `add_item_to_inventory`: { itemId: string, quantity?: number } (itemId อ้างอิง IDefinedItem.itemId ใน StoryMap)
 * - `modify_player_stat`: { statId: string, changeValue: number, operation?: "set" | "add" | "subtract" } (statId อ้างอิง IDefinedStat.id ใน StoryMap)
 * - `trigger_story_event`: { eventName: string, payload?: any }
 * - `update_relationship`: { characterId: Types.ObjectId, relationshipType?: string, changeValue: number } (characterId อ้างอิง Character model, relationshipType อ้างอิง IDefinedRelationship)
 * - `end_novel_branch`: { endingNodeId?: string, outcomeDescription?: string } (endingNodeId อ้างอิง IStoryMapNode.nodeId ที่เป็น ENDING_NODE)
 * - `custom_script`: { scriptContent: string }
 * - `display_notification`: { message: string, notificationType?: "info" | "success" | "warning" | "error", durationMs?: number }
 * - `wait`: { durationMs: number }
 */
export interface IChoiceActionParameters {
  // ควรมี type ที่เข้มงวดสำหรับแต่ละ ActionType แต่เพื่อความกระชับในตัวอย่างนี้ ใช้ any
  [key: string]: any;
}

/**
 * @interface IChoiceAction
 * @description การกระทำ (Action) หนึ่งอย่างที่จะเกิดขึ้นเมื่อผู้เล่นเลือกตัวเลือกนี้
 * @property {string} actionId - ID เฉพาะของ action นี้ภายใน choice (เช่น UUID, Client สร้าง)
 * @property {ChoiceActionType} type - ประเภทของ Action
 * @property {IChoiceActionParameters} parameters - พารามิเตอร์สำหรับ Action นี้ (โครงสร้างจะขึ้นอยู่กับ `type`)
 * @property {string} [conditionScript] - Script เงื่อนไข (JavaScript expression) ที่ต้องเป็นจริงเพื่อให้ Action นี้ทำงาน (ถ้าไม่ระบุคือทำงานเสมอ)
 * @property {string} [notes] - หมายเหตุสำหรับ Action นี้ (สำหรับ Editor)
 */
export interface IChoiceAction {
  actionId: string; // Client-generated UUID
  type: ChoiceActionType;
  parameters: IChoiceActionParameters;
  conditionScript?: string;
  notes?: string;
}
const ChoiceActionSchema = new Schema<IChoiceAction>(
  {
    actionId: { type: String, required: [true, "Action ID is required"], trim: true, maxlength: [100, "Action ID is too long"], comment: "UUID ที่สร้างจาก Client-side Editor" },
    type: { type: String, enum: Object.values(ChoiceActionType), required: [true, "Action type is required"] },
    parameters: { type: Schema.Types.Mixed, required: [true, "Action parameters are required"] },
    conditionScript: { type: String, trim: true, maxlength: [5000, "Condition script is too long"], comment: "Script เงื่อนไขสำหรับ Action นี้ (ถ้ามี)" },
    notes: { type: String, trim: true, maxlength: [1000, "Action notes are too long"] },
  },
  { _id: false }
);


/**
 * @interface IConditionItem
 * @description เงื่อนไขเดี่ยวสำหรับการตรวจสอบ
 * @property {string} conditionItemId - ID ของเงื่อนไขย่อย (Client-generated UUID)
 * @property {"story_variable" | "player_stat" | "relationship_value" | "has_item" | "has_achievement" | "previous_choice_selected" | "current_node_visits" | "custom_script"} type - ประเภทของเงื่อนไข
 * @property {any} parameters - พารามิเตอร์สำหรับเงื่อนไข (โครงสร้างขึ้นอยู่กับ `type`)
 * - `story_variable`: { variableId: string, operator: string, value: any } (variableId อ้างอิง IStoryVariableDefinition.variableId)
 * - `player_stat`: { statId: string, operator: string, value: number } (statId อ้างอิง IDefinedStat.id)
 * - `relationship_value`: { characterId: Types.ObjectId, relationshipType?: string, operator: string, value: number }
 * - `has_item`: { itemId: string, quantity?: number, operator?: ">=" | "<=" | "==" } (itemId อ้างอิง IDefinedItem.itemId)
 * - `has_achievement`: { achievementId: Types.ObjectId, unlocked: boolean }
 * - `previous_choice_selected`: { choiceId: Types.ObjectId, targetNodeId?: string } (choiceId อ้างอิง Choice._id, targetNodeId อ้างอิง IStoryMapNode.nodeId)
 * - `current_node_visits`: { nodeId: string, operator: string, count: number } (nodeId อ้างอิง IStoryMapNode.nodeId)
 * - `custom_script`: { scriptContent: string } // คืนค่า true/false
 */
export interface IConditionItem {
  conditionItemId: string; // Client-generated UUID
  type: "story_variable" | "player_stat" | "relationship_value" | "has_item" | "has_achievement" | "previous_choice_selected" | "current_node_visits" | "custom_script";
  parameters: any;
}
const ConditionItemSchema = new Schema<IConditionItem>(
    {
        conditionItemId: { type: String, required: true, trim: true },
        type: {type: String, enum: ["story_variable", "player_stat", "relationship_value", "has_item", "has_achievement", "previous_choice_selected", "current_node_visits", "custom_script"], required: true},
        parameters: {type: Schema.Types.Mixed, required: true}
    }, {_id: false}
);


/**
 * @interface IChoiceConditionGroup
 * @description กลุ่มเงื่อนไขที่ซับซ้อนสำหรับการแสดงผลหรือเปิดใช้งานตัวเลือก
 * @property {string} conditionGroupId - ID ของกลุ่มเงื่อนไข (Client-generated UUID)
 * @property {"all" | "any"} logicOperator - ตัวดำเนินการตรรกะสำหรับกลุ่มเงื่อนไข ("all" = AND, "any" = OR)
 * @property {IConditionItem[]} conditions - รายการเงื่อนไขย่อย
 * @property {IChoiceConditionGroup[]} [nestedGroups] - (Optional) กลุ่มเงื่อนไขที่ซ้อนกัน (สำหรับ logic ที่ซับซ้อนมากๆ)
 */
export interface IChoiceConditionGroup {
  conditionGroupId: string; // Client-generated UUID
  logicOperator: "all" | "any"; // AND | OR
  conditions: IConditionItem[];
  nestedGroups?: IChoiceConditionGroup[];
}
const ChoiceConditionGroupSchema = new Schema<IChoiceConditionGroup>(
  {
    conditionGroupId: { type: String, required: true, trim: true },
    logicOperator: { type: String, enum: ["all", "any"], required: true },
    conditions: { type: [ConditionItemSchema], default: [] }, // ใช้ Schema ที่กำหนดไว้
    // nestedGroups จะถูก handle แบบ recursive ถ้าจำเป็นใน pre-save หรือ service layer
    // สำหรับ schema นี้ เราจะเก็บ nestedGroups เป็น Mixed หรือละไว้ก่อนเพื่อความเรียบง่ายเบื้องต้น
    // ถ้าต้องการ nested จริงๆ อาจจะต้องทำ self-referencing schema ซึ่ง Mongoose มีข้อจำกัด
    nestedGroups: { type: [Schema.Types.Mixed], default: [] } // Placeholder for recursive structure
  },
  { _id: false }
);


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
 * @property {string} [originStoryMapNodeId] - (Optional) ID ของ `choice_node` ใน StoryMap ที่ตัวเลือกนี้ถูกเรียกใช้ (ถ้า choice ถูก define แยกและ reuse)
 * @property {string} choiceCode - รหัสเฉพาะของตัวเลือก (เช่น "CHOICE_001_A", ใช้ภายในระบบ Editor หรือ Scripting, **ควร unique ภายใน novelId หรือ originStoryMapNodeId**)
 * @property {string} text - ข้อความที่แสดงให้ผู้เล่นเห็นสำหรับตัวเลือกนี้ (รองรับ Markdown หรือ BBCode พื้นฐาน)
 * @property {string} [hoverText] - ข้อความเพิ่มเติมที่จะแสดงเมื่อผู้เล่นนำเมาส์ไปวางเหนือตัวเลือก (tooltip)
 * @property {IChoiceConditionGroup} [displayConditions] - กลุ่มเงื่อนไขที่ต้องเป็นจริงทั้งหมดเพื่อให้ตัวเลือกนี้ "แสดงผล" บนหน้าจอ
 * @property {IChoiceConditionGroup} [enableConditions] - กลุ่มเงื่อนไขที่ต้องเป็นจริงทั้งหมดเพื่อให้ตัวเลือกนี้ "สามารถเลือกได้" (ถ้าแสดงผลแต่เลือกไม่ได้ จะเป็นสีเทา)
 * @property {string} [disabledReasonText] - ข้อความที่จะแสดงหากตัวเลือกถูก disable (เช่น "คุณยังไม่มีไอเทม X", "ค่าความกล้าหาญไม่พอ")
 * @property {IChoiceAction[]} actions - รายการการกระทำ (Actions) ที่จะเกิดขึ้นตามลำดับเมื่อผู้เล่นเลือกตัวเลือกนี้
 * @property {number} [costCoins] - จำนวนเหรียญ (สกุลเงินในเกม) ที่ต้องใช้เพื่อเลือกตัวเลือกนี้ (0 คือฟรี)
 * @property {string} [requiredItemId] - ID ของไอเทม (จาก IDefinedItem.itemId ใน StoryMap) ที่ต้องมีเพื่อเลือกตัวเลือกนี้ (ถ้ามี, จะถูกใช้ไป)
 * @property {boolean} isMajorChoice - ตัวเลือกนี้เป็นการตัดสินใจสำคัญที่ส่งผลต่อเนื้อเรื่องหลักหรือไม่
 * @property {boolean} isTimedChoice - ตัวเลือกนี้มีเวลาจำกัดในการเลือกหรือไม่
 * @property {number} [timeLimitSeconds] - ระยะเวลา (วินาที) ที่ให้ในการเลือก (ถ้า isTimedChoice เป็น true)
 * @property {string} [defaultActionTargetNodeIdOnTimeout] - nodeId ปลายทาง (ใน StoryMap) ที่จะไปอัตโนมัติหากหมดเวลา (ถ้า isTimedChoice)
 * @property {string[]} [associatedEmotionTags] - แท็กอารมณ์ที่เกี่ยวข้องกับตัวเลือกนี้ (ผู้เขียนกำหนด หรือ AI ช่วย tag, เช่น "กล้าหาญ", "เห็นแก่ตัว", "รอบคอบ") **สำคัญสำหรับการวิเคราะห์สุขภาพจิต**
 * @property {number} [psychologicalImpactScore] - คะแนนผลกระทบทางจิตวิทยา (ผู้เขียนกำหนด หรือ AI คำนวณ, อาจเป็นค่าบวก/ลบ หรือ scale อื่นๆ) **สำคัญสำหรับการวิเคราะห์สุขภาพจิต**
 * @property {string} [feedbackTextAfterSelection] - ข้อความตอบกลับสั้นๆ ที่จะแสดงทันทีหลังจากผู้เล่นเลือกตัวเลือกนี้ (เช่น "คุณเลือกที่จะช่วยเขา", "การตัดสินใจนี้จะส่งผลในอนาคต")
 * @property {string} [editorNotes] - หมายเหตุสำหรับผู้เขียน/ทีมงาน (ไม่แสดงผลในเกม)
 * @property {boolean} isArchived - ตัวเลือกนี้ถูกเก็บเข้าคลัง (ไม่ใช้งานแล้ว) หรือไม่
 * @property {number} [displayOrder] - ลำดับการแสดงผลของตัวเลือกนี้ (ถ้ามีหลายตัวเลือกในกลุ่มเดียวกัน)
 * @property {Date} createdAt - วันที่สร้างเอกสารตัวเลือก (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตเอกสารตัวเลือกล่าสุด (Mongoose `timestamps`)
 */
export interface IChoice extends Document {
  _id: Types.ObjectId;
  novelId: Types.ObjectId;
  authorId: Types.ObjectId;
  version: number;
  originStoryMapNodeId?: string; // ID ของ choice_node ใน StoryMap
  choiceCode: string; // Unique code ภายใน Novel หรือ originStoryMapNodeId
  text: string;
  hoverText?: string;
  displayConditions?: IChoiceConditionGroup;
  enableConditions?: IChoiceConditionGroup;
  disabledReasonText?: string;
  actions: IChoiceAction[]; // เปลี่ยนจาก Types.DocumentArray
  costCoins?: number;
  requiredItemId?: string; // ID ของ IDefinedItem.itemId จาก StoryMap
  isMajorChoice?: boolean;
  isTimedChoice?: boolean;
  timeLimitSeconds?: number;
  defaultActionTargetNodeIdOnTimeout?: string; // อ้างอิง StoryMapNode.nodeId
  associatedEmotionTags?: string[];
  psychologicalImpactScore?: number;
  feedbackTextAfterSelection?: string;
  editorNotes?: string;
  isArchived: boolean;
  displayOrder?: number;
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
    version: { 
      type: Number,
      required: [true, "Choice version is required"],
      default: 1,
      min: [1, "Choice version must be at least 1"],
      comment: "Version number of this choice document, incremented on each significant change.",
    },
    originStoryMapNodeId: { type: String, trim: true, index: true, comment: "ID ของ choice_node ใน StoryMap ที่ตัวเลือกนี้ปรากฏ" },
    choiceCode: {
      type: String,
      required: [true, "กรุณาระบุรหัสตัวเลือก (Choice code is required)"],
      trim: true,
      uppercase: true,
      maxlength: [100, "รหัสตัวเลือกยาวเกินไป"],
      comment: "Unique code for this choice, possibly within a novel or scene context."
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
      type: [ChoiceActionSchema], // ใช้ Schema ที่กำหนดไว้
      validate: {
        validator: function (v: any[]) { return v && v.length > 0; },
        message: "ต้องมีอย่างน้อยหนึ่ง action สำหรับตัวเลือก (At least one action is required for a choice)",
      },
    },
    costCoins: { type: Number, min: 0, default: 0 },
    requiredItemId: { type: String, trim: true, comment: "ID ของ IDefinedItem.itemId จาก StoryMap ที่ต้องการ" },
    isMajorChoice: { type: Boolean, default: false, index: true },
    isTimedChoice: { type: Boolean, default: false },
    timeLimitSeconds: { type: Number, min: 1 },
    defaultActionTargetNodeIdOnTimeout: { type: String, trim: true, comment: "nodeId ใน StoryMap ที่จะไปเมื่อหมดเวลา" },
    associatedEmotionTags: [{ type: String, trim: true, lowercase: true, maxlength: [50, "Emotion tag is too long"], index: true }],
    psychologicalImpactScore: { type: Number, comment: "ค่าผลกระทบทางจิตใจ เช่น -5 ถึง +5" },
    feedbackTextAfterSelection: { type: String, trim: true, maxlength: [500, "Feedback text is too long"] },
    editorNotes: { type: String, trim: true, maxlength: [5000, "Editor notes ยาวเกินไป"] },
    isArchived: { type: Boolean, default: false, index: true },
    displayOrder: { type: Number, default: 0, comment: "ลำดับการแสดงผลของตัวเลือกในกลุ่ม" },
  },
  {
    timestamps: true, // เพิ่ม createdAt และ updatedAt โดยอัตโนมัติ
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    strict: "throw", // ป้องกันการบันทึก field ที่ไม่ได้กำหนดใน schema
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

// Index สำหรับการ query ทั่วไปตาม novelId และสถานะ archived
ChoiceSchema.index({ novelId: 1, isArchived: 1 }, { name: "NovelActiveChoicesIndex" });
// Index สำหรับการ query choice ที่อยู่ใน choice_node ของ StoryMap
ChoiceSchema.index({ novelId: 1, originStoryMapNodeId: 1, displayOrder: 1 }, { name: "ChoicesByStoryMapNodeIndex" });
// Index สำหรับค้นหาตาม choiceCode ภายใน novel (ถ้า choiceCode ต้อง unique ภายใน novel)
ChoiceSchema.index({ novelId: 1, choiceCode: 1 }, { unique: true, name: "NovelChoiceCodeUniqueIndex", partialFilterExpression: { choiceCode: { $exists: true } } });

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

ChoiceSchema.pre<IChoice>("save", async function (next) {
  // 1. ตรวจสอบความถูกต้องของ Actions (ตัวอย่าง)
  if (this.isModified("actions")) {
    for (const action of this.actions) {
      if (action.type === ChoiceActionType.GO_TO_NODE && (!action.parameters?.targetNodeId || typeof action.parameters.targetNodeId !== 'string')) {
        return next(new Error(`Action "${action.actionId}" (GO_TO_NODE): targetNodeId (string) is required in parameters.`));
      }
      if (action.type === ChoiceActionType.SET_STORY_VARIABLE && (!action.parameters?.variableId || typeof action.parameters.variableId !== 'string' || action.parameters.value === undefined)) {
        return next(new Error(`Action "${action.actionId}" (SET_STORY_VARIABLE): variableId (string) and value are required in parameters.`));
      }
      // TODO: เพิ่ม validation สำหรับ action types อื่นๆ
    }
  }

  // 2. ตรวจสอบ Timed Choice
  if (this.isTimedChoice && (!this.timeLimitSeconds || this.timeLimitSeconds <= 0)) {
    return next(new Error("Time limit (seconds) must be a positive number for a timed choice."));
  }
  if (!this.isTimedChoice) {
    this.timeLimitSeconds = undefined;
    this.defaultActionTargetNodeIdOnTimeout = undefined;
  }

  // 3. ตรวจสอบความ unique ของ actionId ภายใน choice
  if (this.isModified("actions") && this.actions && this.actions.length > 0) {
    const actionIds = this.actions.map(act => act.actionId);
    const uniqueActionIds = new Set(actionIds);
    if (actionIds.length !== uniqueActionIds.size) {
      return next(new Error("รหัส Action ID ภายในตัวเลือกต้องไม่ซ้ำกัน (Action IDs must be unique within a choice)."));
    }
  }

  // 4. Validate โครงสร้างของ IConditionItem.parameters (ตัวอย่างเบื้องต้น)
  const validateConditionItemParams = (item: IConditionItem): mongoose.Error | null => {
    switch(item.type) {
        case "story_variable":
            if (!item.parameters?.variableId || typeof item.parameters.variableId !== 'string' ||
                !item.parameters?.operator || typeof item.parameters.operator !== 'string' ||
                item.parameters.value === undefined) {
                return new mongoose.Error.ValidatorError({ message: `Invalid parameters for story_variable condition ${item.conditionItemId}`});
            }
            break;
        // TODO: Add validation for other condition types
    }
    return null;
  };

  const validateConditionGroup = (group: IChoiceConditionGroup | undefined, groupName: string): mongoose.Error | null => {
    if (!group) return null;
    if (!group.conditions || group.conditions.length === 0) {
        if (group.nestedGroups && group.nestedGroups.length > 0) { /* ok if only nested */ }
        else return new mongoose.Error.ValidatorError({ message: `${groupName} must have at least one condition or nested group if the group is defined.`});
    }
    for (const condition of group.conditions) {
      if (!condition.type || !condition.parameters || !condition.conditionItemId) {
        return new mongoose.Error.ValidatorError({message: `Invalid condition structure in ${groupName}. conditionItemId, Type and parameters are required.`});
      }
      const itemParamError = validateConditionItemParams(condition);
      if (itemParamError) return itemParamError;
    }
    if (group.nestedGroups) {
        for (const nested of group.nestedGroups) {
            const nestedError = validateConditionGroup(nested, `${groupName} -> nestedGroup ${nested.conditionGroupId}`);
            if (nestedError) return nestedError;
        }
    }
    return null;
  };

  let validationError = validateConditionGroup(this.displayConditions, "Display Conditions");
  if (validationError) return next(validationError);
  validationError = validateConditionGroup(this.enableConditions, "Enable Conditions");
  if (validationError) return next(validationError);

  next();
});

// Middleware: หลังจากบันทึก (save) หรือลบ เพื่ออัปเดตข้อมูลใน Novel ที่เกี่ยวข้อง
ChoiceSchema.post<IChoice>(/^(save|findOneAndDelete)$/ as any, async function (doc: IChoice | null) {
  // The type for `doc` in post hook for findOneAndDelete might be different or null.
  // We need to ensure `doc` is valid and has the `novelId`.
  // If `doc` is null (nothing found to delete), or if it's a result of an updateMany/deleteMany (which won't hit this hook directly),
  // this logic won't run or needs careful handling. This hook is for single document operations.

  const currentDoc = this instanceof mongoose.Model ? this : doc; // `this` is the document for 'save', `doc` is for 'findOneAndDelete'

  if (currentDoc && currentDoc.novelId) {
    try {
      const NovelModel = models.Novel || model("Novel");
      await NovelModel.findByIdAndUpdate(currentDoc.novelId, { $set: { lastContentUpdatedAt: new Date() } });
      console.log(`[ChoiceMiddleware] Updated lastContentUpdatedAt for Novel ${currentDoc.novelId} due to Choice ${currentDoc._id} change.`);

      // เพิ่มเติม: หาก Choice นี้ถูกอ้างอิงใน StoryMap.nodes (ประเภท choice_node).choiceIds
      // อาจจะต้องมี logic ในการตรวจสอบความสอดคล้องหรือแจ้งเตือนผู้เขียน
      // แต่การทำ cascading update ที่ซับซ้อนควรอยู่ใน service layer
    } catch (error) {
      console.error(`[ChoiceMiddlewareError] Failed to update Novel after choice operation ${currentDoc._id}:`, error);
    }
  }
});


// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

const ChoiceModel = (models.Choice as mongoose.Model<IChoice>) || model<IChoice>("Choice", ChoiceSchema);

export default ChoiceModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Choice Code Uniqueness**: (ยังคงเดิม) `choiceCode` อาจจะต้อง unique ภายใน `novelId` หรือ `originStoryMapNodeId` ถ้ามีการใช้งาน.
// 2.  **Condition Engine**: (ยังคงเดิม) `displayConditions`, `enableConditions`, และ `IChoiceAction.conditionScript` ต้องการ Condition Engine.
// 3.  **Action Parameters Validation**: (ปรับปรุงแล้ว) เพิ่ม Interface `IChoiceActionParameters` และตัวอย่างการ validate ใน `pre('save')`. ควรทำให้ครอบคลุมทุก ActionType.
// 4.  **Item Model Integration**: `requiredItemId` ควรมีการอ้างอิงที่ชัดเจนไปยัง `IDefinedItem.itemId` ภายใน `StoryMap.gameMechanicsConfig.inventoryConfig.definedItems`.
// 5.  **Integration with StoryMap/Scene Editor**: (ปรับปรุงแล้ว) `originStoryMapNodeId` ช่วยให้ Choice สามารถถูกจัดการจาก StoryMap editor ได้.
//     ตัวเลือก (Choices) ที่สร้างขึ้นจาก `Choice.ts` นี้ สามารถถูกอ้างอิงโดย `choice_node` ใน `StoryMap.ts` ผ่าน `choiceIds`.
//     การแสดงผลตัวเลือกเหล่านี้ใน Scene จะถูกจัดการโดย `Scene.ts` ซึ่งอาจจะดึงข้อมูล Choice ตาม `choiceIds` ที่ได้รับจาก StoryMap.
// 6.  **Psychological Impact Analysis**: (ยังคงเดิม) `associatedEmotionTags` และ `psychologicalImpactScore` ยังคงมีความสำคัญ.
// 7.  **Complex Choice Structures**: (ยังคงเดิม) สำหรับ choice tree ที่ซับซ้อนภายใน choice อาจต้องพิจารณาโครงสร้างเพิ่มเติม.
// 8.  **Localization (i18n)**: (ยังคงเดิม) ข้อความต่างๆ (`text`, `hoverText`, etc.) ควรมีการออกแบบให้รองรับหลายภาษา.
// 9.  **Performance**: (ยังคงเดิม) นิยายที่มี Choices และ Conditions จำนวนมากต้องคำนึงถึง performance.
// 10. **Action Execution Order**: (ยังคงเดิม) `actions` เป็น array และควรทำงานตามลำดับ. `ChoiceActionType.WAIT` ถูกเพิ่มเข้ามา.
// ==================================================================================================