// src/app/dashboard/page.tsx
// Writer Dashboard หน้าหลักสำหรับนักเขียน - Server Side Rendered 100% - อัพเกรดแล้ว
// ใช้ Server Components เป็นหลักและ import Client Components เพื่อความเร็วในการแสดงผล
// รองรับ global.css theme system และมี interactive elements ที่สวยงาม

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions, SessionUser } from '@/app/api/auth/[...nextauth]/options'; // Import SessionUser
import mongoose, { Types } from "mongoose";
import dbConnect from '@/backend/lib/mongodb';
import UserModel, { IAccount, IActiveNovelPromotionSummary, INovelPerformanceStats, ITrendingNovelSummary, IUser, IUserContentPrivacyPreferences, IUserDonationSettings, IUserPreferences, IUserProfile, IUserSocialStats, IUserTrackingStats, IUserVerification, IUserWallet, IVisualNovelGameplayPreferences, IWriterStats } from '@/backend/models/User';
import NovelModel, { IMonetizationSettings, INarrativeFocus, INovel, INovelStats, IPromotionDetails, IPsychologicalAnalysisConfig, IThemeAssignment, ITrendingStats } from '@/backend/models/Novel';
import EarningAnalyticModel, { IEarningAnalytic } from '@/backend/models/EarningAnalytic';
import WriterApplicationModel, { IApplicantMessage, IReviewNote, IStatusChange, IWriterApplication } from '@/backend/models/WriterApplication';
import DonationApplicationModel, { IDonationApplication } from '@/backend/models/DonationApplication';
import EarningTransactionModel, { IEarningTransaction } from '@/backend/models/EarningTransaction';
import CategoryModel, { ICategory } from '@/backend/models/Category'; // Make sure this import is present!
import LevelModel, { ILevel } from '@/backend/models/Level';


// Client Components สำหรับ Interactive UI - อัพเกรดแล้ว
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import WriterProfileSection from '@/components/dashboard/WriterProfileSection';
import StatsOverview from '@/components/dashboard/StatsOverview';
import TabNavigation from '@/components/dashboard/TabNavigation';
import NovelTab from '@/components/dashboard/NovelTab';
import AnalyticsTab from '@/components/dashboard/AnalyticsTab';
// WriterApplicationForm is now defined in its own file
// import WriterApplicationForm from '@/components/dashboard/WriterApplicationForm';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

// Helper function to deeply serialize Mongoose documents/objects
// This ensures all ObjectIds are strings and Dates are ISO strings.
function serializeDocument<T>(doc: any): T {
  if (!doc) {
    return doc;
  }

  // If it's a Mongoose document, convert it to a plain object first
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
            // Ensure _id is also stringified, and add 'id' property
            res._id = current[key].toString();
            res.id = current[key].toString();
          } else {
            res[key] = serialize(current[key]);
          }
        }
      }
      // If 'id' was not set via '_id' conversion but an 'id' field exists that is an ObjectId
      if (!res.id && current.id instanceof Types.ObjectId) {
        res.id = current.id.toString();
      } else if (!res.id && current._id && !(current._id instanceof Types.ObjectId)) {
        // If _id exists but wasn't an ObjectId, ensure 'id' is also its string form
        res.id = current._id.toString();
      }


      return res;
    }
    return current;
  };

  return serialize(plainDoc) as T;
}


// Interface สำหรับข้อมูลที่ส่งไปยัง Client Components (ใช้ serialized types)
export interface SerializedUser extends Omit<IUser, '_id' | 'writerStats' | 'gamification' | 'accounts' | 'preferences' | 'profile' | 'trackingStats' | 'socialStats' | 'wallet' | 'verification' | 'donationSettings' | 'createdAt' | 'updatedAt' | 'lastLoginAt' | 'emailVerifiedAt' | 'bannedUntil' | 'deletedAt' | 'writerStats.novelPerformanceSummaries' | 'writerStats.activeNovelPromotions' | 'writerStats.trendingNovels' | 'preferences.contentAndPrivacy.preferredGenres' | 'preferences.contentAndPrivacy.blockedGenres' | 'preferences.contentAndPrivacy.blockedAuthors' | 'preferences.contentAndPrivacy.blockedNovels' | 'preferences.visualNovelGameplay.preferredArtStyles' | 'preferences.visualNovelGameplay.preferredGameplayMechanics' | 'gamification.currentLevelObject' | 'gamification.achievements' | 'gamification.showcasedItems' | 'gamification.primaryDisplayBadge' | 'gamification.secondaryDisplayBadges'> {
  _id: string;
  id: string;
  writerStats?: Omit<IWriterStats, 'novelPerformanceSummaries' | 'activeNovelPromotions' | 'trendingNovels'> & {
    novelPerformanceSummaries?: (Omit<INovelPerformanceStats, 'novelId'> & { novelId?: string })[];
    activeNovelPromotions?: (Omit<IActiveNovelPromotionSummary, 'novelId'> & { novelId: string })[];
    trendingNovels?: (Omit<ITrendingNovelSummary, 'novelId'> & { novelId: string })[];
  };
  gamification: Omit<SessionUser['gamification'], 'currentLevelObject'> & { // Using SessionUser gamification structure
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
  relatedNovelId?: string | (Omit<INovel, '_id' | 'title' | 'coverImageUrl'> & {_id: string, id: string, title: string, coverImageUrl?:string}); // Handle populated or just ID
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
    // เชื่อมต่อกับ MongoDB
    await dbConnect();
    console.log(`📊 [Dashboard] เริ่มดึงข้อมูลสำหรับผู้ใช้ ${userId}`);

    // ดึงข้อมูลผู้ใช้พร้อม populate ข้อมูลที่เกี่ยวข้อง
    const userDoc = await UserModel.findById(userId)
      .populate<{ gamification: { currentLevelObject: ILevel | null } }>({
        path: 'gamification.currentLevelObject',
        model: LevelModel, // Explicitly use LevelModel
        select: 'levelNumber title xpRequiredForThisLevel xpToNextLevelFromThis description iconUrl themeColor isActive rewardsOnReach' // Select specific fields
      })
      .populate<{ writerStats: { novelPerformanceSummaries : { novelId: INovel | null }[] } }>({ // Populate novelId in novelPerformanceSummaries
        path: 'writerStats.novelPerformanceSummaries.novelId',
        model: NovelModel,
        select: 'title slug coverImageUrl' // Select fields you need for the summary
      })
      .lean(); // Use lean for performance, serialization will handle the rest

    if (!userDoc) {
      throw new Error('❌ ไม่พบข้อมูลผู้ใช้ในระบบ');
    }
    const user = serializeDocument<SerializedUser>(userDoc);
    console.log(`✅ [Dashboard] พบข้อมูลผู้ใช้: ${user.username || user.email}`);

    // ตรวจสอบสถานะ Writer
    const isWriter = user.roles?.includes('Writer') || false;
    console.log(`📝 [Dashboard] สถานะ Writer: ${isWriter ? 'ใช่' : 'ไม่ใช่'}`);
    
    // ดึงข้อมูลนิยายทั้งหมดของผู้ใช้ พร้อม optimization
    const novelsQuery = NovelModel.find({ 
      author: userId, 
      isDeleted: { $ne: true } 
    })
    .populate<{ themeAssignment : { mainTheme: { categoryId: ICategory | null } } }>({ // Populate categoryId in themeAssignment.mainTheme
        path: 'themeAssignment.mainTheme.categoryId',
        model: CategoryModel, // Explicitly use CategoryModel
        select: 'name description iconUrl color' // Select specific fields from Category
    })
    .populate<{ ageRatingCategoryId: ICategory | null }>({
        path: 'ageRatingCategoryId',
        model: CategoryModel,
        select: 'name'
    })
    .populate<{ language: ICategory | null }>({
        path: 'language',
        model: CategoryModel,
        select: 'name'
    })
    // Add more populates for narrativeFocus fields if they are ObjectIds referencing Category
    .select('-longDescription -worldBuildingDetails -collaborationSettings -adminNotes') // ไม่ดึง field ใหญ่ๆ ที่ไม่จำเป็นสำหรับ list view
    .sort({ lastContentUpdatedAt: -1 })
    .limit(50) // จำกัดจำนวนเพื่อ performance
    .lean();

    const novelDocs = await novelsQuery;
    const novels = novelDocs.map(novel => serializeDocument<SerializedNovel>(novel));
    console.log(`📚 [Dashboard] พบนิยาย ${novels.length} เรื่อง`);

    // ดึงใบสมัครนักเขียนล่าสุด
    let writerApplication: SerializedWriterApplication | null = null;
    try {
      const appDoc = await WriterApplicationModel.findOne({
        applicantId: userId // Changed from userId to applicantId as per WriterApplication schema
      })
      .sort({ submittedAt: -1 })
      .lean();
      
      if (appDoc) {
        writerApplication = serializeDocument<SerializedWriterApplication>(appDoc);
      }
      console.log(`📄 [Dashboard] ใบสมัครนักเขียน: ${writerApplication ? writerApplication.status : 'ไม่มี'}`);
    } catch (appError) {
      console.warn(`⚠️ [Dashboard] ไม่สามารถดึงข้อมูลใบสมัครนักเขียนได้:`, appError);
    }
    
    // ดึงใบสมัครรับบริจาคที่ active (เฉพาะ Writer)
    let donationApplication: SerializedDonationApplication | null = null;
    if (isWriter) {
      try {
        const donationDoc = await DonationApplicationModel.findOne({
          userId: userId, // This is correct as per DonationApplication schema
          status: 'approved' // Assuming 'approved' is the correct status string
        }).lean();
        if (donationDoc) {
            donationApplication = serializeDocument<SerializedDonationApplication>(donationDoc);
        }
        console.log(`💝 [Dashboard] ใบสมัครรับบริจาค: ${donationApplication ? 'อนุมัติแล้ว' : 'ยังไม่มี'}`);
      } catch (donationError) {
        console.warn(`⚠️ [Dashboard] ไม่สามารถดึงข้อมูลใบสมัครบริจาคได้:`, donationError);
      }
    }

    // ดึงธุรกรรมล่าสุด 15 รายการ
    let recentTransactions: SerializedEarningTransaction[] = [];
    try {
      const transactionDocs = await EarningTransactionModel.find({
      $or: [
          { primaryUserId: new Types.ObjectId(userId) }, // Ensure ObjectIds for queries
          { 'payer.userId': new Types.ObjectId(userId) },
          { 'payee.userId': new Types.ObjectId(userId) }
      ]
    })
    .sort({ createdAt: -1 })
      .limit(15)
      .populate<{ relatedNovelId: INovel | null }>({ // Populate relatedNovelId
        path: 'relatedNovelId',
        model: NovelModel, // Explicitly use NovelModel
        select: 'title coverImageUrl slug' // Select specific fields
      })
      .lean();
      recentTransactions = transactionDocs.map(tx => serializeDocument<SerializedEarningTransaction>(tx));
      console.log(`💰 [Dashboard] พบธุรกรรม ${recentTransactions.length} รายการ`);
    } catch (transactionError) {
      console.warn(`⚠️ [Dashboard] ไม่สามารถดึงข้อมูลธุรกรรมได้:`, transactionError);
    }

    // ดึงข้อมูลสถิติรายได้ล่าสุด 12 เดือน
    let earningAnalytics: SerializedEarningAnalytic[] = [];
    if (isWriter) {
      try {
        const analyticsDocs = await EarningAnalyticModel.find({
      targetType: 'writer',
          targetId: new Types.ObjectId(userId) // Ensure ObjectId for queries
    })
    .sort({ summaryDate: -1 })
    .limit(12)
        .lean();
        earningAnalytics = analyticsDocs.map(analytic => serializeDocument<SerializedEarningAnalytic>(analytic));
        console.log(`📈 [Dashboard] พบข้อมูลวิเคราะห์ ${earningAnalytics.length} รายการ`);
      } catch (analyticsError) {
        console.warn(`⚠️ [Dashboard] ไม่สามารถดึงข้อมูลวิเคราะห์ได้:`, analyticsError);
      }
    }

    // คำนวณสถิติรวม
    const totalStats = {
      totalNovels: novels.length,
      totalNovelsPublished: user.writerStats?.totalNovelsPublished,
      totalEpisodes: novels.reduce((sum, novel) => sum + (novel.publishedEpisodesCount || 0), 0),
      totalViews: novels.reduce((sum, novel) => sum + (novel.stats?.viewsCount || 0), 0),
      totalEarnings: user.writerStats?.totalEarningsToDate || 0,
      averageRating: novels.length > 0 
        ? Number((novels.reduce((sum, novel) => sum + (novel.stats?.averageRating || 0), 0) / novels.length).toFixed(1))
        : 0,
      totalFollowers: novels.reduce((sum, novel) => sum + (novel.stats?.followersCount || 0), 0)
    };

    console.log(`📊 [Dashboard] สถิติรวม:`, totalStats);

    // ตรวจสอบว่าสามารถสมัครเป็นนักเขียนได้หรือไม่
    // Make sure writerApplication is correctly typed for this check
    const canApplyForWriter = !isWriter && 
      (!writerApplication || 
       ['REJECTED', 'CANCELLED'].includes(writerApplication.status.toUpperCase())); // Use WriterApplicationStatus enum values if possible and ensure casing matches

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
      totalStats: {
        ...totalStats,
        totalNovelsPublished: totalStats.totalNovelsPublished || 0 // Ensure totalNovelsPublished is always a number
      }
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

/**
 * Loading Component สำหรับ Suspense - อัพเกรดแล้ว
 */
function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Loading Header */}
      <div className="bg-gradient-to-r from-primary via-primary-hover to-accent h-64 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.1\'%3E%3Ccircle cx=\'30\' cy=\'30\' r=\'4\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
        </div>
        <div className="container-custom flex items-center justify-center h-full">
          <LoadingSpinner 
            size="large" 
            variant="writer"
            text="กำลังโหลดข้อมูล Dashboard ของคุณ..." 
          />
        </div>
      </div>

      {/* Loading Content */}
      <div className="container-custom py-8 space-y-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-6 animate-pulse">
            <div className="h-4 bg-secondary rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-3 bg-secondary rounded w-full"></div>
              <div className="h-3 bg-secondary rounded w-5/6"></div>
              <div className="h-3 bg-secondary rounded w-4/6"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Error Component สำหรับจัดการ Error - อัพเกรดแล้ว
 */
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
            {retry && (
        <button 
                onClick={retry}
                className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary-hover transition-colors"
        >
          ลองใหม่อีกครั้ง
              </button>
            )}
            
            <button 
              onClick={() => window.location.href = '/'}
              className="w-full bg-secondary text-secondary-foreground px-6 py-3 rounded-lg font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              กลับหน้าแรก
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Welcome Message Component สำหรับผู้ใช้ใหม่
 */
function WelcomeMessage({ user, canApplyForWriter }: { user: SerializedUser; canApplyForWriter: boolean }) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-8 text-center">
      <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      </div>
      
      <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-400 mb-3">
        ยินดีต้อนรับสู่ DivWy!
      </h2>
      
      <p className="text-blue-600 dark:text-blue-500 mb-6 max-w-md mx-auto leading-relaxed">
        เริ่มต้นการเดินทางในฐานะนักเขียนและสร้างสรรค์เรื่องราวที่น่าตื่นเต้น
        {canApplyForWriter && ' สมัครเป็นนักเขียนเพื่อแชร์ผลงานของคุณกับโลก'}
      </p>
      
      {canApplyForWriter && (
        <button 
            onClick={() => { /* TODO: Implement navigation or modal for application form */ alert("Navigate to application form or show modal"); }}
            className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-lg hover:shadow-xl">
          เริ่มต้นเป็นนักเขียน
        </button>
      )}
    </div>
  );
}

/**
 * Application Status Component สำหรับแสดงสถานะใบสมัคร
 */
function ApplicationStatus({ writerApplication }: { writerApplication: SerializedWriterApplication }) {
  const getStatusConfig = (status: string) => {
    const configs = {
      PENDING_REVIEW: { // Matched enum from WriterApplication.ts
        color: 'from-yellow-500 to-orange-500',
        textColor: 'text-yellow-800 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        title: 'ใบสมัครอยู่ระหว่างการตรวจสอบ',
        description: 'ทีมงานกำลังพิจารณาใบสมัครของคุณ'
      },
      UNDER_REVIEW: { // Matched enum
        color: 'from-blue-500 to-cyan-500',
        textColor: 'text-blue-800 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
        title: 'กำลังตรวจสอบอย่างละเอียด',
        description: 'ใบสมัครของคุณอยู่ในขั้นตอนการตรวจสอบขั้นสุดท้าย'
      },
      REQUIRES_MORE_INFO: { // Matched enum
        color: 'from-orange-500 to-red-500',
        textColor: 'text-orange-800 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        borderColor: 'border-orange-200 dark:border-orange-800',
        title: 'ต้องการข้อมูลเพิ่มเติม',
        description: 'กรุณาเพิ่มข้อมูลตามที่ระบุด้านล่าง'
      },
      // Add other statuses like APPROVED, REJECTED, CANCELLED if needed for display
      APPROVED: {
        color: 'from-green-500 to-emerald-500',
        textColor: 'text-green-800 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
        title: 'ใบสมัครได้รับการอนุมัติแล้ว!',
        description: 'ยินดีด้วย! คุณเป็นนักเขียนบน DivWy แล้ว'
      },
      REJECTED: {
        color: 'from-red-500 to-rose-500',
        textColor: 'text-red-800 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        title: 'ใบสมัครถูกปฏิเสธ',
        description: 'เสียใจด้วย ใบสมัครของคุณไม่ผ่านการพิจารณา'
      },
       CANCELLED: {
        color: 'from-slate-500 to-gray-500',
        textColor: 'text-slate-800 dark:text-slate-400',
        bgColor: 'bg-slate-50 dark:bg-slate-900/20',
        borderColor: 'border-slate-200 dark:border-slate-800',
        title: 'ใบสมัครถูกยกเลิก',
        description: 'คุณได้ยกเลิกใบสมัครนี้แล้ว'
      }
    };
    
    return configs[status.toUpperCase() as keyof typeof configs] || configs.PENDING_REVIEW;
  };

  const config = getStatusConfig(writerApplication.status);

  return (
    <div className={`${config.bgColor} border ${config.borderColor} rounded-2xl p-8 text-center relative overflow-hidden`}>
      <div className={`absolute inset-0 bg-gradient-to-r ${config.color} opacity-5`}></div>
      
      <div className="relative z-10">
        <div className={`w-16 h-16 bg-gradient-to-r ${config.color} rounded-full flex items-center justify-center mx-auto mb-6`}>
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h2 className={`text-xl font-bold ${config.textColor} mb-3`}>
          {config.title}
        </h2>
        
        <p className={`${config.textColor} mb-6`}>
          {config.description}
        </p>
        
        <div className="bg-background/50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">ส่งใบสมัครเมื่อ:</span>
            <span className={config.textColor}>
              {new Date(writerApplication.submittedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          {writerApplication.reviewedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">ตรวจสอบเมื่อ:</span>
              <span className={config.textColor}>
                {new Date(writerApplication.reviewedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          )}
        </div>

        {writerApplication.rejectionReason && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">
              <strong>เหตุผล:</strong> {writerApplication.rejectionReason}
            </p>
          </div>
        )}
         {/* TODO: Add section to allow resubmission or provide more info if status is REQUIRES_MORE_INFO */}
      </div>
    </div>
  );
}

/**
 * Main Dashboard Content Component
 */
async function DashboardContent({ userId }: { userId: string }) {
  try {
    const dashboardData = await getWriterDashboardData(userId);
    
    return (
      <div className="min-h-screen bg-background text-foreground">
        {/* Header Section */}
        <DashboardHeader 
          user={dashboardData.user}
          totalStats={dashboardData.totalStats}
        />

        {/* Main Content Container */}
        <div className="container-custom py-8 space-y-8">
          {/* Writer Profile Section */}
          <WriterProfileSection 
            user={dashboardData.user}
            isWriter={dashboardData.isWriter}
            canApplyForWriter={dashboardData.canApplyForWriter}
            writerApplication={dashboardData.writerApplication}
            donationApplication={dashboardData.donationApplication}
          />

          {/* Conditional Content Based on User Status */}
          {dashboardData.isWriter ? (
            <>
          {/* Stats Overview (สำหรับ Writer เท่านั้น) */}
              <StatsOverview 
                stats={dashboardData.totalStats}
                recentTransactions={dashboardData.recentTransactions}
                earningAnalytics={dashboardData.earningAnalytics}
              />

          {/* Tab Navigation และ Content */}
              <TabNavigation 
                novels={dashboardData.novels} 
                totalStats={dashboardData.totalStats}
                earningAnalytics={dashboardData.earningAnalytics}
              >
                {/* Tab นิยาย */}
                <NovelTab 
                  novels={dashboardData.novels}
                  totalStats={dashboardData.totalStats}
                  user={dashboardData.user}
                />

                {/* Tab รายงาน */}
                <AnalyticsTab 
                  earningAnalytics={dashboardData.earningAnalytics}
                  novels={dashboardData.novels}
                  recentTransactions={dashboardData.recentTransactions}
                  user={dashboardData.user}
                />
              </TabNavigation>
            </>
          ) : (
            <>
              {/* Application Status or Welcome Message */}
              {dashboardData.writerApplication && !['REJECTED', 'CANCELLED'].includes(dashboardData.writerApplication.status.toUpperCase()) ? (
                <ApplicationStatus writerApplication={dashboardData.writerApplication} />
              ) : dashboardData.canApplyForWriter ? (
                // NOTE: WriterApplicationForm will be rendered by WriterProfileSection or a specific "Apply" button action
                // For now, just showing the welcome message if they can apply.
                // The actual form logic will be handled by a client component interaction.
                <WelcomeMessage 
                  user={dashboardData.user} 
                  canApplyForWriter={dashboardData.canApplyForWriter} 
                />
              ) : dashboardData.writerApplication && ['REJECTED', 'CANCELLED'].includes(dashboardData.writerApplication.status.toUpperCase()) ? (
                 // If application was rejected or cancelled, they can apply again
                 <WelcomeMessage 
                  user={dashboardData.user} 
                  canApplyForWriter={true} // They can apply again
                />
              ): (
                <div className="text-center py-16">
                  <div className="bg-card border border-border rounded-2xl p-8 max-w-2xl mx-auto">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
            </div>
                    <h2 className="text-xl font-bold text-card-foreground mb-3">
                      ขณะนี้คุณยังไม่ได้เป็นนักเขียน
                </h2>
                    <p className="text-muted-foreground">
                      สถานะใบสมัครปัจจุบันของคุณคือ: {dashboardData.writerApplication?.status || "ไม่มีข้อมูลใบสมัคร"}
                      {dashboardData.writerApplication?.rejectionReason && ` เหตุผล: ${dashboardData.writerApplication.rejectionReason}`}
                      . กรุณาติดต่อทีมสนับสนุนหากมีข้อสงสัย
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );

  } catch (error) {
    console.error('❌ [DashboardContent] Error:', error);
    // Attempt to re-enable reload on error
    const retryFunction = typeof window !== 'undefined' ? () => window.location.reload() : undefined;
    return (
      <DashboardError 
        error={error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'} 
        retry={retryFunction}
      />
    );
  }
}

/**
 * Main Writer Dashboard Page Component (SSR)
 * หน้าหลักของ Writer Dashboard ที่ render แบบ Server-Side 100%
 * รองรับ global.css theme system และจัดการ authentication
 */
export default async function WriterDashboardPage() {
  console.log('🚀 [Dashboard] เริ่มต้น Dashboard Page');

  try {
    // ตรวจสอบ Authentication ด้วย NextAuth
    const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
      console.log('❌ [Dashboard] ไม่พบ session หรือ user ID');
      redirect('/auth/signin?callbackUrl=/dashboard&message=กรุณาเข้าสู่ระบบเพื่อเข้าใช้งาน Dashboard');
  }

  const userId = session.user.id;
    console.log(`✅ [Dashboard] ผู้ใช้ที่เข้าสู่ระบบ: ${userId}`);

  return (
    <ErrorBoundary>
      <Suspense fallback={<DashboardLoading />}>
        <DashboardContent userId={userId} />
      </Suspense>
    </ErrorBoundary>
  );

  } catch (error) {
    console.error('❌ [Dashboard] เกิดข้อผิดพลาดใน Dashboard Page:', error);
     // Attempt to re-enable reload on error
    const retryFunction = typeof window !== 'undefined' ? () => window.location.reload() : undefined;
    return (
      <DashboardError 
        error="ไม่สามารถโหลดหน้า Dashboard ได้ กรุณาลองใหม่อีกครั้ง" 
        retry={retryFunction}
      />
    );
  }
}

// Metadata สำหรับ SEO
export const metadata = {
  title: 'Writer Dashboard - DivWy',
  description: 'แดชบอร์ดสำหรับนักเขียนบน DivWy - จัดการนิยาย ดูสถิติ และติดตามรายได้',
  robots: 'noindex, nofollow', // ป้องกันไม่ให้ search engine index หน้าส่วนตัว
  openGraph: {
    title: 'Writer Dashboard - DivWy',
    description: 'จัดการผลงานและติดตามความสำเร็จของคุณในฐานะนักเขียนบน DivWy',
    type: 'website',
    locale: 'th_TH',
  },
};

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;