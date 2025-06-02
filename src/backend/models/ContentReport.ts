// src/backend/models/ContentReport.ts
// โมเดลการรายงานเนื้อหา (ContentReport Model)
// จัดการการรายงานเนื้อหาที่ไม่เหมาะสมจากผู้ใช้ เพื่อสร้างสภาพแวดล้อมที่ปลอดภัยและเป็นมิตร

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IUser } from "./User"; // สำหรับ reporterUserId, contentOwnerId, และ assignedTo (Admin/Moderator)
import { INovel } from "./Novel"; // สำหรับ contentId (ถ้า contentType คือ Novel)
import { IEpisode } from "./Episode"; // สำหรับ contentId (ถ้า contentType คือ Episode)
import { IComment } from "./Comment"; // สำหรับ contentId (ถ้า contentType คือ Comment)
import { IMedia } from "./Media"; // สำหรับ contentId (ถ้า contentType คือ MediaItem)
import { INotification, NotificationType, NotificationSeverity } from "./Notification"; // สำหรับการสร้าง Notification
import { IAuditLog, AuditLogAction, AuditLogTargetType } from "./AuditLog"; // สำหรับการบันทึก Audit Log

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล ContentReport
// ==================================================================================================

/**
 * @enum {string} ReportableContentType
 * @description ประเภทของเนื้อหาที่สามารถถูกรายงานได้
 * - `NOVEL`: นิยายทั้งเรื่อง (เช่น หน้าปก, ชื่อเรื่อง, คำโปรย)
 * - `EPISODE`: ตอนย่อยของนิยาย (เนื้อหาภายในตอน)
 * - `COMMENT`: ความคิดเห็นของผู้ใช้
 * - `USER_PROFILE`: โปรไฟล์ผู้ใช้ (เช่น รูปโปรไฟล์, ชื่อผู้ใช้, คำอธิบายโปรไฟล์, แบนเนอร์)
 * - `MEDIA_ITEM`: ไฟล์สื่อที่ผู้ใช้อัปโหลด (เช่น รูปภาพในแกลเลอรี, เสียงประกอบ)
 * - `CHAT_MESSAGE`: ข้อความในการสนทนา (ถ้ามีระบบแชท)
 * - `FORUM_POST`: โพสต์ในฟอรัม (ถ้ามี)
 * - `OTHER`: เนื้อหาประเภทอื่นๆ ที่ไม่ได้ระบุไว้ (ต้องมีคำอธิบายเพิ่มเติม)
 */
export enum ReportableContentType {
  NOVEL = "Novel",
  EPISODE = "Episode",
  COMMENT = "Comment",
  USER_PROFILE = "User_Profile",
  MEDIA_ITEM = "Media_Item",
  CHAT_MESSAGE = "Chat_Message",
  FORUM_POST = "Forum_Post",
  OTHER = "Other",
}

/**
 * @enum {string} ReportReasonCategory
 * @description หมวดหมู่หลักของเหตุผลในการรายงาน เพื่อการจัดกลุ่มและวิเคราะห์
 * - `INAPPROPRIATE_CONTENT`: เนื้อหาไม่เหมาะสมทั่วไป
 * - `LEGAL_VIOLATION`: การละเมิดกฎหมาย
 * - `USER_SAFETY`: ความปลอดภัยของผู้ใช้
 * - `PLATFORM_POLICY_VIOLATION`: การละเมิดนโยบายแพลตฟอร์ม
 * - `SPAM_OR_SCAM`: สแปมหรือการหลอกลวง
 */
export enum ReportReasonCategory {
  INAPPROPRIATE_CONTENT = "inappropriate_content",
  LEGAL_VIOLATION = "legal_violation",
  USER_SAFETY = "user_safety",
  PLATFORM_POLICY_VIOLATION = "platform_policy_violation",
  SPAM_OR_SCAM = "spam_or_scam",
}

/**
 * @enum {string} ReportReasonDetail
 * @description เหตุผลย่อย/รายละเอียดของการรายงาน (เชื่อมโยงกับ ReportReasonCategory)
 * - `HATE_SPEECH`: คำพูดแสดงความเกลียดชัง (Category: INAPPROPRIATE_CONTENT, USER_SAFETY)
 * - `HARASSMENT_BULLYING`: การคุกคามหรือการกลั่นแกล้ง (Category: USER_SAFETY)
 * - `SEXUALLY_EXPLICIT`: เนื้อหาทางเพศที่โจ่งแจ้ง (Category: INAPPROPRIATE_CONTENT)
 * - `GRAPHIC_VIOLENCE`: เนื้อหาที่รุนแรงหรือน่าสยดสยอง (Category: INAPPROPRIATE_CONTENT)
 * - `COPYRIGHT_INFRINGEMENT`: การละเมิดลิขสิทธิ์ (Category: LEGAL_VIOLATION)
 * - `TRADEMARK_INFRINGEMENT`: การละเมิดเครื่องหมายการค้า (Category: LEGAL_VIOLATION)
 * - `IMPERSONATION`: การปลอมแปลงตัวตน (Category: USER_SAFETY, SPAM_OR_SCAM)
 * - `SPAM_UNWANTED_COMMERCIAL`: สแปมหรือโฆษณาที่ไม่พึงประสงค์ (Category: SPAM_OR_SCAM)
 * - `MISLEADING_INFORMATION_FAKE_NEWS`: ข้อมูลเท็จหรือข่าวปลอม (Category: SPAM_OR_SCAM, PLATFORM_POLICY_VIOLATION)
 * - `SELF_HARM_SUICIDE_PROMOTION`: การส่งเสริมการทำร้ายตัวเองหรือการฆ่าตัวตาย (Category: USER_SAFETY)
 * - `ILLEGAL_ACTIVITIES_REGULATED_GOODS`: กิจกรรมที่ผิดกฎหมายหรือสินค้าควบคุม (Category: LEGAL_VIOLATION)
 * - `PRIVACY_VIOLATION_DOXXING`: การละเมิดความเป็นส่วนตัว การเปิดเผยข้อมูลส่วนบุคคล (Category: USER_SAFETY, LEGAL_VIOLATION)
 * - `CHILD_SAFETY_ISSUES`: ประเด็นความปลอดภัยของเด็ก (Category: USER_SAFETY, LEGAL_VIOLATION)
 * - `TERRORISM_EXTREMISM`: การก่อการร้ายหรือแนวคิดสุดโต่ง (Category: USER_SAFETY, LEGAL_VIOLATION)
 * - `OTHER_POLICY_VIOLATION`: การละเมิดนโยบายอื่นๆ (ระบุใน details, Category: PLATFORM_POLICY_VIOLATION)
 */
export enum ReportReasonDetail {
  HATE_SPEECH = "hate_speech",
  HARASSMENT_BULLYING = "harassment_bullying",
  SEXUALLY_EXPLICIT = "sexually_explicit",
  GRAPHIC_VIOLENCE = "graphic_violence",
  COPYRIGHT_INFRINGEMENT = "copyright_infringement",
  TRADEMARK_INFRINGEMENT = "trademark_infringement",
  IMPERSONATION = "impersonation",
  SPAM_UNWANTED_COMMERCIAL = "spam_unwanted_commercial",
  MISLEADING_INFORMATION_FAKE_NEWS = "misleading_information_fake_news",
  SELF_HARM_SUICIDE_PROMOTION = "self_harm_suicide_promotion",
  ILLEGAL_ACTIVITIES_REGULATED_GOODS = "illegal_activities_regulated_goods",
  PRIVACY_VIOLATION_DOXXING = "privacy_violation_doxxing",
  CHILD_SAFETY_ISSUES = "child_safety_issues",
  TERRORISM_EXTREMISM = "terrorism_extremism",
  OTHER_POLICY_VIOLATION = "other_policy_violation",
}

/**
 * @enum {string} ReportStatus
 * @description สถานะการจัดการรายงาน
 * - `PENDING_REVIEW`: รอดำเนินการตรวจสอบโดยทีมงาน DivWy
 * - `UNDER_INVESTIGATION`: กำลังอยู่ในระหว่างการตรวจสอบอย่างละเอียด
 * - `AWAITING_MORE_INFO_REPORTER`: รอข้อมูลเพิ่มเติมจากผู้รายงาน
 * - `AWAITING_MORE_INFO_OWNER`: รอข้อมูลเพิ่มเติมจากเจ้าของเนื้อหา (ถ้ามีการติดต่อ)
 * - `ACTION_TAKEN_CONTENT_REMOVED`: ดำเนินการแล้ว - เนื้อหาถูกลบ
 * - `ACTION_TAKEN_CONTENT_EDITED`: ดำเนินการแล้ว - เนื้อหาถูกแก้ไข
 * - `ACTION_TAKEN_USER_WARNED`: ดำเนินการแล้ว - ผู้ใช้ (เจ้าของเนื้อหา) ถูกตักเตือน
 * - `ACTION_TAKEN_USER_SUSPENDED`: ดำเนินการแล้ว - ผู้ใช้ (เจ้าของเนื้อหา) ถูกระงับบัญชีชั่วคราว
 * - `ACTION_TAKEN_USER_BANNED`: ดำเนินการแล้ว - ผู้ใช้ (เจ้าของเนื้อหา) ถูกแบนถาวร
 * - `NO_VIOLATION_FOUND`: ไม่พบการละเมิดนโยบาย (รายงานไม่สมเหตุสมผล)
 * - `RESOLVED_DUPLICATE`: แก้ไขแล้ว - เป็นการรายงานซ้ำซ้อนกับเคสที่มีอยู่
 * - `ESCALATED_LEGAL`: ส่งต่อให้ทีมกฎหมาย
 * - `ESCALATED_HIGHER_TIER_SUPPORT`: ส่งต่อให้ทีมสนับสนุนระดับสูง
 * - `CLOSED_AUTOMATED`: ปิดโดยระบบอัตโนมัติ (เช่น เนื้อหาถูกลบไปก่อนแล้ว)
 */
export enum ReportStatus {
  PENDING_REVIEW = "pending_review",
  UNDER_INVESTIGATION = "under_investigation",
  AWAITING_MORE_INFO_REPORTER = "awaiting_more_info_reporter",
  AWAITING_MORE_INFO_OWNER = "awaiting_more_info_owner",
  ACTION_TAKEN_CONTENT_REMOVED = "action_taken_content_removed",
  ACTION_TAKEN_CONTENT_EDITED = "action_taken_content_edited",
  ACTION_TAKEN_USER_WARNED = "action_taken_user_warned",
  ACTION_TAKEN_USER_SUSPENDED = "action_taken_user_suspended",
  ACTION_TAKEN_USER_BANNED = "action_taken_user_banned",
  NO_VIOLATION_FOUND = "no_violation_found",
  RESOLVED_DUPLICATE = "resolved_duplicate",
  ESCALATED_LEGAL = "escalated_legal",
  ESCALATED_HIGHER_TIER_SUPPORT = "escalated_higher_tier_support",
  CLOSED_AUTOMATED = "closed_automated",
}

/**
 * @interface IReportedContentContext
 * @description ข้อมูลบริบทของเนื้อหาที่ถูกรายงาน (เพื่อช่วยในการตรวจสอบ)
 * @property {string} [url] - URL ของเนื้อหาที่ถูกรายงานโดยตรง
 * @property {string} [textSnippet] - ข้อความบางส่วนของเนื้อหาที่ถูกรายงาน (ถ้าเป็นข้อความ)
 * @property {string} [imageUrl] - URL ของรูปภาพที่เกี่ยวข้อง (ถ้ามี)
 * @property {Types.ObjectId} [contentOwnerId] - ID ของเจ้าของเนื้อหา (อ้างอิง User model)
 */
export interface IReportedContentContext {
  url?: string;
  textSnippet?: string;
  imageUrl?: string;
  contentOwnerId?: Types.ObjectId | IUser;
}
const ReportedContentContextSchema = new Schema<IReportedContentContext>(
  {
    url: { type: String, trim: true, maxlength: [2048, "URL เนื้อหาต้องไม่เกิน 2048 ตัวอักษร"] },
    textSnippet: { type: String, trim: true, maxlength: [500, "ข้อความตัวอย่างต้องไม่เกิน 500 ตัวอักษร"] }, // เก็บเฉพาะส่วนที่สำคัญ
    imageUrl: { type: String, trim: true, maxlength: [2048, "URL รูปภาพต้องไม่เกิน 2048 ตัวอักษร"] },
    contentOwnerId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  },
  { _id: false }
);

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร ContentReport (IContentReport Document Interface)
// ==================================================================================================

/**
 * @interface IContentReport
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารการรายงานเนื้อหาใน Collection "contentreports"
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสาร
 * @property {string} reportReadableId - ID ที่มนุษย์อ่านได้สำหรับการรายงาน (เช่น CR-2024-00001)
 * @property {Types.ObjectId | IUser} reporterUserId - ID ของผู้ใช้ที่รายงาน (อ้างอิง User model, **จำเป็น**)
 * @property {string} reporterIpAddress - IP Address ของผู้รายงาน (เพื่อการตรวจสอบ, **ควร Hash หรือ Anonymize บางส่วน**)
 * @property {ReportableContentType} contentType - ประเภทของเนื้อหาที่ถูกรายงาน (**จำเป็น**)
 * @property {Types.ObjectId} contentId - ID ของเนื้อหาที่ถูกรายงาน (NovelId, CommentId, UserId, etc., **จำเป็น**, refPath อ้างอิงตาม contentType)
 * @property {IReportedContentContext} [contentContext] - ข้อมูลบริบทของเนื้อหาที่ถูกรายงาน
 * @property {ReportReasonCategory} reasonCategory - หมวดหมู่หลักของเหตุผลในการรายงาน (**จำเป็น**)
 * @property {ReportReasonDetail} reasonDetail - เหตุผลย่อย/รายละเอียดของการรายงาน (**จำเป็น**)
 * @property {string} details - รายละเอียดเพิ่มเติมจากผู้รายงาน (อธิบายเหตุผล, **จำเป็น**)
 * @property {string[]} [tags] - Tags สำหรับการจัดกลุ่มหรือค้นหารายงาน (เช่น "urgent", "review_later")
 * @property {ReportStatus} status - สถานะการจัดการรายงาน (**จำเป็น**, default: `PENDING_REVIEW`)
 * @property {Types.ObjectId | IUser} [assignedToModeratorId] - ID ของ Admin/Moderator ที่รับผิดชอบ (อ้างอิง User model - Moderator/Admin role)
 * @property {Date} [assignmentTimestamp] - วันที่มอบหมายงานให้ Moderator
 * @property {string} [moderatorNotes] - บันทึกภายในของ Moderator ระหว่างการตรวจสอบ
 * @property {string} [actionTakenNotes] - บันทึกการดำเนินการสุดท้าย (เช่น เหตุผลที่ลบ, คำเตือนที่ส่งให้ผู้ใช้)
 * @property {Types.ObjectId[]} [relatedReportIds] - ID ของรายงานอื่นๆ ที่เกี่ยวข้องหรือซ้ำซ้อน
 * @property {Date} [resolvedAt] - วันที่จัดการรายงานเสร็จสิ้น
 * @property {Date} reportedAt - วันที่ส่งรายงาน (**จำเป็น**, default: `Date.now`)
 * @property {number} schemaVersion - เวอร์ชันของ schema
 * @property {Date} createdAt - วันที่สร้างเอกสาร (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตเอกสารล่าสุด (Mongoose `timestamps`)
 */
export interface IContentReport extends Document {
  _previousStatus: string;
  _id: Types.ObjectId;
  reportReadableId: string;
  reporterUserId: Types.ObjectId | IUser;
  reporterIpAddress?: string; 
  contentType: ReportableContentType;
  contentId: Types.ObjectId; // Dynamic ref based on contentType
  contentContext?: IReportedContentContext;
  reasonCategory: ReportReasonCategory;
  reasonDetail: ReportReasonDetail;
  details: string;
  tags?: string[];
  status: ReportStatus;
  assignedToModeratorId?: Types.ObjectId | IUser;
  assignmentTimestamp?: Date;
  moderatorNotes?: string;
  actionTakenNotes?: string;
  relatedReportIds?: Types.ObjectId[];
  resolvedAt?: Date;
  reportedAt: Date;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ ContentReport (ContentReportSchema)
// ==================================================================================================
const ContentReportSchema = new Schema<IContentReport>(
  {
    reportReadableId: { 
      type: String, 
      required: [true, "กรุณาระบุ ID ที่อ่านได้ของรายงาน (Readable Report ID is required)"], 
      unique: true, 
      index: true 
    },
    reporterUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุ ID ของผู้รายงาน (Reporter User ID is required)"],
      index: true,
    },
    reporterIpAddress: { type: String, trim: true }, // ควรมีการ hash หรือ anonymize ก่อนจัดเก็บจริง
    contentType: {
      type: String,
      enum: Object.values(ReportableContentType),
      required: [true, "กรุณาระบุประเภทเนื้อหาที่รายงาน (Content type is required)"],
      index: true,
    },
    contentId: {
      type: Schema.Types.ObjectId,
      required: [true, "กรุณาระบุ ID ของเนื้อหาที่ถูกรายงาน (Content ID is required)"],
      index: true,
      // Dynamic refPath 설정은 application logic에서 처리하거나, 각 contentType별로 별도의 필드를 고려할 수 있습니다.
      // refPath: "contentType" // Mongoose ไม่รองรับ refPath โดยตรงในลักษณะนี้สำหรับ Enum ที่เป็น String
      // การ resolve ref จะต้องทำใน application-level query หรือ virtual populate
    },
    contentContext: { type: ReportedContentContextSchema },
    reasonCategory: {
      type: String,
      enum: Object.values(ReportReasonCategory),
      required: [true, "กรุณาระบุหมวดหมู่เหตุผลการรายงาน"],
      index: true,
    },
    reasonDetail: {
      type: String,
      enum: Object.values(ReportReasonDetail),
      required: [true, "กรุณาระบุรายละเอียดเหตุผลการรายงาน"],
      index: true,
    },
    details: {
      type: String,
      required: [true, "กรุณาระบุรายละเอียดเพิ่มเติม (Details are required)"],
      trim: true,
      minlength: [20, "รายละเอียดการรายงานต้องมีอย่างน้อย 20 ตัวอักษร"],
      maxlength: [2500, "รายละเอียดการรายงานต้องไม่เกิน 2500 ตัวอักษร"],
    },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 50 }],
    status: {
      type: String,
      enum: Object.values(ReportStatus),
      default: ReportStatus.PENDING_REVIEW,
      required: [true, "กรุณาระบุสถานะการรายงาน"],
      index: true,
    },
    assignedToModeratorId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    assignmentTimestamp: { type: Date },
    moderatorNotes: { type: String, trim: true, maxlength: [5000, "บันทึก Moderator ต้องไม่เกิน 5000 ตัวอักษร"] },
    actionTakenNotes: { type: String, trim: true, maxlength: [5000, "บันทึกการดำเนินการต้องไม่เกิน 5000 ตัวอักษร"] },
    relatedReportIds: [{ type: Schema.Types.ObjectId, ref: "ContentReport" }],
    resolvedAt: { type: Date, index: true },
    reportedAt: { type: Date, default: Date.now, required: true, index: true },
    schemaVersion: { type: Number, default: 1, min: 1 },
  },
  {
    timestamps: true, // createdAt, updatedAt
    collection: "contentreports",
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

// ==================================================================================================
// SECTION: Virtuals (ฟิลด์เสมือน)
// ==================================================================================================

// Virtual populate สำหรับ contentId เพื่อให้สามารถอ้างอิงไปยัง collection ที่ถูกต้องตาม contentType
// หมายเหตุ: การใช้งาน virtual populate สำหรับ dynamic ref อาจมีข้อจำกัดและต้องทดสอบอย่างละเอียด
// หรือจัดการการ populate ใน application logic แทน
ContentReportSchema.virtual("reportedContent", {
  ref: (doc: IContentReport) => doc.contentType, // ชื่อ Model ที่จะ ref ไป (ต้องตรงกับชื่อ Model ที่ Mongoose รู้จัก)
  localField: "contentId",
  foreignField: "_id",
  justOne: true,
});

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

// Index สำหรับ Moderator query: สถานะ, วันที่รายงาน, ผู้รับผิดชอบ
ContentReportSchema.index({ status: 1, reportedAt: -1, assignedToModeratorId: 1 }, { name: "ModeratorQueueIndex" });
// Index สำหรับการค้นหารายงานที่เกี่ยวข้องกับเนื้อหาชิ้นใดชิ้นหนึ่ง
ContentReportSchema.index({ contentType: 1, contentId: 1, status: 1 }, { name: "ContentSpecificReportsIndex" });
// Index สำหรับการค้นหารายงานจากผู้ใช้คนเดียวกัน
ContentReportSchema.index({ reporterUserId: 1, reportedAt: -1 }, { name: "UserSubmittedReportsIndex" });
// Index สำหรับการค้นหาตาม Tags
ContentReportSchema.index({ tags: 1, status: 1 }, { sparse: true, name: "ReportTagsIndex" });
// Index สำหรับการค้นหาตามเหตุผล
ContentReportSchema.index({ reasonCategory: 1, reasonDetail: 1, status: 1 }, { name: "ReportReasonIndex" });

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

// Middleware ก่อน save
ContentReportSchema.pre<IContentReport>("save", async function (next) {
  // 1. สร้าง reportReadableId ถ้ายังไม่มี (สำหรับเอกสารใหม่)
  if (this.isNew && !this.reportReadableId) {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.reportReadableId = `NVM-CR-${year}${month}${day}-${randomSuffix}`;
  }

  // 2. อัปเดต resolvedAt เมื่อ status เปลี่ยนเป็นสถานะที่ถือว่า "แก้ไขแล้ว"
  const resolvedStatuses = [
    ReportStatus.ACTION_TAKEN_CONTENT_REMOVED,
    ReportStatus.ACTION_TAKEN_CONTENT_EDITED,
    ReportStatus.ACTION_TAKEN_USER_WARNED,
    ReportStatus.ACTION_TAKEN_USER_SUSPENDED,
    ReportStatus.ACTION_TAKEN_USER_BANNED,
    ReportStatus.NO_VIOLATION_FOUND,
    ReportStatus.RESOLVED_DUPLICATE,
    ReportStatus.CLOSED_AUTOMATED
  ];
  if (this.isModified("status") && resolvedStatuses.includes(this.status) && !this.resolvedAt) {
    this.resolvedAt = new Date();
  }

  // 3. ถ้ามีการ assign moderator, บันทึกเวลา assignment
  if (this.isModified("assignedToModeratorId") && this.assignedToModeratorId && !this.assignmentTimestamp) {
    this.assignmentTimestamp = new Date();
  }

  // 4. (สำคัญ) ดึงข้อมูล contentContext ถ้ายังไม่มี และ contentType/contentId ถูกระบุ
  if (this.isNew && this.contentType && this.contentId && !this.contentContext) {
    try {
      const context: IReportedContentContext = {};
      let ownerField = "userId"; // default owner field
      let titleField: string | undefined;

      // อินเทอร์เฟซสำหรับ contentDoc เพื่อให้ TypeScript รู้โครงสร้าง
      interface ContentDoc {
        userId?: Types.ObjectId;
        authorId?: Types.ObjectId;
        uploadedBy?: Types.ObjectId;
        _id?: Types.ObjectId;
        title?: string;
        text?: string;
        username?: string;
        fileName?: string;
        coverImageUrl?: string;
        contentUrl?: string;
        url?: string;
      }

      const model = models[this.contentType] as mongoose.Model<ContentDoc>;
      if (model) {
        // กำหนด field ที่จะดึงข้อมูลตาม contentType
        switch (this.contentType) {
          case ReportableContentType.NOVEL:
            ownerField = "authorId";
            titleField = "title";
            break;
          case ReportableContentType.EPISODE:
            ownerField = "authorId"; // สมมติว่า Episode มี authorId หรือต้อง populate จาก Novel
            titleField = "title";
            break;
          case ReportableContentType.COMMENT:
            ownerField = "userId";
            titleField = "text"; // ใช้ text เป็น snippet
            break;
          case ReportableContentType.USER_PROFILE:
            ownerField = "_id"; // เจ้าของคือ User ID เอง
            titleField = "username";
            break;
          case ReportableContentType.MEDIA_ITEM:
            ownerField = "uploadedBy";
            titleField = "fileName";
            break;
        }

        const contentDoc = await model
          .findById(this.contentId)
          .select(`${ownerField} ${titleField || ''} coverImageUrl contentUrl text`)
          .exec();
        if (contentDoc) {
          context.contentOwnerId = contentDoc[ownerField as keyof ContentDoc] as Types.ObjectId;
          if (titleField && contentDoc[titleField as keyof ContentDoc]) {
            context.textSnippet =
              String(contentDoc[titleField as keyof ContentDoc]).substring(0, 200) +
              (String(contentDoc[titleField as keyof ContentDoc]).length > 200 ? "..." : "");
          }
          if (contentDoc.coverImageUrl) context.imageUrl = contentDoc.coverImageUrl;
          else if (
            contentDoc.url &&
            (this.contentType === ReportableContentType.MEDIA_ITEM ||
              this.contentType === ReportableContentType.USER_PROFILE)
          ) {
            context.imageUrl = contentDoc.url;
          } else if (contentDoc.contentUrl) {
            context.imageUrl = contentDoc.contentUrl; // สำหรับ Media
          }

          // สร้าง URL โดยประมาณ (ควรมี helper function สำหรับสร้าง URL ที่ถูกต้อง)
          context.url = `/app/${this.contentType.toLowerCase().replace('_', '-')}/${this.contentId}`;
          this.contentContext = context;
        }
      }
    } catch (error) {
      console.error(
        `[ContentReport Pre-Save Hook] Error fetching content context for ${this.contentType} ${this.contentId}:`,
        error
      );
      // ไม่ควร block การ save แต่ log error ไว้
    }
  }

  next();
});

// Middleware หลัง save (Post-save hook)
ContentReportSchema.post<IContentReport>("save", async function (doc, next) {
  const AuditLogModel = models.AuditLog as mongoose.Model<IAuditLog>;
  const NotificationModel = models.Notification as mongoose.Model<INotification>;

  // 1. สร้าง Audit Log เมื่อมีการเปลี่ยนแปลงสถานะที่สำคัญ หรือการ assign งาน
  if (doc.isModified("status") || (doc.isNew && doc.status === ReportStatus.PENDING_REVIEW) || doc.isModified("assignedToModeratorId")) {
    let auditAction: AuditLogAction;
    let auditDetails = `Report ID: ${doc.reportReadableId}, Content Type: ${doc.contentType}, Content ID: ${doc.contentId}`;

    if (doc.isNew && doc.status === ReportStatus.PENDING_REVIEW) {
      auditAction = AuditLogAction.CONTENT_REPORT_SUBMITTED;
      auditDetails += `, Reported by: User ${doc.reporterUserId}`;
    } else if (doc.isModified("assignedToModeratorId") && doc.assignedToModeratorId) {
      auditAction = AuditLogAction.CONTENT_REPORT_ASSIGNED;
      auditDetails += `, Assigned to: Moderator ${doc.assignedToModeratorId}`;
    } else if (doc.isModified("status")) {
      auditAction = AuditLogAction.CONTENT_REPORT_STATUS_CHANGED;
      auditDetails += `, New Status: ${doc.status}, Old Status: ${doc._previousStatus || "N/A"}`;
      if (doc.actionTakenNotes) auditDetails += `, Action Notes: ${doc.actionTakenNotes.substring(0,100)}...`;
    } else {
      return next(); // ไม่ต้องทำอะไรถ้าไม่มีการเปลี่ยนแปลงที่สนใจ
    }

    try {
      await AuditLogModel.create({
        actorUserId: doc.assignedToModeratorId || doc.reporterUserId, // ผู้กระทำ (Moderator หรือ Reporter)
        actorType: doc.assignedToModeratorId ? "Moderator" : "User",
        action: auditAction,
        targetType: AuditLogTargetType.CONTENT_REPORT,
        targetId: doc._id,
        details: auditDetails,
        // ipAddress: doc.reporterIpAddress (ถ้าต้องการบันทึก IP ของผู้ดำเนินการ)
      });
    } catch (error) {
      console.error(`[ContentReport Post-Save Hook] Error creating AuditLog for report ${doc.reportReadableId}:`, error);
    }
  }

  // 2. ส่ง Notification แจ้งผู้รายงาน (Reporter) เกี่ยวกับความคืบหน้าของ Report
  if (doc.isModified("status")) {
    const notificationTitle = "อัปเดตสถานะการรายงานเนื้อหาของคุณ";
    let notificationMessage = ``;
    let severity = NotificationSeverity.INFO;
    let sendNotification = false;

    switch (doc.status) {
      case ReportStatus.UNDER_INVESTIGATION:
        notificationMessage = `รายงานของคุณสำหรับเนื้อหา (${doc.contentType} ID: ${doc.contentId}) กำลังอยู่ในระหว่างการตรวจสอบโดยทีมงาน`;
        sendNotification = true;
        break;
      case ReportStatus.ACTION_TAKEN_CONTENT_REMOVED:
      case ReportStatus.ACTION_TAKEN_CONTENT_EDITED:
      case ReportStatus.ACTION_TAKEN_USER_WARNED:
      case ReportStatus.ACTION_TAKEN_USER_SUSPENDED:
      case ReportStatus.ACTION_TAKEN_USER_BANNED:
        notificationMessage = `ทีมงานได้ดำเนินการตามรายงานของคุณสำหรับเนื้อหา (${doc.contentType} ID: ${doc.contentId}) แล้ว สถานะ: ${doc.status}. ขอบคุณที่ช่วยให้ DivWy เป็นชุมชนที่ปลอดภัย`;
        severity = NotificationSeverity.SUCCESS;
        sendNotification = true;
        break;
      case ReportStatus.NO_VIOLATION_FOUND:
        notificationMessage = `หลังจากการตรวจสอบรายงานของคุณสำหรับเนื้อหา (${doc.contentType} ID: ${doc.contentId}) ทีมงานไม่พบการละเมิดนโยบายในขณะนี้ หากคุณมีข้อมูลเพิ่มเติม กรุณาติดต่อทีมสนับสนุน`;
        severity = NotificationSeverity.WARNING;
        sendNotification = true;
        break;
      case ReportStatus.AWAITING_MORE_INFO_REPORTER:
        notificationMessage = `ทีมงานต้องการข้อมูลเพิ่มเติมเกี่ยวกับรายงานของคุณสำหรับเนื้อหา (${doc.contentType} ID: ${doc.contentId}). กรุณาตรวจสอบและให้ข้อมูลเพิ่มเติมผ่านช่องทางที่กำหนด`;
        sendNotification = true;
        break;
      // อาจจะมี case อื่นๆ ที่ต้องการแจ้งเตือน
    }

    if (sendNotification) {
      try {
        await NotificationModel.create({
          userId: doc.reporterUserId,
          type: NotificationType.CONTENT_REPORT_STATUS_UPDATE,
          title: notificationTitle,
          message: notificationMessage,
          relatedId: doc._id,
          relatedType: "ContentReport",
          severity: severity,
          // actorId: doc.assignedToModeratorId (Admin/Moderator ที่ดำเนินการ)
        });
      } catch (error) {
        console.error(`[ContentReport Post-Save Hook] Error creating Notification for reporter ${doc.reporterUserId} on report ${doc.reportReadableId}:`, error);
      }
    }
  }
  
  // 3. (ถ้ามีการดำเนินการกับเจ้าของเนื้อหา) ส่ง Notification แจ้งเจ้าของเนื้อหา (Content Owner)
  // Logic นี้ควรจะซับซ้อนและอาจจะทำใน service layer ที่จัดการการลงโทษโดยตรง
  // เพื่อให้สามารถระบุเหตุผลและรายละเอียดการลงโทษได้ชัดเจน
  // ตัวอย่างเช่น: ถ้า status เป็น ACTION_TAKEN_USER_WARNED และ contentContext.contentOwnerId มีค่า
  if (doc.isModified("status") && doc.contentContext?.contentOwnerId) {
    let ownerNotificationTitle = "";
    let ownerNotificationMessage = "";
    let ownerSeverity = NotificationSeverity.INFO;
    let sendOwnerNotification = false;

    switch(doc.status) {
        case ReportStatus.ACTION_TAKEN_CONTENT_REMOVED:
            ownerNotificationTitle = "เนื้อหาของคุณถูกลบ";
            ownerNotificationMessage = `เนื้อหา (${doc.contentType} ID: ${doc.contentId}) ของคุณถูกลบเนื่องจากละเมิดนโยบายชุมชน ${doc.actionTakenNotes ? `รายละเอียด: ${doc.actionTakenNotes}` : "กรุณาตรวจสอบนโยบายของเรา"}`;
            ownerSeverity = NotificationSeverity.ERROR;
            sendOwnerNotification = true;
            break;
        case ReportStatus.ACTION_TAKEN_USER_WARNED:
            ownerNotificationTitle = "คุณได้รับการตักเตือน";
            ownerNotificationMessage = `คุณได้รับการตักเตือนเกี่ยวกับการละเมิดนโยบายชุมชนที่เกี่ยวข้องกับเนื้อหา (${doc.contentType} ID: ${doc.contentId}). ${doc.actionTakenNotes ? `รายละเอียด: ${doc.actionTakenNotes}` : "กรุณาตรวจสอบและปฏิบัติตามนโยบายอย่างเคร่งครัด"}`;
            ownerSeverity = NotificationSeverity.WARNING;
            sendOwnerNotification = true;
            break;
        // เพิ่ม case สำหรับ SUSPENDED, BANNED ตามความเหมาะสม
    }

    if (sendOwnerNotification) {
        try {
            await NotificationModel.create({
                userId: doc.contentContext.contentOwnerId as Types.ObjectId,
                type: NotificationType.CONTENT_POLICY_VIOLATION, // หรือ type ที่เหมาะสม
                title: ownerNotificationTitle,
                message: ownerNotificationMessage,
                relatedId: doc.contentId, // ID ของเนื้อหาที่ถูกดำเนินการ
                relatedType: doc.contentType,
                severity: ownerSeverity,
                actorId: doc.assignedToModeratorId, // Moderator ที่ดำเนินการ
            });
        } catch (error) {
            console.error(`[ContentReport Post-Save Hook] Error creating Notification for content owner ${doc.contentContext.contentOwnerId} on report ${doc.reportReadableId}:`, error);
        }
    }
  }

  next();
});

// Middleware เพื่อเก็บค่า status เก่าก่อนการ save (สำหรับ post-save hook)
ContentReportSchema.pre<IContentReport>('save', function(next) {
  if (this.isModified('status')) {
    this._previousStatus = this.get('status', null, { getters: false });
  }
  next();
});


// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

// ตรวจสอบว่า Model "ContentReport" ถูกสร้างไปแล้วหรือยัง ถ้ายัง ให้สร้าง Model ใหม่
const ContentReportModel = 
  (models.ContentReport as mongoose.Model<IContentReport>) ||
  model<IContentReport>("ContentReport", ContentReportSchema);

export default ContentReportModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Dynamic Ref Population**: การใช้ `refPath` หรือ virtual populate สำหรับ `contentId` ที่อ้างอิงไปยัง collection ต่างๆ
//     ตาม `contentType` อาจมีความซับซ้อนในการ query และ populate. การจัดการใน application logic
//     หรือการมี service layer ที่รับผิดชอบการดึงข้อมูล content อาจเป็นทางเลือกที่ดีกว่าในบางกรณี.
// 2.  **IP Address Handling**: `reporterIpAddress` ควรถูก hash หรือ anonymize บางส่วนก่อนจัดเก็บเพื่อความเป็นส่วนตัว
//     และควรใช้เพื่อการตรวจสอบการ злоупотребление (abuse) ระบบรายงานเท่านั้น.
// 3.  **Content Snapshot**: การเก็บ `contentSnapshot` (เช่น ข้อความบางส่วน, URL รูปภาพ ณ เวลาที่รายงาน)
//     อาจมีประโยชน์หากเนื้อหาถูกแก้ไขหรือลบไปแล้ว แต่ต้องพิจารณาเรื่องขนาดข้อมูลที่จัดเก็บ.
//     `contentContext` ที่เพิ่มเข้ามาทำหน้าที่คล้ายกัน แต่ดึงข้อมูลตอนสร้าง report.
// 4.  **Rate Limiting**: ควรมีระบบป้องกันการ spam report เช่น จำกัดจำนวนการ report ต่อวันต่อผู้ใช้ หรือต่อ contentId.
// 5.  **Moderator Workflow**: ระบบ workflow สำหรับ Moderator (การ assign งาน, การติดตาม SLA, การ escalate)
//     อาจจะต้องมีการออกแบบเพิ่มเติมในส่วนของ Admin Panel และ API ที่เกี่ยวข้อง.
// 6.  **User Reputation for Reporting**: อาจมีการพิจารณาให้คะแนนความน่าเชื่อถือของผู้รายงาน (reporter reputation)
//     เพื่อช่วยในการจัดลำดับความสำคัญของรายงาน.
// 7.  **Machine Learning for Report Prioritization**: ในระยะยาว อาจใช้ ML เพื่อช่วยคัดกรองและจัดลำดับความสำคัญ
//     ของรายงานที่เข้ามาจำนวนมาก โดยพิจารณาจากปัจจัยต่างๆ เช่น ประเภทเนื้อหา, เหตุผล, ประวัติผู้รายงาน.
// 8.  **Integration with User Punishment System**: การดำเนินการลงโทษผู้ใช้ (warn, suspend, ban) ควรเชื่อมโยงกับ
//     ระบบจัดการผู้ใช้ และมี Audit Log ที่ชัดเจน.
// 9.  **Localization**: เหตุผลการรายงาน (ReportReason) และข้อความแจ้งเตือนต่างๆ ควรมีการรองรับหลายภาษา.
// ==================================================================================================
