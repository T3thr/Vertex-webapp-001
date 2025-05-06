// src/backend/models/Payment.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface สำหรับ Payment document
export interface IPayment extends Document {
  user: Types.ObjectId; // ผู้ใช้ที่ทำรายการ
  type: "deposit" | "withdrawal" | "refund" | "adjustment"; // ประเภทการชำระเงิน
  amount: number; // จำนวนเงิน
  currency: string; // สกุลเงิน
  fee: number; // ค่าธรรมเนียม
  netAmount: number; // จำนวนเงินสุทธิ
  method: string; // วิธีการชำระเงิน
  status: "pending" | "processing" | "completed" | "failed" | "cancelled"; // สถานะ
  reference: string; // รหัสอ้างอิงภายนอก
  description?: string; // คำอธิบาย
  metadata?: Record<string, any>; // ข้อมูลเพิ่มเติม
  completedAt?: Date; // วันที่ทำรายการสำเร็จ
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุผู้ใช้ที่ทำรายการ"],
      index: true,
    },
    type: {
      type: String,
      required: [true, "กรุณาระบุประเภทการชำระเงิน"],
      enum: {
        values: ["deposit", "withdrawal", "refund", "adjustment"],
        message: "ประเภทการชำระเงิน {VALUE} ไม่ถูกต้อง",
      },
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "กรุณาระบุจำนวนเงิน"],
      min: [0, "จำนวนเงินต้องไม่ติดลบ"],
    },
    currency: {
      type: String,
      required: [true, "กรุณาระบุสกุลเงิน"],
      default: "THB",
      uppercase: true,
      minlength: 3,
      maxlength: 3,
    },
    fee: {
      type: Number,
      required: [true, "กรุณาระบุค่าธรรมเนียม"],
      default: 0,
      min: [0, "ค่าธรรมเนียมต้องไม่ติดลบ"],
    },
    netAmount: {
      type: Number,
      required: [true, "กรุณาระบุจำนวนเงินสุทธิ"],
    },
    method: {
      type: String,
      required: [true, "กรุณาระบุวิธีการชำระเงิน"],
      enum: {
        values: ["credit_card", "debit_card", "promptpay", "wallet", "bank_transfer", "other"],
        message: "วิธีการชำระเงิน {VALUE} ไม่ถูกต้อง",
      },
    },
    status: {
      type: String,
      required: [true, "กรุณาระบุสถานะการชำระเงิน"],
      enum: {
        values: ["pending", "processing", "completed", "failed", "cancelled"],
        message: "สถานะการชำระเงิน {VALUE} ไม่ถูกต้อง",
      },
      default: "pending",
      index: true,
    },
    reference: {
      type: String,
      required: [true, "กรุณาระบุรหัสอ้างอิง"],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "คำอธิบายต้องไม่เกิน 500 ตัวอักษร"],
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware: อัพเดตวันที่เมื่อสถานะเป็น completed
PaymentSchema.pre("save", function(next) {
  if (this.isModified("status") && this.status === "completed" && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

// Indexes
PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ user: 1, type: 1, createdAt: -1 });
PaymentSchema.index({ reference: 1 }, { unique: true });

// Export Model
const PaymentModel = () => 
  models.Payment as mongoose.Model<IPayment> || model<IPayment>("Payment", PaymentSchema);

export default PaymentModel;