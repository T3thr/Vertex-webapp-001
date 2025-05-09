// src/backend/models/ActivityHistory.ts
// ActivityHistory Model - บันทึกกิจกรรมทั้งหมดของผู้ใช้บนแพลตฟอร์ม
// โมเดลประวัติกิจกรรม - บันทึกกิจกรรมทั้งหมดของผู้ใช้บนแพลตฟอร์ม
import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// ประเภทของกิจกรรมที่สามารถบันทึกได้
// ประเภทของกิจกรรมที่สามารถบันทึกได้
export type ActivityType = 
  // User Account Activities
  | "USER_REGISTERED" // ผู้ใช้สมัครสมาชิกใหม่
  | "USER_LOGGED_IN" // ผู้ใช้เข้าสู่ระบบ
  | "USER_LOGGED_OUT" // ผู้ใช้ออกจากระบบ
  | "USER_PROFILE_UPDATED" // ผู้ใช้อัปเดตโปรไฟล์
  | "USER_PASSWORD_CHANGED" // ผู้ใช้เปลี่ยนรหัสผ่าน
  | "USER_EMAIL_VERIFIED" // ผู้ใช้ยืนยันอีเมล
  | "USER_ROLE_CHANGED" // บทบาทผู้ใช้เปลี่ยนแปลง (เช่น Reader -> Writer)
  | "WRITER_APPLICATION_SUBMITTED" // นักเขียนส่งใบสมัคร
  | "WRITER_APPLICATION_APPROVED" // ใบสมัครนักเขียนได้รับการอนุมัติ
  | "WRITER_APPLICATION_REJECTED" // ใบสมัครนักเขียนถูกปฏิเสธ
  | "DONATION_APPLICATION_SUBMITTED" // ส่งใบสมัครขอเปิดรับบริจาค
  | "DONATION_APPLICATION_APPROVED" // ใบสมัครขอเปิดรับบริจาคอนุมัติ
  | "DONATION_APPLICATION_REJECTED" // ใบสมัครขอเปิดรับบริจาคถูกปฏิเสธ
  | "DONATION_SETTINGS_UPDATED" // อัปเดตการตั้งค่าการบริจาค

  // Content Interaction Activities
  | "NOVEL_READ" // อ่านนิยาย (อาจหมายถึงเปิดอ่านตอนแรก)
  | "EPISODE_READ" // อ่านตอนของนิยาย
  | "NOVEL_FOLLOWED" // ติดตามนิยาย
  | "NOVEL_UNFOLLOWED" // เลิกติดตามนิยาย
  | "USER_FOLLOWED" // ติดตามผู้ใช้
  | "USER_UNFOLLOWED" // เลิกติดตามผู้ใช้
  | "COMMENT_CREATED" // สร้างความคิดเห็น
  | "COMMENT_UPDATED" // อัปเดตความคิดเห็น
  | "COMMENT_DELETED" // ลบความคิดเห็น
  | "COMMENT_LIKED" // ชอบความคิดเห็น
  | "COMMENT_UNLIKED" // เลิกชอบความคิดเห็น
  | "RATING_GIVEN" // ให้คะแนน (นิยาย/ตอน)
  | "RATING_UPDATED" // อัปเดตคะแนน
  | "RATING_DELETED" // ลบคะแนน
  | "NOVEL_LIKED" // ชอบนิยาย
  | "NOVEL_UNLIKED" // เลิกชอบนิยาย
  | "EPISODE_LIKED" // ชอบตอน
  | "EPISODE_UNLIKED" // เลิกชอบตอน

  // Content Creation Activities (for Writers)
  | "NOVEL_CREATED" // สร้างนิยายใหม่
  | "NOVEL_UPDATED" // อัปเดตข้อมูลนิยาย
  | "NOVEL_PUBLISHED" // เผยแพร่นิยาย
  | "NOVEL_UNPUBLISHED" // ยกเลิกการเผยแพร่นิยาย
  | "NOVEL_DELETED" // ลบนิยาย
  | "EPISODE_CREATED" // สร้างตอนใหม่
  | "EPISODE_UPDATED" // อัปเดตตอน
  | "EPISODE_PUBLISHED" // เผยแพร่ตอน
  | "EPISODE_UNPUBLISHED" // ยกเลิกการเผยแพร่ตอน
  | "EPISODE_DELETED" // ลบตอน
  | "CHARACTER_CREATED" // สร้างตัวละคร
  | "CHARACTER_UPDATED" // อัปเดตตัวละคร
  | "SCENE_CREATED" // สร้างฉาก
  | "SCENE_UPDATED" // อัปเดตฉาก
  | "STORY_MAP_CREATED" // สร้างแผนผังเนื้อเรื่อง
  | "STORY_MAP_UPDATED" // อัปเดตแผนผังเนื้อเรื่อง

  // Monetary Activities
  | "COIN_PURCHASED" // ซื้อเหรียญ (จาก Payment model)
  | "COIN_SPENT_EPISODE" // ใช้เหรียญซื้อตอน
  | "COIN_SPENT_DONATION_WRITER" // ใช้เหรียญบริจาคให้นักเขียน
  | "COIN_SPENT_DONATION_NOVEL" // ใช้เหรียญบริจาคให้นิยาย
  | "COIN_SPENT_DONATION_CHARACTER" // ใช้เหรียญบริจาคให้ตัวละคร
  | "COIN_EARNED_WRITER_SALE" // นักเขียนได้รับเหรียญจากการขายตอน
  | "COIN_EARNED_WRITER_DONATION" // นักเขียนได้รับเหรียญจากการบริจาค
  | "COIN_REFUNDED" // ได้รับเหรียญคืน

  // Gamification Activities
  | "ACHIEVEMENT_UNLOCKED" // ปลดล็อคความสำเร็จ
  | "BADGE_EARNED" // ได้รับเหรียญตรา
  | "LEVEL_UP" // เลื่อนระดับ

  // Other Activities
  | "SEARCH_PERFORMED" // ทำการค้นหา
  | "NOTIFICATION_SETTINGS_UPDATED" // อัปเดตการตั้งค่าการแจ้งเตือน
  | "PRIVACY_SETTINGS_UPDATED"; // อัปเดตการตั้งค่าความเป็นส่วนตัว

// Interface สำหรับ ActivityHistory document
// อินเทอร์เฟซสำหรับเอกสารประวัติกิจกรรม
export interface IActivityHistory extends Document {
  user: Types.ObjectId; // ผู้ใช้ที่ทำกิจกรรม (อ้างอิง User model)
  activityType: ActivityType; // ประเภทของกิจกรรม
  message?: string; // ข้อความสรุปกิจกรรม (เช่น "User A commented on Novel B") - สร้างขึ้นเพื่อให้อ่านง่าย
  // รายละเอียดเพิ่มเติมเกี่ยวกับกิจกรรม (ขึ้นอยู่กับ activityType)
  // รายละเอียดเพิ่มเติมเกี่ยวกับกิจกรรม (ขึ้นอยู่กับ activityType)
  details?: {
    // General details
    ipAddress?: string; // IP Address ของผู้ใช้ (ควรพิจารณาเรื่อง GDPR/PDPA)
    userAgent?: string; // User Agent ของ browser/device
    // Content related
    novelId?: Types.ObjectId; // ID ของนิยายที่เกี่ยวข้อง (อ้างอิง Novel model)
    episodeId?: Types.ObjectId; // ID ของตอนที่เกี่ยวข้อง (อ้างอิง Episode model)
    characterId?: Types.ObjectId; // ID ของตัวละครที่เกี่ยวข้อง (อ้างอิง Character model)
    commentId?: Types.ObjectId; // ID ของความคิดเห็นที่เกี่ยวข้อง (อ้างอิง Comment model)
    ratingId?: Types.ObjectId; // ID ของเรตติ้งที่เกี่ยวข้อง (อ้างอิง Rating model)
    targetUserId?: Types.ObjectId; // ID ของผู้ใช้เป้าหมาย (เช่น ในการติดตาม, การบริจาค) (อ้างอิง User model)
    // Monetary related
    amountCoin?: number; // จำนวนเหรียญที่เกี่ยวข้อง
    amountRealMoney?: number; // จำนวนเงินจริงที่เกี่ยวข้อง (ถ้ามี)
    currencyRealMoney?: string; // สกุลเงินจริง (เช่น THB, USD)
    paymentId?: Types.ObjectId; // ID ของการชำระเงิน (อ้างอิง Payment model)
    purchaseId?: Types.ObjectId; // ID ของการซื้อ (อ้างอิง Purchase model)
    donationId?: Types.ObjectId; // ID ของการบริจาค (อ้างอิง Donation model)
    // Gamification related
    achievementId?: Types.ObjectId; // ID ของ Achievement ที่ปลดล็อค
    badgeId?: Types.ObjectId; // ID ของ Badge ที่ได้รับ
    levelReached?: number; // ระดับที่ไปถึง
    // Search related
    searchQuery?: string; // คำค้นหา
    // Other specific details
    previousValue?: any; // ค่าก่อนหน้า (สำหรับการเปลี่ยนแปลง)
    newValue?: any; // ค่าใหม่ (สำหรับการเปลี่ยนแปลง)
    [key: string]: any; // อนุญาตให้มี field อื่นๆ เพิ่มเติมได้ตามต้องการ
  };
  createdAt: Date; // วันที่และเวลาที่เกิดกิจกรรม
}

const ActivityHistorySchema = new Schema<IActivityHistory>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "ต้องระบุผู้ใช้สำหรับกิจกรรม"],
      index: true,
    },
    activityType: {
      type: String,
      required: [true, "ต้องระบุประเภทของกิจกรรม"],
      enum: [
        "USER_REGISTERED", "USER_LOGGED_IN", "USER_LOGGED_OUT", "USER_PROFILE_UPDATED", "USER_PASSWORD_CHANGED", "USER_EMAIL_VERIFIED", "USER_ROLE_CHANGED",
        "WRITER_APPLICATION_SUBMITTED", "WRITER_APPLICATION_APPROVED", "WRITER_APPLICATION_REJECTED",
        "DONATION_APPLICATION_SUBMITTED", "DONATION_APPLICATION_APPROVED", "DONATION_APPLICATION_REJECTED", "DONATION_SETTINGS_UPDATED",
        "NOVEL_READ", "EPISODE_READ", "NOVEL_FOLLOWED", "NOVEL_UNFOLLOWED", "USER_FOLLOWED", "USER_UNFOLLOWED",
        "COMMENT_CREATED", "COMMENT_UPDATED", "COMMENT_DELETED", "COMMENT_LIKED", "COMMENT_UNLIKED",
        "RATING_GIVEN", "RATING_UPDATED", "RATING_DELETED", "NOVEL_LIKED", "NOVEL_UNLIKED", "EPISODE_LIKED", "EPISODE_UNLIKED",
        "NOVEL_CREATED", "NOVEL_UPDATED", "NOVEL_PUBLISHED", "NOVEL_UNPUBLISHED", "NOVEL_DELETED",
        "EPISODE_CREATED", "EPISODE_UPDATED", "EPISODE_PUBLISHED", "EPISODE_UNPUBLISHED", "EPISODE_DELETED",
        "CHARACTER_CREATED", "CHARACTER_UPDATED", "SCENE_CREATED", "SCENE_UPDATED", "STORY_MAP_CREATED", "STORY_MAP_UPDATED",
        "COIN_PURCHASED", "COIN_SPENT_EPISODE", "COIN_SPENT_DONATION_WRITER", "COIN_SPENT_DONATION_NOVEL", "COIN_SPENT_DONATION_CHARACTER",
        "COIN_EARNED_WRITER_SALE", "COIN_EARNED_WRITER_DONATION", "COIN_REFUNDED",
        "ACHIEVEMENT_UNLOCKED", "BADGE_EARNED", "LEVEL_UP",
        "SEARCH_PERFORMED", "NOTIFICATION_SETTINGS_UPDATED", "PRIVACY_SETTINGS_UPDATED"
      ],
      index: true,
    },
    message: { type: String, trim: true, maxlength: [500, "ข้อความสรุปกิจกรรมต้องไม่เกิน 500 ตัวอักษร"] },
    details: {
      type: Schema.Types.Mixed, // ใช้ Mixed type เพื่อความยืดหยุ่น แต่ควรระมัดระวังในการ query
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // เก็บบันทึกเฉพาะ createdAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----- Indexes -----
// Index สำหรับการ query ประวัติกิจกรรมของผู้ใช้ตามเวลา
// Index สำหรับการ query ประวัติกิจกรรมของผู้ใช้ตามเวลา
ActivityHistorySchema.index({ user: 1, createdAt: -1 });
// Index สำหรับการ query ตามประเภทกิจกรรมและเวลา
// Index สำหรับการ query ตามประเภทกิจกรรมและเวลา
ActivityHistorySchema.index({ activityType: 1, createdAt: -1 });
// Index สำหรับการ query กิจกรรมที่เกี่ยวข้องกับ Novel หรือ Episode
// Index สำหรับการ query กิจกรรมที่เกี่ยวข้องกับ Novel หรือ Episode
ActivityHistorySchema.index({ "details.novelId": 1, createdAt: -1 }, { sparse: true });
ActivityHistorySchema.index({ "details.episodeId": 1, createdAt: -1 }, { sparse: true });
ActivityHistorySchema.index({ user: 1, activityType: 1, "details.novelId": 1, createdAt: -1 }, { sparse: true });
ActivityHistorySchema.index({ user: 1, activityType: 1, "details.episodeId": 1, createdAt: -1 }, { sparse: true });

// ----- Model Export -----
// รูปแบบนี้ช่วยให้มั่นใจว่าโมเดลจะไม่ถูกคอมไพล์ซ้ำในโหมด dev ของ Next.js
// รูปแบบนี้ช่วยให้มั่นใจว่าโมเดลจะไม่ถูกคอมไพล์ซ้ำในโหมด dev ของ Next.js
const ActivityHistoryModel = () => models.ActivityHistory as mongoose.Model<IActivityHistory> || model<IActivityHistory>("ActivityHistory", ActivityHistorySchema);

export default ActivityHistoryModel;

