// src/backend/models/Scene.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface สำหรับ Scene document (สำหรับใช้ในทั้ง Episode)
export interface IScene extends Document {
  novel: Types.ObjectId; // อ้างอิงไปยังนิยาย
  episode: Types.ObjectId; // อ้างอิงไปยังตอน
  title: string; // ชื่อฉาก
  order: number; // ลำดับฉากในตอน
  background: { // ฉากหลัง
    mediaId?: Types.ObjectId; // อ้างอิงไปยัง Media
    url?: string; // URL ของฉากหลัง (กรณีไม่ได้อ้างอิง Media)
    position: { x: number, y: number }; // ตำแหน่ง
    scale: number; // ขนาด
    rotation: number; // การหมุน
    opacity: number; // ความโปร่งใส
    filter?: string; // ฟิลเตอร์ (CSS filters)
  };
  characters: Array<{ // ตัวละครในฉาก
    mediaId?: Types.ObjectId; // อ้างอิงไปยัง Media
    url?: string; // URL ของตัวละคร (กรณีไม่ได้อ้างอิง Media)
    name: string; // ชื่อตัวละคร
    position: { x: number, y: number }; // ตำแหน่ง
    scale: number; // ขนาด
    rotation: number; // การหมุน
    opacity: number; // ความโปร่งใส
    zIndex: number; // ลำดับชั้น
    emotion: string; // อารมณ์ของตัวละคร (เช่น normal, happy, sad)
    variant: string; // รูปแบบตัวละคร (เช่น outfit1, outfit2)
    animation?: { // แอนิเมชัน (ถ้ามี)
      type: string; // ประเภทแอนิเมชัน
      duration: number; // ระยะเวลา
      easing: string; // รูปแบบการเคลื่อนไหว
      keyframes?: string; // ข้อมูล keyframes (JSON string)
    };
    speaking: boolean; // กำลังพูดหรือไม่
  }>;
  dialogues: Array<{ // บทสนทนาในฉาก
    character?: string; // ชื่อตัวละครที่พูด (ถ้ามี)
    text: string; // ข้อความ
    position?: { x: number, y: number }; // ตำแหน่ง (optional)
    style?: { // สไตล์ข้อความ
      fontSize?: number; // ขนาดตัวอักษร
      fontFamily?: string; // แบบอักษร
      color?: string; // สี
      background?: string; // พื้นหลัง
      padding?: string; // ระยะห่าง
      borderRadius?: string; // มุมขอบ
      boxShadow?: string; // เงา
      custom?: string; // CSS แบบกำหนดเอง
    };
    voiceOver?: { // เสียงพูด (ถ้ามี)
      mediaId?: Types.ObjectId; // อ้างอิงไปยัง Media
      url?: string; // URL ของเสียง
      duration?: number; // ระยะเวลา
    };
    effects?: Array<{ // เอฟเฟกต์
      type: string; // ประเภทเอฟเฟกต์ (เช่น typing, shake, fade)
      duration: number; // ระยะเวลา
      parameters?: Record<string, any>; // พารามิเตอร์เพิ่มเติม
    }>;
    choices?: Array<{ // ตัวเลือกในบทสนทนา (สำหรับแบบ interactive)
      text: string; // ข้อความตัวเลือก
      nextScene?: Types.ObjectId; // ฉากถัดไป (ถ้าตัวเลือกนี้ถูกเลือก)
      condition?: string; // เงื่อนไข (JavaScript expression)
      variable?: { // ตัวแปรที่จะเปลี่ยนแปลง
        name: string; // ชื่อตัวแปร
        value: any; // ค่าที่จะกำหนด
        operation?: string; // การดำเนินการ (set, add, subtract, etc.)
      };
    }>;
  }>;
  audio: Array<{ // เสียงประกอบ
    mediaId?: Types.ObjectId; // อ้างอิงไปยัง Media
    url?: string; // URL ของเสียง
    type: "bgm" | "sfx" | "ambient"; // ประเภทเสียง
    volume: number; // ระดับเสียง (0-1)
    loop: boolean; // เล่นซ้ำหรือไม่
    fadeIn?: number; // ระยะเวลา fade in (ms)
    fadeOut?: number; // ระยะเวลา fade out (ms)
    startTime?: number; // เวลาเริ่มต้น (ms)
    endTime?: number; // เวลาสิ้นสุด (ms)
  }>;
  effects: Array<{ // เอฟเฟกต์ฉาก
    type: string; // ประเภทเอฟเฟกต์
    target?: string; // เป้าหมาย (scene, character, background, etc.)
    mediaId?: Types.ObjectId; // อ้างอิงไปยัง Media (ถ้ามี)
    url?: string; // URL (ถ้ามี)
    startTime: number; // เวลาเริ่มต้น (ms)
    duration: number; // ระยะเวลา (ms)
    parameters?: Record<string, any>; // พารามิเตอร์เพิ่มเติม
  }>;
  transitions: { // การเปลี่ยนฉาก
    in?: { // transition เข้า
      type: string; // ประเภท transition
      duration: number; // ระยะเวลา (ms)
      parameters?: Record<string, any>; // พารามิเตอร์เพิ่มเติม
    };
    out?: { // transition ออก
      type: string; // ประเภท transition
      duration: number; // ระยะเวลา (ms)
      parameters?: Record<string, any>; // พารามิเตอร์เพิ่มเติม
    };
  };
  variables?: Record<string, any>; // ตัวแปรในฉาก (สำหรับแบบ interactive)
  metadata: {
    duration?: number; // ระยะเวลาโดยประมาณของฉาก (ms)
    tags?: string[]; // แท็ก
    notes?: string; // บันทึกสำหรับผู้เขียน
    version: number; // เวอร์ชันของฉาก
  };
  editorState?: string; // สถานะของ editor (JSON string)
  isDeleted: boolean; // สถานะการลบ (soft delete)
}

const SceneSchema = new Schema<IScene>(
  {
    novel: {
      type: Schema.Types.ObjectId,
      ref: "Novel",
      required: [true, "กรุณาระบุนิยาย"],
      index: true,
    },
    episode: {
      type: Schema.Types.ObjectId,
      ref: "Episode",
      required: [true, "กรุณาระบุตอน"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "กรุณาระบุชื่อฉาก"],
      trim: true,
      maxlength: [100, "ชื่อฉากต้องไม่เกิน 100 ตัวอักษร"],
    },
    order: {
      type: Number,
      required: [true, "กรุณาระบุลำดับฉาก"],
      min: [0, "ลำดับฉากต้องไม่ติดลบ"],
      index: true,
    },
    background: {
      mediaId: {
        type: Schema.Types.ObjectId,
        ref: "Media",
      },
      url: String,
      position: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
      },
      scale: { type: Number, default: 1 },
      rotation: { type: Number, default: 0 },
      opacity: { type: Number, default: 1, min: 0, max: 1 },
      filter: String,
    },
    characters: [
      {
        mediaId: {
          type: Schema.Types.ObjectId,
          ref: "Media",
        },
        url: String,
        name: { type: String, required: true },
        position: {
          x: { type: Number, default: 0 },
          y: { type: Number, default: 0 },
        },
        scale: { type: Number, default: 1 },
        rotation: { type: Number, default: 0 },
        opacity: { type: Number, default: 1, min: 0, max: 1 },
        zIndex: { type: Number, default: 1 },
        emotion: { type: String, default: "normal" },
        variant: String,
        animation: {
          type: String,
          duration: Number,
          easing: String,
          keyframes: String,
        },
        speaking: { type: Boolean, default: false },
      },
    ],
    dialogues: [
      {
        character: String,
        text: { type: String, required: true },
        position: {
          x: Number,
          y: Number,
        },
        style: {
          fontSize: Number,
          fontFamily: String,
          color: String,
          background: String,
          padding: String,
          borderRadius: String,
          boxShadow: String,
          custom: String,
        },
        voiceOver: {
          mediaId: {
            type: Schema.Types.ObjectId,
            ref: "Media",
          },
          url: String,
          duration: Number,
        },
        effects: [
          {
            type: String,
            duration: Number,
            parameters: Schema.Types.Mixed,
          },
        ],
        choices: [
          {
            text: { type: String, required: true },
            nextScene: {
              type: Schema.Types.ObjectId,
              ref: "Scene",
            },
            condition: String,
            variable: {
              name: String,
              value: Schema.Types.Mixed,
              operation: String,
            },
          },
        ],
      },
    ],
    audio: [
      {
        mediaId: {
          type: Schema.Types.ObjectId,
          ref: "Media",
        },
        url: String,
        type: {
          type: String,
          enum: {
            values: ["bgm", "sfx", "ambient"],
            message: "ประเภทเสียง {VALUE} ไม่ถูกต้อง",
          },
          required: true,
        },
        volume: { type: Number, default: 1, min: 0, max: 1 },
        loop: { type: Boolean, default: false },
        fadeIn: Number,
        fadeOut: Number,
        startTime: Number,
        endTime: Number,
      },
    ],
    effects: [
      {
        type: { type: String, required: true },
        target: String,
        mediaId: {
          type: Schema.Types.ObjectId,
          ref: "Media",
        },
        url: String,
        startTime: { type: Number, required: true },
        duration: { type: Number, required: true },
        parameters: Schema.Types.Mixed,
      },
    ],
    transitions: {
      in: {
        type: String,
        duration: Number,
        parameters: Schema.Types.Mixed,
      },
      out: {
        type: String,
        duration: Number,
        parameters: Schema.Types.Mixed,
      },
    },
    variables: Schema.Types.Mixed,
    metadata: {
      duration: Number,
      tags: [String],
      notes: String,
      version: { type: Number, default: 1 },
    },
    editorState: String,
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
SceneSchema.index({ episode: 1, order: 1 });
SceneSchema.index({ novel: 1, episode: 1, isDeleted: 1 });
SceneSchema.index({ "metadata.tags": 1 });

// Export Model
const SceneModel = () => 
  models.Scene as mongoose.Model<IScene> || model<IScene>("Scene", SceneSchema);

export default SceneModel;