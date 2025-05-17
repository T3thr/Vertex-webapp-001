// src/backend/models/User.ts
// โมเดลผู้ใช้ (User Model) - ศูนย์กลางข้อมูลผู้ใช้ทั้งหมดสำหรับการยืนยันตัวตน (Credentials และ OAuth), การตั้งค่า, สถิติ, และการจัดการบัญชี
// ตามมาตรฐาน NovelMaze
// เพิ่มการรวม WriterStats และการรองรับ Mental Wellbeing Insights

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// ==================================================================================================
// SECTION: อินเทอร์เฟซย่อย (Sub-Interfaces) สำหรับการตั้งค่าและข้อมูลเฉพาะส่วน
// ==================================================================================================

/**
 * @interface IUserReadingDisplayPreferences
 * @description การตั้งค่าการแสดงผลส่วนการอ่านของผู้ใช้
 * @property {string} [fontFamily] - ชื่อฟอนต์ที่ผู้ใช้เลือกสำหรับการอ่าน (เช่น "Sarabun", "Tahoma")
 * @property {"small" | "medium" | "large" | number} fontSize - ขนาดตัวอักษร (เช่น "medium" หรือ 16)
 * @property {number} [lineHeight] - ระยะห่างระหว่างบรรทัด (เช่น 1.5, 1.8)
 * @property {"left" | "justify"} [textAlignment] - การจัดแนวข้อความ (เช่น "justify")
 * @property {"paginated" | "scrolling"} readingModeLayout - รูปแบบการอ่าน (แบ่งหน้า หรือ เลื่อนยาว)
 */
export interface IUserReadingDisplayPreferences {
  fontFamily?: string;
  fontSize: "small" | "medium" | "large" | number;
  lineHeight?: number;
  textAlignment?: "left" | "justify";
  readingModeLayout: "paginated" | "scrolling";
}

/**
 * @interface IUserAccessibilityDisplayPreferences
 * @description การตั้งค่าการเข้าถึงเพื่อช่วยเหลือผู้ใช้ (Accessibility)
 * @property {boolean} [dyslexiaFriendlyFont] - เปิด/ปิดการใช้ฟอนต์ที่เหมาะสำหรับผู้มีภาวะ Dyslexia
 * @property {boolean} [highContrastMode] - เปิด/ปิดโหมดความคมชัดสูง
 */
export interface IUserAccessibilityDisplayPreferences {
  dyslexiaFriendlyFont?: boolean;
  highContrastMode?: boolean;
}

/**
 * @interface IUserDisplayPreferences
 * @description การตั้งค่าการแสดงผลโดยรวมของผู้ใช้
 * @property {"light" | "dark" | "system" | "sepia"} theme - ธีม UI ที่ผู้ใช้เลือก
 * @property {IUserReadingDisplayPreferences} reading - การตั้งค่าการแสดงผลส่วนการอ่าน
 * @property {IUserAccessibilityDisplayPreferences} accessibility - การตั้งค่าการเข้าถึง
 */
export interface IUserDisplayPreferences {
  theme: "light" | "dark" | "system" | "sepia";
  reading: IUserReadingDisplayPreferences;
  accessibility: IUserAccessibilityDisplayPreferences;
}

/**
 * @interface INotificationChannelSettings
 * @description การตั้งค่าการแจ้งเตือนสำหรับแต่ละช่องทาง (อีเมล, พุช, ภายในแอป)
 * @property {boolean} enabled - เปิด/ปิดการแจ้งเตือนสำหรับช่องทางนี้ทั้งหมด
 * @property {boolean} [newsletter] - รับข่าวสารจากแพลตฟอร์ม (เฉพาะ email)
 * @property {boolean} novelUpdatesFromFollowing - รับการอัปเดตนิยายที่ติดตาม
 * @property {boolean} newFollowers - แจ้งเตือนเมื่อมีผู้ติดตามใหม่
 * @property {boolean} commentsOnMyNovels - แจ้งเตือนเมื่อมีความคิดเห็นในนิยายของฉัน
 * @property {boolean} repliesToMyComments - แจ้งเตือนเมื่อมีการตอบกลับความคิดเห็นของฉัน
 * @property {boolean} donationAlerts - แจ้งเตือนเกี่ยวกับการบริจาค
 * @property {boolean} systemAnnouncements - รับประกาศสำคัญจากระบบ
 * @property {boolean} [securityAlerts] - รับการแจ้งเตือนด้านความปลอดภัย
 * @property {boolean} promotionalOffers - รับข้อเสนอโปรโมชั่น
 * @property {boolean} achievementUnlocks - แจ้งเตือนเมื่อปลดล็อกความสำเร็จ
 */
export interface INotificationChannelSettings {
  enabled: boolean;
  newsletter?: boolean;
  novelUpdatesFromFollowing: boolean;
  newFollowers: boolean;
  commentsOnMyNovels: boolean;
  repliesToMyComments: boolean;
  donationAlerts: boolean;
  systemAnnouncements: boolean;
  securityAlerts?: boolean;
  promotionalOffers: boolean;
  achievementUnlocks: boolean;
}

/**
 * @interface IUserPreferencesNotifications
 * @description การตั้งค่าการแจ้งเตือนโดยรวมของผู้ใช้
 * @property {boolean} masterNotificationsEnabled - สวิตช์หลัก เปิด/ปิดการแจ้งเตือนทั้งหมด
 * @property {INotificationChannelSettings} email - การตั้งค่าการแจ้งเตือนทางอีเมล
 * @property {INotificationChannelSettings} push - การตั้งค่าการแจ้งเตือนแบบพุช
 * @property {INotificationChannelSettings} inApp - การตั้งค่าการแจ้งเตือนภายในแอป
 */
export interface IUserPreferencesNotifications {
  masterNotificationsEnabled: boolean;
  email: INotificationChannelSettings;
  push: INotificationChannelSettings;
  inApp: INotificationChannelSettings;
}

/**
 * @interface IUserAnalyticsConsent
 * @description การตั้งค่าความยินยอมเกี่ยวกับการวิเคราะห์ข้อมูลเพื่อฟีเจอร์สุขภาพจิตและอารมณ์
 * สอดคล้องกับ ReadingAnalytic_EventStream_Schema.txt (source 8)
 * @property {boolean} allowPsychologicalAnalysis - อนุญาตให้ระบบวิเคราะห์ข้อมูลการอ่าน/การเลือกเพื่อประเมินแนวโน้มทางอารมณ์/จิตใจ (จำเป็นสำหรับการทำงานของฟีเจอร์)
 * @property {boolean} [allowPersonalizedFeedback] - อนุญาตให้ระบบให้คำแนะนำ/ข้อเสนอแนะส่วนบุคคลเกี่ยวกับสุขภาพจิต (ต้อง Opt-in อย่างระมัดระวัง และผู้ใช้ต้องยินยอมเพิ่มเติม)
 * @property {Date} [lastConsentReviewDate] - วันที่ผู้ใช้ตรวจสอบ/อัปเดตการตั้งค่าความยินยอมล่าสุด
 */
export interface IUserAnalyticsConsent {
  allowPsychologicalAnalysis: boolean; // ผู้ใช้ต้องยินยอมเพื่อเปิดใช้งานการวิเคราะห์
  allowPersonalizedFeedback?: boolean; // ผู้ใช้ต้องยินยอมเพิ่มเติมเพื่อรับผลตอบรับส่วนบุคคล
  lastConsentReviewDate?: Date;
}

/**
 * @interface IUserContentPrivacyPreferences
 * @description การตั้งค่าเนื้อหาและความเป็นส่วนตัวของผู้ใช้
 * @property {boolean} showMatureContent - แสดงเนื้อหาสำหรับผู้ใหญ่
 * @property {Types.ObjectId[]} preferredGenres - ID ของหมวดหมู่นิยายที่ชื่นชอบ (อ้างอิง Category model)
 * @property {Types.ObjectId[]} [blockedGenres] - ID ของหมวดหมู่นิยายที่ไม่ต้องการเห็น (อ้างอิง Category model)
 * @property {string[]} [blockedTags] - Tags ที่ไม่ต้องการเห็น
 * @property {Types.ObjectId[]} [blockedAuthors] - ID ของผู้เขียนที่ไม่ต้องการเห็นเนื้อหา (อ้างอิง User model)
 * @property {Types.ObjectId[]} [blockedNovels] - ID ของนิยายที่ไม่ต้องการเห็น (อ้างอิง Novel model)
 * @property {"public" | "followers_only" | "private"} profileVisibility - การตั้งค่าการมองเห็นโปรไฟล์
 * @property {"public" | "followers_only" | "private"} readingHistoryVisibility - การตั้งค่าการมองเห็นประวัติการอ่าน
 * @property {boolean} showActivityStatus - แสดงสถานะออนไลน์/กิจกรรมล่าสุด
 * @property {"everyone" | "followers" | "no_one"} allowDirectMessagesFrom - ใครสามารถส่งข้อความส่วนตัวหาผู้ใช้ได้
 * @property {IUserAnalyticsConsent} analyticsConsent - การตั้งค่าความยินยอมเกี่ยวกับการวิเคราะห์ข้อมูล (เพิ่มใหม่ตาม ReadingAnalytic_EventStream_Schema.txt (source 8))
 */
export interface IUserContentPrivacyPreferences {
  showMatureContent: boolean;
  preferredGenres: Types.ObjectId[];
  blockedGenres?: Types.ObjectId[];
  blockedTags?: string[];
  blockedAuthors?: Types.ObjectId[];
  blockedNovels?: Types.ObjectId[];
  profileVisibility: "public" | "followers_only" | "private";
  readingHistoryVisibility: "public" | "followers_only" | "private";
  showActivityStatus: boolean;
  allowDirectMessagesFrom: "everyone" | "followers" | "no_one";
  analyticsConsent: IUserAnalyticsConsent; // << เพิ่มที่นี่เพื่อให้ผู้ใช้ตั้งค่าการยินยอม
}

/**
 * @interface IUserPreferences
 * @description อินเทอร์เฟซหลักสำหรับการตั้งค่าผู้ใช้ (User Preferences)
 * @property {string} language - ภาษาที่ผู้ใช้เลือกสำหรับ UI (เช่น "th", "en")
 * @property {IUserDisplayPreferences} display - การตั้งค่าการแสดงผล
 * @property {IUserPreferencesNotifications} notifications - การตั้งค่าการแจ้งเตือน
 * @property {IUserContentPrivacyPreferences} contentAndPrivacy - การตั้งค่าเนื้อหาและความเป็นส่วนตัว
 */
export interface IUserPreferences {
  language: string;
  display: IUserDisplayPreferences;
  notifications: IUserPreferencesNotifications;
  contentAndPrivacy: IUserContentPrivacyPreferences; // analyticsConsent จะอยู่ภายในนี้
}

/**
 * @interface IAccount
 * @description อินเทอร์เฟซสำหรับบัญชีที่เชื่อมโยง (Credentials และ OAuth Providers)
 * @property {string} provider - ชื่อ Provider (เช่น "google", "facebook", "credentials")
 * @property {string} providerAccountId - ID บัญชีจาก Provider
 * @property {"oauth" | "credentials"} type - ประเภทบัญชี
 * @property {string} [accessToken] - Access Token สำหรับ OAuth (ควร `select: false`)
 * @property {string} [refreshToken] - Refresh Token สำหรับ OAuth (ควร `select: false`)
 * @property {number} [expiresAt] - เวลาหมดอายุของ Token (timestamp)
 * @property {string} [tokenType] - ประเภทของ Token (เช่น "Bearer")
 * @property {string} [scope] - ขอบเขตการเข้าถึงของ OAuth (เช่น "email profile")
 * @property {string} [idToken] - ID Token (สำหรับ OpenID Connect) (ควร `select: false`)
 * @property {string} [sessionState] - สถานะ Session (สำหรับ OpenID Connect)
 * @property {Record<string, any>} [providerData] - ข้อมูลเพิ่มเติมที่ได้รับจาก Provider (ควร `select: false` ถ้ามีข้อมูลอ่อนไหว)
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

/**
 * @interface IUserProfile
 * @description ข้อมูลโปรไฟล์สาธารณะของผู้ใช้
 * @property {string} [displayName] - ชื่อที่แสดง (อาจซ้ำกับผู้อื่นได้)
 * @property {string} [avatarUrl] - URL รูปโปรไฟล์ (อ้างอิง Media model หรือ URL ภายนอก)
 * @property {string} [coverImageUrl] - URL รูปปกโปรไฟล์ (อ้างอิง Media model หรือ URL ภายนอก)
 * @property {string} [bio] - คำอธิบายตัวตนสั้นๆ
 * @property {"male" | "female" | "other" | "prefer_not_to_say"} [gender] - เพศของผู้ใช้
 * @property {Date} [dateOfBirth] - วันเกิดของผู้ใช้ (เพื่อคำนวณอายุ, ไม่แสดงสาธารณะโดยตรง)
 * @property {string} [country] - ประเทศ (รหัส ISO 3166-1 alpha-2 เช่น "TH")
 * @property {string} [timezone] - เขตเวลา (เช่น "Asia/Bangkok")
 * @property {string} [location] - ที่อยู่หรือเมือง (แสดงผลแบบทั่วไป)
 * @property {string} [websiteUrl] - URL เว็บไซต์ส่วนตัวหรือโซเชียลมีเดีย
 */
export interface IUserProfile {
  displayName?: string; // ชื่อที่แสดงทั่วไป
  penName?: string; // นามปากกาสำหรับนักเขียน (อาจซ้ำกับ displayName หรือตั้งใหม่)
  avatarUrl?: string;
  coverImageUrl?: string;
  bio?: string;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  dateOfBirth?: Date;
  country?: string;
  timezone?: string;
  location?: string;
  websiteUrl?: string;
}

/**
 * @interface IUserTrackingStats
 * @description สถิติการใช้งานแพลตฟอร์มของผู้ใช้ (สำหรับแสดงผลให้ผู้ใช้และระบบภายใน)
 * @property {number} totalLoginDays - จำนวนวันที่เข้าสู่ระบบทั้งหมด
 * @property {number} totalNovelsRead - จำนวนนิยายที่อ่านจบ
 * @property {number} totalEpisodesRead - จำนวนตอนที่อ่านทั้งหมด
 * @property {number} totalTimeSpentReadingSeconds - เวลารวมที่ใช้ในการอ่าน (หน่วยเป็นวินาที)
 * @property {number} totalCoinSpent - จำนวนเหรียญทั้งหมดที่ใช้จ่ายไป
 * @property {number} totalRealMoneySpent - จำนวนเงินจริงทั้งหมดที่ใช้จ่ายไป (ถ้ามีการบันทึก)
 * @property {Types.ObjectId} [lastNovelReadId] - ID ของนิยายที่อ่านล่าสุด (อ้างอิง Novel model)
 * @property {Date} [lastNovelReadAt] - วันที่อ่านนิยายล่าสุด
 * @property {Date} joinDate - วันที่สมัครสมาชิก
 * @property {Date} [firstLoginAt] - วันที่เข้าสู่ระบบครั้งแรก
 */
export interface IUserTrackingStats {
  totalLoginDays: number;
  totalNovelsRead: number;
  totalEpisodesRead: number;
  totalTimeSpentReadingSeconds: number;
  totalCoinSpent: number;
  totalRealMoneySpent: number;
  lastNovelReadId?: Types.ObjectId;
  lastNovelReadAt?: Date;
  joinDate: Date;
  firstLoginAt?: Date;
}

/**
 * @interface IUserSocialStats
 * @description สถิติทางสังคมของผู้ใช้
 * @property {number} followersCount - จำนวนผู้ติดตาม
 * @property {number} followingCount - จำนวนที่กำลังติดตาม
 * @property {number} novelsCreatedCount - จำนวนนิยายที่ผู้ใช้สร้าง
 * @property {number} commentsMadeCount - จำนวนความคิดเห็นที่ผู้ใช้สร้าง
 * @property {number} ratingsGivenCount - จำนวนการให้คะแนนนิยายที่ผู้ใช้ทำ
 * @property {number} likesGivenCount - จำนวนการกดถูกใจที่ผู้ใช้ทำ (นิยาย, ตอน, ความคิดเห็น)
 */
export interface IUserSocialStats {
  followersCount: number;
  followingCount: number;
  novelsCreatedCount: number;
  commentsMadeCount: number;
  ratingsGivenCount: number;
  likesGivenCount: number;
}

/**
 * @interface IUserWallet
 * @description ข้อมูลกระเป๋าเงินของผู้ใช้
 * @property {number} coinBalance - ยอดเหรียญสะสมปัจจุบัน
 * @property {Date} [lastCoinTransactionAt] - วันที่ทำธุรกรรมเหรียญล่าสุด
 */
export interface IUserWallet {
  coinBalance: number;
  lastCoinTransactionAt?: Date;
}

/**
 * @interface IUserGamification
 * @description ข้อมูลเกี่ยวกับระบบ Gamification ของผู้ใช้
 * @property {number} level - ระดับ (Level) ของผู้ใช้
 * @property {number} experiencePoints - คะแนนประสบการณ์ (XP) สะสม
 * @property {number} nextLevelXPThreshold - คะแนนประสบการณ์ที่ต้องใช้เพื่อขึ้นระดับถัดไป
 * @property {Types.ObjectId[]} achievements - รายการ ID ของ Achievement ที่ผู้ใช้ปลดล็อก (อ้างอิง Achievement model)
 * @property {object} loginStreaks - ข้อมูลสตรีคการล็อกอิน
 * @property {number} loginStreaks.currentStreakDays - จำนวนวันสตรีคการล็อกอินปัจจุบัน
 * @property {number} loginStreaks.longestStreakDays - จำนวนวันสตรีคการล็อกอินนานที่สุดที่เคยทำได้
 * @property {Date} [loginStreaks.lastLoginDate] - วันที่ล็อกอินครั้งล่าสุดที่นับในสตรีค
 * @property {object} dailyCheckIn - ข้อมูลการเช็คอินรายวัน
 * @property {Date} [dailyCheckIn.lastCheckInDate] - วันที่เช็คอินล่าสุด
 * @property {number} dailyCheckIn.currentStreakDays - จำนวนวันสตรีคการเช็คอินปัจจุบัน
 */
export interface IUserGamification {
  level: number;
  experiencePoints: number;
  nextLevelXPThreshold: number;
  achievements: Types.ObjectId[];
  loginStreaks: {
    currentStreakDays: number;
    longestStreakDays: number;
    lastLoginDate?: Date;
  };
  dailyCheckIn: {
    lastCheckInDate?: Date;
    currentStreakDays: number;
  };
}

/**
 * @interface IUserVerification
 * @description ข้อมูลการยืนยันตัวตน (KYC) และสถานะการเป็นนักเขียน
 * @property {"none" | "pending" | "verified" | "rejected" | "requires_resubmission"} kycStatus - สถานะการยืนยันตัวตน (KYC)
 * @property {Date} [kycSubmittedAt] - วันที่ส่งคำขอ KYC
 * @property {Date} [kycReviewedAt] - วันที่ตรวจสอบ KYC
 * @property {Date} [kycVerifiedAt] - วันที่ KYC ได้รับการอนุมัติ
 * @property {string} [kycRejectionReason] - เหตุผลการปฏิเสธ KYC
 * @property {Types.ObjectId} [kycApplicationId] - ID ของคำขอ KYC (อาจอ้างอิง Collection แยก ถ้ามีข้อมูลเยอะ)
 * @property {"none" | "pending" | "approved" | "rejected"} writerApplicationStatus - สถานะการสมัครเป็นนักเขียน
 * @property {Types.ObjectId} [writerApplicationId] - ID ใบสมัครนักเขียน (อ้างอิง WriterApplication model)
 * @property {Date} [writerApplicationSubmittedAt] - วันที่ส่งใบสมัครนักเขียน
 * @property {Date} [writerApplicationReviewedAt] - วันที่ตรวจสอบใบสมัครนักเขียน
 * @property {Date} [writerApplicationApprovedAt] - วันที่ใบสมัครนักเขียนได้รับการอนุมัติ
 * @property {string} [writerRejectionReason] - เหตุผลการปฏิเสธใบสมัครนักเขียน
 */
// ปรับปรุง IUserVerification
export interface IUserVerification {
  kycStatus: "none" | "pending" | "verified" | "rejected" | "requires_resubmission";
  kycSubmittedAt?: Date;
  kycReviewedAt?: Date;
  kycVerifiedAt?: Date;
  kycRejectionReason?: string;
  kycApplicationId?: Types.ObjectId;
  // writerApplicationStatus: "none" | "pending" | "approved" | "rejected"; // << จะเอาออก หรือเก็บไว้เป็น Quick Status
  writerApplicationId?: Types.ObjectId; // ID ของใบสมัครนักเขียนล่าสุด หรือใบสมัครที่ active อยู่ 
  // writerApplicationSubmittedAt?: Date;
  // writerApplicationReviewedAt?: Date;
  // writerApplicationApprovedAt?: Date;
  // writerRejectionReason?: string;
}

/**
 * @interface IUserDonationSettings
 * @description การตั้งค่าเกี่ยวกับการรับบริจาคของผู้ใช้ (สำหรับนักเขียน)
 * @property {Types.ObjectId} [activeAuthorDirectDonationAppId] - ID ของ DonationApplication ที่ใช้งานอยู่ (อ้างอิง DonationApplication model)
 * @property {boolean} isEligibleForDonation - ผู้ใช้มีคุณสมบัติในการรับบริจาคหรือไม่
 */
export interface IUserDonationSettings {
  activeAuthorDirectDonationAppId?: Types.ObjectId;
  isEligibleForDonation: boolean;
}

/**
 * @interface IUserSecuritySettings
 * @description การตั้งค่าความปลอดภัยของบัญชีผู้ใช้
 * @property {Date} [lastPasswordChangeAt] - วันที่เปลี่ยนรหัสผ่านล่าสุด
 * @property {object} twoFactorAuthentication - การตั้งค่าการยืนยันตัวตนแบบสองปัจจัย (2FA)
 * @property {boolean} twoFactorAuthentication.isEnabled - เปิด/ปิดการใช้งาน 2FA
 * @property {"otp" | "sms" | "email"} [twoFactorAuthentication.method] - วิธีการยืนยัน 2FA
 * @property {string} [twoFactorAuthentication.secret] - Secret key สำหรับ OTP (ควร `select: false`)
 * @property {string[]} [twoFactorAuthentication.backupCodes] - รหัสสำรองสำหรับ 2FA (ควร `select: false`)
 * @property {Date} [twoFactorAuthentication.verifiedAt] - วันที่เปิดใช้งาน 2FA สำเร็จ
 * @property {object} loginAttempts - ข้อมูลการพยายามล็อกอินที่ผิดพลาด
 * @property {number} loginAttempts.count - จำนวนครั้งที่ล็อกอินผิดพลาดติดต่อกัน
 * @property {Date} [loginAttempts.lastAttemptAt] - เวลาที่พยายามล็อกอินผิดพลาดครั้งล่าสุด
 * @property {Date} [loginAttempts.lockoutUntil] - เวลาที่บัญชีจะถูกล็อกจนถึง (หากมีการล็อกบัญชี)
 * @property {Array<object>} activeSessions - รายการ Session ที่กำลังใช้งานอยู่
 * @property {string} activeSessions.sessionId - ID ของ Session
 * @property {string} activeSessions.ipAddress - IP Address ของ Session
 * @property {string} activeSessions.userAgent - User Agent ของ Session
 * @property {Date} activeSessions.lastAccessedAt - เวลาที่เข้าถึง Session ล่าสุด
 * @property {Date} activeSessions.createdAt - เวลาที่สร้าง Session
 * @property {boolean} [activeSessions.isCurrentSession] - ระบุว่าเป็น Session ปัจจุบันหรือไม่
 */
export interface IUserSecuritySettings {
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
  activeSessions: Array<{
    sessionId: string;
    ipAddress: string;
    userAgent: string;
    lastAccessedAt: Date;
    createdAt: Date;
    isCurrentSession?: boolean;
  }>;
}

/**
 * @interface IMentalWellbeingInsights
 * @description ข้อมูลเชิงลึกเกี่ยวกับสุขภาพจิตใจของผู้ใช้ (สร้างโดย AI/ML Service, ต้องได้รับความยินยอมอย่างชัดแจ้ง)
 * สอดคล้องกับ ReadingAnalytic_EventStream_Schema.txt (source 7, 8)
 * ข้อมูลนี้มีความละเอียดอ่อนสูงมาก ต้องจัดการด้วยความระมัดระวังสูงสุด และเป็นข้อมูลภายในระบบเท่านั้น
 * การแสดงผลต่อผู้ใช้ต้องผ่านการพิจารณาอย่างรอบคอบ และผู้ใช้ต้อง Opt-in เพื่อดูข้อมูลนี้
 * @property {Date} [lastAssessedAt] - วันที่ทำการประเมินล่าสุด
 * @property {"stable" | "improving" | "showing_concern" | "needs_attention" | "unknown"} [overallEmotionalTrend] - แนวโน้มอารมณ์โดยรวม
 * @property {string[]} [observedPatterns] - รูปแบบพฤติกรรมหรืออารมณ์ที่สังเกตได้
 * @property {number} [stressIndicatorScore] - (คำนวณ) คะแนนบ่งชี้ความเครียด (0-1)
 * @property {number} [anxietyIndicatorScore] - (คำนวณ) คะแนนบ่งชี้ความวิตกกังวล (0-1)
 * @property {number} [resilienceIndicatorScore] - (คำนวณ) คะแนนบ่งชี้ความยืดหยุ่นทางอารมณ์ (0-1)
 * @property {boolean} [consultationRecommended] - ระบบแนะนำให้พิจารณาปรึกษาผู้เชี่ยวชาญหรือไม่
 * @property {Date} [lastRecommendationDismissedAt] - วันที่ผู้ใช้ปิดการแจ้งเตือนคำแนะนำล่าสุด
 * @property {string} [modelVersion] - เวอร์ชันของโมเดล AI/ML ที่ใช้ในการประเมิน
 */
export interface IMentalWellbeingInsights {
  lastAssessedAt?: Date;
  overallEmotionalTrend?: "stable" | "improving" | "showing_concern" | "needs_attention" | "unknown";
  observedPatterns?: string[];
  stressIndicatorScore?: number;
  anxietyIndicatorScore?: number;
  resilienceIndicatorScore?: number;
  consultationRecommended?: boolean;
  lastRecommendationDismissedAt?: Date;
  modelVersion?: string;
}

// ==================================================================================================
// SECTION: อินเทอร์เฟซสำหรับ WriterStats (นำมาจากไฟล์ WriterStats.ts และรวมเข้ามา)
// ==================================================================================================

/**
 * @interface INovelPerformanceStats
 * @description สถิติผลงานนิยายแต่ละเรื่องของนักเขียน
 * @property {Types.ObjectId} novelId - ID ของนิยาย (อ้างอิง Novel model)
 * @property {string} novelTitle - ชื่อนิยาย (Denormalized เพื่อความสะดวกในการแสดงผล)
 * @property {number} totalViews - จำนวนยอดเข้าชมทั้งหมดของนิยาย
 * @property {number} totalReads - จำนวนครั้งที่นิยายถูกอ่านจนจบ หรือถึงเกณฑ์ที่กำหนด
 * @property {number} totalLikes - จำนวนไลค์ทั้งหมดของนิยาย
 * @property {number} totalComments - จำนวนความคิดเห็นทั้งหมดของนิยาย
 * @property {number} totalFollowers - จำนวนผู้ติดตามนิยายเรื่องนี้
 * @property {number} [averageRating] - คะแนนเฉลี่ยของนิยาย (ถ้ามีระบบให้คะแนนนิยาย)
 * @property {number} [totalEarningsFromNovel] - รายได้รวมจากนิยายเรื่องนี้ (ถ้ามีการติดตามรายได้รายนิยาย)
 */
export interface INovelPerformanceStats {
  novelId: Types.ObjectId;
  novelTitle: string;
  totalViews: number;
  totalReads: number;
  totalLikes: number;
  totalComments: number;
  totalFollowers: number;
  averageRating?: number;
  totalEarningsFromNovel?: number;
}

/**
 * @interface IWriterStats
 * @description สถิติโดยรวมของนักเขียน (สำหรับ Embed ใน User model)
 * @property {number} totalNovelsPublished - จำนวนนิยายทั้งหมดที่เผยแพร่
 * @property {number} totalEpisodesPublished - จำนวนตอนทั้งหมดที่เผยแพร่
 * @property {number} totalViewsAcrossAllNovels - ยอดเข้าชมรวมทุกนิยาย
 * @property {number} totalReadsAcrossAllNovels - ยอดอ่านรวมทุกนิยาย (จบเรื่อง/ถึงเกณฑ์)
 * @property {number} totalLikesReceivedOnNovels - ยอดไลค์รวมที่ได้รับในทุกนิยาย
 * @property {number} totalCommentsReceivedOnNovels - ยอดคอมเมนต์รวมที่ได้รับในทุกนิยาย
 * @property {number} totalEarningsToDate - รายได้รวมทั้งหมดจนถึงปัจจุบัน (สกุลเงินหลักของระบบ เช่น THB)
 * @property {number} totalCoinsReceived - เหรียญ Coins ทั้งหมดที่ได้รับจากการสนับสนุน
 * @property {number} totalRealMoneyReceived - เงินจริงทั้งหมดที่ได้รับ (สกุลเงินหลักของระบบ)
 * @property {number} totalDonationsReceived - จำนวนครั้งทั้งหมดที่ได้รับการสนับสนุน/บริจาค
 * @property {Types.DocumentArray<INovelPerformanceStats>} [novelPerformanceSummaries] - (Optional) สรุปผลงานรายนิยาย (อาจเก็บ Top N หรือ link ไป collection แยกถ้ามีจำนวนมาก)
 * @property {Date} [writerSince] - วันที่ได้รับการอนุมัติเป็นนักเขียน (อาจย้ายมาจาก IUserVerification)
 * @property {Date} [lastNovelPublishedAt] - วันที่เผยแพร่นิยายเรื่องล่าสุด
 * @property {Date} [lastEpisodePublishedAt] - วันที่เผยแพร่ตอนล่าสุด
 * @property {string} [writerTier] - (Optional) ระดับขั้นของนักเขียน (ถ้ามีระบบ Tier)
 * @property {number} [writerRank] - (Optional) อันดับของนักเขียน (ถ้ามีระบบ Ranking)
 */
export interface IWriterStats {
  totalNovelsPublished: number;
  totalEpisodesPublished: number;
  totalViewsAcrossAllNovels: number;
  totalReadsAcrossAllNovels: number;
  totalLikesReceivedOnNovels: number;
  totalCommentsReceivedOnNovels: number;
  totalEarningsToDate: number; // สกุลเงินหลักของระบบ
  totalCoinsReceived: number;
  totalRealMoneyReceived: number; // สกุลเงินหลักของระบบ
  totalDonationsReceived: number;
  novelPerformanceSummaries?: Types.DocumentArray<INovelPerformanceStats>;
  writerSince?: Date; // วันที่ได้รับการอนุมัติเป็นนักเขียน
  lastNovelPublishedAt?: Date;
  lastEpisodePublishedAt?: Date;
  writerTier?: string; // ระดับนักเขียน (อาจมาจาก WriterApplication.assignedLevel)
  writerRank?: number;
}

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสารผู้ใช้ (IUser Document Interface)
// ==================================================================================================

/**
 * @interface IUser
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารผู้ใช้ใน Collection "users"
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสารผู้ใช้
 * @property {string} [username] - ชื่อผู้ใช้ (Unique, อาจไม่มีสำหรับ OAuth บางกรณีในช่วงแรก)
 * @property {string} [email] - อีเมล (Unique, อาจไม่มีสำหรับ OAuth บางกรณีในช่วงแรก)
 * @property {string} [password] - รหัสผ่านที่ถูกเข้ารหัส (Hashed, สำหรับบัญชีประเภท credentials, `select: false`)
 * @property {Types.DocumentArray<IAccount>} accounts - รายการบัญชีที่เชื่อมโยง (Credentials, OAuth)
 * @property {Array<"Reader" | "Writer" | "Admin" | "Moderator" | "Editor">} roles - บทบาทของผู้ใช้ในระบบ
 * @property {IUserProfile} profile - ข้อมูลโปรไฟล์สาธารณะของผู้ใช้
 * @property {IWriterStats} [writerStats] - (เพิ่มใหม่) สถิติสำหรับนักเขียน (ถ้า role เป็น Writer)
 * @property {IUserTrackingStats} trackingStats - สถิติการใช้งานแพลตฟอร์ม
 * @property {IUserSocialStats} socialStats - สถิติทางสังคม
 * @property {IUserPreferences} preferences - การตั้งค่าส่วนตัวของผู้ใช้ (ซึ่งรวม analyticsConsent)
 * @property {IUserWallet} wallet - ข้อมูลกระเป๋าเงินของผู้ใช้
 * @property {IUserGamification} gamification - ข้อมูลระบบ Gamification
 * @property {string[]} [verifiedBadges] - ป้ายยืนยันต่างๆ ที่ผู้ใช้ได้รับ (เช่น "Verified Writer", "Top Commenter")
 * @property {IUserVerification} [verification] - ข้อมูลการยืนยันตัวตน (KYC) และสถานะการเป็นนักเขียน
 * @property {IUserDonationSettings} [donationSettings] - การตั้งค่าเกี่ยวกับการรับบริจาค (สำหรับนักเขียน)
 * @property {IUserSecuritySettings} [securitySettings] - การตั้งค่าความปลอดภัยของบัญชี
 * @property {IMentalWellbeingInsights} [mentalWellbeingInsights] - ข้อมูลเชิงลึกเกี่ยวกับสุขภาพจิตใจ (สร้างโดย AI, **เพิ่มใหม่ตาม Requirement**)
 * @property {boolean} isEmailVerified - สถานะการยืนยันอีเมล
 * @property {Date} [emailVerifiedAt] - วันที่ยืนยันอีเมล (อาจตั้งค่าเมื่อยืนยัน หรือสำหรับ OAuth ที่ยืนยันแล้ว)
 * @property {string} [emailVerificationToken] - Token สำหรับยืนยันอีเมล (ควร `select: false`)
 * @property {Date} [emailVerificationTokenExpiry] - วันหมดอายุของ Token ยืนยันอีเมล (ควร `select: false`)
 * @property {string} [passwordResetToken] - Token สำหรับรีเซ็ตรหัสผ่าน (ควร `select: false`)
 * @property {Date} [passwordResetTokenExpiry] - วันหมดอายุของ Token รีเซ็ตรหัสผ่าน (ควร `select: false`)
 * @property {Date} [lastLoginAt] - วันที่ล็อกอินล่าสุด
 * @property {string} [lastIpAddress] - IP Address ล่าสุดที่ใช้ล็อกอิน (ควร `select: false`)
 * @property {boolean} isActive - สถานะบัญชีว่าใช้งานได้หรือไม่ (สำหรับ soft ban หรือ deactivation ชั่วคราว)
 * @property {boolean} isBanned - สถานะบัญชีว่าถูกระงับถาวรหรือไม่
 * @property {string} [banReason] - เหตุผลการระงับบัญชี
 * @property {Date} [bannedUntil] - วันที่การระงับบัญชีสิ้นสุดลง (สำหรับการระงับชั่วคราว)
 * @property {boolean} isDeleted - สถานะการลบบัญชี (Soft delete)
 * @property {Date} [deletedAt] - วันที่ทำการลบบัญชี (Soft delete)
 * @property {Date} createdAt - วันที่สร้างเอกสารผู้ใช้ (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตเอกสารผู้ใช้ล่าสุด (Mongoose `timestamps`)
 *
 * @method matchPassword - ตรวจสอบรหัสผ่านที่ป้อนเข้ามากับรหัสผ่านที่ถูกเข้ารหัสในฐานข้อมูล
 * @method generateEmailVerificationToken - สร้าง Token สำหรับยืนยันอีเมล
 * @method generatePasswordResetToken - สร้าง Token สำหรับรีเซ็ตรหัสผ่าน
 */
export interface IUser extends Document {
  [x: string]: any;
  _id: Types.ObjectId;
  username?: string;
  email?: string;
  password?: string;
  accounts: Types.DocumentArray<IAccount>;
  roles: Array<"Reader" | "Writer" | "Admin" | "Moderator" | "Editor">;
  profile: IUserProfile; // ตรวจสอบว่า IUserProfile มี penName
  writerStats?: IWriterStats; // << เพิ่ม field นี้เพื่อ embed WriterStats
  trackingStats: IUserTrackingStats;
  socialStats: IUserSocialStats;
  preferences: IUserPreferences;
  wallet: IUserWallet;
  gamification: IUserGamification;
  verifiedBadges?: string[];
  verification?: IUserVerification; // ตรวจสอบว่า IUserVerification ถูกปรับปรุง
  donationSettings?: IUserDonationSettings;
  securitySettings?: IUserSecuritySettings;
  mentalWellbeingInsights?: IMentalWellbeingInsights;
  // writerStatsId ถูกเอาออก เนื่องจากเราจะ Embed writerStats โดยตรง
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

// Schema ย่อยสำหรับ INovelPerformanceStats (ส่วนหนึ่งของ WriterStats)
const NovelPerformanceStatsSchema = new Schema<INovelPerformanceStats>(
  {
    novelId: { type: Schema.Types.ObjectId, ref: "Novel", required: true },
    novelTitle: { type: String, required: true, trim: true, maxlength: 255 },
    totalViews: { type: Number, default: 0, min: 0 },
    totalReads: { type: Number, default: 0, min: 0 },
    totalLikes: { type: Number, default: 0, min: 0 },
    totalComments: { type: Number, default: 0, min: 0 },
    totalFollowers: { type: Number, default: 0, min: 0 },
    averageRating: { type: Number, min: 0, max: 5 },
    totalEarningsFromNovel: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

// Schema หลักสำหรับ WriterStats (สำหรับใช้เป็น sub-document ใน User model)
const WriterStatsSchema = new Schema<IWriterStats>(
  {
    totalNovelsPublished: { type: Number, default: 0, min: 0 },
    totalEpisodesPublished: { type: Number, default: 0, min: 0 },
    totalViewsAcrossAllNovels: { type: Number, default: 0, min: 0 },
    totalReadsAcrossAllNovels: { type: Number, default: 0, min: 0 },
    totalLikesReceivedOnNovels: { type: Number, default: 0, min: 0 },
    totalCommentsReceivedOnNovels: { type: Number, default: 0, min: 0 },
    totalEarningsToDate: { type: Number, default: 0, min: 0 },
    totalCoinsReceived: { type: Number, default: 0, min: 0 },
    totalRealMoneyReceived: { type: Number, default: 0, min: 0 },
    totalDonationsReceived: { type: Number, default: 0, min: 0 },
    novelPerformanceSummaries: [NovelPerformanceStatsSchema],
    writerSince: { type: Date, comment: "วันที่ได้รับการอนุมัติเป็นนักเขียนครั้งแรก" },
    lastNovelPublishedAt: { type: Date },
    lastEpisodePublishedAt: { type: Date },
    writerTier: { type: String, trim: true, maxlength: 50 },
    writerRank: { type: Number, min: 0 },
  },
  { _id: false } // Schema ย่อยสำหรับสถิติของนักเขียน, ถูก embed ใน User model
);

// Schema การตั้งค่าการแสดงผลส่วนการอ่าน
const UserReadingDisplayPreferencesSchema = new Schema<IUserReadingDisplayPreferences>(
  {
    fontFamily: { type: String, trim: true, maxlength: 100 },
    fontSize: { type: Schema.Types.Mixed, required: [true, "กรุณาระบุขนาดตัวอักษร"], default: "medium" }, // สามารถเป็น string หรือ number
    lineHeight: { type: Number, min: 1, max: 3, default: 1.6 },
    textAlignment: { type: String, enum: ["left", "justify"], default: "left" },
    readingModeLayout: { type: String, enum: ["paginated", "scrolling"], required: [true, "กรุณาระบุรูปแบบการอ่าน"], default: "scrolling" },
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

// Schema การตั้งค่าการแสดงผลโดยรวม
const UserDisplayPreferencesSchema = new Schema<IUserDisplayPreferences>(
  {
    theme: { type: String, enum: ["light", "dark", "system", "sepia"], required: [true, "กรุณาระบุธีม"], default: "system" },
    reading: { type: UserReadingDisplayPreferencesSchema, default: () => ({ fontSize: "medium", readingModeLayout: "scrolling", lineHeight: 1.6, textAlignment: "left" }) },
    accessibility: { type: UserAccessibilityDisplayPreferencesSchema, default: () => ({ dyslexiaFriendlyFont: false, highContrastMode: false }) },
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

// Schema การตั้งค่าแจ้งเตือนโดยรวม
const UserPreferencesNotificationsSchema = new Schema<IUserPreferencesNotifications>(
  {
    masterNotificationsEnabled: { type: Boolean, default: true },
    email: { type: NotificationChannelSettingsSchema, default: () => ({}) }, // ให้ default เป็น object ว่างเพื่อให้ sub-schema default ทำงาน
    push: { type: NotificationChannelSettingsSchema, default: () => ({}) },
    inApp: { type: NotificationChannelSettingsSchema, default: () => ({}) },
  },
  { _id: false }
);

// Schema การตั้งค่าความยินยอมเกี่ยวกับการวิเคราะห์ข้อมูล
const UserAnalyticsConsentSchema = new Schema<IUserAnalyticsConsent>(
  {
    allowPsychologicalAnalysis: { type: Boolean, default: false, required: [true, "กรุณาระบุความยินยอมในการวิเคราะห์ทางจิตวิทยา"] },
    allowPersonalizedFeedback: { type: Boolean, default: false },
    lastConsentReviewDate: { type: Date },
  },
  { _id: false }
);

// Schema การตั้งค่าเนื้อหาและความเป็นส่วนตัว
const UserContentPrivacyPreferencesSchema = new Schema<IUserContentPrivacyPreferences>(
  {
    showMatureContent: { type: Boolean, default: false },
    preferredGenres: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    blockedGenres: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    blockedTags: [{ type: String, trim: true, lowercase: true, maxlength: 100 }],
    blockedAuthors: [{ type: Schema.Types.ObjectId, ref: "User" }],
    blockedNovels: [{ type: Schema.Types.ObjectId, ref: "Novel" }],
    profileVisibility: { type: String, enum: ["public", "followers_only", "private"], default: "public" },
    readingHistoryVisibility: { type: String, enum: ["public", "followers_only", "private"], default: "followers_only" },
    showActivityStatus: { type: Boolean, default: true },
    allowDirectMessagesFrom: { type: String, enum: ["everyone", "followers", "no_one"], default: "followers" },
    analyticsConsent: {
        type: UserAnalyticsConsentSchema,
        default: () => ({ allowPsychologicalAnalysis: false, allowPersonalizedFeedback: false }), // กำหนด default ที่นี่
        required: [true, "การตั้งค่าความยินยอมในการวิเคราะห์ข้อมูลเป็นสิ่งจำเป็น"]
    },
  },
  { _id: false }
);

// Schema การตั้งค่าผู้ใช้หลัก
const UserPreferencesSchema = new Schema<IUserPreferences>(
  {
    language: { type: String, default: "th", enum: ["th", "en", "ja", "ko", "zh"], required: [true, "กรุณาระบุภาษา"] },
    display: { type: UserDisplayPreferencesSchema, default: () => ({}) }, // Default ย่อยจะถูกจัดการโดย UserDisplayPreferencesSchema
    notifications: { type: UserPreferencesNotificationsSchema, default: () => ({}) }, // Default ย่อยจะถูกจัดการโดย UserPreferencesNotificationsSchema
    contentAndPrivacy: { type: UserContentPrivacyPreferencesSchema, default: () => ({}) }, // Default ย่อยจะถูกจัดการโดย UserContentPrivacyPreferencesSchema
  },
  { _id: false }
);

// Schema บัญชีที่เชื่อมโยง
const AccountSchema = new Schema<IAccount>(
  {
    provider: { type: String, required: [true, "กรุณาระบุ Provider"], trim: true, index: true },
    providerAccountId: { type: String, required: [true, "กรุณาระบุ Provider Account ID"], trim: true, index: true },
    type: { type: String, enum: ["oauth", "credentials"], required: [true, "กรุณาระบุประเภทบัญชี"] },
    accessToken: { type: String, select: false },
    refreshToken: { type: String, select: false },
    expiresAt: { type: Number },
    tokenType: { type: String, select: false },
    scope: { type: String },
    idToken: { type: String, select: false },
    sessionState: { type: String, select: false },
    providerData: { type: Schema.Types.Mixed, select: false },
  },
  { _id: false }
);

// ปรับปรุง UserProfileSchema ให้มี penname
const UserProfileSchema = new Schema<IUserProfile>(
  {
    displayName: {
        type: String,
        trim: true,
        minlength: [1, "ชื่อที่แสดงต้องมีอย่างน้อย 1 ตัวอักษร"],
        maxlength: [100, "ชื่อที่แสดงต้องไม่เกิน 100 ตัวอักษร"],
    },
    penName: { // << เพิ่มใหม่
        type: String,
        trim: true,
        unique: true, // นามปากกาควรจะไม่ซ้ำกัน
        sparse: true, // อนุญาตให้ null/undefined ได้ (สำหรับผู้ที่ไม่ได้เป็นนักเขียน)
        minlength: [2, "นามปากกาต้องมีอย่างน้อย 2 ตัวอักษร"],
        maxlength: [50, "นามปากกาต้องไม่เกิน 50 ตัวอักษร"],
        validate: {
          validator: function (v: string) {
            // อนุญาตอักขระไทย, อังกฤษ, ตัวเลข, เว้นวรรค, และอักขระพิเศษบางตัวที่ปลอดภัยสำหรับนามปากกา
            return v === null || v === undefined || v === '' || /^[ก-๙a-zA-Z0-9\s\-_.'()&]+$/.test(v);
          },
          message: "นามปากกาต้องประกอบด้วยอักขระที่อนุญาตเท่านั้น",
        },
    },
    avatarUrl: {
      type: String,
      trim: true,
      maxlength: [2048, "URL รูปโปรไฟล์ยาวเกินไป"],
      validate: {
        validator: (v: string) => !v || /^https?:\/\/|^\//.test(v) || /^data:image\/(png|jpeg|gif|webp);base64,/.test(v),
        message: "รูปแบบ URL รูปโปรไฟล์ไม่ถูกต้อง"
      }
    },
    coverImageUrl: {
      type: String,
      trim: true,
      maxlength: [2048, "URL รูปปกยาวเกินไป"],
      validate: {
        validator: (v: string) => !v || /^https?:\/\/|^\//.test(v) || /^data:image\/(png|jpeg|gif|webp);base64,/.test(v),
        message: "รูปแบบ URL รูปปกไม่ถูกต้อง"
      }
    },
    bio: { type: String, trim: true, maxlength: [500, "คำอธิบายตัวตนต้องไม่เกิน 500 ตัวอักษร"] },
    gender: { type: String, enum: ["male", "female", "other", "prefer_not_to_say"] },
    dateOfBirth: { type: Date },
    country: { type: String, trim: true, uppercase: true, match: [/^[A-Z]{2}$/, "รหัสประเทศต้องเป็น ISO 3166-1 alpha-2"] },
    timezone: { type: String, trim: true, maxlength: 100 },
    location: { type: String, trim: true, maxlength: [200, "ที่อยู่ต้องไม่เกิน 200 ตัวอักษร"] },
    websiteUrl: {
      type: String,
      trim: true,
      maxlength: [2048, "URL เว็บไซต์ยาวเกินไป"],
      validate: {
        validator: (v: string) => !v || /^https?:\/\//.test(v),
        message: "รูปแบบ URL เว็บไซต์ไม่ถูกต้อง"
      }
    },
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
    lastNovelReadAt: { type: Date },
    joinDate: { type: Date, default: Date.now, required: true },
    firstLoginAt: { type: Date },
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
    coinBalance: { type: Number, default: 0, min: 0, required: true },
    lastCoinTransactionAt: { type: Date },
  },
  { _id: false }
);

// Schema ระบบ Gamification
const UserGamificationSchema = new Schema<IUserGamification>(
  {
    level: { type: Number, default: 1, min: 1, required: true },
    experiencePoints: { type: Number, default: 0, min: 0, required: true },
    nextLevelXPThreshold: { type: Number, default: 100, min: 0, required: true },
    achievements: [{ type: Schema.Types.ObjectId, ref: "Achievement" }],
    loginStreaks: {
      currentStreakDays: { type: Number, default: 0, min: 0 },
      longestStreakDays: { type: Number, default: 0, min: 0 },
      lastLoginDate: { type: Date },
    },
    dailyCheckIn: {
      lastCheckInDate: { type: Date },
      currentStreakDays: { type: Number, default: 0, min: 0 },
    },
  },
  { _id: false }
);

// Schema การยืนยันตัวตน (KYC) และการเป็นนักเขียน
const UserVerificationSchema = new Schema<IUserVerification>(
  {
    kycStatus: { type: String, enum: ["none", "pending", "verified", "rejected", "requires_resubmission"], default: "none", index: true },
    kycSubmittedAt: { type: Date },
    kycReviewedAt: { type: Date },
    kycVerifiedAt: { type: Date },
    kycRejectionReason: { type: String, trim: true, maxlength: 1000 },
    kycApplicationId: { type: Schema.Types.ObjectId },
    writerApplicationId: { type: Schema.Types.ObjectId, ref: "WriterApplication", comment: "ID ของใบสมัครนักเขียนล่าสุดหรือที่เกี่ยวข้อง" },
    // `writerApplicationStatus` ถูกเอาออก เพื่อลดความซ้ำซ้อน สถานะหลักจะอยู่ที่ WriterApplication.status
    // และ User.roles กับ User.writerStats.writerSince จะบอกสถานะการเป็นนักเขียน
  },
  { _id: false } // Schema ย่อยสำหรับข้อมูลการยืนยันตัวตน (KYC) และการอ้างอิงใบสมัครนักเขียน
);


// Schema การตั้งค่าการรับบริจาค
const UserDonationSettingsSchema = new Schema<IUserDonationSettings>(
  {
    activeAuthorDirectDonationAppId: { type: Schema.Types.ObjectId, ref: "DonationApplication" },
    isEligibleForDonation: { type: Boolean, default: false, required: true },
  },
  { _id: false }
);

// Schema การตั้งค่าความปลอดภัย
const UserSecuritySettingsSchema = new Schema<IUserSecuritySettings>(
  {
    lastPasswordChangeAt: { type: Date },
    twoFactorAuthentication: {
      isEnabled: { type: Boolean, default: false },
      method: { type: String, enum: ["otp", "sms", "email"] },
      secret: { type: String, select: false },
      backupCodes: { type: [String], select: false },
      verifiedAt: { type: Date },
    },
    loginAttempts: {
      count: { type: Number, default: 0, min: 0 },
      lastAttemptAt: { type: Date },
      lockoutUntil: { type: Date },
    },
    activeSessions: [
      {
        sessionId: { type: String, required: true },
        ipAddress: { type: String, required: true, select: false },
        userAgent: { type: String, required: true, select: false },
        lastAccessedAt: { type: Date, required: true },
        createdAt: { type: Date, required: true, default: Date.now },
        isCurrentSession: { type: Boolean },
        _id: false,
      },
    ],
  },
  { _id: false }
);

// Schema สำหรับ Mental Wellbeing Insights
const MentalWellbeingInsightsSchema = new Schema<IMentalWellbeingInsights>(
  {
    lastAssessedAt: { type: Date },
    overallEmotionalTrend: {
      type: String,
      enum: ["stable", "improving", "showing_concern", "needs_attention", "unknown"],
      default: "unknown",
    },
    observedPatterns: [{ type: String, trim: true, maxlength: 200 }],
    stressIndicatorScore: { type: Number, min: 0, max: 1 },
    anxietyIndicatorScore: { type: Number, min: 0, max: 1 },
    resilienceIndicatorScore: { type: Number, min: 0, max: 1 },
    consultationRecommended: { type: Boolean, default: false },
    lastRecommendationDismissedAt: { type: Date },
    modelVersion: { type: String, trim: true, maxlength: 50 },
  },
  { _id: false }
);

// ==================================================================================================
// SECTION: Schema หลักสำหรับ User (UserSchema)
// ==================================================================================================
const UserSchema = new Schema<IUser>(
  {
    /** ชื่อผู้ใช้สำหรับ Login และแสดงผล, Unique และ Sparse */
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      minlength: [3, "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร"],
      maxlength: [50, "ชื่อผู้ใช้ต้องไม่เกิน 50 ตัวอักษร"],
      match: [/^(?=.{3,50}$)(?![_.])(?!.*[_.]{2})[a-zA-Z0-9._]+(?<![_.])$/, "ชื่อผู้ใช้สามารถมีได้เฉพาะตัวอักษรภาษาอังกฤษ, ตัวเลข, จุด (.), และขีดล่าง (_) เท่านั้น และต้องไม่ขึ้นต้นหรือลงท้ายด้วยจุดหรือขีดล่าง และห้ามมีจุดหรือขีดล่างติดกัน"],
      index: true,
    },
    /** อีเมลของผู้ใช้, Unique และ Sparse, ใช้สำหรับ Login และการติดต่อ */
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      match: [/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/, "รูปแบบอีเมลไม่ถูกต้อง"],
      index: true,
    },
    /** รหัสผ่านที่ถูก Hashed (สำหรับ Credentials-based authentication) */
    password: {
      type: String,
      select: false, // ไม่ query รหัสผ่านออกมาโดย default
    },
    /** รายการบัญชีที่เชื่อมโยง (Credentials, OAuth Providers) */
    accounts: {
      type: [AccountSchema],
      validate: {
        validator: function(v: any[]) { return v && v.length > 0; },
        message: "ผู้ใช้ต้องมีอย่างน้อยหนึ่งบัญชี (credentials หรือ OAuth)"
      },
    },
    /** บทบาทของผู้ใช้ในระบบ (สามารถมีได้หลายบทบาท) */
    roles: {
      type: [String],
      enum: ["Reader", "Writer", "Admin", "Moderator", "Editor"], 
      //Reader	อ่านนิยาย, ให้คะแนน, เขียนรีวิว	
      // Writer	เขียน/เผยแพร่นิยาย, ดูสถิติผลงานตัวเอง
      // Editor	แก้ไขต้นฉบับ ร่วมกับ Writer หรือจากทีมงาน	(plan ในอาคตเผื่อเพิ่ม teamspace)
      // Moderator	ตรวจสอบคอนเทนต์, จัดการรีวิว, แบนผู้ใช้	
      // Admin	จัดการระบบทั้งหมด เช่น users, roles, settings	
      default: ["Reader"],
      required: [true, "กรุณาระบุบทบาทของผู้ใช้"],
    },
    /** ข้อมูลโปรไฟล์สาธารณะของผู้ใช้ */
    profile: {
        type: UserProfileSchema,
        default: () => ({}), // Default เป็น object ว่าง
    },
    /** สถิติสำหรับนักเขียน (Embed ถ้าผู้ใช้เป็น Writer) */
    writerStats: {
        type: WriterStatsSchema,
        default: undefined,
    },
    /** สถิติการใช้งานแพลตฟอร์มของผู้ใช้ */
    trackingStats: {
        type: UserTrackingStatsSchema,
        default: () => ({ joinDate: new Date(), totalLoginDays: 0, totalNovelsRead: 0, totalEpisodesRead: 0, totalTimeSpentReadingSeconds: 0, totalCoinSpent: 0, totalRealMoneySpent: 0 }),
    },
    /** สถิติทางสังคมของผู้ใช้ */
    socialStats: {
        type: UserSocialStatsSchema,
        default: () => ({ followersCount: 0, followingCount: 0, novelsCreatedCount: 0, commentsMadeCount: 0, ratingsGivenCount: 0, likesGivenCount: 0 }),
    },
    /** การตั้งค่าส่วนตัวของผู้ใช้ (รวมถึง analyticsConsent) */
    preferences: {
      type: UserPreferencesSchema,
      default: () => ({
        language: "th",
      }),
    },
    /** ข้อมูลกระเป๋าเงินของผู้ใช้ */
    wallet: {
        type: UserWalletSchema,
        default: () => ({ coinBalance: 0 }),
    },
    /** ข้อมูลระบบ Gamification ของผู้ใช้ */
    gamification: {
        type: UserGamificationSchema,
        default: () => ({ level: 1, experiencePoints: 0, nextLevelXPThreshold: 100, achievements: [], loginStreaks: { currentStreakDays: 0, longestStreakDays: 0 }, dailyCheckIn: { currentStreakDays: 0 } }),
    },
    /** ป้ายยืนยันต่างๆ ที่ผู้ใช้ได้รับ */
    verifiedBadges: {
        type: [{ type: String, trim: true, maxlength: 100 }],
        default: [],
    },
    /** ข้อมูลการยืนยันตัวตน (KYC) และสถานะการเป็นนักเขียน */
    verification: {
        type: UserVerificationSchema,
        default: () => ({ kycStatus: "none", writerApplicationStatus: "none" }),
    },
    /** การตั้งค่าเกี่ยวกับการรับบริจาค (สำหรับนักเขียน) */
    donationSettings: {
        type: UserDonationSettingsSchema,
        default: () => ({ isEligibleForDonation: false }),
    },
    /** การตั้งค่าความปลอดภัยของบัญชี */
    securitySettings: {
        type: UserSecuritySettingsSchema,
        default: () => ({ twoFactorAuthentication: { isEnabled: false }, loginAttempts: { count: 0 }, activeSessions: [] }),
    },
    /** ข้อมูลเชิงลึกเกี่ยวกับสุขภาพจิตใจ (สร้างโดย AI, ต้องได้รับความยินยอม) */
    mentalWellbeingInsights: {
        type: MentalWellbeingInsightsSchema,
        default: () => ({ overallEmotionalTrend: "unknown", consultationRecommended: false }),
        select: false, // ข้อมูลนี้ละเอียดอ่อนมาก ไม่ควร query ออกมาโดย default
    },
    /** สถานะการยืนยันอีเมล */
    isEmailVerified: {
        type: Boolean,
        default: false,
        required: true,
    },
    /** วันที่ยืนยันอีเมล (สำหรับ OAuth หรือเมื่อยืนยันสำเร็จ) */
    emailVerifiedAt: {
        type: Date,
    },
    /** Token สำหรับยืนยันอีเมล (Hashed) */
    emailVerificationToken: { type: String, select: false },
    /** วันหมดอายุของ Token ยืนยันอีเมล */
    emailVerificationTokenExpiry: { type: Date, select: false },
    /** Token สำหรับรีเซ็ตรหัสผ่าน (Hashed) */
    passwordResetToken: { type: String, select: false },
    /** วันหมดอายุของ Token รีเซ็ตรหัสผ่าน */
    passwordResetTokenExpiry: { type: Date, select: false },
    /** วันที่ล็อกอินล่าสุด */
    lastLoginAt: { type: Date },
    /** IP Address ล่าสุดที่ใช้ล็อกอิน (Hashed/Anonymized) */
    lastIpAddress: { type: String, select: false },
    /** สถานะบัญชีว่าใช้งานได้หรือไม่ */
    isActive: { type: Boolean, default: true, index: true },
    /** สถานะบัญชีว่าถูกระงับถาวรหรือไม่ */
    isBanned: { type: Boolean, default: false, index: true },
    /** เหตุผลการระงับบัญชี */
    banReason: { type: String, trim: true, maxlength: 1000 },
    /** วันที่การระงับบัญชีสิ้นสุดลง (สำหรับการระงับชั่วคราว) */
    bannedUntil: { type: Date },
    /** สถานะการลบบัญชี (Soft delete) */
    isDeleted: { type: Boolean, default: false, index: true },
    /** วันที่ทำการลบบัญชี (Soft delete) */
    deletedAt: { type: Date },
  },
  {
    timestamps: true, // สร้าง createdAt และ updatedAt โดยอัตโนมัติ
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: "users", // ระบุชื่อ Collection ให้ชัดเจน
    // Mongoose SchemaOptions ไม่รองรับ `comment` โดยตรง
    // ให้ใช้ JSDoc comment เหนือ Schema definition แทน
    // comment: "โมเดลหลักสำหรับเก็บข้อมูลผู้ใช้ทั้งหมดของแพลตฟอร์ม NovelMaze"
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================
UserSchema.index({ email: 1 }, { unique: true, sparse: true, name: "UserEmailIndex" });
UserSchema.index({ username: 1 }, { unique: true, sparse: true, name: "UserUsernameIndex" });
UserSchema.index({ "accounts.provider": 1, "accounts.providerAccountId": 1 }, { unique: true, sparse: true, name: "UserAccountsProviderIndex" });
UserSchema.index({ roles: 1 }, { name: "UserRolesIndex" });
UserSchema.index({ "preferences.language": 1 }, { name: "UserLanguagePreferenceIndex" });
UserSchema.index({ "gamification.level": -1 }, { name: "UserGamificationLevelIndex" });
UserSchema.index({ lastLoginAt: -1 }, { name: "UserLastLoginIndex" });
UserSchema.index({ isDeleted: 1, deletedAt: 1 }, { name: "UserSoftDeleteIndex" });
UserSchema.index(
  { "preferences.contentAndPrivacy.analyticsConsent.allowPsychologicalAnalysis": 1 },
  { name: "UserAnalyticsConsentIndex" }
);
UserSchema.index(
  { "mentalWellbeingInsights.lastAssessedAt": -1 },
  { name: "UserMentalWellbeingAssessmentDateIndex" }
);

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

UserSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password") || !this.password) {
    return next();
  }
  const hasCredentialsAccount = this.accounts.some(acc => acc.type === "credentials" && acc.provider === "credentials");
  if (hasCredentialsAccount) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    } catch (error: any) {
      next(new Error("Error hashing password: " + error.message));
    }
  } else {
    this.password = undefined;
    next();
  }
});

UserSchema.pre<IUser>("save", async function (next) {
  if (this.isNew && !this.username && this.email) {
    let baseUsername = this.email.split("@")[0].replace(/[^a-zA-Z0-9_.]/g, "").toLowerCase();
    if (!baseUsername || baseUsername.length < 3) baseUsername = "user";
    while(baseUsername.length < 3) {
      baseUsername += Math.floor(Math.random() * 10);
    }
    let potentialUsername = baseUsername.substring(0, 40);
    let count = 0;
    const UserModelInstance = models.User || model<IUser>("User", UserSchema); // ใช้ UserSchema ที่ประกาศไว้ในไฟล์นี้
    while (await UserModelInstance.findOne({ username: potentialUsername })) {
      count++;
      potentialUsername = `${baseUsername.substring(0, 40 - String(count).length)}${count}`;
      if (potentialUsername.length > 50) {
         return next(new Error("Could not generate a unique username. Please try a different email or set a username manually."));
      }
    }
    this.username = potentialUsername;
  }

  if (this.isModified("email") && this.email) {
    this.email = this.email.toLowerCase();
  }

  if (this.isNew && this.accounts.some(acc => acc.type === "oauth") && this.email) {
    this.isEmailVerified = true;
    this.emailVerifiedAt = new Date();
  }
  
  // ตรรกะการจัดการ Writer Role และ writerStats
  const isNowWriter = this.roles.includes("Writer");
  const wasPreviouslyWriter = this.$__.priorValid ? this.$__.priorValid.roles.includes("Writer") : false;

  if (isNowWriter && !wasPreviouslyWriter) {
    // เพิ่งถูกเปลี่ยนเป็น Writer
    if (!this.writerStats) {
      console.log(`[User Middleware] ผู้ใช้ ${this.username || this.email} ได้รับบทบาท Writer, กำลังสร้าง writerStats เริ่มต้น...`);
      this.writerStats = {
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
        writerSince: new Date(), // ตั้งค่าวันที่เริ่มเป็นนักเขียน
        // novelPerformanceSummaries ไม่ต้องใส่ default เพราะเป็น array
      };
    } else if (!this.writerStats.writerSince) {
      // ถ้า writerStats มีอยู่แล้วแต่ยังไม่มี writerSince (กรณีอัปเกรดข้อมูลเก่า)
      this.writerStats.writerSince = new Date();
    }
    // นามปากกา (penName) ควรถูกตั้งค่าจาก displayName ที่ระบุใน WriterApplication
    // ซึ่งควรทำใน Middleware ของ WriterApplication หรือ Service Layer ที่จัดการการอนุมัติ
    // ที่นี่เราแค่ตรวจสอบว่าถ้ามี displayName จาก profile แล้ว penName ยังว่าง ก็อาจจะ copy มา
    if (this.profile.displayName && !this.profile.penName) {
        // ตรวจสอบความซ้ำซ้อนของ penName ก่อนตั้งค่า
        const UserModelInstance = models.User || model<IUser>("User"); // ใช้ UserSchema ที่ประกาศไว้ในไฟล์นี้
        const existingUserWithPenName = await UserModelInstance.findOne({ "profile.penName": this.profile.displayName, _id: { $ne: this._id } });
        if (!existingUserWithPenName) {
            this.profile.penName = this.profile.displayName;
            console.log(`[User Middleware] ตั้งค่า penName เริ่มต้นสำหรับ ${this.username} เป็น "${this.profile.penName}"`);
        } else {
            console.warn(`[User Middleware] ไม่สามารถตั้งค่า penName "${this.profile.displayName}" เนื่องจากซ้ำซ้อน, ผู้ใช้ ${this.username} ต้องตั้งค่าเองภายหลัง`);
            // อาจจะแจ้งเตือนผู้ใช้หรือ admin
        }
    }

  } else if (!isNowWriter && wasPreviouslyWriter) {
    // ถูกเอาออกจาก Role Writer
    console.log(`[User Middleware] ผู้ใช้ ${this.username || this.email} ถูกถอดจากบทบาท Writer, กำลังล้าง writerStats...`);
    this.writerStats = undefined; // ล้างข้อมูล writerStats
    // อาจจะต้องพิจารณาล้าง penName หรือไม่ ขึ้นอยู่กับนโยบาย
    // this.profile.penName = undefined;
  }

  next();
});

// ==================================================================================================
// SECTION: Methods (เมธอดสำหรับ User Document)
// ==================================================================================================

UserSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.methods.generateEmailVerificationToken = function (): string {
  const token = crypto.randomBytes(32).toString("hex");
  this.emailVerificationToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  this.emailVerificationTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 ชั่วโมง
  return token;
};

UserSchema.methods.generatePasswordResetToken = function (): string {
  const token = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  this.passwordResetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 ชั่วโมง
  return token;
};

// ==================================================================================================
// SECTION: Virtuals (ฟิลด์เสมือน)
// ==================================================================================================

UserSchema.virtual("profileUrl").get(function (this: IUser) {
  if (this.username) {
    return `/u/${this.username}`;
  }
  return `/users/${this._id}`;
});

UserSchema.virtual("age").get(function (this: IUser) {
  if (this.profile && this.profile.dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(this.profile.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : undefined;
  }
  return undefined;
});

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================
/**
 * โมเดลหลักสำหรับเก็บข้อมูลผู้ใช้ทั้งหมดของแพลตฟอร์ม NovelMaze.
 * ประกอบด้วยข้อมูลการยืนยันตัวตน, โปรไฟล์, การตั้งค่า, สถิติ, และข้อมูลอื่นๆ ที่เกี่ยวข้องกับผู้ใช้.
 */
const UserModel = (models.User as mongoose.Model<IUser>) || model<IUser>("User", UserSchema);

export default UserModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม
// ==================================================================================================
// 1.  **WriterStats Integration**: `writerStats` ถูก Embed เข้ามาใน User model โดยตรงแล้ว
//     - เมื่อผู้ใช้มี Role "Writer", field `writerStats` จะถูก populated ด้วยข้อมูลจาก `WriterStatsSchema`.
//     - Middleware ใน `UserSchema.pre("save", ...)` จะจัดการการสร้าง `writerStats` เริ่มต้นเมื่อผู้ใช้ได้รับ role "Writer"
//       หรือลบออกเมื่อ role "Writer" ถูกเอาออก
//     - การอัปเดตข้อมูลภายใน `writerStats` (เช่น `totalNovelsPublished`, `totalEarningsToDate`) จะต้องทำผ่าน logic ใน service layer
//       ที่เกี่ยวข้องกับการสร้าง/เผยแพร่นิยาย หรือการบันทึกรายได้.
// 2.  **Mental Wellbeing**: `mentalWellbeingInsights` และ `preferences.contentAndPrivacy.analyticsConsent`
//     ยังคงเป็นส่วนหนึ่งของ User model เพื่อรองรับฟีเจอร์ด้านสุขภาพจิตในอนาคต.
// 3.  **Security and Privacy**: `select: false` ถูกใช้กับ field ที่ละเอียดอ่อน.
// 4.  **Modularity**: การใช้ Sub-Schemas ช่วยให้โค้ดเป็นระเบียบและจัดการง่ายขึ้น.
// ==================================================================================================