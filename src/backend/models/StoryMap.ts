// src/backend/models/StoryMap.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface สำหรับ Node ใน StoryMap
export interface IStoryMapNode {
  id: string; // ID ภายใน (ควรเป็น unique ภายใน StoryMap)
  type: "episode" | "scene" | "branch" | "end" | "note" | "choice" | "characterNode" | "statCheck"; // ประเภทโหนด, characterNode แทนการแสดงข้อมูลตัวละคร, statCheck แทนการตรวจสอบค่าพลัง
  title: string; // ชื่อโหนด
  description?: string; // คำอธิบาย
  position: { x: number; y: number }; // ตำแหน่งในแผนผัง (สำหรับ React Flow หรือ D3.js)
  size?: { width: number; height: number }; // ขนาดของโหนด
  color?: string; // สีของโหนด
  icon?: string; // ไอคอนของโหนด
  episodeId?: Types.ObjectId; // อ้างอิงไปยัง Episode (ถ้า type เป็น 'episode')
  sceneId?: Types.ObjectId; // อ้างอิงไปยัง Scene (ถ้า type เป็น 'scene')
  characterId?: Types.ObjectId; // อ้างอิงไปยัง Character (ถ้า type เป็น 'characterNode')
  conditions?: Array<{ // เงื่อนไขสำหรับการแสดงโหนด หรือการทำงานของโหนด
    type: "stat" | "choiceMade" | "relationshipLevel" | "itemOwned" | "previousNode" | "customScript"; // ประเภทของเงื่อนไข
    targetId: string; // ID เป้าหมาย (เช่น statId, choiceId, characterId, itemId, nodeId)
    operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "includes" | "notIncludes"; // ตัวดำเนินการ
    value: any; // ค่าที่ใช้เปรียบเทียบ
    customScript?: string; // Script สำหรับเงื่อนไขที่ซับซ้อน
  }>;
  effects?: Array<{ // ผลกระทบเมื่อผู้อ่านเข้าถึงโหนดนี้
    type: "statChange" | "relationshipChange" | "itemGrant" | "itemRemove" | "flagSet" | "redirectToNode" | "customScript"; // ประเภทของผลกระทบ
    targetId: string; // ID เป้าหมาย (เช่น statId, characterId, itemId, flagName, nodeId)
    operation?: "set" | "add" | "subtract" | "multiply" | "divide"; // การดำเนินการ (สำหรับ statChange)
    value: any; // ค่าที่ใช้
    customScript?: string; // Script สำหรับผลกระทบที่ซับซ้อน
  }>;
  choices?: Array<{ // ตัวเลือกสำหรับโหนดประเภท 'choice'
    id: string; // ID ของตัวเลือก
    text: string; // ข้อความของตัวเลือก
    nextNodeId: string; // ID ของโหนดถัดไปหากเลือกตัวเลือกนี้
    condition?: any; // เงื่อนไขในการแสดงตัวเลือกนี้ (คล้าย node conditions)
    effects?: any[]; // ผลกระทบเมื่อเลือกตัวเลือกนี้ (คล้าย node effects)
  }>;
  metadata?: Record<string, any>; // ข้อมูลเพิ่มเติม (เช่น style, class สำหรับ UI)
}

// Interface สำหรับ Edge ใน StoryMap
export interface IStoryMapEdge {
  id: string; // ID ภายใน (ควรเป็น unique ภายใน StoryMap)
  sourceNodeId: string; // ID ของโหนดต้นทาง
  targetNodeId: string; // ID ของโหนดปลายทาง
  type?: "default" | "choiceLink" | "conditionalLink" | "successPath" | "failurePath" | "hiddenLink"; // ประเภทเส้นเชื่อม
  label?: string; // ข้อความกำกับเส้นเชื่อม
  animated?: boolean; // เส้นเชื่อมมีการเคลื่อนไหวหรือไม่
  style?: Record<string, any>; // สไตล์ CSS สำหรับเส้นเชื่อม
  condition?: any; // เงื่อนไขในการใช้เส้นเชื่อมนี้ (คล้าย node conditions)
  priority?: number; // ลำดับความสำคัญ (สำหรับเส้นทางที่มีหลายทางเลือก)
  metadata?: Record<string, any>; // ข้อมูลเพิ่มเติม
}

// Interface สำหรับ Group ใน StoryMap
export interface IStoryMapGroup {
  id: string; // ID ภายใน
  title: string; // ชื่อกลุ่ม
  nodeIds: string[]; // ID ของโหนดในกลุ่ม
  color?: string; // สีของกลุ่ม
  position?: { x: number; y: number }; // ตำแหน่งของกลุ่ม
  size?: { width: number; height: number }; // ขนาดของกลุ่ม
  isCollapsed?: boolean; // กลุ่มถูกยุบหรือไม่
  metadata?: Record<string, any>; // ข้อมูลเพิ่มเติม
}

// Interface สำหรับ GameStat ที่กำหนดใน StoryMap
export interface IGameStatDefinition {
  id: string; // ID ของ stat (เช่น "hp", "mana", "charisma")
  name: string; // ชื่อที่แสดงของ stat
  initialValue: number; // ค่าเริ่มต้น
  minValue?: number; // ค่าต่ำสุด
  maxValue?: number; // ค่าสูงสุด
  isVisibleToReader: boolean; // แสดงให้ผู้อ่านเห็นหรือไม่
  icon?: string; // ไอคอน
  color?: string; // สี
}

// Interface สำหรับ Relationship ที่กำหนดใน StoryMap
export interface IRelationshipDefinition {
  characterId: Types.ObjectId; // ID ของตัวละครที่เกี่ยวข้อง
  name: string; // ชื่อความสัมพันธ์ (เช่น "Friendship with Alice", "Rivalry with Bob")
  initialValue: number; // ค่าเริ่มต้น
  minValue?: number; // ค่าต่ำสุด
  maxValue?: number; // ค่าสูงสุด
  isVisibleToReader: boolean; // แสดงให้ผู้อ่านเห็นหรือไม่
}

// Interface สำหรับ Item ที่กำหนดใน StoryMap (สำหรับ inventory system)
export interface IItemDefinition {
  id: string; // ID ของไอเทม
  name: string; // ชื่อไอเทม
  description?: string; // คำอธิบาย
  icon?: string; // ไอคอน
  stackable?: boolean; // ซ้อนกันได้หรือไม่
  maxStack?: number; // จำนวนสูงสุดที่ซ้อนได้
  initialQuantity?: number; // จำนวนเริ่มต้น (ถ้ามี)
  metadata?: Record<string, any>; // ข้อมูลเพิ่มเติม (เช่น item type, effects)
}

// Interface สำหรับ StoryMap document
export interface IStoryMap extends Document {
  novel: Types.ObjectId; // อ้างอิงไปยัง Novel
  title: string; // ชื่อแผนผัง (เช่น "Main Story", "Side Quest A")
  description?: string; // คำอธิบายแผนผัง
  // โครงสร้างของ StoryMap จะถูกจัดเก็บในรูปแบบที่เข้ากันได้กับ React Flow หรือไลบรารีที่คล้ายกัน
  // การเก็บ nodes และ edges แยกกันเป็นเรื่องปกติสำหรับเครื่องมือเหล่านี้
  nodes: IStoryMapNode[];
  edges: IStoryMapEdge[];
  groups?: IStoryMapGroup[]; // กลุ่มของโหนด (optional)
  version: number; // เวอร์ชันของแผนผัง (สำหรับการ tracking การเปลี่ยนแปลง)
  isDefault: boolean; // เป็นแผนผังเริ่มต้นของนิยายหรือไม่ (อาจมีหลาย StoryMap ต่อ Novel)
  // การตั้งค่าเกมที่เกี่ยวข้องกับ StoryMap นี้โดยเฉพาะ
  gameMechanicsConfig?: {
    startNodeId: string; // ID ของโหนดเริ่มต้นการเล่น
    definedStats?: IGameStatDefinition[]; // รายการ stat ที่ใช้ใน StoryMap นี้
    definedRelationships?: IRelationshipDefinition[]; // รายการความสัมพันธ์ที่ใช้ใน StoryMap นี้
    inventoryConfig?: {
      isEnabled: boolean;
      definedItems?: IItemDefinition[]; // รายการไอเทมที่สามารถมีได้ใน StoryMap นี้
    };
    // อาจมีการตั้งค่าอื่นๆ เช่น ระบบสกุลเงินในเกม, ระบบ achievement เฉพาะ StoryMap
  };
  createdBy: Types.ObjectId; // ผู้สร้างแผนผัง (อ้างอิง User model)
  collaborators?: { userId: Types.ObjectId; role: "editor" | "viewer" }[]; // ผู้ร่วมแก้ไขแผนผัง
  isDeleted: boolean; // สถานะการลบ (soft delete)
  createdAt: Date;
  updatedAt: Date;
  lastModifiedBy?: Types.ObjectId; // ผู้แก้ไขล่าสุด
}

const StoryMapNodeSchema = new Schema<IStoryMapNode>({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: ["episode", "scene", "branch", "end", "note", "choice", "characterNode", "statCheck"],
    required: [true, "กรุณาระบุประเภทโหนด"],
  },
  title: { type: String, required: [true, "กรุณาระบุชื่อโหนด"], trim: true },
  description: { type: String, trim: true },
  position: { x: { type: Number, required: true }, y: { type: Number, required: true } },
  size: { width: Number, height: Number },
  color: String,
  icon: String,
  episodeId: { type: Schema.Types.ObjectId, ref: "Episode" },
  sceneId: { type: Schema.Types.ObjectId, ref: "Scene" },
  characterId: { type: Schema.Types.ObjectId, ref: "Character" },
  conditions: [{
    _id: false,
    type: { type: String, enum: ["stat", "choiceMade", "relationshipLevel", "itemOwned", "previousNode", "customScript"], required: true },
    targetId: { type: String, required: true },
    operator: { type: String, enum: ["eq", "ne", "gt", "gte", "lt", "lte", "includes", "notIncludes"], required: true },
    value: Schema.Types.Mixed,
    customScript: String,
  }],
  effects: [{
    _id: false,
    type: { type: String, enum: ["statChange", "relationshipChange", "itemGrant", "itemRemove", "flagSet", "redirectToNode", "customScript"], required: true },
    targetId: { type: String, required: true },
    operation: { type: String, enum: ["set", "add", "subtract", "multiply", "divide"] },
    value: Schema.Types.Mixed,
    customScript: String,
  }],
  choices: [{
    _id: false,
    id: { type: String, required: true },
    text: { type: String, required: true },
    nextNodeId: { type: String, required: true }, // ควร validate ว่า nextNodeId มีอยู่จริง
    condition: Schema.Types.Mixed,
    effects: [Schema.Types.Mixed],
  }],
  metadata: Schema.Types.Mixed,
}, { _id: false });

const StoryMapEdgeSchema = new Schema<IStoryMapEdge>({
  id: { type: String, required: true },
  sourceNodeId: { type: String, required: true }, // ควร validate ว่า sourceNodeId มีอยู่จริง
  targetNodeId: { type: String, required: true }, // ควร validate ว่า targetNodeId มีอยู่จริง
  type: { type: String, enum: ["default", "choiceLink", "conditionalLink", "successPath", "failurePath", "hiddenLink"], default: "default" },
  label: { type: String, trim: true },
  animated: Boolean,
  style: Schema.Types.Mixed,
  condition: Schema.Types.Mixed,
  priority: Number,
  metadata: Schema.Types.Mixed,
}, { _id: false });

const StoryMapGroupSchema = new Schema<IStoryMapGroup>({
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    nodeIds: [{ type: String, required: true }], // ควร validate ว่า nodeIds มีอยู่จริง
    color: String,
    position: { x: Number, y: Number },
    size: { width: Number, height: Number },
    isCollapsed: { type: Boolean, default: false },
    metadata: Schema.Types.Mixed,
}, { _id: false });

const GameStatDefinitionSchema = new Schema<IGameStatDefinition>({
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    initialValue: { type: Number, required: true },
    minValue: Number,
    maxValue: Number,
    isVisibleToReader: { type: Boolean, default: true },
    icon: String,
    color: String,
}, { _id: false });

const RelationshipDefinitionSchema = new Schema<IRelationshipDefinition>({
    characterId: { type: Schema.Types.ObjectId, ref: "Character", required: true },
    name: { type: String, required: true, trim: true },
    initialValue: { type: Number, required: true },
    minValue: Number,
    maxValue: Number,
    isVisibleToReader: { type: Boolean, default: true },
}, { _id: false });

const ItemDefinitionSchema = new Schema<IItemDefinition>({
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    description: String,
    icon: String,
    stackable: { type: Boolean, default: false },
    maxStack: Number,
    initialQuantity: { type: Number, default: 1, min: 0 },
    metadata: Schema.Types.Mixed,
}, { _id: false });

const StoryMapSchema = new Schema<IStoryMap>(
  {
    novel: {
      type: Schema.Types.ObjectId,
      ref: "Novel",
      required: [true, "กรุณาระบุนิยายที่แผนผังนี้สังกัด"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "กรุณาระบุชื่อแผนผัง"],
      trim: true,
      maxlength: [150, "ชื่อแผนผังต้องไม่เกิน 150 ตัวอักษร"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "คำอธิบายแผนผังต้องไม่เกิน 1000 ตัวอักษร"],
    },
    nodes: [StoryMapNodeSchema],
    edges: [StoryMapEdgeSchema],
    groups: [StoryMapGroupSchema],
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
    gameMechanicsConfig: {
      startNodeId: {
        type: String,
        // Required if any game mechanics are enabled that need a starting point
        required: function(this: IStoryMap) {
          return !!(this.gameMechanicsConfig?.definedStats?.length || 
                    this.gameMechanicsConfig?.definedRelationships?.length || 
                    this.gameMechanicsConfig?.inventoryConfig?.isEnabled);
        },
      },
      definedStats: [GameStatDefinitionSchema],
      definedRelationships: [RelationshipDefinitionSchema],
      inventoryConfig: {
        isEnabled: { type: Boolean, default: false },
        definedItems: [ItemDefinitionSchema],
      },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User", // อ้างอิงไปยัง User model ที่รวมศูนย์แล้ว
      required: [true, "กรุณาระบุผู้สร้างแผนผัง"],
    },
    collaborators: [{
      _id: false,
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      role: { type: String, enum: ["editor", "viewer"], required: true, default: "viewer" },
    }],
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true, // เพิ่ม createdAt และ updatedAt โดยอัตโนมัติ
  }
);

// ----- Indexes -----
// Index สำหรับการค้นหา StoryMap เริ่มต้นของ Novel
StoryMapSchema.index({ novel: 1, isDefault: 1 });
// Index สำหรับการค้นหา StoryMap ที่ยังไม่ถูกลบของ Novel
StoryMapSchema.index({ novel: 1, isDeleted: 1 });
// Index สำหรับการค้นหา StoryMap ที่สร้างโดยผู้ใช้
StoryMapSchema.index({ createdBy: 1 });

// ----- Middleware: Update version and lastModifiedBy on change -----
StoryMapSchema.pre("save", function (next) {
  if (this.isModified("nodes") || this.isModified("edges") || this.isModified("groups") || this.isModified("gameMechanicsConfig")) {
    this.version = (this.version || 0) + 1;
    // lastModifiedBy should be set by the application logic passing the current user's ID
  }
  next();
});

// ----- Validation Logic (Example: Ensure node IDs in edges/groups are valid) -----
StoryMapSchema.path("edges").validate(function (edges: IStoryMapEdge[]) {
  if (!this.nodes || this.nodes.length === 0) return edges.length === 0; // No nodes, no edges
  const nodeIds = new Set(this.nodes.map(node => node.id));
  for (const edge of edges) {
    if (!nodeIds.has(edge.sourceNodeId)) {
      throw new Error(`Edge '${edge.id}' references non-existent source node '${edge.sourceNodeId}'.`);
    }
    if (!nodeIds.has(edge.targetNodeId)) {
      throw new Error(`Edge '${edge.id}' references non-existent target node '${edge.targetNodeId}'.`);
    }
  }
  return true;
}, "ข้อมูลเส้นเชื่อม (edge) ไม่ถูกต้อง: อ้างอิงไปยังโหนดที่ไม่มีอยู่จริง");

StoryMapSchema.path("groups").validate(function (groups: IStoryMapGroup[]) {
  if (!this.nodes || this.nodes.length === 0) return groups.length === 0;
  const nodeIds = new Set(this.nodes.map(node => node.id));
  for (const group of groups) {
    for (const nodeId of group.nodeIds) {
        if (!nodeIds.has(nodeId)) {
            throw new Error(`Group '${group.id}' references non-existent node '${nodeId}'.`);
        }
    }
  }
  return true;
}, "ข้อมูลกลุ่ม (group) ไม่ถูกต้อง: อ้างอิงไปยังโหนดที่ไม่มีอยู่จริง");

StoryMapSchema.path("gameMechanicsConfig.startNodeId").validate(function (startNodeId: string) {
    if (!startNodeId && (this.gameMechanicsConfig?.definedStats?.length || this.gameMechanicsConfig?.definedRelationships?.length || this.gameMechanicsConfig?.inventoryConfig?.isEnabled)) {
        return false; // startNodeId is required if game mechanics are used
    }
    if (startNodeId && this.nodes && !this.nodes.some(node => node.id === startNodeId)) {
        return false; // startNodeId must exist in nodes
    }
    return true;
}, "โหนดเริ่มต้น (startNodeId) ที่ระบุใน gameMechanicsConfig ไม่ถูกต้องหรือไม่มีอยู่จริง");


// ----- Model Export -----
const StoryMapModel = () => models.StoryMap as mongoose.Model<IStoryMap> || model<IStoryMap>("StoryMap", StoryMapSchema);

export default StoryMapModel;

