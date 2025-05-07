// src/backend/models/Rating.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface for individual rating criteria (if you want multi-dimensional ratings)
export interface IRatingCriterionScore extends Document {
  criterionName: string; // e.g., "Story", "Characters", "World-building", "Art Style"
  score: number; // Score for this specific criterion (1-5 or 1-10)
  weight?: number; // Optional weight for this criterion in overall score calculation (default 1)
}

// Interface for Rating document
// Represents a user's rating and review for a specific target (Novel, Episode, etc.)
export interface IRating extends Document {
  wasApprovedBeforeChange: boolean;
  user: Types.ObjectId; // ผู้ให้คะแนน (อ้างอิง User model)
  targetType: "Novel" | "Episode" | "Character" | "OfficialMedia"; // ประเภทของสิ่งที่ถูกให้คะแนน
  targetId: Types.ObjectId; // ID ของสิ่งที่ถูกให้คะแนน (อ้างอิงตาม targetType)
  // Overall Score and Review
  overallScore: number; // คะแนนโดยรวม (1-5 หรือ 1-10, คำนวณหรือให้โดยตรง)
  title?: string; // หัวข้อรีวิว (optional)
  reviewText?: string; // เนื้อหารีวิว (optional)
  // Multi-dimensional scores (optional)
  criteriaScores?: IRatingCriterionScore[]; // คะนนตามเกณฑ์ย่อย (ถ้ามี)
  // Review Attributes
  containsSpoilers: boolean; // มีการสปอยล์เนื้อหาหรือไม่
  language: string; // ภาษาของรีวิว (e.g., "th", "en", default "th")
  // Moderation and Status
  status: "pending_approval" | "approved" | "rejected" | "edited_by_moderator"; // สถานะการรีวิว
  moderationReason?: string; // เหตุผลในการ reject หรือ edit (ถ้ามี)
  moderatedBy?: Types.ObjectId; // ผู้ดูแลที่จัดการรีวิวนี้ (อ้างอิง User model - admin/moderator role)
  isHiddenByAdmin: boolean; // ซ่อนโดยผู้ดูแลระบบหรือไม่ (override user visibility)
  // User Interaction with the Review
  helpfulVotes: number; // จำนวนโหวตว่ารีวิวนี้มีประโยชน์
  unhelpfulVotes: number; // จำนวนโหวตว่ารีวิวนี้ไม่มีประโยชน์
  // Denormalized counts for quick display on review itself
  commentCount: number; // จำนวนความคิดเห็นต่อรีวิวนี้ (if reviews can be commented on)
  // Timestamps and Soft Delete
  isEdited: boolean; // ผู้ใช้แก้ไขรีวิวนี้หรือไม่
  editedAt?: Date; // วันที่แก้ไขล่าสุดโดยผู้ใช้
  isDeleted: boolean; // สถานะการลบ (soft delete by user)
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RatingCriterionScoreSchema = new Schema<IRatingCriterionScore>(
  {
    criterionName: { type: String, required: true, trim: true },
    score: { type: Number, required: true, min: 1, max: 10 }, // Example: 1-10 scale
    weight: { type: Number, default: 1, min: 0 },
  },
  { _id: false }
);

const RatingSchema = new Schema<IRating>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    targetType: {
      type: String,
      enum: ["Novel", "Episode", "Character", "OfficialMedia"],
      required: true,
      index: true,
    },
    targetId: { 
      type: Schema.Types.ObjectId, 
      required: true, 
      index: true,
      refPath: "targetType" // Dynamic reference to the model specified in targetType
    },
    overallScore: {
      type: Number,
      required: [true, "กรุณาระบุคะแนนโดยรวม"],
      min: [1, "คะแนนต้องอยู่ระหว่าง 1 ถึง 5"],
      max: [5, "คะแนนต้องอยู่ระหว่าง 1 ถึง 5"], // Assuming 1-5 scale for overall
    },
    title: { type: String, trim: true, maxlength: [150, "หัวข้อรีวิวต้องไม่เกิน 150 ตัวอักษร"] },
    reviewText: { type: String, trim: true, maxlength: [5000, "เนื้อหารีวิวต้องไม่เกิน 5000 ตัวอักษร"] },
    criteriaScores: [RatingCriterionScoreSchema],
    containsSpoilers: { type: Boolean, default: false },
    language: { type: String, default: "th", trim: true, lowercase: true, index: true },
    status: {
      type: String,
      enum: ["pending_approval", "approved", "rejected", "edited_by_moderator"],
      default: "approved", // Or "pending_approval" if moderation is strict
      index: true,
    },
    moderationReason: { type: String, trim: true },
    moderatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isHiddenByAdmin: { type: Boolean, default: false, index: true },
    helpfulVotes: { type: Number, default: 0, min: 0 },
    unhelpfulVotes: { type: Number, default: 0, min: 0 },
    commentCount: { type: Number, default: 0, min: 0 },
    isEdited: { type: Boolean, default: false },
    editedAt: Date,
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    wasApprovedBeforeChange: { type: Boolean, default: false }, // Added to schema
  },
  {
    timestamps: true, // createdAt, updatedAt
    // Add refPath for dynamic referencing of targetId
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----- Indexes -----
// Unique compound index for user, targetType, and targetId to ensure one rating per user per item
RatingSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true });
RatingSchema.index({ targetType: 1, targetId: 1, status: 1, overallScore: -1, createdAt: -1 }); // For fetching approved ratings for an item, sorted by score/date
RatingSchema.index({ targetType: 1, targetId: 1, status: 1, helpfulVotes: -1, createdAt: -1 }); // Sorted by helpfulness
RatingSchema.index({ user: 1, createdAt: -1 }); // For fetching user's ratings
RatingSchema.index({ status: 1, createdAt: -1 }); // For moderation queues
RatingSchema.index({ reviewText: "text", title: "text" }); // For text search on reviews

// ----- Middleware -----
RatingSchema.pre("save", function (next) {
  // If criteriaScores are provided and overallScore is not, calculate overallScore
  if (this.criteriaScores && this.criteriaScores.length > 0 && (this.isNew || this.isModified("criteriaScores"))) {
    let totalWeightedScore = 0;
    let totalWeight = 0;
    this.criteriaScores.forEach(cs => {
      const weight = cs.weight || 1;
      totalWeightedScore += cs.score * weight;
      totalWeight += weight;
    });
    if (totalWeight > 0) {
      // Assuming criteria scores are 1-10 and overall is 1-5, adjust accordingly or ensure scales match.
      // For simplicity, let's assume scales match or are normalized before this point.
      // This example assumes overallScore is on the same scale as criteriaScores average.
      // If overallScore is 1-5 and criteria are 1-10, you might do: (totalWeightedScore / totalWeight) / 2
      this.overallScore = parseFloat((totalWeightedScore / totalWeight).toFixed(2));
    }
  }

  if (this.isModified("reviewText") && !this.isNew) {
    this.isEdited = true;
    this.editedAt = new Date();
  }

  // Soft delete handling
  if (this.isModified("isDeleted") && this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  next();
});

// Post-save/remove middleware to update aggregated ratings on the target model (Novel, Episode, etc.)
// This is crucial but can be complex. Consider an event-driven approach or a dedicated service.
async function updateTargetRatingAggregation(doc: IRating | null, action: "save" | "remove") {
  if (!doc || !doc.targetId || !doc.targetType) return;
  if (doc.status !== "approved" && action === "save" && !doc.isDeleted) return; // Only count approved, non-deleted ratings

  const TargetModel = models[doc.targetType] || model(doc.targetType);
  if (!TargetModel) {
    console.error(`Model ${doc.targetType} not found for rating aggregation.`);
    return;
  }

  const pipeline = [
    { $match: { targetId: doc.targetId, targetType: doc.targetType, status: "approved", isDeleted: false, isHiddenByAdmin: false } },
    { 
      $group: { 
        _id: "$targetId", 
        averageScore: { $avg: "$overallScore" }, 
        ratingCount: { $sum: 1 },
        // Optionally, count ratings per score value for a distribution chart
        scoreDistribution: {
          $push: "$overallScore"
        }
      }
    }
  ];

  const results = await model("Rating").aggregate(pipeline);

  let updateData: { [key: string]: any } = {
    "statistics.averageRating": 0,
    "statistics.ratingCount": 0,
    "statistics.ratingDistribution": { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } // Assuming 1-5 scale
  };

  if (results.length > 0) {
    const agg = results[0];
    updateData["statistics.averageRating"] = parseFloat(agg.averageScore.toFixed(2));
    updateData["statistics.ratingCount"] = agg.ratingCount;
    
    // Calculate distribution
    const distribution: { [key: number]: number } = { 1:0, 2:0, 3:0, 4:0, 5:0 };
    if (agg.scoreDistribution) {
        agg.scoreDistribution.forEach((score: number) => {
            const roundedScore = Math.round(score);
            if (distribution[roundedScore] !== undefined) {
                distribution[roundedScore]++;
            }
        });
    }
    updateData["statistics.ratingDistribution"] = distribution;

  } else {
    // If no ratings left, reset stats
  }

  try {
    await TargetModel.findByIdAndUpdate(doc.targetId, { $set: updateData });
    console.log(`Aggregated ratings updated for ${doc.targetType} ${doc.targetId}`);
  } catch (error) {
    console.error(`Error updating aggregated ratings for ${doc.targetType} ${doc.targetId}:`, error);
  }
}

RatingSchema.post("save", async function(doc: IRating) {
  // Update if status is approved, or if an approved rating is edited/deleted/hidden
  if (doc.isModified("status") || doc.isModified("overallScore") || doc.isModified("isDeleted") || doc.isModified("isHiddenByAdmin")) {
    if (doc.status === "approved" || doc.wasApprovedBeforeChange) { // wasApprovedBeforeChange needs to be set in pre-save if status changes from approved
        await updateTargetRatingAggregation(doc, "save");
    }
  }
});

// Need a pre-hook for findOneAndUpdate to handle soft deletes or status changes correctly for aggregation
RatingSchema.pre("findOneAndUpdate", async function(next) {
    const update = this.getUpdate() as any;
    // If isDeleted or isHiddenByAdmin is being set, or status changes from approved
    // We need the original document to know its previous state for correct aggregation update.
    // This logic can get complex and might be better handled by fetching the doc, then saving.
    // Or, by ensuring the update operation itself triggers a re-aggregation for the targetId.
    const docToUpdate = await this.model.findOne(this.getQuery());
    if (docToUpdate && docToUpdate.status === "approved") {
        (this as any).wasApprovedBeforeChange = true;
    }
    next();
});

RatingSchema.post("findOneAndUpdate", async function(doc: IRating | null) {
    // If an approved rating was modified (e.g. soft-deleted, hidden, score changed)
    if (doc && ((this as any).wasApprovedBeforeChange || doc.status === "approved")) {
        await updateTargetRatingAggregation(doc, "save");
    }
});

// For remove (hard delete, less common with soft delete strategy)
// RatingSchema.post("remove", async function(doc: IRating) {
//   await updateTargetRatingAggregation(doc, "remove");
// });

// ----- Model Export -----
const RatingModel = () =>
  models.Rating as mongoose.Model<IRating> || model<IRating>("Rating", RatingSchema);

export default RatingModel;