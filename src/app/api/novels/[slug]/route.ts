// src/app/api/novels/[slug]/route.ts
import mongoose, { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb"; // Utility for connecting to MongoDB
import NovelModel, {
  INovel,
  NovelStatus,
  IThemeAssignment,
  INarrativeFocus,
  ISourceType,
  INovelStats,
  IMonetizationSettings,
  IWorldBuildingDetails,
  IPsychologicalAnalysisConfig,
  ICollaborationSettings,
} from "@/backend/models/Novel"; // Novel model and its interfaces
import UserModel, { IUser, IUserProfile } from "@/backend/models/User"; // User model and its interfaces
import CategoryModel, { ICategory, CategoryType, ICategoryLocalization } from "@/backend/models/Category"; // Category model and its interfaces
import CharacterModel, {
  ICharacter,
  CharacterRoleInStory,
  ICharacterExpression,
  IPhysicalAttributes,
  IPersonalityTraits,
  IVoiceActorInfo,
  ICharacterStat,
} from "@/backend/models/Character"; // Character model and its interfaces
import EpisodeModel, {
  IEpisode,
  EpisodeStatus,
  EpisodeAccessType,
  IEpisodeStats,
  IEpisodeSentiment,
} from "@/backend/models/Episode"; // Episode model and its interfaces

// ==================================================================================================
// SECTION: อินเทอร์เฟซสำหรับข้อมูลที่ Populate เพื่อใช้ในหน้าแสดงรายละเอียดนิยาย
// ==================================================================================================

// อินเทอร์เฟซสำหรับผู้เขียนที่ถูก Populate (ขยายจาก PopulatedAuthor ใน NovelCard)
export interface PopulatedAuthorForDetailPage {
  _id: Types.ObjectId;
  username?: string;
  profile?: Pick<
    IUserProfile,
    "displayName" | "penName" | "avatarUrl" | "bio" | "websiteUrl"
  >;
  // เพิ่มเติม fields อื่นๆ ของ User ที่อาจจำเป็น เช่น roles
  roles?: IUser["roles"];
}

// อินเทอร์เฟซสำหรับหมวดหมู่ที่ถูก Populate (เหมือนกับ ICategory)
export type PopulatedCategoryForDetailPage = ICategory;

// อินเทอร์เฟซสำหรับตัวละครที่ถูก Populate (เลือก field ที่จำเป็นสำหรับหน้ารายละเอียด)
export interface PopulatedCharacterForDetailPage {
  _id: Types.ObjectId;
  name: string;
  characterCode: string;
  profileImageUrl?: string; // Virtual field จาก CharacterModel
  profileImageMediaId?: Types.ObjectId; // Field จริง
  profileImageSourceType?: "Media" | "OfficialMedia"; // Field จริง
  roleInStory?: CharacterRoleInStory;
  customRoleDetails?: string;
  description?: string; // คำอธิบายสั้นๆ ของตัวละคร
  expressions?: Types.DocumentArray<ICharacterExpression>; // อาจจะแสดง default expression
  defaultExpressionId?: string;
  // เพิ่ม fields อื่นๆตามความต้องการของหน้าแสดงรายละเอียดตัวละคร
  physicalAttributes?: IPhysicalAttributes;
  personalityTraits?: IPersonalityTraits;
  voiceActorInfo?: IVoiceActorInfo;
  stats?: Types.DocumentArray<ICharacterStat>;
  colorTheme?: string;
}

// อินเทอร์เฟซสำหรับตอนที่ถูก Populate (เลือก field ที่จำเป็นสำหรับรายการตอนในหน้ารายละเอียด)
export interface PopulatedEpisodeForDetailPage {
  _id: Types.ObjectId;
  title: string;
  episodeOrder: number;
  status: EpisodeStatus;
  accessType: EpisodeAccessType;
  publishedAt?: Date;
  priceCoins?: number; // ราคาเฉพาะตอน
  teaserText?: string;
  stats: Pick<IEpisodeStats, "viewsCount" | "likesCount" | "commentsCount" | "totalWords" | "estimatedReadingTimeMinutes" >;
  sentimentInfo?: IEpisodeSentiment;
  // เพิ่ม field อื่นๆ ตามความจำเป็น เช่น firstSceneId ถ้าต้องการ link ไปยัง scene แรก
  firstSceneId?: Types.ObjectId;
  effectivePrice?: number; // ราคาที่คำนวณแล้ว (เพิ่มเข้ามา)
  originalPrice?: number; // ราคาดั้งเดิม (เพิ่มเข้ามา)
}

// อินเทอร์เฟซหลักสำหรับข้อมูลนิยายที่ถูก populate อย่างละเอียดสำหรับหน้าแสดงรายละเอียด
// Interface นี้จะถูก export และ import ไปใช้ใน page.tsx
export interface PopulatedNovelForDetailPage {
  [x: string]: any;
  _id: Types.ObjectId;
  title: string;
  slug: string;
  author: PopulatedAuthorForDetailPage | null; // ผู้เขียนที่ถูก populate
  coAuthors?: PopulatedAuthorForDetailPage[]; // ผู้เขียนร่วม (ถ้ามี)
  synopsis: string;
  longDescription?: string;
  coverImageUrl?: string;
  bannerImageUrl?: string;
  themeAssignment: {
    mainTheme: {
      categoryId: PopulatedCategoryForDetailPage | null; // หมวดหมู่หลักของธีมที่ถูก populate
      customName?: string;
    };
    subThemes?: Array<{
      categoryId: PopulatedCategoryForDetailPage | null; // หมวดหมู่รองของธีมที่ถูก populate
      customName?: string;
    }>;
    moodAndTone?: PopulatedCategoryForDetailPage[]; // อารมณ์และโทนที่ถูก populate
    contentWarnings?: PopulatedCategoryForDetailPage[]; // คำเตือนเนื้อหาที่ถูก populate
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
  ageRatingCategoryId?: PopulatedCategoryForDetailPage | null; // กลุ่มอายุผู้อ่านที่ถูก populate
  status: NovelStatus;
  accessLevel: INovel["accessLevel"];
  isCompleted: boolean;
  endingType: INovel["endingType"];
  sourceType: ISourceType;
  languageCategory: PopulatedCategoryForDetailPage | null; // ภาษาที่ถูก populate (เปลี่ยนชื่อจาก language เป็น languageCategory เพื่อความชัดเจน)
  firstEpisodeId?: Types.ObjectId | null; // อ้างอิงตอนแรก (อาจ populate เพิ่มเติมถ้าจำเป็น)
  totalEpisodesCount: number;
  publishedEpisodesCount: number;
  stats: INovelStats; // สถิตินิยาย
  monetizationSettings: IMonetizationSettings;
  psychologicalAnalysisConfig: IPsychologicalAnalysisConfig;
  collaborationSettings?: ICollaborationSettings;
  isFeatured?: boolean;
  publishedAt?: Date; // วันที่เผยแพร่นิยายครั้งแรก (จาก NovelModel)
  scheduledPublicationDate?: Date;
  lastContentUpdatedAt: Date; // วันที่อัปเดตเนื้อหาล่าสุด (จาก NovelModel)
  updatedAt: Date; // วันที่อัปเดต document ล่าสุด (จาก Mongoose timestamp)
  createdAt: Date; // วันที่สร้าง document (จาก Mongoose timestamp)
  relatedNovels?: Array<
    Pick<INovel, "_id" | "title" | "slug" | "coverImageUrl"> & {
      author: Pick<PopulatedAuthorForDetailPage, "_id" | "username" | "profile"> | null;
    }
  >; // นิยายที่เกี่ยวข้อง (populate แบบจำกัด field)
  seriesId?: Types.ObjectId; // (อาจ populate ถ้ามี Series Model)

  // Virtuals ที่อาจใช้จาก NovelModel
  novelUrl?: string;
  isNewRelease?: boolean;
  currentEpisodePriceCoins?: number; // ราคาต่อตอนปัจจุบันตามนโยบายนิยาย

  // Fields ที่เพิ่มเข้ามาจากการ query เพิ่มเติม
  charactersList?: PopulatedCharacterForDetailPage[]; // รายชื่อตัวละครที่เกี่ยวข้อง
  episodesList?: PopulatedEpisodeForDetailPage[]; // รายชื่อตอนที่เผยแพร่ (อาจจะมี pagination)
}

// ==================================================================================================
// SECTION: API Route Handler (GET)
// ==================================================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  // 1. ตรวจสอบ Slug
  if (!slug || typeof slug !== "string" || !slug.trim()) {
    return NextResponse.json(
      { message: "Slug ไม่ถูกต้องหรือไม่ถูกระบุ" },
      { status: 400 }
    );
  }

  try {
    // 2. เชื่อมต่อฐานข้อมูล
    await dbConnect();
    console.log(`🔗 [API /novels/${slug}] เชื่อมต่อฐานข้อมูลสำเร็จ`);

    // 3. ค้นหานิยายด้วย Slug
    // Query เฉพาะนิยายที่ยังไม่ถูกลบ และมีสถานะเป็น published หรือ completed
    // (ปรับ status ตามความเหมาะสม หากต้องการให้ admin หรือ author เห็นสถานะอื่น)
    const novelQuery = NovelModel.findOne({
      slug: slug,
      isDeleted: { $ne: true },
      // status: { $in: [NovelStatus.PUBLISHED, NovelStatus.COMPLETED] } // พิจารณาปลด comment หากต้องการให้เห็นเฉพาะที่เผยแพร่แล้ว
    })
      // Populate ข้อมูลผู้เขียน
      .populate<Pick<INovel, "author">>({
        path: "author",
        model: UserModel, // ระบุ Model ให้ชัดเจน
        select: "username profile roles", // เลือก fields ที่ต้องการจาก User profile
      })
      // Populate หมวดหมู่อายุ
      .populate<Pick<INovel, "ageRatingCategoryId">>({
        path: "ageRatingCategoryId",
        model: CategoryModel, // ระบุ Model ให้ชัดเจน
      })
      // Populate ภาษา
      .populate<Pick<INovel, "language">>({
        path: "language", // ชื่อ field ใน NovelSchema คือ "language"
        model: CategoryModel, // ระบุ Model ให้ชัดเจน
      })
      // Populate ธีมหลัก (Main Theme)
      .populate<{ themeAssignment: { mainTheme: { categoryId: ICategory } } }>({
        path: "themeAssignment.mainTheme.categoryId",
        model: CategoryModel,
      })
      // Populate ธีมรอง (Sub-Themes)
      .populate<{ themeAssignment: { subThemes: Array<{ categoryId: ICategory }> } }>({
        path: "themeAssignment.subThemes.categoryId",
        model: CategoryModel,
      })
      // Populate อารมณ์และโทน (Mood and Tone)
      .populate<{ themeAssignment: { moodAndTone: ICategory[] } }>({
        path: "themeAssignment.moodAndTone",
        model: CategoryModel,
      })
      // Populate คำเตือนเนื้อหา (Content Warnings)
      .populate<{ themeAssignment: { contentWarnings: ICategory[] } }>({
        path: "themeAssignment.contentWarnings",
        model: CategoryModel,
      })
      // Populate Fields ใน Narrative Focus
      .populate<{ narrativeFocus: { narrativePacingTags: ICategory[] } }>({
        path: "narrativeFocus.narrativePacingTags",
        model: CategoryModel,
      })
      .populate<{ narrativeFocus: { primaryConflictTypes: ICategory[] } }>({
        path: "narrativeFocus.primaryConflictTypes",
        model: CategoryModel,
      })
      .populate<{ narrativeFocus: { narrativePerspective: ICategory } }>({
        path: "narrativeFocus.narrativePerspective",
        model: CategoryModel,
      })
      .populate<{ narrativeFocus: { storyArcStructure: ICategory } }>({
        path: "narrativeFocus.storyArcStructure",
        model: CategoryModel,
      })
      .populate<{ narrativeFocus: { artStyle: ICategory } }>({
        path: "narrativeFocus.artStyle",
        model: CategoryModel,
      })
      .populate<{ narrativeFocus: { gameplayMechanics: ICategory[] } }>({
        path: "narrativeFocus.gameplayMechanics",
        model: CategoryModel,
      })
      .populate<{ narrativeFocus: { interactivityLevel: ICategory } }>({
        path: "narrativeFocus.interactivityLevel",
        model: CategoryModel,
      })
      .populate<{ narrativeFocus: { playerAgencyLevel: ICategory } }>({
        path: "narrativeFocus.playerAgencyLevel",
        model: CategoryModel,
      })
      .populate<{ narrativeFocus: { lengthTag: ICategory } }>({
        path: "narrativeFocus.lengthTag",
        model: CategoryModel,
      })
      .populate<{ narrativeFocus: { commonTropes: ICategory[] } }>({
        path: "narrativeFocus.commonTropes",
        model: CategoryModel,
      })
      .populate<{ narrativeFocus: { targetAudienceProfileTags: ICategory[] } }>({
        path: "narrativeFocus.targetAudienceProfileTags",
        model: CategoryModel,
      })
      .populate<{ narrativeFocus: { avoidIfYouDislikeTags: ICategory[] } }>({
        path: "narrativeFocus.avoidIfYouDislikeTags",
        model: CategoryModel,
      })
      // Populate นิยายที่เกี่ยวข้อง (Related Novels) - เลือก fields ที่จำเป็น
      .populate<Pick<INovel, "relatedNovels">>({
          path: "relatedNovels",
          model: NovelModel,
          select: "_id title slug coverImageUrl author",
          populate: { // Nested populate สำหรับ author ของ relatedNovels
              path: "author",
              model: UserModel,
              select: "_id username profile.displayName profile.penName profile.avatarUrl"
          }
      });


    const novelData = await novelQuery.exec(); // Execute query to get the novel document

    // 4. ตรวจสอบว่าพบนิยายหรือไม่
    if (!novelData) {
      console.warn(`⚠️ [API /novels/${slug}] ไม่พบนิยายสำหรับ slug: "${slug}"`);
      return NextResponse.json({ message: "ไม่พบนิยาย" }, { status: 404 });
    }
    console.log(`✅ [API /novels/${slug}] พบนิยาย: "${novelData.title}"`);

    // แปลง novelData (Mongoose Document) เป็น Plain Object ก่อนที่จะเพิ่ม field อื่นๆ
    // เพื่อให้ virtuals ทำงาน และสามารถเพิ่ม property ใหม่ได้
    let novelObject = novelData.toObject({ virtuals: true, getters: true }) as any;


    // 5. ดึงข้อมูลตัวละครที่เกี่ยวข้อง (Characters)
    const charactersListRaw = await CharacterModel.find({
      novelId: novelObject._id,
      isArchived: { $ne: true },
    })
      .select(
        "name characterCode roleInStory customRoleDetails description profileImageMediaId profileImageSourceType expressions defaultExpressionId physicalAttributes personalityTraits voiceActorInfo stats colorTheme"
      )
      .limit(50) // จำกัดจำนวนตัวละคร (ปรับตามความเหมาะสม)
      .exec();

    const charactersList = charactersListRaw.map(char =>
        char.toObject({ virtuals: true, getters: true }) as PopulatedCharacterForDetailPage
    );
    console.log(`🎭 [API /novels/${slug}] ดึงข้อมูลตัวละครจำนวน: ${charactersList.length} ตัว`);


    // 6. ดึงข้อมูลตอนที่เผยแพร่แล้ว (Episodes)
    const episodesListRaw = await EpisodeModel.find({
      novelId: novelObject._id,
      status: EpisodeStatus.PUBLISHED, // ดึงเฉพาะตอนที่เผยแพร่แล้ว
    })
      .sort({ episodeOrder: 1 }) // เรียงตามลำดับตอน
      .select(
        "title episodeOrder status accessType publishedAt priceCoins teaserText stats.viewsCount stats.likesCount stats.commentsCount stats.totalWords stats.estimatedReadingTimeMinutes firstSceneId sentimentInfo"
      )
      .limit(200) // จำกัดจำนวนตอน (ปรับตามความเหมาะสม)
      .exec();

    // คำนวณ effectivePrice และ originalPrice สำหรับแต่ละตอน
    const episodesListPromises = episodesListRaw.map(async (epDoc) => {
        const episodeObject = epDoc.toObject({ virtuals: true, getters: true }) as PopulatedEpisodeForDetailPage;
        // เรียก method getEffectivePrice และ getOriginalPrice
        // เนื่องจาก method เหล่านี้เป็น async และอาจ query NovelModel, เราต้อง await มัน
        // เราส่ง NovelModel instance เข้าไปใน method ของ Episode ไม่ได้โดยตรง
        // แต่ method ใน EpisodeSchema ถูกออกแบบมาให้ query NovelModel เอง
        // ที่สำคัญคือ epDoc ต้องเป็น Mongoose document ที่ hydrated (ไม่ใช่ lean object)
        episodeObject.effectivePrice = await epDoc.getEffectivePrice();
        episodeObject.originalPrice = await epDoc.getOriginalPrice();
        return episodeObject;
    });

    const episodesList = await Promise.all(episodesListPromises);

    console.log(`📖 [API /novels/${slug}] ดึงข้อมูลตอนที่เผยแพร่จำนวน: ${episodesList.length} ตอน`);

    // 7. สร้าง object PopulatedNovelForDetailPage
    // สังเกต: field 'language' จาก INovel ถูก map ไปเป็น 'languageCategory' ใน PopulatedNovelForDetailPage
    // เพื่อให้ชื่อ field สื่อถึงการเป็น Category object ที่ถูก populate แล้ว
    const responseNovel: PopulatedNovelForDetailPage = {
      ...novelObject, // ใช้ novelObject ที่ผ่าน toObject() แล้ว
      languageCategory: novelObject.language as PopulatedCategoryForDetailPage | null, // Cast และเปลี่ยนชื่อ field
      charactersList: charactersList,
      episodesList: episodesList,
      // ตรวจสอบว่า author, mainTheme.categoryId, etc. ถูก populate มาเป็น object จริงๆ
      // ถ้าเป็น ObjectId เฉยๆ แสดงว่า populate ผิดพลาด หรือไม่ได้ระบุ path ถูกต้อง
      author: novelObject.author as PopulatedAuthorForDetailPage | null,
      themeAssignment: {
          ...novelObject.themeAssignment,
          mainTheme: {
              ...novelObject.themeAssignment?.mainTheme,
              categoryId: novelObject.themeAssignment?.mainTheme?.categoryId as PopulatedCategoryForDetailPage | null,
          },
          subThemes: novelObject.themeAssignment?.subThemes?.map((st: any) => ({
              ...st,
              categoryId: st.categoryId as PopulatedCategoryForDetailPage | null,
          })) || [],
          moodAndTone: novelObject.themeAssignment?.moodAndTone as PopulatedCategoryForDetailPage[] || [],
          contentWarnings: novelObject.themeAssignment?.contentWarnings as PopulatedCategoryForDetailPage[] || [],
      },
      narrativeFocus: novelObject.narrativeFocus ? {
          narrativePacingTags: novelObject.narrativeFocus.narrativePacingTags as PopulatedCategoryForDetailPage[] || [],
          primaryConflictTypes: novelObject.narrativeFocus.primaryConflictTypes as PopulatedCategoryForDetailPage[] || [],
          narrativePerspective: novelObject.narrativeFocus.narrativePerspective as PopulatedCategoryForDetailPage || null,
          storyArcStructure: novelObject.narrativeFocus.storyArcStructure as PopulatedCategoryForDetailPage || null,
          artStyle: novelObject.narrativeFocus.artStyle as PopulatedCategoryForDetailPage || null,
          gameplayMechanics: novelObject.narrativeFocus.gameplayMechanics as PopulatedCategoryForDetailPage[] || [],
          interactivityLevel: novelObject.narrativeFocus.interactivityLevel as PopulatedCategoryForDetailPage || null,
          playerAgencyLevel: novelObject.narrativeFocus.playerAgencyLevel as PopulatedCategoryForDetailPage || null,
          lengthTag: novelObject.narrativeFocus.lengthTag as PopulatedCategoryForDetailPage || null,
          commonTropes: novelObject.narrativeFocus.commonTropes as PopulatedCategoryForDetailPage[] || [],
          targetAudienceProfileTags: novelObject.narrativeFocus.targetAudienceProfileTags as PopulatedCategoryForDetailPage[] || [],
          avoidIfYouDislikeTags: novelObject.narrativeFocus.avoidIfYouDislikeTags as PopulatedCategoryForDetailPage[] || [],
      } : undefined,
      ageRatingCategoryId: novelObject.ageRatingCategoryId as PopulatedCategoryForDetailPage | null,
      // Ensure relatedNovels and their authors are correctly typed
      relatedNovels: novelObject.relatedNovels?.map((rn: any) => ({
          ...rn,
          author: rn.author as Pick<PopulatedAuthorForDetailPage, "_id" | "username" | "profile"> | null,
      })) || [],
    };


    // 8. ส่งข้อมูลกลับ
    return NextResponse.json({ novel: responseNovel });

  } catch (error: any) {
    console.error(`❌ [API /novels/${slug}] เกิดข้อผิดพลาดรุนแรง:`, error);
    // ตรวจสอบชนิดของ error เพื่อให้ response ที่เหมาะสม
    if (error instanceof mongoose.Error.CastError) {
      return NextResponse.json(
        { message: "ข้อมูล ID ไม่ถูกต้อง", details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์", error: error.message },
      { status: 500 }
    );
  }
}