// src/app/api/novels/[slug]/route.ts
// API Route สำหรับดึงข้อมูลนิยายตาม slug เพื่อแสดงในหน้ารายละเอียด
// รองรับการ populate ข้อมูลที่เกี่ยวข้องทั้งหมด เช่น หมวดหมู่, ผู้เขียน, ตัวละคร, ตอน

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb"; // ปรับปรุง: ตรวจสอบ path นี้ให้ถูกต้องตามโครงสร้างโปรเจกต์ของคุณ
import NovelModel, { INovel, IThemeAssignment, ISourceType, INarrativeFocus, IWorldBuildingDetails, INovelStats, IMonetizationSettings, IPsychologicalAnalysisConfig, ICollaborationSettings } from "@/backend/models/Novel";
import UserModel, { IUser, IUserProfile, IWriterStats } from "@/backend/models/User";
import CategoryModel, { ICategory } from "@/backend/models/Category";
import CharacterModel, { ICharacter, CharacterRoleInStory } from "@/backend/models/Character";
import EpisodeModel, { IEpisode, IEpisodeStats, EpisodeStatus, EpisodeAccessType } from "@/backend/models/Episode";
import { Types } from "mongoose";

// ===================================================================
// SECTION: TypeScript Interfaces สำหรับ API Response
// (ส่วนนี้เหมือนเดิม ไม่มีการแก้ไข)
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
  writerStats?: { // สถิตินักเขียนที่จำเป็นสำหรับหน้ารายละเอียดนิยาย
    totalNovelsPublished: number;
    totalViewsAcrossAllNovels: number; // อาจพิจารณา totalFollowers ของนักเขียนด้วยถ้าต้องการ
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
    categoryId: PopulatedCategoryInfo; // แก้ไข: ต้องมั่นใจว่า categoryId ไม่เป็น null/undefined หลัง populate
    customName?: string;
  };
  subThemes?: Array<{
    categoryId: PopulatedCategoryInfo; // แก้ไข: ต้องมั่นใจว่า categoryId ไม่เป็น null/undefined หลัง populate
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
  author: PopulatedAuthorForDetailPage; // แก้ไข: ต้องมั่นใจว่า author ไม่เป็น null/undefined
  coAuthors?: PopulatedAuthorForDetailPage[]; // เพิ่มใหม่: สำหรับผู้เขียนร่วม
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
  language: PopulatedCategoryInfo; // แก้ไข: ต้องมั่นใจว่า language ไม่เป็น null/undefined
  firstEpisodeId?: string;
  totalEpisodesCount: number;
  publishedEpisodesCount: number;
  stats: INovelStats;
  monetizationSettings: IMonetizationSettings;
  psychologicalAnalysisConfig: IPsychologicalAnalysisConfig;
  collaborationSettings?: ICollaborationSettings;
  isFeatured?: boolean;
  publishedAt?: string; // ISOString
  scheduledPublicationDate?: string; // ISOString
  lastContentUpdatedAt: string; // ISOString
  relatedNovels?: string[]; // Array of ObjectIds as strings (อาจพิจารณา populate ชื่อและ slug ถ้าจำเป็น)
  seriesId?: string; // (อาจพิจารณา populate ชื่อ series ถ้าจำเป็น)
  seriesOrder?: number;
  createdAt: string; // ISOString
  updatedAt: string; // ISOString

  // ข้อมูลตัวละครหลัก (แสดงตามจำนวนที่กำหนด, เช่น 6 ตัวแรก)
  characters?: PopulatedCharacterForDetailPage[];

  // ข้อมูลตอนล่าสุด (แสดงตามจำนวนที่กำหนด, เช่น 10 ตอนแรก)
  episodes?: PopulatedEpisodeForDetailPage[];
}

// ===================================================================
// SECTION: API Route Handler
// ===================================================================

/**
 * GET Handler สำหรับดึงข้อมูลนิยายตาม slug
 * @param request NextRequest object
 * @param context Context object ที่มี params ซึ่งภายในมี slug
 * @returns NextResponse ที่มีข้อมูลนิยายหรือ error
 */
export async function GET(
  request: NextRequest,
  context: { params: { slug: string } } // <<<< FIXED: แก้ไข type signature ตรงนี้
) {
  try {
    // ดึง slug จาก context.params
    const { slug } = context.params;

    // เชื่อมต่อฐานข้อมูล
    await dbConnect();

    // ตรวจสอบ slug
    if (!slug || typeof slug !== 'string' || !slug.trim()) {
      console.warn(`⚠️ [API /novels/[slug]] Invalid slug: "${slug}"`);
      return NextResponse.json(
        {
          error: "Invalid slug parameter",
          message: "กรุณาระบุ slug ของนิยายที่ถูกต้อง"
        },
        { status: 400 }
      );
    }

    const trimmedSlug = slug.trim().toLowerCase();
    console.log(`📄 [API /novels/[slug]] Fetching novel data for slug: "${trimmedSlug}"`);

    // ค้นหานิยายตาม slug พร้อม populate ข้อมูลที่เกี่ยวข้อง
    // ใช้ `.lean({ virtuals: true })` ถ้าต้องการ virtual fields จาก Mongoose โดยตรง
    // แต่ในที่นี้ เราจะ map ข้อมูลเองเพื่อให้ตรงตาม interface ที่กำหนดไว้อย่างแม่นยำ
    const novelFromDb = await NovelModel.findOne({
      slug: trimmedSlug,
      isDeleted: { $ne: true } // ไม่แสดงนิยายที่ถูกลบ (soft delete)
    })
    .populate<{ author: IUser }>({
      path: 'author',
      select: 'username profile writerStats', // เลือก writerStats ทั้ง object หรือ field ที่ต้องการ
      model: UserModel // ระบุ model ให้ชัดเจน
    })
    .populate<{ coAuthors: IUser[] }>({ // เพิ่มการ populate coAuthors
      path: 'coAuthors',
      select: 'username profile writerStats',
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
      select: 'name slug', // slug ของภาษาอาจมีประโยชน์สำหรับ locale
      model: CategoryModel
    })
    // เพิ่มการ populate สำหรับ narrativeFocus categories ถ้าต้องการแสดงชื่อ/slug แทน ObjectIds
    // ตัวอย่าง: (ถ้า INarrativeFocus ใน PopulatedNovelForDetailPage ถูกแก้ไขให้เก็บ PopulatedCategoryInfo)
    // .populate({ path: 'narrativeFocus.narrativePacingTags', select: 'name slug', model: CategoryModel })
    // .populate({ path: 'narrativeFocus.primaryConflictTypes', select: 'name slug', model: CategoryModel })
    // ... (และอื่นๆตามต้องการ)
    .lean(); // ใช้ lean() เพื่อประสิทธิภาพ และ map ข้อมูลเอง

    // ตรวจสอบว่าพบนิยายหรือไม่
    if (!novelFromDb) {
      console.warn(`⚠️ [API /novels/[slug]] Novel not found for slug: "${trimmedSlug}"`);
      return NextResponse.json(
        {
          error: "Novel not found",
          message: `ไม่พบนิยายที่มี slug "${trimmedSlug}"`
        },
        { status: 404 }
      );
    }

    // --- Helper function to safely convert populated category to PopulatedCategoryInfo ---
    // (ฟังก์ชันนี้ดีแล้ว ใช้สำหรับ map category ที่ populate มา)
    const toPopulatedCategoryInfo = (cat: any): PopulatedCategoryInfo | undefined => {
        if (!cat || typeof cat !== 'object' || !('_id' in cat) || !cat.name || !cat.slug) return undefined;
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

    // --- Helper function to map User to PopulatedAuthorForDetailPage ---
    const toPopulatedAuthor = (user: IUser | undefined): PopulatedAuthorForDetailPage | undefined => {
        if (!user || typeof user !== 'object' || !user._id) return undefined;
        return {
            _id: user._id.toString(),
            username: user.username,
            profile: {
                displayName: user.profile?.displayName,
                penName: user.profile?.penName,
                avatarUrl: user.profile?.avatarUrl,
                bio: user.profile?.bio,
            },
            writerStats: user.writerStats ? {
                totalNovelsPublished: user.writerStats.totalNovelsPublished || 0,
                totalViewsAcrossAllNovels: user.writerStats.totalViewsAcrossAllNovels || 0,
                totalLikesReceivedOnNovels: user.writerStats.totalLikesReceivedOnNovels || 0,
            } : undefined,
        };
    };

    // --- ดึงข้อมูลตัวละครของนิยาย (แสดง 6 ตัวแรก หรือตามจำนวนที่ต้องการ) ---
    const charactersFromDb = await CharacterModel.find({
      novelId: novelFromDb._id,
      isArchived: { $ne: true }
    })
    .select('name description roleInStory colorTheme profileImageMediaId profileImageSourceType') // profileImageUrl เป็น virtual
    .sort({ createdAt: 1 }) // เรียงตามวันที่สร้าง หรือตามลำดับที่ผู้เขียนกำหนด (ถ้ามี)
    .limit(6) // กำหนดจำนวนตัวละครที่จะแสดง
    .lean();

    const characters: PopulatedCharacterForDetailPage[] = charactersFromDb.map(char => {
        let imageUrl = `/images/default-avatar.png`; // Default avatar
        if (char.profileImageMediaId && char.profileImageSourceType) {
            // Logic นี้ควรตรงกับ virtual 'profileImageUrl' ใน CharacterModel
            // ถ้า CharacterModel.ts มีการเปลี่ยนแปลง logic การสร้าง URL ต้องปรับที่นี่ด้วย
            // หรือใช้ instance method ของ CharacterModel ถ้าไม่ได้ใช้ .lean() (ซึ่งจะช้ากว่า)
            imageUrl = `/api/media_placeholder/${char.profileImageSourceType}/${char.profileImageMediaId.toString()}`;
        }
        return {
            _id: char._id.toString(),
            name: char.name,
            profileImageUrl: imageUrl,
            description: char.description,
            roleInStory: char.roleInStory as CharacterRoleInStory, // Cast ถ้ามั่นใจว่า enum ตรงกัน
            colorTheme: char.colorTheme
        };
    });

    // --- ดึงข้อมูลตอนของนิยาย (แสดง 10 ตอนแรก หรือตามจำนวนที่ต้องการ) ---
    const episodesFromDb = await EpisodeModel.find({
      novelId: novelFromDb._id,
      status: { $in: [EpisodeStatus.PUBLISHED, EpisodeStatus.SCHEDULED] } // แสดงเฉพาะตอนที่เผยแพร่และตั้งเวลา
    })
    .select('title episodeOrder status accessType priceCoins publishedAt teaserText stats')
    .sort({ episodeOrder: 1 }) // เรียงตามลำดับตอน
    .limit(10) // กำหนดจำนวนตอนที่จะแสดง
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
      stats: { // ตรวจสอบให้แน่ใจว่า field ใน IEpisodeStats ตรงกับที่ดึงมา
        viewsCount: ep.stats?.viewsCount || 0,
        likesCount: ep.stats?.likesCount || 0,
        commentsCount: ep.stats?.commentsCount || 0,
        totalWords: ep.stats?.totalWords || 0,
        estimatedReadingTimeMinutes: ep.stats?.estimatedReadingTimeMinutes || 0
      }
    }));

    // --- Map ข้อมูลนิยายหลักไปยัง PopulatedNovelForDetailPage ---
    const author = toPopulatedAuthor(novelFromDb.author as IUser); // Cast IUser เพราะเรา populate มาแล้ว
    if (!author) {
      console.error(`❌ [API /novels/[slug]] Author object is not correctly populated or missing for novel: "${novelFromDb.title}" (ID: ${novelFromDb._id})`);
      return NextResponse.json(
          { error: "Internal server error", message: "เกิดข้อผิดพลาดในการประมวลผลข้อมูลผู้เขียนของนิยาย" },
          { status: 500 }
      );
    }
    const coAuthors = (novelFromDb.coAuthors as IUser[])?.map(toPopulatedAuthor).filter(Boolean) as PopulatedAuthorForDetailPage[] | undefined;


    // ตรวจสอบ populated categories ก่อน map เพื่อป้องกัน error
    const mainThemeCategoryPopulated = novelFromDb.themeAssignment?.mainTheme?.categoryId as unknown as ICategory | undefined;
    const mainThemeCategoryInfo = toPopulatedCategoryInfo(mainThemeCategoryPopulated);
    if (!mainThemeCategoryInfo && novelFromDb.themeAssignment?.mainTheme?.categoryId) {
         console.warn(`⚠️ [API /novels/[slug]] Main theme category ID ${novelFromDb.themeAssignment.mainTheme.categoryId} was not fully populated for novel "${novelFromDb.title}"`);
         // อาจจะต้องมี fallback หรือ log เพิ่มเติม
    }
     if (!mainThemeCategoryInfo) {
        console.error(`❌ [API /novels/[slug]] Main theme category for novel "${novelFromDb.title}" is missing or not populated correctly.`);
        // อาจจะ return error 500 หรือมี default category info
         return NextResponse.json(
            { error: "Internal server error", message: "ข้อมูลหมวดหมู่หลักของนิยายไม่สมบูรณ์" },
            { status: 500 }
        );
    }


    const languageCategoryPopulated = novelFromDb.language as ICategory | undefined;
    const languageInfo = toPopulatedCategoryInfo(languageCategoryPopulated);
    if (!languageInfo && novelFromDb.language) {
         console.warn(`⚠️ [API /novels/[slug]] Language category ID ${novelFromDb.language} was not fully populated for novel "${novelFromDb.title}"`);
    }
    if (!languageInfo) {
        console.error(`❌ [API /novels/[slug]] Language category for novel "${novelFromDb.title}" is missing or not populated correctly.`);
         return NextResponse.json(
            { error: "Internal server error", message: "ข้อมูลภาษาของนิยายไม่สมบูรณ์" },
            { status: 500 }
        );
    }


    const responseData: PopulatedNovelForDetailPage = {
      _id: novelFromDb._id.toString(),
      title: novelFromDb.title,
      slug: novelFromDb.slug,
      author: author, // ใช้ author ที่ map แล้ว
      coAuthors: coAuthors, // ใช้ coAuthors ที่ map แล้ว
      synopsis: novelFromDb.synopsis,
      longDescription: novelFromDb.longDescription,
      coverImageUrl: novelFromDb.coverImageUrl,
      bannerImageUrl: novelFromDb.bannerImageUrl,
      themeAssignment: {
        mainTheme: {
          categoryId: mainThemeCategoryInfo, // ใช้ mainThemeCategoryInfo ที่ map และตรวจสอบแล้ว
          customName: novelFromDb.themeAssignment?.mainTheme?.customName,
        },
        subThemes: novelFromDb.themeAssignment?.subThemes?.map(st => ({
          categoryId: toPopulatedCategoryInfo(st.categoryId as unknown as ICategory)!, // ใช้ ! ถ้ามั่นใจว่า populate สำเร็จและ schema บังคับ
          customName: st.customName,
        })).filter(st => st.categoryId) || [], // filter out subthemes with no valid categoryId
        moodAndTone: toPopulatedCategoryInfoArray(novelFromDb.themeAssignment?.moodAndTone as unknown as ICategory[] || []),
        contentWarnings: toPopulatedCategoryInfoArray(novelFromDb.themeAssignment?.contentWarnings as unknown as ICategory[] || []),
        customTags: novelFromDb.themeAssignment?.customTags || [],
      },
      narrativeFocus: novelFromDb.narrativeFocus as INarrativeFocus, // Cast ถ้ามั่นใจว่าโครงสร้างตรงกัน
      worldBuildingDetails: novelFromDb.worldBuildingDetails as IWorldBuildingDetails,
      ageRatingCategoryId: toPopulatedCategoryInfo(novelFromDb.ageRatingCategoryId as ICategory | undefined),
      status: novelFromDb.status as INovel["status"],
      accessLevel: novelFromDb.accessLevel as INovel["accessLevel"],
      isCompleted: novelFromDb.isCompleted,
      endingType: novelFromDb.endingType as INovel["endingType"],
      sourceType: novelFromDb.sourceType as ISourceType,
      language: languageInfo, // ใช้ languageInfo ที่ map และตรวจสอบแล้ว
      firstEpisodeId: novelFromDb.firstEpisodeId?.toString(),
      totalEpisodesCount: novelFromDb.totalEpisodesCount,
      publishedEpisodesCount: novelFromDb.publishedEpisodesCount,
      stats: novelFromDb.stats as INovelStats,
      monetizationSettings: novelFromDb.monetizationSettings as IMonetizationSettings,
      psychologicalAnalysisConfig: novelFromDb.psychologicalAnalysisConfig as IPsychologicalAnalysisConfig,
      collaborationSettings: novelFromDb.collaborationSettings as ICollaborationSettings | undefined,
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

    console.log(`✅ [API /novels/[slug]] Successfully fetched and mapped novel: "${novelFromDb.title}" (${characters.length} characters, ${episodes.length} episodes)`);

    // ส่งข้อมูลกลับ
    return NextResponse.json({
      success: true,
      novel: responseData
    }, {
      headers: {
        // ตั้งค่า Cache-Control ตามความเหมาะสม
        // s-maxage สำหรับ CDN, stale-while-revalidate เพื่อให้ข้อมูลเก่ายังแสดงได้ขณะ revalidate
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      }
    });

  } catch (error: any) {
    console.error(`❌ [API /novels/[slug]] Error fetching novel for slug (slug in context likely: "${context?.params?.slug}"):`, error.message, error.stack);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "เกิดข้อผิดพลาดในการดึงข้อมูลนิยาย กรุณาลองใหม่อีกครั้ง",
        // แสดงรายละเอียด error เฉพาะใน development mode
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}