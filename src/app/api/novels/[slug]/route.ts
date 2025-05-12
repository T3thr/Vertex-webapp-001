// src/app/api/novels/[slug]/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb"; // ตรวจสอบ path ให้ถูกต้อง
import NovelModel, { INovel } from "@/backend/models/Novel"; // ตรวจสอบ path และ import interface
import UserModel from "@/backend/models/User"; // ตรวจสอบ path
import CategoryModel from "@/backend/models/Category"; // ตรวจสอบ path
import mongoose from "mongoose";

// Interface สำหรับ context ที่รับ params
interface RouteContext {
  params: {
    slug: string;
  };
}

// ฟังก์ชัน GET สำหรับดึงข้อมูลนิยายเรื่องเดียวตาม slug
export async function GET(request: Request, context: RouteContext) {
  // ดึง slug จาก context.params
  const { slug } = context.params;

  // ตรวจสอบว่ามี slug หรือไม่
  if (!slug) {
    console.error("❌ API Error: Slug is missing in the request.");
    return NextResponse.json(
      { message: "Slug parameter is required" },
      { status: 400 }
    );
  }

  console.log(`📡 API /api/novels/${slug} called`);

  try {
    // เชื่อมต่อฐานข้อมูล
    await dbConnect();
    console.log("🗄️ Database connected.");

    // สร้าง Models ที่ต้องใช้ (ป้องกัน re-compilation ใน dev mode)
    const Novel = NovelModel();
    const User = UserModel();
    const Category = CategoryModel();

    // Query หานิยายด้วย slug
    // เลือก populate ข้อมูลที่จำเป็น: author และ categories
    // ใช้ lean() เพื่อ performance ที่ดีขึ้น (ได้ plain JS object)
    const novel: INovel | null = await Novel.findOne({
      slug: slug,
      isDeleted: false, // ไม่เอาอันที่ถูกลบไปแล้ว
      // visibility: 'public' // อาจจะตรวจสอบ visibility เพิ่มเติมตาม logic ของคุณ (เช่น อนุญาตให้ admin ดู private ได้)
    })
      .populate({
        path: "author",
        model: User, // ระบุ Model ให้ชัดเจน
        select: "username profile.displayName profile.avatar role", // เลือกฟิลด์ที่ต้องการจาก User
      })
      .populate({
        path: "categories",
        model: Category, // ระบุ Model ให้ชัดเจน
        select: "name slug themeColor", // เลือกฟิลด์ที่ต้องการจาก Category
      })
      .populate({
        path: "subCategories", // สมมติว่าต้องการ populate subCategories ด้วย
        model: Category,
        select: "name slug",
      })
      .lean(); // ใช้ lean() เพื่อให้ได้ Plain JavaScript Object

    // ตรวจสอบว่าพบนิยายหรือไม่
    if (!novel) {
      console.warn(`⚠️ Novel with slug "${slug}" not found or not accessible.`);
      return NextResponse.json({ message: "Novel not found" }, { status: 404 });
    }

    // ตรวจสอบ visibility เพิ่มเติม (ถ้าจำเป็น)
    // ตัวอย่าง: ถ้า visibility ไม่ใช่ public และผู้ใช้ไม่ได้ login หรือไม่มีสิทธิ์, อาจ return 404/403
    // if (novel.visibility !== 'public') {
    //   // Check user session/role here
    //   // return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    // }

    console.log(`✅ Successfully fetched novel: ${novel.title}`);

    // ส่งข้อมูลนิยายกลับไป
    return NextResponse.json(novel, { status: 200 });

  } catch (error: any) {
    console.error(`❌ Error fetching novel with slug "${slug}":`, error);

    // จัดการข้อผิดพลาดประเภทต่างๆ
    if (error instanceof mongoose.Error.CastError) {
      return NextResponse.json(
        { message: "Invalid slug format" },
        { status: 400 }
      );
    }

    // ข้อผิดพลาดทั่วไป
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

// สามารถเพิ่ม POST, PUT, DELETE handlers ได้ที่นี่ถ้าต้องการ