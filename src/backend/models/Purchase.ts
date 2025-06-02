// src/backend/models/Purchase.ts
// โมเดลการซื้อ (Purchase Model) - อัปเกรดสำหรับแพลตฟอร์ม DivWy
// บันทึกรายการซื้อต่างๆ ภายในแพลตฟอร์ม เช่น การซื้อตอนนิยาย, การซื้อเหรียญ, การสมัครสมาชิก
// อัปเกรดจาก Purchase.ts เดิม โดยเพิ่มรายละเอียด, Type Safety, คอมเมนต์ภาษาไทย, Indexes, และปรับปรุงตามมาตรฐาน DivWy

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IUser } from "./User"; // สำหรับ userId
// แก้ไข: import PaymentGateway และ PaymentStatus (พร้อม alias) จาก Payment.ts
import { IPayment, PaymentGateway, PaymentStatus as ExternalPaymentStatus } from "./Payment"; // สำหรับ paymentId และการตรวจสอบ payment method/status
import { INovel } from "./Novel"; // สำหรับ itemType = NOVEL_BUNDLE
import { IEpisode } from "./Episode"; // สำหรับ itemType = NOVEL_EPISODE
// import { ICoinPackage } from "./CoinPackage"; // (สมมติว่ามี Model นี้) สำหรับ itemType = COIN_PACKAGE
// import { ISubscriptionPlan } from "./SubscriptionPlan"; // (สมมติว่ามี Model นี้) สำหรับ itemType = SUBSCRIPTION

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Purchase
// ==================================================================================================

/**
 * @enum {string} PurchaseItemType
 * @description ประเภทของสินค้าหรือบริการที่ซื้อ
 * - `NOVEL_EPISODE`: ซื้อตอนของนิยาย
 * - `NOVEL_BUNDLE`: ซื้อนิยายทั้งเรื่อง (ถ้ามี bundle) หรือหลายตอนพร้อมกัน
 * - `COIN_PACKAGE`: ซื้อแพ็กเกจเหรียญ (สกุลเงินในแพลตฟอร์ม)
 * - `SUBSCRIPTION`: สมัครสมาชิกรายเดือน/รายปี เพื่อรับสิทธิประโยชน์ต่างๆ
 * - `FEATURE_ACCESS`: ซื้อสิทธิ์การเข้าถึงฟีเจอร์พิเศษแบบครั้งเดียวหรือถาวร
 * - `DIGITAL_GOOD`: ซื้อสินค้าดิจิทัลอื่นๆ (เช่น artbook, soundtrack, ธีมพิเศษ)
 * - `DONATION`: การบริจาคให้นักเขียน/แพลตฟอร์มโดยตรง
 * - `OTHER`: รายการซื้ออื่นๆ ที่ไม่เข้าข่ายข้างต้น
 */
export enum PurchaseItemType {
  NOVEL_EPISODE = "novel_episode",
  NOVEL_BUNDLE = "novel_bundle",
  COIN_PACKAGE = "coin_package",
  SUBSCRIPTION = "subscription",
  FEATURE_ACCESS = "feature_access",
  DIGITAL_GOOD = "digital_good",
  DONATION = "donation",
  OTHER = "other",
}

/**
 * @enum {string} PurchaseStatus
 * @description สถานะของการซื้อ
 * - `PENDING`: รอดำเนินการ (เช่น รอการชำระเงินจากผู้ใช้, รอการยืนยันสินค้าในสต็อก)
 * - `PROCESSING`: กำลังดำเนินการ (เช่น ระบบกำลังตรวจสอบการชำระเงิน, เตรียมสินค้า)
 * - `COMPLETED`: การซื้อสำเร็จสมบูรณ์ (ผู้ใช้ได้รับสินค้า/บริการแล้ว)
 * - `FAILED`: การซื้อล้มเหลว (เช่น การชำระเงินถูกปฏิเสธ, สินค้าหมด)
 * - `REFUND_PENDING`: กำลังรอการอนุมัติคืนเงินจากทีมงาน
 * - `REFUNDED`: ได้รับการคืนเงินจากการซื้อนี้แล้ว (เต็มจำนวน)
 * - `PARTIALLY_REFUNDED`: ได้รับการคืนเงินบางส่วนจากการซื้อนี้
 * - `CANCELLED`: การซื้อถูกยกเลิก (โดยผู้ใช้ก่อนการชำระเงิน หรือโดยระบบเนื่องจากเหตุผลต่างๆ)
 * - `EXPIRED`: การซื้อหมดอายุ (เช่น สำหรับการจองสินค้า/บริการที่ไม่ได้ชำระเงินภายในเวลาที่กำหนด)
 */
export enum PurchaseStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  REFUND_PENDING = "refund_pending",
  REFUNDED = "refunded",
  PARTIALLY_REFUNDED = "partially_refunded",
  CANCELLED = "cancelled",
  EXPIRED = "expired",
}

/**
 * @interface IPurchaseItem
 * @description รายละเอียดของแต่ละรายการสินค้าในการซื้อ
 * @property {Types.ObjectId} itemId - ID ของสิ่งที่ซื้อ (เช่น EpisodeId, CoinPackageId, SubscriptionPlanId) - ควรใช้ refPath เพื่อ dynamic reference ในอนาคต
 * @property {PurchaseItemType} itemType - ประเภทของสิ่งที่ซื้อ
 * @property {string} title - ชื่อของสิ่งที่ซื้อ (เช่น "ตอนที่ 5: การผจญภัยเริ่มขึ้น", "แพ็กเกจ 100 เหรียญ DivWy") - ควรดึงมาจากข้อมูลสินค้าจริง
 * @property {string} [description] - คำอธิบายเพิ่มเติมของสินค้าที่ซื้อ
 * @property {number} quantity - จำนวนที่ซื้อ (ปกติเป็น 1 สำหรับตอนนิยาย, อาจมากกว่า 1 สำหรับสินค้าอื่นๆ)
 * @property {number} unitPrice - ราคาต่อหน่วย (อาจเป็น "เหรียญ" หรือสกุลเงินหลักของแพลตฟอร์ม เช่น THB, USD)
 * @property {string} currency - สกุลเงินที่ใช้สำหรับ unitPrice (เช่น "COIN", "THB", "USD") - ควรเป็นมาตรฐาน ISO 4217 สำหรับเงินจริง
 * @property {number} [discountAmount] - จำนวนเงินส่วนลดสำหรับรายการสินค้านี้ (ถ้ามี)
 * @property {number} subtotal - ราคารวมของรายการนี้หลังหักส่วนลด (คำนวณจาก quantity * unitPrice - discountAmount)
 * @property {Types.ObjectId} [sellerId] - ID ของผู้ขาย (เช่น AuthorId สำหรับการซื้อตอนนิยาย, หรือ null ถ้าเป็นสินค้าของแพลตฟอร์มเอง)
 * @property {Record<string, any>} [metadata] - ข้อมูลเพิ่มเติมเฉพาะของรายการที่ซื้อ (เช่น ระยะเวลาการสมัครสมาชิก, attribute ของ digital good)
 */
export interface IPurchaseItem {
  itemId: Types.ObjectId;
  itemType: PurchaseItemType;
  title: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  discountAmount?: number;
  subtotal: number;
  sellerId?: Types.ObjectId; // Ref to User (Author) or Platform
  metadata?: Record<string, any>;
}
const PurchaseItemSchema = new Schema<IPurchaseItem>(
  {
    itemId: {
      type: Schema.Types.ObjectId,
      required: [true, "กรุณาระบุ ID ของสินค้า (Item ID is required)"],
      // refPath: "itemTypeRef" // Dynamic reference based on itemType, will require itemTypeRef field
    },
    // itemTypeRef: { type: String, required: true }, // Helper for refPath, stores model name string
    itemType: {
      type: String,
      enum: Object.values(PurchaseItemType),
      required: [true, "กรุณาระบุประเภทของสินค้า (Item type is required)"],
    },
    title: {
      type: String,
      required: [true, "กรุณาระบุชื่อสินค้า (Item title is required)"],
      trim: true,
      maxlength: [255, "ชื่อสินค้าต้องไม่เกิน 255 ตัวอักษร"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "คำอธิบายสินค้าต้องไม่เกิน 1000 ตัวอักษร"]
    },
    quantity: {
      type: Number,
      required: [true, "กรุณาระบุจำนวน (Quantity is required)"],
      min: [1, "จำนวนต้องอย่างน้อย 1"],
      default: 1
    },
    unitPrice: {
      type: Number,
      required: [true, "กรุณาระบุราคาต่อหน่วย (Unit price is required)"],
      min: [0, "ราคาต่อหน่วยต้องไม่ติดลบ"]
    },
    currency: {
      type: String,
      required: [true, "กรุณาระบุสกุลเงิน (Currency is required)"],
      trim: true,
      uppercase: true, // THB, USD, COIN
      maxlength: [10, "สกุลเงินต้องไม่เกิน 10 ตัวอักษร"]
    },
    discountAmount: { type: Number, min: 0, default: 0 },
    subtotal: {
      type: Number,
      required: [true, "กรุณาระบุยอดรวมของรายการ (Subtotal is required)"],
      min: [0, "ยอดรวมของรายการต้องไม่ติดลบ"]
    },
    sellerId: { type: Schema.Types.ObjectId, ref: "User", index: true, sparse: true }, // sparse ถ้าไม่ใช่ทุก item มี seller
    metadata: { type: Schema.Types.Mixed }, // ข้อมูลเพิ่มเติมยืดหยุ่นได้
  },
  { _id: false } // ไม่สร้าง _id สำหรับ subdocument นี้
);

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร Purchase (IPurchase Document Interface)
// ==================================================================================================

/**
 * @interface IPurchase
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารการซื้อใน Collection "purchases"
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสารการซื้อ
 * @property {string} purchaseReadableId - ID ที่มนุษย์อ่านได้สำหรับการซื้อ (เช่น INV-2024-00001) - สร้างขึ้นเพื่อความสะดวกในการอ้างอิง
 * @property {Types.ObjectId | IUser} userId - ID ของผู้ใช้ที่ทำการซื้อ (**จำเป็น**, อ้างอิง User model)
 * @property {Types.DocumentArray<IPurchaseItem>} items - รายการสินค้าที่ซื้อ (**จำเป็น**, ต้องมีอย่างน้อย 1 รายการ)
 * @property {number} totalAmount - ราคารวมทั้งหมดของสินค้าทุกรายการก่อนส่วนลดและภาษี (คำนวณจาก sum of (item.quantity * item.unitPrice))
 * @property {number} [totalDiscountAmount] - ส่วนลดรวมทั้งหมดสำหรับการซื้อนี้ (คำนวณจาก sum of item.discountAmount)
 * @property {number} [taxAmount] - ภาษีรวม (ถ้ามี, เช่น VAT)
 * @property {number} finalAmount - ราคาสุทธิที่ผู้ใช้ต้องชำระ (totalAmount - totalDiscountAmount + taxAmount)
 * @property {string} finalCurrency - สกุลเงินที่ใช้สำหรับ finalAmount (ควรสอดคล้องกับ currency ใน items หรือ payment)
 * @property {Types.ObjectId | IPayment} [paymentId] - ID ของรายการชำระเงิน (อ้างอิง Payment model, ถ้าการซื้อนี้มีการชำระเงินผ่านระบบ payment)
 * @property {PurchaseStatus} status - สถานะการซื้อ (PENDING, COMPLETED, FAILED, etc. **จำเป็น**)
 * @property {string} [failureReason] - เหตุผลที่การซื้อล้มเหลว (ถ้า status เป็น FAILED)
 * @property {string} [cancellationReason] - เหตุผลที่การซื้อถูกยกเลิก (ถ้า status เป็น CANCELLED)
 * @property {Date} [purchasedAt] - วันและเวลาที่ทำการซื้อสำเร็จ (เมื่อ status เปลี่ยนเป็น COMPLETED)
 * @property {Date} [refundedAt] - วันที่และเวลาที่คืนเงินสำเร็จ (ถ้ามีการคืนเงิน)
 * @property {string} [ipAddress] - IP Address ของผู้ใช้ขณะทำการซื้อ (เพื่อความปลอดภัยและการตรวจสอบ)
 * @property {string} [userAgent] - User Agent ของ client ที่ผู้ใช้ใช้ขณะทำการซื้อ
 * @property {Record<string, any>} [metadata] - ข้อมูลเพิ่มเติมอื่นๆ เกี่ยวกับการซื้อทั้งหมด (เช่น promotion code ที่ใช้, ghi chú พิเศษ)
 * @property {number} schemaVersion - เวอร์ชันของ schema (สำหรับ migration ในอนาคต)
 * @property {Date} createdAt - วันที่สร้างเอกสาร (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตเอกสารล่าสุด (Mongoose `timestamps`)
 */
export interface IPurchase extends Document {
  [x: string]: any; // อนุญาตให้มี property อื่นๆ เพิ่มเติมได้ (ควรระมัดระวังการใช้งาน)
  _id: Types.ObjectId;
  purchaseReadableId: string;
  userId: Types.ObjectId | IUser;
  items: Types.DocumentArray<IPurchaseItem>;
  totalAmount: number;
  totalDiscountAmount?: number;
  taxAmount?: number;
  finalAmount: number;
  finalCurrency: string;
  paymentId?: Types.ObjectId | IPayment;
  status: PurchaseStatus;
  failureReason?: string;
  cancellationReason?: string;
  purchasedAt?: Date;
  refundedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ Purchase (PurchaseSchema)
// ==================================================================================================
const PurchaseSchema = new Schema<IPurchase>(
  {
    purchaseReadableId: {
      type: String,
      required: [true, "กรุณาระบุ ID ที่อ่านได้ของการซื้อ (Readable Purchase ID is required)"],
      unique: true,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุ ID ของผู้ใช้ (User ID is required)"],
      index: true,
    },
    items: {
      type: [PurchaseItemSchema],
      required: [true, "กรุณาระบุรายการสินค้า (Items are required)"],
      validate: [
        (v: IPurchaseItem[]) => Array.isArray(v) && v.length > 0,
        "ต้องมีอย่างน้อย 1 รายการสินค้าในการซื้อ (At least one item is required in a purchase)",
      ],
    },
    totalAmount: {
      type: Number,
      required: [true, "กรุณาระบุยอดรวม (Total amount is required)"],
      min: [0, "ยอดรวมต้องไม่ติดลบ"]
    },
    totalDiscountAmount: { type: Number, min: 0, default: 0 },
    taxAmount: { type: Number, min: 0, default: 0 }, // ควรคำนวณตามกฎหมายภาษี
    finalAmount: {
      type: Number,
      required: [true, "กรุณาระบุยอดสุทธิ (Final amount is required)"],
      min: [0, "ยอดสุทธิต้องไม่ติดลบ"]
    },
    finalCurrency: {
      type: String,
      required: [true, "กรุณาระบุสกุลเงินสุทธิ (Final currency is required)"],
      trim: true,
      uppercase: true,
      maxlength: [10, "สกุลเงินสุทธิต้องไม่เกิน 10 ตัวอักษร"]
    },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", index: true, sparse: true }, // sparse ถ้าไม่ใช่ทุก purchase มี payment (เช่น free item)
    status: {
      type: String,
      enum: Object.values(PurchaseStatus),
      default: PurchaseStatus.PENDING,
      required: [true, "กรุณาระบุสถานะการซื้อ (Purchase status is required)"],
      index: true,
    },
    failureReason: {
      type: String,
      trim: true,
      maxlength: [500, "เหตุผลที่ล้มเหลวต้องไม่เกิน 500 ตัวอักษร"]
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [500, "เหตุผลที่ยกเลิกต้องไม่เกิน 500 ตัวอักษร"]
    },
    purchasedAt: { type: Date, index: true },
    refundedAt: { type: Date, index: true },
    ipAddress: { type: String, trim: true, maxlength: [45, "IP Address ยาวเกินไป (รองรับ IPv6)"] },
    userAgent: { type: String, trim: true, maxlength: [500, "User Agent ยาวเกินไป"] },
    metadata: { type: Schema.Types.Mixed },
    schemaVersion: { type: Number, default: 1, min: 1, required: true },
  },
  {
    timestamps: true, // createdAt, updatedAt
    collection: "purchases", // ชื่อ collection ใน MongoDB
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

// ==================================================================================================
// SECTION: Virtuals (ฟิลด์เสมือน) - (ตัวอย่าง, ยังไม่ได้ใช้งานจริง)
// ==================================================================================================
// PurchaseItemSchema.virtual("itemDetail", {
//   ref: function (this: IPurchaseItem) { // ใช้ function() ปกติเพื่อให้ this ชี้ไปที่ document
//     switch (this.itemType) {
//       case PurchaseItemType.NOVEL_EPISODE: return "Episode";
//       case PurchaseItemType.NOVEL_BUNDLE: return "Novel";
//       case PurchaseItemType.COIN_PACKAGE: return "CoinPackage"; // สมมติมี Model CoinPackage
//       case PurchaseItemType.SUBSCRIPTION: return "SubscriptionPlan"; // สมมติมี Model SubscriptionPlan
//       default: return undefined;
//     }
//   },
//   localField: "itemId",
//   foreignField: "_id",
//   justOne: true,
// });


// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

PurchaseSchema.index({ userId: 1, status: 1, createdAt: -1 }, { name: "UserPurchaseStatusDateIndex" });

// แก้ไข: ย้ายเงื่อนไข status: PurchaseStatus.COMPLETED ไปที่ partialFilterExpression
// Index นี้จะใช้สำหรับค้นหาสินค้า (items) ที่ถูกซื้อและมีสถานะ "COMPLETED"
PurchaseSchema.index(
  { "items.itemId": 1, "items.itemType": 1 }, // ฟิลด์ที่ต้องการ Index สำหรับการค้นหา item ภายใน purchase ที่ completed
  {
    name: "CompletedPurchaseItemLookupIndex",
    partialFilterExpression: { status: PurchaseStatus.COMPLETED } // สร้าง Index เฉพาะ document ที่ status เป็น COMPLETED
  }
);

PurchaseSchema.index({ status: 1, createdAt: -1 }, { name: "AllPurchasesStatusDateIndex" }); // สำหรับ Admin/Report
PurchaseSchema.index({ paymentId: 1 }, { name: "PurchaseByPaymentIdIndex", unique: true, sparse: true }); // ถ้า paymentId มีจริง ควรจะ unique

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

PurchaseSchema.pre<IPurchase>("save", async function (next) {
  // 1. สร้าง purchaseReadableId ถ้าเป็นเอกสารใหม่และยังไม่มีค่า
  if (this.isNew && !this.purchaseReadableId) {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    // สร้าง Suffix แบบสุ่ม ควรใช้ library ที่สร้าง ID ที่ unique ได้ดีกว่านี้ใน production
    const randomSuffix = new Types.ObjectId().toHexString().slice(-6).toUpperCase();
    this.purchaseReadableId = `NVM-PO-${year}${month}${day}-${randomSuffix}`;
  }

  // 2. คำนวณ subtotal สำหรับแต่ละ item ถ้า items มีการเปลี่ยนแปลง หรือเป็นเอกสารใหม่
  //    และคำนวณ totalAmount, totalDiscountAmount
  if (this.isNew || this.isModified("items")) {
    let calculatedTotalAmount = 0;
    let calculatedTotalDiscountAmount = 0;
    this.items.forEach(item => {
      item.subtotal = (item.quantity * item.unitPrice) - (item.discountAmount || 0);
      calculatedTotalAmount += (item.quantity * item.unitPrice);
      calculatedTotalDiscountAmount += (item.discountAmount || 0);
    });
    this.totalAmount = calculatedTotalAmount;
    this.totalDiscountAmount = calculatedTotalDiscountAmount;
  }

  // 3. คำนวณ finalAmount ถ้า items, taxAmount, หรือ totalDiscountAmount มีการเปลี่ยนแปลง
  if (this.isNew || this.isModified("items") || this.isModified("taxAmount") || this.isModified("totalDiscountAmount")) {
    this.finalAmount = (this.totalAmount - (this.totalDiscountAmount || 0)) + (this.taxAmount || 0);
    // ตั้งค่า finalCurrency ถ้ายังไม่มี (ควรมาจาก item แรก หรือ config ของระบบ)
    // และตรวจสอบว่าสกุลเงินใน items สอดคล้องกันหรือไม่ หากจำเป็น
    if (!this.finalCurrency && this.items.length > 0) {
        this.finalCurrency = this.items[0].currency;
    }
  }


  // 4. ตั้งค่า purchasedAt เมื่อ status เปลี่ยนเป็น COMPLETED และยังไม่มี purchasedAt
  if (this.isModified("status") && this.status === PurchaseStatus.COMPLETED && !this.purchasedAt) {
    this.purchasedAt = new Date();
  }

  // 5. ตั้งค่า refundedAt เมื่อ status เปลี่ยนเป็น REFUNDED และยังไม่มี refundedAt
  if (this.isModified("status") && this.status === PurchaseStatus.REFUNDED && !this.refundedAt) {
    this.refundedAt = new Date();
  }

  next();
});

// Post-save hook สำหรับการดำเนินการหลังจากการซื้อสำเร็จ
PurchaseSchema.post<IPurchase>("save", async function (doc, next) {
  // ตรวจสอบว่า status เป็น COMPLETED และ field 'status' เพิ่งถูกแก้ไขเป็น COMPLETED ใน operation นี้
  // เพื่อป้องกัน hook ทำงานซ้ำซ้อนจากการ save อื่นๆ ที่ไม่เกี่ยวกับการเปลี่ยน status เป็น COMPLETED
  const statusChangedToCompleted = doc.isModified("status") && doc.status === PurchaseStatus.COMPLETED;
  // ตรวจสอบสถานะก่อนหน้า (priorDoc) เพื่อให้แน่ใจว่าเป็นการเปลี่ยนมาเป็น COMPLETED ครั้งแรก
  const priorStatus = doc.$__.priorDoc?.status;
  const isJustCompleted = statusChangedToCompleted && (priorStatus !== PurchaseStatus.COMPLETED);


  if (isJustCompleted) { // ดำเนินการเฉพาะเมื่อสถานะเพิ่งเปลี่ยนเป็น COMPLETED จริงๆ
    try {
      // 1. จัดการ User Wallet (ถ้าจ่ายด้วยเหรียญ) และสร้าง Transaction
      // ตรวจสอบว่ามี paymentId และการชำระเงินนั้นสำเร็จด้วย COIN_WALLET
      if (doc.paymentId && doc.finalCurrency === "COIN") { // ตรวจสอบเพิ่มเติมว่าสกุลเงินสุดท้ายเป็น COIN
        const payment = await models.Payment.findById(doc.paymentId).lean() as IPayment | null; // ใช้ .lean() เพื่อ performance
        // แก้ไข: ตรวจสอบ payment.paymentGateway และ payment.status โดยใช้ Enum ที่ import มา
        if (payment && payment.paymentGateway === PaymentGateway.COIN_WALLET && payment.status === ExternalPaymentStatus.SUCCEEDED) {
          // ลดเหรียญจากกระเป๋าผู้ใช้
          await models.User.findByIdAndUpdate(doc.userId, {
            $inc: { "wallet.coins": -doc.finalAmount }, // สมมติ finalAmount คือจำนวนเหรียญที่ใช้
          });

          // สร้าง EarningTransaction สำหรับการใช้เหรียญ (ถ้ามี model นี้)
          if (models.EarningTransaction) { // ตรวจสอบว่า models.EarningTransaction มีอยู่จริง
            await models.EarningTransaction.create({
              userId: doc.userId,
              transactionType: "SPEND_COIN_PURCHASE", // ประเภทธุรกรรม: ใช้เหรียญซื้อของ
              amount: -doc.finalAmount, // จำนวนเหรียญที่ใช้ (ค่าติดลบ)
              currency: "COIN", // สกุลเงินเป็นเหรียญ
              description: `ซื้อสินค้า/บริการ หมายเลข: ${doc.purchaseReadableId}`,
              relatedPurchaseId: doc._id,
              transactionDate: doc.purchasedAt || new Date(),
              status: "COMPLETED" // สถานะของ EarningTransaction นี้ (สมมติว่ามี field นี้)
            });
          }
        }
      }

      // 2. ให้สิทธิ์การเข้าถึงเนื้อหาที่ซื้อ (เช่น ตอนนิยาย, การสมัครสมาชิก)
      for (const item of doc.items) {
        if (item.itemType === PurchaseItemType.NOVEL_EPISODE && item.itemId) {
          // ดึงข้อมูล Episode และ NovelId เพื่ออัปเดต UserLibraryItem
          const episode = await models.Episode.findById(item.itemId).select("novelId title").lean() as (IEpisode & { novelId: Types.ObjectId, title: string }) | null;
          if (episode && episode.novelId && models.UserLibraryItem) { // ตรวจสอบ models.UserLibraryItem
            // อัปเดตหรือสร้าง UserLibraryItem เพื่อบันทึกว่าผู้ใช้ซื้อตอนนี้แล้ว
            // $addToSet ป้องกันการเพิ่ม ID ซ้ำ
            await models.UserLibraryItem.findOneAndUpdate(
              { userId: doc.userId, novelId: episode.novelId, itemType: "NOVEL" },
              {
                $addToSet: { purchasedEpisodeIds: item.itemId },
                $set: { lastAccessedAt: new Date() }, // อัปเดตเวลาเข้าถึงล่าสุด
                $setOnInsert: { // ข้อมูลที่จะใส่เมื่อสร้างเอกสารใหม่ (upsert:true)
                  userId: doc.userId,
                  novelId: episode.novelId,
                  itemType: "NOVEL", // สอดคล้องกับ UserLibraryItem model
                  addedAt: new Date(),
                  status: "IN_LIBRARY", // สถานะในคลังของผู้ใช้
                }
              },
              { upsert: true, new: true } // สร้างใหม่ถ้ายังไม่มี, และคืนค่าเอกสารใหม่
            );
            console.log(`[Purchase Hook] Granted access to episode ${item.itemId} (${episode.title}) for user ${doc.userId}`);
          }
        }
        // TODO: จัดการ itemType อื่นๆ เช่น COIN_PACKAGE (เพิ่มเหรียญให้ user), SUBSCRIPTION (อัปเดตสถานะการสมัครสมาชิก)
        if (item.itemType === PurchaseItemType.COIN_PACKAGE && item.itemId && models.CoinPackage && models.User) { // ตรวจสอบ models เพิ่มเติม
          const coinPackage = await models.CoinPackage.findById(item.itemId).lean();
          if (coinPackage && (coinPackage as any).coinsAmount) { // สมมติ CoinPackage มี field coinsAmount
             await models.User.findByIdAndUpdate(doc.userId, { $inc: { "wallet.coins": (coinPackage as any).coinsAmount } });
             console.log(`[Purchase Hook] Added ${(coinPackage as any).coinsAmount} coins to user ${doc.userId} from package ${item.title}`);
             // อาจจะต้องสร้าง EarningTransaction สำหรับการซื้อเหรียญด้วย (ถ้าการซื้อเหรียญผ่าน Purchase Model นี้)
          }
        }
      }

      // 3. (Optional) ส่ง Notification การซื้อสำเร็จให้ผู้ใช้
      if (models.Notification) { // ตรวจสอบ models.Notification
        await models.Notification.create({
          userId: doc.userId,
          type: "PURCHASE_COMPLETED",
          title: "การซื้อสำเร็จ",
          message: `การซื้อหมายเลข ${doc.purchaseReadableId} ของคุณสำหรับรายการ "${doc.items.map(i => i.title).join(', ')}" สำเร็จแล้ว ขอบคุณที่ใช้บริการ DivWy!`,
          data: { purchaseId: doc._id, purchaseReadableId: doc.purchaseReadableId, items: doc.items.map(i => ({title: i.title, type: i.itemType})) },
          isRead: false,
        });
      }

      // 4. (Optional) สร้าง EarningTransaction สำหรับผู้เขียน (ถ้าเป็นการซื้อตอนนิยายและมี sellerId)
      if (models.EarningTransaction) { // ตรวจสอบ models.EarningTransaction
        for (const item of doc.items) {
          if (item.itemType === PurchaseItemType.NOVEL_EPISODE && item.itemId && item.sellerId) {
            const earningAmount = item.subtotal; // สมมติว่าผู้เขียนได้เต็มจำนวน subtotal (อาจต้องมี logic ส่วนแบ่งรายได้ที่ซับซ้อนกว่านี้)
            const episodeForNovel = await models.Episode.findById(item.itemId).select("novelId").lean() as IEpisode | null;

            await models.EarningTransaction.create({
              userId: item.sellerId, // ID ของผู้เขียน (ผู้ขาย)
              transactionType: "NOVEL_EPISODE_SALE", // ประเภทธุรกรรม: รายได้จากการขายตอน
              amount: earningAmount, // จำนวนเงินที่ผู้เขียนได้รับ
              currency: item.currency, // สกุลเงินของรายการ (ควรเป็น COIN หรือสกุลเงินหลักที่แปลงแล้ว)
              description: `รายได้จากการขายตอนนิยาย "${item.title}" (คำสั่งซื้อ: ${doc.purchaseReadableId})`,
              relatedNovelId: episodeForNovel?.novelId,
              relatedEpisodeId: item.itemId,
              relatedPurchaseId: doc._id,
              relatedBuyerId: doc.userId, // ID ของผู้ซื้อ
              transactionDate: doc.purchasedAt || new Date(),
              status: "PENDING_PAYOUT" // หรือ COMPLETED ถ้าจ่ายทันที (สถานะของ EarningTransaction)
            });
            console.log(`[Purchase Hook] Created earning transaction for seller ${item.sellerId} for item ${item.title}`);
            // อาจจะต้องมีการอัปเดต EarningAnalytic ของผู้เขียนที่นี่ หรือผ่าน EarningTransaction post-save hook
          }
        }
      }

    } catch (error) {
      console.error(`[Purchase Post-Save Hook Error] Purchase ID ${doc._id}:`, error);
      // ควรมีระบบแจ้งเตือน admin หรือ logging ที่ละเอียดกว่านี้
      // การจัดการข้อผิดพลาด: อาจจะต้องพิจารณาการ rollback หรือตั้งค่า status ของ purchase เป็น FAILED_POST_PROCESSING
      // หรือมี queue สำหรับ retry การดำเนินการเหล่านี้
      // ตัวอย่าง: doc.status = "FAILED_POST_PROCESSING"; await doc.save(); // (ต้องเพิ่ม status นี้ใน enum)
    }
  }
  next();
});

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

const PurchaseModel =
  (models.Purchase as mongoose.Model<IPurchase>) ||
  model<IPurchase>("Purchase", PurchaseSchema);

export default PurchaseModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Dynamic Referencing for itemId in PurchaseItemSchema**: ใช้ `refPath` เพื่ออ้างอิง Model ตาม `itemType`
//     จะทำให้การ populate `itemId` ไปยัง Episode, Novel, CoinPackage, SubscriptionPlan ง่ายขึ้นมาก.
// 2.  **Currency Handling**: หากรองรับหลายสกุลเงินจริง (THB, USD) ควรมีระบบแปลงสกุลเงิน, เก็บอัตราแลกเปลี่ยน,
//     และพิจารณาใช้ Decimal type (เช่น mongoose-decimal128) แทน Number เพื่อความแม่นยำทางการเงิน.
// 3.  **Idempotency in Post-Save Hooks**: การดำเนินการต่างๆ (ให้สิทธิ์, ตัด/เพิ่มเหรียญ) ควรออกแบบให้เป็น Idempotent
//     เพื่อป้องกันการทำงานซ้ำหาก hook ถูก trigger หลายครั้ง (เช่น จากการ save ที่ไม่ตั้งใจ หรือ retry)
//     การตรวจสอบ `doc.isModified("status")` และ `doc.$__.priorDoc` ช่วยได้ส่วนหนึ่ง.
// 4.  **Error Handling & Rollback Strategy**: การจัดการ error ใน post-save hook มีความสำคัญอย่างยิ่ง.
//     ควรมีกลไก rollback ที่เหมาะสม หรือระบบ retry queue (เช่น BullMQ) หากการดำเนินการหลังซื้อล้มเหลว.
// 5.  **Revenue Sharing Logic**: หากมีระบบส่วนแบ่งรายได้ที่ซับซ้อนสำหรับผู้เขียน, ควรแยกเป็น service หรือ module เฉพาะ.
// 6.  **MongoDB Transactions**: สำหรับการดำเนินการที่ต้องการ Atomicity (เช่น ตัดเหรียญผู้ซื้อ + เพิ่มรายได้ผู้ขาย + ให้สิทธิ์)
//     ควรใช้ MongoDB Transactions (เมื่อใช้ Replica Set) เพื่อให้มั่นใจว่าทุกอย่างสำเร็จหรือล้มเหลวพร้อมกัน.
// 7.  **Testing**: ทดสอบ logic การซื้อ, การคืนเงิน, และการให้สิทธิ์อย่างละเอียดถี่ถ้วน รวมถึง edge cases.
// 8.  **Performance**: สร้าง Index ที่จำเป็นและเหมาะสม, พิจารณา query optimization สำหรับระบบที่มี transaction จำนวนมาก.
// 9.  **Security**: ปกป้องข้อมูลการซื้อ, จำกัดการเข้าถึง, และติดตามการเปลี่ยนแปลง (audit log).
// 10. **Decoupling**: การดำเนินการหลังการซื้อ (เช่น การส่ง Notification, การอัปเดต Analytics) สามารถใช้ event-driven architecture
//     เพื่อลด coupling และเพิ่มความยืดหยุ่น (เช่น emit event 'PURCHASE_COMPLETED' แล้วให้ services อื่นๆ subscribe).
// 11. **Schema Versioning**: `schemaVersion` field เป็นจุดเริ่มต้นที่ดีสำหรับการจัดการการเปลี่ยนแปลง schema ในอนาคต.
// 12. **Readable ID Generation**: Logic การสร้าง `purchaseReadableId` ควรทำให้มั่นใจได้ว่าจะ unique จริงๆ (อาจใช้ counter จาก DB หรือ library สร้าง ID ที่ซับซ้อนกว่านี้).
// ==================================================================================================