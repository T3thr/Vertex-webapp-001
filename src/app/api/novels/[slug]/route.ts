// src/app/api/novels/[slug]/route.ts
// API Endpoint สำหรับดึงข้อมูลนิยายตาม slug
// รองรับการ populate ข้อมูลที่จำเป็นทั้งหมดสำหรับหน้าแสดงผลนิยาย

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb"; // ตรวจสอบให้แน่ใจว่า dbConnect ถูกต้องและทำงานได้ดี
import NovelModel, { INovel, NovelStatus, INovelStats, IThemeAssignment, INarrativeFocus } from "@/backend/models/Novel";
import UserModel, { IUser } from "@/backend/models/User";
import CategoryModel, { ICategory, CategoryType } from "@/backend/models/Category";
import EpisodeModel, { IEpisode, EpisodeStatus, IEpisodeStats } from "@/backend/models/Episode";
import CharacterModel, { ICharacter } from "@/backend/models/Character"; // ไม่ได้ใช้ CharacterRoleInStory โดยตรงใน GET นี้
import mongoose, { Types, HydratedDocument } from "mongoose";

// --- อินเทอร์เฟซสำหรับข้อมูลที่ Populate แล้ว ---

// ข้อมูล Author ที่จำเป็นสำหรับหน้าแสดงผล
interface PopulatedAuthorForApi {
  _id: string; // Stringified ObjectId
  username?: string; // username อาจไม่มีในบางกรณีของ User model
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
  // เพิ่ม method getEffectivePrice และ getOriginalPrice ถ้าต้องการคำนวณราคาใน API
  // แต่โดยทั่วไป client จะเรียก method นั้นๆ เอง หรือ API ส่งข้อมูลดิบให้ client คำนวณ
  effectivePrice?: number; // ราคาที่ต้องจ่ายจริง (คำนวณใน API ถ้าจำเป็น)
  originalPrice?: number; // ราคาดั้งเดิม (คำนวณใน API ถ้าจำเป็น)
}

// ข้อมูล Character สรุปสำหรับแสดงใน Tab และส่วนรายละเอียด
export interface PopulatedCharacterSummary extends Pick<ICharacter,
  "name" | "roleInStory" | "customRoleDetails" | "characterCode"
> {
  _id: string; // Stringified ObjectId
  synopsis?: string; // ดึงมาจาก character.description
  profileImageUrl?: string; // จะถูกสร้างขึ้นจาก profileImageMediaId และ mediaSourceType หรือเป็น URL โดยตรง หรือ virtual
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
  currentEpisodePriceCoins: number; // จาก virtual ของ NovelModel

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

  // ส่ง rawStats ทั้งหมดเพื่อให้ client สามารถเลือกใช้ได้ตามต้องการ
  rawStats: INovelStats;

  firstEpisodeSlug?: string;
  firstPublishedAt?: string | null; // ISO String หรือ null (publishedAt ของ Novel)
  updatedAt: string; // ISO String
  createdAt?: string | null; // ISO String หรือ null
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
        return null;
    }
}

/**
 * GET: ดึงข้อมูลนิยายตาม slug
 * @param req ข้อมูลคำขอจาก Next.js
 * @param context อ็อบเจ็กต์ที่มี params ของ route
 * @returns JSON response พร้อมข้อมูลนิยายหรือข้อผิดพลาด
 */
export async function GET(
  req: NextRequest,
  context: { params: { slug: string } } // สำหรับ Next.js เวอร์ชันปัจจุบัน params ไม่ใช่ Promise โดยตรงแล้ว
): Promise<NextResponse<NovelResponse | { error: string; details?: string }>> {
  let slugForLogging = "unknown_slug";

  try {
    const { slug } = context.params; // params ไม่ใช่ Promise ในเวอร์ชันใหม่ๆ ของ App Router โดยทั่วไป
    slugForLogging = slug;

    if (!slug) {
      console.error("❌ [API /novels/[slug]] ขาดหรือรูปแบบ slug ไม่ถูกต้อง");
      return NextResponse.json({ error: "ต้องระบุ slug ของนิยาย" }, { status: 400 });
    }

    console.log(`\n--- 📡 [API GET /api/novels/${slug}] เริ่มต้น ---`);

    await dbConnect(); // ตรวจสอบให้มั่นใจว่า dbConnect() เชื่อมต่อสำเร็จก่อนดำเนินการใดๆ
    console.log("✅ [API /novels/[slug]] เชื่อมต่อฐานข้อมูลสำเร็จ");

    // สร้าง query สำหรับดึงข้อมูลนิยายพร้อม populate ข้อมูลที่เกี่ยวข้อง
    // ไม่ใช้ .lean() ที่นี่ เพื่อให้ได้ Mongoose Documents ซึ่ง virtuals จะทำงานได้
    const novelQuery = NovelModel.findOne({
      slug,
      isDeleted: { $ne: true }, // เพิ่มเงื่อนไขนี้เพื่อให้แน่ใจว่าไม่ดึงนิยายที่ถูก soft delete
      status: { $nin: [NovelStatus.BANNED_BY_ADMIN, NovelStatus.REJECTED_BY_ADMIN, NovelStatus.ARCHIVED] }, // ไม่แสดงนิยายที่ถูกแบน ปฏิเสธ หรือเก็บเข้าคลัง
    })
      .populate<{ author: HydratedDocument<IUser> | null }>({
        path: "author",
        model: UserModel, // Mongoose จะใช้ UserModel ที่ import มา
        select: "_id username profile.displayName profile.penName profile.avatarUrl",
      })
      .populate<{ language: HydratedDocument<ICategory> | null }>({
        path: "language", // language เป็น ObjectId ใน INovel
        model: CategoryModel,
      })
      .populate<{ ageRatingCategoryId: HydratedDocument<ICategory> | null }>({
        path: "ageRatingCategoryId",
        model: CategoryModel,
      })
      .populate<{ mainThemeCategoryId: HydratedDocument<ICategory> | null }>({
        path: "themeAssignment.mainTheme.categoryId", // Populate categoryId ภายใน mainTheme
        model: CategoryModel,
      })
      .populate<{ subThemeCategoryIds: HydratedDocument<ICategory>[] | null }>({
        path: "themeAssignment.subThemes.categoryId", // Populate categoryId ภายใน array subThemes
        model: CategoryModel,
      })
      .populate<{ moodAndToneCategoryIds: HydratedDocument<ICategory>[] | null }>({
        path: "themeAssignment.moodAndTone", // Populate array of categoryIds
        model: CategoryModel,
      })
      .populate<{ contentWarningCategoryIds: HydratedDocument<ICategory>[] | null }>({
        path: "themeAssignment.contentWarnings", // Populate array of categoryIds
        model: CategoryModel,
      })
      .populate<{ artStyleCategoryId: HydratedDocument<ICategory> | null }>({
        path: "narrativeFocus.artStyle", // Populate artStyle ภายใน narrativeFocus
        model: CategoryModel,
      });
      // ไม่จำเป็นต้อง .select() ทุก field ถ้าไม่ได้ prooject อะไรออกไปเป็นพิเศษ
      // Mongoose จะดึงทุก fields จาก schema โดย default. ถ้าต้องการจำกัด ควรใช้ select.
      // Virtuals จะถูกรวมเมื่อเรียก .toObject({ virtuals: true }) หรือ .toJSON({ virtuals: true })

    const novelData = await novelQuery.exec();

    if (!novelData) {
      console.warn(`⚠️ [API /novels/${slug}] ไม่พบนิยายสำหรับ slug "${slug}" หรือนิยายไม่อยู่ในสถานะที่แสดงได้`);
      return NextResponse.json({ error: "ไม่พบนิยาย" }, { status: 404 });
    }
    console.log(`✅ [API /novels/${slug}] พบนิยาย: "${novelData.title}" (ID: ${novelData._id})`);

    // แปลง Mongoose Document เป็น Plain Object พร้อม Virtuals
    // Type INovel ควรจะเพียงพอ เพราะ virtuals ถูก define ใน schema และ Mongoose ควรจัดการ type ของมัน
    const novelObject = novelData.toObject({ virtuals: true }) as INovel & { _id: Types.ObjectId };


    // --- ฟังก์ชันช่วยเหลือสำหรับการ mapping ข้อมูล ---
    const mapPopulatedAuthor = (authorDoc?: HydratedDocument<IUser> | IUser | null): PopulatedAuthorForApi | null => {
        if (!authorDoc) return null;
        // authorDoc อาจเป็น HydratedDocument หรือ plain object จาก toObject()
        const authorData = authorDoc instanceof mongoose.Document ? authorDoc.toObject() : authorDoc;
        return {
            _id: (authorData._id as Types.ObjectId).toString(),
            username: authorData.username,
            profile: authorData.profile ? {
                displayName: authorData.profile.displayName,
                penName: authorData.profile.penName,
                avatarUrl: authorData.profile.avatarUrl,
            } : undefined,
        };
    };

    const mapPopulatedCategory = (categoryDoc?: HydratedDocument<ICategory> | ICategory | null): PopulatedCategoryForApi | null => {
        if (!categoryDoc) return null;
        const categoryData = categoryDoc instanceof mongoose.Document ? categoryDoc.toObject() : categoryDoc;
        return {
            _id: (categoryData._id as Types.ObjectId).toString(),
            name: categoryData.name,
            slug: categoryData.slug,
            iconUrl: categoryData.iconUrl,
            color: categoryData.color,
            description: categoryData.description,
            categoryType: categoryData.categoryType,
            localizations: categoryData.localizations,
        };
    };

    // 2. ดึงรายการตอน (Episodes)
    const episodesHydrated = await EpisodeModel.find({
      novelId: novelObject._id, // ใช้ _id จาก novelObject
      status: { $in: [EpisodeStatus.PUBLISHED, EpisodeStatus.SCHEDULED] } // ดึงเฉพาะตอนที่เผยแพร่แล้วหรือตั้งเวลาไว้
    })
      .sort({ episodeOrder: 1 })
      .select("_id title episodeOrder status accessType priceCoins publishedAt stats") // เลือกเฉพาะ field ที่ต้องการ
      .exec(); // ได้ Mongoose documents

    const episodesList: PopulatedEpisodeSummary[] = await Promise.all(episodesHydrated.map(async epDoc => {
        const ep = epDoc.toObject({ virtuals: true }) as IEpisode & {_id: Types.ObjectId}; // แปลงเป็น object และเรียก virtuals
        // คำนวณราคาสำหรับแต่ละตอน (ตัวอย่าง - ถ้าต้องการ)
        // const effectivePrice = await epDoc.getEffectivePrice(); // epDoc คือ Mongoose Document
        // const originalPrice = await epDoc.getOriginalPrice();

        return {
            _id: ep._id.toString(),
            title: ep.title,
            slug: ep.episodeOrder.toString(),
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
            // effectivePrice, // เพิ่มถ้าคำนวณ
            // originalPrice,  // เพิ่มถ้าคำนวณ
        };
    }));
    console.log(`✅ [API /novels/${slug}] ดึง ${episodesList.length} ตอนสำหรับนิยาย "${novelObject.title}"`);

    // 3. ดึงรายการตัวละคร (Characters)
    const charactersHydrated = await CharacterModel.find({
      novelId: novelObject._id,
      isArchived: { $ne: true },
    })
    // .sort({ 'characterProfile.displayOrder.writer': 1, name: 1 }) // displayOrder ไม่ได้อยู่ใน CharacterModel โดยตรง
    .sort({ name: 1 }) // เรียงตามชื่อตัวละคร (หรือ field อื่นที่เหมาะสม)
    .select("_id characterCode name roleInStory customRoleDetails description profileImageMediaId profileImageSourceType") // เลือก fields, รวมถึง description
    .exec(); // ได้ Mongoose documents

    const charactersList: PopulatedCharacterSummary[] = charactersHydrated.map(charDoc => {
        const char = charDoc.toObject({ virtuals: true }) as ICharacter & {_id: Types.ObjectId}; // virtuals: true เพื่อให้ profileImageUrlFull ทำงาน

        let imageUrl = char.profileImageUrl; // ลองใช้ virtual ก่อน
        // ตรวจสอบว่า virtual ส่งค่า placeholder กลับมาหรือไม่ หรือถ้ามันไม่มีค่า
        if (!imageUrl || imageUrl.startsWith('placeholder_image_url_for_')) {
            if (char.profileImageMediaId && char.profileImageSourceType) {
                // TODO: สร้าง URL จริงจาก Media/OfficialMedia ที่นี่
                // ตัวอย่าง: imageUrl = await getMediaUrl(char.profileImageMediaId, char.profileImageSourceType);
                // สำหรับตอนนี้ใช้ placeholder ที่ชัดเจนขึ้น
                imageUrl = `/api/media_placeholder/${char.profileImageSourceType}/${char.profileImageMediaId.toString()}`;
            } else {
                imageUrl = "/images/default-character-avatar.png"; // รูปเริ่มต้น
            }
        }

        return {
            _id: char._id.toString(),
            characterCode: char.characterCode,
            name: char.name,
            roleInStory: char.roleInStory,
            customRoleDetails: char.customRoleDetails,
            synopsis: char.description, // ใช้ description ของตัวละครเป็น synopsis
            profileImageUrl: imageUrl,
        };
    });
    console.log(`✅ [API /novels/${slug}] ดึง ${charactersList.length} ตัวละครสำหรับนิยาย "${novelObject.title}"`);

    // 4. เตรียมข้อมูลสำหรับการตอบกลับ
    // novelObject เป็น plain object ที่มี virtuals แล้ว
    // แต่ field ที่ populate มา (เช่น author, language) ก็เป็น plain objects ด้วย
    const typedAuthor = novelObject.author as HydratedDocument<IUser> | IUser | null | undefined;
    const typedLanguage = novelObject.language as HydratedDocument<ICategory> | ICategory | null | undefined;
    const typedAgeRating = novelObject.ageRatingCategoryId as HydratedDocument<ICategory> | ICategory | null | undefined;
    
    // themeAssignment และ narrativeFocus จะมีโครงสร้างตาม schema
    const mainThemeCat = novelObject.themeAssignment?.mainTheme?.categoryId as unknown as HydratedDocument<ICategory> | ICategory | null | undefined;
    const subThemeCats = novelObject.themeAssignment?.subThemes?.map(st => st.categoryId) as (HydratedDocument<ICategory> | ICategory | null | undefined)[] | undefined;
    const moodToneCats = novelObject.themeAssignment?.moodAndTone as (HydratedDocument<ICategory> | ICategory | null | undefined)[] | undefined;
    const contentWarningCats = novelObject.themeAssignment?.contentWarnings as (HydratedDocument<ICategory> | ICategory | null | undefined)[] | undefined;
    const artStyleCat = novelObject.narrativeFocus?.artStyle as HydratedDocument<ICategory> | ICategory | null | undefined;


    const responseNovel: PopulatedNovelForDetailPage = {
      _id: novelObject._id.toString(),
      title: novelObject.title,
      slug: novelObject.slug,
      author: mapPopulatedAuthor(typedAuthor),
      synopsis: novelObject.synopsis || "",
      longDescription: novelObject.longDescription,
      coverImageUrl: novelObject.coverImageUrl,
      bannerImageUrl: novelObject.bannerImageUrl,
      status: novelObject.status,
      isCompleted: novelObject.isCompleted,
      endingType: novelObject.endingType,
      totalEpisodesCount: novelObject.totalEpisodesCount,
      publishedEpisodesCount: novelObject.publishedEpisodesCount,
      monetizationSettings: novelObject.monetizationSettings,
      currentEpisodePriceCoins: novelObject.currentEpisodePriceCoins, // Virtual field จาก NovelModel

      mainThemeCategory: mapPopulatedCategory(mainThemeCat),
      subThemeCategories: subThemeCats?.map(cat => mapPopulatedCategory(cat)).filter(Boolean) as PopulatedCategoryForApi[] || [],
      moodAndToneCategories: moodToneCats?.map(cat => mapPopulatedCategory(cat)).filter(Boolean) as PopulatedCategoryForApi[] || [],
      contentWarningCategories: contentWarningCats?.map(cat => mapPopulatedCategory(cat)).filter(Boolean) as PopulatedCategoryForApi[] || [],
      ageRatingCategory: mapPopulatedCategory(typedAgeRating),
      languageCategory: mapPopulatedCategory(typedLanguage) || { _id: '', name: 'N/A', slug: 'na', categoryType: CategoryType.LANGUAGE } as PopulatedCategoryForApi, // ภาษาเป็น field ที่จำเป็น
      artStyleCategory: mapPopulatedCategory(artStyleCat),
      customTags: novelObject.themeAssignment?.customTags || [],

      episodesList,
      charactersList,

      formattedViewsCount: formatNumber(novelObject.stats?.viewsCount),
      formattedLikesCount: formatNumber(novelObject.stats?.likesCount),
      formattedFollowersCount: formatNumber(novelObject.stats?.followersCount),
      formattedWordsCount: formatNumber(novelObject.stats?.totalWords),
      formattedCommentsCount: formatNumber(novelObject.stats?.commentsCount),
      formattedAverageRating: (novelObject.stats?.averageRating ?? 0).toFixed(1),
      
      rawStats: novelObject.stats, // ส่ง INovelStats ทั้งหมด

      firstEpisodeSlug: episodesList.find(ep => ep.status === EpisodeStatus.PUBLISHED)?.slug,
      firstPublishedAt: safeToISOString(novelObject.publishedAt),
      updatedAt: safeToISOString(novelObject.updatedAt)!,
      createdAt: safeToISOString(novelObject.createdAt),
      lastContentUpdatedAt: safeToISOString(novelObject.lastContentUpdatedAt),
    };

    console.log(`✅ [API /novels/${slug}] เตรียมข้อมูลตอบกลับสำเร็จสำหรับนิยาย "${responseNovel.title}"`);
    const response: NovelResponse = { novel: responseNovel };
    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
    console.error(`❌ [API /novels/${slugForLogging}] เกิดข้อผิดพลาด:`, error.message, error.stack);
    
    if (error instanceof mongoose.Error.CastError) {
      return NextResponse.json({ error: "รูปแบบ slug หรือ ID ไม่ถูกต้อง", details: error.message }, { status: 400 });
    }
    
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
function formatNumber(num?: number | null): string { // ปรับ num เป็น optional และรับ null ได้
  if (num === null || num === undefined || isNaN(num)) {
    return "0";
  }
  if (num === 0) return "0";
  if (Math.abs(num) >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (Math.abs(num) >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toString();
}