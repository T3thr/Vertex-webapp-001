// src/backend/models/Donation.ts
// โมเดลการบริจาค (Donation Model)
// บันทึกรายการบริจาคจากผู้ใช้ไปยังนักเขียน, นิยาย, หรือแพลตฟอร์มโดยตรง

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IUser } from "./User"; // สำหรับ donorUserId และ targetId (นักเขียน)
import { INovel } from "./Novel"; // สำหรับ targetId (นิยาย)
import { IPayment } from "./Payment"; // สำหรับ paymentId (ถ้าบริจาคด้วยเงินจริง)
import { IEarningTransaction, TransactionType, TransactionCurrency as EarningCurrency, TransactionStatus as EarningStatus } from "./EarningTransaction"; // สำหรับการสร้าง EarningTransaction
import { INotification, NotificationType, NotificationSeverity } from "./Notification"; // สำหรับการสร้าง Notification

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Donation
// ==================================================================================================

/**
 * @enum {string} DonationTargetType
 * @description ประเภทของเป้าหมายการบริจาค
 * - `WRITER`: บริจาคให้นักเขียนโดยตรง (ต้องมี targetWriterId)
 * - `NOVEL`: บริจาคให้โปรเจกต์นิยาย (ต้องมี targetNovelId, อาจจะไปที่ผู้เขียนหลักของนิยายหรือทีม)
 * - `PLATFORM`: บริจาคให้แพลตฟอร์ม DivWy โดยรวม
 */
export enum DonationTargetType {
  WRITER = "writer",
  NOVEL = "novel",
  PLATFORM = "platform",
}

/**
 * @enum {string} DonationCurrency
 * @description สกุลเงินที่ใช้บริจาค
 * - `COIN`: บริจาคด้วยเหรียญภายในแพลตฟอร์ม DivWy
 * - `THB`: บริจาคด้วยเงินบาทไทย (ผ่าน Payment Gateway)
 * - `USD`: บริจาคด้วยเงินดอลลาร์สหรัฐ (ผ่าน Payment Gateway)
 */
export enum DonationCurrency {
  COIN = "COIN",
  THB = "THB",
  USD = "USD",
}

/**
 * @enum {string} DonationStatus
 * @description สถานะของการบริจาค
 * - `PENDING_PAYMENT`: รอดำเนินการชำระเงิน (สำหรับ THB/USD)
 * - `PENDING_CONFIRMATION`: รอการยืนยันจากระบบ (เช่น หลัง Payment Gateway callback)
 * - `COMPLETED`: การบริจาคสำเร็จ และเหรียญ/เงินได้ถูกโอนแล้ว
 * - `FAILED_PAYMENT`: การชำระเงินล้มเหลว
 * - `FAILED_PROCESSING`: การประมวลผลภายในล้มเหลว (เช่น ตัดเหรียญไม่ได้)
 * - `CANCELLED_BY_USER`: ผู้ใช้ยกเลิกก่อนดำเนินการสำเร็จ
 * - `REFUNDED`: ได้รับการคืนเงิน (ถ้ามีนโยบายรองรับ)
 * - `ERROR`: เกิดข้อผิดพลาดที่ไม่คาดคิด
 */
export enum DonationStatus {
  PENDING_PAYMENT = "pending_payment",
  PENDING_CONFIRMATION = "pending_confirmation",
  COMPLETED = "completed",
  FAILED_PAYMENT = "failed_payment",
  FAILED_PROCESSING = "failed_processing",
  CANCELLED_BY_USER = "cancelled_by_user",
  REFUNDED = "refunded",
  ERROR = "error",
}

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร Donation (IDonation Document Interface)
// ==================================================================================================

/**
 * @interface IDonation
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารการบริจาคใน Collection "donations"
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสาร
 * @property {string} donationReadableId - ID ที่มนุษย์อ่านได้สำหรับการบริจาค (เช่น DON-2024-00001)
 * @property {Types.ObjectId | IUser} donorUserId - ID ของผู้ใช้ที่บริจาค (อ้างอิง User model, **จำเป็น**)
 * @property {DonationTargetType} targetType - ประเภทของเป้าหมายการบริจาค (**จำเป็น**)
 * @property {Types.ObjectId | IUser} [targetWriterId] - ID ของนักเขียนผู้รับ (ถ้า targetType === "writer", อ้างอิง User model)
 * @property {Types.ObjectId | INovel} [targetNovelId] - ID ของนิยายผู้รับ (ถ้า targetType === "novel", อ้างอิง Novel model)
 * @property {number} amount - จำนวนที่บริจาค (หน่วยเป็นตาม currency, **จำเป็น**)
 * @property {DonationCurrency} currency - สกุลเงินที่ใช้บริจาค (**จำเป็น**)
 * @property {number} [platformFee] - ค่าธรรมเนียมที่แพลตฟอร์มหักจากการบริจาค (ถ้ามี, สำหรับการบริจาคด้วยเงินจริง)
 * @property {number} [netAmountForRecipient] - จำนวนเงินสุทธิที่ผู้รับจะได้รับ (หลังหักค่าธรรมเนียม)
 * @property {string} [message] - ข้อความจากผู้บริจาคถึงผู้รับ (Optional, max 1000 chars)
 * @property {boolean} isAnonymous - บริจาคแบบไม่เปิดเผยชื่อผู้บริจาคหรือไม่ (default: false)
 * @property {Types.ObjectId | IPayment} [paymentId] - ID ของรายการชำระเงิน (อ้างอิง Payment model, ถ้า currency ไม่ใช่ COIN)
 * @property {string} [gatewayTransactionId] - ID ธุรกรรมจาก Payment Gateway (ถ้ามี)
 * @property {string} [paymentMethod] - ช่องทางการชำระเงินที่ใช้ (เช่น "credit_card", "promptpay")
 * @property {DonationStatus} status - สถานะการบริจาค (**จำเป็น**, default: `PENDING_PAYMENT` หรือ `COMPLETED` สำหรับ COIN)
 * @property {string} [failureReason] - เหตุผลที่การบริจาคล้มเหลว (ถ้ามี)
 * @property {Date} [donatedAt] - วันและเวลาที่การบริจาคสำเร็จ (status === COMPLETED)
 * @property {any} [metadata] - ข้อมูลเพิ่มเติมอื่นๆ ที่เกี่ยวข้องกับการบริจาค
 * @property {number} schemaVersion - เวอร์ชันของ schema
 * @property {Date} createdAt - วันที่สร้างเอกสาร (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตเอกสารล่าสุด (Mongoose `timestamps`)
 */
export interface IDonation extends Document {
  _id: Types.ObjectId;
  donationReadableId: string;
  donorUserId: Types.ObjectId | IUser;
  targetType: DonationTargetType;
  targetWriterId?: Types.ObjectId | IUser;
  targetNovelId?: Types.ObjectId | INovel;
  amount: number;
  currency: DonationCurrency;
  platformFee?: number;
  netAmountForRecipient?: number;
  message?: string;
  isAnonymous: boolean;
  paymentId?: Types.ObjectId | IPayment;
  gatewayTransactionId?: string;
  paymentMethod?: string;
  status: DonationStatus;
  failureReason?: string;
  donatedAt?: Date;
  metadata?: any;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ Donation (DonationSchema)
// ==================================================================================================
const DonationSchema = new Schema<IDonation>(
  {
    donationReadableId: { 
      type: String, 
      required: [true, "กรุณาระบุ ID ที่อ่านได้ของการบริจาค (Readable Donation ID is required)"], 
      unique: true, 
      index: true 
    },
    donorUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุ ID ของผู้บริจาค (Donor User ID is required)"],
      index: true,
    },
    targetType: {
      type: String,
      enum: Object.values(DonationTargetType),
      required: [true, "กรุณาระบุประเภทเป้าหมายการบริจาค (Target type is required)"],
      index: true,
    },
    targetWriterId: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      index: true,
      validate: {
        validator: function(this: IDonation, v: any) {
          return this.targetType !== DonationTargetType.WRITER || v != null;
        },
        message: "targetWriterId ต้องระบุเมื่อ targetType เป็น 'writer'"
      }
    },
    targetNovelId: { 
      type: Schema.Types.ObjectId, 
      ref: "Novel", 
      index: true,
      validate: {
        validator: function(this: IDonation, v: any) {
          return this.targetType !== DonationTargetType.NOVEL || v != null;
        },
        message: "targetNovelId ต้องระบุเมื่อ targetType เป็น 'novel'"
      }
    },
    amount: {
      type: Number,
      required: [true, "กรุณาระบุจำนวนเงินที่บริจาค (Amount is required)"],
      min: [1, "จำนวนเงินบริจาคต้องมากกว่าหรือเท่ากับ 1"], // อาจปรับตามสกุลเงิน
    },
    currency: {
      type: String,
      enum: Object.values(DonationCurrency),
      required: [true, "กรุณาระบุสกุลเงิน (Currency is required)"],
      index: true,
    },
    platformFee: { type: Number, min: 0, default: 0 },
    netAmountForRecipient: { type: Number, min: 0 },
    message: { 
      type: String, 
      trim: true, 
      maxlength: [1000, "ข้อความบริจาคต้องไม่เกิน 1000 ตัวอักษร"] 
    },
    isAnonymous: { type: Boolean, default: false, index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", index: true },
    gatewayTransactionId: { type: String, trim: true, index: true, maxlength: [255, "ID ธุรกรรม Gateway ต้องไม่เกิน 255 ตัวอักษร"] },
    paymentMethod: { type: String, trim: true, maxlength: [100, "ช่องทางการชำระเงินต้องไม่เกิน 100 ตัวอักษร"] },
    status: {
      type: String,
      enum: Object.values(DonationStatus),
      default: function(this: IDonation) {
        return this.currency === DonationCurrency.COIN ? DonationStatus.COMPLETED : DonationStatus.PENDING_PAYMENT;
      },
      required: [true, "กรุณาระบุสถานะการบริจาค"],
      index: true,
    },
    failureReason: { type: String, trim: true, maxlength: [1000, "เหตุผลความล้มเหลวต้องไม่เกิน 1000 ตัวอักษร"] },
    donatedAt: { type: Date, index: true },
    metadata: { type: Schema.Types.Mixed },
    schemaVersion: { type: Number, default: 1, min: 1 },
  },
  {
    timestamps: true, // createdAt, updatedAt
    collection: "donations",
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

// Index สำหรับการค้นหาการบริจาคของผู้ใช้คนเดียว
DonationSchema.index(
  { donorUserId: 1, status: 1, createdAt: -1 },
  { name: "UserDonationsIndex" }
);
// Index สำหรับการค้นหาการบริจาคที่ไปยังเป้าหมายเฉพาะ (นักเขียน)
DonationSchema.index(
  { targetWriterId: 1, status: 1, donatedAt: -1 },
  {
    name: "WriterDonationsIndex",
    partialFilterExpression: { targetType: DonationTargetType.WRITER },
  }
);
// Index สำหรับการค้นหาการบริจาคที่ไปยังเป้าหมายเฉพาะ (นิยาย)
DonationSchema.index(
  { targetNovelId: 1, status: 1, donatedAt: -1 },
  {
    name: "NovelDonationsIndex",
    partialFilterExpression: { targetType: DonationTargetType.NOVEL },
  }
);
// Index สำหรับการค้นหาการบริจาคที่ไปยังแพลตฟอร์ม
DonationSchema.index(
  { status: 1, donatedAt: -1 },
  {
    name: "PlatformDonationsIndex",
    partialFilterExpression: { targetType: DonationTargetType.PLATFORM },
  }
);
// Index สำหรับ Payment Gateway ID (ถ้ามี)
DonationSchema.index(
  { gatewayTransactionId: 1 },
  { sparse: true, name: "GatewayTransactionIdIndex" }
);

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

// Middleware ก่อน save
DonationSchema.pre<IDonation>("save", async function (next) {
  // 1. สร้าง donationReadableId ถ้ายังไม่มี (สำหรับเอกสารใหม่)
  if (this.isNew && !this.donationReadableId) {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.donationReadableId = `NVM-DON-${year}${month}${day}-${randomSuffix}`;
  }

  // 2. อัปเดต donatedAt เมื่อ status เปลี่ยนเป็น COMPLETED และยังไม่มี donatedAt
  if (this.isModified("status") && this.status === DonationStatus.COMPLETED && !this.donatedAt) {
    this.donatedAt = new Date();
  }

  // 3. คำนวณ netAmountForRecipient ถ้ามี platformFee
  if (this.platformFee && this.platformFee > 0) {
    this.netAmountForRecipient = this.amount - this.platformFee;
  } else {
    this.netAmountForRecipient = this.amount;
  }

  // 4. ถ้าเป็นการบริจาคด้วย COIN และสร้างใหม่ ให้ตั้ง status เป็น COMPLETED โดยอัตโนมัติ
  if (this.isNew && this.currency === DonationCurrency.COIN) {
    this.status = DonationStatus.COMPLETED;
  }

  next();
});

// Middleware หลัง save (Post-save hook)
DonationSchema.post<IDonation>("save", async function (doc, next) {
  // ตรวจสอบว่า status เพิ่งเปลี่ยนเป็น COMPLETED หรือเป็นการสร้างเอกสารใหม่ที่ COMPLETED (สำหรับ COIN)
  if (doc.status === DonationStatus.COMPLETED && (doc.isModified("status") || (doc.isNew && doc.currency === DonationCurrency.COIN))) {
    const UserModel = models.User as mongoose.Model<IUser>;
    const EarningTransactionModel = models.EarningTransaction as mongoose.Model<IEarningTransaction>;
    const NotificationModel = models.Notification as mongoose.Model<INotification>;

    try {
      // === ส่วนที่ 1: จัดการ Wallet และ EarningTransaction ===
      if (doc.currency === DonationCurrency.COIN) {
        // 1.1 ตัดเหรียญผู้บริจาค
        const donorUpdateResult = await UserModel.findByIdAndUpdate(doc.donorUserId, {
          $inc: { "wallet.coins": -doc.amount },
        });
        if (!donorUpdateResult) {
          console.error(`[Donation Post-Save Hook] Failed to find and update donor user ${doc.donorUserId} wallet.`);
          // อาจจะต้องมี logic rollback หรือตั้งค่า status ของ Donation เป็น FAILED_PROCESSING
          doc.status = DonationStatus.FAILED_PROCESSING;
          doc.failureReason = "Failed to deduct coins from donor wallet.";
          await doc.save(); // บันทึกการเปลี่ยนแปลงสถานะ
          return next(new Error(doc.failureReason));
        }

        // 1.2 สร้าง EarningTransaction สำหรับผู้บริจาค (การใช้เหรียญ)
        await EarningTransactionModel.create({
          primaryUserId: doc.donorUserId,
          transactionType: TransactionType.USER_COIN_SPEND_FOR_DONATION,
          description: `บริจาคเหรียญให้ ${doc.targetType}${doc.targetWriterId ? ` นักเขียน ID: ${doc.targetWriterId}` : (doc.targetNovelId ? ` นิยาย ID: ${doc.targetNovelId}` : " แพลตฟอร์ม")} (Donation ID: ${doc.donationReadableId})`,
          amount: doc.amount, // ค่าบวกเสมอสำหรับ amount, ทิศทางดูจาก transactionType
          currency: EarningCurrency.COIN,
          relatedDonationId: doc._id,
          status: EarningStatus.COMPLETED,
          transactionDate: doc.donatedAt || new Date(),
          payer: { userId: doc.donorUserId, role: "payer" },
          // payee จะถูกกำหนดตาม targetType ด้านล่าง
        });

        // 1.3 เพิ่มเหรียญ/บันทึกรายรับให้ผู้รับ
        let recipientUserId: Types.ObjectId | undefined;
        let earningTransactionDescriptionForRecipient = "";

        if (doc.targetType === DonationTargetType.WRITER && doc.targetWriterId) {
          recipientUserId = doc.targetWriterId as Types.ObjectId;
          earningTransactionDescriptionForRecipient = `ได้รับเหรียญบริจาคจาก ${doc.isAnonymous ? "ผู้ไม่ประสงค์ออกนาม" : `ผู้ใช้ ID: ${doc.donorUserId}`} (Donation ID: ${doc.donationReadableId})`;
        } else if (doc.targetType === DonationTargetType.NOVEL && doc.targetNovelId) {
          // หากบริจาคให้นิยาย ต้องหาผู้เขียนหลักของนิยายเพื่อโอนเหรียญให้
          // สมมติว่า Novel model มี field `author` (อาจเป็น ObjectId หรือ populated document)
          const novel = await (models.Novel as mongoose.Model<INovel>)
            .findById(doc.targetNovelId)
            .select("author title")
            .lean();
          if (novel && novel.author) {
            // ตรวจสอบว่า author เป็น ObjectId หรือ populated document
            recipientUserId = (typeof novel.author === "object" && "_id" in novel.author
              ? (novel.author as any)._id
              : novel.author) as Types.ObjectId;
            earningTransactionDescriptionForRecipient = `ได้รับเหรียญบริจาคสำหรับนิยาย ID: ${doc.targetNovelId} จาก ${doc.isAnonymous ? "ผู้ไม่ประสงค์ออกนาม" : `ผู้ใช้ ID: ${doc.donorUserId}`} (Donation ID: ${doc.donationReadableId})`;
          } else {
            console.warn(`[Donation Post-Save Hook] Novel ${doc.targetNovelId} not found or has no author for donation ${doc.donationReadableId}.`);
          }
        }
        // กรณี PLATFORM ไม่ต้องเพิ่มเหรียญให้ใคร แต่จะมี EarningTransaction ของ Platform

        if (recipientUserId) {
          await UserModel.findByIdAndUpdate(recipientUserId, {
            $inc: { "writerProfile.stats.totalCoinRevenueFromDonations": doc.amount }, // หรือ field ที่เหมาะสมกว่า
          });
          await EarningTransactionModel.create({
            primaryUserId: recipientUserId,
            transactionType: TransactionType.WRITER_COIN_EARN_FROM_DONATION,
            description: earningTransactionDescriptionForRecipient,
            amount: doc.amount,
            currency: EarningCurrency.COIN,
            relatedDonationId: doc._id,
            relatedSourceUserId: doc.donorUserId,
            status: EarningStatus.COMPLETED,
            transactionDate: doc.donatedAt || new Date(),
            payee: { userId: recipientUserId, role: "payee" },
            payer: { userId: doc.donorUserId, role: "payer" }, // ระบุผู้จ่ายด้วย
          });
          // TODO: อาจจะต้องอัปเดต EarningAnalytic ของนักเขียนด้วย (ควรทำผ่าน service/job)
        } else if (doc.targetType === DonationTargetType.PLATFORM) {
          // สร้าง EarningTransaction สำหรับรายได้ของแพลตฟอร์ม
          await EarningTransactionModel.create({
            // primaryUserId อาจจะไม่ใช่ user แต่เป็น ID ของ platform เอง หรือ null
            transactionType: TransactionType.PLATFORM_REVENUE_CUT_FROM_DONATION, // หรือ type ใหม่สำหรับ platform donation revenue
            description: `ได้รับเหรียญบริจาคให้แพลตฟอร์มจาก ${doc.isAnonymous ? "ผู้ไม่ประสงค์ออกนาม" : `ผู้ใช้ ID: ${doc.donorUserId}`} (Donation ID: ${doc.donationReadableId})`,
            amount: doc.amount,
            currency: EarningCurrency.COIN,
            relatedDonationId: doc._id,
            relatedSourceUserId: doc.donorUserId,
            status: EarningStatus.COMPLETED,
            transactionDate: doc.donatedAt || new Date(),
            payee: { role: "platform_revenue" }, // ระบุว่าเป็นรายได้แพลตฟอร์ม
            payer: { userId: doc.donorUserId, role: "payer" },
          });
        }
      }
      // TODO: จัดการกรณีบริจาคด้วย THB/USD (เมื่อ Payment สำเร็จ)
      // จะต้องมีการสร้าง EarningTransaction ที่เกี่ยวข้องกับเงินจริง และการคำนวณ platformFee

      // === ส่วนที่ 2: (Optional) ส่ง Notification ===
      let notificationRecipientId: Types.ObjectId | undefined;
      let notificationTitle = "";
      let notificationMessageForRecipient = "";

      if (doc.targetType === DonationTargetType.WRITER && doc.targetWriterId) {
        notificationRecipientId = doc.targetWriterId as Types.ObjectId;
        notificationTitle = "คุณได้รับการบริจาคใหม่! 🎉";
        notificationMessageForRecipient = `${
          doc.isAnonymous ? "ผู้ไม่ประสงค์ออกนามท่านหนึ่ง" : `ผู้ใช้ ${(doc.donorUserId as IUser)?.username || `ID: ${doc.donorUserId}`}`
        } ได้บริจาค ${doc.amount} ${doc.currency} ให้กับคุณ${doc.message ? ` พร้อมข้อความ: "${doc.message}"` : ""}. ขอบคุณสำหรับการสร้างสรรค์ผลงาน!`;
      } else if (doc.targetType === DonationTargetType.NOVEL && doc.targetNovelId) {
        const novel = await (models.Novel as mongoose.Model<INovel>)
          .findById(doc.targetNovelId)
          .select("title author")
          .lean();
        if (novel && novel.author) {
          // ตรวจสอบว่า author เป็น ObjectId หรือ populated document
          notificationRecipientId = (typeof novel.author === "object" && "_id" in novel.author
            ? (novel.author as any)._id
            : novel.author) as Types.ObjectId;
          notificationTitle = `นิยาย "${novel.title}" ของคุณได้รับการบริจาค! 💖`;
          notificationMessageForRecipient = `${
            doc.isAnonymous ? "ผู้ไม่ประสงค์ออกนามท่านหนึ่ง" : `ผู้ใช้ ${(doc.donorUserId as IUser)?.username || `ID: ${doc.donorUserId}`}`
          } ได้บริจาค ${doc.amount} ${doc.currency} ให้กับนิยาย "${novel.title}"${doc.message ? ` พร้อมข้อความ: "${doc.message}"` : ""}.`;
        }
      }
      // ไม่มีการส่ง Notification ถ้าบริจาคให้ Platform โดยตรงผ่านระบบนี้

      if (notificationRecipientId && notificationTitle && notificationMessageForRecipient) {
        await NotificationModel.create({
          userId: notificationRecipientId,
          type: NotificationType.DONATION_RECEIVED,
          title: notificationTitle,
          message: notificationMessageForRecipient,
          relatedId: doc._id,
          relatedType: "Donation",
          actorId: doc.donorUserId,
          severity: NotificationSeverity.SUCCESS,
          imageUrl: (doc.donorUserId as IUser)?.profile?.avatarUrl, // รูปผู้บริจาค (ถ้าไม่ anonymous)
        });
      }
    } catch (error: any) {
      console.error("[Donation Post-Save Hook] Error processing completed donation:", error);
      // หากเกิด error ระหว่างการประมวลผลหลัง save, ควรมีการ log และอาจจะแจ้งเตือน Admin
      // การ rollback transaction ที่นี่อาจจะซับซ้อน, การตั้งสถานะเป็น FAILED_PROCESSING อาจเป็นทางเลือก
      if (doc.status === DonationStatus.COMPLETED) {
        // Double check to avoid infinite loop if save fails
        doc.status = DonationStatus.FAILED_PROCESSING;
        doc.failureReason = `Error in post-save hook: ${error.message}`;
        await doc.save().catch(saveErr => console.error("[Donation Post-Save Hook] Error saving failed status:", saveErr));
      }
      return next(error); // ส่ง error ไปยัง Mongoose error handler
    }
  }
  next();
});

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

// ตรวจสอบว่า Model "Donation" ถูกสร้างไปแล้วหรือยัง ถ้ายัง ให้สร้าง Model ใหม่
const DonationModel = 
  (models.Donation as mongoose.Model<IDonation>) ||
  model<IDonation>("Donation", DonationSchema);

export default DonationModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Atomicity**: การดำเนินการหลายอย่างใน post-save hook (เช่น ตัด/เพิ่มเหรียญ, สร้าง EarningTransaction)
//     ควรจะทำให้เป็น Atomic Operation โดยใช้ MongoDB Transactions (ถ้าใช้ Replica Set) เพื่อป้องกันข้อมูลไม่สอดคล้องกัน
//     หากส่วนใดส่วนหนึ่งล้มเหลว ควรจะ Rollback ทั้งหมด.
// 2.  **Service Layer**: Logic ที่ซับซ้อนใน post-save hook (โดยเฉพาะการอัปเดต model อื่นๆ) ควรย้ายไปจัดการใน Service Layer
//     เพื่อให้ Model มีความรับผิดชอบเฉพาะการจัดการข้อมูลของตัวเอง และง่ายต่อการทดสอบและบำรุงรักษา.
// 3.  **Real Money Donations**: การบริจาคด้วยเงินจริง (THB, USD) จะต้องมีการ integrate กับ Payment Gateway
//     อย่างสมบูรณ์ และ `status` จะถูกอัปเดตตามผลลัพธ์จาก Gateway. การคำนวณ `platformFee` และ
//     `netAmountForRecipient` จะมีความสำคัญมาก.
// 4.  **Donation to Novel**: การกระจายรายได้จากการบริจาคให้นิยาย (ถ้ามีผู้เขียนหลายคน หรือมีส่วนแบ่งอื่นๆ)
//     จะต้องมี logic ที่ชัดเจน อาจจะมีการตั้งค่าส่วนแบ่งใน Novel model.
// 5.  **Recurring Donations**: หากต้องการรองรับการบริจาคแบบรายเดือน/รายปี จะต้องมีการออกแบบเพิ่มเติม
//     (เช่น การเก็บข้อมูล subscription, การเรียกเก็บเงินอัตโนมัติ).
// 6.  **Error Handling and Retry**: การจัดการ error ใน hook ควรมีความรอบคอบ อาจมีกลไก retry สำหรับบางกรณี
//     หรือการแจ้งเตือน Admin เมื่อเกิดปัญหาที่ไม่สามารถแก้ไขได้อัตโนมัติ.
// 7.  **Performance**: การ query ข้อมูลการบริจาค, โดยเฉพาะสำหรับ Dashboard หรือการแสดงผลสาธารณะ,
//     ควรมีการ optimize index และ query ให้ดี.
// 8.  **Author Field in Novel**: ควรตรวจสอบว่า `INovel` ใช้ field `author` หรือ `authorId` และปรับ interface
//     หรือ query ให้สอดคล้องกันเพื่อป้องกัน error ในอนาคต.
// ==================================================================================================