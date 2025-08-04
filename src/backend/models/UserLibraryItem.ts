// src/backend/models/UserLibraryItem.ts
// โมเดลรายการในคลังของผู้ใช้ (UserLibraryItem Model)
// จัดการรายการนิยายที่ผู้ใช้ซื้อ, ติดตาม, บันทึกไว้, หรือกำลังอ่าน รวมถึงความคืบหน้าและสถานะต่างๆ

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IUser } from "./User"; // สำหรับ userId
import { INovel } from "./Novel"; // สำหรับ novelId
import { IEpisode } from "./Episode"; // สำหรับ lastReadEpisodeId และ purchasedEpisodeIds

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล UserLibraryItem
// ==================================================================================================

/**
 * @enum {string} LibraryItemType
 * @description ประเภทของรายการในคลังของผู้ใช้
 */
export enum LibraryItemType {
  NOVEL = "novel",
  AUDIOBOOK = "audiobook",
  SERIES_BUNDLE = "series_bundle",
}

/**
 * @enum {string} LibraryItemStatus
 * @description สถานะของรายการในคลังของผู้ใช้
 */
export enum LibraryItemStatus {
  OWNED = "owned",
  FOLLOWING = "following",
  WISHLISTED = "wishlisted",
  ARCHIVED = "archived",
  READING = "reading",
  FINISHED_READING = "finished_reading",
  DROPPED = "dropped",
  SAMPLED = "sampled",
}

/**
 * @interface IReadingProgress
 * @description ข้อมูลความคืบหน้าในการอ่าน
 */
export interface IReadingProgress {
  lastReadEpisodeId?: Types.ObjectId | IEpisode;
  lastReadChapterNumber?: number;
  lastReadSceneIndex?: number;
  overallProgressPercentage?: number;
  lastReadAt?: Date;
  customProgressMarker?: any;
  // เอา [x: string]: any; ออกถ้าไม่ได้ใช้งานจริงจัง เพราะทำให้ type safety ลดลง
}
const ReadingProgressSchema = new Schema<IReadingProgress>(
  {
    lastReadEpisodeId: { type: Schema.Types.ObjectId, ref: "Episode" },
    lastReadChapterNumber: { type: Number, min: 0 },
    lastReadSceneIndex: { type: Number, min: 0 },
    overallProgressPercentage: { type: Number, min: 0, max: 100 },
    lastReadAt: { type: Date, index: true },
    customProgressMarker: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร UserLibraryItem (IUserLibraryItem Document Interface)
// ==================================================================================================

/**
 * @interface IUserLibraryItem
 * @extends Document (Mongoose Document)
 */
export interface IUserLibraryItem extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId | IUser;
  itemType: LibraryItemType;
  novelId?: Types.ObjectId | INovel; // << แก้ไข: ทำให้เป็น optional เพราะอาจไม่ใช่ NOVEL เสมอไป (สอดคล้องกับ required function)
  statuses: LibraryItemStatus[]; // << แก้ไข: ใช้ Array<LibraryItemStatus> ธรรมดา
  addedAt: Date;
  firstAcquiredAt?: Date;
  purchasedEpisodeIds?: Types.ObjectId[] | IEpisode[];
  readingProgress: IReadingProgress;
  userRating?: number;
  userTags?: string[];
  userNotes?: string;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Interface สำหรับ Static method
export interface IUserLibraryItemModel extends mongoose.Model<IUserLibraryItem> {
    addItemToLibrary(
        userId: Types.ObjectId,
        novelId: Types.ObjectId | null, // << แก้ไข: novelId สามารถเป็น null ได้ถ้า itemType ไม่ใช่ NOVEL
        initialStatuses: LibraryItemStatus[],
        itemType?: LibraryItemType
    ): Promise<IUserLibraryItem>;

    updateReadingProgress(
        userId: Types.ObjectId,
        novelId: Types.ObjectId, // การอัปเดต progress มักจะผูกกับ novel
        progress: Partial<IReadingProgress>
    ): Promise<IUserLibraryItem | null>;
}


// ==================================================================================================
// SECTION: Schema หลักสำหรับ UserLibraryItem (UserLibraryItemSchema)
// ==================================================================================================
const UserLibraryItemSchema = new Schema<IUserLibraryItem, IUserLibraryItemModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุ ID ของผู้ใช้ (User ID is required)"],
      index: true,
    },
    itemType: {
      type: String,
      enum: Object.values(LibraryItemType),
      required: [true, "กรุณาระบุประเภทของรายการ (Item type is required)"],
      default: LibraryItemType.NOVEL,
    },
    novelId: {
      type: Schema.Types.ObjectId,
      ref: "Novel",
      // required function จะตรวจสอบว่า novelId จำเป็นหรือไม่ตาม itemType
      required: function(this: IUserLibraryItem): boolean {
        return this.itemType === LibraryItemType.NOVEL;
      },
      default: null, // << เพิ่ม: default เป็น null ถ้าไม่ใช่ NOVEL หรือยังไม่ได้กำหนด
      index: true
    },
    statuses: [{ // Schema สำหรับ array ของ string enum
      type: String,
      enum: Object.values(LibraryItemStatus),
    }],
    addedAt: {
      type: Date,
      default: Date.now,
      required: [true, "กรุณาระบุวันที่เพิ่มรายการ (Added date is required)"],
    },
    firstAcquiredAt: { type: Date },
    purchasedEpisodeIds: [{ type: Schema.Types.ObjectId, ref: "Episode" }],
    readingProgress: {
      type: ReadingProgressSchema,
      default: () => ({}),
    },
    userRating: {
      type: Number,
      min: [1, "คะแนนต้องอยู่ระหว่าง 1 ถึง 5"],
      max: [5, "คะแนนต้องอยู่ระหว่าง 1 ถึง 5"]
    },
    userTags: [{
      type: String,
      trim: true,
      maxlength: [50, "แท็กส่วนตัวยาวเกินไป"]
    }],
    userNotes: {
      type: String,
      trim: true,
      maxlength: [5000, "บันทึกส่วนตัวยาวเกินไป"]
    },
    isHidden: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    collection: "userlibraryitems"
  }
);

// ==================================================================================================
// SECTION: Virtuals (ฟิลด์เสมือน)
// ==================================================================================================

UserLibraryItemSchema.virtual("isOwned").get(function (this: IUserLibraryItem): boolean {
  return this.statuses.includes(LibraryItemStatus.OWNED);
});

UserLibraryItemSchema.virtual("isReading").get(function (this: IUserLibraryItem): boolean {
  return this.statuses.includes(LibraryItemStatus.READING);
});

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

// Unique index เพื่อป้องกันการมีรายการซ้ำสำหรับ content เดียวกันของผู้ใช้คนเดียว โดยพิจารณา itemType
UserLibraryItemSchema.index(
  { userId: 1, novelId: 1, itemType: 1 },
  {
    unique: true,
    // partialFilterExpression ทำให้ unique index นี้ทำงานเฉพาะเมื่อ novelId มีค่า (เช่น สำหรับ itemType: NOVEL)
    // และสำหรับ itemType อื่นๆ ที่ novelId อาจเป็น null จะไม่ถูกบังคับ unique บน novelId ที่เป็น null
    // แต่จะ unique บน userId และ itemType ร่วมกับ novelId (ถ้ามี)
    // หาก itemType อื่นๆ มี identifier field ของตัวเอง (เช่น audioBookId) ควรสร้าง unique index แยก
    partialFilterExpression: { novelId: { $exists: true } }, // ให้ unique เมื่อ novelId มีค่า
    name: "UserLibraryNovelUniqueIndex"
  }
);
// Index สำหรับกรณีที่ novelId เป็น null (เช่น itemType อื่นๆ ที่ไม่ได้ใช้ novelId)
// เพื่อให้ unique บน userId และ itemType
UserLibraryItemSchema.index(
    { userId: 1, itemType: 1, novelId: 1 }, // novelId: 1 เพื่อให้ MongoDB พิจารณา field นี้ (แม้จะเป็น null)
    {
      unique: true,
      partialFilterExpression: { novelId: null }, // ให้ unique เมื่อ novelId เป็น null
      name: "UserLibraryOtherItemTypeUniqueIndex"
    }
  );


UserLibraryItemSchema.index({ userId: 1, statuses: 1 }, { name: "UserLibraryStatusIndex" });
UserLibraryItemSchema.index({ userId: 1, "readingProgress.lastReadAt": -1 }, { name: "UserLastReadAtIndex" });
UserLibraryItemSchema.index({ userId: 1, addedAt: -1 }, { name: "UserAddedAtIndex" });

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

UserLibraryItemSchema.pre<IUserLibraryItem>("save", function (next) {
  if (this.itemType === LibraryItemType.NOVEL && !this.novelId) {
    return next(new Error("Novel ID is required when itemType is 'novel'."));
  }

  if (!this.statuses || this.statuses.length === 0) {
    // Default status สามารถกำหนดได้ที่นี่ ถ้าจำเป็น
    // เช่น this.statuses = [LibraryItemStatus.FOLLOWING];
    // หรือปล่อยให้ application layer จัดการการใส่ status เริ่มต้น
  }

  if (this.isModified("statuses") && this.statuses.includes(LibraryItemStatus.OWNED) && !this.firstAcquiredAt) {
    this.firstAcquiredAt = new Date();
  }

  next();
});

// ==================================================================================================
// SECTION: Static Methods (สำหรับจัดการ UserLibraryItem Logic)
// ==================================================================================================

UserLibraryItemSchema.statics.addItemToLibrary = async function (
  this: IUserLibraryItemModel,
  userId: Types.ObjectId,
  novelId: Types.ObjectId | null, // << แก้ไข: novelId สามารถเป็น null
  initialStatuses: LibraryItemStatus[],
  itemType: LibraryItemType = LibraryItemType.NOVEL
): Promise<IUserLibraryItem> {

  if (itemType === LibraryItemType.NOVEL && !novelId) {
    throw new Error("Novel ID is required when itemType is 'novel'.");
  }
  // สำหรับ itemType อื่นๆ novelId อาจจะเป็น null
  // สร้าง query object แบบ dynamic
  const query: any = { userId, itemType };
  if (novelId) { // เพิ่ม novelId เข้า query ถ้ามีค่า
    query.novelId = novelId;
  } else if (itemType === LibraryItemType.NOVEL) {
    // Double check: ถ้า itemType เป็น NOVEL แต่ novelId เป็น null (ไม่ควรเกิดขึ้นถ้า logic ด้านบนทำงาน)
    throw new Error("Novel ID is required for itemType 'novel' but was not provided or is null.");
  }


  let libraryItem = await this.findOne(query);

  if (libraryItem) { // ตรวจสอบ libraryItem ไม่ใช่ null
    initialStatuses.forEach(status => {
      if (!libraryItem!.statuses.includes(status)) { // ใช้ non-null assertion operator (!) เพราะเพิ่งตรวจสอบ if (libraryItem)
        libraryItem!.statuses.push(status);
      }
    });
  } else {
    libraryItem = new this({
      userId,
      novelId: novelId, // novelId อาจเป็น null สำหรับ itemType อื่นๆ
      itemType,
      statuses: initialStatuses, // initialStatuses เป็น LibraryItemStatus[] ซึ่งเข้ากันได้กับ schema
      addedAt: new Date(),
      readingProgress: {},
    });
  }
  return libraryItem.save();
};

UserLibraryItemSchema.statics.updateReadingProgress = async function (
  this: IUserLibraryItemModel,
  userId: Types.ObjectId,
  novelId: Types.ObjectId,
  progress: Partial<IReadingProgress>
): Promise<IUserLibraryItem | null> {
  const libraryItem = await this.findOne({ userId, novelId, itemType: LibraryItemType.NOVEL }); // Progress มักจะผูกกับ Novel
  if (!libraryItem) {
    console.warn(`[UserLibraryItem Statics] Attempted to update progress for non-existent library item: User ${userId}, Novel ${novelId}`);
    return null;
  }

  // Spread operator กับ subdocument ของ Mongoose อาจต้องระวัง
  // วิธีที่ปลอดภัยคือ assign property โดยตรง หรือใช้ .set()
  Object.keys(progress).forEach(key => {
    (libraryItem.readingProgress as any)[key] = (progress as any)[key];
  });
  libraryItem.readingProgress.lastReadAt = new Date();

  const currentStatuses = libraryItem.statuses; // currentStatuses เป็น LibraryItemStatus[]
  if (!currentStatuses.includes(LibraryItemStatus.READING)) {
    currentStatuses.push(LibraryItemStatus.READING);
  }

  // .filter บน array ธรรมดาจะคืน array ธรรมดา
  const newStatuses = currentStatuses.filter(
    (s: LibraryItemStatus): s is LibraryItemStatus => s !== LibraryItemStatus.FINISHED_READING && s !== LibraryItemStatus.DROPPED
  );
  libraryItem.statuses = newStatuses; // Assign array ธรรมดากลับไป, Mongoose จะ handle

  return libraryItem.save();
};

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

const UserLibraryItemModel = (models.UserLibraryItem as IUserLibraryItemModel) || model<IUserLibraryItem, IUserLibraryItemModel>("UserLibraryItem", UserLibraryItemSchema);

export default UserLibraryItemModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Consistency with Purchase/Follow**: การสร้าง/อัปเดต UserLibraryItem ควรถูก trigger โดยอัตโนมัติ
//     เมื่อมีการซื้อ (Purchase model), การติดตาม (Follow model), หรือการอ่านเกิดขึ้น
//     เพื่อให้ข้อมูลในคลังของผู้ใช้ถูกต้องและเป็นปัจจุบันเสมอ.
// 2.  **Denormalization**: พิจารณา denormalize ข้อมูลบางอย่างจาก Novel model (เช่น title, coverImage)
//     เข้ามาใน UserLibraryItem เพื่อลดการ join และเพิ่มประสิทธิภาพในการ query "คลังของฉัน"
//     แต่ต้องระวังเรื่อง data consistency.
// 3.  **Batch Operations**: สำหรับการอัปเดตหลายรายการ (เช่น archive หลายรายการพร้อมกัน)
//     ควรมี static methods ที่รองรับ batch operations เพื่อลด overhead.
// 4.  **Synchronization**: ถ้าผู้ใช้อ่านบนหลายอุปกรณ์, ระบบ reading progress synchronization จะสำคัญมาก.
//     `customProgressMarker` อาจใช้เก็บข้อมูลเฉพาะของอุปกรณ์ได้.
// 5.  **Recommendations**: ข้อมูลใน UserLibraryItem (เช่น รายการที่อ่านจบ, รายการที่ชอบ)
//     สามารถนำไปใช้ในการสร้างระบบแนะนำนิยายส่วนบุคคลได้.
// 6.  **Data Archival/Cleanup**: สำหรับผู้ใช้ที่มีรายการในคลังจำนวนมาก หรือข้อมูลเก่า
//     อาจต้องมีนโยบายการจัดการข้อมูล (เช่น archive รายการที่ไม่ได้อ่านนานแล้ว).
// 7.  **User-Defined Collections/Shelves**: ในอนาคต อาจเพิ่มความสามารถให้ผู้ใช้สร้าง "ชั้นหนังสือ" หรือ "คอลเลกชันส่วนตัว"
//     ซึ่ง UserLibraryItem สามารถอ้างอิงไปยัง Collection เหล่านั้นได้.
// ==================================================================================================