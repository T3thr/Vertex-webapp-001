// src/backend/models/StoryMap.ts
// โมเดลแผนผังเนื้อเรื่อง (StoryMap Model)
// จัดการโครงสร้าง, ความเชื่อมโยงของฉาก (Scenes), ทางเลือก (Choices), ตัวแปร, และเงื่อนไขต่างๆ ใน Visual Novel
// เน้นความยืดหยุ่นสำหรับผู้เขียน, การรองรับการวิเคราะห์, และประสิทธิภาพ

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล StoryMap
// ==================================================================================================

/**
 * @enum {string} StoryMapNodeType
 * @description ประเภทของโหนด (Node) ในแผนผังเนื้อเรื่อง (StoryMap)
 * - `scene_node`: โหนดที่แทนฉากปกติ (อ้างอิง Scene model)
 * - `choice_node`: โหนดที่แทนกลุ่มของตัวเลือก (Choices) ที่ผู้เล่นต้องเลือก (อาจจะอ้างอิง Choice model หรือเก็บ Choice IDs โดยตรง)
 * - `branch_point_node`: โหนดที่เป็นจุดเริ่มต้นของแขนงเรื่องราว (อาจมีเงื่อนไขในการเข้าถึง)
 * - `merge_point_node`: โหนดที่เป็นจุดรวมของแขนงเรื่องราวหลายเส้นทาง
 * - `ending_node`: โหนดที่แทนฉากจบของเนื้อเรื่อง (อาจมีหลายแบบ)
 * - `variable_modifier_node`: โหนดที่ใช้สำหรับการตั้งค่าหรือเปลี่ยนแปลงค่าตัวแปรของเรื่องราว (Story Variables)
 * - `conditional_logic_node`: โหนดที่ใช้สำหรับการตรวจสอบเงื่อนไขและเปลี่ยนเส้นทางตามผลลัพธ์ (เช่น IF-ELSE)
 * - `event_trigger_node`: โหนดที่ใช้สำหรับกระตุ้นเหตุการณ์พิเศษ (เช่น ปลดล็อก Achievement, เล่น Cutscene พิเศษ)
 * - `comment_node`: โหนดสำหรับผู้เขียนใส่หมายเหตุหรือคำอธิบายใน StoryMap Editor (ไม่ส่งผลต่อเกม)
 * - `start_node`: โหนดพิเศษที่เป็นจุดเริ่มต้นของนิยายเรื่องนี้
 * - `custom_logic_node`: โหนดสำหรับตรรกะที่ซับซ้อนที่กำหนดโดยผู้เขียน (อาจใช้ script)
 */
export enum StoryMapNodeType {
  SCENE_NODE = "scene_node",
  CHOICE_NODE = "choice_node", // อาจจะเก็บ array of choiceIds ที่มาจาก Scene นั้นๆ
  BRANCH_POINT_NODE = "branch_point_node",
  MERGE_POINT_NODE = "merge_point_node",
  ENDING_NODE = "ending_node",
  VARIABLE_MODIFIER_NODE = "variable_modifier_node",
  CONDITIONAL_LOGIC_NODE = "conditional_logic_node",
  EVENT_TRIGGER_NODE = "event_trigger_node",
  COMMENT_NODE = "comment_node",
  START_NODE = "start_node",
  CUSTOM_LOGIC_NODE = "custom_logic_node",
}

/**
 * @enum {string} StoryVariableDataType
 * @description ประเภทข้อมูลของตัวแปรในเนื้อเรื่อง (Story Variable)
 * - `boolean`: ค่าตรรกะ (true/false)
 * - `number`: ค่าตัวเลข (จำนวนเต็มหรือทศนิยม)
 * - `string`: ค่าข้อความ
 * - `character_status`: สถานะพิเศษของตัวละคร (เช่น "is_angry", "has_item_X")
 * - `relationship_level`: ระดับความสัมพันธ์ (อาจเป็นตัวเลข หรือ enum เช่น "friendly", "hostile")
 */
export enum StoryVariableDataType {
  BOOLEAN = "boolean",
  NUMBER = "number",
  STRING = "string",
  CHARACTER_STATUS = "character_status", // อาจจะต้องมี targetCharacterId
  RELATIONSHIP_LEVEL = "relationship_level", // อาจจะต้องมี targetCharacterId1, targetCharacterId2
}

/**
 * @interface IStoryVariableDefinition
 * @description การกำหนดตัวแปรที่ใช้ในเนื้อเรื่อง (สำหรับทั้ง Novel)
 * @property {string} variableName - ชื่อตัวแปร (ต้อง unique ภายใน Novel)
 * @property {StoryVariableDataType} dataType - ประเภทข้อมูลของตัวแปร
 * @property {any} initialValue - ค่าเริ่มต้นของตัวแปร
 * @property {string} [description] - คำอธิบายตัวแปร (สำหรับ Editor)
 * @property {any[]} [allowedValues] - (Optional) รายการค่าที่เป็นไปได้ (สำหรับ enum หรือ string ที่จำกัด)
 */
export interface IStoryVariableDefinition {
  variableName: string;
  dataType: StoryVariableDataType;
  initialValue: any;
  description?: string;
  allowedValues?: any[];
}
const StoryVariableDefinitionSchema = new Schema<IStoryVariableDefinition>(
  {
    variableName: { type: String, required: true, trim: true, maxlength: [100, "ชื่อตัวแปรยาวเกินไป"] },
    dataType: { type: String, enum: Object.values(StoryVariableDataType), required: true },
    initialValue: { type: Schema.Types.Mixed, required: true },
    description: { type: String, trim: true, maxlength: [500, "คำอธิบายตัวแปรยาวเกินไป"] },
    allowedValues: [{ type: Schema.Types.Mixed }],
  },
  { _id: false }
);

// ==================================================================================================
// SECTION: อินเทอร์เฟซสำหรับ Node และ Edge ใน StoryMap
// ==================================================================================================

/**
 * @interface IStoryMapNode
 * @description โหนด (Node) หนึ่งรายการในแผนผังเนื้อเรื่อง
 * @property {string} nodeId - ID เฉพาะของโหนดนี้ (เช่น UUID, **ต้อง unique ภายใน StoryMap เดียวกัน**)
 * @property {StoryMapNodeType} nodeType - ประเภทของโหนด
 * @property {string} title - ชื่อหรือป้ายกำกับของโหนด (สำหรับแสดงใน Editor)
 * @property {Types.ObjectId} [sceneId] - ID ของ Scene ที่โหนดนี้อ้างอิงถึง (ถ้า nodeType เป็น `scene_node` หรือ `ending_node`)
 * @property {Types.ObjectId[]} [choiceIds] - IDs ของ Choices ที่เกี่ยวข้องกับโหนดนี้ (ถ้า nodeType เป็น `choice_node`)
 * @property {object} position - ตำแหน่งของโหนดใน StoryMap Editor (สำหรับวาดแผนผัง)
 * @property {number} position.x - พิกัด X
 * @property {number} position.y - พิกัด Y
 * @property {any} [nodeSpecificData] - ข้อมูลเฉพาะสำหรับประเภทโหนดนั้นๆ (เช่น script สำหรับ `conditional_logic_node`, ตัวแปรที่จะแก้ไขสำหรับ `variable_modifier_node`)
 * @property {string} [notesForAuthor] - หมายเหตุสำหรับผู้เขียน (ไม่แสดงในเกม)
 * @property {string[]} [authorDefinedEmotionTags] - แท็กอารมณ์ที่ผู้เขียนกำหนดสำหรับโหนดนี้ (เช่น "tension", "relief", "mystery")
 * @property {number} [authorDefinedPsychologicalImpact] - ค่าผลกระทบทางจิตวิทยาที่ผู้เขียนกำหนด (อาจเป็นบวก/ลบ หรือ scale อื่นๆ)
 * @property {Date} [lastEdited] - วันที่แก้ไขโหนดนี้ล่าสุด
 */
export interface IStoryMapNode {
  nodeId: string;
  nodeType: StoryMapNodeType;
  title: string;
  sceneId?: Types.ObjectId; // Ref to Scene.ts
  choiceIds?: Types.ObjectId[]; // Ref to Choice.ts
  position: { x: number; y: number };
  nodeSpecificData?: any; // โครงสร้างขึ้นอยู่กับ nodeType
  notesForAuthor?: string;
  authorDefinedEmotionTags?: string[];
  authorDefinedPsychologicalImpact?: number;
  lastEdited?: Date;
}
const StoryMapNodeSchema = new Schema<IStoryMapNode>(
  {
    nodeId: { type: String, required: [true, "Node ID is required"], trim: true, maxlength: [100, "Node ID is too long"] },
    nodeType: { type: String, enum: Object.values(StoryMapNodeType), required: [true, "Node type is required"] },
    title: { type: String, required: [true, "Node title is required"], trim: true, maxlength: [255, "Node title is too long"] },
    sceneId: { type: Schema.Types.ObjectId, ref: "Scene" },
    choiceIds: [{ type: Schema.Types.ObjectId, ref: "Choice" }],
    position: {
      x: { type: Number, required: true, default: 0 },
      y: { type: Number, required: true, default: 0 },
      _id: false,
    },
    nodeSpecificData: { type: Schema.Types.Mixed },
    notesForAuthor: { type: String, trim: true, maxlength: [2000, "Author notes are too long"] },
    authorDefinedEmotionTags: [{ type: String, trim: true, lowercase: true, maxlength: [50, "Emotion tag is too long"] }],
    authorDefinedPsychologicalImpact: { type: Number },
    lastEdited: { type: Date, default: Date.now },
  },
  { _id: false } // ไม่สร้าง _id สำหรับ subdocument นี้
);

/**
 * @interface IStoryMapEdge
 * @description เส้นเชื่อม (Edge) ระหว่างโหนดสองโหนดในแผนผังเนื้อเรื่อง
 * @property {string} edgeId - ID เฉพาะของเส้นเชื่อมนี้ (เช่น UUID, **ต้อง unique ภายใน StoryMap เดียวกัน**)
 * @property {string} sourceNodeId - ID ของโหนดต้นทาง
 * @property {string} targetNodeId - ID ของโหนดปลายทาง
 * @property {Types.ObjectId} [triggeringChoiceId] - ID ของ Choice ที่ทำให้เกิดการเปลี่ยนผ่านตามเส้นเชื่อมนี้ (ถ้ามี)
 * @property {string} [label] - ป้ายกำกับของเส้นเชื่อม (สำหรับแสดงใน Editor, เช่น "ถ้าเลือก A", "ถ้าค่า X > 10")
 * @property {string} [conditionScript] - Script เงื่อนไข (JavaScript expression) ที่ต้องเป็นจริงเพื่อให้เส้นเชื่อมนี้สามารถใช้งานได้ (สำหรับ dynamic branching)
 * @property {number} [priority] - ลำดับความสำคัญของเส้นเชื่อม (ถ้ามีหลายเส้นเชื่อมออกจากโหนดเดียวกันและเงื่อนไขซ้อนทับกัน)
 * @property {any} [edgeSpecificData] - ข้อมูลเฉพาะสำหรับเส้นเชื่อมนี้
 * @property {string[]} [authorDefinedEmotionTags] - แท็กอารมณ์ที่ผู้เขียนกำหนดสำหรับเส้นเชื่อมนี้ (เช่น อารมณ์ของการเปลี่ยนผ่าน)
 * @property {number} [authorDefinedPsychologicalImpact] - ค่าผลกระทบทางจิตวิทยาที่ผู้เขียนกำหนดสำหรับเส้นเชื่อมนี้
 */
export interface IStoryMapEdge {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  triggeringChoiceId?: Types.ObjectId; // Ref to Choice.ts
  label?: string;
  conditionScript?: string; // e.g., "variables.karma > 10 && variables.hasMagicKey === true"
  priority?: number;
  edgeSpecificData?: any;
  authorDefinedEmotionTags?: string[];
  authorDefinedPsychologicalImpact?: number;
}
const StoryMapEdgeSchema = new Schema<IStoryMapEdge>(
  {
    edgeId: { type: String, required: [true, "Edge ID is required"], trim: true, maxlength: [100, "Edge ID is too long"] },
    sourceNodeId: { type: String, required: [true, "Source Node ID is required"], trim: true },
    targetNodeId: { type: String, required: [true, "Target Node ID is required"], trim: true },
    triggeringChoiceId: { type: Schema.Types.ObjectId, ref: "Choice" },
    label: { type: String, trim: true, maxlength: [255, "Edge label is too long"] },
    conditionScript: { type: String, trim: true, maxlength: [5000, "Condition script is too long"] },
    priority: { type: Number, default: 0 },
    edgeSpecificData: { type: Schema.Types.Mixed },
    authorDefinedEmotionTags: [{ type: String, trim: true, lowercase: true, maxlength: [50, "Emotion tag is too long"] }],
    authorDefinedPsychologicalImpact: { type: Number },
  },
  { _id: false } // ไม่สร้าง _id สำหรับ subdocument นี้
);

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร StoryMap (IStoryMap Document Interface)
// ==================================================================================================

/**
 * @interface IStoryMap
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารแผนผังเนื้อเรื่องใน Collection "storymaps"
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสาร StoryMap
 * @property {Types.ObjectId} novelId - ID ของนิยายที่ StoryMap นี้เป็นส่วนหนึ่ง (อ้างอิง Novel model, **ต้อง unique**)
 * @property {number} version - หมายเลขเวอร์ชันของ StoryMap นี้ (สำหรับการย้อนกลับหรือเปรียบเทียบ)
 * @property {string} [description] - คำอธิบายภาพรวมของ StoryMap หรือเวอร์ชันนี้
 * @property {Types.DocumentArray<IStoryMapNode>} nodes - รายการโหนดทั้งหมดในแผนผัง
 * @property {Types.DocumentArray<IStoryMapEdge>} edges - รายการเส้นเชื่อมทั้งหมดในแผนผัง
 * @property {string} startNodeId - ID ของโหนดที่เป็นจุดเริ่มต้นของเนื้อเรื่อง
 * @property {Types.DocumentArray<IStoryVariableDefinition>} storyVariables - รายการตัวแปรทั้งหมดที่กำหนดไว้สำหรับใช้ในนิยายนี้
 * @property {any} [editorMetadata] - ข้อมูล Meta สำหรับ StoryMap Editor (เช่น zoom level, view offset, grid settings)
 * @property {Types.ObjectId} lastModifiedByUserId - ID ของผู้ใช้ที่แก้ไข StoryMap นี้ล่าสุด (อ้างอิง User model)
 * @property {Date} lastPublishedAt - วันที่เผยแพร่ StoryMap เวอร์ชันนี้ล่าสุด (ถ้ามีระบบ publish แยก)
 * @property {boolean} isActive - StoryMap เวอร์ชันนี้เป็นเวอร์ชันที่ใช้งานอยู่หรือไม่ (สำหรับกรณีที่มีหลายเวอร์ชัน)
 * @property {Date} createdAt - วันที่สร้างเอกสาร StoryMap (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตเอกสาร StoryMap ล่าสุด (Mongoose `timestamps`)
 */
export interface IStoryMap extends Document {
  _id: Types.ObjectId;
  novelId: Types.ObjectId;
  version: number;
  description?: string;
  nodes: Types.DocumentArray<IStoryMapNode>;
  edges: Types.DocumentArray<IStoryMapEdge>;
  startNodeId: string;
  storyVariables: Types.DocumentArray<IStoryVariableDefinition>;
  editorMetadata?: {
    zoomLevel?: number;
    viewOffsetX?: number;
    viewOffsetY?: number;
    gridSize?: number;
    showGrid?: boolean;
    [key: string]: any; // For other editor-specific settings
  };
  lastModifiedByUserId: Types.ObjectId;
  lastPublishedAt?: Date;
  isActive: boolean;
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
      unique: true, // หนึ่งนิยายควรมี StoryMap หลักเพียงอันเดียว (หรือจัดการเวอร์ชันด้วย field `version` และ `isActive`)
      index: true,
    },
    version: {
      type: Number,
      required: [true, "กรุณาระบุหมายเลขเวอร์ชัน (Version number is required)"],
      default: 1,
      min: [1, "หมายเลขเวอร์ชันต้องเป็นค่าบวก"],
    },
    description: { type: String, trim: true, maxlength: [2000, "คำอธิบาย StoryMap ยาวเกินไป"] },
    nodes: [StoryMapNodeSchema],
    edges: [StoryMapEdgeSchema],
    startNodeId: { type: String, required: [true, "กรุณาระบุ Node เริ่มต้น (Start Node ID is required)"], trim: true },
    storyVariables: [StoryVariableDefinitionSchema],
    editorMetadata: { type: Schema.Types.Mixed },
    lastModifiedByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User", // อ้างอิง User.ts
      required: [true, "กรุณาระบุ ID ของผู้แก้ไขล่าสุด (Last modified by User ID is required)"],
    },
    lastPublishedAt: { type: Date },
    isActive: { type: Boolean, default: true, index: true }, // ใช้สำหรับกรณีที่มีหลายเวอร์ชัน, ให้มี active ได้แค่ 1 ต่อ novel
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

// Compound index สำหรับการ query StoryMap ที่ active ของ novel หนึ่งๆ
StoryMapSchema.index({ novelId: 1, isActive: 1 }, { name: "NovelActiveStoryMapIndex" });

// Index สำหรับการ query ตามเวอร์ชัน (ถ้ามีการใช้งานบ่อย)
StoryMapSchema.index({ novelId: 1, version: 1 }, { name: "NovelStoryMapVersionIndex" });

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

// Middleware: ก่อนบันทึก (save)
StoryMapSchema.pre<IStoryMap>("save", async function (next) {
  // 1. ตรวจสอบความ unique ของ nodeId และ edgeId ภายใน StoryMap เดียวกัน
  if (this.isModified("nodes") && this.nodes) {
    const nodeIds = this.nodes.map(node => node.nodeId);
    const uniqueNodeIds = new Set(nodeIds);
    if (nodeIds.length !== uniqueNodeIds.size) {
      return next(new Error("รหัส Node ID ภายใน StoryMap ต้องไม่ซ้ำกัน (Node IDs must be unique within a StoryMap)."));
    }
  }
  if (this.isModified("edges") && this.edges) {
    const edgeIds = this.edges.map(edge => edge.edgeId);
    const uniqueEdgeIds = new Set(edgeIds);
    if (edgeIds.length !== uniqueEdgeIds.size) {
      return next(new Error("รหัส Edge ID ภายใน StoryMap ต้องไม่ซ้ำกัน (Edge IDs must be unique within a StoryMap)."));
    }

    // 2. ตรวจสอบว่า sourceNodeId และ targetNodeId ของ Edges มีอยู่จริงใน Nodes
    const allNodeIdsSet = new Set(this.nodes.map(node => node.nodeId));
    for (const edge of this.edges) {
      if (!allNodeIdsSet.has(edge.sourceNodeId)) {
        return next(new Error(`Edge '${edge.edgeId}' มี sourceNodeId '${edge.sourceNodeId}' ที่ไม่มีอยู่จริงในรายการ Nodes.`));
      }
      if (!allNodeIdsSet.has(edge.targetNodeId)) {
        return next(new Error(`Edge '${edge.edgeId}' มี targetNodeId '${edge.targetNodeId}' ที่ไม่มีอยู่จริงในรายการ Nodes.`));
      }
    }
  }

  // 3. ตรวจสอบว่า startNodeId มีอยู่จริงใน Nodes
  if (this.isModified("startNodeId") || this.isModified("nodes")) {
    if (this.startNodeId && this.nodes && !this.nodes.some(node => node.nodeId === this.startNodeId)) {
      return next(new Error(`Start Node ID '${this.startNodeId}' ไม่พบในรายการ Nodes ของ StoryMap นี้`));
    }
  }

  // 4. ตรวจสอบความ unique ของ variableName ใน storyVariables
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
      // Option 1: Throw error
      return next(new Error(`นิยายเรื่องนี้ (Novel ID: ${this.novelId}) มี StoryMap ที่ active อยู่แล้ว (ID: ${existingActiveStoryMap._id}). กรุณาปิดการใช้งาน StoryMap อื่นก่อน`));
      // Option 2: Deactivate other active story maps (use with caution)
      // await StoryMapModelConst.updateMany({ novelId: this.novelId, _id: { $ne: this._id } }, { $set: { isActive: false } });
    }
  }

  // อัปเดต lastEdited ของ nodes ที่มีการเปลี่ยนแปลง (ถ้าจำเป็น, อาจจะจัดการใน client-side editor)
  // if (this.isModified("nodes")) {
  //   this.nodes.forEach(node => {
  //     if (node.isModified()) { // Mongoose subdocument isModified check
  //       node.lastEdited = new Date();
  //     }
  //   });
  // }

  next();
});

// Middleware: หลังจากบันทึก (save) เพื่ออัปเดตข้อมูลใน Novel (เช่น lastContentUpdatedAt)
StoryMapSchema.post<IStoryMap>("save", async function (doc) {
  try {
    const NovelModel = models.Novel || model("Novel");
    await NovelModel.findByIdAndUpdate(doc.novelId, { $set: { lastContentUpdatedAt: new Date() } });
  } catch (error) {
    console.error(`[StoryMapMiddlewareError] Failed to update Novel after saving StoryMap ${doc._id}:`, error);
  }
});

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

// ตรวจสอบว่า Model "StoryMap" ถูกสร้างไปแล้วหรือยัง ถ้ายัง ให้สร้าง Model ใหม่
const StoryMapModel = (models.StoryMap as mongoose.Model<IStoryMap>) || model<IStoryMap>("StoryMap", StoryMapSchema);

export default StoryMapModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Node/Edge ID Generation**: `nodeId` และ `edgeId` ควรมีระบบการสร้าง ID ที่ client-side (StoryMap Editor) เพื่อให้สามารถอ้างอิงได้ก่อนบันทึกลง DB (เช่น UUID v4).
// 2.  **Condition Engine**: `conditionScript` ใน `IStoryMapEdge` ต้องการ Condition Engine ที่ robust ในฝั่ง backend (game runtime) เพื่อประมวลผลเงื่อนไขและเลือกเส้นทางที่ถูกต้อง.
// 3.  **Variable Management**: `storyVariables` และการแก้ไขค่าตัวแปรผ่าน `variable_modifier_node` หรือ `ChoiceAction` ต้องการระบบจัดการตัวแปรที่มีประสิทธิภาพและตรวจสอบ type ได้.
// 4.  **NodeSpecificData / EdgeSpecificData**: โครงสร้างของ field เหล่านี้ที่เป็น `Schema.Types.Mixed` ควรมีการกำหนด schema ย่อยที่ชัดเจนสำหรับแต่ละ `nodeType` หรือ `edgeType` (ถ้ามี) เพื่อ type safety ที่ดีขึ้น (อาจใช้ discriminators).
// 5.  **Real-time Collaboration**: หากต้องการให้ผู้เขียนหลายคนแก้ไข StoryMap พร้อมกัน อาจจะต้องพิจารณาใช้ CRDTs หรือ locking mechanism.
// 6.  **Performance for Large Maps**: สำหรับ StoryMap ที่มีขนาดใหญ่มาก (หลายพันโหนด/เส้นเชื่อม) การ query, การ render ใน editor, และการประมวลผลในเกมต้องคำนึงถึง performance.
// 7.  **Import/Export**: ควรมีฟังก์ชันสำหรับ import/export StoryMap ในรูปแบบมาตรฐาน (เช่น JSON, GraphML) เพื่อความยืดหยุ่นและการทำงานร่วมกับเครื่องมืออื่น.
// 8.  **Visual Editor Integration**: การออกแบบ schema นี้ควรคำนึงถึงการใช้งานจริงใน StoryMap Editor (เช่น การลากวาง, การเชื่อมโยง, การแก้ไขคุณสมบัติ).
// 9.  **Versioning and Rollback**: ระบบ `version` และ `isActive` เป็นพื้นฐานสำหรับการจัดการเวอร์ชัน ควรมี UI และ logic ที่รองรับการดูประวัติ, เปรียบเทียบ, และย้อนกลับเวอร์ชัน.
// 10. **Psychological Impact Path Analysis**: ข้อมูล `authorDefinedEmotionTags` และ `authorDefinedPsychologicalImpact` ในโหนดและเส้นเชื่อม สามารถนำมาใช้วิเคราะห์เส้นทางที่ผู้เล่นเลือกเดิน เพื่อประเมินผลกระทบทางอารมณ์/จิตใจสะสมได้.
// ==================================================================================================

