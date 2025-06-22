// src/backend/models/UserSecurity.ts
// โมเดลความปลอดภัยผู้ใช้ (UserSecurity Model) - Sensitive Account Security & Verification Data
// ตามมาตรฐาน DivWy (Modularized Architecture)
//
// **ปรัชญาการออกแบบ:**
// โมเดลนี้ถูกสร้างขึ้นเพื่อเป็น "ห้องนิรภัย" (Vault) สำหรับจัดเก็บข้อมูลที่เกี่ยวข้องกับ
// ความปลอดภัยของบัญชีและการยืนยันตัวตน (KYC) ที่มีความอ่อนไหวสูงมาก การแยกออกมาอย่างเด็ดขาดมีจุดประสงค์เพื่อ:
// 1.  **Principle of Least Privilege:** จำกัดการเข้าถึงข้อมูลนี้ให้แคบที่สุด เฉพาะ Service ที่เกี่ยวข้องกับความปลอดภัย (Security Service, Auth Service) เท่านั้นที่ควรจะเข้าถึงได้
// 2.  **Enhanced Security:** ลดพื้นที่การโจมตี (Attack Surface) การที่ข้อมูลนี้ไม่ได้อยู่รวมกับข้อมูลทั่วไป (เช่น โปรไฟล์) ทำให้ยากต่อการเข้าถึงโดยไม่ตั้งใจหรือโดยผู้ไม่หวังดี
// 3.  **Auditability:** ง่ายต่อการตรวจสอบ (Audit) การเข้าถึงและการเปลี่ยนแปลงข้อมูลที่ละเอียดอ่อนทั้งหมดในที่เดียว
// 4.  **Compliance:** ช่วยในการปฏิบัติตามข้อบังคับด้านความเป็นส่วนตัวของข้อมูล (เช่น GDPR, PDPA) ซึ่งกำหนดให้ต้องมีการป้องกันข้อมูลที่ละเอียดอ่อนเป็นพิเศษ
//
// **ข้อมูลที่เก็บในโมเดลนี้ (Highly Sensitive Data):**
// - การตั้งค่า 2FA (Two-Factor Authentication)
// - ข้อมูลการยืนยันตัวตน (KYC Status)
// - ประวัติการพยายามล็อกอิน, Active Sessions
// - ข้อมูลการล็อกอินล่าสุด (IP Address)
//
// อัปเดตล่าสุด: Created as part of the modular architecture refactor.

import mongoose, { Schema, model, models, Document, Types } from "mongoose";

// ==================================================================================================
// SECTION: อินเทอร์เฟซย่อย (Sub-Interfaces) สำหรับ UserSecurity
// ==================================================================================================

/**
 * @interface IUserVerification
 * @description ข้อมูลการยืนยันตัวตน (KYC) (ย้ายมาจาก User.ts)
 */
export interface IUserVerification {
  kycStatus: "none" | "pending" | "verified" | "rejected" | "requires_resubmission";
  kycSubmittedAt?: Date;
  kycReviewedAt?: Date;
  kycVerifiedAt?: Date;
  kycRejectionReason?: string;
  kycApplicationId?: Types.ObjectId;
}

/**
 * @interface IActiveSession
 * @description ข้อมูล Session ที่กำลังใช้งานอยู่
 */
export interface IActiveSession {
    sessionId: string;
    ipAddress: string;
    userAgent: string;
    lastAccessedAt: Date;
    createdAt: Date;
    isCurrentSession?: boolean;
}

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสารความปลอดภัยผู้ใช้ (IUserSecurity Document Interface)
// ==================================================================================================

/**
 * @interface IUserSecurity
 * @extends Document
 * @description อินเทอร์เฟซสำหรับเอกสารใน Collection "usersecurities"
 * @property {Types.ObjectId} userId - ID ของผู้ใช้ที่อ้างอิงถึง Collection 'users' (Foreign Key)
 * @property {Date} [lastPasswordChangeAt] - วันที่เปลี่ยนรหัสผ่านล่าสุด
 * @property {object} twoFactorAuthentication - การตั้งค่าการยืนยันตัวตนแบบสองปัจจัย (2FA)
 * @property {object} loginAttempts - ข้อมูลการพยายามล็อกอินที่ผิดพลาด
 * @property {IActiveSession[]} activeSessions - รายการ Session ที่กำลังใช้งานอยู่
 * @property {IUserVerification} verification - ข้อมูลการยืนยันตัวตน (KYC)
 * @property {Date} [lastLoginAt] - วันที่ล็อกอินล่าสุด
 * @property {string} [lastIpAddress] - IP Address ล่าสุดที่ใช้ล็อกอิน (ควร `select: false`)
 */
export interface IUserSecurity extends Document {
  userId: Types.ObjectId;
  lastPasswordChangeAt?: Date;
  twoFactorAuthentication: {
    isEnabled: boolean;
    method?: "otp" | "sms" | "email";
    secret?: string;
    backupCodes?: string[];
    verifiedAt?: Date;
  };
  loginAttempts: {
    count: number;
    lastAttemptAt?: Date;
    lockoutUntil?: Date;
  };
  activeSessions: IActiveSession[];
  verification: IUserVerification;
  lastLoginAt?: Date;
  lastIpAddress?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ==================================================================================================
// SECTION: Schema ย่อย (Sub-Schemas) สำหรับ Mongoose
// ==================================================================================================

const UserVerificationSchema = new Schema<IUserVerification>(
  {
    kycStatus: { type: String, enum: ["none", "pending", "verified", "rejected", "requires_resubmission"], default: "none", index: true, comment: "สถานะ KYC" },
    kycSubmittedAt: { type: Date, comment: "วันที่ส่งคำขอ KYC" },
    kycReviewedAt: { type: Date, comment: "วันที่ตรวจสอบ KYC" },
    kycVerifiedAt: { type: Date, comment: "วันที่อนุมัติ KYC" },
    kycRejectionReason: { type: String, trim: true, maxlength: 1000, comment: "เหตุผลการปฏิเสธ KYC" },
    kycApplicationId: { type: Schema.Types.ObjectId, comment: "ID ใบคำขอ KYC" },
  },
  { _id: false }
);

const ActiveSessionSchema = new Schema<IActiveSession>(
  {
    sessionId: { type: String, required: true, comment: "ID เซสชัน" },
    ipAddress: { type: String, required: true, select: false, comment: "IP Address" },
    userAgent: { type: String, required: true, select: false, comment: "User Agent" },
    lastAccessedAt: { type: Date, required: true, comment: "เวลาที่เข้าถึงล่าสุด" },
    createdAt: { type: Date, required: true, default: Date.now, comment: "เวลาที่สร้างเซสชัน" },
    isCurrentSession: { type: Boolean, comment: "เป็นเซสชันปัจจุบันหรือไม่" },
  },
  { _id: false }
);

// ==================================================================================================
// SECTION: Schema หลักสำหรับ UserSecurity (UserSecuritySchema)
// ==================================================================================================

const UserSecuritySchema = new Schema<IUserSecurity>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true, comment: "FK to User collection" },
    lastPasswordChangeAt: { type: Date, comment: "วันที่เปลี่ยนรหัสผ่านล่าสุด" },
    twoFactorAuthentication: {
      _id: false,
      isEnabled: { type: Boolean, default: false, comment: "เปิดใช้งาน 2FA หรือไม่" },
      method: { type: String, enum: ["otp", "sms", "email"], comment: "วิธีการ 2FA" },
      secret: { type: String, select: false, comment: "Secret Key (สำหรับ OTP)" },
      backupCodes: { type: [String], select: false, comment: "รหัสสำรอง" },
      verifiedAt: { type: Date, comment: "วันที่ยืนยัน 2FA" },
    },
    loginAttempts: {
      _id: false,
      count: { type: Number, default: 0, min: 0, comment: "จำนวนครั้งที่ผิดพลาด" },
      lastAttemptAt: { type: Date, comment: "เวลาที่พยายามล่าสุด" },
      lockoutUntil: { type: Date, comment: "ล็อกบัญชีถึงเมื่อไหร่" },
    },
    activeSessions: { type: [ActiveSessionSchema], default: [] },
    verification: {
        type: UserVerificationSchema,
        default: () => ({ kycStatus: "none" }),
        required: true,
        comment: "ข้อมูลการยืนยันตัวตน (KYC)",
    },
    lastLoginAt: { type: Date, comment: "วันที่ล็อกอินล่าสุด" },
    lastIpAddress: { type: String, select: false, comment: "IP ล่าสุดที่ล็อกอิน (Hashed/Anonymized, select: false)" },
  },
  {
    timestamps: true,
    collection: "usersecurities",
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================
UserSecuritySchema.index({ "verification.kycStatus": 1 }, { name: "UserSecurityKYCStatusIndex" });
UserSecuritySchema.index({ "activeSessions.sessionId": 1 }, { sparse: true, name: "UserSecuritySessionIdIndex" });
UserSecuritySchema.index({ "loginAttempts.lockoutUntil": 1 }, { sparse: true, name: "UserSecurityLockoutIndex" });


// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================
UserSecuritySchema.pre<IUserSecurity>("save", async function (next) {
    // Logic ในส่วนนี้ควรจะน้อยที่สุด การจัดการ Session, 2FA, หรือ KYC
    // ควรเกิดขึ้นใน Service Layer ที่รับผิดชอบโดยตรง เพื่อรักษาความสะอาดของ Model
    // Hook นี้อาจมีไว้สำหรับการ Hashing ข้อมูลบางอย่างก่อนบันทึกในอนาคต

    // ตัวอย่าง: ถ้ามีการเก็บ IP Address และต้องการ Hash ก่อนบันทึก
    // if (this.isModified("lastIpAddress") && this.lastIpAddress) {
    //   // Logic to hash or anonymize the IP address
    //   this.lastIpAddress = await hashIp(this.lastIpAddress);
    // }

    console.log(`[UserSecurity Pre-Save Hook] Saving security data for user ${this.userId}...`);
    next();
});

// ==================================================================================================
// SECTION: Virtuals (ฟิลด์เสมือน)
// ==================================================================================================
// ไม่มี Virtuals ในโมเดลนี้ เนื่องจากเป็นข้อมูลดิบด้านความปลอดภัย

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================
const UserSecurityModel = (models.UserSecurity as mongoose.Model<IUserSecurity>) || model<IUserSecurity>("UserSecurity", UserSecuritySchema);

export default UserSecurityModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Strict Access Control:** นี่คือ Collection ที่มีความอ่อนไหวสูงสุด การเข้าถึงต้องถูกจำกัดอย่างเข้มงวดในระดับ Application และ Infrastructure
//     ควรมีเพียง "SecurityService" หรือ "AuthService" เท่านั้นที่ได้รับสิทธิ์ในการเขียนหรืออ่านข้อมูลทั้งหมดใน Collection นี้
//
// 2.  **Data Encryption:** สำหรับข้อมูลที่อ่อนไหวมากที่สุด เช่น `twoFactorAuthentication.secret`, `twoFactorAuthentication.backupCodes`
//     นอกจากการใช้ `select: false` แล้ว ควรพิจารณาการเข้ารหัสข้อมูลในระดับฟิลด์ (Field-Level Encryption) เพื่อเพิ่มความปลอดภัยอีกชั้นหนึ่ง
//
// 3.  **Creation Lifecycle:** เอกสารใน Collection นี้ควรถูกสร้างขึ้นพร้อมกับ User หลักเสมอ โดย "AuthService" หรือ "UserService"
//     ที่รับผิดชอบการสร้างผู้ใช้ใหม่ จะต้องสร้างเอกสารใน `users` และ `usersecurities` (และ Collection เริ่มต้นอื่นๆ) ควบคู่กันไปใน Transaction เดียวกัน (ถ้าเป็นไปได้)
//
// 4.  **IP Address Handling:** การเก็บ `lastIpAddress` ควรเป็นไปตามนโยบายความเป็นส่วนตัว ควรพิจารณา Anonymize หรือ Hash ข้อมูล IP Address
//     ก่อนทำการบันทึกเพื่อปกป้องความเป็นส่วนตัวของผู้ใช้
//
// 5.  **Auditing:** ควรมีระบบ Logging ที่ละเอียดสำหรับการเข้าถึงหรือเปลี่ยนแปลงข้อมูลใน Collection นี้ทุกครั้ง เพื่อให้สามารถตรวจสอบย้อนหลังได้เมื่อเกิดเหตุการณ์ด้านความปลอดภัย
//
// 6.  **Relation to Other Models:**
//     -   `userId`: เป็น Foreign Key หลักที่ใช้ในการเชื่อมโยงกลับไปยัง `User` model อย่างเหนียวแน่น
//     -   `verification.kycApplicationId`: อาจอ้างอิงไปยัง `KYCApplication` Collection แยกต่างหาก หากกระบวนการ KYC มีข้อมูลที่ซับซ้อนมาก
// ==================================================================================================