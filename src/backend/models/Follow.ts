// src/models/Follow.ts
// โมเดลการติดตาม (Follow Model) - จัดการความสัมพันธ์การติดตามระหว่างผู้ใช้กับเอนทิตีต่างๆ
// เช่น ผู้ใช้ติดตามผู้ใช้อื่น, ผู้ใช้ติดตามนิยาย, หรือผู้ใช้ติดตามตัวละคร (ในอนาคต)
// ออกแบบให้มีความยืดหยุ่นในการรองรับการติดตามเอนทิตีประเภทต่างๆ ผ่าน "polymorphic association"

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import UserModel from "./User"; // สำหรับอ้างอิง User model ใน middleware
import NovelModel from "./Novel"; // สำหรับอ้างอิง Novel model ใน middleware
// import CharacterModel from "./Character"; // หากต้องการรองรับการติดตามตัวละครในอนาคต

// ประเภทของเอนทิตีที่สามารถถูกติดตามได้
export type FollowableEntityType = "User" | "Novel" | "Character" | "Category" | "Series"; // เพิ่มเติมได้ตามต้องการ

// อินเทอร์เฟซหลักสำหรับเอกสารการติดตาม (Follow Document)
export interface IFollow extends Document {
  _id: Types.ObjectId;
  follower: Types.ObjectId; // ผู้ใช้ที่ทำการติดตาม (อ้างอิง User model)
  
  followingId: Types.ObjectId; // ID ของเอนทิตีที่ถูกติดตาม (User ID, Novel ID, etc.)
  followingType: FollowableEntityType; // ประเภทของเอนทิตีที่ถูกติดตาม (เช่น "User", "Novel")
  
  // การตั้งค่าการแจ้งเตือนสำหรับการติดตามนี้ (ถ้ามี)
  // notificationSettings?: {
  //   newContent?: boolean; // แจ้งเตือนเมื่อมีเนื้อหาใหม่ (เช่น ตอนใหม่ของนิยาย)
  //   updates?: boolean;    // แจ้งเตือนเมื่อมีการอัปเดตอื่นๆ
  // };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const FollowSchema = new Schema<IFollow>(
  {
    follower: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "ต้องระบุผู้ติดตาม (Follower is required)"],
      index: true,
    },
    followingId: {
      type: Schema.Types.ObjectId,
      required: [true, "ต้องระบุ ID ของสิ่งที่ถูกติดตาม (Following ID is required)"],
      index: true,
    },
    followingType: {
      type: String,
      required: [true, "ต้องระบุประเภทของสิ่งที่ถูกติดตาม (Following type is required)"],
      enum: ["User", "Novel", "Character", "Category", "Series"], // ค่าที่เป็นไปได้สำหรับประเภทเอนทิตี
      index: true,
    },
    // notificationSettings: {
    //   newContent: { type: Boolean, default: true },
    //   updates: { type: Boolean, default: true },
    // },
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----- Indexes -----
// Index ร่วมเพื่อให้แน่ใจว่าการติดตามหนึ่งๆ (follower -> followingId + followingType) เกิดขึ้นเพียงครั้งเดียว
FollowSchema.index({ follower: 1, followingId: 1, followingType: 1 }, { unique: true });

// Index สำหรับการค้นหาว่าใครติดตาม User/Novel/etc. คน/เรื่อง/สิ่งใดบ้าง
FollowSchema.index({ followingId: 1, followingType: 1 });

// Index สำหรับการค้นหาว่า User คนหนึ่งติดตามใคร/อะไรบ้าง
// (index ที่ follower: 1 มีอยู่แล้ว)

// ----- Virtuals (ถ้าจำเป็น) -----
// Virtual field เพื่อ populate ข้อมูลของเอนทิตีที่ถูกติดตาม (ถ้าต้องการ)
// FollowSchema.virtual("followedEntity", {
//   ref: (doc: IFollow) => doc.followingType, // อ้างอิงไปยัง Model ตามค่าของ followingType
//   localField: "followingId",
//   foreignField: "_id",
//   justOne: true,
// });

// ----- Middleware -----
// Middleware เพื่ออัปเดตจำนวนผู้ติดตาม (followersCount) และจำนวนที่กำลังติดตาม (followingCount)
// ในโมเดล User และ Novel (หรือโมเดลอื่นๆ ที่เกี่ยวข้อง)

async function updateCounts(doc: IFollow, operation: "increment" | "decrement") {
  const value = operation === "increment" ? 1 : -1;
  const UserModelInstance = UserModel();
  const NovelModelInstance = NovelModel();
  // const CharacterModelInstance = CharacterModel(); // หากมีการติดตามตัวละคร

  try {
    // อัปเดตจำนวน "ที่กำลังติดตาม" (followingCount) ของผู้ใช้ที่เป็น follower
    await UserModelInstance.findByIdAndUpdate(doc.follower, { $inc: { "statistics.followingCount": value } });

    // อัปเดตจำนวน "ผู้ติดตาม" (followersCount) ของเอนทิตีที่ถูกติดตาม
    switch (doc.followingType) {
      case "User":
        await UserModelInstance.findByIdAndUpdate(doc.followingId, { $inc: { "statistics.followersCount": value } });
        break;
      case "Novel":
        await NovelModelInstance.findByIdAndUpdate(doc.followingId, { $inc: { "statistics.followersCount": value } });
        break;
      // case "Character":
      //   await CharacterModelInstance.findByIdAndUpdate(doc.followingId, { $inc: { followersCount: value } });
      //   break;
      // เพิ่ม case อื่นๆ ตาม FollowableEntityType ที่มี
      default:
        console.warn(`Follow type "${doc.followingType}" not handled for count updates.`);
    }
  } catch (error) {
    console.error(`Error updating follow counts for follower ${doc.follower} and following ${doc.followingId} (${doc.followingType}):`, error);
    // ควรมี error handling ที่ดีกว่านี้ เช่น retry mechanism หรือ logging ไปยังระบบ monitoring
  }
}

// หลังจาก save (สร้างการติดตามใหม่)
FollowSchema.post<IFollow>("save", async function (doc) {
  // `this` is the document that was saved
  if (this.isNew) { // ตรวจสอบว่าเป็น document ใหม่จริงๆ
    await updateCounts(this, "increment");
  }
});

// ก่อน remove (ยกเลิกการติดตาม)
// Mongoose 5.x+ `remove` is deprecated on documents, use `deleteOne` or `deleteMany` on models.
// So, we need to handle this in the service layer or use a pre-hook for deleteOne/deleteMany if possible,
// or a post-hook on findOneAndDelete.

FollowSchema.post<mongoose.Query<IFollow, IFollow>>(["findOneAndDelete", "deleteOne"], async function(doc) {
    // `doc` is the document that was deleted
    if (doc) {
        await updateCounts(doc, "decrement");
    }
});

// ----- Model Export -----
// ใช้ function accessor เพื่อป้องกันปัญหา re-compilation ใน Next.js hot-reloading
const FollowModel = () => models.Follow as mongoose.Model<IFollow> || model<IFollow>("Follow", FollowSchema);

export default FollowModel;

