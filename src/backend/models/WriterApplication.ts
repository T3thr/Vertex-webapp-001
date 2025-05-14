// src/models/WriterApplication.ts
// โมเดลใบสมัครเป็นนักเขียน (WriterApplication Model) - จัดการกระบวนการสมัครเป็นนักเขียนบนแพลตฟอร์ม
// ออกแบบให้เก็บข้อมูลผู้สมัคร, รายละเอียดใบสมัคร, สถานะการพิจารณา, และผลการอนุมัติ

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// สถานะของใบสมัครเป็นนักเขียน
export type WriterApplicationStatus = 
  | "pending_review" // รอการตรวจสอบ
  | "approved" // อนุมัติแล้ว
  | "rejected" // ปฏิเสธ
  | "needs_more_info" // ต้องการข้อมูลเพิ่มเติม
  | "cancelled_by_user"; // ผู้ใช้ยกเลิกใบสมัคร

// อินเทอร์เฟซสำหรับข้อมูลการตรวจสอบใบสมัคร
export interface IApplicationReview {
  reviewedBy: Types.ObjectId; // ผู้ใช้ (Admin/Moderator) ที่ทำการตรวจสอบ
  reviewedAt: Date; // วันที่ตรวจสอบ
  decision: "approved" | "rejected" | "needs_more_info"; // ผลการตัดสินใจ
  notes?: string; // หมายเหตุเพิ่มเติมจากการตรวจสอบ (เช่น เหตุผลการปฏิเสธ, สิ่งที่ต้องการเพิ่มเติม)
}

// อินเทอร์เฟซหลักสำหรับเอกสารใบสมัครเป็นนักเขียน (WriterApplication Document)
export interface IWriterApplication extends Document {
  _id: Types.ObjectId;
  applicantUser: Types.ObjectId; // ID ของผู้ใช้ที่สมัคร (อ้างอิง User model)
  applicationDate: Date; // วันที่ส่งใบสมัคร
  
  // รายละเอียดในใบสมัคร (ผู้ใช้อาจต้องกรอกข้อมูลเหล่านี้)
  motivation?: string; // แรงจูงใจในการเป็นนักเขียน (เช่น Markdown หรือ text)
  writingSampleLinks?: Array<{ title?: string; url: string; description?: string }>; // ลิงก์ผลงานตัวอย่าง
  // writingSampleText?: string; // หรือให้กรอกผลงานตัวอย่างโดยตรง
  preferredGenres?: Array<Types.ObjectId>; // หมวดหมู่นิยายที่สนใจจะเขียน (อ้างอิง Category model)
  agreedToTerms: boolean; // ยอมรับข้อตกลงและเงื่อนไขการเป็นนักเขียนหรือไม่
  
  status: WriterApplicationStatus; // สถานะปัจจุบันของใบสมัคร
  
  // ประวัติการตรวจสอบ (อาจมีหลายครั้งถ้ามีการขอข้อมูลเพิ่มเติม)
  reviewHistory?: Types.DocumentArray<IApplicationReview>; 
  currentReviewNotes?: string; // หมายเหตุล่าสุดจากผู้ตรวจสอบ (อาจแสดงให้ผู้สมัครเห็น)
  
  // วันที่สถานะมีการเปลี่ยนแปลงล่าสุด
  statusUpdatedAt: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Schema ย่อยสำหรับ IApplicationReview
const ApplicationReviewSchema = new Schema<IApplicationReview>(
  {
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reviewedAt: { type: Date, default: Date.now, required: true },
    decision: { type: String, enum: ["approved", "rejected", "needs_more_info"], required: true },
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  { _id: false } // ไม่จำเป็นต้องมี _id แยกสำหรับ sub-document นี้
);

// Schema หลักสำหรับ WriterApplication
const WriterApplicationSchema = new Schema<IWriterApplication>(
  {
    applicantUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // โดยทั่วไป หนึ่งผู้ใช้ควรมีใบสมัครที่ active ได้เพียงใบเดียว หรือใบสมัครล่าสุด
      index: true,
    },
    applicationDate: { type: Date, default: Date.now, required: true },
    motivation: { type: String, trim: true, maxlength: 5000 },
    writingSampleLinks: [
      {
        title: { type: String, trim: true, maxlength: 200 },
        url: { type: String, trim: true, required: true, maxlength: 500 },
        description: { type: String, trim: true, maxlength: 1000 },
        _id: false
      }
    ],
    preferredGenres: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    agreedToTerms: { type: Boolean, required: [true, "ผู้สมัครต้องยอมรับข้อตกลงและเงื่อนไข"] },
    status: {
      type: String,
      enum: ["pending_review", "approved", "rejected", "needs_more_info", "cancelled_by_user"],
      default: "pending_review",
      required: true,
      index: true,
    },
    reviewHistory: [ApplicationReviewSchema],
    currentReviewNotes: { type: String, trim: true, maxlength: 2000 },
    statusUpdatedAt: { type: Date, default: Date.now, required: true },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ----- Indexes -----
WriterApplicationSchema.index({ status: 1, applicationDate: -1 }); // สำหรับ query ใบสมัครตามสถานะและวันที่
WriterApplicationSchema.index({ applicantUser: 1, status: 1 }); // ตรวจสอบสถานะใบสมัครล่าสุดของผู้ใช้

// ----- Middleware -----
// อัปเดต statusUpdatedAt เมื่อ status เปลี่ยนแปลง
WriterApplicationSchema.pre("save", async function (next) {
  if (this.isModified("status")) {
    this.statusUpdatedAt = new Date();
    
    // เมื่อสถานะเป็น "approved", อัปเดต User model ให้ isWriter = true และ writerStats.writerSince
    if (this.status === "approved") {
      const User = models.User || model("User");
      try {
        await User.findByIdAndUpdate(this.applicantUser, {
          $set: {
            isWriter: true,
            "writerProfile.writerSince": new Date(), // สมมติว่ามี writerProfile ใน User model
            // "writerStats.applicationStatus": "approved", // อาจจะซ้ำซ้อน ถ้ามี writerStats schema
            // "writerStats.writerSince": new Date(), // หรืออัปเดตใน writerStats โดยตรง
          }
        });
        // อาจมีการสร้าง Notification แจ้งผู้ใช้
      } catch (error) {
        console.error(`Error updating User ${this.applicantUser} to writer:`, error);
        // ควรพิจารณา transaction หรือ rollback logic ถ้าการอัปเดต User ล้มเหลว
        return next(new Error("เกิดข้อผิดพลาดในการอัปเดตสถานะผู้ใช้เป็นนักเขียน"));
      }
    } else if (this.status === "rejected" || this.status === "cancelled_by_user") {
        // ถ้าเคย approved แล้วถูก rejected/cancelled ทีหลัง (กรณีพิเศษ), อาจต้อง revert isWriter
        // แต่โดยทั่วไป, การ reject จะเกิดก่อน approve
        // const User = models.User || model("User");
        // await User.findByIdAndUpdate(this.applicantUser, { $set: { isWriter: false } });
    }
  }
  next();
});

// ----- Model Export -----
const WriterApplicationModel = () => models.WriterApplication as mongoose.Model<IWriterApplication> || model<IWriterApplication>("WriterApplication", WriterApplicationSchema);

export default WriterApplicationModel;

