// src/app/api/search/novels/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import NovelModel, { INovel, NovelStatus, NovelAccessLevel, NovelContentType } from "@/backend/models/Novel";
import UserModel, { IUser } from "@/backend/models/User";
import CategoryModel, { ICategory, CategoryType } from "@/backend/models/Category";
import mongoose, { Types } from "mongoose";

// Interface for populated author, matching what's selected
interface PopulatedAuthor {
  _id: Types.ObjectId | string;
  username?: string;
  profile?: {
    displayName?: string;
    penName?: string;
    avatarUrl?: string;
  };
}
// Interface for populated category, matching what's selected
interface PopulatedCategoryInfo {
  _id: Types.ObjectId | string;
  name: string;
  slug: string;
  color?: string;
  iconUrl?: string;
  // Add other fields if selected, e.g., description for mainThemeCategory display
  description?: string;
  coverImageUrl?: string;
}


interface SearchedNovelResult {
  _id: string;
  title: string;
  slug: string;
  author?: PopulatedAuthor; // Updated type
  coverImageUrl?: string;
  synopsis: string;
  status: NovelStatus;
  isCompleted: boolean; // Important for status filtering
  ageRatingCategory?: PopulatedCategoryInfo | null;
  customTags?: string[];
  mainThemeCategory?: PopulatedCategoryInfo | null;
  subThemeCategories?: PopulatedCategoryInfo[];
  languageCategory?: PopulatedCategoryInfo | null;
  stats: {
    viewsCount: number;
    likesCount: number;
    averageRating: number;
    followersCount: number;
    lastPublishedEpisodeAt?: Date | string; // Allow string for lean() result pre-map
    totalWords: number;
  };
  monetizationSettings?: {
    activePromotion?: {
      isActive: boolean;
      promotionalPriceCoins?: number;
      promotionStartDate?: Date | string;
      promotionEndDate?: Date | string;
    } | null;
    defaultEpisodePriceCoins?: number;
  };
  currentEpisodePriceCoins?: number;
  totalEpisodesCount: number;
  publishedEpisodesCount: number;
  lastContentUpdatedAt: Date | string;
  score?: number;
}


export async function GET(request: NextRequest) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);

    const query = searchParams.get("q")?.trim() || "";
    const mainThemeId = searchParams.get("mainTheme") || "";
    const subThemeId = searchParams.get("subTheme") || "";
    const tagQuery = searchParams.getAll("tag").map(tag => tag.trim().toLowerCase()).filter(tag => tag) || [];
    const sortParam = searchParams.get("sort") || "lastContentUpdatedAt"; // Default sort changed
    const novelStatusQuery = searchParams.get("status")?.toUpperCase() || "";
    const ageRatingId = searchParams.get("ageRating") || "";
    const isDiscountedParam = searchParams.get("discounted"); // "true", "false", ""
    const languageId = searchParams.get("lang") || "";
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const skip = (page - 1) * limit;

    console.log(`📡 API /api/search/novels called with:
      query: "${query}", mainThemeId: ${mainThemeId}, subThemeId: ${subThemeId},
      tags: [${tagQuery.join(', ')}], sort: ${sortParam}, status: ${novelStatusQuery},
      ageRating: ${ageRatingId}, discounted: ${isDiscountedParam}, lang: ${languageId},
      limit: ${limit}, page: ${page}`);

    const searchCriteria: mongoose.FilterQuery<INovel> = {
      isDeleted: false, // Ensure only non-deleted novels
      accessLevel: NovelAccessLevel.PUBLIC, // Default to public novels
      // Default to published or completed. Scheduled novels usually not for general search.
      status: { $in: [NovelStatus.PUBLISHED, NovelStatus.COMPLETED, NovelStatus.ONGOING] },
    };

    if (novelStatusQuery && novelStatusQuery !== "ALL") {
      if (novelStatusQuery === NovelStatus.COMPLETED) {
        searchCriteria.isCompleted = true;
        searchCriteria.status = { $in: [NovelStatus.PUBLISHED, NovelStatus.COMPLETED] };
      } else if (novelStatusQuery === NovelStatus.ONGOING) {
        searchCriteria.isCompleted = false;
        searchCriteria.status = { $in: [NovelStatus.PUBLISHED, NovelStatus.ONGOING] }; // Novel can be ongoing and published
      } else if (Object.values(NovelStatus).includes(novelStatusQuery as NovelStatus)) {
        searchCriteria.status = novelStatusQuery as NovelStatus;
        if (novelStatusQuery === NovelStatus.PUBLISHED) {
            // If just "PUBLISHED" is selected, it could be ongoing or completed
            delete searchCriteria.isCompleted;
        }
      }
    }


    if (ageRatingId && ageRatingId !== "all" && Types.ObjectId.isValid(ageRatingId)) {
      searchCriteria.ageRatingCategoryId = new Types.ObjectId(ageRatingId);
    }

    if (languageId && languageId !== "all" && Types.ObjectId.isValid(languageId)) {
      searchCriteria.language = new Types.ObjectId(languageId);
    }

    if (isDiscountedParam === "true") {
      const now = new Date();
      searchCriteria["monetizationSettings.activePromotion.isActive"] = true;
      searchCriteria["monetizationSettings.activePromotion.promotionalPriceCoins"] = { $exists: true, $gte: 0 };
      searchCriteria.$and = [
        ...(searchCriteria.$and || []),
        {
          $or: [
            { "monetizationSettings.activePromotion.promotionStartDate": { $exists: false } },
            { "monetizationSettings.activePromotion.promotionStartDate": { $lte: now } }
          ]
        },
        {
          $or: [
            { "monetizationSettings.activePromotion.promotionEndDate": { $exists: false } },
            { "monetizationSettings.activePromotion.promotionEndDate": { $gte: now } }
          ]
        }
      ];
    } else if (isDiscountedParam === "false") {
        const now = new Date();
        searchCriteria.$or = [
            { "monetizationSettings.activePromotion.isActive": { $exists: false } },
            { "monetizationSettings.activePromotion.isActive": false },
            { "monetizationSettings.activePromotion.promotionalPriceCoins": { $exists: false } },
            // Promotion exists but is not currently active due to dates
            { "monetizationSettings.activePromotion.promotionStartDate": { $gt: now } },
            { "monetizationSettings.activePromotion.promotionEndDate": { $lt: now } },
        ];
    }


    if (mainThemeId && Types.ObjectId.isValid(mainThemeId)) {
      searchCriteria["themeAssignment.mainTheme.categoryId"] = new Types.ObjectId(mainThemeId);
    }

    if (subThemeId && Types.ObjectId.isValid(subThemeId)) {
      searchCriteria["themeAssignment.subThemes.categoryId"] = new Types.ObjectId(subThemeId);
    }

    if (tagQuery.length > 0) {
      searchCriteria["themeAssignment.customTags"] = { $all: tagQuery };
    }

    if (query) {
      // Assuming 'NovelContentTextSearchIndex' uses 'thai' as default or 'none'
      // and 'title', 'synopsis', 'longDescription', 'themeAssignment.customTags' are indexed.
      searchCriteria.$text = {
        $search: query,
        $caseSensitive: false,
        $diacriticSensitive: false,
      };
    }

    const sortOptions: any = {};
    if (query && sortParam === "relevance") {
      sortOptions.score = { $meta: "textScore" };
    } else {
      switch (sortParam) {
        case "lastContentUpdatedAt": // Default for non-query, or specific choice
          sortOptions.lastContentUpdatedAt = -1;
          break;
        case "stats.lastPublishedEpisodeAt": // latestEpisode published
          sortOptions["stats.lastPublishedEpisodeAt"] = -1;
          break;
        case "stats.viewsCount": // popular (views)
          sortOptions["stats.viewsCount"] = -1;
          break;
        case "stats.averageRating": // rating
          sortOptions["stats.averageRating"] = -1;
          sortOptions["stats.ratingsCount"] = -1; // Prioritize novels with more ratings
          break;
        case "stats.followersCount": // followers / likes on novel
          sortOptions["stats.followersCount"] = -1; // Assuming followersCount is the primary metric for "likes" on a novel
          break;
        default:
          sortOptions.lastContentUpdatedAt = -1;
          break;
      }
    }
    sortOptions._id = -1; // Secondary sort for consistent pagination

    const selectedFields = [
      "title", "slug", "coverImageUrl", "synopsis", "status", "isCompleted",
      "themeAssignment.mainTheme.categoryId", "themeAssignment.subThemes.categoryId", "themeAssignment.customTags",
      "ageRatingCategoryId", "language",
      "stats.viewsCount", "stats.likesCount", "stats.averageRating", "stats.followersCount",
      "stats.lastPublishedEpisodeAt", "stats.totalWords",
      "monetizationSettings.activePromotion", "monetizationSettings.defaultEpisodePriceCoins",
      "totalEpisodesCount", "publishedEpisodesCount", "author", "lastContentUpdatedAt"
    ].join(" ");

    const rawNovelsQuery = NovelModel.find(searchCriteria)
      .populate<{ author: PopulatedAuthor }>({
        path: "author",
        model: UserModel, // Explicitly state model
        select: "username profile.displayName profile.penName profile.avatarUrl",
      })
      .populate<{ mainThemeCategory: PopulatedCategoryInfo }>({
        path: "themeAssignment.mainTheme.categoryId",
        model: CategoryModel,
        select: "_id name slug description coverImageUrl color iconUrl",
      })
      .populate<{ subThemeCategories: PopulatedCategoryInfo[] }>({ // For array of ObjectIds
        path: "themeAssignment.subThemes.categoryId", // This populates the categoryId within each object in the subThemes array
        model: CategoryModel,
        select: "_id name slug color iconUrl",
      })
      .populate<{ ageRatingCategory: PopulatedCategoryInfo }>({
        path: "ageRatingCategoryId",
        model: CategoryModel,
        select: "_id name slug",
      })
      .populate<{ languageCategory: PopulatedCategoryInfo }>({
        path: "language",
        model: CategoryModel,
        select: "_id name slug",
      })
      .select(selectedFields + (query && sortParam === "relevance" ? " score" : ""))
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean<Omit<INovel, 'currentEpisodePriceCoins'>[]>(); // Use Omit as virtual is not in lean

    const rawNovels = await rawNovelsQuery;

    const novels: SearchedNovelResult[] = rawNovels.map((novelDoc) => {
      const novel = novelDoc as any; // Cast to any to handle sub-document paths from lean
      const now = new Date();
      const promo = novel.monetizationSettings?.activePromotion;
      let currentPrice = novel.monetizationSettings?.defaultEpisodePriceCoins ?? 0;

      if (
        promo &&
        promo.isActive &&
        promo.promotionalPriceCoins !== undefined && promo.promotionalPriceCoins >= 0 &&
        (!promo.promotionStartDate || new Date(promo.promotionStartDate) <= now) &&
        (!promo.promotionEndDate || new Date(promo.promotionEndDate) >= now)
      ) {
        currentPrice = promo.promotionalPriceCoins;
      }

      // Ensure populated fields are correctly structured
      const mainThemeCat = novel.themeAssignment?.mainTheme?.categoryId as PopulatedCategoryInfo | undefined;
      const subThemeCats = novel.themeAssignment?.subThemes?.map((st: any) => st.categoryId as PopulatedCategoryInfo).filter(Boolean) || [];


      return {
        _id: novel._id.toString(),
        title: novel.title,
        slug: novel.slug,
        author: novel.author ? { // Ensure author and profile exist
            _id: novel.author._id,
            username: novel.author.username,
            profile: novel.author.profile ? {
                displayName: novel.author.profile.displayName,
                penName: novel.author.profile.penName,
                avatarUrl: novel.author.profile.avatarUrl
            } : undefined
        } : undefined,
        coverImageUrl: novel.coverImageUrl,
        synopsis: novel.synopsis,
        status: novel.status,
        isCompleted: novel.isCompleted,
        ageRatingCategory: novel.ageRatingCategoryId as PopulatedCategoryInfo || null,
        customTags: novel.themeAssignment?.customTags || [],
        mainThemeCategory: mainThemeCat || null,
        subThemeCategories: subThemeCats,
        languageCategory: novel.language as PopulatedCategoryInfo || null,
        stats: { // Ensure stats object and its fields exist
            viewsCount: novel.stats?.viewsCount || 0,
            likesCount: novel.stats?.likesCount || 0,
            averageRating: novel.stats?.averageRating || 0,
            followersCount: novel.stats?.followersCount || 0,
            lastPublishedEpisodeAt: novel.stats?.lastPublishedEpisodeAt,
            totalWords: novel.stats?.totalWords || 0,
        },
        monetizationSettings: novel.monetizationSettings ? {
            activePromotion: novel.monetizationSettings.activePromotion ? {
                isActive: novel.monetizationSettings.activePromotion.isActive,
                promotionalPriceCoins: novel.monetizationSettings.activePromotion.promotionalPriceCoins,
                promotionStartDate: novel.monetizationSettings.activePromotion.promotionStartDate,
                promotionEndDate: novel.monetizationSettings.activePromotion.promotionEndDate,
            } : null,
            defaultEpisodePriceCoins: novel.monetizationSettings.defaultEpisodePriceCoins
        } : undefined,
        currentEpisodePriceCoins: currentPrice,
        totalEpisodesCount: novel.totalEpisodesCount || 0,
        publishedEpisodesCount: novel.publishedEpisodesCount || 0,
        lastContentUpdatedAt: novel.lastContentUpdatedAt,
        score: novel.score,
      };
    });

    const total = await NovelModel.countDocuments(searchCriteria);

    console.log(`✅ API /api/search/novels: Found ${novels.length} novels (total: ${total})`);

    let mainThemeCategoryDataForResponse: PopulatedCategoryInfo | null = null;
    if (mainThemeId && Types.ObjectId.isValid(mainThemeId)) {
      const categoryDoc = await CategoryModel.findById(mainThemeId)
                            .select("_id name slug description coverImageUrl color iconUrl")
                            .lean<PopulatedCategoryInfo>();
      if (categoryDoc) mainThemeCategoryDataForResponse = categoryDoc;
    } else if (novels.length > 0 && novels[0].mainThemeCategory && mainThemeId === novels[0].mainThemeCategory._id.toString()){
        // If mainThemeId was used in search, and the first novel has it, use that.
        // This assumes if mainThemeId is passed, it's populated and returned with the novel.
        mainThemeCategoryDataForResponse = novels[0].mainThemeCategory;
    }


    let relatedTagsResult: { tag: string; count: number }[] = [];
    if (novels.length > 0 && query) { // Only show related tags if there was a text query
      const tagAggregationPipeline: mongoose.PipelineStage[] = [
        { $match: searchCriteria }, // Match the same novels
        { $unwind: "$themeAssignment.customTags" },
        { $match: { "themeAssignment.customTags": { $nin: tagQuery } } }, // Exclude tags already in query
        { $group: { _id: "$themeAssignment.customTags", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { _id: 0, tag: "$_id", count: 1 } }
      ];
      relatedTagsResult = await NovelModel.aggregate(tagAggregationPipeline);
    }


    return NextResponse.json(
      {
        novels,
        mainThemeCategory: mainThemeCategoryDataForResponse,
        // subThemeCategory: subThemeCategoryData, // Not typically needed for top-level response
        relatedTags: relatedTagsResult,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          currentPage: page, // Add these for clarity for SearchResults component
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(`❌ ข้อผิดพลาดในการค้นหานิยาย:`, error.message, error.stack);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการค้นหานิยาย", details: error.message },
      { status: 500 }
    );
  }
}