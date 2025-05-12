// src/app/api/novels/[slug]/route.ts
// API Endpoint สำหรับดึงข้อมูลนิยายตาม slug
// รองรับการ populate ข้อมูลที่จำเป็นทั้งหมดสำหรับหน้าแสดงผลนิยาย

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
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
  socialStats?: {
    followersCount: number;
  };
}

// ข้อมูล Category ที่จำเป็น
type PopulatedCategory = Pick<ICategory, "_id" | "name" | "slug" | "themeColor" | "iconUrl">;

// ข้อมูล Episode ที่จำเป็นสำหรับแสดงใน List
type PopulatedEpisodeSummary = Pick<
  IEpisode,
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
> & {
  _id: string; // Explicitly type _id as string
};

// --- Interface สำหรับข้อมูล Novel ที่ส่งกลับ (Populated) ---
export interface PopulatedNovelForDetailPage
  extends Omit<
    INovel,
    | "author"
    | "categories"
    | "subCategories"
    | "embeddingVector"
    | "seo"
    | "stats"
    | "sentimentAnalysis"
    | "genreDistribution"
  > {
  _id: string;
  author: PopulatedAuthor | null;
  categories: PopulatedCategory[];
  subCategories?: PopulatedCategory[];
  episodesList: PopulatedEpisodeSummary[];
  formattedViewsCount: string;
  formattedLikesCount: string;
  formattedFollowersCount: string;
  formattedWordsCount: string;
  firstEpisodeSlug?: string;
  firstPublishedAt?: Date; // Optional to match INovel
  updatedAt: Date; // Non-optional, guaranteed by timestamps
  description: string;
  tags: string[];
}

// --- Interface สำหรับการตอบกลับ API ---
interface NovelResponse {
  novel: PopulatedNovelForDetailPage;
}

/**
 * GET: ดึงข้อมูลนิยายตาม slug
 * @param req ข้อมูลคำขอจาก Next.js
 * @returns JSON response พร้อมข้อมูลนิยายหรือข้อผิดพลาด
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Record<string, string | string[]> }
): Promise<NextResponse<NovelResponse | { error: string }>> {
  try {
    // ดึง slug จาก params
    const slug = params.slug;
    if (!slug || Array.isArray(slug)) {
      console.error("❌ ขาดหรือรูปแบบ slug ไม่ถูกต้อง");
      return NextResponse.json({ error: "ต้องระบุ slug ของนิยาย" }, { status: 400 });
    }

    console.log(`\n--- 📡 [API GET /api/novels/${slug}] ---`);

    // เชื่อมต่อฐานข้อมูล
    await dbConnect();
    console.log("✅ เชื่อมต่อฐานข้อมูลสำเร็จ");

    // 1. ค้นหานิยายหลัก
    const novel = await NovelModel()
      .findOne({
        slug,
        isDeleted: false,
      })
      .populate<{ author: PopulatedAuthor | null }>({
        path: "author",
        model: UserModel(),
        select: "username profile.displayName profile.avatar socialStats.followersCount",
      })
      .populate<{ categories: PopulatedCategory[] }>({
        path: "categories",
        model: CategoryModel(),
        select: "name slug themeColor iconUrl",
      })
      .populate<{ subCategories?: PopulatedCategory[] }>({
        path: "subCategories",
        model: CategoryModel(),
        select: "name slug themeColor iconUrl",
      })
      .select("-embeddingVector -sentimentAnalysis -genreDistribution")
      .lean()
      .exec();

    if (!novel) {
      console.warn(`⚠️ ไม่พบนิยายสำหรับ slug "${slug}"`);
      return NextResponse.json({ error: "ไม่พบนิยาย" }, { status: 404 });
    }

    console.log(`✅ พบนิยาย "${novel.title}"`);

    // 2. ดึงรายการตอน
    const rawEpisodesList = await EpisodeModel()
      .find({
        novel: novel._id,
        isDeleted: false,
      })
      .sort({ episodeNumber: 1 })
      .select(
        "_id title slug episodeNumber status visibility isFree priceInCoins publishedAt viewsCount likesCount commentsCount"
      )
      .lean()
      .exec();

    // แปลง episodesList ให้ตรงกับ PopulatedEpisodeSummary
    const episodesList: PopulatedEpisodeSummary[] = rawEpisodesList.map((episode) => ({
      _id: episode._id.toString(),
      title: episode.title,
      slug: episode.slug,
      episodeNumber: episode.episodeNumber,
      status: episode.status,
      visibility: episode.visibility,
      isFree: episode.isFree,
      priceInCoins: episode.priceInCoins,
      publishedAt: episode.publishedAt,
      viewsCount: episode.viewsCount,
      likesCount: episode.likesCount,
      commentsCount: episode.commentsCount,
    }));

    console.log(`✅ ดึง ${episodesList.length} ตอนสำหรับนิยาย "${novel.title}"`);

    // 3. เตรียมข้อมูลสำหรับ Response
    const responseData: PopulatedNovelForDetailPage = {
      ...novel,
      _id: novel._id.toString(),
      author: novel.author,
      categories: novel.categories,
      subCategories: novel.subCategories,
      episodesList,
      formattedViewsCount: formatNumber(novel.viewsCount ?? 0),
      formattedLikesCount: formatNumber(novel.likesCount ?? 0),
      formattedFollowersCount: formatNumber(novel.followersCount ?? 0),
      formattedWordsCount: formatNumber(novel.wordsCount ?? 0),
      firstEpisodeSlug: episodesList.length > 0 ? episodesList[0].slug : undefined,
      firstPublishedAt: novel.firstPublishedAt ? new Date(novel.firstPublishedAt) : undefined, // Handle undefined
      updatedAt: new Date(novel.updatedAt), // Non-optional, guaranteed by timestamps
      description: novel.description || "",
      tags: novel.tags || [],
    };

    console.log(`✅ เตรียมข้อมูลตอบกลับสำหรับนิยาย "${novel.title}"`);

    // สร้างข้อมูลสำหรับการตอบกลับ
    const response: NovelResponse = { novel: responseData };
    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error(`❌ [API] ข้อผิดพลาดใน /api/novels/${params.slug}:`, error);

    if (error instanceof mongoose.Error.CastError) {
      return NextResponse.json({ error: "รูปแบบ slug หรือ ID ไม่ถูกต้อง" }, { status: 400 });
    }

    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ขณะดึงข้อมูลนิยาย" },
      { status: 500 }
    );
  } finally {
    console.log(`--- 📡 [API GET /api/novels/${params.slug}] สิ้นสุด --- \n`);
  }
}

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