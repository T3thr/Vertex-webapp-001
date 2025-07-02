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
 * หมายเหตุ: ไม่ใช้แล้ว เพื่อป้องกันความเหลื่อมล้ำในชุมชน
 * @deprecated
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
      maxlength: [2048, "URL ต้องไม่เกิน 2048 ตัวอักษร"],
      validate: {
        validator: function (v: string) {
          return /^https?:\/\/.+/.test(v);
        },
        message: "URL ต้องเป็น HTTP หรือ HTTPS",
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

const ReviewNoteSchema = new Schema<IReviewNote>(
  {
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุ ID ผู้ตรวจสอบ"],
    },
    note: {
      type: String,
      required: [true, "กรุณาระบุข้อความบันทึก"],
      trim: true,
      maxlength: [1000, "ข้อความบันทึกต้องไม่เกิน 1000 ตัวอักษร"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { _id: false }
);

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
      required: true,
    },
  },
  { _id: false }
);

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
  primaryPenName: string;
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
    rejectionReason?: string
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
    primaryPenName: {
      type: String,
      required: [true, "กรุณาระบุนามปากกาหลักที่ต้องการใช้"],
      trim: true,
      minlength: [2, "นามปากกาต้องมีอย่างน้อย 2 ตัวอักษร"],
      maxlength: [50, "นามปากกาต้องไม่เกิน 50 ตัวอักษร"],
      validate: {
        validator: function (v: string) {
          return /^[ก-๙a-zA-Z0-9\s\-_.]+$/.test(v);
        },
        message: "นามปากกาต้องประกอบด้วยตัวอักษรภาษาไทย, ภาษาอังกฤษ, ตัวเลข, และอักขระพิเศษที่อนุญาต (-, _, .) เท่านั้น",
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
  { primaryPenName: 1 },
  { name: "PrimaryPenNameIndex" }
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
WriterApplicationSchema.post<IWriterApplication>("save", async function (this: IWriterApplication, doc, next) {
  // ตรวจสอบว่า status เป็น APPROVED หรือไม่
  if (this.status !== WriterApplicationStatus.APPROVED) {
    return next();
  }

  const UserModel = models.User as mongoose.Model<IUser>;
  const WriterStatsModel = models.WriterStats;

  try {
    const user = await UserModel.findById(this.applicantId);
    if (!user) {
      console.error(`[WriterApp Post-Save] ไม่พบข้อมูลผู้ใช้รหัส ${this.applicantId} สำหรับใบสมัครรหัส ${this._id}`);
      return next();
    }

    let userNeedsSave = false;

    // 1. อัปเดตบทบาท (Role)
    if (!user.roles.includes("Writer")) {
      user.roles.push("Writer");
      console.log(`[WriterApp Post-Save] เพิ่มบทบาท "Writer" ให้กับผู้ใช้ ${user.username}`);
      userNeedsSave = true;
    }

    // 2. สร้างหรืออัปเดต WriterStats document ใน writerstats collection
    const existingStats = await WriterStatsModel.findOne({ userId: this.applicantId });
    
    if (!existingStats) {
      // สร้าง WriterStats document ใหม่
      await WriterStatsModel.create({
        userId: this.applicantId,
        writerSince: this.reviewedAt || new Date(),
        writerApplicationId: this._id,
        donationSettings: { isEligibleForDonation: false },
        // ค่า default อื่นๆ จะถูกกำหนดโดย schema
      });
      console.log(`[WriterApp Post-Save] สร้าง WriterStats document ใหม่สำหรับผู้ใช้ ${user.username}`);
    } else {
      // อัปเดต WriterStats ที่มีอยู่
      let statsNeedsSave = false;
      
      if (!existingStats.writerSince) {
        existingStats.writerSince = this.reviewedAt || new Date();
        statsNeedsSave = true;
      }
      
      existingStats.writerApplicationId = this._id;
      statsNeedsSave = true;
      
      if (statsNeedsSave) {
        await existingStats.save();
        console.log(`[WriterApp Post-Save] อัปเดต WriterStats document ที่มีอยู่สำหรับผู้ใช้ ${user.username}`);
      }
    }

    // 3. อัปเดต primaryPenName ใน User model (Source of Truth จะอยู่ที่ UserProfile)
    if (this.primaryPenName && user.primaryPenName !== this.primaryPenName) {
      // ตรวจสอบความซ้ำซ้อนของ primaryPenName
      const existingUserWithPenName = await UserModel.findOne({
        primaryPenName: this.primaryPenName,
        _id: { $ne: this.applicantId },
      });

      if (!existingUserWithPenName) {
        user.primaryPenName = this.primaryPenName;
        console.log(`[WriterApp Post-Save] อัปเดต primaryPenName ของผู้ใช้ ${user.username} เป็น "${this.primaryPenName}"`);
        userNeedsSave = true;
      } else {
        console.warn(`[WriterApp Post-Save] นามปากกา "${this.primaryPenName}" จากใบสมัคร ${this._id} ซ้ำกับผู้ใช้อื่น`);
      }
    }

    if (userNeedsSave) {
      await user.save();
      console.log(`[WriterApp Post-Save] อัปเดตข้อมูล User (${user.username}) หลังอนุมัติใบสมัครนักเขียน ${this._id} สำเร็จ`);
    }

    // TODO: ส่ง Event ไปยัง UserProfileService เพื่ออัปเดต penNames ใน UserProfile
    // await UserProfileService.updatePenNamesFromApplication(this.applicantId, this.primaryPenName, this.aboutMe);

  } catch (error) {
    console.error(`[WriterApp Post-Save] เกิดข้อผิดพลาดในการอัปเดต User model หลังอนุมัติใบสมัคร ${this._id}:`, error);
  }
});

// ==================================================================================================
// SECTION: Static Methods (เมธอดสำหรับโมเดล)
// ==================================================================================================

WriterApplicationSchema.statics.checkDisplayNameAvailability = async function (
  this: Model<IWriterApplication>,
  primaryPenName: string,
  excludeUserId?: Types.ObjectId
): Promise<boolean> {
  const UserModel = models.User as mongoose.Model<IUser>;
  const query: any = { primaryPenName: primaryPenName };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }

  const existingUser = await UserModel.findOne(query);
  if (existingUser) {
    return false;
  }

  const existingApplication = await this.findOne({
    primaryPenName,
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
  rejectionReason?: string
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
  } else if (newStatus === WriterApplicationStatus.APPROVED) {
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