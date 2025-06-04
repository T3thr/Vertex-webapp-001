// src/backend/models/WriterApplication.ts
// โมเดลใบสมัครนักเขียน (WriterApplication Model)
// จัดการข้อมูลการสมัครเป็นนักเขียนบนแพลตฟอร์ม DivWy
// เน้นความง่ายและการยืนยันตัวตนสำหรับกลุ่มเป้าหมายวัยรุ่นและนักเขียนหน้าใหม่
// ปรับปรุงให้ทำงานร่วมกับ User Model ได้อย่างถูกต้อง

import mongoose, { Schema, model, models, Types, Document, Model } from "mongoose";
import { IUser } from "./User"; // อ้างอิง User model

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล WriterApplication
// ==================================================================================================

/**
 * @enum {string} WriterApplicationStatus
 * @description สถานะของใบสมัครนักเขียน
 * - `PENDING_REVIEW`: รอการตรวจสอบ (สถานะเริ่มต้น)
 * - `UNDER_REVIEW`: กำลังอยู่ในระหว่างการตรวจสอบโดยทีมงาน
 * - `APPROVED`: ได้รับการอนุมัติ
 * - `REJECTED`: ถูกปฏิเสธ
 * - `REQUIRES_MORE_INFO`: ต้องการข้อมูลเพิ่มเติมจากผู้สมัคร
 * - `CANCELLED`: ผู้สมัครยกเลิกเอง
 */
export enum WriterApplicationStatus {
  PENDING_REVIEW = "PENDING_REVIEW",
  UNDER_REVIEW = "UNDER_REVIEW",
  REQUIRES_MORE_INFO = "REQUIRES_MORE_INFO",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED"
}

/**
 * @enum {string} WriterLevel
 * @description ระดับของนักเขียนที่จะได้รับเมื่อได้รับการอนุมัติ
 * - `BEGINNER`: นักเขียนมือใหม่
 * - `INTERMEDIATE`: นักเขียนระดับกลาง
 * - `ADVANCED`: นักเขียนระดับสูง
 */
export enum WriterLevel {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
}

/**
 * @enum {string} WritingFrequency
 * @description ความถี่ในการเขียนนิยายโดยประมาณ
 * - `DAILY`: ทุกวัน
 * - `WEEKLY`: สัปดาห์ละครั้ง
 * - `BIWEEKLY`: สองสัปดาห์ครั้ง
 * - `MONTHLY`: เดือนละครั้ง
 * - `IRREGULAR`: ไม่แน่นอน
 */
export enum WritingFrequency {
  DAILY = "daily",
  WEEKLY = "weekly",
  BIWEEKLY = "biweekly",
  MONTHLY = "monthly",
  IRREGULAR = "irregular",
}

/**
 * @interface IPortfolioItem
 * @description ลิงก์ผลงานของผู้สมัคร (จำกัดไม่เกิน 3 รายการ)
 * @property {string} title - ชื่อผลงาน (เช่น "นิยายเรื่อง...", "บล็อก...", "งานวาด...")
 * @property {string} url - URL ของผลงาน
 * @property {string} [description] - คำอธิบายสั้นๆ เกี่ยวกับผลงาน (ไม่เกิน 200 ตัวอักษร)
 */
export interface IPortfolioItem {
  title: string;
  url: string;
  description?: string;
}

/**
 * @const PortfolioItemSchema
 * @description สกีมาสำหรับผลงานของผู้สมัคร
 */
const PortfolioItemSchema = new Schema<IPortfolioItem>(
  {
    title: {
      type: String,
      required: [true, "กรุณาระบุชื่อผลงาน"],
      trim: true,
      maxlength: [100, "ชื่อผลงานต้องไม่เกิน 100 ตัวอักษร"],
    },
    url: {
      type: String,
      required: [true, "กรุณาระบุ URL ของผลงาน"],
      trim: true,
      maxlength: [500, "URL ต้องไม่เกิน 500 ตัวอักษร"],
      validate: {
        validator: function (v: string) {
          try {
            new URL(v);
            return true;
          } catch (e) {
            return false;
          }
        },
        message: "URL ไม่ถูกต้อง กรุณาระบุ URL ที่สมบูรณ์ เช่น https://example.com",
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, "คำอธิบายต้องไม่เกิน 200 ตัวอักษร"],
    },
  },
  { _id: false }
);

/**
 * @interface IReviewNote
 * @description บันทึกจากผู้ตรวจสอบใบสมัคร
 * @property {Types.ObjectId} reviewerId - ID ของผู้ตรวจสอบ (Admin/Moderator)
 * @property {string} note - ข้อความบันทึก
 * @property {Date} createdAt - วันที่สร้างบันทึก
 */
export interface IReviewNote {
  reviewerId: Types.ObjectId;
  note: string;
  createdAt: Date;
}

/**
 * @const ReviewNoteSchema
 * @description สกีมาสำหรับบันทึกจากผู้ตรวจสอบ
 */
const ReviewNoteSchema = new Schema<IReviewNote>(
  {
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุ ID ของผู้ตรวจสอบ"],
    },
    note: {
      type: String,
      required: [true, "กรุณาระบุข้อความบันทึก"],
      trim: true,
      maxlength: [1000, "บันทึกต้องไม่เกิน 1000 ตัวอักษร"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

/**
 * @interface IApplicantMessage
 * @description ข้อความจากผู้สมัครตอบกลับการขอข้อมูลเพิ่มเติม
 * @property {string} message - ข้อความจากผู้สมัคร
 * @property {Date} sentAt - วันที่ส่งข้อความ
 */
export interface IApplicantMessage {
  message: string;
  sentAt: Date;
}

/**
 * @const ApplicantMessageSchema
 * @description สกีมาสำหรับข้อความจากผู้สมัคร
 */
const ApplicantMessageSchema = new Schema<IApplicantMessage>(
  {
    message: {
      type: String,
      required: [true, "กรุณาระบุข้อความ"],
      trim: true,
      maxlength: [1000, "ข้อความต้องไม่เกิน 1000 ตัวอักษร"],
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

/**
 * @interface IStatusChange
 * @description บันทึกการเปลี่ยนสถานะของใบสมัคร
 * @property {WriterApplicationStatus} status - สถานะที่เปลี่ยนเป็น
 * @property {Types.ObjectId} [changedBy] - ID ของผู้เปลี่ยนสถานะ (Admin/Moderator หรือระบบ)
 * @property {string} [reason] - เหตุผลในการเปลี่ยนสถานะ
 * @property {Date} changedAt - วันที่เปลี่ยนสถานะ
 */
export interface IStatusChange {
  status: WriterApplicationStatus;
  changedBy?: Types.ObjectId;
  reason?: string;
  changedAt: Date;
}

/**
 * @const StatusChangeSchema
 * @description สกีมาสำหรับบันทึกการเปลี่ยนสถานะ
 */
const StatusChangeSchema = new Schema<IStatusChange>(
  {
    status: {
      type: String,
      enum: Object.values(WriterApplicationStatus),
      required: [true, "กรุณาระบุสถานะ"],
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [500, "เหตุผลต้องไม่เกิน 500 ตัวอักษร"],
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร WriterApplication
// ==================================================================================================

/**
 * @interface IWriterApplication
 * @extends Document
 * @description ใบสมัครเป็นนักเขียนบนแพลตฟอร์ม
 */
export interface IWriterApplication extends Document {
  _id: Types.ObjectId;
  applicantId: Types.ObjectId;
  displayName: string;
  aboutMe?: string;
  contactEmail?: string;
  writingExperience?: string;
  visualNovelExperience?: string;
  portfolioItems: Types.DocumentArray<IPortfolioItem>;
  preferredGenres: Types.ObjectId[];
  sampleContent?: string;
  writingFrequency?: WritingFrequency;
  goalDescription?: string;
  applicationReason?: string;
  status: WriterApplicationStatus;
  statusHistory: Types.DocumentArray<IStatusChange>;
  reviewNotes: Types.DocumentArray<IReviewNote>;
  applicantMessages: Types.DocumentArray<IApplicantMessage>;
  rejectionReason?: string;
  adminNotes?: string;
  assignedLevel?: WriterLevel;
  hasReadTerms: boolean;
  submittedAt: Date;
  updatedAt: Date;
  reviewedAt?: Date;
  daysInReview?: number; // Virtual field: จำนวนวันที่อยู่ในการพิจารณา
}

// อินเทอร์เฟซสำหรับ static methods
interface WriterApplicationModel extends Model<IWriterApplication> {
  checkDisplayNameAvailability(displayName: string, excludeUserId?: Types.ObjectId): Promise<boolean>;
  addReviewNote(applicationId: Types.ObjectId, reviewerId: Types.ObjectId, note: string): Promise<IWriterApplication | null>;
  addApplicantMessage(applicationId: Types.ObjectId, message: string): Promise<IWriterApplication | null>;
  changeApplicationStatus(
    applicationId: Types.ObjectId,
    newStatus: WriterApplicationStatus,
    changedBy?: Types.ObjectId,
    reason?: string,
    rejectionReason?: string,
    assignedLevel?: WriterLevel
  ): Promise<IWriterApplication | null>;
  getUserActiveApplication(userId: Types.ObjectId): Promise<IWriterApplication | null>;
  getUserLastApplication(userId: Types.ObjectId): Promise<IWriterApplication | null>;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ WriterApplication
// ==================================================================================================

const WriterApplicationSchema = new Schema<IWriterApplication, WriterApplicationModel>(
  {
    applicantId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุ ID ผู้สมัคร"],
      index: true,
    },
    displayName: {
      type: String,
      required: [true, "กรุณาระบุชื่อที่ต้องการแสดง (นามปากกา)"],
      trim: true,
      minlength: [2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร"],
      maxlength: [50, "ชื่อต้องไม่เกิน 50 ตัวอักษร"],
      validate: {
        validator: function (v: string) {
          return /^[ก-๙a-zA-Z0-9\s\-_.]+$/.test(v);
        },
        message: "ชื่อต้องประกอบด้วยตัวอักษรภาษาไทย, ภาษาอังกฤษ, ตัวเลข, และอักขระพิเศษที่อนุญาต (-, _, .) เท่านั้น",
      },
    },
    aboutMe: {
      type: String,
      trim: true,
      maxlength: [500, "ข้อมูลแนะนำตัวต้องไม่เกิน 500 ตัวอักษร"],
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/.+\@.+\..+/, "กรุณากรอกอีเมลให้ถูกต้อง"],
      maxlength: [100, "อีเมลต้องไม่เกิน 100 ตัวอักษร"],
    },
    writingExperience: {
      type: String,
      trim: true,
      maxlength: [500, "ประสบการณ์การเขียนต้องไม่เกิน 500 ตัวอักษร"],
    },
    visualNovelExperience: {
      type: String,
      trim: true,
      maxlength: [500, "ประสบการณ์เกี่ยวกับ Visual Novel ต้องไม่เกิน 500 ตัวอักษร"],
    },
    portfolioItems: {
      type: [PortfolioItemSchema],
      validate: {
        validator: function (v: any[]) {
          return v.length <= 3;
        },
        message: "สามารถเพิ่มผลงานได้ไม่เกิน 3 รายการ",
      },
    },
    preferredGenres: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: [true, "กรุณาเลือกอย่างน้อย 1 ประเภทนิยายที่สนใจเขียน"],
      },
    ],
    sampleContent: {
      type: String,
      trim: true,
      maxlength: [2000, "ตัวอย่างผลงานต้องไม่เกิน 2000 ตัวอักษร"],
    },
    writingFrequency: {
      type: String,
      enum: Object.values(WritingFrequency),
    },
    goalDescription: {
      type: String,
      trim: true,
      maxlength: [500, "เป้าหมายต้องไม่เกิน 500 ตัวอักษร"],
    },
    applicationReason: {
      type: String,
      trim: true,
      maxlength: [500, "เหตุผลที่ต้องการเป็นนักเขียนต้องไม่เกิน 500 ตัวอักษร"],
    },
    status: {
      type: String,
      enum: Object.values(WriterApplicationStatus),
      default: WriterApplicationStatus.PENDING_REVIEW,
      required: true,
      index: true,
    },
    statusHistory: [StatusChangeSchema],
    reviewNotes: [ReviewNoteSchema],
    applicantMessages: [ApplicantMessageSchema],
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, "เหตุผลการปฏิเสธต้องไม่เกิน 500 ตัวอักษร"],
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: [1000, "หมายเหตุจากทีมงานต้องไม่เกิน 1000 ตัวอักษร"],
    },
    assignedLevel: {
      type: String,
      enum: Object.values(WriterLevel),
    },
    hasReadTerms: {
      type: Boolean,
      required: [true, "กรุณายืนยันว่าได้อ่านข้อกำหนดและเงื่อนไข"],
      validate: {
        validator: function (v: boolean) {
          return v === true;
        },
        message: "ต้องยืนยันว่าได้อ่านข้อกำหนดและเงื่อนไขสำหรับนักเขียน",
      },
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ==================================================================================================
// SECTION: Virtuals (ฟิลด์เสมือน)
// ==================================================================================================

WriterApplicationSchema.virtual("daysInReview").get(function (this: IWriterApplication): number {
  const startDate = this.submittedAt;
  const endDate = this.reviewedAt || new Date();
  return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
});

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหา)
// ==================================================================================================

WriterApplicationSchema.index(
  { applicantId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: [
          WriterApplicationStatus.PENDING_REVIEW,
          WriterApplicationStatus.UNDER_REVIEW,
          WriterApplicationStatus.REQUIRES_MORE_INFO,
        ],
      },
    },
    name: "UniqueActiveApplicationPerUser",
  }
);

WriterApplicationSchema.index(
  { status: 1, submittedAt: -1 },
  { name: "StatusSubmittedAtIndex" }
);

WriterApplicationSchema.index(
  { displayName: 1 },
  { name: "DisplayNameIndex" }
);

// ==================================================================================================
// SECTION: Middlewares (Mongoose Hooks)
// ==================================================================================================

// Middleware: เพิ่มประวัติการเปลี่ยนสถานะเมื่อบันทึกใบสมัครครั้งแรกหรือมีการเปลี่ยนสถานะ
WriterApplicationSchema.pre<IWriterApplication>("save", function (next) {
  if (this.isNew) {
    if (!this.statusHistory) {
      this.statusHistory = [] as any;
    }
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
    });
  } else if (this.isModified("status")) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
    });
    if (
      this.status === WriterApplicationStatus.APPROVED ||
      this.status === WriterApplicationStatus.REJECTED
    ) {
      this.reviewedAt = new Date();
    }
  }
  next();
});

// Middleware: อัปเดตข้อมูลผู้ใช้เมื่อใบสมัครได้รับการอนุมัติ
WriterApplicationSchema.post<IWriterApplication>("save", async function (this: IWriterApplication, doc, next) { // แก้ไข signature ของ post hook
  // ตรวจสอบว่า status มีการเปลี่ยนแปลงเป็น APPROVED หรือไม่
  // `this.isModified("status")` อาจจะไม่ทำงานตามที่คาดใน post hook, เราจึงควรเช็คค่า `status` โดยตรง
  // และอาจจะต้องมีวิธีตรวจสอบสถานะก่อนหน้าถ้า logic ซับซ้อนกว่านี้
  if (this.status !== WriterApplicationStatus.APPROVED) {
    // ถ้าสถานะไม่ใช่ APPROVED ไม่ต้องทำอะไรต่อ
    // หรือถ้าเคย APPROVED ไปแล้ว และมีการแก้ไขอื่นๆ ที่ไม่ใช่การเปลี่ยน status เป็น APPROVED อีกครั้ง ก็ไม่ต้องทำ
    // การตรวจสอบ this.isModified("status") ใน pre hook จะแม่นยำกว่าสำหรับการ trigger action แบบครั้งเดียวเมื่อ status เปลี่ยน
    return next(); // เรียก next() ใน post hook ถ้าไม่ต้องการ error handling เพิ่มเติม
  }

  const UserModel = models.User as mongoose.Model<IUser>;
  // const WriterApplicationModel = this.model("WriterApplication") as Model<IWriterApplication>; // ไม่จำเป็นต้องใช้ใน post นี้

  try {
    const user = await UserModel.findById(this.applicantId);
    if (!user) {
      console.error(`[WriterApp Post-Save] ไม่พบข้อมูลผู้ใช้รหัส ${this.applicantId} สำหรับใบสมัครรหัส ${this._id}`);
      return next(); // หรือ next(new Error(...)) ถ้าต้องการให้ process หยุด
    }

    let userNeedsSave = false;

    // 1. อัปเดตบทบาท (Role)
    if (!user.roles.includes("Writer")) {
      user.roles.push("Writer");
      console.log(`[WriterApp Post-Save] เพิ่มบทบาท "Writer" ให้กับผู้ใช้ ${user.username}`);
      userNeedsSave = true;
    }

    // 2. อัปเดต/สร้าง writerStats
    if (!user.writerStats) {
      user.writerStats = {
        totalViewsReceived: 0,
        totalNovelsPublished: 0,
        totalEpisodesPublished: 0,
        totalViewsAcrossAllNovels: 0,
        totalReadsAcrossAllNovels: 0,
        totalLikesReceivedOnNovels: 0,
        totalCommentsReceivedOnNovels: 0,
        totalEarningsToDate: 0,
        totalCoinsReceived: 0,
        totalRealMoneyReceived: 0,
        totalDonationsReceived: 0,
        writerSince: this.reviewedAt || this.updatedAt || new Date(), // ใช้วันที่ตรวจสอบหรืออัปเดตล่าสุดของใบสมัคร
      };
      console.log(`[WriterApp Post-Save] สร้าง writerStats เริ่มต้นสำหรับผู้ใช้ ${user.username}`);
      userNeedsSave = true;
    } else if (!user.writerStats.writerSince) {
      // ถ้ามี writerStats อยู่แล้วแต่ยังไม่มี writerSince (กรณีข้อมูลเก่า)
      user.writerStats.writerSince = this.reviewedAt || this.updatedAt || new Date();
      userNeedsSave = true;
    }

    // 3. อัปเดตนามปากกา (penName) จาก displayName ในใบสมัคร
    // และอัปเดต bio ถ้ามีการกรอกในใบสมัครและ bio เดิมใน profile ว่าง
    if (this.displayName && user.profile.penName !== this.displayName) {
        // ตรวจสอบความซ้ำซ้อนของ penName ก่อนตั้งค่า
        const existingUserWithPenName = await UserModel.findOne({
            "profile.penName": this.displayName,
            _id: { $ne: this.applicantId }, // ไม่นับ user คนปัจจุบัน
        });

        if (!existingUserWithPenName) {
            user.profile.penName = this.displayName;
            console.log(`[WriterApp Post-Save] อัปเดตนามปากกา (penName) ของผู้ใช้ ${user.username} เป็น "${this.displayName}"`);
            userNeedsSave = true;
        } else {
            console.warn(`[WriterApp Post-Save] นามปากกา "${this.displayName}" จากใบสมัคร ${this._id} ซ้ำกับผู้ใช้อื่น ไม่สามารถอัปเดต penName ได้อัตโนมัติ`);
            // อาจจะต้องมี logic แจ้งเตือนผู้ใช้หรือ admin ให้แก้ไข penName ด้วยตนเอง
            // หรือ rollback สถานะใบสมัคร (ซับซ้อนขึ้น)
            // ในกรณีนี้ เราจะไม่อัปเดต penName และปล่อยให้ user.save() ดำเนินการส่วนอื่นต่อไป
        }
    }

    if (this.aboutMe && !user.profile.bio) { // อัปเดต bio ถ้า bio เดิมว่างเท่านั้น
      user.profile.bio = this.aboutMe;
      console.log(`[WriterApp Post-Save] อัปเดต bio ของผู้ใช้ ${user.username} จากใบสมัคร`);
      userNeedsSave = true;
    }

    // 4. อัปเดตสถานะการสมัครใน User.verification
    if (user.verification) {
      user.verification.writerApplicationId = this._id;
      // user.verification.writerApplicationStatus = "approved"; // เอาออก เพราะสถานะหลักอยู่ที่ WriterApplication
      // user.verification.writerApplicationApprovedAt = this.reviewedAt || new Date(); // ใช้ writerSince ใน writerStats แทน
      console.log(`[WriterApp Post-Save] อัปเดต user.verification สำหรับผู้ใช้ ${user.username}`);
      userNeedsSave = true;
    } else {
      // สร้าง verification object ถ้ายังไม่มี
      user.verification = {
        kycStatus: "none", // หรือค่า default อื่นๆ
        writerApplicationId: this._id,
        // writerApplicationStatus: "approved",
        // writerApplicationApprovedAt: this.reviewedAt || new Date(),
      };
      userNeedsSave = true;
    }

    // 5. อัปเดตระดับนักเขียน (ถ้ามี)
    if (this.assignedLevel && (!user.writerStats.writerTier || user.writerStats.writerTier !== this.assignedLevel)) {
        user.writerStats.writerTier = this.assignedLevel;
        console.log(`[WriterApp Post-Save] อัปเดตระดับนักเขียน (writerTier) ของผู้ใช้ ${user.username} เป็น "${this.assignedLevel}"`);
        userNeedsSave = true;
    }


    if (userNeedsSave) {
      await user.save();
      console.log(`[WriterApp Post-Save] อัปเดตข้อมูล User (${user.username}) หลังอนุมัติใบสมัครนักเขียน ${this._id} สำเร็จ`);
    }

  } catch (error) {
    console.error(`[WriterApp Post-Save] เกิดข้อผิดพลาดในการอัปเดต User model หลังอนุมัติใบสมัคร ${this._id}:`, error);
    // ควรพิจารณาการจัดการ error ที่เหมาะสม เช่น logging หรือแจ้งเตือน admin
    // การ throw error ที่นี่อาจทำให้ process ที่เรียก .save() ของ WriterApplication ล้มเหลว
    // ซึ่งอาจไม่เป็นที่ต้องการเสมอไป ขึ้นอยู่กับ business logic
    // next(error); // ถ้าต้องการให้การ save ของ WriterApplication ล้มเหลวด้วย
  }
  // ไม่จำเป็นต้องเรียก next() ใน post hook แบบนี้ เว้นแต่จะมีการ chaining post hooks
});

// ==================================================================================================
// SECTION: Static Methods (เมธอดสำหรับโมเดล)
// ==================================================================================================

WriterApplicationSchema.statics.checkDisplayNameAvailability = async function (
  this: Model<IWriterApplication>,
  displayName: string,
  excludeUserId?: Types.ObjectId
): Promise<boolean> {
  const UserModel = models.User as mongoose.Model<IUser>;
  const query: any = { "profile.displayName": displayName };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }

  const existingUser = await UserModel.findOne(query);
  if (existingUser) {
    return false;
  }

  const existingApplication = await this.findOne({
    displayName,
    status: WriterApplicationStatus.APPROVED,
    applicantId: { $ne: excludeUserId },
  });

  return !existingApplication;
};

WriterApplicationSchema.statics.addReviewNote = async function (
  this: Model<IWriterApplication>,
  applicationId: Types.ObjectId,
  reviewerId: Types.ObjectId,
  note: string
): Promise<IWriterApplication | null> {
  return this.findByIdAndUpdate(
    applicationId,
    {
      $push: {
        reviewNotes: {
          reviewerId,
          note,
          createdAt: new Date(),
        },
      },
    },
    { new: true }
  );
};

WriterApplicationSchema.statics.addApplicantMessage = async function (
  this: Model<IWriterApplication>,
  applicationId: Types.ObjectId,
  message: string
): Promise<IWriterApplication | null> {
  const application = await this.findById(applicationId);
  if (!application) {
    return null;
  }

  application.applicantMessages.push({
    message,
    sentAt: new Date(),
  });

  if (application.status === WriterApplicationStatus.REQUIRES_MORE_INFO) {
    application.status = WriterApplicationStatus.PENDING_REVIEW;
    application.statusHistory.push({
      status: WriterApplicationStatus.PENDING_REVIEW,
      reason: "ผู้สมัครส่งข้อมูลเพิ่มเติมแล้ว",
      changedAt: new Date(),
    });
  }

  return application.save();
};

WriterApplicationSchema.statics.changeApplicationStatus = async function (
  this: Model<IWriterApplication>,
  applicationId: Types.ObjectId,
  newStatus: WriterApplicationStatus,
  changedBy?: Types.ObjectId,
  reason?: string,
  rejectionReason?: string,
  assignedLevel?: WriterLevel
): Promise<IWriterApplication | null> {
  const updateObj: any = {
    status: newStatus,
    $push: {
      statusHistory: {
        status: newStatus,
        changedBy,
        reason,
        changedAt: new Date(),
      },
    },
  };

  if (newStatus === WriterApplicationStatus.REJECTED && rejectionReason) {
    updateObj.rejectionReason = rejectionReason;
    updateObj.reviewedAt = new Date();
  } else if (newStatus === WriterApplicationStatus.APPROVED && assignedLevel) {
    updateObj.assignedLevel = assignedLevel;
    updateObj.reviewedAt = new Date();
  }

  return this.findByIdAndUpdate(applicationId, updateObj, { new: true });
};

WriterApplicationSchema.statics.getUserActiveApplication = async function (
  this: Model<IWriterApplication>,
  userId: Types.ObjectId
): Promise<IWriterApplication | null> {
  return this.findOne({
    applicantId: userId,
    status: {
      $in: [
        WriterApplicationStatus.PENDING_REVIEW,
        WriterApplicationStatus.UNDER_REVIEW,
        WriterApplicationStatus.REQUIRES_MORE_INFO,
      ],
    },
  });
};

WriterApplicationSchema.statics.getUserLastApplication = async function (
  this: Model<IWriterApplication>,
  userId: Types.ObjectId
): Promise<IWriterApplication | null> {
  return this.findOne({ applicantId: userId }).sort({ submittedAt: -1 });
};

// ==================================================================================================
// SECTION: Model Export
// ==================================================================================================

/**
 * โมเดล WriterApplication
 * ใช้สำหรับจัดการใบสมัครเป็นนักเขียนบนแพลตฟอร์ม
 */
const WriterApplicationModel =
  (models.WriterApplication as mongoose.Model<IWriterApplication>) ||
  model<IWriterApplication, WriterApplicationModel>("WriterApplication", WriterApplicationSchema);

export default WriterApplicationModel;