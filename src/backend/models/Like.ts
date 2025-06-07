// src/backend/models/Like.ts
// โมเดลการถูกใจ (Like Model)
// จัดการการกดถูกใจและปฏิกิริยาอื่นๆ สำหรับเนื้อหาต่างๆ เช่น นิยาย, ตอน, ความคิดเห็น, กระทู้, ฯลฯ
// เวอร์ชันปรับปรุง: เพิ่มการรองรับกระทู้ (Board) และระบบ Upvote/Downvote

import mongoose, { Schema, model, models, Types, Document, HydratedDocument } from "mongoose";
import { IUser } from "./User";
import { INovel } from "./Novel";
import { IEpisode } from "./Episode";
import { IComment } from "./Comment";
import { IBoard } from "./Board"; // [ใหม่] Import โมเดล Board ที่เพิ่มเข้ามา

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Like
// ==================================================================================================

/**
 * @enum {string} LikeableType
 * @description ประเภทของเนื้อหาที่สามารถแสดงปฏิกิริยาได้
 * - `NOVEL`: นิยายทั้งหมด
 * - `EPISODE`: ตอนใดตอนหนึ่งของนิยาย
 * - `COMMENT`: ความคิดเห็นของผู้ใช้
 * - `BOARD`: กระทู้ในเว็บบอร์ด [ใหม่]
 * - `CHARACTER`: (อนาคต) ตัวละครในนิยาย
 * - `MEDIA`: (อนาคต) สื่อที่ผู้ใช้อัปโหลด
 * - `REVIEW`: (อนาคต) รีวิวที่ผู้ใช้เขียน
 * - `WRITER_PROFILE`: (อนาคต) โปรไฟล์นักเขียน
 */
export enum LikeableType {
    NOVEL = "NOVEL",
    EPISODE = "EPISODE",
    COMMENT = "COMMENT",
    BOARD = "BOARD", // [ใหม่] เพิ่มประเภทสำหรับกระทู้
    CHARACTER = "CHARACTER",
    MEDIA = "MEDIA",
    REVIEW = "REVIEW",
    WRITER_PROFILE = "WRITER_PROFILE",
}

/**
 * @enum {string} ReactionType
 * @description ประเภทของปฏิกิริยาที่ผู้ใช้สามารถแสดงออกได้
 * - `LIKE`: ถูกใจ (ค่าเริ่มต้น)
 * - `LOVE`: รักเลย
 * - `HAHA`: ฮา
 * - `SAD`: เศร้า
 * - `WOW`: ว้าว
 * - `ANGRY`: โกรธ
 * - `UPVOTE`: โหวตขึ้น (สำหรับกระทู้) [ใหม่]
 * - `DOWNVOTE`: โหวตลง (สำหรับกระทู้) [ใหม่]
 */
export enum ReactionType {
    LIKE = "LIKE",
    LOVE = "LOVE",
    HAHA = "HAHA",
    SAD = "SAD",
    WOW = "WOW",
    ANGRY = "ANGRY",
    UPVOTE = "UPVOTE",       // [ใหม่] สำหรับระบบกระทู้ Q&A หรือ Discussion
    DOWNVOTE = "DOWNVOTE",   // [ใหม่] สำหรับระบบกระทู้ Q&A หรือ Discussion
}

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร Like (ILike Document Interface)
// ==================================================================================================

export interface ILike extends Document {
    _id: Types.ObjectId;
    userId: Types.ObjectId | IUser;          // ผู้ใช้ที่กด
    targetId: Types.ObjectId;                // ID ของเนื้อหาที่ถูกกด (Novel, Episode, Comment, Board)
    targetType: LikeableType;                // ประเภทของเนื้อหาที่ถูกกด
    reactionType: ReactionType;              // ประเภทของปฏิกิริยา (LIKE, LOVE, UPVOTE, etc.)

    // Contextual Fields เพื่อลดความซับซ้อนในการ query
    novelIdContext?: Types.ObjectId | INovel;     // ID นิยาย (ถ้า target คือ Episode หรือ Comment ใน Episode)
    episodeIdContext?: Types.ObjectId | IEpisode; // ID ตอน (ถ้า target คือ Comment ใน Episode)
    boardIdContext?: Types.ObjectId | IBoard;     // ID กระทู้ (ถ้า target คือ Comment ใน Board) [แนวทางในอนาคต]

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
            required: true,
            index: true,
        },
        targetId: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        targetType: {
            type: String,
            enum: Object.values(LikeableType),
            required: true,
            index: true,
        },
        reactionType: {
            type: String,
            enum: Object.values(ReactionType),
            required: true,
            default: ReactionType.LIKE,
        },
        novelIdContext: {
            type: Schema.Types.ObjectId,
            ref: "Novel",
            index: true,
            sparse: true,
        },
        episodeIdContext: {
            type: Schema.Types.ObjectId,
            ref: "Episode",
            index: true,
            sparse: true,
        },
        boardIdContext: {
            type: Schema.Types.ObjectId,
            ref: "Board",
            index: true,
            sparse: true,
        },
    },
    {
        timestamps: true,
        collection: "likes",
    }
);

// Define the unique index separately
LikeSchema.index({ userId: 1, targetId: 1, targetType: 1 }, { unique: true });

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

/**
 * Middleware: 'post save'
 * - ทำงานหลังจากบันทึก Like document ใหม่
 * - อัปเดตค่าสถิติ (เช่น likesCount) ใน target model (Novel, Episode, Comment, Board)
 */
LikeSchema.post<HydratedDocument<ILike>>("save", async function (doc, next) {
    if (!doc) return next();

    const modelMap: { [key in LikeableType]?: mongoose.Model<any> } = {
        [LikeableType.NOVEL]: models.Novel,
        [LikeableType.EPISODE]: models.Episode,
        [LikeableType.COMMENT]: models.Comment,
        [LikeableType.BOARD]: models.Board, // [ใหม่] เพิ่ม Board model เข้าไปใน map
    };

    const TargetModel = modelMap[(doc as ILike).targetType];
    if (!TargetModel) return next();

    let updateQuery: mongoose.UpdateQuery<any> = {};

    switch ((doc as ILike).targetType) {
        case LikeableType.NOVEL:
        case LikeableType.EPISODE:
        case LikeableType.COMMENT:
            // สำหรับ Novel, Episode, Comment จะนับแยกตาม reactionType
            const countField = `stats.reactionCounts.${(doc as ILike).reactionType.toLowerCase()}`;
            const generalLikesField = 'stats.likesCount'; // field รวมสำหรับทุก reactions
            updateQuery = { $inc: { [countField]: 1, [generalLikesField]: 1 } };
            break;

        case LikeableType.BOARD:
            // [ใหม่] สำหรับ Board จะมีการนับที่แตกต่างออกไป
            // - UPVOTE และ DOWNVOTE มี counter ของตัวเอง
            // - Reaction อื่นๆ (LIKE, LOVE, HAHA) จะถูกนับรวมใน likesCount
            switch ((doc as ILike).reactionType) {
                case ReactionType.UPVOTE:
                    updateQuery = { $inc: { "stats.upvotesCount": 1 } };
                    break;
                case ReactionType.DOWNVOTE:
                    updateQuery = { $inc: { "stats.downvotesCount": 1 } };
                    break;
                default:
                    // Reaction อื่นๆ ทั้งหมดนับเป็น "likes"
                    updateQuery = { $inc: { "stats.likesCount": 1 } };
                    break;
            }
            break;
    }

    try {
        await TargetModel.findByIdAndUpdate(doc._id, updateQuery);
    } catch (error) {
        console.error(`Failed to update count for ${doc.targetType} [${doc.targetId}] on save:`, error);
        // ควรมีระบบ logging ที่ดีกว่านี้ เช่น Winston
    }

    next();
});


/**
 * Middleware: 'deleteOne'
 * - ใช้ 'deleteOne' hook แทน 'remove' เนื่องจาก findOneAndDelete จะ trigger hook นี้
 * - ทำงานหลังจากลบ Like document
 * - ลดค่าสถิติ (เช่น likesCount) ใน target model
 */
LikeSchema.post<HydratedDocument<ILike>>("deleteOne", async function (doc, next) {
    if (!doc) return next();
    
    const modelMap: { [key in LikeableType]?: mongoose.Model<any> } = {
        [LikeableType.NOVEL]: models.Novel,
        [LikeableType.EPISODE]: models.Episode,
        [LikeableType.COMMENT]: models.Comment,
        [LikeableType.BOARD]: models.Board, // [ใหม่] เพิ่ม Board model เข้าไปใน map
    };

    const TargetModel = modelMap[(doc as ILike).targetType];
    if (!TargetModel) return next();

    let updateQuery: mongoose.UpdateQuery<any> = {};

    switch ((doc as ILike).targetType) {
        case LikeableType.NOVEL:
        case LikeableType.EPISODE:
        case LikeableType.COMMENT:
            const countField = `stats.reactionCounts.${(doc as ILike).reactionType.toLowerCase()}`;
            const generalLikesField = 'stats.likesCount';
            updateQuery = { $inc: { [countField]: -1, [generalLikesField]: -1 } };
            break;
            
        case LikeableType.BOARD:
            // [ใหม่] ลดค่า counter ใน Board ให้สอดคล้องกับตอนที่เพิ่ม
            switch ((doc as ILike).reactionType) {
                case ReactionType.UPVOTE:
                    updateQuery = { $inc: { "stats.upvotesCount": -1 } };
                    break;
                case ReactionType.DOWNVOTE:
                    updateQuery = { $inc: { "stats.downvotesCount": -1 } };
                    break;
                default:
                    updateQuery = { $inc: { "stats.likesCount": -1 } };
                    break;
            }
            break;
    }
    try {
        await TargetModel.findByIdAndUpdate((doc as ILike).targetId, updateQuery);
    } catch (error) {
        console.error(`Failed to update count for ${(doc as ILike).targetType} [${(doc as ILike).targetId}] on delete:`, error);
    }

    next();
});


// = a================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

const LikeModel = (models.Like as mongoose.Model<ILike>) || model<ILike>("Like", LikeSchema);

export default LikeModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Dynamic Population**: ใช้ `targetType` เพื่อให้ Mongoose populate `targetId` ได้แบบ dynamic แต่ต้อง import และ register ทุก model ใน LikeableType
// 2.  **Denormalization of Reaction Counts**: การใช้ `stats` ใน target models เพื่อ performance เป็นสิ่งที่ดี
//     - สำหรับ **Board**: จะมีการนับ `upvotesCount` และ `downvotesCount` แยกต่างหาก ส่วน reaction อื่นๆ จะรวมอยู่ใน `likesCount`
//     - สำหรับ **Novel/Episode/Comment**: จะนับ `reactionCounts` แยกตามแต่ละประเภท และมี `likesCount` เป็นผลรวม
// 3.  **Contextual Fields**: `novelIdContext`, `episodeIdContext`, และ `boardIdContext` ช่วยลดความซับซ้อนในการ query ที่ต้องการบริบท
//     เช่น "หา user ที่ like comment ในกระทู้นี้"
// 4.  **MongoDB Transactions**: การอัปเดต reaction และ counts ใน target model ควรอยู่ใน transaction เพื่อความสอดคล้องของข้อมูล (ถ้า MongoDB รองรับ replica set)
// 5.  **Scalability**: การอัปเดต counts แบบ real-time อาจเป็น bottleneck ในระบบขนาดใหญ่ พิจารณาใช้ background jobs หรือ message queues (เช่น RabbitMQ, Kafka) เพื่อ aggregate counts
// 6.  **User Interface**: UI ควรมี optimistic updates และป้องกันการกด reaction รัวๆ
// 7.  **Notifications**: การ like เนื้อหาสำคัญ (เช่น กระทู้, ตอนใหม่) ควร trigger notification โดยใช้ NotificationModel
// 8.  **Error Handling**: ใช้ logging library (เช่น Winston) และเพิ่ม retry mechanism ใน middleware
// 9.  **Changing Reactions**: การเปลี่ยน reaction (เช่น จาก like เป็น love) ควรย้าย logic ไป service layer เพื่อลดการ query ใน middleware โดยอาจจะเป็นการ `findOneAndUpdate` เพียงครั้งเดียวแทนการ `deleteOne` แล้ว `save` ใหม่
// 10. **Index Optimization**: ตรวจสอบประสิทธิภาพของ indexes ด้วย `explain()` ใน MongoDB และปรับถ้าจำเป็น โดยเฉพาะ index ที่ใช้ `userId`, `targetId`, และ `targetType` ร่วมกัน
// ==================================================================================================