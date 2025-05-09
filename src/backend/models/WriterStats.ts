// src/backend/models/WriterStats.ts
// WriterStats Model - สถิติสำหรับนักเขียนโดยเฉพาะ
// โมเดลสถิตินักเขียน - จัดเก็บข้อมูลสถิติและประสิทธิภาพสำหรับผู้ใช้ที่เป็นนักเขียน
import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface สำหรับข้อมูลสถิติรายวัน/รายเดือน/รายปี (สำหรับกราฟ)
// อินเทอร์เฟซสำหรับข้อมูลสถิติรายวัน/รายเดือน/รายปี
export interface ITimeSeriesDataPoint {
  date: Date; // วันที่ของข้อมูล - วันที่ของข้อมูล
  value: number; // ค่าสถิติ (เช่น ยอดขาย, จำนวนการอ่าน) - ค่าสถิติ
  coinValue?: number; // ค่าสถิติในหน่วยเหรียญ (ถ้ามี) - ค่าสถิติในหน่วยเหรียญ
}

// Interface สำหรับสถิติของนิยายแต่ละเรื่อง
// อินเทอร์เฟซสำหรับสถิติของนิยายแต่ละเรื่อง
export interface INovelPerformanceStats {
  novelId: Types.ObjectId; // ID ของนิยาย (อ้างอิง Novel model) - ID ของนิยาย
  totalViews: number; // จำนวนการดูทั้งหมด - จำนวนการดูทั้งหมด
  totalReads: number; // จำนวนการอ่านทั้งหมด (เช่น อ่านจบตอน) - จำนวนการอ่านทั้งหมด
  totalLikes: number; // จำนวนการถูกใจทั้งหมด - จำนวนการถูกใจทั้งหมด
  totalComments: number; // จำนวนความคิดเห็นทั้งหมด - จำนวนความคิดเห็นทั้งหมด
  totalShares?: number; // จำนวนการแชร์ทั้งหมด (ถ้ามี) - จำนวนการแชร์ทั้งหมด
  averageRating?: number; // คะแนนเฉลี่ย - คะแนนเฉลี่ย
  totalCoinRevenue: number; // รายได้รวมจากเหรียญ (จากการขายตอน, การบริจาคให้นิยาย) - รายได้รวมจากเหรียญ
  totalRealMoneyRevenue?: number; // รายได้รวมจากเงินจริง (ถ้ามีการขายตรง) - รายได้รวมจากเงินจริง
  currencyRealMoney?: string; // สกุลเงินจริง - สกุลเงินจริง
  conversionRate?: number; // อัตราการแปลง (เช่น ผู้ดูเป็นผู้อ่าน, ผู้อ่านเป็นผู้ซื้อ) - อัตราการแปลง
  // Historical data for graphs - ข้อมูลย้อนหลังสำหรับกราฟ
  dailyViews?: ITimeSeriesDataPoint[];
  dailyReads?: ITimeSeriesDataPoint[];
  dailyCoinRevenue?: ITimeSeriesDataPoint[];
}

// Interface สำหรับ WriterStats document
// อินเทอร์เฟซสำหรับเอกสารสถิตินักเขียน
export interface IWriterStats extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId; // ID ของผู้ใช้ที่เป็นนักเขียน (อ้างอิง User/SocialMediaUser model) - ID ของผู้ใช้ที่เป็นนักเขียน

  // Overall Earning Stats - สถิติรายได้โดยรวม
  totalCoinEarned_Lifetime: number; // รายได้รวม (เหรียญ) ตลอดชีพ - รายได้รวม (เหรียญ) ตลอดชีพ
  totalRealMoneyEarned_Lifetime?: number; // รายได้รวม (เงินจริง) ตลอดชีพ (ถ้ามี) - รายได้รวม (เงินจริง) ตลอดชีพ
  currencyRealMoney?: string; // สกุลเงินจริงสำหรับรายได้ - สกุลเงินจริงสำหรับรายได้
  pendingCoinBalance: number; // ยอดเหรียญที่รอดำเนินการ (ยังไม่สามารถถอนได้) - ยอดเหรียญที่รอดำเนินการ
  withdrawableCoinBalance: number; // ยอดเหรียญที่สามารถถอนได้ - ยอดเหรียญที่สามารถถอนได้
  lastPayoutDate?: Date; // วันที่จ่ายเงินล่าสุด - วันที่จ่ายเงินล่าสุด
  totalPayoutAmountCoin?: number; // จำนวนเงินที่จ่ายล่าสุด (เหรียญ) - จำนวนเงินที่จ่ายล่าสุด (เหรียญ)

  // Overall Engagement & Performance Stats - สถิติการมีส่วนร่วมและประสิทธิภาพโดยรวม
  totalNovelsPublished: number; // จำนวนนิยายที่เผยแพร่ทั้งหมด - จำนวนนิยายที่เผยแพร่ทั้งหมด
  totalEpisodesPublished: number; // จำนวนตอนที่เผยแพร่ทั้งหมด - จำนวนตอนที่เผยแพร่ทั้งหมด
  totalNovelViews_Lifetime: number; // จำนวนการดูนิยายทั้งหมด (รวมทุกเรื่อง) - จำนวนการดูนิยายทั้งหมด
  totalNovelReads_Lifetime: number; // จำนวนการอ่านนิยายทั้งหมด (รวมทุกเรื่อง) - จำนวนการอ่านนิยายทั้งหมด
  averageRating_AllNovels?: number; // คะแนนเฉลี่ยของนิยายทุกเรื่อง - คะแนนเฉลี่ยของนิยายทุกเรื่อง
  totalFollowers_Lifetime: number; // จำนวนผู้ติดตามทั้งหมด (อาจซ้ำกับ User.statistics.followersCount แต่เก็บไว้ที่นี่เพื่อ snapshot) - จำนวนผู้ติดตามทั้งหมด

  // Detailed Stats per Novel - สถิติโดยละเอียดของนิยายแต่ละเรื่อง
  novelPerformance: INovelPerformanceStats[];

  // Time Series Data for Dashboard Graphs (Overall) - ข้อมูลอนุกรมเวลาสำหรับกราฟบนแดชบอร์ด (โดยรวม)
  monthlyCoinEarnings?: ITimeSeriesDataPoint[]; // รายได้ (เหรียญ) รายเดือน - รายได้ (เหรียญ) รายเดือน
  monthlyRealMoneyEarnings?: ITimeSeriesDataPoint[]; // รายได้ (เงินจริง) รายเดือน - รายได้ (เงินจริง) รายเดือน
  monthlyNewFollowers?: ITimeSeriesDataPoint[]; // จำนวนผู้ติดตามใหม่รายเดือน - จำนวนผู้ติดตามใหม่รายเดือน
  monthlyNovelViews?: ITimeSeriesDataPoint[]; // จำนวนการดูนิยายรายเดือน - จำนวนการดูนิยายรายเดือน
  monthlyNovelReads?: ITimeSeriesDataPoint[]; // จำนวนการอ่านนิยายรายเดือน - จำนวนการอ่านนิยายรายเดือน

  // Audience Demographics (Potentially aggregated and anonymized) - ข้อมูลประชากรของผู้ชม (อาจมีการรวมและทำให้ไม่ระบุตัวตน)
  // e.g., topGeographies: [{ country: string, percentage: number }], ageRanges: [...], genderDistribution: [...]
  audienceDemographics?: any; // ควรออกแบบ schema ย่อยถ้าต้องการรายละเอียดมาก

  // Donation Specific Stats - สถิติเฉพาะการบริจาค
  totalDonationCoinReceived_Lifetime: number; // จำนวนเหรียญที่ได้รับจากการบริจาคทั้งหมด - จำนวนเหรียญที่ได้รับจากการบริจาคทั้งหมด
  totalDonationCount_Lifetime: number; // จำนวนครั้งที่ได้รับการบริจาคทั้งหมด - จำนวนครั้งที่ได้รับการบริจาคทั้งหมด
  averageDonationCoinAmount?: number; // จำนวนเหรียญบริจาคเฉลี่ยต่อครั้ง - จำนวนเหรียญบริจาคเฉลี่ยต่อครั้ง
  topDonors?: Array<{ userId: Types.ObjectId, totalCoinDonated: number }>; // ผู้บริจาคสูงสุด (เก็บ ID และจำนวน)

  lastCalculatedAt: Date; // วันที่คำนวณสถิติล่าสุด - วันที่คำนวณสถิติล่าสุด
  createdAt: Date;
  updatedAt: Date;
}

const TimeSeriesDataPointSchema = new Schema<ITimeSeriesDataPoint>(
  {
    date: { type: Date, required: true },
    value: { type: Number, required: true, default: 0 },
    coinValue: { type: Number },
  },
  { _id: false }
);

const NovelPerformanceStatsSchema = new Schema<INovelPerformanceStats>(
  {
    novelId: { type: Schema.Types.ObjectId, ref: "Novel", required: true, index: true },
    totalViews: { type: Number, default: 0, min: 0 },
    totalReads: { type: Number, default: 0, min: 0 },
    totalLikes: { type: Number, default: 0, min: 0 },
    totalComments: { type: Number, default: 0, min: 0 },
    totalShares: { type: Number, default: 0, min: 0 },
    averageRating: { type: Number, min: 0, max: 5 },
    totalCoinRevenue: { type: Number, default: 0, min: 0 },
    totalRealMoneyRevenue: { type: Number, default: 0, min: 0 },
    currencyRealMoney: { type: String, uppercase: true, trim: true },
    conversionRate: { type: Number, min: 0 },
    dailyViews: [TimeSeriesDataPointSchema],
    dailyReads: [TimeSeriesDataPointSchema],
    dailyCoinRevenue: [TimeSeriesDataPointSchema],
  },
  { _id: false }
);

const WriterStatsSchema = new Schema<IWriterStats>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User", // Can also be SocialMediaUser, handle dynamically or use a generic refPath
      required: true,
      unique: true, // Each user should have only one WriterStats document
      index: true,
    },
    totalCoinEarned_Lifetime: { type: Number, default: 0, min: 0 },
    totalRealMoneyEarned_Lifetime: { type: Number, default: 0, min: 0 },
    currencyRealMoney: { type: String, uppercase: true, trim: true },
    pendingCoinBalance: { type: Number, default: 0, min: 0 },
    withdrawableCoinBalance: { type: Number, default: 0, min: 0 },
    lastPayoutDate: { type: Date },
    totalPayoutAmountCoin: { type: Number, min: 0 },
    totalNovelsPublished: { type: Number, default: 0, min: 0 },
    totalEpisodesPublished: { type: Number, default: 0, min: 0 },
    totalNovelViews_Lifetime: { type: Number, default: 0, min: 0 },
    totalNovelReads_Lifetime: { type: Number, default: 0, min: 0 },
    averageRating_AllNovels: { type: Number, min: 0, max: 5 },
    totalFollowers_Lifetime: { type: Number, default: 0, min: 0 },
    novelPerformance: [NovelPerformanceStatsSchema],
    monthlyCoinEarnings: [TimeSeriesDataPointSchema],
    monthlyRealMoneyEarnings: [TimeSeriesDataPointSchema],
    monthlyNewFollowers: [TimeSeriesDataPointSchema],
    monthlyNovelViews: [TimeSeriesDataPointSchema],
    monthlyNovelReads: [TimeSeriesDataPointSchema],
    audienceDemographics: { type: Schema.Types.Mixed }, // For flexibility, consider a sub-schema if structure is fixed
    totalDonationCoinReceived_Lifetime: { type: Number, default: 0, min: 0 },
    totalDonationCount_Lifetime: { type: Number, default: 0, min: 0 },
    averageDonationCoinAmount: { type: Number, min: 0 },
    topDonors: [
      {
        _id: false,
        userId: { type: Schema.Types.ObjectId, ref: "User" }, // Or SocialMediaUser
        totalCoinDonated: { type: Number, default: 0, min: 0 },
      },
    ],
    lastCalculatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----- Indexes -----
// Index for querying writer stats by user and last calculation time
// ดัชนีสำหรับการ query สถิตินักเขียนตามผู้ใช้และเวลาคำนวณล่าสุด
WriterStatsSchema.index({ user: 1, lastCalculatedAt: -1 });
// Index for sorting writers by lifetime earnings (coins)
// ดัชนีสำหรับการจัดอันดับนักเขียนตามรายได้รวม (เหรียญ)
WriterStatsSchema.index({ totalCoinEarned_Lifetime: -1 });

// ----- Methods -----
// Method to update or add novel performance stats
// เมธอดสำหรับอัปเดตหรือเพิ่มสถิติประสิทธิภาพของนิยาย
WriterStatsSchema.methods.updateNovelPerformance = function (novelStats: Partial<INovelPerformanceStats> & { novelId: Types.ObjectId }) {
  const existingNovelPerf = this.novelPerformance.find(
    (p: INovelPerformanceStats) => p.novelId.equals(novelStats.novelId)
  );
  if (existingNovelPerf) {
    Object.assign(existingNovelPerf, novelStats);
  } else {
    this.novelPerformance.push(novelStats);
  }
  this.markModified("novelPerformance");
};

// ----- Model Export -----
// This pattern ensures the model is not recompiled in Next.js dev mode
// รูปแบบนี้ช่วยให้มั่นใจว่าโมเดลจะไม่ถูกคอมไพล์ซ้ำในโหมด dev ของ Next.js
const WriterStatsModel = () =>
  models.WriterStats as mongoose.Model<IWriterStats> ||
  model<IWriterStats>("WriterStats", WriterStatsSchema);

export default WriterStatsModel;

