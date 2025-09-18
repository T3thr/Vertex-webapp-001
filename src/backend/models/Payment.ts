// src/backend/models/Payment.ts
// โมเดลการชำระเงิน (Payment Model)
// บันทึกรายละเอียดการทำธุรกรรมการชำระเงินจริง (real-money transactions) และการชำระด้วยเหรียญภายในระบบ
// เช่น การซื้อแพ็กเกจเหรียญ, การสมัครสมาชิก, การบริจาค, หรือการชำระค่าสินค้า/บริการด้วยเหรียญ

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IUser } from "./User"; // สำหรับ userId
import { IPurchase, PurchaseStatus } from "./Purchase"; // สำหรับ purchaseId และการอัปเดตสถานะ Purchase
// import { IDonation } from "./Donation"; // (ถ้ามี Model นี้) สำหรับ donationId
// import { ISubscription } from "./Subscription"; // (ถ้ามี Model นี้) สำหรับ subscriptionId

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Payment
// ==================================================================================================

/**
 * @enum {string} PaymentGateway
 * @description ช่องทางการชำระเงินที่ใช้ (รวมถึงช่องทางภายในระบบ)
 * - `STRIPE`: Stripe Payment Gateway (สำหรับบัตรเครดิต/เดบิต, Apple Pay, Google Pay ผ่าน Stripe)
 * - `PAYPAL`: PayPal Payment Gateway
 * - `OMISE`: Omise Payment Gateway (รองรับ PromptPay, บัตรต่างๆ ในไทย)
 * - `PROMPTPAY_QR`: ชำระเงินผ่าน QR Code โดยตรง (ถ้ามีระบบสร้าง QR เอง)
 * - `BANK_TRANSFER`: การโอนเงินผ่านธนาคาร (มักจะต้องมีการยืนยันด้วยตนเองจากทีมงาน)
 * - `APPLE_PAY_DIRECT`: การผสาน Apple Pay โดยตรง (ไม่ใช่ผ่าน Stripe)
 * - `GOOGLE_PAY_DIRECT`: การผสาน Google Pay โดยตรง
 * - `COIN_WALLET`: ชำระเงินโดยใช้เหรียญภายในแพลตฟอร์ม DivWy (เป็นการชำระเงินภายใน)
 * - `INTERNAL_TEST`: สำหรับการทดสอบภายในระบบ (ไม่ใช้เงินหรือเหรียญจริง)
 * - `OTHER`: ช่องทางอื่นๆ ที่ไม่ได้ระบุไว้
 */
export enum PaymentGateway {
  STRIPE = "stripe",
  PAYPAL = "paypal",
  OMISE = "omise",
  PROMPTPAY_QR = "promptpay_qr",
  BANK_TRANSFER = "bank_transfer",
  APPLE_PAY_DIRECT = "apple_pay_direct",
  GOOGLE_PAY_DIRECT = "google_pay_direct",
  COIN_WALLET = "coin_wallet", // <--- เพิ่มสำหรับชำระด้วยเหรียญในระบบ
  INTERNAL_TEST = "internal_test",
  OTHER = "other",
}

/**
 * @enum {string} PaymentStatus
 * @description สถานะของการชำระเงิน
 * - `PENDING`: รอดำเนินการ (เช่น รอการยืนยันจากผู้ใช้, รอ redirect ไปหน้า gateway, รอผู้ใช้สแกน QR)
 * - `PROCESSING`: กำลังประมวลผล (เช่น payment gateway กำลังตรวจสอบข้อมูลบัตร, รอ webhook จาก gateway)
 * - `REQUIRES_ACTION`: ต้องการการดำเนินการเพิ่มเติมจากผู้ใช้ (เช่น การยืนยัน 3D Secure, การกรอก OTP)
 * - `SUCCEEDED`: การชำระเงินสำเร็จสมบูรณ์
 * - `FAILED`: การชำระเงินล้มเหลว (เช่น บัตรถูกปฏิเสธ, เงินไม่พอ, ข้อมูลไม่ถูกต้อง)
 * - `CANCELLED`: ผู้ใช้ยกเลิกการชำระเงินกลางคัน หรือระบบยกเลิก
 * - `REFUND_PENDING`: กำลังรอการอนุมัติหรือดำเนินการคืนเงินจากทีมงาน/gateway
 * - `REFUNDED`: คืนเงินจากการชำระนี้สำเร็จแล้ว (เต็มจำนวน)
 * - `PARTIALLY_REFUNDED`: คืนเงินบางส่วนจากการชำระนี้สำเร็จแล้ว
 * - `DISPUTED`: มีข้อพิพาทเกี่ยวกับการชำระเงินนี้ (เช่น chargeback จากผู้ถือบัตร)
 * - `EXPIRED`: รายการชำระเงินหมดอายุ (เช่น QR code หมดอายุ, session การชำระเงินหมดเวลา)
 */
export enum PaymentStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  REQUIRES_ACTION = "requires_action",
  SUCCEEDED = "succeeded", // ใช้ SUCCEEDED แทน COMPLETED เพื่อความสอดคล้องกับ gateway ส่วนใหญ่
  FAILED = "failed",
  CANCELLED = "cancelled",
  REFUND_PENDING = "refund_pending",
  REFUNDED = "refunded",
  PARTIALLY_REFUNDED = "partially_refunded",
  DISPUTED = "disputed",
  EXPIRED = "expired",
}

/**
 * @enum {string} PaymentForType
 * @description ระบุว่าการชำระเงินนี้สำหรับวัตถุประสงค์ใด (เชื่อมโยงกับเอกสารใดในระบบ)
 * - `PURCHASE_ORDER`: สำหรับการสั่งซื้อสินค้า/บริการทั่วไป (อ้างอิง Purchase model)
 * - `COIN_TOPUP`: สำหรับการเติมเหรียญเข้า wallet โดยตรง (อาจไม่มี Purchase model แยก, หรือมี Purchase เฉพาะสำหรับเติมเหรียญ)
 * - `SUBSCRIPTION_FEE`: สำหรับค่าธรรมเนียมการสมัครสมาชิกรายเดือน/ปี (อ้างอิง Subscription model)
 * - `DIRECT_DONATION`: สำหรับการบริจาคเงินจริงโดยตรงให้นักเขียนหรือแพลตฟอร์ม (อ้างอิง Donation model)
 * - `PLATFORM_SERVICE_FEE`: สำหรับค่าบริการอื่นๆ ของแพลตฟอร์มที่ผู้ใช้ต้องจ่าย
 * - `WALLET_WITHDRAWAL_FEE`: ค่าธรรมเนียมการถอนเงินจาก wallet (ถ้ามี)
 * - `OTHER`: สำหรับวัตถุประสงค์การชำระเงินอื่นๆ ที่ไม่ระบุชัดเจน
 */
export enum PaymentForType {
  PURCHASE_ORDER = "purchase_order",
  COIN_TOPUP = "coin_topup",
  SUBSCRIPTION_FEE = "subscription_fee",
  DIRECT_DONATION = "direct_donation",
  PLATFORM_SERVICE_FEE = "platform_service_fee",
  WALLET_WITHDRAWAL_FEE = "wallet_withdrawal_fee",
  OTHER = "other",
}

/**
 * @interface IGatewayDetails
 * @description รายละเอียดข้อมูลที่เกี่ยวข้องกับ Payment Gateway หรือช่องทางการชำระเงิน
 * @property {string} [transactionId] - ID ธุรกรรมจาก Payment Gateway (เช่น Stripe Charge ID, PayPal Transaction ID, Omise Charge ID)
 * @property {string} [paymentIntentId] - Payment Intent ID (เช่น จาก Stripe, สำหรับการชำระเงินที่อาจมีหลายขั้นตอน)
 * @property {string} [setupIntentId] - Setup Intent ID (เช่น จาก Stripe, สำหรับการบันทึก payment method สำหรับใช้ในอนาคต)
 * @property {string} [customerId] - Customer ID จาก Payment Gateway (ถ้ามีการสร้าง profile ลูกค้าในระบบ Gateway)
 * @property {string} [invoiceId] - Invoice ID จาก Payment Gateway หรือระบบใบแจ้งหนี้ภายใน (ถ้ามี)
 * @property {Record<string, any>} [rawResponse] - Raw response หรือข้อมูลสำคัญจาก Gateway ที่ต้องการเก็บไว้ (ควรพิจารณาขนาดและความปลอดภัย, อาจเก็บเฉพาะส่วนที่จำเป็น)
 * @property {string} [cardLast4] - เลขบัตรเครดิต 4 ตัวท้าย (ถ้าเป็นการชำระผ่านบัตร)
 * @property {string} [cardBrand] - ยี่ห้อบัตรเครดิต (เช่น Visa, Mastercard, JCB)
 * @property {string} [cardExpiryMonth] - เดือนหมดอายุของบัตร (MM)
 * @property {string} [cardExpiryYear] - ปีหมดอายุของบัตร (YYYY)
 * @property {string} [paymentMethodDetails] - รายละเอียดวิธีการชำระเงินที่ใช้จริง (เช่น "card", "bank_transfer_promptpay", "paypal_account")
 * @property {string} [qrCodeData] - ข้อมูล QR Code (สำหรับ PromptPay หรือการชำระเงินแบบ QR อื่นๆ)
 * @property {string} [bankAccountNumber] - เลขบัญชี (สำหรับการโอนเงิน, ควร hash หรือ mask)
 * @property {string} [bankName] - ชื่อธนาคาร (สำหรับการโอนเงิน)
 */
export interface IGatewayDetails {
  transactionId?: string;
  paymentIntentId?: string;
  setupIntentId?: string;
  customerId?: string;
  invoiceId?: string;
  rawResponse?: Record<string, any>;
  cardLast4?: string;
  cardBrand?: string;
  cardExpiryMonth?: string;
  cardExpiryYear?: string;
  paymentMethodDetails?: string;
  qrCodeData?: string; // สำหรับ QR payment
  bankAccountNumber?: string; // สำหรับ bank transfer
  bankName?: string; // สำหรับ bank transfer
  sessionId?: string; // เพิ่มฟิลด์ sessionId เข้าไป
}
const GatewayDetailsSchema = new Schema<IGatewayDetails>(
  {
    transactionId: { type: String, trim: true, index: true, sparse: true, maxlength: [255, "Gateway Transaction ID ยาวเกินไป"] },
    paymentIntentId: { type: String, trim: true, index: true, sparse: true, maxlength: [255, "Gateway Payment Intent ID ยาวเกินไป"] },
    setupIntentId: { type: String, trim: true, index: true, sparse: true, maxlength: [255, "Gateway Setup Intent ID ยาวเกินไป"] },
    customerId: { type: String, trim: true, sparse: true, maxlength: [255, "Gateway Customer ID ยาวเกินไป"] },
    invoiceId: { type: String, trim: true, sparse: true, maxlength: [255, "Gateway Invoice ID ยาวเกินไป"] },
    rawResponse: { type: Schema.Types.Mixed }, // เก็บ response ดิบจาก gateway (ควรพิจารณาขนาด)
    cardLast4: { type: String, trim: true, match: [/^[0-9]{4}$/, "รูปแบบเลขบัตร 4 ตัวท้ายไม่ถูกต้อง (ต้องเป็นตัวเลข 4 ตัว)"] },
    cardBrand: { type: String, trim: true, maxlength: [50, "ยี่ห้อบัตรยาวเกินไป"] },
    cardExpiryMonth: { type: String, trim: true, match: [/^(0[1-9]|1[0-2])$/, "รูปแบบเดือนหมดอายุไม่ถูกต้อง (MM)"] },
    cardExpiryYear: { type: String, trim: true, match: [/^[0-9]{4}$/, "รูปแบบปีหมดอายุไม่ถูกต้อง (YYYY)"] },
    paymentMethodDetails: { type: String, trim: true, maxlength: [100, "รายละเอียดวิธีการชำระเงินยาวเกินไป"] },
    qrCodeData: { type: String, trim: true, maxlength: [10000, "QR Code Data ยาวเกินไป"] },
    bankAccountNumber: { type: String, trim: true, maxlength: [50, "เลขบัญชีธนาคารยาวเกินไป"] }, // ควรมีการ masking หรือ hashing
    bankName: { type: String, trim: true, maxlength: [100, "ชื่อธนาคารยาวเกินไป"] },
    sessionId: { type: String, trim: true, index: true, sparse: true, maxlength: [255, "Gateway Session ID ยาวเกินไป"] }, // เพิ่มฟิลด์ sessionId เข้าไป
  },
  { _id: false } // ไม่สร้าง _id สำหรับ subdocument นี้
);

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร Payment (IPayment Document Interface)
// ==================================================================================================

/**
 * @interface IPayment
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารการชำระเงินใน Collection "payments"
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสารการชำระเงิน
 * @property {string} paymentReadableId - ID ที่มนุษย์อ่านได้สำหรับการชำระเงิน (เช่น PAY-2024-00001)
 * @property {Types.ObjectId | IUser} userId - ID ของผู้ใช้ที่ทำการชำระเงิน (**จำเป็น**)
 * @property {PaymentForType} paymentForType - ระบุว่าการชำระเงินนี้สำหรับอะไร (เช่น PURCHASE_ORDER, COIN_TOPUP, **จำเป็น**)
 * @property {Types.ObjectId} relatedDocumentId - ID ของเอกสารที่เกี่ยวข้องตาม `paymentForType` (เช่น PurchaseId, SubscriptionId, UserId สำหรับ Coin Topup) - ควรใช้ refPath ในอนาคต
 * @property {string} description - คำอธิบายรายการชำระเงิน (**จำเป็น**, เช่น "ซื้อแพ็กเกจ 500 เหรียญ DivWy", "ค่าสมาชิกรายเดือน DivWy Premium")
 * @property {number} amount - จำนวนเงินที่ชำระ (หน่วยเป็นสกุลเงินจริง เช่น บาท, ดอลลาร์ หรือ "เหรียญ" ถ้าเป็นการชำระด้วยเหรียญ)
 * @property {string} currency - สกุลเงิน (**จำเป็น**, ISO 4217 currency code เช่น "THB", "USD", หรือ "COIN" สำหรับเหรียญในระบบ)
 * @property {number} [feeAmount] - ค่าธรรมเนียมการทำธุรกรรม (ถ้ามี, เช่น ค่าธรรมเนียม gateway และต้องการบันทึกแยก)
 * @property {number} netAmount - จำนวนเงินสุทธิหลังหักค่าธรรมเนียม (คำนวณจาก amount - feeAmount)
 * @property {PaymentGateway} paymentGateway - ช่องทางการชำระเงินที่ใช้ (เช่น STRIPE, PAYPAL, COIN_WALLET, **จำเป็น**)
 * @property {IGatewayDetails} gatewayDetails - รายละเอียดข้อมูลจาก Payment Gateway หรือช่องทางที่ใช้
 * @property {PaymentStatus} status - สถานะการชำระเงิน (PENDING, SUCCEEDED, FAILED, etc. **จำเป็น**)
 * @property {string} [failureCode] - รหัสข้อผิดพลาดจาก Gateway หรือระบบ (ถ้า status เป็น FAILED)
 * @property {string} [failureMessage] - ข้อความแสดงข้อผิดพลาดจาก Gateway หรือระบบ (ถ้า status เป็น FAILED)
 * @property {string} [refundReason] - เหตุผลการคืนเงิน (ถ้ามีการคืนเงิน)
 * @property {Types.ObjectId} [originalPaymentId] - ID ของ Payment เดิม (ถ้า Payment นี้เป็นการคืนเงิน)
 * @property {Date} initiatedAt - วันและเวลาที่เริ่มทำรายการชำระเงิน (เมื่อสร้างเอกสาร Payment, **จำเป็น**)
 * @property {Date} [completedAt] - วันและเวลาที่ชำระเงินสำเร็จ (เมื่อ status เปลี่ยนเป็น SUCCEEDED)
 * @property {Date} [refundedAt] - วันและเวลาที่คืนเงินสำเร็จ (เมื่อ status เปลี่ยนเป็น REFUNDED หรือ PARTIALLY_REFUNDED)
 * @property {Date} [expiresAt] - วันและเวลาที่รายการชำระเงินจะหมดอายุ (เช่น QR code, payment link)
 * @property {Record<string, any>} [metadata] - ข้อมูลเพิ่มเติมอื่นๆ เกี่ยวกับการชำระเงินนี้
 * @property {number} schemaVersion - เวอร์ชันของ schema (สำหรับ migration)
 * @property {Date} createdAt - วันที่สร้างเอกสาร (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตเอกสารล่าสุด (Mongoose `timestamps`)
 */
export interface IPayment extends Document {
  [x: string]: any; // หมายเหตุ: การใช้ [x: string]: any; อาจลดความเข้มงวดของ type checking
  _id: Types.ObjectId;
  paymentReadableId: string;
  userId: Types.ObjectId | IUser;
  paymentForType: PaymentForType;
  relatedDocumentId: Types.ObjectId;
  description: string;
  amount: number;
  currency: string;
  feeAmount?: number;
  netAmount: number;
  paymentGateway: PaymentGateway;
  gatewayDetails: IGatewayDetails;
  status: PaymentStatus;
  failureCode?: string;
  failureMessage?: string;
  refundReason?: string;
  originalPaymentId?: Types.ObjectId; // For refunds
  initiatedAt: Date;
  completedAt?: Date;
  refundedAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  relatedDocument?: any; // Depending on refPath or manual population
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ Payment (PaymentSchema)
// ==================================================================================================
const PaymentSchema = new Schema<IPayment>(
  {
    paymentReadableId: {
      type: String,
      required: [true, "กรุณาระบุ ID ที่อ่านได้ของการชำระเงิน (Readable Payment ID is required)"],
      unique: true,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุ ID ของผู้ใช้ (User ID is required)"],
      index: true,
    },
    paymentForType: {
      type: String,
      enum: Object.values(PaymentForType),
      required: [true, "กรุณาระบุวัตถุประสงค์การชำระเงิน (Payment purpose type is required)"],
      index: true,
    },
    relatedDocumentId: { // ID ของ Purchase, Subscription, User (สำหรับ coin topup), etc.
      type: Schema.Types.ObjectId,
      required: [true, "กรุณาระบุ ID ของเอกสารที่เกี่ยวข้อง (Related document ID is required)"],
      index: true,
      // refPath: "relatedDocumentRefName" // Helper field for dynamic ref
    },
    // relatedDocumentRefName: { type: String, required: true }, // Stores the model name for refPath
    description: {
      type: String,
      required: [true, "กรุณาระบุคำอธิบายรายการ (Description is required)"],
      trim: true,
      maxlength: [500, "คำอธิบายรายการต้องไม่เกิน 500 ตัวอักษร"],
    },
    amount: { // จำนวนเงินเต็มก่อนหักค่าธรรมเนียม
      type: Number,
      required: [true, "กรุณาระบุจำนวนเงิน (Amount is required)"],
      min: [0, "จำนวนเงินต้องไม่ติดลบ (อาจต้องเป็น >0 สำหรับการชำระเงินจริง)"],
    },
    currency: { // THB, USD, หรือ COIN
      type: String,
      required: [true, "กรุณาระบุสกุลเงิน (Currency is required)"],
      trim: true,
      uppercase: true,
      maxlength: [10, "สกุลเงินไม่ถูกต้อง (เช่น THB, USD, COIN)"],
    },
    feeAmount: { type: Number, min: 0, default: 0 }, // ค่าธรรมเนียมที่ถูกหักโดย gateway หรือ platform
    netAmount: { // amount - feeAmount
      type: Number,
      required: [true, "กรุณาระบุจำนวนเงินสุทธิ (Net amount is required)"],
      min: [0, "จำนวนเงินสุทธิต้องไม่ติดลบ"]
    },
    paymentGateway: {
      type: String,
      enum: Object.values(PaymentGateway),
      required: [true, "กรุณาระบุช่องทางการชำระเงิน (Payment gateway is required)"],
      index: true,
    },
    gatewayDetails: { type: GatewayDetailsSchema },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      required: [true, "กรุณาระบุสถานะการชำระเงิน (Payment status is required)"],
      index: true,
    },
    failureCode: { type: String, trim: true, maxlength: [100, "รหัสข้อผิดพลาดต้องไม่เกิน 100 ตัวอักษร"] },
    failureMessage: { type: String, trim: true, maxlength: [1000, "ข้อความแสดงข้อผิดพลาดต้องไม่เกิน 1000 ตัวอักษร"] },
    refundReason: { type: String, trim: true, maxlength: [1000, "เหตุผลการคืนเงินต้องไม่เกิน 1000 ตัวอักษร"] },
    originalPaymentId: { type: Schema.Types.ObjectId, ref: "Payment", index: true, sparse: true }, // ถ้าเป็นการคืนเงิน
    initiatedAt: { type: Date, default: Date.now, required: true },
    completedAt: { type: Date, index: true }, // ตั้งเมื่อ status เป็น SUCCEEDED
    refundedAt: { type: Date, index: true }, // ตั้งเมื่อ status เป็น REFUNDED / PARTIALLY_REFUNDED
    expiresAt: { type: Date, index: true }, // สำหรับ payment link หรือ QR code ที่มีวันหมดอายุ
    metadata: { type: Schema.Types.Mixed },
    schemaVersion: { type: Number, default: 1, min: 1, required: true },
  },
  {
    timestamps: true, // createdAt, updatedAt
    collection: "payments", // ชื่อ collection ใน MongoDB
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

// ==================================================================================================
// SECTION: Virtuals (ฟิลด์เสมือน)
// ==================================================================================================

// Virtual field 'relatedDocument' สำหรับ dynamic population
PaymentSchema.virtual("relatedDocument", {
  ref: function (this: IPayment) { // ใช้ function() ปกติเพื่อให้ this ชี้ไปที่ document
    switch (this.paymentForType) {
      case PaymentForType.PURCHASE_ORDER:
        return "Purchase"; // ชื่อ Model ที่จะ reference
      case PaymentForType.SUBSCRIPTION_FEE:
        return "Subscription"; // สมมติมี Model Subscription
      case PaymentForType.DIRECT_DONATION:
        return "Donation"; // สมมติมี Model Donation
      case PaymentForType.COIN_TOPUP:
        return "User"; // ถ้าการเติมเหรียญอ้างอิง User ID โดยตรงใน relatedDocumentId
      default:
        // console.warn(`[Payment Virtual] Unknown paymentForType for dynamic ref: ${this.paymentForType}`);
        return undefined;
    }
  },
  localField: "relatedDocumentId", // field ใน PaymentSchema นี้
  foreignField: "_id", // field ใน Model ที่จะ reference (ปกติคือ _id)
  justOne: true, // คาดหวังผลลัพธ์เดียว
});

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

PaymentSchema.index({ userId: 1, status: 1, createdAt: -1 }, { name: "UserPaymentStatusDateIndex" });
// Unique index สำหรับ transactionId จาก gateway (sparse เพราะอาจไม่มีค่าเสมอไป)
// แก้ไขเพื่อป้องกัน duplicate key error เมื่อ transactionId เป็น null
PaymentSchema.index(
  { "gatewayDetails.transactionId": 1, paymentGateway: 1 }, 
  { 
    name: "GatewayTransactionUniqueIndex", 
    unique: true, 
    sparse: true,
    partialFilterExpression: { "gatewayDetails.transactionId": { $exists: true, $ne: null } }
  }
);
PaymentSchema.index(
  { "gatewayDetails.paymentIntentId": 1, paymentGateway: 1 }, 
  { 
    name: "GatewayPaymentIntentUniqueIndex", 
    unique: true, 
    sparse: true,
    partialFilterExpression: { "gatewayDetails.paymentIntentId": { $exists: true, $ne: null } }
  }
);

// แก้ไข: Partial Index สำหรับ Succeeded Payments
// Index 'status: 1' หมายถึงการเรียงตาม status (ถ้า query มีการ sort หรือ range scan บน status ภายในกลุ่มที่ filter แล้ว)
// partialFilterExpression จะกรองให้ Index นี้สร้างเฉพาะ document ที่ status เป็น SUCCEEDED
PaymentSchema.index(
  { relatedDocumentId: 1, paymentForType: 1, status: 1 }, // Fields to index
  { 
    name: "SucceededPaymentForRelatedDocumentIndex",
    partialFilterExpression: { status: PaymentStatus.SUCCEEDED } // Condition for partial index
  }
);

PaymentSchema.index({ status: 1, paymentGateway: 1, createdAt: -1 }, { name: "PaymentStatusGatewayDateIndex" });

// แก้ไข: Partial Index สำหรับ Pending Payments ที่มีวันหมดอายุ
// Index 'status: 1' เพื่อประสิทธิภาพในการ query status ภายในกลุ่มที่ filter แล้ว
PaymentSchema.index(
  { expiresAt: 1, status: 1 }, // Fields to index
  { 
    name: "PendingPaymentExpiryIndex", // สำหรับตรวจสอบรายการที่หมดอายุ
    partialFilterExpression: { status: PaymentStatus.PENDING, expiresAt: { $exists: true } } // Condition
  }
);

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

PaymentSchema.pre<IPayment>("save", async function (next) {
  // 1. สร้าง paymentReadableId ถ้าเป็นเอกสารใหม่และยังไม่มีค่า
  if (this.isNew && !this.paymentReadableId) {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const randomSuffix = new Types.ObjectId().toHexString().slice(-6).toUpperCase();
    this.paymentReadableId = `NVM-PAY-${year}${month}${day}-${randomSuffix}`;
  }

  // 2. คำนวณ netAmount โดยอัตโนมัติ
  this.netAmount = this.amount - (this.feeAmount || 0);

  // 3. ตั้งค่า timestamps ต่างๆ ตามการเปลี่ยนแปลงของ status
  if (this.isModified("status")) {
    if (this.status === PaymentStatus.SUCCEEDED && !this.completedAt) {
      this.completedAt = new Date();
    }
    // ถ้ามีการคืนเงิน (ทั้งเต็มจำนวนหรือบางส่วน) และยังไม่ได้ตั้ง refundedAt
    if ((this.status === PaymentStatus.REFUNDED || this.status === PaymentStatus.PARTIALLY_REFUNDED) && !this.refundedAt) {
      this.refundedAt = new Date();
    }
  }
  next();
});

// Post-save hook สำหรับการดำเนินการหลังจากการชำระเงิน (สถานะมีการเปลี่ยนแปลง)
PaymentSchema.post<IPayment>("save", async function (doc, next) {
  // ตรวจสอบว่า status เพิ่งเปลี่ยนเป็น SUCCEEDED ใน operation นี้
  const statusChangedToSucceeded = doc.isModified("status") && doc.status === PaymentStatus.SUCCEEDED;
  // $__.priorDoc อาจไม่มีถ้าไม่ได้ query มาด้วย option หรือเป็น Mongoose version ที่จัดการต่างไป
  // การตรวจสอบ priorDoc ช่วยให้มั่นใจว่า status *เพิ่งจะ* เปลี่ยนเป็น SUCCEEDED จริงๆ
  const isJustSucceeded = statusChangedToSucceeded && (doc.$__.priorDoc ? doc.$__.priorDoc.status !== PaymentStatus.SUCCEEDED : true);


  if (isJustSucceeded) {
    try {
      // กรณีที่ 1: การชำระเงินสำหรับ Purchase Order
      if (doc.paymentForType === PaymentForType.PURCHASE_ORDER && doc.relatedDocumentId) {
        const purchase = await models.Purchase.findById(doc.relatedDocumentId) as IPurchase | null;
        // ตรวจสอบว่า purchase ยังไม่ completed เพื่อป้องกันการทำงานซ้ำ
        if (purchase && purchase.status !== PurchaseStatus.COMPLETED) {
          // อัปเดต Purchase status เป็น COMPLETED และผูก paymentId
          purchase.status = PurchaseStatus.COMPLETED; // ใช้ enum member
          purchase.paymentId = doc._id;
          purchase.purchasedAt = doc.completedAt || new Date(); // ใช้เวลาที่ payment สำเร็จ
          await purchase.save(); // การ save นี้จะ trigger post-save hook ของ Purchase model อีกที
          console.log(`[Payment Hook] Updated Purchase ${purchase._id} to COMPLETED due to successful payment ${doc._id}`);
        } else if (purchase && purchase.status === PurchaseStatus.COMPLETED) {
            console.log(`[Payment Hook] Purchase ${purchase._id} is already COMPLETED. No update needed from payment ${doc._id}.`);
        } else {
            console.warn(`[Payment Hook] Purchase order ${doc.relatedDocumentId} not found for payment ${doc._id}.`);
        }
      }

      // กรณีที่ 2: การเติมเหรียญโดยตรง (Coin Top-up)
      if (doc.paymentForType === PaymentForType.COIN_TOPUP && models.User) {
        // สมมติว่า `doc.metadata.coinsToGrant` หรือ `doc.amount` (ถ้า currency เป็น COIN)
        // คือจำนวนเหรียญที่จะได้รับ. Logic นี้ต้องชัดเจนและปลอดภัย
        // ตัวอย่าง: ถ้า metadata.coinsToGrant มีค่า ให้ใช้ค่านั้น
        const coinsToGrant = doc.metadata?.coinsToGrant || 0; // ควรมีการ validate ค่านี้
        if (coinsToGrant > 0) {
          await models.User.findByIdAndUpdate(doc.userId, { $inc: { "wallet.coins": coinsToGrant } });
          console.log(`[Payment Hook] User ${doc.userId} topped up ${coinsToGrant} coins via payment ${doc._id}`);
          // สร้าง EarningTransaction สำหรับการเติมเหรียญ (ถ้ามี model EarningTransaction)
          if (models.EarningTransaction) { // ตรวจสอบว่า model EarningTransaction มีอยู่จริง
            await models.EarningTransaction.create({
              userId: doc.userId,
              transactionType: "COIN_TOPUP_SUCCESS", // ประเภทธุรกรรม: เติมเหรียญสำเร็จ
              amount: coinsToGrant, // จำนวนเหรียญที่ได้รับ
              currency: "COIN", // สกุลเงินเป็นเหรียญ
              description: `เติมเหรียญ ${coinsToGrant} เหรียญ (การชำระเงิน: ${doc.paymentReadableId})`,
              relatedPaymentId: doc._id,
              transactionDate: doc.completedAt || new Date(),
              status: "COMPLETED" // สถานะของ EarningTransaction (สมมติว่ามี field นี้)
            });
          }
        } else {
            console.warn(`[Payment Hook] Coin top-up for payment ${doc._id} has no coinsToGrant or amount is zero.`);
        }
      }
      
      // TODO: จัดการกรณีอื่นๆ เช่น SUBSCRIPTION_FEE, DIRECT_DONATION ตาม business logic ที่ออกแบบไว้

      // (Optional) ส่ง Notification การชำระเงินสำเร็จให้ผู้ใช้
      if (models.Notification) { // ตรวจสอบว่า model Notification มีอยู่จริง
        await models.Notification.create({
          userId: doc.userId,
          type: "PAYMENT_SUCCEEDED",
          title: "การชำระเงินสำเร็จ",
          message: `การชำระเงินหมายเลข ${doc.paymentReadableId} จำนวน ${doc.amount} ${doc.currency} ของคุณสำหรับ "${doc.description}" สำเร็จแล้ว ขอบคุณที่ใช้บริการ DivWy!`,
          data: { paymentId: doc._id, paymentReadableId: doc.paymentReadableId, amount: doc.amount, currency: doc.currency, paymentFor: doc.paymentForType, description: doc.description },
          isRead: false,
        });
      }

    } catch (error) {
      console.error(`[Payment Post-Save Hook Error] Payment ID ${doc._id} (status: ${doc.status}):`, error);
      // การจัดการข้อผิดพลาด: ควรมีระบบแจ้งเตือน admin, logging ที่ดี,
      // และพิจารณากลไก rollback หรือตั้งค่า status ของ payment/purchase เป็น FAILED_POST_PROCESSING
      // หรือใช้ dead-letter queue สำหรับ retry การดำเนินการเหล่านี้.
      // การโยน error ออกไปจาก hook อาจทำให้ save operation ล้มเหลวทั้งหมด ถ้าไม่ต้องการแบบนั้น ต้อง handle ภายใน hook.
    }
  }
  next();
});

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

const PaymentModel =
  (models.Payment as mongoose.Model<IPayment>) ||
  model<IPayment>("Payment", PaymentSchema);

export default PaymentModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Dynamic Referencing for relatedDocumentId**: ใช้ `refPath` (และ field ช่วย `relatedDocumentRefName`)
//     เพื่ออ้างอิง Model (Purchase, Subscription, User, etc.) ตาม `paymentForType` จะช่วยให้ populate ได้ถูกต้องและยืดหยุ่น.
// 2.  **Security (PCI DSS Compliance)**: การจัดการข้อมูลการชำระเงินเป็นเรื่องละเอียดอ่อน.
//     ห้ามเก็บข้อมูลบัตรเครดิตเต็มรูปแบบ (PAN, CVV) โดยตรงในฐานข้อมูล. ควรใช้ Tokenization จาก Payment Gateway.
//     `gatewayDetails` ควรเก็บเฉพาะข้อมูลที่ปลอดภัยและจำเป็น (เช่น last4, brand, transaction_id).
// 3.  **Webhook Handling from Payment Gateways**: การอัปเดตสถานะ Payment (SUCCEEDED, FAILED)
//     ควรทำผ่าน Webhook จาก Payment Gateway เป็นหลัก เพื่อความถูกต้องและ Real-time. Logic ใน post-save hook อาจเป็นส่วนเสริม.
//     Webhook handler ต้องมีความปลอดภัย (verify signature) และเป็น Idempotent.
// 4.  **Idempotency**: การดำเนินการใน post-save hook และ Webhook handler (ให้สิทธิ์, เพิ่มเหรียญ) ควรเป็น Idempotent
//     เพื่อป้องกันการทำงานซ้ำ (เช่น user refresh หน้า, gateway ส่ง webhook ซ้ำ).
// 5.  **Error Handling, Logging, and Alerting**: ระบบจัดการข้อผิดพลาด, logging ที่ละเอียด, และการแจ้งเตือน admin
//     เมื่อเกิดปัญหาในการประมวลผล payment หรือ post-payment actions มีความสำคัญอย่างยิ่ง.
// 6.  **Currency Precision and Decimal Type**: สำหรับ `amount`, `feeAmount`, `netAmount` ที่เป็นเงินจริง,
//     ควรพิจารณาใช้ Decimal type (เช่น `mongoose-decimal128`) แทน `Number` เพื่อหลีกเลี่ยงปัญหา Floating-point precision.
// 7.  **MongoDB Transactions**: สำหรับการดำเนินการที่ต้องการ Atomicity (เช่น อัปเดต Payment, Purchase, User Wallet พร้อมกัน)
//     ควรใช้ MongoDB Transactions (เมื่อใช้ Replica Set) เพื่อรับประกันความสอดคล้องของข้อมูล.
// 8.  **Refund Workflow**: การคืนเงิน (Refunds) มีกระบวนการที่ซับซ้อน (ขอคืน, อนุมัติ, คืนเงินผ่าน gateway, อัปเดต status, ยกเลิกสิทธิ์)
//     ควรมีการออกแบบที่ดีและทดสอบอย่างละเอียด. `originalPaymentId` ช่วยในการติดตาม.
// 9.  **Audit Trail**: บันทึกการเปลี่ยนแปลงที่สำคัญทั้งหมดของ Payment document เพื่อการตรวจสอบ (Auditing).
// 10. **User Experience**: แจ้งสถานะการชำระเงินให้ผู้ใช้ทราบอย่างชัดเจนในทุกขั้นตอน.
// 11. **Consistency of `doc.$__.priorDoc`**: การเข้าถึง `doc.$__.priorDoc` ใน `post('save')` hook อาจไม่แน่นอนเสมอไป
//     ขึ้นอยู่กับ Mongoose version และวิธีการเรียก save (เช่น `findByIdAndUpdate` อาจมีพฤติกรรมต่าง).
//     วิธีที่ robust กว่าในการตรวจสอบ "การเปลี่ยนแปลงสถานะ" คือการ query document เก่าใน `pre('save')` hook
//     หรือจัดการ state change logic ใน service layer ก่อนเรียก Mongoose save/update.
// ==================================================================================================