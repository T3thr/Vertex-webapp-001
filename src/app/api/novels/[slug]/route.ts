// src/app/api/novels/[slug]/route.ts
// API สำหรับดึงข้อมูลนิยายตาม slug สำหรับหน้า novel/[slug]
// ดึงข้อมูลนิยายพร้อม populate ข้อมูล author, categories, และ subCategories
// ส่งกลับข้อมูลในรูปแบบที่เหมาะสมสำหรับหน้าแสดงผลนิยาย

import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import NovelModel, { INovel } from "@/backend/models/Novel"; // Import INovel
import UserModel, { IUser } from "@/backend/models/User"; // Import IUser
import CategoryModel, { ICategory } from "@/backend/models/Category"; // Import ICategory
import mongoose from "mongoose";

// Interface สำหรับข้อมูล Author ที่ Populate แล้ว (เลือกเฉพาะ field ที่ต้องการ)
interface PopulatedAuthor extends Pick<IUser, "_id" | "username"> {
  profile?: {
    displayName?: string;
    avatar?: string;
  };
}

// Interface สำหรับข้อมูล Category ที่ Populate แล้ว (เลือกเฉพาะ field ที่ต้องการ)
type PopulatedCategory = Pick<ICategory, "_id" | "name" | "slug">;

// Interface สำหรับข้อมูล Novel ที่ Populate แล้วสำหรับ API response
// เลือกเฉพาะ fields ที่จำเป็นสำหรับหน้า novel/[slug]
export interface PopulatedNovelForDetailPage
  extends Omit<
    INovel,
    "author" | "categories" | "subCategories" | "embeddingVector" | "seo" | "stats" | "sentimentAnalysis" | "genreDistribution"
  > {
  author: PopulatedAuthor | null; // ใช้ Type ที่กำหนดเอง
  categories: PopulatedCategory[]; // ใช้ Type ที่กำหนดเอง
  subCategories?: PopulatedCategory[]; // ใช้ Type ที่กำหนดเอง
  // เพิ่ม field อื่นๆ ที่อาจจะคำนวณหรือต้องการแสดงผลเป็นพิเศษ
  formattedViewsCount?: string;
  formattedLikesCount?: string;
  formattedFollowersCount?: string;
  relatedNovels?: Pick<INovel, "_id" | "title" | "slug" | "coverImage">[]; // ตัวอย่าง: ถ้าต้องการนิยายที่เกี่ยวข้อง
}

// ฟังก์ชัน GET สำหรับดึงข้อมูลนิยายตาม slug
export async function GET(
  request: Request, // Parameter ตัวแรกคือ Request object
  { params }: { params: { slug: string } } // ใช้ destructuring เพื่อดึง params จาก context
): Promise<NextResponse<PopulatedNovelForDetailPage | { error: string }>> {
  const { slug } = params; // ดึง slug จาก params
  console.log(`\n--- 📡 [API GET /api/novels/${slug}] ---`);

  if (!slug) {
    console.error("❌ Slug parameter is missing.");
    return NextResponse.json({ error: "Slug parameter is required" }, { status: 400 });
  }

  try {
    await dbConnect();
    console.log("✅ Database connected.");

    const Novel = NovelModel(); // เรียกใช้ Novel Model
    const User = UserModel(); // เรียกใช้ User Model
    const Category = CategoryModel(); // เรียกใช้ Category Model

    // ค้นหานิยายด้วย slug, ต้องไม่ถูกลบ (isDeleted: false) และควรจะมองเห็นได้ (visibility: 'public')
    // Populate ข้อมูลที่เกี่ยวข้อง: author, categories, subCategories
    // Select เฉพาะ fields ที่จำเป็นสำหรับหน้าแสดงผล
    const novel = (await Novel.findOne({
      slug: slug,
      isDeleted: false,
      // visibility: 'public', // อาจจะเพิ่มเงื่อนไขนี้ถ้าไม่ต้องการให้เข้าถึงนิยาย private/unlisted ผ่าน slug โดยตรง
    })
      .populate<{ author: PopulatedAuthor | null }>({
        path: "author",
        model: User, // ระบุ Model ที่ใช้ Populate
        select: "username profile.displayName profile.avatar", // เลือก fields ที่ต้องการ
      })
      .populate<{ categories: PopulatedCategory[] }>({
        path: "categories",
        model: Category, // ระบุ Model
        select: "name slug", // เลือก fields
      })
      .populate<{ subCategories?: PopulatedCategory[] }>({
        path: "subCategories",
        model: Category, // ระบุ Model
        select: "name slug", // เลือก fields
      })
      .select(
        "title slug description coverImage author categories subCategories tags status visibility language isExplicitContent ageRating averageRating ratingsCount viewsCount likesCount followersCount episodesCount publishedEpisodesCount wordsCount settings lastEpisodePublishedAt firstPublishedAt createdAt updatedAt isPremium isDiscounted discountDetails gameElementsSummary"
      )
      .lean() // ใช้ lean() เพื่อประสิทธิภาพ และได้ Plain Old JavaScript Object (POJO)
      .exec()) as PopulatedNovelForDetailPage | null; // Cast ผลลัพธ์ให้เป็น Type ที่คาดหวัง

    if (!novel) {
      console.warn(`⚠️ Novel with slug "${slug}" not found.`);
      return NextResponse.json({ error: "Novel not found" }, { status: 404 });
    }

    console.log(`✅ Novel "${novel.title}" fetched successfully.`);

    // --- (Optional) เพิ่ม Logic การดึงข้อมูลอื่นๆ ที่เกี่ยวข้อง ---
    // เช่น ดึงนิยายที่เกี่ยวข้อง (อาจจะ base on categories/tags)
    // novel.relatedNovels = await Novel.find({
    //   categories: { $in: novel.categories.map(c => c._id) },
    //   _id: { $ne: novel._id }, // ไม่รวมนิยายเรื่องปัจจุบัน
    //   isDeleted: false,
    //   visibility: 'public',
    // })
    // .limit(5)
    // .select('title slug coverImage')
    // .lean();
    // console.log(`✅ Fetched ${novel.relatedNovels?.length || 0} related novels.`);

    // --- (Optional) Format ข้อมูลบางอย่างก่อนส่งกลับ ---
    // เช่น format ตัวเลขยอดวิว/ไลค์
    // novel.formattedViewsCount = formatNumber(novel.viewsCount);
    // novel.formattedLikesCount = formatNumber(novel.likesCount);
    // novel.formattedFollowersCount = formatNumber(novel.followersCount);

    return NextResponse.json(novel, { status: 200 });

  } catch (error: any) {
    console.error(`❌ Error fetching novel with slug "${slug}":`, error);
    // ตรวจสอบว่าเป็น CastError หรือไม่ (เช่น ObjectId ไม่ถูกต้อง)
    if (error instanceof mongoose.Error.CastError) {
      return NextResponse.json({ error: "Invalid format for slug or ID." }, { status: 400 });
    }
    return NextResponse.json(
      { error: "An error occurred while fetching the novel." },
      { status: 500 }
    );
  } finally {
    console.log(`--- 📡 [API GET /api/novels/${slug}] Finished --- \n`);
  }
}

// (Optional) Helper function สำหรับ format ตัวเลข (อาจจะย้ายไปไว้ใน utils)
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toString();
}