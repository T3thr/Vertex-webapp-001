// src/app/api/novels/[slug]/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import NovelModel, { INovel, NovelStatus } from "@/backend/models/Novel";
import UserModel, { IUser } from "@/backend/models/User";
import CategoryModel, { ICategory, CategoryType } from "@/backend/models/Category";
import EpisodeModel, { IEpisode, EpisodeStatus, IEpisodeStats } from "@/backend/models/Episode";
import mongoose, { Types } from "mongoose";

// --- อินเทอร์เฟซสำหรับข้อมูลที่ Populate แล้ว ---

// ข้อมูล Author ที่จำเป็น
interface PopulatedAuthor extends Pick<IUser, "_id" | "username"> {
  profile?: {
    displayName?: string;
    penName?: string;
    avatarUrl?: string;
  };
  socialStats?: {
    followersCount: number;
  };
}

// ข้อมูล Category ที่จำเป็น
type PopulatedCategory = Pick<ICategory, "_id" | "name" | "slug" | "iconUrl" | "color"> & {
  description?: string;
  categoryType: CategoryType;
  localizations?: ICategory["localizations"];
};

// ข้อมูล Episode ที่จำเป็นสำหรับแสดงใน List
type PopulatedEpisodeSummary = Pick<
  IEpisode,
  "title" | "episodeOrder" | "status" | "accessType" | "priceCoins" | "publishedAt"
> & {
  _id: string;
  stats: Pick<IEpisodeStats, "viewsCount" | "likesCount" | "commentsCount" | "totalWords" | "estimatedReadingTimeMinutes">;
  slug: string;
};

// --- อินเทอร์เฟซสำหรับข้อมูล Novel ที่ส่งกลับ (Populated) ---
export interface PopulatedNovelForDetailPage {
  [x: string]: any;
  _id: string;
  title: string;
  slug: string;
  author: PopulatedAuthor | null;
  synopsis: string;
  longDescription?: string;
  coverImageUrl?: string;
  bannerImageUrl?: string;
  status: NovelStatus;
  isCompleted: boolean;
  endingType: INovel["endingType"];
  totalEpisodesCount: number;
  publishedEpisodesCount: number;
  monetizationSettings: INovel["monetizationSettings"];
  currentEpisodePriceCoins: number;
  mainThemeCategory?: PopulatedCategory | null;
  subThemeCategories?: PopulatedCategory[];
  moodAndToneCategories?: PopulatedCategory[];
  contentWarningCategories?: PopulatedCategory[];
  ageRatingCategory?: PopulatedCategory | null;
  languageCategory?: PopulatedCategory | null;
  artStyleCategory?: PopulatedCategory | null;
  episodesList: PopulatedEpisodeSummary[];
  formattedViewsCount: string;
  formattedLikesCount: string;
  formattedFollowersCount: string;
  formattedWordsCount: string;
  formattedCommentsCount: string;
  formattedAverageRating: string;
  rawStats: INovel["stats"];
  firstEpisodeOrder?: number;
  firstPublishedAt?: Date | null;
  updatedAt: Date;
  createdAt?: Date; // ทำให้เป็น optional เพื่อให้สอดคล้องกับ .lean()
  lastContentUpdatedAt?: Date; // ทำให้เป็น optional
  customTags?: string[];
}

// --- อินเทอร์เฟซสำหรับการตอบกลับ API ---
interface NovelResponse {
  novel: PopulatedNovelForDetailPage;
}

// --- อินเทอร์เฟซชั่วคราวสำหรับ raw lean novel object ก่อนแปลง ---
interface RawNovelLean extends Omit<
  INovel,
  "_id" | "author" | "themeAssignment" | "ageRatingCategoryId" | "language" | "narrativeFocus" | "stats" | "monetizationSettings" | "updatedAt" | "publishedAt" | "createdAt" | "lastContentUpdatedAt"
> {
  _id: Types.ObjectId;
  author: PopulatedAuthor | null | Types.ObjectId;
  themeAssignment: {
    mainTheme: { categoryId: PopulatedCategory | null | Types.ObjectId };
    subThemes: { categoryId: PopulatedCategory | null | Types.ObjectId }[];
    moodAndTone: (PopulatedCategory | null | Types.ObjectId)[];
    contentWarnings: (PopulatedCategory | null | Types.ObjectId)[];
    customTags?: string[];
  };
  ageRatingCategoryId: PopulatedCategory | null | Types.ObjectId;
  language: PopulatedCategory | null | Types.ObjectId;
  narrativeFocus?: {
    artStyle?: PopulatedCategory | null | Types.ObjectId;
  };
  stats: INovel["stats"];
  monetizationSettings: INovel["monetizationSettings"];
  firstEpisodeId?: Types.ObjectId;
  publishedAt?: Date | string;
  lastContentUpdatedAt?: Date | string;
  updatedAt: Date | string;
  createdAt?: Date | string;
  title: string;
  slug: string;
  synopsis: string;
  longDescription?: string;
  coverImageUrl?: string;
  bannerImageUrl?: string;
  status: NovelStatus;
  isCompleted: boolean;
  endingType: INovel["endingType"];
  totalEpisodesCount: number;
  publishedEpisodesCount: number;
}

/**
 * GET: ดึงข้อมูลนิยายตาม slug
 * @param req ข้อมูลคำขอจาก Next.js
 * @param params อ็อบเจ็กต์ที่มี slug ของนิยาย
 * @returns JSON response พร้อมข้อมูลนิยายหรือข้อผิดพลาด
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse<NovelResponse | { error: string }>> {
  try {
    const { slug } = params;

    if (!slug) {
      console.error("❌ ขาดหรือรูปแบบ slug ไม่ถูกต้อง");
      return NextResponse.json({ error: "ต้องระบุ slug ของนิยาย" }, { status: 400 });
    }

    console.log(`\n--- 📡 [API GET /api/novels/${slug}] ---`);

    // เชื่อมต่อฐานข้อมูล
    await dbConnect();
    console.log("✅ เชื่อมต่อฐานข้อมูลสำเร็จ");

    // 1. ค้นหานิยายหลัก
    const novelRaw = await NovelModel
      .findOne({
        slug,
        status: { $nin: [NovelStatus.BANNED_BY_ADMIN, NovelStatus.REJECTED_BY_ADMIN] },
      })
      .populate<{ author: PopulatedAuthor | null }>({
        path: "author",
        model: UserModel,
        select: "username profile.displayName profile.penName profile.avatarUrl socialStats.followersCount",
      })
      .populate<{ mainThemeCategory: PopulatedCategory | null }>({
        path: "themeAssignment.mainTheme.categoryId",
        model: CategoryModel,
        select: "name slug iconUrl color description categoryType localizations",
      })
      .populate<{ subThemeCategories: PopulatedCategory[] }>({
        path: "themeAssignment.subThemes.categoryId",
        model: CategoryModel,
        select: "name slug iconUrl color description categoryType localizations",
      })
      .populate<{ moodAndToneCategories: PopulatedCategory[] }>({
        path: "themeAssignment.moodAndTone",
        model: CategoryModel,
        select: "name slug iconUrl color description categoryType localizations",
      })
      .populate<{ contentWarningCategories: PopulatedCategory[] }>({
        path: "themeAssignment.contentWarnings",
        model: CategoryModel,
        select: "name slug iconUrl color description categoryType localizations",
      })
      .populate<{ ageRatingCategory: PopulatedCategory | null }>({
        path: "ageRatingCategoryId",
        model: CategoryModel,
        select: "name slug iconUrl color description categoryType localizations",
      })
      .populate<{ languageCategory: PopulatedCategory | null }>({
        path: "language",
        model: CategoryModel,
        select: "name slug iconUrl color description categoryType localizations",
      })
      .populate<{ artStyleCategory: PopulatedCategory | null }>({
        path: "narrativeFocus.artStyle",
        model: CategoryModel,
        select: "name slug iconUrl color description categoryType localizations",
      })
      .select(
        "title slug synopsis longDescription coverImageUrl bannerImageUrl status isCompleted endingType " +
          "themeAssignment.mainTheme.categoryId themeAssignment.subThemes.categoryId themeAssignment.moodAndTone themeAssignment.contentWarnings themeAssignment.customTags " +
          "narrativeFocus.artStyle " +
          "ageRatingCategoryId language " +
          "totalEpisodesCount publishedEpisodesCount stats monetizationSettings " +
          "publishedAt lastContentUpdatedAt createdAt updatedAt firstEpisodeId"
      )
      .lean()
      .exec() as RawNovelLean | null;

    if (!novelRaw) {
      console.warn(`⚠️ ไม่พบนิยายสำหรับ slug "${slug}"`);
      return NextResponse.json({ error: "ไม่พบนิยาย" }, { status: 404 });
    }

    console.log(`✅ พบนิยาย "${novelRaw.title}"`);

    // 2. ดึงรายการตอน
    const rawEpisodesList = await EpisodeModel
      .find({
        novelId: novelRaw._id,
        status: EpisodeStatus.PUBLISHED,
      })
      .sort({ episodeOrder: 1 })
      .select(
        "_id title episodeOrder status accessType priceCoins publishedAt stats.viewsCount stats.likesCount stats.commentsCount stats.totalWords stats.estimatedReadingTimeMinutes"
      )
      .lean()
      .exec();

    // แปลง episodesList ให้ตรงกับ PopulatedEpisodeSummary
    const episodesList: PopulatedEpisodeSummary[] = rawEpisodesList.map((ep: any) => ({
      _id: ep._id.toString(),
      title: ep.title,
      slug: ep.episodeOrder.toString(),
      episodeOrder: ep.episodeOrder,
      status: ep.status,
      accessType: ep.accessType,
      priceCoins: ep.priceCoins,
      publishedAt: ep.publishedAt,
      stats: {
        viewsCount: ep.stats?.viewsCount || 0,
        likesCount: ep.stats?.likesCount || 0,
        commentsCount: ep.stats?.commentsCount || 0,
        totalWords: ep.stats?.totalWords || 0,
        estimatedReadingTimeMinutes: ep.stats?.estimatedReadingTimeMinutes || 0,
      },
    }));

    console.log(`✅ ดึง ${episodesList.length} ตอนสำหรับนิยาย "${novelRaw.title}"`);

    // 3. เตรียมข้อมูลสำหรับ Response
    const responseData: PopulatedNovelForDetailPage = {
      _id: novelRaw._id.toString(),
      title: novelRaw.title,
      slug: novelRaw.slug,
      author: novelRaw.author as PopulatedAuthor | null,
      synopsis: novelRaw.synopsis || "",
      longDescription: novelRaw.longDescription,
      coverImageUrl: novelRaw.coverImageUrl,
      bannerImageUrl: novelRaw.bannerImageUrl,
      status: novelRaw.status,
      isCompleted: novelRaw.isCompleted,
      endingType: novelRaw.endingType,
      totalEpisodesCount: novelRaw.totalEpisodesCount,
      publishedEpisodesCount: novelRaw.publishedEpisodesCount,
      monetizationSettings: novelRaw.monetizationSettings,
      currentEpisodePriceCoins: (() => {
        const now = new Date();
        const promo = novelRaw.monetizationSettings?.activePromotion;
        if (
          promo &&
          promo.isActive &&
          promo.promotionalPriceCoins !== undefined &&
          (!promo.promotionStartDate || new Date(promo.promotionStartDate) <= now) &&
          (!promo.promotionEndDate || new Date(promo.promotionEndDate) >= now)
        ) {
          return promo.promotionalPriceCoins;
        }
        return novelRaw.monetizationSettings?.defaultEpisodePriceCoins ?? 0;
      })(),
      mainThemeCategory: novelRaw.themeAssignment.mainTheme.categoryId as PopulatedCategory | null,
      subThemeCategories: novelRaw.themeAssignment.subThemes.map((st) => st.categoryId) as PopulatedCategory[] || [],
      moodAndToneCategories: novelRaw.themeAssignment.moodAndTone as PopulatedCategory[] || [],
      contentWarningCategories: novelRaw.themeAssignment.contentWarnings as PopulatedCategory[] || [],
      ageRatingCategory: novelRaw.ageRatingCategoryId as PopulatedCategory | null,
      languageCategory: novelRaw.language as PopulatedCategory | null,
      artStyleCategory: novelRaw.narrativeFocus?.artStyle as PopulatedCategory | null,
      episodesList,
      formattedViewsCount: formatNumber(novelRaw.stats?.viewsCount ?? 0),
      formattedLikesCount: formatNumber(novelRaw.stats?.likesCount ?? 0),
      formattedFollowersCount: formatNumber(novelRaw.stats?.followersCount ?? 0),
      formattedWordsCount: formatNumber(novelRaw.stats?.totalWords ?? 0),
      formattedCommentsCount: formatNumber(novelRaw.stats?.commentsCount ?? 0),
      formattedAverageRating: (novelRaw.stats?.averageRating ?? 0).toFixed(1),
      rawStats: novelRaw.stats,
      firstEpisodeOrder: novelRaw.firstEpisodeId && episodesList.length > 0 ? episodesList[0]?.episodeOrder : undefined,
      firstPublishedAt: novelRaw.publishedAt ? new Date(novelRaw.publishedAt) : null,
      updatedAt: new Date(novelRaw.updatedAt as string | Date),
      createdAt: novelRaw.createdAt ? new Date(novelRaw.createdAt) : undefined,
      lastContentUpdatedAt: novelRaw.lastContentUpdatedAt ? new Date(novelRaw.lastContentUpdatedAt) : undefined,
      customTags: novelRaw.themeAssignment?.customTags || [],
    };

    console.log(`✅ เตรียมข้อมูลตอบกลับสำหรับนิยาย "${novelRaw.title}"`);

    const response: NovelResponse = { novel: responseData };
    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error(`❌ [API] ข้อผิดพลาดใน /api/novels/${params.slug}:`, error, error.stack);

    if (error instanceof mongoose.Error.CastError) {
      return NextResponse.json({ error: "รูปแบบ slug หรือ ID ไม่ถูกต้อง" }, { status: 400 });
    }

    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ขณะดึงข้อมูลนิยาย", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * ฟังก์ชันช่วยเหลือสำหรับ format ตัวเลขให้อ่านง่าย (K, M)
 * @param num จำนวนที่ต้องการ format
 * @returns สตริงที่ format แล้ว (เช่น 1.2M, 5K, 123) หรือ '0' ถ้าเป็น null/undefined
 */
function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || num === 0) {
    return "0";
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toString();
}