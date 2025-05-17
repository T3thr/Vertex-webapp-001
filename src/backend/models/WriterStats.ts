// src/backend//models/WriterStats.ts
// โมเดลสถิตินักเขียน (WriterStats Model) - จัดเก็บข้อมูลสถิติที่เกี่ยวข้องกับผลงานและกิจกรรมของนักเขียนโดยเฉพาะ
// ออกแบบให้เป็นส่วนหนึ่งของ User model (ผ่าน sub-document) หรือเป็น collection แยกที่อ้างอิง User._id
// ในที่นี้จะออกแบบเป็น schema ที่สามารถนำไปใช้เป็น sub-document ใน User model ได้ เพื่อความสะดวกในการ query ข้อมูลนักเขียน

import mongoose, { Schema, Types } from "mongoose";

// อินเทอร์เฟซสำหรับสถิติผลงานนิยาย (Novel Performance Stats)
export interface INovelPerformanceStats {
  novelId: Types.ObjectId; // ID ของนิยาย
  novelTitle: string; // ชื่อนิยาย (denormalized)
  totalViews: number;
  totalReads: number; // จำนวนครั้งที่ถูกอ่านจนจบ หรือถึง % ที่กำหนด
  totalLikes: number;
  totalComments: number;
  totalFollowers: number; // จำนวนผู้ติดตามนิยายเรื่องนี้
  averageRating?: number;
  totalEarningsFromNovel?: number; // รายได้รวมจากนิยายเรื่องนี้ (ถ้ามีการติดตาม)
  // lastUpdated: Date; // วันที่อัปเดตสถิตินี้ล่าสุด
}

// อินเทอร์เฟซหลักสำหรับสถิตินักเขียน (WriterStats)
// นี่คือ Schema ที่จะถูกฝัง (embed) หรืออ้างอิงใน User model
export interface IWriterStats {
  totalNovelsPublished: number; // จำนวนนิยายทั้งหมดที่เผยแพร่
  totalEpisodesPublished: number; // จำนวนตอนทั้งหมดที่เผยแพร่
  
  // สถิติการมีส่วนร่วมโดยรวม (across all novels by this writer)
  totalViewsAcrossAllNovels: number;
  totalReadsAcrossAllNovels: number;
  totalLikesReceivedOnNovels: number;
  totalCommentsReceivedOnNovels: number;
  // totalNovelFollowers: number; // ผลรวมผู้ติดตามของทุกนิยาย (อาจซ้ำซ้อนกับ User.socialStats.followersCount ถ้า follower ของนักเขียนนับรวมจากนิยาย)
  
  // สถิติรายได้ (denormalized summary, รายละเอียดอยู่ใน EarningAnalytic)
  totalEarningsToDate: number; // รายได้รวมทั้งหมด (สกุลเงินหลัก เช่น THB)
  totalCoinsReceived: number; // เหรียญที่ได้รับจากการสนับสนุน (ถ้ามี)
  totalRealMoneyReceived: number; // เงินจริงที่ได้รับจากการสนับสนุน/ขาย (สกุลเงินหลัก)
  totalDonationsReceived: number; // จำนวนครั้งที่ได้รับการสนับสนุน
  
  // สถิติผู้ติดตามนักเขียน (อาจซ้ำกับ User.socialStats แต่แยกไว้เพื่อความชัดเจนของ writer-specific stats)
  // currentWriterFollowers: number; // จำนวนผู้ติดตามนักเขียนคนนี้โดยตรง
  
  // สถิติผลงานรายนิยาย (อาจเก็บ top N หรือ link ไปยัง collection แยกถ้าเยอะมาก)
  // novelPerformanceSummaries?: Types.DocumentArray<INovelPerformanceStats>;
  
  // สถิติการสมัครเป็นนักเขียน (ถ้ามีกระบวนการสมัคร)
  // applicationStatus?: "not_applied" | "pending_review" | "approved" | "rejected";
  // writerSince?: Date; // วันที่ได้รับการอนุมัติเป็นนักเขียน
  
  lastNovelPublishedAt?: Date;
  lastEpisodePublishedAt?: Date;
  // lastEarningActivityAt?: Date;
  // lastWithdrawalAt?: Date;
  
  // อาจมี ranking หรือ tier ของนักเขียน (ถ้ามีระบบนี้)
  // writerTier?: string;
  // writerRank?: number;
}

// Schema ย่อยสำหรับ INovelPerformanceStats (ถ้าจะ embed)
const NovelPerformanceStatsSchema = new Schema<INovelPerformanceStats>(
  {
    novelId: { type: Schema.Types.ObjectId, ref: "Novel", required: true },
    novelTitle: { type: String, required: true, trim: true },
    totalViews: { type: Number, default: 0, min: 0 },
    totalReads: { type: Number, default: 0, min: 0 },
    totalLikes: { type: Number, default: 0, min: 0 },
    totalComments: { type: Number, default: 0, min: 0 },
    totalFollowers: { type: Number, default: 0, min: 0 },
    averageRating: { type: Number, min: 0, max: 5 }, // หรือตามระบบ rating
    totalEarningsFromNovel: { type: Number, default: 0, min: 0 },
    // lastUpdated: { type: Date, default: Date.now }
  },
  { _id: false }
);

// Schema หลักสำหรับ WriterStats (สำหรับใช้เป็น sub-document ใน User model)
export const WriterStatsSchema = new Schema<IWriterStats>(
  {
    totalNovelsPublished: { type: Number, default: 0, min: 0 },
    totalEpisodesPublished: { type: Number, default: 0, min: 0 },
    totalViewsAcrossAllNovels: { type: Number, default: 0, min: 0 },
    totalReadsAcrossAllNovels: { type: Number, default: 0, min: 0 },
    totalLikesReceivedOnNovels: { type: Number, default: 0, min: 0 },
    totalCommentsReceivedOnNovels: { type: Number, default: 0, min: 0 },
    totalEarningsToDate: { type: Number, default: 0, min: 0 }, // สกุลเงิน THB (หรือสกุลเงินหลักของระบบ)
    totalCoinsReceived: { type: Number, default: 0, min: 0 },
    totalRealMoneyReceived: { type: Number, default: 0, min: 0 }, // สกุลเงิน THB (หรือสกุลเงินหลักของระบบ)
    totalDonationsReceived: { type: Number, default: 0, min: 0 },
    // currentWriterFollowers: { type: Number, default: 0, min: 0 }, // อาจดึงจาก User.socialStats.followersCount
    // novelPerformanceSummaries: [NovelPerformanceStatsSchema], // อาจมี $slice เพื่อจำกัดจำนวน
    // applicationStatus: { type: String, enum: ["not_applied", "pending_review", "approved", "rejected"], default: "not_applied" },
    // writerSince: Date,
    lastNovelPublishedAt: Date,
    lastEpisodePublishedAt: Date,
    // writerTier: { type: String, trim: true },
    // writerRank: { type: Number, min: 0 },
  },
  { _id: false } // ไม่สร้าง _id สำหรับ sub-document นี้โดยอัตโนมัติ
);

// ไม่มีการ export model โดยตรงจากไฟล์นี้ เนื่องจาก schema นี้มีไว้เพื่อใช้เป็นส่วนหนึ่งของ User model
// การอัปเดตสถิติเหล่านี้จะเกิดขึ้นผ่าน middleware หรือ logic ในส่วนที่เกี่ยวข้อง
// เช่น เมื่อมีการ publish novel/episode, เมื่อมีการ like/comment, เมื่อมี earning transaction

// ตัวอย่างการใช้งานใน User.ts:
// import { IWriterStats, WriterStatsSchema } from './WriterStats';
// ...
// export interface IUser extends Document {
//   ...
//   writerStats?: IWriterStats; // สำหรับผู้ใช้ที่เป็นนักเขียน
//   isWriter: boolean;
// }
// ...
// const UserSchema = new Schema<IUser>(
//   {
//     ...
//     writerStats: WriterStatsSchema,
//     isWriter: { type: Boolean, default: false, index: true },
//   }
// );

// หมายเหตุ: การตัดสินใจว่าจะ embed หรือใช้ collection แยกสำหรับ WriterStats ขึ้นอยู่กับ
// 1. ขนาดของข้อมูล: ถ้า novelPerformanceSummaries มีจำนวนมาก การแยก collection อาจดีกว่า
// 2. ความถี่ในการ query: ถ้า query writer stats บ่อยๆ พร้อม user data การ embed อาจเร็วกว่า
// 3. ความซับซ้อนในการอัปเดต: การอัปเดต sub-document ที่ซับซ้อนอาจยุ่งยากกว่า collection แยก
// สำหรับ NovelMaze ที่เน้น performance และ scalability, ถ้า novelPerformanceSummaries จะมีข้อมูลเยอะมาก
// อาจพิจารณาเก็บ WriterStats หลักๆ embed ไว้ และมี collection `NovelPerformanceDailyStats` แยกต่างหาก
// ที่ update ด้วย background job เพื่อไม่ให้ User document ใหญ่เกินไป
// ในที่นี้ WriterStatsSchema ออกแบบมาให้ค่อนข้างกระชับ สามารถ embed ได้

