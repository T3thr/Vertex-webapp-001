
import { Types } from 'mongoose';
import UserGamificationModel from '../models/UserGamification';
import AchievementModel, { AchievementCategory, AchievementRarity } from '../models/Achievement'; // Assuming an Achievement model exists
import UserAchievementModel from '../models/UserAchievement';
import NotificationModel, { NotificationChannel, NotificationSeverity, NotificationType } from '../models/Notification';

class GamificationService {

  /**
   * Ensures the correct unique index exists on UserAchievement.userId and removes legacy 'user' index that forces null uniqueness.
   */
  private async ensureUserAchievementIndexes(): Promise<void> {
    try {
      const indexes: any[] = await (UserAchievementModel.collection as any).indexes();
      const hasLegacyUserIndex = indexes.some((idx: any) => idx.key && (idx.key as any).user === 1);
      if (hasLegacyUserIndex) {
        try {
          await UserAchievementModel.collection.dropIndex('user_1');
          console.log('[GamificationService] Dropped legacy index user_1 on user_achievements');
        } catch (dropErr: any) {
          // If index name differs, attempt dropping by key
          try {
            await (UserAchievementModel.collection as any).dropIndex({ user: 1 } as any);
            console.log('[GamificationService] Dropped legacy { user: 1 } index on user_achievements');
          } catch (e) {
            const msg = (e && (e as any).message) ? (e as any).message : String(e);
            console.warn('[GamificationService] Failed to drop legacy index user_1:', msg);
          }
        }
      }

      const hasUserIdUnique = indexes.some((idx: any) => idx.key && (idx.key as any).userId === 1 && (idx as any).unique);
      if (!hasUserIdUnique) {
        try {
          await (UserAchievementModel.collection as any).createIndex({ userId: 1 }, { unique: true, name: 'userId_1' });
          console.log('[GamificationService] Created unique index userId_1 on user_achievements');
        } catch (createErr) {
          const msg = (createErr && (createErr as any).message) ? (createErr as any).message : String(createErr);
          console.warn('[GamificationService] Failed to create unique index on userId:', msg);
        }
      }
    } catch (indexErr) {
      const msg = (indexErr && (indexErr as any).message) ? (indexErr as any).message : String(indexErr);
      console.warn('[GamificationService] ensureUserAchievementIndexes error:', msg);
    }
  }

  /**
   * Finds a user's gamification document or creates a new one if it doesn't exist.
   * @param userId The ID of the user.
   * @returns The user's gamification document.
   */
  private async findOrCreateGamification(userId: string | Types.ObjectId) {
    const userObjectId = new Types.ObjectId(userId);
    let userGamification = await UserGamificationModel.findOne({ userId: userObjectId });

    if (!userGamification) {
      userGamification = await UserGamificationModel.create({ userId: userObjectId });
      console.log(`Created new gamification profile for user ${userId}.`);
    }
    
    return userGamification;
  }

  /**
   * Normalizes a user's XP and Level based on a fixed threshold per level.
   * Useful for repairing historical records that have XP overflow (e.g. 240/100 at level 1).
   */
  private async normalizeLevelIfNeeded(userId: string | Types.ObjectId, xpPerLevel: number = 100): Promise<boolean> {
    const userObjectId = new Types.ObjectId(userId);
    const doc = await UserGamificationModel.findOne({ userId: userObjectId });
    if (!doc) return false;

    const currentXP = doc.gamification.experiencePoints ?? 0;
    const currentLevel = doc.gamification.level ?? 1;
    const threshold = doc.gamification.nextLevelXPThreshold || xpPerLevel;

    // Only normalize when XP in current level is equal or exceeds threshold
    if (currentXP < threshold) return false;

    let remainderXP = currentXP;
    let newLevel = currentLevel;
    while (remainderXP >= xpPerLevel) {
      remainderXP -= xpPerLevel;
      newLevel += 1;
    }

    await UserGamificationModel.updateOne(
      { _id: doc._id },
      {
        $set: {
          'gamification.level': newLevel,
          'gamification.experiencePoints': remainderXP,
          'gamification.nextLevelXPThreshold': xpPerLevel,
          'gamification.lastActivityAt': new Date(),
        },
      }
    );

    console.log(`[GamificationService] Normalized level for user ${userId} from L${currentLevel} ${currentXP}/${threshold} to L${newLevel} ${remainderXP}/${xpPerLevel}`);
    return true;
  }

  /**
   * Awards experience points to a user and saves to the database.
   * @param userId The ID of the user.
   * @param points The number of experience points to award.
   */
  public async awardPoints(userId: string, points: number): Promise<void> {
    if (points <= 0) return;
    
    const userObjectId = new Types.ObjectId(userId);
    
    // 1) เพิ่ม XP แบบ atomic และดึงค่าล่าสุดหลังเพิ่มมาใช้คำนวณเลเวลอัป
    const updatedDoc = await UserGamificationModel.findOneAndUpdate(
      { userId: userObjectId },
      {
        $inc: {
          'gamification.experiencePoints': points,
          'gamification.totalExperiencePointsEverEarned': points,
        },
        $set: { 'gamification.lastActivityAt': new Date() },
      },
      {
        upsert: true,
        new: true, // คืนค่าเอกสารหลังอัปเดต
        setDefaultsOnInsert: true,
      }
    );

    if (!updatedDoc) {
      console.warn(`[GamificationService] findOneAndUpdate returned null for user ${userId}`);
      return;
    }

    console.log(`Awarded ${points} XP to user ${userId}.`);

    // 2) คำนวณเลเวลอัป: ใช้เกณฑ์คงที่ 100 XP ต่อเลเวล
    const xpPerLevel = 100;
    let xpInCurrentLevel = updatedDoc.gamification.experiencePoints;
    let newLevel = updatedDoc.gamification.level;
    let didLevelUp = false;

    while (xpInCurrentLevel >= xpPerLevel) {
      xpInCurrentLevel -= xpPerLevel;
      newLevel += 1;
      didLevelUp = true;
    }

    // 3) ถ้าเลเวลอัป ให้บันทึกค่าที่คำนวณแล้วกลับไปที่เอกสาร
    if (didLevelUp) {
      await UserGamificationModel.updateOne(
        { _id: updatedDoc._id },
        {
          $set: {
            'gamification.level': newLevel,
            'gamification.experiencePoints': xpInCurrentLevel,
            'gamification.nextLevelXPThreshold': xpPerLevel,
            'gamification.lastActivityAt': new Date(),
          },
        }
      );

      // อนาคต: สร้าง Notification แจ้งว่าเลเวลอัปได้ที่นี่
      console.log(`User ${userId} leveled up to L${newLevel}. Remaining XP in level: ${xpInCurrentLevel}`);
    }
  }

  /**
   * Unlocks an achievement for a user and saves to the database.
   * @param userId The ID of the user.
   * @param achievementTierKey The tier key of the achievement (e.g., 'FIRST_READER').
   * @param progressIncrement The amount to increment the progress by.
   */
  public async trackAchievementProgress(
    userId: string,
    achievementTierKey: string,
    progressIncrement: number = 1
  ): Promise<{ unlocked: boolean; unlockedTierLevel?: number; unlockedTitle?: string; error?: string }> {
    try {
      await this.ensureUserAchievementIndexes();
      const userObjectId = new Types.ObjectId(userId);

    // 1. Find a master achievement definition using the tierKey to get metadata like maxTier.
    let masterAchievement = await AchievementModel.findOne({ tierKey: achievementTierKey });
    if (!masterAchievement) {
      console.error(`Achievement with tierKey '${achievementTierKey}' not found.`);
      // Auto-seed a minimal tier 1 definition for FIRST_READER if missing, so user gets immediate feedback
      if (achievementTierKey === 'FIRST_READER') {
        try {
          masterAchievement = await AchievementModel.create({
            achievementCode: 'FIRST_READER_TIER_1_AUTO',
            title: 'ก้าวแรกสู่นักอ่าน I',
            description: 'อ่านนิยายครบ 1 ตอน',
            category: AchievementCategory.READING,
            rarity: AchievementRarity.COMMON,
            unlockConditions: [{ eventName: 'USER_READ_EPISODE', targetValue: 1 }],
            points: 10,
            maxTier: 1,
            tierKey: 'FIRST_READER',
            tierLevel: 1,
            displayOrder: 0,
            isActive: true,
            isSecret: false,
            isRepeatable: false,
            schemaVersion: 1,
          });
          console.log(`[GamificationService] Auto-seeded default achievement for '${achievementTierKey}'.`);
        } catch (seedErr) {
          console.error(`[GamificationService] Failed to auto-seed '${achievementTierKey}':`, seedErr);
          return { unlocked: false };
        }
      } else {
        return { unlocked: false };
      }
    }

    // 2. Find or create the user's achievement tracking document.
    let userAchievementDoc = await UserAchievementModel.findOne({ userId: userObjectId });
    if (!userAchievementDoc) {
      userAchievementDoc = new UserAchievementModel({ userId: userObjectId, earnedItems: [] });
    }

    // 3. Find the specific achievement item for the user using the tierKey.
    let earnedItem = userAchievementDoc.earnedItems.find(item => item.itemCode === achievementTierKey);

    // 4. If the user is starting this achievement, create the first tier entry.
    if (!earnedItem) {
      const firstTier = await AchievementModel.findOne({ tierKey: achievementTierKey, tierLevel: 1 });
      if (!firstTier) {
        console.error(`First tier for achievement '${achievementTierKey}' not found.`);
        return { unlocked: false };
      }
      
      const newEarnedItemData = {
        _id: new Types.ObjectId(),
        itemModelId: firstTier._id,
        itemCode: achievementTierKey,
        itemType: 'Achievement' as const,
        earnedAt: new Date(),
        progress: {
          current: 0,
          target: firstTier.unlockConditions[0]?.targetValue || 1,
          tier: 1
        }
      };
      userAchievementDoc.earnedItems.push(newEarnedItemData);
      earnedItem = userAchievementDoc.earnedItems[userAchievementDoc.earnedItems.length - 1];
    }

    // 5. Ensure the item and its progress object exist before proceeding.
    if (!earnedItem?.progress) {
        console.error(`Achievement item '${achievementTierKey}' for user ${userId} is malformed or missing progress data.`);
        return { unlocked: false };
    }
    
    // 6. If max tier is completed, do nothing.
    if (masterAchievement.maxTier && earnedItem.progress.tier >= masterAchievement.maxTier && earnedItem.progress.current >= earnedItem.progress.target) {
        console.log(`User ${userId} has already completed all tiers for achievement '${achievementTierKey}'.`);
        await userAchievementDoc.save();
        return { unlocked: false };
    }

    // 7. Increment progress.
    earnedItem.progress.current += progressIncrement;
    console.log(`User ${userId} progress on '${achievementTierKey}': ${earnedItem.progress.current}/${earnedItem.progress.target}`);

    // 8. Check for tier-ups in a loop to handle multiple level-ups at once.
    let lastUnlockedTitle: string | undefined;
    let lastUnlockedTierLevel: number | undefined;
    while (earnedItem.progress.current >= earnedItem.progress.target) {
      const currentTierLevel = earnedItem.progress.tier;
      const currentTierAchievement = await AchievementModel.findOne({ tierKey: achievementTierKey, tierLevel: currentTierLevel });

      console.log(`User ${userId} unlocked tier ${currentTierLevel} of achievement '${achievementTierKey}'!`);
      if (currentTierAchievement?.points) {
          await this.awardPoints(userId, currentTierAchievement.points);
      }

      // Create in-app notification for unlocking this tier
      try {
        await NotificationModel.createNotification({
          recipientId: userObjectId,
          type: NotificationType.ACHIEVEMENT_UNLOCKED,
          channels: [NotificationChannel.IN_APP],
          context: {
            achievementId: currentTierAchievement?._id?.toString(),
            achievementName: currentTierAchievement?.title,
          }
        });
      } catch (e) {
        console.warn(`[GamificationService] Failed to create achievement notification for user ${userId}:`, e);
      }

      lastUnlockedTitle = currentTierAchievement?.title || lastUnlockedTitle;
      lastUnlockedTierLevel = currentTierLevel;

      const nextTierLevel = currentTierLevel + 1;

      // Check if this was the last tier.
      if (masterAchievement.maxTier && nextTierLevel > masterAchievement.maxTier) {
          console.log(`User ${userId} has completed all tiers for achievement '${achievementTierKey}'.`);
          break; 
      }

      const nextTier = await AchievementModel.findOne({ tierKey: achievementTierKey, tierLevel: nextTierLevel });
      if (nextTier) {
        earnedItem.progress.tier = nextTierLevel;
        earnedItem.progress.target = nextTier.unlockConditions[0]?.targetValue || 1;
        earnedItem.itemModelId = nextTier._id;
        console.log(`User ${userId} advanced to tier ${nextTierLevel} of '${achievementTierKey}'. New target: ${earnedItem.progress.target}`);
      } else {
        // Fallback in case maxTier is not set correctly.
        console.log(`User ${userId} has completed all tiers for achievement '${achievementTierKey}'.`);
        break;
      }
    }

    // 9. Save the changes.
    await userAchievementDoc.save();

    return { unlocked: !!lastUnlockedTitle, unlockedTierLevel: lastUnlockedTierLevel, unlockedTitle: lastUnlockedTitle };
    } catch (err: any) {
      console.error('[GamificationService.trackAchievementProgress] Error:', err);
      return { unlocked: false, error: err?.message || 'unknown_error' };
    }
  }

  /**
   * Gets the gamification summary for a user.
   * @param userId The ID of the user.
   * @returns An object with points and achievements.
   */
  public async getGamificationSummary(userId: string) {
    let userGamification = await this.findOrCreateGamification(userId);

    // Self-heal: ถ้า XP เกิน threshold ให้ normalize และอ่านข้อมูลล่าสุดกลับมา
    try {
      const needsNormalize =
        userGamification.gamification.experiencePoints >=
        (userGamification.gamification.nextLevelXPThreshold || 100);
      if (needsNormalize) {
        const changed = await this.normalizeLevelIfNeeded(userId);
        if (changed) {
          userGamification = (await UserGamificationModel.findOne({ userId: new Types.ObjectId(userId) }))!;
        }
      }
    } catch (e) {
      console.warn('[GamificationService] normalizeLevelIfNeeded failed:', e);
    }

    // Fetch earned achievements from UserAchievement (source of truth)
    const userAchievement = await UserAchievementModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate({ path: 'earnedItems.itemModelId', model: 'Achievement', select: 'title description tierKey tierLevel' })
      .lean();

    const achievements = (userAchievement?.earnedItems || [])
      .filter((item: any) => item.itemType === 'Achievement' && item.itemModelId)
      .map((item: any) => ({
        _id: item.itemModelId._id,
        title: item.itemModelId.title,
        description: item.itemModelId.description,
        // Optional: include progress if needed by clients
        progress: item.progress || null,
      }));

    return {
      experiencePoints: userGamification.gamification.experiencePoints,
      achievements,
      level: userGamification.gamification.level,
    };
  }
}

export const gamificationService = new GamificationService();