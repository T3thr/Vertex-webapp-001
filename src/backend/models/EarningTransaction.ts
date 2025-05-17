// src/backend/models/EarningTransaction.ts
// โมเดลธุรกรรมรายรับ-รายจ่าย (EarningTransaction Model)
// บันทึกการเคลื่อนไหวของเหรียญ (Coins) และเงินจริง (Real Money) ของผู้ใช้และแพลตฟอร์ม

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IUser } from "./User"; // สำหรับ userId, relatedUserId, relatedAdminId
import { INovel } from "./Novel"; // สำหรับ relatedNovelId
import { IEpisode } from "./Episode"; // สำหรับ relatedEpisodeId
import { IPurchase } from "./Purchase"; // สำหรับ relatedPurchaseId
import { IDonation } from "./Donation"; // สำหรับ relatedDonationId
import { IPayment } from "./Payment"; // สำหรับ relatedPaymentId

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล EarningTransaction
// ==================================================================================================

/**
 * @enum {string} TransactionType
 * @description ประเภทของธุรกรรมทางการเงิน/เหรียญ (ละเอียดขึ้นเพื่อการวิเคราะห์และการตรวจสอบที่แม่นยำ)
 * USER_COIN: ธุรกรรมเหรียญที่เกี่ยวข้องกับผู้ใช้ทั่วไป
 * WRITER_COIN: ธุรกรรมเหรียญที่เกี่ยวข้องกับรายได้ของนักเขียน
 * WRITER_REAL_MONEY: ธุรกรรมเงินจริงที่เกี่ยวข้องกับรายได้และการถอนเงินของนักเขียน
 * PLATFORM_REVENUE: ธุรกรรมที่เกี่ยวข้องกับรายได้ของแพลตฟอร์ม
 * ADMIN_ADJUSTMENT: ธุรกรรมที่เกิดจากการปรับปรุงโดยผู้ดูแลระบบ
 */
export enum TransactionType {
  // User Coin Transactions (การใช้จ่าย/ได้รับเหรียญของผู้ใช้)
  USER_COIN_BUY_PACKAGE = "user_coin.buy_package", // ผู้ใช้ซื้อแพ็กเกจเหรียญ (ได้รับเหรียญ)
  USER_COIN_SPEND_FOR_EPISODE = "user_coin.spend_for_episode", // ผู้ใช้ใช้เหรียญซื้อตอนนิยาย
  USER_COIN_SPEND_FOR_DONATION = "user_coin.spend_for_donation", // ผู้ใช้ใช้เหรียญบริจาคให้นักเขียน
  USER_COIN_SPEND_FOR_FEATURE = "user_coin.spend_for_feature", // ผู้ใช้ใช้เหรียญสำหรับฟีเจอร์พิเศษ (เช่น Gacha, Item)
  USER_COIN_EARN_FROM_EVENT = "user_coin.earn_from_event", // ผู้ใช้ได้รับเหรียญจากกิจกรรมการอ่าน/โปรโมชั่น
  USER_COIN_EARN_FROM_ACHIEVEMENT = "user_coin.earn_from_achievement", // ผู้ใช้ได้รับเหรียญจากรางวัลความสำเร็จ
  USER_COIN_REFUND_FOR_EPISODE = "user_coin.refund_for_episode", // ผู้ใช้ได้รับเหรียญคืนจากการคืนเงินตอน

  // Writer Coin Earnings (รายได้เหรียญของนักเขียน)
  WRITER_COIN_EARN_FROM_EPISODE_SALE = "writer_coin.earn_from_episode_sale", // นักเขียนได้รับเหรียญจากการขายตอนนิยาย
  WRITER_COIN_EARN_FROM_DONATION = "writer_coin.earn_from_donation", // นักเขียนได้รับเหรียญจากการบริจาค
  WRITER_COIN_EARN_FROM_PLATFORM_BONUS = "writer_coin.earn_from_platform_bonus", // นักเขียนได้รับโบนัสเหรียญจากแพลตฟอร์ม

  // Writer Real Money Transactions (ธุรกรรมเงินจริงของนักเขียน)
  WRITER_REAL_MONEY_REVENUE_SHARE_ACCRUAL = "writer_real_money.revenue_share_accrual", // การบันทึกส่วนแบ่งรายได้เป็นเงินจริง (สะสม)
  WRITER_REAL_MONEY_WITHDRAWAL_REQUEST = "writer_real_money.withdrawal_request", // นักเขียนขอถอนเงินจริง
  WRITER_REAL_MONEY_WITHDRAWAL_PROCESSING = "writer_real_money.withdrawal_processing", // การถอนเงินกำลังดำเนินการ
  WRITER_REAL_MONEY_WITHDRAWAL_COMPLETED = "writer_real_money.withdrawal_completed", // การถอนเงินจริงของนักเขียนสำเร็จ
  WRITER_REAL_MONEY_WITHDRAWAL_FAILED = "writer_real_money.withdrawal_failed", // การถอนเงินจริงของนักเขียนล้มเหลว
  WRITER_REAL_MONEY_WITHDRAWAL_FEE = "writer_real_money.withdrawal_fee", // ค่าธรรมเนียมการถอนเงิน

  // Platform Revenue & Expenses (รายรับ/รายจ่ายของแพลตฟอร์ม)
  PLATFORM_REVENUE_FROM_COIN_SALE = "platform_revenue.from_coin_sale", // รายได้แพลตฟอร์มจากการขายเหรียญ
  PLATFORM_REVENUE_CUT_FROM_EPISODE_SALE = "platform_revenue.cut_from_episode_sale", // ส่วนแบ่งรายได้แพลตฟอร์มจากการขายนิยาย
  PLATFORM_REVENUE_CUT_FROM_DONATION = "platform_revenue.cut_from_donation", // ส่วนแบ่งรายได้แพลตฟอร์มจากการบริจาค
  PLATFORM_EXPENSE_WRITER_BONUS = "platform_expense.writer_bonus_coin", // ค่าใช้จ่ายโบนัสเหรียญให้นักเขียน
  PLATFORM_EXPENSE_PAYMENT_GATEWAY_FEE = "platform_expense.payment_gateway_fee", // ค่าธรรมเนียม Payment Gateway

  // Admin Adjustments (การปรับปรุงโดยผู้ดูแลระบบ)
  ADMIN_ADJUSTMENT_GRANT_COIN = "admin_adjustment.grant_coin", // Admin ให้เหรียญผู้ใช้
  ADMIN_ADJUSTMENT_REVOKE_COIN = "admin_adjustment.revoke_coin", // Admin ดึงเหรียญคืนจากผู้ใช้
  ADMIN_ADJUSTMENT_GRANT_REAL_MONEY = "admin_adjustment.grant_real_money", // Admin ให้เงินจริง (กรณีพิเศษ)
  ADMIN_ADJUSTMENT_REVOKE_REAL_MONEY = "admin_adjustment.revoke_real_money", // Admin ดึงเงินจริงคืน (กรณีพิเศษ)

  OTHER = "other", // ประเภทอื่นๆ ที่ไม่ได้ระบุไว้
}

/**
 * @enum {string} TransactionStatus
 * @description สถานะของธุรกรรม
 */
export enum TransactionStatus {
  PENDING = "pending", // รอดำเนินการ (เช่น การขอถอนเงิน)
  PROCESSING = "processing", // กำลังประมวลผล (เช่น การถอนเงินที่ส่งไปธนาคารแล้ว)
  COMPLETED = "completed", // ธุรกรรมสำเร็จ
  FAILED = "failed", // ธุรกรรมล้มเหลว
  CANCELLED = "cancelled", // ธุรกรรมถูกยกเลิก
  REVERSED = "reversed", // ธุรกรรมถูกยกเลิกและมีการคืนเงิน/เหรียญ (เช่น Chargeback)
}

/**
 * @enum {string} TransactionCurrency
 * @description สกุลเงินของธุรกรรม
 */
export enum TransactionCurrency {
  COIN = "COIN", // เหรียญภายในแพลตฟอร์ม NovelMaze
  THB = "THB", // เงินบาทไทย
  USD = "USD", // ดอลลาร์สหรัฐ
  // สามารถเพิ่มสกุลเงินอื่นๆ ได้ตามต้องการ
}

/**
 * @interface ITransactionParty
 * @description ข้อมูลเกี่ยวกับผู้ที่เกี่ยวข้องในธุรกรรม (ผู้ให้และผู้รับ)
 * @property {Types.ObjectId | IUser} userId - ID ของผู้ใช้
 * @property {string} role - บทบาทในธุรกรรมนี้ (เช่น "payer", "payee", "platform")
 */
export interface ITransactionParty {
  userId?: Types.ObjectId | IUser; // อาจเป็น null ถ้าเป็น platform
  role: "payer" | "payee" | "platform_revenue" | "platform_expense";
}
const TransactionPartySchema = new Schema<ITransactionParty>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    role: { type: String, required: true, enum: ["payer", "payee", "platform_revenue", "platform_expense"] },
  },
  { _id: false }
);

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร EarningTransaction (IEarningTransaction Document Interface)
// ==================================================================================================

/**
 * @interface IEarningTransaction
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารธุรกรรมรายรับ-รายจ่ายใน Collection "earningtransactions"
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสาร
 * @property {string} transactionReadableId - ID ที่มนุษย์อ่านได้สำหรับธุรกรรม (เช่น ETX-2024-00001)
 * @property {Types.ObjectId | IUser} primaryUserId - ID ของผู้ใช้หลักที่เกี่ยวข้องกับธุรกรรมนี้ (เช่น ผู้ซื้อ, นักเขียนที่ได้รับเงิน)
 * @property {ITransactionParty} [payer] - ผู้จ่าย (ถ้ามี)
 * @property {ITransactionParty} [payee] - ผู้รับ (ถ้ามี)
 * @property {TransactionType} transactionType - ประเภทของธุรกรรม (**จำเป็น**)
 * @property {string} description - คำอธิบายธุรกรรม (**จำเป็น**)
 * @property {number} amount - จำนวนเงิน/เหรียญ (เป็นค่าบวกเสมอ, การเป็นรายรับ/รายจ่ายขึ้นกับ `transactionType` และ `payer`/`payee`)
 * @property {TransactionCurrency} currency - สกุลเงิน (**จำเป็น**)
 * @property {number} [platformFee] - ค่าธรรมเนียมที่แพลตฟอร์มเก็บ (ถ้ามี, สำหรับธุรกรรมนั้นๆ)
 * @property {number} [netAmount] - จำนวนเงินสุทธิหลังหักค่าธรรมเนียม (ถ้ามี)
 * @property {Types.ObjectId | INovel} [relatedNovelId] - ID นิยายที่เกี่ยวข้อง
 * @property {Types.ObjectId | IEpisode} [relatedEpisodeId] - ID ตอนที่เกี่ยวข้อง
 * @property {Types.ObjectId | IPurchase} [relatedPurchaseId] - ID การซื้อที่เกี่ยวข้อง
 * @property {Types.ObjectId | IDonation} [relatedDonationId] - ID การบริจาคที่เกี่ยวข้อง
 * @property {Types.ObjectId | IPayment} [relatedPaymentId] - ID การชำระเงินที่เกี่ยวข้อง (เช่น การซื้อเหรียญ, การถอนเงิน)
 * @property {Types.ObjectId | IUser} [relatedSourceUserId] - ID ผู้ใช้ที่เป็นต้นเหตุ (เช่น ผู้บริจาค, ผู้ซื้อ)
 * @property {Types.ObjectId | IUser} [relatedTargetUserId] - ID ผู้ใช้ที่เป็นเป้าหมาย (เช่น ผู้รับบริจาค, นักเขียนเจ้าของตอน)
 * @property {Types.ObjectId | IUser} [relatedAdminId] - ID Admin ที่ทำรายการ (ถ้าเป็นการปรับปรุงโดย Admin)
 * @property {TransactionStatus} status - สถานะธุรกรรม (**จำเป็น**)
 * @property {Date} transactionDate - วันที่เกิดธุรกรรม (หรือวันที่ complete, **จำเป็น**)
 * @property {Date} [processedAt] - วันที่ธุรกรรมถูกประมวลผล (เช่น วันที่ถอนเงินสำเร็จ)
 * @property {any} [metadata] - ข้อมูลเพิ่มเติมอื่นๆ (เช่น รายละเอียดจาก Payment Gateway, หมายเลข Batch การโอนเงิน)
 * @property {string} [notes] - หมายเหตุเพิ่มเติมจากผู้ดูแลระบบหรือระบบ
 * @property {number} schemaVersion - เวอร์ชันของ schema
 * @property {Date} createdAt - วันที่สร้างเอกสาร (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตเอกสารล่าสุด (Mongoose `timestamps`)
 */
export interface IEarningTransaction extends Document {
  _id: Types.ObjectId;
  transactionReadableId: string;
  primaryUserId?: Types.ObjectId | IUser; // อาจไม่จำเป็นถ้าเป็น platform transaction ล้วนๆ
  payer?: ITransactionParty;
  payee?: ITransactionParty;
  transactionType: TransactionType;
  description: string;
  amount: number;
  currency: TransactionCurrency;
  platformFee?: number;
  netAmount?: number;
  relatedNovelId?: Types.ObjectId | INovel;
  relatedEpisodeId?: Types.ObjectId | IEpisode;
  relatedPurchaseId?: Types.ObjectId | IPurchase;
  relatedDonationId?: Types.ObjectId | IDonation;
  relatedPaymentId?: Types.ObjectId | IPayment;
  relatedSourceUserId?: Types.ObjectId | IUser;
  relatedTargetUserId?: Types.ObjectId | IUser;
  relatedAdminId?: Types.ObjectId | IUser;
  status: TransactionStatus;
  transactionDate: Date;
  processedAt?: Date;
  metadata?: any;
  notes?: string;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ EarningTransaction (EarningTransactionSchema)
// ==================================================================================================
const EarningTransactionSchema = new Schema<IEarningTransaction>(
  {
    transactionReadableId: { 
      type: String, 
      required: [true, "กรุณาระบุ ID ที่อ่านได้ของธุรกรรม (Readable Transaction ID is required)"], 
      unique: true, 
      index: true 
    },
    primaryUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    payer: { type: TransactionPartySchema },
    payee: { type: TransactionPartySchema },
    transactionType: {
      type: String,
      enum: Object.values(TransactionType),
      required: [true, "กรุณาระบุประเภทธุรกรรม (Transaction type is required)"],
      index: true,
    },
    description: {
      type: String,
      required: [true, "กรุณาระบุคำอธิบายธุรกรรม (Description is required)"],
      trim: true,
      maxlength: [1000, "คำอธิบายธุรกรรมต้องไม่เกิน 1000 ตัวอักษร"],
    },
    amount: {
      type: Number,
      required: [true, "กรุณาระบุจำนวนเงิน/เหรียญ (Amount is required)"],
      min: [0, "จำนวนเงิน/เหรียญต้องไม่ติดลบ (ใช้ transactionType และ payer/payee ในการบอกทิศทาง)"],
    },
    currency: {
      type: String,
      enum: Object.values(TransactionCurrency),
      required: [true, "กรุณาระบุสกุลเงิน (Currency is required)"],
      index: true,
    },
    platformFee: { type: Number, min: 0, default: 0 },
    netAmount: { type: Number, min: 0 },
    relatedNovelId: { type: Schema.Types.ObjectId, ref: "Novel", index: true },
    relatedEpisodeId: { type: Schema.Types.ObjectId, ref: "Episode", index: true },
    relatedPurchaseId: { type: Schema.Types.ObjectId, ref: "Purchase", index: true },
    relatedDonationId: { type: Schema.Types.ObjectId, ref: "Donation", index: true },
    relatedPaymentId: { type: Schema.Types.ObjectId, ref: "Payment", index: true },
    relatedSourceUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    relatedTargetUserId: { type: Schema.Types.ObjectId, ref: "User", index: true }, 
    relatedAdminId: { type: Schema.Types.ObjectId, ref: "User", index: true }, 
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.COMPLETED,
      required: [true, "กรุณาระบุสถานะธุรกรรม (Transaction status is required)"],
      index: true,
    },
    transactionDate: { type: Date, default: Date.now, required: true, index: true },
    processedAt: { type: Date, index: true },
    metadata: { type: Schema.Types.Mixed },
    notes: { type: String, trim: true, maxlength: [2000, "หมายเหตุต้องไม่เกิน 2000 ตัวอักษร"] },
    schemaVersion: { type: Number, default: 1, min: 1 },
  },
  {
    timestamps: true, // createdAt, updatedAt
    collection: "earningtransactions",
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

// Index สำหรับการ query ธุรกรรมของผู้ใช้หลัก, ประเภท, สกุลเงิน, และวันที่
EarningTransactionSchema.index({ primaryUserId: 1, transactionType: 1, currency: 1, transactionDate: -1 }, { name: "UserTransactionQueryIndex" });
// Index สำหรับการ query ธุรกรรมตามประเภท, สถานะ, และวันที่ (สำหรับ Admin หรือระบบ)
EarningTransactionSchema.index({ transactionType: 1, status: 1, transactionDate: -1 }, { name: "SystemTransactionQueryIndex" });
// Index สำหรับการค้นหาตาม Payer หรือ Payee
EarningTransactionSchema.index({ "payer.userId": 1, transactionDate: -1 }, { name: "PayerTransactionIndex", sparse: true });
EarningTransactionSchema.index({ "payee.userId": 1, transactionDate: -1 }, { name: "PayeeTransactionIndex", sparse: true });
// Indexes สำหรับ related IDs เพื่อการ join หรือ lookup ที่รวดเร็ว
EarningTransactionSchema.index({ relatedPurchaseId: 1, status: 1 }, { name: "RelatedPurchaseStatusIndex", sparse: true });
EarningTransactionSchema.index({ relatedDonationId: 1, status: 1 }, { name: "RelatedDonationStatusIndex", sparse: true });
EarningTransactionSchema.index({ relatedPaymentId: 1, status: 1 }, { name: "RelatedPaymentStatusIndex", sparse: true });

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

EarningTransactionSchema.pre<IEarningTransaction>("save", async function (next) {
  // 1. สร้าง transactionReadableId ถ้ายังไม่มี (สำหรับเอกสารใหม่)
  if (this.isNew && !this.transactionReadableId) {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase(); // เพิ่มความยาว suffix
    this.transactionReadableId = `NVM-ETX-${year}${month}${day}-${randomSuffix}`;
  }

  // 2. คำนวณ netAmount ถ้ามี platformFee
  if (this.platformFee && this.platformFee > 0) {
    this.netAmount = this.amount - this.platformFee;
  } else {
    this.netAmount = this.amount;
  }

  // 3. ตั้งค่า processedAt ถ้า status เป็น COMPLETED และยังไม่มี processedAt
  if (this.status === TransactionStatus.COMPLETED && !this.processedAt) {
    this.processedAt = new Date();
  }

  // 4. กำหนด primaryUserId จาก payer หรือ payee ถ้ายังไม่ได้กำหนด
  if (!this.primaryUserId) {
    if (this.payee?.userId) {
      this.primaryUserId = this.payee.userId as Types.ObjectId;
    } else if (this.payer?.userId) {
      this.primaryUserId = this.payer.userId as Types.ObjectId;
    }
  }

  next();
});

// Post-save hook: สำหรับการอัปเดตยอดคงเหลือหรือสถิติอื่นๆ (ควรทำอย่างระมัดระวัง)
EarningTransactionSchema.post<IEarningTransaction>("save", async function (doc, next) {
  // การอัปเดต User.wallet.coins หรือ User.writerProfile.stats ควรทำใน service layer
  // เพื่อควบคุม transaction และหลีกเลี่ยง race conditions.
  // ถ้าจำเป็นต้องทำที่นี่ ต้องมั่นใจว่าเป็น idempotent และจัดการ error ได้ดี.
  // ตัวอย่าง: ถ้าเป็นธุรกรรมที่สำเร็จและเกี่ยวข้องกับเหรียญของผู้ใช้
  if (doc.status === TransactionStatus.COMPLETED && doc.isModified("status")) {
    const UserModel = models.User as mongoose.Model<IUser>;
    
    // กรณีผู้ใช้ซื้อเหรียญ หรือได้รับเหรียญ
    if (doc.transactionType === TransactionType.USER_COIN_BUY_PACKAGE || 
        doc.transactionType === TransactionType.USER_COIN_EARN_FROM_EVENT ||
        doc.transactionType === TransactionType.USER_COIN_EARN_FROM_ACHIEVEMENT ||
        doc.transactionType === TransactionType.ADMIN_ADJUSTMENT_GRANT_COIN) {
      if (doc.payee?.userId && doc.currency === TransactionCurrency.COIN) {
        // await UserModel.findByIdAndUpdate(doc.payee.userId, { $inc: { "wallet.coins": doc.amount } });
        // console.log(`[ETX Post-Save] Increased coin balance for user ${doc.payee.userId} by ${doc.amount}`);
      }
    }
    // กรณีผู้ใช้จ่ายเหรียญ
    else if (doc.transactionType === TransactionType.USER_COIN_SPEND_FOR_EPISODE ||
             doc.transactionType === TransactionType.USER_COIN_SPEND_FOR_DONATION ||
             doc.transactionType === TransactionType.USER_COIN_SPEND_FOR_FEATURE ||
             doc.transactionType === TransactionType.ADMIN_ADJUSTMENT_REVOKE_COIN) {
      if (doc.payer?.userId && doc.currency === TransactionCurrency.COIN) {
        // await UserModel.findByIdAndUpdate(doc.payer.userId, { $inc: { "wallet.coins": -doc.amount } });
        // console.log(`[ETX Post-Save] Decreased coin balance for user ${doc.payer.userId} by ${doc.amount}`);
      }
    }

    // กรณีนักเขียนได้รับเหรียญ
    if ((doc.transactionType === TransactionType.WRITER_COIN_EARN_FROM_EPISODE_SALE ||
        doc.transactionType === TransactionType.WRITER_COIN_EARN_FROM_DONATION ||
        doc.transactionType === TransactionType.WRITER_COIN_EARN_FROM_PLATFORM_BONUS) &&
        doc.payee?.userId && doc.currency === TransactionCurrency.COIN) {
          // await UserModel.findByIdAndUpdate(doc.payee.userId, {
          //   $inc: {
          //     "writerProfile.stats.totalCoinRevenue": doc.amount,
          //     // อาจจะมี field อื่นๆ เช่น "writerProfile.wallet.pendingClearanceCoins"
          //   }
          // });
          // console.log(`[ETX Post-Save] Increased writer coin revenue for user ${doc.payee.userId} by ${doc.amount}`);
    }

    // TODO: จัดการการอัปเดต writer stats สำหรับ real money transactions และการถอนเงิน
  }
  next();
});

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

// ตรวจสอบว่า Model "EarningTransaction" ถูกสร้างไปแล้วหรือยัง ถ้ายัง ให้สร้าง Model ใหม่
const EarningTransactionModel = 
  (models.EarningTransaction as mongoose.Model<IEarningTransaction>) ||
  model<IEarningTransaction>("EarningTransaction", EarningTransactionSchema);

export default EarningTransactionModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Atomicity and Consistency**: การอัปเดตยอดคงเหลือ (User wallet, Writer stats) ควรใช้ MongoDB Transactions
//     (ถ้าใช้ Replica Set) หรือดำเนินการใน service layer ด้วยกลไกที่รับประกัน atomicity เพื่อป้องกันข้อมูลไม่สอดคล้องกัน.
// 2.  **Double-Entry Accounting**: สำหรับระบบการเงินที่ซับซ้อน อาจพิจารณาใช้หลักการบัญชีคู่ (Double-Entry)
//     โดยทุกๆ ธุรกรรมจะมีสองรายการ (Debit และ Credit) เพื่อให้สามารถตรวจสอบความถูกต้องของข้อมูลได้ง่ายขึ้น.
// 3.  **Balance Snapshots**: การเก็บ `balanceBefore` และ `balanceAfter` ในแต่ละ transaction อาจมีประโยชน์สำหรับการ audit
//     แต่จะเพิ่ม overhead ในการเขียน. อาจพิจารณาเก็บเฉพาะธุรกรรมสำคัญ หรือคำนวณยอดคงเหลือ on-the-fly.
// 4.  **Currency Conversion**: หากมีการแปลงสกุลเงิน (เช่น COIN เป็น THB สำหรับการถอนเงินของนักเขียน)
//     ควรบันทึกอัตราแลกเปลี่ยนที่ใช้ในขณะนั้น และจำนวนเงินทั้งสองสกุลใน transaction.
// 5.  **Reporting and Analytics**: Model นี้เป็นพื้นฐานสำคัญสำหรับการสร้างรายงานทางการเงินและการวิเคราะห์ต่างๆ
//     ควรออกแบบ Index ให้รองรับการ query ที่ซับซ้อนสำหรับการทำ report.
// 6.  **Security**: การเข้าถึงและแก้ไข EarningTransaction ควรมีการควบคุมสิทธิ์อย่างเข้มงวด.
// 7.  **Idempotency**: การสร้าง Transaction ควรออกแบบให้เป็น Idempotent เพื่อป้องกันการสร้างซ้ำซ้อน
//     (เช่น จากการ retry ของระบบ หรือการคลิกซ้ำของผู้ใช้).
// 8.  **Transaction Grouping**: สำหรับการดำเนินการที่ประกอบด้วยหลายธุรกรรมย่อย (เช่น การจ่ายเงินให้นักเขียนหลายคนพร้อมกัน)
//     อาจมี `batchId` หรือ `groupId` เพื่อเชื่อมโยงธุรกรรมเหล่านั้นเข้าด้วยกัน.
// ==================================================================================================
