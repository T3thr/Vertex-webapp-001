// backend/models/Achievement.ts
// โมเดลความสำเร็จ (Achievement Model) - จัดการข้อมูลความสำเร็จที่ผู้ใช้สามารถปลดล็อกได้ (Gamification)
// ออกแบบให้เก็บรายละเอียดของความสำเร็จ, เงื่อนไขการปลดล็อก, และรางวัลที่เกี่ยวข้อง

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// ประเภทของความสำเร็จ (สามารถแบ่งตามหมวดหมู่คล้าย Badge)
// ตัวอย่างการใช้งาน: const category: AchievementCategory = "reading_milestones";
export type AchievementCategory = 
  | "reading_milestones" // เช่น อ่านนิยายครบ X เรื่อง, อ่านตอนครบ Y ตอน
  | "writing_milestones" // เช่น เขียนนิยายเรื่องแรก, เขียนครบ Z คำ
  | "community_participation" // เช่น แสดงความคิดเห็นครบ X ครั้ง, ได้รับไลค์ Y ครั้ง
  | "account_progression" // เช่น ล็อกอินครบ X วัน, ยืนยันอีเมลสำเร็จ
  | "collection_goals" // เช่น สะสมนิยายแฟนตาซีครบ X เรื่อง, ปลดล็อกตัวละครทั้งหมดในเรื่อง Y
  | "event_participation" // เช่น เข้าร่วมกิจกรรมพิเศษ XYZ
  | "other"; // หมวดหมู่อื่นๆ

// อินเทอร์เฟซสำหรับรางวัลที่เกี่ยวข้องกับความสำเร็จ
// ตัวอย่างการใช้งาน: const reward: IAchievementReward = { experiencePoints: 100, coins: 50 };
export interface IAchievementReward {
  badgeAwarded?: Types.ObjectId; // ID ของเหรียญตราที่ได้รับ (อ้างอิง Badge model)
                                 // ตัวอย่าง: new Types.ObjectId("60f5eabc1234567890abcdef")
  experiencePoints?: number; // แต้มประสบการณ์ที่ได้รับ
                             // ตัวอย่าง: 100
  coins?: number; // เหรียญ Coins ที่ได้รับ
                  // ตัวอย่าง: 50
  titleAwarded?: string; // ฉายาที่ได้รับ (ถ้ามีระบบฉายา)
                         // ตัวอย่าง: "นักอ่านตัวยง"
}

// อินเทอร์เฟซหลักสำหรับเอกสารความสำเร็จ (Achievement Document)
export interface IAchievement extends Document {
  _id: Types.ObjectId;
  key: string; // Unique key สำหรับอ้างอิงในโค้ด (เช่น "FIRST_NOVEL_READ", "100_COMMENTS_POSTED")
               // ตัวอย่าง: "FIRST_NOVEL_READ"
  name: string; // ชื่อความสำเร็จที่แสดงผล (เช่น "นักอ่านหน้าใหม่", "นักวิจารณ์ดาวเด่น")
               // ตัวอย่าง: "นักอ่านหน้าใหม่"
  description: string; // คำอธิบายความสำเร็จ และเงื่อนไขการปลดล็อกโดยสังเขป
                       // ตัวอย่าง: "ปลดล็อกเมื่อคุณอ่านนิยายเรื่องแรกจบ"
  detailedCriteria?: string; // (Optional) เงื่อนไขการปลดล็อกอย่างละเอียด (อาจเป็น Markdown)
                             // ตัวอย่าง: "อ่านทุกตอนของนิยายเรื่องใดก็ได้จนจบสมบูรณ์"
  
  iconUrl?: string; // URL ของไอคอนความสำเร็จ (ถ้ามี, อาจใช้ร่วมกับ Badge)
                    // ตัวอย่าง: "https://cdn.novelmaze.com/achievements/first_read.png"
  category: AchievementCategory; // หมวดหมู่ของความสำเร็จ
                                  // ตัวอย่าง: "reading_milestones"
  
  level?: number; // ระดับของความสำเร็จ (ถ้าเป็นความสำเร็จแบบมีหลายขั้น เช่น อ่าน 10, 50, 100 ตอน)
                  // ตัวอย่าง: 1 (สำหรับความสำเร็จขั้นแรก)
  maxLevel?: number; // ระดับสูงสุดของความสำเร็จนี้ (ถ้ามี)
                     // ตัวอย่าง: 3 (สำหรับความสำเร็จที่มี 3 ขั้น)
  
  isRepeatable: boolean; // ความสำเร็จนี้สามารถปลดล็อกซ้ำได้หรือไม่ (เช่น daily login)
                         // ตัวอย่าง: false
  repeatCooldownDays?: number; // ระยะเวลา cooldown ก่อนจะปลดล็อกซ้ำได้ (ถ้า isRepeatable = true)
                               // ตัวอย่าง: 1 (สำหรับ daily login)
  
  rewards: IAchievementReward; // รางวัลที่ได้รับเมื่อปลดล็อกความสำเร็จนี้
  
  isActive: boolean; // ความสำเร็จนี้ยังสามารถปลดล็อกได้หรือไม่ (อาจปิดการใช้งานชั่วคราว)
                     // ตัวอย่าง: true
  isPublic: boolean; // แสดงความสำเร็จนี้ในรายการทั้งหมดหรือไม่ (แม้ยังไม่ปลดล็อก)
                    // ตัวอย่าง: true
  isHiddenUntilUnlocked: boolean; // ซ่อนรายละเอียดความสำเร็จนี้จนกว่าผู้ใช้จะปลดล็อกหรือไม่
                                 // ตัวอย่าง: false
  
  availableFrom?: Date; // วันที่เริ่มให้ปลดล็อกความสำเร็จนี้ (สำหรับ event-specific achievements)
                        // ตัวอย่าง: new Date("2024-06-01T00:00:00.000Z")
  availableUntil?: Date; // วันที่สิ้นสุดการปลดล็อกความสำเร็จนี้
                         // ตัวอย่าง: new Date("2024-06-30T23:59:59.000Z")

  createdAt: Date;
  updatedAt: Date;
}

const AchievementRewardSchema = new Schema<IAchievementReward>(
  {
    badgeAwarded: { type: Schema.Types.ObjectId, ref: "Badge" },
    experiencePoints: { type: Number, min: 0, default: 0 },
    coins: { type: Number, min: 0, default: 0 },
    titleAwarded: { type: String, trim: true, maxlength: 50 },
  },
  { _id: false } // ไม่สร้าง _id สำหรับ subdocument นี้
);

const AchievementSchema = new Schema<IAchievement>(
  {
    key: {
      type: String,
      required: [true, "กรุณาระบุ Key เฉพาะสำหรับความสำเร็จ (Unique key is required)"],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9_]+$/, "Key ต้องประกอบด้วยตัวอักษรภาษาอังกฤษตัวใหญ่, ตัวเลข, และ _ เท่านั้น"],
      index: true,
      // ตัวอย่าง: "FIRST_NOVEL_READ"
    },
    name: {
      type: String,
      required: [true, "กรุณาระบุชื่อความสำเร็จ (Achievement name is required)"],
      trim: true,
      maxlength: [150, "ชื่อความสำเร็จต้องไม่เกิน 150 ตัวอักษร"],
      // ตัวอย่าง: "นักอ่านหน้าใหม่"
    },
    description: {
      type: String,
      required: [true, "กรุณาระบุคำอธิบายความสำเร็จ (Achievement description is required)"],
      trim: true,
      maxlength: [500, "คำอธิบายความสำเร็จต้องไม่เกิน 500 ตัวอักษร"],
      // ตัวอย่าง: "ปลดล็อกเมื่อคุณอ่านนิยายเรื่องแรกจบ"
    },
    detailedCriteria: { 
      type: String, 
      trim: true, 
      maxlength: 2000, 
      // ตัวอย่าง: "ผู้ใช้จะต้องอ่านทุกตอนของนิยายเรื่องใดก็ได้จนถึงสถานะ \'อ่านจบแล้ว\'"
    },
    iconUrl: { 
      type: String, 
      trim: true, 
      // ตัวอย่าง: "/assets/icons/achievements/first_read.svg"
    },
    category: {
      type: String,
      enum: Object.values<AchievementCategory>(["reading_milestones", "writing_milestones", "community_participation", "account_progression", "collection_goals", "event_participation", "other"]),
      required: [true, "กรุณาระบุหมวดหมู่ของความสำเร็จ (Achievement category is required)"],
      index: true,
      // ตัวอย่าง: "reading_milestones"
    },
    level: { 
      type: Number, 
      min: 1, 
      // ตัวอย่าง: 1
    },
    maxLevel: { 
      type: Number, 
      min: 1, 
      // ตัวอย่าง: 3
    },
    isRepeatable: { 
      type: Boolean, 
      default: false, 
      // ตัวอย่าง: false
    },
    repeatCooldownDays: { 
      type: Number, 
      min: 0, 
      // ตัวอย่าง: 1 (สำหรับ daily login)
    },
    rewards: { 
      type: AchievementRewardSchema, 
      default: () => ({ experiencePoints: 0, coins: 0 }),
      // ตัวอย่าง: { experiencePoints: 100, coins: 10, badgeAwarded: new Types.ObjectId() }
    },
    isActive: { 
      type: Boolean, 
      default: true, 
      index: true, 
      // ตัวอย่าง: true
    },
    isPublic: { 
      type: Boolean, 
      default: true, 
      // ตัวอย่าง: true (แสดงให้ทุกคนเห็น แม้ยังไม่ปลดล็อก)
    },
    isHiddenUntilUnlocked: { 
      type: Boolean, 
      default: false, 
      // ตัวอย่าง: false (แสดงรายละเอียดเลย)
    },
    availableFrom: { 
      type: Date, 
      index: true, 
      // ตัวอย่าง: new Date("2024-01-01T00:00:00Z") (สำหรับ achievement ที่มีเวลาจำกัด)
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
AchievementSchema.index({ category: 1, level: 1 }); // สำหรับการค้นหาตามหมวดหมู่และระดับ
AchievementSchema.index({ isActive: 1, isRepeatable: 1 }); // สำหรับการค้นหา achievement ที่ active และทำซ้ำได้
AchievementSchema.index({ isActive: 1, availableFrom: 1, availableUntil: 1 }); // สำหรับ event-based achievements

// ----- Middleware (Pre/Post Hooks) -----
AchievementSchema.pre<IAchievement>("save", function(next) {
  // ถ้า isRepeatable เป็น true แต่ repeatCooldownDays ไม่ได้กำหนดหรือน้อยกว่า 0 ให้ตั้งเป็น 0
  if (this.isRepeatable && (this.repeatCooldownDays === undefined || this.repeatCooldownDays === null || this.repeatCooldownDays < 0)) {
    this.repeatCooldownDays = 0; 
  }
  // ถ้า isRepeatable เป็น false ให้ repeatCooldownDays เป็น undefined
  if (!this.isRepeatable) {
    this.repeatCooldownDays = undefined;
  }
  // ตรวจสอบว่า level ไม่เกิน maxLevel (ถ้าทั้งคู่ถูกกำหนด)
  if (this.level && this.maxLevel && this.level > this.maxLevel) {
    return next(new Error("ระดับปัจจุบัน (level) ต้องไม่เกินระดับสูงสุด (maxLevel)"));
  }
  next();
});

// ----- Model Export -----
// ตรวจสอบว่าโมเดลถูกคอมไพล์ไปแล้วหรือยังก่อนที่จะคอมไพล์ใหม่ เพื่อป้องกันข้อผิดพลาด OverwriteModelError
const AchievementModel = () => models.Achievement as mongoose.Model<IAchievement> || model<IAchievement>("Achievement", AchievementSchema);

export default AchievementModel;

