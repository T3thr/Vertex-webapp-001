// src/backend/models/Episode.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface สำหรับ Scene (ฉาก) ภายใน Episode
// This is a subdocument, not a standalone model.
export interface ISceneSubdocument {
  id: string; // ID ของฉาก (unique ภายใน Episode, อาจใช้ UUID)
  title?: string; // ชื่อฉาก (optional, สำหรับ writer reference)
  order: number; // ลำดับของฉากภายใน Episode (สำหรับ editor, ไม่จำเป็นสำหรับ player logic if using nextSceneId)
  type: "text" | "dialogue" | "choice" | "mediaDisplay" | "effectTrigger" | "gameStateChange" | "branchPoint" | "ending"; // ประเภทของฉาก
  content: {
    text?: string; // สำหรับ type: text, dialogue
    speaker?: string; // ชื่อผู้พูด (สำหรับ type: dialogue, อาจเป็นชื่อตัวละคร หรือ "Narrator")
    characterId?: Types.ObjectId; // อ้างอิง Character model (สำหรับ type: dialogue)
    characterEmotion?: string; // อารมณ์ของตัวละคร (เช่น "happy", "sad", key สำหรับ sprite)
    characterPosition?: "left" | "center" | "right" | "custom"; // ตำแหน่งแสดงตัวละคร
    choices?: Array<{ // สำหรับ type: choice
      id: string; // ID ของตัวเลือก
      text: string; // ข้อความของตัวเลือก
      targetNodeId?: string; // ID ของโหนดใน StoryMap ที่จะไปต่อ (ถ้าใช้ StoryMap)
      nextSceneId?: string; // ID ของฉากถัดไปภายใน Episode (ถ้าไม่ใช้ StoryMap หรือเป็น linear choice)
      conditions?: any[]; // เงื่อนไขในการแสดงตัวเลือกนี้ (อ้างอิงโครงสร้างจาก StoryMapNode.conditions)
      effects?: any[]; // ผลกระทบเมื่อเลือกตัวเลือกนี้ (อ้างอิงโครงสร้างจาก StoryMapNode.effects)
    }>;
    mediaElements?: Array<{ // สำหรับ type: mediaDisplay
      mediaId: Types.ObjectId; // อ้างอิง Media model (image, audio, background, video)
      mediaType: "image" | "audio" | "background" | "video" | "sfx"; // ประเภทของสื่อ
      // การตั้งค่าการแสดงผล (คล้ายกับ StoryMapNode.media)
      alias?: string; // ชื่อเรียก media นี้ใน scene (เช่น "main_character_sprite")
      layer?: number; // ลำดับการซ้อน (z-index)
      position?: { x: number; y: number; unit?: "%" | "px" };
      size?: { width: number; height: number; unit?: "%" | "px" };
      opacity?: number; // 0-1
      duration?: number; // ระยะเวลาแสดงผล (ms), ถ้าไม่กำหนดจะอยู่จนกว่าจะถูกลบ/เปลี่ยน
      loop?: boolean; // สำหรับ audio/video
      volume?: number; // 0-1, สำหรับ audio/video
      fadeInDuration?: number; // ms
      fadeOutDuration?: number; // ms
      // เพิ่มเติม: animation, filter, etc.
    }>;
    visualEffects?: Array<{ // สำหรับ type: effectTrigger
      type: "screenShake" | "screenFlash" | "imageFilter" | "transition"; // ประเภท effect
      targetElementAlias?: string; // alias ของ mediaElement ที่จะ apply effect (ถ้าไม่ระบุคือ screen)
      duration: number; // ms
      intensity?: number; // 0-1
      color?: string; // สำหรับ flash, filter
      parameters?: Record<string, any>; // เช่น { type: "blur", amount: "5px" } สำหรับ imageFilter
    }>;
    gameStateUpdates?: Array<{ // สำหรับ type: gameStateChange
      type: "stat" | "relationship" | "item" | "flag" | "achievementUnlock";
      targetId: string; // statId, characterId for relationship, itemId, flagName, achievementId
      operation: "set" | "increment" | "decrement" | "toggle"; // toggle for boolean flags
      value?: any; // ค่าที่จะ set/increment/decrement
      displayText?: string; // ข้อความที่จะแสดงให้ผู้เล่นเห็น (เช่น "HP +10")
    }>;
  };
  // การนำทาง
  // ถ้าเป็น branchPoint อาจจะไม่มี nextSceneId โดยตรง แต่จะถูกกำหนดโดย StoryMap หรือ logic อื่น
  // ถ้าเป็น ending ก็จะไม่มี nextSceneId
  nextSceneId?: string; // ID ของฉากถัดไป (ถ้าเป็น linear)
  storyMapNodeId?: string; // ID ของโหนดใน StoryMap ที่ฉากนี้เชื่อมโยง (optional)
  metadata?: Record<string, any>; // ข้อมูลเพิ่มเติม เช่น background music, ambient sound for this scene
}

// Interface สำหรับ Episode document
export interface IEpisode extends Document {
  novel: Types.ObjectId; // อ้างอิงไปยัง Novel
  title: string; // ชื่อตอน
  slug: string; // URL slug (unique ภายใน Novel)
  episodeNumber: number; // ลำดับตอน (1, 2, 3,...)
  author: Types.ObjectId; // ผู้เขียนตอน (อ้างอิง User model, อาจต่างจากผู้เขียนนิยาย)
  summary?: string; // สรุปเนื้อหาของตอนนี้ (สำหรับแสดงให้ผู้อ่าน)
  coverImage?: string; // URL รูปปกของตอนนี้ (ถ้ามี, ถ้าไม่มีอาจใช้รูปปกนิยาย)
  status: "draft" | "scheduled" | "published" | "archived"; // สถานะของตอน
  visibility: "public" | "unlisted" | "private" | "subscribersOnly"; // การมองเห็น
  isFree: boolean; // ตอนนี้ฟรีหรือไม่ (ตรงข้ามกับ isPremium)
  price?: number; // ราคา (ถ้า isFree = false)
  currency?: string; // สกุลเงิน (ถ้า isFree = false, default จาก Novel หรือ platform settings)
  publishedAt?: Date; // วันที่เผยแพร่จริง
  scheduledFor?: Date; // วันที่ตั้งเวลาเผยแพร่ (ถ้า status = scheduled)
  // เนื้อหาของตอนประกอบด้วยหลายฉาก (scenes)
  // การเก็บ scenes เป็น array ใหญ่ใน Episode document อาจมีปัญหาเรื่องขนาดถ้าฉากเยอะมาก
  // พิจารณา: ถ้าฉากเยอะมาก อาจจะต้องแยก Scene เป็น collection ของตัวเองแล้วอ้างอิงกลับมาที่ Episode
  // แต่สำหรับ visual novel ทั่วไป การ embed น่าจะยังพอไหวและเร็วกว่า
  scenes: ISceneSubdocument[];
  startSceneId: string; // ID ของฉากแรกในตอน
  // สถิติของตอน
  viewsCount: number;
  uniqueViewsCount?: number;
  likesCount: number; // จาก EpisodeLike model
  commentsCount: number; // จาก Comment model (ที่ targetType=Episode)
  purchasesCount?: number; // จำนวนครั้งที่ถูกซื้อ (ถ้า isFree = false)
  // คำนวณ/ประมาณค่า
  estimatedReadingTimeMinutes?: number; // เวลาอ่านโดยประมาณ (นาที)
  wordCount?: number; // จำนวนคำโดยประมาณ
  // การตั้งค่า
  allowComments: boolean;
  // AI/ML Fields
  embeddingVector?: number[]; // Vector embedding ของเนื้อหาตอน
  keywords?: string[]; // คำสำคัญที่สกัดจากเนื้อหาตอน
  sentiment?: { score: number; dominantEmotion?: string }; // การวิเคราะห์ความรู้สึกของตอน
  isDeleted: boolean; // Soft delete
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  lastSignificantUpdateAt?: Date; // อัปเดตเมื่อมีการแก้ไขเนื้อหาสำคัญ
}

const SceneSubdocumentSchema = new Schema<ISceneSubdocument>({
  id: { type: String, required: true }, // ควรใช้ Mongoose ObjectId.generate() หรือ UUID
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
        // match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ // Consider allowing more characters or using a robust slugify library
    },
    episodeNumber: { type: Number, required: [true, "กรุณาระบุลำดับตอน"], min: 1, index: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    summary: { type: String, trim: true, maxlength: [2000, "สรุปเนื้อหาตอนต้องไม่เกิน 2000 ตัวอักษร"] },
    coverImage: String,
    status: { type: String, enum: ["draft", "scheduled", "published", "archived"], default: "draft", index: true },
    visibility: { type: String, enum: ["public", "unlisted", "private", "subscribersOnly"], default: "private", index: true },
    isFree: { type: Boolean, default: true },
    price: { type: Number, min: 0, validate: { validator: function(this: IEpisode, v: number) { return this.isFree || (!this.isFree && typeof v === "number" && v >= 0); }, message: "กรุณาระบุราคาที่ถูกต้องสำหรับตอนที่ต้องชำระเงิน"} },
    currency: { type: String, default: "THB", validate: { validator: function(this: IEpisode, v: string) { return this.isFree || (!this.isFree && v && v.length === 3); }, message: "กรุณาระบุสกุลเงินที่ถูกต้อง (3 ตัวอักษร) สำหรับตอนที่ต้องชำระเงิน"} },
    publishedAt: { type: Date, index: true },
    scheduledFor: { type: Date, validate: { validator: function(this: IEpisode, v: Date) { return this.status !== "scheduled" || (v && v > new Date()); }, message: "วันที่ตั้งเวลาเผยแพร่ต้องเป็นอนาคต"} },
    scenes: [SceneSubdocumentSchema],
    startSceneId: { 
        type: String, 
        required: [true, "กรุณาระบุ ID ของฉากเริ่มต้น"], 
        validate: { 
            validator: function(this: IEpisode, v: string) { return this.scenes && this.scenes.some(scene => scene.id === v); }, 
            message: "ID ฉากเริ่มต้นไม่พบในรายการฉากของตอนนี้"
        }
    },
    viewsCount: { type: Number, default: 0, min: 0, index: true },
    uniqueViewsCount: { type: Number, default: 0, min: 0 },
    likesCount: { type: Number, default: 0, min: 0, index: true },
    commentsCount: { type: Number, default: 0, min: 0 },
    purchasesCount: { type: Number, default: 0, min: 0 },
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
    timestamps: true, // createdAt, updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----- Indexes -----
// Unique slug per novel
EpisodeSchema.index({ novel: 1, slug: 1 }, { unique: true });
// Unique episode number per novel
EpisodeSchema.index({ novel: 1, episodeNumber: 1 }, { unique: true });
// For querying episodes by status and visibility within a novel
EpisodeSchema.index({ novel: 1, status: 1, visibility: 1, isDeleted: 1 });
// For sorting published episodes by date
EpisodeSchema.index(
  { novel: 1, publishedAt: -1 },
  {
    partialFilterExpression: { status: "published", isDeleted: false },
  }
);
// Text index for search (consider which fields are most relevant for episode search)
EpisodeSchema.index({ title: "text", summary: "text", keywords: "text" }, { default_language: "thai" });

// ----- Middleware: Slug generation, counts, etc. -----
EpisodeSchema.pre("save", async function (next) {
  // Auto-generate slug from title if not provided or if title changes
  if ((this.isModified("title") || this.isNew) && !this.slug) {
    // Basic slugification, consider a more robust library for production
    this.slug = (this.title || "")
      .toLowerCase()
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/[^a-z0-9-]/g, "") // Remove non-alphanumeric characters except hyphens
      .substring(0, 70); // Limit length
    // Add episode number to ensure more uniqueness within novel if titles are similar
    this.slug = `${this.slug || "episode"}-${this.episodeNumber}`;
    // Further ensure uniqueness by appending a short hash if needed (more complex logic)
  }

  // Update publishedAt if status changes to published
  if (this.isModified("status") && this.status === "published" && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  // Calculate word count and estimated reading time if scenes are modified
  if (this.isModified("scenes")) {
    let textContent = "";
    this.scenes.forEach(scene => {
      if (scene.content.text) textContent += scene.content.text + " ";
      if (scene.content.choices) {
        scene.content.choices.forEach(choice => textContent += choice.text + " ");
      }
    });
    this.wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;
    this.estimatedReadingTimeMinutes = Math.ceil((this.wordCount || 0) / 200); // Avg 200 WPM
    this.lastSignificantUpdateAt = new Date();
  }
  
  if (this.isNew || this.isModified("title") || this.isModified("summary") || this.isModified("status")) {
      this.lastSignificantUpdateAt = new Date();
  }

  next();
});

// ----- Middleware: Update Novel's counts and last episode date after Episode save/delete -----
async function updateNovelOnEpisodeChange(doc: IEpisode) {
    if (!doc || !doc.novel) return;
    try {
        const NovelModel = models.Novel as mongoose.Model<any>; // Use any for INovel to avoid circular dependency issues here
        const novelId = doc.novel;

        const episodeStats = await (models.Episode as mongoose.Model<IEpisode>).aggregate([
            { $match: { novel: novelId, isDeleted: false } },
            {
                $group: {
                    _id: "$novel",
                    episodesCount: { $sum: 1 },
                    publishedEpisodesCount: { $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] } },
                    // Sum of word counts from all episodes for this novel
                    totalWordsCount: { $sum: "$wordCount" }, 
                    lastEpisodePublishedAt: { $max: { $cond: [ { $eq: ["$status", "published"] }, "$publishedAt", null ] } }
                }
            }
        ]);

        if (episodeStats.length > 0) {
            const stats = episodeStats[0];
            await NovelModel.findByIdAndUpdate(novelId, {
                episodesCount: stats.episodesCount || 0,
                publishedEpisodesCount: stats.publishedEpisodesCount || 0,
                wordsCount: stats.totalWordsCount || 0, // Update novel's total word count
                lastEpisodePublishedAt: stats.lastEpisodePublishedAt,
                // Potentially update novel's lastSignificantUpdateAt as well
                $set: { lastSignificantUpdateAt: new Date() } 
            });
        } else {
            // No episodes left, reset counts
            await NovelModel.findByIdAndUpdate(novelId, {
                episodesCount: 0,
                publishedEpisodesCount: 0,
                wordsCount: 0,
                lastEpisodePublishedAt: null, // Or keep the old date?
                $set: { lastSignificantUpdateAt: new Date() }
            });
        }
    } catch (error) {
        console.error(`Error updating novel ${doc.novel} after episode change:`, error);
    }
}

EpisodeSchema.post("save", async function (doc: IEpisode) {
    await updateNovelOnEpisodeChange(doc);
});

// Remove the problematic post("remove") hook
// EpisodeSchema.post("remove", async function (doc: IEpisode) {
//   await updateNovelOnEpisodeChange(doc);
// });

// Add a hook for findOneAndUpdate to handle soft deletion
EpisodeSchema.post("findOneAndUpdate", async function (doc: IEpisode | null) {
  if (doc && doc.isDeleted) {
    await updateNovelOnEpisodeChange(doc);
  }
});

// Update the existing post(/^findOneAnd/) hook for clarity
EpisodeSchema.post(/^findOneAnd/, async function (result: IEpisode | null) {
  if (result && result.novel && result.isDeleted) {
    await updateNovelOnEpisodeChange(result);
  }
});

EpisodeSchema.post(/^findOneAnd/, async function(result, next) {
    // If findOneAndUpdate or findOneAndDelete was used, result is the document.
    // Need to handle this carefully as the document might be the old one or new one depending on options.
    // A common pattern is to re-fetch the doc if needed or ensure the operation that triggers this also calls updateNovelOnEpisodeChange.
    // For simplicity, if a document was affected, we can try to update its novel.
    if (result && result.novel) {
        // This might be problematic if `result` is the state *before* update for e.g. findOneAndDelete
        // A more robust solution might involve application-level calls or more specific hooks.
        // await updateNovelOnEpisodeChange(result as IEpisode);
    }
    if (next) next();
});


// ----- Virtuals -----
EpisodeSchema.virtual("isPurchasable").get(function (this: IEpisode) {
  return !this.isFree && this.status === "published";
});

// ----- Model Export -----
const EpisodeModel = () => models.Episode as mongoose.Model<IEpisode> || model<IEpisode>("Episode", EpisodeSchema);

export default EpisodeModel;

