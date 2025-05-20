// src/scripts/novel-seed.ts
import mongoose, { Types } from "mongoose";
import dbConnect from "@/backend/lib/mongodb";
import NovelModel, {
  INovel,
  NovelStatus,
  NovelAccessLevel,
  NovelEndingType,
  NovelContentType,
  IThemeAssignment,
  INarrativeFocus,
  IWorldBuildingDetails,
  ISourceType,
  INovelStats,
  IMonetizationSettings,
  IPsychologicalAnalysisConfig,
  ICollaborationSettings,
} from "@/backend/models/Novel"; // ตรวจสอบ path ให้ถูกต้อง
import CategoryModel, {
  ICategory,
  CategoryType,
} from "@/backend/models/Category"; // ตรวจสอบ path ให้ถูกต้อง
import UserModelImport, { IUser } from "@/backend/models/User"; // ตรวจสอบ path ให้ถูกต้อง
import { config } from "dotenv";

// โหลดตัวแปรสภาพแวดล้อมจากไฟล์ .env
config({ path: ".env" });

const AUTHOR_USERNAME = process.env.AUTHOR_USERNAME;

// ==================================================================================================
// SECTION: เตรียมข้อมูล Category ที่จะใช้ (ควรครอบคลุม CategoryType ต่างๆ ที่ Novel Model อ้างอิง)
// ==================================================================================================
interface SeedCategory extends Partial<ICategory> {
  name: string;
  slug: string;
  categoryType: CategoryType;
  description?: string;
}

const initialCategoriesData: SeedCategory[] = [
  // GENRE
  { name: "แฟนตาซี", slug: "fantasy", categoryType: CategoryType.GENRE, description: "นิยายแนวแฟนตาซี ผจญภัยในโลกเวทมนตร์" },
  { name: "วิทยาศาสตร์", slug: "sci-fi", categoryType: CategoryType.GENRE, description: "นิยายแนววิทยาศาสตร์ อนาคต และเทคโนโลยี" },
  { name: "โรแมนติก", slug: "romance", categoryType: CategoryType.GENRE, description: "นิยายรักหวานซึ้งตรึงใจ" },
  { name: "สยองขวัญ", slug: "horror", categoryType: CategoryType.GENRE, description: "นิยายแนวสยองขวัญ ระทึกขวัญ" },
  { name: "ลึกลับ", slug: "mystery", categoryType: CategoryType.GENRE, description: "นิยายแนวสืบสวนสอบสวน ปริศนา" },
  { name: "แอ็คชั่น", slug: "action", categoryType: CategoryType.GENRE, description: "นิยายแนวต่อสู้ ผจญภัยสุดมันส์" },
  { name: "ดราม่า", slug: "drama", categoryType: CategoryType.GENRE, description: "นิยายสะท้อนชีวิต เข้มข้นด้วยอารมณ์" },
  { name: "ผจญภัย", slug: "adventure", categoryType: CategoryType.TAG, description: "แท็กสำหรับการผจญภัย" }, // ใช้เป็น TAG
  { name: "ตลก", slug: "comedy", categoryType: CategoryType.GENRE, description: "นิยายเบาสมอง เรียกเสียงหัวเราะ" },

  // SUB_GENRE
  { name: "ไฮแฟนตาซี", slug: "high-fantasy", categoryType: CategoryType.SUB_GENRE, description: "แฟนตาซีโลกสมมติ มหากาพย์" },
  { name: "ไซเบอร์พังก์", slug: "cyberpunk", categoryType: CategoryType.SUB_GENRE, description: "โลกอนาคตมืดมน เทคโนโลยีสุดล้ำ" },
  { name: "โรแมนติกคอมเมดี้", slug: "romantic-comedy", categoryType: CategoryType.SUB_GENRE, description: "รักปนเสียงหัวเราะ" },

  // THEME
  { name: "การแก้แค้น", slug: "revenge", categoryType: CategoryType.THEME, description: "ธีมการแก้แค้น ชำระหนี้" },
  { name: "การเติบโต", slug: "coming-of-age", categoryType: CategoryType.THEME, description: "ธีมการก้าวผ่านวัย ค้นพบตัวเอง" },
  { name: "ดิสโทเปีย", slug: "dystopian", categoryType: CategoryType.THEME, description: "ธีมโลกอนาคตที่มืดมิด" },

  // TAG (เพิ่มเติมจาก adventure)
  { name: "เวทมนตร์", slug: "magic", categoryType: CategoryType.TAG },
  { name: "การเดินทางข้ามเวลา", slug: "time-travel", categoryType: CategoryType.TAG },
  { name: "โรงเรียน", slug: "school-life", categoryType: CategoryType.TAG },
  { name: "เหนือธรรมชาติ", slug: "supernatural", categoryType: CategoryType.TAG },
  { name: "สตีมพังก์", slug: "steampunk", categoryType: CategoryType.TAG },
  { name: "อวกาศ", slug: "space-opera", categoryType: CategoryType.SUB_GENRE },

  // MOOD_AND_TONE
  { name: "มืดมน", slug: "dark", categoryType: CategoryType.MOOD_AND_TONE },
  { name: "ตลกขบขัน", slug: "humorous", categoryType: CategoryType.MOOD_AND_TONE },
  { name: "อบอุ่นใจ", slug: "heartwarming", categoryType: CategoryType.MOOD_AND_TONE },
  { name: "เข้มข้น", slug: "intense", categoryType: CategoryType.MOOD_AND_TONE },

  // CONTENT_WARNING
  { name: "ความรุนแรง", slug: "violence", categoryType: CategoryType.CONTENT_WARNING },
  { name: "เนื้อหาสำหรับผู้ใหญ่", slug: "mature-themes", categoryType: CategoryType.CONTENT_WARNING },
  { name: "สปอยเลอร์", slug: "spoilers", categoryType: CategoryType.CONTENT_WARNING },
  { name: "คำหยาบคาย", slug: "strong-language", categoryType: CategoryType.CONTENT_WARNING },

  // AGE_RATING
  { name: "ทุกวัย", slug: "all-ages", categoryType: CategoryType.AGE_RATING },
  { name: "วัยรุ่น (13+)", slug: "teen-13-plus", categoryType: CategoryType.AGE_RATING },
  { name: "ผู้ใหญ่ (18+)", slug: "mature-18-plus", categoryType: CategoryType.AGE_RATING },

  // FANDOM (ถ้ามีนิยาย Fan Fiction)
  { name: "จักรวาลมาร์เวล", slug: "marvel-cinematic-universe", categoryType: CategoryType.FANDOM },

  // LANGUAGE
  { name: "ภาษาไทย", slug: "thai", categoryType: CategoryType.LANGUAGE, description: "นิยายที่เขียนเป็นภาษาไทย" },
  { name: "ภาษาอังกฤษ", slug: "english", categoryType: CategoryType.LANGUAGE, description: "นิยายที่เขียนเป็นภาษาอังกฤษ" },

  // ART_STYLE
  { name: "อนิเมะ", slug: "anime", categoryType: CategoryType.ART_STYLE },
  { name: "สมจริง", slug: "realistic", categoryType: CategoryType.ART_STYLE },
  { name: "การ์ตูนตะวันตก", slug: "western-cartoon", categoryType: CategoryType.ART_STYLE },

  // GAMEPLAY_MECHANIC
  { name: "การตัดสินใจมีผลต่อเนื้อเรื่อง", slug: "choice-matters", categoryType: CategoryType.GAMEPLAY_MECHANIC },
  { name: "หลายตอนจบ", slug: "multiple-endings-mechanic", categoryType: CategoryType.GAMEPLAY_MECHANIC }, // แตกต่างจาก NovelEndingType
  { name: "ระบบค่าสถานะ", slug: "stat-based", categoryType: CategoryType.GAMEPLAY_MECHANIC },

  // NARRATIVE_PACING
  { name: "ดำเนินเรื่องเร็ว", slug: "fast-paced", categoryType: CategoryType.NARRATIVE_PACING },
  { name: "ค่อยเป็นค่อยไป", slug: "slow-burn", categoryType: CategoryType.NARRATIVE_PACING },

  // PRIMARY_CONFLICT_TYPE
  { name: "มนุษย์ปะทะตนเอง", slug: "man-vs-self", categoryType: CategoryType.PRIMARY_CONFLICT_TYPE },
  { name: "มนุษย์ปะทะสังคม", slug: "man-vs-society", categoryType: CategoryType.PRIMARY_CONFLICT_TYPE },

  // NARRATIVE_PERSPECTIVE
  { name: "มุมมองบุคคลที่หนึ่ง", slug: "first-person", categoryType: CategoryType.NARRATIVE_PERSPECTIVE },
  { name: "มุมมองบุคคลที่สาม", slug: "third-person", categoryType: CategoryType.NARRATIVE_PERSPECTIVE },

  // STORY_ARC_STRUCTURE
  { name: "การเดินทางของวีรบุรุษ", slug: "heros-journey", categoryType: CategoryType.STORY_ARC_STRUCTURE },

  // COMMON_TROPE
  { name: "จากศัตรูสู่คนรัก", slug: "enemies-to-lovers", categoryType: CategoryType.COMMON_TROPE },
  { name: "ผู้ถูกเลือก", slug: "chosen-one", categoryType: CategoryType.COMMON_TROPE },

  // TARGET_AUDIENCE_PROFILE
  { name: "ผู้ชื่นชอบการสืบสวน", slug: "mystery-lovers", categoryType: CategoryType.TARGET_AUDIENCE_PROFILE },
  { name: "ผู้ชื่นชอบโลกแฟนตาซี", slug: "fantasy-enthusiasts", categoryType: CategoryType.TARGET_AUDIENCE_PROFILE },

  // AVOID_IF_DISLIKE_TAG
  { name: "ตัวละครหลักตาย", slug: "major-character-death", categoryType: CategoryType.AVOID_IF_DISLIKE_TAG },
  { name: "จบแบบเศร้า", slug: "sad-ending", categoryType: CategoryType.AVOID_IF_DISLIKE_TAG },

  // SENSITIVE_CHOICE_TOPIC
  { name: "การตัดสินใจที่ส่งผลต่อชีวิต", slug: "life-altering-decisions", categoryType: CategoryType.SENSITIVE_CHOICE_TOPIC },

  // EDITORIAL_TAG
  { name: "แนะนำโดยบรรณาธิการ", slug: "editors-choice", categoryType: CategoryType.EDITORIAL_TAG },
  { name: "ดาวรุ่งพุ่งแรง", slug: "rising-star", categoryType: CategoryType.EDITORIAL_TAG },

  // LENGTH_TAG
  { name: "เรื่องสั้น", slug: "short-story", categoryType: CategoryType.LENGTH_TAG },
  { name: "เรื่องยาว", slug: "long-form", categoryType: CategoryType.LENGTH_TAG },

  // INTERACTIVITY_LEVEL
  { name: "โต้ตอบสูง", slug: "highly-interactive", categoryType: CategoryType.INTERACTIVITY_LEVEL },
  { name: "ดำเนินเรื่องเป็นเส้นตรง", slug: "kinetic-narrative", categoryType: CategoryType.INTERACTIVITY_LEVEL },
  
  // PLAYER_AGENCY_LEVEL
  { name: "ผู้เล่นกำหนดเรื่องราว", slug: "high-player-agency", categoryType: CategoryType.PLAYER_AGENCY_LEVEL },
  { name: "ตัวเอกมีเส้นทางชัดเจน", slug: "fixed-protagonist-path", categoryType: CategoryType.PLAYER_AGENCY_LEVEL }
];

// Object เพื่อเก็บ ID ของ Category ที่สร้างขึ้น
let seededCategoryIds: { [key in CategoryType]?: { [slug: string]: Types.ObjectId } } = {};

/**
 * เตรียมข้อมูลหมวดหมู่ และเก็บ ID ไว้ใน seededCategoryIds
 * @returns Promise<void>
 */
async function seedInitialCategories() {
  console.log("🌱 เริ่มตรวจสอบและเพิ่มข้อมูลหมวดหมู่...");

  for (const catData of initialCategoriesData) {
    if (!catData.slug || !catData.categoryType) {
      console.warn(`⚠️ ข้อมูล Category ไม่สมบูรณ์ ข้าม: ${catData.name}`);
      continue;
    }
    let category = await CategoryModel.findOne({ slug: catData.slug, categoryType: catData.categoryType });
    if (!category) {
      category = await CategoryModel.create({
        name: catData.name,
        slug: catData.slug,
        categoryType: catData.categoryType,
        description: catData.description || `${catData.name} (${catData.categoryType})`,
        isActive: true,
        displayOrder: 0,
        isSystemDefined: true, // หมวดหมู่เริ่มต้น ให้เป็น system defined
      });
      console.log(`   ✅ สร้าง Category: ${category.name} (ประเภท: ${category.categoryType}, Slug: ${category.slug})`);
    }
    // เก็บ ID
    if (!seededCategoryIds[catData.categoryType]) {
      seededCategoryIds[catData.categoryType] = {};
    }
    seededCategoryIds[catData.categoryType]![catData.slug] = category._id;
  }
  console.log("🌲 ข้อมูลหมวดหมู่พร้อมใช้งาน");
}

/**
 * ดึง ID ของผู้เขียนจาก User model
 * @returns ObjectId ของผู้เขียน
 */
async function getAuthorId(): Promise<Types.ObjectId> {
  if (!AUTHOR_USERNAME) {
    throw new Error("❌ ไม่ได้ตั้งค่า AUTHOR_USERNAME ในไฟล์ .env");
  }
  const UserModel = UserModelImport; // ใช้ Model ที่ import มาโดยตรง
  const author = await UserModel.findOne({ username: AUTHOR_USERNAME }); // ค้นหาด้วย username จาก .env
  if (!author) {
    throw new Error(
      `❌ ไม่พบผู้ใช้ที่เป็นผู้เขียนด้วย username: ${AUTHOR_USERNAME}. กรุณา seed ข้อมูลผู้ใช้ก่อน (admin-seed.ts)`
    );
  }
  if (!author.roles.includes("Writer")) {
    console.warn(`⚠️ ผู้ใช้ ${AUTHOR_USERNAME} ยังไม่มีบทบาท 'Writer'. กำลังเพิ่มให้...`);
    author.roles.push("Writer");
    if (!author.writerStats) { // เพิ่ม writerStats ถ้ายังไม่มี
      author.writerStats = {
        totalNovelsPublished: 0,
        totalEpisodesPublished: 0,
        totalViewsAcrossAllNovels: 0,
        totalReadsAcrossAllNovels: 0,
        totalLikesReceivedOnNovels: 0,
        totalCommentsReceivedOnNovels: 0,
        totalEarningsToDate: 0,
        totalCoinsReceived: 0,
        totalRealMoneyReceived: 0,
        totalDonationsReceived: 0,
        writerSince: new Date(),
      };
    }
    await author.save();
  }
  return author._id;
}

// Helper function to get a random category ID or undefined
function getRandomCategoryId(type: CategoryType, slug?: string): Types.ObjectId | undefined {
  if (slug) {
    return seededCategoryIds[type]?.[slug];
  }
  const idsForType = seededCategoryIds[type];
  if (idsForType) {
    const slugs = Object.keys(idsForType);
    if (slugs.length > 0) {
      const randomSlug = slugs[Math.floor(Math.random() * slugs.length)];
      return idsForType[randomSlug];
    }
  }
  return undefined;
}

function getRandomCategoryIds(type: CategoryType, count: number = 1): Types.ObjectId[] {
  const result: Types.ObjectId[] = [];
  const idsForType = seededCategoryIds[type];
  if (idsForType) {
    const availableSlugs = Object.keys(idsForType);
    if (availableSlugs.length === 0) return [];

    const numToPick = Math.min(count, availableSlugs.length);
    const shuffledSlugs = [...availableSlugs].sort(() => 0.5 - Math.random());

    for (let i = 0; i < numToPick; i++) {
      result.push(idsForType[shuffledSlugs[i]]);
    }
  }
  return result;
}

// ==================================================================================================
// SECTION: ข้อมูลนิยายตัวอย่าง (ปรับปรุงให้สอดคล้องกับ INovel และใช้ Category IDs)
// ==================================================================================================
async function generateSampleNovels(authorId: Types.ObjectId): Promise<Partial<INovel>[]> {
  // ตรวจสอบว่า seededCategoryIds ถูก populate แล้ว
  if (Object.keys(seededCategoryIds).length === 0) {
    console.error("❌ seededCategoryIds ยังไม่ถูกเตรียมข้อมูล ไม่สามารถสร้าง sample novels ได้");
    return [];
  }

  const sampleNovelsData: Partial<INovel>[] = [
    // นิยายเรื่องที่ 1
    {
      title: "เงาแห่งนิรันดร์กาล",
      slug: "shadow-of-eternity",
      author: authorId,
      synopsis: "ในโลกที่เวลาบิดเบี้ยวตามเจตจำนงของจอมเวทย์โบราณ นักรบรุ่นใหม่ค้นพบคาถาต้องห้ามที่อาจทำลายมิติแห่งความเป็นจริง",
      longDescription: "การผจญภัยสุดยิ่งใหญ่เริ่มต้นขึ้นเมื่อ 'ไครอส' นักรบหนุ่มผู้มุ่งมั่น ได้รับมรดกเป็นตำราเวทมนตร์โบราณ ความลับที่ถูกผนึกไว้กำลังจะถูกเปิดเผย และมันจะนำพาเขาไปสู่การต่อสู้เพื่อปกป้องสมดุลของเวลาและมิติ",
      coverImageUrl: "https://picsum.photos/seed/shadow-of-eternity/400/600",
      bannerImageUrl: "https://picsum.photos/seed/shadow-of-eternity-banner/1200/400",
      themeAssignment: {
        mainTheme: { categoryId: getRandomCategoryId(CategoryType.GENRE, "fantasy")! },
        subThemes: [
          { categoryId: getRandomCategoryId(CategoryType.THEME, "coming-of-age")! },
          { categoryId: getRandomCategoryId(CategoryType.TAG, "magic")! },
        ],
        moodAndTone: getRandomCategoryIds(CategoryType.MOOD_AND_TONE, 2),
        contentWarnings: [getRandomCategoryId(CategoryType.CONTENT_WARNING, "violence")!],
        customTags: ["เวทมนตร์โบราณ", "พลังมืด", "การเสียสละ"],
      },
      narrativeFocus: {
        narrativePacingTags: [getRandomCategoryId(CategoryType.NARRATIVE_PACING, "fast-paced")!],
        primaryConflictTypes: [getRandomCategoryId(CategoryType.PRIMARY_CONFLICT_TYPE, "man-vs-society")!],
        narrativePerspective: getRandomCategoryId(CategoryType.NARRATIVE_PERSPECTIVE, "third-person"),
        artStyle: getRandomCategoryId(CategoryType.ART_STYLE, "anime"),
        commonTropes: [getRandomCategoryId(CategoryType.COMMON_TROPE, "chosen-one")!],
        interactivityLevel: getRandomCategoryId(CategoryType.INTERACTIVITY_LEVEL, "highly-interactive"),
        lengthTag: getRandomCategoryId(CategoryType.LENGTH_TAG, "long-form"),
      },
      worldBuildingDetails: { loreSummary: "โลกแห่งเอเทเรีย ที่ซึ่งเวทมนตร์คือแก่นแท้ของทุกสิ่ง" },
      ageRatingCategoryId: getRandomCategoryId(CategoryType.AGE_RATING, "teen-13-plus"),
      status: NovelStatus.PUBLISHED,
      accessLevel: NovelAccessLevel.PUBLIC,
      isCompleted: false,
      endingType: NovelEndingType.ONGOING,
      sourceType: { type: NovelContentType.ORIGINAL, originalWorkLanguage: getRandomCategoryId(CategoryType.LANGUAGE, "thai") },
      language: getRandomCategoryId(CategoryType.LANGUAGE, "thai")!,
      totalEpisodesCount: 20,
      publishedEpisodesCount: 15,
      stats: {
        viewsCount: 15000,
        uniqueViewersCount: 7000,
        likesCount: 4000,
        commentsCount: 200,
        ratingsCount: 900,
        averageRating: 4.8,
        followersCount: 3200,
        sharesCount: 150,
        bookmarksCount: 500,
        totalWords: 80000,
        estimatedReadingTimeMinutes: 320,
        completionRate: 60,
        lastPublishedEpisodeAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      monetizationSettings: {
        isCoinBasedUnlock: true,
        defaultEpisodePriceCoins: 10,
        allowDonations: true,
        isAdSupported: false,
        isPremiumExclusive: false,
      },
      psychologicalAnalysisConfig: { allowsPsychologicalAnalysis: true },
      collaborationSettings: { allowCoAuthorRequests: false },
      publishedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      lastContentUpdatedAt: new Date(),
    },
    // นิยายเรื่องที่ 2
    {
      title: "ความฝันสีนีออน",
      slug: "neon-dreams",
      author: authorId,
      synopsis: "โปรแกรมเมอร์ AI ต้องต่อกรกับบริษัทยักษ์ใหญ่ในเมืองดิสโทเปีย เพื่อเปิดโปงแผนการที่คุกคามเสรีภาพของมนุษยชาติ",
      longDescription: "ในมหานครนีโอ-โตเกียว ปี 2077 'เคนจิ' โปรแกรมเมอร์อัจฉริยะผู้สร้าง AI ที่มีความรู้สึกนึกคิดของตัวเองขึ้นมาโดยบังเอิญ เขาต้องหลบหนีการตามล่าจาก 'คอร์ป X' องค์กรที่ต้องการใช้ AI ของเขาเป็นอาวุธ",
      coverImageUrl: "https://picsum.photos/seed/neon-dreams/400/600",
      bannerImageUrl: "https://picsum.photos/seed/neon-dreams-banner/1200/400",
      themeAssignment: {
        mainTheme: { categoryId: getRandomCategoryId(CategoryType.GENRE, "sci-fi")! },
        subThemes: [
          { categoryId: getRandomCategoryId(CategoryType.SUB_GENRE, "cyberpunk")! },
          { categoryId: getRandomCategoryId(CategoryType.THEME, "dystopian")! },
        ],
        moodAndTone: [
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "intense")!,
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "dark")!,
        ],
        contentWarnings: [
          getRandomCategoryId(CategoryType.CONTENT_WARNING, "violence")!,
          getRandomCategoryId(CategoryType.CONTENT_WARNING, "strong-language")!,
        ],
        customTags: ["AI", "เทคโนโลยี", "การต่อสู้"],
      },
      narrativeFocus: {
        narrativePacingTags: [getRandomCategoryId(CategoryType.NARRATIVE_PACING, "fast-paced")!],
        primaryConflictTypes: [getRandomCategoryId(CategoryType.PRIMARY_CONFLICT_TYPE, "man-vs-society")!],
        artStyle: getRandomCategoryId(CategoryType.ART_STYLE, "realistic"),
        gameplayMechanics: [
          getRandomCategoryId(CategoryType.GAMEPLAY_MECHANIC, "choice-matters")!,
          getRandomCategoryId(CategoryType.GAMEPLAY_MECHANIC, "multiple-endings-mechanic")!,
        ],
        interactivityLevel: getRandomCategoryId(CategoryType.INTERACTIVITY_LEVEL, "highly-interactive"),
        lengthTag: getRandomCategoryId(CategoryType.LENGTH_TAG, "long-form"),
      },
      ageRatingCategoryId: getRandomCategoryId(CategoryType.AGE_RATING, "mature-18-plus"),
      status: NovelStatus.PUBLISHED,
      accessLevel: NovelAccessLevel.PUBLIC,
      isCompleted: true,
      endingType: NovelEndingType.MULTIPLE_ENDINGS,
      sourceType: { type: NovelContentType.ORIGINAL, originalWorkLanguage: getRandomCategoryId(CategoryType.LANGUAGE, "thai") },
      language: getRandomCategoryId(CategoryType.LANGUAGE, "thai")!,
      totalEpisodesCount: 15,
      publishedEpisodesCount: 15,
      stats: {
        viewsCount: 9500,
        uniqueViewersCount: 4000,
        likesCount: 2300,
        commentsCount: 150,
        ratingsCount: 600,
        averageRating: 4.6,
        followersCount: 2100,
        sharesCount: 100,
        bookmarksCount: 300,
        totalWords: 60000,
        estimatedReadingTimeMinutes: 240,
        completionRate: 80,
        lastPublishedEpisodeAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      monetizationSettings: {
        isCoinBasedUnlock: true,
        defaultEpisodePriceCoins: 15,
        allowDonations: true,
        isAdSupported: true,
        isPremiumExclusive: false,
      },
      psychologicalAnalysisConfig: { allowsPsychologicalAnalysis: false },
      publishedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
      lastContentUpdatedAt: new Date(),
    },
    // นิยายเรื่องที่ 3 - เพิ่มความหลากหลาย
    {
      title: "เสียงกระซิบจากพงไพร",
      slug: "whispers-of-the-forest",
      author: authorId,
      synopsis: "เด็กหญิงคนหนึ่งค้นพบว่าเธอสามารถสื่อสารกับวิญญาณโบราณในป่าลึกลับ แต่พรสวรรค์ของเธอมาพร้อมกับราคาที่อันตราย",
      longDescription: "'ลินิน' เด็กสาวผู้รักธรรมชาติ ค้นพบความสามารถพิเศษในการได้ยินเสียงกระซิบจากเหล่าภูตผีในป่าศักดิ์สิทธิ์ การผจญภัยครั้งนี้จะนำเธอไปสู่ความจริงเกี่ยวกับตำนานโบราณ และภัยคุกคามที่กำลังคืบคลานเข้ามา",
      coverImageUrl: "https://picsum.photos/seed/whispers-forest/400/600",
      bannerImageUrl: "https://picsum.photos/seed/whispers-forest-banner/1200/400",
      themeAssignment: {
        mainTheme: { categoryId: getRandomCategoryId(CategoryType.GENRE, "fantasy")! },
        subThemes: [
          { categoryId: getRandomCategoryId(CategoryType.TAG, "supernatural")! },
          { categoryId: getRandomCategoryId(CategoryType.THEME, "coming-of-age")! },
        ],
        moodAndTone: [
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "heartwarming")!,
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "mystical")!,
        ],
        customTags: ["ภูตผี", "ป่าศักดิ์สิทธิ์", "ตำนาน"],
      },
      narrativeFocus: {
        narrativePacingTags: [getRandomCategoryId(CategoryType.NARRATIVE_PACING, "slow-burn")!],
        artStyle: getRandomCategoryId(CategoryType.ART_STYLE, "western-cartoon"),
        interactivityLevel: getRandomCategoryId(CategoryType.INTERACTIVITY_LEVEL, "kinetic-narrative"),
        lengthTag: getRandomCategoryId(CategoryType.LENGTH_TAG, "long-form"),
      },
      ageRatingCategoryId: getRandomCategoryId(CategoryType.AGE_RATING, "all-ages"),
      status: NovelStatus.PUBLISHED,
      accessLevel: NovelAccessLevel.PUBLIC,
      isCompleted: true,
      endingType: NovelEndingType.SINGLE_ENDING,
      sourceType: { type: NovelContentType.ORIGINAL },
      language: getRandomCategoryId(CategoryType.LANGUAGE, "thai")!,
      totalEpisodesCount: 25,
      publishedEpisodesCount: 25,
      stats: {
        viewsCount: 17000,
        uniqueViewersCount: 8000,
        likesCount: 4500,
        commentsCount: 350,
        ratingsCount: 1000,
        averageRating: 4.9,
        followersCount: 3800,
        sharesCount: 200,
        bookmarksCount: 600,
        totalWords: 100000,
        estimatedReadingTimeMinutes: 400,
        completionRate: 90,
        lastPublishedEpisodeAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      },
      monetizationSettings: {
        isCoinBasedUnlock: false,
        allowDonations: true,
        isAdSupported: false,
        isPremiumExclusive: false,
      },
      psychologicalAnalysisConfig: {
        allowsPsychologicalAnalysis: true,
        sensitiveChoiceCategoriesBlocked: [getRandomCategoryId(CategoryType.SENSITIVE_CHOICE_TOPIC, "life-altering-decisions")!],
      },
      publishedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      lastContentUpdatedAt: new Date(),
    },
    // นิยายเรื่องที่ 4
    {
      title: "มรดกแห่งดวงดาว",
      slug: "starborn-legacy",
      author: authorId,
      synopsis: "สงครามดวงดาวบังคับให้วีรบุรุษผู้ไม่เต็มใจต้องใช้อาวุธจักรวาลที่อาจช่วยหรือทำลายกาแล็กซี่",
      longDescription: "ท่ามกลางสงครามกาแล็กซีที่ยืดเยื้อ 'เร็กซ์' นักบินอวกาศธรรมดา ได้ค้นพบว่าตนคือผู้สืบทอด 'สตาร์บอร์น' อาวุธโบราณที่มีพลังทำลายล้างสูง เขาต้องเลือกระหว่างการใช้พลังเพื่อสันติภาพ หรือยอมให้มันกลืนกินทุกสิ่ง",
      coverImageUrl: "https://picsum.photos/seed/starborn-legacy/400/600",
      bannerImageUrl: "https://picsum.photos/seed/starborn-legacy-banner/1200/400",
      themeAssignment: {
        mainTheme: { categoryId: getRandomCategoryId(CategoryType.GENRE, "sci-fi")! },
        subThemes: [
          { categoryId: getRandomCategoryId(CategoryType.SUB_GENRE, "space-opera")! },
          { categoryId: getRandomCategoryId(CategoryType.TAG, "action")! },
        ],
        moodAndTone: [
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "intense")!,
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "epic")!,
        ],
        customTags: ["สงครามอวกาศ", "อาวุธโบราณ", "วีรบุรุษ поневоле"],
      },
      narrativeFocus: {
        narrativePacingTags: [getRandomCategoryId(CategoryType.NARRATIVE_PACING, "fast-paced")!],
        primaryConflictTypes: [getRandomCategoryId(CategoryType.PRIMARY_CONFLICT_TYPE, "man-vs-self")!],
        commonTropes: [getRandomCategoryId(CategoryType.COMMON_TROPE, "chosen-one")!],
        lengthTag: getRandomCategoryId(CategoryType.LENGTH_TAG, "long-form"),
      },
      ageRatingCategoryId: getRandomCategoryId(CategoryType.AGE_RATING, "teen-13-plus"),
      status: NovelStatus.DRAFT, // เปลี่ยนเป็น DRAFT เพื่อความหลากหลาย
      accessLevel: NovelAccessLevel.PRIVATE,
      isCompleted: false,
      endingType: NovelEndingType.ONGOING,
      sourceType: { type: NovelContentType.ORIGINAL },
      language: getRandomCategoryId(CategoryType.LANGUAGE, "thai")!,
      totalEpisodesCount: 10,
      publishedEpisodesCount: 0, // Draft ไม่มีตอน published
      stats: {
        viewsCount: 0,
        uniqueViewersCount: 0,
        likesCount: 0,
        commentsCount: 0,
        ratingsCount: 0,
        averageRating: 0,
        followersCount: 0,
        sharesCount: 0,
        bookmarksCount: 0,
        totalWords: 0,
        estimatedReadingTimeMinutes: 0,
        completionRate: 0,
      },
      monetizationSettings: {
        isCoinBasedUnlock: false,
        allowDonations: false,
        isAdSupported: false,
        isPremiumExclusive: false,
      },
      psychologicalAnalysisConfig: { allowsPsychologicalAnalysis: false },
      lastContentUpdatedAt: new Date(),
    },
    // นิยายเรื่องที่ 5 (Steampunk)
    {
      title: "ฟากฟ้าสีชาด",
      slug: "crimson-skies",
      author: authorId,
      synopsis: "ในโลกที่ปกครองด้วยเรือเหาะและอาณาจักรลอยฟ้า นักบินผู้เสื่อมเสียชื่อเสียงมองหาการไถ่บาปด้วยการเปิดโปงการสมคบคิดบนท้องฟ้า",
      longDescription: "กัปตัน 'เอซ' อดีตนักบินแห่งกองทัพเรือเหาะหลวง ถูกใส่ร้ายและขับไล่ออกจากกองทัพ เขาต้องรวบรวมลูกเรือที่ไม่ธรรมดา เพื่อเปิดโปงแผนการร้ายที่ซ่อนอยู่เบื้องหลังม่านเมฆของอาณาจักรลอยฟ้า",
      coverImageUrl: "https://picsum.photos/seed/crimson-skies/400/600",
      bannerImageUrl: "https://picsum.photos/seed/crimson-skies-banner/1200/400",
      themeAssignment: {
        mainTheme: { categoryId: getRandomCategoryId(CategoryType.TAG, "steampunk")! }, // Steampunk เป็น TAG หรือ SUB_GENRE ก็ได้
        subThemes: [
          { categoryId: getRandomCategoryId(CategoryType.TAG, "adventure")! },
          { categoryId: getRandomCategoryId(CategoryType.GENRE, "fantasy")! },
        ],
        moodAndTone: [
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "adventurous")!,
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "heroic")!,
        ],
        customTags: ["เรือเหาะ", "อาณาจักรลอยฟ้า", "การผจญภัย"],
      },
      narrativeFocus: {
        artStyle: getRandomCategoryId(CategoryType.ART_STYLE, "western-cartoon"),
        lengthTag: getRandomCategoryId(CategoryType.LENGTH_TAG, "long-form"),
      },
      ageRatingCategoryId: getRandomCategoryId(CategoryType.AGE_RATING, "teen-13-plus"),
      status: NovelStatus.PUBLISHED,
      accessLevel: NovelAccessLevel.PUBLIC,
      isCompleted: false,
      endingType: NovelEndingType.ONGOING,
      sourceType: { type: NovelContentType.ORIGINAL },
      language: getRandomCategoryId(CategoryType.LANGUAGE, "thai")!,
      totalEpisodesCount: 18,
      publishedEpisodesCount: 12,
      stats: {
        viewsCount: 10000,
        uniqueViewersCount: 4500,
        likesCount: 2600,
        commentsCount: 170,
        ratingsCount: 650,
        averageRating: 4.6,
        followersCount: 2200,
        sharesCount: 90,
        bookmarksCount: 400,
        totalWords: 72000,
        estimatedReadingTimeMinutes: 288,
        completionRate: 50,
        lastPublishedEpisodeAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
      monetizationSettings: {
        isCoinBasedUnlock: true,
        defaultEpisodePriceCoins: 8,
        allowDonations: true,
        isAdSupported: false,
        isPremiumExclusive: false,
      },
      psychologicalAnalysisConfig: { allowsPsychologicalAnalysis: true },
      publishedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
      lastContentUpdatedAt: new Date(),
    },
    // นิยายเรื่องที่ 6 (Mystery/Ocean)
    {
      title: "เสียงสะท้อนจากห้วงลึก",
      slug: "echoes-of-the-deep",
      author: authorId,
      synopsis: "ใต้ผิวน้ำมหาสมุทรซ่อนอารยธรรมโบราณที่คอยปกป้องความลับที่อาจเปลี่ยนโลก จนกระทั่งนักดำน้ำลึกบังเอิญค้นพบมัน",
      longDescription: "'ดร. มารีน' นักสมุทรศาสตร์ ได้รับสัญญาณประหลาดจากใต้ทะเลลึก การเดินทางเพื่อค้นหาต้นตอของสัญญาณนำเธอไปสู่อารยธรรมใต้บาดาลที่หลับใหล และความลับที่อาจสั่นสะเทือนโลกทั้งใบ",
      coverImageUrl: "https://picsum.photos/seed/echoes-deep/400/600",
      themeAssignment: {
        mainTheme: { categoryId: getRandomCategoryId(CategoryType.GENRE, "mystery")! },
        subThemes: [
          { categoryId: getRandomCategoryId(CategoryType.GENRE, "sci-fi")! },
          { categoryId: getRandomCategoryId(CategoryType.TAG, "adventure")! },
        ],
        moodAndTone: [
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "mysterious")!,
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "intriguing")!,
        ],
        customTags: ["ใต้ทะเล", "อารยธรรมโบราณ", "ความลับ"],
      },
      ageRatingCategoryId: getRandomCategoryId(CategoryType.AGE_RATING, "all-ages"),
      status: NovelStatus.PUBLISHED,
      accessLevel: NovelAccessLevel.PUBLIC,
      isCompleted: true,
      endingType: NovelEndingType.OPEN_ENDING,
      sourceType: { type: NovelContentType.ORIGINAL },
      language: getRandomCategoryId(CategoryType.LANGUAGE, "thai")!,
      totalEpisodesCount: 12,
      publishedEpisodesCount: 12,
      stats: {
        viewsCount: 7200,
        uniqueViewersCount: 3000,
        likesCount: 1700,
        commentsCount: 100,
        ratingsCount: 400,
        averageRating: 4.4,
        followersCount: 1500,
        sharesCount: 70,
        bookmarksCount: 250,
        totalWords: 48000,
        estimatedReadingTimeMinutes: 192,
        completionRate: 75,
        lastPublishedEpisodeAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      monetizationSettings: {
        isCoinBasedUnlock: false,
        allowDonations: true,
        isAdSupported: false,
        isPremiumExclusive: false,
      },
      publishedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      lastContentUpdatedAt: new Date(),
    },
    // นิยายเรื่องที่ 7 (Fantasy/Horror - Moonlight Requiem)
    {
      title: "บทเพลงรัตติกาล",
      slug: "moonlight-requiem",
      author: authorId,
      synopsis: "นักไวโอลินต้องคำสาปพเนจรในเมืองใต้แสงจันทร์ บรรเลงบทเพลงปลุกความทรงจำของวิญญาณ และบางครั้งก็ปลุกสิ่งที่มืดมนกว่า",
      longDescription: "'ลูเชียน' นักไวโอลินผู้มีพรสวรรค์แต่ต้องคำสาปให้มีชีวิตอมตะและต้องบรรเลงเพลงให้กับเหล่าวิญญาณในคืนเดือนมืด การเดินทางของเขาเต็มไปด้วยความเศร้า ความหลัง และการเผชิญหน้ากับอสูรกายจากเงา",
      coverImageUrl: "https://picsum.photos/seed/moonlight-requiem/400/600",
      themeAssignment: {
        mainTheme: { categoryId: getRandomCategoryId(CategoryType.GENRE, "fantasy")! },
        subThemes: [
          { categoryId: getRandomCategoryId(CategoryType.GENRE, "horror")! },
          { categoryId: getRandomCategoryId(CategoryType.TAG, "music")! },
        ],
        moodAndTone: [
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "dark")!,
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "melancholic")!,
        ],
        contentWarnings: [
          getRandomCategoryId(CategoryType.CONTENT_WARNING, "horror")!,
          getRandomCategoryId(CategoryType.CONTENT_WARNING, "mature-themes")!,
        ],
        customTags: ["คำสาป", "วิญญาณ", "ดนตรีมรณะ"],
      },
      narrativeFocus: {
        artStyle: getRandomCategoryId(CategoryType.ART_STYLE, "anime"),
        interactivityLevel: getRandomCategoryId(CategoryType.INTERACTIVITY_LEVEL, "highly-interactive"),
        gameplayMechanics: [getRandomCategoryId(CategoryType.GAMEPLAY_MECHANIC, "multiple-endings-mechanic")!],
      },
      ageRatingCategoryId: getRandomCategoryId(CategoryType.AGE_RATING, "mature-18-plus"),
      status: NovelStatus.PUBLISHED,
      accessLevel: NovelAccessLevel.PUBLIC,
      isCompleted: true,
      endingType: NovelEndingType.MULTIPLE_ENDINGS,
      sourceType: { type: NovelContentType.ORIGINAL },
      language: getRandomCategoryId(CategoryType.LANGUAGE, "thai")!,
      totalEpisodesCount: 16,
      publishedEpisodesCount: 16,
      stats: {
        viewsCount: 11000,
        uniqueViewersCount: 5000,
        likesCount: 2900,
        commentsCount: 220,
        ratingsCount: 700,
        averageRating: 4.7,
        followersCount: 2500,
        totalWords: 64000,
        estimatedReadingTimeMinutes: 256,
        completionRate: 83,
        lastPublishedEpisodeAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        sharesCount: 0,
        bookmarksCount: 0,
      },
      monetizationSettings: {
        isCoinBasedUnlock: true,
        defaultEpisodePriceCoins: 12,
        allowDonations: true,
        isAdSupported: false,
        isPremiumExclusive: true,
      },
      publishedAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000),
      lastContentUpdatedAt: new Date(),
    },
    // นิยายเรื่องที่ 8 (Sci-Fi/Techno-thriller - Digital Prophet)
    {
      title: "ศาสดาแห่งโลกดิจิทัล",
      slug: "digital-prophet",
      author: authorId,
      synopsis: "ในอนาคตที่อัลกอริทึมทำนายทุกย่างก้าว นักคณิตศาสตร์นอกกฎหมายเขียนสูตรที่ท้าทายโชคชะตา",
      longDescription: "'อีไล' นักคณิตศาสตร์อัจฉริยะค้นพบช่องโหว่ใน 'เดอะโอราเคิล' AI ที่ควบคุมและทำนายทุกสิ่งในสังคม เขาต้องเผยแพร่ 'โค้ดแห่งอิสรภาพ' ก่อนที่ระบบจะตามรอยเขาเจอ",
      coverImageUrl: "https://picsum.photos/seed/digital-prophet/400/600",
      themeAssignment: {
        mainTheme: { categoryId: getRandomCategoryId(CategoryType.GENRE, "sci-fi")! },
        subThemes: [
          { categoryId: getRandomCategoryId(CategoryType.SUB_GENRE, "techno-thriller")! },
          { categoryId: getRandomCategoryId(CategoryType.THEME, "philosophy")! },
        ],
        moodAndTone: [
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "intense")!,
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "thought-provoking")!,
        ],
        customTags: ["อัลกอริทึม", "อนาคต", "การควบคุม"],
      },
      ageRatingCategoryId: getRandomCategoryId(CategoryType.AGE_RATING, "teen-13-plus"),
      status: NovelStatus.PUBLISHED,
      accessLevel: NovelAccessLevel.PUBLIC,
      isCompleted: false,
      endingType: NovelEndingType.ONGOING,
      sourceType: { type: NovelContentType.ORIGINAL },
      language: getRandomCategoryId(CategoryType.LANGUAGE, "thai")!,
      totalEpisodesCount: 14,
      publishedEpisodesCount: 10,
      stats: {
        viewsCount: 8700,
        uniqueViewersCount: 3800,
        likesCount: 2100,
        commentsCount: 160,
        ratingsCount: 500,
        averageRating: 4.5,
        followersCount: 1900,
        totalWords: 56000,
        estimatedReadingTimeMinutes: 224,
        completionRate: 70,
        lastPublishedEpisodeAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        sharesCount: 0,
        bookmarksCount: 0,
      },
      monetizationSettings: {
        isCoinBasedUnlock: false,
        allowDonations: true,
        isAdSupported: false,
        isPremiumExclusive: false,
      },
      publishedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
      lastContentUpdatedAt: new Date(),
    },
    // นิยายเรื่องที่ 9 (Action/Fantasy - Ashes of the Phoenix)
    {
      title: "เถ้าธุลีแห่งฟีนิกซ์",
      slug: "ashes-of-the-phoenix",
      author: authorId,
      synopsis: "หลังการล่มสลายของจักรวรรดิ นักรบผู้โดดเดี่ยวลุกขึ้นจากซากปรักหักพังเพื่อจุดประกายการปฏิวัติ นำทางด้วยนิมิตแห่งวิหคเพลิง",
      longDescription: "'เฟย์' ผู้รอดชีวิตคนสุดท้ายจากตระกูลองครักษ์ฟีนิกซ์ ต้องรวบรวมเหล่าผู้ต่อต้านเพื่อโค่นล้มจักรพรรดิชั่วร้าย 'มัลakor' และฟื้นฟูความหวังให้กับแผ่นดินด้วยพลังแห่งเปลวเพลิงศักดิ์สิทธิ์",
      coverImageUrl: "https://picsum.photos/seed/ashes-phoenix/400/600",
      themeAssignment: {
        mainTheme: { categoryId: getRandomCategoryId(CategoryType.GENRE, "action")! },
        subThemes: [
          { categoryId: getRandomCategoryId(CategoryType.GENRE, "fantasy")! },
          { categoryId: getRandomCategoryId(CategoryType.THEME, "rebellion")! },
        ],
        moodAndTone: [
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "epic")!,
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "heroic")!,
        ],
        customTags: ["ปฏิวัติ", "จักรวรรดิ", "พลังฟีนิกซ์"],
      },
      narrativeFocus: {
        commonTropes: [getRandomCategoryId(CategoryType.COMMON_TROPE, "chosen-one")!],
      },
      ageRatingCategoryId: getRandomCategoryId(CategoryType.AGE_RATING, "teen-13-plus"),
      status: NovelStatus.PUBLISHED,
      accessLevel: NovelAccessLevel.PUBLIC,
      isCompleted: false,
      endingType: NovelEndingType.ONGOING,
      sourceType: { type: NovelContentType.ORIGINAL },
      language: getRandomCategoryId(CategoryType.LANGUAGE, "thai")!,
      totalEpisodesCount: 22,
      publishedEpisodesCount: 18,
      stats: {
        viewsCount: 13000,
        uniqueViewersCount: 6000,
        likesCount: 3400,
        commentsCount: 250,
        ratingsCount: 800,
        averageRating: 4.7,
        followersCount: 2900,
        totalWords: 88000,
        estimatedReadingTimeMinutes: 352,
        completionRate: 78,
        lastPublishedEpisodeAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        sharesCount: 0,
        bookmarksCount: 0,
      },
      monetizationSettings: {
        isCoinBasedUnlock: true,
        defaultEpisodePriceCoins: 9,
        allowDonations: true,
        isAdSupported: false,
        isPremiumExclusive: false,
      },
      publishedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      lastContentUpdatedAt: new Date(),
    },
    // นิยายเรื่องที่ 10 (Mystery/Fantasy - The Librarian's Code)
    {
      title: "รหัสลับบรรณารักษ์",
      slug: "librarians-code",
      author: authorId,
      synopsis: "ซ่อนอยู่ในห้องสมุดโบราณคือรหัสที่เชื่อมโยงทุกเรื่องราว และบรรณารักษ์ผู้สาบานจะปกป้องมัน",
      longDescription: "'เอลาร่า' บรรณารักษ์แห่งหอสมุดต้องห้าม ค้นพบ 'โคเด็กซ์ อินฟินิตี้' หนังสือที่สามารถเปลี่ยนแปลงความเป็นจริงของเรื่องเล่าต่างๆ เธอต้องปกป้องมันจากสมาคมลับที่ต้องการใช้พลังนี้เพื่อครอบครองโลกวรรณกรรม",
      coverImageUrl: "https://picsum.photos/seed/librarians-code/400/600",
      themeAssignment: {
        mainTheme: { categoryId: getRandomCategoryId(CategoryType.GENRE, "mystery")! },
        subThemes: [
          { categoryId: getRandomCategoryId(CategoryType.GENRE, "fantasy")! },
          { categoryId: getRandomCategoryId(CategoryType.TAG, "library")! },
        ],
        moodAndTone: [
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "intriguing")!,
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "mysterious")!,
        ],
        customTags: ["หนังสือโบราณ", "สมาคมลับ", "ปริศนา"],
      },
      ageRatingCategoryId: getRandomCategoryId(CategoryType.AGE_RATING, "all-ages"),
      status: NovelStatus.PUBLISHED,
      accessLevel: NovelAccessLevel.PUBLIC,
      isCompleted: true,
      endingType: NovelEndingType.SINGLE_ENDING,
      sourceType: { type: NovelContentType.ORIGINAL },
      language: getRandomCategoryId(CategoryType.LANGUAGE, "thai")!,
      totalEpisodesCount: 18,
      publishedEpisodesCount: 18,
      stats: {
        viewsCount: 10500,
        uniqueViewersCount: 4800,
        likesCount: 2500,
        commentsCount: 190,
        ratingsCount: 600,
        averageRating: 4.6,
        followersCount: 2200,
        totalWords: 72000,
        estimatedReadingTimeMinutes: 288,
        completionRate: 80,
        lastPublishedEpisodeAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
        sharesCount: 0,
        bookmarksCount: 0,
      },
      monetizationSettings: {
        isCoinBasedUnlock: false,
        allowDonations: true,
        isAdSupported: false,
        isPremiumExclusive: false,
      },
      publishedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      lastContentUpdatedAt: new Date(),
    },
    // นิยายเรื่องที่ 11 (Fantasy/Time Travel - Chrono Alchemist)
    {
      title: "นักแปรธาตุข้ามเวลา",
      slug: "chrono-alchemist",
      author: authorId,
      synopsis: "นักเล่นแร่แปรธาตุค้นพบวิธีควบคุมเวลา แต่ทุกการเปลี่ยนแปลงในอดีตต้องแลกด้วยการเสียสละในปัจจุบัน",
      longDescription: "'อัลโด' นักเล่นแร่แปรธาตุผู้หมกมุ่นกับการค้นคว้าศิลานักปราชญ์ บังเอิญสร้างอุปกรณ์ที่ทำให้เขาย้อนเวลากลับไปแก้ไขอดีตได้ แต่การกระทำของเขาส่งผลกระทบต่ออนาคตอย่างคาดไม่ถึง",
      coverImageUrl: "https://picsum.photos/seed/chrono-alchemist/400/600",
      themeAssignment: {
        mainTheme: { categoryId: getRandomCategoryId(CategoryType.GENRE, "fantasy")! },
        subThemes: [
          { categoryId: getRandomCategoryId(CategoryType.TAG, "time-travel")! },
          { categoryId: getRandomCategoryId(CategoryType.TAG, "alchemy")! },
        ],
        moodAndTone: [
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "adventurous")!,
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "dramatic")!,
        ],
        customTags: ["การเดินทางข้ามเวลา", "ศิลานักปราชญ์", "ผลกระทบ"],
      },
      narrativeFocus: {
        gameplayMechanics: [
          getRandomCategoryId(CategoryType.GAMEPLAY_MECHANIC, "choice-matters")!,
          getRandomCategoryId(CategoryType.GAMEPLAY_MECHANIC, "multiple-endings-mechanic")!,
        ],
        interactivityLevel: getRandomCategoryId(CategoryType.INTERACTIVITY_LEVEL, "highly-interactive"),
      },
      ageRatingCategoryId: getRandomCategoryId(CategoryType.AGE_RATING, "teen-13-plus"),
      status: NovelStatus.PUBLISHED,
      accessLevel: NovelAccessLevel.PUBLIC,
      isCompleted: false,
      endingType: NovelEndingType.ONGOING,
      sourceType: { type: NovelContentType.ORIGINAL },
      language: getRandomCategoryId(CategoryType.LANGUAGE, "thai")!,
      totalEpisodesCount: 13,
      publishedEpisodesCount: 8,
      stats: {
        viewsCount: 8200,
        uniqueViewersCount: 3500,
        likesCount: 2000,
        commentsCount: 150,
        ratingsCount: 460,
        averageRating: 4.4,
        followersCount: 1800,
        totalWords: 52000,
        estimatedReadingTimeMinutes: 208,
        completionRate: 60,
        lastPublishedEpisodeAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        sharesCount: 0,
        bookmarksCount: 0,
      },
      monetizationSettings: {
        isCoinBasedUnlock: true,
        defaultEpisodePriceCoins: 7,
        allowDonations: true,
        isAdSupported: false,
        isPremiumExclusive: false,
      },
      publishedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
      lastContentUpdatedAt: new Date(),
    },
    // นิยายเรื่องที่ 12 (Sci-Fi/Thriller - Silent Frequency)
    {
      title: "คลื่นความถี่มรณะ",
      slug: "silent-frequency",
      author: authorId,
      synopsis: "วิศวกรวิทยุรับสัญญาณลึกลับที่เผยภัยพิบัติอนาคต และเขาต้องหยุดมันก่อนโลกจะรับฟัง",
      longDescription: "'มาร์ค' วิศวกรวิทยุผู้ทำงานในหอสังเกตการณ์อันโดดเดี่ยว คืนหนึ่งเขาได้รับสัญญาณรบกวนที่ถอดรหัสออกมาเป็นภาพอนาคตอันเลวร้าย เขาต้องแข่งกับเวลาเพื่อเตือนโลก โดยที่ไม่รู้ว่าใครคือมิตรหรือศัตรู",
      coverImageUrl: "https://picsum.photos/seed/silent-frequency/400/600",
      themeAssignment: {
        mainTheme: { categoryId: getRandomCategoryId(CategoryType.GENRE, "sci-fi")! },
        subThemes: [
          { categoryId: getRandomCategoryId(CategoryType.GENRE, "thriller")! },
          { categoryId: getRandomCategoryId(CategoryType.GENRE, "mystery")! },
        ],
        moodAndTone: [
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "suspenseful")!,
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "intense")!,
        ],
        customTags: ["สัญญาณวิทยุ", "ภัยพิบัติ", "การทำนาย"],
      },
      ageRatingCategoryId: getRandomCategoryId(CategoryType.AGE_RATING, "teen-13-plus"),
      status: NovelStatus.PUBLISHED,
      accessLevel: NovelAccessLevel.PUBLIC,
      isCompleted: true,
      endingType: NovelEndingType.SINGLE_ENDING,
      sourceType: { type: NovelContentType.ORIGINAL },
      language: getRandomCategoryId(CategoryType.LANGUAGE, "thai")!,
      totalEpisodesCount: 20,
      publishedEpisodesCount: 20,
      stats: {
        viewsCount: 14000,
        uniqueViewersCount: 6500,
        likesCount: 3700,
        commentsCount: 280,
        ratingsCount: 850,
        averageRating: 4.8,
        followersCount: 3100,
        totalWords: 80000,
        estimatedReadingTimeMinutes: 320,
        completionRate: 88,
        lastPublishedEpisodeAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000),
        sharesCount: 0,
        bookmarksCount: 0,
      },
      monetizationSettings: {
        isCoinBasedUnlock: false,
        allowDonations: true,
        isAdSupported: false,
        isPremiumExclusive: true,
      },
      publishedAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
      lastContentUpdatedAt: new Date(),
    },
    // นิยายเรื่องที่ 13 (Dystopia/Drama - Garden of Glass)
    {
      title: "สวนแก้วกลางเมืองปูน",
      slug: "garden-of-glass",
      author: authorId,
      synopsis: "ในเมืองที่ดอกไม้ถูกสั่งห้าม นักพฤกษศาสตร์หนุ่มสร้างเรือนกระจกลับ และค้นพบชีวิตที่ต่อต้าน",
      longDescription: "โลกอนาคตที่ธรรมชาติถูกจำกัด 'โอไรออน' นักพฤกษศาสตร์ผู้หลงใหลในพืชพรรณ แอบสร้างเรือนกระจกขึ้นในชั้นใต้ดินของตึกร้าง ที่นั่นเขาได้เพาะพันธุ์ดอกไม้ต้องห้าม และมันกลายเป็นสัญลักษณ์แห่งความหวังและการต่อต้านระบอบเผด็จการ",
      coverImageUrl: "https://picsum.photos/seed/garden-glass/400/600",
      themeAssignment: {
        mainTheme: { categoryId: getRandomCategoryId(CategoryType.THEME, "dystopian")! },
        subThemes: [
          { categoryId: getRandomCategoryId(CategoryType.GENRE, "drama")! },
          { categoryId: getRandomCategoryId(CategoryType.THEME, "rebellion")! },
        ],
        moodAndTone: [
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "hopeful")!,
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "defiant")!,
        ],
        customTags: ["ดอกไม้ต้องห้าม", "การต่อต้าน", "ความหวัง"],
      },
      ageRatingCategoryId: getRandomCategoryId(CategoryType.AGE_RATING, "teen-13-plus"),
      status: NovelStatus.PUBLISHED,
      accessLevel: NovelAccessLevel.PUBLIC,
      isCompleted: true,
      endingType: NovelEndingType.OPEN_ENDING,
      sourceType: { type: NovelContentType.ORIGINAL },
      language: getRandomCategoryId(CategoryType.LANGUAGE, "thai")!,
      totalEpisodesCount: 22,
      publishedEpisodesCount: 22,
      stats: {
        viewsCount: 13500,
        uniqueViewersCount: 6200,
        likesCount: 3400,
        commentsCount: 260,
        ratingsCount: 800,
        averageRating: 4.7,
        followersCount: 3000,
        totalWords: 88000,
        estimatedReadingTimeMinutes: 352,
        completionRate: 85,
        lastPublishedEpisodeAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        sharesCount: 0,
        bookmarksCount: 0,
      },
      monetizationSettings: {
        isCoinBasedUnlock: false,
        allowDonations: true,
        isAdSupported: false,
        isPremiumExclusive: false,
      },
      publishedAt: new Date(Date.now() - 240 * 24 * 60 * 60 * 1000),
      lastContentUpdatedAt: new Date(),
    },
    // นิยายเรื่องที่ 14 (Sci-Fi/Music - Quantum Harmony)
    {
      title: "ท่วงทำนองควอนตัม",
      slug: "quantum-harmony",
      author: authorId,
      synopsis: "นักดนตรีและนักฟิสิกส์ร่วมมือค้นพบความถี่เสียงที่เชื่อมต่อมิติ แต่เมื่อเพลงดัง บางสิ่งจากอีกด้านก็ตอบกลับ",
      longDescription: "'อารี' นักไวโอลินอัจฉริยะ และ 'ดร.อีวาน' นักฟิสิกส์ควอนตัม ค้นพบว่าดนตรีบางประเภทสามารถสร้างสะพานเชื่อมไปยังมิติอื่นได้ การทดลองของพวกเขานำไปสู่การค้นพบที่ยิ่งใหญ่ แต่ก็ปลุกสิ่งที่ไ่ม่ควรถูกปลุกขึ้นมาด้วย",
      coverImageUrl: "https://picsum.photos/seed/quantum-harmony/400/600",
      themeAssignment: {
        mainTheme: { categoryId: getRandomCategoryId(CategoryType.GENRE, "sci-fi")! },
        subThemes: [
          { categoryId: getRandomCategoryId(CategoryType.TAG, "music")! },
          { categoryId: getRandomCategoryId(CategoryType.TAG, "multiverse")! },
        ],
        moodAndTone: [
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "innovative")!,
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "suspenseful")!,
        ],
        customTags: ["มิติขนาน", "ดนตรีวิทยาศาสตร์", "การค้นพบ"],
      },
      narrativeFocus: {
        gameplayMechanics: [
          getRandomCategoryId(CategoryType.GAMEPLAY_MECHANIC, "choice-matters")!,
          getRandomCategoryId(CategoryType.GAMEPLAY_MECHANIC, "multiple-endings-mechanic")!,
        ],
        interactivityLevel: getRandomCategoryId(CategoryType.INTERACTIVITY_LEVEL, "highly-interactive"),
      },
      ageRatingCategoryId: getRandomCategoryId(CategoryType.AGE_RATING, "teen-13-plus"),
      status: NovelStatus.PUBLISHED,
      accessLevel: NovelAccessLevel.PUBLIC,
      isCompleted: false,
      endingType: NovelEndingType.ONGOING,
      sourceType: { type: NovelContentType.ORIGINAL },
      language: getRandomCategoryId(CategoryType.LANGUAGE, "thai")!,
      totalEpisodesCount: 15,
      publishedEpisodesCount: 9,
      stats: {
        viewsCount: 9000,
        uniqueViewersCount: 4000,
        likesCount: 2200,
        commentsCount: 170,
        ratingsCount: 520,
        averageRating: 4.5,
        followersCount: 2000,
        totalWords: 60000,
        estimatedReadingTimeMinutes: 240,
        completionRate: 65,
        lastPublishedEpisodeAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        sharesCount: 0,
        bookmarksCount: 0,
      },
      monetizationSettings: {
        isCoinBasedUnlock: true,
        defaultEpisodePriceCoins: 10,
        allowDonations: true,
        isAdSupported: false,
        isPremiumExclusive: false,
      },
      publishedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      lastContentUpdatedAt: new Date(),
    },
    // นิยายเรื่องที่ 15 (Fantasy/Adventure - Midnight Cartographer)
    {
      title: "นักเขียนแผนที่เที่ยงคืน",
      slug: "midnight-cartographer",
      author: authorId,
      synopsis: "นักทำแผนที่สาวพบว่าแผนที่ของเธอเปลี่ยนทุกเที่ยงคืน เผยเมืองซ่อนเร้นและเส้นทางลับสู่อาณาจักรที่ถูกลืม",
      longDescription: "'เซเลน่า' นักทำแผนที่ผู้มีพรสวรรค์ในการวาดแผนที่ที่มีชีวิต แผนที่ของเธอไม่เพียงแต่บอกเส้นทาง แต่ยังเปลี่ยนแปลงไปตามความลับของสถานที่นั้นๆ คืนหนึ่ง แผนที่ของเธอนำทางไปสู่อาณาจักรลึกลับที่สาบสูญ",
      coverImageUrl: "https://picsum.photos/seed/midnight-cartographer/400/600",
      themeAssignment: {
        mainTheme: { categoryId: getRandomCategoryId(CategoryType.GENRE, "fantasy")! },
        subThemes: [
          { categoryId: getRandomCategoryId(CategoryType.TAG, "adventure")! },
          { categoryId: getRandomCategoryId(CategoryType.TAG, "maps")! },
        ],
        moodAndTone: [
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "mysterious")!,
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "whimsical")!,
        ],
        customTags: ["แผนที่วิเศษ", "โลกซ่อนเร้น", "การสำรวจ"],
      },
      ageRatingCategoryId: getRandomCategoryId(CategoryType.AGE_RATING, "all-ages"),
      status: NovelStatus.PUBLISHED,
      accessLevel: NovelAccessLevel.PUBLIC,
      isCompleted: false,
      endingType: NovelEndingType.ONGOING,
      sourceType: { type: NovelContentType.ORIGINAL },
      language: getRandomCategoryId(CategoryType.LANGUAGE, "thai")!,
      totalEpisodesCount: 17,
      publishedEpisodesCount: 11,
      stats: {
        viewsCount: 10200,
        uniqueViewersCount: 4600,
        likesCount: 2600,
        commentsCount: 195,
        ratingsCount: 650,
        averageRating: 4.6,
        followersCount: 2250,
        totalWords: 68000,
        estimatedReadingTimeMinutes: 272,
        completionRate: 60,
        lastPublishedEpisodeAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        sharesCount: 0,
        bookmarksCount: 0,
      },
      monetizationSettings: {
        isCoinBasedUnlock: false,
        allowDonations: true,
        isAdSupported: false,
        isPremiumExclusive: false,
      },
      publishedAt: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000),
      lastContentUpdatedAt: new Date(),
    },
    // นิยายเรื่องที่ 16 (Urban Fantasy - Urban Spirits)
    {
      title: "วิญญาณเมืองกรุง",
      slug: "urban-spirits",
      author: authorId,
      synopsis: "ในกรุงเทพฯยุคดิจิทัล ยังมีวิญญาณเก่าแก่สิงสถิต สาวออฟฟิศผู้มองเห็นพวกมันต้องเรียนรู้ที่จะอยู่ร่วมและไขปริศนา",
      longDescription: "'มีนา' พนักงานออฟฟิศธรรมดาในกรุงเทพฯ ค้นพบว่าตัวเองสามารถมองเห็นและสื่อสารกับเหล่าวิญญาณที่อาศัยอยู่ร่วมกับผู้คนในเมืองใหญ่ เธอต้องเรียนรู้ที่จะใช้พลังนี้เพื่อช่วยเหลือทั้งคนและผี และเปิดโปงความลับดำมืดที่เชื่อมโยงโลกทั้งสองเข้าด้วยกัน",
      coverImageUrl: "https://picsum.photos/seed/urban-spirits/400/600",
      themeAssignment: {
        mainTheme: { categoryId: getRandomCategoryId(CategoryType.SUB_GENRE, "urban-fantasy")! },
        subThemes: [
          { categoryId: getRandomCategoryId(CategoryType.TAG, "supernatural")! },
          { categoryId: getRandomCategoryId(CategoryType.TAG, "thai-culture")! },
        ],
        moodAndTone: [
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "intriguing")!,
          getRandomCategoryId(CategoryType.MOOD_AND_TONE, "modern")!,
        ],
        contentWarnings: [getRandomCategoryId(CategoryType.CONTENT_WARNING, "sensitive-topics")!],
        customTags: ["กรุงเทพ", "ผีเมือง", "พลังพิเศษ"],
      },
      narrativeFocus: {
        gameplayMechanics: [
          getRandomCategoryId(CategoryType.GAMEPLAY_MECHANIC, "choice-matters")!,
          getRandomCategoryId(CategoryType.GAMEPLAY_MECHANIC, "relationship-system")!,
        ],
        interactivityLevel: getRandomCategoryId(CategoryType.INTERACTIVITY_LEVEL, "highly-interactive"),
      },
      ageRatingCategoryId: getRandomCategoryId(CategoryType.AGE_RATING, "teen-13-plus"),
      status: NovelStatus.PUBLISHED,
      accessLevel: NovelAccessLevel.PUBLIC,
      isCompleted: false,
      endingType: NovelEndingType.ONGOING,
      sourceType: { type: NovelContentType.ORIGINAL },
      language: getRandomCategoryId(CategoryType.LANGUAGE, "thai")!,
      totalEpisodesCount: 24,
      publishedEpisodesCount: 10,
      stats: {
        viewsCount: 16000,
        uniqueViewersCount: 7500,
        likesCount: 4100,
        commentsCount: 310,
        ratingsCount: 900,
        averageRating: 4.9,
        followersCount: 3500,
        totalWords: 96000,
        estimatedReadingTimeMinutes: 384,
        completionRate: 40,
        lastPublishedEpisodeAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        sharesCount: 0,
        bookmarksCount: 0,
      },
      monetizationSettings: {
        isCoinBasedUnlock: true,
        defaultEpisodePriceCoins: 5,
        allowDonations: true,
        isAdSupported: false,
        isPremiumExclusive: false,
      },
      psychologicalAnalysisConfig: {
        allowsPsychologicalAnalysis: true,
        sensitiveChoiceCategoriesBlocked: [getRandomCategoryId(CategoryType.SENSITIVE_CHOICE_TOPIC, "life-altering-decisions")!],
      },
      publishedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      lastContentUpdatedAt: new Date(),
    },
  ];
  return sampleNovelsData;
}

/**
 * อัปเดตหรือเพิ่มข้อมูลนิยาย
 */
async function seedNovels() {
  try {
    console.log("🔗 กำลังเชื่อมต่อกับ MongoDB...");
    await dbConnect();
    console.log("✅ [MongoDB] เชื่อมต่อสำเร็จ");

    // 1. เตรียมข้อมูล Category ก่อน
    await seedInitialCategories();

    // 1. เตรียมข้อมูล Category ก่อน
    await seedInitialCategories();

    // 2. ดึง ID ผู้เขียน
    const authorId = await getAuthorId();
    console.log(`✅ ดึง ID ผู้เขียนสำเร็จ: ${authorId} (สำหรับ ${AUTHOR_USERNAME})`);

    // 3. สร้างข้อมูลนิยายตัวอย่าง
    const sampleNovels = await generateSampleNovels(authorId);
    if (sampleNovels.length === 0) {
        console.warn("⚠️ ไม่มีข้อมูลนิยายตัวอย่างให้ seed เนื่องจาก Category IDs อาจจะยังไม่พร้อม");
        return;
    }


    // 4. ดึง Novel model
    const Novel = NovelModel; // เรียกใช้ NovelModel เพื่อให้ได้ Model instance

    console.log("🌱 เริ่มเพิ่มหรืออัปเดตข้อมูลนิยาย...");

    let count = 0;
    for (const novelData of sampleNovels) {
      if (!novelData.slug || !novelData.author) {
        console.warn(`⚠️ ข้อมูลนิยายไม่สมบูรณ์ (ขาด slug หรือ author): ${novelData.title}, ข้าม...`);
        continue;
      }

      // ตรวจสอบว่ามีนิยายที่มี slug นี้และผู้เขียนนี้อยู่แล้วหรือไม่
      // const existingNovel = await Novel.findOne({ slug: novelData.slug, author: novelData.author });

      // ใช้ findOneAndUpdate กับ upsert: true เพื่อสร้างใหม่ถ้าไม่มี หรืออัปเดตถ้ามีอยู่แล้ว
      // และ setDefaultsOnInsert: true เพื่อให้ default values ใน schema ถูกนำมาใช้เมื่อสร้างเอกสารใหม่
      await Novel.findOneAndUpdate(
        { slug: novelData.slug, author: novelData.author }, // query condition
        { $set: novelData }, // update data
        { upsert: true, new: true, setDefaultsOnInsert: true } // options
      );
      count++;
      console.log(`📚 ดำเนินการกับนิยาย: ${novelData.title} (สถานะ: ${novelData.status})`);
    }

    console.log(`🎉 เพิ่มหรืออัปเดตนิยาย ${count} เรื่องสำเร็จ`);
    console.log("✅ การเพิ่มข้อมูลนิยายเสร็จสมบูรณ์");

  } catch (error: any) {
    console.error("❌ เกิดข้อผิดพลาดในการเพิ่มข้อมูลนิยาย:", error.message, error.stack);
  } finally {
    try {
      await mongoose.connection.close();
      console.log("🔌 ปิดการเชื่อมต่อ MongoDB แล้ว");
    } catch (closeError: any) {
      console.error("❌ เกิดข้อผิดพลาดในการปิดการเชื่อมต่อ MongoDB:", closeError.message);
    }
    process.exit(0);
  }
}

// เริ่มการทำงาน
seedNovels();