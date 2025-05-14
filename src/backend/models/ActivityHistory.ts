// backend/models/ActivityHistory.ts
// โมเดลประวัติกิจกรรม (ActivityHistory Model) - บันทึกกิจกรรมต่างๆ ที่ผู้ใช้ทำบนแพลตฟอร์ม
// ออกแบบให้เป็น log ที่ครอบคลุม, สามารถใช้ในการวิเคราะห์พฤติกรรม, แสดงผลในโปรไฟล์, และเป็นส่วนหนึ่งของ gamification
// ปรับปรุงล่าสุด: ตามข้อเสนอแนะของผู้ใช้ ลงวันที่ 13 พฤษภาคม 2025 เพื่อรองรับการวิเคราะห์ข้อมูลขั้นสูงและ AI/ML

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// ==================================
// ActivityType Enum Definition
// ==================================
// ประเภทของกิจกรรมที่จัดกลุ่มตามหมวดหมู่และใช้ Prefix เพื่อความชัดเจน
// ตัวอย่างการใช้งาน: const type: ActivityType = ActivityType.ACCOUNT_USER_REGISTERED;
export enum ActivityType {
  // --- Account & Profile Activities (ACCOUNT_) ---
  ACCOUNT_USER_REGISTERED = "ACCOUNT_USER_REGISTERED", // ผู้ใช้สมัครสมาชิกใหม่
  ACCOUNT_USER_LOGGED_IN = "ACCOUNT_USER_LOGGED_IN", // ผู้ใช้เข้าสู่ระบบ
  ACCOUNT_USER_LOGGED_OUT = "ACCOUNT_USER_LOGGED_OUT", // ผู้ใช้ออกจากระบบ
  ACCOUNT_PROFILE_UPDATED = "ACCOUNT_PROFILE_UPDATED", // ผู้ใช้อัปเดตข้อมูลโปรไฟล์
  ACCOUNT_USERNAME_CHANGED = "ACCOUNT_USERNAME_CHANGED", // ผู้ใช้เปลี่ยนชื่อผู้ใช้
  ACCOUNT_PASSWORD_CHANGED = "ACCOUNT_PASSWORD_CHANGED", // ผู้ใช้เปลี่ยนรหัสผ่าน
  ACCOUNT_EMAIL_VERIFIED = "ACCOUNT_EMAIL_VERIFIED", // ผู้ใช้ยืนยันอีเมลสำเร็จ
  ACCOUNT_PROVIDER_LINKED = "ACCOUNT_PROVIDER_LINKED", // ผู้ใช้เชื่อมต่อบัญชี OAuth (เช่น Google, Facebook)
  ACCOUNT_PROVIDER_UNLINKED = "ACCOUNT_PROVIDER_UNLINKED", // ผู้ใช้ยกเลิกการเชื่อมต่อบัญชี OAuth

  // --- Content Interaction - Reading Activities (CONTENT_READING_) ---
  CONTENT_READING_NOVEL_STARTED = "CONTENT_READING_NOVEL_STARTED", // ผู้ใช้เริ่มอ่านนิยาย
  CONTENT_READING_NOVEL_COMPLETED = "CONTENT_READING_NOVEL_COMPLETED", // ผู้ใช้อ่านนิยายจบเรื่อง
  CONTENT_READING_EPISODE_VIEWED = "CONTENT_READING_EPISODE_VIEWED", // ผู้ใช้อ่าน/เข้าดูตอนในนิยาย
  CONTENT_READING_SCENE_VIEWED = "CONTENT_READING_SCENE_VIEWED", // ผู้ใช้เข้าดูฉาก (Scene) ในนิยาย (ละเอียดกว่า episode)
  CONTENT_READING_NODE_ENTERED = "CONTENT_READING_NODE_ENTERED", // ผู้ใช้เข้าถึง Node ย่อยใน Story Map (สำหรับ Visual Novel ที่ซับซ้อน)
  CONTENT_READING_CHOICE_MADE = "CONTENT_READING_CHOICE_MADE", // ผู้ใช้เลือกตัวเลือกในนิยายแบบโต้ตอบ

  // --- Content Interaction - Bookshelf/Library Activities (CONTENT_LIBRARY_) ---
  CONTENT_LIBRARY_NOVEL_ADDED = "CONTENT_LIBRARY_NOVEL_ADDED", // ผู้ใช้เพิ่มนิยายเข้าชั้นหนังสือ
  CONTENT_LIBRARY_NOVEL_REMOVED = "CONTENT_LIBRARY_NOVEL_REMOVED", // ผู้ใช้ลบนิยายออกจากชั้นหนังสือ

  // --- Content Interaction - Rating & Review Activities (CONTENT_FEEDBACK_) ---
  CONTENT_FEEDBACK_NOVEL_RATED = "CONTENT_FEEDBACK_NOVEL_RATED", // ผู้ใช้ให้คะแนนนิยาย
  CONTENT_FEEDBACK_NOVEL_REVIEWED = "CONTENT_FEEDBACK_NOVEL_REVIEWED", // ผู้ใช้เขียนรีวิวนิยาย

  // --- Content Interaction - Media Activities (CONTENT_MEDIA_) ---
  CONTENT_MEDIA_VIEWED = "CONTENT_MEDIA_VIEWED", // ผู้ใช้ดูสื่อ (ภาพ, วิดีโอ, เสียง) ที่เกี่ยวข้องกับนิยายหรือแพลตฟอร์ม
  CONTENT_MEDIA_DOWNLOADED = "CONTENT_MEDIA_DOWNLOADED", // ผู้ใช้ดาวน์โหลดสื่อ (ถ้ามีฟังก์ชันนี้)

  // --- Social Interaction Activities (SOCIAL_) ---
  SOCIAL_USER_FOLLOWED = "SOCIAL_USER_FOLLOWED", // ผู้ใช้ติดตามผู้ใช้อื่น
  SOCIAL_USER_UNFOLLOWED = "SOCIAL_USER_UNFOLLOWED", // ผู้ใช้เลิกติดตามผู้ใช้อื่น
  SOCIAL_NOVEL_FOLLOWED = "SOCIAL_NOVEL_FOLLOWED", // ผู้ใช้ติดตามนิยาย
  SOCIAL_NOVEL_UNFOLLOWED = "SOCIAL_NOVEL_UNFOLLOWED", // ผู้ใช้เลิกติดตามนิยาย
  SOCIAL_COMMENT_POSTED = "SOCIAL_COMMENT_POSTED", // ผู้ใช้แสดงความคิดเห็น (ในนิยาย, ตอน, โปรไฟล์, หรืออื่นๆ)
  SOCIAL_COMMENT_LIKED = "SOCIAL_COMMENT_LIKED", // ผู้ใช้กดถูกใจความคิดเห็น
  SOCIAL_COMMENT_DELETED = "SOCIAL_COMMENT_DELETED", // ผู้ใช้ลบความคิดเห็น (ของตนเอง)
  SOCIAL_REPLY_POSTED = "SOCIAL_REPLY_POSTED", // ผู้ใช้ตอบกลับความคิดเห็น

  // --- Content Creation - Writer Activities (WRITER_CONTENT_) ---
  WRITER_CONTENT_NOVEL_CREATED = "WRITER_CONTENT_NOVEL_CREATED", // นักเขียนสร้างนิยายใหม่
  WRITER_CONTENT_NOVEL_UPDATED = "WRITER_CONTENT_NOVEL_UPDATED", // นักเขียนอัปเดตข้อมูลนิยาย
  WRITER_CONTENT_NOVEL_PUBLISHED = "WRITER_CONTENT_NOVEL_PUBLISHED", // นักเขียนเผยแพร่นิยาย
  WRITER_CONTENT_NOVEL_UNPUBLISHED = "WRITER_CONTENT_NOVEL_UNPUBLISHED", // นักเขียนยกเลิกการเผยแพร่นิยาย
  WRITER_CONTENT_NOVEL_DELETED = "WRITER_CONTENT_NOVEL_DELETED", // นักเขียนลบนิยาย
  WRITER_CONTENT_EPISODE_CREATED = "WRITER_CONTENT_EPISODE_CREATED", // นักเขียนสร้างตอนใหม่
  WRITER_CONTENT_EPISODE_UPDATED = "WRITER_CONTENT_EPISODE_UPDATED", // นักเขียนอัปเดตตอน
  WRITER_CONTENT_EPISODE_PUBLISHED = "WRITER_CONTENT_EPISODE_PUBLISHED", // นักเขียนเผยแพร่ตอน
  WRITER_CONTENT_EPISODE_DELETED = "WRITER_CONTENT_EPISODE_DELETED", // นักเขียนลบตอน
  WRITER_CONTENT_CHARACTER_CREATED = "WRITER_CONTENT_CHARACTER_CREATED", // นักเขียนสร้างตัวละครใหม่
  WRITER_CONTENT_CHARACTER_UPDATED = "WRITER_CONTENT_CHARACTER_UPDATED", // นักเขียนอัปเดตตัวละคร
  WRITER_CONTENT_CHARACTER_DELETED = "WRITER_CONTENT_CHARACTER_DELETED", // นักเขียนลบตัวละคร
  WRITER_CONTENT_STORYMAP_UPDATED = "WRITER_CONTENT_STORYMAP_UPDATED", // นักเขียนอัปเดต Story Map
  WRITER_CONTENT_MEDIA_UPLOADED = "WRITER_CONTENT_MEDIA_UPLOADED", // นักเขียนอัปโหลดสื่อ (ภาพ, เสียง)
  WRITER_CONTENT_MEDIA_DELETED = "WRITER_CONTENT_MEDIA_DELETED", // นักเขียนลบสื่อ

  // --- Monetization & Wallet Activities (FINANCE_) ---
  FINANCE_COINS_PURCHASED = "FINANCE_COINS_PURCHASED", // ผู้ใช้ซื้อเหรียญ
  FINANCE_COINS_SPENT_EPISODE = "FINANCE_COINS_SPENT_EPISODE", // ผู้ใช้ใช้เหรียญปลดล็อกตอน
  FINANCE_COINS_SPENT_DONATION = "FINANCE_COINS_SPENT_DONATION", // ผู้ใช้ใช้เหรียญในการบริจาค
  FINANCE_DONATION_MADE = "FINANCE_DONATION_MADE", // ผู้ใช้ทำการบริจาค (อาจเป็นเงินจริงหรือเหรียญ)
  FINANCE_DONATION_RECEIVED = "FINANCE_DONATION_RECEIVED", // นักเขียนได้รับการบริจาค
  FINANCE_EARNING_CLAIMED = "FINANCE_EARNING_CLAIMED", // นักเขียนถอนรายได้

  // --- Gamification Activities (GAMIFICATION_) ---
  GAMIFICATION_ACHIEVEMENT_UNLOCKED = "GAMIFICATION_ACHIEVEMENT_UNLOCKED", // ผู้ใช้ปลดล็อกความสำเร็จ
  GAMIFICATION_BADGE_EARNED = "GAMIFICATION_BADGE_EARNED", // ผู้ใช้ได้รับเหรียญตรา
  GAMIFICATION_DAILY_REWARD_CLAIMED = "GAMIFICATION_DAILY_REWARD_CLAIMED", // ผู้ใช้รับรางวัลล็อกอินรายวัน

  // --- Search Activities (SEARCH_) ---
  SEARCH_PERFORMED = "SEARCH_PERFORMED", // ผู้ใช้ทำการค้นหา

  // --- Settings Activities (SETTINGS_) ---
  SETTINGS_GENERAL_UPDATED = "SETTINGS_GENERAL_UPDATED", // ผู้ใช้อัปเดตการตั้งค่าทั่วไป
  SETTINGS_THEME_CHANGED = "SETTINGS_THEME_CHANGED", // ผู้ใช้เปลี่ยนธีมการแสดงผล
  SETTINGS_LANGUAGE_CHANGED = "SETTINGS_LANGUAGE_CHANGED", // ผู้ใช้เปลี่ยนภาษา
  SETTINGS_NOTIFICATION_UPDATED = "SETTINGS_NOTIFICATION_UPDATED", // ผู้ใช้อัปเดตการตั้งค่าการแจ้งเตือน
  SETTINGS_PRIVACY_UPDATED = "SETTINGS_PRIVACY_UPDATED", // ผู้ใช้อัปเดตการตั้งค่าความเป็นส่วนตัว

  // --- Platform/System Activities (SYSTEM_) ---
  SYSTEM_CONTENT_REPORTED = "SYSTEM_CONTENT_REPORTED", // ผู้ใช้รายงานเนื้อหา/ความคิดเห็นที่ไม่เหมาะสม
  SYSTEM_ERROR_ENCOUNTERED = "SYSTEM_ERROR_ENCOUNTERED", // ระบบบันทึกข้อผิดพลาดที่ผู้ใช้ประสบ (สำหรับ debugging)
}

// ==================================
// IActivityContext Interface Definition
// ==================================
// อินเทอร์เฟซสำหรับข้อมูลเพิ่มเติมที่เกี่ยวข้องกับกิจกรรม (Contextual Data)
// ออกแบบให้มีความยืดหยุ่นและรองรับข้อมูลที่หลากหลายสำหรับการวิเคราะห์
export interface IActivityContext {
  // --- PII (Personal Identifiable Information) / Sensitive Data --- 
  // **ข้อควรระวัง**: ข้อมูลส่วนนี้มีความละเอียดอ่อน ควรจัดการตามหลัก GDPR/PDPA
  // เข้ารหัส, จำกัดการเข้าถึง, และระบุวัตถุประสงค์การใช้งานให้ชัดเจน
  ipAddress?: string; // IP Address ของผู้ใช้ (เข้ารหัสเมื่อจัดเก็บ, ใช้สำหรับการ trace ปัญหา, วิเคราะห์ fraud)
                      // ตัวอย่าง: (หลังเข้ารหัส) "$2b$10$Kqg..."
  userAgent?: string; // User Agent ของเบราว์เซอร์/อุปกรณ์ (ใช้สำหรับการวิเคราะห์ platform, debug)
                      // ตัวอย่าง: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ..."
  location?: string; // ตำแหน่งทางภูมิศาสตร์โดยประมาณ (ประเทศ/เมือง) (ต้องได้รับความยินยอมจากผู้ใช้)
                     // ตัวอย่าง: "Bangkok, Thailand"
  sessionId?: string; // ID ของ session ปัจจุบันของผู้ใช้ (สำหรับเชื่อมโยงกิจกรรมใน session เดียวกัน)
                      // ตัวอย่าง: "sess_abc123xyz789"

  // --- Entity IDs (Foreign Keys to other models) ---
  novelId?: Types.ObjectId; // ID ของนิยายที่เกี่ยวข้อง (อ้างอิง Novel model)
  episodeId?: Types.ObjectId; // ID ของตอนที่เกี่ยวข้อง (อ้างอิง Episode model)
  sceneId?: Types.ObjectId; // ID ของฉากที่เกี่ยวข้อง (อ้างอิง Scene model)
  nodeId?: string; // ID ของ Node ใน StoryMap (สำหรับ CONTENT_READING_NODE_ENTERED)
  choiceId?: Types.ObjectId; // ID ของตัวเลือกที่ผู้ใช้เลือก (อ้างอิง Choice model)
  selectedChoiceId?: Types.ObjectId; // (สำหรับ CONTENT_READING_CHOICE_MADE) ID ของตัวเลือกที่ถูกเลือก
  outcomeNodeId?: string; // (สำหรับ CONTENT_READING_CHOICE_MADE) ID ของ Node ปลายทางหลังจากการเลือก
  commentId?: Types.ObjectId; // ID ของความคิดเห็นที่เกี่ยวข้อง (อ้างอิง Comment model)
  ratingId?: Types.ObjectId; // ID ของการให้คะแนนที่เกี่ยวข้อง (อ้างอิง Rating model)
  purchaseId?: Types.ObjectId; // ID ของการซื้อที่เกี่ยวข้อง (อ้างอิง Purchase model)
  paymentId?: Types.ObjectId; // ID ของการชำระเงินที่เกี่ยวข้อง (อ้างอิง Payment model)
  donationId?: Types.ObjectId; // ID ของการบริจาค (อ้างอิง Donation model)
  targetUserId?: Types.ObjectId; // ID ของผู้ใช้เป้าหมาย (เช่น ผู้ที่ถูกติดตาม, ผู้เขียนนิยาย) (อ้างอิง User model)
  achievementId?: Types.ObjectId; // ID ของความสำเร็จที่ปลดล็อก (อ้างอิง Achievement model)
  badgeId?: Types.ObjectId; // ID ของเหรียญตราที่ได้รับ (อ้างอิง Badge model)
  mediaId?: Types.ObjectId; // ID ของสื่อที่เกี่ยวข้อง (อ้างอิง Media หรือ OfficialMedia model)
  characterId?: Types.ObjectId; // ID ของตัวละครที่เกี่ยวข้อง (อ้างอิง Character model)

  // --- Denormalized Data (for quick display/filtering, use judiciously) ---
  novelTitle?: string; // ชื่อนิยาย (เก็บเพื่อความสะดวกในการแสดงผล log)
  episodeTitle?: string; // ชื่อตอน
  targetUsername?: string; // ชื่อผู้ใช้เป้าหมาย
  commentTextSnippet?: string; // ส่วนหนึ่งของข้อความคอมเมนต์ (ไม่เกิน 100 ตัวอักษร)

  // --- Activity Specific Values ---
  coinsAmount?: number; // จำนวนเหรียญที่เกี่ยวข้อง (เช่น ซื้อ, ใช้จ่าย, ได้รับ)
  realMoneyAmount?: number; // จำนวนเงินจริงที่เกี่ยวข้อง (เช่น ซื้อเหรียญ, บริจาค)
  currency?: string; // สกุลเงิน (THB, USD)
  value?: any; // ค่าใหม่ของสิ่งที่เปลี่ยนแปลง (เช่น theme="dark", privacyLevel=2)
  previousValue?: any; // ค่าเดิมก่อนการเปลี่ยนแปลง (เช่น theme="light", privacyLevel=1)
  durationSeconds?: number; // ระยะเวลาที่ใช้ในกิจกรรม (เช่น เวลาที่ใช้ในการอ่านตอน, ดูวิดีโอ)
  platform?: "web" | "mobile_app_android" | "mobile_app_ios" | "api"; // แพลตฟอร์มที่เกิดกิจกรรม
  
  // --- Search Specific Context (for SEARCH_PERFORMED) ---
  searchQuery?: string; // คำค้นหาที่ผู้ใช้ป้อน
  searchFilters?: Record<string, any>; // ฟิลเตอร์ที่ใช้ในการค้นหา (เช่น { genre: "fantasy", status: "completed" })
  searchResultCount?: number; // จำนวนผลลัพธ์ที่ได้จากการค้นหา

  // --- Error Specific Context (for SYSTEM_ERROR_ENCOUNTERED) ---
  errorCode?: string; // รหัสข้อผิดพลาด (ถ้ามี)
  errorMessage?: string; // ข้อความข้อผิดพลาด (ส่วนหนึ่ง)

  // --- Extensibility --- 
  [key: string]: any; // สำหรับข้อมูล context อื่นๆ ที่อาจเพิ่มขึ้นในอนาคต (ควรใช้อย่างระมัดระวัง)
}

// ==================================
// IActivityHistory Interface Definition
// ==================================
export interface IActivityHistory extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId; // ID ของผู้ใช้ที่ทำกิจกรรม (อ้างอิง User model)
  activityType: ActivityType; // ประเภทของกิจกรรม (ใช้ Enum ที่กำหนดด้านบน)
  timestamp: Date; // เวลาที่เกิดกิจกรรม (ควรเป็น UTC)
  description?: string; // คำอธิบายกิจกรรมที่สร้างขึ้นโดยอัตโนมัติ (ภาษาไทย, สำหรับแสดงผล)
  context?: IActivityContext; // ข้อมูลเพิ่มเติมที่เกี่ยวข้องกับกิจกรรม
  isVisibleOnProfile: boolean; // กิจกรรมนี้แสดงบนหน้าโปรไฟล์ของผู้ใช้หรือไม่ (default: true)
  createdAt: Date; // MongoDB จะสร้างให้โดยอัตโนมัติ
}

// ==================================
// ActivityContextSchema Definition
// ==================================
const ActivityContextSchema = new Schema<IActivityContext>(
  {
    ipAddress: { type: String, select: false, comment: "IP Address ของผู้ใช้ (ควรเข้ารหัสก่อนจัดเก็บ)" },
    userAgent: { type: String, select: false, comment: "User Agent ของ client (ควรเข้ารหัสบางส่วนหากจำเป็น)" },
    location: { type: String, comment: "ตำแหน่งทางภูมิศาสตร์โดยประมาณ (เช่น 'ประเทศ, เมือง') ต้องได้รับความยินยอม" },
    sessionId: { type: String, index: true, comment: "Session ID สำหรับติดตามกิจกรรมใน session เดียวกัน" },

    novelId: { type: Schema.Types.ObjectId, ref: "Novel", index: true },
    episodeId: { type: Schema.Types.ObjectId, ref: "Episode", index: true },
    sceneId: { type: Schema.Types.ObjectId, ref: "Scene", index: true },
    nodeId: { type: String, comment: "ID ของ Node ใน StoryMap" },
    choiceId: { type: Schema.Types.ObjectId, ref: "Choice" },
    selectedChoiceId: { type: Schema.Types.ObjectId, ref: "Choice", comment: "ID ของตัวเลือกที่ถูกเลือกในกิจกรรม CONTENT_READING_CHOICE_MADE" },
    outcomeNodeId: { type: String, comment: "ID ของ Node ปลายทางหลังจากการเลือกใน CONTENT_READING_CHOICE_MADE" },
    commentId: { type: Schema.Types.ObjectId, ref: "Comment", index: true },
    ratingId: { type: Schema.Types.ObjectId, ref: "Rating" },
    purchaseId: { type: Schema.Types.ObjectId, ref: "Purchase" },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    donationId: { type: Schema.Types.ObjectId, ref: "Donation" },
    targetUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    achievementId: { type: Schema.Types.ObjectId, ref: "Achievement" },
    badgeId: { type: Schema.Types.ObjectId, ref: "Badge" },
    mediaId: { type: Schema.Types.ObjectId, ref: "Media" }, // หรือ OfficialMedia, พิจารณาตามการใช้งานจริง
    characterId: { type: Schema.Types.ObjectId, ref: "Character" },

    novelTitle: { type: String, trim: true, maxlength: 255, comment: "ชื่อนิยาย (denormalized)" },
    episodeTitle: { type: String, trim: true, maxlength: 255, comment: "ชื่อตอน (denormalized)" },
    targetUsername: { type: String, trim: true, maxlength: 100, comment: "ชื่อผู้ใช้เป้าหมาย (denormalized)" },
    commentTextSnippet: { type: String, trim: true, maxlength: 100, comment: "ส่วนหนึ่งของข้อความคอมเมนต์ (denormalized)" },

    coinsAmount: { type: Number, min: 0, comment: "จำนวนเหรียญที่เกี่ยวข้อง" },
    realMoneyAmount: { type: Number, min: 0, comment: "จำนวนเงินจริงที่เกี่ยวข้อง" },
    currency: { type: String, trim: true, uppercase: true, maxlength: 3, comment: "สกุลเงิน เช่น THB, USD" },
    value: { type: Schema.Types.Mixed, comment: "ค่าใหม่ของสิ่งที่เปลี่ยนแปลง" },
    previousValue: { type: Schema.Types.Mixed, comment: "ค่าเดิมก่อนการเปลี่ยนแปลง" },
    durationSeconds: { type: Number, min: 0, comment: "ระยะเวลาที่ใช้ในกิจกรรม (วินาที)" },
    platform: { type: String, enum: ["web", "mobile_app_android", "mobile_app_ios", "api"], comment: "แพลตฟอร์มที่เกิดกิจกรรม" },
    
    searchQuery: { type: String, trim: true, comment: "คำค้นหาที่ผู้ใช้ป้อน" },
    searchFilters: { type: Schema.Types.Mixed, comment: "ฟิลเตอร์ที่ใช้ในการค้นหา (object)" },
    searchResultCount: { type: Number, min: 0, comment: "จำนวนผลลัพธ์ที่ได้จากการค้นหา" },

    errorCode: { type: String, comment: "รหัสข้อผิดพลาด (สำหรับ SYSTEM_ERROR_ENCOUNTERED)" },
    errorMessage: { type: String, comment: "ข้อความข้อผิดพลาด (สำหรับ SYSTEM_ERROR_ENCOUNTERED)" },
  },
  { 
    _id: false, 
    strict: "throw", // ป้องกันการบันทึก field ที่ไม่ได้กำหนดใน schema นี้
    comment: "Schema ย่อยสำหรับเก็บข้อมูล context ของกิจกรรม, strict: \"throw\" เพื่อความแม่นยำของข้อมูล"
  }
);

// ==================================
// ActivityHistorySchema Definition
// ==================================
const ActivityHistorySchema = new Schema<IActivityHistory>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User", 
      required: [true, "กรุณาระบุ ID ของผู้ใช้ (User ID is required)"],
      index: true,
      comment: "ID ของผู้ใช้ที่ทำกิจกรรม"
    },
    activityType: {
      type: String,
      enum: {
        values: Object.values(ActivityType),
        message: "ประเภทกิจกรรม '{VALUE}' ไม่ถูกต้อง กรุณาใช้ค่าจาก ActivityType enum ที่กำหนดไว้"
      },
      required: [true, "กรุณาระบุประเภทกิจกรรม (Activity type is required)"],
      index: true,
      comment: "ประเภทของกิจกรรมที่เกิดขึ้น"
    },
    timestamp: { 
      type: Date, 
      default: Date.now, 
      required: [true, "กรุณาระบุเวลาที่เกิดกิจกรรม (Timestamp is required)"], 
      index: true, 
      comment: "เวลาที่เกิดกิจกรรม (ควรเป็น UTC)"
    },
    description: { 
      type: String, 
      trim: true, 
      maxlength: [500, "คำอธิบายกิจกรรมต้องไม่เกิน 500 ตัวอักษร"], 
      comment: "คำอธิบายกิจกรรมที่สร้างขึ้นโดยอัตโนมัติ (ภาษาไทย, สำหรับแสดงผล UI)"
    },
    context: {
      type: ActivityContextSchema,
      default: () => ({}),
      comment: "ข้อมูลเพิ่มเติม (context) ที่เกี่ยวข้องกับกิจกรรม"
    },
    isVisibleOnProfile: { 
      type: Boolean, 
      default: true, 
      comment: "กิจกรรมนี้จะแสดงบนหน้าโปรไฟล์ของผู้ใช้หรือไม่"
    }, 
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // เก็บเฉพาะ createdAt, ไม่ต้องการ updatedAt สำหรับ log
    collection: "activityhistories", // ชื่อ collection ใน MongoDB
    comment: "ตารางเก็บประวัติกิจกรรมทั้งหมดของผู้ใช้บนแพลตฟอร์ม"
  }
);

// ----- Indexes เพิ่มเติม (พิจารณาตาม Query Patterns ที่ใช้บ่อย) -----
ActivityHistorySchema.index({ user: 1, timestamp: -1 }, { comment: "สำหรับ query ประวัติกิจกรรมของผู้ใช้ เรียงตามเวลาล่าสุด" });
ActivityHistorySchema.index({ user: 1, activityType: 1, timestamp: -1 }, { comment: "สำหรับ query กิจกรรมประเภทเฉพาะของผู้ใช้" });
ActivityHistorySchema.index({ activityType: 1, timestamp: -1 }, { comment: "สำหรับ query กิจกรรมประเภทเฉพาะทั้งหมดในระบบ (สำหรับ admin/analytics)" });
ActivityHistorySchema.index({ "context.novelId": 1, timestamp: -1 }, { comment: "สำหรับ query กิจกรรมที่เกี่ยวข้องกับนิยายเรื่องใดเรื่องหนึ่ง" });
ActivityHistorySchema.index({ "context.episodeId": 1, timestamp: -1 });
ActivityHistorySchema.index({ "context.targetUserId": 1, timestamp: -1 });
ActivityHistorySchema.index({ timestamp: 1 }, { comment: "Index พื้นฐานบน timestamp, อาจมีประโยชน์สำหรับ time-range queries ทั่วไป" });
// หมายเหตุ: หากมีข้อมูล activity ปริมาณมหาศาล อาจพิจารณาใช้ MongoDB Time-series collections ในอนาคต

// ----- Static Methods -----
// Method สำหรับสร้าง log กิจกรรมได้ง่ายขึ้นและมีความสอดคล้องกัน
ActivityHistorySchema.statics.logActivity = async function (
  params: {
    userId: Types.ObjectId;
    activityType: ActivityType;
    context?: IActivityContext; // สามารถส่ง ipAddress, userAgent มาในนี้ได้เลย
    description?: string; // ถ้าไม่ระบุ จะพยายามสร้างจาก activityType และ context
    isVisibleOnProfile?: boolean;
  }
): Promise<IActivityHistory> {
  const { userId, activityType, context = {}, description, isVisibleOnProfile = true } = params;

  // TODO: Implement more sophisticated description generation based on activityType and context
  // ตัวอย่างการสร้าง description อัตโนมัติ (ควรทำให้ครอบคลุมและเป็นภาษาไทยที่สละสลวย)
  let autoDescription = description;
  if (!autoDescription) {
    switch (activityType) {
      case ActivityType.ACCOUNT_USER_LOGGED_IN:
        autoDescription = "ผู้ใช้เข้าสู่ระบบ";
        break;
      case ActivityType.CONTENT_READING_NOVEL_STARTED:
        autoDescription = `เริ่มอ่านนิยาย${context.novelTitle ? ": '" + context.novelTitle + "'" : ""}`;
        break;
      case ActivityType.SOCIAL_COMMENT_POSTED:
        autoDescription = `แสดงความคิดเห็น${context.novelTitle ? "ในนิยาย '" + context.novelTitle + "'" : (context.episodeTitle ? "ในตอน '" + context.episodeTitle + "'" : "")}`;
        break;
      // ... เพิ่ม case อื่นๆ ตามความเหมาะสม ...
      default:
        autoDescription = `ทำกิจกรรมประเภท: ${activityType}`;
    }
  }

  const activity = new this({
    user: userId,
    activityType,
    timestamp: new Date(), // เวลาปัจจุบัน (UTC)
    context,
    description: autoDescription,
    isVisibleOnProfile,
  });
  return activity.save();
};

// ----- Model Export -----
const ActivityHistoryModel = () => 
  models.ActivityHistory as mongoose.Model<IActivityHistory, {}, {}, {}, mongoose.Schema<IActivityHistory>> || 
  model<IActivityHistory>("ActivityHistory", ActivityHistorySchema);

export default ActivityHistoryModel;

// ----- Privacy & Security Notes -----
/**
 * การจัดการข้อมูลส่วนบุคคล (PII) และข้อมูลละเอียดอ่อน:
 * 1. IP Address (context.ipAddress): 
 *    - วัตถุประสงค์: ใช้สำหรับการตรวจสอบความปลอดภัย, ป้องกันการใช้งานที่ไม่เหมาะสม (fraud detection), และการแก้ไขปัญหาทางเทคนิค (debugging) 
 *    - การจัดเก็บ: ควรเข้ารหัส (hashing หรือ encryption) ก่อนจัดเก็บเสมอ ไม่ควรเก็บเป็น plain text
 *    - การเข้าถึง: จำกัดการเข้าถึงเฉพาะผู้ดูแลระบบหรือทีมที่เกี่ยวข้องเท่านั้น
 *    - การแสดงผล: ห้ามแสดงผล IP Address แก่ผู้ใช้ทั่วไปหรือในส่วนสาธารณะ
 * 2. User Agent (context.userAgent):
 *    - วัตถุประสงค์: ใช้สำหรับการวิเคราะห์แพลตฟอร์มที่ผู้ใช้ใช้งาน (เช่น web, mobile), การปรับปรุง UI/UX, และการแก้ไขปัญหาทางเทคนิค
 *    - การจัดเก็บ: อาจพิจารณาเก็บข้อมูลบางส่วนหรือเข้ารหัสหากมีความกังวลเรื่องความเป็นส่วนตัว
 * 3. Location (context.location):
 *    - วัตถุประสงค์: ใช้สำหรับการปรับเนื้อหาให้เข้ากับท้องถิ่น (localization), การวิเคราะห์ทางสถิติ, หรือการตลาด (ต้องได้รับความยินยอมชัดเจน)
 *    - การจัดเก็บ: เก็บในระดับที่ไม่ละเอียดจนเกินไป (เช่น ประเทศ, เมือง) และต้องได้รับความยินยอมจากผู้ใช้ก่อนเสมอ (opt-in)
 * 4. Session ID (context.sessionId):
 *    - วัตถุประสงค์: ใช้สำหรับเชื่อมโยงกิจกรรมต่างๆ ที่เกิดขึ้นภายใน session การใช้งานเดียวกันของผู้ใช้ เพื่อการวิเคราะห์พฤติกรรมหรือการแก้ไขปัญหา
 *    - การจัดเก็บ: สามารถเก็บเป็น plain text ได้ แต่ควรมีมาตรการป้องกันการเข้าถึงโดยไม่ได้รับอนุญาต
 *
 * การปฏิบัติตามกฎหมายคุ้มครองข้อมูลส่วนบุคคล (เช่น GDPR, PDPA):
 * - กำหนดนโยบายความเป็นส่วนตัว (Privacy Policy) ที่ชัดเจนและแจ้งให้ผู้ใช้ทราบเกี่ยวกับการเก็บรวบรวมและใช้งานข้อมูลกิจกรรม
 * - ให้สิทธิ์ผู้ใช้ในการเข้าถึง, แก้ไข, หรือลบข้อมูลส่วนบุคคลของตนเอง (subject access rights)
 * - ออกแบบระบบให้รองรับการลบข้อมูลตามคำขอ (right to be forgotten) โดยคำนึงถึงผลกระทบต่อข้อมูล analytics
 * - มีมาตรการรักษาความปลอดภัยของข้อมูลที่เหมาะสมเพื่อป้องกันการรั่วไหลหรือการเข้าถึงโดยไม่ได้รับอนุญาต
 */

