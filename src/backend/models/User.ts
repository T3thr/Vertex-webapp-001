// src/backend/models/User.ts
// โมเดลผู้ใช้ (User Model) - ศูนย์กลางข้อมูลผู้ใช้ทั้งหมดสำหรับการยืนยันตัวตน (Credentials และ OAuth), การตั้งค่า, สถิติ, และการจัดการบัญชี
// ตามมาตรฐาน DivWy
// เพิ่มการรวม WriterStats และการรองรับ Mental Wellbeing Insights
// อัปเดตล่าสุด: เพิ่ม VisualNovelGameplayPreferences สำหรับการตั้งค่าเฉพาะของ Visual Novel
// อัปเดตล่าสุด (Gamification): ปรับปรุง IUserGamification, เพิ่ม totalExperiencePointsEverEarned, currentLevelObject, showcasedItems, displayBadges

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import LevelModel, { ILevel } from "./Level"; // << ใหม่: Import ILevel
import { IPromotionDetails as INovelPromotionDetails } from "./Novel";
// UserAchievement ไม่จำเป็นต้อง import โดยตรงที่นี่ แต่ gamification.achievements จะอ้างอิงถึง _id ของ UserEarnedItem ใน UserAchievement
// ซึ่ง UserEarnedItem เองก็มี itemId ที่ ref ไปยัง Achievement/Badge อีกที

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
  fontSize: "small" | "medium" | "large" | number; // ขนาดตัวอักษรที่ผู้ใช้เลือก
  lineHeight?: number; // ระยะห่างระหว่างบรรทัด
  textAlignment?: "left" | "justify"; // การจัดวางข้อความ
  readingModeLayout: "paginated" | "scrolling"; // รูปแบบการแสดงผลหน้าอ่าน
}

/**
 * @interface IUserAccessibilityDisplayPreferences
 * @description การตั้งค่าการเข้าถึงเพื่อช่วยเหลือผู้ใช้ (Accessibility)
 * @property {boolean} [dyslexiaFriendlyFont] - เปิด/ปิดการใช้ฟอนต์ที่เหมาะสำหรับผู้มีภาวะ Dyslexia
 * @property {boolean} [highContrastMode] - เปิด/ปิดโหมดความคมชัดสูง
 */
export interface IUserAccessibilityDisplayPreferences {
  dyslexiaFriendlyFont?: boolean; // ใช้ฟอนต์สำหรับผู้มีภาวะดิสเล็กเซีย
  highContrastMode?: boolean; // โหมดความคมชัดสูง
}

/**
 * @interface IUserDisplayPreferences
 * @description การตั้งค่าการแสดงผลโดยรวมของผู้ใช้
 * @property {"light" | "dark" | "system" | "sepia"} theme - ธีม UI ที่ผู้ใช้เลือก
 * @property {IUserReadingDisplayPreferences} reading - การตั้งค่าการแสดงผลส่วนการอ่าน
 * @property {IUserAccessibilityDisplayPreferences} accessibility - การตั้งค่าการเข้าถึง
 */
export interface IUserDisplayPreferences {
  theme: "light" | "dark" | "system" | "sepia"; // ธีมที่ผู้ใช้เลือก (สว่าง, มืด, ตามระบบ, ซีเปีย)
  reading: IUserReadingDisplayPreferences; // การตั้งค่าการแสดงผลการอ่าน
  accessibility: IUserAccessibilityDisplayPreferences; // การตั้งค่าการเข้าถึง
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
  enabled: boolean; // เปิดใช้งานการแจ้งเตือนช่องทางนี้
  newsletter?: boolean; // รับจดหมายข่าว (เฉพาะอีเมล)
  novelUpdatesFromFollowing: boolean; // การอัปเดตจากนิยายที่ติดตาม
  newFollowers: boolean; // ผู้ติดตามใหม่
  commentsOnMyNovels: boolean; // ความคิดเห็นบนนิยายของเรา
  repliesToMyComments: boolean; // การตอบกลับความคิดเห็นของเรา
  donationAlerts: boolean; // การแจ้งเตือนการบริจาค
  systemAnnouncements: boolean; // ประกาศจากระบบ
  securityAlerts?: boolean; // การแจ้งเตือนความปลอดภัย
  promotionalOffers: boolean; // ข้อเสนอโปรโมชั่น
  achievementUnlocks: boolean; // การปลดล็อกความสำเร็จ
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
  masterNotificationsEnabled: boolean; // เปิด/ปิดการแจ้งเตือนทั้งหมด
  email: INotificationChannelSettings; // การตั้งค่าสำหรับอีเมล
  push: INotificationChannelSettings; // การตั้งค่าสำหรับ Push Notification
  inApp: INotificationChannelSettings; // การตั้งค่าสำหรับ In-app Notification
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
  allowPsychologicalAnalysis: boolean; // อนุญาตการวิเคราะห์ทางจิตวิทยา
  allowPersonalizedFeedback?: boolean; // อนุญาตการให้ผลตอบรับส่วนบุคคล
  lastConsentReviewDate?: Date; // วันที่ตรวจสอบความยินยอมล่าสุด
}

/**
 * @interface IVisualNovelGameplayPreferences
 * @description การตั้งค่าเฉพาะสำหรับประสบการณ์การเล่น Visual Novel
 * @property {"slow" | "normal" | "fast" | "instant"} [textSpeed] - ความเร็วในการแสดงข้อความ
 * @property {"click" | "auto_text" | "auto_voice"} [autoPlayMode] - โหมดการเล่นอัตโนมัติ (คลิกเพื่อไปต่อ, ข้อความไปอัตโนมัติ, เสียงพากย์จบแล้วไปต่อ)
 * @property {number} [autoPlayDelayMs] - ความหน่วงเวลา (ms) ก่อนไปต่ออัตโนมัติ (ถ้า autoPlayMode ไม่ใช่ 'click')
 * @property {boolean} [skipUnreadText] - อนุญาตให้ข้ามข้อความที่ยังไม่อ่านหรือไม่
 * @property {boolean} [transitionsEnabled] - เปิด/ปิดเอฟเฟกต์การเปลี่ยนฉาก/องค์ประกอบ
 * @property {boolean} [screenEffectsEnabled] - เปิด/ปิดเอฟเฟกต์หน้าจอ (เช่น สั่น, เบลอ)
 * @property {number} [textWindowOpacity] - ความโปร่งใสของหน้าต่างข้อความ (0.0 - 1.0)
 * @property {number} [masterVolume] - ระดับเสียงโดยรวม (0.0 - 1.0)
 * @property {number} [bgmVolume] - ระดับเสียงเพลงประกอบ (0.0 - 1.0)
 * @property {number} [sfxVolume] - ระดับเสียงเอฟเฟกต์ (0.0 - 1.0)
 * @property {number} [voiceVolume] - ระดับเสียงพากย์ (0.0 - 1.0)
 * @property {boolean} [voicesEnabled] - เปิด/ปิดเสียงพากย์ตัวละคร
 * @property {string} [preferredVoiceLanguage] - ภาษาเสียงพากย์ที่ต้องการ (เช่น "ja", "en", "original")
 * @property {boolean} [showChoiceTimer] - แสดง/ซ่อนตัวจับเวลาสำหรับตัวเลือกที่มีเวลาจำกัด
 * @property {boolean} [blurThumbnailsOfMatureContent] - เบลอภาพตัวอย่างของเนื้อหาสำหรับผู้ใหญ่หรือไม่
 * @property {Types.ObjectId[]} [preferredArtStyles] - ID ของ Category (type: ART_STYLE) ที่ผู้ใช้ชื่นชอบ
 * @property {Types.ObjectId[]} [preferredGameplayMechanics] - ID ของ Category (type: GAMEPLAY_MECHANIC) ที่ผู้ใช้ชื่นชอบ
 * @property {"none" | "essential" | "full" | "wifi_only"} [assetPreloading] - การตั้งค่าการโหลดทรัพยากรล่วงหน้า
 * @property {"none" | "simple" | "full"} [characterAnimationLevel] - ระดับการแสดงอนิเมชันตัวละคร
 */
export interface IVisualNovelGameplayPreferences {
  textSpeed?: "slow" | "normal" | "fast" | "instant"; // ความเร็วในการแสดงข้อความ
  autoPlayMode?: "click" | "auto_text" | "auto_voice"; // โหมดการเล่นอัตโนมัติ
  autoPlayDelayMs?: number; // ความหน่วงเวลาก่อนเล่นอัตโนมัติ
  skipUnreadText?: boolean; // ข้ามข้อความที่ยังไม่อ่าน
  transitionsEnabled?: boolean; // เปิด/ปิดเอฟเฟกต์การเปลี่ยนฉาก
  screenEffectsEnabled?: boolean; // เปิด/ปิดเอฟเฟกต์หน้าจอ
  textWindowOpacity?: number; // ความโปร่งใสของหน้าต่างข้อความ (0.0 - 1.0)
  masterVolume?: number; // ระดับเสียงหลัก (0.0 - 1.0)
  bgmVolume?: number; // ระดับเสียงเพลงประกอบ (0.0 - 1.0)
  sfxVolume?: number; // ระดับเสียงเอฟเฟกต์ (0.0 - 1.0)
  voiceVolume?: number; // ระดับเสียงพากย์ (0.0 - 1.0)
  voicesEnabled?: boolean; // เปิด/ปิดเสียงพากย์
  preferredVoiceLanguage?: string; // ภาษาเสียงพากย์ที่ชื่นชอบ
  showChoiceTimer?: boolean; // แสดงตัวจับเวลาของตัวเลือก
  blurThumbnailsOfMatureContent?: boolean; // เบลอภาพตัวอย่างเนื้อหาผู้ใหญ่
  preferredArtStyles?: Types.ObjectId[]; // สไตล์ภาพที่ชื่นชอบ (อ้างอิง Category)
  preferredGameplayMechanics?: Types.ObjectId[]; // กลไกการเล่นที่ชื่นชอบ (อ้างอิง Category)
  assetPreloading?: "none" | "essential" | "full" | "wifi_only"; // การโหลดทรัพยากรล่วงหน้า
  characterAnimationLevel?: "none" | "simple" | "full"; // ระดับอนิเมชันตัวละคร
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
 * @property {IUserAnalyticsConsent} analyticsConsent - การตั้งค่าความยินยอมเกี่ยวกับการวิเคราะห์ข้อมูล
 */
export interface IUserContentPrivacyPreferences {
  showMatureContent: boolean; // แสดงเนื้อหาสำหรับผู้ใหญ่
  preferredGenres: Types.ObjectId[]; // หมวดหมู่นิยายที่ชื่นชอบ
  blockedGenres?: Types.ObjectId[]; // หมวดหมู่นิยายที่บล็อก
  blockedTags?: string[]; // แท็กที่บล็อก
  blockedAuthors?: Types.ObjectId[]; // ผู้เขียนที่บล็อก
  blockedNovels?: Types.ObjectId[]; // นิยายที่บล็อก
  profileVisibility: "public" | "followers_only" | "private"; // การมองเห็นโปรไฟล์
  readingHistoryVisibility: "public" | "followers_only" | "private"; // การมองเห็นประวัติการอ่าน
  showActivityStatus: boolean; // แสดงสถานะกิจกรรม
  allowDirectMessagesFrom: "everyone" | "followers" | "no_one"; // อนุญาตข้อความส่วนตัวจาก
  analyticsConsent: IUserAnalyticsConsent; // การยินยอมในการวิเคราะห์ข้อมูล
}

/**
 * @interface IUserPreferences
 * @description อินเทอร์เฟซหลักสำหรับการตั้งค่าผู้ใช้ (User Preferences)
 * @property {string} language - ภาษาที่ผู้ใช้เลือกสำหรับ UI (เช่น "th", "en")
 * @property {IUserDisplayPreferences} display - การตั้งค่าการแสดงผล
 * @property {IUserPreferencesNotifications} notifications - การตั้งค่าการแจ้งเตือน
 * @property {IUserContentPrivacyPreferences} contentAndPrivacy - การตั้งค่าเนื้อหาและความเป็นส่วนตัว
 * @property {IVisualNovelGameplayPreferences} [visualNovelGameplay] - (เพิ่มใหม่) การตั้งค่าเฉพาะสำหรับ Visual Novel
 */
export interface IUserPreferences {
  language: string; // ภาษาที่ใช้
  display: IUserDisplayPreferences; // การตั้งค่าการแสดงผล
  notifications: IUserPreferencesNotifications; // การตั้งค่าการแจ้งเตือน
  contentAndPrivacy: IUserContentPrivacyPreferences; // การตั้งค่าเนื้อหาและความเป็นส่วนตัว
  visualNovelGameplay?: IVisualNovelGameplayPreferences; // << ส่วนที่เพิ่มเข้ามาใหม่
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
  provider: string; // ชื่อผู้ให้บริการ (เช่น "google", "credentials")
  providerAccountId: string; // ID บัญชีจากผู้ให้บริการ
  type: "oauth" | "credentials"; // ประเภทบัญชี
  accessToken?: string; // Access Token (สำหรับ OAuth)
  refreshToken?: string; // Refresh Token (สำหรับ OAuth)
  expiresAt?: number; // เวลาหมดอายุของ Token
  tokenType?: string; // ประเภท Token
  scope?: string; // ขอบเขตการเข้าถึง
  idToken?: string; // ID Token (สำหรับ OpenID)
  sessionState?: string; // สถานะ Session
  providerData?: Record<string, any>; // ข้อมูลเพิ่มเติมจาก Provider
}

/**
 * @interface IUserProfile
 * @description ข้อมูลโปรไฟล์สาธารณะของผู้ใช้
 * @property {string} [displayName] - ชื่อที่แสดง (อาจซ้ำกับผู้อื่นได้)
 * @property {string} [penName] - นามปากกาสำหรับนักเขียน (อาจซ้ำกับ displayName หรือตั้งใหม่, ควร unique ถ้าเป็นนักเขียน)
 * @property {string} [avatarUrl] - URL รูปโปรไฟล์ (อ้างอิง Media model หรือ URL ภายนอก)
 * @property {string} [coverImageUrl] - URL รูปปกโปรไฟล์ (อ้างอิง Media model หรือ URL ภายนอก)
 * @property {string} [bio] - คำอธิบายตัวตนสั้นๆ
 * @property {"male" | "female" | "lgbtq+" | "other" | "prefer_not_to_say"} [gender] - เพศของผู้ใช้
 * @property {Date} [dateOfBirth] - วันเกิดของผู้ใช้ (เพื่อคำนวณอายุ, ไม่แสดงสาธารณะโดยตรง)
 * @property {string} [country] - ประเทศ (รหัส ISO 3166-1 alpha-2 เช่น "TH")
 * @property {string} [timezone] - เขตเวลา (เช่น "Asia/Bangkok")
 * @property {string} [location] - ที่อยู่หรือเมือง (แสดงผลแบบทั่วไป)
 * @property {string} [websiteUrl] - URL เว็บไซต์ส่วนตัวหรือโซเชียลมีเดีย
 */
export interface IUserProfile {
  displayName?: string; // ชื่อที่แสดงทั่วไป
  penName?: string; // นามปากกาสำหรับนักเขียน
  avatarUrl?: string; // URL รูปโปรไฟล์
  coverImageUrl?: string; // URL รูปปกโปรไฟล์
  bio?: string; // คำอธิบายตัวตน
  gender?: "male" | "female" | "lgbtq+" | "other" | "prefer_not_to_say"; // เพศ
  dateOfBirth?: Date; // วันเกิด
  country?: string; // ประเทศ
  timezone?: string; // เขตเวลา
  location?: string; // ที่อยู่/เมือง
  websiteUrl?: string; // URL เว็บไซต์
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
  totalLoginDays: number; // จำนวนวันล็อกอินทั้งหมด
  totalNovelsRead: number; // จำนวนนิยายที่อ่านจบ
  totalEpisodesRead: number; // จำนวนตอนที่อ่านทั้งหมด
  totalTimeSpentReadingSeconds: number; // เวลารวมที่ใช้อ่าน (วินาที)
  totalCoinSpent: number; // เหรียญทั้งหมดที่ใช้จ่าย
  totalRealMoneySpent: number; // เงินจริงทั้งหมดที่ใช้จ่าย
  lastNovelReadId?: Types.ObjectId; // ID นิยายที่อ่านล่าสุด
  lastNovelReadAt?: Date; // วันที่อ่านนิยายล่าสุด
  joinDate: Date; // วันที่สมัคร
  firstLoginAt?: Date; // วันที่ล็อกอินครั้งแรก
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
  followersCount: number; // จำนวนผู้ติดตาม
  followingCount: number; // จำนวนที่กำลังติดตาม
  novelsCreatedCount: number; // จำนวนนิยายที่สร้าง
  commentsMadeCount: number; // จำนวนความคิดเห็นที่สร้าง
  ratingsGivenCount: number; // จำนวนการให้คะแนน
  likesGivenCount: number; // จำนวนการกดถูกใจ
}

/**
 * @interface IUserWallet
 * @description ข้อมูลกระเป๋าเงินของผู้ใช้. Field `coinBalance` พร้อมให้ Service อัปเดตเมื่อมีการมอบรางวัล Coin.
 * @property {number} coinBalance - ยอดเหรียญสะสมปัจจุบัน
 * @property {Date} [lastCoinTransactionAt] - วันที่ทำธุรกรรมเหรียญล่าสุด
 */
export interface IUserWallet {
  coinBalance: number; // ยอดเหรียญคงเหลือ
  lastCoinTransactionAt?: Date; // วันที่ทำธุรกรรมเหรียญล่าสุด
}

/**
 * @interface IShowcasedGamificationItem
 * @description โครงสร้างสำหรับ item (Achievement หรือ Badge) ที่ผู้ใช้เลือกแสดงบนโปรไฟล์
 * @property {Types.ObjectId} earnedItemId - ID ของ UserEarnedItem (จาก UserAchievement.earnedItems._id)
 * @property {"Achievement" | "Badge"} itemType - ประเภทของ item (Achievement หรือ Badge)
 */
export interface IShowcasedGamificationItem {
  earnedItemId: Types.ObjectId;
  itemType: "Achievement" | "Badge";
}

/**
 * @interface IUserDisplayBadge
 * @description (ใหม่) โครงสร้างสำหรับ Badge ที่ผู้ใช้ตั้งค่าเพื่อแสดงผลในส่วนต่างๆ
 * @property {Types.ObjectId} earnedBadgeId - ID ของ UserEarnedItem ที่เป็น Badge (จาก UserAchievement.earnedItems._id)
 * @property {string} [displayContext] - (Optional) บริบทที่จะให้ Badge นี้แสดง (เช่น 'comment_signature', 'profile_header')
 */
export interface IUserDisplayBadge {
    earnedBadgeId: Types.ObjectId; // อ้างอิง UserEarnedItem._id ที่เป็น Badge
    displayContext?: string;
}

/**
 * @interface IUserGamification
 * @description ข้อมูลเกี่ยวกับระบบ Gamification ของผู้ใช้.
 * @property {number} level - ระดับ (Level) ของผู้ใช้
 * @property {Types.ObjectId | ILevel | null} currentLevelObject - (ใหม่) อ้างอิงไปยัง Level document ปัจจุบัน
 * @property {number} experiencePoints - คะแนนประสบการณ์ (XP) สะสม
 * @property {number} totalExperiencePointsEverEarned - (ใหม่) คะแนนประสบการณ์ทั้งหมดที่เคยได้รับ
 * @property {number} nextLevelXPThreshold - คะแนนประสบการณ์ที่ต้องใช้เพื่อขึ้นระดับถัดไป (อาจจะดึงมาจาก `currentLevelObject.xpToNextLevelFromThis`)
 * @property {Types.ObjectId[]} achievements - รายการ ID ของ **UserEarnedItem** (ที่มี itemType='Achievement') ที่ผู้ใช้ปลดล็อก
 * @property {IShowcasedGamificationItem[]} [showcasedItems] - (ใหม่) รายการ Achievements/Badges ที่ผู้ใช้เลือกแสดงบนโปรไฟล์ [cite: 5]
 * @property {IUserDisplayBadge} [primaryDisplayBadge] - (ใหม่) Badge หลักที่ผู้ใช้เลือกแสดง
 * @property {IUserDisplayBadge[]} [secondaryDisplayBadges] - (ใหม่) Badge รองที่ผู้ใช้เลือกแสดง (จำกัด 2 อัน)
 * @property {object} loginStreaks - ข้อมูลสตรีคการล็อกอิน
 * @property {number} loginStreaks.currentStreakDays - จำนวนวันสตรีคการล็อกอินปัจจุบัน
 * @property {number} loginStreaks.longestStreakDays - จำนวนวันสตรีคการล็อกอินนานที่สุดที่เคยทำได้
 * @property {Date} [loginStreaks.lastLoginDate] - วันที่ล็อกอินครั้งล่าสุดที่นับในสตรีค
 * @property {object} dailyCheckIn - ข้อมูลการเช็คอินรายวัน
 * @property {Date} [dailyCheckIn.lastCheckInDate] - วันที่เช็คอินล่าสุด
 * @property {number} dailyCheckIn.currentStreakDays - จำนวนวันสตรีคการเช็คอินปัจจุบัน
 * @property {Date} [lastActivityAt] - วันที่ผู้ใช้มีกิจกรรมล่าสุด (อาจใช้ในการคำนวณบางอย่าง)
 */
export interface IUserGamification {
  level: number;
  currentLevelObject?: Types.ObjectId | ILevel | null; // << ใหม่
  experiencePoints: number;
  totalExperiencePointsEverEarned?: number; // << ใหม่
  nextLevelXPThreshold: number;
  achievements: Types.ObjectId[]; // Array of UserEarnedItem._id (where itemType is Achievement)
  showcasedItems?: IShowcasedGamificationItem[]; // << ใหม่
  primaryDisplayBadge?: IUserDisplayBadge; // << ใหม่
  secondaryDisplayBadges?: IUserDisplayBadge[]; // << ใหม่ (limit 2)
  loginStreaks: {
    currentStreakDays: number;
    longestStreakDays: number;
    lastLoginDate?: Date;
  };
  dailyCheckIn: {
    lastCheckInDate?: Date;
    currentStreakDays: number;
  };
  lastActivityAt?: Date;
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
 * @property {Types.ObjectId} [writerApplicationId] - ID ใบสมัครนักเขียนล่าสุด หรือใบสมัครที่ active อยู่
 */
export interface IUserVerification {
  kycStatus: "none" | "pending" | "verified" | "rejected" | "requires_resubmission"; // สถานะ KYC
  kycSubmittedAt?: Date; // วันที่ส่งคำขอ KYC
  kycReviewedAt?: Date; // วันที่ตรวจสอบ KYC
  kycVerifiedAt?: Date; // วันที่อนุมัติ KYC
  kycRejectionReason?: string; // เหตุผลการปฏิเสธ KYC
  kycApplicationId?: Types.ObjectId; // ID ใบคำขอ KYC
  writerApplicationId?: Types.ObjectId; // ID ใบสมัครนักเขียน
}

/**
 * @interface IUserDonationSettings
 * @description การตั้งค่าเกี่ยวกับการรับบริจาคของผู้ใช้ (สำหรับนักเขียน)
 * @property {Types.ObjectId} [activeAuthorDirectDonationAppId] - ID ของ DonationApplication ที่ใช้งานอยู่ (อ้างอิง DonationApplication model)
 * @property {boolean} isEligibleForDonation - ผู้ใช้มีคุณสมบัติในการรับบริจาคหรือไม่
 */
export interface IUserDonationSettings {
  activeAuthorDirectDonationAppId?: Types.ObjectId; // ID ใบคำขอรับบริจาคที่ใช้งานอยู่
  isEligibleForDonation: boolean; // มีคุณสมบัติรับบริจาคหรือไม่
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
  lastPasswordChangeAt?: Date; // วันที่เปลี่ยนรหัสผ่านล่าสุด
  twoFactorAuthentication: { // การยืนยันตัวตนสองปัจจัย
    isEnabled: boolean; // เปิดใช้งาน 2FA หรือไม่
    method?: "otp" | "sms" | "email"; // วิธีการ 2FA
    secret?: string; // Secret Key (สำหรับ OTP)
    backupCodes?: string[]; // รหัสสำรอง
    verifiedAt?: Date; // วันที่ยืนยัน 2FA
  };
  loginAttempts: { // การพยายามล็อกอิน
    count: number; // จำนวนครั้งที่ผิดพลาด
    lastAttemptAt?: Date; // เวลาที่พยายามล่าสุด
    lockoutUntil?: Date; // ล็อกบัญชีถึงเมื่อไหร่
  };
  activeSessions: Array<{ // เซสชันที่ใช้งานอยู่
    sessionId: string; // ID เซสชัน
    ipAddress: string; // IP Address
    userAgent: string; // User Agent
    lastAccessedAt: Date; // เวลาที่เข้าถึงล่าสุด
    createdAt: Date; // เวลาที่สร้างเซสชัน
    isCurrentSession?: boolean; // เป็นเซสชันปัจจุบันหรือไม่
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
  lastAssessedAt?: Date; // วันที่ประเมินล่าสุด
  overallEmotionalTrend?: "stable" | "improving" | "showing_concern" | "needs_attention" | "unknown"; // แนวโน้มอารมณ์โดยรวม
  observedPatterns?: string[]; // รูปแบบที่สังเกตได้
  stressIndicatorScore?: number; // คะแนนบ่งชี้ความเครียด
  anxietyIndicatorScore?: number; // คะแนนบ่งชี้ความวิตกกังวล
  resilienceIndicatorScore?: number; // คะแนนบ่งชี้ความยืดหยุ่น
  consultationRecommended?: boolean; // แนะนำให้ปรึกษาผู้เชี่ยวชาญหรือไม่
  lastRecommendationDismissedAt?: Date; // วันที่ปิดคำแนะนำล่าสุด
  modelVersion?: string; // เวอร์ชันโมเดล AI
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
  novelId?: Types.ObjectId | {
    _id: string;
    slug?: string;
    coverImageUrl?: string;
    // ...other fields if needed
  };
  novelTitle: string; // ชื่อนิยาย
  totalViews: number; // ยอดเข้าชมทั้งหมด
  totalReads: number; // ยอดอ่านจบ
  totalLikes: number; // ยอดไลค์ทั้งหมด
  totalComments: number; // ยอดคอมเมนต์ทั้งหมด
  totalFollowers: number; // ผู้ติดตามนิยายนี้
  averageRating?: number; // คะแนนเฉลี่ย
  totalEarningsFromNovel?: number; // รายได้จากนิยายนี้
  totalChapters?: number; // <-- Add this line
}

/**
 * @interface IActiveNovelPromotionSummary
 * @description (ใหม่) ข้อมูลสรุปสำหรับนิยายที่กำลังจัดโปรโมชันของนักเขียน
 */
export interface IActiveNovelPromotionSummary {
  novelId: Types.ObjectId;
  novelTitle: string;
  promotionDescription?: string;
  promotionalPriceCoins?: number; // ราคาโปรโมชันปัจจุบัน
  promotionEndDate?: Date; // วันสิ้นสุดโปรโมชัน (สำคัญสำหรับการแสดงผล)
}

/**
 * @interface ITrendingNovelSummary
 * @description (ใหม่) ข้อมูลสรุปสำหรับนิยายที่กำลังเป็นที่นิยมของนักเขียน
 */
export interface ITrendingNovelSummary {
  novelId: Types.ObjectId;
  novelTitle: string;
  trendingScore?: number; // คะแนนความนิยมล่าสุด
  coverImageUrl?: string; // URL รูปปก (Denormalized เพื่อการแสดงผลที่เร็วขึ้น)
  viewsLast24h?: number; // (Optional) ยอดชมใน 24 ชม. ล่าสุด (Denormalized)
  likesLast24h?: number; // (Optional) ยอดไลค์ใน 24 ชม. ล่าสุด (Denormalized)
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
 * @property {Array<{novelId: Types.ObjectId, novelTitle: string, promotionDescription?: string, promotionalPriceCoins?: number, promotionEndDate?: Date}>} [activeNovelPromotions]
 * รายการโปรโมชันนิยายที่กำลังใช้งานอยู่ (เช่น ลดราคา, โปรโมทพิเศษ) สำหรับนิยายแต่ละเรื่อง
 * - `novelId`: ไอดีของนิยายที่กำลังมีโปรโมชัน
 * - `novelTitle`: ชื่อของนิยายที่กำลังมีโปรโมชัน (สำรองไว้เพื่อการแสดงผล)
 * - `promotionDescription`: (Optional) คำอธิบายของโปรโมชัน เช่น "ลดราคา 50%"
 * - `promotionalPriceCoins`: (Optional) ราคาพิเศษในเหรียญ Coins
 * - `promotionEndDate`: (Optional) วันที่สิ้นสุดโปรโมชัน
 * @property {Date} [writerSince] - วันที่ได้รับการอนุมัติเป็นนักเขียน (อาจย้ายมาจาก IUserVerification)
 * @property {Date} [lastNovelPublishedAt] - วันที่เผยแพร่นิยายเรื่องล่าสุด
 * @property {Date} [lastEpisodePublishedAt] - วันที่เผยแพร่ตอนล่าสุด
 * @property {string} [writerTier] - (Optional) ระดับขั้นของนักเขียน (ถ้ามีระบบ Tier)
 * @property {number} [writerRank] - (Optional) อันดับของนักเขียน (ถ้ามีระบบ Ranking)
 */
export interface IWriterStats {
  totalViewsReceived: any;
  totalNovelsPublished: number; // จำนวนนิยายที่เผยแพร่
  totalEpisodesPublished: number; // จำนวนตอนที่เผยแพร่
  totalViewsAcrossAllNovels: number; // ยอดเข้าชมรวมทุกนิยาย
  totalReadsAcrossAllNovels: number; // ยอดอ่านรวมทุกนิยาย
  totalLikesReceivedOnNovels: number; // ยอดไลค์รวมทุกนิยาย
  totalCommentsReceivedOnNovels: number; // ยอดคอมเมนต์รวมทุกนิยาย
  totalEarningsToDate: number; // รายได้รวมทั้งหมด
  totalCoinsReceived: number; // เหรียญที่ได้รับทั้งหมด
  totalRealMoneyReceived: number; // เงินจริงที่ได้รับทั้งหมด
  totalDonationsReceived: number; // จำนวนครั้งที่ได้รับบริจาค
  novelPerformanceSummaries?: Types.DocumentArray<INovelPerformanceStats>; // สรุปผลงานรายนิยาย
  writerSince?: Date; // วันที่เริ่มเป็นนักเขียน
  lastNovelPublishedAt?: Date; // วันที่เผยแพร่นิยายล่าสุด
  lastEpisodePublishedAt?: Date; // วันที่เผยแพร่ตอนล่าสุด
  writerTier?: string; // ระดับนักเขียน
  writerRank?: number; // อันดับนักเขียน
  activeNovelPromotions?: Types.DocumentArray<IActiveNovelPromotionSummary>; // **เพิ่มใหม่**
  trendingNovels?: Types.DocumentArray<ITrendingNovelSummary>; // **เพิ่มใหม่**
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
 * @property {IUserPreferences} preferences - การตั้งค่าส่วนตัวของผู้ใช้ (ซึ่งรวม analyticsConsent และ visualNovelGameplay)
 * @property {IUserWallet} wallet - ข้อมูลกระเป๋าเงินของผู้ใช้ (พร้อมสำหรับการอัปเดต Coin จาก Service)
 * @property {IUserGamification} gamification - ข้อมูลระบบ Gamification (พร้อมสำหรับการอัปเดต XP และ Achievements จาก Service)
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
 *
 * @method matchPassword - ตรวจสอบรหัสผ่านที่ป้อนเข้ามากับรหัสผ่านที่ถูกเข้ารหัสในฐานข้อมูล
 * @method generateEmailVerificationToken - สร้าง Token สำหรับยืนยันอีเมล
 * @method generatePasswordResetToken - สร้าง Token สำหรับรีเซ็ตรหัสผ่าน
 */
export interface IUser extends Document {
  [x: string]: any; // อนุญาตให้มี property อื่นๆ (ควรระมัดระวังการใช้)
  _id: Types.ObjectId; // ID ของผู้ใช้
  username?: string; // ชื่อผู้ใช้ (อาจไม่มีถ้ามาจาก OAuth บางประเภทในช่วงแรก)
  email?: string; // อีเมล (อาจไม่มีถ้ามาจาก OAuth บางประเภทในช่วงแรก)
  password?: string; // รหัสผ่าน (Hashed)
  accounts: Types.DocumentArray<IAccount>; // บัญชีที่เชื่อมโยง
  roles: Array<"Reader" | "Writer" | "Admin" | "Moderator" | "Editor">; // บทบาทผู้ใช้
  profile: IUserProfile; // ข้อมูลโปรไฟล์
  writerStats?: IWriterStats; // สถิตินักเขียน (ถ้าเป็นนักเขียน)
  trackingStats: IUserTrackingStats; // สถิติการใช้งาน
  socialStats: IUserSocialStats; // สถิติทางสังคม
  preferences: IUserPreferences; // การตั้งค่าส่วนตัว (รวม visualNovelGameplay)
  wallet: IUserWallet; // กระเป๋าเงิน
  gamification: IUserGamification; // ระบบ Gamification
  verifiedBadges?: string[]; // ป้ายยืนยัน
  verification?: IUserVerification; // การยืนยันตัวตน
  donationSettings?: IUserDonationSettings; // การตั้งค่าการรับบริจาค
  securitySettings?: IUserSecuritySettings; // การตั้งค่าความปลอดภัย
  mentalWellbeingInsights?: IMentalWellbeingInsights; // ข้อมูลเชิงลึกสุขภาพจิต
  isEmailVerified: boolean; // ยืนยันอีเมลแล้วหรือยัง
  emailVerifiedAt?: Date; // วันที่ยืนยันอีเมล
  emailVerificationToken?: string; // Token ยืนยันอีเมล
  emailVerificationTokenExpiry?: Date; // วันหมดอายุ Token ยืนยันอีเมล
  passwordResetToken?: string; // Token รีเซ็ตรหัสผ่าน
  passwordResetTokenExpiry?: Date; // วันหมดอายุ Token รีเซ็ตรหัสผ่าน
  lastLoginAt?: Date; // วันที่ล็อกอินล่าสุด
  lastIpAddress?: string; // IP ล่าสุดที่ล็อกอิน
  isActive: boolean; // บัญชีใช้งานได้หรือไม่
  isBanned: boolean; // ถูกแบนหรือไม่
  banReason?: string; // เหตุผลการแบน
  bannedUntil?: Date; // แบนถึงเมื่อไหร่
  isDeleted: boolean; // ลบบัญชีแล้วหรือยัง (Soft Delete)
  deletedAt?: Date; // วันที่ลบบัญชี

  createdAt: Date; // วันที่สร้างบัญชี (Mongoose Timestamps)
  updatedAt: Date; // วันที่อัปเดตบัญชีล่าสุด (Mongoose Timestamps)

  // Methods
  matchPassword(enteredPassword: string): Promise<boolean>; // เมธอดตรวจสอบรหัสผ่าน
  generateEmailVerificationToken(): string; // เมธอดสร้าง Token ยืนยันอีเมล
  generatePasswordResetToken(): string; // เมธอดสร้าง Token รีเซ็ตรหัสผ่าน
}

// ==================================================================================================
// SECTION: Schema ย่อย (Sub-Schemas) สำหรับ Mongoose
// (คัดลอก Schema ย่อยจากด้านบนมาวางที่นี่ เพื่อให้โค้ดสมบูรณ์ในไฟล์เดียว)
// ==================================================================================================

const NovelPerformanceStatsSchema = new Schema<INovelPerformanceStats>(
  {
    novelId: { type: Schema.Types.ObjectId, ref: "Novel", required: true, comment: "ID ของนิยาย" },
    novelTitle: { type: String, required: true, trim: true, maxlength: 255, comment: "ชื่อนิยาย (Denormalized)" },
    totalViews: { type: Number, default: 0, min: 0, comment: "ยอดเข้าชมทั้งหมด" },
    totalReads: { type: Number, default: 0, min: 0, comment: "ยอดอ่านจบ" }, // ควรตรงกับ uniqueViewersCount ใน Novel.stats
    totalLikes: { type: Number, default: 0, min: 0, comment: "ยอดไลค์ทั้งหมด" },
    totalComments: { type: Number, default: 0, min: 0, comment: "ยอดคอมเมนต์ทั้งหมด" },
    totalFollowers: { type: Number, default: 0, min: 0, comment: "ผู้ติดตามนิยายนี้" },
    averageRating: { type: Number, min: 0, max: 5, comment: "คะแนนเฉลี่ย" },
    totalEarningsFromNovel: { type: Number, default: 0, min: 0, comment: "รายได้จากนิยายนี้" },
    totalChapters: { type: Number, min: 0, max: 100, comment: "จำนวนตอนที่อ่านทั้งหมด" },
  },
  { _id: false }
);

/**
 * @Schema IActiveNovelPromotionSummarySchema
 * @description (ใหม่) Schema สำหรับข้อมูลสรุปนิยายที่กำลังจัดโปรโมชัน
 */
const ActiveNovelPromotionSummarySchema = new Schema<IActiveNovelPromotionSummary>(
    {
        novelId: { type: Schema.Types.ObjectId, ref: "Novel", required: true },
        novelTitle: { type: String, required: true, trim: true, maxlength: 255 },
        promotionDescription: { type: String, trim: true, maxlength: 250 },
        promotionalPriceCoins: { type: Number, min: 0 },
        promotionEndDate: { type: Date },
    },
    { _id: false }
);

/**
 * @Schema ITrendingNovelSummarySchema
 * @description (ใหม่) Schema สำหรับข้อมูลสรุปนิยายที่กำลังเป็นที่นิยม
 */
const TrendingNovelSummarySchema = new Schema<ITrendingNovelSummary>(
    {
        novelId: { type: Schema.Types.ObjectId, ref: "Novel", required: true },
        novelTitle: { type: String, required: true, trim: true, maxlength: 255 },
        trendingScore: { type: Number, default: 0 },
        coverImageUrl: { type: String, trim: true, maxlength: 2048 },
        viewsLast24h: { type: Number, default: 0 },
        likesLast24h: { type: Number, default: 0 },
    },
    { _id: false }
);

const WriterStatsSchema = new Schema<IWriterStats>(
  {
    totalNovelsPublished: { type: Number, default: 0, min: 0, comment: "จำนวนนิยายที่เผยแพร่" },
    totalEpisodesPublished: { type: Number, default: 0, min: 0, comment: "จำนวนตอนที่เผยแพร่" },
    totalViewsAcrossAllNovels: { type: Number, default: 0, min: 0, comment: "ยอดเข้าชมรวมทุกนิยาย" },
    totalReadsAcrossAllNovels: { type: Number, default: 0, min: 0, comment: "ยอดอ่านรวมทุกนิยาย" },
    totalLikesReceivedOnNovels: { type: Number, default: 0, min: 0, comment: "ยอดไลค์รวมทุกนิยาย" },
    totalCommentsReceivedOnNovels: { type: Number, default: 0, min: 0, comment: "ยอดคอมเมนต์รวมทุกนิยาย" },
    totalEarningsToDate: { type: Number, default: 0, min: 0, comment: "รายได้รวมทั้งหมด (สกุลเงินหลักของระบบ)" },
    totalCoinsReceived: { type: Number, default: 0, min: 0, comment: "เหรียญที่ได้รับทั้งหมด" },
    totalRealMoneyReceived: { type: Number, default: 0, min: 0, comment: "เงินจริงที่ได้รับทั้งหมด (สกุลเงินหลักของระบบ)" },
    totalDonationsReceived: { type: Number, default: 0, min: 0, comment: "จำนวนครั้งที่ได้รับบริจาค" },
    novelPerformanceSummaries: { type: [NovelPerformanceStatsSchema], default: [], comment: "สรุปผลงานรายนิยาย" },
    writerSince: { type: Date, comment: "วันที่เริ่มเป็นนักเขียน" },
    lastNovelPublishedAt: { type: Date, comment: "วันที่เผยแพร่นิยายล่าสุด" },
    lastEpisodePublishedAt: { type: Date, comment: "วันที่เผยแพร่ตอนล่าสุด" },
    writerTier: { type: String, trim: true, maxlength: 50, comment: "ระดับนักเขียน" },
    writerRank: { type: Number, min: 0, comment: "อันดับนักเขียน" },
    activeNovelPromotions: { // **เพิ่มใหม่**
        type: [ActiveNovelPromotionSummarySchema],
        default: [],
        comment: "รายการสรุปโปรโมชันนิยายที่กำลังใช้งานอยู่ของนักเขียน (Denormalized, สำหรับ Writer Dashboard)"
    },
    trendingNovels: { // **เพิ่มใหม่**
        type: [TrendingNovelSummarySchema],
        default: [],
        comment: "รายการสรุปนิยายที่กำลังเป็นที่นิยมของนักเขียน (Denormalized, สำหรับ Writer Dashboard, จำกัดจำนวน เช่น Top 5)"
    },
  },
  { _id: false }
);


const UserReadingDisplayPreferencesSchema = new Schema<IUserReadingDisplayPreferences>(
  {
    fontFamily: { type: String, trim: true, maxlength: 100, comment: "ชื่อฟอนต์ที่ใช้" },
    fontSize: { type: Schema.Types.Mixed, required: [true, "กรุณาระบุขนาดตัวอักษร"], default: "medium", comment: "ขนาดตัวอักษร (small, medium, large, หรือ number)" },
    lineHeight: { type: Number, min: 1, max: 3, default: 1.6, comment: "ระยะห่างบรรทัด" },
    textAlignment: { type: String, enum: ["left", "justify"], default: "left", comment: "การจัดวางข้อความ" },
    readingModeLayout: { type: String, enum: ["paginated", "scrolling"], required: [true, "กรุณาระบุรูปแบบการอ่าน"], default: "scrolling", comment: "รูปแบบการแสดงผลหน้าอ่าน" },
  },
  { _id: false }
);

const UserAccessibilityDisplayPreferencesSchema = new Schema<IUserAccessibilityDisplayPreferences>(
  {
    dyslexiaFriendlyFont: { type: Boolean, default: false, comment: "ใช้ฟอนต์สำหรับผู้มีภาวะดิสเล็กเซีย" },
    highContrastMode: { type: Boolean, default: false, comment: "โหมดความคมชัดสูง" },
  },
  { _id: false }
);

const UserDisplayPreferencesSchema = new Schema<IUserDisplayPreferences>(
  {
    theme: { type: String, enum: ["light", "dark", "system", "sepia"], required: [true, "กรุณาระบุธีม"], default: "system", comment: "ธีมที่ใช้ (สว่าง, มืด, ตามระบบ, ซีเปีย)" },
    reading: { type: UserReadingDisplayPreferencesSchema, default: () => ({ fontSize: "medium", readingModeLayout: "scrolling", lineHeight: 1.6, textAlignment: "left" }), comment: "การตั้งค่าการแสดงผลการอ่าน" },
    accessibility: { type: UserAccessibilityDisplayPreferencesSchema, default: () => ({ dyslexiaFriendlyFont: false, highContrastMode: false }), comment: "การตั้งค่าการเข้าถึง" },
  },
  { _id: false }
);

const NotificationChannelSettingsSchema = new Schema<INotificationChannelSettings>(
  {
    enabled: { type: Boolean, default: true, comment: "เปิดใช้งานการแจ้งเตือนช่องทางนี้" },
    newsletter: { type: Boolean, default: true, comment: "รับจดหมายข่าว (เฉพาะอีเมล)" },
    novelUpdatesFromFollowing: { type: Boolean, default: true, comment: "การอัปเดตจากนิยายที่ติดตาม" },
    newFollowers: { type: Boolean, default: true, comment: "ผู้ติดตามใหม่" },
    commentsOnMyNovels: { type: Boolean, default: true, comment: "ความคิดเห็นบนนิยายของเรา" },
    repliesToMyComments: { type: Boolean, default: true, comment: "การตอบกลับความคิดเห็นของเรา" },
    donationAlerts: { type: Boolean, default: true, comment: "การแจ้งเตือนการบริจาค" },
    systemAnnouncements: { type: Boolean, default: true, comment: "ประกาศจากระบบ" },
    securityAlerts: { type: Boolean, default: true, comment: "การแจ้งเตือนความปลอดภัย" },
    promotionalOffers: { type: Boolean, default: false, comment: "ข้อเสนอโปรโมชั่น" },
    achievementUnlocks: { type: Boolean, default: true, comment: "การปลดล็อกความสำเร็จ" },
  },
  { _id: false }
);

const UserPreferencesNotificationsSchema = new Schema<IUserPreferencesNotifications>(
  {
    masterNotificationsEnabled: { type: Boolean, default: true, comment: "เปิด/ปิดการแจ้งเตือนทั้งหมด" },
    email: { type: NotificationChannelSettingsSchema, default: () => ({}), comment: "การตั้งค่าสำหรับอีเมล" },
    push: { type: NotificationChannelSettingsSchema, default: () => ({}), comment: "การตั้งค่าสำหรับ Push Notification" },
    inApp: { type: NotificationChannelSettingsSchema, default: () => ({}), comment: "การตั้งค่าสำหรับ In-app Notification" },
  },
  { _id: false }
);

const UserAnalyticsConsentSchema = new Schema<IUserAnalyticsConsent>(
  {
    allowPsychologicalAnalysis: { type: Boolean, default: false, required: [true, "กรุณาระบุความยินยอมในการวิเคราะห์ทางจิตวิทยา"], comment: "อนุญาตการวิเคราะห์ทางจิตวิทยา" },
    allowPersonalizedFeedback: { type: Boolean, default: false, comment: "อนุญาตการให้ผลตอบรับส่วนบุคคล" },
    lastConsentReviewDate: { type: Date, comment: "วันที่ตรวจสอบความยินยอมล่าสุด" },
  },
  { _id: false }
);

const VisualNovelGameplayPreferencesSchema = new Schema<IVisualNovelGameplayPreferences>(
  {
    textSpeed: { type: String, enum: ["slow", "normal", "fast", "instant"], default: "normal", comment: "ความเร็วในการแสดงข้อความ" },
    autoPlayMode: { type: String, enum: ["click", "auto_text", "auto_voice"], default: "click", comment: "โหมดการเล่นอัตโนมัติ" },
    autoPlayDelayMs: { type: Number, min:0, default: 1500, comment: "ความหน่วงเวลาก่อนเล่นอัตโนมัติ (ms)" },
    skipUnreadText: { type: Boolean, default: false, comment: "อนุญาตให้ข้ามข้อความที่ยังไม่อ่านหรือไม่" },
    transitionsEnabled: { type: Boolean, default: true, comment: "เปิด/ปิดเอฟเฟกต์การเปลี่ยนฉาก" },
    screenEffectsEnabled: { type: Boolean, default: true, comment: "เปิด/ปิดเอฟเฟกต์หน้าจอ (เช่น สั่น, เบลอ)" },
    textWindowOpacity: { type: Number, min: 0, max: 1, default: 0.8, comment: "ความโปร่งใสของหน้าต่างข้อความ" },
    masterVolume: { type: Number, min: 0, max: 1, default: 1.0, comment: "ระดับเสียงหลัก" },
    bgmVolume: { type: Number, min: 0, max: 1, default: 0.7, comment: "ระดับเสียงเพลงประกอบ" },
    sfxVolume: { type: Number, min: 0, max: 1, default: 0.8, comment: "ระดับเสียงเอฟเฟกต์" },
    voiceVolume: { type: Number, min: 0, max: 1, default: 1.0, comment: "ระดับเสียงพากย์" },
    voicesEnabled: { type: Boolean, default: true, comment: "เปิด/ปิดเสียงพากย์ตัวละคร" },
    preferredVoiceLanguage: { type: String, trim: true, default: "original", comment: "ภาษาเสียงพากย์ที่ต้องการ (เช่น ja, en)" },
    showChoiceTimer: { type: Boolean, default: true, comment: "แสดงตัวจับเวลาสำหรับตัวเลือกที่มีเวลาจำกัด" },
    blurThumbnailsOfMatureContent: { type: Boolean, default: true, comment: "เบลอภาพตัวอย่างเนื้อหาผู้ใหญ่" },
    preferredArtStyles: [{ type: Schema.Types.ObjectId, ref: "Category", comment: "สไตล์ภาพที่ชื่นชอบ (อ้างอิง Category Type: ART_STYLE)" }],
    preferredGameplayMechanics: [{ type: Schema.Types.ObjectId, ref: "Category", comment: "กลไกการเล่นที่ชื่นชอบ (อ้างอิง Category Type: GAMEPLAY_MECHANIC)" }],
    assetPreloading: { type: String, enum: ["none", "essential", "full", "wifi_only"], default: "essential", comment: "การตั้งค่าการโหลดทรัพยากรล่วงหน้า" },
    characterAnimationLevel: { type: String, enum: ["none", "simple", "full"], default: "full", comment: "ระดับการแสดงอนิเมชันตัวละคร" },
  },
  { _id: false }
);

const UserContentPrivacyPreferencesSchema = new Schema<IUserContentPrivacyPreferences>(
  {
    showMatureContent: { type: Boolean, default: false, comment: "แสดงเนื้อหาสำหรับผู้ใหญ่" },
    preferredGenres: [{ type: Schema.Types.ObjectId, ref: "Category", comment: "หมวดหมู่นิยายที่ชื่นชอบ" }],
    blockedGenres: [{ type: Schema.Types.ObjectId, ref: "Category", comment: "หมวดหมู่นิยายที่บล็อก" }],
    blockedTags: [{ type: String, trim: true, lowercase: true, maxlength: 100, comment: "แท็กที่บล็อก" }],
    blockedAuthors: [{ type: Schema.Types.ObjectId, ref: "User", comment: "ผู้เขียนที่บล็อก" }],
    blockedNovels: [{ type: Schema.Types.ObjectId, ref: "Novel", comment: "นิยายที่บล็อก" }],
    profileVisibility: { type: String, enum: ["public", "followers_only", "private"], default: "public", comment: "การมองเห็นโปรไฟล์" },
    readingHistoryVisibility: { type: String, enum: ["public", "followers_only", "private"], default: "followers_only", comment: "การมองเห็นประวัติการอ่าน" },
    showActivityStatus: { type: Boolean, default: true, comment: "แสดงสถานะกิจกรรม" },
    allowDirectMessagesFrom: { type: String, enum: ["everyone", "followers", "no_one"], default: "followers", comment: "อนุญาตข้อความส่วนตัวจาก" },
    analyticsConsent: { type: UserAnalyticsConsentSchema, default: () => ({ allowPsychologicalAnalysis: false, allowPersonalizedFeedback: false }), required: [true, "การตั้งค่าความยินยอมในการวิเคราะห์ข้อมูลเป็นสิ่งจำเป็น"], comment: "การยินยอมในการวิเคราะห์ข้อมูล" },
  },
  { _id: false }
);

const UserPreferencesSchema = new Schema<IUserPreferences>(
  {
    language: { type: String, default: "th", enum: ["th", "en", "ja", "ko", "zh"], required: [true, "กรุณาระบุภาษา"], comment: "ภาษาที่ใช้ใน UI" },
    display: { type: UserDisplayPreferencesSchema, default: () => ({ theme: "system", reading: { fontSize: "medium", readingModeLayout: "scrolling", lineHeight: 1.6, textAlignment: "left" }, accessibility: { dyslexiaFriendlyFont: false, highContrastMode: false } }), comment: "การตั้งค่าการแสดงผล" },
    notifications: { type: UserPreferencesNotificationsSchema, default: () => ({}) },
    contentAndPrivacy: { type: UserContentPrivacyPreferencesSchema, default: () => ({ showMatureContent: false, preferredGenres: [], profileVisibility: "public", readingHistoryVisibility: "followers_only", showActivityStatus: true, allowDirectMessagesFrom: "followers", analyticsConsent: { allowPsychologicalAnalysis: false } }) , comment: "การตั้งค่าเนื้อหาและความเป็นส่วนตัว"},
    visualNovelGameplay: { type: VisualNovelGameplayPreferencesSchema, default: () => ({ textSpeed: "normal", autoPlayMode: "click", transitionsEnabled: true, screenEffectsEnabled: true, textWindowOpacity: 0.8, masterVolume: 1.0, bgmVolume: 0.7, sfxVolume: 0.8, voiceVolume: 1.0, voicesEnabled: true, showChoiceTimer: true, blurThumbnailsOfMatureContent: true, assetPreloading: "essential", characterAnimationLevel: "full" }), comment: "การตั้งค่าเฉพาะสำหรับ Visual Novel" },
  },
  { _id: false }
);

const AccountSchema = new Schema<IAccount>(
  {
    provider: { type: String, required: [true, "กรุณาระบุ Provider"], trim: true, index: true, comment: "ชื่อผู้ให้บริการ (เช่น google, credentials)" },
    providerAccountId: { type: String, required: [true, "กรุณาระบุ Provider Account ID"], trim: true, index: true, comment: "ID บัญชีจากผู้ให้บริการ" },
    type: { type: String, enum: ["oauth", "credentials"], required: [true, "กรุณาระบุประเภทบัญชี"], comment: "ประเภทบัญชี (oauth หรือ credentials)" },
    accessToken: { type: String, select: false, comment: "Access Token (สำหรับ OAuth)" },
    refreshToken: { type: String, select: false, comment: "Refresh Token (สำหรับ OAuth)" },
    expiresAt: { type: Number, comment: "เวลาหมดอายุของ Token (timestamp)" },
    tokenType: { type: String, select: false, comment: "ประเภท Token (เช่น Bearer)" },
    scope: { type: String, comment: "ขอบเขตการเข้าถึง (OAuth)" },
    idToken: { type: String, select: false, comment: "ID Token (สำหรับ OpenID)" },
    sessionState: { type: String, select: false, comment: "สถานะ Session (OpenID)" },
    providerData: { type: Schema.Types.Mixed, select: false, comment: "ข้อมูลเพิ่มเติมจาก Provider" },
  },
  { _id: false }
);

const UserProfileSchema = new Schema<IUserProfile>(
  {
    displayName: { type: String, trim: true, minlength: [1, "ชื่อที่แสดงต้องมีอย่างน้อย 1 ตัวอักษร"], maxlength: [100, "ชื่อที่แสดงต้องไม่เกิน 100 ตัวอักษร"], comment: "ชื่อที่แสดงทั่วไป" },
    penName: { type: String, trim: true, unique: true, sparse: true, minlength: [2, "นามปากกาต้องมีอย่างน้อย 2 ตัวอักษร"], maxlength: [50, "นามปากกาต้องไม่เกิน 50 ตัวอักษร"], validate: { validator: function (v: string) { return v === null || v === undefined || v === '' || /^[ก-๙a-zA-Z0-9\s\-_.'()&]+$/.test(v); }, message: "นามปากกาต้องประกอบด้วยอักขระที่อนุญาตเท่านั้น" }, comment: "นามปากกา (สำหรับนักเขียน)" },
    avatarUrl: { type: String, trim: true, maxlength: [2048, "URL รูปโปรไฟล์ยาวเกินไป"], validate: { validator: (v: string) => !v || /^https?:\/\/|^\//.test(v) || /^data:image\/(png|jpeg|gif|webp);base64,/.test(v), message: "รูปแบบ URL รูปโปรไฟล์ไม่ถูกต้อง" }, comment: "URL รูปโปรไฟล์" },
    coverImageUrl: { type: String, trim: true, maxlength: [2048, "URL รูปปกยาวเกินไป"], validate: { validator: (v: string) => !v || /^https?:\/\/|^\//.test(v) || /^data:image\/(png|jpeg|gif|webp);base64,/.test(v), message: "รูปแบบ URL รูปปกไม่ถูกต้อง" }, comment: "URL รูปปกโปรไฟล์" },
    bio: { type: String, trim: true, maxlength: [500, "คำอธิบายตัวตนต้องไม่เกิน 500 ตัวอักษร"], comment: "คำอธิบายตัวตน" },
    gender: { type: String, enum: ["male", "female", "lgbtq+", "other", "prefer_not_to_say"], comment: "เพศ" },
    dateOfBirth: { type: Date, comment: "วันเกิด" },
    country: { type: String, trim: true, uppercase: true, match: [/^[A-Z]{2}$/, "รหัสประเทศต้องเป็น ISO 3166-1 alpha-2"], comment: "ประเทศ (ISO 3166-1 alpha-2)" },
    timezone: { type: String, trim: true, maxlength: 100, comment: "เขตเวลา" },
    location: { type: String, trim: true, maxlength: [200, "ที่อยู่ต้องไม่เกิน 200 ตัวอักษร"], comment: "ที่อยู่/เมือง" },
    websiteUrl: { type: String, trim: true, maxlength: [2048, "URL เว็บไซต์ยาวเกินไป"], validate: { validator: (v: string) => !v || /^https?:\/\//.test(v), message: "รูปแบบ URL เว็บไซต์ไม่ถูกต้อง" }, comment: "URL เว็บไซต์ส่วนตัว" },
  },
  { _id: false }
);

const UserTrackingStatsSchema = new Schema<IUserTrackingStats>(
  {
    totalLoginDays: { type: Number, default: 0, min: 0, comment: "จำนวนวันล็อกอินทั้งหมด" },
    totalNovelsRead: { type: Number, default: 0, min: 0, comment: "จำนวนนิยายที่อ่านจบ" },
    totalEpisodesRead: { type: Number, default: 0, min: 0, comment: "จำนวนตอนที่อ่านทั้งหมด" },
    totalTimeSpentReadingSeconds: { type: Number, default: 0, min: 0, comment: "เวลารวมที่ใช้อ่าน (วินาที)" },
    totalCoinSpent: { type: Number, default: 0, min: 0, comment: "เหรียญทั้งหมดที่ใช้จ่าย" },
    totalRealMoneySpent: { type: Number, default: 0, min: 0, comment: "เงินจริงทั้งหมดที่ใช้จ่าย" },
    lastNovelReadId: { type: Schema.Types.ObjectId, ref: "Novel", comment: "ID นิยายที่อ่านล่าสุด" },
    lastNovelReadAt: { type: Date, comment: "วันที่อ่านนิยายล่าสุด" },
    joinDate: { type: Date, default: Date.now, required: true, comment: "วันที่สมัครสมาชิก" },
    firstLoginAt: { type: Date, comment: "วันที่ล็อกอินครั้งแรก" },
  },
  { _id: false }
);

const UserSocialStatsSchema = new Schema<IUserSocialStats>(
  {
    followersCount: { type: Number, default: 0, min: 0, comment: "จำนวนผู้ติดตาม" },
    followingCount: { type: Number, default: 0, min: 0, comment: "จำนวนที่กำลังติดตาม" },
    novelsCreatedCount: { type: Number, default: 0, min: 0, comment: "จำนวนนิยายที่สร้าง" },
    commentsMadeCount: { type: Number, default: 0, min: 0, comment: "จำนวนความคิดเห็นที่สร้าง" },
    ratingsGivenCount: { type: Number, default: 0, min: 0, comment: "จำนวนการให้คะแนน" },
    likesGivenCount: { type: Number, default: 0, min: 0, comment: "จำนวนการกดถูกใจ" },
  },
  { _id: false }
);

const UserWalletSchema = new Schema<IUserWallet>(
  {
    coinBalance: { type: Number, default: 0, min: 0, required: true, comment: "ยอดเหรียญคงเหลือ, พร้อมให้ Service อัปเดต" },
    lastCoinTransactionAt: { type: Date, comment: "วันที่ทำธุรกรรมเหรียญล่าสุด" },
  },
  { _id: false }
);

// << ใหม่: Schema สำหรับ IShowcasedGamificationItem (ใช้ใน IUserGamification.showcasedItems)
const ShowcasedGamificationItemSchema = new Schema<IShowcasedGamificationItem>(
    {
        earnedItemId: { type: Schema.Types.ObjectId, required: true, comment: "ID ของ UserEarnedItem (จาก UserAchievement.earnedItems)" },
        itemType: { type: String, enum: ["Achievement", "Badge"], required: true, comment: "ประเภทของ item (Achievement หรือ Badge)"},
    },
    { _id: false }
);

// << ใหม่: Schema สำหรับ IUserDisplayBadge (ใช้ใน IUserGamification.primaryDisplayBadge และ secondaryDisplayBadges)
const UserDisplayBadgeSchema = new Schema<IUserDisplayBadge>(
    {
        earnedBadgeId: { type: Schema.Types.ObjectId, required: true, comment: "ID ของ UserEarnedItem ที่เป็น Badge (จาก UserAchievement.earnedItems)" },
        displayContext: { type: String, trim: true, maxlength: 100, comment: "(Optional) บริบทที่จะแสดง Badge นี้" },
    },
    { _id: false }
);

// Schema ระบบ Gamification
const UserGamificationSchema = new Schema<IUserGamification>(
  {
    level: { type: Number, default: 1, min: 1, required: true, comment: "ระดับผู้ใช้" },
    currentLevelObject: { type: Schema.Types.ObjectId, ref: "Level", default: null, comment: "อ้างอิง Level ปัจจุบันของผู้ใช้" }, // << ใหม่
    experiencePoints: { type: Number, default: 0, min: 0, required: true, comment: "คะแนนประสบการณ์, พร้อมให้ Service อัปเดต" },
    totalExperiencePointsEverEarned: { type: Number, default: 0, min: 0, comment: "คะแนนประสบการณ์ทั้งหมดที่เคยได้รับ" }, // << ใหม่
    nextLevelXPThreshold: { type: Number, default: 100, min: 0, required: true, comment: "XP ที่ต้องการสำหรับเลเวลถัดไป" },
    achievements: [{ type: Schema.Types.ObjectId, ref: "UserAchievement.earnedItems", comment: "ID ของ UserEarnedItem ที่เป็น Achievement (ใน UserAchievement document)" }],
    showcasedItems: { type: [ShowcasedGamificationItemSchema], default: [], comment: "รายการ Achievements/Badges ที่เลือกแสดงบนโปรไฟล์" }, // << ใหม่
    primaryDisplayBadge: { type: UserDisplayBadgeSchema, default: undefined, comment: "Badge หลักที่เลือกแสดง" }, // << ใหม่
    secondaryDisplayBadges: { // << ใหม่
        type: [UserDisplayBadgeSchema],
        default: [],
        validate: [
            (val: IUserDisplayBadge[]) => val.length <= 2,
            "สามารถเลือก Badge รองได้สูงสุด 2 อัน"
        ],
        comment: "Badge รองที่เลือกแสดง (สูงสุด 2 อัน)",
    },
    loginStreaks: {
      currentStreakDays: { type: Number, default: 0, min: 0, comment: "วันที่ล็อกอินต่อเนื่องปัจจุบัน" },
      longestStreakDays: { type: Number, default: 0, min: 0, comment: "วันที่ล็อกอินต่อเนื่องนานที่สุด" },
      lastLoginDate: { type: Date, comment: "วันที่ล็อกอินล่าสุดที่นับสตรีค" },
      _id: false,
    },
    dailyCheckIn: {
      lastCheckInDate: { type: Date, comment: "วันที่เช็คอินล่าสุด" },
      currentStreakDays: { type: Number, default: 0, min: 0, comment: "วันที่เช็คอินต่อเนื่องปัจจุบัน" },
      _id: false,
    },
    lastActivityAt: { type: Date, comment: "เวลาที่มีกิจกรรมล่าสุด (สำหรับ Gamification)"}
  },
  { _id: false }
);

const UserVerificationSchema = new Schema<IUserVerification>(
  {
    kycStatus: { type: String, enum: ["none", "pending", "verified", "rejected", "requires_resubmission"], default: "none", index: true, comment: "สถานะ KYC" },
    kycSubmittedAt: { type: Date, comment: "วันที่ส่งคำขอ KYC" },
    kycReviewedAt: { type: Date, comment: "วันที่ตรวจสอบ KYC" },
    kycVerifiedAt: { type: Date, comment: "วันที่อนุมัติ KYC" },
    kycRejectionReason: { type: String, trim: true, maxlength: 1000, comment: "เหตุผลการปฏิเสธ KYC" },
    kycApplicationId: { type: Schema.Types.ObjectId, comment: "ID ใบคำขอ KYC" },
    writerApplicationId: { type: Schema.Types.ObjectId, ref: "WriterApplication", comment: "ID ของใบสมัครนักเขียนล่าสุดหรือที่เกี่ยวข้อง" },
  },
  { _id: false }
);

const UserDonationSettingsSchema = new Schema<IUserDonationSettings>(
  {
    activeAuthorDirectDonationAppId: { type: Schema.Types.ObjectId, ref: "DonationApplication", comment: "ID ใบคำขอรับบริจาคที่ใช้งานอยู่" },
    isEligibleForDonation: { type: Boolean, default: false, required: true, comment: "มีคุณสมบัติรับบริจาคหรือไม่" },
  },
  { _id: false }
);

const UserSecuritySettingsSchema = new Schema<IUserSecuritySettings>(
  {
    lastPasswordChangeAt: { type: Date, comment: "วันที่เปลี่ยนรหัสผ่านล่าสุด" },
    twoFactorAuthentication: {
      isEnabled: { type: Boolean, default: false, comment: "เปิดใช้งาน 2FA หรือไม่" },
      method: { type: String, enum: ["otp", "sms", "email"], comment: "วิธีการ 2FA" },
      secret: { type: String, select: false, comment: "Secret Key (สำหรับ OTP)" },
      backupCodes: { type: [String], select: false, comment: "รหัสสำรอง" },
      verifiedAt: { type: Date, comment: "วันที่ยืนยัน 2FA" },
      _id: false,
    },
    loginAttempts: {
      count: { type: Number, default: 0, min: 0, comment: "จำนวนครั้งที่ผิดพลาด" },
      lastAttemptAt: { type: Date, comment: "เวลาที่พยายามล่าสุด" },
      lockoutUntil: { type: Date, comment: "ล็อกบัญชีถึงเมื่อไหร่" },
      _id: false,
    },
    activeSessions: [
      {
        sessionId: { type: String, required: true, comment: "ID เซสชัน" },
        ipAddress: { type: String, required: true, select: false, comment: "IP Address" },
        userAgent: { type: String, required: true, select: false, comment: "User Agent" },
        lastAccessedAt: { type: Date, required: true, comment: "เวลาที่เข้าถึงล่าสุด" },
        createdAt: { type: Date, required: true, default: Date.now, comment: "เวลาที่สร้างเซสชัน" },
        isCurrentSession: { type: Boolean, comment: "เป็นเซสชันปัจจุบันหรือไม่" },
        _id: false,
      },
    ],
  },
  { _id: false }
);

const MentalWellbeingInsightsSchema = new Schema<IMentalWellbeingInsights>(
  {
    lastAssessedAt: { type: Date, comment: "วันที่ประเมินล่าสุด" },
    overallEmotionalTrend: { type: String, enum: ["stable", "improving", "showing_concern", "needs_attention", "unknown"], default: "unknown", comment: "แนวโน้มอารมณ์โดยรวม" },
    observedPatterns: [{ type: String, trim: true, maxlength: 200, comment: "รูปแบบที่สังเกตได้" }],
    stressIndicatorScore: { type: Number, min: 0, max: 1, comment: "คะแนนบ่งชี้ความเครียด" },
    anxietyIndicatorScore: { type: Number, min: 0, max: 1, comment: "คะแนนบ่งชี้ความวิตกกังวล" },
    resilienceIndicatorScore: { type: Number, min: 0, max: 1, comment: "คะแนนบ่งชี้ความยืดหยุ่น" },
    consultationRecommended: { type: Boolean, default: false, comment: "แนะนำให้ปรึกษาผู้เชี่ยวชาญหรือไม่" },
    lastRecommendationDismissedAt: { type: Date, comment: "วันที่ปิดคำแนะนำล่าสุด" },
    modelVersion: { type: String, trim: true, maxlength: 50, comment: "เวอร์ชันโมเดล AI" },
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
      match: [/^(?=.{3,50}$)(?![_.])(?!.*[_.]{2})[a-zA-Z0-9._]+(?<![_.])$/, "ชื่อผู้ใช้สามารถมีได้เฉพาะตัวอักษรภาษาอังกฤษ, ตัวเลข, จุด (.), และขีดล่าง (_) เท่านั้น และต้องไม่ขึ้นต้นหรือลงท้ายด้วยจุดหรือขีดล่าง และห้ามมีจุดหรือขีดล่างติดกัน"],
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
        validator: function(v: IAccount[]) { return v && v.length > 0; },
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
    profile: {
        type: UserProfileSchema,
        default: () => ({}),
        comment: "ข้อมูลโปรไฟล์สาธารณะ",
    },
    writerStats: {
        type: WriterStatsSchema,
        default: undefined,
        comment: "สถิติสำหรับนักเขียน (ถ้ามีบทบาท Writer)",
    },
    trackingStats: {
        type: UserTrackingStatsSchema,
        default: () => ({ joinDate: new Date(), totalLoginDays: 0, totalNovelsRead: 0, totalEpisodesRead: 0, totalTimeSpentReadingSeconds: 0, totalCoinSpent: 0, totalRealMoneySpent: 0 }),
        comment: "สถิติการใช้งานแพลตฟอร์ม",
    },
    socialStats: {
        type: UserSocialStatsSchema,
        default: () => ({ followersCount: 0, followingCount: 0, novelsCreatedCount: 0, commentsMadeCount: 0, ratingsGivenCount: 0, likesGivenCount: 0 }),
        comment: "สถิติทางสังคม",
    },
    preferences: {
      type: UserPreferencesSchema,
      default: () => ({
        language: "th",
        display: { theme: "system", reading: { fontSize: "medium", readingModeLayout: "scrolling", lineHeight: 1.6, textAlignment: "left" }, accessibility: { dyslexiaFriendlyFont: false, highContrastMode: false } },
        notifications: { masterNotificationsEnabled: true, email: {}, push: {}, inApp: {} },
        contentAndPrivacy: { showMatureContent: false, preferredGenres: [], profileVisibility: "public", readingHistoryVisibility: "followers_only", showActivityStatus: true, allowDirectMessagesFrom: "followers", analyticsConsent: { allowPsychologicalAnalysis: false } },
        visualNovelGameplay: { textSpeed: "normal", autoPlayMode: "click", transitionsEnabled: true, screenEffectsEnabled: true, textWindowOpacity: 0.8, masterVolume: 1.0, bgmVolume: 0.7, sfxVolume: 0.8, voiceVolume: 1.0, voicesEnabled: true, showChoiceTimer: true, blurThumbnailsOfMatureContent: true, assetPreloading: "essential", characterAnimationLevel: "full" }
      }),
      comment: "การตั้งค่าส่วนตัวของผู้ใช้",
    },
    wallet: {
        type: UserWalletSchema,
        default: () => ({ coinBalance: 0 }),
        comment: "ข้อมูลกระเป๋าเงิน (เหรียญ), field coinBalance พร้อมให้ Service อัปเดต",
    },
    gamification: {
        type: UserGamificationSchema, // << ใช้ Schema ที่ปรับปรุงแล้ว
        default: () => ({
            level: 1,
            currentLevelObject: null, // << ใหม่
            experiencePoints: 0,
            totalExperiencePointsEverEarned: 0, // << ใหม่
            nextLevelXPThreshold: 100, // ค่าเริ่มต้น, ควรถูกอัปเดตเมื่อ Level Up หรือสร้าง User
            achievements: [],
            showcasedItems: [], // << ใหม่
            primaryDisplayBadge: undefined, // << ใหม่
            secondaryDisplayBadges: [], // << ใหม่
            loginStreaks: { currentStreakDays: 0, longestStreakDays: 0 },
            dailyCheckIn: { currentStreakDays: 0 },
            lastActivityAt: new Date(),
        }),
        comment: "ข้อมูลระบบ Gamification",
    },
    verifiedBadges: {
        type: [{ type: String, trim: true, maxlength: 100 }],
        default: [],
        comment: "ป้ายยืนยันที่ผู้ใช้ได้รับ",
    },
    verification: {
        type: UserVerificationSchema,
        default: () => ({ kycStatus: "none" }),
        comment: "ข้อมูลการยืนยันตัวตน (KYC) และการสมัครนักเขียน",
    },
    donationSettings: {
        type: UserDonationSettingsSchema,
        default: () => ({ isEligibleForDonation: false }),
        comment: "การตั้งค่าการรับบริจาค (สำหรับนักเขียน)",
    },
    securitySettings: {
        type: UserSecuritySettingsSchema,
        default: () => ({ twoFactorAuthentication: { isEnabled: false }, loginAttempts: { count: 0 }, activeSessions: [] }),
        comment: "การตั้งค่าความปลอดภัย",
    },
    mentalWellbeingInsights: {
        type: MentalWellbeingInsightsSchema,
        default: () => ({ overallEmotionalTrend: "unknown", consultationRecommended: false }),
        select: false,
        comment: "ข้อมูลเชิงลึกสุขภาพจิต (AI-generated, select: false)",
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
UserSchema.index({ "preferences.language": 1 }, { name: "UserLanguagePreferenceIndex" });
UserSchema.index({ "gamification.level": -1 }, { name: "UserGamificationLevelIndex" });
UserSchema.index({ "gamification.achievements": 1 }, { name: "UserGamificationAchievementsRefIndex" });
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
UserSchema.index(
    { "profile.penName": 1 },
    { unique: true, sparse: true, name: "UserProfilePenNameIndex" }
);
UserSchema.index(
    { "writerStats.activeNovelPromotions.novelId": 1 }, // **เพิ่มใหม่** (ถ้าต้องการ query user จาก novel ที่มี promotion)
    { sparse: true, name: "UserWriterActivePromotionsIndex" }
);
UserSchema.index(
    { "writerStats.trendingNovels.novelId": 1 }, // **เพิ่มใหม่** (ถ้าต้องการ query user จาก novel ที่ trending)
    { sparse: true, name: "UserWriterTrendingNovelsIndex" }
);

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

UserSchema.pre<IUser>("save", async function (next) {
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
      this.password = undefined;
    }
  } else if (this.isNew && !this.password && this.accounts.some(acc => acc.type === "credentials")) {
    // return next(new Error("ต้องระบุรหัสผ่านสำหรับบัญชีประเภท credentials"));
  }

  if (this.isNew && !this.username && this.email) {
    let baseUsername = this.email.split("@")[0].replace(/[^a-zA-Z0-9_.]/g, "").toLowerCase();
    if (!baseUsername || baseUsername.length < 3) baseUsername = "user";
    while(baseUsername.length < 3) {
      baseUsername += Math.floor(Math.random() * 10);
    }
    let potentialUsername = baseUsername.substring(0, 40);
    let count = 0;
    const UserModelInstance = models.User || model<IUser>("User");
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existingUser = await UserModelInstance.findOne({ username: potentialUsername });
      if (!existingUser) break;
      count++;
      potentialUsername = `${baseUsername.substring(0, 40 - String(count).length)}${count}`;
      if (potentialUsername.length > 50) {
         return next(new Error("ไม่สามารถสร้างชื่อผู้ใช้ที่ไม่ซ้ำกันได้ กรุณาลองใช้อีเมลอื่นหรือตั้งชื่อผู้ใช้ด้วยตนเอง"));
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
  
  // ตรวจสอบและสร้าง writerStats เมื่อ role "Writer" ถูกเพิ่ม หรือเป็น User ใหม่ที่เป็น Writer
  const isNowWriter = this.roles.includes("Writer");
  const wasPreviouslyWriter = this.$__.priorValid ? this.$__.priorValid.roles.includes("Writer") : false;

  if (isNowWriter && (!this.writerStats || !wasPreviouslyWriter)) {
    if (!this.writerStats) { // ถ้า writerStats ยังไม่มี ให้สร้างใหม่ทั้งหมด
      this.writerStats = {
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
        novelPerformanceSummaries: new mongoose.Types.DocumentArray<INovelPerformanceStats>([]),
        writerSince: new Date(),
        activeNovelPromotions: new mongoose.Types.DocumentArray<IActiveNovelPromotionSummary>([]), // **เพิ่มใหม่**
        trendingNovels: new mongoose.Types.DocumentArray<ITrendingNovelSummary>([]), // **เพิ่มใหม่**
      };
    } else { // ถ้า writerStats มีอยู่แล้ว (เช่นถูกเพิ่ม role Writer ทีหลัง)
      if (!this.writerStats.writerSince) {
        this.writerStats.writerSince = new Date();
      }
      if (!this.writerStats.novelPerformanceSummaries) {
        this.writerStats.novelPerformanceSummaries = new mongoose.Types.DocumentArray<INovelPerformanceStats>([]);
      }
      // ตรวจสอบและเพิ่ม field ใหม่ถ้ายังไม่มี (สำคัญสำหรับการ migrate schema เก่า)
      if (!this.writerStats.activeNovelPromotions) {
        this.writerStats.activeNovelPromotions = new mongoose.Types.DocumentArray<IActiveNovelPromotionSummary>([]);
      }
      if (!this.writerStats.trendingNovels) {
        this.writerStats.trendingNovels = new mongoose.Types.DocumentArray<ITrendingNovelSummary>([]);
      }
    }

    // (ส่วน logic การตั้ง penName จาก displayName ถ้า penName ว่าง ยังคงเดิม)
    if (this.profile?.displayName && !this.profile.penName) {
        const UserModelInstance = models.User || model<IUser>("User");
        try {
            const existingUserWithPenName = await UserModelInstance.findOne({
                "profile.penName": this.profile.displayName,
                 _id: { $ne: this._id } // ตรวจสอบว่าไม่ใช่ user คนปัจจุบัน
            });
            if (!existingUserWithPenName) {
                this.profile.penName = this.profile.displayName;
            }
        } catch(penNameError) {
            console.error(`[User Pre-Save Hook] Error checking existing penName for user ${this.username}:`, penNameError);
            // ไม่ควร block การ save หลัก แค่ log error
        }
    }
  } else if (!isNowWriter && wasPreviouslyWriter) {
    // ถ้าถูกถอด role Writer อาจจะล้าง writerStats หรือเก็บไว้เป็นประวัติ (ขึ้นอยู่กับนโยบาย)
    // this.writerStats = undefined; // ตัวอย่างการล้าง
  }

  // << ใหม่: ตั้งค่า currentLevelObject และ nextLevelXPThreshold สำหรับผู้ใช้ใหม่ หรือเมื่อ level เปลี่ยน
  if (this.isNew || this.isModified("gamification.level")) {
    // const LevelModel = models.Level as mongoose.Model<ILevel> || model<ILevel>("Level"); // บรรทัดนี้ไม่จำเป็นแล้วถ้า import ด้านบน
    try {
      const currentLevelDoc = await LevelModel.findOne({ levelNumber: this.gamification.level }).lean();
      if (currentLevelDoc) {
        this.gamification.currentLevelObject = currentLevelDoc._id;
        this.gamification.nextLevelXPThreshold = currentLevelDoc.xpToNextLevelFromThis || this.gamification.nextLevelXPThreshold;
      } else if (this.gamification.level === 1 && !currentLevelDoc) {
         console.warn(`[User Pre-Save Hook] Level ${this.gamification.level} document not found in Levels collection for user ${this.username}. Attempting to set default nextLevelXPThreshold.`);
         // หาก Level 1 ไม่มีใน DB จริงๆ อาจจะต้องมีค่า default ที่เหมาะสมสำหรับ nextLevelXPThreshold
         this.gamification.nextLevelXPThreshold = this.gamification.nextLevelXPThreshold || 100; // หรือค่า default อื่นๆ
         this.gamification.currentLevelObject = null; // หรือจัดการตามความเหมาะสม
      }
    } catch (levelError) {
        console.error(`❌ [User Pre-Save Hook] Error fetching Level ${this.gamification.level} for user ${this.username}:`, levelError);
        // พิจารณาว่าจะให้ throw error หรือไม่ หรือจะให้ user สร้างต่อไปโดยไม่มีข้อมูล level
        // หาก Level เป็นส่วนสำคัญ อาจจะต้อง next(levelError);
    }
  }
  next();
});

// ==================================================================================================
// SECTION: Methods (เมธอดสำหรับ User Document)
// ==================================================================================================

UserSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
  // console.log(`[matchPassword] Comparing: '<span class="math-inline">\{enteredPassword\}' with stored hash\: '</span>{this.password ? this.password.substring(0,10)+'...' : 'NO_PASSWORD'}'`);
  if (!this.password) {
    return false;
  }
  const isMatch = await bcrypt.compare(enteredPassword, this.password);
  // console.log(`[matchPassword] Comparison result: ${isMatch}`);
  return isMatch;
};

UserSchema.methods.generateEmailVerificationToken = function (): string {
  const token = crypto.randomBytes(32).toString("hex");
  this.emailVerificationToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  this.emailVerificationTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
  return token;
};

UserSchema.methods.generatePasswordResetToken = function (): string {
  const token = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  this.passwordResetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
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

UserSchema.virtual("age").get(function (this: IUser): number | undefined {
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
const UserModel = (models.User as mongoose.Model<IUser>) || model<IUser>("User", UserSchema);

export default UserModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements) - ปรับปรุงล่าสุด
// ==================================================================================================
// 1.  **WriterStats Integration**: (คงเดิม) `writerStats` ถูก Embed และจัดการผ่าน middleware
// 2.  **Mental Wellbeing**: (คงเดิม) `mentalWellbeingInsights` และ `analyticsConsent` ยังคงอยู่
// 3.  **Security and Privacy**: (คงเดิม) `select: false` ถูกใช้กับ field ที่ละเอียดอ่อน.
// 4.  **Modularity**: (คงเดิม) การใช้ Sub-Schemas ช่วยให้โค้ดเป็นระเบียบ.
// 5.  **VisualNovelGameplayPreferences**: (คงเดิม) เพิ่มส่วนนี้เข้ามา.
// 6.  **Gamification Fields Update**: (ปรับปรุงแล้ว)
//     -   `User.gamification.level`: ระดับปัจจุบันของผู้ใช้
//     -   `User.gamification.currentLevelObject`: (ใหม่) ObjectId อ้างอิงไปยังเอกสาร Level ปัจจุบันใน `levels` collection
//         ช่วยให้ดึงข้อมูล Level (เช่น `levelTitle`, `xpToNextLevelFromThis`) ได้ง่ายขึ้น
//     -   `User.gamification.experiencePoints`: XP สะสมของผู้ใช้
//     -   `User.gamification.totalExperiencePointsEverEarned`: (ใหม่) XP ทั้งหมดที่เคยได้รับ [cite: 3]
//     -   `User.gamification.nextLevelXPThreshold`: XP ที่ต้องใช้เพื่อขึ้นระดับถัดไป
//         ค่านี้ควรถูกอัปเดตโดยอัตโนมัติเมื่อ `currentLevelObject` เปลี่ยน (เช่น ผ่าน pre-save hook หรือ service layer)
//         โดยดึงมาจาก `Level.xpToNextLevelFromThis`
//     -   `User.gamification.achievements`: ยังคงเป็น Array ของ `Types.ObjectId` แต่ตอนนี้จะอ้างอิงไปยัง `_id` ของ `UserEarnedItem`
//         ภายใน `UserAchievement` collection (เฉพาะ item ที่มี `itemType: 'Achievement'`)
//         ไม่ใช่ ObjectId ของ `Achievement` ต้นแบบโดยตรง เพื่อให้ติดตามการได้รับแต่ละครั้งได้ (ถ้า Achievement นั้น repeatable)
//         และเพื่อให้สามารถเก็บข้อมูล snapshot ของ Achievement ณ ตอนที่ได้รับได้
//     -   `User.gamification.showcasedItems`: (ใหม่) Array ของ Object ที่มี `{ earnedItemId: Types.ObjectId, itemType: "Achievement" | "Badge" }`
//         `earnedItemId` อ้างอิง `_id` ของ `UserEarnedItem` ใน `UserAchievement` collection [cite: 5]
//         เพื่อให้ผู้ใช้เลือกแสดง Achievement หรือ Badge ที่ตนเองได้รับบนโปรไฟล์
//     -   `User.gamification.primaryDisplayBadge` และ `secondaryDisplayBadges`: (ใหม่) Object และ Array ของ Object ตามลำดับ
//         สำหรับเก็บ `earnedBadgeId` (จาก `UserAchievement.earnedItems._id` ที่เป็น Badge)
//         เพื่อแสดงผล Badge ในส่วนต่างๆ ของแพลตฟอร์มตามที่ผู้ใช้ตั้งค่า.
// 7.  **Service Layer Responsibility**: (คงเดิมและเน้นย้ำ) การอัปเดต `gamification.experiencePoints`, `gamification.level`,
//     `gamification.currentLevelObject`, `gamification.nextLevelXPThreshold`, `wallet.coinBalance`,
//     และการเพิ่ม/อัปเดตข้อมูลใน `UserAchievement` (ซึ่งจะ trigger การอัปเดต `gamification.achievements`)
//     ควรเป็นความรับผิดชอบของ Gamification Service/Event Listener.
//     User model เตรียม field เหล่านี้ให้พร้อมใช้งาน.
// 8.  **Synchronization of Level Data**: `nextLevelXPThreshold` ใน `User.gamification` ควรจะซิงค์กับ
//     `xpToNextLevelFromThis` (หรือการคำนวณที่เทียบเท่า) จาก `Level.ts` model.
//     เมื่อผู้ใช้ level up, `currentLevelObject` ใน `User.gamification` ควรอัปเดต และ `nextLevelXPThreshold` ก็ควรดึงค่าใหม่
//     จาก `Level` document ใหม่นั้น. การทำเช่นนี้ใน pre-save hook ของ `User.ts` อาจซับซ้อน
//     การจัดการผ่าน Service Layer ตอนที่ผู้ใช้ได้รับ XP และมีการ Level up จะเหมาะสมกว่า.
//     แต่ใน pre-save hook ปัจจุบัน ได้มีการเพิ่ม logic เบื้องต้นในการพยายามตั้งค่า `currentLevelObject` และ `nextLevelXPThreshold`
//     เมื่อ `level` เปลี่ยน หรือเมื่อสร้าง user ใหม่ (ซึ่ง `level` คือ 1).
// 9.  **Writer Dashboard Enhancements**:
//     -   **`activeNovelPromotions`**: (เพิ่มใหม่) field นี้ใน `writerStats` จะเก็บข้อมูลสรุปของนิยายที่กำลังจัดโปรโมชัน
//         การอัปเดต field นี้:
//         -   **วิธีที่ 1 (Trigger จาก NovelModel)**: เมื่อ `NovelModel.monetizationSettings.activePromotion` มีการเปลี่ยนแปลง (เปิด/ปิด, แก้ไข)
//             `NovelModel` post-save hook สามารถ trigger การอัปเดต `UserModel.writerStats.activeNovelPromotions` ของผู้เขียนได้
//             โดยการ query นิยายทั้งหมดของผู้เขียนที่มีโปรโมชัน active แล้วสร้าง array ใหม่ใส่เข้าไป.
//         -   **วิธีที่ 2 (Background Job)**: มี Background Job ที่ทำงานเป็นระยะ (เช่น ทุกชั่วโมง) เพื่อ query นิยายที่มีโปรโมชัน active
//             แล้วอัปเดต `UserModel.writerStats.activeNovelPromotions` ให้กับนักเขียนทุกคน. วิธีนี้ลดภาระของ hook แต่ข้อมูลอาจจะไม่ Realtime.
//     -   **`trendingNovels`**: (เพิ่มใหม่) field นี้ใน `writerStats` จะเก็บข้อมูลสรุปของนิยายที่กำลังเป็นที่นิยม
//         การอัปเดต field นี้:
//         -   ควรทำผ่าน Background Job ที่คำนวณ `trendingScore` ใน `NovelModel.stats.trendingStats` เป็นระยะ
//         -   หลังจาก `trendingScore` ใน `NovelModel` ถูกอัปเดต, Job เดียวกันหรือ Job อีกตัวสามารถ query นิยาย Top N ของนักเขียนแต่ละคน
//             ตาม `trendingScore` แล้วนำมา denormalize เก็บไว้ใน `UserModel.writerStats.trendingNovels`.
//             การเก็บ `coverImageUrl` และสถิติบางส่วน (viewsLast24h, likesLast24h) จะช่วยลดการ populate เมื่อแสดงผลใน Dashboard.
// 10. **Denormalization Strategy**: การเพิ่ม `activeNovelPromotions` และ `trendingNovels` เป็นการ denormalize ข้อมูล
//     เพื่อเพิ่มประสิทธิภาพในการ query สำหรับ Writer Dashboard. ต้องแน่ใจว่ามีกลไกการอัปเดตที่สอดคล้องกัน.
// 11. **Performance**: การมี array ย่อยใน `writerStats` ควรพิจารณาถึงขนาดของ array ด้วย. หากมีจำนวนมาก (เช่น นักเขียนมีนิยายเป็นร้อยเรื่องที่มีโปรโมชัน)
//     อาจจะต้องพิจารณาการ query แบบ on-demand สำหรับบางกรณี หรือจำกัดจำนวนรายการที่ denormalize.
// ==================================================================================================
