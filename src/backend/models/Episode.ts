// src/backend/models/Episode.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import ActivityHistoryModel, { IActivityHistory } from "./ActivityHistory"; // Import ActivityHistory for logging

// Interface สำหรับ Scene (ฉาก) ภายใน Episode
// This is a subdocument, not a standalone model.
export interface ISceneSubdocument {
  id: string; // ID ของฉาก (unique ภายใน Episode, อาจใช้ UUID)
  title?: string; // ชื่อฉาก (optional, สำหรับ writer reference)
  order: number; // ลำดับของฉากภายใน Episode
  type: "text" | "dialogue" | "choice" | "mediaDisplay" | "effectTrigger" | "gameStateChange" | "branchPoint" | "ending"; // ประเภทของฉาก
  content: {
    text?: string; 
    speaker?: string; 
    characterId?: Types.ObjectId; 
    characterEmotion?: string; 
    characterPosition?: "left" | "center" | "right" | "custom"; 
    choices?: Array<{
      id: string; 
      text: string; 
      targetNodeId?: string; 
      nextSceneId?: string; 
      conditions?: any[]; 
      effects?: any[]; 
    }>;
    mediaElements?: Array<{
      mediaId: Types.ObjectId; 
      mediaType: "image" | "audio" | "background" | "video" | "sfx"; 
      alias?: string; 
      layer?: number; 
      position?: { x: number; y: number; unit?: "%" | "px" };
      size?: { width: number; height: number; unit?: "%" | "px" };
      opacity?: number; 
      duration?: number; 
      loop?: boolean; 
      volume?: number; 
      fadeInDuration?: number; 
      fadeOutDuration?: number; 
    }>;
    visualEffects?: Array<{
      type: "screenShake" | "screenFlash" | "imageFilter" | "transition"; 
      targetElementAlias?: string; 
      duration: number; 
      intensity?: number; 
      color?: string; 
      parameters?: Record<string, any>; 
    }>;
    gameStateUpdates?: Array<{
      type: "stat" | "relationship" | "item" | "flag" | "achievementUnlock";
      targetId: string; 
      operation: "set" | "increment" | "decrement" | "toggle"; 
      value?: any; 
      displayText?: string; 
    }>;
  };
  nextSceneId?: string; 
  storyMapNodeId?: string; 
  metadata?: Record<string, any>; 
}

// Interface สำหรับ Episode document
export interface IEpisode extends Document {
  novel: Types.ObjectId; // อ้างอิงไปยัง Novel
  title: string; // ชื่อตอน
  slug: string; // URL slug (unique ภายใน Novel)
  episodeNumber: number; // ลำดับตอน (1, 2, 3,...)
  author: Types.ObjectId; // ผู้เขียนตอน (อ้างอิง User model)
  summary?: string; // สรุปเนื้อหาของตอนนี้
  coverImage?: string; // URL รูปปกของตอนนี้
  status: "draft" | "scheduled" | "published" | "archived"; // สถานะของตอน
  visibility: "public" | "unlisted" | "private" | "subscribersOnly"; // การมองเห็น
  
  // Coin-based system integration (การเชื่อมโยงกับระบบ Coin)
  isFree: boolean; // ตอนนี้ฟรีหรือไม่
  priceInCoins?: number; // ราคาเป็น Coin (ถ้า isFree = false)
  // currency field is removed as we are standardizing on coins for content purchase

  publishedAt?: Date; // วันที่เผยแพร่จริง
  scheduledFor?: Date; // วันที่ตั้งเวลาเผยแพร่
  scenes: ISceneSubdocument[]; // เนื้อหาของตอนประกอบด้วยหลายฉาก
  startSceneId: string; // ID ของฉากแรกในตอน
  
  // Statistics (สถิติของตอน)
  viewsCount: number;
  uniqueViewsCount?: number;
  likesCount: number; 
  commentsCount: number; 
  purchasesCount?: number; // จำนวนครั้งที่ถูกซื้อ (ถ้า isFree = false)
  totalCoinsEarned?: number; // จำนวน Coin ทั้งหมดที่ได้รับจากตอนนี้ (คำนวณจาก purchasesCount * priceInCoins)

  // Calculated/Estimated values (ค่าที่คำนวณหรือประมาณ)
  estimatedReadingTimeMinutes?: number; 
  wordCount?: number; 
  
  // Settings (การตั้งค่า)
  allowComments: boolean;
  
  // AI/ML Fields (ฟิลด์สำหรับ AI/ML)
  embeddingVector?: number[]; 
  keywords?: string[]; 
  sentiment?: { score: number; dominantEmotion?: string }; 
  
  // Standard Timestamps and Soft Delete (ข้อมูลเวลามาตรฐานและการลบแบบ soft delete)
  isDeleted: boolean; 
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  lastSignificantUpdateAt?: Date; 
}

const SceneSubdocumentSchema = new Schema<ISceneSubdocument>({
  id: { type: String, required: true },
  title: { type: String, trim: true },
  order: { type: Number, required: true, min: 0 },
  type: {
    type: String,
    enum: ["text", "dialogue", "choice", "mediaDisplay", "effectTrigger", "gameStateChange", "branchPoint", "ending"],
    required: [true, "กรุณาระบุประเภทของฉาก"],
  },
  content: {
    text: { type: String, trim: true },
    speaker: { type: String, trim: true },
    characterId: { type: Schema.Types.ObjectId, ref: "Character" },
    characterEmotion: String,
    characterPosition: { type: String, enum: ["left", "center", "right", "custom"] },
    choices: [{
      _id: false,
      id: { type: String, required: true },
      text: { type: String, required: true, trim: true },
      targetNodeId: String,
      nextSceneId: String,
      conditions: [Schema.Types.Mixed],
      effects: [Schema.Types.Mixed],
    }],
    mediaElements: [{
      _id: false,
      mediaId: { type: Schema.Types.ObjectId, ref: "Media", required: true },
      mediaType: { type: String, enum: ["image", "audio", "background", "video", "sfx"], required: true },
      alias: String,
      layer: Number,
      position: { x: Number, y: Number, unit: String },
      size: { width: Number, height: Number, unit: String },
      opacity: { type: Number, min: 0, max: 1 },
      duration: Number,
      loop: Boolean,
      volume: { type: Number, min: 0, max: 1 },
      fadeInDuration: Number,
      fadeOutDuration: Number,
    }],
    visualEffects: [{
      _id: false,
      type: { type: String, enum: ["screenShake", "screenFlash", "imageFilter", "transition"], required: true },
      targetElementAlias: String,
      duration: { type: Number, required: true, min: 0 },
      intensity: { type: Number, min: 0, max: 1 },
      color: String,
      parameters: Schema.Types.Mixed,
    }],
    gameStateUpdates: [{
      _id: false,
      type: { type: String, enum: ["stat", "relationship", "item", "flag", "achievementUnlock"], required: true },
      targetId: { type: String, required: true },
      operation: { type: String, enum: ["set", "increment", "decrement", "toggle"], required: true },
      value: Schema.Types.Mixed,
      displayText: String,
    }],
  },
  nextSceneId: String,
  storyMapNodeId: String,
  metadata: Schema.Types.Mixed,
}, { _id: false });

const EpisodeSchema = new Schema<IEpisode>(
  {
    novel: { type: Schema.Types.ObjectId, ref: "Novel", required: true, index: true },
    title: { type: String, required: [true, "กรุณาระบุชื่อตอน"], trim: true, maxlength: [250, "ชื่อตอนต้องไม่เกิน 250 ตัวอักษร"] },
    slug: { 
        type: String, 
        required: [true, "กรุณาระบุ slug สำหรับตอน"], 
        trim: true, 
        lowercase: true, 
        maxlength: [270, "Slug ต้องไม่เกิน 270 ตัวอักษร"],
    },
    episodeNumber: { type: Number, required: [true, "กรุณาระบุลำดับตอน"], min: 1, index: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    summary: { type: String, trim: true, maxlength: [2000, "สรุปเนื้อหาตอนต้องไม่เกิน 2000 ตัวอักษร"] },
    coverImage: { type: String, trim: true },
    status: { type: String, enum: ["draft", "scheduled", "published", "archived"], default: "draft", index: true },
    visibility: { type: String, enum: ["public", "unlisted", "private", "subscribersOnly"], default: "private", index: true },
    isFree: { type: Boolean, default: true },
    priceInCoins: { 
      type: Number, 
      min: 0, 
      validate: {
        validator: function(this: IEpisode, v: number | undefined) { 
          return this.isFree || (typeof v === "number" && v >= 0); 
        },
        message: "กรุณาระบุราคาเป็น Coin ที่ถูกต้องสำหรับตอนที่ต้องชำระเงิน (0 หรือมากกว่า)"
      },
      default: function(this: IEpisode) {
        return this.isFree ? undefined : 0; // ถ้าฟรี ไม่ต้องมีราคา, ถ้าไม่ฟรี default เป็น 0 coin
      }
    },
    publishedAt: { type: Date, index: true },
    scheduledFor: { 
      type: Date, 
      validate: { 
        validator: function(this: IEpisode, v: Date | undefined) { 
          return this.status !== "scheduled" || (v && v > new Date()); 
        }, 
        message: "วันที่ตั้งเวลาเผยแพร่ต้องเป็นอนาคต"
      }
    },
    scenes: [SceneSubdocumentSchema],
    startSceneId: { 
        type: String, 
        required: [true, "กรุณาระบุ ID ของฉากเริ่มต้น"], 
        validate: { 
            validator: function(this: IEpisode, v: string) { 
              return this.scenes && this.scenes.some(scene => scene.id === v); 
            }, 
            message: "ID ฉากเริ่มต้นไม่พบในรายการฉากของตอนนี้"
        }
    },
    viewsCount: { type: Number, default: 0, min: 0, index: true },
    uniqueViewsCount: { type: Number, default: 0, min: 0 },
    likesCount: { type: Number, default: 0, min: 0, index: true },
    commentsCount: { type: Number, default: 0, min: 0 },
    purchasesCount: { type: Number, default: 0, min: 0 },
    totalCoinsEarned: { type: Number, default: 0, min: 0 }, // เพิ่ม field totalCoinsEarned
    estimatedReadingTimeMinutes: { type: Number, min: 0 },
    wordCount: { type: Number, min: 0 },
    allowComments: { type: Boolean, default: true },
    embeddingVector: { type: [Number], select: false },
    keywords: { type: [String], index: true },
    sentiment: { score: Number, dominantEmotion: String, select: false },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    lastSignificantUpdateAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true, 
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----- Indexes (ดัชนี) -----
EpisodeSchema.index({ novel: 1, slug: 1, isDeleted: 1 }, { unique: true });
EpisodeSchema.index({ novel: 1, episodeNumber: 1, isDeleted: 1 }, { unique: true });
EpisodeSchema.index({ novel: 1, status: 1, visibility: 1, isDeleted: 1 });
EpisodeSchema.index(
  { novel: 1, status: 1, publishedAt: -1, isDeleted: 1 },
  { partialFilterExpression: { status: "published" } }
);
EpisodeSchema.index({ title: "text", summary: "text", keywords: "text" }, { default_language: "thai", weights: { title: 10, summary: 5, keywords: 2 } });
EpisodeSchema.index({ novel: 1, isFree: 1, status: 1, isDeleted: 1 }); // สำหรับ query ตอนฟรี/เสียเงิน

// ----- Middleware (มิดเดิลแวร์) -----
EpisodeSchema.pre("save", async function (next) {
  // Auto-generate slug from title if not provided or if title changes
  if ((this.isModified("title") || this.isNew) && (!this.slug || this.isModified("title"))) {
    const baseSlug = (this.title || "")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9ก-๙เ-ไ\-]+/g, "")
      .replace(/--+/g, "-")
      .substring(0, 70);
    this.slug = `${baseSlug || "episode"}-${this.episodeNumber}`;
    // Basic uniqueness check, for more robust, consider a dedicated slug service or more complex logic
    const Episode = this.constructor as mongoose.Model<IEpisode>; 
    let count = 0;
    let finalSlug = this.slug;
    while (await Episode.findOne({ novel: this.novel, slug: finalSlug, _id: { $ne: this._id }, isDeleted: this.isDeleted })) {
        count++;
        finalSlug = `${this.slug}-${count}`;
    }
    this.slug = finalSlug;
  }

  if (this.isModified("status") && this.status === "published" && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  if (this.isModified("scenes")) {
    let textContent = "";
    this.scenes.forEach(scene => {
      if (scene.content.text) textContent += scene.content.text + " ";
      if (scene.content.choices) {
        scene.content.choices.forEach(choice => textContent += choice.text + " ");
      }
    });
    this.wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;
    this.estimatedReadingTimeMinutes = Math.ceil((this.wordCount || 0) / 200); 
    this.lastSignificantUpdateAt = new Date();
  }
  
  if (this.isNew || this.isModified("title") || this.isModified("summary") || this.isModified("status") || this.isModified("isFree") || this.isModified("priceInCoins")) {
      this.lastSignificantUpdateAt = new Date();
  }

  // Update totalCoinsEarned when purchasesCount or priceInCoins changes
  if (!this.isFree && (this.isModified("purchasesCount") || this.isModified("priceInCoins"))) {
    this.totalCoinsEarned = (this.purchasesCount || 0) * (this.priceInCoins || 0);
  }

  next();
});

// ----- Middleware: Update Novel stats after Episode save/delete -----
async function updateNovelOnEpisodeChange(doc: IEpisode | null) {
    if (!doc || !doc.novel) return;
    try {
        const NovelModel = models.Novel as mongoose.Model<any>; // Use any for INovel to avoid circular dependency issues here
        const EpisodeModel = models.Episode as mongoose.Model<IEpisode>;
        const novelId = doc.novel;

        const episodeStats = await EpisodeModel.aggregate([
            { $match: { novel: novelId, isDeleted: false } },
            {
                $group: {
                    _id: "$novel",
                    episodesCount: { $sum: 1 },
                    publishedEpisodesCount: { $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] } },
                    totalWordsCount: { $sum: "$wordCount" }, 
                    totalCoinsRevenueFromEpisodes: { $sum: { $cond: [ { $eq: ["$isFree", false] }, "$totalCoinsEarned", 0 ] } }, // รวมรายได้ Coin จากตอนที่ไม่ฟรี
                    lastEpisodePublishedAt: { $max: { $cond: [ { $eq: ["$status", "published"] }, "$publishedAt", null ] } }
                }
            }
        ]);

        if (episodeStats.length > 0) {
            const stats = episodeStats[0];
            await NovelModel.findByIdAndUpdate(novelId, {
                episodesCount: stats.episodesCount || 0,
                publishedEpisodesCount: stats.publishedEpisodesCount || 0,
                wordsCount: stats.totalWordsCount || 0, 
                totalCoinRevenue: stats.totalCoinsRevenueFromEpisodes || 0, // อัปเดต totalCoinRevenue ของ Novel
                lastEpisodePublishedAt: stats.lastEpisodePublishedAt,
                $set: { lastSignificantUpdateAt: new Date() } 
            });
        } else {
            await NovelModel.findByIdAndUpdate(novelId, {
                episodesCount: 0,
                publishedEpisodesCount: 0,
                wordsCount: 0,
                totalCoinRevenue: 0,
                lastEpisodePublishedAt: null,
                $set: { lastSignificantUpdateAt: new Date() } 
            });
        }
    } catch (error) {
        console.error(`Error updating novel stats for novel ${doc.novel}:`, error);
    }
}

EpisodeSchema.post("save", async function(doc) {
    await updateNovelOnEpisodeChange(doc);
    // Log activity for episode creation/update
    try {
        const ActivityHistory = ActivityHistoryModel();
        await new ActivityHistory({
            user: doc.author, // The user who performed the action (writer)
            actionType: this.isNew ? "CREATE_EPISODE" : "UPDATE_EPISODE",
            targetType: "Episode",
            targetId: doc._id,
            novelContext: doc.novel,
            details: {
                title: doc.title,
                episodeNumber: doc.episodeNumber,
                status: doc.status,
                isFree: doc.isFree,
                priceInCoins: doc.priceInCoins,
                // Add more details as needed for history
            }
        }).save();
    } catch (error) {
        console.error("Error logging episode activity:", error);
    }
});

EpisodeSchema.post("findOneAndUpdate", async function(doc) {
    // For findOneAndUpdate, 'this' is the query, 'doc' is the updated document (if {new: true})
    // This hook might be less reliable for capturing the 'user' who performed the action unless passed in query options.
    // Consider service-level logging for more robust activity tracking on updates.
    if (doc) {
        await updateNovelOnEpisodeChange(doc as IEpisode);
    }
});

EpisodeSchema.post("findOneAndDelete", async function(doc) {
    // Similar to findOneAndUpdate, 'doc' is the deleted document.
    if (doc) {
        await updateNovelOnEpisodeChange(doc as IEpisode);
        // Log activity for episode deletion
        try {
            const ActivityHistory = ActivityHistoryModel();
            await new ActivityHistory({
                user: doc.author, // Assuming author is the one deleting, might need context
                actionType: "DELETE_EPISODE",
                targetType: "Episode",
                targetId: doc._id,
                novelContext: doc.novel,
                details: { title: doc.title, episodeNumber: doc.episodeNumber }
            }).save();
        } catch (error) {
            console.error("Error logging episode deletion activity:", error);
        }
    }
});

// ----- Model Export -----
const EpisodeModel = () => models.Episode as mongoose.Model<IEpisode> || model<IEpisode>("Episode", EpisodeSchema);

export default EpisodeModel;