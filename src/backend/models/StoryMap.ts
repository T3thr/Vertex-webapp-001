// src/models/StoryMap.ts
// โมเดลแผนผังเนื้อเรื่อง (StoryMap Model) - จัดการโครงสร้างการเชื่อมโยงของฉาก, ตอน, และกลไกเกม
// ออกแบบใหม่เพื่อรองรับ Visual Novel Editor ระดับโปร, Non-linear storytelling, และ Game Mechanics ที่ซับซ้อน
// อัปเดตล่าสุด: เพิ่ม Node Types, Game Mechanics Config, Editor Settings, และรายละเอียดสำหรับ UI Editor

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// ----- Interfaces สำหรับ Game Mechanics Configuration -----

// การตั้งค่าค่าพลัง/สถานะ (เช่น HP, MP, Sanity)
export interface IDefinedStat {
  id: string; // ID เฉพาะภายใน StoryMap (เช่น "player_hp", "sanity_level")
  name: string; // ชื่อที่แสดงใน UI (เช่น "พลังชีวิต", "ระดับสติ")
  description?: string; // คำอธิบาย
  initialValue: number; // ค่าเริ่มต้น
  minValue?: number; // ค่าต่ำสุด (default: 0)
  maxValue?: number; // ค่าสูงสุด
  iconUrl?: string; // URL ไอคอนสำหรับแสดงผล
  color?: string; // สีสำหรับ UI (เช่น สีของแถบพลัง)
  uiDisplay?: { // การตั้งค่าการแสดงผลใน UI เกม
    type: "bar" | "number" | "hearts" | "custom";
    position?: "top_left" | "top_right" | "bottom_left" | "bottom_right" | "hidden";
    customComponent?: string; // ชื่อ custom component (ถ้า type = "custom")
  };
  onMinReachedEffectNodeId?: string; // ID ของ Node ที่จะทำงานเมื่อค่าถึง Min (เช่น Game Over)
  onMaxReachedEffectNodeId?: string; // ID ของ Node ที่จะทำงานเมื่อค่าถึง Max (ถ้ามี)
}

// การตั้งค่าความสัมพันธ์กับตัวละคร
export interface IDefinedRelationship {
  targetCharacterId: Types.ObjectId; // ID ของตัวละครเป้าหมาย (อ้างอิง Character model)
  relationshipType?: string; // ประเภทความสัมพันธ์ (default: "affinity", เช่น "friendship", "romance", "rivalry")
  name: string; // ชื่อความสัมพันธ์ที่แสดงใน UI (เช่น "ความสนิทกับ Alice")
  initialValue?: number; // ค่าเริ่มต้น (default: 0)
  minValue?: number; // ค่าต่ำสุด (default: -100)
  maxValue?: number; // ค่าสูงสุด (default: 100)
  iconUrl?: string;
  stages?: { // ขั้นของความสัมพันธ์
    threshold: number; // ค่าที่ต้องถึงเพื่อเข้าสู่ขั้นนี้
    label: string; // ชื่อขั้น (เช่น "เพื่อนสนิท", "ศัตรูคู่อาฆาต")
    description?: string;
    uiColor?: string;
  }[];
}

// การตั้งค่าไอเทมใน Inventory
export interface IDefinedItem {
  itemId: string; // ID เฉพาะของไอเทมภายใน StoryMap
  name: string; // ชื่อไอเทม
  description?: string; // คำอธิบาย
  iconUrl?: string; // URL ไอคอน
  stackable?: boolean; // ซ้อนทับกันได้หรือไม่ (default: false)
  maxStack?: number; // จำนวนสูงสุดที่ซ้อนได้ (default: 1 ถ้า stackable, 99 หรืออื่นๆ)
  isUsable?: boolean; // ใช้ได้หรือไม่ (default: false)
  isConsumable?: boolean; // ใช้แล้วหมดไปหรือไม่ (default: true ถ้า isUsable)
  useEffectNodeId?: string; // ID ของ Node ที่จะทำงานเมื่อใช้ไอเทม (ถ้า isUsable)
  attributes?: Record<string, any>; // คุณสมบัติเพิ่มเติม (เช่น { "damage": 10, "heals": true, "keyItem": true })
  price?: number; // ราคาซื้อ (ถ้ามีร้านค้าในเกม)
  sellPrice?: number; // ราคาขาย
}

// การตั้งค่าสกุลเงินในเกม
export interface IDefinedCurrency {
  id: string; // ID เฉพาะของสกุลเงิน (เช่น "gold_coins", "gems")
  name: string; // ชื่อสกุลเงิน
  iconUrl?: string; // URL ไอคอน
  initialAmount?: number; // จำนวนเริ่มต้น (default: 0)
  canBePurchasedWithRealMoney?: boolean; // ซื้อด้วยเงินจริงได้หรือไม่ (เชื่อมโยงกับระบบ IAP)
}

// การตั้งค่า Global Flags
export interface IGlobalFlag {
  flagId: string; // ID เฉพาะของ Flag
  description?: string; // คำอธิบาย Flag นี้ใช้ทำอะไร
  initialValue?: boolean; // ค่าเริ่มต้น (default: false)
}

// อินเทอร์เฟซสำหรับ Game Mechanics Configuration ทั้งหมดใน StoryMap
export interface IGameMechanicsConfig {
  definedStats?: IDefinedStat[];
  definedRelationships?: IDefinedRelationship[];
  inventoryConfig?: {
    isEnabled: boolean;
    maxSlots?: number;
    definedItems?: IDefinedItem[];
  };
  currencySystem?: {
    isEnabled: boolean;
    currencies?: IDefinedCurrency[];
  };
  globalFlags?: IGlobalFlag[];
  // สามารถเพิ่มระบบอื่นๆ เช่น Quest System, Skill System ได้ในอนาคต
  // questSystemConfig?: { isEnabled: boolean; definedQuests?: any[] };
  startNodeId?: string; // ID ของ Node เริ่มต้นสำหรับ Game Logic (สำคัญมาก)
}

// ----- Interfaces สำหรับ Nodes และ Edges -----

// ประเภทของ Node ที่รองรับ
export type StoryMapNodeType = 
  | "episode_start" // เริ่มต้นตอน
  | "scene_direct"  // แสดงฉากโดยตรง (อ้างอิง Scene ID)
  | "choice_hub"    // จุดตัดสินใจของผู้เล่น
  | "condition_branch" // แตกแขนงตามเงื่อนไข
  | "variable_manipulation" // เปลี่ยนแปลงค่าตัวแปร, stat, item, currency, flag
  | "timeline_event" // ควบคุมเหตุการณ์บน Timeline ของฉาก (เช่น ตัวละครปรากฏ, เสียง)
  | "minigame_trigger" // เริ่ม Mini-game
  | "novel_end"     // จุดจบของนิยาย (หรือส่วนย่อย)
  | "note"          // โน้ตสำหรับผู้เขียนใน Editor
  | "group"         // จัดกลุ่ม Nodes ใน Editor
  | "loop_start"    // เริ่ม Loop
  | "loop_end"      // จบ Loop
  | "jump_to_node"  // ข้ามไปยัง Node อื่น
  | "parallel_start" // เริ่มการทำงานแบบขนาน (ถ้าแพลตฟอร์มรองรับ)
  | "parallel_end";  // สิ้นสุดการทำงานแบบขนาน

// เนื้อหาสำหรับ Node ประเภท "choice_hub"
export interface IChoiceNodeContent {
  choices: {
    choiceId: string; // ID เฉพาะของตัวเลือกภายใน Node นี้
    text: string; // ข้อความที่แสดงให้ผู้เล่นเลือก
    targetNodeId?: string; // ID ของ Node ปลายทางถ้าเลือกตัวเลือกนี้ (อาจใช้ output port แทน)
    outputPortId?: string; // ID ของ Output Port ที่เชื่อมกับตัวเลือกนี้
    condition?: string; // เงื่อนไขที่ตัวเลือกนี้จะปรากฏ (เช่น "player.has_item("key_A")")
    isHiddenUntilConditionMet?: boolean; // ซ่อนตัวเลือกจนกว่าเงื่อนไขจะถูกปลดล็อก
    action?: string; // Action ที่จะเกิดทันทีเมื่อเลือก (เช่น "player.gain_item("potion")")
    uiPresentation?: { // การตั้งค่า UI ของตัวเลือก
      buttonStyle?: string; // CSS class หรือ style object
      positionOnScreen?: string; // ตำแหน่งบนหน้าจอ
      displayIcon?: string; // URL ไอคอน
    };
    autoSelectAfterSeconds?: number; // เลือกอัตโนมัติหลังจากเวลาที่กำหนด (วินาที)
  }[];
  prompt?: string; // คำถามหรือข้อความนำก่อนตัวเลือก
}

// เนื้อหาสำหรับ Node ประเภท "variable_manipulation"
export interface IVariableManipulationNodeContent {
  operations: {
    target: "stat" | "relationship" | "item" | "currency" | "flag" | "custom_variable";
    targetId: string; // ID ของ stat, relationship (characterId), item, currency, flag, custom variable
    relationshipType?: string; // สำหรับ target="relationship"
    operation: "set" | "add" | "subtract" | "toggle" | "push_to_array" | "remove_from_array";
    value?: any; // ค่าที่จะใช้ในการดำเนินการ (number, boolean, string, object)
    valueFromVariable?: string; // ดึงค่ามาจากตัวแปรอื่น
  }[];
}

// เนื้อหาสำหรับ Node ประเภท "condition_branch"
export interface IConditionBranchNodeContent {
  conditions: {
    conditionId: string; // ID เฉพาะของเงื่อนไข
    logic: string; // Logic ในการประเมิน (เช่น "player.stat("hp") > 50 && player.flag("met_npc_A")")
    outputPortId: string; // ID ของ Output Port ที่จะทำงานถ้าเงื่อนไขเป็นจริง
    priority?: number; // ลำดับความสำคัญในการตรวจสอบ (ถ้ามีหลายเงื่อนไข)
  }[];
  defaultOutputPortId?: string; // ID ของ Output Port ที่จะทำงานถ้าไม่มีเงื่อนไขใดเป็นจริง
}

// อินเทอร์เฟซสำหรับ Node ใน StoryMap
export interface IStoryMapNode {
  _id: string; // ID ของ Node (ใช้ custom string ID ที่ unique ภายใน StoryMap, เช่น UUID)
  nodeType: StoryMapNodeType; // ประเภทของ Node
  title?: string; // ชื่อ Node (สำหรับแสดงผลใน editor)
  position: { x: number; y: number }; // ตำแหน่งของ Node บน Canvas (สำหรับ editor)
  size?: { width: number; height: number }; // ขนาดของ Node (สำหรับ editor)
  
  // Content specific to nodeType
  content?: IChoiceNodeContent | IVariableManipulationNodeContent | IConditionBranchNodeContent | { 
    sceneId?: Types.ObjectId; // สำหรับ scene_direct (อ้างอิง Scene model)
    episodeId?: Types.ObjectId; // สำหรับ episode_start (อ้างอิง Episode model)
    novelEndTitle?: string; // สำหรับ novel_end
    noteText?: string; // สำหรับ note
    targetNodeId?: string; // สำหรับ jump_to_node
    // ... other specific content fields
  };

  // Input/Output Ports (สำหรับเชื่อมโยง Edges ใน Editor)
  inputPorts?: { portId: string; name?: string; maxConnections?: number }[];
  outputPorts?: { portId: string; name?: string; maxConnections?: number }[];

  // Metadata สำหรับ Editor
  metadata?: {
    colorCoding?: string; // สีสำหรับโหนดใน Editor
    layerGroup?: string; // สำหรับการจัดกลุ่มโหนดใน Editor ที่ซับซ้อน
    editorNotes?: string; // โน้ตสำหรับผู้เขียนเอง ไม่แสดงผลในเกม
    uiStyles?: Record<string, any>; // สไตล์ UI เฉพาะของโหนดใน Editor (เช่น ขนาดตัวอักษร)
    icon?: string; // ไอคอนสำหรับ Node ใน Editor
  };
  customData?: Record<string, any>; // ข้อมูลเพิ่มเติมสำหรับ Node
}

// อินเทอร์เฟซสำหรับ Edge (การเชื่อมโยง) ใน StoryMap
export interface IStoryMapEdge {
  _id: string; // ID ของ Edge (ใช้ custom string ID ที่ unique ภายใน StoryMap, เช่น UUID)
  sourceNodeId: string; // ID ของ Node ต้นทาง
  sourceOutputPortId?: string; // ID ของ Output Port ต้นทาง
  targetNodeId: string; // ID ของ Node ปลายทาง
  targetInputPortId?: string; // ID ของ Input Port ปลายทาง
  label?: string; // ป้ายกำกับสำหรับ Edge
  edgeType?: "default" | "conditional_true" | "conditional_false" | "choice_outcome" | "timeout" | "interrupt"; // ประเภทของ Edge
  conditions?: { // เงื่อนไขที่ Edge นี้จะ Active (ถ้า edgeType เป็น conditional)
    logic: string;
    priority?: number;
  }[];
  metadata?: { // ข้อมูลเพิ่มเติมสำหรับ Edge ใน Editor
    color?: string;
    thickness?: number;
    style?: "solid" | "dashed" | "dotted";
    arrowhead?: "default" | "circle" | "none";
    transitionEffect?: string; // เช่น "fadeIn", "slideLeft" (สำหรับการเปลี่ยนฉาก/โหนด)
    soundEffectOnTransition?: Types.ObjectId; // อ้างอิง Media หรือ OfficialMedia
  };
  customData?: Record<string, any>; // ข้อมูลเพิ่มเติมสำหรับ Edge
}

// อินเทอร์เฟซสำหรับ Group ใน StoryMap (เพื่อจัดระเบียบใน Editor)
export interface IStoryMapGroup {
  _id: string; // ID ของ Group
  title?: string; // ชื่อ Group
  nodeIds: string[]; // IDs ของ Nodes ที่อยู่ใน Group นี้
  position: { x: number; y: number }; // ตำแหน่งของ Group บน Canvas
  size: { width: number; height: number }; // ขนาดของ Group
  color?: string; // สีพื้นหลังของ Group
  metadata?: { editorNotes?: string };
}

// อินเทอร์เฟซหลักสำหรับเอกสารแผนผังเนื้อเรื่อง (StoryMap Document)
export interface IStoryMap extends Document {
  _id: Types.ObjectId;
  novelId: Types.ObjectId; // นิยายที่เป็นเจ้าของแผนผังนี้ (อ้างอิง Novel model, unique one-to-one หรือ one-to-many ถ้า novel มีหลาย story map)
  title: string; // ชื่อแผนผัง (เช่น "โครงเรื่องหลัก", "โครงเรื่องตัวละคร A")
  description?: string; // คำอธิบายแผนผัง
  
  nodes: IStoryMapNode[]; // รายการ Nodes ทั้งหมดในแผนผัง (ใช้ _id เป็น string)
  edges: IStoryMapEdge[]; // รายการ Edges ทั้งหมดในแผนผัง (ใช้ _id เป็น string)
  groups?: IStoryMapGroup[]; // (Optional) รายการ Groups สำหรับจัดระเบียบใน Editor
  
  gameMechanicsConfig?: IGameMechanicsConfig; // การตั้งค่ากลไกเกมทั้งหมด
  
  // การตั้งค่าสำหรับ editor (เช่น viewport, zoom level ล่าสุด, grid settings)
  editorSettings?: {
    viewport?: { x: number; y: number; zoom: number };
    gridSize?: number;
    snapToGrid?: boolean;
    showMinimap?: boolean;
    // ... other editor preferences
  };
  
  // Metadata
  version: number; // เวอร์ชันของแผนผัง (สำหรับการย้อนกลับหรือ history)
  lastPublishedVersion?: number; // เวอร์ชันล่าสุดที่เผยแพร่ (ถ้ามีระบบ draft/publish)
  status?: "draft" | "published" | "archived"; // สถานะของ StoryMap
  
  // Soft delete
  isDeleted?: boolean;
  deletedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ----- Schema Definitions (ย่อย) -----
// ไม่ได้สร้างเป็น Mongoose Subdocument Schema โดยตรงในที่นี้
// แต่จะถูก embed เป็น Plain Objects ใน StoryMapSchema หลัก
// เพื่อความยืดหยุ่นในการ query และ update โดยตรงผ่าน dot notation
// และเพื่อหลีกเลี่ยงปัญหา _id ของ subdocument ที่อาจไม่ตรงกับ custom string ID ที่ต้องการ

// ----- Schema หลักสำหรับ StoryMap -----
const StoryMapSchema = new Schema<IStoryMap>(
  {
    novelId: {
      type: Schema.Types.ObjectId,
      ref: "Novel",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "กรุณาระบุชื่อแผนผัง (StoryMap title is required)"],
      trim: true,
      maxlength: 255,
    },
    description: { type: String, trim: true, maxlength: 1000 },
    
    // Nodes, Edges, Groups จะเป็น Plain Objects ไม่ใช่ Mongoose Subdocuments
    // เพื่อให้สามารถใช้ custom string IDs (_id) ได้ง่าย และ query/update ได้สะดวก
    nodes: { type: [Object], default: [] }, 
    edges: { type: [Object], default: [] },
    groups: { type: [Object], default: [] },

    gameMechanicsConfig: { type: Object },
    editorSettings: { type: Object },
    
    version: { type: Number, default: 1, min: 1 },
    lastPublishedVersion: { type: Number, min: 1 },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft", index: true },
    
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  {
    timestamps: true, // createdAt, updatedAt
    // Mongoose จะไม่สร้าง _id สำหรับ elements ใน nodes, edges, groups arrays โดยอัตโนมัติ
    // เราจะจัดการ _id (ที่เป็น string) ของมันเองใน application logic
  }
);

// ----- Indexes -----
StoryMapSchema.index({ novelId: 1, status: 1 });
StoryMapSchema.index({ title: "text", description: "text" }); // สำหรับการค้นหา

// ----- Middleware -----
// อัปเดต version ของ StoryMap และ updatedAt ของ Novel เมื่อมีการเปลี่ยนแปลง
StoryMapSchema.pre("save", async function (next) {
  if (this.isModified() && !this.isNew) {
    this.version = (this.version || 0) + 1; // Increment version on each save
    
    // อัปเดต Novel.updatedAt (เพื่อให้รู้ว่ามีการแก้ไขในส่วนของ story map)
    // ควรพิจารณาว่าการแก้ไข StoryMap ทุกครั้งควร trigger Novel.updatedAt หรือไม่
    // อาจจะ trigger เฉพาะเมื่อ status ของ StoryMap เปลี่ยนเป็น published
    if (this.isModified("status") && this.status === "published") {
        const Novel = models.Novel || model("Novel");
        try {
            await Novel.findByIdAndUpdate(this.novelId, { updatedAt: new Date() });
        } catch (error) {
            console.error(`Error updating Novel.updatedAt for storyMap ${this._id}:`, error);
            // Consider how to handle this error, maybe log and continue
        }
    }
  }
  next();
});

// ----- Validation (Custom) -----
// ควรมีการ validate ความถูกต้องของ node IDs และ port IDs ใน edges และ groups
// รวมถึงการ validate gameMechanicsConfig.startNodeId ว่ามีอยู่จริงใน nodes array
// ซึ่งอาจทำใน application layer หรือ pre-save hook ที่ซับซ้อนขึ้น

// ----- Model Export -----
const StoryMapModel = (
  models.StoryMap as mongoose.Model<IStoryMap>
) || model<IStoryMap>("StoryMap", StoryMapSchema);

export default StoryMapModel;

// หมายเหตุการเปลี่ยนแปลงสำคัญ:
// 1.  ใช้ Plain Objects สำหรับ nodes, edges, groups แทน Mongoose Subdocuments เพื่อให้สามารถใช้ custom string _id ได้
//     และลดความซับซ้อนในการจัดการ _id ของ subdocument ที่ Mongoose สร้างอัตโนมัติ
// 2.  เพิ่ม IGameMechanicsConfig อย่างละเอียด: definedStats, definedRelationships, inventoryConfig, currencySystem, globalFlags.
// 3.  ขยาย StoryMapNodeType และเพิ่ม content interfaces (IChoiceNodeContent, IVariableManipulationNodeContent, IConditionBranchNodeContent).
// 4.  เพิ่มรายละเอียดใน IStoryMapNode และ IStoryMapEdge สำหรับ UI Editor (ports, metadata, size, color, style).
// 5.  เพิ่ม IStoryMapGroup สำหรับการจัดกลุ่มใน Editor.
// 6.  เพิ่ม editorSettings, status (draft/published), lastPublishedVersion.
// 7.  ปรับปรุง Middleware และ Index.
// 8.  คอมเมนต์ภาษาไทยถูกเพิ่มและปรับปรุงให้ละเอียดขึ้น.
