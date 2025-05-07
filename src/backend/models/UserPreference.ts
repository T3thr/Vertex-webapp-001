// src/backend/models/UserPreference.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface for content filtering preferences
export interface IContentFilterPreferences extends Document {
  showMatureContent: boolean; // แสดงเนื้อหาสำหรับผู้ใหญ่หรือไม่
  blockedTags: string[]; // Tags ที่ผู้ใช้ไม่ต้องการเห็น
  blockedCategories: Types.ObjectId[]; // หมวดหมู่ที่ผู้ใช้ไม่ต้องการเห็น (อ้างอิง Category model)
  // Potentially, allow list for specific authors/novels if needed
  allowedTags?: string[];
  allowedCategories?: Types.ObjectId[];
}

// Interface for notification preferences
export interface INotificationChannelPreference extends Document {
  inApp: boolean;
  email: boolean;
  push: boolean;
}

export interface INotificationTypePreferences extends Document {
  // Granular control over notification types from Notification.type enum
  system_message?: INotificationChannelPreference; // System announcements
  new_follower?: INotificationChannelPreference; // Someone followed the recipient
  new_comment_on_novel?: INotificationChannelPreference; // New comment on recipient's novel
  new_reply_to_comment?: INotificationChannelPreference; // New reply to recipient's comment
  novel_update?: INotificationChannelPreference; // Update on a followed novel (new episode)
  episode_unlocked?: INotificationChannelPreference; // Access granted to a purchased/unlocked episode
  achievement_unlocked?: INotificationChannelPreference;
  purchase_confirmation?: INotificationChannelPreference;
  donation_received?: INotificationChannelPreference;
  rating_received?: INotificationChannelPreference; // New rating on recipient's novel
  mention_in_comment?: INotificationChannelPreference;
  writer_application_status?: INotificationChannelPreference;
  payout_processed?: INotificationChannelPreference;
  content_moderation_action?: INotificationChannelPreference;
  // General fallback if a specific type is not set
  default?: INotificationChannelPreference;
}

// Interface for UserPreference document
export interface IUserPreference extends Document {
  user: Types.ObjectId; // ผู้ใช้ (อ้างอิง User model, unique)
  // General Preferences
  theme: "light" | "dark" | "system" | "sepia"; // ธีมการแสดงผล
  language: string; // ภาษาที่เลือกใช้ใน UI (e.g., "th", "en")
  fontSize: "small" | "medium" | "large" | "xlarge"; // ขนาดตัวอักษรในการอ่าน
  // Reading Preferences
  readingMode: "paginated" | "scroll" | "webtoon"; // โหมดการอ่าน
  autoPlayNextEpisode: boolean; // เล่นตอนต่อไปอัตโนมัติหรือไม่
  showSpoilerTagsByDefault: boolean; // แสดงเนื้อหาใน spoiler tag โดย default หรือไม่
  // Content Filtering
  contentFilters: IContentFilterPreferences;
  // Notification Preferences
  notificationPreferences: INotificationTypePreferences;
  // Privacy Preferences
  showActivityStatus: boolean; // แสดงสถานะการใช้งาน (e.g., "online") หรือไม่
  profileVisibility: "public" | "followers_only" | "private"; // การมองเห็นโปรไฟล์
  allowFollowRequests: boolean; // (If profile is private) อนุญาตให้ส่งคำขอติดตามหรือไม่
  // Accessibility Preferences
  highContrastMode: boolean; // โหมดความคมชัดสูง
  reduceMotion: boolean; // ลดการเคลื่อนไหวของ UI
  // AI/ML Personalization Preferences
  enablePersonalizedRecommendations: boolean; // เปิดใช้งานการแนะนำส่วนบุคคลหรือไม่
  allowDataForRecommendationModelTraining: boolean; // อนุญาตให้ใช้ข้อมูลเพื่อฝึกโมเดลแนะนำหรือไม่
  // Other specific preferences
  customPreferences?: Record<string, any>; // สำหรับการตั้งค่าอื่นๆ ที่อาจเพิ่มในอนาคต
  createdAt: Date;
  updatedAt: Date;
}

const ContentFilterPreferencesSchema = new Schema<IContentFilterPreferences>(
  {
    showMatureContent: { type: Boolean, default: false },
    blockedTags: [{ type: String, trim: true, lowercase: true }],
    blockedCategories: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    allowedTags: [{ type: String, trim: true, lowercase: true }],
    allowedCategories: [{ type: Schema.Types.ObjectId, ref: "Category" }],
  },
  { _id: false }
);

const NotificationChannelPreferenceSchema = new Schema<INotificationChannelPreference>(
  {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    push: { type: Boolean, default: false },
  },
  { _id: false }
);

const NotificationTypePreferencesSchema = new Schema<INotificationTypePreferences>(
  {
    system_message: NotificationChannelPreferenceSchema,
    new_follower: NotificationChannelPreferenceSchema,
    new_comment_on_novel: NotificationChannelPreferenceSchema,
    new_reply_to_comment: NotificationChannelPreferenceSchema,
    novel_update: NotificationChannelPreferenceSchema,
    episode_unlocked: NotificationChannelPreferenceSchema,
    achievement_unlocked: NotificationChannelPreferenceSchema,
    purchase_confirmation: NotificationChannelPreferenceSchema,
    donation_received: NotificationChannelPreferenceSchema,
    rating_received: NotificationChannelPreferenceSchema,
    mention_in_comment: NotificationChannelPreferenceSchema,
    writer_application_status: NotificationChannelPreferenceSchema,
    payout_processed: NotificationChannelPreferenceSchema,
    content_moderation_action: NotificationChannelPreferenceSchema,
    default: NotificationChannelPreferenceSchema, // Fallback
  },
  { _id: false }
);

const UserPreferenceSchema = new Schema<IUserPreference>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    theme: { type: String, enum: ["light", "dark", "system", "sepia"], default: "system" },
    language: { type: String, default: "th", trim: true, lowercase: true },
    fontSize: { type: String, enum: ["small", "medium", "large", "xlarge"], default: "medium" },
    readingMode: { type: String, enum: ["paginated", "scroll", "webtoon"], default: "scroll" },
    autoPlayNextEpisode: { type: Boolean, default: true },
    showSpoilerTagsByDefault: { type: Boolean, default: false },
    contentFilters: {
      type: ContentFilterPreferencesSchema,
      default: () => ({ showMatureContent: false, blockedTags: [], blockedCategories: [] }),
    },
    notificationPreferences: {
      type: NotificationTypePreferencesSchema,
      default: () => ({ 
        // Sensible defaults, user can customize further
        system_message: {inApp: true, email: true, push: false},
        new_follower: {inApp: true, email: true, push: true},
        new_comment_on_novel: {inApp: true, email: true, push: true},
        new_reply_to_comment: {inApp: true, email: true, push: true},
        novel_update: {inApp: true, email: false, push: true},
        episode_unlocked: {inApp: true, email: true, push: false},
        achievement_unlocked: {inApp: true, email: false, push: true},
        purchase_confirmation: {inApp: true, email: true, push: false},
        donation_received: {inApp: true, email: true, push: false},
        rating_received: {inApp: true, email: false, push: false},
        mention_in_comment: {inApp: true, email: true, push: true},
        writer_application_status: {inApp: true, email: true, push: false},
        payout_processed: {inApp: true, email: true, push: false},
        content_moderation_action: {inApp: true, email: true, push: false},
        default: {inApp: true, email: false, push: false}
      }),
    },
    showActivityStatus: { type: Boolean, default: true },
    profileVisibility: { type: String, enum: ["public", "followers_only", "private"], default: "public" },
    allowFollowRequests: { type: Boolean, default: true }, // Relevant if profileVisibility is private
    highContrastMode: { type: Boolean, default: false },
    reduceMotion: { type: Boolean, default: false },
    enablePersonalizedRecommendations: { type: Boolean, default: true },
    allowDataForRecommendationModelTraining: { type: Boolean, default: true }, // Important for privacy
    customPreferences: Schema.Types.Mixed,
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ----- Indexes -----
// No additional complex indexes needed beyond the unique index on user, as this document is typically fetched by user ID.

// ----- Middleware -----
UserPreferenceSchema.pre("save", function (next) {
  // Validation or default setting logic can go here if needed
  // For example, ensure `allowFollowRequests` is true if `profileVisibility` is not `private`.
  if (this.profileVisibility !== "private") {
    this.allowFollowRequests = true; // Or set to false, depending on desired logic
  }
  next();
});

// ----- Model Export -----
const UserPreferenceModel = () =>
  models.UserPreference as mongoose.Model<IUserPreference> || model<IUserPreference>("UserPreference", UserPreferenceSchema);

export default UserPreferenceModel;

