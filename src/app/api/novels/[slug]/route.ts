// src/app/api/novels/[slug]/route.ts
// ปรับปรุง API Endpoint สำหรับดึงข้อมูลนิยายตาม slug
// รองรับการ populate ข้อมูลที่จำเป็นทั้งหมดสำหรับหน้าแสดงผลนิยายตาม Models

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
  _id: string; // Explicitly type _id as string (lean() converts ObjectId to string)
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
  _id: string; // Explicitly type _id as string
  author: PopulatedAuthor | null;
  categories: PopulatedCategory[];
  subCategories?: PopulatedCategory[];
  episodesList: PopulatedEpisodeSummary[];
  formattedViewsCount?: string;
  formattedLikesCount?: string;
  formattedFollowersCount?: string;
  formattedWordsCount?: string;
  firstEpisodeSlug?: string;
}

/**
 * ฟังก์ชัน GET สำหรับดึงข้อมูลนิยายตาม slug
 * @param _req - ข้อมูลคำขอ (ไม่ได้ใช้โดยตรง แต่จำเป็นสำหรับ Next.js)
 * @param params - พารามิเตอร์จาก dynamic route ({ params: { slug: string } })
 * @returns NextResponse พร้อมข้อมูลนิยายหรือข้อผิดพลาด
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse<PopulatedNovelForDetailPage | { error: string }>> {
  const { slug } = params;
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
    })
      .populate<{ author: PopulatedAuthor | null }>({
        path: "author",
        model: User,
        select: "username profile.displayName profile.avatar socialStats.followersCount",
      })
      .populate<{ categories: PopulatedCategory[] }>({
        path: "categories",
        model: Category,
        select: "name slug themeColor iconUrl",
      })
      .populate<{ subCategories?: PopulatedCategory[] }>({
        path: "subCategories",
        model: Category,
        select: "name slug themeColor iconUrl",
      })
      .select("-embeddingVector -sentimentAnalysis -genreDistribution")
      .lean()
      .exec();

    if (!novel) {
      console.warn(`⚠️ Novel with slug "${slug}" not found.`);
      return NextResponse.json({ error: "ไม่พบนิยาย" }, { status: 404 });
    }

    console.log(`✅ Novel "${novel.title}" found.`);

    // 2. ดึงรายการตอน
    const episodesList = await Episode.find({
      novel: novel._id,
      isDeleted: false,
    })
      .sort({ episodeNumber: 1 })
      .select(
        "title slug episodeNumber status visibility isFree priceInCoins publishedAt viewsCount likesCount commentsCount"
      )
      .lean()
      .exec();

    console.log(`✅ Fetched ${episodesList.length} episodes for novel "${novel.title}".`);

    // 3. เตรียมข้อมูลสำหรับ Response
    const responseData: PopulatedNovelForDetailPage = {
      ...(novel as any),
      _id: novel._id.toString(), // Ensure _id is string
      author: novel.author,
      categories: novel.categories,
      subCategories: novel.subCategories,
      episodesList: episodesList as unknown as PopulatedEpisodeSummary[],
      formattedViewsCount: formatNumber(novel.viewsCount ?? 0),
      formattedLikesCount: formatNumber(novel.likesCount ?? 0),
      formattedFollowersCount: formatNumber(novel.followersCount ?? 0),
      formattedWordsCount: formatNumber(novel.wordsCount ?? 0),
      firstEpisodeSlug: episodesList.length > 0 ? episodesList[0].slug : undefined,
    };

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