// src/backend/models/Follow.ts
// โมเดลการติดตาม (Follow Model)
// จัดการความสัมพันธ์การติดตามระหว่างผู้ใช้กับผู้ใช้อื่น (นักเขียน), ผู้ใช้กับนิยาย, และอาจรวมถึงการติดตามอื่นๆ ในอนาคต

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import { IUser } from "./User"; // สำหรับ followerId และ followingId (ถ้า followingType === "User")
import { INovel } from "./Novel"; // สำหรับ followingId (ถ้า followingType === "Novel")

// ==================================================================================================
// SECTION: Enums และ Types ที่ใช้ในโมเดล Follow
// ==================================================================================================

/**
 * @enum {string} FollowingType
 * @description ประเภทของสิ่งที่สามารถถูกติดตามได้
 * - `USER`: ผู้ใช้อื่น (เช่น นักเขียน, ผู้ใช้ทั่วไป)
 * - `NOVEL`: นิยายเรื่องใดเรื่องหนึ่ง
 * - `SERIES`: (อนาคต) ชุดนิยายหรือจักรวาลนิยาย
 * - `TAG`: (อนาคต) แท็กหรือหมวดหมู่ที่ผู้ใช้สนใจ
 * - `LIST`: (อนาคต) รายการนิยายที่ผู้ใช้อื่นสร้าง (เช่น Reading List)
 */
export enum FollowingType {
  USER = "User",
  NOVEL = "Novel",
  SERIES = "Series",
  TAG = "Tag",
  LIST = "List",
}

/**
 * @enum {string} FollowStatus
 * @description สถานะของการติดตาม (ถ้าต้องการสถานะที่ซับซ้อนกว่าแค่ active/inactive)
 * - `ACTIVE`: กำลังติดตาม
 * - `MUTED`: ติดตามแต่ปิดการแจ้งเตือน (ถ้ามีระบบ notification preferences)
 * - `BLOCKED`: (กรณี User-User) ผู้ติดตามถูกบล็อกโดยผู้ถูกติดตาม (หรือกลับกัน) - อาจจะแยกเป็น Block model
 */
export enum FollowStatus {
  ACTIVE = "active",
  MUTED = "muted",
  // BLOCKED = "blocked", // พิจารณาใช้ Block model แยกสำหรับการบล็อกระหว่างผู้ใช้
}

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสาร Follow (IFollow Document Interface)
// ==================================================================================================

/**
 * @interface IFollow
 * @extends Document (Mongoose Document)
 * @description อินเทอร์เฟซหลักสำหรับเอกสารการติดตามใน Collection "follows"
 * @property {Types.ObjectId} _id - รหัส ObjectId ของเอกสาร
 * @property {Types.ObjectId | IUser} followerId - ID ของผู้ใช้ที่กดติดตาม (**จำเป็น**, อ้างอิง User model)
 * @property {Types.ObjectId | IUser | INovel} followingId - ID ของสิ่งที่ถูกติดตาม (User, Novel, etc., **จำเป็น**)
 * @property {FollowingType} followingType - ประเภทของสิ่งที่ถูกติดตาม (**จำเป็น**)
 * @property {FollowStatus} status - สถานะการติดตาม (default: `ACTIVE`)
 * @property {Date} followedAt - วันที่กดติดตาม (หรือ re-follow ล่าสุด)
 * @property {boolean} receiveNotifications - ผู้ติดตามต้องการรับการแจ้งเตือนจากสิ่งที่ติดตามนี้หรือไม่ (default: true)
 * @property {string} [notes] - (Optional) บันทึกส่วนตัวเกี่ยวกับการติดตามนี้ (ผู้ติดตามเท่านั้นที่เห็น)
 * @property {boolean} isDeleted - สถานะการลบ (soft delete), true หมายถึง unfollowed
 * @property {Date} [deletedAt] - วันที่ทำการ soft delete (unfollow)
 * @property {Types.ObjectId | IUser} [deletedBy] - (Optional) ID ของผู้ใช้ที่สั่ง soft delete (ปกติคือ followerId เอง)
 * @property {Date} createdAt - วันที่สร้างเอกสาร (Mongoose `timestamps`)
 * @property {Date} updatedAt - วันที่อัปเดตเอกสารล่าสุด (Mongoose `timestamps`)
 */
export interface IFollow extends Document {
  _id: Types.ObjectId;
  followerId: Types.ObjectId | IUser;
  followingId: Types.ObjectId | IUser | INovel; // หรือ type อื่นๆ ตาม FollowingType
  followingType: FollowingType;
  status: FollowStatus;
  followedAt: Date;
  receiveNotifications: boolean;
  notes?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;
  // Virtual field for dynamic population
  following?: IUser | INovel | any;
}

// ==================================================================================================
// SECTION: Schema หลักสำหรับ Follow (FollowSchema)
// ==================================================================================================
const FollowSchema = new Schema<IFollow>(
  {
    followerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "กรุณาระบุ ID ของผู้ติดตาม (Follower ID is required)"],
      index: true,
    },
    followingId: {
      type: Schema.Types.ObjectId,
      // `ref` จะถูกกำหนดแบบไดนามิกโดย virtual populate
      required: [true, "กรุณาระบุ ID ของสิ่งที่ถูกติดตาม (Following ID is required)"],
      index: true,
    },
    followingType: {
      type: String,
      enum: Object.values(FollowingType),
      required: [true, "กรุณาระบุประเภทของสิ่งที่ถูกติดตาม (Following type is required)"],
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(FollowStatus),
      default: FollowStatus.ACTIVE,
      required: true,
    },
    followedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    receiveNotifications: { type: Boolean, default: true },
    notes: { type: String, trim: true, maxlength: [1000, "บันทึกส่วนตัวยาวเกินไป (สูงสุด 1000 ตัวอักษร)"] },
    // Fields สำหรับ Soft Delete (Unfollow)
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: { type: Date, index: true, sparse: true },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", sparse: true },
  },
  {
    timestamps: true, // เพิ่ม createdAt และ updatedAt โดยอัตโนมัติ
    toObject: { virtuals: true }, // ให้ virtual fields แสดงใน toObject()
    toJSON: { virtuals: true }, // ให้ virtual fields แสดงใน toJSON()
    collection: "follows", // ชื่อ collection ใน MongoDB
  }
);

// Add the partial unique index for active follows.
// This ensures a user cannot follow the same entity more than once while the follow is active.
FollowSchema.index(
    { followerId: 1, followingId: 1, followingType: 1 },
    {
        unique: true,
        partialFilterExpression: { isDeleted: false },
        name: "unique_active_follow_constraint"
    }
);

// Virtual for populating the 'following' field dynamically based on 'followingType'
FollowSchema.virtual("following", {
  ref: function (this: IFollow) {
    // ตรวจสอบว่า followingType เป็นค่าที่ Mongoose รู้จัก (มี model register ไว้)
    if (Object.values(FollowingType).includes(this.followingType) && models[this.followingType]) {
      return this.followingType;
    }
    console.warn(`[FollowSchema] Unknown or unregistered model for followingType: ${this.followingType}`);
    return undefined; // ป้องกัน error ถ้า model ไม่มี
  },
  localField: "followingId",
  foreignField: "_id",
  justOne: true, // เพราะ followingId อ้างอิงเอกสารเดียว
});

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================

// Index สำหรับ query การติดตามทั้งหมดของผู้ใช้คนหนึ่ง (ที่ยัง active อยู่)
FollowSchema.index(
  { followerId: 1, followingType: 1, status: 1, followedAt: -1 },
  {
    name: "UserActiveFollowsQueryIndex",
    partialFilterExpression: { isDeleted: false },
  }
);

// Index สำหรับ query ผู้ติดตามทั้งหมดของ entity หนึ่งๆ (ที่ยัง active อยู่)
FollowSchema.index(
  { followingId: 1, followingType: 1, status: 1, followedAt: -1 },
  {
    name: "EntityActiveFollowersQueryIndex",
    partialFilterExpression: { isDeleted: false },
  }
);

// Index สำหรับ query การติดตามที่ถูก soft delete (เผื่อต้องการ restore หรือตรวจสอบ)
FollowSchema.index(
  { deletedAt: -1 },
  {
    name: "SoftDeletedFollowsIndex",
    partialFilterExpression: { isDeleted: true },
  }
);

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================

/**
 * Provides context for updating follow counts based on the type of entity being followed.
 * This makes the logic scalable for future followable entity types.
 * @param type - The type of the entity being followed.
 * @returns An object with the model to update and the correct field names for stats.
 */
const getUpdateContext = (type: FollowingType) => {
    switch (type) {
        case FollowingType.USER:
            return {
                FollowingModel: models.User,
                // Field in follower's stats to increment/decrement
                followerField: "socialStats.followingUsersCount",
                // Field in the followed user's stats to increment/decrement
                followingField: "socialStats.followersCount",
            };
        case FollowingType.NOVEL:
            return {
                FollowingModel: models.Novel,
                 // Field in follower's stats to increment/decrement
                followerField: "socialStats.followingNovelsCount",
                 // Field in the followed novel's stats to increment/decrement
                followingField: "followersCount",
            };
        // Future entity types like 'Series', 'Tag', or 'List' can be added here.
        default:
            console.warn(`Follow count update skipped: Unhandled followingType "${type}"`);
            return null;
    }
};

/**
 * Atomically updates the follow-related counters on both the follower and the followed documents
 * using a MongoDB transaction to ensure data consistency.
 * @param doc - The follow document instance.
 * @param operation - Whether to 'increment' or 'decrement' the counters.
 */
async function updateFollowCounts(doc: IFollow, operation: "increment" | "decrement") {
  const value = operation === "increment" ? 1 : -1;
  const context = getUpdateContext(doc.followingType);

  if (!context) return;
  
  const { FollowingModel, followerField, followingField } = context;

  // Transactions require a replica set environment in production.
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      // Update the follower's stats (e.g., increment their 'followingUsersCount')
      const followerUpdate = models.User.findByIdAndUpdate(
          doc.followerId,
          { $inc: { [followerField]: value } },
          { session, new: true, runValidators: true }
      );

      // Update the followed entity's stats (e.g., increment their 'followersCount')
      const followingUpdate = FollowingModel.findByIdAndUpdate(
          doc.followingId,
          { $inc: { [followingField]: value } },
          { session, new: true, runValidators: true }
      );
      
      // Await both promises to complete within the transaction
      await Promise.all([followerUpdate, followingUpdate]);
    });
    console.log(`Transaction for follow count update committed successfully.`);
  } catch (error) {
    console.error("Transaction for follow count update failed and was aborted:", error);
    // Re-throw the error to allow the calling function to handle the failure,
    // which is crucial for preventing inconsistent data.
    throw new Error(`Failed to update follow counts due to: ${error instanceof Error ? error.message : error}`);
  } finally {
    await session.endSession();
  }
}

// Middleware: หลังจากการบันทึก (save) - สร้าง follow ใหม่ หรืออัปเดต (รวม soft delete/re-follow)
FollowSchema.post<IFollow>("save", async function (doc: IFollow & mongoose.Document, next) {
  // ตรวจสอบสถานะก่อนและหลังการบันทึกเพื่อตัดสินใจ increment/decrement follow counts
  // ใช้ doc.isNew และ doc.isModified() แทนการเข้าถึง internal state ($__.priorDoc)

  // กรณีสร้าง follow ใหม่
  if (doc.isNew) {
    // สร้าง follow ใหม่ และ active (isDeleted: false, status: ACTIVE)
    if (!doc.isDeleted && doc.status === FollowStatus.ACTIVE) {
      try {
        await updateFollowCounts(doc, "increment");
      } catch(error) {
        // If the transaction fails, we should log it.
        // In a production environment, this might trigger an alert or a retry job.
        console.error("Critical: Failed to update follow counts after creating a new follow document.", {
          followId: doc._id,
          error,
        });
      }
    }
  } else {
    // กรณีอัปเดต follow ที่มีอยู่
    // ตรวจสอบการเปลี่ยนแปลงของ isDeleted หรือ status เพื่อตัดสินใจ
    if (doc.isModified("isDeleted") || doc.isModified("status")) {
      const isActiveAndNotDeleted = !doc.isDeleted && doc.status === FollowStatus.ACTIVE;
      const wasActiveAndNotDeleted = doc.isModified("isDeleted")
        ? !doc.isDeleted // ถ้า isDeleted เปลี่ยนจาก true -> false ถือว่า active
        : doc.status === FollowStatus.ACTIVE; // ถ้า status เปลี่ยน ใช้ status เดิม

      if (wasActiveAndNotDeleted && !isActiveAndNotDeleted) {
        // เปลี่ยนจาก active -> inactive/deleted (unfollow)
        try {
          await updateFollowCounts(doc, "decrement");
        } catch (error) {
          console.error("Critical: Failed to update follow counts while soft-deleting a follow document.", {
            followId: doc._id,
            error,
          });
        }
      } else if (!wasActiveAndNotDeleted && isActiveAndNotDeleted) {
        // เปลี่ยนจาก inactive/deleted -> active (re-follow)
        try {
          await updateFollowCounts(doc, "increment");
        } catch (error) {
          console.error("Critical: Failed to update follow counts while re-following a follow document.", {
            followId: doc._id,
            error,
          });
        }
      }
    }
  }
  next();
});

// Middleware: หลังจากการลบ (findOneAndDelete) - hard delete
// ควรใช้ soft delete เป็นหลัก, hook นี้สำหรับกรณีจำเป็นจริงๆ เช่น การลบข้อมูลถาวรตามนโยบาย
FollowSchema.post<mongoose.ModifyResult<IFollow>>("findOneAndDelete", async function (doc, next) {
  // ตรวจสอบว่า doc ไม่เป็น null และมีค่า (Mongoose อาจส่ง doc เป็น null ถ้าไม่พบเอกสาร)
  if (doc && doc.value) {
    const deletedDoc = doc.value as IFollow;
    // อัปเดต follow counts เฉพาะเมื่อเอกสารที่ถูกลบเป็น active follow
    if (!deletedDoc.isDeleted && deletedDoc.status === FollowStatus.ACTIVE) {
      try {
        await updateFollowCounts(deletedDoc, "decrement");
      } catch (error) {
        console.error("Critical: Failed to update follow counts while soft-deleting a follow document.", {
          followId: deletedDoc._id,
          error,
        });
      }
    }
  } else {
    console.warn("[Follow findOneAndDelete Hook] No document found in ModifyResult or doc is null.");
  }
  next();
});

// ==================================================================================================
// SECTION: Static Methods (สำหรับจัดการ Follow Logic)
// ==================================================================================================

/**
 * @static follow
 * @description สร้างหรือ re-activate การติดตาม
 * @param {Types.ObjectId} followerId - ID ของผู้ติดตาม
 * @param {Types.ObjectId} followingId - ID ของสิ่งที่ถูกติดตาม
 * @param {FollowingType} followingType - ประเภทของสิ่งที่ถูกติดตาม
 * @returns {Promise<IFollow>} เอกสาร Follow ที่สร้างหรืออัปเดต
 */
FollowSchema.statics.follow = async function (
  followerId: Types.ObjectId,
  followingId: Types.ObjectId,
  followingType: FollowingType
): Promise<IFollow> {
  const follow = await this.findOne({ followerId, followingId, followingType });
  if (follow) {
    if (follow.isDeleted || follow.status !== FollowStatus.ACTIVE) {
      follow.isDeleted = false;
      follow.deletedAt = undefined;
      follow.deletedBy = undefined;
      follow.status = FollowStatus.ACTIVE;
      follow.followedAt = new Date();
      follow.receiveNotifications = true; // Reset to default
      return follow.save();
    }
    return follow; // Already actively following
  } else {
    return this.create({ followerId, followingId, followingType });
  }
};

/**
 * @static unfollow
 * @description ยกเลิกการติดตาม (soft delete)
 * @param {Types.ObjectId} followerId - ID ของผู้ติดตาม
 * @param {Types.ObjectId} followingId - ID ของสิ่งที่ถูกติดตาม
 * @param {FollowingType} followingType - ประเภทของสิ่งที่ถูกติดตาม
 * @returns {Promise<IFollow | null>} เอกสาร Follow ที่ถูก soft delete หรือ null ถ้าไม่พบ
 */
FollowSchema.statics.unfollow = async function (
  followerId: Types.ObjectId,
  followingId: Types.ObjectId,
  followingType: FollowingType
): Promise<IFollow | null> {
  const follow = await this.findOne({ followerId, followingId, followingType, isDeleted: false });
  if (follow) {
    follow.isDeleted = true;
    // deletedAt และ deletedBy จะถูกตั้งใน pre-save hook
    return follow.save();
  }
  return null; // ไม่พบหรือ unfollowed ไปแล้ว
};

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================

// ตรวจสอบว่า Model "Follow" ถูกสร้างไปแล้วหรือยัง ถ้ายัง ให้สร้าง Model ใหม่
const FollowModel = (models.Follow as mongoose.Model<IFollow>) || model<IFollow>("Follow", FollowSchema);

export default FollowModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Partial Unique Index**: ควรสร้างใน MongoDB shell:
//     `db.follows.createIndex({ followerId: 1, followingId: 1, followingType: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } })`
//     เพื่อป้องกันการติดตามซ้ำซ้อนเฉพาะ active follows อย่างมีประสิทธิภาพ
// 2.  **MongoDB Transactions**: การอัปเดต counts ใน User/Novel models และการ save Follow document
//     ควรอยู่ใน transaction เพื่อความสอดคล้องของข้อมูล (ถ้า MongoDB รองรับ replica set)
// 3.  **Scalability**: การอัปเดต counts แบบ real-time อาจเป็น bottleneck ในระบบขนาดใหญ่
//     พิจารณาใช้ background jobs หรือ message queues (เช่น RabbitMQ, Kafka) เพื่อ aggregate counts
//     ตามข้อเสนอใน optimize_Follow_system.txt
// 4.  **Notification Preferences**: `receiveNotifications` เป็นจุดเริ่มต้นที่ดี
//     อาจขยายเป็น sub-document หรือ model แยกสำหรับการตั้งค่า notification ที่ละเอียดขึ้น
// 5.  **Blocking System**: การบล็อกระหว่างผู้ใช้ควรใช้ Block model แยก
//     และเมื่อมีการบล็อก Follows ที่เกี่ยวข้องอาจต้องถูก soft delete หรือเปลี่ยน status
// 6.  **Feed Generation**: การ query Follows เป็นพื้นฐานสำหรับ activity feeds
//     ควร optimize indexes และพิจารณา fan-out-on-write หรือ fan-out-on-read
// 7.  **Error Handling**: เพิ่ม logging library (เช่น Winston) และ alerting สำหรับ error ใน middleware
// 8.  **Testing**: ควรมี unit tests และ integration tests สำหรับ middleware และ static methods
// 9.  **Index Optimization**: ตรวจสอบประสิทธิภาพของ indexes ด้วย `explain()` ใน MongoDB
//     และปรับ partialFilterExpression ถ้าจำเป็น
// ==================================================================================================