// src/app/api/novels/[slug]/route.ts
// API Route สำหรับดึงข้อมูลนิยายตาม slug เพื่อแสดงในหน้ารายละเอียด
// รองรับการ populate ข้อมูลที่เกี่ยวข้องทั้งหมด เช่น หมวดหมู่, ผู้เขียน, ตัวละคร, ตอน

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import NovelModel, { INovel, IThemeAssignment, ISourceType, INarrativeFocus, IWorldBuildingDetails, INovelStats, IMonetizationSettings, IPsychologicalAnalysisConfig, ICollaborationSettings } from "@/backend/models/Novel"; //
import UserModel, { IUser, IUserProfile, IWriterStats } from "@/backend/models/User"; //
import CategoryModel, { ICategory } from "@/backend/models/Category"; //
import CharacterModel, { ICharacter, CharacterRoleInStory } from "@/backend/models/Character"; //
import EpisodeModel, { IEpisode, IEpisodeStats, EpisodeStatus, EpisodeAccessType } from "@/backend/models/Episode"; //
import { Types } from "mongoose";

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
  profile: {
    displayName?: string;
    penName?: string;
    avatarUrl?: string;
    bio?: string;
  };
  writerStats?: {
    totalNovelsPublished: number;
    totalViewsAcrossAllNovels: number;
    totalLikesReceivedOnNovels: number;
  };
}

/**
 * @interface PopulatedCategoryInfo
 * @description Interface สำหรับข้อมูล Category ที่ถูก populate บางส่วน
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
  profileImageUrl?: string; // Virtual field from Character model
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
  episodeOrder: number;
  status: EpisodeStatus;
  accessType: EpisodeAccessType;
  priceCoins?: number;
  publishedAt?: string; // ISOString
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
  narrativeFocus?: INarrativeFocus; //
  worldBuildingDetails?: IWorldBuildingDetails; //
  ageRatingCategoryId?: PopulatedCategoryInfo;
  status: INovel["status"]; //
  accessLevel: INovel["accessLevel"]; //
  isCompleted: boolean;
  endingType: INovel["endingType"]; //
  sourceType: ISourceType; //
  language: PopulatedCategoryInfo;
  firstEpisodeId?: string;
  totalEpisodesCount: number;
  publishedEpisodesCount: number;
  stats: INovelStats; //
  monetizationSettings: IMonetizationSettings; //
  psychologicalAnalysisConfig: IPsychologicalAnalysisConfig; //
  collaborationSettings?: ICollaborationSettings; //
  isFeatured?: boolean;
  publishedAt?: string; // ISOString
  scheduledPublicationDate?: string; // ISOString
  lastContentUpdatedAt: string; // ISOString
  relatedNovels?: string[]; // Array of ObjectIds as strings
  seriesId?: string;
  seriesOrder?: number;
  createdAt: string; // ISOString
  updatedAt: string; // ISOString

  // ข้อมูลตัวละครหลัก (แสดง 6 ตัวแรก)
  characters?: PopulatedCharacterForDetailPage[];

  // ข้อมูลตอนล่าสุด (แสดง 10 ตอนแรก)
  episodes?: PopulatedEpisodeForDetailPage[];
}

// ===================================================================
// SECTION: API Route Handler
// ===================================================================

/**
 * GET Handler สำหรับดึงข้อมูลนิยายตาม slug
 * @param request NextRequest object
 * @param params พารามิเตอร์ที่มี slug
 * @returns NextResponse ที่มีข้อมูลนิยายหรือ error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // เชื่อมต่อฐานข้อมูล
    await dbConnect();

    const slug = params.slug;

    // ตรวจสอบ slug
    if (!slug || typeof slug !== 'string') {
      console.warn(`⚠️ [API /novels/[slug]] Invalid slug: "${slug}"`);
      return NextResponse.json(
        {
          error: "Invalid slug parameter",
          message: "กรุณาระบุ slug ของนิยายที่ถูกต้อง"
        },
        { status: 400 }
      );
    }

    console.log(`📄 [API /novels/[slug]] Fetching novel data for slug: "${slug}"`);

    // ค้นหานิยายตาม slug พร้อม populate ข้อมูลที่เกี่ยวข้อง
    // Using `as any` for novelFromDb temporarily to handle Mongoose's populated type complexities with .lean()
    // We will then explicitly map this to our strongly-typed PopulatedNovelForDetailPage
    const novelFromDb = await NovelModel.findOne({
      slug: slug.trim().toLowerCase(),
      isDeleted: false // ไม่แสดงนิยายที่ถูกลบ
    })
    .populate<{ author: IUser }>({ // Explicitly type the populated 'author' field
      path: 'author',
      select: 'username profile writerStats.totalNovelsPublished writerStats.totalViewsAcrossAllNovels writerStats.totalLikesReceivedOnNovels',
      model: UserModel
    })
    .populate<{ themeAssignment_mainTheme_categoryId: ICategory }>({
      path: 'themeAssignment.mainTheme.categoryId',
      select: 'name slug color',
      model: CategoryModel
    })
    .populate<{ themeAssignment_subThemes_categoryId: ICategory[] }>({
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
      select: 'name slug',
      model: CategoryModel
    })
    .lean(); // ใช้ lean() เพื่อประสิทธิภาพ

    // ตรวจสอบว่าพบนิยายหรือไม่
    if (!novelFromDb) {
      console.warn(`⚠️ [API /novels/[slug]] Novel not found for slug: "${slug}"`);
      return NextResponse.json(
        {
          error: "Novel not found",
          message: `ไม่พบนิยายที่มี slug "${slug}"`
        },
        { status: 404 }
      );
    }
    
    // --- Helper function to safely convert populated category to PopulatedCategoryInfo ---
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
        return cats.map(toPopulatedCategoryInfo).filter(Boolean) as PopulatedCategoryInfo[];
    };


    // --- ดึงข้อมูลตัวละครของนิยาย (แสดง 6 ตัวแรก) ---
    const charactersFromDb = await CharacterModel.find({
      novelId: novelFromDb._id,
      isArchived: false
    })
    .select('name description roleInStory colorTheme profileImageMediaId profileImageSourceType') // profileImageUrl is virtual
    .sort({ createdAt: 1 }) // เรียงตามวันที่สร้าง
    .limit(6)
    .lean();

    const characters: PopulatedCharacterForDetailPage[] = charactersFromDb.map(char => {
        // Manually trigger virtual if needed, or construct it.
        // For lean objects, virtuals might not be present unless schema is configured for it AND lean is used with { virtuals: true }
        // The Character schema has virtuals enabled for toObject/toJSON, but .lean() is different.
        // We'll use the fallback logic as in the original code.
        let imageUrl = `/images/default-avatar.png`; // Default
        if (char.profileImageMediaId && char.profileImageSourceType) {
             // This logic is from the CharacterModel virtual "profileImageUrl"
            imageUrl = `/api/media_placeholder/${char.profileImageSourceType}/${char.profileImageMediaId.toString()}`;
        }

        return {
            _id: char._id.toString(),
            name: char.name,
            profileImageUrl: imageUrl,
            description: char.description,
            roleInStory: char.roleInStory as CharacterRoleInStory,
            colorTheme: char.colorTheme
        };
    });


    // --- ดึงข้อมูลตอนของนิยาย (แสดง 10 ตอนแรก) ---
    const episodesFromDb = await EpisodeModel.find({
      novelId: novelFromDb._id,
      status: { $in: [EpisodeStatus.PUBLISHED, EpisodeStatus.SCHEDULED] } // แสดงเฉพาะตอนที่เผยแพร่และตั้งเวลา
    })
    .select('title episodeOrder status accessType priceCoins publishedAt teaserText stats')
    .sort({ episodeOrder: 1 }) // เรียงตามลำดับตอน
    .limit(10)
    .lean();

    const episodes: PopulatedEpisodeForDetailPage[] = episodesFromDb.map(ep => ({
      _id: ep._id.toString(),
      title: ep.title,
      episodeOrder: ep.episodeOrder,
      status: ep.status as EpisodeStatus,
      accessType: ep.accessType as EpisodeAccessType,
      priceCoins: ep.priceCoins,
      publishedAt: ep.publishedAt?.toISOString(),
      teaserText: ep.teaserText,
      stats: {
        viewsCount: ep.stats?.viewsCount || 0,
        likesCount: ep.stats?.likesCount || 0,
        commentsCount: ep.stats?.commentsCount || 0,
        totalWords: ep.stats?.totalWords || 0,
        estimatedReadingTimeMinutes: ep.stats?.estimatedReadingTimeMinutes || 0
      }
    }));

    // --- Explicitly map novel data to PopulatedNovelForDetailPage ---
    // Ensure author is populated and not an ObjectId
    const populatedAuthor = novelFromDb.author as unknown as IUser; // Assuming population was successful
    if (!populatedAuthor || typeof populatedAuthor !== 'object' || !populatedAuthor._id || !populatedAuthor.profile) {
        console.error(`❌ [API /novels/[slug]] Author object is not correctly populated for novel: "${novelFromDb.title}"`);
        return NextResponse.json(
            { error: "Internal server error", message: "เกิดข้อผิดพลาดในการประมวลผลข้อมูลผู้เขียนของนิยาย" },
            { status: 500 }
        );
    }
    
    // Cast theme assignment parts
    const mainThemeCategory = novelFromDb.themeAssignment?.mainTheme?.categoryId as unknown as ICategory;
    const subThemeCategories = novelFromDb.themeAssignment?.subThemes?.map(st => st.categoryId as unknown as ICategory) || [];
    const moodAndToneCategories = novelFromDb.themeAssignment?.moodAndTone as unknown as ICategory[] || [];
    const contentWarningCategories = novelFromDb.themeAssignment?.contentWarnings as unknown as ICategory[] || [];


    const responseData: PopulatedNovelForDetailPage = {
      _id: novelFromDb._id.toString(),
      title: novelFromDb.title,
      slug: novelFromDb.slug,
      author: {
        _id: populatedAuthor._id.toString(),
        username: populatedAuthor.username,
        profile: {
          displayName: populatedAuthor.profile.displayName,
          penName: populatedAuthor.profile.penName,
          avatarUrl: populatedAuthor.profile.avatarUrl,
          bio: populatedAuthor.profile.bio,
        },
        writerStats: populatedAuthor.writerStats ? {
          totalNovelsPublished: populatedAuthor.writerStats.totalNovelsPublished,
          totalViewsAcrossAllNovels: populatedAuthor.writerStats.totalViewsAcrossAllNovels,
          totalLikesReceivedOnNovels: populatedAuthor.writerStats.totalLikesReceivedOnNovels,
        } : undefined,
      },
      synopsis: novelFromDb.synopsis,
      longDescription: novelFromDb.longDescription,
      coverImageUrl: novelFromDb.coverImageUrl,
      bannerImageUrl: novelFromDb.bannerImageUrl,
      themeAssignment: {
        mainTheme: {
          categoryId: toPopulatedCategoryInfo(mainThemeCategory)!, // Add ! if you are sure it will be populated
          customName: novelFromDb.themeAssignment?.mainTheme?.customName,
        },
        subThemes: novelFromDb.themeAssignment?.subThemes?.map((st, index) => ({
          categoryId: toPopulatedCategoryInfo(subThemeCategories[index])!,
          customName: st.customName,
        })) || [],
        moodAndTone: toPopulatedCategoryInfoArray(moodAndToneCategories),
        contentWarnings: toPopulatedCategoryInfoArray(contentWarningCategories),
        customTags: novelFromDb.themeAssignment?.customTags || [],
      },
      narrativeFocus: novelFromDb.narrativeFocus,
      worldBuildingDetails: novelFromDb.worldBuildingDetails,
      ageRatingCategoryId: toPopulatedCategoryInfo(novelFromDb.ageRatingCategoryId as unknown as ICategory),
      status: novelFromDb.status as INovel["status"],
      accessLevel: novelFromDb.accessLevel as INovel["accessLevel"],
      isCompleted: novelFromDb.isCompleted,
      endingType: novelFromDb.endingType as INovel["endingType"],
      sourceType: novelFromDb.sourceType as ISourceType,
      language: toPopulatedCategoryInfo(novelFromDb.language as unknown as ICategory)!,
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
      relatedNovels: novelFromDb.relatedNovels?.map(id => id.toString()),
      seriesId: novelFromDb.seriesId?.toString(),
      seriesOrder: novelFromDb.seriesOrder,
      createdAt: novelFromDb.createdAt.toISOString(),
      updatedAt: novelFromDb.updatedAt.toISOString(),
      characters: characters,
      episodes: episodes,
    };

    console.log(`✅ [API /novels/[slug]] Successfully fetched novel: "${novelFromDb.title}" (${characters.length} characters, ${episodes.length} episodes)`);

    // ส่งข้อมูลกลับ
    return NextResponse.json({
      success: true,
      novel: responseData
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300', // Cache 1 นาที
      }
    });

  } catch (error: any) {
    console.error(`❌ [API /novels/[slug]] Error fetching novel for slug "${params?.slug}":`, error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "เกิดข้อผิดพลาดในการดึงข้อมูลนิยาย กรุณาลองใหม่อีกครั้ง",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}