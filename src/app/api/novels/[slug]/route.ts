// src/app/api/novels/[slug]/route.ts
import mongoose, { Types, Document } from "mongoose"; // เพิ่ม Document
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import NovelModel, {
  INovel,
  NovelStatus,
  NovelAccessLevel,
  NovelEndingType,
  IThemeAssignment,
  INarrativeFocus,
  ISourceType,
  INovelStats,
  IMonetizationSettings,
  IWorldBuildingDetails,
  IPsychologicalAnalysisConfig,
  ICollaborationSettings,
} from "@/backend/models/Novel";
import UserModel, { IUser, IUserProfile } from "@/backend/models/User";
import CategoryModel, { ICategory, CategoryType, ICategoryLocalization } from "@/backend/models/Category";
import CharacterModel, {
  ICharacter,
  CharacterRoleInStory,
  ICharacterExpression,
  IPhysicalAttributes,
  IPersonalityTraits,
  IVoiceActorInfo,
  ICharacterStat,
} from "@/backend/models/Character";
import EpisodeModel, {
  IEpisode,
  EpisodeStatus,
  EpisodeAccessType,
  IEpisodeStats,
  IEpisodeSentiment,
} from "@/backend/models/Episode";

// ==================================================================================================
// SECTION: อินเทอร์เฟซสำหรับข้อมูลที่ Populate เพื่อใช้ในหน้าแสดงรายละเอียดนิยาย
// ==================================================================================================

// อินเทอร์เฟซสำหรับผู้เขียนที่ถูก Populate
export interface PopulatedAuthorForDetailPage {
  _id: Types.ObjectId; // คงไว้เป็น ObjectId ก่อน toObject
  username?: string;
  profile?: Pick<
    IUserProfile,
    "displayName" | "penName" | "avatarUrl" | "bio" | "websiteUrl"
  >;
  roles?: IUser["roles"];
}

// อินเทอร์เฟซสำหรับหมวดหมู่ที่ถูก Populate
// PopulatedCategoryForDetailPage จะใช้ Document เพื่อให้แน่ใจว่ามี virtuals/getters ก่อน toObject
export interface PopulatedCategoryForDetailPage {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  categoryType: CategoryType;
  iconUrl?: string;
  color?: string;
  localizations?: ICategoryLocalization[];
  fullUrl?: string; // Virtual field
}


// อินเทอร์เฟซสำหรับตัวละครที่ถูก Populate
// NovelCharactersTab จะใช้ type นี้
export interface PopulatedCharacterForDetailPage {
  _id: string; // ObjectId จะถูกแปลงเป็น string โดย toObject()
  name: string;
  characterCode: string;
  profileImageUrl?: string; // จาก virtual ของ CharacterModel
  profileImageMediaId?: Types.ObjectId;
  profileImageSourceType?: "Media" | "OfficialMedia";
  roleInStory?: CharacterRoleInStory;
  customRoleDetails?: string;
  description?: string; // CharacterModel ใช้ description
  expressions?: Types.DocumentArray<ICharacterExpression>;
  defaultExpressionId?: string;
  physicalAttributes?: IPhysicalAttributes;
  personalityTraits?: IPersonalityTraits;
  voiceActorInfo?: IVoiceActorInfo;
  stats?: Types.DocumentArray<ICharacterStat>;
  colorTheme?: string;
}

// อินเทอร์เฟซสำหรับตอนที่ถูก Populate
// NovelEpisodesTab จะใช้ type นี้
export interface PopulatedEpisodeForDetailPage {
  _id: string; // ObjectId จะถูกแปลงเป็น string โดย toObject()
  title: string;
  episodeOrder: number;
  status: EpisodeStatus;
  accessType: EpisodeAccessType;
  publishedAt?: Date;
  priceCoins?: number;
  teaserText?: string;
  stats: Pick<IEpisodeStats, "viewsCount" | "likesCount" | "commentsCount" | "totalWords" | "estimatedReadingTimeMinutes">;
  sentimentInfo?: IEpisodeSentiment;
  firstSceneId?: Types.ObjectId;
  // Fields ที่จะถูกเพิ่มหลังจาก query และ toObject
  effectivePrice?: number;
  originalPrice?: number;
  slug?: string; // episodeOrder.toString()
  episodeUrl?: string; // จาก virtual ของ EpisodeModel
}

// อินเทอร์เฟซหลักสำหรับข้อมูลนิยายที่ถูก populate
export interface PopulatedNovelForDetailPage {
  _id: Types.ObjectId; // เก็บเป็น ObjectId ก่อน toObject
  title: string;
  slug: string;
  author: PopulatedAuthorForDetailPage | null;
  coAuthors?: PopulatedAuthorForDetailPage[];
  synopsis: string;
  longDescription?: string;
  coverImageUrl?: string;
  bannerImageUrl?: string;
  themeAssignment: {
    mainTheme: {
      categoryId: PopulatedCategoryForDetailPage | null;
      customName?: string;
    };
    subThemes?: Array<{
      categoryId: PopulatedCategoryForDetailPage | null;
      customName?: string;
    }>;
    moodAndTone?: PopulatedCategoryForDetailPage[];
    contentWarnings?: PopulatedCategoryForDetailPage[];
    customTags?: string[];
  };
  narrativeFocus?: {
    narrativePacingTags?: PopulatedCategoryForDetailPage[];
    primaryConflictTypes?: PopulatedCategoryForDetailPage[];
    narrativePerspective?: PopulatedCategoryForDetailPage | null;
    storyArcStructure?: PopulatedCategoryForDetailPage | null;
    artStyle?: PopulatedCategoryForDetailPage | null;
    gameplayMechanics?: PopulatedCategoryForDetailPage[];
    interactivityLevel?: PopulatedCategoryForDetailPage | null;
    playerAgencyLevel?: PopulatedCategoryForDetailPage | null;
    lengthTag?: PopulatedCategoryForDetailPage | null;
    commonTropes?: PopulatedCategoryForDetailPage[];
    targetAudienceProfileTags?: PopulatedCategoryForDetailPage[];
    avoidIfYouDislikeTags?: PopulatedCategoryForDetailPage[];
  };
  worldBuildingDetails?: IWorldBuildingDetails;
  ageRatingCategoryId?: PopulatedCategoryForDetailPage | null;
  status: NovelStatus;
  accessLevel: NovelAccessLevel;
  isCompleted: boolean;
  endingType: NovelEndingType;
  sourceType: ISourceType;
  language: PopulatedCategoryForDetailPage | null;
  firstEpisodeId?: Types.ObjectId | null;
  totalEpisodesCount: number;
  publishedEpisodesCount: number;
  stats: INovelStats;
  monetizationSettings: IMonetizationSettings;
  psychologicalAnalysisConfig: IPsychologicalAnalysisConfig;
  collaborationSettings?: ICollaborationSettings;
  isFeatured?: boolean;
  publishedAt?: Date;
  scheduledPublicationDate?: Date;
  lastContentUpdatedAt: Date;
  updatedAt: Date;
  createdAt: Date;
  relatedNovels?: Array<
    Pick<INovel, "_id" | "title" | "slug" | "coverImageUrl"> & {
      author: Pick<PopulatedAuthorForDetailPage, "_id" | "username" | "profile"> | null;
    }
  >;
  seriesId?: Types.ObjectId;
  // Virtual fields (ที่ถูกเพิ่มโดย toObject({ virtuals: true }) ของ NovelModel)
  novelUrl?: string;
  isNewRelease?: boolean;
  currentEpisodePriceCoins?: number; // จาก virtual ของ NovelModel
  // Populated lists (จะถูกเพิ่มเข้าไปใน object ทีหลัง)
  charactersList?: PopulatedCharacterForDetailPage[];
  episodesList?: PopulatedEpisodeForDetailPage[];
  firstEpisodeSlug?: string;
}

// ==================================================================================================
// SECTION: API Route Handler (GET)
// ==================================================================================================

const commonCategorySelect = "_id name slug description categoryType iconUrl color localizations";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = await params.slug;

  if (!slug || typeof slug !== "string" || !slug.trim()) {
    return NextResponse.json(
      { message: "Slug ไม่ถูกต้องหรือไม่ถูกระบุ" },
      { status: 400 }
    );
  }

  try {
    await dbConnect();
    console.log(`🔗 [API /novels/${slug}] เชื่อมต่อฐานข้อมูลสำเร็จ`);

    // Query นิยาย
    const novelDoc = await NovelModel.findOne({
      slug: slug.trim(), // Trim slug ที่รับเข้ามา
      isDeleted: { $ne: true },
      // status: { $in: [NovelStatus.PUBLISHED, NovelStatus.COMPLETED] } // พิจารณาว่าต้องการแสดง DRAFT หรือไม่
    })
      .populate<Pick<INovel, "author">>({
        path: "author",
        model: UserModel,
        select: "username profile.displayName profile.penName profile.avatarUrl profile.bio profile.websiteUrl roles",
      })
      .populate<Pick<INovel, "coAuthors">>({ // Populate coAuthors
        path: "coAuthors",
        model: UserModel,
        select: "username profile.displayName profile.penName profile.avatarUrl roles",
      })
      .populate<Pick<INovel, "ageRatingCategoryId">>({
        path: "ageRatingCategoryId",
        model: CategoryModel,
        select: commonCategorySelect,
      })
      .populate<Pick<INovel, "language">>({
        path: "language",
        model: CategoryModel,
        select: commonCategorySelect,
      })
      // ThemeAssignment
      .populate<{ themeAssignment: { mainTheme: { categoryId: ICategory } } }>({
        path: "themeAssignment.mainTheme.categoryId",
        model: CategoryModel,
        select: commonCategorySelect,
      })
      .populate<{ themeAssignment: { subThemes: Array<{ categoryId: ICategory }> } }>({
        path: "themeAssignment.subThemes.categoryId",
        model: CategoryModel,
        select: commonCategorySelect,
      })
      .populate<{ themeAssignment: { moodAndTone: ICategory[] } }>({
        path: "themeAssignment.moodAndTone",
        model: CategoryModel,
        select: commonCategorySelect,
      })
      .populate<{ themeAssignment: { contentWarnings: ICategory[] } }>({
        path: "themeAssignment.contentWarnings",
        model: CategoryModel,
        select: commonCategorySelect,
      })
      // NarrativeFocus
      .populate<{ narrativeFocus: { narrativePacingTags: ICategory[] } }>({ path: "narrativeFocus.narrativePacingTags", model: CategoryModel, select: commonCategorySelect })
      .populate<{ narrativeFocus: { primaryConflictTypes: ICategory[] } }>({ path: "narrativeFocus.primaryConflictTypes", model: CategoryModel, select: commonCategorySelect })
      .populate<{ narrativeFocus: { narrativePerspective: ICategory } }>({ path: "narrativeFocus.narrativePerspective", model: CategoryModel, select: commonCategorySelect })
      .populate<{ narrativeFocus: { storyArcStructure: ICategory } }>({ path: "narrativeFocus.storyArcStructure", model: CategoryModel, select: commonCategorySelect })
      .populate<{ narrativeFocus: { artStyle: ICategory } }>({ path: "narrativeFocus.artStyle", model: CategoryModel, select: commonCategorySelect })
      .populate<{ narrativeFocus: { gameplayMechanics: ICategory[] } }>({ path: "narrativeFocus.gameplayMechanics", model: CategoryModel, select: commonCategorySelect })
      .populate<{ narrativeFocus: { interactivityLevel: ICategory } }>({ path: "narrativeFocus.interactivityLevel", model: CategoryModel, select: commonCategorySelect })
      .populate<{ narrativeFocus: { playerAgencyLevel: ICategory } }>({ path: "narrativeFocus.playerAgencyLevel", model: CategoryModel, select: commonCategorySelect })
      .populate<{ narrativeFocus: { lengthTag: ICategory } }>({ path: "narrativeFocus.lengthTag", model: CategoryModel, select: commonCategorySelect })
      .populate<{ narrativeFocus: { commonTropes: ICategory[] } }>({ path: "narrativeFocus.commonTropes", model: CategoryModel, select: commonCategorySelect })
      .populate<{ narrativeFocus: { targetAudienceProfileTags: ICategory[] } }>({ path: "narrativeFocus.targetAudienceProfileTags", model: CategoryModel, select: commonCategorySelect })
      .populate<{ narrativeFocus: { avoidIfYouDislikeTags: ICategory[] } }>({ path: "narrativeFocus.avoidIfYouDislikeTags", model: CategoryModel, select: commonCategorySelect })
      // Related Novels
      .populate<Pick<INovel, "relatedNovels">>({
        path: "relatedNovels",
        model: NovelModel,
        select: "_id title slug coverImageUrl author",
        populate: {
          path: "author",
          model: UserModel,
          select: "_id username profile.displayName profile.penName profile.avatarUrl",
        },
      })
      .exec();

    if (!novelDoc) {
      console.warn(`⚠️ [API /novels/${slug}] ไม่พบนิยายสำหรับ slug: "${slug}"`);
      return NextResponse.json({ message: "ไม่พบนิยาย" }, { status: 404 });
    }
    console.log(`✅ [API /novels/${slug}] พบนิยาย: "${novelDoc.title}" (ID: ${novelDoc._id})`);

    // แปลง Mongoose Document เป็น Plain Object (สำคัญมากสำหรับ virtuals และ getters)
    // .toObject() จะแปลง ObjectId เป็น string โดยอัตโนมัติสำหรับ _id field
    // แต่เราต้องการให้ _id ของ novel ยังเป็น ObjectId ใน PopulatedNovelForDetailPage
    // ดังนั้นจะแปลง field อื่นๆ ที่เป็น ObjectId ไปเป็น string ในขั้นตอนสุดท้าย
    const novelObject = novelDoc.toObject({
      virtuals: true, // เพื่อให้ virtual fields เช่น novelUrl, currentEpisodePriceCoins ทำงาน
      getters: true, // เพื่อให้ getters ทำงาน (ถ้ามี)
      transform: (doc, ret) => {
        // แปลง _id ของ sub-documents หรือ populated fields ที่เป็น ObjectId เป็น string หากจำเป็น
        // แต่สำหรับ _id หลักของ Novel, Character, Episode เราจะจัดการในขั้นตอนการสร้าง response
        // ret._id = doc._id.toString(); // ตัวอย่างการแปลง _id หลัก
        return ret;
      }
    }) as unknown as PopulatedNovelForDetailPage; // Cast type ให้ตรงกับที่คาดหวัง


    // ดึงข้อมูลตัวละคร
    const charactersListRaw = await CharacterModel.find({
      novelId: novelDoc._id, // ใช้ novelDoc._id ที่ยังเป็น ObjectId
      isArchived: { $ne: true },
    })
      .select(
        "name characterCode roleInStory customRoleDetails description profileImageMediaId profileImageSourceType expressions defaultExpressionId physicalAttributes personalityTraits voiceActorInfo stats colorTheme"
      )
      .limit(50)
      .lean({ virtuals: true, getters: true }); // ใช้ lean เพื่อ performance และให้ virtuals ทำงาน

    // lean({ virtuals: true }) จะทำให้ profileImageUrl (virtual) ถูกรวมเข้ามา
    // และ _id จะเป็น ObjectId, เราจะแปลงเป็น string ทีหลัง
    const charactersList = charactersListRaw.map(char => ({
      ...char,
      _id: char._id.toString(), // แปลง _id เป็น string

      // หาก profileImageMediaId เป็น ObjectId และต้องการเป็น string ก็แปลงที่นี่
      profileImageMediaId: char.profileImageMediaId instanceof Types.ObjectId ? char.profileImageMediaId.toString() : char.profileImageMediaId,
      expressions: char.expressions?.map(exp => ({
        ...exp,
        mediaId: exp.mediaId instanceof Types.ObjectId ? exp.mediaId.toString() : exp.mediaId,
        audioEffectOnDisplay: exp.audioEffectOnDisplay instanceof Types.ObjectId ? exp.audioEffectOnDisplay.toString() : exp.audioEffectOnDisplay,
      })) || [],
      stats: char.stats?.map(stat => ({
        ...stat,
        iconMediaId: stat.iconMediaId instanceof Types.ObjectId ? stat.iconMediaId.toString() : stat.iconMediaId,
      })) || [],
    })) as unknown as PopulatedCharacterForDetailPage[];
    console.log(`🎭 [API /novels/${slug}] ดึงข้อมูลตัวละครจำนวน: ${charactersList.length} ตัว`);


    // ดึงข้อมูลตอนที่เผยแพร่
    const episodesListDocs = await EpisodeModel.find({
      novelId: novelDoc._id, // ใช้ novelDoc._id ที่ยังเป็น ObjectId
      status: EpisodeStatus.PUBLISHED,
    })
      .sort({ episodeOrder: 1 })
      .select(
        "title episodeOrder status accessType publishedAt priceCoins teaserText stats.viewsCount stats.likesCount stats.commentsCount stats.totalWords stats.estimatedReadingTimeMinutes firstSceneId sentimentInfo"
      )
      .limit(200) // จำกัดจำนวนตอน
      .exec(); // ดึงเป็น Mongoose documents เพื่อเรียก instance methods

    const episodesListPromises = episodesListDocs.map(async (epDoc) => {
      const episodeObjectBase = epDoc.toObject({ virtuals: true, getters: true }); // virtual 'episodeUrl' จะถูกเพิ่มที่นี่
      return {
        ...episodeObjectBase,
        _id: epDoc._id.toString(), // แปลง _id เป็น string
        effectivePrice: await epDoc.getEffectivePrice(),
        originalPrice: await epDoc.getOriginalPrice(),
        slug: epDoc.episodeOrder.toString(), // episode slug คือ episodeOrder
        firstSceneId: epDoc.firstSceneId instanceof Types.ObjectId ? epDoc.firstSceneId.toString() : epDoc.firstSceneId,
         stats: { // ตรวจสอบให้แน่ใจว่า stats object มีโครงสร้างที่ถูกต้อง
            viewsCount: epDoc.stats?.viewsCount || 0,
            likesCount: epDoc.stats?.likesCount || 0,
            commentsCount: epDoc.stats?.commentsCount || 0,
            totalWords: epDoc.stats?.totalWords || 0,
            estimatedReadingTimeMinutes: epDoc.stats?.estimatedReadingTimeMinutes || 0,
        },
        // sentimentInfo ไม่ต้องแปลง ObjectId ภายใน
      } as PopulatedEpisodeForDetailPage;
    });

    const episodesList = (await Promise.all(episodesListPromises)).filter(ep => ep !== null) as PopulatedEpisodeForDetailPage[];
    console.log(`📖 [API /novels/${slug}] ดึงข้อมูลตอนที่เผยแพร่จำนวน: ${episodesList.length} ตอน`);

    // Helper function to transform populated category
    const transformCategory = (cat: any): PopulatedCategoryForDetailPage | null => {
        if (!cat) return null;
        if (cat instanceof mongoose.Document) {
            const catObj = cat.toObject({ virtuals: true, getters: true });
             return {
                ...catObj,
                _id: cat._id, // เก็บเป็น ObjectId ตาม Interface
                localizations: catObj.localizations?.map((loc: any) => ({
                    ...loc,
                    // ไม่ต้องแปลง _id ภายใน localizations เพราะมันเป็น _id: false
                })) || [],
            } as PopulatedCategoryForDetailPage;
        }
        // If it's already an object (e.g., from .lean() or a previous .toObject())
        return {
            ...cat,
            _id: new Types.ObjectId(cat._id), // แปลงกลับเป็น ObjectId ถ้าจำเป็น
        } as PopulatedCategoryForDetailPage;
    };
    
    const transformAuthor = (author: any): PopulatedAuthorForDetailPage | null => {
        if (!author) return null;
        if (author instanceof mongoose.Document) {
            const authorObj = author.toObject({ virtuals: true, getters: true });
            return {
                ...authorObj,
                _id: author._id, // เก็บเป็น ObjectId
            } as PopulatedAuthorForDetailPage;
        }
        return {
            ...author,
            _id: new Types.ObjectId(author._id),
        } as PopulatedAuthorForDetailPage;
    }

    // สร้าง object PopulatedNovelForDetailPage
    // novelObject มาจาก novelDoc.toObject() ซึ่งแปลง ObjectId _id เป็น string แล้ว
    // แต่ Interface PopulatedNovelForDetailPage กำหนด _id เป็น Types.ObjectId
    // เราจะใช้ novelDoc._id ที่ยังเป็น ObjectId
    const responseNovel: PopulatedNovelForDetailPage = {
        ...novelObject, // novelObject มี virtuals แล้ว
        _id: novelDoc._id, // ใช้ ObjectId ดั้งเดิม
        author: transformAuthor(novelObject.author),
        coAuthors: novelObject.coAuthors?.map(transformAuthor).filter(ca => ca !== null) as PopulatedAuthorForDetailPage[] || [],
        themeAssignment: {
            ...novelObject.themeAssignment,
            mainTheme: {
                ...novelObject.themeAssignment?.mainTheme,
                categoryId: transformCategory(novelObject.themeAssignment?.mainTheme?.categoryId),
            },
            subThemes: novelObject.themeAssignment?.subThemes?.map(st => ({
                ...st,
                categoryId: transformCategory(st.categoryId),
            })) || [],
            moodAndTone: novelObject.themeAssignment?.moodAndTone?.map(transformCategory).filter(c => c !== null) as PopulatedCategoryForDetailPage[] || [],
            contentWarnings: novelObject.themeAssignment?.contentWarnings?.map(transformCategory).filter(c => c !== null) as PopulatedCategoryForDetailPage[] || [],
        },
        narrativeFocus: novelObject.narrativeFocus ? {
            ...novelObject.narrativeFocus,
            narrativePacingTags: novelObject.narrativeFocus.narrativePacingTags?.map(transformCategory).filter(c => c !== null) as PopulatedCategoryForDetailPage[] || [],
            primaryConflictTypes: novelObject.narrativeFocus.primaryConflictTypes?.map(transformCategory).filter(c => c !== null) as PopulatedCategoryForDetailPage[] || [],
            narrativePerspective: transformCategory(novelObject.narrativeFocus.narrativePerspective),
            storyArcStructure: transformCategory(novelObject.narrativeFocus.storyArcStructure),
            artStyle: transformCategory(novelObject.narrativeFocus.artStyle),
            gameplayMechanics: novelObject.narrativeFocus.gameplayMechanics?.map(transformCategory).filter(c => c !== null) as PopulatedCategoryForDetailPage[] || [],
            interactivityLevel: transformCategory(novelObject.narrativeFocus.interactivityLevel),
            playerAgencyLevel: transformCategory(novelObject.narrativeFocus.playerAgencyLevel),
            lengthTag: transformCategory(novelObject.narrativeFocus.lengthTag),
            commonTropes: novelObject.narrativeFocus.commonTropes?.map(transformCategory).filter(c => c !== null) as PopulatedCategoryForDetailPage[] || [],
            targetAudienceProfileTags: novelObject.narrativeFocus.targetAudienceProfileTags?.map(transformCategory).filter(c => c !== null) as PopulatedCategoryForDetailPage[] || [],
            avoidIfYouDislikeTags: novelObject.narrativeFocus.avoidIfYouDislikeTags?.map(transformCategory).filter(c => c !== null) as PopulatedCategoryForDetailPage[] || [],
        } : undefined,
        ageRatingCategoryId: transformCategory(novelObject.ageRatingCategoryId),
        language: transformCategory(novelObject.language),
        relatedNovels: novelObject.relatedNovels?.map(rn => ({
            ...rn,
            _id: new Types.ObjectId(rn._id), // แปลง _id ของ relatedNovel เป็น ObjectId
            author: rn.author ? {
                ...rn.author,
                 _id: new Types.ObjectId(rn.author._id) // แปลง _id ของ author ใน relatedNovel เป็น ObjectId
            } as Pick<PopulatedAuthorForDetailPage, "_id" | "username" | "profile"> | null : null,
        })) || [],
        charactersList: charactersList, // charactersList มี _id เป็น string แล้ว
        episodesList: episodesList,     // episodesList มี _id เป็น string แล้ว
        firstEpisodeSlug: episodesList.length > 0 && episodesList[0].slug ? episodesList[0].slug : undefined,
        firstEpisodeId: novelDoc.firstEpisodeId instanceof Types.ObjectId ? novelDoc.firstEpisodeId : (novelDoc.firstEpisodeId ? new Types.ObjectId(novelDoc.firstEpisodeId) : null),
        seriesId: novelDoc.seriesId instanceof Types.ObjectId ? novelDoc.seriesId : (novelDoc.seriesId ? new Types.ObjectId(novelDoc.seriesId) : undefined),

    };
    // ตรวจสอบว่า responseNovel.author ไม่ใช่ string ก่อนส่งกลับ (ควรเป็น object หรือ null)
    if (typeof responseNovel.author === 'string') {
        console.warn(`[API /novels/${slug}] Author field was a string, attempting to re-fetch or nullify.`);
        // This indicates a problem with population or toObject transformation.
        // For safety, nullify or attempt re-fetch if critical. Here, we'll log and proceed.
        // Potentially, the populate for author failed and it fell back to just the ObjectId string.
    }


    return NextResponse.json({ novel: responseNovel });
  } catch (error: any) {
    console.error(`❌ [API /novels/${slug}] เกิดข้อผิดพลาดรุนแรง:`, error, error.stack);
    if (error instanceof mongoose.Error.CastError) {
      return NextResponse.json(
        { message: "ข้อมูล ID ไม่ถูกต้อง", details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์", error: error.message, details: error.stack },
      { status: 500 }
    );
  }
}