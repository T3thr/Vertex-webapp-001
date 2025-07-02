// src/backend/models/WriterStats.ts
// โมเดลสถิตินักเขียน (WriterStats Model) - Writer Dashboard & Monetization Data
// ตามมาตรฐาน DivWy (Modularized Architecture)
//
// **ปรัชญาการออกแบบ:**
// โมเดลนี้ถูกสร้างขึ้นเพื่อรวมศูนย์ข้อมูลทั้งหมดที่จำเป็นสำหรับ "แดชบอร์ดของนักเขียน"
// และการจัดการด้านการสร้างรายได้ การแยกข้อมูลส่วนนี้ออกมาจาก Core User Model มีจุดประสงค์เพื่อ:
// 1.  **ลดความเบาบางของข้อมูล (Reduce Sparsity):** ไม่ใช่ผู้ใช้ทุกคนที่เป็นนักเขียน การเก็บข้อมูลส่วนนี้แยกออกมาทำให้ Core User Model กระชับ
// 2.  **Bounded Context:** สร้างขอบเขตความรับผิดชอบที่ชัดเจนสำหรับ "Writer Service" หรือ "Monetization Service"
// 3.  **Performance Isolation:** ข้อมูลสถิตินักเขียน (เช่น ยอดวิว, รายได้) มักจะถูกอัปเดตโดย Background Jobs เป็นประจำ การแยก Collection ช่วยลด Write Contention บน Collection หลัก (Users)
// 4.  **Maintainability:** ง่ายต่อการพัฒนาและดูแลฟีเจอร์ที่เกี่ยวข้องกับนักเขียนโดยเฉพาะ โดยไม่กระทบส่วนอื่น
//
// **ข้อมูลที่เก็บในโมเดลนี้ (Warm/Cold Data):**
// - สถิติโดยรวมของนักเขียน (ยอดวิว, ยอดไลค์, รายได้รวม)
// - สรุปผลงานรายนิยาย (Denormalized เพื่อการแสดงผลที่รวดเร็วในแดชบอร์ด)
// - การตั้งค่าการรับบริจาค
// - ข้อมูลการสมัครเป็นนักเขียน
//
// อัปเดตล่าสุด: Created as part of the modular architecture refactor.

import mongoose, { Schema, model, models, Document, Types } from "mongoose";

// ==================================================================================================
// SECTION: อินเทอร์เฟซย่อย (Sub-Interfaces) สำหรับ WriterStats
// ==================================================================================================

/**
 * @interface INovelPerformanceStats
 * @description สถิติผลงานนิยายแต่ละเรื่องของนักเขียน (เหมือนใน User.ts เดิม)
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
  totalChapters?: number;
}

/**
 * @interface IActiveNovelPromotionSummary
 * @description ข้อมูลสรุปสำหรับนิยายที่กำลังจัดโปรโมชัน (เหมือนใน User.ts เดิม)
 */
export interface IActiveNovelPromotionSummary {
  novelId: Types.ObjectId;
  novelTitle: string;
  promotionDescription?: string;
  promotionalPriceCoins?: number;
  promotionEndDate?: Date;
}

/**
 * @interface ITrendingNovelSummary
 * @description ข้อมูลสรุปสำหรับนิยายที่กำลังเป็นที่นิยม (เหมือนใน User.ts เดิม)
 */
export interface ITrendingNovelSummary {
  novelId: Types.ObjectId;
  novelTitle: string;
  trendingScore?: number;
  coverImageUrl?: string;
  viewsLast24h?: number;
  likesLast24h?: number;
}

/**
 * @interface IUserDonationSettings
 * @description การตั้งค่าเกี่ยวกับการรับบริจาคของผู้ใช้ (สำหรับนักเขียน)
 */
export interface IUserDonationSettings {
    activeAuthorDirectDonationAppId?: Types.ObjectId;
    isEligibleForDonation: boolean;
}

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสารสถิตินักเขียน (IWriterStatsDoc Document Interface)
// ==================================================================================================

/**
 * @interface IWriterStatsDoc
 * @extends Document
 * @description อินเทอร์เฟซสำหรับเอกสารใน Collection "writerstats"
 * @property {Types.ObjectId} userId - ID ของผู้ใช้ที่อ้างอิงถึง Collection 'users' (Foreign Key)
 * @property {number} totalNovelsPublished - จำนวนนิยายทั้งหมดที่เผยแพร่
 * @property {number} totalEpisodesPublished - จำนวนตอนทั้งหมดที่เผยแพร่
 * @property {number} totalViewsAcrossAllNovels - ยอดเข้าชมรวมทุกนิยาย
 * @property {number} totalLikesReceivedOnNovels - ยอดไลค์รวมที่ได้รับในทุกนิยาย
 * @property {number} totalCommentsReceivedOnNovels - ยอดคอมเมนต์รวมที่ได้รับในทุกนิยาย
 * @property {number} totalEarningsToDate - รายได้รวมทั้งหมด
 * @property {Types.DocumentArray<INovelPerformanceStats>} [novelPerformanceSummaries] - สรุปผลงานรายนิยาย
 * @property {IActiveNovelPromotionSummary[]} [activeNovelPromotions] - โปรโมชันที่กำลังใช้งาน
 * @property {ITrendingNovelSummary[]} [trendingNovels] - นิยายที่กำลังเป็นที่นิยม
 * @property {Date} [writerSince] - วันที่ได้รับการอนุมัติเป็นนักเขียน
 * @property {Date} [lastNovelPublishedAt] - วันที่เผยแพร่นิยายเรื่องล่าสุด
 * @property {Date} [lastEpisodePublishedAt] - วันที่เผยแพร่ตอนล่าสุด
 * @property {number} [writerRank] - อันดับของนักเขียน (ตามผลงาน)
 * @property {IUserDonationSettings} donationSettings - การตั้งค่าการรับบริจาค
 * @property {Types.ObjectId} [writerApplicationId] - ID ใบสมัครนักเขียนล่าสุด
 */
export interface IWriterStatsDoc extends Document {
  userId: Types.ObjectId;
  totalNovelsPublished: number;
  totalEpisodesPublished: number;
  totalViewsAcrossAllNovels: number;
  totalReadsAcrossAllNovels: number;
  totalLikesReceivedOnNovels: number;
  totalCommentsReceivedOnNovels: number;
  totalEarningsToDate: number;
  totalCoinsReceived: number;
  totalRealMoneyReceived: number;
  totalDonationsReceived: number;
  novelPerformanceSummaries: Types.DocumentArray<INovelPerformanceStats>;
  activeNovelPromotions: Types.DocumentArray<IActiveNovelPromotionSummary>;
  trendingNovels: Types.DocumentArray<ITrendingNovelSummary>;
  writerSince?: Date;
  lastNovelPublishedAt?: Date;
  lastEpisodePublishedAt?: Date;
  writerRank?: number;
  donationSettings: IUserDonationSettings;
  writerApplicationId?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

// ==================================================================================================
// SECTION: Schema ย่อย (Sub-Schemas) สำหรับ Mongoose
// ==================================================================================================

const NovelPerformanceStatsSchema = new Schema<INovelPerformanceStats>(
  {
    novelId: { type: Schema.Types.ObjectId, ref: "Novel", required: true, comment: "ID ของนิยาย" },
    novelTitle: { type: String, required: true, trim: true, maxlength: 255, comment: "ชื่อนิยาย (Denormalized)" },
    totalViews: { type: Number, default: 0, min: 0, comment: "ยอดเข้าชมทั้งหมด" },
    totalReads: { type: Number, default: 0, min: 0, comment: "ยอดอ่านจบ" },
    totalLikes: { type: Number, default: 0, min: 0, comment: "ยอดไลค์ทั้งหมด" },
    totalComments: { type: Number, default: 0, min: 0, comment: "ยอดคอมเมนต์ทั้งหมด" },
    totalFollowers: { type: Number, default: 0, min: 0, comment: "ผู้ติดตามนิยายนี้" },
    averageRating: { type: Number, min: 0, max: 5, comment: "คะแนนเฉลี่ย" },
    totalEarningsFromNovel: { type: Number, default: 0, min: 0, comment: "รายได้จากนิยายนี้" },
    totalChapters: { type: Number, min: 0, comment: "จำนวนตอนทั้งหมด" },
  },
  { _id: false }
);

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

const UserDonationSettingsSchema = new Schema<IUserDonationSettings>(
  {
    activeAuthorDirectDonationAppId: { type: Schema.Types.ObjectId, ref: "DonationApplication", comment: "ID ใบคำขอรับบริจาคที่ใช้งานอยู่" },
    isEligibleForDonation: { type: Boolean, default: false, required: true, comment: "มีคุณสมบัติรับบริจาคหรือไม่" },
  },
  { _id: false }
);

// ==================================================================================================
// SECTION: Schema หลักสำหรับ WriterStats (WriterStatsSchema)
// ==================================================================================================

const WriterStatsSchema = new Schema<IWriterStatsDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true, comment: "FK to User collection" },
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
    activeNovelPromotions: { type: [ActiveNovelPromotionSummarySchema], default: [], comment: "รายการสรุปโปรโมชันนิยายที่กำลังใช้งานอยู่" },
    trendingNovels: { type: [TrendingNovelSummarySchema], default: [], comment: "รายการสรุปนิยายที่กำลังเป็นที่นิยม" },
    writerSince: { type: Date, comment: "วันที่เริ่มเป็นนักเขียน" },
    lastNovelPublishedAt: { type: Date, comment: "วันที่เผยแพร่นิยายล่าสุด" },
    lastEpisodePublishedAt: { type: Date, comment: "วันที่เผยแพร่ตอนล่าสุด" },
    writerRank: { type: Number, min: 0, index: true, comment: "อันดับนักเขียน (ตามผลงาน)" },
    donationSettings: { type: UserDonationSettingsSchema, default: () => ({ isEligibleForDonation: false }), required: true },
    writerApplicationId: { type: Schema.Types.ObjectId, ref: "WriterApplication", comment: "ID ของใบสมัครนักเขียนล่าสุดหรือที่เกี่ยวข้อง" },
  },
  {
    timestamps: true,
    collection: "writerstats",
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================
WriterStatsSchema.index({ writerRank: 1 }, { name: "WriterStatsRankIndex" });
WriterStatsSchema.index({ "activeNovelPromotions.novelId": 1 }, { sparse: true, name: "WriterStatsActivePromotionsIndex" });
WriterStatsSchema.index({ "trendingNovels.novelId": 1 }, { sparse: true, name: "WriterStatsTrendingNovelsIndex" });
WriterStatsSchema.index({ "donationSettings.isEligibleForDonation": 1 }, { name: "WriterStatsDonationEligibilityIndex" });

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================
// Middleware สำหรับ Collection นี้อาจไม่จำเป็นมากนัก เนื่องจากการอัปเดตส่วนใหญ่ควรมาจาก
// Service Layer หรือ Background Jobs ที่คำนวณสถิติ อย่างไรก็ตาม สามารถเพิ่ม Logic
// สำหรับการ validate ข้อมูลที่ซับซ้อนได้ที่นี่หากต้องการ
WriterStatsSchema.pre<IWriterStatsDoc>("save", async function (next) {
    // ตัวอย่าง: อาจมีการตรวจสอบความสอดคล้องของข้อมูลบางอย่างในอนาคต
    // เช่น ตรวจสอบว่า novelId ใน novelPerformanceSummaries ยังคงมีอยู่ในระบบจริงๆ
    // แต่การทำเช่นนี้ใน pre-save hook อาจส่งผลต่อ performance
    // การ clean-up ข้อมูลผ่าน background job อาจเป็นทางเลือกที่ดีกว่า
    console.log(`[WriterStats Pre-Save Hook] Saving stats for user ${this.userId}...`);
    next();
});

// ==================================================================================================
// SECTION: Virtuals (ฟิลด์เสมือน)
// ==================================================================================================
// ไม่มี Virtuals ในโมเดลนี้ เนื่องจากข้อมูลส่วนใหญ่เป็นสถิติที่ถูก Denormalize มาแล้ว

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================
const WriterStatsModel = (models.WriterStats as mongoose.Model<IWriterStatsDoc>) || model<IWriterStatsDoc>("WriterStats", WriterStatsSchema);

export default WriterStatsModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Source of Truth for Writer Data:** Collection นี้คือ "แหล่งข้อมูลจริง" (Source of Truth) สำหรับข้อมูลในแดชบอร์ดของนักเขียน
//
// 2.  **Denormalization Management:** ข้อมูลส่วนใหญ่ในโมเดลนี้ เช่น `totalViewsAcrossAllNovels` หรือ `novelPerformanceSummaries`
//     เป็นการ Denormalize ข้อมูลมาจาก Collection อื่น (เช่น Novels, NovelStats, Transactions) เพื่อประสิทธิภาพในการอ่าน
//     -   **กลไกการอัปเดต:** การอัปเดตข้อมูลเหล่านี้ต้องอาศัยกลไกที่ชัดเจน:
//         - **Background Jobs:** วิธีที่แนะนำที่สุด คือการมี Scheduled Job (เช่น ทุกชั่วโมง หรือทุกวัน) ที่จะคำนวณสถิติใหม่ทั้งหมดแล้วมาอัปเดต Collection นี้
//         - **Event-Driven Updates:** ใช้ Event Listener (เช่น เมื่อมีคนกดไลค์นิยาย, ซื้อตอน) เพื่อส่ง Event ไปยัง Queue และให้ Consumer ทำการ `$inc` ค่าสถิติต่างๆ วิธีนี้ Real-time กว่าแต่อาจซับซ้อนกว่า
//
// 3.  **Creation Lifecycle:** เอกสารใน Collection นี้ไม่ควรถูกสร้างขึ้นพร้อมกับ User แต่ควรถูกสร้างโดย "WriterService" หรือ "ApplicationService"
//     ในตอนที่ผู้ใช้ได้รับการอนุมัติให้เป็น "Writer" เท่านั้น ณ เวลานั้น Service จะทำการสร้างเอกสาร `WriterStats` ใหม่โดยมี `userId` อ้างอิงไปยัง User ที่เกี่ยวข้อง
//
// 4.  **Scalability:** การแยก Collection ออกมาทำให้เราสามารถทำ Indexing ที่ซับซ้อนสำหรับข้อมูลนักเขียนได้โดยเฉพาะ
//     เช่น การสร้าง Index บน `writerTier` และ `writerRank` เพื่อรองรับระบบ Leaderboard ของนักเขียน โดยไม่ทำให้ Index ของ Core User Model บวม
//
// 5.  **Data Integrity:** ควรมีกลไกในการตรวจสอบความถูกต้องของข้อมูลที่ Denormalize เป็นครั้งคราว (Data Reconciliation)
//     เช่น มี Job ที่ทำงานรายสัปดาห์เพื่อคำนวณค่าสถิติจาก Source of Truth จริงๆ (เช่น Novel Collection) แล้วนำมาเปรียบเทียบ/แก้ไขข้อมูลใน `WriterStats` ให้ถูกต้อง
//
// 6.  **Relation to Other Models:**
//     -   `userId`: เป็น Foreign Key หลักที่ใช้ในการเชื่อมโยงกลับไปยัง `User` model
//     -   `writerApplicationId`: เป็น Foreign Key ที่เชื่อมไปยัง `WriterApplication` model เพื่อดูประวัติการสมัคร
//     -   `novelPerformanceSummaries.novelId`: อ้างอิงไปยัง `Novel` model
// ==================================================================================================