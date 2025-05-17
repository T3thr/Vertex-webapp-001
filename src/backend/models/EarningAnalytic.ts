// src/backend/models/EarningAnalytic.ts
// โมเดลสถิติรายได้สรุป (EarningAnalytic Model)
// สรุปรายได้ของนักเขียนและแพลตฟอร์มตามช่วงเวลาต่างๆ เพื่อการวิเคราะห์และแสดงผลบน Dashboard

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IUser } from "./User"; // สำหรับ targetId (นักเขียน)

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล EarningAnalytic
// ==================================================================================================

/**
 * @enum {string} AnalyticTimePeriod
 * @description ช่วงเวลาของข้อมูลสรุป
 * - `DAILY`: รายวัน
 * - `WEEKLY`: รายสัปดาห์
 * - `MONTHLY`: รายเดือน
 * - `QUARTERLY`: รายไตรมาส
 * - `YEARLY`: รายปี
 * - `ALL_TIME`: ตลอดกาล (ยอดรวมทั้งหมด)
 */
export enum AnalyticTimePeriod {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  YEARLY = "yearly",
  ALL_TIME = "all_time",
}

/**
 * @enum {string} AnalyticTargetType
 * @description ประเภทของเป้าหมายที่ข้อมูลสรุปนี้เกี่ยวข้อง
 * - `WRITER`: สรุปสำหรับนักเขียน (ต้องมี targetId)
 * - `PLATFORM`: สรุปสำหรับแพลตฟอร์มโดยรวม
 * - `NOVEL`: สรุปสำหรับนิยายเฉพาะเรื่อง (ต้องมี novelId)
 */
export enum AnalyticTargetType {
  WRITER = "writer",
  PLATFORM = "platform",
  NOVEL = "novel",
}

/**
 * @enum {string} AnalyticCurrency
 * @description สกุลเงินที่ใช้ในการสรุป
 * - `COIN`: เหรียญภายในแพลตฟอร์ม
 * - `THB`: เงินบาทไทย
 * - `USD`: ดอลลาร์สหรัฐ
 */
export enum AnalyticCurrency {
  COIN = "COIN",
  THB = "THB",
  USD = "USD",
}

/**
 * @interface IRevenueBreakdown
 * @description รายละเอียดการแบ่งรายได้ตามประเภท
 * @property {number} fromSales - รายได้จากยอดขาย (นิยาย/ตอน)
 * @property {number} fromDonations - รายได้จากยอดบริจาค
 * @property {number} [fromBonuses] - รายได้จากโบนัส (ถ้ามี)
 * @property {number} [fromOther] - รายได้จากแหล่งอื่นๆ (ถ้ามี)
 * @property {number} total - รายได้รวมทั้งหมด
 */
export interface IRevenueBreakdown {
  fromSales: number;
  fromDonations: number;
  fromBonuses?: number;
  fromOther?: number;
  total: number;
}
const RevenueBreakdownSchema = new Schema<IRevenueBreakdown>(
  {
    fromSales: { type: Number, default: 0, min: 0 },
    fromDonations: { type: Number, default: 0, min: 0 },
    fromBonuses: { type: Number, default: 0, min: 0 },
    fromOther: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

/**
 * @interface IPlatformSpecificMetrics
 * @description ตัวชี้วัดเฉพาะสำหรับแพลตฟอร์ม
 * @property {number} coinSalesRevenue - รายได้จากการขายแพ็กเกจเหรียญ
 * @property {number} cutFromWriterSales - ส่วนแบ่งที่แพลตฟอร์มได้รับจากยอดขายของนักเขียน
 * @property {number} cutFromWriterDonations - ส่วนแบ่งที่แพลตฟอร์มได้รับจากยอดบริจาคของนักเขียน
 * @property {number} totalRevenue - รวมรายได้ของแพลตฟอร์ม
 * @property {number} [operatingExpenses] - ค่าใช้จ่ายในการดำเนินงาน (ถ้ามีการบันทึก)
 * @property {number} [netProfit] - กำไรสุทธิ (ถ้ามีการบันทึก)
 */
export interface IPlatformSpecificMetrics {
  coinSalesRevenue: number;
  cutFromWriterSales: number;
  cutFromWriterDonations: number;
  totalRevenue: number;
  operatingExpenses?: number;
  netProfit?: number;
}
const PlatformSpecificMetricsSchema = new Schema<IPlatformSpecificMetrics>(
  {
    coinSalesRevenue: { type: Number, default: 0, min: 0 },
    cutFromWriterSales: { type: Number, default: 0, min: 0 },
    cutFromWriterDonations: { type: Number, default: 0, min: 0 },
    totalRevenue: { type: Number, default: 0, min: 0 },
    operatingExpenses: { type: Number, min: 0 },
    netProfit: { type: Number },
  },
  { _id: false }
);

/**
 * @interface ITransactionCounts
 * @description จำนวนธุรกรรมแยกตามประเภท
 * @property {number} sales - จำนวนธุรกรรมการขาย
 * @property {number} donations - จำนวนธุรกรรมการบริจาค
 * @property {number} [coinPackagesPurchased] - จำนวนแพ็กเกจเหรียญที่ซื้อ (สำหรับแพลตฟอร์ม)
 * @property {number} [withdrawals] - จำนวนการถอนเงิน (สำหรับนักเขียน)
 * @property {number} total - จำนวนธุรกรรมทั้งหมด
 */
export interface ITransactionCounts {
  sales: number;
  donations: number;
  coinPackagesPurchased?: number;
  withdrawals?: number;
  total: number;
}
const TransactionCountsSchema = new Schema<ITransactionCounts>(
  {
    sales: { type: Number, default: 0, min: 0 },
    donations: { type: Number, default: 0, min: 0 },
    coinPackagesPurchased: { type: Number, default: 0, min: 0 },
    withdrawals: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร EarningAnalytic (IEarningAnalytic Document Interface)
// ==================================================================================================

/**
 * @interface IEarningAnalytic
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารสถิติรายได้สรุปใน Collection "earninganalytics"
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสาร
 * @property {AnalyticTargetType} targetType - ประเภทของเป้าหมาย (writer, platform, novel) (**จำเป็น**)
 * @property {Types.ObjectId | IUser} [targetId] - ID ของนักเขียน (เฉพาะเมื่อ targetType === "writer", อ้างอิง User model)
 * @property {Types.ObjectId} [novelId] - ID ของนิยาย (เฉพาะเมื่อ targetType === "novel", อ้างอิง Novel model)
 * @property {AnalyticTimePeriod} timePeriod - ช่วงเวลาของข้อมูลสรุป (**จำเป็น**)
 * @property {Date} summaryDate - วันที่เริ่มต้นของช่วงเวลาสรุป (เช่น 2024-05-01 สำหรับเดือนพฤษภาคม 2024) (**จำเป็น**)
 * @property {Date} [summaryEndDate] - วันที่สิ้นสุดของช่วงเวลาสรุป (เช่น 2024-05-31 สำหรับเดือนพฤษภาคม 2024)
 * @property {AnalyticCurrency} currency - สกุลเงินที่ใช้ในการสรุป (**จำเป็น**)
 * @property {IRevenueBreakdown} grossRevenue - รายได้รวมก่อนหักค่าธรรมเนียม (**จำเป็น**)
 * @property {number} platformFeeDeducted - ค่าธรรมเนียมที่แพลตฟอร์มหัก (**จำเป็น**)
 * @property {number} netEarnings - รายได้สุทธิหลังหักค่าธรรมเนียม (**จำเป็น**)
 * @property {number} [platformFeePercentage] - เปอร์เซ็นต์ค่าธรรมเนียมที่ใช้ในการคำนวณ
 * @property {IPlatformSpecificMetrics} [platformMetrics] - ตัวชี้วัดเฉพาะสำหรับแพลตฟอร์ม (เฉพาะเมื่อ targetType === "platform")
 * @property {ITransactionCounts} transactionCounts - จำนวนธุรกรรมแยกตามประเภท (**จำเป็น**)
 * @property {number} [conversionRate] - อัตราแลกเปลี่ยนที่ใช้ (ถ้ามีการแปลงสกุลเงิน)
 * @property {boolean} isRecalculated - สถานะว่าข้อมูลสรุปนี้ถูกคำนวณใหม่หรือไม่ (เช่น หลังจากมีการแก้ไขธุรกรรมย้อนหลัง)
 * @property {Date} [lastRecalculatedAt] - วันที่คำนวณใหม่ล่าสุด
 * @property {number} schemaVersion - เวอร์ชันของ schema
 * @property {Date} createdAt - วันที่สร้างเอกสาร (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตเอกสารล่าสุด (Mongoose `timestamps`)
 */
export interface IEarningAnalytic extends Document {
  _id: Types.ObjectId;
  targetType: AnalyticTargetType;
  targetId?: Types.ObjectId | IUser;
  novelId?: Types.ObjectId;
  timePeriod: AnalyticTimePeriod;
  summaryDate: Date;
  summaryEndDate?: Date;
  currency: AnalyticCurrency;
  grossRevenue: IRevenueBreakdown;
  platformFeeDeducted: number;
  netEarnings: number;
  platformFeePercentage?: number;
  platformMetrics?: IPlatformSpecificMetrics;
  transactionCounts: ITransactionCounts;
  conversionRate?: number;
  isRecalculated: boolean;
  lastRecalculatedAt?: Date;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ EarningAnalytic (EarningAnalyticSchema)
// ==================================================================================================
const EarningAnalyticSchema = new Schema<IEarningAnalytic>(
  {
    targetType: {
      type: String,
      enum: Object.values(AnalyticTargetType),
      required: [true, "กรุณาระบุประเภทเป้าหมาย (Target type is required)"],
      index: true,
    },
    targetId: { 
      type: Schema.Types.ObjectId, 
      ref: "User", // เฉพาะเมื่อ targetType === "writer"
      index: true,
      validate: {
        validator: function(this: IEarningAnalytic, v: any) {
          return this.targetType !== AnalyticTargetType.WRITER || v != null;
        },
        message: "targetId ต้องระบุเมื่อ targetType เป็น 'writer'"
      }
    },
    novelId: { 
      type: Schema.Types.ObjectId, 
      ref: "Novel", // เฉพาะเมื่อ targetType === "novel"
      index: true,
      validate: {
        validator: function(this: IEarningAnalytic, v: any) {
          return this.targetType !== AnalyticTargetType.NOVEL || v != null;
        },
        message: "novelId ต้องระบุเมื่อ targetType เป็น 'novel'"
      }
    },
    timePeriod: {
      type: String,
      enum: Object.values(AnalyticTimePeriod),
      required: [true, "กรุณาระบุช่วงเวลา (Time period is required)"],
      index: true,
    },
    summaryDate: {
      type: Date,
      required: [true, "กรุณาระบุวันที่เริ่มต้นสรุป (Summary start date is required)"],
      index: true,
    },
    summaryEndDate: {
      type: Date,
      index: true,
    },
    currency: {
      type: String,
      enum: Object.values(AnalyticCurrency),
      required: [true, "กรุณาระบุสกุลเงิน (Currency is required)"],
      default: AnalyticCurrency.COIN,
      index: true,
    },
    grossRevenue: {
      type: RevenueBreakdownSchema,
      required: [true, "กรุณาระบุรายได้รวม (Gross revenue is required)"],
      default: () => ({
        fromSales: 0,
        fromDonations: 0,
        fromBonuses: 0,
        fromOther: 0,
        total: 0
      })
    },
    platformFeeDeducted: {
      type: Number,
      required: [true, "กรุณาระบุค่าธรรมเนียมที่หัก (Platform fee is required)"],
      default: 0,
      min: [0, "ค่าธรรมเนียมต้องไม่ติดลบ"],
    },
    netEarnings: {
      type: Number,
      required: [true, "กรุณาระบุรายได้สุทธิ (Net earnings is required)"],
      default: 0,
    },
    platformFeePercentage: {
      type: Number,
      min: [0, "เปอร์เซ็นต์ค่าธรรมเนียมต้องไม่ติดลบ"],
      max: [100, "เปอร์เซ็นต์ค่าธรรมเนียมต้องไม่เกิน 100%"],
    },
    platformMetrics: {
      type: PlatformSpecificMetricsSchema,
      validate: {
        validator: function(this: IEarningAnalytic, v: any) {
          return this.targetType !== AnalyticTargetType.PLATFORM || v != null;
        },
        message: "platformMetrics ต้องระบุเมื่อ targetType เป็น 'platform'"
      }
    },
    transactionCounts: {
      type: TransactionCountsSchema,
      required: [true, "กรุณาระบุจำนวนธุรกรรม (Transaction counts is required)"],
      default: () => ({
        sales: 0,
        donations: 0,
        total: 0
      })
    },
    conversionRate: {
      type: Number,
      min: [0, "อัตราแลกเปลี่ยนต้องไม่ติดลบ"],
    },
    isRecalculated: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastRecalculatedAt: {
      type: Date,
    },
    schemaVersion: { type: Number, default: 1, min: 1 },
  },
  {
    timestamps: true, // createdAt, updatedAt
    collection: "earninganalytics",
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

// Unique index เพื่อป้องกันข้อมูลสรุปซ้ำ (targetType + targetId/novelId + timePeriod + summaryDate + currency)
EarningAnalyticSchema.index(
  { 
    targetType: 1, 
    targetId: 1, 
    novelId: 1, 
    timePeriod: 1, 
    summaryDate: 1, 
    currency: 1 
  }, 
  { 
    unique: true, 
    sparse: true, 
    name: "UniqueAnalyticIndex" 
  }
);

// Index สำหรับการ query ข้อมูลสรุปล่าสุดของนักเขียน
EarningAnalyticSchema.index(
  { 
    targetType: 1, 
    targetId: 1, 
    timePeriod: 1, 
    summaryDate: -1 
  }, 
  { 
    name: "WriterAnalyticQueryIndex" 
  }
);

// Index สำหรับการ query ข้อมูลสรุปล่าสุดของแพลตฟอร์ม
EarningAnalyticSchema.index(
  { 
    targetType: 1, 
    timePeriod: 1, 
    summaryDate: -1 
  }, 
  { 
    name: "PlatformAnalyticQueryIndex" 
  }
);

// Index สำหรับการ query ข้อมูลสรุปตามช่วงเวลา
EarningAnalyticSchema.index(
  { 
    summaryDate: 1, 
    summaryEndDate: 1, 
    timePeriod: 1 
  }, 
  { 
    name: "TimeRangeAnalyticIndex" 
  }
);

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

EarningAnalyticSchema.pre<IEarningAnalytic>("save", function (next) {
  // 1. Normalize summaryDate to start of day UTC
  if (this.summaryDate) {
    this.summaryDate.setHours(0, 0, 0, 0);
  }

  // 2. Ensure targetId is null if targetType is not "writer"
  if (this.targetType !== AnalyticTargetType.WRITER) {
    this.targetId = undefined;
  }

  // 3. Ensure novelId is null if targetType is not "novel"
  if (this.targetType !== AnalyticTargetType.NOVEL) {
    this.novelId = undefined;
  }

  // 4. Calculate summaryEndDate if not provided
  if (!this.summaryEndDate && this.summaryDate) {
    const endDate = new Date(this.summaryDate);
    switch (this.timePeriod) {
      case AnalyticTimePeriod.DAILY:
        endDate.setDate(endDate.getDate() + 1);
        break;
      case AnalyticTimePeriod.WEEKLY:
        endDate.setDate(endDate.getDate() + 7);
        break;
      case AnalyticTimePeriod.MONTHLY:
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case AnalyticTimePeriod.QUARTERLY:
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case AnalyticTimePeriod.YEARLY:
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      // ALL_TIME ไม่มี summaryEndDate
    }
    if (this.timePeriod !== AnalyticTimePeriod.ALL_TIME) {
      endDate.setMilliseconds(-1); // Set to 23:59:59.999 of the end date
      this.summaryEndDate = endDate;
    }
  }

  // 5. Calculate derived fields
  // 5.1 Calculate grossRevenue.total
  this.grossRevenue.total = 
    (this.grossRevenue.fromSales || 0) + 
    (this.grossRevenue.fromDonations || 0) + 
    (this.grossRevenue.fromBonuses || 0) + 
    (this.grossRevenue.fromOther || 0);

  // 5.2 Calculate netEarnings
  this.netEarnings = this.grossRevenue.total - (this.platformFeeDeducted || 0);

  // 5.3 Calculate transactionCounts.total
  this.transactionCounts.total = 
    (this.transactionCounts.sales || 0) + 
    (this.transactionCounts.donations || 0) + 
    (this.transactionCounts.coinPackagesPurchased || 0) + 
    (this.transactionCounts.withdrawals || 0);

  // 5.4 Calculate platformMetrics.totalRevenue if targetType is "platform"
  if (this.targetType === AnalyticTargetType.PLATFORM && this.platformMetrics) {
    this.platformMetrics.totalRevenue = 
      (this.platformMetrics.coinSalesRevenue || 0) + 
      (this.platformMetrics.cutFromWriterSales || 0) + 
      (this.platformMetrics.cutFromWriterDonations || 0);
    
    // Calculate netProfit if operatingExpenses is provided
    if (this.platformMetrics.operatingExpenses !== undefined) {
      this.platformMetrics.netProfit = this.platformMetrics.totalRevenue - this.platformMetrics.operatingExpenses;
    }
  }

  next();
});

// ==================================================================================================
// SECTION: Static Methods (เมธอดสำหรับ Model EarningAnalytic)
// ==================================================================================================

/**
 * @static getWriterEarningsSummary
 * @description ดึงข้อมูลสรุปรายได้ของนักเขียนตามช่วงเวลา
 * @param writerId ID ของนักเขียน
 * @param timePeriod ช่วงเวลาที่ต้องการ (daily, weekly, monthly, yearly, all_time)
 * @param limit จำนวนรายการที่ต้องการ (default: 12)
 * @returns {Promise<IEarningAnalytic[]>} รายการข้อมูลสรุปรายได้
 */
EarningAnalyticSchema.statics.getWriterEarningsSummary = async function (
  writerId: Types.ObjectId,
  timePeriod: AnalyticTimePeriod,
  limit: number = 12
): Promise<IEarningAnalytic[]> {
  return this.find({
    targetType: AnalyticTargetType.WRITER,
    targetId: writerId,
    timePeriod: timePeriod,
  })
    .sort({ summaryDate: -1 })
    .limit(limit)
    .lean();
};

/**
 * @static getPlatformEarningsSummary
 * @description ดึงข้อมูลสรุปรายได้ของแพลตฟอร์มตามช่วงเวลา
 * @param timePeriod ช่วงเวลาที่ต้องการ (daily, weekly, monthly, yearly, all_time)
 * @param limit จำนวนรายการที่ต้องการ (default: 12)
 * @returns {Promise<IEarningAnalytic[]>} รายการข้อมูลสรุปรายได้
 */
EarningAnalyticSchema.statics.getPlatformEarningsSummary = async function (
  timePeriod: AnalyticTimePeriod,
  limit: number = 12
): Promise<IEarningAnalytic[]> {
  return this.find({
    targetType: AnalyticTargetType.PLATFORM,
    timePeriod: timePeriod,
  })
    .sort({ summaryDate: -1 })
    .limit(limit)
    .lean();
};

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

// ตรวจสอบว่า Model "EarningAnalytic" ถูกสร้างไปแล้วหรือยัง ถ้ายัง ให้สร้าง Model ใหม่
const EarningAnalyticModel = 
  (models.EarningAnalytic as mongoose.Model<IEarningAnalytic>) ||
  model<IEarningAnalytic>("EarningAnalytic", EarningAnalyticSchema);

export default EarningAnalyticModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Aggregation Pipeline**: ควรมีการสร้าง Aggregation Pipeline สำหรับการคำนวณข้อมูลสรุปจาก EarningTransaction
//     เพื่อให้การสร้างและอัปเดตข้อมูลสรุปทำได้อย่างมีประสิทธิภาพและถูกต้อง.
// 2.  **Scheduled Jobs**: ควรมีการตั้ง Scheduled Jobs เพื่ออัปเดตข้อมูลสรุปเป็นประจำ (เช่น รายวัน, รายสัปดาห์, รายเดือน)
//     โดยใช้ข้อมูลจาก EarningTransaction model.
// 3.  **Caching**: ข้อมูลสรุปที่ถูกเรียกใช้บ่อย (เช่น สรุปรายเดือนล่าสุด) ควรมีการ Cache เพื่อเพิ่มประสิทธิภาพ.
// 4.  **Data Visualization**: ข้อมูลจาก EarningAnalytic เหมาะสำหรับการนำไปแสดงผลในรูปแบบกราฟและแผนภูมิต่างๆ
//     บน Dashboard ของนักเขียนและผู้ดูแลระบบ.
// 5.  **Trend Analysis**: ควรมีการวิเคราะห์แนวโน้มรายได้เพื่อให้นักเขียนและผู้ดูแลระบบเห็นการเติบโตหรือการเปลี่ยนแปลง.
// 6.  **Recalculation**: ในกรณีที่มีการแก้ไขข้อมูลธุรกรรมย้อนหลัง ควรมีกลไกในการคำนวณข้อมูลสรุปใหม่
//     โดยใช้ `isRecalculated` และ `lastRecalculatedAt` เพื่อติดตามการเปลี่ยนแปลง.
// 7.  **Currency Conversion**: การแปลงสกุลเงินระหว่าง COIN กับเงินจริง (THB, USD) ควรมีการบันทึก `conversionRate`
//     ที่ใช้ในขณะนั้น เพื่อความโปร่งใสและการตรวจสอบย้อนหลัง.
// 8.  **Benchmarking**: อาจเพิ่มข้อมูลเปรียบเทียบกับค่าเฉลี่ยของแพลตฟอร์มหรือนักเขียนในหมวดหมู่เดียวกัน
//     เพื่อให้นักเขียนเห็นสถานะของตนเองเทียบกับตลาด.
// ==================================================================================================
