// src/models/EarningAnalytic.ts
// โมเดลการวิเคราะห์รายได้ (EarningAnalytic Model) - จัดเก็บและวิเคราะห์ข้อมูลรายได้ของนักเขียน
// ออกแบบให้รองรับการคำนวณรายได้จากหลายแหล่ง (เช่น ยอดขายตอน, การสนับสนุน, ส่วนแบ่งโฆษณา), การเบิกจ่าย, และแสดงสถิติ

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// ประเภทของแหล่งที่มาของรายได้
export type EarningSourceType = 
  | "novel_episode_sale" // จากการขายตอนนิยาย
  | "novel_bundle_sale" // จากการขายชุดนิยาย
  | "donation_received" // จากการได้รับการสนับสนุน/บริจาค
  | "subscription_share" // ส่วนแบ่งจากค่าสมาชิก (ถ้ามีระบบ subscription)
  | "ad_revenue_share" // ส่วนแบ่งจากรายได้โฆษณา (ถ้ามี)
  | "writer_support_package_sale" // จากการขายแพ็กเกจสนับสนุนนักเขียน
  | "bonus_or_grant" // โบนัสหรือเงินสนับสนุนจากแพลตฟอร์ม
  | "other";

// อินเทอร์เฟซสำหรับรายการธุรกรรมรายได้ (Earning Transaction Item)
export interface IEarningTransaction {
  transactionId: Types.ObjectId; // ID ของธุรกรรม (อาจเป็น _id ของเอกสารนี้เอง หรือ ID ภายนอก)
  sourceType: EarningSourceType; // แหล่งที่มาของรายได้
  sourceId?: Types.ObjectId; // ID ของต้นทาง (เช่น PurchaseId, DonationId, NovelId, EpisodeId)
  description: string; // คำอธิบายรายการ (เช่น "รายได้จากตอนที่ 5 - 'บทสรุป'")
  amount: number; // จำนวนเงินที่ได้รับ (หลังหักค่าธรรมเนียมแพลตฟอร์ม ถ้ามี)
  currency: "THB" | "USD" | "COIN"; // สกุลเงินของรายได้นี้ (COIN ถ้าเป็นรายได้ในรูปเหรียญก่อนแปลง)
  platformFeeRate?: number; // อัตราค่าธรรมเนียมแพลตฟอร์ม (เช่น 0.15 สำหรับ 15%)
  platformFeeAmount?: number; // จำนวนค่าธรรมเนียมที่แพลตฟอร์มหักไป
  netAmountToWriter: number; // จำนวนเงินสุทธิที่นักเขียนได้รับสำหรับรายการนี้
  transactionDate: Date; // วันที่เกิดรายการรายได้
  relatedNovelId?: Types.ObjectId; // นิยายที่เกี่ยวข้องกับรายได้นี้
  relatedEpisodeId?: Types.ObjectId; // ตอนที่เกี่ยวข้อง (ถ้ามี)
  // metadata?: Record<string, any>; // ข้อมูลเพิ่มเติม
}

// อินเทอร์เฟซสำหรับคำขอเบิกจ่าย (Withdrawal Request)
export interface IWithdrawalRequest {
  _id: Types.ObjectId;
  requestedAmount: number; // จำนวนเงินที่ขอเบิก (ในสกุลเงิน THB/USD)
  currency: "THB" | "USD";
  status: "pending_review" | "approved" | "processing_payment" | "completed" | "rejected" | "cancelled_by_writer";
  paymentMethodDetails: { // รายละเอียดบัญชีผู้รับเงิน
    method: "bank_transfer" | "paypal"; // หรืออื่นๆ
    accountName: string;
    accountNumberOrEmail: string;
    bankName?: string; // ถ้าเป็น bank_transfer
    bankBranch?: string; // ถ้าเป็น bank_transfer
  };
  rejectionReason?: string; // เหตุผลที่ถูกปฏิเสธ (ถ้า status = "rejected")
  platformTransactionId?: string; // ID ธุรกรรมการจ่ายเงินจากแพลตฟอร์ม (เมื่อ completed)
  requestedAt: Date;
  processedAt?: Date; // วันที่ดำเนินการ (approved, rejected, completed)
  // notes?: string; // หมายเหตุจาก admin หรือ writer
}

// อินเทอร์เฟซหลักสำหรับเอกสารการวิเคราะห์รายได้ (EarningAnalytic Document) - ต่อผู้ใช้ (นักเขียน)
export interface IEarningAnalytic extends Document {
  _id: Types.ObjectId;
  writer: Types.ObjectId; // นักเขียน (อ้างอิง User model)
  
  // สรุปยอดคงเหลือ
  currentBalance: number; // ยอดเงินคงเหลือที่สามารถเบิกได้ (ในสกุลเงินหลัก เช่น THB)
  balanceCurrency: "THB" | "USD"; // สกุลเงินของ currentBalance
  // pendingBalance: number; // ยอดเงินที่กำลังรอเคลียร์ (เช่น จากยอดขายที่ยังไม่ครบกำหนดจ่าย)
  // lifetimeEarnings: number; // รายได้รวมทั้งหมดที่เคยได้รับ
  
  // ประวัติธุรกรรมรายได้ (อาจเก็บเป็น sub-documents หรือ collection แยกถ้าเยอะมาก)
  // ถ้าเก็บในนี้ ควรจำกัดจำนวน หรือใช้ pagination
  earningTransactions: Types.DocumentArray<IEarningTransaction>;
  
  // ประวัติการเบิกจ่าย
  withdrawalRequests: Types.DocumentArray<IWithdrawalRequest>;
  
  // สถิติรายได้ (อาจคำนวณเป็นระยะ หรือ on-demand)
  // monthlyEarnings: Array<{ month: string, year: number, total: number }>;
  // earningsByNovel: Array<{ novelId: Types.ObjectId, novelTitle: string, total: number }>;
  // earningsBySourceType: Record<EarningSourceType, number>;
  
  lastTransactionDate?: Date; // วันที่ของธุรกรรมล่าสุด
  lastWithdrawalDate?: Date; // วันที่เบิกจ่ายล่าสุด

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Schema ย่อยสำหรับ IEarningTransaction
const EarningTransactionSchema = new Schema<IEarningTransaction>(
  {
    transactionId: { type: Schema.Types.ObjectId, auto: true, unique: true },
    sourceType: {
      type: String,
      enum: ["novel_episode_sale", "novel_bundle_sale", "donation_received", "subscription_share", "ad_revenue_share", "writer_support_package_sale", "bonus_or_grant", "other"],
      required: true,
    },
    sourceId: { type: Schema.Types.ObjectId, index: true }, // refPath ควรใช้ถ้า sourceType มีหลาย model
    description: { type: String, required: true, trim: true, maxlength: 255 },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["THB", "USD", "COIN"], required: true },
    platformFeeRate: { type: Number, min: 0, max: 1 },
    platformFeeAmount: { type: Number, min: 0 },
    netAmountToWriter: { type: Number, required: true, min: 0 },
    transactionDate: { type: Date, required: true, default: Date.now, index: true },
    relatedNovelId: { type: Schema.Types.ObjectId, ref: "Novel", index: true },
    relatedEpisodeId: { type: Schema.Types.ObjectId, ref: "Episode", index: true },
  },
  { _id: false } // transactionId is the effective _id for this subdocument if needed for direct reference
);

// Schema ย่อยสำหรับ IWithdrawalRequest
const WithdrawalRequestSchema = new Schema<IWithdrawalRequest>(
  {
    // _id is automatically generated
    requestedAmount: { type: Number, required: true, min: 1 }, // กำหนดขั้นต่ำการเบิก
    currency: { type: String, enum: ["THB", "USD"], required: true },
    status: {
      type: String,
      enum: ["pending_review", "approved", "processing_payment", "completed", "rejected", "cancelled_by_writer"],
      default: "pending_review",
      required: true,
      index: true,
    },
    paymentMethodDetails: {
      method: { type: String, enum: ["bank_transfer", "paypal"], required: true },
      accountName: { type: String, required: true, trim: true },
      accountNumberOrEmail: { type: String, required: true, trim: true },
      bankName: { type: String, trim: true },
      bankBranch: { type: String, trim: true },
    },
    rejectionReason: { type: String, trim: true },
    platformTransactionId: { type: String, trim: true, index: true },
    requestedAt: { type: Date, default: Date.now, required: true },
    processedAt: { type: Date },
  }
);

// Schema หลักสำหรับ EarningAnalytic
const EarningAnalyticSchema = new Schema<IEarningAnalytic>(
  {
    writer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // หนึ่ง document ต่อหนึ่งนักเขียน
      index: true,
    },
    currentBalance: { type: Number, required: true, default: 0, min: 0 },
    balanceCurrency: { type: String, enum: ["THB", "USD"], required: true, default: "THB" },
    earningTransactions: [EarningTransactionSchema], // อาจมี $slice ใน query เพื่อจำกัดจำนวน
    withdrawalRequests: [WithdrawalRequestSchema],
    lastTransactionDate: { type: Date, index: true },
    lastWithdrawalDate: { type: Date, index: true },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ----- Indexes -----
EarningAnalyticSchema.index({ writer: 1, "earningTransactions.transactionDate": -1 });
EarningAnalyticSchema.index({ writer: 1, "withdrawalRequests.status": 1, "withdrawalRequests.requestedAt": -1 });

// ----- Middleware & Methods -----
// Method to add an earning transaction and update balance
EarningAnalyticSchema.methods.addEarning = async function(this: IEarningAnalytic, transactionData: Omit<IEarningTransaction, "transactionId">) {
  const transaction: IEarningTransaction = {
    ...transactionData,
    transactionId: new mongoose.Types.ObjectId(), // Generate new ID for the transaction
  } as IEarningTransaction;
  
  this.earningTransactions.push(transaction);
  // Convert netAmountToWriter to balanceCurrency if different, then add to currentBalance
  // This logic needs to be robust, handling currency conversion rates if applicable
  if (transaction.currency === this.balanceCurrency || transaction.currency === "COIN") { // Assuming COIN can be directly converted or represents a value in balanceCurrency context
    // TODO: Implement proper currency conversion if COIN or other currencies need conversion to balanceCurrency
    this.currentBalance += transaction.netAmountToWriter;
  } else {
    // Handle currency conversion if transaction.currency is different from this.balanceCurrency
    // For now, let's assume direct addition if currencies match, or log an error/warning
    console.warn(`Currency mismatch in addEarning: transaction ${transaction.currency}, balance ${this.balanceCurrency}. Amount not added to balance directly.`);
    // Or throw an error: throw new Error("Currency conversion not implemented for earnings addition");
  }
  this.lastTransactionDate = transaction.transactionDate;
  return this.save();
};

// Method to request a withdrawal and update balance
EarningAnalyticSchema.methods.requestWithdrawal = async function(this: IEarningAnalytic, withdrawalData: Omit<IWithdrawalRequest, "_id" | "status" | "requestedAt">) {
  if (withdrawalData.requestedAmount > this.currentBalance) {
    throw new Error("ยอดเงินที่ขอเบิกเกินกว่ายอดคงเหลือ (Withdrawal amount exceeds current balance)");
  }
  if (withdrawalData.currency !== this.balanceCurrency) {
      throw new Error("สกุลเงินที่ขอเบิกไม่ตรงกับสกุลเงินของยอดคงเหลือ (Withdrawal currency mismatch)");
  }

  const request: IWithdrawalRequest = {
    ...withdrawalData,
    _id: new mongoose.Types.ObjectId(),
    status: "pending_review",
    requestedAt: new Date(),
  } as IWithdrawalRequest;
  
  this.withdrawalRequests.push(request);
  this.currentBalance -= withdrawalData.requestedAmount; // Deduct from balance immediately on request
  // If request is rejected/cancelled, the amount should be credited back.
  return this.save();
};

// Middleware to handle crediting back balance if withdrawal is rejected/cancelled
EarningAnalyticSchema.pre("save", function(this: IEarningAnalytic, next) {
  if (this.isModified("withdrawalRequests")) {
    this.withdrawalRequests.forEach(req => {
      const originalValue = this.get("withdrawalRequests", null, { getters: false }) as Types.DocumentArray<IWithdrawalRequest>;      
      const originalReq = originalValue.find(origReq => origReq._id.equals(req._id));

      if (req.isModified("status") && 
          (req.status === "rejected" || req.status === "cancelled_by_writer") && 
          originalReq && 
          originalReq.status !== "rejected" && 
          originalReq.status !== "cancelled_by_writer"
      ) {
            // Only credit back if it wasn't already rejected/cancelled and currency matches
            if (req.currency === this.balanceCurrency) {
                this.currentBalance += req.requestedAmount;
            }
      }
      
      if (req.isModified("status") && req.status === "completed") {
          if (!this.lastWithdrawalDate || (req.processedAt && req.processedAt > this.lastWithdrawalDate)) {
            this.lastWithdrawalDate = req.processedAt || new Date();
          }
      }
    });
  }
  next();
});


// ----- Model Export -----
const EarningAnalyticModel = () => models.EarningAnalytic as mongoose.Model<IEarningAnalytic> || model<IEarningAnalytic>("EarningAnalytic", EarningAnalyticSchema);

export default EarningAnalyticModel;

