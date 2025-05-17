// src/backend/models/DonationApplication.ts
// โมเดลใบสมัครขอเปิดรับบริจาค (DonationApplication Model)
// สำหรับนักเขียนที่ต้องการขอเปิดรับการบริจาคจากผู้อ่าน เพื่อสนับสนุนการสร้างสรรค์ผลงาน

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IUser } from "./User"; // สำหรับ userId (นักเขียน) และ reviewedBy (Admin)
import { INotification } from "./Notification"; // สำหรับการสร้าง Notification

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล DonationApplication
// ==================================================================================================

/**
 * @enum {string} DonationApplicationStatus
 * @description สถานะของใบสมัครขอเปิดรับบริจาค
 * - `PENDING_REVIEW`: รอการตรวจสอบจากทีมงาน NovelMaze
 * - `APPROVED`: ได้รับการอนุมัติ สามารถเปิดรับบริจาคได้
 * - `REJECTED`: ถูกปฏิเสธ ไม่สามารถเปิดรับบริจาคได้ (พร้อมเหตุผล)
 * - `REQUIRES_MORE_INFO`: ต้องการข้อมูลเพิ่มเติมจากผู้สมัคร
 * - `CANCELLED_BY_USER`: ผู้ใช้ยกเลิกใบสมัครเอง
 * - `ON_HOLD`: พักการพิจารณาชั่วคราว (เช่น รอเอกสารเพิ่มเติมจากภายนอก)
 */
export enum DonationApplicationStatus {
  PENDING_REVIEW = "pending_review",
  APPROVED = "approved",
  REJECTED = "rejected",
  REQUIRES_MORE_INFO = "requires_more_info",
  CANCELLED_BY_USER = "cancelled_by_user",
  ON_HOLD = "on_hold",
}

/**
 * @interface ISupportingDocument
 * @description ข้อมูลเอกสารประกอบการสมัคร (ถ้ามี)
 * @property {string} documentName - ชื่อเอกสาร
 * @property {string} documentUrl - URL ของเอกสาร (เช่น ลิงก์ไปยัง Google Drive, S3)
 * @property {string} [documentType] - ประเภทของเอกสาร (เช่น "identity_card", "portfolio")
 */
export interface ISupportingDocument {
  documentName: string;
  documentUrl: string;
  documentType?: string;
}
const SupportingDocumentSchema = new Schema<ISupportingDocument>(
  {
    documentName: { type: String, required: true, trim: true, maxlength: [255, "ชื่อเอกสารต้องไม่เกิน 255 ตัวอักษร"] },
    documentUrl: { type: String, required: true, trim: true, maxlength: [2048, "URL เอกสารต้องไม่เกิน 2048 ตัวอักษร"] }, // URL validation can be added
    documentType: { type: String, trim: true, maxlength: [100, "ประเภทเอกสารต้องไม่เกิน 100 ตัวอักษร"] },
  },
  { _id: false }
);

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร DonationApplication (IDonationApplication Document Interface)
// ==================================================================================================

/**
 * @interface IDonationApplication
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารใบสมัครขอเปิดรับบริจาคใน Collection "donationapplications"
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสาร
 * @property {Types.ObjectId | IUser} userId - ID ของนักเขียนผู้สมัคร (อ้างอิง User model, **จำเป็น**)
 * @property {string} applicationReadableId - ID ที่มนุษย์อ่านได้สำหรับใบสมัคร (เช่น DA-2024-00001)
 * @property {string} applicationReason - เหตุผลที่ต้องการเปิดรับบริจาค หรือแผนการใช้เงินบริจาค (**จำเป็น**)
 * @property {string} [donationGoalDescription] - คำอธิบายเป้าหมายการรับบริจาค (เช่น "เพื่อซื้ออุปกรณ์ใหม่", "เพื่อเป็นกำลังใจ")
 * @property {number} [donationTargetAmount] - จำนวนเงินเป้าหมายที่ต้องการ (ถ้ามี, สกุลเงิน COIN)
 * @property {ISupportingDocument[]} [supportingDocuments] - เอกสารประกอบการสมัคร (ถ้ามี)
 * @property {string} [contactEmail] - อีเมลติดต่อสำหรับเรื่องนี้โดยเฉพาะ (ถ้าต่างจากอีเมลหลัก)
 * @property {DonationApplicationStatus} status - สถานะใบสมัคร (**จำเป็น**, default: `PENDING_REVIEW`)
 * @property {string} [adminNotes] - หมายเหตุจาก Admin (เช่น เหตุผลที่ปฏิเสธ, สิ่งที่ต้องแก้ไข)
 * @property {Types.ObjectId | IUser} [reviewedBy] - ID ของ Admin ผู้ตรวจสอบ (อ้างอิง User model - Admin role)
 * @property {Date} [reviewedAt] - วันที่ตรวจสอบและตัดสินใจ
 * @property {Date} submittedAt - วันที่ส่งใบสมัคร (**จำเป็น**, default: `Date.now`)
 * @property {Date} [lastStatusUpdateAt] - วันที่สถานะมีการเปลี่ยนแปลงล่าสุด
 * @property {number} schemaVersion - เวอร์ชันของ schema
 * @property {Date} createdAt - วันที่สร้างเอกสาร (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตเอกสารล่าสุด (Mongoose `timestamps`)
 */
export interface IDonationApplication extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId | IUser;
  applicationReadableId: string;
  applicationReason: string;
  donationGoalDescription?: string;
  donationTargetAmount?: number;
  supportingDocuments?: ISupportingDocument[];
  contactEmail?: string;
  status: DonationApplicationStatus;
  adminNotes?: string;
  reviewedBy?: Types.ObjectId | IUser;
  reviewedAt?: Date;
  submittedAt: Date;
  lastStatusUpdateAt?: Date;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ DonationApplication (DonationApplicationSchema)
// ==================================================================================================
const DonationApplicationSchema = new Schema<IDonationApplication>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุ ID ของผู้สมัคร (User ID is required)"],
      // unique: true, // พิจารณา: อาจอนุญาตให้ส่งใหม่ได้ถ้าอันเก่า rejected/cancelled หรือมีเงื่อนไขอื่นๆ
      index: true,
    },
    applicationReadableId: { 
      type: String, 
      required: [true, "กรุณาระบุ ID ที่อ่านได้ของใบสมัคร (Readable Application ID is required)"], 
      unique: true, 
      index: true 
    },
    applicationReason: {
      type: String,
      required: [true, "กรุณาระบุเหตุผลการสมัคร (Application reason is required)"],
      trim: true,
      minlength: [50, "เหตุผลการสมัครต้องมีอย่างน้อย 50 ตัวอักษร"],
      maxlength: [5000, "เหตุผลการสมัครต้องไม่เกิน 5000 ตัวอักษร"],
    },
    donationGoalDescription: {
      type: String,
      trim: true,
      maxlength: [1000, "คำอธิบายเป้าหมายการบริจาคต้องไม่เกิน 1000 ตัวอักษร"],
    },
    donationTargetAmount: {
      type: Number,
      min: [0, "จำนวนเงินเป้าหมายต้องไม่ติดลบ"],
    },
    supportingDocuments: { type: [SupportingDocumentSchema], default: [] },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "รูปแบบอีเมลไม่ถูกต้อง"],
      maxlength: [255, "อีเมลติดต่อต้องไม่เกิน 255 ตัวอักษร"],
    },
    status: {
      type: String,
      enum: Object.values(DonationApplicationStatus),
      default: DonationApplicationStatus.PENDING_REVIEW,
      required: [true, "กรุณาระบุสถานะใบสมัคร"],
      index: true,
    },
    adminNotes: { type: String, trim: true, maxlength: [2000, "หมายเหตุจาก Admin ต้องไม่เกิน 2000 ตัวอักษร"] },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" }, // Admin User
    reviewedAt: { type: Date, index: true },
    submittedAt: { type: Date, default: Date.now, required: true, index: true },
    lastStatusUpdateAt: { type: Date, index: true },
    schemaVersion: { type: Number, default: 1, min: 1 },
  },
  {
    timestamps: true, // createdAt, updatedAt
    collection: "donationapplications",
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

// Index สำหรับการค้นหาใบสมัครของผู้ใช้คนเดียว และสถานะปัจจุบัน
DonationApplicationSchema.index({ userId: 1, status: 1 }, { name: "UserApplicationStatusIndex" });
// Index สำหรับ Admin query ใบสมัครที่รอตรวจสอบ หรือตามสถานะต่างๆ เรียงตามวันที่ส่งล่าสุด
DonationApplicationSchema.index({ status: 1, submittedAt: -1 }, { name: "AdminApplicationQueryIndex" });
// Index สำหรับการค้นหาตามอีเมลติดต่อ (ถ้ามีการใช้)
DonationApplicationSchema.index({ contactEmail: 1 }, { sparse: true, name: "ContactEmailIndex" });

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

// Middleware ก่อน save
DonationApplicationSchema.pre<IDonationApplication>("save", async function (next) {
  // 1. สร้าง applicationReadableId ถ้ายังไม่มี (สำหรับเอกสารใหม่)
  if (this.isNew && !this.applicationReadableId) {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.applicationReadableId = `NVM-DA-${year}${month}${day}-${randomSuffix}`;
  }

  // 2. อัปเดต lastStatusUpdateAt เมื่อ status มีการเปลี่ยนแปลง
  if (this.isModified("status")) {
    this.lastStatusUpdateAt = new Date();
  }
  next();
});

// Middleware หลัง save (Post-save hook)
DonationApplicationSchema.post<IDonationApplication>("save", async function (doc, next) {
  // ตรวจสอบว่า status มีการเปลี่ยนแปลงหรือไม่ และเป็นสถานะที่ควรแจ้งเตือน/อัปเดต User model
  if (doc.isModified("status") || (doc.isNew && doc.status === DonationApplicationStatus.PENDING_REVIEW)) {
    const UserModel = models.User as mongoose.Model<IUser>;
    const NotificationModel = models.Notification as mongoose.Model<INotification>;

    let notificationTitle = "";
    let notificationMessage = "";
    let shouldSendNotification = true;
    let userUpdate: any = { "writerProfile.donationApplicationStatus": doc.status };

    switch (doc.status) {
      case DonationApplicationStatus.APPROVED:
        userUpdate["writerProfile.canReceiveDonations"] = true;
        notificationTitle = "ใบสมัครขอเปิดรับบริจาคของคุณได้รับการอนุมัติแล้ว";
        notificationMessage = `ยินดีด้วย! ตอนนี้คุณสามารถเปิดรับการบริจาคจากผู้อ่านบน NovelMaze ได้แล้ว ${doc.adminNotes ? `\nหมายเหตุจากผู้ดูแลระบบ: ${doc.adminNotes}` : ""}`;
        break;
      case DonationApplicationStatus.REJECTED:
        userUpdate["writerProfile.canReceiveDonations"] = false;
        notificationTitle = "ใบสมัครขอเปิดรับบริจาคของคุณถูกปฏิเสธ";
        notificationMessage = `เราเสียใจที่ต้องแจ้งให้ทราบว่าใบสมัครของคุณถูกปฏิเสธ ${doc.adminNotes ? `\nเนื่องจาก: ${doc.adminNotes}` : "กรุณาตรวจสอบรายละเอียดและติดต่อทีมงานหากมีข้อสงสัย"}`;
        break;
      case DonationApplicationStatus.REQUIRES_MORE_INFO:
        notificationTitle = "ใบสมัครขอเปิดรับบริจาคของคุณต้องการข้อมูลเพิ่มเติม";
        notificationMessage = `กรุณาให้ข้อมูลเพิ่มเติมสำหรับใบสมัครของคุณ ${doc.adminNotes ? `\nรายละเอียด: ${doc.adminNotes}` : "โปรดตรวจสอบและแก้ไขข้อมูลตามที่ผู้ดูแลระบบร้องขอ"}`;
        break;
      case DonationApplicationStatus.PENDING_REVIEW:
        if (doc.isNew) { // ส่งเฉพาะเมื่อสร้างใบสมัครใหม่
            notificationTitle = "เราได้รับใบสมัครขอเปิดรับบริจาคของคุณแล้ว";
            notificationMessage = "ทีมงาน NovelMaze กำลังตรวจสอบใบสมัครของคุณ โปรดรอการติดต่อกลับ";
        } else {
            shouldSendNotification = false; // ไม่ส่งถ้าเป็นการเปลี่ยนกลับมาเป็น PENDING
        }
        break;
      case DonationApplicationStatus.CANCELLED_BY_USER:
        userUpdate["writerProfile.canReceiveDonations"] = false;
        notificationTitle = "คุณได้ยกเลิกใบสมัครขอเปิดรับบริจาคแล้ว";
        notificationMessage = "ใบสมัครขอเปิดรับบริจาคของคุณได้ถูกยกเลิกตามคำขอเรียบร้อยแล้ว";
        break;
      default:
        shouldSendNotification = false;
        break;
    }

    // 1. อัปเดต User model
    if (Object.keys(userUpdate).length > 0) {
      try {
        await UserModel.findByIdAndUpdate(doc.userId, { $set: userUpdate });
      } catch (error) {
        console.error(`[DonationApplication Post-Save Hook] Error updating user ${doc.userId}:`, error);
        // อาจจะต้องมี error handling เพิ่มเติม เช่น retry หรือ logging ไปยังระบบ monitoring
      }
    }

    // 2. ส่ง Notification แจ้งผู้ใช้
    if (shouldSendNotification && notificationTitle && notificationMessage) {
      try {
        await NotificationModel.create({
          userId: doc.userId,
          type: "donation_application_status_update",
          title: notificationTitle,
          message: notificationMessage,
          relatedId: doc._id,
          relatedType: "DonationApplication",
          severity: doc.status === DonationApplicationStatus.APPROVED ? "success" : (doc.status === DonationApplicationStatus.REJECTED ? "error" : "info"),
        });
      } catch (error) {
        console.error(`[DonationApplication Post-Save Hook] Error creating notification for user ${doc.userId}:`, error);
      }
    }
  }
  next();
});

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

// ตรวจสอบว่า Model "DonationApplication" ถูกสร้างไปแล้วหรือยัง ถ้ายัง ให้สร้าง Model ใหม่
const DonationApplicationModel = 
  (models.DonationApplication as mongoose.Model<IDonationApplication>) ||
  model<IDonationApplication>("DonationApplication", DonationApplicationSchema);

export default DonationApplicationModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Unique Application**: การกำหนด `userId` เป็น unique อาจจะเข้มงวดเกินไป หากต้องการให้นักเขียนสามารถ
//     ยื่นใบสมัครใหม่ได้หลังจากถูกปฏิเสธ หรือยกเลิกอันเก่าไปแล้ว อาจจะต้องปรับ logic หรือเพิ่มเงื่อนไข
//     เช่น unique เฉพาะใบสมัครที่มีสถานะ `PENDING_REVIEW` หรือ `APPROVED`.
// 2.  **File Uploads**: สำหรับ `supportingDocuments`, การเก็บ URL นั้นดี แต่ระบบอาจจะต้องมี API สำหรับการอัปโหลดไฟล์
//     ไปยัง Cloud Storage (เช่น AWS S3, Google Cloud Storage) และจัดการเรื่องความปลอดภัยของไฟล์.
// 3.  **Workflow Automation**: อาจมีการเพิ่ม workflow ที่ซับซ้อนขึ้น เช่น การแจ้งเตือน Admin เมื่อมีใบสมัครใหม่,
//     การตั้งเวลาเตือนหากใบสมัครไม่ได้รับการตรวจสอบภายใน X วัน.
// 4.  **Audit Trail**: สำหรับการเปลี่ยนแปลงสถานะที่สำคัญ อาจมีการบันทึกประวัติการเปลี่ยนแปลง (Audit Log) แยกต่างหาก
//     เพื่อการตรวจสอบย้อนหลังได้ละเอียดยิ่งขึ้น.
// 5.  **Integration with Payment Setup**: หากการอนุมัติใบสมัครนี้เชื่อมโยงกับการตั้งค่าบัญชีรับเงินจริง
//     (เช่น Stripe, PayPal, หรือบัญชีธนาคาร) จะต้องมีการออกแบบ integration เพิ่มเติม.
// 6.  **Versioning**: `schemaVersion` มีไว้สำหรับการจัดการการเปลี่ยนแปลง schema ในอนาคต.
// 7.  **Error Handling in Hooks**: การจัดการ error ใน post-save hook ควรมีความรอบคอบ เพื่อไม่ให้กระทบต่อการทำงานหลัก
//     การ log error และการแจ้งเตือนผู้ดูแลระบบเป็นสิ่งสำคัญ.
// ==================================================================================================
