// src/app/api/novels/[slug]/route.ts
// API Route สำหรับดึงข้อมูลนิยายตาม slug เพื่อแสดงในหน้ารายละเอียด
// รองรับการ populate ข้อมูลที่เกี่ยวข้องทั้งหมด เช่น หมวดหมู่, ผู้เขียน, ตัวละคร, ตอน

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import NovelModel, { INovel, IThemeAssignment, ISourceType, INarrativeFocus, IWorldBuildingDetails, INovelStats, IMonetizationSettings, IPsychologicalAnalysisConfig, ICollaborationSettings, NovelStatus as NovelStatusEnum } from "@/backend/models/Novel";
import UserModel, { IUser, IUserProfile, IWriterStats } from "@/backend/models/User";
import CategoryModel, { ICategory } from "@/backend/models/Category";
import CharacterModel, { ICharacter, CharacterRoleInStory } from "@/backend/models/Character";
import EpisodeModel, { IEpisode, IEpisodeStats, EpisodeStatus, EpisodeAccessType } from "@/backend/models/Episode";
import { Types } from "mongoose";

// ===================================================================
// SECTION: TypeScript Interfaces สำหรับ API Response
// ===================================================================

/**
 * @interface PopulatedAuthorForDetailPage
 * @description Interface สำหรับข้อมูลผู้เขียนที่ถูก populate สำหรับหน้ารายละเอียดนิยาย
 */
interface PopulatedAuthorForDetailPage {
  _id: string;
  username?: string;
  profile: {
    displayName?: string;
    penName?: string;
    avatarUrl?: string;
    bio?: string;
  };
  writerStats?: { // สถิตินักเขียนบางส่วนที่จำเป็น
    totalNovelsPublished: number;
    totalViewsAcrossAllNovels: number;
    totalLikesReceivedOnNovels: number;
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
}

/**
 * @interface PopulatedThemeAssignment
 * @description Interface สำหรับ themeAssignment ที่ categoryId ภายในถูก populate ด้วย PopulatedCategoryInfo
 */
interface PopulatedThemeAssignment {
  mainTheme: {
    categoryId: PopulatedCategoryInfo; // populate แล้ว
    customName?: string;
  };
  subThemes?: Array<{
    categoryId: PopulatedCategoryInfo; // populate แล้ว
    customName?: string;
  }>;
  moodAndTone?: PopulatedCategoryInfo[]; // populate แล้ว
  contentWarnings?: PopulatedCategoryInfo[]; // populate แล้ว
  customTags?: string[];
}

/**
 * @interface PopulatedCharacterForDetailPage
 * @description Interface สำหรับข้อมูลตัวละครที่แสดงในหน้ารายละเอียดนิยาย (จำกัดข้อมูล)
 */
interface PopulatedCharacterForDetailPage {
  _id: string;
  name: string;
  profileImageUrl?: string; // เป็น virtual field จาก Character model ที่เราจะสร้างเองหลัง lean()
  description?: string;
  roleInStory?: CharacterRoleInStory;
  colorTheme?: string;
}

/**
 * @interface PopulatedEpisodeForDetailPage
 * @description Interface สำหรับข้อมูลตอนที่แสดงในหน้ารายละเอียดนิยาย (จำกัดข้อมูล)
 */
interface PopulatedEpisodeForDetailPage {
  _id: string;
  title: string;
  episodeOrder: number;
  status: EpisodeStatus;
  accessType: EpisodeAccessType;
  priceCoins?: number;
  publishedAt?: string; // วันที่ในรูปแบบ ISOString
  teaserText?: string;
  stats: {
    viewsCount: number;
    likesCount: number;
    commentsCount: number;
    totalWords: number;
    estimatedReadingTimeMinutes: number;
  };
}

/**
 * @interface PopulatedNovelForDetailPage
 * @description Interface หลักสำหรับข้อมูลนิยายที่ถูก populate ทั้งหมดสำหรับหน้ารายละเอียด
 * ประกอบด้วยข้อมูลพื้นฐาน, ข้อมูลผู้เขียน, หมวดหมู่, ตัวละคร (บางส่วน), และตอน (บางส่วน)
 */
export interface PopulatedNovelForDetailPage {
  _id: string;
  title: string;
  slug: string;
  author: PopulatedAuthorForDetailPage; // populate แล้ว
  synopsis: string;
  longDescription?: string;
  coverImageUrl?: string;
  bannerImageUrl?: string;
  themeAssignment: PopulatedThemeAssignment; // populate ภายในแล้ว
  narrativeFocus?: INarrativeFocus; // ไม่ได้ populate ลึก ใช้ข้อมูล ObjectId โดยตรงจาก Novel
  worldBuildingDetails?: IWorldBuildingDetails; // ใช้ข้อมูลโดยตรงจาก Novel
  ageRatingCategoryId?: PopulatedCategoryInfo; // populate แล้ว
  status: NovelStatusEnum; // ใช้ Enum จาก Novel model โดยตรง
  accessLevel: INovel["accessLevel"]; // ใช้ type จาก INovel โดยตรง
  isCompleted: boolean;
  endingType: INovel["endingType"]; // ใช้ type จาก INovel โดยตรง
  sourceType: ISourceType; // ใช้ข้อมูลโดยตรงจาก Novel
  language: PopulatedCategoryInfo; // populate แล้ว
  firstEpisodeId?: string; // ObjectId แปลงเป็น string
  totalEpisodesCount: number;
  publishedEpisodesCount: number;
  stats: INovelStats; // ใช้ข้อมูลโดยตรงจาก Novel
  monetizationSettings: IMonetizationSettings; // ใช้ข้อมูลโดยตรงจาก Novel
  psychologicalAnalysisConfig: IPsychologicalAnalysisConfig; // ใช้ข้อมูลโดยตรงจาก Novel
  collaborationSettings?: ICollaborationSettings; // ใช้ข้อมูลโดยตรงจาก Novel
  isFeatured?: boolean;
  publishedAt?: string; // วันที่ในรูปแบบ ISOString
  scheduledPublicationDate?: string; // วันที่ในรูปแบบ ISOString
  lastContentUpdatedAt: string; // วันที่ในรูปแบบ ISOString
  relatedNovels?: string[]; // Array ของ ObjectIds ที่แปลงเป็น string
  seriesId?: string; // ObjectId แปลงเป็น string
  seriesOrder?: number;
  createdAt: string; // วันที่ในรูปแบบ ISOString
  updatedAt: string; // วันที่ในรูปแบบ ISOString

  // ข้อมูลตัวละครหลัก (แสดงตามจำนวนที่ query มา เช่น 6 ตัวแรก)
  characters?: PopulatedCharacterForDetailPage[];

  // ข้อมูลตอนล่าสุด (แสดงตามจำนวนที่ query มา เช่น 10 ตอนแรก)
  episodes?: PopulatedEpisodeForDetailPage[];
}

// ===================================================================
// SECTION: Context Type for Route Handler
// ===================================================================
/**
 * @interface RouteContext
 * @description กำหนด type สำหรับ context object ที่ Next.js ส่งเข้ามาใน Route Handler
 * ซึ่งจะมี params ที่เราต้องการ (ในที่นี้คือ slug)
 */
interface RouteContext {
  params: {
    slug: string;
  };
}

// ===================================================================
// SECTION: API Route Handler
// ===================================================================

/**
 * GET Handler สำหรับดึงข้อมูลนิยายตาม slug
 * @param request NextRequest object (อ็อบเจ็กต์คำขอ HTTP ขาเข้า)
 * @param context RouteContext object (มี params ที่ได้จาก dynamic route segment)
 * @returns NextResponse ที่มีข้อมูลนิยายหรือ error message
 */
export async function GET(
  request: NextRequest, // พารามิเตอร์แรกคือ request object
  context: RouteContext  // พารามิเตอร์ที่สองคือ context ที่มี params
) {
  try {
    // เชื่อมต่อฐานข้อมูล (สำคัญมาก ต้องทำทุกครั้งที่เรียก API route ที่มีการ query DB)
    await dbConnect();

    const { slug } = context.params; // ดึง slug ออกมาจาก context.params

    // ตรวจสอบความถูกต้องของ slug ที่ได้รับมา
    if (!slug || typeof slug !== 'string' || !slug.trim()) {
      console.warn(`⚠️ [API /novels/[slug]] Invalid slug: "${slug}"`);
      return NextResponse.json(
        {
          error: "Invalid slug parameter",
          message: "กรุณาระบุ slug ของนิยายที่ถูกต้องใน URL"
        },
        { status: 400 } // Bad Request
      );
    }

    const trimmedSlug = slug.trim().toLowerCase();
    console.log(`📄 [API /novels/[slug]] กำลังดึงข้อมูลนิยายสำหรับ slug: "${trimmedSlug}"`);

    // ค้นหานิยายจากฐานข้อมูลตาม slug ที่ปรับปรุงแล้ว
    // ใช้ .lean() เพื่อให้ได้ JavaScript object ธรรมดา ซึ่งเร็วกว่า Mongoose document เต็มรูปแบบ
    // และเหมาะสำหรับการส่งข้อมูลผ่าน API ที่ไม่ต้องใช้ Mongoose methods อีก
    // ระบุ type ให้กับการ populate เพื่อความชัดเจนและความช่วยเหลือจาก TypeScript
    const novelFromDb = await NovelModel.findOne({
      slug: trimmedSlug,
      isDeleted: { $ne: true } // ไม่แสดงนิยายที่ถูกลบ (soft delete)
    })
    .populate<{ author: IUser }>({
      path: 'author',
      select: 'username profile writerStats.totalNovelsPublished writerStats.totalViewsAcrossAllNovels writerStats.totalLikesReceivedOnNovels', // เลือกเฉพาะ field ที่ต้องการสำหรับผู้เขียน
      model: UserModel // ระบุ Model ที่ใช้ในการ populate
    })
    .populate<{ themeAssignment_mainTheme_categoryId: ICategory }>({
      path: 'themeAssignment.mainTheme.categoryId',
      select: 'name slug color',
      model: CategoryModel
    })
    .populate<{ themeAssignment_subThemes_categoryId: ICategory[] }>({ // สำหรับ array ของ ObjectId
      path: 'themeAssignment.subThemes.categoryId',
      select: 'name slug color',
      model: CategoryModel
    })
    .populate<{ themeAssignment_moodAndTone: ICategory[] }>({
      path: 'themeAssignment.moodAndTone',
      select: 'name slug color',
      model: CategoryModel
    })
    .populate<{ themeAssignment_contentWarnings: ICategory[] }>({
      path: 'themeAssignment.contentWarnings',
      select: 'name slug color',
      model: CategoryModel
    })
    .populate<{ ageRatingCategoryId: ICategory }>({
      path: 'ageRatingCategoryId',
      select: 'name slug color',
      model: CategoryModel
    })
    .populate<{ language: ICategory }>({
      path: 'language',
      select: 'name slug', // สำหรับภาษา อาจจะไม่ต้องการสี
      model: CategoryModel
    })
    .lean(); // สำคัญ: ใช้ .lean() เพื่อ performance

    // ตรวจสอบว่าพบนิยายหรือไม่
    if (!novelFromDb) {
      console.warn(`⚠️ [API /novels/[slug]] ไม่พบนิยายสำหรับ slug: "${trimmedSlug}" ในฐานข้อมูล`);
      return NextResponse.json(
        {
          error: "Novel not found",
          message: `ขออภัย ไม่พบนิยายที่คุณค้นหา (slug: ${trimmedSlug})`
        },
        { status: 404 } // Not Found
      );
    }
    
    // --- Helper function สำหรับแปลงข้อมูล Category ที่ populate มาแล้วให้เป็น PopulatedCategoryInfo ---
    // ช่วยจัดการกรณีที่ category อาจไม่ได้ถูก populate หรือมีโครงสร้างไม่ตรง
    const toPopulatedCategoryInfo = (cat: any): PopulatedCategoryInfo | undefined => {
        // ตรวจสอบว่า cat เป็น object ที่มี _id, name, slug หรือไม่ (ป้องกัน error ถ้า populate ไม่สำเร็จ)
        if (!cat || typeof cat !== 'object' || !('_id' in cat) || !('name' in cat) || !('slug' in cat)) {
            // console.warn('[toPopulatedCategoryInfo] Received invalid category object:', cat);
            return undefined;
        }
        return {
            _id: cat._id.toString(),
            name: cat.name,
            slug: cat.slug,
            color: cat.color, // color เป็น optional
        };
    };

    // Helper function สำหรับแปลง array ของ Category
    const toPopulatedCategoryInfoArray = (cats: any[]): PopulatedCategoryInfo[] => {
        if (!Array.isArray(cats)) return [];
        return cats.map(toPopulatedCategoryInfo).filter(Boolean) as PopulatedCategoryInfo[]; // filter(Boolean) เพื่อกรอง undefined ออก
    };


    // --- ดึงข้อมูลตัวละครของนิยาย (จำกัดจำนวน เช่น 6 ตัวแรก) ---
    // ควรเรียงตามความสำคัญ หรือวันที่สร้าง เพื่อให้ได้ตัวละครหลักๆ
    const charactersFromDb = await CharacterModel.find({
      novelId: novelFromDb._id, // ใช้ _id จาก novel ที่ดึงมาได้
      isArchived: false // ไม่แสดงตัวละครที่ถูกเก็บเข้าคลัง
    })
    .select('name description roleInStory colorTheme profileImageMediaId profileImageSourceType') // เลือก field ที่ต้องการ
    .sort({ createdAt: 1 }) // อาจจะเปลี่ยนเป็นการเรียงตาม "ความสำคัญ" ถ้ามี field นั้น
    .limit(6) // จำกัดจำนวนตัวละครที่ดึงมา
    .lean();

    // แปลงข้อมูลตัวละครให้ตรงกับ PopulatedCharacterForDetailPage
    const characters: PopulatedCharacterForDetailPage[] = charactersFromDb.map(char => {
        // สร้าง profileImageUrl เองเนื่องจาก .lean() ไม่ได้เรียก virtuals
        let imageUrl = '/images/default-avatar.png'; // รูปเริ่มต้น
        if (char.profileImageMediaId && char.profileImageSourceType) {
            // Logic นี้ควรตรงกับ virtual 'profileImageUrl' ใน CharacterModel
            imageUrl = `/api/media_placeholder/${char.profileImageSourceType}/${char.profileImageMediaId.toString()}`;
        }

        return {
            _id: char._id.toString(),
            name: char.name,
            profileImageUrl: imageUrl,
            description: char.description,
            roleInStory: char.roleInStory as CharacterRoleInStory, // Cast type ให้ตรง
            colorTheme: char.colorTheme
        };
    });


    // --- ดึงข้อมูลตอนของนิยาย (จำกัดจำนวน เช่น 10 ตอนแรกที่เผยแพร่แล้วหรือตั้งเวลา) ---
    const episodesFromDb = await EpisodeModel.find({
      novelId: novelFromDb._id,
      status: { $in: [EpisodeStatus.PUBLISHED, EpisodeStatus.SCHEDULED] } // แสดงเฉพาะตอนที่เผยแพร่แล้ว หรือตั้งเวลาไว้
    })
    .select('title episodeOrder status accessType priceCoins publishedAt teaserText stats') // เลือก field ที่ต้องการ
    .sort({ episodeOrder: 1 }) // เรียงตามลำดับตอน
    .limit(10) // จำกัดจำนวนตอน
    .lean();

    // แปลงข้อมูลตอนให้ตรงกับ PopulatedEpisodeForDetailPage
    const episodes: PopulatedEpisodeForDetailPage[] = episodesFromDb.map(ep => ({
      _id: ep._id.toString(),
      title: ep.title,
      episodeOrder: ep.episodeOrder,
      status: ep.status as EpisodeStatus, // Cast type
      accessType: ep.accessType as EpisodeAccessType, // Cast type
      priceCoins: ep.priceCoins,
      publishedAt: ep.publishedAt?.toISOString(), // แปลง Date เป็น ISO string
      teaserText: ep.teaserText,
      stats: { // ตรวจสอบให้แน่ใจว่า ep.stats มีค่าก่อน access property ภายใน
        viewsCount: ep.stats?.viewsCount || 0,
        likesCount: ep.stats?.likesCount || 0,
        commentsCount: ep.stats?.commentsCount || 0,
        totalWords: ep.stats?.totalWords || 0,
        estimatedReadingTimeMinutes: ep.stats?.estimatedReadingTimeMinutes || 0
      }
    }));

    // --- เตรียมข้อมูลผู้เขียน (Author) ---
    // ตรวจสอบว่า author ถูก populate มาอย่างถูกต้อง
    const populatedAuthor = novelFromDb.author as unknown as IUser; // Cast เพื่อให้ TypeScript รู้จัก field ภายใน IUser
    if (!populatedAuthor || typeof populatedAuthor !== 'object' || !populatedAuthor._id || !populatedAuthor.profile) {
        console.error(`❌ [API /novels/[slug]] ข้อมูลผู้เขียน (author) ไม่ได้ถูก populate อย่างถูกต้องสำหรับนิยาย: "${novelFromDb.title}" (ID: ${novelFromDb._id})`);
        // อาจจะ return error 500 หรือพยายามแสดงนิยายโดยไม่มีข้อมูลผู้เขียน (ขึ้นอยู่กับนโยบาย)
        return NextResponse.json(
            { error: "Internal server error", message: "เกิดข้อผิดพลาดในการประมวลผลข้อมูลผู้เขียนของนิยาย" },
            { status: 500 }
        );
    }
    const authorForResponse: PopulatedAuthorForDetailPage = {
        _id: populatedAuthor._id.toString(),
        username: populatedAuthor.username,
        profile: {
            displayName: populatedAuthor.profile.displayName,
            penName: populatedAuthor.profile.penName,
            avatarUrl: populatedAuthor.profile.avatarUrl,
            bio: populatedAuthor.profile.bio,
        },
        writerStats: populatedAuthor.writerStats ? { // ตรวจสอบว่า writerStats มีค่าหรือไม่
            totalNovelsPublished: populatedAuthor.writerStats.totalNovelsPublished,
            totalViewsAcrossAllNovels: populatedAuthor.writerStats.totalViewsAcrossAllNovels,
            totalLikesReceivedOnNovels: populatedAuthor.writerStats.totalLikesReceivedOnNovels,
        } : undefined,
    };
    
    // --- เตรียมข้อมูล Theme Assignment ---
    // การ cast type ให้ TypeScript รู้จัก field ที่ populate มา
    const mainThemeCategoryRaw = novelFromDb.themeAssignment?.mainTheme?.categoryId;
    const subThemesRaw = novelFromDb.themeAssignment?.subThemes || [];
    const moodAndToneRaw = novelFromDb.themeAssignment?.moodAndTone || [];
    const contentWarningsRaw = novelFromDb.themeAssignment?.contentWarnings || [];

    const themeAssignmentForResponse: PopulatedThemeAssignment = {
      mainTheme: {
        categoryId: toPopulatedCategoryInfo(mainThemeCategoryRaw)!, // ใช้ ! ถ้ามั่นใจว่า mainTheme.categoryId จะมีและถูก populate เสมอ (ตาม schema คือ required)
        customName: novelFromDb.themeAssignment?.mainTheme?.customName,
      },
      subThemes: subThemesRaw.map(st => ({
        categoryId: toPopulatedCategoryInfo(st.categoryId)!, // ใช้ ! ถ้ามั่นใจ
        customName: st.customName,
      })),
      moodAndTone: toPopulatedCategoryInfoArray(moodAndToneRaw as any[]),
      contentWarnings: toPopulatedCategoryInfoArray(contentWarningsRaw as any[]),
      customTags: novelFromDb.themeAssignment?.customTags || [],
    };

    // --- สร้าง Object ข้อมูลนิยายสำหรับ Response สุดท้าย ---
    // ทำการ map ข้อมูลจาก novelFromDb ไปยัง PopulatedNovelForDetailPage
    // แปลง ObjectId เป็น string และ Date เป็น ISOString ตามต้องการ
    const responseData: PopulatedNovelForDetailPage = {
      _id: novelFromDb._id.toString(),
      title: novelFromDb.title,
      slug: novelFromDb.slug, // slug ที่ใช้ query ก็คือ slug ใน response
      author: authorForResponse,
      synopsis: novelFromDb.synopsis,
      longDescription: novelFromDb.longDescription,
      coverImageUrl: novelFromDb.coverImageUrl,
      bannerImageUrl: novelFromDb.bannerImageUrl,
      themeAssignment: themeAssignmentForResponse,
      narrativeFocus: novelFromDb.narrativeFocus as INarrativeFocus, // Cast ถ้ามั่นใจในโครงสร้าง
      worldBuildingDetails: novelFromDb.worldBuildingDetails as IWorldBuildingDetails,
      ageRatingCategoryId: toPopulatedCategoryInfo(novelFromDb.ageRatingCategoryId as unknown as ICategory),
      status: novelFromDb.status as NovelStatusEnum,
      accessLevel: novelFromDb.accessLevel as INovel["accessLevel"],
      isCompleted: novelFromDb.isCompleted,
      endingType: novelFromDb.endingType as INovel["endingType"],
      sourceType: novelFromDb.sourceType as ISourceType,
      language: toPopulatedCategoryInfo(novelFromDb.language as unknown as ICategory)!, // มั่นใจว่า language มีเสมอ
      firstEpisodeId: novelFromDb.firstEpisodeId?.toString(),
      totalEpisodesCount: novelFromDb.totalEpisodesCount,
      publishedEpisodesCount: novelFromDb.publishedEpisodesCount,
      stats: novelFromDb.stats as INovelStats,
      monetizationSettings: novelFromDb.monetizationSettings as IMonetizationSettings,
      psychologicalAnalysisConfig: novelFromDb.psychologicalAnalysisConfig as IPsychologicalAnalysisConfig,
      collaborationSettings: novelFromDb.collaborationSettings,
      isFeatured: novelFromDb.isFeatured,
      publishedAt: novelFromDb.publishedAt?.toISOString(),
      scheduledPublicationDate: novelFromDb.scheduledPublicationDate?.toISOString(),
      lastContentUpdatedAt: novelFromDb.lastContentUpdatedAt.toISOString(), // lastContentUpdatedAt เป็น required ใน schema
      relatedNovels: novelFromDb.relatedNovels?.map((id: Types.ObjectId | any) => id.toString()), // ตรวจสอบ type ของ id
      seriesId: novelFromDb.seriesId?.toString(),
      seriesOrder: novelFromDb.seriesOrder,
      createdAt: novelFromDb.createdAt.toISOString(), // createdAt มีจาก timestamps: true
      updatedAt: novelFromDb.updatedAt.toISOString(), // updatedAt มีจาก timestamps: true
      characters: characters,
      episodes: episodes,
    };

    console.log(`✅ [API /novels/[slug]] ดึงข้อมูลและประมวลผลนิยายสำเร็จ: "${responseData.title}" (ตัวละคร: ${characters.length}, ตอน: ${episodes.length})`);

    // ส่งข้อมูลนิยายกลับไปในรูปแบบ JSON พร้อมตั้งค่า Cache-Control header
    return NextResponse.json({
      success: true,
      novel: responseData
    }, {
      headers: {
        // Cache สำหรับ CDN 1 นาที, และให้ browser revalidate ทุกๆ 5 นาที (stale-while-revalidate)
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      }
    });

  } catch (error: any) {
    // จัดการ Error ที่อาจเกิดขึ้นระหว่างการทำงาน
    console.error(`❌ [API /novels/[slug]] เกิดข้อผิดพลาดร้ายแรงในการดึงข้อมูลนิยายสำหรับ slug "${context.params?.slug}":`, error.message, error.stack);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ขณะพยายามดึงข้อมูลนิยาย กรุณาลองใหม่อีกครั้งในภายหลัง",
        // แสดงรายละเอียด error เฉพาะใน development mode เพื่อความปลอดภัย
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 } // Internal Server Error
    );
  }
}