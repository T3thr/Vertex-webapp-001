// src/backend/models/EarningsAnalytics.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface สำหรับ EarningsAnalytics document
export interface IEarningsAnalytics extends Document {
  writer: Types.ObjectId; // ผู้เขียน
  novel?: Types.ObjectId; // นิยาย (ถ้ามี)
  episode?: Types.ObjectId; // ตอน (ถ้ามี)
  date: Date; // วันที่
  revenue: number; // รายได้
  currency: string; // สกุลเงิน
  purchases: number; // จำนวนการซื้อ
  uniqueBuyers: number; // จำนวนผู้ซื้อที่ไม่ซ้ำกัน
  platformFee: number; // ค่าธรรมเนียมแพลตฟอร์ม
  netEarnings: number; // รายได้สุทธิ
  isPaid: boolean; // จ่ายให้ผู้เขียนแล้วหรือไม่
  paidAt?: Date; // วันที่จ่าย
  paymentReference?: string; // รหัสอ้างอิงการจ่ายเงิน
}

const EarningsAnalyticsSchema = new Schema<IEarningsAnalytics>(
  {
    writer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุผู้เขียน"],
      index: true,
    },
    novel: {
      type: Schema.Types.ObjectId,
      ref: "Novel",
      index: true,
    },
    episode: {
      type: Schema.Types.ObjectId,
      ref: "Episode",
      index: true,
    },
    date: {
      type: Date,
      required: [true, "กรุณาระบุวันที่"],
      index: true,
    },
    revenue: {
      type: Number,
      required: [true, "กรุณาระบุรายได้"],
      min: [0, "รายได้ต้องไม่ติดลบ"],
    },
    currency: {
      type: String,
      required: [true, "กรุณาระบุสกุลเงิน"],
      default: "THB",
      uppercase: true,
      minlength: 3,
      maxlength: 3,
    },
    purchases: {
      type: Number,
      required: [true, "กรุณาระบุจำนวนการซื้อ"],
      min: [0, "จำนวนการซื้อต้องไม่ติดลบ"],
    },
    uniqueBuyers: {
      type: Number,
      required: [true, "กรุณาระบุจำนวนผู้ซื้อที่ไม่ซ้ำกัน"],
      min: [0, "จำนวนผู้ซื้อที่ไม่ซ้ำกันต้องไม่ติดลบ"],
    },
    platformFee: {
      type: Number,
      required: [true, "กรุณาระบุค่าธรรมเนียมแพลตฟอร์ม"],
      min: [0, "ค่าธรรมเนียมแพลตฟอร์มต้องไม่ติดลบ"],
    },
    netEarnings: {
      type: Number,
      required: [true, "กรุณาระบุรายได้สุทธิ"],
      min: [0, "รายได้สุทธิต้องไม่ติดลบ"],
    },
    isPaid: {
      type: Boolean,
      default: false,
      index: true,
    },
    paidAt: {
      type: Date,
    },
    paymentReference: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Indexes
EarningsAnalyticsSchema.index({ writer: 1, date: -1 });
EarningsAnalyticsSchema.index({ novel: 1, date: -1 });
EarningsAnalyticsSchema.index({ episode: 1, date: -1 });
EarningsAnalyticsSchema.index({ writer: 1, isPaid: 1, date: -1 });

// Export Model
const EarningsAnalyticsModel = () => 
  models.EarningsAnalytics as mongoose.Model<IEarningsAnalytics> || model<IEarningsAnalytics>("EarningsAnalytics", EarningsAnalyticsSchema);

export default EarningsAnalyticsModel;