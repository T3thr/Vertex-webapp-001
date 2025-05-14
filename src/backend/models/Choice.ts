// src/models/Choice.ts
// โมเดลตัวเลือก (Choice Model) - จัดการตัวเลือกที่ผู้เล่นสามารถเลือกได้ในแต่ละฉากของ Visual Novel
// ออกแบบให้รองรับเงื่อนไขการแสดงผลที่ซับซ้อน, ผลลัพธ์ที่หลากหลายจากการเลือก,
// และการปรับแต่งการแสดงผลของตัวเลือกแต่ละอัน เพื่อให้มีความยืดหยุ่นสูงสำหรับการสร้างสรรค์เนื้อเรื่องที่แตกแขนง

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// ----- Interfaces ย่อยสำหรับเงื่อนไขและผลลัพธ์ของตัวเลือก -----

// ประเภทของเงื่อนไข (Condition Type)
export type ConditionType = 
  | "player_stat" 
  | "item_owned" 
  | "item_not_owned" 
  | "previous_choice_made" 
  | "flag_is_set" 
  | "flag_is_not_set" 
  | "random_chance" 
  | "current_scene_visits" 
  | "novel_variable_equals"; 

// ตัวดำเนินการเปรียบเทียบ (Comparison Operator)
export type ComparisonOperator = 
  | "equals" | "not_equals"
  | "greater_than" | "less_than"
  | "greater_than_or_equals" | "less_than_or_equals"
  | "contains" | "not_contains"; 

// อินเทอร์เฟซสำหรับเงื่อนไขการแสดงผลตัวเลือก (Choice Condition)
export interface IChoiceCondition {
  id: string; 
  type: ConditionType; 
  parameter: string; 
  operator: ComparisonOperator; 
  value: any; 
}

// ประเภทของผลลัพธ์จากการเลือก (Action Type)
export type ChoiceActionType = 
  | "go_to_scene" 
  | "set_player_stat" 
  | "modify_novel_variable" 
  | "give_item" 
  | "remove_item" 
  | "set_flag" 
  | "clear_flag" 
  | "trigger_scene_event" 
  | "play_audio" 
  | "stop_audio" 
  | "unlock_achievement" 
  | "end_novel" 
  | "run_custom_script";

// อินเทอร์เฟซสำหรับผลลัพธ์/การกระทำเมื่อเลือกตัวเลือก (Choice Action)
export interface IChoiceAction {
  id: string; 
  type: ChoiceActionType; 
  targetId?: string; 
  variableName?: string; 
  operation?: "set" | "add" | "subtract" | "multiply" | "divide" | "toggle"; 
  value?: any; 
  params?: Record<string, any>; 
  delayMs?: number; 
}

// การตั้งค่าการแสดงผลของตัวเลือก (Visual Configuration)
export interface IChoiceVisualConfig {
  stylePreset?: string; 
  fontFamily?: string; 
  fontSize?: string; 
  fontColor?: string; 
  hoverFontColor?: string; 
  disabledFontColor?: string; 
  backgroundColor?: string; 
  hoverBackgroundColor?: string;
  disabledBackgroundColor?: string;
  borderColor?: string;
  borderWidth?: string;
  borderRadius?: string;
  padding?: string; 
  iconUrl?: string; 
}

// ----- Interface หลักสำหรับเอกสารตัวเลือก (Choice Document) -----
export interface IChoice extends Document {
  _id: Types.ObjectId;
  novel: Types.ObjectId; 
  episode: Types.ObjectId; 
  originScene: Types.ObjectId; 
  
  text: string; 
  choiceOrder?: number; 
  
  displayConditions?: IChoiceCondition[]; 
  displayLogic?: "AND" | "OR"; 
  isHiddenInitially?: boolean; 
  
  actions: IChoiceAction[]; 
  
  visualConfig?: IChoiceVisualConfig;
  
  isPermanent?: boolean; 
  tooltip?: string; 
  confirmationRequired?: boolean; 
  
  timesSelected?: number; 
  
  editorNotes?: string; 
  
  isDeleted: boolean;
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// ----- Schema ย่อย -----
const ChoiceConditionSchema = new Schema<IChoiceCondition>(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ["player_stat", "item_owned", "item_not_owned", "previous_choice_made", "flag_is_set", "flag_is_not_set", "random_chance", "current_scene_visits", "novel_variable_equals"],
      required: true,
    },
    parameter: { type: String, required: true },
    operator: {
      type: String,
      enum: ["equals", "not_equals", "greater_than", "less_than", "greater_than_or_equals", "less_than_or_equals", "contains", "not_contains"],
      required: true,
    },
    value: Schema.Types.Mixed,
  },
  { _id: false }
);

const ChoiceActionSchema = new Schema<IChoiceAction>(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ["go_to_scene", "set_player_stat", "modify_novel_variable", "give_item", "remove_item", "set_flag", "clear_flag", "trigger_scene_event", "play_audio", "stop_audio", "unlock_achievement", "end_novel", "run_custom_script"],
      required: true,
    },
    targetId: String,
    variableName: String,
    operation: { type: String, enum: ["set", "add", "subtract", "multiply", "divide", "toggle"] },
    value: Schema.Types.Mixed,
    params: Schema.Types.Mixed,
    delayMs: { type: Number, min: 0 },
  },
  { _id: false }
);

const ChoiceVisualConfigSchema = new Schema<IChoiceVisualConfig>(
  {
    stylePreset: String,
    fontFamily: String, fontSize: String, fontColor: String, hoverFontColor: String, disabledFontColor: String,
    backgroundColor: String, hoverBackgroundColor: String, disabledBackgroundColor: String,
    borderColor: String, borderWidth: String, borderRadius: String,
    padding: String,
    iconUrl: String,
  },
  { _id: false }
);

// Schema หลักสำหรับ Choice
const ChoiceSchema = new Schema<IChoice>(
  {
    novel: { type: Schema.Types.ObjectId, ref: "Novel", required: true, index: true },
    episode: { type: Schema.Types.ObjectId, ref: "Episode", required: true, index: true },
    originScene: { type: Schema.Types.ObjectId, ref: "Scene", required: true, index: true },
    text: {
      type: String,
      required: [true, "กรุณาระบุข้อความสำหรับตัวเลือก (Choice text is required)"],
      trim: true,
      maxlength: 500,
    },
    choiceOrder: { type: Number, default: 0 },
    displayConditions: [ChoiceConditionSchema],
    displayLogic: { type: String, enum: ["AND", "OR"], default: "AND" },
    isHiddenInitially: { type: Boolean, default: false },
    actions: {
      type: [ChoiceActionSchema],
      required: [true, "กรุณาระบุผลลัพธ์อย่างน้อยหนึ่งอย่างสำหรับตัวเลือก (At least one action is required)"],
      validate: [(val: IChoiceAction[]) => val.length > 0, "ต้องมีอย่างน้อยหนึ่ง action"],
    },
    visualConfig: ChoiceVisualConfigSchema,
    isPermanent: { type: Boolean, default: false }, 
    tooltip: { type: String, trim: true, maxlength: 1000 },
    confirmationRequired: { type: Boolean, default: false },
    timesSelected: { type: Number, default: 0, min: 0 },
    editorNotes: { type: String, trim: true, maxlength: 2000 },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  {
    timestamps: true, 
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ChoiceSchema.index({ novel: 1, originScene: 1 }); 
ChoiceSchema.index({ novel: 1, episode: 1 }); 

const ChoiceModel = () => models.Choice as mongoose.Model<IChoice> || model<IChoice>("Choice", ChoiceSchema);

export default ChoiceModel;

