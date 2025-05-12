// src/app/api/novels/[slug]/route.ts
// ปรับปรุง API Endpoint สำหรับดึงข้อมูลนิยายตาม slug
// รองรับการ populate ข้อมูลที่จำเป็นทั้งหมดสำหรับหน้าแสดงผลนิยายตาม Models

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb"; // ตรวจสอบให้แน่ใจว่า path ถูกต้อง
import NovelModel, { INovel } from "@/backend/models/Novel";
import UserModel, { IUser } from "@/backend/models/User";
import CategoryModel, { ICategory } from "@/backend/models/Category";
import EpisodeModel, { IEpisode } from "@/backend/models/Episode";
import mongoose from "mongoose";

// --- Interfaces สำหรับข้อมูลที่ Populate แล้ว ---

// ข้อมูล Author ที่จำเป็น
interface PopulatedAuthor extends Pick<IUser, "_id" | "username"> {
  profile?: {
    displayName?: string;
    avatar?: string;
  };
  // เพิ่มเติมฟิลด์ที่อาจต้องการ เช่น socialStats.followersCount
  socialStats?: {
    followersCount: number;
  };
}

// ข้อมูล Category ที่จำเป็น
type PopulatedCategory = Pick<ICategory, "_id" | "name" | "slug" | "themeColor" | "iconUrl">;

// ข้อมูล Episode ที่จำเป็นสำหรับแสดงใน List
type PopulatedEpisodeSummary = Pick<
  IEpisode,
  | "_id"
  | "title"
  | "slug"
  | "episodeNumber"
  | "status"
  | "visibility"
  | "isFree"
  | "priceInCoins"
  | "publishedAt"
  | "viewsCount"
  | "likesCount"
  | "commentsCount"
>;

// --- Interface สำหรับข้อมูล Novel ที่ส่งกลับ (Populated) ---
// รวมทุก fields จาก INovel และแทนที่ fields ที่ต้อง populate ด้วย type ที่ populate แล้ว
// Omit fields ที่ไม่ต้องการส่งไป client หรือ fields ที่จะถูกแทนที่
export interface PopulatedNovelForDetailPage
  extends Omit<
    INovel,
    | "author" // จะถูกแทนที่ด้วย PopulatedAuthor
    | "categories" // จะถูกแทนที่ด้วย PopulatedCategory[]
    | "subCategories" // จะถูกแทนที่ด้วย PopulatedCategory[]
    | "embeddingVector" // ไม่ส่งไป client
    | "seo" // อาจจะไม่ส่งทั้งหมด หรือส่งเฉพาะที่จำเป็น
    | "stats" // อาจจะคำนวณบางส่วนที่ client หรือส่งเท่าที่จำเป็น
    | "sentimentAnalysis" // ไม่น่าจะส่งไป client
    | "genreDistribution" // ไม่น่าจะส่งไป client
  > {
  author: PopulatedAuthor | null;
  categories: PopulatedCategory[];
  subCategories?: PopulatedCategory[];
  episodesList: PopulatedEpisodeSummary[]; // เพิ่มรายการตอน (ย่อ)
  formattedViewsCount?: string; // ค่าที่ format แล้ว
  formattedLikesCount?: string;
  formattedFollowersCount?: string;
  formattedWordsCount?: string;
  // relatedNovels?: Pick<INovel, '_id' | 'title' | 'slug' | 'coverImage'>[]; // นิยายที่เกี่ยวข้อง (Optional)
  // --- เพิ่มเติม fields ที่อาจคำนวณหรือต้องการในหน้า UI ---
  firstEpisodeSlug?: string; // Slug ของตอนแรก (ถ้ามี)
}

/**
 * ฟังก์ชัน GET สำหรับดึงข้อมูลนิยายตาม slug
 * @param _req - ข้อมูลคำขอ (ไม่ได้ใช้โดยตรง แต่จำเป็นสำหรับ Next.js)
 * @param params - พารามิเตอร์จาก dynamic route ({ params: { slug: string } })
 * @returns NextResponse พร้อมข้อมูลนิยายหรือข้อผิดพลาด
 */
export async function GET(
  _req: NextRequest, // ใช้ _req เพื่อบ่งบอกว่าไม่ได้ใช้งานโดยตรง
  { params }: { params: { slug: string } }
): Promise<NextResponse<PopulatedNovelForDetailPage | { error: string }>> {
  const { slug } = params; // ดึง slug จาก params
  console.log(`\n--- 📡 [API GET /api/novels/${slug}] ---`);

  if (!slug) {
    console.error("❌ Missing slug parameter.");
    return NextResponse.json({ error: "ต้องระบุ slug ของนิยาย" }, { status: 400 });
  }

  try {
    await dbConnect();
    console.log("✅ Database connected.");

    const Novel = NovelModel();
    const User = UserModel();
    const Category = CategoryModel();
    const Episode = EpisodeModel();

    // 1. ค้นหานิยายหลัก
    const novel = await Novel.findOne({
      slug,
      isDeleted: false,
      // visibility: 'public', // พิจารณาเรื่อง visibility ตาม requirement
    })
      .populate<{ author: PopulatedAuthor | null }>({
        path: "author",
        model: User,
        select: "username profile.displayName profile.avatar socialStats.followersCount", // เลือก field ที่ต้องการ
      })
      .populate<{ categories: PopulatedCategory[] }>({
        path: "categories",
        model: Category,
        select: "name slug themeColor iconUrl", // เลือก field ที่ต้องการ
      })
      .populate<{ subCategories?: PopulatedCategory[] }>({
        path: "subCategories",
        model: Category,
        select: "name slug themeColor iconUrl", // เลือก field ที่ต้องการ
      })
      // เลือก fields ทั้งหมดจาก Novel model ยกเว้น fields ที่ไม่ต้องการส่ง
      .select("-embeddingVector -sentimentAnalysis -genreDistribution")
      .lean() // ใช้ lean() เพื่อ performance ที่ดีขึ้นและได้ plain JS object
      .exec();

    if (!novel) {
      console.warn(`⚠️ Novel with slug "${slug}" not found.`);
      return NextResponse.json({ error: "ไม่พบนิยาย" }, { status: 404 });
    }

    console.log(`✅ Novel "${novel.title}" found.`);

    // 2. ดึงรายการตอน (เลือกเฉพาะ field ที่จำเป็น)
    const episodesList = await Episode.find({
      novel: novel._id,
      isDeleted: false,
      // status: 'published', // อาจจะดึงเฉพาะตอนที่ published แล้ว หรือทั้งหมดแล้วให้ client กรอง
    })
      .sort({ episodeNumber: 1 }) // เรียงตามลำดับตอน
      .select(
        "title slug episodeNumber status visibility isFree priceInCoins publishedAt viewsCount likesCount commentsCount"
      )
      .lean()
      .exec();

    console.log(`✅ Fetched ${episodesList.length} episodes for novel "${novel.title}".`);

    // 3. เตรียมข้อมูลสำหรับ Response
    const responseData: PopulatedNovelForDetailPage = {
      ...(novel as any), // Cast เป็น any ชั่วคราว เนื่องจาก lean() และ populate type อาจไม่ตรงเป๊ะ
      author: novel.author, // `author` ถูก populate แล้ว
      categories: novel.categories, // `categories` ถูก populate แล้ว
      subCategories: novel.subCategories, // `subCategories` ถูก populate แล้ว
      episodesList: episodesList as PopulatedEpisodeSummary[], // Cast episodes ที่ดึงมา
      formattedViewsCount: formatNumber(novel.viewsCount ?? 0),
      formattedLikesCount: formatNumber(novel.likesCount ?? 0),
      formattedFollowersCount: formatNumber(novel.followersCount ?? 0),
      formattedWordsCount: formatNumber(novel.wordsCount ?? 0),
      firstEpisodeSlug: episodesList.length > 0 ? episodesList[0].slug : undefined,
    };

    // (Optional) ลบ fields ที่ไม่ต้องการส่งออกไปจริงๆ จังๆ อีกครั้ง (ถ้าจำเป็น)
    // delete (responseData as any).stats; // ตัวอย่างการลบ

    console.log(`✅ Prepared response data for novel "${novel.title}".`);

    return NextResponse.json(responseData, { status: 200 });

  } catch (error: any) {
    console.error(`❌ Error fetching novel with slug "${slug}":`, error);

    if (error instanceof mongoose.Error.CastError) {
      return NextResponse.json({ error: "รูปแบบ slug หรือ ID ไม่ถูกต้อง" }, { status: 400 });
    }

    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ขณะดึงข้อมูลนิยาย" },
      { status: 500 }
    );
  } finally {
    console.log(`--- 📡 [API GET /api/novels/${slug}] Finished --- \n`);
  }
}

// --- Helper Functions ---

/**
 * ฟังก์ชันช่วยเหลือสำหรับ format ตัวเลขให้อ่านง่าย (K, M)
 * @param num - จำนวนที่ต้องการ format
 * @returns สตริงที่ format แล้ว (เช่น 1.2M, 5K, 123) หรือ '0' ถ้าเป็น null/undefined
 */
function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || num === 0) {
    return "0";
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toString();
}