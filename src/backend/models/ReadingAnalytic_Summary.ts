// src/backend/models/ReadingAnalytic_Summary.ts
// โมเดลสรุปข้อมูลการอ่าน (ReadingAnalytic_Summary Model)
// เก็บข้อมูลสรุปการอ่านรายวัน/รายสัปดาห์/รายเดือน/รายปี สำหรับนิยาย, ผู้ใช้, หรือนักเขียน เพื่อการวิเคราะห์และแสดงผลสถิติ

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { INovel } from "./Novel"; // สำหรับ targetId เมื่อ summaryForType คือ NOVEL
import { IUser } from "./User"; // สำหรับ targetId เมื่อ summaryForType คือ USER หรือ AUTHOR
import { ICategory } from "./Category"; // สำหรับ favoriteGenresRead

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล ReadingAnalytic_Summary
// ==================================================================================================

/**
 * @enum {string} SummaryTimePeriod
 * @description ช่วงเวลาของข้อมูลสรุป
 * - `DAILY`: รายวัน
 * - `WEEKLY`: รายสัปดาห์
 * - `MONTHLY`: รายเดือน
 * - `YEARLY`: รายปี
 * - `ALL_TIME`: สรุปทั้งหมด (อาจไม่จำเป็นถ้ามี Yearly และสามารถรวมข้อมูลได้ หรือใช้เป็นตัวบ่งชี้พิเศษ)
 */
export enum SummaryTimePeriod {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  YEARLY = "yearly",
  ALL_TIME = "all_time",
}

/**
 * @enum {string} SummaryForType
 * @description ระบุว่าข้อมูลสรุปนี้สำหรับอะไร
 * - `NOVEL`: สรุปสำหรับนิยายเรื่องนั้นๆ (targetId คือ Novel ID)
 * - `USER`: สรุปสำหรับผู้ใช้คนนั้นๆ (พฤติกรรมการอ่านของผู้ใช้, targetId คือ User ID)
 * - `AUTHOR`: สรุปสำหรับนักเขียน (ภาพรวมนิยายทั้งหมดของนักเขียน, targetId คือ User ID ของนักเขียน)
 * - `PLATFORM`: (อนาคต) สรุปสำหรับทั้งแพลตฟอร์ม (targetId อาจเป็นค่าพิเศษ หรือ collection แยก)
 */
export enum SummaryForType {
  NOVEL = "novel",
  USER = "user",
  AUTHOR = "author",
  PLATFORM = "platform",
}

/**
 * @interface IDemographicBreakdown
 * @description ข้อมูลสรุปตามกลุ่มประชากร (ตัวอย่าง) สำหรับผู้อ่านของนิยายหรือนักเขียน
 * @property {string} [ageRange] - ช่วงอายุ (เช่น "18-24", "25-34", "unknown")
 * @property {string} [gender] - เพศ (เช่น "male", "female", "non_binary", "other", "unknown")
 * @property {string} [countryCode] - รหัสประเทศ ISO 3166-1 alpha-2 (เช่น "TH", "US")
 * @property {number} count - จำนวนผู้อ่านในกลุ่มประชากรนี้
 * @property {number} [totalReadingTimeInSeconds] - เวลารวมที่อ่านโดยผู้อ่านในกลุ่มนี้ (วินาที)
 */
export interface IDemographicBreakdown {
  ageRange?: string;
  gender?: string;
  countryCode?: string;
  count: number;
  totalReadingTimeInSeconds?: number;
  // สามารถเพิ่มมิติอื่นๆ ได้ตามต้องการ เช่น ระดับการศึกษา, ภาษาที่ใช้
}
const DemographicBreakdownSchema = new Schema<IDemographicBreakdown>(
  {
    ageRange: { type: String, trim: true },
    gender: { type: String, trim: true },
    countryCode: { type: String, trim: true, uppercase: true, minlength: 2, maxlength: 2 },
    count: { type: Number, required: true, default: 0, min: 0 },
    totalReadingTimeInSeconds: { type: Number, default: 0, min: 0 },
  },
  { _id: false } // ไม่สร้าง _id สำหรับ subdocument นี้
);

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร ReadingAnalytic_Summary (IReadingAnalytic_Summary Document Interface)
// ==================================================================================================

/**
 * @interface IReadingAnalytic_Summary
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารสรุปข้อมูลการอ่านใน Collection "readinganalyticsummaries"
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสารสรุป
 * @property {SummaryForType} summaryForType - ประเภทของข้อมูลสรุป (NOVEL, USER, AUTHOR, PLATFORM) (**จำเป็น**)
 * @property {Types.ObjectId | INovel | IUser} targetId - ID ของเป้าหมายที่สรุปข้อมูล (NovelId, UserId, AuthorId) (**จำเป็น**, อ้างอิงตาม `summaryForTypeRef`)
 * @property {string} summaryForTypeRef - ชื่อ Model ที่ `targetId` อ้างอิงถึง (สำหรับ `refPath` ของ Mongoose) (**จำเป็น**, กำหนดค่าใน pre-validate hook)
 * @property {SummaryTimePeriod} timePeriod - ช่วงเวลาของข้อมูลสรุป (DAILY, WEEKLY, MONTHLY, YEARLY, ALL_TIME) (**จำเป็น**)
 * @property {Date} summaryStartDate - วันที่เริ่มต้น (เวลา 00:00:00 UTC) ของช่วงเวลาที่สรุปข้อมูล (**จำเป็น**)
 * @property {Date} [summaryEndDate] - วันที่สิ้นสุด (เวลา 23:59:59.999 UTC) ของช่วงเวลาที่สรุปข้อมูล (สำหรับ DAILY, WEEKLY, MONTHLY, YEARLY)
 *
 * @property {number} totalReads - จำนวนครั้งที่ถูกอ่านทั้งหมด (เช่น การเปิดอ่านตอน, การเข้าชมหน้า)
 * @property {number} uniqueReaders - จำนวนผู้อ่านที่ไม่ซ้ำกัน (เฉพาะ summaryForType = NOVEL หรือ AUTHOR)
 * @property {number} totalReadingTimeInSeconds - เวลารวมที่ใช้ในการอ่านเนื้อหา (หน่วยเป็นวินาที)
 * @property {number} [averageReadingTimePerReaderInSeconds] - เวลาอ่านเฉลี่ยต่อผู้อ่านหนึ่งคน (totalReadingTimeInSeconds / uniqueReaders)
 * @property {number} [averageReadingTimePerSessionInSeconds] - เวลาอ่านเฉลี่ยต่อ session การอ่าน
 * @property {number} totalCompletedReads - จำนวนครั้งที่อ่านจนจบ (จบตอน หรือ จบนิยาย - ขึ้นกับการนิยาม "จบ")
 * @property {number} [completionRate] - อัตราการอ่านจบ (เช่น totalCompletedReads / totalReads หรือ uniqueReaders ที่อ่านจบ / uniqueReaders)
 * @property {number} [dropOffRate] - อัตราการเลิกอ่านกลางคัน (คำนวณจากจุดที่ผู้ใช้ออกไปบ่อยที่สุด)
 *
 * @property {number} [newFollowersGained] - (สำหรับ NOVEL/AUTHOR) จำนวนผู้ติดตามใหม่ที่ได้รับในช่วงเวลานี้
 * @property {number} [totalLikesReceived] - (สำหรับ NOVEL/AUTHOR) จำนวนไลค์ที่เนื้อหาได้รับใหม่ในช่วงเวลานี้
 * @property {number} [totalCommentsReceived] - (สำหรับ NOVEL/AUTHOR) จำนวนคอมเมนต์ที่เนื้อหาได้รับใหม่ในช่วงเวลานี้
 * @property {number} [averageRatingScore] - (สำหรับ NOVEL) คะแนนเฉลี่ยที่ได้รับจากผู้ใช้ (ถ้ามีการให้คะแนนในช่วงเวลานั้น)
 * @property {number} [totalRatingsReceived] - (สำหรับ NOVEL) จำนวนการให้คะแนนที่ได้รับใหม่
 *
 * @property {number} [novelsReadCount] - (สำหรับ USER) จำนวนนิยายที่ผู้ใช้อ่านในช่วงเวลานี้
 * @property {number} [episodesReadCount] - (สำหรับ USER) จำนวนตอนที่ผู้ใช้อ่านในช่วงเวลานี้
 * @property {Types.DocumentArray<{ category: Types.ObjectId | ICategory, count: number, totalTimeSpentInSeconds: number }>} [favoriteCategoriesRead] - (สำหรับ USER) ประเภท/หมวดหมู่นิยายที่ผู้ใช้อ่านบ่อยที่สุดในช่วงเวลานี้
 *
 * @property {Types.DocumentArray<IDemographicBreakdown>} [readerDemographics] - (สำหรับ NOVEL/AUTHOR) ข้อมูลสรุปผู้อ่านตามกลุ่มประชากร
 * @property {Map<string, number>} [trafficSources] - (สำหรับ NOVEL/AUTHOR) แหล่งที่มาของผู้อ่าน (เช่น 'direct', 'referral_divwy', 'search_google', 'social_facebook')
 * @property {Map<string, number>} [deviceTypes] - (สำหรับ NOVEL/AUTHOR/USER) ประเภทอุปกรณ์ที่ใช้อ่าน (เช่น 'desktop', 'mobile', 'tablet')
 *
 * @property {Record<string, any>} [customMetrics] - (Optional) Metrics เพิ่มเติมที่กำหนดเองตามความต้องการของแพลตฟอร์ม
 * @property {Date} lastCalculatedAt - วันที่คำนวณข้อมูลสรุปนี้ล่าสุด (**จำเป็น**)
 * @property {Date} createdAt - วันที่สร้างเอกสารสรุป (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตเอกสารสรุปล่าสุด (Mongoose `timestamps`)
 */
export interface IReadingAnalytic_Summary extends Document {
  _id: Types.ObjectId;
  summaryForType: SummaryForType;
  targetId: Types.ObjectId | INovel | IUser; // Type นี้จะถูกตีความร่วมกับ summaryForTypeRef โดย Mongoose populate
  summaryForTypeRef: string; // <--- เพิ่ม field นี้ใน interface
  timePeriod: SummaryTimePeriod;
  summaryStartDate: Date;
  summaryEndDate?: Date;

  totalReads: number;
  uniqueReaders: number; // อาจเป็น 0 ถ้า summaryForType = USER
  totalReadingTimeInSeconds: number;
  averageReadingTimePerReaderInSeconds?: number;
  averageReadingTimePerSessionInSeconds?: number;
  totalCompletedReads: number;
  completionRate?: number; // 0.0 ถึง 1.0
  dropOffRate?: number;   // 0.0 ถึง 1.0

  // Metrics สำหรับ Novel/Author
  newFollowersGained?: number;
  totalLikesReceived?: number;
  totalCommentsReceived?: number;
  averageRatingScore?: number; // 0.0 ถึง 5.0 (หรือตาม scale)
  totalRatingsReceived?: number;

  // Metrics สำหรับ User
  novelsReadCount?: number;
  episodesReadCount?: number;
  favoriteCategoriesRead?: Types.DocumentArray<{
    category: Types.ObjectId | ICategory; // Ref to Category
    count: number; // จำนวนครั้งที่อ่านนิยายใน category นี้
    totalTimeSpentInSeconds: number; // เวลารวมที่ใช้อ่านนิยายใน category นี้
  }>;

  // Metrics ที่ใช้ได้หลายประเภท
  readerDemographics?: Types.DocumentArray<IDemographicBreakdown>; // สำหรับ NOVEL, AUTHOR
  trafficSources?: Map<string, number>; // สำหรับ NOVEL, AUTHOR (key: source_name, value: count)
  deviceTypes?: Map<string, number>; // สำหรับ NOVEL, AUTHOR, USER (key: device_type, value: count)

  customMetrics?: Record<string, any>; // สำหรับ metrics ที่ยืดหยุ่น
  lastCalculatedAt: Date; // วันที่ข้อมูลนี้ถูก aggregate ล่าสุด
  createdAt: Date;
  updatedAt: Date;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ ReadingAnalytic_Summary (ReadingAnalytic_SummarySchema)
// ==================================================================================================
const ReadingAnalytic_SummarySchema = new Schema<IReadingAnalytic_Summary>(
  {
    summaryForType: {
      type: String,
      enum: Object.values(SummaryForType),
      required: [true, "กรุณาระบุประเภทของข้อมูลสรุป (Summary type is required)"],
      index: true,
    },
    targetId: { // ID ของ Novel, User (ที่เป็นผู้อ่าน หรือ ผู้เขียน)
      type: Schema.Types.ObjectId,
      refPath: "summaryForTypeRef", // Dynamic reference ไปยัง Model ที่ระบุใน summaryForTypeRef
      required: [true, "กรุณาระบุ ID ของเป้าหมาย (Target ID is required)"],
      index: true,
    },
    // Field นี้จะถูกกำหนดค่าโดย pre-validate hook และใช้โดย refPath
    // ไม่จำเป็นต้อง unique เพราะ targetId + summaryForType + timePeriod + summaryStartDate จะ unique
    summaryForTypeRef: {
        type: String,
        required: [true, "จำเป็นต้องมีชื่อ Model สำหรับ refPath (summaryForTypeRef is required)"],
        validate: { // Validator นี้จะทำงานหลังจาก pre-validate hook กำหนดค่าให้แล้ว
            validator: function(this: IReadingAnalytic_Summary, value: string): boolean {
                // `this.summaryForType` ควรมีค่าแล้วเมื่อ validator นี้ทำงาน
                const type = this.summaryForType;
                if (type === SummaryForType.NOVEL) return value === "Novel";
                if (type === SummaryForType.USER) return value === "User";
                if (type === SummaryForType.AUTHOR) return value === "User"; // ผู้เขียนคือ User
                if (type === SummaryForType.PLATFORM) return value === "PlatformAnalyticsTarget"; // ชื่อ Model สมมติสำหรับ Platform
                // console.error(`[Validator] summaryForTypeRef validation failed. Type: ${type}, Value: ${value}`);
                return false; // ถ้า summaryForType ไม่ตรงกับเงื่อนไขใดๆ เลย (ไม่ควรเกิดขึ้นถ้า enum ถูกต้อง)
            },
            message: (props: any) => `ค่าของ summaryForTypeRef ('${props.value}') ไม่สอดคล้องกับ summaryForType ที่กำหนด!`
        }
    },
    timePeriod: {
      type: String,
      enum: Object.values(SummaryTimePeriod),
      required: [true, "กรุณาระบุช่วงเวลาของข้อมูลสรุป (Time period is required)"],
      index: true,
    },
    summaryStartDate: { // ควรเป็นเวลาเที่ยงคืน UTC ของวันเริ่มต้น
      type: Date,
      required: [true, "กรุณาระบุวันที่เริ่มต้นของข้อมูลสรุป (Summary start date is required)"],
      index: true,
    },
    summaryEndDate: { type: Date, index: true }, // ควรเป็นเวลา 23:59:59.999 UTC ของวันสิ้นสุด (ถ้ามี)

    // General Reading Metrics
    totalReads: { type: Number, default: 0, min: 0 },
    uniqueReaders: { type: Number, default: 0, min: 0 },
    totalReadingTimeInSeconds: { type: Number, default: 0, min: 0 },
    averageReadingTimePerReaderInSeconds: { type: Number, default: 0, min: 0 },
    averageReadingTimePerSessionInSeconds: { type: Number, default: 0, min: 0 },
    totalCompletedReads: { type: Number, default: 0, min: 0 },
    completionRate: { type: Number, default: 0, min: 0, max: 1 },
    dropOffRate: { type: Number, default: 0, min: 0, max: 1 },

    // Novel/Author Specific Metrics
    newFollowersGained: { type: Number, default: 0, min: 0 },
    totalLikesReceived: { type: Number, default: 0, min: 0 },
    totalCommentsReceived: { type: Number, default: 0, min: 0 },
    averageRatingScore: { type: Number, default: 0, min: 0, max: 5 }, // หรือตาม rating scale
    totalRatingsReceived: { type: Number, default: 0, min: 0 },

    // User Specific Metrics
    novelsReadCount: { type: Number, default: 0, min: 0 },
    episodesReadCount: { type: Number, default: 0, min: 0 },
    favoriteCategoriesRead: [
      new Schema({
        category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
        count: { type: Number, default: 0, min: 0 }, // จำนวนนิยายใน category นี้ที่อ่าน
        totalTimeSpentInSeconds: { type: Number, default: 0, min: 0 }, // เวลารวมที่ใช้อ่านใน category นี้
      }, { _id: false })
    ],

    // Demographic and Source Metrics (Novel/Author)
    readerDemographics: [DemographicBreakdownSchema],
    trafficSources: { type: Map, of: Number, default: () => new Map() }, // key: source_name, value: count
    deviceTypes: { type: Map, of: Number, default: () => new Map() },   // key: device_type, value: count

    customMetrics: { type: Schema.Types.Mixed }, // สำหรับ metrics ที่ยืดหยุ่น
    lastCalculatedAt: {
      type: Date,
      required: [true, "กรุณาระบุวันที่คำนวณข้อมูลสรุปล่าสุด (Last calculation date is required)"],
      default: Date.now
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    collection: "readinganalyticsummaries", // กำหนดชื่อ collection
  }
);

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

// Middleware: ก่อน validate (เพื่อให้ summaryForTypeRef ถูกตั้งค่าก่อนการ validate field นั้นเอง)
ReadingAnalytic_SummarySchema.pre<IReadingAnalytic_Summary>("validate", function (next: any) {
  // Set summaryForTypeRef based on summaryForType
  // This ensures it's set before validation runs for summaryForTypeRef itself
  if (this.summaryForType) { // ตรวจสอบว่า summaryForType มีค่า
    switch (this.summaryForType) {
      case SummaryForType.NOVEL:
        this.summaryForTypeRef = "Novel";
        break;
      case SummaryForType.USER:
      case SummaryForType.AUTHOR: // Author is also a User
        this.summaryForTypeRef = "User";
        break;
      case SummaryForType.PLATFORM:
        // สำหรับ PLATFORM, targetId อาจจะไม่ใช่ ObjectId ที่ ref ไปยัง model อื่น
        // หรืออาจจะ ref ไปยัง model พิเศษ เช่น "PlatformOverallStats"
        // ในที่นี้สมมติว่ามี Model ชื่อ "PlatformAnalyticsTarget" หรือใช้ Placeholder
        // หาก targetId ของ PLATFORM ไม่ได้ใช้ refPath, summaryForTypeRef อาจจะไม่จำเป็นหรือมีค่าเฉพาะ
        this.summaryForTypeRef = "PlatformAnalyticsTarget"; // หรือค่าอื่นที่เหมาะสมสำหรับ PLATFORM
        break;
      default:
        // ถ้า summaryForType มีค่าที่ไม่รู้จัก (ไม่ควรเกิดขึ้นถ้า enum ถูกต้อง)
        // อาจจะปล่อยให้ validator ของ summaryForTypeRef จับ error หรือ throw error ที่นี่
        // console.error(`[Pre-Validate] Unknown summaryForType: ${this.summaryForType}`);
        // การไม่ set summaryForTypeRef จะทำให้ validator ของมัน (ถ้า required: true) แจ้ง error
        break;
    }
  }
  next();
});


ReadingAnalytic_SummarySchema.pre<IReadingAnalytic_Summary>("save", function (next: any) {
  // Normalize summaryStartDate to the beginning of the day (UTC)
  if (this.isModified("summaryStartDate") || this.isNew) {
    if (this.summaryStartDate instanceof Date) { // ตรวจสอบว่าเป็น Date object จริง
      this.summaryStartDate = new Date(Date.UTC(
        this.summaryStartDate.getUTCFullYear(),
        this.summaryStartDate.getUTCMonth(),
        this.summaryStartDate.getUTCDate(),
        0, 0, 0, 0
      ));
    }
  }

  // Normalize summaryEndDate to the end of the day (UTC) if it exists
  if (this.isModified("summaryEndDate") || this.isNew) {
    if (this.summaryEndDate instanceof Date) { // ตรวจสอบว่าเป็น Date object จริง
       this.summaryEndDate = new Date(Date.UTC(
        this.summaryEndDate.getUTCFullYear(),
        this.summaryEndDate.getUTCMonth(),
        this.summaryEndDate.getUTCDate(),
        23, 59, 59, 999
      ));
    }
  }

  // คำนวณ derived metrics บางอย่าง (ถ้าต้องการให้ทำทุกครั้งที่ save และข้อมูลพื้นฐานมีการเปลี่ยนแปลง)
  if (this.uniqueReaders > 0 && this.totalReadingTimeInSeconds > 0) {
    this.averageReadingTimePerReaderInSeconds = parseFloat((this.totalReadingTimeInSeconds / this.uniqueReaders).toFixed(2));
  } else {
    this.averageReadingTimePerReaderInSeconds = 0;
  }

  if (this.totalReads > 0 && this.totalCompletedReads > 0) {
    this.completionRate = parseFloat((this.totalCompletedReads / this.totalReads).toFixed(4));
  } else if (this.totalReads > 0 && this.totalCompletedReads === 0) {
      this.completionRate = 0;
  } else {
      this.completionRate = undefined; // หรือ 0 ตามความเหมาะสม
  }


  // Update lastCalculatedAt on every save (แม้ว่า aggregation หลักจะทำโดย job แยก)
  // การ save document นี้เองก็ถือเป็นการ "คำนวณ" หรือ "อัปเดต" ข้อมูลสรุปในระดับ document
  this.lastCalculatedAt = new Date();

  next();
});

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

// Unique index: ป้องกันข้อมูลสรุปซ้ำสำหรับ target, type, period, และ startDate เดียวกัน
// นี่คือ index ที่สำคัญมากเพื่อให้แน่ใจว่าไม่มีข้อมูลสรุปที่ซ้ำซ้อนกัน
ReadingAnalytic_SummarySchema.index(
  { targetId: 1, summaryForType: 1, timePeriod: 1, summaryStartDate: 1 },
  { unique: true, name: "UniqueSummaryCompoundIndex" } // เปลี่ยนชื่อ Index ให้สื่อความหมายมากขึ้น
);

// Index สำหรับ query ข้อมูลสรุปล่าสุดตามประเภทและช่วงเวลา
ReadingAnalytic_SummarySchema.index(
  { summaryForType: 1, timePeriod: 1, summaryStartDate: -1 }, // เรียงจากวันที่ล่าสุดไปเก่าสุด
  { name: "LatestSummaryByTypePeriodDateIndex" }
);

// Index สำหรับ query ข้อมูลสรุปของ targetId ที่เฉพาะเจาะจง (เช่น สถิติทั้งหมดของนิยายเรื่องหนึ่ง)
ReadingAnalytic_SummarySchema.index(
  { targetId: 1, timePeriod: 1, summaryStartDate: -1 }, // เพิ่ม timePeriod เพื่อช่วยในการ query
  { name: "SummaryByTargetTimePeriodDateIndex" }
);

// ==================================================================================================
// SECTION: Static Methods (เมธอดสำหรับ Model ReadingAnalytic_Summary)
// ==================================================================================================

/**
 * @static findOrCreateSummary
 * @description ค้นหาหรือสร้างเอกสารสรุปสำหรับ target, type, period, และ date ที่กำหนด
 * โดยจะ normalize summaryStartDate ให้เป็นเวลาเที่ยงคืน UTC ก่อน query หรือสร้าง
 * @param {object} params - Parameters สำหรับการค้นหาหรือสร้าง
 * @param {Types.ObjectId} params.targetId - ID ของเป้าหมาย
 * @param {SummaryForType} params.summaryForType - ประเภทของข้อมูลสรุป
 * @param {SummaryTimePeriod} params.timePeriod - ช่วงเวลาของข้อมูลสรุป
 * @param {Date} params.summaryStartDateInput - วันที่เริ่มต้นของข้อมูลสรุป (จะถูก normalize)
 * @param {Date} [params.summaryEndDateInput] - (Optional) วันที่สิ้นสุดของข้อมูลสรุป (จะถูก normalize)
 * @returns {Promise<IReadingAnalytic_Summary>} เอกสารสรุป (ที่สร้างใหม่หรือที่มีอยู่)
 */
ReadingAnalytic_SummarySchema.statics.findOrCreateSummary = async function(
  this: mongoose.Model<IReadingAnalytic_Summary>, // ระบุ type ของ 'this'
  params: {
    targetId: Types.ObjectId;
    summaryForType: SummaryForType;
    timePeriod: SummaryTimePeriod;
    summaryStartDateInput: Date; // รับ Date object เข้ามา
    summaryEndDateInput?: Date;   // รับ Date object (optional)
  }
): Promise<IReadingAnalytic_Summary> {
  // Normalize summaryStartDate to UTC start of day
  const normalizedStartDate = new Date(Date.UTC(
    params.summaryStartDateInput.getUTCFullYear(),
    params.summaryStartDateInput.getUTCMonth(),
    params.summaryStartDateInput.getUTCDate(),
    0, 0, 0, 0
  ));

  let normalizedEndDate: Date | undefined = undefined;
  if (params.summaryEndDateInput instanceof Date) {
    normalizedEndDate = new Date(Date.UTC(
        params.summaryEndDateInput.getUTCFullYear(),
        params.summaryEndDateInput.getUTCMonth(),
        params.summaryEndDateInput.getUTCDate(),
        23, 59, 59, 999
      ));
  }


  const query = {
    targetId: params.targetId,
    summaryForType: params.summaryForType,
    timePeriod: params.timePeriod,
    summaryStartDate: normalizedStartDate,
  };

  let summaryDoc = await this.findOne(query);

  if (!summaryDoc) {
    // สร้าง summaryForTypeRef ก่อนสร้าง document ใหม่
    let refValue = "";
    switch (params.summaryForType) {
        case SummaryForType.NOVEL: refValue = "Novel"; break;
        case SummaryForType.USER:
        case SummaryForType.AUTHOR: refValue = "User"; break;
        case SummaryForType.PLATFORM: refValue = "PlatformAnalyticsTarget"; break; // หรือค่าที่เหมาะสม
    }

    summaryDoc = new this({
      targetId: params.targetId,
      summaryForType: params.summaryForType,
      summaryForTypeRef: refValue, // กำหนดค่าที่นี่
      timePeriod: params.timePeriod,
      summaryStartDate: normalizedStartDate,
      summaryEndDate: normalizedEndDate,
      // Initialize metrics to 0 or default values
      totalReads: 0,
      uniqueReaders: 0,
      totalReadingTimeInSeconds: 0,
      averageReadingTimePerReaderInSeconds: 0,
      averageReadingTimePerSessionInSeconds: 0,
      totalCompletedReads: 0,
      completionRate: 0,
      dropOffRate: 0,
      newFollowersGained: 0,
      totalLikesReceived: 0,
      totalCommentsReceived: 0,
      averageRatingScore: 0,
      totalRatingsReceived: 0,
      novelsReadCount: 0,
      episodesReadCount: 0,
      favoriteCategoriesRead: [],
      readerDemographics: [],
      trafficSources: new Map(),
      deviceTypes: new Map(),
      lastCalculatedAt: new Date(), // ตั้งค่าเริ่มต้น
    });
    // pre-save hook จะทำงานเมื่อ .save() ถูกเรียก (ถ้ามีการเรียก)
    // หรือถ้า findOrCreate แล้ว save ทันที, pre-validate และ pre-save จะทำงาน
  }
  return summaryDoc;
};

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

// ตรวจสอบว่า Model "ReadingAnalytic_Summary" ถูกสร้างไปแล้วหรือยัง ถ้ายัง ให้สร้าง Model ใหม่
// (วิธีนี้ช่วยป้องกัน error "OverwriteModelError" ใน Next.js hot-reloading)
const ReadingAnalytic_SummaryModel =
  (models.ReadingAnalytic_Summary as mongoose.Model<IReadingAnalytic_Summary>) ||
  model<IReadingAnalytic_Summary>("ReadingAnalytic_Summary", ReadingAnalytic_SummarySchema, "readinganalyticsummaries"); // ระบุชื่อ collection

export default ReadingAnalytic_SummaryModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Data Aggregation Process**:
//     - Model นี้เป็นเพียง "โครงสร้าง" สำหรับเก็บข้อมูลสรุป. Logic หลักในการ "คำนวณ" (aggregate) ข้อมูลจากแหล่งข้อมูลดิบ
//       (เช่น ReadingAnalytic_EventStream, Likes, Comments, Ratings) จะต้องถูก implement แยกต่างหาก.
//     - กระบวนการนี้ควรทำเป็น background job, scheduled task (เช่น ทุกๆ ชั่วโมง, ทุกๆ วัน), หรือ serverless function
//       เพื่อไม่ให้กระทบ performance ของ application หลัก.
// 2.  **RefPath for `targetId`**:
//     - การใช้ `refPath: "summaryForTypeRef"` ร่วมกับ field `summaryForTypeRef` (ที่ถูกกำหนดค่าใน `pre('validate')` hook)
//       ช่วยให้ Mongoose สามารถ populate `targetId` ไปยัง Model ที่ถูกต้อง (Novel, User) ได้โดยอัตโนมัติเมื่อ query.
// 3.  **Time Zone Handling**:
//     - `summaryStartDate` และ `summaryEndDate` ควรถูก normalize และจัดเก็บใน UTC เสมอเพื่อความสอดคล้อง.
//       (pre-save hook ช่วยจัดการส่วนนี้).
//     - การแสดงผลใน local time zone ของผู้ใช้ควรทำที่ client-side หรือ application layer.
// 4.  **Scalability and Performance**:
//     - สำหรับแพลตฟอร์มขนาดใหญ่, การ aggregate ข้อมูลและการ query summary model ควรทำได้อย่างมีประสิทธิภาพ.
//       การออกแบบ Index ที่เหมาะสม (เช่น Unique Compound Index) เป็นสิ่งสำคัญ.
//     - พิจารณาการแบ่ง partition ข้อมูล (sharding) ถ้าข้อมูลมีขนาดใหญ่มาก.
// 5.  **Metrics Accuracy and Consistency**:
//     - ตรวจสอบให้แน่ใจว่า logic การคำนวณ metrics ต่างๆ (เช่น completionRate, average times) ถูกต้องและสอดคล้องกัน.
//     - การคำนวณบางอย่าง เช่น `uniqueReaders` สำหรับช่วงเวลาที่ยาวนาน อาจต้องใช้เทคนิคพิเศษ (เช่น HyperLogLog) ถ้าข้อมูลดิบมีขนาดใหญ่มาก.
// 6.  **"ALL_TIME" Summaries**:
//     - การสรุปแบบ "ALL_TIME" อาจจะคำนวณได้ยากและ resource-intensive ถ้าทำจาก raw data ทุกครั้ง.
//     - อาจจะอัปเดต ALL_TIME summary เป็นระยะๆ จาก Yearly summaries หรือมีกลไกพิเศษ.
// 7.  **Backfilling Data**: หากมีการเปลี่ยนแปลง logic การคำนวณ metrics หรือเพิ่ม metrics ใหม่,
//     ต้องมีแผนในการ "backfill" หรือคำนวณข้อมูลสรุปย้อนหลังสำหรับข้อมูลเก่า.
// 8.  **Data Visualization**: Model นี้เป็นพื้นฐานสำหรับการสร้าง Dashboard และ Report เพื่อแสดงสถิติการอ่าน.
//     การออกแบบ API ที่เหมาะสมเพื่อดึงข้อมูลไปแสดงผลจึงสำคัญ.
// ==================================================================================================