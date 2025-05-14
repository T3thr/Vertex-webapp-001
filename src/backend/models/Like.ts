// src/models/Like.ts
// โมเดลการถูกใจ (Like Model) - จัดการข้อมูลเมื่อผู้ใช้กดถูกใจเนื้อหาต่างๆ
// ออกแบบให้เชื่อมโยงกับผู้ใช้และเนื้อหาที่ถูกใจ (เช่น นิยาย, ตอน, ฉาก, ความคิดเห็น)

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// ประเภทของเนื้อหาที่สามารถถูกใจได้
export type LikableContentType = "Novel" | "Episode" | "Scene" | "Comment" | "UserPost"; // UserPost ถ้ามีระบบโพสต์ของผู้ใช้

// อินเทอร์เฟซหลักสำหรับเอกสารการถูกใจ (Like Document)
export interface ILike extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId; // ผู้ใช้ที่กดถูกใจ (อ้างอิง User model หรือ SocialMediaUser model)
  
  targetType: LikableContentType; // ประเภทของเนื้อหาที่ถูกใจ
  targetId: Types.ObjectId; // ID ของเนื้อหาที่ถูกใจ (อ้างอิงตาม targetType)
  
  // Timestamps
  createdAt: Date;
  // updatedAt ไม่จำเป็นมากนักสำหรับ Like, createdAt คือเวลาที่กดถูกใจ
}

const LikeSchema = new Schema<ILike>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User", // หรือ refPath เพื่อรองรับ SocialMediaUser
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["Novel", "Episode", "Scene", "Comment", "UserPost"],
      required: [true, "กรุณาระบุประเภทของเนื้อหาที่ถูกใจ (Target type is required)"],
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: [true, "กรุณาระบุ ID ของเนื้อหาที่ถูกใจ (Target ID is required)"],
      index: true,
      // refPath: "targetType" // ทำให้ ref อ้างอิงไปยัง Model ที่ถูกต้องตาม targetType
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // เก็บเฉพาะ createdAt
  }
);

// ----- Indexes -----
// Unique combination of user, targetType, and targetId to prevent duplicate likes
LikeSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true });
// For fetching likes for a specific content item
LikeSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
// For fetching likes by a user
LikeSchema.index({ user: 1, createdAt: -1 });

// ----- Middleware: Denormalization of likesCount -----
// Function to update likesCount on the target document
async function updateTargetLikesCount(targetType: LikableContentType, targetId: Types.ObjectId, increment: 1 | -1) {
  const TargetModel = models[targetType] || model(targetType);
  if (!TargetModel) {
    console.error(`Model ${targetType} not found for updating likes count.`);
    return;
  }

  try {
    // ตรวจสอบว่า target model มี field `likesCount` หรือ `statistics.totalLikes` หรือไม่
    // สมมติว่า Comment มี likesCount, Novel/Episode/Scene มี statistics.totalLikes
    let updateField = "likesCount"; // Default field name
    if (targetType === "Novel" || targetType === "Episode" || targetType === "Scene") {
      updateField = "statistics.totalLikes";
    }
    
    await TargetModel.findByIdAndUpdate(targetId, { $inc: { [updateField]: increment } });
  } catch (error) {
    console.error(`Error updating likes count for ${targetType} ${targetId}:`, error);
  }
}

// After a new like is saved, increment the count on the target
LikeSchema.post("save", async function (doc: ILike) {
  if (doc.isNew) { // Ensure this runs only for new documents
    await updateTargetLikesCount(doc.targetType, doc.targetId, 1);
  }
});

// Before a like is removed (e.g., findOneAndDelete), decrement the count on the target
LikeSchema.pre("findOneAndDelete", async function (next) {
  try {
    // `this` is the Query object. We need to get the document being deleted.
    const docToDelete = await this.model.findOne(this.getFilter()).lean();
    if (docToDelete) {
      await updateTargetLikesCount(docToDelete.targetType, docToDelete.targetId, -1);
    }
    next();
  } catch (error: any) {
    console.error("Error in pre findOneAndDelete hook for Like:", error);
    next(error);
  }
});

// Handle deleteOne and deleteMany if used, though typically likes are removed individually.
// For deleteOne:
LikeSchema.pre("deleteOne", async function(next) {
    try {
        const docToDelete = await this.model.findOne(this.getFilter()).lean();
        if (docToDelete) {
            await updateTargetLikesCount(docToDelete.targetType, docToDelete.targetId, -1);
        }
        next();
    } catch (error: any) {
        console.error("Error in pre deleteOne hook for Like:", error);
        next(error);
    }
});

// For deleteMany (more complex, as it might affect multiple targets):
LikeSchema.pre("deleteMany", async function(next) {
    try {
        const docsToDelete = await this.model.find(this.getFilter()).lean();
        for (const doc of docsToDelete) {
            await updateTargetLikesCount(doc.targetType, doc.targetId, -1);
        }
        next();
    } catch (error: any) {
        console.error("Error in pre deleteMany hook for Like:", error);
        next(error);
    }
});


// ----- Model Export -----
const LikeModel = () => models.Like as mongoose.Model<ILike> || model<ILike>("Like", LikeSchema);

export default LikeModel;

