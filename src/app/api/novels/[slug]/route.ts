// src/app/api/novels/[slug]/route.ts
import { NextResponse } from 'next/server';
import mongoose, { Types } from 'mongoose';
import dbConnect from '@/backend/lib/mongodb'; // ปรับ path ตามโครงสร้างโปรเจกต์ของคุณ
import NovelModel, { INovel, NovelStatus, IThemeAssignment, INarrativeFocus, ISourceType, INovelStats } from '@/backend/models/Novel'; //
import UserModel, { IUser, IUserProfile } from '@/backend/models/User'; //
import CategoryModel, { ICategory, CategoryType, ICategoryLocalization } from '@/backend/models/Category'; //
import EpisodeModel, { IEpisode, EpisodeStatus } from '@/backend/models/Episode'; //
import CharacterModel, { ICharacter, ICharacterExpression, CharacterRoleInStory } from '@/backend/models/Character'; //

// ==================================================================================================
// SECTION: Populated Interfaces (Type Definitions for API Response)
// ==================================================================================================

/**
 * @interface PopulatedAuthorForDetailPage
 * @description ข้อมูลผู้เขียนที่ถูก populate บางส่วนสำหรับหน้าแสดงรายละเอียดนิยาย
 */
export interface PopulatedAuthorForDetailPage extends Pick<IUser, '_id' | 'username'> {
  profile?: Pick<IUserProfile, 'displayName' | 'penName' | 'avatarUrl'>;
}

/**
 * @interface PopulatedCategoryForDetailPage
 * @description ข้อมูลหมวดหมู่ที่ถูก populate บางส่วนสำหรับหน้าแสดงรายละเอียดนิยาย
 */
export interface PopulatedCategoryForDetailPage extends Pick<ICategory, '_id' | 'name' | 'slug' | 'iconUrl' | 'color' | 'description' | 'categoryType'> {
  localizations?: ICategoryLocalization[];
}

/**
 * @interface PopulatedEpisodeForDetailPage
 * @description ข้อมูลตอนนิยายที่ถูก populate บางส่วน (เช่น สำหรับ firstEpisodeId)
 */
export interface PopulatedEpisodeForDetailPage extends Pick<IEpisode, '_id' | 'title' | 'episodeOrder' | 'status' | 'accessType' | 'publishedAt'> {}

/**
 * @interface PopulatedCharacterForDetailPage
 * @description ข้อมูลตัวละครที่ถูก populate บางส่วนสำหรับแสดงในหน้ารายละเอียดนิยาย
 */
export interface PopulatedCharacterForDetailPage extends Pick<ICharacter, '_id' | 'name' | 'characterCode' | 'roleInStory' | 'profileImageUrl' | 'description'> {
  // สามารถเพิ่ม field อื่นๆ ที่ NovelCharactersSection อาจต้องการ
  // expressions?: Pick<ICharacterExpression, 'expressionId' | 'name' | 'mediaId'>[]; // ตัวอย่าง
}

/**
 * @interface PopulatedThemeAssignmentForDetailPage
 * @description โครงสร้าง ThemeAssignment ที่มี Category ถูก populate สำหรับ API response
 */
export interface PopulatedThemeAssignmentForDetailPage {
  mainTheme?: {
    categoryId: PopulatedCategoryForDetailPage | null; // Populated category object or null
    customName?: string;
  };
  subThemes?: Array<{
    categoryId: PopulatedCategoryForDetailPage | null;
    customName?: string;
  }>;
  moodAndTone?: PopulatedCategoryForDetailPage[];
  contentWarnings?: PopulatedCategoryForDetailPage[];
  customTags?: string[];
}

/**
 * @interface PopulatedNarrativeFocusForDetailPage
 * @description โครงสร้าง NarrativeFocus ที่มี Category ถูก populate สำหรับ API response
 */
export interface PopulatedNarrativeFocusForDetailPage {
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
}

/**
 * @interface PopulatedSourceTypeForDetailPage
 * @description โครงสร้าง SourceType ที่มี Category ถูก populate สำหรับ API response
 */
export interface PopulatedSourceTypeForDetailPage extends Pick<ISourceType, 'type' | 'originalWorkTitle' | 'originalWorkAuthor' | 'permissionDetails'> {
  fandomCategoryId?: PopulatedCategoryForDetailPage | null;
  originalWorkLanguage?: PopulatedCategoryForDetailPage | null;
}

/**
 * @interface PopulatedNovelForDetailPage
 * @description โครงสร้างข้อมูลนิยายหลักที่ API จะส่งกลับไปสำหรับหน้าแสดงรายละเอียด
 * ประกอบด้วยข้อมูลพื้นฐานของนิยาย และ field ที่ถูก populate เช่น author, categories, characters
 */
export interface PopulatedNovelForDetailPage extends Omit<INovel,
  // Fields ที่จะถูกแทนที่ด้วย version ที่ populate แล้ว หรือไม่ต้องการใน response นี้
  'author' | 'coAuthors' | 'themeAssignment' | 'narrativeFocus' |
  'ageRatingCategoryId' | 'sourceType' | 'language' | 'firstEpisodeId' |
  'relatedNovels' | 'seriesId' | 'deletedByUserId' | 'adminNotes'
> {
  // Fields ที่ populate หรือปรับโครงสร้าง
  author: PopulatedAuthorForDetailPage | null;
  coAuthors?: PopulatedAuthorForDetailPage[];
  themeAssignment: PopulatedThemeAssignmentForDetailPage;
  narrativeFocus?: PopulatedNarrativeFocusForDetailPage;
  ageRatingCategoryId?: PopulatedCategoryForDetailPage | null;
  sourceType: PopulatedSourceTypeForDetailPage;
  language: PopulatedCategoryForDetailPage | null; // language field จาก INovel จะถูก populate เป็น object นี้
  firstEpisodeId?: PopulatedEpisodeForDetailPage | Pick<IEpisode, '_id'> | null; // สามารถเป็น object เต็มหรือแค่ ID

  // Fields ที่เพิ่มเข้ามาเพื่อความสะดวกของ Frontend (สำหรับ generateMetadata)
  firstPublishedAt?: string | null; // มาจาก novel.publishedAt
  mainThemeCategory?: PopulatedCategoryForDetailPage | null; // Convenience access
  subThemeCategories?: PopulatedCategoryForDetailPage[]; // Convenience access
  moodAndToneCategories?: PopulatedCategoryForDetailPage[]; // Convenience access
  languageCategory?: PopulatedCategoryForDetailPage | null; // Convenience access (เหมือน language แต่เพื่อความชัดเจน)

  // รายการตัวละคร
  charactersList?: PopulatedCharacterForDetailPage[];
}

// ==================================================================================================
// SECTION: Helper Strings for Population
// ==================================================================================================
const populateAuthorFields = '_id username profile.displayName profile.penName profile.avatarUrl'; //
const populateCategoryFields = '_id name slug iconUrl color description categoryType localizations'; //
const populateEpisodeFields = '_id title episodeOrder status accessType publishedAt'; //
const populateCharacterFields = '_id name characterCode roleInStory profileImageUrl description'; //

// ==================================================================================================
// SECTION: API GET Handler
// ==================================================================================================
export async function GET(
  request: Request, // Request object (ไม่ได้ใช้งานใน logic ปัจจุบัน แต่ควรมีตาม convention)
  { params }: { params: { slug: string } } // params ที่ Next.js ส่งมาให้จาก dynamic route
) {
  const { slug } = params;

  if (!slug || typeof slug !== 'string') {
    console.warn('⚠️ [API /novels/[slug]] Invalid slug provided.');
    return NextResponse.json({ message: 'Slug ไม่ถูกต้อง' }, { status: 400 });
  }

  try {
    await dbConnect(); // เชื่อมต่อฐานข้อมูล
    console.log(`📄 [API /novels/${slug}] กำลังค้นหานิยายด้วย slug: ${slug}`);

    // ค้นหานิยายด้วย slug, และกรองเอาเฉพาะนิยายที่ยังไม่ถูกลบ และมีสถานะเป็น published หรือ completed
    const novelDoc = await NovelModel.findOne({
      slug: slug,
      isDeleted: { $ne: true }, //
      status: { $in: [NovelStatus.PUBLISHED, NovelStatus.COMPLETED] } //
    })
    // Population chain
    .populate<{ author: PopulatedAuthorForDetailPage }>({
      path: 'author',
      select: populateAuthorFields,
      // match: { isActive: true } // (Optional) หากต้องการกรองผู้เขียนที่ active เท่านั้น
    })
    .populate<{ coAuthors: PopulatedAuthorForDetailPage[] }>({
      path: 'coAuthors',
      select: populateAuthorFields,
    })
    .populate<{ ageRatingCategoryId: PopulatedCategoryForDetailPage }>({
      path: 'ageRatingCategoryId',
      select: populateCategoryFields,
    })
    .populate<{ language: PopulatedCategoryForDetailPage }>({ // นี่คือ field 'language' ใน NovelModel
      path: 'language',
      select: populateCategoryFields, // ตรวจสอบว่า 'slug' ถูกรวมอยู่ด้วยสำหรับ logic 'th' ใน metadata
    })
    // Populate firstEpisodeId (เลือก field ที่จำเป็น)
    .populate<{ firstEpisodeId: PopulatedEpisodeForDetailPage }>({
      path: 'firstEpisodeId',
      select: populateEpisodeFields,
      match: { status: EpisodeStatus.PUBLISHED } // (Optional) แสดงเฉพาะถ้าตอนแรกเผยแพร่แล้ว
    })
    // Populate fields within themeAssignment
    .populate({ path: 'themeAssignment.mainTheme.categoryId', select: populateCategoryFields })
    .populate({ path: 'themeAssignment.subThemes.categoryId', select: populateCategoryFields })
    .populate({ path: 'themeAssignment.moodAndTone', select: populateCategoryFields })
    .populate({ path: 'themeAssignment.contentWarnings', select: populateCategoryFields })
    // Populate fields within sourceType
    .populate({ path: 'sourceType.fandomCategoryId', select: populateCategoryFields })
    .populate({ path: 'sourceType.originalWorkLanguage', select: populateCategoryFields })
    // Populate fields within narrativeFocus
    .populate({ path: 'narrativeFocus.narrativePacingTags', select: populateCategoryFields })
    .populate({ path: 'narrativeFocus.primaryConflictTypes', select: populateCategoryFields })
    .populate({ path: 'narrativeFocus.narrativePerspective', select: populateCategoryFields })
    .populate({ path: 'narrativeFocus.storyArcStructure', select: populateCategoryFields })
    .populate({ path: 'narrativeFocus.artStyle', select: populateCategoryFields })
    .populate({ path: 'narrativeFocus.gameplayMechanics', select: populateCategoryFields })
    .populate({ path: 'narrativeFocus.interactivityLevel', select: populateCategoryFields })
    .populate({ path: 'narrativeFocus.playerAgencyLevel', select: populateCategoryFields })
    .populate({ path: 'narrativeFocus.lengthTag', select: populateCategoryFields })
    .populate({ path: 'narrativeFocus.commonTropes', select: populateCategoryFields })
    .populate({ path: 'narrativeFocus.targetAudienceProfileTags', select: populateCategoryFields })
    .populate({ path: 'narrativeFocus.avoidIfYouDislikeTags', select: populateCategoryFields });
    // ไม่ใช้ .exec() ที่นี่ เพราะ findOne คืน Promise โดยตรง และไม่ใช้ .lean() เพื่อให้ virtuals ทำงาน

    if (!novelDoc) {
      console.warn(`⚠️ [API /novels/${slug}] ไม่พบนิยายสำหรับ slug: ${slug}`);
      return NextResponse.json({ message: 'ไม่พบนิยายที่คุณค้นหา' }, { status: 404 });
    }

    console.log(`✅ [API /novels/${slug}] พบนิยาย: "${novelDoc.title}"`);

    // ดึงข้อมูลตัวละครที่เกี่ยวข้องกับนิยายนี้ (แยก query)
    // Frontend ไม่ได้ใช้ charactersList ในปัจจุบัน แต่เตรียมไว้เผื่ออนาคต
    let charactersListFromDB: ICharacter[] = [];
    // if (CharacterModel) { // ตรวจสอบว่า model ถูก import และใช้งานได้
    //   charactersListFromDB = await CharacterModel.find({ novelId: novelDoc._id, isArchived: false })
    //     .select(populateCharacterFields)
    //     .limit(15); // จำกัดจำนวนตัวละครที่ดึงมาเพื่อ performance
    // }

    // แปลง Mongoose document เป็น plain object และจัดโครงสร้างสำหรับ response
    // การใช้ toObject() จะช่วยให้ virtual fields (เช่น currentEpisodePriceCoins) ถูกรวมเข้ามาด้วย
    const novelData: PopulatedNovelForDetailPage = {
      ...(novelDoc.toObject() as Omit<INovel, 'author' | 'coAuthors' | 'themeAssignment' | 'narrativeFocus' | 'ageRatingCategoryId' | 'sourceType' | 'language' | 'firstEpisodeId'>), // ใช้ Omit เพื่อความแม่นยำของ type
      _id: novelDoc._id, // Ensure _id is preserved

      // Populate Mongoose Document fields correctly to avoid runtime errors
      author: novelDoc.author ? (novelDoc.author as unknown as PopulatedAuthorForDetailPage) : null,
      coAuthors: novelDoc.coAuthors ? (novelDoc.coAuthors as unknown as PopulatedAuthorForDetailPage[]) : undefined,

      themeAssignment: {
        mainTheme: novelDoc.themeAssignment?.mainTheme?.categoryId
          ? {
              categoryId: novelDoc.themeAssignment.mainTheme.categoryId as unknown as PopulatedCategoryForDetailPage,
              customName: novelDoc.themeAssignment.mainTheme.customName,
            }
          : undefined,
        subThemes: novelDoc.themeAssignment?.subThemes?.map(st => ({
          categoryId: st.categoryId as unknown as PopulatedCategoryForDetailPage,
          customName: st.customName,
        })).filter(st => st.categoryId) ?? [], // Filter out entries where categoryId might be null after population attempt
        moodAndTone: (novelDoc.themeAssignment?.moodAndTone as PopulatedCategoryForDetailPage[] | undefined)?.filter(Boolean) ?? [],
        contentWarnings: (novelDoc.themeAssignment?.contentWarnings as PopulatedCategoryForDetailPage[] | undefined)?.filter(Boolean) ?? [],
        customTags: novelDoc.themeAssignment?.customTags,
      },

      narrativeFocus: novelDoc.narrativeFocus ? {
        narrativePacingTags: (novelDoc.narrativeFocus.narrativePacingTags as PopulatedCategoryForDetailPage[] | undefined)?.filter(Boolean) ?? [],
        primaryConflictTypes: (novelDoc.narrativeFocus.primaryConflictTypes as PopulatedCategoryForDetailPage[] | undefined)?.filter(Boolean) ?? [],
        narrativePerspective: novelDoc.narrativeFocus.narrativePerspective as unknown as PopulatedCategoryForDetailPage | null,
        storyArcStructure: novelDoc.narrativeFocus.storyArcStructure as unknown as PopulatedCategoryForDetailPage | null,
        artStyle: novelDoc.narrativeFocus.artStyle as unknown as PopulatedCategoryForDetailPage | null,
        gameplayMechanics: (novelDoc.narrativeFocus.gameplayMechanics as PopulatedCategoryForDetailPage[] | undefined)?.filter(Boolean) ?? [],
        interactivityLevel: novelDoc.narrativeFocus.interactivityLevel as unknown as PopulatedCategoryForDetailPage | null,
        playerAgencyLevel: novelDoc.narrativeFocus.playerAgencyLevel as unknown as PopulatedCategoryForDetailPage | null,
        lengthTag: novelDoc.narrativeFocus.lengthTag as unknown as PopulatedCategoryForDetailPage | null,
        commonTropes: (novelDoc.narrativeFocus.commonTropes as PopulatedCategoryForDetailPage[] | undefined)?.filter(Boolean) ?? [],
        targetAudienceProfileTags: (novelDoc.narrativeFocus.targetAudienceProfileTags as PopulatedCategoryForDetailPage[] | undefined)?.filter(Boolean) ?? [],
        avoidIfYouDislikeTags: (novelDoc.narrativeFocus.avoidIfYouDislikeTags as PopulatedCategoryForDetailPage[] | undefined)?.filter(Boolean) ?? [],
      } : undefined,

      ageRatingCategoryId: novelDoc.ageRatingCategoryId ? (novelDoc.ageRatingCategoryId as unknown as PopulatedCategoryForDetailPage) : null,

      sourceType: {
        type: novelDoc.sourceType.type,
        originalWorkTitle: novelDoc.sourceType.originalWorkTitle,
        originalWorkAuthor: novelDoc.sourceType.originalWorkAuthor,
        permissionDetails: novelDoc.sourceType.permissionDetails,
        fandomCategoryId: novelDoc.sourceType.fandomCategoryId as unknown as PopulatedCategoryForDetailPage | null,
        originalWorkLanguage: novelDoc.sourceType.originalWorkLanguage as unknown as PopulatedCategoryForDetailPage | null,
      },

      language: novelDoc.language ? (novelDoc.language as unknown as PopulatedCategoryForDetailPage) : null,
      firstEpisodeId: novelDoc.firstEpisodeId ? (novelDoc.firstEpisodeId as unknown as PopulatedEpisodeForDetailPage) : null,

      // Fields สำหรับ metadata ใน page.tsx
      firstPublishedAt: novelDoc.publishedAt ? new Date(novelDoc.publishedAt).toISOString() : null, //
      mainThemeCategory: novelDoc.themeAssignment?.mainTheme?.categoryId as unknown as PopulatedCategoryForDetailPage || null,
      subThemeCategories: novelDoc.themeAssignment?.subThemes?.map(st => st.categoryId as unknown as PopulatedCategoryForDetailPage).filter(Boolean) || [],
      moodAndToneCategories: novelDoc.themeAssignment?.moodAndTone as unknown as PopulatedCategoryForDetailPage[] || [],
      languageCategory: novelDoc.language as PopulatedCategoryForDetailPage || null, // สำหรับ page.tsx metadata

      charactersList: charactersListFromDB.map(char => char.toObject() as PopulatedCharacterForDetailPage),
    };
    
    // ตรวจสอบเพื่อให้แน่ใจว่า field ที่สำคัญสำหรับ frontend ไม่ใช่ undefined โดยไม่จำเป็น
    // ตัวอย่างเช่น author ควรเป็น null หากไม่มี ไม่ใช่ object فاضي
    if (!novelData.author?._id) novelData.author = null;
    if (novelData.themeAssignment.mainTheme && !novelData.themeAssignment.mainTheme.categoryId?._id) {
        novelData.themeAssignment.mainTheme.categoryId = null;
    }
    // ... (เพิ่มการตรวจสอบคล้ายกันสำหรับ fields ที่ populate อื่นๆ ตามความจำเป็น) ...


    console.log(`📬 [API /novels/${slug}] ส่งข้อมูลนิยาย: "${novelData.title}"`);
    return NextResponse.json({ novel: novelData });

  } catch (error: any) {
    console.error(`❌ [API /novels/${slug}] เกิดข้อผิดพลาด Server:`, error.message, error.stack);
    // ตรวจสอบว่าเป็น Mongoose CastError หรือไม่ (เช่น ObjectId ไม่ถูกต้อง)
    if (error instanceof mongoose.Error.CastError) {
      return NextResponse.json({ message: 'Slug หรือ ID ที่ร้องขอไม่ถูกต้อง' }, { status: 400 });
    }
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดบนเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง', error: error.message }, { status: 500 });
  }
}