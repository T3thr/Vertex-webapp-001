// src/models/ReadingAnalytic.ts
// โมเดลการวิเคราะห์การอ่าน (ReadingAnalytic Model) - จัดเก็บข้อมูลการอ่านของผู้ใช้เพื่อการวิเคราะห์และสร้างคำแนะนำ
// ออกแบบให้บันทึกกิจกรรมการอ่านอย่างละเอียด, ความชอบ, และพฤติกรรมของผู้ใช้

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// อินเทอร์เฟซสำหรับบันทึกเหตุการณ์การอ่าน (Reading Event)
export interface IReadingEvent {
  eventType: "start_novel" | "end_novel" | "start_episode" | "end_episode" | "read_scene" | "make_choice" | "pause_reading" | "resume_reading" | "rate_novel" | "comment_on_episode";
  novel: Types.ObjectId; // นิยายที่เกี่ยวข้อง
  episode?: Types.ObjectId; // ตอนที่เกี่ยวข้อง (ถ้ามี)
  scene?: Types.ObjectId; // ฉากที่เกี่ยวข้อง (ถ้ามี)
  choice?: Types.ObjectId; // ตัวเลือกที่เลือก (ถ้า eventType = "make_choice")
  timestamp: Date; // เวลาที่เกิดเหตุการณ์
  durationSeconds?: number; // ระยะเวลาของเหตุการณ์ (เช่น เวลาที่ใช้ในฉาก, เวลาที่ pause)
  // ข้อมูลเพิ่มเติมตามประเภทเหตุการณ์
  // เช่น choiceMade: { choiceId: Types.ObjectId, outcomeSceneId?: Types.ObjectId }
  // เช่น ratingGiven: number
  // เช่น scrollDepth?: number (สำหรับ scene)
  // เช่น wordCountRead?: number (สำหรับ scene/episode)
  sessionIdentifier?: string; // ID ของ session การอ่าน (ถ้าต้องการ group events)
}

// อินเทอร์เฟซหลักสำหรับเอกสารการวิเคราะห์การอ่าน (ReadingAnalytic Document)
// อาจมีหลายแนวทางในการออกแบบ: 1. เก็บ event stream ต่อผู้ใช้, 2. สรุปข้อมูลต่อผู้ใช้/นิยาย
// แนวทางที่ 1: Event Stream (ละเอียดมาก, เหมาะสำหรับ ML, แต่อาจใหญ่)
export interface IReadingAnalytic_EventStream extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId; // ผู้ใช้ (อ้างอิง User model หรือ SocialMediaUser model)
  events: Types.DocumentArray<IReadingEvent>; // รายการเหตุการณ์การอ่าน
  // อาจมีข้อมูลสรุปบางอย่างที่ update เป็นระยะ
  lastEventAt: Date;
}

// แนวทางที่ 2: Aggregated User-Novel Reading Stats (สรุป, query ง่ายกว่าสำหรับบาง use case)
// (ในที่นี้จะเน้น Event Stream ตามโจทย์ที่ต้องการความละเอียด แต่จะใส่โครงร่างของ Aggregated ไว้เป็นแนวคิด)
/*
export interface IUserNovelReadingSummary {
  novel: Types.ObjectId;
  totalTimeSpentSeconds: number;
  episodesCompleted: number;
  lastReadAt: Date;
  averageReadingSpeedWPM?: number;
  genresReadInNovel: string[]; // genres ของนิยายนี้ที่ผู้ใช้อ่าน
  choicesMadeStats?: any; // สถิติตัวเลือกที่เคยเลือกในนิยายนี้
  // ... more aggregated data
}
export interface IReadingAnalytic_Aggregated extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  overallReadingTimeSeconds: number;
  novelsStarted: number;
  novelsCompleted: number;
  favoriteGenres: Array<{ genre: Types.ObjectId, readCount: number }>;
  readingHabits: { // เช่น เวลาที่อ่านบ่อย, วันที่อ่านบ่อย
    mostActiveHour?: number; // 0-23
    mostActiveDayOfWeek?: number; // 0-6 (Sun-Sat)
  };
  novelSummaries: Types.DocumentArray<IUserNovelReadingSummary>;
  lastUpdatedAt: Date;
}
*/

// Schema ย่อยสำหรับ IReadingEvent (สำหรับแนวทาง Event Stream)
const ReadingEventSchema = new Schema<IReadingEvent>(
  {
    eventType: {
      type: String,
      enum: ["start_novel", "end_novel", "start_episode", "end_episode", "read_scene", "make_choice", "pause_reading", "resume_reading", "rate_novel", "comment_on_episode"],
      required: true,
    },
    novel: { type: Schema.Types.ObjectId, ref: "Novel", required: true, index: true },
    episode: { type: Schema.Types.ObjectId, ref: "Episode", index: true },
    scene: { type: Schema.Types.ObjectId, ref: "Scene", index: true },
    choice: { type: Schema.Types.ObjectId, ref: "Choice" },
    timestamp: { type: Date, required: true, default: Date.now, index: true },
    durationSeconds: { type: Number, min: 0 },
    sessionIdentifier: { type: String, trim: true, index: true },
  },
  { _id: false } // ไม่สร้าง _id สำหรับ sub-document นี้โดยอัตโนมัติ
);

// Schema หลักสำหรับ ReadingAnalytic (Event Stream approach)
const ReadingAnalyticSchema = new Schema<IReadingAnalytic_EventStream>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User", // หรือ refPath เพื่อรองรับทั้ง User และ SocialMediaUser
      required: true,
      unique: true, // หนึ่ง document ต่อหนึ่งผู้ใช้ (ถ้าเป็น event stream ของผู้ใช้นั้นๆ)
      index: true,
    },
    events: [ReadingEventSchema],
    lastEventAt: { type: Date, index: true },
  },
  {
    timestamps: true, // createdAt, updatedAt (updatedAt จะเปลี่ยนเมื่อมี event ใหม่ หรือมีการแก้ไข)
    // capped: { size: 1024 * 1024 * 100, max: 100000, autoIndexId: true } // พิจารณา Capped Collection ถ้า event stream ใหญ่มากและต้องการ FIFO
  }
);

// ----- Indexes -----
// Index สำหรับ query events ของผู้ใช้ตาม novel และ timestamp
ReadingAnalyticSchema.index({ user: 1, "events.novel": 1, "events.timestamp": -1 });
ReadingAnalyticSchema.index({ user: 1, lastEventAt: -1 }); // ผู้ใช้ที่มีกิจกรรมล่าสุด
// Index สำหรับ query events ตามประเภท (ถ้ามีการ query บ่อย)
// ReadingAnalyticSchema.index({ "events.eventType": 1, "events.timestamp": -1 });

// ----- Middleware -----
ReadingAnalyticSchema.pre("save", function (this: IReadingAnalytic_EventStream, next) {
  if (this.events && this.events.length > 0) {
    // เรียง events ตาม timestamp ล่าสุดก่อน save (ถ้าจำเป็น)
    // this.events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    // หา timestamp ล่าสุดจาก events array
    let latestTimestamp = new Date(0); // Initialize with a very old date
    for (const event of this.events) {
      if (event.timestamp > latestTimestamp) {
        latestTimestamp = event.timestamp;
      }
    }
    this.lastEventAt = latestTimestamp;
  }
  next();
});

// ----- Static Methods (ตัวอย่าง) -----
// เพิ่ม event ใหม่เข้าไปใน stream ของผู้ใช้
ReadingAnalyticSchema.statics.addReadingEvent = async function (
  userId: Types.ObjectId,
  eventData: Omit<IReadingEvent, "timestamp">
) {
  const eventWithTimestamp: IReadingEvent = {
    ...eventData,
    timestamp: new Date(),
  } as IReadingEvent;

  return this.findOneAndUpdate(
    { user: userId },
    {
      $push: { events: { $each: [eventWithTimestamp], $slice: -1000 } }, // เก็บเฉพาะ 1000 events ล่าสุด (ปรับตามต้องการ)
      $set: { lastEventAt: eventWithTimestamp.timestamp },
      $setOnInsert: { user: userId, createdAt: new Date() } // สร้าง document ใหม่ถ้ายังไม่มี
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

// ----- Model Export -----
// การใช้ชื่อ Model นี้ต้องพิจารณาว่าข้อมูลจะถูก query และใช้งานอย่างไร
// ถ้ามีระบบประมวลผล batch เพื่อสร้าง aggregated data, อาจมี model อีกตัวสำหรับ aggregated results
const ReadingAnalyticModel = () => models.ReadingAnalytic as mongoose.Model<IReadingAnalytic_EventStream> || model<IReadingAnalytic_EventStream>("ReadingAnalytic", ReadingAnalyticSchema);

export default ReadingAnalyticModel;

