// src/backend/models/StoryMap.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface สำหรับ StoryMap document
export interface IStoryMap extends Document {
  novel: Types.ObjectId; // อ้างอิงไปยังนิยาย
  title: string; // ชื่อแผนผัง
  description?: string; // คำอธิบาย
  structure: {
    nodes: Array<{ // โหนดในแผนผัง (อาจเป็นตอน, ฉาก, หรือจุดแยกเส้นเรื่อง)
      id: string; // ID ภายใน
      type: "episode" | "scene" | "branch" | "end" | "note"; // ประเภทโหนด
      title: string; // ชื่อโหนด
      description?: string; // คำอธิบาย
      position: { x: number, y: number }; // ตำแหน่งในแผนผัง
      size?: { width: number, height: number }; // ขนาด
      color?: string; // สี
      icon?: string; // ไอคอน
      episodeId?: Types.ObjectId; // อ้างอิงไปยังตอน (ถ้ามี)
      sceneId?: Types.ObjectId; // อ้างอิงไปยังฉาก (ถ้ามี)
      metadata?: Record<string, any>; // ข้อมูลเพิ่มเติม
    }>;
    edges: Array<{ // เส้นเชื่อมระหว่างโหนด
      id: string; // ID ภายใน
      source: string; // ID ของโหนดต้นทาง
      target: string; // ID ของโหนดปลายทาง
      type: "normal" | "choice" | "condition"; // ประเภทเส้นเชื่อม
      label?: string; // ข้อความกำกับ
      style?: string; // สไตล์เส้น (solid, dashed, etc.)
      color?: string; // สี
      condition?: string; // เงื่อนไข (ถ้ามี)
      metadata?: Record<string, any>; // ข้อมูลเพิ่มเติม
    }>;
    groups?: Array<{ // กลุ่มในแผนผัง
      id: string; // ID ภายใน
      title: string; // ชื่อกลุ่ม
      nodes: string[]; // ID ของโหนดในกลุ่ม
      color?: string; // สี
      position?: { x: number, y: number }; // ตำแหน่ง
      size?: { width: number, height: number }; // ขนาด
    }>;
  };
  version: number; // เวอร์ชัน
  lastModified: Date; // วันที่แก้ไขล่าสุด
  isDeleted: boolean; // สถานะการลบ (soft delete)
}

const StoryMapSchema = new Schema<IStoryMap>(
  {
    novel: {
      type: Schema.Types.ObjectId,
      ref: "Novel",
      required: [true, "กรุณาระบุนิยาย"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "กรุณาระบุชื่อแผนผัง"],
      trim: true,
      maxlength: [100, "ชื่อแผนผังต้องไม่เกิน 100 ตัวอักษร"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "คำอธิบายต้องไม่เกิน 500 ตัวอักษร"],
    },
    structure: {
      nodes: [
        {
          id: {
            type: String,
            required: true,
          },
          type: {
            type: String,
            enum: {
              values: ["episode", "scene", "branch", "end", "note"],
              message: "ประเภทโหนด {VALUE} ไม่ถูกต้อง",
            },
            required: true,
          },
          title: {
            type: String,
            required: true,
            trim: true,
          },
          description: String,
          position: {
            x: { type: Number, required: true },
            y: { type: Number, required: true },
          },
          size: {
            width: Number,
            height: Number,
          },
          color: String,
          icon: String,
          episodeId: {
            type: Schema.Types.ObjectId,
            ref: "Episode",
          },
          sceneId: {
            type: Schema.Types.ObjectId,
            ref: "Scene",
          },
          metadata: Schema.Types.Mixed,
        },
      ],
      edges: [
        {
          id: {
            type: String,
            required: true,
          },
          source: {
            type: String,
            required: true,
          },
          target: {
            type: String,
            required: true,
          },
          type: {
            type: String,
            enum: {
              values: ["normal", "choice", "condition"],
              message: "ประเภทเส้นเชื่อม {VALUE} ไม่ถูกต้อง",
            },
            default: "normal",
          },
          label: String,
          style: String,
          color: String,
          condition: String,
          metadata: Schema.Types.Mixed,
        },
      ],
      groups: [
        {
          id: {
            type: String,
            required: true,
          },
          title: {
            type: String,
            required: true,
            trim: true,
          },
          nodes: {
            type: [String],
            required: true,
          },
          color: String,
          position: {
            x: Number,
            y: Number,
          },
          size: {
            width: Number,
            height: Number,
          },
        },
      ],
    },
    version: {
      type: Number,
      default: 1,
    },
    lastModified: {
      type: Date,
      default: Date.now,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware
StoryMapSchema.pre("save", function(next) {
  if (this.isModified("structure")) {
    this.version += 1;
    this.lastModified = new Date();
  }
  next();
});

// Export Model
const StoryMapModel = () => 
  models.StoryMap as mongoose.Model<IStoryMap> || model<IStoryMap>("StoryMap", StoryMapSchema);

export default StoryMapModel;