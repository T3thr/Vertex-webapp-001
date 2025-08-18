// src/backend/models/UserAchievement.ts
import mongoose, { Schema, Document, Types, model, models } from 'mongoose';
import { IAchievement } from './Achievement';

/**
 * @interface IEarnedItem
 * @description Represents a single instance of an unlocked achievement or earned badge.
 * A user can earn the same item multiple times if it's repeatable.
 */
export interface IEarnedItem {
  _id: Types.ObjectId; // Unique ID for this specific instance of earning.
  itemModelId: Types.ObjectId; // Ref to the original Achievement or Badge model.
  itemCode: string; // Denormalized code for quick reference (e.g., 'FIRST_NOVEL_READ').
  itemType: 'Achievement' | 'Badge';
  earnedAt: Date; // Timestamp of when this item was earned.
  progress?: {
    current: number;
    target: number;
    tier: number;
  };
  isClaimed?: boolean; // If there's a reward to be claimed manually.
  metadata?: any; // Any other instance-specific data.
}

/**
 * @interface IUserAchievementDoc
 * @description Document tracking all achievements and badges earned by a single user.
 * This acts as the "source of truth" for what a user has accomplished.
 */
export interface IUserAchievementDoc extends Document {
  userId: Types.ObjectId;
  earnedItems: Types.DocumentArray<IEarnedItem>;
  // This field could be used to store aggregate progress on achievements that are not yet earned.
  // For now, progress is stored within the earnedItem itself for tiered achievements.
  inProgressAchievements?: any;
  createdAt: Date;
  updatedAt: Date;
}

const EarnedItemSchema = new Schema<IEarnedItem>({
    itemModelId: { type: Schema.Types.ObjectId, required: true, refPath: 'earnedItems.itemType' },
    itemCode: { type: String, required: true, trim: true, uppercase: true, index: true },
    itemType: { type:String, required: true, enum: ['Achievement', 'Badge'] },
    earnedAt: { type: Date, default: Date.now },
    progress: {
        current: { type: Number, default: 0 },
        target: { type: Number, default: 1 },
        tier: {type: Number, default: 1}
    },
    isClaimed: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed },
}, { timestamps: { createdAt: 'earnedAt', updatedAt: false } });


const UserAchievementSchema = new Schema<IUserAchievementDoc>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true,
    },
    earnedItems: [EarnedItemSchema]
}, {
    timestamps: true,
    collection: "user_achievements",
});

// Ensure proper index on userId at schema level and avoid legacy 'user' index conflicts
UserAchievementSchema.index({ userId: 1 }, { unique: true, name: 'userId_1' });

const UserAchievementModel =
  (models.UserAchievement as mongoose.Model<IUserAchievementDoc>) ||
  model<IUserAchievementDoc>('UserAchievement', UserAchievementSchema);

export default UserAchievementModel;