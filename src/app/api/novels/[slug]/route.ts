// src/app/api/novels/[slug]/route.ts
// API Route สำหรับดึงข้อมูลนิยายตาม slug เพื่อแสดงในหน้ารายละเอียด
// รองรับการ populate ข้อมูลที่เกี่ยวข้องทั้งหมด เช่น หมวดหมู่, ผู้เขียน, ตัวละคร, ตอน

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import NovelModel, { INovel, IThemeAssignment, ISourceType, INarrativeFocus, IWorldBuildingDetails, INovelStats, IMonetizationSettings, IPsychologicalAnalysisConfig, ICollaborationSettings } from "@/backend/models/Novel";
import UserModel, { IUser, IUserProfile, IWriterStats } from "@/backend/models/User";
import CategoryModel, { ICategory } from "@/backend/models/Category";
import CharacterModel, { ICharacter, CharacterRoleInStory, ICharacterExpression } from "@/backend/models/Character"; // ICharacterExpression อาจไม่จำเป็นสำหรับ detail page แต่ import ไว้เผื่อ
import EpisodeModel, { IEpisode, IEpisodeStats, EpisodeStatus, EpisodeAccessType } from "@/backend/models/Episode";
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
  writerStats?: { // แสดงสถิติบางส่วนของนักเขียน
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
    categoryId: PopulatedCategoryInfo; // คาดหวังว่า mainTheme category จะมีเสมอ
    customName?: string;
  };
  subThemes?: Array<{
    categoryId: PopulatedCategoryInfo; // คาดหวังว่า subTheme category จะมีเสมอ
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
  narrativeFocus?: INarrativeFocus; // คงไว้ตาม schema ของ INovel, ObjectId จะถูก stringify
  worldBuildingDetails?: IWorldBuildingDetails; // คงไว้ตาม schema ของ INovel
  ageRatingCategoryId?: PopulatedCategoryInfo;
  status: INovel["status"];
  accessLevel: INovel["accessLevel"];
  isCompleted: boolean;
  endingType: INovel["endingType"];
  sourceType: ISourceType; // คงไว้ตาม schema ของ INovel
  language: PopulatedCategoryInfo; // คาดหวังว่า language category จะมีเสมอ
  firstEpisodeId?: string;
  totalEpisodesCount: number;
  publishedEpisodesCount: number;
  stats: INovelStats; // คงไว้ตาม schema ของ INovel
  monetizationSettings: IMonetizationSettings; // คงไว้ตาม schema ของ INovel
  psychologicalAnalysisConfig: IPsychologicalAnalysisConfig; // คงไว้ตาม schema ของ INovel
  collaborationSettings?: ICollaborationSettings; // คงไว้ตาม schema ของ INovel
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
 * @param request NextRequest object - อ็อบเจกต์คำขอ HTTP ขาเข้า
 * @param context Context object containing route parameters - อ็อบเจกต์ context ที่มี params ซึ่งในที่นี้คือ slug
 * @returns NextResponse ที่มีข้อมูลนิยายหรือ error
 */
export async function GET(
  request: NextRequest,
  context: { params: { slug: string } } // <--- FIX: แก้ไข type ของ argument ที่สองตรงนี้
) {
  try {
    // เชื่อมต่อฐานข้อมูล
    await dbConnect();

    const slug = context.params.slug; // <--- FIX: เข้าถึง slug จาก context.params

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

    console.log(`📄 [API /novels/[slug]] Fetching novel data for slug: "${slug.trim().toLowerCase()}"`);

    // ค้นหานิยายตาม slug พร้อม populate ข้อมูลที่เกี่ยวข้อง
    // การใช้ Mongoose generic type arguments กับ populate ช่วยให้ type safety ดีขึ้น
    const novelFromDb = await NovelModel.findOne({
      slug: slug.trim().toLowerCase(),
      isDeleted: { $ne: true } // ไม่แสดงนิยายที่ถูกลบ (อ้างอิง field isDeleted จาก Novel.ts)
    })
    .populate<{ author: Pick<IUser, '_id' | 'username' | 'profile' | 'writerStats'> }>({ // ระบุ type ของ author ที่ populate มา
      path: 'author',
      select: 'username profile.displayName profile.penName profile.avatarUrl profile.bio writerStats.totalNovelsPublished writerStats.totalViewsAcrossAllNovels writerStats.totalLikesReceivedOnNovels', // เลือก field ที่ต้องการจาก profile และ writerStats
      model: UserModel
    })
    .populate<{ 'themeAssignment.mainTheme.categoryId': Pick<ICategory, '_id' | 'name' | 'slug' | 'color'> }>({
      path: 'themeAssignment.mainTheme.categoryId',
      select: '_id name slug color',
      model: CategoryModel
    })
    .populate<{ 'themeAssignment.subThemes.categoryId': Pick<ICategory, '_id' | 'name' | 'slug' | 'color'>[] }>({ // สำหรับ array ของ sub-objects
      path: 'themeAssignment.subThemes.categoryId',
      select: '_id name slug color',
      model: CategoryModel
    })
    .populate<{ 'themeAssignment.moodAndTone': Pick<ICategory, '_id' | 'name' | 'slug' | 'color'>[] }>({
      path: 'themeAssignment.moodAndTone',
      select: '_id name slug color',
      model: CategoryModel
    })
    .populate<{ 'themeAssignment.contentWarnings': Pick<ICategory, '_id' | 'name' | 'slug' | 'color'>[] }>({
      path: 'themeAssignment.contentWarnings',
      select: '_id name slug color',
      model: CategoryModel
    })
    .populate<{ ageRatingCategoryId: Pick<ICategory, '_id' | 'name' | 'slug' | 'color'> }>({
      path: 'ageRatingCategoryId',
      select: '_id name slug color',
      model: CategoryModel
    })
    .populate<{ language: Pick<ICategory, '_id' | 'name' | 'slug'> }>({
      path: 'language',
      select: '_id name slug', // ภาษาอาจไม่จำเป็นต้องมี color
      model: CategoryModel
    })
    .lean({ virtuals: true }); // ใช้ lean() เพื่อประสิทธิภาพ และ virtuals: true หากต้องการ virtual fields จาก NovelModel (ถ้ามี)

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
    // ฟังก์ชันตัวช่วยในการแปลง category ที่ populate มาเป็น PopulatedCategoryInfo อย่างปลอดภัย
    const toPopulatedCategoryInfo = (cat: any): PopulatedCategoryInfo | undefined => {
        // ตรวจสอบว่า cat เป็น object ที่มี properties ที่จำเป็น (_id, name, slug)
        if (!cat || typeof cat !== 'object' || !('_id' in cat) || !('name' in cat) || !('slug' in cat)) return undefined;
        return {
            _id: cat._id.toString(),
            name: cat.name,
            slug: cat.slug,
            color: cat.color, // color เป็น optional
        };
    };
    // ฟังก์ชันตัวช่วยสำหรับแปลง array ของ categories
    const toPopulatedCategoryInfoArray = (cats: any[]): PopulatedCategoryInfo[] => {
        if (!Array.isArray(cats)) return [];
        // map และ filter(Boolean) เพื่อกรองค่า undefined ออก หากบาง category populate ไม่สำเร็จ
        return cats.map(toPopulatedCategoryInfo).filter(Boolean) as PopulatedCategoryInfo[];
    };


    // --- ดึงข้อมูลตัวละครของนิยาย (แสดง 6 ตัวแรก) ---
    // CharacterModel มี virtual "profileImageUrl" ซึ่ง .lean({ virtuals: true }) อาจจะช่วยได้
    // หรือสร้างเองตาม logic เดิมถ้า virtuals ไม่ได้ถูก populate โดย lean โดยตรง
    const charactersFromDb = await CharacterModel.find({
      novelId: novelFromDb._id, // novelFromDb._id ตอนนี้เป็น ObjectId จาก .lean()
      isArchived: false // อ้างอิง field isArchived จาก Character.ts
    })
    .select('name description roleInStory colorTheme profileImageMediaId profileImageSourceType') // profileImageUrl เป็น virtual
    .sort({ createdAt: 1 }) // เรียงตามวันที่สร้าง
    .limit(6)
    .lean({ virtuals: true }); // ลองใช้ virtuals: true กับ lean ที่นี่ด้วยสำหรับ Character

    const characters: PopulatedCharacterForDetailPage[] = charactersFromDb.map(char => {
        // หาก CharacterModel.profileImageUrl (virtual) ถูก populate โดย lean({ virtuals: true })
        // สามารถใช้ char.profileImageUrl ได้โดยตรง (ต้องตรวจสอบว่ามีค่าหรือไม่)
        // หากไม่, ใช้ logic เดิมในการสร้าง URL
        let imageUrl = (char as any).profileImageUrl; // ลองเข้าถึง virtual field ที่อาจถูก populate
        if (!imageUrl) { // Fallback logic ถ้า virtual field ไม่มีค่า
            if (char.profileImageMediaId && char.profileImageSourceType) {
                imageUrl = `/api/media_placeholder/${char.profileImageSourceType}/${char.profileImageMediaId.toString()}`;
            } else {
                imageUrl = `/images/default-avatar.png`; // Default avatar
            }
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
    .lean(); // EpisodeModel ไม่มี virtual ที่ซับซ้อนใน select list นี้

    const episodes: PopulatedEpisodeForDetailPage[] = episodesFromDb.map(ep => ({
      _id: ep._id.toString(),
      title: ep.title,
      episodeOrder: ep.episodeOrder,
      status: ep.status as EpisodeStatus,
      accessType: ep.accessType as EpisodeAccessType,
      priceCoins: ep.priceCoins,
      publishedAt: ep.publishedAt?.toISOString(),
      teaserText: ep.teaserText,
      stats: { // ตรวจสอบให้แน่ใจว่า ep.stats ไม่ใช่ null/undefined ก่อนเข้าถึง property ย่อย
        viewsCount: ep.stats?.viewsCount || 0,
        likesCount: ep.stats?.likesCount || 0,
        commentsCount: ep.stats?.commentsCount || 0,
        totalWords: ep.stats?.totalWords || 0,
        estimatedReadingTimeMinutes: ep.stats?.estimatedReadingTimeMinutes || 0
      }
    }));

    // --- Explicitly map novel data to PopulatedNovelForDetailPage ---
    // สร้าง responseData อย่างระมัดระวัง
    // ตรวจสอบว่า author ถูก populate และไม่ใช่ ObjectId
    // Type `Pick<IUser, ...>` จาก populate ช่วยให้เข้าถึง field ได้อย่างปลอดภัย
    const populatedAuthor = novelFromDb.author as Pick<IUser, '_id' | 'username' | 'profile' | 'writerStats'>;

    if (!populatedAuthor || typeof populatedAuthor !== 'object' || !populatedAuthor._id || !populatedAuthor.profile) {
        console.error(`❌ [API /novels/[slug]] Author object is not correctly populated for novel: "${novelFromDb.title}"`);
        return NextResponse.json(
            { error: "Internal server error", message: "เกิดข้อผิดพลาดในการประมวลผลข้อมูลผู้เขียนของนิยาย" },
            { status: 500 }
        );
    }
    
    // การแปลง category ที่ populate มาสำหรับ themeAssignment
    const mainThemeCategoryPopulated = novelFromDb.themeAssignment?.mainTheme?.categoryId;
    const mainThemeCategoryInfo = toPopulatedCategoryInfo(mainThemeCategoryPopulated);
    if (!mainThemeCategoryInfo) { // Main theme category is required
        console.error(`❌ [API /novels/[slug]] Main theme category is not correctly populated or missing for novel: "${novelFromDb.title}"`);
        return NextResponse.json(
            { error: "Internal server error", message: "เกิดข้อผิดพลาดในการประมวลผลข้อมูลหมวดหมู่หลักของนิยาย" },
            { status: 500 }
        );
    }

    const languageCategoryPopulated = novelFromDb.language;
    const languageCategoryInfo = toPopulatedCategoryInfo(languageCategoryPopulated);
    if (!languageCategoryInfo) { // Language category is required
        console.error(`❌ [API /novels/[slug]] Language category is not correctly populated or missing for novel: "${novelFromDb.title}"`);
        return NextResponse.json(
            { error: "Internal server error", message: "เกิดข้อผิดพลาดในการประมวลผลข้อมูลภาษาของนิยาย" },
            { status: 500 }
        );
    }


    const responseData: PopulatedNovelForDetailPage = {
      _id: novelFromDb._id.toString(),
      title: novelFromDb.title,
      slug: novelFromDb.slug,
      author: {
        _id: populatedAuthor._id.toString(),
        username: populatedAuthor.username,
        profile: { // populatedAuthor.profile ควรจะมี fields ที่ select ไว้
          displayName: populatedAuthor.profile.displayName,
          penName: populatedAuthor.profile.penName,
          avatarUrl: populatedAuthor.profile.avatarUrl,
          bio: populatedAuthor.profile.bio,
        },
        writerStats: populatedAuthor.writerStats ? { // ตรวจสอบว่า writerStats มีค่า (เพราะเป็น optional)
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
          categoryId: mainThemeCategoryInfo, // ใช้ที่แปลงแล้วและตรวจสอบแล้ว
          customName: novelFromDb.themeAssignment?.mainTheme?.customName,
        },
        subThemes: novelFromDb.themeAssignment?.subThemes?.map(st => ({
          // ตรวจสอบ st.categoryId ก่อนเรียก toPopulatedCategoryInfo
          categoryId: toPopulatedCategoryInfo(st.categoryId)!, // ใช้ ! ถ้ามั่นใจว่า subtheme category ที่ populate มาจะ valid เสมอ หรือจัดการ undefined
          customName: st.customName,
        })).filter(st => st.categoryId) || [], // กรองอันที่ categoryId เป็น undefined ออก
        moodAndTone: toPopulatedCategoryInfoArray(novelFromDb.themeAssignment?.moodAndTone || []),
        contentWarnings: toPopulatedCategoryInfoArray(novelFromDb.themeAssignment?.contentWarnings || []),
        customTags: novelFromDb.themeAssignment?.customTags || [],
      },
      narrativeFocus: novelFromDb.narrativeFocus as INarrativeFocus, // Cast เพราะเราคาดหวังโครงสร้างจาก schema
      worldBuildingDetails: novelFromDb.worldBuildingDetails as IWorldBuildingDetails,
      ageRatingCategoryId: toPopulatedCategoryInfo(novelFromDb.ageRatingCategoryId), // อาจเป็น undefined ถ้าไม่ได้ตั้งค่า
      status: novelFromDb.status as INovel["status"],
      accessLevel: novelFromDb.accessLevel as INovel["accessLevel"],
      isCompleted: novelFromDb.isCompleted,
      endingType: novelFromDb.endingType as INovel["endingType"],
      sourceType: novelFromDb.sourceType as ISourceType,
      language: languageCategoryInfo, // ใช้ที่แปลงแล้วและตรวจสอบแล้ว
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
      relatedNovels: novelFromDb.relatedNovels?.map(id => id.toString()), // relatedNovels เป็น array ของ ObjectId
      seriesId: novelFromDb.seriesId?.toString(),
      seriesOrder: novelFromDb.seriesOrder,
      createdAt: novelFromDb.createdAt.toISOString(), // createdAt เป็น Mongoose timestamp
      updatedAt: novelFromDb.updatedAt.toISOString(), // updatedAt เป็น Mongoose timestamp
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
        // ตั้งค่า Cache-Control header เพื่อ caching strategy
        // public: อนุญาตให้ caches (เช่น CDN, browser) เก็บ response
        // s-maxage=60: CDN cache response นี้เป็นเวลา 60 วินาที
        // stale-while-revalidate=300: หาก cache หมดอายุ (เกิน 60 วิ) แต่ไม่เกิน 300 วิ,
        // CDN สามารถส่ง stale response ให้ client ก่อน แล้ว revalidate ใน background
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      }
    });

  } catch (error: any) {
    console.error(`❌ [API /novels/[slug]] Error fetching novel for slug "${context?.params?.slug}":`, error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "เกิดข้อผิดพลาดในการดึงข้อมูลนิยาย กรุณาลองใหม่อีกครั้ง",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined // แสดง details เฉพาะใน development mode
      },
      { status: 500 }
    );
  }
}