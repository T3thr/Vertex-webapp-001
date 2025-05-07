// src/backend/models/index.ts
// This file exports all the Mongoose models for easy import elsewhere in the application.

// Core Content & User Models
export { default as UserModel, type IUser } from "./User";
export { default as NovelModel, type INovel } from "./Novel";
export { default as StoryMapModel, type IStoryMap, type IStoryMapNode, type IStoryMapEdge } from "./StoryMap";
export { default as EpisodeModel, type IEpisode} from "./Episode";
export { default as SceneModel, type IScene } from "./Scene"; // Scene can be part of Episode or StoryMap node
export { default as CharacterModel, type ICharacter } from "./Character";
export { default as MediaModel, type IMedia } from "./Media"; // User-uploaded media
export { default as OfficialMediaModel, type IOfficialMedia } from "./OfficialMedia"; // Platform-provided media assets
export { default as CategoryModel, type ICategory } from "./Category"; // For genres, tags, etc.

// User Interaction & Social Models
export { default as CommentModel, type IComment } from "./Comment";
export { default as RatingModel, type IRating } from "./Rating";
export { default as LikeModel, type ILike } from "./Like"; // Generic Like model for Novels, Episodes, Comments etc.
export { default as NovelFollowModel, type INovelFollow } from "./NovelFollow";
export { default as UserFollowModel, type IUserFollow } from "./UserFollow";
export { default as NotificationModel, type INotification, type INotificationData } from "./Notification";

// Monetization & Transaction Models
export { default as PurchaseModel, type IPurchase, type IPurchaseItem } from "./Purchase";
export { default as PaymentModel, type IPayment, type IPaymentMethodDetails } from "./Payment"; // Tracks actual payment transactions
export { default as DonationModel, type IDonation } from "./Donation";

// Achievement & Gamification Models
export { default as AchievementModel, type IAchievement, type IAchievementCriteria } from "./Achievement"; // Achievement definitions
export { default as UserAchievementModel, type IUserAchievement } from "./UserAchievement"; // Tracks user earned achievements
export { default as BadgeModel, type IBadge } from "./Badge"; // Visual representation of achievements or other recognitions

// Application & Platform Specific Models
export { default as WriterApplicationModel, type IWriterApplication, type IApplicationDocument } from "./WriterApplication";
export { default as UserPreferenceModel, type IUserPreference, type IContentFilterPreferences, type INotificationTypePreferences } from "./UserPreference";

// Analytics & AI/ML Models
export { default as ReadingAnalyticModel, type IReadingAnalytic, type IReadingSessionEvent } from "./ReadingAnalytic";
export { default as EarningAnalyticModel, type IEarningAnalytic } from "./EarningAnalytic";

// It is crucial to ensure that any model referencing another (e.g., via Schema.Types.ObjectId and ref: "ModelName")
// uses the correct "ModelName" string that Mongoose will register. These exports make it easier to manage.

// Example of how models might be initialized and registered in your main application setup (e.g., in a db.ts or similar):
/*
import mongoose from "mongoose";
import * as Models from "./index"; // Assuming this index.ts is in the same directory

// ... (mongoose connection logic)

// Initialize all models to ensure they are registered with Mongoose
// This is often not strictly necessary if you import and use them directly,
// as Mongoose registers them on first import/use of model().
// However, explicitly calling them can sometimes help avoid issues in complex setups.

export const initializeModels = () => {
  Models.UserModel();
  Models.NovelModel();
  Models.StoryMapModel();
  Models.EpisodeModel();
  Models.SceneModel();
  Models.CharacterModel();
  Models.MediaModel();
  Models.OfficialMediaModel();
  Models.CategoryModel();
  Models.CommentModel();
  Models.RatingModel();
  Models.LikeModel();
  Models.NovelFollowModel();
  Models.UserFollowModel();
  Models.NotificationModel();
  Models.PurchaseModel();
  Models.PaymentModel();
  Models.DonationModel();
  Models.AchievementModel();
  Models.UserAchievementModel();
  Models.BadgeModel();
  Models.WriterApplicationModel();
  Models.UserPreferenceModel();
  Models.ReadingAnalyticModel();
  Models.EarningAnalyticModel();
  console.log("All Mongoose models initialized and registered.");
};

// Then, in your application startup:
// initializeModels();
*/

