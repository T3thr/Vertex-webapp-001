// src/backend/models/Like.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface for Like document
// Represents a user liking a specific target entity (Novel, Episode, Comment, Media, etc.)
export interface ILike extends Document {
  user: Types.ObjectId; // ผู้ใช้ที่กดไลค์ (อ้างอิง User model)
  targetType: "Novel" | "Episode" | "Comment" | "Media" | "Review" | "Character" | "StoryMapNode"; // ประเภทของสิ่งที่ถูกไลค์
  targetId: Types.ObjectId; // ID ของสิ่งที่ถูกไลค์ (อ้างอิงตาม targetType)
  // Optional: Like type/reaction (if more than just a simple like, e.g., "heart", "thumbs_up", "celebrate")
  reactionType?: string; 
  createdAt: Date;
  updatedAt: Date; // Though likes are usually immutable in terms of content, timestamp might be useful
}

const LikeSchema = new Schema<ILike>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    targetType: {
      type: String,
      enum: ["Novel", "Episode", "Comment", "Media", "Review", "Character", "StoryMapNode"],
      required: [true, "กรุณาระบุประเภทของสิ่งที่ต้องการไลค์"],
      index: true,
    },
    targetId: { 
      type: Schema.Types.ObjectId, 
      required: [true, "กรุณาระบุ ID ของสิ่งที่ต้องการไลค์"], 
      index: true,
      refPath: "targetType" // Dynamic reference to the model specified in targetType
    },
    reactionType: { type: String, trim: true, maxlength: 50 }, // e.g., "default", "heart"
  },
  {
    timestamps: true,
    // Add refPath for dynamic referencing of targetId
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----- Indexes -----
// Unique compound index to ensure a user can like a specific target only once (with a specific reactionType if applicable)
LikeSchema.index({ user: 1, targetType: 1, targetId: 1, reactionType: 1 }, { unique: true });
LikeSchema.index({ targetType: 1, targetId: 1, createdAt: -1 }); // For fetching likes for an item
LikeSchema.index({ user: 1, createdAt: -1 }); // For fetching user's likes

// ----- Middleware to update like counts on the target model -----
// This is a critical piece for denormalization and performance.
// It should be robust and ideally handle potential race conditions or errors gracefully.
// Consider using an event-driven architecture for more complex scenarios.

async function updateTargetLikeCount(doc: ILike, operation: "increment" | "decrement") {
  if (!doc.targetId || !doc.targetType) return;

  const TargetModel = models[doc.targetType] || model(doc.targetType);
  if (!TargetModel) {
    console.error(`Model ${doc.targetType} not found for like count aggregation.`);
    return;
  }

  const updateField = "statistics.likeCount"; // Standardized field in target models
  const updateValue = operation === "increment" ? 1 : -1;

  try {
    await TargetModel.findByIdAndUpdate(doc.targetId, { $inc: { [updateField]: updateValue } });
    console.log(`Like count on ${doc.targetType} ${doc.targetId} updated by ${updateValue}.`);
  } catch (error) {
    console.error(`Error updating like count for ${doc.targetType} ${doc.targetId}:`, error);
    // Potentially add retry logic or queue for later processing if this fails
  }
}

// After a like is saved, increment the count on the target
LikeSchema.post("save", async function(doc: ILike) {
  await updateTargetLikeCount(doc, "increment");
});

// Before a like is removed (e.g., findOneAndDelete), decrement the count on the target
// Note: `this` in pre/post `remove` or `findOneAndDelete` hooks refers to the query or document respectively.
// For `findOneAndDelete`, the document is passed to the `post` hook.
LikeSchema.post("findOneAndDelete", async function(doc: ILike | null) {
  if (doc) {
    await updateTargetLikeCount(doc, "decrement");
  }
});

// If using soft deletes for Likes (not typical, usually hard delete for likes):
// LikeSchema.pre("findOneAndUpdate", async function(next) {
//   const update = this.getUpdate() as any;
//   if (update.$set && update.$set.isDeleted === true) {
//     const docToUpdate = await this.model.findOne(this.getQuery());
//     if (docToUpdate) {
//       (this as any)._docToDeleteForLikeCount = docToUpdate;
//     }
//   }
//   next();
// });
// LikeSchema.post("findOneAndUpdate", async function() {
//   const deletedDoc = (this as any)._docToDeleteForLikeCount;
//   if (deletedDoc) {
//     await updateTargetLikeCount(deletedDoc, "decrement");
//   }
// });

// ----- Model Export -----
// This generic LikeModel replaces NovelLike, EpisodeLike, etc.
const LikeModel = () =>
  models.Like as mongoose.Model<ILike> || model<ILike>("Like", LikeSchema);

export default LikeModel;