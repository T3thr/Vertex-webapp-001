// src/backend/models/User.ts
// โมเดลผู้ใช้ (User Model) - Core Identity & Authentication
// ตามมาตรฐาน DivWy (Modularized Architecture)
//
// **ปรัชญาการออกแบบใหม่:**
// โมเดลนี้ถูกปรับโครงสร้างใหม่ให้เป็น "Core User Data" ทำหน้าที่เป็นศูนย์กลางของข้อมูลระบุตัวตน,
// การยืนยันตัวตน (Authentication), และสถานะหลักของบัญชีเท่านั้น (เช่น roles, ban status)
// ข้อมูลส่วนอื่นๆ เช่น โปรไฟล์, การตั้งค่า, สถิติ, และ Gamification ถูกแยกออกไปเป็น Collections อื่น
// ที่เชื่อมโยงกันด้วย `userId` เพื่อเพิ่ม Scalability, Maintainability, และ Performance ในระดับโลก
//
// **ข้อมูลที่เก็บในโมเดลนี้ (Hot Data):**
// - ข้อมูลสำหรับการ Login (email, username, password)
// - ข้อมูลการยืนยันตัวตนผ่าน OAuth
// - บทบาท (Roles) สำหรับการควบคุมสิทธิ์
// - สถานะสำคัญของบัญชี (Verified, Banned, Deleted)
// - Token สำหรับการยืนยันต่างๆ
//
// อัปเดตล่าสุด: Refactored to Core User Model.
// อัปเดตล่าสุด: Added `primaryPenName` and `avatarUrl` for quick display purposes.

import mongoose, { Schema, model, models, Document, Types } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { ILevel } from "./Level";

// ==================================================================================================
// SECTION: อินเทอร์เฟซย่อย (Sub-Interfaces) สำหรับ Core User Data
// ==================================================================================================

/**
 * @interface IAccount
 * @description อินเทอร์เฟซสำหรับบัญชีที่เชื่อมโยง (Credentials และ OAuth Providers)
 * ยังคงอยู่ใน Core Model เพราะเป็นส่วนสำคัญของการยืนยันตัวตน
 * @property {string} provider - ชื่อ Provider (เช่น "google", "facebook", "credentials")
 * @property {string} providerAccountId - ID บัญชีจาก Provider
 * @property {"oauth" | "credentials"} type - ประเภทบัญชี
 * @property {string} [accessToken] - Access Token สำหรับ OAuth (ควร `select: false`)
 * @property {string} [refreshToken] - Refresh Token สำหรับ OAuth (ควร `select: false`)
 * @property {number} [expiresAt] - เวลาหมดอายุของ Token (timestamp)
 * @property {string} [tokenType] - Token type from OAuth provider
 * @property {string} [scope] - Token scope from OAuth provider
 * @property {string} [idToken] - ID token from OAuth provider
 * @property {string} [sessionState] - Session state from OAuth provider
 * @property {Record<string, any>} [providerData] - Additional data from OAuth provider
 */
export interface IAccount extends Document {
  provider: string;
  providerAccountId: string;
  type: "oauth" | "credentials";
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
  idToken?: string;
  sessionState?: string;
  providerData?: Record<string, any>;
}

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสารผู้ใช้ (IUser Document Interface)
// ==================================================================================================

/**
 * @interface IUser
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารผู้ใช้ใน Collection "users" (Core Data)
 * @property {mongoose.Types.ObjectId} _id - รหัส ObjectId ของเอกสารผู้ใช้
 * @property {string} [username] - ชื่อผู้ใช้ (Unique, สำหรับ login และ URL profile)
 * @property {string} [email] - อีเมล (Unique, สำหรับ login และการติดต่อ)
 * @property {string} [password] - รหัสผ่านที่ถูกเข้ารหัส (Hashed, `select: false`)
 * @property {mongoose.Types.DocumentArray<IAccount>} accounts - รายการบัญชีที่เชื่อมโยง (Credentials, OAuth)
 * @property {Array<"Reader" | "Writer" | "Admin" | "Moderator" | "Editor">} roles - บทบาทของผู้ใช้ในระบบ
 * @property {string} [primaryPenName] - (Denormalized) นามปากกาหลัก สำหรับการแสดงผลที่รวดเร็ว (เช่น ใน Comment)
 * @property {string} [avatarUrl] - (Denormalized) URL รูปโปรไฟล์ สำหรับการแสดงผลที่รวดเร็ว
 * @property {boolean} isEmailVerified - สถานะการยืนยันอีเมล
 * @property {Date} [emailVerifiedAt] - วันที่ยืนยันอีเมล
 * @property {string} [emailVerificationToken] - Token สำหรับยืนยันอีเมล (Hashed, `select: false`)
 * @property {Date} [emailVerificationTokenExpiry] - วันหมดอายุของ Token ยืนยันอีเมล (`select: false`)
 * @property {string} [passwordResetToken] - Token สำหรับรีเซ็ตรหัสผ่าน (Hashed, `select: false`)
 * @property {Date} [passwordResetTokenExpiry] - วันหมดอายุของ Token รีเซ็ตรหัสผ่าน (`select: false`)
 * @property {Date} [lastLoginAt] - วันที่ล็อกอินล่าสุด
 * @property {string} [lastIpAddress] - IP Address ล่าสุดที่ใช้ล็อกอิน (Hashed/Anonymized, `select: false`)
 * @property {boolean} isActive - สถานะบัญชีว่าใช้งานได้หรือไม่ (สำหรับ soft ban หรือ deactivation ชั่วคราว)
 * @property {boolean} isBanned - สถานะบัญชีว่าถูกระงับถาวรหรือไม่
 * @property {string} [banReason] - เหตุผลการระงับบัญชี
 * @property {Date} [bannedUntil] - วันที่การระงับบัญชีสิ้นสุดลง
 * @property {boolean} isDeleted - สถานะการลบบัญชี (Soft delete)
 * @property {Date} [deletedAt] - วันที่ทำการลบบัญชี
 *
 * @method matchPassword - ตรวจสอบรหัสผ่าน
 * @method generateEmailVerificationToken - สร้าง Token ยืนยันอีเมล
 * @method generatePasswordResetToken - สร้าง Token รีเซ็ตรหัสผ่าน
 */
export interface IUser extends Document {
  [x: string]: any;
  _id: mongoose.Types.ObjectId;
  username?: string;
  email?: string;
  password?: string;
  accounts: mongoose.Types.DocumentArray<IAccount>;
  roles: Array<"Reader" | "Writer" | "Admin" | "Moderator" | "Editor">;
  primaryPenName?: string; // Denormalized field
  avatarUrl?: string; // Denormalized field
  isEmailVerified: boolean;
  emailVerifiedAt?: Date;
  emailVerificationToken?: string;
  emailVerificationTokenExpiry?: Date;
  passwordResetToken?: string;
  passwordResetTokenExpiry?: Date;
  lastLoginAt?: Date;
  lastIpAddress?: string;
  isActive: boolean;
  isBanned: boolean;
  banReason?: string;
  bannedUntil?: Date;
  isDeleted: boolean;
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;

  // Methods
  matchPassword(enteredPassword: string): Promise<boolean>;
  generateEmailVerificationToken(): string;
  generatePasswordResetToken(): string;
}

// ==================================================================================================
// SECTION: Schema ย่อย (Sub-Schemas) สำหรับ Mongoose
// ==================================================================================================

const AccountSchema = new Schema<IAccount>(
  {
    provider: { type: String, required: [true, "กรุณาระบุ Provider"], trim: true, index: true, comment: "ชื่อผู้ให้บริการ (เช่น google, credentials)" },
    providerAccountId: { type: String, required: [true, "กรุณาระบุ Provider Account ID"], trim: true, index: true, comment: "ID บัญชีจากผู้ให้บริการ" },
    type: { type: String, enum: ["oauth", "credentials"], required: [true, "กรุณาระบุประเภทบัญชี"], comment: "ประเภทบัญชี (oauth หรือ credentials)" },
    accessToken: { type: String, select: false, comment: "Access Token (สำหรับ OAuth)" },
    refreshToken: { type: String, select: false, comment: "Refresh Token (สำหรับ OAuth)" },
    expiresAt: { type: Number, comment: "เวลาหมดอายุของ Token (timestamp)" },
    tokenType: { type: String },
    scope: { type: String },
    idToken: { type: String, select: false },
    sessionState: { type: String, select: false },
    providerData: { type: Schema.Types.Mixed, select: false },
  },
  { _id: false }
);

// ==================================================================================================
// SECTION: Schema หลักสำหรับ User (UserSchema)
// ==================================================================================================

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      minlength: [3, "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร"],
      maxlength: [50, "ชื่อผู้ใช้ต้องไม่เกิน 50 ตัวอักษร"],
      match: [/^(?=.{3,50}$)(?![_.])(?!.*[_.]{2})[a-zA-Z0-9._]+(?<![_.])$/, "ชื่อผู้ใช้สามารถมีได้เฉพาะตัวอักษรภาษาอังกฤษ, ตัวเลข, จุด (.), และขีดล่าง (_) เท่านั้น"],
      index: true,
      comment: "ชื่อผู้ใช้ (unique, สำหรับ login และ URL profile)",
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      match: [/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/, "รูปแบบอีเมลไม่ถูกต้อง"],
      index: true,
      comment: "อีเมล (unique, สำหรับ login และการติดต่อ)",
    },
    password: {
      type: String,
      select: false,
      comment: "รหัสผ่าน (Hashed, select: false)",
    },
    accounts: {
      type: [AccountSchema],
      validate: {
        validator: function (v: IAccount[]) { return v && v.length > 0; },
        message: "ผู้ใช้ต้องมีอย่างน้อยหนึ่งบัญชี (credentials หรือ OAuth)"
      },
      comment: "บัญชีที่เชื่อมโยง (Credentials, OAuth)",
    },
    roles: {
      type: [String],
      enum: ["Reader", "Writer", "Admin", "Moderator", "Editor"],
      default: ["Reader"],
      required: [true, "กรุณาระบุบทบาทของผู้ใช้"],
      comment: "บทบาทของผู้ใช้ (Reader, Writer, Admin, etc.)",
    },
    primaryPenName: {
        type: String,
        trim: true,
        maxlength: [50, "นามปากกาหลักต้องไม่เกิน 50 ตัวอักษร"],
        comment: "(Denormalized) นามปากกาหลัก สำหรับการแสดงผลที่รวดเร็ว",
    },
    avatarUrl: {
        type: String,
        trim: true,
        maxlength: [2048, "URL รูปโปรไฟล์ยาวเกินไป"],
        comment: "(Denormalized) URL รูปโปรไฟล์ สำหรับการแสดงผลที่รวดเร็ว",
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
      required: true,
      comment: "สถานะการยืนยันอีเมล",
    },
    emailVerifiedAt: {
      type: Date,
      comment: "วันที่ยืนยันอีเมล",
    },
    emailVerificationToken: { type: String, select: false, comment: "Token ยืนยันอีเมล (Hashed, select: false)" },
    emailVerificationTokenExpiry: { type: Date, select: false, comment: "วันหมดอายุ Token ยืนยันอีเมล (select: false)" },
    passwordResetToken: { type: String, select: false, comment: "Token รีเซ็ตรหัสผ่าน (Hashed, select: false)" },
    passwordResetTokenExpiry: { type: Date, select: false, comment: "วันหมดอายุ Token รีเซ็ตรหัสผ่าน (select: false)" },
    lastLoginAt: { type: Date, comment: "วันที่ล็อกอินล่าสุด" },
    lastIpAddress: { type: String, select: false, comment: "IP ล่าสุดที่ล็อกอิน (Hashed/Anonymized, select: false)" },
    isActive: { type: Boolean, default: true, index: true, comment: "บัญชีใช้งานได้หรือไม่" },
    isBanned: { type: Boolean, default: false, index: true, comment: "ถูกแบนหรือไม่" },
    banReason: { type: String, trim: true, maxlength: 1000, comment: "เหตุผลการแบน" },
    bannedUntil: { type: Date, comment: "แบนถึงเมื่อไหร่" },
    isDeleted: { type: Boolean, default: false, index: true, comment: "ลบบัญชีแล้วหรือยัง (Soft Delete)" },
    deletedAt: { type: Date, comment: "วันที่ลบบัญชี (Soft Delete)" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: "users",
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================
UserSchema.index({ email: 1 }, { unique: true, sparse: true, name: "UserEmailIndex" });
UserSchema.index({ username: 1 }, { unique: true, sparse: true, name: "UserUsernameIndex" });
UserSchema.index({ "accounts.provider": 1, "accounts.providerAccountId": 1 }, { unique: true, sparse: true, name: "UserAccountsProviderIndex" });
UserSchema.index({ roles: 1 }, { name: "UserRolesIndex" });
UserSchema.index({ lastLoginAt: -1 }, { name: "UserLastLoginIndex" });
UserSchema.index({ isDeleted: 1, deletedAt: 1 }, { name: "UserSoftDeleteIndex" });

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

// Middleware สำหรับการเข้ารหัสรหัสผ่านก่อนบันทึก
UserSchema.pre<IUser>("save", async function (next) {
  // เข้ารหัสรหัสผ่านเฉพาะเมื่อมีการแก้ไขและเป็นบัญชีประเภท 'credentials'
  if (this.isModified("password") && this.password) {
    const hasCredentialsAccount = this.accounts.some(acc => acc.type === "credentials" && acc.provider === "credentials");
    if (hasCredentialsAccount) {
      try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
      } catch (error: any) {
        return next(new Error("เกิดข้อผิดพลาดในการเข้ารหัสรหัสผ่าน: " + error.message));
      }
    } else {
      // ไม่ควรมีรหัสผ่านสำหรับบัญชีที่ไม่ใช่ credentials
      this.password = undefined;
    }
  }

  // สร้าง username อัตโนมัติจาก email สำหรับผู้ใช้ใหม่ที่ยังไม่มี username
  if (this.isNew && !this.username && this.email) {
    let baseUsername = this.email.split("@")[0].replace(/[^a-zA-Z0-9_.]/g, "").toLowerCase();
    if (!baseUsername || baseUsername.length < 3) baseUsername = "user";
    while (baseUsername.length < 3) {
      baseUsername += Math.floor(Math.random() * 10);
    }
    let potentialUsername = baseUsername.substring(0, 40);
    let count = 0;
    const UserModelInstance = models.User || model<IUser>("User");
    while (true) {
      const existingUser = await UserModelInstance.findOne({ username: potentialUsername });
      if (!existingUser) break;
      count++;
      potentialUsername = `${baseUsername.substring(0, 40 - String(count).length)}${count}`;
      if (potentialUsername.length > 50) {
        return next(new Error("ไม่สามารถสร้างชื่อผู้ใช้ที่ไม่ซ้ำกันได้"));
      }
    }
    this.username = potentialUsername;
  }

  // แปลง email เป็นตัวพิมพ์เล็กเสมอ
  if (this.isModified("email") && this.email) {
    this.email = this.email.toLowerCase();
  }

  // สำหรับผู้ใช้ใหม่ที่สมัครผ่าน OAuth และมี email ให้ตั้งค่า isEmailVerified เป็น true ทันที
  if (this.isNew && this.accounts.some(acc => acc.type === "oauth") && this.email) {
    this.isEmailVerified = true;
    this.emailVerifiedAt = new Date();
  }

  // Prioritization Logic: เมื่อมีการเพิ่ม role 'Writer'
  // ควรมี Service แยกต่างหากเพื่อสร้างเอกสารใน Collections อื่นๆ (UserProfile, WriterStats)
  const isNowWriter = this.roles.includes("Writer");
  const wasPreviouslyWriter = this.$__.priorValid ? this.$__.priorValid.roles.includes("Writer") : false;

  if (isNowWriter && !wasPreviouslyWriter) {
    // นี่เป็นจุดที่เหมาะสมในการ trigger event หรือเรียก service
    // เพื่อสร้างเอกสาร UserProfile และ WriterStats ที่เกี่ยวข้อง
    // ตัวอย่าง: await UserProfileService.createProfileForUser(this._id);
    //         await WriterStatsService.initializeStatsForUser(this._id);
    console.log(`[User Pre-Save Hook] User ${this._id} is now a Writer. Triggering profile/stats creation.`);
  }

  next();
});

// ==================================================================================================
// SECTION: Methods (เมธอดสำหรับ User Document)
// ==================================================================================================

// ตรวจสอบรหัสผ่าน
UserSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(enteredPassword, this.password);
};

// สร้าง Token สำหรับยืนยันอีเมล
UserSchema.methods.generateEmailVerificationToken = function (): string {
  const token = crypto.randomBytes(32).toString("hex");
  this.emailVerificationToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  // ตั้งเวลาหมดอายุ 1 ชั่วโมง
  this.emailVerificationTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
  return token;
};

// สร้าง Token สำหรับรีเซ็ตรหัสผ่าน
UserSchema.methods.generatePasswordResetToken = function (): string {
  const token = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  // ตั้งเวลาหมดอายุ 1 ชั่วโมง
  this.passwordResetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
  return token;
};

// ==================================================================================================
// SECTION: Cascade Delete Middleware
// ==================================================================================================

// เมื่อมีการลบบัญชีผู้ใช้ ให้ลบเอกสารทั้งหมดที่เชื่อมโยงกับ userId ในคอลเลกชันอื่น ๆ
UserSchema.pre("deleteOne", { document: true, query: false }, async function (next) {
  try {
    const userId = this._id;
    const collections = [
      "UserProfile",
      "UserSettings",
      "UserAchievement",
      "UserGamification",
      "UserLibraryItem",
      "UserSecurity",
      "UserTracking",
    ];

    await Promise.all(
      collections.map((name) => {
        const Model = mongoose.models[name] || mongoose.model(name);
        return Model.deleteMany({ userId });
      })
    );

    next();
  } catch (err) {
    next(err as Error);
  }
});

// ==================================================================================================
// SECTION: Virtuals (ฟิลด์เสมือน)
// ==================================================================================================

// สร้าง URL ของโปรไฟล์ผู้ใช้
UserSchema.virtual("profileUrl").get(function (this: IUser) {
  if (this.username) {
    return `/u/${this.username}`;
  }
  return `/users/${this._id}`;
});

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================
const UserModel = (models.User as mongoose.Model<IUser>) || model<IUser>("User", UserSchema);

export default UserModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Modular Architecture:** โมเดล `User` นี้เป็นหัวใจของสถาปัตยกรรมแบบแยกส่วน (Modular)
//     โดยตั้งใจให้มีขนาดเล็กและตอบสนองเร็วที่สุด การเปลี่ยนแปลงข้อมูลที่ไม่ใช่ Core Identity
//     (เช่น การเปลี่ยน bio, การได้รับ achievement, การเปลี่ยน theme) จะไม่กระทบต่อเอกสารนี้
//     ซึ่งช่วยลด Write-contention และ Replication lag ได้อย่างมหาศาล
//
// 2.  **Data Synchronization (Denormalization):**
//     -   `primaryPenName` และ `avatarUrl` ถูกเก็บไว้ในโมเดลนี้แบบ Denormalized เพื่อเพิ่มความเร็วในการแสดงผล
//         ในส่วนที่ต้องการข้อมูลเหล่านี้บ่อยๆ (เช่น การแสดงความคิดเห็น, รายชื่อผู้ติดตาม) โดยไม่ต้องทำการ populate หรือ join.
//     -   **ความท้าทาย**: ต้องมีกลไกที่ชัดเจนในการ Sync ข้อมูลเหล่านี้เมื่อข้อมูลต้นทางใน `UserProfile` เปลี่ยนแปลง
//         แนวทางที่ดีที่สุดคือการใช้ Event-driven Architecture (เช่น ผ่าน RabbitMQ, Kafka, หรือ Mongoose post-save hook ที่เรียก service)
//         ตัวอย่าง: เมื่อ `UserProfile` ถูกบันทึกด้วย `primaryPenName` ใหม่, จะมี event ถูกส่งออกไป และมี consumer ที่รับผิดชอบ
//         ในการอัปเดต `primaryPenName` ในเอกสาร `User` ที่เกี่ยวข้อง
//
// 3.  **Service Layer Responsibility:** การสร้างเอกสารที่เกี่ยวข้องใน Collections อื่นๆ (เช่น `UserProfile`, `UserSettings`, `WriterStats`)
//     ไม่ควรเกิดขึ้นใน pre-save hook ของ `User.ts` โดยตรงเพื่อรักษา Separation of Concerns
//     แต่ควรมอบหมายให้เป็นหน้าที่ของ "Service Layer" หรือ "Event Listeners"
//     -   **ตัวอย่าง:** เมื่อ user สมัครใหม่ (`isNew`), `AuthService` จะทำการสร้าง `User` document
//         จากนั้นจะเรียก `UserProfileService.createDefaultProfile(newUser._id)` และ `UserSettingsService.createDefaultSettings(newUser._id)`
//
// 4.  **Security & Privacy:**
//     -   ยังคงใช้ `select: false` กับ field ที่ละเอียดอ่อนเช่นเดิม
//     -   `lastIpAddress` ควรถูก Hashed หรือ Anonymized บางส่วนก่อนจัดเก็บเพื่อความเป็นส่วนตัว
//
// 5.  **Scalability:**
//     -   ขนาดเอกสารที่เล็กและคงที่ทำให้การ Index และ Caching มีประสิทธิภาพสูงสุด
//     -   เมื่อระบบต้องทำการ Sharding ในอนาคต การใช้ `_id` หรือ `username` เป็น Shard Key จะกระจายข้อมูลผู้ใช้ได้ดี
//       เพราะเอกสารมีขนาดเล็กและเข้าถึงอย่างสม่ำเสมอ
//
// 6.  **Transitioning from Monolithic Model:**
//     -   สำหรับระบบที่มีอยู่แล้ว การย้ายข้อมูลจากโมเดลเก่ามาสู่โครงสร้างใหม่นี้จะต้องใช้ Migration Script
//       ที่จะอ่านข้อมูลจากเอกสาร `User` เก่า แล้วสร้างเอกสารใหม่ใน `users`, `userprofiles`, `usersettings` ฯลฯ
//       พร้อมทั้งลบฟิลด์ที่ย้ายออกไปแล้วออกจากเอกสาร `users` เดิม
// ==================================================================================================