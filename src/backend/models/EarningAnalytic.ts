// src/backend/models/EarningAnalytic.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface for individual earning event/transaction contributing to an analytic record
export interface IEarningEventDetail extends Document {
  eventId: Types.ObjectId; // ID of the source event (e.g., Purchase._id, Donation._id)
  eventType: "novel_purchase" | "episode_purchase" | "donation" | "subscription_payment" | "ad_revenue_share"; // ประเภทของรายได้
  grossAmount: number; // จำนวนเงินรวมก่อนหักค่าธรรมเนียม
  platformFee: number; // ค่าธรรมเนียมแพลตฟอร์มที่หักไป
  netAmount: number; // จำนวนเงินสุทธิที่ผู้เขียนได้รับจากรายการนี้
  currency: string; // สกุลเงิน (e.g., "THB", "USD")
  transactionTimestamp: Date; // เวลาที่เกิดรายการ
  buyerId?: Types.ObjectId; // ID ของผู้ซื้อ/ผู้บริจาค (ถ้ามี)
}

// Interface for EarningAnalytic document
// This model tracks earnings for writers, aggregated over specific periods or per item.
export interface IEarningAnalytic extends Document {
  writer: Types.ObjectId; // ผู้เขียน (อ้างอิง User model)
  // Granularity of the analytic record
  periodType: "daily" | "weekly" | "monthly" | "yearly" | "custom_range" | "per_item_lifetime"; // รอบระยะเวลา
  periodStartDate: Date; // วันที่เริ่มรอบ (สำหรับ daily, weekly, monthly, yearly, custom_range)
  periodEndDate?: Date; // วันที่สิ้นสุดรอบ (สำหรับ weekly, monthly, yearly, custom_range)
  // Item-specific earnings (optional, for per_item_lifetime or if aggregating by item within a period)
  novel?: Types.ObjectId; // นิยาย (ถ้าเป็นการสรุปรายได้ของนิยายเรื่องนี้)
  episode?: Types.ObjectId; // ตอน (ถ้าเป็นการสรุปรายได้ของตอนนี้)
  // Aggregated Earnings Data
  totalGrossRevenue: number; // รายได้รวมทั้งหมด (ก่อนหักค่าธรรมเนียม)
  totalPlatformFees: number; // ค่าธรรมเนียมแพลตฟอร์มรวม
  totalNetEarnings: number; // รายได้สุทธิรวม (หลังหักค่าธรรมเนียม)
  currency: string; // สกุลเงินหลักของ analytic record นี้ (e.g., "THB")
  // Counts and Metrics
  totalTransactions: number; // จำนวนรายการทั้งหมดที่สร้างรายได้
  uniquePayingUsers: number; // จำนวนผู้ใช้ที่จ่ายเงิน (ไม่ซ้ำกัน) ในรอบนี้
  averageTransactionValue?: number; // มูลค่าเฉลี่ยต่อรายการ
  // Breakdown by source (optional, can be complex)
  earningsBySource?: {
    novelSales: number;
    episodeSales: number;
    donations: number;
    subscriptions: number;
    ads: number;
  };
  // Payout Status (if this record represents a payout period)
  isPayoutProcessed: boolean; // จ่ายเงินให้ผู้เขียนสำหรับรอบนี้แล้วหรือยัง
  payoutDate?: Date; // วันที่จ่ายเงิน
  payoutTransactionId?: string; // ID อ้างอิงการจ่ายเงิน
  // Detailed breakdown of transactions contributing to this analytic (optional, could be too large for embedding)
  // If needed for audit, store IDs or use a separate related collection.
  // contributingEventIds?: Types.ObjectId[]; // Array of Purchase/Donation IDs
  // For AI/ML - Projections and Insights
  projectedEarningsNextPeriod?: number; // คาดการณ์รายได้รอบถัดไป
  earningsTrend?: "increasing" | "decreasing" | "stable"; // แนวโน้มรายได้
  // Timestamps
  createdAt: Date;
  updatedAt: Date; // When this analytic record was last calculated/updated
}

const EarningAnalyticSchema = new Schema<IEarningAnalytic>(
  {
    writer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    periodType: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly", "custom_range", "per_item_lifetime"],
      required: true,
      index: true,
    },
    periodStartDate: { type: Date, required: true, index: true },
    periodEndDate: { type: Date, index: true }, // Required if periodType is not daily or per_item_lifetime
    novel: { type: Schema.Types.ObjectId, ref: "Novel", index: true, sparse: true },
    episode: { type: Schema.Types.ObjectId, ref: "Episode", index: true, sparse: true },
    totalGrossRevenue: { type: Number, required: true, default: 0, min: 0 },
    totalPlatformFees: { type: Number, required: true, default: 0, min: 0 },
    totalNetEarnings: { type: Number, required: true, default: 0, min: 0 },
    currency: { type: String, required: true, default: "THB", uppercase: true, minlength: 3, maxlength: 3 },
    totalTransactions: { type: Number, required: true, default: 0, min: 0 },
    uniquePayingUsers: { type: Number, required: true, default: 0, min: 0 },
    averageTransactionValue: { type: Number, min: 0 },
    earningsBySource: {
      novelSales: { type: Number, default: 0 },
      episodeSales: { type: Number, default: 0 },
      donations: { type: Number, default: 0 },
      subscriptions: { type: Number, default: 0 },
      ads: { type: Number, default: 0 },
    },
    isPayoutProcessed: { type: Boolean, default: false, index: true },
    payoutDate: Date,
    payoutTransactionId: { type: String, trim: true, index: true, sparse: true },
    projectedEarningsNextPeriod: { type: Number, min: 0 },
    earningsTrend: { type: String, enum: ["increasing", "decreasing", "stable"] },
  },
  {
    timestamps: true, // createdAt, updatedAt (updatedAt for last calculation time)
    // Consider `timeseries` collection if using MongoDB 5.0+ for high-volume event data
    // timeseries: {
    //   timeField: "periodStartDate",
    //   metaField: "writer",
    //   granularity: "days" // or hours, etc. depending on periodType
    // }
  }
);

// ----- Indexes -----
// Ensure uniqueness for a writer for a specific period and item (if applicable)
EarningAnalyticSchema.index({ writer: 1, periodType: 1, periodStartDate: 1, novel: 1, episode: 1 }, { unique: true, sparse: true });
EarningAnalyticSchema.index({ writer: 1, periodType: 1, periodStartDate: -1 }); // General query for writer earnings over time
EarningAnalyticSchema.index({ novel: 1, periodType: 1, periodStartDate: -1 }); // Earnings for a specific novel
EarningAnalyticSchema.index({ writer: 1, isPayoutProcessed: 1, periodStartDate: -1 }); // For payout processing

// ----- Middleware & Methods -----
EarningAnalyticSchema.pre("save", function (next) {
  // Calculate averageTransactionValue if not provided
  if (this.totalTransactions > 0 && (this.isModified("totalGrossRevenue") || this.isModified("totalTransactions"))) {
    this.averageTransactionValue = parseFloat((this.totalGrossRevenue / this.totalTransactions).toFixed(2));
  }
  // Ensure periodEndDate is set for relevant periodTypes
  if (["weekly", "monthly", "yearly", "custom_range"].includes(this.periodType) && !this.periodEndDate) {
    // This logic should ideally be handled by the service creating these records
    // For example, for "monthly", periodEndDate would be end of month of periodStartDate
    // next(new Error(`periodEndDate is required for periodType: ${this.periodType}`));
    // For now, allow save but log a warning or handle in service layer.
  }
  next();
});

// Method to add an earning event (like a purchase or donation) to this analytic record
// This would typically be called by a service that processes raw transaction events.
// EarningAnalyticSchema.methods.addEarningEvent = function(event: IEarningEventDetail) {
//   this.totalGrossRevenue += event.grossAmount;
//   this.totalPlatformFees += event.platformFee;
//   this.totalNetEarnings += event.netAmount;
//   this.totalTransactions += 1;
//   // Logic to update uniquePayingUsers would be more complex, possibly using a Set temporarily
//   // Update earningsBySource based on event.eventType
//   // ... more logic ...
//   this.markModified("earningsBySource"); // Important if subdocument is modified directly
//   return this.save(); // Or batch saves in the service layer
// };

// ----- Model Export -----
const EarningAnalyticModel = () =>
  models.EarningAnalytic as mongoose.Model<IEarningAnalytic> || model<IEarningAnalytic>("EarningAnalytic", EarningAnalyticSchema);

export default EarningAnalyticModel;

