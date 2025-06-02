// src/backend/models/Rating.ts
// โมเดลการให้คะแนน (Rating Model)
// จัดการการให้คะแนนและรีวิวของผู้ใช้ต่อเนื้อหาต่างๆ เช่น นิยาย, ตอน, หรือฟีเจอร์แพลตฟอร์ม

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IUser } from "./User"; // สำหรับ userId
// Target models (Novel, Episode, etc.) จะถูก resolve ชื่อใน middleware หรือ service layer

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Rating
// ==================================================================================================

/**
 * @enum {string} RateableType
 * @description ประเภทของเนื้อหาที่สามารถให้คะแนนและรีวิวได้
 * - `Novel`: นิยายทั้งหมด
 * - `Episode`: ตอนใดตอนหนึ่งของนิยาย (ถ้าอนุญาตให้คะแนน/รีวิวรายตอน)
 * - `Character`: (อนาคต) ตัวละครในนิยาย
 * - `StoryArc`: (อนาคต) โครงเรื่องหรือเนื้อเรื่องส่วนสำคัญ (Arc) ในนิยาย
 * - `PlatformFeature`: (อนาคต) ฟีเจอร์ของแพลตฟอร์ม DivWy (เช่น UI, editor)
 * - `OfficialMedia`: (อนาคต) สื่อทางการจากคลัง DivWy
 * - `UserGeneratedContent`: (อนาคต) เนื้อหาอื่นๆ ที่ผู้ใช้สร้างขึ้น (เช่น บทความ, fan art ถ้ามีระบบรองรับ)
 */
export enum RateableType {
  NOVEL = "Novel",
  EPISODE = "Episode",
  CHARACTER = "Character",
  STORY_ARC = "StoryArc",
  PLATFORM_FEATURE = "PlatformFeature",
  OFFICIAL_MEDIA = "OfficialMedia",
  USER_GENERATED_CONTENT = "UserGeneratedContent",
}

/**
 * @enum {string} RatingAspect
 * @description ด้านต่างๆ ที่สามารถให้คะแนนได้ (ถ้าต้องการให้คะแนนแบบละเอียดหลายมิติ)
 * - `overall`: คะแนนโดยรวม (ค่า default ถ้าไม่มีการให้คะแนนแยกด้าน)
 * - `story`: เนื้อเรื่อง (ความน่าติดตาม, พล็อต, การดำเนินเรื่อง)
 * - `characters`: ตัวละคร (การพัฒนาตัวละคร, ความน่าสนใจ, ความสัมพันธ์)
 * - `world_building`: การสร้างโลกและบรรยากาศ (ความสมจริง, ความคิดสร้างสรรค์)
 * - `writing_style`: สไตล์การเขียน (ภาษา, การบรรยาย, บทสนทนา)
 * - `artwork`: ภาพประกอบ (ถ้ามีในนิยายหรือสื่อนั้นๆ คุณภาพ, สไตล์)
 * - `music_sound`: เพลงและเสียงประกอบ (ถ้ามี คุณภาพ, การเข้ากับเนื้อหา)
 * - `user_experience`: ประสบการณ์การใช้งาน (สำหรับ PlatformFeature หรือภาพรวมการอ่านนิยาย)
 */
export enum RatingAspect {
  OVERALL = "overall",
  STORY = "story",
  CHARACTERS = "characters",
  WORLD_BUILDING = "world_building",
  WRITING_STYLE = "writing_style",
  ARTWORK = "artwork",
  MUSIC_SOUND = "music_sound",
  USER_EXPERIENCE = "user_experience",
}

/**
 * @interface IRatingScoreDetail
 * @description รายละเอียดคะแนนสำหรับแต่ละด้าน (ถ้าให้คะแนนหลายมิติ)
 * @property {RatingAspect} aspect - ด้านที่ให้คะแนน
 * @property {number} score - คะแนนสำหรับด้านนั้น (เช่น 1-5 หรือ 1-10 ตามที่ออกแบบ)
 */
export interface IRatingScoreDetail {
  aspect: RatingAspect;
  score: number;
}
const RatingScoreDetailSchema = new Schema<IRatingScoreDetail>(
  {
    aspect: {
      type: String,
      enum: Object.values(RatingAspect),
      required: [true, "กรุณาระบุด้านที่ให้คะแนน (Rating aspect is required)"],
    },
    score: {
      type: Number,
      required: [true, "กรุณาระบุคะแนนสำหรับด้านนี้ (Score for aspect is required)"],
      min: [1, "คะแนนต่ำสุดที่สามารถให้ได้คือ 1"],
      max: [5, "คะแนนสูงสุดที่สามารถให้ได้คือ 5"], // ปรับ min/max score ตามที่ออกแบบ (เช่น 1-5, 1-10)
      validate: {
        validator: Number.isInteger, // ตรวจสอบว่าเป็นจำนวนเต็ม
        message: (props: any) => `${props.value} ไม่ใช่คะแนนที่เป็นจำนวนเต็มที่ถูกต้อง!`,
      }
    },
  },
  { _id: false } // ไม่สร้าง _id สำหรับ subdocument นี้
);

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร Rating (IRating Document Interface)
// ==================================================================================================

/**
 * @interface IRating
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารการให้คะแนนและรีวิวใน Collection "ratings"
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสารการให้คะแนน/รีวิว
 * @property {Types.ObjectId | IUser} userId - ID ของผู้ใช้ที่ให้คะแนน/รีวิว (**จำเป็น**, อ้างอิง User model)
 * @property {Types.ObjectId} targetId - ID ของเนื้อหาที่ถูกให้คะแนน (Novel, Episode, etc., **จำเป็น**) - ควรใช้ refPath เพื่อ dynamic reference
 * @property {RateableType} targetType - ประเภทของเนื้อหาที่ถูกให้คะแนน (**จำเป็น**)
 * @property {number} overallScore - คะแนนโดยรวมที่ให้ (เช่น 1-5 หรือ 1-10) - จำเป็นถ้าไม่มี `scoreDetails` หรือใช้เป็นค่าที่คำนวณจาก `scoreDetails`
 * @property {Types.DocumentArray<IRatingScoreDetail>} [scoreDetails] - รายละเอียดคะแนนตามด้านต่างๆ (ถ้ามีระบบให้คะแนนหลายมิติ)
 * @property {string} [reviewTitle] - หัวข้อรีวิว (optional)
 * @property {string} [reviewContent] - เนื้อหารีวิว (optional, มีการตรวจสอบ minlength/maxlength)
 * @property {boolean} containsSpoilers - ระบุว่ารีวิวนี้มีเนื้อหาที่สปอยล์หรือไม่ (ผู้ใช้เป็นคนระบุ)
 * @property {string} [language] - ภาษาของรีวิว (เช่น "th", "en", อาจตรวจจับอัตโนมัติหรือให้ผู้ใช้เลือก)
 * @property {Types.ObjectId} [novelIdContext] - (Context) ID ของนิยายที่เกี่ยวข้อง (เช่น ถ้า target เป็น Episode, นี่คือ Novel ID ของ Episode นั้น) - ช่วยในการ query
 * @property {number} helpfulVotesCount - จำนวนโหวตว่ารีวิวนี้มีประโยชน์ (denormalized จาก RatingVote model)
 * @property {number} unhelpfulVotesCount - จำนวนโหวตว่ารีวิวนี้ไม่มีประโยชน์หรือไม่เห็นด้วย (denormalized)
 * @property {string} [status] - สถานะของรีวิว (เช่น "visible", "hidden_by_user", "reported", "archived_by_admin") - อาจใช้ enum ที่กำหนดเองหรือคล้าย CommentStatus
 * @property {Date} [deletedAt] - วันที่ถูกลบ (สำหรับ soft delete ถ้ารีวิวถูกลบโดยผู้ใช้หรือ admin)
 * @property {Date} createdAt - วันที่สร้างการให้คะแนน/รีวิว (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตการให้คะแนน/รีวิวล่าสุด (Mongoose `timestamps`)
 */
export interface IRating extends Document {
  [x: string]: any;
  _id: Types.ObjectId;
  userId: Types.ObjectId | IUser;
  targetId: Types.ObjectId;
  targetType: RateableType;
  overallScore: number;
  scoreDetails?: Types.DocumentArray<IRatingScoreDetail>;
  reviewTitle?: string;
  reviewContent?: string;
  containsSpoilers: boolean;
  language?: string;
  novelIdContext?: Types.ObjectId; // Ref to Novel
  helpfulVotesCount: number;
  unhelpfulVotesCount: number;
  status?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals (ถ้ามี)
  calculatedOverallScore?: number | null;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ Rating (RatingSchema)
// ==================================================================================================
const RatingSchema = new Schema<IRating>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุ ID ของผู้ใช้ (User ID is required)"],
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: [true, "กรุณาระบุ ID ของเนื้อหาที่ให้คะแนน (Target ID is required)"],
      index: true,
      // refPath: "targetType" // พิจารณาเปิดใช้งานเพื่อให้ Mongoose สามารถ populate targetId แบบ dynamic ได้
    },
    targetType: {
      type: String,
      enum: Object.values(RateableType),
      required: [true, "กรุณาระบุประเภทของเนื้อหาที่ให้คะแนน (Target type is required)"],
      index: true,
    },
    overallScore: {
      type: Number,
      // overallScore จะจำเป็นก็ต่อเมื่อไม่มี scoreDetails หรือ scoreDetails เป็น array ว่าง
      required: function (this: IRating): boolean {
        return !this.scoreDetails || this.scoreDetails.length === 0;
      },
      min: [1, "คะแนนโดยรวมต่ำสุดคือ 1"],
      max: [5, "คะแนนโดยรวมสูงสุดคือ 5"], // หรือ 1-10 ตามการออกแบบ
      validate: {
        validator: Number.isInteger,
        message: (props: any) => `${props.value} ไม่ใช่คะแนนโดยรวมที่เป็นจำนวนเต็มที่ถูกต้อง!`,
      },
    },
    scoreDetails: [RatingScoreDetailSchema], // Array ของ subdocuments
    reviewTitle: {
      type: String,
      trim: true,
      maxlength: [255, "หัวข้อรีวิวยาวเกินไป (สูงสุด 255 ตัวอักษร)"],
    },
    reviewContent: {
      type: String,
      trim: true,
      maxlength: [10000, "เนื้อหารีวิวยาวเกินไป (สูงสุด 10,000 ตัวอักษร)"],
      validate: [{ // Array of validators
        validator: function(this: IRating, value: string): boolean {
          // Validator นี้จะทำงานเมื่อ reviewContent มีค่า (ไม่ใช่ null/undefined)
          // ถ้ามีการระบุ reviewTitle และ reviewContent มีค่า, ความยาวของ reviewContent ต้องอย่างน้อย 10 ตัวอักษร
          const hasTitle = !!(this.reviewTitle && this.reviewTitle.trim().length > 0);
          // ตรวจสอบว่า value (reviewContent) มีค่าจริงหรือไม่ (ไม่ใช่ empty string หลัง trim)
          const contentProvidedAndNotEmpty = value !== null && value !== undefined && value.trim().length > 0;

          if (hasTitle && contentProvidedAndNotEmpty) {
            return value.trim().length >= 10;
          }
          // ถ้าไม่มี title หรือ content ไม่ได้ถูกกรอก (เนื่องจากเป็น optional field) validator นี้จะผ่าน
          return true;
        },
        message: "เมื่อมีการระบุหัวข้อรีวิว เนื้อหารีวิวต้องมีอย่างน้อย 10 ตัวอักษร",
      }],
    },
    containsSpoilers: { type: Boolean, default: false },
    language: { type: String, trim: true, maxlength: [10, "รหัสภาษายาวเกินไป (เช่น th, en)"] },
    novelIdContext: { type: Schema.Types.ObjectId, ref: "Novel", index: true, sparse: true }, // sparse ถ้าไม่ใช่ทุก rating จะมี novel context
    helpfulVotesCount: { type: Number, default: 0, min: 0 },
    unhelpfulVotesCount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      // enum: Object.values(YourReviewStatusEnum), // ถ้ามี Enum สำหรับสถานะรีวิว
      default: "visible", // สถานะเริ่มต้นของรีวิว
      index: true,
      trim: true,
      lowercase: true,
    },
    deletedAt: { type: Date, index: true }, // สำหรับ soft delete
  },
  {
    timestamps: true, // เพิ่ม createdAt และ updatedAt โดยอัตโนมัติ
    toObject: { virtuals: true }, // ให้ virtual fields แสดงเมื่อแปลงเป็น object
    toJSON: { virtuals: true },   // ให้ virtual fields แสดงเมื่อแปลงเป็น JSON
  }
);

// ==================================================================================================
// SECTION: Virtuals (ฟิลด์เสมือน)
// ==================================================================================================

// Virtual field: 'calculatedOverallScore'
// คำนวณ overallScore จาก scoreDetails ถ้า scoreDetails มีข้อมูลและมีค่า, มิฉะนั้นใช้ overallScore ที่ผู้ใช้กรอก
RatingSchema.virtual("calculatedOverallScore").get(function (this: IRating): number | null {
  if (this.scoreDetails && this.scoreDetails.length > 0) {
    const totalScore = this.scoreDetails.reduce((sum, detail) => sum + detail.score, 0);
    // ทำการปัดเศษทศนิยม 2 ตำแหน่ง
    return parseFloat((totalScore / this.scoreDetails.length).toFixed(2));
  }
  // ถ้าไม่มี scoreDetails หรือเป็น array ว่าง, ให้คืนค่า overallScore ที่ผู้ใช้กรอกมาโดยตรง
  // (ซึ่ง field overallScore มี required validator จัดการกรณีนี้แล้ว)
  return this.overallScore;
});

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

// Unique index: ป้องกันการให้คะแนน/รีวิวซ้ำจาก user เดียวกันไปยัง target เดียวกัน
// (ถ้าต้องการอนุญาตให้ user แก้ไข rating/review ได้, unique index นี้เหมาะสม)
RatingSchema.index({ userId: 1, targetId: 1, targetType: 1 }, { unique: true, name: "UserTargetRatingUniqueIndex" });

// Index สำหรับ query ratings ทั้งหมดของ target หนึ่งๆ (เรียงตามวันที่สร้าง หรือ helpfulness)
RatingSchema.index({ targetId: 1, targetType: 1, status: 1, createdAt: -1 }, { name: "TargetRatingsQueryIndex" });
RatingSchema.index({ targetId: 1, targetType: 1, status: 1, helpfulVotesCount: -1, createdAt: -1 }, { name: "TargetHelpfulRatingsQueryIndex" });

// Index สำหรับ query ratings ทั้งหมดที่ user หนึ่งๆ ได้ทำไว้
RatingSchema.index({ userId: 1, status: 1, createdAt: -1 }, { name: "UserRatingsQueryIndex" });

// Index สำหรับการค้นหารีวิวที่มีสปอยล์ (สำหรับ filter หรือแสดงคำเตือน)
RatingSchema.index({ targetId: 1, targetType: 1, status: 1, containsSpoilers: 1 }, { name: "SpoilerRatingsIndex" });

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

// Middleware: ก่อนบันทึก (save)
RatingSchema.pre<IRating>("save", function (next: any) { // ใช้ next: any ตามข้อจำกัด
  // 1. ถ้ามี scoreDetails, ให้คำนวณ overallScore จาก scoreDetails โดยอัตโนมัติ
  //    (ทำเฉพาะเมื่อเป็นเอกสารใหม่ หรือ scoreDetails มีการแก้ไข)
  //    Field `overallScore` มี `required` validator ที่ทำงานร่วมกันได้ดีกับ logic นี้
  if (this.scoreDetails && this.scoreDetails.length > 0 && (this.isNew || this.isModified("scoreDetails"))) {
    const totalScore = this.scoreDetails.reduce((sum, detail) => sum + detail.score, 0);
    // คำนวณและปัดเศษทศนิยม 2 ตำแหน่ง
    this.overallScore = parseFloat((totalScore / this.scoreDetails.length).toFixed(2));
  }

  // 2. (ตัวอย่าง) ถ้ามี reviewContent แต่ไม่มี reviewTitle, อาจจะ set default title หรือ logic อื่นๆ
  //    ในที่นี้ ปล่อยให้เป็นไปตามที่ผู้ใช้กรอก หรือไม่กรอก
  // if (this.reviewContent && !this.reviewTitle) {
  //   // this.reviewTitle = `รีวิวสำหรับ ${this.targetType} โดยผู้ใช้`; // ควรดึงชื่อ User มา (ต้อง populate userId ก่อน)
  // }
  next(); // เรียก next() เพื่อให้ middleware ถัดไป (ถ้ามี) หรือ save ทำงานต่อ
});

/**
 * @async
 * @function updateTargetRatingStatistics
 * @description Middleware helper function เพื่ออัปเดตสถิติการให้คะแนนใน target model
 * (เช่น averageRating, ratingsCount, และ distribution of scores).
 * @param {Types.ObjectId} targetId - ID ของเนื้อหาที่ถูกให้คะแนน.
 * @param {RateableType} targetType - ประเภทของเนื้อหาที่ถูกให้คะแนน.
 */
async function updateTargetRatingStatistics(targetId: Types.ObjectId, targetType: RateableType) {
  if (!targetId || !targetType) {
    console.warn("[RatingMiddleware] Missing targetId or targetType for stats update.");
    return;
  }

  // แก้ไข: เข้าถึง RatingModel ผ่าน mongoose.model() เพื่อหลีกเลี่ยงปัญหา hoisting
  const CurrentRatingModel = mongoose.model<IRating>("Rating");
  const TargetModel = models[targetType] as mongoose.Model<any>; // models นี้คือ mongoose.models

  if (!TargetModel) {
    console.warn(`[RatingMiddleware] Target model "${targetType}" not found. Cannot update rating statistics.`);
    return;
  }

  try {
    // ดึง ratings ทั้งหมดของ target นี้ที่ status เป็น "visible" (หรือตามเงื่อนไขที่เหมาะสม)
    // เลือกเฉพาะ field 'overallScore' เพื่อ performance
    const allRatingsForTarget = await CurrentRatingModel.find({
      targetId: targetId,
      targetType: targetType,
      status: "visible", // หรือเงื่อนไข status อื่นๆ ที่ต้องการนำมาคำนวณ (เช่น "approved_by_admin")
      deletedAt: null, // ไม่รวม rating ที่ถูก soft delete
    }).select("overallScore").lean<Pick<IRating, 'overallScore'>[]>(); // ใช้ lean() และ Pick<> เพื่อ type safety

    const ratingsCount = allRatingsForTarget.length;
    let newAverageRating = 0;
    // สมมติคะแนนเป็น 1-5 และเป็นจำนวนเต็มสำหรับ distribution
    const scoreDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    if (ratingsCount > 0) {
      let totalScoreSum = 0;
      allRatingsForTarget.forEach(rating => {
        totalScoreSum += rating.overallScore;
        // ปัดเศษ overallScore ให้เป็นจำนวนเต็มที่ใกล้ที่สุดเพื่อใช้เป็น key ของ scoreDistribution
        const scoreKey = Math.round(rating.overallScore);
        if (scoreDistribution.hasOwnProperty(scoreKey)) {
          scoreDistribution[scoreKey]++;
        }
      });
      newAverageRating = parseFloat((totalScoreSum / ratingsCount).toFixed(2)); // ปัดเศษทศนิยม 2 ตำแหน่ง
    }
    
    // Payload สำหรับอัปเดต target document
    // สมมติว่า target model มี field ตามโครงสร้างนี้: stats.averageRating, stats.ratingsCount, stats.scoreDistribution
    // ควรตรวจสอบให้แน่ใจว่า TargetModel มี fields เหล่านี้จริง
    const updatePayload = {
      $set: {
        "stats.averageRating": newAverageRating,
        "stats.ratingsCount": ratingsCount,
        "stats.scoreDistribution": scoreDistribution,
        "stats.lastRatedAt": new Date(), // (Optional) เพิ่ม field เพื่อดูว่ามีการให้คะแนนล่าสุดเมื่อไหร่
      },
    };
    
    // ตัวอย่างการตรวจสอบว่า TargetModel มี field 'stats' หรือไม่ (ควรปรับปรุงให้ robust ขึ้น)
    // if (!(TargetModel.schema as any).path("stats.averageRating")) {
    //   console.warn(`[RatingMiddleware] Target model "${targetType}" might not have "stats.averageRating" field.`);
    // }

    await TargetModel.findByIdAndUpdate(targetId, updatePayload);
    // console.log(`[RatingMiddleware] Updated rating statistics for ${targetType} ID ${targetId}. Avg: ${newAverageRating}, Count: ${ratingsCount}`);

  } catch (error) {
    console.error(`[RatingMiddleware] Error updating rating statistics for ${targetType} ID ${targetId}:`, error);
    // ควรมี error handling ที่ดีกว่านี้ เช่น logging หรือ retry mechanism
  }
}

// Middleware: หลังจากการบันทึก (save) rating ใหม่ หรืออัปเดต rating ที่มีอยู่
// แก้ไข: ใช้ doc.isNew แทน doc.$isNew
RatingSchema.post<IRating>("save", async function (doc: IRating, next: any) { // เพิ่ม next parameter
  // ตรวจสอบว่าเป็นการเปลี่ยนแปลงที่มีผลต่อสถิติ
  // (เช่น สร้าง rating ใหม่ที่เป็น visible, หรือ score เปลี่ยนแปลง, หรือ status เปลี่ยนแปลงไป/มาจาก visible)
  const priorStatus = doc.$__.priorDoc?.status;
  const statusChanged = doc.isModified("status");
  const scoreChanged = doc.isModified("overallScore");

  let needsStatsUpdate = false;
  if (doc.status === "visible") { // ถ้า rating ปัจจุบันเป็น visible
    if (doc.isNew) { // ถ้าเป็น rating ใหม่
      needsStatsUpdate = true;
    } else if (scoreChanged) { // ถ้า score เปลี่ยน
      needsStatsUpdate = true;
    } else if (statusChanged && priorStatus !== "visible") { // ถ้า status เพิ่งเปลี่ยนเป็น visible
      needsStatsUpdate = true;
    }
  } else if (statusChanged && priorStatus === "visible") { // ถ้า status เพิ่งเปลี่ยนจาก visible เป็นอย่างอื่น
    needsStatsUpdate = true; // ต้องอัปเดตสถิติเพื่อเอา rating นี้ออก
  }


  if (needsStatsUpdate && !doc.deletedAt) { // ไม่ต้องอัปเดตถ้าถูก soft delete ใน operation เดียวกัน
    await updateTargetRatingStatistics(doc.targetId, doc.targetType);
  }
  next(); // เรียก next()
});

// Middleware: หลังจากการลบ (findOneAndDelete) rating
// แก้ไข: กำหนด type ของ doc parameter ให้ชัดเจน
RatingSchema.post<IRating>("findOneAndDelete", async function (doc: IRating | null, next: any) { // ใช้ next: any
  // ถ้า rating ที่ถูกลบเคยเป็น visible และไม่ได้ถูก soft-deleted มาก่อน (doc ไม่ใช่ null)
  if (doc && doc.status === "visible") {
    await updateTargetRatingStatistics(doc.targetId, doc.targetType);
  }
  next(); // เรียก next()
});

// Middleware: ก่อนการอัปเดต (findOneAndUpdate) - ถ้า status หรือ overallScore เปลี่ยนแปลง
RatingSchema.pre<mongoose.Query<IRating, IRating>>("findOneAndUpdate", async function(next: any) { // ใช้ next: any
  const update = this.getUpdate() as any; // ดึงข้อมูลที่จะอัปเดต
  // ตรวจสอบว่ามีการอัปเดต status หรือ overallScore หรือไม่
  if (update && (update.status || update.overallScore !== undefined || update.$set?.status || update.$set?.overallScore !== undefined)) {
    // ดึงเอกสารปัจจุบัน (ก่อนอัปเดต) เพื่อเปรียบเทียบค่าเดิมใน post hook
    // ใช้ lean() เพื่อ performance และเนื่องจากเราไม่ต้องการ Mongoose document methods ใน priorDoc
    const docToUpdate = await this.model.findOne(this.getQuery()).lean<IRating>();
    if (docToUpdate) {
      // เก็บ doc เก่าไว้ใน 'this' context ของ query เพื่อให้ post hook เข้าถึงได้
      (this as any)._priorDocForRatingStats = docToUpdate;
    }
  }
  next(); // เรียก next()
});

// Middleware: หลังจากการอัปเดต (findOneAndUpdate)
RatingSchema.post<mongoose.Query<IRating, IRating>>("findOneAndUpdate", async function(result: any, next: any) { // result: any, next: any
  const priorDoc = (this as any)._priorDocForRatingStats as IRating | undefined;
  // `result` ที่ได้จาก hook อาจเป็น doc เก่าหรือใหม่ ขึ้นกับ option `new`
  // เพื่อความแน่นอน ดึง doc ที่อัปเดตแล้วล่าสุดจากฐานข้อมูลอีกครั้ง
  const currentDoc = await this.model.findOne(this.getQuery()).lean<IRating>();

  if (currentDoc && !currentDoc.deletedAt) { // ตรวจสอบว่า currentDoc มีค่า และยังไม่ถูก soft delete
    let needsStatsUpdate = false;
    if (priorDoc) { // ถ้ามีข้อมูล doc เก่าสำหรับเปรียบเทียบ
      const scoreChanged = priorDoc.overallScore !== currentDoc.overallScore;
      const statusChanged = priorDoc.status !== currentDoc.status;

      // กรณี 1: score เปลี่ยน และ rating ปัจจุบันเป็น visible
      if (scoreChanged && currentDoc.status === "visible") {
        needsStatsUpdate = true;
      }
      // กรณี 2: status เปลี่ยน
      if (statusChanged) {
        // ถ้าเปลี่ยนเป็น visible จากสถานะอื่น หรือ เปลี่ยนจาก visible เป็นสถานะอื่น
        if ((currentDoc.status === "visible" && priorDoc.status !== "visible") ||
            (currentDoc.status !== "visible" && priorDoc.status === "visible")) {
          needsStatsUpdate = true;
        }
      }
    } else if (currentDoc.status === "visible") {
      // ถ้าไม่มี priorDoc (อาจเกิดจาก findOneAndUpdate ที่สร้าง doc ใหม่ด้วย upsert:true หรือไม่ได้เก็บ priorDoc)
      // และ currentDoc เป็น visible ก็ควร update stats เผื่อไว้
      // (แต่กรณี upsert ควรจัดการใน post 'save' มากกว่า)
      // ตรงนี้อาจจะต้องพิจารณา logic ให้ดีว่า findOneAndUpdate จะ trigger การสร้างสถิติเมื่อใด
      // โดยทั่วไป findOneAndUpdate ใช้กับเอกสารที่มีอยู่แล้ว
      // หาก upsert:true และสร้างใหม่ มันจะผ่าน post('save') hook แทน
      // ดังนั้น หากมาถึงตรงนี้และไม่มี priorDoc แต่ currentDoc เป็น visible อาจหมายถึงการเปลี่ยนแปลงที่ทำให้ต้องอัปเดต
      needsStatsUpdate = true;
    }


    if (needsStatsUpdate) {
      await updateTargetRatingStatistics(currentDoc.targetId, currentDoc.targetType);
    }
  }
  // ล้าง _priorDocForRatingStats ออกจาก query context (ถ้าไม่ต้องการให้คงอยู่)
  if ((this as any)._priorDocForRatingStats) {
    delete (this as any)._priorDocForRatingStats;
  }
  next(); // เรียก next()
});


// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

// ตรวจสอบว่า Model "Rating" ถูกสร้างไปแล้วหรือยัง ถ้ายัง ให้สร้าง Model ใหม่
// (วิธีนี้ช่วยป้องกัน error "OverwriteModelError" ใน Next.js hot-reloading)
const RatingModel = (models.Rating as mongoose.Model<IRating>) || model<IRating>("Rating", RatingSchema);

export default RatingModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Dynamic Ref for `targetId`**: การใช้ `refPath: "targetType"` ใน `targetId` field จะช่วยให้ Mongoose populate target document (Novel, Episode) ได้ง่ายและถูกต้องตามประเภท.
// 2.  **Denormalization of Rating Statistics in Target Models**:
//     - `stats.averageRating`, `stats.ratingsCount`, `stats.scoreDistribution` (เช่น `{ '1': 10, '2': 25, ... }`) ใน target models เป็นสิ่งสำคัญเพื่อ performance ในการแสดงผล.
//     - Middleware ที่เขียนขึ้นนี้พยายามจัดการการอัปเดตค่าเหล่านี้. Schema ของ `stats` object ใน target models ควรจะสอดคล้องกัน.
// 3.  **Performance of Statistics Update**:
//     - การคำนวณสถิติใหม่ทั้งหมด (re-aggregate) ทุกครั้งที่มีการเปลี่ยนแปลง rating อาจมีผลต่อ performance สำหรับระบบที่มี traffic สูง.
//     - อาจพิจารณาการใช้ Atomic Operations (`$inc` สำหรับ counts, และคำนวณ average แบบ incremental) หรือใช้ background jobs/scheduled tasks สำหรับ aggregate ที่ซับซ้อน.
// 4.  **Review Moderation System**:
//     - ถ้า `reviewContent` มีการใช้งานอย่างจริงจัง, ควรมีระบบ moderation สำหรับรีวิว (คล้ายกับ Comment model) โดยใช้ `status` field (เช่น "pending_approval", "approved", "rejected").
//     - อาจจะต้องมี `Report` model ที่เกี่ยวข้องเพื่อให้ผู้ใช้รายงานรีวิวที่ไม่เหมาะสม.
// 5.  **Helpful Votes System**:
//     - การอัปเดต `helpfulVotesCount` และ `unhelpfulVotesCount` จะต้องมี model `RatingVote` (หรือชื่ออื่น) ซึ่งบันทึกว่า user ไหน vote อะไรให้ rating ไหน.
//     - Middleware ที่คล้ายกันใน `RatingVote` model จะ denormalize จำนวน vote มาที่ `Rating` model.
// 6.  **MongoDB Transactions**: เพื่อความ consistency ของข้อมูลระหว่าง Rating document และ Target model statistics, ควรพิจารณาใช้ MongoDB Transactions (เมื่อใช้ Replica Set).
// 7.  **User Reputation / Contribution Score**: คะแนนที่ user ให้ หรือรีวิวที่มีประโยชน์ อาจนำไปคำนวณเป็น User Reputation Score หรือ Contribution Score ได้.
// 8.  **Preventing Rating Manipulation**: ระบบอาจต้องมีกลไกป้องกันการปั่นคะแนนหรือรีวิวปลอม (เช่น rate limiting, IP tracking, CAPTCHA, AI detection).
// 9.  **Scalability of `updateTargetRatingStatistics`**: สำหรับ target ที่มี ratings จำนวนมหาศาล, `CurrentRatingModel.find(...)` เพื่อดึง ratings ทั้งหมดอาจไม่ scale.
//     อาจจะต้องใช้ MongoDB Aggregation Framework เพื่อคำนวณสถิติโดยตรงใน database หรือ update แบบ incremental.
// 10. **Error Handling in Middleware**: เพิ่มการ logging และ alerting ที่ละเอียดขึ้นเมื่อเกิด error ใน middleware.
// ==================================================================================================