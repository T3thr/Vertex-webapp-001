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
        return NextResponse.json({ novels: [], pagination: { total: 0, page, limit, totalPages: 0 } }, { status: 200 });
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

    const total = await NovelModel.countDocuments(query);
    console.log(`ℹ️ [API /api/novels] Final Query: ${JSON.stringify(query)}, Sort: ${JSON.stringify(sort)}`);
    console.log(`ℹ️ [API /api/novels] Found ${total} novels matching query.`);

    // ดึงข้อมูลนิยายพร้อม populate field ที่เกี่ยวข้อง
    // ใช้ .lean({ virtuals: true }) เพื่อให้ได้ plain JS objects และรวม virtual fields (เช่น currentEpisodePriceCoins)
    const rawNovels = await NovelModel.find(query)
      .populate<{ author: Pick<IUser, '_id' | 'username' | 'profile' | 'roles'> }>({
        path: "author",
        select: "username profile.displayName profile.penName profile.avatarUrl roles", // เลือก field ที่จำเป็นสำหรับ card
        model: UserModel, // ระบุ model เพื่อความชัดเจน (Mongoose มักจะ infer ได้)
      })
      .populate<{ themeAssignment: { mainTheme: { categoryId: ICategory }, subThemes: { categoryId: ICategory }[], moodAndTone: ICategory[], contentWarnings: ICategory[] } }>({
        path: "themeAssignment.mainTheme.categoryId",
        select: "name slug localizations iconUrl color categoryType description",
        model: CategoryModel,
      })
      .populate({ // Populate subThemes (array of objects)
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
      .lean({ virtuals: true }) as any[]; // Cast to any[] ชั่วคราว, แล้ว map ด้านล่าง

    // Map ข้อมูลดิบ (rawNovels) ไปยังโครงสร้าง NovelCardData ที่ Client Component (NovelCard) คาดหวัง
    // รวมถึงการแปลง ObjectId เป็น string
    const novels: NovelCardData[] = rawNovels.map(novel => {
      // Helper function สำหรับแปลง populated category (ถ้ามี)
      const transformPopulatedCategory = (cat: any): PopulatedCategory | undefined => {
        if (!cat || typeof cat !== 'object' || !cat._id) return undefined; // ตรวจสอบว่า cat เป็น object และมี _id
        return {
          _id: cat._id.toString(), // แปลง ObjectId เป็น string
          name: cat.name,
          slug: cat.slug,
          localizations: cat.localizations,
          iconUrl: cat.iconUrl,
          color: cat.color,
          categoryType: cat.categoryType,
          description: cat.description,
        };
      };
      
      // Helper สำหรับแปลง array ของ populated categories
      const transformPopulatedCategoryArray = (cats: any[]): PopulatedCategory[] => {
        if (!Array.isArray(cats)) return [];
        return cats.map(transformPopulatedCategory).filter(Boolean) as PopulatedCategory[];
      };

      // สร้าง object author
      const authorData: PopulatedAuthor = novel.author && typeof novel.author === 'object' && novel.author._id
        ? {
            _id: novel.author._id.toString(),
            username: novel.author.username,
            profile: novel.author.profile, // สมมติว่า profile sub-document ถูก populate มาครบ
            roles: novel.author.roles,
          }
        : { _id: new mongoose.Types.ObjectId().toString(), username: "ไม่ทราบนามปากกา" }; // Default author ถ้าไม่มีข้อมูล

      return {
        _id: novel._id?.toString(), // _id ของ Novel
        title: novel.title,
        slug: novel.slug,
        synopsis: novel.synopsis,
        coverImageUrl: novel.coverImageUrl,
        stats: { // เลือกเฉพาะ stats ที่ NovelCard ต้องการ
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
        currentEpisodePriceCoins: novel.currentEpisodePriceCoins, // Virtual field
        monetizationSettings: novel.monetizationSettings as INovel['monetizationSettings'],

        author: authorData,

        themeAssignment: {
          mainTheme: novel.themeAssignment?.mainTheme?.categoryId
            ? {
                categoryId: transformPopulatedCategory(novel.themeAssignment.mainTheme.categoryId)!, // ใช้ ! เพราะมีการตรวจสอบข้างใน transformPopulatedCategory
                customName: novel.themeAssignment.mainTheme.customName,
              }
            : { categoryId: { _id: new mongoose.Types.ObjectId().toString(), name: 'ทั่วไป' } as PopulatedCategory }, // Default mainTheme
          subThemes: novel.themeAssignment?.subThemes?.map((st: any) => ({
            categoryId: transformPopulatedCategory(st.categoryId)!,
            customName: st.customName,
          })).filter((st: any) => st.categoryId && st.categoryId._id) || [], // กรองอันที่ categoryId ถูกแปลงสำเร็จ
          moodAndTone: transformPopulatedCategoryArray(novel.themeAssignment?.moodAndTone),
          contentWarnings: transformPopulatedCategoryArray(novel.themeAssignment?.contentWarnings),
          customTags: novel.themeAssignment?.customTags || [],
        },
        language: transformPopulatedCategory(novel.language) || { _id: new mongoose.Types.ObjectId().toString(), name: 'ไม่ระบุ' } as PopulatedCategory, // Default language
        ageRatingCategoryId: transformPopulatedCategory(novel.ageRatingCategoryId), // อาจเป็น undefined ถ้าไม่มี
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

// POST method สำหรับสร้างนิยายใหม่
export async function POST(request: Request) {
  try {
    await dbConnect();

    const body = await request.json();
    const { 
      title, 
      penName, 
      synopsis, 
      mainThemeId, 
      languageId,
      authorId,
      contentType = NovelContentType.INTERACTIVE_FICTION 
    } = body;

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
      status: NovelStatus.DRAFT,
      accessLevel: NovelAccessLevel.PRIVATE,
      isCompleted: false,
      sourceType: {
        type: contentType
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