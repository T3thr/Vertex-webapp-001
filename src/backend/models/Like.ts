// src/backend/models/Like.ts
// โมเดลการถูกใจ (Like Model)
// จัดการการกดถูกใจ (หรือปฏิกิริยาอื่นๆ) สำหรับเนื้อหาต่างๆ เช่น นิยาย, ตอน, ความคิดเห็น, สื่อ, ฯลฯ

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IUser } from "./User"; // สำหรับ userId
// ไม่จำเป็นต้อง import target models (Novel, Episode, Comment) โดยตรงใน schema นี้
// แต่ middleware จะต้องสามารถ resolve model name ไปยัง model instance ที่ถูกต้องได้

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Like
// ==================================================================================================

/**
 * @enum {string} LikeableType
 * @description ประเภทของเนื้อหาที่สามารถแสดงปฏิกิริยา (เช่น ถูกใจ) ได้
 * - `NOVEL`: นิยายทั้งหมด
 * - `EPISODE`: ตอนใดตอนหนึ่งของนิยาย
 * - `COMMENT`: ความคิดเห็นของผู้ใช้
 * - `CHARACTER`: (อนาคต) ตัวละครในนิยาย
 * - `MEDIA`: (อนาคต) สื่อที่ผู้ใช้อัปโหลดหรือสื่อทางการ
 * - `USER_POST`: (อนาคต) โพสต์ของผู้ใช้ในส่วนโซเชียล
 * - `REVIEW`: (อนาคต) รีวิวที่ผู้ใช้เขียน
 * - `WRITER_PROFILE`: (อนาคต) โปรไฟล์นักเขียน
 * - `OFFICIAL_MEDIA`: สื่อทางการจากคลัง NovelMaze
 */
export enum LikeableType {
  NOVEL = "Novel",
  EPISODE = "Episode",
  COMMENT = "Comment",
  CHARACTER = "Character",
  MEDIA = "Media",
  USER_POST = "UserPost",
  REVIEW = "Review",
  WRITER_PROFILE = "WriterProfile",
  OFFICIAL_MEDIA = "OfficialMedia",
}

/**
 * @enum {string} ReactionType
 * @description ประเภทของปฏิกิริยา (ถ้าต้องการขยายมากกว่าแค่ "like")
 * - `LIKE`: ถูกใจ (ค่า default)
 * - `LOVE`: รักเลย
 * - `HAHA`: ฮา
 * - `WOW`: ว้าว
 * - `SAD`: เศร้า
 * - `ANGRY`: โกรธ
 */
export enum ReactionType {
  LIKE = "like",
  LOVE = "love",
  HAHA = "haha",
  WOW = "wow",
  SAD = "sad",
  ANGRY = "angry",
}

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร Like (ILike Document Interface)
// ==================================================================================================

/**
 * @interface ILike
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารการถูกใจ/ปฏิกิริยาใน Collection "likes"
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสาร
 * @property {Types.ObjectId | IUser} userId - ID ของผู้ใช้ที่แสดงปฏิกิริยา (**จำเป็น**, อ้างอิง User model)
 * @property {Types.ObjectId} targetId - ID ของเนื้อหาที่ถูกแสดงปฏิกิริยา (Novel, Episode, Comment, etc., **จำเป็น**)
 * @property {LikeableType} targetType - ประเภทของเนื้อหาที่ถูกแสดงปฏิกิริยา (**จำเป็น**)
 * @property {ReactionType} reactionType - ประเภทของปฏิกิริยา (default: `LIKE`)
 * @property {Types.ObjectId} [novelIdContext] - (Context) ID ของนิยายที่เกี่ยวข้อง (ถ้า target เป็น Episode หรือ Comment ในนิยาย)
 * @property {Types.ObjectId} [episodeIdContext] - (Context) ID ของตอนที่เกี่ยวข้อง (ถ้า target เป็น Comment ในตอน)
 * @property {Date} createdAt - วันที่สร้างปฏิกิริยา (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตปฏิกิริยา (ถ้ามีการเปลี่ยน reactionType)
 */
export interface ILike extends Document {
  [x: string]: any;
  _id: Types.ObjectId;
  userId: Types.ObjectId | IUser;
  targetId: Types.ObjectId;
  targetType: LikeableType;
  reactionType: ReactionType;
  novelIdContext?: Types.ObjectId;
  episodeIdContext?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ Like (LikeSchema)
// ==================================================================================================
const LikeSchema = new Schema<ILike>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุ ID ของผู้ใช้ (User ID is required)"],
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: [true, "กรุณาระบุ ID ของเนื้อหาที่ถูกใจ (Target ID is required)"],
      index: true,
    },
    targetType: {
      type: String,
      enum: Object.values(LikeableType),
      required: [true, "กรุณาระบุประเภทของเนื้อหาที่ถูกใจ (Target type is required)"],
      index: true,
    },
    reactionType: {
      type: String,
      enum: Object.values(ReactionType),
      default: ReactionType.LIKE,
      required: [true, "กรุณาระบุประเภทของปฏิกิริยา (Reaction type is required)"],
    },
    novelIdContext: { type: Schema.Types.ObjectId, ref: "Novel", index: true, sparse: true },
    episodeIdContext: { type: Schema.Types.ObjectId, ref: "Episode", index: true, sparse: true },
  },
  {
    timestamps: true, // เพิ่ม createdAt และ updatedAt โดยอัตโนมัติ
    collection: "likes", // ชื่อ collection ใน MongoDB
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

// Unique index เพื่อป้องกันการแสดงปฏิกิริยาซ้ำจากผู้ใช้คนเดียวกันไปยัง target เดียวกัน
// ผู้ใช้สามารถมี reaction ได้เพียง 1 ประเภทต่อ 1 target (เช่น like หรือ love แต่ไม่ทั้งสอง)
LikeSchema.index(
  { userId: 1, targetId: 1, targetType: 1 },
  { unique: true, name: "UserTargetReactionUniqueIndex" }
);

// Index สำหรับ query ปฏิกิริยาทั้งหมดของ target หนึ่งๆ (เช่น จำนวน like, love ของนิยาย)
LikeSchema.index(
  { targetId: 1, targetType: 1, reactionType: 1 },
  { name: "TargetReactionsQueryIndex" }
);

// Index สำหรับ query ปฏิกิริยาทั้งหมดที่ผู้ใช้คนหนึ่งได้ทำไว้ (เช่น ประวัติการกด like)
LikeSchema.index(
  { userId: 1, reactionType: 1, createdAt: -1 },
  { name: "UserReactionsQueryIndex" }
);

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

/**
 * @function updateTargetReactionCounts
 * @description Helper function เพื่ออัปเดตจำนวนปฏิกิริยาใน target model
 * @param {ILike} doc - เอกสาร Like ที่ถูก save หรือ delete
 * @param {"increment" | "decrement"} operation - การดำเนินการ (เพิ่มหรือลด)
 * @param {ReactionType} [previousReactionType] - (Optional) ประเภทปฏิกิริยาเดิม (กรณีเปลี่ยน reaction)
 */
async function updateTargetReactionCounts(
  doc: ILike,
  operation: "increment" | "decrement",
  previousReactionType?: ReactionType
) {
  if (!doc || !doc.targetId || !doc.targetType) return;

  const modelName = doc.targetType;
  const TargetModel = models[modelName] as mongoose.Model<any>;

  if (!TargetModel) {
    console.warn(`[LikeMiddleware] Target model "${modelName}" not found for reaction count update.`);
    return;
  }

  try {
    const updateValue = operation === "increment" ? 1 : -1;
    const currentReactionField = `${doc.reactionType}sCount`; // เช่น "likesCount", "lovesCount"
    const updateQuery: any = { $inc: {} };
    updateQuery.$inc[`stats.${currentReactionField}`] = updateValue;

    // ถ้ามีการเปลี่ยน reaction (เช่น จาก like เป็น love)
    if (previousReactionType && previousReactionType !== doc.reactionType) {
      const previousReactionField = `${previousReactionType}sCount`;
      updateQuery.$inc[`stats.${previousReactionField}`] = -1;
    }

    await TargetModel.findByIdAndUpdate(doc.targetId, updateQuery);
    console.log(`[LikeMiddleware] Updated ${currentReactionField} for ${modelName} ID ${doc.targetId} by ${updateValue}`);
  } catch (error) {
    console.error(`[LikeMiddleware] Error updating reaction counts for ${modelName} ID ${doc.targetId}:`, error);
    // TODO: เพิ่ม error handling เช่น retry, logging, หรือแจ้งเตือน admin
  }
}

// Middleware: หลังจากการบันทึก (save) - สร้าง like/reaction ใหม่ หรืออัปเดต reaction
LikeSchema.post<ILike>("save", async function (doc: ILike & mongoose.Document, next) {
  let previousReactionType: ReactionType | undefined = undefined;

  // ตรวจสอบว่าเป็นการอัปเดต reactionType หรือไม่
  if (!doc.isNew && doc.isModified("reactionType")) {
    // Query เอกสารเดิมเพื่อหา reactionType เดิม (ควรย้ายไป service layer ใน production)
    const originalDoc = await LikeModel.findOne({
      _id: doc._id,
      createdAt: { $lt: doc.updatedAt },
    }).lean();
    if (originalDoc && originalDoc.reactionType !== doc.reactionType) {
      previousReactionType = originalDoc.reactionType as ReactionType;
    }
  }

  if (doc.isNew) {
    // สร้าง reaction ใหม่
    await updateTargetReactionCounts(doc, "increment");
  } else if (previousReactionType) {
    // เปลี่ยน reaction type (เช่น จาก like เป็น love)
    await updateTargetReactionCounts(doc, "increment", previousReactionType);
  }
  // ถ้าเป็นการอัปเดตอื่น (เช่น timestamps) ไม่ต้องเปลี่ยน counts
  next();
});

// Middleware: หลังจากการลบ (findOneAndDelete) - unlike/remove reaction
// ใช้สำหรับ hard delete ซึ่งควรเป็นกรณีพิเศษ (ปกติใช้การลบแบบ soft delete หรือ update reaction)
LikeSchema.post<mongoose.ModifyResult<ILike>>("findOneAndDelete", async function (doc, next) {
  // doc เป็น ModifyResult<ILike>, เอกสารที่ถูกลบจะอยู่ใน doc.value
  if (doc && doc.value) {
    const deletedDoc = doc.value as ILike;
    await updateTargetReactionCounts(deletedDoc, "decrement");
  } else {
    console.warn("[Like findOneAndDelete Hook] No document found in ModifyResult.");
  }
  next();
});

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

// ตรวจสอบว่า Model "Like" ถูกสร้างไปแล้วหรือยัง ถ้ายัง ให้สร้าง Model ใหม่
const LikeModel = (models.Like as mongoose.Model<ILike>) || model<ILike>("Like", LikeSchema);

export default LikeModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Dynamic Ref for `targetId`**: ใช้ `refPath: "targetType"` เพื่อให้ Mongoose populate targetId
//     ได้แบบ dynamic แต่ต้อง import และ register ทุก model ใน LikeableType
// 2.  **Denormalization of Reaction Counts**: ใช้ `stats.likesCount`, `stats.lovesCount` ใน target models
//     เพื่อ performance ควรตรวจสอบว่า field เหล่านี้มีอยู่ในทุก model
// 3.  **Contextual Fields**: `novelIdContext` และ `episodeIdContext` ช่วยลดความซับซ้อนในการ query
//     เช่น หา user ที่ like episode ในนิยายนี้
// 4.  **MongoDB Transactions**: การอัปเดต reaction และ counts ใน target model ควรอยู่ใน transaction
//     เพื่อความสอดคล้องของข้อมูล (ถ้า MongoDB รองรับ replica set)
// 5.  **Scalability**: การอัปเดต counts แบบ real-time อาจเป็น bottleneck ในระบบขนาดใหญ่
//     พิจารณาใช้ background jobs หรือ message queues (เช่น RabbitMQ, Kafka) เพื่อ aggregate counts
// 6.  **User Interface**: UI ควรมี optimistic updates และป้องกันการกด like รัวๆ
// 7.  **Notifications**: การ like เนื้อหาสำคัญ (เช่น ตอนใหม่) ควร trigger notification
//     โดยใช้ NotificationModel จาก Notification.ts
// 8.  **Error Handling**: ใช้ logging library (เช่น Winston) และเพิ่ม retry mechanism ใน middleware
// 9.  **Changing Reactions**: การเปลี่ยน reaction (เช่น จาก like เป็น love) ควรย้าย logic
//     ไป service layer เพื่อลดการ query ใน middleware
// 10. **Index Optimization**: ตรวจสอบประสิทธิภาพของ indexes ด้วย `explain()` ใน MongoDB
//     และปรับถ้าจำเป็น
// ==================================================================================================