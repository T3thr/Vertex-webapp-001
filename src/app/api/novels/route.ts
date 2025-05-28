// src/app/api/novels/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import NovelModel, { NovelStatus, NovelAccessLevel, INovel, NovelContentType } from "@/backend/models/Novel"; // Removed IPromotionDetails, INovelStats as they are part of INovel
import UserModel, { IUser } from "@/backend/models/User";
import CategoryModel, { ICategory } from "@/backend/models/Category"; // Removed CategoryType as it's part of ICategory
import { NovelCardData, PopulatedAuthor, PopulatedCategory } from "@/components/NovelCard";
import mongoose, { Types } from "mongoose";

// Helper function to safely convert value to ObjectId
const toObjectId = (id: string | undefined | null): Types.ObjectId | null => {
  if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return null;
};

export async function GET(request: Request) {
  try {
    await dbConnect(); // Ensure database connection

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "trending"; // Default filter is trending
    const limit = parseInt(searchParams.get("limit") || "7", 10); // Default limit is 7
    const page = parseInt(searchParams.get("page") || "1", 10);
    const categorySlug = searchParams.get("categorySlug");
    const languageIdParam = searchParams.get("languageId");

    const novelTypeParam = searchParams.get("novelType");
    const novelType = novelTypeParam && Object.values(NovelContentType).includes(novelTypeParam as NovelContentType)
      ? novelTypeParam as NovelContentType
      : null;

    const skip = (page - 1) * limit;

    console.log(`📡 [API /api/novels] Called with URL: ${request.url}`);
    console.log(`ℹ️ [API /api/novels] Params - filter: ${filter}, limit: ${limit}, page: ${page}, categorySlug: ${categorySlug}, languageId: ${languageIdParam}, novelType: ${novelType}`);

    // Base query: fetch only published or completed novels, public access, and not deleted
    const query: any = {
      status: { $in: [NovelStatus.PUBLISHED, NovelStatus.COMPLETED] },
      accessLevel: NovelAccessLevel.PUBLIC,
      isDeleted: false,
    };
    const sort: any = {};

    // Filter by novelType (e.g., interactive_fiction for Visual Novels)
    if (novelType) {
      query["sourceType.type"] = novelType;
      console.log(`ℹ️ [API /api/novels] Filtering for novelType: ${novelType}`);
    }

    const andConditions: any[] = []; // Array for $and conditions if multiple are needed

    // Filter by categorySlug
    if (categorySlug) {
      const category = await CategoryModel.findOne({ slug: categorySlug }).lean<ICategory>();
      if (category && category._id) {
        console.log(`ℹ️ [API /api/novels] Filtering by category: ${category.name} (ID: ${category._id})`);
        const categoryObjId = category._id;
        const categoryConditions = {
          $or: [ // Novel must have this category in one of the following fields
            { "themeAssignment.mainTheme.categoryId": categoryObjId },
            { "themeAssignment.subThemes.categoryId": categoryObjId },
            { "themeAssignment.moodAndTone": categoryObjId },
            { "themeAssignment.contentWarnings": categoryObjId },
            { "narrativeFocus.artStyle": categoryObjId },
            { "narrativeFocus.commonTropes": categoryObjId },
            { "narrativeFocus.interactivityLevel": categoryObjId },
            { "narrativeFocus.narrativePacingTags": categoryObjId },
            { "narrativeFocus.primaryConflictTypes": categoryObjId },
            { "narrativeFocus.targetAudienceProfileTags": categoryObjId },
            { "narrativeFocus.lengthTag": categoryObjId },
            { "narrativeFocus.playerAgencyLevel": categoryObjId },
            { "narrativeFocus.storyArcStructure": categoryObjId },
            { "narrativeFocus.narrativePerspective": categoryObjId },
            { "sourceType.fandomCategoryId": categoryObjId },
          ]
        };
        andConditions.push(categoryConditions);
      } else {
        console.warn(`⚠️ [API /api/novels] Category with slug "${categorySlug}" not found. No novels will match this category slug.`);
        // If categorySlug is provided but not found, return empty results to avoid user confusion
        return NextResponse.json({ novels: [], pagination: { total: 0, page, limit, totalPages: 0 } }, { status: 200 });
      }
    }

    // Filter by languageId
    if (languageIdParam) {
      const langId = toObjectId(languageIdParam);
      if (langId) {
        query.language = langId; // language in NovelModel is an ObjectId referencing Category
        console.log(`ℹ️ [API /api/novels] Filtering by languageId: ${languageIdParam}`);
      } else {
        console.warn(`⚠️ [API /api/novels] Invalid languageId format: "${languageIdParam}". Skipping language filter.`);
      }
    }

    // Filtering and sorting logic based on the filter parameter
    switch (filter) {
      case "trending":
        sort["stats.trendingStats.trendingScore"] = -1; // Sort by highest trending score
        sort["stats.viewsCount"] = -1; // Fallback to view count
        console.log(`ℹ️ [API /api/novels] Applying filter: trending`);
        break;
      case "published": // For "อัปเดตล่าสุด" (Latest Updates)
        sort["stats.lastPublishedEpisodeAt"] = -1; // Most recently published episode
        sort["publishedAt"] = -1; // Novel's first publication date (fallback)
        console.log(`ℹ️ [API /api/novels] Applying filter: published (latest episodes/novels)`);
        break;
      case "promoted": // For "โปรโมชันและเรื่องเด่น" (Promotions and Featured)
        const now = new Date();
        const promotionConditions = {
          $or: [ // Must be isFeatured OR have an active promotion
            { isFeatured: true },
            {
              "monetizationSettings.activePromotion.isActive": true,
              "monetizationSettings.activePromotion.promotionalPriceCoins": { $exists: true, $ne: null },
              // Ensure promotion dates are valid if they exist
              $and: [
                { $or: [{ "monetizationSettings.activePromotion.promotionStartDate": { $lte: now } }, { "monetizationSettings.activePromotion.promotionStartDate": { $exists: false } }] },
                { $or: [{ "monetizationSettings.activePromotion.promotionEndDate": { $gte: now } }, { "monetizationSettings.activePromotion.promotionEndDate": { $exists: false } }] },
              ],
            },
          ]
        };
        andConditions.push(promotionConditions);
        // Sort for promoted: featured items first, then by trending score or publication date
        sort["isFeatured"] = -1; // isFeatured=true comes first
        sort["stats.trendingStats.trendingScore"] = -1;
        sort["publishedAt"] = -1;
        console.log(`ℹ️ [API /api/novels] Applying filter: promoted (featured or active promotions)`);
        break;
      case "completed":
        query.isCompleted = true; // Only completed novels
        sort["stats.averageRating"] = -1; // Sort by average rating
        sort["stats.viewsCount"] = -1;
        sort["publishedAt"] = -1;
        console.log(`ℹ️ [API /api/novels] Applying filter: completed`);
        break;
      default:
        // Fallback to 'trending' if filter is unknown or missing
        sort["stats.trendingStats.trendingScore"] = -1;
        sort["stats.viewsCount"] = -1;
        console.warn(`⚠️ [API /api/novels] Invalid or missing filter parameter: "${filter}". Defaulting to 'trending'.`);
    }

    // Combine $andConditions with the main query
    if (andConditions.length > 0) {
      query.$and = query.$and ? [...query.$and, ...andConditions] : andConditions;
    }

    const total = await NovelModel.countDocuments(query);
    console.log(`ℹ️ [API /api/novels] Final Query: ${JSON.stringify(query)}, Sort: ${JSON.stringify(sort)}`);
    console.log(`ℹ️ [API /api/novels] Found ${total} novels matching query.`);

    // Fetch novels with populated fields
    // Use .lean({ virtuals: true }) for plain JS objects including virtuals like currentEpisodePriceCoins
    const rawNovels = await NovelModel.find(query)
      .populate<{ author: Pick<IUser, '_id' | 'username' | 'profile' | 'roles'> }>({
        path: "author",
        select: "username profile.displayName profile.penName profile.avatarUrl roles", // Select necessary fields for card
        model: UserModel, // Explicitly specify model for clarity
      })
      .populate<{ themeAssignment: { mainTheme: { categoryId: ICategory }, subThemes: { categoryId: ICategory }[], moodAndTone: ICategory[], contentWarnings: ICategory[] } }>({
        path: "themeAssignment.mainTheme.categoryId",
        select: "name slug localizations iconUrl color categoryType description",
        model: CategoryModel,
      })
      .populate({
        path: 'themeAssignment.subThemes.categoryId',
        select: 'name slug iconUrl color categoryType description',
        model: CategoryModel,
      })
      .populate({
        path: 'themeAssignment.moodAndTone',
        select: 'name slug iconUrl color categoryType description',
        model: CategoryModel,
      })
      .populate({
        path: 'themeAssignment.contentWarnings',
        select: 'name slug iconUrl color categoryType description',
        model: CategoryModel,
      })
      .populate<{ language: ICategory }>({
        path: "language",
        select: "name slug localizations iconUrl color categoryType description",
        model: CategoryModel,
      })
      .populate<{ ageRatingCategoryId?: ICategory }>({
        path: "ageRatingCategoryId",
        select: "name slug localizations iconUrl color categoryType description",
        model: CategoryModel,
      })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true }) as any[]; // Temporarily cast to any[], then map to strong type

    // Map raw novel data to the NovelCardData structure expected by the client component
    const novels: NovelCardData[] = rawNovels.map(novel => {
      // Helper function to transform a populated category (if it exists)
      const transformPopulatedCategory = (cat: any): PopulatedCategory | undefined => {
        if (!cat || typeof cat !== 'object' || !cat._id) return undefined;
        return {
          _id: cat._id.toString(), // Convert ObjectId to string
          name: cat.name,
          slug: cat.slug,
          localizations: cat.localizations,
          iconUrl: cat.iconUrl,
          color: cat.color,
          categoryType: cat.categoryType,
          description: cat.description,
        };
      };
      
      // Helper to transform an array of populated categories
      const transformPopulatedCategoryArray = (cats: any[]): PopulatedCategory[] => {
        if (!Array.isArray(cats)) return [];
        return cats.map(transformPopulatedCategory).filter(Boolean) as PopulatedCategory[];
      };

      // Construct author object
      const authorData: PopulatedAuthor = novel.author && typeof novel.author === 'object' && novel.author._id
        ? {
            _id: novel.author._id.toString(),
            username: novel.author.username,
            // Assume profile sub-document is populated completely
            profile: { 
              displayName: novel.author.profile?.displayName,
              penName: novel.author.profile?.penName,
              avatarUrl: novel.author.profile?.avatarUrl,
            },
            roles: novel.author.roles,
          }
        : { _id: new mongoose.Types.ObjectId().toString(), username: "ไม่ทราบนามปากกา", profile: {} }; // Default author if data is missing

      return {
        _id: novel._id?.toString(), // Novel's _id
        title: novel.title,
        slug: novel.slug,
        synopsis: novel.synopsis,
        coverImageUrl: novel.coverImageUrl,
        stats: { // Select only the stats needed by NovelCard
          viewsCount: novel.stats?.viewsCount || 0,
          likesCount: novel.stats?.likesCount || 0,
          averageRating: novel.stats?.averageRating || 0,
          lastPublishedEpisodeAt: novel.stats?.lastPublishedEpisodeAt ? new Date(novel.stats.lastPublishedEpisodeAt) : undefined,
        },
        isCompleted: novel.isCompleted,
        isFeatured: novel.isFeatured,
        publishedAt: novel.publishedAt ? new Date(novel.publishedAt) : undefined,
        status: novel.status as NovelStatus,
        totalEpisodesCount: novel.totalEpisodesCount,
        publishedEpisodesCount: novel.publishedEpisodesCount,
        currentEpisodePriceCoins: novel.currentEpisodePriceCoins, // Virtual field from Novel model
        monetizationSettings: novel.monetizationSettings as INovel['monetizationSettings'],

        author: authorData,

        themeAssignment: {
          mainTheme: novel.themeAssignment?.mainTheme?.categoryId
            ? {
                categoryId: transformPopulatedCategory(novel.themeAssignment.mainTheme.categoryId)!, // Use ! as existence is checked by transformPopulatedCategory
                customName: novel.themeAssignment.mainTheme.customName,
              }
            // Ensure a default structure if mainTheme or its categoryId is missing
            : { categoryId: { _id: new mongoose.Types.ObjectId().toString(), name: 'ทั่วไป', categoryType: "GENERAL" } as PopulatedCategory },
          subThemes: novel.themeAssignment?.subThemes?.map((st: any) => ({
            categoryId: transformPopulatedCategory(st.categoryId)!,
            customName: st.customName,
          })).filter((st: any) => st.categoryId && st.categoryId._id) || [], // Filter out those where categoryId couldn't be transformed
          moodAndTone: transformPopulatedCategoryArray(novel.themeAssignment?.moodAndTone),
          contentWarnings: transformPopulatedCategoryArray(novel.themeAssignment?.contentWarnings),
          customTags: novel.themeAssignment?.customTags || [],
        },
        // Provide a default language object if novel.language is not populated or missing
        language: transformPopulatedCategory(novel.language) || { _id: new mongoose.Types.ObjectId().toString(), name: 'ไม่ระบุ', categoryType: "LANGUAGE" } as PopulatedCategory,
        ageRatingCategoryId: transformPopulatedCategory(novel.ageRatingCategoryId), // Can be undefined if not present
      };
    });

    console.log(`✅ [API /api/novels] Successfully fetched and transformed ${novels.length} novels for filter: ${filter}, page: ${page}, limit: ${limit}`);

    return NextResponse.json(
      {
        novels,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(`❌ [API /api/novels] Critical error fetching novels (URL: ${request ? request.url : 'N/A'}):`, error.message, error.stack);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดร้ายแรงในการดึงข้อมูลนิยาย", details: error.message },
      { status: 500 }
    );
  }
}