// src/backend/models/UserTracking.ts

// SECTION: Imports
import mongoose, { Schema, Document, Types, Model } from 'mongoose';
import { IUser } from './User';

// SECTION: Type Definitions and Interfaces

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
  totalTimeSpentReadingSeconds: number; // เวลารวมที่ใช้ในการอ่าน (วินาที)
  totalCoinSpent: number; // เหรียญทั้งหมดที่ใช้จ่าย
  totalRealMoneySpent: number; // เงินจริงทั้งหมดที่ใช้จ่าย
  lastNovelReadId?: Types.ObjectId; // ID นิยายที่อ่านล่าสุด
  lastNovelReadAt?: Date; // วันที่อ่านนิยายล่าสุด
  joinDate: Date; // วันที่สมัคร
  firstLoginAt?: Date; // วันที่ล็อกอินครั้งแรก
}

/**
 * @interface IUserTrackingDoc
 * @description เอกสาร Mongoose สำหรับ UserTracking
 * @extends Document
 */
export interface IUserTrackingDoc extends Document {
  userId: Types.ObjectId; // ID ของผู้ใช้ (FK to Users collection)
  trackingStats: IUserTrackingStats; // ข้อมูลสถิติการใช้งาน

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * @interface IUserTracking
 * @description อินเทอร์เฟซสำหรับข้อมูลการติดตามการใช้งานของผู้ใช้
 * @property {Types.ObjectId | IUser} userId: ID ของผู้ใช้ (Foreign Key to User)
 * @property {IUserTrackingStats} trackingStats: Object ที่เก็บสถิติการใช้งานต่างๆ
 */
export interface IUserTracking extends Document {
  userId: Types.ObjectId | IUser; // Foreign key to the User collection
  trackingStats: IUserTrackingStats; // Embedded document for usage statistics

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// SECTION: Mongoose Schema

const UserTrackingSchema = new Schema<IUserTrackingDoc, Model<IUserTrackingDoc>>({
  // SECTION: Core Fields
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'จำเป็นต้องมี ID ผู้ใช้'],
    unique: true,
    index: true, // สร้าง index เพื่อการ join และค้นหาที่รวดเร็ว
  },

  // SECTION: Embedded Tracking Stats Data
  trackingStats: {
    totalLoginDays: { type: Number, default: 0, min: 0 },
    totalNovelsRead: { type: Number, default: 0, min: 0 },
    totalEpisodesRead: { type: Number, default: 0, min: 0 },
    totalTimeSpentReadingSeconds: { type: Number, default: 0, min: 0 },
    totalCoinSpent: { type: Number, default: 0, min: 0 },
    totalRealMoneySpent: { type: Number, default: 0, min: 0 },
    lastNovelReadId: { type: Schema.Types.ObjectId, ref: 'Novel' },
    lastNovelReadAt: { type: Date },
    joinDate: { type: Date, required: true },
    firstLoginAt: { type: Date },
  }
}, {
  // SECTION: Schema Options
  timestamps: true, // เปิดใช้งาน createdAt และ updatedAt อัตโนมัติ
  collection: 'user_trackings', // กำหนดชื่อ collection ให้ชัดเจน
  autoIndex: process.env.NODE_ENV !== 'production',
});

// SECTION: Indexes
UserTrackingSchema.index({ 'trackingStats.lastNovelReadAt': -1 }); // Index สำหรับค้นหาผู้ใช้ที่ Active ล่าสุด

// SECTION: Middleware (Hooks)
UserTrackingSchema.pre('save', function(next) {
  // Middleware นี้สามารถใช้เพื่อคำนวณค่าสถิติบางอย่างก่อนบันทึก
  // เช่น ตรวจสอบว่า firstLoginAt ถูกตั้งค่าแล้วหรือยัง
  if (this.isNew && !this.trackingStats.firstLoginAt) {
      // สามารถตั้งค่า default จากที่อื่นได้ แต่ตัวอย่างนี้คือการป้องกันค่า null
      // this.trackingStats.firstLoginAt = new Date();
  }
  next();
});

// SECTION: Statics and Methods
UserTrackingSchema.statics.incrementEpisodesRead = async function(userId: Types.ObjectId, timeSpentSeconds: number): Promise<IUserTrackingDoc | null> {
  return this.findOneAndUpdate(
    { userId },
    {
      $inc: {
        'trackingStats.totalEpisodesRead': 1,
        'trackingStats.totalTimeSpentReadingSeconds': timeSpentSeconds,
      },
      $set: {
        'trackingStats.lastNovelReadAt': new Date(),
      }
    },
    { new: true, upsert: true } // upsert: true จะสร้างเอกสารใหม่หากยังไม่มี
  );
};

// SECTION: Virtuals
// ตัวอย่าง virtual field คำนวณเวลาอ่านเฉลี่ยต่อตอน
UserTrackingSchema.virtual('trackingStats.averageTimePerEpisodeSeconds').get(function() {
  if (!this.trackingStats.totalEpisodesRead || this.trackingStats.totalEpisodesRead === 0) {
    return 0;
  }
  return this.trackingStats.totalTimeSpentReadingSeconds / this.trackingStats.totalEpisodesRead;
});

// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// 1.  **Granularity:** สถิติในโมเดลนี้เป็นแบบสรุปรวม (Summary) หากในอนาคตต้องการเก็บข้อมูลการอ่านที่ละเอียดกว่านี้ (เช่น อ่านหน้าไหน, ใช้เวลาแต่ละหน้าเท่าไหร่) ควรสร้าง Collection ใหม่สำหรับเก็บ Event Stream (เช่น `ReadingAnalytic_EventStream`) เพื่อไม่ให้เอกสารนี้ใหญ่เกินไป
// 2.  **Data Update:** การอัปเดตสถิติ (เช่น `totalTimeSpentReadingSeconds`) ควรเกิดขึ้นผ่าน Service ที่ควบคุมตรรกะทางธุรกิจอย่างชัดเจน เพื่อป้องกันการอัปเดตที่ไม่ถูกต้องโดยตรงจากหลายๆ ที่
// 3.  **Historical Data:** โมเดลนี้เก็บแค่ค่าล่าสุด หากต้องการวิเคราะห์แนวโน้มการใช้งานของผู้ใช้ในอดีต (เช่น จำนวนตอนที่อ่านในแต่ละเดือน) จำเป็นต้องมีระบบ Data Warehousing หรือการทำ Snapshot ข้อมูลเป็นระยะๆ
// 4.  **Join Date:** `joinDate` ถูกเก็บไว้ที่นี่เพื่อความสะดวกในการคำนวณสถิติบางอย่างที่อาจเกี่ยวกับอายุของบัญชี แต่ข้อมูลหลัก (Source of Truth) ของวันที่สมัครควรอยู่ที่ `Users` collection ใน field `createdAt`

// SECTION: Model Export
const UserTracking = (mongoose.models.UserTracking as Model<IUserTrackingDoc, {}, {}>) || mongoose.model<IUserTrackingDoc>('UserTracking', UserTrackingSchema);

export default UserTracking;
