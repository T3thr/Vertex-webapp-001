// src/backend/models/AuditLog.ts
// โมเดลบันทึกการตรวจสอบ (AuditLog Model)
// บันทึกการเปลี่ยนแปลงข้อมูลสำคัญ, การกระทำของผู้ดูแลระบบ, และเหตุการณ์ด้านความปลอดภัยที่สำคัญในระบบ

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IUser } from "./User"; // สำหรับ actorUserId

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล AuditLog
// ==================================================================================================

/**
 * @enum {string} AuditLogActorType
 * @description ประเภทของผู้กระทำการใน Audit Log
 * - `ADMIN`: ผู้ดูแลระบบ (มนุษย์)
 * - `SYSTEM`: ระบบอัตโนมัติ (เช่น background job, scheduled task)
 * - `USER`: ผู้ใช้ทั่วไป (สำหรับการกระทำบางอย่างที่สำคัญมากและต้องการ audit เช่น การลบบัญชีด้วยตนเอง)
 * - `API_KEY`: การกระทำผ่าน API Key (ถ้ามี)
 */
export enum AuditLogActorType {
  ADMIN = "Admin",
  SYSTEM = "System",
  USER = "User",
  API_KEY = "ApiKey",
}

/**
 * @enum {string} AuditLogAction
 * @description ประเภทของการกระทำที่ถูกบันทึกใน Audit Log (ขยายให้ครอบคลุมมากขึ้น)
 * 
 * // --- User Management --- 
 * - `USER_CREATED`: สร้างผู้ใช้ใหม่ (เช่น โดย Admin หรือ ระบบ)
 * - `USER_UPDATED_PROFILE_ADMIN`: Admin อัปเดตโปรไฟล์ผู้ใช้
 * - `USER_UPDATED_SETTINGS_ADMIN`: Admin อัปเดตการตั้งค่าบัญชีผู้ใช้
 * - `USER_PASSWORD_RESET_REQUESTED_ADMIN`: Admin เริ่มกระบวนการรีเซ็ตรหัสผ่านให้ผู้ใช้
 * - `USER_PASSWORD_CHANGED_ADMIN`: Admin เปลี่ยนรหัสผ่านผู้ใช้
 * - `USER_EMAIL_VERIFIED_ADMIN`: Admin ยืนยันอีเมลผู้ใช้
 * - `USER_ROLE_ASSIGNED`: มอบหมายบทบาทให้ผู้ใช้ (เช่น user -> writer, writer -> admin)
 * - `USER_ROLE_REMOVED`: ถอดถอนบทบาทจากผู้ใช้
 * - `USER_PERMISSIONS_GRANTED`: มอบสิทธิ์เพิ่มเติมให้ผู้ใช้
 * - `USER_PERMISSIONS_REVOKED`: เพิกถอนสิทธิ์จากผู้ใช้
 * - `USER_ACCOUNT_SUSPENDED`: ระงับบัญชีผู้ใช้
 * - `USER_ACCOUNT_UNSUSPENDED`: ยกเลิกระงับบัญชีผู้ใช้
 * - `USER_ACCOUNT_BANNED`: แบนบัญชีผู้ใช้ถาวร
 * - `USER_ACCOUNT_UNBANNED`: ยกเลิกการแบนบัญชีผู้ใช้
 * - `USER_ACCOUNT_DELETED_ADMIN`: Admin ลบบัญชีผู้ใช้
 * - `USER_LOGIN_SUCCESS_ADMIN`: Admin ล็อกอินเข้าสู่ระบบ (ถ้าต้องการ track)
 * - `USER_LOGIN_FAILURE_ADMIN`: Admin ล็อกอินเข้าสู่ระบบล้มเหลว (ถ้าต้องการ track)
 * - `USER_LOGOUT_ADMIN`: Admin ออกจากระบบ (ถ้าต้องการ track)
 * - `USER_IMPERSONATION_STARTED`: Admin เริ่มการสวมรอยเป็นผู้ใช้อื่น (เพื่อ support)
 * - `USER_IMPERSONATION_ENDED`: Admin สิ้นสุดการสวมรอย
 * 
 * // --- Content Management (by Admin/System) ---
 * - `NOVEL_CREATED_ADMIN`: Admin สร้างนิยาย
 * - `NOVEL_UPDATED_ADMIN`: Admin แก้ไขข้อมูลนิยาย
 * - `NOVEL_DELETED_ADMIN`: Admin ลบนิยาย
 * - `NOVEL_STATUS_CHANGED_ADMIN`: Admin เปลี่ยนสถานะนิยาย (เช่น published, unpublished, featured, archived)
 * - `NOVEL_CONTENT_FLAGGED_ADMIN`: Admin ตั้งค่าสถานะเนื้อหานิยาย (เช่น sensitive, mature)
 * - `EPISODE_CREATED_ADMIN`: Admin สร้างตอนใหม่
 * - `EPISODE_UPDATED_ADMIN`: Admin แก้ไขข้อมูลตอน
 * - `EPISODE_DELETED_ADMIN`: Admin ลบตอน
 * - `EPISODE_STATUS_CHANGED_ADMIN`: Admin เปลี่ยนสถานะตอน (เช่น published, draft)
 * - `COMMENT_UPDATED_ADMIN`: Admin แก้ไขความคิดเห็น
 * - `COMMENT_DELETED_ADMIN`: Admin ลบความคิดเห็น
 * - `COMMENT_STATUS_CHANGED_ADMIN`: Admin เปลี่ยนสถานะความคิดเห็น (เช่น approved, hidden)
 * - `MEDIA_UPLOADED_ADMIN`: Admin อัปโหลดไฟล์สื่อ
 * - `MEDIA_UPDATED_ADMIN`: Admin แก้ไขข้อมูลไฟล์สื่อ
 * - `MEDIA_DELETED_ADMIN`: Admin ลบไฟล์สื่อ
 * - `CATEGORY_CREATED_ADMIN`: Admin สร้างหมวดหมู่ใหม่
 * - `CATEGORY_UPDATED_ADMIN`: Admin แก้ไขข้อมูลหมวดหมู่
 * - `CATEGORY_DELETED_ADMIN`: Admin ลบหมวดหมู่
 * - `TAG_CREATED_ADMIN`: Admin สร้างแท็กใหม่
 * - `TAG_UPDATED_ADMIN`: Admin แก้ไขข้อมูลแท็ก
 * - `TAG_DELETED_ADMIN`: Admin ลบแท็ก
 * 
 * // --- Content Moderation ---
 * - `CONTENT_REPORT_SUBMITTED`: ผู้ใช้ส่งรายงานเนื้อหา (อาจจะ log ถ้าสำคัญมาก)
 * - `CONTENT_REPORT_REVIEWED`: Admin ตรวจสอบรายงานเนื้อหา
 * - `CONTENT_REPORT_ASSIGNED`: รายงานเนื้อหาถูกมอบหมายให้ Admin ท่านอื่น
 * - `CONTENT_REPORT_STATUS_CHANGED`: สถานะรายงานเนื้อหาเปลี่ยนแปลง (เช่น pending -> investigating)
 * - `CONTENT_REPORT_ACTION_TAKEN`: Admin ดำเนินการตามรายงาน (เช่น ลบเนื้อหา, เตือนผู้ใช้)
 * - `CONTENT_REPORT_RESOLVED`: รายงานเนื้อหาถูกแก้ไข/ปิดเคส
 * 
 * // --- Gamification Management (Badges, Achievements by Admin) ---
 * - `BADGE_CREATED_ADMIN`: Admin สร้างเหรียญตราใหม่
 * - `BADGE_UPDATED_ADMIN`: Admin แก้ไขข้อมูลเหรียญตรา
 * - `BADGE_DELETED_ADMIN`: Admin ลบเหรียญตรา
 * - `BADGE_AWARDED_MANUAL_ADMIN`: Admin มอบเหรียญตราให้ผู้ใช้โดยตรง
 * - `ACHIEVEMENT_CREATED_ADMIN`: Admin สร้างความสำเร็จใหม่
 * - `ACHIEVEMENT_UPDATED_ADMIN`: Admin แก้ไขข้อมูลความสำเร็จ
 * - `ACHIEVEMENT_DELETED_ADMIN`: Admin ลบความสำเร็จ
 * - `ACHIEVEMENT_AWARDED_MANUAL_ADMIN`: Admin มอบความสำเร็จให้ผู้ใช้โดยตรง
 * 
 * // --- Financial & Monetization (by Admin/System) ---
 * - `PAYMENT_TRANSACTION_CREATED_SYSTEM`: ระบบสร้างรายการธุรกรรมการชำระเงิน
 * - `PAYMENT_TRANSACTION_UPDATED_SYSTEM`: ระบบอัปเดตสถานะธุรกรรม (เช่น pending -> success, failed)
 * - `PAYMENT_REFUND_INITIATED_ADMIN`: Admin เริ่มกระบวนการคืนเงิน
 * - `PAYMENT_REFUND_COMPLETED_ADMIN`: Admin ดำเนินการคืนเงินสำเร็จ
 * - `PAYMENT_REFUND_FAILED_ADMIN`: การคืนเงินล้มเหลว
 * - `COIN_PACKAGE_CREATED_ADMIN`: Admin สร้างแพ็กเกจเหรียญ
 * - `COIN_PACKAGE_UPDATED_ADMIN`: Admin แก้ไขแพ็กเกจเหรียญ
 * - `COIN_PACKAGE_DELETED_ADMIN`: Admin ลบแพ็กเกจเหรียญ
 * - `USER_COIN_ADJUSTED_ADMIN`: Admin ปรับจำนวนเหรียญผู้ใช้ (เพิ่ม/ลด)
 * - `EARNING_PAYOUT_REQUESTED_WRITER`: นักเขียนส่งคำขอเบิกรายได้ (อาจจะ log ถ้าสำคัญ)
 * - `EARNING_PAYOUT_PROCESSED_ADMIN`: Admin ดำเนินการจ่ายเงินให้นักเขียน
 * - `EARNING_PAYOUT_REJECTED_ADMIN`: Admin ปฏิเสธคำขอเบิกรายได้
 * - `WRITER_APPLICATION_APPROVED_ADMIN`: Admin อนุมัติใบสมัครนักเขียน
 * - `WRITER_APPLICATION_REJECTED_ADMIN`: Admin ปฏิเสธใบสมัครนักเขียน
 * - `DONATION_SETTINGS_UPDATED_ADMIN`: Admin อัปเดตการตั้งค่าการรับบริจาค
 * 
 * // --- Platform & System Settings (by Admin/System) ---
 * - `PLATFORM_SETTING_CHANGED_ADMIN`: Admin เปลี่ยนแปลงการตั้งค่าหลักของแพลตฟอร์ม
 * - `SYSTEM_MAINTENANCE_MODE_ENABLED_ADMIN`: Admin เปิดโหมดบำรุงรักษาระบบ
 * - `SYSTEM_MAINTENANCE_MODE_DISABLED_ADMIN`: Admin ปิดโหมดบำรุงรักษาระบบ
 * - `API_KEY_CREATED_ADMIN`: Admin สร้าง API Key ใหม่
 * - `API_KEY_REVOKED_ADMIN`: Admin ยกเลิก API Key
 * - `NOTIFICATION_TEMPLATE_UPDATED_ADMIN`: Admin แก้ไขเทมเพลตการแจ้งเตือน
 * - `SYSTEM_BACKUP_STARTED_SYSTEM`: ระบบเริ่มการสำรองข้อมูล
 * - `SYSTEM_BACKUP_COMPLETED_SYSTEM`: ระบบสำรองข้อมูลสำเร็จ
 * - `SYSTEM_BACKUP_FAILED_SYSTEM`: ระบบสำรองข้อมูลล้มเหลว
 * 
 * // --- Security Events ---
 * - `SECURITY_SENSITIVE_DATA_ACCESSED_ADMIN`: Admin เข้าถึงข้อมูลที่ละเอียดอ่อน (เช่น logs, user data export)
 * - `SECURITY_CSRF_ATTACK_DETECTED_SYSTEM`: ระบบตรวจพบการโจมตี CSRF (ถ้ามี)
 * - `SECURITY_XSS_ATTACK_DETECTED_SYSTEM`: ระบบตรวจพบการโจมตี XSS (ถ้ามี)
 * - `SECURITY_SQL_INJECTION_ATTEMPT_DETECTED_SYSTEM`: ระบบตรวจพบการพยายามทำ SQL Injection (ถ้ามี)
 * - `SECURITY_RATE_LIMIT_EXCEEDED_SYSTEM`: ระบบตรวจพบการใช้งานเกินขีดจำกัด (rate limit)
 * - `SECURITY_UNAUTHORIZED_ACCESS_ATTEMPT_SYSTEM`: ระบบตรวจพบการพยายามเข้าถึงโดยไม่ได้รับอนุญาต
 * 
 * // --- Other --- 
 * - `OTHER_ADMIN_ACTION`: การกระทำอื่นๆ ของ Admin ที่ไม่ได้ระบุไว้
 * - `OTHER_SYSTEM_ACTION`: การกระทำอื่นๆ ของระบบที่ไม่ได้ระบุไว้
 */
export enum AuditLogAction {
  // User Management
  USER_CREATED = "user_created",
  USER_UPDATED_PROFILE_ADMIN = "user_updated_profile_admin",
  USER_UPDATED_SETTINGS_ADMIN = "user_updated_settings_admin",
  USER_PASSWORD_RESET_REQUESTED_ADMIN = "user_password_reset_requested_admin",
  USER_PASSWORD_CHANGED_ADMIN = "user_password_changed_admin",
  USER_EMAIL_VERIFIED_ADMIN = "user_email_verified_admin",
  USER_ROLE_ASSIGNED = "user_role_assigned",
  USER_ROLE_REMOVED = "user_role_removed",
  USER_PERMISSIONS_GRANTED = "user_permissions_granted",
  USER_PERMISSIONS_REVOKED = "user_permissions_revoked",
  USER_ACCOUNT_SUSPENDED = "user_account_suspended",
  USER_ACCOUNT_UNSUSPENDED = "user_account_unsuspended",
  USER_ACCOUNT_BANNED = "user_account_banned",
  USER_ACCOUNT_UNBANNED = "user_account_unbanned",
  USER_ACCOUNT_DELETED_ADMIN = "user_account_deleted_admin",
  USER_LOGIN_SUCCESS_ADMIN = "user_login_success_admin",
  USER_LOGIN_FAILURE_ADMIN = "user_login_failure_admin",
  USER_LOGOUT_ADMIN = "user_logout_admin",
  USER_IMPERSONATION_STARTED = "user_impersonation_started",
  USER_IMPERSONATION_ENDED = "user_impersonation_ended",

  // Content Management
  NOVEL_CREATED_ADMIN = "novel_created_admin",
  NOVEL_UPDATED_ADMIN = "novel_updated_admin",
  NOVEL_DELETED_ADMIN = "novel_deleted_admin",
  NOVEL_STATUS_CHANGED_ADMIN = "novel_status_changed_admin",
  NOVEL_CONTENT_FLAGGED_ADMIN = "novel_content_flagged_admin",
  EPISODE_CREATED_ADMIN = "episode_created_admin",
  EPISODE_UPDATED_ADMIN = "episode_updated_admin",
  EPISODE_DELETED_ADMIN = "episode_deleted_admin",
  EPISODE_STATUS_CHANGED_ADMIN = "episode_status_changed_admin",
  COMMENT_UPDATED_ADMIN = "comment_updated_admin",
  COMMENT_DELETED_ADMIN = "comment_deleted_admin",
  COMMENT_STATUS_CHANGED_ADMIN = "comment_status_changed_admin",
  MEDIA_UPLOADED_ADMIN = "media_uploaded_admin",
  MEDIA_UPDATED_ADMIN = "media_updated_admin",
  MEDIA_DELETED_ADMIN = "media_deleted_admin",
  CATEGORY_CREATED_ADMIN = "category_created_admin",
  CATEGORY_UPDATED_ADMIN = "category_updated_admin",
  CATEGORY_DELETED_ADMIN = "category_deleted_admin",
  TAG_CREATED_ADMIN = "tag_created_admin",
  TAG_UPDATED_ADMIN = "tag_updated_admin",
  TAG_DELETED_ADMIN = "tag_deleted_admin",

  // Content Moderation
  CONTENT_REPORT_SUBMITTED = "content_report_submitted",
  CONTENT_REPORT_REVIEWED = "content_report_reviewed",
  CONTENT_REPORT_ASSIGNED = "content_report_assigned",
  CONTENT_REPORT_STATUS_CHANGED = "content_report_status_changed",
  CONTENT_REPORT_ACTION_TAKEN = "content_report_action_taken",
  CONTENT_REPORT_RESOLVED = "content_report_resolved",

  // Gamification Management
  BADGE_CREATED_ADMIN = "badge_created_admin",
  BADGE_UPDATED_ADMIN = "badge_updated_admin",
  BADGE_DELETED_ADMIN = "badge_deleted_admin",
  BADGE_AWARDED_MANUAL_ADMIN = "badge_awarded_manual_admin",
  ACHIEVEMENT_CREATED_ADMIN = "achievement_created_admin",
  ACHIEVEMENT_UPDATED_ADMIN = "achievement_updated_admin",
  ACHIEVEMENT_DELETED_ADMIN = "achievement_deleted_admin",
  ACHIEVEMENT_AWARDED_MANUAL_ADMIN = "achievement_awarded_manual_admin",

  // Financial & Monetization
  PAYMENT_TRANSACTION_CREATED_SYSTEM = "payment_transaction_created_system",
  PAYMENT_TRANSACTION_UPDATED_SYSTEM = "payment_transaction_updated_system",
  PAYMENT_REFUND_INITIATED_ADMIN = "payment_refund_initiated_admin",
  PAYMENT_REFUND_COMPLETED_ADMIN = "payment_refund_completed_admin",
  PAYMENT_REFUND_FAILED_ADMIN = "payment_refund_failed_admin",
  COIN_PACKAGE_CREATED_ADMIN = "coin_package_created_admin",
  COIN_PACKAGE_UPDATED_ADMIN = "coin_package_updated_admin",
  COIN_PACKAGE_DELETED_ADMIN = "coin_package_deleted_admin",
  USER_COIN_ADJUSTED_ADMIN = "user_coin_adjusted_admin",
  EARNING_PAYOUT_REQUESTED_WRITER = "earning_payout_requested_writer",
  EARNING_PAYOUT_PROCESSED_ADMIN = "earning_payout_processed_admin",
  EARNING_PAYOUT_REJECTED_ADMIN = "earning_payout_rejected_admin",
  WRITER_APPLICATION_APPROVED_ADMIN = "writer_application_approved_admin",
  WRITER_APPLICATION_REJECTED_ADMIN = "writer_application_rejected_admin",
  DONATION_SETTINGS_UPDATED_ADMIN = "donation_settings_updated_admin",

  // Platform & System Settings
  PLATFORM_SETTING_CHANGED_ADMIN = "platform_setting_changed_admin",
  SYSTEM_MAINTENANCE_MODE_ENABLED_ADMIN = "system_maintenance_mode_enabled_admin",
  SYSTEM_MAINTENANCE_MODE_DISABLED_ADMIN = "system_maintenance_mode_disabled_admin",
  API_KEY_CREATED_ADMIN = "api_key_created_admin",
  API_KEY_REVOKED_ADMIN = "api_key_revoked_admin",
  NOTIFICATION_TEMPLATE_UPDATED_ADMIN = "notification_template_updated_admin",
  SYSTEM_BACKUP_STARTED_SYSTEM = "system_backup_started_system",
  SYSTEM_BACKUP_COMPLETED_SYSTEM = "system_backup_completed_system",
  SYSTEM_BACKUP_FAILED_SYSTEM = "system_backup_failed_system",

  // Security Events
  SECURITY_SENSITIVE_DATA_ACCESSED_ADMIN = "security_sensitive_data_accessed_admin",
  SECURITY_CSRF_ATTACK_DETECTED_SYSTEM = "security_csrf_attack_detected_system",
  SECURITY_XSS_ATTACK_DETECTED_SYSTEM = "security_xss_attack_detected_system",
  SECURITY_SQL_INJECTION_ATTEMPT_DETECTED_SYSTEM = "security_sql_injection_attempt_detected_system",
  SECURITY_RATE_LIMIT_EXCEEDED_SYSTEM = "security_rate_limit_exceeded_system",
  SECURITY_UNAUTHORIZED_ACCESS_ATTEMPT_SYSTEM = "security_unauthorized_access_attempt_system",

  // Other
  OTHER_ADMIN_ACTION = "other_admin_action",
  OTHER_SYSTEM_ACTION = "other_system_action",
}

/**
 * @enum {string} AuditLogTargetType
 * @description ประเภทของเป้าหมาย (Target) ที่การกระทำใน Audit Log ส่งผลถึง
 *              ใช้เพื่อช่วยในการ Query และ Filter Log ได้ง่ายขึ้น
 */
export enum AuditLogTargetType {
  USER = "User",
  NOVEL = "Novel",
  EPISODE = "Episode",
  COMMENT = "Comment",
  MEDIA = "Media",
  CATEGORY = "Category",
  TAG = "Tag",
  BADGE = "Badge",
  ACHIEVEMENT = "Achievement",
  USER_LIBRARY_ITEM = "UserLibraryItem",
  USER_ACHIEVEMENT = "UserAchievement",
  CONTENT_REPORT = "ContentReport",
  WRITER_APPLICATION = "WriterApplication",
  DONATION_APPLICATION = "DonationApplication",
  PURCHASE = "Purchase",
  PAYMENT = "Payment",
  EARNING_TRANSACTION = "EarningTransaction",
  NOTIFICATION = "Notification",
  PLATFORM_SETTING = "PlatformSetting",
  SYSTEM = "System", // สำหรับการกระทำที่เกี่ยวกับระบบโดยรวม
  API_KEY = "ApiKey",
  ROLE = "Role",
  PERMISSION = "Permission",
  OTHER = "Other",
}

/**
 * @interface IAuditLogChange
 * @description (Optional) โครงสร้างสำหรับบันทึกการเปลี่ยนแปลงของฟิลด์แต่ละฟิลด์
 * @property {string} field - ชื่อฟิลด์ที่เปลี่ยนแปลง
 * @property {any} [oldValue] - ค่าเดิมของฟิลด์ (อาจเป็น null ถ้าเป็นการสร้างใหม่)
 * @property {any} [newValue] - ค่าใหม่ของฟิลด์ (อาจเป็น null ถ้าเป็นการลบ)
 */
export interface IAuditLogChange {
  field: string;
  oldValue?: any;
  newValue?: any;
}
const AuditLogChangeSchema = new Schema<IAuditLogChange>(
  {
    field: { type: String, required: true, trim: true },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
  },
  { _id: false } // ไม่ต้องมี _id สำหรับ sub-document นี้
);

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร AuditLog (IAuditLog Document Interface)
// ==================================================================================================

/**
 * @interface IAuditLog
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารบันทึกการตรวจสอบใน Collection "auditlogs"
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสาร
 * @property {Date} timestamp - เวลาที่เกิดเหตุการณ์ (**จำเป็น**, default: `Date.now`)
 * @property {Types.ObjectId | IUser | string} actorId - ID ของผู้กระทำ (Admin/System/User ID หรือ System Name, **จำเป็น**)
 * @property {AuditLogActorType} actorType - ประเภทของผู้กระทำ (เช่น Admin, System, **จำเป็น**)
 * @property {string} [actorDisplayName] - (Optional) ชื่อที่แสดงของผู้กระทำ (เช่น Username ของ Admin, "System Process")
 * @property {string} [actorIpAddress] - (Optional) IP Address ของผู้กระทำ (ควร Hash หรือ Anonymize บางส่วน)
 * @property {string} [actorUserAgent] - (Optional) User Agent ของผู้กระทำ (ถ้ามี)
 * @property {AuditLogAction} action - ประเภทของการกระทำที่ถูกบันทึก (**จำเป็น**)
 * @property {AuditLogTargetType} [targetType] - (Optional) ประเภทของเป้าหมายที่การกระทำส่งผลถึง (เช่น "User", "Novel")
 * @property {Types.ObjectId | string} [targetId] - (Optional) ID ของเอกสารเป้าหมาย หรือ Unique Identifier อื่นๆ
 * @property {string} [targetDisplayName] - (Optional) ชื่อที่แสดงของเป้าหมาย (เช่น Username ของ User ที่ถูกแก้ไข, ชื่อ Novel)
 * @property {string} description - คำอธิบายรายละเอียดของการกระทำ (เช่น "Admin [AdminName] banned user [UserName] for policy violation.", **จำเป็น**)
 * @property {IAuditLogChange[]} [changes] - (Optional) รายการการเปลี่ยนแปลงของฟิลด์ (ถ้ามีการบันทึก oldValue/newValue)
 * @property {any} [metadata] - (Optional) ข้อมูลเพิ่มเติมอื่นๆ ที่เกี่ยวข้องกับ Log นี้ (เช่น request ID, session ID)
 * @property {string} [notes] - (Optional) หมายเหตุเพิ่มเติมจากผู้กระทำ หรือระบบ
 * @property {number} schemaVersion - เวอร์ชันของ schema (default: 1)
 * @property {Date} createdAt - วันที่สร้างเอกสาร (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตเอกสารล่าสุด (Mongoose `timestamps`)
 */
export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  timestamp: Date;
  actorId: Types.ObjectId | IUser | string; // Can be ObjectId for User/Admin, or string for System
  actorType: AuditLogActorType;
  actorDisplayName?: string;
  actorIpAddress?: string;
  actorUserAgent?: string;
  action: AuditLogAction;
  targetType?: AuditLogTargetType;
  targetId?: Types.ObjectId | string;
  targetDisplayName?: string;
  description: string;
  changes?: IAuditLogChange[];
  metadata?: any;
  notes?: string;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ AuditLog (AuditLogSchema)
// ==================================================================================================
const AuditLogSchema = new Schema<IAuditLog>(
  {
    timestamp: { type: Date, default: Date.now, required: true, index: true },
    actorId: {
      type: Schema.Types.Mixed, // ObjectId for User/Admin, String for System identifier
      required: [true, "กรุณาระบุ ID หรือชื่อของผู้กระทำ (Actor ID/Name is required)"],
      index: true,
    },
    actorType: {
      type: String,
      enum: Object.values(AuditLogActorType),
      required: [true, "กรุณาระบุประเภทของผู้กระทำ (Actor type is required)"],
      index: true,
    },
    actorDisplayName: { type: String, trim: true, maxlength: 255 },
    actorIpAddress: { type: String, trim: true, maxlength: 100 }, // Store hashed/anonymized if needed
    actorUserAgent: { type: String, trim: true, maxlength: 512 },
    action: {
      type: String,
      enum: Object.values(AuditLogAction),
      required: [true, "กรุณาระบุประเภทของการกระทำ (Action type is required)"],
      index: true,
    },
    targetType: {
      type: String,
      enum: Object.values(AuditLogTargetType).concat(null as any), // Allow null if no specific target type
      index: true,
    },
    targetId: { type: Schema.Types.Mixed, index: true }, // ObjectId or String
    targetDisplayName: { type: String, trim: true, maxlength: 500 },
    description: {
      type: String,
      required: [true, "กรุณาระบุคำอธิบายการกระทำ (Description is required)"],
      trim: true,
      minlength: [10, "คำอธิบายต้องมีอย่างน้อย 10 ตัวอักษร"],
      maxlength: [5000, "คำอธิบายต้องไม่เกิน 5000 ตัวอักษร"],
    },
    changes: { type: [AuditLogChangeSchema], default: undefined }, // Only include if there are changes
    metadata: { type: Schema.Types.Mixed },
    notes: { type: String, trim: true, maxlength: [2000, "หมายเหตุต้องไม่เกิน 2000 ตัวอักษร"] },
    schemaVersion: { type: Number, default: 1, min: 1 },
  },
  {
    timestamps: true, // createdAt, updatedAt
    collection: "auditlogs", // ชื่อ collection ที่เหมาะสม
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

// Index หลักสำหรับการ query ทั่วไป
AuditLogSchema.index({ timestamp: -1, actorType: 1, action: 1 }, { name: "AuditLogGeneralQueryIndex" });
// Index สำหรับการค้นหาตามผู้กระทำ
AuditLogSchema.index({ actorId: 1, actorType: 1, timestamp: -1 }, { name: "AuditLogByActorIndex" });
// Index สำหรับการค้นหาตามเป้าหมาย
AuditLogSchema.index({ targetType: 1, targetId: 1, timestamp: -1 }, { sparse: true, name: "AuditLogByTargetIndex" });
// Index สำหรับการค้นหาตาม IP Address (ถ้ามีการใช้งานบ่อย)
AuditLogSchema.index({ actorIpAddress: 1, timestamp: -1 }, { sparse: true, name: "AuditLogByIpAddressIndex" });

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

// Middleware ก่อน save (ถ้าต้องการ logic เพิ่มเติม เช่น การ validate ข้อมูลที่ซับซ้อน)
AuditLogSchema.pre<IAuditLog>("save", async function (next) {
  if (!this.actorDisplayName && this.actorType === AuditLogActorType.SYSTEM) {
    this.actorDisplayName = "System Process";
  }
  // หาก actorId เป็น ObjectId และ actorType คือ Admin/User และยังไม่มี actorDisplayName
  // อาจจะพยายามดึง username มาใส่ (แต่ควรทำใน service layer ที่สร้าง log เพื่อลด overhead ที่ model)
  next();
});

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

// ตรวจสอบว่า Model "AuditLog" ถูกสร้างไปแล้วหรือยัง ถ้ายัง ให้สร้าง Model ใหม่
const AuditLogModel =
  (models.AuditLog as mongoose.Model<IAuditLog>) ||
  model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLogModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Immutability**: ข้อมูลใน AuditLog ควรเป็น immutable (ไม่ควรมีการแก้ไขหลังจากสร้างแล้ว) โดยเด็ดขาด.
//     การบังคับเรื่องนี้อาจจะต้องทำในระดับ application logic หรือ database permissions.
// 2.  **Data Volume & Retention**: Audit Logs สามารถมีขนาดใหญ่ขึ้นได้อย่างรวดเร็ว.
//     ควรมีนโยบายการเก็บรักษาข้อมูล (Retention Policy) เช่น เก็บ log ล่าสุด 1-3 ปี ใน hot storage
//     และ archive log ที่เก่ากว่าไปยัง cold storage หรือลบทิ้งตามความเหมาะสมและข้อกำหนดทางกฎหมาย.
// 3.  **Performance**: การเขียน Audit Log ไม่ควรส่งผลกระทบต่อ performance ของ critical path ใน application.
//     อาจพิจารณาใช้ message queue (เช่น RabbitMQ, Kafka) เพื่อเขียน log แบบ asynchronous.
// 4.  **Detailed Changes (Old/New Values)**: การเก็บ `changes` (oldValue/newValue) มีประโยชน์มากสำหรับการตรวจสอบ
//     แต่จะเพิ่มขนาดของ document อย่างมาก. ควรพิจารณาเก็บเฉพาะการเปลี่ยนแปลงที่สำคัญจริงๆ
//     หรือเก็บเป็น JSON diff แทนที่จะเก็บ object เต็มๆ. หรืออาจจะเก็บเฉพาะฟิลด์ที่สำคัญ.
// 5.  **Security of Audit Logs**: Audit Logs เองก็เป็นข้อมูลที่ละเอียดอ่อน ควรมีการป้องกันการเข้าถึงและการแก้ไขโดยไม่ได้รับอนุญาต.
// 6.  **Query Interface**: ควรมี UI หรือเครื่องมือสำหรับ Admin ในการค้นหา, filter, และ export Audit Logs ได้อย่างสะดวก.
// 7.  **Standardization**: การกำหนด `action`, `targetType` ให้เป็นมาตรฐานและครอบคลุมจะช่วยให้การวิเคราะห์ log ทำได้ง่ายขึ้น.
// 8.  **Contextual Information**: `metadata` field สามารถใช้เก็บข้อมูลบริบทเพิ่มเติมที่อาจมีประโยชน์ในการสืบสวน
//     เช่น Request ID, Session ID, Correlation ID.
// 9.  **Actor ID for System**: สำหรับ `actorType: SYSTEM`, `actorId` อาจจะเป็นชื่อของ process หรือ service (เช่น "BackupService", "NotificationWorker").
// ==================================================================================================
