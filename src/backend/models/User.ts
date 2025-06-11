// src/backend/models/User.ts
// โมเดลผู้ใช้ (User Model) - ศูนย์กลางข้อมูลผู้ใช้ทั้งหมดสำหรับการยืนยันตัวตน (Credentials และ OAuth), การตั้งค่า, สถิติ, และการจัดการบัญชี
// ตามมาตรฐาน DivWy
// เพิ่มการรวม WriterStats และการรองรับ Mental Wellbeing Insights
// อัปเดตล่าสุด: เพิ่ม VisualNovelGameplayPreferences สำหรับการตั้งค่าเฉพาะของ Visual Novel
// อัปเดตล่าสุด (Gamification): ปรับปรุง IUserGamification, เพิ่ม totalExperiencePointsEverEarned, currentLevelObject, showcasedItems, displayBadges
// อัปเดตล่าสุด (Visual Novel Settings): ปรับปรุงให้ตรงกับ Frontend Settings Page
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
 * @interface IUserAccessibilityDisplayPreferences
 * @description การตั้งค่าการเข้าถึงเพื่อช่วยเหลือผู้ใช้ (Accessibility) - อัปเดตให้ตรงกับ Frontend
 * @property {boolean} [dyslexiaFriendlyFont] - เปิด/ปิดการใช้ฟอนต์ที่เหมาะสำหรับผู้มีภาวะ Dyslexia
 * @property {boolean} [highContrastMode] - เปิด/ปิดโหมดความคมชัดสูง
 * @property {boolean} [epilepsySafeMode] - เปิด/ปิดโหมดลดแสงกระพริบสำหรับโรคลมชัก (เพิ่มใหม่)
 */
export interface IUserAccessibilityDisplayPreferences {
  dyslexiaFriendlyFont?: boolean; // ใช้ฟอนต์สำหรับผู้มีภาวะดิสเล็กเซีย
  highContrastMode?: boolean; // โหมดความคมชัดสูง
  epilepsySafeMode?: boolean; // โหมดลดแสงกระพริบสำหรับโรคลมชัก
}

/**
 * @interface IUIVisibilitySettings
 * @description การตั้งค่าความโปร่งใสและการแสดงผล UI (เพิ่มใหม่)
 * @property {number} [textBoxOpacity] - ความโปร่งใสของกล่องข้อความ (0-100)
 * @property {number} [backgroundBrightness] - ความสว่างของฉากหลัง (0-100)
 * @property {boolean} [textBoxBorder] - เปิด/ปิดกรอบข้อความ
 */
export interface IUIVisibilitySettings {
  textBoxOpacity?: number; // ความโปร่งใสของกล่องข้อความ (0-100)
  backgroundBrightness?: number; // ความสว่างของฉากหลัง (0-100)
  textBoxBorder?: boolean; // เปิด/ปิดกรอบข้อความ
}

/**
 * @interface IFontSettings
 * @description การตั้งค่าฟอนต์และข้อความ (เพิ่มใหม่)
 * @property {number} [fontSize] - ขนาดตัวอักษร (10-24)
 * @property {string} [fontFamily] - รูปแบบฟอนต์ (sans-serif, serif, monospace)
 * @property {boolean} [textContrastMode] - โหมดปรับ Contrast ตัวอักษร
 */
export interface IFontSettings {
  fontSize?: number; // ขนาดตัวอักษร (10-24)
  fontFamily?: string; // รูปแบบฟอนต์
  textContrastMode?: boolean; // โหมดปรับ Contrast ตัวอักษร
}

/**
 * @interface IVisualEffectsSettings
 * @description การตั้งค่าเอฟเฟกต์ภาพ (เพิ่มใหม่)
 * @property {boolean} [sceneTransitionAnimations] - เปิด/ปิดแอนิเมชันเวลาเปลี่ยนฉาก
 * @property {boolean} [actionSceneEffects] - เปิด/ปิด Screen Shake / Flash
 */
export interface IVisualEffectsSettings {
  sceneTransitionAnimations?: boolean; // เปิด/ปิดแอนิเมชันเวลาเปลี่ยนฉาก
  actionSceneEffects?: boolean; // เปิด/ปิด Screen Shake / Flash
}

/**
 * @interface ICharacterDisplaySettings
 * @description การตั้งค่าการแสดงผลตัวละคร (เพิ่มใหม่)
 * @property {boolean} [showCharacters] - แสดง/ไม่แสดงตัวละครบนหน้าจอ
 * @property {boolean} [characterMovementAnimations] - เปิด/ปิดแอนิเมชันการขยับตัวละคร
 * @property {boolean} [hideCharactersDuringText] - ซ่อนตัวละครเมื่ออ่านข้อความ
 */
export interface ICharacterDisplaySettings {
  showCharacters?: boolean; // แสดง/ไม่แสดงตัวละครบนหน้าจอ
  characterMovementAnimations?: boolean; // เปิด/ปิดแอนิเมชันการขยับตัวละคร
  hideCharactersDuringText?: boolean; // ซ่อนตัวละครเมื่ออ่านข้อความ
}

/**
 * @interface ICharacterVoiceDisplaySettings
 * @description การตั้งค่าการแสดงชื่อ/เสียงตัวละคร (เพิ่มใหม่)
 * @property {boolean} [voiceIndicatorIcon] - เปิดไอคอนหรือสัญลักษณ์บอกว่ามีเสียงพากย์
 */
export interface ICharacterVoiceDisplaySettings {
  voiceIndicatorIcon?: boolean; // เปิดไอคอนหรือสัญลักษณ์บอกว่ามีเสียงพากย์
}

/**
 * @interface IBackgroundDisplaySettings
 * @description การตั้งค่าการแสดงภาพพื้นหลัง/CG (เพิ่มใหม่)
 * @property {string} [backgroundQuality] - ความคมชัดภาพพื้นหลัง (low, mid, high)
 * @property {boolean} [showCGs] - เปิด/ปิดภาพ CG ในฉาก
 * @property {boolean} [backgroundEffects] - เปิด/ปิดเอฟเฟกต์พื้นหลัง (เช่น ฝนตก, หิมะ)
 */
export interface IBackgroundDisplaySettings {
  backgroundQuality?: string; // ความคมชัดภาพพื้นหลัง (low, mid, high)
  showCGs?: boolean; // เปิด/ปิดภาพ CG ในฉาก
  backgroundEffects?: boolean; // เปิด/ปิดเอฟเฟกต์พื้นหลัง
}

/**
 * @interface IVoiceSubtitlesSettings
 * @description การตั้งค่าซับไตเติลเสียงพากย์ (เพิ่มใหม่)
 * @property {boolean} [enabled] - เปิด/ปิดคำบรรยายเสียงพากย์
 */
export interface IVoiceSubtitlesSettings {
  enabled?: boolean; // เปิด/ปิดคำบรรยายเสียงพากย์
}

/**
 * @interface IUserDisplayPreferences
 * @description การตั้งค่าการแสดงผลโดยรวมของผู้ใช้ - อัปเดตให้ตรงกับ Frontend
 * @property {"light" | "dark" | "system" | "sepia"} theme - ธีม UI ที่ผู้ใช้เลือก
 * @property {IUserAccessibilityDisplayPreferences} accessibility - การตั้งค่าการเข้าถึง
 * @property {IUIVisibilitySettings} [uiVisibility] - การตั้งค่าความโปร่งใส/ความสว่าง UI (เพิ่มใหม่)
 * @property {IFontSettings} [fontSettings] - การตั้งค่าฟอนต์และข้อความ (เพิ่มใหม่)
 * @property {IVisualEffectsSettings} [visualEffects] - การตั้งค่าเอฟเฟกต์ภาพ (เพิ่มใหม่)
 * @property {ICharacterDisplaySettings} [characterDisplay] - การตั้งค่าการแสดงผลตัวละคร (เพิ่มใหม่)
 * @property {ICharacterVoiceDisplaySettings} [characterVoiceDisplay] - การตั้งค่าการแสดงชื่อ/เสียง (เพิ่มใหม่)
 * @property {IBackgroundDisplaySettings} [backgroundDisplay] - การตั้งค่าการแสดงภาพพื้นหลัง/CG (เพิ่มใหม่)
 * @property {IVoiceSubtitlesSettings} [voiceSubtitles] - การตั้งค่าซับไตเติลเสียงพากย์ (เพิ่มใหม่)
 */
export interface IUserDisplayPreferences {
  theme: "light" | "dark" | "system" | "sepia"; // ธีมที่ผู้ใช้เลือก (สว่าง, มืด, ตามระบบ, ซีเปีย)
  accessibility: IUserAccessibilityDisplayPreferences; // การตั้งค่าการเข้าถึง
  uiVisibility?: IUIVisibilitySettings; // การตั้งค่าความโปร่งใส/ความสว่าง UI
  fontSettings?: IFontSettings; // การตั้งค่าฟอนต์และข้อความ
  visualEffects?: IVisualEffectsSettings; // การตั้งค่าเอฟเฟกต์ภาพ
  characterDisplay?: ICharacterDisplaySettings; // การตั้งค่าการแสดงผลตัวละคร
  characterVoiceDisplay?: ICharacterVoiceDisplaySettings; // การตั้งค่าการแสดงชื่อ/เสียง
  backgroundDisplay?: IBackgroundDisplaySettings; // การตั้งค่าการแสดงภาพพื้นหลัง/CG
  voiceSubtitles?: IVoiceSubtitlesSettings; // การตั้งค่าซับไตเติลเสียงพากย์
}

/**
 * @interface IUserReadingPreferences
 * @description การตั้งค่าการอ่านและการเล่น Visual Novel (อัปเดตให้ตรงกับ Frontend)
 * @property {number} [textSpeed] - ความเร็วที่ข้อความปรากฏทีละตัวอักษร (0-100)
 * @property {boolean} [instantText] - แสดงข้อความทั้งหมดทันที
 * @property {boolean} [skipRead] - ข้ามเฉพาะข้อความที่เคยอ่านแล้ว
 * @property {boolean} [skipAll] - ข้ามทุกข้อความ (รวมที่ยังไม่เคยอ่าน)
 * @property {boolean} [skipHold] - ข้ามโดยกดค้าง / อัตโนมัติ
 * @property {number} [autoSpeed] - ความเร็วในการเปลี่ยนบทสนทนา (0-100)
 * @property {boolean} [autoPlay] - เล่นอัตโนมัติหลังข้อความจบ
 * @property {boolean} [enableHistory] - เปิดใช้งานประวัติข้อความ
 * @property {boolean} [historyVoice] - เปิดเสียงพากย์เมื่อกดดูข้อความเก่า
 * @property {boolean} [historyBack] - กดย้อนเพื่อกลับไปยังตัวเลือกก่อนหน้า
 * @property {boolean} [choiceTimer] - แสดงตัวจับเวลาในการเลือก
 * @property {boolean} [highlightChoices] - ไฮไลต์ตัวเลือกที่เคยเลือกแล้ว
 * @property {boolean} [routePreview] - แสดงผลลัพธ์เบื้องต้น
 * @property {boolean} [autoSave] - เปิด/ปิดเซฟอัตโนมัติ
 * @property {string} [saveFrequency] - ความถี่ในการเซฟ (5min, 10min, scene)
 * @property {boolean} [decisionWarning] - เปิดแจ้งเตือนเมื่อกำลังจะเลือกตัวเลือกสำคัญ
 * @property {boolean} [importantMark] - เปิด/ปิดเครื่องหมาย "สำคัญ" บนตัวเลือก
 * @property {boolean} [routeProgress] - แสดงเปอร์เซ็นต์ความคืบหน้าใน route ปัจจุบัน
 * @property {boolean} [showUnvisited] - แสดงเส้นทางที่ยังไม่เคยเข้า
 * @property {boolean} [secretHints] - แสดงคำใบ้สำหรับการปลดเส้นทางลับ
 */
export interface IUserReadingPreferences {
  textSpeed?: number; // ความเร็วที่ข้อความปรากฏทีละตัวอักษร (0-100)
  instantText?: boolean; // แสดงข้อความทั้งหมดทันที
  skipRead?: boolean; // ข้ามเฉพาะข้อความที่เคยอ่านแล้ว
  skipAll?: boolean; // ข้ามทุกข้อความ (รวมที่ยังไม่เคยอ่าน)
  skipHold?: boolean; // ข้ามโดยกดค้าง / อัตโนมัติ
  autoSpeed?: number; // ความเร็วในการเปลี่ยนบทสนทนา (0-100)
  autoPlay?: boolean; // เล่นอัตโนมัติหลังข้อความจบ
  enableHistory?: boolean; // เปิดใช้งานประวัติข้อความ
  historyVoice?: boolean; // เปิดเสียงพากย์เมื่อกดดูข้อความเก่า
  historyBack?: boolean; // กดย้อนเพื่อกลับไปยังตัวเลือกก่อนหน้า
  choiceTimer?: boolean; // แสดงตัวจับเวลาในการเลือก
  highlightChoices?: boolean; // ไฮไลต์ตัวเลือกที่เคยเลือกแล้ว
  routePreview?: boolean; // แสดงผลลัพธ์เบื้องต้น
  autoSave?: boolean; // เปิด/ปิดเซฟอัตโนมัติ
  saveFrequency?: string; // ความถี่ในการเซฟ (5min, 10min, scene)
  decisionWarning?: boolean; // เปิดแจ้งเตือนเมื่อกำลังจะเลือกตัวเลือกสำคัญ
  importantMark?: boolean; // เปิด/ปิดเครื่องหมาย "สำคัญ" บนตัวเลือก
  routeProgress?: boolean; // แสดงเปอร์เซ็นต์ความคืบหน้าใน route ปัจจุบัน
  showUnvisited?: boolean; // แสดงเส้นทางที่ยังไม่เคยเข้า
  secretHints?: boolean; // แสดงคำใบ้สำหรับการปลดเส้นทางลับ
}

/**
 * @interface IEmailNotificationSettings
 * @description การตั้งค่าการแจ้งเตือนทางอีเมล (เพิ่มใหม่)
 * @property {boolean} enabled - เปิด/ปิดการแจ้งเตือนทางอีเมล
 */
export interface IEmailNotificationSettings {
  enabled: boolean; // เปิด/ปิดการแจ้งเตือนทางอีเมล
}

/**
 * @interface IPushNotificationSettings
 * @description การตั้งค่าการแจ้งเตือนแบบพุช (เพิ่มใหม่)
 * @property {boolean} enabled - เปิด/ปิดการแจ้งเตือนแบบพุช
 */
export interface IPushNotificationSettings {
  enabled: boolean; // เปิด/ปิดการแจ้งเตือนแบบพุช
}

/**
 * @interface ISaveLoadNotificationSettings
 * @description การตั้งค่าแจ้งเตือนเกี่ยวกับการเซฟ/โหลด (เพิ่มใหม่)
 * @property {boolean} [autoSaveNotification] - แจ้งเตือนเมื่อบันทึกอัตโนมัติสำเร็จ
 * @property {boolean} [noSaveSpaceWarning] - เตือนเมื่อไม่มีที่ว่างในการเซฟ
 */
export interface ISaveLoadNotificationSettings {
  autoSaveNotification?: boolean; // แจ้งเตือนเมื่อบันทึกอัตโนมัติสำเร็จ
  noSaveSpaceWarning?: boolean; // เตือนเมื่อไม่มีที่ว่างในการเซฟ
}

/**
 * @interface INewContentNotificationSettings
 * @description การตั้งค่าแจ้งเตือนกิจกรรม/เนื้อหาใหม่ (เพิ่มใหม่)
 * @property {boolean} [contentUpdates] - เปิด/ปิดแจ้งเตือนเมื่อมีเนื้อหาใหม่, ตอนใหม่, หรือกิจกรรมพิเศษ
 * @property {boolean} [promotionEvent] - เปิด/ปิดการแจ้งเตือนโปรโมชั่น หรืออีเวนต์ในเกม
 */
export interface INewContentNotificationSettings {
  contentUpdates?: boolean; // เปิด/ปิดแจ้งเตือนเมื่อมีเนื้อหาใหม่
  promotionEvent?: boolean; // เปิด/ปิดการแจ้งเตือนโปรโมชั่น
}

/**
 * @interface IOutOfGameNotificationSettings
 * @description การตั้งค่าแจ้งเตือนนอกเกม (เพิ่มใหม่)
 * @property {string} [type] - ประเภทการแจ้งเตือนนอกเกมที่ต้องการ (all, new-episode, daily-gift, stat-progress)
 */
export interface IOutOfGameNotificationSettings {
  type?: string; // ประเภทการแจ้งเตือนนอกเกมที่ต้องการ
}

/**
 * @interface IOptionalNotificationSettings
 * @description การตั้งค่าแจ้งเตือนเสริม (เพิ่มใหม่)
 * @property {boolean} [statChange] - เปิด/ปิดแจ้งเตือนเมื่อค่าพลังเปลี่ยน
 * @property {string} [statDetailLevel] - ระดับความละเอียดของข้อมูลค่าพลัง (detail, summary)
 */
export interface IOptionalNotificationSettings {
  statChange?: boolean; // เปิด/ปิดแจ้งเตือนเมื่อค่าพลังเปลี่ยน
  statDetailLevel?: string; // ระดับความละเอียดของข้อมูลค่าพลัง
}

/**
 * @interface IUserNotificationPreferences
 * @description การตั้งค่าการแจ้งเตือนโดยรวม - อัปเดตให้ตรงกับ Frontend
 * @property {IEmailNotificationSettings} [email] - การตั้งค่าการแจ้งเตือนทางอีเมล
 * @property {IPushNotificationSettings} [push] - การตั้งค่าการแจ้งเตือนแบบพุช
 * @property {ISaveLoadNotificationSettings} [saveLoad] - การตั้งค่าแจ้งเตือนเกี่ยวกับการเซฟ/โหลด
 * @property {INewContentNotificationSettings} [newContent] - การตั้งค่าแจ้งเตือนกิจกรรม/เนื้อหาใหม่
 * @property {IOutOfGameNotificationSettings} [outOfGame] - การตั้งค่าแจ้งเตือนนอกเกม
 * @property {IOptionalNotificationSettings} [optional] - การตั้งค่าแจ้งเตือนเสริม
 */
export interface IUserNotificationPreferences {
  email?: IEmailNotificationSettings; // การตั้งค่าการแจ้งเตือนทางอีเมล
  push?: IPushNotificationSettings; // การตั้งค่าการแจ้งเตือนแบบพุช
  saveLoad?: ISaveLoadNotificationSettings; // การตั้งค่าแจ้งเตือนเกี่ยวกับการเซฟ/โหลด
  newContent?: INewContentNotificationSettings; // การตั้งค่าแจ้งเตือนกิจกรรม/เนื้อหาใหม่
  outOfGame?: IOutOfGameNotificationSettings; // การตั้งค่าแจ้งเตือนนอกเกม
  optional?: IOptionalNotificationSettings; // การตั้งค่าแจ้งเตือนเสริม
}

/**
 * @interface IUserPrivacyPreferences
 * @description การตั้งค่าความเป็นส่วนตัว - อัปเดตให้ตรงกับ Frontend
 * @property {boolean} [profileVisibility] - การแสดงโปรไฟล์
 * @property {boolean} [readingHistory] - ประวัติการอ่าน
 * @property {boolean} [activityStatus] - สถานะการใช้งาน
 * @property {boolean} [dataCollection] - การเก็บข้อมูล
 */
export interface IUserPrivacyPreferences {
  profileVisibility?: boolean; // การแสดงโปรไฟล์
  readingHistory?: boolean; // ประวัติการอ่าน
  activityStatus?: boolean; // สถานะการใช้งาน
  dataCollection?: boolean; // การเก็บข้อมูล
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
 * @description อินเทอร์เฟซหลักสำหรับการตั้งค่าผู้ใช้ - อัปเดตให้ตรงกับ Frontend
 * @property {string} language - ภาษาที่ผู้ใช้เลือกสำหรับ UI (เช่น "th", "en")
 * @property {IUserDisplayPreferences} display - การตั้งค่าการแสดงผล
 * @property {IUserReadingPreferences} [reading] - การตั้งค่าการอ่านและการเล่น Visual Novel
 * @property {IUserNotificationPreferences} [notifications] - การตั้งค่าการแจ้งเตือน
 * @property {IUserPrivacyPreferences} [privacy] - การตั้งค่าความเป็นส่วนตัว (แบบง่าย)
 * @property {IUserContentPrivacyPreferences} [contentAndPrivacy] - การตั้งค่าเนื้อหาและความเป็นส่วนตัว (แบบละเอียด)
 */
export interface IUserPreferences {
  language: string; // ภาษาที่ใช้
  display: IUserDisplayPreferences; // การตั้งค่าการแสดงผล
  reading?: IUserReadingPreferences; // การตั้งค่าการอ่านและการเล่น Visual Novel
  notifications?: IUserNotificationPreferences; // การตั้งค่าการแจ้งเตือน
  privacy?: IUserPrivacyPreferences; // การตั้งค่าความเป็นส่วนตัว (แบบง่าย)
  contentAndPrivacy?: IUserContentPrivacyPreferences; // การตั้งค่าเนื้อหาและความเป็นส่วนตัว (แบบละเอียด)
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
  totalTimeSpentReadingSeconds: number; // เวลารวมที่ใช้ในการอ่าน (หน่วยเป็นวินาที)
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
  totalChapters?: number; // จำนวนตอนทั้งหมด
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

// แยก Schemas ย่อยสำหรับ Visual Novel Settings ตาม Frontend Interface

const UIVisibilitySettingsSchema = new Schema<IUIVisibilitySettings>(
  {
    textBoxOpacity: { type: Number, min: 0, max: 100, default: 80, comment: "ความโปร่งใสของกล่องข้อความ (0-100)" },
    backgroundBrightness: { type: Number, min: 0, max: 100, default: 100, comment: "ความสว่างของฉากหลัง (0-100)" },
    textBoxBorder: { type: Boolean, default: true, comment: "เปิด/ปิดกรอบข้อความ" },
  },
  { _id: false }
);

const FontSettingsSchema = new Schema<IFontSettings>(
  {
    fontSize: { type: Number, min: 10, max: 24, default: 16, comment: "ขนาดตัวอักษร (10-24)" },
    fontFamily: { type: String, enum: ["sans-serif", "serif", "monospace"], default: "sans-serif", comment: "รูปแบบฟอนต์" },
    textContrastMode: { type: Boolean, default: false, comment: "โหมดปรับ Contrast ตัวอักษร" },
  },
  { _id: false }
);

const VisualEffectsSettingsSchema = new Schema<IVisualEffectsSettings>(
  {
    sceneTransitionAnimations: { type: Boolean, default: true, comment: "เปิด/ปิดแอนิเมชันเวลาเปลี่ยนฉาก" },
    actionSceneEffects: { type: Boolean, default: true, comment: "เปิด/ปิด Screen Shake / Flash" },
  },
  { _id: false }
);

const CharacterDisplaySettingsSchema = new Schema<ICharacterDisplaySettings>(
  {
    showCharacters: { type: Boolean, default: true, comment: "แสดง/ไม่แสดงตัวละครบนหน้าจอ" },
    characterMovementAnimations: { type: Boolean, default: true, comment: "เปิด/ปิดแอนิเมชันการขยับตัวละคร" },
    hideCharactersDuringText: { type: Boolean, default: false, comment: "ซ่อนตัวละครเมื่ออ่านข้อความ" },
  },
  { _id: false }
);

const CharacterVoiceDisplaySettingsSchema = new Schema<ICharacterVoiceDisplaySettings>(
  {
    voiceIndicatorIcon: { type: Boolean, default: true, comment: "เปิดไอคอนหรือสัญลักษณ์บอกว่ามีเสียงพากย์" },
  },
  { _id: false }
);

const BackgroundDisplaySettingsSchema = new Schema<IBackgroundDisplaySettings>(
  {
    backgroundQuality: { type: String, enum: ["low", "mid", "high"], default: "mid", comment: "ความคมชัดภาพพื้นหลัง" },
    showCGs: { type: Boolean, default: true, comment: "เปิด/ปิดภาพ CG ในฉาก" },
    backgroundEffects: { type: Boolean, default: true, comment: "เปิด/ปิดเอฟเฟกต์พื้นหลัง (เช่น ฝนตก, หิมะ)" },
  },
  { _id: false }
);

const VoiceSubtitlesSettingsSchema = new Schema<IVoiceSubtitlesSettings>(
  {
    enabled: { type: Boolean, default: false, comment: "เปิด/ปิดคำบรรยายเสียงพากย์" },
  },
  { _id: false }
);

const UserAccessibilityDisplayPreferencesSchema = new Schema<IUserAccessibilityDisplayPreferences>(
  {
    dyslexiaFriendlyFont: { type: Boolean, default: false, comment: "ใช้ฟอนต์สำหรับผู้มีภาวะดิสเล็กเซีย" },
    highContrastMode: { type: Boolean, default: false, comment: "โหมดความคมชัดสูง" },
    epilepsySafeMode: { type: Boolean, default: false, comment: "โหมดลดแสงกระพริบสำหรับโรคลมชัก" },
  },
  { _id: false }
);

const UserDisplayPreferencesSchema = new Schema<IUserDisplayPreferences>(
  {
    theme: { type: String, enum: ["light", "dark", "system", "sepia"], required: [true, "กรุณาระบุธีม"], default: "system", comment: "ธีมที่ใช้ (สว่าง, มืด, ตามระบบ, ซีเปีย)" },
    accessibility: { type: UserAccessibilityDisplayPreferencesSchema, default: () => ({ dyslexiaFriendlyFont: false, highContrastMode: false, epilepsySafeMode: false }), comment: "การตั้งค่าการเข้าถึง" },
    uiVisibility: { type: UIVisibilitySettingsSchema, default: () => ({ textBoxOpacity: 80, backgroundBrightness: 100, textBoxBorder: true }), comment: "การตั้งค่าความโปร่งใส/ความสว่าง UI" },
    fontSettings: { type: FontSettingsSchema, default: () => ({ fontSize: 16, fontFamily: "sans-serif", textContrastMode: false }), comment: "การตั้งค่าฟอนต์และข้อความ" },
    visualEffects: { type: VisualEffectsSettingsSchema, default: () => ({ sceneTransitionAnimations: true, actionSceneEffects: true }), comment: "การตั้งค่าเอฟเฟกต์ภาพ" },
    characterDisplay: { type: CharacterDisplaySettingsSchema, default: () => ({ showCharacters: true, characterMovementAnimations: true, hideCharactersDuringText: false }), comment: "การตั้งค่าการแสดงผลตัวละคร" },
    characterVoiceDisplay: { type: CharacterVoiceDisplaySettingsSchema, default: () => ({ voiceIndicatorIcon: true }), comment: "การตั้งค่าการแสดงชื่อ/เสียง" },
    backgroundDisplay: { type: BackgroundDisplaySettingsSchema, default: () => ({ backgroundQuality: "mid", showCGs: true, backgroundEffects: true }), comment: "การตั้งค่าการแสดงภาพพื้นหลัง/CG" },
    voiceSubtitles: { type: VoiceSubtitlesSettingsSchema, default: () => ({ enabled: false }), comment: "การตั้งค่าซับไตเติลเสียงพากย์" },
  },
  { _id: false }
);

const UserReadingPreferencesSchema = new Schema<IUserReadingPreferences>(
  {
    textSpeed: { type: Number, min: 0, max: 100, default: 50, comment: "ความเร็วที่ข้อความปรากฏทีละตัวอักษร (0-100)" },
    instantText: { type: Boolean, default: false, comment: "แสดงข้อความทั้งหมดทันที" },
    skipRead: { type: Boolean, default: true, comment: "ข้ามเฉพาะข้อความที่เคยอ่านแล้ว" },
    skipAll: { type: Boolean, default: false, comment: "ข้ามทุกข้อความ (รวมที่ยังไม่เคยอ่าน)" },
    skipHold: { type: Boolean, default: false, comment: "ข้ามโดยกดค้าง / อัตโนมัติ" },
    autoSpeed: { type: Number, min: 0, max: 100, default: 50, comment: "ความเร็วในการเปลี่ยนบทสนทนา (0-100)" },
    autoPlay: { type: Boolean, default: false, comment: "เล่นอัตโนมัติหลังข้อความจบ" },
    enableHistory: { type: Boolean, default: true, comment: "เปิดใช้งานประวัติข้อความ" },
    historyVoice: { type: Boolean, default: false, comment: "เปิดเสียงพากย์เมื่อกดดูข้อความเก่า" },
    historyBack: { type: Boolean, default: true, comment: "กดย้อนเพื่อกลับไปยังตัวเลือกก่อนหน้า" },
    choiceTimer: { type: Boolean, default: true, comment: "แสดงตัวจับเวลาในการเลือก" },
    highlightChoices: { type: Boolean, default: true, comment: "ไฮไลต์ตัวเลือกที่เคยเลือกแล้ว" },
    routePreview: { type: Boolean, default: false, comment: "แสดงผลลัพธ์เบื้องต้น" },
    autoSave: { type: Boolean, default: true, comment: "เปิด/ปิดเซฟอัตโนมัติ" },
    saveFrequency: { type: String, enum: ["5min", "10min", "scene"], default: "scene", comment: "ความถี่ในการเซฟ" },
    decisionWarning: { type: Boolean, default: true, comment: "เปิดแจ้งเตือนเมื่อกำลังจะเลือกตัวเลือกสำคัญ" },
    importantMark: { type: Boolean, default: true, comment: "เปิด/ปิดเครื่องหมาย 'สำคัญ' บนตัวเลือก" },
    routeProgress: { type: Boolean, default: true, comment: "แสดงเปอร์เซ็นต์ความคืบหน้าใน route ปัจจุบัน" },
    showUnvisited: { type: Boolean, default: true, comment: "แสดงเส้นทางที่ยังไม่เคยเข้า" },
    secretHints: { type: Boolean, default: false, comment: "แสดงคำใบ้สำหรับการปลดเส้นทางลับ" },
  },
  { _id: false }
);

const EmailNotificationSettingsSchema = new Schema<IEmailNotificationSettings>(
  {
    enabled: { type: Boolean, default: true, comment: "เปิด/ปิดการแจ้งเตือนทางอีเมล" },
  },
  { _id: false }
);

const PushNotificationSettingsSchema = new Schema<IPushNotificationSettings>(
  {
    enabled: { type: Boolean, default: true, comment: "เปิด/ปิดการแจ้งเตือนแบบพุช" },
  },
  { _id: false }
);

const SaveLoadNotificationSettingsSchema = new Schema<ISaveLoadNotificationSettings>(
  {
    autoSaveNotification: { type: Boolean, default: false, comment: "แจ้งเตือนเมื่อบันทึกอัตโนมัติสำเร็จ" },
    noSaveSpaceWarning: { type: Boolean, default: true, comment: "เตือนเมื่อไม่มีที่ว่างในการเซฟ" },
  },
  { _id: false }
);

const NewContentNotificationSettingsSchema = new Schema<INewContentNotificationSettings>(
  {
    contentUpdates: { type: Boolean, default: true, comment: "เปิด/ปิดแจ้งเตือนเมื่อมีเนื้อหาใหม่" },
    promotionEvent: { type: Boolean, default: false, comment: "เปิด/ปิดการแจ้งเตือนโปรโมชั่น" },
  },
  { _id: false }
);

const OutOfGameNotificationSettingsSchema = new Schema<IOutOfGameNotificationSettings>(
  {
    type: { type: String, enum: ["all", "new-episode", "daily-gift", "stat-progress"], default: "all", comment: "ประเภทการแจ้งเตือนนอกเกมที่ต้องการ" },
  },
  { _id: false }
);

const OptionalNotificationSettingsSchema = new Schema<IOptionalNotificationSettings>(
  {
    statChange: { type: Boolean, default: false, comment: "เปิด/ปิดแจ้งเตือนเมื่อค่าพลังเปลี่ยน" },
    statDetailLevel: { type: String, enum: ["detail", "summary"], default: "summary", comment: "ระดับความละเอียดของข้อมูลค่าพลัง" },
  },
  { _id: false }
);

const UserNotificationPreferencesSchema = new Schema<IUserNotificationPreferences>(
  {
    email: { type: EmailNotificationSettingsSchema, default: () => ({ enabled: true }), comment: "การตั้งค่าการแจ้งเตือนทางอีเมล" },
    push: { type: PushNotificationSettingsSchema, default: () => ({ enabled: true }), comment: "การตั้งค่าการแจ้งเตือนแบบพุช" },
    saveLoad: { type: SaveLoadNotificationSettingsSchema, default: () => ({ autoSaveNotification: false, noSaveSpaceWarning: true }), comment: "การตั้งค่าแจ้งเตือนเกี่ยวกับการเซฟ/โหลด" },
    newContent: { type: NewContentNotificationSettingsSchema, default: () => ({ contentUpdates: true, promotionEvent: false }), comment: "การตั้งค่าแจ้งเตือนกิจกรรม/เนื้อหาใหม่" },
    outOfGame: { type: OutOfGameNotificationSettingsSchema, default: () => ({ type: "all" }), comment: "การตั้งค่าแจ้งเตือนนอกเกม" },
    optional: { type: OptionalNotificationSettingsSchema, default: () => ({ statChange: false, statDetailLevel: "summary" }), comment: "การตั้งค่าแจ้งเตือนเสริม" },
  },
  { _id: false }
);

const UserPrivacyPreferencesSchema = new Schema<IUserPrivacyPreferences>(
  {
    profileVisibility: { type: Boolean, default: true, comment: "การแสดงโปรไฟล์" },
    readingHistory: { type: Boolean, default: false, comment: "ประวัติการอ่าน" },
    activityStatus: { type: Boolean, default: true, comment: "สถานะการใช้งาน" },
    dataCollection: { type: Boolean, default: false, comment: "การเก็บข้อมูล" },
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
    display: { type: UserDisplayPreferencesSchema, default: () => ({ theme: "system", accessibility: { dyslexiaFriendlyFont: false, highContrastMode: false, epilepsySafeMode: false } }), comment: "การตั้งค่าการแสดงผล" },
    reading: { type: UserReadingPreferencesSchema, default: () => ({ textSpeed: 50, instantText: false, skipRead: true, autoPlay: false }), comment: "การตั้งค่าการอ่านและการเล่น Visual Novel" },
    notifications: { type: UserNotificationPreferencesSchema, default: () => ({}), comment: "การตั้งค่าการแจ้งเตือน" },
    privacy: { type: UserPrivacyPreferencesSchema, default: () => ({ profileVisibility: true, readingHistory: false, activityStatus: true, dataCollection: false }), comment: "การตั้งค่าความเป็นส่วนตัว (แบบง่าย)" },
    contentAndPrivacy: { type: UserContentPrivacyPreferencesSchema, default: () => ({ showMatureContent: false, preferredGenres: [], profileVisibility: "public", readingHistoryVisibility: "followers_only", showActivityStatus: true, allowDirectMessagesFrom: "followers", analyticsConsent: { allowPsychologicalAnalysis: false } }), comment: "การตั้งค่าเนื้อหาและความเป็นส่วนตัว (แบบละเอียด)" },
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
        display: { 
          theme: "system", 
          accessibility: { dyslexiaFriendlyFont: false, highContrastMode: false, epilepsySafeMode: false },
          uiVisibility: { textBoxOpacity: 80, backgroundBrightness: 100, textBoxBorder: true },
          fontSettings: { fontSize: 16, fontFamily: "sans-serif", textContrastMode: false },
          visualEffects: { sceneTransitionAnimations: true, actionSceneEffects: true },
          characterDisplay: { showCharacters: true, characterMovementAnimations: true, hideCharactersDuringText: false },
          characterVoiceDisplay: { voiceIndicatorIcon: true },
          backgroundDisplay: { backgroundQuality: "mid", showCGs: true, backgroundEffects: true },
          voiceSubtitles: { enabled: false }
        },
        reading: { textSpeed: 50, instantText: false, skipRead: true, autoPlay: false },
        notifications: { 
          email: { enabled: true },
          push: { enabled: true }
        },
        privacy: { profileVisibility: true, readingHistory: false, activityStatus: true, dataCollection: false },
        contentAndPrivacy: { 
          showMatureContent: false, 
          preferredGenres: [], 
          profileVisibility: "public", 
          readingHistoryVisibility: "followers_only", 
          showActivityStatus: true, 
          allowDirectMessagesFrom: "followers", 
          analyticsConsent: { allowPsychologicalAnalysis: false } 
        }
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

// --- Core and Account Indexes ---
UserSchema.index({ email: 1 }, { unique: true, sparse: true, name: "UserEmailIndex" });
UserSchema.index({ username: 1 }, { unique: true, sparse: true, name: "UserUsernameIndex" });
UserSchema.index({ "accounts.provider": 1, "accounts.providerAccountId": 1 }, { unique: true, sparse: true, name: "UserAccountsProviderIndex" });
UserSchema.index({ "profile.primaryPenName": 1 }, { unique: true, sparse: true, name: "UserProfilePrimaryPenNameIndex" }); // Corrected from penName

// --- Status and Role Indexes ---
UserSchema.index({ roles: 1 }, { name: "UserRolesIndex" });
UserSchema.index({ isBanned: 1 }, { sparse: true, name: "UserBannedStatusIndex" }); // New: For finding banned users
UserSchema.index({ "verification.kycStatus": 1 }, { sparse: true, name: "UserKycStatusIndex" }); // New: For writer/verification queries

// --- Gamification and Social Indexes ---
UserSchema.index({ "gamification.level": -1 }, { name: "UserGamificationLevelIndex" });
UserSchema.index({ "gamification.totalExperiencePointsEverEarned": -1 }, { name: "UserGamificationXPIndex" }); // New: For leaderboards
UserSchema.index({ "gamification.achievements": 1 }, { name: "UserGamificationAchievementsRefIndex" });
UserSchema.index({ "socialStats.followersCount": -1 }, { name: "UserFollowersCountIndex" }); // New: For leaderboards/sorting

// --- Activity and Deletion Indexes ---
UserSchema.index({ lastLoginAt: -1 }, { name: "UserLastLoginIndex" });
UserSchema.index({ isDeleted: 1, deletedAt: 1 }, { name: "UserSoftDeleteIndex" });

// --- Preferences and Consent Indexes ---
UserSchema.index({ "preferences.language": 1 }, { name: "UserLanguagePreferenceIndex" });
UserSchema.index(
  { "preferences.privacy.analyticsConsent.allowPsychologicalAnalysis": 1 }, // Corrected path
  { name: "UserAnalyticsConsentIndex", sparse: true }
);
UserSchema.index(
  { "mentalWellbeingInsights.lastAssessedAt": -1 },
  { name: "UserMentalWellbeingAssessmentDateIndex", sparse: true }
);

// --- Writer-specific Indexes ---
UserSchema.index(
  { "writerStats.activeNovelPromotions.novelId": 1 },
  { sparse: true, name: "UserWriterActivePromotionsIndex" }
);
UserSchema.index(
  { "writerStats.trendingNovels.novelId": 1 },
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
// console.log(`[matchPassword] Comparing: '${enteredPassword}' with stored hash: '${this.password ? this.password.substring(0,10)+'...' : 'NO_PASSWORD'}'`);
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
// 1.  **Visual Novel Settings Integration**: อัปเดต User model ให้ตรงกับ Frontend Settings Page โดยเพิ่ม:
//     - IUserDisplayPreferences: เพิ่ม uiVisibility, fontSettings, visualEffects, characterDisplay, characterVoiceDisplay, backgroundDisplay, voiceSubtitles
//     - IUserReadingPreferences: เพิ่ม properties ใหม่ทั้งหมดตาม Frontend (textSpeed, instantText, skipRead, skipAll, skipHold, autoSpeed, autoPlay, enableHistory, historyVoice, historyBack, choiceTimer, highlightChoices, routePreview, autoSave, saveFrequency, decisionWarning, importantMark, routeProgress, showUnvisited, secretHints)
//     - IUserNotificationPreferences: เพิ่ม email, push, saveLoad, newContent, outOfGame, optional settings
//     - IUserPrivacyPreferences: เพิ่ม profileVisibility, readingHistory, activityStatus, dataCollection (แบบง่าย)
//     - IUserAnalyticsConsent: ยังคงเดิม (สำหรับระบบ Mental Wellbeing)
//     - IUserContentPrivacyPreferences: ยังคงเดิม (แบบละเอียด, รวม analyticsConsent)
// 2.  **Interface Compatibility**: เพิ่ม interface ย่อยใหม่เพื่อรองรับทุก properties ที่ใช้ใน Frontend:
//     - IUIVisibilitySettings, IFontSettings, IVisualEffectsSettings
//     - ICharacterDisplaySettings, ICharacterVoiceDisplaySettings, IBackgroundDisplaySettings, IVoiceSubtitlesSettings
//     - IEmailNotificationSettings, IPushNotificationSettings, ISaveLoadNotificationSettings
//     - INewContentNotificationSettings, IOutOfGameNotificationSettings, IOptionalNotificationSettings
// 3.  **Schema Completeness**: สร้าง Schema ย่อยครบถ้วนสำหรับทุก interface ใหม่ พร้อม default values และ validation ที่เหมาะสม
// 4.  **Default Values**: ตั้งค่า default ที่สมเหตุสมผลสำหรับ Visual Novel platform
// 5.  **Backwards Compatibility**: โครงสร้างเดิมยังคงอยู่ ไม่กระทบกับ code ที่มีอยู่
// 6.  **Performance**: เพิ่ม indexes สำหรับ field ใหม่ที่อาจจะถูก query บ่อย
// 7.  **Validation**: เพิ่ม enum values และ range validation สำหรับ field ใหม่
// 8.  **Comments**: เพิ่มคอมเมนต์ภาษาไทยอธิบาย field ใหม่ทั้งหมด
// 9.  **Error Prevention**: ตรวจสอบให้แน่ใจว่าไม่มี property conflicts ระหว่าง Frontend และ Backend
// 10. **Future-Proof**: โครงสร้างนี้รองรับการขยายเพิ่มเติมในอนาคตได้ง่าย.ts

