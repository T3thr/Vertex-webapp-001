// src/app/api/novels/[slug]/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import NovelModel, { INovel } from "@/backend/models/Novel";
import UserModel from "@/backend/models/User";
import EpisodeModel from "@/backend/models/Episode";
import CategoryModel from "@/backend/models/Category"; 

// ฟังก์ชันสำหรับดึงข้อมูลนิยายเรื่องเดียวตาม slug
async function getNovelBySlug(slug: string): Promise<INovel | null> {
  await dbConnect(); // เชื่อมต่อฐานข้อมูล

  const User = UserModel(); // โหลด User Model
  const Category = CategoryModel(); // โหลด Category Model
  const Episode = EpisodeModel(); // โหลด Episode Model

  const novel = await NovelModel()
    .findOne({ slug: slug, isDeleted: false /* visibility: "public" */ }) // ค้นหาด้วย slug, ยังไม่ลบ (อาจพิจารณาเรื่อง visibility ทีหลัง)
    .populate({
      path: "author",
      select: "username profile.displayName profile.avatar", // เลือกฟิลด์ที่ต้องการจาก User
      model: User, // ระบุ model ให้ชัดเจน
    })
    .populate({
      path: "categories",
      select: "name slug iconUrl themeColor", // เลือกฟิลด์ที่ต้องการจาก Category
      model: Category, // ระบุ model
    })
    .populate({
      path: "subCategories",
      select: "name slug", // เลือกฟิลด์ที่ต้องการจาก Category
      model: Category, // ระบุ model
    })
    // ไม่ populate episodes ที่นี่เพื่อลดขนาด response αρχικά, หน้า page จะ fetch แยกถ้าจำเป็น
    .lean(); // ใช้ lean() เพื่อ performance

  return novel as INovel | null;
}

// ฟังก์ชัน Handler สำหรับ GET request
export async function GET(
  request: Request,
  { params }: { params: { slug: string } } // <--- Signature ที่ถูกต้อง
) {
  const slug = params.slug; // ดึง slug จาก params

  console.log(`📡 API /api/novels/${slug} called`);

  if (!slug) {
    console.error("❌ Slug parameter is missing");
    return NextResponse.json({ error: "Slug หายไป" }, { status: 400 });
  }

  try {
    const novel = await getNovelBySlug(slug); // เรียกใช้ฟังก์ชันดึงข้อมูล

    if (!novel) {
      console.log(`ℹ️ Novel with slug "${slug}" not found.`);
      return NextResponse.json({ error: "ไม่พบนิยายเรื่องนี้" }, { status: 404 });
    }

    // ดึงข้อมูลตอน (episodes) เพิ่มเติม ถ้าต้องการส่งไปพร้อมกัน
    // แต่โดยทั่วไป หน้า page component จะ fetch เอง
    // const episodes = await EpisodeModel()
    //   .find({ novel: novel._id, isDeleted: false, status: "published" })
    //   .sort({ episodeNumber: 1 })
    //   .select("title slug episodeNumber isFree priceInCoins publishedAt viewsCount")
    //   .lean();

    console.log(`✅ Successfully fetched novel: ${novel.title}`);
    return NextResponse.json(
        { novel /* , episodes */ }, // ส่งข้อมูลนิยาย (และตอน ถ้าดึงมา)
        { status: 200 }
    );
  } catch (error: any) {
    console.error(`❌ Error fetching novel with slug "${slug}":`, error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลนิยาย" },
      { status: 500 }
    );
  }
}