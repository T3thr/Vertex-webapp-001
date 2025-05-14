// src/models/Payment.ts
// โมเดลการชำระเงิน (Payment Model) - จัดการข้อมูลการชำระเงินด้วยเงินจริงผ่าน Payment Gateway
// ออกแบบให้เชื่อมโยงกับ Purchase, บันทึกรายละเอียดธุรกรรม, และสถานะการชำระเงิน

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// อินเทอร์เฟซสำหรับรายละเอียดจาก Payment Gateway (ข้อมูลที่ไม่ sensitive)
export interface IPaymentGatewayDetails {
  gatewayName: "Stripe" | "PayPal" | "Omise" | "2C2P" | "Other"; // ชื่อ Payment Gateway
  transactionId?: string; // ID ธุรกรรมจาก Gateway (สำคัญมาก)
  paymentMethodDetails?: string; // รายละเอียดวิธีการชำระเงิน (เช่น "Visa ****4242", "PromptPay Ref XXXXX")
  rawResponse?: Record<string, any>; // (Optional, for debugging) Raw response จาก Gateway (ควรเลือกเก็บเฉพาะที่จำเป็นและไม่ sensitive)
  feeAmount?: number; // ค่าธรรมเนียมที่ Gateway เรียกเก็บ (ถ้ามี และต้องการบันทึก)
  netAmountReceived?: number; // จำนวนเงินสุทธิที่ได้รับหลังหักค่าธรรมเนียม (ถ้ามี)
}

// อินเทอร์เฟซหลักสำหรับเอกสารการชำระเงิน (Payment Document)
export interface IPayment extends Document {
  _id: Types.ObjectId;
  purchase: Types.ObjectId; // การซื้อที่เกี่ยวข้อง (อ้างอิง Purchase model, ควร unique)
  user: Types.ObjectId; // ผู้ใช้ที่ทำการชำระเงิน (denormalized from Purchase, อ้างอิง User model)
  
  amount: number; // จำนวนเงินที่ชำระ (ควรตรงกับ Purchase.totalAmount ที่สกุลเงินเป็นเงินจริง)
  currency: "THB" | "USD" | "EUR"; // สกุลเงินที่ชำระ (ควรเป็นสกุลเงินจริง)
  
  paymentMethod: "credit_card" | "promptpay" | "bank_transfer" | "paypal" | "apple_pay" | "google_pay" | "other"; // วิธีการชำระเงิน
  status: "pending" | "requires_action" | "processing" | "succeeded" | "failed" | "cancelled" | "refunded" | "partially_refunded"; // สถานะการชำระเงิน
  
  gatewayDetails?: IPaymentGatewayDetails; // รายละเอียดจาก Payment Gateway
  
  // ข้อมูลเพิ่มเติม
  // clientSecret?: string; // (สำหรับ Stripe Payment Intents, ควรจัดการอย่างปลอดภัย)
  // paymentIntentId?: string; // (สำหรับ Stripe)
  // chargeId?: string; // (สำหรับ Stripe)
  failureReason?: string; // เหตุผลที่การชำระเงินล้มเหลว (ถ้ามี)
  refundDetails?: Array<{ // รายละเอียดการคืนเงิน (ถ้ามี)
    refundId: string; // ID การคืนเงินจาก Gateway
    amountRefunded: number;
    reason?: string;
    refundedAt: Date;
  }>;
  
  // Timestamps
  initiatedAt: Date; // วันที่เริ่มกระบวนการชำระเงิน
  completedAt?: Date; // วันที่การชำระเงินสำเร็จ (status = "succeeded")
  lastAttemptAt?: Date; // วันที่พยายามชำระเงินครั้งล่าสุด (ถ้ามีการ retry)
  createdAt: Date;
  updatedAt: Date;
}

// Schema ย่อยสำหรับ IPaymentGatewayDetails
const PaymentGatewayDetailsSchema = new Schema<IPaymentGatewayDetails>(
  {
    gatewayName: { type: String, enum: ["Stripe", "PayPal", "Omise", "2C2P", "Other"], required: true },
    transactionId: { type: String, trim: true, index: true },
    paymentMethodDetails: { type: String, trim: true },
    rawResponse: { type: Schema.Types.Mixed, select: false }, // ไม่ return โดย default
    feeAmount: { type: Number, min: 0 },
    netAmountReceived: { type: Number, min: 0 },
  },
  { _id: false }
);

// Schema หลักสำหรับ Payment
const PaymentSchema = new Schema<IPayment>(
  {
    purchase: {
      type: Schema.Types.ObjectId,
      ref: "Purchase",
      required: true,
      unique: true, // หนึ่ง Payment ต่อหนึ่ง Purchase
      index: true,
    },
    user: { // Denormalized from Purchase for easier querying/reporting on payments by user
      type: Schema.Types.ObjectId,
      ref: "User", // หรือ refPath
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "กรุณาระบุจำนวนเงินที่ชำระ (Payment amount is required)"],
      min: [0.01, "จำนวนเงินต้องมากกว่า 0"], // หรือตามข้อกำหนดขั้นต่ำของ Gateway
    },
    currency: {
      type: String,
      enum: ["THB", "USD", "EUR"], // เพิ่มเติมตามสกุลเงินที่รองรับ
      required: [true, "กรุณาระบุสกุลเงิน (Currency is required)"],
    },
    paymentMethod: {
      type: String,
      enum: ["credit_card", "promptpay", "bank_transfer", "paypal", "apple_pay", "google_pay", "other"],
      required: [true, "กรุณาระบุวิธีการชำระเงิน (Payment method is required)"],
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "requires_action", "processing", "succeeded", "failed", "cancelled", "refunded", "partially_refunded"],
      default: "pending",
      required: true,
      index: true,
    },
    gatewayDetails: PaymentGatewayDetailsSchema,
    // clientSecret: { type: String, select: false },
    // paymentIntentId: { type: String, index: true, unique: true, sparse: true },
    // chargeId: { type: String, index: true, unique: true, sparse: true },
    failureReason: { type: String, trim: true },
    refundDetails: [
      {
        _id: false,
        refundId: { type: String, required: true, trim: true, index: true },
        amountRefunded: { type: Number, required: true, min: 0.01 },
        reason: { type: String, trim: true },
        refundedAt: { type: Date, required: true },
      },
    ],
    initiatedAt: { type: Date, default: Date.now, required: true },
    completedAt: { type: Date, index: true },
    lastAttemptAt: Date,
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ----- Indexes -----
PaymentSchema.index({ user: 1, status: 1, createdAt: -1 }); // การชำระเงินล่าสุดของผู้ใช้ตามสถานะ
PaymentSchema.index({ status: 1, paymentMethod: 1, createdAt: -1 });
PaymentSchema.index({ "gatewayDetails.transactionId": 1 }, { unique: true, sparse: true }); // ID ธุรกรรมจาก Gateway ควร unique

// ----- Middleware -----
PaymentSchema.pre("save", async function (next) {
  // Denormalize user from Purchase if not set or Purchase changed
  if (this.isNew || this.isModified("purchase")) {
    const PurchaseModel = models.Purchase || model("Purchase");
    const purchaseDoc = await PurchaseModel.findById(this.purchase).select("user").lean();
    if (purchaseDoc) {
        this.user = purchaseDoc.user;
    }
  }

  if (this.isModified("status")) {
    if (this.status === "succeeded" && !this.completedAt) {
      this.completedAt = new Date();
    }
    // อัปเดตสถานะของ Purchase ที่เกี่ยวข้อง
    const Purchase = models.Purchase || model("Purchase");
    try {
      let purchaseStatusUpdate: string | undefined = undefined;
      switch (this.status) {
        case "succeeded":
          purchaseStatusUpdate = "completed";
          break;
        case "failed":
        case "cancelled":
          purchaseStatusUpdate = "failed";
          break;
        case "refunded":
          purchaseStatusUpdate = "refunded";
          break;
        case "partially_refunded":
          purchaseStatusUpdate = "partially_refunded";
          break;
        // "pending", "processing", "requires_action" อาจยังคงสถานะ Purchase เป็น "pending" หรือ "processing"
      }

      if (purchaseStatusUpdate) {
        await Purchase.findByIdAndUpdate(this.purchase, { 
            status: purchaseStatusUpdate, 
            ...(this.status === "succeeded" && { purchasedAt: new Date() }) // อัปเดต purchasedAt ใน Purchase ด้วย
        });
      }
    } catch (error) {
      console.error(`Error updating related Purchase ${this.purchase} status for payment ${this._id}:`, error);
      // อาจต้องมีระบบ retry หรือแจ้งเตือน admin
    }
  }
  next();
});

// ----- Model Export -----
const PaymentModel = () => models.Payment as mongoose.Model<IPayment> || model<IPayment>("Payment", PaymentSchema);

export default PaymentModel;

