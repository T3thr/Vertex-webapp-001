// src/backend/models/Purchase.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface สำหรับ Purchase document
export interface IPurchase extends Document {
  user: Types.ObjectId; // ผู้ซื้อ
  episode: Types.ObjectId; // ตอนที่ซื้อ
  novel: Types.ObjectId; // นิยายที่ตอนนั้นอยู่
  amount: number; // จำนวนเงิน
  currency: string; // สกุลเงิน
  paymentMethod: string; // วิธีการชำระเงิน
  paymentId?: string; // รหัสอ้างอิงการชำระเงิน
  status: "pending" | "completed" | "failed" | "refunded"; // สถานะการชำระเงิน
  writerEarnings: number; // ส่วนแบ่งที่ผู้เขียนได้รับ
  platformFee: number; // ค่าธรรมเนียมแพลตฟอร์ม
  metadata?: Record<string, any>; // ข้อมูลเพิ่มเติม
  completedAt?: Date; // วันที่ชำระเงินสำเร็จ
  refundedAt?: Date; // วันที่คืนเงิน (ถ้ามี)
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseSchema = new Schema<IPurchase>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุผู้ซื้อ"],
      index: true,
    },
    episode: {
      type: Schema.Types.ObjectId,
      ref: "Episode",
      required: [true, "กรุณาระบุตอนที่ซื้อ"],
      index: true,
    },
    novel: {
      type: Schema.Types.ObjectId,
      ref: "Novel",
      required: [true, "กรุณาระบุนิยายที่ตอนนั้นอยู่"],
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
    paymentMethod: {
      type: String,
      required: [true, "กรุณาระบุวิธีการชำระเงิน"],
      enum: {
        values: ["credit_card", "debit_card", "promptpay", "wallet", "bank_transfer", "other"],
        message: "วิธีการชำระเงิน {VALUE} ไม่ถูกต้อง",
      },
    },
    paymentId: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      required: [true, "กรุณาระบุสถานะการชำระเงิน"],
      enum: {
        values: ["pending", "completed", "failed", "refunded"],
        message: "สถานะการชำระเงิน {VALUE} ไม่ถูกต้อง",
      },
      default: "pending",
      index: true,
    },
    writerEarnings: {
      type: Number,
      required: [true, "กรุณาระบุส่วนแบ่งที่ผู้เขียนได้รับ"],
      min: [0, "ส่วนแบ่งที่ผู้เขียนได้รับต้องไม่ติดลบ"],
    },
    platformFee: {
      type: Number,
      required: [true, "กรุณาระบุค่าธรรมเนียมแพลตฟอร์ม"],
      min: [0, "ค่าธรรมเนียมแพลตฟอร์มต้องไม่ติดลบ"],
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    completedAt: {
      type: Date,
    },
    refundedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware: อัพเดตวันที่ตามสถานะ
PurchaseSchema.pre("save", function(next) {
  if (this.isModified("status")) {
    if (this.status === "completed" && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status === "refunded" && !this.refundedAt) {
      this.refundedAt = new Date();
    }
  }
  next();
});

// Compound Indexes
PurchaseSchema.index({ user: 1, episode: 1 }, { unique: true });
PurchaseSchema.index({ user: 1, status: 1 });
PurchaseSchema.index({ novel: 1, status: 1 });
PurchaseSchema.index({ createdAt: -1 });

// Export Model
const PurchaseModel = () => 
  models.Purchase as mongoose.Model<IPurchase> || model<IPurchase>("Purchase", PurchaseSchema);

export default PurchaseModel;