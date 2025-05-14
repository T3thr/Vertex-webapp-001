// src/models/Episode.ts
// โมเดลตอนของนิยาย (Episode Model) - จัดการข้อมูลของแต่ละตอนในนิยาย
// ออกแบบให้รองรับการเรียงลำดับ, สถานะการเผยแพร่, การเข้าถึง, และการเชื่อมโยงไปยังฉากแรกของตอน
// ปรับปรุงให้สอดคล้องกับ Novel model ที่มี endingType และ theme

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// อินเทอร์เฟซสำหรับสถานะการเผยแพร่ของตอน
export type EpisodeStatus = "draft" | "published" | "scheduled" | "archived";
// draft: ฉบับร่าง, ผู้เขียนกำลังแก้ไข
// published: เผยแพร่แล้ว
// scheduled: ตั้งเวลาเผยแพร่
// archived: จัดเก็บถาวร

// อินเทอร์เฟซสำหรับข้อมูลสถิติของตอน (อาจ denormalize บางส่วน)
export interface IEpisodeStats {
  viewCount: number; // จำนวนครั้งที่ถูกเปิดอ่าน
  likeCount: number; // จำนวนไลค์สำหรับตอนนี้
  commentCount: number; // จำนวนความคิดเห็นสำหรับตอนนี้
  wordCount?: number; // จำนวนคำโดยประมาณในตอนนี้ (อาจคำนวณจาก Scenes)
  readingTimeMinutes?: number; // เวลาอ่านโดยประมาณของตอนนี้ (นาที)
  // ตัวอย่าง: viewCount: 5000, likeCount: 150, commentCount: 20, wordCount: 2500
}

// อินเทอร์เฟซหลักสำหรับเอกสารตอน (Episode Document)
export interface IEpisode extends Document {
  _id: Types.ObjectId;
  novel: Types.ObjectId; // นิยายที่เป็นเจ้าของตอนนี้ (อ้างอิง Novel model)
  title: string; // ชื่อตอน (ภาษาไทย, เช่น "บทที่ 1: การเริ่มต้น")
  episodeNumber: number; // ลำดับของตอน (เช่น 1, 2, 3, ...)
  
  // เนื้อหาและการดำเนินเรื่อง
  firstScene: Types.ObjectId; // ID ของฉากแรกในตอนนี้ (อ้างอิง Scene model)
  // endScenes?: Types.ObjectId[]; // ID ของฉากที่สามารถเป็นจุดจบของตอนนี้ได้ (ถ้า Novel.endingType ไม่ใช่ single_linear)
  // ตัวอย่าง: ถ้า Novel.endingType = "multiple_branching_paths", ตอนนี้อาจมี endScenes หลายฉาก
  isBranchingPoint?: boolean; // ตอนนี้เป็นจุดที่เนื้อเรื่องจะแตกแขนงหรือไม่ (สำหรับ UI ใน StoryMap)
  
  status: EpisodeStatus; // สถานะการเผยแพร่
  publishedAt?: Date; // วันที่เผยแพร่ (ถ้า status เป็น published หรือ scheduled)
  scheduledFor?: Date; // วันที่ตั้งเวลาเผยแพร่ (ถ้า status เป็น scheduled)
  
  // การเข้าถึง (อาจ override หรือเสริมจาก Novel.accessControl)
  isFreeToRead: boolean; // อ่านฟรีหรือไม่ (อาจ default ตาม Novel)
  price?: number; // ราคาสำหรับตอนนี้ (ถ้าไม่ฟรี และ Novel.accessControl.monetizationModel = "pay_per_episode")
  currency?: string; // สกุลเงิน (เช่น "COIN", ควรตรงกับ Novel.accessControl.currency)
  // ตัวอย่าง: isFreeToRead: false, price: 10, currency: "COIN"
  
  // สถิติ
  stats: IEpisodeStats;
  
  // ข้อมูลเพิ่มเติม
  synopsis?: string; // เรื่องย่อสั้นๆ ของตอนนี้ (ภาษาไทย, สำหรับแสดงในสารบัญตอน)
  // ตัวอย่าง: synopsis: "การตัดสินใจครั้งสำคัญที่ทางแยกของโชคชะตา"
  authorNotes?: string; // หมายเหตุจากผู้เขียนสำหรับตอนนี้ (แสดงให้ผู้อ่านเห็นได้)
  // ตัวอย่าง: "ตอนนี้มี Easter egg ซ่อนอยู่นะครับ ลองหากันดู!"
  coverImageUrl?: string; // URL ภาพปกของตอน (ถ้าต้องการให้แต่ละตอนมีภาพปกแยก)
  
  // การอัปเดต
  lastUpdatedAt: Date; // วันที่ข้อมูลตอนมีการแก้ไขล่าสุด

  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;

  // Timestamps
  createdAt: Date;
  // updatedAt จะถูก Mongoose จัดการอยู่แล้ว
}

// Schema ย่อยสำหรับ IEpisodeStats
const EpisodeStatsSchema = new Schema<IEpisodeStats>(
  {
    viewCount: { type: Number, default: 0, min: 0 },
    likeCount: { type: Number, default: 0, min: 0 },
    commentCount: { type: Number, default: 0, min: 0 },
    wordCount: { type: Number, min: 0 },
    readingTimeMinutes: { type: Number, min: 0 },
  },
  { _id: false }
);

// Schema หลักสำหรับ Episode
const EpisodeSchema = new Schema<IEpisode>(
  {
    novel: {
      type: Schema.Types.ObjectId,
      ref: "Novel",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "กรุณาระบุชื่อตอน (Episode title is required)"],
      trim: true,
      maxlength: 250,
    },
    episodeNumber: {
      type: Number,
      required: [true, "กรุณาระบุลำดับของตอน (Episode number is required)"],
      min: 0, // อาจมีบทนำเป็นตอนที่ 0
      index: true,
    },
    firstScene: {
      type: Schema.Types.ObjectId,
      ref: "Scene",
      // required: true, // อาจไม่บังคับถ้าตอนยังเป็น draft และยังไม่ได้สร้างฉาก
    },
    // endScenes: [{ type: Schema.Types.ObjectId, ref: "Scene" }],
    isBranchingPoint: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["draft", "published", "scheduled", "archived"],
      default: "draft",
      index: true,
      required: true,
    },
    publishedAt: { type: Date, index: true },
    scheduledFor: { type: Date, index: true },
    isFreeToRead: { type: Boolean, default: true }, // อาจมี logic ที่ดึง default จาก Novel
    price: { type: Number, min: 0 },
    currency: { type: String, trim: true, uppercase: true, maxlength: 10 },
    stats: { type: EpisodeStatsSchema, default: () => ({}) },
    synopsis: { type: String, trim: true, maxlength: 1000 },
    authorNotes: { type: String, trim: true, maxlength: 5000 },
    coverImageUrl: { type: String, trim: true, maxlength: 500 },
    lastUpdatedAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----- Indexes -----
// Index สำหรับการ query ตอนของนิยายเรื่องหนึ่งๆ เรียงตามลำดับตอน
EpisodeSchema.index({ novel: 1, episodeNumber: 1 }, { unique: true }); // ลำดับตอนในแต่ละนิยายต้องไม่ซ้ำกัน
EpisodeSchema.index({ novel: 1, status: 1, publishedAt: -1 }); // ตอนล่าสุดที่เผยแพร่ของนิยาย

// ----- Middleware -----
// Middleware สำหรับอัปเดต lastUpdatedAt ก่อน save
EpisodeSchema.pre<IEpisode>("save", async function (next) {
  if (this.isModified()) {
    this.lastUpdatedAt = new Date();
  }
  // ถ้า status เปลี่ยนเป็น published และ publishedAt ยังไม่ได้ตั้ง, ให้ตั้งเป็นวันปัจจุบัน
  if (this.isModified("status") && this.status === "published" && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  // อัปเดต Novel.stats.totalChapters และ Novel.lastEpisodePublishedAt เมื่อมีการ publish/unpublish ตอน
  if (this.isModified("status") || this.isNew) {
    const novelId = this.novel;
    const Novel = models.Novel || model("Novel"); // Ensure Novel model is available
    if (Novel) {
      const episodeStatus = this.status;
      const isPublished = episodeStatus === "published";
      const isPreviouslyPublished = this.get("status", null, { getters: false }) === "published";

      let updateOp: any = {};
      if (isPublished && !isPreviouslyPublished) { // New publish or changed to publish
        updateOp.$inc = { "stats.totalChapters": 1 };
        updateOp.$set = { lastEpisodePublishedAt: this.publishedAt || new Date() };
      } else if (!isPublished && isPreviouslyPublished) { // Changed from publish to something else
        updateOp.$inc = { "stats.totalChapters": -1 };
        // Logic to find the new lastEpisodePublishedAt might be complex here, 
        // often handled by a separate script or by querying other episodes.
        // For simplicity, we might just nullify it or leave it, depending on requirements.
      }
      if (Object.keys(updateOp).length > 0) {
        try {
          await Novel.updateOne({ _id: novelId }, updateOp);
        } catch (err) {
          console.error("Error updating novel stats from episode save:", err);
          // Handle error appropriately, maybe log or queue for retry
        }
      }
    }
  }
  next();
});

// ----- Virtuals -----
// Virtual field สำหรับ URL ของตอน (ตัวอย่าง)
EpisodeSchema.virtual("episodeUrl").get(function(this: IEpisode) {
  // ต้องการข้อมูล slug ของ novel มาประกอบ URL
  // อาจจะต้อง populate novel title/slug หรือมีวิธีอื่นในการสร้าง URL ที่สมบูรณ์
  // This is a placeholder, actual implementation might need novel slug.
  // const novelSlug = this.parent()?.slug || "NOVEL_SLUG_OR_ID"; // Access parent if populated
  // For now, let's assume novelId can be used if slug is not available directly
  return `/novel/${this.novel}/episode/${this.episodeNumber}`;
});

// ----- Model Export -----
const EpisodeModel = () => models.Episode as mongoose.Model<IEpisode> || model<IEpisode>("Episode", EpisodeSchema);

export default EpisodeModel;

