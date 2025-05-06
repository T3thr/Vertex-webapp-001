// src/backend/models/Media.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface สำหรับ Media document
export interface IMedia extends Document {
  user: Types.ObjectId; // เจ้าของสื่อ
  type: "character" | "background" | "audio" | "effect" | "sprite" | "animation" | "transition" | "font" | "other"; // ประเภทสื่อเพิ่มเติม
  name: string; // ชื่อสื่อ
  url: string; // URL ของสื่อ
  thumbnail?: string; // URL ของภาพตัวอย่างขนาดเล็ก
  metadata: {
    mimeType: string; // ประเภทของไฟล์ (MIME type)
    size: number; // ขนาดไฟล์ (bytes)
    width?: number; // ความกว้าง (สำหรับรูปภาพ)
    height?: number; // ความสูง (สำหรับรูปภาพ)
    duration?: number; // ระยะเวลา (สำหรับเสียงหรือวิดีโอ)
    resolution?: string; // ความละเอียด
    frameCount?: number; // จำนวนเฟรม (สำหรับแอนิเมชัน)
    variants?: Array<{ // รูปแบบต่างๆ ของทรัพยากร
      type: string; // ประเภท (เช่น emotion, pose, outfit)
      name: string; // ชื่อ
      url: string; // URL
      thumbnail?: string; // ภาพตัวอย่าง
    }>;
    layerData?: string; // ข้อมูล layer (JSON string สำหรับไฟล์ที่มีหลาย layer)
    vectorData?: string; // ข้อมูล vector (สำหรับกราฟิกแบบ vector)
    settings?: Record<string, any>; // การตั้งค่าเพิ่มเติม
  };
  tags: string[]; // แท็ก
  folder?: string; // โฟลเดอร์ที่เก็บ (สำหรับจัดระเบียบ)
  isPublic: boolean; // เปิดให้ผู้อื่นใช้งานได้หรือไม่
  isTemplate: boolean; // เป็นเทมเพลตหรือไม่
  isLibrary: boolean; // เป็นส่วนหนึ่งของไลบรารีกลาง
  license: string; // สิทธิ์การใช้งาน
  credits?: string; // เครดิต/แหล่งที่มา
  version: number; // เวอร์ชันของทรัพยากร
  editorSettings?: { // การตั้งค่าสำหรับ editor
    defaultPosition?: { x: number, y: number }; // ตำแหน่งเริ่มต้น
    scale?: number; // ขนาดเริ่มต้น
    zIndex?: number; // ลำดับชั้นเริ่มต้น
    animations?: Array<{
      name: string; // ชื่อแอนิเมชัน
      keyframes: string; // ข้อมูล keyframes (JSON string)
      duration: number; // ระยะเวลา
      easing: string; // รูปแบบการเคลื่อนไหว
    }>;
    interactions?: Array<{
      type: string; // ประเภทการโต้ตอบ (click, hover, etc.)
      action: string; // การกระทำ
      target?: string; // เป้าหมาย
      parameters?: Record<string, any>; // พารามิเตอร์เพิ่มเติม
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema<IMedia>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุเจ้าของสื่อ"],
      index: true,
    },
    type: {
      type: String,
      required: [true, "กรุณาระบุประเภทสื่อ"],
      enum: {
        values: ["character", "background", "audio", "effect", "sprite", "animation", "transition", "font", "other"],
        message: "ประเภทสื่อ {VALUE} ไม่ถูกต้อง",
      },
      index: true,
    },
    name: {
      type: String,
      required: [true, "กรุณาระบุชื่อสื่อ"],
      trim: true,
      maxlength: [100, "ชื่อสื่อต้องไม่เกิน 100 ตัวอักษร"],
    },
    url: {
      type: String,
      required: [true, "กรุณาระบุ URL ของสื่อ"],
      trim: true,
      validate: {
        validator: (v: string) => /^https?:\/\/|^\//.test(v),
        message: "รูปแบบ URL ไม่ถูกต้อง",
      },
    },
    thumbnail: {
      type: String,
      trim: true,
      validate: {
        validator: (v: string) => !v || /^https?:\/\/|^\//.test(v),
        message: "รูปแบบ URL ของภาพตัวอย่างไม่ถูกต้อง",
      },
    },
    metadata: {
      mimeType: { type: String, required: [true, "กรุณาระบุประเภทของไฟล์"] },
      size: {
        type: Number,
        required: [true, "กรุณาระบุขนาดไฟล์"],
        min: [0, "ขนาดไฟล์ต้องไม่ติดลบ"],
      },
      width: { type: Number, min: [0, "ความกว้างต้องไม่ติดลบ"] },
      height: { type: Number, min: [0, "ความสูงต้องไม่ติดลบ"] },
      duration: { type: Number, min: [0, "ระยะเวลาต้องไม่ติดลบ"] },
      resolution: String,
      frameCount: Number,
      variants: [
        {
          type: String,
          name: String,
          url: String,
          thumbnail: String,
        },
      ],
      layerData: String,
      vectorData: String,
      settings: Schema.Types.Mixed,
    },
    tags: {
      type: [String],
      validate: [
        {
          validator: function(v: any[]) {
            return v.length <= 20; // เพิ่มจำนวน tags ที่อนุญาต
          },
          message: "สามารถใส่แท็กได้สูงสุด 20 แท็ก",
        },
      ],
      index: true,
    },
    folder: {
      type: String,
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    isTemplate: {
      type: Boolean,
      default: false,
      index: true,
    },
    isLibrary: {
      type: Boolean,
      default: false,
      index: true,
    },
    license: {
      type: String,
      default: "private",
      enum: {
        values: ["private", "cc0", "ccby", "ccbysa", "ccbyncnd", "commercial", "custom"],
        message: "สิทธิ์การใช้งาน {VALUE} ไม่ถูกต้อง",
      },
    },
    credits: String,
    version: {
      type: Number,
      default: 1,
    },
    editorSettings: {
      defaultPosition: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
      },
      scale: { type: Number, default: 1 },
      zIndex: { type: Number, default: 0 },
      animations: [
        {
          name: String,
          keyframes: String,
          duration: Number,
          easing: String,
        },
      ],
      interactions: [
        {
          type: String,
          action: String,
          target: String,
          parameters: Schema.Types.Mixed,
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// เพิ่ม Indexes สำหรับประสิทธิภาพการค้นหา
MediaSchema.index({ user: 1, type: 1, folder: 1 });
MediaSchema.index({ type: 1, isPublic: 1, isTemplate: 1 });
MediaSchema.index({ type: 1, isLibrary: 1 });
MediaSchema.index({ "metadata.variants.type": 1 });
MediaSchema.index({ tags: 1, type: 1 });

// ฟังก์ชันเพิ่มเติมเพื่อช่วยในการค้นหาและจัดการทรัพยากร
MediaSchema.statics.findByTypeAndTags = function(type: string, tags: string[], isPublic: boolean = true) {
  return this.find({
    type: type,
    tags: { $in: tags },
    isPublic: isPublic,
  });
};

MediaSchema.statics.getTemplates = function(type: string) {
  return this.find({
    type: type,
    isTemplate: true,
    isPublic: true,
  });
};

// Export Model
const MediaModel = () => 
  models.Media as mongoose.Model<IMedia> & {
    findByTypeAndTags: (type: string, tags: string[], isPublic?: boolean) => Promise<IMedia[]>;
    getTemplates: (type: string) => Promise<IMedia[]>;
  } || model<IMedia>("Media", MediaSchema);

export default MediaModel;