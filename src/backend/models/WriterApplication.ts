// src/backend/models/WriterApplication.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface for supporting documents in a writer application
export interface IApplicationDocument extends Document {
  documentType: "id_card_copy" | "portfolio_link" | "writing_sample" | "resume_cv" | "other"; // ประเภทเอกสาร
  url?: string; // URL ของเอกสาร (ถ้าเป็น link หรือ cloud storage)
  filePath?: string; // Path ของไฟล์ (ถ้าอัปโหลดโดยตรงและเก็บในระบบ)
  fileName?: string; // ชื่อไฟล์เดิม
  fileType?: string; // MIME type
  description?: string; // คำอธิบายสั้นๆ เกี่ยวกับเอกสาร
  uploadedAt: Date;
}

// Interface for WriterApplication document
// Renamed from WriterVerification for clarity, as it represents an application process.
export interface IWriterApplication extends Document {
  user: Types.ObjectId; // ผู้ใช้ที่สมัคร (อ้างอิง User model, unique to ensure one active application)
  // Personal and Contact Information (some might be pre-filled from User profile)
  legalFullName: string; // ชื่อ-นามสกุลตามกฎหมาย (สำหรับการยืนยันตัวตน)
  penName: string; // นามปากกาที่ต้องการใช้ (อาจต่างจาก User.profile.displayName)
  contactEmail: string; // อีเมลสำหรับติดต่อเรื่องการสมัคร (อาจต่างจาก User.email)
  phoneNumber?: string; // เบอร์โทรศัพท์ (optional, for verification or urgent contact)
  // Verification and Experience
  identityVerificationDetails?: {
    idCardNumberHash?: string; // Hash ของเลขบัตรประชาชน (ไม่เก็บตัวจริง)
    verificationMethod?: "id_upload" | "external_kyc";
  };
  writingExperienceSummary: string; // สรุปประสบการณ์การเขียน (max 2000 chars)
  portfolioLinks?: string[]; // ลิงก์ไปยังผลงาน (e.g., blog, online portfolio)
  preferredGenres: Types.ObjectId[]; // แนวที่ถนัด (อ้างอิง Category model, type: "genre")
  // Application Content
  motivationStatement: string; // แรงจูงใจในการเป็นนักเขียนกับแพลตฟอร์ม (max 3000 chars)
  writingSamplesText?: string[]; // ตัวอย่างงานเขียน (ถ้าให้กรอก text โดยตรง)
  supportingDocuments: IApplicationDocument[]; // เอกสารประกอบการสมัคร
  // Application Status and Processing
  status: 
    | "draft" // ผู้ใช้ยังกรอกไม่เสร็จ
    | "submitted" // ส่งใบสมัครแล้ว รอการตรวจสอบเบื้องต้น
    | "pending_review" // กำลังตรวจสอบโดยทีมงาน
    | "additional_info_required" // ต้องการข้อมูลเพิ่มเติม
    | "approved" // อนุมัติแล้ว
    | "rejected" // ปฏิเสธ
    | "on_hold"; // พักการพิจารณา
  statusReason?: string; // เหตุผลสำหรับสถานะ (e.g., reason for rejection or needing more info)
  submittedAt?: Date; // วันที่ส่งใบสมัคร
  reviewedBy?: Types.ObjectId; // ผู้ดูแลที่ตรวจสอบ (อ้างอิง User model - admin/moderator role)
  reviewedAt?: Date; // วันที่ตรวจสอบล่าสุด
  adminNotes?: string; // บันทึกภายในสำหรับผู้ดูแล
  // Agreement and Consent
  agreedToTerms: boolean; // ยอมรับข้อตกลงการเป็นนักเขียนหรือไม่
  termsVersion?: string; // Version ของข้อตกลงที่ยอมรับ
  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationDocumentSchema = new Schema<IApplicationDocument>(
  {
    documentType: {
      type: String,
      enum: ["id_card_copy", "portfolio_link", "writing_sample", "resume_cv", "other"],
      required: true,
    },
    url: { type: String, trim: true },
    filePath: { type: String, trim: true },
    fileName: { type: String, trim: true },
    fileType: { type: String, trim: true },
    description: { type: String, trim: true, maxlength: 250 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const WriterApplicationSchema = new Schema<IWriterApplication>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    legalFullName: { type: String, required: true, trim: true, maxlength: 150 },
    penName: { type: String, required: true, trim: true, maxlength: 100, index: true },
    contactEmail: { type: String, required: true, trim: true, lowercase: true, match: [/^\S+@\S+\.\S+$/, "รูปแบบอีเมลไม่ถูกต้อง"] },
    phoneNumber: { type: String, trim: true },
    identityVerificationDetails: {
      idCardNumberHash: { type: String, select: false }, // Store hash, not plain text
      verificationMethod: { type: String, enum: ["id_upload", "external_kyc"] },
    },
    writingExperienceSummary: { type: String, required: true, trim: true, maxlength: 2000 },
    portfolioLinks: [{ type: String, trim: true }],
    preferredGenres: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    motivationStatement: { type: String, required: true, trim: true, maxlength: 3000 },
    writingSamplesText: [{ type: String, trim: true, maxlength: 10000 }], // Max length per sample
    supportingDocuments: [ApplicationDocumentSchema],
    status: {
      type: String,
      enum: ["draft", "submitted", "pending_review", "additional_info_required", "approved", "rejected", "on_hold"],
      default: "draft",
      required: true,
      index: true,
    },
    statusReason: { type: String, trim: true, maxlength: 1000 },
    submittedAt: Date,
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    adminNotes: { type: String, trim: true, maxlength: 2000, select: false },
    agreedToTerms: { type: Boolean, default: false },
    termsVersion: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ----- Indexes -----
WriterApplicationSchema.index({ status: 1, createdAt: -1 }); // For admin queues
WriterApplicationSchema.index({ user: 1, status: 1 });
WriterApplicationSchema.index({ penName: "text", legalFullName: "text" }); // For searching applications

// ----- Middleware -----
WriterApplicationSchema.pre("save", async function (next) {
  if (this.isModified("status") && this.status === "submitted" && !this.submittedAt) {
    this.submittedAt = new Date();
  }

  // When approved, update User model
  if (this.isModified("status") && this.status === "approved") {
    const UserModel = models.User || model("User");
    try {
      await UserModel.findByIdAndUpdate(this.user, {
        $addToSet: { roles: "Writer" }, // Add "Writer" role if not already present
        "profile.penName": this.penName, // Update or set pen name in user profile
        "profile.isVerifiedWriter": true,
        // Potentially copy other relevant approved info to User.writerProfile if such a sub-document exists
      });
      console.log(`User ${this.user} role updated to Writer and pen name set to ${this.penName}.`);
    } catch (error) {
      console.error(`Error updating user ${this.user} upon writer application approval:`, error);
      // Decide if this should block saving the application or just log the error
      // For now, let it save but log error.
    }
  }
  // TODO: Add logic for when status changes FROM approved (e.g., revoked)

  // Soft delete handling
  if (this.isModified("isDeleted") && this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  next();
});

// ----- Model Export -----
// Renamed to WriterApplicationModel for clarity
const WriterApplicationModel = () =>
  models.WriterApplication as mongoose.Model<IWriterApplication> || model<IWriterApplication>("WriterApplication", WriterApplicationSchema);

export default WriterApplicationModel;

