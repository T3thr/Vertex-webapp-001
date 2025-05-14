// src/backend/models/User.ts
// โมเดลผู้ใช้ (User Model) - ศูนย์กลางข้อมูลผู้ใช้ทั้งหมดสำหรับการยืนยันตัวตน (Credentials และ OAuth), การตั้งค่า, สถิติ, และการจัดการบัญชี
// รวม SocialMediaUser.ts เข้ากับ User.ts เพื่อใช้ Collection เดียว, ปรับปรุงการจัดการ OAuth

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// --- อินเทอร์เฟซย่อยสำหรับการตั้งค่าผู้ใช้ (User Preferences) ---

// การตั้งค่าการแสดงผลส่วนการอ่าน
export interface IUserReadingDisplayPreferences {
  fontFamily?: string; // ชื่อฟอนต์ที่ผู้ใช้เลือกสำหรับการอ่าน (ถ้ามีตัวเลือก)
                       // ตัวอย่าง: "Sarabun", "Tahoma"
  fontSize: "small" | "medium" | "large" | number; // ขนาดตัวอักษร (อาจใช้ enum หรือค่าตัวเลข)
                                                  // ตัวอย่าง: "medium" หรือ 16
  lineHeight?: number; // ระยะห่างระหว่างบรรทัด (เช่น 1.5, 1.8)
                       // ตัวอย่าง: 1.6
  textAlignment?: "left" | "justify"; // การจัดแนวข้อความ
                                      // ตัวอย่าง: "justify"
  readingModeLayout: "paginated" | "scrolling"; // รูปแบบการอ่าน (แบ่งหน้า หรือ เลื่อนยาว)
                                                // ตัวอย่าง: "scrolling"
}

// การตั้งค่าการเข้าถึง
export interface IUserAccessibilityDisplayPreferences {
  dyslexiaFriendlyFont?: boolean; // เปิด/ปิดการใช้ฟอนต์ที่เหมาะสำหรับผู้มีภาวะ Dyslexia
                                  // ตัวอย่าง: true
  highContrastMode?: boolean; // เปิด/ปิดโหมดความคมชัดสูง
                              // ตัวอย่าง: false
}

// การตั้งค่าการแสดงผลโดยรวม
export interface IUserDisplayPreferences {
  theme: "light" | "dark" | "system" | "sepia" | "system_default"; // ธีม UI ที่ผู้ใช้เลือก
                                                                  // ตัวอย่าง: "dark"
  reading: IUserReadingDisplayPreferences; // การตั้งค่าการแสดงผลส่วนการอ่าน
  accessibility: IUserAccessibilityDisplayPreferences; // การตั้งค่าการเข้าถึง
}

// การตั้งค่าการแจ้งเตือนสำหรับแต่ละช่องทาง (อีเมล, พุช, ภายในแอป)
export interface INotificationChannelSettings {
  enabled: boolean; // เปิด/ปิดการแจ้งเตือนสำหรับช่องทางนี้ทั้งหมด
                    // ตัวอย่าง: true
  newsletter?: boolean; // รับข่าวสารจากแพลตฟอร์ม (เฉพาะ email)
                       // ตัวอย่าง: true
  novelUpdatesFromFollowing: boolean; // รับการอัปเดตนิยายที่ติดตาม
                                      // ตัวอย่าง: true
  newFollowers: boolean; // แจ้งเตือนเมื่อมีผู้ติดตามใหม่
                         // ตัวอย่าง: true
  commentsOnMyNovels: boolean; // แจ้งเตือนเมื่อมีความคิดเห็นในนิยายของฉัน
                               // ตัวอย่าง: true
  repliesToMyComments: boolean; // แจ้งเตือนเมื่อมีการตอบกลับความคิดเห็นของฉัน
                                // ตัวอย่าง: true
  donationAlerts: boolean; // แจ้งเตือนเกี่ยวกับการบริจาค
                           // ตัวอย่าง: true
  systemAnnouncements: boolean; // รับประกาศสำคัญจากระบบ
                               // ตัวอย่าง: true
  securityAlerts?: boolean; // รับการแจ้งเตือนด้านความปลอดภัย
                           // ตัวอย่าง: true
  promotionalOffers: boolean; // รับข้อเสนอโปรโมชั่น
                             // ตัวอย่าง: false
  achievementUnlocks: boolean; // แจ้งเตือนเมื่อปลดล็อกความสำเร็จ
                              // ตัวอย่าง: true
}

// การตั้งค่าการแจ้งเตือนโดยรวม
export interface IUserPreferencesNotifications {
  masterNotificationsEnabled: boolean; // สวิตช์หลัก เปิด/ปิดการแจ้งเตือนทั้งหมด
                                     // ตัวอย่าง: true
  email: INotificationChannelSettings; // การตั้งค่าการแจ้งเตือนทางอีเมล
  push: INotificationChannelSettings; // การตั้งค่าการแจ้งเตือนแบบพุช
  inApp: INotificationChannelSettings; // การตั้งค่าการแจ้งเตือนภายในแอป
}

// การตั้งค่าเนื้อหาและความเป็นส่วนตัว
export interface IUserContentPrivacyPreferences {
  showMatureContent: boolean; // แสดงเนื้อหาสำหรับผู้ใหญ่
                            // ตัวอย่าง: false
  preferredGenres: Types.ObjectId[]; // ID ของหมวดหมู่นิยายที่ชื่นชอบ
                                   // ตัวอย่าง: [new Types.ObjectId("60d5ec49a035f5d0c8e1f2a1")]
  blockedGenres?: Types.ObjectId[]; // ID ของหมวดหมู่นิยายที่ไม่ต้องการเห็น
                                    // ตัวอย่าง: [new Types.ObjectId("60d5ec49a035f5d0c8e1f2b1")]
  blockedTags?: string[]; // Tags ที่ไม่ต้องการเห็น
                        // ตัวอย่าง: ["gore", "non-con"]
  blockedAuthors?: Types.ObjectId[]; // ID ของผู้เขียนที่ไม่ต้องการเห็นเนื้อหา
  blockedNovels?: Types.ObjectId[]; // ID ของนิยายที่ไม่ต้องการเห็น
  profileVisibility: "public" | "followers_only" | "private"; // การตั้งค่าการมองเห็นโปรไฟล์
                                                            // ตัวอย่าง: "public"
  readingHistoryVisibility: "public" | "followers_only" | "private"; // การตั้งค่าการมองเห็นประวัติการอ่าน
                                                                  // ตัวอย่าง: "followers_only"
  showActivityStatus: boolean; // แสดงสถานะออนไลน์/กิจกรรมล่าสุด
                             // ตัวอย่าง: true
  allowDirectMessagesFrom: "everyone" | "followers" | "no_one"; // ใครสามารถส่งข้อความส่วนตัว
                                                              // ตัวอย่าง: "followers"
}

// อินเทอร์เฟซหลักสำหรับการตั้งค่าผู้ใช้
export interface IUserPreferences {
  language: string; // ภาษาที่ผู้ใช้เลือกสำหรับ UI
                      // ตัวอย่าง: "th"
  display: IUserDisplayPreferences; // การตั้งค่าการแสดงผล
  notifications: IUserPreferencesNotifications; // การตั้งค่าการแจ้งเตือน
  contentAndPrivacy: IUserContentPrivacyPreferences; // การตั้งค่าเนื้อหาและความเป็นส่วนตัว
}

// --- อินเทอร์เฟซอื่นๆ ที่เกี่ยวข้อง ---

// อินเทอร์เฟซสำหรับบัญชีที่เชื่อมโยง (Credentials และ OAuth)
export interface IAccount extends Document {
  provider: string; // เช่น "google", "facebook", "credentials"
                    // ตัวอย่าง: "google"
  providerAccountId: string; // ID จาก provider
                           // ตัวอย่าง: "102938475612309876543"
  type: "oauth" | "credentials"; // ประเภทบัญชี
                                // ตัวอย่าง: "oauth"
  accessToken?: string; // Token สำหรับ OAuth
  refreshToken?: string; // Refresh token สำหรับ OAuth
  expiresAt?: number; // วันหมดอายุของ token
  tokenType?: string; // ประเภท token
  scope?: string; // ขอบเขตการเข้าถึงของ OAuth
                  // ตัวอย่าง: "email profile"
  idToken?: string; // ID token (สำหรับ OIDC)
  sessionState?: string; // สถานะ session (สำหรับ OIDC)
  providerData?: Record<string, any>; // ข้อมูลเพิ่มเติมจาก provider
}

// อินเทอร์เฟซสำหรับโปรไฟล์ผู้ใช้
export interface IUserProfile {
  displayName?: string; // ชื่อที่แสดง
                        // ตัวอย่าง: "นักอ่านเงา"
  avatarUrl?: string; // URL รูปโปรไฟล์
                      // ตัวอย่าง: "https://example.com/avatars/user123.png"
  coverImageUrl?: string; // URL รูปปกโปรไฟล์
                         // ตัวอย่าง: "https://example.com/covers/user123.jpg"
  bio?: string; // คำอธิบายตัวตน
                // ตัวอย่าง: "รักการอ่านนิยายแฟนตาซี"
  gender?: "male" | "female" | "other" | "prefer_not_to_say"; // เพศ
                                                              // ตัวอย่าง: "female"
  dateOfBirth?: Date; // วันเกิด
                      // ตัวอย่าง: new Date("1995-08-15")
  country?: string; // ประเทศ (ISO 3166-1 alpha-2)
                    // ตัวอย่าง: "TH"
  timezone?: string; // เขตเวลา
                     // ตัวอย่าง: "Asia/Bangkok"
  location?: string; // ที่อยู่
                     // ตัวอย่าง: "กรุงเทพมหานคร"
  websiteUrl?: string; // URL เว็บไซต์ส่วนตัว
                       // ตัวอย่าง: "https://myblog.example.com"
}

// อินเทอร์เฟซสำหรับสถิติการใช้งาน
export interface IUserTrackingStats {
  totalLoginDays: number; // จำนวนวันที่เข้าสู่ระบบ
                          // ตัวอย่าง: 150
  totalNovelsRead: number; // จำนวนนิยายที่อ่านจบ
                           // ตัวอย่าง: 25
  totalEpisodesRead: number; // จำนวนตอนที่อ่าน
                            // ตัวอย่าง: 500
  totalTimeSpentReadingSeconds: number; // เวลารวมที่ใช้ในการอ่าน (วินาที)
                                       // ตัวอย่าง: 720000
  totalCoinSpent: number; // จำนวนเหรียญที่ใช้จ่าย
                         // ตัวอย่าง: 1200
  totalRealMoneySpent: number; // จำนวนเงินจริงที่ใช้จ่าย
                               // ตัวอย่าง: 500.00
  lastNovelReadId?: Types.ObjectId; // ID นิยายที่อ่านล่าสุด
  lastNovelReadAt?: Date; // วันที่อ่านนิยายล่าสุด
  joinDate: Date; // วันที่สมัครสมาชิก
  firstLoginAt?: Date; // วันที่ล็อกอินครั้งแรก
}

// อินเทอร์เฟซสำหรับสถิติทางสังคม
export interface IUserSocialStats {
  followersCount: number; // จำนวนผู้ติดตาม
                          // ตัวอย่าง: 120
  followingCount: number; // จำนวนที่กำลังติดตาม
                          // ตัวอย่าง: 75
  novelsCreatedCount: number; // จำนวนนิยายที่สร้าง
                             // ตัวอย่าง: 5
  commentsMadeCount: number; // จำนวนความคิดเห็น
                            // ตัวอย่าง: 230
  ratingsGivenCount: number; // จำนวนการให้คะแนน
                           // ตัวอย่าง: 80
  likesGivenCount: number; // จำนวนการกดถูกใจ
                         // ตัวอย่าง: 1500
}

// อินเทอร์เฟซสำหรับกระเป๋าเงิน
export interface IUserWallet {
  coinBalance: number; // ยอดเหรียญสะสม
                       // ตัวอย่าง: 500
  lastCoinTransactionAt?: Date; // วันที่ทำธุรกรรมเหรียญล่าสุด
}

// อินเทอร์เฟซสำหรับระบบ Gamification
export interface IUserGamification {
  level: number; // ระดับผู้ใช้
                 // ตัวอย่าง: 15
  experiencePoints: number; // คะแนนประสบการณ์
                           // ตัวอย่าง: 12500
  nextLevelXPThreshold: number; // XP สำหรับระดับถัดไป
                               // ตัวอย่าง: 15000
  achievements: Types.ObjectId[]; // ID ของ Achievement
                                  // ตัวอย่าง: [new Types.ObjectId("...")]
  loginStreaks: {
    currentStreakDays: number; // สตรีคการล็อกอินปัจจุบัน
                               // ตัวอย่าง: 7
    longestStreakDays: number; // สตรีคการล็อกอินนานที่สุด
                               // ตัวอย่าง: 30
    lastLoginDate?: Date; // วันที่ล็อกอินครั้งล่าสุด
  };
  dailyCheckIn: {
    lastCheckInDate?: Date; // วันที่เช็คอินล่าสุด
    currentStreakDays: number; // สตรีคการเช็คอิน
                               // ตัวอย่าง: 3
  };
}

// อินเทอร์เฟซสำหรับการยืนยันตัวตน (KYC) และการเป็นนักเขียน
export interface IUserVerification {
  kycStatus: "none" | "pending" | "verified" | "rejected" | "requires_resubmission"; // สถานะ KYC
                                                                                      // ตัวอย่าง: "verified"
  kycSubmittedAt?: Date;
  kycReviewedAt?: Date;
  kycVerifiedAt?: Date;
  kycRejectionReason?: string;
  kycApplicationId?: Types.ObjectId; // ID คำขอ KYC
  writerApplicationStatus: "none" | "pending" | "approved" | "rejected"; // สถานะสมัครนักเขียน
                                                                         // ตัวอย่าง: "approved"
  writerApplicationId?: Types.ObjectId; // ID ใบสมัครนักเขียน
  writerApplicationSubmittedAt?: Date;
  writerApplicationReviewedAt?: Date;
  writerApplicationApprovedAt?: Date;
  writerRejectionReason?: string;
}

// อินเทอร์เฟซสำหรับการตั้งค่าการรับบริจาค
export interface IUserDonationSettings {
  activeAuthorDirectDonationAppId?: Types.ObjectId; // ID DonationApplication
  isEligibleForDonation: boolean; // มีคุณสมบัติรับบริจาค
                                  // ตัวอย่าง: true
}

// อินเทอร์เฟซสำหรับการตั้งค่าความปลอดภัย
export interface IUserSecuritySettings {
  lastPasswordChangeAt?: Date; // วันที่เปลี่ยนรหัสผ่านล่าสุด
  twoFactorAuthentication: {
    isEnabled: boolean; // เปิด/ปิด 2FA
                       // ตัวอย่าง: true
    method?: "otp" | "sms" | "email"; // วิธีการยืนยัน
                                     // ตัวอย่าง: "otp"
    secret?: string; // OTP secret
    backupCodes?: string[]; // รหัสสำรอง
    verifiedAt?: Date; // วันที่เปิดใช้งาน 2FA
  };
  loginAttempts: {
    count: number; // จำนวนครั้งที่ล็อกอินผิดพลาด
                   // ตัวอย่าง: 2
    lastAttemptAt?: Date; // เวลาล็อกอินผิดพลาดล่าสุด
    lockoutUntil?: Date; // ล็อกบัญชีจนถึง
  };
  activeSessions: Array<{
    sessionId: string; // ID ของ session
    ipAddress: string; // IP Address
    userAgent: string; // User agent
    lastAccessedAt: Date; // เวลาเข้าถึงล่าสุด
    createdAt: Date; // เวลาสร้าง session
    isCurrentSession?: boolean; // session ปัจจุบัน
  }>;
}

// อินเทอร์เฟซหลักสำหรับเอกสารผู้ใช้
export interface IUser extends Document {
  _id: Types.ObjectId;
  username?: string; // ชื่อผู้ใช้ (อาจไม่มีสำหรับ OAuth)
                    // ตัวอย่าง: "user123"
  email?: string; // อีเมล (อาจไม่มีสำหรับบาง OAuth)
                  // ตัวอย่าง: "user123@example.com"
  password?: string; // รหัสผ่าน (hashed, สำหรับ credentials)
  accounts: Types.DocumentArray<IAccount>; // บัญชีที่เชื่อมโยง
  roles: Array<"Reader" | "Writer" | "Admin" | "Moderator" | "Editor">; // บทบาทผู้ใช้
                                                                       // ตัวอย่าง: ["Reader", "Writer"]
  profile: IUserProfile; // ข้อมูลโปรไฟล์
  trackingStats: IUserTrackingStats; // สถิติการใช้งาน
  socialStats: IUserSocialStats; // สถิติทางสังคม
  preferences: IUserPreferences; // การตั้งค่าผู้ใช้
  wallet: IUserWallet; // กระเป๋าเงิน
  gamification: IUserGamification; // ระบบ Gamification
  verifiedBadges?: string[]; // ป้ายยืนยัน
                             // ตัวอย่าง: ["Verified Writer"]
  verification?: IUserVerification; // ข้อมูล KYC
  donationSettings?: IUserDonationSettings; // การตั้งค่าบริจาค
  securitySettings?: IUserSecuritySettings; // การตั้งค่าความปลอดภัย
  writerStatsId?: Types.ObjectId; // ID สถิตินักเขียน
  isEmailVerified: boolean; // สถานะยืนยันอีเมล
                           // ตัวอย่าง: true
  emailVerified?: Date; // วันที่ยืนยันอีเมล (สำหรับ OAuth)
                        // ตัวอย่าง: new Date("2025-05-15")
  emailVerificationToken?: string; // Token ยืนยันอีเมล
  emailVerificationTokenExpiry?: Date; // วันหมดอายุ Token
  passwordResetToken?: string; // Token รีเซ็ตรหัสผ่าน
  passwordResetTokenExpiry?: Date; // วันหมดอายุ Token
  lastLoginAt?: Date; // วันที่ล็อกอินล่าสุด
  lastIpAddress?: string; // IP ล่าสุดที่ล็อกอิน
  isActive: boolean; // บัญชีใช้งาน
                     // ตัวอย่าง: true
  isBanned: boolean; // บัญชีถูกระงับ
                      // ตัวอย่าง: false
  banReason?: string; // เหตุผลการระงับ
  bannedUntil?: Date; // ระงับถึงวันที่
  isDeleted: boolean; // สถานะการลบ
                       // ตัวอย่าง: false
  deletedAt?: Date; // วันที่ทำการลบ

  createdAt: Date;
  updatedAt: Date;

  // Methods
  matchPassword(enteredPassword: string): Promise<boolean>;
  generateEmailVerificationToken(): string;
  generatePasswordResetToken(): string;
}

// ----- Schema ย่อย -----

// Schema การตั้งค่าการแสดงผลส่วนการอ่าน
const UserReadingDisplayPreferencesSchema = new Schema<IUserReadingDisplayPreferences>(
  {
    fontFamily: { type: String, trim: true },
    fontSize: { type: Schema.Types.Mixed, required: true, default: "medium" },
    lineHeight: { type: Number, min: 1, max: 3 },
    textAlignment: { type: String, enum: ["left", "justify"], default: "left" },
    readingModeLayout: { type: String, enum: ["paginated", "scrolling"], default: "scrolling" },
  },
  { _id: false }
);

// Schema การตั้งค่าการเข้าถึง
const UserAccessibilityDisplayPreferencesSchema = new Schema<IUserAccessibilityDisplayPreferences>(
  {
    dyslexiaFriendlyFont: { type: Boolean, default: false },
    highContrastMode: { type: Boolean, default: false },
  },
  { _id: false }
);

// Schema การตั้งค่าการแสดงผล
const UserDisplayPreferencesSchema = new Schema<IUserDisplayPreferences>(
  {
    theme: { type: String, enum: ["light", "dark", "system", "sepia", "system_default"], default: "system" },
    reading: { type: UserReadingDisplayPreferencesSchema, default: () => ({ fontSize: "medium", readingModeLayout: "scrolling" }) },
    accessibility: { type: UserAccessibilityDisplayPreferencesSchema, default: () => ({}) },
  },
  { _id: false }
);

// Schema การตั้งค่าแจ้งเตือนแต่ละช่องทาง
const NotificationChannelSettingsSchema = new Schema<INotificationChannelSettings>(
  {
    enabled: { type: Boolean, default: true },
    newsletter: { type: Boolean, default: true },
    novelUpdatesFromFollowing: { type: Boolean, default: true },
    newFollowers: { type: Boolean, default: true },
    commentsOnMyNovels: { type: Boolean, default: true },
    repliesToMyComments: { type: Boolean, default: true },
    donationAlerts: { type: Boolean, default: true },
    systemAnnouncements: { type: Boolean, default: true },
    securityAlerts: { type: Boolean, default: true },
    promotionalOffers: { type: Boolean, default: false },
    achievementUnlocks: { type: Boolean, default: true },
  },
  { _id: false }
);

// Schema การตั้งค่าแจ้งเตือน
const UserPreferencesNotificationsSchema = new Schema<IUserPreferencesNotifications>(
  {
    masterNotificationsEnabled: { type: Boolean, default: true },
    email: { type: NotificationChannelSettingsSchema, default: () => ({ enabled: true, newsletter: true }) },
    push: { type: NotificationChannelSettingsSchema, default: () => ({ enabled: true }) },
    inApp: { type: NotificationChannelSettingsSchema, default: () => ({ enabled: true }) },
  },
  { _id: false }
);

// Schema การตั้งค่าเนื้อหาและความเป็นส่วนตัว
const UserContentPrivacyPreferencesSchema = new Schema<IUserContentPrivacyPreferences>(
  {
    showMatureContent: { type: Boolean, default: false },
    preferredGenres: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    blockedGenres: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    blockedTags: [{ type: String, trim: true, lowercase: true }],
    blockedAuthors: [{ type: Schema.Types.ObjectId, ref: "User" }],
    blockedNovels: [{ type: Schema.Types.ObjectId, ref: "Novel" }],
    profileVisibility: { type: String, enum: ["public", "followers_only", "private"], default: "public" },
    readingHistoryVisibility: { type: String, enum: ["public", "followers_only", "private"], default: "followers_only" },
    showActivityStatus: { type: Boolean, default: true },
    allowDirectMessagesFrom: { type: String, enum: ["everyone", "followers", "no_one"], default: "followers" },
  },
  { _id: false }
);

// Schema การตั้งค่าผู้ใช้
const UserPreferencesSchema = new Schema<IUserPreferences>(
  {
    language: { type: String, default: "th", enum: ["th", "en", "ja", "ko", "zh"] },
    display: { type: UserDisplayPreferencesSchema, default: () => ({ theme: "system", reading: { fontSize: "medium", readingModeLayout: "scrolling" }, accessibility: {} }) },
    notifications: { type: UserPreferencesNotificationsSchema, default: () => ({ masterNotificationsEnabled: true }) },
    contentAndPrivacy: { type: UserContentPrivacyPreferencesSchema, default: () => ({ showMatureContent: false, profileVisibility: "public", readingHistoryVisibility: "followers_only", showActivityStatus: true, allowDirectMessagesFrom: "followers" }) },
  },
  { _id: false }
);

// Schema บัญชีที่เชื่อมโยง
const AccountSchema = new Schema<IAccount>(
  {
    provider: { type: String, required: true, trim: true },
    providerAccountId: { type: String, required: true, trim: true },
    type: { type: String, enum: ["oauth", "credentials"], required: true },
    accessToken: { type: String, select: false },
    refreshToken: { type: String, select: false },
    expiresAt: Number,
    tokenType: { type: String, select: false },
    scope: String,
    idToken: { type: String, select: false },
    sessionState: { type: String, select: false },
    providerData: { type: Schema.Types.Mixed, select: false },
  },
  { _id: false }
);

// Schema โปรไฟล์ผู้ใช้
const UserProfileSchema = new Schema<IUserProfile>(
  {
    displayName: { type: String, trim: true, maxlength: 100 },
    avatarUrl: { type: String, trim: true, validate: { validator: (v: string) => !v || /^https?:\/\/|^\//.test(v), message: "รูปแบบ URL รูปโปรไฟล์ไม่ถูกต้อง" } },
    coverImageUrl: { type: String, trim: true, validate: { validator: (v: string) => !v || /^https?:\/\/|^\//.test(v), message: "รูปแบบ URL รูปปกไม่ถูกต้อง" } },
    bio: { type: String, trim: true, maxlength: 500 },
    gender: { type: String, enum: ["male", "female", "other", "prefer_not_to_say"] },
    dateOfBirth: Date,
    country: { type: String, trim: true, maxlength: 2 },
    timezone: { type: String, trim: true },
    location: { type: String, trim: true, maxlength: 100 },
    websiteUrl: { type: String, trim: true, validate: { validator: (v: string) => !v || /^https?:\/\//.test(v), message: "รูปแบบ URL เว็บไซต์ไม่ถูกต้อง" } },
  },
  { _id: false }
);

// Schema สถิติการใช้งาน
const UserTrackingStatsSchema = new Schema<IUserTrackingStats>(
  {
    totalLoginDays: { type: Number, default: 0, min: 0 },
    totalNovelsRead: { type: Number, default: 0, min: 0 },
    totalEpisodesRead: { type: Number, default: 0, min: 0 },
    totalTimeSpentReadingSeconds: { type: Number, default: 0, min: 0 },
    totalCoinSpent: { type: Number, default: 0, min: 0 },
    totalRealMoneySpent: { type: Number, default: 0, min: 0 },
    lastNovelReadId: { type: Schema.Types.ObjectId, ref: "Novel" },
    lastNovelReadAt: Date,
    joinDate: { type: Date, default: Date.now },
    firstLoginAt: Date,
  },
  { _id: false }
);

// Schema สถิติทางสังคม
const UserSocialStatsSchema = new Schema<IUserSocialStats>(
  {
    followersCount: { type: Number, default: 0, min: 0 },
    followingCount: { type: Number, default: 0, min: 0 },
    novelsCreatedCount: { type: Number, default: 0, min: 0 },
    commentsMadeCount: { type: Number, default: 0, min: 0 },
    ratingsGivenCount: { type: Number, default: 0, min: 0 },
    likesGivenCount: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

// Schema กระเป๋าเงิน
const UserWalletSchema = new Schema<IUserWallet>(
  {
    coinBalance: { type: Number, default: 0, min: 0 },
    lastCoinTransactionAt: Date,
  },
  { _id: false }
);

// Schema ระบบ Gamification
const UserGamificationSchema = new Schema<IUserGamification>(
  {
    level: { type: Number, default: 1, min: 1 },
    experiencePoints: { type: Number, default: 0, min: 0 },
    nextLevelXPThreshold: { type: Number, default: 100 },
    achievements: [{ type: Schema.Types.ObjectId, ref: "Achievement" }],
    loginStreaks: {
      currentStreakDays: { type: Number, default: 0, min: 0 },
      longestStreakDays: { type: Number, default: 0, min: 0 },
      lastLoginDate: Date,
    },
    dailyCheckIn: {
      lastCheckInDate: Date,
      currentStreakDays: { type: Number, default: 0, min: 0 },
    },
  },
  { _id: false }
);

// Schema การยืนยันตัวตน
const UserVerificationSchema = new Schema<IUserVerification>(
  {
    kycStatus: { type: String, enum: ["none", "pending", "verified", "rejected", "requires_resubmission"], default: "none" },
    kycSubmittedAt: Date,
    kycReviewedAt: Date,
    kycVerifiedAt: Date,
    kycRejectionReason: { type: String, trim: true },
    kycApplicationId: { type: Schema.Types.ObjectId },
    writerApplicationStatus: { type: String, enum: ["none", "pending", "approved", "rejected"], default: "none" },
    writerApplicationId: { type: Schema.Types.ObjectId, ref: "WriterApplication" },
    writerApplicationSubmittedAt: Date,
    writerApplicationReviewedAt: Date,
    writerApplicationApprovedAt: Date,
    writerRejectionReason: { type: String, trim: true },
  },
  { _id: false }
);

// Schema การตั้งค่าบริจาค
const UserDonationSettingsSchema = new Schema<IUserDonationSettings>(
  {
    activeAuthorDirectDonationAppId: { type: Schema.Types.ObjectId, ref: "DonationApplication" },
    isEligibleForDonation: { type: Boolean, default: false },
  },
  { _id: false }
);

// Schema การตั้งค่าความปลอดภัย
const UserSecuritySettingsSchema = new Schema<IUserSecuritySettings>(
  {
    lastPasswordChangeAt: Date,
    twoFactorAuthentication: {
      isEnabled: { type: Boolean, default: false },
      method: { type: String, enum: ["otp", "sms", "email"] },
      secret: { type: String, select: false },
      backupCodes: { type: [String], select: false },
      verifiedAt: Date,
    },
    loginAttempts: {
      count: { type: Number, default: 0, min: 0 },
      lastAttemptAt: Date,
      lockoutUntil: Date,
    },
    activeSessions: [
      {
        sessionId: { type: String, required: true },
        ipAddress: { type: String, required: true },
        userAgent: { type: String, required: true },
        lastAccessedAt: { type: Date, required: true },
        createdAt: { type: Date, required: true, default: Date.now },
        isCurrentSession: Boolean,
      },
    ],
  },
  { _id: false }
);

// ----- Schema หลักสำหรับ User -----
const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      unique: true,
      sparse: true, // อนุญาตให้ null แต่ถ้ามีต้อง unique
      trim: true,
      minlength: [3, "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร"],
      maxlength: [50, "ชื่อผู้ใช้ต้องไม่เกิน 50 ตัวอักษร"],
      match: [/^[a-zA-Z0-9_\.]+$/, "ชื่อผู้ใช้สามารถมีได้เฉพาะตัวอักษร, ตัวเลข, _, และ ."],
      index: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "รูปแบบอีเมลไม่ถูกต้อง"],
      index: true,
    },
    password: { type: String, select: false },
    accounts: [AccountSchema],
    roles: {
      type: [String],
      enum: ["Reader", "Writer", "Admin", "Moderator", "Editor"],
      default: ["Reader"],
      required: true,
    },
    profile: { type: UserProfileSchema, default: () => ({}) },
    trackingStats: { type: UserTrackingStatsSchema, default: () => ({ joinDate: new Date() }) },
    socialStats: { type: UserSocialStatsSchema, default: () => ({}) },
    preferences: { type: UserPreferencesSchema, default: () => ({ language: "th", display: { theme: "system", reading: { fontSize: "medium", readingModeLayout: "scrolling" }, accessibility: {} }, notifications: { masterNotificationsEnabled: true }, contentAndPrivacy: {} }) },
    wallet: { type: UserWalletSchema, default: () => ({ coinBalance: 0 }) },
    gamification: { type: UserGamificationSchema, default: () => ({ level: 1, experiencePoints: 0, nextLevelXPThreshold: 100, loginStreaks: { currentStreakDays: 0, longestStreakDays: 0 }, dailyCheckIn: { currentStreakDays: 0 } }) },
    verifiedBadges: [{ type: String, trim: true }],
    verification: { type: UserVerificationSchema, default: () => ({ kycStatus: "none", writerApplicationStatus: "none" }) },
    donationSettings: { type: UserDonationSettingsSchema, default: () => ({ isEligibleForDonation: false }) },
    securitySettings: { type: UserSecuritySettingsSchema, default: () => ({ twoFactorAuthentication: { isEnabled: false }, loginAttempts: { count: 0 }, activeSessions: [] }) },
    writerStatsId: { type: Schema.Types.ObjectId, ref: "WriterStats" },
    isEmailVerified: { type: Boolean, default: false },
    emailVerified: { type: Date, default: null }, // จาก SocialMediaUser
    emailVerificationToken: { type: String, select: false },
    emailVerificationTokenExpiry: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetTokenExpiry: { type: Date, select: false },
    lastLoginAt: Date,
    lastIpAddress: { type: String, select: false },
    isActive: { type: Boolean, default: true, index: true },
    isBanned: { type: Boolean, default: false, index: true },
    banReason: String,
    bannedUntil: Date,
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----- Indexes -----
UserSchema.index({ email: 1, username: 1 });
UserSchema.index({ "accounts.provider": 1, "accounts.providerAccountId": 1 }, { unique: true, sparse: true });
UserSchema.index({ roles: 1 });
UserSchema.index({ "preferences.language": 1 });
UserSchema.index({ "gamification.level": 1 });
UserSchema.index({ lastLoginAt: -1 });

// ----- Middleware -----

// Hash password ก่อนบันทึก (สำหรับ credentials)
UserSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password") || !this.password) {
    return next();
  }
  const isCredentialsAccount = this.accounts.some(acc => acc.provider === "credentials");
  if (isCredentialsAccount) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    } catch (error: any) {
      next(error);
    }
  } else {
    this.password = undefined;
    next();
  }
});

// สร้าง username อัตโนมัติถ้าไม่มี (จาก SocialMediaUser)
UserSchema.pre<IUser>("save", async function (next) {
  if (this.isNew && !this.username && this.email) {
    let baseUsername = this.email.split("@")[0].replace(/[^a-zA-Z0-9_\.]/g, "").toLowerCase();
    if (!baseUsername) baseUsername = "user";
    let potentialUsername = baseUsername;
    let count = 0;
    while (await models.User.findOne({ username: potentialUsername })) {
      count++;
      potentialUsername = `${baseUsername}${count}`;
    }
    this.username = potentialUsername;
  }
  if (this.isModified("email") && this.email) {
    this.email = this.email.toLowerCase();
  }
  // ตั้งค่า emailVerified สำหรับ OAuth
  if (this.isNew && this.accounts.some(acc => acc.type === "oauth")) {
    this.isEmailVerified = true;
    this.emailVerified = new Date();
  }
  next();
});

// ----- Methods -----

// ตรวจสอบรหัสผ่าน
UserSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// สร้าง token ยืนยันอีเมล
UserSchema.methods.generateEmailVerificationToken = function (): string {
  const token = crypto.randomBytes(32).toString("hex");
  this.emailVerificationToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  this.emailVerificationTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 นาที
  return token;
};

// สร้าง token รีเซ็ตรหัสผ่าน
UserSchema.methods.generatePasswordResetToken = function (): string {
  const token = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  this.passwordResetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 นาที
  return token;
};

// ----- Model Export -----
const UserModel = () => models.User as mongoose.Model<IUser> || model<IUser>("User", UserSchema);

export default UserModel;