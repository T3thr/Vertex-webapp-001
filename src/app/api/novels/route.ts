// src/app/api/novels/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import NovelModel, { NovelStatus, NovelAccessLevel, INovel, NovelContentType, IPromotionDetails, INovelStats } from "@/backend/models/Novel";
import UserModel, { IUser } from "@/backend/models/User";
import CategoryModel, { ICategory, CategoryType } from "@/backend/models/Category";
import { NovelCardData, PopulatedAuthor, PopulatedCategory } from "@/components/NovelCard";
import mongoose, { Types } from "mongoose";
import { CacheManager, CacheKeys, CacheTTL } from "@/backend/lib/redis";

// Helper function to safely convert value to ObjectId
const toObjectId = (id: string | undefined | null): Types.ObjectId | null => {
  if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return null;
};

// ฟังก์ชันสำหรับสร้าง cache key ที่ unique และ optimized
const createCacheKey = (filter: string, limit: number, page: number, categorySlug?: string, novelType?: string): string => {
  return CacheKeys.NOVELS_LIST(filter, page, limit, categorySlug || undefined, novelType || undefined);
};

// Advanced query builder สำหรับ performance
function buildQuery(filter: string, categorySlug?: string, novelType?: string, languageIdParam?: string) {
  // Query พื้นฐาน: ดึงเฉพาะนิยายที่เผยแพร่แล้วหรือจบแล้ว, เป็นสาธารณะ, และไม่ถูกลบ
  const query: any = {
    status: { $in: [NovelStatus.PUBLISHED, NovelStatus.COMPLETED] },
    accessLevel: NovelAccessLevel.PUBLIC,
    isDeleted: false,
  };
  const sort: any = {};
  const andConditions: any[] = [];

  // Filter ตาม sourceType
  if (novelType && Object.values(NovelContentType).includes(novelType as NovelContentType)) {
    query["sourceType.type"] = novelType;
  }

  // Logic การกรองและเรียงลำดับตาม filter parameter
  switch (filter) {
    case "trending":
      sort["stats.trendingStats.trendingScore"] = -1;
      sort["stats.viewsCount"] = -1;
      break;
    case "published":
      sort["stats.lastPublishedEpisodeAt"] = -1;
      sort["publishedAt"] = -1;
      break;
    case "promoted":
      const now = new Date();
      const promotionConditions = {
        "monetizationSettings.activePromotion.isActive": true,
        "monetizationSettings.activePromotion.promotionalPriceCoins": { $exists: true, $ne: null },
        $and: [
          { $or: [{ "monetizationSettings.activePromotion.promotionStartDate": { $lte: now } }, { "monetizationSettings.activePromotion.promotionStartDate": { $exists: false } }] },
          { $or: [{ "monetizationSettings.activePromotion.promotionEndDate": { $gte: now } }, { "monetizationSettings.activePromotion.promotionEndDate": { $exists: false } }] },
        ],
      };
      andConditions.push(promotionConditions);
      sort["stats.trendingStats.trendingScore"] = -1;
      sort["stats.viewsCount"] = -1;
      sort["publishedAt"] = -1;
      break;
    case "completed":
      query.isCompleted = true;
      sort["stats.averageRating"] = -1;
      sort["stats.viewsCount"] = -1;
      sort["publishedAt"] = -1;
      break;
    default:
      sort["stats.trendingStats.trendingScore"] = -1;
      sort["stats.viewsCount"] = -1;
  }

  return { query, sort, andConditions };
}

// Optimized database fetch function พร้อม connection pooling
async function fetchNovelsFromDB(
  filter: string,
  limit: number,
  page: number,
  categorySlug?: string,
  novelType?: string,
  languageIdParam?: string
) {
  const skip = (page - 1) * limit;
  const { query, sort, andConditions } = buildQuery(filter, categorySlug, novelType, languageIdParam);

  // Filter ตาม categorySlug
  if (categorySlug) {
    const category = await CategoryModel.findOne({ slug: categorySlug }).lean<ICategory>();
    if (category && category._id) {
      const categoryObjId = category._id;
      const categoryConditions = {
        $or: [
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
      return { novels: [], total: 0 };
    }
  }

  // Filter ตาม languageId
  if (languageIdParam) {
    const langId = toObjectId(languageIdParam);
    if (langId) {
      query.language = langId;
    }
  }

  // รวม $andConditions เข้ากับ query หลัก
  if (andConditions.length > 0) {
    query.$and = query.$and ? [...query.$and, ...andConditions] : andConditions;
  }

  // Optimized parallel fetch with lean queries
  const [total, rawNovels] = await Promise.all([
    NovelModel.countDocuments(query),
    NovelModel.find(query)
      .populate<{ author: Pick<IUser, '_id' | 'username' | 'profile' | 'roles'> }>({
        path: "author",
        select: "username profile.displayName profile.penName profile.avatarUrl roles",
        model: UserModel,
      })
      .populate<{ themeAssignment: { mainTheme: { categoryId: ICategory } } }>({
        path: "themeAssignment.mainTheme.categoryId",
        select: "name slug iconUrl color",
        model: CategoryModel,
      })
      .populate({
        path: "language",
        select: "name slug",
        model: CategoryModel,
      })
      .populate({
        path: "ageRatingCategoryId",
        select: "name",
        model: CategoryModel,
      })
      .select("title slug synopsis coverImageUrl status isCompleted isFeatured publishedAt stats monetizationSettings totalEpisodesCount publishedEpisodesCount themeAssignment ageRatingCategoryId")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true })
  ]);

  return { novels: rawNovels, total };
}

// Helper functions สำหรับ transform ข้อมูล (optimized)
const transformPopulatedCategory = (cat: any): PopulatedCategory | undefined => {
  if (!cat || !cat._id) return undefined;
  return {
    _id: cat._id.toString(),
    name: cat.name || 'Unknown Category',
    slug: cat.slug,
    localizations: cat.localizations,
    iconUrl: cat.iconUrl,
    color: cat.color,
    categoryType: cat.categoryType,
    description: cat.description,
  };
};

const transformPopulatedCategoryArray = (cats: any[]): PopulatedCategory[] => {
  if (!Array.isArray(cats)) return [];
  return cats.map(transformPopulatedCategory).filter(Boolean) as PopulatedCategory[];
};

// Optimized data transformation
const transformNovels = (rawNovels: any[]): NovelCardData[] => {
  return rawNovels.map((novel: any) => {
    const transformedAuthor: PopulatedAuthor = {
      _id: novel.author?._id?.toString() || '',
      username: novel.author?.username,
      profile: novel.author?.profile || {},
      roles: novel.author?.roles || [],
    };

    const transformedNovel: NovelCardData = {
      _id: novel._id.toString(),
      title: novel.title || 'ไม่มีชื่อ',
      slug: novel.slug || '',
      synopsis: novel.synopsis || '',
      coverImageUrl: novel.coverImageUrl,
      isCompleted: novel.isCompleted || false,
      isFeatured: novel.isFeatured || false,
      publishedAt: novel.publishedAt?.toISOString(),
      status: novel.status,
      totalEpisodesCount: novel.totalEpisodesCount || 0,
      publishedEpisodesCount: novel.publishedEpisodesCount || 0,
      currentEpisodePriceCoins: novel.currentEpisodePriceCoins || 0,
      author: transformedAuthor,
      themeAssignment: {
        mainTheme: novel.themeAssignment?.mainTheme?.categoryId
          ? {
              categoryId: transformPopulatedCategory(novel.themeAssignment.mainTheme.categoryId)!,
              customName: novel.themeAssignment.mainTheme.customName,
            }
          : undefined,
        subThemes: novel.themeAssignment?.subThemes
          ? novel.themeAssignment.subThemes.map((subTheme: any) => ({
              categoryId: transformPopulatedCategory(subTheme.categoryId)!,
              customName: subTheme.customName,
            })).filter((st: any) => st.categoryId)
          : [],
        moodAndTone: transformPopulatedCategoryArray(novel.themeAssignment?.moodAndTone || []),
        contentWarnings: transformPopulatedCategoryArray(novel.themeAssignment?.contentWarnings || []),
        customTags: novel.themeAssignment?.customTags || [],
      },
      language: transformPopulatedCategory(novel.language)!,
      ageRatingCategoryId: transformPopulatedCategory(novel.ageRatingCategoryId),
      monetizationSettings: novel.monetizationSettings,
      stats: {
        viewsCount: novel.stats?.viewsCount || 0,
        likesCount: novel.stats?.likesCount || 0,
        averageRating: novel.stats?.averageRating || 0,
        lastPublishedEpisodeAt: novel.stats?.lastPublishedEpisodeAt?.toISOString(),
      },
    };

    return transformedNovel;
  });
};

export async function GET(request: Request) {
  try {
    // เชื่อมต่อ database
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "trending";
    const limit = Math.min(parseInt(searchParams.get("limit") || "7", 10), 20); // จำกัดสูงสุด 20
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1); // ขั้นต่ำ 1
    const categorySlug = searchParams.get("categorySlug");
    const languageIdParam = searchParams.get("languageId");

    // ตรวจสอบ novelType และ cast ให้ตรงกับ NovelContentType หรือ null
    const novelTypeParam = searchParams.get("novelType");
    const novelType = novelTypeParam && Object.values(NovelContentType).includes(novelTypeParam as NovelContentType)
      ? novelTypeParam as NovelContentType
      : null;

    console.log(`📡 [API /api/novels] Called with URL: ${request.url}`);

    // สร้าง cache key ที่ unique
    const cacheKey = createCacheKey(filter, limit, page, categorySlug || undefined, novelType || undefined);
    
    console.log(`🔍 [API /api/novels] Cache key: ${cacheKey}`);

    try {
      // ใช้ getWithFallback สำหรับ automatic caching
      const result = await CacheManager.getWithFallback(
        cacheKey,
        async () => {
          console.log(`❌ [API /api/novels] Cache MISS - fetching from database`);
          const { novels: rawNovels, total } = await fetchNovelsFromDB(
            filter, 
            limit, 
            page, 
            categorySlug || undefined, 
            novelType || undefined, 
            languageIdParam || undefined
          );

          const novels: NovelCardData[] = transformNovels(rawNovels);
          return { novels, total };
        },
        CacheTTL.NOVELS_LIST
      );

      const { novels, total } = result;
      const totalPages = Math.ceil(total / limit);
      const pagination = { total, page, limit, totalPages };

      // ตรวจสอบว่ามีข้อมูลจาก cache หรือไม่
      const isFromCache = await CacheManager.exists(cacheKey);
      const cacheStatus = isFromCache ? 'HIT' : 'MISS';
      
      console.log(`✅ [API /api/novels] ${cacheStatus} - returning ${novels.length} novels`);

      // Response headers optimized สำหรับ performance
      const responseHeaders = {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120', // ลด cache time
        'CDN-Cache-Control': 'public, s-maxage=60',
        'Vary': 'Accept-Encoding, Accept',
        'X-Cache-Status': cacheStatus,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Content-Type': 'application/json; charset=utf-8',
      };

      return NextResponse.json(
        { novels, pagination },
        { status: 200, headers: responseHeaders }
      );

    } catch (cacheError) {
      console.error(`⚠️ [API /api/novels] Cache error (fallback to DB):`, cacheError);
      
      // Fallback เมื่อ cache error
      const { novels: rawNovels, total } = await fetchNovelsFromDB(
        filter, 
        limit, 
        page, 
        categorySlug || undefined, 
        novelType || undefined, 
        languageIdParam || undefined
      );

      const novels: NovelCardData[] = transformNovels(rawNovels);
      const totalPages = Math.ceil(total / limit);
      const pagination = { total, page, limit, totalPages };

      return NextResponse.json(
        { novels, pagination },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
            'X-Cache-Status': 'ERROR-FALLBACK'
          }
        }
      );
    }

  } catch (error) {
    console.error('❌ [API /api/novels] Error:', error);
    return NextResponse.json(
      { 
        error: 'เกิดข้อผิดพลาดในการดึงข้อมูลนิยาย',
        novels: [], 
        pagination: { total: 0, page: 1, limit: 7, totalPages: 0 } 
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache',
          'X-Cache-Status': 'ERROR'
        }
      }
    );
  }
}

// POST method สำหรับสร้างนิยายใหม่ (optimized)
export async function POST(request: Request) {
  try {
    await dbConnect();

    // รองรับทั้ง JSON และ FormData
    const contentType = request.headers.get('content-type');
    let formData: any = {};
    
    if (contentType?.includes('multipart/form-data')) {
      const form = await request.formData();
      // แปลง FormData เป็น object
      for (const [key, value] of form.entries()) {
        if (key === 'coverImage' || key === 'bannerImage') {
          formData[key] = value; // เก็บ File object
        } else {
          formData[key] = value.toString();
        }
      }
    } else {
      formData = await request.json();
    }

    const { 
      title, 
      penName, 
      synopsis, 
      longDescription,
      mainThemeId, 
      languageId,
      ageRating,
      authorId,
      contentType: novelContentType = NovelContentType.INTERACTIVE_FICTION,
      endingType = 'multiple_endings',
      coverImage,
      bannerImage
    } = formData;

    console.log(`📝 [API /api/novels POST] Creating new novel: ${title} by ${penName}`);

    // Validation
    if (!title || !authorId) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบถ้วน กรุณาระบุชื่อเรื่องและผู้แต่ง" },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าผู้ใช้มีสิทธิ์เป็นนักเขียน
    const user = await UserModel.findById(authorId);
    if (!user || !user.roles.includes('Writer')) {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์ในการสร้างนิยาย กรุณาสมัครเป็นนักเขียนก่อน" },
        { status: 403 }
      );
    }

    // หา default category สำหรับ mainTheme
    let mainThemeCategory = null;
    if (mainThemeId) {
      mainThemeCategory = await CategoryModel.findById(mainThemeId);
    }
    
    if (!mainThemeCategory) {
      // หา default category
      mainThemeCategory = await CategoryModel.findOne({ 
        categoryType: CategoryType.THEME,
        isActive: true 
      }).sort({ createdAt: 1 }); // เอาตัวแรกที่สร้าง
    }

    // หา default language
    let languageCategory = null;
    if (languageId) {
      languageCategory = await CategoryModel.findById(languageId);
    }
    
    if (!languageCategory) {
      // หา default language (ภาษาไทย)
      languageCategory = await CategoryModel.findOne({ 
        categoryType: CategoryType.LANGUAGE,
        isActive: true,
        $or: [
          { name: 'ไทย' },
          { name: 'Thai' },
          { slug: 'thai' }
        ]
      });
      
      if (!languageCategory) {
        languageCategory = await CategoryModel.findOne({ 
          categoryType: CategoryType.LANGUAGE,
          isActive: true 
        }).sort({ createdAt: 1 });
      }
    }

    // หา age rating category
    let ageRatingCategory = null;
    if (ageRating) {
      ageRatingCategory = await CategoryModel.findById(ageRating);
    }

    // จัดการการอัพโหลดรูปภาพ (ถ้ามี)
    const coverImageUrl = null;
    const bannerImageUrl = null;
    
    // TODO: ในอนาคตอาจต้องใช้ cloud storage service เช่น AWS S3, Cloudinary
    // ตอนนี้จะข้าม file upload ไปก่อน เพราะต้องมี storage service
    if (coverImage && coverImage instanceof File) {
      console.log(`📷 [API /api/novels POST] Cover image received: ${coverImage.name} (${coverImage.size} bytes)`);
      // coverImageUrl = await uploadToCloudStorage(coverImage);
    }
    
    if (bannerImage && bannerImage instanceof File) {
      console.log(`🖼️ [API /api/novels POST] Banner image received: ${bannerImage.name} (${bannerImage.size} bytes)`);
      // bannerImageUrl = await uploadToCloudStorage(bannerImage);
    }

    // สร้าง slug
    const baseSlug = title
      .toLowerCase()
      .replace(/[^\u0E00-\u0E7Fa-z0-9\s-]/g, '') // อนุญาตภาษาไทย อังกฤษ ตัวเลข เว้นวรรค และ dash
      .replace(/\s+/g, '-') // เปลี่ยนเว้นวรรคเป็น dash
      .replace(/-+/g, '-') // ลด dash ที่ซ้ำกัน
      .replace(/^-|-$/g, ''); // ลบ dash ที่ขึ้นต้นและลงท้าย

    // ตรวจสอบ slug ซ้ำและสร้าง unique slug
    let slug = baseSlug;
    let counter = 1;
    while (await NovelModel.findOne({ slug, isDeleted: { $ne: true } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // สร้างนิยายใหม่
    const newNovel = new NovelModel({
      title: title.trim(),
      slug,
      author: new mongoose.Types.ObjectId(authorId),
      synopsis: synopsis?.trim() || '',
      longDescription: longDescription?.trim() || '',
      coverImageUrl,
      bannerImageUrl,
      status: NovelStatus.DRAFT,
      accessLevel: NovelAccessLevel.PRIVATE,
      isCompleted: false,
      endingType: endingType || 'multiple_endings',
      sourceType: {
        type: novelContentType
      },
      themeAssignment: {
        mainTheme: {
          categoryId: mainThemeCategory?._id || null,
          customName: penName || undefined
        },
        subThemes: [],
        moodAndTone: [],
        contentWarnings: [],
        customTags: []
      },
      ageRatingCategoryId: ageRatingCategory?._id || null,
      language: languageCategory?._id || null,
      totalEpisodesCount: 0,
      publishedEpisodesCount: 0,
      stats: {
        viewsCount: 0,
        uniqueViewersCount: 0,
        likesCount: 0,
        commentsCount: 0,
        discussionThreadCount: 0,
        ratingsCount: 0,
        averageRating: 0,
        followersCount: 0,
        sharesCount: 0,
        bookmarksCount: 0,
        totalWords: 0,
        estimatedReadingTimeMinutes: 0,
        completionRate: 0,
        purchasesCount: 0
      },
      monetizationSettings: {
        isCoinBasedUnlock: false,
        allowDonations: false,
        isAdSupported: false,
        isPremiumExclusive: false
      },
      psychologicalAnalysisConfig: {
        allowsPsychologicalAnalysis: true
      },
      isFeatured: false,
      lastContentUpdatedAt: new Date(),
      isDeleted: false
    });

    const savedNovel = await newNovel.save();
    console.log(`✅ [API /api/novels POST] Novel created successfully: ${savedNovel.title} (${savedNovel._id})`);

    // Invalidate relevant cache patterns
    await Promise.allSettled([
      CacheManager.invalidatePattern('divwy:v2:novels:list:'),
      CacheManager.invalidatePattern('divwy:v2:homepage:'),
      CacheManager.invalidatePattern('divwy:v2:trending:'),
    ]);

    // Populate ข้อมูลสำหรับส่งกลับ
    const populatedNovel = await NovelModel.findById(savedNovel._id)
      .populate('author', 'username profile')
      .populate('themeAssignment.mainTheme.categoryId', 'name')
      .populate('language', 'name')
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: "สร้างนิยายใหม่สำเร็จ",
        novel: {
          _id: populatedNovel?._id.toString(),
          id: populatedNovel?._id.toString(),
          title: populatedNovel?.title,
          slug: populatedNovel?.slug,
          synopsis: populatedNovel?.synopsis,
          status: populatedNovel?.status,
          coverImageUrl: populatedNovel?.coverImageUrl,
          bannerImageUrl: populatedNovel?.bannerImageUrl,
          stats: populatedNovel?.stats,
          themeAssignment: populatedNovel?.themeAssignment,
          lastContentUpdatedAt: populatedNovel?.lastContentUpdatedAt,
          createdAt: populatedNovel?.createdAt,
          updatedAt: populatedNovel?.updatedAt
        }
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error(`❌ [API /api/novels POST] Error creating novel:`, error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "ชื่อเรื่องหรือ slug นี้มีอยู่แล้ว กรุณาเลือกชื่อใหม่" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการสร้างนิยาย กรุณาลองใหม่อีกครั้ง", details: error.message },
      { status: 500 }
    );
  }
}