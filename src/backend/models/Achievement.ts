// src/backend/models/Achievement.ts
// โมเดลรางวัลความสำเร็จ (Achievement Model)
// กำหนดรางวัลความสำเร็จต่างๆ ที่ผู้ใช้สามารถปลดล็อกได้ในแพลตฟอร์ม NovelMaze, พร้อมระบบเงื่อนไขและรางวัลที่ยืดหยุ่น

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IBadge } from "./Badge"; // สำหรับ rewardBadgeId
import { IOfficialMedia } from "./OfficialMedia"; // สำหรับ iconMediaId
// IUser ไม่จำเป็นต้อง import โดยตรงในไฟล์นี้ เว้นแต่จะใช้ใน populate ที่ซับซ้อนมากๆ
// ซึ่งปกติจะทำใน service layer

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Achievement
// ==================================================================================================

/**
 * @enum {string} AchievementCategory
 * @description หมวดหมู่หลักของรางวัลความสำเร็จ เพื่อช่วยในการจัดกลุ่มและแสดงผล
 * - `READING`: เกี่ยวกับการอ่านนิยายและตอนต่างๆ
 * - `WRITING`: เกี่ยวกับการสร้างสรรค์ผลงานนิยาย (สำหรับนักเขียน)
 * - `ENGAGEMENT`: เกี่ยวกับการมีส่วนร่วมในชุมชน (คอมเมนต์, ไลค์, ติดตาม)
 * - `COLLECTION`: เกี่ยวกับการสะสมไอเท็มต่างๆ (เช่น ป้าย, ตัวละครพิเศษ)
 * - `EVENT_PARTICIPATION`: เกี่ยวกับการเข้าร่วมกิจกรรมพิเศษของแพลตฟอร์ม
 * - `PLATFORM_MILESTONE`: เกี่ยวกับความสำเร็จหลักบนแพลตฟอร์ม (เช่น เป็นสมาชิกครบปี)
 * - `MONETIZATION`: เกี่ยวกับการสร้างรายได้หรือการใช้จ่ายบนแพลตฟอร์ม
 * - `SOCIAL_INTERACTION`: เกี่ยวกับการปฏิสัมพันธ์กับผู้ใช้อื่น
 * - `CONTENT_DISCOVERY`: เกี่ยวกับการค้นพบเนื้อหาใหม่ๆ หรือหมวดหมู่ที่หลากหลาย
 * - `LEARNING_AND_EXPLORATION`: เกี่ยวกับการเรียนรู้การใช้งานฟีเจอร์ต่างๆ ของแพลตฟอร์ม
 * - `OTHER`: หมวดหมู่อื่นๆ ที่ไม่เข้าพวก
 */
export enum AchievementCategory {
  READING = "Reading",
  WRITING = "Writing",
  ENGAGEMENT = "Engagement",
  COLLECTION = "Collection",
  EVENT_PARTICIPATION = "EventParticipation",
  PLATFORM_MILESTONE = "PlatformMilestone",
  MONETIZATION = "Monetization",
  SOCIAL_INTERACTION = "SocialInteraction",
  CONTENT_DISCOVERY = "ContentDiscovery",
  LEARNING_AND_EXPLORATION = "LearningAndExploration",
  OTHER = "Other",
}

/**
 * @enum {string} AchievementRarity
 * @description ระดับความหายากของรางวัลความสำเร็จ มีผลต่อการแสดงผลและอาจมีผลต่อรางวัล
 * - `COMMON`: ทั่วไป (ปลดล็อกง่าย)
 * - `UNCOMMON`: ไม่บ่อย (มีความท้าทายเล็กน้อย)
 * - `RARE`: หายาก (ต้องใช้ความพยายามพอสมควร)
 * - `EPIC`: ยิ่งใหญ่ (ท้าทายมาก, รางวัลอาจจะดีขึ้น)
 * - `LEGENDARY`: ตำนาน (ยากที่สุดในการปลดล็อก, รางวัลพิเศษสุด)
 * - `MYTHIC`: เหนือตำนาน (สำหรับอีเว้นท์พิเศษ หรือความสำเร็จที่ยากมากๆ)
 */
export enum AchievementRarity {
  COMMON = "Common",
  UNCOMMON = "Uncommon",
  RARE = "Rare",
  EPIC = "Epic",
  LEGENDARY = "Legendary",
  MYTHIC = "Mythic",
}

/**
 * @enum {string} AchievementRewardType
 * @description ประเภทของรางวัลที่ผู้ใช้จะได้รับเมื่อปลดล็อก Achievement
 * - `COINS`: เหรียญในเกม/แพลตฟอร์ม
 * - `POINTS`: แต้มประสบการณ์ (XP) หรือแต้มพิเศษอื่นๆ
 * - `BADGE`: ป้ายรางวัล (อ้างอิง Badge model)
 * - `PROFILE_FRAME`: กรอบโปรไฟล์พิเศษ
 * - `EXCLUSIVE_CONTENT_ACCESS`: สิทธิ์ในการเข้าถึงเนื้อหาพิเศษ
 * - `DISCOUNT_VOUCHER`: คูปองส่วนลดสำหรับการซื้อในแพลตฟอร์ม
 * - `FEATURE_UNLOCK`: ปลดล็อกฟีเจอร์บางอย่าง
 * - `NO_REWARD`: ไม่มีรางวัลเป็นรูปธรรม (ตัว Achievement เองคือรางวัล)
 */
export enum AchievementRewardType {
  COINS = "Coins",
  POINTS = "Points", // สามารถใช้เป็น XP ได้
  BADGE = "Badge",
  PROFILE_FRAME = "ProfileFrame",
  EXCLUSIVE_CONTENT_ACCESS = "ExclusiveContentAccess",
  DISCOUNT_VOUCHER = "DiscountVoucher",
  FEATURE_UNLOCK = "FeatureUnlock",
  NO_REWARD = "NoReward",
}

/**
 * @interface IAchievementReward
 * @description โครงสร้างของรางวัลที่ผู้ใช้จะได้รับ
 * @property {AchievementRewardType} type - ประเภทของรางวัล
 * @property {number} [value] - จำนวน (เช่น จำนวนเหรียญ, จำนวนแต้ม)
 * @property {Types.ObjectId | IBadge | string} [itemId] - ID ของไอเท็มที่เกี่ยวข้อง (เช่น Badge ID, ชื่อ frame, โค้ด voucher)
 * @property {string} [description] - คำอธิบายเพิ่มเติมเกี่ยวกับรางวัล
 */
export interface IAchievementReward {
  type: AchievementRewardType;
  value?: number;
  itemId?: Types.ObjectId | IBadge | string; // string for profile frame name or voucher code
  description?: string;
}
const AchievementRewardSchema = new Schema<IAchievementReward>(
  {
    type: { type: String, enum: Object.values(AchievementRewardType), required: true, description: "ประเภทของรางวัล" },
    value: { type: Number, min: 0, description: "จำนวน (เช่น จำนวนเหรียญ, จำนวนแต้ม)" },
    itemId: { type: Schema.Types.Mixed, description: "ID ของไอเท็มที่เกี่ยวข้อง (เช่น Badge ID, ชื่อ frame, โค้ด voucher)" }, // Can be ObjectId for Badge, or string for others
    description: { type: String, trim: true, maxlength: 255, description: "คำอธิบายเพิ่มเติมเกี่ยวกับรางวัล" },
  },
  { _id: false }
);

/**
 * @enum {string} AchievementUnlockEvent
 * @description ประเภทของ Event หลักๆ ที่ Gamification Service จะใช้ในการประมวลผลเพื่อปลดล็อก Achievement
 * Enum นี้จะถูกใช้ใน IAchievementUnlockCondition.eventName เพื่อให้มีความสอดคล้องกัน
 * และควรจะ map กับ ActivityType หรือ ReadingEventType ที่เกี่ยวข้อง
 * - `USER_REGISTERED`: ผู้ใช้สมัครสมาชิกใหม่
 * - `USER_LOGGED_IN_DAYS_STREAK`: ผู้ใช้ล็อกอินต่อเนื่องครบจำนวนวันที่กำหนด
 * - `USER_READ_EPISODE_COUNT`: ผู้ใช้อ่านตอนครบจำนวนที่กำหนด (โดยรวม)
 * - `USER_READ_NOVEL_COUNT`: ผู้ใช้อ่านนิยายจบเรื่องครบจำนวนที่กำหนด
 * - `USER_READ_NOVEL_OF_GENRE_COUNT`: (เพิ่มใหม่) ผู้ใช้อ่านนิยายในหมวดหมู่ (Genre) ที่กำหนดครบจำนวนเรื่อง
 * - `USER_POSTED_COMMENT_COUNT`: ผู้ใช้แสดงความคิดเห็นครบจำนวนครั้ง
 * - `USER_LIKED_CONTENT_COUNT`: ผู้ใช้กดถูกใจเนื้อหาครบจำนวนครั้ง
 * - `USER_FOLLOWED_COUNT`: ผู้ใช้ติดตามผู้ใช้อื่นครบจำนวนคน
 * - `WRITER_PUBLISHED_NOVEL_COUNT`: นักเขียนเผยแพร่นิยายครบจำนวนเรื่อง
 * - `WRITER_PUBLISHED_EPISODE_COUNT`: นักเขียนเผยแพร่ตอนครบจำนวนตอน
 * - `WRITER_RECEIVED_TOTAL_LIKES_COUNT`: นักเขียนได้รับยอดไลค์รวมครบจำนวนที่กำหนด
 * - `WRITER_GAINED_TOTAL_FOLLOWERS_COUNT`: นักเขียนมีผู้ติดตามรวมครบจำนวนที่กำหนด
 * - `USER_PURCHASED_ITEM_COUNT`: ผู้ใช้ซื้อไอเท็ม/ตอนครบจำนวนครั้ง
 * - `USER_DONATED_COINS_TOTAL`: ผู้ใช้บริจาคเหรียญรวมครบจำนวนที่กำหนด
 * - `USER_PARTICIPATED_IN_EVENT_COUNT`: ผู้ใช้เข้าร่วมกิจกรรมครบจำนวนครั้ง
 * - `USER_CUSTOM_EVENT_TRIGGERED`: Event ที่กำหนดเองถูก Trigger (ใช้สำหรับ Achievement ที่ซับซ้อน)
 */
export enum AchievementUnlockEvent {
    USER_REGISTERED = "USER_REGISTERED",
    USER_LOGGED_IN_DAYS_STREAK = "USER_LOGGED_IN_DAYS_STREAK",
    USER_READ_EPISODE_COUNT = "USER_READ_EPISODE_COUNT",
    USER_READ_NOVEL_COUNT = "USER_READ_NOVEL_COUNT",
    USER_READ_NOVEL_OF_GENRE_COUNT = "USER_READ_NOVEL_OF_GENRE_COUNT", // <--- เพิ่มใหม่
    USER_POSTED_COMMENT_COUNT = "USER_POSTED_COMMENT_COUNT",
    USER_LIKED_CONTENT_COUNT = "USER_LIKED_CONTENT_COUNT",
    USER_FOLLOWED_COUNT = "USER_FOLLOWED_COUNT",
    WRITER_PUBLISHED_NOVEL_COUNT = "WRITER_PUBLISHED_NOVEL_COUNT",
    WRITER_PUBLISHED_EPISODE_COUNT = "WRITER_PUBLISHED_EPISODE_COUNT",
    WRITER_RECEIVED_TOTAL_LIKES_COUNT = "WRITER_RECEIVED_TOTAL_LIKES_COUNT",
    WRITER_GAINED_TOTAL_FOLLOWERS_COUNT = "WRITER_GAINED_TOTAL_FOLLOWERS_COUNT",
    USER_PURCHASED_ITEM_COUNT = "USER_PURCHASED_ITEM_COUNT",
    USER_DONATED_COINS_TOTAL = "USER_DONATED_COINS_TOTAL",
    USER_PARTICIPATED_IN_EVENT_COUNT = "USER_PARTICIPATED_IN_EVENT_COUNT",
    USER_CUSTOM_EVENT_TRIGGERED = "USER_CUSTOM_EVENT_TRIGGERED",
}


/**
 * @enum {string} UnlockConditionOperator
 * @description ตัวดำเนินการสำหรับเงื่อนไขการปลดล็อก Achievement ที่ผู้ใช้ระบุ
 * - `GREATER_THAN_OR_EQUAL_TO_COUNT`: >=_COUNT - ตรวจสอบว่าจำนวนครั้งที่เกิด eventName นั้น มากกว่าหรือเท่ากับ targetValue (ที่เป็นตัวเลข)
 * - `EQUAL_TO_EXACT_VALUE`: ==_EXACT - ตรวจสอบว่าค่าที่ส่งมากับ eventName (ใน details) ตรงกับ targetValue แบบเป๊ะๆ
 * - `LESS_THAN_OR_EQUAL_TO_COUNT`: <=_COUNT - ตรวจสอบว่าจำนวนครั้งที่เกิด eventName นั้น น้อยกว่าหรือเท่ากับ targetValue (ที่เป็นตัวเลข)
 * - `GREATER_THAN_OR_EQUAL_TO_VALUE_FROM_EVENT`: >=_VALUE_SPECIFIC_EVENT - ตรวจสอบว่าค่าตัวเลขที่ส่งมากับ eventName (ใน details) มากกว่าหรือเท่ากับ targetValue
 * - `EQUAL_TO_VALUE_FROM_EVENT`: ==_VALUE_SPECIFIC_EVENT - ตรวจสอบว่าค่าตัวเลขที่ส่งมากับ eventName (ใน details) เท่ากับ targetValue
 * - `HAS_FLAG`: (เพิ่มใหม่) ตรวจสอบว่ามี flag หรือ property ที่ระบุใน targetValue (เป็น string ชื่อ property) อยู่ใน details ของ event หรือไม่ หรือค่า boolean ของ property นั้นเป็น true
 * - `NOT_HAS_FLAG`: (เพิ่มใหม่) ตรวจสอบว่าไม่มี flag หรือ property ที่ระบุใน targetValue หรือค่า boolean ของ property นั้นเป็น false
 * - `BEFORE_DATE`: (เพิ่มใหม่) ตรวจสอบว่า event เกิดก่อนวันที่ targetValue (ที่เป็น Date string ISO)
 * - `AFTER_DATE`: (เพิ่มใหม่) ตรวจสอบว่า event เกิดหลังวันที่ targetValue (ที่เป็น Date string ISO)
 * - `WITHIN_DURATION_SECONDS_FROM_PREVIOUS_EVENT`: (เพิ่มใหม่) ตรวจสอบว่า event ปัจจุบันเกิดภายในระยะเวลา targetValue (วินาที) หลังจาก event ก่อนหน้า (ที่ระบุใน relatedTo)
 * - `CUSTOM_FUNCTION`: (คงไว้จากเดิม) ใช้ custom function ใน service layer เพื่อตรวจสอบเงื่อนไขที่ซับซ้อน (targetValue อาจเป็นชื่อ function)
 * - `REGEX_MATCH_ON_EVENT_DETAIL`: (เพิ่มใหม่) ตรวจสอบว่าค่า string ใน event detail (ระบุ field ด้วย relatedTo) ตรงกับ Regular Expression ใน targetValue
 */
export enum UnlockConditionOperator {
  GREATER_THAN_OR_EQUAL_TO_COUNT = ">=_COUNT",
  EQUAL_TO_EXACT_VALUE = "==_EXACT",
  LESS_THAN_OR_EQUAL_TO_COUNT = "<=_COUNT",
  GREATER_THAN_OR_EQUAL_TO_VALUE_FROM_EVENT = ">=_VALUE_SPECIFIC_EVENT",
  EQUAL_TO_VALUE_FROM_EVENT = "==_VALUE_SPECIFIC_EVENT",
  HAS_FLAG = "HAS_FLAG",
  NOT_HAS_FLAG = "NOT_HAS_FLAG",
  BEFORE_DATE = "BEFORE_DATE",
  AFTER_DATE = "AFTER_DATE",
  WITHIN_DURATION_SECONDS_FROM_PREVIOUS_EVENT = "WITHIN_DURATION_SECONDS_FROM_PREVIOUS_EVENT",
  CUSTOM_FUNCTION = "custom_function",
  REGEX_MATCH_ON_EVENT_DETAIL = "REGEX_MATCH_ON_EVENT_DETAIL",
}


/**
 * @interface IAchievementUnlockCondition
 * @description โครงสร้างของเงื่อนไขในการปลดล็อก Achievement
 * @property {AchievementUnlockEvent} eventName - (ปรับปรุง) ชื่อ event หลักที่ใช้ในการตรวจสอบ. ควรสอดคล้องกับค่าใน {@link AchievementUnlockEvent}.
 * @property {UnlockConditionOperator} [operator] - ตัวดำเนินการเปรียบเทียบที่ใช้กับ targetValue. ดูคำอธิบายใน {@link UnlockConditionOperator}.
 * @property {any} targetValue - ค่าเป้าหมายที่ต้องทำให้สำเร็จ (เช่น 10, "sci-fi", true, "ISO_DATE_STRING", "REGEX_PATTERN"). ประเภทข้อมูลของ targetValue จะขึ้นอยู่กับ `eventName` และ `operator` ที่เลือก.
 * @property {string} [description] - คำอธิบายเงื่อนไขนี้ (human-readable) เช่น "อ่านนิยายครบ 10 ตอน"
 * @property {string} [relatedTo] - (Optional) ใช้เพื่อระบุ property หรือ entity ที่ต้องการกรอง หรือตรวจสอบค่าภายใน event. สำหรับ `USER_READ_NOVEL_OF_GENRE_COUNT`, `relatedTo` ควรเป็น ID ของ Category (Genre) หรือ slug ของมัน. ตัวอย่างอื่นๆ: "novelId", "category.slug", หรือ path ใน event.details เช่น 'sceneDetails.isReread'.
 * @property {"Novel" | "Episode" | "Category" | "User" | "Tag" | "SpecificItem" | string} [relatedToType] - (Optional) ประเภทของ `relatedTo`. เช่น ถ้า `eventName` คือ `USER_READ_NOVEL_OF_GENRE_COUNT` และ `relatedTo` คือ ID ของ Genre, `relatedToType` จะเป็น "Category".
 * @property {number} [group] - (Optional) สำหรับจัดกลุ่มเงื่อนไข (AND/OR logic จะจัดการใน service layer). เงื่อนไขใน group เดียวกันอาจจะถูกพิจารณาร่วมกัน.
 * @property {boolean} [isTerminal] - (Optional) ระบุว่าเงื่อนไขนี้ (ถ้าเป็นจริง) ทำให้ Achievement ถูกปลดล็อกทันทีหรือไม่ แม้ว่าจะมีเงื่อนไขอื่นๆ ใน group เดียวกันที่ยังไม่เป็นจริง (สำหรับ logic OR บางประเภท). (default: false)
 * @property {number} [weight] - (Optional) น้ำหนักของเงื่อนไขนี้ในการคำนวณความคืบหน้าโดยรวม (ถ้ามีระบบ progress tracking แบบ % ที่ซับซ้อน)
 */
export interface IAchievementUnlockCondition {
  eventName: AchievementUnlockEvent;
  operator?: UnlockConditionOperator;
  targetValue: any;
  description?: string;
  relatedTo?: string;
  relatedToType?: "Novel" | "Episode" | "Category" | "User" | "Tag" | "SpecificItem" | string;
  group?: number;
  isTerminal?: boolean;
  weight?: number;
}
const AchievementUnlockConditionSchema = new Schema<IAchievementUnlockCondition>(
  {
    eventName: {
      type: String,
      enum: Object.values(AchievementUnlockEvent),
      required: [true, "กรุณาระบุชื่อ Event หลักสำหรับเงื่อนไข"],
      description: "Event หลักที่ Gamification Service จะใช้ในการตรวจสอบ",
    },
    operator: {
      type: String,
      enum: Object.values(UnlockConditionOperator),
      default: UnlockConditionOperator.GREATER_THAN_OR_EQUAL_TO_COUNT,
      description: "ตัวดำเนินการที่ใช้เปรียบเทียบ เช่น >=_COUNT, ==_EXACT_VALUE",
    },
    targetValue: {
      type: Schema.Types.Mixed,
      required: [true, "กรุณาระบุค่าเป้าหมายสำหรับเงื่อนไข"],
      description: "ค่าเป้าหมายที่ต้องการ เช่น 10, 'sci-fi', true, หรือ REGEX pattern",
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "คำอธิบายเงื่อนไขต้องไม่เกิน 500 ตัวอักษร"],
      description: "คำอธิบายที่มนุษย์อ่านเข้าใจได้ของเงื่อนไขนี้",
    },
    relatedTo: {
      type: String,
      trim: true,
      maxlength: [255, "relatedTo ต้องไม่เกิน 255 ตัวอักษร"],
      description: " (Optional) ระบุ property/entity ที่เกี่ยวข้อง เช่น novelId, category.slug หรือ path ใน event.details",
    },
    relatedToType: {
      type: String,
      trim: true,
      maxlength: [100, "relatedToType ต้องไม่เกิน 100 ตัวอักษร"],
      description: " (Optional) ประเภทของ relatedTo เช่น Novel, Category, User, หรือชื่อ field ใน event details",
    },
    group: {
      type: Number,
      description: " (Optional) สำหรับจัดกลุ่มเงื่อนไข (AND/OR logic จะจัดการใน service layer)",
    },
    isTerminal: {
        type: Boolean,
        default: false,
        description: "(Optional) ถ้าเงื่อนไขนี้เป็นจริง ให้ปลดล็อกทันที (สำหรับ OR logic บางประเภท)",
    },
    weight: {
        type: Number,
        min: 0,
        description: "(Optional) น้ำหนักของเงื่อนไขนี้ในการคำนวณ progress (ถ้ามี)",
    }
  },
  { _id: false }
);

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร Achievement (IAchievement Document Interface)
// ==================================================================================================

/**
 * @interface IAchievement
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสาร "ต้นแบบ" ของรางวัลความสำเร็จใน Collection "achievements"
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสาร
 * @property {string} achievementCode - รหัสเฉพาะของ Achievement (human-readable, unique, เช่น "FIRST_NOVEL_PUBLISHED") (**จำเป็น**, **unique**)
 * @property {string} title - ชื่อรางวัลความสำเร็จ (เช่น "นักอ่านตัวยง", "นักเขียนดาวรุ่ง") (**จำเป็น**)
 * @property {string} description - คำอธิบายเกี่ยวกับรางวัลและวิธีการปลดล็อก (**จำเป็น**)
 * @property {Types.ObjectId | IOfficialMedia} [iconMediaId] - (Optional) ID ของ OfficialMedia ที่ใช้เป็นไอคอน (อาจเป็น ObjectId หรือ populated IOfficialMedia)
 * @property {string} [customIconUrl] - (Optional) URL ไอคอนแบบกำหนดเอง (ถ้าไม่ได้ใช้ OfficialMedia)
 * @property {AchievementCategory} category - หมวดหมู่ของรางวัลความสำเร็จ (**จำเป็น**)
 * @property {AchievementRarity} rarity - ระดับความหายากของรางวัล (**จำเป็น**, default: `COMMON`)
 * @property {IAchievementUnlockCondition[]} unlockConditions - รายการเงื่อนไขในการปลดล็อก (**จำเป็น**, ต้องมีอย่างน้อย 1 เงื่อนไข)
 * @property {IAchievementReward[]} [rewards] - รายการรางวัลที่จะได้รับเมื่อปลดล็อก (Optional)
 * @property {string} [unlockHint] - (Optional) คำใบ้ในการปลดล็อก (สำหรับรางวัลที่ซับซ้อนหรือเป็นความลับบางส่วน)
 * @property {boolean} isActive - สถานะการเปิดใช้งานของรางวัลนี้ (default: `true`)
 * @property {boolean} isSecret - เป็นรางวัลลับหรือไม่ (ไม่แสดงในรายการจนกว่าจะปลดล็อก, default: `false`)
 * @property {boolean} isRepeatable - สามารถปลดล็อกซ้ำได้หรือไม่ (เช่น achievement รายวัน/รายสัปดาห์, default: `false`)
 * @property {number} [maxRepeats] - (Optional) จำนวนครั้งสูงสุดที่สามารถปลดล็อกซ้ำได้ (ถ้า isRepeatable = true)
 * @property {number} [points] - (Optional) แต้มที่เกี่ยวข้องกับ Achievement นี้ (อาจใช้ในการจัดอันดับหรือระบบ Gamification อื่นๆ, เช่น XP ที่ได้โดยตรงจาก Achievement นี้)
 * @property {number} displayOrder - ลำดับการแสดงผล (default: 0, ใช้ในการเรียงลำดับ)
 * @property {string[]} [tags] - (Optional) แท็กสำหรับจัดกลุ่มหรือค้นหา Achievement
 * @property {Date} [availableFrom] - (Optional) วันที่เริ่มใช้งาน Achievement นี้ (สำหรับ Event-specific)
 * @property {Date} [availableUntil] - (Optional) วันที่สิ้นสุดการใช้งาน Achievement นี้ (สำหรับ Event-specific)
 * @property {any} [metadata] - (Optional) ข้อมูลเพิ่มเติมอื่นๆ ที่เกี่ยวข้อง (เช่น ข้อมูลสำหรับ Admin UI)
 * @property {number} schemaVersion - เวอร์ชันของ schema (default: 1)
 * @property {Date} createdAt - วันที่สร้างเอกสาร (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตเอกสารล่าสุด (Mongoose `timestamps`)
 */
export interface IAchievement extends Document {
  _id: Types.ObjectId;
  achievementCode: string;
  title: string;
  description: string;
  iconMediaId?: Types.ObjectId;
  customIconUrl?: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  unlockConditions: Types.DocumentArray<IAchievementUnlockCondition>;
  rewards?: Types.DocumentArray<IAchievementReward>;
  unlockHint?: string;
  isActive: boolean;
  isSecret: boolean;
  isRepeatable: boolean;
  maxRepeats?: number;
  points?: number;
  displayOrder: number;
  tags?: string[];
  availableFrom?: Date;
  availableUntil?: Date;
  metadata?: any;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ Achievement (AchievementSchema)
// ==================================================================================================
const AchievementSchema = new Schema<IAchievement>(
  {
    achievementCode: {
      type: String,
      required: [true, "กรุณาระบุรหัสเฉพาะของ Achievement"],
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: [100, "รหัส Achievement ต้องไม่เกิน 100 ตัวอักษร"],
      match: [/^[A-Z0-9_]+$/, "รหัส Achievement สามารถมีได้เฉพาะตัวอักษรภาษาอังกฤษตัวใหญ่, ตัวเลข, และ underscore (_)"],
      index: true,
      description: "รหัสเฉพาะที่ใช้อ้างอิง Achievement ในระบบ เช่น 'FIRST_NOVEL_READ', 'WRITER_OF_THE_MONTH'",
    },
    title: {
      type: String,
      required: [true, "กรุณาระบุชื่อรางวัล"],
      trim: true,
      maxlength: [200, "ชื่อรางวัลต้องไม่เกิน 200 ตัวอักษร"],
      index: true,
      description: "ชื่อ Achievement ที่แสดงให้ผู้ใช้เห็น เช่น 'นักอ่านหน้าใหม่', 'นักเขียนยอดนิยม'",
    },
    description: {
      type: String,
      required: [true, "กรุณาระบุคำอธิบายรางวัล"],
      trim: true,
      maxlength: [2000, "คำอธิบายรางวัลต้องไม่เกิน 2000 ตัวอักษร"],
      description: "คำอธิบายเกี่ยวกับ Achievement และวิธีการปลดล็อกโดยสังเขป",
    },
    iconMediaId: {
        type: Schema.Types.ObjectId,
        ref: "OfficialMedia",
        sparse: true,
        description: "(Optional) ID ของ OfficialMedia ที่ใช้เป็นไอคอนหลักของ Achievement นี้",
    },
    customIconUrl: {
        type: String,
        trim: true,
        maxlength: [2048, "URL ไอคอนที่กำหนดเองต้องไม่เกิน 2048 ตัวอักษร"],
        validate: {
            validator: function(v: string) { return !v || /^https?:\/\//.test(v); },
            message: (props: any) => `${props.value} ไม่ใช่ URL ที่ถูกต้องสำหรับไอคอน!`
        },
        description: "(Optional) URL ของไอคอนแบบกำหนดเอง หากไม่ได้ใช้ iconMediaId",
    },
    category: {
      type: String,
      enum: Object.values(AchievementCategory),
      required: [true, "กรุณาระบุหมวดหมู่ของรางวัล"],
      index: true,
      description: "หมวดหมู่หลักของ Achievement เพื่อการจัดกลุ่ม",
    },
    rarity: {
      type: String,
      enum: Object.values(AchievementRarity),
      default: AchievementRarity.COMMON,
      required: true,
      index: true,
      description: "ระดับความหายากของ Achievement",
    },
    unlockConditions: {
      type: [AchievementUnlockConditionSchema],
      required: true,
      validate: {
        validator: (val: any[]) => val.length > 0,
        message: "ต้องมีอย่างน้อยหนึ่งเงื่อนไขในการปลดล็อก"
      },
      description: "รายการเงื่อนไขที่ผู้ใช้ต้องทำให้สำเร็จเพื่อปลดล็อก Achievement นี้",
    },
    rewards: {
        type: [AchievementRewardSchema],
        default: [],
        description: "(Optional) รายการรางวัลที่ผู้ใช้จะได้รับเมื่อปลดล็อก Achievement",
    },
    unlockHint: {
        type: String,
        trim: true,
        maxlength: [500, "คำใบ้ในการปลดล็อกต้องไม่เกิน 500 ตัวอักษร"],
        description: "(Optional) คำใบ้สำหรับผู้เล่นในการค้นหาวิธีปลดล็อก",
    },
    isActive: { type: Boolean, default: true, index: true, description: "สถานะว่า Achievement นี้ยังใช้งานอยู่หรือไม่" },
    isSecret: { type: Boolean, default: false, index: true, description: "เป็น Achievement ลับหรือไม่" },
    isRepeatable: { type: Boolean, default: false, description: "Achievement นี้สามารถปลดล็อกซ้ำได้หรือไม่" },
    maxRepeats: {
        type: Number,
        min: 1,
        validate: {
            validator: function(this: IAchievement, value: number | undefined) {
                return !this.isRepeatable || (value !== undefined && value >=1);
            },
            message: "ต้องระบุ maxRepeats (>=1) หาก isRepeatable เป็น true"
        },
        description: "(Optional) จำนวนครั้งสูงสุดที่สามารถปลดล็อกซ้ำได้",
    },
    points: {
        type: Number,
        min: 0,
        default: 0,
        description: "(Optional) แต้มประสบการณ์ (XP) หรือแต้มอื่นๆ ที่เกี่ยวข้องโดยตรงกับ Achievement นี้",
    },
    displayOrder: { type: Number, default: 0, index: true, description: "ลำดับการแสดงผล Achievement ในรายการ" },
    tags: {
        type: [String],
        default: [],
        index: true,
        validate: {
            validator: (tags: string[]) => tags.every(tag => tag.length <= 50),
            message: "แต่ละแท็กต้องมีความยาวไม่เกิน 50 ตัวอักษร"
        },
        description: "(Optional) แท็กสำหรับจัดกลุ่มหรือค้นหา Achievement เพิ่มเติม",
    },
    availableFrom: { type: Date, sparse: true, description: "(Optional) วันที่เริ่มให้ปลดล็อก Achievement นี้" },
    availableUntil: { type: Date, sparse: true, description: "(Optional) วันที่สิ้นสุดการให้ปลดล็อก Achievement นี้" },
    metadata: { type: Schema.Types.Mixed, description: "(Optional) ข้อมูลเพิ่มเติมอื่นๆ ที่ผู้ดูแลระบบสามารถกำหนดได้" },
    schemaVersion: { type: Number, default: 1, min: 1, description: "เวอร์ชันของ Schema สำหรับการ Migration ในอนาคต" },
  },
  {
    timestamps: true,
    collection: "achievements",
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

AchievementSchema.index({ category: 1, rarity: 1, isActive: 1, displayOrder: 1 }, { name: "AchievementQueryIndex" });
AchievementSchema.index({ tags: 1, isActive: 1 }, { sparse: true, name: "AchievementByTagsIndex" });
AchievementSchema.index({ availableFrom: 1, availableUntil: 1, isActive: 1 }, { sparse: true, name: "AchievementAvailabilityIndex" });
AchievementSchema.index({ "unlockConditions.eventName": 1, isActive: 1 }, { name: "AchievementByEventNameIndex" });


// ==================================================================================================
// SECTION: Validation and Middleware (Mongoose Hooks)
// ==================================================================================================

AchievementSchema.path("iconMediaId").validate(function(this: IAchievement, value: any) {
  if (this.customIconUrl && this.customIconUrl.trim() !== '') return true;
  if (!value && (!this.customIconUrl || this.customIconUrl.trim() === '')) return true;
  return true;
}, "ต้องระบุ iconMediaId หรือ customIconUrl หรือไม่ระบุทั้งคู่ (ไอคอนเป็นทางเลือก)");


AchievementSchema.path("customIconUrl").validate(function(this: IAchievement, value: any) {
  if (this.iconMediaId && value && value.trim() !== '') {
    return false;
  }
  return true;
}, "ไม่สามารถระบุ customIconUrl พร้อมกับ iconMediaId ได้");


AchievementSchema.path("maxRepeats").validate(function(this: IAchievement, value: number | undefined) {
  if (this.isRepeatable && (value === undefined || typeof value !== 'number' || value < 1)) {
    return false;
  }
  if (!this.isRepeatable && value !== undefined && value !== null) {
    return false;
  }
  return true;
}, "การตั้งค่า maxRepeats ไม่ถูกต้องตาม isRepeatable");


AchievementSchema.pre<IAchievement>("save", async function (next) {
  if (this.isModified("achievementCode") && this.achievementCode) {
    this.achievementCode = this.achievementCode.toUpperCase();
  }

  if ((this.isNew && this.displayOrder === 0) || (this.isModified("rarity") && !this.isModified("displayOrder"))) {
    switch (this.rarity) {
      case AchievementRarity.MYTHIC: this.displayOrder = 100; break;
      case AchievementRarity.LEGENDARY: this.displayOrder = 90; break;
      case AchievementRarity.EPIC: this.displayOrder = 80; break;
      case AchievementRarity.RARE: this.displayOrder = 70; break;
      case AchievementRarity.UNCOMMON: this.displayOrder = 60; break;
      default: this.displayOrder = 50; break;
    }
  }
  next();
});

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

const AchievementModel =
  (models.Achievement as mongoose.Model<IAchievement>) ||
  model<IAchievement>("Achievement", AchievementSchema);

export default AchievementModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Unlock Logic Service**: การปลดล็อก Achievement จริงของผู้ใช้ จะต้องมี Service Layer หรือ Event Listener ที่คอยตรวจสอบเงื่อนไขจาก `unlockConditions`.
// 2.  **Event Name Consistency**: (ปรับปรุงแล้ว) `eventName` ใน `unlockConditions` ถูกเปลี่ยนให้ใช้ `AchievementUnlockEvent` enum เพื่อให้มีความสอดคล้องและง่ายต่อการจัดการใน Gamification Service. Service จะต้อง map activity จาก `ActivityHistory` หรือ `ReadingAnalytic_EventStream` มาเป็น `AchievementUnlockEvent` ที่เหมาะสม.
// 3.  **Complex Condition Logic**: สำหรับ logic ที่ซับซ้อน (AND/OR หลายชั้น) `group` field เป็นจุดเริ่มต้น. Service layer จะต้อง handle การประเมินกลุ่มเงื่อนไข.
// 4.  **Reward Idempotency**: การมอบรางวัล (`rewards`) ควรออกแบบให้เป็น idempotent.
// 5.  **Localization (i18n)**: `title`, `description`, `unlockHint` ควรสนับสนุนหลายภาษา.
// 6.  **Performance**: การตรวจสอบเงื่อนไขจำนวนมากควรพิจารณา performance.
// 7.  **Admin UI**: ควรมี Admin UI ที่ใช้งานง่าย.
// 8.  **Clearer Operator Semantics**: (ปรับปรุงแล้ว) คำอธิบายของ `UnlockConditionOperator` ได้ถูกปรับปรุงให้ชัดเจนขึ้น. Service ที่ประมวลผลเงื่อนไขจะต้องตีความตามนี้.
// 9.  **`relatedTo` and `relatedToType`**: (ปรับปรุง) การเพิ่ม `relatedToType` ช่วยให้ Service Layer สามารถจัดการกับ `relatedTo` ได้อย่างถูกต้องมากขึ้น.
//     สำหรับ achievement "อ่านนิยายหมวดหมู่หลักครบตามรอบกำหนด":
//     - `eventName` จะเป็น `AchievementUnlockEvent.USER_READ_NOVEL_OF_GENRE_COUNT`.
//     - `operator` จะเป็น `UnlockConditionOperator.GREATER_THAN_OR_EQUAL_TO_COUNT`.
//     - `targetValue` จะเป็นจำนวนรอบที่กำหนด (เช่น 5).
//     - `relatedTo` จะเป็น ID ของ Category (Genre) ที่ต้องการตรวจสอบ.
//     - `relatedToType` จะเป็น `"Category"`.
//     - `description` เช่น "อ่านนิยายแนวแฟนตาซีครบ 5 เรื่อง".
// 10. **Gamification Service Responsibility**: Gamification Service จะเป็นตัวกลางในการ:
//     -   Listen to relevant events from `ActivityHistory` or `ReadingAnalytic_EventStream`.
//     -   Transform these events into `AchievementUnlockEvent` with necessary details.
//     -   Evaluate `unlockConditions` for active `Achievement` and `Badge` definitions.
//     -   When an achievement/badge is unlocked:
//         -   Create an entry in `UserAchievement.earnedItems`.
//         -   Update `UserAchievement.ongoingProgress` (remove completed, update others).
//         -   Update `User.gamification.experiencePoints`, `User.wallet.coins` based on `rewards`.
//         -   Link the `UserAchievement._id` (or `UserEarnedItem._id`) to `User.gamification.achievements` array.
//         -   Trigger a `Notification` (using `Notification.ts`).
// ==================================================================================================