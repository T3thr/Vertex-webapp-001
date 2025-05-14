// src/models/Rating.ts
// โมเดลการให้คะแนน (Rating Model) - จัดการการให้คะแนนนิยายโดยผู้ใช้
// ออกแบบให้เชื่อมโยงกับผู้ใช้และนิยาย, เก็บข้อมูลคะแนน, และอาจมีรีวิวสั้นๆ ประกอบ

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// อินเทอร์เฟซหลักสำหรับเอกสารการให้คะแนน (Rating Document)
export interface IRating extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId; // ผู้ใช้ที่ให้คะแนน (อ้างอิง User model หรือ SocialMediaUser model)
  novel: Types.ObjectId; // นิยายที่ถูกให้คะแนน (อ้างอิง Novel model)
  
  score: number; // คะแนนที่ให้ (เช่น 1-5 หรือ 1-10, ควรตรงกับระบบโดยรวม)
  reviewTitle?: string; // หัวข้อรีวิว (ถ้ามี, สำหรับรีวิวแบบสั้นๆ ที่มาพร้อมคะแนน)
  reviewText?: string; // เนื้อหารีวิวสั้นๆ (ถ้ามี, อาจจำกัดความยาว)
  // ถ้าต้องการรีวิวยาวๆ ควรมี Review model แยกต่างหาก และ Rating model นี้อาจ link ไปที่ Review model นั้น
  // reviewId?: Types.ObjectId; // อ้างอิง Review model (ถ้ามี)
  
  // สถานะการแสดงผล (เผื่อต้องการ moderate รีวิว/คะแนน)
  isPublished: boolean; // แสดงผลสาธารณะหรือไม่
  isFeatured?: boolean; // เป็นรีวิว/คะแนนที่ถูกเลือกให้แสดงเด่นหรือไม่
  
  // สถิติการโต้ตอบกับรีวิวนี้ (ถ้ามีรีวิว)
  helpfulVotes: number; // จำนวนคนที่โหวตว่ารีวิวนี้มีประโยชน์
  unhelpfulVotes: number; // จำนวนคนที่โหวตว่ารีวิวนี้ไม่มีประโยชน์
  // reportedCount: number; // จำนวนครั้งที่ถูกรายงาน (สำหรับการตรวจสอบ)

  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;

  // Timestamps
  createdAt: Date; // วันที่ให้คะแนน/เขียนรีวิว
  updatedAt: Date; // วันที่แก้ไขล่าสุด
}

const RatingSchema = new Schema<IRating>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User", // หรือ refPath: "userType" เพื่อรองรับทั้ง User และ SocialMediaUser
      // userType: { type: String, enum: ["User", "SocialMediaUser"] },
      required: true,
      index: true,
    },
    novel: {
      type: Schema.Types.ObjectId,
      ref: "Novel",
      required: true,
      index: true,
    },
    score: {
      type: Number,
      required: [true, "กรุณาระบุคะแนน (Score is required)"],
      min: [1, "คะแนนต้องอยู่ระหว่าง 1 ถึง 5 (หรือตามที่ระบบกำหนด)"], // ปรับ min/max ตามระบบ (เช่น 0.5, 10)
      max: [5, "คะแนนต้องอยู่ระหว่าง 1 ถึง 5 (หรือตามที่ระบบกำหนด)"],
      validate: { // อาจต้องการให้คะแนนเป็น step เช่น 0.5, 1, 1.5
        validator: function(v: number) {
          return (v * 10) % 5 === 0; // เช่น 1, 1.5, 2, 2.5, ..., 5
        },
        message: props => `${props.value} ไม่ใช่ค่าคะแนนที่ถูกต้อง (ต้องเป็นช่วงทีละ 0.5)`
      }
    },
    reviewTitle: { type: String, trim: true, maxlength: [150, "หัวข้อรีวิวต้องไม่เกิน 150 ตัวอักษร"] },
    reviewText: { type: String, trim: true, maxlength: [2500, "เนื้อหารีวิวต้องไม่เกิน 2500 ตัวอักษร"] },
    // reviewId: { type: Schema.Types.ObjectId, ref: "Review" },
    isPublished: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    helpfulVotes: { type: Number, default: 0, min: 0 },
    unhelpfulVotes: { type: Number, default: 0, min: 0 },
    // reportedCount: { type: Number, default: 0, min: 0 },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ----- Indexes -----
// Unique combination of user and novel to ensure one rating per user per novel
RatingSchema.index({ user: 1, novel: 1 }, { unique: true });
// For fetching ratings of a novel, sorted by helpfulness or date
RatingSchema.index({ novel: 1, isPublished: 1, score: -1, createdAt: -1 });
RatingSchema.index({ novel: 1, isPublished: 1, helpfulVotes: -1, createdAt: -1 });
RatingSchema.index({ user: 1, createdAt: -1 }); // รีวิวล่าสุดของผู้ใช้

// ----- Middleware: Update denormalized average score and rating count on Novel model -----
// This is a critical part for performance. Updating these on every rating save/delete.
async function updateNovelRatingStats(novelId: Types.ObjectId) {
  const Novel = models.Novel || model("Novel");
  const RatingModel = models.Rating || model("Rating");

  try {
    const publishedRatings = await RatingModel.find({
      novel: novelId,
      isPublished: true,
      isDeleted: false,
    }).select("score");

    const totalRatings = publishedRatings.length;
    let averageScore = 0;

    if (totalRatings > 0) {
      const sumOfScores = publishedRatings.reduce((sum, rating) => sum + rating.score, 0);
      averageScore = parseFloat((sumOfScores / totalRatings).toFixed(2)); // ปัดทศนิยม 2 ตำแหน่ง
    }
    
    // สถิติการกระจายของคะแนน (เช่น จำนวน 5 ดาว, 4 ดาว, ...)
    const scoreDistribution: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 }; // ปรับตาม min/max score
    // สามารถเพิ่มการนับคะแนนแบบละเอียด (เช่น 1.5, 2.5) ถ้า score validator อนุญาต
    publishedRatings.forEach(rating => {
        const flooredScore = Math.floor(rating.score);
        if (scoreDistribution.hasOwnProperty(String(flooredScore))) {
            scoreDistribution[String(flooredScore)]++;
        }
        // หากต้องการนับคะแนน .5 ด้วย อาจต้องปรับ key ของ scoreDistribution
    });

    await Novel.findByIdAndUpdate(novelId, {
      "statistics.averageRating": averageScore,
      "statistics.totalRatings": totalRatings,
      "statistics.ratingDistribution": scoreDistribution,
      lastUpdatedAt: new Date(), // อัปเดต Novel ด้วย
    });

  } catch (error) {
    console.error(`Error updating novel rating stats for novel ${novelId}:`, error);
    // Consider more robust error handling, e.g., queuing the update
  }
}

RatingSchema.post("save", async function (doc: IRating) {
  if (doc.isModified("score") || doc.isModified("isPublished") || doc.isModified("isDeleted")) {
    await updateNovelRatingStats(doc.novel);
  }
});

RatingSchema.post("findOneAndDelete", async function (doc: IRating | null) {
  if (doc) {
    await updateNovelRatingStats(doc.novel);
  }
});

// If using soft delete and isDeleted changes, this hook is needed.
RatingSchema.post("findOneAndUpdate", async function (doc: IRating | null) {
    // `this` is the Query object. `doc` is the document *after* the update if `new: true` was used, or *before* if not.
    // To be safe, re-fetch the document or ensure the fields checked were part of the update.
    if (doc && (this.getUpdate().$set?.isDeleted !== undefined || this.getUpdate().isDeleted !== undefined)) {
        await updateNovelRatingStats(doc.novel);
    }
});


// ----- Model Export -----
const RatingModel = () => models.Rating as mongoose.Model<IRating> || model<IRating>("Rating", RatingSchema);

export default RatingModel;

