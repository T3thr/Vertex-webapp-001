// src/backend/models/UserProfile.ts
// โมเดลโปรไฟล์ผู้ใช้ (UserProfile Model) - Public Profile & Social Data
// ตามมาตรฐาน DivWy (Modularized Architecture)
//
// **ปรัชญาการออกแบบ:**
// โมเดลนี้ถูกสร้างขึ้นเพื่อจัดเก็บข้อมูลทั้งหมดที่เกี่ยวข้องกับ "โปรไฟล์สาธารณะ" ของผู้ใช้
// การแยกข้อมูลส่วนนี้ออกมาจาก Core User Model (User.ts) มีจุดประสงค์เพื่อ:
// 1.  **Decoupling:** แยกข้อมูลที่ใช้แสดงผล (Display Data) ออกจากข้อมูลการยืนยันตัวตน (Identity Data)
// 2.  **Performance:** ทำให้การโหลดหน้าโปรไฟล์ผู้ใช้ทำได้รวดเร็ว โดยการดึงข้อมูลจากเอกสารเดียวที่ออกแบบมาเพื่อการนี้โดยเฉพาะ
// 3.  **Maintainability:** ง่ายต่อการเพิ่มหรือแก้ไขข้อมูลที่เกี่ยวกับโปรไฟล์ โดยไม่กระทบต่อ Core User Model
//
// **ข้อมูลที่เก็บในโมเดลนี้ (Warm Data):**
// - ข้อมูลโปรไฟล์พื้นฐาน (displayName, penNames, bio, รูปภาพ)
// - สถิติทางสังคม (จำนวนผู้ติดตาม, จำนวนนิยายที่สร้าง)
// - รายการที่เลือกมาแสดง (Showcased achievements/badges)
// - ข้อมูลสำหรับนักเขียน (สถิติเบื้องต้น) ซึ่งอาจถูก Denormalize มาจาก WriterStats อีกที
//
// อัปเดตล่าสุด: Created as part of the modular architecture refactor.

import mongoose, { Schema, model, models, Document, Types } from "mongoose";

// ==================================================================================================
// SECTION: อินเทอร์เฟซย่อย (Sub-Interfaces) สำหรับ UserProfile
// ==================================================================================================

/**
 * @interface IUserSocialStats
 * @description สถิติทางสังคมของผู้ใช้ (ถูกย้ายมาที่นี่)
 */
export interface IUserSocialStats {
  followersCount: number;
  followingUsersCount: number;
  followingNovelsCount: number;
  novelsCreatedCount: number;
  boardPostsCreatedCount: number;
  commentsMadeCount: number;
  ratingsGivenCount: number;
  likesGivenCount: number;
}

/**
 * @interface IShowcasedGamificationItem
 * @description โครงสร้างสำหรับ item (Achievement หรือ Badge) ที่ผู้ใช้เลือกแสดงบนโปรไฟล์
 */
export interface IShowcasedGamificationItem {
  earnedItemId: Types.ObjectId; // ID ของ UserEarnedItem (จาก UserAchievement.earnedItems._id)
  itemType: "Achievement" | "Badge";
}

/**
 * @interface IUserDisplayBadge
 * @description โครงสร้างสำหรับ Badge ที่ผู้ใช้ตั้งค่าเพื่อแสดงผลในส่วนต่างๆ
 */
export interface IUserDisplayBadge {
    earnedBadgeId: Types.ObjectId; // อ้างอิง UserEarnedItem._id ที่เป็น Badge
    displayContext?: string; // บริบทที่จะแสดง เช่น 'comment_signature', 'profile_header'
}

/**
 * @interface IWriterStatsSummary
 * @description (ใหม่) สถิติสรุปสำหรับนักเขียนเพื่อแสดงผลบนโปรไฟล์ (Denormalized จาก WriterStats)
 */
export interface IWriterStatsSummary {
    totalNovelsPublished: number;
    totalViewsAcrossAllNovels: number;
    totalLikesReceivedOnNovels: number;
    writerTier?: string;
    writerRank?: number;
}

// ==================================================================================================
// SECTION: อินเทอร์เฟซหลักสำหรับเอกสารโปรไฟล์ผู้ใช้ (IUserProfile Document Interface)
// ==================================================================================================

/**
 * @interface IUserProfile
 * @extends Document
 * @description อินเทอร์เฟซสำหรับเอกสารใน Collection "userprofiles"
 * @property {Types.ObjectId} userId - ID ของผู้ใช้ที่อ้างอิงถึง Collection 'users' (Foreign Key)
 * @property {string} [displayName] - ชื่อที่แสดง (อาจซ้ำกับผู้อื่นได้)
 * @property {string[]} [penNames] - นามปากกาสำหรับนักเขียน
 * @property {string} [primaryPenName] - นามปากกาหลักที่ใช้แสดง (Source of Truth)
 * @property {string} [avatarUrl] - URL รูปโปรไฟล์ (Source of Truth)
 * @property {string} [coverImageUrl] - URL รูปปกโปรไฟล์
 * @property {string} [bio] - คำอธิบายตัวตนสั้นๆ
 * @property {"male" | "female" | "lgbtq+" | "other" | "prefer_not_to_say"} [gender] - เพศของผู้ใช้
 * @property {Date} [dateOfBirth] - วันเกิดของผู้ใช้ (เพื่อคำนวณอายุ, ไม่แสดงสาธารณะโดยตรง)
 * @property {string} [country] - ประเทศ (รหัส ISO 3166-1 alpha-2)
 * @property {string} [timezone] - เขตเวลา
 * @property {string} [location] - ที่อยู่หรือเมือง
 * @property {string} [websiteUrl] - URL เว็บไซต์ส่วนตัว
 * @property {IUserSocialStats} socialStats - สถิติทางสังคม
 * @property {string[]} [verifiedBadges] - ป้ายยืนยันต่างๆ ที่ผู้ใช้ได้รับ (เช่น "Verified Writer")
 * @property {IShowcasedGamificationItem[]} [showcasedItems] - รายการ Achievements/Badges ที่ผู้ใช้เลือกแสดง
 * @property {IUserDisplayBadge} [primaryDisplayBadge] - Badge หลักที่ผู้ใช้เลือกแสดง
 * @property {IUserDisplayBadge[]} [secondaryDisplayBadges] - Badge รองที่ผู้ใช้เลือกแสดง
 * @property {IWriterStatsSummary} [writerStatsSummary] - สรุปสถิตินักเขียน (ถ้าเป็นนักเขียน)
 * @property {Date} [joinDate] - วันที่สมัครสมาชิก (Denormalized for display)
 */
export interface IUserProfile extends Document {
  userId: Types.ObjectId;
  displayName?: string;
  penNames?: string[];
  primaryPenName?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  bio?: string;
  gender?: "male" | "female" | "lgbtq+" | "other" | "prefer_not_to_say";
  dateOfBirth?: Date;
  country?: string;
  timezone?: string;
  location?: string;
  websiteUrl?: string;
  socialStats: IUserSocialStats;
  verifiedBadges?: string[];
  showcasedItems?: IShowcasedGamificationItem[];
  primaryDisplayBadge?: IUserDisplayBadge;
  secondaryDisplayBadges?: IUserDisplayBadge[];
  writerStatsSummary?: IWriterStatsSummary;
  joinDate: Date;

  createdAt: Date;
  updatedAt: Date;
}

// ==================================================================================================
// SECTION: Schema ย่อย (Sub-Schemas) สำหรับ Mongoose
// ==================================================================================================

const UserSocialStatsSchema = new Schema<IUserSocialStats>(
  {
    followersCount: { type: Number, default: 0, min: 0 },
    followingUsersCount: { type: Number, default: 0, min: 0 },
    followingNovelsCount: { type: Number, default: 0, min: 0 },
    novelsCreatedCount: { type: Number, default: 0, min: 0 },
    boardPostsCreatedCount: { type: Number, default: 0, min: 0 },
    commentsMadeCount: { type: Number, default: 0, min: 0 },
    ratingsGivenCount: { type: Number, default: 0, min: 0 },
    likesGivenCount: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const ShowcasedGamificationItemSchema = new Schema<IShowcasedGamificationItem>(
    {
        earnedItemId: { type: Schema.Types.ObjectId, required: true, ref: "UserAchievement.earnedItems" },
        itemType: { type: String, enum: ["Achievement", "Badge"], required: true },
    },
    { _id: false }
);

const UserDisplayBadgeSchema = new Schema<IUserDisplayBadge>(
    {
        earnedBadgeId: { type: Schema.Types.ObjectId, required: true, ref: "UserAchievement.earnedItems" },
        displayContext: { type: String, trim: true, maxlength: 100 },
    },
    { _id: false }
);

const WriterStatsSummarySchema = new Schema<IWriterStatsSummary>(
    {
        totalNovelsPublished: { type: Number, default: 0, min: 0 },
        totalViewsAcrossAllNovels: { type: Number, default: 0, min: 0 },
        totalLikesReceivedOnNovels: { type: Number, default: 0, min: 0 },
        writerTier: { type: String, trim: true, maxlength: 50 },
        writerRank: { type: Number, min: 0 },
    },
    { _id: false }
);

// ==================================================================================================
// SECTION: Schema หลักสำหรับ UserProfile (UserProfileSchema)
// ==================================================================================================

const UserProfileSchema = new Schema<IUserProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true, comment: "FK to User collection" },
    displayName: { type: String, trim: true, minlength: 1, maxlength: 100, comment: "ชื่อที่แสดงทั่วไป" },
    penNames: {
      type: [String],
      trim: true,
      sparse: true,
      validate: {
        validator: (arr: string[]) => !arr || arr.every(v => v.length >= 2 && v.length <= 50),
        message: "นามปากกาแต่ละชื่อต้องมีความยาว 2-50 ตัวอักษร"
      },
      comment: "รายการนามปากกาของนักเขียน",
    },
    primaryPenName: {
      type: String,
      trim: true,
      maxlength: 50,
      comment: "นามปากกาหลักที่ใช้แสดงผล (Source of Truth)",
      validate: {
          validator: function(this: IUserProfile, v: string | null | undefined): boolean {
              if (!v) return true;
              return this.penNames ? this.penNames.includes(v) : false;
          },
          message: "นามปากกาหลักต้องเป็นหนึ่งในนามปากกาที่ระบุไว้"
      }
    },
    avatarUrl: { type: String, trim: true, maxlength: 2048, comment: "URL รูปโปรไฟล์ (Source of Truth)" },
    coverImageUrl: { type: String, trim: true, maxlength: 2048, comment: "URL รูปปกโปรไฟล์" },
    bio: { type: String, trim: true, maxlength: 500, comment: "คำอธิบายตัวตน" },
    gender: { type: String, enum: ["male", "female", "lgbtq+", "other", "prefer_not_to_say"] },
    dateOfBirth: { type: Date },
    country: { type: String, trim: true, uppercase: true, match: [/^[A-Z]{2}$/, "รหัสประเทศต้องเป็น ISO 3166-1 alpha-2"] },
    timezone: { type: String, trim: true, maxlength: 100 },
    location: { type: String, trim: true, maxlength: 200 },
    websiteUrl: { type: String, trim: true, maxlength: 2048 },
    socialStats: { type: UserSocialStatsSchema, default: () => ({}) },
    verifiedBadges: [{ type: String, trim: true, maxlength: 100 }],
    showcasedItems: { type: [ShowcasedGamificationItemSchema], default: [] },
    primaryDisplayBadge: { type: UserDisplayBadgeSchema, default: undefined },
    secondaryDisplayBadges: {
        type: [UserDisplayBadgeSchema],
        default: [],
        validate: [(val: any[]) => val.length <= 2, "สามารถเลือก Badge รองได้สูงสุด 2 อัน"],
    },
    writerStatsSummary: { type: WriterStatsSummarySchema, default: undefined },
    joinDate: { type: Date, required: true, default: Date.now },
  },
  {
    timestamps: true,
    collection: "userprofiles",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ==================================================================================================
// SECTION: Indexes (ดัชนีสำหรับการค้นหาและ Query Performance)
// ==================================================================================================
UserProfileSchema.index({ "penNames": 1 }, { sparse: true, name: "UserProfilePenNamesIndex" });
UserProfileSchema.index({ "displayName": "text", "penNames": "text", "bio": "text" }, { name: "UserProfileTextSearchIndex" }); // For general search

// ==================================================================================================
// SECTION: Middleware (Mongoose Hooks)
// ==================================================================================================
UserProfileSchema.pre<IUserProfile>("save", async function (next) {
    // Prioritization Logic: จัดการ penName และ primaryPenName
    const profile = this;

    // Logic 1: ถ้ามี displayName แต่ไม่มี penNames เลย, ใช้ displayName เป็น default
    if (profile.displayName && (!profile.penNames || profile.penNames.length === 0)) {
        profile.penNames = [profile.displayName];
    }

    // Logic 2: ถ้ามี penNames แต่ยังไม่มี primaryPenName, ใช้ตัวแรกเป็น default
    if (profile.penNames && profile.penNames.length > 0 && !profile.primaryPenName) {
        profile.primaryPenName = profile.penNames[0];
    }

    // Logic 3: ถ้า primaryPenName ถูกลบออกจาก list ของ penNames, ให้ตั้งค่าใหม่
    if (profile.primaryPenName && profile.penNames && !profile.penNames.includes(profile.primaryPenName)) {
      profile.primaryPenName = profile.penNames.length > 0 ? profile.penNames[0] : undefined;
    }

    // Logic 4: (สำคัญ) เมื่อ primaryPenName หรือ avatarUrl ที่เป็น Source of Truth เปลี่ยนแปลง
    // ควร trigger event เพื่ออัปเดตข้อมูล denormalized ใน User model
    if (this.isModified("primaryPenName") || this.isModified("avatarUrl")) {
        // ตัวอย่างการเรียก service หรือส่ง event
        // await UserService.syncDenormalizedData(this.userId, {
        //     primaryPenName: this.primaryPenName,
        //     avatarUrl: this.avatarUrl,
        // });
        console.log(`[UserProfile Post-Save Hook] Profile for user ${this.userId} updated. Triggering data sync.`);
    }

    next();
});

// ==================================================================================================
// SECTION: Virtuals (ฟิลด์เสมือน)
// ==================================================================================================
UserProfileSchema.virtual("age").get(function (this: IUserProfile): number | undefined {
  if (this.dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : undefined;
  }
  return undefined;
});

// ==================================================================================================
// SECTION: Model Export (ส่งออก Model สำหรับใช้งาน)
// ==================================================================================================
const UserProfileModel = (models.UserProfile as mongoose.Model<IUserProfile>) || model<IUserProfile>("UserProfile", UserProfileSchema);

export default UserProfileModel;

// ==================================================================================================
// SECTION: หมายเหตุและแนวทางการปรับปรุงเพิ่มเติม (Notes and Future Improvements)
// ==================================================================================================
// 1.  **Data as the "Source of Truth":** Collection นี้คือ "แหล่งข้อมูลจริง" (Source of Truth) สำหรับข้อมูลโปรไฟล์
//     เช่น `primaryPenName` และ `avatarUrl` เมื่อผู้ใช้แก้ไขข้อมูลเหล่านี้ที่หน้าโปรไฟล์, การเปลี่ยนแปลงจะถูกบันทึกที่นี่ก่อน
//
// 2.  **Denormalization Management:** การมีอยู่ของ `writerStatsSummary` เป็นตัวอย่างของการ Denormalize ข้อมูลจาก Collection อื่น
//     (ในที่นี้คือ `WriterStats`) มาเพื่อลดภาระการ Query ในหน้าที่ต้องการข้อมูลสรุป
//     -   **กลไกการอัปเดต:** ต้องมี Background Job หรือ Event Listener ที่คอยคำนวณและอัปเดต `writerStatsSummary`
//       เป็นระยะๆ หรือเมื่อมีการเปลี่ยนแปลงที่สำคัญใน `WriterStats` ของนักเขียนคนนั้นๆ
//
// 3.  **Scalability:** การแยก Collection ทำให้เราสามารถทำ Indexing ที่ซับซ้อนขึ้นสำหรับ `UserProfile` โดยเฉพาะ
//     เช่น การทำ Text Index บน `displayName`, `penNames`, และ `bio` เพื่อรองรับฟีเจอร์การค้นหาผู้ใช้
//     โดยไม่ทำให้ Index ของ Core `User` model บวมโดยไม่จำเป็น
//
// 4.  **Flexibility:** หากในอนาคตต้องการเพิ่มข้อมูลที่ซับซ้อนเกี่ยวกับโปรไฟล์ เช่น ประวัติการทำงาน, การศึกษา,
//     หรือ Portfolio, สามารถเพิ่มลงในโมเดลนี้ได้เลยโดยไม่กระทบส่วนอื่น
//
// 5.  **Relation to Other Models:**
//     -   `userId`: เป็น Foreign Key หลักที่ใช้ในการเชื่อมโยงกลับไปยัง `User` model
//     -   `showcasedItems`, `primaryDisplayBadge`, `secondaryDisplayBadges`: มี `ref` ไปยัง `UserAchievement.earnedItems`
//       ซึ่งหมายความว่าข้อมูล Gamification จริงๆ อยู่ใน `UserGamification` collection แต่ `UserProfile` จะเก็บแค่ "ตัวชี้"
//       ไปยังสิ่งที่ผู้ใช้ต้องการจะแสดงผล
// ==================================================================================================