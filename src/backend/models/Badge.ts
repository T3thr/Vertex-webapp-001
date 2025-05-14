// backend/models/Badge.ts
// โมเดลเหรียญตรา (Badge Model) - จัดการข้อมูลเหรียญตราที่ผู้ใช้สามารถได้รับ (Gamification)
// ออกแบบให้เก็บรายละเอียดของเหรียญตรา, เงื่อนไขการได้รับ, และความหายาก

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// ประเภทของเหรียญตรา (สามารถแบ่งตามหมวดหมู่เพื่อการจัดระเบียบ)
// ตัวอย่างการใช้งาน: const category: BadgeCategory = "reading_achievements";
export type BadgeCategory = 
  | "reading_achievements" // เหรียญตราจากการอ่าน (เช่น อ่านครบ X เรื่อง)
  | "writing_achievements" // เหรียญตราจากการเขียน (เช่น เขียนนิยายเรื่องแรก)
  | "community_engagement" // เหรียญตราจากการมีส่วนร่วม (เช่น คอมเมนต์, ไลค์)
  | "event_participation" // เหรียญตราจากการเข้าร่วมกิจกรรมพิเศษ
  | "milestones" // เหรียญตราสำหรับความสำเร็จสำคัญ (เช่น ครบรอบ 1 ปี)
  | "special_recognition" // เหรียญตราพิเศษ (เช่น ผู้สนับสนุนดีเด่น)
  | "other"; // หมวดหมู่อื่นๆ

// ระดับความหายากของเหรียญตรา
// ตัวอย่างการใช้งาน: const rarity: BadgeRarity = "rare";
export type BadgeRarity = 
  | "common" // ทั่วไป
  | "uncommon" // ไม่บ่อย
  | "rare" // หายาก
  | "epic" // หายากมาก
  | "legendary" // ระดับตำนาน
  | "mythic"; // ระดับเทพนิยาย (สำหรับกิจกรรมพิเศษสุดๆ)

// อินเทอร์เฟซหลักสำหรับเอกสารเหรียญตรา (Badge Document)
export interface IBadge extends Document {
  _id: Types.ObjectId;
  key: string; // Unique key สำหรับอ้างอิงในโค้ด (เช่น "FIRST_COMMENT_BADGE", "YEAR_ONE_VETERAN")
               // ตัวอย่าง: "FIRST_COMMENT_BADGE"
  name: string; // ชื่อเหรียญตราที่แสดงผล (เช่น "นักสื่อสารมือใหม่", "ผู้อยู่คู่ NovelMaze ปีแรก")
               // ตัวอย่าง: "นักสื่อสารมือใหม่"
  description: string; // คำอธิบายเหรียญตรา และเงื่อนไขการได้รับโดยสังเขป
                       // ตัวอย่าง: "มอบให้เมื่อคุณแสดงความคิดเห็นครั้งแรกบนแพลตฟอร์ม"
  detailedCriteria?: string; // (Optional) เงื่อนไขการได้รับอย่างละเอียด (อาจเป็น Markdown)
                             // ตัวอย่าง: "ผู้ใช้จะต้องโพสต์ความคิดเห็นอย่างน้อย 1 ความคิดเห็นในนิยาย, ตอน, หรือโปรไฟล์ผู้ใช้อื่น"
  
  imageUrl: string; // URL ของรูปภาพเหรียญตรา (สำคัญมากสำหรับ UI)
                    // ตัวอย่าง: "https://cdn.novelmaze.com/badges/first_comment.png"
  
  category: BadgeCategory; // หมวดหมู่ของเหรียญตรา
                           // ตัวอย่าง: "community_engagement"
  rarity: BadgeRarity; // ระดับความหายากของเหรียญตรา
                       // ตัวอย่าง: "common"
  
  experiencePointsAwarded?: number; // (Optional) แต้มประสบการณ์ที่อาจจะให้พร้อมกับเหรียญตรานี้
                                    // ตัวอย่าง: 50
  coinsAwarded?: number; // (Optional) เหรียญ Coins ที่อาจจะให้พร้อมกับเหรียญตรานี้
                         // ตัวอย่าง: 10

  achievementRequired?: Types.ObjectId; // (Optional) ID ของ Achievement ที่ต้องปลดล็อกก่อนถึงจะได้ Badge นี้ (ถ้า Badge ผูกกับ Achievement)
                                        // ตัวอย่าง: new Types.ObjectId("60f5eabc1234567890achieve1")
  
  isActive: boolean; // เหรียญตรานี้ยังสามารถได้รับหรือไม่ (อาจปิดการใช้งานชั่วคราว)
                     // ตัวอย่าง: true
  isPublic: boolean; // แสดงเหรียญตรานี้ในรายการทั้งหมดหรือไม่ (แม้ยังไม่ได้รับ)
                    // ตัวอย่าง: true
  isHiddenUntilEarned: boolean; // ซ่อนรายละเอียดเหรียญตรานี้จนกว่าผู้ใช้จะได้รับหรือไม่
                                // ตัวอย่าง: false

  availableFrom?: Date; // วันที่เริ่มให้รับเหรียญตรานี้ (สำหรับ event-specific badges)
                        // ตัวอย่าง: new Date("2024-07-01T00:00:00.000Z")
  availableUntil?: Date; // วันที่สิ้นสุดการรับเหรียญตรานี้
                         // ตัวอย่าง: new Date("2024-07-31T23:59:59.000Z")

  createdAt: Date;
  updatedAt: Date;
}

const BadgeSchema = new Schema<IBadge>(
  {
    key: {
      type: String,
      required: [true, "กรุณาระบุ Key เฉพาะสำหรับเหรียญตรา (Unique key is required)"],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9_]+$/, "Key ต้องประกอบด้วยตัวอักษรภาษาอังกฤษตัวใหญ่, ตัวเลข, และ _ เท่านั้น"],
      index: true,
      // ตัวอย่าง: "FIRST_NOVEL_COMPLETED"
    },
    name: {
      type: String,
      required: [true, "กรุณาระบุชื่อเหรียญตรา (Badge name is required)"],
      trim: true,
      maxlength: [100, "ชื่อเหรียญตราต้องไม่เกิน 100 ตัวอักษร"],
      // ตัวอย่าง: "นักอ่านพิชิตนิยาย"
    },
    description: {
      type: String,
      required: [true, "กรุณาระบุคำอธิบายเหรียญตรา (Badge description is required)"],
      trim: true,
      maxlength: [300, "คำอธิบายเหรียญตราต้องไม่เกิน 300 ตัวอักษร"],
      // ตัวอย่าง: "มอบให้เมื่อคุณอ่านนิยายจบครบ 1 เรื่อง"
    },
    detailedCriteria: { 
      type: String, 
      trim: true, 
      maxlength: 1000, 
      // ตัวอย่าง: "ผู้ใช้จะต้องอ่านทุกตอนของนิยายเรื่องใดก็ได้จนถึงสถานะ \'อ่านจบแล้ว\' เป็นจำนวน 1 เรื่อง"
    },
    imageUrl: {
      type: String,
      required: [true, "กรุณาระบุ URL รูปภาพของเหรียญตรา (Image URL is required)"],
      trim: true,
      // ตัวอย่าง: "/assets/images/badges/novel_completer_common.svg"
    },
    category: {
      type: String,
      enum: Object.values<BadgeCategory>(["reading_achievements", "writing_achievements", "community_engagement", "event_participation", "milestones", "special_recognition", "other"]),
      required: [true, "กรุณาระบุหมวดหมู่ของเหรียญตรา (Badge category is required)"],
      index: true,
      // ตัวอย่าง: "reading_achievements"
    },
    rarity: {
      type: String,
      enum: Object.values<BadgeRarity>(["common", "uncommon", "rare", "epic", "legendary", "mythic"]),
      default: "common",
      index: true,
      // ตัวอย่าง: "common"
    },
    experiencePointsAwarded: { 
      type: Number, 
      min: 0, 
      default: 0, 
      // ตัวอย่าง: 20
    },
    coinsAwarded: { 
      type: Number, 
      min: 0, 
      default: 0, 
      // ตัวอย่าง: 5
    },
    achievementRequired: { 
      type: Schema.Types.ObjectId, 
      ref: "Achievement", 
      // ตัวอย่าง: new Types.ObjectId() (ถ้า badge นี้ผูกกับการปลดล็อก achievement อื่น)
    },
    isActive: { 
      type: Boolean, 
      default: true, 
      index: true, 
      // ตัวอย่าง: true (เหรียญตรานี้ยังคงแจกอยู่)
    },
    isPublic: { 
      type: Boolean, 
      default: true, 
      // ตัวอย่าง: true (แสดงให้ทุกคนเห็น แม้ยังไม่ได้รับ)
    },
    isHiddenUntilEarned: { 
      type: Boolean, 
      default: false, 
      // ตัวอย่าง: false (แสดงรายละเอียดเลย)
    },
    availableFrom: { 
      type: Date, 
      index: true, 
      // ตัวอย่าง: new Date("2024-01-01T00:00:00Z") (สำหรับ badge ที่มีเวลาจำกัด)
    },
    availableUntil: { 
      type: Date, 
      index: true, 
      // ตัวอย่าง: new Date("2024-12-31T23:59:59Z")
    },
  },
  {
    timestamps: true, // สร้าง createdAt และ updatedAt โดยอัตโนมัติ
  }
);

// ----- Indexes เพิ่มเติม -----
BadgeSchema.index({ category: 1, rarity: 1 }); // สำหรับการค้นหาตามหมวดหมู่และความหายาก
BadgeSchema.index({ isActive: 1, isPublic: 1 }); // สำหรับการแสดงรายการ badge ที่ active และ public

// ----- Model Export -----
const BadgeModel = () => models.Badge as mongoose.Model<IBadge> || model<IBadge>("Badge", BadgeSchema);

export default BadgeModel;

