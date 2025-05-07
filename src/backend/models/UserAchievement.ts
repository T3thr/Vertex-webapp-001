import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface for tracking progress towards a specific criterion of an achievement
export interface IUserAchievementCriterionProgress extends Document {
  metric: string; // Key for the metric being tracked (matches AchievementCriteria.metric)
  currentValue: number; // Current value of the metric for the user
  targetValue: number; // Target value for this criterion (denormalized from AchievementCriteria)
  isCompleted: boolean; // Whether this specific criterion is met
  lastUpdatedAt: Date; // When this progress was last updated
}

// Interface for UserAchievement document
// Tracks the progress and unlock status of achievements for a specific user.
export interface IUserAchievement extends Document {
  user: Types.ObjectId; // ผู้ใช้ (อ้างอิง User model)
  achievementDefinition: Types.ObjectId; // ความสำเร็จ (อ้างอิง Achievement model - the definition)
  achievementId: string; // Denormalized achievementId from Achievement model for easier querying
  // Progress Tracking
  progressPercentage: number; // เปอร์เซ็นต์ความคืบหน้าโดยรวม (0-100)
  criteriaProgress: IUserAchievementCriterionProgress[]; // ความคืบหน้าของแต่ละเงื่อนไข
  // Status and Timestamps
  isUnlocked: boolean; // ปลดล็อกแล้วหรือยัง
  unlockedAt?: Date; // วันที่ปลดล็อก
  isClaimed: boolean; // รับรางวัลแล้วหรือยัง (if rewards need explicit claiming)
  claimedAt?: Date; // วันที่รับรางวัล
  // Visibility and Notifications
  hasBeenViewed: boolean; // ผู้ใช้เห็นการแจ้งเตือนการปลดล็อกนี้หรือยัง
  lastNotifiedAt?: Date; // วันที่แจ้งเตือนล่าสุด
  // Expiry (if the unlocked achievement instance can expire, though rare)
  expiresAt?: Date;
  // Metadata
  customData?: Record<string, any>; // ข้อมูลเพิ่มเติม เช่น แต้มที่ได้จาก achievement นี้ถ้ามีการเปลี่ยนแปลง
  createdAt: Date;
  updatedAt: Date;
}

const UserAchievementCriterionProgressSchema = new Schema<IUserAchievementCriterionProgress>(
  {
    metric: { type: String, required: true, trim: true },
    currentValue: { type: Number, required: true, default: 0 },
    targetValue: { type: Number, required: true, min: 1 },
    isCompleted: { type: Boolean, default: false },
    lastUpdatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserAchievementSchema = new Schema<IUserAchievement>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    achievementDefinition: { type: Schema.Types.ObjectId, ref: "Achievement", required: true, index: true },
    achievementId: { type: String, required: true, trim: true, index: true }, // Denormalized from Achievement
    progressPercentage: { type: Number, default: 0, min: 0, max: 100 },
    criteriaProgress: [UserAchievementCriterionProgressSchema],
    isUnlocked: { type: Boolean, default: false, index: true },
    unlockedAt: { type: Date, index: true },
    isClaimed: { type: Boolean, default: false }, // If rewards need to be claimed manually
    claimedAt: Date,
    hasBeenViewed: { type: Boolean, default: false },
    lastNotifiedAt: Date,
    expiresAt: Date,
    customData: Schema.Types.Mixed,
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ----- Indexes -----
UserAchievementSchema.index({ user: 1, achievementDefinition: 1 }, { unique: true }); // Each user can have one instance per achievement definition
UserAchievementSchema.index({ user: 1, isUnlocked: 1, unlockedAt: -1 }); // For fetching unlocked achievements
UserAchievementSchema.index({ user: 1, achievementId: 1 }, { unique: true }); // Alternative unique index using denormalized ID
UserAchievementSchema.index({ user: 1, progressPercentage: 1 }); // For querying achievements in progress

// ----- Middleware -----
UserAchievementSchema.pre("save", async function (next) {
  if (this.isModified("criteriaProgress") || this.isNew) {
    const totalCriteria = this.criteriaProgress.length;
    if (totalCriteria > 0) {
      const completedCriteria = this.criteriaProgress.filter(c => c.isCompleted).length;
      this.progressPercentage = Math.floor((completedCriteria / totalCriteria) * 100);

      if (completedCriteria === totalCriteria && !this.isUnlocked) {
        this.isUnlocked = true;
        this.unlockedAt = new Date();
        // TODO: Consider emitting an event here for "achievement_unlocked"
        // This event could trigger notifications, reward granting, etc.
      }
    } else {
      this.progressPercentage = this.isUnlocked ? 100 : 0;
    }
  }

  // If unlocked, ensure progress is 100%
  if (this.isModified("isUnlocked") && this.isUnlocked && this.progressPercentage < 100) {
    this.progressPercentage = 100;
    if (!this.unlockedAt) {
        this.unlockedAt = new Date();
    }
  }

  next();
});

// ----- Methods -----
// Method to update progress for a specific criterion
UserAchievementSchema.methods.updateCriterionProgress = function(
  metricName: string,
  newValue: number
): boolean {
  const criterion = this.criteriaProgress.find((c: { metric: string; }) => c.metric === metricName);
  if (criterion) {
    criterion.currentValue = newValue;
    criterion.isCompleted = criterion.currentValue >= criterion.targetValue;
    criterion.lastUpdatedAt = new Date();
    // `this.save()` will be called by the service layer after all updates for an event are processed
    return true;
  }
  return false;
};

// Method to populate criteria progress from achievement definition (e.g., when UserAchievement is first created)
UserAchievementSchema.methods.initializeCriteria = async function() {
  if (!this.achievementDefinition) throw new Error("Achievement definition not populated or set.");
  
  const Achievement = models.Achievement || model("Achievement"); // Or import directly
  const definition = await Achievement.findById(this.achievementDefinition);

  if (!definition) throw new Error(`Achievement definition ${this.achievementDefinition} not found.`);
  if (!this.achievementId) this.achievementId = definition.achievementId;

  this.criteriaProgress = definition.unlockCriteria.map((crit: { metric: any; targetValue: any; }) => ({
    metric: crit.metric,
    currentValue: 0,
    targetValue: crit.targetValue,
    isCompleted: false,
    lastUpdatedAt: new Date(),
  }));
  this.progressPercentage = 0;
  this.isUnlocked = false;
};

// ----- Model Export -----
const UserAchievementModel = () =>
  models.UserAchievement as mongoose.Model<IUserAchievement> || model<IUserAchievement>("UserAchievement", UserAchievementSchema);

export default UserAchievementModel;
