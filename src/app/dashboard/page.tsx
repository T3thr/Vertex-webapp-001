// src/app/dashboard/page.tsx
// Writer Dashboard หน้าหลักสำหรับนักเขียน - Server Side Rendered 100% - อัพเกรดใหม่
// ใช้ Server Components เป็นหลักและ import Client Components เพื่อความเร็วในการแสดงผล
// รองรับ global.css theme system และมี interactive elements ที่สวยงาม
// อัพเกรดใหม่: Dynamic Tabs แทน URL-based navigation

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions, SessionUser } from '@/app/api/auth/[...nextauth]/options'; // Import SessionUser
import mongoose, { Types } from "mongoose";
import dbConnect from '@/backend/lib/mongodb';

// Import ทุก Model ที่ต้องใช้ในการดึงข้อมูล
import UserModel, { IAccount, IUser } from '@/backend/models/User';
import UserProfileModel, { IUserProfile, IUserSocialStats } from '@/backend/models/UserProfile';
import UserTrackingModel, { IUserTrackingStats } from '@/backend/models/UserTracking';
import UserGamificationModel, { IUserWallet } from '@/backend/models/UserGamification';
import UserAchievementModel from '@/backend/models/UserAchievement'; // <-- Import UserAchievementModel
import UserSecurityModel, { IUserVerification } from '@/backend/models/UserSecurity';
import WriterStatsModel, { IWriterStatsDoc as IWriterStats, IUserDonationSettings, IActiveNovelPromotionSummary, INovelPerformanceStats, ITrendingNovelSummary } from '@/backend/models/WriterStats';
import UserSettingsModel, { IUserSettings as IUserPreferences, IUserContentPrivacyPreferences, IVisualNovelGameplayPreferences } from '@/backend/models/UserSettings';
import NovelModel, { IMonetizationSettings, INarrativeFocus, INovel, INovelStats, IPromotionDetails, IPsychologicalAnalysisConfig, IThemeAssignment, ITrendingStats } from '@/backend/models/Novel';
import EarningAnalyticModel, { IEarningAnalytic } from '@/backend/models/EarningAnalytic';
import WriterApplicationModel, { IApplicantMessage, IReviewNote, IStatusChange, IWriterApplication } from '@/backend/models/WriterApplication';
import DonationApplicationModel, { IDonationApplication } from '@/backend/models/DonationApplication';
import EarningTransactionModel, { IEarningTransaction } from '@/backend/models/EarningTransaction';
import CategoryModel, { ICategory } from '@/backend/models/Category';
import LevelModel, { ILevel } from '@/backend/models/Level';
import AchievementModel from '@/backend/models/Achievement'; // Import AchievementModel

// Client Components สำหรับ Interactive UI
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import SidebarDashboard from '@/components/dashboard/SidebarDashboard';

// Helper function to deeply serialize Mongoose documents/objects (คงเดิม)
function serializeDocument<T>(doc: any): T {
  if (!doc) {
    return doc;
  }
  const plainDoc = typeof doc.toObject === 'function' ? doc.toObject({ virtuals: true, getters: true }) : { ...doc };
  const serialize = (current: any): any => {
    if (current === null || current === undefined) {
      return current;
    }
    if (current instanceof Types.ObjectId) {
      return current.toString();
    }
    if (current instanceof Date) {
      return current.toISOString();
    }
    if (Array.isArray(current)) {
      return current.map(item => serialize(item));
    }
    if (typeof current === 'object') {
      const res: { [key: string]: any } = {};
      for (const key in current) {
        if (Object.prototype.hasOwnProperty.call(current, key)) {
           if (key === '_id' && current[key] instanceof Types.ObjectId) {
            res._id = current[key].toString();
            res.id = current[key].toString();
          } else {
            res[key] = serialize(current[key]);
          }
        }
      }
      if (!res.id && current.id instanceof Types.ObjectId) {
        res.id = current.id.toString();
      } else if (!res.id && current._id && !(current._id instanceof Types.ObjectId)) {
        res.id = current._id.toString();
      }
      return res;
    }
    return current;
  };
  return serialize(plainDoc) as T;
}

// Interface สำหรับข้อมูลที่ส่งไปยัง Client Components (Serialized Types) - (คงเดิม)
export interface SerializedUser extends Omit<IUser, '_id' | 'writerStats' | 'gamification' | 'accounts' | 'preferences' | 'profile' | 'trackingStats' | 'socialStats' | 'wallet' | 'verification' | 'donationSettings' | 'createdAt' | 'updatedAt' | 'lastLoginAt' | 'emailVerifiedAt' | 'bannedUntil' | 'deletedAt' | 'writerStats.novelPerformanceSummaries' | 'writerStats.activeNovelPromotions' | 'writerStats.trendingNovels' | 'preferences.contentAndPrivacy.preferredGenres' | 'preferences.contentAndPrivacy.blockedGenres' | 'preferences.contentAndPrivacy.blockedAuthors' | 'preferences.contentAndPrivacy.blockedNovels' | 'preferences.visualNovelGameplay.preferredArtStyles' | 'preferences.visualNovelGameplay.preferredGameplayMechanics' | 'gamification.currentLevelObject' | 'gamification.achievements' | 'gamification.showcasedItems' | 'gamification.primaryDisplayBadge' | 'gamification.secondaryDisplayBadges'> {
  _id: string;
  id: string;
  writerStats?: Omit<IWriterStats, 'novelPerformanceSummaries' | 'activeNovelPromotions' | 'trendingNovels'> & {
    novelPerformanceSummaries?: (Omit<INovelPerformanceStats, 'novelId'> & { novelId?: string })[];
    activeNovelPromotions?: (Omit<IActiveNovelPromotionSummary, 'novelId'> & { novelId: string })[];
    trendingNovels?: (Omit<ITrendingNovelSummary, 'novelId'> & { novelId: string })[];
  };
  gamification: Omit<SessionUser['gamification'], 'currentLevelObject'> & {
    currentLevelObject?: string | (Omit<ILevel, '_id' | 'createdAt' | 'updatedAt'> & { _id: string, id: string, createdAt?: string, updatedAt?: string });
  };
  accounts: (Omit<IAccount, '_id'> & { _id?: string, id?: string })[];
  preferences: Omit<IUserPreferences, 'contentAndPrivacy' | 'visualNovelGameplay'> & {
    contentAndPrivacy: Omit<IUserContentPrivacyPreferences, 'preferredGenres' | 'blockedGenres' | 'blockedAuthors' | 'blockedNovels'> & {
        preferredGenres: string[];
        blockedGenres?: string[];
        blockedAuthors?: string[];
        blockedNovels?: string[];
    };
    visualNovelGameplay?: Omit<IVisualNovelGameplayPreferences, 'preferredArtStyles' | 'preferredGameplayMechanics'> & {
        preferredArtStyles?: string[];
        preferredGameplayMechanics?: string[];
    }
  };
  profile: Omit<IUserProfile, 'dateOfBirth'> & { dateOfBirth?: string };
  trackingStats: Omit<IUserTrackingStats, 'joinDate' | 'lastNovelReadAt' | 'firstLoginAt' | 'lastNovelReadId'> & {
    joinDate: string;
    lastNovelReadAt?: string;
    firstLoginAt?: string;
    lastNovelReadId?: string;
  };
  socialStats: IUserSocialStats;
  wallet: IUserWallet;
  verification?: Omit<IUserVerification, 'kycSubmittedAt' | 'kycReviewedAt' | 'kycVerifiedAt' | 'kycApplicationId' | 'writerApplicationId'> & {
    kycSubmittedAt?: string;
    kycReviewedAt?: string;
    kycVerifiedAt?: string;
    kycApplicationId?: string;
    writerApplicationId?: string;
  };
  donationSettings?: Omit<IUserDonationSettings, 'activeAuthorDirectDonationAppId'> & {
    activeAuthorDirectDonationAppId?: string;
  };
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  emailVerifiedAt?: string;
  bannedUntil?: string;
  deletedAt?: string;
}

export interface SerializedNovel extends Omit<INovel, '_id' | 'author' | 'coAuthors' | 'themeAssignment' | 'narrativeFocus' | 'ageRatingCategoryId' | 'language' | 'firstEpisodeId' | 'relatedNovels' | 'seriesId' | 'deletedByUserId' | 'stats' | 'monetizationSettings' | 'psychologicalAnalysisConfig' | 'publishedAt' | 'scheduledPublicationDate' | 'lastContentUpdatedAt' | 'deletedAt' | 'createdAt' | 'updatedAt'> {
  _id: string;
  id: string;
  author: string;
  coAuthors?: string[];
  themeAssignment: Omit<IThemeAssignment, 'mainTheme' | 'subThemes' | 'moodAndTone' | 'contentWarnings'> & {
    mainTheme: { categoryId: string | (Omit<ICategory, '_id'> & {_id: string, id: string}), customName?: string };
    subThemes?: { categoryId: string, customName?: string }[];
    moodAndTone?: string[];
    contentWarnings?: string[];
  };
  narrativeFocus?: Omit<INarrativeFocus, 'narrativePacingTags' | 'primaryConflictTypes' | 'narrativePerspective' | 'storyArcStructure' | 'artStyle' | 'gameplayMechanics' | 'interactivityLevel' | 'playerAgencyLevel' | 'lengthTag' | 'commonTropes' | 'targetAudienceProfileTags' | 'avoidIfYouDislikeTags'> & {
    narrativePacingTags?: string[];
    primaryConflictTypes?: string[];
    narrativePerspective?: string;
    storyArcStructure?: string;
    artStyle?: string;
    gameplayMechanics?: string[];
    interactivityLevel?: string;
    playerAgencyLevel?: string;
    lengthTag?: string;
    commonTropes?: string[];
    targetAudienceProfileTags?: string[];
    avoidIfYouDislikeTags?: string[];
  };
  ageRatingCategoryId?: string | (Omit<ICategory, '_id'> & {_id: string, id: string});
  language: string | (Omit<ICategory, '_id'> & {_id: string, id: string});
  firstEpisodeId?: string;
  relatedNovels?: string[];
  seriesId?: string;
  deletedByUserId?: string;
  stats: Omit<INovelStats, 'lastPublishedEpisodeAt' | 'trendingStats'> & {
    lastPublishedEpisodeAt?: string;
    trendingStats?: Omit<ITrendingStats, 'lastTrendingScoreUpdate'> & {
        lastTrendingScoreUpdate?: string;
    }
  };
  monetizationSettings: Omit<IMonetizationSettings, 'donationApplicationId' | 'activePromotion'> & {
    donationApplicationId?: string;
    activePromotion?: Omit<IPromotionDetails, 'promotionStartDate' | 'promotionEndDate'> & {
        promotionStartDate?: string;
        promotionEndDate?: string;
    }
  };
  psychologicalAnalysisConfig: Omit<IPsychologicalAnalysisConfig, 'sensitiveChoiceCategoriesBlocked' | 'lastAnalysisDate'> & {
    sensitiveChoiceCategoriesBlocked?: string[];
    lastAnalysisDate?: string;
  };
  publishedAt?: string;
  scheduledPublicationDate?: string;
  lastContentUpdatedAt: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SerializedWriterApplication extends Omit<IWriterApplication, '_id' | 'applicantId' | 'preferredGenres' | 'statusHistory' | 'reviewNotes' | 'applicantMessages' | 'submittedAt' | 'updatedAt' | 'reviewedAt'> {
  _id: string;
  id: string;
  applicantId: string;
  preferredGenres: string[];
  statusHistory: (Omit<IStatusChange, 'changedBy' | 'changedAt'> & { changedBy?: string, changedAt: string })[];
  reviewNotes: (Omit<IReviewNote, 'reviewerId' | 'createdAt'> & { reviewerId: string, createdAt: string })[];
  applicantMessages: (Omit<IApplicantMessage, 'sentAt'> & { sentAt: string })[];
  submittedAt: string;
  updatedAt: string;
  reviewedAt?: string;
}

export interface SerializedDonationApplication extends Omit<IDonationApplication, '_id' | 'userId' | 'reviewedBy' | 'submittedAt' | 'reviewedAt' | 'lastStatusUpdateAt' | 'createdAt' | 'updatedAt'> {
  _id: string;
  id: string;
  userId: string;
  reviewedBy?: string;
  submittedAt: string;
  reviewedAt?: string;
  lastStatusUpdateAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SerializedEarningTransaction extends Omit<IEarningTransaction, '_id' | 'primaryUserId' | 'payer' | 'payee' | 'relatedNovelId' | 'relatedEpisodeId' | 'relatedPurchaseId' | 'relatedDonationId' | 'relatedPaymentId' | 'relatedSourceUserId' | 'relatedTargetUserId' | 'relatedAdminId' | 'transactionDate' | 'processedAt' | 'createdAt' | 'updatedAt'> {
  _id: string;
  id: string;
  primaryUserId?: string;
  payer?: { userId?: string, role: string };
  payee?: { userId?: string, role: string };
  relatedNovelId?: string | (Omit<INovel, '_id' | 'title' | 'coverImageUrl'> & {_id: string, id: string, title: string, coverImageUrl?:string});
  relatedEpisodeId?: string;
  relatedPurchaseId?: string;
  relatedDonationId?: string;
  relatedPaymentId?: string;
  relatedSourceUserId?: string;
  relatedTargetUserId?: string;
  relatedAdminId?: string;
  transactionDate: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SerializedEarningAnalytic extends Omit<IEarningAnalytic, '_id' | 'targetId' | 'novelId' | 'summaryDate' | 'summaryEndDate' | 'lastRecalculatedAt' | 'createdAt' | 'updatedAt'> {
  [x: string]: any;
  _id: string;
  id: string;
  targetId?: string;
  novelId?: string;
  summaryDate: string;
  summaryEndDate?: string;
  lastRecalculatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WriterDashboardData {
  user: SerializedUser;
  novels: SerializedNovel[];
  writerApplication: SerializedWriterApplication | null;
  donationApplication: SerializedDonationApplication | null;
  recentTransactions: SerializedEarningTransaction[];
  earningAnalytics: SerializedEarningAnalytic[];
  isWriter: boolean;
  canApplyForWriter: boolean;
  totalStats: {
    totalNovels: number;
    totalNovelsPublished: number;
    totalEpisodes: number;
    totalViews: number;
    totalEarnings: number;
    averageRating: number;
    totalFollowers: number;
  };
}

/**
 * ฟังก์ชันสำหรับดึงข้อมูล Writer Dashboard จาก MongoDB
 * รองรับการจัดการข้อผิดพลาดและ performance optimization
 * @param userId - ID ของผู้ใช้
 * @returns ข้อมูลครบครันสำหรับ Dashboard
 */
async function getWriterDashboardData(userId: string): Promise<WriterDashboardData> {
  try {
    await dbConnect();
    console.log(`📊 [Dashboard] เริ่มดึงข้อมูลสำหรับผู้ใช้ ${userId}`);

    // Step 1: ดึงข้อมูลทั้งหมดที่เกี่ยวข้องกับผู้ใช้แบบขนาน (Parallel) โดยใช้ Promise.all - เพิ่มประสิทธิภาพ
    const [
        coreUser,
        userProfile,
        userGamification,
        userAchievements,
        allTier1Achievements, // <-- Fetch all base achievements
        userSettings,
        userTracking,
        userSecurity,
        writerStats,
    ] = await Promise.all([
        UserModel.findById(userId).lean(),
        UserProfileModel.findOne({ userId: new Types.ObjectId(userId) }).lean(),
        // Populate ที่ Model ที่ถูกต้อง (UserGamificationModel)
        UserGamificationModel.findOne({ userId: new Types.ObjectId(userId) })
            .populate({
                path: 'gamification.achievements', // <-- Keep this for old achievements
                model: 'Achievement',
                select: 'title description customIconUrl rarity tierKey achievementCode' // <-- ADD achievementCode
            })
            .populate({
                path: 'gamification.currentLevelObject',
                model: LevelModel,
                select: 'levelNumber title xpRequiredForThisLevel xpToNextLevelFromThis description iconUrl themeColor isActive rewardsOnReach'
            })
            .lean(),
        // <-- Start: Add query for UserAchievementModel -->
        UserAchievementModel.findOne({ userId: new Types.ObjectId(userId) })
            .populate({
                path: 'earnedItems.itemModelId',
                model: 'Achievement',
                select: 'title description customIconUrl rarity tierKey'
            })
            .lean(),
        // <-- End: Add query for UserAchievementModel -->
        AchievementModel.find({ tierLevel: 1 }).lean(), // <-- Query for all Tier 1 achievements
        UserSettingsModel.findOne({ userId: new Types.ObjectId(userId) }).lean(),
        UserTrackingModel.findOne({ userId: new Types.ObjectId(userId) }).lean(),
        UserSecurityModel.findOne({ userId: new Types.ObjectId(userId) }).lean(),
        // Populate ที่ WriterStatsModel
        WriterStatsModel.findOne({ userId: new Types.ObjectId(userId) })
            .populate({
                path: 'novelPerformanceSummaries.novelId',
                model: NovelModel,
                select: 'title slug coverImageUrl'
            })
            .lean(),
    ]);

    // Step 2: ตรวจสอบว่ามีผู้ใช้หลัก (Core User) อยู่จริง
    if (!coreUser) {
      throw new Error('❌ ไม่พบข้อมูลผู้ใช้ในระบบ');
    }
    
    // --- [DEBUG LOGGING START] ---
    console.log("--- DEBUG: Raw Data from DB ---");
    console.log("UserAchievements:", JSON.stringify(userAchievements, null, 2));
    console.log("UserGamification Achievements:", JSON.stringify(userGamification?.gamification.achievements, null, 2));
    console.log("All Tier 1 Achievements:", JSON.stringify(allTier1Achievements, null, 2));
    // --- [DEBUG LOGGING END] ---

    // --- Start: New, more robust achievement combination logic ---
    const legacyToTieredMap: { [key: string]: string } = {
        'FIRST_STORY_COMPLETED': 'FIRST_READER', // Maps old achievement code to new tierKey
    };

    const combinedAchievements = new Map<string, any>();

    // 1. Initialize map with all available Tier 1 achievements, showing 0 progress
    allTier1Achievements.forEach((ach: any) => {
        if (ach.tierKey) {
            combinedAchievements.set(ach.tierKey, {
                ...serializeDocument(ach),
                progress: {
                    current: 0,
                    target: ach.unlockConditions[0]?.targetValue || 1,
                    tier: 1,
                },
            });
        }
    });

    console.log("--- DEBUG: After Step 1 (Init Tier 1) ---", JSON.stringify(Array.from(combinedAchievements.values()), null, 2));

    // 2. Update the map with the user's actual progress for tiered achievements
    userAchievements?.earnedItems.forEach((item: any) => {
      if (item.itemModelId && item.itemCode) { // item.itemCode is the tierKey
        // The itemModelId is populated with the full achievement document for the user's current tier
        combinedAchievements.set(item.itemCode, {
           ...serializeDocument(item.itemModelId),
           progress: item.progress,
        });
      }
    });

    console.log("--- DEBUG: After Step 2 (User Progress) ---", JSON.stringify(Array.from(combinedAchievements.values()), null, 2));

    // 3. Process legacy achievements, adding them only if not replaced by a tiered one
    userGamification?.gamification.achievements.forEach((ach: any) => {
      const tierKeyForLegacy = legacyToTieredMap[ach.achievementCode];
      const canonicalKey = tierKeyForLegacy || ach.achievementCode;

      // Only add the legacy achievement if a tiered version doesn't already exist in our map
      if (!combinedAchievements.has(canonicalKey)) {
          combinedAchievements.set(canonicalKey, {
              ...serializeDocument(ach),
              progress: null, // Legacy achievements have no progress
          });
      }
    });
    
    const finalAchievements = Array.from(combinedAchievements.values());
    console.log("--- DEBUG: After Step 3 (Legacy & Final Combined) ---", JSON.stringify(finalAchievements, null, 2));
    // --- End: New achievement logic ---
    
    // Step 3: รวมข้อมูลทั้งหมดเป็น Object เดียวเพื่อส่งให้ serializeDocument
    const combinedUserDoc = {
        ...(coreUser as any), // Cast to any to allow adding properties
        profile: userProfile,
        socialStats: userProfile?.socialStats,
        trackingStats: userTracking?.trackingStats,
        preferences: userSettings,
        wallet: userGamification?.wallet,
        gamification: { // Rebuild gamification object
          ...userGamification?.gamification,
          achievements: finalAchievements,
        },
        verification: userSecurity?.verification,
        donationSettings: writerStats?.donationSettings,
        writerStats: writerStats,
    };
    
    const user = serializeDocument<SerializedUser>(combinedUserDoc);

    console.log(`✅ [Dashboard] พบข้อมูลผู้ใช้: ${user.username || user.email}`);

    const isWriter = user.roles?.includes('Writer') || false;
    console.log(`📝 [Dashboard] สถานะ Writer: ${isWriter ? 'ใช่' : 'ไม่ใช่'}`);
    
    // ปรับปรุงการดึงข้อมูลนิยายให้เร็วขึ้น - ลดข้อมูลที่ไม่จำเป็น
    const novelsQuery = NovelModel.find({ author: userId, isDeleted: { $ne: true } })
        .select('title slug status publishedEpisodesCount stats themeAssignment ageRatingCategoryId language lastContentUpdatedAt createdAt updatedAt coverImageUrl bannerImageUrl synopsis')
        .populate<{ themeAssignment : { mainTheme: { categoryId: ICategory | null } } }>({
            path: 'themeAssignment.mainTheme.categoryId',
            model: CategoryModel,
            select: 'name'
        })
        .sort({ lastContentUpdatedAt: -1 })
        .limit(100)
        .lean();

    const novelDocs = await novelsQuery;
    const novels = novelDocs.map(novel => serializeDocument<SerializedNovel>(novel));
    console.log(`📚 [Dashboard] พบนิยาย ${novels.length} เรื่อง`);

    let writerApplication: SerializedWriterApplication | null = null;
    try {
      const appDoc = await WriterApplicationModel.findOne({ applicantId: userId }).sort({ submittedAt: -1 }).lean();
      if (appDoc) {
        writerApplication = serializeDocument<SerializedWriterApplication>(appDoc);
      }
      console.log(`📄 [Dashboard] ใบสมัครนักเขียน: ${writerApplication ? writerApplication.status : 'ไม่มี'}`);
    } catch (appError) {
      console.warn(`⚠️ [Dashboard] ไม่สามารถดึงข้อมูลใบสมัครนักเขียนได้:`, appError);
    }
    
    let donationApplication: SerializedDonationApplication | null = null;
    if (isWriter) {
      try {
        const donationDoc = await DonationApplicationModel.findOne({ userId: userId, status: 'approved' }).lean();
        if (donationDoc) {
            donationApplication = serializeDocument<SerializedDonationApplication>(donationDoc);
        }
        console.log(`💝 [Dashboard] ใบสมัครรับบริจาค: ${donationApplication ? 'อนุมัติแล้ว' : 'ยังไม่มี'}`);
      } catch (donationError) {
        console.warn(`⚠️ [Dashboard] ไม่สามารถดึงข้อมูลใบสมัครบริจาคได้:`, donationError);
      }
    }

    let recentTransactions: SerializedEarningTransaction[] = [];
    try {
      const transactionDocs = await EarningTransactionModel.find({
          $or: [
              { primaryUserId: new Types.ObjectId(userId) },
              { 'payer.userId': userId },
              { 'payee.userId': userId }
          ]
        })
        .select('amount description transactionType status transactionDate createdAt relatedNovelId')
        .sort({ createdAt: -1 })
        .limit(10)
        .populate<{ relatedNovelId: INovel | null }>({ path: 'relatedNovelId', model: NovelModel, select: 'title slug' })
        .lean();
      recentTransactions = transactionDocs.map(tx => serializeDocument<SerializedEarningTransaction>(tx));
      console.log(`💰 [Dashboard] พบธุรกรรม ${recentTransactions.length} รายการ`);
    } catch (transactionError) {
      console.warn(`⚠️ [Dashboard] ไม่สามารถดึงข้อมูลธุรกรรมได้:`, transactionError);
    }

    let earningAnalytics: SerializedEarningAnalytic[] = [];
    if (isWriter) {
      try {
        const analyticsDocs = await EarningAnalyticModel.find({ targetType: 'writer', targetId: new Types.ObjectId(userId) })
            .sort({ summaryDate: -1 })
            .limit(12)
            .lean();
        earningAnalytics = analyticsDocs.map(analytic => serializeDocument<SerializedEarningAnalytic>(analytic));
        console.log(`📈 [Dashboard] พบข้อมูลวิเคราะห์ ${earningAnalytics.length} รายการ`);
      } catch (analyticsError) {
        console.warn(`⚠️ [Dashboard] ไม่สามารถดึงข้อมูลวิเคราะห์ได้:`, analyticsError);
      }
    }

    const totalStats = {
      totalNovels: novels.length,
      totalNovelsPublished: user.writerStats?.totalNovelsPublished || 0,
      totalEpisodes: Array.isArray(novels) ? novels.reduce((sum, novel) => sum + (novel.publishedEpisodesCount || 0), 0) : 0,
      totalViews: Array.isArray(novels) ? novels.reduce((sum, novel) => sum + (novel.stats?.viewsCount || 0), 0) : 0,
      totalEarnings: user.writerStats?.totalEarningsToDate || 0,
      averageRating: novels.length > 0 && Array.isArray(novels)
        ? Number((novels.reduce((sum, novel) => sum + (novel.stats?.averageRating || 0), 0) / novels.length).toFixed(1))
        : 0,
      totalFollowers: Array.isArray(novels) ? novels.reduce((sum, novel) => sum + (novel.stats?.followersCount || 0), 0) : 0
    };
    console.log(`📊 [Dashboard] สถิติรวม:`, totalStats);

    const canApplyForWriter = !isWriter && (!writerApplication || ['REJECTED', 'CANCELLED'].includes(writerApplication.status.toUpperCase()));
    console.log(`✅ [Dashboard] ดึงข้อมูลสำเร็จครบถ้วน`);

    return {
      user,
      novels,
      writerApplication,
      donationApplication,
      recentTransactions,
      earningAnalytics,
      isWriter,
      canApplyForWriter,
      totalStats: { ...totalStats, totalNovelsPublished: totalStats.totalNovelsPublished || 0 }
    };
  } catch (error) {
    console.error('❌ [WriterDashboard] เกิดข้อผิดพลาดในการดึงข้อมูล:', error);
    if (error instanceof Error) {
      if (error.message.includes('ไม่พบข้อมูลผู้ใช้')) {
        throw new Error('ไม่พบบัญชีผู้ใช้ กรุณาเข้าสู่ระบบใหม่');
      } else if (error.message.includes('connection')) {
        throw new Error('ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
      }
      throw error;
    }
    throw new Error('เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ กรุณาติดต่อทีมสนับสนุน');
  }
}

// UI Components - ปรับปรุงให้ไม่ใช้ skeleton loading เพื่อความเร็ว
function DashboardLoading() {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" variant="writer" text="กำลังโหลด Dashboard..." />
        </div>
      </div>
    );
}

function DashboardError({ error, retry }: { error: string; retry?: () => void }) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-card-foreground mb-4">เกิดข้อผิดพลาด</h1>
            <p className="text-muted-foreground mb-6 leading-relaxed">{error}</p>
            <div className="space-y-3">
              {retry && (<button onClick={retry} className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary-hover transition-colors">ลองใหม่อีกครั้ง</button>)}
              <button onClick={() => window.location.href = '/'} className="w-full bg-secondary text-secondary-foreground px-6 py-3 rounded-lg font-medium hover:bg-accent hover:text-accent-foreground transition-colors">กลับหน้าแรก</button>
            </div>
          </div>
        </div>
      </div>
    );
}

// Main Dashboard Content Component & Page Component (อัพเกรดใหม่ด้วย Dynamic Tabs)
async function DashboardContent({ userId, searchParams }: { userId: string; searchParams?: { [key: string]: string | string[] | undefined } }) {
  try {
    const data = await getWriterDashboardData(userId);
    
    return (
      <div className="min-h-screen bg-background">
        <SidebarDashboard 
          {...data} 
          initialCreateModal={searchParams?.create === 'true'}
        />
      </div>
    );
  } catch (error: any) {
    console.error('❌ Dashboard Error:', error);
    return <DashboardError error={error.message} />;
  }
}

export default async function WriterDashboardPage({ 
  searchParams 
}: { 
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/dashboard');
  }

  // Await searchParams in Next.js 15
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <ErrorBoundary>
      <Suspense fallback={<DashboardLoading />}>
        <DashboardContent userId={session.user.id} searchParams={resolvedSearchParams} />
      </Suspense>
    </ErrorBoundary>
  );
}

// Metadata และ Dynamic Rendering config (คงเดิม)
export const metadata = {
  title: 'Writer Dashboard - DivWy',
  description: 'แดชบอร์ดสำหรับนักเขียนบน DivWy - จัดการนิยาย ดูสถิติ และติดตามรายได้',
  robots: 'noindex, nofollow',
  openGraph: {
    title: 'Writer Dashboard - DivWy',
    description: 'จัดการผลงานและติดตามความสำเร็จของคุณในฐานะนักเขียนบน DivWy',
    type: 'website',
    locale: 'th_TH',
  },
};
export const dynamic = 'force-dynamic';
export const revalidate = 0;
