// src/backend/models/Payment.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface for details about the payment method used
export interface IPaymentMethodDetails {
  type: "credit_card" | "debit_card" | "promptpay" | "true_money_wallet" | "paypal" | "bank_transfer" | "platform_credits" | "other"; // ประเภทวิธีการชำระเงิน
  provider?: string; // เช่น "Visa", "Mastercard", "SCB", "KBank"
  lastFourDigits?: string; // เลข 4 ตัวท้าย (สำหรับบัตร, บัญชี)
  email?: string; // อีเมล (สำหรับ PayPal, etc.)
  phoneNumber?: string; // เบอร์โทรศัพท์ (สำหรับ PromptPay, TrueMoney)
  isSavedMethod?: boolean; // เป็นวิธีการชำระเงินที่บันทึกไว้หรือไม่
}

// Interface for breakdown of amounts in a payment
export interface IPaymentAmountDetails {
  grossAmount: number; // จำนวนเงินรวมก่อนหักค่าธรรมเนียม (ยอดที่ลูกค้าจ่าย)
  currency: string; // สกุลเงิน (เช่น "THB", "USD", "CREDITS")
  paymentGatewayFee: number; // ค่าธรรมเนียม Payment Gateway
  platformProcessingFee: number; // ค่าธรรมเนียมการดำเนินการของแพลตฟอร์ม (ถ้ามีเพิ่มเติม)
  netAmountReceived: number; // จำนวนเงินสุทธิที่แพลตฟอร์มได้รับ (grossAmount - gatewayFee - platformFee)
  // For payouts, this section might look different, e.g., payoutAmount, withholdingTax, finalPayoutAmount
}

// Interface for Payout specific details (if paymentType is writer_payout)
export interface IPayoutDetails {
  writer: Types.ObjectId; // ผู้รับเงิน (นักเขียน, อ้างอิง User model)
  payoutBatchId?: string; // ID ของรอบการจ่ายเงิน (ถ้ามี)
  earningIds?: Types.ObjectId[]; // IDs ของรายการรายได้ที่ถูกจ่ายในครั้งนี้ (อ้างอิง Earning model)
  payoutMethodDetails?: IPaymentMethodDetails; // รายละเอียดช่องทางการรับเงินของนักเขียน
}

// Interface for Wallet transaction specific details
export interface IWalletTransactionDetails {
  userWallet: Types.ObjectId; // Wallet ของผู้ใช้ (อ้างอิง UserWallet model)
  transactionType: "deposit" | "spend" | "refund_credit" | "adjustment_credit" | "adjustment_debit"; // ประเภทธุรกรรมใน Wallet
  realCurrencyAmount?: number; // จำนวนเงินจริงที่ใช้ (สำหรับ deposit)
  realCurrency?: string; // สกุลเงินจริง (สำหรับ deposit)
  virtualCurrencyAmount: number; // จำนวนเครดิต/เหรียญที่เกี่ยวข้อง
  balanceBefore: number; // ยอดคงเหลือใน Wallet ก่อนทำรายการ
  balanceAfter: number; // ยอดคงเหลือใน Wallet หลังทำรายการ
}

// Interface for Payment document
// This model records individual financial transactions processed through payment gateways or internal systems.
export interface IPayment extends Document {
  user?: Types.ObjectId; // ผู้ใช้ที่เกี่ยวข้องกับธุรกรรม (ผู้จ่าย, ผู้รับเงิน) - อาจไม่จำเป็นถ้า purchaseOrder มี user
  purchaseOrder?: Types.ObjectId; // ID คำสั่งซื้อที่เกี่ยวข้อง (อ้างอิง Purchase model)
  paymentIntentId: string; // ID ที่สร้างโดยระบบภายในสำหรับติดตาม payment attempt (unique)
  // Payment Gateway Information
  paymentGateway: "stripe" | "paypal" | "omise" | "manual" | "platform_credits_system" | "other"; // ชื่อ Payment Gateway
  gatewayTransactionId?: string; // ID ธุรกรรมจาก Payment Gateway (เมื่อสำเร็จ)
  gatewayResponsePayload?: Record<string, any>; // Raw response จาก Gateway (select: false, for audit)
  // Type and Purpose
  paymentType: "order_payment" | "wallet_top_up" | "writer_payout" | "refund_processed" | "donation" | "subscription_fee" | "manual_adjustment"; // ประเภทของธุรกรรมการเงิน
  // Amounts and Currency
  amountDetails: IPaymentAmountDetails;
  // Status and Timestamps
  status: "pending_initiation" | "pending_gateway_confirmation" | "requires_action" | "processing" | "succeeded" | "failed" | "canceled" | "disputed" | "refund_pending" | "refunded" | "partially_refunded"; // สถานะการชำระเงิน
  // Payment Method
  paymentMethodUsed: IPaymentMethodDetails;
  // Related Information
  relatedPaymentId?: Types.ObjectId; // ID ของ Payment ที่เกี่ยวข้อง (เช่น original payment for a refund)
  description?: string; // คำอธิบายเพิ่มเติม (เช่น "Payment for Order #XYZ", "Writer Payout March 2025")
  // Specific details based on paymentType
  payoutDetails?: IPayoutDetails;
  walletTransactionDetails?: IWalletTransactionDetails;
  // Timestamps
  initiatedAt: Date; // เวลาที่เริ่มกระบวนการชำระเงิน
  processedAt?: Date; // เวลาที่ Gateway ประมวลผล (อาจยังไม่ final)
  succeededAt?: Date; // เวลาที่การชำระเงินสำเร็จสมบูรณ์
  failedAt?: Date; // เวลาที่การชำระเงินล้มเหลว
  refundedAt?: Date; // เวลาที่การคืนเงินสำเร็จ
  // Metadata
  customMetadata?: Record<string, any>; // ข้อมูลเพิ่มเติม
  ipAddress?: string; // IP ของผู้ทำรายการ (select: false)
  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentMethodDetailsSchema = new Schema<IPaymentMethodDetails>({
  type: { type: String, enum: ["credit_card", "debit_card", "promptpay", "true_money_wallet", "paypal", "bank_transfer", "platform_credits", "other"], required: true },
  provider: String,
  lastFourDigits: String,
  email: String,
  phoneNumber: String,
  isSavedMethod: { type: Boolean, default: false },
}, { _id: false });

const PaymentAmountDetailsSchema = new Schema<IPaymentAmountDetails>({
  grossAmount: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, uppercase: true, trim: true, minlength: 3, maxlength: 10 }, // Allow "CREDITS"
  paymentGatewayFee: { type: Number, default: 0, min: 0 },
  platformProcessingFee: { type: Number, default: 0, min: 0 },
  netAmountReceived: { type: Number, required: true }, // Calculated: gross - gatewayFee - platformFee
}, { _id: false });

const PayoutDetailsSchema = new Schema<IPayoutDetails>({
  writer: { type: Schema.Types.ObjectId, ref: "User", required: true },
  payoutBatchId: { type: String, index: true },
  earningIds: [{ type: Schema.Types.ObjectId, ref: "Earning" }], // Assume Earning model
  payoutMethodDetails: PaymentMethodDetailsSchema,
}, { _id: false });

const WalletTransactionDetailsSchema = new Schema<IWalletTransactionDetails>({
  userWallet: { type: Schema.Types.ObjectId, ref: "UserWallet", required: true }, // Assume UserWallet model
  transactionType: { type: String, enum: ["deposit", "spend", "refund_credit", "adjustment_credit", "adjustment_debit"], required: true },
  realCurrencyAmount: { type: Number, min: 0 },
  realCurrency: { type: String, uppercase: true, trim: true },
  virtualCurrencyAmount: { type: Number, required: true },
  balanceBefore: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
}, { _id: false });

const PaymentSchema = new Schema<IPayment>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", index: true }, // User who owns the payment method or is target of payout
    purchaseOrder: { type: Schema.Types.ObjectId, ref: "Purchase", index: true },
    paymentIntentId: { type: String, required: true, unique: true, index: true },
    paymentGateway: { type: String, enum: ["stripe", "paypal", "omise", "manual", "platform_credits_system", "other"], required: true },
    gatewayTransactionId: { type: String, index: true, sparse: true }, // Can be null initially
    gatewayResponsePayload: { type: Schema.Types.Mixed, select: false },
    paymentType: {
      type: String,
      enum: ["order_payment", "wallet_top_up", "writer_payout", "refund_processed", "donation", "subscription_fee", "manual_adjustment"],
      required: true,
      index: true,
    },
    amountDetails: { type: PaymentAmountDetailsSchema, required: true },
    status: {
      type: String,
      enum: ["pending_initiation", "pending_gateway_confirmation", "requires_action", "processing", "succeeded", "failed", "canceled", "disputed", "refund_pending", "refunded", "partially_refunded"],
      default: "pending_initiation",
      required: true,
      index: true,
    },
    paymentMethodUsed: { type: PaymentMethodDetailsSchema, required: true },
    relatedPaymentId: { type: Schema.Types.ObjectId, ref: "Payment", index: true },
    description: { type: String, trim: true, maxlength: 1000 },
    payoutDetails: PayoutDetailsSchema,
    walletTransactionDetails: WalletTransactionDetailsSchema,
    initiatedAt: { type: Date, default: Date.now, required: true },
    processedAt: Date,
    succeededAt: Date,
    failedAt: Date,
    refundedAt: Date,
    customMetadata: Schema.Types.Mixed,
    ipAddress: { type: String, select: false },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ----- Indexes -----
PaymentSchema.index({ user: 1, status: 1, createdAt: -1 });
PaymentSchema.index({ purchaseOrder: 1, status: 1 });
PaymentSchema.index({ paymentGateway: 1, gatewayTransactionId: 1 }, { unique: true, sparse: true }); // Unique if gatewayTransactionId exists
PaymentSchema.index({ paymentType: 1, status: 1, createdAt: -1 });
PaymentSchema.index({ "payoutDetails.writer": 1, status: 1 });
PaymentSchema.index({ "walletTransactionDetails.userWallet": 1, createdAt: -1 });
PaymentSchema.index({ createdAt: -1 }); // General time-based sorting

// ----- Middleware -----
PaymentSchema.pre("save", function (next) {
  // Calculate netAmountReceived if not explicitly set
  if (this.isModified("amountDetails") || this.isNew) {
    const ad = this.amountDetails;
    if (ad && typeof ad.netAmountReceived !== 'number') { // Check if it needs calculation
        ad.netAmountReceived = ad.grossAmount - (ad.paymentGatewayFee || 0) - (ad.platformProcessingFee || 0);
    }
  }

  // Update specific timestamps based on status changes
  if (this.isModified("status")) {
    const now = new Date();
    switch (this.status) {
      case "succeeded":
        if (!this.succeededAt) this.succeededAt = now;
        if (!this.processedAt) this.processedAt = now; // Often same as succeeded for finality
        break;
      case "failed":
        if (!this.failedAt) this.failedAt = now;
        if (!this.processedAt) this.processedAt = now; // Gateway did process it, but it failed
        break;
      case "refunded":
        if (!this.refundedAt) this.refundedAt = now;
        break;
      // Other statuses like "processing" might update `processedAt`
      case "processing":
      case "pending_gateway_confirmation":
      case "requires_action":
        if (!this.processedAt) this.processedAt = now;
        break;
    }
  }

  // Soft delete handling
  if (this.isModified("isDeleted") && this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  next();
});

// Post-save: Potentially trigger events for other services (e.g., update Purchase order status, update wallet balance)
// This should be handled carefully, often better in a service layer or via an event bus.
PaymentSchema.post("save", async function(doc: IPayment) {
  if (doc.isModified("status")) {
    console.log(`Payment ${doc.paymentIntentId} status changed to ${doc.status}. Consider downstream effects.`);
    // Example: If payment succeeded for a purchase order, update the purchase order's paymentStatus.
    if (doc.status === "succeeded" && doc.purchaseOrder) {
      const Purchase = models.Purchase || model("Purchase");
      try {
        await Purchase.findByIdAndUpdate(doc.purchaseOrder, { 
            paymentStatus: "succeeded", 
            paymentId: doc._id, // Ensure paymentId is linked
            // Potentially move orderStatus to "processing" or "completed" here or based on fulfillment
        });
      } catch (error) {
        console.error(`Error updating purchase order ${doc.purchaseOrder} after payment success:`, error);
      }
    }
    // Example: If wallet top-up succeeded, update user's wallet balance (via UserWallet model method ideally)
    if (doc.status === "succeeded" && doc.paymentType === "wallet_top_up" && doc.walletTransactionDetails) {
        // const UserWallet = models.UserWallet || model("UserWallet");
        // await UserWallet.creditBalance(doc.walletTransactionDetails.userWallet, doc.walletTransactionDetails.virtualCurrencyAmount, doc._id);
        console.log(`Wallet top-up ${doc.paymentIntentId} succeeded. Trigger wallet balance update.`);
    }
  }
});


// ----- Model Export -----
const PaymentModel = () =>
  models.Payment as mongoose.Model<IPayment> || model<IPayment>("Payment", PaymentSchema);

export default PaymentModel;

