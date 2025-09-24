// src/backend/models/StoryMap.ts
// โมเดลแผนผังเนื้อเรื่อง (StoryMap Model)
// จัดการโครงสร้าง, ความเชื่อมโยงของฉาก (Scenes), ทางเลือก (Choices), ตัวแปร, และเงื่อนไขต่างๆ ใน Visual Novel
// เน้นความยืดหยุ่นสำหรับผู้เขียน, การรองรับการวิเคราะห์, และประสิทธิภาพ
// อัปเดตตามคำแนะนำ: เพิ่มการจัดการ ID, Condition Engine, Variable Management, NodeSpecificData typing,
// Versioning, Psychological Impact Analysis, UI Editor considerations (animation, zIndex, layout, editHistory).

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IChoice } from "./Choice"; // อ้างอิง IChoice จาก Choice.ts
import { IScene } from "./Scene"; // อ้างอิง IScene จาก Scene.ts (เผื่อต้องการ type ที่เข้มงวดขึ้น)

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล StoryMap
// ==================================================================================================

/**
 * @enum {string} StoryMapNodeType
 * @description ประเภทของโหนด (Node) ในแผนผังเนื้อเรื่อง (StoryMap)
 * - `start_node`: โหนดพิเศษที่เป็นจุดเริ่มต้นของนิยายเรื่องนี้
 * - `scene_node`: โหนดที่แทนฉากปกติ (อ้างอิง Scene model)
 * - `choice_node`: โหนดที่แทนกลุ่มของตัวเลือก (Choices) ที่ผู้เล่นต้องเลือก (อ้างอิง Choice model)
 * - `branch_node`: โหนดที่เป็นจุดเริ่มต้นของแขนงเรื่องราวตามเงื่อนไข (Conditional Branching)
 * - `merge_node`: โหนดที่เป็นจุดรวมของแขนงเรื่องราวหลายเส้นทาง
 * - `ending_node`: โหนดที่แทนฉากจบของเนื้อเรื่อง (อาจมีหลายแบบ)
 * - `variable_modifier_node`: โหนดที่ใช้สำหรับการตั้งค่าหรือเปลี่ยนแปลงค่าตัวแปรของเรื่องราว (Story Variables)
 * - `event_trigger_node`: โหนดที่ใช้สำหรับกระตุ้นเหตุการณ์พิเศษ (เช่น ปลดล็อก Achievement, เล่น Cutscene พิเศษ)
 * - `comment_node`: โหนดสำหรับผู้เขียนใส่หมายเหตุหรือคำอธิบายใน StoryMap Editor (ไม่ส่งผลต่อเกม)
 * - `custom_logic_node`: โหนดสำหรับตรรกะที่ซับซ้อนที่กำหนดโดยผู้เขียน (อาจใช้ script)
 * - `group_node`: (แนวคิด) โหนดสำหรับจัดกลุ่มโหนดอื่นๆ เพื่อความเป็นระเบียบใน Editor
 * - `delay_node`: โหนดสำหรับหน่วงเวลาก่อนไปยังโหนดถัดไป
 * - `random_branch_node`: โหนดสำหรับแตกแขนงแบบสุ่ม
 * - `parallel_execution_node`: โหนดสำหรับเริ่ม/จบการทำงานแบบขนาน (ถ้าแพลตฟอร์มรองรับ)
 * - `sub_storymap_node`: โหนดสำหรับเรียก StoryMap ย่อย (Modular Design)
 */
export enum StoryMapNodeType {
  START_NODE = "start_node",
  SCENE_NODE = "scene_node",
  EPISODE_NODE = "episode_node", // 🎯 NEW: Node type สำหรับ Episode
  CHOICE_NODE = "choice_node",
  BRANCH_NODE = "branch_node", // เดิมคือ conditional_logic_node แต่ branch_node อาจจะสื่อความหมายได้กว้างกว่า
  MERGE_NODE = "merge_node", // เดิมคือ merge_point_node
  ENDING_NODE = "ending_node",
  VARIABLE_MODIFIER_NODE = "variable_modifier_node",
  EVENT_TRIGGER_NODE = "event_trigger_node",
  COMMENT_NODE = "comment_node",
  CUSTOM_LOGIC_NODE = "custom_logic_node",
  GROUP_NODE = "group_node",
  DELAY_NODE = "delay_node",
  RANDOM_BRANCH_NODE = "random_branch_node",
  PARALLEL_EXECUTION_NODE = "parallel_execution_node",
  SUB_STORYMAP_NODE = "sub_storymap_node",
}

/**
 * @enum {string} StoryVariableDataType
 * @description ประเภทข้อมูลของตัวแปรในเนื้อเรื่อง (Story Variable)
 * - `boolean`: ค่าตรรกะ (true/false)
 * - `number`: ค่าตัวเลข (จำนวนเต็มหรือทศนิยม)
 * - `string`: ค่าข้อความ
 * - `character_status`: สถานะพิเศษของตัวละคร (เช่น "is_angry", "has_item_X") - อาจพิจารณาเป็น flag หรือตัวแปรที่ซับซ้อนกว่า
 * - `relationship_level`: ระดับความสัมพันธ์ (อาจเป็นตัวเลข หรือ enum เช่น "friendly", "hostile")
 * - `datetime`: ค่าวันที่และเวลา
 * - `array`: ชุดข้อมูล (เช่น รายการไอเทมที่เก็บไว้)
 * - `object`: โครงสร้างข้อมูลที่ซับซ้อน
 */
export enum StoryVariableDataType {
  BOOLEAN = "boolean",
  NUMBER = "number",
  STRING = "string",
  CHARACTER_STATUS = "character_status",
  RELATIONSHIP_LEVEL = "relationship_level",
  DATETIME = "datetime",
  ARRAY = "array",
  OBJECT = "object",
}

/**
 * @interface IStoryVariableDefinition
 * @description การกำหนดตัวแปรที่ใช้ในเนื้อเรื่อง (สำหรับทั้ง Novel)
 * @property {string} variableId - ID เฉพาะของตัวแปร (เช่น UUID, **ต้อง unique ภายใน Novel**)
 * @property {string} variableName - ชื่อตัวแปรที่ผู้เขียนใช้อ้างอิง (ควร unique เพื่อความชัดเจน)
 * @property {StoryVariableDataType} dataType - ประเภทข้อมูลของตัวแปร
 * @property {any} initialValue - ค่าเริ่มต้นของตัวแปร
 * @property {string} [description] - คำอธิบายตัวแปร (สำหรับ Editor)
 * @property {any[]} [allowedValues] - (Optional) รายการค่าที่เป็นไปได้ (สำหรับ enum หรือ string ที่จำกัด)
 * @property {boolean} [isGlobal] - (Optional) เป็นตัวแปรระดับ Global ของทั้ง Novel หรือเฉพาะ StoryMap นี้ (default: true)
 * @property {boolean} [isVisibleToPlayer] - (Optional) ผู้เล่นสามารถเห็นค่าตัวแปรนี้ใน UI ได้หรือไม่ (เช่น ค่าสถานะ)
 */
export interface IStoryVariableDefinition {
  variableId: string; // เพิ่ม variableId เพื่อเป็น unique key
  variableName: string;
  dataType: StoryVariableDataType;
  initialValue: any;
  description?: string;
  allowedValues?: any[];
  isGlobal?: boolean;
  isVisibleToPlayer?: boolean;
}
const StoryVariableDefinitionSchema = new Schema<IStoryVariableDefinition>(
  {
    variableId: { type: String, required: true, trim: true, comment: "UUID หรือ ID เฉพาะที่สร้างจาก client-side editor" },
    variableName: { type: String, required: true, trim: true, maxlength: [100, "ชื่อตัวแปรยาวเกินไป (ไม่เกิน 100 ตัวอักษร)"], comment: "ชื่อที่ผู้เขียนใช้อ้างอิงใน editor/script" },
    dataType: { type: String, enum: Object.values(StoryVariableDataType), required: true, comment: "ประเภทข้อมูลของตัวแปร" },
    initialValue: { type: Schema.Types.Mixed, required: true, comment: "ค่าเริ่มต้นของตัวแปร" },
    description: { type: String, trim: true, maxlength: [500, "คำอธิบายตัวแปรยาวเกินไป (ไม่เกิน 500 ตัวอักษร)"] },
    allowedValues: [{ type: Schema.Types.Mixed, comment: "รายการค่าที่เป็นไปได้ (ถ้ามี)" }],
    isGlobal: { type: Boolean, default: true, comment: "เป็นตัวแปร Global ของ Novel หรือไม่" },
    isVisibleToPlayer: { type: Boolean, default: false, comment: "ผู้เล่นสามารถเห็นค่านี้ใน UI หรือไม่" },
  },
  { _id: false }
);


// ==================================================================================================
// SECTION: Node Specific Data Interfaces (สำหรับ nodeSpecificData)
// ==================================================================================================

/**
 * @interface ISceneNodeData
 * @description ข้อมูลเฉพาะสำหรับ `scene_node`
 * @property {Types.ObjectId} sceneId - ID ของ Scene ที่จะแสดง (อ้างอิง Scene model)
 */
export interface ISceneNodeData {
  sceneId: Types.ObjectId;
}

/**
 * @interface IEpisodeNodeData
 * @description ข้อมูลเฉพาะสำหรับ `episode_node` - โหนดที่แทนตอนของนิยาย
 * @property {Types.ObjectId} episodeId - ID ของ Episode ที่จะแสดง (อ้างอิง Episode model)
 * @property {number} episodeOrder - ลำดับตอนในนิยาย
 * @property {string} episodeTitle - ชื่อตอน (cache เพื่อการแสดงผลเร็วขึ้น)
 * @property {string} episodeStatus - สถานะตอน (cache เพื่อการแสดงผลเร็วขึ้น)
 * @property {boolean} autoGenerateScenes - สร้าง Scene nodes อัตโนมัติหรือไม่
 */
export interface IEpisodeNodeData {
  episodeId: Types.ObjectId;
  episodeOrder: number;
  episodeTitle: string;
  episodeStatus: string;
  autoGenerateScenes?: boolean;
}

/**
 * @interface IChoiceNodeData
 * @description ข้อมูลเฉพาะสำหรับ `choice_node`
 * @property {Types.ObjectId[]} choiceIds - Array ของ Choice ObjectIds ที่จะแสดงในโหนดนี้ (อ้างอิง Choice model)
 * @property {string} [promptText] - ข้อความนำก่อนแสดงตัวเลือก (ถ้ามี)
 * @property {"vertical" | "horizontal" | "grid"} [layout] - การจัดวางตัวเลือก (default: "vertical")
 */
export interface IChoiceNodeData {
  choiceIds: Types.ObjectId[];
  promptText?: string;
  layout?: "vertical" | "horizontal" | "grid";
}

/**
 * @interface IBranchCondition
 * @description หนึ่งเงื่อนไขย่อยภายใน `branch_node`
 * @property {string} conditionId - ID ของเงื่อนไขนี้
 * @property {string} expression - นิพจน์เงื่อนไข (เช่น "variables.karma > 10 && flags.met_character_A === true")
 * @property {string} targetNodeIdIfTrue - nodeId ปลายทางถ้าเงื่อนไขเป็นจริง
 * @property {number} [priority] - ลำดับความสำคัญในการตรวจสอบ (ถ้ามีหลายเงื่อนไขที่อาจเป็นจริงพร้อมกัน)
 */
export interface IBranchCondition {
  conditionId: string; // Client-generated unique ID for this condition item
  expression: string; // Expression to be evaluated by the Condition Engine
  targetNodeIdIfTrue: string; // Node ID to go to if this condition is true
  priority?: number; // For ordering evaluation if multiple conditions might be true
}

/**
 * @interface IBranchNodeData
 * @description ข้อมูลเฉพาะสำหรับ `branch_node` (Conditional Branching)
 * @property {IBranchCondition[]} conditions - รายการเงื่อนไขที่จะตรวจสอบตามลำดับ
 * @property {string} [defaultTargetNodeId] - (Optional) nodeId ปลายทางถ้าไม่มีเงื่อนไขใดเป็นจริง
 */
export interface IBranchNodeData {
  conditions: IBranchCondition[];
  defaultTargetNodeId?: string; // Node ID to go to if no conditions are met
}

/**
 * @interface IVariableModifierOperation
 * @description การดำเนินการหนึ่งอย่างใน `variable_modifier_node`
 * @property {string} variableId - ID ของ StoryVariable ที่จะแก้ไข
 * @property {"set" | "add" | "subtract" | "toggle" | "push" | "pop" | "increment" | "decrement"} operation - ประเภทการดำเนินการ
 * @property {any} [value] - ค่าที่จะใช้ (สำหรับ set, add, subtract, push)
 * @property {string} [valueFromVariableId] - (Optional) ดึงค่ามาจากตัวแปรอื่น
 */
export interface IVariableModifierOperation {
  variableId: string; // ID ของ StoryVariableDefinition
  operation: "set" | "add" | "subtract" | "toggle" | "push" | "pop" | "increment" | "decrement";
  value?: any; // The value to use for 'set', 'add', 'subtract', 'push'
  valueFromVariableId?: string; // Optionally, get the value from another variable
}

/**
 * @interface IVariableModifierNodeData
 * @description ข้อมูลเฉพาะสำหรับ `variable_modifier_node`
 * @property {IVariableModifierOperation[]} operations - รายการการดำเนินการกับตัวแปร
 */
export interface IVariableModifierNodeData {
  operations: IVariableModifierOperation[];
}

/**
 * @interface IEventTriggerNodeData
 * @description ข้อมูลเฉพาะสำหรับ `event_trigger_node`
 * @property {string} eventName - ชื่อ event ที่จะ trigger (เช่น "achievement_unlocked", "play_special_sfx")
 * @property {any} [eventPayload] - ข้อมูลเพิ่มเติมที่จะส่งไปกับ event
 */
export interface IEventTriggerNodeData {
  eventName: string;
  eventPayload?: any;
}

/**
 * @interface ICommentNodeData
 * @description ข้อมูลเฉพาะสำหรับ `comment_node`
 * @property {string} commentText - เนื้อหาคอมเมนต์ของผู้เขียน
 */
export interface ICommentNodeData {
  commentText: string;
}

/**
 * @interface ICustomLogicNodeData
 * @description ข้อมูลเฉพาะสำหรับ `custom_logic_node`
 * @property {string} scriptContent - เนื้อหา script ที่จะรัน (เช่น JavaScript snippet)
 * @property {string[]} [outputNodeIds] - (Optional) รายการ possible output node IDs ที่ script อาจจะ return
 */
export interface ICustomLogicNodeData {
  scriptContent: string;
  outputNodeIds?: string[];
}

/**
 * @interface IEndingNodeData
 * @description ข้อมูลเฉพาะสำหรับ `ending_node`
 * @property {string} endingTitle - ชื่อฉากจบ (เช่น "True Ending", "Bad Ending A")
 * @property {Types.ObjectId} [endingSceneId] - (Optional) ID ของ Scene ที่เป็นฉากจบจริงๆ
 * @property {string} [outcomeDescription] - คำอธิบายผลลัพธ์ของฉากจบนี้
 * @property {string} [unlockCondition] - (Optional) เงื่อนไขที่ต้องผ่านเพื่อปลดล็อกฉากจบนี้
 */
export interface IEndingNodeData {
  endingTitle: string;
  endingSceneId?: Types.ObjectId; // Ref to Scene.ts
  outcomeDescription?: string;
  unlockCondition?: string; // Script expression
}


// ==================================================================================================
// SECTION: อินเทอร์เฟซสำหรับ Node และ Edge ใน StoryMap
// ==================================================================================================

/**
 * @interface IStoryMapNode
 * @description โหนด (Node) หนึ่งรายการในแผนผังเนื้อเรื่อง
 * @property {string} nodeId - ID เฉพาะของโหนดนี้ (เช่น UUID, **ต้อง unique ภายใน StoryMap เดียวกัน**, แนะนำให้ Client สร้าง)
 * @property {StoryMapNodeType} nodeType - ประเภทของโหนด
 * @property {string} title - ชื่อหรือป้ายกำกับของโหนด (สำหรับแสดงใน Editor)
 * @property {object} position - ตำแหน่งของโหนดใน StoryMap Editor (สำหรับวาดแผนผัง)
 * @property {number} position.x - พิกัด X
 * @property {number} position.y - พิกัด Y
 * @property {object} [dimensions] - (Optional) ขนาดของโหนดใน Editor
 * @property {number} [dimensions.width] - ความกว้าง
 * @property {number} [dimensions.height] - ความสูง
 * @property {any} [nodeSpecificData] - ข้อมูลเฉพาะสำหรับประเภทโหนดนั้นๆ (ใช้ Interfaces ด้านบน เช่น ISceneNodeData, IChoiceNodeData)
 * @property {string} [notesForAuthor] - หมายเหตุสำหรับผู้เขียน (ไม่แสดงในเกม)
 * @property {string[]} [authorDefinedEmotionTags] - แท็กอารมณ์ที่ผู้เขียนกำหนดสำหรับโหนดนี้ (เช่น "tension", "relief", "mystery")
 * @property {number} [authorDefinedPsychologicalImpact] - ค่าผลกระทบทางจิตวิทยาที่ผู้เขียนกำหนด (อาจเป็นบวก/ลบ หรือ scale อื่นๆ)
 * @property {Date} [lastEdited] - วันที่แก้ไขโหนดนี้ล่าสุด
 * @property {object} [editorVisuals] - (Optional) การตั้งค่าการแสดงผลใน Editor
 * @property {string} [editorVisuals.color] - สีของโหนด
 * @property {string} [editorVisuals.icon] - ไอคอนของโหนด
 * @property {number} [editorVisuals.zIndex] - ลำดับการซ้อนทับใน Canvas
 * @property {"vertical" | "horizontal"} [editorVisuals.orientation] - การวางแนวของโหนด (สำหรับ handle positions)
 * @property {boolean} [editorVisuals.showThumbnail] - แสดงภาพตัวอย่างสำหรับ scene nodes
 * @property {string} [editorVisuals.borderStyle] - รูปแบบเส้นขอบ ("solid", "dashed", "dotted")
 * @property {number} [editorVisuals.borderRadius] - รัศมีความโค้งของมุม
 * @property {object} [editorVisuals.gradient] - การไล่สีพื้นหลัง
 * @property {string} [editorVisuals.gradient.from] - สีเริ่มต้น
 * @property {string} [editorVisuals.gradient.to] - สีสิ้นสุด
 * @property {string} [editorVisuals.gradient.direction] - ทิศทางการไล่สี
 * @property {object} [editorVisuals.animation] - การตั้งค่า Animation สำหรับ Node ใน Editor (เช่น enter, exit)
 * @property {string} [editorVisuals.animation.enter] - ชื่อ Animation หรือ config
 * @property {string} [editorVisuals.animation.exit] - ชื่อ Animation หรือ config
 * @property {object} [layoutConfig] - การตั้งค่าการจัดเรียงโหนด
 * @property {"auto" | "manual"} [layoutConfig.mode] - โหมดการจัดเรียง
 * @property {number} [layoutConfig.tier] - ชั้นของโหนดในการจัดเรียงอัตโนมัติ
 * @property {number} [layoutConfig.order] - ลำดับในชั้นเดียวกัน
 */
export interface IStoryMapNode {
  nodeId: string; // Client-generated UUID
  nodeType: StoryMapNodeType;
  title: string;
  position: { x: number; y: number };
  dimensions?: { width: number; height: number };
  nodeSpecificData?:
    | ISceneNodeData
    | IEpisodeNodeData // 🎯 NEW: Episode node data support
    | IChoiceNodeData
    | IBranchNodeData
    | IVariableModifierNodeData
    | IEventTriggerNodeData
    | ICommentNodeData
    | ICustomLogicNodeData
    | IEndingNodeData
    | any; // Fallback for other types or future extension
  notesForAuthor?: string;
  authorDefinedEmotionTags?: string[];
  authorDefinedPsychologicalImpact?: number;
  lastEdited?: Date;
  editorVisuals?: {
    color?: string;
    icon?: string; // e.g., name of an icon from a library or a URL
    zIndex?: number;
    orientation?: "vertical" | "horizontal"; // การวางแนวของโหนด
    showThumbnail?: boolean; // แสดงภาพตัวอย่างสำหรับ scene nodes
    borderStyle?: "solid" | "dashed" | "dotted"; // รูปแบบเส้นขอบ
    borderRadius?: number; // รัศมีความโค้งของมุม
    gradient?: {
      from?: string; // สีเริ่มต้น
      to?: string; // สีสิ้นสุด
      direction?: "horizontal" | "vertical" | "diagonal"; // ทิศทางการไล่สี
    };
    animation?: {
        enter?: string; // Animation name or config
        exit?: string;  // Animation name or config
    };
  };
  layoutConfig?: {
    mode?: "auto" | "manual"; // โหมดการจัดเรียง
    tier?: number; // ชั้นของโหนดในการจัดเรียงอัตโนมัติ
    order?: number; // ลำดับในชั้นเดียวกัน
  };
}
const StoryMapNodeSchema = new Schema<IStoryMapNode>(
  {
    nodeId: { type: String, required: [true, "Node ID is required"], trim: true, maxlength: [100, "Node ID is too long"], comment: "UUID ที่สร้างจาก Client-side Editor" },
    nodeType: { type: String, enum: Object.values(StoryMapNodeType), required: [true, "Node type is required"] },
    title: { type: String, required: [true, "Node title is required"], trim: true, maxlength: [255, "Node title is too long"] },
    position: {
      x: { type: Number, required: true, default: 0 },
      y: { type: Number, required: true, default: 0 },
      _id: false,
    },
    dimensions: {
        width: { type: Number },
        height: { type: Number },
        _id: false,
    },
    nodeSpecificData: { type: Schema.Types.Mixed, comment: "ข้อมูลเฉพาะของแต่ละ Node Type, ควรมี validation เพิ่มเติมตาม nodeType" },
    notesForAuthor: { type: String, trim: true, maxlength: [2000, "Author notes are too long"] },
    authorDefinedEmotionTags: [{ type: String, trim: true, lowercase: true, maxlength: [50, "Emotion tag is too long"] }],
    authorDefinedPsychologicalImpact: { type: Number, comment: "ค่าผลกระทบทางจิตใจ เช่น -5 ถึง +5" },
    lastEdited: { type: Date, default: Date.now },
    editorVisuals: {
        color: { type: String, trim: true },
        icon: { type: String, trim: true },
        zIndex: { type: Number, default: 0 },
        orientation: { type: String, enum: ["vertical", "horizontal"], default: "vertical" },
        showThumbnail: { type: Boolean, default: false },
        borderStyle: { type: String, enum: ["solid", "dashed", "dotted"], default: "solid" },
        borderRadius: { type: Number, default: 8, min: 0, max: 50 },
        gradient: {
            from: { type: String, trim: true },
            to: { type: String, trim: true },
            direction: { type: String, enum: ["horizontal", "vertical", "diagonal"], default: "vertical" },
            _id: false,
        },
        animation: {
            enter: { type: String },
            exit: { type: String },
            _id: false,
        },
        _id: false,
    },
    layoutConfig: {
        mode: { type: String, enum: ["auto", "manual"], default: "manual" },
        tier: { type: Number, default: 0 },
        order: { type: Number, default: 0 },
        _id: false,
    },
  },
  { _id: false } // ไม่สร้าง _id สำหรับ subdocument นี้โดยอัตโนมัติ
);

/**
 * @interface IStoryMapEdgeCondition
 * @description นิพจน์เงื่อนไขสำหรับ Edge
 * @property {string} expression - นิพจน์ (เช่น "variables.karma > 10 && flags.met_character_A === true")
 * จะถูกประมวลผลโดย Condition Engine ในฝั่ง backend/game runtime
 */
export interface IStoryMapEdgeCondition {
    expression: string;
}
const StoryMapEdgeConditionSchema = new Schema<IStoryMapEdgeCondition>(
    {
        expression: { type: String, required: true, trim: true, maxlength: [5000, "Edge condition script is too long"] },
    },
    {_id: false}
);

/**
 * @interface IStoryMapEdge
 * @description เส้นเชื่อม (Edge) ระหว่างโหนดสองโหนดในแผนผังเนื้อเรื่อง
 * @property {string} edgeId - ID เฉพาะของเส้นเชื่อมนี้ (เช่น UUID, **ต้อง unique ภายใน StoryMap เดียวกัน**, Client สร้าง)
 * @property {string} sourceNodeId - ID ของโหนดต้นทาง
 * @property {string} [sourceHandleId] - (Optional) ID ของ handle/port ที่จุดปล่อยของโหนดต้นทาง (สำหรับโหนดที่มีหลาย output)
 * @property {"top" | "bottom" | "left" | "right"} [sourceHandlePosition] - ตำแหน่งของ handle ต้นทาง
 * @property {string} targetNodeId - ID ของโหนดปลายทาง
 * @property {string} [targetHandleId] - (Optional) ID ของ handle/port ที่จุดรับของโหนดปลายทาง (สำหรับโหนดที่มีหลาย input)
 * @property {"top" | "bottom" | "left" | "right"} [targetHandlePosition] - ตำแหน่งของ handle ปลายทาง
 * @property {Types.ObjectId} [triggeringChoiceId] - ID ของ Choice ที่ทำให้เกิดการเปลี่ยนผ่านตามเส้นเชื่อมนี้ (ถ้าเส้นเชื่อมนี้เกิดจาก Choice)
 * @property {string} [label] - ป้ายกำกับของเส้นเชื่อม (สำหรับแสดงใน Editor, เช่น "ถ้าเลือก A", "ถ้าค่า X > 10")
 * @property {IStoryMapEdgeCondition} [condition] - (Optional) เงื่อนไขที่ต้องเป็นจริงเพื่อให้เส้นเชื่อมนี้สามารถใช้งานได้
 * @property {number} [priority] - ลำดับความสำคัญของเส้นเชื่อม (ถ้ามีหลายเส้นเชื่อมออกจากโหนดเดียวกันและเงื่อนไขซ้อนทับกัน)
 * @property {any} [edgeSpecificData] - ข้อมูลเฉพาะสำหรับเส้นเชื่อมนี้
 * @property {string[]} [authorDefinedEmotionTags] - แท็กอารมณ์ที่ผู้เขียนกำหนดสำหรับเส้นเชื่อมนี้ (เช่น อารมณ์ของการเปลี่ยนผ่าน)
 * @property {number} [authorDefinedPsychologicalImpact] - ค่าผลกระทบทางจิตวิทยาที่ผู้เขียนกำหนดสำหรับเส้นเชื่อมนี้
 * @property {object} [editorVisuals] - (Optional) การตั้งค่าการแสดงผลใน Editor
 * @property {string} [editorVisuals.color] - สีของเส้น
 * @property {"solid" | "dashed" | "dotted"} [editorVisuals.lineStyle] - รูปแบบเส้น
 * @property {boolean} [editorVisuals.animated] - เส้นมีการเคลื่อนไหวหรือไม่
 * @property {"straight" | "smooth" | "step" | "bezier"} [editorVisuals.pathType] - รูปแบบเส้นทาง
 * @property {number} [editorVisuals.strokeWidth] - ความหนาของเส้น
 * @property {string} [editorVisuals.markerEnd] - รูปแบบลูกศรปลายทาง
 * @property {object} [editorVisuals.labelStyle] - การจัดรูปแบบของ label
 */
export interface IStoryMapEdge {
  edgeId: string; // Client-generated UUID
  sourceNodeId: string;
  sourceHandleId?: string;
  sourceHandlePosition?: "top" | "bottom" | "left" | "right"; // ตำแหน่งของ handle ต้นทาง
  targetNodeId: string;
  targetHandleId?: string;
  targetHandlePosition?: "top" | "bottom" | "left" | "right"; // ตำแหน่งของ handle ปลายทาง
  triggeringChoiceId?: Types.ObjectId; // Ref to Choice.ts
  label?: string;
  condition?: IStoryMapEdgeCondition;
  priority?: number;
  edgeSpecificData?: any;
  authorDefinedEmotionTags?: string[];
  authorDefinedPsychologicalImpact?: number;
  editorVisuals?: {
    color?: string;
    lineStyle?: "solid" | "dashed" | "dotted";
    animated?: boolean;
    pathType?: "straight" | "smooth" | "step" | "bezier"; // รูปแบบเส้นทาง
    strokeWidth?: number; // ความหนาของเส้น
    markerEnd?: string; // รูปแบบลูกศรปลายทาง
    labelStyle?: {
      fontSize?: number;
      fontWeight?: string;
      color?: string;
      backgroundColor?: string;
      borderRadius?: number;
    }; // การจัดรูปแบบของ label
  };
}
const StoryMapEdgeSchema = new Schema<IStoryMapEdge>(
  {
    edgeId: { type: String, required: [true, "Edge ID is required"], trim: true, maxlength: [100, "Edge ID is too long"], comment: "UUID ที่สร้างจาก Client-side Editor" },
    sourceNodeId: { type: String, required: [true, "Source Node ID is required"], trim: true },
    sourceHandleId: { type: String, trim: true },
    sourceHandlePosition: { type: String, enum: ["top", "bottom", "left", "right"], default: "bottom" },
    targetNodeId: { type: String, required: [true, "Target Node ID is required"], trim: true },
    targetHandleId: { type: String, trim: true },
    targetHandlePosition: { type: String, enum: ["top", "bottom", "left", "right"], default: "top" },
    triggeringChoiceId: { type: Schema.Types.ObjectId, ref: "Choice" },
    label: { type: String, trim: true, maxlength: [255, "Edge label is too long"] },
    condition: { type: StoryMapEdgeConditionSchema },
    priority: { type: Number, default: 0 },
    edgeSpecificData: { type: Schema.Types.Mixed },
    authorDefinedEmotionTags: [{ type: String, trim: true, lowercase: true, maxlength: [50, "Emotion tag is too long"] }],
    authorDefinedPsychologicalImpact: { type: Number, comment: "ค่าผลกระทบทางจิตใจ เช่น -5 ถึง +5" },
    editorVisuals: {
        color: { type: String, trim: true },
        lineStyle: { type: String, enum: ["solid", "dashed", "dotted"], default: "solid" },
        animated: { type: Boolean, default: false },
        pathType: { type: String, enum: ["straight", "smooth", "step", "bezier"], default: "smooth" },
        strokeWidth: { type: Number, default: 2, min: 1, max: 10 },
        markerEnd: { type: String, trim: true },
        labelStyle: {
            fontSize: { type: Number, default: 12, min: 8, max: 24 },
            fontWeight: { type: String, enum: ["normal", "bold", "lighter", "bolder"], default: "normal" },
            color: { type: String, trim: true },
            backgroundColor: { type: String, trim: true },
            borderRadius: { type: Number, default: 4, min: 0, max: 20 },
            _id: false,
        },
        _id: false,
    },
  },
  { _id: false } // ไม่สร้าง _id สำหรับ subdocument นี้โดยอัตโนมัติ
);

/**
 * @interface IStoryMapGroup
 * @description การจัดกลุ่มโหนดใน StoryMap Editor เพื่อความเป็นระเบียบ
 * @property {string} groupId - ID เฉพาะของกลุ่ม (Client-generated UUID)
 * @property {string} title - ชื่อกลุ่ม
 * @property {string[]} nodeIds - Array ของ nodeId ที่อยู่ในกลุ่มนี้
 * @property {object} position - ตำแหน่งของกลุ่มใน Editor
 * @property {object} dimensions - ขนาดของกลุ่มใน Editor
 * @property {string} [color] - สีพื้นหลังของกลุ่มใน Editor
 * @property {number} [zIndex] - ลำดับการซ้อนทับของกลุ่มใน Editor
 * @property {string} [notes] - หมายเหตุสำหรับกลุ่ม
 */
export interface IStoryMapGroup {
    groupId: string;
    title: string;
    nodeIds: string[];
    position: { x: number; y: number };
    dimensions: { width: number; height: number };
    color?: string;
    zIndex?: number;
    notes?: string;
}
const StoryMapGroupSchema = new Schema<IStoryMapGroup>(
    {
        groupId: { type: String, required: true, trim: true, comment: "UUID ที่สร้างจาก Client-side Editor" },
        title: { type: String, required: true, trim: true, maxlength: [150, "Group title is too long"] },
        nodeIds: [{ type: String, required: true, trim: true }],
        position: {
            x: { type: Number, required: true },
            y: { type: Number, required: true },
            _id: false,
        },
        dimensions: {
            width: { type: Number, required: true },
            height: { type: Number, required: true },
            _id: false,
        },
        color: { type: String, trim: true },
        zIndex: { type: Number, default: 0 },
        notes: { type: String, trim: true, maxlength: [1000, "Group notes are too long"] },
    },
    {_id: false}
);

/**
 * @interface IEditOperation
 * @description การดำเนินการแก้ไขหนึ่งครั้งในประวัติ
 * @property {Date} timestamp - เวลาที่แก้ไข
 * @property {Types.ObjectId} userId - ผู้ใช้ที่แก้ไข
 * @property {string} operationType - ประเภทการดำเนินการ (เช่น "add_node", "move_edge", "update_variable")
 * @property {string} [description] - คำอธิบายการแก้ไข
 * @property {any} [details] - ข้อมูลรายละเอียดของการเปลี่ยนแปลง (เช่น diff object)
 */
export interface IEditOperation {
    timestamp: Date;
    userId: Types.ObjectId; // Ref to User.ts
    operationType: string;
    description?: string;
    details?: any;
}
const EditOperationSchema = new Schema<IEditOperation>(
    {
        timestamp: {type: Date, default: Date.now, required: true},
        userId: {type: Schema.Types.ObjectId, ref: "User", required: true},
        operationType: {type: String, required: true, trim: true, maxlength: [100, "Operation type is too long"]},
        description: {type: String, trim: true, maxlength: [500, "Edit description is too long"]},
        details: {type: Schema.Types.Mixed}
    }, {_id: false}
);


// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร StoryMap (IStoryMap Document Interface)
// ==================================================================================================

/**
 * @interface IStoryMap
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารแผนผังเนื้อเรื่องใน Collection "storymaps"
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสาร StoryMap
 * @property {Types.ObjectId} novelId - ID ของนิยายที่ StoryMap นี้เป็นส่วนหนึ่ง (อ้างอิง Novel model, **ต้อง unique ต่อ novelId + version หรือ novelId + isActive=true**)
 * @property {string} title - ชื่อของ StoryMap นี้ (เช่น "โครงเรื่องหลัก", "บทที่ 1 - การผจญภัยเริ่มต้น")
 * @property {number} version - หมายเลขเวอร์ชันของ StoryMap นี้ (สำหรับการย้อนกลับหรือเปรียบเทียบ)
 * @property {string} [description] - คำอธิบายภาพรวมของ StoryMap หรือเวอร์ชันนี้
 * @property {IStoryMapNode[]} nodes - รายการโหนดทั้งหมดในแผนผัง (Mongoose จะไม่สร้าง _id ให้ subdocument ถ้า schema มี _id: false)
 * @property {IStoryMapEdge[]} edges - รายการเส้นเชื่อมทั้งหมดในแผนผัง
 * @property {IStoryMapGroup[]} [groups] - (Optional) การจัดกลุ่มโหนดใน Editor
 * @property {string} startNodeId - ID ของโหนดที่เป็นจุดเริ่มต้นของเนื้อเรื่องใน StoryMap นี้
 * @property {IStoryVariableDefinition[]} storyVariables - รายการตัวแปรทั้งหมดที่กำหนดไว้สำหรับใช้ในนิยาย/StoryMap นี้
 * @property {object} [editorMetadata] - ข้อมูล Meta สำหรับ StoryMap Editor (เช่น zoom level, view offset, grid settings, autoLayoutConfig)
 * @property {Types.ObjectId} lastModifiedByUserId - ID ของผู้ใช้ที่แก้ไข StoryMap นี้ล่าสุด (อ้างอิง User model)
 * @property {Date} [lastPublishedAt] - วันที่เผยแพร่ StoryMap เวอร์ชันนี้ล่าสุด (ถ้ามีระบบ publish แยก)
 * @property {boolean} isActive - StoryMap เวอร์ชันนี้เป็นเวอร์ชันที่ใช้งานอยู่หรือไม่ (สำหรับกรณีที่มีหลายเวอร์ชัน)
 * @property {IEditOperation[]} [editHistory] - (Optional) ประวัติการแก้ไข StoryMap (อาจเก็บเฉพาะ N รายการล่าสุด หรือใน collection แยกถ้าเยอะมาก)
 * @property {object} [analyticsSummary] - (Optional) สรุปข้อมูลวิเคราะห์ของ StoryMap นี้ (เช่น path ยอดนิยม, % การจบแต่ละ ending)
 * @property {string} [globalTheme] - (Optional) ธีมสีหรือสไตล์โดยรวมของ StoryMap ใน Editor
 * @property {Date} createdAt - วันที่สร้างเอกสาร StoryMap (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตเอกสาร StoryMap ล่าสุด (Mongoose `timestamps`)
 */
export interface IStoryMap extends Document {
  _id: Types.ObjectId;
  novelId: Types.ObjectId;
  episodeId?: Types.ObjectId; // 🎯 NEW: เชื่อมโยงกับ Episode เฉพาะ (optional สำหรับ backward compatibility)
  title: string;
  version: number;
  description?: string;
  nodes: IStoryMapNode[]; // เปลี่ยนจาก Types.DocumentArray เป็น Array ตรงๆ
  edges: IStoryMapEdge[]; // เปลี่ยนจาก Types.DocumentArray เป็น Array ตรงๆ
  groups?: IStoryMapGroup[];
  startNodeId: string;
  storyVariables: IStoryVariableDefinition[]; // เปลี่ยนจาก Types.DocumentArray เป็น Array ตรงๆ
  editorMetadata?: {
    zoomLevel?: number;
    viewOffsetX?: number;
    viewOffsetY?: number;
    gridSize?: number;
    showGrid?: boolean;
    showSceneThumbnails?: boolean; // Blueprint Tab setting
    showNodeLabels?: boolean; // Blueprint Tab setting
    autoLayoutAlgorithm?: "dagre" | "elk" | "custom"; // สำหรับ auto-layout
    layoutEngineSettings?: any; // การตั้งค่าเฉพาะของ layout engine
    layoutPreferences?: { // การตั้งค่าการจัดเรียง
        defaultOrientation?: "vertical" | "horizontal"; // แนวการจัดเรียงหลัก
        nodeSpacing?: { x: number; y: number }; // ระยะห่างระหว่างโหนด
        tierSpacing?: number; // ระยะห่างระหว่างชั้น
        autoAlign?: boolean; // จัดเรียงอัตโนมัติ
        preserveManualPositions?: boolean; // รักษาตำแหน่งที่จัดด้วยมือ
        flowDirection?: "top-down" | "bottom-up" | "left-right" | "right-left"; // ทิศทางการไหล
    };
    uiPreferences?: { // การตั้งค่า UI ของ editor
        nodeDefaultColor?: string;
        edgeDefaultColor?: string;
        connectionLineStyle?: "solid" | "dashed" | "dotted";
        showConnectionLines?: boolean;
        autoSaveEnabled?: boolean;
        autoSaveIntervalSec?: 15 | 30;
        snapToGrid?: boolean;
        enableAnimations?: boolean; // Professional mode toggle
        nodeDefaultOrientation?: "vertical" | "horizontal"; // แนวโหนดเริ่มต้น
        edgeDefaultPathType?: "straight" | "smooth" | "step" | "bezier"; // รูปแบบเส้นเริ่มต้น
        showMinimap?: boolean; // แสดง minimap
        enableNodeThumbnails?: boolean; // เปิด thumbnails สำหรับ scene nodes
    };
    collaborationSettings?: { // Real-time collaboration features
        allowMultipleEditors?: boolean;
        showCursors?: boolean;
        showUserAvatars?: boolean;
        lockTimeout?: number; // seconds before releasing lock
    };
    performanceSettings?: { // Performance optimization
        virtualizeNodes?: boolean; // For large graphs
        maxVisibleNodes?: number;
        chunkSize?: number; // For pagination
        enableCaching?: boolean;
    };
    [key: string]: any; // For other editor-specific settings
  };
  lastModifiedByUserId: Types.ObjectId;
  lastPublishedAt?: Date;
  isActive: boolean;
  editHistory?: IEditOperation[];
  analyticsSummary?: {
      mostTakenPaths?: Array<{path: string[], count: number}>;
      endingCompletionRates?: Array<{endingNodeId: string, percentage: number}>;
      averagePlaythroughTimeMs?: number;
      // ... more analytics data
  };
  globalTheme?: string;
  
  // Real-time collaboration และ auto-save optimization
  currentEditors?: Array<{
    userId: Types.ObjectId;
    sessionId: string;
    lastActiveAt: Date;
    cursorPosition?: { x: number; y: number };
    isEditing?: boolean;
    lockedNodes?: string[]; // Node IDs currently being edited
  }>;
  
  // Command-based saves for better performance  
  pendingCommands?: Array<{
    commandId: string;
    userId: Types.ObjectId;
    type: 'node_add' | 'node_update' | 'node_delete' | 'edge_add' | 'edge_update' | 'edge_delete' | 'batch';
    timestamp: Date;
    data: any;
    applied?: boolean;
  }>;
  
  // Version control และ conflict resolution
  etag?: string; // For optimistic concurrency control
  lastSyncedAt?: Date;
  conflictResolutionStrategy?: 'last_write_wins' | 'merge' | 'manual';
  
  createdAt: Date;
  updatedAt: Date;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ StoryMap (StoryMapSchema)
// ==================================================================================================
const StoryMapSchema = new Schema<IStoryMap>(
  {
    novelId: {
      type: Schema.Types.ObjectId,
      ref: "Novel", // อ้างอิง Novel.ts
      required: [true, "กรุณาระบุ ID ของนิยาย (Novel ID is required)"],
      index: true,
    },
    episodeId: {
      type: Schema.Types.ObjectId,
      ref: "Episode", // 🎯 NEW: อ้างอิง Episode.ts
      index: true,
      comment: "ID ของตอนที่ StoryMap นี้เป็นของ (optional สำหรับ backward compatibility)"
    },
    title: {
        type: String,
        required: [true, "กรุณาระบุชื่อ StoryMap (StoryMap title is required)"],
        trim: true,
        maxlength: [200, "ชื่อ StoryMap ยาวเกินไป (ไม่เกิน 200 ตัวอักษร)"]
    },
    version: {
      type: Number,
      required: [true, "กรุณาระบุหมายเลขเวอร์ชัน (Version number is required)"],
      default: 1,
      min: [1, "หมายเลขเวอร์ชันต้องเป็นค่าบวก"],
    },
    description: { type: String, trim: true, maxlength: [2000, "คำอธิบาย StoryMap ยาวเกินไป"] },
    nodes: { type: [StoryMapNodeSchema], default: [] }, // ใช้ schema ที่กำหนดไว้
    edges: { type: [StoryMapEdgeSchema], default: [] }, // ใช้ schema ที่กำหนดไว้
    groups: { type: [StoryMapGroupSchema], default: [] },
    startNodeId: { type: String, required: [true, "กรุณาระบุ Node เริ่มต้น (Start Node ID is required)"], trim: true },
    storyVariables: { type: [StoryVariableDefinitionSchema], default: [] }, // ใช้ schema ที่กำหนดไว้
    editorMetadata: { type: Schema.Types.Mixed },
    lastModifiedByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User", // อ้างอิง User.ts
      required: [true, "กรุณาระบุ ID ของผู้แก้ไขล่าสุด (Last modified by User ID is required)"],
    },
    lastPublishedAt: { type: Date },
    isActive: { type: Boolean, default: true, index: true },
    editHistory: { type: [EditOperationSchema], select: false }, // Select: false เพื่อไม่ให้ดึงมาโดย default
    analyticsSummary: { type: Schema.Types.Mixed, select: false },
    globalTheme: { type: String, trim: true },
  },
  {
    timestamps: true, // เพิ่ม createdAt และ updatedAt โดยอัตโนมัติ
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    // Strict mode: Mongoose จะโยน error ถ้าพยายาม save field ที่ไม่ได้กำหนดใน schema
    // ยกเว้น editorMetadata และ analyticsSummary ที่เป็น Mixed
    strict: "throw",
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

// Compound index สำหรับการ query StoryMap ที่ active ของ novel หนึ่งๆ และเวอร์ชัน (สำคัญมาก)
StoryMapSchema.index({ novelId: 1, isActive: 1, version: -1 }, { name: "NovelActiveVersionStoryMapIndex" });

// 🎯 NEW: Index สำหรับ Episode-specific StoryMaps (แต่ละ Episode มี StoryMap แยกต่างหาก)
StoryMapSchema.index({ novelId: 1, episodeId: 1, version: 1 }, { 
  unique: true, 
  sparse: true, 
  name: "NovelEpisodeStoryMapVersionUniqueIndex", 
  comment: "แต่ละ Episode ควรมี version ที่ไม่ซ้ำกัน",
  partialFilterExpression: { episodeId: { $exists: true } } // เฉพาะ StoryMap ที่มี episodeId
});

// 🔄 UPDATED: Index สำหรับ Novel-level StoryMaps (ไม่มี episodeId)
StoryMapSchema.index({ novelId: 1, version: 1 }, { 
  unique: true, 
  sparse: true, 
  name: "NovelStoryMapVersionUniqueIndex", 
  comment: "แต่ละ Novel ควรมี version ที่ไม่ซ้ำกัน (สำหรับ Novel-level StoryMaps)",
  partialFilterExpression: { episodeId: { $exists: false } } // เฉพาะ StoryMap ที่ไม่มี episodeId
});
StoryMapSchema.index({ "groups.groupId": 1 }, { unique: true, sparse: true });

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

// Middleware: ก่อนบันทึก (save)
StoryMapSchema.pre<IStoryMap>("save", async function (next) {
  // 1. ตรวจสอบความ unique ของ nodeId, edgeId, groupId, variableId ภายใน StoryMap เดียวกัน
  const validateUniqueIds = (items: Array<{nodeId?: string; edgeId?: string; groupId?: string; variableId?: string}>, idField: "nodeId" | "edgeId" | "groupId" | "variableId", itemName: string) => {
    if (items && items.length > 0) {
      const ids = items.map(item => item[idField]).filter(id => id !== undefined) as string[];
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        return next(new Error(`รหัส ${itemName} ID ภายใน StoryMap ต้องไม่ซ้ำกัน (${itemName} IDs must be unique within a StoryMap).`));
      }
    }
  };

  if (this.isModified("nodes")) validateUniqueIds(this.nodes, "nodeId", "Node");
  if (this.isModified("edges")) validateUniqueIds(this.edges, "edgeId", "Edge");
  if (this.isModified("groups") && this.groups) validateUniqueIds(this.groups, "groupId", "Group");
  if (this.isModified("storyVariables")) validateUniqueIds(this.storyVariables, "variableId", "Story Variable");


  // 2. ตรวจสอบว่า sourceNodeId และ targetNodeId ของ Edges มีอยู่จริงใน Nodes
  if (this.isModified("edges") || this.isModified("nodes")) {
    if (this.edges && this.nodes) {
        const allNodeIdsSet = new Set(this.nodes.map(node => node.nodeId));
        for (const edge of this.edges) {
          if (!allNodeIdsSet.has(edge.sourceNodeId)) {
            return next(new Error(`Edge '${edge.edgeId}' มี sourceNodeId '${edge.sourceNodeId}' ที่ไม่มีอยู่จริงในรายการ Nodes.`));
          }
          if (!allNodeIdsSet.has(edge.targetNodeId)) {
            return next(new Error(`Edge '${edge.edgeId}' มี targetNodeId '${edge.targetNodeId}' ที่ไม่มีอยู่จริงในรายการ Nodes.`));
          }
          // ตรวจสอบ sourceHandleId และ targetHandleId ถ้า editor มีการใช้ multiple handles/ports
        }
    }
  }

  // 3. ตรวจสอบว่า startNodeId มีอยู่จริงใน Nodes
  if (this.isModified("startNodeId") || this.isModified("nodes")) {
    if (this.startNodeId && this.nodes && !this.nodes.some(node => node.nodeId === this.startNodeId)) {
      return next(new Error(`Start Node ID '${this.startNodeId}' ไม่พบในรายการ Nodes ของ StoryMap นี้`));
    }
  }

  // 4. ตรวจสอบความ unique ของ variableName ใน storyVariables (เพิ่มเติมจาก variableId)
  if (this.isModified("storyVariables") && this.storyVariables) {
    const varNames = this.storyVariables.map(v => v.variableName);
    const uniqueVarNames = new Set(varNames);
    if (varNames.length !== uniqueVarNames.size) {
      return next(new Error("ชื่อตัวแปร (variableName) ใน storyVariables ต้องไม่ซ้ำกัน"));
    }
  }

  // 5. ถ้า StoryMap นี้ถูกตั้งค่าเป็น active, ตรวจสอบว่าไม่มี StoryMap อื่นของ Novel เดียวกันที่ active อยู่
  if (this.isModified("isActive") && this.isActive) {
    const StoryMapModelConst = models.StoryMap || model<IStoryMap>("StoryMap");
    const existingActiveStoryMap = await StoryMapModelConst.findOne({
      novelId: this.novelId,
      isActive: true,
      _id: { $ne: this._id } // ไม่ใช่ตัวมันเอง
    });
    if (existingActiveStoryMap) {
      // ทางเลือก: ปิดการใช้งาน StoryMap อื่นๆ ที่ active อยู่สำหรับ Novel นี้
      await StoryMapModelConst.updateMany(
          { novelId: this.novelId, _id: { $ne: this._id }, isActive: true },
          { $set: { isActive: false, updatedAt: new Date() } }
      );
      console.log(`[StoryMapMiddleware] Deactivated other active StoryMaps for Novel ID: ${this.novelId}`);
    }
  }

  // 6. อัปเดต version และ lastModifiedByUserId (ถ้ามีการแก้ไขจริง)
  // Mongoose timestamps จะจัดการ updatedAt ให้อยู่แล้ว
  // Version อาจจะ increment ก็ต่อเมื่อมีการเปลี่ยนแปลงที่สำคัญ (เช่น nodes, edges, storyVariables)
  // ส่วนนี้เป็นการสาธิต, logic การ increment version อาจจะซับซ้อนกว่านี้
  if (!this.isNew && (this.isModified("nodes") || this.isModified("edges") || this.isModified("storyVariables"))) {
    this.version = (this.version || 0) + 1;
    // lastModifiedByUserId ควรจะถูกตั้งค่าจาก context ของ request ที่ทำการแก้ไข
  }
  if (this.isNew) {
    this.version = 1; // Version เริ่มต้น
  }


  // 7. (สำหรับข้อ 5 Real-time Collaboration - แนวคิด)
  // หากมีการ implement real-time collaboration, ส่วนนี้อาจจะต้องมี logic ตรวจสอบ conflict
  // หรือการ merge การเปลี่ยนแปลงจากผู้ใช้หลายคน (เช่น โดยใช้ CRDTs หรือ optimistic/pessimistic locking)
  // ตัวอย่าง:
  // if (this.isModified() && this._originalVersion && this.version < this._originalVersion) {
  //   return next(new Error("Conflict: StoryMap has been modified by another user. Please refresh and try again."));
  // }

  // 8. (สำหรับข้อ 6 Performance - แนวคิด)
  // หาก nodes/edges มีจำนวนมาก, การ validate ทั้งหมดใน pre-save hook อาจจะช้า
  // อาจจะต้องมี batch validation หรือ async validation process แยกต่างหาก
  // หรือใช้ database-level constraints ถ้าเป็นไปได้ (MongoDB มีข้อจำกัดเรื่องนี้)

  next();
});

// Middleware: หลังจากบันทึก (save) เพื่ออัปเดตข้อมูลใน Novel (เช่น lastContentUpdatedAt)
StoryMapSchema.post<IStoryMap>("save", async function (doc) {
  try {
    const NovelModel = models.Novel || model("Novel");
    // อัปเดต lastContentUpdatedAt ของ Novel และอาจจะอัปเดต activeStoryMapId
    const updateOps: any = { $set: { lastContentUpdatedAt: new Date() } };
    if (doc.isActive) {
        // ถ้า StoryMap นี้ active, อาจจะต้องการเก็บ ObjectId ของมันไว้ใน Novel model
        // updateOps.$set.activeStoryMapId = doc._id;
    }
    await NovelModel.findByIdAndUpdate(doc.novelId, updateOps);
  } catch (error) {
    console.error(`[StoryMapMiddlewareError] Failed to update Novel after saving StoryMap ${doc._id}:`, error);
  }
});

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

// Guard against client-side execution
let StoryMapModel: mongoose.Model<IStoryMap>;

if (typeof window === 'undefined') {
  // Server-side only
  StoryMapModel = (models.StoryMap as mongoose.Model<IStoryMap>) || model<IStoryMap>("StoryMap", StoryMapSchema);
} else {
  // Client-side - throw error if accessed
  StoryMapModel = {} as mongoose.Model<IStoryMap>;
}

export default StoryMapModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Node/Edge ID Generation**: (ยังคงเดิม) `nodeId`, `edgeId`, `groupId`, `variableId` ควรถูกสร้างจาก client-side (StoryMap Editor) เช่น UUID v4.
// 2.  **Condition Engine**: (ยังคงเดิม) `condition.expression` ใน `IStoryMapEdge` และเงื่อนไขใน Node ต่างๆ ต้องการ Condition Engine ที่ robust.
// 3.  **Variable Management**: (ยังคงเดิม) `storyVariables` และการแก้ไขค่าตัวแปรต้องการระบบจัดการที่มีประสิทธิภาพ.
// 4.  **NodeSpecificData Typing**: (ปรับปรุงแล้ว) มีการเพิ่ม Interfaces (ISceneNodeData, etc.) สำหรับ `nodeSpecificData` เพื่อ type safety ที่ดีขึ้น. ควรมีการ validate schema ของ `nodeSpecificData` ตาม `nodeType` ใน pre-save hook หรือ service layer.
// 5.  **Real-time Collaboration**: (ยังไม่ได้ implement ใน schema) หากต้องการ, อาจจะต้องเพิ่ม fields เช่น `lockedByUserId`, `lastLockTimestamp` หรือใช้ external service.
// 6.  **Performance for Large Maps**: (ยังคงเดิม) การ query และ render อาจต้อง optimize. การใช้ virtual scrolling/rendering ใน editor, pagination สำหรับ nodes/edges ถ้าจำเป็น, และ query ที่เฉพาะเจาะจงมากขึ้น.
// 7.  **Import/Export**: (ยังไม่ได้ implement ใน schema) ควรมี API endpoints สำหรับการ import/export StoryMap data (เช่น JSON).
// 8.  **Visual Editor Integration**: (ปรับปรุงแล้ว) เพิ่ม `dimensions`, `editorVisuals` (color, icon, zIndex, animation) ใน `IStoryMapNode`, `editorVisuals` ใน `IStoryMapEdge`, และ `IStoryMapGroup` รวมถึง `editorMetadata` ใน `IStoryMap` เพื่อรองรับ UI editor.
// 9.  **Versioning and Rollback**: (ปรับปรุงแล้ว) มี `version` และ `isActive`. `editHistory` ถูกเพิ่มเพื่อ track การเปลี่ยนแปลง, ซึ่งจะช่วยในการ rollback (logic การ rollback จะอยู่นอก schema นี้).
// 10. **Psychological Impact Path Analysis**: (ยังคงเดิม) `authorDefinedEmotionTags` และ `authorDefinedPsychologicalImpact` ในโหนดและเส้นเชื่อมยังคงมีอยู่สำหรับการวิเคราะห์. `analyticsSummary` ใน `IStoryMap` สามารถใช้เก็บผลการวิเคราะห์ได้.
// 11. **Sub-document Schema Validation**: สำหรับ `nodeSpecificData` ที่เป็น `Mixed`, ควรมีการใช้ Mongoose Discriminators หรือ custom validation ใน `pre('save')` เพื่อ validate โครงสร้างข้อมูลตาม `nodeType` จริงๆ. ตัวอย่าง:
//     StoryMapNodeSchema.path('nodeSpecificData').discriminator('scene_node_data', new Schema<ISceneNodeData>({ sceneId: { type: Schema.Types.ObjectId, ref: "Scene", required: true }}));
//     การทำเช่นนี้จะทำให้ Mongoose validate ข้อมูลได้ลึกขึ้น แต่จะเพิ่มความซับซ้อนของ Schema.
//     ในเวอร์ชันนี้ ยังคงเป็น Mixed แต่ได้เพิ่ม Interfaces เพื่อ guide การใช้งาน.
// 12. **Consistency Check for IDs**: Middleware `pre('save')` ได้เพิ่มการตรวจสอบว่า `nodeId` และ `edgeId` ไม่ซ้ำกัน และ `startNodeId`, `sourceNodeId`, `targetNodeId` อ้างอิงถึง `nodeId` ที่มีอยู่จริง.
// 13. **Linking Choices**: `IChoiceNodeData` อ้างอิง `choiceIds: Types.ObjectId[]` ไปยัง `Choice` model ซึ่งเป็นแนวทางที่ดีกว่าการ embed choice ทั้งหมดโดยตรงใน StoryMap node, ช่วยให้ Choice model จัดการความซับซ้อนของตัวเองได้.
// ==================================================================================================