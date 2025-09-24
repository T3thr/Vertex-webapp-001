// src/backend/models/UserMentalInsights.ts

// SECTION: Imports
import mongoose, { Document, Model, Schema, Types } from 'mongoose';

// SECTION: Type Definitions and Interfaces

/**
 * @interface IMentalWellbeingInsights
 * @description ข้อมูลเชิงลึกเกี่ยวกับสุขภาพจิตใจของผู้ใช้ (สร้างโดย AI/ML Service, ต้องได้รับความยินยอมอย่างชัดแจ้ง)
 * สอดคล้องกับ ReadingAnalytic_EventStream_Schema.txt (source 7, 8)
 * ข้อมูลนี้มีความละเอียดอ่อนสูงมาก ต้องจัดการด้วยความระมัดระวังสูงสุด และเป็นข้อมูลภายในระบบเท่านั้น
 * การแสดงผลต่อผู้ใช้ต้องผ่านการพิจารณาอย่างรอบคอบ และผู้ใช้ต้อง Opt-in เพื่อดูข้อมูลนี้
 * @property {Date} [lastAssessedAt] - วันที่ทำการประเมินล่าสุด
 * @property {"stable" | "improving" | "showing_concern" | "needs_attention" | "unknown"} [overallEmotionalTrend] - แนวโน้มอารมณ์โดยรวม
 * @property {string[]} [observedPatterns] - รูปแบบพฤติกรรมหรืออารมณ์ที่สังเกตได้
 * @property {number} [stressIndicatorScore] - (คำนวณ) คะแนนบ่งชี้ความเครียด (0-1)
 * @property {number} [anxietyIndicatorScore] - (คำนวณ) คะแนนบ่งชี้ความวิตกกังวล (0-1)
 * @property {number} [resilienceIndicatorScore] - (คำนวณ) คะแนนบ่งชี้ความยืดหยุ่นทางอารมณ์ (0-1)
 * @property {boolean} [consultationRecommended] - ระบบแนะนำให้พิจารณาปรึกษาผู้เชี่ยวชาญหรือไม่
 * @property {Date} [lastRecommendationDismissedAt] - วันที่ผู้ใช้ปิดการแจ้งเตือนคำแนะนำล่าสุด
 * @property {string} [modelVersion] - เวอร์ชันของโมเดล AI/ML ที่ใช้ในการประเมิน
 */
export interface IMentalWellbeingInsights {
  lastAssessedAt?: Date; // วันที่ประเมินล่าสุด
  overallEmotionalTrend?: "stable" | "improving" | "showing_concern" | "needs_attention" | "unknown"; // แนวโน้มอารมณ์โดยรวม
  observedPatterns?: string[]; // รูปแบบที่สังเกตได้ (เช่น 'increased_negativity', 'social_withdrawal')
  stressIndicatorScore?: number; // คะแนนบ่งชี้ความเครียด (0-100)
  anxietyIndicatorScore?: number; // คะแนนบ่งชี้ความวิตกกังวล (0-100)
  resilienceIndicatorScore?: number; // คะแนนบ่งชี้ความยืดหยุ่น (0-100)
  consultationRecommended?: boolean; // แนะนำให้ปรึกษาผู้เชี่ยวชาญหรือไม่
  lastRecommendationDismissedAt?: Date; // วันที่ปิดคำแนะนำล่าสุด
  modelVersion?: string; // เวอร์ชันโมเดล AI ที่ใช้วิเคราะห์
}

/**
 * @interface IUserMentalInsightsDoc
 * @description เอกสาร Mongoose สำหรับ UserMentalInsights (ข้อมูลละเอียดอ่อนสูงสุด)
 * @extends Document
 */
export interface IUserMentalInsightsDoc extends Document {
  userId: Types.ObjectId; // ID ของผู้ใช้ (FK to Users collection)
  insights: IMentalWellbeingInsights; // ข้อมูลเชิงลึก

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// SECTION: Mongoose Schema

const UserMentalInsightsSchema = new Schema<IUserMentalInsightsDoc, Model<IUserMentalInsightsDoc>>({
  // SECTION: Core Fields
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'จำเป็นต้องมี ID ผู้ใช้'],
    unique: true,
    index: true,
  },

  // SECTION: Embedded Sensitive Insights Data
  // *** หมายเหตุสำคัญด้านความปลอดภัย ***
  // ข้อมูลทั้งหมดในส่วนนี้ถูกตั้งค่า `select: false` โดยปริยาย
  // เพื่อป้องกันไม่ให้ข้อมูลถูกดึงไปโดยไม่ได้ตั้งใจในการ query ทั่วไป
  // การจะดึงข้อมูลส่วนนี้ต้องใช้ .select('+insights.fieldName') อย่างชัดเจน
  insights: {
    type: new Schema<IMentalWellbeingInsights>({
      lastAssessedAt: { type: Date, select: false },
      overallEmotionalTrend: { type: String, enum: ["stable", "improving", "showing_concern", "needs_attention", "unknown"], select: false },
      observedPatterns: { type: [String], select: false },
      stressIndicatorScore: { type: Number, min: 0, max: 100, select: false },
      anxietyIndicatorScore: { type: Number, min: 0, max: 100, select: false },
      resilienceIndicatorScore: { type: Number, min: 0, max: 100, select: false },
      consultationRecommended: { type: Boolean, select: false },
      lastRecommendationDismissedAt: { type: Date, select: false },
      modelVersion: { type: String, select: false },
    }, { _id: false }),
    required: true,
    default: {}
  }
}, {
  // SECTION: Schema Options
  timestamps: true,
  collection: 'user_mental_insights', // *** ใช้ชื่อ collection ที่ชัดเจนและแยกต่างหาก ***
  autoIndex: process.env.NODE_ENV !== 'production',
  // เพิ่มความปลอดภัยอีกชั้นด้วยการไม่อนุญาตให้ client ส่ง field ที่ไม่มีใน schema เข้ามา
  strict: 'throw',
});

// SECTION: Middleware (Hooks)
UserMentalInsightsSchema.pre('save', function(next) {
  // Middleware นี้อาจใช้สำหรับ Logging การเข้าถึงหรือการเปลี่ยนแปลงข้อมูลที่ละเอียดอ่อนนี้
  // เช่น, การบันทึก audit log ว่าใครพยายามแก้ไขข้อมูลนี้
  console.log(`[Security Audit] Attempting to save mental insights for userId: ${this.userId}`);
  next();
});

// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// 1.  **!!! การแยกฐานข้อมูล (Database Isolation) !!!:** ตามที่แนะนำในแผนสถาปัตยกรรม ข้อมูลนี้มีความละเอียดอ่อนสูงสุด (EXTREMELY SENSITIVE) และ **ควรอย่างยิ่ง** ที่จะถูกจัดเก็บใน **ฐานข้อมูลที่แยกจากกันโดยสิ้นเชิง** (a completely separate database) ไม่ใช่แค่แยก collection
// 2.  **การเข้ารหัส (Encryption):** ควรใช้การเข้ารหัสในระดับ Field (Field-Level Encryption) สำหรับข้อมูลทั้งหมดใน `insights` และต้องแน่ใจว่าฐานข้อมูลมีการเข้ารหัสขณะพัก (Encryption at Rest) และการเชื่อมต่อทั้งหมดใช้ TLS/SSL (Encryption in Transit)
// 3.  **การควบคุมการเข้าถึง (Access Control):** ต้องมีนโยบายการเข้าถึงที่เข้มงวดที่สุด (Principle of Least Privilege) ควรมีเพียง Microservice ที่รับผิดชอบด้านการวิเคราะห์สุขภาพจิตเท่านั้นที่สามารถเข้าถึง Collection (หรือฐานข้อมูล) นี้ได้
// 4.  **Audit Logs:** ควรมีระบบ Audit Log ที่ละเอียดและปลอดภัย เพื่อบันทึกทุกการเข้าถึง (อ่าน, เขียน, แก้ไข, ลบ) ข้อมูลใน Collection นี้
// 5.  **Anonymization:** ในการนำข้อมูลไปใช้เพื่อการวิเคราะห์ในภาพรวม ต้องผ่านกระบวนการทำให้ข้อมูลนิรนาม (Anonymization) หรือ De-identification ก่อนเสมอ

// SECTION: Model Export
// ใช้ try-catch เพื่อป้องกันปัญหา OverwriteModelError
let UserMentalInsights: mongoose.Model<IUserMentalInsightsDoc>;

try {
  // ตรวจสอบว่ามีการสร้างโมเดลไว้แล้วหรือไม่
  if (mongoose.models && mongoose.models.UserMentalInsights) {
    UserMentalInsights = mongoose.models.UserMentalInsights as mongoose.Model<IUserMentalInsightsDoc>;
  } else {
    UserMentalInsights = mongoose.model<IUserMentalInsightsDoc>('UserMentalInsights', UserMentalInsightsSchema);
  }
} catch (error) {
  // กรณีเกิดข้อผิดพลาด ให้ใช้โมเดลที่มีอยู่แล้ว
  console.error("Error creating UserMentalInsights model:", error);
  UserMentalInsights = mongoose.models.UserMentalInsights as mongoose.Model<IUserMentalInsightsDoc>;
}

export default UserMentalInsights;
