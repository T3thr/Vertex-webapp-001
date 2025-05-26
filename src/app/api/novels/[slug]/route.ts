// src/app/api/novels/[slug]/route.ts
// API Endpoint สำหรับดึงข้อมูลนิยายตาม slug
// รองรับการ populate ข้อมูลที่จำเป็นทั้งหมดสำหรับหน้าแสดงผลนิยาย

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import NovelModel, { INovel, NovelStatus, INovelStats } from "@/backend/models/Novel";
import UserModel, { IUser } from "@/backend/models/User";
import CategoryModel, { ICategory, CategoryType } from "@/backend/models/Category";
import EpisodeModel, { IEpisode, EpisodeStatus, IEpisodeStats, EpisodeAccessType } from "@/backend/models/Episode";
import CharacterModel, { ICharacter, CharacterRoleInStory } from "@/backend/models/Character";
import mongoose, { Types } from "mongoose";

// --- อินเทอร์เฟซสำหรับข้อมูลที่ Populate แล้ว ---

// ข้อมูล Author ที่จำเป็นสำหรับหน้าแสดงผล
interface PopulatedAuthorForApi {
  _id: string; // Stringified ObjectId
  username: string;
  profile?: {
    displayName?: string;
    penName?: string;
    avatarUrl?: string;
  };
}

// ข้อมูล Category ที่จำเป็นสำหรับหน้าแสดงผล
interface PopulatedCategoryForApi {
  _id: string; // Stringified ObjectId
  name: string;
  slug: string;
  iconUrl?: string;
  color?: string;
  description?: string;
  categoryType: CategoryType;
  localizations?: ICategory["localizations"];
}

// ข้อมูล Episode สรุปสำหรับแสดงในรายการตอน
export interface PopulatedEpisodeSummary extends Pick<IEpisode,
  "title" | "episodeOrder" | "status" | "accessType" | "priceCoins"
> {
  _id: string; // Stringified ObjectId
  slug: string; // Derived from episodeOrder (e.g., episodeOrder.toString())
  publishedAt?: string | null; // ควรเป็น ISO String หรือ null
  stats: Pick<IEpisodeStats, "viewsCount" | "likesCount" | "commentsCount" | "totalWords" | "estimatedReadingTimeMinutes">;
}

// ข้อมูล Character สรุปสำหรับแสดงใน Tab และส่วนรายละเอียด
export interface PopulatedCharacterSummary extends Pick<ICharacter,
  "name" | "roleInStory" | "customRoleDetails" | "characterCode"
> {
  _id: string; // Stringified ObjectId
  synopsis?: string; // ดึงมาจาก characterProfile.synopsis
  profileImageUrl?: string; // จะถูกสร้างขึ้นจาก profileImageMediaId และ mediaSourceType หรือเป็น URL โดยตรง
}

// --- Interface หลักสำหรับข้อมูล Novel ที่ส่งกลับ (Populated) สำหรับหน้า Detail ---
export interface PopulatedNovelForDetailPage {
  _id: string;
  title: string;
  slug: string;
  author: PopulatedAuthorForApi | null;
  synopsis: string;
  longDescription?: string;
  coverImageUrl?: string;
  bannerImageUrl?: string;
  status: NovelStatus;
  isCompleted: boolean;
  endingType: INovel["endingType"];
  totalEpisodesCount: number;
  publishedEpisodesCount: number;
  monetizationSettings: INovel["monetizationSettings"];
  currentEpisodePriceCoins: number;

  mainThemeCategory?: PopulatedCategoryForApi | null;
  subThemeCategories?: PopulatedCategoryForApi[];
  moodAndToneCategories?: PopulatedCategoryForApi[];
  contentWarningCategories?: PopulatedCategoryForApi[];
  ageRatingCategory?: PopulatedCategoryForApi | null;
  languageCategory: PopulatedCategoryForApi; // language เป็น required ใน model
  artStyleCategory?: PopulatedCategoryForApi | null;
  customTags?: string[];

  episodesList: PopulatedEpisodeSummary[];
  charactersList: PopulatedCharacterSummary[];

  formattedViewsCount: string;
  formattedLikesCount: string;
  formattedFollowersCount: string;
  formattedWordsCount: string;
  formattedCommentsCount: string;
  formattedAverageRating: string;

  rawStats: Pick<INovelStats, "viewsCount" | "likesCount" | "followersCount" | "totalWords" | "commentsCount" | "ratingsCount" | "averageRating" | "lastPublishedEpisodeAt" | "uniqueViewersCount" | "sharesCount" | "bookmarksCount" | "estimatedReadingTimeMinutes" | "completionRate" | "purchasesCount">;

  firstEpisodeSlug?: string;
  firstPublishedAt?: string | null; // ISO String หรือ null
  updatedAt: string; // ISO String
  createdAt?: string; // ISO String
  lastContentUpdatedAt?: string | null; // ISO String หรือ null
}

// --- อินเทอร์เฟซสำหรับการตอบกลับ API ---
interface NovelResponse {
  novel: PopulatedNovelForDetailPage;
}

// ฟังก์ชันช่วยเหลือในการแปลง Date object หรือ string เป็น ISO string หรือ null
function safeToISOString(date?: Date | string | null): string | null {
    if (!date) return null;
    try {
        return new Date(date).toISOString();
    } catch (e) {
        // console.warn(`[API Helper] ไม่สามารถแปลงวันที่: ${date}`, e);
        return null; // หรือ return วันที่เดิมถ้าไม่สามารถแปลงได้และต้องการให้ client จัดการ
    }
}

/**
 * GET: ดึงข้อมูลนิยายตาม slug
 * @param req ข้อมูลคำขอจาก Next.js
 * @param context อ็อบเจ็กต์ที่มี params ของ route (เป็น Promise ใน Next.js 15+)
 * @returns JSON response พร้อมข้อมูลนิยายหรือข้อผิดพลาด
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> } // แก้ไข: params เป็น Promise ตาม Next.js App Router
): Promise<NextResponse<NovelResponse | { error: string; details?: string }>> {
  let slugForLogging = "unknown_slug"; // สำหรับ logging ใน finally block

  try {
    // แก้ไข: await params เพราะเป็น Promise ใน Next.js 15+
    const { slug } = await context.params;
    slugForLogging = slug; // อัปเดต slug สำหรับ logging

    if (!slug) {
      console.error("❌ [API /novels/[slug]] ขาดหรือรูปแบบ slug ไม่ถูกต้อง");
      return NextResponse.json({ error: "ต้องระบุ slug ของนิยาย" }, { status: 400 });
    }

    console.log(`\n--- 📡 [API GET /api/novels/${slug}] เริ่มต้น ---`);

    await dbConnect();
    console.log("✅ [API /novels/[slug]] เชื่อมต่อฐานข้อมูลสำเร็จ");

    // สร้าง query สำหรับดึงข้อมูลนิยายพร้อม populate ข้อมูลที่เกี่ยวข้อง
    const novelQuery = NovelModel.findOne({
      slug,
      status: { $nin: [NovelStatus.BANNED_BY_ADMIN, NovelStatus.REJECTED_BY_ADMIN] },
    })
      .populate<{ author: IUser | null }>({ // populate ข้อมูลผู้เขียน
        path: "author",
        model: UserModel,
        select: "_id username profile.displayName profile.penName profile.avatarUrl",
      })
      .populate<{ mainThemeCategory: ICategory | null }>({ // populate หมวดหมู่หลัก
        path: "themeAssignment.mainTheme.categoryId",
        model: CategoryModel,
      })
      .populate<{ subThemeCategoriesRaw: { categoryId: ICategory }[] }>({ // populate หมวดหมู่ย่อย
        path: "themeAssignment.subThemes.categoryId",
        model: CategoryModel,
      })
      .populate<{ moodAndToneCategories: ICategory[] }>({ // populate หมวดหมู่อารมณ์และโทน
        path: "themeAssignment.moodAndTone",
        model: CategoryModel,
      })
      .populate<{ contentWarningCategories: ICategory[] }>({ // populate หมวดหมู่คำเตือนเนื้อหา
        path: "themeAssignment.contentWarnings",
        model: CategoryModel,
      })
      .populate<{ ageRatingCategory: ICategory | null }>({ // populate หมวดหมู่เรตติ้งอายุ
        path: "ageRatingCategoryId",
        model: CategoryModel,
      })
      .populate<{ languageCategory: ICategory | null }>({ // populate หมวดหมู่ภาษา
        path: "language",
        model: CategoryModel,
      })
      .populate<{ artStyleCategory: ICategory | null }>({ // populate หมวดหมู่สไตล์ศิลปะ
        path: "narrativeFocus.artStyle",
        model: CategoryModel,
      })
      .select( // เลือก fields ที่จำเป็นจาก Novel document
        "title slug author synopsis longDescription coverImageUrl bannerImageUrl status isCompleted endingType " +
        "themeAssignment.mainTheme.categoryId themeAssignment.subThemes.categoryId themeAssignment.moodAndTone themeAssignment.contentWarnings themeAssignment.customTags " +
        "narrativeFocus.artStyle " +
        "ageRatingCategoryId language " +
        "totalEpisodesCount publishedEpisodesCount stats monetizationSettings " +
        "publishedAt lastContentUpdatedAt createdAt updatedAt"
      )
      .lean({ virtuals: true });

    const novelData = await novelQuery.exec();

    if (!novelData) {
      console.warn(`⚠️ [API /novels/${slug}] ไม่พบนิยายสำหรับ slug "${slug}"`);
      return NextResponse.json({ error: "ไม่พบนิยาย" }, { status: 404 });
    }
    console.log(`✅ [API /novels/${slug}] พบนิยาย: "${novelData.title}" (ID: ${novelData._id})`);

    // --- ฟังก์ชันช่วยเหลือสำหรับการ mapping ข้อมูล ---
    const mapPopulatedAuthor = (authorDoc: any): PopulatedAuthorForApi | null => {
        if (!authorDoc) return null;
        return {
            _id: authorDoc._id.toString(),
            username: authorDoc.username,
            profile: authorDoc.profile,
        };
    };

    const mapPopulatedCategory = (categoryDoc: any): PopulatedCategoryForApi | null => {
        if (!categoryDoc) return null;
        return {
            _id: categoryDoc._id.toString(),
            name: categoryDoc.name,
            slug: categoryDoc.slug,
            iconUrl: categoryDoc.iconUrl,
            color: categoryDoc.color,
            description: categoryDoc.description,
            categoryType: categoryDoc.categoryType,
            localizations: categoryDoc.localizations,
        };
    };

    // 2. ดึงรายการตอน (Episodes) ที่เผยแพร่แล้วหรือกำหนดเวลาเผยแพร่
    const episodesRaw = await EpisodeModel.find({
      novelId: novelData._id, // novelData._id ยังเป็น ObjectId ที่นี่
      status: { $in: [EpisodeStatus.PUBLISHED, EpisodeStatus.SCHEDULED] }
    })
      .sort({ episodeOrder: 1 }) // เรียงตามลำดับตอน
      .select("_id title episodeOrder status accessType priceCoins publishedAt stats")
      .lean()
      .exec();

    // แปลงข้อมูลตอนให้เป็นรูปแบบที่ต้องการส่งกลับ
    const episodesList: PopulatedEpisodeSummary[] = episodesRaw.map(ep => ({
      _id: (ep._id as Types.ObjectId).toString(),
      title: ep.title,
      slug: ep.episodeOrder.toString(), // ใช้ episodeOrder เป็น slug
      episodeOrder: ep.episodeOrder,
      status: ep.status,
      accessType: ep.accessType,
      priceCoins: ep.priceCoins,
      publishedAt: safeToISOString(ep.publishedAt),
      stats: {
        viewsCount: ep.stats?.viewsCount || 0,
        likesCount: ep.stats?.likesCount || 0,
        commentsCount: ep.stats?.commentsCount || 0,
        totalWords: ep.stats?.totalWords || 0,
        estimatedReadingTimeMinutes: ep.stats?.estimatedReadingTimeMinutes || 0,
      },
    }));
    console.log(`✅ [API /novels/${slug}] ดึง ${episodesList.length} ตอนสำหรับนิยาย "${novelData.title}"`);

    // 3. ดึงรายการตัวละคร (Characters) ที่ไม่ได้ถูกเก็บถาวร
    const charactersRaw = await CharacterModel.find({
      novelId: novelData._id, // novelData._id ยังเป็น ObjectId
      isArchived: { $ne: true }, // ไม่รวมตัวละครที่ถูกเก็บถาวร
    })
    .sort({ 'displayOrder.writer': 1, name: 1 }) // เรียงตาม displayOrder หรือชื่อ
    .select("_id characterCode name roleInStory customRoleDetails characterProfile.synopsis characterProfile.profileImageUrl profileImageMediaId profileImageSourceType isMainCharacter")
    .lean()
    .exec();

    // แปลงข้อมูลตัวละครให้เป็นรูปแบบที่ต้องการส่งกลับ
    const charactersList: PopulatedCharacterSummary[] = charactersRaw.map(char => {
        // Logic การสร้าง profileImageUrl
        let imageUrl = char.characterProfile?.profileImageUrl; // ถ้ามี URL โดยตรงใน profile
        if (!imageUrl && char.profileImageMediaId && char.profileImageSourceType) {
             // TODO: สร้าง URL จาก MediaId และ SourceType (เช่น query MediaModel/OfficialMediaModel)
             // imageUrl = `some_logic_to_get_url(${char.profileImageMediaId}, ${char.profileImageSourceType})`;
        }
        if (!imageUrl) {
            imageUrl = "/images/default-character-avatar.png"; // Placeholder สำหรับรูปตัวละครเริ่มต้น
        }

        return {
            _id: (char._id as Types.ObjectId).toString(),
            characterCode: char.characterCode,
            name: char.name,
            roleInStory: char.roleInStory,
            customRoleDetails: char.customRoleDetails,
            synopsis: char.characterProfile?.synopsis, // ดึงจาก characterProfile
            profileImageUrl: imageUrl,
        };
    });
    console.log(`✅ [API /novels/${slug}] ดึง ${charactersList.length} ตัวละครสำหรับนิยาย "${novelData.title}"`);

    // 4. เตรียมข้อมูลสำหรับการตอบกลับ
    // Type assertion เพื่อให้ TypeScript รู้ว่า novelData มี field ที่ populate มา
    const populatedNovel = novelData as (Omit<INovel, '_id' | 'author' | 'language' | 'themeAssignment' | 'ageRatingCategoryId' | 'narrativeFocus' | 'publishedAt' | 'lastContentUpdatedAt' | 'createdAt' | 'updatedAt'> & {
        _id: Types.ObjectId; // ObjectId ก่อนแปลง
        author: (IUser & { _id: Types.ObjectId }) | null;
        language: (ICategory & { _id: Types.ObjectId }) | null; // language เป็น ObjectId ที่ populate แล้ว
        themeAssignment?: {
            mainTheme?: { categoryId?: (ICategory & { _id: Types.ObjectId }) | null };
            subThemes?: { categoryId?: (ICategory & { _id: Types.ObjectId }) | null }[];
            moodAndTone?: ((ICategory & { _id: Types.ObjectId }) | null)[];
            contentWarnings?: ((ICategory & { _id: Types.ObjectId }) | null)[];
            customTags?: string[];
        };
        ageRatingCategoryId?: (ICategory & { _id: Types.ObjectId }) | null;
        narrativeFocus?: { artStyle?: (ICategory & { _id: Types.ObjectId }) | null };
        currentEpisodePriceCoins: number; // จาก virtual
        publishedAt?: Date | null;
        lastContentUpdatedAt?: Date | null;
        createdAt?: Date;
        updatedAt: Date;
    });

    // สร้างข้อมูลตอบกลับที่มีรูปแบบสำหรับหน้าแสดงรายละเอียดนิยาย
    const responseNovel: PopulatedNovelForDetailPage = {
      _id: populatedNovel._id.toString(),
      title: populatedNovel.title,
      slug: populatedNovel.slug,
      author: mapPopulatedAuthor(populatedNovel.author),
      synopsis: populatedNovel.synopsis || "",
      longDescription: populatedNovel.longDescription,
      coverImageUrl: populatedNovel.coverImageUrl,
      bannerImageUrl: populatedNovel.bannerImageUrl,
      status: populatedNovel.status,
      isCompleted: populatedNovel.isCompleted,
      endingType: populatedNovel.endingType,
      totalEpisodesCount: populatedNovel.totalEpisodesCount,
      publishedEpisodesCount: populatedNovel.publishedEpisodesCount,
      monetizationSettings: populatedNovel.monetizationSettings,
      currentEpisodePriceCoins: populatedNovel.currentEpisodePriceCoins,

      // การจัดหมวดหมู่และแท็ก
      mainThemeCategory: mapPopulatedCategory(populatedNovel.themeAssignment?.mainTheme?.categoryId),
      subThemeCategories: populatedNovel.themeAssignment?.subThemes?.map(st => mapPopulatedCategory(st.categoryId)).filter(Boolean) as PopulatedCategoryForApi[] || [],
      moodAndToneCategories: populatedNovel.themeAssignment?.moodAndTone?.map(cat => mapPopulatedCategory(cat)).filter(Boolean) as PopulatedCategoryForApi[] || [],
      contentWarningCategories: populatedNovel.themeAssignment?.contentWarnings?.map(cat => mapPopulatedCategory(cat)).filter(Boolean) as PopulatedCategoryForApi[] || [],
      ageRatingCategory: mapPopulatedCategory(populatedNovel.ageRatingCategoryId),
      languageCategory: mapPopulatedCategory(populatedNovel.language) || { _id: '', name: 'ไม่ระบุ', slug: 'unknown', categoryType: CategoryType.LANGUAGE } as PopulatedCategoryForApi, // language is required
      artStyleCategory: mapPopulatedCategory(populatedNovel.narrativeFocus?.artStyle),
      customTags: populatedNovel.themeAssignment?.customTags || [],

      // รายการตอนและตัวละคร
      episodesList,
      charactersList,

      // ข้อมูลสถิติที่จัดรูปแบบแล้ว
      formattedViewsCount: formatNumber(populatedNovel.stats?.viewsCount ?? 0),
      formattedLikesCount: formatNumber(populatedNovel.stats?.likesCount ?? 0),
      formattedFollowersCount: formatNumber(populatedNovel.stats?.followersCount ?? 0),
      formattedWordsCount: formatNumber(populatedNovel.stats?.totalWords ?? 0),
      formattedCommentsCount: formatNumber(populatedNovel.stats?.commentsCount ?? 0),
      formattedAverageRating: (populatedNovel.stats?.averageRating ?? 0).toFixed(1),
      rawStats: populatedNovel.stats,

      // ข้อมูลเวลาและตอนแรก
      firstEpisodeSlug: episodesList.find(ep => ep.status === EpisodeStatus.PUBLISHED)?.slug, // หา slug ของตอนแรกที่ published
      firstPublishedAt: safeToISOString(populatedNovel.publishedAt), // publishedAt คือ firstPublishedAt ของ novel
      updatedAt: safeToISOString(populatedNovel.updatedAt)!, // updatedAt ควรมีค่าเสมอ
      createdAt: safeToISOString(populatedNovel.createdAt),
      lastContentUpdatedAt: safeToISOString(populatedNovel.lastContentUpdatedAt),
    };

    console.log(`✅ [API /novels/${slug}] เตรียมข้อมูลตอบกลับสำเร็จสำหรับนิยาย "${responseNovel.title}"`);
    const response: NovelResponse = { novel: responseNovel };
    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
    console.error(`❌ [API /novels/${slugForLogging}] เกิดข้อผิดพลาด:`, error.message, error.stack);
    
    // จัดการข้อผิดพลาดประเภท CastError (รูปแบบ ID ไม่ถูกต้อง)
    if (error instanceof mongoose.Error.CastError) {
      return NextResponse.json({ error: "รูปแบบ slug หรือ ID ไม่ถูกต้อง", details: error.message }, { status: 400 });
    }
    
    // ข้อผิดพลาดทั่วไป
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ขณะดึงข้อมูลนิยาย", details: error.message },
      { status: 500 }
    );
  } finally {
    console.log(`--- 📡 [API GET /api/novels/${slugForLogging}] สิ้นสุด --- \n`);
  }
}

/**
 * ฟังก์ชันช่วยเหลือสำหรับ format ตัวเลขให้อ่านง่าย (K, M)
 * @param num - จำนวนที่ต้องการ format
 * @returns สตริงที่ format แล้ว (เช่น 1.2M, 5K, 123) หรือ '0' ถ้าเป็น null/undefined/NaN
 */
function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) {
    return "0";
  }
  if (num === 0) return "0"; // จัดการกรณี 0 โดยเฉพาะ
  if (Math.abs(num) >= 1000000) { // ใช้ Math.abs เพื่อรองรับเลขติดลบ (ถ้ามี)
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (Math.abs(num) >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toString();
}





