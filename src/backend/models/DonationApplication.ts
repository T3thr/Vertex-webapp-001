```typescript
// src/models/DonationApplication.ts
// โมเดลคำขอเปิดรับบริจาค (Donation Application Model)
// จัดการกระบวนการที่นักเขียนยื่นคำขอเพื่อเปิดใช้งานฟังก์ชันการรับบริจาค
// ทั้งสำหรับตัวนักเขียนเอง หรือสำหรับตัวละครในนิยายออริจินัลของพวกเขา

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// ประเภทของการเปิดรับบริจาค
export type DonationTargetType = 
  | "author_direct" // บริจาคให้นักเขียนโดยตรง
  | "novel_character"; // บริจาคให้ตัวละครในนิยาย (เฉพาะนิยาย Original)

// สถานะของคำขอเปิดรับบริจาค
export type ApplicationStatus = 
  | "pending_verification" // รอดำเนินการตรวจสอบ (นักเขียนส่งคำขอแล้ว)
  | "awaiting_documents" // รอเอกสารเพิ่มเติม (เช่น เอกสารยืนยันตัวตน)
  | "under_review" // กำลังตรวจสอบโดยทีมงาน
  | "approved" // อนุมัติแล้ว (นักเขียนสามารถเปิดรับบริจาคได้)
  | "rejected" // ไม่อนุมัติ (พร้อมเหตุผล)
  | "active" // เปิดรับบริจาคอยู่ (หลังจาก approved และนักเขียนเปิดใช้งาน)
  | "paused_by_author" // นักเขียนพักการรับบริจาคชั่วคราว
  | "paused_by_admin" // ทีมงานระงับการรับบริจาคชั่วคราว
  | "closed"; // ปิดการรับบริจาคถาวร (โดยนักเขียนหรือทีมงาน)

// ข้อมูลการยืนยันตัวตน (Identity Verification Details)
// ส่วนนี้ควรออกแบบให้สอดคล้องกับข้อกำหนด KYC/AML และกฎหมายที่เกี่ยวข้อง
// อาจต้องใช้บริการ 3rd party สำหรับการยืนยันตัวตนที่ปลอดภัย
export interface IIdentityVerification {
  verificationMethod: "national_id" | "passport" | "other"; // วิธีการยืนยันตัวตน
  documentFrontUrl?: string; // URL รูปภาพด้านหน้าของเอกสาร (ควรเก็บใน storage ที่ปลอดภัย)
  documentBackUrl?: string; // URL รูปภาพด้านหลังของเอกสาร (ถ้ามี)
  selfieWithDocumentUrl?: string; // URL รูปภาพเซลฟี่พร้อมเอกสาร
  submissionDate: Date; // วันที่ส่งเอกสาร
  verificationStatus: "pending" | "approved" | "rejected" | "requires_resubmission"; // สถานะการตรวจสอบเอกสาร
  verifiedBy?: Types.ObjectId; // ID ของ admin ที่ตรวจสอบ (อ้างอิง User model ที่มี role admin)
  verifiedAt?: Date; // วันที่ตรวจสอบเอกสาร
  rejectionReason?: string; // เหตุผลที่ไม่ผ่านการตรวจสอบ (ถ้ามี)
  // หมายเหตุ: ข้อมูลส่วนบุคคลควรมีการเข้ารหัสและจัดการอย่างระมัดระวัง
}

// การตั้งค่าช่องทางการรับเงิน (Payout Configuration)
// ควรออกแบบให้รองรับหลายช่องทาง และปลอดภัย
export interface IPayoutSettings {
  payoutMethod: "bank_transfer" | "paypal" | "other_digital_wallet"; // ช่องทางการรับเงิน
  accountHolderName: string; // ชื่อบัญชี
  bankName?: string; // ชื่อธนาคาร (ถ้าเป็น bank_transfer)
  accountNumber?: string; // เลขที่บัญชี (ถ้าเป็น bank_transfer, ควรเข้ารหัส)
  swiftCode?: string; // SWIFT/BIC (ถ้าเป็น bank_transfer ระหว่างประเทศ)
  paypalEmail?: string; // อีเมล PayPal (ถ้าเป็น paypal)
  walletId?: string; // ID ของ Digital Wallet (ถ้าเป็น other_digital_wallet)
  isVerified: boolean; // ช่องทางนี้ผ่านการตรวจสอบแล้วหรือยัง
  // หมายเหตุ: ข้อมูลทางการเงินควรมีการเข้ารหัสและจัดการอย่างระมัดระวัง
}

// ----- Interface หลักสำหรับเอกสารคำขอเปิดรับบริจาค (Donation Application Document) -----
export interface IDonationApplication extends Document {
  _id: Types.ObjectId;
  applicant: Types.ObjectId; // ID ของนักเขียนผู้ยื่นคำขอ (อ้างอิง User model)
  
  applicationType: DonationTargetType; // ประเภทการเปิดรับบริจาค (ให้นักเขียน หรือ ให้ตัวละคร)
  // ตัวอย่าง: applicationType: "author_direct"
  
  // กรณีบริจาคให้ตัวละคร
  targetNovel?: Types.ObjectId; // ID ของนิยาย (อ้างอิง Novel model, เฉพาะนิยาย Original)
  // ตัวอย่าง: targetNovel: "novel_id_of_original_story"
  targetCharacter?: Types.ObjectId; // ID ของตัวละคร (อ้างอิง Character model, ภายใน targetNovel)
  // ตัวอย่าง: targetCharacter: "character_id_within_novel"
  
  // สถานะของคำขอ
  status: ApplicationStatus; // สถานะปัจจุบันของคำขอ
  // ตัวอย่าง: status: "pending_verification"
  statusReason?: string; // เหตุผลเพิ่มเติมสำหรับสถานะปัจจุบัน (เช่น เหตุผลที่ถูก reject)
  
  // ข้อมูลการยืนยันตัวตนของนักเขียน (จำเป็นสำหรับการเปิดรับบริจาคทุกประเภท)
  identityVerification?: IIdentityVerification;
  isIdentityVerified: boolean; // นักเขียนคนนี้ผ่านการยืนยันตัวตนแล้วหรือยัง (อาจเป็น flag รวม)
  
  // การตั้งค่าช่องทางการรับเงิน (เมื่อ identity verified และ application approved)
  payoutSettings?: IPayoutSettings;
  
  // ข้อความหรือรายละเอียดที่นักเขียนต้องการแสดงบนหน้าโปรไฟล์การรับบริจาค
  donationPageMessage?: string; // เช่น "ขอบคุณทุกการสนับสนุนที่จะเป็นกำลังใจในการสร้างสรรค์ผลงานต่อไปค่ะ"
  donationGoals?: Array<{ // เป้าหมายการบริจาค (ถ้ามี)
    description: string; // เช่น "ค่าอุปกรณ์วาดรูปใหม่", "ค่ากาแฟให้นักเขียน"
    targetAmount: number;
    currentAmount: number;
    currency: string; // เช่น "COIN", "THB"
  }>;
  
  // การตั้งค่าการแสดงผล (เช่น แสดงยอดผู้บริจาคล่าสุด, แสดงข้อความขอบคุณ)
  displaySettings?: {
    showRecentDonors?: boolean;
    showTotalAmountRaised?: boolean; // อาจต้องพิจารณาความเป็นส่วนตัว
    defaultThankYouMessage?: string; // ข้อความขอบคุณอัตโนมัติหลังการบริจาค
  };
  
  // ประวัติการเปลี่ยนแปลงสถานะ
  statusHistory?: Array<{
    status: ApplicationStatus;
    changedAt: Date;
    changedBy?: Types.ObjectId; // User ID ของ admin หรือ applicant
    reason?: string;
  }>;
  
  // หมายเหตุจากทีมงาน (สำหรับภายใน)
  adminNotes?: string;
  
  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;

  // Timestamps
  createdAt: Date; // วันที่ยื่นคำขอ
  updatedAt: Date; // วันที่อัปเดตล่าสุด
  approvedAt?: Date; // วันที่อนุมัติคำขอ
  activatedAt?: Date; // วันที่นักเขียนเริ่มเปิดรับบริจาคจริง
}

// ----- Schema ย่อย -----
const IdentityVerificationSchema = new Schema<IIdentityVerification>(
  {
    verificationMethod: { type: String, enum: ["national_id", "passport", "other"], required: true },
    documentFrontUrl: { type: String, trim: true },
    documentBackUrl: { type: String, trim: true },
    selfieWithDocumentUrl: { type: String, trim: true },
    submissionDate: { type: Date, default: Date.now },
    verificationStatus: { type: String, enum: ["pending", "approved", "rejected", "requires_resubmission"], default: "pending" },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: Date,
    rejectionReason: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: false }
);

const PayoutSettingsSchema = new Schema<IPayoutSettings>(
  {
    payoutMethod: { type: String, enum: ["bank_transfer", "paypal", "other_digital_wallet"], required: true },
    accountHolderName: { type: String, required: true, trim: true },
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true }, // ควรเข้ารหัส
    swiftCode: { type: String, trim: true },
    paypalEmail: { type: String, trim: true, lowercase: true },
    walletId: { type: String, trim: true },
    isVerified: { type: Boolean, default: false },
  },
  { _id: false }
);

const DonationGoalSchema = new Schema(
  {
    description: { type: String, required: true, trim: true, maxlength: 200 },
    targetAmount: { type: Number, required: true, min: 0 },
    currentAmount: { type: Number, default: 0, min: 0 },
    currency: { type: String, required: true, trim: true, uppercase: true, maxlength: 10 },
  },
  { _id: false }
);

const StatusHistorySchema = new Schema(
  {
    status: { type: String, enum: Object.values(ApplicationStatus), required: true }, // ใช้ enum values จาก type โดยตรง
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reason: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false }
);

// Schema หลักสำหรับ DonationApplication
const DonationApplicationSchema = new Schema<IDonationApplication>(
  {
    applicant: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    applicationType: {
      type: String,
      enum: Object.values(DonationTargetType),
      required: [true, "ประเภทการเปิดรับบริจาคคือจำเป็น"],
      index: true,
    },
    targetNovel: { type: Schema.Types.ObjectId, ref: "Novel", index: true },
    targetCharacter: { type: Schema.Types.ObjectId, ref: "Character", index: true }, // ควร validate ว่า character อยู่ใน novel ที่ระบุ
    status: {
      type: String,
      enum: Object.values(ApplicationStatus),
      default: "pending_verification",
      required: true,
      index: true,
    },
    statusReason: { type: String, trim: true, maxlength: 1000 },
    identityVerification: IdentityVerificationSchema,
    isIdentityVerified: { type: Boolean, default: false, index: true },
    payoutSettings: PayoutSettingsSchema,
    donationPageMessage: { type: String, trim: true, maxlength: 5000 },
    donationGoals: [DonationGoalSchema],
    displaySettings: {
      showRecentDonors: { type: Boolean, default: true },
      showTotalAmountRaised: { type: Boolean, default: false },
      defaultThankYouMessage: { type: String, trim: true, maxlength: 1000 },
    },
    statusHistory: [StatusHistorySchema],
    adminNotes: { type: String, trim: true, maxlength: 5000 },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    approvedAt: Date,
    activatedAt: Date,
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----- Indexes -----
DonationApplicationSchema.index({ applicant: 1, applicationType: 1 });
DonationApplicationSchema.index({ status: 1, isIdentityVerified: 1 });
DonationApplicationSchema.index({ targetNovel: 1, targetCharacter: 1 }, { unique: true, partialFilterExpression: { targetCharacter: { $exists: true } } }); // ป้องกันการสร้าง application ซ้ำสำหรับตัวละครเดียวกัน
DonationApplicationSchema.index({ applicant: 1, applicationType: "author_direct" }, { unique: true, partialFilterExpression: { applicationType: "author_direct"} }); // ป้องกันการสร้าง application ซ้ำสำหรับนักเขียนคนเดียวกันที่บริจาคโดยตรง

// ----- Middleware -----
DonationApplicationSchema.pre<IDonationApplication>("save", function (next) {
  // เพิ่ม status ปัจจุบันเข้า history ถ้า status มีการเปลี่ยนแปลง
  if (this.isModified("status")) {
    this.statusHistory = this.statusHistory || [];
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
      // changedBy: ควรมาจาก context ของผู้ที่ทำการเปลี่ยนแปลง
      reason: this.statusReason || "สถานะมีการเปลี่ยนแปลง"
    });
  }

  // ถ้า applicationType ไม่ใช่ novel_character ให้ล้าง targetNovel และ targetCharacter
  if (this.applicationType !== "novel_character") {
    this.targetNovel = undefined;
    this.targetCharacter = undefined;
  }
  
  // ถ้า status เป็น approved และ isIdentityVerified เป็น true ควรตั้งค่า approvedAt
  if (this.status === "approved" && this.isIdentityVerified && !this.approvedAt) {
    this.approvedAt = new Date();
  }

  // ถ้า status เป็น active และ !activatedAt ควรตั้งค่า activatedAt
  if (this.status === "active" && !this.activatedAt) {
    this.activatedAt = new Date();
  }

  next();
});

// ----- Validation Logic (ควรอยู่ใน Service Layer แต่ใส่เป็นแนวคิด) -----
// async function validateNovelAndCharacter(this: IDonationApplication, next: Function) {
//   if (this.applicationType === "novel_character") {
//     if (!this.targetNovel) {
//       return next(new Error("Novel ID is required for character donation application."));
//     }
//     if (!this.targetCharacter) {
//       return next(new Error("Character ID is required for character donation application."));
//     }
//     // TODO: ตรวจสอบว่า Novel เป็น Original และ Character อยู่ใน Novel นั้นจริงๆ
//     // const novel = await NovelModel().findById(this.targetNovel);
//     // if (!novel || novel.sourceType.subItemSlug !== "original") {
//     //   return next(new Error("Donations only allowed for characters in Original novels."));
//     // }
//     // const character = await CharacterModel().findOne({ _id: this.targetCharacter, novel: this.targetNovel });
//     // if (!character) {
//     //   return next(new Error("Character not found in the specified novel."));
//     // }
//   }
//   next();
// }
// DonationApplicationSchema.pre("save", validateNovelAndCharacter);

// ----- Model Export -----
const DonationApplicationModel = () => models.DonationApplication as mongoose.Model<IDonationApplication> || model<IDonationApplication>("DonationApplication", DonationApplicationSchema);

export default DonationApplicationModel;

// ----- ตัวอย่างการใช้งาน -----
/**
 * // 1. นักเขียนยื่นคำขอเปิดรับบริจาคให้ตัวเอง
 * const authorDonationApp = await DonationApplicationModel().create({
 *   applicant: "userId_of_writer",
 *   applicationType: "author_direct",
 *   identityVerification: {
 *     verificationMethod: "national_id",
 *     documentFrontUrl: "/secure/path/to/id_front.jpg",
 *     submissionDate: new Date(),
 *   },
 *   donationPageMessage: "สนับสนุนผลงานของฉันได้ที่นี่ค่ะ!"
 * });
 *
 * // 2. นักเขียนยื่นคำขอเปิดรับบริจาคให้ตัวละครในนิยาย Original
 * const characterDonationApp = await DonationApplicationModel().create({
 *   applicant: "userId_of_writer",
 *   applicationType: "novel_character",
 *   targetNovel: "novelId_of_original_story",
 *   targetCharacter: "characterId_in_that_novel",
 *   identityVerification: { ... }, // ข้อมูลยืนยันตัวตน (อาจดึงจาก User model ถ้าเคยยืนยันแล้ว)
 *   donationPageMessage: "ร่วมสนับสนุนการเดินทางของ 'ชื่อตัวละคร' ได้เลย!",
 *   donationGoals: [{ description: "ชุดเกราะใหม่ให้ 'ชื่อตัวละคร'", targetAmount: 5000, currency: "COIN" }]
 * });
 *
 * // 3. Admin ตรวจสอบและอนุมัติ (สมมติว่า identity verified แล้ว)
 * await DonationApplicationModel().findByIdAndUpdate(authorDonationApp._id, {
 *   status: "approved",
 *   isIdentityVerified: true, // สมมติว่าผ่านการตรวจสอบเอกสารแล้ว
 *   approvedAt: new Date(),
 *   payoutSettings: {
 *     payoutMethod: "bank_transfer",
 *     accountHolderName: "ชื่อ-นามสกุล นักเขียน",
 *     bankName: "ธนาคาร X",
 *     accountNumber: "เลขที่บัญชี (เข้ารหัส)",
 *     isVerified: true
 *   }
 * });
 *
 * // 4. นักเขียนเปิดใช้งานการรับบริจาค (หลังจาก approved)
 * await DonationApplicationModel().findByIdAndUpdate(authorDonationApp._id, {
 *   status: "active",
 *   activatedAt: new Date()
 * });
 */
```

