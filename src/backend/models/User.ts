// backend/models/User.ts
// โมเดลผู้ใช้ (User Model) - ศูนย์กลางข้อมูลผู้ใช้, การยืนยันตัวตน, สถิติ, และการตั้งค่า
// อัปเดตล่าสุด: ผสาน UserPreference.ts เข้า User.ts โดยตรง, ปรับปรุงโครงสร้าง preferences, และเพิ่มคอมเมนต์อย่างละเอียด

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
                    // ตัวอย่าง: true (สำหรับ email.enabled)
  newsletter?: boolean; // รับข่าวสารจากแพลตฟอร์ม (เฉพาะ email)
                       // ตัวอย่าง: true
  novelUpdatesFromFollowing: boolean; // รับการอัปเดตนิยายที่ติดตาม
                                      // ตัวอย่าง: true
  newFollowers: boolean; // แจ้งเตือนเมื่อมีผู้ติดตามใหม่
                         // ตัวอย่าง: true
  commentsOnMyNovels: boolean; // แจ้งเตือนเมื่อมีความคิดเห็นในนิยายของฉัน (สำหรับนักเขียน)
                               // ตัวอย่าง: true
  repliesToMyComments: boolean; // แจ้งเตือนเมื่อมีการตอบกลับความคิดเห็นของฉัน
                                // ตัวอย่าง: true
  donationAlerts: boolean; // แจ้งเตือนเกี่ยวกับการบริจาค (ทั้งผู้ให้และผู้รับ)
                           // ตัวอย่าง: true
  systemAnnouncements: boolean; // รับประกาศสำคัญจากระบบ
                               // ตัวอย่าง: true
  securityAlerts?: boolean; // รับการแจ้งเตือนด้านความปลอดภัย (เช่น การล็อกอินผิดปกติ) (อาจมีเฉพาะ email)
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
  showMatureContent: boolean; // แสดงเนื้อหาสำหรับผู้ใหญ่ (ต้องมีการยืนยันอายุแยกต่างหาก)
                            // ตัวอย่าง: false
  preferredGenres: Types.ObjectId[]; // ID ของหมวดหมู่นิยายที่ชื่นชอบ (อ้างอิง Category model)
                                   // ตัวอย่าง: [new Types.ObjectId("60d5ec49a035f5d0c8e1f2a1"), new Types.ObjectId("60d5ec49a035f5d0c8e1f2a2")]
  blockedGenres?: Types.ObjectId[]; // ID ของหมวดหมู่นิยายที่ไม่ต้องการเห็น
                                    // ตัวอย่าง: [new Types.ObjectId("60d5ec49a035f5d0c8e1f2b1")]
  blockedTags?: string[]; // Tags ที่ไม่ต้องการเห็น (เก็บเป็น array ของ string)
                        // ตัวอย่าง: ["gore", "non-con"]
  blockedAuthors?: Types.ObjectId[]; // ID ของผู้เขียนที่ไม่ต้องการเห็นเนื้อหา (อ้างอิง User model)
  blockedNovels?: Types.ObjectId[]; // ID ของนิยายที่ไม่ต้องการเห็น (อ้างอิง Novel model)
  profileVisibility: "public" | "followers_only" | "private"; // การตั้งค่าการมองเห็นโปรไฟล์
                                                            // ตัวอย่าง: "public"
  readingHistoryVisibility: "public" | "followers_only" | "private"; // การตั้งค่าการมองเห็นประวัติการอ่าน
                                                                  // ตัวอย่าง: "followers_only"
  showActivityStatus: boolean; // แสดงสถานะออนไลน์/กิจกรรมล่าสุดให้ผู้อื่นเห็นหรือไม่
                             // ตัวอย่าง: true
  allowDirectMessagesFrom: "everyone" | "followers" | "no_one"; // ใครสามารถส่งข้อความส่วนตัวหาได้บ้าง (ถ้ามีระบบ DM)
                                                              // ตัวอย่าง: "followers"
  // dataSharingForAds?: boolean; // (Optional) อนุญาตให้ใช้ข้อมูลเพื่อโฆษณาแบบ personalized หรือไม่
                                // ตัวอย่าง: false
}

// อินเทอร์เฟซหลักสำหรับการตั้งค่าผู้ใช้แบบรวมศูนย์
export interface IUserPreferences {
  language: string; // ภาษาที่ผู้ใช้เลือกสำหรับ UI และเนื้อหาเริ่มต้น เช่น "th", "en"
                      // ตัวอย่าง: "th"
  display: IUserDisplayPreferences; // การตั้งค่าการแสดงผล
  notifications: IUserPreferencesNotifications; // การตั้งค่าการแจ้งเตือน
  contentAndPrivacy: IUserContentPrivacyPreferences; // การตั้งค่าเนื้อหาและความเป็นส่วนตัว
}

// --- อินเทอร์เฟซอื่นๆ ที่เกี่ยวข้องกับ User Model ---

// อินเทอร์เฟซสำหรับบัญชีที่เชื่อมโยง (สำหรับ OAuth providers และ credentials)
export interface IAccount extends Document {
  provider: string; // เช่น "google", "facebook", "credentials", "line", "discord"
                    // ตัวอย่าง: "google"
  providerAccountId: string; // ID จาก provider (สำหรับ credentials อาจเป็น email หรือ username)
                           // ตัวอย่าง: "102938475612309876543" (สำหรับ Google)
  type: "oauth" | "credentials"; // ประเภทบัญชี
                                // ตัวอย่าง: "oauth"
  accessToken?: string; // Token สำหรับ OAuth (select: false)
  refreshToken?: string; // Refresh token สำหรับ OAuth (select: false)
  expiresAt?: number; // วันหมดอายุของ token (timestamp)
  tokenType?: string; // ประเภท token (เช่น "Bearer") (select: false)
  scope?: string; // ขอบเขตการเข้าถึงของ OAuth
                  // ตัวอย่าง: "email profile openid"
  idToken?: string; // ID token (สำหรับ OIDC) (select: false)
  sessionState?: string; // สถานะ session (สำหรับ OIDC) (select: false)
  providerData?: Record<string, any>; // ข้อมูลเพิ่มเติมจาก provider ที่อาจมีประโยชน์ (select: false)
}

// อินเทอร์เฟซสำหรับโปรไฟล์ผู้ใช้
export interface IUserProfile {
  displayName?: string; // ชื่อที่แสดง (อาจมาจาก OAuth หรือผู้ใช้ตั้งเอง)
                        // ตัวอย่าง: "นักอ่านเงา"
  avatarUrl?: string; // URL รูปโปรไฟล์ (อาจมาจาก OAuth หรือผู้ใช้อัปโหลด)
                      // ตัวอย่าง: "https://example.com/avatars/user123.png"
  coverImageUrl?: string; // URL รูปปกโปรไฟล์
                         // ตัวอย่าง: "https://example.com/covers/user123.jpg"
  bio?: string; // คำอธิบายตัวตนสั้นๆ
                // ตัวอย่าง: "รักการอ่านนิยายแฟนตาซีเป็นชีวิตจิตใจ"
  gender?: "male" | "female" | "other" | "prefer_not_to_say"; // เพศ
                                                              // ตัวอย่าง: "female"
  dateOfBirth?: Date; // วันเกิด
                      // ตัวอย่าง: new Date("1995-08-15")
  country?: string; // ประเทศของผู้ใช้ (ISO 3166-1 alpha-2 code)
                    // ตัวอย่าง: "TH"
  timezone?: string; // เขตเวลาของผู้ใช้ (เช่น "Asia/Bangkok")
                     // ตัวอย่าง: "Asia/Bangkok"
  location?: string; // ตำแหน่งที่อยู่ (เช่น "กรุงเทพ, ประเทศไทย")
                     // ตัวอย่าง: "กรุงเทพมหานคร"
  websiteUrl?: string; // URL เว็บไซต์ส่วนตัว
                       // ตัวอย่าง: "https://myblog.example.com"
  // preferredGenres ถูกย้ายไปที่ IUserPreferences.contentAndPrivacy.preferredGenres
}

// อินเทอร์เฟซสำหรับสถิติการใช้งานของผู้ใช้
export interface IUserTrackingStats {
  totalLoginDays: number; // จำนวนวันที่เข้าสู่ระบบทั้งหมด
                          // ตัวอย่าง: 150
  totalNovelsRead: number; // จำนวนนิยายที่อ่านจบทั้งหมด
                           // ตัวอย่าง: 25
  totalEpisodesRead: number; // จำนวนตอนที่อ่านทั้งหมด
                            // ตัวอย่าง: 500
  totalTimeSpentReadingSeconds: number; // เวลารวมที่ใช้ในการอ่าน (วินาที)
                                       // ตัวอย่าง: 720000 (200 ชั่วโมง)
  totalCoinSpent: number; // จำนวนเหรียญที่ใช้จ่ายทั้งหมด
                         // ตัวอย่าง: 1200
  totalRealMoneySpent: number; // จำนวนเงินจริงที่ใช้จ่ายทั้งหมด (ควรเก็บแยกสกุลเงิน หรือมี field สกุลเงิน)
                               // ตัวอย่าง: 500.00 (สำหรับสกุลเงินหลักของระบบ)
  lastNovelReadId?: Types.ObjectId; // ID นิยายที่อ่านล่าสุด (อ้างอิง Novel model)
  lastNovelReadAt?: Date; // วันที่อ่านนิยายล่าสุด
  joinDate: Date; // วันที่สมัครสมาชิก
  firstLoginAt?: Date; // วันที่ล็อกอินครั้งแรก
}

// อินเทอร์เฟซสำหรับสถิติทางสังคมของผู้ใช้
export interface IUserSocialStats {
  followersCount: number; // จำนวนผู้ใช้/สิ่งที่ติดตามผู้ใช้นี้ (จัดการโดย Follow.ts middleware)
                          // ตัวอย่าง: 120
  followingCount: number; // จำนวนผู้ใช้/สิ่งที่ผู้ใช้นี้กำลังติดตาม (รวมทุกประเภท, จัดการโดย Follow.ts middleware)
                          // ตัวอย่าง: 75
  novelsCreatedCount: number; // จำนวนนิยายที่สร้าง (สำหรับนักเขียน)
                             // ตัวอย่าง: 5
  commentsMadeCount: number; // จำนวนความคิดเห็นที่โพสต์
                            // ตัวอย่าง: 230
  ratingsGivenCount: number; // จำนวนการให้คะแนน
                           // ตัวอย่าง: 80
  likesGivenCount: number; // จำนวนการกดถูกใจ
                         // ตัวอย่าง: 1500
}

// อินเทอร์เฟซสำหรับกระเป๋าเงินของผู้ใช้
export interface IUserWallet {
  coinBalance: number; // ยอดเหรียญสะสม (สกุลเงินในเกม)
                       // ตัวอย่าง: 500
  lastCoinTransactionAt?: Date; // วันที่ทำธุรกรรมเหรียญล่าสุด
}

// อินเทอร์เฟซสำหรับระบบ Gamification
export interface IUserGamification {
  level: number; // ระดับผู้ใช้
                 // ตัวอย่าง: 15
  experiencePoints: number; // คะแนนประสบการณ์ (XP)
                           // ตัวอย่าง: 12500
  nextLevelXPThreshold: number; // XP ที่ต้องการสำหรับระดับถัดไป
                               // ตัวอย่าง: 15000
  achievements: Types.ObjectId[]; // ID ของ Achievement ที่ปลดล็อก (อ้างอิง Achievement model)
                                  // ตัวอย่าง: [new Types.ObjectId("..."), new Types.ObjectId("...")]
  loginStreaks: {
    currentStreakDays: number; // สตรีคการล็อกอินปัจจุบัน (วัน)
                               // ตัวอย่าง: 7
    longestStreakDays: number; // สตรีคการล็อกอินนานที่สุด (วัน)
                               // ตัวอย่าง: 30
    lastLoginDate?: Date; // วันที่ล็อกอินครั้งล่าสุดที่นับสตรีค
  };
  dailyCheckIn: {
    lastCheckInDate?: Date; // วันที่เช็คอินล่าสุด
    currentStreakDays: number; // สตรีคการเช็คอินรายวัน
                               // ตัวอย่าง: 3
  };
}

// อินเทอร์เฟซสำหรับการยืนยันตัวตน (KYC) และการเป็นนักเขียน
export interface IUserVerification {
  kycStatus: "none" | "pending" | "verified" | "rejected" | "requires_resubmission"; // สถานะการยืนยันตัวตน
                                                                                      // ตัวอย่าง: "verified"
  kycSubmittedAt?: Date;
  kycReviewedAt?: Date;
  kycVerifiedAt?: Date;
  kycRejectionReason?: string;
  kycApplicationId?: Types.ObjectId; // ID ของคำขอ KYC
  writerApplicationStatus: "none" | "pending" | "approved" | "rejected"; // สถานะการสมัครเป็นนักเขียน
                                                                         // ตัวอย่าง: "approved"
  writerApplicationId?: Types.ObjectId; // ID ใบสมัครนักเขียน (อ้างอิง WriterApplication model)
  writerApplicationSubmittedAt?: Date;
  writerApplicationReviewedAt?: Date;
  writerApplicationApprovedAt?: Date;
  writerRejectionReason?: string;
}

// อินเทอร์เฟซสำหรับการตั้งค่าการรับบริจาค
export interface IUserDonationSettings {
  activeAuthorDirectDonationAppId?: Types.ObjectId; // ID ของ DonationApplication สำหรับบริจาคให้นักเขียนโดยตรงที่ active
  isEligibleForDonation: boolean; // Flag รวมว่านักเขียนคนนี้มีคุณสมบัติเปิดรับบริจาคได้หรือไม่
                                  // ตัวอย่าง: true
}

// อินเทอร์เฟซสำหรับการตั้งค่าความปลอดภัยขั้นสูง
export interface IUserSecuritySettings {
  lastPasswordChangeAt?: Date; // วันที่เปลี่ยนรหัสผ่านล่าสุด
  twoFactorAuthentication: {
    isEnabled: boolean; // เปิด/ปิดการยืนยันตัวตนสองปัจจัย
                       // ตัวอย่าง: true
    method?: "otp" | "sms" | "email"; // วิธีการยืนยันตัวตน (ถ้า isEnabled)
                                     // ตัวอย่าง: "otp"
    secret?: string; // สำหรับ OTP secret (select: false)
    backupCodes?: string[]; // รหัสสำรอง (select: false, hashed)
    verifiedAt?: Date; // วันที่เปิดใช้งาน 2FA สำเร็จ
  };
  loginAttempts: {
    count: number; // จำนวนครั้งที่พยายามล็อกอินผิดพลาด
                   // ตัวอย่าง: 2
    lastAttemptAt?: Date; // เวลาที่พยายามล็อกอินผิดพลาดครั้งล่าสุด
    lockoutUntil?: Date; // ล็อกบัญชีจนถึงเวลานี้ (ถ้ามีการล็อก)
  };
  activeSessions: Array<{
    sessionId: string; // ID ของ session
    ipAddress: string; // IP Address ของ session
    userAgent: string; // User agent ของ session
    lastAccessedAt: Date; // เวลาที่เข้าถึงล่าสุด
    createdAt: Date; // เวลาที่สร้าง session
    isCurrentSession?: boolean; // ระบุว่าเป็น session ปัจจุบันหรือไม่
  }>;
}

// ----- Interface หลักสำหรับเอกสารผู้ใช้ (User Document) -----
export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string; // ชื่อผู้ใช้ (ต้องไม่ซ้ำกัน, สำหรับการเข้าสู่ระบบและการแสดงผล)
                    // ตัวอย่าง: "user123"
  email?: string; // อีเมล (ต้องไม่ซ้ำกันถ้ามี, สำหรับการเข้าสู่ระบบและการแจ้งเตือน)
                  // ตัวอย่าง: "user123@example.com"
  password?: string; // รหัสผ่าน (hashed, select: false, สำหรับ provider "credentials" เท่านั้น)
  accounts: Types.DocumentArray<IAccount>; // บัญชีที่เชื่อมโยง (OAuth, credentials)
  
  role: "Reader" | "Writer" | "Admin" | "Moderator" | "Editor"; // บทบาทผู้ใช้
                                                                // ตัวอย่าง: "Writer"
  profile: IUserProfile; // ข้อมูลโปรไฟล์
  trackingStats: IUserTrackingStats; // สถิติการใช้งาน
  socialStats: IUserSocialStats; // สถิติทางสังคม
  preferences: IUserPreferences; // การตั้งค่าผู้ใช้แบบรวมศูนย์
  wallet: IUserWallet; // กระเป๋าเงิน
  gamification: IUserGamification; // ระบบ Gamification
  verifiedBadges?: string[]; // ป้ายยืนยัน เช่น "Verified Writer", "Top Donor", "Beta Tester"
                             // ตัวอย่าง: ["Verified Writer", "Beta Tester"]
  
  verification?: IUserVerification; // ข้อมูลการยืนยันตัวตน (KYC) และการเป็นนักเขียน
  donationSettings?: IUserDonationSettings; // การตั้งค่าการรับบริจาค (สำหรับนักเขียน)
  securitySettings?: IUserSecuritySettings; // การตั้งค่าความปลอดภัยขั้นสูง
  writerStatsId?: Types.ObjectId; // ID สถิตินักเขียน (อ้างอิง WriterStats model)

  isEmailVerified: boolean; // สถานะการยืนยันอีเมล
                           // ตัวอย่าง: true
  emailVerificationToken?: string; // Token สำหรับยืนยันอีเมล (select: false)
  emailVerificationTokenExpiry?: Date; // วันหมดอายุของ Token (select: false)
  passwordResetToken?: string; // Token สำหรับรีเซ็ตรหัสผ่าน (select: false)
  passwordResetTokenExpiry?: Date; // วันหมดอายุของ Token (select: false)
  lastLoginAt?: Date; // วันที่ล็อกอินล่าสุด
  lastIpAddress?: string; // IP Address ล่าสุดที่ล็อกอิน (ควร hash หรือ verschlüsseln, select: false)
  isActive: boolean; // บัญชีมีการใช้งานหรือไม่ (สำหรับ soft disable)
                     // ตัวอย่าง: true
  isBanned: boolean; // บัญชีถูกระงับการใช้งานหรือไม่
                      // ตัวอย่าง: false
  banReason?: string; // เหตุผลการระงับ
  bannedUntil?: Date; // ระงับถึงวันที่ (ถ้าเป็นการระงับชั่วคราว)
  isDeleted: boolean; // สถานะการลบ (soft delete)
                       // ตัวอย่าง: false
  deletedAt?: Date; // วันที่ทำการ soft delete

  createdAt: Date;
  updatedAt: Date;

  // Methods
  matchPassword(enteredPassword: string): Promise<boolean>;
  generateEmailVerificationToken(): string;
  generatePasswordResetToken(): string;
  // generateTwoFactorSecret?(): { secret: string; otpauthUrl: string }; // อาจจะย้ายไป service layer
  // verifyTwoFactorToken?(token: string): boolean;
  // generateAndStoreBackupCodes?(): Promise<string[]>;
  // verifyBackupCode?(code: string): Promise<boolean>;
}

// ----- Schema ย่อย -----

// Schema สำหรับการตั้งค่าการแสดงผลส่วนการอ่าน
const UserReadingDisplayPreferencesSchema = new Schema<IUserReadingDisplayPreferences>(
  {
    fontFamily: { type: String, trim: true },
    fontSize: { type: Schema.Types.Mixed, required: true, default: "medium" }, // สามารถเป็น string (enum) หรือ number
    lineHeight: { type: Number, min: 1, max: 3 },
    textAlignment: { type: String, enum: ["left", "justify"], default: "left" },
    readingModeLayout: { type: String, enum: ["paginated", "scrolling"], default: "scrolling" },
  },
  { _id: false }
);

// Schema สำหรับการตั้งค่าการเข้าถึง
const UserAccessibilityDisplayPreferencesSchema = new Schema<IUserAccessibilityDisplayPreferences>(
  {
    dyslexiaFriendlyFont: { type: Boolean, default: false },
    highContrastMode: { type: Boolean, default: false },
  },
  { _id: false }
);

// Schema สำหรับการตั้งค่าการแสดงผลโดยรวม
const UserDisplayPreferencesSchema = new Schema<IUserDisplayPreferences>(
  {
    theme: { type: String, enum: ["light", "dark", "system", "sepia", "system_default"], default: "system" },
    reading: { type: UserReadingDisplayPreferencesSchema, default: () => ({ fontSize: "medium", readingModeLayout: "scrolling" }) },
    accessibility: { type: UserAccessibilityDisplayPreferencesSchema, default: () => ({}) },
  },
  { _id: false }
);

// Schema สำหรับการตั้งค่าการแจ้งเตือนแต่ละช่องทาง
const NotificationChannelSettingsSchema = new Schema<INotificationChannelSettings>(
  {
    enabled: { type: Boolean, default: true },
    newsletter: { type: Boolean, default: true }, // เฉพาะ email
    novelUpdatesFromFollowing: { type: Boolean, default: true },
    newFollowers: { type: Boolean, default: true },
    commentsOnMyNovels: { type: Boolean, default: true },
    repliesToMyComments: { type: Boolean, default: true },
    donationAlerts: { type: Boolean, default: true },
    systemAnnouncements: { type: Boolean, default: true },
    securityAlerts: { type: Boolean, default: true }, // อาจมีเฉพาะ email
    promotionalOffers: { type: Boolean, default: false },
    achievementUnlocks: { type: Boolean, default: true },
  },
  { _id: false }
);

// Schema สำหรับการตั้งค่าการแจ้งเตือนโดยรวม
const UserPreferencesNotificationsSchema = new Schema<IUserPreferencesNotifications>(
  {
    masterNotificationsEnabled: { type: Boolean, default: true },
    email: { type: NotificationChannelSettingsSchema, default: () => ({ enabled: true, newsletter: true, novelUpdatesFromFollowing: true, newFollowers: true, commentsOnMyNovels: true, repliesToMyComments: true, donationAlerts: true, systemAnnouncements: true, securityAlerts: true, promotionalOffers: false, achievementUnlocks: true }) },
    push: { type: NotificationChannelSettingsSchema, default: () => ({ enabled: true, novelUpdatesFromFollowing: true, newFollowers: true, commentsOnMyNovels: true, repliesToMyComments: true, donationAlerts: true, systemAnnouncements: true, promotionalOffers: false, achievementUnlocks: true }) },
    inApp: { type: NotificationChannelSettingsSchema, default: () => ({ enabled: true, novelUpdatesFromFollowing: true, newFollowers: true, commentsOnMyNovels: true, repliesToMyComments: true, donationAlerts: true, systemAnnouncements: true, promotionalOffers: false, achievementUnlocks: true }) },
  },
  { _id: false }
);

// Schema สำหรับการตั้งค่าเนื้อหาและความเป็นส่วนตัว
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
    // dataSharingForAds: { type: Boolean, default: false },
  },
  { _id: false }
);

// Schema หลักสำหรับการตั้งค่าผู้ใช้แบบรวมศูนย์
const UserPreferencesSchema = new Schema<IUserPreferences>(
  {
    language: { type: String, default: "th", enum: ["th", "en", "ja", "ko", "zh"] }, // เพิ่มภาษาที่รองรับ
    display: { type: UserDisplayPreferencesSchema, default: () => ({ theme: "system", reading: { fontSize: "medium", readingModeLayout: "scrolling" }, accessibility: {} }) },
    notifications: { type: UserPreferencesNotificationsSchema, default: () => ({ masterNotificationsEnabled: true, email: {}, push: {}, inApp: {} }) },
    contentAndPrivacy: { type: UserContentPrivacyPreferencesSchema, default: () => ({ showMatureContent: false, profileVisibility: "public", readingHistoryVisibility: "followers_only", showActivityStatus: true, allowDirectMessagesFrom: "followers" }) },
  },
  { _id: false }
);

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

const UserProfileSchema = new Schema<IUserProfile>(
  {
    displayName: { type: String, trim: true, maxlength: 100 },
    avatarUrl: { type: String, trim: true, validate: { validator: (v: string) => !v || /^https?:\/\/|^\//.test(v), message: "รูปแบบ URL ของรูปโปรไฟล์ไม่ถูกต้อง" } },
    coverImageUrl: { type: String, trim: true, validate: { validator: (v: string) => !v || /^https?:\/\/|^\//.test(v), message: "รูปแบบ URL ของรูปปกไม่ถูกต้อง" } },
    bio: { type: String, trim: true, maxlength: 500 },
    gender: { type: String, enum: ["male", "female", "other", "prefer_not_to_say"] },
    dateOfBirth: Date,
    country: { type: String, trim: true, maxlength: 2 }, // ISO 3166-1 alpha-2
    timezone: { type: String, trim: true },
    location: { type: String, trim: true, maxlength: 100 },
    websiteUrl: { type: String, trim: true, validate: { validator: (v: string) => !v || /^https?:\/\//.test(v), message: "รูปแบบ URL ของเว็บไซต์ไม่ถูกต้อง" } },
    // preferredGenres ถูกย้ายไปที่ UserPreferencesSchema.contentAndPrivacy.preferredGenres
  },
  { _id: false }
);

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

const UserWalletSchema = new Schema<IUserWallet>(
  {
    coinBalance: { type: Number, default: 0, min: 0 },
    lastCoinTransactionAt: Date,
  },
  { _id: false }
);

const UserGamificationSchema = new Schema<IUserGamification>(
  {
    level: { type: Number, default: 1, min: 1 },
    experiencePoints: { type: Number, default: 0, min: 0 },
    nextLevelXPThreshold: { type: Number, default: 100 }, // อาจคำนวณแบบไดนามิก
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

const UserDonationSettingsSchema = new Schema<IUserDonationSettings>(
  {
    activeAuthorDirectDonationAppId: { type: Schema.Types.ObjectId, ref: "DonationApplication" },
    isEligibleForDonation: { type: Boolean, default: false },
  },
  { _id: false }
);

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
      required: [true, "กรุณาระบุชื่อผู้ใช้"],
      unique: true,
      trim: true,
      minlength: [3, "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร"],
      maxlength: [30, "ชื่อผู้ใช้ต้องไม่เกิน 30 ตัวอักษร"],
      match: [/^[a-zA-Z0-9_]+$/, "ชื่อผู้ใช้สามารถมีได้เฉพาะตัวอักษรภาษาอังกฤษ, ตัวเลข, และขีดล่าง (_)"],
      index: true,
    },
    email: {
      type: String,
      // required: [true, "กรุณาระบุอีเมล"], // อาจจะไม่บังคับถ้ามี OAuth อย่างเดียว
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "รูปแบบอีเมลไม่ถูกต้อง"],
      sparse: true, // อนุญาตให้มีหลาย null/undefined แต่ถ้ามีค่าต้อง unique
      index: true,
    },
    password: { type: String, select: false }, // select: false เพื่อไม่ให้ส่ง password กลับไปโดย default
    accounts: [AccountSchema],
    role: {
      type: String,
      enum: ["Reader", "Writer", "Admin", "Moderator", "Editor"],
      default: "Reader",
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
    isDeleted: { type: Boolean, default: false, index: true }, // สำหรับ soft delete
    deletedAt: Date,
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----- Virtuals -----
// (ถ้ามี)

// ----- Indexes -----
UserSchema.index({ email: 1, username: 1 });
UserSchema.index({ "accounts.provider": 1, "accounts.providerAccountId": 1 }, { unique: true, sparse: true });
UserSchema.index({ role: 1 });
UserSchema.index({ "preferences.language": 1 });
UserSchema.index({ "gamification.level": 1 });

// ----- Middleware (Pre/Post Hooks) -----

// Hash password before saving (for "credentials" provider)
UserSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password") || !this.password) {
    return next();
  }
  // ตรวจสอบว่าเป็นบัญชี credentials หรือไม่ ก่อน hash
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
    this.password = undefined; // ไม่ควรเก็บ password ถ้าไม่ใช่ credentials
    next();
  }
});

// ----- Methods -----

// Match entered password with hashed password in DB
UserSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate email verification token
UserSchema.methods.generateEmailVerificationToken = function (): string {
  const token = crypto.randomBytes(32).toString("hex");
  this.emailVerificationToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  this.emailVerificationTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return token; // ส่ง token ที่ยังไม่ได้ hash กลับไปให้ user
};

// Generate password reset token
UserSchema.methods.generatePasswordResetToken = function (): string {
  const token = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  this.passwordResetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return token;
};

// ----- Model Export -----
// ตรวจสอบว่าโมเดลถูกคอมไพล์ไปแล้วหรือยังก่อนที่จะคอมไพล์ใหม่
const UserModel = () => models.User as mongoose.Model<IUser> || model<IUser>("User", UserSchema);

export default UserModel;

