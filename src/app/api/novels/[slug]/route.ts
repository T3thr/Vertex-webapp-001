// src/app/api/novels/[slug]/route.ts
// API Route สำหรับดึงข้อมูลนิยายตาม slug เพื่อแสดงในหน้ารายละเอียด
// รองรับการ populate ข้อมูลที่เกี่ยวข้องทั้งหมด เช่น หมวดหมู่, ผู้เขียน, ตัวละคร, ตอน

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import NovelModel, { INovel, IThemeAssignment, ISourceType, INarrativeFocus, IWorldBuildingDetails, INovelStats, IMonetizationSettings, IPsychologicalAnalysisConfig, ICollaborationSettings, NovelStatus as NovelStatusEnum } from "@/backend/models/Novel";
import UserModel, { IUser, IUserProfile } from "@/backend/models/User";
import CategoryModel, { ICategory } from "@/backend/models/Category";
import CharacterModel, { ICharacter, CharacterRoleInStory } from "@/backend/models/Character";
import EpisodeModel, { IEpisode, EpisodeStatus, EpisodeAccessType } from "@/backend/models/Episode";
// import { Types } from "mongoose"; // Types ถูกใช้อย่างไรในไฟล์นี้? ถ้าไม่ใช้โดยตรง ลบออกได้

// ===================================================================
// SECTION: TypeScript Interfaces สำหรับ API Response (ส่วนแสดงผลข้อมูลนิยาย)
// ===================================================================

/**
 * @interface PopulatedAuthorForDetailPage
 * @description Interface สำหรับข้อมูลผู้เขียนที่ถูก populate (เลือกเฉพาะ field ที่จำเป็นสำหรับหน้ารายละเอียด)
 */
interface PopulatedAuthorForDetailPage {
  _id: string;
  username?: string;
  profile: { // จาก IUserProfile
    displayName?: string;
    penName?: string;
    avatarUrl?: string;
    bio?: string;
  };
  writerStats?: { // จาก IWriterStats (เลือก field ที่ต้องการ)
    totalNovelsPublished: number;
    totalViewsAcrossAllNovels: number;
    totalLikesReceivedOnNovels: number;
    // เพิ่ม field อื่นๆ จาก IWriterStats ได้ตามต้องการ เช่น totalFollowers (ถ้ามีใน writerStats)
  };
}

/**
 * @interface PopulatedCategoryInfo
 * @description Interface สำหรับข้อมูล Category ที่ถูก populate บางส่วน (ชื่อ, slug, สี)
 */
interface PopulatedCategoryInfo {
  _id: string;
  name: string;
  slug: string;
  color?: string;
  // description?: string; // เพิ่มได้หากต้องการแสดงคำอธิบายหมวดหมู่
}

/**
 * @interface PopulatedThemeAssignmentForDetailPage
 * @description Interface สำหรับ themeAssignment ที่มี CategoryId ถูก populate แล้ว
 */
interface PopulatedThemeAssignmentForDetailPage {
  mainTheme: {
    categoryId: PopulatedCategoryInfo; // Populated
    customName?: string;
  };
  subThemes?: Array<{
    categoryId: PopulatedCategoryInfo; // Populated
    customName?: string;
  }>;
  moodAndTone?: PopulatedCategoryInfo[]; // Populated array
  contentWarnings?: PopulatedCategoryInfo[]; // Populated array
  customTags?: string[];
}

/**
 * @interface PopulatedCharacterForDetailPage
 * @description Interface สำหรับข้อมูลตัวละครที่แสดงในหน้ารายละเอียดนิยาย (เลือก field ที่จำเป็น)
 */
interface PopulatedCharacterForDetailPage {
  _id: string;
  name: string;
  profileImageUrl?: string; // Virtual field จาก Character model
  description?: string;
  roleInStory?: CharacterRoleInStory;
  colorTheme?: string;
  // เพิ่ม field อื่นๆ ได้ตามต้องการ เช่น characterCode
}

/**
 * @interface PopulatedEpisodeForDetailPage
 * @description Interface สำหรับข้อมูลตอนที่แสดงในหน้ารายละเอียดนิยาย (เลือก field ที่จำเป็น)
 */
interface PopulatedEpisodeForDetailPage {
  _id: string;
  title: string;
  episodeOrder: number;
  status: EpisodeStatus;
  accessType: EpisodeAccessType;
  priceCoins?: number;
  publishedAt?: string; // ISOString (ควรแปลง Date เป็น string ก่อนส่ง response)
  teaserText?: string;
  stats: { // จาก IEpisodeStats (เลือก field ที่ต้องการ)
    viewsCount: number;
    likesCount: number;
    commentsCount: number;
    totalWords: number;
    estimatedReadingTimeMinutes: number;
    // purchasesCount?: number; // เพิ่มได้หากต้องการแสดง
  };
  // episodeUrl?: string; // เพิ่ม virtual field ถ้าต้องการ
}


/**
 * @interface PopulatedNovelForDetailPage
 * @description Interface สำหรับข้อมูลนิยายที่ถูก populate แล้วสำหรับหน้ารายละเอียด
 * Interface นี้ควรสะท้อนโครงสร้างข้อมูลที่ Frontend (page.tsx) คาดหวัง
 */
export interface PopulatedNovelForDetailPage {
  _id: string;
  title: string;
  slug: string;
  author: PopulatedAuthorForDetailPage; // Populated
  synopsis: string;
  longDescription?: string;
  coverImageUrl?: string;
  bannerImageUrl?: string;
  themeAssignment: PopulatedThemeAssignmentForDetailPage; // Populated ภายใน
  narrativeFocus?: INarrativeFocus; // Schema เดิม, ObjectId ภายในยังไม่ populate
  worldBuildingDetails?: IWorldBuildingDetails; // Schema เดิม
  ageRatingCategoryId?: PopulatedCategoryInfo; // Populated
  status: NovelStatusEnum; // ใช้ Enum จาก Novel model โดยตรง
  accessLevel: INovel["accessLevel"];
  isCompleted: boolean;
  endingType: INovel["endingType"];
  sourceType: ISourceType; // Schema เดิม
  language: PopulatedCategoryInfo; // Populated
  firstEpisodeId?: string; // ObjectId as string
  totalEpisodesCount: number;
  publishedEpisodesCount: number;
  stats: INovelStats; // Schema เดิม
  monetizationSettings: IMonetizationSettings; // Schema เดิม
  psychologicalAnalysisConfig: IPsychologicalAnalysisConfig; // Schema เดิม
  collaborationSettings?: ICollaborationSettings; // Schema เดิม
  isFeatured?: boolean;
  publishedAt?: string; // ISOString
  scheduledPublicationDate?: string; // ISOString
  lastContentUpdatedAt: string; // ISOString
  relatedNovels?: string[]; // Array of ObjectIds as strings
  seriesId?: string; // ObjectId as string
  seriesOrder?: number;
  createdAt: string; // ISOString
  updatedAt: string; // ISOString

  // ข้อมูลตัวละครหลัก (แสดงตามจำนวนที่ query มา, เช่น 6 ตัวแรก)
  characters?: PopulatedCharacterForDetailPage[];

  // ข้อมูลตอน (แสดงตามจำนวนที่ query มา, เช่น 10 ตอนแรก)
  episodes?: PopulatedEpisodeForDetailPage[];

  // เพิ่ม field อื่นๆ ที่จำเป็นสำหรับ UI เช่น novelUrl (virtual)
  novelUrl?: string;
}

// ===================================================================
// SECTION: API Route Handler
// ===================================================================

/**
 * GET Handler สำหรับดึงข้อมูลนิยายตาม slug
 * @param request NextRequest object - อ็อบเจกต์คำขอ HTTP ขาเข้า
 * @param context Context object ที่มี params - อ็อบเจกต์ context ที่ Next.js ส่งมา ซึ่งมี property `params`
 * @param context.params พารามิเตอร์ของ Route แบบ động (dynamic route parameters)
 * @param context.params.slug slug ของนิยายที่ต้องการดึงข้อมูล
 * @returns NextResponse ที่มีข้อมูลนิยายหรือ error object
 */
export async function GET(
  request: NextRequest, // อาร์กิวเมนต์แรกคือ NextRequest เสมอ
  { params }: { params: { slug: string } } // อาร์กิวเมนต์ที่สองคือ object ที่มี property `params`
) {
  try {
    // 1. เชื่อมต่อฐานข้อมูล
    // การเรียก dbConnect() ทุกครั้งที่มีการ request เป็น pattern ที่ใช้ได้กับ serverless functions
    // Mongoose จะจัดการ connection pooling
    await dbConnect();

    // 2. ดึงและตรวจสอบ slug จาก params
    const slug = params.slug;
    if (!slug || typeof slug !== 'string' || !slug.trim()) {
      console.warn(`⚠️ [API GET /novels/${slug}] Slug ไม่ถูกต้อง: "${slug}"`);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid slug parameter",
          message: "กรุณาระบุ slug ของนิยายที่ถูกต้องใน URL"
        },
        { status: 400 }
      );
    }
    const cleanedSlug = slug.trim().toLowerCase();
    console.log(`📄 [API GET /novels/${cleanedSlug}] กำลังดึงข้อมูลนิยายสำหรับ slug: "${cleanedSlug}"`);

    // 3. ค้นหานิยายในฐานข้อมูลด้วย slug ที่ผ่านการทำความสะอาดแล้ว
    //    พร้อมทั้ง populate ข้อมูลที่เกี่ยวข้องเพื่อลดจำนวน query ในภายหลัง
    //    ใช้ .lean() เพื่อให้ได้ Plain Old JavaScript Object (POJO) ซึ่งเร็วกว่า Mongoose Document เต็มรูปแบบ
    //    และลด memory footprint โดยเฉพาะเมื่อข้อมูลมีขนาดใหญ่หรือมีการ populate เยอะ
    const novelFromDb = await NovelModel.findOne({
      slug: cleanedSlug,
      isDeleted: { $ne: true }, // ไม่แสดงนิยายที่ถูก soft delete
      // status: NovelStatusEnum.PUBLISHED, // พิจารณา: อาจจะแสดงเฉพาะนิยายที่ PUBLISHED หรือ COMPLETED ในหน้านี้
                                         // หรืออาจจะมี logic การแสดงผลที่ต่างกันสำหรับสถานะ DRAFT ให้กับผู้เขียน
    })
    .populate<{ author: IUser }>({
      path: 'author',
      select: 'username profile writerStats.totalNovelsPublished writerStats.totalViewsAcrossAllNovels writerStats.totalLikesReceivedOnNovels', // เลือกเฉพาะ field ที่จำเป็นจาก User และ WriterStats
      model: UserModel // ระบุ Model เพื่อความชัดเจน แม้ Mongoose อาจ infer ได้
    })
    .populate<{ themeAssignment_mainTheme_categoryId: ICategory }>({ // ตัวอย่างการ type สำหรับ populated field
      path: 'themeAssignment.mainTheme.categoryId',
      select: 'name slug color description', // เลือก field ที่ต้องการจาก Category
      model: CategoryModel
    })
    .populate<{ themeAssignment_subThemes_categoryId: ICategory[] }>({
      path: 'themeAssignment.subThemes.categoryId',
      select: 'name slug color description',
      model: CategoryModel
    })
    .populate<{ themeAssignment_moodAndTone: ICategory[] }>({
      path: 'themeAssignment.moodAndTone',
      select: 'name slug color description',
      model: CategoryModel
    })
    .populate<{ themeAssignment_contentWarnings: ICategory[] }>({
      path: 'themeAssignment.contentWarnings',
      select: 'name slug color description',
      model: CategoryModel
    })
    .populate<{ ageRatingCategoryId: ICategory }>({
      path: 'ageRatingCategoryId',
      select: 'name slug color description',
      model: CategoryModel
    })
    .populate<{ language: ICategory }>({
      path: 'language',
      select: 'name slug', // ภาษาอาจไม่ต้องการสี
      model: CategoryModel
    })
    // พิจารณา populate เพิ่มเติมสำหรับ INarrativeFocus fields ถ้าต้องการแสดงชื่อ Category แทน ObjectId
    // .populate({ path: 'narrativeFocus.narrativePacingTags', select: 'name slug', model: CategoryModel })
    // .populate({ path: 'narrativeFocus.primaryConflictTypes', select: 'name slug', model: CategoryModel })
    // ... อื่นๆ ใน narrativeFocus และ worldBuildingDetails ถ้ามี ObjectId และต้องการ populate
    .lean({ virtuals: true }); // เพิ่ม { virtuals: true } เพื่อให้ virtual fields (เช่น novelUrl) ถูกคำนวณและรวมอยู่ในผลลัพธ์ของ .lean()

    // 4. ตรวจสอบว่าพบนิยายหรือไม่
    if (!novelFromDb) {
      console.warn(`⚠️ [API GET /novels/${cleanedSlug}] ไม่พบนิยายสำหรับ slug: "${cleanedSlug}"`);
      return NextResponse.json(
        {
          success: false,
          error: "Novel not found",
          message: `ขออภัย ไม่พบนิยายที่คุณกำลังค้นหา (slug: ${cleanedSlug})`
        },
        { status: 404 }
      );
    }

    // 5. Helper functions สำหรับแปลงข้อมูล Category ที่ populate มาแล้ว (ถ้าจำเป็น)
    //    ฟังก์ชันเหล่านี้ช่วยให้มั่นใจว่าโครงสร้างข้อมูลที่ส่งกลับไปให้ client ตรงกับที่คาดหวัง
    const toPopulatedCategoryInfo = (cat: any): PopulatedCategoryInfo | undefined => {
      if (!cat || typeof cat !== 'object' || !cat._id) return undefined; // ตรวจสอบให้แน่ใจว่า cat เป็น object ที่มี _id
      return {
        _id: cat._id.toString(),
        name: cat.name,
        slug: cat.slug,
        color: cat.color,
        // description: cat.description, // เพิ่มตามต้องการ
      };
    };

    const toPopulatedCategoryInfoArray = (cats: any[]): PopulatedCategoryInfo[] => {
      if (!Array.isArray(cats)) return [];
      return cats.map(toPopulatedCategoryInfo).filter(Boolean) as PopulatedCategoryInfo[];
    };

    // 6. ดึงข้อมูลตัวละครของนิยาย (จำกัดจำนวนเพื่อ performance)
    //    ควรเลือกเฉพาะ field ที่จำเป็นสำหรับการแสดงผลในหน้ารายละเอียดนิยาย
    const charactersFromDb = await CharacterModel.find({
      novelId: novelFromDb._id, // ใช้ _id จาก novel ที่ดึงมาได้
      isArchived: false
    })
    .select('name description roleInStory colorTheme profileImageMediaId profileImageSourceType') // profileImageUrl เป็น virtual
    .sort({ createdAt: 1 }) // หรือเรียงตาม 'orderInNovel' ถ้ามี field นั้น
    .limit(6) // แสดง 6 ตัวละครแรก
    .lean({ virtuals: true }); // ให้ virtual 'profileImageUrl' ทำงาน

    const characters: PopulatedCharacterForDetailPage[] = charactersFromDb.map(charDB => {
      const char = charDB as any; // Cast to any to access potential virtuals not in ICharacter initially
      return {
        _id: char._id.toString(),
        name: char.name,
        // หาก .lean({ virtuals: true }) ทำให้ profileImageUrl อยู่ใน char แล้ว ให้ใช้ char.profileImageUrl
        // มิฉะนั้น สร้าง URL เองตาม logic เดิม หรือปรับปรุง CharacterModel virtual ให้ทำงานกับ lean ได้ดีขึ้น
        profileImageUrl: char.profileImageUrl || (char.profileImageMediaId && char.profileImageSourceType ? `/api/media_placeholder/${char.profileImageSourceType}/${char.profileImageMediaId.toString()}` : '/images/default-avatar.png'),
        description: char.description,
        roleInStory: char.roleInStory as CharacterRoleInStory,
        colorTheme: char.colorTheme,
      };
    });

    // 7. ดึงข้อมูลตอนของนิยาย (จำกัดจำนวนตอนที่แสดงในหน้าแรก)
    //    แสดงเฉพาะตอนที่เผยแพร่แล้วหรือตั้งเวลาเผยแพร่ และเลือก field ที่จำเป็น
    const episodesFromDb = await EpisodeModel.find({
      novelId: novelFromDb._id,
      status: { $in: [EpisodeStatus.PUBLISHED, EpisodeStatus.SCHEDULED] }
    })
    .select('title episodeOrder status accessType priceCoins publishedAt teaserText stats')
    .sort({ episodeOrder: -1 }) // เรียงตามลำดับตอนล่าสุดขึ้นก่อน
    .limit(10) // แสดง 10 ตอนล่าสุด
    .lean({ virtuals: true }); // ให้ virtual 'episodeUrl', 'isTrulyFree' ทำงาน (ถ้ามีและต้องการ)

    const episodes: PopulatedEpisodeForDetailPage[] = episodesFromDb.map(epDB => {
      const ep = epDB as any;
      return {
      _id: ep._id.toString(),
      title: ep.title,
      episodeOrder: ep.episodeOrder,
      status: ep.status as EpisodeStatus,
      accessType: ep.accessType as EpisodeAccessType,
      priceCoins: ep.priceCoins,
      publishedAt: ep.publishedAt instanceof Date ? ep.publishedAt.toISOString() : ep.publishedAt,
      teaserText: ep.teaserText,
      stats: { // ตรวจสอบว่า ep.stats มีค่าก่อน access
        viewsCount: ep.stats?.viewsCount || 0,
        likesCount: ep.stats?.likesCount || 0,
        commentsCount: ep.stats?.commentsCount || 0,
        totalWords: ep.stats?.totalWords || 0,
        estimatedReadingTimeMinutes: ep.stats?.estimatedReadingTimeMinutes || 0
      },
      // episodeUrl: ep.episodeUrl // ถ้ามี virtual นี้และ lean({ virtuals: true }) ทำงาน
    }});

    // 8. เตรียมข้อมูล Response: ทำการ map ข้อมูลจาก novelFromDb (ที่เป็น POJO) ไปยัง PopulatedNovelForDetailPage
    //    ส่วนนี้สำคัญมากในการแปลงข้อมูลให้ตรงกับ Interface ที่ Frontend คาดหวัง

    // ตรวจสอบ Author ที่ populate มา
    const populatedAuthor = novelFromDb.author as unknown as IUser; // Cast to IUser after population
    if (!populatedAuthor || typeof populatedAuthor !== 'object' || !populatedAuthor._id) {
        console.error(`❌ [API GET /novels/${cleanedSlug}] ข้อมูลผู้เขียน (author) ไม่ได้ถูก populate อย่างถูกต้องสำหรับนิยาย: "${novelFromDb.title}"`);
        return NextResponse.json(
            { success: false, error: "Internal server error", message: "เกิดข้อผิดพลาดในการประมวลผลข้อมูลผู้เขียนของนิยาย" },
            { status: 500 }
        );
    }
    
    // เตรียม themeAssignment ที่ populate แล้ว
    const themeAssignmentForDetail: PopulatedThemeAssignmentForDetailPage = {
        mainTheme: {
            // ตรวจสอบว่า mainTheme.categoryId ถูก populate มาจริง ๆ
            categoryId: toPopulatedCategoryInfo(novelFromDb.themeAssignment?.mainTheme?.categoryId as any)!, // ใช้ ! หากมั่นใจว่า populated
            customName: novelFromDb.themeAssignment?.mainTheme?.customName,
        },
        subThemes: toPopulatedCategoryInfoArray(novelFromDb.themeAssignment?.subThemes?.map(st => st.categoryId as any) || [])
                     .map((catInfo, index) => ({
                         categoryId: catInfo,
                         customName: novelFromDb.themeAssignment?.subThemes?.[index]?.customName
                     })),
        moodAndTone: toPopulatedCategoryInfoArray(novelFromDb.themeAssignment?.moodAndTone as any[] || []),
        contentWarnings: toPopulatedCategoryInfoArray(novelFromDb.themeAssignment?.contentWarnings as any[] || []),
        customTags: novelFromDb.themeAssignment?.customTags || [],
    };


    const responseData: PopulatedNovelForDetailPage = {
      _id: novelFromDb._id.toString(),
      title: novelFromDb.title,
      slug: novelFromDb.slug, // slug จาก DB (ควรจะตรงกับ cleanedSlug)
      author: {
        _id: populatedAuthor._id.toString(),
        username: populatedAuthor.username,
        profile: {
          displayName: populatedAuthor.profile?.displayName,
          penName: populatedAuthor.profile?.penName,
          avatarUrl: populatedAuthor.profile?.avatarUrl,
          bio: populatedAuthor.profile?.bio,
        },
        writerStats: populatedAuthor.writerStats ? { // ตรวจสอบว่า writerStats มีค่าหรือไม่
          totalNovelsPublished: populatedAuthor.writerStats.totalNovelsPublished,
          totalViewsAcrossAllNovels: populatedAuthor.writerStats.totalViewsAcrossAllNovels,
          totalLikesReceivedOnNovels: populatedAuthor.writerStats.totalLikesReceivedOnNovels,
        } : undefined,
      },
      synopsis: novelFromDb.synopsis,
      longDescription: novelFromDb.longDescription,
      coverImageUrl: novelFromDb.coverImageUrl,
      bannerImageUrl: novelFromDb.bannerImageUrl,
      themeAssignment: themeAssignmentForDetail,
      narrativeFocus: novelFromDb.narrativeFocus as INarrativeFocus, // Cast ถ้ามั่นใจในโครงสร้าง
      worldBuildingDetails: novelFromDb.worldBuildingDetails as IWorldBuildingDetails,
      ageRatingCategoryId: toPopulatedCategoryInfo(novelFromDb.ageRatingCategoryId as any),
      status: novelFromDb.status as NovelStatusEnum,
      accessLevel: novelFromDb.accessLevel as INovel["accessLevel"],
      isCompleted: novelFromDb.isCompleted,
      endingType: novelFromDb.endingType as INovel["endingType"],
      sourceType: novelFromDb.sourceType as ISourceType,
      language: toPopulatedCategoryInfo(novelFromDb.language as any)!, // ภาษาเป็น required field
      firstEpisodeId: novelFromDb.firstEpisodeId?.toString(),
      totalEpisodesCount: novelFromDb.totalEpisodesCount,
      publishedEpisodesCount: novelFromDb.publishedEpisodesCount,
      stats: novelFromDb.stats as INovelStats,
      monetizationSettings: novelFromDb.monetizationSettings as IMonetizationSettings,
      psychologicalAnalysisConfig: novelFromDb.psychologicalAnalysisConfig as IPsychologicalAnalysisConfig,
      collaborationSettings: novelFromDb.collaborationSettings as ICollaborationSettings,
      isFeatured: novelFromDb.isFeatured,
      publishedAt: novelFromDb.publishedAt instanceof Date ? novelFromDb.publishedAt.toISOString() : novelFromDb.publishedAt,
      scheduledPublicationDate: novelFromDb.scheduledPublicationDate instanceof Date ? novelFromDb.scheduledPublicationDate.toISOString() : novelFromDb.scheduledPublicationDate,
      lastContentUpdatedAt: novelFromDb.lastContentUpdatedAt instanceof Date ? novelFromDb.lastContentUpdatedAt.toISOString() : novelFromDb.lastContentUpdatedAt,
      relatedNovels: novelFromDb.relatedNovels?.map((id: any) => id.toString()), // ตรวจสอบ type ของ id
      seriesId: novelFromDb.seriesId?.toString(),
      seriesOrder: novelFromDb.seriesOrder,
      createdAt: novelFromDb.createdAt instanceof Date ? novelFromDb.createdAt.toISOString() : novelFromDb.createdAt,
      updatedAt: novelFromDb.updatedAt instanceof Date ? novelFromDb.updatedAt.toISOString() : novelFromDb.updatedAt,
      characters: characters,
      episodes: episodes,
      novelUrl: (novelFromDb as any).novelUrl, // เข้าถึง virtual field ที่ถูก .lean({ virtuals: true }) เตรียมไว้
    };

    console.log(`✅ [API GET /novels/${cleanedSlug}] ดึงข้อมูลนิยายสำเร็จ: "${novelFromDb.title}" (ID: ${novelFromDb._id.toString()})`);
    console.log(`   [API GET /novels/${cleanedSlug}] Characters fetched: ${characters.length}, Episodes fetched: ${episodes.length}`);
    console.log(`   [API GET /novels/${cleanedSlug}] Main theme: ${responseData.themeAssignment.mainTheme.categoryId.name}`);


    // 9. ส่งข้อมูลกลับไปยัง Client
    //    กำหนด Cache-Control header เพื่อให้ CDN และ Browser cache ข้อมูลได้
    //    s-maxage สำหรับ shared caches (เช่น CDN), stale-while-revalidate ช่วยให้แสดงข้อมูลเก่าขณะ revalidate ได้
    return NextResponse.json({
      success: true,
      novel: responseData
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300', // Cache 1 นาที, revalidate ใน background ทุก 5 นาที
      }
    });

  } catch (error: any) {
    // 10. จัดการข้อผิดพลาดทั่วไป
    //     ควร log error ที่เกิดขึ้นฝั่ง server เพื่อการตรวจสอบและแก้ไข
    //     ไม่ควรส่ง error details ทั้งหมดไปให้ client ใน production mode
    const slugParam = params ? params.slug : "undefined_slug";
    console.error(`❌ [API GET /novels/${slugParam}] เกิดข้อผิดพลาดร้ายแรง:`, error.message);
    if (error.stack) {
        console.error("Stacktrace:", error.stack.substring(0, 1000)); // Log ส่วนหนึ่งของ stacktrace
    }
    // console.error(error); // Log error object ทั้งหมด (อาจมีข้อมูลเยอะ)

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: "เกิดข้อผิดพลาดบางอย่างในระบบขณะดึงข้อมูลนิยาย กรุณาลองใหม่อีกครั้งในภายหลัง",
        // ส่งรายละเอียด error เฉพาะใน development mode เพื่อช่วย debug
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}