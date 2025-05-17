// src/backend/models/ReadingAnalytic_EventStream.ts
// โมเดลสตรีมเหตุการณ์การวิเคราะห์การอ่าน (Reading Analytic Event Stream Model)
// ออกแบบมาเพื่อเก็บข้อมูลการโต้ตอบของผู้ใช้โดยละเอียดสำหรับการวิเคราะห์พฤติกรรมการอ่าน, อารมณ์ และสุขภาพจิต
// รวมถึงการเลือกตัวเลือก, การอ่านฉาก, และข้อมูลอื่นๆ ที่เกี่ยวข้อง

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IUser } from "./User"; // สำหรับ userId
import { INovel } from "./Novel"; // สำหรับ novelId
import { IEpisode } from "./Episode"; // สำหรับ episodeId
import { IScene } from "./Scene"; // สำหรับ sceneId
import { IChoice } from "./Choice"; // สำหรับ choiceId

// ==================================================================================================
// SECTION: ข้อควรคำนึงด้านจริยธรรมและความเป็นส่วนตัว (สำคัญมาก)
// ==================================================================================================
/**
 * @important ข้อควรคำนึงด้านจริยธรรมและความเป็นส่วนตัว (สำคัญมาก):
 * 1. ความยินยอม (Consent): ผู้ใช้ต้องให้ความยินยอมอย่างชัดแจ้ง (Opt-in) ผ่าน User.ts (เช่น User.privacySettings.analyticsConsent) ก่อนที่ข้อมูลจะถูกเก็บและนำไปวิเคราะห์ในลักษณะนี้
 * 2. การไม่ระบุตัวตน (Anonymization/Pseudonymization): ข้อมูลที่ใช้ในการ Train AI หรือวิเคราะห์ภาพรวมควรผ่านกระบวนการทำให้ไม่สามารถระบุตัวตนของผู้ใช้ได้ หรือใช้นามแฝง
 * 3. ความปลอดภัยของข้อมูล (Data Security): ต้องมีมาตรการรักษาความปลอดภัยขั้นสูงสุดในการจัดเก็บ, เข้าถึง, และประมวลผลข้อมูลที่ละเอียดอ่อนนี้ (เช่น encryption at rest, encryption in transit, access controls)
 * 4. ความโปร่งใส (Transparency): ผู้ใช้ควรได้รับแจ้งว่าจะมีการเก็บข้อมูลใดบ้าง, นำไปใช้อย่างไร, และควรสามารถเข้าถึงผลการวิเคราะห์ของตนเอง (ถ้าเหมาะสมและไม่ก่อให้เกิดผลเสีย) และมีสิทธิ์ขอให้ลบข้อมูลส่วนบุคคลของตนได้ (Right to Erasure)
 * 5. ไม่ตีตรา (Non-Stigmatization): ผลการวิเคราะห์ต้องไม่ถูกนำไปใช้ในการตีตรา, ตัดสิน, หรือเลือกปฏิบัติต่อผู้ใช้ในทางลบ
 * 6. ข้อจำกัดของ AI และการวิเคราะห์ (Limitations): ต้องสื่อสารให้ชัดเจนว่าการวิเคราะห์นี้ไม่ใช่การวินิจฉัยทางการแพทย์ และเป็นเพียงเครื่องมือช่วยเสริมความเข้าใจเบื้องต้น หรือเพื่อปรับปรุงประสบการณ์การใช้งานเท่านั้น
 * 7. การให้คำปรึกษาโดยผู้เชี่ยวชาญ (Professional Consultation): หากจะพัฒนาไปถึงขั้นให้คำแนะนำหรือคำปรึกษาด้านสุขภาพจิต ต้องดำเนินการโดยผู้เชี่ยวชาญที่มีใบอนุญาตและอยู่ภายใต้กรอบกฎหมายและจริยธรรมที่เกี่ยวข้อง
 * 8. การใช้งานอย่างมีความรับผิดชอบ (Responsible Use): แพลตฟอร์มต้องมีนโยบายที่ชัดเจนเกี่ยวกับการนำข้อมูลนี้ไปใช้ และต้องไม่นำไปใช้ในทางที่ผิดหรือไม่เหมาะสม
 */

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล ReadingAnalytic_EventStream
// ==================================================================================================

/**
 * @enum {string} ReadingEventType
 * @description ประเภทของเหตุการณ์การอ่านที่บันทึกใน event stream
 * - `START_NOVEL`: ผู้ใช้เริ่มอ่านนิยายเรื่องใหม่ (หรือกลับมาอ่านเรื่องที่เคยอ่าน)
 * - `END_NOVEL`: ผู้ใช้อ่านนิยายเรื่องนั้นจบ (ถึงตอนจบที่ผู้เขียนกำหนด หรือผู้ใช้ระบุว่าอ่านจบแล้ว)
 * - `START_EPISODE`: ผู้ใช้เริ่มอ่านตอนใหม่ของนิยาย
 * - `END_EPISODE`: ผู้ใช้อ่านตอนนั้นจบ (เช่น อ่านถึง node สุดท้ายของตอน)
 * - `READ_SCENE`: ผู้ใช้เข้าสู่/อ่านฉาก (หรือ node ใน story map) - อาจจะ log เมื่อเข้าและออก หรือเมื่อใช้เวลาในฉากพอสมควร
 * - `MAKE_CHOICE`: ผู้ใช้ทำการเลือกตัวเลือกในเนื้อเรื่อง
 * - `PAUSE_READING`: ผู้ใช้หยุดอ่านชั่วคราว (เช่น ปิดแอป, สลับไปทำอย่างอื่น)
 * - `RESUME_READING`: ผู้ใช้กลับมาอ่านต่อจากที่หยุดไว้
 * - `EMOTIONAL_RESPONSE_LOGGED`: ผู้ใช้ระบุอารมณ์ของตัวเองโดยตรง (เช่น ผ่านการกด emoji, การเลือกจากรายการอารมณ์)
 * - `CONTENT_SKIPPED`: ผู้ใช้ข้ามเนื้อหาส่วนใดส่วนหนึ่ง (เช่น กดข้ามฉาก, fast-forward)
 * - `BOOKMARK_ADDED`: ผู้ใช้เพิ่มบุ๊คมาร์กในตำแหน่งที่อ่าน
 * - `HIGHLIGHT_ADDED`: ผู้ใช้ไฮไลท์ข้อความที่สนใจ
 * - `NOTE_ADDED`: ผู้ใช้เพิ่มโน้ตส่วนตัวเกี่ยวกับเนื้อหา
 * - `SESSION_START`: เริ่ม session การอ่านใหม่ (อาจจะ log เมื่อเปิดแอป หรือเริ่มกิจกรรมการอ่าน)
 * - `SESSION_END`: จบ session การอ่าน (อาจจะ log เมื่อปิดแอป หรือไม่มี activity เป็นระยะเวลานาน)
 */
export enum ReadingEventType {
  START_NOVEL = "start_novel",
  END_NOVEL = "end_novel",
  START_EPISODE = "start_episode",
  END_EPISODE = "end_episode",
  READ_SCENE = "read_scene",
  MAKE_CHOICE = "make_choice",
  PAUSE_READING = "pause_reading",
  RESUME_READING = "resume_reading",
  EMOTIONAL_RESPONSE_LOGGED = "emotional_response_logged",
  CONTENT_SKIPPED = "content_skipped",
  BOOKMARK_ADDED = "bookmark_added",
  HIGHLIGHT_ADDED = "highlight_added",
  NOTE_ADDED = "note_added",
  SESSION_START = "session_start", // เพิ่มเติม
  SESSION_END = "session_end",     // เพิ่มเติม
}

/**
 * @enum {string} EmotionCategory
 * @description หมวดหมู่อารมณ์พื้นฐาน (อ้างอิงจาก Plutchik's Wheel of Emotions หรือโมเดลอื่นๆ ที่เหมาะสม)
 * - `JOY`: ความสุข, สนุกสนาน, ร่าเริง
 * - `SADNESS`: ความเศร้า, เสียใจ, ผิดหวัง
 * - `ANGER`: ความโกรธ, ไม่พอใจ, หงุดหงิด
 * - `FEAR`: ความกลัว, กังวล, ตื่นตระหนก
 * - `DISGUST`: ความรังเกียจ, ขยะแขยง
 * - `SURPRISE`: ความประหลาดใจ, ตกใจ
 * - `ANTICIPATION`: ความคาดหวัง, ตื่นเต้นรอคอย
 * - `TRUST`: ความไว้วางใจ, เชื่อมั่น
 * - `NEUTRAL`: อารมณ์เฉยๆ, ปกติ (เพิ่มเติม)
 * - `CONFUSION`: ความสับสน, งุนงง (เพิ่มเติม)
 * - `CURIOSITY`: ความสงสัย, อยากรู้อยากเห็น (เพิ่มเติม)
 * - `OTHER`: อื่นๆ (ให้ผู้ใช้ระบุใน customEmotion)
 */
export enum EmotionCategory {
  JOY = "joy",
  SADNESS = "sadness",
  ANGER = "anger",
  FEAR = "fear",
  DISGUST = "disgust",
  SURPRISE = "surprise",
  ANTICIPATION = "anticipation",
  TRUST = "trust",
  NEUTRAL = "neutral",         // เพิ่มเติม
  CONFUSION = "confusion",     // เพิ่มเติม
  CURIOSITY = "curiosity",     // เพิ่มเติม
  OTHER = "other",
}

/**
 * @interface IMakeChoiceEventDetails
 * @description ข้อมูลเพิ่มเติมสำหรับเหตุการณ์ประเภท 'MAKE_CHOICE'
 * @property {Types.ObjectId | IChoice} choiceId - ID ของตัวเลือกที่ผู้ใช้เลือก (อ้างอิง Choice model)
 * @property {string} choiceTextSnapshot - ข้อความของตัวเลือก ณ เวลาที่ผู้ใช้เลือก (เพื่อป้องกันกรณีข้อความตัวเลือกมีการแก้ไขในภายหลัง)
 * @property {string[]} [associatedEmotionTags] - Tags อารมณ์ที่ผู้เขียนผูกกับตัวเลือกนี้ (snapshot จาก Choice.ts หรือ StoryMap.ts ณ เวลาที่เลือก)
 * @property {number} [psychologicalImpactScore] - คะแนนผลกระทบทางจิตวิทยาของตัวเลือกนี้ (snapshot จาก Choice.ts หรือ StoryMap.ts ณ เวลาที่เลือก)
 * @property {Types.ObjectId | IScene} sceneId - ID ของฉาก (หรือ node) ที่เกิดการเลือกตัวเลือกนี้
 * @property {number} [timeToDecideSeconds] - เวลาที่ผู้ใช้ใช้ในการตัดสินใจเลือกตัวเลือกนี้ (คำนวณจาก client-side, หน่วยเป็นวินาที)
 * @property {string} [outcomeSceneId] - (Optional) ID ของฉากที่เป็นผลลัพธ์จากการเลือกตัวเลือกนี้ (ถ้ามี)
 */
export interface IMakeChoiceEventDetails {
  choiceId: Types.ObjectId | IChoice;
  choiceTextSnapshot: string;
  associatedEmotionTags?: string[];
  psychologicalImpactScore?: number;
  sceneId: Types.ObjectId | IScene; // Scene ที่เกิดการเลือก
  timeToDecideSeconds?: number;
  outcomeSceneId?: Types.ObjectId | IScene; // Scene ที่เป็นผลลัพธ์
}
const MakeChoiceEventDetailsSchema = new Schema<IMakeChoiceEventDetails>(
  {
    choiceId: {
      type: Schema.Types.ObjectId,
      ref: "Choice", // อ้างอิงถึง Model 'Choice'
      required: [true, "กรุณาระบุ ID ของตัวเลือก (Choice ID is required)"]
    },
    choiceTextSnapshot: {
      type: String,
      trim: true,
      required: [true, "กรุณาระบุข้อความของตัวเลือก (Choice text snapshot is required)"],
      maxlength: [1000, "ข้อความตัวเลือกยาวเกินไป (สูงสุด 1000 ตัวอักษร)"]
    },
    associatedEmotionTags: [{
      type: String,
      trim: true,
      maxlength: [100, "Tag อารมณ์ยาวเกินไป (สูงสุด 100 ตัวอักษร)"]
    }],
    psychologicalImpactScore: {
      type: Number,
      min: [-10, "คะแนนผลกระทบทางจิตวิทยาต้องไม่น้อยกว่า -10"], // ปรับช่วงคะแนนตามการออกแบบ
      max: [10, "คะแนนผลกระทบทางจิตวิทยาต้องไม่มากกว่า 10"]
    },
    sceneId: { // Scene ที่มี Choice นี้
      type: Schema.Types.ObjectId,
      ref: "Scene", // อ้างอิงถึง Model 'Scene'
      required: [true, "กรุณาระบุ ID ของฉาก (Scene ID is required)"]
    },
    timeToDecideSeconds: {
      type: Number,
      min: [0, "เวลาในการตัดสินใจต้องไม่ติดลบ"]
    },
    outcomeSceneId: { type: Schema.Types.ObjectId, ref: "Scene" }, // Scene ที่เป็นผลลัพธ์
  },
  { _id: false }
);

/**
 * @interface IReadSceneEventDetails
 * @description ข้อมูลเพิ่มเติมสำหรับเหตุการณ์ประเภท 'READ_SCENE' (หรือ 'SCENE_ENTER' / 'SCENE_EXIT')
 * @property {Types.ObjectId | IScene} sceneId - ID ของฉากที่ผู้ใช้อ่าน/เข้าถึง
 * @property {number} [durationSeconds] - ระยะเวลาที่ผู้ใช้ใช้ในฉากนี้ (อาจคำนวณเมื่อออกจากฉาก หรือส่งเป็นช่วงๆ)
 * @property {string[]} [dominantEmotionsInSceneText] - (Optional, อาจได้จากการวิเคราะห์ NLP ของเนื้อหาฉาก) อารมณ์เด่นในเนื้อหาของฉากนั้น
 * @property {number} [playerEngagementScore] - (Optional, อาจคำนวณจากหลายปัจจัย) คะแนนความมีส่วนร่วม/ความสนใจของผู้เล่นในฉากนี้
 * @property {boolean} [isReread] - ระบุว่าเป็นการอ่านฉากนี้ซ้ำหรือไม่ (เช่น ผู้ใช้ย้อนกลับมาอ่าน)
 * @property {number} [scrollDepthPercent] - (Optional) เปอร์เซ็นต์การ scroll ในฉาก (สำหรับฉากที่ยาว)
 * @property {number} [wordsRead] - (Optional) จำนวนคำที่อ่านในฉาก (ถ้าติดตามได้)
 */
export interface IReadSceneEventDetails {
  sceneId: Types.ObjectId | IScene;
  durationSeconds?: number;
  dominantEmotionsInSceneText?: string[];
  playerEngagementScore?: number;
  isReread?: boolean;
  scrollDepthPercent?: number;
  wordsRead?: number;
}
const ReadSceneEventDetailsSchema = new Schema<IReadSceneEventDetails>(
  {
    sceneId: {
      type: Schema.Types.ObjectId,
      ref: "Scene",
      required: [true, "กรุณาระบุ ID ของฉาก (Scene ID is required)"]
    },
    durationSeconds: {
      type: Number,
      min: [0, "ระยะเวลาต้องไม่ติดลบ"]
    },
    dominantEmotionsInSceneText: [{
      type: String,
      trim: true,
      maxlength: [100, "อารมณ์เด่นยาวเกินไป (สูงสุด 100 ตัวอักษร)"]
    }],
    playerEngagementScore: {
      type: Number,
      min: [0, "คะแนนความมีส่วนร่วมต้องไม่ติดลบ"],
      max: [10, "คะแนนความมีส่วนร่วมต้องไม่มากกว่า 10"] // หรือตาม scale ที่ออกแบบ
    },
    isReread: {
      type: Boolean,
      default: false
    },
    scrollDepthPercent: { type: Number, min:0, max: 100},
    wordsRead: {type: Number, min: 0}
  },
  { _id: false }
);

/**
 * @interface IEmotionalResponseLoggedEventDetails
 * @description ข้อมูลเพิ่มเติมสำหรับเหตุการณ์ 'EMOTIONAL_RESPONSE_LOGGED' ที่ผู้ใช้ระบุอารมณ์เอง
 * @property {EmotionCategory} emotionCategory - หมวดหมู่อารมณ์หลักที่ผู้ใช้เลือก
 * @property {string} [customEmotion] - อารมณ์เฉพาะที่ผู้ใช้ระบุเอง (ถ้า emotionCategory เป็น OTHER หรือต้องการระบุเพิ่มเติม)
 * @property {number} [intensity] - ความเข้มของอารมณ์ที่ผู้ใช้รู้สึก (เช่น 1-5, 1-น้อยสุด, 5-มากสุด)
 * @property {string} [triggerContext] - บริบทหรือสิ่งที่กระตุ้นให้เกิดอารมณ์นี้ (เช่น scene_id, choice_id, "ความรู้สึกโดยรวมขณะอ่าน")
 * @property {string} [userComment] - ความคิดเห็นหรือคำอธิบายเพิ่มเติมจากผู้ใช้เกี่ยวกับอารมณ์นั้นๆ
 */
export interface IEmotionalResponseLoggedEventDetails {
  emotionCategory: EmotionCategory;
  customEmotion?: string;
  intensity?: number;
  triggerContext?: string; // สามารถเป็น Scene ID, Choice ID, หรือข้อความอธิบาย
  userComment?: string;
}
const EmotionalResponseLoggedEventDetailsSchema = new Schema<IEmotionalResponseLoggedEventDetails>(
  {
    emotionCategory: {
      type: String,
      enum: Object.values(EmotionCategory),
      required: [true, "กรุณาระบุหมวดหมู่อารมณ์ (Emotion category is required)"]
    },
    customEmotion: {
      type: String,
      trim: true,
      maxlength: [100, "อารมณ์เฉพาะยาวเกินไป (สูงสุด 100 ตัวอักษร)"],
      // แก้ไข: ปรับปรุง validator ให้ชัดเจน
      validate: [{ // สามารถใส่ validator เป็น array ได้
        validator: function(this: IEmotionalResponseLoggedEventDetails, value: string): boolean {
          // Validator นี้จะทำงานเมื่อ customEmotion มีค่า (ไม่ใช่ null/undefined)
          // ถ้า emotionCategory คือ OTHER, customEmotion จะต้องมีค่าและไม่เป็น empty string
          if (this.emotionCategory === EmotionCategory.OTHER) {
            return !!(value && typeof value === 'string' && value.trim().length > 0);
          }
          // ถ้า emotionCategory ไม่ใช่ OTHER, customEmotion field นี้ไม่จำเป็นต้องมีค่า (optional)
          // ดังนั้น validator นี้จะผ่านเสมอสำหรับกรณีที่ไม่ใช่ OTHER
          return true;
        },
        message: "กรุณาระบุคำอธิบายอารมณ์เพิ่มเติม (customEmotion) เมื่อเลือกหมวดหมู่อารมณ์เป็น 'OTHER'",
      }]
    },
    intensity: {
      type: Number,
      min: [1, "ระดับความเข้มของอารมณ์ต้องอยู่ระหว่าง 1 ถึง 5"],
      max: [5, "ระดับความเข้มของอารมณ์ต้องอยู่ระหว่าง 1 ถึง 5"]
    },
    triggerContext: {
      type: String,
      trim: true,
      maxlength: [200, "บริบทที่กระตุ้นอารมณ์ยาวเกินไป (สูงสุด 200 ตัวอักษร)"]
    },
    userComment: {
      type: String,
      trim: true,
      maxlength: [1000, "ความคิดเห็นเกี่ยวกับอารมณ์ยาวเกินไป (สูงสุด 1000 ตัวอักษร)"]
    },
  },
  { _id: false }
);

/**
 * @interface IContentSkippedEventDetails
 * @description ข้อมูลเพิ่มเติมสำหรับเหตุการณ์ 'CONTENT_SKIPPED'
 * @property {Types.ObjectId | IScene} [sceneId] - ID ของฉากที่มีการข้ามเนื้อหา (ถ้าข้ามทั้งฉาก หรือส่วนหนึ่งของฉาก)
 * @property {number} [fromTimeInEpisodeSeconds] - เวลา (วินาที) ในตอนที่เริ่มการข้าม
 * @property {number} [toTimeInEpisodeSeconds] - เวลา (วินาที) ในตอนที่สิ้นสุดการข้าม
 * @property {string} [skippedContentType] - ประเภทของเนื้อหาที่ถูกข้าม (เช่น "dialogue_sequence", "entire_scene", "optional_lore")
 * @property {string} [skipMethod] - วิธีการข้าม (เช่น "fast_forward_button", "skip_scene_button")
 */
export interface IContentSkippedEventDetails {
  sceneId?: Types.ObjectId | IScene;
  fromTimeInEpisodeSeconds?: number; // หรือ fromNodeId
  toTimeInEpisodeSeconds?: number;   // หรือ toNodeId
  skippedContentType?: string;
  skipMethod?: string;
}
const ContentSkippedEventDetailsSchema = new Schema<IContentSkippedEventDetails>(
  {
    sceneId: { type: Schema.Types.ObjectId, ref: "Scene" },
    fromTimeInEpisodeSeconds: { type: Number, min: 0 },
    toTimeInEpisodeSeconds: { type: Number, min: 0 },
    skippedContentType: { type: String, trim: true, maxlength: [100, "ประเภทเนื้อหาที่ข้ามยาวเกินไป"] },
    skipMethod: { type: String, trim: true, maxlength: [50, "วิธีการข้ามยาวเกินไป"] },
  },
  { _id: false }
);

// ==================================================================================================
// SECTION: อินเทอร์เฟซสำหรับบันทึกเหตุการณ์การอ่านแต่ละครั้ง (IReadingEvent) - (เป็น sub-document)
// ==================================================================================================

/**
 * @interface IReadingEvent
 * @description อินเทอร์เฟซสำหรับบันทึกเหตุการณ์การอ่านแต่ละครั้ง (เป็น sub-document ภายใน ReadingAnalytic_EventStream)
 * @property {Types.ObjectId} eventId - ID เฉพาะของเหตุการณ์นี้ (สร้างใหม่ทุกครั้งที่ log event)
 * @property {ReadingEventType} eventType - ประเภทของเหตุการณ์ (**จำเป็น**)
 * @property {Date} timestamp - เวลาที่เกิดเหตุการณ์บน client หรือ server (**จำเป็น**)
 * @property {Types.ObjectId | INovel} novelId - ID ของนิยายที่เกี่ยวข้องกับเหตุการณ์นี้ (**จำเป็น**)
 * @property {Types.ObjectId | IEpisode} [episodeId] - ID ของตอนที่เกี่ยวข้อง (ถ้าเหตุการณ์เกิดในระดับตอน)
 * @property {IMakeChoiceEventDetails} [makeChoiceDetails] - รายละเอียดเฉพาะสำหรับ eventType = MAKE_CHOICE
 * @property {IReadSceneEventDetails} [readSceneDetails] - รายละเอียดเฉพาะสำหรับ eventType = READ_SCENE
 * @property {IEmotionalResponseLoggedEventDetails} [emotionalResponseLoggedDetails] - รายละเอียดเฉพาะสำหรับ eventType = EMOTIONAL_RESPONSE_LOGGED
 * @property {IContentSkippedEventDetails} [contentSkippedDetails] - รายละเอียดเฉพาะสำหรับ eventType = CONTENT_SKIPPED
 * @property {string} [sessionId] - ID ของ session การอ่านปัจจุบัน (เพื่อ group events ที่เกิดใน session หรือการเปิดอ่านครั้งเดียวกัน)
 * @property {string} [deviceType] - ประเภทอุปกรณ์ที่ใช้อ่าน (เช่น "mobile", "tablet", "desktop", "vr_headset")
 * @property {string} [deviceId] - ID ของอุปกรณ์ที่ใช้อ่าน (สำหรับติดตามการอ่านข้ามอุปกรณ์, ควร anonymize หรือ hash)
 * @property {string} [appVersion] - เวอร์ชันของแอปพลิเคชัน/แพลตฟอร์มที่ใช้อ่าน
 * @property {string} [ipAddress] - (Optional, ควรพิจารณาความเป็นส่วนตัว) IP Address ของ client
 * @property {Record<string, any>} [metadata] - ข้อมูลเพิ่มเติมอื่นๆ ที่เกี่ยวข้องกับ event นี้ (เช่น ตำแหน่ง scroll, การตั้งค่าการอ่าน)
 */
export interface IReadingEvent { // ไม่ extends Document เพราะเป็น sub-document ที่ควบคุมโดย schema ของมันเอง
  eventId: Types.ObjectId;
  eventType: ReadingEventType;
  timestamp: Date;
  novelId: Types.ObjectId | INovel; // หรือแค่ Types.ObjectId ถ้าไม่ populate โดยตรงใน array
  episodeId?: Types.ObjectId | IEpisode; // หรือแค่ Types.ObjectId
  // รายละเอียด event เฉพาะประเภท (มีเพียงอันเดียวที่จะถูก populate ขึ้นกับ eventType)
  makeChoiceDetails?: IMakeChoiceEventDetails;
  readSceneDetails?: IReadSceneEventDetails;
  emotionalResponseLoggedDetails?: IEmotionalResponseLoggedEventDetails;
  contentSkippedDetails?: IContentSkippedEventDetails;
  // ข้อมูลบริบทเพิ่มเติม
  sessionId?: string;
  deviceType?: string;
  deviceId?: string;
  appVersion?: string;
  ipAddress?: string; // ควรระมัดระวังเรื่อง privacy
  metadata?: Record<string, any>;
}

// Schema ย่อยสำหรับ IReadingEvent (Sub-document Schema)
const ReadingEventSchema = new Schema<IReadingEvent>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      default: () => new Types.ObjectId(), // สร้าง ID ใหม่สำหรับทุก event
      required: [true, "กรุณาระบุ ID ของเหตุการณ์ (Event ID is required)"]
    },
    eventType: {
      type: String,
      enum: Object.values(ReadingEventType),
      required: [true, "กรุณาระบุประเภทเหตุการณ์ (Event type is required)"],
      index: true, // Indexing eventType for faster queries on specific event types
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: [true, "กรุณาระบุเวลาที่เกิดเหตุการณ์ (Timestamp is required)"],
      index: true // Indexing timestamp for time-series analysis
    },
    novelId: {
      type: Schema.Types.ObjectId,
      ref: "Novel",
      required: [true, "กรุณาระบุ Novel ID (Novel ID is required)"],
      index: true
    },
    episodeId: {
      type: Schema.Types.ObjectId,
      ref: "Episode",
      index: true, // อาจไม่จำเป็นถ้า query ผ่าน novelId เป็นหลัก
      sparse: true, // episodeId อาจไม่มีในทุก event (เช่น START_NOVEL)
    },
    // Details specific to event types (only one should be present per event)
    makeChoiceDetails: { type: MakeChoiceEventDetailsSchema, default: undefined },
    readSceneDetails: { type: ReadSceneEventDetailsSchema, default: undefined },
    emotionalResponseLoggedDetails: { type: EmotionalResponseLoggedEventDetailsSchema, default: undefined },
    contentSkippedDetails: { type: ContentSkippedEventDetailsSchema, default: undefined },
    // Contextual information
    sessionId: {
      type: String,
      trim: true,
      index: true, // For querying events within a session
      maxlength: [100, "Session ID ยาวเกินไป (สูงสุด 100 ตัวอักษร)"]
    },
    deviceType: {
      type: String,
      trim: true,
      enum: ["mobile", "tablet", "desktop", "vr_headset", "other"], // เพิ่ม vr_headset
      maxlength: [50, "ประเภทอุปกรณ์ยาวเกินไป (สูงสุด 50 ตัวอักษร)"]
    },
    deviceId: { // ควรเป็น ID ที่ anonymized หรือ hashed เพื่อความเป็นส่วนตัว
      type: String,
      trim: true,
      maxlength: [100, "Device ID ยาวเกินไป (สูงสุด 100 ตัวอักษร)"]
    },
    appVersion: {
      type: String,
      trim: true,
      maxlength: [20, "เวอร์ชันแอปยาวเกินไป (สูงสุด 20 ตัวอักษร)"]
    },
    ipAddress: { type: String, trim: true, maxlength: [45, "IP Address ยาวเกินไป (รองรับ IPv6)"] }, // ควรพิจารณาการจัดเก็บอย่างระมัดระวัง
    metadata: {
      type: Schema.Types.Mixed // สำหรับข้อมูลยืดหยุ่นอื่นๆ
    },
  },
  { _id: false } // ไม่สร้าง _id สำหรับ sub-document นี้โดยอัตโนมัติ, เราใช้ eventId ที่สร้างเอง
);

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร ReadingAnalytic_EventStream (IReadingAnalytic_EventStream Document Interface)
// ==================================================================================================

/**
 * @interface IReadingAnalytic_EventStream
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารสตรีมเหตุการณ์การวิเคราะห์การอ่านใน Collection "readinganalyticeventstreams"
 *               แต่ละ Document จะเก็บ event stream ทั้งหมดสำหรับผู้ใช้หนึ่งคน
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสาร (Mongoose สร้างอัตโนมัติ)
 * @property {Types.ObjectId | IUser} userId - ID ของผู้ใช้ที่เป็นเจ้าของ event stream นี้ (**จำเป็น**, unique, อ้างอิง User model)
 * @property {Types.DocumentArray<IReadingEvent>} events - Array ของเหตุการณ์การอ่าน (sub-documents)
 * @property {Date} [lastEventTimestamp] - เวลาของเหตุการณ์ล่าสุดที่บันทึกใน array `events` (denormalized for query optimization)
 * @property {number} totalEventsProcessed - จำนวนเหตุการณ์ทั้งหมดที่เคยบันทึกสำหรับผู้ใช้นี้ (อาจไม่เท่ากับ events.length ถ้ามีการใช้ $slice หรือ archiving)
 * @property {boolean} hasConsentToAnalytics - สถานะว่าผู้ใช้ได้ให้ความยินยอมในการเก็บและวิเคราะห์ข้อมูลการอ่านนี้หรือไม่ (ดึงมาจาก User settings)
 * @property {Date} [consentLastUpdatedAt] - วันที่ผู้ใช้อัปเดตสถานะความยินยอมล่าสุด
 * @property {number} schemaVersion - เวอร์ชันของ schema นี้ (สำหรับการจัดการการเปลี่ยนแปลง schema ในอนาคต)
 * @property {Date} createdAt - วันที่สร้างเอกสารนี้ (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตเอกสารนี้ล่าสุด (Mongoose `timestamps`)
 */
export interface IReadingAnalytic_EventStream extends Document {
  [x: string]: any;
  _id: Types.ObjectId;
  userId: Types.ObjectId | IUser;
  events: Types.DocumentArray<IReadingEvent>;
  lastEventTimestamp?: Date;
  totalEventsProcessed: number;
  hasConsentToAnalytics: boolean;
  consentLastUpdatedAt?: Date;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ ReadingAnalytic_EventStream (ReadingAnalytic_EventStreamSchema)
// ==================================================================================================
const ReadingAnalytic_EventStreamSchema = new Schema<IReadingAnalytic_EventStream>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุ User ID (User ID is required)"],
      unique: true, // หนึ่ง document ต่อหนึ่งผู้ใช้เท่านั้น
      index: true,
    },
    events: [ReadingEventSchema], // Array of sub-documents
    lastEventTimestamp: { type: Date, index: true }, // Index เพื่อ query event ล่าสุดได้เร็ว
    totalEventsProcessed: {
      type: Number,
      default: 0,
      min: [0, "จำนวนเหตุการณ์ทั้งหมดที่ประมวลผลต้องไม่ติดลบ"]
    },
    hasConsentToAnalytics: { // สถานะความยินยอม, ควรซิงค์กับ User model
      type: Boolean,
      default: false,
      required: [true, "กรุณาระบุสถานะความยินยอมในการวิเคราะห์ข้อมูล (Analytics consent status is required)"]
    },
    consentLastUpdatedAt: { type: Date },
    schemaVersion: { type: Number, default: 1, required: true },
  },
  {
    timestamps: true, // createdAt, updatedAt
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    collection: "readinganalyticeventstreams", // กำหนดชื่อ collection โดยชัดเจน
    // หมายเหตุ: Capped Collection อาจจะไม่เหมาะถ้าต้องการ update document (เช่น $push, $inc) บ่อยๆ
    // และถ้าต้องการ $slice ซึ่งอาจจะไม่ทำงานตามที่คาดใน capped collection แบบตรงไปตรงมา
    // capped: { size: 1024 * 1024 * 256, max: 200000, autoIndexId: true } // ตัวอย่าง: 256MB, 200k docs
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

// Index สำหรับ query events ล่าสุดของผู้ใช้ (userId และ timestamp ของ event ภายใน array)
// MongoDB สามารถ index array ของ sub-documents ได้ (multikey index)
ReadingAnalytic_EventStreamSchema.index(
  { userId: 1, "events.timestamp": -1 },
  { name: "UserEventsStreamTimestampIndex" }
);

// Index สำหรับ query event ตาม novelId และ eventType ภายใน array events
ReadingAnalytic_EventStreamSchema.index(
  { "events.novelId": 1, "events.eventType": 1 },
  { name: "EventsByNovelAndTypeIndex" }
);

// Index สำหรับ query event ตาม sessionId ภายใน array events
ReadingAnalytic_EventStreamSchema.index(
  { "events.sessionId": 1, "events.timestamp": 1 },
  { name: "EventsBySessionIndex", sparse: true } // sparse เพราะ sessionId อาจไม่มีทุก event
);

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

ReadingAnalytic_EventStreamSchema.pre<IReadingAnalytic_EventStream>("save", function (next: any) { // next: any ตามข้อจำกัด
  // อัปเดต lastEventTimestamp เมื่อมีการเปลี่ยนแปลงใน events array
  // totalEventsProcessed จะถูก $inc ใน static method `addEvent` เพื่อความแม่นยำและ atomicity
  if (this.isModified("events")) {
    if (this.events && this.events.length > 0) {
      // หา timestamp ล่าสุดจาก events array ที่อาจถูก $slice มา
      // (logic นี้อาจจะไม่จำเป็นถ้า $set lastEventTimestamp ใน addEvent โดยตรง)
      // this.lastEventTimestamp = this.events[this.events.length - 1]?.timestamp;
      // แต่เนื่องจาก addEvent มี $slice การ set โดยตรงใน addEvent จะแน่นอนกว่า
    } else if (this.events && this.events.length === 0) {
      this.lastEventTimestamp = undefined; // ถ้า array ว่างเปล่า
    }
  }

  // ตรวจสอบสถานะความยินยอมก่อนบันทึก event ใหม่ (เป็น double check, การตรวจสอบหลักควรอยู่ใน addEvent)
  if (this.isModified("events") && this.events.length > (this.$__.priorDoc?.events?.length || 0) && !this.hasConsentToAnalytics) {
    console.warn(`[ReadingAnalytic_EventStream PRE-SAVE] Attempted to add events for user ${this.userId} who has not given analytics consent. This should ideally be blocked in the service layer or static method.`);
    // อาจจะ throw error หรือ filter events ออกถ้าไม่ต้องการให้บันทึกจริง
    // next(new Error("User has not consented to analytics.")); // ตัวอย่างการ block
  }

  next();
});

// ==================================================================================================
// SECTION: Static Methods (เมธอดสำหรับ Model ReadingAnalytic_EventStream)
// ==================================================================================================

interface AddEventArgs {
  userId: Types.ObjectId;
  eventData: Omit<IReadingEvent, "eventId" | "timestamp" | "_id">; // Omit _id as it's a subdocument
}

/**
 * @static addEvent
 * @description เพิ่ม event ใหม่เข้าไปใน stream ของผู้ใช้
 * @param {Types.ObjectId} userId ID ของผู้ใช้
 * @param {Omit<IReadingEvent, "eventId" | "timestamp" | "_id">} eventPayload ข้อมูลของ event ที่ต้องการเพิ่ม (ไม่ต้องมี eventId, timestamp; จะถูกสร้างอัตโนมัติ)
 * @returns {Promise<IReadingAnalytic_EventStream | null>} เอกสาร ReadingAnalytic_EventStream ที่อัปเดตแล้ว หรือ null ถ้าไม่สำเร็จ (เช่น ผู้ใช้ไม่ยินยอม)
 */
ReadingAnalytic_EventStreamSchema.statics.addEvent = async function (
  this: mongoose.Model<IReadingAnalytic_EventStream>, // Explicitly type 'this'
  { userId, eventData }: AddEventArgs
): Promise<IReadingAnalytic_EventStream | null> {

  // 1. ตรวจสอบความยินยอมของผู้ใช้ก่อนบันทึก event
  const UserModel = models.User as mongoose.Model<IUser>; // IUser คือ Mongoose Document interface
  // แก้ไข: ปรับการ select และ type ของ lean result
  const user = await UserModel.findById(userId)
    .select("privacySettings") // ดึง object privacySettings ทั้งหมด
    .lean<{ privacySettings?: { analyticsConsent?: { hasConsented: boolean, lastUpdatedAt?: Date } } }>(); // กำหนด type ของผลลัพธ์จาก lean()

  // แก้ไข: ตรวจสอบ user object และ nested properties อย่างปลอดภัย
  if (!user || !user.privacySettings?.analyticsConsent?.hasConsented) {
    console.warn(`[ReadingAnalytic_EventStream.addEvent] User ${userId} has not consented to analytics. Event not recorded for eventType: ${eventData.eventType}.`);
    return null; // ไม่บันทึก event ถ้าผู้ใช้ไม่ยินยอม
  }

  // 2. สร้าง event object ใหม่ พร้อม eventId และ timestamp
  const newEvent: IReadingEvent = {
    ...(eventData as Partial<IReadingEvent>), // Cast to Partial for initial spread
    eventId: new Types.ObjectId(),
    timestamp: new Date(),
    // ตรวจสอบว่า novelId ถูกส่งมาใน eventData และไม่เป็น undefined
    novelId: eventData.novelId, // novelId ควรถูกกำหนดใน eventData ที่ส่งเข้ามา
  } as IReadingEvent; // Cast to IReadingEvent หลัง assign ค่าที่จำเป็นครบถ้วน

  // 3. ตรวจสอบข้อมูลที่จำเป็นสำหรับ event แต่ละประเภท
  // (การตรวจสอบนี้ควรทำก่อนเรียก addEvent หรือใน service layer เพื่อให้ feedback ที่ดีกว่า)
  let validationError: string | null = null;
  switch (newEvent.eventType) {
    case ReadingEventType.MAKE_CHOICE:
      if (!newEvent.makeChoiceDetails?.choiceId || !newEvent.makeChoiceDetails?.sceneId || !newEvent.makeChoiceDetails?.choiceTextSnapshot) {
        validationError = "makeChoiceDetails requires choiceId, sceneId, and choiceTextSnapshot.";
      }
      break;
    case ReadingEventType.READ_SCENE:
      if (!newEvent.readSceneDetails?.sceneId) {
        validationError = "readSceneDetails requires sceneId.";
      }
      break;
    case ReadingEventType.EMOTIONAL_RESPONSE_LOGGED:
      if (!newEvent.emotionalResponseLoggedDetails?.emotionCategory) {
        validationError = "emotionalResponseLoggedDetails requires emotionCategory.";
      } else if (
        newEvent.emotionalResponseLoggedDetails.emotionCategory === EmotionCategory.OTHER &&
        !(newEvent.emotionalResponseLoggedDetails.customEmotion && newEvent.emotionalResponseLoggedDetails.customEmotion.trim().length > 0)
      ) {
        validationError = "customEmotion is required when emotionCategory is OTHER for emotional_response_logged event.";
      }
      break;
    // เพิ่มการตรวจสอบสำหรับ event types อื่นๆ ตามความจำเป็น
  }

  if (validationError) {
    console.error(`[ReadingAnalytic_EventStream.addEvent] Validation Error for user ${userId}, eventType ${newEvent.eventType}: ${validationError}`);
    // อาจจะ throw error หรือ return null ขึ้นอยู่กับนโยบายการจัดการ error
    // throw new Error(`Validation Error: ${validationError}`);
    return null;
  }


  const MAX_EVENTS_IN_ARRAY = process.env.NODE_ENV === 'development' ? 50 : 2000; // ขีดจำกัดจำนวน events ใน array (ปรับค่าสำหรับ production)

  // 4. อัปเดต document ของผู้ใช้: เพิ่ม event ใหม่, $inc totalEventsProcessed, $set lastEventTimestamp
  // ใช้ $slice เพื่อจำกัดขนาด array events
  return this.findOneAndUpdate(
    { userId: userId }, // Query: หา document ของผู้ใช้นี้
    {
      $push: {
        events: {
          $each: [newEvent], // เพิ่ม event ใหม่เข้าไปใน array
          $slice: -MAX_EVENTS_IN_ARRAY, // เก็บเฉพาะ N events ล่าสุดใน array (N = MAX_EVENTS_IN_ARRAY)
          $sort: { timestamp: 1 } // (Optional) ถ้าต้องการให้ array events เรียงตาม timestamp เสมอ (อาจมีผลต่อ performance ของ $push)
                                  // โดยปกติ $push จะเพิ่มท้าย array, $slice จะตัดจากหัวถ้าเป็นบวก, จากท้ายถ้าเป็นลบ
                                  // ถ้าต้องการเรียงจริงจัง อาจจะต้อง sort ก่อน $slice หรือ client ส่งมาเรียงแล้ว
        }
      },
      $inc: { totalEventsProcessed: 1 }, // เพิ่มจำนวน event ทั้งหมดที่เคยประมวลผล
      $set: {
        lastEventTimestamp: newEvent.timestamp, // อัปเดต timestamp ของ event ล่าสุดโดยตรง
        hasConsentToAnalytics: true, // ยืนยันว่ามีความยินยอม (เนื่องจากผ่านการตรวจสอบข้างต้นแล้ว)
        consentLastUpdatedAt: user.privacySettings?.analyticsConsent?.lastUpdatedAt, // อัปเดตจาก user profile
      },
      $setOnInsert: { // ข้อมูลที่จะใส่เมื่อสร้าง document ใหม่ด้วย upsert:true
        userId: userId,
        createdAt: new Date(), // Mongoose timestamps จะจัดการ createdAt, updatedAt แต่ใส่ไว้เผื่อ setDefaultsOnInsert
        schemaVersion: 1, // เวอร์ชัน schema เริ่มต้น
        events: [], // เริ่มต้นด้วย array ว่าง (ถ้า $push ด้านบนทำงานกับ doc ใหม่ มันจะสร้าง array ให้)
        totalEventsProcessed: 0, // เริ่มต้นจาก 0 (จะถูก $inc เป็น 1 ใน operation นี้)
      }
    },
    {
      upsert: true, // สร้าง document ใหม่ถ้ายังไม่มีสำหรับผู้ใช้นี้
      new: true, // คืนค่า document ที่อัปเดตแล้ว
      setDefaultsOnInsert: true, // ใช้ค่า default ที่กำหนดใน schema เมื่อสร้างใหม่
    }
  ).exec(); // .exec() เพื่อให้แน่ใจว่าคืนค่า Promise
};

/**
 * @static updateConsentStatus
 * @description อัปเดตสถานะความยินยอมในการวิเคราะห์ข้อมูลของผู้ใช้ในเอกสาร EventStream นี้
 *              (ควรเรียกใช้เมื่อมีการเปลี่ยนแปลงความยินยอมใน User model)
 * @param {Types.ObjectId} userId ID ของผู้ใช้
 * @param {boolean} hasConsent ผู้ใช้ให้ความยินยอมหรือไม่
 * @param {Date} [consentUpdatedAt] วันที่อัปเดตความยินยอม (ถ้ามี)
 * @returns {Promise<IReadingAnalytic_EventStream | null>} เอกสาร ReadingAnalytic_EventStream ที่อัปเดตแล้ว หรือ null ถ้าไม่มีเอกสาร
 */
ReadingAnalytic_EventStreamSchema.statics.updateConsentStatus = async function (
  this: mongoose.Model<IReadingAnalytic_EventStream>, // Explicitly type 'this'
  userId: Types.ObjectId,
  hasConsent: boolean,
  consentUpdatedAt?: Date
): Promise<IReadingAnalytic_EventStream | null> {
  return this.findOneAndUpdate(
    { userId: userId }, // Query
    {
      $set: { // ข้อมูลที่จะอัปเดต
        hasConsentToAnalytics: hasConsent,
        consentLastUpdatedAt: consentUpdatedAt || new Date(), // ใช้วันที่ปัจจุบันถ้าไม่ได้ส่งมา
      },
      $setOnInsert: { // ข้อมูลที่จะใส่เมื่อสร้างใหม่ (ถ้ายังไม่มี document ของ user นี้)
        userId: userId,
        events: [],
        totalEventsProcessed: 0,
        schemaVersion: 1,
        // hasConsentToAnalytics จะถูก set โดย $set ด้านบนอยู่แล้ว
      }
    },
    {
      upsert: true, // สร้างใหม่ถ้ายังไม่มี
      new: true, // คืนค่า document ที่อัปเดตแล้ว
      setDefaultsOnInsert: true,
    }
  ).exec();
};

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

// ตรวจสอบว่า Model "ReadingAnalytic_EventStream" ถูกสร้างไปแล้วหรือยัง ถ้ายัง ให้สร้าง Model ใหม่
// (วิธีนี้ช่วยป้องกัน error "OverwriteModelError" ใน Next.js hot-reloading)
const ReadingAnalytic_EventStreamModel =
  (models.ReadingAnalytic_EventStream as mongoose.Model<IReadingAnalytic_EventStream>) ||
  model<IReadingAnalytic_EventStream>("ReadingAnalytic_EventStream", ReadingAnalytic_EventStreamSchema, "readinganalyticeventstreams"); // ระบุชื่อ collection โดยตรง

export default ReadingAnalytic_EventStreamModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Event Stream Processing & Aggregation**:
//     - โมเดลนี้มีวัตถุประสงค์หลักเพื่อเก็บ event stream ดิบ (raw data).
//     - การประมวลผลข้อมูลเพื่อสรุปผล, สร้าง insights, หรือ update aggregate models (เช่น ReadingAnalytic_Summary.ts)
//       ควรดำเนินการโดย background jobs, worker services (เช่น ใช้ BullMQ, RabbitMQ), หรือ MongoDB Change Streams + Functions
//       เพื่อไม่ให้กระทบ performance ของการเขียน event และ API response time.
// 2.  **Array Size Management & Data Archiving**:
//     - `$slice` ใน `$push` operation ช่วยจำกัดขนาดของ `events` array ภายในแต่ละ document เพื่อควบคุมขนาด document และ RAM usage.
//     - สำหรับข้อมูลระยะยาว (historical data) และปริมาณมหาศาล, ควรมีกลยุทธ์ archiving เช่น:
//       - ย้าย events เก่าๆ (เช่น เกิน 90 วัน) จาก document ปัจจุบันไปยัง "cold storage" collection อื่น หรือ data lake (เช่น S3, BigQuery).
//       - สร้าง "summary" documents รายวัน/รายสัปดาห์ แล้วลบ raw events เก่าๆ.
// 3.  **Querying Large Event Arrays**:
//     - การ query event ที่ซับซ้อน (เช่น pattern analysis, sequence matching) บน array ขนาดใหญ่โดยตรงอาจช้า.
//     - ควรใช้ MongoDB Aggregation Framework อย่างมีประสิทธิภาพ.
//     - พิจารณา denormalize ข้อมูลบางส่วนออกมาเป็น fields ใน top-level document หรือใน summary models.
// 4.  **Consent Management**:
//     - การตรวจสอบความยินยอม (consent) เป็นสิ่งสำคัญที่สุด. ควรมีการซิงค์สถานะ `hasConsentToAnalytics` และ `consentLastUpdatedAt`
//       กับ User model (User.privacySettings) อย่างสม่ำเสมอ.
//     - หากผู้ใช้ถอนความยินยอม, ระบบต้องมีกระบวนการหยุดเก็บ event ใหม่ และจัดการกับ event เก่าตามนโยบาย (เช่น anonymize หรือลบ).
// 5.  **Data Snapshots for Contextual Integrity**:
//     - ข้อมูลที่ดึงมาจาก models อื่น (เช่น `associatedEmotionTags`, `psychologicalImpactScore` จาก Choice/StoryMap)
//       ควรถูก "snapshot" (คัดลอกค่า ณ เวลานั้น) มาเก็บไว้ใน `eventData` โดยตรง.
//       วิธีนี้ช่วยป้องกันปัญหาข้อมูลไม่ตรงกันหากข้อมูลต้นทาง (เช่น Choice) มีการแก้ไขในภายหลัง.
// 6.  **Time-Series Optimized Storage (MongoDB Time Series Collections)**:
//     - หากปริมาณ event stream สูงมาก (เช่น หลายล้าน events ต่อวัน), ควรพิจารณาใช้ MongoDB Time Series Collections
//       ซึ่งออกแบบมาเพื่อประสิทธิภาพในการ ingest และ query time-series data โดยเฉพาะ.
//       (ต้องใช้ MongoDB 5.0+). Model structure อาจจะต้องปรับเล็กน้อย.
// 7.  **Data Retention Policy & Anonymization**:
//     - กำหนดนโยบายการเก็บข้อมูล (Data Retention Policy) ที่ชัดเจน (เช่น เก็บ raw events กี่วัน, เก็บ summary data นานเท่าไหร่).
//     - พัฒนากระบวนการ anonymize หรือ pseudonymize ข้อมูล event stream สำหรับการวิเคราะห์ภาพรวม, การวิจัย, หรือการ train AI
//       เพื่อปกป้องความเป็นส่วนตัวของผู้ใช้ และสอดคล้องกับกฎหมายคุ้มครองข้อมูล (เช่น GDPR, PDPA).
// 8.  **Schema Versioning and Migration**:
//     - `schemaVersion` field ช่วยในการจัดการการเปลี่ยนแปลง schema ของ event stream ในอนาคต.
//     - ต้องมีแผนสำหรับ data migration หากมีการเปลี่ยนแปลงโครงสร้างที่ incompatible.
// 9.  **Error Handling in Static Methods**:
//     - `addEvent` และ `updateConsentStatus` ควรมีการจัดการ error ที่ละเอียดขึ้น (เช่น throw custom errors, logging)
//     - การตรวจสอบ input parameters (validation) ใน static methods ก็สำคัญ.
// 10. **Scalability and Throughput**:
//     - สำหรับแพลตฟอร์มขนาดใหญ่, การเขียน event จำนวนมากพร้อมๆ กันอาจเป็น bottleneck.
//     - พิจารณาใช้ message queue (เช่น Kafka, RabbitMQ) เพื่อ buffer events ก่อนที่จะเขียนลง MongoDB
//       เพื่อเพิ่ม throughput และ resilience.
// ==================================================================================================