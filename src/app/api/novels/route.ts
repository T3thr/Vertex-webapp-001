// src/app/api/novels/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import NovelModel, { NovelStatus, NovelAccessLevel, INovel, NovelContentType, IPromotionDetails, INovelStats } from "@/backend/models/Novel";
import UserModel, { IUser } from "@/backend/models/User"; // UserModel ถูก import แต่ไม่ได้ใช้โดยตรงใน GET นี้ อาจใช้ใน POST/PUT
import CategoryModel, { ICategory, CategoryType } from "@/backend/models/Category";
import { NovelCardData, PopulatedAuthor, PopulatedCategory } from "@/components/NovelCard"; // ตรวจสอบ Path ให้ถูกต้อง
import mongoose, { Types } from "mongoose";

// Helper function to safely convert value to ObjectId
// ตรวจสอบว่า id ที่รับมาเป็น string และ valid ObjectId format ก่อนแปลง
const toObjectId = (id: string | undefined | null): Types.ObjectId | null => {
  if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return null;
};

export async function GET(request: Request) {
  try {
    await dbConnect(); // เชื่อมต่อฐานข้อมูล

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "trending"; // default filter คือ trending
    const limit = parseInt(searchParams.get("limit") || "7", 10); // default limit คือ 7 
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
    console.log(`ℹ️ [API /api/novels] Params - filter: ${filter}, limit: ${limit}, page: ${page}, categorySlug: ${categorySlug}, languageId: ${languageIdParam}, novelType: ${novelType}`);

    // Query พื้นฐาน: ดึงเฉพาะนิยายที่เผยแพร่แล้วหรือจบแล้ว, เป็นสาธารณะ, และไม่ถูกลบ
    const query: any = {
      status: { $in: [NovelStatus.PUBLISHED, NovelStatus.COMPLETED] },
      accessLevel: NovelAccessLevel.PUBLIC,
      isDeleted: false,
    };
    const sort: any = {};

    // Filter ตาม sourceType (เช่น interactive_fiction สำหรับ Visual Novels)
    if (novelType) {
      query["sourceType.type"] = novelType;
      console.log(`ℹ️ [API /api/novels] Filtering for novelType: ${novelType}`);
    }

    // Array สำหรับเก็บ $and conditions ถ้ามีหลายเงื่อนไขที่ต้องใช้ $and
    const andConditions: any[] = [];

    // Filter ตาม categorySlug
    if (categorySlug) {
      const category = await CategoryModel.findOne({ slug: categorySlug }).lean<ICategory>();
      if (category && category._id) {
        console.log(`ℹ️ [API /api/novels] Filtering by category: ${category.name} (ID: ${category._id})`);
        const categoryObjId = category._id; // lean() คืน ObjectId ถ้า schema เป็น ObjectId
        const categoryConditions = {
          $or: [ // นิยายต้องมี category นี้ใน field ใด field หนึ่งต่อไปนี้
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
        // ถ้า categorySlug ระบุมาแต่หาไม่เจอ, ควรคืนค่าว่างเพื่อไม่ให้ user สับสน
        return NextResponse.json({ novels: [], pagination: { total: 0, page, limit, totalPages: 0 } }, { 
          status: 200,
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // Cache 5 นาที
            'CDN-Cache-Control': 'public, s-maxage=300'
          }
        });
      }
    }

    // Filter ตาม languageId
    if (languageIdParam) {
      const langId = toObjectId(languageIdParam);
      if (langId) {
        query.language = langId; // language ใน NovelModel เป็น ObjectId อ้างอิง Category
        console.log(`ℹ️ [API /api/novels] Filtering by languageId: ${languageIdParam}`);
      } else {
        console.warn(`⚠️ [API /api/novels] Invalid languageId format: "${languageIdParam}". Skipping language filter.`);
      }
    }

    // Logic การกรองและเรียงลำดับตาม filter parameter
    switch (filter) {
      case "trending":
        sort["stats.trendingStats.trendingScore"] = -1; // เรียงตามคะแนน trending สูงสุด
        sort["stats.viewsCount"] = -1; // สำรองด้วยยอดวิว
        console.log(`ℹ️ [API /api/novels] Applying filter: trending`);
        break;
      case "published":
        sort["stats.lastPublishedEpisodeAt"] = -1; // ตอนล่าสุดที่เผยแพร่
        sort["publishedAt"] = -1; // นิยายที่เผยแพร่ล่าสุด (fallback)
        console.log(`ℹ️ [API /api/novels] Applying filter: published (latest episodes/novels)`);
        break;
      case "promoted":
        const now = new Date();
        const promotionConditions = {
          $or: [ // ต้องเป็น isFeatured หรือมีโปรโมชันที่ active
            { isFeatured: true },
            {
              "monetizationSettings.activePromotion.isActive": true,
              "monetizationSettings.activePromotion.promotionalPriceCoins": { $exists: true, $ne: null },
              $and: [ // ตรวจสอบวันเริ่มและสิ้นสุดโปรโมชัน
                { $or: [{ "monetizationSettings.activePromotion.promotionStartDate": { $lte: now } }, { "monetizationSettings.activePromotion.promotionStartDate": { $exists: false } }] },
                { $or: [{ "monetizationSettings.activePromotion.promotionEndDate": { $gte: now } }, { "monetizationSettings.activePromotion.promotionEndDate": { $exists: false } }] },
              ],
            },
          ]
        };
        andConditions.push(promotionConditions);
        // Sort สำหรับ promoted: อาจจะเรียงตาม isFeatured ก่อน, แล้วตามความนิยม หรือวันที่เผยแพร่
        sort["isFeatured"] = -1; // ให้ isFeatured=true มาก่อน
        sort["stats.trendingStats.trendingScore"] = -1; // แล้วตาม trending
        sort["publishedAt"] = -1;
        console.log(`ℹ️ [API /api/novels] Applying filter: promoted (featured or active promotions)`);
        break;
      case "completed":
        query.isCompleted = true; // นิยายที่จบแล้ว
        sort["stats.averageRating"] = -1; // เรียงตามคะแนนเฉลี่ย
        sort["stats.viewsCount"] = -1;
        sort["publishedAt"] = -1;
        console.log(`ℹ️ [API /api/novels] Applying filter: completed`);
        break;
      default:
        // Fallback ไป trending ถ้า filter ไม่รู้จัก
        sort["stats.trendingStats.trendingScore"] = -1;
        sort["stats.viewsCount"] = -1;
        console.warn(`⚠️ [API /api/novels] Invalid or missing filter parameter: "${filter}". Defaulting to 'trending'.`);
    }

    // รวม $andConditions เข้ากับ query หลัก
    if (andConditions.length > 0) {
      query.$and = query.$and ? [...query.$and, ...andConditions] : andConditions;
    }

    // ปรับปรุง: ใช้ countDocuments แบบ parallel กับ main query
    const [total, rawNovels] = await Promise.all([
      NovelModel.countDocuments(query),
      NovelModel.find(query)
        .populate<{ author: Pick<IUser, '_id' | 'username' | 'profile' | 'roles'> }>({
          path: "author",
          select: "username profile.displayName profile.penName profile.avatarUrl roles", // เลือก field ที่จำเป็นเท่านั้น
          model: UserModel,
        })
        .populate<{ themeAssignment: { mainTheme: { categoryId: ICategory } } }>({
          path: "themeAssignment.mainTheme.categoryId",
          select: "name slug iconUrl color", // ลดข้อมูลที่ไม่จำเป็น
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
        .select("title slug synopsis coverImageUrl status isCompleted isFeatured publishedAt stats monetizationSettings totalEpisodesCount publishedEpisodesCount") // เลือกเฉพาะ field ที่จำเป็นสำหรับการ์ด
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean({ virtuals: true }) // ใช้ lean เพื่อประสิทธิภาพที่ดีขึ้น
    ]);

    console.log(`ℹ️ [API /api/novels] Final Query: ${JSON.stringify(query)}, Sort: ${JSON.stringify(sort)}`);
    console.log(`ℹ️ [API /api/novels] Found ${total} novels matching query, returning ${rawNovels.length} novels.`);

    // ปรับปรุง: Helper functions สำหรับ transform ข้อมูล (เหมือนเดิม)
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

    // Transform ข้อมูลให้ตรงกับ interface ที่ต้องการ
    const novels: NovelCardData[] = rawNovels.map((novel: any) => {
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

    const totalPages = Math.ceil(total / limit);
    const pagination = { total, page, limit, totalPages };

    console.log(`✅ [API /api/novels] Returning ${novels.length} novels with pagination:`, pagination);

    return NextResponse.json(
      { novels, pagination },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200', // Cache 10 นาที, stale-while-revalidate 20 นาที
          'CDN-Cache-Control': 'public, s-maxage=600',
          'Vary': 'Accept-Encoding' // สำหรับ compression
        }
      }
    );

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
          'Cache-Control': 'no-cache', // ไม่ cache error response
        }
      }
    );
  }
}

// POST method สำหรับสร้างนิยายใหม่
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
    let coverImageUrl = null;
    let bannerImageUrl = null;
    
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