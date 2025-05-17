// src/backend/models/ReadingAnalytic.ts
// โมเดลโปรไฟล์การวิเคราะห์การอ่านของผู้ใช้ (User Reading Analytic Profile Model)
// ทำหน้าที่เป็นศูนย์กลางสำหรับข้อมูลการวิเคราะห์ของผู้ใช้แต่ละคน โดยเชื่อมโยงไปยัง Event Streams และ Summaries ที่เกี่ยวข้อง
// และเก็บสถานะการตั้งค่าการวิเคราะห์ระดับสูงของผู้ใช้

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IUser } from "./User"; // สำหรับ userId
import { IReadingAnalytic_EventStream } from "./ReadingAnalytic_EventStream"; // สำหรับ eventStreamDocId
import { IReadingAnalytic_Summary } from "./ReadingAnalytic_Summary"; // สำหรับ overallSummaryDocId

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล ReadingAnalytic (User Analytics Profile)
// ==================================================================================================

/**
 * @enum {string} AnalyticsProcessingStatus
 * @description สถานะการประมวลผลข้อมูลวิเคราะห์
 * - `IDLE`: ไม่มีการประมวลผล
 * - `PENDING`: รอการประมวลผล
 * - `PROCESSING`: กำลังประมวลผล
 * - `COMPLETED`: ประมวลผลสำเร็จ
 * - `FAILED`: การประมวลผลล้มเหลว
 */
export enum AnalyticsProcessingStatus {
  IDLE = "idle",
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

/**
 * @interface IAnalyticsConsentSnapshot
 * @description ภาพรวมสถานะความยินยอมในการวิเคราะห์ข้อมูลของผู้ใช้ (Snapshot)
 * @property {boolean} hasConsented - ผู้ใช้ให้ความยินยอมหรือไม่
 * @property {Date} [consentLastUpdatedAt] - วันที่อัปเดตความยินยอมล่าสุด
 * @property {string[]} [consentedPurposes] - วัตถุประสงค์ที่ผู้ใช้ยินยอม (เช่น " personalization", "mental_health_insights")
 */
export interface IAnalyticsConsentSnapshot {
  hasConsented: boolean;
  consentLastUpdatedAt?: Date;
  consentedPurposes?: string[];
}
const AnalyticsConsentSnapshotSchema = new Schema<IAnalyticsConsentSnapshot>(
  {
    hasConsented: { type: Boolean, required: true, default: false },
    consentLastUpdatedAt: { type: Date },
    consentedPurposes: [{ type: String, trim: true }],
  },
  { _id: false }
);

/**
 * @interface IProcessingStatusDetails
 * @description รายละเอียดสถานะการประมวลผลข้อมูล
 * @property {AnalyticsProcessingStatus} eventStreamProcessingStatus - สถานะการประมวลผล Event Stream ล่าสุด
 * @property {Date} [lastEventProcessedTimestamp] - Timestamp ของ Event ล่าสุดที่ประมวลผล
 * @property {AnalyticsProcessingStatus} summaryAggregationStatus - สถานะการ Aggregate ข้อมูลสรุป ล่าสุด
 * @property {Date} [lastSummaryAggregatedTimestamp] - Timestamp ของการ Aggregate ข้อมูลสรุปล่าสุด
 */
export interface IProcessingStatusDetails {
  eventStreamProcessingStatus?: AnalyticsProcessingStatus;
  lastEventProcessedTimestamp?: Date;
  summaryAggregationStatus?: AnalyticsProcessingStatus;
  lastSummaryAggregatedTimestamp?: Date;
}
const ProcessingStatusDetailsSchema = new Schema<IProcessingStatusDetails>(
  {
    eventStreamProcessingStatus: { type: String, enum: Object.values(AnalyticsProcessingStatus), default: AnalyticsProcessingStatus.IDLE },
    lastEventProcessedTimestamp: { type: Date },
    summaryAggregationStatus: { type: String, enum: Object.values(AnalyticsProcessingStatus), default: AnalyticsProcessingStatus.IDLE },
    lastSummaryAggregatedTimestamp: { type: Date },
  },
  { _id: false }
);

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร ReadingAnalytic (IReadingAnalytic Document Interface)
// ==================================================================================================

/**
 * @interface IReadingAnalytic
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารโปรไฟล์การวิเคราะห์การอ่านของผู้ใช้ใน Collection "readinganalytics"
 *              ทำหน้าที่เป็น Hub เชื่อมโยงข้อมูลวิเคราะห์ต่างๆ ของผู้ใช้
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสาร
 * @property {Types.ObjectId | IUser} userId - ID ของผู้ใช้ (**จำเป็น**, อ้างอิง User model, unique)
 * @property {Types.ObjectId | IReadingAnalytic_EventStream} [eventStreamDocId] - ID ของเอกสาร Event Stream ของผู้ใช้ (ถ้ามี)
 * @property {Types.ObjectId | IReadingAnalytic_Summary} [overallUserSummaryDocId] - ID ของเอกสารสรุปข้อมูลการอ่านโดยรวมของผู้ใช้ (ถ้ามี, summaryForType: USER, timePeriod: ALL_TIME)
 * @property {Date} [lastActivityAt] - Timestamp ของกิจกรรมการอ่านล่าสุดของผู้ใช้
 * @property {IAnalyticsConsentSnapshot} analyticsConsentSnapshot - ภาพรวมสถานะความยินยอมในการวิเคราะห์ข้อมูล (ข้อมูลหลักอยู่ที่ User model)
 * @property {IProcessingStatusDetails} processingStatus - สถานะการประมวลผลข้อมูลวิเคราะห์
 * @property {boolean} personalizedRecommendationsEnabled - ผู้ใช้เปิดใช้งานการแนะนำส่วนบุคคลจากข้อมูลวิเคราะห์หรือไม่
 * @property {Date} [profileLastVerifiedAt] - วันที่ตรวจสอบความถูกต้องของโปรไฟล์นี้ล่าสุด (เช่น ตรวจสอบว่า ref IDs ยังถูกต้อง)
 * @property {number} schemaVersion - เวอร์ชันของ schema (สำหรับการจัดการการเปลี่ยนแปลง schema ในอนาคต)
 * @property {Date} createdAt - วันที่สร้างเอกสาร (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตเอกสารล่าสุด (Mongoose `timestamps`)
 */
export interface IReadingAnalytic extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId | IUser;
  eventStreamDocId?: Types.ObjectId | IReadingAnalytic_EventStream;
  overallUserSummaryDocId?: Types.ObjectId | IReadingAnalytic_Summary;
  lastActivityAt?: Date;
  analyticsConsentSnapshot: IAnalyticsConsentSnapshot;
  processingStatus: IProcessingStatusDetails;
  personalizedRecommendationsEnabled: boolean;
  profileLastVerifiedAt?: Date;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ ReadingAnalytic (ReadingAnalyticSchema)
// ==================================================================================================
const ReadingAnalyticSchema = new Schema<IReadingAnalytic>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุ User ID (User ID is required)"],
      unique: true, // หนึ่งโปรไฟล์ต่อหนึ่งผู้ใช้
      index: true,
    },
    eventStreamDocId: {
      type: Schema.Types.ObjectId,
      ref: "ReadingAnalytic_EventStream", // อ้างอิงไปยัง Model ที่อัปเกรดแล้ว
      index: true,
    },
    overallUserSummaryDocId: {
      type: Schema.Types.ObjectId,
      ref: "ReadingAnalytic_Summary", // อ้างอิงไปยัง Model ที่อัปเกรดแล้ว
      index: true,
    },
    lastActivityAt: { type: Date, index: true },
    analyticsConsentSnapshot: { 
      type: AnalyticsConsentSnapshotSchema,
      required: [true, "กรุณาระบุข้อมูล Snapshot ของความยินยอม (Analytics consent snapshot is required)"],
      default: () => ({ hasConsented: false }) 
    },
    processingStatus: { 
      type: ProcessingStatusDetailsSchema,
      required: [true, "กรุณาระบุสถานะการประมวลผล (Processing status is required)"],
      default: () => ({}) 
    },
    personalizedRecommendationsEnabled: { 
      type: Boolean, 
      default: false 
    },
    profileLastVerifiedAt: { type: Date },
    schemaVersion: { type: Number, default: 1, min: 1 },
  },
  {
    timestamps: true, // createdAt, updatedAt
    collection: "readinganalytics", // ชื่อ collection ที่ชัดเจนสำหรับโปรไฟล์นี้
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

// Index สำหรับการค้นหาตาม userId (unique อยู่แล้ว แต่ใส่เพื่อความชัดเจน)
// ReadingAnalyticSchema.index({ userId: 1 }, { unique: true }); // Mongoose สร้างให้จาก unique: true ด้านบน

// Index สำหรับการค้นหาผู้ใช้ที่มีกิจกรรมล่าสุด
ReadingAnalyticSchema.index({ lastActivityAt: -1 }, { name: "UserLastActivityIndex" });

// Index สำหรับการค้นหาผู้ใช้ที่เปิดใช้งานการแนะนำส่วนบุคคล
ReadingAnalyticSchema.index({ personalizedRecommendationsEnabled: 1 }, { name: "PersonalizedRecommendationsIndex" });

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

ReadingAnalyticSchema.pre<IReadingAnalytic>("save", function (next) {
  if (this.isNew) {
    this.profileLastVerifiedAt = new Date();
  }
  // สามารถเพิ่ม logic อื่นๆ เช่น การอัปเดต schemaVersion อัตโนมัติ
  next();
});

// ==================================================================================================
// SECTION: Static Methods (เมธอดสำหรับ Model ReadingAnalytic)
// ==================================================================================================

/**
 * @static findOrCreateProfile
 * @description ค้นหาหรือสร้างโปรไฟล์การวิเคราะห์สำหรับผู้ใช้
 * @param userId ID ของผู้ใช้
 * @returns {Promise<IReadingAnalytic>} โปรไฟล์การวิเคราะห์ของผู้ใช้
 */
ReadingAnalyticSchema.statics.findOrCreateProfile = async function (
  userId: Types.ObjectId
): Promise<IReadingAnalytic> {
  let profile = await this.findOne({ userId });
  if (!profile) {
    // ดึงข้อมูลความยินยอมเบื้องต้นจาก User model (ถ้าต้องการ)
    // const UserModel = models.User as mongoose.Model<IUser>;
    // const user = await UserModel.findById(userId).select("privacySettings.analyticsConsent").lean();
    // const initialConsent = user?.privacySettings?.analyticsConsent || { hasConsented: false };

    profile = new this({
      userId: userId,
      // analyticsConsentSnapshot: initialConsent, // ตั้งค่าจาก User model
      // personalizedRecommendationsEnabled: user?.preferences?.personalizedRecommendationsEnabled || false,
    });
    await profile.save();
  }
  return profile;
};

/**
 * @static updateLastActivity
 * @description อัปเดตเวลาของกิจกรรมล่าสุดของผู้ใช้
 * @param userId ID ของผู้ใช้
 * @param activityTimestamp Timestamp ของกิจกรรม
 * @returns {Promise<IReadingAnalytic | null>} โปรไฟล์ที่อัปเดตแล้ว
 */
ReadingAnalyticSchema.statics.updateLastActivity = async function (
  userId: Types.ObjectId,
  activityTimestamp: Date
): Promise<IReadingAnalytic | null> {
  return this.findOneAndUpdate(
    { userId },
    { $set: { lastActivityAt: activityTimestamp } },
    { new: true, upsert: false } // ไม่ควร upsert จาก method นี้, profile ควรมีอยู่แล้ว
  );
};

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

// ตรวจสอบว่า Model "ReadingAnalytic" ถูกสร้างไปแล้วหรือยัง ถ้ายัง ให้สร้าง Model ใหม่
// ชื่อ Model ยังคงเป็น "ReadingAnalytic" ตามไฟล์เดิม แต่ schema และบทบาทได้ถูกปรับปรุงใหม่
const ReadingAnalyticModel = 
  (models.ReadingAnalytic as mongoose.Model<IReadingAnalytic>) ||
  model<IReadingAnalytic>("ReadingAnalytic", ReadingAnalyticSchema);

export default ReadingAnalyticModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Role Clarification**: Model นี้ได้รับการปรับปรุงบทบาทให้เป็น "User Reading Analytic Profile"
//     ทำหน้าที่เป็น Hub กลางสำหรับข้อมูลวิเคราะห์ของผู้ใช้, แตกต่างจาก `ReadingAnalytic_EventStreamModel`
//     ที่เก็บ Event โดยละเอียด และ `ReadingAnalytic_SummaryModel` ที่เก็บข้อมูลสรุป.
// 2.  **Data Consistency**: ข้อมูล `analyticsConsentSnapshot` และ `personalizedRecommendationsEnabled`
//     ควรมีการซิงค์กับข้อมูลหลักใน `UserModel` อย่างสม่ำเสมอ หรือใช้เป็น snapshot ที่อัปเดตเมื่อมีการเปลี่ยนแปลงสำคัญ.
// 3.  **Linking Documents**: การใช้ `eventStreamDocId` และ `overallUserSummaryDocId` เป็น ObjectId
//     ช่วยให้สามารถ populate ข้อมูลที่เกี่ยวข้องได้เมื่อต้องการ.
// 4.  **Processing Logic**: Logic ในการอัปเดต `processingStatus` และการเชื่อมโยงเอกสารต่างๆ
//     (เช่น การสร้าง Event Stream หรือ Summary document แล้วนำ ID มาใส่ในโปรไฟล์นี้)
//     จะต้องถูก implement ใน service layer ของแอปพลิเคชัน.
// 5.  **Scalability**: สำหรับแพลตฟอร์มขนาดใหญ่, การ query และ update โปรไฟล์นี้ควรทำได้อย่างรวดเร็ว.
//     Indexes ที่เหมาะสมมีความสำคัญ.
// 6.  **Data Privacy**: การจัดการข้อมูลในโปรไฟล์นี้ต้องสอดคล้องกับนโยบายความเป็นส่วนตัวและ PDPA.
//     ผู้ใช้ควรมีสิทธิ์ในการเข้าถึงและจัดการข้อมูลของตนเอง.
// ==================================================================================================
