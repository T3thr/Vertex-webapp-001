// src/app/api/novels/[slug]/route.ts
// API สำหรับดึงข้อมูลนิยายตาม slug
// รองรับการ populate ข้อมูล author, categories, และ subCategories
// ออกแบบให้ส่งเฉพาะข้อมูลที่จำเป็นสำหรับหน้าแสดงผลนิยาย

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import NovelModel, { INovel } from "@/backend/models/Novel";
import UserModel, { IUser } from "@/backend/models/User";
import CategoryModel, { ICategory } from "@/backend/models/Category";
import mongoose from "mongoose";

// อินเทอร์เฟซสำหรับข้อมูล Author ที่ Populate แล้ว
interface PopulatedAuthor extends Pick<IUser, "_id" | "username"> {
  profile?: {
    displayName?: string;
    avatar?: string;
  };
}

// อินเทอร์เฟซสำหรับข้อมูล Category ที่ Populate แล้ว
type PopulatedCategory = Pick<ICategory, "_id" | "name" | "slug">;

// อินเทอร์เฟซสำหรับข้อมูล Novel ที่ส่งกลับไปยัง client
export interface PopulatedNovelForDetailPage
  extends Omit<
    INovel,
    "author" | "categories" | "subCategories" | "embeddingVector" | "seo" | "stats" | "sentimentAnalysis" | "genreDistribution"
  > {
  author: PopulatedAuthor | null;
  categories: PopulatedCategory[];
  subCategories?: PopulatedCategory[];
  formattedViewsCount?: string;
  formattedLikesCount?: string;
  formattedFollowersCount?: string;
  relatedNovels?: Pick<INovel, "_id" | "title" | "slug" | "coverImage">[];
}

/**
 * GET: ดึงข้อมูลนิยายตาม slug
 * @param req ข้อมูลคำขอจาก Next.js
 * @returns JSON response พร้อมข้อมูลนิยายหรือข้อผิดพลาด
 */
export async function GET(req: NextRequest): Promise<NextResponse<PopulatedNovelForDetailPage | { error: string }>> {
  // ดึง slug จาก URL
  const { pathname } = req.nextUrl;
  const slug = pathname.split("/").pop(); // /api/novels/[slug] -> [slug]
  console.log(`\n--- 📡 [API GET /api/novels/${slug}] ---`);

  // ตรวจสอบว่า slug มีอยู่หรือไม่
  if (!slug) {
    console.error("❌ ไม่พบพารามิเตอร์ slug ในคำขอ");
    return NextResponse.json({ error: "ต้องระบุ slug ของนิยาย" }, { status: 400 });
  }

  try {
    // เชื่อมต่อฐานข้อมูล
    await dbConnect();
    console.log("✅ เชื่อมต่อฐานข้อมูลสำเร็จ");

    const Novel = NovelModel();
    const User = UserModel();
    const Category = CategoryModel();

    // ค้นหานิยายด้วย slug และเงื่อนไขเพิ่มเติม
    const novel = (await Novel.findOne({
      slug,
      isDeleted: false,
      // visibility: 'public', // เปิดใช้งานถ้าต้องการจำกัดเฉพาะนิยายที่เป็น public
    })
      .populate<{ author: PopulatedAuthor | null }>({
        path: "author",
        model: User,
        select: "username profile.displayName profile.avatar",
      })
      .populate<{ categories: PopulatedCategory[] }>({
        path: "categories",
        model: Category,
        select: "name slug",
      })
      .populate<{ subCategories?: PopulatedCategory[] }>({
        path: "subCategories",
        model: Category,
        select: "name slug",
      })
      .select(
        "title slug description coverImage author categories subCategories tags status visibility language isExplicitContent ageRating averageRating ratingsCount viewsCount likesCount followersCount episodesCount publishedEpisodesCount wordsCount settings lastEpisodePublishedAt firstPublishedAt createdAt updatedAt isPremium isDiscounted discountDetails gameElementsSummary"
      )
      .lean()
      .exec()) as PopulatedNovelForDetailPage | null;

    // ตรวจสอบว่านิยายมีอยู่หรือไม่
    if (!novel) {
      console.warn(`⚠️ ไม่พบนิยายที่มี slug "${slug}"`);
      return NextResponse.json({ error: "ไม่พบนิยาย" }, { status: 404 });
    }

    console.log(`✅ ดึงข้อมูลนิยาย "${novel.title}" สำเร็จ`);

    // (Optional) เพิ่มการ format ข้อมูลตัวเลข
    novel.formattedViewsCount = formatNumber(novel.viewsCount);
    novel.formattedLikesCount = formatNumber(novel.likesCount);
    novel.formattedFollowersCount = formatNumber(novel.followersCount);

    // (Optional) ดึงนิยายที่เกี่ยวข้อง
    // novel.relatedNovels = await Novel.find({
    //   categories: { $in: novel.categories.map(c => c._id) },
    //   _id: { $ne: novel._id },
    //   isDeleted: false,
    //   visibility: 'public',
    // })
    //   .limit(5)
    //   .select('title slug coverImage')
    //   .lean();
    // console.log(`✅ ดึงนิยายที่เกี่ยวข้อง ${novel.relatedNovels?.length || 0} เรื่อง`);

    return NextResponse.json(novel, { status: 200 });
  } catch (error: any) {
    console.error(`❌ เกิดข้อผิดพลาดขณะดึงนิยาย slug "${slug}":`, error);

    // ตรวจสอบ CastError (เช่น รูปแบบ slug ไม่ถูกต้อง)
    if (error instanceof mongoose.Error.CastError) {
      return NextResponse.json({ error: "รูปแบบ slug หรือ ID ไม่ถูกต้อง" }, { status: 400 });
    }

    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ขณะดึงข้อมูลนิยาย" },
      { status: 500 }
    );
  } finally {
    console.log(`--- 📡 [API GET /api/novels/${slug}] เสร็จสิ้น --- \n`);
  }
}

/**
 * ฟังก์ชันช่วยเหลือสำหรับ format ตัวเลขให้อ่านง่าย
 * @param num จำนวนที่ต้องการ format
 * @returns สตริงที่ format แล้ว (เช่น 1.2M, 5K, 123)
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toString();
}