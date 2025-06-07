// src/scripts/novel-seed.ts

import mongoose, { Types } from "mongoose";
import dbConnect from "@/backend/lib/mongodb";
import NovelModel, {
  INovel,
  NovelStatus,
  NovelAccessLevel,
  NovelEndingType,
  NovelContentType,
  updateWriterStatsAfterNovelChange,
  IMonetizationSettings,
  IPromotionDetails,
  ITrendingStats,
  INovelStats
} from "@/backend/models/Novel";
import CategoryModel, {
  ICategory,
  CategoryType,
} from "@/backend/models/Category";
// ตรวจสอบ path และ import ที่จำเป็น (เพิ่ม IWriterStats, INovelPerformanceStats, IActiveNovelPromotionSummary, ITrendingNovelSummary เพื่อความสมบูรณ์)
import UserModelImport, { IUser, IWriterStats, INovelPerformanceStats, IActiveNovelPromotionSummary, ITrendingNovelSummary } from "@/backend/models/User";
import { config } from "dotenv";

// โหลดตัวแปรสภาพแวดล้อมจากไฟล์ .env
config({ path: ".env" });

const AUTHOR_USERNAME = process.env.AUTHOR_USERNAME;

/**
 * ฟังก์ชันสร้าง Slug ที่ปรับปรุงใหม่ให้รองรับทุกภาษา (รวมถึงภาษาไทยพร้อมสระและวรรณยุกต์ครบถ้วน)
 * @param text - ข้อความที่ต้องการแปลงเป็น Slug
 * @returns {string} - ข้อความที่เป็น Slug
 */
const generateSlug = (text: string): string => {
  if (!text) return `novel-${new Types.ObjectId().toHexString().slice(-8)}`;

  const slug = text
      .toString()
      // 1. ทำให้สตริงอยู่ในรูปแบบ Normalization Form C (NFC) เพื่อรวมอักขระพื้นฐานกับเครื่องหมาย (เช่น สระ, วรรณยุกต์)
      //    ให้เป็นอักขระตัวเดียว ซึ่งช่วยให้การประมวลผลสระไม่ลอยและแม่นยำขึ้น
      .normalize('NFC')
      .toLowerCase()
      // 2. แทนที่ช่องว่างด้วยขีดกลาง
      .replace(/\s+/g, '-')
      // 3. (ส่วนที่แก้ไขสำคัญ) ลบอักขระที่ไม่ใช่ "ตัวอักษร Unicode" (\p{L}), "ตัวเลข Unicode" (\p{N}),
      //    "เครื่องหมาย Unicode" (\p{M} เช่น สระ วรรณยุกต์), หรือ "ขีดกลาง"
      //    การเพิ่ม \p{M} เข้าไปจะช่วยรักษาสระและวรรณยุกต์ของภาษาไทยไว้
      .replace(/[^\p{L}\p{N}\p{M}-]+/gu, '')
      // 4. ยุบขีดกลางที่อาจเกิดขึ้นซ้ำกันหลายตัวให้เหลือเพียงตัวเดียว
      .replace(/--+/g, '-')
      // 5. ลบขีดกลางที่อาจอยู่หน้าสุดหรือท้ายสุดของข้อความ
      .replace(/^-+/, '')
      .replace(/-+$/, '');

  // หากผลลัพธ์เป็นสตริงว่าง (เช่น ชื่อเรื่องมีแต่สัญลักษณ์) ให้สร้าง slug แบบสุ่ม
  if (!slug) {
      return `novel-${new Types.ObjectId().toHexString().slice(-8)}`;
  }

  // จำกัดความยาวสุดท้ายของ slug เพื่อป้องกัน URL ที่ยาวเกินไป
  return slug.substring(0, 280);
};

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
  { name: "ตลก", slug: "comedy", categoryType: CategoryType.GENRE, description: "นิยายเบาสมอง เรียกเสียงหัวเราะ" },
  { name: "ระทึกขวัญ", slug: "thriller", categoryType: CategoryType.GENRE, description: "นิยายตื่นเต้น ระทึกขวัญ" },

  // SUB_GENRE
  { name: "ไฮแฟนตาซี", slug: "high-fantasy", categoryType: CategoryType.SUB_GENRE, description: "แฟนตาซีโลกสมมติ มหากาพย์" },
  { name: "ไซเบอร์พังก์", slug: "cyberpunk", categoryType: CategoryType.SUB_GENRE, description: "โลกอนาคตมืดมน เทคโนโลยีสุดล้ำ" },
  { name: "โรแมนติกคอมเมดี้", slug: "romantic-comedy", categoryType: CategoryType.SUB_GENRE, description: "รักปนเสียงหัวเราะ" },
  { name: "อวกาศ", slug: "space-opera", categoryType: CategoryType.SUB_GENRE, description: "มหากาพย์สงครามอวกาศ" },
  { name: "เออร์เบิร์นแฟนตาซี", slug: "urban-fantasy", categoryType: CategoryType.SUB_GENRE, description: "เวทมนตร์ในโลกปัจจุบัน" },
  { name: "เทคโนทริลเลอร์", slug: "techno-thriller", categoryType: CategoryType.SUB_GENRE, description: "เทคโนโลยีสุดล้ำกับความระทึก" },

  // THEME
  { name: "การแก้แค้น", slug: "revenge", categoryType: CategoryType.THEME, description: "ธีมการแก้แค้น ชำระหนี้" },
  { name: "การเติบโต", slug: "coming-of-age", categoryType: CategoryType.THEME, description: "ธีมการก้าวผ่านวัย ค้นพบตัวเอง" },
  { name: "ดิสโทเปีย", slug: "dystopian", categoryType: CategoryType.THEME, description: "ธีมโลกอนาคตที่มืดมิด" },
  { name: "ปรัชญา", slug: "philosophy", categoryType: CategoryType.THEME, description: "ธีมเชิงปรัชญา ชวนขบคิด" },
  { name: "การกบฏ", slug: "rebellion", categoryType: CategoryType.THEME, description: "ธีมการต่อต้านอำนาจ" },

  // TAG
  { name: "ผจญภัย", slug: "adventure", categoryType: CategoryType.TAG, description: "แท็กสำหรับการผจญภัย" },
  { name: "เวทมนตร์", slug: "magic", categoryType: CategoryType.TAG },
  { name: "การเดินทางข้ามเวลา", slug: "time-travel", categoryType: CategoryType.TAG },
  { name: "โรงเรียน", slug: "school-life", categoryType: CategoryType.TAG },
  { name: "เหนือธรรมชาติ", slug: "supernatural", categoryType: CategoryType.TAG },
  { name: "สตีมพังก์", slug: "steampunk", categoryType: CategoryType.TAG },
  { name: "ดนตรี", slug: "music", categoryType: CategoryType.TAG },
  { name: "การเล่นแร่แปรธาตุ", slug: "alchemy", categoryType: CategoryType.TAG },
  { name: "ห้องสมุด", slug: "library", categoryType: CategoryType.TAG },
  { name: "แผนที่", slug: "maps", categoryType: CategoryType.TAG },
  { name: "พหุจักรวาล", slug: "multiverse", categoryType: CategoryType.TAG },
  { name: "วัฒนธรรมไทย", slug: "thai-culture", categoryType: CategoryType.TAG },

  // MOOD_AND_TONE
  { name: "มืดมน", slug: "dark", categoryType: CategoryType.MOOD_AND_TONE },
  { name: "ตลกขบขัน", slug: "humorous", categoryType: CategoryType.MOOD_AND_TONE },
  { name: "อบอุ่นใจ", slug: "heartwarming", categoryType: CategoryType.MOOD_AND_TONE },
  { name: "เข้มข้น", slug: "intense", categoryType: CategoryType.MOOD_AND_TONE },
  { name: "ลึกลับน่าค้นหา", slug: "mysterious", categoryType: CategoryType.MOOD_AND_TONE },
  { name: "ผจญภัยน่าตื่นเต้น", slug: "adventurous", categoryType: CategoryType.MOOD_AND_TONE },
  { name: "กล้าหาญเยี่ยงวีรชน", slug: "heroic", categoryType: CategoryType.MOOD_AND_TONE },
  { name: "ชวนขบคิด", slug: "thought-provoking", categoryType: CategoryType.MOOD_AND_TONE },
  { name: "ยิ่งใหญ่ตระการตา", slug: "epic", categoryType: CategoryType.MOOD_AND_TONE },
  { name: "เปี่ยมความหวัง", slug: "hopeful", categoryType: CategoryType.MOOD_AND_TONE },
  { name: "ท้าทายอำนาจ", slug: "defiant", categoryType: CategoryType.MOOD_AND_TONE },
  { name: "สร้างสรรค์แปลกใหม่", slug: "innovative", categoryType: CategoryType.MOOD_AND_TONE },
  { name: "ระทึกใจ", slug: "suspenseful", categoryType: CategoryType.MOOD_AND_TONE },
  { name: "แปลกตาชวนฝัน", slug: "whimsical", categoryType: CategoryType.MOOD_AND_TONE },
  { name: "ทันสมัยร่วมสมัย", slug: "modern", categoryType: CategoryType.MOOD_AND_TONE },
  { name: "เศร้าสร้อย", slug: "melancholic", categoryType: CategoryType.MOOD_AND_TONE },
  { name: "น่าพิศวง", slug: "mystical", categoryType: CategoryType.MOOD_AND_TONE },
  { name: "น่าติดตาม", slug: "intriguing", categoryType: CategoryType.MOOD_AND_TONE },

  // CONTENT_WARNING
  { name: "ความรุนแรง", slug: "violence", categoryType: CategoryType.CONTENT_WARNING },
  { name: "เนื้อหาสำหรับผู้ใหญ่", slug: "mature-themes", categoryType: CategoryType.CONTENT_WARNING },
  { name: "สปอยเลอร์", slug: "spoilers", categoryType: CategoryType.CONTENT_WARNING },
  { name: "คำหยาบคาย", slug: "strong-language", categoryType: CategoryType.CONTENT_WARNING },
  { name: "สยองขวัญ (คำเตือน)", slug: "horror-warning", categoryType: CategoryType.CONTENT_WARNING },
  { name: "ประเด็นละเอียดอ่อน", slug: "sensitive-topics", categoryType: CategoryType.CONTENT_WARNING },

  // AGE_RATING
  { name: "ทุกวัย", slug: "all-ages", categoryType: CategoryType.AGE_RATING },
  { name: "วัยรุ่น (13+)", slug: "teen-13-plus", categoryType: CategoryType.AGE_RATING },
  { name: "ผู้ใหญ่ (18+)", slug: "mature-18-plus", categoryType: CategoryType.AGE_RATING },

  // FANDOM
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
  { name: "หลายตอนจบ", slug: "multiple-endings-mechanic", categoryType: CategoryType.GAMEPLAY_MECHANIC },
  { name: "ระบบค่าสถานะ", slug: "stat-based", categoryType: CategoryType.GAMEPLAY_MECHANIC },
  { name: "ระบบความสัมพันธ์", slug: "relationship-system", categoryType: CategoryType.GAMEPLAY_MECHANIC },

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

const seededCategoryIds: { [key in CategoryType]?: { [slug: string]: Types.ObjectId } } = {};

async function seedInitialCategories() {
  console.log("🌱 เริ่มตรวจสอบและเพิ่มข้อมูลหมวดหมู่...");
  const Category = CategoryModel; // ใช้ Model ที่ compile แล้ว

  for (const catData of initialCategoriesData) {
    if (!catData.slug || !catData.categoryType) {
      console.warn(`⚠️ ข้อมูล Category ไม่สมบูรณ์ ข้าม: ${catData.name}`);
      continue;
    }
    let category = await Category.findOne({ slug: catData.slug, categoryType: catData.categoryType });
    if (!category) {
      category = await Category.create({
        name: catData.name,
        slug: catData.slug,
        categoryType: catData.categoryType,
        description: catData.description || `${catData.name} (${catData.categoryType})`,
        isActive: true,
        displayOrder: 0,
        isSystemDefined: true,
      });
      console.log(`    ✅ สร้าง Category: ${category.name} (ประเภท: ${category.categoryType}, Slug: ${category.slug})`);
    }
    if (!seededCategoryIds[catData.categoryType]) {
      seededCategoryIds[catData.categoryType] = {};
    }
    seededCategoryIds[catData.categoryType]![catData.slug] = category._id;
  }
  console.log("🌲 ข้อมูลหมวดหมู่พร้อมใช้งาน");
}

async function getAuthorId(): Promise<Types.ObjectId> {
  if (!AUTHOR_USERNAME) {
    throw new Error("❌ ไม่ได้ตั้งค่า AUTHOR_USERNAME ในไฟล์ .env");
  }
  const UserModel = UserModelImport;
  const author = await UserModel.findOne({ username: AUTHOR_USERNAME });
  if (!author) {
    throw new Error(
      `❌ ไม่พบผู้ใช้ที่เป็นผู้เขียนด้วย username: ${AUTHOR_USERNAME}. กรุณา seed ข้อมูลผู้ใช้ก่อน (admin-seed.ts)`
    );
  }
  if (!author.roles.includes("Writer")) {
    console.warn(`⚠️ ผู้ใช้ ${AUTHOR_USERNAME} ยังไม่มีบทบาท 'Writer'. กำลังเพิ่มให้...`);
    author.roles.push("Writer");

    // **ปรับปรุง** สร้าง writerStats ให้ตรงกับ Schema ล่าสุดใน User.ts
    if (!author.writerStats) {
      author.writerStats = {
        totalViewsReceived: 0,
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
        novelPerformanceSummaries: new mongoose.Types.DocumentArray<INovelPerformanceStats>([]),
        writerSince: new Date(),
        activeNovelPromotions: new mongoose.Types.DocumentArray<IActiveNovelPromotionSummary>([]),
        trendingNovels: new mongoose.Types.DocumentArray<ITrendingNovelSummary>([]),
      };
    } else {
        if(!author.writerStats.writerSince){
            author.writerStats.writerSince = new Date();
        }
        if (!author.writerStats.novelPerformanceSummaries) {
            author.writerStats.novelPerformanceSummaries = new mongoose.Types.DocumentArray<INovelPerformanceStats>([]);
        }
        // ตรวจสอบและเพิ่ม field ใหม่หากยังไม่มี (เพื่อรองรับการ migrate)
        if (!author.writerStats.activeNovelPromotions) {
            author.writerStats.activeNovelPromotions = new mongoose.Types.DocumentArray<IActiveNovelPromotionSummary>([]);
        }
        if (!author.writerStats.trendingNovels) {
            author.writerStats.trendingNovels = new mongoose.Types.DocumentArray<ITrendingNovelSummary>([]);
        }
    }
    await author.save();
    console.log(`    ✅ เพิ่มบทบาท 'Writer' และ writerStats เริ่มต้นให้ ${AUTHOR_USERNAME}`);
  }
  return author._id;
}

function getSafeRandomCategoryId(type: CategoryType, slug?: string): Types.ObjectId | undefined {
  if (slug) {
    const categoryId = seededCategoryIds[type]?.[slug];
    if (!categoryId) {
      console.warn(`⚠️ ไม่พบ Category ID สำหรับ type: ${type}, slug: ${slug}. จะใช้ undefined.`);
    }
    return categoryId;
  }
  const idsForType = seededCategoryIds[type];
  if (idsForType) {
    const slugs = Object.keys(idsForType);
    if (slugs.length > 0) {
      const randomSlug = slugs[Math.floor(Math.random() * slugs.length)];
      return idsForType[randomSlug];
    }
  }
  console.warn(`⚠️ ไม่พบ Category ID ใดๆ สำหรับ type: ${type} แบบสุ่ม. จะใช้ undefined.`);
  return undefined;
}

function getSafeRandomCategoryIds(type: CategoryType, count: number = 1): Types.ObjectId[] {
  const result: Types.ObjectId[] = [];
  const idsForType = seededCategoryIds[type];
  if (idsForType) {
    const availableSlugs = Object.keys(idsForType);
    if (availableSlugs.length === 0) return [];

    const numToPick = Math.min(count, availableSlugs.length);
    const shuffledSlugs = [...availableSlugs].sort(() => 0.5 - Math.random());

    for (let i = 0; i < numToPick; i++) {
      const catId = idsForType[shuffledSlugs[i]];
      if (catId) {
        result.push(catId);
      }
    }
  }
  if (result.length < count && count > 0 && Object.keys(idsForType || {}).length > 0) {
      console.warn(`⚠️ ได้ Category IDs เพียง ${result.length} จากที่ขอ ${count} สำหรับ type: ${type}`);
  }
  return result;
}

async function generateSampleNovels(authorId: Types.ObjectId): Promise<Partial<INovel>[]> {
  if (Object.keys(seededCategoryIds).length === 0) {
    console.error("❌ seededCategoryIds ยังไม่ถูกเตรียมข้อมูล ไม่สามารถสร้าง sample novels ได้");
    return [];
  }
  const reqCat = (type: CategoryType, slug: string): Types.ObjectId => {
    const id = getSafeRandomCategoryId(type, slug);
    if (!id) {
      throw new Error(`Critical: ไม่พบ Category ID ที่จำเป็นสำหรับ type: ${type}, slug: ${slug}.`);
    }
    return id;
  };

  const sampleNovelsData: Partial<INovel>[] = [
    { // นิยายที่ 1: "เงาแห่งนิรันดร์กาล" - ***มีโปรโมชัน***
      title: "เงาแห่งนิรันดร์กาล",
      slug: generateSlug("เงาแห่งนิรันดร์กาล"),
      author: authorId,
      synopsis: "ในโลกที่เวลาบิดเบี้ยวตามเจตจำนงของจอมเวทย์โบราณ นักรบรุ่นใหม่ค้นพบคาถาต้องห้ามที่อาจทำลายมิติแห่งความเป็นจริง",
      longDescription: "การผจญภัยสุดยิ่งใหญ่เริ่มต้นขึ้นเมื่อ 'ไครอส' นักรบหนุ่มผู้มุ่งมั่น ได้รับมรดกเป็นตำราเวทมนตร์โบราณ ความลับที่ถูกผนึกไว้กำลังจะถูกเปิดเผย และมันจะนำพาเขาไปสู่การต่อสู้เพื่อปกป้องสมดุลของเวลาและมิติ",
      coverImageUrl: "https://picsum.photos/seed/shadow-of-eternity/400/600",
      bannerImageUrl: "https://picsum.photos/seed/shadow-of-eternity-banner/1200/400",
      themeAssignment: {
        mainTheme: { categoryId: reqCat(CategoryType.GENRE, "fantasy") },
        subThemes: [
          { categoryId: reqCat(CategoryType.THEME, "coming-of-age") },
          { categoryId: reqCat(CategoryType.TAG, "magic") },
        ].filter(st => st.categoryId) as { categoryId: Types.ObjectId }[],
        moodAndTone: getSafeRandomCategoryIds(CategoryType.MOOD_AND_TONE, 2),
        contentWarnings: [getSafeRandomCategoryId(CategoryType.CONTENT_WARNING, "violence")].filter(Boolean) as Types.ObjectId[],
        customTags: ["เวทมนตร์โบราณ", "พลังมืด", "การเสียสละ"],
      },
      narrativeFocus: {
        narrativePacingTags: [getSafeRandomCategoryId(CategoryType.NARRATIVE_PACING, "fast-paced")].filter(Boolean) as Types.ObjectId[],
        primaryConflictTypes: [getSafeRandomCategoryId(CategoryType.PRIMARY_CONFLICT_TYPE, "man-vs-society")].filter(Boolean) as Types.ObjectId[],
        narrativePerspective: getSafeRandomCategoryId(CategoryType.NARRATIVE_PERSPECTIVE, "third-person"),
        artStyle: getSafeRandomCategoryId(CategoryType.ART_STYLE, "anime"),
        commonTropes: [getSafeRandomCategoryId(CategoryType.COMMON_TROPE, "chosen-one")].filter(Boolean) as Types.ObjectId[],
        interactivityLevel: getSafeRandomCategoryId(CategoryType.INTERACTIVITY_LEVEL, "highly-interactive"),
        lengthTag: getSafeRandomCategoryId(CategoryType.LENGTH_TAG, "long-form"),
      },
      worldBuildingDetails: { loreSummary: "โลกแห่งเอเทเรีย ที่ซึ่งเวทมนตร์คือแก่นแท้ของทุกสิ่ง" },
      ageRatingCategoryId: getSafeRandomCategoryId(CategoryType.AGE_RATING, "teen-13-plus"),
      status: NovelStatus.PUBLISHED,
      accessLevel: NovelAccessLevel.PUBLIC,
      isCompleted: false,
      endingType: NovelEndingType.ONGOING,
      sourceType: { type: NovelContentType.ORIGINAL, originalWorkLanguage: getSafeRandomCategoryId(CategoryType.LANGUAGE, "thai") },
      language: reqCat(CategoryType.LANGUAGE, "thai"),
      totalEpisodesCount: 20,
      publishedEpisodesCount: 15,
      stats: {
        viewsCount: 15000, uniqueViewersCount: 7000, likesCount: 4000, commentsCount: 200, ratingsCount: 900, averageRating: 4.8, followersCount: 3200, sharesCount: 150, bookmarksCount: 500, totalWords: 80000, estimatedReadingTimeMinutes: 320, completionRate: 60, lastPublishedEpisodeAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), purchasesCount: 250,
        discussionThreadCount: 45, // **เพิ่มใหม่**
        trendingStats: { // **เพิ่มใหม่**
            viewsLast24h: 800,
            viewsLast48h: 1500,
            likesLast24h: 120,
            likesLast3Days: 350,
            commentsLast24h: 15,
            newFollowersLastWeek: 50,
            trendingScore: 88.5,
            lastTrendingScoreUpdate: new Date(),
        } as ITrendingStats,
      } as INovelStats,
      monetizationSettings: {
        isCoinBasedUnlock: true,
        defaultEpisodePriceCoins: 10,
        allowDonations: true,
        isAdSupported: false,
        isPremiumExclusive: false,
        activePromotion: {
          isActive: true,
          promotionalPriceCoins: 7,
          promotionStartDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          promotionEndDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
          promotionDescription: "ลดราคาพิเศษ! ฉลองครบรอบการผจญภัยในเอเทเรีย",
        } as IPromotionDetails,
      },
      psychologicalAnalysisConfig: { allowsPsychologicalAnalysis: true },
      collaborationSettings: { allowCoAuthorRequests: false },
      publishedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      lastContentUpdatedAt: new Date(),
    },
    { // นิยายที่ 2: "ความฝันสีนีออน" - ***มีโปรโมชัน***
      title: "ความฝันสีนีออน",
      slug: generateSlug("ความฝันสีนีออน"),
      author: authorId,
      synopsis: "โปรแกรมเมอร์ AI ต้องต่อกรกับบริษัทยักษ์ใหญ่ในเมืองดิสโทเปีย เพื่อเปิดโปงแผนการที่คุกคามเสรีภาพของมนุษยชาติ",
      longDescription: "ในมหานครนีโอ-โตเกียว ปี 2077 'เคนจิ' โปรแกรมเมอร์อัจฉริยะผู้สร้าง AI ที่มีความรู้สึกนึกคิดของตัวเองขึ้นมาโดยบังเอิญ เขาต้องหลบหนีการตามล่าจาก 'คอร์ป X' องค์กรที่ต้องการใช้ AI ของเขาเป็นอาวุธ",
      coverImageUrl: "https://picsum.photos/seed/neon-dreams/400/600",
      bannerImageUrl: "https://picsum.photos/seed/neon-dreams-banner/1200/400",
      themeAssignment: {
        mainTheme: { categoryId: reqCat(CategoryType.GENRE, "sci-fi") },
        subThemes: [
          { categoryId: reqCat(CategoryType.SUB_GENRE, "cyberpunk") },
          { categoryId: reqCat(CategoryType.THEME, "dystopian") },
        ].filter(st => st.categoryId) as { categoryId: Types.ObjectId }[],
        moodAndTone: [
          getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "intense"),
          getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "dark"),
        ].filter(Boolean) as Types.ObjectId[],
        contentWarnings: [
          getSafeRandomCategoryId(CategoryType.CONTENT_WARNING, "violence"),
          getSafeRandomCategoryId(CategoryType.CONTENT_WARNING, "strong-language"),
        ].filter(Boolean) as Types.ObjectId[],
        customTags: ["AI", "เทคโนโลยี", "การต่อสู้"],
      },
      narrativeFocus: {
        narrativePacingTags: [getSafeRandomCategoryId(CategoryType.NARRATIVE_PACING, "fast-paced")].filter(Boolean) as Types.ObjectId[],
        primaryConflictTypes: [getSafeRandomCategoryId(CategoryType.PRIMARY_CONFLICT_TYPE, "man-vs-society")].filter(Boolean) as Types.ObjectId[],
        artStyle: getSafeRandomCategoryId(CategoryType.ART_STYLE, "realistic"),
        gameplayMechanics: [
          getSafeRandomCategoryId(CategoryType.GAMEPLAY_MECHANIC, "choice-matters"),
          getSafeRandomCategoryId(CategoryType.GAMEPLAY_MECHANIC, "multiple-endings-mechanic"),
        ].filter(Boolean) as Types.ObjectId[],
        interactivityLevel: getSafeRandomCategoryId(CategoryType.INTERACTIVITY_LEVEL, "highly-interactive"),
        lengthTag: getSafeRandomCategoryId(CategoryType.LENGTH_TAG, "long-form"),
      },
      ageRatingCategoryId: getSafeRandomCategoryId(CategoryType.AGE_RATING, "mature-18-plus"),
      status: NovelStatus.PUBLISHED,
      accessLevel: NovelAccessLevel.PUBLIC,
      isCompleted: true,
      endingType: NovelEndingType.MULTIPLE_ENDINGS,
      sourceType: { type: NovelContentType.ORIGINAL, originalWorkLanguage: getSafeRandomCategoryId(CategoryType.LANGUAGE, "thai") },
      language: reqCat(CategoryType.LANGUAGE, "thai"),
      totalEpisodesCount: 15,
      publishedEpisodesCount: 15,
      stats: {
        viewsCount: 9500, uniqueViewersCount: 4000, likesCount: 2300, commentsCount: 150, ratingsCount: 600, averageRating: 4.6, followersCount: 2100, sharesCount: 100, bookmarksCount: 300, totalWords: 60000, estimatedReadingTimeMinutes: 240, completionRate: 80, lastPublishedEpisodeAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), purchasesCount: 180,
        discussionThreadCount: 30, // **เพิ่มใหม่**
        trendingStats: { // **เพิ่มใหม่**
            viewsLast24h: 400,
            viewsLast48h: 750,
            likesLast24h: 50,
            likesLast3Days: 150,
            commentsLast24h: 5,
            newFollowersLastWeek: 20,
            trendingScore: 75.2,
            lastTrendingScoreUpdate: new Date(),
        } as ITrendingStats,
      } as INovelStats,
      monetizationSettings: {
        isCoinBasedUnlock: true,
        defaultEpisodePriceCoins: 15,
        allowDonations: true,
        isAdSupported: true,
        isPremiumExclusive: false,
        activePromotion: {
          isActive: true,
          promotionalPriceCoins: 10,
          promotionStartDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          promotionEndDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
          promotionDescription: "ข้อเสนอสุดพิเศษ! ดำดิ่งสู่โลกไซเบอร์พังก์ในราคาสุดคุ้ม",
        } as IPromotionDetails,
      },
      psychologicalAnalysisConfig: { allowsPsychologicalAnalysis: false },
      publishedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
      lastContentUpdatedAt: new Date(),
    },
    { // นิยายที่ 3: "เสียงกระซิบจากพงไพร" - ไม่มีโปรโมชัน, ฟรี
      title: "เสียงกระซิบจากพงไพร",
      slug: generateSlug("เสียงกระซิบจากพงไพร"),
      author: authorId,
      synopsis: "เด็กหญิงคนหนึ่งค้นพบว่าเธอสามารถสื่อสารกับวิญญาณโบราณในป่าลึกลับ แต่พรสวรรค์ของเธอมาพร้อมกับราคาที่อันตราย",
      longDescription: "'ลินิน' เด็กสาวผู้รักธรรมชาติ ค้นพบความสามารถพิเศษในการได้ยินเสียงกระซิบจากเหล่าภูตผีในป่าศักดิ์สิทธิ์ การผจญภัยครั้งนี้จะนำเธอไปสู่ความจริงเกี่ยวกับตำนานโบราณ และภัยคุกคามที่กำลังคืบคลานเข้ามา",
      coverImageUrl: "https://picsum.photos/seed/whispers-forest/400/600",
      bannerImageUrl: "https://picsum.photos/seed/whispers-forest-banner/1200/400",
      themeAssignment: {
        mainTheme: { categoryId: reqCat(CategoryType.GENRE, "fantasy") },
        subThemes: [
          { categoryId: reqCat(CategoryType.TAG, "supernatural") },
          { categoryId: reqCat(CategoryType.THEME, "coming-of-age") },
        ].filter(st => st.categoryId) as { categoryId: Types.ObjectId }[],
        moodAndTone: [
          getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "heartwarming"),
          getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "mystical"),
        ].filter(Boolean) as Types.ObjectId[],
        customTags: ["ภูตผี", "ป่าศักดิ์สิทธิ์", "ตำนาน"],
      },
      narrativeFocus: {
        narrativePacingTags: [getSafeRandomCategoryId(CategoryType.NARRATIVE_PACING, "slow-burn")].filter(Boolean) as Types.ObjectId[],
        artStyle: getSafeRandomCategoryId(CategoryType.ART_STYLE, "western-cartoon"),
        interactivityLevel: getSafeRandomCategoryId(CategoryType.INTERACTIVITY_LEVEL, "kinetic-narrative"),
        lengthTag: getSafeRandomCategoryId(CategoryType.LENGTH_TAG, "long-form"),
      },
      ageRatingCategoryId: getSafeRandomCategoryId(CategoryType.AGE_RATING, "all-ages"),
      status: NovelStatus.PUBLISHED,
      accessLevel: NovelAccessLevel.PUBLIC,
      isCompleted: true,
      endingType: NovelEndingType.SINGLE_ENDING,
      sourceType: { type: NovelContentType.ORIGINAL },
      language: reqCat(CategoryType.LANGUAGE, "thai"),
      totalEpisodesCount: 25,
      publishedEpisodesCount: 25,
      stats: {
        viewsCount: 17000, uniqueViewersCount: 8000, likesCount: 4500, commentsCount: 350, ratingsCount: 1000, averageRating: 4.9, followersCount: 3800, sharesCount: 200, bookmarksCount: 600, totalWords: 100000, estimatedReadingTimeMinutes: 400, completionRate: 90, lastPublishedEpisodeAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), purchasesCount: 0,
        discussionThreadCount: 70, // **เพิ่มใหม่**
        trendingStats: { // **เพิ่มใหม่**
            viewsLast24h: 950,
            viewsLast48h: 1800,
            likesLast24h: 200,
            likesLast3Days: 500,
            commentsLast24h: 25,
            newFollowersLastWeek: 80,
            trendingScore: 92.1,
            lastTrendingScoreUpdate: new Date(),
        } as ITrendingStats,
      } as INovelStats,
      monetizationSettings: {
        isCoinBasedUnlock: false,
        defaultEpisodePriceCoins: 0,
        allowDonations: true,
        isAdSupported: false,
        isPremiumExclusive: false,
      },
      psychologicalAnalysisConfig: {
        allowsPsychologicalAnalysis: true,
        sensitiveChoiceCategoriesBlocked: [getSafeRandomCategoryId(CategoryType.SENSITIVE_CHOICE_TOPIC, "life-altering-decisions")].filter(Boolean) as Types.ObjectId[],
      },
      publishedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      lastContentUpdatedAt: new Date(),
    },
    { // นิยายที่ 4: "มรดกแห่งดวงดาว" - ไม่มีโปรโมชัน, อยู่ในสถานะ draft
      title: "มรดกแห่งดวงดาว",
      slug: generateSlug("มรดกแห่งดวงดาว"),
      author: authorId,
      synopsis: "สงครามดวงดาวบังคับให้วีรบุรุษผู้ไม่เต็มใจต้องใช้อาวุธจักรวาลที่อาจช่วยหรือทำลายกาแล็กซี่",
      longDescription: "ท่ามกลางสงครามกาแล็กซีที่ยืดเยื้อ 'เร็กซ์' นักบินอวกาศธรรมดา ได้ค้นพบว่าตนคือผู้สืบทอด 'สตาร์บอร์น' อาวุธโบราณที่มีพลังทำลายล้างสูง เขาต้องเลือกระหว่างการใช้พลังเพื่อสันติภาพ หรือยอมให้มันกลืนกินทุกสิ่ง",
      coverImageUrl: "https://picsum.photos/seed/starborn-legacy/400/600",
      bannerImageUrl: "https://picsum.photos/seed/starborn-legacy-banner/1200/400",
      themeAssignment: {
        mainTheme: { categoryId: reqCat(CategoryType.GENRE, "sci-fi") },
        subThemes: [
          { categoryId: reqCat(CategoryType.SUB_GENRE, "space-opera") },
          { categoryId: reqCat(CategoryType.GENRE, "action") },
        ].filter(st => st.categoryId) as { categoryId: Types.ObjectId }[],
        moodAndTone: [
          getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "intense"),
          getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "epic"),
        ].filter(Boolean) as Types.ObjectId[],
        customTags: ["สงครามอวกาศ", "อาวุธโบราณ", "วีรบุรุษ поневоле"],
      },
      narrativeFocus: {
        narrativePacingTags: [getSafeRandomCategoryId(CategoryType.NARRATIVE_PACING, "fast-paced")].filter(Boolean) as Types.ObjectId[],
        primaryConflictTypes: [getSafeRandomCategoryId(CategoryType.PRIMARY_CONFLICT_TYPE, "man-vs-self")].filter(Boolean) as Types.ObjectId[],
        commonTropes: [getSafeRandomCategoryId(CategoryType.COMMON_TROPE, "chosen-one")].filter(Boolean) as Types.ObjectId[],
        lengthTag: getSafeRandomCategoryId(CategoryType.LENGTH_TAG, "long-form"),
      },
      ageRatingCategoryId: getSafeRandomCategoryId(CategoryType.AGE_RATING, "teen-13-plus"),
      status: NovelStatus.DRAFT,
      accessLevel: NovelAccessLevel.PRIVATE,
      isCompleted: false,
      endingType: NovelEndingType.ONGOING,
      sourceType: { type: NovelContentType.ORIGINAL },
      language: reqCat(CategoryType.LANGUAGE, "thai"),
      totalEpisodesCount: 10,
      publishedEpisodesCount: 0,
      stats: {
        viewsCount: 0, uniqueViewersCount: 0, likesCount: 0, commentsCount: 0, ratingsCount: 0, averageRating: 0, followersCount: 0, sharesCount: 0, bookmarksCount: 0, totalWords: 0, estimatedReadingTimeMinutes: 0, completionRate: 0, purchasesCount: 0,
        discussionThreadCount: 0, // **เพิ่มใหม่**
        trendingStats: { // **เพิ่มใหม่**
            trendingScore: 0
        } as ITrendingStats,
      } as INovelStats,
      monetizationSettings: { isCoinBasedUnlock: false, defaultEpisodePriceCoins:0, allowDonations: false, isAdSupported: false, isPremiumExclusive: false },
      psychologicalAnalysisConfig: { allowsPsychologicalAnalysis: false },
      lastContentUpdatedAt: new Date(),
    },
    // ... (เพิ่ม field ใหม่ discussionThreadCount และ trendingStats ให้นิยายที่เหลือทั้งหมดในลักษณะเดียวกัน)
    { // นิยายที่ 5: "ฟากฟ้าสีชาด"
        title: "ฟากฟ้าสีชาด",
        slug: generateSlug("ฟากฟ้าสีชาด"),
        author: authorId,
        synopsis: "ในโลกที่ปกครองด้วยเรือเหาะและอาณาจักรลอยฟ้า นักบินผู้เสื่อมเสียชื่อเสียงมองหาการไถ่บาปด้วยการเปิดโปงการสมคบคิดบนท้องฟ้า",
        longDescription: "กัปตัน 'เอซ' อดีตนักบินแห่งกองทัพเรือเหาะหลวง ถูกใส่ร้ายและขับไล่ออกจากกองทัพ เขาต้องรวบรวมลูกเรือที่ไม่ธรรมดา เพื่อเปิดโปงแผนการร้ายที่ซ่อนอยู่เบื้องหลังม่านเมฆของอาณาจักรลอยฟ้า",
        coverImageUrl: "https://picsum.photos/seed/crimson-skies/400/600",
        bannerImageUrl: "https://picsum.photos/seed/crimson-skies-banner/1200/400",
        themeAssignment: {
          mainTheme: { categoryId: reqCat(CategoryType.TAG, "steampunk") },
          subThemes: [
            { categoryId: reqCat(CategoryType.TAG, "adventure") },
            { categoryId: reqCat(CategoryType.GENRE, "fantasy") },
          ].filter(st => st.categoryId) as { categoryId: Types.ObjectId }[],
          moodAndTone: [
            getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "adventurous"),
            getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "heroic"),
          ].filter(Boolean) as Types.ObjectId[],
          customTags: ["เรือเหาะ", "อาณาจักรลอยฟ้า", "การผจญภัย"],
        },
        narrativeFocus: {
          artStyle: getSafeRandomCategoryId(CategoryType.ART_STYLE, "western-cartoon"),
          lengthTag: getSafeRandomCategoryId(CategoryType.LENGTH_TAG, "long-form"),
        },
        ageRatingCategoryId: getSafeRandomCategoryId(CategoryType.AGE_RATING, "teen-13-plus"),
        status: NovelStatus.PUBLISHED,
        accessLevel: NovelAccessLevel.PUBLIC,
        isCompleted: false,
        endingType: NovelEndingType.ONGOING,
        sourceType: { type: NovelContentType.ORIGINAL },
        language: reqCat(CategoryType.LANGUAGE, "thai"),
        totalEpisodesCount: 18,
        publishedEpisodesCount: 12,
        stats: {
          viewsCount: 10000, uniqueViewersCount: 4500, likesCount: 2600, commentsCount: 170, ratingsCount: 650, averageRating: 4.6, followersCount: 2200, sharesCount: 90, bookmarksCount: 400, totalWords: 72000, estimatedReadingTimeMinutes: 288, completionRate: 50, lastPublishedEpisodeAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), purchasesCount: 150,
          discussionThreadCount: 40, // **เพิ่มใหม่**
          trendingStats: { // **เพิ่มใหม่**
              viewsLast24h: 300,
              likesLast24h: 40,
              trendingScore: 70.0,
              lastTrendingScoreUpdate: new Date(),
          } as ITrendingStats,
        } as INovelStats,
        monetizationSettings: { isCoinBasedUnlock: true, defaultEpisodePriceCoins: 8, allowDonations: true, isAdSupported: false, isPremiumExclusive: false, },
        psychologicalAnalysisConfig: { allowsPsychologicalAnalysis: true },
        publishedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
        lastContentUpdatedAt: new Date(),
    },
    { // นิยายที่ 6: "เสียงสะท้อนจากห้วงลึก" - ฟรี
        title: "เสียงสะท้อนจากห้วงลึก",
        slug: generateSlug("เสียงสะท้อนจากห้วงลึก"),
        author: authorId,
        synopsis: "ใต้ผิวน้ำมหาสมุทรซ่อนอารยธรรมโบราณที่คอยปกป้องความลับที่อาจเปลี่ยนโลก จนกระทั่งนักดำน้ำลึกบังเอิญค้นพบมัน",
        longDescription: "'ดร. มารีน' นักสมุทรศาสตร์ ได้รับสัญญาณประหลาดจากใต้ทะเลลึก การเดินทางเพื่อค้นหาต้นตอของสัญญาณนำเธอไปสู่อารยธรรมใต้บาดาลที่หลับใหล และความลับที่อาจสั่นสะเทือนโลกทั้งใบ",
        coverImageUrl: "https://picsum.photos/seed/echoes-deep/400/600",
        themeAssignment: {
          mainTheme: { categoryId: reqCat(CategoryType.GENRE, "mystery") },
          subThemes: [
            { categoryId: reqCat(CategoryType.GENRE, "sci-fi") },
            { categoryId: reqCat(CategoryType.TAG, "adventure") },
          ].filter(st => st.categoryId) as { categoryId: Types.ObjectId }[],
          moodAndTone: [
            getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "mysterious"),
            getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "intriguing"),
          ].filter(Boolean) as Types.ObjectId[],
          customTags: ["ใต้ทะเล", "อารยธรรมโบราณ", "ความลับ"],
        },
        ageRatingCategoryId: getSafeRandomCategoryId(CategoryType.AGE_RATING, "all-ages"),
        status: NovelStatus.PUBLISHED,
        accessLevel: NovelAccessLevel.PUBLIC,
        isCompleted: true,
        endingType: NovelEndingType.OPEN_ENDING,
        sourceType: { type: NovelContentType.ORIGINAL },
        language: reqCat(CategoryType.LANGUAGE, "thai"),
        totalEpisodesCount: 12,
        publishedEpisodesCount: 12,
        stats: {
          viewsCount: 7200, uniqueViewersCount: 3000, likesCount: 1700, commentsCount: 100, ratingsCount: 400, averageRating: 4.4, followersCount: 1500, sharesCount: 70, bookmarksCount: 250, totalWords: 48000, estimatedReadingTimeMinutes: 192, completionRate: 75, lastPublishedEpisodeAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), purchasesCount: 0,
          discussionThreadCount: 25, // **เพิ่มใหม่**
          trendingStats: { // **เพิ่มใหม่**
              viewsLast24h: 600,
              likesLast24h: 90,
              trendingScore: 78.1,
              lastTrendingScoreUpdate: new Date(),
          } as ITrendingStats,
        } as INovelStats,
        monetizationSettings: { isCoinBasedUnlock: false, defaultEpisodePriceCoins: 0, allowDonations: true, isAdSupported: false, isPremiumExclusive: false, },
        publishedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        lastContentUpdatedAt: new Date(),
    },
    { // นิยายที่ 7: "บทเพลงรัตติกาล" - ***มีโปรโมชัน และเป็น Premium Exclusive***
        title: "บทเพลงรัตติกาล",
        slug: generateSlug("บทเพลงรัตติกาล"),
        author: authorId,
        synopsis: "นักไวโอลินต้องคำสาปพเนจรในเมืองใต้แสงจันทร์ บรรเลงบทเพลงปลุกความทรงจำของวิญญาณ และบางครั้งก็ปลุกสิ่งที่มืดมนกว่า",
        longDescription: "'ลูเชียน' นักไวโอลินผู้มีพรสวรรค์แต่ต้องคำสาปให้มีชีวิตอมตะและต้องบรรเลงเพลงให้กับเหล่าวิญญาณในคืนเดือนมืด การเดินทางของเขาเต็มไปด้วยความเศร้า ความหลัง และการเผชิญหน้ากับอสูรกายจากเงา",
        coverImageUrl: "https://picsum.photos/seed/moonlight-requiem/400/600",
        themeAssignment: {
          mainTheme: { categoryId: reqCat(CategoryType.GENRE, "fantasy") },
          subThemes: [
            { categoryId: reqCat(CategoryType.GENRE, "horror") },
            { categoryId: reqCat(CategoryType.TAG, "music") },
          ].filter(st => st.categoryId) as { categoryId: Types.ObjectId }[],
          moodAndTone: [
            getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "dark"),
            getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "melancholic"),
          ].filter(Boolean) as Types.ObjectId[],
          contentWarnings: [
            getSafeRandomCategoryId(CategoryType.CONTENT_WARNING, "horror-warning"),
            getSafeRandomCategoryId(CategoryType.CONTENT_WARNING, "mature-themes"),
          ].filter(Boolean) as Types.ObjectId[],
          customTags: ["คำสาป", "วิญญาณ", "ดนตรีมรณะ"],
        },
        narrativeFocus: {
          artStyle: getSafeRandomCategoryId(CategoryType.ART_STYLE, "anime"),
          interactivityLevel: getSafeRandomCategoryId(CategoryType.INTERACTIVITY_LEVEL, "highly-interactive"),
          gameplayMechanics: [getSafeRandomCategoryId(CategoryType.GAMEPLAY_MECHANIC, "multiple-endings-mechanic")].filter(Boolean) as Types.ObjectId[],
        },
        ageRatingCategoryId: getSafeRandomCategoryId(CategoryType.AGE_RATING, "mature-18-plus"),
        status: NovelStatus.PUBLISHED,
        accessLevel: NovelAccessLevel.PREMIUM_ONLY,
        isCompleted: true,
        endingType: NovelEndingType.MULTIPLE_ENDINGS,
        sourceType: { type: NovelContentType.ORIGINAL },
        language: reqCat(CategoryType.LANGUAGE, "thai"),
        totalEpisodesCount: 16,
        publishedEpisodesCount: 16,
        stats: {
          viewsCount: 11000, uniqueViewersCount: 5000, likesCount: 2900, commentsCount: 220, ratingsCount: 700, averageRating: 4.7, followersCount: 2500, totalWords: 64000, estimatedReadingTimeMinutes: 256, completionRate: 83, lastPublishedEpisodeAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), purchasesCount: 300, sharesCount: 110, bookmarksCount: 550,
          discussionThreadCount: 55, // **เพิ่มใหม่**
          trendingStats: { // **เพิ่มใหม่**
              viewsLast24h: 1200, // โปรโมชัน + premium น่าจะบูสยอด
              likesLast24h: 250,
              trendingScore: 95.0,
              lastTrendingScoreUpdate: new Date(),
          } as ITrendingStats,
        } as INovelStats,
        monetizationSettings: {
          isCoinBasedUnlock: true,
          defaultEpisodePriceCoins: 12,
          allowDonations: true,
          isAdSupported: false,
          isPremiumExclusive: true,
          activePromotion: {
            isActive: true,
            promotionalPriceCoins: 5,
            promotionStartDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            promotionEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            promotionDescription: "โปรฯ สุดสยอง! บทเพลงรัตติกาลราคาพิเศษสำหรับทุกคน (แม้ไม่ใช่ Premium ก็ซื้อได้ในราคานี้)",
          } as IPromotionDetails,
        },
        publishedAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000),
        lastContentUpdatedAt: new Date(),
    },
    { // นิยายที่ 8: "ศาสดาแห่งโลกดิจิทัล" - ฟรี
        title: "ศาสดาแห่งโลกดิจิทัล",
        slug: generateSlug("ศาสดาแห่งโลกดิจิทัล"),
        author: authorId,
        synopsis: "ในอนาคตที่อัลกอริทึมทำนายทุกย่างก้าว นักคณิตศาสตร์นอกกฎหมายเขียนสูตรที่ท้าทายโชคชะตา",
        longDescription: "'อีไล' นักคณิตศาสตร์อัจฉริยะค้นพบช่องโหว่ใน 'เดอะโอราเคิล' AI ที่ควบคุมและทำนายทุกสิ่งในสังคม เขาต้องเผยแพร่ 'โค้ดแห่งอิสรภาพ' ก่อนที่ระบบจะตามรอยเขาเจอ",
        coverImageUrl: "https://picsum.photos/seed/digital-prophet/400/600",
        themeAssignment: {
          mainTheme: { categoryId: reqCat(CategoryType.GENRE, "sci-fi") },
          subThemes: [
            { categoryId: reqCat(CategoryType.SUB_GENRE, "techno-thriller") },
            { categoryId: reqCat(CategoryType.THEME, "philosophy") },
          ].filter(st => st.categoryId) as { categoryId: Types.ObjectId }[],
          moodAndTone: [
            getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "intense"),
            getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "thought-provoking"),
          ].filter(Boolean) as Types.ObjectId[],
          customTags: ["อัลกอริทึม", "อนาคต", "การควบคุม"],
        },
        ageRatingCategoryId: getSafeRandomCategoryId(CategoryType.AGE_RATING, "teen-13-plus"),
        status: NovelStatus.PUBLISHED,
        accessLevel: NovelAccessLevel.PUBLIC,
        isCompleted: false,
        endingType: NovelEndingType.ONGOING,
        sourceType: { type: NovelContentType.ORIGINAL },
        language: reqCat(CategoryType.LANGUAGE, "thai"),
        totalEpisodesCount: 14,
        publishedEpisodesCount: 10,
        stats: {
          viewsCount: 8700, uniqueViewersCount: 3800, likesCount: 2100, commentsCount: 160, ratingsCount: 500, averageRating: 4.5, followersCount: 1900, totalWords: 56000, estimatedReadingTimeMinutes: 224, completionRate: 70, lastPublishedEpisodeAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), purchasesCount: 0, sharesCount: 80, bookmarksCount: 310,
          discussionThreadCount: 35, // **เพิ่มใหม่**
          trendingStats: { // **เพิ่มใหม่**
              trendingScore: 68.3
          } as ITrendingStats,
        } as INovelStats,
        monetizationSettings: { isCoinBasedUnlock: false, defaultEpisodePriceCoins: 0, allowDonations: true, isAdSupported: false, isPremiumExclusive: false, },
        publishedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
        lastContentUpdatedAt: new Date(),
    },
    { // นิยายที่ 9: "เถ้าธุลีแห่งฟีนิกซ์"
        title: "เถ้าธุลีแห่งฟีนิกซ์",
        slug: generateSlug("เถ้าธุลีแห่งฟีนิกซ์"),
        author: authorId,
        synopsis: "หลังการล่มสลายของจักรวรรดิ นักรบผู้โดดเดี่ยวลุกขึ้นจากซากปรักหักพังเพื่อจุดประกายการปฏิวัติ นำทางด้วยนิมิตแห่งวิหคเพลิง",
        longDescription: "'เฟย์' ผู้รอดชีวิตคนสุดท้ายจากตระกูลองครักษ์ฟีนิกซ์ ต้องรวบรวมเหล่าผู้ต่อต้านเพื่อโค่นล้มจักรพรรดิชั่วร้าย 'มัลakor' และฟื้นฟูความหวังให้กับแผ่นดินด้วยพลังแห่งเปลวเพลิงศักดิ์สิทธิ์",
        coverImageUrl: "https://picsum.photos/seed/ashes-phoenix/400/600",
        themeAssignment: {
          mainTheme: { categoryId: reqCat(CategoryType.GENRE, "action") },
          subThemes: [
            { categoryId: reqCat(CategoryType.GENRE, "fantasy") },
            { categoryId: reqCat(CategoryType.THEME, "rebellion") },
          ].filter(st => st.categoryId) as { categoryId: Types.ObjectId }[],
          moodAndTone: [
            getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "epic"),
            getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "heroic"),
          ].filter(Boolean) as Types.ObjectId[],
          customTags: ["ปฏิวัติ", "จักรวรรดิ", "พลังฟีนิกซ์"],
        },
        narrativeFocus: {
          commonTropes: [getSafeRandomCategoryId(CategoryType.COMMON_TROPE, "chosen-one")].filter(Boolean) as Types.ObjectId[],
        },
        ageRatingCategoryId: getSafeRandomCategoryId(CategoryType.AGE_RATING, "teen-13-plus"),
        status: NovelStatus.PUBLISHED,
        accessLevel: NovelAccessLevel.PUBLIC,
        isCompleted: false,
        endingType: NovelEndingType.ONGOING,
        sourceType: { type: NovelContentType.ORIGINAL },
        language: reqCat(CategoryType.LANGUAGE, "thai"),
        totalEpisodesCount: 22,
        publishedEpisodesCount: 18,
        stats: {
          viewsCount: 13000, uniqueViewersCount: 6000, likesCount: 3400, commentsCount: 250, ratingsCount: 800, averageRating: 4.7, followersCount: 2900, totalWords: 88000, estimatedReadingTimeMinutes: 352, completionRate: 78, lastPublishedEpisodeAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), purchasesCount: 120, sharesCount: 130, bookmarksCount: 480,
          discussionThreadCount: 50, // **เพิ่มใหม่**
          trendingStats: { // **เพิ่มใหม่**
              viewsLast24h: 750,
              likesLast24h: 110,
              trendingScore: 85.0,
              lastTrendingScoreUpdate: new Date(),
          } as ITrendingStats,
        } as INovelStats,
        monetizationSettings: { isCoinBasedUnlock: true, defaultEpisodePriceCoins: 9, allowDonations: true, isAdSupported: false, isPremiumExclusive: false, },
        publishedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        lastContentUpdatedAt: new Date(),
    },
    { // นิยายที่ 10: "รหัสลับบรรณารักษ์" - ฟรี
        title: "รหัสลับบรรณารักษ์",
        slug: generateSlug("รหัสลับบรรณารักษ์"),
        author: authorId,
        synopsis: "ซ่อนอยู่ในห้องสมุดโบราณคือรหัสที่เชื่อมโยงทุกเรื่องราว และบรรณารักษ์ผู้สาบานจะปกป้องมัน",
        longDescription: "'เอลาร่า' บรรณารักษ์แห่งหอสมุดต้องห้าม ค้นพบ 'โคเด็กซ์ อินฟินิตี้' หนังสือที่สามารถเปลี่ยนแปลงความเป็นจริงของเรื่องเล่าต่างๆ เธอต้องปกป้องมันจากสมาคมลับที่ต้องการใช้พลังนี้เพื่อครอบครองโลกวรรณกรรม",
        coverImageUrl: "https://picsum.photos/seed/librarians-code/400/600",
        themeAssignment: {
          mainTheme: { categoryId: reqCat(CategoryType.GENRE, "mystery") },
          subThemes: [
            { categoryId: reqCat(CategoryType.GENRE, "fantasy") },
            { categoryId: reqCat(CategoryType.TAG, "library") },
          ].filter(st => st.categoryId) as { categoryId: Types.ObjectId }[],
          moodAndTone: [
            getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "intriguing"),
            getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "mysterious"),
          ].filter(Boolean) as Types.ObjectId[],
          customTags: ["หนังสือโบราณ", "สมาคมลับ", "ปริศนา"],
        },
        ageRatingCategoryId: getSafeRandomCategoryId(CategoryType.AGE_RATING, "all-ages"),
        status: NovelStatus.PUBLISHED,
        accessLevel: NovelAccessLevel.PUBLIC,
        isCompleted: true,
        endingType: NovelEndingType.SINGLE_ENDING,
        sourceType: { type: NovelContentType.ORIGINAL },
        language: reqCat(CategoryType.LANGUAGE, "thai"),
        totalEpisodesCount: 18,
        publishedEpisodesCount: 18,
        stats: {
          viewsCount: 10500, uniqueViewersCount: 4800, likesCount: 2500, commentsCount: 190, ratingsCount: 600, averageRating: 4.6, followersCount: 2200, totalWords: 72000, estimatedReadingTimeMinutes: 288, completionRate: 80, lastPublishedEpisodeAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), purchasesCount: 0, sharesCount: 95, bookmarksCount: 350,
          discussionThreadCount: 42, // **เพิ่มใหม่**
          trendingStats: { // **เพิ่มใหม่**
              trendingScore: 72.5
          } as ITrendingStats,
        } as INovelStats,
        monetizationSettings: { isCoinBasedUnlock: false, defaultEpisodePriceCoins: 0, allowDonations: true, isAdSupported: false, isPremiumExclusive: false, },
        publishedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        lastContentUpdatedAt: new Date(),
    },
    { // นิยายที่ 11: "นักแปรธาตุข้ามเวลา"
        title: "นักแปรธาตุข้ามเวลา",
        slug: generateSlug("นักแปรธาตุข้ามเวลา"),
        author: authorId,
        synopsis: "นักเล่นแร่แปรธาตุค้นพบวิธีควบคุมเวลา แต่ทุกการเปลี่ยนแปลงในอดีตต้องแลกด้วยการเสียสละในปัจจุบัน",
        longDescription: "'อัลโด' นักเล่นแร่แปรธาตุผู้หมกมุ่นกับการค้นคว้าศิลานักปราชญ์ บังเอิญสร้างอุปกรณ์ที่ทำให้เขาย้อนเวลากลับไปแก้ไขอดีตได้ แต่การกระทำของเขาส่งผลกระทบต่ออนาคตอย่างคาดไม่ถึง",
        coverImageUrl: "https://picsum.photos/seed/chrono-alchemist/400/600",
        themeAssignment: {
          mainTheme: { categoryId: reqCat(CategoryType.GENRE, "fantasy") },
          subThemes: [
            { categoryId: reqCat(CategoryType.TAG, "time-travel") },
            { categoryId: reqCat(CategoryType.TAG, "alchemy") },
          ].filter(st => st.categoryId) as { categoryId: Types.ObjectId }[],
          moodAndTone: [
            getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "adventurous"),
            getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "intense"),
          ].filter(Boolean) as Types.ObjectId[],
          customTags: ["การเดินทางข้ามเวลา", "ศิลานักปราชญ์", "ผลกระทบ"],
        },
        narrativeFocus: {
          gameplayMechanics: [
            getSafeRandomCategoryId(CategoryType.GAMEPLAY_MECHANIC, "choice-matters"),
            getSafeRandomCategoryId(CategoryType.GAMEPLAY_MECHANIC, "multiple-endings-mechanic"),
          ].filter(Boolean) as Types.ObjectId[],
          interactivityLevel: getSafeRandomCategoryId(CategoryType.INTERACTIVITY_LEVEL, "highly-interactive"),
        },
        ageRatingCategoryId: getSafeRandomCategoryId(CategoryType.AGE_RATING, "teen-13-plus"),
        status: NovelStatus.PUBLISHED,
        accessLevel: NovelAccessLevel.PUBLIC,
        isCompleted: false,
        endingType: NovelEndingType.ONGOING,
        sourceType: { type: NovelContentType.ORIGINAL },
        language: reqCat(CategoryType.LANGUAGE, "thai"),
        totalEpisodesCount: 13,
        publishedEpisodesCount: 8,
        stats: {
          viewsCount: 8200, uniqueViewersCount: 3500, likesCount: 2000, commentsCount: 150, ratingsCount: 460, averageRating: 4.4, followersCount: 1800, totalWords: 52000, estimatedReadingTimeMinutes: 208, completionRate: 60, lastPublishedEpisodeAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), purchasesCount: 90, sharesCount: 60, bookmarksCount: 280,
          discussionThreadCount: 33, // **เพิ่มใหม่**
          trendingStats: { // **เพิ่มใหม่**
              trendingScore: 65.8
          } as ITrendingStats,
        } as INovelStats,
        monetizationSettings: { isCoinBasedUnlock: true, defaultEpisodePriceCoins: 7, allowDonations: true, isAdSupported: false, isPremiumExclusive: false, },
        publishedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
        lastContentUpdatedAt: new Date(),
    },
    { // นิยายที่ 12: "คลื่นความถี่มรณะ" - Premium Exclusive
        title: "คลื่นความถี่มรณะ",
        slug: generateSlug("คลื่นความถี่มรณะ"),
        author: authorId,
        synopsis: "วิศวกรวิทยุรับสัญญาณลึกลับที่เผยภัยพิบัติอนาคต และเขาต้องหยุดมันก่อนโลกจะรับฟัง",
        longDescription: "'มาร์ค' วิศวกรวิทยุผู้ทำงานในหอสังเกตการณ์อันโดดเดี่ยว คืนหนึ่งเขาได้รับสัญญาณรบกวนที่ถอดรหัสออกมาเป็นภาพอนาคตอันเลวร้าย เขาต้องแข่งกับเวลาเพื่อเตือนโลก โดยที่ไม่รู้ว่าใครคือมิตรหรือศัตรู",
        coverImageUrl: "https://picsum.photos/seed/silent-frequency/400/600",
        themeAssignment: {
          mainTheme: { categoryId: reqCat(CategoryType.GENRE, "sci-fi") },
          subThemes: [
            { categoryId: reqCat(CategoryType.GENRE, "thriller") },
            { categoryId: reqCat(CategoryType.GENRE, "mystery") },
          ].filter(st => st.categoryId) as { categoryId: Types.ObjectId }[],
          moodAndTone: [
            getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "suspenseful"),
            getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "intense"),
          ].filter(Boolean) as Types.ObjectId[],
          customTags: ["สัญญาณวิทยุ", "ภัยพิบัติ", "การทำนาย"],
        },
        ageRatingCategoryId: getSafeRandomCategoryId(CategoryType.AGE_RATING, "teen-13-plus"),
        status: NovelStatus.PUBLISHED,
        accessLevel: NovelAccessLevel.PREMIUM_ONLY,
        isCompleted: true,
        endingType: NovelEndingType.SINGLE_ENDING,
        sourceType: { type: NovelContentType.ORIGINAL },
        language: reqCat(CategoryType.LANGUAGE, "thai"),
        totalEpisodesCount: 20,
        publishedEpisodesCount: 20,
        stats: {
          viewsCount: 14000, uniqueViewersCount: 6500, likesCount: 3700, commentsCount: 280, ratingsCount: 850, averageRating: 4.8, followersCount: 3100, totalWords: 80000, estimatedReadingTimeMinutes: 320, completionRate: 88, lastPublishedEpisodeAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000), purchasesCount: 0, sharesCount: 140, bookmarksCount: 600,
          discussionThreadCount: 60, // **เพิ่มใหม่**
          trendingStats: { // **เพิ่มใหม่**
              trendingScore: 89.9
          } as ITrendingStats,
        } as INovelStats,
        monetizationSettings: { isCoinBasedUnlock: false, defaultEpisodePriceCoins: 0, allowDonations: true, isAdSupported: false, isPremiumExclusive: true, },
        publishedAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
        lastContentUpdatedAt: new Date(),
    },
    { // นิยายที่ 13: "สวนแก้วกลางเมืองปูน" - ฟรี
        title: "สวนแก้วกลางเมืองปูน",
        slug: generateSlug("สวนแก้วกลางเมืองปูน"),
        author: authorId,
        synopsis: "ในเมืองที่ดอกไม้ถูกสั่งห้าม นักพฤกษศาสตร์หนุ่มสร้างเรือนกระจกลับ และค้นพบชีวิตที่ต่อต้าน",
        longDescription: "โลกอนาคตที่ธรรมชาติถูกจำกัด 'โอไรออน' นักพฤกษศาสตร์ผู้หลงใหลในพืชพรรณ แอบสร้างเรือนกระจกขึ้นในชั้นใต้ดินของตึกร้าง ที่นั่นเขาได้เพาะพันธุ์ดอกไม้ต้องห้าม และมันกลายเป็นสัญลักษณ์แห่งความหวังและการต่อต้านระบอบเผด็จการ",
        coverImageUrl: "https://picsum.photos/seed/garden-glass/400/600",
        themeAssignment: {
          mainTheme: { categoryId: reqCat(CategoryType.THEME, "dystopian") },
          subThemes: [
            { categoryId: reqCat(CategoryType.GENRE, "drama") },
            { categoryId: reqCat(CategoryType.THEME, "rebellion") },
          ].filter(st => st.categoryId) as { categoryId: Types.ObjectId }[],
          moodAndTone: [
            getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "hopeful"),
            getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "defiant"),
          ].filter(Boolean) as Types.ObjectId[],
          customTags: ["ดอกไม้ต้องห้าม", "การต่อต้าน", "ความหวัง"],
        },
        ageRatingCategoryId: getSafeRandomCategoryId(CategoryType.AGE_RATING, "teen-13-plus"),
        status: NovelStatus.PUBLISHED,
        accessLevel: NovelAccessLevel.PUBLIC,
        isCompleted: true,
        endingType: NovelEndingType.OPEN_ENDING,
        sourceType: { type: NovelContentType.ORIGINAL },
        language: reqCat(CategoryType.LANGUAGE, "thai"),
        totalEpisodesCount: 22,
        publishedEpisodesCount: 22,
        stats: {
          viewsCount: 13500, uniqueViewersCount: 6200, likesCount: 3400, commentsCount: 260, ratingsCount: 800, averageRating: 4.7, followersCount: 3000, totalWords: 88000, estimatedReadingTimeMinutes: 352, completionRate: 85, lastPublishedEpisodeAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), purchasesCount: 0, sharesCount: 135, bookmarksCount: 520,
          discussionThreadCount: 58, // **เพิ่มใหม่**
          trendingStats: { // **เพิ่มใหม่**
              trendingScore: 84.1
          } as ITrendingStats,
        } as INovelStats,
        monetizationSettings: { isCoinBasedUnlock: false, defaultEpisodePriceCoins: 0, allowDonations: true, isAdSupported: false, isPremiumExclusive: false, },
        publishedAt: new Date(Date.now() - 240 * 24 * 60 * 60 * 1000),
        lastContentUpdatedAt: new Date(),
    },
    { // นิยายที่ 14: "ท่วงทำนองควอนตัม"
        title: "ท่วงทำนองควอนตัม",
        slug: generateSlug("ท่วงทำนองควอนตัม"),
        author: authorId,
        synopsis: "นักดนตรีและนักฟิสิกส์ร่วมมือค้นพบความถี่เสียงที่เชื่อมต่อมิติ แต่เมื่อเพลงดัง บางสิ่งจากอีกด้านก็ตอบกลับ",
        longDescription: "'อารี' นักไวโอลินอัจฉริยะ และ 'ดร.อีวาน' นักฟิสิกส์ควอนตัม ค้นพบว่าดนตรีบางประเภทสามารถสร้างสะพานเชื่อมไปยังมิติอื่นได้ การทดลองของพวกเขานำไปสู่การค้นพบที่ยิ่งใหญ่ แต่ก็ปลุกสิ่งที่ไ่ม่ควรถูกปลุกขึ้นมาด้วย",
        coverImageUrl: "https://picsum.photos/seed/quantum-harmony/400/600",
        themeAssignment: {
          mainTheme: { categoryId: reqCat(CategoryType.GENRE, "sci-fi") },
          subThemes: [
            { categoryId: reqCat(CategoryType.TAG, "music") },
            { categoryId: reqCat(CategoryType.TAG, "multiverse") },
          ].filter(st => st.categoryId) as { categoryId: Types.ObjectId }[],
          moodAndTone: [
            getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "innovative"),
            getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "suspenseful"),
          ].filter(Boolean) as Types.ObjectId[],
          customTags: ["มิติขนาน", "ดนตรีวิทยาศาสตร์", "การค้นพบ"],
        },
        narrativeFocus: {
          gameplayMechanics: [
            getSafeRandomCategoryId(CategoryType.GAMEPLAY_MECHANIC, "choice-matters"),
            getSafeRandomCategoryId(CategoryType.GAMEPLAY_MECHANIC, "multiple-endings-mechanic"),
          ].filter(Boolean) as Types.ObjectId[],
          interactivityLevel: getSafeRandomCategoryId(CategoryType.INTERACTIVITY_LEVEL, "highly-interactive"),
        },
        ageRatingCategoryId: getSafeRandomCategoryId(CategoryType.AGE_RATING, "teen-13-plus"),
        status: NovelStatus.PUBLISHED,
        accessLevel: NovelAccessLevel.PUBLIC,
        isCompleted: false,
        endingType: NovelEndingType.ONGOING,
        sourceType: { type: NovelContentType.ORIGINAL },
        language: reqCat(CategoryType.LANGUAGE, "thai"),
        totalEpisodesCount: 15,
        publishedEpisodesCount: 9,
        stats: {
          viewsCount: 9000, uniqueViewersCount: 4000, likesCount: 2200, commentsCount: 170, ratingsCount: 520, averageRating: 4.5, followersCount: 2000, totalWords: 60000, estimatedReadingTimeMinutes: 240, completionRate: 65, lastPublishedEpisodeAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), purchasesCount: 80, sharesCount: 75, bookmarksCount: 330,
          discussionThreadCount: 38, // **เพิ่มใหม่**
          trendingStats: { // **เพิ่มใหม่**
              viewsLast24h: 650,
              likesLast24h: 100,
              trendingScore: 81.3,
              lastTrendingScoreUpdate: new Date(),
          } as ITrendingStats,
        } as INovelStats,
        monetizationSettings: { isCoinBasedUnlock: true, defaultEpisodePriceCoins: 10, allowDonations: true, isAdSupported: false, isPremiumExclusive: false, },
        publishedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        lastContentUpdatedAt: new Date(),
    },
    { // นิยายที่ 15: "นักเขียนแผนที่เที่ยงคืน" - ฟรี
        title: "นักเขียนแผนที่เที่ยงคืน",
        slug: generateSlug("นักเขียนแผนที่เที่ยงคืน"),
        author: authorId,
        synopsis: "นักทำแผนที่สาวพบว่าแผนที่ของเธอเปลี่ยนทุกเที่ยงคืน เผยเมืองซ่อนเร้นและเส้นทางลับสู่อาณาจักรที่ถูกลืม",
        longDescription: "'เซเลน่า' นักทำแผนที่ผู้มีพรสวรรค์ในการวาดแผนที่ที่มีชีวิต แผนที่ของเธอไม่เพียงแต่บอกเส้นทาง แต่ยังเปลี่ยนแปลงไปตามความลับของสถานที่นั้นๆ คืนหนึ่ง แผนที่ของเธอนำทางไปสู่อาณาจักรลึกลับที่สาบสูญ",
        coverImageUrl: "https://picsum.photos/seed/midnight-cartographer/400/600",
        themeAssignment: {
          mainTheme: { categoryId: reqCat(CategoryType.GENRE, "fantasy") },
          subThemes: [
            { categoryId: reqCat(CategoryType.TAG, "adventure") },
            { categoryId: reqCat(CategoryType.TAG, "maps") },
          ].filter(st => st.categoryId) as { categoryId: Types.ObjectId }[],
          moodAndTone: [
            getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "mysterious"),
            getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "whimsical"),
          ].filter(Boolean) as Types.ObjectId[],
          customTags: ["แผนที่วิเศษ", "โลกซ่อนเร้น", "การสำรวจ"],
        },
        ageRatingCategoryId: getSafeRandomCategoryId(CategoryType.AGE_RATING, "all-ages"),
        status: NovelStatus.PUBLISHED,
        accessLevel: NovelAccessLevel.PUBLIC,
        isCompleted: false,
        endingType: NovelEndingType.ONGOING,
        sourceType: { type: NovelContentType.ORIGINAL },
        language: reqCat(CategoryType.LANGUAGE, "thai"),
        totalEpisodesCount: 17,
        publishedEpisodesCount: 11,
        stats: {
          viewsCount: 10200, uniqueViewersCount: 4600, likesCount: 2600, commentsCount: 195, ratingsCount: 650, averageRating: 4.6, followersCount: 2250, totalWords: 68000, estimatedReadingTimeMinutes: 272, completionRate: 60, lastPublishedEpisodeAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), purchasesCount: 0, sharesCount: 100, bookmarksCount: 400,
          discussionThreadCount: 45, // **เพิ่มใหม่**
          trendingStats: { // **เพิ่มใหม่**
              viewsLast24h: 700,
              likesLast24h: 105,
              trendingScore: 82.0,
              lastTrendingScoreUpdate: new Date(),
          } as ITrendingStats,
        } as INovelStats,
        monetizationSettings: { isCoinBasedUnlock: false, defaultEpisodePriceCoins: 0, allowDonations: true, isAdSupported: false, isPremiumExclusive: false, },
        publishedAt: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000),
        lastContentUpdatedAt: new Date(),
    },
    { // นิยายที่ 16: "วิญญาณเมืองกรุง"
        title: "วิญญาณเมืองกรุง",
        slug: generateSlug("วิญญาณเมืองกรุง"),
        author: authorId,
        synopsis: "ในกรุงเทพฯยุคดิจิทัล ยังมีวิญญาณเก่าแก่สิงสถิต สาวออฟฟิศผู้มองเห็นพวกมันต้องเรียนรู้ที่จะอยู่ร่วมและไขปริศนา",
        longDescription: "'มีนา' พนักงานออฟฟิศธรรมดาในกรุงเทพฯ ค้นพบว่าตัวเองสามารถมองเห็นและสื่อสารกับเหล่าวิญญาณที่อาศัยอยู่ร่วมกับผู้คนในเมืองใหญ่ เธอต้องเรียนรู้ที่จะใช้พลังนี้เพื่อช่วยเหลือทั้งคนและผี และเปิดโปงความลับดำมืดที่เชื่อมโยงโลกทั้งสองเข้าด้วยกัน",
        coverImageUrl: "https://picsum.photos/seed/urban-spirits/400/600",
        themeAssignment: {
          mainTheme: { categoryId: reqCat(CategoryType.SUB_GENRE, "urban-fantasy") },
          subThemes: [
            { categoryId: reqCat(CategoryType.TAG, "supernatural") },
            { categoryId: reqCat(CategoryType.TAG, "thai-culture") },
          ].filter(st => st.categoryId) as { categoryId: Types.ObjectId }[],
          moodAndTone: [
            getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "intriguing"),
            getSafeRandomCategoryId(CategoryType.MOOD_AND_TONE, "modern"),
          ].filter(Boolean) as Types.ObjectId[],
          contentWarnings: [getSafeRandomCategoryId(CategoryType.CONTENT_WARNING, "sensitive-topics")].filter(Boolean) as Types.ObjectId[],
          customTags: ["กรุงเทพ", "ผีเมือง", "พลังพิเศษ"],
        },
        narrativeFocus: {
          gameplayMechanics: [
            getSafeRandomCategoryId(CategoryType.GAMEPLAY_MECHANIC, "choice-matters"),
            getSafeRandomCategoryId(CategoryType.GAMEPLAY_MECHANIC, "relationship-system"),
          ].filter(Boolean) as Types.ObjectId[],
          interactivityLevel: getSafeRandomCategoryId(CategoryType.INTERACTIVITY_LEVEL, "highly-interactive"),
        },
        ageRatingCategoryId: getSafeRandomCategoryId(CategoryType.AGE_RATING, "teen-13-plus"),
        status: NovelStatus.PUBLISHED,
        accessLevel: NovelAccessLevel.PUBLIC,
        isCompleted: false,
        endingType: NovelEndingType.ONGOING,
        sourceType: { type: NovelContentType.ORIGINAL },
        language: reqCat(CategoryType.LANGUAGE, "thai"),
        totalEpisodesCount: 24,
        publishedEpisodesCount: 10,
        stats: {
          viewsCount: 16000, uniqueViewersCount: 7500, likesCount: 4100, commentsCount: 310, ratingsCount: 900, averageRating: 4.9, followersCount: 3500, totalWords: 96000, estimatedReadingTimeMinutes: 384, completionRate: 40, lastPublishedEpisodeAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), purchasesCount: 70, sharesCount: 200, bookmarksCount: 700,
          discussionThreadCount: 65, // **เพิ่มใหม่**
          trendingStats: { // **เพิ่มใหม่**
              viewsLast24h: 1500,
              likesLast24h: 300,
              commentsLast24h: 40,
              newFollowersLastWeek: 120,
              trendingScore: 98.2,
              lastTrendingScoreUpdate: new Date(),
          } as ITrendingStats,
        } as INovelStats,
        monetizationSettings: { isCoinBasedUnlock: true, defaultEpisodePriceCoins: 5, allowDonations: true, isAdSupported: false, isPremiumExclusive: false, },
        psychologicalAnalysisConfig: {
          allowsPsychologicalAnalysis: true,
          sensitiveChoiceCategoriesBlocked: [getSafeRandomCategoryId(CategoryType.SENSITIVE_CHOICE_TOPIC, "life-altering-decisions")].filter(Boolean) as Types.ObjectId[],
        },
        publishedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        lastContentUpdatedAt: new Date(),
    },
  ];
  return sampleNovelsData;
}



async function seedNovels() {
  try {
    console.log("🔗 กำลังเชื่อมต่อกับ MongoDB...");
    await dbConnect();
    console.log("✅ [MongoDB] เชื่อมต่อสำเร็จ");

    await seedInitialCategories();
    const authorId = await getAuthorId();
    console.log(`✅ ดึง ID ผู้เขียนสำเร็จ: ${authorId} (สำหรับ ${AUTHOR_USERNAME})`);

    const sampleNovels = await generateSampleNovels(authorId);
    if (sampleNovels.length === 0 && Object.keys(seededCategoryIds).length > 0) {
        console.warn("⚠️ ไม่มีข้อมูลนิยายตัวอย่างให้ seed แม้ว่า Category IDs จะพร้อมใช้งาน");
    } else if (sampleNovels.length === 0) {
        console.warn("⚠️ ไม่มีข้อมูลนิยายตัวอย่างให้ seed เนื่องจาก Category IDs อาจจะยังไม่พร้อม หรือเกิดข้อผิดพลาดในการดึง Category");
    }

    const Novel = NovelModel;

    console.log("🌱 เริ่มเพิ่มหรืออัปเดตข้อมูลนิยาย...");
    let createdCount = 0;
    let updatedCount = 0;

    for (const novelData of sampleNovels) {
      if (!novelData.title || !novelData.author) {
        console.warn(`⚠️ ข้อมูลนิยายไม่สมบูรณ์ (ขาด title หรือ author): ${novelData.title}, ข้าม...`);
        continue;
      }
      if (!novelData.slug) {
        console.warn(`⚠️ ข้อมูลนิยายไม่สมบูรณ์ (ขาด slug): ${novelData.title}, ข้าม...`);
        continue;
      }

      // ใช้ slug ในการค้นหาเพื่อความแม่นยำและป้องกันการซ้ำซ้อนของชื่อเรื่อง
      const existingNovel = await Novel.findOne({ slug: novelData.slug, author: novelData.author });

      if (existingNovel) {
        // อัปเดตนิยายที่มีอยู่
        Object.keys(novelData).forEach(key => {
          (existingNovel as any)[key] = (novelData as any)[key];
        });
        await existingNovel.save(); // เรียก .save() เพื่อให้ middleware และ validation ทำงาน
        console.log(`📚 อัปเดตนิยาย: ${existingNovel.title} (ID: ${existingNovel._id})`);
        updatedCount++;
      } else {
        // สร้างนิยายใหม่
        const newNovel = new Novel(novelData);
        await newNovel.save(); // เรียก .save() เพื่อให้ middleware และ validation ทำงาน
        console.log(`📚 สร้างนิยายใหม่: ${newNovel.title} (ID: ${newNovel._id}, Slug: ${newNovel.slug})`);
        createdCount++;
      }
    }

    console.log(`🎉 สร้างนิยายใหม่ ${createdCount} เรื่อง, อัปเดตนิยาย ${updatedCount} เรื่อง (ดำเนินการผ่าน .save() เพื่อให้ hooks ทำงาน)`);

    if (authorId && (createdCount > 0 || updatedCount > 0) ) {
        console.log(`🔄 กำลังอัปเดต writerStats สำหรับผู้เขียน ${AUTHOR_USERNAME} (ID: ${authorId}) หลังจากการ seed...`);
        // เรียกใช้ฟังก์ชันเพื่อคำนวณสถิติของนักเขียนใหม่ทั้งหมด
        // การส่ง novelId เป็น null จะบอกให้ฟังก์ชันทำการคำนวณใหม่จากนิยายทุกเรื่องของผู้เขียน
        await updateWriterStatsAfterNovelChange(null, authorId);
        console.log(`✅ อัปเดต writerStats สำหรับผู้เขียน ${AUTHOR_USERNAME} เสร็จสิ้น`);
    } else if (authorId) {
        console.log(`ℹ️ ไม่มีการสร้างหรืออัปเดตนิยาย จึงไม่จำเป็นต้องอัปเดต writerStats เฉพาะกิจสำหรับ ${AUTHOR_USERNAME}`);
    }

    console.log("✅ การเพิ่มข้อมูลนิยายและอัปเดตสถิติผู้เขียน (ถ้ามี) เสร็จสมบูรณ์");

  } catch (error: any) {
    console.error("❌ เกิดข้อผิดพลาดในการเพิ่มข้อมูลนิยาย:", error.message, error.stack);
    if (error.errors) {
        console.error("Validation Errors:", error.errors);
        for (const field in error.errors) {
            console.error(`  - ${field}: ${error.errors[field].message}`);
        }
    }
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

seedNovels();