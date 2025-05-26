// src/app/api/novels/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import NovelModel, { NovelStatus, NovelAccessLevel, INovel, NovelContentType, IPromotionDetails, INovelStats } from "@/backend/models/Novel";
import UserModel, { IUser } from "@/backend/models/User";
import CategoryModel, { ICategory, CategoryType } from "@/backend/models/Category";
import { NovelCardData, PopulatedAuthor, PopulatedCategory } from "@/components/NovelCard"; // Path นี้ต้องถูกต้อง
import mongoose, { Types } from "mongoose";

// Helper function to safely convert value to ObjectId
const toObjectId = (id: string): Types.ObjectId | null => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return null;
};

export async function GET(request: Request) {
  try {
    await dbConnect();
    // Mongoose จัดการ model initialization โดยอัตโนมัติเมื่อมีการ import และใช้งาน
    // NovelModel; UserModel; CategoryModel; // ไม่จำเป็นต้องเรียก ensureModels() หรือทำแบบนี้

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "trending";
    const limit = parseInt(searchParams.get("limit") || "8", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const categorySlug = searchParams.get("categorySlug");
    const languageIdParam = searchParams.get("languageId");
    // ตรวจสอบ novelType และ cast ให้ตรงกับ NovelContentType หรือ null
    const novelTypeParam = searchParams.get("novelType");
    const novelType = novelTypeParam && Object.values(NovelContentType).includes(novelTypeParam as NovelContentType)
        ? novelTypeParam as NovelContentType
        : null;

    const skip = (page - 1) * limit;

    console.log(`📡 [API /api/novels] Called with URL: ${request.url}`);

    const query: any = {
      status: { $in: [NovelStatus.PUBLISHED, NovelStatus.COMPLETED] }, // ดึงนิยายที่เผยแพร่แล้วหรือจบแล้ว
      accessLevel: NovelAccessLevel.PUBLIC,
      isDeleted: false, // ดึงเฉพาะนิยายที่ไม่ถูกลบ
    };
    const sort: any = {};

    if (novelType === NovelContentType.INTERACTIVE_FICTION) {
      query["sourceType.type"] = NovelContentType.INTERACTIVE_FICTION;
      console.log(`ℹ️ [API /api/novels] Filtering for Visual Novels (Interactive Fiction)`);
    }

    if (categorySlug) {
      const category = await CategoryModel.findOne({ slug: categorySlug }).lean<ICategory>();
      if (category && category._id) {
        console.log(`ℹ️ [API /api/novels] Filtering by category: ${category.name} (ID: ${category._id})`);
        const categoryObjId = category._id; // _id จาก lean() จะเป็น ObjectId (ถ้า schema เป็น ObjectId)
        const categoryConditions = [
          { "themeAssignment.mainTheme.categoryId": categoryObjId },
          { "themeAssignment.subThemes.categoryId": categoryObjId },
          { "themeAssignment.moodAndTone": categoryObjId },
          { "themeAssignment.contentWarnings": categoryObjId },
          // Fields จาก narrativeFocus ที่เป็น ObjectId อ้างอิง Category
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
          // Fields จาก sourceType ที่เป็น ObjectId อ้างอิง Category
          { "sourceType.fandomCategoryId": categoryObjId },
        ];
        // สร้าง $and condition ถ้า query.$or มีอยู่แล้ว (เช่นจาก filter "promoted")
        if (query.$or) {
          query.$and = query.$and ? [...query.$and, { $or: categoryConditions }] : [{ $or: query.$or }, { $or: categoryConditions }];
          delete query.$or; // ลบ query.$or เดิมที่อาจจะมาจาก filter อื่น
        } else {
          query.$or = categoryConditions;
        }
      } else {
        console.warn(`⚠️ [API /api/novels] Category with slug "${categorySlug}" not found.`);
      }
    }

    if (languageIdParam) {
      const langId = toObjectId(languageIdParam); // ใช้ helper function
      if (langId) {
        query.language = langId; // language ใน NovelModel เป็น ObjectId อ้างอิง Category
        console.log(`ℹ️ [API /api/novels] Filtering by languageId: ${languageIdParam}`);
      } else {
        console.warn(`⚠️ [API /api/novels] Invalid languageId format: "${languageIdParam}". Skipping language filter.`);
      }
    }

    switch (filter) {
      case "trending":
        sort["stats.trendingStats.trendingScore"] = -1;
        sort["stats.viewsCount"] = -1;
        console.log(`ℹ️ [API /api/novels] Applying filter: trending`);
        break;
      case "published":
        sort["stats.lastPublishedEpisodeAt"] = -1; // ตอนล่าสุดที่เผยแพร่
        sort["publishedAt"] = -1; // นิยายที่เผยแพร่ล่าสุด (fallback)
        console.log(`ℹ️ [API /api/novels] Applying filter: published (latest episodes/novels)`);
        break;
      case "promoted":
        const now = new Date();
        const promotionConditions = [
          { isFeatured: true },
          {
            "monetizationSettings.activePromotion.isActive": true,
            "monetizationSettings.activePromotion.promotionalPriceCoins": { $exists: true, $ne: null },
            $and: [
              { $or: [{ "monetizationSettings.activePromotion.promotionStartDate": { $lte: now } }, { "monetizationSettings.activePromotion.promotionStartDate": { $exists: false } }] },
              { $or: [{ "monetizationSettings.activePromotion.promotionEndDate": { $gte: now } }, { "monetizationSettings.activePromotion.promotionEndDate": { $exists: false } }] },
            ],
          },
        ];
        if (query.$or) { // ถ้ามีเงื่อนไข $or จาก category filter แล้ว
          query.$and = query.$and ? [...query.$and, { $or: promotionConditions }] : [{ $or: query.$or }, { $or: promotionConditions }];
          delete query.$or;
        } else {
          query.$or = promotionConditions;
        }
        // Sort สำหรับ promoted อาจจะเป็นตามความนิยมหรือการตั้งค่าพิเศษ
        sort["stats.viewsCount"] = -1; // ตัวอย่าง
        sort["publishedAt"] = -1;
        console.log(`ℹ️ [API /api/novels] Applying filter: promoted (featured or active promotions)`);
        break;
      case "completed":
        query.isCompleted = true;
        sort["stats.averageRating"] = -1;
        sort["stats.viewsCount"] = -1;
        sort["publishedAt"] = -1;
        console.log(`ℹ️ [API /api/novels] Applying filter: completed`);
        break;
      default:
        // Fallback to trending if filter is unknown or not provided
        sort["stats.trendingStats.trendingScore"] = -1;
        sort["stats.viewsCount"] = -1;
        console.warn(`⚠️ [API /api/novels] Invalid or missing filter parameter: "${filter}". Defaulting to 'trending'.`);
    }

    const total = await NovelModel.countDocuments(query);
    console.log(`ℹ️ [API /api/novels] Query: ${JSON.stringify(query)}, Sort: ${JSON.stringify(sort)}`);
    console.log(`ℹ️ [API /api/novels] Found ${total} novels matching query.`);

    // ใช้ .lean({ virtuals: true }) และ map เพื่อให้ได้ plain objects และ virtuals
    const rawNovels = await NovelModel.find(query)
      .populate<{ author: Pick<IUser, '_id' | 'username' | 'profile' | 'roles'> }>({
        path: "author",
        select: "username profile.displayName profile.penName profile.avatarUrl roles",
        model: UserModel,
      })
      .populate<{ themeAssignment: { mainTheme: { categoryId: ICategory } } }>({
        path: "themeAssignment.mainTheme.categoryId",
        select: "name slug localizations iconUrl color categoryType description", // เพิ่ม description
        model: CategoryModel,
      })
      .populate<{ language: ICategory }>({
        path: "language",
        select: "name slug localizations iconUrl color categoryType description", // เพิ่ม description
        model: CategoryModel,
      })
      .populate<{ ageRatingCategoryId?: ICategory }>({
        path: "ageRatingCategoryId",
        select: "name slug localizations iconUrl color categoryType description",
        model: CategoryModel,
      })
      .populate<{ 'themeAssignment.subThemes.categoryId': ICategory[] }>({ // Populate subThemes
        path: 'themeAssignment.subThemes.categoryId',
        select: 'name slug iconUrl color categoryType description',
        model: CategoryModel,
      })
      .populate<{ 'themeAssignment.moodAndTone': ICategory[] }>({
        path: 'themeAssignment.moodAndTone',
        select: 'name slug iconUrl color categoryType description',
        model: CategoryModel,
      })
      .populate<{ 'themeAssignment.contentWarnings': ICategory[] }>({
        path: 'themeAssignment.contentWarnings',
        select: 'name slug iconUrl color categoryType description',
        model: CategoryModel,
      })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true }) as any[]; // Cast to any[] temporarily, then map

    // Map to NovelCardData to ensure correct types (especially ObjectId to string)
    // และแปลงโครงสร้างให้ตรงกับ NovelCardData ที่คาดหวัง
    const novels: NovelCardData[] = rawNovels.map(novel => {
      // Helper to transform populated category
      const transformPopulatedCategory = (cat: any): PopulatedCategory | undefined => {
        if (!cat || typeof cat !== 'object') return undefined;
        return {
          ...cat,
          _id: cat._id?.toString(),
        } as PopulatedCategory;
      };

      return {
        _id: novel._id?.toString(),
        title: novel.title,
        slug: novel.slug,
        synopsis: novel.synopsis,
        coverImageUrl: novel.coverImageUrl,
        stats: novel.stats as INovelStats, // Cast stats
        isCompleted: novel.isCompleted,
        isFeatured: novel.isFeatured,
        publishedAt: novel.publishedAt ? new Date(novel.publishedAt) : undefined, // เก็บเป็น Date | undefined แทนการแปลงเป็น string
        status: novel.status as NovelStatus,
        totalEpisodesCount: novel.totalEpisodesCount,
        publishedEpisodesCount: novel.publishedEpisodesCount,
        currentEpisodePriceCoins: novel.currentEpisodePriceCoins, // จาก virtual
        monetizationSettings: novel.monetizationSettings as INovel['monetizationSettings'], // Cast

        author: novel.author ? {
          ...novel.author,
          _id: novel.author._id?.toString(),
          profile: novel.author.profile, // Assuming profile sub-document is fine
        } as PopulatedAuthor : {} as PopulatedAuthor, // Default to empty object if no author

        themeAssignment: {
          mainTheme: novel.themeAssignment?.mainTheme?.categoryId ? {
            categoryId: transformPopulatedCategory(novel.themeAssignment.mainTheme.categoryId)!, // Ensure it's not undefined
            customName: novel.themeAssignment.mainTheme.customName,
          } : { categoryId: { _id: '', name: 'ทั่วไป' } as PopulatedCategory }, // Default mainTheme
          subThemes: novel.themeAssignment?.subThemes?.map((st: any) => ({
            categoryId: transformPopulatedCategory(st.categoryId)!,
            customName: st.customName,
          })).filter((st: any) => st.categoryId) || [],
          moodAndTone: novel.themeAssignment?.moodAndTone?.map(transformPopulatedCategory).filter(Boolean) as PopulatedCategory[] || [],
          contentWarnings: novel.themeAssignment?.contentWarnings?.map(transformPopulatedCategory).filter(Boolean) as PopulatedCategory[] || [],
          customTags: novel.themeAssignment?.customTags || [],
        },
        language: transformPopulatedCategory(novel.language) || { _id: '', name: 'ไม่ระบุ' } as PopulatedCategory, // Default language
        ageRatingCategoryId: transformPopulatedCategory(novel.ageRatingCategoryId),
      };
    });

    console.log(`✅ [API /api/novels] Fetched ${novels.length} novels for filter: ${filter}, page: ${page}, limit: ${limit}`);

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
    console.error(`❌ [API /api/novels] Error fetching novels (URL: ${request.url}):`, error.message, error.stack);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลนิยาย", details: error.message },
      { status: 500 }
    );
  }
}