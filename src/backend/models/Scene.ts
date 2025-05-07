// src/backend/models/Scene.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface สำหรับ Scene document
// A Scene is a distinct unit within an Episode, representing a specific moment, interaction, or piece of content.
export interface IScene extends Document {
  episode: Types.ObjectId; // ตอนที่ฉากนี้สังกัด (อ้างอิง Episode model)
  novel: Types.ObjectId; // นิยายที่ฉากนี้สังกัด (อ้างอิง Novel model, เพื่อความสะดวกในการ query)
  storyMapNodeId?: string; // ID ของโหนดใน StoryMap ที่ฉากนี้เชื่อมโยง (optional, ถ้าใช้ StoryMap)
  sceneNumber: number; // ลำดับของฉากภายใน Episode (สำหรับ editor, หรือถ้าไม่มี StoryMap)
  title?: string; // ชื่อฉาก (optional, สำหรับ writer reference หรือแสดงใน editor)
  // ประเภทของฉาก กำหนดโครงสร้างของ content
  // text: แสดงข้อความบรรยาย
  // dialogue: แสดงบทสนทนาของตัวละคร
  // choice: แสดงตัวเลือกให้ผู้เล่น
  // mediaDisplay: แสดง/ควบคุมสื่อ (ภาพ, เสียง, วิดีโอ)
  // effectTrigger: สั่งให้เกิด visual/audio effect
  // gameStateChange: เปลี่ยนแปลงค่า stat, item, relationship, flag
  // branchPoint: จุดแยกเนื้อเรื่อง (อาจจะไม่มี content โดยตรง แต่ใช้ logic จาก StoryMap)
  // ending: ฉากจบ (อาจเป็นของ Episode หรือ Novel)
  type: "text" | "dialogue" | "choice" | "mediaDisplay" | "effectTrigger" | "gameStateChange" | "branchPoint" | "ending" | "customScript";
  // เนื้อหาของฉาก, โครงสร้างจะขึ้นอยู่กับ type
  content: {
    // สำหรับ type: text
    narration?: string; // ข้อความบรรยาย
    // สำหรับ type: dialogue
    dialogueLines?: Array<{ // ชุดบทสนทนา
      characterId?: Types.ObjectId; // อ้างอิง Character model (ถ้ามี)
      speakerName?: string; // ชื่อผู้พูด (ถ้าไม่มี characterId หรือเป็น "Narrator")
      line: string; // ข้อความบทพูด
      emotion?: string; // key อารมณ์ (เช่น "happy", "angry") สำหรับ sprite/avatar
      position?: "left" | "center" | "right" | "custom"; // ตำแหน่งตัวละครบนจอ
      voiceLineUrl?: string; // URL ของไฟล์เสียงบทพูด (optional)
      metadata?: Record<string, any>; // ข้อมูลเพิ่มเติมสำหรับ dialogue line นี้
    }>;
    // สำหรับ type: choice
    choices?: Array<{ // รายการตัวเลือก
      id: string; // ID ของตัวเลือก (unique ภายใน scene)
      text: string; // ข้อความที่แสดงให้ผู้เล่นเลือก
      targetNodeId?: string; // ID ของโหนดใน StoryMap ที่จะไปต่อ (ถ้าใช้ StoryMap)
      nextSceneId?: Types.ObjectId; // ID ของ Scene ถัดไป (ถ้าไม่ใช้ StoryMap หรือเป็น linear choice)
      conditions?: any[]; // เงื่อนไขในการแสดงตัวเลือกนี้ (โครงสร้างคล้าย StoryMapNode.conditions)
      effects?: any[]; // ผลกระทบเมื่อเลือกตัวเลือกนี้ (โครงสร้างคล้าย StoryMapNode.effects)
      isHidden?: boolean; // ตัวเลือกนี้ถูกซ่อนไว้หรือไม่ (อาจแสดงเมื่อเงื่อนไขบางอย่างถูกปลดล็อค)
    }>;
    // สำหรับ type: mediaDisplay
    mediaElements?: Array<{ // รายการสื่อที่จะแสดง/ควบคุม
      mediaId: Types.ObjectId; // อ้างอิง Media model
      alias?: string; // ชื่อเรียก media นี้ใน scene (เช่น "main_character_sprite", "background_forest")
      action: "show" | "hide" | "update" | "play" | "pause" | "stop"; // การกระทำต่อสื่อ
      mediaTypeOverride?: "image" | "audio" | "background" | "video" | "sfx" | "characterSprite"; // Override ประเภทสื่อ (ถ้าจำเป็น)
      // คุณสมบัติการแสดงผล (คล้ายกับ ISceneSubdocument ใน Episode)
      layer?: number; // z-index
      position?: { x: number; y: number; unit?: "%" | "px" };
      size?: { width: number; height: number; unit?: "%" | "px" };
      opacity?: number; // 0-1
      rotation?: number; // องศา
      scale?: number; // 0.1 - N
      // สำหรับ audio/video
      volume?: number; // 0-1
      loop?: boolean;
      startTime?: number; // วินาที (สำหรับ video/audio)
      // สำหรับ characterSprite
      characterEmotion?: string; // อารมณ์ที่จะแสดง
      // Animation/Transition
      transitionIn?: { type: string; duration: number; delay?: number }; // เช่น { type: "fadeIn", duration: 500 }
      transitionOut?: { type: string; duration: number; delay?: number };
      // CSS filters หรือ effects อื่นๆ
      filters?: Record<string, string>; // เช่น { blur: "5px", brightness: "0.8" }
    }>;
    // สำหรับ type: effectTrigger
    visualEffects?: Array<{ // รายการ visual effects
      type: "screenShake" | "screenFlash" | "imageFilter" | "transition"; // ประเภท effect
      targetElementAlias?: string; // alias ของ mediaElement ที่จะ apply effect (ถ้าไม่ระบุคือ screen)
      duration: number; // ms
      intensity?: number; // 0-1
      color?: string; // สำหรับ flash, filter
      parameters?: Record<string, any>; // เช่น { type: "blur", amount: "5px" } สำหรับ imageFilter
    }>;
    // สำหรับ type: gameStateChange
    gameStateUpdates?: Array<{ // รายการการเปลี่ยนแปลง state ของเกม
      type: "stat" | "relationship" | "item" | "flag" | "achievementUnlock" | "currency";
      targetId: string; // statId, characterId for relationship, itemId, flagName, achievementId, currencyId
      operation: "set" | "increment" | "decrement" | "add" | "remove" | "toggle"; // add/remove for items, toggle for flags
      value?: any; // ค่าที่จะ set/increment/decrement หรือ itemId ที่จะ add/remove
      amount?: number; // สำหรับ currency, item quantity
      displayText?: string; // ข้อความที่จะแสดงให้ผู้เล่นเห็น (เช่น "ได้รับดาบเหล็ก", "ความสัมพันธ์กับ Alice +10")
      showNotification?: boolean; // แสดง notification หรือไม่
    }>;
    // สำหรับ type: customScript
    script?: string; // โค้ด JavaScript หรือ DSL ที่จะรัน (ต้องระมัดระวังเรื่องความปลอดภัย)
    scriptParameters?: Record<string, any>; // พารามิเตอร์สำหรับ script
  };
  // การตั้งค่าเฉพาะของฉากนี้
  settings?: {
    defaultDuration?: number; // ระยะเวลาแสดงผลของฉากนี้ (ms) ก่อนไปฉากถัดไป (ถ้าไม่มี interaction)
    backgroundColor?: string; // สีพื้นหลังของฉาก (ถ้าไม่มี background image)
    backgroundImageId?: Types.ObjectId; // อ้างอิง Media model สำหรับภาพพื้นหลัง
    backgroundMusicId?: Types.ObjectId; // อ้างอิง Media model สำหรับ BGM
    ambientSoundId?: Types.ObjectId; // อ้างอิง Media model สำหรับเสียงบรรยากาศ
    // การตั้งค่าการข้ามฉาก (skip)
    skippable?: boolean; // ผู้เล่นสามารถข้ามฉากนี้ได้หรือไม่
    autoPlayNext?: boolean; // เล่นฉากถัดไปอัตโนมัติหรือไม่หลังจบฉากนี้
    // อื่นๆ เช่น transition เข้า/ออกฉาก
    transitionIn?: { type: string; duration: number };
    transitionOut?: { type: string; duration: number };
  };
  // การนำทาง (ถ้าไม่ใช้ StoryMap หรือเป็น linear flow ภายใน node ของ StoryMap)
  // ถ้าเป็น branchPoint หรือ choice อาจจะไม่มี nextSceneId โดยตรง
  nextSceneId?: Types.ObjectId; // ID ของ Scene ถัดไป (ถ้าเป็น linear)
  // Metadata
  authorNotes?: string; // โน้ตสำหรับผู้เขียน (ไม่แสดงให้ผู้เล่นเห็น)
  version: number; // เวอร์ชันของข้อมูลฉาก (สำหรับ tracking การเปลี่ยนแปลง)
  isDeleted: boolean; // Soft delete
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SceneSchema = new Schema<IScene>(
  {
    episode: { type: Schema.Types.ObjectId, ref: "Episode", required: true, index: true },
    novel: { type: Schema.Types.ObjectId, ref: "Novel", required: true, index: true },
    storyMapNodeId: { type: String, index: true },
    sceneNumber: { type: Number, required: true, min: 0 }, // ควร unique ภายใน episode
    title: { type: String, trim: true, maxlength: [200, "ชื่อฉากต้องไม่เกิน 200 ตัวอักษร"] },
    type: {
      type: String,
      enum: ["text", "dialogue", "choice", "mediaDisplay", "effectTrigger", "gameStateChange", "branchPoint", "ending", "customScript"],
      required: [true, "กรุณาระบุประเภทของฉาก"],
    },
    content: {
      narration: String,
      dialogueLines: [{
        _id: false,
        characterId: { type: Schema.Types.ObjectId, ref: "Character" },
        speakerName: String,
        line: { type: String, required: true },
        emotion: String,
        position: { type: String, enum: ["left", "center", "right", "custom"] },
        voiceLineUrl: String,
        metadata: Schema.Types.Mixed,
      }],
      choices: [{
        _id: false,
        id: { type: String, required: true }, // UUID
        text: { type: String, required: true },
        targetNodeId: String,
        nextSceneId: { type: Schema.Types.ObjectId, ref: "Scene" },
        conditions: [Schema.Types.Mixed],
        effects: [Schema.Types.Mixed],
        isHidden: { type: Boolean, default: false },
      }],
      mediaElements: [{
        _id: false,
        mediaId: { type: Schema.Types.ObjectId, ref: "Media", required: true },
        alias: String,
        action: { type: String, enum: ["show", "hide", "update", "play", "pause", "stop"], required: true },
        mediaTypeOverride: { type: String, enum: ["image", "audio", "background", "video", "sfx", "characterSprite"] },
        layer: Number,
        position: { x: Number, y: Number, unit: String },
        size: { width: Number, height: Number, unit: String },
        opacity: { type: Number, min: 0, max: 1 },
        rotation: Number,
        scale: Number,
        volume: { type: Number, min: 0, max: 1 },
        loop: Boolean,
        startTime: Number,
        characterEmotion: String,
        transitionIn: { type: { type: String }, duration: Number, delay: Number },
        transitionOut: { type: { type: String }, duration: Number, delay: Number },
        filters: Schema.Types.Mixed,
      }],
      visualEffects: [{
        _id: false,
        type: { type: String, enum: ["screenShake", "screenFlash", "imageFilter", "transition"], required: true },
        targetElementAlias: String,
        duration: { type: Number, required: true, min: 0 },
        intensity: { type: Number, min: 0, max: 1 },
        color: String,
        parameters: Schema.Types.Mixed,
      }],
      gameStateUpdates: [{
        _id: false,
        type: { type: String, enum: ["stat", "relationship", "item", "flag", "achievementUnlock", "currency"], required: true },
        targetId: { type: String, required: true },
        operation: { type: String, enum: ["set", "increment", "decrement", "add", "remove", "toggle"], required: true },
        value: Schema.Types.Mixed,
        amount: Number,
        displayText: String,
        showNotification: { type: Boolean, default: false },
      }],
      script: String,
      scriptParameters: Schema.Types.Mixed,
    },
    settings: {
      defaultDuration: Number,
      backgroundColor: String,
      backgroundImageId: { type: Schema.Types.ObjectId, ref: "Media" },
      backgroundMusicId: { type: Schema.Types.ObjectId, ref: "Media" },
      ambientSoundId: { type: Schema.Types.ObjectId, ref: "Media" },
      skippable: { type: Boolean, default: true },
      autoPlayNext: { type: Boolean, default: false },
      transitionIn: { type: { type: String }, duration: Number },
      transitionOut: { type: { type: String }, duration: Number },
    },
    nextSceneId: { type: Schema.Types.ObjectId, ref: "Scene" }, // Reference to another Scene in the same collection
    authorNotes: String,
    version: { type: Number, default: 1, min: 1 },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ----- Indexes -----
// Unique sceneNumber per episode
SceneSchema.index({ episode: 1, sceneNumber: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
// For querying scenes within an episode, ordered by sceneNumber
SceneSchema.index({ episode: 1, isDeleted: 1, sceneNumber: 1 });
// If scenes are often queried by novel directly
SceneSchema.index({ novel: 1, isDeleted: 1 });
// If StoryMapNodeId is used for linking
SceneSchema.index({ storyMapNodeId: 1, isDeleted: 1 });

// ----- Middleware: Version increment -----
SceneSchema.pre("save", function (next) {
  if (this.isModified() && !this.isNew) {
    this.version = (this.version || 0) + 1;
  }
  next();
});

// ----- Middleware: Validate content based on type -----
SceneSchema.pre("validate", function (next) {
  let isValid = false;
  switch (this.type) {
    case "text":
      isValid = !!this.content.narration;
      break;
    case "dialogue":
      isValid = Array.isArray(this.content.dialogueLines) && this.content.dialogueLines.length > 0 && this.content.dialogueLines.every(d => d.line);
      break;
    case "choice":
      isValid = Array.isArray(this.content.choices) && this.content.choices.length > 0 && this.content.choices.every(c => c.id && c.text && (c.nextSceneId || c.targetNodeId));
      break;
    case "mediaDisplay":
      isValid = Array.isArray(this.content.mediaElements) && this.content.mediaElements.length > 0 && this.content.mediaElements.every(m => m.mediaId && m.action);
      break;
    case "effectTrigger":
      isValid = Array.isArray(this.content.visualEffects) && this.content.visualEffects.length > 0 && this.content.visualEffects.every(e => e.type && e.duration);
      break;
    case "gameStateChange":
      isValid = Array.isArray(this.content.gameStateUpdates) && this.content.gameStateUpdates.length > 0 && this.content.gameStateUpdates.every(u => u.type && u.targetId && u.operation);
      break;
    case "branchPoint": // Branch points might not have direct content, relying on StoryMap or external logic
    case "ending":      // Endings might also be simple or have minimal content
      isValid = true; // Or specific validation if they have expected content structures
      break;
    case "customScript":
      isValid = !!this.content.script;
      break;
    default:
      isValid = false;
  }

  if (!isValid) {
    return next(new Error(`เนื้อหาของฉาก (Scene content) ไม่ถูกต้องสำหรับประเภท '${this.type}'. กรุณาตรวจสอบข้อมูลที่จำเป็นสำหรับประเภทฉากนี้`));
  }
  next();
});

// ----- Model Export -----
// It's generally better to define the model once and export it.
// The function pattern `() => models.Scene || model(...)` is useful to avoid re-compiling model in Next.js hot-reload dev environments.
const SceneModel = () => models.Scene as mongoose.Model<IScene> || model<IScene>("Scene", SceneSchema);

export default SceneModel;

