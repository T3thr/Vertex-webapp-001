// src/app/api/novels/[slug]/route.ts
// API Route สำหรับดึงข้อมูลนิยายตาม slug เพื่อแสดงในหน้ารายละเอียด
// รองรับการ populate ข้อมูลที่เกี่ยวข้องทั้งหมด เช่น หมวดหมู่, ผู้เขียน, ตัวละคร, ตอน

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import NovelModel, {
  INovel,
  IThemeAssignment,
  ISourceType,
  INarrativeFocus,
  IWorldBuildingDetails,
  INovelStats,
  IMonetizationSettings,
  IPsychologicalAnalysisConfig,
  ICollaborationSettings
} from "@/backend/models/Novel";
import UserModel, { IUser } from "@/backend/models/User";
import { IUserProfile } from '@/backend/models/UserProfile';
import CategoryModel, { ICategory } from "@/backend/models/Category";
import CharacterModel, { ICharacter, CharacterRoleInStory } from "@/backend/models/Character";
import EpisodeModel, { IEpisode, EpisodeStatus, EpisodeAccessType } from "@/backend/models/Episode";

// ===================================================================
// SECTION: TypeScript Interfaces สำหรับ API Response
// ===================================================================

/**
 * @interface PopulatedAuthorForDetailPage
 * @description Interface สำหรับข้อมูลผู้เขียนที่ถูก populate
 */
interface PopulatedAuthorForDetailPage {
  _id: string;
  username?: string;
  profile: IUserProfile;
  writerStats?: {
    totalNovelsPublished: number;
    totalViewsAcrossAllNovels: number;
    totalLikesReceivedOnNovels: number;
  };
}

/**
 * @interface PopulatedCategoryInfo
 * @description Interface สำหรับข้อมูล Category ที่ถูก populate
 */
interface PopulatedCategoryInfo {
  _id: string;
  name: string;
  slug: string;
  color?: string;
}

/**
 * @interface PopulatedThemeAssignment
 * @description Interface สำหรับ themeAssignment ที่ถูก populate
 */
interface PopulatedThemeAssignment {
  mainTheme: {
    categoryId: PopulatedCategoryInfo;
    customName?: string;
  };
  subThemes?: Array<{
    categoryId: PopulatedCategoryInfo;
    customName?: string;
  }>;
  moodAndTone?: PopulatedCategoryInfo[];
  contentWarnings?: PopulatedCategoryInfo[];
  customTags?: string[];
}

/**
 * @interface PopulatedCharacterForDetailPage
 * @description Interface สำหรับข้อมูลตัวละครที่แสดงในหน้ารายละเอียดนิยาย
 */
interface PopulatedCharacterForDetailPage {
  _id: string;
  name: string;
  characterCode: string;
  profileImageUrl?: string;
  description?: string;
  roleInStory?: CharacterRoleInStory;
  colorTheme?: string;
}

/**
 * @interface PopulatedEpisodeForDetailPage
 * @description Interface สำหรับข้อมูลตอนที่แสดงในหน้ารายละเอียดนิยาย
 */
interface PopulatedEpisodeForDetailPage {
  _id: string;
  title: string;
  slug: string;
  episodeOrder: number;
  status: EpisodeStatus;
  accessType: EpisodeAccessType;
  priceCoins?: number;
  originalPriceCoins?: number;
  publishedAt?: string;
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
 * @description Interface สำหรับข้อมูลนิยายที่ถูก populate แล้วสำหรับหน้ารายละเอียด
 */
export interface PopulatedNovelForDetailPage {
  _id: string;
  title: string;
  slug: string;
  author: PopulatedAuthorForDetailPage;
  synopsis: string;
  longDescription?: string;
  coverImageUrl?: string;
  bannerImageUrl?: string;
  themeAssignment: PopulatedThemeAssignment;
  narrativeFocus?: INarrativeFocus;
  worldBuildingDetails?: IWorldBuildingDetails;
  ageRatingCategoryId?: PopulatedCategoryInfo;
  status: INovel["status"];
  accessLevel: INovel["accessLevel"];
  isCompleted: boolean;
  endingType: INovel["endingType"];
  sourceType: ISourceType;
  language: PopulatedCategoryInfo;
  firstEpisodeId?: string;
  totalEpisodesCount: number;
  publishedEpisodesCount: number;
  stats: INovelStats;
  monetizationSettings: IMonetizationSettings;
  psychologicalAnalysisConfig: IPsychologicalAnalysisConfig;
  collaborationSettings?: ICollaborationSettings;
  isFeatured?: boolean;
  publishedAt?: string;
  scheduledPublicationDate?: string;
  lastContentUpdatedAt: string;
  relatedNovels?: string[];
  seriesId?: string;
  seriesOrder?: number;
  createdAt: string;
  updatedAt: string;
  characters?: PopulatedCharacterForDetailPage[];
  episodes?: PopulatedEpisodeForDetailPage[];
}

// ===================================================================
// SECTION: API Route Handler
// ===================================================================

/**
 * GET Handler สำหรับดึงข้อมูลนิยายตาม slug
 * @param request NextRequest object
 * @param context Context object containing dynamic route parameters
 * @returns NextResponse ที่มีข้อมูลนิยายหรือ error
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    // เชื่อมต่อฐานข้อมูล MongoDB
    await dbConnect();

    // 1. ✨[แก้ไข] รับ slug จาก context.params ซึ่งเป็น Promise ใน Next.js 15
    const { slug } = await context.params;
    const decodedSlug = decodeURIComponent(slug.trim()).toLowerCase();

    // ตรวจสอบความถูกต้องของ slug
    if (!decodedSlug) {
      console.warn(`⚠️ [API /novels/[slug]] Slug ไม่ถูกต้อง: "${decodedSlug}"`);
      return NextResponse.json(
        {
          error: "Invalid slug parameter",
          message: "กรุณาระบุ slug ของนิยายที่ถูกต้อง",
        },
        { status: 400 }
      );
    }

    console.log(`📡 [API /novels/[slug]] กำลังดึงข้อมูลนิยายสำหรับ slug: "${decodedSlug}"`);

    // ค้นหานิยายตาม slug พร้อม populate ข้อมูลที่เกี่ยวข้อง
    const novelFromDb = await NovelModel.findOne({
      slug: decodedSlug,
      isDeleted: false,
    })
      .populate<{ author: IUser }>({
        path: 'author',
        select: '_id username profile writerStats',
        model: UserModel,
      })
      .populate<{ 'themeAssignment.mainTheme.categoryId': ICategory }>({
        path: 'themeAssignment.mainTheme.categoryId',
        select: '_id name slug color',
        model: CategoryModel,
      })
      .populate<{ 'themeAssignment.subThemes.categoryId': ICategory[] }>({
        path: 'themeAssignment.subThemes.categoryId',
        select: '_id name slug color',
        model: CategoryModel,
      })
      .populate<{ 'themeAssignment.moodAndTone': ICategory[] }>({
        path: 'themeAssignment.moodAndTone',
        select: '_id name slug color',
        model: CategoryModel,
      })
      .populate<{ 'themeAssignment.contentWarnings': ICategory[] }>({
        path: 'themeAssignment.contentWarnings',
        select: '_id name slug color',
        model: CategoryModel,
      })
      .populate<{ ageRatingCategoryId: ICategory }>({
        path: 'ageRatingCategoryId',
        select: '_id name slug color',
        model: CategoryModel,
      })
      .populate<{ language: ICategory }>({
        path: 'language',
        select: '_id name slug',
        model: CategoryModel,
      })
      .lean();

    // ตรวจสอบว่าพบนิยายหรือไม่
    if (!novelFromDb) {
      console.warn(`⚠️ [API /novels/[slug]] ไม่พบนิยายสำหรับ slug: "${decodedSlug}"`);
      return NextResponse.json(
        {
          error: "Novel not found",
          message: `ไม่พบนิยายที่มี slug "${decodedSlug}"`,
        },
        { status: 404 }
      );
    }

    // ฟังก์ชันช่วยแปลง category เป็น PopulatedCategoryInfo
    const toPopulatedCategoryInfo = (cat: any): PopulatedCategoryInfo | undefined => {
      if (!cat || typeof cat !== 'object' || !('_id' in cat)) return undefined;
      return {
        _id: cat._id.toString(),
        name: cat.name,
        slug: cat.slug,
        color: cat.color,
      };
    };

    const toPopulatedCategoryInfoArray = (cats: any[]): PopulatedCategoryInfo[] => {
      if (!Array.isArray(cats)) return [];
      return cats
        .map(toPopulatedCategoryInfo)
        .filter((cat): cat is PopulatedCategoryInfo => Boolean(cat));
    };

    // ดึงข้อมูลตัวละครของนิยาย (จำกัด 6 ตัวแรก)
    const toPopulatedCharacter = (char: any): PopulatedCharacterForDetailPage | undefined => {
      if (!char || typeof char !== 'object' || !('_id' in char)) return undefined;
      // สร้าง URL รูปโปรไฟล์ (ถ้ามี)
      const imageUrl = char.profileImageUrl || (char.characterCode ? `/images/character/${char.characterCode}_fullbody.png` : '/images/default-avatar.png');
      return {
        _id: char._id.toString(),
        name: char.name,
        characterCode: char.characterCode,
        profileImageUrl: imageUrl,
        description: char.description,
        roleInStory: char.roleInStory,
        colorTheme: char.colorTheme,
      };
    };
    
    const characters = (await CharacterModel.find({ novelId: novelFromDb._id }).lean())
      .map(toPopulatedCharacter)
      .filter((c): c is PopulatedCharacterForDetailPage => c !== undefined);

    // ดึงข้อมูลตอนของนิยาย (จำกัด 10 ตอนแรก)
    const episodesFromDb = await EpisodeModel.find({
      novelId: novelFromDb._id,
      status: { $in: [EpisodeStatus.PUBLISHED, EpisodeStatus.SCHEDULED] },
    })
      .select('_id title slug episodeOrder status accessType priceCoins originalPriceCoins publishedAt teaserText stats')
      .sort({ episodeOrder: 1 })
      .limit(10)
      .lean();

    const episodes: PopulatedEpisodeForDetailPage[] = episodesFromDb.map((ep) => ({
      _id: ep._id.toString(),
      title: ep.title,
      slug: ep.slug || 'no-slug',
      episodeOrder: ep.episodeOrder,
      status: ep.status as EpisodeStatus,
      accessType: ep.accessType as EpisodeAccessType,
      priceCoins: ep.priceCoins,
      originalPriceCoins: ep.originalPriceCoins,
      publishedAt: ep.publishedAt?.toISOString(),
      teaserText: ep.teaserText,
      stats: {
        viewsCount: ep.stats?.viewsCount || 0,
        likesCount: ep.stats?.likesCount || 0,
        commentsCount: ep.stats?.commentsCount || 0,
        totalWords: ep.stats?.totalWords || 0,
        estimatedReadingTimeMinutes: ep.stats?.estimatedReadingTimeMinutes || 0,
      },
    }));

    // ตรวจสอบข้อมูลผู้เขียน
    const populatedAuthor = novelFromDb.author as unknown as IUser;
    if (!populatedAuthor || typeof populatedAuthor !== 'object' || !populatedAuthor._id || !populatedAuthor.profile) {
      console.error(`❌ [API /novels/[slug]] ข้อมูลผู้เขียนไม่ครบถ้วนสำหรับนิยาย: "${novelFromDb.title}"`);
      return NextResponse.json(
        {
          error: "Internal server error",
          message: "เกิดข้อผิดพลาดในการประมวลผลข้อมูลผู้เขียนของนิยาย",
        },
        { status: 500 }
      );
    }

    // แปลงข้อมูลนิยายเป็น PopulatedNovelForDetailPage
    const responseData: PopulatedNovelForDetailPage = {
      _id: novelFromDb._id.toString(),
      title: novelFromDb.title,
      slug: novelFromDb.slug,
      author: {
        _id: populatedAuthor._id.toString(),
        username: populatedAuthor.username,
        profile: populatedAuthor.profile,
        writerStats: populatedAuthor.writerStats
          ? {
              totalNovelsPublished: populatedAuthor.writerStats.totalNovelsPublished,
              totalViewsAcrossAllNovels: populatedAuthor.writerStats.totalViewsAcrossAllNovels,
              totalLikesReceivedOnNovels: populatedAuthor.writerStats.totalLikesReceivedOnNovels,
            }
          : undefined,
      },
      synopsis: novelFromDb.synopsis,
      longDescription: novelFromDb.longDescription,
      coverImageUrl: novelFromDb.coverImageUrl,
      bannerImageUrl: novelFromDb.bannerImageUrl,
      themeAssignment: {
        mainTheme: {
          categoryId: toPopulatedCategoryInfo(novelFromDb.themeAssignment?.mainTheme?.categoryId)!,
          customName: novelFromDb.themeAssignment?.mainTheme?.customName,
        },
        subThemes: novelFromDb.themeAssignment?.subThemes?.map((st, index) => ({
          categoryId: toPopulatedCategoryInfo(novelFromDb.themeAssignment?.subThemes?.[index]?.categoryId as any)!,
          customName: st.customName,
        })) || [],
        moodAndTone: toPopulatedCategoryInfoArray(novelFromDb.themeAssignment?.moodAndTone as any[] || []),
        contentWarnings: toPopulatedCategoryInfoArray(novelFromDb.themeAssignment?.contentWarnings as any[] || []),
        customTags: novelFromDb.themeAssignment?.customTags || [],
      },
      narrativeFocus: novelFromDb.narrativeFocus,
      worldBuildingDetails: novelFromDb.worldBuildingDetails,
      ageRatingCategoryId: toPopulatedCategoryInfo(novelFromDb.ageRatingCategoryId as any),
      status: novelFromDb.status as INovel["status"],
      accessLevel: novelFromDb.accessLevel as INovel["accessLevel"],
      isCompleted: novelFromDb.isCompleted,
      endingType: novelFromDb.endingType as INovel["endingType"],
      sourceType: novelFromDb.sourceType as ISourceType,
      language: toPopulatedCategoryInfo(novelFromDb.language as any)!,
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
      lastContentUpdatedAt: novelFromDb.lastContentUpdatedAt.toISOString(),
      relatedNovels: novelFromDb.relatedNovels?.map((id) => id.toString()),
      seriesId: novelFromDb.seriesId?.toString(),
      seriesOrder: novelFromDb.seriesOrder,
      createdAt: novelFromDb.createdAt.toISOString(),
      updatedAt: novelFromDb.updatedAt.toISOString(),
      characters,
      episodes,
    };

    console.log(
      `✅ [API /novels/[slug]] ดึงข้อมูลนิยายสำเร็จ: "${novelFromDb.title}" (${characters.length} ตัวละคร, ${episodes.length} ตอน)`
    );

    // ส่งข้อมูลกลับพร้อม cache header
    return NextResponse.json(
      {
        success: true,
        novel: responseData,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  } catch (error: any) {
    const slugForError = (await context.params).slug || 'unknown';
    console.error(
      `❌ [API /novels/[slug]] ข้อผิดพลาดในการดึงข้อมูลนิยายสำหรับ slug "${slugForError}": ${error.message}`
    );
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "เกิดข้อผิดพลาดในการดึงข้อมูลนิยาย กรุณาลองใหม่อีกครั้ง",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}